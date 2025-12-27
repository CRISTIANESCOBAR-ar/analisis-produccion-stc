<template>
  <div class="w-full h-screen flex flex-col p-1">
    <main ref="mainContentRef" class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col relative">
      <!-- Overlay de carga -->
      <div v-if="cargando" class="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-50 rounded-2xl transition-all duration-300">
        <div class="flex flex-col items-center gap-4 bg-white/90 px-10 py-8 rounded-2xl shadow-2xl border border-blue-100">
          <div class="relative">
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-blue-50 border-t-blue-600"></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="h-8 w-8 bg-blue-600 rounded-full animate-pulse opacity-10"></div>
            </div>
          </div>
          <div class="flex flex-col items-center gap-1">
            <span class="text-slate-500 font-medium tracking-wider uppercase text-[10px]">Cargando ROLADAS</span>
            <span class="text-xl text-slate-800 font-bold">{{ periodoFormateado }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4 flex-shrink-0 mb-4">
        <div class="flex items-center gap-6">
          <img src="/LogoSantana.jpg" alt="Santana Textiles" class="h-10 w-auto object-contain" />
          <h3 class="text-lg font-semibold text-slate-800">ROLADAS del Mes - Producción ÍNDIGO</h3>
          <div class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <span class="text-sm font-medium text-slate-600">Total Roladas:</span>
            <span class="text-sm font-bold text-blue-700">{{ datos.length }}</span>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            @click="exportarAExcel"
            class="inline-flex items-center gap-1 px-2 py-0 h-[34px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            v-tippy="{ content: 'Exportar informe a Excel', placement: 'bottom' }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z"/>
            </svg>
            <span class="text-sm">Excel</span>
          </button>
          <CustomDatepicker 
            v-model="fechaSeleccionada" 
            label="Fecha:" 
            :show-buttons="true"
            @change="cargarDatos" 
          />
        </div>
      </div>

      <div class="flex-1 overflow-auto min-h-0 border border-slate-200 rounded-lg relative" ref="tablaRef">
        <table ref="tableElementRef" class="w-full text-sm text-left text-slate-600 font-[Verdana]">
          <thead class="text-xs text-slate-700 bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th scope="col" class="pl-2 pr-2 py-1 font-bold border-b border-slate-200 text-center">Rolada</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-center">Fecha ÍNDIGO</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-center">COR</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-left">Artículo</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 border-l-2 text-right">ÍNDIGO (m)</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Rot. Total</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Rot 10³</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Cav.</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Tiempo Total</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Vel. m/min</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 border-l-2 text-right">N</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">%</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">P</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">%</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">Q</th>
              <th scope="col" class="px-2 py-1 font-bold border-b border-slate-200 text-right">%</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="(item, index) in datos" :key="`${item.ROLADA}-${item.COR}`" 
                :class="index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100'" 
                class="transition-colors cursor-pointer">
              <td class="pl-2 pr-2 py-0 font-medium text-slate-900 text-center whitespace-nowrap">{{ item.ROLADA }}</td>
              <td class="px-2 py-0 text-center whitespace-nowrap">{{ item.FECHA_INDIGO }}</td>
              <td class="px-2 py-0 text-center whitespace-nowrap">{{ item.COR }}</td>
              <td class="px-2 py-0">{{ item.ARTIGO }}</td>
              <td class="px-2 py-0 text-right font-mono border-l-2 border-slate-200">{{ formatNumber(item.METRAGEM, 0) }}</td>
              <td class="px-2 py-0 text-right font-mono">{{ formatNumber(item.RUPTURAS, 0) }}</td>
              <td class="px-2 py-0 text-right font-mono font-semibold text-blue-700">{{ formatNumber(item.ROT_103, 2) }}</td>
              <td class="px-2 py-0 text-right font-mono">{{ formatNumber(item.CAVALOS, 0) }}</td>
              <td class="px-2 py-0 text-right font-mono">{{ formatTiempo(item.TIEMPO_MINUTOS) }}</td>
              <td class="px-2 py-0 text-right font-mono">{{ formatNumber(item.VELOC_PROMEDIO, 2) }}</td>
              <td class="px-2 py-0 text-right font-mono border-l-2 border-slate-200" :class="getCalidadColor(item.N_PERCENT)">{{ item.N_COUNT }}</td>
              <td class="px-2 py-0 text-right font-mono font-semibold" :class="getCalidadColor(item.N_PERCENT)">{{ formatNumber(item.N_PERCENT, 1) }}</td>
              <td class="px-2 py-0 text-right font-mono" :class="getCalidadColor(item.P_PERCENT)">{{ item.P_COUNT }}</td>
              <td class="px-2 py-0 text-right font-mono font-semibold" :class="getCalidadColor(item.P_PERCENT)">{{ formatNumber(item.P_PERCENT, 1) }}</td>
              <td class="px-2 py-0 text-right font-mono" :class="getCalidadColor(item.Q_PERCENT)">{{ item.Q_COUNT }}</td>
              <td class="px-2 py-0 text-right font-mono font-semibold" :class="getCalidadColor(item.Q_PERCENT)">{{ formatNumber(item.Q_PERCENT, 1) }}</td>
            </tr>
            <tr v-if="datos.length === 0 && !cargando" class="bg-slate-50">
              <td colspan="16" class="px-4 py-8 text-center text-slate-500">
                No hay datos disponibles para el período seleccionado
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import CustomDatepicker from './CustomDatepicker.vue';
import ExcelJS from 'exceljs';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const cargando = ref(false);
const datos = ref([]);

// Inicializar con fecha de hoy en formato YYYY-MM-DD
const hoy = new Date();
const fechaSeleccionada = ref(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`);

const mainContentRef = ref(null);
const tablaRef = ref(null);
const tableElementRef = ref(null);

const periodoFormateado = computed(() => {
  if (!fechaSeleccionada.value) return '';
  const [year, month] = fechaSeleccionada.value.split('-').map(Number);
  const fecha = new Date(year, month - 1, 1);
  const mes = fecha.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  return mes.charAt(0).toUpperCase() + mes.slice(1);
});

const formatNumber = (valor, decimales = 0) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const num = parseFloat(valor);
  if (isNaN(num)) return '';
  return num.toLocaleString('es-ES', { 
    minimumFractionDigits: decimales, 
    maximumFractionDigits: decimales 
  });
};

const formatTiempo = (minutos) => {
  if (!minutos || minutos <= 0) return '';
  const horas = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  return `${horas}:${mins.toString().padStart(2, '0')}`;
};

const getCalidadColor = (percent) => {
  if (!percent || percent === 0) return 'text-slate-400';
  if (percent >= 80) return 'text-green-600';
  if (percent >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const cargarDatos = async () => {
  cargando.value = true;
  try {
    if (!fechaSeleccionada.value) return;
    
    const [year, month] = fechaSeleccionada.value.split('-').map(Number);
    
    // Primer día del mes
    const fechaInicio = new Date(year, month - 1, 1);
    
    // Ayer (día actual - 1)
    const hoy = new Date();
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
    
    // Si el mes seleccionado es el actual, usar ayer como fecha fin
    // Si es un mes anterior, usar el último día del mes
    let fechaFin;
    if (year === hoy.getFullYear() && month === (hoy.getMonth() + 1)) {
      fechaFin = ayer;
    } else {
      fechaFin = new Date(year, month, 0); // Último día del mes
    }
    
    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
    const fechaFinStr = fechaFin.toISOString().split('T')[0];
    
    const response = await fetch(`${API_BASE_URL}/api/informe-produccion-indigo?fechaInicio=${fechaInicioStr}&fechaFin=${fechaFinStr}`);
    
    if (!response.ok) throw new Error('Error al cargar datos');
    
    datos.value = await response.json();
  } catch (error) {
    console.error('Error cargando datos:', error);
    alert('Error al cargar los datos');
  } finally {
    cargando.value = false;
  }
};

const exportarAExcel = async () => {
  if (datos.value.length === 0) {
    alert('No hay datos para exportar');
    return;
  }
  
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ROLADAS del Mes');
    
    // Encabezados
    worksheet.columns = [
      { header: 'Rolada', key: 'ROLADA', width: 10 },
      { header: 'Fecha ÍNDIGO', key: 'FECHA_INDIGO', width: 12 },
      { header: 'COR', key: 'COR', width: 8 },
      { header: 'Artículo', key: 'ARTIGO', width: 20 },
      { header: 'ÍNDIGO (m)', key: 'METRAGEM', width: 12 },
      { header: 'Rot. Total', key: 'RUPTURAS', width: 10 },
      { header: 'Rot 10³', key: 'ROT_103', width: 10 },
      { header: 'Cav.', key: 'CAVALOS', width: 8 },
      { header: 'Tiempo Total', key: 'TIEMPO_MINUTOS', width: 12 },
      { header: 'Vel. m/min', key: 'VELOC_PROMEDIO', width: 12 },
      { header: 'N', key: 'N_COUNT', width: 8 },
      { header: 'N %', key: 'N_PERCENT', width: 8 },
      { header: 'P', key: 'P_COUNT', width: 8 },
      { header: 'P %', key: 'P_PERCENT', width: 8 },
      { header: 'Q', key: 'Q_COUNT', width: 8 },
      { header: 'Q %', key: 'Q_PERCENT', width: 8 }
    ];
    
    // Estilo de encabezados
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Datos
    datos.value.forEach(item => {
      const row = worksheet.addRow({
        ROLADA: item.ROLADA,
        FECHA_INDIGO: item.FECHA_INDIGO,
        COR: item.COR,
        ARTIGO: item.ARTIGO,
        METRAGEM: item.METRAGEM,
        RUPTURAS: item.RUPTURAS,
        ROT_103: item.ROT_103,
        CAVALOS: item.CAVALOS,
        TIEMPO_MINUTOS: formatTiempo(item.TIEMPO_MINUTOS),
        VELOC_PROMEDIO: item.VELOC_PROMEDIO,
        N_COUNT: item.N_COUNT,
        N_PERCENT: item.N_PERCENT,
        P_COUNT: item.P_COUNT,
        P_PERCENT: item.P_PERCENT,
        Q_COUNT: item.Q_COUNT,
        Q_PERCENT: item.Q_PERCENT
      });
      
      row.alignment = { vertical: 'middle' };
      row.getCell('METRAGEM').numFmt = '#,##0';
      row.getCell('ROT_103').numFmt = '#,##0.00';
      row.getCell('VELOC_PROMEDIO').numFmt = '#,##0.00';
      row.getCell('N_PERCENT').numFmt = '#,##0.0';
      row.getCell('P_PERCENT').numFmt = '#,##0.0';
      row.getCell('Q_PERCENT').numFmt = '#,##0.0';
    });
    
    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ROLADAS_${periodoFormateado.value}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    alert('Error al exportar a Excel');
  }
};

onMounted(() => {
  cargarDatos();
});
</script>

<style scoped>
table {
  font-size: 11px;
  border-collapse: separate;
  border-spacing: 0;
}

thead th {
  position: sticky;
  top: 0;
  background: rgb(248, 250, 252);
  z-index: 10;
}

tbody tr:hover {
  background-color: rgb(241, 245, 249) !important;
}
</style>
