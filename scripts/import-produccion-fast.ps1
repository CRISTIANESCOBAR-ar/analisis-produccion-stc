param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$SqlitePath,
  [Parameter(Mandatory=$false)][string]$Sheet = 'rptProdMaq'
)

$ErrorActionPreference = 'Stop'
$tmpCsv = [System.IO.Path]::GetTempFileName()
$csvPath = $tmpCsv -replace '\\','/'

try {
  # Usar Python (mucho más rápido que Import-Excel)
  python "$PSScriptRoot\excel-to-csv.py" $XlsxPath $Sheet $tmpCsv 2 2>$null

  # Importar a tabla temporal y hacer date_delete usando DT_BASE_PRODUCAO
  $cmds = @(
    "DROP TABLE IF EXISTS temp_produccion;",
    "CREATE TEMP TABLE temp_produccion AS SELECT * FROM tb_PRODUCCION WHERE 1=0;",
    ".mode csv",
    ".import $csvPath temp_produccion",
    "BEGIN;",
    "DELETE FROM tb_PRODUCCION WHERE DATE(DT_BASE_PRODUCAO) IN (SELECT DISTINCT DATE(DT_BASE_PRODUCAO) FROM temp_produccion);",
    "INSERT INTO tb_PRODUCCION SELECT * FROM temp_produccion;",
    "COMMIT;",
    "DROP TABLE temp_produccion;"
  )

  & sqlite3 $SqlitePath @cmds

  Write-Host "Importacion PRODUCCION completada (fast csv)." -ForegroundColor Green

  try {
    $xlsxLastModified = (Get-Item $XlsxPath).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
    $importDate = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $rows = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_PRODUCCION;").Trim()
    $safePath = $XlsxPath.Replace("'", "''")
    $sql = @"
INSERT INTO import_control (tabla_destino, xlsx_path, xlsx_sheet, last_import_date, xlsx_last_modified, xlsx_hash, rows_imported, import_strategy)
VALUES ('tb_PRODUCCION', '$safePath', '$Sheet', '$importDate', '$xlsxLastModified', 'NA', $rows, 'fast_csv')
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
    Write-Warning "No se pudo actualizar import_control para tb_PRODUCCION: $_"
  }
}
finally {
  Remove-Item -Path $tmpCsv -ErrorAction SilentlyContinue
}
