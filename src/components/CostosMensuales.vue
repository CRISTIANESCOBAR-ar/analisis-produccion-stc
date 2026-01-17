<template>
  <div class="w-full h-screen flex flex-col p-1">
    <main class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col">
      <div class="flex items-center justify-between gap-4 flex-shrink-0 mb-4">
        <h3 class="text-lg font-semibold text-slate-800">Costos mensuales (ARS por unidad)</h3>

        <div class="flex items-center gap-3">
          <button
            class="px-3 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="cargando"
            @click="mostrarDialogoNuevoMes = true"
          >
            + Agregar mes
          </button>
          <button
            class="px-3 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            :disabled="cargando || !tieneCambios"
            @click="guardar"
          >
            Guardar cambios
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
              <th scope="col" class="px-3 py-2 font-bold border-b border-slate-200">Mes</th>
              <th scope="col" class="px-3 py-2 font-bold border-b border-slate-200 text-right">Urdido Teñido (ARS/m)</th>
              <th scope="col" class="px-3 py-2 font-bold border-b border-slate-200 text-right">Tela Terminada (ARS/m)</th>
              <th scope="col" class="px-3 py-2 font-bold border-b border-slate-200 text-right">Estopa Azul (ARS/kg)</th>
              <th scope="col" class="px-3 py-2 font-bold border-b border-slate-200">Observaciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="(fila, idx) in filasPorMes" :key="idx" class="bg-white hover:bg-slate-50">
              <td class="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">{{ fila.yyyymm }}</td>
              <td class="px-3 py-2 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-32 text-right border border-slate-300 rounded-md px-2 py-1 text-sm"
                  v-model="fila.urdido.valor"
                  @input="marcarCambio"
                />
              </td>
              <td class="px-3 py-2 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-32 text-right border border-slate-300 rounded-md px-2 py-1 text-sm"
                  v-model="fila.tela.valor"
                  @input="marcarCambio"
                />
              </td>
              <td class="px-3 py-2 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-32 text-right border border-slate-300 rounded-md px-2 py-1 text-sm"
                  v-model="fila.estopa.valor"
                  @input="marcarCambio"
                />
              </td>
              <td class="px-3 py-2">
                <input
                  type="text"
                  class="w-full border border-slate-300 rounded-md px-2 py-1 text-sm"
                  v-model="fila.observaciones"
                  placeholder="Opcional"
                  @input="marcarCambio"
                />
              </td>
            </tr>
            <tr v-if="!cargando && filasPorMes.length === 0">
              <td colspan="5" class="px-3 py-6 text-center text-slate-500">No hay datos históricos.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 text-xs text-slate-500">
        Mostrando últimos 24 meses. Dejá el valor vacío para eliminarlo.
      </div>

      <!-- Modal Nuevo Mes -->
      <div v-if="mostrarDialogoNuevoMes" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
          <h4 class="text-lg font-semibold text-slate-800 mb-4">Agregar nuevo mes</h4>
          
          <div v-if="errorDialogo" class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {{ errorDialogo }}
          </div>
          
          <div class="space-y-4 mb-6">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Mes (YYYY-MM)</label>
              <input
                type="text"
                placeholder="2025-12"
                class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                v-model="nuevoMesForm.mes"
                @keyup.enter="agregarNuevoMes"
              />
              <p class="text-xs text-slate-500 mt-1">Formato: YYYY-MM (ej: 2025-12)</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Urdido Teñido (ARS/m)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                v-model="nuevoMesForm.urdido"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Tela Terminada (ARS/m)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                v-model="nuevoMesForm.tela"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Estopa Azul (ARS/kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                v-model="nuevoMesForm.estopa"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Observaciones (opcional)</label>
              <input
                type="text"
                placeholder="Deixe em branco se não tiver"
                class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                v-model="nuevoMesForm.observaciones"
              />
            </div>
          </div>
          
          <div class="flex gap-3 justify-end">
            <button
              class="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              @click="cerrarDialogoNuevoMes"
            >
              Cancelar
            </button>
            <button
              class="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
              @click="agregarNuevoMes"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDatabase } from '../composables/useDatabase'

const { getCostosMensual, saveCostosMensual } = useDatabase()

const filasPorMes = ref([])
const cargando = ref(false)
const mensaje = ref('')
const mensajeTipo = ref('ok')
const tieneCambios = ref(false)
const mostrarDialogoNuevoMes = ref(false)
const errorDialogo = ref('')
const nuevoMesForm = ref({
  mes: '',
  urdido: '',
  tela: '',
  estopa: '',
  observaciones: ''
})

const itemIds = ref({
  urdido: null,
  tela: null,
  estopa: null
})

function setMensaje(texto, tipo = 'ok') {
  mensaje.value = texto
  mensajeTipo.value = tipo
  if (texto) {
    setTimeout(() => {
      if (mensaje.value === texto) mensaje.value = ''
    }, 3500)
  }
}

function marcarCambio() {
  tieneCambios.value = true
}

async function cargar() {
  cargando.value = true
  try {
    const data = await getCostosMensual(24)
    const rows = data.rows || []
    
    // Agrupar por mes
    const porMes = new Map()
    
    for (const row of rows) {
      const mes = row.yyyymm
      if (!porMes.has(mes)) {
        porMes.set(mes, {
          yyyymm: mes,
          urdido: { valor: '', itemId: null },
          tela: { valor: '', itemId: null },
          estopa: { valor: '', itemId: null },
          observaciones: ''
        })
      }
      
      const fila = porMes.get(mes)
      
      if (row.codigo === 'URDIDO_TENIDO') {
        fila.urdido.valor = row.ars_por_unidad ?? ''
        fila.urdido.itemId = row.item_id
        itemIds.value.urdido = row.item_id
        if (row.observaciones) fila.observaciones = row.observaciones
      } else if (row.codigo === 'TELA_TERMINADA') {
        fila.tela.valor = row.ars_por_unidad ?? ''
        fila.tela.itemId = row.item_id
        itemIds.value.tela = row.item_id
        if (row.observaciones) fila.observaciones = row.observaciones
      } else if (row.codigo === 'ESTOPA_AZUL') {
        fila.estopa.valor = row.ars_por_unidad ?? ''
        fila.estopa.itemId = row.item_id
        itemIds.value.estopa = row.item_id
        if (row.observaciones) fila.observaciones = row.observaciones
      }
    }
    
    filasPorMes.value = Array.from(porMes.values()).sort((a, b) => b.yyyymm.localeCompare(a.yyyymm))
    tieneCambios.value = false
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
    const payload = []
    
    for (const fila of filasPorMes.value) {
      // Urdido
      if (fila.urdido.itemId) {
        payload.push({
          yyyymm: fila.yyyymm,
          item_id: fila.urdido.itemId,
          ars_por_unidad: fila.urdido.valor,
          observaciones: fila.observaciones || null
        })
      }
      
      // Tela
      if (fila.tela.itemId) {
        payload.push({
          yyyymm: fila.yyyymm,
          item_id: fila.tela.itemId,
          ars_por_unidad: fila.tela.valor,
          observaciones: fila.observaciones || null
        })
      }
      
      // Estopa
      if (fila.estopa.itemId) {
        payload.push({
          yyyymm: fila.yyyymm,
          item_id: fila.estopa.itemId,
          ars_por_unidad: fila.estopa.valor,
          observaciones: fila.observaciones || null
        })
      }
    }
    
    await saveCostosMensual(payload)
    setMensaje('Guardado OK', 'ok')
    tieneCambios.value = false
    await cargar()
  } catch (e) {
    setMensaje(`Error guardando costos: ${e.message || e}`, 'error')
  } finally {
    cargando.value = false
  }
}

function validarFormatoMes(mes) {
  const regex = /^\d{4}-\d{2}$/
  return regex.test(mes)
}

function validarMesNoRepetido(mes) {
  return !filasPorMes.value.some(fila => fila.yyyymm === mes)
}

function validarValoresNumericos(urdido, tela, estopa) {
  const valores = [urdido, tela, estopa]
  
  // Al menos uno debe ser válido
  const hayAlMenosUno = valores.some(v => v !== '' && v !== null && v !== undefined && !isNaN(v))
  if (!hayAlMenosUno) {
    return false
  }
  
  // Los que tengan valor deben ser números válidos >= 0
  for (const v of valores) {
    if (v !== '' && v !== null && v !== undefined) {
      const num = Number(v)
      if (isNaN(num) || num < 0) {
        return false
      }
    }
  }
  
  return true
}

function cerrarDialogoNuevoMes() {
  mostrarDialogoNuevoMes.value = false
  errorDialogo.value = ''
  nuevoMesForm.value = {
    mes: '',
    urdido: '',
    tela: '',
    estopa: '',
    observaciones: ''
  }
}

function agregarNuevoMes() {
  errorDialogo.value = ''
  
  const mes = nuevoMesForm.value.mes.trim()
  
  // Validar formato
  if (!mes) {
    errorDialogo.value = 'El mes es requerido'
    return
  }
  
  if (!validarFormatoMes(mes)) {
    errorDialogo.value = 'Formato inválido. Use YYYY-MM (ej: 2025-12)'
    return
  }
  
  // Validar que no esté repetido
  if (!validarMesNoRepetido(mes)) {
    errorDialogo.value = `El mes ${mes} ya existe`
    return
  }
  
  // Validar valores numéricos
  if (!validarValoresNumericos(nuevoMesForm.value.urdido, nuevoMesForm.value.tela, nuevoMesForm.value.estopa)) {
    errorDialogo.value = 'Al menos un valor es requerido y todos deben ser números válidos >= 0'
    return
  }
  
  // Crear nueva fila
  const nuevaFila = {
    yyyymm: mes,
    urdido: {
      valor: nuevoMesForm.value.urdido !== '' ? Number(nuevoMesForm.value.urdido) : '',
      itemId: itemIds.value.urdido
    },
    tela: {
      valor: nuevoMesForm.value.tela !== '' ? Number(nuevoMesForm.value.tela) : '',
      itemId: itemIds.value.tela
    },
    estopa: {
      valor: nuevoMesForm.value.estopa !== '' ? Number(nuevoMesForm.value.estopa) : '',
      itemId: itemIds.value.estopa
    },
    observaciones: nuevoMesForm.value.observaciones.trim()
  }
  
  // Agregar a la lista y ordenar
  filasPorMes.value.push(nuevaFila)
  filasPorMes.value.sort((a, b) => b.yyyymm.localeCompare(a.yyyymm))
  
  // Marcar como cambio y cerrar diálogo
  tieneCambios.value = true
  cerrarDialogoNuevoMes()
  setMensaje(`Mes ${mes} agregado. Recuerda guardar cambios`, 'ok')
}

onMounted(async () => {
  await cargar()
})
</script>
