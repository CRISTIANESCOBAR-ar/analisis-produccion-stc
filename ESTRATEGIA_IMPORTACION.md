# ESTRATEGIA DE IMPORTACIÓN - FLUJO DE DATOS

**Fecha de definición:** 6 de diciembre de 2025  
**Autor:** Cristian Escobar  
**Estado:** CRÍTICO - NO MODIFICAR SIN APROBACIÓN

---

## 🎯 OBJETIVO

Evitar pérdida de datos históricos (2021-2025) en SQLite migrando desde Access de forma segura y confiable.

---

## 📊 ARQUITECTURA DE DATOS

### FUENTE 1: CSV HISTÓRICOS (Solo LECTURA INICIAL)
- **Ubicación:** `C:\analisis-produccion-stc\exports\tb_*.csv`
- **Contenido:** Datos históricos completos desde enero 2021 hasta octubre 2025
- **Uso:** IMPORTACIÓN INICIAL ÚNICA
- **Frecuencia:** Una sola vez (ya realizada)
- **Protección:** No tocar después de primera importación
- **Archivos:**
  - `tb_CALIDAD_2021_01.csv` ... `tb_CALIDAD_2025_10.csv` (60 archivos)
  - `tb_PRODUCCION_2021_01.csv` ... `tb_PRODUCCION_2025_10.csv`
  - `tb_PARADAS_2024_01.csv` ... `tb_PARADAS_2025_10.csv`
  - etc.

### FUENTE 2: XLSX OPERACIONALES (ACTUALIZACIONES INCREMENTALES)
- **Ubicación:** `C:\STC\rpt*.xlsx`
- **Contenido:** Datos NUEVOS o MODIFICADOS de días recientes (típicamente últimos 2-5 días)
- **Uso:** ACTUALIZACIÓN INCREMENTAL DIARIA/SEMANAL
- **Flujo:** User descarga → Importa → Sistema borra fechas → Inserta nuevos datos
- **Archivos principales:**
  - `rptAcompDiarioPBI.xlsx` → tb_CALIDAD
  - `rptProducaoMaquina.xlsx` → tb_PRODUCCION
  - `rptParadaMaquinaPRD.xlsx` → tb_PARADAS
  - `rptPrdTestesFisicos.xlsx` → tb_TESTES
  - `rptResiduosIndigo.xlsx` → tb_RESIDUOS_INDIGO
  - `rptResiduosPorSetor.xlsx` → tb_RESIDUOS_POR_SECTOR
  - `fichaArtigo.xlsx` → tb_FICHAS

---

## 🔄 FLUJO OPERACIONAL

### INICIALIZACIÓN (Una sola vez - YA HECHO)
```
1. SQLite vacío
2. Importar CSV históricos (2021-2025_10) → Llenar SQLite
3. Resultado: SQLite con 4+ años de datos históricos
4. NUNCA volver a ejecutar este paso
```

### ACTUALIZACIÓN DIARIA/SEMANAL (Repetible y segura)
```
1. Usuario descarga XLSX desde Access (últimos 2-5 días)
2. Usuario sube XLSX a la página de importación
3. Sistema detecta fechas presentes en XLSX
4. Sistema BORRA solo esas fechas de SQLite (ej: 2025-12-04, 2025-12-05)
5. Sistema inserta los datos nuevos del XLSX
6. Resultado: SQLite con datos históricos + datos nuevos actualizados
```

---

## ⚠️ REGLAS CRÍTICAS

### ❌ NUNCA HACER:
- ❌ Importar CSVs históricos nuevamente después de inicialización
- ❌ Usar `-ClearTable` con tb_CALIDAD, tb_PRODUCCION, etc. (tabla completa)
- ❌ Hacer TRUNCATE o DELETE sin fecha específica
- ❌ Cambiar el XLSX para incluir datos históricos completos
- ❌ Mezclar ambas fuentes en una sola importación
- ❌ Ejecutar import-csv-history.ps1 sin expreso consentimiento

### ✅ SIEMPRE HACER:
- ✅ Usar `DateColumn` para detectar fechas del XLSX
- ✅ Usar estrategia `date_delete` (borrar solo fechas presentes en XLSX)
- ✅ Verificar que el XLSX solo contiene días recientes (típicamente últimos 7 días)
- ✅ Confirmar el rango de fechas ANTES de importar
- ✅ Mantener un log de cada importación
- ✅ Hacer backup de la DB antes de importación crítica

---

## 🔒 PROTECCIÓN CONTRA ERRORES

### Validación pre-importación
```powershell
# ANTES de importar XLSX, ejecutar:
$xlsx = "C:\STC\rptAcompDiarioPBI.xlsx"
$data = Import-Excel -Path $xlsx -WorksheetName "report5" -NoHeader -StartRow 2
$fechas = $data | Select-Object -ExpandProperty P2 | 
          Where-Object {$_ -is [double]} | 
          ForEach-Object {[datetime]::FromOADate($_).ToString('yyyy-MM-dd')} | 
          Sort-Object -Unique

Write-Host "Fechas en XLSX: $($fechas[0]) a $($fechas[-1])"
Write-Host "Total fechas distintas: $($fechas.Count)"
# ⚠️ Si el rango es > 30 días, DETENER y verificar origen
```

### Backup automático
```powershell
# ANTES de cada importación XLSX:
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item -Path "C:\analisis-produccion-stc\database\produccion.db" `
          -Destination "C:\analisis-produccion-stc\database\backups\produccion_$timestamp.db"
```

---

## 📋 TABLAS Y ESTRATEGIAS ASIGNADAS

| Tabla | Archivo XLSX | DateColumn | Estrategia | Frecuencia |
|-------|--------------|-----------|-----------|-----------|
| tb_CALIDAD | rptAcompDiarioPBI.xlsx | DAT_PROD | date_delete | Diaria |
| tb_PRODUCCION | rptProducaoMaquina.xlsx | DT_BASE_PRODUCAO | date_delete | Diaria |
| tb_PARADAS | rptParadaMaquinaPRD.xlsx | DATA_BASE | date_delete | Diaria |
| tb_TESTES | rptPrdTestesFisicos.xlsx | DT_PROD | date_delete | Diaria |
| tb_RESIDUOS_INDIGO | rptResIndigo.xlsx | DT_MOV | date_delete | Semanal |
| tb_RESIDUOS_POR_SECTOR | rptResiduosPorSetor.xlsx | DT_MOV | date_delete | Semanal |
| tb_FICHAS | fichaArtigo.xlsx | (ninguna) | clear_table | Mensual |

---

## 🚨 SI ALGO SALE MAL

### Escenario: Se borraron datos históricos nuevamente

**Paso 1:** DETENER todo
```powershell
# NO ejecutar más importaciones
```

**Paso 2:** Restaurar desde backup más reciente
```powershell
$backup = Get-ChildItem "C:\analisis-produccion-stc\database\backups\" | 
          Sort-Object LastWriteTime -Descending | 
          Select-Object -First 1
Copy-Item -Path $backup.FullName -Destination "C:\analisis-produccion-stc\database\produccion.db" -Force
Write-Host "Restaurado: $($backup.Name)"
```

**Paso 3:** Investigar raíz del problema antes de reintentar

---

## 📝 REGISTRO DE IMPORTACIONES

Cada importación debe registrarse:

```sql
INSERT INTO import_log (fecha, tabla, tipo, registros, resultado, notas)
VALUES ('2025-12-06 10:30:00', 'tb_CALIDAD', 'date_delete', 1024, 'OK', 'Importó 2 fechas');
```

---

## ✓ CHECKLIST PRE-IMPORTACIÓN

- [ ] Backup de produccion.db realizado
- [ ] XLSX descargado desde Access reciente
- [ ] Verificado rango de fechas en XLSX (max 7 días)
- [ ] Tabla import_control consultada
- [ ] Validación pre-import ejecutada sin errores
- [ ] DateColumn confirmado en mapeo JSON
- [ ] Estrategia `date_delete` establecida (NO clear_table)
- [ ] Usuario entendido que solo se actualizarán fechas del XLSX

---

**CONCLUSIÓN:** Este es el flujo definitivo. No cambiar sin aprobación explícita.
