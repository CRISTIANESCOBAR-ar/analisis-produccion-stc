# =============================================================================
# Verificar Integridad de Datos en SQLite - tb_PRODUCCION
# =============================================================================

$dbPath = ".\database\produccion.db"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Verificador de Integridad SQLite" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar columnas vacías en tb_PRODUCCION
$query = @"
SELECT 
    COUNT(*) as Total,
    COUNT(PONTOS_LIDOS) as ConPontosLidos,
    COUNT("PONTOS_100%") as ConPontos100,
    COUNT("PARADA TEC TRAMA") as ConParadaTrama,
    COUNT("PARADA TEC URDUME") as ConParadaUrdume,
    COUNT(*) - COUNT(PONTOS_LIDOS) as SinPontosLidos,
    COUNT(*) - COUNT("PONTOS_100%") as SinPontos100,
    COUNT(*) - COUNT("PARADA TEC TRAMA") as SinParadaTrama,
    COUNT(*) - COUNT("PARADA TEC URDUME") as SinParadaUrdume
FROM tb_PRODUCCION
WHERE SELETOR = 'TECELAGEM'
"@

Write-Host "🔍 Consultando base de datos..." -ForegroundColor Yellow
$result = sqlite3.exe $dbPath $query

Write-Host $result
Write-Host ""

# Buscar partidas específicas sin PONTOS_LIDOS
Write-Host "🔎 Partidas SIN PONTOS_LIDOS:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

$query2 = @"
SELECT DISTINCT
    PARTIDA,
    COUNT(*) as Registros,
    MIN(DT_BASE_PRODUCAO) as FechaInicio,
    MAX(DT_BASE_PRODUCAO) as FechaFin
FROM tb_PRODUCCION
WHERE SELETOR = 'TECELAGEM'
  AND (PONTOS_LIDOS IS NULL OR PONTOS_LIDOS = 0)
GROUP BY PARTIDA
ORDER BY PARTIDA
"@

$missing = sqlite3.exe $dbPath $query2
if ($missing) {
    Write-Host $missing -ForegroundColor Red
} else {
    Write-Host "✓ Todas las partidas tienen PONTOS_LIDOS" -ForegroundColor Green
}

Write-Host ""

# Verificar partida específica 1541315
Write-Host "📋 Detalle de Partida 1541315:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

$query3 = @"
SELECT 
    DT_BASE_PRODUCAO,
    TURNO,
    MAQUINA,
    PONTOS_LIDOS,
    "PONTOS_100%",
    "PARADA TEC TRAMA",
    "PARADA TEC URDUME",
    METRAGEM
FROM tb_PRODUCCION
WHERE PARTIDA = '1541315'
  AND SELETOR = 'TECELAGEM'
ORDER BY DT_BASE_PRODUCAO, TURNO
"@

Write-Host ""
sqlite3.exe $dbPath -header -column $query3

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CONCLUSIÓN" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si PONTOS_LIDOS está vacío, necesitas:" -ForegroundColor Yellow
Write-Host "  1. Re-exportar desde Access usando ExportarProduccionCompleto.vba" -ForegroundColor White
Write-Host "  2. Re-importar el CSV a SQLite con el script de importación" -ForegroundColor White
Write-Host ""
