<template>
  <div class="w-full h-screen flex flex-col p-1">
    <main ref="mainContentRef" class="w-full flex-1 min-h-0 bg-white rounded-xl shadow-sm px-4 py-3 border border-slate-200/60 flex flex-col relative">
      <!-- Overlay de carga -->
      <div v-if="cargando" class="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-xl">
        <div class="flex flex-col items-center gap-3">
          <div class="relative">
            <div class="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-600"></div>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-xs text-slate-400 uppercase tracking-wider">Cargando</span>
            <span class="text-sm text-slate-600 font-medium mt-0.5">Últimos {{ diasSeleccionados }} días</span>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between gap-4 flex-shrink-0 mb-3 pb-3 border-b border-slate-100">
        <div class="flex items-center gap-5">
          <img src="/LogoSantana.jpg" alt="Santana Textiles" class="h-9 w-auto object-contain opacity-90" />
          <div>
            <h3 class="text-base font-semibold text-slate-800 tracking-tight">Seguimiento de Roladas</h3>
            <p class="text-xs text-slate-400 mt-0.5">Producción ÍNDIGO</p>
          </div>
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md ml-2">
            <span class="text-xs text-slate-500">Registros:</span>
            <span class="text-sm font-semibold text-slate-700 tabular-nums">{{ datos.length }}</span>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- Selector de días -->
          <div class="flex items-center gap-1.5">
            <label for="dias-select" class="text-xs font-medium text-slate-500">Período:</label>
            <select
              id="dias-select"
              v-model.number="diasSeleccionados"
              @change="cargarDatos"
              class="px-2.5 py-1.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-slate-700"
            >
              <option :value="15">15 días</option>
              <option :value="30">30 días</option>
              <option :value="45">45 días</option>
              <option :value="60">60 días</option>
            </select>
          </div>
          
          <!-- Date Picker -->
          <CustomDatepicker 
            v-model="fechaSeleccionada" 
            label="Hasta:" 
            :show-buttons="true"
            @change="cargarDatos" 
          />
          
          <!-- Botón Copiar Imagen -->
          <button
            @click="copiarComoImagen"
            :disabled="copiando || datos.length === 0"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-md transition-colors"
            v-tippy="{ content: 'Copiar como imagen al portapapeles', placement: 'bottom' }"
          >
            <svg v-if="!copiando" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg v-else class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ copiando ? 'Copiando...' : 'Copiar' }}</span>
          </button>
          
          <!-- Botón Imprimir -->
          <button
            @click="imprimirTabla"
            :disabled="datos.length === 0"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-md transition-colors"
            v-tippy="{ content: 'Imprimir tabla', placement: 'bottom' }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>Imprimir</span>
          </button>
          
          <!-- Botón Excel -->
          <button
            @click="exportarAExcel"
            :disabled="datos.length === 0"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-md transition-colors"
            v-tippy="{ content: 'Exportar a archivo Excel', placement: 'bottom' }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z"/>
            </svg>
            <span>Excel</span>
          </button>
        </div>
      </div>

      <!-- Tabla de datos -->
      <div class="flex-1 overflow-auto min-h-0 rounded-lg border border-slate-200/60 relative" ref="tablaRef">
        <table ref="tableElementRef" class="w-full text-[13px] text-slate-600">
          <thead class="sticky top-0 z-10">
            <!-- Fila superior - Grupos -->
            <tr class="bg-slate-800 text-white">
              <th scope="col" rowspan="2" class="px-3 py-2 font-semibold text-center text-xs uppercase tracking-wide border-r border-slate-700">Rolada</th>
              <th scope="col" colspan="2" class="px-3 py-1.5 font-semibold text-center text-xs uppercase tracking-wide border-r border-slate-700 bg-emerald-700">Urdidora</th>
              <th scope="col" colspan="8" class="px-3 py-1.5 font-semibold text-center text-xs uppercase tracking-wide border-r border-slate-700 bg-blue-700">Índigo</th>
              <th scope="col" colspan="4" class="px-3 py-1.5 font-semibold text-center text-xs uppercase tracking-wide border-r border-slate-700 bg-violet-700">Tejeduría</th>
              <th scope="col" colspan="3" class="px-3 py-1.5 font-semibold text-center text-xs uppercase tracking-wide bg-amber-700">Calidad</th>
            </tr>
            <!-- Fila inferior - Columnas -->
            <tr class="bg-slate-700 text-slate-200 text-[11px]">
              <th scope="col" class="px-2 py-1.5 font-medium text-center border-r border-slate-600 bg-emerald-800/80">Maq. OE</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center border-r border-slate-600 bg-emerald-800/80">Lote</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-blue-800/80">Fecha</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-blue-800/80">Base</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-blue-800/80">Color</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-blue-800/80">Metros</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-blue-800/80">R10³</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-blue-800/80">Cav</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-blue-800/80">Vel. Nom.</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center border-r border-slate-600 bg-blue-800/80">Vel. Prom.</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-violet-800/80">Metros</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-violet-800/80">Efic. %</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-violet-800/80">RU10⁵</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center border-r border-slate-600 bg-violet-800/80">RT10⁵</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-amber-800/80">Metros</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-amber-800/80">Cal. %</th>
              <th scope="col" class="px-2 py-1.5 font-medium text-center bg-amber-800/80">Pts/100m²</th>
            </tr>
          </thead>
          <tbody class="bg-white">
            <tr v-for="(item, index) in datos" :key="item.ROLADA" 
                class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
              <td class="px-3 py-2 font-semibold text-slate-800 text-center tabular-nums border-r border-slate-100">{{ item.ROLADA }}</td>
              <td class="px-2 py-2 text-center text-slate-600 tabular-nums bg-emerald-50/40">{{ formatListaConY(item.MAQ_OE) }}</td>
              <td class="px-2 py-2 text-center text-slate-600 tabular-nums bg-emerald-50/40 border-r border-slate-100">{{ formatListaConY(item.LOTE) }}</td>
              <!-- Celdas ÍNDIGO clickeables -->
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2 text-center text-slate-500 text-xs bg-blue-50/30 cursor-pointer hover:bg-blue-100/50 transition-colors">{{ item.FECHA }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2 text-center text-slate-700 bg-blue-50/30 cursor-pointer hover:bg-blue-100/50 transition-colors">{{ item.BASE }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2 text-center text-slate-600 bg-blue-50/30 cursor-pointer hover:bg-blue-100/50 transition-colors">{{ item.COLOR }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2 text-center text-slate-700 tabular-nums bg-blue-50/30 cursor-pointer hover:bg-blue-100/50 transition-colors">{{ formatNumber(item.MTS_IND, 0) }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2 text-center text-slate-600 tabular-nums bg-blue-50/30 cursor-pointer hover:bg-blue-100/50 transition-colors">{{ formatNumber(item.R103, 1) }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2 text-center text-slate-600 tabular-nums bg-blue-50/30 cursor-pointer hover:bg-blue-100/50 transition-colors">{{ item.CAV || '-' }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2 text-center text-slate-600 tabular-nums bg-blue-50/30 cursor-pointer hover:bg-blue-100/50 transition-colors">{{ formatNumber(item.VEL_NOM, 0) }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2 text-center text-slate-600 tabular-nums bg-blue-50/30 border-r border-slate-100 cursor-pointer hover:bg-blue-100/50 transition-colors">{{ formatNumber(item.VEL_PROM, 0) }}</td>
              <td class="px-2 py-2 text-center text-slate-700 tabular-nums bg-violet-50/30">{{ formatNumber(item.MTS_CRUDOS, 0) }}</td>
              <td class="px-2 py-2 text-center text-slate-600 tabular-nums bg-violet-50/30">{{ formatNumber(item.EFI_TEJ, 1) }}</td>
              <td class="px-2 py-2 text-center text-slate-600 tabular-nums bg-violet-50/30">{{ formatNumber(item.RU105, 1) }}</td>
              <td class="px-2 py-2 text-center text-slate-600 tabular-nums bg-violet-50/30 border-r border-slate-100">{{ formatNumber(item.RT105, 1) }}</td>
              <td class="px-2 py-2 text-center text-slate-700 tabular-nums bg-amber-50/30">{{ formatNumber(item.MTS_CAL, 0) }}</td>
              <td class="px-2 py-2 text-center text-slate-600 tabular-nums bg-amber-50/30">{{ formatNumber(item.CAL_PERCENT, 1) }}</td>
              <td class="px-2 py-2 text-center text-slate-600 tabular-nums bg-amber-50/30">{{ formatNumber(item.PTS_100M2, 1) }}</td>
            </tr>
          </tbody>
          <!-- Fila de totales del mes -->
          <tfoot v-if="totalesMes && datos.length > 0" class="bg-slate-100 border-t-2 border-slate-300">
            <tr class="font-semibold text-slate-800">
              <td class="px-3 py-2.5 text-center border-r border-slate-200" colspan="3">
                <span class="text-xs uppercase tracking-wide text-slate-500">Total Mes</span>
                <span class="ml-2 text-slate-700">{{ totalesMes.TOTAL_ROLADAS }} roladas</span>
              </td>
              <td class="px-2 py-2.5 text-center bg-blue-100/60" colspan="3">-</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-blue-100/60">{{ formatNumber(totalesMes.MTS_IND, 0) }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-blue-100/60">{{ formatNumber(totalesMes.R103, 1) }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-blue-100/60">{{ totalesMes.CAV || '-' }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-blue-100/60">-</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-blue-100/60 border-r border-slate-200">{{ formatNumber(totalesMes.VEL_PROM, 0) }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-violet-100/60">{{ formatNumber(totalesMes.MTS_CRUDOS, 0) }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-violet-100/60">{{ formatNumber(totalesMes.EFI_TEJ, 1) }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-violet-100/60">{{ formatNumber(totalesMes.RU105, 1) }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-violet-100/60 border-r border-slate-200">{{ formatNumber(totalesMes.RT105, 1) }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-amber-100/60">{{ formatNumber(totalesMes.MTS_CAL, 0) }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-amber-100/60">{{ formatNumber(totalesMes.CAL_PERCENT, 1) }}</td>
              <td class="px-2 py-2.5 text-center tabular-nums bg-amber-100/60">{{ formatNumber(totalesMes.PTS_100M2, 1) }}</td>
            </tr>
          </tfoot>
        </table>
        
        <!-- Mensaje cuando no hay datos -->
        <div v-if="!cargando && datos.length === 0" class="flex items-center justify-center h-64 bg-white">
          <div class="text-center">
            <svg class="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-3 text-sm font-medium text-slate-700">No hay datos disponibles</h3>
            <p class="mt-1 text-xs text-slate-400">No se encontraron roladas para el período seleccionado</p>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Modal Detalle ÍNDIGO -->
    <div v-if="modalVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="cerrarModal">
      <div class="bg-white rounded-xl shadow-2xl w-[95vw] max-w-7xl h-[85vh] flex flex-col overflow-hidden">
        <!-- Header del Modal -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div class="flex items-center gap-4">
            <!-- Botón Anterior -->
            <button 
              @click="navegarRolada(-1)" 
              :disabled="indiceRoladaActual === 0"
              class="p-2 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              v-tippy="{ content: 'Rolada anterior', placement: 'bottom' }"
            >
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div class="text-white">
              <h3 class="text-lg font-bold">Detalle ÍNDIGO - Rolada {{ roladaSeleccionada }}</h3>
              <p class="text-sm text-blue-100">{{ indiceRoladaActual + 1 }} de {{ datos.length }} roladas</p>
            </div>
            
            <!-- Botón Siguiente -->
            <button 
              @click="navegarRolada(1)" 
              :disabled="indiceRoladaActual === datos.length - 1"
              class="p-2 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              v-tippy="{ content: 'Rolada siguiente', placement: 'bottom' }"
            >
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <button @click="cerrarModal" class="p-2 rounded-lg hover:bg-white/20 transition-colors">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Loading -->
        <div v-if="cargandoDetalle" class="flex-1 flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600"></div>
            <span class="text-slate-600">Cargando detalles...</span>
          </div>
        </div>
        
        <!-- Tabla de detalles -->
        <div v-else-if="datosDetalleAgrupados.length > 0" class="flex-1 overflow-auto">
          <table class="w-full text-xs text-left text-slate-600">
            <thead class="text-xs text-slate-700 bg-slate-50 sticky top-0 z-10">
              <tr>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-left">Partida</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-center">F. Inicio</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-center">H. Inicio</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-center">F. Final</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-center">H. Final</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-center">Turno</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-left">Base</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-left">Color</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-right">Metros</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-right">Veloc.</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-center">S</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-right">R10³</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-right">Roturas</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-right">CV</th>
                <th class="px-3 py-2 font-bold border-b border-slate-200 text-left">Operador</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr 
                v-for="(item, index) in datosDetalleAgrupados" 
                :key="index" 
                :class="index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100'"
              >
                <td class="px-3 py-2">{{ item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : '' }}</td>
                <td class="px-3 py-2 text-center">{{ item.DT_INICIO }}</td>
                <td class="px-3 py-2 text-center font-mono">{{ item.HORA_INICIO }}</td>
                <td class="px-3 py-2 text-center">{{ item.DT_FINAL }}</td>
                <td class="px-3 py-2 text-center font-mono">{{ item.HORA_FINAL }}</td>
                <td class="px-3 py-2 text-center font-semibold text-blue-700">{{ item.TURNO }}</td>
                <td class="px-3 py-2">{{ item.ARTIGO ? item.ARTIGO.substring(0, 10) : '' }}</td>
                <td class="px-3 py-2">{{ item.COR }}</td>
                <td class="px-3 py-2 text-right font-mono">{{ formatNumberModal(item.METRAGEM) }}</td>
                <td class="px-3 py-2 text-right font-mono">{{ formatNumberModal(item.VELOC) }}</td>
                <td class="px-3 py-2 text-center">{{ item.S }}</td>
                <td class="px-3 py-2 text-right font-mono text-purple-600">{{ calcularR103(item.RUPTURAS, item.METRAGEM) }}</td>
                <td class="px-3 py-2 text-right font-mono text-red-600">{{ item.RUPTURAS }}</td>
                <td class="px-3 py-2 text-right font-mono">{{ formatNumberModal(item.CAVALOS) }}</td>
                <td class="px-3 py-2">{{ item.NM_OPERADOR }}</td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-100 font-bold text-slate-800 sticky bottom-0">
              <tr>
                <td class="px-3 py-2 text-left">TOTAL</td>
                <td class="px-3 py-2" colspan="7"></td>
                <td class="px-3 py-2 text-right font-mono">{{ formatNumberModal(totalesDetalle.metros) }}</td>
                <td class="px-3 py-2"></td>
                <td class="px-3 py-2"></td>
                <td class="px-3 py-2 text-right font-mono text-purple-700">{{ calcularR103(totalesDetalle.roturas, totalesDetalle.metros) }}</td>
                <td class="px-3 py-2 text-right font-mono text-red-700">{{ totalesDetalle.roturas }}</td>
                <td class="px-3 py-2 text-right font-mono">{{ formatNumberModal(totalesDetalle.cv) }}</td>
                <td class="px-3 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <!-- Sin datos -->
        <div v-else class="flex-1 flex items-center justify-center py-20 text-slate-500">
          <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <p class="font-medium">No se encontraron detalles</p>
            <p class="text-sm text-slate-400">Rolada {{ roladaSeleccionada }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import * as ExcelJS from 'exceljs'
import html2canvas from 'html2canvas'
import CustomDatepicker from './CustomDatepicker.vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Estado
const cargando = ref(false)
const copiando = ref(false)
const datos = ref([])
const totalesMes = ref(null)
const diasSeleccionados = ref(15)
const fechaSeleccionada = ref('')

// Estado del Modal
const modalVisible = ref(false)
const cargandoDetalle = ref(false)
const roladaSeleccionada = ref(null)
const indiceRoladaActual = ref(0)
const datosDetalle = ref([])

// Refs
const mainContentRef = ref(null)
const tablaRef = ref(null)
const tableElementRef = ref(null)

// Función para formatear números con separador de miles (formato español)
const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (isNaN(num)) return '-';
  
  // Formatear con decimales
  const fixed = num.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  
  // Añadir separador de miles (punto)
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Retornar con decimales si aplica (usando coma)
  return decPart ? `${formatted},${decPart}` : formatted;
};

// Función para formatear listas con "y"
const formatListaConY = (lista) => {
  if (!lista || lista === '') return '-';
  // Separar por coma (con o sin espacio)
  const items = lista.split(',').map(item => item.trim()).filter(item => item !== '');
  if (items.length === 0) return '-';
  if (items.length === 1) return items[0];
  if (items.length === 2) return items.join(' y ');
  const ultimos = items.slice(-2).join(' y ');
  const primeros = items.slice(0, -2).join(', ');
  return primeros + ', ' + ultimos;
};

// Función para formatear números en el modal
const formatNumberModal = (num) => {
  if (num === null || num === undefined || num === '') return '';
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
};

// Calcular R103
const calcularR103 = (roturas, metros) => {
  if (!metros || metros === 0) return '';
  const valor = (roturas * 1000) / metros;
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(valor);
};

// Agrupar datos del detalle por PARTIDA (igual que ConsultaRoladaIndigo)
const datosDetalleAgrupados = computed(() => {
  if (datosDetalle.value.length === 0) return [];
  
  const grupos = {};
  
  datosDetalle.value.forEach(item => {
    const partida = item.PARTIDA;
    if (!grupos[partida]) {
      grupos[partida] = [];
    }
    grupos[partida].push(item);
  });
  
  return Object.keys(grupos).map(partida => {
    const registros = grupos[partida];
    
    if (registros.length === 1) {
      return registros[0];
    }
    
    // Ordenar por fecha y hora
    registros.sort((a, b) => {
      const dateTimeA = `${a.DT_INICIO} ${a.HORA_INICIO}`;
      const dateTimeB = `${b.DT_INICIO} ${b.HORA_INICIO}`;
      return dateTimeA.localeCompare(dateTimeB);
    });
    
    const primerRegistro = registros[0];
    const ultimoRegistro = registros[registros.length - 1];
    
    const metrosTotal = registros.reduce((sum, r) => sum + (parseFloat(r.METRAGEM) || 0), 0);
    const roturasTotal = registros.reduce((sum, r) => sum + (parseInt(r.RUPTURAS) || 0), 0);
    const cvTotal = registros.reduce((sum, r) => sum + (parseFloat(r.CAVALOS) || 0), 0);
    
    return {
      PARTIDA: partida,
      DT_INICIO: primerRegistro.DT_INICIO,
      HORA_INICIO: primerRegistro.HORA_INICIO,
      DT_FINAL: ultimoRegistro.DT_FINAL,
      HORA_FINAL: ultimoRegistro.HORA_FINAL,
      TURNO: primerRegistro.TURNO,
      ARTIGO: primerRegistro.ARTIGO,
      COR: primerRegistro.COR,
      METRAGEM: metrosTotal,
      VELOC: primerRegistro.VELOC,
      S: primerRegistro.S,
      RUPTURAS: roturasTotal,
      CAVALOS: cvTotal,
      NM_OPERADOR: primerRegistro.NM_OPERADOR
    };
  });
});

// Totales del detalle
const totalesDetalle = computed(() => {
  return datosDetalleAgrupados.value.reduce((acc, item) => {
    acc.metros += parseFloat(item.METRAGEM) || 0;
    acc.roturas += parseInt(item.RUPTURAS) || 0;
    acc.cv += parseFloat(item.CAVALOS) || 0;
    return acc;
  }, { metros: 0, roturas: 0, cv: 0 });
});

// Abrir modal con detalle de la rolada
const abrirModalDetalle = async (rolada, index) => {
  roladaSeleccionada.value = rolada;
  indiceRoladaActual.value = index;
  modalVisible.value = true;
  await cargarDetalleRolada(rolada);
};

// Cargar detalle de una rolada
const cargarDetalleRolada = async (rolada) => {
  cargandoDetalle.value = true;
  datosDetalle.value = [];
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/consulta-rolada-indigo?rolada=${rolada}`);
    if (!response.ok) throw new Error('Error al cargar detalle');
    datosDetalle.value = await response.json();
  } catch (error) {
    console.error('Error cargando detalle:', error);
  } finally {
    cargandoDetalle.value = false;
  }
};

// Navegar entre roladas
const navegarRolada = async (direccion) => {
  const nuevoIndice = indiceRoladaActual.value + direccion;
  if (nuevoIndice >= 0 && nuevoIndice < datos.value.length) {
    indiceRoladaActual.value = nuevoIndice;
    roladaSeleccionada.value = datos.value[nuevoIndice].ROLADA;
    await cargarDetalleRolada(roladaSeleccionada.value);
  }
};

// Cerrar modal
const cerrarModal = () => {
  modalVisible.value = false;
  datosDetalle.value = [];
};

// Cargar datos
const cargarDatos = async () => {
  cargando.value = true;
  try {
    if (!fechaSeleccionada.value) return;
    
    // Fecha final (la seleccionada)
    const fechaFin = new Date(fechaSeleccionada.value + 'T00:00:00');
    
    // Fecha inicial (fecha final - días seleccionados)
    const fechaInicio = new Date(fechaFin);
    fechaInicio.setDate(fechaInicio.getDate() - diasSeleccionados.value);
    
    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
    const fechaFinStr = fechaFin.toISOString().split('T')[0];
    
    console.log('Consultando desde:', fechaInicioStr, 'hasta:', fechaFinStr);
    
    const response = await fetch(`${API_BASE_URL}/api/seguimiento-roladas?fechaInicio=${fechaInicioStr}&fechaFin=${fechaFinStr}`);
    
    if (!response.ok) throw new Error('Error al cargar datos');
    
    const resultado = await response.json();
    datos.value = resultado.datos;
    totalesMes.value = resultado.totales;
    
    console.log('Datos cargados:', datos.value.length, 'roladas');
    console.log('Totales:', totalesMes.value);
  } catch (error) {
    console.error('Error cargando datos:', error);
    alert('Error al cargar los datos');
  } finally {
    cargando.value = false;
  }
};

// Copiar tabla como imagen al portapapeles
const copiarComoImagen = async () => {
  if (datos.value.length === 0) {
    alert('No hay datos para copiar');
    return;
  }
  
  copiando.value = true;
  
  try {
    // Fecha de inicio y fin para el encabezado
    const fechaFin = new Date(fechaSeleccionada.value + 'T00:00:00');
    const fechaInicio = new Date(fechaFin);
    fechaInicio.setDate(fechaInicio.getDate() - diasSeleccionados.value);
    
    const formatFecha = (d) => d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    // Crear contenedor temporal con estilos inline (sin Tailwind/oklch)
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px; background: #ffffff; padding: 16px; font-family: system-ui, -apple-system, sans-serif;';
    
    // Crear encabezado
    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #1e40af;';
    header.innerHTML = `
      <div style="font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
        📊 Seguimiento de Roladas ÍNDIGO
      </div>
      <div style="font-size: 13px; color: #64748b;">
        Período: ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)} • ${datos.value.length} roladas
      </div>
    `;
    container.appendChild(header);
    
    // Colores para la tabla (hex, compatibles con html2canvas)
    const colors = {
      headerDark: '#1e293b',
      urdidoraHeader: '#047857',
      indigoHeader: '#1d4ed8',
      tejeduriaHeader: '#7c3aed',
      calidadHeader: '#b45309',
      urdidoraLight: '#d1fae5',
      indigoLight: '#dbeafe',
      tejeduriaLight: '#ede9fe',
      calidadLight: '#fef3c7',
      white: '#ffffff',
      border: '#e2e8f0',
      text: '#334155',
      textLight: '#64748b'
    };
    
    // Crear tabla HTML manualmente con estilos inline
    const table = document.createElement('table');
    table.style.cssText = 'border-collapse: collapse; font-size: 12px; width: 100%;';
    
    // Thead - Fila de grupos
    const thead = document.createElement('thead');
    const headerRow1 = document.createElement('tr');
    headerRow1.innerHTML = `
      <th rowspan="2" style="background: ${colors.headerDark}; color: white; padding: 8px; text-align: center; border: 1px solid ${colors.border}; font-size: 11px;">ROLADA</th>
      <th colspan="2" style="background: ${colors.urdidoraHeader}; color: white; padding: 6px; text-align: center; border: 1px solid ${colors.border}; font-size: 10px;">URDIDORA</th>
      <th colspan="8" style="background: ${colors.indigoHeader}; color: white; padding: 6px; text-align: center; border: 1px solid ${colors.border}; font-size: 10px;">ÍNDIGO</th>
      <th colspan="4" style="background: ${colors.tejeduriaHeader}; color: white; padding: 6px; text-align: center; border: 1px solid ${colors.border}; font-size: 10px;">TEJEDURÍA</th>
      <th colspan="3" style="background: ${colors.calidadHeader}; color: white; padding: 6px; text-align: center; border: 1px solid ${colors.border}; font-size: 10px;">CALIDAD</th>
    `;
    thead.appendChild(headerRow1);
    
    // Thead - Fila de columnas
    const headerRow2 = document.createElement('tr');
    const subHeaders = [
      { text: 'Maq.OE', bg: colors.urdidoraHeader },
      { text: 'Lote', bg: colors.urdidoraHeader },
      { text: 'Fecha', bg: colors.indigoHeader },
      { text: 'Base', bg: colors.indigoHeader },
      { text: 'Color', bg: colors.indigoHeader },
      { text: 'Metros', bg: colors.indigoHeader },
      { text: 'R10³', bg: colors.indigoHeader },
      { text: 'Cav', bg: colors.indigoHeader },
      { text: 'V.Nom', bg: colors.indigoHeader },
      { text: 'V.Prom', bg: colors.indigoHeader },
      { text: 'Metros', bg: colors.tejeduriaHeader },
      { text: 'Efic.%', bg: colors.tejeduriaHeader },
      { text: 'RU10⁵', bg: colors.tejeduriaHeader },
      { text: 'RT10⁵', bg: colors.tejeduriaHeader },
      { text: 'Metros', bg: colors.calidadHeader },
      { text: 'Cal.%', bg: colors.calidadHeader },
      { text: 'Pts/100m²', bg: colors.calidadHeader }
    ];
    subHeaders.forEach(h => {
      const th = document.createElement('th');
      th.style.cssText = `background: ${h.bg}; color: white; padding: 5px 6px; text-align: center; border: 1px solid ${colors.border}; font-size: 9px; font-weight: 600;`;
      th.textContent = h.text;
      headerRow2.appendChild(th);
    });
    thead.appendChild(headerRow2);
    table.appendChild(thead);
    
    // Tbody - Filas de datos
    const tbody = document.createElement('tbody');
    datos.value.forEach((item, idx) => {
      const isEven = idx % 2 === 0;
      const row = document.createElement('tr');
      
      const cellData = [
        { value: item.ROLADA, bg: colors.white, bold: true },
        { value: formatListaConY(item.MAQ_OE), bg: isEven ? colors.urdidoraLight : colors.white },
        { value: formatListaConY(item.LOTE), bg: isEven ? colors.urdidoraLight : colors.white },
        { value: item.FECHA || '-', bg: isEven ? colors.indigoLight : colors.white, small: true },
        { value: item.BASE || '-', bg: isEven ? colors.indigoLight : colors.white },
        { value: item.COLOR || '-', bg: isEven ? colors.indigoLight : colors.white },
        { value: formatNumber(item.MTS_IND, 0), bg: isEven ? colors.indigoLight : colors.white },
        { value: formatNumber(item.R103, 1), bg: isEven ? colors.indigoLight : colors.white },
        { value: item.CAV || '-', bg: isEven ? colors.indigoLight : colors.white },
        { value: formatNumber(item.VEL_NOM, 0), bg: isEven ? colors.indigoLight : colors.white },
        { value: formatNumber(item.VEL_PROM, 0), bg: isEven ? colors.indigoLight : colors.white },
        { value: formatNumber(item.MTS_CRUDOS, 0), bg: isEven ? colors.tejeduriaLight : colors.white },
        { value: formatNumber(item.EFI_TEJ, 1), bg: isEven ? colors.tejeduriaLight : colors.white },
        { value: formatNumber(item.RU105, 1), bg: isEven ? colors.tejeduriaLight : colors.white },
        { value: formatNumber(item.RT105, 1), bg: isEven ? colors.tejeduriaLight : colors.white },
        { value: formatNumber(item.MTS_CAL, 0), bg: isEven ? colors.calidadLight : colors.white },
        { value: formatNumber(item.CAL_PERCENT, 1), bg: isEven ? colors.calidadLight : colors.white },
        { value: formatNumber(item.PTS_100M2, 1), bg: isEven ? colors.calidadLight : colors.white }
      ];
      
      cellData.forEach(cell => {
        const td = document.createElement('td');
        td.style.cssText = `background: ${cell.bg}; color: ${colors.text}; padding: 5px 6px; text-align: center; border: 1px solid ${colors.border}; ${cell.bold ? 'font-weight: 600;' : ''} ${cell.small ? 'font-size: 10px;' : ''}`;
        td.textContent = cell.value;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    // Tfoot - Fila de totales
    if (totalesMes.value) {
      const tfoot = document.createElement('tfoot');
      const totalRow = document.createElement('tr');
      totalRow.style.cssText = 'background: #f1f5f9; font-weight: 600;';
      
      const totalCellData = [
        { value: `Total (${totalesMes.value.TOTAL_ROLADAS})`, colspan: 3 },
        { value: '-', colspan: 3 },
        { value: formatNumber(totalesMes.value.MTS_IND, 0) },
        { value: formatNumber(totalesMes.value.R103, 1) },
        { value: totalesMes.value.CAV || '-' },
        { value: '-' },
        { value: formatNumber(totalesMes.value.VEL_PROM, 0) },
        { value: formatNumber(totalesMes.value.MTS_CRUDOS, 0) },
        { value: formatNumber(totalesMes.value.EFI_TEJ, 1) },
        { value: formatNumber(totalesMes.value.RU105, 1) },
        { value: formatNumber(totalesMes.value.RT105, 1) },
        { value: formatNumber(totalesMes.value.MTS_CAL, 0) },
        { value: formatNumber(totalesMes.value.CAL_PERCENT, 1) },
        { value: formatNumber(totalesMes.value.PTS_100M2, 1) }
      ];
      
      totalCellData.forEach(cell => {
        const td = document.createElement('td');
        td.style.cssText = `background: #f1f5f9; color: ${colors.text}; padding: 6px; text-align: center; border: 1px solid ${colors.border}; border-top: 2px solid #94a3b8;`;
        td.textContent = cell.value;
        if (cell.colspan) td.colSpan = cell.colspan;
        totalRow.appendChild(td);
      });
      tfoot.appendChild(totalRow);
      table.appendChild(tfoot);
    }
    
    container.appendChild(table);
    document.body.appendChild(container);
    
    // Capturar como canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false
    });
    
    // Limpiar
    document.body.removeChild(container);
    
    // Convertir a blob y copiar al portapapeles
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        
        // Mostrar confirmación visual
        const toast = document.createElement('div');
        toast.style.cssText = 'position: fixed; bottom: 16px; right: 16px; background: #059669; color: white; padding: 10px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 8px; z-index: 9999; font-family: system-ui;';
        toast.innerHTML = `
          <svg style="width: 20px; height: 20px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Imagen copiada al portapapeles</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
        
      } catch (clipboardError) {
        console.error('Error al copiar al portapapeles:', clipboardError);
        // Fallback: descargar la imagen
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'SeguimientoRoladas.png';
        link.href = url;
        link.click();
        alert('No se pudo copiar al portapapeles. La imagen se ha descargado.');
      }
    }, 'image/png');
    
  } catch (error) {
    console.error('Error al generar imagen:', error);
    alert('Error al generar la imagen');
  } finally {
    copiando.value = false;
  }
};

// Exportar a Excel
const exportarAExcel = async () => {
  if (datos.value.length === 0) {
    alert('No hay datos para exportar');
    return;
  }
  
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Producción STC';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Seguimiento Roladas', {
      views: [{ state: 'frozen', ySplit: 2 }]
    });
    
    // Definir columnas con anchos
    worksheet.columns = [
      { key: 'ROLADA', width: 10 },
      { key: 'MAQ_OE', width: 12 },
      { key: 'LOTE', width: 12 },
      { key: 'FECHA', width: 12 },
      { key: 'BASE', width: 14 },
      { key: 'COLOR', width: 10 },
      { key: 'MTS_IND', width: 12 },
      { key: 'R103', width: 10 },
      { key: 'CAV', width: 8 },
      { key: 'VEL_NOM', width: 10 },
      { key: 'VEL_PROM', width: 10 },
      { key: 'MTS_CRUDOS', width: 12 },
      { key: 'EFI_TEJ', width: 10 },
      { key: 'RU105', width: 10 },
      { key: 'RT105', width: 10 },
      { key: 'MTS_CAL', width: 12 },
      { key: 'CAL_PERCENT', width: 10 },
      { key: 'PTS_100M2', width: 12 }
    ];
    
    // Colores para las secciones
    const colors = {
      headerDark: 'FF1E293B',      // slate-800
      urdidoraHeader: 'FF047857',  // emerald-700
      indigoHeader: 'FF1D4ED8',    // blue-700
      tejeduriaHeader: 'FF6D28D9', // violet-700
      calidadHeader: 'FFB45309',   // amber-700
      urdidoraLight: 'FFD1FAE5',   // emerald-100
      indigoLight: 'FFDBEAFE',     // blue-100
      tejeduriaLight: 'FFEDE9FE',  // violet-100
      calidadLight: 'FFFEF3C7',    // amber-100
      totalesRow: 'FFF1F5F9',      // slate-100
      white: 'FFFFFFFF'
    };
    
    // === FILA 1: Encabezados de grupo ===
    worksheet.mergeCells('A1:A2');
    worksheet.getCell('A1').value = 'ROLADA';
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerDark } };
    worksheet.getCell('A1').font = { bold: true, color: { argb: colors.white }, size: 10 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').border = { right: { style: 'thin', color: { argb: 'FF475569' } } };
    
    worksheet.mergeCells('B1:C1');
    worksheet.getCell('B1').value = 'URDIDORA';
    worksheet.getCell('B1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.urdidoraHeader } };
    worksheet.getCell('B1').font = { bold: true, color: { argb: colors.white }, size: 10 };
    worksheet.getCell('B1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('B1').border = { right: { style: 'thin', color: { argb: 'FF475569' } } };
    
    worksheet.mergeCells('D1:K1');
    worksheet.getCell('D1').value = 'ÍNDIGO';
    worksheet.getCell('D1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.indigoHeader } };
    worksheet.getCell('D1').font = { bold: true, color: { argb: colors.white }, size: 10 };
    worksheet.getCell('D1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('D1').border = { right: { style: 'thin', color: { argb: 'FF475569' } } };
    
    worksheet.mergeCells('L1:O1');
    worksheet.getCell('L1').value = 'TEJEDURÍA';
    worksheet.getCell('L1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.tejeduriaHeader } };
    worksheet.getCell('L1').font = { bold: true, color: { argb: colors.white }, size: 10 };
    worksheet.getCell('L1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('L1').border = { right: { style: 'thin', color: { argb: 'FF475569' } } };
    
    worksheet.mergeCells('P1:R1');
    worksheet.getCell('P1').value = 'CALIDAD';
    worksheet.getCell('P1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.calidadHeader } };
    worksheet.getCell('P1').font = { bold: true, color: { argb: colors.white }, size: 10 };
    worksheet.getCell('P1').alignment = { horizontal: 'center', vertical: 'middle' };
    
    worksheet.getRow(1).height = 22;
    
    // === FILA 2: Sub-encabezados ===
    const subHeaders = [
      '', 'Maq. OE', 'Lote', 'Fecha', 'Base', 'Color', 'Metros', 'R10³', 'Cav', 'Vel.Nom', 'Vel.Prom',
      'Metros', 'Efic.%', 'RU10⁵', 'RT10⁵', 'Metros', 'Cal.%', 'Pts/100m²'
    ];
    const subHeaderRow = worksheet.getRow(2);
    subHeaders.forEach((header, idx) => {
      const cell = subHeaderRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: colors.white }, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Color según sección
      if (idx >= 1 && idx <= 2) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.urdidoraHeader } };
      } else if (idx >= 3 && idx <= 10) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.indigoHeader } };
      } else if (idx >= 11 && idx <= 14) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.tejeduriaHeader } };
      } else if (idx >= 15) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.calidadHeader } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerDark } };
      }
    });
    subHeaderRow.height = 20;
    
    // === FILAS DE DATOS ===
    datos.value.forEach((item, idx) => {
      const row = worksheet.addRow({
        ROLADA: item.ROLADA,
        MAQ_OE: item.MAQ_OE || '-',
        LOTE: item.LOTE || '-',
        FECHA: item.FECHA || '-',
        BASE: item.BASE || '-',
        COLOR: item.COLOR || '-',
        MTS_IND: item.MTS_IND,
        R103: item.R103,
        CAV: item.CAV || '-',
        VEL_NOM: item.VEL_NOM,
        VEL_PROM: item.VEL_PROM,
        MTS_CRUDOS: item.MTS_CRUDOS,
        EFI_TEJ: item.EFI_TEJ,
        RU105: item.RU105,
        RT105: item.RT105,
        MTS_CAL: item.MTS_CAL,
        CAL_PERCENT: item.CAL_PERCENT,
        PTS_100M2: item.PTS_100M2
      });
      
      row.height = 18;
      row.alignment = { vertical: 'middle' };
      
      // Estilo alternado y colores de sección
      const isEven = idx % 2 === 0;
      
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } }
        };
        
        // Colores según sección
        if (colNumber >= 2 && colNumber <= 3) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? colors.urdidoraLight : colors.white } };
        } else if (colNumber >= 4 && colNumber <= 11) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? colors.indigoLight : colors.white } };
        } else if (colNumber >= 12 && colNumber <= 15) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? colors.tejeduriaLight : colors.white } };
        } else if (colNumber >= 16) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? colors.calidadLight : colors.white } };
        }
        
        // Formato numérico para columnas específicas
        if ([7, 12, 16].includes(colNumber)) {
          cell.numFmt = '#,##0';
        } else if ([8, 13, 14, 15, 17, 18].includes(colNumber)) {
          cell.numFmt = '#,##0.0';
        }
      });
    });
    
    // === FILA DE TOTALES DEL MES ===
    if (totalesMes.value) {
      const totalRow = worksheet.addRow({
        ROLADA: `TOTAL MES (${totalesMes.value.TOTAL_ROLADAS} roladas)`,
        MAQ_OE: '',
        LOTE: '',
        FECHA: '',
        BASE: '',
        COLOR: '',
        MTS_IND: totalesMes.value.MTS_IND,
        R103: totalesMes.value.R103,
        CAV: totalesMes.value.CAV || '-',
        VEL_NOM: '-',
        VEL_PROM: totalesMes.value.VEL_PROM,
        MTS_CRUDOS: totalesMes.value.MTS_CRUDOS,
        EFI_TEJ: totalesMes.value.EFI_TEJ,
        RU105: totalesMes.value.RU105,
        RT105: totalesMes.value.RT105,
        MTS_CAL: totalesMes.value.MTS_CAL,
        CAL_PERCENT: totalesMes.value.CAL_PERCENT,
        PTS_100M2: totalesMes.value.PTS_100M2
      });
      
      totalRow.height = 22;
      totalRow.font = { bold: true, size: 10 };
      
      totalRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalesRow } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'medium', color: { argb: 'FF94A3B8' } }
        };
        
        if ([7, 12, 16].includes(colNumber)) {
          cell.numFmt = '#,##0';
        } else if ([8, 13, 14, 15, 17, 18].includes(colNumber)) {
          cell.numFmt = '#,##0.0';
        }
      });
      
      // Merge primera celda para el texto del total
      worksheet.mergeCells(totalRow.number, 1, totalRow.number, 3);
    }
    
    // Generar nombre con fecha y hora
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const fileName = `SeguimientoRoladas_${dd}-${mm}-${yyyy}_${hh}_${min}.xlsx`;
    
    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    alert('Error al exportar a Excel');
  }
};

// Imprimir tabla directamente
const imprimirTabla = () => {
  if (datos.value.length === 0) return;
  
  // Colores en hex para la impresión
  const colores = {
    urdidora: '#6366F1',
    urdidoraLight: '#EEF2FF',
    indigo: '#1E40AF',
    indigoLight: '#DBEAFE',
    tejeduria: '#059669',
    tejeduriaLight: '#D1FAE5',
    calidad: '#DC2626',
    calidadLight: '#FEE2E2',
    totales: '#F8FAFC'
  };
  
  // Construir HTML de la tabla
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Seguimiento de Roladas</title>
      <style>
        @page { 
          size: landscape; 
          margin: 10mm;
        }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 9px;
          margin: 0;
          padding: 10px;
        }
        h2 { 
          text-align: center; 
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #1e293b;
        }
        .fecha-info {
          text-align: center;
          margin-bottom: 10px;
          color: #64748b;
          font-size: 10px;
        }
        table { 
          border-collapse: collapse; 
          width: 100%;
          font-size: 8px;
        }
        th, td { 
          border: 1px solid #cbd5e1; 
          padding: 3px 4px; 
          text-align: center;
          white-space: nowrap;
        }
        th { 
          font-weight: bold;
          color: white;
        }
        .section-header {
          font-size: 9px;
          font-weight: bold;
        }
        .totales-row td {
          background-color: ${colores.totales} !important;
          font-weight: bold;
          border-top: 2px solid #94a3b8;
          border-bottom: 2px solid #94a3b8;
        }
        .even-row-urdidora { background-color: ${colores.urdidoraLight}; }
        .even-row-indigo { background-color: ${colores.indigoLight}; }
        .even-row-tejeduria { background-color: ${colores.tejeduriaLight}; }
        .even-row-calidad { background-color: ${colores.calidadLight}; }
        .clickable { cursor: pointer; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h2>SEGUIMIENTO DE ROLADAS</h2>
      <div class="fecha-info">
        Período: Últimos ${diasSeleccionados.value} días hasta ${new Date(fechaSeleccionada.value + 'T00:00:00').toLocaleDateString('es-ES')} | ${datos.value.length} roladas encontradas
      </div>
      <table>
        <thead>
          <tr class="section-header">
            <th rowspan="2" style="background-color: #475569;">ROLADA</th>
            <th colspan="2" style="background-color: ${colores.urdidora};">URDIDORA</th>
            <th colspan="8" style="background-color: ${colores.indigo};">ÍNDIGO</th>
            <th colspan="4" style="background-color: ${colores.tejeduria};">TEJEDURÍA</th>
            <th colspan="3" style="background-color: ${colores.calidad};">CALIDAD</th>
          </tr>
          <tr>
            <th style="background-color: ${colores.urdidora};">MAQ OE</th>
            <th style="background-color: ${colores.urdidora};">LOTE</th>
            <th style="background-color: ${colores.indigo};">FECHA</th>
            <th style="background-color: ${colores.indigo};">BASE</th>
            <th style="background-color: ${colores.indigo};">COLOR</th>
            <th style="background-color: ${colores.indigo};">METROS</th>
            <th style="background-color: ${colores.indigo};">R‰</th>
            <th style="background-color: ${colores.indigo};">CAV</th>
            <th style="background-color: ${colores.indigo};">Vel.Nom</th>
            <th style="background-color: ${colores.indigo};">Vel.Prom</th>
            <th style="background-color: ${colores.tejeduria};">CRUDOS</th>
            <th style="background-color: ${colores.tejeduria};">EFI%</th>
            <th style="background-color: ${colores.tejeduria};">RU‰</th>
            <th style="background-color: ${colores.tejeduria};">RT‰</th>
            <th style="background-color: ${colores.calidad};">METROS</th>
            <th style="background-color: ${colores.calidad};">CAL%</th>
            <th style="background-color: ${colores.calidad};">Pts/100m²</th>
          </tr>
        </thead>
        <tbody>`;
  
  // Filas de datos
  datos.value.forEach((item, idx) => {
    const isEven = idx % 2 === 0;
    html += `
          <tr>
            <td style="background-color: #f1f5f9; font-weight: 600;">${item.ROLADA}</td>
            <td class="${isEven ? 'even-row-urdidora' : ''}">${item.MAQ_OE || '-'}</td>
            <td class="${isEven ? 'even-row-urdidora' : ''}">${item.LOTE || '-'}</td>
            <td class="${isEven ? 'even-row-indigo' : ''}">${item.FECHA || '-'}</td>
            <td class="${isEven ? 'even-row-indigo' : ''}">${item.BASE || '-'}</td>
            <td class="${isEven ? 'even-row-indigo' : ''}">${formatListaConY(item.COLOR)}</td>
            <td class="${isEven ? 'even-row-indigo' : ''}">${formatNumber(item.MTS_IND, 0)}</td>
            <td class="${isEven ? 'even-row-indigo' : ''}">${formatNumber(item.R103, 1)}</td>
            <td class="${isEven ? 'even-row-indigo' : ''}">${item.CAV || '-'}</td>
            <td class="${isEven ? 'even-row-indigo' : ''}">${item.VEL_NOM || '-'}</td>
            <td class="${isEven ? 'even-row-indigo' : ''}">${formatNumber(item.VEL_PROM, 1)}</td>
            <td class="${isEven ? 'even-row-tejeduria' : ''}">${formatNumber(item.MTS_CRUDOS, 0)}</td>
            <td class="${isEven ? 'even-row-tejeduria' : ''}">${formatNumber(item.EFI_TEJ, 1)}</td>
            <td class="${isEven ? 'even-row-tejeduria' : ''}">${formatNumber(item.RU105, 1)}</td>
            <td class="${isEven ? 'even-row-tejeduria' : ''}">${formatNumber(item.RT105, 1)}</td>
            <td class="${isEven ? 'even-row-calidad' : ''}">${formatNumber(item.MTS_CAL, 0)}</td>
            <td class="${isEven ? 'even-row-calidad' : ''}">${formatNumber(item.CAL_PERCENT, 1)}</td>
            <td class="${isEven ? 'even-row-calidad' : ''}">${formatNumber(item.PTS_100M2, 1)}</td>
          </tr>`;
  });
  
  // Fila de totales
  if (totalesMes.value) {
    html += `
          <tr class="totales-row">
            <td colspan="3">TOTAL (${totalesMes.value.TOTAL_ROLADAS} roladas)</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>${formatNumber(totalesMes.value.MTS_IND, 0)}</td>
            <td>${formatNumber(totalesMes.value.R103, 1)}</td>
            <td>${totalesMes.value.CAV || '-'}</td>
            <td>-</td>
            <td>${formatNumber(totalesMes.value.VEL_PROM, 1)}</td>
            <td>${formatNumber(totalesMes.value.MTS_CRUDOS, 0)}</td>
            <td>${formatNumber(totalesMes.value.EFI_TEJ, 1)}</td>
            <td>${formatNumber(totalesMes.value.RU105, 1)}</td>
            <td>${formatNumber(totalesMes.value.RT105, 1)}</td>
            <td>${formatNumber(totalesMes.value.MTS_CAL, 0)}</td>
            <td>${formatNumber(totalesMes.value.CAL_PERCENT, 1)}</td>
            <td>${formatNumber(totalesMes.value.PTS_100M2, 1)}</td>
          </tr>`;
  }
  
  html += `
        </tbody>
      </table>
    </body>
    </html>`;
  
  // Abrir ventana de impresión
  const ventana = window.open('', '_blank', 'width=1200,height=800');
  ventana.document.write(html);
  ventana.document.close();
  
  // Esperar a que cargue y luego imprimir
  ventana.onload = () => {
    ventana.focus();
    ventana.print();
  };
};

// Inicializar fecha por defecto (ayer)
onMounted(() => {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  fechaSeleccionada.value = ayer.toISOString().split('T')[0];
  cargarDatos();
});
</script>

<style scoped>
/* Estilos personalizados si son necesarios */
</style>
