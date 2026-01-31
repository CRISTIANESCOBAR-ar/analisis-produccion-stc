# =====================================================================
# Script para Sincronizar TODAS las Tablas con sus CSVs
# =====================================================================
# Este script detecta las columnas faltantes en todas las tablas
# y opcionalmente las agrega automaticamente
# =====================================================================

param(
    [string]$CsvFolder = "C:\STC\CSV",
    [switch]$AutoAdd,
    [switch]$Reimport
)

$ErrorActionPreference = 'Stop'

$SqlitePath = "$PSScriptRoot\..\database\produccion.db"

# Configuracion de tablas
$tables = @(
    @{ Table = 'tb_FICHAS'; CsvFile = 'fichaArtigo.csv' },
    @{ Table = 'tb_RESIDUOS_INDIGO'; CsvFile = 'RelResIndigo.csv' },
    @{ Table = 'tb_RESIDUOS_POR_SECTOR'; CsvFile = 'rptResiduosPorSetor.csv' },
    @{ Table = 'tb_TESTES'; CsvFile = 'rptPrdTestesFisicos.csv' },
    @{ Table = 'tb_PARADAS'; CsvFile = 'rptParadaMaquinaPRD.csv' },
    @{ Table = 'tb_PRODUCCION'; CsvFile = 'rptProducaoMaquina.csv' },
    @{ Table = 'tb_CALIDAD'; CsvFile = 'rptAcompDiarioPBI.csv' },
    @{ Table = 'tb_PROCESO'; CsvFile = 'rpsPosicaoEstoquePRD.csv' },
    @{ Table = 'tb_DEFECTOS'; CsvFile = 'rptDefPeca.csv' },
    @{ Table = 'tb_CALIDAD_FIBRA'; CsvFile = 'rptMovimMP.csv' }
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Sincronizacion Masiva de Columnas" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Carpeta CSV: $CsvFolder" -ForegroundColor Gray
Write-Host "Base de datos: $SqlitePath" -ForegroundColor Gray
Write-Host "Modo: $(if ($AutoAdd) { 'APLICAR CAMBIOS' } else { 'SOLO VISTA PREVIA' })" -ForegroundColor $(if ($AutoAdd) { 'Green' } else { 'Yellow' })
Write-Host ""

$totalColumnsAdded = 0
$tablesModified = 0

foreach ($config in $tables) {
    $csvPath = Join-Path $CsvFolder $config.CsvFile
    
    Write-Host "Procesando: $($config.Table)..." -ForegroundColor Cyan
    
    if (-not (Test-Path $csvPath)) {
        Write-Warning "  Archivo CSV no encontrado: $csvPath"
        Write-Host ""
        continue
    }
    
    # Ejecutar sincronizacion
    $params = @{
        CsvPath = $csvPath
        SqlitePath = $SqlitePath
        TableName = $config.Table
    }
    
    if ($AutoAdd) { $params['AutoAdd'] = $true }
    if ($Reimport) { $params['Reimport'] = $true }
    
    try {
        $output = & "$PSScriptRoot\sync-table-columns.ps1" @params 2>&1
        
        # Contar columnas agregadas
        $addedCount = ($output | Select-String "Columna agregada correctamente").Count
        if ($addedCount -gt 0) {
            $totalColumnsAdded += $addedCount
            $tablesModified++
        }
        
        # Mostrar output relevante
        $output | Where-Object { $_ -match "EXTRA|FALTANTES|agregada|coinciden" } | ForEach-Object {
            Write-Host "  $_"
        }
    }
    catch {
        Write-Warning "  Error al sincronizar $($config.Table): $_"
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "RESUMEN FINAL" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Tablas procesadas: $($tables.Count)" -ForegroundColor White
Write-Host "Tablas modificadas: $tablesModified" -ForegroundColor $(if ($tablesModified -gt 0) { 'Yellow' } else { 'Green' })
Write-Host "Columnas agregadas: $totalColumnsAdded" -ForegroundColor $(if ($totalColumnsAdded -gt 0) { 'Yellow' } else { 'Green' })
Write-Host ""

if (-not $AutoAdd -and $totalColumnsAdded -gt 0) {
    Write-Host "NOTA: Esta fue una vista previa. Para aplicar cambios:" -ForegroundColor Yellow
    Write-Host "  .\sync-all-tables.ps1 -CsvFolder '$CsvFolder' -AutoAdd" -ForegroundColor White
    Write-Host ""
    Write-Host "Para aplicar Y re-importar datos:" -ForegroundColor Yellow
    Write-Host "  .\sync-all-tables.ps1 -CsvFolder '$CsvFolder' -AutoAdd -Reimport" -ForegroundColor White
}
