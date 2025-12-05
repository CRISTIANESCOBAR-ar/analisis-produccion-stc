# Reimportar tb_CALIDAD desde CSV
Write-Host '=== Reimportando tb_CALIDAD ===' -ForegroundColor Cyan

$csvDir = 'C:\analisis-stock-stc\exports'
$dbPath = 'c:\analisis-produccion-stc\database\produccion.db'

# Eliminar tabla actual
Write-Host 'Eliminando tb_CALIDAD actual...' -ForegroundColor Yellow
sqlite3 $dbPath 'DROP TABLE IF EXISTS tb_CALIDAD;'

# Obtener archivos
$csvFiles = Get-ChildItem -Path $csvDir -Filter 'tb_CALIDAD_*.csv' | Sort-Object Name
Write-Host "Archivos encontrados: $($csvFiles.Count)" -ForegroundColor Green

# Crear tabla desde primer CSV
$firstCsv = $csvFiles[0]
$firstLine = Get-Content $firstCsv.FullName -TotalCount 1
$cols = $firstLine -split ',' | ForEach-Object { $_.Trim('"') }
$colsSql = ($cols | ForEach-Object { '[' + $_ + '] TEXT' }) -join ', '
$createSql = 'CREATE TABLE tb_CALIDAD (' + $colsSql + ');'
sqlite3 $dbPath $createSql

Write-Host 'Tabla creada. Importando...' -ForegroundColor Yellow

# Importar cada archivo
$total = 0
foreach ($csv in $csvFiles) {
    $importCmd = '.mode csv' + [char]10 + '.import --skip 1 ''' + $csv.FullName.Replace('\','\\') + ''' tb_CALIDAD'
    $importCmd | sqlite3 $dbPath
    $total++
    Write-Host "[$total/$($csvFiles.Count)] $($csv.Name)" -ForegroundColor Gray
}

# Verificar
$count = sqlite3 $dbPath 'SELECT COUNT(*) FROM tb_CALIDAD;'
Write-Host "Total registros: $count" -ForegroundColor Green

$sample = sqlite3 $dbPath 'SELECT DAT_PROD FROM tb_CALIDAD WHERE DAT_PROD IS NOT NULL LIMIT 3;'
Write-Host "Muestra DAT_PROD: $sample" -ForegroundColor Cyan
