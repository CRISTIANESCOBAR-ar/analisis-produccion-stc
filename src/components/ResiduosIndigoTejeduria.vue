<template>
  <div class="w-full h-screen flex flex-col p-1">
    <main ref="mainContentRef" class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col">
      <div class="flex items-center justify-between gap-4 flex-shrink-0 mb-4">
        <div class="flex items-center gap-6">
          <img src="/LogoSantana.jpg" alt="Santana Textiles" class="h-10 w-auto object-contain" />
          <h3 class="text-lg font-semibold text-slate-800">Residuos de INDIGO y TEJEDURIA</h3>
          <div class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <span class="text-sm font-medium text-slate-600">Costo URDIMBRE TEÑIDA:</span>
            <span class="text-sm font-bold text-blue-700">{{ formatCurrencyValue(costoUrdidoTenido) }}</span>
          </div>
        </div>
        
        <div class="flex items-center gap-4">
          <button
            @click="exportarAExcel"
            class="inline-flex items-center gap-2 px-4 py-0 h-[34px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            v-tippy="{ content: 'Exportar informe completo a Excel', placement: 'bottom' }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z"/>
            </svg>
            Exportar
          </button>
          <button
            @click="exportarComoImagen"
            class="inline-flex items-center gap-2 px-4 py-0 h-[34px] bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            v-tippy="{ content: 'Copiar tabla completa al portapapeles (lista para pegar en WhatsApp o correo electrónico)', placement: 'bottom' }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01C17.18 3.03 14.69 2 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.188 8.188 0 0 1-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.27-.25-.14-1.47-.74-1.69-.82-.23-.08-.37-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.07-.26-.13-1.06-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.39.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43-.14 0-.3-.01-.47-.01z"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v.18l7.12 4.45a1 1 0 0 0 1.05 0L20 7.18V7H4zm16 10v-8.4l-6.38 3.99a3 3 0 0 1-3.24 0L4 8.6V17h16z"/>
            </svg>
            Exportar
          </button>
          <CustomDatepicker 
            v-model="fechaSeleccionada" 
            label="Fecha:" 
            :show-buttons="true"
            @change="cargarDatos" 
          />
        </div>
      </div>

      <div class="flex-1 overflow-auto min-h-0 border border-slate-200 rounded-lg relative" ref="tablaRef">
        <div v-if="cargando" class="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
          <div class="flex flex-col items-center gap-3 bg-white px-8 py-6 rounded-lg shadow-lg border-2 border-blue-500">
            <div class="animate-spin rounded-full h-12 w-12 border-b-3 border-blue-600"></div>
            <div class="flex flex-col items-center gap-1">
              <span class="text-base text-slate-700 font-semibold">Cargando datos del mes</span>
              <span class="text-lg text-blue-600 font-bold">{{ mesFormateado }}</span>
            </div>
          </div>
        </div>

        <table ref="tableElementRef" class="w-full text-sm text-left text-slate-600 font-[Verdana]">
          <thead class="text-xs text-slate-700 bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th scope="col" class="pl-2 pr-2 py-1 font-bold border-b border-slate-200 text-center">Fecha</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 border-l-2 text-right">Producción Índigo Metros</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Producción Índigo Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Residuos Índigo Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Residuos Índigo en %</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Meta Índigo %</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Desvío Índigo en Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Desvío Índigo en Metros</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Desvío Índigo en $ (ARS)</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 border-l-2 text-right">Tejeduría Metros</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Tejeduría Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Residuos Tejeduría Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Meta Tejeduría %</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Desvío Tejeduría en Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Desvío Tejeduría en Metros</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Anudados</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Promedio x Anudado Kg</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Desvío Tejeduría en $ (ARS)</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 border-l-2 text-right">ESTOPA AZUL PRODUCIDA</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">ESTOPA AZUL PRENSADA</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="(item, index) in datosCompletos" :key="index" :class="index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100'" class="transition-colors cursor-pointer" @dblclick="abrirDetalle(item.DT_BASE_PRODUCAO)" v-tippy="{ content: 'Doble clic para ver detalle', placement: 'left', delay: [500, 0] }">
              <td class="pl-2 pr-2 py-0 font-medium text-slate-900 whitespace-nowrap">{{ item.DT_BASE_PRODUCAO }}</td>
              <td class="px-2 py-0 text-right font-mono border-l-2 border-slate-200">{{ formatNumber(item.TotalMetros) }}</td>
              <td class="px-2 py-0 text-right font-mono text-blue-700">{{ formatNumber(item.TotalKg) }}</td>
              <td class="px-2 py-0 text-right font-mono text-red-600">{{ formatNumber(item.ResiduosKg) }}</td>
              <td class="px-2 py-0 text-right font-mono text-orange-600">{{ formatPercent(item.ResiduosKg, item.TotalKg) }}</td>
              <td class="px-2 py-0 text-right font-mono text-slate-600">{{ formatDecimal(metaPercent) }}</td>
              <td class="px-2 py-0 text-right font-mono text-purple-600">{{ formatDesvio(item.ResiduosKg, item.TotalKg, metaPercent) }}</td>
              <td class="px-2 py-0 text-right font-mono text-indigo-600">{{ formatDesvioMetros(item.TotalMetros, item.TotalKg, item.ResiduosKg, metaPercent) }}</td>
              <td class="px-2 py-0 text-right font-mono text-green-700">{{ formatCurrency(item.TotalMetros, item.TotalKg, item.ResiduosKg, metaPercent, costoUrdidoTenido) }}</td>
              <td class="px-2 py-0 text-right font-mono border-l-2 border-slate-200">{{ formatNumber(item.TejeduriaMetros) }}</td>
              <td class="px-2 py-0 text-right font-mono text-cyan-700">{{ formatNumber(item.TejeduriaKg) }}</td>
              <td class="px-2 py-0 text-right font-mono text-rose-700">{{ formatNumber(item.ResiduosTejeduriaKg) }}</td>
              <td class="px-2 py-0 text-right font-mono text-slate-600">{{ formatDecimal(metaTejeduriaPercent) }}</td>
              <td class="px-2 py-0 text-right font-mono text-purple-600">{{ formatDesvio(item.ResiduosTejeduriaKg, item.TejeduriaKg, metaTejeduriaPercent) }}</td>
              <td class="px-2 py-0 text-right font-mono text-indigo-600">{{ formatDesvioMetros(item.TejeduriaMetros, item.TejeduriaKg, item.ResiduosTejeduriaKg, metaTejeduriaPercent) }}</td>
              <td class="px-2 py-0 text-right font-mono text-amber-600">{{ formatNumber(item.AnudadosCount) }}</td>
              <td class="px-2 py-0 text-right font-mono text-emerald-600">{{ formatPromedioAnudado(item.ResiduosTejeduriaKg, item.AnudadosCount) }}</td>
              <td class="px-2 py-0 text-right font-mono text-green-700">{{ formatCurrency(item.TejeduriaMetros, item.TejeduriaKg, item.ResiduosTejeduriaKg, metaTejeduriaPercent, costoUrdidoTenido) }}</td>
              <td class="px-2 py-0 text-right font-mono text-blue-600 border-l-2 border-slate-200">{{ formatNumber(item.EstopaAzulProducida) }}</td>
              <td class="px-2 py-0 text-right font-mono text-green-600">{{ formatNumber(item.ResiduosPrensadaKg) }}</td>
              <td class="px-2 py-0 text-right font-mono text-red-500">{{ formatNumber(item.DiferenciaEstopa) }}</td>
            </tr>
            <tr v-if="datosCompletos.length === 0 && !cargando">
              <td colspan="21" class="px-6 py-8 text-center text-slate-500">
                No se encontraron datos para el período seleccionado.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="datosCompletos.length > 0" class="bg-slate-100 font-bold text-slate-800 sticky bottom-0 shadow-inner">
            <tr>
              <td class="pl-2 pr-2 py-1 text-center">TOTAL</td>
              <td class="px-2 py-1 text-right font-mono border-l-2 border-slate-200">{{ formatNumber(totales.metros) }}</td>
              <td class="px-2 py-1 text-right font-mono text-blue-800">{{ formatNumber(totales.kg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-red-700">{{ formatNumber(totales.residuos) }}</td>
              <td class="px-2 py-1 text-right font-mono text-orange-700">{{ formatPercent(totales.residuos, totales.kg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-slate-700">{{ formatDecimal(metaPercent) }}</td>
              <td class="px-2 py-1 text-right font-mono text-purple-700">{{ totales.desvioKg > 0 ? formatNumber(totales.desvioKg) : '' }}</td>
              <td class="px-2 py-1 text-right font-mono text-indigo-700">{{ totales.desvioMetros > 0 ? formatNumber(totales.desvioMetros) : '' }}</td>
              <td class="px-2 py-1 text-right font-mono text-green-800">{{ totales.desvioIndigoPesos > 0 ? formatCurrencyValue(totales.desvioIndigoPesos) : '' }}</td>
              <td class="px-2 py-1 text-right font-mono border-l-2 border-slate-200">{{ formatNumber(totales.tejeduriaMetros) }}</td>
              <td class="px-2 py-1 text-right font-mono text-cyan-800">{{ formatNumber(totales.tejeduriaKg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-rose-800">{{ formatNumber(totales.residuosTejeduriaKg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-slate-700">{{ formatDecimal(metaTejeduriaPercent) }}</td>
              <td class="px-2 py-1 text-right font-mono text-purple-700">{{ totales.desvioTejeduriaKg > 0 ? formatNumber(totales.desvioTejeduriaKg) : '' }}</td>
              <td class="px-2 py-1 text-right font-mono text-indigo-700">{{ totales.desvioTejeduriaMetros > 0 ? formatNumber(totales.desvioTejeduriaMetros) : '' }}</td>
              <td class="px-2 py-1 text-right font-mono text-amber-700">{{ formatNumber(totales.anudadosCount) }}</td>
              <td class="px-2 py-1 text-right font-mono text-emerald-700">{{ formatPromedioAnudadoTotal(totales.residuosTejeduriaKg, totales.anudadosCount) }}</td>
              <td class="px-2 py-1 text-right font-mono text-green-800">{{ totales.desvioTejeduriaPesos > 0 ? formatCurrencyValue(totales.desvioTejeduriaPesos) : '' }}</td>
              <td class="px-2 py-1 text-right font-mono text-blue-700 border-l-2 border-slate-200">{{ formatNumber(totales.estopaAzulProducida) }}</td>
              <td class="px-2 py-1 text-right font-mono text-green-700">{{ formatNumber(totales.residuosPrensadaKg) }}</td>
              <td class="px-2 py-1 text-right font-mono text-red-600">{{ formatNumber(totales.diferenciaEstopa) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>

    <!-- Modal de Detalle -->
    <DetalleResiduosModal 
      :show="modalDetalle" 
      :fecha-inicial="fechaModalDetalle" 
      @close="modalDetalle = false" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import CustomDatepicker from './CustomDatepicker.vue'
import DetalleResiduosModal from './DetalleResiduosModal.vue'
import { useDatabase } from '../composables/useDatabase'
import { domToPng } from 'modern-screenshot'
import Swal from 'sweetalert2'
import ExcelJS from 'exceljs'

const { getCostosMensual } = useDatabase()

const datos = ref([])
const costosMensuales = ref([])
const costoUrdidoTenido = ref(0)
const cargando = ref(false)
const tablaRef = ref(null)
const tableElementRef = ref(null)
const mainContentRef = ref(null)
const modalDetalle = ref(false)
const fechaModalDetalle = ref('')
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

// Formatear mes para mostrar en el mensaje de carga
const mesFormateado = computed(() => {
  if (!fechaSeleccionada.value) return ''
  const [year, month] = fechaSeleccionada.value.split('-')
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return `${meses[parseInt(month) - 1]} ${year}`
})

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
        // Calcular valor monetario del desvío Índigo
        if (costoUrdidoTenido.value > 0) {
          acc.desvioIndigoPesos += desvioMetros * costoUrdidoTenido.value
        }
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
        // Calcular valor monetario del desvío Tejeduría
        if (costoUrdidoTenido.value > 0) {
          acc.desvioTejeduriaPesos += desvioTejMetros * costoUrdidoTenido.value
        }
      }
    }
    
    return acc
  }, { 
    metros: 0, kg: 0, residuos: 0, desvioKg: 0, desvioMetros: 0, desvioIndigoPesos: 0,
    tejeduriaMetros: 0, tejeduriaKg: 0, residuosTejeduriaKg: 0,
    desvioTejeduriaKg: 0, desvioTejeduriaMetros: 0, desvioTejeduriaPesos: 0, anudadosCount: 0,
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

const formatCurrency = (metros, kg, residuos, meta, costo) => {
  if (!kg || kg === 0) return ''
  if (!costo || costo === 0) return ''
  const residuosPercent = (residuos / kg) * 100
  const desvioKg = ((residuosPercent - meta) * kg) / 100
  if (desvioKg <= 0) return ''
  const desvioMetros = (metros / kg) * desvioKg
  const valorPesos = desvioMetros * costo
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valorPesos)
}

const formatCurrencyValue = (valor) => {
  if (!valor || valor <= 0) return ''
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor)
}

const cargarCostos = async () => {
  if (!fechaSeleccionada.value) return
  
  try {
    // Convertir fecha a formato yyyymm (YYYY-MM)
    const [year, month] = fechaSeleccionada.value.split('-')
    const yyyymm = `${year}-${month}`
    
    // Optimización: cargar solo 3 meses (actual, anterior y siguiente) en lugar de 36
    const resultado = await getCostosMensual(3)
    
    // El API retorna {rows: Array}
    const costosArray = resultado?.rows || []
    costosMensuales.value = costosArray
    
    // Buscar el costo de URDIDO_TENIDO para el mes seleccionado
    const costoMes = costosArray.find(c => c.yyyymm === yyyymm && c.codigo === 'URDIDO_TENIDO')
    
    costoUrdidoTenido.value = costoMes ? Number(costoMes.ars_por_unidad) || 0 : 0
  } catch (error) {
    console.error('Error al cargar costos:', error)
    costoUrdidoTenido.value = 0
  }
}

const cargarDatos = async () => {
  if (!fechaSeleccionada.value) return
  
  cargando.value = true
  try {
    // Cargar costos y datos en paralelo
    await cargarCostos()
    
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

const exportarAExcel = async () => {
  try {
    // Crear workbook y worksheet con ExcelJS
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Residuos', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }], // Congelar fila de encabezado
      pageSetup: {
        paperSize: 5, // Legal
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: {
          left: 0.196850393700787,
          right: 0.196850393700787,
          top: 0.196850393700787,
          bottom: 0.393700787401575,
          header: 0.196850393700787,
          footer: 0.196850393700787
        },
        horizontalCentered: true,
        verticalCentered: false
      }
    })
    
    // Definir columnas con anchos
    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 10.86 },
      { header: 'Producción Índigo Metros', key: 'prod_ind_m', width: 9.43 },
      { header: 'Producción Índigo Kg', key: 'prod_ind_kg', width: 9.29 },
      { header: 'Residuos Índigo Kg', key: 'res_ind_kg', width: 8.43 },
      { header: 'Residuos Índigo en %', key: 'res_ind_pct', width: 8.43 },
      { header: 'Meta Índigo %', key: 'meta_ind', width: 6.43 },
      { header: 'Desvío Índigo en Kg', key: 'desv_ind_kg', width: 7 },
      { header: 'Desvío Índigo en Metros', key: 'desv_ind_m', width: 9.29 },
      { header: 'Desvío Índigo en $ (ARS)', key: 'desv_ind_ars', width: 11.71 },
      { header: 'Tejeduría Metros', key: 'tej_m', width: 7.71 },
      { header: 'Tejeduría Kg', key: 'tej_kg', width: 7.71 },
      { header: 'Residuos Tejeduría Kg', key: 'res_tej_kg', width: 9.57 },
      { header: 'Meta Tejeduría %', key: 'meta_tej', width: 7.71 },
      { header: 'Desvío Tejeduría en Kg', key: 'desv_tej_kg', width: 7.71 },
      { header: 'Desvío Tejeduría en Metros', key: 'desv_tej_m', width: 10 },
      { header: 'Anudados', key: 'anudados', width: 4.14 },
      { header: 'Promedio x Anudado Kg', key: 'prom_anud', width: 10.57 },
      { header: 'Desvío Tejeduría en $ (ARS)', key: 'desv_tej_ars', width: 10.57 },
      { header: 'ESTOPA AZUL PRODUCIDA', key: 'estopa_prod', width: 12.57 },
      { header: 'ESTOPA AZUL PRENSADA', key: 'estopa_prens', width: 11.29 },
      { header: 'Diferencia', key: 'diferencia', width: 6.14 }
    ]
    
    // Estilo del encabezado
    worksheet.getRow(1).height = 55
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FF334155' } }
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    worksheet.getRow(1).border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    }
    
    // Aplicar línea vertical de separación en el encabezado (columnas B, J, S)
    worksheet.getCell('B1').border = {
      ...worksheet.getCell('B1').border,
      left: { style: 'medium', color: { argb: 'FF94A3B8' } }
    }
    worksheet.getCell('J1').border = {
      ...worksheet.getCell('J1').border,
      left: { style: 'medium', color: { argb: 'FF94A3B8' } }
    }
    worksheet.getCell('S1').border = {
      ...worksheet.getCell('S1').border,
      left: { style: 'medium', color: { argb: 'FF94A3B8' } }
    }
    
    // Helper para calcular valores
    const calcDesvioKg = (residuos, produccion, meta) => {
      if (!produccion || produccion === 0) return null
      const residuosPercent = (residuos / produccion) * 100
      const desvio = ((residuosPercent - meta) * produccion) / 100
      return desvio > 0 ? desvio : null
    }
    
    const calcDesvioMetros = (metros, kg, residuos, meta) => {
      if (!kg || kg === 0) return null
      const desvioKg = calcDesvioKg(residuos, kg, meta)
      if (!desvioKg) return null
      return (metros / kg) * desvioKg
    }
    
    const calcDesvioArs = (metros, kg, residuos, meta, costo) => {
      if (!costo || costo === 0) return null
      const desvioMetros = calcDesvioMetros(metros, kg, residuos, meta)
      if (!desvioMetros) return null
      return desvioMetros * costo
    }
    
    // Agregar datos
    datosCompletos.value.forEach(item => {
      // Convertir fecha
      let fechaExcel = null
      if (item.DT_BASE_PRODUCAO) {
        const [dia, mes, anio] = item.DT_BASE_PRODUCAO.split('/')
        fechaExcel = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia))
      }
      
      const desvioIndigoKg = calcDesvioKg(item.ResiduosKg, item.TotalKg, metaPercent.value)
      const desvioIndigoMetros = calcDesvioMetros(item.TotalMetros, item.TotalKg, item.ResiduosKg, metaPercent.value)
      const desvioIndigoPesos = calcDesvioArs(item.TotalMetros, item.TotalKg, item.ResiduosKg, metaPercent.value, costoUrdidoTenido.value)
      const desvioTejKg = calcDesvioKg(item.ResiduosTejeduriaKg, item.TejeduriaKg, metaTejeduriaPercent.value)
      const desvioTejMetros = calcDesvioMetros(item.TejeduriaMetros, item.TejeduriaKg, item.ResiduosTejeduriaKg, metaTejeduriaPercent.value)
      const desvioTejPesos = calcDesvioArs(item.TejeduriaMetros, item.TejeduriaKg, item.ResiduosTejeduriaKg, metaTejeduriaPercent.value, costoUrdidoTenido.value)
      const promedioAnudado = (item.ResiduosTejeduriaKg && item.AnudadosCount && item.AnudadosCount > 0) 
        ? item.ResiduosTejeduriaKg / item.AnudadosCount 
        : null
      
      worksheet.addRow({
        fecha: fechaExcel,
        prod_ind_m: item.TotalMetros ?? null,
        prod_ind_kg: item.TotalKg ?? null,
        res_ind_kg: item.ResiduosKg ?? null,
        res_ind_pct: item.TotalKg ? (item.ResiduosKg / item.TotalKg) : null,
        meta_ind: metaPercent.value / 100,
        desv_ind_kg: desvioIndigoKg,
        desv_ind_m: desvioIndigoMetros,
        desv_ind_ars: desvioIndigoPesos,
        tej_m: item.TejeduriaMetros ?? null,
        tej_kg: item.TejeduriaKg ?? null,
        res_tej_kg: item.ResiduosTejeduriaKg ?? null,
        meta_tej: metaTejeduriaPercent.value / 100,
        desv_tej_kg: desvioTejKg,
        desv_tej_m: desvioTejMetros,
        anudados: item.AnudadosCount ?? null,
        prom_anud: promedioAnudado,
        desv_tej_ars: desvioTejPesos,
        estopa_prod: item.EstopaAzulProducida ?? null,
        estopa_prens: item.ResiduosPrensadaKg ?? null,
        diferencia: item.DiferenciaEstopa ?? null
      })
    })
    
    // Agregar fila de totales
    const totalPromedioAnudado = (totales.value.residuosTejeduriaKg && totales.value.anudadosCount > 0) 
      ? totales.value.residuosTejeduriaKg / totales.value.anudadosCount 
      : null
    
    const totalRow = worksheet.addRow({
      fecha: 'TOTAL',
      prod_ind_m: totales.value.metros,
      prod_ind_kg: totales.value.kg,
      res_ind_kg: totales.value.residuos,
      res_ind_pct: totales.value.kg ? (totales.value.residuos / totales.value.kg) : null,
      meta_ind: metaPercent.value / 100,
      desv_ind_kg: totales.value.desvioKg > 0 ? totales.value.desvioKg : null,
      desv_ind_m: totales.value.desvioMetros > 0 ? totales.value.desvioMetros : null,
      desv_ind_ars: totales.value.desvioIndigoPesos > 0 ? totales.value.desvioIndigoPesos : null,
      tej_m: totales.value.tejeduriaMetros,
      tej_kg: totales.value.tejeduriaKg,
      res_tej_kg: totales.value.residuosTejeduriaKg,
      meta_tej: metaTejeduriaPercent.value / 100,
      desv_tej_kg: totales.value.desvioTejeduriaKg > 0 ? totales.value.desvioTejeduriaKg : null,
      desv_tej_m: totales.value.desvioTejeduriaMetros > 0 ? totales.value.desvioTejeduriaMetros : null,
      anudados: totales.value.anudadosCount,
      prom_anud: totalPromedioAnudado,
      desv_tej_ars: totales.value.desvioTejeduriaPesos > 0 ? totales.value.desvioTejeduriaPesos : null,
      estopa_prod: totales.value.estopaAzulProducida,
      estopa_prens: totales.value.residuosPrensadaKg,
      diferencia: totales.value.diferenciaEstopa
    })
    
    // Estilo de fila de totales
    totalRow.height = 25
    totalRow.font = { bold: true, color: { argb: 'FF1E293B' } }
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    totalRow.alignment = { horizontal: 'center', vertical: 'middle' }
    totalRow.border = {
      top: { style: 'medium', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    }
    
    // Aplicar formatos numéricos a la fila de totales
    totalRow.eachCell((cell, colNumber) => {
      const formatos = {
        2: '#,##0', 3: '#,##0', 4: '#,##0', 5: '0.0%', 6: '0.0%',
        7: '#,##0', 8: '#,##0', 9: '"$"#,##0', 10: '#,##0', 11: '#,##0',
        12: '#,##0', 13: '0.0%', 14: '#,##0', 15: '#,##0', 16: '#,##0',
        17: '#,##0.00', 18: '"$"#,##0', 19: '#,##0', 20: '#,##0', 21: '#,##0'
      }
      if (formatos[colNumber]) {
        cell.numFmt = formatos[colNumber]
      }
      
      // Línea vertical de separación (columnas 2, 10, 19)
      if (colNumber === 2 || colNumber === 10 || colNumber === 19) {
        cell.border = {
          ...cell.border,
          left: { style: 'medium', color: { argb: 'FF94A3B8' } }
        }
      }
    })
    
    // Aplicar colores y estilos a las celdas de datos
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || rowNumber === worksheet.rowCount) return // Skip header and total
      
      row.eachCell((cell, colNumber) => {
        // Bordes para todas las celdas
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        }
        
        // Línea vertical de separación (columnas 2, 10, 19)
        if (colNumber === 2 || colNumber === 10 || colNumber === 19) {
          cell.border = {
            ...cell.border,
            left: { style: 'medium', color: { argb: 'FF94A3B8' } }
          }
        }
        
        // Alineación centrada para todas las celdas
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        
        // Formatos numéricos según columna (separador de miles con punto, decimales con coma)
        const formatos = {
          1: 'dd/mm/yyyy', // Fecha
          2: '#,##0', // Producción Metros - entero
          3: '#,##0', // Producción Kg - entero
          4: '#,##0', // Residuos Kg - entero
          5: '0.0%', // Residuos % - porcentaje con 1 decimal
          6: '0.0%', // Meta - porcentaje con 1 decimal
          7: '#,##0', // Desvío Kg - entero
          8: '#,##0', // Desvío Metros - entero
          9: '"$"#,##0', // Desvío $ - moneda sin decimales
          10: '#,##0', // Tejeduría Metros - entero
          11: '#,##0', // Tejeduría Kg - entero
          12: '#,##0', // Residuos Tej Kg - entero
          13: '0.0%', // Meta Tej - porcentaje con 1 decimal
          14: '#,##0', // Desvío Tej Kg - entero
          15: '#,##0', // Desvío Tej Metros - entero
          16: '#,##0', // Anudados - entero
          17: '#,##0.00', // Promedio - con 2 decimales
          18: '"$"#,##0', // Desvío Tej $ - moneda sin decimales
          19: '#,##0', // Estopa Prod - entero
          20: '#,##0', // Estopa Prens - entero
          21: '#,##0'  // Diferencia - entero
        }
        
        if (formatos[colNumber]) {
          cell.numFmt = formatos[colNumber]
        }
        
        // Colores según columna
        const colores = {
          1: null, // Fecha
          2: null, // Producción Metros
          3: 'FF1D4ED8', // Producción Kg - azul
          4: 'FFDC2626', // Residuos Kg - rojo
          5: 'FFEA580C', // Residuos % - naranja
          6: null, // Meta
          7: 'FF9333EA', // Desvío Kg - púrpura
          8: 'FF4F46E5', // Desvío Metros - índigo
          9: 'FF15803D', // Desvío $ - verde
          10: null, // Tejeduría Metros
          11: 'FF0E7490', // Tejeduría Kg - cian
          12: 'FFBE123C', // Residuos Tej Kg - rosa
          13: null, // Meta Tej
          14: 'FF9333EA', // Desvío Tej Kg - púrpura
          15: 'FF4F46E5', // Desvío Tej Metros - índigo
          16: 'FFD97706', // Anudados - ámbar
          17: 'FF059669', // Promedio - esmeralda
          18: 'FF15803D', // Desvío Tej $ - verde
          19: 'FF2563EB', // Estopa Prod - azul
          20: 'FF16A34A', // Estopa Prens - verde
          21: 'FFEF4444'  // Diferencia - rojo
        }
        
        if (colores[colNumber]) {
          cell.font = { color: { argb: colores[colNumber] }, bold: true }
        }
      })
    })
    
    // Aplicar líneas verticales de separación a TODAS las filas (incluyendo vacías)
    for (let rowNum = 2; rowNum < worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum)
      // Asegurar que las columnas B, J y S tengan el borde izquierdo grueso
      const columnasConSeparador = [2, 10, 19]
      columnasConSeparador.forEach(colNum => {
        const cell = row.getCell(colNum)
        const borderActual = cell.border || {}
        cell.border = {
          top: borderActual.top || { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: borderActual.bottom || { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'medium', color: { argb: 'FF94A3B8' } },
          right: borderActual.right || { style: 'thin', color: { argb: 'FFE2E8F0' } }
        }
      })
    }
    
    // Establecer área de impresión (A1 hasta U[última fila])
    const lastRow = worksheet.rowCount
    worksheet.pageSetup.printArea = `A1:U${lastRow}`
    
    // Generar nombre de archivo
    const ahora = new Date()
    const dia = ahora.getDate().toString().padStart(2, '0')
    const mes = (ahora.getMonth() + 1).toString().padStart(2, '0')
    const anio = ahora.getFullYear()
    const hora = ahora.getHours().toString().padStart(2, '0')
    const minuto = ahora.getMinutes().toString().padStart(2, '0')
    
    const nombreArchivo = `Residuos_${mesFormateado.value.replace(' ', '_')}_${dia}-${mes}-${anio}_${hora}${minuto}.xlsx`
    
    // Generar y descargar archivo
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nombreArchivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    // Notificación de éxito
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Excel generado',
      text: 'Archivo descargado exitosamente',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
  } catch (error) {
    console.error('Error al exportar a Excel:', error)
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

const exportarComoImagen = async () => {
  if (!tableElementRef.value || !mainContentRef.value) return
  
  try {
    // Esperar un momento para que el DOM esté estable
    await new Promise(resolve => setTimeout(resolve, 100))

    // Esperar a que carguen fuentes (si el navegador lo soporta)
    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    // Crear un contenedor temporal para renderizar header + tabla sin scroll.
    // Importante: evitar coordenadas negativas (pueden dar capturas en blanco en algunos motores).
    const tempContainer = document.createElement('div')
    tempContainer.style.position = 'fixed'
    tempContainer.style.left = '0'
    tempContainer.style.top = '0'
    // Mantenerlo detrás para evitar que el usuario lo perciba.
    // (Moverlo fuera del viewport puede volver a dar PNG en blanco en algunos casos)
    tempContainer.style.zIndex = '-1'
    tempContainer.style.opacity = '1'
    tempContainer.style.visibility = 'hidden'
    tempContainer.style.pointerEvents = 'none'
    tempContainer.style.background = '#ffffff'
    tempContainer.style.padding = '20px'
    tempContainer.style.boxSizing = 'border-box'
    tempContainer.style.overflow = 'visible'

    // Clonar header y tabla
    const headerDiv = mainContentRef.value.querySelector('.flex.items-center.justify-between')
    if (!headerDiv) {
      throw new Error('No se encontró el header para exportar')
    }

    const headerClone = headerDiv.cloneNode(true)
    headerClone.style.marginBottom = '16px'
    headerClone.style.width = '100%'
    headerClone.style.display = 'flex'
    headerClone.style.alignItems = 'center'
    headerClone.style.justifyContent = 'space-between'

    // En la imagen exportada: dejar un margen izquierdo de 4px al logo
    const logoClone = headerClone.querySelector('img')
    if (logoClone) {
      logoClone.style.marginLeft = '4px'
    }

    // En la imagen NO mostramos botones ni datepicker; en su lugar agregamos una leyenda a la derecha
    const buildLeyendaMesParts = () => {
      if (!fechaSeleccionada.value) return null
      const [yyyyRaw, mmRaw, ddRaw] = fechaSeleccionada.value.split('-')
      const yyyy = yyyyRaw
      const mm = String(mmRaw || '').padStart(2, '0')
      const dd = String(ddRaw || '').padStart(2, '0')
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
      const mesNombre = meses[(parseInt(mm, 10) || 1) - 1] || ''

      return {
        mesYAnio: `${mesNombre} de ${yyyy}`,
        desde: `01-${mm}-${yyyy}`,
        hasta: `${dd}-${mm}-${yyyy}`
      }
    }

    // El header tiene dos hijos principales: izquierda (logo/título/costo) y derecha (botones/datepicker)
    // Reemplazamos la parte derecha por la leyenda.
    const rightSide = headerClone.children?.[1]
    if (rightSide) {
      rightSide.innerHTML = ''
      rightSide.style.display = 'flex'
      rightSide.style.alignItems = 'center'
      rightSide.style.justifyContent = 'flex-end'
      rightSide.style.gap = '0'
      rightSide.style.paddingRight = '4px'

      const parts = buildLeyendaMesParts()
      if (parts) {
        const leyenda = document.createElement('div')
        leyenda.className = 'text-sm flex items-center gap-1 whitespace-nowrap'

        const mkSpan = (text, className) => {
          const s = document.createElement('span')
          s.className = className
          s.textContent = text
          return s
        }

        leyenda.appendChild(mkSpan('Mes:', 'text-slate-600 font-medium'))
        leyenda.appendChild(mkSpan(parts.mesYAnio, 'text-slate-800 font-bold'))
        leyenda.appendChild(mkSpan('-', 'text-slate-600 font-medium'))
        leyenda.appendChild(mkSpan('desde', 'text-slate-600 font-medium'))
        leyenda.appendChild(mkSpan(parts.desde, 'text-slate-800 font-bold'))
        leyenda.appendChild(mkSpan('a', 'text-slate-600 font-medium'))
        leyenda.appendChild(mkSpan(parts.hasta, 'text-slate-800 font-bold'))

        rightSide.appendChild(leyenda)
      }
    }

    tempContainer.appendChild(headerClone)

    const tableClone = tableElementRef.value.cloneNode(true)
    tableClone.style.width = `${tableElementRef.value.scrollWidth}px`
    tableClone.style.maxWidth = 'none'
    tableClone.style.overflow = 'visible'
    tableClone.style.borderCollapse = 'collapse'
    tempContainer.appendChild(tableClone)

    // Desactivar sticky en el clon (suele romper la renderización en capturas DOM->PNG)
    const stickyNodes = Array.from(tableClone.querySelectorAll('.sticky'))
    stickyNodes.forEach(node => {
      node.classList.remove('sticky', 'top-0', 'bottom-0', 'z-10', 'shadow-sm', 'shadow-inner')
      node.style.position = 'static'
      node.style.top = 'auto'
      node.style.bottom = 'auto'
      node.style.zIndex = 'auto'
      node.style.boxShadow = 'none'
    })

    document.body.appendChild(tempContainer)

    // Esperar imágenes dentro del contenedor (logo, etc.)
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

    // Ajustar ancho/alto del contenedor para que NO se corte la última columna
    const paddingX = 20 * 2
    const paddingY = 20 * 2
    const contentWidth = tableClone.scrollWidth
    const contentHeight = headerClone.scrollHeight + tableClone.scrollHeight + 16

    // Forzar que el header clonado ocupe el mismo ancho que la tabla (para alinear la leyenda al borde derecho)
    headerClone.style.width = `${contentWidth}px`

    tempContainer.style.width = `${contentWidth + paddingX + 40}px` // +40 extra por seguridad
    tempContainer.style.height = `${contentHeight + paddingY}px`

    // Asegurar layout antes de capturar
    tempContainer.getBoundingClientRect()
    tempContainer.style.visibility = 'visible'
    await new Promise(requestAnimationFrame)

    // Capturar el contenedor temporal con tamaño fijo
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
    
    // Convertir data URL a blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    
    // Intentar copiar al portapapeles primero
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])
      
      // Mostrar notificación de éxito con toast
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
      // Si falla el portapapeles, descargar como fallback
      console.warn('No se pudo copiar al portapapeles, descargando archivo:', clipboardError)
      
      const nombreArchivo = `Residuos_INDIGO_TEJEDURIA_${mesFormateado.value.replace(' ', '_')}.png`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nombreArchivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      // Notificación de descarga
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

const abrirDetalle = (fecha) => {
  if (!fecha || fecha === null || fecha === undefined) return
  
  // Convertir DD/MM/YYYY a YYYY-MM-DD
  const [dia, mes, anio] = fecha.split('/')
  fechaModalDetalle.value = `${anio}-${mes}-${dia}`
  modalDetalle.value = true
}

onMounted(() => {
  // cargarDatos ya llama a cargarCostos internamente
  cargarDatos()
})
</script>
