# Exportación de Access a CSV - Guía de Instalación

## Problema
Office 32-bit instalado impide usar ACE OLEDB 64-bit desde PowerShell.

## Soluciones (elige una)

### Opción 1: Python + pyodbc (Recomendada) ⭐

1. **Instalar Python:**
   ```powershell
   winget install Python.Python.3.12
   ```
   Luego cierra y reabre PowerShell.

2. **Instalar pyodbc:**
   ```powershell
   pip install pyodbc
   ```

3. **Ejecutar exportación:**
   ```powershell
   python scripts\export-access.py
   ```

### Opción 2: Exportación Manual desde Access

1. Abre `C:\STC\rptProdTec.accdb` en Access
2. Para cada tabla:
   - Clic derecho → Exportar → Archivo de texto
   - Formato: Delimitado, coma como delimitador
   - Guardar en `C:\analisis-stock-stc\exports\[NombreTabla].csv`

### Opción 3: UCanAccess (Java - sin Office)

1. **Descargar UCanAccess:**
   https://sourceforge.net/projects/ucanaccess/files/

2. **Extraer y usar:**
   ```powershell
   java -jar ucanaccess-console.jar
   # Luego ejecutar comandos SQL para exportar
   ```

### Opción 4: PowerShell con ADODB COM (32-bit)

Crear script VBS que se ejecuta en 32-bit y llama ADODB. Complejo pero funciona.

## Siguiente paso después de exportar

Una vez tengas los CSV en `exports/`:

```powershell
# Instalar SQLite
winget install SQLite.SQLite

# Importar a SQLite
.\scripts\import-to-sqlite.ps1 -CsvDir '.\exports' -SqlitePath '.\exports\prodtec.db'
```

## ¿Cuál método prefieres?

- **Rápido y simple**: Opción 2 (manual desde Access)
- **Automatizado**: Opción 1 (Python, requiere instalar Python)
- **Sin Office/ACE**: Opción 3 (UCanAccess con Java)
