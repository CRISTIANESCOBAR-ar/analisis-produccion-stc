param(
    [Parameter(Mandatory=$true)][string]$ExcelPath,
    [Parameter(Mandatory=$true)][string]$AccessPath,
    [Parameter(Mandatory=$true)][string]$TableName,
    [Parameter(Mandatory=$false)][string]$SheetName,
    [Parameter(Mandatory=$false)][string]$DateColumn,
    [Parameter(Mandatory=$false)][string]$Mode = "Replace" # Replace | Incremental
)

$ErrorActionPreference = 'Stop'

Write-Host "Iniciando Access.Application (COM)..." -ForegroundColor Cyan

try {
    $app = New-Object -ComObject Access.Application
    $app.Visible = $false
    
    Write-Host "Abriendo base de datos: $AccessPath" -ForegroundColor Cyan
    $app.OpenCurrentDatabase($AccessPath)

    # Determinar nombre de hoja/rango
    $range = $SheetName
    if (-not [string]::IsNullOrEmpty($range)) {
        if (-not $range.EndsWith('!') -and -not $range.EndsWith('$')) {
             $range = "$range!"
        }
    }

    if ($Mode -eq "Replace") {
        # --- MODO REEMPLAZO TOTAL ---
        try {
            $app.DoCmd.DeleteObject(0, $TableName) # acTable = 0
            Write-Host "Tabla [$TableName] eliminada." -ForegroundColor Yellow
        } catch {
            Write-Host "La tabla [$TableName] no existía o no se pudo borrar." -ForegroundColor Gray
        }

        Write-Host "Importando desde: $ExcelPath (Modo: Replace)" -ForegroundColor Cyan
        if ([string]::IsNullOrEmpty($range)) {
            $app.DoCmd.TransferSpreadsheet(0, 10, $TableName, $ExcelPath, $true)
        } else {
            $app.DoCmd.TransferSpreadsheet(0, 10, $TableName, $ExcelPath, $true, $range)
        }

    } elseif ($Mode -eq "Incremental") {
        # --- MODO INCREMENTAL ---
        if ([string]::IsNullOrEmpty($DateColumn)) {
            throw "Para el modo Incremental debe especificar -DateColumn"
        }

        $tempTable = "temp_import_" + (Get-Random)
        Write-Host "Importando a tabla temporal [$tempTable]..." -ForegroundColor Cyan
        
        if ([string]::IsNullOrEmpty($range)) {
            $app.DoCmd.TransferSpreadsheet(0, 10, $tempTable, $ExcelPath, $true)
        } else {
            $app.DoCmd.TransferSpreadsheet(0, 10, $tempTable, $ExcelPath, $true, $range)
        }

        # Desactivar advertencias para evitar popups en RunSQL
        $app.DoCmd.SetWarnings($false)

        # --- LIMPIEZA DE DATOS ---
        # Eliminar filas donde la columna de fecha no sea válida (subtotales, encabezados repetidos, nulos)
        try {
            Write-Host "Limpiando registros inválidos en [$tempTable]..." -ForegroundColor Cyan
            # IsDate devuelve 0 (Falso) o -1 (Verdadero) en Access SQL, o Null si es Null.
            # Borramos si es Null o si IsDate es 0.
            $sqlClean = "DELETE FROM [$tempTable] WHERE [$DateColumn] IS NULL OR IsDate([$DateColumn]) = 0"
            $app.DoCmd.RunSQL($sqlClean)
            Write-Host "Limpieza completada." -ForegroundColor Yellow
        } catch {
            Write-Host "Advertencia al limpiar datos: $_" -ForegroundColor Gray
        }

        # --- OPTIMIZACION 1: Crear índice en la tabla destino si no existe ---
        # Comentado para evitar error si el índice ya existe. 
        # Si la tabla es muy grande y no tiene índice, la primera ejecución será lenta, pero las siguientes rápidas.
        # try {
        #    $sqlIndex = "CREATE INDEX [idx_auto_$DateColumn] ON [$TableName] ([$DateColumn])"
        #    $app.DoCmd.RunSQL($sqlIndex)
        #    Write-Host "Índice en tabla destino creado." -ForegroundColor Yellow
        # } catch { }

        # --- OPTIMIZACION 2: Crear índice en la tabla temporal (CRITICO) ---
        try {
            $sqlIndexTemp = "CREATE INDEX [idx_temp_$DateColumn] ON [$tempTable] ([$DateColumn])"
            $app.DoCmd.RunSQL($sqlIndexTemp)
            Write-Host "Índice en tabla temporal creado." -ForegroundColor Yellow
        } catch { 
            Write-Host "No se pudo indexar tabla temporal: $_" -ForegroundColor Gray
        }

        # Borrar registros usando IN (SELECT ...) ahora que tenemos índices
        # El JOIN directo a veces causa error "Could not delete from specified tables" en Access si la consulta no es actualizable.
        # Al tener índices en ambas tablas, el IN (SELECT) debería ser rápido.
        $sqlDelete = "DELETE FROM [$TableName] WHERE [$DateColumn] IN (SELECT [$DateColumn] FROM [$tempTable])"
        
        Write-Host "Ejecutando DELETE incremental (Indexado)..." -ForegroundColor Cyan
        $app.DoCmd.RunSQL($sqlDelete)
        
        # Insertar nuevos registros con mapeo dinámico de columnas (Usando ADO para evitar error de DAO)
        Write-Host "Analizando columnas para mapeo (ADO)..." -ForegroundColor Cyan
        $conn = $app.CurrentProject.Connection
        
        # Obtener columnas de tabla temporal
        $rsTemp = $conn.Execute("SELECT TOP 1 * FROM [$tempTable]")
        $sourceNames = @{}
        for ($i = 0; $i -lt $rsTemp.Fields.Count; $i++) {
            $fName = $rsTemp.Fields.Item($i).Name
            $sourceNames[$fName] = $fName
            $clean = $fName -replace '\s+', ''
            if (-not $sourceNames.ContainsKey($clean)) { $sourceNames[$clean] = $fName }
        }
        $rsTemp.Close()
        
        # Obtener columnas de tabla destino
        $rsTarget = $conn.Execute("SELECT TOP 1 * FROM [$TableName]")
        $insertCols = @()
        $selectCols = @()
        
        for ($i = 0; $i -lt $rsTarget.Fields.Count; $i++) {
            $tName = $rsTarget.Fields.Item($i).Name
            $tNameClean = $tName -replace '\s+', ''
            
            if ($sourceNames.ContainsKey($tName)) {
                $insertCols += "[$tName]"
                $selectCols += "[$($sourceNames[$tName])]"
            } elseif ($sourceNames.ContainsKey($tNameClean)) {
                $insertCols += "[$tName]"
                $selectCols += "[$($sourceNames[$tNameClean])]"
            }
        }
        $rsTarget.Close()
        
        if ($insertCols.Count -eq 0) { throw "No se encontraron columnas coincidentes." }
        
        $colsStr = $insertCols -join ", "
        $selStr = $selectCols -join ", "
        $sqlInsert = "INSERT INTO [$TableName] ($colsStr) SELECT $selStr FROM [$tempTable]"
        
        Write-Host "Ejecutando INSERT..." -ForegroundColor Cyan
        $app.DoCmd.RunSQL($sqlInsert)

        # Reactivar advertencias
        $app.DoCmd.SetWarnings($true)

        # Borrar tabla temporal
        $app.DoCmd.DeleteObject(0, $tempTable)
        Write-Host "Limpieza completada." -ForegroundColor Green
    }

    Write-Host "Operación completada exitosamente." -ForegroundColor Green

} catch {
    Write-Error "Error COM: $_"
} finally {
    if ($app) {
        $app.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($app) | Out-Null
        Remove-Variable app
    }
}
