<template>
  <div class="w-full h-screen overflow-hidden flex flex-col">
    <div class="flex flex-col gap-3 p-3 flex-shrink-0">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-0.5">
          <h1 class="text-xl font-bold text-slate-800">Calidad de Fibra - Análisis HVI</h1>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center gap-2"
            :disabled="loading || data.length === 0"
            @click="exportToExcel"
          >
            <span>📥</span>
            <span>Exportar</span>
          </button>
          <button
            class="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
            :disabled="loading"
            @click="loadData"
          >
            <span v-if="loading" class="animate-spin">⟳</span>
            <span v-else>↻</span>
            <span>{{ loading ? 'Cargando...' : 'Actualizar' }}</span>
          </button>
        </div>
      </div>

      <!-- Tabla con scroll horizontal y vertical -->
      <div class="quality-card shadow border border-slate-200 rounded overflow-hidden flex flex-col relative" style="height: calc(100vh - 140px);">
        <!-- Overlay de carga -->
        <div v-if="loading" class="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50 rounded">
          <div class="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-xl shadow-xl border border-blue-100">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-50 border-t-blue-600"></div>
            <span class="text-slate-600 font-medium text-sm">Cargando datos HVI...</span>
          </div>
        </div>

        <!-- Tabla scrollable -->
        <div class="overflow-x-auto overflow-y-auto flex-1">
          <table class="w-full border-collapse text-xs">
            <thead class="sticky top-0 bg-slate-50 z-30">
              <tr class="border-b-2 border-slate-300">
                <th class="sticky left-0 bg-slate-50 z-40 px-2 py-2 text-left font-bold text-slate-700 border-r border-slate-200 w-[50px] max-w-[50px]" style="white-space: normal; word-break: break-word;">Mezcla</th>
                <th class="sticky left-[50px] bg-slate-50 z-40 px-2 py-2 text-left font-bold text-slate-700 border-r border-slate-200 w-[50px] max-w-[50px]" style="white-space: normal; word-break: break-word;">Lote</th>
                <th class="sticky left-[100px] bg-slate-50 z-40 px-1 py-2 text-left font-bold text-slate-700 border-r border-slate-200 min-w-[105px]">Fecha Ingreso</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-blue-50 min-w-[60px]" title="Índice de Color">SCI</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-blue-50 min-w-[60px]" title="Humedad">MST</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-blue-50 min-w-[60px]" title="Micronaire">MIC</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-blue-50 min-w-[60px]" title="Madurez">MAT</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-green-50 min-w-[60px]" title="Longitud media">UHML</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-green-50 min-w-[60px]" title="Uniformidad">UI</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-green-50 min-w-[60px]" title="Fibras cortas">SF</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-yellow-50 min-w-[60px]" title="Resistencia">STR</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-yellow-50 min-w-[60px]" title="Elongación">ELG</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-yellow-50 min-w-[60px]" title="Reflectancia">RD</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-yellow-50 min-w-[60px]" title="Amarillez">+b</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-purple-50 min-w-[70px]" title="TrCNT">TrCNT</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-purple-50 min-w-[60px]" title="TrAR">TrAR</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-purple-50 min-w-[60px]" title="TRID">TRID</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-orange-50 min-w-[60px]" title="% Color BCO">BCO %</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-orange-50 min-w-[60px]" title="% Color GRI">GRI %</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-orange-50 min-w-[60px]" title="% Color LG">LG %</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-orange-50 min-w-[60px]" title="% Color AMA">AMA %</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-orange-50 min-w-[60px]" title="% Color LA">LA %</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-slate-100 min-w-[80px]">Fardos</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 border-r border-slate-200 bg-slate-100 min-w-[100px]">Peso (kg)</th>
                <th class="px-2 py-2 text-center font-bold text-slate-700 bg-slate-100 min-w-[60px]">SEQ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="data.length === 0 && !loading">
                <td colspan="26" class="text-center py-8 text-slate-500">
                  No hay datos disponibles
                </td>
              </tr>
              <tr 
                v-for="(row, idx) in data" 
                :key="`${row.MISTURA}-${row.LOTE_FIAC}`"
                class="border-b border-slate-200 hover:bg-blue-50/50 transition-colors"
                :class="{ 'bg-slate-50/30': idx % 2 === 0 }"
              >
                <td class="sticky left-0 bg-white px-2 py-2 font-semibold text-slate-800 border-r border-slate-200 z-30 w-[50px] max-w-[50px]">{{ row.MISTURA }}</td>
                <td class="sticky left-[50px] bg-white px-2 py-2 text-slate-700 border-r border-slate-200 z-30 w-[50px] max-w-[50px]">{{ row.LOTE_FIAC || '-' }}</td>
                <td class="sticky left-[100px] bg-white px-1 py-2 text-slate-600 border-r border-slate-200 z-30">{{ formatDateTime(row.fecha_ingreso, row.hora_ingreso) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.sci_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.mst_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.mic_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.mat_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.uhml_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.ui_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.sf_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.str_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.elg_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.rd_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.plus_b_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.trcnt_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.trar_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatNumber(row.trid_avg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatPercent(row.color_bco_pct) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatPercent(row.color_gri_pct) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatPercent(row.color_lg_pct) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatPercent(row.color_ama_pct) }}</td>
                <td class="px-2 py-2 text-center text-slate-700 border-r border-slate-200">{{ formatPercent(row.color_la_pct) }}</td>
                <td class="px-2 py-2 text-center font-semibold text-slate-800 border-r border-slate-200">{{ row.seq_count ? Math.round(row.fardos_total / row.seq_count) : row.fardos_total }}</td>
                <td class="px-2 py-2 text-center font-semibold text-slate-800 border-r border-slate-200">{{ formatNumber(row.peso_total_kg) }}</td>
                <td class="px-2 py-2 text-center text-slate-700">{{ row.seq_count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'

const API_URL = 'http://localhost:3002/api'

const loading = ref(false)
const data = ref([])

const stats = computed(() => {
  return {
    totalMezclas: data.value.length,
    totalFardos: data.value.reduce((sum, row) => sum + (row.fardos_total || 0), 0),
    pesoTotal: data.value.reduce((sum, row) => sum + (row.peso_total_kg || 0), 0),
    lotesUnicos: new Set(data.value.map(row => row.LOTE_FIAC).filter(Boolean)).size
  }
})

async function loadData() {
  loading.value = true
  try {
    const res = await fetch(`${API_URL}/calidad-fibra/resumen`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data.value = await res.json()
  } catch (err) {
    console.error('Error cargando calidad fibra:', err)
    data.value = []
  } finally {
    loading.value = false
  }
}

function formatNumber(val) {
  if (val === null || val === undefined) return '-'
  return Number(val).toFixed(2)
}

function formatPercent(val) {
  if (val === null || val === undefined || val === 0) return '-'
  return Number(val).toFixed(1)
}

function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return '-'
  
  let formattedDate = dateStr
  
  // Si viene en formato YYYY-MM-DD, convertir a DD/MM/YY
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-')
    formattedDate = `${day}/${month}/${year.slice(-2)}`
  } else if (dateStr.includes('/')) {
    // Si ya viene en formato DD/MM/YYYY, convertir año a YY
    const parts = dateStr.split('/')
    if (parts.length === 3 && parts[2].length === 4) {
      formattedDate = `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`
    }
  }
  
  // Agregar hora si existe
  if (timeStr && timeStr.trim() !== '') {
    return `${formattedDate} ${timeStr}`
  }
  
  return formattedDate
}

function exportToExcel() {
  if (data.value.length === 0) return
  
  // Preparar datos para Excel
  const excelData = data.value.map(row => ({
    'Mezcla': row.MISTURA,
    'Lote': row.LOTE_FIAC || '-',
    'Fecha Ingreso': formatDateTime(row.fecha_ingreso, row.hora_ingreso),
    'SCI': row.sci_avg,
    'MST': row.mst_avg,
    'MIC': row.mic_avg,
    'MAT': row.mat_avg,
    'UHML': row.uhml_avg,
    'UI': row.ui_avg,
    'SF': row.sf_avg,
    'STR': row.str_avg,
    'ELG': row.elg_avg,
    'RD': row.rd_avg,
    '+b': row.plus_b_avg,
    'TrCNT': row.trcnt_avg,
    'TrAR': row.trar_avg,
    'TRID': row.trid_avg,
    'BCO %': row.color_bco_pct || '-',
    'GRI %': row.color_gri_pct || '-',
    'LG %': row.color_lg_pct || '-',
    'AMA %': row.color_ama_pct || '-',
    'LA %': row.color_la_pct || '-',
    'Fardos': row.seq_count ? Math.round(row.fardos_total / row.seq_count) : row.fardos_total,
    'Peso (kg)': row.peso_total_kg,
    'SEQ': row.seq_count
  }))
  
  // Crear workbook y worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(excelData)
  
  // Ajustar anchos de columna
  const colWidths = [
    { wch: 8 },  // Mezcla
    { wch: 8 },  // Lote
    { wch: 16 }, // Fecha Ingreso
    { wch: 8 },  // SCI
    { wch: 8 },  // MST
    { wch: 8 },  // MIC
    { wch: 8 },  // MAT
    { wch: 8 },  // UHML
    { wch: 8 },  // UI
    { wch: 8 },  // SF
    { wch: 8 },  // STR
    { wch: 8 },  // ELG
    { wch: 8 },  // RD
    { wch: 8 },  // +b
    { wch: 8 },  // TrCNT
    { wch: 8 },  // TrAR
    { wch: 8 },  // TRID
    { wch: 8 },  // BCO %
    { wch: 8 },  // GRI %
    { wch: 8 },  // LG %
    { wch: 8 },  // AMA %
    { wch: 8 },  // LA %
    { wch: 10 }, // Fardos
    { wch: 12 }, // Peso (kg)
    { wch: 6 }   // SEQ
  ]
  ws['!cols'] = colWidths
  
  XLSX.utils.book_append_sheet(wb, ws, 'Calidad Fibra')
  
  // Generar nombre de archivo con fecha
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const filename = `Calidad_Fibra_HVI_${dateStr}.xlsx`
  
  // Descargar
  XLSX.writeFile(wb, filename)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.quality-card {
  background: white;
}

table {
  font-variant-numeric: tabular-nums;
}

/* Sombra solo para columna Fecha Ingreso (la última sticky) */
.sticky.left-\[100px\]::after {
  content: '';
  position: absolute;
  top: 0;
  right: -8px;
  bottom: 0;
  width: 8px;
  background: linear-gradient(to right, rgba(0,0,0,0.05), transparent);
  pointer-events: none;
}

/* Hover mejorado */
tbody tr:hover .sticky {
  background-color: rgb(239 246 255 / 0.5) !important;
}
</style>
