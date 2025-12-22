import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'

const app = createApp(App)

// Directiva global v-tippy
app.directive('tippy', {
  mounted(el, binding) {
    if (binding.value) {
      const options = typeof binding.value === 'string' 
        ? { content: binding.value, placement: 'bottom', arrow: true, theme: 'dark' }
        : { ...binding.value, arrow: true, theme: 'dark' }
      tippy(el, options)
    }
  },
  updated(el, binding) {
    if (el._tippy) {
      if (binding.value) {
        const content = typeof binding.value === 'string' ? binding.value : binding.value.content
        el._tippy.setContent(content)
      } else {
        el._tippy.destroy()
      }
    } else if (binding.value) {
      const options = typeof binding.value === 'string' 
        ? { content: binding.value, placement: 'bottom', arrow: true, theme: 'dark' }
        : { ...binding.value, arrow: true, theme: 'dark' }
      tippy(el, options)
    }
  },
  unmounted(el) {
    if (el._tippy) {
      el._tippy.destroy()
    }
  }
})

app.use(router).mount('#app')
