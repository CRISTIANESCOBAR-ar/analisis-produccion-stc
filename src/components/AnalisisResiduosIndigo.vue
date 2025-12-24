<template>
  <div class="w-full h-screen flex flex-col p-1">
    <main class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col relative">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4 flex-shrink-0 mb-4">
        <div class="flex items-center gap-6">
          <img src="/LogoSantana.jpg" alt="Santana Textiles" class="h-10 w-auto object-contain" />
          <h3 class="text-lg font-semibold text-slate-800">Análisis Residuos de Índigo</h3>
        </div>
        
        <div class="flex items-center gap-2">
          <CustomDatepicker 
            v-model="fechaSeleccionada" 
            label="Hasta:" 
            :show-buttons="true"
            @change="cargarDatos" 
          />
        </div>
      </div>

      <!-- Charts Container -->
      <div class="flex-1 min-h-0 relative flex flex-col gap-4">
        <div v-if="cargando" class="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
        
        <!-- Fila 1: Gráficos del Periodo -->
        <div class="flex-1 flex gap-4">
          <!-- Gráfico de Motivos de Residuos - Periodo -->
          <div class="flex-[3] h-full p-4 border border-slate-200 rounded-lg">
            <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
            <div v-else-if="!cargando" class="h-full flex items-center justify-center text-slate-400">
              No hay datos para el período seleccionado
            </div>
          </div>

          <!-- Gráfico de Columna S - Periodo -->
          <div class="flex-[1] h-full p-4 border border-slate-200 rounded-lg">
            <Bar v-if="chartDataS" :data="chartDataS" :options="chartOptionsS" />
            <div v-else-if="!cargando" class="h-full flex items-center justify-center text-slate-400">
              No hay datos disponibles
            </div>
          </div>
        </div>

        <!-- Fila 2: Gráficos del Día Específico -->
        <div class="flex-1 flex gap-4">
          <!-- Gráfico de Motivos de Residuos - Día -->
          <div class="flex-[3] h-full p-4 border border-slate-200 rounded-lg">
            <Bar v-if="chartDataDia" :data="chartDataDia" :options="chartOptionsDia" />
            <div v-else-if="!cargando" class="h-full flex items-center justify-center text-slate-400">
              No hay datos para el día seleccionado
            </div>
          </div>

          <!-- Gráfico de Columna S - Día -->
          <div class="flex-[1] h-full p-4 border border-slate-200 rounded-lg">
            <Bar v-if="chartDataDiaS" :data="chartDataDiaS" :options="chartOptionsDiaS" />
            <div v-else-if="!cargando" class="h-full flex items-center justify-center text-slate-400">
              No hay datos disponibles
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import CustomDatepicker from './CustomDatepicker.vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartDataLabels)

const API_BASE = 'http://localhost:3002/api'
const cargando = ref(false)
const datos = ref([])
const datosS = ref([])
const datosDia = ref([])
const datosDiaS = ref([])

// Inicializar con ayer
const getYesterday = () => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fechaSeleccionada = ref(getYesterday())

const cargarDatos = async () => {
  cargando.value = true
  try {
    const [year, month, day] = fechaSeleccionada.value.split('-')
    const fechaInicio = `01/${month}/${year}`
    const fechaFin = `${day}/${month}/${year}`
    const fechaDia = `${day}/${month}/${year}`
    
    // Cargar datos del periodo y del día específico en paralelo
    const [respMotivos, respS, respMotivosDia, respSDia] = await Promise.all([
      fetch(`${API_BASE}/residuos-indigo-analisis?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`),
      fetch(`${API_BASE}/produccion-indigo-resumen?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`),
      fetch(`${API_BASE}/residuos-indigo-analisis?fecha_inicio=${fechaDia}&fecha_fin=${fechaDia}`),
      fetch(`${API_BASE}/produccion-indigo-resumen?fecha_inicio=${fechaDia}&fecha_fin=${fechaDia}`)
    ])
    
    if (!respMotivos.ok || !respS.ok || !respMotivosDia.ok || !respSDia.ok) {
      throw new Error('Error al cargar datos')
    }
    
    datos.value = await respMotivos.json()
    const dataS = await respS.json()
    datosS.value = dataS.s_valores || []
    
    datosDia.value = await respMotivosDia.json()
    const dataSDia = await respSDia.json()
    datosDiaS.value = dataSDia.s_valores || []
  } catch (error) {
    console.error('Error:', error)
    datos.value = []
    datosS.value = []
    datosDia.value = []
    datosDiaS.value = []
  } finally {
    cargando.value = false
  }
}

const chartData = computed(() => {
  if (datos.value.length === 0) return null
  
  // Función para dividir labels largos en múltiples líneas
  const splitLabel = (text, maxLength = 10) => {
    const words = text.split(' ')
    const lines = []
    let currentLine = ''
    
    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxLength) {
        currentLine = currentLine ? currentLine + ' ' + word : word
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    })
    if (currentLine) lines.push(currentLine)
    
    return lines
  }
  
  // Encontrar el valor máximo
  const maxValue = Math.max(...datos.value.map(d => d.TotalKg))
  
  return {
    labels: datos.value.map(d => splitLabel(d.DESC_MOTIVO)),
    datasets: [
      {
        label: 'Kg Residuos',
        data: datos.value.map(d => d.TotalKg),
        backgroundColor: datos.value.map((d, i) => 
          d.TotalKg === maxValue ? '#dc2626' : (i % 2 === 0 ? '#0f172a' : '#3b82f6')
        ),
        borderRadius: 4,
      }
    ]
  }
})

const chartOptions = computed(() => {
  const [year, month, day] = fechaSeleccionada.value.split('-')
  const total = datos.value.reduce((sum, d) => sum + d.TotalKg, 0)
  
  // Función para formatear fecha a dd-mmm-yy
  const formatearFecha = (d, m, y) => {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${d}-${meses[parseInt(m) - 1]}-${y.slice(2)}`
  }
  
  const fechaInicio = formatearFecha('01', month, year)
  const fechaFin = formatearFecha(day, month, year)
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: `Residuos por Motivo del Periodo ${fechaInicio} a ${fechaFin}`,
        font: {
          size: 24,
          weight: 'bold'
        },
        padding: {
          bottom: 30
        },
        color: '#000'
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value) => {
          const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
          return `${Math.round(value).toLocaleString()}\n(${porcentaje}%)`
        },
        font: {
          weight: 'bold',
          size: 11
        },
        color: '#000'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: false
        },
        ticks: {
          display: false
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            weight: 'bold',
            size: 10
          },
          color: '#000',
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false,
          padding: 5
        }
      }
    }
  }
})

const chartDataS = computed(() => {
  if (datosS.value.length === 0) return null
  
  // Encontrar el valor máximo
  const maxValue = Math.max(...datosS.value.map(d => d.count))
  const colores = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
  
  return {
    labels: datosS.value.map(d => d.S),
    datasets: [
      {
        label: 'Cantidad de Registros',
        data: datosS.value.map(d => d.count),
        backgroundColor: datosS.value.map((d, i) => 
          d.count === maxValue ? '#dc2626' : colores[i % colores.length]
        ),
        borderRadius: 4,
      }
    ]
  }
})

const chartOptionsS = computed(() => {
  const total = datosS.value.reduce((sum, d) => sum + d.count, 0)
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Producción ÍNDIGO por Tipo',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 30
        },
        color: '#000'
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        offset: 4,
        formatter: (value) => {
          const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
          return `${value.toLocaleString()}\n(${porcentaje}%)`
        },
        font: {
          weight: 'bold',
          size: 11
        },
        color: '#000'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: false
        },
        ticks: {
          display: false
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            weight: 'bold',
            size: 10
          },
          color: '#000'
        }
      }
    }
  }
})

// Gráficos del día específico
const chartDataDia = computed(() => {
  if (datosDia.value.length === 0) return null
  
  const splitLabel = (text, maxLength = 10) => {
    const words = text.split(' ')
    const lines = []
    let currentLine = ''
    
    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxLength) {
        currentLine = currentLine ? currentLine + ' ' + word : word
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    })
    if (currentLine) lines.push(currentLine)
    
    return lines
  }
  
  // Encontrar el valor máximo
  const maxValue = Math.max(...datosDia.value.map(d => d.TotalKg))
  
  return {
    labels: datosDia.value.map(d => splitLabel(d.DESC_MOTIVO)),
    datasets: [
      {
        label: 'Kg Residuos',
        data: datosDia.value.map(d => d.TotalKg),
        backgroundColor: datosDia.value.map((d, i) => 
          d.TotalKg === maxValue ? '#dc2626' : (i % 2 === 0 ? '#0f172a' : '#3b82f6')
        ),
        borderRadius: 4,
      }
    ]
  }
})

const chartOptionsDia = computed(() => {
  const [year, month, day] = fechaSeleccionada.value.split('-')
  const total = datosDia.value.reduce((sum, d) => sum + d.TotalKg, 0)
  
  const formatearFecha = (d, m, y) => {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${d}-${meses[parseInt(m) - 1]}-${y.slice(2)}`
  }
  
  const fecha = formatearFecha(day, month, year)
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: `Residuos por Motivo del Día ${fecha}`,
        font: {
          size: 24,
          weight: 'bold'
        },
        padding: {
          bottom: 30
        },
        color: '#000'
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value) => {
          const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
          return `${Math.round(value).toLocaleString()}\n(${porcentaje}%)`
        },
        font: {
          weight: 'bold',
          size: 11
        },
        color: '#000'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: false
        },
        ticks: {
          display: false
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            weight: 'bold',
            size: 10
          },
          color: '#000',
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false,
          padding: 5
        }
      }
    }
  }
})

const chartDataDiaS = computed(() => {
  if (datosDiaS.value.length === 0) return null
  
  // Encontrar el valor máximo
  const maxValue = Math.max(...datosDiaS.value.map(d => d.count))
  const colores = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
  
  return {
    labels: datosDiaS.value.map(d => d.S),
    datasets: [
      {
        label: 'Cantidad de Registros',
        data: datosDiaS.value.map(d => d.count),
        backgroundColor: datosDiaS.value.map((d, i) => 
          d.count === maxValue ? '#dc2626' : colores[i % colores.length]
        ),
        borderRadius: 4,
      }
    ]
  }
})

const chartOptionsDiaS = computed(() => {
  const total = datosDiaS.value.reduce((sum, d) => sum + d.count, 0)
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Producción ÍNDIGO por Tipo',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 30
        },
        color: '#000'
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        offset: 4,
        formatter: (value) => {
          const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
          return `${value.toLocaleString()}\n(${porcentaje}%)`
        },
        font: {
          weight: 'bold',
          size: 11
        },
        color: '#000'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: false
        },
        ticks: {
          display: false
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            weight: 'bold',
            size: 10
          },
          color: '#000'
        }
      }
    }
  }
})

onMounted(() => {
  cargarDatos()
})
</script>

<style scoped>
/* Estilos opcionales */
</style>
