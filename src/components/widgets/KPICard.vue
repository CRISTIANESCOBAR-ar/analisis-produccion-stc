<template>
  <div class="kpi-card" :class="[`status-${status}`, sizeClass]">
    <!-- Header con ícono -->
    <div class="kpi-header">
      <div class="kpi-icon">{{ icon }}</div>
      <div class="kpi-label">{{ label }}</div>
    </div>

    <!-- Valor principal -->
    <div class="kpi-value">
      {{ formattedValue }}
      <span v-if="unit" class="kpi-unit">{{ unit }}</span>
    </div>

    <!-- Cambio/Comparación -->
    <div v-if="change !== null" class="kpi-change" :class="changeClass">
      <span class="change-icon">{{ changeIcon }}</span>
      <span class="change-value">{{ Math.abs(change) }}%</span>
    </div>

    <!-- Descripción adicional -->
    <div v-if="description" class="kpi-description">
      {{ description }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    required: true
  },
  icon: {
    type: String,
    default: '📊'
  },
  unit: {
    type: String,
    default: ''
  },
  change: {
    type: Number,
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['normal', 'warning', 'danger', 'success'],
    default: 'normal'
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  }
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    if (props.value > 999) {
      return (props.value / 1000).toFixed(1) + 'k'
    }
    return props.value.toFixed(2)
  }
  return props.value
})

const changeClass = computed(() => {
  if (props.change === null) return ''
  return props.change >= 0 ? 'positive' : 'negative'
})

const changeIcon = computed(() => {
  if (props.change === null) return ''
  return props.change >= 0 ? '📈' : '📉'
})

const sizeClass = computed(() => {
  return `size-${props.size}`
})
</script>

<style scoped>
.kpi-card {
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.kpi-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* Estados */
.kpi-card.status-normal {
  border-left: 4px solid #3b82f6;
}

.kpi-card.status-warning {
  border-left: 4px solid #f59e0b;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.kpi-card.status-danger {
  border-left: 4px solid #ef4444;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
}

.kpi-card.status-success {
  border-left: 4px solid #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

/* Header */
.kpi-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.kpi-icon {
  font-size: 28px;
  line-height: 1;
}

.kpi-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Value */
.kpi-value {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.kpi-unit {
  font-size: 16px;
  color: #6b7280;
  font-weight: 500;
}

/* Change */
.kpi-change {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.kpi-change.positive {
  color: #10b981;
  background: #d1fae5;
}

.kpi-change.negative {
  color: #ef4444;
  background: #fee2e2;
}

.change-icon {
  font-size: 14px;
}

/* Description */
.kpi-description {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 8px;
}

/* Tamaños */
.size-small {
  padding: 16px;
}

.size-small .kpi-value {
  font-size: 24px;
}

.size-large {
  padding: 24px;
}

.size-large .kpi-value {
  font-size: 40px;
}
</style>
