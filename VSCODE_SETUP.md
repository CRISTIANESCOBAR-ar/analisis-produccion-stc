# Configuración Óptima de VS Code para el Proyecto

## Extensiones Esenciales (Instalación Mínima)

### Imprescindibles (Instalar Primero)

1. **Vue - Official** 
   - ID: `Vue.volar`
   - Propósito: Soporte completo para Vue 3, syntax highlighting, IntelliSense
   - **CRÍTICO**: Sin esta extensión no podrás trabajar con componentes .vue

2. **ESLint**
   - ID: `dbaeumer.vscode-eslint`
   - Propósito: Detectar errores de código JavaScript/Vue en tiempo real
   - Usa la configuración del proyecto (eslint.config.cjs)

3. **Python**
   - ID: `ms-python.python`
   - Propósito: Ejecutar scripts de importación y análisis (.py en /scripts)
   - Necesario para batch-import, analyze_db, etc.

### Muy Útiles (Instalar Después)

4. **Prettier - Code formatter**
   - ID: `esmodules.prettier-vscode`
   - Propósito: Formateo consistente de código
   - Configurado en proyecto (postcss.config.js)

5. **Path Intellisense**
   - ID: `christian-kohler.path-intellisense`
   - Propósito: Autocompletado al escribir rutas de archivos
   - Evita errores de importación

### Opcional (Solo si no causa lag)

6. **GitLens**
   - ID: `eamodio.gitlens`
   - Propósito: Ver historial Git inline, autores de líneas
   - **NOTA**: Puede ralentizar VSCode en proyectos grandes. Probar primero.

7. **GitHub Copilot** (Si tienes suscripción)
   - ID: `GitHub.copilot`
   - Propósito: Asistente de código con IA
   - Requiere: Cuenta de GitHub con suscripción Copilot activa
   - Instalación:
     ```powershell
     code --install-extension GitHub.copilot
     ```
   - Después de instalar:
     1. Presiona `Ctrl+Shift+P` > "GitHub Copilot: Sign In"
     2. Autoriza en el navegador
     3. Verifica ícono de Copilot en barra inferior

---

## Configuración Recomendada

Después de instalar extensiones, agregar a **Settings (JSON)**:

**Archivo**: `.vscode/settings.json` o Settings > Open Settings (JSON)

```json
{
  // Performance
  "editor.formatOnSave": false,
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  
  // ESLint
  "eslint.run": "onSave",
  "eslint.validate": [
    "javascript",
    "vue"
  ],
  
  // Vue
  "vue.server.maxFileSize": 20000000,
  "vue.updateImportsOnFileMove.enabled": true,
  
  // Python
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/Scripts/python.exe",
  
  // Editor
  "editor.tabSize": 2,
  "editor.detectIndentation": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  
  // Performance (si sigue lento)
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/node_modules/**": true,
    "**/database/**": true,
    "**/.venv/**": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/database": true,
    "**/.venv": true
  }
}
```

---

## Extensiones que NO Instalar (Causan Lag)

❌ **Evitar**:
- Copilot múltiples (si ya tienes GitHub Copilot, no instales otros)
- Live Preview/Live Server (no usados en este proyecto - usamos Vite)
- Temas pesados con animaciones
- Multiple formatters del mismo tipo
- Extensiones de lenguajes no usados (Ruby, Go, Rust, etc.)
- Docker/Kubernetes (no se usan aquí)
- Remote Development (si no trabajas remoto)

---

## Verificación Post-Instalación

### 1. Verificar Vue funciona
- Abrir `src/components/CalidadSectoresTabla.vue`
- Debe tener colores de syntax
- Ctrl+Space debe mostrar autocompletado

### 2. Verificar ESLint funciona
- Ver panel PROBLEMS (Ctrl+Shift+M)
- Deben aparecer warnings de ESLint si hay código sin usar

### 3. Verificar Python funciona
- Abrir `scripts/analyze_db_performance.py`
- Ver barra inferior: debe mostrar Python 3.x (.venv)
- Click en intérprete para seleccionar `.venv`

---

## Solución de Problemas

### VSCode sigue lento después de reinstalar

1. **Deshabilitar búsqueda indexada**:
   ```json
   "search.followSymlinks": false,
   "files.watcherExclude": {
     "**/database/**": true
   }
   ```

2. **Verificar procesos**:
   - Abrir Task Manager
   - Buscar `Code.exe` y `node.exe`
   - Si hay >5 procesos de Code, cerrar VSCode completamente

3. **Limpiar caché VSCode**:
   ```powershell
   Remove-Item -Recurse -Force "$env:APPDATA\Code\Cache"
   Remove-Item -Recurse -Force "$env:APPDATA\Code\CachedData"
   ```

4. **Base de datos grande**:
   - El archivo `database/analisis_produccion_stc.db` (~100MB) puede causar lag
   - Agregarlo a `files.watcherExclude` (ver configuración arriba)

---

## Comandos Útiles Post-Instalación

```powershell
# Verificar extensiones instaladas
code --list-extensions

# Desinstalar extensión específica
code --uninstall-extension <extension-id>

# Ver tamaño carpeta .vscode
Get-ChildItem "$env:USERPROFILE\.vscode\extensions" | Measure-Object -Property Length -Sum
```

---

## Resumen: Instalación Rápida

```powershell
# Instalar solo esenciales (copiar todo junto)
code --install-extension Vue.volar
code --install-extension dbaeumer.vscode-eslint
code --install-extension ms-python.python
code --install-extension esmodules.prettier-vscode
code --install-extension christian-kohler.path-intellisense
```

**Total**: 5 extensiones = ~50MB
**Tiempo**: 2-3 minutos

---

## Cómo Volver al Proyecto

### Limpieza Completa de VSCode (Reinstalación desde Cero)

Si VSCode está muy lento o con problemas, puedes hacer una limpieza completa:

**Paso 1: Ejecutar script de limpieza**
```powershell
# En la carpeta del proyecto
.\cleanup-vscode.ps1
```
Este script automáticamente:
- ✅ Cierra VSCode
- ✅ Desinstala la aplicación
- ✅ Elimina todas las extensiones
- ✅ Borra configuraciones de usuario
- ✅ Limpia caché y temporales
- ✅ Limpia registro (si es admin)

⚠️ **ADVERTENCIA**: Esto borrará TODAS tus configuraciones y extensiones de VSCode, no solo de este proyecto.

**Paso 2: Descargar e instalar VSCode nuevo**
https://code.visualstudio.com/download

**Paso 3: Instalar extensiones esenciales**
```powershell
# Extensiones básicas
code --install-extension Vue.volar
code --install-extension dbaeumer.vscode-eslint
code --install-extension ms-python.python
code --install-extension esmodules.prettier-vscode
code --install-extension christian-kohler.path-intellisense

# GitHub Copilot (si tienes suscripción)
code --install-extension GitHub.copilot
```

Después de instalar Copilot:
1. `Ctrl+Shift+P` > "GitHub Copilot: Sign In"
2. Autorizar en el navegador con tu cuenta GitHub
3. Verificar ícono de Copilot en barra inferior (debe estar activo)

**Paso 4: Aplicar configuración recomendada** (ver sección "Configuración Recomendada" arriba)

---

### Después de Reinstalar VSCode

**Opción 1: Abrir Carpeta Local (Recomendado)**
```powershell
# Simplemente abrir VSCode y:
# File > Open Folder > Seleccionar: C:\analisis-produccion-stc
```
✅ **Ventaja**: Todo está configurado (node_modules, .venv, database, git)

**Opción 2: Clonar desde GitHub (Solo si perdiste la carpeta)**
```powershell
cd C:\
git clone https://github.com/CRISTIANESCOBAR-ar/analisis-produccion-stc.git
cd analisis-produccion-stc

# Reinstalar dependencias
npm install

# Crear y activar entorno Python
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
⚠️ **Solo necesario si borraste la carpeta o trabajas en otra PC**

### Verificación Rápida

Después de abrir el proyecto:
1. ✅ Terminal debe mostrar: `PS C:\analisis-produccion-stc>`
2. ✅ Barra inferior debe detectar Python (.venv)
3. ✅ Archivos `.vue` deben tener colores
4. ✅ Panel Git debe mostrar rama actual

### Iniciar Servidor de Desarrollo

```powershell
# Terminal en VSCode
npm run dev
```
Abrir: http://localhost:5173

---

## Notas Finales

- Reiniciar VSCode después de instalar extensiones
- Python debe detectar automáticamente el `.venv`
- Si Volar no funciona, recarga ventana: Ctrl+Shift+P > "Reload Window"
- El proyecto usa Vite para dev server (puerto 5173)
- Base de datos en `/database` - no editar directo
- **La carpeta local ya tiene todo**: no necesitas clonar de nuevo desde GitHub

**Última actualización**: 28 enero 2026
