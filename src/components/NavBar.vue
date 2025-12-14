<template>
  <!-- Detector invisible en el borde izquierdo -->
  <div class="fixed top-0 left-0 h-full w-12 z-50" @mouseenter="onLeftEdgeEnter"></div>

  <!-- Sidebar -->
  <aside 
    @mouseleave="scheduleHideSidebar" 
    @mouseenter="clearHideTimer" 
    :class="[
      'fixed top-0 left-0 h-full bg-blue-800 text-white z-[9999] transition-all duration-500 ease-in-out',
      isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
      isCollapsed ? 'w-16' : 'w-64'
    ]"
    aria-hidden="false"
  >
    <!-- Header del sidebar -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-blue-600">
      <h2 class="text-lg font-bold" v-if="!isCollapsed">Análisis STC</h2>
      <!-- Desktop collapse/expand button -->
      <button class="hidden lg:inline-flex items-center justify-center p-1 rounded hover:bg-blue-700 ml-2"
        :aria-label="isCollapsed ? 'Abrir menú' : 'Colapsar menú'" @click="toggleSidebar" title="Colapsar/abrir menú">
        <template v-if="!isCollapsed">
          <!-- X icon to collapse -->
          <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </template>
        <template v-else>
          <!-- Chevron-right icon to expand -->
          <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </template>
      </button>
      <button class="lg:hidden" @click="closeSidebar" aria-label="Cerrar menú móvil">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Navegación -->
    <nav class="px-2 py-2 space-y-2">
      <SidebarItem 
        icon="📈" 
        label="Dashboard" 
        :active="isActive('/')" 
        :collapsed="isCollapsed"
        @click="handleNavClick('/')"
      />
      <SidebarItem 
        icon="🔍" 
        label="Fichas" 
        :active="isActive('/fichas')" 
        :collapsed="isCollapsed"
        @click="handleNavClick('/fichas')"
      />
      <SidebarItem 
        icon="🎯" 
        label="Calidad" 
        :active="isActive('/calidad')" 
        :collapsed="isCollapsed"
        @click="handleNavClick('/calidad')"
      />
      <SidebarItem 
        icon="📋" 
        label="Revisión CQ" 
        :active="isActive('/revision-cq')" 
        :collapsed="isCollapsed"
        @click="handleNavClick('/revision-cq')"
      />
      <SidebarItem 
        icon="📊" 
        label="Histórico Revisores" 
        :active="isActive('/analisis-historico-revisores')" 
        :collapsed="isCollapsed"
        @click="handleNavClick('/analisis-historico-revisores')"
      />
      <SidebarItem 
        icon="📉" 
        label="Mesa de Test" 
        :active="isActive('/analisis-mesa-test')" 
        :collapsed="isCollapsed"
        @click="handleNavClick('/analisis-mesa-test')"
      />
      <SidebarItem 
        icon="⚠️" 
        label="Paradas" 
        :active="isActive('/paradas')" 
        :collapsed="isCollapsed"
        @click="handleNavClick('/paradas')"
      />
      <SidebarItem 
        icon="📥" 
        label="Importaciones" 
        :active="isActive('/importaciones')" 
        :collapsed="isCollapsed"
        @click="handleNavClick('/importaciones')"
      />
    </nav>
  </aside>

  <!-- Botón flotante móvil -->
  <button 
    aria-label="Toggle menú" 
    :aria-expanded="String(isSidebarOpen)"
    class="lg:hidden fixed top-3 left-3 z-50 text-blue-600 bg-blue-100 p-1.5 rounded-md hover:bg-blue-600 hover:text-white transition-colors shadow-sm"
    @click.stop.prevent="mobileToggle"
  >
    <svg v-if="!isSidebarOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
    <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>

  <!-- API Status badge flotante -->
  <div 
    v-if="!isCollapsed && isSidebarOpen" 
    class="fixed bottom-4 left-4 z-[9998] px-3 py-2 rounded-lg text-white text-sm font-medium transition-all duration-300"
    :class="apiOnline ? 'bg-green-600' : 'bg-red-600'"
  >
    <span class="inline-block w-2 h-2 rounded-full mr-2" :class="apiOnline ? 'bg-green-300 animate-pulse' : 'bg-red-300'"></span>
    {{ apiOnline ? 'API Online' : 'API Offline' }}
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSidebar } from '../composables/useSidebar'
import SidebarItem from './SidebarItem.vue'

const route = useRoute()
const router = useRouter()
const { 
  isSidebarOpen, 
  isCollapsed,
  toggleSidebar, 
  closeSidebar,
  onLeftEdgeEnter,
  scheduleHideSidebar,
  clearHideTimer
} = useSidebar()

const apiOnline = ref(false)
let statusInterval = null

onMounted(() => {
  checkApiStatus()
  statusInterval = setInterval(checkApiStatus, 30000)
})

onUnmounted(() => {
  if (statusInterval) {
    clearInterval(statusInterval)
  }
})

function isActive(path) {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

function handleNavClick(path) {
  router.push(path)
  if (window.innerWidth < 768) {
    closeSidebar()
  }
}

function mobileToggle() {
  if (isSidebarOpen.value) {
    closeSidebar()
  } else {
    isSidebarOpen.value = true
    if (window.innerWidth < 768) {
      setTimeout(() => {
        if (isSidebarOpen.value) {
          scheduleHideSidebar()
        }
      }, 1500)
    }
  }
}

async function checkApiStatus() {
  try {
    const response = await fetch('http://localhost:3002/api/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    apiOnline.value = response.ok
  } catch (err) {
    apiOnline.value = false
  }
}
</script>

<style scoped>
/* Sin estilos adicionales, todo es Tailwind */
</style>
