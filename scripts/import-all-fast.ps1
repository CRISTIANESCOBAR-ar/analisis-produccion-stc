# Importar todas las tablas de forma forzada y rápida en un solo proceso
param()
$ErrorActionPreference = 'Stop'

$SqlitePath = "C:\analisis-produccion-stc\database\produccion.db"
$ScriptRoot = "C:\analisis-produccion-stc\scripts"
$ImportScript = "$ScriptRoot\import-xlsx-to-sqlite.ps1"

$tableConfigs = @(
  @{ Table = 'tb_FICHAS'; XlsxPath = 'C:\STC\fichaArtigo.xlsx'; Sheet = 'lista de tecidos'; MappingJson = "$ScriptRoot\mappings\tb_FICHAS.json" },
  @{ Table = 'tb_RESIDUOS_INDIGO'; XlsxPath = 'C:\STC\RelResIndigo.xlsx'; Sheet = 'rptResiduosIndigo'; MappingJson = "$ScriptRoot\mappings\tb_RESIDUOS_INDIGO.json" },
  @{ Table = 'tb_RESIDUOS_POR_SECTOR'; XlsxPath = 'C:\STC\rptResiduosPorSetor.xlsx'; Sheet = 'rptResiduosPorSetor'; MappingJson = "$ScriptRoot\mappings\tb_RESIDUOS_POR_SECTOR.json" },
  @{ Table = 'tb_TESTES'; XlsxPath = 'C:\STC\rptPrdTestesFisicos.xlsx'; Sheet = 'report2'; MappingJson = "$ScriptRoot\mappings\tb_TESTES.json" },
  @{ Table = 'tb_PARADAS'; XlsxPath = 'C:\STC\rptParadaMaquinaPRD.xlsx'; Sheet = 'rptpm'; MappingJson = "$ScriptRoot\mappings\tb_PARADAS.json" },
  @{ Table = 'tb_PRODUCCION'; XlsxPath = 'C:\STC\rptProducaoMaquina.xlsx'; Sheet = 'rptProdMaq'; MappingJson = "$ScriptRoot\mappings\tb_PRODUCCION.json" },
  @{ Table = 'tb_CALIDAD'; XlsxPath = 'C:\STC\rptAcompDiarioPBI.xlsx'; Sheet = 'report5'; MappingJson = "$ScriptRoot\mappings\tb_CALIDAD.json" }
)

$results = @()
$globalTimer = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($t in $tableConfigs) {
  Write-Host "=== $($t.Table) ===" -ForegroundColor Cyan
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  if ($t.Table -eq 'tb_FICHAS') {
    & "$ScriptRoot\import-fichas-fast.ps1" -XlsxPath $t.XlsxPath -SqlitePath $SqlitePath -Sheet $t.Sheet | Out-Host
  } elseif ($t.Table -eq 'tb_RESIDUOS_INDIGO') {
    & "$ScriptRoot\import-residuos-indig-fast.ps1" -XlsxPath $t.XlsxPath -SqlitePath $SqlitePath -Sheet $t.Sheet | Out-Host
  } elseif ($t.Table -eq 'tb_RESIDUOS_POR_SECTOR') {
    & "$ScriptRoot\import-residuos-por-sector-fast.ps1" -XlsxPath $t.XlsxPath -SqlitePath $SqlitePath -Sheet $t.Sheet | Out-Host
  } elseif ($t.Table -eq 'tb_TESTES') {
    & "$ScriptRoot\import-testes-fast.ps1" -XlsxPath $t.XlsxPath -SqlitePath $SqlitePath -Sheet $t.Sheet | Out-Host
  } elseif ($t.Table -eq 'tb_PARADAS') {
    & "$ScriptRoot\import-paradas-fast.ps1" -XlsxPath $t.XlsxPath -SqlitePath $SqlitePath -Sheet $t.Sheet | Out-Host
  } elseif ($t.Table -eq 'tb_CALIDAD') {
    & "$ScriptRoot\import-calidad-fast.ps1" -XlsxPath $t.XlsxPath -SqlitePath $SqlitePath -Sheet $t.Sheet | Out-Host
  } elseif ($t.Table -eq 'tb_PRODUCCION') {
    & "$ScriptRoot\import-produccion-fast.ps1" -XlsxPath $t.XlsxPath -SqlitePath $SqlitePath -Sheet $t.Sheet | Out-Host
  } else {
    & $ImportScript -XlsxPath $t.XlsxPath -Table $t.Table -Sheet $t.Sheet -SqlitePath $SqlitePath -MappingSource json -MappingJson $t.MappingJson | Out-Host
  }
  $sw.Stop()
  $results += [pscustomobject]@{ Tabla = $t.Table; Segundos = [math]::Round($sw.Elapsed.TotalSeconds,2) }
  Write-Host "Tiempo tabla $($t.Table): $([math]::Round($sw.Elapsed.TotalSeconds,2)) s" -ForegroundColor DarkGray
  Write-Host ""
}

$globalTimer.Stop()
Write-Host "Resumen:" -ForegroundColor Green
$results | Format-Table -AutoSize
$tot = ($results | Measure-Object -Property Segundos -Sum).Sum
Write-Host "Total: $tot s (wallclock $([math]::Round($globalTimer.Elapsed.TotalSeconds,2)) s)" -ForegroundColor Yellow
