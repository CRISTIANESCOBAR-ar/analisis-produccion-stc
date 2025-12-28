# Script para limpiar tb_DEFECTOS - eliminar registros anteriores a 2025
# Fecha: 27/12/2025

$ErrorActionPreference = "Stop"
$dbPath = "database\produccion.db"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LIMPIEZA DE tb_DEFECTOS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe backup
$backupFolder = "database\backups"
$latestBackup = Get-ChildItem -Path $backupFolder -Filter "produccion_backup_*.db" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $latestBackup) {
    Write-Host "❌ ERROR: No se encontró backup. Ejecuta clean-old-data.ps1 primero." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backup encontrado: $($latestBackup.Name)" -ForegroundColor Green
Write-Host "   Tamaño: $([math]::Round($latestBackup.Length / 1MB, 2)) MB" -ForegroundColor Gray
Write-Host ""

# Obtener tamaño inicial
$dbSizeInitial = (Get-Item $dbPath).Length / 1MB

Write-Host "📊 Estado inicial:" -ForegroundColor Cyan
Write-Host "   Tamaño BD: $([math]::Round($dbSizeInitial, 2)) MB" -ForegroundColor Gray

# Contar registros iniciales
$registrosInicial = sqlite3 $dbPath "SELECT COUNT(*) FROM tb_DEFECTOS;"
Write-Host "   Registros tb_DEFECTOS: $registrosInicial" -ForegroundColor Gray
Write-Host ""

# Mostrar distribución por año
Write-Host "📅 Distribución por año:" -ForegroundColor Cyan
$distribucion = sqlite3 $dbPath "SELECT substr(DATA_PROD, 7, 4) AS Anio, COUNT(*) FROM tb_DEFECTOS WHERE DATA_PROD IS NOT NULL AND DATA_PROD != '' GROUP BY Anio ORDER BY Anio;"
$distribucion | ForEach-Object {
    $parts = $_.Split('|')
    if ($parts.Length -eq 2) {
        $anio = $parts[0]
        $count = $parts[1]
        if ($anio -lt "2025") {
            Write-Host "   $anio : $count registros" -ForegroundColor Yellow
        } else {
            Write-Host "   $anio : $count registros" -ForegroundColor Green
        }
    }
}
Write-Host ""

# Confirmar eliminación
Write-Host "⚠️  Se eliminarán TODOS los registros anteriores a 01/01/2025" -ForegroundColor Yellow
Write-Host ""
$confirmar = Read-Host "¿Deseas continuar? (S/N)"

if ($confirmar -ne "S" -and $confirmar -ne "s") {
    Write-Host "❌ Operación cancelada" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔄 Iniciando limpieza..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar DELETE
Write-Host "   Eliminando registros de tb_DEFECTOS..." -ForegroundColor Gray

# DATA_PROD está en formato dd/mm/yyyy (texto)
# Convertir a formato ISO para comparación: substr(DATA_PROD, 7, 4) || '-' || substr(DATA_PROD, 4, 2) || '-' || substr(DATA_PROD, 1, 2)
sqlite3 $dbPath @"
DELETE FROM tb_DEFECTOS 
WHERE DATA_PROD IS NULL 
   OR DATA_PROD = ''
   OR (substr(DATA_PROD, 7, 4) || '-' || substr(DATA_PROD, 4, 2) || '-' || substr(DATA_PROD, 1, 2)) < '2025-01-01';
"@

Write-Host "   ✅ Registros eliminados" -ForegroundColor Green
Write-Host ""

# Ejecutar VACUUM
Write-Host "   Optimizando base de datos (VACUUM)..." -ForegroundColor Gray
sqlite3 $dbPath "VACUUM;"
Write-Host "   ✅ Optimización completada" -ForegroundColor Green
Write-Host ""

# Obtener tamaño final
$dbSizeFinal = (Get-Item $dbPath).Length / 1MB
$reduccion = $dbSizeInitial - $dbSizeFinal
$porcentajeReduccion = ($reduccion / $dbSizeInitial) * 100

# Contar registros finales
$registrosFinal = sqlite3 $dbPath "SELECT COUNT(*) FROM tb_DEFECTOS;"
$registrosEliminados = [int]$registrosInicial - [int]$registrosFinal

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ LIMPIEZA COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Resultados:" -ForegroundColor Cyan
Write-Host "   Tamaño antes : $([math]::Round($dbSizeInitial, 2)) MB" -ForegroundColor Gray
Write-Host "   Tamaño después: $([math]::Round($dbSizeFinal, 2)) MB" -ForegroundColor Gray
Write-Host "   Reducción     : $([math]::Round($reduccion, 2)) MB ($([math]::Round($porcentajeReduccion, 1))%)" -ForegroundColor Green
Write-Host ""
Write-Host "   Registros antes   : $registrosInicial" -ForegroundColor Gray
Write-Host "   Registros después : $registrosFinal" -ForegroundColor Gray
Write-Host "   Registros eliminados: $registrosEliminados" -ForegroundColor Yellow
Write-Host ""

# Mostrar distribución final
Write-Host "📅 Distribución final por mes (2025):" -ForegroundColor Cyan
$distribucionFinal = sqlite3 $dbPath "SELECT substr(DATA_PROD, 4, 2) || '/' || substr(DATA_PROD, 7, 4) AS Mes, COUNT(*) FROM tb_DEFECTOS WHERE DATA_PROD IS NOT NULL GROUP BY Mes ORDER BY substr(DATA_PROD, 7, 4) || '-' || substr(DATA_PROD, 4, 2);"
$distribucionFinal | ForEach-Object {
    $parts = $_.Split('|')
    if ($parts.Length -eq 2) {
        Write-Host "   $($parts[0]): $($parts[1]) registros" -ForegroundColor Green
    }
}
Write-Host ""
Write-Host "💾 Backup disponible en: $backupFolder" -ForegroundColor Cyan
Write-Host ""
