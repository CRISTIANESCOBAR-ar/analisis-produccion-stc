<template>
  <Transition name="fade">
    <div 
      v-if="show" 
      class="loading-overlay"
      :class="{ 'overlay-absolute': !fullscreen, 'overlay-fixed': fullscreen }"
    >
      <div class="loading-content">
        <!-- Spinner -->
        <div v-if="type === 'spinner'" class="spinner" :class="sizeClass">
          <svg class="animate-spin" viewBox="0 0 24 24" fill="none">
            <circle 
              class="opacity-25" 
              cx="12" cy="12" r="10" 
              stroke="currentColor" 
              stroke-width="4"
            />
            <path 
              class="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        
        <!-- Dots -->
        <div v-else-if="type === 'dots'" class="dots-container">
          <div class="dot" style="animation-delay: 0s"></div>
          <div class="dot" style="animation-delay: 0.2s"></div>
          <div class="dot" style="animation-delay: 0.4s"></div>
        </div>
        
        <!-- Bars -->
        <div v-else-if="type === 'bars'" class="bars-container">
          <div v-for="i in 5" :key="i" class="bar" :style="{ animationDelay: `${i * 0.1}s` }"></div>
        </div>
        
        <!-- Progress -->
        <div v-else-if="type === 'progress'" class="progress-container">
          <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
        </div>
        
        <!-- Mensaje -->
        <p v-if="message" class="loading-message" :class="{ 'mt-3': type !== 'progress' }">
          {{ message }}
        </p>
        
        <!-- Submensaje -->
        <p v-if="submessage" class="loading-submessage">
          {{ submessage }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /**
   * Mostrar/ocultar overlay
   */
  show: {
    type: Boolean,
    default: false
  },
  
  /**
   * Mensaje principal
   */
  message: {
    type: String,
    default: ''
  },
  
  /**
   * Submensaje (más pequeño)
   */
  submessage: {
    type: String,
    default: ''
  },
  
  /**
   * Tipo de indicador: 'spinner', 'dots', 'bars', 'progress'
   */
  type: {
    type: String,
    default: 'spinner'
  },
  
  /**
   * Tamaño: 'sm', 'md', 'lg'
   */
  size: {
    type: String,
    default: 'md'
  },
  
  /**
   * Cubrir toda la pantalla vs contenedor padre
   */
  fullscreen: {
    type: Boolean,
    default: false
  },
  
  /**
   * Progreso (0-100) para type='progress'
   */
  progress: {
    type: Number,
    default: 0
  },
  
  /**
   * Color de fondo del overlay
   */
  bgColor: {
    type: String,
    default: 'rgba(255, 255, 255, 0.9)'
  }
})

const sizeClass = computed(() => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  }
  return sizes[props.size] || sizes.md
})
</script>

<style scoped>
.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: v-bind(bgColor);
  z-index: 50;
}

.overlay-absolute {
  position: absolute;
  inset: 0;
}

.overlay-fixed {
  position: fixed;
  inset: 0;
}

.loading-content {
  text-align: center;
}

.spinner {
  color: #3b82f6;
  margin: 0 auto;
}

.loading-message {
  font-size: 0.95rem;
  font-weight: 500;
  color: #374151;
}

.loading-submessage {
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

/* Dots animation */
.dots-container {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.dot {
  width: 10px;
  height: 10px;
  background-color: #3b82f6;
  border-radius: 50%;
  animation: dot-bounce 1.4s ease-in-out infinite both;
}

@keyframes dot-bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Bars animation */
.bars-container {
  display: flex;
  gap: 3px;
  justify-content: center;
  align-items: flex-end;
  height: 30px;
}

.bar {
  width: 4px;
  background-color: #3b82f6;
  border-radius: 2px;
  animation: bar-stretch 1.2s ease-in-out infinite;
}

@keyframes bar-stretch {
  0%, 40%, 100% {
    height: 10px;
  }
  20% {
    height: 30px;
  }
}

/* Progress bar */
.progress-container {
  width: 200px;
  height: 6px;
  background-color: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin: 0 auto;
}

.progress-bar {
  height: 100%;
  background-color: #3b82f6;
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
