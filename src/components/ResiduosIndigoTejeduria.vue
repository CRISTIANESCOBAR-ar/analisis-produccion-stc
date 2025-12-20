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
          
          <button 
            @click="cargarDatos" 
            class="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
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
            <tr v-for="(item, index) in datos" :key="index" class="bg-white hover:bg-slate-50 transition-colors">
              <td class="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">{{ item.DT_BASE_PRODUCAO }}</td>
              <td class="px-6 py-3 text-right font-mono">{{ formatNumber(item.TotalMetros) }}</td>
              <td class="px-6 py-3 text-right font-mono font-semibold text-blue-700">{{ formatNumber(item.TotalKg) }}</td>
            </tr>
            <tr v-if="datos.length === 0 && !cargando">
              <td colspan="3" class="px-6 py-8 text-center text-slate-500">
                No se encontraron datos para el período seleccionado.
              </td>
            </tr>
          </tbody>
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

// Inicializar con la fecha actual
const fechaSeleccionada = ref(new Date().toISOString().split('T')[0])

// Calcular fecha de inicio (primer día del mes de la fecha seleccionada)
const fechaInicio = computed(() => {
  if (!fechaSeleccionada.value) return ''
  const [year, month] = fechaSeleccionada.value.split('-')
  return `${year}-${month}-01`
})

const formatNumber = (num) => {
  if (num === null || num === undefined) return '-'
  return new Intl.NumberFormat('es-AR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(num)
}

const cargarDatos = async () => {
  if (!fechaSeleccionada.value) return
  
  cargando.value = true
  try {
    // Enviar rango: desde el 1 del mes hasta la fecha seleccionada
    const url = `${API_BASE}/api/residuos-indigo-tejeduria?fecha_inicio=${fechaInicio.value}&fecha_fin=${fechaSeleccionada.value}`
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
