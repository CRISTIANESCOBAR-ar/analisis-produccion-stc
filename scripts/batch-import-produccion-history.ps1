# batch-import-produccion-history.ps1
# Recuperación rápida de tb_PRODUCCION desde CSVs históricos
# Borra tabla completa y recarga TODOS los datos sin validación de fechas

param(
    [string]$ExportsPath = "C:\analisis-stock-stc\exports",
    [string]$SqlitePath = "C:\analisis-produccion-stc\database\produccion.db"
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== RECUPERACIÓN TB_PRODUCCION - DATOS HISTÓRICOS ===" -ForegroundColor Cyan
Write-Host "SQLite: $SqlitePath" -ForegroundColor Gray
Write-Host "CSVs: $ExportsPath\tb_PRODUCCION_*.CSV`n" -ForegroundColor Gray

# 1. Verificar que exista la base de datos
if (-not (Test-Path $SqlitePath)) {
    Write-Host "ERROR: No existe $SqlitePath" -ForegroundColor Red
    exit 1
}

# 2. Buscar todos los CSVs históricos
$csvFiles = Get-ChildItem "$ExportsPath\tb_PRODUCCION_*.CSV" -ErrorAction SilentlyContinue | Sort-Object Name

if ($csvFiles.Count -eq 0) {
    Write-Host "ERROR: No se encontraron archivos tb_PRODUCCION_*.CSV en $ExportsPath" -ForegroundColor Red
    exit 1
}

Write-Host "Encontrados $($csvFiles.Count) archivos CSV:" -ForegroundColor Green
$csvFiles | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }

# 3. Verificar que tb_PRODUCCION existe con estructura correcta
Write-Host "`nVerificando estructura de tb_PRODUCCION..." -ForegroundColor Yellow
$tableExistsQuery = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tb_PRODUCCION';"
$tableExists = & sqlite3 $SqlitePath $tableExistsQuery

if ($tableExists -eq "0") {
    Write-Host "ERROR: tb_PRODUCCION no existe. Ejecuta primero import-all-fast.ps1 para crear la estructura" -ForegroundColor Red
    exit 1
}
Write-Host "Estructura verificada correctamente" -ForegroundColor Green

# 4. BORRAR toda la tabla (más rápido que DELETE)
Write-Host "`n[1/3] Limpiando tb_PRODUCCION..." -ForegroundColor Yellow
& sqlite3 $SqlitePath "DELETE FROM tb_PRODUCCION;"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al limpiar tabla" -ForegroundColor Red
    exit 1
}
Write-Host "Tabla limpiada correctamente" -ForegroundColor Green

# 5. Importar cada CSV usando script que maneja BOM y headers
Write-Host "`n[2/3] Importando CSVs históricos..." -ForegroundColor Yellow

$totalStart = Get-Date
$importedCount = 0
$importScript = Join-Path $PSScriptRoot "import-csv-to-produccion.ps1"

foreach ($csvFile in $csvFiles) {
    $start = Get-Date
    $csvPath = $csvFile.FullName
    
    Write-Host "  Importando $($csvFile.Name)..." -ForegroundColor Gray -NoNewline
    
    try {
        & $importScript -CsvPath $csvPath -SqlitePath $SqlitePath 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            $elapsed = ((Get-Date) - $start).TotalSeconds
            Write-Host " OK ($([math]::Round($elapsed, 2))s)" -ForegroundColor Green
            $importedCount++
        } else {
            Write-Host " ERROR" -ForegroundColor Red
        }
    } catch {
        Write-Host " ERROR: $_" -ForegroundColor Red
    }
}

$totalElapsed = ((Get-Date) - $totalStart).TotalSeconds

# 6. Verificar resultado
Write-Host "`n[3/3] Verificando datos importados..." -ForegroundColor Yellow

$countQuery = "SELECT COUNT(*) FROM tb_PRODUCCION;"
$totalRecords = & sqlite3 $SqlitePath $countQuery

$byMonthQuery = @"
SELECT 
    strftime('%Y-%m', DT_BASE_PRODUCAO) as mes,
    COUNT(*) as registros
FROM tb_PRODUCCION 
GROUP BY mes 
ORDER BY mes;
"@
$monthlyData = & sqlite3 $SqlitePath $byMonthQuery

Write-Host "`n=== RESULTADO ===" -ForegroundColor Cyan
Write-Host "CSVs importados: $importedCount/$($csvFiles.Count)" -ForegroundColor Green
Write-Host "Total registros: $totalRecords" -ForegroundColor Green
Write-Host "Tiempo total: $([math]::Round($totalElapsed, 2))s" -ForegroundColor Green

Write-Host "`nRegistros por mes:" -ForegroundColor Yellow
$monthlyData | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

Write-Host "`n=== RECUPERACIÓN COMPLETADA ===" -ForegroundColor Cyan
Write-Host "Ahora puedes importar diciembre 2025 desde la UI" -ForegroundColor Yellow
Write-Host "El script import-produccion-fast.ps1 está protegido para NO borrar históricos`n" -ForegroundColor Yellow
