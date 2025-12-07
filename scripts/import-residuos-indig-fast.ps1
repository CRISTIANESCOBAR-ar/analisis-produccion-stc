param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$SqlitePath,
  [Parameter(Mandatory=$false)][string]$Sheet = 'rptResiduosIndigo'
)

$ErrorActionPreference = 'Stop'
$tmpCsv = [System.IO.Path]::GetTempFileName()
$csvPath = $tmpCsv -replace '\\','/'

try {
  # Usar Python (mucho más rápido que Import-Excel)
  python "$PSScriptRoot\excel-to-csv.py" $XlsxPath $Sheet $tmpCsv 2 2>$null

  $cmds = @(
    "DROP TABLE IF EXISTS temp_residuos_indigo;",
    "CREATE TEMP TABLE temp_residuos_indigo AS SELECT * FROM tb_RESIDUOS_INDIGO WHERE 1=0;",
    ".mode csv",
    ".import $csvPath temp_residuos_indigo",
    "BEGIN;",
    "DELETE FROM tb_RESIDUOS_INDIGO WHERE DATE(DT_MOV) IN (SELECT DISTINCT DATE(DT_MOV) FROM temp_residuos_indigo);",
    "INSERT INTO tb_RESIDUOS_INDIGO SELECT * FROM temp_residuos_indigo;",
    "COMMIT;",
    "DROP TABLE temp_residuos_indigo;"
  )

  & sqlite3 $SqlitePath @cmds
  Write-Host "Importacion RESIDUOS_INDIGO completada (fast csv, date_delete)." -ForegroundColor Green

  try {
    $xlsxLastModified = (Get-Item $XlsxPath).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
    $importDate = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $rows = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_RESIDUOS_INDIGO;").Trim()
    $safePath = $XlsxPath.Replace("'", "''")
    $sql = @"
INSERT INTO import_control (tabla_destino, xlsx_path, xlsx_sheet, last_import_date, xlsx_last_modified, xlsx_hash, rows_imported, import_strategy)
VALUES ('tb_RESIDUOS_INDIGO', '$safePath', '$Sheet', '$importDate', '$xlsxLastModified', 'NA', $rows, 'fast_csv')
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
    Write-Warning "No se pudo actualizar import_control para tb_RESIDUOS_INDIGO: $_"
  }
}
finally {
  Remove-Item -Path $tmpCsv -ErrorAction SilentlyContinue
}
