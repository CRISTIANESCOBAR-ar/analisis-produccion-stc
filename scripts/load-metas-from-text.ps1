# Script para cargar datos de METAS desde un archivo de texto
# El archivo debe tener el formato: DD-MMM-YY|valor1|valor2|...

param(
    [Parameter(Mandatory=$false)]
    [string]$InputFile = "metas-data.txt",
    
    [Parameter(Mandatory=$false)]
    [string]$DbPath = "database\produccion.db"
)

# Función para convertir fechas españolas a formato ISO
function Convert-SpanishDate {
    param([string]$SpanishDate)
    
    $meses = @{
        'ene' = '01'; 'feb' = '02'; 'mar' = '03'; 'abr' = '04'
        'may' = '05'; 'jun' = '06'; 'jul' = '07'; 'ago' = '08'
        'sep' = '09'; 'oct' = '10'; 'nov' = '11'; 'dic' = '12'
    }
    
    if ($SpanishDate -match '(\d{2})-(\w{3})-(\d{2})') {
        $dia = $Matches[1]
        $mes = $meses[$Matches[2].ToLower()]
        $anio = "20" + $Matches[3]
        return "$anio-$mes-$dia"
    }
    return $null
}

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Cargador de METAS 2024-2025" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el archivo de entrada
if (-not (Test-Path $InputFile)) {
    Write-Host "ERROR: No se encuentra el archivo $InputFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Crea un archivo llamado 'metas-data.txt' con el siguiente formato:" -ForegroundColor Yellow
    Write-Host "DD-MMM-YY|Indigo|Meta_Eficiencia_INDIGO|Meta_Rotura_INDIGO|..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ejemplo:" -ForegroundColor Yellow
    Write-Host "01-ene-24|47,909|88|1|1,8|38,333|1,6|2|88|0,3|0|40|-1,5|0|31" -ForegroundColor Gray
    exit 1
}

# Verificar que existe la base de datos
if (-not (Test-Path $DbPath)) {
    Write-Host "ERROR: No se encuentra la base de datos en $DbPath" -ForegroundColor Red
    exit 1
}

# Leer el archivo de datos
Write-Host "Leyendo archivo: $InputFile" -ForegroundColor Yellow
$lineas = Get-Content $InputFile -Encoding UTF8

Write-Host "Total de líneas: $($lineas.Count)" -ForegroundColor Yellow
Write-Host ""

$procesadas = 0
$errores = 0
$insertadas = 0
$actualizadas = 0

foreach ($linea in $lineas) {
    # Ignorar líneas vacías o comentarios
    if ([string]::IsNullOrWhiteSpace($linea) -or $linea.StartsWith('#')) {
        continue
    }
    
    # Separar los campos por |
    $campos = $linea -split '\|'
    
    if ($campos.Count -ne 15) {
        Write-Host "ADVERTENCIA: Línea con formato incorrecto (esperado 15 campos, encontrado $($campos.Count)): $linea" -ForegroundColor Yellow
        $errores++
        continue
    }
    
    # Convertir la fecha
    $fechaISO = Convert-SpanishDate $campos[0]
    if ($null -eq $fechaISO) {
        Write-Host "ERROR: No se pudo convertir la fecha: $($campos[0])" -ForegroundColor Red
        $errores++
        continue
    }
    
    # Convertir comas a puntos decimales y limpiar espacios
    for ($i = 1; $i -lt $campos.Count; $i++) {
        $campos[$i] = $campos[$i].Trim().Replace(',', '.')
        # Si está vacío, poner 0
        if ([string]::IsNullOrWhiteSpace($campos[$i])) {
            $campos[$i] = '0'
        }
    }
    
    # Verificar si ya existe el registro
    $checkQuery = "SELECT COUNT(*) as cnt FROM tb_METAS WHERE Dia = '$fechaISO';"
    $existe = sqlite3.exe $DbPath $checkQuery
    
    if ($existe -match '(\d+)') {
        $count = [int]$Matches[1]
        
        if ($count -gt 0) {
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
            sqlite3.exe $DbPath $updateQuery
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
            sqlite3.exe $DbPath $insertQuery
            $insertadas++
        }
    }
    
    $procesadas++
    
    # Mostrar progreso cada 50 registros
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

# Verificar el resultado
$countQuery = "SELECT COUNT(*) as total FROM tb_METAS;"
$totalRegistros = sqlite3.exe $DbPath $countQuery
Write-Host "Total de registros en tb_METAS: $totalRegistros" -ForegroundColor Cyan

$rangoQuery = "SELECT MIN(Dia) as min_fecha, MAX(Dia) as max_fecha FROM tb_METAS;"
$rango = sqlite3.exe $DbPath $rangoQuery
Write-Host "Rango de fechas: $rango" -ForegroundColor Cyan
Write-Host ""
