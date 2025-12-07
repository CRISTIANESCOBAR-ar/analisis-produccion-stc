param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$SqlitePath,
  [Parameter(Mandatory=$false)][string]$Sheet = 'report5'
)

$ErrorActionPreference = 'Stop'
$tmpCsv = [System.IO.Path]::GetTempFileName()
$csvPath = $tmpCsv -replace '\\','/'

try {
  # Usar Python con filtrado especial para CALIDAD (elimina encabezados repetidos)
  python "$PSScriptRoot\excel-to-csv-calidad.py" $XlsxPath $Sheet $tmpCsv 2 2>$null

  # Importar a tabla temporal (el filtrado ya se hizo en Python)
  $cmds = @(
    "DROP TABLE IF EXISTS temp_calidad;",
    "CREATE TEMP TABLE temp_calidad AS SELECT * FROM tb_CALIDAD WHERE 1=0;",
    ".mode csv",
    ".import $csvPath temp_calidad",
    "BEGIN;",
    "DELETE FROM tb_CALIDAD WHERE DATE(DAT_PROD) IN (SELECT DISTINCT DATE(DAT_PROD) FROM temp_calidad);",
    "INSERT INTO tb_CALIDAD SELECT * FROM temp_calidad;",
    "COMMIT;",
    "DROP TABLE temp_calidad;"
  )

  & sqlite3 $SqlitePath @cmds

  Write-Host "Importacion CALIDAD completada (fast csv)." -ForegroundColor Green

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
  Remove-Item -Path $tmpCsv -ErrorAction SilentlyContinue
}
