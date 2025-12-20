<template>
  <div class="w-full h-screen flex flex-col p-1">
    <main class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col">
      <div class="flex items-center justify-between gap-4 flex-shrink-0 mb-4">
        <h3 class="text-lg font-semibold text-slate-800">Residuos de INDIGO y TEJEDURIA</h3>
        
        <div class="flex items-center gap-4">
          <CustomDatepicker 
            v-model="fechaSeleccionada" 
            label="Fecha:" 
            :show-buttons="true"
            @change="cargarDatos" 
          />
        </div>
      </div>

      <div class="flex-1 overflow-auto min-h-0 border border-slate-200 rounded-lg relative">
        <div v-if="cargando" class="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <div class="flex flex-col items-center">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
            <span class="text-sm text-slate-500 font-medium">Cargando datos...</span>
          </div>
        </div>

        <table class="w-full text-sm text-left text-slate-600">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th scope="col" class="px-6 py-3 font-bold border-b border-slate-200">Fecha</th>
              <th scope="col" class="px-6 py-3 font-bold border-b border-slate-200 text-right">Total Metros</th>
              <th scope="col" class="px-6 py-3 font-bold border-b border-slate-200 text-right">Total Kg</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="(item, index) in datosCompletos" :key="index" class="bg-white hover:bg-slate-50 transition-colors">
              <td class="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">{{ item.DT_BASE_PRODUCAO }}</td>
              <td class="px-6 py-3 text-right font-mono">{{ formatNumber(item.TotalMetros) }}</td>
              <td class="px-6 py-3 text-right font-mono font-semibold text-blue-700">{{ formatNumber(item.TotalKg) }}</td>
            </tr>
            <tr v-if="datosCompletos.length === 0 && !cargando">
              <td colspan="3" class="px-6 py-8 text-center text-slate-500">
                No se encontraron datos para el período seleccionado.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="datosCompletos.length > 0" class="bg-slate-100 font-bold text-slate-800 sticky bottom-0 shadow-inner">
            <tr>
              <td class="px-6 py-3">TOTAL</td>
              <td class="px-6 py-3 text-right font-mono">{{ formatNumber(totales.metros) }}</td>
              <td class="px-6 py-3 text-right font-mono text-blue-800">{{ formatNumber(totales.kg) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import CustomDatepicker from './CustomDatepicker.vue'

const datos = ref([])
const cargando = ref(false)
const API_BASE = 'http://localhost:3002' // Ajustar según configuración

// Inicializar con la fecha de ayer
const getYesterday = () => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}

const fechaSeleccionada = ref(getYesterday())

// Calcular fecha de inicio (primer día del mes)
const fechaInicio = computed(() => {
  if (!fechaSeleccionada.value) return ''
  const [year, month] = fechaSeleccionada.value.split('-')
  return `${year}-${month}-01`
})

// Calcular fecha de fin (último día del mes)
const fechaFinMes = computed(() => {
  if (!fechaSeleccionada.value) return ''
  const [year, month] = fechaSeleccionada.value.split('-')
  // Obtener el último día del mes: día 0 del mes siguiente
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${month}-${lastDay}`
})

// Generar lista completa de días del mes
const datosCompletos = computed(() => {
  if (!fechaSeleccionada.value) return []
  
  const [year, month, day] = fechaSeleccionada.value.split('-')
  const selectedDay = parseInt(day, 10)
  const result = []
  
  // Crear mapa de datos existentes para búsqueda rápida
  const datosMap = new Map()
  datos.value.forEach(item => {
    datosMap.set(item.DT_BASE_PRODUCAO, item)
  })
  
  // Iterar solo hasta el día seleccionado
  for (let i = 1; i <= selectedDay; i++) {
    // Formato DD/MM/YYYY
    const dayStr = i.toString().padStart(2, '0')
    const dateStr = `${dayStr}/${month}/${year}`
    
    if (datosMap.has(dateStr)) {
      result.push(datosMap.get(dateStr))
    } else {
      result.push({
        DT_BASE_PRODUCAO: dateStr,
        TotalMetros: 0,
        TotalKg: 0
      })
    }
  }
  
  return result
})

const totales = computed(() => {
  return datosCompletos.value.reduce((acc, item) => {
    acc.metros += Number(item.TotalMetros) || 0
    acc.kg += Number(item.TotalKg) || 0
    return acc
  }, { metros: 0, kg: 0 })
})

const formatNumber = (num) => {
  if (num === null || num === undefined) return '-'
  // Formato entero con separador de miles (#.###0)
  return new Intl.NumberFormat('es-AR', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(num)
}

const cargarDatos = async () => {
  if (!fechaSeleccionada.value) return
  
  cargando.value = true
  try {
    // Solicitar datos para todo el mes
    const url = `${API_BASE}/api/residuos-indigo-tejeduria?fecha_inicio=${fechaInicio.value}&fecha_fin=${fechaFinMes.value}`
    const response = await fetch(url)
    if (!response.ok) throw new Error('Error al cargar datos')
    datos.value = await response.json()
  } catch (error) {
    console.error('Error:', error)
    alert('Error al cargar los datos: ' + error.message)
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  cargarDatos()
})
</script>
