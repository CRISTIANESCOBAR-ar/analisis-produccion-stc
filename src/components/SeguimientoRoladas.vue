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
      <div class="overflow-auto relative bg-white rounded-lg shadow-sm border border-slate-300" ref="tablaRef">
        <table ref="tableElementRef" class="w-full text-[13px] text-slate-700 border-separate border-spacing-0">
          <thead class="sticky top-0 z-10">
            <!-- Fila superior - Grupos -->
            <tr class="text-slate-500 text-[11px] uppercase tracking-wider">
              <th scope="col" rowspan="2" class="px-3 py-3 font-semibold text-center border-r-2 border-slate-300 border-b-2 border-b-slate-300 text-slate-700 bg-slate-50">Rolada</th>
              <th scope="col" colspan="2" class="px-3 py-2 font-semibold text-center border-r-2 border-slate-300 border-b border-b-slate-300 text-slate-700 bg-slate-50">Urdidora</th>
              <th scope="col" colspan="8" class="px-3 py-2 font-semibold text-center border-r-2 border-slate-300 border-b border-b-slate-300 text-slate-700 bg-slate-50">Índigo</th>
              <th scope="col" colspan="4" class="px-3 py-2 font-semibold text-center border-r-2 border-slate-300 border-b border-b-slate-300 text-slate-700 bg-slate-50">Tejeduría</th>
              <th scope="col" colspan="3" class="px-3 py-2 font-semibold text-center border-b border-b-slate-300 text-slate-700 bg-slate-50">Calidad</th>
            </tr>
            <!-- Fila inferior - Columnas -->
            <tr class="text-slate-600 text-[11px] bg-slate-50">
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">Maq. OE</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r-2 border-slate-300 border-b-2 border-b-slate-300">Lote</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">Fecha</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">Base</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">Color</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">Metros</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">R10³</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">Cav</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">Vel. Nom.</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r-2 border-slate-300 border-b-2 border-b-slate-300">Vel. Prom.</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">Metros</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">Efic. %</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">RU10⁵</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r-2 border-slate-300 border-b-2 border-b-slate-300">RT10⁵</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">Metros</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300">Cal. %</th>
              <th scope="col" class="px-2 py-2 font-medium text-center border-b-2 border-b-slate-300">Pts/100m²</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in datos" :key="item.ROLADA" 
                class="border-b border-slate-200 hover:bg-slate-50/80 transition-colors">
              <td class="px-3 py-2.5 font-semibold text-slate-800 text-center tabular-nums border-r-2 border-slate-300 bg-slate-50/50">{{ item.ROLADA }}</td>
              <td class="px-2 py-2.5 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ formatListaConY(item.MAQ_OE) }}</td>
              <td class="px-2 py-2.5 text-center text-slate-600 tabular-nums border-r-2 border-slate-300">{{ formatListaConY(item.LOTE) }}</td>
              <!-- Celdas ÍNDIGO clickeables -->
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2.5 text-center text-slate-500 text-xs border-r border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors">{{ item.FECHA }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2.5 text-center text-slate-700 border-r border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors">{{ item.BASE }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2.5 text-center text-slate-600 border-r border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors">{{ item.COLOR }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2.5 text-center text-slate-700 font-medium tabular-nums border-r border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors">{{ formatNumber(item.MTS_IND, 0) }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2.5 text-center text-slate-600 tabular-nums border-r border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors">{{ formatNumber(item.R103, 1) }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2.5 text-center text-slate-600 tabular-nums border-r border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors">{{ item.CAV || '-' }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2.5 text-center text-slate-600 tabular-nums border-r border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors">{{ formatNumber(item.VEL_NOM, 0) }}</td>
              <td @click="abrirModalDetalle(item.ROLADA, index)" class="px-2 py-2.5 text-center text-slate-600 tabular-nums border-r-2 border-slate-300 cursor-pointer hover:bg-blue-50 transition-colors">{{ formatNumber(item.VEL_PROM, 0) }}</td>
              <td class="px-2 py-2.5 text-center text-slate-700 font-medium tabular-nums border-r border-slate-200">{{ formatNumber(item.MTS_CRUDOS, 0) }}</td>
              <td class="px-2 py-2.5 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ formatNumber(item.EFI_TEJ, 1) }}</td>
              <td class="px-2 py-2.5 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ formatNumber(item.RU105, 1) }}</td>
              <td class="px-2 py-2.5 text-center text-slate-600 tabular-nums border-r-2 border-slate-300">{{ formatNumber(item.RT105, 1) }}</td>
              <td class="px-2 py-2.5 text-center text-slate-700 font-medium tabular-nums border-r border-slate-200">{{ formatNumber(item.MTS_CAL, 0) }}</td>
              <td class="px-2 py-2.5 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ formatNumber(item.CAL_PERCENT, 1) }}</td>
              <td class="px-2 py-2.5 text-center text-slate-600 tabular-nums">{{ formatNumber(item.PTS_100M2, 1) }}</td>
            </tr>
          </tbody>
          <!-- Fila de totales del mes -->
          <tfoot v-if="totalesMes && datos.length > 0" class="sticky bottom-0 z-10 bg-slate-100">
            <tr class="font-semibold text-slate-700">
              <td class="px-3 py-3 text-center border-r-2 border-slate-300 border-t-2 border-t-slate-300" colspan="3">
                <span class="text-xs uppercase tracking-wide text-slate-500">Total</span>
                <span class="ml-2 text-slate-700">{{ totalesMes.TOTAL_ROLADAS }} roladas</span>
              </td>
              <td class="px-2 py-3 text-center text-slate-400 border-r border-slate-200 border-t-2 border-t-slate-300" colspan="3">-</td>
              <td class="px-2 py-3 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.MTS_IND, 0) }}</td>
              <td class="px-2 py-3 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.R103, 1) }}</td>
              <td class="px-2 py-3 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ totalesMes.CAV || '-' }}</td>
              <td class="px-2 py-3 text-center tabular-nums text-slate-400 border-r border-slate-200 border-t-2 border-t-slate-300">-</td>
              <td class="px-2 py-3 text-center tabular-nums border-r-2 border-slate-300 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.VEL_PROM, 0) }}</td>
              <td class="px-2 py-3 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.MTS_CRUDOS, 0) }}</td>
              <td class="px-2 py-3 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.EFI_TEJ, 1) }}</td>
              <td class="px-2 py-3 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.RU105, 1) }}</td>
              <td class="px-2 py-3 text-center tabular-nums border-r-2 border-slate-300 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.RT105, 1) }}</td>
              <td class="px-2 py-3 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.MTS_CAL, 0) }}</td>
              <td class="px-2 py-3 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.CAL_PERCENT, 1) }}</td>
              <td class="px-2 py-3 text-center tabular-nums border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.PTS_100M2, 1) }}</td>
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
    
    <!-- Modal Detalle Rolada -->
    <div v-if="modalVisible" class="fixed inset-0 z-50 flex items-center justify-center p-1 bg-black/50 backdrop-blur-sm" @click.self="cerrarModal">
      <div class="bg-white rounded-xl shadow-2xl w-[calc(100vw-8px)] h-[calc(100vh-8px)] flex flex-col overflow-hidden border border-slate-300">
        <!-- Header del Modal -->
        <div class="flex items-center justify-between px-5 py-3 bg-white">
          <div class="flex items-center gap-4">
            <!-- Botones de navegación de sección << >> -->
            <div class="flex items-center">
              <button 
                @click="cambiarSeccion('urdimbre')" 
                :class="[
                  'px-3 py-2 rounded-l-md border border-slate-200 shadow-sm transition-colors text-sm font-medium',
                  seccionActiva === 'urdimbre' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-500 hover:bg-slate-50'
                ]"
                v-tippy="{ content: 'Ver URDIMBRE', placement: 'bottom' }"
              >
                &lt;&lt; URDIMBRE
              </button>
              <button 
                @click="cambiarSeccion('indigo')" 
                :class="[
                  'px-3 py-2 border border-l-0 border-slate-200 shadow-sm transition-colors text-sm font-medium',
                  seccionActiva === 'indigo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 hover:bg-slate-50'
                ]"
                v-tippy="{ content: 'Ver ÍNDIGO', placement: 'bottom' }"
              >
                ÍNDIGO
              </button>
              <button 
                @click="cambiarSeccion('tecelagem')" 
                :class="[
                  'px-3 py-2 border border-l-0 border-slate-200 shadow-sm transition-colors text-sm font-medium',
                  seccionActiva === 'tecelagem' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-500 hover:bg-slate-50'
                ]"
                v-tippy="{ content: 'Ver TEJEDURÍA', placement: 'bottom' }"
              >
                TEJEDURÍA
              </button>
              <button 
                @click="cambiarSeccion('calidad')" 
                :class="[
                  'px-3 py-2 rounded-r-md border border-l-0 border-slate-200 shadow-sm transition-colors text-sm font-medium',
                  seccionActiva === 'calidad' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 hover:bg-slate-50'
                ]"
                v-tippy="{ content: 'Ver CALIDAD', placement: 'bottom' }"
              >
                CALIDAD &gt;&gt;
              </button>
            </div>
            
            <div>
              <h3 class="text-base font-semibold text-slate-800">
                Detalle {{ seccionActiva === 'urdimbre' ? 'URDIMBRE' : seccionActiva === 'indigo' ? 'ÍNDIGO' : seccionActiva === 'tecelagem' ? 'TEJEDURÍA' : 'CALIDAD' }} - Rolada {{ roladaSeleccionada }}
              </h3>
              <p class="text-xs text-slate-500">{{ indiceRoladaActual + 1 }} de {{ datos.length }} roladas</p>
            </div>
            
            <!-- Botones de navegación entre roladas -->
            <div class="flex items-center">
              <!-- Botón Anterior -->
              <button 
                @click="navegarRolada(-1)" 
                :disabled="indiceRoladaActual === 0"
                class="p-2 rounded-l-md border border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                v-tippy="{ content: 'Rolada anterior', placement: 'bottom' }"
              >
                <svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <!-- Botón Siguiente -->
              <button 
                @click="navegarRolada(1)" 
                :disabled="indiceRoladaActual === datos.length - 1"
                class="p-2 rounded-r-md border border-l-0 border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                v-tippy="{ content: 'Rolada siguiente', placement: 'bottom' }"
              >
                <svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <!-- Botón Copiar Imagen -->
            <button 
              @click="copiarModalComoImagen" 
              :disabled="copiandoModal || (seccionActiva === 'urdimbre' ? datosUrdimbre.length === 0 : seccionActiva === 'indigo' ? datosDetalleAgrupados.length === 0 : seccionActiva === 'tecelagem' ? (vistaDetallePartida ? datosDetallePartida.length === 0 : datosTecelagem.length === 0) : datosCalidad.length === 0)"
              class="p-2 rounded-md border border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              v-tippy="{ content: 'Copiar como imagen', placement: 'bottom' }"
            >
              <svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            
            <!-- Botón Exportar Excel -->
            <button 
              @click="exportarModalAExcel" 
              :disabled="(seccionActiva === 'urdimbre' ? datosUrdimbre.length === 0 : seccionActiva === 'indigo' ? datosDetalleAgrupados.length === 0 : seccionActiva === 'tecelagem' ? (vistaDetallePartida ? datosDetallePartida.length === 0 : datosTecelagem.length === 0) : datosCalidad.length === 0)"
              class="p-2 rounded-md border border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              v-tippy="{ content: 'Exportar a Excel', placement: 'bottom' }"
            >
              <svg class="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z"/>
              </svg>
            </button>
            
            <!-- Botón Cerrar -->
            <button @click="cerrarModal" class="p-2 rounded-md border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
              <svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Loading -->
        <div v-if="(seccionActiva === 'urdimbre' && cargandoUrdimbre) || (seccionActiva === 'indigo' && cargandoDetalle) || (seccionActiva === 'tecelagem' && cargandoTecelagem) || (seccionActiva === 'calidad' && cargandoCalidad)" class="flex-1 flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-600"></div>
            <span class="text-slate-600">Cargando detalles...</span>
          </div>
        </div>
        
        <!-- SECCIÓN URDIMBRE -->
        <template v-else-if="seccionActiva === 'urdimbre'">
          <div v-if="datosUrdimbre.length > 0" class="flex-1 overflow-auto bg-white m-3 rounded-lg border border-slate-300" ref="modalTableUrdimbreRef">
            <table class="w-full text-[13px] text-slate-700 border-separate border-spacing-0">
              <thead class="sticky top-0 z-10">
                <tr class="text-slate-600 text-[11px] bg-amber-50">
                  <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Partida</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Fecha<br>Inicio</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Hora<br>Inicio</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Fecha<br>Final</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Hora<br>Final</th>
                  <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Artículo</th>
                  <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Metros</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Vel.</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Puntas</th>
                  <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Operador</th>
                  <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Lote</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Maq.</th>
                  <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Base</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(item, index) in datosUrdimbre" 
                  :key="index" 
                  class="border-b border-slate-200 hover:bg-amber-50/50 transition-colors"
                >
                  <td class="px-3 py-2.5 font-semibold text-slate-800">{{ item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : '' }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-500 text-xs">{{ item.DT_INICIO }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-600 tabular-nums">{{ item.HORA_INICIO }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-500 text-xs">{{ item.DT_FINAL }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-600 tabular-nums">{{ item.HORA_FINAL }}</td>
                  <td class="px-3 py-2.5 text-slate-700">{{ item.ARTIGO }}</td>
                  <td class="px-3 py-2.5 text-right font-medium text-slate-700 tabular-nums">{{ formatNumber(item.METRAGEM, 0) }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-600 tabular-nums">{{ formatNumberModal(item.VELOC) }}</td>
                  <td class="px-3 py-2.5 text-center font-semibold text-amber-600">{{ item.NUM_FIOS }}</td>
                  <td class="px-3 py-2.5 text-slate-600">{{ item.NM_OPERADOR }}</td>
                  <td class="px-3 py-2.5 text-slate-600">{{ item.LOTE_FIACAO }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-600">{{ item.MAQ_FIACAO }}</td>
                  <td class="px-3 py-2.5 text-slate-700">{{ item.BASE_URDUME }}</td>
                </tr>
              </tbody>
              <tfoot class="sticky bottom-0 z-10 bg-amber-100">
                <tr class="font-semibold text-slate-700">
                  <td class="px-3 py-3 border-t-2 border-t-slate-300">TOTAL</td>
                  <td class="px-3 py-3 border-t-2 border-t-slate-300" colspan="5"></td>
                  <td class="px-3 py-3 text-right tabular-nums border-t-2 border-t-slate-300">{{ formatNumber(totalesUrdimbre.metros, 0) }}</td>
                  <td class="px-3 py-3 border-t-2 border-t-slate-300" colspan="6"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <!-- Sin datos URDIMBRE -->
          <div v-else class="flex-1 flex items-center justify-center py-20 text-slate-500">
            <div class="text-center">
              <svg class="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <p class="font-medium">No se encontraron detalles URDIMBRE</p>
              <p class="text-sm text-slate-400">Rolada {{ roladaSeleccionada }}</p>
            </div>
          </div>
        </template>
        
        <!-- SECCIÓN ÍNDIGO -->
        <template v-else-if="seccionActiva === 'indigo'">
          <div v-if="datosDetalleAgrupados.length > 0" class="flex-1 overflow-auto bg-white m-3 rounded-lg border border-slate-300" ref="modalTableRef">
            <table class="w-full text-[13px] text-slate-700 border-separate border-spacing-0">
              <thead class="sticky top-0 z-10">
                <tr class="text-slate-600 text-[11px] bg-slate-50">
                  <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Partida</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Fecha<br>Inicio</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Hora<br>Inicio</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Fecha<br>Final</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Hora<br>Final</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Turno</th>
                  <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Base</th>
                  <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Color</th>
                  <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Metros</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Veloc.</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">S</th>
                  <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">R10³</th>
                  <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Roturas</th>
                  <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">CV</th>
                  <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Operador</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(item, index) in datosDetalleAgrupados" 
                  :key="index" 
                  class="border-b border-slate-200 hover:bg-slate-50/80 transition-colors"
                >
                  <td class="px-3 py-2.5 font-semibold text-slate-800">{{ item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : '' }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-500 text-xs">{{ item.DT_INICIO }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-600 tabular-nums">{{ item.HORA_INICIO }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-500 text-xs">{{ item.DT_FINAL }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-600 tabular-nums">{{ item.HORA_FINAL }}</td>
                  <td class="px-3 py-2.5 text-center font-semibold text-blue-600">{{ item.TURNO }}</td>
                  <td class="px-3 py-2.5 text-slate-700">{{ item.ARTIGO ? item.ARTIGO.substring(0, 10) : '' }}</td>
                  <td class="px-3 py-2.5 text-slate-600">{{ item.COR }}</td>
                  <td class="px-3 py-2.5 text-right font-medium text-slate-700 tabular-nums">{{ formatNumber(item.METRAGEM, 0) }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-600 tabular-nums">{{ formatNumberModal(item.VELOC) }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-600">{{ item.S }}</td>
                  <td class="px-3 py-2.5 text-right text-purple-600 tabular-nums">{{ calcularR103(item.RUPTURAS, item.METRAGEM) }}</td>
                  <td class="px-3 py-2.5 text-right text-red-600 tabular-nums">{{ item.RUPTURAS }}</td>
                  <td class="px-3 py-2.5 text-center text-slate-600 tabular-nums">{{ formatNumberModal(item.CAVALOS) }}</td>
                  <td class="px-3 py-2.5 text-slate-600">{{ item.NM_OPERADOR }}</td>
                </tr>
              </tbody>
              <tfoot class="sticky bottom-0 z-10 bg-slate-100">
                <tr class="font-semibold text-slate-700">
                  <td class="px-3 py-3 border-t-2 border-t-slate-300">TOTAL</td>
                  <td class="px-3 py-3 border-t-2 border-t-slate-300" colspan="7"></td>
                  <td class="px-3 py-3 text-right tabular-nums border-t-2 border-t-slate-300">{{ formatNumber(totalesDetalle.metros, 0) }}</td>
                  <td class="px-3 py-3 border-t-2 border-t-slate-300"></td>
                  <td class="px-3 py-3 border-t-2 border-t-slate-300"></td>
                  <td class="px-3 py-3 text-right text-purple-700 tabular-nums border-t-2 border-t-slate-300">{{ calcularR103(totalesDetalle.roturas, totalesDetalle.metros) }}</td>
                  <td class="px-3 py-3 text-right text-red-700 tabular-nums border-t-2 border-t-slate-300">{{ totalesDetalle.roturas }}</td>
                  <td class="px-3 py-3 text-center tabular-nums border-t-2 border-t-slate-300">{{ formatNumberModal(totalesDetalle.cv) }}</td>
                  <td class="px-3 py-3 border-t-2 border-t-slate-300"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <!-- Sin datos ÍNDIGO -->
          <div v-else class="flex-1 flex items-center justify-center py-20 text-slate-500">
            <div class="text-center">
              <svg class="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <p class="font-medium">No se encontraron detalles ÍNDIGO</p>
              <p class="text-sm text-slate-400">Rolada {{ roladaSeleccionada }}</p>
            </div>
          </div>
        </template>
        
        <!-- SECCIÓN TEJEDURÍA -->
        <template v-else-if="seccionActiva === 'tecelagem'">
          <!-- VISTA RESUMEN (lista de partidas) -->
          <template v-if="!vistaDetallePartida">
            <div v-if="datosTecelagem.length > 0" class="flex-1 overflow-auto bg-white m-3 rounded-lg border border-slate-300" ref="modalTableTecelagemRef">
              <table class="w-full text-[13px] text-slate-700 border-separate border-spacing-0">
                <thead class="sticky top-0 z-10">
                  <tr class="text-slate-600 text-[11px] bg-purple-50">
                    <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Partida</th>
                    <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Fecha<br>Inicial</th>
                    <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Fecha<br>Final</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Metros</th>
                    <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Telar</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Eficiencia<br>%</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Roturas<br>TRA 10⁵</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Roturas<br>URD 10⁵</th>
                    <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Artículo</th>
                    <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Color</th>
                    <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Nombre</th>
                    <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Trama</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Pasadas</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">RPM</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(item, index) in datosTecelagem" 
                    :key="index" 
                    class="border-b border-slate-200 hover:bg-purple-50/50 transition-colors cursor-pointer"
                    @click="abrirDetallePartida(item)"
                  >
                    <td class="px-3 py-2.5 font-semibold text-slate-800">{{ item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : '' }}</td>
                    <td class="px-3 py-2.5 text-center text-slate-500 text-xs">{{ formatFechaTecelagem(item.FECHA_INICIAL) }}</td>
                    <td class="px-3 py-2.5 text-center text-slate-500 text-xs">{{ formatFechaTecelagem(item.FECHA_FINAL) }}</td>
                    <td class="px-3 py-2.5 text-right font-medium text-slate-700 tabular-nums">{{ formatNumber(item.METRAGEM, 2) }}</td>
                    <td class="px-3 py-2.5 text-center font-semibold text-purple-600">{{ item.MAQUINA ? parseInt(item.MAQUINA.slice(-3)) : '' }}</td>
                    <td class="px-3 py-2.5 text-right text-green-600 tabular-nums">{{ formatNumberModal(item.EFICIENCIA) }}</td>
                    <td class="px-3 py-2.5 text-right text-orange-600 tabular-nums">{{ formatNumberModal(item.ROTURAS_TRA_105) }}</td>
                    <td class="px-3 py-2.5 text-right text-red-600 tabular-nums">{{ formatNumberModal(item.ROTURAS_URD_105) }}</td>
                    <td class="px-3 py-2.5 text-slate-700">{{ item.ARTIGO }}</td>
                    <td class="px-3 py-2.5 text-center text-slate-600">{{ item.COR }}</td>
                    <td class="px-3 py-2.5 text-slate-600">{{ item.NM_MERCADO }}</td>
                    <td class="px-3 py-2.5 text-slate-600">{{ item.TRAMA }}</td>
                    <td class="px-3 py-2.5 text-right text-slate-600 tabular-nums">{{ formatNumberModal(item.PASADAS) }}</td>
                    <td class="px-3 py-2.5 text-right text-slate-700 tabular-nums">{{ formatNumber(item.RPM, 0) }}</td>
                  </tr>
                </tbody>
                <tfoot class="sticky bottom-0 z-10 bg-purple-100">
                  <tr class="font-semibold text-slate-700">
                    <td class="px-3 py-3 border-t-2 border-t-slate-300" colspan="3">TOTAL</td>
                    <td class="px-3 py-3 text-right tabular-nums border-t-2 border-t-slate-300">{{ formatNumber(totalesTecelagem.metros, 2) }}</td>
                    <td class="px-3 py-3 border-t-2 border-t-slate-300"></td>
                    <td class="px-3 py-3 text-right text-green-700 tabular-nums border-t-2 border-t-slate-300">{{ formatNumberModal(totalesTecelagem.eficiencia) }}</td>
                    <td class="px-3 py-3 text-right text-orange-700 tabular-nums border-t-2 border-t-slate-300">{{ formatNumberModal(totalesTecelagem.roturasTra) }}</td>
                    <td class="px-3 py-3 text-right text-red-700 tabular-nums border-t-2 border-t-slate-300">{{ formatNumberModal(totalesTecelagem.roturasUrd) }}</td>
                    <td class="px-3 py-3 border-t-2 border-t-slate-300" colspan="4"></td>
                    <td class="px-3 py-3 text-right tabular-nums border-t-2 border-t-slate-300">{{ formatNumberModal(totalesTecelagem.pasadas) }}</td>
                    <td class="px-3 py-3 text-right tabular-nums border-t-2 border-t-slate-300">{{ formatNumber(totalesTecelagem.rpm, 0) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <!-- Sin datos TEJEDURÍA -->
            <div v-else class="flex-1 flex items-center justify-center py-20 text-slate-500">
              <div class="text-center">
                <svg class="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <p class="font-medium">No se encontraron detalles TEJEDURÍA</p>
                <p class="text-sm text-slate-400">Rolada {{ roladaSeleccionada }}</p>
              </div>
            </div>
          </template>

          <!-- VISTA DETALLE DE PARTIDA -->
          <template v-else>
            <!-- Header con info de la partida -->
            <div class="bg-purple-50 border-b border-purple-200 px-4 py-3 m-3 mb-0 rounded-t-lg">
              <div class="flex items-center gap-4">
                <button 
                  @click="volverAResumen"
                  class="flex items-center gap-1 text-purple-700 hover:text-purple-900 font-medium transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                  Volver
                </button>
                <div class="h-6 w-px bg-purple-300"></div>
                <div class="flex-1 grid grid-cols-6 gap-4 text-sm">
                  <div>
                    <span class="text-purple-600 font-medium">Artículo:</span>
                    <span class="ml-1 font-bold text-slate-800">{{ partidaSeleccionada?.ARTIGO }}</span>
                  </div>
                  <div>
                    <span class="text-purple-600 font-medium">Nombre:</span>
                    <span class="ml-1 font-bold text-slate-800">{{ partidaSeleccionada?.NM_MERCADO }}</span>
                  </div>
                  <div>
                    <span class="text-purple-600 font-medium">Trama:</span>
                    <span class="ml-1 text-slate-700">{{ partidaSeleccionada?.TRAMA }}</span>
                  </div>
                  <div>
                    <span class="text-purple-600 font-medium">Telar:</span>
                    <span class="ml-1 font-bold text-purple-700">{{ partidaSeleccionada?.MAQUINA ? parseInt(partidaSeleccionada.MAQUINA.slice(-3)) : '' }}</span>
                  </div>
                  <div>
                    <span class="text-purple-600 font-medium">Pasadas:</span>
                    <span class="ml-1 text-slate-700">{{ formatNumberModal(partidaSeleccionada?.PASADAS) }}</span>
                  </div>
                  <div>
                    <span class="text-purple-600 font-medium">Base:</span>
                    <span class="ml-1 text-slate-700">{{ datosDetallePartida[0]?.BASE_URDUME || '' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cargando detalle -->
            <div v-if="cargandoDetallePartida" class="flex-1 flex items-center justify-center">
              <div class="text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                <p class="text-slate-500">Cargando detalle...</p>
              </div>
            </div>

            <!-- Tabla de detalle -->
            <div v-else-if="datosDetallePartida.length > 0" class="overflow-auto bg-white mx-3 mb-3 rounded-b-lg border border-t-0 border-slate-300" style="flex: 0 1 auto; max-height: calc(100vh - 200px);">
              <table class="w-full text-[13px] text-slate-700 border-separate border-spacing-0">
                <thead class="sticky top-0 z-10">
                  <tr class="text-slate-600 text-[11px] bg-purple-50">
                    <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Fecha</th>
                    <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Tur</th>
                    <th class="px-3 py-2 font-medium text-left border-b-2 border-b-slate-300">Partida</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Metros<br>Crudos</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Metros<br>Termin.</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Metros<br>Acumul.</th>
                    <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Paradas<br>Trama</th>
                    <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Paradas<br>Urdimbre</th>
                    <th class="px-3 py-2 font-medium text-center border-b-2 border-b-slate-300">Total<br>Paradas</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Eficiencia<br>%</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Roturas<br>TRAMA 10⁵</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">Roturas<br>URDIDO 10⁵</th>
                    <th class="px-3 py-2 font-medium text-right border-b-2 border-b-slate-300">RPM</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(item, index) in datosDetallePartida" 
                    :key="index" 
                    class="border-b border-slate-200 hover:bg-purple-50/50 transition-colors"
                  >
                    <td class="px-3 py-2.5 text-center text-slate-600">{{ formatFechaDetalle(item.DT_BASE_PRODUCAO) }}</td>
                    <td class="px-3 py-2.5 text-center font-semibold text-slate-800">{{ item.TURNO }}</td>
                    <td class="px-3 py-2.5 font-semibold text-slate-800">{{ item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : '' }}</td>
                    <td class="px-3 py-2.5 text-right text-slate-700 tabular-nums">{{ formatNumber(item.METRAGEM, 0) }}</td>
                    <td class="px-3 py-2.5 text-right text-slate-700 tabular-nums">{{ formatNumber(item.METRAGEM, 0) }}</td>
                    <td class="px-3 py-2.5 text-right font-medium text-slate-700 tabular-nums">{{ formatNumber(calcularMetrosAcumulados(index), 0) }}</td>
                    <td class="px-3 py-2.5 text-center text-slate-600 tabular-nums">{{ item.PARADA_TRAMA }}</td>
                    <td class="px-3 py-2.5 text-center text-slate-600 tabular-nums">{{ item.PARADA_URDUME }}</td>
                    <td class="px-3 py-2.5 text-center font-medium text-slate-700 tabular-nums">{{ (item.PARADA_TRAMA || 0) + (item.PARADA_URDUME || 0) }}</td>
                    <td class="px-3 py-2.5 text-right text-green-600 tabular-nums">{{ formatNumberModal(item.EFICIENCIA) }}</td>
                    <td class="px-3 py-2.5 text-right text-orange-600 tabular-nums">{{ formatNumberModal(item.ROTURAS_TRA_105) }}</td>
                    <td class="px-3 py-2.5 text-right text-red-600 tabular-nums">{{ formatNumberModal(item.ROTURAS_URD_105) }}</td>
                    <td class="px-3 py-2.5 text-right text-slate-700 tabular-nums">{{ formatNumber(item.RPM, 0) }}</td>
                  </tr>
                </tbody>
                <tfoot class="sticky bottom-0 z-10 bg-purple-100">
                  <tr class="font-semibold text-slate-700">
                    <td class="px-3 py-3 border-t-2 border-t-slate-300" colspan="3">TOTAL</td>
                    <td class="px-3 py-3 text-right tabular-nums border-t-2 border-t-slate-300">{{ formatNumber(totalesDetallePartida.metros, 0) }}</td>
                    <td class="px-3 py-3 border-t-2 border-t-slate-300"></td>
                    <td class="px-3 py-3 border-t-2 border-t-slate-300"></td>
                    <td class="px-3 py-3 text-center tabular-nums border-t-2 border-t-slate-300">{{ totalesDetallePartida.paradasTrama }}</td>
                    <td class="px-3 py-3 text-center tabular-nums border-t-2 border-t-slate-300">{{ totalesDetallePartida.paradasUrdumbre }}</td>
                    <td class="px-3 py-3 text-center tabular-nums border-t-2 border-t-slate-300">{{ totalesDetallePartida.totalParadas }}</td>
                    <td class="px-3 py-3 text-right text-green-700 tabular-nums border-t-2 border-t-slate-300">{{ formatNumberModal(totalesDetallePartida.eficiencia) }}</td>
                    <td class="px-3 py-3 text-right text-orange-700 tabular-nums border-t-2 border-t-slate-300">{{ formatNumberModal(totalesDetallePartida.roturasTra) }}</td>
                    <td class="px-3 py-3 text-right text-red-700 tabular-nums border-t-2 border-t-slate-300">{{ formatNumberModal(totalesDetallePartida.roturasUrd) }}</td>
                    <td class="px-3 py-3 text-right tabular-nums border-t-2 border-t-slate-300">{{ formatNumber(totalesDetallePartida.rpm, 0) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Sin datos detalle -->
            <div v-else class="flex-1 flex items-center justify-center py-20 text-slate-500">
              <div class="text-center">
                <svg class="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <p class="font-medium">No se encontraron detalles para esta partida</p>
              </div>
            </div>
          </template>
        </template>

        <!-- SECCIÓN CALIDAD -->
        <template v-else-if="seccionActiva === 'calidad'">
          <div v-if="datosCalidad.length > 0" class="flex-1 overflow-auto bg-white m-3 rounded-lg border border-slate-300" ref="modalTableCalidadRef">
            <table class="w-full text-[12px] text-slate-700 border-separate border-spacing-0">
              <thead class="sticky top-0 z-10">
                <tr class="text-slate-600 text-[10px] bg-teal-50">
                  <th class="px-2 py-2 font-medium text-left border-b-2 border-b-slate-300" rowspan="2">Partida</th>
                  <th class="px-2 py-2 font-medium text-center border-b-2 border-b-slate-300" rowspan="2">S</th>
                  <th class="px-2 py-2 font-medium text-center border-b-2 border-b-slate-300" rowspan="2">R</th>
                  <th class="px-2 py-2 font-medium text-center border-b-2 border-b-slate-300" rowspan="2">Telar</th>
                  <th class="px-2 py-1 font-medium text-center border-b border-b-slate-200 bg-teal-100" colspan="7">Metros</th>
                  <th class="px-2 py-1 font-medium text-center border-b border-b-slate-200 bg-teal-100" colspan="6">Porcentaje</th>
                  <th class="px-2 py-2 font-medium text-left border-b-2 border-b-slate-300" rowspan="2">Artículo</th>
                  <th class="px-2 py-2 font-medium text-center border-b-2 border-b-slate-300" rowspan="2">Color</th>
                  <th class="px-2 py-2 font-medium text-left border-b-2 border-b-slate-300" rowspan="2">Nombre</th>
                  <th class="px-2 py-2 font-medium text-left border-b-2 border-b-slate-300" rowspan="2">Trama</th>
                </tr>
                <tr class="text-slate-600 text-[9px] bg-teal-50">
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">Total</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">1era</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">2da</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">2da<br>HIL</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">2da<br>IND</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">2da<br>TEJ</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">2da<br>ACA</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">1era</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">2da</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">2da<br>HIL</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">2da<br>IND</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">2da<br>TEJ</th>
                  <th class="px-1 py-1 font-medium text-right border-b-2 border-b-slate-300">2da<br>ACA</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(item, index) in datosCalidadAgrupados" 
                  :key="index" 
                  class="border-b border-slate-200 hover:bg-teal-50/50 transition-colors"
                >
                  <td class="px-2 py-2 font-semibold text-slate-800">{{ item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : '' }}</td>
                  <td class="px-2 py-2 text-center font-medium" :class="item.ST_IND === '1' ? 'text-green-600' : 'text-amber-600'">{{ item.ST_IND === '1' ? 'P' : 'N' }}</td>
                  <td class="px-2 py-2 text-center text-slate-600">{{ item.REPROCESSO ? item.REPROCESSO.charAt(0) : '' }}</td>
                  <td class="px-2 py-2 text-center font-semibold text-teal-600">{{ item.TEAR }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-700">{{ formatNumber(item.METRAGEM_TOTAL, 0) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-700">{{ formatNumber(item.METROS_1ERA, 0) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-700">{{ item.METROS_2DA > 0 ? formatNumber(item.METROS_2DA, 0) : '' }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ item.METROS_2DA_HIL > 0 ? formatNumber(item.METROS_2DA_HIL, 0) : '' }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ item.METROS_2DA_IND > 0 ? formatNumber(item.METROS_2DA_IND, 0) : '' }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ item.METROS_2DA_TE > 0 ? formatNumber(item.METROS_2DA_TE, 0) : '' }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ item.METROS_2DA_TEF > 0 ? formatNumber(item.METROS_2DA_TEF, 0) : '' }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-green-600">{{ formatNumberModal(calcularPorcentaje(item.METROS_1ERA, item.METRAGEM_TOTAL)) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-amber-600">{{ item.METROS_2DA > 0 ? formatNumberModal(calcularPorcentaje(item.METROS_2DA, item.METRAGEM_TOTAL)) : '' }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-500">{{ item.METROS_2DA_HIL > 0 ? formatNumberModal(calcularPorcentaje(item.METROS_2DA_HIL, item.METRAGEM_TOTAL)) : '' }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-500">{{ item.METROS_2DA_IND > 0 ? formatNumberModal(calcularPorcentaje(item.METROS_2DA_IND, item.METRAGEM_TOTAL)) : '' }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-500">{{ item.METROS_2DA_TE > 0 ? formatNumberModal(calcularPorcentaje(item.METROS_2DA_TE, item.METRAGEM_TOTAL)) : '' }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-500">{{ item.METROS_2DA_TEF > 0 ? formatNumberModal(calcularPorcentaje(item.METROS_2DA_TEF, item.METRAGEM_TOTAL)) : '' }}</td>
                  <td class="px-2 py-2 text-slate-700">{{ item.ARTIGO }}</td>
                  <td class="px-2 py-2 text-center text-slate-600">{{ item.COR }}</td>
                  <td class="px-2 py-2 text-slate-600">{{ item.NM_MERCADO }}</td>
                  <td class="px-2 py-2 text-slate-600">{{ item.TRAMA }}</td>
                </tr>
              </tbody>
              <tfoot class="sticky bottom-0 z-10 bg-teal-100">
                <tr class="font-semibold text-slate-700">
                  <td class="px-2 py-3 border-t-2 border-t-slate-300" colspan="4">TOTAL</td>
                  <td class="px-2 py-3 text-right tabular-nums border-t-2 border-t-slate-300">{{ formatNumber(totalesCalidad.metrosTotal, 0) }}</td>
                  <td class="px-2 py-3 border-t-2 border-t-slate-300" colspan="6"></td>
                  <td class="px-2 py-3 text-right text-green-700 tabular-nums border-t-2 border-t-slate-300">{{ formatNumberModal(totalesCalidad.porcPrimera) }}</td>
                  <td class="px-2 py-3 text-right text-amber-700 tabular-nums border-t-2 border-t-slate-300">{{ formatNumberModal(totalesCalidad.porcSegunda) }}</td>
                  <td class="px-2 py-3 border-t-2 border-t-slate-300" colspan="8"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <!-- Sin datos CALIDAD -->
          <div v-else class="flex-1 flex items-center justify-center py-20 text-slate-500">
            <div class="text-center">
              <svg class="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <p class="font-medium">No se encontraron datos de CALIDAD</p>
              <p class="text-sm text-slate-400">Rolada {{ roladaSeleccionada }}</p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import * as ExcelJS from 'exceljs'
import html2canvas from 'html2canvas'
import Swal from 'sweetalert2'
import CustomDatepicker from './CustomDatepicker.vue'

const API_BASE_URL = 'http://localhost:3002';

// Estado
const cargando = ref(false)
const copiando = ref(false)
const copiandoModal = ref(false)
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
const seccionActiva = ref('indigo') // 'urdimbre', 'indigo', 'tecelagem' o 'calidad'
const datosTecelagem = ref([])
const cargandoTecelagem = ref(false)
const datosCalidad = ref([])
const cargandoCalidad = ref(false)
const datosUrdimbre = ref([])
const cargandoUrdimbre = ref(false)

// Estado para vista detalle partida
const vistaDetallePartida = ref(false)
const partidaSeleccionada = ref(null)
const datosDetallePartida = ref([])
const cargandoDetallePartida = ref(false)

// Refs
const mainContentRef = ref(null)
const modalTableRef = ref(null)
const modalTableTecelagemRef = ref(null)
const modalTableCalidadRef = ref(null)
const modalTableUrdimbreRef = ref(null)
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

// Formatear fecha para TEJEDURÍA: "dd/mm/yy hh:mm"
const formatFechaTecelagem = (fechaHora) => {
  if (!fechaHora) return '';
  try {
    // Formato esperado: "DD/MM/YYYY HH:MM:SS" o "YYYY-MM-DD HH:MM:SS"
    const partes = fechaHora.trim().split(' ');
    if (partes.length < 2) return fechaHora;
    
    const fecha = partes[0];
    const hora = partes[1];
    
    let dia, mes, anio;
    
    // Detectar formato de fecha
    if (fecha.includes('/')) {
      // Formato DD/MM/YYYY
      const fechaPartes = fecha.split('/');
      dia = fechaPartes[0];
      mes = fechaPartes[1];
      anio = fechaPartes[2];
    } else if (fecha.includes('-')) {
      // Formato YYYY-MM-DD
      const fechaPartes = fecha.split('-');
      anio = fechaPartes[0];
      mes = fechaPartes[1];
      dia = fechaPartes[2];
    } else {
      return fechaHora;
    }
    
    // Obtener últimos 2 dígitos del año
    const anioCorto = anio.slice(-2);
    
    // Obtener hora y minutos (formato HH:MM)
    const horaPartes = hora.split(':');
    const hh = horaPartes[0];
    const mm = horaPartes[1];
    
    return `${dia}/${mes}/${anioCorto} ${hh}:${mm}`;
  } catch (error) {
    return fechaHora;
  }
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

// Totales del detalle ÍNDIGO
const totalesDetalle = computed(() => {
  return datosDetalleAgrupados.value.reduce((acc, item) => {
    acc.metros += parseFloat(item.METRAGEM) || 0;
    acc.roturas += parseInt(item.RUPTURAS) || 0;
    acc.cv += parseFloat(item.CAVALOS) || 0;
    return acc;
  }, { metros: 0, roturas: 0, cv: 0 });
});

// Totales del detalle URDIMBRE
const totalesUrdimbre = computed(() => {
  return datosUrdimbre.value.reduce((acc, item) => {
    acc.metros += parseFloat(item.METRAGEM) || 0;
    return acc;
  }, { metros: 0 });
});

// Totales del detalle TECELAGEM
const totalesTecelagem = computed(() => {
  let totalMetros = 0;
  let sumEficienciaPonderada = 0;
  let sumRotTraPonderada = 0;
  let sumRotUrdPonderada = 0;
  let sumRpmPonderada = 0;
  let sumPasadas = 0;
  let count = 0;
  
  datosTecelagem.value.forEach(item => {
    const metros = parseFloat(item.METRAGEM) || 0;
    totalMetros += metros;
    sumEficienciaPonderada += (parseFloat(item.EFICIENCIA) || 0) * metros;
    sumRotTraPonderada += (parseFloat(item.ROTURAS_TRA_105) || 0) * metros;
    sumRotUrdPonderada += (parseFloat(item.ROTURAS_URD_105) || 0) * metros;
    sumRpmPonderada += (parseFloat(item.RPM) || 0) * metros;
    sumPasadas += parseFloat(item.PASADAS) || 0;
    count++;
  });
  
  return {
    metros: totalMetros,
    eficiencia: totalMetros > 0 ? sumEficienciaPonderada / totalMetros : 0,
    roturasTra: totalMetros > 0 ? sumRotTraPonderada / totalMetros : 0,
    roturasUrd: totalMetros > 0 ? sumRotUrdPonderada / totalMetros : 0,
    rpm: totalMetros > 0 ? sumRpmPonderada / totalMetros : 0,
    pasadas: count > 0 ? sumPasadas / count : 0
  };
});

// Totales para la vista de detalle de partida
const totalesDetallePartida = computed(() => {
  let totalMetros = 0;
  let totalMetrosAcum = 0;
  let totalParadasTrama = 0;
  let totalParadasUrdumbre = 0;
  let sumEficienciaPonderada = 0;
  let sumRotTraPonderada = 0;
  let sumRotUrdPonderada = 0;
  let sumRpmPonderada = 0;
  let sumPasadas = 0;
  let count = 0;
  
  datosDetallePartida.value.forEach(item => {
    const metros = parseFloat(item.METRAGEM) || 0;
    totalMetros += metros;
    totalParadasTrama += parseInt(item.PARADA_TRAMA) || 0;
    totalParadasUrdumbre += parseInt(item.PARADA_URDUME) || 0;
    sumEficienciaPonderada += (parseFloat(item.EFICIENCIA) || 0) * metros;
    sumRotTraPonderada += (parseFloat(item.ROTURAS_TRA_105) || 0) * metros;
    sumRotUrdPonderada += (parseFloat(item.ROTURAS_URD_105) || 0) * metros;
    sumRpmPonderada += (parseFloat(item.RPM) || 0) * metros;
    sumPasadas += parseFloat(item.BATIDAS) || 0;
    count++;
  });
  
  return {
    metros: totalMetros,
    paradasTrama: totalParadasTrama,
    paradasUrdumbre: totalParadasUrdumbre,
    totalParadas: totalParadasTrama + totalParadasUrdumbre,
    eficiencia: totalMetros > 0 ? sumEficienciaPonderada / totalMetros : 0,
    roturasTra: totalMetros > 0 ? sumRotTraPonderada / totalMetros : 0,
    roturasUrd: totalMetros > 0 ? sumRotUrdPonderada / totalMetros : 0,
    rpm: totalMetros > 0 ? sumRpmPonderada / totalMetros : 0,
    pasadas: count > 0 ? sumPasadas / count : 0
  };
});

// Agrupar datos de calidad por partida
const datosCalidadAgrupados = computed(() => {
  const grupos = {};
  datosCalidad.value.forEach(item => {
    const key = item.PARTIDA;
    if (!grupos[key]) {
      grupos[key] = {
        PARTIDA: item.PARTIDA,
        ST_IND: item.ST_IND,
        REPROCESSO: item.REPROCESSO,
        TEAR: item.TEAR,
        METRAGEM_TOTAL: 0,
        METROS_1ERA: 0,
        METROS_2DA: 0,
        METROS_2DA_HIL: 0,
        METROS_2DA_IND: 0,
        METROS_2DA_TE: 0,
        METROS_2DA_TEF: 0,
        ARTIGO: item.ARTIGO,
        COR: item.COR,
        NM_MERCADO: item.NM_MERCADO,
        TRAMA: item.TRAMA
      };
    }
    grupos[key].METRAGEM_TOTAL += parseFloat(item.METRAGEM_TOTAL) || 0;
    grupos[key].METROS_1ERA += parseFloat(item.METROS_1ERA) || 0;
    grupos[key].METROS_2DA += parseFloat(item.METROS_2DA) || 0;
    grupos[key].METROS_2DA_HIL += parseFloat(item.METROS_2DA_HIL) || 0;
    grupos[key].METROS_2DA_IND += parseFloat(item.METROS_2DA_IND) || 0;
    grupos[key].METROS_2DA_TE += parseFloat(item.METROS_2DA_TE) || 0;
    grupos[key].METROS_2DA_TEF += parseFloat(item.METROS_2DA_TEF) || 0;
  });
  return Object.values(grupos).sort((a, b) => a.PARTIDA.localeCompare(b.PARTIDA));
});

// Totales para calidad
const totalesCalidad = computed(() => {
  let metrosTotal = 0;
  let metros1era = 0;
  let metros2da = 0;
  
  datosCalidadAgrupados.value.forEach(item => {
    metrosTotal += item.METRAGEM_TOTAL || 0;
    metros1era += item.METROS_1ERA || 0;
    metros2da += item.METROS_2DA || 0;
  });
  
  return {
    metrosTotal,
    porcPrimera: metrosTotal > 0 ? (metros1era / metrosTotal) * 100 : 0,
    porcSegunda: metrosTotal > 0 ? (metros2da / metrosTotal) * 100 : 0
  };
});

// Calcular porcentaje
const calcularPorcentaje = (parte, total) => {
  if (!total || total === 0) return 0;
  return (parte / total) * 100;
};

// Abrir vista de detalle de partida
const abrirDetallePartida = async (partida) => {
  partidaSeleccionada.value = partida;
  cargandoDetallePartida.value = true;
  datosDetallePartida.value = [];
  
  try {
    const cor = partida.COR || '';
    const response = await fetch(`${API_BASE_URL}/api/consulta-partida-tecelagem?partida=${encodeURIComponent(partida.PARTIDA)}&cor=${encodeURIComponent(cor)}`);
    if (!response.ok) throw new Error('Error al cargar detalle de partida');
    datosDetallePartida.value = await response.json();
    vistaDetallePartida.value = true;
  } catch (error) {
    console.error('Error cargando detalle de partida:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo cargar el detalle de la partida'
    });
  } finally {
    cargandoDetallePartida.value = false;
  }
};

// Volver a la vista de resumen
const volverAResumen = () => {
  vistaDetallePartida.value = false;
  partidaSeleccionada.value = null;
  datosDetallePartida.value = [];
};

// Formatear fecha para detalle partida (DD/MM/YYYY -> dd/mm/yy)
const formatFechaDetalle = (fecha) => {
  if (!fecha) return '';
  // Formato esperado: DD/MM/YYYY
  const partes = fecha.split('/');
  if (partes.length === 3) {
    const dia = partes[0];
    const mes = partes[1];
    const anio = partes[2].slice(-2);
    return `${dia}/${mes}/${anio}`;
  }
  return fecha;
};

// Calcular metros acumulados hasta el índice dado
const calcularMetrosAcumulados = (indice) => {
  let acumulado = 0;
  for (let i = 0; i <= indice; i++) {
    acumulado += parseFloat(datosDetallePartida.value[i]?.METRAGEM) || 0;
  }
  return acumulado;
};

// Abrir modal con detalle de la rolada
const abrirModalDetalle = async (rolada, index) => {
  roladaSeleccionada.value = rolada;
  indiceRoladaActual.value = index;
  modalVisible.value = true;
  seccionActiva.value = 'indigo';
  await cargarDetalleRolada(rolada);
};

// Cargar detalle de una rolada (ÍNDIGO)
const cargarDetalleRolada = async (rolada) => {
  cargandoDetalle.value = true;
  datosDetalle.value = [];
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/consulta-rolada-indigo?rolada=${rolada}`);
    if (!response.ok) throw new Error('Error al cargar detalle');
    datosDetalle.value = await response.json();
  } catch (error) {
    console.error('Error cargando detalle ÍNDIGO:', error);
  } finally {
    cargandoDetalle.value = false;
  }
};

// Cargar detalle de TECELAGEM
const cargarDetalleTecelagem = async (rolada) => {
  cargandoTecelagem.value = true;
  datosTecelagem.value = [];
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/consulta-rolada-tecelagem?rolada=${rolada}`);
    if (!response.ok) throw new Error('Error al cargar detalle tecelagem');
    datosTecelagem.value = await response.json();
  } catch (error) {
    console.error('Error cargando detalle TECELAGEM:', error);
  } finally {
    cargandoTecelagem.value = false;
  }
};

// Cargar detalle de una rolada (CALIDAD)
const cargarDetalleCalidad = async (rolada) => {
  cargandoCalidad.value = true;
  datosCalidad.value = [];
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/consulta-rolada-calidad?rolada=${rolada}`);
    if (!response.ok) throw new Error('Error al cargar detalle calidad');
    datosCalidad.value = await response.json();
  } catch (error) {
    console.error('Error cargando detalle CALIDAD:', error);
  } finally {
    cargandoCalidad.value = false;
  }
};

// Cargar detalle de URDIMBRE
const cargarDetalleUrdimbre = async (rolada) => {
  cargandoUrdimbre.value = true;
  datosUrdimbre.value = [];
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/consulta-rolada-urdimbre?rolada=${rolada}`);
    if (!response.ok) throw new Error('Error al cargar detalle urdimbre');
    datosUrdimbre.value = await response.json();
  } catch (error) {
    console.error('Error cargando detalle URDIMBRE:', error);
  } finally {
    cargandoUrdimbre.value = false;
  }
};

// Cambiar sección del modal
const cambiarSeccion = async (seccion) => {
  seccionActiva.value = seccion;
  // Resetear vista detalle partida al cambiar sección
  vistaDetallePartida.value = false;
  partidaSeleccionada.value = null;
  datosDetallePartida.value = [];
  
  if (seccion === 'urdimbre' && datosUrdimbre.value.length === 0) {
    await cargarDetalleUrdimbre(roladaSeleccionada.value);
  }
  if (seccion === 'tecelagem' && datosTecelagem.value.length === 0) {
    await cargarDetalleTecelagem(roladaSeleccionada.value);
  }
  if (seccion === 'calidad' && datosCalidad.value.length === 0) {
    await cargarDetalleCalidad(roladaSeleccionada.value);
  }
};

// Navegar entre secciones con << >>
const navegarSeccion = async (direccion) => {
  const nuevaSeccion = seccionActiva.value === 'indigo' ? 'tecelagem' : 'indigo';
  await cambiarSeccion(nuevaSeccion);
};

// Navegar entre roladas
const navegarRolada = async (direccion) => {
  const nuevoIndice = indiceRoladaActual.value + direccion;
  if (nuevoIndice >= 0 && nuevoIndice < datos.value.length) {
    indiceRoladaActual.value = nuevoIndice;
    roladaSeleccionada.value = datos.value[nuevoIndice].ROLADA;
    // Limpiar datos para recargar si cambia de rolada
    datosUrdimbre.value = [];
    datosTecelagem.value = [];
    datosCalidad.value = [];
    vistaDetallePartida.value = false;
    if (seccionActiva.value === 'urdimbre') {
      await cargarDetalleUrdimbre(roladaSeleccionada.value);
    } else if (seccionActiva.value === 'indigo') {
      await cargarDetalleRolada(roladaSeleccionada.value);
    } else if (seccionActiva.value === 'tecelagem') {
      await cargarDetalleTecelagem(roladaSeleccionada.value);
    } else {
      await cargarDetalleCalidad(roladaSeleccionada.value);
    }
  }
};

// Cerrar modal
const cerrarModal = () => {
  modalVisible.value = false;
  datosDetalle.value = [];
  datosTecelagem.value = [];
  datosCalidad.value = [];
  datosUrdimbre.value = [];
  seccionActiva.value = 'indigo';
  // Resetear vista de detalle partida
  vistaDetallePartida.value = false;
  partidaSeleccionada.value = null;
  datosDetallePartida.value = [];
};

// Copiar modal como imagen
const copiarModalComoImagen = async () => {
  // Validar datos según la sección activa
  if (seccionActiva.value === 'urdimbre') {
    if (!modalTableUrdimbreRef.value || datosUrdimbre.value.length === 0) return;
  } else if (seccionActiva.value === 'indigo') {
    if (!modalTableRef.value || datosDetalleAgrupados.value.length === 0) return;
  } else if (seccionActiva.value === 'tecelagem') {
    if (vistaDetallePartida.value) {
      if (datosDetallePartida.value.length === 0) return;
    } else {
      if (!modalTableTecelagemRef.value || datosTecelagem.value.length === 0) return;
    }
  } else {
    if (datosCalidad.value.length === 0) return;
  }
  
  copiandoModal.value = true;
  try {
    // Crear contenedor temporal para la captura
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = 'position: absolute; left: -9999px; top: 0; background: #ffffff; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
    document.body.appendChild(tempContainer);
    
    // Encabezado con logo
    const headerContainer = document.createElement('div');
    const borderColor = seccionActiva.value === 'urdimbre' ? '#d97706' : seccionActiva.value === 'indigo' ? '#1e40af' : '#9333ea';
    headerContainer.style.cssText = `display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid ${borderColor};`;
    
    // Logo
    const logo = document.createElement('img');
    logo.src = '/LogoSantana.jpg';
    logo.style.cssText = 'height: 40px; width: auto;';
    headerContainer.appendChild(logo);
    
    // Título
    const titulo = document.createElement('div');
    let seccionNombre = seccionActiva.value === 'urdimbre' ? 'URDIMBRE' : seccionActiva.value === 'indigo' ? 'ÍNDIGO' : 'TEJEDURÍA';
    let cantidadDatos = seccionActiva.value === 'urdimbre' ? datosUrdimbre.value.length : seccionActiva.value === 'indigo' ? datosDetalleAgrupados.value.length : datosTecelagem.value.length;
    let subtitulo = `${cantidadDatos} partidas`;
    
    // Si estamos en detalle de partida de Tejeduría
    if (seccionActiva.value === 'tecelagem' && vistaDetallePartida.value) {
      cantidadDatos = datosDetallePartida.value.length;
      const partida = partidaSeleccionada.value?.PARTIDA?.replace(/^0/, '') || '';
      subtitulo = `Partida ${partida} - ${cantidadDatos} turnos | Art: ${partidaSeleccionada.value?.ARTIGO || ''} | Telar: ${partidaSeleccionada.value?.MAQUINA ? parseInt(partidaSeleccionada.value.MAQUINA.slice(-3)) : ''}`;
    }
    
    titulo.innerHTML = `
      <div style="font-size: 16px; font-weight: 600; color: #1e293b;">Detalle ${seccionNombre} - Rolada ${roladaSeleccionada.value}</div>
      <div style="font-size: 12px; color: #64748b;">${subtitulo}</div>
    `;
    headerContainer.appendChild(titulo);
    tempContainer.appendChild(headerContainer);
    
    // Crear tabla manualmente con estilos inline
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; color: #334155; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;';
    
    // Thead
    const thead = document.createElement('thead');
    if (seccionActiva.value === 'urdimbre') {
      thead.innerHTML = `
        <tr style="background: #fffbeb; font-size: 11px; color: #475569;">
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Partida</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Fecha<br>Inicio</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Hora<br>Inicio</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Fecha<br>Final</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Hora<br>Final</th>
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Artículo</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Metros</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Vel.</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Puntas</th>
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Operador</th>
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Lote</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Maq.</th>
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Base</th>
        </tr>
      `;
    } else if (seccionActiva.value === 'indigo') {
      thead.innerHTML = `
        <tr style="background: #f8fafc; font-size: 11px; color: #475569;">
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Partida</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Fecha<br>Inicio</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Hora<br>Inicio</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Fecha<br>Final</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Hora<br>Final</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Turno</th>
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Base</th>
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Color</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Metros</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Veloc.</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">S</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">R10³</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Roturas</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">CV</th>
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Operador</th>
        </tr>
      `;
    } else if (seccionActiva.value === 'tecelagem' && vistaDetallePartida.value) {
      // Encabezados para detalle de partida de Tejeduría
      thead.innerHTML = `
        <tr style="background: #faf5ff; font-size: 11px; color: #475569;">
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Fecha</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Tur</th>
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Partida</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Metros<br>Crudos</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Metros<br>Termin.</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Metros<br>Acumul.</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Paradas<br>Trama</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Paradas<br>Urdimbre</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Total<br>Paradas</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Eficiencia<br>%</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Roturas<br>TRAMA 10⁵</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Roturas<br>URDIDO 10⁵</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">RPM</th>
        </tr>
      `;
    } else {
      thead.innerHTML = `
        <tr style="background: #faf5ff; font-size: 11px; color: #475569;">
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Partida</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Fecha<br>Inicial</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Fecha<br>Final</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Metros</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Telar</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Eficiencia<br>%</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Roturas<br>TRA 10⁵</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Roturas<br>URD 10⁵</th>
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Artículo</th>
          <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Color</th>
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Nombre</th>
          <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Trama</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">Pasadas</th>
          <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 500;">RPM</th>
        </tr>
      `;
    }
    table.appendChild(thead);
    
    // Tbody
    const tbody = document.createElement('tbody');
    if (seccionActiva.value === 'urdimbre') {
      datosUrdimbre.value.forEach((item) => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom: 1px solid #e2e8f0;';
        tr.innerHTML = `
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #64748b; font-size: 11px;">${item.DT_INICIO || ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${item.HORA_INICIO || ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #64748b; font-size: 11px;">${item.DT_FINAL || ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${item.HORA_FINAL || ''}</td>
          <td style="padding: 10px 12px; color: #334155;">${item.ARTIGO || ''}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 500; color: #334155;">${formatNumber(item.METRAGEM, 0)}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${formatNumberModal(item.VELOC)}</td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #d97706;">${item.NUM_FIOS || ''}</td>
          <td style="padding: 10px 12px; color: #475569;">${item.NM_OPERADOR || ''}</td>
          <td style="padding: 10px 12px; color: #475569;">${item.LOTE_FIACAO || ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${item.MAQ_FIACAO || ''}</td>
          <td style="padding: 10px 12px; color: #334155;">${item.BASE_URDUME || ''}</td>
        `;
        tbody.appendChild(tr);
      });
    } else if (seccionActiva.value === 'indigo') {
      datosDetalleAgrupados.value.forEach((item) => {
        const r103 = (item.RUPTURAS && item.METRAGEM) ? ((item.RUPTURAS * 1000) / item.METRAGEM).toFixed(1) : '';
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom: 1px solid #e2e8f0;';
        tr.innerHTML = `
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #64748b; font-size: 11px;">${item.DT_INICIO || ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${item.HORA_INICIO || ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #64748b; font-size: 11px;">${item.DT_FINAL || ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${item.HORA_FINAL || ''}</td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #2563eb;">${item.TURNO || ''}</td>
          <td style="padding: 10px 12px; color: #334155;">${item.ARTIGO ? item.ARTIGO.substring(0, 10) : ''}</td>
          <td style="padding: 10px 12px; color: #475569;">${item.COR || ''}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 500; color: #334155;">${formatNumber(item.METRAGEM, 0)}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${formatNumberModal(item.VELOC)}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${item.S || ''}</td>
          <td style="padding: 10px 12px; text-align: right; color: #9333ea;">${r103}</td>
          <td style="padding: 10px 12px; text-align: right; color: #dc2626;">${item.RUPTURAS || ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${formatNumberModal(item.CAVALOS)}</td>
          <td style="padding: 10px 12px; color: #475569;">${item.NM_OPERADOR || ''}</td>
        `;
        tbody.appendChild(tr);
      });
    } else if (seccionActiva.value === 'tecelagem' && vistaDetallePartida.value) {
      // Detalle de partida de Tejeduría
      let metrosAcum = 0;
      datosDetallePartida.value.forEach((item) => {
        metrosAcum += parseFloat(item.METRAGEM) || 0;
        const totalParadas = (parseInt(item.PARADA_TRAMA) || 0) + (parseInt(item.PARADA_URDUME) || 0);
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom: 1px solid #e2e8f0;';
        tr.innerHTML = `
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${formatFechaDetalle(item.DT_BASE_PRODUCAO)}</td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #1e293b;">${item.TURNO || ''}</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : ''}</td>
          <td style="padding: 10px 12px; text-align: right; color: #334155;">${formatNumber(item.METRAGEM, 0)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #334155;">${formatNumber(item.METRAGEM, 0)}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 500; color: #334155;">${formatNumber(metrosAcum, 0)}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${item.PARADA_TRAMA || 0}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${item.PARADA_URDUME || 0}</td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 500; color: #334155;">${totalParadas}</td>
          <td style="padding: 10px 12px; text-align: right; color: #16a34a;">${formatNumberModal(item.EFICIENCIA)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #ea580c;">${formatNumberModal(item.ROTURAS_TRA_105)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #dc2626;">${formatNumberModal(item.ROTURAS_URD_105)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #334155;">${formatNumber(item.RPM, 0)}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      datosTecelagem.value.forEach((item) => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom: 1px solid #e2e8f0;';
        tr.innerHTML = `
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #64748b; font-size: 11px;">${formatFechaTecelagem(item.FECHA_INICIAL)}</td>
          <td style="padding: 10px 12px; text-align: center; color: #64748b; font-size: 11px;">${formatFechaTecelagem(item.FECHA_FINAL)}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 500; color: #334155;">${formatNumber(item.METRAGEM, 2)}</td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #9333ea;">${item.MAQUINA ? parseInt(item.MAQUINA.slice(-3)) : ''}</td>
          <td style="padding: 10px 12px; text-align: right; color: #16a34a;">${formatNumberModal(item.EFICIENCIA)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #ea580c;">${formatNumberModal(item.ROTURAS_TRA_105)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #dc2626;">${formatNumberModal(item.ROTURAS_URD_105)}</td>
          <td style="padding: 10px 12px; color: #334155;">${item.ARTIGO || ''}</td>
          <td style="padding: 10px 12px; text-align: center; color: #475569;">${item.COR || ''}</td>
          <td style="padding: 10px 12px; color: #475569;">${item.NM_MERCADO || ''}</td>
          <td style="padding: 10px 12px; color: #475569;">${item.TRAMA || ''}</td>
          <td style="padding: 10px 12px; text-align: right; color: #475569;">${formatNumberModal(item.PASADAS)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #334155;">${formatNumber(item.RPM, 0)}</td>
        `;
        tbody.appendChild(tr);
      });
    }
    table.appendChild(tbody);
    
    // Tfoot
    const tfoot = document.createElement('tfoot');
    if (seccionActiva.value === 'urdimbre') {
      tfoot.innerHTML = `
        <tr style="background: #fef3c7; font-weight: 600; color: #334155;">
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;">TOTAL</td>
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;" colspan="5"></td>
          <td style="padding: 12px; text-align: right; border-top: 2px solid #cbd5e1;">${formatNumber(totalesUrdimbre.value.metros, 0)}</td>
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;" colspan="6"></td>
        </tr>
      `;
    } else if (seccionActiva.value === 'indigo') {
      const r103Total = totalesDetalle.value.metros > 0 ? ((totalesDetalle.value.roturas * 1000) / totalesDetalle.value.metros).toFixed(1) : '';
      tfoot.innerHTML = `
        <tr style="background: #f1f5f9; font-weight: 600; color: #334155;">
            <td style="padding: 12px; border-top: 2px solid #cbd5e1;">TOTAL</td>
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;" colspan="7"></td>
          <td style="padding: 12px; text-align: right; border-top: 2px solid #cbd5e1;">${formatNumber(totalesDetalle.value.metros, 0)}</td>
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;"></td>
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;"></td>
          <td style="padding: 12px; text-align: right; color: #7c3aed; border-top: 2px solid #cbd5e1;">${r103Total}</td>
          <td style="padding: 12px; text-align: right; color: #b91c1c; border-top: 2px solid #cbd5e1;">${totalesDetalle.value.roturas}</td>
          <td style="padding: 12px; text-align: center; border-top: 2px solid #cbd5e1;">${formatNumberModal(totalesDetalle.value.cv)}</td>
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;"></td>
        </tr>
      `;
    } else if (seccionActiva.value === 'tecelagem' && vistaDetallePartida.value) {
      // Totales para detalle de partida de Tejeduría
      tfoot.innerHTML = `
        <tr style="background: #faf5ff; font-weight: 600; color: #334155;">
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;" colspan="3">TOTAL</td>
          <td style="padding: 12px; text-align: right; border-top: 2px solid #cbd5e1;">${formatNumber(totalesDetallePartida.value.metros, 0)}</td>
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;"></td>
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;"></td>
          <td style="padding: 12px; text-align: center; border-top: 2px solid #cbd5e1;">${totalesDetallePartida.value.paradasTrama}</td>
          <td style="padding: 12px; text-align: center; border-top: 2px solid #cbd5e1;">${totalesDetallePartida.value.paradasUrdumbre}</td>
          <td style="padding: 12px; text-align: center; border-top: 2px solid #cbd5e1;">${totalesDetallePartida.value.totalParadas}</td>
          <td style="padding: 12px; text-align: right; color: #15803d; border-top: 2px solid #cbd5e1;">${formatNumberModal(totalesDetallePartida.value.eficiencia)}</td>
          <td style="padding: 12px; text-align: right; color: #c2410c; border-top: 2px solid #cbd5e1;">${formatNumberModal(totalesDetallePartida.value.roturasTra)}</td>
          <td style="padding: 12px; text-align: right; color: #b91c1c; border-top: 2px solid #cbd5e1;">${formatNumberModal(totalesDetallePartida.value.roturasUrd)}</td>
          <td style="padding: 12px; text-align: right; border-top: 2px solid #cbd5e1;">${formatNumber(totalesDetallePartida.value.rpm, 0)}</td>
        </tr>
      `;
    } else {
      tfoot.innerHTML = `
        <tr style="background: #faf5ff; font-weight: 600; color: #334155;">
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;" colspan="3">TOTAL</td>
          <td style="padding: 12px; text-align: right; border-top: 2px solid #cbd5e1;">${formatNumber(totalesTecelagem.value.metros, 2)}</td>
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;"></td>
          <td style="padding: 12px; text-align: right; color: #15803d; border-top: 2px solid #cbd5e1;">${formatNumberModal(totalesTecelagem.value.eficiencia)}</td>
          <td style="padding: 12px; text-align: right; color: #c2410c; border-top: 2px solid #cbd5e1;">${formatNumberModal(totalesTecelagem.value.roturasTra)}</td>
          <td style="padding: 12px; text-align: right; color: #b91c1c; border-top: 2px solid #cbd5e1;">${formatNumberModal(totalesTecelagem.value.roturasUrd)}</td>
          <td style="padding: 12px; border-top: 2px solid #cbd5e1;" colspan="4"></td>
          <td style="padding: 12px; text-align: right; border-top: 2px solid #cbd5e1;">${formatNumberModal(totalesTecelagem.value.pasadas)}</td>
          <td style="padding: 12px; text-align: right; border-top: 2px solid #cbd5e1;">${formatNumber(totalesTecelagem.value.rpm, 0)}</td>
        </tr>
      `;
    }
    table.appendChild(tfoot);
    
    tempContainer.appendChild(table);
    
    // Capturar
    const canvas = await html2canvas(tempContainer, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    document.body.removeChild(tempContainer);
    
    // Copiar al portapapeles
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        Swal.fire({
          icon: 'success',
          title: 'Copiado',
          text: 'Imagen copiada al portapapeles',
          timer: 1000,
          showConfirmButton: false,
          timerProgressBar: true
        });
      } catch (err) {
        console.error('Error al copiar:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al copiar la imagen',
          timer: 2000,
          showConfirmButton: false
        });
      }
    }, 'image/png');
  } catch (error) {
    console.error('Error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error al generar la imagen',
      timer: 2000,
      showConfirmButton: false
    });
  } finally {
    copiandoModal.value = false;
  }
};

// Exportar modal a Excel
const exportarModalAExcel = async () => {
  // Determinar qué datos usar según la vista actual
  let datosActivos;
  let esDetallePartida = false;
  let esUrdimbre = false;
  
  if (seccionActiva.value === 'urdimbre') {
    datosActivos = datosUrdimbre.value;
    esUrdimbre = true;
  } else if (seccionActiva.value === 'indigo') {
    datosActivos = datosDetalleAgrupados.value;
  } else if (seccionActiva.value === 'tecelagem' && vistaDetallePartida.value) {
    datosActivos = datosDetallePartida.value;
    esDetallePartida = true;
  } else {
    datosActivos = datosTecelagem.value;
  }
  
  if (datosActivos.length === 0) return;
  
  try {
    const workbook = new ExcelJS.Workbook();
    let seccionNombre = esUrdimbre ? 'URDIMBRE' : seccionActiva.value === 'indigo' ? 'INDIGO' : 'TEJEDURIA';
    if (esDetallePartida) {
      const partida = partidaSeleccionada.value?.PARTIDA?.replace(/^0/, '') || '';
      seccionNombre = `TEJ_Partida_${partida}`;
    }
    const worksheet = workbook.addWorksheet(`Rolada_${roladaSeleccionada.value}_${seccionNombre}`);
    
    // Colores
    const colors = esUrdimbre ? {
      headerBg: 'FFFFFBEB',
      headerText: '1e293b',
      border: 'FFcbd5e1',
      totalsBg: 'FFFEF3C7',
      amber: 'FFd97706'
    } : seccionActiva.value === 'indigo' ? {
      headerBg: 'FFF8FAFC',
      headerText: '1e293b',
      border: 'FFcbd5e1',
      totalsBg: 'FFF1F5F9',
      purple: 'FF9333ea',
      red: 'FFdc2626',
      blue: 'FF2563eb'
    } : {
      headerBg: 'FFFAF5FF',
      headerText: '1e293b',
      border: 'FFcbd5e1',
      totalsBg: 'FFFAF5FF',
      purple: 'FF9333ea',
      red: 'FFdc2626',
      green: 'FF16a34a',
      orange: 'FFea580c'
    };
    
    // Título
    const lastCol = esUrdimbre ? 'M' : seccionActiva.value === 'indigo' ? 'O' : (esDetallePartida ? 'M' : 'N');
    worksheet.mergeCells(`A1:${lastCol}1`);
    const seccionTitulo = esUrdimbre ? 'URDIMBRE' : seccionActiva.value === 'indigo' ? 'ÍNDIGO' : 'TEJEDURÍA';
    worksheet.getCell('A1').value = `Detalle ${seccionTitulo} - Rolada ${roladaSeleccionada.value}`;
    worksheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1e293b' } };
    worksheet.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(1).height = 24;
    
    // Subtítulo
    worksheet.mergeCells(`A2:${lastCol}2`);
    let subtituloExcel = `${datosActivos.length} partidas`;
    if (esDetallePartida) {
      const partida = partidaSeleccionada.value?.PARTIDA?.replace(/^0/, '') || '';
      subtituloExcel = `Partida ${partida} - ${datosActivos.length} turnos | Art: ${partidaSeleccionada.value?.ARTIGO || ''} | Telar: ${partidaSeleccionada.value?.MAQUINA ? parseInt(partidaSeleccionada.value.MAQUINA.slice(-3)) : ''}`;
    }
    worksheet.getCell('A2').value = subtituloExcel;
    worksheet.getCell('A2').font = { size: 10, color: { argb: 'FF64748b' } };
    worksheet.getRow(2).height = 18;
    
    // Encabezados
    let headers;
    if (esUrdimbre) {
      headers = ['Partida', 'Fecha Inicio', 'Hora Inicio', 'Fecha Final', 'Hora Final', 'Artículo', 'Metros', 'Vel.', 'Puntas', 'Operador', 'Lote', 'Maq.', 'Base'];
    } else if (seccionActiva.value === 'indigo') {
      headers = ['Partida', 'Fecha Inicio', 'Hora Inicio', 'Fecha Final', 'Hora Final', 'Turno', 'Base', 'Color', 'Metros', 'Veloc.', 'S', 'R10³', 'Roturas', 'CV', 'Operador'];
    } else if (esDetallePartida) {
      headers = ['Fecha', 'Tur', 'Partida', 'Metros Crudos', 'Metros Termin.', 'Metros Acumul.', 'Paradas Trama', 'Paradas Urdimbre', 'Total Paradas', 'Eficiencia %', 'Roturas TRAMA 10⁵', 'Roturas URDIDO 10⁵', 'RPM'];
    } else {
      headers = ['Partida', 'Fecha Inicial', 'Fecha Final', 'Metros', 'Telar', 'Eficiencia %', 'Roturas TRA 10⁵', 'Roturas URD 10⁵', 'Artículo', 'Color', 'Nombre', 'Trama', 'Pasadas', 'RPM'];
    }
    const headerRow = worksheet.addRow(headers);
    headerRow.height = esUrdimbre ? 24 : seccionActiva.value === 'indigo' ? 24 : 30;
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
      cell.font = { bold: true, size: 10, color: { argb: 'FF475569' } };
      cell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle',
        wrapText: true  // Quebrar texto en los encabezados
      };
      cell.border = {
        bottom: { style: 'medium', color: { argb: colors.border } }
      };
    });
    
    // Datos
    if (esUrdimbre) {
      datosUrdimbre.value.forEach((item, idx) => {
        const row = worksheet.addRow([
          item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : '',
          item.DT_INICIO || '',
          item.HORA_INICIO || '',
          item.DT_FINAL || '',
          item.HORA_FINAL || '',
          item.ARTIGO || '',
          item.METRAGEM || 0,
          item.VELOC || '',
          item.NUM_FIOS || '',
          item.NM_OPERADOR || '',
          item.LOTE_FIACAO || '',
          item.MAQ_FIACAO || '',
          item.BASE_URDUME || ''
        ]);
        
        row.height = 22;
        row.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 6 || colNumber === 10 || colNumber === 11 || colNumber === 13 ? 'left' : 'center' };
          cell.font = { size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } };
          
          // Colores especiales
          if (colNumber === 9) cell.font = { size: 10, bold: true, color: { argb: colors.amber } }; // Puntas
        });
        
        // Formato numérico para Metros
        row.getCell(7).numFmt = '#,##0';
        row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      });
    } else if (seccionActiva.value === 'indigo') {
      datosDetalleAgrupados.value.forEach((item, idx) => {
        const row = worksheet.addRow([
          item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : '',
          item.DT_INICIO || '',
          item.HORA_INICIO || '',
          item.DT_FINAL || '',
          item.HORA_FINAL || '',
          item.TURNO || '',
          item.ARTIGO ? item.ARTIGO.substring(0, 10) : '',
          item.COR || '',
          item.METRAGEM || 0,
          item.VELOC || '',
          item.S || '',
          (item.RUPTURAS && item.METRAGEM) ? ((item.RUPTURAS * 1000) / item.METRAGEM).toFixed(1) : '',
          item.RUPTURAS || 0,
          item.CAVALOS || 0,
          item.NM_OPERADOR || ''
        ]);
        
        row.height = 22;
        row.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 7 || colNumber === 8 || colNumber === 15 ? 'left' : 'center' };
          cell.font = { size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } };
          
          // Colores especiales
          if (colNumber === 6) cell.font = { size: 10, bold: true, color: { argb: colors.blue } }; // Turno
          if (colNumber === 12) cell.font = { size: 10, color: { argb: colors.purple } }; // R10³
          if (colNumber === 13) cell.font = { size: 10, color: { argb: colors.red } }; // Roturas
        });
        
        // Formato numérico para Metros
        row.getCell(9).numFmt = '#,##0';
        row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
      });
    } else if (esDetallePartida) {
      // Exportar detalle de partida de Tejeduría
      let metrosAcum = 0;
      datosDetallePartida.value.forEach((item, idx) => {
        metrosAcum += parseFloat(item.METRAGEM) || 0;
        const totalParadas = (parseInt(item.PARADA_TRAMA) || 0) + (parseInt(item.PARADA_URDUME) || 0);
        
        const row = worksheet.addRow([
          formatFechaDetalle(item.DT_BASE_PRODUCAO),
          item.TURNO || '',
          item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : '',
          item.METRAGEM || 0,
          item.METRAGEM || 0,
          metrosAcum,
          item.PARADA_TRAMA || 0,
          item.PARADA_URDUME || 0,
          totalParadas,
          item.EFICIENCIA || 0,
          item.ROTURAS_TRA_105 || 0,
          item.ROTURAS_URD_105 || 0,
          item.RPM || 0
        ]);
        
        row.height = 22;
        row.eachCell((cell, colNumber) => {
          cell.font = { size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          
          // Colores especiales
          if (colNumber === 10) cell.font = { size: 10, color: { argb: colors.green } }; // Eficiencia
          if (colNumber === 11) cell.font = { size: 10, color: { argb: colors.orange } }; // Roturas TRA
          if (colNumber === 12) cell.font = { size: 10, color: { argb: colors.red } }; // Roturas URD
        });
        
        // Formato numérico
        row.getCell(4).numFmt = '#,##0'; // Metros Crudos
        row.getCell(5).numFmt = '#,##0'; // Metros Termin
        row.getCell(6).numFmt = '#,##0'; // Metros Acumul
        row.getCell(10).numFmt = '0.00'; // Eficiencia
        row.getCell(11).numFmt = '0.00'; // Roturas TRA
        row.getCell(12).numFmt = '0.00'; // Roturas URD
        row.getCell(13).numFmt = '#,##0'; // RPM
      });
    } else {
      datosTecelagem.value.forEach((item, idx) => {
        const row = worksheet.addRow([
          item.PARTIDA ? item.PARTIDA.replace(/^0/, '') : '',
          formatFechaTecelagem(item.FECHA_INICIAL),
          formatFechaTecelagem(item.FECHA_FINAL),
          item.METRAGEM || 0,
          item.MAQUINA ? parseInt(item.MAQUINA.slice(-3)) : '',
          item.EFICIENCIA || 0,
          item.ROTURAS_TRA_105 || 0,
          item.ROTURAS_URD_105 || 0,
          item.ARTIGO || '',
          item.COR || '',
          item.NM_MERCADO || '',
          item.TRAMA || '',
          formatNumberModal(item.PASADAS),
          item.RPM || 0
        ]);
        
        row.height = 22;
        row.eachCell((cell, colNumber) => {
          cell.font = { size: 10 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } } };
          cell.alignment = { vertical: 'middle' };
          
          // Alineación específica según especificaciones
          // Izquierda: I(9-Artículo), K(11-Nombre), L(12-Trama)
          if (colNumber === 9 || colNumber === 11 || colNumber === 12) {
            cell.alignment = { ...cell.alignment, horizontal: 'left' };
          } else {
            // Centro: A,B,C,D,E,F,G,H,J,M,N (todas las demás)
            cell.alignment = { ...cell.alignment, horizontal: 'center' };
          }
          
          // Colores especiales
          if (colNumber === 5) cell.font = { size: 10, bold: true, color: { argb: colors.purple } }; // Telar
          if (colNumber === 6) cell.font = { size: 10, color: { argb: colors.green } }; // Eficiencia
          if (colNumber === 7) cell.font = { size: 10, color: { argb: colors.orange } }; // Roturas TRA
          if (colNumber === 8) cell.font = { size: 10, color: { argb: colors.red } }; // Roturas URD
        });
        
        // Formato numérico
        row.getCell(4).numFmt = '#,##0.00'; // Metros
        row.getCell(6).numFmt = '0.00'; // Eficiencia
        row.getCell(7).numFmt = '0.00'; // Roturas TRA
        row.getCell(8).numFmt = '0.00'; // Roturas URD
        // Pasadas ya viene formateado como texto desde formatNumberModal
        row.getCell(14).numFmt = '#,##0'; // RPM
      });
    }
    
    // Fila de totales
    let totalesRow;
    if (esUrdimbre) {
      totalesRow = worksheet.addRow([
        'TOTAL', '', '', '', '', '',
        totalesUrdimbre.value.metros,
        '', '', '', '', '', ''
      ]);
      totalesRow.height = 26;
      totalesRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
        cell.font = { bold: true, size: 10 };
        cell.border = { top: { style: 'medium', color: { argb: colors.border } } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      totalesRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      totalesRow.getCell(7).numFmt = '#,##0';
      totalesRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (seccionActiva.value === 'indigo') {
      totalesRow = worksheet.addRow([
        'TOTAL', '', '', '', '', '', '', '',
        totalesDetalle.value.metros,
        '', '',
        totalesDetalle.value.metros > 0 ? ((totalesDetalle.value.roturas * 1000) / totalesDetalle.value.metros).toFixed(1) : '',
        totalesDetalle.value.roturas,
        totalesDetalle.value.cv,
        ''
      ]);
      totalesRow.height = 26;
      totalesRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
        cell.font = { bold: true, size: 10 };
        cell.border = { top: { style: 'medium', color: { argb: colors.border } } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        
        if (colNumber === 12) cell.font = { bold: true, size: 10, color: { argb: colors.purple } };
        if (colNumber === 13) cell.font = { bold: true, size: 10, color: { argb: colors.red } };
      });
      totalesRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      totalesRow.getCell(9).numFmt = '#,##0';
      totalesRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (esDetallePartida) {
      // Totales para detalle de partida de Tejeduría
      totalesRow = worksheet.addRow([
        'TOTAL',
        '', '',
        totalesDetallePartida.value.metros,
        '',
        '',
        totalesDetallePartida.value.paradasTrama,
        totalesDetallePartida.value.paradasUrdumbre,
        totalesDetallePartida.value.totalParadas,
        totalesDetallePartida.value.eficiencia,
        totalesDetallePartida.value.roturasTra,
        totalesDetallePartida.value.roturasUrd,
        totalesDetallePartida.value.rpm
      ]);
      totalesRow.height = 26;
      totalesRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
        cell.font = { bold: true, size: 10 };
        cell.border = { top: { style: 'medium', color: { argb: colors.border } } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        
        if (colNumber === 10) cell.font = { bold: true, size: 10, color: { argb: colors.green } };
        if (colNumber === 11) cell.font = { bold: true, size: 10, color: { argb: colors.orange } };
        if (colNumber === 12) cell.font = { bold: true, size: 10, color: { argb: colors.red } };
      });
      totalesRow.getCell(4).numFmt = '#,##0';
      totalesRow.getCell(10).numFmt = '0.00';
      totalesRow.getCell(11).numFmt = '0.00';
      totalesRow.getCell(12).numFmt = '0.00';
      totalesRow.getCell(13).numFmt = '#,##0';
    } else {
      totalesRow = worksheet.addRow([
        'TOTAL',
        '', '',
        totalesTecelagem.value.metros,
        '',
        totalesTecelagem.value.eficiencia,
        totalesTecelagem.value.roturasTra,
        totalesTecelagem.value.roturasUrd,
        '', '', '', '',
        formatNumberModal(totalesTecelagem.value.pasadas),
        totalesTecelagem.value.rpm
      ]);
      totalesRow.height = 26;
      totalesRow.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
        cell.font = { bold: true, size: 10 };
        cell.border = { top: { style: 'medium', color: { argb: colors.border } } };
        cell.alignment = { vertical: 'middle' };
        
        // Aplicar la misma alineación que las filas de datos
        // Izquierda: I(9-Artículo), K(11-Nombre), L(12-Trama)
        if (colNumber === 9 || colNumber === 11 || colNumber === 12) {
          cell.alignment = { ...cell.alignment, horizontal: 'left' };
        } else {
          // Centro: todas las demás
          cell.alignment = { ...cell.alignment, horizontal: 'center' };
        }
        
        if (colNumber === 6) cell.font = { bold: true, size: 10, color: { argb: colors.green } };
        if (colNumber === 7) cell.font = { bold: true, size: 10, color: { argb: colors.orange } };
        if (colNumber === 8) cell.font = { bold: true, size: 10, color: { argb: colors.red } };
      });
      totalesRow.getCell(4).numFmt = '#,##0.00';
      totalesRow.getCell(6).numFmt = '0.00';
      totalesRow.getCell(7).numFmt = '0.00';
      totalesRow.getCell(8).numFmt = '0.00';
      totalesRow.getCell(14).numFmt = '#,##0';
    }
    
    // Anchos de columna
    if (esUrdimbre) {
      worksheet.columns = [
        { width: 10 },  // Partida
        { width: 12 },  // Fecha Inicio
        { width: 10 },  // Hora Inicio
        { width: 12 },  // Fecha Final
        { width: 10 },  // Hora Final
        { width: 12 },  // Artigo
        { width: 10 },  // Metragem
        { width: 8 },   // Veloc
        { width: 9 },   // Num Fios
        { width: 20 },  // Operador
        { width: 12 },  // Lote Fiação
        { width: 12 },  // Maq Fiação
        { width: 12 }   // Base Urdume
      ];
    } else if (seccionActiva.value === 'indigo') {
      worksheet.columns = [
        { width: 10 }, // Partida
        { width: 12 }, // Fecha Inicio
        { width: 10 }, // Hora Inicio
        { width: 12 }, // Fecha Final
        { width: 10 }, // Hora Final
        { width: 7 },  // Turno
        { width: 12 }, // Base
        { width: 8 },  // Color
        { width: 10 }, // Metros
        { width: 8 },  // Veloc
        { width: 5 },  // S
        { width: 8 },  // R10³
        { width: 9 },  // Roturas
        { width: 6 },  // CV
        { width: 30 }  // Operador
      ];
    } else if (esDetallePartida) {
      worksheet.columns = [
        { width: 12 },    // A - Fecha
        { width: 5 },     // B - Tur
        { width: 8 },     // C - Partida
        { width: 10 },    // D - Metros Crudos
        { width: 10 },    // E - Metros Termin.
        { width: 10 },    // F - Metros Acumul.
        { width: 8 },     // G - Paradas Trama
        { width: 9 },     // H - Paradas Urdimbre
        { width: 9 },     // I - Total Paradas
        { width: 9 },     // J - Eficiencia %
        { width: 11 },    // K - Roturas TRAMA 10⁵
        { width: 11 },    // L - Roturas URDIDO 10⁵
        { width: 6 }      // M - RPM
      ];
    } else {
      worksheet.columns = [
        { width: 7.86 },  // A - Partida
        { width: 13 },    // B - Fecha Inicial
        { width: 13.14 }, // C - Fecha Final
        { width: 8.57 },  // D - Metros
        { width: 4.43 },  // E - Telar
        { width: 7.29 },  // F - Eficiencia %
        { width: 7.29 },  // G - Roturas TRA 10⁵
        { width: 7.29 },  // H - Roturas URD 10⁵
        { width: 10.29 }, // I - Artículo
        { width: 5 },     // J - Color
        { width: 18.57 }, // K - Nombre
        { width: 28 },    // L - Trama
        { width: 6.14 },  // M - Pasadas
        { width: 4 }      // N - RPM
      ];
    }
    
    // Configuración de impresión
    worksheet.pageSetup = {
      orientation: 'landscape',  // Orientación apaisada
      fitToPage: true,           // Ajustar a página
      fitToWidth: 1,             // Ajustar ancho a 1 página
      fitToHeight: 0,            // Alto automático (múltiples páginas si es necesario)
      margins: {
        left: 0.196850394,       // 5mm en pulgadas
        right: 0.196850394,      // 5mm en pulgadas
        top: 0.196850394,        // 5mm en pulgadas
        bottom: 0.393700787,     // 10mm en pulgadas
        header: 0.3,
        footer: 0.3
      }
    };
    
    // Repetir encabezados en todas las páginas (fila 3 contiene los encabezados)
    worksheet.pageSetup.printTitlesRow = '3:3';
    
    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const ahora = new Date();
    const fecha = ahora.toISOString().slice(0, 10).replace(/-/g, '');
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const nombreSeccion = seccionActiva.value === 'indigo' ? 'INDIGO' : 'TEJEDURIA';
    link.href = url;
    link.download = `Detalle_${nombreSeccion}_Rolada_${roladaSeleccionada.value}_${fecha}_${horas}_${minutos}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    
    Swal.fire({ icon: 'success', title: 'Exportado', text: 'Excel generado correctamente', timer: 1000, showConfirmButton: false, timerProgressBar: true });
  } catch (error) {
    console.error('Error exportando Excel:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'Error al exportar a Excel', timer: 2000, showConfirmButton: false });
  }
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
    Swal.fire({ icon: 'error', title: 'Error', text: 'Error al cargar los datos', timer: 2000, showConfirmButton: false });
  } finally {
    cargando.value = false;
  }
};

// Copiar tabla como imagen al portapapeles
const copiarComoImagen = async () => {
  if (datos.value.length === 0) {
    Swal.fire({ icon: 'warning', title: 'Sin datos', text: 'No hay datos para copiar', timer: 1500, showConfirmButton: false });
    return;
  }
  
  copiando.value = true;
  
  try {
    // Fecha de inicio y fin para el encabezado
    const fechaFin = new Date(fechaSeleccionada.value + 'T00:00:00');
    const fechaInicio = new Date(fechaFin);
    fechaInicio.setDate(fechaInicio.getDate() - diasSeleccionados.value);
    
    const formatFecha = (d) => d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    // Crear contenedor temporal con estilos inline
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px; background: #ffffff; padding: 16px; font-family: system-ui, -apple-system, sans-serif;';
    
    // Crear encabezado con logo
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; gap: 16px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;';
    
    // Logo
    const logo = document.createElement('img');
    logo.src = '/LogoSantana.jpg';
    logo.style.cssText = 'height: 36px; width: auto;';
    header.appendChild(logo);
    
    // Texto del encabezado
    const headerText = document.createElement('div');
    headerText.innerHTML = `
      <div style="font-size: 16px; font-weight: 600; color: #1e293b;">
        Seguimiento de Roladas
      </div>
      <div style="font-size: 12px; color: #94a3b8;">
        Producción ÍNDIGO
      </div>
    `;
    header.appendChild(headerText);
    
    // Info de registros y período
    const headerInfo = document.createElement('div');
    headerInfo.style.cssText = 'margin-left: auto; display: flex; align-items: center; gap: 16px;';
    headerInfo.innerHTML = `
      <div style="background: #f1f5f9; padding: 4px 10px; border-radius: 6px;">
        <span style="font-size: 11px; color: #64748b;">Registros:</span>
        <span style="font-size: 13px; font-weight: 600; color: #334155; margin-left: 4px;">${datos.value.length}</span>
      </div>
      <div style="font-size: 12px; color: #64748b;">
        Período: ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}
      </div>
    `;
    header.appendChild(headerInfo);
    container.appendChild(header);
    
    // Colores para la tabla (estilo minimalista como la UI)
    const colors = {
      headerBg: '#f8fafc',
      headerText: '#64748b',
      headerTextDark: '#334155',
      border: '#cbd5e1',
      borderLight: '#e2e8f0',
      text: '#334155',
      textLight: '#64748b',
      white: '#ffffff',
      blue: '#2563eb',
      green: '#16a34a',
      orange: '#ea580c',
      cyan: '#0891b2'
    };
    
    // Crear tabla HTML con estilo minimalista
    const table = document.createElement('table');
    table.style.cssText = 'border-collapse: collapse; font-size: 12px; width: 100%; border: 1px solid ' + colors.border + ';';
    
    // Thead - Fila de grupos
    const thead = document.createElement('thead');
    const headerRow1 = document.createElement('tr');
    headerRow1.innerHTML = `
      <th rowspan="2" style="background: ${colors.headerBg}; color: ${colors.headerTextDark}; padding: 10px 12px; text-align: center; vertical-align: middle; border-right: 2px solid ${colors.border}; border-bottom: 2px solid ${colors.border}; font-size: 11px; font-weight: 600; text-transform: uppercase;">ROLADA</th>
      <th colspan="2" style="background: ${colors.headerBg}; color: ${colors.headerTextDark}; padding: 8px; text-align: center; vertical-align: middle; border-right: 2px solid ${colors.border}; border-bottom: 1px solid ${colors.border}; font-size: 11px; font-weight: 600; text-transform: uppercase;">URDIDORA</th>
      <th colspan="8" style="background: ${colors.headerBg}; color: ${colors.headerTextDark}; padding: 8px; text-align: center; vertical-align: middle; border-right: 2px solid ${colors.border}; border-bottom: 1px solid ${colors.border}; font-size: 11px; font-weight: 600; text-transform: uppercase;">ÍNDIGO</th>
      <th colspan="4" style="background: ${colors.headerBg}; color: ${colors.headerTextDark}; padding: 8px; text-align: center; vertical-align: middle; border-right: 2px solid ${colors.border}; border-bottom: 1px solid ${colors.border}; font-size: 11px; font-weight: 600; text-transform: uppercase;">TEJEDURÍA</th>
      <th colspan="3" style="background: ${colors.headerBg}; color: ${colors.headerTextDark}; padding: 8px; text-align: center; vertical-align: middle; border-bottom: 1px solid ${colors.border}; font-size: 11px; font-weight: 600; text-transform: uppercase;">CALIDAD</th>
    `;
    thead.appendChild(headerRow1);
    
    // Thead - Fila de columnas
    const headerRow2 = document.createElement('tr');
    const subHeaders = [
      { text: 'Maq. OE', borderRight: '1px solid ' + colors.borderLight },
      { text: 'Lote', borderRight: '2px solid ' + colors.border },
      { text: 'Fecha', borderRight: '1px solid ' + colors.borderLight },
      { text: 'Base', borderRight: '1px solid ' + colors.borderLight },
      { text: 'Color', borderRight: '1px solid ' + colors.borderLight },
      { text: 'Metros', borderRight: '1px solid ' + colors.borderLight },
      { text: 'R10³', borderRight: '1px solid ' + colors.borderLight },
      { text: 'Cav', borderRight: '1px solid ' + colors.borderLight },
      { text: 'Vel. Nom.', borderRight: '1px solid ' + colors.borderLight },
      { text: 'Vel. Prom.', borderRight: '2px solid ' + colors.border },
      { text: 'Metros', borderRight: '1px solid ' + colors.borderLight },
      { text: 'Efic. %', borderRight: '1px solid ' + colors.borderLight },
      { text: 'RU10⁵', borderRight: '1px solid ' + colors.borderLight },
      { text: 'RT10⁵', borderRight: '2px solid ' + colors.border },
      { text: 'Metros', borderRight: '1px solid ' + colors.borderLight },
      { text: 'Cal. %', borderRight: '1px solid ' + colors.borderLight },
      { text: 'Pts/100m²', borderRight: 'none' }
    ];
    subHeaders.forEach(h => {
      const th = document.createElement('th');
      th.style.cssText = `background: ${colors.headerBg}; color: ${colors.headerText}; padding: 0 8px; height: 32px; line-height: 32px; text-align: center; vertical-align: middle; border-bottom: 2px solid ${colors.border}; border-right: ${h.borderRight}; font-size: 11px; font-weight: 500;`;
      th.textContent = h.text;
      headerRow2.appendChild(th);
    });
    thead.appendChild(headerRow2);
    table.appendChild(thead);
    
    // Tbody - Filas de datos
    const tbody = document.createElement('tbody');
    datos.value.forEach((item, idx) => {
      const row = document.createElement('tr');
      row.style.cssText = 'border-bottom: 1px solid ' + colors.borderLight + ';';
      
      const cellData = [
        { value: item.ROLADA, bold: true, color: colors.text, borderRight: '2px solid ' + colors.border },
        { value: formatListaConY(item.MAQ_OE), color: colors.textLight, borderRight: '1px solid ' + colors.borderLight },
        { value: formatListaConY(item.LOTE), color: colors.textLight, borderRight: '2px solid ' + colors.border },
        { value: item.FECHA || '-', color: colors.textLight, borderRight: '1px solid ' + colors.borderLight, small: true },
        { value: item.BASE || '-', color: colors.cyan, borderRight: '1px solid ' + colors.borderLight },
        { value: item.COLOR || '-', color: colors.text, borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(item.MTS_IND, 0), color: colors.text, bold: true, borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(item.R103, 1), color: colors.textLight, borderRight: '1px solid ' + colors.borderLight },
        { value: item.CAV || '-', color: colors.textLight, borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(item.VEL_NOM, 0), color: colors.textLight, borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(item.VEL_PROM, 0), color: colors.textLight, borderRight: '2px solid ' + colors.border },
        { value: formatNumber(item.MTS_CRUDOS, 0), color: colors.text, bold: true, borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(item.EFI_TEJ, 1), color: colors.green, borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(item.RU105, 1), color: colors.cyan, borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(item.RT105, 1), color: colors.cyan, borderRight: '2px solid ' + colors.border },
        { value: formatNumber(item.MTS_CAL, 0), color: colors.text, bold: true, borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(item.CAL_PERCENT, 1), color: colors.textLight, borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(item.PTS_100M2, 1), color: colors.textLight, borderRight: 'none' }
      ];
      
      cellData.forEach(cell => {
        const td = document.createElement('td');
        td.style.cssText = `background: ${colors.white}; color: ${cell.color}; padding: 0 8px; height: 36px; line-height: 36px; text-align: center; vertical-align: middle; border-right: ${cell.borderRight}; ${cell.bold ? 'font-weight: 600;' : ''} ${cell.small ? 'font-size: 11px;' : ''}`;
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
      totalRow.style.cssText = 'background: #f8fafc; font-weight: 600;';
      
      const totalCellData = [
        { value: 'TOTAL', bold: true, borderRight: '2px solid ' + colors.border },
        { value: totalesMes.value.TOTAL_ROLADAS + ' roladas', colspan: 2, borderRight: '2px solid ' + colors.border },
        { value: '-', colspan: 3, borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(totalesMes.value.MTS_IND, 0), borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(totalesMes.value.R103, 1), borderRight: '1px solid ' + colors.borderLight },
        { value: totalesMes.value.CAV || '-', borderRight: '1px solid ' + colors.borderLight },
        { value: '-', borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(totalesMes.value.VEL_PROM, 0), borderRight: '2px solid ' + colors.border },
        { value: formatNumber(totalesMes.value.MTS_CRUDOS, 0), borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(totalesMes.value.EFI_TEJ, 1), borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(totalesMes.value.RU105, 1), borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(totalesMes.value.RT105, 1), borderRight: '2px solid ' + colors.border },
        { value: formatNumber(totalesMes.value.MTS_CAL, 0), borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(totalesMes.value.CAL_PERCENT, 1), borderRight: '1px solid ' + colors.borderLight },
        { value: formatNumber(totalesMes.value.PTS_100M2, 1), borderRight: 'none' }
      ];
      
      totalCellData.forEach(cell => {
        const td = document.createElement('td');
        td.style.cssText = `background: #f8fafc; color: ${colors.text}; padding: 0 8px; height: 40px; line-height: 40px; text-align: center; vertical-align: middle; border-top: 2px solid ${colors.border}; border-right: ${cell.borderRight}; ${cell.bold ? 'font-weight: 700;' : 'font-weight: 600;'}`;
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
        
        Swal.fire({
          icon: 'success',
          title: 'Copiado',
          text: 'Imagen copiada al portapapeles',
          timer: 1000,
          showConfirmButton: false,
          timerProgressBar: true
        });
        
      } catch (clipboardError) {
        console.error('Error al copiar al portapapeles:', clipboardError);
        // Fallback: descargar la imagen
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'SeguimientoRoladas.png';
        link.href = url;
        link.click();
        Swal.fire({ icon: 'info', title: 'Imagen descargada', text: 'No se pudo copiar al portapapeles. La imagen se ha descargado.', timer: 2500, showConfirmButton: false });
      }
    }, 'image/png');
    
  } catch (error) {
    console.error('Error al generar imagen:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'Error al generar la imagen', timer: 2000, showConfirmButton: false });
  } finally {
    copiando.value = false;
  }
};

// Exportar a Excel
const exportarAExcel = async () => {
  if (datos.value.length === 0) {
    Swal.fire({ icon: 'warning', title: 'Sin datos', text: 'No hay datos para exportar', timer: 1500, showConfirmButton: false });
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
    
    Swal.fire({ icon: 'success', title: 'Exportado', text: 'Excel generado correctamente', timer: 1000, showConfirmButton: false, timerProgressBar: true });
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'Error al exportar a Excel', timer: 2000, showConfirmButton: false });
  }
};

// Imprimir tabla directamente
const imprimirTabla = () => {
  if (datos.value.length === 0) return;
  
  // Construir HTML de la tabla con estilo limpio
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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          font-size: 9px;
          margin: 0;
          padding: 15px;
          background: white;
        }
        h2 { 
          text-align: center; 
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }
        .fecha-info {
          text-align: center;
          margin-bottom: 12px;
          color: #64748b;
          font-size: 10px;
        }
        table { 
          border-collapse: collapse; 
          width: 100%;
          font-size: 9px;
          background: white;
          border: 1px solid #94a3b8;
        }
        th { 
          padding: 6px 5px;
          text-align: center;
          font-weight: 600;
          border: 1px solid #cbd5e1;
        }
        td { 
          padding: 6px 5px; 
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        .section-header th {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px 5px;
          border-bottom: 2px solid #94a3b8;
        }
        .section-rolada { color: #475569; background: #f1f5f9; border-right: 2px solid #94a3b8 !important; }
        .section-urdidora { color: #047857; background: #f0fdf4; border-right: 2px solid #94a3b8 !important; }
        .section-indigo { color: #1d4ed8; background: #eff6ff; border-right: 2px solid #94a3b8 !important; }
        .section-tejeduria { color: #6d28d9; background: #f5f3ff; border-right: 2px solid #94a3b8 !important; }
        .section-calidad { color: #b45309; background: #fffbeb; }
        .col-header { 
          color: #475569; 
          background: #f8fafc;
          font-size: 9px;
          font-weight: 500;
          border-bottom: 2px solid #94a3b8 !important;
        }
        .border-section { border-right: 2px solid #94a3b8 !important; }
        .totales-row td {
          background-color: #f1f5f9 !important;
          font-weight: 600;
          border-top: 2px solid #94a3b8 !important;
          padding: 8px 5px;
        }
        .font-medium { font-weight: 500; }
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
            <th rowspan="2" class="section-rolada" style="color: #475569; background: #f8fafc;">ROLADA</th>
            <th colspan="2" class="section-urdidora">URDIDORA</th>
            <th colspan="8" class="section-indigo">ÍNDIGO</th>
            <th colspan="4" class="section-tejeduria">TEJEDURÍA</th>
            <th colspan="3" class="section-calidad">CALIDAD</th>
          </tr>
          <tr class="col-header">
            <th>Maq OE</th>
            <th class="border-section">Lote</th>
            <th>Fecha</th>
            <th>Base</th>
            <th>Color</th>
            <th>Metros</th>
            <th>R‰</th>
            <th>Cav</th>
            <th>Vel.Nom</th>
            <th class="border-section">Vel.Prom</th>
            <th>Metros</th>
            <th>Efi%</th>
            <th>RU‰</th>
            <th class="border-section">RT‰</th>
            <th>Metros</th>
            <th>Cal%</th>
            <th>Pts/100m²</th>
          </tr>
        </thead>
        <tbody>`;
  
  // Filas de datos
  datos.value.forEach((item, idx) => {
    html += `
          <tr>
            <td class="border-section font-medium">${item.ROLADA}</td>
            <td>${item.MAQ_OE || '-'}</td>
            <td class="border-section">${item.LOTE || '-'}</td>
            <td>${item.FECHA || '-'}</td>
            <td>${item.BASE || '-'}</td>
            <td>${formatListaConY(item.COLOR)}</td>
            <td class="font-medium">${formatNumber(item.MTS_IND, 0)}</td>
            <td>${formatNumber(item.R103, 1)}</td>
            <td>${item.CAV || '-'}</td>
            <td>${item.VEL_NOM || '-'}</td>
            <td class="border-section">${formatNumber(item.VEL_PROM, 1)}</td>
            <td class="font-medium">${formatNumber(item.MTS_CRUDOS, 0)}</td>
            <td>${formatNumber(item.EFI_TEJ, 1)}</td>
            <td>${formatNumber(item.RU105, 1)}</td>
            <td class="border-section">${formatNumber(item.RT105, 1)}</td>
            <td class="font-medium">${formatNumber(item.MTS_CAL, 0)}</td>
            <td>${formatNumber(item.CAL_PERCENT, 1)}</td>
            <td>${formatNumber(item.PTS_100M2, 1)}</td>
          </tr>`;
  });
  
  // Fila de totales
  if (totalesMes.value) {
    html += `
          <tr class="totales-row">
            <td class="border-section" colspan="3">TOTAL (${totalesMes.value.TOTAL_ROLADAS} roladas)</td>
            <td colspan="3">-</td>
            <td>${formatNumber(totalesMes.value.MTS_IND, 0)}</td>
            <td>${formatNumber(totalesMes.value.R103, 1)}</td>
            <td>${totalesMes.value.CAV || '-'}</td>
            <td>-</td>
            <td class="border-section">${formatNumber(totalesMes.value.VEL_PROM, 1)}</td>
            <td>${formatNumber(totalesMes.value.MTS_CRUDOS, 0)}</td>
            <td>${formatNumber(totalesMes.value.EFI_TEJ, 1)}</td>
            <td>${formatNumber(totalesMes.value.RU105, 1)}</td>
            <td class="border-section">${formatNumber(totalesMes.value.RT105, 1)}</td>
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
