<template>
  <div class="historico-container">
    <div class="header">
      <h1 class="title">📊 ANÁLISIS HISTÓRICO REVISORES</h1>
      <p class="subtitle">Rendimiento mensual por revisor</p>
    </div>

    <!-- Filtros -->
    <div class="filters-card">
      <div class="filters-grid-historico">
        <!-- Revisor -->
        <div class="filter-group">
          <label>Revisor:</label>
          <select v-model="filtros.revisor" class="filter-input" @change="loadData" :disabled="loading">
            <option value="">Seleccione un revisor</option>
            <option v-for="rev in revisores" :key="rev" :value="rev">{{ rev }}</option>
          </select>
        </div>

        <!-- Fecha Inicio -->
        <div class="filter-group">
          <label>Fecha Inicio:</label>
          <div class="custom-datepicker" ref="datepickerStartRef">
            <input 
              type="text" 
              v-model="displayFechaInicio" 
              class="filter-input datepicker-input"
              placeholder="Selecciona fecha inicio"
              @click="toggleCalendar('start')"
              readonly
            />
            <span class="calendar-icon" @click="toggleCalendar('start')">📅</span>
            
            <div v-if="showCalendarStart" class="calendar-dropdown">
              <div class="calendar-header">
                <button class="calendar-nav-btn" @click.stop="changeMonth('start', -1)">&lt;</button>
                <div class="calendar-selects">
                  <select :value="calendarStartMonth.getMonth()" @change="updateMonth('start', $event)" @click.stop class="calendar-select">
                    <option v-for="(m, i) in monthNames" :key="i" :value="i">{{ m }}</option>
                  </select>
                  <select :value="calendarStartMonth.getFullYear()" @change="updateYear('start', $event)" @click.stop class="calendar-select">
                    <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
                  </select>
                </div>
                <button class="calendar-nav-btn" @click.stop="changeMonth('start', 1)">&gt;</button>
              </div>
              <div class="calendar-weekdays">
                <span v-for="day in ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']" :key="day">{{ day }}</span>
              </div>
              <div class="calendar-days">
                <button 
                  v-for="day in calendarStartDays" 
                  :key="day.key"
                  :class="['calendar-day', {
                    'other-month': day.otherMonth,
                    'selected': day.selected,
                    'today': day.today
                  }]"
                  @click.stop="selectDate('start', day)"
                  :disabled="day.otherMonth"
                >
                  {{ day.day }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Fecha Fin -->
        <div class="filter-group">
          <label>Fecha Fin:</label>
          <div class="custom-datepicker" ref="datepickerEndRef">
            <input 
              type="text" 
              v-model="displayFechaFin" 
              class="filter-input datepicker-input"
              placeholder="Selecciona fecha fin"
              @click="toggleCalendar('end')"
              readonly
            />
            <span class="calendar-icon" @click="toggleCalendar('end')">📅</span>
            
            <div v-if="showCalendarEnd" class="calendar-dropdown">
              <div class="calendar-header">
                <button class="calendar-nav-btn" @click.stop="changeMonth('end', -1)">&lt;</button>
                <div class="calendar-selects">
                  <select :value="calendarEndMonth.getMonth()" @change="updateMonth('end', $event)" @click.stop class="calendar-select">
                    <option v-for="(m, i) in monthNames" :key="i" :value="i">{{ m }}</option>
                  </select>
                  <select :value="calendarEndMonth.getFullYear()" @change="updateYear('end', $event)" @click.stop class="calendar-select">
                    <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
                  </select>
                </div>
                <button class="calendar-nav-btn" @click.stop="changeMonth('end', 1)">&gt;</button>
              </div>
              <div class="calendar-weekdays">
                <span v-for="day in ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']" :key="day">{{ day }}</span>
              </div>
              <div class="calendar-days">
                <button 
                  v-for="day in calendarEndDays" 
                  :key="day.key"
                  :class="['calendar-day', {
                    'other-month': day.otherMonth,
                    'selected': day.selected,
                    'today': day.today
                  }]"
                  @click.stop="selectDate('end', day)"
                  :disabled="day.otherMonth"
                >
                  {{ day.day }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tramas -->
        <div class="filter-group">
          <label>Tramas:</label>
          <select v-model="filtros.tramas" class="filter-input" @change="loadData">
            <option value="Todas">Todas</option>
            <option value="ALG 100%">ALG 100%</option>
            <option value="P + E">P + E</option>
            <option value="POL 100%">POL 100%</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tabla de Resultados -->
    <div class="table-card">
      <div class="table-header">
        <div class="results-info">
          <span v-if="loading" class="results-count">Cargando...</span>
          <span v-else-if="!filtros.revisor" class="results-count">Seleccione un revisor</span>
          <span v-else class="results-count">{{ historico.length }} meses - {{ filtros.revisor }}</span>
        </div>
      </div>

      <div v-if="historico.length > 0" class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-mes" rowspan="2">MES-AÑO</th>
              <th class="col-metros text-center" rowspan="2">Metros Día</th>
              <th class="text-center border-b-2 border-gray-200" colspan="2">Calidad %</th>
              <th class="text-center border-b-2 border-gray-200" colspan="2">Pts 100 m²</th>
              <th class="col-rollos text-center" rowspan="2">Rollos 1era</th>
              <th class="col-sin-pts-un text-center" rowspan="2">Sin Pts [un]</th>
              <th class="text-center border-b-2 border-gray-200" colspan="2">Sin Pts [%]</th>
            </tr>
            <tr>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">Revisor</th>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">Todos</th>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">Revisor</th>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">Todos</th>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">Revisor</th>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">Todos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in historico" :key="row.MesAno">
              <td class="col-mes font-medium">{{ formatMesAno(row.MesAno) }}</td>
              <td class="col-metros text-center font-bold">{{ formatInteger(row.Mts_Total) }}</td>
              
              <!-- Calidad -->
              <td class="col-calidad text-center font-medium">{{ formatNumber(row.Calidad_Perc) }}</td>
              <td class="col-calidad text-center text-gray-500">{{ formatNumber(row.Global_Calidad_Perc) }}</td>
              
              <!-- Pts -->
              <td class="col-pts text-center font-medium">{{ formatNumber(row.Pts_100m2) }}</td>
              <td class="col-pts text-center text-gray-500">{{ formatNumber(row.Global_Pts_100m2) }}</td>
              
              <td class="col-rollos text-center">{{ row.Rollos_1era }}</td>
              <td class="col-sin-pts-un text-center">{{ row.Rollos_Sin_Pts }}</td>
              
              <!-- Sin Pts % -->
              <td class="col-sin-pts-perc text-center font-medium">{{ formatNumber(row.Perc_Sin_Pts) }}</td>
              <td class="col-sin-pts-perc text-center text-gray-500">{{ formatNumber(row.Global_Perc_Sin_Pts) }}</td>
            </tr>
            <!-- Fila Totales -->
            <tr v-if="historico.length > 0" class="bg-gray-100 font-bold border-t-2 border-gray-300">
              <td class="col-mes">Total / Promedio</td>
              <td class="col-metros text-center">{{ formatInteger(totales.Mts_Total) }}</td>
              
              <td class="col-calidad text-center">{{ formatNumber(totales.Calidad_Perc) }}</td>
              <td class="col-calidad text-center text-gray-600">{{ formatNumber(totales.Global_Calidad_Perc) }}</td>
              
              <td class="col-pts text-center">{{ formatNumber(totales.Pts_100m2) }}</td>
              <td class="col-pts text-center text-gray-600">{{ formatNumber(totales.Global_Pts_100m2) }}</td>
              
              <td class="col-rollos text-center">{{ totales.Rollos_1era }}</td>
              <td class="col-sin-pts-un text-center">{{ totales.Rollos_Sin_Pts }}</td>
              
              <td class="col-sin-pts-perc text-center">{{ formatNumber(totales.Perc_Sin_Pts) }}</td>
              <td class="col-sin-pts-perc text-center text-gray-600">{{ formatNumber(totales.Global_Perc_Sin_Pts) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="!loading && filtros.revisor" class="empty-state">
        <p>No hay datos para el período seleccionado</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const API_URL = 'http://localhost:3002';

// Estado
const loading = ref(false);
const revisores = ref([]);
const historico = ref([]);

// Filtros
const filtros = ref({
  revisor: '',
  fechaInicio: getDefaultStartDate(),
  fechaFin: getDefaultEndDate(),
  tramas: 'Todas'
});

// Calendarios
const showCalendarStart = ref(false);
const showCalendarEnd = ref(false);
const calendarStartMonth = ref(new Date());
const calendarEndMonth = ref(new Date());
const datepickerStartRef = ref(null);
const datepickerEndRef = ref(null);

// Computed
const displayFechaInicio = computed(() => formatDisplayDate(filtros.value.fechaInicio));
const displayFechaFin = computed(() => formatDisplayDate(filtros.value.fechaFin));

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const years = computed(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 2020; i <= currentYear + 1; i++) {
    years.push(i);
  }
  return years;
});

const calendarStartDays = computed(() => generateCalendarDays(calendarStartMonth.value, filtros.value.fechaInicio));
const calendarEndDays = computed(() => generateCalendarDays(calendarEndMonth.value, filtros.value.fechaFin));

const totales = computed(() => {
  if (historico.value.length === 0) return {};
  
  const totalMetros = historico.value.reduce((sum, r) => sum + (r.Mts_Total || 0), 0);
  const totalRollos1era = historico.value.reduce((sum, r) => sum + (r.Rollos_1era || 0), 0);
  const totalRollosSinPts = historico.value.reduce((sum, r) => sum + (r.Rollos_Sin_Pts || 0), 0);
  
  // Global totals for weighted averages
  const totalMetrosGlobal = historico.value.reduce((sum, r) => sum + (r.Global_Mts_Total || 0), 0);

  // Promedios ponderados Revisor
  const avgCalidad = historico.value.reduce((sum, r) => sum + (r.Calidad_Perc || 0) * (r.Mts_Total || 0), 0) / totalMetros;
  const avgPts = historico.value.reduce((sum, r) => sum + (r.Pts_100m2 || 0) * (r.Mts_Total || 0), 0) / totalMetros;
  const avgSinPts = totalRollos1era > 0 ? (totalRollosSinPts / totalRollos1era) * 100 : 0;
  
  // Promedios ponderados Global
  const avgCalidadGlobal = historico.value.reduce((sum, r) => sum + (r.Global_Calidad_Perc || 0) * (r.Global_Mts_Total || 0), 0) / totalMetrosGlobal;
  const avgPtsGlobal = historico.value.reduce((sum, r) => sum + (r.Global_Pts_100m2 || 0) * (r.Global_Mts_Total || 0), 0) / totalMetrosGlobal;
  const avgSinPtsGlobal = historico.value.reduce((sum, r) => sum + (r.Global_Perc_Sin_Pts || 0) * (r.Global_Mts_Total || 0), 0) / totalMetrosGlobal;

  return {
    Mts_Total: totalMetros,
    Calidad_Perc: avgCalidad,
    Pts_100m2: avgPts,
    Rollos_1era: totalRollos1era,
    Rollos_Sin_Pts: totalRollosSinPts,
    Perc_Sin_Pts: avgSinPts,
    Global_Calidad_Perc: avgCalidadGlobal,
    Global_Pts_100m2: avgPtsGlobal,
    Global_Perc_Sin_Pts: avgSinPtsGlobal
  };
});

// Funciones de fecha
function getDefaultStartDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 6); // 6 meses atrás
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate() {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function formatMesAno(mesAno) {
  if (!mesAno) return '';
  const [year, month] = mesAno.split('-');
  const monthName = getMonthName(parseInt(month) - 1);
  return `${monthName} ${year}`;
}

function getMonthName(monthIndex) {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[monthIndex];
}

// Calendario
function toggleCalendar(type) {
  if (type === 'start') {
    showCalendarStart.value = !showCalendarStart.value;
    showCalendarEnd.value = false;
    if (showCalendarStart.value) {
      calendarStartMonth.value = new Date(filtros.value.fechaInicio);
    }
  } else {
    showCalendarEnd.value = !showCalendarEnd.value;
    showCalendarStart.value = false;
    if (showCalendarEnd.value) {
      calendarEndMonth.value = new Date(filtros.value.fechaFin);
    }
  }
}

function changeMonth(type, delta) {
  if (type === 'start') {
    const newDate = new Date(calendarStartMonth.value);
    newDate.setMonth(newDate.getMonth() + delta);
    calendarStartMonth.value = newDate;
  } else {
    const newDate = new Date(calendarEndMonth.value);
    newDate.setMonth(newDate.getMonth() + delta);
    calendarEndMonth.value = newDate;
  }
}

function updateMonth(type, event) {
  const month = parseInt(event.target.value);
  if (type === 'start') {
    const newDate = new Date(calendarStartMonth.value);
    newDate.setMonth(month);
    calendarStartMonth.value = newDate;
  } else {
    const newDate = new Date(calendarEndMonth.value);
    newDate.setMonth(month);
    calendarEndMonth.value = newDate;
  }
}

function updateYear(type, event) {
  const year = parseInt(event.target.value);
  if (type === 'start') {
    const newDate = new Date(calendarStartMonth.value);
    newDate.setFullYear(year);
    calendarStartMonth.value = newDate;
  } else {
    const newDate = new Date(calendarEndMonth.value);
    newDate.setFullYear(year);
    calendarEndMonth.value = newDate;
  }
}

function selectDate(type, day) {
  if (day.otherMonth) return;
  
  const baseDate = type === 'start' ? calendarStartMonth.value : calendarEndMonth.value;
  const selectedDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), day.day);
  const isoDate = selectedDate.toISOString().split('T')[0];
  
  if (type === 'start') {
    filtros.value.fechaInicio = isoDate;
    showCalendarStart.value = false;
  } else {
    filtros.value.fechaFin = isoDate;
    showCalendarEnd.value = false;
  }
  
  loadData();
}

function generateCalendarDays(monthDate, selectedIsoDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Días del mes anterior
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      key: `prev-${prevMonthLastDay - i}`,
      day: prevMonthLastDay - i,
      otherMonth: true,
      selected: false,
      today: false
    });
  }
  
  // Días del mes actual
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const currentDate = new Date(year, month, day);
    const isoDate = currentDate.toISOString().split('T')[0];
    
    days.push({
      key: `current-${day}`,
      day,
      otherMonth: false,
      selected: isoDate === selectedIsoDate,
      today: currentDate.getTime() === today.getTime()
    });
  }
  
  // Días del mes siguiente
  const remainingDays = 42 - days.length; // 6 semanas
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      key: `next-${day}`,
      day,
      otherMonth: true,
      selected: false,
      today: false
    });
  }
  
  return days;
}

// Formateo
function formatInteger(value) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return Math.round(value).toLocaleString('es-AR');
}

function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

// Carga de datos
async function loadRevisores() {
  try {
    const response = await fetch(`${API_URL}/api/calidad/revisores`);
    if (!response.ok) throw new Error('Error cargando revisores');
    revisores.value = await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
}

async function loadData() {
  if (!filtros.value.revisor) {
    historico.value = [];
    return;
  }
  
  loading.value = true;
  
  try {
    const params = new URLSearchParams({
      startDate: filtros.value.fechaInicio,
      endDate: filtros.value.fechaFin,
      revisor: filtros.value.revisor,
      tramas: filtros.value.tramas
    });

    const paramsGlobal = new URLSearchParams({
      startDate: filtros.value.fechaInicio,
      endDate: filtros.value.fechaFin,
      tramas: filtros.value.tramas
    });
    
    const [resRevisor, resGlobal] = await Promise.all([
      fetch(`${API_URL}/api/calidad/historico-revisor?${params}`),
      fetch(`${API_URL}/api/calidad/historico-global?${paramsGlobal}`)
    ]);

    if (!resRevisor.ok || !resGlobal.ok) throw new Error('Error cargando datos');
    
    const dataRevisor = await resRevisor.json();
    const dataGlobal = await resGlobal.json();

    // Merge data
    historico.value = dataRevisor.map(rev => {
      const global = dataGlobal.find(g => g.MesAno === rev.MesAno) || {};
      return {
        ...rev,
        Global_Calidad_Perc: global.Calidad_Perc,
        Global_Pts_100m2: global.Pts_100m2,
        Global_Perc_Sin_Pts: global.Perc_Sin_Pts,
        Global_Mts_Total: global.Mts_Total // Needed for weighted average
      };
    });

  } catch (error) {
    console.error('Error:', error);
    historico.value = [];
  } finally {
    loading.value = false;
  }
}

// Click fuera del calendario
function handleClickOutside(event) {
  if (datepickerStartRef.value && !datepickerStartRef.value.contains(event.target)) {
    showCalendarStart.value = false;
  }
  if (datepickerEndRef.value && !datepickerEndRef.value.contains(event.target)) {
    showCalendarEnd.value = false;
  }
}

onMounted(() => {
  loadRevisores();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.historico-container {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}

.filters-card {
  background: white;
  border-radius: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filters-grid-historico {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.filter-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

/* Datepicker */
.custom-datepicker {
  position: relative;
}

.datepicker-input {
  padding-right: 2.5rem;
  cursor: pointer;
}

.calendar-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  user-select: none;
}

.calendar-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 50;
  padding: 1rem;
  min-width: 280px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.calendar-selects {
  display: flex;
  gap: 0.25rem;
}

.calendar-select {
  padding: 0.1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  background-color: transparent;
  cursor: pointer;
}

.calendar-select:hover {
  background-color: #f3f4f6;
}

.calendar-select:focus {
  outline: none;
  border-color: #d1d5db;
}

.calendar-nav-btn {
  background: none;
  border: none;
  font-size: 1rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.calendar-title {
  font-weight: 600;
  font-size: 0.9375rem;
}

.calendar-nav-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  color: #3b82f6;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.calendar-nav-btn:hover {
  background-color: #f3f4f6;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
}

.calendar-day {
  aspect-ratio: 1;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  padding: 0.375rem;
}

.calendar-day:hover:not(:disabled):not(.other-month) {
  background-color: #eff6ff;
  color: #3b82f6;
}

.calendar-day.other-month {
  color: #d1d5db;
  cursor: default;
}

.calendar-day.selected {
  background-color: #3b82f6;
  color: white;
  font-weight: 600;
}

.calendar-day.today {
  border: 2px solid #3b82f6;
}

/* Tabla */
.table-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  background: #f9fafb;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.results-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table thead {
  background: #f9fafb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.data-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}

.data-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.data-table tbody tr:hover {
  background: #f9fafb;
}

.text-center {
  text-align: center;
}

.font-medium {
  font-weight: 500;
}

.font-bold {
  font-weight: 700;
}

.bg-gray-100 {
  background-color: #f3f4f6;
}

.border-t-2 {
  border-top-width: 2px;
}

.border-gray-300 {
  border-top-color: #d1d5db;
}

/* Columnas */
.col-mes { min-width: 130px; }
.col-metros { min-width: 100px; }
.col-calidad { min-width: 90px; }
.col-pts { min-width: 95px; }
.col-rollos { min-width: 95px; }
.col-sin-pts-un { min-width: 95px; }
.col-sin-pts-perc { min-width: 95px; }

.empty-state {
  padding: 3rem;
  text-align: center;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .filters-grid-historico {
    grid-template-columns: 1fr;
  }
}
</style>
