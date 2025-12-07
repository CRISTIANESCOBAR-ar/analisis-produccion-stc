# Importar todas las tablas: paralelo para XLSX, secuencial para SQLite
param()
$ErrorActionPreference = 'Stop'

$SqlitePath = "C:\analisis-produccion-stc\database\produccion.db"
$ScriptRoot = "C:\analisis-produccion-stc\scripts"

$tableConfigs = @(
  @{ Table = 'tb_FICHAS'; XlsxPath = 'C:\STC\fichaArtigo.xlsx'; Sheet = 'lista de tecidos'; Script = "$ScriptRoot\import-fichas-fast.ps1" },
  @{ Table = 'tb_RESIDUOS_INDIGO'; XlsxPath = 'C:\STC\RelResIndigo.xlsx'; Sheet = 'rptResiduosIndigo'; Script = "$ScriptRoot\import-residuos-indig-fast.ps1" },
  @{ Table = 'tb_RESIDUOS_POR_SECTOR'; XlsxPath = 'C:\STC\rptResiduosPorSetor.xlsx'; Sheet = 'rptResiduosPorSetor'; Script = "$ScriptRoot\import-residuos-por-sector-fast.ps1" },
  @{ Table = 'tb_TESTES'; XlsxPath = 'C:\STC\rptPrdTestesFisicos.xlsx'; Sheet = 'report2'; Script = "$ScriptRoot\import-testes-fast.ps1" },
  @{ Table = 'tb_PARADAS'; XlsxPath = 'C:\STC\rptParadaMaquinaPRD.xlsx'; Sheet = 'rptpm'; Script = "$ScriptRoot\import-paradas-fast.ps1" },
  @{ Table = 'tb_PRODUCCION'; XlsxPath = 'C:\STC\rptProducaoMaquina.xlsx'; Sheet = 'rptProdMaq'; Script = "$ScriptRoot\import-produccion-fast.ps1" },
  @{ Table = 'tb_CALIDAD'; XlsxPath = 'C:\STC\rptAcompDiarioPBI.xlsx'; Sheet = 'report5'; Script = "$ScriptRoot\import-calidad-fast.ps1" }
)

$globalTimer = [System.Diagnostics.Stopwatch]::StartNew()
$results = @()

Write-Host "FASE 1: Conversion paralela XLSX a CSV" -ForegroundColor Cyan

# Crear archivos CSV temporales en paralelo (la parte lenta)
$jobs = @()
foreach ($t in $tableConfigs) {
  Write-Host "Convirtiendo $($t.Table)..." -ForegroundColor DarkGray
  $tmpCsv = [System.IO.Path]::GetTempFileName()
  $t.TempCsv = $tmpCsv
  
  $job = Start-Job -ScriptBlock {
    param($xlsxPath, $sheet, $csvPath, $isCalidad)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    if ($isCalidad) {
      python "C:\analisis-produccion-stc\scripts\excel-to-csv-calidad.py" $xlsxPath $sheet $csvPath 2 2>$null
    } else {
      python "C:\analisis-produccion-stc\scripts\excel-to-csv.py" $xlsxPath $sheet $csvPath 2 2>$null
    }
    $sw.Stop()
    $sw.Elapsed.TotalSeconds
  } -ArgumentList $t.XlsxPath, $t.Sheet, $tmpCsv, ($t.Table -eq 'tb_CALIDAD')
  
  $jobs += @{ Job = $job; Table = $t.Table; Config = $t }
}

# Esperar conversiones
foreach ($j in $jobs) {
  $seconds = Receive-Job -Job $j.Job -Wait
  Remove-Job -Job $j.Job
  Write-Host "✓ $($j.Table) convertida en $([math]::Round($seconds, 2))s" -ForegroundColor Green
}

Write-Host ""
Write-Host "FASE 2: Importacion secuencial a SQLite" -ForegroundColor Cyan

# Importar secuencialmente a SQLite (rápido, evita conflictos)
foreach ($t in $tableConfigs) {
  Write-Host "Importando $($t.Table)..." -ForegroundColor DarkGray
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  & $t.Script -XlsxPath $t.XlsxPath -SqlitePath $SqlitePath -Sheet $t.Sheet | Out-Host
  $sw.Stop()
  Remove-Item -Path $t.TempCsv -ErrorAction SilentlyContinue
  $results += [pscustomobject]@{ Tabla = $t.Table; Segundos = [math]::Round($sw.Elapsed.TotalSeconds, 2) }
  Write-Host "✓ $($t.Table) completada en $([math]::Round($sw.Elapsed.TotalSeconds, 2))s" -ForegroundColor Green
}

$globalTimer.Stop()
Write-Host ""
Write-Host "Resumen" -ForegroundColor Yellow
$results | Format-Table -AutoSize
Write-Host "Tiempo total: $([math]::Round($globalTimer.Elapsed.TotalSeconds, 2))s" -ForegroundColor Green
