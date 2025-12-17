$ErrorActionPreference = 'Stop'
$ScriptPath = "$PSScriptRoot\export-access-com.ps1"
$AccessDb = "c:\STC\rptProdTec.accdb"

# Temporizadores
$globalStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$timings = @()

function Measure-AccessStep {
	param(
		[string]$Name,
		[scriptblock]$Action
	)
	Write-Host "`n--- Procesando $Name ---" -ForegroundColor Magenta
	$sw = [System.Diagnostics.Stopwatch]::StartNew()
	& $Action
	$sw.Stop()
	$timings += [pscustomobject]@{
		Proceso  = $Name
		Segundos = [math]::Round($sw.Elapsed.TotalSeconds, 2)
		Minutos  = [math]::Round($sw.Elapsed.TotalMinutes, 2)
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

Write-Host "`n--- TODO COMPLETADO ---" -ForegroundColor Green
Write-Host "`nResumen de tiempos:" -ForegroundColor Cyan
$timings | Format-Table -AutoSize
Write-Host ("Total: {0:N2} segundos ({1:N2} minutos)" -f $globalStopwatch.Elapsed.TotalSeconds, $globalStopwatch.Elapsed.TotalMinutes) -ForegroundColor Yellow
