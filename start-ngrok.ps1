# =====================================================================
# Script para iniciar ngrok y exponer la aplicación
# =====================================================================
# Uso: .\start-ngrok.ps1 [-api] [-frontend] [-both]
# =====================================================================

param(
    [switch]$api,
    [switch]$frontend,
    [switch]$both
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NGROK - Túnel para Análisis STC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Si no se especifica ningún parámetro, mostrar ayuda
if (-not $api -and -not $frontend -and -not $both) {
    Write-Host "Uso: .\start-ngrok.ps1 [-api] [-frontend] [-both]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor White
    Write-Host "  -api       Expone solo el API (puerto 3002)" -ForegroundColor Gray
    Write-Host "  -frontend  Expone solo el frontend (puerto 5173)" -ForegroundColor Gray
    Write-Host "  -both      Expone ambos (requiere cuenta ngrok de pago)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Ejemplo:" -ForegroundColor White
    Write-Host "  .\start-ngrok.ps1 -api" -ForegroundColor Green
    Write-Host ""
    exit 0
}

# Verificar que ngrok esté instalado
$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokPath) {
    Write-Host "❌ ngrok no está instalado." -ForegroundColor Red
    Write-Host "   Instálalo desde: https://ngrok.com/download" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ ngrok encontrado: $($ngrokPath.Source)" -ForegroundColor Green
Write-Host ""

# Función para iniciar ngrok
function Start-NgrokTunnel {
    param(
        [int]$Port,
        [string]$Name
    )
    
    Write-Host "🚀 Iniciando túnel para $Name (puerto $Port)..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 INSTRUCCIONES:" -ForegroundColor Yellow
    Write-Host "   1. Copia la URL 'Forwarding' que aparece abajo" -ForegroundColor White
    Write-Host "   2. Compártela para acceso remoto" -ForegroundColor White
    Write-Host "   3. Presiona Ctrl+C para detener el túnel" -ForegroundColor White
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    
    ngrok http $Port
}

# Ejecutar según la opción elegida
if ($api) {
    Write-Host "📡 Modo: Exponer API Backend" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "   Asegúrate de que el servidor API esté corriendo:" -ForegroundColor White
    Write-Host "   npm run api" -ForegroundColor Green
    Write-Host ""
    Start-NgrokTunnel -Port 3002 -Name "API Backend"
}
elseif ($frontend) {
    Write-Host "🌐 Modo: Exponer Frontend" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "   Asegúrate de que el servidor de desarrollo esté corriendo:" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor Green
    Write-Host ""
    Start-NgrokTunnel -Port 5173 -Name "Frontend Vite"
}
elseif ($both) {
    Write-Host "🔗 Modo: Exponer API + Frontend (requiere ngrok de pago)" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "⚠️  NOTA: Con cuenta gratuita solo puedes tener 1 túnel activo." -ForegroundColor Yellow
    Write-Host "   Para múltiples túneles, usa: ngrok start --all" -ForegroundColor White
    Write-Host ""
    
    # Crear archivo de configuración temporal para múltiples túneles
    $ngrokConfig = @"
version: "2"
tunnels:
  api:
    addr: 3002
    proto: http
  frontend:
    addr: 5173
    proto: http
"@
    
    $configPath = Join-Path $PSScriptRoot "ngrok-tunnels.yml"
    $ngrokConfig | Out-File -FilePath $configPath -Encoding utf8
    
    Write-Host "📄 Configuración creada: $configPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ejecutando: ngrok start --all --config $configPath" -ForegroundColor Cyan
    Write-Host ""
    
    ngrok start --all --config $configPath
}
