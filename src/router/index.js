import { createRouter, createWebHistory } from 'vue-router'
import DashboardGeneral from '../components/dashboards/DashboardGeneral.vue'
import ImportControl from '../components/ImportControl.vue'
import RevisionCQ from '../components/RevisionCQ.vue'
import AnalisisHistoricoRevisores from '../components/AnalisisHistoricoRevisores.vue'
import AnalisisMesaTest from '../components/AnalisisMesaTest.vue'
import ResiduosIndigoTejeduria from '../components/ResiduosIndigoTejeduria.vue'
import AnalisisResiduosIndigo from '../components/AnalisisResiduosIndigo.vue'
import ConsultaRoladaIndigo from '../components/ConsultaRoladaIndigo.vue'
import InformeProduccionIndigo from '../components/InformeProduccionIndigo.vue'
import SeguimientoRoladas from '../components/SeguimientoRoladas.vue'
import CostosMensuales from '../components/CostosMensuales.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardGeneral,
    meta: { title: 'Dashboard - Análisis Producción STC' }
  },
  {
    path: '/revision-cq',
    name: 'RevisionCQ',
    component: RevisionCQ,
    meta: { title: 'Revisión CQ - Análisis Producción STC' }
  },
  {
    path: '/analisis-historico-revisores',
    name: 'AnalisisHistoricoRevisores',
    component: AnalisisHistoricoRevisores,
    meta: { title: 'Análisis Histórico Revisores - Análisis Producción STC' }
  },
  {
    path: '/analisis-mesa-test',
    name: 'AnalisisMesaTest',
    component: AnalisisMesaTest,
    meta: { title: 'Análisis Mesa de Test - Análisis Producción STC' }
  },
  {
    path: '/importaciones',
    name: 'ImportControl',
    component: ImportControl,
    meta: { title: 'Control de Importaciones - Análisis Producción STC' }
  },
  {
    path: '/residuos-indigo-tejeduria',
    name: 'ResiduosIndigoTejeduria',
    component: ResiduosIndigoTejeduria,
    meta: { title: 'Residuos INDIGO y TEJEDURIA - Análisis Producción STC' }
  },
  {    path: '/analisis-residuos-indigo',
    name: 'AnalisisResiduosIndigo',
    component: AnalisisResiduosIndigo,
    meta: { title: 'Análisis Residuos Índigo - Análisis Producción STC' }
  },
  {
    path: '/consulta-rolada-indigo',
    name: 'ConsultaRoladaIndigo',
    component: ConsultaRoladaIndigo,
    meta: { title: 'Consulta ROLADA ÍNDIGO - Análisis Producción STC' }
  },
  {
    path: '/informe-produccion-indigo',
    name: 'InformeProduccionIndigo',
    component: InformeProduccionIndigo,
    meta: { title: 'ROLADAS del Mes - Análisis Producción STC' }
  },
  {
    path: '/seguimiento-roladas',
    name: 'SeguimientoRoladas',
    component: SeguimientoRoladas,
    meta: { title: 'Seguimiento de Roladas - Análisis Producción STC' }
  },
  {    path: '/costos-mensuales',
    name: 'CostosMensuales',
    component: CostosMensuales,
    meta: { title: 'Costos Mensuales - Análisis Producción STC' }
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
