# 📊 Evaluación para Migración PostgreSQL + Docker

**Fecha**: 03/02/2026  
**Estado**: Análisis para proyecto nuevo  
**Objetivo**: Migrar de SQLite a PostgreSQL con Docker, limpiando componentes no usados

---

## 🎯 Resumen Ejecutivo

### ✅ **RECOMENDACIÓN: Proyecto Nuevo con Migración Selectiva**

**Razones**:
1. Eliminar código legacy sin afectar producción actual
2. Rediseño de arquitectura con mejores prácticas (Docker Compose)
3. Simplificar estructura eliminando componentes no usados
4. Implementar PostgreSQL desde cero con esquema optimizado

---

## 📋 Estado Actual del Proyecto

### 🗄️ Base de Datos SQLite

**Tablas Principales (11)**:
| Tabla | Registros | Uso Activo | Migrar |
|-------|-----------|------------|--------|
| `tb_PRODUCCION` | ~150K | ✅ Alto | ✅ Sí |
| `tb_CALIDAD` | ~80K | ✅ Alto | ✅ Sí |
| `tb_PARADAS` | ~20K | ✅ Medio | ✅ Sí |
| `tb_TESTES` | ~10K | ✅ Medio | ✅ Sí |
| `tb_RESIDUOS_INDIGO` | ~5K | ✅ Alto | ✅ Sí |
| `tb_RESIDUOS_POR_SECTOR` | ~8K | ✅ Alto | ✅ Sí |
| `tb_FICHAS` | ~300 | ✅ Catálogo | ✅ Sí |
| `tb_CALIDAD_FIBRA` | ~2K | ✅ Medio | ✅ Sí |
| `tb_PROCESO` | ~15K | ⚠️ Bajo | ⚠️ Evaluar |
| `tb_DEFECTOS` | ~5K | ⚠️ Bajo | ⚠️ Evaluar |
| `tb_PRODUCCION_OE` | 6.3K | ✅ Nuevo | ✅ Sí |

**Tablas de Configuración (4)**:
| Tabla | Uso Activo | Migrar |
|-------|------------|--------|
| `tb_METAS` | ✅ Sí | ✅ Sí |
| `tb_COSTO_ITEMS` | ✅ Sí | ✅ Sí |
| `tb_COSTO_MENSUAL` | ✅ Sí | ✅ Sí |
| `tb_COSTO_ITEM_ALIAS` | ✅ Sí | ✅ Sí |

**Tablas de Sistema (3)**:
| Tabla | Uso Activo | Migrar |
|-------|------------|--------|
| `import_control` | ✅ Sí | ✅ Sí (rediseñar) |
| `schema_changes_log` | ✅ Sí | ✅ Sí (rediseñar) |
| `import_column_warnings` | ✅ Sí | ✅ Sí |

---

## 🎨 Frontend - Vue 3 Components

### ✅ **Componentes Activos y Funcionales** (18)

**Dashboard y KPIs**:
- ✅ `DashboardGeneral.vue` - Dashboard principal (recién implementado)
- ✅ `KPICard.vue` - Widget de tarjetas
- ✅ `ChartWidget.vue` - Widget de gráficos
- ✅ `DataTableWidget.vue` - Widget de tablas

**Revisión de Calidad**:
- ✅ `RevisionCQ.vue` - Metros por revisor
- ✅ `AnalisisHistoricoRevisores.vue` - Histórico revisores
- ✅ `AnalisisMesaTest.vue` - Mesa de test
- ✅ `CalidadSectoresTabla.vue` - Metros por sector
- ✅ `CalidadFibra.vue` - Calidad de fibra HVI

**Producción Índigo**:
- ✅ `ResiduosIndigoTejeduria.vue` - Residuos con exportación Excel Pro
- ✅ `AnalisisResiduosIndigo.vue` - Análisis detallado
- ✅ `ConsultaRoladaIndigo.vue` - Consulta por ROLADA
- ✅ `InformeProduccionIndigo.vue` - ROLADAS del mes
- ✅ `SeguimientoRoladas.vue` - Seguimiento de roladas
- ✅ `SeguimientoRoladasFibra.vue` - Roladas + Fibra HVI
- ✅ `GraficoMetricasDiarias.vue` - Métricas diarias

**Gestión y Control**:
- ✅ `ImportControl.vue` - Control de importaciones
- ✅ `InformeDiario.vue` - Informe diario STC
- ✅ `CostosMensuales.vue` - Costos mensuales
- ✅ `MetasCarga.vue` - Carga de metas

**UI Compartida**:
- ✅ `NavBar.vue` - Navegación lateral con collapse
- ✅ `SidebarItem.vue` - Items de navegación
- ✅ `SidebarItemWithSubmenu.vue` - Items con submenú
- ✅ `UpdateResiduosModal.vue` - Modal para actualizar residuos
- ✅ `DetalleResiduosModal.vue` - Modal de detalles

### ❌ **Componentes No Usados** (3)

- ❌ `Dashboard.vue` - **Reemplazado por DashboardGeneral.vue**
- ❌ `FichaSearch.vue` - **No está en el router**
- ❌ `HelloWorld.vue` - **Demo de Vite**
- ❌ `ParadasTable.vue` - **No visible en navegación**
- ❌ `CustomDatepicker.vue` - **Componente sin usar**

---

## 🔌 Backend - API Express

### ✅ **Endpoints Activos** (~45)

**Producción**:
- `GET /api/produccion` - Datos de producción con filtros
- `GET /api/produccion/metros-diarios` - Metros por día
- `GET /api/produccion/eficiencia` - Eficiencia de máquinas

**Calidad**:
- `GET /api/calidad` - Registros de calidad
- `GET /api/calidad-por-revisor` - Análisis por revisor
- `GET /api/calidad-sectores` - Metros por sector
- `GET /api/calidad-fibra` - Datos HVI de fibra
- `GET /api/calidad-roladas` - Calidad por ROLADA

**Residuos Índigo**:
- `GET /api/residuos-indigo` - Residuos de índigo
- `GET /api/residuos-por-sector` - Residuos por sector
- `GET /api/residuos/combined` - Residuos combinados

**Paradas y Test**:
- `GET /api/paradas` - Registro de paradas
- `GET /api/testes` - Pruebas físicas

**Importaciones**:
- `GET /api/import-status` - Estado de importaciones
- `POST /api/import/trigger` - Disparar importación
- `POST /api/import/force-all` - Forzar todas
- `POST /api/import/force-table` - Forzar tabla específica
- `POST /api/import/update-outdated` - Actualizar desactualizadas
- `GET /api/import/column-warnings` - Advertencias de columnas

**Costos y Metas**:
- `GET /api/costos/items` - Items de costo
- `GET /api/costos/mensuales` - Costos mensuales
- `POST /api/costos/mensual` - Crear/actualizar costo
- `GET /api/metas` - Metas de producción
- `POST /api/metas/upload` - Cargar metas desde CSV

**Sistema**:
- `GET /api/status` - Estado general de la base de datos
- `GET /api/schema-changes` - Historial de cambios de esquema
- `POST /api/add-columns` - Agregar columnas dinámicamente
- `POST /api/folder/pick` - Selector de carpetas

---

## 🐳 Arquitectura Propuesta - PostgreSQL + Docker

### **Stack Tecnológico**

```yaml
Frontend:
  - Vue 3 (mantener)
  - Vite (mantener)
  - Tailwind CSS (mantener)
  - Chart.js / ApexCharts (mantener)
  - ExcelJS (mantener)

Backend:
  - Node.js 20 LTS
  - Express.js 5
  - node-postgres (pg)
  - Docker Compose

Base de Datos:
  - PostgreSQL 16
  - pgAdmin 4 (opcional)
  - TimescaleDB extension (para series temporales)

DevOps:
  - Docker
  - Docker Compose
  - Volúmenes persistentes
  - Health checks
  - Auto-restart
```

### **Estructura Docker Compose**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: stc_produccion
      POSTGRES_USER: stc_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stc_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://stc_user:${DB_PASSWORD}@postgres:5432/stc_produccion
      NODE_ENV: production
      PORT: 3002
    ports:
      - "3002:3002"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

---

## 🔄 Plan de Migración

### **Fase 1: Preparación** (1-2 días)

**1.1 Crear proyecto nuevo**
```bash
mkdir stc-produccion-v2
cd stc-produccion-v2
```

**1.2 Estructura de carpetas**
```
stc-produccion-v2/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.js
│   └── migrations/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── components/
│       ├── composables/
│       ├── router/
│       └── main.js
└── scripts/
    ├── migrate-data.js
    └── import-csv.js
```

**1.3 Configurar PostgreSQL**
- Crear esquema inicial
- Definir tablas con tipos nativos (no más TEXT everywhere)
- Agregar índices estratégicos
- Configurar particiones para tablas grandes

### **Fase 2: Migración de Esquema** (2-3 días)

**2.1 Convertir tablas SQLite → PostgreSQL**

**Ejemplo: tb_PRODUCCION**
```sql
-- SQLite (actual)
CREATE TABLE tb_PRODUCCION (
  FILIAL TEXT,
  DATA_PRODUCAO TEXT,
  METROS_PRODUZIDOS TEXT,
  ...
);

-- PostgreSQL (propuesto)
CREATE TABLE produccion (
  id SERIAL PRIMARY KEY,
  filial VARCHAR(2) NOT NULL,
  fecha_produccion DATE NOT NULL,
  metros_producidos DECIMAL(10,2),
  eficiencia DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_produccion_fecha (fecha_produccion),
  INDEX idx_produccion_filial (filial),
  INDEX idx_produccion_combined (fecha_produccion, filial)
) PARTITION BY RANGE (fecha_produccion);
```

**2.2 Mejoras de esquema propuestas**:

1. **Tipos de datos nativos**:
   - `TEXT` → `VARCHAR(n)`, `DATE`, `DECIMAL`, `INTEGER`
   - Validaciones a nivel de base de datos

2. **Nomenclatura consistente**:
   - `snake_case` en columnas
   - Nombres en español (mantener contexto de negocio)

3. **Relaciones explícitas**:
   - Foreign keys donde corresponda
   - Cascade deletes/updates

4. **Auditoría**:
   - `created_at`, `updated_at` en todas las tablas
   - Triggers de actualización automática

5. **Particionamiento**:
   - `produccion` por mes
   - `calidad` por mes
   - Mejora de rendimiento en consultas temporales

### **Fase 3: Migración de Datos** (1 día)

**Script de migración**:
```javascript
// scripts/migrate-data.js
const sqlite3 = require('sqlite3')
const { Pool } = require('pg')

const sqliteDb = new sqlite3.Database('../analisis-produccion-stc/database/produccion.db')
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrateTbProduccion() {
  const rows = await sqliteQuery('SELECT * FROM tb_PRODUCCION')
  
  for (const row of rows) {
    await pgPool.query(
      `INSERT INTO produccion 
       (filial, fecha_produccion, metros_producidos, ...)
       VALUES ($1, $2, $3, ...)`,
      [
        row.FILIAL,
        parseDate(row.DATA_PRODUCAO),
        parseDecimal(row.METROS_PRODUZIDOS),
        ...
      ]
    )
  }
}
```

### **Fase 4: Migración de Backend** (3-4 días)

**4.1 Refactorizar API**:
- Reemplazar `sqlite3` con `pg`
- Implementar pool de conexiones
- Usar prepared statements
- Queries parametrizadas (prevención SQL injection)

**4.2 Servicios separados**:
```javascript
// backend/src/services/ProduccionService.js
class ProduccionService {
  constructor(db) {
    this.db = db
  }
  
  async getProduccion(filters) {
    const { fecha_inicio, fecha_fin, filial } = filters
    
    const query = `
      SELECT 
        fecha_produccion,
        SUM(metros_producidos) as total_metros,
        AVG(eficiencia) as eficiencia_promedio
      FROM produccion
      WHERE fecha_produccion BETWEEN $1 AND $2
        AND ($3::varchar IS NULL OR filial = $3)
      GROUP BY fecha_produccion
      ORDER BY fecha_produccion DESC
    `
    
    const result = await this.db.query(query, [fecha_inicio, fecha_fin, filial])
    return result.rows
  }
}
```

**4.3 Eliminar código legacy**:
- ❌ Endpoints no usados
- ❌ Lógica de manejo de Excel obsoleta
- ❌ Scripts de importación antiguos

### **Fase 5: Migración de Frontend** (2 días)

**5.1 Copiar componentes activos**:
- Solo los 18 componentes en uso
- Actualizar imports
- Verificar rutas

**5.2 Actualizar composables**:
- Adaptar a nuevas respuestas de API
- Mantener lógica de negocio

**5.3 Eliminar**:
- ❌ Componentes no usados
- ❌ Código comentado
- ❌ Estilos duplicados

### **Fase 6: Scripts de Importación** (2-3 días)

**6.1 Rediseñar importación CSV**:
```javascript
// scripts/import-csv.js
const { parse } = require('csv-parse')
const { Pool } = require('pg')

async function importProduccion(csvPath) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  const stream = fs.createReadStream(csvPath)
    .pipe(parse({ columns: true, skip_empty_lines: true }))
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    for await (const row of stream) {
      await client.query(
        `INSERT INTO produccion (...) VALUES (...)
         ON CONFLICT (fecha_produccion, filial, maquina) 
         DO UPDATE SET ...`,
        [...]
      )
    }
    
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

**6.2 Mantener PowerShell scripts**:
- Convertir XLSX → CSV (mantener)
- Llamar a script Node.js para importación

### **Fase 7: Testing y Validación** (2-3 días)

**7.1 Tests unitarios**:
- Servicios de backend
- Queries complejos
- Lógica de negocio

**7.2 Tests de integración**:
- API endpoints
- Flujo completo de importación

**7.3 Tests de carga**:
- Consultas con grandes volúmenes
- Importación masiva

**7.4 Validación de datos**:
- Comparar conteos SQLite vs PostgreSQL
- Verificar integridad de datos

---

## 📊 Comparación: SQLite vs PostgreSQL

| Característica | SQLite (actual) | PostgreSQL (propuesto) |
|----------------|-----------------|------------------------|
| **Tipo de datos** | Solo TEXT | Tipos nativos optimizados |
| **Concurrencia** | Limitada (escrituras bloqueantes) | Alta (MVCC) |
| **Tamaño DB** | ~500 MB | ~400 MB (compresión mejor) |
| **Índices** | Básicos | Avanzados (GiST, GIN, BRIN) |
| **Particionamiento** | No soportado | Nativo desde PG 10 |
| **Full-text search** | Básico | Avanzado (tsvector) |
| **Replicación** | No | Streaming replication |
| **Backup** | Archivo único | pg_dump / pg_basebackup |
| **Queries complejas** | Lentas en tablas grandes | Optimizador avanzado |
| **Docker** | No necesario | Orquestación con compose |
| **Escalabilidad** | Limitada | Horizontal y vertical |

---

## 💰 Estimación de Esfuerzo

| Fase | Duración | Complejidad |
|------|----------|-------------|
| 1. Preparación | 1-2 días | Baja |
| 2. Migración de Esquema | 2-3 días | Media |
| 3. Migración de Datos | 1 día | Baja |
| 4. Migración de Backend | 3-4 días | Alta |
| 5. Migración de Frontend | 2 días | Baja |
| 6. Scripts de Importación | 2-3 días | Media |
| 7. Testing y Validación | 2-3 días | Media |
| **TOTAL** | **13-18 días** | |

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida de datos durante migración | Baja | Alto | Backups completos antes de migrar |
| Incompatibilidad de queries | Media | Medio | Testing exhaustivo, queries parametrizadas |
| Downtime prolongado | Baja | Alto | Migración en paralelo, switcheo rápido |
| Docker no funciona en producción | Baja | Alto | Pruebas en ambiente staging |
| Queries lentas en PostgreSQL | Media | Medio | Profiling, índices optimizados |
| Componentes rotos después de migración | Media | Medio | Tests de integración |

---

## ✅ Checklist de Pre-Migración

### Preparación
- [ ] Backup completo de SQLite actual
- [ ] Backup de archivos CSV fuente
- [ ] Documentar todos los endpoints activos
- [ ] Listar todas las consultas SQL usadas
- [ ] Inventario de componentes Vue en uso
- [ ] Configurar entorno Docker local

### Validación de Datos
- [ ] Contar registros por tabla
- [ ] Identificar duplicados
- [ ] Verificar integridad referencial
- [ ] Documentar transformaciones necesarias
- [ ] Validar rangos de fechas

### Testing
- [ ] Preparar datos de prueba
- [ ] Definir casos de test
- [ ] Scripts de validación de migración
- [ ] Plan de rollback

---

## 🎯 Decisión Final y Próximos Pasos

### **RECOMENDACIÓN: ✅ PROYECTO NUEVO**

**Ventajas**:
1. ✅ Código limpio sin legacy
2. ✅ Arquitectura moderna desde cero
3. ✅ Fácil rollback (mantener proyecto actual)
4. ✅ Oportunidad de mejorar prácticas
5. ✅ Documentación clara

**Desventajas**:
1. ⚠️ Más tiempo inicial de setup
2. ⚠️ Duplicación temporal de código
3. ⚠️ Necesidad de mantener 2 proyectos brevemente

### **Propuesta de Inicio**

**Opción A: MVP Rápido (1 semana)**
1. Setup básico Docker Compose
2. Migrar solo 3 tablas críticas:
   - `produccion`
   - `calidad`
   - `residuos_indigo`
3. Migrar solo 3 componentes esenciales:
   - Dashboard
   - Revisión CQ
   - Residuos Índigo
4. API mínima funcional
5. Validación end-to-end

**Opción B: Migración Completa (3 semanas)**
- Todas las tablas
- Todos los componentes activos
- Scripts de importación completos
- Testing exhaustivo

---

## 📝 Conclusión

El proyecto actual está **bien estructurado** y **funcionando correctamente**. La migración a PostgreSQL + Docker es **justificada** por:

1. **Escalabilidad**: PostgreSQL maneja mejor grandes volúmenes
2. **Concurrencia**: Múltiples usuarios simultáneos sin bloqueos
3. **Portabilidad**: Docker permite deployment consistente
4. **Mantenibilidad**: Código limpio sin componentes obsoletos
5. **Futuro**: Base sólida para nuevas funcionalidades

**Siguiente acción recomendada**: Comenzar con **MVP Rápido** para validar la arquitectura antes de migración completa.

¿Procedemos con la creación del proyecto nuevo? 🚀
