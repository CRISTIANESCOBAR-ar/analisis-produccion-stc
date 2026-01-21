# =====================================================================
# Script para crear tabla tb_METAS y cargar datos iniciales
# =====================================================================

$ErrorActionPreference = "Stop"

$DB_PATH = ".\database\produccion.db"
$SQL_FILE = ".\scripts\create-tb_METAS.sql"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Creando tabla tb_METAS y cargando datos           ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe la base de datos
if (-not (Test-Path $DB_PATH)) {
    Write-Host "✗ Error: No se encontró la base de datos en $DB_PATH" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Base de datos encontrada: $DB_PATH" -ForegroundColor Green

# Ejecutar script SQL para crear tabla
Write-Host ""
Write-Host "→ Creando tabla tb_METAS..." -ForegroundColor Yellow

$sqlContent = Get-Content $SQL_FILE -Raw
$sqlCommands = $sqlContent -split ';' | Where-Object { $_.Trim() -ne '' }

foreach ($command in $sqlCommands) {
    $trimmedCommand = $command.Trim()
    if ($trimmedCommand -ne '') {
        sqlite3.exe $DB_PATH $trimmedCommand
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Comando ejecutado" -ForegroundColor Green
        } else {
            Write-Host "  ! Advertencia en comando SQL" -ForegroundColor Yellow
        }
    }
}

Write-Host "✓ Tabla tb_METAS creada correctamente" -ForegroundColor Green

# Cargar datos de enero 2026
Write-Host ""
Write-Host "→ Cargando datos de enero 2026..." -ForegroundColor Yellow

$metasEnero2026 = @(
    @{Dia='2026-01-01'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=31},
    @{Dia='2026-01-02'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=30},
    @{Dia='2026-01-03'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=29},
    @{Dia='2026-01-04'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=28},
    @{Dia='2026-01-05'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=27},
    @{Dia='2026-01-06'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=26},
    @{Dia='2026-01-07'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=25},
    @{Dia='2026-01-08'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=24},
    @{Dia='2026-01-09'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=23},
    @{Dia='2026-01-10'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=22},
    @{Dia='2026-01-11'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=21},
    @{Dia='2026-01-12'; Indigo=20000; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=12000; RU=1.6; RT=2; EFI=88; Integ=0; Vel=40; ENC=-1.5; Rev=$null; DiaInv=20},
    @{Dia='2026-01-13'; Indigo=20000; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=12000; RU=1.6; RT=2; EFI=88; Integ=0; Vel=40; ENC=-1.5; Rev=$null; DiaInv=19},
    @{Dia='2026-01-14'; Indigo=20000; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=12000; RU=1.6; RT=2; EFI=88; Integ=20000; Vel=40; ENC=-1.5; Rev=$null; DiaInv=18},
    @{Dia='2026-01-15'; Indigo=20000; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=12000; RU=1.6; RT=2; EFI=88; Integ=20000; Vel=40; ENC=-1.5; Rev=16662; DiaInv=17},
    @{Dia='2026-01-16'; Indigo=20000; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=12000; RU=1.6; RT=2; EFI=88; Integ=20000; Vel=40; ENC=-1.5; Rev=16667; DiaInv=16},
    @{Dia='2026-01-17'; Indigo=20000; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=12000; RU=1.6; RT=2; EFI=88; Integ=20000; Vel=40; ENC=-1.5; Rev=16667; DiaInv=15},
    @{Dia='2026-01-18'; Indigo=$null; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=$null; RU=1.6; RT=2; EFI=88; Integ=$null; Vel=40; ENC=-1.5; Rev=$null; DiaInv=14},
    @{Dia='2026-01-19'; Indigo=43652; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=41667; DiaInv=13},
    @{Dia='2026-01-20'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=41667; DiaInv=12},
    @{Dia='2026-01-21'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=41667; DiaInv=11},
    @{Dia='2026-01-22'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=41667; DiaInv=10},
    @{Dia='2026-01-23'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=41667; DiaInv=9},
    @{Dia='2026-01-24'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=41667; DiaInv=8},
    @{Dia='2026-01-25'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=0; DiaInv=7},
    @{Dia='2026-01-26'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=41667; DiaInv=6},
    @{Dia='2026-01-27'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=41667; DiaInv=5},
    @{Dia='2026-01-28'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=41667; DiaInv=4},
    @{Dia='2026-01-29'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=41667; DiaInv=3},
    @{Dia='2026-01-30'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36769; RU=1.6; RT=2; EFI=88; Integ=36154; Vel=40; ENC=-1.5; Rev=41667; DiaInv=2},
    @{Dia='2026-01-31'; Indigo=43654; Meta_Ef=88; Meta_Rot=1; Meta_Est=1.8; Tej=36772; RU=1.6; RT=2; EFI=88; Integ=36152; Vel=40; ENC=-1.5; Rev=41667; DiaInv=1}
)

$contador = 0
foreach ($meta in $metasEnero2026) {
    $indigoVal = if ($meta.Indigo) { $meta.Indigo } else { "NULL" }
    $tejVal = if ($meta.Tej) { $meta.Tej } else { "NULL" }
    $integVal = if ($null -ne $meta.Integ) { $meta.Integ } else { "NULL" }
    $revVal = if ($meta.Rev) { $meta.Rev } else { "NULL" }
    
    $insertSQL = @"
INSERT OR REPLACE INTO tb_METAS (
    Dia, Indigo, Meta_Eficiencia_INDIGO, Meta_Rotura_INDIGO, Meta_Estopa_Azul,
    Tejeduria, RU105, RT105, EFI_Percent, Meta_Estopa_Azul_Tejeduria,
    Integrada, Meta_Velocidad_Integrada, Meta_ENC_URD_Integrada,
    Revision, Dia_Invertido
) VALUES (
    '$($meta.Dia)', $indigoVal, $($meta.Meta_Ef), $($meta.Meta_Rot), $($meta.Meta_Est),
    $tejVal, $($meta.RU), $($meta.RT), $($meta.EFI), 0.3,
    $integVal, $($meta.Vel), $($meta.ENC),
    $revVal, $($meta.DiaInv)
);
"@
    
    sqlite3.exe $DB_PATH $insertSQL
    
    if ($LASTEXITCODE -eq 0) {
        $contador++
    } else {
        Write-Host "  ! Error insertando $($meta.Dia)" -ForegroundColor Yellow
    }
}

Write-Host "✓ $contador registros cargados para enero 2026" -ForegroundColor Green

# Verificar datos cargados
Write-Host ""
Write-Host "→ Verificando datos cargados..." -ForegroundColor Yellow

$totalQuery = "SELECT COUNT(*) as total FROM tb_METAS WHERE strftime('%Y-%m', Dia) = '2026-01';"
$total = sqlite3.exe $DB_PATH $totalQuery

Write-Host "✓ Total de registros en tb_METAS para enero 2026: $total" -ForegroundColor Green

# Mostrar totales mensuales
$totalesQuery = @"
SELECT 
    SUM(Indigo) as Total_Indigo,
    SUM(Tejeduria) as Total_Tejeduria,
    SUM(Integrada) as Total_Integrada,
    SUM(Revision) as Total_Revision
FROM tb_METAS 
WHERE strftime('%Y-%m', Dia) = '2026-01';
"@

Write-Host ""
Write-Host "→ Totales mensuales calculados:" -ForegroundColor Yellow
sqlite3.exe $DB_PATH -header -column $totalesQuery

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✓ Proceso completado exitosamente                  ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Tabla tb_METAS creada y datos de enero 2026 cargados." -ForegroundColor Cyan
Write-Host "Puedes usar el componente MetasCarga.vue para editar las metas." -ForegroundColor Cyan
Write-Host ""
