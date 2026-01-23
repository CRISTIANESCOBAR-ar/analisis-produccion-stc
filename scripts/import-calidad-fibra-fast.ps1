param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$SqlitePath,
  [Parameter(Mandatory=$false)][string]$Sheet = 'rptMovimMP'
)

$ErrorActionPreference = 'Stop'

# Permitir origen CSV directo para saltar la conversión
$isCsv = [System.IO.Path]::GetExtension($XlsxPath).ToLower() -eq '.csv'
$tmpCsv = $null
$csvPath = $null

try {
  if ($isCsv) {
    # Usar el CSV pero filtrando encabezados repetidos y detectando delimitador
    $origPath = $XlsxPath
    $tmpCsv = [System.IO.Path]::GetTempFileName()
    $csvPath = $tmpCsv -replace '\\','/'

    $firstLine = (Get-Content -Path $origPath -TotalCount 1)
    $isTab = $firstLine -match "\t"

    $out = New-Object System.Collections.Generic.List[string]
    $isFirst = $true
    # No escribir la primera línea (header). Omitir cualquier línea que contenga keywords de encabezado.
    Get-Content -Path $origPath | ForEach-Object {
      $line = $_
      $lineTrimmed = $line.Trim()
      # Detectar encabezados: primera línea o líneas que comienzan con 'ITEM' seguido de tab/coma
      $isHeader = $isFirst -or ($lineTrimmed -match '^ITEM[\t,]') -or ($lineTrimmed -match 'TIPO_MOV.*PRODUTOR')
      $isFirst = $false
      if (-not $isHeader -and $lineTrimmed -ne '') { $out.Add($line) }
    }
    # Guardar filtrado
    Set-Content -Path $tmpCsv -Value $out -Encoding UTF8
  } else {
    $tmpCsv = [System.IO.Path]::GetTempFileName()
    $csvPath = $tmpCsv -replace '\\','/'

    # Usar Python (100x más rápido que Import-Excel para XLSX)
    python "$PSScriptRoot\excel-to-csv.py" $XlsxPath $Sheet $tmpCsv 2 2>$null

    if ($LASTEXITCODE -ne 0) {
      throw "Error en la conversión de Excel a CSV (Python script failed). Verifica si el archivo está abierto o dañado."
    }
  }

  # Importación ultra-rápida con reemplazo total
  # Elegir modo según delimitador
  $mode = 'csv'
  if ($isCsv -and $isTab) { $mode = 'tabs' }

  $sqlCmd = @"
BEGIN IMMEDIATE;
DELETE FROM tb_CALIDAD_FIBRA;
.mode $mode
.import $csvPath tb_CALIDAD_FIBRA
COMMIT;
"@
  
  $sqlCmd | & sqlite3 $SqlitePath
  Write-Host "Importacion CALIDAD_FIBRA completada (fast csv, reemplazo total)." -ForegroundColor Green

  # Actualizar control de importación
  try {
    $xlsxLastModified = (Get-Item $XlsxPath).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
    $importDate = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $rows = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_CALIDAD_FIBRA;").Trim()
    $safePath = $XlsxPath.Replace("'", "''")
    $sql = @"
INSERT INTO import_control (tabla_destino, xlsx_path, xlsx_sheet, last_import_date, xlsx_last_modified, xlsx_hash, rows_imported, import_strategy)
VALUES ('tb_CALIDAD_FIBRA', '$safePath', '$Sheet', '$importDate', '$xlsxLastModified', 'NA', $rows, 'fast_csv')
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
    Write-Warning "No se pudo actualizar import_control: $_"
  }
} finally {
  # Limpiar archivos temporales
  if ($tmpCsv -and (Test-Path $tmpCsv)) {
    Remove-Item $tmpCsv -Force -ErrorAction SilentlyContinue
  }
}
