# =====================================================================
# Script para Sincronizar Columnas de CSV a Tabla SQLite
# =====================================================================
# Uso:
#   .\sync-table-columns.ps1 -CsvPath "C:\STC\CSV\rptAcompDiarioPBI.csv" `
#                            -SqlitePath "database\produccion.db" `
#                            -TableName "tb_CALIDAD" `
#                            -AutoAdd
# =====================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$CsvPath,
    
    [Parameter(Mandatory=$true)]
    [string]$SqlitePath,
    
    [Parameter(Mandatory=$true)]
    [string]$TableName,
    
    [switch]$AutoAdd,
    [switch]$DryRun,
    [switch]$Reimport
)

$ErrorActionPreference = 'Stop'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Sincronizacion de Columnas CSV -> SQLite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar archivos
if (-not (Test-Path $CsvPath)) {
    Write-Error "Archivo CSV no encontrado: $CsvPath"
    exit 1
}

if (-not (Test-Path $SqlitePath)) {
    Write-Error "Base de datos SQLite no encontrada: $SqlitePath"
    exit 1
}

# 2. Detectar si es CSV delimitado por tabulaciones o comas
$firstLine = Get-Content -Path $CsvPath -TotalCount 1
$isTab = $firstLine -match "`t"
$delimiter = if ($isTab) { "`t" } else { "," }
Write-Host "Delimitador detectado: $(if ($isTab) { 'TAB' } else { 'COMA' })" -ForegroundColor Gray
Write-Host ""

# 3. Obtener columnas del CSV
Write-Host "[1/5] Leyendo columnas del CSV..." -ForegroundColor Cyan
$csvColumns = if ($isTab) {
    $firstLine -split "`t" | ForEach-Object { $_.Trim() }
} else {
    $firstLine -split "," | ForEach-Object { $_.Trim().Trim('"') }
}
$csvColumns = $csvColumns | Where-Object { $_.Trim() -ne '' }
Write-Host "  -> Encontradas $($csvColumns.Count) columnas en el CSV" -ForegroundColor Green
Write-Host ""

# 4. Obtener columnas de SQLite
Write-Host "[2/5] Leyendo estructura de la tabla $TableName..." -ForegroundColor Cyan
$sqliteColumnsRaw = & sqlite3 $SqlitePath "PRAGMA table_info($TableName);"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error al leer estructura de la tabla $TableName"
    exit 1
}

$sqliteColumns = $sqliteColumnsRaw | ForEach-Object {
    # PRAGMA table_info devuelve: cid|name|type|notnull|dflt_value|pk
    ($_ -split '\|')[1]
}
Write-Host "  -> Encontradas $($sqliteColumns.Count) columnas en la tabla SQLite" -ForegroundColor Green
Write-Host ""

# 5. Comparar columnas
Write-Host "[3/5] Comparando columnas..." -ForegroundColor Cyan
$extraColumns = $csvColumns | Where-Object { $_ -notin $sqliteColumns }
$missingColumns = $sqliteColumns | Where-Object { $_ -notin $csvColumns }

if ($extraColumns.Count -eq 0 -and $missingColumns.Count -eq 0) {
    Write-Host "  -> Las columnas coinciden perfectamente. No se requiere sincronizacion." -ForegroundColor Green
    exit 0
}

# Mostrar diferencias
if ($extraColumns.Count -gt 0) {
    Write-Host "  COLUMNAS EXTRA en CSV (no estan en SQLite):" -ForegroundColor Yellow
    $extraColumns | ForEach-Object { Write-Host "    + $_" -ForegroundColor Yellow }
}

if ($missingColumns.Count -gt 0) {
    Write-Host "  COLUMNAS FALTANTES en CSV (estan en SQLite pero no en CSV):" -ForegroundColor Magenta
    $missingColumns | ForEach-Object { Write-Host "    - $_" -ForegroundColor Magenta }
}
Write-Host ""

# 6. Generar comandos ALTER TABLE
if ($extraColumns.Count -gt 0) {
    Write-Host "[4/5] Generando comandos SQL para agregar columnas..." -ForegroundColor Cyan
    
    $alterCommands = @()
    foreach ($col in $extraColumns) {
        # Escapar comillas simples en nombres de columnas
        $safeColName = $col.Replace("'", "''")
        # Por defecto, todas las columnas nuevas son TEXT y NULL
        $alterCmd = "ALTER TABLE $TableName ADD COLUMN '$safeColName' TEXT;"
        $alterCommands += $alterCmd
        Write-Host "  SQL: $alterCmd" -ForegroundColor Gray
    }
    Write-Host ""
    
    # 7. Aplicar cambios (si no es DryRun)
    if ($DryRun) {
        Write-Host "[DRY RUN] No se aplicaran cambios. Use -AutoAdd para aplicar." -ForegroundColor Yellow
    }
    elseif ($AutoAdd) {
        Write-Host "[5/5] Aplicando cambios a la base de datos..." -ForegroundColor Cyan
        
        foreach ($cmd in $alterCommands) {
            try {
                $cmd | & sqlite3 $SqlitePath
                Write-Host "  -> Columna agregada correctamente" -ForegroundColor Green
            }
            catch {
                Write-Warning "  -> Error al agregar columna: $_"
            }
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "COMPLETADO: $($alterCommands.Count) columna(s) agregada(s)" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        
        # Opcion de re-importar
        if ($Reimport) {
            Write-Host "Re-importando datos para capturar valores de las nuevas columnas..." -ForegroundColor Cyan
            
            # Detectar script de importacion apropiado
            $importScript = switch ($TableName) {
                'tb_CALIDAD' { "import-calidad-fast.ps1" }
                'tb_PRODUCCION' { "import-produccion-fast.ps1" }
                'tb_PARADAS' { "import-paradas-fast.ps1" }
                'tb_TESTES' { "import-testes-fast.ps1" }
                'tb_FICHAS' { "import-fichas-fast.ps1" }
                'tb_RESIDUOS_INDIGO' { "import-residuos-indig-fast.ps1" }
                'tb_RESIDUOS_POR_SECTOR' { "import-residuos-por-sector-fast.ps1" }
                'tb_PROCESO' { "import-proceso-fast.ps1" }
                'tb_DEFECTOS' { "import-defectos-fast.ps1" }
                'tb_CALIDAD_FIBRA' { "import-calidad-fibra-fast.ps1" }
                default { $null }
            }
            
            if ($importScript -and (Test-Path "$PSScriptRoot\$importScript")) {
                Write-Host "  Ejecutando: $importScript" -ForegroundColor Gray
                & "$PSScriptRoot\$importScript" -XlsxPath $CsvPath -SqlitePath $SqlitePath
                Write-Host "  -> Re-importacion completada" -ForegroundColor Green
            }
            else {
                Write-Warning "  No se encontro script de importacion para $TableName"
                Write-Host "  Ejecute manualmente la importacion para capturar los nuevos datos." -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "NOTA: Las columnas fueron agregadas pero con valores NULL en registros existentes." -ForegroundColor Yellow
            Write-Host "      Use -Reimport para re-importar y capturar valores historicos." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "[PREVIA] Para aplicar estos cambios, ejecute con -AutoAdd" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Comando completo:" -ForegroundColor Cyan
        Write-Host "  .\sync-table-columns.ps1 -CsvPath '$CsvPath' -SqlitePath '$SqlitePath' -TableName '$TableName' -AutoAdd" -ForegroundColor White
        Write-Host ""
        Write-Host "Para aplicar Y re-importar datos:" -ForegroundColor Cyan
        Write-Host "  .\sync-table-columns.ps1 -CsvPath '$CsvPath' -SqlitePath '$SqlitePath' -TableName '$TableName' -AutoAdd -Reimport" -ForegroundColor White
    }
}
else {
    Write-Host "[4/5] No hay columnas EXTRA para agregar." -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Sincronizacion finalizada" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
