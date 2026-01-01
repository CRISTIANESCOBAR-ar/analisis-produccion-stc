# 🚀 Guía de Optimización de VSCode

## Problema
VSCode se congela, cierra o responde lento, especialmente al cambiar entre aplicaciones.

## Soluciones Implementadas

### 1. ✅ Configuración Optimizada (.vscode/settings.json)
Se han añadido configuraciones para:
- Excluir archivos grandes del monitoreo
- Limitar memoria de TypeScript
- Reducir número de editores abiertos
- Desactivar animaciones pesadas
- Optimizar Git
- Reducir watchers de archivos

### 2. 🧹 Script de Limpieza
Ejecuta el script de optimización:
```powershell
.\scripts\optimize-vscode.ps1
```

## Soluciones Adicionales

### A. Cerrar Archivos Innecesarios
1. **Cerrar pestaña actual**: `Ctrl+W`
2. **Cerrar todas las pestañas**: `Ctrl+K W`
3. **Cerrar otros editores**: `Ctrl+K Ctrl+W`

### B. Recargar VSCode Sin Cerrar
1. Presiona `Ctrl+Shift+P`
2. Escribe `Reload Window`
3. Presiona Enter

Esto reinicia VSCode sin cerrar la ventana, liberando memoria.

### C. Limpiar Terminales
Si tienes muchas terminales abiertas:
1. Click derecho en el panel de terminales
2. "Kill All Terminals"

### D. Desactivar Extensiones Temporalmente
Para identificar si una extensión causa el problema:
1. `Ctrl+Shift+P` > "Extensions: Disable All Installed Extensions for this Workspace"
2. Si mejora, activa extensiones de una en una para identificar la culpable

### E. Extensiones Conocidas por Causar Lentitud
- **ESLint/Prettier** en proyectos grandes con muchos archivos
- **Auto Import** con muchos archivos
- **GitLens** con repositorios grandes
- **IntelliCode** en proyectos con muchas dependencias

### F. Aumentar Límites del Sistema (Windows)
Si el problema persiste, aumenta los límites de file watchers:

1. Abre PowerShell como Administrador
2. Ejecuta:
```powershell
# Aumentar límite de handles
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" -Name "Size" -Value 3
```

3. Reinicia la computadora

### G. Modo de Rendimiento de Windows
1. Configuración > Sistema > Energía
2. Selecciona "Máximo rendimiento"

### H. Cerrar Otros Procesos Pesados
Verifica procesos que consumen mucha RAM:
```powershell
Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10 Name, @{Name='MemoryMB';Expression={[math]::Round($_.WorkingSet/1MB, 2)}}
```

### I. Archivos Específicos del Proyecto

#### Archivos Grandes Excluidos Automáticamente:
- ❌ `database/backups/*.db` (1+ GB)
- ❌ `*.csv` (archivos de datos)
- ❌ `*.txt` (logs de análisis)
- ❌ `*.sql` (queries temporales)

#### No Abrir Estos Archivos en VSCode:
- `database/produccion.db` (312 MB)
- `AF311006E5561_CALIDAD.csv` (47 MB)
- Backups de base de datos

## Comandos Rápidos de VSCode

| Comando | Acción |
|---------|--------|
| `Ctrl+K W` | Cerrar todas las pestañas |
| `Ctrl+Shift+P > Reload` | Recargar ventana |
| `Ctrl+Shift+P > Clear` | Limpiar consola de desarrollador |
| `Alt+Shift+F` | Formatear documento (desactivar si es lento) |
| `Ctrl+P` | Búsqueda rápida de archivos |

## Monitoreo de Rendimiento

### Ver Uso de Recursos de VSCode:
1. `Ctrl+Shift+P`
2. Escribe "Developer: Open Process Explorer"
3. Verás qué extensiones/procesos consumen más CPU/RAM

### Ver Output de Extensiones:
1. `Ctrl+Shift+U` (Output panel)
2. Selecciona la extensión del dropdown
3. Busca errores o warnings

## Configuración Recomendada de Hardware

Para trabajar cómodamente con este proyecto:
- **RAM**: Mínimo 8 GB, recomendado 16 GB
- **CPU**: 4 núcleos o más
- **SSD**: Recomendado (mejora significativamente el rendimiento)

## Buenas Prácticas

### ✅ Hacer:
- Cerrar archivos que no uses
- Usar búsqueda rápida (`Ctrl+P`) en lugar de explorador
- Recargar ventana cada 2-3 horas de trabajo intenso
- Mantener solo 1-2 terminales abiertas

### ❌ Evitar:
- Abrir archivos .db o .csv muy grandes
- Tener más de 10 pestañas abiertas simultáneamente
- Buscar texto en todo el proyecto sin filtros
- Tener múltiples instancias de VSCode con el mismo proyecto

## Si Nada Funciona

1. **Reinstalar VSCode**:
   - Desinstala completamente
   - Elimina: `%APPDATA%\Code`
   - Reinstala versión estable

2. **Usar VSCode Insiders** (versión de desarrollo con últimas optimizaciones)

3. **Alternativas Ligeras**:
   - Visual Studio Code Exploration (modo ligero)
   - Sublime Text para archivos grandes
   - Notepad++ para edición rápida

## Contacto y Soporte

Si el problema persiste después de aplicar estas soluciones:
1. Documenta cuándo ocurre exactamente
2. Captura screenshot del Process Explorer
3. Verifica logs de VSCode en: `%APPDATA%\Code\logs`

---

**Última actualización**: 31 de diciembre de 2025
