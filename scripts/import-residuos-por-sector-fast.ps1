param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$SqlitePath,
  [Parameter(Mandatory=$false)][string]$Sheet = 'rptResiduosPorSetor'
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
    "DROP TABLE IF EXISTS temp_residuos_por_sector;",
    "CREATE TEMP TABLE temp_residuos_por_sector AS SELECT * FROM tb_RESIDUOS_POR_SECTOR WHERE 1=0;",
    ".mode csv",
    ".import $csvPath temp_residuos_por_sector",
    
    # --- LIMPIEZA DE DATOS ---
    # 1. Eliminar filas vacías o encabezados repetidos en la tabla temporal
    "DELETE FROM temp_residuos_por_sector WHERE DT_MOV IS NULL OR DT_MOV = '' OR DT_MOV = 'DT_MOV' OR DT_MOV NOT LIKE '__/__/____';",
    "DELETE FROM temp_residuos_por_sector WHERE FILIAL IS NULL OR FILIAL = '';",
    
    "BEGIN;",
    # 2. Limpieza preventiva de la tabla principal
    "DELETE FROM tb_RESIDUOS_POR_SECTOR WHERE DT_MOV IS NULL OR DT_MOV = '' OR DT_MOV = 'DT_MOV' OR DT_MOV NOT LIKE '__/__/____';",
    "DELETE FROM tb_RESIDUOS_POR_SECTOR WHERE FILIAL IS NULL OR FILIAL = '';",

    # 3. Reemplazo por fecha
    "DELETE FROM tb_RESIDUOS_POR_SECTOR WHERE DT_MOV IN (SELECT DISTINCT DT_MOV FROM temp_residuos_por_sector);",
    "INSERT INTO tb_RESIDUOS_POR_SECTOR SELECT * FROM temp_residuos_por_sector;",
    "COMMIT;",
    "DROP TABLE temp_residuos_por_sector;"
  )

  $cmds | & sqlite3 $SqlitePath
  Write-Host "Importacion RESIDUOS_POR_SECTOR completada (fast csv, date_delete)." -ForegroundColor Green

  try {
    $xlsxLastModified = (Get-Item $XlsxPath).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
    $importDate = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $rows = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_RESIDUOS_POR_SECTOR;").Trim()
    $safePath = $XlsxPath.Replace("'", "''")
    $sql = @"
INSERT INTO import_control (tabla_destino, xlsx_path, xlsx_sheet, last_import_date, xlsx_last_modified, xlsx_hash, rows_imported, import_strategy)
VALUES ('tb_RESIDUOS_POR_SECTOR', '$safePath', '$Sheet', '$importDate', '$xlsxLastModified', 'NA', $rows, 'fast_csv')
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
    Write-Warning "No se pudo actualizar import_control para tb_RESIDUOS_POR_SECTOR: $_"
  }
}
finally {
  if ($tmpCsv) { Remove-Item -Path $tmpCsv -ErrorAction SilentlyContinue }
}
