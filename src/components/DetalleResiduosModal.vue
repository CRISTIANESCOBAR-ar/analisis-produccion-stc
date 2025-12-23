<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="cerrar">
      <div class="modal-container bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="modal-header px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center gap-4">
            <img src="/LogoSantana.jpg" alt="Santana Textiles" class="h-8 w-auto object-contain" />
            <h2 class="text-xl font-bold text-slate-800">Detalle de Residuos</h2>
            <div class="flex items-center gap-2">
              <button 
                class="inline-flex items-center justify-center w-8 h-8 border border-slate-200 bg-white text-slate-700 rounded-md hover:bg-slate-50 transition-colors" 
                @click="cambiarFecha(-1)"
                v-tippy="{ content: 'Día anterior', placement: 'bottom' }"
              >&lt;</button>
              <input 
                type="text" 
                :value="displayDate" 
                class="w-28 px-3 py-1.5 border border-slate-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white"
                @click="mostrarDatepicker = !mostrarDatepicker"
                readonly
              />
              <button 
                class="inline-flex items-center justify-center w-8 h-8 border border-slate-200 bg-white text-slate-700 rounded-md hover:bg-slate-50 transition-colors" 
                @click="cambiarFecha(1)"
                v-tippy="{ content: 'Día siguiente', placement: 'bottom' }"
              >&gt;</button>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button
              @click="exportarComoImagen"
              class="inline-flex items-center gap-2 px-4 py-0 h-[34px] bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm"
              v-tippy="{ content: 'Copiar tabla al portapapeles (WhatsApp o correo)', placement: 'bottom' }"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01C17.18 3.03 14.69 2 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.188 8.188 0 0 1-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.27-.25-.14-1.47-.74-1.69-.82-.23-.08-.37-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.07-.26-.13-1.06-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.39.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43-.14 0-.3-.01-.47-.01z"/>
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v.18l7.12 4.45a1 1 0 0 0 1.05 0L20 7.18V7H4zm16 10v-8.4l-6.38 3.99a3 3 0 0 1-3.24 0L4 8.6V17h16z"/>
              </svg>
              Exportar
            </button>
            <button 
              class="text-slate-400 hover:text-slate-600 transition-colors" 
              @click="cerrar"
              v-tippy="{ content: 'Cerrar (Esc)', placement: 'bottom' }"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Datepicker flotante -->
        <div v-if="mostrarDatepicker" class="absolute top-20 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-50">
          <div class="calendar-header flex justify-between items-center mb-3">
            <button class="w-8 h-8 flex items-center justify-center border border-slate-200 rounded bg-white text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" @click.stop="cambiarMesCalendario(-1)">&lt;</button>
            <div class="calendar-selects flex gap-1">
              <select 
                :value="mesCalendario" 
                @change="mesCalendario = parseInt($event.target.value)" 
                @click.stop
                class="text-sm font-semibold text-slate-700 bg-transparent border-none cursor-pointer hover:bg-slate-100 rounded px-1"
              >
                <option v-for="(mes, index) in mesesNombres" :key="index" :value="index">{{ mes }}</option>
              </select>
              <select 
                :value="anioCalendario" 
                @change="anioCalendario = parseInt($event.target.value)" 
                @click.stop
                class="text-sm font-semibold text-slate-700 bg-transparent border-none cursor-pointer hover:bg-slate-100 rounded px-1"
              >
                <option v-for="anio in aniosDisponibles" :key="anio" :value="anio">{{ anio }}</option>
              </select>
            </div>
            <button class="w-8 h-8 flex items-center justify-center border border-slate-200 rounded bg-white text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" @click.stop="cambiarMesCalendario(1)">&gt;</button>
          </div>
          <div class="grid grid-cols-7 gap-1 mb-2">
            <span v-for="dia in ['D', 'L', 'M', 'M', 'J', 'V', 'S']" :key="dia" class="text-center text-xs font-semibold text-slate-500 w-8">{{ dia }}</span>
          </div>
          <div class="grid grid-cols-7 gap-1">
            <button 
              v-for="dia in diasCalendario" 
              :key="dia.key"
              :class="['w-8 h-8 flex items-center justify-center text-sm rounded transition-colors', {
                'text-slate-300 cursor-default': dia.otroMes,
                'bg-blue-600 text-white font-semibold': dia.seleccionado,
                'bg-white text-slate-700 hover:bg-blue-50': !dia.seleccionado && !dia.otroMes
              }]"
              @click.stop="seleccionarDia(dia)"
              :disabled="dia.otroMes"
            >
              {{ dia.dia }}
            </button>
          </div>
        </div>

        <!-- Body con tabla -->
        <div class="modal-body flex-1 overflow-auto p-6">
          <div v-if="cargando" class="flex items-center justify-center py-12">
            <div class="flex flex-col items-center gap-3">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <span class="text-sm text-slate-600">Cargando datos...</span>
            </div>
          </div>

          <div v-else-if="registros.length === 0" class="flex items-center justify-center py-12">
            <div class="text-center">
              <svg class="w-16 h-16 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
              </svg>
              <p class="text-slate-500 text-sm">No hay registros para esta fecha</p>
            </div>
          </div>

          <div v-else>
            <!-- Header compacto en una sola línea -->
            <div class="flex items-center gap-4 mb-4 flex-wrap">
              <h3 class="text-sm font-bold text-slate-800">ÍNDIGO</h3>
              <!-- Checkboxes con contadores -->
              <label v-for="tipo in tiposDisponibles" :key="tipo" class="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer hover:text-blue-600 transition-colors">
                <input 
                  type="checkbox" 
                  :checked="tiposFiltros.includes(tipo)"
                  @change="toggleFiltro(tipo)"
                  class="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <span>{{ tipo }} <span class="text-slate-500">({{ contadorPorTipo[tipo] || 0 }})</span></span>
              </label>
              <!-- Total de registros filtrados -->
              <span class="text-xs text-slate-600 font-medium ml-auto">{{ registrosFiltrados.length }} registros</span>
            </div>
            <div class="border border-slate-200 rounded-lg overflow-hidden">
              <!-- Encabezado fijo -->
              <div class="bg-slate-50 border-b-2 border-slate-300 overflow-hidden">
                <table class="w-full text-sm">
                  <thead class="text-xs text-slate-700">
                    <tr>
                      <th class="px-3 py-2 font-bold text-left w-[100px]">Fecha</th>
                    <th class="px-3 py-2 font-bold text-center w-[60px]">Turno</th>
                    <th class="px-3 py-2 font-bold text-left w-[140px]">Tipo</th>
                    <th class="px-3 py-2 font-bold text-right w-[80px]">ID</th>
                    <th class="px-3 py-2 font-bold text-right w-[120px]">Peso Líquido (KG)</th>
                    <th class="px-3 py-2 font-bold text-right w-[80px]">Partida</th>
                    <th class="px-3 py-2 font-bold text-right w-[80px]">Rolada</th>
                    <th class="px-3 py-2 font-bold text-center w-[70px]">Motivo</th>
                    <th class="px-3 py-2 font-bold text-left w-[150px]">Descripción</th>
                    <th class="px-3 py-2 font-bold text-left w-[120px]">Base</th>
                    <th class="px-3 py-2 font-bold text-center w-[90px]">PE DE ROLO</th>
                    <th class="px-3 py-2 font-bold text-center w-[70px]">GAIOLA</th>
                    <th class="px-3 py-2 font-bold text-left flex-1">OBS</th>
                  </tr>
                </thead>
              </table>
            </div>
            <!-- Cuerpo con scroll -->
            <div class="overflow-auto max-h-96">
              <table ref="tablaDetalleRef" class="w-full text-sm">
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="(item, index) in registrosFiltrados" :key="index" :class="index % 2 === 0 ? 'bg-white' : 'bg-slate-50'" class="hover:bg-blue-50 transition-colors">
                    <td class="px-3 py-2 text-slate-900 whitespace-nowrap w-[100px]">{{ item.DT_MOV }}</td>
                    <td class="px-3 py-2 text-center font-semibold w-[60px]">{{ item.TURNO }}</td>
                    <td class="px-3 py-2 text-slate-700 w-[140px]">{{ item.DESCRICAO }}</td>
                    <td class="px-3 py-2 text-right font-mono text-slate-600 w-[80px]">{{ item.ID }}</td>
                    <td class="px-3 py-2 text-right font-mono font-semibold text-blue-700 w-[120px]">{{ formatNumber(item['PESO LIQUIDO (KG)']) }}</td>
                    <td class="px-3 py-2 text-right font-mono text-slate-600 w-[80px]">{{ item.PARTIDA }}</td>
                    <td class="px-3 py-2 text-right font-mono text-slate-600 w-[80px]">{{ item.ROLADA }}</td>
                    <td class="px-3 py-2 text-center text-slate-600 w-[70px]">{{ item.MOTIVO }}</td>
                    <td class="px-3 py-2 text-slate-700 text-xs w-[150px]">{{ item.DESC_MOTIVO }}</td>
                    <td class="px-3 py-2 text-slate-700 font-mono text-xs w-[120px]">{{ item.URDUME }}</td>
                    <td class="px-3 py-2 text-center text-slate-600 w-[90px]">{{ item['PE DE ROLO'] }}</td>
                    <td class="px-3 py-2 text-center text-slate-600 w-[70px]">{{ item.GAIOLA }}</td>
                    <td class="px-3 py-2 text-slate-600 text-xs">{{ item.OBS }}</td>
                  </tr>
                  <!-- Fila de totales -->
                  <tr class="bg-slate-100 border-t-2 border-slate-300">
                    <td colspan="4" class="px-3 py-2 text-right font-bold text-slate-800">TOTAL:</td>
                    <td class="px-3 py-2 text-right font-mono font-bold text-blue-800 w-[120px]">{{ formatNumber(totalPesoFiltrado) }}</td>
                    <td colspan="8"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </div>

          <!-- Separador y segunda tabla -->
          <div v-if="registrosSector.length > 0" class="mt-6 pt-6 border-t-2 border-slate-300">
            <!-- Header compacto en una sola línea -->
            <div class="flex items-center gap-4 mb-4 flex-wrap">
              <h3 class="text-sm font-bold text-slate-800">TEJEDURÍA</h3>
              <!-- Checkboxes con contadores -->
              <label v-for="tipo in tiposDisponiblesSector" :key="tipo" class="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer hover:text-blue-600 transition-colors">
                <input 
                  type="checkbox" 
                  :checked="tiposFiltrosSector.includes(tipo)"
                  @change="toggleFiltroSector(tipo)"
                  class="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <span>{{ tipo }} <span class="text-slate-500">({{ contadorPorTipoSector[tipo] || 0 }})</span></span>
              </label>
              <!-- Total de registros filtrados -->
              <span class="text-xs text-slate-600 font-medium ml-auto">{{ registrosSectorFiltrados.length }} registros</span>
            </div>
            <div class="border border-slate-200 rounded-lg overflow-hidden">
              <!-- Encabezado fijo -->
              <div class="bg-slate-50 border-b-2 border-slate-300 overflow-hidden">
                <table class="w-full text-sm">
                  <thead class="text-xs text-slate-700">
                    <tr>
                      <th class="px-3 py-2 font-bold text-left w-[100px]">Fecha</th>
                      <th class="px-3 py-2 font-bold text-center w-[60px]">Turno</th>
                      <th class="px-3 py-2 font-bold text-left w-[120px]">Sub-producto</th>
                      <th class="px-3 py-2 font-bold text-left flex-1">Descripción</th>
                      <th class="px-3 py-2 font-bold text-right w-[100px]">ID</th>
                      <th class="px-3 py-2 font-bold text-right w-[140px]">Peso Líquido (KG)</th>
                      <th class="px-3 py-2 font-bold text-left w-[150px]">OBS</th>
                    </tr>
                  </thead>
                </table>
              </div>
              <!-- Cuerpo con scroll -->
              <div class="overflow-auto max-h-64">
                <table ref="tablaSectorRef" class="w-full text-sm">
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="(item, index) in registrosSectorFiltrados" :key="index" :class="index % 2 === 0 ? 'bg-white' : 'bg-slate-50'" class="hover:bg-blue-50 transition-colors">
                      <td class="px-3 py-2 text-slate-900 whitespace-nowrap w-[100px]">{{ item.DT_MOV }}</td>
                      <td class="px-3 py-2 text-center font-semibold w-[60px]">{{ item.TURNO }}</td>
                      <td class="px-3 py-2 text-slate-700 font-mono text-xs w-[120px]">{{ item.SUBPRODUTO }}</td>
                      <td class="px-3 py-2 text-slate-700">{{ item.DESCRICAO }}</td>
                      <td class="px-3 py-2 text-right font-mono text-slate-600 w-[100px]">{{ item.ID }}</td>
                      <td class="px-3 py-2 text-right font-mono font-semibold text-blue-700 w-[140px]">{{ formatNumber(item['PESO LIQUIDO (KG)']) }}</td>
                      <td class="px-3 py-2 text-slate-600 text-xs w-[150px]">{{ item.OBS }}</td>
                    </tr>
                    <!-- Fila de totales -->
                    <tr class="bg-slate-100 border-t-2 border-slate-300">
                      <td colspan="5" class="px-3 py-2 text-right font-bold text-slate-800">TOTAL:</td>
                      <td class="px-3 py-2 text-right font-mono font-bold text-blue-800 w-[140px]">{{ formatNumber(totalPesoSectorFiltrado) }}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { domToPng } from 'modern-screenshot'
import Swal from 'sweetalert2'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  fechaInicial: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const API_BASE = 'http://localhost:3002'
const cargando = ref(false)
const registros = ref([])
const registrosSector = ref([])
const fechaActual = ref('')
const mostrarDatepicker = ref(false)
const tablaDetalleRef = ref(null)
const tablaSectorRef = ref(null)

// Filtros de tipos de residuos
const tiposFiltros = ref(['ESTOPA AZUL'])

// Filtros de tipos de sector (TEJEDURÍA) - por defecto ESTOPA AZUL TEJEDURÍA
const tiposFiltrosSector = ref(['ESTOPA AZUL TEJEDURÍA'])

// Tipos únicos de residuos disponibles
const tiposDisponibles = computed(() => {
  const tipos = new Set()
  registros.value.forEach(item => {
    if (item.DESCRICAO) tipos.add(item.DESCRICAO)
  })
  return Array.from(tipos).sort()
})

// Tipos únicos de descripciones de sector
const tiposDisponiblesSector = computed(() => {
  const tipos = new Set()
  registrosSector.value.forEach(item => {
    if (item.DESCRICAO) tipos.add(item.DESCRICAO)
  })
  return Array.from(tipos).sort()
})

// Contador de registros por tipo
const contadorPorTipo = computed(() => {
  const contadores = {}
  registros.value.forEach(item => {
    if (item.DESCRICAO) {
      contadores[item.DESCRICAO] = (contadores[item.DESCRICAO] || 0) + 1
    }
  })
  return contadores
})

// Contador de registros por descripción de sector
const contadorPorTipoSector = computed(() => {
  const contadores = {}
  registrosSector.value.forEach(item => {
    if (item.DESCRICAO) {
      contadores[item.DESCRICAO] = (contadores[item.DESCRICAO] || 0) + 1
    }
  })
  return contadores
})

// Registros filtrados
const registrosFiltrados = computed(() => {
  if (tiposFiltros.value.length === 0) return registros.value
  return registros.value.filter(item => tiposFiltros.value.includes(item.DESCRICAO))
})

// Registros de sector filtrados
const registrosSectorFiltrados = computed(() => {
  if (tiposFiltrosSector.value.length === 0) return registrosSector.value
  return registrosSector.value.filter(item => tiposFiltrosSector.value.includes(item.DESCRICAO))
})

// Total de peso de registros filtrados
const totalPesoFiltrado = computed(() => {
  return registrosFiltrados.value.reduce((sum, item) => {
    const peso = parseFloat(item['PESO LIQUIDO (KG)']) || 0
    return sum + peso
  }, 0)
})

// Total de peso de sector filtrados
const totalPesoSectorFiltrado = computed(() => {
  return registrosSectorFiltrados.value.reduce((sum, item) => {
    const peso = parseFloat(item['PESO LIQUIDO (KG)']) || 0
    return sum + peso
  }, 0)
})

const toggleFiltro = (tipo) => {
  const index = tiposFiltros.value.indexOf(tipo)
  if (index > -1) {
    tiposFiltros.value.splice(index, 1)
  } else {
    tiposFiltros.value.push(tipo)
  }
}

const toggleFiltroSector = (tipo) => {
  const index = tiposFiltrosSector.value.indexOf(tipo)
  if (index > -1) {
    tiposFiltrosSector.value.splice(index, 1)
  } else {
    tiposFiltrosSector.value.push(tipo)
  }
}

// Calendario
const mesCalendario = ref(new Date().getMonth())
const anioCalendario = ref(new Date().getFullYear())
const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const aniosDisponibles = computed(() => {
  const anioActual = new Date().getFullYear()
  const anios = []
  for (let i = 2020; i <= anioActual + 1; i++) {
    anios.push(i)
  }
  return anios
})

const displayDate = computed(() => {
  if (!fechaActual.value) return ''
  const [year, month, day] = fechaActual.value.split('-')
  return `${day}/${month}/${year}`
})

const diasCalendario = computed(() => {
  const dias = []
  const primerDia = new Date(anioCalendario.value, mesCalendario.value, 1)
  const ultimoDia = new Date(anioCalendario.value, mesCalendario.value + 1, 0)
  const ultimoDiaMesAnterior = new Date(anioCalendario.value, mesCalendario.value, 0)
  
  const inicioDiaSemana = primerDia.getDay()
  const diasEnMes = ultimoDia.getDate()
  const diasEnMesAnterior = ultimoDiaMesAnterior.getDate()
  
  // Días del mes anterior
  for (let i = inicioDiaSemana - 1; i >= 0; i--) {
    dias.push({
      dia: diasEnMesAnterior - i,
      otroMes: true,
      key: `prev-${diasEnMesAnterior - i}`
    })
  }
  
  // Días del mes actual
  const fechaSeleccionada = fechaActual.value ? new Date(fechaActual.value + 'T00:00:00') : null
  
  for (let i = 1; i <= diasEnMes; i++) {
    dias.push({
      dia: i,
      otroMes: false,
      seleccionado: fechaSeleccionada && 
                    fechaSeleccionada.getDate() === i && 
                    fechaSeleccionada.getMonth() === mesCalendario.value && 
                    fechaSeleccionada.getFullYear() === anioCalendario.value,
      key: `current-${i}`
    })
  }
  
  // Días del mes siguiente
  const diasRestantes = 42 - dias.length
  for (let i = 1; i <= diasRestantes; i++) {
    dias.push({
      dia: i,
      otroMes: true,
      key: `next-${i}`
    })
  }
  
  return dias
})

watch(() => props.show, (newVal) => {
  if (newVal && props.fechaInicial) {
    fechaActual.value = props.fechaInicial
    const [year, month] = props.fechaInicial.split('-')
    mesCalendario.value = parseInt(month) - 1
    anioCalendario.value = parseInt(year)
    cargarDatos()
  }
})

// Cerrar con Escape
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.show) {
    cerrar()
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
    mostrarDatepicker.value = false
  }
})

const cargarDatos = async () => {
  if (!fechaActual.value) return
  
  cargando.value = true
  try {
    // Convertir YYYY-MM-DD a DD/MM/YYYY
    const [year, month, day] = fechaActual.value.split('-')
    const fechaFormateada = `${day}/${month}/${year}`
    
    // Cargar ambas tablas en paralelo
    const [respIndigo, respSector] = await Promise.all([
      fetch(`${API_BASE}/api/detalle-residuos?fecha=${fechaFormateada}`),
      fetch(`${API_BASE}/api/detalle-residuos-sector?fecha=${fechaFormateada}`)
    ])
    
    if (!respIndigo.ok || !respSector.ok) throw new Error('Error al cargar datos')
    
    registros.value = await respIndigo.json()
    registrosSector.value = await respSector.json()
  } catch (error) {
    console.error('Error:', error)
    registros.value = []
    registrosSector.value = []
  } finally {
    cargando.value = false
  }
}

const cambiarFecha = (dias) => {
  if (!fechaActual.value) return
  const [year, month, day] = fechaActual.value.split('-')
  const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  fecha.setDate(fecha.getDate() + dias)
  
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  fechaActual.value = `${y}-${m}-${d}`
  
  mesCalendario.value = fecha.getMonth()
  anioCalendario.value = fecha.getFullYear()
  
  cargarDatos()
}

const cambiarMesCalendario = (offset) => {
  mesCalendario.value += offset
  if (mesCalendario.value > 11) {
    mesCalendario.value = 0
    anioCalendario.value++
  } else if (mesCalendario.value < 0) {
    mesCalendario.value = 11
    anioCalendario.value--
  }
}

const seleccionarDia = (dia) => {
  if (dia.otroMes) return
  
  const y = anioCalendario.value
  const m = String(mesCalendario.value + 1).padStart(2, '0')
  const d = String(dia.dia).padStart(2, '0')
  fechaActual.value = `${y}-${m}-${d}`
  
  mostrarDatepicker.value = false
  cargarDatos()
}

const cerrar = () => {
  emit('close')
}

const formatNumber = (num) => {
  if (!num) return ''
  const numero = typeof num === 'string' ? num.replace('.', '').replace(',', '.') : num
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(parseFloat(numero))
}

const exportarComoImagen = async () => {
  if (!tablaDetalleRef.value) return
  
  try {
    await new Promise(resolve => setTimeout(resolve, 100))

    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    const tempContainer = document.createElement('div')
    tempContainer.style.position = 'fixed'
    tempContainer.style.left = '0'
    tempContainer.style.top = '0'
    tempContainer.style.zIndex = '-1'
    tempContainer.style.opacity = '1'
    tempContainer.style.visibility = 'hidden'
    tempContainer.style.pointerEvents = 'none'
    tempContainer.style.background = '#ffffff'
    tempContainer.style.padding = '20px'
    tempContainer.style.boxSizing = 'border-box'
    tempContainer.style.overflow = 'visible'

    // Clonar header simplificado (logo + título + fecha)
    const headerDiv = document.createElement('div')
    headerDiv.style.display = 'flex'
    headerDiv.style.alignItems = 'center'
    headerDiv.style.justifyContent = 'space-between'
    headerDiv.style.marginBottom = '16px'
    headerDiv.style.width = '100%'

    const leftSide = document.createElement('div')
    leftSide.style.display = 'flex'
    leftSide.style.alignItems = 'center'
    leftSide.style.gap = '16px'

    const logo = document.createElement('img')
    logo.src = '/LogoSantana.jpg'
    logo.style.height = '32px'
    logo.style.width = 'auto'
    logo.style.marginLeft = '4px'
    leftSide.appendChild(logo)

    const titulo = document.createElement('h2')
    titulo.textContent = 'Detalle de Residuos'
    titulo.className = 'text-xl font-bold text-slate-800'
    leftSide.appendChild(titulo)

    const rightSide = document.createElement('div')
    rightSide.className = 'text-sm font-semibold text-slate-700'
    rightSide.textContent = `Fecha: ${displayDate.value}`
    rightSide.style.paddingRight = '4px'

    headerDiv.appendChild(leftSide)
    headerDiv.appendChild(rightSide)
    tempContainer.appendChild(headerDiv)

    const tableClone = tablaDetalleRef.value.cloneNode(true)
    tableClone.style.width = `${tablaDetalleRef.value.scrollWidth}px`
    tableClone.style.maxWidth = 'none'
    tableClone.style.overflow = 'visible'
    tableClone.style.borderCollapse = 'collapse'
    tempContainer.appendChild(tableClone)

    // Agregar segunda tabla si existe
    let tablaSectorClone = null
    if (tablaSectorRef.value && registrosSector.value.length > 0) {
      const separador = document.createElement('div')
      separador.style.marginTop = '24px'
      separador.style.marginBottom = '16px'
      separador.style.borderTop = '2px solid #cbd5e1'
      tempContainer.appendChild(separador)

      const titulo2 = document.createElement('h3')
      titulo2.textContent = 'Residuos por Sector'
      titulo2.style.fontSize = '0.875rem'
      titulo2.style.fontWeight = 'bold'
      titulo2.style.color = '#1e293b'
      titulo2.style.marginBottom = '12px'
      tempContainer.appendChild(titulo2)

      tablaSectorClone = tablaSectorRef.value.cloneNode(true)
      tablaSectorClone.style.width = `${tablaSectorRef.value.scrollWidth}px`
      tablaSectorClone.style.maxWidth = 'none'
      tablaSectorClone.style.overflow = 'visible'
      tablaSectorClone.style.borderCollapse = 'collapse'
      tempContainer.appendChild(tablaSectorClone)

      const stickySectorNodes = Array.from(tablaSectorClone.querySelectorAll('.sticky'))
      stickySectorNodes.forEach(node => {
        node.classList.remove('sticky', 'top-0', 'z-10')
        node.style.position = 'static'
        node.style.top = 'auto'
        node.style.zIndex = 'auto'
      })
    }

    const stickyNodes = Array.from(tableClone.querySelectorAll('.sticky'))
    stickyNodes.forEach(node => {
      node.classList.remove('sticky', 'top-0', 'z-10')
      node.style.position = 'static'
      node.style.top = 'auto'
      node.style.zIndex = 'auto'
    })

    document.body.appendChild(tempContainer)

    const images = Array.from(tempContainer.querySelectorAll('img'))
    await Promise.all(
      images.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve()
        return new Promise(resolve => {
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
        })
      })
    )

    const paddingX = 20 * 2
    const paddingY = 20 * 2
    const contentWidth = Math.max(
      headerDiv.scrollWidth, 
      tableClone.scrollWidth,
      tablaSectorClone ? tablaSectorClone.scrollWidth : 0
    )
    
    let contentHeight = headerDiv.scrollHeight + tableClone.scrollHeight + 16
    if (tablaSectorClone) {
      contentHeight += 24 + 2 + 16 + tablaSectorClone.scrollHeight // separador + título + margin + tabla
    }

    headerDiv.style.width = `${contentWidth}px`
    tempContainer.style.width = `${contentWidth + paddingX + 40}px`
    tempContainer.style.height = `${contentHeight + paddingY}px`

    tempContainer.getBoundingClientRect()
    tempContainer.style.visibility = 'visible'
    await new Promise(requestAnimationFrame)

    let dataUrl
    try {
      dataUrl = await domToPng(tempContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: contentWidth + paddingX + 40,
        height: contentHeight + paddingY
      })
    } finally {
      if (tempContainer.isConnected) {
        document.body.removeChild(tempContainer)
      }
    }
    
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Imagen copiada al portapapeles',
        text: 'Presiona Ctrl+V para pegar en WhatsApp o correo',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      })
    } catch (clipboardError) {
      console.warn('No se pudo copiar al portapapeles, descargando archivo:', clipboardError)
      
      const nombreArchivo = `Detalle_Residuos_${displayDate.value.replace(/\//g, '-')}.png`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nombreArchivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Imagen descargada',
        text: 'Guardada en tu carpeta de Descargas',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      })
    }
  } catch (error) {
    console.error('Error al exportar:', error)
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'Error al exportar',
      text: error.message,
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true
    })
  }
}
</script>

<style scoped>
.modal-overlay {
  animation: fadeIn 0.2s ease-out;
}

.modal-container {
  animation: slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
