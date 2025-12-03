# =====================================================================
# START DEV - Limpieza y Arranque Seguro
# =====================================================================
# Este script asegura que no haya procesos "zombies" ocupando los puertos
# antes de iniciar la aplicación. Esto evita que VS Code se cuelgue
# o que aparezcan errores de "EADDRINUSE".
# =====================================================================

$ErrorActionPreference = 'SilentlyContinue'

Write-Host "🧹 Limpiando puertos y procesos anteriores..." -ForegroundColor Cyan

# 1. Matar procesos de Node.js que puedan haber quedado colgados
# (Opcional: ser más específico si tienes otros proyectos node corriendo)
# Stop-Process -Name "node" -Force 

# 2. Liberar puertos específicos (3002 API, 5173 Vite)
$ports = @(3002, 5173)
foreach ($port in $ports) {
    $tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($tcp) {
        Write-Host "   -> Liberando puerto $port (PID: $($tcp.OwningProcess))..." -ForegroundColor Yellow
        Stop-Process -Id $tcp.OwningProcess -Force
    }
}

Write-Host "🚀 Iniciando entorno de desarrollo..." -ForegroundColor Green
Write-Host "   - API: http://localhost:3002"
Write-Host "   - Web: http://localhost:5173"
Write-Host ""

# 3. Iniciar npm run start:all
npm run start:all
