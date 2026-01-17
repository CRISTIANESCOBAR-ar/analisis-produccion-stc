# =====================================================================
# ENVIO AUTOMATICO DE REPORTE DIARIO
# =====================================================================
# Ejecuta verificaciones y envía reporte por email
# Programar con Task Scheduler: 7:00 AM diario
# =====================================================================

param(
    [string]$EmailTo = "produccion@stc.com",
    [string]$EmailFrom = "alertas@stc.com",
    [string]$SmtpServer = "smtp.office365.com",
    [int]$SmtpPort = 587
)

$ErrorActionPreference = "Stop"
$ReportDate = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  REPORTE DIARIO - $ReportDate" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan

# =====================================================================
# 1. EJECUTAR SISTEMA DE ALERTAS
# =====================================================================
Write-Host "`n🔍 Ejecutando verificaciones..." -ForegroundColor Yellow

$alertOutput = node scripts\alert-system.cjs 2>&1
$alertsDetected = $alertOutput -match "TOTAL ALERTAS: (\d+)"

if ($matches) {
    $totalAlerts = [int]$matches[1]
    Write-Host "   Alertas detectadas: $totalAlerts" -ForegroundColor $(if ($totalAlerts -gt 0) { "Red" } else { "Green" })
} else {
    $totalAlerts = 0
}

# =====================================================================
# 2. GENERAR METRICAS DEL DIA
# =====================================================================
Write-Host "`n📊 Generando métricas..." -ForegroundColor Yellow

$dbPath = "database\produccion.db"

# Métrica: Producción total
$produccionQuery = @"
SELECT SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) 
FROM tb_PRODUCCION 
WHERE SELETOR = 'TECELAGEM' AND DATE(DT_BASE_PRODUCAO) = '$ReportDate'
"@
$produccionTotal = sqlite3 $dbPath "$produccionQuery"

# Métrica: Calidad promedio
$calidadQuery = @"
SELECT 
    ROUND(100.0 * SUM(CASE WHEN QUALIDADE LIKE '%1ERA%' THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM tb_CALIDAD 
WHERE DATE(DAT_PROD) = '$ReportDate' AND EMP = 'STC'
"@
$calidadPromedio = sqlite3 $dbPath "$calidadQuery"

# Métrica: Horas de parada
$paradasQuery = @"
SELECT SUM(CAST(REPLACE(DURACAO, ',', '.') AS REAL)) 
FROM tb_PARADAS 
WHERE DATE(DT_INICIAL) = '$ReportDate'
"@
$horasParada = sqlite3 $dbPath "$paradasQuery"

# =====================================================================
# 3. GENERAR HTML DEL REPORTE
# =====================================================================
$htmlReport = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
        .metric-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 32px; font-weight: bold; color: #2563eb; }
        .metric-label { font-size: 14px; color: #6b7280; margin-top: 5px; }
        .alert-section { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .success-section { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: 600; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Reporte Diario de Producción</h1>
        <p>Fecha: $ReportDate</p>
    </div>

    <div class="metrics">
        <div class="metric-card">
            <div class="metric-value">$(if ($produccionTotal) { [math]::Round($produccionTotal, 0) } else { 0 })m</div>
            <div class="metric-label">Metros Producidos</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">$(if ($calidadPromedio) { $calidadPromedio } else { 0 })%</div>
            <div class="metric-label">Calidad Promedio</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">$(if ($horasParada) { [math]::Round($horasParada, 1) } else { 0 })h</div>
            <div class="metric-label">Horas de Parada</div>
        </div>
    </div>

    $(if ($totalAlerts -gt 0) {
        @"
    <div class="alert-section">
        <h2>⚠️ Alertas Detectadas: $totalAlerts</h2>
        <p>Se detectaron situaciones que requieren atención. Consulte el log detallado en el sistema.</p>
    </div>
"@
    } else {
        @"
    <div class="success-section">
        <h2>✅ Sin Alertas</h2>
        <p>Todos los indicadores dentro de los parámetros normales.</p>
    </div>
"@
    })

    <div class="footer">
        <p>Este reporte fue generado automáticamente por el Sistema de Análisis de Producción STC.</p>
        <p>Generado: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")</p>
    </div>
</body>
</html>
"@

# =====================================================================
# 4. ENVIAR EMAIL
# =====================================================================
Write-Host "`n📧 Preparando envío de email..." -ForegroundColor Yellow

try {
    # Configurar credenciales (usar variables de entorno en producción)
    # $credential = Get-Credential -Message "Credenciales SMTP"
    
    # O usar credenciales almacenadas:
    # $credential = Import-Clixml -Path "C:\secure\smtp-credentials.xml"
    
    $emailParams = @{
        To         = $EmailTo
        From       = $EmailFrom
        Subject    = "📊 Reporte Diario Producción - $ReportDate $(if ($totalAlerts -gt 0) { "⚠️ $totalAlerts Alertas" })"
        Body       = $htmlReport
        BodyAsHtml = $true
        SmtpServer = $SmtpServer
        Port       = $SmtpPort
        UseSsl     = $true
        # Credential = $credential
    }
    
    # Descomentar para enviar realmente:
    # Send-MailMessage @emailParams
    
    Write-Host "✅ Email preparado (descomentар Send-MailMessage para enviar)" -ForegroundColor Green
    
    # Guardar copia local
    $reportPath = "logs\reporte-$ReportDate.html"
    $htmlReport | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host "📄 Reporte guardado: $reportPath" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error enviando email: $_" -ForegroundColor Red
}

Write-Host "`n✅ Proceso completado" -ForegroundColor Green
