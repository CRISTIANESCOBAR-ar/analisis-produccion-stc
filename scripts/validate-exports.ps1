Param(
  [Parameter(Mandatory=$true)] [string]$CsvDir,
  [string]$OutFile = "validacion.txt"
)

$ErrorActionPreference = 'Stop'

$outPath = Join-Path $CsvDir $OutFile
"=== VALIDACIÓN DE EXPORTACIÓN ===" | Out-File $outPath -Encoding UTF8
"Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $outPath -Append -Encoding UTF8
"" | Out-File $outPath -Append -Encoding UTF8

# Inventario esperado (desde Access)
$expected = @{
    'tb_PRODUCCION' = 658264
    'tb_CALIDAD' = 675334
    'tb_PARADAS' = 78449
    'tb_RESIDUOS_POR_SECTOR' = 17703
    'tb_TESTES' = 18675
    'tb_RESIDUOS_INDIGO' = 2904
    'tb_FICHAS' = 1766
}

$csvs = Get-ChildItem -Path $CsvDir -Filter *.csv | Where-Object { $_.Name -ne $OutFile }

# Agrupar por tabla
$byTable = @{}
foreach ($csv in $csvs) {
    # Detectar nombre de tabla (antes del primer guion bajo o .csv)
    $tableName = $csv.BaseName -replace '_\d{4}_\d{2}$', '' # Remover _YYYY_MM
    
    if (-not $byTable.ContainsKey($tableName)) {
        $byTable[$tableName] = @()
    }
    $byTable[$tableName] += $csv
}

Write-Host "`nValidando archivos CSV..." -ForegroundColor Cyan

foreach ($table in $expected.Keys | Sort-Object) {
    $expectedCount = $expected[$table]
    $actualCount = 0
    
    if ($byTable.ContainsKey($table)) {
        $files = $byTable[$table]
        
        foreach ($file in $files) {
            # Contar filas (restar 1 para header)
            $lines = (Get-Content $file.FullName | Measure-Object -Line).Lines
            $actualCount += ($lines - 1)
        }
        
        $diff = $actualCount - $expectedCount
        $diffPct = if ($expectedCount -gt 0) { ($diff / $expectedCount) * 100 } else { 0 }
        
        $status = if ($diff -eq 0) { "✓" } elseif ([Math]::Abs($diffPct) -lt 1) { "⚠️ " } else { "❌" }
        $color = if ($diff -eq 0) { "Green" } elseif ([Math]::Abs($diffPct) -lt 1) { "Yellow" } else { "Red" }
        
        $msg = "$status $table : $actualCount CSV vs $expectedCount Access (diff: $diff, $($diffPct.ToString('0.00'))%)"
        Write-Host $msg -ForegroundColor $color
        $msg | Out-File $outPath -Append -Encoding UTF8
        
        # Listar archivos
        foreach ($f in $files) {
            $fLines = (Get-Content $f.FullName | Measure-Object -Line).Lines - 1
            "    - $($f.Name): $fLines filas" | Out-File $outPath -Append -Encoding UTF8
        }
    } else {
        $msg = "❌ $table : No encontrado en CSV"
        Write-Host $msg -ForegroundColor Red
        $msg | Out-File $outPath -Append -Encoding UTF8
    }
}

"" | Out-File $outPath -Append -Encoding UTF8
"=== FIN VALIDACIÓN ===" | Out-File $outPath -Append -Encoding UTF8

Write-Host "`n✅ Reporte generado: $outPath" -ForegroundColor Green
