// =====================================================================
// Composable para calcular KPIs de dashboards
// =====================================================================
// Uso: import { useKPIs } from '@/composables/useKPIs'
// =====================================================================
// Nota: Los accesos dinámicos son seguros - datos vienen del backend
/* eslint-disable security/detect-object-injection */

import { ref, computed } from 'vue'
import { useDatabase } from './useDatabase'

export function useKPIs() {
  const { getStatus, getProduccionSummary, getTopMotivosParada, getRevisionCQ } = useDatabase()
  
  const loading = ref(false)
  const error = ref(null)
  const kpis = ref({})
  const lastUpdate = ref(null)

  // Función para cargar todos los KPIs
  const loadKPIs = async (startDate, endDate) => {
    loading.value = true
    error.value = null
    
    try {
      // Llamadas en paralelo
      const [statusData, produccionData, paradasData, calidadData] = await Promise.all([
        getStatus(),
        getProduccionSummary(startDate, endDate),
        getTopMotivosParada(startDate, endDate),
        getRevisionCQ({ startDate, endDate })
      ])

      // Procesar datos
      kpis.value = {
        status: statusData,
        produccion: produccionData,
        paradas: paradasData,
        calidad: calidadData
      }

      lastUpdate.value = new Date()
      return kpis.value
    } catch (err) {
      error.value = err.message
      console.error('Error cargando KPIs:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // KPI: Metros producidos hoy
  const metrosHoy = computed(() => {
    if (!kpis.value.produccion) return 0
    const metros = kpis.value.produccion.metros_total || 0
    return parseFloat(metros).toFixed(2)
  })

  // KPI: Calidad promedio hoy
  const calidadPromedio = computed(() => {
    if (!kpis.value.calidad || !Array.isArray(kpis.value.calidad)) return 0
    
    if (kpis.value.calidad.length === 0) return 0
    
    const total = kpis.value.calidad.reduce((sum, item) => {
      const puntos = parseFloat(item.puntos_100m2) || 0
      return sum + puntos
    }, 0)
    
    const promedio = total / kpis.value.calidad.length
    return (100 - promedio).toFixed(2) // Convertir puntos a porcentaje de calidad
  })

  // KPI: Total de paradas
  const totalParadas = computed(() => {
    if (!kpis.value.paradas || !Array.isArray(kpis.value.paradas)) return 0
    return kpis.value.paradas.length
  })

  // KPI: Minutos en parada
  const minutosParada = computed(() => {
    if (!kpis.value.paradas || !Array.isArray(kpis.value.paradas)) return 0
    
    const total = kpis.value.paradas.reduce((sum, item) => {
      const minutos = parseFloat(item.minutos) || 0
      return sum + minutos
    }, 0)
    
    return Math.round(total)
  })

  // KPI: Eficiencia (aproximada)
  const eficiencia = computed(() => {
    if (!metrosHoy.value) return 0
    // Estimación simple: basada en producción vs paradas
    // En un entorno real, esto vendría de cálculos más complejos
    const baseEficiencia = 90 // 90% base
    const penalizacion = Math.min(minutosParada.value / 60, 15) // Máx 15% de penalización
    return Math.max(baseEficiencia - penalizacion, 0).toFixed(2)
  })

  // Top 5 motivos de parada
  const topMotivos = computed(() => {
    if (!kpis.value.paradas || !Array.isArray(kpis.value.paradas)) return []
    
    // Agrupar por motivo
    const motivos = {}
    kpis.value.paradas.forEach(parada => {
      const motivo = parada.motivo_parada || 'Desconocido'
      motivos[motivo] = (motivos[motivo] || 0) + 1
    })
    
    // Ordenar y tomar top 5
    return Object.entries(motivos)
      .map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)
  })

  // Top 5 revisores por calidad
  const topRevisores = computed(() => {
    if (!kpis.value.calidad || !Array.isArray(kpis.value.calidad)) return []
    
    // Agrupar por revisor
    const revisores = {}
    kpis.value.calidad.forEach(item => {
      const revisor = item.revisor || 'Desconocido'
      if (!revisores[revisor]) {
        revisores[revisor] = { total: 0, suma_puntos: 0 }
      }
      revisores[revisor].total += 1
      revisores[revisor].suma_puntos += parseFloat(item.puntos_100m2) || 0
    })
    
    // Calcular promedios y ordenar
    return Object.entries(revisores)
      .map(([revisor, data]) => ({
        revisor,
        calidad: (100 - (data.suma_puntos / data.total)).toFixed(2),
        roladas: data.total
      }))
      .sort((a, b) => parseFloat(b.calidad) - parseFloat(a.calidad))
      .slice(0, 5)
  })

  // Datos históricos para gráficos (últimos 7 días)
  const historicoDatos = computed(() => {
    if (!kpis.value.produccion) return []
    // Esto será más complejo cuando tengamos datos diarios
    return []
  })

  // Función para formatear la última actualización
  const formatLastUpdate = () => {
    if (!lastUpdate.value) return 'Sin actualizar'
    const now = new Date()
    const diff = Math.floor((now - lastUpdate.value) / 1000)
    
    if (diff < 60) return 'Hace unos segundos'
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} minutos`
    return `Hace ${Math.floor(diff / 3600)} horas`
  }

  return {
    // Estado
    loading,
    error,
    lastUpdate,
    
    // Métodos
    loadKPIs,
    formatLastUpdate,
    
    // KPIs computados
    metrosHoy,
    calidadPromedio,
    totalParadas,
    minutosParada,
    eficiencia,
    topMotivos,
    topRevisores,
    historicoDatos,
    
    // Datos crudos
    kpis
  }
}
