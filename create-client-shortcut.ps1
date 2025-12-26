# create-client-shortcut.ps1
# Crea acceso directo al servidor STC en el escritorio
param(
    [Parameter(Mandatory=$false)]
    [string]$ServerIP = "",
    
    [Parameter(Mandatory=$false)]
    [string]$DesktopPath = [Environment]::GetFolderPath("Desktop")
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Crear Acceso Directo - STC Producción" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Si no se proporciona IP, pedirla
if (-not $ServerIP) {
    Write-Host "Ingrese la IP del servidor STC:" -ForegroundColor Yellow
    Write-Host "(Ejemplo: 192.168.1.100)" -ForegroundColor Gray
    Write-Host ""
    $ServerIP = Read-Host "IP del servidor"
}

# Validar formato IP
if ($ServerIP -notmatch '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$') {
    Write-Host "❌ Formato de IP inválido" -ForegroundColor Red
    Write-Host "   Use formato: 192.168.1.100" -ForegroundColor Yellow
    exit 1
}

# Crear acceso directo
try {
    $WScriptShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WScriptShell.CreateShortcut("$DesktopPath\Análisis Producción STC.url")
    $Shortcut.TargetPath = "http://$ServerIP:3002"
    $Shortcut.Save()
    
    Write-Host ""
    Write-Host "✅ Acceso directo creado exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Ubicación: $DesktopPath" -ForegroundColor Cyan
    Write-Host "🔗 URL: http://$ServerIP:3002" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Haz doble clic en el acceso directo para abrir la aplicación" -ForegroundColor Yellow
} catch {
    Write-Host ""
    Write-Host "❌ Error al crear acceso directo" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
