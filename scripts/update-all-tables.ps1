# =====================================================================
# ACTUALIZACIÓN INCREMENTAL AUTOMÁTICA - XLSX A SQLITE
# =====================================================================
# Detecta cambios en archivos XLSX y ejecuta imports solo si es necesario
# Usa tabla import_control para rastrear última importación
# =====================================================================

param(
  [Parameter(Mandatory=$false)][switch]$Force,  # Forzar import aunque no haya cambios
  [Parameter(Mandatory=$false)][switch]$SkipHashCheck  # Solo verificar fecha de modificación
)

$ErrorActionPreference = 'Stop'
$SqlitePath = "C:\analisis-stock-stc\database\produccion.db"
$ScriptRoot = "C:\analisis-stock-stc\scripts"
$ImportScript = "$ScriptRoot\import-xlsx-to-sqlite.ps1"

# Buscar sqlite3.exe en ubicaciones comunes
$sqlite3Paths = @(
  "sqlite3",  # En PATH
  "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\SQLite.SQLite_*\sqlite3.exe",
  "$env:LOCALAPPDATA\Microsoft\WinGet\Links\sqlite3.exe",
  "C:\Program Files\SQLite\sqlite3.exe",
  "C:\sqlite\sqlite3.exe"
)

$global:sqlite3Cmd = $null
foreach ($path in $sqlite3Paths) {
  try {
    if ($path -like "*`**") {
      # Path con wildcard
      $resolved = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
      if ($resolved -and (Test-Path $resolved)) {
        $global:sqlite3Cmd = $resolved
        break
      }
    } else {
      $testResult = Get-Command $path -ErrorAction SilentlyContinue
      if ($testResult) {
        $global:sqlite3Cmd = $path
        break
      }
    }
  } catch {
    continue
  }
}

if (-not $global:sqlite3Cmd) {
  Write-Host "❌ sqlite3.exe no encontrado. Por favor instala SQLite:" -ForegroundColor Red
  Write-Host "   winget install SQLite.SQLite" -ForegroundColor Yellow
  exit 1
}

Write-Host "✓ Usando sqlite3: $global:sqlite3Cmd" -ForegroundColor DarkGray

# Configuración de tablas (orden de importación por dependencias)
$tableConfigs = @(
  @{
    Table = 'tb_FICHAS'
    XlsxPath = 'C:\STC\fichaArtigo.xlsx'
    Sheet = 'lista de tecidos'
    MappingJson = "$ScriptRoot\mappings\tb_FICHAS.json"
    DateColumn = $null  # Sin fecha, usa ClearTable
    Strategy = 'clear_table'
  },
  @{
    Table = 'tb_RESIDUOS_INDIGO'
    XlsxPath = 'C:\STC\RelResIndigo.xlsx'
    Sheet = 'Índigo'
    MappingJson = "$ScriptRoot\mappings\tb_RESIDUOS_INDIGO.json"
    DateColumn = 'DT_MOV'
    Strategy = 'date_delete'
  },
  @{
    Table = 'tb_RESIDUOS_POR_SECTOR'
    XlsxPath = 'C:\STC\rptResiduosPorSetor.xlsx'
    Sheet = 'Setor'
    MappingJson = "$ScriptRoot\mappings\tb_RESIDUOS_POR_SECTOR.json"
    DateColumn = 'DT_MOV'
    Strategy = 'date_delete'
  },
  @{
    Table = 'tb_TESTES'
    XlsxPath = 'C:\STC\rptPrdTestesFisicos.xlsx'
    Sheet = 'report2'
    MappingJson = "$ScriptRoot\mappings\tb_TESTES.json"
    DateColumn = 'DT_PROD'
    Strategy = 'date_delete'
  },
  @{
    Table = 'tb_PARADAS'
    XlsxPath = 'C:\STC\rptParadaMaquinaPRD.xlsx'
    Sheet = 'report1'
    MappingJson = "$ScriptRoot\mappings\tb_PARADAS.json"
    DateColumn = 'DATA_BASE'
    Strategy = 'date_delete'
  },
  @{
    Table = 'tb_PRODUCCION'
    XlsxPath = 'C:\STC\rptProducaoMaquina.xlsx'
    Sheet = 'report1'
    MappingJson = "$ScriptRoot\mappings\tb_PRODUCCION.json"
    DateColumn = 'DT_BASE_PRODUCAO'
    Strategy = 'date_delete'
  },
  @{
    Table = 'tb_CALIDAD'
    XlsxPath = 'C:\STC\rptAcompDiarioPBI.xlsx'
    Sheet = 'report1'
    MappingJson = "$ScriptRoot\mappings\tb_CALIDAD.json"
    DateColumn = 'DAT_PROD'
    Strategy = 'date_delete'
  }
)

# Función para calcular MD5 hash de archivo
function Get-FileHashMD5 {
  param([string]$FilePath)
  try {
    $hash = Get-FileHash -Path $FilePath -Algorithm MD5
    return $hash.Hash
  } catch {
    return $null
  }
}

# Función para obtener último estado de importación desde SQLite
function Get-LastImportState {
  param([string]$Table)
  
  $query = "SELECT * FROM import_control WHERE tabla_destino='$Table';"
  $result = & $global:sqlite3Cmd $SqlitePath $query -json 2>$null
  
  if ($LASTEXITCODE -eq 0 -and $result) {
    try {
      return ($result | ConvertFrom-Json)[0]
    } catch {
      return $null
    }
  }
  return $null
}

# Función para registrar importación en control
function Set-ImportState {
  param(
    [string]$Table,
    [string]$XlsxPath,
    [string]$Sheet,
    [string]$XlsxModified,
    [string]$XlsxHash,
    [int]$RowsImported,
    [string]$MappingJson,
    [string]$DateColumn,
    [string]$Strategy
  )
  
  $now = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  $mappingEsc = $MappingJson.Replace("'","''")
  $xlsxPathEsc = $XlsxPath.Replace("'","''")
  $sheetEsc = $Sheet.Replace("'","''")
  $dateColSql = if ($DateColumn) { "'$DateColumn'" } else { "NULL" }
  
  $upsertSql = @"
INSERT INTO import_control (
  tabla_destino, xlsx_path, xlsx_sheet, last_import_date, 
  xlsx_last_modified, xlsx_hash, rows_imported, 
  mapping_json_path, date_column, import_strategy
) VALUES (
  '$Table', '$xlsxPathEsc', '$sheetEsc', '$now', 
  '$XlsxModified', '$XlsxHash', $RowsImported, 
  '$mappingEsc', $dateColSql, '$Strategy'
)
ON CONFLICT(tabla_destino) DO UPDATE SET
  xlsx_path = excluded.xlsx_path,
  xlsx_sheet = excluded.xlsx_sheet,
  last_import_date = excluded.last_import_date,
  xlsx_last_modified = excluded.xlsx_last_modified,
  xlsx_hash = excluded.xlsx_hash,
  rows_imported = excluded.rows_imported,
  mapping_json_path = excluded.mapping_json_path,
  date_column = excluded.date_column,
  import_strategy = excluded.import_strategy;
"@
  
  & $global:sqlite3Cmd $SqlitePath $upsertSql | Out-Null
}

# Función para verificar si archivo cambió
function Test-FileChanged {
  param(
    [string]$XlsxPath,
    [object]$LastState
  )
  
  if (-not (Test-Path $XlsxPath)) {
    Write-Host "  ⚠️  Archivo no encontrado: $XlsxPath" -ForegroundColor Yellow
    return $false
  }
  
  $fileInfo = Get-Item $XlsxPath
  $currentModified = $fileInfo.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
  
  # Si no hay estado previo, es primera importación
  if (-not $LastState) {
    Write-Host "  🆕 Primera importación" -ForegroundColor Cyan
    return $true
  }
  
  # Verificar fecha de modificación
  if ($currentModified -ne $LastState.xlsx_last_modified) {
    Write-Host "  📅 Fecha modificada: $($LastState.xlsx_last_modified) → $currentModified" -ForegroundColor Cyan
    return $true
  }
  
  # Verificar hash MD5 si no se omite
  if (-not $SkipHashCheck) {
    $currentHash = Get-FileHashMD5 $XlsxPath
    if ($currentHash -and $currentHash -ne $LastState.xlsx_hash) {
      Write-Host "  🔄 Hash cambió: $($LastState.xlsx_hash.Substring(0,8))... → $($currentHash.Substring(0,8))..." -ForegroundColor Cyan
      return $true
    }
  }
  
  Write-Host "  ✅ Sin cambios desde última importación ($($LastState.last_import_date))" -ForegroundColor Green
  return $false
}

# MAIN: Procesar cada tabla
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ACTUALIZACIÓN INCREMENTAL AUTOMÁTICA - XLSX → SQLITE    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date
$totalImported = 0
$totalSkipped = 0
$totalErrors = 0

foreach ($config in $tableConfigs) {
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
  Write-Host "📊 Tabla: $($config.Table)" -ForegroundColor White -NoNewline
  Write-Host " ($($config.XlsxPath | Split-Path -Leaf))" -ForegroundColor Gray
  Write-Host ""
  
  try {
    # Verificar si archivo existe
    if (-not (Test-Path $config.XlsxPath)) {
      Write-Host "  ❌ Archivo XLSX no encontrado, omitiendo." -ForegroundColor Red
      $totalErrors++
      continue
    }
    
    # Obtener estado previo
    $lastState = Get-LastImportState $config.Table
    
    # Verificar si cambió
    $fileInfo = Get-Item $config.XlsxPath
    $currentModified = $fileInfo.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
    $currentHash = Get-FileHashMD5 $config.XlsxPath
    
    $shouldImport = $Force -or (Test-FileChanged $config.XlsxPath $lastState)
    
    if (-not $shouldImport) {
      $totalSkipped++
      Write-Host ""
      continue
    }
    
    # Construir comando de importación
    $importParams = @{
      XlsxPath = $config.XlsxPath
      Sheet = $config.Sheet
      SqlitePath = $SqlitePath
      Table = $config.Table
      MappingSource = 'json'
      MappingJson = $config.MappingJson
    }
    
    if ($config.Strategy -eq 'clear_table') {
      $importParams['ClearTable'] = $true
    } elseif ($config.DateColumn) {
      $importParams['DateColumn'] = $config.DateColumn
    }
    
    # Ejecutar importación
    Write-Host "  🚀 Iniciando importación..." -ForegroundColor Yellow
    $importResult = & $ImportScript @importParams 2>&1
    
    if ($LASTEXITCODE -eq 0) {
      # Extraer número de filas importadas del output
      $rowsMatch = $importResult | Select-String "completada: (\d+) filas"
      $rowsImported = if ($rowsMatch) { [int]$rowsMatch.Matches.Groups[1].Value } else { 0 }
      
      # Registrar en control
      Set-ImportState -Table $config.Table `
                      -XlsxPath $config.XlsxPath `
                      -Sheet $config.Sheet `
                      -XlsxModified $currentModified `
                      -XlsxHash $currentHash `
                      -RowsImported $rowsImported `
                      -MappingJson $config.MappingJson `
                      -DateColumn $config.DateColumn `
                      -Strategy $config.Strategy
      
      Write-Host "  ✅ Importación exitosa: $rowsImported filas" -ForegroundColor Green
      $totalImported++
    } else {
      Write-Host "  ❌ Error en importación" -ForegroundColor Red
      Write-Host $importResult -ForegroundColor DarkRed
      $totalErrors++
    }
    
  } catch {
    Write-Host "  ❌ Excepción: $($_.Exception.Message)" -ForegroundColor Red
    $totalErrors++
  }
  
  Write-Host ""
}

$elapsed = (Get-Date) - $startTime
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    RESUMEN DE EJECUCIÓN                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✅ Tablas importadas:  " -NoNewline -ForegroundColor Green
Write-Host $totalImported -ForegroundColor White
Write-Host "  ⏭️  Tablas omitidas:    " -NoNewline -ForegroundColor Yellow
Write-Host $totalSkipped -ForegroundColor White
Write-Host "  ❌ Errores:            " -NoNewline -ForegroundColor Red
Write-Host $totalErrors -ForegroundColor White
Write-Host "  ⏱️  Tiempo total:       " -NoNewline -ForegroundColor Cyan
Write-Host "$([int]$elapsed.TotalMinutes) min $([int]$elapsed.Seconds) seg" -ForegroundColor White
Write-Host ""

if ($totalErrors -gt 0) {
  Write-Host "⚠️  Revisa los errores arriba para más detalles." -ForegroundColor Yellow
  exit 1
} else {
  Write-Host "🎉 Actualización completada exitosamente!" -ForegroundColor Green
  exit 0
}
