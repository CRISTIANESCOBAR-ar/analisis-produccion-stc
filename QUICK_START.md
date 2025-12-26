# 🚀 Resumen Rápido: Despliegue en Red Local

## ✅ Respuesta a tus Preguntas

### 1. ¿Los usuarios deben instalar dependencias?

**❌ NO** - Los usuarios finales **solo necesitan un navegador moderno** (Chrome/Edge).

### 2. ¿Pueden usar todas las opciones sin instalar nada?

**✅ SÍ** - Pueden:
- Ver todos los dashboards
- Consultar datos (ROLADA, Fichas, Calidad, Producción)
- Exportar a Excel
- Copiar tablas como imágenes  
- Instalar la PWA como aplicación nativa

### 3. ¿Quién necesita dependencias?

**Solo 1-2 administradores** que actualizan datos en el servidor:
- Node.js (ya instalado)
- Python (ya instalado)
- PowerShell (incluido en Windows)

---

## 📦 Deployment en 3 Pasos

### **PASO 1: Configurar Servidor (Una sola vez)**

```powershell
# En el servidor
cd C:\analisis-produccion-stc

# Build del frontend
npm run build

# Configurar firewall (requiere admin)
.\configure-firewall.ps1

# Iniciar servidor
.\start-server.ps1
```

El servidor mostrará:
```
🌐 Acceso:
   Local:     http://localhost:3002
   Red local: http://192.168.1.100:3002
```

### **PASO 2: Configurar Clientes (Cada PC)**

En cada PC de usuario:

```powershell
# Crear acceso directo en escritorio
.\create-client-shortcut.ps1 -ServerIP "192.168.1.100"
```

O manualmente:
1. Abrir Chrome/Edge
2. Ir a `http://192.168.1.100:3002`
3. Clic en ícono (+) → "Instalar aplicación"

### **PASO 3: Verificar Estado**

```powershell
# En el servidor
.\check-server-status.ps1
```

---

## 🔄 Actualizar Datos (Solo Administradores)

### Ubicación de archivos:
```
C:\STC\
  ├── fichaArtigo.xlsx
  ├── RelResIndigo.xlsx
  ├── rptProducaoMaquina.xlsx
  ├── rptAcompDiarioPBI.xlsx
  └── ...
```

### Ejecutar importación:
```powershell
cd C:\analisis-produccion-stc\scripts

# Importar todos
.\import-all-fast.ps1

# O importar específico
.\import-calidad-fast.ps1 -XlsxPath "C:\STC\rptAcompDiarioPBI.xlsx"
```

### Usuarios ven cambios:
**Automático** - Solo refrescar navegador (F5)

---

## 📊 Arquitectura

```
┌─────────────────────────────────┐
│   USUARIOS (5 concurrentes)     │
│   - Solo navegador               │
│   - Ver reportes                 │
│   - Exportar Excel               │
└─────────────────────────────────┘
              ↓ HTTP
┌─────────────────────────────────┐
│   SERVIDOR (1 PC)                │
│   - Express API (puerto 3002)    │
│   - Sirve frontend (Vue)         │
│   - IP: 192.168.1.100            │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│   BASE DE DATOS                  │
│   - SQLite (1.11 GB)             │
│   - database/produccion.db       │
└─────────────────────────────────┘
              ↑
┌─────────────────────────────────┐
│   ADMINISTRADORES (1-2)          │
│   - Acceso RDP al servidor       │
│   - Ejecutan scripts PowerShell  │
│   - Actualizan datos             │
└─────────────────────────────────┘
```

---

## 🛠️ Scripts Disponibles

| Script | Descripción | Usuario |
|--------|-------------|---------|
| `start-server.ps1` | Inicia servidor con validaciones | Admin |
| `check-server-status.ps1` | Verifica estado del servidor | Admin |
| `configure-firewall.ps1` | Configura firewall (una vez) | Admin |
| `create-client-shortcut.ps1` | Crea acceso directo | Cualquiera |
| `import-all-fast.ps1` | Importa todos los datos | Admin |
| `import-*-fast.ps1` | Importa tabla específica | Admin |

---

## ✅ Ventajas de esta Arquitectura

1. **Sin instalaciones en clientes**
   - Solo navegador moderno
   - PWA instalable como app nativa

2. **Centralización**
   - Un solo servidor administra todo
   - Datos actualizados para todos simultáneamente

3. **Performance**
   - Red local (latencia <5ms)
   - No depende de Internet

4. **Bajo mantenimiento**
   - Solo 1-2 admins necesitan conocimientos técnicos
   - Usuarios finales no requieren capacitación técnica

5. **Escalable**
   - Soporta 5-20 usuarios sin problemas
   - Fácil migrar a cloud si crece

---

## 🔍 Monitoreo

### Verificar servidor corriendo:
```powershell
.\check-server-status.ps1
```

### Ver logs en tiempo real:
La ventana del servidor muestra todas las peticiones.

### Verificar desde cliente:
Abrir `http://192.168.1.100:3002/api/health`

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2025-12-26T...",
  "database": "connected",
  "uptime": 3600
}
```

---

## ❓ Solución de Problemas

### "No puedo acceder desde otro PC"

1. Verificar firewall:
```powershell
Get-NetFirewallRule -DisplayName "STC*"
```

2. Hacer ping al servidor:
```powershell
ping 192.168.1.100
```

3. Verificar puerto:
```powershell
Test-NetConnection -ComputerName 192.168.1.100 -Port 3002
```

### "El servidor no inicia"

1. Verificar puerto libre:
```powershell
Get-NetTCPConnection -LocalPort 3002
```

2. Matar proceso existente:
```powershell
Stop-Process -Id <PID> -Force
```

3. Reiniciar servidor:
```powershell
.\start-server.ps1
```

---

## 📞 Documentación Completa

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Guía técnica detallada
- **[PWA_GUIDE.md](PWA_GUIDE.md)** - Características PWA
- **[SUPABASE_ANALYSIS.md](SUPABASE_ANALYSIS.md)** - Análisis cloud vs local

---

## 🎯 Próximos Pasos Recomendados

1. **Implementar en servidor:**
   ```powershell
   npm run build
   .\configure-firewall.ps1
   .\start-server.ps1
   ```

2. **Probar con 1-2 usuarios piloto:**
   - Verificar acceso desde otras PCs
   - Validar todas las funcionalidades
   - Recoger feedback

3. **Desplegar a todos los usuarios:**
   - Crear accesos directos
   - Capacitación básica (5 min)
   - Instalar PWA

4. **Configurar backups automáticos:**
   - Task Scheduler para backup diario
   - Carpeta: `C:\Backups\`

5. **Establecer rutina de actualizaciones:**
   - Frecuencia: Diaria/Semanal
   - Responsable: Admin designado
   - Horario: Fuera de horario pico
