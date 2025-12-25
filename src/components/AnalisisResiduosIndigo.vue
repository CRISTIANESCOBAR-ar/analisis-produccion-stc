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
          <button 
            @click="copiarComoImagen"
            class="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            v-tippy="{ content: 'Copiar gráficos como imagen', placement: 'bottom' }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span class="text-sm">Imagen</span>
          </button>
          
          <button 
            @click="copiarParaWhatsApp"
            class="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm"
            v-tippy="{ content: 'Copiar resumen de análisis para WhatsApp', placement: 'bottom' }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span class="text-sm">WhatsApp</span>
          </button>
          
          <CustomDatepicker 
            v-model="fechaSeleccionada" 
            label="Hasta:" 
            :show-buttons="true"
            @change="cargarDatos" 
          />
        </div>
      </div>

      <!-- Charts Container -->
      <div ref="chartsContainer" class="flex-1 min-h-0 relative flex flex-col gap-4">
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
import Swal from 'sweetalert2'
import { domToPng } from 'modern-screenshot'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartDataLabels)

const API_BASE = 'http://localhost:3002/api'
const cargando = ref(false)
const datos = ref([])
const datosS = ref([])
const datosDia = ref([])
const datosDiaS = ref([])
const chartsContainer = ref(null)

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
const copiarParaWhatsApp = async () => {
  try {
    const [year, month, day] = fechaSeleccionada.value.split('-')
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const mesNombre = meses[parseInt(month) - 1]
    
    // Construir mensaje
    let mensaje = `📊 *ANÁLISIS RESIDUOS DE ÍNDIGO*\n`
    mensaje += `📅 Período: 01/${month}/${year} - ${day}/${month}/${year}\n`
    mensaje += `━━━━━━━━━━━━━━━━━━━━━━\n\n`
    
    // Residuos del periodo
    if (datos.value.length > 0) {
      const total = datos.value.reduce((sum, d) => sum + d.TotalKg, 0)
      mensaje += `📦 *RESIDUOS DEL PERIODO (${mesNombre})*\n`
      mensaje += `Total: *${Math.round(total).toLocaleString()} kg*\n\n`
      
      datos.value.forEach(d => {
        const porcentaje = ((d.TotalKg / total) * 100).toFixed(1)
        mensaje += `• ${d.DESC_MOTIVO}: ${Math.round(d.TotalKg).toLocaleString()} kg (${porcentaje}%)\n`
      })
      mensaje += `\n`
    }
    
    // Producción del periodo
    if (datosS.value.length > 0) {
      const total = datosS.value.reduce((sum, d) => sum + d.count, 0)
      mensaje += `🏭 *PRODUCCIÓN ÍNDIGO DEL PERIODO*\n`
      mensaje += `Total registros: *${total.toLocaleString()}*\n\n`
      
      datosS.value.forEach(d => {
        const porcentaje = ((d.count / total) * 100).toFixed(1)
        mensaje += `• ${d.S}: ${d.count.toLocaleString()} (${porcentaje}%)\n`
      })
      mensaje += `\n`
    }
    
    // Residuos del día
    if (datosDia.value.length > 0) {
      const total = datosDia.value.reduce((sum, d) => sum + d.TotalKg, 0)
      mensaje += `━━━━━━━━━━━━━━━━━━━━━━\n`
      mensaje += `📦 *RESIDUOS DEL DÍA ${day}/${month}/${year}*\n`
      mensaje += `Total: *${Math.round(total).toLocaleString()} kg*\n\n`
      
      datosDia.value.forEach(d => {
        const porcentaje = ((d.TotalKg / total) * 100).toFixed(1)
        mensaje += `• ${d.DESC_MOTIVO}: ${Math.round(d.TotalKg).toLocaleString()} kg (${porcentaje}%)\n`
      })
      mensaje += `\n`
    }
    
    // Producción del día
    if (datosDiaS.value.length > 0) {
      const total = datosDiaS.value.reduce((sum, d) => sum + d.count, 0)
      mensaje += `🏭 *PRODUCCIÓN ÍNDIGO DEL DÍA*\n`
      mensaje += `Total registros: *${total.toLocaleString()}*\n\n`
      
      datosDiaS.value.forEach(d => {
        const porcentaje = ((d.count / total) * 100).toFixed(1)
        mensaje += `• ${d.S}: ${d.count.toLocaleString()} (${porcentaje}%)\n`
      })
    }
    
    mensaje += `\n━━━━━━━━━━━━━━━━━━━━━━\n`
    mensaje += `📊 Reporte generado: ${new Date().toLocaleString('es-ES')}`
    
    // Copiar al portapapeles
    await navigator.clipboard.writeText(mensaje)
    
    // Mostrar notificación
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Copiado al portapapeles',
      text: 'Presiona Ctrl+V para pegar en WhatsApp',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
  } catch (error) {
    console.error('Error al copiar:', error)
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'Error al copiar',
      text: 'No se pudo copiar el mensaje',
      showConfirmButton: false,
      timer: 3000
    })
  }
}

const copiarComoImagen = async () => {
  if (!chartsContainer.value) return
  
  try {
    // Crear contenedor temporal SIN clases Tailwind
    const tempContainer = document.createElement('div')
    tempContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      background: rgb(255, 255, 255);
      padding: 30px;
      z-index: 9999;
      pointer-events: none;
      width: ${chartsContainer.value.scrollWidth + 100}px;
    `
    document.body.appendChild(tempContainer)
    
    // Crear header manualmente sin Tailwind
    const headerDiv = document.createElement('div')
    headerDiv.style.cssText = `
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 20px;
    `
    
    // Logo
    const logo = document.querySelector('main img[alt="Santana Textiles"]')
    if (logo) {
      const logoClone = logo.cloneNode(true)
      logoClone.style.cssText = 'height: 40px; width: auto;'
      headerDiv.appendChild(logoClone)
    }
    
    // Título
    const titulo = document.createElement('h3')
    titulo.textContent = 'Análisis Residuos de Índigo'
    titulo.style.cssText = 'font-size: 18px; font-weight: 600; color: rgb(15, 23, 42); margin: 0;'
    headerDiv.appendChild(titulo)
    
    tempContainer.appendChild(headerDiv)
    
    // Crear contenedor de gráficos manualmente
    const chartsDiv = document.createElement('div')
    chartsDiv.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    `
    
    // Obtener todos los canvas originales
    const originalCanvases = chartsContainer.value.querySelectorAll('canvas')
    const containerDivs = chartsContainer.value.querySelectorAll('.flex-1.flex.gap-4')
    
    containerDivs.forEach((rowDiv, rowIndex) => {
      const row = document.createElement('div')
      row.style.cssText = 'display: flex; gap: 16px; width: 100%;'
      
      const canvasContainers = rowDiv.querySelectorAll('div[class*="flex-"]')
      canvasContainers.forEach((container, colIndex) => {
        const canvas = container.querySelector('canvas')
        if (canvas) {
          const wrapper = document.createElement('div')
          const isBig = container.classList.contains('flex-[3]')
          wrapper.style.cssText = `
            flex: ${isBig ? '3' : '1'};
            padding: 16px;
            border: 1px solid rgb(226, 232, 240);
            border-radius: 8px;
            background: rgb(255, 255, 255);
          `
          
          // Clonar canvas
          const canvasClone = document.createElement('canvas')
          canvasClone.width = canvas.width
          canvasClone.height = canvas.height
          canvasClone.style.cssText = 'width: 100%; height: 100%;'
          const ctx = canvasClone.getContext('2d')
          ctx.drawImage(canvas, 0, 0)
          
          wrapper.appendChild(canvasClone)
          row.appendChild(wrapper)
        }
      })
      
      chartsDiv.appendChild(row)
    })
    
    tempContainer.appendChild(chartsDiv)
    
    // Esperar imágenes
    const images = tempContainer.querySelectorAll('img')
    await Promise.all(
      Array.from(images).map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(resolve => {
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        })
      })
    )
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Capturar con domToPng
    let dataUrl
    try {
      dataUrl = await domToPng(tempContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight
      })
    } finally {
      if (tempContainer.isConnected) {
        document.body.removeChild(tempContainer)
      }
    }
    
    // Convertir a blob y copiar
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    
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
      text: 'Presiona Ctrl+V para pegar',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
  } catch (error) {
    console.error('Error al copiar imagen:', error)
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'Error al generar imagen',
      text: error.message || 'No se pudo crear la imagen',
      showConfirmButton: false,
      timer: 3000
    })
  }
}


onMounted(() => {
  cargarDatos()
})
</script>

<style scoped>
/* Estilos opcionales */
</style>
