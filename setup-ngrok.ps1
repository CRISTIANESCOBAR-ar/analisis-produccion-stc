# =====================================================================
# Script para configurar ngrok y actualizar .env.local automáticamente
# =====================================================================
# Uso: .\setup-ngrok.ps1
# =====================================================================

param(
    [switch]$start,
    [string]$url
)

$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot ".env.local"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuración NGROK - Análisis STC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Show-Help {
    Write-Host "Este script ayuda a configurar ngrok para acceso remoto." -ForegroundColor White
    Write-Host ""
    Write-Host "OPCIONES:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Iniciar ngrok y copiar URL manualmente:" -ForegroundColor Cyan
    Write-Host "     .\setup-ngrok.ps1 -start" -ForegroundColor Green
    Write-Host ""
    Write-Host "  2. Configurar una URL de ngrok específica:" -ForegroundColor Cyan
    Write-Host "     .\setup-ngrok.ps1 -url https://xxxx.ngrok-free.app" -ForegroundColor Green
    Write-Host ""
    Write-Host "  3. Restaurar a localhost:" -ForegroundColor Cyan
    Write-Host "     .\setup-ngrok.ps1 -url localhost" -ForegroundColor Green
    Write-Host ""
}

function Set-NgrokUrl {
    param([string]$NgrokUrl)
    
    if ($NgrokUrl -eq "localhost") {
        $apiUrl = "http://localhost:3002"
    } else {
        # Asegurar que la URL tenga el formato correcto
        if (-not $NgrokUrl.StartsWith("http")) {
            $NgrokUrl = "https://$NgrokUrl"
        }
        $apiUrl = $NgrokUrl.TrimEnd('/')
    }
    
    $content = @"
# Configuración generada automáticamente por setup-ngrok.ps1
# Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

VITE_API_URL=$apiUrl
"@
    
    $content | Out-File -FilePath $envFile -Encoding utf8
    
    Write-Host "✅ Archivo .env.local actualizado:" -ForegroundColor Green
    Write-Host "   VITE_API_URL = $apiUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Reinicia el servidor de desarrollo (npm run dev)" -ForegroundColor Yellow
    Write-Host ""
}

function Start-NgrokAndConfigure {
    Write-Host "📡 Iniciando ngrok en puerto 3002..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
    Write-Host "  1. Ngrok se abrirá en una nueva ventana" -ForegroundColor White
    Write-Host "  2. Copia la URL 'Forwarding' (ej: https://xxxx.ngrok-free.app)" -ForegroundColor White
    Write-Host "  3. Cierra la ventana de ngrok cuando termines" -ForegroundColor White
    Write-Host ""
    
    # Iniciar ngrok en una nueva ventana
    Start-Process -FilePath "ngrok" -ArgumentList "http 3002" -PassThru | Out-Null
    
    Start-Sleep -Seconds 3
    
    Write-Host "Ngrok está corriendo. Ahora ingresa la URL:" -ForegroundColor Cyan
    Write-Host ""
    $inputUrl = Read-Host "URL de ngrok (o 'localhost' para restaurar)"
    
    if ($inputUrl) {
        Set-NgrokUrl -NgrokUrl $inputUrl
    }
}

# Lógica principal
if ($start) {
    Start-NgrokAndConfigure
}
elseif ($url) {
    Set-NgrokUrl -NgrokUrl $url
}
else {
    Show-Help
    
    Write-Host "¿Qué deseas hacer?" -ForegroundColor Yellow
    Write-Host "  [1] Iniciar ngrok y configurar" -ForegroundColor White
    Write-Host "  [2] Ingresar URL de ngrok manualmente" -ForegroundColor White
    Write-Host "  [3] Restaurar a localhost" -ForegroundColor White
    Write-Host "  [Q] Salir" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Selección"
    
    switch ($choice) {
        "1" { Start-NgrokAndConfigure }
        "2" {
            $inputUrl = Read-Host "Ingresa la URL de ngrok"
            if ($inputUrl) { Set-NgrokUrl -NgrokUrl $inputUrl }
        }
        "3" { Set-NgrokUrl -NgrokUrl "localhost" }
        "Q" { exit 0 }
        "q" { exit 0 }
        default { Write-Host "Opción no válida" -ForegroundColor Red }
    }
}
