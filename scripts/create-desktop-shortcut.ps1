# Script para crear acceso directo en el escritorio
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = "$DesktopPath\Actualizar Base de Datos.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "pwsh.exe"
$Shortcut.Arguments = '-NoProfile -WindowStyle Hidden -File "C:\analisis-stock-stc\scripts\import-gui.ps1"'
$Shortcut.WorkingDirectory = "C:\analisis-stock-stc"
$Shortcut.Description = "Actualización incremental de base de datos desde archivos Excel"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,138"  # Icono de base de datos
$Shortcut.Save()

Write-Host "✅ Acceso directo creado en el escritorio" -ForegroundColor Green
Write-Host "   Ubicación: $ShortcutPath" -ForegroundColor Cyan
