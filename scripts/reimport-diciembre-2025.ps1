$ErrorActionPreference = 'Stop'

$dbPath = "C:\analisis-produccion-stc\database\produccion.db"

Write-Host "🗑️  Borrando datos de diciembre 2025 de tb_CALIDAD..." -ForegroundColor Yellow

# Borrar diciembre 2025 de tb_CALIDAD
$sql = @"
BEGIN;
DELETE FROM tb_CALIDAD WHERE DATE(DAT_PROD) BETWEEN '2025-12-01' AND '2025-12-31';
COMMIT;
"@

$sql | sqlite3 $dbPath

Write-Host "✅ Datos de diciembre 2025 borrados" -ForegroundColor Green

# Re-importar con scripts corregidos
Write-Host ""
Write-Host "📥 Re-importando tb_CALIDAD desde XLSX..." -ForegroundColor Cyan

& "$PSScriptRoot\import-calidad-fast.ps1" `
  -XlsxPath "C:\STC\rptAcompDiarioPBI.xlsx" `
  -SqlitePath $dbPath `
  -Sheet "report5"

Write-Host ""
Write-Host "✅ Re-importación completada" -ForegroundColor Green
Write-Host ""

# Verificar resultados
Write-Host "📊 Verificando datos RETALHO de diciembre 2025:" -ForegroundColor Cyan
$verificacion = @"
SELECT 
  COUNT(*) as registros,
  ROUND(SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)), 2) as metros_total,
  MIN(METRAGEM) as min_valor,
  MAX(METRAGEM) as max_valor
FROM tb_CALIDAD 
WHERE DATE(DAT_PROD) BETWEEN '2025-12-01' AND '2025-12-31' 
  AND QUALIDADE LIKE '%RETALHO%';
"@

Write-Host "Resultado:"
$verificacion | sqlite3 $dbPath
