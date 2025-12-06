# =====================================================================
# ACTUALIZACION SEGURA XLSX A SQLITE CON PROTECCIONES
# =====================================================================
# Importa datos desde XLSX con:
# - Backup automático pre-importación
# - Validación de fechas
# - Borrado SOLO de fechas presentes en XLSX
# - Log de operaciones
# - Rollback en caso de error
#
# Uso:
#   .\import-xlsx-safe.ps1 -XlsxPath "C:\STC\rptAcompDiarioPBI.xlsx" `
#                          -Sheet "report5" `
#                          -Table "tb_CALIDAD" `
#                          -DateColumn "DAT_PROD" `
#                          -MappingJson "C:\analisis-produccion-stc\scripts\mappings\tb_CALIDAD.json"
# =====================================================================

param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$Sheet,
  [Parameter(Mandatory=$true)][string]$Table,
  [Parameter(Mandatory=$true)][string]$DateColumn,
  [Parameter(Mandatory=$true)][string]$MappingJson,
  [Parameter(Mandatory=$false)][string]$DbPath = "C:\analisis-produccion-stc\database\produccion.db",
  [Parameter(Mandatory=$false)][string]$BackupDir = "C:\analisis-produccion-stc\database\backups",
  [Parameter(Mandatory=$false)][switch]$SkipValidation
)

$ErrorActionPreference = "Stop"

Write-Host "`n" + ("="*80) -ForegroundColor Cyan
Write-Host "  IMPORTACION SEGURA: XLSX → SQLITE" -ForegroundColor Cyan
Write-Host ("="*80) -ForegroundColor Cyan

# ==================== CREAR DIRECTORIO DE BACKUPS ====================
if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
  Write-Host "✓ Directorio de backups creado: $BackupDir" -ForegroundColor Green
}

# ==================== HACER BACKUP ====================
Write-Host "`n[PASO 1/5] Realizando backup automático..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$BackupDir\produccion_$timestamp.db"

try {
  Copy-Item -Path $DbPath -Destination $backupFile -Force
  Write-Host "✓ Backup realizado: $(Split-Path $backupFile -Leaf)" -ForegroundColor Green
  Write-Host "   Tamaño: $([Math]::Round((Get-Item $backupFile).Length / 1MB, 2)) MB" -ForegroundColor Gray
} catch {
  Write-Host "❌ ERROR: No se pudo hacer backup: $_" -ForegroundColor Red
  exit 1
}

# ==================== EJECUTAR VALIDACION (opcional) ====================
if (-not $SkipValidation) {
  Write-Host "`n[PASO 2/5] Ejecutando validación de seguridad..." -ForegroundColor Yellow
  
  $validationScript = "C:\analisis-produccion-stc\scripts\validate-import-safety.ps1"
  if (Test-Path $validationScript) {
    & $validationScript -XlsxPath $XlsxPath -Sheet $Sheet -DateColumn $DateColumn -Table $Table -DbPath $DbPath
  } else {
    Write-Host "⚠️  Script de validación no encontrado: $validationScript" -ForegroundColor Yellow
  }
} else {
  Write-Host "`n[PASO 2/5] Validación saltada (por flag -SkipValidation)" -ForegroundColor Gray
}

# ==================== EJECUTAR IMPORTACION ====================
Write-Host "`n[PASO 3/5] Ejecutando importación XLSX..." -ForegroundColor Yellow

$importScript = "C:\analisis-produccion-stc\scripts\import-xlsx-to-sqlite.ps1"
if (-not (Test-Path $importScript)) {
  Write-Host "❌ ERROR: Script de importación no encontrado: $importScript" -ForegroundColor Red
  exit 1
}

try {
  & $importScript -XlsxPath $XlsxPath `
                  -Sheet $Sheet `
                  -SqlitePath $DbPath `
                  -Table $Table `
                  -DateColumn $DateColumn `
                  -MappingJson $MappingJson `
                  -MappingSource 'json'
  
  Write-Host "✓ Importación completada" -ForegroundColor Green
} catch {
  Write-Host "❌ ERROR durante importación: $_" -ForegroundColor Red
  Write-Host "`n🔄 RESTAURANDO DESDE BACKUP..." -ForegroundColor Yellow
  
  Copy-Item -Path $backupFile -Destination $DbPath -Force
  Write-Host "✓ Base de datos restaurada desde: $(Split-Path $backupFile -Leaf)" -ForegroundColor Green
  
  exit 1
}

# ==================== VERIFICACION POST-IMPORTACION ====================
Write-Host "`n[PASO 4/5] Verificando resultados..." -ForegroundColor Yellow

try {
  $countAfter = & sqlite3 $DbPath "SELECT COUNT(*) FROM [$Table];"
  Write-Host "✓ Tabla '$Table' ahora contiene: $countAfter registros" -ForegroundColor Green
  
  $minDate = & sqlite3 $DbPath "SELECT MIN($DateColumn) FROM [$Table];"
  $maxDate = & sqlite3 $DbPath "SELECT MAX($DateColumn) FROM [$Table];"
  Write-Host "   Rango de fechas: $minDate a $maxDate" -ForegroundColor Cyan
} catch {
  Write-Host "⚠️  No se pudo verificar tabla: $_" -ForegroundColor Yellow
}

# ==================== LOGGING ====================
Write-Host "`n[PASO 5/5] Registrando operación..." -ForegroundColor Yellow

$logFile = "C:\analisis-produccion-stc\import_log.txt"
$logEntry = @"
$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | EXITOSO | Tabla: $Table | XLSX: $(Split-Path $XlsxPath -Leaf) | Backup: $(Split-Path $backupFile -Leaf)
"@

Add-Content -Path $logFile -Value $logEntry
Write-Host "✓ Operación registrada en: $logFile" -ForegroundColor Green

# ==================== RESUMEN FINAL ====================
Write-Host "`n" + ("="*80) -ForegroundColor Green
Write-Host "  ✓ IMPORTACION SEGURA COMPLETADA" -ForegroundColor Green
Write-Host ("="*80) -ForegroundColor Green

Write-Host "`n📋 RESUMEN DE OPERACION:" -ForegroundColor Cyan
Write-Host "   Tabla importada: $Table" -ForegroundColor Gray
Write-Host "   Archivo origen: $(Split-Path $XlsxPath -Leaf)" -ForegroundColor Gray
Write-Host "   Backup realizado: $(Split-Path $backupFile -Leaf)" -ForegroundColor Gray
Write-Host "   Registros finales: $countAfter" -ForegroundColor Gray
Write-Host "   Rango de datos: $minDate a $maxDate" -ForegroundColor Gray

Write-Host "`n💾 RECUPERACION (si es necesario):" -ForegroundColor Yellow
Write-Host "   Si algo salió mal, restaurar con:" -ForegroundColor Cyan
Write-Host "   Copy-Item '$backupFile' 'C:\analisis-produccion-stc\database\produccion.db' -Force" -ForegroundColor Gray

Write-Host "`n"
