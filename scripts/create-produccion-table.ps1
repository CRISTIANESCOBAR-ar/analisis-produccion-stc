# create-produccion-table.ps1
# Crea la tabla tb_PRODUCCION con estructura correcta desde el primer CSV

param(
    [string]$ExportsPath = "C:\analisis-stock-stc\exports",
    [string]$SqlitePath = "C:\analisis-produccion-stc\database\produccion.db"
)

$ErrorActionPreference = "Stop"

Write-Host "Creando estructura tb_PRODUCCION desde CSV..." -ForegroundColor Cyan

# Tomar el primer CSV para obtener headers
$firstCsv = Get-ChildItem "$ExportsPath\tb_PRODUCCION_*.CSV" | Sort-Object Name | Select-Object -First 1

if (-not $firstCsv) {
    Write-Host "ERROR: No se encontró ningún CSV" -ForegroundColor Red
    exit 1
}

Write-Host "Usando: $($firstCsv.Name)" -ForegroundColor Gray

# Leer headers del CSV (remover BOM)
$lines = Get-Content $firstCsv.FullName -First 1 -Encoding UTF8
$content = $lines -join ""
$content = $content.TrimStart([char]0xFEFF)
$headers = $content.Trim().Split(',') | ForEach-Object { $_.Trim('"') }

Write-Host "Columnas detectadas: $($headers.Count)" -ForegroundColor Gray

# Crear DDL para la tabla
$columns = $headers | ForEach-Object { "`"$_`" TEXT" }
$createTable = "CREATE TABLE IF NOT EXISTS tb_PRODUCCION (`n  " + ($columns -join ",`n  ") + "`n);"

Write-Host "`nEjecutando CREATE TABLE..." -ForegroundColor Yellow
$createTable | & sqlite3 $SqlitePath

if ($LASTEXITCODE -eq 0) {
    Write-Host "Tabla creada correctamente" -ForegroundColor Green
    
    # Verificar
    $colCount = & sqlite3 $SqlitePath "SELECT COUNT(*) FROM pragma_table_info('tb_PRODUCCION');"
    Write-Host "Columnas creadas: $colCount" -ForegroundColor Green
} else {
    Write-Host "ERROR al crear tabla" -ForegroundColor Red
    exit 1
}
