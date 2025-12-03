# Script para liberar puertos 3002 (API) y 5173 (Vite)
$ports = @(3002, 5173)

foreach ($port in $ports) {
    $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($tcp) {
        Write-Host "Matando proceso en puerto $port (PID: $($tcp.OwningProcess))..." -ForegroundColor Yellow
        Stop-Process -Id $tcp.OwningProcess -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "Puerto $port libre." -ForegroundColor Green
    }
}
