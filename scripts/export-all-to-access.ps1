$ErrorActionPreference = 'Stop'
$ScriptPath = "$PSScriptRoot\export-access-com.ps1"
$AccessDb = "c:\STC\rptProdTec.accdb"

# Temporizadores
$globalStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$script:timings = @()

# Verificar que el archivo Access existe
if (-not (Test-Path $AccessDb)) {
	Write-Host "ERROR: No se encuentra el archivo Access en: $AccessDb" -ForegroundColor Red
	exit 1
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  EXPORTACIÓN A ACCESS - INICIO" -ForegroundColor Cyan
Write-Host "  Base de datos: $AccessDb" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

function Measure-AccessStep {
	param(
		[string]$Name,
		[scriptblock]$Action
	)
	Write-Host "`n========================================" -ForegroundColor Magenta
	Write-Host "INICIANDO: $Name" -ForegroundColor Magenta
	Write-Host "========================================" -ForegroundColor Magenta
	$sw = [System.Diagnostics.Stopwatch]::StartNew()
	
	try {
		& $Action
		$sw.Stop()
		$secondsFormatted = $sw.Elapsed.TotalSeconds.ToString("F2")
		Write-Host "[OK] COMPLETADO: $Name ($secondsFormatted s)" -ForegroundColor Green
		$script:timings += [pscustomobject]@{
			Proceso  = $Name
			Segundos = [math]::Round($sw.Elapsed.TotalSeconds, 2)
			Minutos  = [math]::Round($sw.Elapsed.TotalMinutes, 2)
			Estado   = "OK"
		}
		
		# Pausa breve para dar tiempo a Access de liberar recursos
		Write-Host "Esperando 2 segundos antes de continuar..." -ForegroundColor Gray
		Start-Sleep -Seconds 2
		
	} catch {
		$sw.Stop()
		Write-Host "[ERROR] ERROR EN: $Name" -ForegroundColor Red
		Write-Host "Error: $_" -ForegroundColor Red
		Write-Host "StackTrace: $($_.ScriptStackTrace)" -ForegroundColor Red
		$script:timings += [pscustomobject]@{
			Proceso  = $Name
			Segundos = [math]::Round($sw.Elapsed.TotalSeconds, 2)
			Minutos  = [math]::Round($sw.Elapsed.TotalMinutes, 2)
			Estado   = "ERROR"
		}
		throw
	}
}

# --- PASO 0: BACKUP DE SEGURIDAD ---
$BackupDir = "c:\STC\backups_access"
if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupPath = "$BackupDir\rptProdTec_$Timestamp.accdb"

Write-Host "Creando backup de seguridad..." -ForegroundColor Cyan
Copy-Item $AccessDb -Destination $BackupPath
Write-Host "Backup guardado en: $BackupPath" -ForegroundColor Green
Write-Host "Si algo falla, puede restaurar este archivo.`n" -ForegroundColor Yellow

# Lista de archivos a verificar antes de comenzar
$archivosAVerificar = @(
	@{ Path = "c:\STC\rpsPosicaoEstoquePRD.xlsx"; Nombre = "tb_PROCESO" },
	@{ Path = "c:\STC\fichaArtigo.xlsx"; Nombre = "tb_FICHAS" },
	@{ Path = "c:\STC\rptAcompDiarioPBI.xlsx"; Nombre = "tb_CALIDAD" },
	@{ Path = "c:\STC\rptProducaoMaquina.xlsx"; Nombre = "tb_PRODUCCION" },
	@{ Path = "c:\STC\rptParadaMaquinaPRD.xlsx"; Nombre = "tb_PARADAS" },
	@{ Path = "c:\STC\rptPrdTestesFisicos.xlsx"; Nombre = "tb_TESTES" },
	@{ Path = "c:\STC\RelResIndigo.xlsx"; Nombre = "tb_RESIDUOS_INDIGO" },
	@{ Path = "c:\STC\rptResiduosPorSetor.xlsx"; Nombre = "tb_RESIDUOS_POR_SECTOR" }
)

Write-Host "`nVerificando existencia de archivos Excel..." -ForegroundColor Cyan
$archivosNoEncontrados = @()
foreach ($archivo in $archivosAVerificar) {
	if (Test-Path $archivo.Path) {
		Write-Host "  [OK] $($archivo.Nombre): $($archivo.Path)" -ForegroundColor Green
	} else {
		Write-Host "  [X] $($archivo.Nombre): NO ENCONTRADO - $($archivo.Path)" -ForegroundColor Red
		$archivosNoEncontrados += $archivo
	}
}

if ($archivosNoEncontrados.Count -gt 0) {
	Write-Host "`nADVERTENCIA: $($archivosNoEncontrados.Count) archivo(s) no encontrado(s)" -ForegroundColor Yellow
	Write-Host "El proceso continuará con los archivos disponibles.`n" -ForegroundColor Yellow
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  INICIANDO IMPORTACIONES" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

Measure-AccessStep "tb_PROCESO (Reemplazo Total)" {
	& $ScriptPath -ExcelPath "c:\STC\rpsPosicaoEstoquePRD.xlsx" -AccessPath $AccessDb -TableName "tb_PROCESO" -SheetName "rptStock" -Mode "Replace"
}

Measure-AccessStep "tb_FICHAS (Reemplazo Total)" {
	& $ScriptPath -ExcelPath "c:\STC\fichaArtigo.xlsx" -AccessPath $AccessDb -TableName "tb_FICHAS" -SheetName "lista de tecidos" -Mode "Replace"
}

Measure-AccessStep "tb_CALIDAD (Incremental)" {
	& $ScriptPath -ExcelPath "c:\STC\rptAcompDiarioPBI.xlsx" -AccessPath $AccessDb -TableName "tb_CALIDAD" -SheetName "report5" -Mode "Incremental" -DateColumn "DAT_PROD"
}

Measure-AccessStep "tb_PRODUCCION (Incremental)" {
	& $ScriptPath -ExcelPath "c:\STC\rptProducaoMaquina.xlsx" -AccessPath $AccessDb -TableName "tb_PRODUCCION" -SheetName "rptProdMaq" -Mode "Incremental" -DateColumn "DT_BASE_PRODUCAO"
}

Measure-AccessStep "tb_PARADAS (Incremental)" {
	& $ScriptPath -ExcelPath "c:\STC\rptParadaMaquinaPRD.xlsx" -AccessPath $AccessDb -TableName "tb_PARADAS" -SheetName "rptpm" -Mode "Incremental" -DateColumn "DATA_BASE"
}

Measure-AccessStep "tb_TESTES (Incremental)" {
	& $ScriptPath -ExcelPath "c:\STC\rptPrdTestesFisicos.xlsx" -AccessPath $AccessDb -TableName "tb_TESTES" -SheetName "report2" -Mode "Incremental" -DateColumn "DT_PROD"
}

Measure-AccessStep "tb_RESIDUOS_INDIGO (Incremental)" {
	& $ScriptPath -ExcelPath "c:\STC\RelResIndigo.xlsx" -AccessPath $AccessDb -TableName "tb_RESIDUOS_INDIGO" -SheetName "rptResiduosIndigo" -Mode "Incremental" -DateColumn "DT_MOV"
}

Measure-AccessStep "tb_RESIDUOS_POR_SECTOR (Incremental)" {
	& $ScriptPath -ExcelPath "c:\STC\rptResiduosPorSetor.xlsx" -AccessPath $AccessDb -TableName "tb_RESIDUOS_POR_SECTOR" -SheetName "rptResiduosPorSetor" -Mode "Incremental" -DateColumn "DT_MOV"
}

$globalStopwatch.Stop()

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "  TODO COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "`nResumen de tiempos:" -ForegroundColor Cyan
$script:timings | Format-Table -AutoSize
$totalSeconds = [math]::Round($globalStopwatch.Elapsed.TotalSeconds, 2)
$totalMinutes = [math]::Round($globalStopwatch.Elapsed.TotalMinutes, 2)
Write-Host "Total: $totalSeconds segundos ($totalMinutes minutos)" -ForegroundColor Yellow

# Verificar si hubo errores
$errores = $script:timings | Where-Object { $_.Estado -eq "ERROR" }
if ($errores.Count -gt 0) {
	Write-Host "`n[WARN] ADVERTENCIA: $($errores.Count) proceso(s) con errores:" -ForegroundColor Red
	$errores | Format-Table -AutoSize
	exit 1
} else {
	Write-Host "`n[OK] Todos los procesos completados sin errores" -ForegroundColor Green
	exit 0
}
