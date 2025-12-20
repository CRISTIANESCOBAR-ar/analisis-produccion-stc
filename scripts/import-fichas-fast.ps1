param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$SqlitePath,
  [Parameter(Mandatory=$false)][string]$Sheet = 'lista de tecidos'
)

$ErrorActionPreference = 'Stop'

# CSV directo o XLSX
$isCsv = [System.IO.Path]::GetExtension($XlsxPath).ToLower() -eq '.csv'
$tmpCsv = $null
$csvPath = $null

try {
  if ($isCsv) {
    Write-Host "Procesando CSV directo: $XlsxPath" -ForegroundColor Cyan
    # Filtrar encabezados repetidos y crear CSV limpio temporal
    $tmpCsv = [System.IO.Path]::GetTempFileName()
    $csvPath = $tmpCsv -replace '\\','/'
    
    $origPath = $XlsxPath
    $firstLine = (Get-Content -Path $origPath -TotalCount 1)
    $headerPattern = $firstLine.Trim()
    
    $out = New-Object System.Collections.Generic.List[string]
    # Leer todo, saltar líneas que sean iguales al header (excepto la primera vez, pero .import espera header si usamos .mode csv?)
    # SQLite .import con .mode csv asume que la primera línea es header si la tabla no existe, pero aquí la tabla existe.
    # Si la tabla existe, .import trata la primera línea como datos a menos que usemos --skip 1 (disponible en sqlite nuevos)
    # Como no sabemos versión, mejor quitamos TODOS los headers del CSV limpio y dejamos solo datos.
    
    Get-Content -Path $origPath | ForEach-Object {
      $line = $_
      if ($line.Trim() -ne $headerPattern) { $out.Add($line) }
    }
    Set-Content -Path $tmpCsv -Value $out -Encoding UTF8
    
  } else {
    $tmpCsv = [System.IO.Path]::GetTempFileName()
    $csvPath = $tmpCsv -replace '\\','/'
    Write-Host "Convirtiendo XLSX a CSV con Python..." -ForegroundColor Cyan
    python "$PSScriptRoot\excel-to-csv.py" $XlsxPath $Sheet $tmpCsv 2 2>$null
    if ($LASTEXITCODE -ne 0) {
      throw "Error en la conversión de Excel a CSV (Python script failed)."
    }
  }

  # Recrear tabla con estructura correcta (sin F36) e importar
  $sqlCmd = @"
DROP TABLE IF EXISTS tb_FICHAS;
CREATE TABLE [tb_FICHAS] (
    [ARTIGO CODIGO] TEXT,
    [ARTIGO] TEXT,
    [COR] TEXT,
    [NCM] INTEGER,
    [BASE] TEXT,
    [UnP] TEXT,
    [VENDA] TEXT,
    [PRODUCAO] TEXT,
    [NOME REDUZIDO] TEXT,
    [NOME DE MERCADO] TEXT,
    [LINHA] TEXT,
    [URDUME] TEXT,
    [SARJA] TEXT,
    [COD# RETALHO] TEXT,
    [SAP] TEXT,
    [TRAMA REDUZIDO] TEXT,
    [SGS] INTEGER,
    [SGS UN 1] INTEGER,
    [DESCRICAO] TEXT,
    [BATIDAS/FIO] INTEGER,
    [NE RESULTANTE] INTEGER,
    [SAP1] TEXT,
    [TRAMA REDUZIDO1] TEXT,
    [SGS1] TEXT,
    [SGS UN 2] TEXT,
    [DESCRICAO1] TEXT,
    [BATIDAS/FIO1] TEXT,
    [NE RESULTANTE1] TEXT,
    [CONS#TR/m] INTEGER,
    [SGS2] INTEGER,
    [QT#FIOS] INTEGER,
    [NE RESULTANTE2] INTEGER,
    [SGS3] INTEGER,
    [QT#FIOS1] TEXT,
    [NE RESULTANTE3] TEXT,
    [CONS#URD/m] TEXT,
    [BATIDA] INTEGER,
    [LARG#PENTE] INTEGER,
    [LARG#CRU] INTEGER,
    [PESO/m CRU] INTEGER,
    [Oz/jd2] INTEGER,
    [Peso/m2] TEXT,
    [LARGURA MIN] TEXT,
    [LARGURA] INTEGER,
    [LARGURA MAX] INTEGER,
    [SKEW MIN] INTEGER,
    [SKEW MAX] INTEGER,
    [URD#MIN] INTEGER,
    [URD#MAX] INTEGER,
    [TRAMA MIN] INTEGER,
    [TRAMA MAX] INTEGER,
    [VAR STR#MIN TRAMA] INTEGER,
    [VAR STR#MAX TRAMA] INTEGER,
    [VAR STR#MIN URD] INTEGER,
    [VAR STR#MAX URD] INTEGER,
    [PONTOS] INTEGER,
    [ENC#TEC#URDUME] INTEGER,
    [ENC# TEC#TRAMA] INTEGER,
    [ENC#ACAB URD] INTEGER,
    [ENC#ACAB TRAMA] INTEGER,
    [LAV#AMAC#URD] INTEGER,
    [LAV#AMAC#TRM] INTEGER,
    [LAV STONE] TEXT,
    [LAV STONE 1] INTEGER,
    [STRET LAV STONE] INTEGER,
    [COMPOSICAO] INTEGER,
    [TRAMA] INTEGER
);
CREATE INDEX idx_fichas_artigo ON tb_FICHAS(ARTIGO);
.mode csv
.import $csvPath tb_FICHAS
"@
  
  $sqlCmd | & sqlite3 $SqlitePath
  Write-Host "Importacion FICHAS completada (fast csv, estructura corregida)." -ForegroundColor Green

  # Actualizar control de importación
  try {
    $xlsxLastModified = (Get-Item $XlsxPath).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
    $importDate = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $rows = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_FICHAS;").Trim()
    $safePath = $XlsxPath.Replace("'", "''")
    $sql = @"
INSERT INTO import_control (tabla_destino, xlsx_path, xlsx_sheet, last_import_date, xlsx_last_modified, xlsx_hash, rows_imported, import_strategy)
VALUES ('tb_FICHAS', '$safePath', '$Sheet', '$importDate', '$xlsxLastModified', 'NA', $rows, 'fast_csv')
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
    Write-Warning "No se pudo actualizar import_control para tb_FICHAS: $_"
  }
}
finally {
  if ($tmpCsv) { Remove-Item -Path $tmpCsv -ErrorAction SilentlyContinue }
}
