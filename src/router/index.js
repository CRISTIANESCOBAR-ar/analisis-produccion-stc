import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../components/Dashboard.vue'
import FichaSearch from '../components/FichaSearch.vue'
import CalidadTable from '../components/CalidadTable.vue'
import ParadasTable from '../components/ParadasTable.vue'
import ImportControl from '../components/ImportControl.vue'
import RevisionCQ from '../components/RevisionCQ.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: 'Dashboard - Análisis Producción STC' }
  },
  {
    path: '/fichas',
    name: 'FichaSearch',
    component: FichaSearch,
    meta: { title: 'Búsqueda de Fichas - Análisis Producción STC' }
  },
  {
    path: '/calidad',
    name: 'CalidadTable',
    component: CalidadTable,
    meta: { title: 'Control de Calidad - Análisis Producción STC' }
  },
  {
    path: '/revision-cq',
    name: 'RevisionCQ',
    component: RevisionCQ,
    meta: { title: 'Revisión CQ - Análisis Producción STC' }
  },
  {
    path: '/paradas',
    name: 'ParadasTable',
    component: ParadasTable,
    meta: { title: 'Paradas de Máquina - Análisis Producción STC' }
  },
  {
    path: '/importaciones',
    name: 'ImportControl',
    component: ImportControl,
    meta: { title: 'Control de Importaciones - Análisis Producción STC' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Análisis Producción STC'
  next()
})

export default router
