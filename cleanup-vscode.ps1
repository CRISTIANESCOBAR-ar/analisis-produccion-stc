# ============================================
# Script de Limpieza Completa de VS Code
# ============================================
# Este script desinstala VSCode y elimina TODAS sus configuraciones,
# extensiones y caché para una instalación desde cero.
#
# ADVERTENCIA: Esto borrará TODAS tus configuraciones y extensiones de VSCode
# Guarda cualquier configuración importante antes de ejecutar.
#
# Uso: Click derecho > Ejecutar con PowerShell
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "LIMPIEZA COMPLETA DE VS CODE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si se está ejecutando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  ADVERTENCIA: No se está ejecutando como Administrador" -ForegroundColor Yellow
    Write-Host "   Algunas operaciones pueden fallar. Recomendado ejecutar como Admin." -ForegroundColor Yellow
    Write-Host ""
}

# Confirmación del usuario
Write-Host "Este script eliminará:" -ForegroundColor Yellow
Write-Host "  ❌ VS Code (aplicación)" -ForegroundColor Red
Write-Host "  ❌ Todas las extensiones instaladas" -ForegroundColor Red
Write-Host "  ❌ Configuraciones de usuario (settings.json, keybindings, snippets)" -ForegroundColor Red
Write-Host "  ❌ Caché y datos temporales" -ForegroundColor Red
Write-Host "  ❌ Workspaces y sesiones guardadas" -ForegroundColor Red
Write-Host ""
Write-Host "⚠️  ESTO NO SE PUEDE DESHACER ⚠️" -ForegroundColor Red
Write-Host ""

$confirmation = Read-Host "¿Estás seguro? Escribe 'SI' para continuar"

if ($confirmation -ne "SI") {
    Write-Host "❌ Operación cancelada." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Presiona cualquier tecla para salir..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host ""
Write-Host "🔄 Iniciando limpieza..." -ForegroundColor Green
Write-Host ""

# 1. Cerrar VS Code si está en ejecución
Write-Host "[1/7] Cerrando VS Code..." -ForegroundColor Cyan
$vscodeProcesses = Get-Process | Where-Object { $_.ProcessName -like "*Code*" }
if ($vscodeProcesses) {
    Write-Host "   Encontrados $($vscodeProcesses.Count) procesos de VS Code" -ForegroundColor Gray
    Stop-Process -Name "Code" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "electron" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "   ✅ Procesos cerrados" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  VS Code no está en ejecución" -ForegroundColor Gray
}

# 2. Desinstalar VS Code
Write-Host ""
Write-Host "[2/7] Desinstalando VS Code..." -ForegroundColor Cyan

# Buscar instalador en ubicaciones comunes
$uninstallers = @(
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\unins000.exe",
    "$env:ProgramFiles\Microsoft VS Code\unins000.exe",
    "$env:ProgramFiles(x86)\Microsoft VS Code\unins000.exe"
)

$uninstallerFound = $false
foreach ($uninstaller in $uninstallers) {
    if (Test-Path $uninstaller) {
        Write-Host "   Ejecutando desinstalador: $uninstaller" -ForegroundColor Gray
        Start-Process -FilePath $uninstaller -ArgumentList "/VERYSILENT", "/NORESTART" -Wait -ErrorAction SilentlyContinue
        $uninstallerFound = $true
        Write-Host "   ✅ VS Code desinstalado" -ForegroundColor Green
        break
    }
}

if (-not $uninstallerFound) {
    Write-Host "   ⚠️  Desinstalador no encontrado (puede que ya esté desinstalado)" -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# 3. Eliminar carpetas de instalación
Write-Host ""
Write-Host "[3/7] Eliminando carpetas de instalación..." -ForegroundColor Cyan

$installFolders = @(
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code",
    "$env:ProgramFiles\Microsoft VS Code",
    "$env:ProgramFiles(x86)\Microsoft VS Code"
)

foreach ($folder in $installFolders) {
    if (Test-Path $folder) {
        Write-Host "   Eliminando: $folder" -ForegroundColor Gray
        Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "   ✅ Carpetas de instalación eliminadas" -ForegroundColor Green

# 4. Eliminar configuraciones de usuario
Write-Host ""
Write-Host "[4/7] Eliminando configuraciones de usuario..." -ForegroundColor Cyan

$configFolders = @(
    "$env:APPDATA\Code",
    "$env:USERPROFILE\.vscode"
)

foreach ($folder in $configFolders) {
    if (Test-Path $folder) {
        Write-Host "   Eliminando: $folder" -ForegroundColor Gray
        Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "   ✅ Configuraciones eliminadas" -ForegroundColor Green

# 5. Eliminar extensiones
Write-Host ""
Write-Host "[5/7] Eliminando extensiones..." -ForegroundColor Cyan

$extensionFolder = "$env:USERPROFILE\.vscode\extensions"
if (Test-Path $extensionFolder) {
    Write-Host "   Eliminando: $extensionFolder" -ForegroundColor Gray
    Remove-Item -Path $extensionFolder -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "   ✅ Extensiones eliminadas" -ForegroundColor Green

# 6. Eliminar caché y datos temporales
Write-Host ""
Write-Host "[6/7] Eliminando caché y datos temporales..." -ForegroundColor Cyan

$cacheFolders = @(
    "$env:APPDATA\Code\Cache",
    "$env:APPDATA\Code\CachedData",
    "$env:APPDATA\Code\CachedExtensions",
    "$env:APPDATA\Code\CachedExtensionVSIXs",
    "$env:APPDATA\Code\logs",
    "$env:APPDATA\Code\Service Worker",
    "$env:TEMP\vscode-*"
)

foreach ($folder in $cacheFolders) {
    if (Test-Path $folder) {
        Write-Host "   Eliminando: $folder" -ForegroundColor Gray
        Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "   ✅ Caché eliminada" -ForegroundColor Green

# 7. Limpiar entradas del registro (opcional, solo si es admin)
Write-Host ""
Write-Host "[7/7] Limpiando registro..." -ForegroundColor Cyan

if ($isAdmin) {
    $registryPaths = @(
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*VS Code*",
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*VS Code*"
    )
    
    foreach ($path in $registryPaths) {
        try {
            $keys = Get-Item $path -ErrorAction SilentlyContinue
            if ($keys) {
                Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "   Clave de registro eliminada: $path" -ForegroundColor Gray
            }
        } catch {
            # Ignorar errores de registro
        }
    }
    Write-Host "   ✅ Registro limpiado" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Saltando limpieza de registro (requiere permisos de Admin)" -ForegroundColor Yellow
}

# Verificación final
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ LIMPIEZA COMPLETA" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "VS Code ha sido completamente eliminado de tu sistema." -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Descargar VS Code: https://code.visualstudio.com/download" -ForegroundColor White
Write-Host "  2. Instalar VS Code" -ForegroundColor White
Write-Host "  3. Seguir las instrucciones en VSCODE_SETUP.md" -ForegroundColor White
Write-Host "  4. Instalar solo las extensiones esenciales (ver documento)" -ForegroundColor White
Write-Host ""
Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
