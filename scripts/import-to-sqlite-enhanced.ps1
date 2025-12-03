# =====================================================================
# IMPORTACIÓN MEJORADA DE CSV A SQLITE - SOPORTE SEGMENTACIÓN MENSUAL
# =====================================================================
# Detecta múltiples archivos CSV por tabla (tb_PRODUCCION_2021_01.csv)
# Infiere tipos de datos (TEXT, INTEGER, REAL, DATE)
# Crea índices en columnas de fecha para performance
# Importación por lotes con progreso detallado
# =====================================================================

Param(
    [Parameter(Mandatory=$false)]
    [string]$CsvDir = "C:\analisis-stock-stc\exports",
    
    [Parameter(Mandatory=$false)]
    [string]$SqlitePath = "C:\analisis-stock-stc\database\produccion.db",
    
    [Parameter(Mandatory=$false)]
    [switch]$DropExisting = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipIndexes = $false
)

$ErrorActionPreference = 'Stop'

# Verificar sqlite3
if (-not (Get-Command sqlite3 -ErrorAction SilentlyContinue)) {
    throw "❌ sqlite3 no encontrado. Instala con: winget install SQLite.SQLite"
}

# Crear directorio de DB si no existe
$dbDir = Split-Path $SqlitePath
if (-not (Test-Path $dbDir)) {
    New-Item -ItemType Directory -Path $dbDir -Force | Out-Null
}

# Limpiar DB existente si se solicita
if ($DropExisting -and (Test-Path $SqlitePath)) {
    Write-Host "🗑️  Eliminando base de datos existente..." -ForegroundColor Yellow
    Remove-Item $SqlitePath -Force
}

# Mapeo de columnas fecha por tabla para crear índices
$dateColumns = @{
    'tb_PRODUCCION' = @('DT_BASE_PRODUCAO', 'DT_INICIO', 'DT_FINAL')
    'tb_CALIDAD' = @('DAT_PROD')
    'tb_PARADAS' = @('DATA_BASE')
    'tb_RESIDUOS_POR_SECTOR' = @('DT_MOV')
    'tb_TESTES' = @('DT_PROD')
    'tb_RESIDUOS_INDIGO' = @('DT_MOV')
    'tb_FICHAS' = @()
}

Write-Host "`n=== IMPORTACIÓN CSV → SQLite ===" -ForegroundColor Cyan
Write-Host "📁 Origen: $CsvDir" -ForegroundColor Gray
Write-Host "💾 Destino: $SqlitePath" -ForegroundColor Gray
Write-Host ""

# Agrupar archivos CSV por tabla base
$csvFiles = Get-ChildItem -Path $CsvDir -Filter "tb_*.csv"
$tableGroups = @{}

foreach ($file in $csvFiles) {
    # Extraer nombre base: tb_PRODUCCION_2021_01.csv → tb_PRODUCCION
    $baseName = if ($file.Name -match '^(tb_[A-Z_]+?)(_\d{4}_\d{2})?\.csv$') {
        $matches[1]
    } else {
        $file.BaseName
    }
    
    if (-not $tableGroups.ContainsKey($baseName)) {
        $tableGroups[$baseName] = @()
    }
    $tableGroups[$baseName] += $file
}

Write-Host "📊 Tablas detectadas: $($tableGroups.Count)" -ForegroundColor Green
foreach ($table in $tableGroups.Keys | Sort-Object) {
    $count = $tableGroups[$table].Count
    Write-Host "   - $table`: $count archivo(s)" -ForegroundColor Gray
}
Write-Host ""

# Función para inferir tipo de columna
function Get-ColumnType {
    param([string]$value)
    
    if ([string]::IsNullOrWhiteSpace($value)) { return 'TEXT' }
    
    # Intentar parsear como fecha (yyyy-mm-dd hh:mm:ss)
    if ($value -match '^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}:\d{2})?$') {
        return 'TEXT' # SQLite no tiene DATE nativo, usar TEXT con formato ISO
    }
    
    # Intentar parsear como número entero
    if ($value -match '^-?\d+$') { return 'INTEGER' }
    
    # Intentar parsear como decimal
    if ($value -match '^-?\d+\.\d+$') { return 'REAL' }
    
    return 'TEXT'
}

# Procesar cada tabla
$totalTables = $tableGroups.Count
$currentTable = 0

foreach ($tableName in $tableGroups.Keys | Sort-Object) {
    $currentTable++
    $files = $tableGroups[$tableName] | Sort-Object Name
    
    Write-Host "[$currentTable/$totalTables] 📊 $tableName" -ForegroundColor Cyan
    
    # Leer primera línea del primer archivo para obtener columnas
    $firstFile = $files[0]
    $headerLine = Get-Content $firstFile.FullName -First 1
    $columns = $headerLine -split ',' | ForEach-Object { $_.Trim('"').Trim() }
    
    # Leer segunda línea para inferir tipos
    $allLines = Get-Content $firstFile.FullName -TotalCount 2
    $sampleLine = if ($allLines.Count -gt 1) { $allLines[1] } else { "" }
    $sampleValues = $sampleLine -split ',' | ForEach-Object { $_.Trim('"').Trim() }
    
    # Crear definición de columnas con tipos inferidos
    $columnDefs = @()
    for ($i = 0; $i -lt $columns.Count; $i++) {
        $colName = $columns[$i]
        $colType = if ($i -lt $sampleValues.Count) {
            Get-ColumnType $sampleValues[$i]
        } else {
            'TEXT'
        }
        $columnDefs += "[$colName] $colType"
    }
    
    # Crear tabla si no existe
    $createSql = "CREATE TABLE IF NOT EXISTS [$tableName] (`n    " + ($columnDefs -join ",`n    ") + "`n);"
    
    try {
        $null = & sqlite3 $SqlitePath $createSql
        Write-Host "   ✓ Tabla creada/verificada ($($columns.Count) columnas)" -ForegroundColor Gray
    } catch {
        Write-Host "   ❌ Error creando tabla: $_" -ForegroundColor Red
        continue
    }
    
    # Importar cada archivo CSV
    $totalRows = 0
    foreach ($file in $files) {
        $fileName = $file.Name
        
        try {
            # Contar filas (sin encabezado)
            $rowCount = (Get-Content $file.FullName | Measure-Object -Line).Lines - 1
            
            # Importar usando sqlite3 modo CSV
            $importCmd = @"
.mode csv
.import --skip 1 '$($file.FullName)' '$tableName'
"@
            $null = $importCmd | & sqlite3 $SqlitePath
            
            $totalRows += $rowCount
            Write-Host "   → $fileName`: $rowCount filas" -ForegroundColor Gray
            
        } catch {
            Write-Host "   ⚠️  Error importando $fileName`: $_" -ForegroundColor Yellow
        }
    }
    
    Write-Host "   ✓ Total importado: $totalRows filas`n" -ForegroundColor Green
}

# Crear índices en columnas de fecha
if (-not $SkipIndexes) {
    Write-Host "`n🔍 Creando índices en columnas de fecha..." -ForegroundColor Cyan
    
    foreach ($tableName in $dateColumns.Keys) {
        if (-not $tableGroups.ContainsKey($tableName)) { continue }
        
        $cols = $dateColumns[$tableName]
        if ($cols.Count -eq 0) { continue }
        
        Write-Host "   📊 $tableName" -ForegroundColor Gray
        
        foreach ($col in $cols) {
            $indexName = "idx_" + $tableName.ToLower() + "_" + $col.ToLower()
            $indexSql = "CREATE INDEX IF NOT EXISTS [$indexName] ON [$tableName] ([$col]);"
            
            try {
                $null = & sqlite3 $SqlitePath $indexSql
                Write-Host "      ✓ $indexName" -ForegroundColor Gray
            } catch {
                Write-Host "      ⚠️  Error creando $indexName`: $_" -ForegroundColor Yellow
            }
        }
    }
}

# Estadísticas finales
Write-Host "`n📈 Estadísticas de la base de datos:" -ForegroundColor Cyan

$statsSql = @"
SELECT name, 
       (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as indexes
FROM sqlite_master m
WHERE type='table' AND name LIKE 'tb_%'
ORDER BY name;
"@

$stats = & sqlite3 $SqlitePath $statsSql

foreach ($line in $stats) {
    if ($line -match '^(tb_[^|]+)\|(\d+)$') {
        $tbl = $matches[1]
        $idxCount = $matches[2]
        
        # Contar filas
        $rowCountSql = "SELECT COUNT(*) FROM [$tbl];"
        $rowCount = & sqlite3 $SqlitePath $rowCountSql
        
        Write-Host "   $tbl`: $rowCount filas, $idxCount índices" -ForegroundColor Gray
    }
}

# Tamaño del archivo
$dbSize = (Get-Item $SqlitePath).Length / 1MB
Write-Host "`n💾 Tamaño base de datos: $([math]::Round($dbSize, 2)) MB" -ForegroundColor Green

Write-Host "`n✅ Importación completada exitosamente" -ForegroundColor Green
Write-Host "📁 $SqlitePath`n" -ForegroundColor Cyan
