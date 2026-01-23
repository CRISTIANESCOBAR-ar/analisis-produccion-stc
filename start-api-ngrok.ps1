# =====================================================================
# Script para iniciar API + ngrok en una sola terminal
# =====================================================================
# Uso: .\start-api-ngrok.ps1
# =====================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  API + NGROK - Análisis STC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que node esté disponible
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "❌ Node.js no está instalado." -ForegroundColor Red
    exit 1
}

# Verificar que ngrok esté disponible
$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokPath) {
    Write-Host "❌ ngrok no está instalado." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js encontrado" -ForegroundColor Green
Write-Host "✅ ngrok encontrado" -ForegroundColor Green
Write-Host ""

# Iniciar el servidor API en background
Write-Host "🚀 Iniciando servidor API en puerto 3002..." -ForegroundColor Cyan
$apiProcess = Start-Process -FilePath "node" -ArgumentList "scripts/sqlite-api-server.cjs" -WorkingDirectory $PSScriptRoot -PassThru -WindowStyle Hidden

# Esperar a que el API esté listo
Write-Host "⏳ Esperando a que el API esté listo..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$apiReady = $false

while ($attempt -lt $maxAttempts -and -not $apiReady) {
    Start-Sleep -Seconds 1
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002/api/status" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $apiReady = $true
        }
    } catch {
        Write-Host "." -NoNewline
    }
}

Write-Host ""

if ($apiReady) {
    Write-Host "✅ API está corriendo en http://localhost:3002" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Iniciando túnel ngrok..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "  COPIA LA URL 'Forwarding' DE ABAJO" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""
    
    # Iniciar ngrok (esto bloqueará hasta que se cierre con Ctrl+C)
    try {
        ngrok http 3002
    } finally {
        # Cuando se cierre ngrok, también cerrar el API
        Write-Host ""
        Write-Host "🛑 Deteniendo servidor API..." -ForegroundColor Yellow
        if ($apiProcess -and -not $apiProcess.HasExited) {
            Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
        }
        Write-Host "✅ Servidor API detenido" -ForegroundColor Green
    }
} else {
    Write-Host "❌ El API no respondió después de $maxAttempts segundos" -ForegroundColor Red
    if ($apiProcess -and -not $apiProcess.HasExited) {
        Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
    }
    exit 1
}
