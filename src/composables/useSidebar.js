import { ref, watch, onMounted } from 'vue'
import { hideAll } from 'tippy.js'

// Estado global del sidebar
const isSidebarOpen = ref(true)
const isCollapsed = ref(false)
const userHidden = ref(false)
let hideTimer = null
let introTimer = null

export function useSidebar() {
  // Cargar estado inicial desde localStorage
  onMounted(() => {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed')
    const savedHidden = localStorage.getItem('sidebarUserHidden')

    isCollapsed.value = savedCollapsed === 'true'
    userHidden.value = savedHidden === 'true'

    if (userHidden.value) {
      isSidebarOpen.value = false
    } else {
      isSidebarOpen.value = window.innerWidth >= 768
    }

    // Intro: mostrar expandido 1.5s y luego colapsar en desktop
    if (window.innerWidth >= 1024 && !userHidden.value) {
      isCollapsed.value = false
      isSidebarOpen.value = true
      clearIntroTimer()
      introTimer = setTimeout(() => {
        isCollapsed.value = true
        isSidebarOpen.value = false
        localStorage.setItem('sidebarCollapsed', 'true')
        introTimer = null
      }, 1500)
    }
  })

  // Guardar estado cuando cambie
  watch(isCollapsed, (newValue) => {
    localStorage.setItem('sidebarCollapsed', newValue.toString())
  })

  const clearHideTimer = () => {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  const clearIntroTimer = () => {
    if (introTimer) {
      clearTimeout(introTimer)
      introTimer = null
    }
  }

  const hideSidebarTooltips = () => {
    if (typeof document === 'undefined') return
    try {
      const aside = document.querySelector('aside')
      if (!aside) return
      const all = aside.querySelectorAll('*')
      all.forEach((el) => {
        if (el && el._tippy) {
          try { el._tippy.hide() } catch { /* noop */ }
          try { el._tippy.destroy() } catch { /* noop */ }
          try { delete el._tippy } catch { /* noop */ }
        }
      })
    } catch {
      // noop
    }
  }

  const scheduleHideSidebar = () => {
    clearHideTimer()
    hideTimer = setTimeout(() => {
      isSidebarOpen.value = false
      try { hideAll() } catch { /* noop */ }
      try { hideSidebarTooltips() } catch { /* noop */ }
    }, 1000)
  }

  const toggleSidebar = () => {
    clearIntroTimer()

    // Si está expandido -> ocultar todo (X)
    if (isSidebarOpen.value && !isCollapsed.value) {
      userHidden.value = true
      localStorage.setItem('sidebarUserHidden', 'true')
      isSidebarOpen.value = false
      isCollapsed.value = true
      try { hideAll() } catch { /* noop */ }
      return
    }

    // Si está colapsado visible -> expandir
    if (isSidebarOpen.value && isCollapsed.value) {
      userHidden.value = false
      localStorage.setItem('sidebarUserHidden', 'false')
      isCollapsed.value = false
      return
    }

    // Si está oculto -> mostrar colapsado
    userHidden.value = false
    localStorage.setItem('sidebarUserHidden', 'false')
    isCollapsed.value = true
    isSidebarOpen.value = true
    scheduleHideSidebar()
  }

  const closeSidebar = () => {
    isSidebarOpen.value = false
    try { hideAll() } catch { /* noop */ }
    try { hideSidebarTooltips() } catch { /* noop */ }
  }

  const openSidebar = () => {
    isSidebarOpen.value = true
  }

  const onLeftEdgeEnter = () => {
    if (window.innerWidth < 1024) return
    clearIntroTimer()
    isCollapsed.value = true
    isSidebarOpen.value = true
    scheduleHideSidebar()
  }

  return {
    isSidebarOpen,
    isCollapsed,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    onLeftEdgeEnter,
    scheduleHideSidebar,
    clearHideTimer
  }
}
