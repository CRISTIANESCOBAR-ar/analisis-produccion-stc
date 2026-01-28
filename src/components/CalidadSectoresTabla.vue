<template>
  <div class="w-full h-full px-2 md:px-4 py-3">
    <div class="flex flex-col gap-2 h-full">
      <!-- Header con fecha y botón -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="space-y-0.5">
          <h1 class="text-xl font-bold text-slate-800">Metros revisados por sector</h1>
          <p class="text-xs text-slate-500">Datos en tiempo real desde la base de datos</p>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs font-semibold uppercase text-slate-500">Fecha</label>
          <div class="custom-datepicker" ref="datepickerRef">
            <input 
              type="text" 
              :value="displayDate" 
              class="datepicker-input"
              placeholder="Selecciona una fecha"
              @click="toggleCalendar"
              @keydown.left.prevent="cambiarFecha(-1)"
              @keydown.right.prevent="cambiarFecha(1)"
              @blur="handleBlur"
              readonly
            />
            <span class="calendar-icon" @click="toggleCalendar">📅</span>
            <div v-if="showCalendar" class="calendar-dropdown">
              <div class="calendar-header">
                <button class="calendar-nav-btn" @click.stop="changeMonth(-1)">&lt;</button>
                <div class="calendar-selects">
                  <select 
                    :value="calendarMonth" 
                    @change="updateMonth" 
                    @click.stop
                    class="calendar-select"
                  >
                    <option v-for="(month, index) in monthNames" :key="index" :value="index">
                      {{ month }}
                    </option>
                  </select>
                  <select 
                    :value="calendarYear" 
                    @change="updateYear" 
                    @click.stop
                    class="calendar-select"
                  >
                    <option v-for="year in years" :key="year" :value="year">
                      {{ year }}
                    </option>
                  </select>
                </div>
                <button class="calendar-nav-btn" @click.stop="changeMonth(1)">&gt;</button>
              </div>
              <div class="calendar-weekdays">
                <span v-for="day in ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']" :key="day">{{ day }}</span>
              </div>
              <div class="calendar-days">
                <button 
                  v-for="day in calendarDays" 
                  :key="day.key"
                  :class="['calendar-day', {
                    'other-month': day.otherMonth,
                    'selected': day.selected,
                    'today': day.today
                  }]"
                  @click.stop="selectDate(day)"
                  :disabled="day.otherMonth"
                >
                  {{ day.day }}
                </button>
              </div>
            </div>
          </div>
          <div class="flex gap-1.5">
            <button 
              ref="prevMonthBtnRef"
              class="inline-flex items-center justify-center px-2.5 py-1 border border-slate-300 bg-gradient-to-b from-slate-50 to-slate-100 text-slate-700 rounded-md text-sm font-bold hover:from-slate-100 hover:to-slate-200 transition-all duration-150 shadow-sm" 
              @click="saltarMes(-1)" 
              @mousedown.prevent
              tabindex="-1"
              :disabled="loading"
            >&lt;&lt;</button>
            <button 
              class="inline-flex items-center justify-center px-2 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm" 
              @click="cambiarFecha(-1)" 
              @mousedown.prevent
              tabindex="-1"
              :disabled="loading"
            >&lt;</button>
            <button 
              class="inline-flex items-center justify-center px-2 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm" 
              @click="cambiarFecha(1)" 
              @mousedown.prevent
              tabindex="-1"
              :disabled="loading"
            >&gt;</button>
            <button 
              ref="nextMonthBtnRef"
              class="inline-flex items-center justify-center px-2.5 py-1 border border-slate-300 bg-gradient-to-b from-slate-50 to-slate-100 text-slate-700 rounded-md text-sm font-bold hover:from-slate-100 hover:to-slate-200 transition-all duration-150 shadow-sm" 
              @click="saltarMes(1)" 
              @mousedown.prevent
              tabindex="-1"
              :disabled="loading"
            >&gt;&gt;</button>
          </div>
          <button
            class="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
            :disabled="loading"
            @click="loadData"
          >
            {{ loading ? '⟳' : '↻' }}
          </button>
          <button
            class="px-2 py-1 bg-slate-600 text-white rounded text-xs font-semibold hover:bg-slate-700 transition-colors"
            @click="showDebugModal = true"
          >
            Ver celda
          </button>
        </div>
      </div>

      <!-- Layout con Tabla y Gráfico -->
      <div class="flex gap-3 flex-1 min-h-0">
        <!-- Tabla fija estilo Excel -->
        <div class="quality-card flex-1 min-h-0 shadow border border-slate-200 rounded overflow-hidden flex flex-col relative" style="max-width: 500px;">
        <!-- Overlay de carga -->
        <div v-if="loading" class="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-50 rounded transition-all duration-300">
          <div class="flex flex-col items-center gap-4 bg-white/90 px-10 py-8 rounded-2xl shadow-2xl border border-blue-100">
            <div class="relative">
              <div class="animate-spin rounded-full h-16 w-16 border-4 border-blue-50 border-t-blue-600"></div>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="h-8 w-8 bg-blue-600 rounded-full animate-pulse opacity-10"></div>
              </div>
            </div>
            <div class="flex flex-col items-center gap-1">
              <span class="text-slate-500 font-medium tracking-wider uppercase text-[10px]">Cargando datos de</span>
              <span class="text-xl text-slate-800 font-bold">{{ displayDate }}</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center justify-between bg-sky-900 text-white px-2 py-1.5 text-xs font-semibold">
          <span>{{ formattedDate }}</span>
          <span>Replica de hoja Excel (borrador)</span>
        </div>
        <div class="overflow-auto flex-1 min-h-0 excel-wrapper">
          <div class="excel-grid">
            <div
              v-for="cell in excelCells"
              :key="cell.id"
              class="excel-cell"
              :class="[`cell-${cell.id}`, cell.colorClass, { 'wrap-text': cell.wrapText }]"
              :style="getCellStyle(cell, gridPlacement(cell))"
            >
              {{ cell.text }}
            </div>
          </div>
        </div>
        <div v-if="fetchError" class="px-2 py-1 text-xs text-amber-700 bg-amber-50 border-t border-amber-200">
          ⚠️ {{ fetchError }}
        </div>
        </div>

        <!-- Gráfico de Eficiencias y Roturas -->
        <div ref="chartContainerRef" class="flex-1 min-h-0 shadow border border-slate-200 rounded bg-white flex flex-col">
          <div class="flex items-center justify-between bg-gray-100 text-slate-800 px-2 py-2.5 text-xs font-semibold border-b border-slate-200 chart-header">
            <span>Eficiencias y Roturas de Trama 105 - Tejeduría</span>
            <div class="flex items-center gap-2">
              <span>{{ chartMonthYear }}</span>
              <span>-</span>
              <span>Trama:</span>
              <select 
                v-model="selectedTrama" 
                class="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 font-normal hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option v-for="trama in availableTramas" :key="trama" :value="trama">
                  {{ trama }}
                </option>
              </select>
              <button 
                ref="copyBtnRef"
                @click="copyChartToClipboard"
                class="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors duration-150"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
          <div class="flex-1 p-3 overflow-hidden">
            <canvas ref="chartCanvas"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de depuración de bordes -->
  <div
    v-if="showDebugModal"
    class="fixed inset-0 z-[999] flex items-center justify-center bg-black/40"
    @click.self="showDebugModal = false"
  >
    <div class="bg-white rounded-lg shadow-xl border border-slate-200 w-[420px]">
      <div class="flex items-center justify-between px-4 py-2 border-b border-slate-200">
        <span class="text-sm font-semibold text-slate-700">Depuración de bordes (INDIGO / TECELAGEM)</span>
        <button class="text-slate-500 hover:text-slate-700" @click="showDebugModal = false">✕</button>
      </div>
      <div class="p-4">
        <div class="excel-grid-debug">
          <div
            v-for="cell in debugCells"
            :key="`debug-${cell.id}`"
            class="excel-cell"
            :class="[`cell-${cell.id}`, cell.colorClass]"
            :style="getCellStyle(cell, debugPlacement(cell))"
          >
            {{ cell.text }}
          </div>
        </div>
        <p class="mt-3 text-xs text-slate-500">Este recorte usa las mismas celdas y estilos de la tabla (B17/C17/G17/J17).</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import Swal from 'sweetalert2'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'

// Registrar componentes de Chart.js
Chart.register(...registerables, ChartDataLabels)

const API_URL = 'http://localhost:3002/api'

// Setear fecha a ayer por defecto
const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)
const defaultDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

const selectedDate = ref(defaultDate)
const rows = ref([])
const loading = ref(false)
const fetchError = ref('')
const isLoadingData = ref(false)
const showDebugModal = ref(false)

// Estado para el gráfico
const chartCanvas = ref(null)
const chartContainerRef = ref(null)
const chartInstance = ref(null)
const chartData = ref([])
const selectedTrama = ref('7/1 OE') // Trama por defecto
const availableTramas = ref(['7/1 OE']) // Tramas disponibles para el período

// Refs para tooltips
const prevMonthBtnRef = ref(null)
const nextMonthBtnRef = ref(null)
const copyBtnRef = ref(null)

// Datepicker state
const showCalendar = ref(false)
const calendarMonth = ref(new Date().getMonth())
const calendarYear = ref(new Date().getFullYear())
const datepickerRef = ref(null)

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  const startYear = 2020
  const yearList = []
  for (let y = startYear; y <= currentYear + 1; y++) {
    yearList.push(y)
  }
  return yearList
})

const displayDate = computed(() => {
  if (!selectedDate.value) return ''
  try {
    const [year, month, day] = selectedDate.value.split('-').map(Number)
    if (!year || !month || !day) return ''
    const fecha = new Date(year, month - 1, day)
    const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
    const dia = dias[fecha.getDay()]
    const diaNum = fecha.getDate().toString().padStart(2, '0')
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')
    const anio = fecha.getFullYear()
    return `${dia} ${diaNum}/${mes}/${anio}`
  } catch (e) {
    return ''
  }
})

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(calendarYear.value, calendarMonth.value, 1)
  const lastDay = new Date(calendarYear.value, calendarMonth.value + 1, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selectedDate_val = selectedDate.value ? new Date(selectedDate.value) : null
  
  // Add days from previous month
  for (let i = 0; i < firstDay.getDay(); i++) {
    const date = new Date(calendarYear.value, calendarMonth.value, -firstDay.getDay() + i + 1)
    days.push({
      day: date.getDate(),
      otherMonth: true,
      key: `prev-${i}`
    })
  }
  
  // Add days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const currentDate = new Date(calendarYear.value, calendarMonth.value, i)
    days.push({
      day: i,
      otherMonth: false,
      selected: selectedDate_val && selectedDate_val.getDate() === i && 
                selectedDate_val.getMonth() === calendarMonth.value && 
                selectedDate_val.getFullYear() === calendarYear.value,
      today: today.getDate() === i && 
             today.getMonth() === calendarMonth.value && 
             today.getFullYear() === calendarYear.value,
      key: `current-${i}`,
      date: currentDate
    })
  }
  
  // Add days from next month
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      otherMonth: true,
      key: `next-${i}`
    })
  }
  
  return days
})

function toggleCalendar() {
  showCalendar.value = !showCalendar.value
  if (showCalendar.value && selectedDate.value) {
    const [year, month] = selectedDate.value.split('-').map(Number)
    calendarMonth.value = month - 1
    calendarYear.value = year
  }
}

function changeMonth(offset) {
  calendarMonth.value += offset
  if (calendarMonth.value > 11) {
    calendarMonth.value = 0
    calendarYear.value++
  } else if (calendarMonth.value < 0) {
    calendarMonth.value = 11
    calendarYear.value--
  }
}

function selectDate(day) {
  if (day.otherMonth) return
  
  const y = calendarYear.value
  const m = (calendarMonth.value + 1).toString().padStart(2, '0')
  const d = day.day.toString().padStart(2, '0')
  selectedDate.value = `${y}-${m}-${d}`
  
  showCalendar.value = false
  loadData()
}

function updateMonth(event) {
  calendarMonth.value = parseInt(event.target.value)
}

function updateYear(event) {
  calendarYear.value = parseInt(event.target.value)
}

function cambiarFecha(dias) {
  if (!selectedDate.value) return
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  fecha.setDate(fecha.getDate() + dias)
  const newY = fecha.getFullYear()
  const newM = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const newD = fecha.getDate().toString().padStart(2, '0')
  selectedDate.value = `${newY}-${newM}-${newD}`
  loadData()
}

function saltarMes(direccion) {
  if (!selectedDate.value) return
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  
  // Calcular el mes de destino
  let targetMonth = m + direccion
  let targetYear = y
  
  // Ajustar año si es necesario
  if (targetMonth > 12) {
    targetMonth = 1
    targetYear++
  } else if (targetMonth < 1) {
    targetMonth = 12
    targetYear--
  }
  
  // Obtener el último día del mes de destino
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth, 0).getDate()
  
  const newY = targetYear
  const newM = targetMonth.toString().padStart(2, '0')
  const newD = lastDayOfTargetMonth.toString().padStart(2, '0')
  
  selectedDate.value = `${newY}-${newM}-${newD}`
  console.log(`🔄 Saltando al mes ${direccion > 0 ? 'siguiente' : 'anterior'}: ${selectedDate.value}`)
  loadData()
}

function handleBlur(event) {
  // Dar tiempo suficiente para que el clic se registre antes de cerrar
  setTimeout(() => {
    if (datepickerRef.value && !datepickerRef.value.contains(document.activeElement)) {
      showCalendar.value = false
    }
  }, 250)
}

// Cerrar calendario al hacer clic fuera
function handleClickOutside(event) {
  if (datepickerRef.value && !datepickerRef.value.contains(event.target)) {
    showCalendar.value = false
  }
}

const metaTargets = ref({ day: 16667, month: 49996 })
const pts100m2 = ref({ day: 0, month: 0 })
const indigoData = ref({ 
  day: { metros: 0, rot103: 0, meta: 0 }, 
  month: { metros: 0, rot103: 0, metaAcumulada: 0 } 
})
// Metas para INDIGO (valores por defecto para rot103 y estopaAzul)
const indigoMetas = ref({ rot103: 1.0, estopaAzul: 1.8 })
// Datos de Estopa Azul
const estopaAzulData = ref({
  day: { porcentaje: 0 },
  month: { porcentaje: 0 }
})
// Datos de TECELAGEM
const tecelagemData = ref({
  day: { metros: 0, eficiencia: 0, rotTra105: 0, rotUrd105: 0, estopaAzulPct: 0, meta: 0, metaEfi: 0, metaRt105: 0, metaRu105: 0, metaEstopaAzul: 0 },
  month: { metros: 0, eficiencia: 0, rotTra105: 0, rotUrd105: 0, estopaAzulPct: 0, metaAcumulada: 0, metaEfi: 0, metaRt105: 0, metaRu105: 0, metaEstopaAzul: 0 }
})

// Datos de ACABAMENTO (Integrada - MAQUINA 165001)
const acabamentoData = ref({
  day: { metros: 0, encUrdPct: 0, meta: 0, metaEncUrd: -1.5 },
  month: { metros: 0, encUrdPct: 0, metaAcumulada: 0, metaEncUrd: -1.5 }
})

// Watch para recargar el gráfico cuando cambie la trama seleccionada (solo si no se está cargando)
watch(selectedTrama, (newTrama, oldTrama) => {
  if (!isLoadingData.value) {
    console.log(`🔄 Cambio manual de trama detectado: ${oldTrama} → ${newTrama}`)
    loadChartData()
  }
})

onMounted(() => {
  loadData()
  document.addEventListener('mousedown', handleClickOutside)
  
  // Inicializar tooltips con Tippy
  nextTick(() => {
    if (prevMonthBtnRef.value) {
      tippy(prevMonthBtnRef.value, {
        content: 'Mes anterior (último día)',
        placement: 'bottom',
        theme: 'light-border',
        arrow: true
      })
    }
    if (nextMonthBtnRef.value) {
      tippy(nextMonthBtnRef.value, {
        content: 'Mes siguiente (último día)',
        placement: 'bottom',
        theme: 'light-border',
        arrow: true
      })
    }
    if (copyBtnRef.value) {
      tippy(copyBtnRef.value, {
        content: 'Copiar gráfico al portapapeles',
        placement: 'bottom',
        theme: 'light-border',
        arrow: true
      })
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  if (chartInstance.value) {
    chartInstance.value.destroy()
  }
})

// Definición inicial de la cuadrícula fija (filas 5-15 de la hoja Excel)
// rowIndex 1 corresponde a la fila 5 de Excel; colIndex 1 corresponde a la columna B.
const excelCells = computed(() => {
  const fecha = formattedDate.value
  
  // Obtener datos por sector
  const getSector = (nombre) => enrichedRows.value.find(r => r.sector === nombre) || { metrosDia: 0, metrosMes: 0, percDia: 0, percMes: 0, metaPct: 0 }
  
  const sDefecto = getSector('S/ Def.')
  const fiacao = getSector('FIACAO')
  const indigo = getSector('INDIGO')
  const tecelagem = getSector('TECELAGEM')
  const acabamento = getSector('ACABMTO')
  const geral = getSector('GERAL')
  
  // Calcular totales
  const totalDia = totals.value.day
  const totalMes = totals.value.month
  
  // Formatear números
  const fmt = (num) => formatNumber(num, 0)
  const fmtPct = (num) => formatPercent(num)
  const fmtPct1 = (num) => formatPercent(num)  // 1 decimal
  const fmtPct2 = (num) => formatPercent2(num)
  
  return [
  // Fila 5 (rowIndex 1)
  { id: 'B5', rowIndex: 1, colIndex: 1, rowSpan: 1, colSpan: 3, text: fecha },
  { id: 'E5', rowIndex: 1, colIndex: 4, rowSpan: 1, colSpan: 7, text: 'Metros [m]' },
  { id: 'L5', rowIndex: 1, colIndex: 11, rowSpan: 1, colSpan: 6, text: 'Porcentaje [%]' },

  // Fila 6 (rowIndex 2)
  { id: 'B6', rowIndex: 2, colIndex: 1, rowSpan: 1, colSpan: 3, text: 'Sector' },
  { id: 'E6', rowIndex: 2, colIndex: 4, rowSpan: 1, colSpan: 3, text: 'Dia' },
  { id: 'H6', rowIndex: 2, colIndex: 7, rowSpan: 1, colSpan: 4, text: 'Acum.' },
  { id: 'L6', rowIndex: 2, colIndex: 11, rowSpan: 1, colSpan: 2, text: 'Dia' },
  { id: 'N6', rowIndex: 2, colIndex: 13, rowSpan: 1, colSpan: 2, text: 'Mes' },
  { id: 'P6', rowIndex: 2, colIndex: 15, rowSpan: 1, colSpan: 2, text: 'Meta' },

  // Fila 7 (rowIndex 3) – S/ Def.
  { id: 'B7', rowIndex: 3, colIndex: 1, rowSpan: 1, colSpan: 3, text: 'S/ Def.' },
  { id: 'E7', rowIndex: 3, colIndex: 4, rowSpan: 1, colSpan: 3, text: fmt(sDefecto.metrosDia) },
  { id: 'H7', rowIndex: 3, colIndex: 7, rowSpan: 1, colSpan: 4, text: fmt(sDefecto.metrosMes) },
  { id: 'L7', rowIndex: 3, colIndex: 11, rowSpan: 1, colSpan: 2, text: fmtPct(sDefecto.percDia) },
  { id: 'N7', rowIndex: 3, colIndex: 13, rowSpan: 1, colSpan: 2, text: fmtPct(sDefecto.percMes) },
  { id: 'P7', rowIndex: 3, colIndex: 15, rowSpan: 1, colSpan: 2, text: fmtPct(sDefecto.metaPct) },

  // Fila 8 (rowIndex 4) - FIACAO
  { id: 'B8', rowIndex: 4, colIndex: 1, colSpan: 3, rowSpan: 1, text: 'FIACAO' },
  { id: 'E8', rowIndex: 4, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmt(fiacao.metrosDia) },
  { id: 'H8', rowIndex: 4, colIndex: 7, colSpan: 4, rowSpan: 1, text: fmt(fiacao.metrosMes) },
  { id: 'L8', rowIndex: 4, colIndex: 11, colSpan: 2, rowSpan: 1, text: fmtPct2(fiacao.percDia) },
  { id: 'N8', rowIndex: 4, colIndex: 13, colSpan: 2, rowSpan: 1, text: fmtPct2(fiacao.percMes) },
  { id: 'P8', rowIndex: 4, colIndex: 15, rowSpan: 1, colSpan: 2, text: fmtPct2(fiacao.metaPct) },

  // Fila 9 (rowIndex 5) - INDIGO
  { id: 'B9', rowIndex: 5, colIndex: 1, colSpan: 3, rowSpan: 1, text: 'INDIGO' },
  { id: 'E9', rowIndex: 5, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmt(indigo.metrosDia) },
  { id: 'H9', rowIndex: 5, colIndex: 7, colSpan: 4, rowSpan: 1, text: fmt(indigo.metrosMes) },
  { id: 'L9', rowIndex: 5, colIndex: 11, colSpan: 2, rowSpan: 1, text: fmtPct(indigo.percDia) },
  { id: 'N9', rowIndex: 5, colIndex: 13, colSpan: 2, rowSpan: 1, text: fmtPct(indigo.percMes) },
  { id: 'P9', rowIndex: 5, colIndex: 15, rowSpan: 1, colSpan: 2, text: fmtPct(indigo.metaPct) },

  // Fila 10 (rowIndex 6) - TECELAGEM
  { id: 'B10', rowIndex: 6, colIndex: 1, colSpan: 3, rowSpan: 1, text: 'TECELAGEM' },
  { id: 'E10', rowIndex: 6, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmt(tecelagem.metrosDia) },
  { id: 'H10', rowIndex: 6, colIndex: 7, colSpan: 4, rowSpan: 1, text: fmt(tecelagem.metrosMes) },
  { id: 'L10', rowIndex: 6, colIndex: 11, colSpan: 2, rowSpan: 1, text: fmtPct(tecelagem.percDia) },
  { id: 'N10', rowIndex: 6, colIndex: 13, colSpan: 2, rowSpan: 1, text: fmtPct(tecelagem.percMes) },
  { id: 'P10', rowIndex: 6, colIndex: 15, rowSpan: 1, colSpan: 2, text: fmtPct(tecelagem.metaPct) },

  // Fila 11 (rowIndex 7) - ACABMTO
  { id: 'B11', rowIndex: 7, colIndex: 1, colSpan: 3, rowSpan: 1, text: 'ACABMTO' },
  { id: 'E11', rowIndex: 7, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmt(acabamento.metrosDia) },
  { id: 'H11', rowIndex: 7, colIndex: 7, colSpan: 4, rowSpan: 1, text: fmt(acabamento.metrosMes) },
  { id: 'L11', rowIndex: 7, colIndex: 11, colSpan: 2, rowSpan: 1, text: fmtPct(acabamento.percDia) },
  { id: 'N11', rowIndex: 7, colIndex: 13, colSpan: 2, rowSpan: 1, text: fmtPct(acabamento.percMes) },
  { id: 'P11', rowIndex: 7, colIndex: 15, rowSpan: 1, colSpan: 2, text: fmtPct(acabamento.metaPct) },

  // Fila 12 (rowIndex 8) - GERAL
  { id: 'B12', rowIndex: 8, colIndex: 1, colSpan: 3, rowSpan: 1, text: 'GERAL' },
  { id: 'E12', rowIndex: 8, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmt(geral.metrosDia) },
  { id: 'H12', rowIndex: 8, colIndex: 7, colSpan: 4, rowSpan: 1, text: fmt(geral.metrosMes) },
  { id: 'L12', rowIndex: 8, colIndex: 11, colSpan: 2, rowSpan: 1, text: fmtPct(geral.percDia) },
  { id: 'N12', rowIndex: 8, colIndex: 13, colSpan: 2, rowSpan: 1, text: fmtPct(geral.percMes) },
  { id: 'P12', rowIndex: 8, colIndex: 15, rowSpan: 1, colSpan: 2, text: fmtPct(geral.metaPct) },

  // Fila 13 (rowIndex 9) – Revisado
  { id: 'B13', rowIndex: 9, colIndex: 1, colSpan: 3, rowSpan: 1, text: 'Revisado' },
  { 
    id: 'E13', 
    rowIndex: 9, 
    colIndex: 4, 
    colSpan: 3, 
    rowSpan: 1, 
    text: fmt(totalDia),
    color: totalDia >= metaTargets.value.day ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'H13', 
    rowIndex: 9, 
    colIndex: 7, 
    colSpan: 4, 
    rowSpan: 1, 
    text: fmt(totalMes),
    color: totalMes >= metaTargets.value.month ? '#3C7D22' : '#FF0000'
  },
  { id: 'L13', rowIndex: 9, colIndex: 11, colSpan: 2, rowSpan: 1, text: '100' },
  { id: 'N13', rowIndex: 9, colIndex: 13, colSpan: 2, rowSpan: 1, text: '100' },
  { id: 'P13', rowIndex: 9, colIndex: 15, rowSpan: 1, colSpan: 2, text: '100' },

  // Fila 14 (rowIndex 10) – Meta
  { id: 'B14', rowIndex: 10, colIndex: 1, colSpan: 3, rowSpan: 1, text: 'Meta' },
  { id: 'E14', rowIndex: 10, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmt(metaTargets.value.day) },
  { id: 'H14', rowIndex: 10, colIndex: 7, colSpan: 4, rowSpan: 1, text: fmt(metaTargets.value.month) },
  { id: 'L14', rowIndex: 10, colIndex: 11, colSpan: 2, rowSpan: 2, text: 'Pts 100²', wrapText: true },
  { id: 'N14', rowIndex: 10, colIndex: 13, colSpan: 2, rowSpan: 1, text: 'Dia' },
  { id: 'O14', rowIndex: 10, colIndex: 15, colSpan: 2, rowSpan: 1, text: 'Mes' },

  // Fila 15 (rowIndex 11) – Diferencia
  { id: 'B15', rowIndex: 11, colIndex: 1, colSpan: 3, rowSpan: 1, text: 'Diferencia' },
  { 
    id: 'E15', 
    rowIndex: 11, 
    colIndex: 4, 
    colSpan: 3, 
    rowSpan: 1, 
    text: (differences.value.day >= 0 ? '+' : '') + fmt(differences.value.day),
    color: differences.value.day >= 0 ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'H15', 
    rowIndex: 11, 
    colIndex: 7, 
    colSpan: 4, 
    rowSpan: 1, 
    text: (differences.value.month >= 0 ? '+' : '') + fmt(differences.value.month),
    color: differences.value.month >= 0 ? '#3C7D22' : '#FF0000'
  },
  { id: 'N15', rowIndex: 11, colIndex: 13, colSpan: 2, rowSpan: 1, text: fmtPct2(pts100m2.value.day) },
  { id: 'O15', rowIndex: 11, colIndex: 15, colSpan: 2, rowSpan: 1, text: fmtPct2(pts100m2.value.month) },

  // Fila 16 (rowIndex 12) - Headers para nueva sección INDIGO
  { id: 'B16', rowIndex: 12, colIndex: 1, colSpan: 1, rowSpan: 1, text: 'Sec', smallFont: true, thickTopBorder: true, thickBottomBorder: true, bgColor: '#A6C9EC' },
  { id: 'C16', rowIndex: 12, colIndex: 2, colSpan: 2, rowSpan: 1, text: 'Variable', smallFont: true, thickTopBorder: true, thickBottomBorder: true, bgColor: '#A6C9EC' },
  { id: 'G16', rowIndex: 12, colIndex: 4, colSpan: 3, rowSpan: 1, text: 'Meta Día', smallFont: true, thickTopBorder: true, thickBottomBorder: true, bgColor: '#A6C9EC', wrapText: true },
  { id: 'J16', rowIndex: 12, colIndex: 7, colSpan: 3, rowSpan: 1, text: 'Prod. Día', smallFont: true, thickTopBorder: true, thickBottomBorder: true, bgColor: '#A6C9EC', wrapText: true },
  { id: 'M16', rowIndex: 12, colIndex: 10, colSpan: 4, rowSpan: 1, text: 'Acumulado', smallFont: true, thickTopBorder: true, thickBottomBorder: true, bgColor: '#A6C9EC' },
  { id: 'P16', rowIndex: 12, colIndex: 14, colSpan: 3, rowSpan: 1, text: 'Sob./Fal. Mes', smallFont: true, thickTopBorder: true, thickBottomBorder: true, bgColor: '#A6C9EC', wrapText: true },

  // Fila 17 (rowIndex 13) - INDIGO / Metros
  { id: 'B17', rowIndex: 13, colIndex: 1, colSpan: 1, rowSpan: 3, text: 'INDIGO', vertical: true, bgColor: '#DAE9F8' },
  { id: 'C17', rowIndex: 13, colIndex: 2, colSpan: 2, rowSpan: 1, text: 'Metros', smallFont: true, bgColor: '#DAE9F8', wrapText: true },
  { id: 'G17', rowIndex: 13, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmt(indigoData.value.day.meta), bgColor: '#DAE9F8' },
  { 
    id: 'J17', 
    rowIndex: 13, 
    colIndex: 7, 
    colSpan: 3, 
    rowSpan: 1, 
    text: fmt(indigoData.value.day.metros),
    color: indigoData.value.day.metros >= indigoData.value.day.meta ? '#3C7D22' : '#FF0000',
    bgColor: '#DAE9F8'
  },
  { 
    id: 'M17', 
    rowIndex: 13, 
    colIndex: 10, 
    colSpan: 4, 
    rowSpan: 1, 
    text: fmt(indigoData.value.month.metros),
    color: indigoData.value.month.metros >= indigoData.value.month.metaAcumulada ? '#3C7D22' : '#FF0000',
    bgColor: '#DAE9F8'
  },
  { 
    id: 'P17', 
    rowIndex: 13, 
    colIndex: 14, 
    colSpan: 3, 
    rowSpan: 1,
    text: (() => {
      const diff = indigoData.value.month.metros - indigoData.value.month.metaAcumulada
      return (diff >= 0 ? '+' : '') + fmt(diff)
    })(),
    color: (indigoData.value.month.metros - indigoData.value.month.metaAcumulada) >= 0 ? '#3C7D22' : '#FF0000',
    bgColor: '#DAE9F8'
  },

  // Fila 18 (rowIndex 14) - INDIGO / Roturas 10³
  { id: 'C18', rowIndex: 14, colIndex: 2, colSpan: 2, rowSpan: 1, text: 'Roturas 10³', smallFont: true, bgColor: '#DAE9F8', wrapText: true },
  { id: 'G18', rowIndex: 14, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmtPct(indigoMetas.value.rot103), bgColor: '#DAE9F8' },
  { 
    id: 'J18', 
    rowIndex: 14, 
    colIndex: 7, 
    colSpan: 3, 
    rowSpan: 1, 
    text: fmtPct2(indigoData.value.day.rot103),
    color: indigoData.value.day.rot103 <= indigoMetas.value.rot103 ? '#3C7D22' : '#FF0000',
    bgColor: '#DAE9F8'
  },
  { 
    id: 'M18', 
    rowIndex: 14, 
    colIndex: 10, 
    colSpan: 4, 
    rowSpan: 1, 
    text: fmtPct2(indigoData.value.month.rot103),
    color: indigoData.value.month.rot103 <= indigoMetas.value.rot103 ? '#3C7D22' : '#FF0000',
    bgColor: '#DAE9F8'
  },
  { 
    id: 'P18', 
    rowIndex: 14, 
    colIndex: 14, 
    colSpan: 3, 
    rowSpan: 1,
    text: (() => {
      const diff = indigoMetas.value.rot103 - indigoData.value.month.rot103
      return (diff >= 0 ? '+' : '') + fmtPct2(diff)
    })(),
    color: (indigoMetas.value.rot103 - indigoData.value.month.rot103) >= 0 ? '#3C7D22' : '#FF0000',
    bgColor: '#DAE9F8'
  },

  // Fila 19 (rowIndex 15) - INDIGO / Est. Azul %
  { id: 'C19', rowIndex: 15, colIndex: 2, colSpan: 2, rowSpan: 1, text: 'Est. Azul %', smallFont: true, bgColor: '#DAE9F8', thickBottomBorder: true, wrapText: true },
  { id: 'G19', rowIndex: 15, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmtPct(indigoMetas.value.estopaAzul), bgColor: '#DAE9F8', thickBottomBorder: true },
  { 
    id: 'J19', 
    rowIndex: 15, 
    colIndex: 7, 
    colSpan: 3, 
    rowSpan: 1, 
    text: fmtPct2(estopaAzulData.value.day.porcentaje),
    color: estopaAzulData.value.day.porcentaje <= indigoMetas.value.estopaAzul ? '#3C7D22' : '#FF0000',
    bgColor: '#DAE9F8',
    thickBottomBorder: true
  },
  { 
    id: 'M19', 
    rowIndex: 15, 
    colIndex: 10, 
    colSpan: 4, 
    rowSpan: 1, 
    text: fmtPct2(estopaAzulData.value.month.porcentaje),
    color: estopaAzulData.value.month.porcentaje <= indigoMetas.value.estopaAzul ? '#3C7D22' : '#FF0000',
    bgColor: '#DAE9F8',
    thickBottomBorder: true
  },
  { 
    id: 'P19', 
    rowIndex: 15, 
    colIndex: 14, 
    colSpan: 3, 
    rowSpan: 1,
    text: (() => {
      const diff = indigoMetas.value.estopaAzul - estopaAzulData.value.month.porcentaje
      return (diff >= 0 ? '+' : '') + fmtPct2(diff)
    })(),
    color: (indigoMetas.value.estopaAzul - estopaAzulData.value.month.porcentaje) >= 0 ? '#3C7D22' : '#FF0000',
    bgColor: '#DAE9F8',
    thickBottomBorder: true
  },

  // =====================================================================
  // SECCIÓN TECELAGEM - Filas 20-24 (rowIndex 16-20)
  // =====================================================================

  // Fila 20 (rowIndex 16) - TECELAGEM / Metros
  { id: 'B20', rowIndex: 16, colIndex: 1, colSpan: 1, rowSpan: 5, text: 'TECELAGEM', vertical: true, thinBorders: true },
  { id: 'C20', rowIndex: 16, colIndex: 2, colSpan: 2, rowSpan: 1, text: 'Metros', smallFont: true, wrapText: true },
  { id: 'G20', rowIndex: 16, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmt(tecelagemData.value.day.meta) },
  { 
    id: 'J20', 
    rowIndex: 16, 
    colIndex: 7, 
    colSpan: 3, 
    rowSpan: 1, 
    text: fmt(tecelagemData.value.day.metros),
    color: tecelagemData.value.day.metros >= tecelagemData.value.day.meta ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'M20', 
    rowIndex: 16, 
    colIndex: 10, 
    colSpan: 4, 
    rowSpan: 1, 
    text: fmt(tecelagemData.value.month.metros),
    color: tecelagemData.value.month.metros >= tecelagemData.value.month.metaAcumulada ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'P20', 
    rowIndex: 16, 
    colIndex: 14, 
    colSpan: 3, 
    rowSpan: 1,
    text: (() => {
      const diff = tecelagemData.value.month.metros - tecelagemData.value.month.metaAcumulada
      return (diff >= 0 ? '+' : '') + fmt(diff)
    })(),
    color: (tecelagemData.value.month.metros - tecelagemData.value.month.metaAcumulada) >= 0 ? '#3C7D22' : '#FF0000'
  },

  // Fila 21 (rowIndex 17) - TECELAGEM / Eficiencia %
  { id: 'C21', rowIndex: 17, colIndex: 2, colSpan: 2, rowSpan: 1, text: 'Eficiencia %', smallFont: true, wrapText: true },
  { id: 'G21', rowIndex: 17, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmt(tecelagemData.value.day.metaEfi) },
  { 
    id: 'J21', 
    rowIndex: 17, 
    colIndex: 7, 
    colSpan: 3, 
    rowSpan: 1, 
    text: fmtPct1(tecelagemData.value.day.eficiencia),
    color: tecelagemData.value.day.eficiencia >= tecelagemData.value.day.metaEfi ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'M21', 
    rowIndex: 17, 
    colIndex: 10, 
    colSpan: 4, 
    rowSpan: 1, 
    text: fmtPct1(tecelagemData.value.month.eficiencia),
    color: tecelagemData.value.month.eficiencia >= tecelagemData.value.month.metaEfi ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'P21', 
    rowIndex: 17, 
    colIndex: 14, 
    colSpan: 3, 
    rowSpan: 1,
    text: (() => {
      const diff = tecelagemData.value.month.eficiencia - tecelagemData.value.month.metaEfi
      return (diff >= 0 ? '+' : '') + fmtPct1(diff)
    })(),
    color: (tecelagemData.value.month.eficiencia - tecelagemData.value.month.metaEfi) >= 0 ? '#3C7D22' : '#FF0000'
  },

  // Fila 22 (rowIndex 18) - TECELAGEM / Rot. TRA 10⁵
  { id: 'C22', rowIndex: 18, colIndex: 2, colSpan: 2, rowSpan: 1, text: 'Rot. TRA 10⁵', smallFont: true, wrapText: true },
  { id: 'G22', rowIndex: 18, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmtPct1(tecelagemData.value.day.metaRt105) },
  { 
    id: 'J22', 
    rowIndex: 18, 
    colIndex: 7, 
    colSpan: 3, 
    rowSpan: 1, 
    text: fmtPct1(tecelagemData.value.day.rotTra105),
    color: tecelagemData.value.day.rotTra105 <= tecelagemData.value.day.metaRt105 ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'M22', 
    rowIndex: 18, 
    colIndex: 10, 
    colSpan: 4, 
    rowSpan: 1, 
    text: fmtPct1(tecelagemData.value.month.rotTra105),
    color: tecelagemData.value.month.rotTra105 <= tecelagemData.value.month.metaRt105 ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'P22', 
    rowIndex: 18, 
    colIndex: 14, 
    colSpan: 3, 
    rowSpan: 1,
    text: (() => {
      const diff = tecelagemData.value.month.rotTra105 - tecelagemData.value.month.metaRt105
      return (diff >= 0 ? '+' : '') + fmtPct1(diff)
    })(),
    color: (tecelagemData.value.month.metaRt105 - tecelagemData.value.month.rotTra105) >= 0 ? '#3C7D22' : '#FF0000'
  },

  // Fila 23 (rowIndex 19) - TECELAGEM / Rot. URD 10⁵
  { id: 'C23', rowIndex: 19, colIndex: 2, colSpan: 2, rowSpan: 1, text: 'Rot. URD 10⁵', smallFont: true, wrapText: true },
  { id: 'G23', rowIndex: 19, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmtPct1(tecelagemData.value.day.metaRu105) },
  { 
    id: 'J23', 
    rowIndex: 19, 
    colIndex: 7, 
    colSpan: 3, 
    rowSpan: 1, 
    text: fmtPct1(tecelagemData.value.day.rotUrd105),
    color: tecelagemData.value.day.rotUrd105 <= tecelagemData.value.day.metaRu105 ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'M23', 
    rowIndex: 19, 
    colIndex: 10, 
    colSpan: 4, 
    rowSpan: 1, 
    text: fmtPct1(tecelagemData.value.month.rotUrd105),
    color: tecelagemData.value.month.rotUrd105 <= tecelagemData.value.month.metaRu105 ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'P23', 
    rowIndex: 19, 
    colIndex: 14, 
    colSpan: 3, 
    rowSpan: 1,
    text: (() => {
      const diff = tecelagemData.value.month.rotUrd105 - tecelagemData.value.month.metaRu105
      return (diff >= 0 ? '+' : '') + fmtPct1(diff)
    })(),
    color: (tecelagemData.value.month.metaRu105 - tecelagemData.value.month.rotUrd105) >= 0 ? '#3C7D22' : '#FF0000'
  },

  // Fila 24 (rowIndex 20) - TECELAGEM / Est. Azul %
  { id: 'C24', rowIndex: 20, colIndex: 2, colSpan: 2, rowSpan: 1, text: 'Est. Azul %', smallFont: true, wrapText: true },
  { id: 'G24', rowIndex: 20, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmtPct1(tecelagemData.value.day.metaEstopaAzul) },
  { 
    id: 'J24', 
    rowIndex: 20, 
    colIndex: 7, 
    colSpan: 3, 
    rowSpan: 1, 
    text: fmtPct1(tecelagemData.value.day.estopaAzulPct),
    color: tecelagemData.value.day.estopaAzulPct <= tecelagemData.value.day.metaEstopaAzul ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'M24', 
    rowIndex: 20, 
    colIndex: 10, 
    colSpan: 4, 
    rowSpan: 1, 
    text: fmtPct1(tecelagemData.value.month.estopaAzulPct),
    color: tecelagemData.value.month.estopaAzulPct <= tecelagemData.value.month.metaEstopaAzul ? '#3C7D22' : '#FF0000'
  },
  { 
    id: 'P24', 
    rowIndex: 20, 
    colIndex: 14, 
    colSpan: 3, 
    rowSpan: 1,
    text: (() => {
      const diff = tecelagemData.value.month.metaEstopaAzul - tecelagemData.value.month.estopaAzulPct
      return (diff >= 0 ? '+' : '') + fmtPct1(diff)
    })(),
    color: (tecelagemData.value.month.metaEstopaAzul - tecelagemData.value.month.estopaAzulPct) >= 0 ? '#3C7D22' : '#FF0000'
  },

  // =====================================================================
  // SECCIÓN ACABAMENTO (INTEGRADA) - Filas 25-26 (rowIndex 21-22)
  // MAQUINA = '165001'
  // =====================================================================

  // Fila 25 (rowIndex 21) - ACAB / Metros
  { id: 'B25', rowIndex: 21, colIndex: 1, colSpan: 1, rowSpan: 2, text: 'ACAB', vertical: true, bgColor: '#E8D5F0', thinBorders: true },
  { id: 'C25', rowIndex: 21, colIndex: 2, colSpan: 2, rowSpan: 1, text: 'Metros', smallFont: true, bgColor: '#E8D5F0', wrapText: true },
  { id: 'G25', rowIndex: 21, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmt(acabamentoData.value.day.meta), bgColor: '#E8D5F0' },
  { 
    id: 'J25', 
    rowIndex: 21, 
    colIndex: 7, 
    colSpan: 3, 
    rowSpan: 1, 
    text: fmt(acabamentoData.value.day.metros),
    color: acabamentoData.value.day.metros >= acabamentoData.value.day.meta ? '#3C7D22' : '#FF0000',
    bgColor: '#E8D5F0'
  },
  { 
    id: 'M25', 
    rowIndex: 21, 
    colIndex: 10, 
    colSpan: 4, 
    rowSpan: 1, 
    text: fmt(acabamentoData.value.month.metros),
    color: acabamentoData.value.month.metros >= acabamentoData.value.month.metaAcumulada ? '#3C7D22' : '#FF0000',
    bgColor: '#E8D5F0'
  },
  { 
    id: 'P25', 
    rowIndex: 21, 
    colIndex: 14, 
    colSpan: 3, 
    rowSpan: 1,
    text: (() => {
      const diff = acabamentoData.value.month.metros - acabamentoData.value.month.metaAcumulada
      return (diff >= 0 ? '+' : '') + fmt(diff)
    })(),
    color: (acabamentoData.value.month.metros - acabamentoData.value.month.metaAcumulada) >= 0 ? '#3C7D22' : '#FF0000',
    bgColor: '#E8D5F0'
  },

  // Fila 26 (rowIndex 22) - ACAB / ENC URD %
  { id: 'C26', rowIndex: 22, colIndex: 2, colSpan: 2, rowSpan: 1, text: 'ENC URD %', smallFont: true, bgColor: '#E8D5F0', thickBottomBorder: true, wrapText: true },
  { id: 'G26', rowIndex: 22, colIndex: 4, colSpan: 3, rowSpan: 1, text: fmtPct2(acabamentoData.value.day.metaEncUrd), bgColor: '#E8D5F0', thickBottomBorder: true },
  { 
    id: 'J26', 
    rowIndex: 22, 
    colIndex: 7, 
    colSpan: 3, 
    rowSpan: 1, 
    text: fmtPct2(acabamentoData.value.day.encUrdPct),
    color: acabamentoData.value.day.encUrdPct >= acabamentoData.value.day.metaEncUrd ? '#3C7D22' : '#FF0000',
    bgColor: '#E8D5F0',
    thickBottomBorder: true
  },
  { 
    id: 'M26', 
    rowIndex: 22, 
    colIndex: 10, 
    colSpan: 4, 
    rowSpan: 1, 
    text: fmtPct2(acabamentoData.value.month.encUrdPct),
    color: acabamentoData.value.month.encUrdPct >= acabamentoData.value.month.metaEncUrd ? '#3C7D22' : '#FF0000',
    bgColor: '#E8D5F0',
    thickBottomBorder: true
  },
  { 
    id: 'P26', 
    rowIndex: 22, 
    colIndex: 14, 
    colSpan: 3, 
    rowSpan: 1,
    text: (() => {
      // Para ENC URD %, la diferencia positiva es buena (menos encogimiento negativo)
      const diff = acabamentoData.value.month.encUrdPct - acabamentoData.value.month.metaEncUrd
      return (diff >= 0 ? '+' : '') + fmtPct2(diff)
    })(),
    color: (acabamentoData.value.month.encUrdPct - acabamentoData.value.month.metaEncUrd) >= 0 ? '#3C7D22' : '#FF0000',
    bgColor: '#E8D5F0',
    thickBottomBorder: true
  }
]})


const totals = computed(() => {
  const day = rows.value.reduce((sum, row) => sum + (Number(row.metrosDia) || 0), 0)
  const month = rows.value.reduce((sum, row) => sum + (Number(row.metrosMes) || 0), 0)
  return { day, month }
})

const enrichedRows = computed(() => {
  const totalDay = totals.value.day || 0
  const totalMonth = totals.value.month || 0
  return rows.value.map((row) => ({
    ...row,
    percDia: totalDay ? (row.metrosDia / totalDay) * 100 : 0,
    percMes: totalMonth ? (row.metrosMes / totalMonth) * 100 : 0
  }))
})

const differences = computed(() => {
  const dayDiff = totals.value.day - metaTargets.value.day
  const monthDiff = totals.value.month - metaTargets.value.month
  return {
    day: dayDiff,
    month: monthDiff,
    dayPct: metaTargets.value.day ? (dayDiff / metaTargets.value.day) * 100 : 0,
    monthPct: metaTargets.value.month ? (monthDiff / metaTargets.value.month) * 100 : 0
  }
})

// Función para calcular días transcurridos del mes hasta la fecha seleccionada
function diasDelMes() {
  if (!selectedDate.value) return 1
  const [year, month, day] = selectedDate.value.split('-').map(Number)
  return day || 1
}

const formattedDate = computed(() => formatDate(selectedDate.value))

const chartMonthYear = computed(() => {
  if (!selectedDate.value) return ''
  const [year, month] = selectedDate.value.split('-')
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${monthNames[parseInt(month) - 1]} ${year}`
})

function gridPlacement(cell) {
  const rowSpan = cell.rowSpan || 1
  const colSpan = cell.colSpan || 1
  return {
    gridRow: `${cell.rowIndex} / span ${rowSpan}`,
    gridColumn: `${cell.colIndex} / span ${colSpan}`
  }
}

function debugPlacement(cell) {
  const rowSpan = cell.debugRowSpan || 1
  const colSpan = cell.debugColSpan || 1
  return {
    gridRow: `${cell.debugRowIndex} / span ${rowSpan}`,
    gridColumn: `${cell.debugColIndex} / span ${colSpan}`
  }
}

function getCellStyle(cell, placement) {
  return {
    ...placement,
    ...(cell.color && { color: cell.color }),
    ...(cell.vertical && { writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }),
    ...(cell.smallFont && { fontSize: '8pt' }),
    ...(cell.bgColor && { background: cell.bgColor }),
    ...(cell.thinBorders && { borderLeft: '1px solid #0C769E', borderBottom: '1px solid #0C769E', borderTop: '1px solid #0C769E' }),
    ...(cell.thickTopBorder && { borderTop: '2px solid #0C769E' }),
    ...(cell.thickBottomBorder && { borderBottom: '2px solid #0C769E' }),
    ...(cell.noTopBorder && { borderTop: '0' }),
    ...(cell.noBottomBorder && { borderBottom: '0' }),
    ...(cell.wrapText && { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.1' })
  }
}

const debugCells = computed(() => {
  const ids = ['B17', 'C17', 'G17', 'J17']
  const byId = new Map(excelCells.value.map((cell) => [cell.id, cell]))
  return ids
    .map((id, index) => {
      const cell = byId.get(id)
      if (!cell) return null
      const row = 1
      const col = index + 1
      // Eliminar propiedades de bordes gruesos para que B17 tenga los mismos bordes que C17/G17/J17
      const { thickTopBorder, thickBottomBorder, thickLeftBorder, thickRightBorder, ...cellWithoutThickBorders } = cell
      return {
        ...cellWithoutThickBorders,
        debugRowIndex: row,
        debugColIndex: col,
        debugRowSpan: 1,
        debugColSpan: 1
      }
    })
    .filter(Boolean)
})

function formatDate(value) {
  if (!value) return ''
  const [y, m, d] = value.split('-').map((v) => parseInt(v, 10))
  if (!y || !m || !d) return value
  const date = new Date(y, m - 1, d)
  const formatted = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: '2-digit' }).format(date)
  return formatted.replace(/ de /g, '-').replace(/\./g, '')
}

function formatNumber(value, decimals = 0) {
  const formatter = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true
  })
  const num = typeof value === 'number' ? value : Number(value) || 0
  return formatter.format(num)
}

function formatPercent(value) {
  const formatter = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
  const num = typeof value === 'number' ? value : Number(value) || 0
  return formatter.format(num)
}

function formatPercent2(value) {
  const formatter = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const num = typeof value === 'number' ? value : Number(value) || 0
  return formatter.format(num)
}

function signNumber(value) {
  const formatter = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  const num = typeof value === 'number' ? value : Number(value) || 0
  const sign = num > 0 ? '+' : ''
  return `${sign}${formatter.format(num)}`
}

async function getLastAvailableDate() {
  try {
    const res = await fetch(`${API_URL}/calidad/available-dates`)
    if (!res.ok) return null
    const data = await res.json()
    return data.maxDate || null
  } catch (err) {
    console.error('Error obteniendo fechas:', err)
    return null
  }
}

async function loadData(useLastAvailable = false) {
  loading.value = true
  isLoadingData.value = true
  fetchError.value = ''
  try {
    const dateToUse = selectedDate.value
    const [year, month] = dateToUse.split('-')
    const monthStart = `${year}-${month}-01`
    const monthEnd = dateToUse  // Cambiar a la fecha seleccionada para acumulado correcto
    
    console.log(`📅 Cargando datos para fecha: ${dateToUse} (acumulado desde ${monthStart} hasta ${monthEnd})`)
    
    // Cargar datos de calidad por sectores
    const resCalidad = await fetch(
      `${API_URL}/calidad/sectores-resumen?date=${dateToUse}&monthStart=${monthStart}&monthEnd=${monthEnd}`
    )
    
    if (!resCalidad.ok) throw new Error(`HTTP ${resCalidad.status}`)
    const dataCalidad = await resCalidad.json()
    
    // Cargar metas del día y acumulado
    const resMetas = await fetch(
      `${API_URL}/metas/resumen/${dateToUse}`
    )
    
    if (resMetas.ok) {
      const dataMetas = await resMetas.json()
      metaTargets.value = {
        day: Number(dataMetas.day || 0),
        month: Number(dataMetas.month || 0)
      }
      console.log(`🎯 Metas cargadas - Día: ${dataMetas.day}, Mes: ${dataMetas.month}`)
    } else {
      console.warn('⚠️ No se encontraron metas para esta fecha, usando valores predeterminados')
      metaTargets.value = { day: 0, month: 0 }
    }
    
    // Cargar Pts 100m² del día y acumulado
    const resPts = await fetch(
      `${API_URL}/calidad/pts100m2?date=${dateToUse}&monthStart=${monthStart}&monthEnd=${monthEnd}`
    )
    
    if (resPts.ok) {
      const dataPts = await resPts.json()
      pts100m2.value = {
        day: Number(dataPts.day || 0),
        month: Number(dataPts.month || 0)
      }
      console.log(`📐 Pts 100m² cargados - Día: ${dataPts.day.toFixed(1)}, Mes: ${dataPts.month.toFixed(1)}`)
    } else {
      console.warn('⚠️ No se pudieron calcular Pts 100m²')
      pts100m2.value = { day: 0, month: 0 }
    }
    
    // Cargar datos de INDIGO (Metros y Roturas 10³)
    const resIndigo = await fetch(
      `${API_URL}/produccion/indigo-resumen?date=${dateToUse}&monthStart=${monthStart}&monthEnd=${monthEnd}`
    )
    
    if (resIndigo.ok) {
      const dataIndigo = await resIndigo.json()
      indigoData.value = {
        day: {
          metros: Number(dataIndigo.day?.metros || 0),
          rot103: Number(dataIndigo.day?.rot103 || 0),
          meta: Number(dataIndigo.day?.meta || 0)
        },
        month: {
          metros: Number(dataIndigo.month?.metros || 0),
          rot103: Number(dataIndigo.month?.rot103 || 0),
          metaAcumulada: Number(dataIndigo.month?.metaAcumulada || 0)
        }
      }
      console.log(`🔵 INDIGO cargados - Día: ${indigoData.value.day.metros} m, Meta: ${indigoData.value.day.meta}, Rot: ${indigoData.value.day.rot103.toFixed(2)}`)
      console.log(`🔵 INDIGO cargados - Mes: ${indigoData.value.month.metros} m, Meta Acum: ${indigoData.value.month.metaAcumulada}, Rot: ${indigoData.value.month.rot103.toFixed(2)}`)
    } else {
      console.warn('⚠️ No se pudieron cargar datos de INDIGO')
      indigoData.value = { 
        day: { metros: 0, rot103: 0, meta: 0 }, 
        month: { metros: 0, rot103: 0, metaAcumulada: 0 } 
      }
    }
    
    // Cargar datos de Estopa Azul %
    const resEstopa = await fetch(
      `${API_URL}/produccion/estopa-azul?date=${dateToUse}&monthStart=${monthStart}&monthEnd=${monthEnd}`
    )
    
    if (resEstopa.ok) {
      const dataEstopa = await resEstopa.json()
      estopaAzulData.value = {
        day: {
          porcentaje: Number(dataEstopa.day?.porcentaje || 0)
        },
        month: {
          porcentaje: Number(dataEstopa.month?.porcentaje || 0)
        }
      }
      console.log(`🔷 Estopa Azul cargados - Día: ${estopaAzulData.value.day.porcentaje.toFixed(2)}%, Mes: ${estopaAzulData.value.month.porcentaje.toFixed(2)}%`)
    } else {
      console.warn('⚠️ No se pudieron cargar datos de Estopa Azul')
      estopaAzulData.value = { 
        day: { porcentaje: 0 }, 
        month: { porcentaje: 0 } 
      }
    }
    
    // Cargar datos de TECELAGEM (Metros, Eficiencia, Roturas, Estopa Azul)
    const resTecelagem = await fetch(
      `${API_URL}/produccion/tecelagem-resumen?date=${dateToUse}&monthStart=${monthStart}&monthEnd=${monthEnd}`
    )
    
    if (resTecelagem.ok) {
      const dataTecelagem = await resTecelagem.json()
      tecelagemData.value = {
        day: {
          metros: Number(dataTecelagem.day?.metros || 0),
          eficiencia: Number(dataTecelagem.day?.eficiencia || 0),
          rotTra105: Number(dataTecelagem.day?.rotTra105 || 0),
          rotUrd105: Number(dataTecelagem.day?.rotUrd105 || 0),
          estopaAzulPct: Number(dataTecelagem.day?.estopaAzulPct || 0),
          meta: Number(dataTecelagem.day?.meta || 0),
          metaEfi: Number(dataTecelagem.day?.metaEfi || 0),
          metaRt105: Number(dataTecelagem.day?.metaRt105 || 0),
          metaRu105: Number(dataTecelagem.day?.metaRu105 || 0),
          metaEstopaAzul: Number(dataTecelagem.day?.metaEstopaAzul || 0)
        },
        month: {
          metros: Number(dataTecelagem.month?.metros || 0),
          eficiencia: Number(dataTecelagem.month?.eficiencia || 0),
          rotTra105: Number(dataTecelagem.month?.rotTra105 || 0),
          rotUrd105: Number(dataTecelagem.month?.rotUrd105 || 0),
          estopaAzulPct: Number(dataTecelagem.month?.estopaAzulPct || 0),
          metaAcumulada: Number(dataTecelagem.month?.metaAcumulada || 0),
          metaEfi: Number(dataTecelagem.month?.metaEfi || 0),
          metaRt105: Number(dataTecelagem.month?.metaRt105 || 0),
          metaRu105: Number(dataTecelagem.month?.metaRu105 || 0),
          metaEstopaAzul: Number(dataTecelagem.month?.metaEstopaAzul || 0)
        }
      }
      console.log(`🟢 TECELAGEM cargados - Día: ${tecelagemData.value.day.metros} m, Efi: ${tecelagemData.value.day.eficiencia.toFixed(1)}%`)
      console.log(`🟢 TECELAGEM cargados - Mes: ${tecelagemData.value.month.metros} m, Efi: ${tecelagemData.value.month.eficiencia.toFixed(1)}%`)
      console.log(`🟢 TECELAGEM Est. Azul - Día: ${tecelagemData.value.day.estopaAzulPct}, Mes: ${tecelagemData.value.month.estopaAzulPct}`)
    } else {
      console.warn('⚠️ No se pudieron cargar datos de TECELAGEM')
      tecelagemData.value = {
        day: { metros: 0, eficiencia: 0, rotTra105: 0, rotUrd105: 0, estopaAzulPct: 0, meta: 0, metaEfi: 0, metaRt105: 0, metaRu105: 0, metaEstopaAzul: 0 },
        month: { metros: 0, eficiencia: 0, rotTra105: 0, rotUrd105: 0, estopaAzulPct: 0, metaAcumulada: 0, metaEfi: 0, metaRt105: 0, metaRu105: 0, metaEstopaAzul: 0 }
      }
    }
    
    // Cargar datos de ACABAMENTO (Integrada - MAQUINA 165001)
    const resAcabamento = await fetch(
      `${API_URL}/produccion/acabamento-resumen?date=${dateToUse}&monthStart=${monthStart}&monthEnd=${monthEnd}`
    )
    
    if (resAcabamento.ok) {
      const dataAcabamento = await resAcabamento.json()
      acabamentoData.value = {
        day: {
          metros: Number(dataAcabamento.day?.metros || 0),
          encUrdPct: Number(dataAcabamento.day?.encUrdPct || 0),
          meta: Number(dataAcabamento.day?.meta || 0),
          metaEncUrd: Number(dataAcabamento.day?.metaEncUrd || -1.5)
        },
        month: {
          metros: Number(dataAcabamento.month?.metros || 0),
          encUrdPct: Number(dataAcabamento.month?.encUrdPct || 0),
          metaAcumulada: Number(dataAcabamento.month?.metaAcumulada || 0),
          metaEncUrd: Number(dataAcabamento.month?.metaEncUrd || -1.5)
        }
      }
      console.log(`🟣 ACABAMENTO cargados - Día: ${acabamentoData.value.day.metros} m, ENC URD: ${acabamentoData.value.day.encUrdPct.toFixed(2)}%`)
      console.log(`🟣 ACABAMENTO cargados - Mes: ${acabamentoData.value.month.metros} m, ENC URD: ${acabamentoData.value.month.encUrdPct.toFixed(2)}%`)
    } else {
      console.warn('⚠️ No se pudieron cargar datos de ACABAMENTO')
      acabamentoData.value = {
        day: { metros: 0, encUrdPct: 0, meta: 0, metaEncUrd: -1.5 },
        month: { metros: 0, encUrdPct: 0, metaAcumulada: 0, metaEncUrd: -1.5 }
      }
    }
    
    if (Array.isArray(dataCalidad)) {
      rows.value = dataCalidad.map(r => ({
        sector: r.SECTOR || r.sector,
        metrosDia: Number(r.metrosDia || 0),
        metrosMes: Number(r.metrosMes || 0),
        metaPct: Number(r.metaPct || 0)
      }))
      
      const totalMetros = rows.value.reduce((sum, r) => sum + r.metrosDia, 0)
      console.log(`📊 Datos cargados - Día: ${totalMetros}, Mes: ${rows.value.reduce((sum, r) => sum + r.metrosMes, 0)}`)
      
      // Si no hay datos para el día, mantener la estructura con ceros pero mostrar acumulado del mes
      if (totalMetros === 0 && rows.value.length === 0) {
        // Crear estructura vacía con sectores estándar
        rows.value = [
          { sector: 'S/ Def.', metrosDia: 0, metrosMes: 0, metaPct: 0 },
          { sector: 'FIACAO', metrosDia: 0, metrosMes: 0, metaPct: 0 },
          { sector: 'INDIGO', metrosDia: 0, metrosMes: 0, metaPct: 0 },
          { sector: 'TECELAGEM', metrosDia: 0, metrosMes: 0, metaPct: 0 },
          { sector: 'ACABMTO', metrosDia: 0, metrosMes: 0, metaPct: 0 },
          { sector: 'GERAL', metrosDia: 0, metrosMes: 0, metaPct: 0 }
        ]
        console.log('⚠️ Sin datos para esta fecha - mostrando ceros')
      }
      
      fetchError.value = ''
    } else {
      throw new Error('Formato inválido')
    }
  } catch (err) {
    console.error('Error:', err)
    fetchError.value = `Error: ${err.message}`
    // En caso de error, mostrar estructura vacía
    rows.value = [
      { sector: 'S/ Def.', metrosDia: 0, metrosMes: 0, metaPct: 0 },
      { sector: 'FIACAO', metrosDia: 0, metrosMes: 0, metaPct: 0 },
      { sector: 'INDIGO', metrosDia: 0, metrosMes: 0, metaPct: 0 },
      { sector: 'TECELAGEM', metrosDia: 0, metrosMes: 0, metaPct: 0 },
      { sector: 'ACABMTO', metrosDia: 0, metrosMes: 0, metaPct: 0 },
      { sector: 'GERAL', metrosDia: 0, metrosMes: 0, metaPct: 0 }
    ]
  } finally {
    loading.value = false
    isLoadingData.value = false
    // Cargar tramas disponibles y luego el gráfico DESPUÉS de desactivar el flag
    await loadAvailableTramas()
    await loadChartData()
  }
}

async function loadChartData() {
  try {
    // Limpiar datos del gráfico antes de cargar nuevos
    chartData.value = []
    
    const dateToUse = selectedDate.value
    const [year, month] = dateToUse.split('-')
    const monthStart = `${year}-${month}-01`
    const monthEnd = dateToUse  // Hasta la fecha seleccionada
    const url = `${API_URL}/produccion/eficiencia-roturas?date=${dateToUse}&monthStart=${monthStart}&monthEnd=${monthEnd}&trama=${encodeURIComponent(selectedTrama.value)}`
    
    console.log(`📈 Cargando datos de gráfico desde ${monthStart} hasta ${monthEnd}, trama: ${selectedTrama.value}`)
    console.log(`🔗 URL: ${url}`)
    
    const res = await fetch(url)
    
    if (!res.ok) {
      console.warn(`⚠️ No se pudieron cargar datos del gráfico - HTTP ${res.status}`)
      chartData.value = []
      renderChart()
      return
    }
    
    const data = await res.json()
    chartData.value = data
    console.log(`📊 Datos de gráfico cargados: ${data.length} registros`)
    
    if (data.length > 0) {
      console.log(`📅 Primer registro:`, data[0])
      console.log(`📅 Último registro:`, data[data.length - 1])
    }
    
    // Actualizar el gráfico
    await nextTick()
    renderChart()
    
  } catch (err) {
    console.error('Error cargando datos del gráfico:', err)
    chartData.value = []
    renderChart()
  }
}

async function loadAvailableTramas() {
  try {
    const dateToUse = selectedDate.value
    const [year, month] = dateToUse.split('-')
    const monthStart = `${year}-${month}-01`
    const monthEnd = dateToUse
    const url = `${API_URL}/produccion/eficiencia-roturas?date=${dateToUse}&monthStart=${monthStart}&monthEnd=${monthEnd}`
    
    console.log(`🔍 Cargando tramas disponibles desde ${monthStart} hasta ${monthEnd}`)
    
    const res = await fetch(url)
    if (!res.ok) return
    
    const data = await res.json()
    
    // Extraer tramas únicas
    const tramas = [...new Set(data.map(d => d.trama))].filter(Boolean).sort()
    
    if (tramas.length > 0) {
      availableTramas.value = tramas
      console.log(`📋 Tramas disponibles: ${tramas.join(', ')}`)
      
      // Si la trama seleccionada no está en la lista, seleccionar la primera
      if (!tramas.includes(selectedTrama.value)) {
        selectedTrama.value = tramas[0]
      }
    }
  } catch (err) {
    console.error('Error cargando tramas disponibles:', err)
  }
}

// Configuración del Toast
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 1500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  }
})

// Copiar gráfico al portapapeles
async function copyChartToClipboard() {
  try {
    if (!chartCanvas.value || !chartContainerRef.value) {
      console.error('❌ Elementos del gráfico no disponibles')
      return
    }

    console.log('📸 Capturando gráfico con header...')
    
    const sourceCanvas = chartCanvas.value
    
    // Configuración del header
    const headerHeight = 40
    const padding = 12
    const borderWidth = 1
    const scale = 3  // Mayor escala para mejor nitidez
    
    // Obtener dimensiones reales del canvas del gráfico
    const chartWidth = sourceCanvas.width
    const chartHeight = sourceCanvas.height
    
    // Crear canvas final (con espacio para el borde)
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = chartWidth + (padding * 2 * scale) + (borderWidth * 2 * scale)
    tempCanvas.height = (headerHeight * scale) + chartHeight + (padding * scale) + (borderWidth * 2 * scale)
    
    const ctx = tempCanvas.getContext('2d')
    
    // Borde exterior (mismo color que header)
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
    
    // Fondo blanco interior (dejando el borde visible)
    const borderOffset = borderWidth * scale
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(borderOffset, borderOffset, tempCanvas.width - (borderOffset * 2), tempCanvas.height - (borderOffset * 2))
    
    // Header: fondo gris claro
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(borderOffset, borderOffset, tempCanvas.width - (borderOffset * 2), headerHeight * scale)
    
    // Línea inferior del header
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = scale
    ctx.beginPath()
    ctx.moveTo(borderOffset, borderOffset + (headerHeight * scale))
    ctx.lineTo(tempCanvas.width - borderOffset, borderOffset + (headerHeight * scale))
    ctx.stroke()
    
    // Textos del header
    const fontSize = 13 * scale
    ctx.font = `600 ${fontSize}px Verdana, sans-serif`
    ctx.fillStyle = '#1e293b'
    ctx.textBaseline = 'middle'
    
    // Título izquierdo
    ctx.fillText('Eficiencias y Roturas de Trama 105 - Tejeduría', borderOffset + (padding * scale), borderOffset + (headerHeight * scale) / 2)
    
    // Texto derecho (mes y trama)
    const rightText = `${chartMonthYear.value} - Trama: ${selectedTrama.value}`
    const rightTextWidth = ctx.measureText(rightText).width
    ctx.fillText(rightText, tempCanvas.width - rightTextWidth - borderOffset - (padding * scale), borderOffset + (headerHeight * scale) / 2)
    
    // Dibujar el gráfico
    ctx.drawImage(sourceCanvas, borderOffset + (padding * scale), borderOffset + (headerHeight * scale), chartWidth, chartHeight)
    
    // Mostrar toast de "copiando..."
    Toast.fire({
      icon: 'info',
      title: 'Copiando gráfico...',
      timer: 1500
    })
    
    // Convertir a blob y copiar
    tempCanvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
        console.log('✅ Gráfico copiado al portapapeles')
        Toast.fire({
          icon: 'success',
          title: 'Gráfico copiado!',
          text: 'Puedes pegarlo en WhatsApp, email, etc.'
        })
      } catch (err) {
        console.error('❌ Error copiando al portapapeles:', err)
        Toast.fire({
          icon: 'error',
          title: 'Error al copiar',
          text: 'Intenta de nuevo'
        })
      }
    }, 'image/png', 1.0)
  } catch (err) {
    console.error('❌ Error capturando gráfico:', err)
    Toast.fire({
      icon: 'error',
      title: 'Error al capturar',
      text: 'No se pudo generar la imagen'
    })
  }
}

function renderChart() {
  if (!chartCanvas.value) return
  
  // Destruir gráfico anterior si existe
  if (chartInstance.value) {
    try {
      // Detener cualquier animación en progreso
      chartInstance.value.stop()
      chartInstance.value.destroy()
    } catch (e) {
      // Ignorar errores de limpieza
    }
    chartInstance.value = null
  }
  
  // Si no hay datos, no crear el gráfico
  if (!chartData.value || chartData.value.length === 0) {
    console.warn('⚠️ No hay datos para renderizar el gráfico')
    return
  }
  
  // Preparar datos - extraer fecha sin conversión de zona horaria
  const labels = chartData.value.map(d => {
    // d.fecha viene en formato 'YYYY-MM-DD', extraer directamente
    const [year, month, day] = d.fecha.split('-')
    return `${day}-${month}-${year.slice(-2)}`
  })
  
  const eficiencias = chartData.value.map(d => d.eficiencia || 0)
  const rt105 = chartData.value.map(d => d.rt105 || 0)
  
  // Calcular el máximo de RT105 y añadir 15% de margen para los labels
  const maxRT105 = Math.max(...rt105)
  const scaleMaxY1 = maxRT105 * 1.15  // 15% de margen
  
  console.log(`🎨 Renderizando gráfico con ${labels.length} puntos de datos`)
  console.log(`📊 Max RT105: ${maxRT105}, Scale Max: ${scaleMaxY1.toFixed(2)}`)
  
  // Usar setTimeout para dar tiempo de limpiar animaciones del gráfico anterior
  setTimeout(() => {
    try {
      // Crear el gráfico
      const ctx = chartCanvas.value?.getContext('2d')
      if (!ctx) {
        console.error('❌ No se pudo obtener el contexto del canvas')
        return
      }

      chartInstance.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          type: 'bar',
          label: 'Eficiencia %',
          data: eficiencias,
          backgroundColor: '#46B1E1',
          borderColor: '#46B1E1',
          borderWidth: 1,
          yAxisID: 'y',
          order: 2,
          datalabels: {
            display: true,
            align: 'end',
            anchor: 'start',
            color: '#000000',
            rotation: -90,
            font: {
              family: 'Verdana',
              weight: 'bold',
              size: 11
            },
            formatter: function(value) {
              return value !== null && value !== 0 ? value.toFixed(1) : '';
            }
          }
        },
        {
          type: 'line',
          label: 'RT105',
          data: rt105,
          backgroundColor: 'rgba(233, 113, 50, 0.2)',
          borderColor: '#E97132',
          borderWidth: 2,
          pointRadius: 5,
          pointStyle: 'rectRot',
          pointBackgroundColor: '#E97132',
          pointBorderColor: '#E97132',
          yAxisID: 'y1',
          order: 1,
          tension: 0.3,
          datalabels: {
            display: true,
            align: 'top',
            anchor: 'end',
            offset: 10,
            color: '#E97132',
            clip: false,
            font: {
              family: 'Verdana',
              weight: 'bold',
              size: 11
            },
            formatter: function(value) {
              return value !== null && value !== 0 ? value.toFixed(1) : '';
            }
          }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      devicePixelRatio: 3,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        datalabels: {
          clip: false
        },
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1e293b',
          bodyColor: '#475569',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          titleFont: {
            family: 'Verdana',
            size: 12,
            weight: '600'
          },
          bodyFont: {
            family: 'Verdana',
            size: 11
          },
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || ''
              if (label) {
                label += ': '
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(1)
              }
              return label
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: 'Verdana',
              size: 10
            },
            autoSkip: false,
            maxRotation: labels.length > 15 ? 90 : 0,
            minRotation: labels.length > 15 ? 90 : 0,
            maxTicksLimit: undefined
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: false
          },
          ticks: {
            color: '#000000',
            font: {
              family: 'Verdana',
              size: 10
            }
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          max: scaleMaxY1,
          title: {
            display: false
          },
          ticks: {
            color: '#000000',
            font: {
              family: 'Verdana',
              size: 10
            }
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    },
    layout: {
      padding: {
        top: 10,
        bottom: 0,
        left: 0,
        right: 0
      }
    }
      })
    } catch (err) {
      console.error('❌ Error renderizando gráfico:', err)
    }
  }, 200)  // 200ms de delay para limpiar el gráfico anterior
}
</script>

<style scoped>
.chart-header {
  font-family: Verdana, sans-serif;
}

.quality-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: white;
}

/* Cuadrícula estilo Excel (ancho B-O, filas 5-15 en esta primera fase) */
.excel-wrapper {
  padding: 8px;
}

.excel-grid {
  display: grid;
  grid-template-columns:
    32px 22px 42px 22px 21px 21px 21px 21px 21px 21px 22px 22px 22px 22px 22px 22px;
  grid-template-rows:
    32px 32px 31px 31px 31px 31px 31px 31px 33px 31px 33px 31px 31px 31px 31px 31px 31px 31px 31px 31px 31px 31px;
  width: max-content;
  font-family: Verdana, sans-serif;
  font-size: 10pt;
  line-height: 1.1;
  border-top: 1px solid #0C769E;
  border-left: 1px solid #0C769E;
}

.excel-grid-debug {
  display: grid;
  grid-template-columns: 40px 80px 80px 80px;
  grid-template-rows: 26px;
  width: max-content;
  font-family: Verdana, sans-serif;
  font-size: 10pt;
  line-height: 1.1;
  border-top: 1px solid #0C769E;
  border-left: 1px solid #0C769E;
}

.excel-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  border-right: 1px solid #0C769E;
  border-bottom: 1px solid #0C769E;
  box-sizing: border-box;
  text-align: center;
  color: #000000;
  background: #ffffff;
  white-space: nowrap;
  overflow: hidden;
}

/* Clase para celdas que permiten quiebre de texto */
.excel-cell.wrap-text {
  white-space: normal !important;
  word-break: break-word;
  line-height: 1.0;
  overflow: visible;
}

.quality-card ::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.quality-card ::-webkit-scrollbar-track {
  background: #f0f4f8;
}

.quality-card ::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
}

.quality-card ::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* Scrollbar personalizado */
.quality-card ::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.quality-card ::-webkit-scrollbar-track {
  background: #f0f4f8;
}

.quality-card ::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
}

.quality-card ::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* Datepicker styles */
.custom-datepicker {
  position: relative;
  display: inline-block;
}

.datepicker-input {
  padding: 8px 40px 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  width: 200px;
  cursor: pointer;
  background: white;
  transition: border-color 0.2s;
  text-align: center;
}

.datepicker-input:focus {
  outline: none;
  border-color: #0078d4;
}

.calendar-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  cursor: pointer;
  user-select: none;
}

.calendar-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  z-index: 1000;
  min-width: 280px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.calendar-selects {
  display: flex;
  gap: 0.25rem;
}

.calendar-select {
  padding: 0.1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  background-color: transparent;
  cursor: pointer;
}

.calendar-select:hover {
  background-color: #f3f4f6;
}

.calendar-select:focus {
  outline: none;
  border-color: #d1d5db;
}

.calendar-nav-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 16px;
  color: #0078d4;
  transition: all 0.2s;
}

.calendar-nav-btn:hover {
  background: #0078d4;
  color: white;
  border-color: #0078d4;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.calendar-weekdays span {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  padding: 4px;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calendar-day:hover:not(:disabled) {
  background: #f0f7ff;
  border-color: #0078d4;
}

.calendar-day.other-month {
  color: #ccc;
  background: #fafafa;
  cursor: default;
}

.calendar-day.selected {
  background: #0078d4;
  color: white;
  border-color: #0078d4;
  font-weight: 600;
}

.calendar-day.today {
  border: 2px solid #0078d4;
  font-weight: 600;
}

.calendar-day.selected.today {
  border: 2px solid #005a9e;
}
</style>

<!-- Estilos específicos de celdas Excel sin scope para que se apliquen correctamente -->
<style>
/* Paleta: #985C21 (beige oscuro), #ECC9A6 (beige claro), #F8E9DA (crema), #A2E6B5 (verde claro) */
/* Bordes: #9E760C (marrón), #FFFFFF (blanco), #D9A956 (dorado) */

.cell-B5 {
  font-weight: 700 !important;
  background: #215C98 !important;
  color: #FFFFFF !important;
  border-right: 2px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
}

.cell-E5 {
  background: #A6C9EC !important;
  color: #000000 !important;
  border-right: 2px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
  font-weight: 700 !important;
}

.cell-L5 {
  background: #A6C9EC !important;
  color: #000000 !important;
  border-right: 1px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
  font-weight: 700 !important;
}

.cell-B6,
.cell-E6,
.cell-H6,
.cell-L6,
.cell-N6,
.cell-P6 {
  background: #A6C9EC !important;
  color: #000000 !important;
  border-right: 1px solid #0C769E !important;
  border-bottom: 2px solid #0C769E !important;
}

.cell-B6 {
  border-right: 2px solid #0C769E !important;
}

.cell-H6 {
  border-right: 2px solid #0C769E !important;
}
.cell-H6 {
  border-right: 2px solid #0C769E !important;
}
.cell-B7,
.cell-E7,
.cell-H7,
.cell-L7,
.cell-N7,
.cell-P7 {
  background: #DAE9F8 !important;
  color: #000000 !important;
  border-right: 1px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
}

.cell-B7 {
  border-right: 2px solid #0C769E !important;
}

.cell-H7 {
  border-right: 2px solid #0C769E !important;
}

.cell-B8,
.cell-E8,
.cell-H8,
.cell-L8,
.cell-N8,
.cell-P8 {
  background: #ffffff !important;
  border-right: 1px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
}

.cell-B8 {
  border-right: 2px solid #0C769E !important;
}

.cell-H8 {
  border-right: 2px solid #0C769E !important;
}

.cell-B9,
.cell-E9,
.cell-H9,
.cell-L9,
.cell-N9,
.cell-P9 {
  background: #DAE9F8 !important;
  border-right: 1px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
}

.cell-B9 {
  border-right: 2px solid #0C769E !important;
}

.cell-H9 {
  border-right: 2px solid #0C769E !important;
}

.cell-B10,
.cell-E10,
.cell-H10,
.cell-L10,
.cell-N10,
.cell-P10 {
  background: #ffffff !important;
  border-right: 1px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
}

.cell-B10 {
  border-right: 2px solid #0C769E !important;
}

.cell-H10 {
  border-right: 2px solid #0C769E !important;
}

.cell-B11,
.cell-E11,
.cell-H11,
.cell-L11,
.cell-N11,
.cell-P11 {
  background: #DAE9F8 !important;
  border-right: 1px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
}

.cell-B11 {
  border-right: 2px solid #0C769E !important;
}

.cell-H11 {
  border-right: 2px solid #0C769E !important;
}

.cell-B12,
.cell-E12,
.cell-H12,
.cell-L12,
.cell-N12,
.cell-P12 {
  background: #ffffff !important;
  border-right: 1px solid #0C769E !important;
  border-bottom: 3px double #0C769E !important;
}

.cell-B12 {
  border-right: 2px solid #0C769E !important;
}

.cell-H12 {
  border-right: 2px solid #0C769E !important;
}

.cell-B13,
.cell-E13,
.cell-H13,
.cell-L13,
.cell-N13,
.cell-P13 {
  font-weight: 700 !important;
  border-right: 1px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
}

.cell-B13 {
  border-right: 2px solid #0C769E !important;
}

.cell-H13 {
  border-right: 2px solid #0C769E !important;
}

.cell-L13,
.cell-N13,
.cell-P13 {
  border-bottom: 2px solid #0C769E !important;
}

.cell-B14,
.cell-E14,
.cell-H14 {
  border-right: 1px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
}

.cell-B14 {
  border-right: 2px solid #0C769E !important;
  border-bottom: 2px solid #0C769E !important;
}

.cell-E14 {
  border-bottom: 2px solid #0C769E !important;
}

.cell-H14 {
  border-bottom: 2px solid #0C769E !important;
}

.cell-H14 {
  border-right: 2px solid #0C769E !important;
}

.cell-L14 {
  background: #B5E6A2 !important;
  color: #000000 !important;
  border-right: 1px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
}

.cell-N14,
.cell-O14 {
  background: #B5E6A2 !important;
  color: #000000 !important;
  border-right: 1px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
}

.cell-B15,
.cell-E15,
.cell-H15,
.cell-N15,
.cell-O15 {
  border-right: 1px solid #0C769E !important;
  border-bottom: 1px solid #0C769E !important;
  font-weight: 700 !important;
}

.cell-B15 {
  border-right: 2px solid #0C769E !important;
}

.cell-H15 {
  border-right: 2px solid #0C769E !important;
}

/* Borde grueso entre Sec/INDIGO y Variable */
.cell-B16 {
  border-right: 1.5px solid #0C769E !important;
}

.cell-C16,
.cell-C17,
.cell-C18,
.cell-C19 {
  border-left: 1.5px solid #0C769E !important;
}

/* Borde grueso izquierdo en Sob./Fal. Mes */
.cell-P16,
.cell-P17,
.cell-P18,
.cell-P19 {
  border-left: 1.5px solid #0C769E !important;
}


/* Borde grueso entre TECELAGEM y Variable */
.cell-C20,
.cell-C21,
.cell-C22,
.cell-C23,
.cell-C24 {
  border-left: 1.5px solid #0C769E !important;
}

/* Borde grueso izquierdo en Sob./Fal. Mes (TECELAGEM) */
.cell-P20,
.cell-P21,
.cell-P22,
.cell-P23,
.cell-P24 {
  border-left: 1.5px solid #0C769E !important;
}

/* Evitar quiebre de línea en celdas Variable de TECELAGEM */
.cell-C21,
.cell-C22,
.cell-C23,
.cell-C24 {
  white-space: nowrap !important;
}
</style>
