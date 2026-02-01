<template>
  <div class="w-full h-screen flex flex-col p-1">
    <main class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col">
      <!-- Header con navegación -->
      <div class="flex justify-between items-center mb-4 gap-4">
        <h1 class="text-2xl font-bold text-gray-800">Informe STC Diario</h1>
        
        <!-- Navegación de fecha -->
        <div class="flex items-center gap-2">
          <button @click="previousMonth" class="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Mes anterior">
            ≪
          </button>
          <button @click="previousDay" class="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Día anterior">
            ‹
          </button>
          <input 
            type="date" 
            v-model="selectedDate" 
            @change="loadData"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button @click="nextDay" class="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Día siguiente">
            ›
          </button>
          <button @click="nextMonth" class="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Mes siguiente">
            ≫
          </button>
          <button @click="goToYesterday" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Ayer
          </button>
          <button @click="loadData" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
            ↻ Actualizar
          </button>
          <button @click="exportToExcel" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2">
            📊 Exportar Excel
          </button>
        </div>
      </div>

      <!-- Información del mes -->
      <div class="mb-3 flex items-center gap-4 text-sm">
        <span class="font-semibold text-gray-700">Mes: {{ monthName }} {{ year }}</span>
        <span class="text-gray-600">Día seleccionado: {{ formatDate(selectedDate) }}</span>
        <span class="text-gray-600">Días del mes: {{ daysInMonth }}</span>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="loading" class="flex-1 p-4">
        <SkeletonLoader type="table" :rows="15" :columns="8" />
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && hasLoadedOnce && daysData.length === 0" class="flex-1">
        <EmptyState 
          icon="📊"
          title="No hay datos para este período"
          description="No se encontraron datos de producción para el mes seleccionado."
          :show-action="true"
          action-text="Actualizar"
          @action="loadData"
        />
      </div>

      <!-- Tabla de datos -->
      <div v-else class="flex-1 overflow-auto border border-gray-200 rounded-lg">
        <table class="min-w-full divide-y divide-gray-200 text-xs">
          <colgroup>
            <col style="width: 60px;"> <!-- Día -->
            <!-- INDIGO -->
            <col style="width: 70px;" span="6">
            <!-- TECELAGEM -->
            <col style="width: 70px;" span="8">
            <!-- ACABAMENTO -->
            <col style="width: 70px;" span="3">
            <!-- CALIDAD -->
            <col style="width: 70px;" span="7">
          </colgroup>
          
          <thead class="sticky top-0 z-10">
            <!-- Fila 1: Sectores -->
            <tr style="background-color: #2563eb;">
              <th style="background-color: #2563eb; color: white;" class="px-2 py-2 text-center font-bold border-r border-blue-500"></th>
              <th colspan="6" style="background-color: #2563eb; color: white;" class="px-2 py-2 text-center font-bold border-r border-blue-500">INDIGO</th>
              <th colspan="8" style="background-color: #2563eb; color: white;" class="px-2 py-2 text-center font-bold border-r border-blue-500">TECELAGEM</th>
              <th colspan="3" style="background-color: #2563eb; color: white;" class="px-2 py-2 text-center font-bold border-r border-blue-500">ACABAMENTO</th>
              <th colspan="7" style="background-color: #2563eb; color: white;" class="px-2 py-2 text-center font-bold">CALIDAD</th>
            </tr>
            
            <!-- Fila 2: Columnas -->
            <tr class="bg-gray-100">
              <th class="px-2 py-2 text-center font-semibold text-gray-700 border-r">Día</th>
              
              <!-- INDIGO -->
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Efic.%</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Produc.</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Meta</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Saldo</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Meta Ajust.</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 border-r">Veloc.</th>
              
              <!-- TECELAGEM -->
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Telares</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Batidas</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">RPM</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Efic.%</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Produc.</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Meta</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Saldo</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 border-r">Meta Ajust.</th>
              
              <!-- ACABAMENTO -->
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Produc.</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Meta</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700 border-r">Saldo</th>
              
              <!-- CALIDAD -->
              <th class="px-2 py-2 text-center font-semibold text-gray-700">1ª Qual.%</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Pts/100m²</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Produc.</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Meta</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Saldo</th>
              <th class="px-2 py-2 text-center font-semibold text-gray-700">Meta Ajust.</th>
            </tr>
          </thead>
          
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="day in daysData" :key="day.dayNumber" 
                :class="day.hasData ? 'hover:bg-blue-50' : 'bg-gray-50'"
                class="transition-colors">
              <td class="px-2 py-1 text-center font-medium text-gray-900 border-r">
                {{ day.dayLabel }}
              </td>
              
              <!-- INDIGO -->
              <td class="px-2 py-1 text-right" :class="getCellClass(day.indigo?.eficiencia)">
                {{ formatNumber(day.indigo?.eficiencia, 1) }}
              </td>
              <td class="px-2 py-1 text-right">{{ formatNumber(day.indigo?.produccion, 0) }}</td>
              <td class="px-2 py-1 text-right text-gray-600">{{ formatNumber(day.indigo?.meta, 0) }}</td>
              <td class="px-2 py-1 text-right" :class="getSaldoClass(day.indigo?.saldo)">
                {{ formatNumber(day.indigo?.saldo, 0) }}
              </td>
              <td class="px-2 py-1 text-right text-blue-700 font-medium">
                {{ formatNumber(day.indigo?.metaAjustada, 0) }}
              </td>
              <td class="px-2 py-1 text-right border-r">{{ formatNumber(day.indigo?.velocidad, 1) }}</td>
              
              <!-- TECELAGEM -->
              <td class="px-2 py-1 text-right">{{ formatTelares(day.tecelagem?.telares) }}</td>
              <td class="px-2 py-1 text-right">{{ formatNumber(day.tecelagem?.batidas, 1) }}</td>
              <td class="px-2 py-1 text-right">{{ formatNumber(day.tecelagem?.rpm, 0) }}</td>
              <td class="px-2 py-1 text-right" :class="getCellClass(day.tecelagem?.eficiencia)">
                {{ formatNumber(day.tecelagem?.eficiencia, 1) }}
              </td>
              <td class="px-2 py-1 text-right">{{ formatNumber(day.tecelagem?.produccion, 0) }}</td>
              <td class="px-2 py-1 text-right text-gray-600">{{ formatNumber(day.tecelagem?.meta, 0) }}</td>
              <td class="px-2 py-1 text-right" :class="getSaldoClass(day.tecelagem?.saldo)">
                {{ formatNumber(day.tecelagem?.saldo, 0) }}
              </td>
              <td class="px-2 py-1 text-right text-blue-700 font-medium border-r">
                {{ formatNumber(day.tecelagem?.metaAjustada, 0) }}
              </td>
              
              <!-- ACABAMENTO -->
              <td class="px-2 py-1 text-right">{{ formatNumber(day.acabamento?.produccion, 0) }}</td>
              <td class="px-2 py-1 text-right text-gray-600">{{ formatNumber(day.acabamento?.meta, 0) }}</td>
              <td class="px-2 py-1 text-right border-r" :class="getSaldoClass(day.acabamento?.saldo)">
                {{ formatNumber(day.acabamento?.saldo, 0) }}
              </td>
              
              <!-- CALIDAD -->
              <td class="px-2 py-1 text-right" :class="getCellClass(day.acabamento?.primeraCalidad)">
                {{ formatNumber(day.acabamento?.primeraCalidad, 2) }}
              </td>
              <td class="px-2 py-1 text-right">{{ formatNumber(day.calidad?.puntos100m2, 2) }}</td>
              <td class="px-2 py-1 text-right">{{ formatNumber(day.calidad?.produccion, 0) }}</td>
              <td class="px-2 py-1 text-right text-gray-600">{{ formatNumber(day.calidad?.meta, 0) }}</td>
              <td class="px-2 py-1 text-right" :class="getSaldoClass(day.calidad?.saldo)">
                {{ formatNumber(day.calidad?.saldo, 0) }}
              </td>
              <td class="px-2 py-1 text-right text-blue-700 font-medium">
                {{ formatNumber(day.calidad?.metaAjustada, 0) }}
              </td>
            </tr>
          </tbody>
          
          <!-- TOTALES -->
          <tfoot>
            <tr class="bg-blue-50 font-bold border-t-2 border-blue-600">
              <td class="px-2 py-2 text-left">TOTAL</td>
              <!-- INDIGO -->
              <td class="px-2 py-1 text-right"></td>
              <td class="px-2 py-1 text-right">{{ formatNumber(totales.indigo.produccion, 0) }}</td>
              <td class="px-2 py-1 text-right text-gray-600">{{ formatNumber(totales.indigo.meta, 0) }}</td>
              <td class="px-2 py-1 text-right" :class="getSaldoClass(totales.indigo.saldo)">
                {{ formatNumber(totales.indigo.saldo, 0) }}
              </td>
              <td class="px-2 py-1 text-right"></td>
              <td class="px-2 py-1 text-right border-r"></td>
              
              <!-- TECELAGEM -->
              <td class="px-2 py-1 text-right"></td>
              <td class="px-2 py-1 text-right"></td>
              <td class="px-2 py-1 text-right"></td>
              <td class="px-2 py-1 text-right"></td>
              <td class="px-2 py-1 text-right">{{ formatNumber(totales.tecelagem.produccion, 0) }}</td>
              <td class="px-2 py-1 text-right text-gray-600">{{ formatNumber(totales.tecelagem.meta, 0) }}</td>
              <td class="px-2 py-1 text-right" :class="getSaldoClass(totales.tecelagem.saldo)">
                {{ formatNumber(totales.tecelagem.saldo, 0) }}
              </td>
              <td class="px-2 py-1 text-right border-r"></td>
              
              <!-- ACABAMENTO -->
              <td class="px-2 py-1 text-right">{{ formatNumber(totales.acabamento.produccion, 0) }}</td>
              <td class="px-2 py-1 text-right text-gray-600">{{ formatNumber(totales.acabamento.meta, 0) }}</td>
              <td class="px-2 py-1 text-right border-r" :class="getSaldoClass(totales.acabamento.saldo)">
                {{ formatNumber(totales.acabamento.saldo, 0) }}
              </td>
              
              <!-- CALIDAD -->
              <td class="px-2 py-1 text-right"></td>
              <td class="px-2 py-1 text-right"></td>
              <td class="px-2 py-1 text-right">{{ formatNumber(totales.calidad.produccion, 0) }}</td>
              <td class="px-2 py-1 text-right text-gray-600">{{ formatNumber(totales.calidad.meta, 0) }}</td>
              <td class="px-2 py-1 text-right" :class="getSaldoClass(totales.calidad.saldo)">
                {{ formatNumber(totales.calidad.saldo, 0) }}
              </td>
              <td class="px-2 py-1 text-right"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import ExcelJS from 'exceljs'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useNotifications } from '@/composables/useNotifications'
import { SkeletonLoader, EmptyState } from '@/components/ui'

const API_URL = 'http://localhost:3002/api'

// Composables
const { handleError, tryCatch } = useErrorHandler()
const notifications = useNotifications()

const selectedDate = ref('')
const loading = ref(false)
const daysData = ref([])
const hasLoadedOnce = ref(false)

// Computed properties
const year = computed(() => {
  return new Date(selectedDate.value).getFullYear()
})

const month = computed(() => {
  return new Date(selectedDate.value).getMonth()
})

const monthName = computed(() => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return months[month.value]
})

const daysInMonth = computed(() => {
  return new Date(year.value, month.value + 1, 0).getDate()
})

// Totales
const totales = computed(() => {
  const result = {
    indigo: { produccion: 0, meta: 0, saldo: 0 },
    tecelagem: { produccion: 0, meta: 0, saldo: 0 },
    acabamento: { produccion: 0, meta: 0, saldo: 0 },
    calidad: { produccion: 0, meta: 0, saldo: 0 }
  }
  
  daysData.value.forEach(day => {
    result.indigo.produccion += day.indigo?.produccion || 0
    result.indigo.meta += day.indigo?.meta || 0
    result.tecelagem.produccion += day.tecelagem?.produccion || 0
    result.tecelagem.meta += day.tecelagem?.meta || 0
    result.acabamento.produccion += day.acabamento?.produccion || 0
    result.acabamento.meta += day.acabamento?.meta || 0
    result.calidad.produccion += day.calidad?.produccion || 0
    result.calidad.meta += day.calidad?.meta || 0
  })
  
  result.indigo.saldo = result.indigo.produccion - result.indigo.meta
  result.tecelagem.saldo = result.tecelagem.produccion - result.tecelagem.meta
  result.acabamento.saldo = result.acabamento.produccion - result.acabamento.meta
  result.calidad.saldo = result.calidad.produccion - result.calidad.meta
  
  return result
})

// Funciones de navegación
function goToYesterday() {
  // Obtener fecha actual en hora local (sin problemas de timezone)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // getMonth() es 0-indexed
  const day = now.getDate() - 1 // Restar 1 día
  
  // Crear fecha de ayer ajustando si es necesario
  const yesterday = new Date(year, month - 1, day)
  const y = yesterday.getFullYear()
  const m = String(yesterday.getMonth() + 1).padStart(2, '0')
  const d = String(yesterday.getDate()).padStart(2, '0')
  
  selectedDate.value = `${y}-${m}-${d}`
  loadData()
}

function previousDay() {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() - 1)
  selectedDate.value = date.toISOString().split('T')[0]
  loadData()
}

function nextDay() {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() + 1)
  selectedDate.value = date.toISOString().split('T')[0]
  loadData()
}

function previousMonth() {
  const [year, month, day] = selectedDate.value.split('-').map(Number)
  
  // Calcular mes anterior
  let newYear = year
  let newMonth = month - 1
  
  if (newMonth === 0) {
    newMonth = 12
    newYear = year - 1
  }
  
  // Obtener último día del nuevo mes
  const lastDay = new Date(newYear, newMonth, 0).getDate()
  
  // Formatear fecha manualmente YYYY-MM-DD
  const formattedDate = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  selectedDate.value = formattedDate
  loadData()
}

function nextMonth() {
  const [year, month, day] = selectedDate.value.split('-').map(Number)
  
  // Calcular mes siguiente
  let newYear = year
  let newMonth = month + 1
  
  if (newMonth === 13) {
    newMonth = 1
    newYear = year + 1
  }
  
  // Obtener último día del nuevo mes
  const lastDay = new Date(newYear, newMonth, 0).getDate()
  
  // Formatear fecha manualmente YYYY-MM-DD
  const formattedDate = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  selectedDate.value = formattedDate
  loadData()
}

// Cargar datos
async function loadData() {
  loading.value = true
  
  const result = await tryCatch(async () => {
    const res = await fetch(`${API_URL}/informe-diario?fecha=${selectedDate.value}`)
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || `Error HTTP ${res.status}`)
    }
    return res.json()
  }, 'Cargar Informe Diario')
  
  if (result) {
    daysData.value = result.days || []
  }
  
  hasLoadedOnce.value = true
  loading.value = false
}

// Formateo
function formatDate(dateStr) {
  if (!dateStr) return '-'
  // Parsear directamente sin conversión de timezone
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || value === '') return '-'
  
  const num = Number(value)
  if (isNaN(num)) return '-'
  
  // Separar parte entera y decimal
  const fixed = num.toFixed(decimals)
  const [integerPart, decimalPart] = fixed.split('.')
  
  // Formatear parte entera con separador de miles (punto)
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  // Retornar con parte decimal si corresponde
  return decimals > 0 ? `${formattedInteger},${decimalPart}` : formattedInteger
}

function formatTelares(value) {
  if (value === null || value === undefined || value === '') return '-'
  
  const num = Number(value)
  if (isNaN(num)) return '-'
  
  // Si es un número entero (sin decimales significativos), mostrar sin decimales
  if (Math.abs(num - Math.round(num)) < 0.01) {
    return formatNumber(num, 0)
  }
  
  // Si tiene decimales, mostrar 1 decimal
  return formatNumber(num, 1)
}

function getCellClass(value) {
  if (!value) return ''
  if (value >= 80) return 'bg-green-100 text-green-800 font-semibold'
  if (value >= 60) return 'bg-yellow-100 text-yellow-800'
  if (value < 60) return 'bg-red-100 text-red-800'
  return ''
}

function getSaldoClass(value) {
  if (!value) return ''
  if (value > 0) return 'text-green-700 font-semibold'
  if (value < 0) return 'text-red-700 font-semibold'
  return ''
}

// Exportar a Excel con estilos
async function exportToExcel() {
  if (!daysData.value || daysData.value.length === 0) {
    notifications.warning('No hay datos para exportar')
    return
  }

  try {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Informe Diario')

    // Total de columnas: 1 (Día) + 6 (INDIGO) + 8 (TECELAGEM) + 3 (ACABAMENTO) + 7 (CALIDAD) = 25
    const totalCols = 25
    
    // Configurar anchos de columna
    worksheet.columns = [
      { width: 10 }, // Día
      // INDIGO (6)
      { width: 10 }, // Efic.%
      { width: 12 }, // Produc.
      { width: 12 }, // Meta
      { width: 12 }, // Saldo
      { width: 12 }, // Meta Ajust.
      { width: 10 }, // Veloc.
      // TECELAGEM (8)
      { width: 10 }, // Telares
      { width: 10 }, // Batidas
      { width: 10 }, // RPM
      { width: 10 }, // Efic.%
      { width: 12 }, // Produc.
      { width: 12 }, // Meta
      { width: 12 }, // Saldo
      { width: 12 }, // Meta Ajust.
      // ACABAMENTO (3)
      { width: 12 }, // Produc.
      { width: 12 }, // Meta
      { width: 12 }, // Saldo
      // CALIDAD (7)
      { width: 10 }, // 1ª Qual.%
      { width: 10 }, // Pts/100m²
      { width: 12 }, // Produc.
      { width: 12 }, // Meta
      { width: 12 }, // Saldo
      { width: 12 }  // Meta Ajust.
    ]

    // Título principal
    worksheet.mergeCells('A1:Y1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = `Informe STC Diario - ${monthName.value} ${year.value}`
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E40AF' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }

    // Fecha seleccionada
    worksheet.mergeCells('A2:Y2')
    const dateCell = worksheet.getCell('A2')
    dateCell.value = `Fecha: ${formatDate(selectedDate.value)}`
    dateCell.font = { size: 11, italic: true }
    dateCell.alignment = { horizontal: 'center' }

    // Encabezados de sección (Fila 3)
    worksheet.mergeCells('A3:A4')
    worksheet.getCell('A3').value = 'Día'
    
    worksheet.mergeCells('B3:G3')
    worksheet.getCell('B3').value = 'INDIGO'
    
    worksheet.mergeCells('H3:O3')
    worksheet.getCell('H3').value = 'TECELAGEM'
    
    worksheet.mergeCells('P3:R3')
    worksheet.getCell('P3').value = 'ACABAMENTO'
    
    worksheet.mergeCells('S3:Y3')
    worksheet.getCell('S3').value = 'CALIDAD'
    
    // Sub-encabezados (Fila 4)
    const headers = [
      'Día',
      // INDIGO
      'Efic.%', 'Produc.', 'Meta', 'Saldo', 'Meta Ajust.', 'Veloc.',
      // TECELAGEM
      'Telares', 'Batidas', 'RPM', 'Efic.%', 'Produc.', 'Meta', 'Saldo', 'Meta Ajust.',
      // ACABAMENTO
      'Produc.', 'Meta', 'Saldo',
      // CALIDAD
      '1ª Qual.%', 'Pts/100m²', 'Produc.', 'Meta', 'Saldo', 'Meta Ajust.'
    ]
    const headerRow = worksheet.getRow(4)
    headers.forEach((header, index) => {
      if (index > 0) {
        const cell = headerRow.getCell(index + 1)
        cell.value = header
      }
    })

    // Estilo para encabezados
    for (let col = 1; col <= totalCols; col++) {
      const cell3 = worksheet.getCell(3, col)
      const cell4 = worksheet.getCell(4, col)
      
      const headerStyle = {
        font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      }
      
      cell3.font = headerStyle.font
      cell3.fill = headerStyle.fill
      cell3.alignment = headerStyle.alignment
      cell3.border = headerStyle.border
      
      cell4.font = headerStyle.font
      cell4.fill = headerStyle.fill
      cell4.alignment = headerStyle.alignment
      cell4.border = headerStyle.border
    }

    // Datos
    let rowIndex = 5
    daysData.value.forEach(day => {
      const row = worksheet.getRow(rowIndex)
      let colIndex = 1
      
      // Día
      row.getCell(colIndex++).value = day.dayLabel
      row.getCell(1).alignment = { horizontal: 'left' }
      
      // === INDIGO ===
      // Eficiencia
      const eficIndigo = day.indigo?.eficiencia
      row.getCell(colIndex).value = eficIndigo || null
      if (eficIndigo) {
        row.getCell(colIndex).numFmt = '0.0'
        if (eficIndigo >= 80) {
          row.getCell(colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
          row.getCell(colIndex).font = { color: { argb: 'FF065F46' }, bold: true }
        } else if (eficIndigo >= 60) {
          row.getCell(colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
          row.getCell(colIndex).font = { color: { argb: 'FF92400E' } }
        } else {
          row.getCell(colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }
          row.getCell(colIndex).font = { color: { argb: 'FF991B1B' } }
        }
      }
      colIndex++
      
      // Producción
      row.getCell(colIndex++).value = day.indigo?.produccion || 0
      row.getCell(colIndex-1).numFmt = '#,##0'
      
      // Meta
      row.getCell(colIndex++).value = day.indigo?.meta || 0
      row.getCell(colIndex-1).numFmt = '#,##0'
      row.getCell(colIndex-1).font = { color: { argb: 'FF4B5563' } }
      
      // Saldo
      const saldoIndigo = day.indigo?.saldo
      if (saldoIndigo !== null && saldoIndigo !== undefined) {
        row.getCell(colIndex).value = saldoIndigo
        row.getCell(colIndex).numFmt = '#,##0'
        if (saldoIndigo > 0) {
          row.getCell(colIndex).font = { color: { argb: 'FF15803D' }, bold: true }
        } else if (saldoIndigo < 0) {
          row.getCell(colIndex).font = { color: { argb: 'FFB91C1C' }, bold: true }
        }
      }
      colIndex++
      
      // Meta Ajustada
      const metaAjustIndigo = day.indigo?.metaAjustada
      if (metaAjustIndigo !== null && metaAjustIndigo !== undefined) {
        row.getCell(colIndex).value = metaAjustIndigo
        row.getCell(colIndex).numFmt = '#,##0'
        row.getCell(colIndex).font = { color: { argb: 'FF1D4ED8' }, bold: true }
      }
      colIndex++
      
      // Velocidad
      const velocIndigo = day.indigo?.velocidad
      if (velocIndigo) {
        row.getCell(colIndex).value = velocIndigo
        row.getCell(colIndex).numFmt = '0.0'
      }
      colIndex++
      
      // === TECELAGEM ===
      // Telares
      const telares = day.tecelagem?.telares
      if (telares) {
        row.getCell(colIndex).value = telares
        row.getCell(colIndex).numFmt = Math.abs(telares - Math.round(telares)) < 0.01 ? '0' : '0.0'
      }
      colIndex++
      
      // Batidas
      const batidas = day.tecelagem?.batidas
      if (batidas) {
        row.getCell(colIndex).value = batidas
        row.getCell(colIndex).numFmt = '0.0'
      }
      colIndex++
      
      // RPM
      const rpm = day.tecelagem?.rpm
      if (rpm) {
        row.getCell(colIndex).value = rpm
        row.getCell(colIndex).numFmt = '0'
      }
      colIndex++
      
      // Eficiencia
      const eficTecelagem = day.tecelagem?.eficiencia
      row.getCell(colIndex).value = eficTecelagem || null
      if (eficTecelagem) {
        row.getCell(colIndex).numFmt = '0.0'
        if (eficTecelagem >= 80) {
          row.getCell(colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
          row.getCell(colIndex).font = { color: { argb: 'FF065F46' }, bold: true }
        } else if (eficTecelagem >= 60) {
          row.getCell(colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
          row.getCell(colIndex).font = { color: { argb: 'FF92400E' } }
        } else {
          row.getCell(colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }
          row.getCell(colIndex).font = { color: { argb: 'FF991B1B' } }
        }
      }
      colIndex++
      
      // Producción
      row.getCell(colIndex++).value = day.tecelagem?.produccion || 0
      row.getCell(colIndex-1).numFmt = '#,##0'
      
      // Meta
      row.getCell(colIndex++).value = day.tecelagem?.meta || 0
      row.getCell(colIndex-1).numFmt = '#,##0'
      row.getCell(colIndex-1).font = { color: { argb: 'FF4B5563' } }
      
      // Saldo
      const saldoTecelagem = day.tecelagem?.saldo
      if (saldoTecelagem !== null && saldoTecelagem !== undefined) {
        row.getCell(colIndex).value = saldoTecelagem
        row.getCell(colIndex).numFmt = '#,##0'
        if (saldoTecelagem > 0) {
          row.getCell(colIndex).font = { color: { argb: 'FF15803D' }, bold: true }
        } else if (saldoTecelagem < 0) {
          row.getCell(colIndex).font = { color: { argb: 'FFB91C1C' }, bold: true }
        }
      }
      colIndex++
      
      // Meta Ajustada
      const metaAjustTecelagem = day.tecelagem?.metaAjustada
      if (metaAjustTecelagem !== null && metaAjustTecelagem !== undefined) {
        row.getCell(colIndex).value = metaAjustTecelagem
        row.getCell(colIndex).numFmt = '#,##0'
        row.getCell(colIndex).font = { color: { argb: 'FF1D4ED8' }, bold: true }
      }
      colIndex++
      
      // === ACABAMENTO ===
      // Producción
      row.getCell(colIndex++).value = day.acabamento?.produccion || 0
      row.getCell(colIndex-1).numFmt = '#,##0'
      
      // Meta
      row.getCell(colIndex++).value = day.acabamento?.meta || 0
      row.getCell(colIndex-1).numFmt = '#,##0'
      row.getCell(colIndex-1).font = { color: { argb: 'FF4B5563' } }
      
      // Saldo
      const saldoAcabamento = day.acabamento?.saldo
      if (saldoAcabamento !== null && saldoAcabamento !== undefined) {
        row.getCell(colIndex).value = saldoAcabamento
        row.getCell(colIndex).numFmt = '#,##0'
        if (saldoAcabamento > 0) {
          row.getCell(colIndex).font = { color: { argb: 'FF15803D' }, bold: true }
        } else if (saldoAcabamento < 0) {
          row.getCell(colIndex).font = { color: { argb: 'FFB91C1C' }, bold: true }
        }
      }
      colIndex++
      
      // === CALIDAD ===
      // 1ª Qual.%
      const primeraCalidad = day.acabamento?.primeraCalidad
      if (primeraCalidad) {
        row.getCell(colIndex).value = primeraCalidad
        row.getCell(colIndex).numFmt = '0.00'
        if (primeraCalidad >= 80) {
          row.getCell(colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
          row.getCell(colIndex).font = { color: { argb: 'FF065F46' }, bold: true }
        } else if (primeraCalidad >= 60) {
          row.getCell(colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
          row.getCell(colIndex).font = { color: { argb: 'FF92400E' } }
        } else {
          row.getCell(colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }
          row.getCell(colIndex).font = { color: { argb: 'FF991B1B' } }
        }
      }
      colIndex++
      
      // Pts/100m²
      const puntos = day.calidad?.puntos100m2
      if (puntos) {
        row.getCell(colIndex).value = puntos
        row.getCell(colIndex).numFmt = '0.00'
      }
      colIndex++
      
      // Producción
      row.getCell(colIndex++).value = day.calidad?.produccion || 0
      row.getCell(colIndex-1).numFmt = '#,##0'
      
      // Meta
      row.getCell(colIndex++).value = day.calidad?.meta || 0
      row.getCell(colIndex-1).numFmt = '#,##0'
      row.getCell(colIndex-1).font = { color: { argb: 'FF4B5563' } }
      
      // Saldo
      const saldoCalidad = day.calidad?.saldo
      if (saldoCalidad !== null && saldoCalidad !== undefined) {
        row.getCell(colIndex).value = saldoCalidad
        row.getCell(colIndex).numFmt = '#,##0'
        if (saldoCalidad > 0) {
          row.getCell(colIndex).font = { color: { argb: 'FF15803D' }, bold: true }
        } else if (saldoCalidad < 0) {
          row.getCell(colIndex).font = { color: { argb: 'FFB91C1C' }, bold: true }
        }
      }
      colIndex++
      
      // Meta Ajustada
      const metaAjustCalidad = day.calidad?.metaAjustada
      if (metaAjustCalidad !== null && metaAjustCalidad !== undefined) {
        row.getCell(colIndex).value = metaAjustCalidad
        row.getCell(colIndex).numFmt = '#,##0'
        row.getCell(colIndex).font = { color: { argb: 'FF1D4ED8' }, bold: true }
      }
      colIndex++
      
      // Alineación y bordes para todas las celdas
      for (let col = 1; col <= totalCols; col++) {
        const cell = row.getCell(col)
        if (col > 1) {
          cell.alignment = { horizontal: 'right' }
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }
      }
      
      rowIndex++
    })
    
    // Fila de totales
    const totalRow = worksheet.getRow(rowIndex)
    totalRow.getCell(1).value = 'TOTAL'
    totalRow.getCell(1).font = { bold: true, size: 11 }
    
    // INDIGO
    totalRow.getCell(2).value = null // Efic.
    totalRow.getCell(3).value = totales.value.indigo.produccion
    totalRow.getCell(3).numFmt = '#,##0'
    totalRow.getCell(3).font = { bold: true }
    totalRow.getCell(4).value = totales.value.indigo.meta
    totalRow.getCell(4).numFmt = '#,##0'
    totalRow.getCell(4).font = { bold: true, color: { argb: 'FF4B5563' } }
    totalRow.getCell(5).value = totales.value.indigo.saldo
    totalRow.getCell(5).numFmt = '#,##0'
    totalRow.getCell(5).font = { bold: true, color: { argb: totales.value.indigo.saldo > 0 ? 'FF15803D' : 'FFB91C1C' } }
    totalRow.getCell(6).value = null // Meta Ajust.
    totalRow.getCell(7).value = null // Veloc.
    
    // TECELAGEM
    totalRow.getCell(8).value = null // Telares
    totalRow.getCell(9).value = null // Batidas
    totalRow.getCell(10).value = null // RPM
    totalRow.getCell(11).value = null // Efic.
    totalRow.getCell(12).value = totales.value.tecelagem.produccion
    totalRow.getCell(12).numFmt = '#,##0'
    totalRow.getCell(12).font = { bold: true }
    totalRow.getCell(13).value = totales.value.tecelagem.meta
    totalRow.getCell(13).numFmt = '#,##0'
    totalRow.getCell(13).font = { bold: true, color: { argb: 'FF4B5563' } }
    totalRow.getCell(14).value = totales.value.tecelagem.saldo
    totalRow.getCell(14).numFmt = '#,##0'
    totalRow.getCell(14).font = { bold: true, color: { argb: totales.value.tecelagem.saldo > 0 ? 'FF15803D' : 'FFB91C1C' } }
    totalRow.getCell(15).value = null // Meta Ajust.
    
    // ACABAMENTO
    totalRow.getCell(16).value = totales.value.acabamento.produccion
    totalRow.getCell(16).numFmt = '#,##0'
    totalRow.getCell(16).font = { bold: true }
    totalRow.getCell(17).value = totales.value.acabamento.meta
    totalRow.getCell(17).numFmt = '#,##0'
    totalRow.getCell(17).font = { bold: true, color: { argb: 'FF4B5563' } }
    totalRow.getCell(18).value = totales.value.acabamento.saldo
    totalRow.getCell(18).numFmt = '#,##0'
    totalRow.getCell(18).font = { bold: true, color: { argb: totales.value.acabamento.saldo > 0 ? 'FF15803D' : 'FFB91C1C' } }
    
    // CALIDAD
    totalRow.getCell(19).value = null // 1ª Qual.
    totalRow.getCell(20).value = null // Pts/100m²
    totalRow.getCell(21).value = totales.value.calidad.produccion
    totalRow.getCell(21).numFmt = '#,##0'
    totalRow.getCell(21).font = { bold: true }
    totalRow.getCell(22).value = totales.value.calidad.meta
    totalRow.getCell(22).numFmt = '#,##0'
    totalRow.getCell(22).font = { bold: true, color: { argb: 'FF4B5563' } }
    totalRow.getCell(23).value = totales.value.calidad.saldo
    totalRow.getCell(23).numFmt = '#,##0'
    totalRow.getCell(23).font = { bold: true, color: { argb: totales.value.calidad.saldo > 0 ? 'FF15803D' : 'FFB91C1C' } }
    totalRow.getCell(24).value = null // Meta Ajust.
    
    // Estilo para fila de totales
    for (let col = 1; col <= totalCols; col++) {
      const cell = totalRow.getCell(col)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      cell.border = {
        top: { style: 'double', color: { argb: 'FF1E40AF' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      }
      if (col > 1) {
        cell.alignment = { horizontal: 'right' }
      }
    }

    // Ajustar altura de filas
    worksheet.getRow(1).height = 30
    worksheet.getRow(2).height = 20
    worksheet.getRow(3).height = 25
    worksheet.getRow(4).height = 25

    // Generar archivo y descargar
    const fecha = selectedDate.value.replace(/-/g, '')
    const now = new Date()
    const timestamp = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Informe_STC_Diario_${fecha}_${timestamp}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)

    notifications.success('Excel exportado correctamente')
  } catch (error) {
    handleError(error, 'Exportar Excel')
  }
}

onMounted(() => {
  goToYesterday()
})
</script>

<style scoped>
/* Estilos para scroll horizontal */
table {
  border-collapse: separate;
  border-spacing: 0;
}

thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: white;
}

/* Bordes más visibles entre sectores */
td.border-r,
th.border-r {
  border-right: 2px solid #cbd5e1;
}
</style>
