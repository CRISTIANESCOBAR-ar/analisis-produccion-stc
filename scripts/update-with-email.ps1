# =====================================================================
# SCRIPT CON NOTIFICACIONES POR EMAIL
# =====================================================================
# Wrapper del update-all-tables.ps1 que envía email al finalizar
# Configura las credenciales SMTP según tu proveedor
# =====================================================================

param(
  [Parameter(Mandatory=$false)][switch]$Force,
  [Parameter(Mandatory=$false)][switch]$SkipHashCheck,
  
  # Configuración de email
  [Parameter(Mandatory=$false)][string]$SmtpServer = "smtp.gmail.com",
  [Parameter(Mandatory=$false)][int]$SmtpPort = 587,
  [Parameter(Mandatory=$false)][string]$From = "tu-email@gmail.com",
  [Parameter(Mandatory=$false)][string]$To = "destinatario@empresa.com",
  [Parameter(Mandatory=$false)][string]$Username = "tu-email@gmail.com",
  [Parameter(Mandatory=$false)][string]$Password = ""  # Usar app password de Gmail
)

$ErrorActionPreference = 'Continue'
$ScriptPath = "C:\analisis-stock-stc\scripts\update-all-tables.ps1"
$StartTime = Get-Date

Write-Host "🚀 Iniciando actualización con notificaciones por email..." -ForegroundColor Cyan
Write-Host ""

# Ejecutar script principal
$params = @{}
if ($Force) { $params['Force'] = $true }
if ($SkipHashCheck) { $params['SkipHashCheck'] = $true }

$output = & $ScriptPath @params 2>&1 | Tee-Object -Variable capturedOutput | Out-String

$EndTime = Get-Date
$Duration = ($EndTime - $StartTime)

# Determinar si hubo errores
$hasErrors = $LASTEXITCODE -ne 0 -or $output -match "❌|Error"
$subject = if ($hasErrors) { 
  "⚠️ Actualización BD con errores - $(Get-Date -Format 'dd/MM/yyyy HH:mm')" 
} else { 
  "✅ Actualización BD completada - $(Get-Date -Format 'dd/MM/yyyy HH:mm')" 
}

# Construir cuerpo del email en HTML
$htmlBody = @"
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
    .container { background-color: white; border-radius: 8px; padding: 30px; max-width: 800px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { border-bottom: 3px solid #0078d4; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { color: #0078d4; margin: 0; font-size: 24px; }
    .status { padding: 15px; border-radius: 5px; margin: 20px 0; }
    .status.success { background-color: #d4edda; border-left: 4px solid #28a745; }
    .status.error { background-color: #f8d7da; border-left: 4px solid #dc3545; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table th { background-color: #0078d4; color: white; padding: 10px; text-align: left; }
    .info-table td { padding: 10px; border-bottom: 1px solid #ddd; }
    .output { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; font-family: 'Consolas', monospace; font-size: 12px; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Actualización Base de Datos - Reporte Automático</h1>
    </div>
    
    <div class="status $(if ($hasErrors) { 'error' } else { 'success' })">
      <strong>$(if ($hasErrors) { '⚠️ Completada con errores' } else { '✅ Completada exitosamente' })</strong>
    </div>
    
    <table class="info-table">
      <tr>
        <th>Información</th>
        <th>Valor</th>
      </tr>
      <tr>
        <td><strong>Fecha y Hora</strong></td>
        <td>$($StartTime.ToString('dd/MM/yyyy HH:mm:ss'))</td>
      </tr>
      <tr>
        <td><strong>Duración</strong></td>
        <td>$([int]$Duration.TotalMinutes) min $([int]$Duration.Seconds) seg</td>
      </tr>
      <tr>
        <td><strong>Servidor</strong></td>
        <td>$env:COMPUTERNAME</td>
      </tr>
      <tr>
        <td><strong>Usuario</strong></td>
        <td>$env:USERNAME</td>
      </tr>
      <tr>
        <td><strong>Base de Datos</strong></td>
        <td>C:\analisis-stock-stc\database\produccion.db</td>
      </tr>
    </table>
    
    <h3>📋 Salida del Proceso:</h3>
    <div class="output">$($output -replace "`n", "<br>" -replace " ", "&nbsp;")</div>
    
    <div class="footer">
      <p>Este es un mensaje automático generado por el sistema de actualización de base de datos.</p>
      <p>Para más información, contacta al administrador del sistema.</p>
    </div>
  </div>
</body>
</html>
"@

# Enviar email si están configuradas las credenciales
if ($Password -and $From -ne "tu-email@gmail.com") {
  try {
    Write-Host "📧 Enviando notificación por email..." -ForegroundColor Cyan
    
    $securePassword = ConvertTo-SecureString $Password -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential($Username, $securePassword)
    
    $mailParams = @{
      From = $From
      To = $To
      Subject = $subject
      Body = $htmlBody
      BodyAsHtml = $true
      SmtpServer = $SmtpServer
      Port = $SmtpPort
      UseSsl = $true
      Credential = $credential
    }
    
    Send-MailMessage @mailParams
    
    Write-Host "✅ Email enviado exitosamente a: $To" -ForegroundColor Green
    
  } catch {
    Write-Host "❌ Error al enviar email: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Verifica las credenciales SMTP y la configuración" -ForegroundColor Yellow
  }
} else {
  Write-Host ""
  Write-Host "ℹ️  Notificación por email no configurada" -ForegroundColor Yellow
  Write-Host "   Para habilitar, configura los parámetros SMTP en el script:" -ForegroundColor Gray
  Write-Host "   - SmtpServer, SmtpPort, From, To, Username, Password" -ForegroundColor Gray
  Write-Host ""
  Write-Host "   Ejemplo de uso:" -ForegroundColor Cyan
  Write-Host '   .\update-with-email.ps1 -From "admin@empresa.com" -To "equipo@empresa.com" -Password "app-password"' -ForegroundColor White
}

Write-Host ""
exit $LASTEXITCODE
