# =============================================================================
# Re-importar tb_PRODUCCION usando .import mode de SQLite
# Más rápido y confiable que INSERT statements individuales
# =============================================================================

param(
    [string]$ExportsPath = "C:\analisis-stock-stc\exports",
    [string]$DbPath = ".\database\produccion.db"
)

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Re-importación RÁPIDA tb_PRODUCCION" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Crear archivo temporal consolidado
$tempCsv = [System.IO.Path]::GetTempFileName() + ".csv"

Write-Host "🔄 Consolidando archivos CSV de FILIAL 5..." -ForegroundColor Yellow

$csvFiles = Get-ChildItem -Path $ExportsPath -Filter "tb_PRODUCCION_*.csv" | Sort-Object Name

# Obtener headers del primer archivo
$firstFile = Import-Csv -Path $csvFiles[0].FullName -Delimiter "," -Encoding UTF8 | Select-Object -First 1
$headers = $firstFile.PSObject.Properties.Name

Write-Host "   Columnas: $($headers.Count)" -ForegroundColor Gray

# Escribir headers al archivo temporal
$headers -join "," | Out-File -FilePath $tempCsv -Encoding UTF8

$totalRows = 0

foreach ($csvFile in $csvFiles) {
    Write-Host "   Procesando: $($csvFile.Name)..." -ForegroundColor Gray
    
    $data = Import-Csv -Path $csvFile.FullName -Delimiter "," -Encoding UTF8
    $filtered = $data | Where-Object { $_.FILIAL -eq "5" -or $_.FILIAL -eq "05" }
    
    if ($filtered.Count -gt 0) {
        # Exportar las filas filtradas al CSV temporal
        $filtered | Export-Csv -Path $tempCsv -Append -NoTypeInformation -Encoding UTF8 -Delimiter ","
        $totalRows += $filtered.Count
        Write-Host "      ✓ $($filtered.Count) registros" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ CSV consolidado creado: $totalRows registros" -ForegroundColor Green
Write-Host "   Archivo: $tempCsv" -ForegroundColor Gray
Write-Host ""

$response = Read-Host "¿Continuar con la importación a SQLite? (s/n)"
if ($response -ne "s") {
    Remove-Item $tempCsv -Force
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🗑️  Limpiando tabla tb_PRODUCCION..." -ForegroundColor Yellow
sqlite3.exe $DbPath "DELETE FROM tb_PRODUCCION;"
Write-Host "✓ Tabla limpiada" -ForegroundColor Green
Write-Host ""

Write-Host "📥 Importando datos..." -ForegroundColor Cyan

# Crear script SQL para importación
$importSql = @"
.mode csv
.import --skip 1 '$tempCsv' tb_PRODUCCION
"@

$sqlFile = [System.IO.Path]::GetTempFileName() + ".sql"
$importSql | Out-File -FilePath $sqlFile -Encoding UTF8

# Ejecutar importación
try {
    sqlite3.exe $DbPath ".read $sqlFile" 2>&1 | Write-Host
    Write-Host "✓ Importación completada" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en importación: $_" -ForegroundColor Red
} finally {
    Remove-Item $sqlFile -Force -ErrorAction SilentlyContinue
    Remove-Item $tempCsv -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "🔍 Verificando datos importados..." -ForegroundColor Yellow

$verifyQuery = @"
SELECT 
    COUNT(*) as Total,
    COUNT(PONTOS_LIDOS) as ConPontosLidos,
    COUNT(*) - COUNT(PONTOS_LIDOS) as SinPontosLidos
FROM tb_PRODUCCION
WHERE SELETOR = 'TECELAGEM'
"@

Write-Host ""
sqlite3.exe $DbPath -header -column $verifyQuery

Write-Host ""
Write-Host "📋 Muestra partida 1541315:" -ForegroundColor Yellow

$partidaQuery = @"
SELECT 
    DT_BASE_PRODUCAO as Fecha,
    TURNO,
    PONTOS_LIDOS,
    "PONTOS_100%" as Pontos100,
    "PARADA TEC TRAMA" as ParadaTrama,
    "PARADA TEC URDUME" as ParadaUrdume
FROM tb_PRODUCCION
WHERE PARTIDA = '1541315'
  AND SELETOR = 'TECELAGEM'
LIMIT 5
"@

sqlite3.exe $DbPath -header -column $partidaQuery

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Listo! Reinicia el servidor API" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
