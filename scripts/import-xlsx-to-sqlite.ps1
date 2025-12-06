# =====================================================================
# IMPORTACION DIRECTA DE XLSX A SQLITE CON MAPEO FLEXIBLE
# =====================================================================
# Requisitos:
# - PowerShell 5+
# - Modulo ImportExcel: Install-Module ImportExcel -Scope CurrentUser
# - sqlite3 CLI instalado (winget install SQLite.SQLite)
#
# Uso:
#   .\scripts\import-xlsx-to-sqlite.ps1 -XlsxPath "C:\ruta\archivo.xlsx" -Sheet "Hoja1" -SqlitePath "C:\analisis-stock-stc\database\produccion.db" -Table "tb_PRODUCCION"
#   (Opcional) -MappingSource sqlite|json -MappingJson "C:\ruta\mapping.json"
# =====================================================================

param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$Sheet,
  [Parameter(Mandatory=$true)][string]$SqlitePath,
  [Parameter(Mandatory=$true)][string]$Table,
  [Parameter(Mandatory=$false)][string]$DateColumn,
  [Parameter(Mandatory=$false)][switch]$ClearTable,
  [Parameter(Mandatory=$false)][ValidateSet('sqlite','json')][string]$MappingSource = 'json',
  [Parameter(Mandatory=$false)][string]$MappingJson
)

$ErrorActionPreference = 'Stop'

# Dependencias
if (-not (Get-Command sqlite3 -ErrorAction SilentlyContinue)) {
  throw "sqlite3 no encontrado. Instala con: winget install SQLite.SQLite"
}
if (-not (Get-Module -ListAvailable -Name ImportExcel)) {
  Write-Host "Instalando modulo ImportExcel..." -ForegroundColor Yellow
  Install-Module ImportExcel -Scope CurrentUser -Force
}
Import-Module ImportExcel

# Cargar mapeos
function Get-MappingsFromSqlite {
  param([string]$dbPath, [string]$table)
  $sql = "SELECT tabla_destino, columna_destino, columna_excel, es_requerida, valor_default, transformacion FROM column_mappings WHERE tabla_destino = '$table';"
  $rows = & sqlite3 $dbPath -header -separator '|' $sql
  $mappings = @()
  foreach ($r in $rows) {
    if ($r -match '^(?<tabla>[^|]+)\|(?<dest>[^|]+)\|(?<excel>[^|]+)\|(?<req>\d+)\|(?<def>.*)\|(?<tran>.*)$') {
      $mappings += [pscustomobject]@{
        tabla_destino   = $Matches['tabla']
        columna_destino = $Matches['dest']
        columna_excel   = $Matches['excel']
        es_requerida    = [int]$Matches['req']
        valor_default   = $Matches['def']
        transformacion  = $Matches['tran']
      }
    }
  }
  return $mappings
}

function Get-MappingsFromJson {
  param([string]$jsonPath)
  if (-not (Test-Path $jsonPath)) { throw "Mapping JSON no encontrado: $jsonPath" }
  return Get-Content $jsonPath -Encoding UTF8 | ConvertFrom-Json
}

$mappings = if ($MappingSource -eq 'json') { Get-MappingsFromJson $MappingJson } else { Get-MappingsFromSqlite $SqlitePath $Table }
if ($mappings.Count -eq 0) {
  throw "No se encontraron mapeos para la tabla '$Table'. Define registros en 'column_mappings' o provee JSON."
}

Write-Host "Mapeos cargados: $($mappings.Count) columnas" -ForegroundColor Green

# Leer Excel
Write-Host "Leyendo XLSX: $XlsxPath (Hoja: $Sheet)" -ForegroundColor Cyan
try {
  $rows = Import-Excel -Path $XlsxPath -WorksheetName $Sheet
} catch {
  if ($_.Exception.Message -match 'Duplicate column') {
    Write-Host "Encabezados duplicados detectados; usando -HeaderName con sufijos unicos." -ForegroundColor Yellow
    # Leer primera fila para obtener headers y crear nombres unicos
    $tempData = Import-Excel -Path $XlsxPath -WorksheetName $Sheet -NoHeader -StartRow 1 -EndRow 1
    $origHeaders = @()
    foreach ($prop in $tempData.PSObject.Properties) {
      $origHeaders += $prop.Value
    }
    # Generar nombres unicos agregando sufijo incremental a duplicados
    $seenHeaders = @{}
    $uniqueHeaders = @()
    $colIndex = 0
    foreach ($h in $origHeaders) {
      # Manejar headers nulos o vacios (columnas combinadas/vacias)
      if ([string]::IsNullOrWhiteSpace($h)) {
        $h = "COL_$colIndex"
      }
      if ($seenHeaders.ContainsKey($h)) {
        $seenHeaders[$h]++
        $uniqueHeaders += "$h`_$($seenHeaders[$h])"
      } else {
        $seenHeaders[$h] = 0
        $uniqueHeaders += $h
      }
      $colIndex++
    }
    # Leer con HeaderName
    $rows = Import-Excel -Path $XlsxPath -WorksheetName $Sheet -HeaderName $uniqueHeaders -StartRow 2
  } else {
    throw
  }
}
if ($rows.Count -eq 0) { throw "Hoja vacia o nombre incorrecto: $Sheet" }

# Filtrar filas que son encabezados repetidos o totalizadores
# Detectar por la primera columna: si contiene el nombre del header o esta vacia/numerica sin contexto
$firstColName = ($rows[0].PSObject.Properties | Select-Object -First 1).Name
$rowsFiltered = $rows | Where-Object {
  $firstVal = $_.$firstColName
  # Excluir si primera columna es el nombre del encabezado o esta vacia con resto de fila vacia
  if ($null -eq $firstVal -or $firstVal -eq '' -or $firstVal -eq $firstColName) {
    $false
  } else {
    $true
  }
}
$skipped = $rows.Count - $rowsFiltered.Count
if ($skipped -gt 0) {
  Write-Host "Filtradas $skipped filas (encabezados repetidos o totalizadores)" -ForegroundColor Yellow
}
$rows = $rowsFiltered

# Validar columnas requeridas
$excelCols = ($rows | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name)

# Validar columna de fecha si se solicita borrado por fecha
if ($DateColumn) {
  if (-not ($excelCols -contains $DateColumn)) {
    throw "La columna de fecha '$DateColumn' no existe en el XLSX."
  }
}
$missing = @()
foreach ($m in $mappings) {
  if ($m.es_requerida -eq 1 -and -not ($excelCols -contains $m.columna_excel)) {
    $missing += $m.columna_excel
  }
}
if ($missing.Count -gt 0) {
  throw "Faltan columnas requeridas en Excel: $($missing -join ', ')"
}

# Transformaciones simples
function Invoke-ValueTransform {
  param([string]$val, [string]$tran)
  if ($null -eq $val) { return $val }
  switch -Regex ($tran) {
    '^trim$'        { return ($val -as [string]).Trim() }
    '^uppercase$'   { return ($val -as [string]).ToUpper() }
    '^lowercase$'   { return ($val -as [string]).ToLower() }
    '^date_iso$'    { 
      try { 
        # Intentar convertir fecha Excel (numero serial)
        if ($val -match '^\d+(\.\d+)?$') {
           return [datetime]::FromOADate([double]$val).ToString('yyyy-MM-dd HH:mm:ss')
        }
        # Intentar parsear string fecha normal
        $d = [datetime]::Parse($val); 
        return $d.ToString('yyyy-MM-dd HH:mm:ss') 
      } catch { 
        return $val 
      } 
    }
    '^decimal_comma$' { # Convierte "1.234,56" o "179,00" a "1234.56" / "179.00"
      try {
        $s = ($val -as [string]).Trim()
        # quitar puntos de miles y cambiar coma decimal a punto
        $s = $s -replace '\.', ''
        $s = $s -replace ',', '.'
        # validar numero
        [void][double]::Parse($s, [Globalization.CultureInfo]::InvariantCulture)
        return $s
      } catch { return $val }
    }
    default         { return $val }
  }
}

# Preparar inserciones
$destCols = $mappings | Select-Object -ExpandProperty columna_destino
$insertColsSql = ($destCols | ForEach-Object { '[' + $_ + ']' }) -join ', '
$insertBase = "INSERT INTO [$Table] ($insertColsSql) VALUES "

# Crear archivo SQL temporal
$tempSqlFile = [System.IO.Path]::GetTempFileName() + ".sql"
"BEGIN TRANSACTION;" | Out-File $tempSqlFile -Encoding UTF8

# Estrategia de borrado previo
if ($ClearTable) {
  # Borrar TODA la tabla antes de importar (para tablas sin fecha o carga completa)
  Write-Host "Borrando todos los registros de '$Table'..." -ForegroundColor Yellow
  "DELETE FROM [$Table];" | Out-File $tempSqlFile -Append -Encoding UTF8
  Write-Host "Tabla '$Table' vaciada completamente (en transaccion)" -ForegroundColor Green
} elseif ($DateColumn) {
  # Borrar solo las fechas presentes en el XLSX (para tablas con fecha)
  # Obtener fechas distintas desde el XLSX ya formateadas a ISO si hay transformacion en el mapeo
  $dateMap = $mappings | Where-Object { $_.columna_destino -eq $DateColumn }
  if ($null -eq $dateMap) {
    Write-Host "La columna '$DateColumn' no esta en los mapeos; se intentara borrar usando el valor XLSX sin transformacion." -ForegroundColor Yellow
  }
  $distinctDates = New-Object System.Collections.Generic.HashSet[string]
  foreach ($row in $rows) {
    $rawDate = $row.$DateColumn
    $dateVal = $rawDate
    if ($dateMap) { $dateVal = Invoke-ValueTransform $rawDate $dateMap.transformacion }
    if ($null -ne $dateVal -and $dateVal -ne '') { [void]$distinctDates.Add(($dateVal -as [string])) }
  }
  if ($distinctDates.Count -gt 0) {
    # Borrado en lotes para evitar SQL demasiado largo
    $batch = @()
    foreach ($d in $distinctDates) {
      $safe = ($d -as [string]).Replace("'","''")
      $batch += "'" + $safe + "'"
      if ($batch.Count -ge 500) {
        $delSql = "DELETE FROM [$Table] WHERE [$DateColumn] IN (" + ($batch -join ',') + ");";
        $delSql | Out-File $tempSqlFile -Append -Encoding UTF8
        $batch = @()
      }
    }
    if ($batch.Count -gt 0) {
      $delSql = "DELETE FROM [$Table] WHERE [$DateColumn] IN (" + ($batch -join ',') + ");";
      $delSql | Out-File $tempSqlFile -Append -Encoding UTF8
    }
    Write-Host "Borrado previo por fecha en '$Table': $($distinctDates.Count) fechas distintas" -ForegroundColor Yellow
  } else {
    Write-Host "No se detectaron fechas distintas en XLSX para borrar." -ForegroundColor Yellow
  }
}

# Determinar tamano de lote basado en numero de columnas (evitar limites de comando)
$colCount = $destCols.Count
if ($colCount -gt 80) {
  $batchSize = 5
} elseif ($colCount -gt 60) {
  $batchSize = 10
} elseif ($colCount -gt 40) {
  $batchSize = 20
} else {
  $batchSize = 50
}
Write-Host "Tamano de lote: $batchSize filas ($colCount columnas)" -ForegroundColor Cyan

$buffer = @()
$processed = 0

foreach ($row in $rows) {
  $vals = @()
  foreach ($m in $mappings) {
    $excelVal = $null
    if ($excelCols -contains $m.columna_excel) { $excelVal = $row.$($m.columna_excel) }
    if ($null -eq $excelVal -or $excelVal -eq '') { $excelVal = $m.valor_default }
    $excelVal = Invoke-ValueTransform $excelVal $m.transformacion
    # Escapar comillas simples para SQL
    $safe = ($excelVal -as [string]).Replace("'","''")
    if ($null -eq $safe -or $safe -eq '') { $vals += "NULL" } else { $vals += "'" + $safe + "'" }
  }
  $buffer += "(" + ($vals -join ', ') + ")"
  $processed++

  if ($buffer.Count -ge $batchSize) {
    $sql = $insertBase + ($buffer -join ', ') + ";";
    $sql | Out-File $tempSqlFile -Append -Encoding UTF8
    $buffer = @()
    if ($processed % 500 -eq 0) {
        Write-Host "   -> Procesadas $processed filas..." -ForegroundColor Gray
    }
  }
}

# Flush restante
if ($buffer.Count -gt 0) {
  $sql = $insertBase + ($buffer -join ', ') + ";";
  $sql | Out-File $tempSqlFile -Append -Encoding UTF8
}

"COMMIT;" | Out-File $tempSqlFile -Append -Encoding UTF8

Write-Host "Ejecutando transaccion SQL masiva..." -ForegroundColor Cyan
$sw = [System.Diagnostics.Stopwatch]::StartNew()
& sqlite3 $SqlitePath ".read '$tempSqlFile'"
$sw.Stop()
Write-Host "Transaccion completada en $($sw.Elapsed.TotalSeconds) segundos." -ForegroundColor Green

# Limpieza
Remove-Item $tempSqlFile -ErrorAction SilentlyContinue

# Conteos de verificacion
$xlsxCount = $rows.Count
$sqliteCountAfter = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM [$Table];")
Write-Output "Importacion XLSX completada: $processed filas en '$Table'"
Write-Host "Importacion XLSX completada: $processed filas en '$Table'" -ForegroundColor Green
Write-Host "Verificacion: XLSX=$xlsxCount filas, SQLite ahora=$sqliteCountAfter filas" -ForegroundColor Cyan

# Actualizar registro de control de importaciones
try {
  $xlsxLastModified = (Get-Item $XlsxPath).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
  $importDate = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  $xlsxHash = (Get-FileHash -Path $XlsxPath -Algorithm MD5).Hash
  
  $controlSql = @"
INSERT INTO import_control (tabla_destino, xlsx_path, xlsx_sheet, last_import_date, xlsx_last_modified, xlsx_hash, rows_imported, import_strategy)
VALUES ('$Table', '$($XlsxPath.Replace("'", "''"))', '$Sheet', '$importDate', '$xlsxLastModified', '$xlsxHash', $processed, 'date_delete')
ON CONFLICT(tabla_destino) DO UPDATE SET
  xlsx_path = excluded.xlsx_path,
  xlsx_sheet = excluded.xlsx_sheet,
  last_import_date = excluded.last_import_date,
  xlsx_last_modified = excluded.xlsx_last_modified,
  xlsx_hash = excluded.xlsx_hash,
  rows_imported = excluded.rows_imported,
  import_strategy = excluded.import_strategy;
"@
  
  $controlSql | & sqlite3 $SqlitePath
  Write-Host "Registro de control actualizado" -ForegroundColor Green
} catch {
  Write-Warning "No se pudo actualizar import_control: $_"
}

