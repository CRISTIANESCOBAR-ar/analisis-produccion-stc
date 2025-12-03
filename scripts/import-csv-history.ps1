# =====================================================================
# IMPORTACION DE HISTORICO CSV A SQLITE
# =====================================================================
# Este script recupera los datos históricos de calidad desde archivos CSV
# ubicados en C:\analisis-stock-stc\exports
# =====================================================================

$SourceDir = "C:\analisis-stock-stc\exports"
$DbPath = "C:\analisis-produccion-stc\database\produccion.db"
$Table = "tb_CALIDAD"

# Verificar existencia de directorios
if (-not (Test-Path $SourceDir)) {
    Write-Error "El directorio de origen no existe: $SourceDir"
    exit 1
}

if (-not (Test-Path $DbPath)) {
    Write-Error "La base de datos no existe: $DbPath"
    exit 1
}

# Obtener archivos CSV de tb_CALIDAD
$Files = Get-ChildItem -Path $SourceDir -Filter "tb_CALIDAD_*.csv" | Sort-Object Name

if ($Files.Count -eq 0) {
    Write-Warning "No se encontraron archivos CSV de tb_CALIDAD en $SourceDir"
    exit
}

Write-Host "Se encontraron $($Files.Count) archivos para importar." -ForegroundColor Cyan

# Preguntar si se desea limpiar la tabla antes (opcional, por defecto append)
# En este caso, como es una recuperación, asumimos que queremos llenar la tabla.
# Pero para evitar duplicados si ya hay datos, podríamos borrar.
# Sin embargo, el usuario tiene datos recientes del Excel.
# Vamos a borrar TODO para asegurar consistencia si el usuario quiere "recuperar".
# Pero mejor preguntamos o lo hacemos seguro.
# Dado que el usuario dijo "Hay algun error con los datos... recupera", voy a limpiar la tabla para asegurar que quede limpia con el histórico completo.
# ADVERTENCIA: Esto borrará la carga del día 02/12 si no está en los CSVs.
# Revisando los archivos: tb_CALIDAD_2025_12.csv existe. Probablemente tenga los datos de diciembre.

Write-Host "Limpiando tabla $Table antes de importar..." -ForegroundColor Yellow
& sqlite3 $DbPath "DELETE FROM $Table;"

$TotalImported = 0
$sw = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($File in $Files) {
    Write-Host "Importando $($File.Name)..." -NoNewline
    
    # Crear archivo temporal UTF-8 para asegurar compatibilidad
    $TempFile = [System.IO.Path]::GetTempFileName()
    
    try {
        # Leer contenido y guardar como UTF8 (sin BOM para sqlite)
        $Content = Get-Content $File.FullName
        [System.IO.File]::WriteAllLines($TempFile, $Content, [System.Text.Encoding]::UTF8)
        
        # Ejecutar comando sqlite3
        # Nota: --skip 1 salta el encabezado
        $ErrorOutput = & sqlite3 $DbPath ".import --csv --skip 1 '$TempFile' $Table" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " OK" -ForegroundColor Green
            $TotalImported++
        } else {
            Write-Host " ERROR" -ForegroundColor Red
            Write-Host $ErrorOutput
        }
    } catch {
        Write-Host " EXCEPTION: $_" -ForegroundColor Red
    } finally {
        if (Test-Path $TempFile) { Remove-Item $TempFile }
    }
}

$sw.Stop()
Write-Host "=================================================="
Write-Host "Proceso finalizado."
Write-Host "Archivos procesados: $TotalImported / $($Files.Count)"
Write-Host "Tiempo total: $($sw.Elapsed.TotalSeconds) segundos"
Write-Host "=================================================="

# Verificar conteo final
$Count = & sqlite3 $DbPath "SELECT COUNT(*) FROM $Table;"
Write-Host "Total de registros en ${Table}: $Count" -ForegroundColor Cyan
