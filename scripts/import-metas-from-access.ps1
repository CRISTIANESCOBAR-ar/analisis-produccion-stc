# Script para importar METAS desde exportación de Access
# Formato: DD/M/YYYY HH:MM:SS;valor1;valor2;...;valor14

param(
    [Parameter(Mandatory=$false)]
    [string]$InputFile = "C:\STC\tb_Metas.txt",
    
    [Parameter(Mandatory=$false)]
    [string]$DbPath = "database\produccion.db"
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Importador de METAS desde Access" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Verificar archivos
if (-not (Test-Path $InputFile)) {
    Write-Host "ERROR: No se encuentra $InputFile" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $DbPath)) {
    Write-Host "ERROR: No se encuentra $DbPath" -ForegroundColor Red
    exit 1
}

Write-Host "Leyendo: $InputFile" -ForegroundColor Yellow
$lineas = Get-Content $InputFile -Encoding UTF8
Write-Host "Total de líneas: $($lineas.Count)" -ForegroundColor Yellow
Write-Host ""

$procesadas = 0
$insertadas = 0
$actualizadas = 0
$errores = 0

foreach ($linea in $lineas) {
    # Ignorar líneas vacías
    if ([string]::IsNullOrWhiteSpace($linea)) {
        continue
    }
    
    # Separar por punto y coma
    $campos = $linea -split ';'
    
    if ($campos.Count -ne 15) {
        Write-Host "ADVERTENCIA: Línea con $($campos.Count) campos (esperado 15): $linea" -ForegroundColor Yellow
        $errores++
        continue
    }
    
    # Convertir la fecha de Access (DD/M/YYYY HH:MM:SS) a ISO (YYYY-MM-DD)
    try {
        $fechaAccess = $campos[0].Trim()
        $fecha = [DateTime]::ParseExact($fechaAccess, "d/M/yyyy H:mm:ss", [System.Globalization.CultureInfo]::InvariantCulture)
        $fechaISO = $fecha.ToString("yyyy-MM-dd")
    }
    catch {
        Write-Host "ERROR: No se pudo convertir la fecha: $($campos[0])" -ForegroundColor Red
        $errores++
        continue
    }
    
    # Convertir comas a puntos decimales
    for ($i = 1; $i -lt $campos.Count; $i++) {
        $campos[$i] = $campos[$i].Trim().Replace(',', '.')
        if ([string]::IsNullOrWhiteSpace($campos[$i])) {
            $campos[$i] = '0'
        }
    }
    
    # Verificar si existe
    $checkQuery = "SELECT COUNT(*) FROM tb_METAS WHERE Dia = '$fechaISO';"
    $resultado = sqlite3.exe $DbPath $checkQuery 2>$null
    
    if ($resultado -match '^\d+$') {
        $existe = [int]$resultado
        
        if ($existe -gt 0) {
            # Actualizar
            $updateQuery = @"
UPDATE tb_METAS SET
    Indigo = $($campos[1]),
    Meta_Eficiencia_INDIGO = $($campos[2]),
    Meta_Rotura_INDIGO = $($campos[3]),
    Meta_Estopa_Azul = $($campos[4]),
    Tejeduria = $($campos[5]),
    RU105 = $($campos[6]),
    RT105 = $($campos[7]),
    EFI_Percent = $($campos[8]),
    Meta_Estopa_Azul_Tejeduria = $($campos[9]),
    Integrada = $($campos[10]),
    Meta_Velocidad_Integrada = $($campos[11]),
    Meta_ENC_URD_Integrada = $($campos[12]),
    Revision = $($campos[13]),
    Dia_Invertido = $($campos[14])
WHERE Dia = '$fechaISO';
"@
            sqlite3.exe $DbPath $updateQuery 2>$null
            $actualizadas++
        }
        else {
            # Insertar
            $insertQuery = @"
INSERT INTO tb_METAS (
    Dia, Indigo, Meta_Eficiencia_INDIGO, Meta_Rotura_INDIGO, Meta_Estopa_Azul,
    Tejeduria, RU105, RT105, EFI_Percent, Meta_Estopa_Azul_Tejeduria,
    Integrada, Meta_Velocidad_Integrada, Meta_ENC_URD_Integrada, Revision, Dia_Invertido
) VALUES (
    '$fechaISO', $($campos[1]), $($campos[2]), $($campos[3]), $($campos[4]),
    $($campos[5]), $($campos[6]), $($campos[7]), $($campos[8]), $($campos[9]),
    $($campos[10]), $($campos[11]), $($campos[12]), $($campos[13]), $($campos[14])
);
"@
            sqlite3.exe $DbPath $insertQuery 2>$null
            $insertadas++
        }
    }
    else {
        Write-Host "ERROR: No se pudo verificar existencia para $fechaISO" -ForegroundColor Red
        $errores++
        continue
    }
    
    $procesadas++
    
    # Progreso cada 50 registros
    if ($procesadas % 50 -eq 0) {
        Write-Host "Procesadas: $procesadas | Insertadas: $insertadas | Actualizadas: $actualizadas | Errores: $errores" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "RESUMEN DE LA IMPORTACIÓN" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host "Total procesadas: $procesadas" -ForegroundColor White
Write-Host "Registros insertados: $insertadas" -ForegroundColor Green
Write-Host "Registros actualizados: $actualizadas" -ForegroundColor Yellow
Write-Host "Errores: $errores" -ForegroundColor Red
Write-Host ""

# Verificar resultado
Write-Host "Verificando base de datos..." -ForegroundColor Cyan
$countQuery = "SELECT COUNT(*) FROM tb_METAS;"
$totalRegistros = sqlite3.exe $DbPath $countQuery
Write-Host "Total de registros en tb_METAS: $totalRegistros" -ForegroundColor Cyan

$rangoQuery = "SELECT MIN(Dia), MAX(Dia) FROM tb_METAS;"
$rango = sqlite3.exe $DbPath $rangoQuery
Write-Host "Rango de fechas: $rango" -ForegroundColor Cyan

# Mostrar algunos ejemplos
Write-Host ""
Write-Host "Primeros 5 registros:" -ForegroundColor Yellow
$sampleQuery = "SELECT Dia, RT105, EFI_Percent FROM tb_METAS ORDER BY Dia LIMIT 5;"
sqlite3.exe $DbPath $sampleQuery
Write-Host ""
