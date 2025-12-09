# Script para eliminar encabezados repetidos de tb_CALIDAD
# Los archivos XLSX a veces tienen filas de encabezados duplicados que se importan como datos

param(
    [string]$SqlitePath = "C:\analisis-produccion-stc\database\produccion.db"
)

$ErrorActionPreference = 'Stop'

Write-Host "`n🧹 Limpiando encabezados repetidos de tb_CALIDAD..." -ForegroundColor Cyan

# Contar filas antes
$beforeCount = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_CALIDAD;").Trim()
Write-Host "📊 Filas antes de limpiar: $beforeCount" -ForegroundColor White

# Contar cuántos encabezados hay
$headerCount = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_CALIDAD WHERE EMP = 'EMP' AND DAT_PROD = 'DAT_PROD';").Trim()

if ([int]$headerCount -eq 0) {
    Write-Host "✅ No se encontraron encabezados repetidos. La tabla está limpia." -ForegroundColor Green
    exit 0
}

Write-Host "⚠️  Se encontraron $headerCount filas de encabezados repetidos" -ForegroundColor Yellow

# Eliminar encabezados repetidos
# Los encabezados tienen valores literales de columna en lugar de datos reales
$sql = @"
DELETE FROM tb_CALIDAD 
WHERE EMP = 'EMP' 
  AND DAT_PROD = 'DAT_PROD' 
  AND GRP_DEF = 'GRP_DEF'
  AND COD_DE = 'COD_DE'
  AND DEFEITO = 'DEFEITO';
"@

$sql | & sqlite3 $SqlitePath

# Contar filas después
$afterCount = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_CALIDAD;").Trim()
$deleted = [int]$beforeCount - [int]$afterCount

Write-Host "`n✅ Limpieza completada:" -ForegroundColor Green
Write-Host "   • Filas eliminadas: $deleted" -ForegroundColor Yellow
Write-Host "   • Filas restantes: $afterCount" -ForegroundColor Green

# Verificar que no queden más encabezados
$remainingHeaders = (& sqlite3 $SqlitePath "SELECT COUNT(*) FROM tb_CALIDAD WHERE EMP = 'EMP';").Trim()
if ([int]$remainingHeaders -eq 0) {
    Write-Host "`n✅ Verificación exitosa: No quedan encabezados en la tabla" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Advertencia: Aún quedan $remainingHeaders filas con EMP='EMP'" -ForegroundColor Red
    Write-Host "   Ejecuta manualmente: DELETE FROM tb_CALIDAD WHERE EMP = 'EMP';" -ForegroundColor Yellow
}
