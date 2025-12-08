<template>
  <div class="w-full h-screen flex flex-col p-1">
    <main class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col">
      <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold text-gray-800">Control de Importaciones</h1>
      <div class="flex gap-2">
        <button 
          @click="fetchStatus" 
          class="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading || importing"
        >
          <span v-if="loading" class="animate-spin">↻</span>
          <span v-else>↻</span>
          Refrescar
        </button>
        <button 
          @click="forceImportAll" 
          class="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-1.5 transition-colors text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="importing || loading"
        >
          <span>⚡</span>
          Forzar Importación
        </button>
        <button 
          @click="triggerImport" 
          class="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 transition-colors text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="importing || loading"
        >
          <span>🚀</span>
          Ejecutar Actualización
        </button>
      </div>
    </div>

    <!-- Resumen de Estado -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
      <div class="bg-gray-50 px-3 py-2 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
        <div class="text-sm text-gray-600">Total Archivos:</div>
        <div class="text-lg font-bold text-gray-800">{{ statusList.length }}</div>
      </div>
      <div class="bg-gray-50 px-3 py-2 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
        <div class="text-sm text-gray-600">Actualizados:</div>
        <div class="text-lg font-bold text-green-600">{{ countStatus('UP_TO_DATE') }}</div>
      </div>
      <div class="bg-gray-50 px-3 py-2 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
        <div class="text-sm text-gray-600">Desactualizados:</div>
        <div class="text-lg font-bold text-yellow-600">{{ countStatus('OUTDATED') }}</div>
      </div>
      <div class="bg-gray-50 px-3 py-2 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
        <div class="text-sm text-gray-600">Faltantes / Error:</div>
        <div class="text-lg font-bold text-red-600">{{ countStatus('MISSING_FILE') + countStatus('NOT_IMPORTED') }}</div>
      </div>
      <div class="bg-gray-50 px-3 py-2 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
        <div class="text-sm text-gray-600">Tamaño DB:</div>
        <div class="text-lg font-bold text-purple-600">{{ dbInfo ? dbInfo.sizeMB + ' MB' : '-' }}</div>
      </div>
    </div>

    <!-- Tabla de Estado -->
    <div class="flex-1 min-h-0 overflow-y-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <table class="min-w-full divide-y divide-gray-200 table-fixed">
        <colgroup>
          <col style="width: 12%;">
          <col style="width: 14%;">
          <col style="width: 11%;">
          <col style="width: 13%;">
          <col style="width: 13%;">
          <col style="width: 8%;">
          <col style="width: 14%;">
        </colgroup>
        <thead class="bg-gray-50 sticky top-0 z-10">
          <tr>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tabla Destino</th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivo Origen</th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Modif.</th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Import.</th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filas</th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading && statusList.length === 0">
              <td colspan="7" class="px-6 py-10 text-center text-gray-500">Cargando estado...</td>
            </tr>
            <tr v-else-if="statusList.length === 0">
              <td colspan="7" class="px-6 py-10 text-center text-gray-500">No hay configuraciones de importación disponibles.</td>
            </tr>
            <tr v-for="item in statusList" :key="item.table" class="hover:bg-gray-50 transition-colors">
              <td class="px-3 py-2 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ item.table }}</div>
              </td>
              <td class="px-3 py-2 whitespace-nowrap">
                <div class="text-sm text-gray-500" :title="item.file">{{ getFileName(item.file) }}</div>
                <div class="text-xs text-gray-400">Hoja: {{ item.sheet }}</div>
              </td>
              <td class="px-3 py-2 whitespace-nowrap">
                <div v-if="importing && currentImportTable === item.table" class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="animate-spin">⚙️</span>
                    <span class="text-sm font-medium text-blue-600">Importando...</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div class="bg-blue-400 h-2 rounded-full animate-pulse" style="width: 100%"></div>
                  </div>
                </div>
                <div v-else-if="importing && forceAllRunning && hasTableCompleted(item.table)" class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span>✓</span>
                    <span class="text-sm font-medium text-green-600">Completado</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div class="bg-green-500 h-2 rounded-full" style="width: 100%"></div>
                  </div>
                </div>
                <span v-else :class="getStatusClass(item.status)" class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ getStatusLabel(item.status) }}
                </span>
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(item.file_modified || item.xlsx_last_modified) }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                <div v-if="item.last_import_date">
                  {{ formatDate(item.last_import_date) }}
                </div>
                <div v-else class="text-gray-400">-</div>
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                {{ item.rows_imported !== null ? item.rows_imported.toLocaleString() : '-' }}
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-sm">
                <button 
                  @click="forceImportTable(item)" 
                  class="px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="importing || loading"
                >
                  <span v-if="importing && currentImportTable === item.table" class="animate-spin">⚙️</span>
                  <span v-else>⚡</span>
                  {{ importing && currentImportTable === item.table ? 'Procesando...' : 'Forzar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    <!-- Log de Importación -->
    <div v-if="importOutput" class="mt-4 bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      <div class="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h3 class="text-sm font-mono text-gray-300">Log de Ejecución</h3>
        <button @click="importOutput = null" class="text-gray-400 hover:text-white">✕</button>
      </div>
      <pre class="p-4 text-xs font-mono text-green-400 overflow-auto max-h-96 whitespace-pre-wrap">{{ importOutput }}</pre>
    </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Swal from 'sweetalert2'

const statusList = ref([])
const dbInfo = ref(null)
const loading = ref(false)
const importing = ref(false)
const importOutput = ref(null)
const currentImportTable = ref(null)
const forceAllRunning = ref(false)
const baselineImports = ref({})
const completedTables = ref(new Set())
let pollIntervalId = null

const API_URL = 'http://localhost:3002/api'

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 4000,
  timerProgressBar: true
})

const toastError = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 5000,
  timerProgressBar: true,
  icon: 'error'
})

onMounted(() => {
  fetchStatus()
})

async function fetchStatus() {
  loading.value = true
  try {
    const [resStatus, resDb] = await Promise.all([
      fetch(`${API_URL}/import-status`),
      fetch(`${API_URL}/status`)
    ])
    
    if (!resStatus.ok) throw new Error('Error al obtener estado de importación')
    const freshData = await resStatus.json()
    
    // Si está corriendo forceAll, preservar estados PENDING para tablas no completadas
    if (forceAllRunning.value) {
      const completed = completedTables.value
      const current = currentImportTable.value
      
      statusList.value = freshData.map(item => {
        if (item.table === current) {
          item.status = 'IMPORTING'
        } else if (!completed.has(item.table)) {
          item.status = 'PENDING'
        }
        return item
      })
    } else {
      statusList.value = freshData
    }
    
    if (resDb.ok) {
      dbInfo.value = await resDb.json()
    }

    if (importing.value) {
      updateProgressPointers()
    }
  } catch (err) {
    console.error(err)
    toastError.fire({ title: 'No se pudo conectar con el servidor de API' })
  } finally {
    loading.value = false
  }
}

async function triggerImport() {
  const result = await Swal.fire({
    title: '¿Iniciar actualización?',
    text: "Se ejecutarán los scripts de importación para los archivos detectados como modificados.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, ejecutar'
  })

  if (result.isConfirmed) {
    importing.value = true
    importOutput.value = null
    forceAllRunning.value = false
    startPolling()
    const t0 = performance.now()
    
    try {
      const res = await fetch(`${API_URL}/import/trigger`, { method: 'POST' })
      const data = await res.json()
      
      stopPolling()
      currentImportTable.value = null
      
      if (data.success) {
        importOutput.value = data.output
        const elapsed = Math.round(performance.now() - t0)
        toast.fire({
          icon: 'success',
          title: 'Importación completada',
          text: `Tiempo: ${elapsed} ms`
        })
        fetchStatus() // Recargar estado final
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      stopPolling()
      currentImportTable.value = null
      console.error(err)
      toastError.fire({ title: 'Falló la ejecución del script de importación' })
    } finally {
      importing.value = false
    }
  }
}

function getFileName(path) {
  if (!path) return '-'
  return path.split('\\').pop().split('/').pop()
}

function countStatus(status) {
  return statusList.value.filter(i => i.status === status).length
}

function getStatusClass(status) {
  switch (status) {
    case 'UP_TO_DATE': return 'bg-green-100 text-green-800'
    case 'OUTDATED': return 'bg-yellow-100 text-yellow-800'
    case 'NOT_IMPORTED': return 'bg-blue-100 text-blue-800'
    case 'MISSING_FILE': return 'bg-red-100 text-red-800'
    case 'PENDING': return 'bg-orange-100 text-orange-800'
    case 'IMPORTING': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'UP_TO_DATE': return 'Actualizado'
    case 'OUTDATED': return 'Desactualizado'
    case 'NOT_IMPORTED': return 'Pendiente'
    case 'MISSING_FILE': return 'Archivo No Encontrado'
    case 'ERROR_READING_FILE': return 'Error Lectura'
    case 'PENDING': return 'Pendiente'
    case 'IMPORTING': return 'Importando...'
    default: return status
  }
}

function hasTableCompleted(table) {
  return completedTables.value.has(table)
}

async function forceImportAll() {
  const result = await Swal.fire({
    title: '¿Forzar importación completa?',
    html: "Se re-importarán <strong>todas las tablas</strong>, incluso las marcadas como actualizadas.<br><br><em>Esto puede tomar varios minutos.</em>",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ea580c',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Sí, forzar todas',
    cancelButtonText: 'Cancelar'
  })

  if (result.isConfirmed) {
    importing.value = true
    importOutput.value = null
    forceAllRunning.value = true
    
    // Cambiar todos los estados a "Pendiente" visualmente
    statusList.value.forEach(item => {
      item.status = 'PENDING'
    })
    
    // Baseline para detectar avances
    const snapshot = {}
    statusList.value.forEach((s) => {
      snapshot[s.table] = {
        last: s.last_import_date,
        rows: s.rows_imported
      }
    })
    baselineImports.value = snapshot
    completedTables.value = new Set()
    currentImportTable.value = statusList.value[0]?.table || null
    startPolling()
    const t0 = performance.now()

    try {
      // Timeout de 3 minutos por seguridad
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 180000)

      const res = await fetch(`${API_URL}/import/force-all`, {
        method: 'POST',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()

      // Detener polling e importación inmediatamente
      stopPolling()
      importing.value = false
      forceAllRunning.value = false
      completedTables.value = new Set()
      currentImportTable.value = null

      if (data.success) {
        const elapsed = data?.timings?.totalMs ?? Math.round(performance.now() - t0)
        const elapsedUI = Math.round(performance.now() - t0)
        const elapsedServer = data?.timings?.totalMs || 0
        const seconds = (elapsed / 1000).toFixed(1)
        const secondsUI = (elapsedUI / 1000).toFixed(2)
        const secondsServer = (elapsedServer / 1000).toFixed(2)
        
        // Refrescar estado en background
        fetchStatus().catch(err => console.error('Error refreshing status:', err))
        
        // Calcular filas importadas (excluyendo tb_FICHAS que es catálogo)
        const dataRows = statusList.value
          .filter(s => s.table !== 'tb_FICHAS')
          .reduce((sum, s) => sum + (s.rows_imported || 0), 0)
        
        // Mostrar resultado en modal para que sea bien visible
        Swal.fire({
          icon: 'success',
          title: '✓ Importación Completa',
          html: `
            <div style="text-align: left; padding: 10px;">
              <div style="font-size: 1.1em; margin-bottom: 15px;">
                <strong>${statusList.value.length} tablas</strong> • <strong>${dataRows.toLocaleString()}</strong> registros importados
              </div>
              <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; font-family: monospace;">
                <div style="margin-bottom: 8px;">
                  <span style="color: #059669; font-weight: bold;">⏱️ Servidor:</span> 
                  <span style="font-size: 1.2em; font-weight: bold;">${secondsServer}s</span>
                </div>
                <div>
                  <span style="color: #3b82f6; font-weight: bold;">🖥️ UI:</span> 
                  <span style="font-size: 1.2em; font-weight: bold;">${secondsUI}s</span>
                </div>
              </div>
            </div>
          `,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#059669',
          allowOutsideClick: false
        })
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      stopPolling()
      importing.value = false
      forceAllRunning.value = false
      completedTables.value = new Set()
      currentImportTable.value = null
      if (err.name === 'AbortError') {
        toast.fire({ icon: 'warning', title: 'Timeout', text: 'La importación completa tomó demasiado tiempo' })
      } else {
        console.error(err)
        toastError.fire({ title: err.message || 'Falló la ejecución del script' })
      }
    }
  }
}

async function forceImportTable(item) {
  const result = await Swal.fire({
    title: `¿Forzar ${item.table}?`,
    html: `Se re-importará la tabla <strong>${item.table}</strong> desde:<br><code>${getFileName(item.file)}</code>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#ea580c',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Sí, forzar',
    cancelButtonText: 'Cancelar'
  })

  if (result.isConfirmed) {
    importing.value = true
    importOutput.value = null
    currentImportTable.value = item.table
    forceAllRunning.value = false
    
    // Cambiar estado visual a "Importando..."
    item.status = 'IMPORTING'
    
    const t0 = performance.now()
    // Guardar timestamp inicial para detección de cambio
    const initialTimestamp = item.last_import_date ?? null
    
    try {
      // Ejecutar importación con timeout de 30 segundos
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      const res = await fetch(`${API_URL}/import/force-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: item.table }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      
      const data = await res.json()
      
      if (data.success) {
        currentImportTable.value = null
        importing.value = false
        
        // Refrescar estado
        await fetchStatus()
        
        // Mostrar mensaje de éxito
        const elapsed = Math.round(performance.now() - t0)
        const seconds = (elapsed / 1000).toFixed(2)
        toast.fire({
          icon: 'success',
          title: `✓ ${item.table} importada`,
          text: `${data.rows?.toLocaleString() || 0} filas • ${seconds}s`,
          timer: 4000
        })
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      currentImportTable.value = null
      importing.value = false
      
      if (err.name === 'AbortError') {
        console.error('Timeout después de 30 segundos')
        // Fallback: verificar si la importación sí terminó en backend
        await fetchStatus()
        const updated = statusList.value.find(i => i.table === item.table)
        if (updated && updated.last_import_date && updated.last_import_date !== initialTimestamp) {
          toast.fire({
            icon: 'success',
            title: `${item.table} importada`,
            text: `${updated.rows_imported?.toLocaleString() || 0} filas (detectado por estado)`
          })
        } else {
          toast.fire({ icon: 'warning', title: 'Timeout', text: 'La importación tomó demasiado tiempo (>30s)' })
        }
      } else {
        console.error('Error en importación:', err)
        toastError.fire({ title: err.message || 'Falló la importación' })
      }
    }
  }
}

function formatDate(isoString) {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleString()
}

function startPolling() {
  stopPolling()
  pollIntervalId = setInterval(async () => {
    if (!importing.value) {
      stopPolling()
      return
    }
    await fetchStatus()
    updateProgressPointers()
  }, 500)
}

function stopPolling() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId)
    pollIntervalId = null
  }
}

function updateProgressPointers() {
  if (!importing.value) return
  if (forceAllRunning.value) {
    // Detectar tablas completadas comparando baseline
    const updatedSet = new Set(completedTables.value)
    statusList.value.forEach((s) => {
      const base = baselineImports.value[s.table]
      if (!base) return
      const changed = (base.last !== s.last_import_date) || (base.rows !== s.rows_imported)
      if (changed) {
        updatedSet.add(s.table)
      }
    })
    completedTables.value = updatedSet
    // La tabla actual es la primera no completada en el orden recibido
    const next = statusList.value.find((s) => !completedTables.value.has(s.table))
    currentImportTable.value = next ? next.table : null
  } else {
    const next = statusList.value.find((s) => s.status !== 'UP_TO_DATE')
    currentImportTable.value = next ? next.table : null
  }
}
</script>
