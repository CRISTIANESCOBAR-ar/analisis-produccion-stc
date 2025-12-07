# import-csv-to-produccion.ps1
# Importa un CSV exportado desde Access a tb_PRODUCCION
# Maneja UTF-8 BOM y headers correctamente

param(
    [Parameter(Mandatory=$true)][string]$CsvPath,
    [Parameter(Mandatory=$true)][string]$SqlitePath
)

$ErrorActionPreference = "Stop"

Write-Host "Importando CSV a tb_PRODUCCION..." -ForegroundColor Cyan
Write-Host "  CSV: $CsvPath" -ForegroundColor Gray
Write-Host "  SQLite: $SqlitePath" -ForegroundColor Gray

# Convertir a ruta Unix para SQLite
$csvPathUnix = $CsvPath -replace '\\', '/'

# Leer CSV con PowerShell para limpiar BOM
$content = Get-Content $CsvPath -Raw -Encoding UTF8
$content = $content.TrimStart([char]0xFEFF) # Remover BOM si existe

# Crear archivo temporal sin BOM
$tempCsv = [System.IO.Path]::GetTempFileName()
$tempCsvUnix = $tempCsv -replace '\\', '/'
[System.IO.File]::WriteAllText($tempCsv, $content, [System.Text.UTF8Encoding]::new($false))

try {
    # Importar usando tabla temporal
    $cmds = @(
        "DROP TABLE IF EXISTS temp_produccion;",
        "CREATE TEMP TABLE temp_produccion AS SELECT * FROM tb_PRODUCCION WHERE 1=0;",
        ".mode csv",
        ".import --skip 1 $tempCsvUnix temp_produccion",
        "BEGIN;",
        "INSERT INTO tb_PRODUCCION SELECT * FROM temp_produccion;",
        "COMMIT;",
        "DROP TABLE temp_produccion;"
    )
    
    & sqlite3 $SqlitePath @cmds
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Importación exitosa" -ForegroundColor Green
    } else {
        Write-Host "  ERROR en importación" -ForegroundColor Red
        exit 1
    }
} finally {
    Remove-Item $tempCsv -ErrorAction SilentlyContinue
}
