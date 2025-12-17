$dbPath = "database/produccion.db"

if (-not (Test-Path $dbPath)) {
    Write-Error "Database not found at $dbPath"
    exit 1
}

$sql = @"
CREATE INDEX IF NOT EXISTS idx_testes_dt_prod ON tb_TESTES(DT_PROD);
CREATE INDEX IF NOT EXISTS idx_calidad_dat_prod ON tb_CALIDAD(DAT_PROD);
ANALYZE;
"@

$tempFile = [System.IO.Path]::GetTempFileName()
$sql | Out-File $tempFile -Encoding UTF8

Write-Host "Creating optimization indexes..."
sqlite3 $dbPath ".read '$tempFile'"

Remove-Item $tempFile
Write-Host "Indexes created and statistics updated."
