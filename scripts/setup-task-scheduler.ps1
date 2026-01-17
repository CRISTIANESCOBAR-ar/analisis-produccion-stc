# =====================================================================
# CONFIGURACION DE TASK SCHEDULER PARA ALERTAS AUTOMATICAS
# =====================================================================
# Crea tareas programadas para reportes diarios y alertas
# =====================================================================

#Requires -RunAsAdministrator

param(
    [string]$EmailTo = "produccion@stc.com",
    [string]$EmailFrom = "alertas@stc.com",
    [int]$HoraReporte = 7  # 7 AM
)

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CONFIGURACION DE TASK SCHEDULER" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$scriptRoot = "C:\analisis-produccion-stc"
$alertScript = "$scriptRoot\scripts\alert-system.cjs"
$reportScript = "$scriptRoot\scripts\send-daily-report.ps1"

# =====================================================================
# 1. VERIFICAR SCRIPTS
# =====================================================================
Write-Host "🔍 Verificando scripts..." -ForegroundColor Yellow

if (-not (Test-Path $alertScript)) {
    Write-Host "❌ No encontrado: $alertScript" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $reportScript)) {
    Write-Host "❌ No encontrado: $reportScript" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Scripts encontrados" -ForegroundColor Green

# =====================================================================
# 2. VERIFICAR NODE.JS
# =====================================================================
Write-Host ""
Write-Host "🔍 Verificando Node.js..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no instalado" -ForegroundColor Red
    Write-Host "   Instala desde: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# =====================================================================
# 3. CREAR TAREA: VERIFICACION DE ALERTAS (Cada 2 horas)
# =====================================================================
Write-Host ""
Write-Host "📅 Creando tarea: Verificación de Alertas..." -ForegroundColor Yellow

$taskName1 = "STC-AlertSystem-Verificacion"

# Eliminar si ya existe
$existingTask = Get-ScheduledTask -TaskName $taskName1 -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "   Eliminando tarea existente..." -ForegroundColor Gray
    Unregister-ScheduledTask -TaskName $taskName1 -Confirm:$false
}

# Acción: ejecutar node con el script de alertas
$action1 = New-ScheduledTaskAction `
    -Execute "node.exe" `
    -Argument "`"$alertScript`"" `
    -WorkingDirectory $scriptRoot

# Trigger: cada 2 horas, de 7 AM a 7 PM
$trigger1 = New-ScheduledTaskTrigger -Once -At 7:00AM -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration (New-TimeSpan -Hours 12)

# Settings
$settings1 = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew

# Principal (ejecutar como usuario actual)
$principal1 = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType S4U `
    -RunLevel Highest

# Registrar tarea
Register-ScheduledTask `
    -TaskName $taskName1 `
    -Action $action1 `
    -Trigger $trigger1 `
    -Settings $settings1 `
    -Principal $principal1 `
    -Description "Verificación automática de alertas de producción STC cada 2 horas" | Out-Null

Write-Host "✅ Tarea creada: $taskName1" -ForegroundColor Green
Write-Host "   Ejecuta cada 2 horas de 7 AM a 7 PM" -ForegroundColor Gray

# =====================================================================
# 4. CREAR TAREA: REPORTE DIARIO (7 AM)
# =====================================================================
Write-Host ""
Write-Host "📅 Creando tarea: Reporte Diario..." -ForegroundColor Yellow

$taskName2 = "STC-ReporteDiario"

# Eliminar si ya existe
$existingTask2 = Get-ScheduledTask -TaskName $taskName2 -ErrorAction SilentlyContinue
if ($existingTask2) {
    Write-Host "   Eliminando tarea existente..." -ForegroundColor Gray
    Unregister-ScheduledTask -TaskName $taskName2 -Confirm:$false
}

# Acción: ejecutar PowerShell con el script de reporte
$action2 = New-ScheduledTaskAction `
    -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$reportScript`" -EmailTo `"$EmailTo`" -EmailFrom `"$EmailFrom`"" `
    -WorkingDirectory $scriptRoot

# Trigger: diario a las 7 AM
$trigger2 = New-ScheduledTaskTrigger -Daily -At "$($HoraReporte):00AM"

# Settings
$settings2 = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

# Principal
$principal2 = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType S4U `
    -RunLevel Highest

# Registrar tarea
Register-ScheduledTask `
    -TaskName $taskName2 `
    -Action $action2 `
    -Trigger $trigger2 `
    -Settings $settings2 `
    -Principal $principal2 `
    -Description "Reporte diario de producción STC con alertas por email" | Out-Null

Write-Host "✅ Tarea creada: $taskName2" -ForegroundColor Green
Write-Host "   Ejecuta diariamente a las ${HoraReporte}:00 AM" -ForegroundColor Gray

# =====================================================================
# 5. CREAR DIRECTORIO DE LOGS
# =====================================================================
Write-Host ""
Write-Host "📁 Creando directorio de logs..." -ForegroundColor Yellow

$logsDir = "$scriptRoot\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
    Write-Host "✅ Directorio creado: $logsDir" -ForegroundColor Green
} else {
    Write-Host "   Ya existe: $logsDir" -ForegroundColor Gray
}

# =====================================================================
# 6. PROBAR EJECUCION
# =====================================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  PRUEBA DE EJECUCION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$response = Read-Host "¿Deseas ejecutar una prueba ahora? (S/n)"
if ($response -ne "n" -and $response -ne "N") {
    Write-Host ""
    Write-Host "🧪 Ejecutando sistema de alertas..." -ForegroundColor Cyan
    Write-Host ""
    
    try {
        & node $alertScript
        Write-Host ""
        Write-Host "✅ Prueba completada" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

# =====================================================================
# 7. RESUMEN
# =====================================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CONFIGURACION COMPLETADA" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Tareas creadas:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. $taskName1" -ForegroundColor White
Write-Host "     → Ejecuta cada 2 horas (7 AM - 7 PM)" -ForegroundColor Gray
Write-Host "     → Verifica alertas y guarda en logs/alerts.log" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. $taskName2" -ForegroundColor White
Write-Host "     → Ejecuta diariamente a las ${HoraReporte}:00 AM" -ForegroundColor Gray
Write-Host "     → Genera reporte HTML y envía por email" -ForegroundColor Gray
Write-Host "     → Destinatario: $EmailTo" -ForegroundColor Gray
Write-Host ""

Write-Host "📊 Ver tareas en Task Scheduler:" -ForegroundColor Yellow
Write-Host "   taskschd.msc" -ForegroundColor White
Write-Host ""

Write-Host "🧪 Probar manualmente:" -ForegroundColor Yellow
Write-Host "   node scripts\alert-system.cjs" -ForegroundColor White
Write-Host "   .\scripts\send-daily-report.ps1" -ForegroundColor White
Write-Host ""

Write-Host "📂 Logs guardados en:" -ForegroundColor Yellow
Write-Host "   $logsDir" -ForegroundColor White
Write-Host ""

Write-Host "⚙️ Configurar emails:" -ForegroundColor Yellow
Write-Host "   Edita scripts\send-daily-report.ps1" -ForegroundColor White
Write-Host "   Configura credenciales SMTP" -ForegroundColor White
Write-Host ""

Write-Host "✅ Sistema de alertas listo para funcionar" -ForegroundColor Green
Write-Host ""

# =====================================================================
# 8. ABRIR TASK SCHEDULER
# =====================================================================
$response2 = Read-Host "¿Deseas abrir Task Scheduler para ver las tareas? (S/n)"
if ($response2 -ne "n" -and $response2 -ne "N") {
    Start-Process "taskschd.msc"
}
