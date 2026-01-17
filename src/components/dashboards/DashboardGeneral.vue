<template>
  <div class="dashboard-general">
    <!-- Header -->
    <div class="dashboard-header">
      <div>
        <h1 class="dashboard-title">📊 Dashboard de Producción</h1>
        <p class="dashboard-subtitle">Sistema integrado de análisis en tiempo real</p>
      </div>
      
      <div class="header-controls">
        <div class="filter-group">
          <label>Desde:</label>
          <input v-model="startDate" type="date" class="input-date" />
        </div>
        <div class="filter-group">
          <label>Hasta:</label>
          <input v-model="endDate" type="date" class="input-date" />
        </div>
        <button @click="loadDashboard" class="btn-primary" :disabled="loading">
          {{ loading ? '⏳ Cargando...' : '🔄 Actualizar' }}
        </button>
        <div class="last-update">
          {{ kpisComposable.formatLastUpdate() }}
        </div>
      </div>
    </div>

    <!-- Contenido principal -->
    <div v-if="loading" class="loading-container">
      <div class="spinner-large"></div>
      <p>Cargando datos del dashboard...</p>
    </div>

    <div v-else class="dashboard-content">
      <!-- Sección KPIs -->
      <section class="dashboard-section">
        <h2 class="section-title">🎯 KPIs Principales</h2>
        
        <div class="kpi-grid">
          <KPICard
            label="Metros Producidos"
            :value="kpisComposable.metrosHoy"
            unit="m"
            icon="📏"
            status="success"
            size="large"
          />
          
          <KPICard
            label="Calidad Promedio"
            :value="kpisComposable.calidadPromedio"
            unit="%"
            icon="✅"
            status="normal"
            size="large"
          />
          
          <KPICard
            label="Total Paradas"
            :value="kpisComposable.totalParadas"
            icon="🛑"
            :status="kpisComposable.totalParadas > 20 ? 'warning' : 'normal'"
            size="large"
          />
          
          <KPICard
            label="Minutos en Parada"
            :value="kpisComposable.minutosParada"
            unit="min"
            icon="⏱️"
            :status="kpisComposable.minutosParada > 300 ? 'warning' : 'normal'"
            size="large"
          />
          
          <KPICard
            label="Eficiencia Global"
            :value="kpisComposable.eficiencia"
            unit="%"
            icon="⚡"
            :status="kpisComposable.eficiencia < 75 ? 'warning' : 'success'"
            size="large"
          />
        </div>
      </section>

      <!-- Sección de Gráficos -->
      <section class="dashboard-section">
        <h2 class="section-title">📈 Análisis Detallado</h2>
        
        <div class="charts-grid">
          <!-- Top Motivos de Parada -->
          <div class="chart-wrapper">
            <ChartWidget
              title="Top 5 Motivos de Parada"
              :data="topMotivosData"
              chart-type="bar"
              :loading="loading"
            />
          </div>

          <!-- Top Revisores -->
          <div class="chart-wrapper">
            <DataTableWidget
              title="Top 5 Revisores por Calidad"
              :columns="revisoresColumns"
              :data="topRevisoresData"
              :loading="loading"
              :max-rows="5"
            />
          </div>
        </div>
      </section>

      <!-- Sección de Información del Sistema -->
      <section class="dashboard-section">
        <h2 class="section-title">💾 Estado del Sistema</h2>
        
        <div class="system-info">
          <div v-if="systemData" class="info-grid">
            <div class="info-item">
              <span class="info-label">Base de Datos:</span>
              <span class="info-value">{{ systemData.database }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Última Actualización:</span>
              <span class="info-value">{{ formatDateTime(systemData.timestamp) }}</span>
            </div>
            <div v-if="systemData.tables" class="info-item">
              <span class="info-label">Registros Producción:</span>
              <span class="info-value">{{ formatNumber(systemData.tables['tb_PRODUCCION']) }}</span>
            </div>
            <div v-if="systemData.tables" class="info-item">
              <span class="info-label">Registros Calidad:</span>
              <span class="info-value">{{ formatNumber(systemData.tables['tb_CALIDAD']) }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import KPICard from '../widgets/KPICard.vue'
import ChartWidget from '../widgets/ChartWidget.vue'
import DataTableWidget from '../widgets/DataTableWidget.vue'
import { useKPIs } from '@/composables/useKPIs'
import { useDatabase } from '@/composables/useDatabase'

// Composables
const kpisComposable = useKPIs()
const { getStatus } = useDatabase()

// Estado
const loading = ref(true)
const systemData = ref(null)
const refreshInterval = ref(null)

// Filtros
const today = new Date().toISOString().split('T')[0]
const startDate = ref(today)
const endDate = ref(today)

// Computed data para gráficos
const topMotivosData = computed(() => {
  return kpisComposable.topMotivos.value.map(item => ({
    label: item.motivo,
    value: item.cantidad
  }))
})

const revisoresColumns = [
  { key: 'revisor', label: 'Revisor', type: 'text' },
  { key: 'calidad', label: 'Calidad', type: 'percentage', align: 'right' },
  { key: 'roladas', label: 'Roladas', type: 'number', align: 'right' }
]

const topRevisoresData = computed(() => {
  return kpisComposable.topRevisores.value
})

// Métodos
const loadDashboard = async () => {
  loading.value = true
  try {
    // Cargar KPIs
    await kpisComposable.loadKPIs(startDate.value, endDate.value)
    
    // Cargar información del sistema
    systemData.value = await getStatus()
  } catch (error) {
    console.error('Error cargando dashboard:', error)
  } finally {
    loading.value = false
  }
}

const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleString('es-ES')
}

const formatNumber = (value) => {
  if (!value) return '0'
  return value.toLocaleString('es-ES')
}

// Auto-refresh cada 10 minutos
const setupAutoRefresh = () => {
  refreshInterval.value = setInterval(() => {
    loadDashboard()
  }, 10 * 60 * 1000) // 10 minutos
}

const clearAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
}

// Lifecycle
onMounted(() => {
  loadDashboard()
  setupAutoRefresh()
})

onUnmounted(() => {
  clearAutoRefresh()
})
</script>

<style scoped>
.dashboard-general {
  padding: 20px;
  background: #f3f4f6;
  min-height: 100vh;
}

/* Header */
.dashboard-header {
  background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.dashboard-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
}

.dashboard-subtitle {
  margin: 4px 0 0 0;
  font-size: 14px;
  opacity: 0.9;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-group label {
  font-size: 13px;
  font-weight: 600;
}

.input-date {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
}

.input-date::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.btn-primary {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #059669;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.last-update {
  font-size: 12px;
  opacity: 0.9;
  padding: 0 8px;
}

/* Content */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #6b7280;
}

.spinner-large {
  width: 60px;
  height: 60px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Secciones */
.dashboard-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  border-left: 4px solid #3b82f6;
  padding-left: 12px;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* Charts Grid */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 16px;
}

.chart-wrapper {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

/* System Info */
.system-info {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
}

.info-value {
  font-size: 16px;
  color: #1f2937;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 1024px) {
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-controls {
    justify-content: flex-start;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .kpi-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
}

@media (max-width: 640px) {
  .dashboard-general {
    padding: 12px;
  }

  .dashboard-header {
    padding: 16px;
  }

  .dashboard-title {
    font-size: 20px;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
