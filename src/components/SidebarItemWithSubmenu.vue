<template>
  <div class="relative" ref="parentElement">
    <!-- Item principal -->
    <div
      class="flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors duration-200"
      :class="[
        isAnySubmenuActive ? 'bg-blue-600 text-white font-medium' : 'hover:bg-blue-700 text-white/80',
        collapsed ? 'justify-center' : 'justify-between'
      ]"
      role="button"
      :aria-label="label"
      :aria-expanded="String(showSubmenu)"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      v-tippy="collapsed && label ? label : null"
    >
      <div class="flex items-center gap-2">
        <!-- Ícono -->
        <span class="text-xl" aria-hidden="true">{{ icon }}</span>

        <!-- Etiqueta -->
        <span v-if="!collapsed" class="text-sm truncate block max-w-[10rem]">
          {{ label }}
        </span>
      </div>

      <!-- Chevron indicador de dropdown (solo si no está colapsado) -->
      <svg
        v-if="!collapsed"
        class="w-4 h-4 transition-transform duration-200"
        :class="{ 'rotate-90': showSubmenu }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </div>

    <!-- Submenú lateral (para ambos modos) -->
    <transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSubmenu"
        class="fixed bg-blue-700 rounded-md shadow-xl py-2 px-1 min-w-[240px] z-[10000]"
        :style="{ top: submenuTop + 'px', left: submenuLeft + 'px' }"
        @mouseenter="keepSubmenuOpen"
        @mouseleave="hideSubmenu"
      >
        <div
          v-for="(item, index) in items"
          :key="index"
          class="flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors duration-200 text-sm"
          :class="[
            item.active ? 'bg-blue-500 text-white font-medium' : 'hover:bg-blue-600 text-white/80'
          ]"
          @click="handleSubmenuClick(item)"
        >
          <span class="text-base">{{ item.icon }}</span>
          <span class="truncate">{{ item.label }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'

const props = defineProps({
  icon: String,
  label: String,
  items: Array, // [{ icon, label, path, active }]
  collapsed: Boolean
})

const emit = defineEmits(['navigate'])

// Inyectar las funciones del sidebar
const clearHideTimer = inject('clearHideTimer', () => {})
const scheduleHideSidebar = inject('scheduleHideSidebar', () => {})

const showSubmenu = ref(false)
const submenuTop = ref(0)
const submenuLeft = ref(0)
const submenuTimeout = ref(null)
const parentElement = ref(null)

const isAnySubmenuActive = computed(() => {
  return props.items?.some(item => item.active) || false
})

function handleMouseEnter() {
  if (submenuTimeout.value) {
    clearTimeout(submenuTimeout.value)
    submenuTimeout.value = null
  }
  // Cancelar el timer de ocultamiento del sidebar
  clearHideTimer()
  showSubmenu.value = true
  calculateSubmenuPosition()
}

function handleMouseLeave() {
  submenuTimeout.value = setTimeout(() => {
    showSubmenu.value = false
    // Si el submenu se cierra, reprogramar el ocultamiento del sidebar
    if (!showSubmenu.value) {
      scheduleHideSidebar()
    }
  }, 200)
}

function keepSubmenuOpen() {
  if (submenuTimeout.value) {
    clearTimeout(submenuTimeout.value)
    submenuTimeout.value = null
  }
  // Mantener el sidebar visible mientras el submenu está abierto
  clearHideTimer()
}

function hideSubmenu() {
  submenuTimeout.value = setTimeout(() => {
    showSubmenu.value = false
    // Cuando el submenu se cierra, reprogramar el ocultamiento del sidebar
    scheduleHideSidebar()
  }, 200)
}

function handleSubmenuClick(item) {
  emit('navigate', item.path)
  showSubmenu.value = false
  // Reprogramar el ocultamiento automático del sidebar después de la navegación
  scheduleHideSidebar()
}

function calculateSubmenuPosition() {
  // Calcular posición del submenú lateral
  if (parentElement.value) {
    const rect = parentElement.value.getBoundingClientRect()
    submenuTop.value = rect.top
    // Posicionar a la derecha del sidebar
    submenuLeft.value = props.collapsed ? rect.right + 4 : rect.right + 4
  }
}

// Cerrar submenú al hacer clic fuera
function handleClickOutside(event) {
  if (showSubmenu.value) {
    const submenuEl = document.querySelector('.fixed.bg-blue-700')
    if (submenuEl && !submenuEl.contains(event.target) && !parentElement.value?.contains(event.target)) {
      showSubmenu.value = false
      scheduleHideSidebar()
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (submenuTimeout.value) {
    clearTimeout(submenuTimeout.value)
  }
})
</script>
