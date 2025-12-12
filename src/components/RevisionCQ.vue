<template>
  <div class="w-full h-screen flex flex-col p-1" @keydown="handleKeydown" tabindex="0" ref="containerRef">
    <main class="w-full bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col overflow-y-auto">
      <!-- Filtros en línea sin contenedor adicional -->
      <div class="flex items-center justify-between gap-4 mb-3">
      <div class="flex items-center gap-4">
        <div class="filter-inline fecha-nav">
          <label class="sr-only">Fecha:</label>
          <div class="fecha-controls">
            <div class="custom-datepicker" ref="datepickerRef">
              <input 
                type="text" 
                v-model="displayDate" 
                class="filter-input datepicker-input"
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
                      :value="currentMonth.getMonth()" 
                      @change="updateMonth" 
                      @click.stop
                      class="calendar-select"
                    >
                      <option v-for="(month, index) in monthNames" :key="index" :value="index">
                        {{ month }}
                      </option>
                    </select>
                    <select 
                      :value="currentMonth.getFullYear()" 
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
                v-tippy="'Día anterior (←)'"
                :disabled="loading"
              >&lt;</button>
              <button 
                class="inline-flex items-center justify-center px-2 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm" 
                @click="cambiarFecha(1)" 
                @mousedown.prevent
                tabindex="-1"
                v-tippy="'Día siguiente (→)'"
                :disabled="loading"
              >&gt;</button>
            </div>
          </div>
          <span class="hint-text">Usa ← →</span>
        </div>

        <div class="filter-inline">
          <label class="filter-label">Trama:</label>
          <select aria-label="Tramas" v-model="filters.tramas" class="filter-input" @change="loadData">
            <option value="Todas">Todas</option>
            <option value="ALG 100%">ALG 100%</option>
            <option value="P + E">P + E</option>
            <option value="POL 100%">POL 100%</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-2xl">📋</span>
        <span class="text-sm text-slate-600">Informe detallado de revisión de calidad</span>
      </div>
      </div>

    <!-- Layout de dos tablas lado a lado -->
    <div class="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-4">
      <!-- Tabla Izquierda: Resumen por Revisor -->
      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold text-slate-700">{{ calidadData.length }} revisores</span>
        <div class="overflow-auto w-full rounded-xl border border-slate-200 max-h-[500px]">
          <table class="min-w-full w-full table-auto divide-y divide-slate-200 text-xs tabla-resumen">
            <thead class="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-20">
              <tr>
                <th class="col-revisor px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Revisor</th>
                <th class="col-metros px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Metros Día</th>
                <th class="col-calidad px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Calidad %</th>
                <th class="col-pts px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Pts 100 m²</th>
                <th class="col-rollos px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Rollos 1era</th>
                <th class="col-sin-pts-un px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Sin Pts [un]</th>
                <th class="col-sin-pts-perc px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Sin Pts [%]</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="row in calidadData" 
                :key="row.Revisor"
                @click="selectRevisor(row)"
                :class="{ 'selected-row': selectedRevisor?.Revisor === row.Revisor }"
                class="border-t border-slate-100 hover:bg-blue-50/30 transition-colors duration-150 cursor-pointer"
              >
                <td class="col-revisor px-2 py-[0.3rem] text-center font-medium text-slate-700">{{ row.Revisor }}</td>
                <td class="col-metros px-2 py-[0.3rem] text-center font-bold text-slate-700">{{ formatInteger(row.Mts_Total) }}</td>
                <td class="col-calidad px-2 py-[0.3rem] text-center text-slate-700">{{ formatNumber(row.Calidad_Perc) }}</td>
                <td class="col-pts px-2 py-[0.3rem] text-center text-slate-700">{{ formatNumber(row.Pts_100m2) }}</td>
                <td class="col-rollos px-2 py-[0.3rem] text-center text-slate-700">{{ row.Rollos_1era }}</td>
                <td class="col-sin-pts-un px-2 py-[0.3rem] text-center text-slate-700">{{ row.Rollos_Sin_Pts }}</td>
                <td class="col-sin-pts-perc px-2 py-[0.3rem] text-center text-slate-700">{{ formatNumber(row.Perc_Sin_Pts) }}</td>
              </tr>
              <!-- Fila de Totales -->
              <tr v-if="calidadData.length > 0" class="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td class="col-revisor px-2 py-[0.3rem] text-center text-slate-800">Total</td>
                <td class="col-metros px-2 py-[0.3rem] text-center text-slate-800">{{ formatInteger(totals.Mts_Total) }}</td>
                <td class="col-calidad px-2 py-[0.3rem] text-center text-slate-800">{{ formatNumber(totals.Calidad_Perc) }}</td>
                <td class="col-pts px-2 py-[0.3rem] text-center text-slate-800">{{ formatNumber(totals.Pts_100m2) }}</td>
                <td class="col-rollos px-2 py-[0.3rem] text-center text-slate-800">{{ totals.Rollos_1era }}</td>
                <td class="col-sin-pts-un px-2 py-[0.3rem] text-center text-slate-800">{{ totals.Rollos_Sin_Pts }}</td>
                <td class="col-sin-pts-perc px-2 py-[0.3rem] text-center text-slate-800">{{ formatNumber(totals.Perc_Sin_Pts) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tabla Derecha: Detalle del Revisor Seleccionado -->
      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold text-slate-700">
          {{ selectedRevisor ? `Detalle - ${selectedRevisor.Revisor}` : 'Seleccione un revisor' }}
        </span>
        <div v-if="selectedRevisor && detalleRevisor.length > 0" class="overflow-auto w-full rounded-xl border border-slate-200 max-h-[500px]">
          <table class="min-w-full w-full table-auto divide-y divide-slate-200 text-xs tabla-detalle">
            <thead class="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-20">
              <tr>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Hora</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Nombre Artículo</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Partidas</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Metros Revisados</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Cal. %</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Pts 100m²</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Total [un]</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Sin Pts [un]</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Sin Pts [%]</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Telar</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Efic. %</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">RU 105</th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">RT 105</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(detalle, index) in detalleRevisor" :key="index" 
                  @click="selectPartida(detalle)"
                  :class="{ 'bg-blue-100': selectedPartida?.Partidas === detalle.Partidas }"
                  class="border-t border-slate-100 hover:bg-blue-50/30 transition-colors duration-150 cursor-pointer">
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ formatHora(detalle.HoraInicio) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ detalle.NombreArticulo }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ formatPartida(detalle.Partidas) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ formatInteger(detalle.MetrosRevisados) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ formatNumber(detalle.CalidadPct) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ formatNumber(detalle.Pts100m2) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ detalle.TotalRollos }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ detalle.SinPuntos }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ formatNumber(detalle.SinPuntosPct) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ detalle.Telar }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ formatNumber(detalle.EficienciaPct) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ formatNumber(detalle.RU105) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ formatNumber(detalle.RT105) }}</td>
              </tr>
              <!-- Fila Total del Detalle -->
              <tr v-if="detalleRevisor.length > 0" class="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td class="px-2 py-[0.3rem]"></td>
                <td colspan="2" class="px-2 py-[0.3rem] text-center text-slate-800">Total</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-800">{{ formatInteger(totalesDetalle.MetrosRevisados) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-800">{{ formatNumber(totalesDetalle.CalidadPct) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-800">{{ formatNumber(totalesDetalle.Pts100m2) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-800">{{ totalesDetalle.TotalRollos }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-800">{{ totalesDetalle.SinPuntos }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-800">{{ formatNumber(totalesDetalle.SinPuntosPct) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-800">{{ totalesDetalle.Telar }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-800">{{ formatNumber(totalesDetalle.EficienciaPct) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-800">{{ formatNumber(totalesDetalle.RU105) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-800">{{ formatNumber(totalesDetalle.RT105) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state-detail">
          <p>👆 Haz clic en un revisor para ver el detalle de su producción</p>
        </div>
      </div>
    </div>

    <!-- Tabla 3: Detalle de Partida -->
    <div v-if="selectedPartida && detallePartida.length > 0" class="mt-4 flex flex-col gap-2">
      <div class="text-sm text-slate-700">
        <span class="text-slate-600">Detalle de Partida:</span>
        <span class="ml-1 font-bold text-slate-900 text-base">{{ formatPartida(selectedPartida.Partidas) }}</span>
        <span class="mx-2 text-slate-600">-</span>
        <span class="text-slate-600">Artículo:</span>
        <span class="ml-1 font-bold text-slate-900 text-base">{{ detallePartida[0]?.ARTIGO?.substring(0, 10) || 'N/A' }}</span>
        <span class="mx-2 text-slate-600">-</span>
        <span class="text-slate-600">Color:</span>
        <span class="ml-1 font-bold text-slate-900 text-base">{{ detallePartida[0]?.COR || 'N/A' }}</span>
        <span class="mx-2 text-slate-600">-</span>
        <span class="text-slate-600">Nombre:</span>
        <span class="ml-1 font-bold text-slate-900 text-base">{{ detallePartida[0]?.NM_MERC || selectedPartida.NombreArticulo }}</span>
        <span class="mx-2 text-slate-600">-</span>
        <span class="text-slate-600">Trama:</span>
        <span class="ml-1 font-bold text-slate-900 text-base">{{ detallePartida[0]?.TRAMA || 'N/A' }}</span>
      </div>
      <div class="overflow-auto w-full rounded-xl border border-slate-200 max-h-[400px]">
        <table class="min-w-full w-full table-auto divide-y divide-slate-200 text-xs">
          <thead class="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-20">
            <tr>
              <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Grupo</th>
              <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Código</th>
              <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Defecto</th>
              <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Metraje</th>
              <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Calidad</th>
              <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Hora</th>
              <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Emendas</th>
              <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Pieza</th>
              <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Etiqueta</th>
              <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Ancho</th>
              <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Puntuación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in detallePartida" :key="index" class="border-t border-slate-100 hover:bg-blue-50/30 transition-colors duration-150">
              <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ row.GRP_DEF }}</td>
              <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ row.COD_DE }}</td>
              <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ row.DEFEITO }}</td>
              <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ row.METRAGEM }}</td>
              <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ row.QUALIDADE }}</td>
              <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ formatHora(row.HORA) }}</td>
              <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ row.EMENDAS }}</td>
              <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ formatPieza(row.PEÇA) }}</td>
              <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ row.ETIQUETA }}</td>
              <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ row.LARGURA }}</td>
              <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ row.PONTUACAO }}</td>
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
    </main>
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

// Variables para la segunda tabla (detalle)
const selectedRevisor = ref(null)
const detalleRevisor = ref([])

// Variables para la tercera tabla (detalle de partida)
const selectedPartida = ref(null)
const detallePartida = ref([])

// Totales del detalle
const totalesDetalle = computed(() => {
  if (detalleRevisor.value.length === 0) {
    return {
      MetrosRevisados: 0,
      CalidadPct: 0,
      Pts100m2: 0,
      TotalRollos: 0,
      SinPuntos: 0,
      SinPuntosPct: 0,
      Telar: 0,
      EficienciaPct: 0,
      RU105: 0,
      RT105: 0
    }
  }
  
  const totalMetros = detalleRevisor.value.reduce((sum, d) => sum + d.MetrosRevisados, 0)
  const totalRollos = detalleRevisor.value.reduce((sum, d) => sum + d.TotalRollos, 0)
  const totalSinPuntos = detalleRevisor.value.reduce((sum, d) => sum + d.SinPuntos, 0)
  
  // Contar telares únicos (no sumar)
  const telaresUnicos = new Set(detalleRevisor.value.map(d => d.Telar).filter(t => t > 0))
  const totalTelar = telaresUnicos.size
  
  // Promedios ponderados
  const calidadPonderada = detalleRevisor.value.reduce((sum, d) => sum + (d.CalidadPct * d.MetrosRevisados), 0) / totalMetros
  const ptsPonderado = detalleRevisor.value.reduce((sum, d) => sum + (d.Pts100m2 * d.MetrosRevisados), 0) / totalMetros
  const eficienciaPonderada = detalleRevisor.value.reduce((sum, d) => sum + (d.EficienciaPct * d.MetrosRevisados), 0) / totalMetros
  const ru105Ponderado = detalleRevisor.value.reduce((sum, d) => sum + (d.RU105 * d.MetrosRevisados), 0) / totalMetros
  const rt105Ponderado = detalleRevisor.value.reduce((sum, d) => sum + (d.RT105 * d.MetrosRevisados), 0) / totalMetros
  
  return {
    MetrosRevisados: totalMetros,
    CalidadPct: calidadPonderada,
    Pts100m2: ptsPonderado,
    TotalRollos: totalRollos,
    SinPuntos: totalSinPuntos,
    SinPuntosPct: totalRollos > 0 ? (totalSinPuntos / totalRollos) * 100 : 0,
    Telar: totalTelar,
    EficienciaPct: eficienciaPonderada,
    RU105: ru105Ponderado,
    RT105: rt105Ponderado
  }
})

const filters = ref({
  fecha: '',
  tramas: 'Todas'
})

// Estado del datepicker
const showCalendar = ref(false)
const calendarMonth = ref(new Date().getMonth())
const calendarYear = ref(new Date().getFullYear())
const datepickerRef = ref(null)

const displayDate = computed(() => {
  if (!filters.value.fecha) return ''
  const [year, month, day] = filters.value.fecha.split('-').map(Number)
  const fecha = new Date(year, month - 1, day)
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const dia = dias[fecha.getDay()]
  const diaNum = fecha.getDate().toString().padStart(2, '0')
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const anio = fecha.getFullYear()
  return `${dia} ${diaNum}/${mes}/${anio}`
})

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

const currentMonth = computed(() => {
  return new Date(calendarYear.value, calendarMonth.value)
})

function updateMonth(event) {
  calendarMonth.value = parseInt(event.target.value)
}

function updateYear(event) {
  calendarYear.value = parseInt(event.target.value)
}

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(calendarYear.value, calendarMonth.value, 1)
  const lastDay = new Date(calendarYear.value, calendarMonth.value + 1, 0)
  const prevLastDay = new Date(calendarYear.value, calendarMonth.value, 0)
  
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const prevDaysInMonth = prevLastDay.getDate()
  
  // Días del mes anterior
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: prevDaysInMonth - i,
      otherMonth: true,
      key: `prev-${prevDaysInMonth - i}`
    })
  }
  
  // Días del mes actual
  const today = new Date()
  const selectedDate = filters.value.fecha ? new Date(filters.value.fecha + 'T00:00:00') : null
  
  for (let i = 1; i <= daysInMonth; i++) {
    const currentDate = new Date(calendarYear.value, calendarMonth.value, i)
    days.push({
      day: i,
      otherMonth: false,
      selected: selectedDate && 
                selectedDate.getDate() === i && 
                selectedDate.getMonth() === calendarMonth.value && 
                selectedDate.getFullYear() === calendarYear.value,
      today: today.getDate() === i && 
             today.getMonth() === calendarMonth.value && 
             today.getFullYear() === calendarYear.value,
      key: `current-${i}`,
      date: currentDate
    })
  }
  
  // Días del mes siguiente para completar la grilla
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
  if (showCalendar.value && filters.value.fecha) {
    const [year, month] = filters.value.fecha.split('-').map(Number)
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
  filters.value.fecha = `${y}-${m}-${d}`
  
  showCalendar.value = false
  loadData()
}

function handleBlur(event) {
  // Cerrar calendario si se hace clic fuera
  setTimeout(() => {
    if (!datepickerRef.value?.contains(document.activeElement)) {
      showCalendar.value = false
    }
  }, 200)
}

const formattedFecha = computed(() => {
  if (!filters.value.fecha) return ''
  // Parsear fecha en zona horaria local (evita problema UTC)
  const [year, month, day] = filters.value.fecha.split('-').map(Number)
  const fecha = new Date(year, month - 1, day)
  const dias = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
  const dia = dias[fecha.getDay()]
  const diaNum = fecha.getDate().toString().padStart(2, '0')
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const anio = fecha.getFullYear()
  return `${dia} ${diaNum}/${mes}/${anio}`
})

const containerRef = ref(null)

const loading = computed(() => db.loading.value)
const error = computed(() => db.error.value)

const canGenerateReport = computed(() => {
  return filters.value.fecha
})

// Cambiar fecha por días (-1 = ayer, +1 = mañana)
function cambiarFecha(dias) {
  if (!filters.value.fecha) return
  // Parsear fecha en zona horaria local (evita problema UTC)
  const [year, month, day] = filters.value.fecha.split('-').map(Number)
  const fecha = new Date(year, month - 1, day)
  fecha.setDate(fecha.getDate() + dias)
  // Formatear como YYYY-MM-DD en zona local
  const y = fecha.getFullYear()
  const m = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const d = fecha.getDate().toString().padStart(2, '0')
  filters.value.fecha = `${y}-${m}-${d}`
  loadData()
}

// Manejar teclas de flecha
function handleKeydown(event) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    cambiarFecha(-1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    cambiarFecha(1)
  }
}

onMounted(async () => {
  // Pre-seleccionar el día de ayer (en zona horaria local)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const y = yesterday.getFullYear()
  const m = (yesterday.getMonth() + 1).toString().padStart(2, '0')
  const d = yesterday.getDate().toString().padStart(2, '0')
  const yesterdayStr = `${y}-${m}-${d}`
  
  filters.value.fecha = yesterdayStr
  
  // Enfocar el contenedor para capturar teclas
  if (containerRef.value) {
    containerRef.value.focus()
  }
  
  loadData()
})

function onDateChange() {
  // Cargar datos automáticamente si la fecha está seleccionada
  if (canGenerateReport.value) {
    loadData()
  }
}

async function loadData() {
  if (!canGenerateReport.value) return
  
  // Limpiar selecciones al cambiar fecha
  selectedRevisor.value = null
  detalleRevisor.value = []
  selectedPartida.value = null
  detallePartida.value = []
  
  try {
    const params = {
      startDate: filters.value.fecha,
      endDate: filters.value.fecha,
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

function applyFilters() {
  loadData()
}

// Función para seleccionar un revisor y cargar su detalle
async function selectRevisor(revisor) {
  selectedRevisor.value = revisor
  // Limpiar selección de partida al cambiar revisor
  selectedPartida.value = null
  detallePartida.value = []
  
  try {
    const params = {
      startDate: filters.value.fecha,
      endDate: filters.value.fecha,
      revisor: revisor.Revisor,
      tramas: filters.value.tramas
    }
    
    const result = await db.getRevisorDetalle(params)
    detalleRevisor.value = result || []
  } catch (err) {
    console.error('Error cargando detalle del revisor:', err)
    detalleRevisor.value = []
  }
}

// Función para seleccionar una partida y cargar su detalle
async function selectPartida(detalle) {
  selectedPartida.value = detalle
  
  try {
    const params = {
      fecha: filters.value.fecha,
      partida: detalle.PARTIDA || detalle.Partidas,
      revisor: selectedRevisor.value.Revisor
    }
    
    console.log('📦 Solicitando detalle de partida:', JSON.stringify(params, null, 2))
    const result = await db.getPartidaDetalle(params)
    console.log('📊 Respuesta del servidor:', result)
    console.log('📊 Número de registros:', result?.length || 0)
    detallePartida.value = result || []
  } catch (err) {
    console.error('Error cargando detalle de la partida:', err)
    detallePartida.value = []
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

function formatNumber(num) {
  if (num === null || num === undefined) return '-'
  const n = Number(num)
  if (Number.isNaN(n)) return '-'
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)
}

function formatInteger(num) {
  if (num === null || num === undefined) return '-'
  const n = Number(num)
  if (Number.isNaN(n)) return '-'
  // Separador de miles manual para garantizar formato #.### en >= 1.000
  const intStr = Math.round(n).toString()
  const parts = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return n < 0 ? `-${parts.replace('-', '')}` : parts
}

// Formatea hora de "0650" a "06:50"
function formatHora(hora) {
  if (!hora) return '-'
  const str = hora.toString().padStart(4, '0')
  return str.slice(0, 2) + ':' + str.slice(2, 4)
}

// Formatea partida de "0540919" a "0-5409.19" (formato #-####.##)
function formatPartida(partida) {
  if (!partida) return '-'
  const str = partida.toString().padStart(7, '0')
  return str.slice(0, 1) + '-' + str.slice(1, 5) + '.' + str.slice(5, 7)
}

// Formatea pieza de "0542207001" a "0542207 001" (separa últimos 3 dígitos)
function formatPieza(pieza) {
  if (!pieza) return '-'
  const str = pieza.toString()
  if (str.length < 3) return str
  return str.slice(0, -3) + ' ' + str.slice(-3)
}
</script>

<style scoped>
.calidad-container {
  max-width: 100%;
  margin: 6px;
  padding: 10px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  min-height: calc(100vh - 12px);
  outline: none;
}

.header {
  background: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 16px;
}

.header--with-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right .title {
  margin: 0;
}

.header-right .subtitle {
  margin: 0;
  white-space: nowrap;
}

.header-icons {
  font-size: 18px;
  opacity: 0.95;
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

.filter-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

.filter-label {
  font-weight: 600;
  margin-right: 6px;
  color: #374151;
}

.filters-grid {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group.fecha-nav {
  min-width: 280px;
}

.fecha-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.custom-datepicker {
  position: relative;
  display: inline-block;
}

.datepicker-input {
  padding: 8px 40px 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 220px;
  cursor: pointer;
  background: white;
  transition: border-color 0.2s;
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
  font-size: 18px;
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

.date-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.date-overlay {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #1f2937;
  font-size: 13px;
  pointer-events: none;
  user-select: none;
  text-transform: lowercase;
}

.nav-btn-group {
  display: flex;
  gap: 6px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 18px;
  font-weight: bold;
  color: #0078d4;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover:not(:disabled) {
  background: #0078d4;
  color: white;
  border-color: #0078d4;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint-text {
  font-size: 11px;
  color: #888;
  font-style: italic;
}

.filter-group label {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.filter-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.filter-input:focus {
  outline: none;
  border-color: #0078d4;
}

.filter-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

.filter-input option.year-header {
  font-weight: bold;
  color: #0078d4;
  background: #f0f8ff;
}

.filter-input option.month-header {
  font-weight: 600;
  color: #005a9e;
  background: #f8f9fa;
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

.btn-primary:hover:not(:disabled) {
  background: #005a9e;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
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
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.table-header {
  padding: 8px 10px;
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
  width: auto;
  border-collapse: collapse;
  table-layout: fixed;
}

.tabla-resumen {
  width: 100%;
  table-layout: fixed;
}

.col-revisor {
  width: 72px; /* 20% narrower than before (90px -> 72px) */
  min-width: 72px;
  padding-left: 6px; /* evita que quede pegado al borde */
}

.col-metros {
  width: 50px;
  min-width: 50px;
}

.col-calidad {
  width: 45px;
  min-width: 45px;
}

.col-pts {
  width: 40px;
  min-width: 40px;
}

.col-rollos {
  width: 40px;
  min-width: 40px;
}

.col-sin-pts-un {
  width: 38px;
  min-width: 38px;
}

.col-sin-pts-perc {
  width: 38px;
  min-width: 38px;
}

.data-table th {
  background: #f8f9fa;
  padding: 6px 4px;
  text-align: center;
  font-weight: 600;
  color: #333;
  font-size: 11px;
  letter-spacing: 0.2px;
  border-bottom: 2px solid #dee2e6;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.1;
  font-family: 'Ubuntu', 'Noto Sans', 'Roboto', 'Open Sans', 'Source Sans 3', sans-serif;
}

.data-table td {
  padding: 6px 4px;
  border-bottom: 1px solid #dee2e6;
  color: #666;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Ubuntu', 'Noto Sans', 'Roboto', 'Open Sans', 'Source Sans 3', sans-serif;
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

/* Layout de dos tablas lado a lado */
.tables-layout-wrapper {
  display: grid;
  grid-template-columns: 450px 1fr;
  gap: 16px;
  margin-top: 24px;
  align-items: start;
}

.table-left,
.table-right {
  min-height: 400px;
}

.table-left {
  max-width: 450px;
}

.table-right {
  overflow-x: auto;
}

.clickable-row {
  cursor: pointer;
  transition: background 0.15s;
}

.clickable-row:hover {
  background: #f0f7ff !important;
}

.selected-row {
  background: #e3f2fd !important;
  font-weight: 600;
}

.selected-row:hover {
  background: #e3f2fd !important;
}

.empty-state-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #999;
  font-size: 14px;
  font-style: italic;
  min-height: 300px;
}

.tabla-detalle {
  font-size: 11px;
  width: 100%;
  table-layout: auto;
}

.tabla-detalle th,
.tabla-detalle td {
  padding: 6px 4px;
  white-space: nowrap;
  font-size: 11px;
}

.tabla-detalle th:first-child,
.tabla-detalle td:first-child {
  min-width: 90px;
  max-width: 120px;
  white-space: normal;
  word-wrap: break-word;
}

.tabla-detalle th:nth-child(2),
.tabla-detalle td:nth-child(2) {
  min-width: 70px;
  font-size: 10px;
}

@media (max-width: 1200px) {
  .tables-layout-wrapper {
    grid-template-columns: 1fr;
  }
  
  .table-left {
    max-width: 100%;
  }
  
  .table-right {
    margin-top: 20px;
  }
}

/* Estilos para datepicker */
.date-input {
  cursor: pointer;
  font-family: 'Segoe UI', 'Ubuntu', 'Noto Sans', 'Roboto', sans-serif;
  font-size: 13px;
  height: 40px;
  min-width: 190px;
  padding: 0 38px 0 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);
  color: #1f2937;
  border: 1px solid #cfd6e4;
  border-radius: 6px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' stroke='%2362778b' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3.5' y='5.5' width='13' height='11' rx='1.5'/%3E%3Cpath d='M7 3.5v3M13 3.5v3M3.5 9h13'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 18px;
}

.date-input.date-has-value {
  color: transparent;
  caret-color: transparent;
}

.date-input.date-has-value::-webkit-datetime-edit {
  color: transparent;
}

.date-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  background: transparent;
  font-size: 18px;
  padding: 5px;
  margin-left: 6px;
  opacity: 0.75;
  transition: opacity 0.2s;
}

.date-input::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
  background-color: rgba(74, 144, 226, 0.1);
  border-radius: 4px;
}

.date-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f5f5f5;
}

.date-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
}

/* Estilos para tooltips de Tippy */
:deep(.tippy-box) {
  font-size: 0.625rem;
  background-color: #1f2937;
  color: white;
}

:deep(.tippy-content) {
  padding: 0.125rem 0.375rem;
}

:deep(.tippy-arrow) {
  color: #1f2937;
}
</style>
