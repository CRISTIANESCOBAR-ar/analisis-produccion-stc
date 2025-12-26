# check-server-status.ps1
# Verifica el estado del servidor STC
$ErrorActionPreference = 'SilentlyContinue'

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Estado del Servidor STC Producción" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$port = 3002
$allOk = $true

# 1. Verificar puerto
Write-Host "[1/4] Verificando puerto $port..." -ForegroundColor Yellow
$connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue

if ($connection) {
    Write-Host "      ✓ Puerto $port está abierto" -ForegroundColor Green
} else {
    Write-Host "      ✗ Puerto $port NO está abierto" -ForegroundColor Red
    Write-Host "      Solución: Ejecuta .\start-server.ps1" -ForegroundColor Yellow
    $allOk = $false
}
Write-Host ""

# 2. Verificar proceso Node.js
Write-Host "[2/4] Verificando proceso Node.js..." -ForegroundColor Yellow
$nodeProcess = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcess) {
    Write-Host "      ✓ Proceso Node.js corriendo (PID: $($nodeProcess.Id))" -ForegroundColor Green
    $uptime = (Get-Date) - $nodeProcess.StartTime
    Write-Host "      Tiempo activo: $([math]::Round($uptime.TotalHours, 1)) horas" -ForegroundColor Gray
} else {
    Write-Host "      ✗ Proceso Node.js NO encontrado" -ForegroundColor Red
    $allOk = $false
}
Write-Host ""

# 3. Verificar API HTTP
Write-Host "[3/4] Verificando API HTTP..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$port/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "      ✓ API respondiendo correctamente" -ForegroundColor Green
        $healthData = $response.Content | ConvertFrom-Json
        Write-Host "      Uptime: $([math]::Round($healthData.uptime / 3600, 1)) horas" -ForegroundColor Gray
    } else {
        Write-Host "      ⚠ API responde con código: $($response.StatusCode)" -ForegroundColor Yellow
        $allOk = $false
    }
} catch {
    Write-Host "      ✗ API NO responde" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Gray
    $allOk = $false
}
Write-Host ""

# 4. Verificar base de datos
Write-Host "[4/4] Verificando base de datos..." -ForegroundColor Yellow
$ProjectPath = Split-Path -Parent $PSScriptRoot
$dbPath = Join-Path $ProjectPath "database\produccion.db"
if (Test-Path $dbPath) {
    $dbSize = [math]::Round((Get-Item $dbPath).Length / 1MB, 2)
    $dbModified = (Get-Item $dbPath).LastWriteTime
    Write-Host "      ✓ Base de datos encontrada" -ForegroundColor Green
    Write-Host "      Tamaño: $dbSize MB" -ForegroundColor Gray
    Write-Host "      Última modificación: $($dbModified.ToString('dd/MM/yyyy HH:mm'))" -ForegroundColor Gray
} else {
    Write-Host "      ✗ Base de datos NO encontrada" -ForegroundColor Red
    Write-Host "      Ruta esperada: $dbPath" -ForegroundColor Yellow
    $allOk = $false
}
Write-Host ""

# Resumen
Write-Host "=========================================" -ForegroundColor Cyan
if ($allOk) {
    Write-Host " ✅ SERVIDOR FUNCIONANDO CORRECTAMENTE" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    
    # Obtener IP local
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } | Select-Object -First 1).IPAddress
    
    Write-Host "📱 Acceso local:  http://localhost:$port" -ForegroundColor Cyan
    if ($ipAddress) {
        Write-Host "🌐 Acceso en red: http://$ipAddress:$port" -ForegroundColor Cyan
    }
} else {
    Write-Host " ❌ SERVIDOR CON PROBLEMAS" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Acciones recomendadas:" -ForegroundColor Yellow
    Write-Host "  1. Reiniciar servidor: .\start-server.ps1" -ForegroundColor White
    Write-Host "  2. Verificar logs del servidor" -ForegroundColor White
    Write-Host "  3. Verificar firewall de Windows" -ForegroundColor White
}

Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
