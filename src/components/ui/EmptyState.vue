<template>
  <div class="empty-state" :class="containerClass">
    <!-- Icono -->
    <div class="empty-icon" :class="iconSizeClass">
      <slot name="icon">
        <component :is="iconComponent" v-if="iconComponent" />
        <span v-else class="text-4xl">{{ icon }}</span>
      </slot>
    </div>
    
    <!-- Título -->
    <h3 class="empty-title">
      <slot name="title">{{ title }}</slot>
    </h3>
    
    <!-- Descripción -->
    <p v-if="description || $slots.description" class="empty-description">
      <slot name="description">{{ description }}</slot>
    </p>
    
    <!-- Acciones -->
    <div v-if="$slots.actions || showAction" class="empty-actions">
      <slot name="actions">
        <button 
          v-if="showAction"
          @click="$emit('action')"
          class="action-button"
          :class="actionVariantClass"
        >
          {{ actionText }}
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /**
   * Icono emoji o texto
   */
  icon: {
    type: String,
    default: '📭'
  },
  
  /**
   * Componente de icono (alternativa a emoji)
   */
  iconComponent: {
    type: [Object, null],
    default: null
  },
  
  /**
   * Título principal
   */
  title: {
    type: String,
    default: 'No hay datos'
  },
  
  /**
   * Descripción adicional
   */
  description: {
    type: String,
    default: ''
  },
  
  /**
   * Mostrar botón de acción
   */
  showAction: {
    type: Boolean,
    default: false
  },
  
  /**
   * Texto del botón de acción
   */
  actionText: {
    type: String,
    default: 'Intentar de nuevo'
  },
  
  /**
   * Variante del botón: 'primary', 'secondary', 'outline'
   */
  actionVariant: {
    type: String,
    default: 'primary'
  },
  
  /**
   * Tamaño del icono: 'sm', 'md', 'lg'
   */
  iconSize: {
    type: String,
    default: 'md'
  },
  
  /**
   * Clase CSS adicional para el contenedor
   */
  containerClass: {
    type: String,
    default: ''
  }
})

defineEmits(['action'])

const iconSizeClass = computed(() => {
  const sizes = {
    sm: 'text-3xl',
    md: 'text-5xl',
    lg: 'text-7xl'
  }
  return sizes[props.iconSize] || sizes.md
})

const actionVariantClass = computed(() => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
  }
  return variants[props.actionVariant] || variants.primary
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.empty-icon {
  margin-bottom: 1rem;
  opacity: 0.7;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.empty-description {
  font-size: 0.95rem;
  color: #6b7280;
  max-width: 24rem;
  line-height: 1.5;
}

.empty-actions {
  margin-top: 1.5rem;
}

.action-button {
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.action-button:hover {
  transform: translateY(-1px);
}

.action-button:active {
  transform: translateY(0);
}
</style>
