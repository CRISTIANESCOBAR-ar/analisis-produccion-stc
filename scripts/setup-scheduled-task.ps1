# =====================================================================
# CONFIGURAR TAREA PROGRAMADA PARA ACTUALIZACIÓN AUTOMÁTICA
# =====================================================================
# Crea una tarea en Task Scheduler que ejecuta la importación
# automáticamente según la frecuencia configurada
# =====================================================================

param(
  [Parameter(Mandatory=$false)]
  [ValidateSet('Daily', 'Weekly', 'Manual')]
  [string]$Frequency = 'Daily',
  
  [Parameter(Mandatory=$false)]
  [string]$Time = '07:00',  # Hora de ejecución (formato 24h)
  
  [Parameter(Mandatory=$false)]
  [ValidateSet('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')]
  [string]$DayOfWeek = 'Monday'  # Si es Weekly
)

$ErrorActionPreference = 'Stop'

# Verificar que se ejecuta como administrador
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "❌ Este script requiere permisos de administrador" -ForegroundColor Red
  Write-Host "   Ejecuta PowerShell como Administrador y vuelve a intentar" -ForegroundColor Yellow
  exit 1
}

$TaskName = "Actualización BD Producción"
$TaskDescription = "Importación incremental automática de datos XLSX a SQLite"
$ScriptPath = "C:\analisis-stock-stc\scripts\update-all-tables.ps1"
$LogPath = "C:\analisis-stock-stc\logs\scheduled-task.log"

# Crear carpeta de logs si no existe
$LogDir = Split-Path $LogPath
if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Acción: ejecutar el script de actualización con notificación
$ActionScript = @"
`$ErrorActionPreference = 'Continue'
`$StartTime = Get-Date
`$LogFile = '$LogPath'

# Agregar timestamp al log
Add-Content `$LogFile "`n=== Ejecución programada: `$StartTime ==="

try {
  # Ejecutar actualización
  `$output = & pwsh -NoProfile -File '$ScriptPath' 2>&1 | Out-String
  Add-Content `$LogFile `$output
  
  # Notificación de éxito (Windows Toast)
  `$ToastTitle = "Actualización BD Completada"
  `$ToastText = "La base de datos se actualizó correctamente a las `$(Get-Date -Format 'HH:mm')"
  
  # Usar New-BurntToastNotification si está disponible, sino usar msg
  if (Get-Module -ListAvailable -Name BurntToast) {
    Import-Module BurntToast
    New-BurntToastNotification -Text `$ToastTitle, `$ToastText -AppLogo "C:\Windows\System32\imageres.dll" -Sound Default
  } else {
    # Fallback: notificación simple de Windows
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
    
    `$template = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>`$ToastTitle</text>
      <text>`$ToastText</text>
    </binding>
  </visual>
</toast>
"@
    
    `$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    `$xml.LoadXml(`$template)
    `$toast = [Windows.UI.Notifications.ToastNotification]::new(`$xml)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Actualización BD").Show(`$toast)
  }
  
  `$EndTime = Get-Date
  `$Duration = (`$EndTime - `$StartTime).TotalSeconds
  Add-Content `$LogFile "✅ Completada exitosamente en `$Duration segundos"
  
} catch {
  Add-Content `$LogFile "❌ Error: `$(`$_.Exception.Message)"
  
  # Notificación de error
  `$ToastTitle = "Error en Actualización BD"
  `$ToastText = "Hubo un error. Revisa el log en: `$LogFile"
  
  `$template = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>`$ToastTitle</text>
      <text>`$ToastText</text>
    </binding>
  </visual>
</toast>
"@
  
  `$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  `$xml.LoadXml(`$template)
  `$toast = [Windows.UI.Notifications.ToastNotification]::new(`$xml)
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Actualización BD").Show(`$toast)
}
"@

# Guardar script de acción en archivo temporal
$ActionScriptPath = "C:\analisis-stock-stc\scripts\scheduled-task-action.ps1"
$ActionScript | Out-File -FilePath $ActionScriptPath -Encoding UTF8 -Force

# Eliminar tarea si ya existe
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
  Write-Host "🗑️  Eliminando tarea existente..." -ForegroundColor Yellow
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Crear acción
$Action = New-ScheduledTaskAction -Execute "pwsh.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ActionScriptPath`""

# Crear trigger según frecuencia
switch ($Frequency) {
  'Daily' {
    $Trigger = New-ScheduledTaskTrigger -Daily -At $Time
    Write-Host "📅 Configurando ejecución diaria a las $Time" -ForegroundColor Cyan
  }
  'Weekly' {
    $Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DayOfWeek -At $Time
    Write-Host "📅 Configurando ejecución semanal los $DayOfWeek a las $Time" -ForegroundColor Cyan
  }
  'Manual' {
    # Sin trigger automático, solo ejecución manual
    $Trigger = $null
    Write-Host "📅 Configurando solo para ejecución manual" -ForegroundColor Cyan
  }
}

# Configuración de la tarea
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive -RunLevel Limited

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# Registrar tarea
if ($Trigger) {
  Register-ScheduledTask -TaskName $TaskName `
    -Description $TaskDescription `
    -Action $Action `
    -Trigger $Trigger `
    -Principal $Principal `
    -Settings $Settings | Out-Null
} else {
  Register-ScheduledTask -TaskName $TaskName `
    -Description $TaskDescription `
    -Action $Action `
    -Principal $Principal `
    -Settings $Settings | Out-Null
}

Write-Host ""
Write-Host "✅ Tarea programada creada exitosamente" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Detalles de la tarea:" -ForegroundColor Cyan
Write-Host "   Nombre: $TaskName" -ForegroundColor White
Write-Host "   Frecuencia: $Frequency" -ForegroundColor White
if ($Frequency -eq 'Daily') {
  Write-Host "   Hora: $Time" -ForegroundColor White
} elseif ($Frequency -eq 'Weekly') {
  Write-Host "   Día: $DayOfWeek a las $Time" -ForegroundColor White
}
Write-Host "   Log: $LogPath" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Comandos útiles:" -ForegroundColor Cyan
Write-Host "   Ver tarea: Get-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
Write-Host "   Ejecutar ahora: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
Write-Host "   Ver log: Get-Content '$LogPath' -Tail 50" -ForegroundColor Yellow
Write-Host "   Eliminar tarea: Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
Write-Host ""

# Preguntar si quiere ejecutar ahora
$response = Read-Host "¿Deseas ejecutar la tarea ahora para probar? (S/N)"
if ($response -eq 'S' -or $response -eq 's') {
  Write-Host ""
  Write-Host "▶️  Ejecutando tarea..." -ForegroundColor Cyan
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  Write-Host "✓ Tarea iniciada. Revisa el log en: $LogPath" -ForegroundColor Green
}
