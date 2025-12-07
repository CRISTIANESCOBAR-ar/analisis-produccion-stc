<template>
 <div class="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
    <NavBar />
   <main 
     class="flex-1 px-2 md:px-0 pt-2 md:pt-0 transition-all duration-500 ease-in-out overflow-x-hidden"
     :style="{ marginLeft: mainMargin }"
   >
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import NavBar from './components/NavBar.vue'
import { useSidebar } from './composables/useSidebar'

const { isSidebarOpen, isCollapsed } = useSidebar()

// Track viewport width to decide push vs overlay behavior
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

const mainMargin = computed(() => {
  // Only push content on desktop (>=1024px). When collapsed, we use a smaller offset.
  if (windowWidth.value >= 1024 && isSidebarOpen.value) {
    return isCollapsed.value ? '4rem' : '16rem'
  }
  return '0px'
})

onMounted(() => {
  const handleResize = () => {
    windowWidth.value = window.innerWidth
  }
  window.addEventListener('resize', handleResize)
  
  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
})
</script>

<style>
.tippy-box[data-theme~='light-border'] {
  background-color: #f9fafb;
  color: #1f2937;
  border: 1px solid #d1d5db;
  font-size: 0.875rem;
  padding: 6px 10px;
  border-radius: 6px;
}
</style>
