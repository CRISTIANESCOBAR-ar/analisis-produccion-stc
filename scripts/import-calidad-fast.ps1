param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$SqlitePath,
  [Parameter(Mandatory=$false)][string]$Sheet = 'report5'
)

$ErrorActionPreference = 'Stop'

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
