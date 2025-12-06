<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Control de Importaciones</h1>
      <div class="flex gap-3">
        <button 
          @click="fetchStatus" 
          class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          :disabled="loading"
        >
          <span v-if="loading" class="animate-spin">↻</span>
          <span v-else>↻</span>
          Refrescar
        </button>
        <button 
          @click="forceImportAll" 
          class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors shadow-sm"
          :disabled="importing || loading"
        >
          <span v-if="importing" class="animate-spin">⚡</span>
          <span v-else>⚡</span>
          {{ importing ? 'Importando...' : 'Forzar Importación' }}
        </button>
        <button 
          @click="triggerImport" 
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"
          :disabled="importing || loading"
        >
          <span v-if="importing" class="animate-spin">⚙️</span>
          <span v-else>🚀</span>
          {{ importing ? 'Importando...' : 'Ejecutar Actualización' }}
        </button>
      </div>
    </div>

    <!-- Resumen de Estado -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div class="text-sm text-gray-500 mb-1">Total Archivos</div>
        <div class="text-2xl font-bold text-gray-800">{{ statusList.length }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div class="text-sm text-gray-500 mb-1">Actualizados</div>
        <div class="text-2xl font-bold text-green-600">{{ countStatus('UP_TO_DATE') }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div class="text-sm text-gray-500 mb-1">Desactualizados</div>
        <div class="text-2xl font-bold text-yellow-600">{{ countStatus('OUTDATED') }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div class="text-sm text-gray-500 mb-1">Faltantes / Error</div>
        <div class="text-2xl font-bold text-red-600">{{ countStatus('MISSING_FILE') + countStatus('NOT_IMPORTED') }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div class="text-sm text-gray-500 mb-1">Tamaño DB</div>
        <div class="text-2xl font-bold text-purple-600">{{ dbInfo ? dbInfo.sizeMB + ' MB' : '-' }}</div>
      </div>
    </div>

    <!-- Tabla de Estado -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tabla Destino</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivo Origen</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Modif. (Archivo)</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Importación</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filas</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
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
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ item.table }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500" :title="item.file">{{ getFileName(item.file) }}</div>
                <div class="text-xs text-gray-400">Hoja: {{ item.sheet }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="importing && currentImportTable === item.table" class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="animate-spin">⚙️</span>
                    <span class="text-sm font-medium text-blue-600">Importando...</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div class="bg-blue-600 h-2 rounded-full animate-pulse" style="width: 100%"></div>
                  </div>
                </div>
                <span v-else :class="getStatusClass(item.status)" class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ getStatusLabel(item.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(item.fileModified) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div v-if="item.lastImportDate">
                  {{ formatDate(item.lastImportDate) }}
                </div>
                <div v-else class="text-gray-400">-</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ item.lastImportedRows !== null ? item.lastImportedRows.toLocaleString() : '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button 
                  @click="forceImportTable(item)" 
                  class="px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
                  :disabled="importing || loading"
                >
                  <span>⚡</span>
                  Forzar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Log de Importación -->
    <div v-if="importOutput" class="mt-8 bg-gray-900 rounded-xl shadow-lg overflow-hidden">
      <div class="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h3 class="text-sm font-mono text-gray-300">Log de Ejecución</h3>
        <button @click="importOutput = null" class="text-gray-400 hover:text-white">✕</button>
      </div>
      <pre class="p-4 text-xs font-mono text-green-400 overflow-auto max-h-96 whitespace-pre-wrap">{{ importOutput }}</pre>
    </div>
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

const API_URL = 'http://localhost:3002/api'

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
    statusList.value = await resStatus.json()
    
    if (resDb.ok) {
      dbInfo.value = await resDb.json()
    }
  } catch (err) {
    console.error(err)
    Swal.fire('Error', 'No se pudo conectar con el servidor de API', 'error')
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
    
    // Iniciar polling del estado cada 1 segundo
    const pollInterval = setInterval(async () => {
      if (!importing.value) {
        clearInterval(pollInterval)
        return
      }
      await fetchStatus()
      // Detectar qué tabla está siendo actualizada
      const outdated = statusList.value.find(s => s.status === 'OUTDATED')
      if (outdated) {
        currentImportTable.value = outdated.table
      }
    }, 1000)
    
    try {
      const res = await fetch(`${API_URL}/import/trigger`, { method: 'POST' })
      const data = await res.json()
      
      clearInterval(pollInterval)
      currentImportTable.value = null
      
      if (data.success) {
        importOutput.value = data.output
        Swal.fire('Completado', 'El proceso de importación ha finalizado.', 'success')
        fetchStatus() // Recargar estado final
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      clearInterval(pollInterval)
      currentImportTable.value = null
      console.error(err)
      Swal.fire('Error', 'Falló la ejecución del script de importación', 'error')
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
    default: return status
  }
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
    
    const pollInterval = setInterval(async () => {
      if (!importing.value) {
        clearInterval(pollInterval)
        return
      }
      await fetchStatus()
    }, 1000)
    
    try {
      const res = await fetch(`${API_URL}/import/force-all`, { method: 'POST' })
      const data = await res.json()
      
      clearInterval(pollInterval)
      currentImportTable.value = null
      
      if (data.success) {
        importOutput.value = data.output
        Swal.fire('Completado', 'La importación forzada ha finalizado.', 'success')
        fetchStatus()
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      clearInterval(pollInterval)
      currentImportTable.value = null
      console.error(err)
      Swal.fire('Error', err.message || 'Falló la ejecución del script', 'error')
    } finally {
      importing.value = false
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
    
    const pollInterval = setInterval(async () => {
      if (!importing.value) {
        clearInterval(pollInterval)
        return
      }
      await fetchStatus()
    }, 1000)
    
    try {
      const res = await fetch(`${API_URL}/import/force-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: item.table })
      })
      const data = await res.json()
      
      clearInterval(pollInterval)
      currentImportTable.value = null
      
      if (data.success) {
        importOutput.value = data.output
        Swal.fire('Completado', `La tabla ${item.table} fue importada correctamente.`, 'success')
        fetchStatus()
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      clearInterval(pollInterval)
      currentImportTable.value = null
      console.error(err)
      Swal.fire('Error', err.message || 'Falló la importación', 'error')
    } finally {
      importing.value = false
    }
  }
}

function formatDate(isoString) {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleString()
}
</script>
