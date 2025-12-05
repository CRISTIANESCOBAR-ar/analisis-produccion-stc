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

    <!-- Layout de dos tablas lado a lado -->
    <div class="section-card">
      <h2 class="section-title">📈 Resumen de Producción por Revisor</h2>
      
      <div class="date-filter">
        <label>
          <span>Desde:</span>
          <input v-model="startDate" type="date" />
        </label>
        <label>
          <span>Hasta:</span>
          <input v-model="endDate" type="date" />
        </label>
        <button @click="loadProduccionData" class="btn-primary">
          Actualizar
        </button>
      </div>

      <!-- Contenedor de dos tablas -->
      <div class="tables-layout">
        <!-- Tabla Izquierda: Resumen por Revisor -->
        <div class="table-left">
          <h3 class="table-subtitle">Rollos 1era</h3>
          <div class="table-responsive">
            <table class="production-table">
              <thead>
                <tr>
                  <th>Revisor</th>
                  <th class="col-number">Metros Día</th>
                  <th class="col-number">Calidad %</th>
                  <th class="col-number">Pts 100m²</th>
                  <th class="col-number">Total [un]</th>
                  <th class="col-number">Sin Pts [un]</th>
                  <th class="col-number">Sin Pts [%]</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="revisor in resumenRevisores" 
                  :key="revisor.nombre"
                  @click="selectRevisor(revisor)"
                  :class="{ 'selected-row': selectedRevisor?.nombre === revisor.nombre }"
                  class="clickable-row"
                >
                  <td class="font-semibold">{{ revisor.nombre }}</td>
                  <td class="col-number">{{ formatNumber(revisor.metrosDia) }}</td>
                  <td class="col-number">{{ revisor.calidadPct }}%</td>
                  <td class="col-number">{{ revisor.pts100m2 }}</td>
                  <td class="col-number">{{ revisor.totalRollos }}</td>
                  <td class="col-number">{{ revisor.sinPuntos }}</td>
                  <td class="col-number">{{ revisor.sinPuntosPct }}%</td>
                </tr>
                <!-- Fila Total -->
                <tr class="total-row">
                  <td class="font-bold">Total</td>
                  <td class="col-number font-bold">{{ formatNumber(totales.metrosDia) }}</td>
                  <td class="col-number font-bold">{{ totales.calidadPct }}%</td>
                  <td class="col-number font-bold">{{ totales.pts100m2 }}</td>
                  <td class="col-number font-bold">{{ totales.totalRollos }}</td>
                  <td class="col-number font-bold">{{ totales.sinPuntos }}</td>
                  <td class="col-number font-bold">{{ totales.sinPuntosPct }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tabla Derecha: Detalle del Revisor Seleccionado -->
        <div class="table-right">
          <h3 class="table-subtitle">
            {{ selectedRevisor ? `Detalle - ${selectedRevisor.nombre}` : 'Seleccione un revisor' }}
          </h3>
          <div v-if="selectedRevisor" class="table-responsive">
            <table class="production-table">
              <thead>
                <tr>
                  <th>Nombre Artículo</th>
                  <th>Partidas</th>
                  <th class="col-number">Metros Revisados</th>
                  <th class="col-number">Cal. %</th>
                  <th class="col-number">Pts 100m²</th>
                  <th class="col-number">Total [un]</th>
                  <th class="col-number">Sin Pts [un]</th>
                  <th class="col-number">Sin Pts [%]</th>
                  <th class="col-number">Telar</th>
                  <th class="col-number">Efic. %</th>
                  <th class="col-number">RU 105</th>
                  <th class="col-number">RT 105</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="detalle in detalleRevisor" :key="detalle.id">
                  <td>{{ detalle.articulo }}</td>
                  <td>{{ detalle.partidas }}</td>
                  <td class="col-number">{{ formatNumber(detalle.metrosRevisados) }}</td>
                  <td class="col-number">{{ detalle.calidadPct }}%</td>
                  <td class="col-number">{{ detalle.pts100m2 }}</td>
                  <td class="col-number">{{ detalle.totalRollos }}</td>
                  <td class="col-number">{{ detalle.sinPuntos }}</td>
                  <td class="col-number">{{ detalle.sinPuntosPct }}%</td>
                  <td class="col-number">{{ detalle.telar }}</td>
                  <td class="col-number">{{ detalle.eficienciaPct }}%</td>
                  <td class="col-number">{{ detalle.ru105 }}</td>
                  <td class="col-number">{{ detalle.rt105 }}</td>
                </tr>
                <!-- Fila Total del Detalle -->
                <tr class="total-row" v-if="detalleRevisor.length > 0">
                  <td class="font-bold" colspan="2">Total</td>
                  <td class="col-number font-bold">{{ formatNumber(totalesDetalle.metrosRevisados) }}</td>
                  <td class="col-number font-bold">{{ totalesDetalle.calidadPct }}%</td>
                  <td class="col-number font-bold">{{ totalesDetalle.pts100m2 }}</td>
                  <td class="col-number font-bold">{{ totalesDetalle.totalRollos }}</td>
                  <td class="col-number font-bold">{{ totalesDetalle.sinPuntos }}</td>
                  <td class="col-number font-bold">{{ totalesDetalle.sinPuntosPct }}%</td>
                  <td class="col-number font-bold">{{ totalesDetalle.telar }}</td>
                  <td class="col-number font-bold">{{ totalesDetalle.eficienciaPct }}%</td>
                  <td class="col-number font-bold">{{ totalesDetalle.ru105 }}</td>
                  <td class="col-number font-bold">{{ totalesDetalle.rt105 }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">
            <p>👆 Haz clic en un revisor para ver el detalle de su producción</p>
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
const topMotivos = ref([])

// Datos de producción por revisor
const resumenRevisores = ref([])
const selectedRevisor = ref(null)
const detalleRevisor = ref([])

// Fechas por defecto (últimos 7 días)
const endDate = ref(new Date().toISOString().split('T')[0])
const startDate = ref(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
)

const loading = computed(() => db.loading.value)
const error = computed(() => db.error.value)

// Totales calculados de la tabla resumen
const totales = computed(() => {
  if (resumenRevisores.value.length === 0) {
    return {
      metrosDia: 0,
      calidadPct: 0,
      pts100m2: 0,
      totalRollos: 0,
      sinPuntos: 0,
      sinPuntosPct: 0
    }
  }
  
  const sumMetros = resumenRevisores.value.reduce((acc, r) => acc + r.metrosDia, 0)
  const sumRollos = resumenRevisores.value.reduce((acc, r) => acc + r.totalRollos, 0)
  const sumSinPuntos = resumenRevisores.value.reduce((acc, r) => acc + r.sinPuntos, 0)
  
  // Promedio ponderado de calidad y puntos
  const avgCalidad = resumenRevisores.value.reduce((acc, r) => acc + (r.calidadPct * r.metrosDia), 0) / sumMetros
  const avgPts = resumenRevisores.value.reduce((acc, r) => acc + (r.pts100m2 * r.metrosDia), 0) / sumMetros
  
  return {
    metrosDia: sumMetros,
    calidadPct: avgCalidad.toFixed(1),
    pts100m2: avgPts.toFixed(1),
    totalRollos: sumRollos,
    sinPuntos: sumSinPuntos,
    sinPuntosPct: ((sumSinPuntos / sumRollos) * 100).toFixed(1)
  }
})

// Totales calculados del detalle
const totalesDetalle = computed(() => {
  if (detalleRevisor.value.length === 0) {
    return {
      metrosRevisados: 0,
      calidadPct: 0,
      pts100m2: 0,
      totalRollos: 0,
      sinPuntos: 0,
      sinPuntosPct: 0,
      telar: 0,
      eficienciaPct: 0,
      ru105: 0,
      rt105: 0
    }
  }
  
  const sumMetros = detalleRevisor.value.reduce((acc, d) => acc + d.metrosRevisados, 0)
  const sumRollos = detalleRevisor.value.reduce((acc, d) => acc + d.totalRollos, 0)
  const sumSinPuntos = detalleRevisor.value.reduce((acc, d) => acc + d.sinPuntos, 0)
  const sumTelar = detalleRevisor.value.reduce((acc, d) => acc + d.telar, 0)
  const sumRu = detalleRevisor.value.reduce((acc, d) => acc + d.ru105, 0)
  const sumRt = detalleRevisor.value.reduce((acc, d) => acc + d.rt105, 0)
  
  const avgCalidad = detalleRevisor.value.reduce((acc, d) => acc + (d.calidadPct * d.metrosRevisados), 0) / sumMetros
  const avgPts = detalleRevisor.value.reduce((acc, d) => acc + (d.pts100m2 * d.metrosRevisados), 0) / sumMetros
  const avgEfic = detalleRevisor.value.reduce((acc, d) => acc + (d.eficienciaPct * d.metrosRevisados), 0) / sumMetros
  
  return {
    metrosRevisados: sumMetros,
    calidadPct: avgCalidad.toFixed(1),
    pts100m2: avgPts.toFixed(1),
    totalRollos: sumRollos,
    sinPuntos: sumSinPuntos,
    sinPuntosPct: ((sumSinPuntos / sumRollos) * 100).toFixed(1),
    telar: sumTelar,
    eficienciaPct: avgEfic.toFixed(1),
    ru105: sumRu.toFixed(1),
    rt105: sumRt.toFixed(1)
  }
})

// Cargar datos iniciales
onMounted(async () => {
  await loadSystemStatus()
  await loadProduccionData()
  await loadTopMotivos()
})

async function loadSystemStatus() {
  try {
    systemStatus.value = await db.getStatus()
  } catch (err) {
    console.error('Error cargando estado:', err)
  }
}

async function loadProduccionData() {
  try {
    // TODO: Implementar endpoint en la API para obtener estos datos
    // Por ahora usamos datos de ejemplo basados en la imagen
    resumenRevisores.value = [
      { nombre: 'Facundo', metrosDia: 5871, calidadPct: 96.6, pts100m2: 2.4, totalRollos: 42, sinPuntos: 6, sinPuntosPct: 14.3 },
      { nombre: 'CarlosD', metrosDia: 4983, calidadPct: 99.2, pts100m2: 2.5, totalRollos: 39, sinPuntos: 11, sinPuntosPct: 28.2 },
      { nombre: 'INOCENCIO', metrosDia: 4465, calidadPct: 93.7, pts100m2: 4.3, totalRollos: 31, sinPuntos: 4, sinPuntosPct: 12.9 },
      { nombre: 'Alejandro G', metrosDia: 4286, calidadPct: 100, pts100m2: 2.7, totalRollos: 30, sinPuntos: 9, sinPuntosPct: 30 },
      { nombre: 'Jonathan', metrosDia: 3563, calidadPct: 93, pts100m2: 3, totalRollos: 30, sinPuntos: 10, sinPuntosPct: 33.3 },
      { nombre: 'Fabio', metrosDia: 3021, calidadPct: 98.1, pts100m2: 3.8, totalRollos: 20, sinPuntos: 0, sinPuntosPct: 0 }
    ]
  } catch (err) {
    console.error('Error cargando datos de producción:', err)
  }
}

function selectRevisor(revisor) {
  selectedRevisor.value = revisor
  
  // TODO: Implementar endpoint para obtener detalle del revisor
  // Por ahora usamos datos de ejemplo
  if (revisor.nombre === 'CarlosD') {
    detalleRevisor.value = [
      { 
        id: 1, 
        articulo: 'MACAO', 
        partidas: '0-5399.19',
        metrosRevisados: 1219,
        calidadPct: 100,
        pts100m2: 1.2,
        totalRollos: 9,
        sinPuntos: 6,
        sinPuntosPct: 67,
        telar: 32,
        eficienciaPct: 78.1,
        ru105: 1.1,
        rt105: 1.6
      },
      {
        id: 2,
        articulo: 'CAPRI',
        partidas: '0-5402.20',
        metrosRevisados: 83,
        calidadPct: 100,
        pts100m2: 5.8,
        totalRollos: 1,
        sinPuntos: 0,
        sinPuntosPct: 0,
        telar: 51,
        eficienciaPct: 86.4,
        ru105: 0.9,
        rt105: 2.2
      },
      {
        id: 3,
        articulo: 'ICON IV',
        partidas: '0-5407.03',
        metrosRevisados: 1759,
        calidadPct: 100,
        pts100m2: 3.8,
        totalRollos: 16,
        sinPuntos: 6,
        sinPuntosPct: 38,
        telar: 44,
        eficienciaPct: 66.4,
        ru105: 1.3,
        rt105: 5.3
      },
      {
        id: 4,
        articulo: 'ICON IV',
        partidas: '0-5407.04',
        metrosRevisados: 2012,
        calidadPct: 100,
        pts100m2: 3.6,
        totalRollos: 19,
        sinPuntos: 6,
        sinPuntosPct: 32,
        telar: 12,
        eficienciaPct: 80.1,
        ru105: 2.5,
        rt105: 3.1
      },
      {
        id: 5,
        articulo: 'ICON IV',
        partidas: '0-3407.13',
        metrosRevisados: 1987,
        calidadPct: 100,
        pts100m2: 5.1,
        totalRollos: 19,
        sinPuntos: 2,
        sinPuntosPct: 10,
        telar: 45,
        eficienciaPct: 77,
        ru105: 1.5,
        rt105: 3.7
      }
    ]
  } else {
    // Para otros revisores mostrar mensaje o datos vacíos
    detalleRevisor.value = []
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

/* Layout de dos tablas */
.tables-layout {
  display: grid;
  grid-template-columns: 0.9fr 1.6fr;
  gap: 20px;
  margin-bottom: 24px;
}

.table-left,
.table-right {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-subtitle {
  padding: 16px 20px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  background: #f8f9fa;
  margin: 0;
  border-bottom: 1px solid #dee2e6;
}

.table-responsive {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 500px;
}

.production-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.production-table thead {
  background: #f8f9fa;
  position: sticky;
  top: 0;
  z-index: 1;
}

.production-table th {
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #dee2e6;
  font-size: 12px;
  white-space: nowrap;
}

.production-table th.col-number {
  text-align: right;
  padding-right: 12px;
}

.production-table td {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
  color: #444;
}

.production-table td.col-number {
  text-align: right;
  font-family: 'Consolas', monospace;
  padding-right: 12px;
}

.clickable-row {
  cursor: pointer;
  transition: background 0.15s;
}

.clickable-row:hover {
  background: #f0f7ff;
}

.selected-row {
  background: #e3f2fd !important;
  font-weight: 600;
}

.selected-row:hover {
  background: #e3f2fd !important;
}

.total-row {
  background: #f8f9fa;
  font-weight: 700;
  border-top: 2px solid #dee2e6;
}

.total-row td {
  padding: 10px 8px;
  color: #1a1a1a;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
  font-size: 14px;
  font-style: italic;
}

@media (max-width: 1200px) {
  .tables-layout {
    grid-template-columns: 1fr;
  }
}
</style>
