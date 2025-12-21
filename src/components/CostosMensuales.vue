<template>
  <div class="w-full h-screen flex flex-col p-1">
    <main class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col">
      <div class="flex items-center justify-between gap-4 flex-shrink-0 mb-4">
        <h3 class="text-lg font-semibold text-slate-800">Costos mensuales (ARS/kg)</h3>

        <div class="flex items-center gap-3">
          <label class="text-sm font-medium text-slate-700">Mes:</label>
          <input
            type="month"
            v-model="yyyymm"
            class="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 bg-white"
          />
          <button
            class="px-3 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="cargando"
            @click="cargar"
          >
            Actualizar
          </button>
          <button
            class="px-3 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            :disabled="cargando || filas.length === 0"
            @click="guardar"
          >
            Guardar
          </button>
        </div>
      </div>

      <div v-if="mensaje" class="mb-3 text-sm" :class="mensajeTipo === 'ok' ? 'text-emerald-700' : 'text-red-700'">
        {{ mensaje }}
      </div>

      <div class="flex-1 overflow-auto min-h-0 border border-slate-200 rounded-lg relative">
        <div v-if="cargando" class="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <span class="text-sm text-slate-600 font-medium">Cargando...</span>
        </div>

        <table class="w-full text-sm text-left text-slate-700">
          <thead class="text-xs text-slate-700 bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th scope="col" class="px-3 py-2 font-bold border-b border-slate-200">Ítem</th>
              <th scope="col" class="px-3 py-2 font-bold border-b border-slate-200 text-right">ARS/kg</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="fila in filas" :key="fila.item_id" class="bg-white hover:bg-slate-50">
              <td class="px-3 py-2 font-medium text-slate-900">{{ fila.descripcion }}</td>
              <td class="px-3 py-2 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-40 text-right border border-slate-300 rounded-md px-2 py-1 text-sm"
                  v-model="fila.ars_por_unidad"
                />
              </td>
            </tr>
            <tr v-if="!cargando && filas.length === 0">
              <td colspan="2" class="px-3 py-6 text-center text-slate-500">No hay ítems activos para cargar.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 text-xs text-slate-500">
        Nota: si dejás el valor vacío, se elimina el costo del mes.
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDatabase } from '../composables/useDatabase'

const { getCostosMensual, saveCostosMensual } = useDatabase()

const yyyymm = ref('')
const filas = ref([])
const cargando = ref(false)
const mensaje = ref('')
const mensajeTipo = ref('ok')

function getCurrentYYYYMM() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function setMensaje(texto, tipo = 'ok') {
  mensaje.value = texto
  mensajeTipo.value = tipo
  if (texto) {
    setTimeout(() => {
      if (mensaje.value === texto) mensaje.value = ''
    }, 3500)
  }
}

async function cargar() {
  cargando.value = true
  try {
    const data = await getCostosMensual(yyyymm.value)
    filas.value = (data.rows || []).map(r => ({
      item_id: r.item_id,
      codigo: r.codigo,
      descripcion: r.descripcion,
      unidad: r.unidad,
      ars_por_unidad: r.ars_por_unidad ?? ''
    }))
    setMensaje('', 'ok')
  } catch (e) {
    setMensaje(`Error cargando costos: ${e.message || e}`, 'error')
  } finally {
    cargando.value = false
  }
}

async function guardar() {
  cargando.value = true
  try {
    const payload = filas.value.map(f => ({
      item_id: f.item_id,
      ars_por_unidad: f.ars_por_unidad
    }))
    await saveCostosMensual(yyyymm.value, payload)
    setMensaje('Guardado OK', 'ok')
    await cargar()
  } catch (e) {
    setMensaje(`Error guardando costos: ${e.message || e}`, 'error')
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  yyyymm.value = getCurrentYYYYMM()
  await cargar()
})
</script>
