<template>
  <div class="metas-container">
    <div class="header-section">
      <h2>Carga de Metas Mensuales</h2>
      <div class="controls">
        <select v-model="selectedMonth" @change="loadMetas" class="month-select">
          <option value="1">Enero</option>
          <option value="2">Febrero</option>
          <option value="3">Marzo</option>
          <option value="4">Abril</option>
          <option value="5">Mayo</option>
          <option value="6">Junio</option>
          <option value="7">Julio</option>
          <option value="8">Agosto</option>
          <option value="9">Septiembre</option>
          <option value="10">Octubre</option>
          <option value="11">Noviembre</option>
          <option value="12">Diciembre</option>
        </select>
        <select v-model="selectedYear" @change="loadMetas" class="year-select">
          <option value="2025">2025</option>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
        </select>
        <button @click="guardarMetas" class="btn-save">💾 Guardar</button>
        <button @click="exportarExcel" class="btn-export">📊 Exportar Excel</button>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="metas-table">
        <thead>
          <tr class="header-main">
            <th rowspan="2" class="col-dia">Dia</th>
            <th colspan="4" class="group-indigo">Indigo</th>
            <th colspan="4" class="group-tejeduria">Tejeduria</th>
            <th colspan="3" class="group-integrada">Integrada</th>
            <th rowspan="2" class="col-revision">Revisión</th>
            <th rowspan="2" class="col-invertido">Día Invertido</th>
          </tr>
          <tr class="header-sub">
            <!-- Indigo -->
            <th class="sub-header">Meta Día</th>
            <th class="sub-header">Eficiencia</th>
            <th class="sub-header">Rotura</th>
            <th class="sub-header">Estopa Azul</th>
            <!-- Tejeduria -->
            <th class="sub-header">Meta Día</th>
            <th class="sub-header">RU105</th>
            <th class="sub-header">RT105</th>
            <th class="sub-header">EFI%</th>
            <!-- Integrada -->
            <th class="sub-header">Meta Día</th>
            <th class="sub-header">Velocidad</th>
            <th class="sub-header">ENC/URD</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in metas" :key="index" :class="{ 'row-weekend': isWeekend(row.Dia) }">
            <td class="col-fecha">{{ formatDia(row.Dia) }}</td>
            <!-- Indigo -->
            <td><input type="number" v-model.number="row.Indigo" step="0.001" class="input-number" /></td>
            <td><input type="number" v-model.number="row.Meta_Eficiencia_INDIGO" step="0.1" class="input-number" /></td>
            <td><input type="number" v-model.number="row.Meta_Rotura_INDIGO" step="0.1" class="input-number" /></td>
            <td><input type="number" v-model.number="row.Meta_Estopa_Azul" step="0.1" class="input-number" /></td>
            <!-- Tejeduria -->
            <td><input type="number" v-model.number="row.Tejeduria" step="0.001" class="input-number" /></td>
            <td><input type="number" v-model.number="row.RU105" step="0.1" class="input-number" /></td>
            <td><input type="number" v-model.number="row.RT105" step="0.1" class="input-number" /></td>
            <td><input type="number" v-model.number="row.EFI_Percent" step="0.1" class="input-number" /></td>
            <!-- Integrada -->
            <td><input type="number" v-model.number="row.Integrada" step="0.001" class="input-number" /></td>
            <td><input type="number" v-model.number="row.Meta_Velocidad_Integrada" step="0.1" class="input-number" /></td>
            <td><input type="number" v-model.number="row.Meta_ENC_URD_Integrada" step="0.1" class="input-number" /></td>
            <!-- Revision -->
            <td><input type="number" v-model.number="row.Revision" step="0.001" class="input-number" /></td>
            <td class="col-invertido-value">{{ row.Dia_Invertido }}</td>
          </tr>
          <tr class="row-total">
            <td class="col-total-label">TOTAL MES</td>
            <td class="col-total">{{ totalIndigo.toFixed(3) }}</td>
            <td colspan="3"></td>
            <td class="col-total">{{ totalTejeduria.toFixed(3) }}</td>
            <td colspan="3"></td>
            <td class="col-total">{{ totalIntegrada.toFixed(3) }}</td>
            <td colspan="2"></td>
            <td class="col-total">{{ totalRevision.toFixed(3) }}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="mensaje" :class="['mensaje', mensaje.tipo]">
      {{ mensaje.texto }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const selectedMonth = ref(1) // Enero
const selectedYear = ref(2026)
const metas = ref([])
const mensaje = ref(null)

// Formatear fecha para mostrar
const formatDia = (fecha) => {
  const date = new Date(fecha + 'T00:00:00')
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  
  const diaSemana = dias[date.getDay()]
  const dia = String(date.getDate()).padStart(2, '0')
  const mes = meses[date.getMonth()]
  const año = String(date.getFullYear()).slice(-2)
  
  return `${diaSemana} ${dia}-${mes}-${año}`
}

// Verificar si es fin de semana
const isWeekend = (fecha) => {
  const date = new Date(fecha + 'T00:00:00')
  const day = date.getDay()
  return day === 0 || day === 6 // Domingo o Sábado
}

// Calcular totales
const totalIndigo = computed(() => {
  return metas.value.reduce((sum, row) => sum + (Number(row.Indigo) || 0), 0)
})

const totalTejeduria = computed(() => {
  return metas.value.reduce((sum, row) => sum + (Number(row.Tejeduria) || 0), 0)
})

const totalIntegrada = computed(() => {
  return metas.value.reduce((sum, row) => sum + (Number(row.Integrada) || 0), 0)
})

const totalRevision = computed(() => {
  return metas.value.reduce((sum, row) => sum + (Number(row.Revision) || 0), 0)
})

// Generar días del mes
const generarDiasMes = (mes, año) => {
  const diasEnMes = new Date(año, mes, 0).getDate()
  const dias = []
  
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fecha = new Date(año, mes - 1, dia)
    const fechaStr = fecha.toISOString().split('T')[0]
    const diaInvertido = diasEnMes - dia + 1
    
    dias.push({
      Dia: fechaStr,
      Indigo: null,
      Meta_Eficiencia_INDIGO: 88,
      Meta_Rotura_INDIGO: 1,
      Meta_Estopa_Azul: 1.8,
      Tejeduria: null,
      RU105: 1.6,
      RT105: 2,
      EFI_Percent: 88,
      Integrada: null,
      Meta_Velocidad_Integrada: 40,
      Meta_ENC_URD_Integrada: -1.5,
      Revision: null,
      Dia_Invertido: diaInvertido
    })
  }
  
  return dias
}

// Cargar metas desde la base de datos
const loadMetas = async () => {
  try {
    const response = await fetch(`/api/metas?mes=${selectedMonth.value}&año=${selectedYear.value}`)
    if (response.ok) {
      const data = await response.json()
      
      if (data.length > 0) {
        metas.value = data
      } else {
        // Si no hay datos, generar plantilla del mes
        metas.value = generarDiasMes(selectedMonth.value, selectedYear.value)
      }
    } else {
      // Si hay error, generar plantilla
      metas.value = generarDiasMes(selectedMonth.value, selectedYear.value)
    }
  } catch (error) {
    console.error('Error al cargar metas:', error)
    // En caso de error, generar plantilla
    metas.value = generarDiasMes(selectedMonth.value, selectedYear.value)
  }
}

// Guardar metas en la base de datos
const guardarMetas = async () => {
  try {
    const response = await fetch('/api/metas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metas.value)
    })
    
    if (response.ok) {
      mensaje.value = { tipo: 'success', texto: '✓ Metas guardadas correctamente' }
      setTimeout(() => { mensaje.value = null }, 3000)
    } else {
      const error = await response.json()
      mensaje.value = { tipo: 'error', texto: `✗ Error: ${error.message}` }
    }
  } catch (error) {
    console.error('Error al guardar metas:', error)
    mensaje.value = { tipo: 'error', texto: '✗ Error al guardar las metas' }
  }
}

// Exportar a Excel
const exportarExcel = () => {
  // Crear CSV
  const headers = [
    'Dia', 'Indigo', 'Meta_Eficiencia_INDIGO', 'Meta_Rotura_INDIGO', 'Meta_Estopa_Azul',
    'Tejeduria', 'RU105', 'RT105', 'EFI%', 'Integrada',
    'Meta_Velocidad_Integrada', 'Meta_ENC_URD_Integrada', 'Revision', 'Dia_Invertido'
  ]
  
  let csv = headers.join('\t') + '\n'
  
  metas.value.forEach(row => {
    const values = [
      formatDia(row.Dia),
      row.Indigo || '',
      row.Meta_Eficiencia_INDIGO || '',
      row.Meta_Rotura_INDIGO || '',
      row.Meta_Estopa_Azul || '',
      row.Tejeduria || '',
      row.RU105 || '',
      row.RT105 || '',
      row.EFI_Percent || '',
      row.Integrada || '',
      row.Meta_Velocidad_Integrada || '',
      row.Meta_ENC_URD_Integrada || '',
      row.Revision || '',
      row.Dia_Invertido || ''
    ]
    csv += values.join('\t') + '\n'
  })
  
  // Descargar archivo
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `metas_${selectedYear.value}_${String(selectedMonth.value).padStart(2, '0')}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(() => {
  // Cargar el mes actual
  const now = new Date()
  selectedMonth.value = now.getMonth() + 1
  selectedYear.value = now.getFullYear()
  loadMetas()
})
</script>

<style scoped>
.metas-container {
  padding: 20px;
  max-width: 100%;
  overflow-x: auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.header-section h2 {
  margin: 0;
  color: #1a1a1a;
  font-size: 1.5rem;
}

.controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.month-select,
.year-select {
  padding: 8px 12px;
  border: 1px solid #0C769E;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.btn-save,
.btn-export {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save {
  background: #0C769E;
  color: white;
}

.btn-save:hover {
  background: #0a5f7e;
}

.btn-export {
  background: #28a745;
  color: white;
}

.btn-export:hover {
  background: #218838;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #0C769E;
  border-radius: 4px;
}

.metas-table {
  width: 100%;
  border-collapse: collapse;
  font-family: Verdana, sans-serif;
  font-size: 11px;
  background: white;
}

.metas-table th,
.metas-table td {
  border: 1px solid #0C769E;
  padding: 6px 8px;
  text-align: center;
}

.header-main th {
  background: #215C98;
  color: white;
  font-weight: 700;
  padding: 10px 8px;
}

.header-sub th {
  background: #A6C9EC;
  color: #000;
  font-weight: 600;
  font-size: 10px;
  padding: 8px 6px;
}

.group-indigo {
  background: #d4edda !important;
}

.group-tejeduria {
  background: #fff3cd !important;
}

.group-integrada {
  background: #cfe2ff !important;
}

.col-dia,
.col-revision,
.col-invertido {
  background: #A6C9EC;
  font-weight: 700;
}

.col-fecha {
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
  min-width: 150px;
  background: #f8f9fa;
}

.input-number {
  width: 80px;
  padding: 4px 6px;
  border: 1px solid #ced4da;
  border-radius: 3px;
  text-align: right;
  font-size: 11px;
  font-family: Verdana, sans-serif;
}

.input-number:focus {
  outline: none;
  border-color: #0C769E;
  box-shadow: 0 0 0 2px rgba(12, 118, 158, 0.2);
}

.row-weekend {
  background: #ffe6e6;
}

.row-total {
  background: #215C98;
  color: white;
  font-weight: 700;
  font-size: 12px;
}

.col-total-label {
  text-align: left;
  padding-left: 15px;
}

.col-total {
  font-size: 13px;
  background: #1a4a73;
}

.col-invertido-value {
  font-weight: 700;
  color: #0C769E;
}

.mensaje {
  margin-top: 15px;
  padding: 12px 20px;
  border-radius: 4px;
  font-weight: 600;
  text-align: center;
}

.mensaje.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.mensaje.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* Responsive */
@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .controls {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .input-number {
    width: 60px;
  }
}
</style>
