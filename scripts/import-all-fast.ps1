# Importar todas las tablas de forma forzada y rápida en un solo proceso
param(
    [string]$CsvFolder = ""
)
$ErrorActionPreference = 'Stop'

$SqlitePath = "C:\analisis-produccion-stc\database\produccion.db"
$ScriptRoot = "C:\analisis-produccion-stc\scripts"
$ImportScript = "$ScriptRoot\import-xlsx-to-sqlite.ps1"

# Definición base (por defecto usa las rutas antiguas de Excel si no se provee CsvFolder)
$tableConfigs = @(
  @{ Table = 'tb_FICHAS'; XlsxPath = 'C:\STC\fichaArtigo.xlsx'; Sheet = 'lista de tecidos'; MappingJson = "$ScriptRoot\mappings\tb_FICHAS.json" },
  @{ Table = 'tb_RESIDUOS_INDIGO'; XlsxPath = 'C:\STC\RelResIndigo.xlsx'; Sheet = 'rptResiduosIndigo'; MappingJson = "$ScriptRoot\mappings\tb_RESIDUOS_INDIGO.json" },
  @{ Table = 'tb_RESIDUOS_POR_SECTOR'; XlsxPath = 'C:\STC\rptResiduosPorSetor.xlsx'; Sheet = 'rptResiduosPorSetor'; MappingJson = "$ScriptRoot\mappings\tb_RESIDUOS_POR_SECTOR.json" },
  @{ Table = 'tb_TESTES'; XlsxPath = 'C:\STC\rptPrdTestesFisicos.xlsx'; Sheet = 'report2'; MappingJson = "$ScriptRoot\mappings\tb_TESTES.json" },
  @{ Table = 'tb_PARADAS'; XlsxPath = 'C:\STC\rptParadaMaquinaPRD.xlsx'; Sheet = 'rptpm'; MappingJson = "$ScriptRoot\mappings\tb_PARADAS.json" },
  @{ Table = 'tb_PRODUCCION'; XlsxPath = 'C:\STC\rptProducaoMaquina.xlsx'; Sheet = 'rptProdMaq'; MappingJson = "$ScriptRoot\mappings\tb_PRODUCCION.json" },
  @{ Table = 'tb_CALIDAD'; XlsxPath = 'C:\STC\rptAcompDiarioPBI.xlsx'; Sheet = 'report5'; MappingJson = "$ScriptRoot\mappings\tb_CALIDAD.json" },
  @{ Table = 'tb_PROCESO'; XlsxPath = 'C:\STC\rpsPosicaoEstoquePRD.xlsx'; Sheet = 'rptStock'; MappingJson = "$ScriptRoot\mappings\tb_PROCESO.json" },
  @{ Table = 'tb_DEFECTOS'; XlsxPath = 'C:\STC\rptDefPeca.xlsx'; Sheet = 'rptDefPeca'; MappingJson = "$ScriptRoot\mappings\tb_DEFECTOS.json" }
)

# Si se provee una carpeta de CSVs, actualizamos las rutas
if ($CsvFolder -ne "" -and (Test-Path $CsvFolder)) {
    Write-Host "Usando carpeta de CSVs: $CsvFolder" -ForegroundColor Cyan
    foreach ($t in $tableConfigs) {
        # Mapeo de nombres de archivo base (sin extensión)
        $baseName = ""
        switch ($t.Table) {
            'tb_FICHAS' { $baseName = "fichaArtigo" }
            'tb_RESIDUOS_INDIGO' { $baseName = "RelResIndigo" }
            'tb_RESIDUOS_POR_SECTOR' { $baseName = "rptResiduosPorSetor" }
            'tb_TESTES' { $baseName = "rptPrdTestesFisicos" }
            'tb_PARADAS' { $baseName = "rptParadaMaquinaPRD" }
            'tb_PRODUCCION' { $baseName = "rptProducaoMaquina" }
            'tb_CALIDAD' { $baseName = "rptAcompDiarioPBI" }
            'tb_PROCESO' { $baseName = "rpsPosicaoEstoquePRD" }
            'tb_DEFECTOS' { $baseName = "rptDefPeca" }
        }
        
        if ($baseName -ne "") {
            $csvPath = Join-Path $CsvFolder "$baseName.csv"
            if (Test-Path $csvPath) {
                $t.XlsxPath = $csvPath
                Write-Host "  -> $($t.Table) mapeada a $csvPath" -ForegroundColor Gray
            } else {
                Write-Warning "Archivo CSV no encontrado para $($t.Table): $csvPath. Se usará la configuración original."
            }
        }
    }
}

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
  } elseif ($t.Table -eq 'tb_PROCESO') {
    & "$ScriptRoot\import-proceso-fast.ps1" -XlsxPath $t.XlsxPath -SqlitePath $SqlitePath -Sheet $t.Sheet | Out-Host
  } elseif ($t.Table -eq 'tb_DEFECTOS') {
    & "$ScriptRoot\import-defectos-fast.ps1" -XlsxPath $t.XlsxPath -SqlitePath $SqlitePath -Sheet $t.Sheet | Out-Host
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
