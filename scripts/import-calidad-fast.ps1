param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$SqlitePath,
  [Parameter(Mandatory=$false)][string]$Sheet = 'report5'
)

$ErrorActionPreference = 'Stop'

# Funcion para comparar columnas CSV vs SQLite y registrar diferencias
function Compare-CsvColumns {
  param(
    [string]$CsvPath,
    [string]$SqlitePath,
    [string]$TableName,
    [bool]$IsTabDelimited
  )
  
  try {
    # 1. Obtener columnas del CSV
    $csvFirstLine = Get-Content -Path $CsvPath -TotalCount 1
    $csvColumns = if ($IsTabDelimited) {
      $csvFirstLine -split "`t" | ForEach-Object { $_.Trim() }
    } else {
      $csvFirstLine -split "," | ForEach-Object { $_.Trim().Trim('"') }
    }
    
    # 2. Obtener columnas de SQLite
    $sqliteColumnsRaw = & sqlite3 $SqlitePath "PRAGMA table_info($TableName);"
    $sqliteColumns = $sqliteColumnsRaw | ForEach-Object {
      # PRAGMA table_info devuelve: cid|name|type|notnull|dflt_value|pk
      ($_ -split '\|')[1]
    }
    
    # 3. Comparar
    $extraColumns = $csvColumns | Where-Object { $_ -notin $sqliteColumns -and $_.Trim() -ne '' }
    $missingColumns = $sqliteColumns | Where-Object { $_ -notin $csvColumns }
    
    # 4. Si hay diferencias, crear registro en tabla de logs
    if ($extraColumns.Count -gt 0 -or $missingColumns.Count -gt 0) {
      # Crear tabla de logs si no existe
      $createLogTable = "CREATE TABLE IF NOT EXISTS import_column_warnings (id INTEGER PRIMARY KEY AUTOINCREMENT, tabla_destino TEXT NOT NULL, timestamp TEXT NOT NULL, csv_path TEXT NOT NULL, extra_columns TEXT, missing_columns TEXT, total_csv_columns INTEGER, total_table_columns INTEGER);"
      $createLogTable | & sqlite3 $SqlitePath
      
      # Preparar datos para el log
      $timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
      $safeCsvPath = $CsvPath.Replace("'", "''")
      $extraColsJson = if ($extraColumns.Count -gt 0) { ($extraColumns -join ', ') } else { $null }
      $missingColsJson = if ($missingColumns.Count -gt 0) { ($missingColumns -join ', ') } else { $null }
      
      # Insertar log
      $extraVal = if ($extraColsJson) { "'$extraColsJson'" } else { 'NULL' }
      $missingVal = if ($missingColsJson) { "'$missingColsJson'" } else { 'NULL' }
      $insertLog = "INSERT INTO import_column_warnings (tabla_destino, timestamp, csv_path, extra_columns, missing_columns, total_csv_columns, total_table_columns) VALUES ('$TableName', '$timestamp', '$safeCsvPath', $extraVal, $missingVal, $($csvColumns.Count), $($sqliteColumns.Count));"
      $insertLog | & sqlite3 $SqlitePath
      
      # Mostrar warning en consola
      if ($extraColumns.Count -gt 0) {
        Write-Host "ADVERTENCIA: El CSV contiene $($extraColumns.Count) columna(s) EXTRA que no estan en la tabla SQLite:" -ForegroundColor Yellow
        $extraColumns | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
        Write-Host "   Estas columnas se IGNORARAN durante la importacion." -ForegroundColor Yellow
      }
      
      if ($missingColumns.Count -gt 0) {
        Write-Host "ADVERTENCIA: El CSV NO contiene $($missingColumns.Count) columna(s) que SI estan en la tabla SQLite:" -ForegroundColor Yellow
        $missingColumns | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
        Write-Host "   Estas columnas se rellenaran con NULL durante la importacion." -ForegroundColor Yellow
      }
      
      return @{
        HasDifferences = $true
        ExtraColumns = $extraColumns
        MissingColumns = $missingColumns
      }
    }
    
    return @{ HasDifferences = $false }
  }
  catch {
    # Si falla la validacion, continuar con la importacion normalmente
    Write-Host "Error al validar columnas (continuando): $_" -ForegroundColor DarkYellow
    return @{ HasDifferences = $false }
  }
}

# CSV directo o XLSX
$isCsv = [System.IO.Path]::GetExtension($XlsxPath).ToLower() -eq '.csv'
$tmpCsv = $null
$csvPath = $null
$isTab = $false

try {
  if ($isCsv) {
    $origPath = $XlsxPath
    $firstLine = (Get-Content -Path $origPath -TotalCount 1)
    $isTab = $firstLine -match "\t"
    
    # Optimization: Use the original CSV directly.
    # We will clean headers and invalid rows using SQL after import.
    $csvPath = $origPath
  } else {
    $tmpCsv = [System.IO.Path]::GetTempFileName()
    $csvPath = $tmpCsv -replace '\\','/'
    python "$PSScriptRoot\excel-to-csv-calidad.py" $XlsxPath $Sheet $tmpCsv 2 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Error en la conversión de Excel a CSV (Python script failed)." }
  }

  if ($isTab) { $mode = 'tabs' } else { $mode = 'csv' }

  # Validar diferencias de columnas ANTES de importar
  Write-Host "Validando columnas del CSV vs tabla SQLite..." -ForegroundColor Cyan
  $columnCheck = Compare-CsvColumns -CsvPath $csvPath -SqlitePath $SqlitePath -TableName 'tb_CALIDAD' -IsTabDelimited $isTab
  if ($columnCheck.HasDifferences) {
    Write-Host "" # Linea en blanco para separar warnings
  }

  $cmds = @(
    "DROP TABLE IF EXISTS temp_calidad;",
    "CREATE TABLE temp_calidad AS SELECT * FROM tb_CALIDAD WHERE 0;",
    ".mode $mode",
    ".import '$csvPath' temp_calidad",
    "BEGIN IMMEDIATE;",
    "-- Cleaning: Remove headers, empty dates, and subtotals",
    "DELETE FROM temp_calidad WHERE DAT_PROD IS NULL OR TRIM(DAT_PROD) = '' OR DAT_PROD = 'DAT_PROD' OR DAT_PROD LIKE '%Total%';",
    "-- Normalization: Convert dd/mm/yyyy to yyyy-mm-dd HH:mm:ss",
    "UPDATE temp_calidad SET DAT_PROD = substr(DAT_PROD, 7, 4) || '-' || substr(DAT_PROD, 4, 2) || '-' || substr(DAT_PROD, 1, 2) || ' 00:00:00' WHERE DAT_PROD LIKE '__/__/____';",
    "-- Incremental Update Logic",
    "DELETE FROM tb_CALIDAD WHERE DAT_PROD IN (SELECT DISTINCT DAT_PROD FROM temp_calidad);",
    "INSERT INTO tb_CALIDAD SELECT * FROM temp_calidad;",
    "DROP TABLE temp_calidad;",
    "COMMIT;"
  )

  $cmds -join "`n" | & sqlite3 $SqlitePath

  Write-Host "Importación CALIDAD completada (actualización incremental)." -ForegroundColor Green

  try {
    $xlsxLastModified = (Get-Item $XlsxPath).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
    $importDate = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $rows = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_CALIDAD;").Trim()
    $safePath = $XlsxPath.Replace("'", "''")
    $sql = @"
INSERT INTO import_control (tabla_destino, xlsx_path, xlsx_sheet, last_import_date, xlsx_last_modified, xlsx_hash, rows_imported, import_strategy)
VALUES ('tb_CALIDAD', '$safePath', '$Sheet', '$importDate', '$xlsxLastModified', 'NA', $rows, 'fast_csv')
ON CONFLICT(tabla_destino) DO UPDATE SET
  xlsx_path = excluded.xlsx_path,
  xlsx_sheet = excluded.xlsx_sheet,
  last_import_date = excluded.last_import_date,
  xlsx_last_modified = excluded.xlsx_last_modified,
  xlsx_hash = excluded.xlsx_hash,
  rows_imported = excluded.rows_imported,
  import_strategy = excluded.import_strategy;
"@
    $sql | & sqlite3 $SqlitePath
  } catch {
    Write-Warning "No se pudo actualizar import_control para tb_CALIDAD: $_"
  }
}
finally {
  if ($tmpCsv) { Remove-Item -Path $tmpCsv -ErrorAction SilentlyContinue }
}
