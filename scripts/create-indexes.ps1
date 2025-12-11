# =====================================================================
# Script para crear índices en SQLite para optimizar consultas
# =====================================================================
# Mejora el rendimiento de las consultas de revisión de calidad
# =====================================================================

$ErrorActionPreference = "Stop"
$dbPath = ".\database\produccion.db"

Write-Host "🔍 Creando índices en $dbPath..." -ForegroundColor Cyan

# Verificar que existe sqlite3.exe
$sqlite3 = "sqlite3"
try {
    & $sqlite3 --version | Out-Null
} catch {
    Write-Host "❌ No se encuentra sqlite3.exe en el PATH" -ForegroundColor Red
    Write-Host "   Descárgalo de https://www.sqlite.org/download.html" -ForegroundColor Yellow
    exit 1
}

# Crear índices si no existen
$indexes = @"
-- Índices para tb_PRODUCCION (optimiza búsquedas por partida y fecha)
CREATE INDEX IF NOT EXISTS idx_produccion_partida ON tb_PRODUCCION(PARTIDA);
CREATE INDEX IF NOT EXISTS idx_produccion_dt_base ON tb_PRODUCCION(DT_BASE_PRODUCAO);
CREATE INDEX IF NOT EXISTS idx_produccion_partida_dt ON tb_PRODUCCION(PARTIDA, DT_BASE_PRODUCAO);
CREATE INDEX IF NOT EXISTS idx_produccion_seletor_filial ON tb_PRODUCCION(SELETOR, FILIAL);

-- Índices para tb_CALIDAD (optimiza búsquedas por partida, fecha y revisor)
CREATE INDEX IF NOT EXISTS idx_calidad_partida ON tb_CALIDAD(PARTIDA);
CREATE INDEX IF NOT EXISTS idx_calidad_dat_prod ON tb_CALIDAD(DAT_PROD);
CREATE INDEX IF NOT EXISTS idx_calidad_revisor ON tb_CALIDAD("REVISOR FINAL");
CREATE INDEX IF NOT EXISTS idx_calidad_partida_dat_revisor ON tb_CALIDAD(PARTIDA, DAT_PROD, "REVISOR FINAL");
CREATE INDEX IF NOT EXISTS idx_calidad_qualidade ON tb_CALIDAD(QUALIDADE);

-- Índice compuesto para la consulta más común de producción
CREATE INDEX IF NOT EXISTS idx_produccion_composite ON tb_PRODUCCION(FILIAL, SELETOR, DT_BASE_PRODUCAO, PARTIDA) 
  WHERE PARTIDA IS NOT NULL AND PARTIDA != '';

-- Analizar tablas para actualizar estadísticas
ANALYZE tb_PRODUCCION;
ANALYZE tb_CALIDAD;
"@

Write-Host "📝 Ejecutando comandos SQL..." -ForegroundColor Yellow

# Ejecutar los comandos
$indexes | & $sqlite3 $dbPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Índices creados exitosamente" -ForegroundColor Green
    
    # Mostrar información de los índices
    Write-Host "`n📊 Índices existentes en tb_PRODUCCION:" -ForegroundColor Cyan
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='tb_PRODUCCION';" | & $sqlite3 $dbPath
    
    Write-Host "`n📊 Índices existentes en tb_CALIDAD:" -ForegroundColor Cyan
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='tb_CALIDAD';" | & $sqlite3 $dbPath
    
    # Información del tamaño de la base de datos
    Write-Host "`n💾 Tamaño de la base de datos:" -ForegroundColor Cyan
    $dbSize = (Get-Item $dbPath).Length / 1MB
    Write-Host "   $([math]::Round($dbSize, 2)) MB" -ForegroundColor White
    
    Write-Host "`n✨ Optimización completada" -ForegroundColor Green
    Write-Host "   Las consultas de revisión deberían ser ahora más rápidas" -ForegroundColor White
} else {
    Write-Host "❌ Error creando índices" -ForegroundColor Red
    exit 1
}
