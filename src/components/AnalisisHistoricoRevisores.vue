<template>
  <div class="historico-container">
    <div class="header">
      <h1 class="title">
        📊 ANÁLISIS HISTÓRICO REVISORES
      </h1>
      <p class="subtitle">
        Rendimiento mensual por revisor
      </p>
    </div>

    <!-- Filtros -->
    <div class="filters-card">
      <div class="filters-grid-historico">
        <!-- Revisor -->
        <div class="filter-group">
          <label>Revisor:</label>
          <select
            v-model="filtros.revisor"
            class="filter-input"
            :disabled="loading"
            @change="loadData"
          >
            <option value="">
              Seleccione un revisor
            </option>
            <option
              v-for="rev in revisores"
              :key="rev"
              :value="rev"
            >
              {{ rev }}
            </option>
          </select>
        </div>

        <!-- Fecha Inicio -->
        <div class="filter-group">
          <label>Fecha Inicio:</label>
          <div
            ref="datepickerStartRef"
            class="custom-datepicker"
          >
            <input 
              v-model="displayFechaInicio" 
              type="text" 
              class="filter-input datepicker-input"
              placeholder="Selecciona fecha inicio"
              readonly
              @click="toggleCalendar('start')"
            >
            <span
              class="calendar-icon"
              @click="toggleCalendar('start')"
            >📅</span>
            
            <div
              v-if="showCalendarStart"
              class="calendar-dropdown"
            >
              <div class="calendar-header">
                <button
                  class="calendar-nav-btn"
                  @click.stop="changeMonth('start', -1)"
                >
                  &lt;
                </button>
                <div class="calendar-selects">
                  <select
                    :value="calendarStartMonth.getMonth()"
                    class="calendar-select"
                    @change="updateMonth('start', $event)"
                    @click.stop
                  >
                    <option
                      v-for="(m, i) in monthNames"
                      :key="i"
                      :value="i"
                    >
                      {{ m }}
                    </option>
                  </select>
                  <select
                    :value="calendarStartMonth.getFullYear()"
                    class="calendar-select"
                    @change="updateYear('start', $event)"
                    @click.stop
                  >
                    <option
                      v-for="y in years"
                      :key="y"
                      :value="y"
                    >
                      {{ y }}
                    </option>
                  </select>
                </div>
                <button
                  class="calendar-nav-btn"
                  @click.stop="changeMonth('start', 1)"
                >
                  &gt;
                </button>
              </div>
              <div class="calendar-weekdays">
                <span
                  v-for="day in ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']"
                  :key="day"
                >{{ day }}</span>
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
                  :disabled="day.otherMonth"
                  @click.stop="selectDate('start', day)"
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
          <div
            ref="datepickerEndRef"
            class="custom-datepicker"
          >
            <input 
              v-model="displayFechaFin" 
              type="text" 
              class="filter-input datepicker-input"
              placeholder="Selecciona fecha fin"
              readonly
              @click="toggleCalendar('end')"
            >
            <span
              class="calendar-icon"
              @click="toggleCalendar('end')"
            >📅</span>
            
            <div
              v-if="showCalendarEnd"
              class="calendar-dropdown"
            >
              <div class="calendar-header">
                <button
                  class="calendar-nav-btn"
                  @click.stop="changeMonth('end', -1)"
                >
                  &lt;
                </button>
                <div class="calendar-selects">
                  <select
                    :value="calendarEndMonth.getMonth()"
                    class="calendar-select"
                    @change="updateMonth('end', $event)"
                    @click.stop
                  >
                    <option
                      v-for="(m, i) in monthNames"
                      :key="i"
                      :value="i"
                    >
                      {{ m }}
                    </option>
                  </select>
                  <select
                    :value="calendarEndMonth.getFullYear()"
                    class="calendar-select"
                    @change="updateYear('end', $event)"
                    @click.stop
                  >
                    <option
                      v-for="y in years"
                      :key="y"
                      :value="y"
                    >
                      {{ y }}
                    </option>
                  </select>
                </div>
                <button
                  class="calendar-nav-btn"
                  @click.stop="changeMonth('end', 1)"
                >
                  &gt;
                </button>
              </div>
              <div class="calendar-weekdays">
                <span
                  v-for="day in ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']"
                  :key="day"
                >{{ day }}</span>
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
                  :disabled="day.otherMonth"
                  @click.stop="selectDate('end', day)"
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
          <select
            v-model="filtros.tramas"
            class="filter-input"
            @change="loadData"
          >
            <option value="Todas">
              Todas
            </option>
            <option value="ALG 100%">
              ALG 100%
            </option>
            <option value="P + E">
              P + E
            </option>
            <option value="POL 100%">
              POL 100%
            </option>
          </select>
        </div>

        <!-- Botón Gráfico -->
        <div
          class="filter-group"
          style="justify-content: flex-end;"
        >
          <button 
            class="btn-chart" 
            :disabled="historico.length === 0" 
            title="Ver Gráfico Combinado"
            @click="openChartModal"
          >
            📊 Ver Gráfico
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla de Resultados -->
    <div class="table-card">
      <div class="table-header">
        <div class="results-info">
          <span
            v-if="loading"
            class="results-count"
          >Cargando...</span>
          <span
            v-else-if="!filtros.revisor"
            class="results-count"
          >Seleccione un revisor</span>
          <span
            v-else
            class="results-count"
          >{{ historico.length }} meses - {{ filtros.revisor }}</span>
        </div>
      </div>

      <div
        v-if="historico.length > 0"
        class="table-responsive"
      >
        <table class="data-table">
          <thead>
            <tr>
              <th
                class="col-mes"
                rowspan="2"
              >
                MES-AÑO
              </th>
              <th
                class="col-metros text-center"
                rowspan="2"
              >
                Metros Día
              </th>
              <th
                class="text-center border-b-2 border-gray-200"
                colspan="2"
              >
                Calidad %
              </th>
              <th
                class="text-center border-b-2 border-gray-200"
                colspan="2"
              >
                Pts 100 m²
              </th>
              <th
                class="col-rollos text-center"
                rowspan="2"
              >
                Rollos 1era
              </th>
              <th
                class="col-sin-pts-un text-center"
                rowspan="2"
              >
                Sin Pts [un]
              </th>
              <th
                class="text-center border-b-2 border-gray-200"
                colspan="2"
              >
                Sin Pts [%]
              </th>
            </tr>
            <tr>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">
                Revisor
              </th>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">
                Todos
              </th>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">
                Revisor
              </th>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">
                Todos
              </th>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">
                Revisor
              </th>
              <th class="col-sub text-center text-xs text-gray-500 bg-gray-50">
                Todos
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in historico"
              :key="row.MesAno"
            >
              <td class="col-mes font-medium">
                {{ formatMesAno(row.MesAno) }}
              </td>
              <td class="col-metros text-center font-bold">
                {{ formatInteger(row.Mts_Total) }}
              </td>
              
              <!-- Calidad -->
              <td class="col-calidad text-center font-medium">
                {{ formatNumber(row.Calidad_Perc) }}
              </td>
              <td class="col-calidad text-center text-gray-500">
                {{ formatNumber(row.Global_Calidad_Perc) }}
              </td>
              
              <!-- Pts -->
              <td class="col-pts text-center font-medium">
                {{ formatNumber(row.Pts_100m2) }}
              </td>
              <td class="col-pts text-center text-gray-500">
                {{ formatNumber(row.Global_Pts_100m2) }}
              </td>
              
              <td class="col-rollos text-center">
                {{ row.Rollos_1era }}
              </td>
              <td class="col-sin-pts-un text-center">
                {{ row.Rollos_Sin_Pts }}
              </td>
              
              <!-- Sin Pts % -->
              <td class="col-sin-pts-perc text-center font-medium">
                {{ formatNumber(row.Perc_Sin_Pts) }}
              </td>
              <td class="col-sin-pts-perc text-center text-gray-500">
                {{ formatNumber(row.Global_Perc_Sin_Pts) }}
              </td>
            </tr>
            <!-- Fila Totales -->
            <tr
              v-if="historico.length > 0"
              class="bg-gray-100 font-bold border-t-2 border-gray-300"
            >
              <td class="col-mes">
                Total / Promedio
              </td>
              <td class="col-metros text-center">
                {{ formatInteger(totales.Mts_Total) }}
              </td>
              
              <td class="col-calidad text-center">
                {{ formatNumber(totales.Calidad_Perc) }}
              </td>
              <td class="col-calidad text-center text-gray-600">
                {{ formatNumber(totales.Global_Calidad_Perc) }}
              </td>
              
              <td class="col-pts text-center">
                {{ formatNumber(totales.Pts_100m2) }}
              </td>
              <td class="col-pts text-center text-gray-600">
                {{ formatNumber(totales.Global_Pts_100m2) }}
              </td>
              
              <td class="col-rollos text-center">
                {{ totales.Rollos_1era }}
              </td>
              <td class="col-sin-pts-un text-center">
                {{ totales.Rollos_Sin_Pts }}
              </td>
              
              <td class="col-sin-pts-perc text-center">
                {{ formatNumber(totales.Perc_Sin_Pts) }}
              </td>
              <td class="col-sin-pts-perc text-center text-gray-600">
                {{ formatNumber(totales.Global_Perc_Sin_Pts) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-else-if="!loading && filtros.revisor"
        class="empty-state"
      >
        <p>No hay datos para el período seleccionado</p>
      </div>
    </div>

    <!-- Modal Gráfico -->
    <div
      v-if="showChartModal"
      class="modal-overlay"
      @click.self="showChartModal = false"
    >
      <div class="modal-content chart-modal">
        <div class="modal-header">
          <h3>Análisis Gráfico: {{ filtros.revisor }} vs Global</h3>
          <div class="modal-header-controls">
            <select
              v-model="filtros.revisor"
              class="revisor-select"
              @change="loadData"
            >
              <option
                v-for="rev in revisores"
                :key="rev"
                :value="rev"
              >
                {{ rev }}
              </option>
            </select>
            <label class="checkbox-label">
              <input
                v-model="showDataLabels"
                type="checkbox"
                class="checkbox-input"
              >
              <span>Mostrar valores de puntos</span>
            </label>
            <button
              class="copy-btn"
              title="Copiar gráfico para WhatsApp"
              @click="copyChartToClipboard"
            >
              📋 Copiar
            </button>
            <button
              class="close-btn"
              @click="showChartModal = false"
            >
              ×
            </button>
          </div>
        </div>
        <div class="chart-container">
          <div
            v-if="loading"
            class="chart-loading"
          >
            <div class="spinner" />
            <p>Cargando datos de {{ filtros.revisor }}...</p>
          </div>
          <Bar
            v-else
            :data="chartData"
            :options="chartOptions"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController,
  LineController
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Bar } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController,
  LineController,
  ChartDataLabels
)

const API_URL = 'http://localhost:3002';

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Estado
const loading = ref(false);
const showChartModal = ref(false);
const showDataLabels = ref(false);
const revisores = ref([]);
const historico = ref([]);

// Filtros
const filtros = ref({
  revisor: '',
  fechaInicio: getDefaultStartDate(),
  fechaFin: getDefaultEndDate(),
  tramas: 'Todas'
});

// Chart Data
const chartData = computed(() => {
  if (!historico.value.length) return { labels: [], datasets: [] }

  const labels = historico.value.map(h => {
    if (!h.MesAno) return '';
    const [year, month] = h.MesAno.split('-');
    const monthIndex = parseInt(month) - 1;
    const shortMonth = monthNames[monthIndex].substring(0, 3).toLowerCase();
    const shortYear = year.substring(2);
    return `${shortMonth}-${shortYear}`;
  })
  
  return {
    labels,
    datasets: [
      {
        type: 'bar',
        label: `Calidad % (${filtros.value.revisor})`,
        backgroundColor: '#6366f1', // Indigo 500
        hoverBackgroundColor: '#4f46e5', // Indigo 600
        data: historico.value.map(h => h.Calidad_Perc),
        yAxisID: 'y',
        order: 2,
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      },
      {
        type: 'bar',
        label: 'Calidad % (Global)',
        backgroundColor: '#e2e8f0', // Slate 200
        hoverBackgroundColor: '#cbd5e1', // Slate 300
        data: historico.value.map(h => h.Global_Calidad_Perc),
        yAxisID: 'y',
        order: 3,
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      },
      {
        type: 'line',
        label: `Pts 100m² (${filtros.value.revisor})`,
        borderColor: '#f43f5e', // Rose 500
        backgroundColor: '#f43f5e',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        tension: 0.3, // Smooth curves
        data: historico.value.map(h => h.Pts_100m2),
        yAxisID: 'y1',
        order: 0,
        datalabels: {
          display: showDataLabels.value,
          align: 'top',
          color: '#f43f5e',
          font: {
            size: 10,
            weight: 'bold'
          },
          formatter: (value) => value ? value.toFixed(1) : ''
        }
      },
      {
        type: 'line',
        label: 'Pts 100m² (Global)',
        borderColor: '#10b981', // Emerald 500
        backgroundColor: '#10b981',
        borderWidth: 2,
        pointRadius: 0, // Hide points for global trend unless hovered
        pointHoverRadius: 4,
        borderDash: [5, 5],
        tension: 0.3,
        data: historico.value.map(h => h.Global_Pts_100m2),
        yAxisID: 'y1',
        order: 1
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    datalabels: {
      display: false // Default off for all datasets
    },
    legend: {
      position: 'top',
      align: 'center',
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        padding: 20,
        font: {
          family: "'Inter', 'Segoe UI', sans-serif",
          size: 12
        },
        color: '#4b5563' // Gray 600
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#1f2937',
      bodyColor: '#4b5563',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: 12,
      boxPadding: 4,
      usePointStyle: true,
      titleFont: {
        family: "'Inter', 'Segoe UI', sans-serif",
        size: 14,
        weight: 'bold'
      },
      bodyFont: {
        family: "'Inter', 'Segoe UI', sans-serif",
        size: 13
      },
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += context.parsed.y.toFixed(1);
          }
          return label;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        font: {
          family: "'Inter', 'Segoe UI', sans-serif",
          size: 11
        },
        color: '#6b7280'
      }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      title: {
        display: true,
        text: 'Calidad %',
        font: {
          family: "'Inter', 'Segoe UI', sans-serif",
          weight: 'bold'
        },
        color: '#6366f1'
      },
      grid: {
        color: '#f3f4f6',
        borderDash: [4, 4],
        drawBorder: false
      },
      ticks: {
        font: {
          family: "'Inter', 'Segoe UI', sans-serif",
        },
        color: '#6b7280'
      },
      min: 80,
      max: 100
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      title: {
        display: true,
        text: 'Puntos cada 100m²',
        font: {
          family: "'Inter', 'Segoe UI', sans-serif",
          weight: 'bold'
        },
        color: '#f43f5e'
      },
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        font: {
          family: "'Inter', 'Segoe UI', sans-serif",
        },
        color: '#6b7280'
      },
      min: 0
    },
  }
}

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

function openChartModal() {
  console.log('Opening chart modal');
  showChartModal.value = true;
}

async function copyChartToClipboard() {
  try {
    const modalElement = document.querySelector('.modal-content.chart-modal');
    const headerControls = document.querySelector('.modal-header-controls');
    
    if (!modalElement) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo encontrar el gráfico',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }
    
    // Ocultar controles temporalmente
    if (headerControls) {
      headerControls.style.display = 'none';
    }
    
    // Capturar con controles ocultos
    const canvas = await html2canvas(modalElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false
    });
    
    // Restaurar controles inmediatamente
    if (headerControls) {
      headerControls.style.display = 'flex';
    }
    
    canvas.toBlob((blob) => {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(() => {
          Swal.fire({
            icon: 'success',
            title: '¡Copiado!',
            text: 'Gráfico copiado al portapapeles. Ya puedes pegarlo en WhatsApp.',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
        })
        .catch(() => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo copiar al portapapeles.',
            timer: 2000,
            showConfirmButton: false
          });
        });
    });
  } catch (error) {
    console.error('Error capturando gráfico:', error);
    // Restaurar controles en caso de error
    const headerControls = document.querySelector('.modal-header-controls');
    if (headerControls) {
      headerControls.style.display = 'flex';
    }
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error al procesar la imagen.',
      timer: 2000,
      showConfirmButton: false
    });
  }
}
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

/* Chart Modal Styles */
.btn-chart {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-chart:hover {
  background-color: #2563eb;
}

.btn-chart:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content.chart-modal {
  background: white;
  border-radius: 0.5rem;
  width: 95%;
  max-width: 1400px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  font-family: 'Ubuntu', 'Segoe UI', sans-serif;
}

.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-family: 'Ubuntu', 'Segoe UI', sans-serif;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  font-family: 'Ubuntu', 'Segoe UI', sans-serif;
}

.modal-header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.revisor-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 150px;
}

.revisor-select:hover {
  border-color: #3b82f6;
}

.revisor-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #4b5563;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.copy-btn {
  background-color: #10b981;
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.copy-btn:hover {
  background-color: #059669;
}

.copy-btn:active {
  transform: scale(0.95);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.close-btn:hover {
  color: #1f2937;
}

.chart-container {
  flex: 1;
  padding: 1.5rem;
  position: relative;
  min-height: 0; /* Important for flex child to shrink */
}

.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
}

.chart-loading p {
  font-size: 1rem;
  color: #6b7280;
  font-weight: 500;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

</style>

