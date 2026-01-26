param(
    [Parameter(Mandatory=$true)][string]$ExcelPath,
    [Parameter(Mandatory=$true)][string]$AccessPath,
    [Parameter(Mandatory=$true)][string]$TableName,
    [Parameter(Mandatory=$false)][string]$SheetName,
    [Parameter(Mandatory=$false)][string]$DateColumn,
    [Parameter(Mandatory=$false)][string]$Mode = "Replace" # Replace | Incremental
)

$ErrorActionPreference = 'Stop'

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
Write-Host "Parámetros recibidos:" -ForegroundColor Cyan
Write-Host "  • Archivo Excel: $ExcelPath" -ForegroundColor White
Write-Host "  • Base Access: $AccessPath" -ForegroundColor White
Write-Host "  • Tabla: $TableName" -ForegroundColor White
Write-Host "  • Hoja: $SheetName" -ForegroundColor White
Write-Host "  • Modo: $Mode" -ForegroundColor White
if ($DateColumn) {
    Write-Host "  • Columna Fecha: $DateColumn" -ForegroundColor White
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan

# Verificar que el archivo Excel existe
if (-not (Test-Path $ExcelPath)) {
    throw "ERROR: No se encuentra el archivo Excel: $ExcelPath"
}

# Verificar que el archivo Access existe
if (-not (Test-Path $AccessPath)) {
    throw "ERROR: No se encuentra el archivo Access: $AccessPath"
}

Write-Host "`n[1/5] Iniciando Access.Application (COM)..." -ForegroundColor Cyan

try {
    $app = New-Object -ComObject Access.Application
    $app.Visible = $false
    Write-Host "  [OK] Access iniciado correctamente" -ForegroundColor Green
    
    Write-Host "`n[2/5] Abriendo base de datos..." -ForegroundColor Cyan
    Write-Host "  Ruta: $AccessPath" -ForegroundColor Gray
    $app.OpenCurrentDatabase($AccessPath)
    Write-Host "  [OK] Base de datos abierta" -ForegroundColor Green

    # Determinar nombre de hoja/rango
    $range = $SheetName
    if (-not [string]::IsNullOrEmpty($range)) {
        if (-not $range.EndsWith('!') -and -not $range.EndsWith('$')) {
             $range = "$range!"
        }
    }

    if ($Mode -eq "Replace") {
        # --- MODO REEMPLAZO TOTAL ---
        Write-Host "`n[3/5] Modo: REEMPLAZO TOTAL" -ForegroundColor Cyan
        try {
            Write-Host "  Intentando eliminar tabla existente..." -ForegroundColor Gray
            $app.DoCmd.DeleteObject(0, $TableName) # acTable = 0
            Write-Host "  [OK] Tabla [$TableName] eliminada" -ForegroundColor Yellow
        } catch {
            Write-Host "  [INFO] La tabla [$TableName] no existía" -ForegroundColor Gray
        }

        Write-Host "`n[4/5] Importando datos desde Excel..." -ForegroundColor Cyan
        Write-Host "  Archivo: $ExcelPath" -ForegroundColor Gray
        Write-Host "  Hoja/Rango: $range" -ForegroundColor Gray
        Write-Host "  Tabla destino: $TableName" -ForegroundColor Gray
        
        if ([string]::IsNullOrEmpty($range)) {
            $app.DoCmd.TransferSpreadsheet(0, 10, $TableName, $ExcelPath, $true)
        } else {
            $app.DoCmd.TransferSpreadsheet(0, 10, $TableName, $ExcelPath, $true, $range)
        }
        Write-Host "  [OK] Importación completada" -ForegroundColor Green

    } elseif ($Mode -eq "Incremental") {
        # --- MODO INCREMENTAL ---
        Write-Host "`n[3/5] Modo: INCREMENTAL" -ForegroundColor Cyan
        if ([string]::IsNullOrEmpty($DateColumn)) {
            throw "Para el modo Incremental debe especificar -DateColumn"
        }

        $tempTable = "temp_import_" + (Get-Random)
        Write-Host "  Tabla temporal: $tempTable" -ForegroundColor Gray
        Write-Host "`n[4/5] Importando a tabla temporal..." -ForegroundColor Cyan
        
        if ([string]::IsNullOrEmpty($range)) {
            $app.DoCmd.TransferSpreadsheet(0, 10, $tempTable, $ExcelPath, $true)
        } else {
            $app.DoCmd.TransferSpreadsheet(0, 10, $tempTable, $ExcelPath, $true, $range)
        }
        Write-Host "  [OK] Datos importados a tabla temporal" -ForegroundColor Green

        # Desactivar advertencias para evitar popups en RunSQL
        $app.DoCmd.SetWarnings($false)

        # --- LIMPIEZA DE DATOS ---
        Write-Host "`n  Limpiando registros inválidos..." -ForegroundColor Gray
        try {
            # IsDate devuelve 0 (Falso) o -1 (Verdadero) en Access SQL, o Null si es Null.
            # Borramos si es Null o si IsDate es 0.
            $sqlClean = "DELETE FROM [$tempTable] WHERE [$DateColumn] IS NULL OR IsDate([$DateColumn]) = 0"
            $app.DoCmd.RunSQL($sqlClean)
            Write-Host "  [OK] Registros inválidos eliminados" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] Advertencia al limpiar datos: $_" -ForegroundColor Yellow
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
        Write-Host "`n  Creando índice en tabla temporal..." -ForegroundColor Gray
        try {
            $sqlIndexTemp = "CREATE INDEX [idx_temp_$DateColumn] ON [$tempTable] ([$DateColumn])"
            $app.DoCmd.RunSQL($sqlIndexTemp)
            Write-Host "  [OK] Índice creado" -ForegroundColor Green
        } catch { 
            Write-Host "  [WARN] No se pudo indexar tabla temporal: $_" -ForegroundColor Yellow
        }

        # Borrar registros usando IN (SELECT ...) ahora que tenemos índices
        Write-Host "`n[5/5] Procesando datos incrementales..." -ForegroundColor Cyan
        Write-Host "  Eliminando registros duplicados..." -ForegroundColor Gray
        $sqlDelete = "DELETE FROM [$TableName] WHERE [$DateColumn] IN (SELECT [$DateColumn] FROM [$tempTable])"
        $app.DoCmd.RunSQL($sqlDelete)
        Write-Host "  [OK] Duplicados eliminados" -ForegroundColor Green
        
        # Insertar nuevos registros con mapeo dinámico de columnas (Usando ADO para evitar error de DAO)
        Write-Host "  Analizando estructura de columnas..." -ForegroundColor Gray
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
        
        Write-Host "  Insertando nuevos registros ($($insertCols.Count) columnas)..." -ForegroundColor Gray
        $app.DoCmd.RunSQL($sqlInsert)
        Write-Host "  [OK] Registros insertados" -ForegroundColor Green

        # Reactivar advertencias
        $app.DoCmd.SetWarnings($true)

        # Borrar tabla temporal
        Write-Host "  Limpiando tabla temporal..." -ForegroundColor Gray
        $app.DoCmd.DeleteObject(0, $tempTable)
        Write-Host "  [OK] Limpieza completada" -ForegroundColor Green
    }

    Write-Host "`n═════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "[OK] OPERACIÓN COMPLETADA EXITOSAMENTE" -ForegroundColor Green
    Write-Host "═════════════════════════════════════════════" -ForegroundColor Green

} catch {
    Write-Host "`n═════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "[ERROR] ERROR DURANTE LA OPERACIÓN" -ForegroundColor Red
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
    Write-Host "Tipo de error: $($_.Exception.GetType().FullName)" -ForegroundColor Red
    Write-Host "Mensaje: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Línea: $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor Red
    if ($_.ScriptStackTrace) {
        Write-Host "`nStack Trace:" -ForegroundColor Red
        Write-Host $_.ScriptStackTrace -ForegroundColor Red
    }
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
    throw
} finally {
    Write-Host "`nCerrando Access..." -ForegroundColor Cyan
    if ($app) {
        try {
            $app.Quit()
            [System.Runtime.Interopservices.Marshal]::ReleaseComObject($app) | Out-Null
            Remove-Variable app
            Write-Host "  [OK] Access cerrado correctamente" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] Advertencia al cerrar Access: $_" -ForegroundColor Yellow
        }
    }
}
