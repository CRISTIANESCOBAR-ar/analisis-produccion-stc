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
      tippy(el, {
        content: binding.value,
        placement: 'right',
        arrow: true,
        theme: 'light-border'
      })
    }
  },
  updated(el, binding) {
    if (el._tippy) {
      if (binding.value) {
        el._tippy.setContent(binding.value)
      } else {
        el._tippy.destroy()
      }
    } else if (binding.value) {
      tippy(el, {
        content: binding.value,
        placement: 'right',
        arrow: true,
        theme: 'light-border'
      })
    }
  },
  unmounted(el) {
    if (el._tippy) {
      el._tippy.destroy()
    }
  }
})

app.use(router).mount('#app')
