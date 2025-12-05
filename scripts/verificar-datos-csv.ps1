# =============================================================================
# Script de Verificación de Integridad de Datos CSV
# Detecta columnas con valores NULL/vacíos en archivos CSV exportados
# =============================================================================

param(
    [string]$ExportsPath = "C:\analisis-stock-stc\exports",
    [string]$Partida = "1541315"
)

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Verificador de Integridad CSV - tb_PRODUCCION" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si existe el directorio
if (-not (Test-Path $ExportsPath)) {
    Write-Host "❌ ERROR: No se encuentra el directorio: $ExportsPath" -ForegroundColor Red
    exit 1
}

# Buscar todos los archivos tb_PRODUCCION
$csvFiles = Get-ChildItem -Path $ExportsPath -Filter "tb_PRODUCCION_*.csv" | Sort-Object Name

if ($csvFiles.Count -eq 0) {
    Write-Host "❌ ERROR: No se encontraron archivos tb_PRODUCCION_*.csv en $ExportsPath" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Directorio: $ExportsPath" -ForegroundColor White
Write-Host "📊 Archivos encontrados: $($csvFiles.Count)" -ForegroundColor White
Write-Host ""

# Procesar todos los archivos
$allData = @()
foreach ($file in $csvFiles) {
    Write-Host "  📄 Cargando $($file.Name)..." -ForegroundColor Gray
    try {
        $data = Import-Csv -Path $file.FullName -Delimiter ","
        $allData += $data
    } catch {
        Write-Host "    ⚠️  Error al cargar: $_" -ForegroundColor Yellow
    }
}

if ($allData.Count -eq 0) {
    Write-Host "❌ ERROR: No se pudieron cargar datos de ningún archivo" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Datos cargados correctamente" -ForegroundColor Green
Write-Host "  Total de registros: $($allData.Count)" -ForegroundColor Gray
Write-Host ""

$data = $allData

# Obtener nombres de columnas
$columns = $data[0].PSObject.Properties.Name

Write-Host "📊 Columnas encontradas: $($columns.Count)" -ForegroundColor White
Write-Host ""

# Columnas críticas para verificar
$criticalColumns = @(
    "PONTOS_LIDOS",
    "PONTOS_100%",
    "PARADA TEC TRAMA",
    "PARADA TEC URDUME",
    "MAQUINA",
    "PARTIDA",
    "SELETOR"
)

# Análisis general de columnas vacías
Write-Host "🔍 ANÁLISIS GENERAL - Registros con valores vacíos:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

$emptyStats = @{}
foreach ($col in $columns) {
    $emptyCount = ($data | Where-Object { 
        $null -eq $_.$col -or 
        $_.$col -eq "" -or 
        $_.$col -eq "NULL"
    }).Count
    
    if ($emptyCount -gt 0) {
        $percentage = [math]::Round(($emptyCount / $data.Count) * 100, 2)
        $emptyStats[$col] = @{
            Count = $emptyCount
            Percentage = $percentage
        }
    }
}

if ($emptyStats.Count -eq 0) {
    Write-Host "  ✓ No se encontraron columnas con valores vacíos" -ForegroundColor Green
} else {
    $emptyStats.GetEnumerator() | Sort-Object {$_.Value.Count} -Descending | ForEach-Object {
        $col = $_.Key
        $count = $_.Value.Count
        $pct = $_.Value.Percentage
        
        if ($criticalColumns -contains $col) {
            Write-Host "  ⚠️  $col : $count vacíos ($pct%)" -ForegroundColor Red
        } else {
            Write-Host "     $col : $count vacíos ($pct%)" -ForegroundColor Gray
        }
    }
}

Write-Host ""

# Filtrar solo registros de TECELAGEM
$tecelagem = $data | Where-Object { $_.SELETOR -eq "TECELAGEM" }
Write-Host "🏭 REGISTROS DE TECELAGEM: $($tecelagem.Count)" -ForegroundColor Cyan
Write-Host ""

# Análisis específico para columnas críticas
Write-Host "🎯 ANÁLISIS DE COLUMNAS CRÍTICAS (solo TECELAGEM):" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray

foreach ($col in $criticalColumns) {
    $emptyCount = ($tecelagem | Where-Object { 
        $null -eq $_.$col -or 
        $_.$col -eq "" -or 
        $_.$col -eq "NULL"
    }).Count
    
    $percentage = if ($tecelagem.Count -gt 0) { 
        [math]::Round(($emptyCount / $tecelagem.Count) * 100, 2) 
    } else { 
        0 
    }
    
    $status = if ($emptyCount -eq 0) { "✓" } else { "⚠️" }
    $color = if ($emptyCount -eq 0) { "Green" } else { "Red" }
    
    Write-Host "  $status $col : $emptyCount vacíos ($percentage%)" -ForegroundColor $color
}

Write-Host ""

# Análisis específico de la partida solicitada
if ($Partida) {
    Write-Host "🔎 ANÁLISIS DETALLADO - Partida: $Partida" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────" -ForegroundColor Gray
    
    $partidaData = $data | Where-Object { $_.PARTIDA -eq $Partida }
    
    if ($partidaData.Count -eq 0) {
        Write-Host "  ❌ No se encontraron registros para la partida $Partida" -ForegroundColor Red
    } else {
        Write-Host "  Registros encontrados: $($partidaData.Count)" -ForegroundColor White
        Write-Host ""
        
        foreach ($record in $partidaData) {
            Write-Host "  📅 Fecha: $($record.DT_BASE_PRODUCAO) | Turno: $($record.TURNO) | Máquina: $($record.MAQUINA)" -ForegroundColor Cyan
            
            foreach ($col in $criticalColumns) {
                $value = $record.$col
                if ($null -eq $value -or $value -eq "" -or $value -eq "NULL") {
                    Write-Host "    ⚠️  $col : VACÍO" -ForegroundColor Red
                } else {
                    Write-Host "    ✓  $col : $value" -ForegroundColor Green
                }
            }
            Write-Host ""
        }
    }
}

# Resumen final
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$tecelagemEmpty = ($tecelagem | Where-Object { 
    $null -eq $_.PONTOS_LIDOS -or 
    $_.PONTOS_LIDOS -eq "" -or 
    $_.PONTOS_LIDOS -eq "NULL"
}).Count

if ($tecelagemEmpty -eq 0) {
    Write-Host "✅ Todos los registros de TECELAGEM tienen PONTOS_LIDOS" -ForegroundColor Green
} else {
    Write-Host "⚠️  HAY $tecelagemEmpty REGISTROS SIN PONTOS_LIDOS" -ForegroundColor Red
    Write-Host "   ACCIÓN REQUERIDA: Re-exportar desde Access" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Para re-exportar desde Access, ejecuta:" -ForegroundColor Gray
Write-Host "  1. Abre Access con la base de datos STC" -ForegroundColor Gray
Write-Host "  2. Presiona Alt+F11 para abrir el editor VBA" -ForegroundColor Gray
Write-Host "  3. Inserta el código de ExportarProduccionCompleto.vba" -ForegroundColor Gray
Write-Host "  4. Ejecuta: ExportarProduccionCompleto" -ForegroundColor Gray
Write-Host ""
