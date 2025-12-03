Param(
  [Parameter(Mandatory=$true)] [string]$CsvDir,
  [Parameter(Mandatory=$true)] [string]$SqlitePath
)
$ErrorActionPreference = 'Stop'

# Requiere sqlite3 en PATH (winget install SQLite.SQLite)
if (-not (Get-Command sqlite3 -ErrorAction SilentlyContinue)) {
  throw "sqlite3 no encontrado en PATH. Instala con: winget install SQLite.SQLite"
}

# Crear DB limpia
if (Test-Path $SqlitePath) { Remove-Item $SqlitePath -Force }

# Crear tablas automáticamente a partir de cabeceras CSV (todo texto por simplicidad).
# Para producción, ajustar tipos según schema.json
$csvs = Get-ChildItem -Path $CsvDir -Filter *.csv

foreach ($f in $csvs) {
  $table = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
  $firstLine = (Get-Content $f.FullName -TotalCount 1)
  $cols = $firstLine -split ',' | ForEach-Object { $_.Trim('"') }
  $colsSql = ($cols | ForEach-Object { '"' + $_ + '" TEXT' }) -join ', '
  $create = "CREATE TABLE '" + $table + "' (" + $colsSql + ");"
  & sqlite3 $SqlitePath $create
  & sqlite3 $SqlitePath ".mode csv" ".import --skip 1 '$($f.FullName)' '$table'"
  Write-Host "Importado: $($f.Name) -> tabla $table" -ForegroundColor Green
}

Write-Host "Listo: $SqlitePath" -ForegroundColor Yellow
