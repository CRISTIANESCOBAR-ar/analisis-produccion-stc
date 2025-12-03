<template>
  <div class="dashboard-container">
    <!-- Header con estado del sistema -->
    <div class="header-card">
      <h1 class="title">📊 Dashboard de Producción</h1>
      <div v-if="systemStatus" class="status-info">
        <div class="status-item">
          <span class="label">Última actualización:</span>
          <span class="value">{{ formatDateTime(systemStatus.timestamp) }}</span>
        </div>
        <div class="status-item">
          <span class="label">Base de datos:</span>
          <span class="value">{{ systemStatus.database?.split('\\').pop() }}</span>
        </div>
      </div>
    </div>

    <!-- Grid de contadores de tablas -->
    <div v-if="systemStatus" class="stats-grid">
      <div 
        v-for="(count, table) in systemStatus.tables" 
        :key="table"
        class="stat-card"
      >
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <div class="stat-label">{{ formatTableName(table) }}</div>
          <div class="stat-value">{{ formatNumber(count) }}</div>
          <div class="stat-subtitle">registros</div>
        </div>
      </div>
    </div>

    <!-- Últimas importaciones -->
    <div class="section-card">
      <h2 class="section-title">🔄 Últimas Importaciones</h2>
      <div v-if="systemStatus?.lastImports" class="imports-table">
        <table>
          <thead>
            <tr>
              <th>Tabla</th>
              <th>Última Importación</th>
              <th>Filas Importadas</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="imp in systemStatus.lastImports" 
              :key="imp.tabla_destino"
            >
              <td>{{ formatTableName(imp.tabla_destino) }}</td>
              <td>{{ formatDateTime(imp.last_import_date) }}</td>
              <td>{{ formatNumber(imp.rows_imported) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Resumen de producción -->
    <div class="section-card">
      <h2 class="section-title">📈 Resumen de Producción (Últimos 7 días)</h2>
      
      <div class="date-filter">
        <label>
          <span>Desde:</span>
          <input v-model="startDate" type="date" />
        </label>
        <label>
          <span>Hasta:</span>
          <input v-model="endDate" type="date" />
        </label>
        <button @click="loadProduccionSummary" class="btn-primary">
          Actualizar
        </button>
      </div>

      <div v-if="produccionSummary.length > 0" class="chart-container">
        <div 
          v-for="item in produccionSummary" 
          :key="item.fecha"
          class="bar-chart-item"
        >
          <div class="bar-label">{{ formatDate(item.fecha) }}</div>
          <div class="bar-wrapper">
            <div 
              class="bar" 
              :style="{ width: getBarWidth(item.total_metros) + '%' }"
            >
              <span class="bar-value">{{ formatNumber(item.total_metros) }} m</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top motivos de parada -->
    <div class="section-card">
      <h2 class="section-title">⚠️ Top Motivos de Parada</h2>
      
      <div v-if="topMotivos.length > 0" class="motivos-list">
        <div 
          v-for="(motivo, index) in topMotivos" 
          :key="index"
          class="motivo-item"
        >
          <div class="motivo-rank">{{ index + 1 }}</div>
          <div class="motivo-content">
            <div class="motivo-name">{{ motivo.MOTIVO }}</div>
            <div class="motivo-stats">
              <span>{{ motivo.cantidad }} paradas</span>
              <span>{{ Math.round(motivo.total_horas) }} horas</span>
            </div>
          </div>
          <div 
            class="motivo-bar"
            :style="{ width: getMotivoBarWidth(motivo.total_horas) + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Loading y Error states -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Cargando datos...</p>
    </div>

    <div v-if="error" class="error-message">
      ⚠️ Error: {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDatabase } from '../composables/useDatabase'

const db = useDatabase()

const systemStatus = ref(null)
const produccionSummary = ref([])
const topMotivos = ref([])

// Fechas por defecto (últimos 7 días)
const endDate = ref(new Date().toISOString().split('T')[0])
const startDate = ref(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
)

const loading = computed(() => db.loading.value)
const error = computed(() => db.error.value)

// Cargar datos iniciales
onMounted(async () => {
  await loadSystemStatus()
  await loadProduccionSummary()
  await loadTopMotivos()
})

async function loadSystemStatus() {
  try {
    systemStatus.value = await db.getStatus()
  } catch (err) {
    console.error('Error cargando estado:', err)
  }
}

async function loadProduccionSummary() {
  try {
    produccionSummary.value = await db.getProduccionSummary(
      startDate.value,
      endDate.value
    )
  } catch (err) {
    console.error('Error cargando resumen de producción:', err)
  }
}

async function loadTopMotivos() {
  try {
    topMotivos.value = await db.getTopMotivosParada(
      startDate.value,
      endDate.value
    )
  } catch (err) {
    console.error('Error cargando motivos de parada:', err)
  }
}

// Helpers de formateo
function formatTableName(table) {
  const names = {
    'tb_PRODUCCION': 'Producción',
    'tb_CALIDAD': 'Control de Calidad',
    'tb_PARADAS': 'Paradas de Máquina',
    'tb_TESTES': 'Testes Físicos',
    'tb_RESIDUOS_POR_SECTOR': 'Residuos por Sector',
    'tb_RESIDUOS_INDIGO': 'Residuos Índigo',
    'tb_FICHAS': 'Fichas de Artículos'
  }
  return names[table] || table
}

function formatNumber(num) {
  return new Intl.NumberFormat('es-ES').format(num)
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short'
  })
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getBarWidth(value) {
  const maxValue = Math.max(...produccionSummary.value.map(item => item.total_metros))
  return (value / maxValue) * 100
}

function getMotivoBarWidth(value) {
  const maxValue = Math.max(...topMotivos.value.map(item => item.total_horas))
  return (value / maxValue) * 100
}
</script>

<style scoped>
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  background: transparent;
}

.header-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 24px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.status-info {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  gap: 8px;
}

.status-item .label {
  color: #666;
  font-weight: 500;
}

.status-item .value {
  color: #1a1a1a;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.stat-icon {
  font-size: 32px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #0078d4;
}

.stat-subtitle {
  font-size: 12px;
  color: #999;
}

.section-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 20px 0;
}

.imports-table table {
  width: 100%;
  border-collapse: collapse;
}

.imports-table th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #dee2e6;
}

.imports-table td {
  padding: 12px;
  border-bottom: 1px solid #dee2e6;
  color: #666;
}

.date-filter {
  display: flex;
  gap: 16px;
  align-items: end;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.date-filter label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-filter input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.btn-primary {
  padding: 8px 24px;
  background: #0078d4;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #005a9e;
}

.chart-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-chart-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  min-width: 80px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.bar-wrapper {
  flex: 1;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  height: 32px;
}

.bar {
  height: 100%;
  background: linear-gradient(90deg, #0078d4, #00bcf2);
  display: flex;
  align-items: center;
  padding: 0 12px;
  transition: width 0.3s;
}

.bar-value {
  color: white;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.motivos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.motivo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.motivo-rank {
  font-size: 18px;
  font-weight: 700;
  color: #0078d4;
  min-width: 32px;
  text-align: center;
}

.motivo-content {
  flex: 1;
  z-index: 1;
}

.motivo-name {
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.motivo-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
}

.motivo-bar {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, rgba(220, 53, 69, 0.1), rgba(220, 53, 69, 0.2));
  transition: width 0.3s;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0078d4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}
</style>
