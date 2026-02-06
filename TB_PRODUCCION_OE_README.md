# Tabla: tb_PRODUCCION_OE

## 📋 Descripción
Tabla que almacena datos de producción de máquinas **Open End** (OE) del sector de hilandería.

## 📁 Origen de Datos
- **Archivo fuente**: `rptProducaoOE.xlsx` / `rptProducaoOE.csv`
- **Ubicación**: `C:\STC\`
- **Hoja Excel**: Sheet1
- **Sistema origen**: Sistema de producción STC

## 🔧 Script de Importación
- **Script**: [`scripts/import-produccion-oe-fast.ps1`](scripts/import-produccion-oe-fast.ps1)
- **Estrategia**: `fast_csv` (conversión XLSX → CSV → SQLite)
- **Características**:
  - ✅ Elimina encabezados duplicados
  - ✅ Normaliza FILIAL (5 → 05)
  - ✅ Normaliza MAQUINA (agrega ceros a la izquierda)
  - ✅ Convierte fechas a formato DD/MM/YYYY
  - ✅ Elimina columnas sin nombre (Unnamed)
  - ✅ Crea índices automáticos

## 📊 Estructura de la Tabla

### Columnas Principales

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `FILIAL` | TEXT | Código de filial (normalizado con ceros: 05) |
| `LOC. FISICO` | TEXT | Ubicación física de la máquina |
| `MAQUINA` | TEXT | Código de máquina (5 dígitos con ceros) |
| `NOME_MAQUINA` | TEXT | Nombre de la máquina (ej: "OPEN END II") |
| `DATA_PRODUCAO` | TEXT | Fecha de producción (formato DD/MM/YYYY) |
| `TURNO` | TEXT | Turno (A, B, C) |
| `LADO` | TEXT | Lado de la máquina |
| `ITEM` | TEXT | Código del artículo producido |
| `DESC ITEM` | TEXT | Descripción del artículo |

### Columnas de Tiempos y Configuración

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `HORA INICIAL` | TEXT | Hora de inicio de producción |
| `HORA FINAL` | TEXT | Hora de fin de producción |
| `TEMPO` | TEXT | Tiempo total de producción |
| `RPM` | TEXT | Revoluciones por minuto |
| `NUM FUSOS` | TEXT | Número de husos |

### Columnas de Producción

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `PROD MT/MIN` | TEXT | Producción en metros por minuto |
| `PROD KG/HR` | TEXT | Producción en kilogramos por hora |
| `PROD CALCULADA` | TEXT | Producción calculada (valor numérico) |
| `PROD INFORMADA` | TEXT | Producción informada manualmente |

### Columnas de Eficiencia

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `EFIC CALCULADA` | TEXT | Eficiencia calculada (porcentaje) |
| `EFIC INFORMADA` | TEXT | Eficiencia informada manualmente |

### Columnas de Calidad (% de defectos)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `N` | TEXT | Porcentaje de defecto tipo N |
| `S` | TEXT | Porcentaje de defecto tipo S |
| `L` | TEXT | Porcentaje de defecto tipo L |
| `T` | TEXT | Porcentaje de defecto tipo T |
| `MO` | TEXT | Porcentaje de defecto tipo MO |
| `CP V+ SL+` | TEXT | Defectos tipo CP V+ SL+ |
| `CM V- SL-` | TEXT | Defectos tipo CM V- SL- |
| `CCp C+` | TEXT | Defectos tipo CCp C+ |
| `CCm C-` | TEXT | Defectos tipo CCm C- |
| `JP (P+)` | TEXT | Defectos tipo JP (P+) |
| `JM (P-)` | TEXT | Defectos tipo JM (P-) |
| `CVP` | TEXT | Defectos tipo CVP |
| `CVM` | TEXT | Defectos tipo CVM |
| `CORT NAT` | TEXT | Cortes naturales |

### Columnas de Control

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `OPERADOR` | TEXT | Código del operador |
| `LOTE PRODUC` | TEXT | Lote de producción |
| `TÍTULO` | TEXT | Título del hilo |
| `TORCAO P POLEG` | TEXT | Torsión por pulgada |
| `TORCAO P METRO` | TEXT | Torsión por metro |
| `ALFA` | TEXT | Factor alfa |
| `T.BOB.` | TEXT | Tiempo de bobinado |
| `RPM CARD` | TEXT | RPM de la cardadora |
| `% ROB 01` | TEXT | Porcentaje de robo 01 |
| `% ROB 02` | TEXT | Porcentaje de robo 02 |
| `% ROB 03` | TEXT | Porcentaje de robo 03 |

**Total de columnas**: 45

## 🔍 Índices

La tabla cuenta con los siguientes índices para optimizar consultas:

```sql
CREATE INDEX idx_produccion_oe_fecha ON tb_PRODUCCION_OE(DATA_PRODUCAO);
CREATE INDEX idx_produccion_oe_maquina ON tb_PRODUCCION_OE(MAQUINA);
CREATE INDEX idx_produccion_oe_filial ON tb_PRODUCCION_OE(FILIAL);
CREATE INDEX idx_produccion_oe_turno ON tb_PRODUCCION_OE(TURNO);
```

## 📈 Estadísticas

Al **03/02/2026**:
- **Registros importados**: 6,315
- **Rango de fechas**: Enero 2025 (principalmente)
- **Máquinas**: Open End II (código 50402)
- **Tamaño estimado**: ~1.45 MB (archivo origen)

## 🔗 Integración con el Sistema

### API Server
Configurado en [`scripts/sqlite-api-server.cjs`](scripts/sqlite-api-server.cjs):
```javascript
{ table: 'tb_PRODUCCION_OE', filename: 'rptProducaoOE.csv', sheet: 'Sheet1' }
```

### Import Control
Visible en la interfaz de control de importaciones:
- **URL**: http://localhost:5173/importaciones
- **Componente**: `ImportControl.vue`

### Endpoints API disponibles
- `GET /api/import-status` - Incluye estado de tb_PRODUCCION_OE
- `POST /api/import/force-table` - Permite forzar importación
- `POST /api/import/update-outdated` - Actualiza si hay cambios

## 🚀 Uso

### Importación Manual
```powershell
.\scripts\import-produccion-oe-fast.ps1 -XlsxPath "C:\STC\rptProducaoOE.xlsx"
```

### Consultas de Ejemplo

#### Producción por máquina y turno
```sql
SELECT 
  MAQUINA,
  NOME_MAQUINA,
  DATA_PRODUCAO,
  TURNO,
  [PROD CALCULADA],
  [EFIC CALCULADA]
FROM tb_PRODUCCION_OE
WHERE DATA_PRODUCAO BETWEEN '01/01/2025' AND '31/01/2025'
ORDER BY DATA_PRODUCAO DESC, TURNO;
```

#### Eficiencia promedio por máquina
```sql
SELECT 
  MAQUINA,
  NOME_MAQUINA,
  COUNT(*) as registros,
  AVG(CAST([EFIC CALCULADA] AS REAL)) as eficiencia_promedio,
  SUM(CAST([PROD CALCULADA] AS REAL)) as produccion_total
FROM tb_PRODUCCION_OE
WHERE [EFIC CALCULADA] != '' AND [EFIC CALCULADA] != '0.0'
GROUP BY MAQUINA, NOME_MAQUINA
ORDER BY eficiencia_promedio DESC;
```

#### Producción por turno
```sql
SELECT 
  TURNO,
  COUNT(*) as registros,
  SUM(CAST([PROD CALCULADA] AS REAL)) as produccion_total,
  AVG(CAST([EFIC CALCULADA] AS REAL)) as eficiencia_promedio
FROM tb_PRODUCCION_OE
WHERE TURNO IN ('A', 'B', 'C')
  AND [PROD CALCULADA] != ''
GROUP BY TURNO
ORDER BY TURNO;
```

## 📝 Notas Importantes

1. **Formato de fechas**: Las fechas se normalizan de `YYYY-MM-DD` a `DD/MM/YYYY` durante la importación
2. **Encabezados duplicados**: El script elimina automáticamente filas donde FILIAL='FILIAL' (encabezados repetidos)
3. **Columnas vacías**: La columna "Unnamed: 22" se elimina automáticamente
4. **Valores numéricos**: Aunque almacenados como TEXT, los valores numéricos se pueden convertir con `CAST(columna AS REAL)`
5. **Eficiencia**: Algunos registros tienen eficiencia 0.0 (turnos sin producción)

## 🔄 Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 03/02/2026 | 1.0 | Implementación inicial de la tabla |
| 03/02/2026 | 1.0 | Script de importación con validaciones |
| 03/02/2026 | 1.0 | Integración con API server |
| 03/02/2026 | 1.0 | Documentación completa |

## 🎯 Próximos Pasos

- [ ] Crear dashboard específico para producción OE
- [ ] Implementar alertas de eficiencia
- [ ] Comparar con metas de producción
- [ ] Análisis de calidad por defecto tipo
- [ ] Integración con sistema de operadores
