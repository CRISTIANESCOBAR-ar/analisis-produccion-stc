<template>
  <div class="animate-pulse" :class="containerClass">
    <!-- Skeleton para tabla -->
    <template v-if="type === 'table'">
      <!-- Header de tabla -->
      <div class="h-10 bg-gray-200 rounded mb-3"></div>
      
      <!-- Filas de tabla -->
      <div 
        v-for="i in rows" 
        :key="i" 
        class="flex gap-2 mb-2"
      >
        <div 
          v-for="j in columns" 
          :key="j" 
          class="h-8 bg-gray-100 rounded flex-1"
          :style="{ animationDelay: `${(i * columns + j) * 50}ms` }"
        ></div>
      </div>
    </template>
    
    <!-- Skeleton para cards/grid -->
    <template v-else-if="type === 'cards'">
      <div class="grid gap-4" :class="gridClass">
        <div 
          v-for="i in count" 
          :key="i" 
          class="bg-white rounded-lg shadow p-4 border border-gray-100"
        >
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div class="flex-1">
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="h-3 bg-gray-100 rounded"></div>
            <div class="h-3 bg-gray-100 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </template>
    
    <!-- Skeleton para stats/KPIs -->
    <template v-else-if="type === 'stats'">
      <div class="grid gap-4" :class="gridClass">
        <div 
          v-for="i in count" 
          :key="i" 
          class="bg-white rounded-lg shadow p-4 border border-gray-100"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="h-3 bg-gray-200 rounded w-20 mb-2"></div>
              <div class="h-8 bg-gray-300 rounded w-24"></div>
            </div>
            <div class="w-12 h-12 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    </template>
    
    <!-- Skeleton para lista -->
    <template v-else-if="type === 'list'">
      <div class="space-y-3">
        <div 
          v-for="i in rows" 
          :key="i" 
          class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100"
        >
          <div class="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div class="flex-1">
            <div class="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
            <div class="h-3 bg-gray-100 rounded w-2/3"></div>
          </div>
          <div class="w-16 h-6 bg-gray-100 rounded"></div>
        </div>
      </div>
    </template>
    
    <!-- Skeleton para texto/párrafos -->
    <template v-else-if="type === 'text'">
      <div class="space-y-3">
        <div class="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div 
          v-for="i in rows" 
          :key="i" 
          class="h-4 bg-gray-100 rounded"
          :class="i === rows ? 'w-3/4' : 'w-full'"
        ></div>
      </div>
    </template>
    
    <!-- Skeleton para chart -->
    <template v-else-if="type === 'chart'">
      <div class="bg-white rounded-lg shadow p-4 border border-gray-100">
        <div class="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div class="flex items-end gap-2 h-48">
          <div 
            v-for="i in 12" 
            :key="i" 
            class="flex-1 bg-gray-200 rounded-t"
            :style="{ height: `${20 + Math.random() * 60}%` }"
          ></div>
        </div>
        <div class="flex justify-between mt-2">
          <div v-for="i in 6" :key="i" class="h-3 bg-gray-100 rounded w-8"></div>
        </div>
      </div>
    </template>
    
    <!-- Skeleton para formulario -->
    <template v-else-if="type === 'form'">
      <div class="space-y-4">
        <div v-for="i in rows" :key="i">
          <div class="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div class="h-10 bg-gray-100 rounded"></div>
        </div>
        <div class="flex gap-2 mt-6">
          <div class="h-10 bg-gray-300 rounded w-24"></div>
          <div class="h-10 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    </template>
    
    <!-- Skeleton genérico (líneas) -->
    <template v-else>
      <div class="space-y-2">
        <div 
          v-for="i in rows" 
          :key="i" 
          class="bg-gray-200 rounded"
          :class="lineClass"
          :style="{ width: getLineWidth(i) }"
        ></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /**
   * Tipo de skeleton: 'table', 'cards', 'stats', 'list', 'text', 'chart', 'form', 'lines'
   */
  type: {
    type: String,
    default: 'lines'
  },
  
  /**
   * Número de filas (para table, list, text, form, lines)
   */
  rows: {
    type: Number,
    default: 5
  },
  
  /**
   * Número de columnas (para table)
   */
  columns: {
    type: Number,
    default: 4
  },
  
  /**
   * Número de elementos (para cards, stats)
   */
  count: {
    type: Number,
    default: 4
  },
  
  /**
   * Altura de línea para skeleton genérico
   */
  lineHeight: {
    type: String,
    default: 'h-4'
  },
  
  /**
   * Clase CSS personalizada para el contenedor
   */
  containerClass: {
    type: String,
    default: ''
  },
  
  /**
   * Columnas del grid para cards/stats
   */
  gridCols: {
    type: Number,
    default: 4
  }
})

const gridClass = computed(() => {
  const colsMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
  }
  return colsMap[props.gridCols] || colsMap[4]
})

const lineClass = computed(() => props.lineHeight)

const getLineWidth = (index) => {
  // Variar ancho de líneas para efecto más natural
  const widths = ['100%', '95%', '85%', '90%', '75%', '80%', '100%', '70%']
  return widths[(index - 1) % widths.length]
}
</script>

<style scoped>
.animate-pulse > div {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Efecto de shimmer opcional */
.shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
