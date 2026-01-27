param(
    [Parameter(Mandatory=$true)][string]$ExcelPath,
    [Parameter(Mandatory=$true)][string]$AccessPath,
    [Parameter(Mandatory=$true)][string]$TableName,
    [Parameter(Mandatory=$false)][string]$SheetName,
    [Parameter(Mandatory=$false)][string]$DateColumn,
    [Parameter(Mandatory=$false)][string]$Mode = "Replace"
)

$ErrorActionPreference = 'Stop'

Write-Host "--------------------------------------------" -ForegroundColor DarkCyan
Write-Host "Parametros recibidos:" -ForegroundColor Cyan
Write-Host "  - Archivo Excel: $ExcelPath" -ForegroundColor White
Write-Host "  - Base Access: $AccessPath" -ForegroundColor White
Write-Host "  - Tabla: $TableName" -ForegroundColor White
Write-Host "  - Hoja: $SheetName" -ForegroundColor White
Write-Host "  - Modo: $Mode" -ForegroundColor White
if ($DateColumn) {
    Write-Host "  - Columna Fecha: $DateColumn" -ForegroundColor White
}
Write-Host "--------------------------------------------" -ForegroundColor DarkCyan

if (-not (Test-Path $ExcelPath)) {
    throw "ERROR: No se encuentra el archivo Excel: $ExcelPath"
}

if (-not (Test-Path $AccessPath)) {
    throw "ERROR: No se encuentra el archivo Access: $AccessPath"
}

Write-Host "" -ForegroundColor Cyan
Write-Host "[1/5] Iniciando Access.Application COM..." -ForegroundColor Cyan

try {
    $app = New-Object -ComObject Access.Application
    $app.Visible = $false
    Write-Host "  [OK] Access iniciado correctamente" -ForegroundColor Green
    
    Write-Host "" -ForegroundColor Cyan
    Write-Host "[2/5] Abriendo base de datos..." -ForegroundColor Cyan
    Write-Host "  Ruta: $AccessPath" -ForegroundColor Gray
    $app.OpenCurrentDatabase($AccessPath)
    Write-Host "  [OK] Base de datos abierta" -ForegroundColor Green

    $range = $SheetName
    if (-not [string]::IsNullOrEmpty($range)) {
        if (-not $range.EndsWith('!') -and -not $range.EndsWith('$')) {
             $range = "$range!"
        }
    }

    if ($Mode -eq "Replace") {
        Write-Host "" -ForegroundColor Cyan
        Write-Host "[3/5] Modo: REEMPLAZO TOTAL" -ForegroundColor Cyan
        try {
            Write-Host "  Intentando eliminar tabla existente..." -ForegroundColor Gray
            $app.DoCmd.DeleteObject(0, $TableName)
            Write-Host "  [OK] Tabla [$TableName] eliminada" -ForegroundColor Yellow
        } catch {
            Write-Host "  [INFO] La tabla [$TableName] no existia" -ForegroundColor Gray
        }

        Write-Host "" -ForegroundColor Cyan
        Write-Host "[4/5] Importando datos desde Excel..." -ForegroundColor Cyan
        Write-Host "  Archivo: $ExcelPath" -ForegroundColor Gray
        Write-Host "  Hoja/Rango: $range" -ForegroundColor Gray
        Write-Host "  Tabla destino: $TableName" -ForegroundColor Gray
        
        if ([string]::IsNullOrEmpty($range)) {
            $app.DoCmd.TransferSpreadsheet(0, 10, $TableName, $ExcelPath, $true)
        } else {
            $app.DoCmd.TransferSpreadsheet(0, 10, $TableName, $ExcelPath, $true, $range)
        }
        Write-Host "  [OK] Importacion completada" -ForegroundColor Green

    } elseif ($Mode -eq "Incremental") {
        Write-Host "" -ForegroundColor Cyan
        Write-Host "[3/5] Modo: INCREMENTAL" -ForegroundColor Cyan
        if ([string]::IsNullOrEmpty($DateColumn)) {
            throw "Para el modo Incremental debe especificar -DateColumn"
        }

        $tempTable = "temp_import_" + (Get-Random)
        Write-Host "  Tabla temporal: $tempTable" -ForegroundColor Gray
        Write-Host "" -ForegroundColor Cyan
        Write-Host "[4/5] Importando a tabla temporal..." -ForegroundColor Cyan
        
        if ([string]::IsNullOrEmpty($range)) {
            $app.DoCmd.TransferSpreadsheet(0, 10, $tempTable, $ExcelPath, $true)
        } else {
            $app.DoCmd.TransferSpreadsheet(0, 10, $tempTable, $ExcelPath, $true, $range)
        }
        Write-Host "  [OK] Datos importados a tabla temporal" -ForegroundColor Green

        $app.DoCmd.SetWarnings($false)

        Write-Host "" -ForegroundColor Gray
        Write-Host "  Limpiando registros invalidos..." -ForegroundColor Gray
        try {
            $sqlClean = "DELETE FROM [$tempTable] WHERE [$DateColumn] IS NULL OR IsDate([$DateColumn]) = 0"
            $app.DoCmd.RunSQL($sqlClean)
            Write-Host "  [OK] Registros invalidos eliminados" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] Advertencia al limpiar datos: $_" -ForegroundColor Yellow
        }

        Write-Host "" -ForegroundColor Gray
        Write-Host "  Creando indice en tabla temporal..." -ForegroundColor Gray
        try {
            $sqlIndexTemp = "CREATE INDEX [idx_temp_$DateColumn] ON [$tempTable] ([$DateColumn])"
            $app.DoCmd.RunSQL($sqlIndexTemp)
            Write-Host "  [OK] Indice creado" -ForegroundColor Green
        } catch { 
            Write-Host "  [WARN] No se pudo indexar tabla temporal: $_" -ForegroundColor Yellow
        }

        Write-Host "" -ForegroundColor Cyan
        Write-Host "[5/5] Procesando datos incrementales..." -ForegroundColor Cyan
        Write-Host "  Eliminando registros duplicados..." -ForegroundColor Gray
        $sqlDelete = "DELETE FROM [$TableName] WHERE [$DateColumn] IN (SELECT [$DateColumn] FROM [$tempTable])"
        $app.DoCmd.RunSQL($sqlDelete)
        Write-Host "  [OK] Duplicados eliminados" -ForegroundColor Green
        
        Write-Host "  Analizando estructura de columnas..." -ForegroundColor Gray
        $conn = $app.CurrentProject.Connection
        
        $rsTemp = $conn.Execute("SELECT TOP 1 * FROM [$tempTable]")
        $sourceNames = @{}
        for ($i = 0; $i -lt $rsTemp.Fields.Count; $i++) {
            $fName = $rsTemp.Fields.Item($i).Name
            $sourceNames[$fName] = $fName
            $clean = $fName -replace '\s+', ''
            if (-not $sourceNames.ContainsKey($clean)) { $sourceNames[$clean] = $fName }
        }
        $rsTemp.Close()
        
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

        $app.DoCmd.SetWarnings($true)

        Write-Host "  Limpiando tabla temporal..." -ForegroundColor Gray
        $app.DoCmd.DeleteObject(0, $tempTable)
        Write-Host "  [OK] Limpieza completada" -ForegroundColor Green
    }

    Write-Host "" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "[OK] OPERACION COMPLETADA EXITOSAMENTE" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green

} catch {
    Write-Host "" -ForegroundColor Red
    Write-Host "=============================================" -ForegroundColor Red
    Write-Host "[ERROR] ERROR DURANTE LA OPERACION" -ForegroundColor Red
    Write-Host "---------------------------------------------" -ForegroundColor Red
    Write-Host "Mensaje: $_" -ForegroundColor Red
    if ($_.InvocationInfo) {
        Write-Host "Linea: $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor Red
    }
    if ($_.ScriptStackTrace) {
        Write-Host "" -ForegroundColor Red
        Write-Host "Stack Trace:" -ForegroundColor Red
        Write-Host $_.ScriptStackTrace -ForegroundColor Red
    }
    Write-Host "---------------------------------------------" -ForegroundColor Red
    throw
} finally {
    Write-Host "" -ForegroundColor Cyan
    Write-Host "Cerrando Access..." -ForegroundColor Cyan
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
