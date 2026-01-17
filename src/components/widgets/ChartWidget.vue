<template>
  <div class="chart-widget">
    <div class="widget-header">
      <h3 class="widget-title">{{ title }}</h3>
      <div class="widget-actions">
        <button v-if="refreshable" @click="$emit('refresh')" class="btn-icon" title="Actualizar">
          🔄
        </button>
      </div>
    </div>
    
    <div class="widget-content">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando datos...</p>
      </div>
      
      <div v-else-if="data && data.length > 0" class="chart-container">
        <canvas ref="chartCanvas"></canvas>
      </div>
      
      <div v-else class="empty-state">
        <p>📊 Sin datos disponibles</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  chartType: {
    type: String,
    enum: ['line', 'bar', 'doughnut', 'pie'],
    default: 'bar'
  },
  refreshable: {
    type: Boolean,
    default: true
  },
  options: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['refresh'])

const chartCanvas = ref(null)
let chartInstance = null

const renderChart = async () => {
  if (!chartCanvas.value || !props.data.length) return

  await nextTick()

  // Destruir gráfico anterior si existe
  if (chartInstance) {
    chartInstance.destroy()
  }

  // Preparar datos según el tipo
  let chartData = {
    labels: props.data.map(item => item.label || item.name),
    datasets: [{
      label: props.title,
      data: props.data.map(item => item.value),
      backgroundColor: [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
      ],
      borderColor: '#ffffff',
      borderWidth: 2
    }]
  }

  // Opciones por defecto según tipo
  let defaultOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false
      }
    }
  }

  if (props.chartType === 'line') {
    chartData.datasets[0].fill = false
    chartData.datasets[0].borderColor = '#3b82f6'
    chartData.datasets[0].tension = 0.4
    defaultOptions.scales = {
      y: {
        beginAtZero: true
      }
    }
  } else if (props.chartType === 'bar') {
    defaultOptions.scales = {
      y: {
        beginAtZero: true
      }
    }
  }

  const mergedOptions = {
    ...defaultOptions,
    ...props.options
  }

  chartInstance = new Chart(chartCanvas.value, {
    type: props.chartType,
    data: chartData,
    options: mergedOptions
  })
}

// Observadores
watch(() => props.data, () => {
  renderChart()
}, { deep: true })

watch(() => props.loading, () => {
  if (!props.loading) {
    renderChart()
  }
})

onMounted(() => {
  renderChart()
})
</script>

<style scoped>
.chart-widget {
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.chart-widget:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.widget-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.widget-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.widget-content {
  padding: 16px;
  min-height: 300px;
}

.chart-container {
  position: relative;
  height: 280px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 280px;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 280px;
  color: #9ca3af;
  font-size: 14px;
}
</style>
