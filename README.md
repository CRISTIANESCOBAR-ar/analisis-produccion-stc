# Análisis de Producción STC

Sistema de análisis de datos de producción basado en Access y archivos Excel.

## 🚀 Inicio Rápido

```bash
# Iniciar API + Frontend simultáneamente
npm run start:all

# O iniciar por separado:
npm run api      # API REST en http://localhost:3001
npm run dev      # Frontend en http://localhost:5173
```

## 📊 Funcionalidades

- **Dashboard**: Resumen de producción con estadísticas y gráficos
- **Fichas**: Búsqueda de fichas técnicas con detalles de composición
- **Calidad**: Control de calidad con filtros y paginación
- **Paradas**: Seguimiento de paradas de máquina con duración

## 🗄️ Base de Datos

SQLite en `database/produccion.db` con 7 tablas:
- tb_PRODUCCION
- tb_CALIDAD
- tb_PARADAS
- tb_TESTES
- tb_RESIDUOS_POR_SECTOR
- tb_RESIDUOS_INDIGO
- tb_FICHAS

## 📥 Importación de Datos

### GUI Interactiva
```powershell
.\scripts\import-gui.ps1
```

### Actualización Manual
```powershell
.\scripts\update-all-tables.ps1
```

### Actualización con Email
```powershell
.\scripts\update-with-email.ps1
```

## 📝 Changelog (reciente)

- 2025-12-10: Fix: normalización de import para `tb_PRODUCCION` — el script de importación rápido ahora normaliza `PARTIDA` (quita sufijo `.0` y agrega cero inicial cuando corresponde), normaliza `FILIAL` (`5` → `05`) y fechas (`YYYY-MM-DD` → `DD/MM/YYYY`). Además se agregó un fallback en la consulta de producción que intenta mapear partidas con prefijos distintos (p.ej. `1542007` → `0542007`) para mejorar el match entre `tb_CALIDAD` y `tb_PRODUCCION`. Cambios en archivos: `scripts/excel-to-csv.py`, `scripts/import-produccion-fast.ps1`, `scripts/sqlite-api-server.cjs`, `scripts/update-all-tables.ps1`, `src/components/ImportControl.vue`.


## 🔧 Scripts

- **ExportarAccessSegmentado.vba**: Exporta Access a CSV segmentados por mes
- **update-all-tables.ps1**: Importa todos los CSVs a SQLite
- **import-gui.ps1**: GUI para importación selectiva
- **sqlite-api-server.js**: Servidor REST API

## 📡 API Endpoints

| Endpoint | Descripción |
|----------|-------------|
| GET /api/status | Estado de la API y conteo de registros |
| GET /api/produccion | Lista de producción con filtros |
| GET /api/produccion/summary | Resumen de producción |
| GET /api/calidad | Inspecciones de calidad |
| GET /api/paradas | Paradas de máquina |
| GET /api/paradas/top-motivos | Top 10 motivos de parada |
| GET /api/fichas | Fichas técnicas |
| GET /api/fichas/:codigo | Detalle de ficha por código |

## 🛠️ Tecnologías

- Vue 3 + Vite
- Vue Router
- Chart.js + vue-chartjs
- Express + SQLite3
- PowerShell (importación)
- VBA (exportación Access)
