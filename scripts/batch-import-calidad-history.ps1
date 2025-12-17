$ErrorActionPreference = 'Stop'
$SourceDir = "C:\exports"
$ScriptPath = "$PSScriptRoot\import-calidad-fast.ps1"
$SqlitePath = "C:\analisis-produccion-stc\database\produccion.db"

if (-not (Test-Path $ScriptPath)) {
    Write-Error "Script de importación no encontrado: $ScriptPath"
    exit 1
}

$files = Get-ChildItem -Path "$SourceDir\tb_CALIDAD_*.csv" | Sort-Object Name

Write-Host "Encontrados $($files.Count) archivos históricos para importar." -ForegroundColor Cyan

foreach ($file in $files) {
    Write-Host "Procesando: $($file.Name)..." -NoNewline
    
    try {
        & $ScriptPath -XlsxPath $file.FullName -SqlitePath $SqlitePath
        Write-Host " OK" -ForegroundColor Green
    }
    catch {
        Write-Host " ERROR" -ForegroundColor Red
        Write-Error $_
    }
}

Write-Host "Proceso de restauración completado." -ForegroundColor Cyan
