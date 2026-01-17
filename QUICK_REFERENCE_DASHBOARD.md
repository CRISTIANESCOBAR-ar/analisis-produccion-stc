# ⚡ Quick Reference - Dashboard Nativo FASE 1

## 🎯 Acceso Rápido

```
📍 Dashboard:  http://localhost:5173/dashboard
📍 API:        http://localhost:3002/api
📍 Dev:        http://localhost:5173
```

## 🚀 Comandos

```bash
# Iniciar todo (Dev + API)
npm run start:all

# Solo servidor de desarrollo
npm run dev

# Solo API
npm run api

# Build para producción
npm run build

# Preview build
npm run preview

# Linting
npm run lint

# Verificar FASE 1
node scripts/verify-dashboard-phase1.cjs
```

## 📁 Estructura Nueva

```
src/
├── composables/
│   └── useKPIs.js ..................... Lógica de KPIs (5.4 KB)
├── components/
│   ├── dashboards/
│   │   └── DashboardGeneral.vue ........ Dashboard principal (10.9 KB)
│   └── widgets/
│       ├── KPICard.vue ................ Tarjetas (4.1 KB)
│       ├── ChartWidget.vue ............ Gráficos (4.8 KB)
│       └── DataTableWidget.vue ........ Tablas (7.0 KB)
└── router/
    └── index.js ...................... Actualizado con /dashboard
```

## 🎨 Componentes Disponibles

### KPICard
```vue
<KPICard
  label="Metros Producidos"
  :value="123.45"
  unit="m"
  icon="📏"
  status="success"
  size="large"
  :change="5"
/>
```

**Props:**
- `label`: Nombre del KPI
- `value`: Número o string
- `unit`: Unidad (m, %, etc)
- `icon`: Emoji o icono
- `status`: normal | warning | danger | success
- `size`: small | medium | large
- `change`: Porcentaje de cambio (opcional)

### ChartWidget
```vue
<ChartWidget
  title="Top 5 Motivos"
  :data="[{ label: 'A', value: 10 }, ...]"
  chart-type="bar"
  :loading="false"
/>
```

**Props:**
- `title`: Título del gráfico
- `data`: Array de { label, value }
- `chart-type`: line | bar | pie | doughnut
- `loading`: Boolean
- `options`: Opciones de Chart.js (opcional)

### DataTableWidget
```vue
<DataTableWidget
  title="Revisores"
  :columns="[{ key: 'name', label: 'Nombre' }, ...]"
  :data="revisores"
  :loading="false"
/>
```

**Props:**
- `title`: Título de la tabla
- `columns`: Array de { key, label, type }
- `data`: Array de datos
- `loading`: Boolean
- `sortable`: Boolean (default: true)
- `maxRows`: Número máximo (default: 10)

## 🔧 useKPIs Composable

```javascript
import { useKPIs } from '@/composables/useKPIs'

const {
  // Métodos
  loadKPIs(startDate, endDate),  // Cargar KPIs
  formatLastUpdate(),             // Última actualización
  
  // KPIs (computed)
  metrosHoy,                      // Metros producidos
  calidadPromedio,                // Calidad %
  totalParadas,                   // Cantidad de paradas
  minutosParada,                  // Minutos en parada
  eficiencia,                     // Eficiencia %
  topMotivos,                     // Top 5 motivos
  topRevisores,                   // Top 5 revisores
  
  // Estado
  loading,                        // Ref: cargando
  error,                          // Ref: error
  lastUpdate,                     // Ref: timestamp
  kpis                            // Ref: datos crudos
} = useKPIs()
```

## 📊 KPIs Disponibles

| KPI | Valor | Fuente |
|-----|-------|--------|
| **Metros Hoy** | m | tb_PRODUCCION |
| **Calidad** | % | tb_CALIDAD |
| **Paradas** | cantidad | tb_PRODUCCION |
| **Min Parada** | minutos | tb_PRODUCCION |
| **Eficiencia** | % | Calculado |
| **Top Motivos** | JSON | tb_PRODUCCION |
| **Top Revisores** | JSON | tb_CALIDAD |

## 🎨 Estados KPI

```vue
<!-- Success (verde) -->
<KPICard status="success" />

<!-- Normal (azul) -->
<KPICard status="normal" />

<!-- Warning (naranja) -->
<KPICard status="warning" />

<!-- Danger (rojo) -->
<KPICard status="danger" />
```

## 🔄 Flujo de Datos

```
Vista (DashboardGeneral.vue)
    ↓
useKPIs Composable
    ↓
useDatabase Composable
    ↓
Fetch API
    ↓
Express Server (puerto 3002)
    ↓
SQLite Database
```

## 💡 Próximas Fases

### FASE 2: Visualizaciones
- [ ] Tendencias gráficas (últimos 7-30 días)
- [ ] Gráficos combinados
- [ ] Mapas de calor
- [ ] Análisis de Pareto

### FASE 3: Interactividad
- [ ] Drill-down
- [ ] Drag & Drop
- [ ] Widgets configurables
- [ ] Temas

### FASE 4: Alertas
- [ ] Umbrales
- [ ] Notificaciones
- [ ] Panel de alertas
- [ ] Email

### FASE 5: Export
- [ ] PDF
- [ ] Excel
- [ ] Email
- [ ] URLs compartibles

## 🔗 Rutas del Sistema

```
/dashboard                    → Dashboard principal 🆕
/revision-cq                  → Revisión de calidad
/analisis-historico-revisores → Histórico
/analisis-mesa-test           → Mesa de test
/importaciones                → Control de importaciones
/residuos-indigo-tejeduria    → Residuos
/analisis-residuos-indigo     → Análisis
/consulta-rolada-indigo       → Consultas
/informe-produccion-indigo    → Informe
/seguimiento-roladas          → Seguimiento
/costos-mensuales             → Costos
```

## 📝 Importar en Componentes

```javascript
// Composable
import { useKPIs } from '@/composables/useKPIs'

// Widgets
import KPICard from '@/components/widgets/KPICard.vue'
import ChartWidget from '@/components/widgets/ChartWidget.vue'
import DataTableWidget from '@/components/widgets/DataTableWidget.vue'

// Dashboard
import DashboardGeneral from '@/components/dashboards/DashboardGeneral.vue'
```

## 🎯 Ejemplo Completo

```vue
<template>
  <div>
    <!-- Filtros -->
    <input v-model="startDate" type="date" />
    <input v-model="endDate" type="date" />
    <button @click="load">Actualizar</button>

    <!-- KPI Cards -->
    <div class="grid">
      <KPICard
        label="Metros"
        :value="kpis.metrosHoy"
        unit="m"
        icon="📏"
        status="success"
      />
    </div>

    <!-- Gráficos -->
    <ChartWidget
      title="Top Motivos"
      :data="topMotivos"
      chart-type="bar"
      :loading="loading"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useKPIs } from '@/composables/useKPIs'
import KPICard from '@/components/widgets/KPICard.vue'
import ChartWidget from '@/components/widgets/ChartWidget.vue'

const kpis = useKPIs()
const startDate = ref(today)
const endDate = ref(today)

const load = async () => {
  await kpis.loadKPIs(startDate.value, endDate.value)
}
</script>
```

## ⚙️ Configuración

### Vite (`vite.config.js`)
```javascript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src')
  }
}
```

### Auto-refresh
```javascript
// En DashboardGeneral.vue
setInterval(() => loadDashboard(), 10 * 60 * 1000) // 10 minutos
```

## 📦 Dependencias Utilizadas

- **Vue 3**: Framework
- **Vite**: Bundler
- **Chart.js**: Gráficos
- **Tailwind CSS**: Estilos
- **Express**: API
- **SQLite**: Base de datos

## 🐛 Debugging

```javascript
// Ver datos crudos
console.log(kpis.value.kpis)

// Ver estado de carga
console.log(loading.value)

// Ver último error
console.log(error.value)

// Verificar conexión API
fetch('http://localhost:3002/api/status')
  .then(r => r.json())
  .then(d => console.log(d))
```

## 📞 Soporte

Documentación completa: [DASHBOARD_NATIVO_FASE1.md](./DASHBOARD_NATIVO_FASE1.md)

Resumen: [RESUMEN_IMPLEMENTACION.txt](./RESUMEN_IMPLEMENTACION.txt)

---

**Versión:** 1.0 FASE 1  
**Actualizado:** 12 de enero de 2026  
**Estado:** ✅ Producción Ready
