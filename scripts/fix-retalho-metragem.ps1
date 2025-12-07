# Script para corregir METRAGEM de registros RETALHO en diciembre 2025
# Los valores están como enteros (2145) cuando deberían ser decimales con coma (21,45)

param(
  [Parameter(Mandatory=$false)][string]$SqlitePath = "C:\analisis-produccion-stc\database\produccion.db"
)

$ErrorActionPreference = 'Stop'

Write-Host "Corrigiendo METRAGEM de RETALHO en diciembre 2025..." -ForegroundColor Yellow

# Primero, verificar cuántos registros se van a corregir
$count = (sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_CALIDAD WHERE DATE(DAT_PROD) >= '2025-12-01' AND QUALIDADE LIKE '%RETALHO%';").Trim()

Write-Host "Registros RETALHO encontrados en diciembre 2025: $count" -ForegroundColor Cyan

if ($count -eq "0") {
  Write-Host "No hay registros RETALHO para corregir." -ForegroundColor Green
  exit 0
}

# Ver suma actual
$sumaAntes = (sqlite3 $SqlitePath "SELECT SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) FROM tb_CALIDAD WHERE DATE(DAT_PROD) >= '2025-12-01' AND QUALIDADE LIKE '%RETALHO%';").Trim()
Write-Host "Suma actual de metros RETALHO: $sumaAntes" -ForegroundColor Yellow

# Actualizar: dividir por 100 y agregar coma decimal
$sql = @"
UPDATE tb_CALIDAD
SET METRAGEM = REPLACE(
  PRINTF('%.2f', CAST(METRAGEM AS REAL) / 100.0),
  '.',
  ','
)
WHERE DATE(DAT_PROD) >= '2025-12-01'
  AND QUALIDADE LIKE '%RETALHO%'
  AND CAST(METRAGEM AS REAL) > 100;
"@

sqlite3 $SqlitePath $sql

# Verificar suma después
$sumaDespues = (sqlite3 $SqlitePath "SELECT SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) FROM tb_CALIDAD WHERE DATE(DAT_PROD) >= '2025-12-01' AND QUALIDADE LIKE '%RETALHO%';").Trim()
Write-Host "Suma después de corrección: $sumaDespues" -ForegroundColor Green

# Mostrar algunos ejemplos
Write-Host "`nEjemplos de registros corregidos:" -ForegroundColor Cyan
sqlite3 $SqlitePath "SELECT PEÇA, METRAGEM, QUALIDADE FROM tb_CALIDAD WHERE DATE(DAT_PROD) >= '2025-12-01' AND QUALIDADE LIKE '%RETALHO%' LIMIT 5;"

Write-Host "`n✅ Corrección completada!" -ForegroundColor Green
