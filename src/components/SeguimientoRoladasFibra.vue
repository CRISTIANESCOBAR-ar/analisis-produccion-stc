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
            <span class="text-sm text-slate-600 font-medium mt-0.5">Roladas + Fibra HVI</span>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between gap-4 flex-shrink-0 mb-3 pb-3 border-b border-slate-100">
        <div class="flex items-center gap-5">
          <img src="/LogoSantana.jpg" alt="Santana Textiles" class="h-9 w-auto object-contain opacity-90" />
          <div>
            <h3 class="text-base font-semibold text-slate-800 tracking-tight">Seguimiento de Roladas + Fibra HVI</h3>
            <p class="text-xs text-slate-400 mt-0.5">Producción ÍNDIGO con Análisis de Calidad de Fibra</p>
          </div>
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md ml-2">
            <span class="text-xs text-slate-500">Registros:</span>
            <span class="text-sm font-semibold text-slate-700 tabular-nums">{{ datos.length }}</span>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- Date Picker Inicio -->
          <div class="flex items-center gap-1.5">
            <label for="fecha-inicio" class="text-xs font-medium text-slate-500">Desde:</label>
            <input
              type="date"
              id="fecha-inicio"
              v-model="fechaInicio"
              class="px-2.5 py-1.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-slate-700"
            />
          </div>
          
          <!-- Date Picker Fin -->
          <div class="flex items-center gap-1.5">
            <label for="fecha-fin" class="text-xs font-medium text-slate-500">Hasta:</label>
            <input
              type="date"
              id="fecha-fin"
              v-model="fechaFin"
              class="px-2.5 py-1.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-slate-700"
            />
          </div>
          
          <!-- Botón Buscar -->
          <button
            @click="cargarDatos"
            :disabled="cargando"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-md transition-colors"
          >
            <svg v-if="!cargando" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <svg v-else class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ cargando ? 'Cargando...' : 'Buscar' }}</span>
          </button>
          
          <!-- Botón Excel -->
          <button
            @click="exportarAExcel"
            :disabled="datos.length === 0"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-md transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z"/>
            </svg>
            <span>Excel</span>
          </button>
        </div>
      </div>

      <!-- Tabla de datos -->
      <div class="overflow-auto relative bg-white rounded-lg shadow-sm border border-slate-300 flex-1" ref="tablaRef">
        <table ref="tableElementRef" class="w-full text-[11px] text-slate-700 border-separate border-spacing-0">
          <thead class="sticky top-0 z-20">
            <!-- Fila superior - Grupos -->
            <tr class="text-slate-500 text-[10px] uppercase tracking-wider">
              <th scope="col" rowspan="2" class="px-2 py-2 font-semibold text-center border-r-2 border-slate-300 border-b-2 border-b-slate-300 text-slate-700 bg-slate-50 sticky left-0 z-30 min-w-[55px]">Rolada</th>
              <th scope="col" colspan="3" class="px-2 py-1.5 font-semibold text-center border-r-2 border-slate-300 border-b border-b-slate-300 text-slate-700 bg-slate-50">Urdidora</th>
              <th scope="col" colspan="8" class="px-2 py-1.5 font-semibold text-center border-r-2 border-slate-300 border-b border-b-slate-300 text-slate-700 bg-slate-50">Índigo</th>
              <th scope="col" colspan="4" class="px-2 py-1.5 font-semibold text-center border-r-2 border-slate-300 border-b border-b-slate-300 text-slate-700 bg-slate-50">Tejeduría</th>
              <th scope="col" colspan="3" class="px-2 py-1.5 font-semibold text-center border-r-2 border-slate-300 border-b border-b-slate-300 text-slate-700 bg-slate-50">Calidad</th>
              <th scope="col" colspan="21" class="px-2 py-1.5 font-semibold text-center border-b border-b-slate-300 text-slate-700 bg-amber-50">Fibra HVI</th>
            </tr>
            <!-- Fila inferior - Columnas -->
            <tr class="text-slate-600 text-[10px] bg-slate-50">
              <!-- Urdidora -->
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[40px]">Maq</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px]">Lote</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r-2 border-slate-300 border-b-2 border-b-slate-300 min-w-[40px]">R10⁶</th>
              <!-- Índigo -->
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[70px]">Fecha</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[75px]">Base</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px]">Color</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[50px]">Metros</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px]">R10³</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[30px]">Cav</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px]">VNom</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r-2 border-slate-300 border-b-2 border-b-slate-300 min-w-[35px]">VPro</th>
              <!-- Tejeduría -->
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[50px]">Metros</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[40px]">Efi%</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[40px]">RU10⁵</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r-2 border-slate-300 border-b-2 border-b-slate-300 min-w-[40px]">RT10⁵</th>
              <!-- Calidad -->
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[50px]">Metros</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[40px]">Cal%</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r-2 border-slate-300 border-b-2 border-b-slate-300 min-w-[50px]">Pts100</th>
              <!-- Fibra HVI -->
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[40px] bg-amber-50">Mezc</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[70px] bg-amber-50">F.Ingr</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-blue-50" title="Índice de Color">SCI</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-blue-50" title="Humedad">MST</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-blue-50" title="Micronaire">MIC</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-blue-50" title="Madurez">MAT</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[40px] bg-green-50" title="Longitud media">UHML</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-green-50" title="Uniformidad">UI</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-green-50" title="Fibras cortas">SF</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-yellow-50" title="Resistencia">STR</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-yellow-50" title="Elongación">ELG</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-yellow-50" title="Reflectancia">RD</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-yellow-50" title="Amarillez">+b</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[40px] bg-purple-50">TrCNT</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[40px] bg-purple-50">TrAR</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[40px] bg-purple-50">TRID</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-orange-50">BCO</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-orange-50">GRI</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-orange-50">LG</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-r border-slate-200 border-b-2 border-b-slate-300 min-w-[35px] bg-orange-50">AMA</th>
              <th scope="col" class="px-1 py-1.5 font-medium text-center border-b-2 border-b-slate-300 min-w-[35px] bg-orange-50">LA</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in datosVisibles" :key="item.ROLADA" 
                class="border-b border-slate-200 hover:bg-slate-50/80 transition-colors">
              <!-- Rolada (sticky) -->
              <td class="px-2 py-2 font-semibold text-slate-800 text-center tabular-nums border-r-2 border-slate-300 bg-slate-50/50 sticky left-0 z-10">{{ item.ROLADA }}</td>
              <!-- Urdidora -->
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ item.MAQ_OE || '-' }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ item.LOTE || '-' }}</td>
              <td class="px-1 py-2 text-center text-emerald-600 font-semibold tabular-nums border-r-2 border-slate-300">{{ calcularRot106(item.URDIDORA_ROTURAS, item.URDIDORA_METROS, item.NUM_FIOS) }}</td>
              <!-- Índigo -->
              <td class="px-1 py-2 text-center text-slate-500 text-xs border-r border-slate-200">{{ item.FECHA || '-' }}</td>
              <td class="px-1 py-2 text-center text-slate-700 border-r border-slate-200 text-xs">{{ item.BASE || '-' }}</td>
              <td class="px-1 py-2 text-center text-slate-600 border-r border-slate-200">{{ item.COLOR || '-' }}</td>
              <td class="px-1 py-2 text-center text-slate-700 font-medium tabular-nums border-r border-slate-200">{{ formatNumber(item.MTS_IND, 0) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ formatNumber(item.R103, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ item.CAV || '-' }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ formatNumber(item.VEL_NOM, 0) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r-2 border-slate-300">{{ formatNumber(item.VEL_PROM, 0) }}</td>
              <!-- Tejeduría -->
              <td class="px-1 py-2 text-center text-slate-700 font-medium tabular-nums border-r border-slate-200">{{ formatNumber(item.MTS_CRUDOS, 0) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ formatNumber(item.EFI_TEJ, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ formatNumber(item.RU105, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r-2 border-slate-300">{{ formatNumber(item.RT105, 1) }}</td>
              <!-- Calidad -->
              <td class="px-1 py-2 text-center text-slate-700 font-medium tabular-nums border-r border-slate-200">{{ formatNumber(item.MTS_CAL, 0) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200">{{ formatNumber(item.CAL_PERCENT, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r-2 border-slate-300">{{ formatNumber(item.PTS_100M2, 1) }}</td>
              <!-- Fibra HVI -->
              <td class="px-1 py-2 text-center text-amber-700 font-semibold tabular-nums border-r border-slate-200 bg-amber-50/30">{{ item.MISTURA || '-' }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-amber-50/30 text-xs">{{ formatFechaIngreso(item.FECHA_INGRESO) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-blue-50/30">{{ formatNumber(item.SCI, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-blue-50/30">{{ formatNumber(item.MST, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-blue-50/30">{{ formatNumber(item.MIC, 2) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-blue-50/30">{{ formatNumber(item.MAT, 2) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-green-50/30">{{ formatNumber(item.UHML, 2) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-green-50/30">{{ formatNumber(item.UI, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-green-50/30">{{ formatNumber(item.SF, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-yellow-50/30">{{ formatNumber(item.STR, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-yellow-50/30">{{ formatNumber(item.ELG, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-yellow-50/30">{{ formatNumber(item.RD, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-yellow-50/30">{{ formatNumber(item.PLUS_B, 1) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-purple-50/30">{{ formatNumber(item.TrCNT, 0) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-purple-50/30">{{ formatNumber(item.TrAR, 2) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-purple-50/30">{{ formatNumber(item.TRID, 0) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-orange-50/30">{{ formatPercent(item.COLOR_BCO_PCT) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-orange-50/30">{{ formatPercent(item.COLOR_GRI_PCT) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-orange-50/30">{{ formatPercent(item.COLOR_LG_PCT) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums border-r border-slate-200 bg-orange-50/30">{{ formatPercent(item.COLOR_AMA_PCT) }}</td>
              <td class="px-1 py-2 text-center text-slate-600 tabular-nums bg-orange-50/30">{{ formatPercent(item.COLOR_LA_PCT) }}</td>
            </tr>
          </tbody>
          <!-- Fila de totales -->
          <tfoot v-if="totalesMes && datos.length > 0" class="sticky bottom-0 z-20 bg-slate-100">
            <tr class="font-semibold text-slate-700">
              <td class="px-2 py-2.5 text-center border-r-2 border-slate-300 border-t-2 border-t-slate-300 sticky left-0 bg-slate-100 z-10">
                <span class="text-xs uppercase tracking-wide text-slate-500">Total:</span>
                <span class="ml-1 text-slate-700">{{ totalesMes.TOTAL_ROLADAS }}</span>
              </td>
              <!-- Urdidora -->
              <td class="px-1 py-2.5 text-center text-slate-400 border-r border-slate-200 border-t-2 border-t-slate-300" colspan="2">-</td>
              <td class="px-1 py-2.5 text-center text-emerald-600 font-semibold tabular-nums border-r-2 border-slate-300 border-t-2 border-t-slate-300">{{ calcularRot106(totalesMes.URDIDORA_ROTURAS, totalesMes.URDIDORA_METROS, totalesMes.NUM_FIOS) }}</td>
              <!-- Índigo -->
              <td class="px-1 py-2.5 text-center text-slate-400 border-r border-slate-200 border-t-2 border-t-slate-300" colspan="3">-</td>
              <td class="px-1 py-2.5 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.MTS_IND, 0) }}</td>
              <td class="px-1 py-2.5 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.R103, 1) }}</td>
              <td class="px-1 py-2.5 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ totalesMes.CAV || '-' }}</td>
              <td class="px-1 py-2.5 text-center tabular-nums text-slate-400 border-r border-slate-200 border-t-2 border-t-slate-300">-</td>
              <td class="px-1 py-2.5 text-center tabular-nums border-r-2 border-slate-300 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.VEL_PROM, 0) }}</td>
              <!-- Tejeduría -->
              <td class="px-1 py-2.5 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.MTS_CRUDOS, 0) }}</td>
              <td class="px-1 py-2.5 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.EFI_TEJ, 1) }}</td>
              <td class="px-1 py-2.5 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.RU105, 1) }}</td>
              <td class="px-1 py-2.5 text-center tabular-nums border-r-2 border-slate-300 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.RT105, 1) }}</td>
              <!-- Calidad -->
              <td class="px-1 py-2.5 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.MTS_CAL, 0) }}</td>
              <td class="px-1 py-2.5 text-center tabular-nums border-r border-slate-200 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.CAL_PERCENT, 1) }}</td>
              <td class="px-1 py-2.5 text-center tabular-nums border-r-2 border-slate-300 border-t-2 border-t-slate-300">{{ formatNumber(totalesMes.PTS_100M2, 1) }}</td>
              <!-- Fibra HVI - Promedios no aplican para totales -->
              <td class="px-1 py-2.5 text-center text-slate-400 border-t-2 border-t-slate-300 bg-amber-50/20" colspan="21">-</td>
            </tr>
          </tfoot>
        </table>
        
        <!-- Mensaje cuando hay más filas de las mostradas -->
        <div v-if="!cargando && datos.length > 50 && !mostrarTodasFilas" class="flex items-center justify-center py-4 bg-amber-50 border-t border-amber-200">
          <div class="text-center">
            <p class="text-sm text-slate-700">
              Mostrando <span class="font-semibold">50</span> de <span class="font-semibold">{{ datos.length }}</span> roladas
            </p>
            <button 
              @click="mostrarTodasFilas = true"
              class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Mostrar todas las roladas ({{ datos.length }})
            </button>
          </div>
        </div>

        <div v-if="!cargando && datos.length === 0" class="flex items-center justify-center h-64 bg-white">
          <div class="text-center">
            <svg class="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-3 text-sm font-medium text-slate-700">No hay datos disponibles</h3>
            <p class="mt-1 text-xs text-slate-400">Seleccione un rango de fechas y haga clic en Buscar</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import * as ExcelJS from 'exceljs'

// Estados
const cargando = ref(false)
const datos = ref([])
const totalesMes = ref(null)
const fechaInicio = ref('')
const fechaFin = ref('')
const mostrarTodasFilas = ref(false)

// Computed para limitar filas iniciales (evitar bloqueo con datasets grandes)
const datosVisibles = computed(() => {
  // Si hay menos de 50 filas, mostrar todas
  if (datos.value.length <= 50 || mostrarTodasFilas.value) {
    return datos.value
  }
  // Si hay más de 50, mostrar solo las primeras 50
  return datos.value.slice(0, 50)
})

// Refs
const mainContentRef = ref(null)
const tablaRef = ref(null)
const tableElementRef = ref(null)

// Configuración del API
const API_BASE = import.meta.env.VITE_API_URL || ''

// Funciones de formato
const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || value === '') return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return '-'
  return num.toLocaleString('es-MX', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })
}

const formatPercent = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return '-'
  if (num === 0) return '-'
  return num.toFixed(1)
}

const formatFechaIngreso = (fecha) => {
  if (!fecha) return '-'
  // La fecha viene en formato DD/MM/YYYY del CSV
  return fecha
}

const calcularRot106 = (roturas, metros, numFios) => {
  if (!roturas || !metros || !numFios) return '-'
  const rot = parseFloat(roturas)
  const mts = parseFloat(metros)
  const fios = parseFloat(numFios)
  if (isNaN(rot) || isNaN(mts) || isNaN(fios) || mts === 0 || fios === 0) return '-'
  const result = (rot * 1000000) / (mts * fios)
  return result.toFixed(1)
}

// Cargar datos desde API
const cargarDatos = async () => {
  if (!fechaInicio.value || !fechaFin.value) {
    alert('Seleccione fecha de inicio y fin')
    return
  }
  
  cargando.value = true
  mostrarTodasFilas.value = false // Resetear al cargar nuevos datos
  
  try {
    const url = `${API_BASE}/api/seguimiento-roladas-fibra?fechaInicio=${fechaInicio.value}&fechaFin=${fechaFin.value}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`)
    }
    
    const result = await response.json()
    datos.value = result.datos || []
    totalesMes.value = result.totales || null
    
  } catch (error) {
    console.error('Error cargando datos:', error)
    alert('Error al cargar datos: ' + error.message)
  } finally {
    cargando.value = false
  }
}

// Exportar a Excel con formato profesional
const exportarAExcel = async () => {
  if (datos.value.length === 0) return
  
  // Mostrar indicador de que se está procesando
  cargando.value = true
  
  try {
    // Usar setTimeout para dar tiempo al navegador de actualizar la UI
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Roladas + Fibra HVI')
    
    // Configurar orientación y márgenes
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.1968,
        right: 0.1968,
        top: 0.3937,
        bottom: 0.3937,
        header: 0.1968,
        footer: 0.1968
      }
    }
    
    // Crear dos filas de encabezado
    // Fila 1: Grupos
    worksheet.addRow([
      'Rolada', 
      'URDIDORA', '', '', 
      'ÍNDIGO', '', '', '', '', '', '', '', 
      'TEJEDURÍA', '', '', '', 
      'CALIDAD', '', '',
      'FIBRA HVI', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ])
    // Fila 2: Columnas individuales
    worksheet.addRow([
      '', 
      'Maq. OE', 'Lote', 'Rot 10⁶', 
      'Fecha', 'Base', 'Color', 'Metros', 'R10³', 'Cav', 'Vel.Nom', 'Vel.Prom', 
      'Metros', 'Efic.%', 'RU10⁵', 'RT10⁵', 
      'Metros', 'Cal.%', 'Pts/100m²',
      'Mezcla', 'F.Ingreso', 'SCI', 'MST', 'MIC', 'MAT', 'UHML', 'UI', 'SF', 'STR', 'ELG', 'RD', '+b', 'TrCNT', 'TrAR', 'TRID', 'BCO%', 'GRI%', 'LG%', 'AMA%', 'LA%'
    ])
    
    // Combinar celdas de la primera fila
    worksheet.mergeCells('A1:A2')   // Rolada
    worksheet.mergeCells('B1:D1')   // Urdidora
    worksheet.mergeCells('E1:L1')   // Índigo
    worksheet.mergeCells('M1:P1')   // Tejeduría
    worksheet.mergeCells('Q1:S1')   // Calidad
    worksheet.mergeCells('T1:AN1')  // Fibra HVI
    
    // Estilo de encabezados - Primera fila (grupos)
    const headerRow1 = worksheet.getRow(1)
    headerRow1.height = 20
    headerRow1.font = { bold: true, size: 10 }
    headerRow1.alignment = { vertical: 'middle', horizontal: 'center' }
    
    // Aplicar colores a la primera fila
    headerRow1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    headerRow1.getCell(1).value = 'Rolada'
    headerRow1.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }
    headerRow1.getCell(2).value = 'URDIDORA'
    headerRow1.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
    headerRow1.getCell(5).value = 'ÍNDIGO'
    headerRow1.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }
    headerRow1.getCell(13).value = 'TEJEDURÍA'
    headerRow1.getCell(17).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
    headerRow1.getCell(17).value = 'CALIDAD'
    headerRow1.getCell(20).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }
    headerRow1.getCell(20).value = 'FIBRA HVI'
    
    // Bordes para la primera fila
    headerRow1.getCell(1).border = {
      right: { style: 'medium', color: { argb: 'FF64748B' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    }
    headerRow1.getCell(2).border = {
      right: { style: 'medium', color: { argb: 'FF64748B' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    }
    headerRow1.getCell(5).border = {
      right: { style: 'medium', color: { argb: 'FF64748B' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    }
    headerRow1.getCell(13).border = {
      right: { style: 'medium', color: { argb: 'FF64748B' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    }
    headerRow1.getCell(17).border = {
      right: { style: 'medium', color: { argb: 'FF64748B' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    }
    headerRow1.getCell(20).border = {
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    }
    
    // Estilo de encabezados - Segunda fila (columnas)
    const headerRow2 = worksheet.getRow(2)
    headerRow2.height = 30
    headerRow2.font = { bold: false, size: 9 }
    headerRow2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    
    // Columnas que marcan fin de sección: 1(Rolada), 4(Urdidora), 12(Índigo), 16(Tejeduría), 19(Calidad), 40(Fibra HVI)
    const sectionEnds = [1, 4, 12, 16, 19]
    
    // Aplicar estilo y bordes a cada celda de la segunda fila
    for (let col = 1; col <= 40; col++) {
      const cell = headerRow2.getCell(col)
      
      // Color de fondo según la sección
      if (col >= 20 && col <= 40) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } } // Amarillo claro para Fibra HVI
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      }
      
      let rightBorder = { style: 'thin', color: { argb: 'FFE2E8F0' } }
      if (sectionEnds.includes(col)) {
        rightBorder = { style: 'medium', color: { argb: 'FF64748B' } }
      }
      
      cell.border = {
        right: rightBorder,
        bottom: { style: 'medium', color: { argb: 'FF94A3B8' } }
      }
    }
    
    // Ajustar anchos de columnas
    worksheet.columns = [
      { key: 'ROLADA', width: 7 },
      { key: 'MAQ_OE', width: 10 },
      { key: 'LOTE', width: 10 },
      { key: 'ROT_106', width: 8 },
      { key: 'FECHA', width: 10 },
      { key: 'BASE', width: 12 },
      { key: 'COLOR', width: 7 },
      { key: 'MTS_IND', width: 9 },
      { key: 'R103', width: 7 },
      { key: 'CAV', width: 4 },
      { key: 'VEL_NOM', width: 7 },
      { key: 'VEL_PROM', width: 7 },
      { key: 'MTS_CRUDOS', width: 9 },
      { key: 'EFI_TEJ', width: 7 },
      { key: 'RU105', width: 8 },
      { key: 'RT105', width: 8 },
      { key: 'MTS_CAL', width: 9 },
      { key: 'CAL_PERCENT', width: 7 },
      { key: 'PTS_100M2', width: 8 },
      // Fibra HVI
      { key: 'MEZCLA', width: 8 },
      { key: 'F_INGRESO', width: 10 },
      { key: 'SCI', width: 6 },
      { key: 'MST', width: 6 },
      { key: 'MIC', width: 6 },
      { key: 'MAT', width: 6 },
      { key: 'UHML', width: 7 },
      { key: 'UI', width: 6 },
      { key: 'SF', width: 6 },
      { key: 'STR', width: 6 },
      { key: 'ELG', width: 6 },
      { key: 'RD', width: 6 },
      { key: 'PLUS_B', width: 6 },
      { key: 'TrCNT', width: 6 },
      { key: 'TrAR', width: 6 },
      { key: 'TRID', width: 6 },
      { key: 'BCO', width: 6 },
      { key: 'GRI', width: 6 },
      { key: 'LG', width: 6 },
      { key: 'AMA', width: 6 },
      { key: 'LA', width: 6 }
    ]
    
    // Agregar datos
    datos.value.forEach(item => {
      const row = worksheet.addRow({
        ROLADA: item.ROLADA,
        MAQ_OE: item.MAQ_OE || '',
        LOTE: item.LOTE || '',
        ROT_106: calcularRot106(item.URDIDORA_ROTURAS, item.URDIDORA_METROS, item.NUM_FIOS),
        FECHA: item.FECHA || '',
        BASE: item.BASE || '',
        COLOR: item.COLOR || '',
        MTS_IND: item.MTS_IND || '',
        R103: item.R103 || '',
        CAV: item.CAV || '',
        VEL_NOM: item.VEL_NOM || '',
        VEL_PROM: item.VEL_PROM || '',
        MTS_CRUDOS: item.MTS_CRUDOS || '',
        EFI_TEJ: item.EFI_TEJ || '',
        RU105: item.RU105 || '',
        RT105: item.RT105 || '',
        MTS_CAL: item.MTS_CAL || '',
        CAL_PERCENT: item.CAL_PERCENT || '',
        PTS_100M2: item.PTS_100M2 || '',
        // Fibra HVI
        MEZCLA: item.MISTURA || '',
        F_INGRESO: item.FECHA_INGRESO || '',
        SCI: item.SCI || '',
        MST: item.MST || '',
        MIC: item.MIC || '',
        MAT: item.MAT || '',
        UHML: item.UHML || '',
        UI: item.UI || '',
        SF: item.SF || '',
        STR: item.STR || '',
        ELG: item.ELG || '',
        RD: item.RD || '',
        PLUS_B: item.PLUS_B || '',
        TrCNT: item.TrCNT || '',
        TrAR: item.TrAR || '',
        TRID: item.TRID || '',
        BCO: item.COLOR_BCO_PCT || '',
        GRI: item.COLOR_GRI_PCT || '',
        LG: item.COLOR_LG_PCT || '',
        AMA: item.COLOR_AMA_PCT || '',
        LA: item.COLOR_LA_PCT || ''
      })
      
      row.height = 16
      row.alignment = { vertical: 'middle', horizontal: 'center' }
      row.font = { size: 9 }
      
      // Bordes y colores de fondo para cada celda
      const rowIndex = row.number
      const bgColor = rowIndex % 2 === 1 ? 'FFFFFFFF' : 'FFF8FAFC'
      const hviColor = rowIndex % 2 === 1 ? 'FFFFFEF8' : 'FFFFFBEB'
      
      for (let col = 1; col <= 40; col++) {
        const cell = row.getCell(col)
        
        // Color de fondo - amarillo claro para columnas de Fibra HVI
        if (col >= 20) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hviColor } }
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
        }
        
        let rightBorder = { style: 'thin', color: { argb: 'FFE2E8F0' } }
        if (sectionEnds.includes(col)) {
          rightBorder = { style: 'medium', color: { argb: 'FF64748B' } }
        }
        
        cell.border = {
          right: rightBorder,
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        }
      }
      
      // Primera columna en negrita
      row.getCell(1).font = { bold: true, size: 9 }
      
      // Formato numérico para columnas estándar
      row.getCell('MTS_IND').numFmt = '#,##0'
      row.getCell('R103').numFmt = '0.0'
      row.getCell('VEL_NOM').numFmt = '0'
      row.getCell('VEL_PROM').numFmt = '0'
      row.getCell('MTS_CRUDOS').numFmt = '#,##0'
      row.getCell('EFI_TEJ').numFmt = '0.0'
      row.getCell('RU105').numFmt = '0.0'
      row.getCell('RT105').numFmt = '0.0'
      row.getCell('MTS_CAL').numFmt = '#,##0'
      row.getCell('CAL_PERCENT').numFmt = '0.0'
      row.getCell('PTS_100M2').numFmt = '0.0'
      row.getCell('ROT_106').numFmt = '0.00'
      
      // Formato numérico para Fibra HVI
      row.getCell('SCI').numFmt = '0.0'
      row.getCell('MST').numFmt = '0.0'
      row.getCell('MIC').numFmt = '0.00'
      row.getCell('MAT').numFmt = '0.00'
      row.getCell('UHML').numFmt = '0.00'
      row.getCell('UI').numFmt = '0.0'
      row.getCell('SF').numFmt = '0.0'
      row.getCell('STR').numFmt = '0.0'
      row.getCell('ELG').numFmt = '0.0'
      row.getCell('RD').numFmt = '0.0'
      row.getCell('PLUS_B').numFmt = '0.0'
      row.getCell('TrCNT').numFmt = '0'
      row.getCell('TrAR').numFmt = '0.00'
      row.getCell('TRID').numFmt = '0'
      row.getCell('BCO').numFmt = '0.0'
      row.getCell('GRI').numFmt = '0.0'
      row.getCell('LG').numFmt = '0.0'
      row.getCell('AMA').numFmt = '0.0'
      row.getCell('LA').numFmt = '0.0'
      
      // Colores especiales para valores destacados
      row.getCell('ROT_106').font = { size: 9, color: { argb: 'FF059669' }, bold: true }
      row.getCell('R103').font = { size: 9, color: { argb: 'FF2563EB' }, bold: true }
      row.getCell('EFI_TEJ').font = { size: 9, color: { argb: 'FF7C3AED' }, bold: true }
      row.getCell('CAL_PERCENT').font = { size: 9, color: { argb: 'FFB45309' }, bold: true }
      row.getCell('SCI').font = { size: 9, color: { argb: 'FF0369A1' }, bold: true }
      row.getCell('MEZCLA').font = { size: 9, color: { argb: 'FFB45309' }, bold: true }
    })
    
    // Generar archivo y descargar
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '')
    link.download = `Roladas_Fibra_HVI_${fechaInicio.value}_${fechaFin.value}_${hhmmss}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    
  } catch (error) {
    console.error('Error exportando a Excel:', error)
    alert('Error al exportar: ' + error.message)
  } finally {
    cargando.value = false
  }
}

// Inicializar fechas por defecto (últimos 30 días)
onMounted(() => {
  const hoy = new Date()
  const hace30Dias = new Date()
  hace30Dias.setDate(hoy.getDate() - 30)
  
  fechaFin.value = hoy.toISOString().split('T')[0]
  fechaInicio.value = hace30Dias.toISOString().split('T')[0]
})
</script>

<style scoped>
/* Estilos para mejorar la visualización de la tabla */
table {
  font-variant-numeric: tabular-nums;
}
</style>
