# configure-firewall.ps1
# Configura el firewall de Windows para permitir conexiones al servidor STC
# Requiere permisos de administrador

#Requires -RunAsAdministrator

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Configurar Firewall - STC Producción" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$port = 3002
$ruleName = "STC Producción API"

# Verificar si ya existe la regla
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "⚠️  Regla '$ruleName' ya existe" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "¿Deseas eliminarla y recrearla? (S/N)"
    
    if ($response -eq 'S' -or $response -eq 's') {
        Remove-NetFirewallRule -DisplayName $ruleName
        Write-Host "✓ Regla anterior eliminada" -ForegroundColor Green
    } else {
        Write-Host "Operación cancelada" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Creando regla de firewall..." -ForegroundColor Yellow
Write-Host ""

try {
    # Crear regla de entrada
    New-NetFirewallRule `
        -DisplayName $ruleName `
        -Direction Inbound `
        -LocalPort $port `
        -Protocol TCP `
        -Action Allow `
        -Profile Domain,Private `
        -Description "Permite acceso al servidor de Análisis Producción STC en puerto $port" | Out-Null
    
    Write-Host "✅ Regla de firewall creada exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Detalles de la regla:" -ForegroundColor Cyan
    Write-Host "  Nombre: $ruleName" -ForegroundColor White
    Write-Host "  Puerto: $port" -ForegroundColor White
    Write-Host "  Protocolo: TCP" -ForegroundColor White
    Write-Host "  Dirección: Entrada (Inbound)" -ForegroundColor White
    Write-Host "  Perfiles: Dominio, Privado" -ForegroundColor White
    Write-Host ""
    Write-Host "El servidor ahora es accesible desde otros equipos en la red" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "❌ Error al crear regla de firewall" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Solución alternativa:" -ForegroundColor Yellow
    Write-Host "  1. Abre 'Firewall de Windows Defender con seguridad avanzada'" -ForegroundColor White
    Write-Host "  2. Clic derecho en 'Reglas de entrada' > 'Nueva regla'" -ForegroundColor White
    Write-Host "  3. Tipo: Puerto" -ForegroundColor White
    Write-Host "  4. Protocolo: TCP, Puerto: $port" -ForegroundColor White
    Write-Host "  5. Acción: Permitir la conexión" -ForegroundColor White
    Write-Host "  6. Perfiles: Todos" -ForegroundColor White
    Write-Host "  7. Nombre: $ruleName" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Verificando regla..." -ForegroundColor Yellow
$rule = Get-NetFirewallRule -DisplayName $ruleName
if ($rule) {
    Write-Host "✓ Verificación exitosa" -ForegroundColor Green
    Write-Host ""
    Write-Host "Estado: $($rule.Enabled)" -ForegroundColor Gray
    Write-Host "Acción: $($rule.Action)" -ForegroundColor Gray
} else {
    Write-Host "⚠ No se pudo verificar la regla" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host " Configuración completada" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
