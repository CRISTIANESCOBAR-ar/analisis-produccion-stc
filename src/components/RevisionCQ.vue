<template>
  <div class="calidad-container">
    <div class="header">
      <h1 class="title">📋 REVISIÓN - CQ</h1>
      <p class="subtitle">Informe detallado de revisión de calidad</p>
    </div>

    <!-- Filtros -->
    <div class="filters-card">
      <div class="filters-grid">
        <div class="filter-group">
          <label>Fecha Desde:</label>
          <input v-model="filters.startDate" type="date" class="filter-input" />
        </div>
        <div class="filter-group">
          <label>Fecha Hasta:</label>
          <input v-model="filters.endDate" type="date" class="filter-input" />
        </div>
        <div class="filter-group">
          <label>Tramas:</label>
          <select v-model="filters.tramas" class="filter-input">
            <option value="Todas">Todas</option>
            <option value="ALG 100%">ALG 100%</option>
            <option value="P + E">P + E</option>
            <option value="POL 100%">POL 100%</option>
          </select>
        </div>
      </div>
      <div class="filters-actions">
        <button @click="applyFilters" class="btn-primary">
          🔍 Generar Informe
        </button>
      </div>
    </div>

    <!-- Tabla de resultados -->
    <div class="table-card">
      <div class="table-header">
        <div class="results-info">
          <span class="results-count">{{ calidadData.length }} revisores</span>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Revisor</th>
              <th class="text-right">Metros Día</th>
              <th class="text-right">Calidad %</th>
              <th class="text-right">Pts 100m²</th>
              <th class="text-right">Rollos 1era</th>
              <th class="text-right">Sin Pts [un]</th>
              <th class="text-right">Sin Pts [%]</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in calidadData" :key="row.Revisor">
              <td class="font-medium">{{ row.Revisor }}</td>
              <td class="text-right font-bold">{{ formatNumber(row.Mts_Total) }}</td>
              <td class="text-right">{{ formatNumber(row.Calidad_Perc) }}%</td>
              <td class="text-right">{{ formatNumber(row.Pts_100m2) }}</td>
              <td class="text-right">{{ row.Rollos_1era }}</td>
              <td class="text-right">{{ row.Rollos_Sin_Pts }}</td>
              <td class="text-right">{{ formatNumber(row.Perc_Sin_Pts) }}%</td>
            </tr>
            <!-- Fila de Totales -->
            <tr v-if="calidadData.length > 0" class="bg-gray-100 font-bold border-t-2 border-gray-300">
              <td>TOTAL</td>
              <td class="text-right">{{ formatNumber(totals.Mts_Total) }}</td>
              <td class="text-right">{{ formatNumber(totals.Calidad_Perc) }}%</td>
              <td class="text-right">{{ formatNumber(totals.Pts_100m2) }}</td>
              <td class="text-right">{{ totals.Rollos_1era }}</td>
              <td class="text-right">{{ totals.Rollos_Sin_Pts }}</td>
              <td class="text-right">{{ formatNumber(totals.Perc_Sin_Pts) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Cargando datos...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      ⚠️ Error: {{ error }}
    </div>

    <!-- Empty state -->
    <div v-if="!loading && calidadData.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-message">No hay datos de calidad disponibles</p>
      <p class="empty-hint">Intenta ajustar los filtros o verifica la importación</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDatabase } from '../composables/useDatabase'

const db = useDatabase()

const calidadData = ref([])
const totals = ref({
  Mts_Total: 0,
  Calidad_Perc: 0,
  Pts_100m2: 0,
  Rollos_1era: 0,
  Rollos_Sin_Pts: 0,
  Perc_Sin_Pts: 0
})

const filters = ref({
  startDate: '',
  endDate: '',
  tramas: 'Todas'
})

const loading = computed(() => db.loading.value)
const error = computed(() => db.error.value)

onMounted(() => {
  // Cargar últimos 7 días por defecto
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  filters.value.endDate = today.toISOString().split('T')[0]
  filters.value.startDate = weekAgo.toISOString().split('T')[0]
  
  loadData()
})

async function loadData() {
  try {
    const params = {
      startDate: filters.value.startDate,
      endDate: filters.value.endDate,
      tramas: filters.value.tramas
    }

    const result = await db.getRevisionCQ(params)
    calidadData.value = result || []
    calculateTotals()
  } catch (err) {
    console.error('Error cargando reporte Revision CQ:', err)
    calidadData.value = []
  }
}

function calculateTotals() {
  if (calidadData.value.length === 0) {
    totals.value = { Mts_Total: 0, Calidad_Perc: 0, Pts_100m2: 0, Rollos_1era: 0, Rollos_Sin_Pts: 0, Perc_Sin_Pts: 0 }
    return
  }

  // Sumas simples
  const sumMts = calidadData.value.reduce((acc, r) => acc + (r.Mts_Total || 0), 0)
  const sumRollos1 = calidadData.value.reduce((acc, r) => acc + (r.Rollos_1era || 0), 0)
  const sumRollosSinPts = calidadData.value.reduce((acc, r) => acc + (r.Rollos_Sin_Pts || 0), 0)

  // Promedios ponderados (aproximación simple basada en datos disponibles en la tabla)
  // Para ser exactos deberíamos traer los numeradores/denominadores del backend, 
  // pero para visualización rápida promediamos los porcentajes ponderados por metros o rollos.
  
  // Calidad % ponderado por metros totales
  let weightedCalidad = 0
  if (sumMts > 0) {
    weightedCalidad = calidadData.value.reduce((acc, r) => acc + (r.Calidad_Perc * r.Mts_Total), 0) / sumMts
  }

  // Pts 100m2 ponderado por metros (aproximación)
  let weightedPts = 0
  if (sumMts > 0) {
    weightedPts = calidadData.value.reduce((acc, r) => acc + (r.Pts_100m2 * r.Mts_Total), 0) / sumMts
  }

  // % Sin Pts ponderado por rollos 1era
  let weightedSinPts = 0
  if (sumRollos1 > 0) {
    weightedSinPts = (sumRollosSinPts / sumRollos1) * 100
  }

  totals.value = {
    Mts_Total: sumMts,
    Calidad_Perc: weightedCalidad,
    Pts_100m2: weightedPts,
    Rollos_1era: sumRollos1,
    Rollos_Sin_Pts: sumRollosSinPts,
    Perc_Sin_Pts: weightedSinPts
  }
}

function applyFilters() {
  loadData()
}

function formatNumber(num) {
  if (num === null || num === undefined) return '-'
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num)
}
</script>

<style scoped>
.calidad-container {
  max-width: 1600px;
  margin: 0 auto;
  background: transparent;
  min-height: 100vh;
}

.header {
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
  margin: 0 0 8px 0;
}

.subtitle {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.filters-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 24px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.filter-input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.filter-input:focus {
  outline: none;
  border-color: #0078d4;
}

.filters-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-primary, .btn-secondary {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #0078d4;
  color: white;
}

.btn-primary:hover {
  background: #005a9e;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.table-header {
  padding: 20px 24px;
  border-bottom: 2px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.results-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.results-count {
  font-weight: 600;
  color: #0078d4;
  font-size: 16px;
}

.filter-badge {
  background: #ffc107;
  color: #000;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.page-size-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: #f8f9fa;
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
  color: #333;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #dee2e6;
  color: #666;
  font-size: 14px;
}

.data-table tbody tr:hover {
  background: #f8f9fa;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-success {
  background: #d4edda;
  color: #155724;
}

.status-danger {
  background: #f8d7da;
  color: #721c24;
}

.status-warning {
  background: #fff3cd;
  color: #856404;
}

.pagination {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 2px solid #f0f0f0;
}

.pagination-btn {
  padding: 8px 20px;
  background: #0078d4;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #005a9e;
}

.pagination-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.5;
}

.pagination-info {
  font-weight: 600;
  color: #666;
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

.empty-state {
  background: white;
  padding: 60px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
  margin-top: 24px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-message {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.empty-hint {
  color: #666;
  margin: 0;
}
</style>
