# =====================================================================
# VALIDACION DE SEGURIDAD PRE-IMPORTACIÓN
# =====================================================================
# Verifica que la importación sea segura ANTES de ejecutar
# Impide pérdida de datos históricos por importaciones mal configuradas
#
# Uso:
#   .\validate-import-safety.ps1 -XlsxPath "C:\STC\rptAcompDiarioPBI.xlsx" -Sheet "report5" -DateColumn "DAT_PROD" -Table "tb_CALIDAD"
# =====================================================================

param(
  [Parameter(Mandatory=$true)][string]$XlsxPath,
  [Parameter(Mandatory=$true)][string]$Sheet,
  [Parameter(Mandatory=$true)][string]$DateColumn,
  [Parameter(Mandatory=$true)][string]$Table,
  [Parameter(Mandatory=$false)][string]$DbPath = "C:\analisis-produccion-stc\database\produccion.db"
)

$ErrorActionPreference = "Stop"

Write-Host "`n" + ("="*70) -ForegroundColor Yellow
Write-Host "  VALIDACION DE SEGURIDAD PRE-IMPORTACION" -ForegroundColor Yellow
Write-Host ("="*70) -ForegroundColor Yellow

# ==================== PASO 1: Validar archivo XLSX ====================
Write-Host "`n[1/6] Validando archivo XLSX..." -ForegroundColor Cyan

if (-not (Test-Path $XlsxPath)) {
  Write-Host "❌ ERROR: Archivo no encontrado: $XlsxPath" -ForegroundColor Red
  exit 1
}

$fileSize = (Get-Item $XlsxPath).Length / 1MB
Write-Host "✓ Archivo encontrado: $XlsxPath ($([Math]::Round($fileSize, 2)) MB)" -ForegroundColor Green

# ==================== PASO 2: Leer datos del XLSX ====================
Write-Host "`n[2/6] Leyendo XLSX: $Sheet..." -ForegroundColor Cyan

Import-Module ImportExcel -ErrorAction SilentlyContinue
try {
  $data = Import-Excel -Path $XlsxPath -WorksheetName $Sheet -NoHeader -StartRow 2 -ErrorAction Stop
  Write-Host "✓ XLSX cargado correctamente: $($data.Count) filas" -ForegroundColor Green
} catch {
  Write-Host "❌ ERROR al leer XLSX: $_" -ForegroundColor Red
  exit 1
}

# ==================== PASO 3: Validar columna de fecha ====================
Write-Host "`n[3/6] Validando columna de fecha: $DateColumn..." -ForegroundColor Cyan

# Detectar numero de columna (P1, P2, etc.)
$headerRow = Import-Excel -Path $XlsxPath -WorksheetName $Sheet -NoHeader -StartRow 1 -EndRow 1
$colIndex = -1
$i = 0
foreach ($prop in $headerRow.PSObject.Properties) {
  if ($prop.Value -eq $DateColumn) {
    $colIndex = $i
    break
  }
  $i++
}

if ($colIndex -eq -1) {
  Write-Host "❌ ERROR: Columna '$DateColumn' no encontrada en XLSX" -ForegroundColor Red
  Write-Host "   Columnas disponibles: $($headerRow.PSObject.Properties.Name -join ', ')" -ForegroundColor Yellow
  exit 1
}

$colName = "P$($colIndex + 1)"
Write-Host "✓ Columna '$DateColumn' encontrada en posición $($colIndex + 1) ($colName)" -ForegroundColor Green

# ==================== PASO 4: Extraer fechas unicas ====================
Write-Host "`n[4/6] Extrayendo fechas únicas del XLSX..." -ForegroundColor Cyan

$fechas = $data | 
  Select-Object -ExpandProperty $colName | 
  Where-Object {$_ -ne $null -and $_ -ne $DateColumn -and $_ -is [double]} | 
  ForEach-Object {
    try {
      [datetime]::FromOADate($_).ToString('yyyy-MM-dd')
    } catch {
      $null
    }
  } | 
  Sort-Object -Unique | 
  Where-Object {$_ -ne $null}

if ($fechas.Count -eq 0) {
  Write-Host "❌ ERROR: No se encontraron fechas válidas en columna $DateColumn" -ForegroundColor Red
  exit 1
}

$fechaMin = $fechas | Select-Object -First 1
$fechaMax = $fechas | Select-Object -Last 1
Write-Host "✓ Fechas detectadas:" -ForegroundColor Green
Write-Host "   Mínima: $fechaMin" -ForegroundColor Cyan
Write-Host "   Máxima: $fechaMax" -ForegroundColor Cyan
Write-Host "   Distintas: $($fechas.Count)" -ForegroundColor Cyan

# ==================== PASO 5: Validar rango de fechas ====================
Write-Host "`n[5/6] Validando rango de fechas (MÁXIMO 30 días)..." -ForegroundColor Cyan

$diaMin = [datetime]::Parse($fechaMin)
$diaMax = [datetime]::Parse($fechaMax)
$diasDiferencia = ($diaMax - $diaMin).Days

if ($diasDiferencia -gt 30) {
  Write-Host "⚠️  ADVERTENCIA: El XLSX contiene $diasDiferencia días de datos" -ForegroundColor Yellow
  Write-Host "   Esto es inusual. Verificar que sea intencional." -ForegroundColor Yellow
  Write-Host "   Si esto borra datos históricos, se perderá información de años." -ForegroundColor Red
  
  $confirm = Read-Host "   ¿Continuar? (escribir 'CONFIRMO' para proceder)"
  if ($confirm -ne "CONFIRMO") {
    Write-Host "❌ Importación cancelada por el usuario" -ForegroundColor Red
    exit 1
  }
}

Write-Host "✓ Rango de fechas validado: $diasDiferencia días" -ForegroundColor Green

# ==================== PASO 6: Validar DB y registros existentes ====================
Write-Host "`n[6/6] Validando base de datos actual..." -ForegroundColor Cyan

if (-not (Test-Path $DbPath)) {
  Write-Host "❌ ERROR: Base de datos no encontrada: $DbPath" -ForegroundColor Red
  exit 1
}

$dbSize = (Get-Item $DbPath).Length / 1MB
Write-Host "✓ Base de datos encontrada: $([Math]::Round($dbSize, 2)) MB" -ForegroundColor Green

try {
  $countBefore = & sqlite3 $DbPath "SELECT COUNT(*) FROM [$Table];"
  Write-Host "✓ Tabla '$Table' contiene: $countBefore registros" -ForegroundColor Green
  
  $minDate = & sqlite3 $DbPath "SELECT MIN($DateColumn) FROM [$Table];"
  $maxDate = & sqlite3 $DbPath "SELECT MAX($DateColumn) FROM [$Table];"
  Write-Host "   Rango actual DB: $minDate a $maxDate" -ForegroundColor Cyan
} catch {
  Write-Host "⚠️  No se pudo leer la tabla (¿primera importación?)" -ForegroundColor Yellow
}

# ==================== RESUMEN FINAL ====================
Write-Host "`n" + ("="*70) -ForegroundColor Green
Write-Host "  ✓ VALIDACION COMPLETADA - IMPORTACION SEGURA" -ForegroundColor Green
Write-Host ("="*70) -ForegroundColor Green

Write-Host "`n📊 RESUMEN:" -ForegroundColor Cyan
Write-Host "   Tabla: $Table" -ForegroundColor Gray
Write-Host "   XLSX: $([IO.Path]::GetFileName($XlsxPath))" -ForegroundColor Gray
Write-Host "   Fechas a actualizar: $fechaMin a $fechaMax ($($fechas.Count) días)" -ForegroundColor Gray
Write-Host "   Registros a insertar: $($data.Count)" -ForegroundColor Gray
Write-Host "   Registros DB actuales: $countBefore" -ForegroundColor Gray

Write-Host "`n⚠️  PRÓXIMO PASO:" -ForegroundColor Yellow
Write-Host "   Ejecutar importación con:" -ForegroundColor Cyan
Write-Host "   .\import-xlsx-to-sqlite.ps1 -XlsxPath '$XlsxPath' -Sheet '$Sheet' -Table '$Table' -DateColumn '$DateColumn'" -ForegroundColor Gray

Write-Host "`n"
