param(
    [string]$SqlitePath = "C:\analisis-produccion-stc\database\produccion.db"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SqlitePath)) {
    Write-Error "No se encontró la base de datos en $SqlitePath"
    exit 1
}

$columns = @(
    "TOTAL MINUTOS TUR",
    "TOTAL MINUTOS TUR 1",
    "TOTAL MINUTOS TUR 2"
)

foreach ($col in $columns) {
    $exists = & sqlite3 $SqlitePath "SELECT 1 FROM pragma_table_info('tb_PRODUCCION') WHERE name='$col';"
    if (-not $exists) {
        Write-Host "Agregando columna '$col' en tb_PRODUCCION" -ForegroundColor Yellow
        & sqlite3 $SqlitePath "ALTER TABLE tb_PRODUCCION ADD COLUMN '$col' TEXT;"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "No se pudo agregar la columna $col"
            exit 1
        }
    } else {
        Write-Host "Columna '$col' ya existe" -ForegroundColor Gray
    }
}

Write-Host "Columnas verificadas/creadas correctamente." -ForegroundColor Green
