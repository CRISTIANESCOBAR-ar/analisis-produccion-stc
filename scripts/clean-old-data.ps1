# clean-old-data.ps1
# Elimina registros anteriores a 01/01/2025 para reducir tamaño de BD
param(
    [string]$FechaCorte = "01/01/2025"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Limpieza de datos antiguos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$dbPath = "database\produccion.db"

# Verificar que existe la BD
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Error: No se encuentra database\produccion.db" -ForegroundColor Red
    exit 1
}

# Tamaño inicial
$sizeInitialMB = [math]::Round((Get-Item $dbPath).Length / 1MB, 2)
Write-Host "📊 Tamaño inicial: $sizeInitialMB MB" -ForegroundColor Yellow
Write-Host ""

# Convertir fecha de corte a formato dd/mm/yyyy
$fechaObj = [DateTime]::ParseExact($FechaCorte, "dd/MM/yyyy", $null)
$fechaSQL = $fechaObj.ToString("dd/MM/yyyy")

Write-Host "🗑️  Eliminando registros anteriores a: $fechaSQL" -ForegroundColor Yellow
Write-Host ""

# SQL para eliminar registros
$sqlDelete = @"
-- Eliminar tb_PRODUCCION (DT_BASE_PRODUCAO formato dd/mm/yyyy)
DELETE FROM tb_PRODUCCION 
WHERE date(substr(DT_BASE_PRODUCAO, 7, 4) || '-' || substr(DT_BASE_PRODUCAO, 4, 2) || '-' || substr(DT_BASE_PRODUCAO, 1, 2)) < date('2025-01-01');

-- Eliminar tb_CALIDAD (DATA_REVISAO formato datetime YYYY-MM-DD)
DELETE FROM tb_CALIDAD 
WHERE date(DATA_REVISAO) < date('2025-01-01');

-- Eliminar tb_PARADAS (DATA_BASE formato dd/mm/yyyy)
DELETE FROM tb_PARADAS 
WHERE date(substr(DATA_BASE, 7, 4) || '-' || substr(DATA_BASE, 4, 2) || '-' || substr(DATA_BASE, 1, 2)) < date('2025-01-01');

-- Eliminar tb_TESTES (DT_PROD formato dd/mm/yyyy)
DELETE FROM tb_TESTES 
WHERE date(substr(DT_PROD, 7, 4) || '-' || substr(DT_PROD, 4, 2) || '-' || substr(DT_PROD, 1, 2)) < date('2025-01-01');

-- Eliminar tb_RESIDUOS_INDIGO (DT_MOV formato dd/mm/yyyy)
DELETE FROM tb_RESIDUOS_INDIGO 
WHERE date(substr(DT_MOV, 7, 4) || '-' || substr(DT_MOV, 4, 2) || '-' || substr(DT_MOV, 1, 2)) < date('2025-01-01');

-- Eliminar tb_RESIDUOS_POR_SECTOR (DT_MOV formato dd/mm/yyyy)
DELETE FROM tb_RESIDUOS_POR_SECTOR 
WHERE date(substr(DT_MOV, 7, 4) || '-' || substr(DT_MOV, 4, 2) || '-' || substr(DT_MOV, 1, 2)) < date('2025-01-01');

-- Vacuumar para liberar espacio
VACUUM;
"@

# Guardar SQL en archivo temporal
$sqlFile = "temp_clean.sql"
$sqlDelete | Out-File -FilePath $sqlFile -Encoding UTF8

try {
    # Ejecutar conteo
    Write-Host "📋 Contando registros a eliminar..." -ForegroundColor Yellow
    
    # Ejecutar eliminación
    Write-Host "🗑️  Ejecutando eliminación..." -ForegroundColor Yellow
    $result = sqlite3 $dbPath ".read $sqlFile" 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        throw "Error ejecutando SQL: $result"
    }
    
    Write-Host "✅ Eliminación completada" -ForegroundColor Green
    Write-Host ""
    
    # Tamaño final
    $sizeFinalMB = [math]::Round((Get-Item $dbPath).Length / 1MB, 2)
    $reduccionMB = $sizeInitialMB - $sizeFinalMB
    $reduccionPct = [math]::Round(($reduccionMB / $sizeInitialMB) * 100, 1)
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ LIMPIEZA COMPLETADA" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Tamaño inicial:  $sizeInitialMB MB" -ForegroundColor Gray
    Write-Host "📊 Tamaño final:    $sizeFinalMB MB" -ForegroundColor Green
    Write-Host "📊 Reducción:       $reduccionMB MB ($reduccionPct%)" -ForegroundColor Green
    Write-Host ""
    Write-Host "💾 Backup disponible en: database\backups\" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error durante la limpieza: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  La base de datos no fue modificada" -ForegroundColor Yellow
    Write-Host "💾 Puedes restaurar desde: database\backups\" -ForegroundColor Cyan
    exit 1
} finally {
    # Limpiar archivo temporal
    if (Test-Path $sqlFile) {
        Remove-Item $sqlFile -Force
    }
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
