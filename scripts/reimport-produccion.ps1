# =============================================================================
# Re-importar tb_PRODUCCION desde CSV con todas las columnas
# =============================================================================

param(
    [string]$ExportsPath = "C:\analisis-stock-stc\exports",
    [string]$DbPath = ".\database\produccion.db"
)

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Re-importación tb_PRODUCCION" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el directorio de exports
if (-not (Test-Path $ExportsPath)) {
    Write-Host "❌ ERROR: No se encuentra el directorio: $ExportsPath" -ForegroundColor Red
    exit 1
}

# Buscar archivos CSV de producción
$csvFiles = Get-ChildItem -Path $ExportsPath -Filter "tb_PRODUCCION_*.csv" | Sort-Object Name

if ($csvFiles.Count -eq 0) {
    Write-Host "❌ ERROR: No se encontraron archivos tb_PRODUCCION_*.csv" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Archivos encontrados: $($csvFiles.Count)" -ForegroundColor Green
$csvFiles | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Gray }
Write-Host ""

# Tomar una muestra del primer archivo para verificar columnas
$sampleFile = $csvFiles[0]
Write-Host "🔍 Verificando estructura del archivo: $($sampleFile.Name)" -ForegroundColor Yellow

$sampleData = Import-Csv -Path $sampleFile.FullName -Delimiter "," -Encoding UTF8
$columns = $sampleData[0].PSObject.Properties.Name

Write-Host "   Columnas encontradas: $($columns.Count)" -ForegroundColor White
Write-Host ""

# Verificar columnas críticas
$criticalColumns = @("PONTOS_LIDOS", "PONTOS_100%", "PARADA TEC TRAMA", "PARADA TEC URDUME")
$missingColumns = @()

foreach ($col in $criticalColumns) {
    if ($columns -contains $col) {
        Write-Host "   ✓ $col" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $col - NO ENCONTRADA" -ForegroundColor Red
        $missingColumns += $col
    }
}

if ($missingColumns.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  ADVERTENCIA: Faltan columnas críticas en el CSV" -ForegroundColor Red
    Write-Host "   Necesitas re-exportar desde Access usando ExportarProduccionCompleto.vba" -ForegroundColor Yellow
    Write-Host ""
    
    $response = Read-Host "¿Deseas continuar de todos modos? (s/n)"
    if ($response -ne "s") {
        exit 0
    }
}

Write-Host ""

# Verificar datos en una muestra
Write-Host "📊 Muestra de datos (primeros 3 registros TECELAGEM):" -ForegroundColor Yellow
$tecelagemSample = $sampleData | Where-Object { $_.SELETOR -eq "TECELAGEM" } | Select-Object -First 3

foreach ($record in $tecelagemSample) {
    Write-Host "   Partida: $($record.PARTIDA) | Máquina: $($record.MAQUINA)" -ForegroundColor Cyan
    Write-Host "   PONTOS_LIDOS: $($record.PONTOS_LIDOS)" -ForegroundColor $(if ($record.PONTOS_LIDOS) { "Green" } else { "Red" })
    Write-Host "   PONTOS_100%: $($record.'PONTOS_100%')" -ForegroundColor $(if ($record.'PONTOS_100%') { "Green" } else { "Red" })
    Write-Host ""
}

Write-Host ""
$response = Read-Host "¿Proceder con la re-importación? Esto ELIMINARÁ los datos actuales de tb_PRODUCCION (s/n)"
if ($response -ne "s") {
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🗑️  Eliminando datos actuales de tb_PRODUCCION..." -ForegroundColor Yellow

$deleteQuery = "DELETE FROM tb_PRODUCCION;"
sqlite3.exe $DbPath $deleteQuery

Write-Host "✓ Datos eliminados" -ForegroundColor Green
Write-Host ""

# Re-importar todos los archivos
$totalRecords = 0
$fileCount = 0

foreach ($csvFile in $csvFiles) {
    $fileCount++
    Write-Host "[$fileCount/$($csvFiles.Count)] Importando: $($csvFile.Name)..." -ForegroundColor Cyan
    
    try {
        # Importar CSV
        $data = Import-Csv -Path $csvFile.FullName -Delimiter "," -Encoding UTF8
        
        # Filtrar solo FILIAL = 5 o 05 (puede venir con cero adelante)
        $filtered = $data | Where-Object { $_.FILIAL -eq "5" -or $_.FILIAL -eq "05" }
        
        if ($filtered.Count -eq 0) {
            Write-Host "   ⚠️  Sin registros para FILIAL=5, omitiendo..." -ForegroundColor Yellow
            continue
        }
        
        Write-Host "   Registros a importar: $($filtered.Count)" -ForegroundColor Gray
        
        # Crear archivo temporal SQL
        $tempSql = [System.IO.Path]::GetTempFileName() + ".sql"
        
        # Generar INSERT statements
        $insertStatements = @()
        
        foreach ($record in $filtered) {
            # Escapar valores y manejar NULL
            $values = @()
            foreach ($col in $columns) {
                $value = $record.$col
                if ($null -eq $value -or $value -eq "") {
                    $values += "NULL"
                } else {
                    # Escapar comillas simples
                    $escaped = $value -replace "'", "''"
                    $values += "'$escaped'"
                }
            }
            
            $insertStatements += "INSERT INTO tb_PRODUCCION VALUES ($($values -join ','));"
        }
        
        # Escribir al archivo temporal
        $insertStatements | Out-File -FilePath $tempSql -Encoding UTF8
        
        # Ejecutar importación
        sqlite3.exe $DbPath ".read $tempSql" 2>&1 | Out-Null
        
        # Eliminar archivo temporal
        Remove-Item $tempSql -Force
        
        $totalRecords += $filtered.Count
        Write-Host "   ✓ Importado exitosamente" -ForegroundColor Green
        
    } catch {
        Write-Host "   ❌ Error: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  IMPORTACIÓN COMPLETADA" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Total de registros importados: $totalRecords" -ForegroundColor Green
Write-Host ""

# Verificar que PONTOS_LIDOS ahora tiene datos
Write-Host "🔍 Verificando PONTOS_LIDOS..." -ForegroundColor Yellow

$verifyQuery = @"
SELECT 
    COUNT(*) as Total,
    COUNT(PONTOS_LIDOS) as ConDatos,
    COUNT(*) - COUNT(PONTOS_LIDOS) as SinDatos
FROM tb_PRODUCCION
WHERE SELETOR = 'TECELAGEM'
"@

$result = sqlite3.exe $DbPath -header -column $verifyQuery
Write-Host $result
Write-Host ""

# Verificar partida 1541315
Write-Host "🔎 Verificando partida 1541315..." -ForegroundColor Yellow

$partidaQuery = @"
SELECT 
    DT_BASE_PRODUCAO,
    TURNO,
    PONTOS_LIDOS,
    "PONTOS_100%"
FROM tb_PRODUCCION
WHERE PARTIDA = '1541315'
  AND SELETOR = 'TECELAGEM'
LIMIT 5
"@

sqlite3.exe $DbPath -header -column $partidaQuery

Write-Host ""
Write-Host "✓ Listo. Reinicia el servidor API para ver los cambios." -ForegroundColor Green
