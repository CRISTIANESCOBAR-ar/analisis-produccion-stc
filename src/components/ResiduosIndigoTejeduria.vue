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

        <table class="w-full text-sm text-left text-slate-600 font-[Verdana]">
          <thead class="text-xs text-slate-700 bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th scope="col" class="pl-2 pr-2 py-1 font-bold border-b border-slate-200">Fecha</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Producción Índigo Metros</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Producción Índigo Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Residuos Índigo Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Residuos Índigo en %</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Meta Índigo %</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Desvío Índigo en Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Desvío Índigo en Metros</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 border-l-2 text-right">Tejeduría Metros</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Tejeduría Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Residuos Tejeduría Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Meta Tejeduría %</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Desvío Tejeduría en Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Desvío Tejeduría en Metros</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Anudados</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Promedio x Anudado Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">ESTOPA AZUL PRODUCIDA</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">ESTOPA AZUL PRENSADA</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="(item, index) in datosCompletos" :key="index" class="bg-white hover:bg-slate-50 transition-colors">
              <td class="pl-2 pr-2 py-1 font-medium text-slate-900 whitespace-nowrap">{{ item.DT_BASE_PRODUCAO }}</td>
              <td class="px-2 py-1 text-right font-mono">{{ formatNumber(item.TotalMetros) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-blue-700">{{ formatNumber(item.TotalKg) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-red-600">{{ formatNumber(item.ResiduosKg) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-orange-600">{{ formatPercent(item.ResiduosKg, item.TotalKg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-slate-600">{{ formatDecimal(metaPercent) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-purple-600">{{ formatDesvio(item.ResiduosKg, item.TotalKg, metaPercent) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-indigo-600">{{ formatDesvioMetros(item.TotalMetros, item.TotalKg, item.ResiduosKg, metaPercent) }}</td>
              <td class="px-2 py-1 text-right font-mono border-l-2 border-slate-200">{{ formatNumber(item.TejeduriaMetros) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-cyan-700">{{ formatNumber(item.TejeduriaKg) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-rose-700">{{ formatNumber(item.ResiduosTejeduriaKg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-slate-600">{{ formatDecimal(metaTejeduriaPercent) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-purple-600">{{ formatDesvio(item.ResiduosTejeduriaKg, item.TejeduriaKg, metaTejeduriaPercent) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-indigo-600">{{ formatDesvioMetros(item.TejeduriaMetros, item.TejeduriaKg, item.ResiduosTejeduriaKg, metaTejeduriaPercent) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-amber-600">{{ formatNumber(item.AnudadosCount) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-emerald-600">{{ formatPromedioAnudado(item.ResiduosTejeduriaKg, item.AnudadosCount) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-blue-600">{{ formatNumber(item.EstopaAzulProducida) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-green-600">{{ formatNumber(item.ResiduosPrensadaKg) }}</td>
              <td class="px-2 py-1 text-right font-mono font-semibold text-red-500">{{ formatNumber(item.DiferenciaEstopa) }}</td>
            </tr>
            <tr v-if="datosCompletos.length === 0 && !cargando">
              <td colspan="19" class="px-6 py-8 text-center text-slate-500">
                No se encontraron datos para el período seleccionado.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="datosCompletos.length > 0" class="bg-slate-100 font-bold text-slate-800 sticky bottom-0 shadow-inner">
            <tr>
              <td class="pl-2 pr-2 py-1">TOTAL</td>
              <td class="px-2 py-1 text-right font-mono">{{ formatNumber(totales.metros) }}</td>
              <td class="px-2 py-1 text-right font-mono text-blue-800">{{ formatNumber(totales.kg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-red-700">{{ formatNumber(totales.residuos) }}</td>
              <td class="px-2 py-1 text-right font-mono text-orange-700">{{ formatPercent(totales.residuos, totales.kg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-slate-700">{{ formatDecimal(metaPercent) }}</td>
              <td class="px-2 py-1 text-right font-mono text-purple-700">{{ totales.desvioKg > 0 ? formatNumber(totales.desvioKg) : '' }}</td>
              <td class="px-2 py-1 text-right font-mono text-indigo-700">{{ totales.desvioMetros > 0 ? formatNumber(totales.desvioMetros) : '' }}</td>
              <td class="px-2 py-1 text-right font-mono border-l-2 border-slate-200">{{ formatNumber(totales.tejeduriaMetros) }}</td>
              <td class="px-2 py-1 text-right font-mono text-cyan-800">{{ formatNumber(totales.tejeduriaKg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-rose-800">{{ formatNumber(totales.residuosTejeduriaKg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-slate-700">{{ formatDecimal(metaTejeduriaPercent) }}</td>
              <td class="px-2 py-1 text-right font-mono text-purple-700">{{ totales.desvioTejeduriaKg > 0 ? formatNumber(totales.desvioTejeduriaKg) : '' }}</td>
              <td class="px-2 py-1 text-right font-mono text-indigo-700">{{ totales.desvioTejeduriaMetros > 0 ? formatNumber(totales.desvioTejeduriaMetros) : '' }}</td>
              <td class="px-2 py-1 text-right font-mono text-amber-700">{{ formatNumber(totales.anudadosCount) }}</td>
              <td class="px-2 py-1 text-right font-mono text-emerald-700">{{ formatPromedioAnudadoTotal(totales.residuosTejeduriaKg, totales.anudadosCount) }}</td>
              <td class="px-2 py-1 text-right font-mono text-blue-700">{{ formatNumber(totales.estopaAzulProducida) }}</td>
              <td class="px-2 py-1 text-right font-mono text-green-700">{{ formatNumber(totales.residuosPrensadaKg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-red-600">{{ formatNumber(totales.diferenciaEstopa) }}</td>
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

// Meta estándar (a futuro se cargará desde BD)
const metaPercent = ref(1.8)
const metaTejeduriaPercent = ref(0.3)

// Inicializar con la fecha de ayer
const getYesterday = () => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  // Calcular días en el mes
  const daysInMonth = new Date(year, month, 0).getDate()
  const result = []
  
  // Crear mapa de datos existentes para búsqueda rápida
  const datosMap = new Map()
  datos.value.forEach(item => {
    datosMap.set(item.DT_BASE_PRODUCAO, item)
  })
  
  // Iterar por todos los días del mes
  for (let i = 1; i <= daysInMonth; i++) {
    // Formato DD/MM/YYYY
    const dayStr = i.toString().padStart(2, '0')
    const dateStr = `${dayStr}/${month}/${year}`
    
    // Si el día es menor o igual al seleccionado, buscamos datos reales
    if (i <= selectedDay) {
      if (datosMap.has(dateStr)) {
        const data = datosMap.get(dateStr)
        // Calcular campos derivados
        const residuosKg = Number(data.ResiduosKg) || 0
        const residuosTejeduriaKg = Number(data.ResiduosTejeduriaKg) || 0
        const residuosPrensadaKg = Number(data.ResiduosPrensadaKg) || 0
        
        const estopaAzulProducida = residuosKg + residuosTejeduriaKg
        const diferenciaEstopa = residuosPrensadaKg - estopaAzulProducida
        
        result.push({
          ...data,
          EstopaAzulProducida: estopaAzulProducida,
          DiferenciaEstopa: diferenciaEstopa
        })
      } else {
        result.push({
          DT_BASE_PRODUCAO: dateStr,
          TotalMetros: 0,
          TotalKg: 0,
          ResiduosKg: 0,
          TejeduriaMetros: 0,
          TejeduriaKg: 0,
          ResiduosTejeduriaKg: 0,
          AnudadosCount: 0,
          ResiduosPrensadaKg: 0,
          EstopaAzulProducida: 0,
          DiferenciaEstopa: 0
        })
      }
    } else {
      // Para días futuros en el mes, mostramos null para que no se renderice nada
      result.push({
        DT_BASE_PRODUCAO: dateStr,
        TotalMetros: null,
        TotalKg: null,
        ResiduosKg: null,
        TejeduriaMetros: null,
        TejeduriaKg: null,
        ResiduosTejeduriaKg: null,
        AnudadosCount: null,
        ResiduosPrensadaKg: null,
        EstopaAzulProducida: null,
        DiferenciaEstopa: null
      })
    }
  }
  
  return result
})

const totales = computed(() => {
  return datosCompletos.value.reduce((acc, item) => {
    acc.metros += Number(item.TotalMetros) || 0
    acc.kg += Number(item.TotalKg) || 0
    acc.residuos += Number(item.ResiduosKg) || 0
    acc.tejeduriaMetros += Number(item.TejeduriaMetros) || 0
    acc.tejeduriaKg += Number(item.TejeduriaKg) || 0
    acc.residuosTejeduriaKg += Number(item.ResiduosTejeduriaKg) || 0
    acc.anudadosCount += Number(item.AnudadosCount) || 0
    acc.residuosPrensadaKg += Number(item.ResiduosPrensadaKg) || 0
    acc.estopaAzulProducida += Number(item.EstopaAzulProducida) || 0
    acc.diferenciaEstopa += Number(item.DiferenciaEstopa) || 0
    
    // Calcular desvío en Kg para este día
    if (item.TotalKg > 0) {
      const residuosPercent = (item.ResiduosKg / item.TotalKg) * 100
      const desvioKg = ((residuosPercent - metaPercent.value) * item.TotalKg) / 100
      if (desvioKg > 0) {
        acc.desvioKg += desvioKg
        // Calcular desvío en metros para este día
        const desvioMetros = (item.TotalMetros / item.TotalKg) * desvioKg
        acc.desvioMetros += desvioMetros
      }
    }

    // Calcular desvío Tejeduría
    if (item.TejeduriaKg > 0) {
      const residuosTejPercent = (item.ResiduosTejeduriaKg / item.TejeduriaKg) * 100
      const desvioTejKg = ((residuosTejPercent - metaTejeduriaPercent.value) * item.TejeduriaKg) / 100
      if (desvioTejKg > 0) {
        acc.desvioTejeduriaKg += desvioTejKg
        const desvioTejMetros = (item.TejeduriaMetros / item.TejeduriaKg) * desvioTejKg
        acc.desvioTejeduriaMetros += desvioTejMetros
      }
    }
    
    return acc
  }, { 
    metros: 0, kg: 0, residuos: 0, desvioKg: 0, desvioMetros: 0, 
    tejeduriaMetros: 0, tejeduriaKg: 0, residuosTejeduriaKg: 0,
    desvioTejeduriaKg: 0, desvioTejeduriaMetros: 0, anudadosCount: 0,
    residuosPrensadaKg: 0, estopaAzulProducida: 0, diferenciaEstopa: 0
  })
})

const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return ''
  // Formato entero con separador de miles (#.###0)
  return new Intl.NumberFormat('es-AR', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(num)
}

const formatPercent = (residuos, produccion) => {
  if (produccion === null || produccion === undefined) return ''
  if (!produccion || produccion === 0) return '0,0'
  const percent = (residuos / produccion) * 100
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(percent)
}

const formatDecimal = (num) => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(num)
}

const formatDesvio = (residuos, produccion, meta = metaPercent.value) => {
  if (!produccion || produccion === 0) return ''
  const residuosPercent = (residuos / produccion) * 100
  const desvio = ((residuosPercent - meta) * produccion) / 100
  // No mostrar valores negativos (meta alcanzada o no superada)
  if (desvio <= 0) return ''
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(desvio)
}

const formatDesvioMetros = (metros, kg, residuos, meta = metaPercent.value) => {
  if (!kg || kg === 0) return ''
  const residuosPercent = (residuos / kg) * 100
  const desvioKg = ((residuosPercent - meta) * kg) / 100
  // No mostrar si el desvío en Kg es negativo o cero
  if (desvioKg <= 0) return ''
  const desvioMetros = (metros / kg) * desvioKg
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(desvioMetros)
}

const formatPromedioAnudado = (residuos, anudados) => {
  if (!residuos || residuos === 0) return ''
  if (!anudados || anudados === 0) return ''
  
  const promedio = residuos / anudados
  
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(promedio)
}

const formatPromedioAnudadoTotal = (residuos, anudados) => {
  if (!residuos || residuos <= 0) return ''
  if (!anudados || anudados === 0) return ''
  
  const promedio = residuos / anudados
  
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(promedio)
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
