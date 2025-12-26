# Guía de Despliegue en Red Local
## Análisis Producción STC - Acceso Multi-Usuario

**Fecha:** 26 de diciembre de 2025  
**Arquitectura:** PWA (Vue.js) + API REST (Express/Node.js) + SQLite

---

## 📋 Resumen Ejecutivo

### ✅ Lo que los usuarios **NO necesitan instalar:**
- Node.js
- Python
- PowerShell modules
- Dependencias npm
- SQLite3

### ✅ Lo que los usuarios **SÍ pueden hacer** (solo con navegador):
- ✅ Ver todos los dashboards y reportes
- ✅ Consultar datos (ROLADA, Fichas, Calidad, etc.)
- ✅ Exportar a Excel desde la interfaz web
- ✅ Copiar tablas como imágenes
- ✅ Usar la PWA instalada como app nativa
- ✅ Acceder desde cualquier dispositivo en la red local

### ⚠️ Lo que **requiere acceso al servidor:**
- ❌ Importar archivos CSV/XLSX nuevos
- ❌ Actualizar la base de datos
- ❌ Ejecutar scripts de mantenimiento
- ❌ Crear backups manuales

**Solución:** Solo 1-2 usuarios administradores necesitan acceso al servidor.

---

## 🖥️ Configuración del Servidor (Una sola vez)

### Requisitos del Servidor

**Hardware mínimo:**
- CPU: 2 cores
- RAM: 4 GB
- Disco: 10 GB libres
- Red: Ethernet 100 Mbps

**Software requerido (SOLO en servidor):**
```powershell
# Verificar instalaciones
node --version    # v18+
npm --version     # v9+
python --version  # 3.8+
```

### Paso 1: Preparar el Proyecto para Producción

```powershell
# En el servidor, navegar a la carpeta del proyecto
cd C:\analisis-produccion-stc

# Instalar dependencias (solo una vez)
npm install

# Build de producción del frontend
npm run build
```

### Paso 2: Configurar IP del Servidor

**Obtener IP local del servidor:**
```powershell
ipconfig | Select-String "IPv4"
# Ejemplo: 192.168.1.100
```

**Actualizar API para aceptar conexiones de red:**

Editar `scripts/sqlite-api-server.cjs` línea ~2677:

```javascript
// ANTES (solo localhost):
const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`)
})

// DESPUÉS (red local):
const PORT = process.env.PORT || 3002
const HOST = '0.0.0.0' // Escuchar en todas las interfaces
app.listen(PORT, HOST, () => {
  console.log(`API corriendo en http://0.0.0.0:${PORT}`)
  console.log(`Acceso red local: http://192.168.1.100:${PORT}`) // Tu IP
})
```

### Paso 3: Configurar Frontend para Producción

**Actualizar URLs en el código:**

Buscar y reemplazar en todos los archivos `.vue`:
```javascript
// ANTES:
fetch('http://localhost:3002/api/...')

// DESPUÉS:
fetch('http://192.168.1.100:3002/api/...') // IP del servidor
```

O mejor, usar variable de entorno:

Crear `.env.production`:
```env
VITE_API_URL=http://192.168.1.100:3002
```

Y en código:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'
fetch(`${API_URL}/api/...`)
```

### Paso 4: Servir Frontend con Express

**Editar `scripts/sqlite-api-server.cjs`:**

```javascript
const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()

// CORS para red local
app.use(cors({
  origin: '*',
  credentials: true
}))

app.use(express.json())

// ✅ AGREGAR: Servir archivos estáticos del build
app.use(express.static(path.join(__dirname, '../dist')))

// ... todas tus rutas API existentes ...

// ✅ AGREGAR: Catch-all para Vue Router (debe ir al final)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'))
})

const PORT = 3002
const HOST = '0.0.0.0'
app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://192.168.1.100:${PORT}`)
})
```

### Paso 5: Configurar Firewall de Windows

```powershell
# Permitir puerto 3002 en firewall
New-NetFirewallRule -DisplayName "STC Producción API" `
  -Direction Inbound `
  -LocalPort 3002 `
  -Protocol TCP `
  -Action Allow

# Verificar regla creada
Get-NetFirewallRule -DisplayName "STC Producción API"
```

### Paso 6: Crear Script de Inicio Automático

**Crear `start-server.ps1`:**

```powershell
# start-server.ps1
$ErrorActionPreference = 'Stop'

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Iniciando Servidor STC Producción" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Navegar al directorio del proyecto
Set-Location "C:\analisis-produccion-stc"

# Matar procesos existentes en puerto 3002
Write-Host "Verificando puerto 3002..." -ForegroundColor Yellow
$existingProcess = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($existingProcess) {
    $pid = $existingProcess.OwningProcess
    Write-Host "Deteniendo proceso existente (PID: $pid)..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force
    Start-Sleep -Seconds 2
}

# Iniciar API
Write-Host "Iniciando API en puerto 3002..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\analisis-produccion-stc; node scripts/sqlite-api-server.cjs" -WindowStyle Normal

Start-Sleep -Seconds 3

# Obtener IP local
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*" | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "✅ Servidor iniciado correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "Acceso desde este equipo:" -ForegroundColor Cyan
Write-Host "  http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "Acceso desde otros equipos en la red:" -ForegroundColor Cyan
Write-Host "  http://$ipAddress:3002" -ForegroundColor White
Write-Host ""
Write-Host "Presiona Ctrl+C en la ventana del servidor para detenerlo" -ForegroundColor Yellow
```

**Hacer ejecutable:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Paso 7: Inicio Automático con Windows (Opcional)

**Crear tarea programada:**

```powershell
# Crear tarea que inicia con Windows
$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -File C:\analisis-produccion-stc\start-server.ps1"

$Trigger = New-ScheduledTaskTrigger -AtStartup

$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "STC Producción Server" `
  -Action $Action `
  -Trigger $Trigger `
  -Principal $Principal `
  -Description "Inicia el servidor de Análisis Producción STC automáticamente"
```

---

## 👥 Acceso de Usuarios (Clientes)

### Requisitos de Cliente

**Hardware:**
- Cualquier PC, tablet o móvil
- Conexión a red local (WiFi o cable)

**Software:**
- ✅ Solo navegador moderno:
  - Chrome 90+
  - Edge 90+
  - Firefox 88+
  - Safari 14+

### Acceso desde Clientes

**Opción 1: Acceso Web directo**

Abrir navegador y navegar a:
```
http://192.168.1.100:3002
```

**Opción 2: Instalar como PWA (Recomendado)**

1. Abrir `http://192.168.1.100:3002` en Chrome/Edge
2. Buscar ícono de instalación (+) en barra de direcciones
3. Clic en "Instalar"
4. La app aparecerá como aplicación nativa

**Ventajas de PWA:**
- ✅ Icono en escritorio/menú inicio
- ✅ Ventana independiente sin barra de navegador
- ✅ Funciona offline con datos en caché
- ✅ Actualizaciones automáticas

### Crear Acceso Directo para Usuarios

**Script `create-client-shortcut.ps1`:**

```powershell
# create-client-shortcut.ps1
param(
    [string]$ServerIP = "192.168.1.100",
    [string]$DesktopPath = [Environment]::GetFolderPath("Desktop")
)

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut("$DesktopPath\Análisis Producción STC.url")
$Shortcut.TargetPath = "http://$ServerIP:3002"
$Shortcut.Save()

Write-Host "✅ Acceso directo creado en escritorio" -ForegroundColor Green
```

Ejecutar en cada PC cliente:
```powershell
.\create-client-shortcut.ps1 -ServerIP "192.168.1.100"
```

---

## 📤 Gestión de Actualizaciones de Datos

### Arquitectura de Actualización

```
┌─────────────────────────────────────────────────┐
│   USUARIOS FINALES (solo navegador)            │
│   - Ver reportes                                │
│   - Exportar Excel                              │
│   - Consultar datos                             │
└─────────────────────────────────────────────────┘
                    ↓ HTTP
┌─────────────────────────────────────────────────┐
│   SERVIDOR (Node.js + Express)                  │
│   - API REST (puerto 3002)                      │
│   - Servir frontend (archivos estáticos)       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│   BASE DE DATOS (SQLite)                        │
│   database/produccion.db (1.11 GB)             │
└─────────────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────────────┐
│   ADMINISTRADORES (1-2 usuarios)                │
│   - Acceso RDP/físico al servidor               │
│   - Ejecutan scripts de importación             │
│   - PowerShell + Python instalado               │
└─────────────────────────────────────────────────┘
```

### Workflow de Actualización

**Paso 1: Preparar archivos (Administrador)**

```powershell
# Los archivos XLSX se colocan en C:\STC\
# Ejemplo de estructura:
C:\STC\
  ├── fichaArtigo.xlsx
  ├── RelResIndigo.xlsx
  ├── rptProducaoMaquina.xlsx
  ├── rptAcompDiarioPBI.xlsx
  └── ...
```

**Paso 2: Ejecutar importación (Administrador)**

```powershell
cd C:\analisis-produccion-stc\scripts

# Importar todos los datos actualizados
.\import-all-fast.ps1

# O importar tabla específica
.\import-calidad-fast.ps1 -XlsxPath "C:\STC\rptAcompDiarioPBI.xlsx"
```

**Paso 3: Usuarios ven datos actualizados (Automático)**

Los usuarios simplemente **refrescan el navegador** (F5) y ven los datos nuevos.

### Alternativa: Upload Web (Desarrollo Futuro)

Para permitir uploads desde navegador sin acceso al servidor:

**Crear endpoint de upload:**

```javascript
// En sqlite-api-server.cjs
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })

app.post('/api/admin/upload-xlsx', upload.single('file'), (req, res) => {
  // Validar usuario admin
  // Guardar archivo
  // Ejecutar script de importación
  // Retornar resultado
})
```

**Agregar interfaz de upload en Vue:**

```vue
<template>
  <div class="admin-panel">
    <h2>Actualizar Datos</h2>
    <input type="file" accept=".xlsx,.csv" @change="uploadFile" />
    <button @click="importData">Importar</button>
  </div>
</template>
```

**Ventajas:**
- ✅ No requiere acceso RDP al servidor
- ✅ Los administradores pueden actualizar desde navegador
- ✅ Logs de auditoría

**Desventajas:**
- ❌ Requiere desarrollo adicional (2-3 días)
- ❌ Necesita autenticación/autorización
- ❌ Más complejo de mantener

---

## 🔒 Seguridad y Permisos

### Recomendaciones de Seguridad

1. **Red Local únicamente:**
   - No exponer puerto 3002 a Internet
   - Usar solo en red interna (192.168.x.x)

2. **Firewall:**
   - Permitir solo IPs de la red local
   ```powershell
   New-NetFirewallRule -DisplayName "STC API" `
     -RemoteAddress 192.168.1.0/24 `
     -LocalPort 3002 `
     -Action Allow
   ```

3. **Backups automáticos:**
   ```powershell
   # Backup diario a las 2 AM
   $Action = New-ScheduledTaskAction -Execute "powershell.exe" `
     -Argument "-Command Copy-Item C:\analisis-produccion-stc\database\produccion.db C:\Backups\produccion_$(Get-Date -f yyyyMMdd).db"
   
   $Trigger = New-ScheduledTaskTrigger -Daily -At 2am
   
   Register-ScheduledTask -TaskName "STC DB Backup" -Action $Action -Trigger $Trigger
   ```

4. **Autenticación básica (opcional):**
   ```javascript
   // En sqlite-api-server.cjs
   const basicAuth = require('express-basic-auth')
   
   app.use(basicAuth({
     users: { 'admin': 'password123' },
     challenge: true
   }))
   ```

---

## 📊 Monitoreo y Mantenimiento

### Verificar Estado del Servidor

**Script `check-server-status.ps1`:**

```powershell
$port = 3002
$connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet

if ($connection) {
    Write-Host "✅ Servidor corriendo en puerto $port" -ForegroundColor Green
    
    # Verificar acceso HTTP
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/api/health" -UseBasicParsing
        Write-Host "✅ API respondiendo correctamente" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Puerto abierto pero API no responde" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Servidor NO está corriendo" -ForegroundColor Red
    Write-Host "Ejecuta: .\start-server.ps1" -ForegroundColor Yellow
}
```

### Agregar Endpoint de Salud

**En `sqlite-api-server.cjs`:**

```javascript
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: fs.existsSync(DB_PATH) ? 'connected' : 'error',
    uptime: process.uptime()
  })
})
```

### Logs de Acceso

```javascript
const morgan = require('morgan')
const fs = require('fs')
const path = require('path')

// Crear stream de logs
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, '../logs/access.log'),
  { flags: 'a' }
)

// Log de requests
app.use(morgan('combined', { stream: accessLogStream }))
```

---

## 🚀 Despliegue Paso a Paso (Checklist)

### En el Servidor

- [ ] 1. Instalar Node.js, Python, PowerShell
- [ ] 2. Clonar/copiar proyecto a `C:\analisis-produccion-stc`
- [ ] 3. Ejecutar `npm install`
- [ ] 4. Actualizar IP en `sqlite-api-server.cjs`
- [ ] 5. Configurar servir archivos estáticos
- [ ] 6. Ejecutar `npm run build`
- [ ] 7. Configurar firewall (puerto 3002)
- [ ] 8. Crear script `start-server.ps1`
- [ ] 9. Configurar inicio automático (opcional)
- [ ] 10. Iniciar servidor: `.\start-server.ps1`
- [ ] 11. Verificar acceso: `http://localhost:3002`

### En Clientes

- [ ] 1. Conectar a red local
- [ ] 2. Abrir Chrome/Edge
- [ ] 3. Navegar a `http://192.168.1.100:3002`
- [ ] 4. Instalar PWA (recomendado)
- [ ] 5. Crear acceso directo en escritorio (opcional)
- [ ] 6. Verificar funcionalidad completa

### Administradores

- [ ] 1. Obtener credenciales RDP/acceso físico al servidor
- [ ] 2. Documentar ubicación de archivos XLSX (`C:\STC\`)
- [ ] 3. Capacitación en scripts de importación
- [ ] 4. Establecer cronograma de actualizaciones
- [ ] 5. Configurar backups automáticos

---

## 🆘 Resolución de Problemas

### Problema: "No se puede acceder al servidor"

**Solución:**
```powershell
# 1. Verificar servidor corriendo
Test-NetConnection -ComputerName 192.168.1.100 -Port 3002

# 2. Verificar firewall
Get-NetFirewallRule -DisplayName "STC*"

# 3. Verificar IP del servidor
ipconfig

# 4. Reiniciar servidor
.\start-server.ps1
```

### Problema: "Error al cargar datos"

**Solución:**
```powershell
# 1. Verificar base de datos existe
Test-Path C:\analisis-produccion-stc\database\produccion.db

# 2. Verificar permisos
icacls C:\analisis-produccion-stc\database\produccion.db

# 3. Ver logs del servidor (en consola Node.js)
```

### Problema: "PWA no se instala"

**Solución:**
- Verificar que el manifest.json se sirva correctamente
- Usar HTTPS (o localhost)
- Verificar que los iconos existan en `/public/icon-*.png`

---

## 📞 Contacto y Soporte

**Documentación adicional:**
- [PWA_GUIDE.md](PWA_GUIDE.md) - Guía PWA
- [SUPABASE_ANALYSIS.md](SUPABASE_ANALYSIS.md) - Análisis cloud
- [README.md](README.md) - General del proyecto

**Administrador del sistema:**
- Ubicación servidor: [Agregar ubicación física]
- Usuario admin: [Agregar nombre]
- Contacto: [Agregar email/teléfono]
