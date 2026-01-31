# 🔄 Guía Rápida: Sincronización de Columnas CSV → SQLite

## 📋 Problema

Cuando un archivo CSV tiene columnas nuevas que no existen en la tabla SQLite, esas columnas se **ignoran** durante la importación. Para capturar esos datos, necesitas agregar las columnas a SQLite.

---

## ✅ Soluciones Disponibles

### **Opción 1: Sincronizar UNA Tabla Específica**

#### Vista Previa (no aplica cambios):
```powershell
.\scripts\sync-table-columns.ps1 `
  -CsvPath "C:\STC\CSV\rptAcompDiarioPBI.csv" `
  -SqlitePath "database\produccion.db" `
  -TableName "tb_CALIDAD"
```

#### Aplicar Cambios:
```powershell
.\scripts\sync-table-columns.ps1 `
  -CsvPath "C:\STC\CSV\rptAcompDiarioPBI.csv" `
  -SqlitePath "database\produccion.db" `
  -TableName "tb_CALIDAD" `
  -AutoAdd
```

#### Aplicar + Re-importar datos históricos:
```powershell
.\scripts\sync-table-columns.ps1 `
  -CsvPath "C:\STC\CSV\rptAcompDiarioPBI.csv" `
  -SqlitePath "database\produccion.db" `
  -TableName "tb_CALIDAD" `
  -AutoAdd -Reimport
```

---

### **Opción 2: Sincronizar TODAS las Tablas a la Vez**

#### Vista Previa (detecta diferencias en todas las tablas):
```powershell
.\scripts\sync-all-tables.ps1 -CsvFolder "C:\STC\CSV"
```

#### Aplicar Cambios en TODAS:
```powershell
.\scripts\sync-all-tables.ps1 -CsvFolder "C:\STC\CSV" -AutoAdd
```

#### Aplicar + Re-importar TODO:
```powershell
.\scripts\sync-all-tables.ps1 -CsvFolder "C:\STC\CSV" -AutoAdd -Reimport
```

---

### **Opción 3: Manualmente con SQL**

Si prefieres control total, ejecuta comandos SQL directamente:

```powershell
# Abrir SQLite
sqlite3 database/produccion.db

# Agregar columna
ALTER TABLE tb_CALIDAD ADD COLUMN "DEFEITO MANCHA" TEXT;

# Verificar
PRAGMA table_info(tb_CALIDAD);

# Salir
.exit

# Re-importar para capturar datos
.\scripts\import-calidad-fast.ps1 `
  -XlsxPath "C:\STC\CSV\rptAcompDiarioPBI.csv" `
  -SqlitePath "database\produccion.db"
```

---

## 🎯 Caso Específico: tb_CALIDAD con "DEFEITO MANCHA"

Según tu screenshot, necesitas agregar estas columnas a `tb_CALIDAD`:

**Columnas EXTRA detectadas:**
- PE?A (problema de codificación, probablemente PEÇA)
- G.PR
- TURNO LAVAD (duplicada)
- TURNO PESAGEM
- **DEFEITO MANCHA** ← La nueva que mencionaste

### Comando Recomendado:

```powershell
# Opción A: Solo agregar columnas (rápido)
.\scripts\sync-table-columns.ps1 `
  -CsvPath "C:\STC\CSV\rptAcompDiarioPBI.csv" `
  -SqlitePath "database\produccion.db" `
  -TableName "tb_CALIDAD" `
  -AutoAdd
```

```powershell
# Opción B: Agregar + Reimportar (captura datos históricos)
.\scripts\sync-table-columns.ps1 `
  -CsvPath "C:\STC\CSV\rptAcompDiarioPBI.csv" `
  -SqlitePath "database\produccion.db" `
  -TableName "tb_CALIDAD" `
  -AutoAdd -Reimport
```

**Recomendación:** Usa la **Opción B** si quieres capturar los valores históricos de "DEFEITO MANCHA" en los registros que ya están en la base de datos.

---

## 📊 ¿Qué Hacen los Scripts?

| Script | Función |
|--------|---------|
| **sync-table-columns.ps1** | Sincroniza **UNA** tabla específica |
| **sync-all-tables.ps1** | Sincroniza **TODAS** las tablas automáticamente |

### Flujo de `sync-table-columns.ps1`:

1. ✅ Lee columnas del CSV
2. ✅ Lee columnas de la tabla SQLite
3. ✅ Compara y detecta diferencias
4. ✅ Genera comandos `ALTER TABLE` para columnas EXTRA
5. ✅ (Opcional) Aplica los cambios con `-AutoAdd`
6. ✅ (Opcional) Re-importa datos con `-Reimport`

### Características:

- ✅ **Seguro:** Por defecto solo muestra vista previa
- ✅ **Informativo:** Muestra exactamente qué columnas se agregarán
- ✅ **Automático:** Puede aplicar cambios sin intervención manual
- ✅ **Flexible:** Funciona con CSV delimitados por comas o tabulaciones

---

## ⚠️ Notas Importantes

### **1. Columnas Duplicadas**

Si el CSV tiene columnas con el mismo nombre (como "TURNO LAVAD" aparece 2 veces), SQLite solo creará una. Esto puede causar pérdida de datos. Revisa el CSV origen.

### **2. Problema de Codificación**

Observo que hay columnas con caracteres incorrectos:
- `PE?A` en lugar de `PEÇA`
- `G.PR` vs `G#PR`

Esto sugiere un problema de codificación UTF-8. El script funcionará, pero los nombres de columnas en SQLite quedarán con los caracteres incorrectos del CSV.

### **3. Re-importación**

Cuando usas `-Reimport`:
- Se **borran** registros del mismo día/período
- Se **re-importan** desde el CSV
- Esto captura los valores de las columnas nuevas en datos históricos

---

## 🚀 Flujo Recomendado

### Para tu caso (tb_CALIDAD):

```powershell
# 1. Vista previa (ver qué se agregará)
.\scripts\sync-table-columns.ps1 `
  -CsvPath "C:\STC\CSV\rptAcompDiarioPBI.csv" `
  -SqlitePath "database\produccion.db" `
  -TableName "tb_CALIDAD"

# 2. Si todo se ve bien, aplicar + reimportar
.\scripts\sync-table-columns.ps1 `
  -CsvPath "C:\STC\CSV\rptAcompDiarioPBI.csv" `
  -SqlitePath "database\produccion.db" `
  -TableName "tb_CALIDAD" `
  -AutoAdd -Reimport

# 3. Verificar en el dashboard que los warnings desaparecieron
```

---

## 🔍 Verificación

Después de sincronizar, verifica:

```powershell
# Ver estructura actualizada
sqlite3 database/produccion.db "PRAGMA table_info(tb_CALIDAD);"

# Contar columnas
sqlite3 database/produccion.db "SELECT COUNT(*) FROM pragma_table_info('tb_CALIDAD');"

# Ver si "DEFEITO MANCHA" tiene datos
sqlite3 database/produccion.db "SELECT COUNT(*), COUNT(\"DEFEITO MANCHA\") FROM tb_CALIDAD WHERE \"DEFEITO MANCHA\" IS NOT NULL;"
```

---

## 📈 Próxima Importación

Después de sincronizar, las siguientes importaciones:
- ✅ Ya NO mostrarán warnings de columnas faltantes
- ✅ Capturarán automáticamente los datos de "DEFEITO MANCHA"
- ✅ El dashboard mostrará 0 diferencias

---

## 💡 Tips

1. **Backup primero:**
   ```powershell
   Copy-Item "database\produccion.db" "database\produccion_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
   ```

2. **Automatizar sincronización periódica:**
   - Ejecuta `sync-all-tables.ps1` mensualmente
   - O cuando veas warnings en el dashboard

3. **Mantener documentación:**
   - Anota cuándo agregas columnas nuevas
   - Documenta qué significan (para futuros análisis)

---

## 🆘 Solución de Problemas

### Error: "Tabla no encontrada"
→ Verifica que el nombre de la tabla sea exacto (mayúsculas/minúsculas)

### Error: "Archivo CSV no encontrado"
→ Verifica la ruta del CSV con `Test-Path "C:\STC\CSV\rptAcompDiarioPBI.csv"`

### Las columnas se agregaron pero no hay datos
→ Necesitas re-importar con `-Reimport` para capturar datos históricos

### El warning sigue apareciendo después de sincronizar
→ Refresca el dashboard o ejecuta otra importación

---

## 📞 Resumen Ejecutivo

**Para resolver tu caso específico (DEFEITO MANCHA en tb_CALIDAD):**

```powershell
# Ejecuta esto y listo:
.\scripts\sync-table-columns.ps1 `
  -CsvPath "C:\STC\CSV\rptAcompDiarioPBI.csv" `
  -SqlitePath "database\produccion.db" `
  -TableName "tb_CALIDAD" `
  -AutoAdd -Reimport
```

Esto:
1. Agrega "DEFEITO MANCHA" y las demás columnas faltantes a SQLite
2. Re-importa los datos para capturar valores históricos
3. Elimina los warnings del dashboard
4. Futuras importaciones capturarán automáticamente esos datos
