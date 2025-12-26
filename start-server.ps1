# start-server.ps1 - Script de inicio del servidor
$ErrorActionPreference = 'Stop'

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Iniciando Servidor STC Producción" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Navegar al directorio del proyecto
$ProjectPath = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectPath

Write-Host "Directorio del proyecto: $ProjectPath" -ForegroundColor Gray
Write-Host ""

# Matar procesos existentes en puerto 3002
Write-Host "[1/4] Verificando puerto 3002..." -ForegroundColor Yellow
$existingProcess = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($existingProcess) {
    $pid = $existingProcess.OwningProcess
    Write-Host "      Deteniendo proceso existente (PID: $pid)..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "      ✓ Puerto liberado" -ForegroundColor Green
} else {
    Write-Host "      ✓ Puerto disponible" -ForegroundColor Green
}
Write-Host ""

# Verificar Node.js
Write-Host "[2/4] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "      ✓ Node.js $nodeVersion instalado" -ForegroundColor Green
} catch {
    Write-Host "      ✗ Node.js NO instalado" -ForegroundColor Red
    Write-Host "      Descarga desde: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Verificar base de datos
Write-Host "[3/4] Verificando base de datos..." -ForegroundColor Yellow
$dbPath = Join-Path $ProjectPath "database\produccion.db"
if (Test-Path $dbPath) {
    $dbSize = [math]::Round((Get-Item $dbPath).Length / 1MB, 2)
    Write-Host "      ✓ Base de datos encontrada ($dbSize MB)" -ForegroundColor Green
} else {
    Write-Host "      ✗ Base de datos NO encontrada" -ForegroundColor Red
    Write-Host "      Ruta esperada: $dbPath" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Obtener IP local
Write-Host "[4/4] Configurando red..." -ForegroundColor Yellow
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } | Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    $ipAddress = "localhost"
    Write-Host "      ⚠ No se detectó IP de red local, usando localhost" -ForegroundColor Yellow
} else {
    Write-Host "      ✓ IP del servidor: $ipAddress" -ForegroundColor Green
}
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Iniciando servidor..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar servidor en nueva ventana
$serverScript = Join-Path $ProjectPath "scripts\sqlite-api-server.cjs"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectPath'; Write-Host 'Servidor API - Presiona Ctrl+C para detener' -ForegroundColor Cyan; node '$serverScript'" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ SERVIDOR INICIADO CORRECTAMENTE" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Acceso desde este equipo:" -ForegroundColor Cyan
Write-Host "   http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Acceso desde otros equipos en la red:" -ForegroundColor Cyan
Write-Host "   http://$ipAddress:3002" -ForegroundColor White
Write-Host ""
Write-Host "📋 Instrucciones para usuarios:" -ForegroundColor Yellow
Write-Host "   1. Abrir Chrome o Edge" -ForegroundColor Gray
Write-Host "   2. Navegar a http://$ipAddress:3002" -ForegroundColor Gray
Write-Host "   3. Clic en ícono de instalación (+)" -ForegroundColor Gray
Write-Host "   4. Instalar como aplicación" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Para detener el servidor:" -ForegroundColor Yellow
Write-Host "   Presiona Ctrl+C en la ventana del servidor" -ForegroundColor Gray
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
