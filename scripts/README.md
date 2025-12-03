# 📚 Sistema de Actualización Incremental XLSX → SQLite

## 🎯 Descripción General

Sistema automatizado para importar datos desde archivos Excel (XLSX) a SQLite con detección inteligente de cambios. Solo importa cuando los archivos han sido modificados, optimizando tiempo y recursos.

---

## 🗂️ Estructura de Archivos

```
scripts/
├── import-xlsx-to-sqlite.ps1       # Importador individual de tabla
├── update-all-tables.ps1            # Actualizador automático de todas las tablas
├── mappings/                        # Definiciones de mapeo Excel → SQLite
│   ├── tb_FICHAS.json
│   ├── tb_RESIDUOS_INDIGO.json
│   ├── tb_RESIDUOS_POR_SECTOR.json
│   ├── tb_TESTES.json
│   ├── tb_PARADAS.json
│   ├── tb_PRODUCCION.json
│   └── tb_CALIDAD.json
└── sql/
    ├── control_importaciones.sql    # Tabla de control de estado
    └── schema_mappings.sql
```

---

## 🚀 Uso Rápido

### Actualización Automática (Recomendado)

```powershell
# Actualizar todas las tablas (solo las que cambiaron)
pwsh -File "scripts\update-all-tables.ps1"

# Forzar actualización aunque no haya cambios
pwsh -File "scripts\update-all-tables.ps1" -Force

# Omitir verificación de hash MD5 (solo fecha de modificación)
pwsh -File "scripts\update-all-tables.ps1" -SkipHashCheck
```

### Importación Manual de Tabla Individual

```powershell
# Tabla CON fecha (delete-before-insert por fecha)
pwsh -File "scripts\import-xlsx-to-sqlite.ps1" `
  -XlsxPath "C:\STC\rptProducaoMaquina.xlsx" `
  -Sheet "report1" `
  -SqlitePath "database\produccion.db" `
  -Table "tb_PRODUCCION" `
  -DateColumn "DT_BASE_PRODUCAO" `
  -MappingSource json `
  -MappingJson "scripts\mappings\tb_PRODUCCION.json"

# Tabla SIN fecha (borrado completo + insert)
pwsh -File "scripts\import-xlsx-to-sqlite.ps1" `
  -XlsxPath "C:\STC\fichaArtigo.xlsx" `
  -Sheet "lista de tecidos" `
  -SqlitePath "database\produccion.db" `
  -Table "tb_FICHAS" `
  -ClearTable `
  -MappingSource json `
  -MappingJson "scripts\mappings\tb_FICHAS.json"
```

---

## 📋 Configuración de Tablas

### tb_FICHAS
- **Archivo**: `C:\STC\fichaArtigo.xlsx`
- **Hoja**: `lista de tecidos`
- **Columnas**: 68
- **Estrategia**: Borrado completo (sin fecha)
- **Clave única**: `ARTIGO CODIGO`

### tb_RESIDUOS_INDIGO
- **Archivo**: `C:\STC\RelResIndigo.xlsx`
- **Hoja**: `Índigo`
- **Columnas**: 4
- **Columna fecha**: `DT_MOV`
- **Estrategia**: Delete por fecha + Insert

### tb_RESIDUOS_POR_SECTOR
- **Archivo**: `C:\STC\rptResiduosPorSetor.xlsx`
- **Hoja**: `Setor`
- **Columnas**: 13
- **Columna fecha**: `DT_MOV`
- **Estrategia**: Delete por fecha + Insert

### tb_TESTES
- **Archivo**: `C:\STC\rptPrdTestesFisicos.xlsx`
- **Hoja**: `report2`
- **Columnas**: 26
- **Columna fecha**: `DT_PROD`
- **Estrategia**: Delete por fecha + Insert

### tb_PARADAS
- **Archivo**: `C:\STC\rptParadaMaquinaPRD.xlsx`
- **Hoja**: `report1`
- **Columnas**: 54
- **Columna fecha**: `DATA_BASE`
- **Estrategia**: Delete por fecha + Insert

### tb_PRODUCCION
- **Archivo**: `C:\STC\rptProducaoMaquina.xlsx`
- **Hoja**: `report1`
- **Columnas**: 66
- **Columna fecha**: `DT_BASE_PRODUCAO`
- **Estrategia**: Delete por fecha + Insert

### tb_CALIDAD
- **Archivo**: `C:\STC\rptAcompDiarioPBI.xlsx`
- **Hoja**: `report1`
- **Columnas**: 83
- **Columna fecha**: `DAT_PROD`
- **Estrategia**: Delete por fecha + Insert

---

## 🔍 Detección de Cambios

El sistema detecta cambios en archivos XLSX mediante:

1. **Fecha de modificación del archivo**: Compara `LastWriteTime` con registro previo
2. **Hash MD5 del archivo**: Verifica integridad del contenido (opcional con `-SkipHashCheck`)
3. **Registro en SQLite**: Tabla `import_control` mantiene estado de última importación

### Tabla de Control

```sql
CREATE TABLE import_control (
  tabla_destino TEXT PRIMARY KEY,
  xlsx_path TEXT NOT NULL,
  xlsx_sheet TEXT NOT NULL,
  last_import_date TEXT NOT NULL,      -- Última fecha de importación
  xlsx_last_modified TEXT NOT NULL,    -- Fecha modificación archivo XLSX
  xlsx_hash TEXT NOT NULL,             -- MD5 hash del archivo
  rows_imported INTEGER NOT NULL,      -- Filas importadas
  mapping_json_path TEXT,
  date_column TEXT,                    -- NULL si usa -ClearTable
  import_strategy TEXT NOT NULL,       -- 'date_delete' o 'clear_table'
  notes TEXT
);
```

---

## 🛠️ Transformaciones Disponibles

Las transformaciones se definen en los archivos JSON de mapeo:

| Transformación | Descripción | Ejemplo |
|----------------|-------------|---------|
| `trim` | Elimina espacios al inicio/final | `" texto "` → `"texto"` |
| `uppercase` | Convierte a mayúsculas | `"texto"` → `"TEXTO"` |
| `lowercase` | Convierte a minúsculas | `"TEXTO"` → `"texto"` |
| `date_iso` | Formatea fecha a ISO 8601 | `"02/12/2024"` → `"2024-12-02 00:00:00"` |
| `decimal_comma` | Convierte decimal regional a punto | `"1.234,56"` → `"1234.56"` |

---

## 📊 Características Especiales

### Manejo de Columnas Duplicadas
- Detecta automáticamente headers duplicados en Excel
- Genera nombres únicos con sufijos: `_1`, `_2`, etc.
- Ejemplo: `TOTAL MINUTOS TUR` → `TOTAL MINUTOS TUR`, `TOTAL MINUTOS TUR_1`, `TOTAL MINUTOS TUR_2`

### Filtrado de Filas Basura
- Elimina automáticamente filas repetidas de encabezados
- Filtra totalizadores intercalados en datos
- Detecta: primera columna vacía o igual al nombre del header

### Optimización de Batch Size
- **80+ columnas**: batch size = 5 (evita límites de comando)
- **60-80 columnas**: batch size = 10
- **40-60 columnas**: batch size = 20
- **< 40 columnas**: batch size = 50

### Estrategias de Importación

#### 1. Delete por fecha + Insert (tablas CON fecha)
- Extrae fechas distintas del XLSX
- Borra solo registros con esas fechas en SQLite
- Inserta datos nuevos del XLSX
- **Ventaja**: Preserva datos históricos no incluidos en XLSX actual

#### 2. Clear Table + Insert (tablas SIN fecha)
- Borra TODA la tabla antes de importar
- Inserta datos completos del XLSX
- **Ventaja**: Garantiza sincronización total con archivo fuente

---

## 🔄 Workflow Típico de Actualización

### Escenario 1: Actualización Mensual Completa
```powershell
# 1. Usuario descarga reportes actualizados desde sistema origen a C:\STC\
# 2. Ejecutar actualización automática
cd C:\analisis-stock-stc
pwsh -File "scripts\update-all-tables.ps1"
# 3. Solo se importan archivos que cambiaron
```

### Escenario 2: Actualización de Solo 1 Tabla
```powershell
# 1. Usuario reemplaza solo rptProducaoMaquina.xlsx
# 2. Ejecutar actualización automática
pwsh -File "scripts\update-all-tables.ps1"
# 3. Solo tb_PRODUCCION se importa, resto se omite (sin cambios)
```

### Escenario 3: Forzar Re-importación Completa
```powershell
# Útil para debugging o corrección de errores
pwsh -File "scripts\update-all-tables.ps1" -Force
```

---

## 📈 Salida del Script

### Ejecución Normal
```
╔════════════════════════════════════════════════════════════╗
║   ACTUALIZACIÓN INCREMENTAL AUTOMÁTICA - XLSX → SQLITE    ║
╚════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Tabla: tb_FICHAS (fichaArtigo.xlsx)

  📅 Fecha modificada: 2024-12-01 10:30:00 → 2024-12-02 08:15:00
  🚀 Iniciando importación...
  ✅ Importación exitosa: 1767 filas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Tabla: tb_PRODUCCION (rptProducaoMaquina.xlsx)

  ✅ Sin cambios desde última importación (2024-12-01 11:00:00)

╔════════════════════════════════════════════════════════════╗
║                    RESUMEN DE EJECUCIÓN                    ║
╚════════════════════════════════════════════════════════════╝

  ✅ Tablas importadas:  1
  ⏭️  Tablas omitidas:    6
  ❌ Errores:            0
  ⏱️  Tiempo total:       0 min 12 seg

🎉 Actualización completada exitosamente!
```

---

## 🐛 Troubleshooting

### Error: "Archivo XLSX no encontrado"
- Verificar que archivos estén en `C:\STC\`
- Revisar nombres exactos en `update-all-tables.ps1`

### Error: "cannot commit - no transaction is active"
- Es una advertencia cosmética de sqlite3 CLI
- La importación se completa correctamente
- No afecta integridad de datos

### Error: "Duplicate column names"
- El script maneja esto automáticamente
- Genera sufijos únicos para columnas duplicadas
- Verificar que el mapeo JSON use nombres correctos con sufijos

### Importación lenta con tablas grandes
- Tablas 60k+ filas pueden tomar 5-10 minutos
- Es normal por procesamiento batch y transformaciones
- Considerar ejecutar en horario no crítico

---

## 📞 Comandos Útiles

### Ver Estado de Última Importación
```powershell
sqlite3 "database\produccion.db" "SELECT tabla_destino, last_import_date, rows_imported FROM import_control ORDER BY last_import_date DESC;"
```

### Resetear Control de Tabla Específica
```powershell
sqlite3 "database\produccion.db" "DELETE FROM import_control WHERE tabla_destino='tb_FICHAS';"
```

### Contar Registros por Tabla
```powershell
sqlite3 "database\produccion.db" "
  SELECT 'tb_PRODUCCION' as tabla, COUNT(*) as registros FROM tb_PRODUCCION
  UNION ALL SELECT 'tb_CALIDAD', COUNT(*) FROM tb_CALIDAD
  UNION ALL SELECT 'tb_PARADAS', COUNT(*) FROM tb_PARADAS
  UNION ALL SELECT 'tb_TESTES', COUNT(*) FROM tb_TESTES
  UNION ALL SELECT 'tb_RESIDUOS_POR_SECTOR', COUNT(*) FROM tb_RESIDUOS_POR_SECTOR
  UNION ALL SELECT 'tb_RESIDUOS_INDIGO', COUNT(*) FROM tb_RESIDUOS_INDIGO
  UNION ALL SELECT 'tb_FICHAS', COUNT(*) FROM tb_FICHAS;"
```

---

## 📅 Mantenimiento Recomendado

### Semanal
- Ejecutar `update-all-tables.ps1` después de recibir reportes nuevos

### Mensual
- Verificar conteo de registros vs expectativas
- Revisar log de importaciones en `import_control`

### Trimestral
- Revisar y optimizar índices en SQLite
- Analizar tiempos de importación para ajustar batch sizes

---

## 🔐 Requisitos del Sistema

- **PowerShell**: 5.1 o superior
- **Módulo ImportExcel**: Instalado (`Install-Module ImportExcel -Scope CurrentUser`)
- **sqlite3 CLI**: Instalado en PATH (instalable vía `winget install sqlite.sqlite`)
- **Espacio en disco**: ~200 MB para base de datos SQLite

---

## 📝 Notas Importantes

1. **tb_FICHAS** no tiene columna de fecha, siempre se borra completamente antes de importar
2. Archivos XLSX deben estar en `C:\STC\` con nombres exactos
3. Nombres de hojas Excel son case-sensitive
4. Las transformaciones `decimal_comma` son críticas para campos numéricos con formato regional
5. El sistema NO modifica los archivos XLSX originales

---

## 🎯 Próximos Pasos Sugeridos

1. **Optimización de esquema**: Agregar PKs compuestas e índices adicionales
2. **Tarea programada**: Configurar Task Scheduler para ejecución automática
3. **Notificaciones**: Agregar envío de email con resumen de importaciones
4. **Dashboard**: Crear vista web con Vue.js para visualizar datos importados
