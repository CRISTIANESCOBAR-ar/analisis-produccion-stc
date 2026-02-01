# 📊 Plan de Migración: PostgreSQL + Docker
**Proyecto:** Sistema de Análisis de Producción STC  
**Fecha:** 31 de enero de 2026  
**Estado:** Documento de planificación para implementación futura

---

## 📋 Tabla de Contenidos
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual del Sistema](#estado-actual-del-sistema)
3. [Análisis de Migración a PostgreSQL](#análisis-de-migración-a-postgresql)
4. [Análisis de Dockerización](#análisis-de-dockerización)
5. [Plan de Implementación por Fases](#plan-de-implementación-por-fases)
6. [Estimación de Esfuerzo](#estimación-de-esfuerzo)
7. [Riesgos y Mitigaciones](#riesgos-y-mitigaciones)
8. [Configuraciones Propuestas](#configuraciones-propuestas)
9. [Checklist de Implementación](#checklist-de-implementación)

---

## 1. Resumen Ejecutivo

### Objetivo
Migrar el sistema actual basado en SQLite a PostgreSQL y dockerizar toda la infraestructura para despliegue en producción, mejorando escalabilidad, concurrencia y facilidad de deployment.

### Beneficios Esperados
- ✅ **Concurrencia:** Múltiples usuarios simultáneos sin bloqueos
- ✅ **Escalabilidad:** Preparado para crecimiento futuro
- ✅ **Confiabilidad:** Backups automatizados y replicación
- ✅ **Deployment:** Despliegue consistente con Docker
- ✅ **Mantenimiento:** Actualizaciones más simples

### Complejidad
- **Nivel:** Media-Alta
- **Tiempo estimado:** 8-10 días de desarrollo
- **Riesgo:** Medio (con plan de rollback)

---

## 2. Estado Actual del Sistema

### 2.1 Tecnologías Actuales
```
Frontend:  Vue 3 + Vite + TailwindCSS + Chart.js
Backend:   Express.js (Node.js)
Base de Datos: SQLite 3
Scripts:   PowerShell (30+) + Python (10+)
```

### 2.2 Métricas del Sistema
| Métrica | Valor |
|---------|-------|
| **Tamaño de DB** | 348 MB |
| **Líneas de código API** | 7,253 líneas |
| **Endpoints REST** | 73 endpoints |
| **Tablas principales** | 10 tablas |
| **Scripts de importación** | 40+ scripts |

### 2.3 Tablas Principales
```
tb_PRODUCCION          - Datos de producción de máquinas
tb_CALIDAD             - Control de calidad y revisiones
tb_PARADAS             - Registro de paradas de máquinas
tb_FICHAS              - Fichas técnicas de artículos
tb_TESTES              - Pruebas físicas de materiales
tb_RESIDUOS_INDIGO     - Residuos de índigo
tb_RESIDUOS_POR_SECTOR - Residuos por sector
tb_PROCESO             - Estado del stock en proceso
tb_DEFECTOS            - Defectos encontrados
tb_CALIDAD_FIBRA       - Calidad de fibras (HVI)
```

### 2.4 Configuración SQLite Actual
```javascript
// scripts/sqlite-api-server.cjs (líneas 202-204)
db.run('PRAGMA journal_mode=WAL;');      // Write-Ahead Logging
db.run('PRAGMA wal_checkpoint(PASSIVE);'); // Checkpoints pasivos
db.run('PRAGMA query_only=0;');           // Permitir escrituras
```

---

## 3. Análisis de Migración a PostgreSQL

### 3.1 Ventajas de PostgreSQL

#### Ventajas Técnicas
| Característica | SQLite | PostgreSQL |
|----------------|--------|------------|
| **Concurrencia** | 1 escritor a la vez | Miles de conexiones simultáneas |
| **Tamaño recomendado** | < 1 GB | Terabytes |
| **Replicación** | No nativa | Read replicas nativas |
| **Backups en caliente** | Limitado | `pg_dump`, `pg_basebackup` |
| **Full-text search** | Limitado | Potente con tsvector |
| **JSON** | JSON solo | JSON + JSONB indexable |
| **Índices avanzados** | B-tree, R-tree | GIN, GIST, BRIN, Hash, Partial |
| **Transacciones** | Básicas | ACID completo con savepoints |

#### Casos de Uso Mejorados
1. **Múltiples usuarios simultáneos** - Actualmente hay bloqueos con escrituras concurrentes
2. **Importaciones masivas** - Scripts PowerShell que importan datos podrían correr en paralelo
3. **Consultas analíticas complejas** - Mejor optimizador de queries
4. **Dashboards en tiempo real** - Sin bloqueos de lectura durante escrituras

### 3.2 Desafíos de la Migración

#### Cambios de Código Necesarios

**A. Cambiar el driver de base de datos**
```javascript
// ANTES (SQLite)
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(DB_PATH);

// DESPUÉS (PostgreSQL)
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Máximo de conexiones
  idleTimeoutMillis: 30000,   // Timeout de conexiones idle
  connectionTimeoutMillis: 2000,
});
```

**B. Cambiar el patrón de queries (callback → async/await)**
```javascript
// ANTES (SQLite - callback)
db.all('SELECT * FROM tb_PRODUCCION WHERE fecha = ?', [fecha], (err, rows) => {
  if (err) return res.status(500).json({ error: err.message });
  res.json(rows);
});

// DESPUÉS (PostgreSQL - async/await)
try {
  const { rows } = await pool.query(
    'SELECT * FROM tb_PRODUCCION WHERE fecha = $1',
    [fecha]
  );
  res.json(rows);
} catch (err) {
  res.status(500).json({ error: err.message });
}
```

**C. Ajustar sintaxis SQL**
```sql
-- AUTOINCREMENT
SQLite:      id INTEGER PRIMARY KEY AUTOINCREMENT
PostgreSQL:  id SERIAL PRIMARY KEY
-- O mejor:  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY

-- Funciones de fecha
SQLite:      datetime('now'), date('now', '-7 days')
PostgreSQL:  NOW(), CURRENT_DATE - INTERVAL '7 days'

-- Case-insensitive LIKE
SQLite:      LIKE (insensitive por defecto)
PostgreSQL:  ILIKE

-- Información del esquema
SQLite:      SELECT * FROM sqlite_master WHERE type='table'
PostgreSQL:  SELECT * FROM information_schema.tables WHERE table_schema='public'

-- Placeholders
SQLite:      ? ? ?
PostgreSQL:  $1 $2 $3
```

**D. Adaptar PRAGMAs**
```javascript
// SQLite PRAGMAs → PostgreSQL Configuration
// No hay equivalente directo, se configuran en postgresql.conf o al crear el pool

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Equivalente a PRAGMA busy_timeout
  connectionTimeoutMillis: 5000,
  // Pool de conexiones (no disponible en SQLite)
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
});
```

### 3.3 Scripts a Modificar

#### Scripts PowerShell (30+ archivos)
**Ubicación:** `scripts/*.ps1`

**Cambios típicos:**
```powershell
# ANTES (SQLite)
$SqlitePath = "C:\analisis-produccion-stc\database\produccion.db"
& sqlite3 $SqlitePath "SELECT * FROM tb_PRODUCCION"

# DESPUÉS (PostgreSQL)
$ConnectionString = $env:DATABASE_URL
& psql $ConnectionString -c "SELECT * FROM tb_PRODUCCION"
```

**Scripts críticos a modificar:**
- `batch-import-calidad-history.ps1`
- `batch-import-produccion-history.ps1`
- `clean-old-data.ps1`
- `create-indexes.ps1`
- `add_total_minutos_columns.ps1`

#### Scripts Python (10+ archivos)
**Ubicación:** `scripts/*.py`

**Cambios típicos:**
```python
# ANTES (SQLite)
import sqlite3
con = sqlite3.connect('database/produccion.db')
cur = con.cursor()
cur.execute("SELECT * FROM tb_PRODUCCION")

# DESPUÉS (PostgreSQL)
import psycopg2
from psycopg2 import pool
connection_pool = psycopg2.pool.SimpleConnectionPool(
    1, 10,
    dsn=os.environ['DATABASE_URL']
)
con = connection_pool.getconn()
cur = con.cursor()
cur.execute("SELECT * FROM tb_PRODUCCION")
```

**Scripts críticos:**
- `analyze_db_performance.py`
- `analyze_db_size.py`
- `check_dates_format.py`
- `verify_eficiencia.py`

### 3.4 Migración de Datos

#### Opción 1: pgloader (Recomendado)
```bash
# Instalación
# Windows: descargar binario desde https://github.com/dimitri/pgloader/releases
# Linux: apt-get install pgloader

# Migración
pgloader sqlite://database/produccion.db postgresql://user:pass@localhost/produccion_stc
```

**Ventajas:**
- Automático, detecta tipos de datos
- Convierte índices y constraints
- Maneja datos grandes eficientemente

#### Opción 2: Script Python Personalizado
```python
import sqlite3
import psycopg2
import os

# Conectar a ambas DBs
sqlite_con = sqlite3.connect('database/produccion.db')
pg_con = psycopg2.connect(os.environ['DATABASE_URL'])

sqlite_cur = sqlite_con.cursor()
pg_cur = pg_con.cursor()

# Obtener lista de tablas
sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in sqlite_cur.fetchall()]

for table in tables:
    print(f"Migrando {table}...")
    
    # Leer datos
    sqlite_cur.execute(f"SELECT * FROM {table}")
    rows = sqlite_cur.fetchall()
    
    # Obtener columnas
    sqlite_cur.execute(f"PRAGMA table_info({table})")
    columns = [col[1] for col in sqlite_cur.fetchall()]
    
    # Insertar en PostgreSQL
    if rows:
        placeholders = ','.join(['%s'] * len(columns))
        insert_query = f"INSERT INTO {table} ({','.join(columns)}) VALUES ({placeholders})"
        pg_cur.executemany(insert_query, rows)
        pg_con.commit()
        print(f"  ✓ Migrados {len(rows)} registros")

print("Migración completada")
```

---

## 4. Análisis de Dockerización

### 4.1 Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Docker Host (Producción)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐         ┌─────────────────┐                    │
│  │   Nginx         │         │   Volumen       │                    │
│  │   (Reverse      │         │   PostgreSQL    │                    │
│  │    Proxy)       │         │   (Persistente) │                    │
│  │   Port 80/443   │         └─────────────────┘                    │
│  └────────┬────────┘                  ▲                              │
│           │                           │                              │
│           │         ┌─────────────────┴────────┐                     │
│           │         │                          │                     │
│           ▼         ▼                          ▼                     │
│  ┌─────────────────────────┐      ┌─────────────────────────┐       │
│  │   Frontend              │      │   Backend API           │       │
│  │   (Vue.js Build)        │      │   (Express.js)          │       │
│  │   Servido por Nginx     │◄────►│   Port 3002             │       │
│  │                         │      │                         │       │
│  └─────────────────────────┘      └───────────┬─────────────┘       │
│                                               │                      │
│                                               ▼                      │
│                                   ┌─────────────────────────┐        │
│                                   │   PostgreSQL 16         │        │
│                                   │   Port 5432             │        │
│                                   │   (Solo red interna)    │        │
│                                   └─────────────────────────┘        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Contenedores Propuestos

#### Container 1: PostgreSQL
- **Imagen:** `postgres:16-alpine`
- **Propósito:** Base de datos
- **Volumen:** Datos persistentes
- **Red:** Interna (no expuesta)

#### Container 2: Backend API
- **Imagen:** Custom (Node.js 20)
- **Propósito:** API REST Express
- **Puerto:** 3002
- **Conexión:** A PostgreSQL por red interna

#### Container 3: Frontend
- **Imagen:** Custom (Nginx con build de Vite)
- **Propósito:** Servir aplicación Vue.js
- **Puerto:** 80/443
- **Reverse proxy:** A backend API

### 4.3 Ventajas de Docker

| Ventaja | Descripción |
|---------|-------------|
| **Portabilidad** | Funciona igual en dev, staging y producción |
| **Aislamiento** | Cada servicio en su contenedor |
| **Versionado** | Imágenes versionadas, rollback fácil |
| **Escalabilidad** | Réplicas de containers fáciles |
| **CI/CD** | Integración con pipelines |
| **Dependencias** | Todo incluido, sin conflictos |

---

## 5. Plan de Implementación por Fases

### FASE 1: Preparación (Días 1-2)

#### Día 1: Setup PostgreSQL Local
```bash
# Instalar PostgreSQL
# Windows: https://www.postgresql.org/download/windows/
# Descargar PostgreSQL 16

# Crear base de datos
psql -U postgres
CREATE DATABASE produccion_stc;
CREATE USER stc_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE produccion_stc TO stc_user;
\c produccion_stc
GRANT ALL ON SCHEMA public TO stc_user;
```

**Tareas:**
- [ ] Instalar PostgreSQL 16
- [ ] Crear usuario y base de datos
- [ ] Configurar postgresql.conf (max_connections, shared_buffers)
- [ ] Instalar pgAdmin para gestión visual

#### Día 2: Migrar Esquema y Datos
```bash
# Opción 1: Con pgloader
pgloader sqlite://C:/analisis-produccion-stc/database/produccion.db \
         postgresql://stc_user:password@localhost/produccion_stc

# Opción 2: Script Python
python scripts/migrate_sqlite_to_postgres.py
```

**Tareas:**
- [ ] Exportar esquema SQLite
- [ ] Adaptar tipos de datos para PostgreSQL
- [ ] Ejecutar migración
- [ ] Verificar integridad de datos (conteos)
- [ ] Crear índices
- [ ] Analizar y optimizar (`VACUUM ANALYZE`)

### FASE 2: Refactorización Backend API (Días 3-6)

#### Día 3: Capa de Abstracción de DB

**Crear:** `scripts/db-layer.cjs`
```javascript
const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  // Wrapper para queries
  async query(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Wrapper para query única
  async queryOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows[0] || null;
  }

  // Transacciones
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Cerrar pool
  async close() {
    await this.pool.end();
  }
}

module.exports = new Database();
```

**Tareas:**
- [ ] Crear capa de abstracción
- [ ] Implementar connection pooling
- [ ] Agregar logging de queries
- [ ] Manejar reconexiones automáticas

#### Días 4-6: Refactorizar Endpoints

**Estrategia:** Refactorizar endpoint por endpoint, probando cada uno.

**Patrón de refactorización:**
```javascript
// ANTES
app.get('/api/produccion', async (req, res) => {
  const { fecha } = req.query;
  db.all('SELECT * FROM tb_PRODUCCION WHERE fecha = ?', [fecha], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// DESPUÉS
const db = require('./db-layer.cjs');

app.get('/api/produccion', async (req, res) => {
  try {
    const { fecha } = req.query;
    const rows = await db.query(
      'SELECT * FROM tb_PRODUCCION WHERE fecha = $1',
      [fecha]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error en /api/produccion:', error);
    res.status(500).json({ error: 'Error al consultar producción' });
  }
});
```

**Endpoints por prioridad:**
1. `/api/status` (health check)
2. `/api/produccion` (básico)
3. `/api/calidad` (básico)
4. `/api/paradas` (básico)
5. ... resto de 73 endpoints

**Tareas:**
- [ ] Refactorizar endpoints críticos (días 4-5)
- [ ] Refactorizar endpoints secundarios (día 6)
- [ ] Agregar manejo de errores consistente
- [ ] Implementar logging con Winston o Pino

### FASE 3: Scripts Auxiliares (Días 7-8)

#### Scripts PowerShell Críticos

**Estrategia:** Crear módulo común para conexiones PostgreSQL

**Crear:** `scripts/PostgreSQL-Module.psm1`
```powershell
function Invoke-PostgreSQLQuery {
    param(
        [string]$Query,
        [string]$ConnectionString = $env:DATABASE_URL
    )
    
    try {
        $result = & psql $ConnectionString -c $Query -t -A
        return $result
    }
    catch {
        Write-Error "Error ejecutando query: $_"
        throw
    }
}

function Import-CSVToPostgreSQL {
    param(
        [string]$CSVPath,
        [string]$TableName,
        [string]$ConnectionString = $env:DATABASE_URL
    )
    
    # Implementación de importación
    $copyCommand = "\copy $TableName FROM '$CSVPath' CSV HEADER"
    & psql $ConnectionString -c $copyCommand
}

Export-ModuleMember -Function Invoke-PostgreSQLQuery, Import-CSVToPostgreSQL
```

**Tareas:**
- [ ] Crear módulo común PostgreSQL
- [ ] Adaptar scripts de importación críticos
- [ ] Adaptar scripts de limpieza de datos
- [ ] Probar importaciones masivas

#### Scripts Python

**Crear:** `scripts/db_utils.py`
```python
import os
import psycopg2
from psycopg2 import pool

class DatabasePool:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.pool = psycopg2.pool.SimpleConnectionPool(
                1, 20,
                dsn=os.environ['DATABASE_URL']
            )
        return cls._instance
    
    def get_connection(self):
        return self.pool.getconn()
    
    def return_connection(self, conn):
        self.pool.putconn(conn)
```

**Tareas:**
- [ ] Crear utilidades comunes
- [ ] Adaptar scripts de análisis
- [ ] Adaptar scripts de verificación
- [ ] Probar todos los scripts

### FASE 4: Dockerización (Días 9-10)

#### Día 9: Crear Dockerfiles

**Tareas:**
- [ ] Crear `Dockerfile.api`
- [ ] Crear `Dockerfile.frontend`
- [ ] Crear `docker-compose.yml`
- [ ] Crear `.dockerignore`
- [ ] Configurar variables de entorno

#### Día 10: Testing y Optimización

**Tareas:**
- [ ] Build de todas las imágenes
- [ ] Probar docker-compose localmente
- [ ] Verificar volúmenes persistentes
- [ ] Probar recreación de containers
- [ ] Optimizar tamaños de imágenes

---

## 6. Estimación de Esfuerzo

### 6.1 Desglose Detallado

| Fase | Tarea | Horas | Días |
|------|-------|-------|------|
| **Fase 1** | Instalación PostgreSQL local | 2h | 0.25 |
| | Creación de esquema | 3h | 0.38 |
| | Migración de datos | 2h | 0.25 |
| | Verificación de integridad | 2h | 0.25 |
| | Creación de índices | 1h | 0.13 |
| | **Subtotal Fase 1** | **10h** | **1.25** |
| **Fase 2** | Capa de abstracción DB | 4h | 0.5 |
| | Refactorizar endpoints críticos (20) | 8h | 1 |
| | Refactorizar endpoints secundarios (53) | 12h | 1.5 |
| | Testing de endpoints | 6h | 0.75 |
| | Manejo de errores y logging | 2h | 0.25 |
| | **Subtotal Fase 2** | **32h** | **4** |
| **Fase 3** | Módulo común PowerShell | 2h | 0.25 |
| | Adaptar scripts PowerShell (30) | 8h | 1 |
| | Adaptar scripts Python (10) | 4h | 0.5 |
| | Testing de scripts | 2h | 0.25 |
| | **Subtotal Fase 3** | **16h** | **2** |
| **Fase 4** | Crear Dockerfiles | 3h | 0.38 |
| | Crear docker-compose | 2h | 0.25 |
| | Configurar Nginx | 2h | 0.25 |
| | Testing Docker local | 4h | 0.5 |
| | Optimización | 2h | 0.25 |
| | **Subtotal Fase 4** | **13h** | **1.63** |
| **Testing Final** | Testing integración completa | 6h | 0.75 |
| | Documentación | 2h | 0.25 |
| | **Subtotal Testing** | **8h** | **1** |
| **TOTAL** | | **79h** | **~10 días** |

### 6.2 Recursos Necesarios

| Recurso | Especificación |
|---------|----------------|
| **Desarrollador Backend** | 1 persona, experiencia con Node.js + PostgreSQL |
| **DevOps (opcional)** | 0.5 personas, experiencia con Docker |
| **QA/Testing** | 0.5 personas para testing |
| **Servidor de pruebas** | 4 CPU, 8GB RAM, 100GB SSD |

---

## 7. Riesgos y Mitigaciones

### 7.1 Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Pérdida de datos en migración** | Baja | Crítico | Backup completo antes de migrar + validación exhaustiva |
| **Incompatibilidad de queries** | Media | Alto | Refactorizar con capa de abstracción + tests |
| **Problemas de performance** | Media | Medio | Profiling de queries + índices optimizados |
| **Scripts PowerShell no funcionan** | Media | Alto | Probar scripts uno por uno + módulo común |
| **Docker consume muchos recursos** | Baja | Medio | Optimizar imágenes + limits de recursos |
| **Bloqueos en migración de datos** | Media | Medio | Migrar en ventana de mantenimiento |

### 7.2 Plan de Rollback

**Si algo sale mal:**
1. Mantener SQLite funcionando en paralelo durante 1 mes
2. Tener backup de base de datos antes de migración
3. Git tags para volver a versión anterior del código
4. Documentar configuración anterior

**Criterios para rollback:**
- Más de 10% de queries con errores
- Performance 50% peor que SQLite
- Datos corruptos detectados
- Scripts críticos no funcionan

---

## 8. Configuraciones Propuestas

### 8.1 docker-compose.yml

```yaml
version: '3.8'

services:
  # Base de datos PostgreSQL
  db:
    image: postgres:16-alpine
    container_name: stc-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-produccion_stc}
      POSTGRES_USER: ${POSTGRES_USER:-stc_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Password requerido}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=es_ES.UTF-8"
    volumes:
      # Datos persistentes
      - pg_data:/var/lib/postgresql/data
      # Scripts de inicialización
      - ./init-db:/docker-entrypoint-initdb.d
      # Backups
      - ./backups:/backups
    ports:
      # Solo exponer si necesitas acceso externo para debugging
      - "127.0.0.1:5432:5432"
    networks:
      - stc-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-stc_user} -d ${POSTGRES_DB:-produccion_stc}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    # Configuraciones PostgreSQL
    command: >
      postgres
      -c max_connections=100
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c work_mem=2621kB
      -c min_wal_size=1GB
      -c max_wal_size=4GB

  # Backend API
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    container_name: stc-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3002
      DATABASE_URL: postgres://${POSTGRES_USER:-stc_user}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-produccion_stc}
      # Variables adicionales
      API_SECRET: ${API_SECRET:?API secret requerido}
      CORS_ORIGIN: ${CORS_ORIGIN:-*}
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3002:3002"
    networks:
      - stc-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3002/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    volumes:
      # Logs
      - ./logs:/app/logs
      # Archivos CSV para importación (readonly)
      - ${CSV_FOLDER:-C:/STC}:/data/csv:ro
    # Límites de recursos
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Frontend (Nginx + Vue build)
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: stc-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      - stc-network
    depends_on:
      - api
    volumes:
      # Certificados SSL (si aplica)
      - ./ssl:/etc/nginx/ssl:ro
      # Logs de Nginx
      - ./logs/nginx:/var/log/nginx
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M

  # Servicio de backups automáticos
  backup:
    image: postgres:16-alpine
    container_name: stc-backup
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-produccion_stc}
      POSTGRES_USER: ${POSTGRES_USER:-stc_user}
      PGPASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./backups:/backups
      - ./scripts/backup.sh:/backup.sh:ro
    networks:
      - stc-network
    depends_on:
      - db
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        echo "Iniciando servicio de backup automático..."
        while true; do
          echo "Ejecutando backup: $$(date)"
          pg_dump -h db -U $$POSTGRES_USER -d $$POSTGRES_DB | gzip > /backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz
          # Mantener solo últimos 30 días
          find /backups -name "backup_*.sql.gz" -mtime +30 -delete
          # Backup cada 6 horas
          sleep 21600
        done

networks:
  stc-network:
    driver: bridge

volumes:
  pg_data:
    driver: local
```

### 8.2 Dockerfile.api

```dockerfile
# ==========================================
# Backend API - Node.js + Express
# ==========================================
FROM node:20-alpine AS base

# Instalar dependencias del sistema para node-gyp (si necesita compilar módulos nativos)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# ==========================================
# Etapa de dependencias
# ==========================================
FROM base AS dependencies

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production --ignore-scripts

# ==========================================
# Etapa de build (si necesitas compilar algo)
# ==========================================
FROM base AS build

COPY package*.json ./
RUN npm ci

COPY scripts/sqlite-api-server.cjs ./server.cjs
COPY scripts/db-layer.cjs ./db-layer.cjs

# ==========================================
# Etapa final (runtime)
# ==========================================
FROM base AS runtime

# Usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar dependencias y código
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/server.cjs ./server.cjs
COPY --from=build --chown=nodejs:nodejs /app/db-layer.cjs ./db-layer.cjs

# Crear directorio para logs
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

USER nodejs

EXPOSE 3002

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.cjs"]
```

### 8.3 Dockerfile.frontend

```dockerfile
# ==========================================
# Frontend - Vue.js Build + Nginx
# ==========================================

# Etapa 1: Build de Vue.js
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# ==========================================
# Etapa 2: Nginx para servir
# ==========================================
FROM nginx:1.25-alpine

# Copiar build de Vue.js
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración de Nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Exponer puertos
EXPOSE 80 443

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### 8.4 nginx.conf

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Compresión gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    include /etc/nginx/conf.d/*.conf;
}
```

### 8.5 nginx-default.conf

```nginx
# Upstream para el backend API
upstream api_backend {
    server api:3002 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Redirigir a HTTPS (descomentar en producción con certificados)
    # return 301 https://$server_name$request_uri;

    root /usr/share/nginx/html;
    index index.html;

    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Seguridad headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy para API
    location /api/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffering
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache para assets estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Healthcheck
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}

# HTTPS (descomentar en producción)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name _;
#
#     ssl_certificate /etc/nginx/ssl/cert.pem;
#     ssl_certificate_key /etc/nginx/ssl/key.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#     ssl_prefer_server_ciphers on;
#
#     # ... mismo contenido que servidor HTTP
# }
```

### 8.6 .env (Template)

```bash
# ==========================================
# Variables de entorno - Docker Compose
# ==========================================

# PostgreSQL
POSTGRES_DB=produccion_stc
POSTGRES_USER=stc_user
POSTGRES_PASSWORD=CAMBIAR_EN_PRODUCCION

# API Backend
NODE_ENV=production
API_SECRET=CAMBIAR_EN_PRODUCCION
CORS_ORIGIN=https://tu-dominio.com

# Rutas
CSV_FOLDER=C:/STC

# Backup
BACKUP_RETENTION_DAYS=30
```

### 8.7 .dockerignore

```
# Node modules
node_modules/
npm-debug.log

# Ambiente local
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Git
.git/
.gitignore

# Archivos de desarrollo
*.md
!README.md

# Tests
tests/
coverage/

# Logs
logs/
*.log

# Database local
database/*.db
database/*.db-shm
database/*.db-wal

# Backups
backups/

# Archivos temporales
tmp/
temp/
*.tmp

# OS
.DS_Store
Thumbs.db

# Build artifacts
dist/
build/
```

---

## 9. Checklist de Implementación

### Pre-requisitos
- [ ] Backup completo de base de datos actual
- [ ] Backup de código (Git tag)
- [ ] Documentar configuración actual
- [ ] Servidor de pruebas disponible
- [ ] Credenciales de PostgreSQL generadas
- [ ] Variables de entorno configuradas

### Fase 1: PostgreSQL Setup
- [ ] PostgreSQL 16 instalado
- [ ] Base de datos creada
- [ ] Usuario y permisos configurados
- [ ] Esquema migrado
- [ ] Datos migrados
- [ ] Integridad verificada (SELECT COUNT(*) todas las tablas)
- [ ] Índices creados
- [ ] VACUUM ANALYZE ejecutado
- [ ] pgAdmin configurado (opcional)

### Fase 2: Backend API
- [ ] Módulo `pg` instalado (`npm install pg`)
- [ ] Capa de abstracción DB creada
- [ ] Connection pooling configurado
- [ ] 10 endpoints prioritarios refactorizados y probados
- [ ] 30 endpoints secundarios refactorizados y probados
- [ ] 33 endpoints restantes refactorizados y probados
- [ ] Manejo de errores implementado
- [ ] Logging configurado
- [ ] Variables de entorno configuradas
- [ ] Testing de regresión completo

### Fase 3: Scripts
- [ ] Módulo PowerShell común creado
- [ ] 10 scripts PowerShell críticos adaptados
- [ ] 20 scripts PowerShell secundarios adaptados
- [ ] 10 scripts Python adaptados
- [ ] Todos los scripts probados
- [ ] Documentación de scripts actualizada

### Fase 4: Docker
- [ ] Dockerfile.api creado
- [ ] Dockerfile.frontend creado
- [ ] docker-compose.yml creado
- [ ] nginx.conf configurado
- [ ] .env creado (no commitear)
- [ ] .dockerignore creado
- [ ] Build de imágenes exitoso
- [ ] docker-compose up funciona localmente
- [ ] Volúmenes persistentes verificados
- [ ] Healthchecks funcionando
- [ ] Logs accesibles

### Testing Final
- [ ] Todos los endpoints responden correctamente
- [ ] Importaciones de datos funcionan
- [ ] Scripts de análisis funcionan
- [ ] Performance aceptable (benchmarking)
- [ ] Backups automáticos funcionan
- [ ] Rollback probado
- [ ] Documentación actualizada

### Deploy a Producción
- [ ] Servidor de producción preparado
- [ ] Docker y Docker Compose instalados
- [ ] Variables de entorno configuradas
- [ ] Certificados SSL instalados (si aplica)
- [ ] Firewall configurado
- [ ] Deploy ejecutado
- [ ] Monitoring configurado
- [ ] Alertas configuradas
- [ ] Plan de rollback listo
- [ ] Usuarios notificados

---

## 10. Comandos Útiles de Referencia

### PostgreSQL

```bash
# Conectar a PostgreSQL
psql -U stc_user -d produccion_stc

# Ver tablas
\dt

# Describir tabla
\d tb_PRODUCCION

# Ver tamaño de base de datos
SELECT pg_size_pretty(pg_database_size('produccion_stc'));

# Ver tamaño por tabla
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Backup
pg_dump -U stc_user -d produccion_stc | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_20260131.sql.gz | psql -U stc_user -d produccion_stc

# VACUUM ANALYZE (optimizar)
VACUUM ANALYZE;

# Ver conexiones activas
SELECT count(*) FROM pg_stat_activity;

# Matar conexión
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = 12345;
```

### Docker

```bash
# Build de imágenes
docker-compose build

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f api
docker-compose logs -f db

# Ver estado
docker-compose ps

# Detener servicios
docker-compose down

# Reiniciar servicio específico
docker-compose restart api

# Ejecutar comando en container
docker-compose exec db psql -U stc_user -d produccion_stc
docker-compose exec api node -e "console.log('test')"

# Ver uso de recursos
docker stats

# Limpiar containers e imágenes no usadas
docker system prune -a

# Backup de volumen
docker run --rm -v stc_pg_data:/data -v $(pwd):/backup alpine tar czf /backup/pg_data_backup.tar.gz -C /data .

# Restore de volumen
docker run --rm -v stc_pg_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/pg_data_backup.tar.gz"
```

### npm

```bash
# Instalar pg (driver PostgreSQL)
npm install pg

# Desinstalar sqlite3
npm uninstall sqlite3

# Actualizar dependencias
npm update

# Audit de seguridad
npm audit fix
```

---

## 11. Recursos y Referencias

### Documentación Oficial
- **PostgreSQL:** https://www.postgresql.org/docs/16/
- **node-postgres (pg):** https://node-postgres.com/
- **Docker:** https://docs.docker.com/
- **Docker Compose:** https://docs.docker.com/compose/
- **Nginx:** https://nginx.org/en/docs/

### Herramientas
- **pgAdmin:** https://www.pgadmin.org/ (GUI para PostgreSQL)
- **DBeaver:** https://dbeaver.io/ (Cliente universal de DB)
- **pgloader:** https://github.com/dimitri/pgloader (Migración SQLite→PostgreSQL)
- **Docker Desktop:** https://www.docker.com/products/docker-desktop

### Tutoriales Recomendados
- PostgreSQL Performance Tuning: https://wiki.postgresql.org/wiki/Performance_Optimization
- Docker Multi-stage Builds: https://docs.docker.com/build/building/multi-stage/
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices

---

## 12. Contacto y Soporte

### Equipo del Proyecto
- **Desarrollador Principal:** [Nombre]
- **DevOps:** [Nombre]
- **DBA:** [Nombre]

### Escalación
1. Nivel 1: Desarrollador del proyecto
2. Nivel 2: Arquitecto de software
3. Nivel 3: Proveedor de servicios (hosting/cloud)

---

## 13. Notas Finales

### Consideraciones Importantes

1. **Ventana de Mantenimiento:** Planificar migración en fin de semana o fuera de horario laboral.

2. **Período de Convivencia:** Mantener SQLite funcionando en paralelo por al menos 30 días como respaldo.

3. **Backups:** Configurar backups automáticos ANTES de migrar a producción.

4. **Monitoring:** Implementar monitoring (logs, métricas, alertas) desde el día 1.

5. **Documentación:** Actualizar TODA la documentación con las nuevas configuraciones.

6. **Capacitación:** Capacitar al equipo en:
   - Comandos básicos de PostgreSQL
   - Manejo de Docker Compose
   - Procedimientos de backup/restore
   - Troubleshooting común

### Próximos Pasos Sugeridos

Después de completar esta migración, considerar:
- [ ] Implementar CI/CD (GitHub Actions / GitLab CI)
- [ ] Configurar monitoreo (Prometheus + Grafana)
- [ ] Implementar logging centralizado (ELK Stack)
- [ ] Configurar replicación de PostgreSQL para HA
- [ ] Implementar rate limiting más sofisticado
- [ ] Agregar autenticación JWT para API
- [ ] Configurar HTTPS con Let's Encrypt

---

**Documento creado:** 31 de enero de 2026  
**Última actualización:** 31 de enero de 2026  
**Versión:** 1.0  
**Estado:** Planificación - Pendiente de implementación
