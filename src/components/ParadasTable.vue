<template>
  <div class="paradas-container">
    <div class="header">
      <h1 class="title">⚠️ Paradas de Máquina</h1>
      <p class="subtitle">Registro de interrupciones y tiempos de parada</p>
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
          <label>Máquina:</label>
          <input v-model="filters.maquina" type="text" placeholder="Ej: M01" class="filter-input" />
        </div>
        <div class="filter-group">
          <label>Motivo:</label>
          <input v-model="filters.motivo" type="text" placeholder="Buscar motivo" class="filter-input" />
        </div>
      </div>
      <div class="filters-actions">
        <button @click="applyFilters" class="btn-primary">
          🔍 Aplicar Filtros
        </button>
        <button @click="clearFilters" class="btn-secondary">
          ✕ Limpiar
        </button>
      </div>
    </div>

    <!-- Tabla de resultados -->
    <div class="table-card">
      <div class="table-header">
        <div class="results-info">
          <span class="results-count">{{ totalRows }} paradas</span>
          <span v-if="totalHoras > 0" class="total-badge">
            {{ formatNumber(totalHoras) }} horas totales
          </span>
        </div>
        <div class="pagination-controls">
          <select v-model.number="pageSize" @change="loadData" class="page-size-select">
            <option :value="25">25 por página</option>
            <option :value="50">50 por página</option>
            <option :value="100">100 por página</option>
          </select>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Máquina</th>
              <th>Turno</th>
              <th>Motivo</th>
              <th>Detalle</th>
              <th>Hora Inicio</th>
              <th>Hora Fin</th>
              <th>Duración (min)</th>
              <th>Duración (h)</th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paradasData" :key="row.id || Math.random()">
              <td>{{ formatDate(row.DATA_BASE) }}</td>
              <td class="text-center font-weight-bold">{{ row.MAQUINA }}</td>
              <td class="text-center">{{ row.TURNO }}</td>
              <td>
                <span class="motivo-badge" :class="getMotivoClass(row.MOTIVO)">
                  {{ row.MOTIVO }}
                </span>
              </td>
              <td class="detail-cell">{{ row.DETALHE }}</td>
              <td class="text-center">{{ formatTime(row.HORA_INICIO) }}</td>
              <td class="text-center">{{ formatTime(row.HORA_FIM) }}</td>
              <td class="text-right">{{ formatNumber(row.DURACAO_MINUTOS) }}</td>
              <td class="text-right">{{ formatNumber(row.DURACAO_HORAS) }}</td>
              <td>{{ row.RESPONSAVEL }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="pagination">
        <button 
          @click="goToPage(currentPage - 1)" 
          :disabled="currentPage === 1 || loading"
          class="pagination-btn"
        >
          ← Anterior
        </button>
        <div class="pagination-info">
          Página {{ currentPage }} de {{ totalPages }}
        </div>
        <button 
          @click="goToPage(currentPage + 1)" 
          :disabled="currentPage === totalPages || loading"
          class="pagination-btn"
        >
          Siguiente →
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Cargando paradas...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      ⚠️ Error: {{ error }}
    </div>

    <!-- Empty state -->
    <div v-if="!loading && paradasData.length === 0" class="empty-state">
      <div class="empty-icon">📊</div>
      <p class="empty-message">No hay paradas registradas</p>
      <p class="empty-hint">Intenta ajustar los filtros o verifica la importación</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDatabase } from '../composables/useDatabase'

const db = useDatabase()

const paradasData = ref([])
const currentPage = ref(1)
const pageSize = ref(50)
const totalRows = ref(0)
const totalHoras = ref(0)

const filters = ref({
  startDate: '',
  endDate: '',
  maquina: '',
  motivo: ''
})

const loading = computed(() => db.loading.value)
const error = computed(() => db.error.value)

const totalPages = computed(() => {
  return Math.ceil(totalRows.value / pageSize.value)
})

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
      page: currentPage.value,
      limit: pageSize.value,
      startDate: filters.value.startDate,
      endDate: filters.value.endDate
    }

    const result = await db.getParadas(params)
    
    paradasData.value = result.data || []
    totalRows.value = result.total || 0
    currentPage.value = result.page || 1

    // Calcular total de horas
    totalHoras.value = paradasData.value.reduce((sum, row) => {
      return sum + (parseFloat(row.DURACAO_HORAS) || 0)
    }, 0)
  } catch (err) {
    console.error('Error cargando paradas:', err)
    paradasData.value = []
    totalRows.value = 0
    totalHoras.value = 0
  }
}

function applyFilters() {
  currentPage.value = 1
  loadData()
}

function clearFilters() {
  filters.value = {
    startDate: '',
    endDate: '',
    maquina: '',
    motivo: ''
  }
  currentPage.value = 1
  loadData()
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    loadData()
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatTime(timeStr) {
  if (!timeStr) return '-'
  // Si es formato ISO completo, extraer solo la hora
  if (timeStr.includes('T')) {
    return new Date(timeStr).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  return timeStr
}

function formatNumber(num) {
  if (num === null || num === undefined) return '-'
  return new Intl.NumberFormat('es-ES', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(num)
}

function getMotivoClass(motivo) {
  if (!motivo) return 'motivo-default'
  const m = motivo.toUpperCase()
  
  if (m.includes('MANUTENCAO') || m.includes('MANUTENÇÃO')) return 'motivo-maintenance'
  if (m.includes('FALTA') || m.includes('AGUARDANDO')) return 'motivo-waiting'
  if (m.includes('SETUP') || m.includes('AJUSTE')) return 'motivo-setup'
  if (m.includes('QUALIDADE') || m.includes('DEFEITO')) return 'motivo-quality'
  
  return 'motivo-default'
}
</script>

<style scoped>
.paradas-container {
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

.total-badge {
  background: #dc3545;
  color: white;
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

.font-weight-bold {
  font-weight: 700;
  color: #333;
}

.detail-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.motivo-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.motivo-maintenance {
  background: #fff3cd;
  color: #856404;
}

.motivo-waiting {
  background: #f8d7da;
  color: #721c24;
}

.motivo-setup {
  background: #d1ecf1;
  color: #0c5460;
}

.motivo-quality {
  background: #f8d7da;
  color: #721c24;
}

.motivo-default {
  background: #e7e7e7;
  color: #333;
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
