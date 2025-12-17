$ErrorActionPreference = 'Stop'
$ScriptPath = "$PSScriptRoot\export-access-com.ps1"
$AccessDb = "c:\STC\rptProdTec.accdb"

# --- PASO 0: BACKUP DE SEGURIDAD ---
$BackupDir = "c:\STC\backups_access"
if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupPath = "$BackupDir\rptProdTec_$Timestamp.accdb"

Write-Host "Creando backup de seguridad..." -ForegroundColor Cyan
Copy-Item $AccessDb -Destination $BackupPath
Write-Host "Backup guardado en: $BackupPath" -ForegroundColor Green
Write-Host "Si algo falla, puede restaurar este archivo.`n" -ForegroundColor Yellow

# 1. tb_PROCESO (Reemplazo Total)
Write-Host "`n--- Procesando tb_PROCESO ---" -ForegroundColor Magenta
& $ScriptPath -ExcelPath "c:\STC\rpsPosicaoEstoquePRD.xlsx" -AccessPath $AccessDb -TableName "tb_PROCESO" -SheetName "rptStock" -Mode "Replace"

# 2. tb_FICHAS (Reemplazo Total)
Write-Host "`n--- Procesando tb_FICHAS ---" -ForegroundColor Magenta
& $ScriptPath -ExcelPath "c:\STC\fichaArtigo.xlsx" -AccessPath $AccessDb -TableName "tb_FICHAS" -SheetName "lista de tecidos" -Mode "Replace"

# 3. tb_CALIDAD (Incremental)
Write-Host "`n--- Procesando tb_CALIDAD ---" -ForegroundColor Magenta
& $ScriptPath -ExcelPath "c:\STC\rptAcompDiarioPBI.xlsx" -AccessPath $AccessDb -TableName "tb_CALIDAD" -SheetName "report5" -Mode "Incremental" -DateColumn "DAT_PROD"

# 4. tb_PRODUCCION (Incremental)
Write-Host "`n--- Procesando tb_PRODUCCION ---" -ForegroundColor Magenta
& $ScriptPath -ExcelPath "c:\STC\rptProducaoMaquina.xlsx" -AccessPath $AccessDb -TableName "tb_PRODUCCION" -SheetName "rptProdMaq" -Mode "Incremental" -DateColumn "DT_BASE_PRODUCAO"

# 5. tb_PARADAS (Incremental)
Write-Host "`n--- Procesando tb_PARADAS ---" -ForegroundColor Magenta
& $ScriptPath -ExcelPath "c:\STC\rptParadaMaquinaPRD.xlsx" -AccessPath $AccessDb -TableName "tb_PARADAS" -SheetName "rptpm" -Mode "Incremental" -DateColumn "DATA_BASE"

# 6. tb_TESTES (Incremental)
Write-Host "`n--- Procesando tb_TESTES ---" -ForegroundColor Magenta
& $ScriptPath -ExcelPath "c:\STC\rptPrdTestesFisicos.xlsx" -AccessPath $AccessDb -TableName "tb_TESTES" -SheetName "report2" -Mode "Incremental" -DateColumn "DT_PROD"

# 7. tb_RESIDUOS_INDIGO (Incremental)
Write-Host "`n--- Procesando tb_RESIDUOS_INDIGO ---" -ForegroundColor Magenta
& $ScriptPath -ExcelPath "c:\STC\RelResIndigo.xlsx" -AccessPath $AccessDb -TableName "tb_RESIDUOS_INDIGO" -SheetName "rptResiduosIndigo" -Mode "Incremental" -DateColumn "DT_MOV"

# 8. tb_RESIDUOS_POR_SECTOR (Incremental)
Write-Host "`n--- Procesando tb_RESIDUOS_POR_SECTOR ---" -ForegroundColor Magenta
& $ScriptPath -ExcelPath "c:\STC\rptResiduosPorSetor.xlsx" -AccessPath $AccessDb -TableName "tb_RESIDUOS_POR_SECTOR" -SheetName "rptResiduosPorSetor" -Mode "Incremental" -DateColumn "DT_MOV"

Write-Host "`n--- TODO COMPLETADO ---" -ForegroundColor Green
