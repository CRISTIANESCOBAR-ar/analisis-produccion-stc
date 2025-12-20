param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$SqlitePath,
  [Parameter(Mandatory=$false)][string]$Sheet = 'rptpm'
)

$ErrorActionPreference = 'Stop'

# CSV directo o XLSX
$isCsv = [System.IO.Path]::GetExtension($XlsxPath).ToLower() -eq '.csv'
$tmpCsv = $null
$csvPath = $null

try {
  if ($isCsv) {
    Write-Host "Usando archivo CSV directo: $XlsxPath" -ForegroundColor Cyan
    $csvPath = $XlsxPath
  } else {
    $tmpCsv = [System.IO.Path]::GetTempFileName()
    $csvPath = $tmpCsv -replace '\\','/'
    Write-Host "Convirtiendo XLSX a CSV con Python..." -ForegroundColor Cyan
    # Usar Python (mucho más rápido que Import-Excel)
    python "$PSScriptRoot\excel-to-csv.py" $XlsxPath $Sheet $tmpCsv 2 2>$null
    if ($LASTEXITCODE -ne 0) {
      throw "Error en la conversión de Excel a CSV (Python script failed)."
    }
  }

  $cmds = @(
    "DROP TABLE IF EXISTS temp_paradas;",
    "CREATE TEMP TABLE temp_paradas AS SELECT * FROM tb_PARADAS WHERE 1=0;",
    ".mode csv",
    ".import $csvPath temp_paradas",
    
    # --- LIMPIEZA DE DATOS ---
    # 1. Eliminar filas vacías o encabezados repetidos en la tabla temporal
    "DELETE FROM temp_paradas WHERE DATA_BASE IS NULL OR DATA_BASE = '' OR DATA_BASE = 'DATA_BASE' OR DATA_BASE NOT LIKE '__/__/____';",
    
    "BEGIN;",
    # 2. Limpieza preventiva de la tabla principal
    "DELETE FROM tb_PARADAS WHERE DATA_BASE IS NULL OR DATA_BASE = '' OR DATA_BASE = 'DATA_BASE' OR DATA_BASE NOT LIKE '__/__/____';",

    # 3. Reemplazo por fecha
    "DELETE FROM tb_PARADAS WHERE DATA_BASE IN (SELECT DISTINCT DATA_BASE FROM temp_paradas);",
    "INSERT INTO tb_PARADAS SELECT * FROM temp_paradas;",
    "COMMIT;",
    "DROP TABLE temp_paradas;"
  )

  $cmds | & sqlite3 $SqlitePath
  Write-Host "Importacion PARADAS completada (fast csv, date_delete)." -ForegroundColor Green

  try {
    $xlsxLastModified = (Get-Item $XlsxPath).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
    $importDate = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $rows = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_PARADAS;").Trim()
    $safePath = $XlsxPath.Replace("'", "''")
    $sql = @"
INSERT INTO import_control (tabla_destino, xlsx_path, xlsx_sheet, last_import_date, xlsx_last_modified, xlsx_hash, rows_imported, import_strategy)
VALUES ('tb_PARADAS', '$safePath', '$Sheet', '$importDate', '$xlsxLastModified', 'NA', $rows, 'fast_csv')
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
    Write-Warning "No se pudo actualizar import_control para tb_PARADAS: $_"
  }
}
finally {
  if ($tmpCsv) { Remove-Item -Path $tmpCsv -ErrorAction SilentlyContinue }
}
