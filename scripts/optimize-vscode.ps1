#!/usr/bin/env pwsh
# Script para optimizar VSCode y limpiar archivos temporales

Write-Host "🔧 Optimizando VSCode..." -ForegroundColor Cyan

# 1. Cerrar procesos node pesados innecesarios
Write-Host "`n1. Verificando procesos node..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   Encontrados $($nodeProcesses.Count) procesos node" -ForegroundColor Gray
    Write-Host "   (No se cerrarán automáticamente para evitar interrumpir el servidor)" -ForegroundColor Gray
} else {
    Write-Host "   ✓ No hay procesos node corriendo" -ForegroundColor Green
}

# 2. Limpiar archivos temporales de VSCode
Write-Host "`n2. Limpiando cache de VSCode..." -ForegroundColor Yellow
$vscodeCache = "$env:APPDATA\Code\Cache"
if (Test-Path $vscodeCache) {
    try {
        Get-ChildItem $vscodeCache -Recurse -ErrorAction SilentlyContinue | 
            Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
            Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        Write-Host "   ✓ Cache limpiado" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠ No se pudo limpiar cache (VSCode puede estar en uso)" -ForegroundColor Yellow
    }
}

# 3. Limpiar archivos temporales del proyecto
Write-Host "`n3. Limpiando archivos temporales del proyecto..." -ForegroundColor Yellow
$tempFiles = @(
    "temp*.sql",
    "temp*.json",
    "debug*.csv",
    "*.log"
)

$cleaned = 0
foreach ($pattern in $tempFiles) {
    $files = Get-ChildItem -Path . -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        try {
            Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
            $cleaned++
        } catch {}
    }
}
Write-Host "   ✓ $cleaned archivos temporales eliminados" -ForegroundColor Green

# 4. Verificar archivos muy grandes abiertos
Write-Host "`n4. Buscando archivos grandes que podrían estar abiertos..." -ForegroundColor Yellow
$largeFiles = Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { 
        $_.Length -gt 10MB -and 
        $_.FullName -notlike "*node_modules*" -and
        $_.Extension -in @('.db', '.csv', '.txt', '.sql')
    } | 
    Select-Object FullName, @{Name='SizeMB';Expression={[math]::Round($_.Length/1MB, 2)}} | 
    Sort-Object SizeMB -Descending

if ($largeFiles) {
    Write-Host "   ⚠ Archivos grandes encontrados:" -ForegroundColor Yellow
    $largeFiles | ForEach-Object {
        $relativePath = $_.FullName -replace [regex]::Escape($PWD.Path), "."
        Write-Host "     - $relativePath ($($_.SizeMB) MB)" -ForegroundColor Gray
    }
    Write-Host "   💡 Cierra estos archivos en VSCode si están abiertos" -ForegroundColor Cyan
}

# 5. Recomendaciones
Write-Host "`n📋 Recomendaciones:" -ForegroundColor Cyan
Write-Host "   1. Cierra pestañas/archivos que no estés usando (Ctrl+W)" -ForegroundColor White
Write-Host "   2. Usa Ctrl+K W para cerrar todas las pestañas" -ForegroundColor White
Write-Host "   3. Reinicia VSCode si sigue lento (Ctrl+Shift+P > Reload Window)" -ForegroundColor White
Write-Host "   4. Cierra terminales innecesarias" -ForegroundColor White
Write-Host "   5. Desactiva extensiones que no uses (Ctrl+Shift+X)" -ForegroundColor White

# 6. Verificar extensiones pesadas
Write-Host "`n6. Extensiones comunes que pueden causar lentitud:" -ForegroundColor Yellow
Write-Host "   - Auto-importers (si tienes muchos archivos)" -ForegroundColor Gray
Write-Host "   - Formatters en auto-save" -ForegroundColor Gray
Write-Host "   - Linters ejecutándose constantemente" -ForegroundColor Gray
Write-Host "   - Copilot en archivos CSV/SQL grandes" -ForegroundColor Gray

Write-Host "`n✅ Optimización completada!" -ForegroundColor Green
Write-Host "💡 Si VSCode sigue lento, reinícialo con: Ctrl+Shift+P > Developer: Reload Window`n" -ForegroundColor Cyan
