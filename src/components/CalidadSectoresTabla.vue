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
          </div>
          <button
            class="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
            :disabled="loading"
            @click="loadData"
          >
            {{ loading ? '⟳' : '↻' }}
          </button>
        </div>
      </div>

      <!-- Tabla fija estilo Excel -->
      <div class="quality-card flex-1 min-h-0 shadow border border-slate-200 rounded overflow-hidden flex flex-col relative">
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
              :class="[`cell-${cell.id}`, cell.colorClass]"
              :style="{ ...gridPlacement(cell), ...(cell.color && { color: cell.color }) }"
            >
              {{ cell.text }}
            </div>
          </div>
        </div>
        <div v-if="fetchError" class="px-2 py-1 text-xs text-amber-700 bg-amber-50 border-t border-amber-200">
          ⚠️ {{ fetchError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const API_URL = 'http://localhost:3002/api'

// Setear fecha a ayer por defecto
const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)
const defaultDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

const selectedDate = ref(defaultDate)
const rows = ref([])
const loading = ref(false)
const fetchError = ref('')

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

onMounted(() => {
  loadData(true)
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
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
  { id: 'L14', rowIndex: 10, colIndex: 11, colSpan: 2, rowSpan: 2, text: 'Pts 100²' },
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
  { id: 'N15', rowIndex: 11, colIndex: 13, colSpan: 2, rowSpan: 1, text: fmtPct(pts100m2.value.day) },
  { id: 'O15', rowIndex: 11, colIndex: 15, colSpan: 2, rowSpan: 1, text: fmtPct(pts100m2.value.month) }
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

const formattedDate = computed(() => formatDate(selectedDate.value))

function gridPlacement(cell) {
  const rowSpan = cell.rowSpan || 1
  const colSpan = cell.colSpan || 1
  return {
    gridRow: `${cell.rowIndex} / span ${rowSpan}`,
    gridColumn: `${cell.colIndex} / span ${colSpan}`
  }
}

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
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
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
    32px 32px 31px 31px 31px 31px 31px 31px 33px 31px 33px;
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
</style>
