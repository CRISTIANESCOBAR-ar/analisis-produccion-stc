<template>
  <div class="w-full h-screen flex flex-col p-1">
    <main class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col">
      <!-- Header con filtros -->
      <div v-if="!articuloSeleccionado" class="flex items-center justify-between gap-4 flex-shrink-0 mb-2">
        <h3 class="text-lg font-semibold text-slate-800">Análisis de Mesa de Test</h3>
        
        <div class="relative flex-1 max-w-md mx-4">
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              v-model="filtroTexto" 
              type="text" 
              placeholder="Buscar por artículo, nombre, color o trama..." 
              class="w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <button 
              v-if="filtroTexto" 
              @click="filtroTexto = ''" 
              class="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
              v-tippy="'Limpiar búsqueda'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <input 
              v-model="filtroEnProduccion" 
              type="checkbox" 
              id="chkEnProduccion"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label for="chkEnProduccion" class="text-sm text-slate-600 cursor-pointer select-none">En Producción</label>
          </div>
          <CustomDatepicker 
            v-model="fechaInicial" 
            label="Desde:" 
            :show-buttons="false"
            @change="cargarListaArticulos" 
          />
          <CustomDatepicker 
            v-model="fechaFinal" 
            label="Hasta:" 
            :show-buttons="false"
            @change="cargarListaArticulos" 
          />
        </div>
      </div>

      <!-- Lista de Artículos (vista principal) -->
      <div v-if="!articuloSeleccionado" class="flex-1 min-h-0 flex flex-col">


        <!-- Tabla de artículos -->
        <div class="overflow-auto _minimal-scroll w-full flex-1 min-h-0 rounded-xl border border-slate-200 pb-0">
          <table class="min-w-full w-full table-auto divide-y divide-slate-200 text-xs">
            <thead class="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-20">
              <tr>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">
                  <button class="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-700" @click="toggleSort('Articulo')" v-tippy="'Ordenar por Artículo'">
                    <span>Artículo</span>
                      <svg v-if="sortDirFor('Articulo') === 'asc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true">
                        <g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M9 6 L15 12 L9 18"/>
                        </g>
                      </svg>
                      <svg v-else-if="sortDirFor('Articulo') === 'desc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true">
                        <g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M15 6 L9 12 L15 18"/>
                        </g>
                      </svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-400 opacity-60 group-hover:opacity-80 transition-all" aria-hidden="true">
                        <g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M9 6 L3 12 L9 18"/>
                          <path d="M15 6 L21 12 L15 18"/>
                        </g>
                      </svg>
                  </button>
                </th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">
                  <button class="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-700" @click="toggleSort('Color')" v-tippy="'Ordenar por Color'">
                    <span>Color</span>
                      <svg v-if="sortDirFor('Color') === 'asc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L15 12 L9 18"/></g></svg>
                      <svg v-else-if="sortDirFor('Color') === 'desc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6 L9 12 L15 18"/></g></svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-400 opacity-60 group-hover:opacity-80 transition-all" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L3 12 L9 18"/><path d="M15 6 L21 12 L15 18"/></g></svg>
                  </button>
                </th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">
                  <button class="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-700" @click="toggleSort('Id')" v-tippy="'Ordenar por ID'">
                    <span>ID</span>
                    <svg v-if="sortDirFor('Id')==='asc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L15 12 L9 18"/></g></svg>
                    <svg v-else-if="sortDirFor('Id')==='desc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6 L9 12 L15 18"/></g></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-400 opacity-60 group-hover:opacity-80 transition-all" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L3 12 L9 18"/><path d="M15 6 L21 12 L15 18"/></g></svg>
                  </button>
                </th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">
                  <button class="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-700" @click="toggleSort('Nombre')" v-tippy="'Ordenar por Nombre'">
                    <span>Nombre</span>
                    <svg v-if="sortDirFor('Nombre')==='asc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L15 12 L9 18"/></g></svg>
                    <svg v-else-if="sortDirFor('Nombre')==='desc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6 L9 12 L15 18"/></g></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-400 opacity-60 group-hover:opacity-80 transition-all" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L3 12 L9 18"/><path d="M15 6 L21 12 L15 18"/></g></svg>
                  </button>
                </th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">
                  <button class="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-700" @click="toggleSort('Trama')" v-tippy="'Ordenar por Trama'">
                    <span>Trama</span>
                    <svg v-if="sortDirFor('Trama')==='asc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L15 12 L9 18"/></g></svg>
                    <svg v-else-if="sortDirFor('Trama')==='desc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6 L9 12 L15 18"/></g></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-400 opacity-60 group-hover:opacity-80 transition-all" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L3 12 L9 18"/><path d="M15 6 L21 12 L15 18"/></g></svg>
                  </button>
                </th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">
                  <button class="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-700" @click="toggleSort('Metros_TEST')" v-tippy="'Ordenar por Metros TEST'">
                    <span>Metros TEST</span>
                      <svg v-if="sortDirFor('Metros_TEST') === 'asc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L15 12 L9 18"/></g></svg>
                      <svg v-else-if="sortDirFor('Metros_TEST') === 'desc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6 L9 12 L15 18"/></g></svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-400 opacity-60 group-hover:opacity-80 transition-all" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L3 12 L9 18"/><path d="M15 6 L21 12 L15 18"/></g></svg>
                  </button>
                </th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">
                  <button class="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-700" @click="toggleSort('Metros_REV')" v-tippy="'Ordenar por Metros REV'">
                    <span>Metros REV</span>
                    <svg v-if="sortDirFor('Metros_REV')==='asc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L15 12 L9 18"/></g></svg>
                    <svg v-else-if="sortDirFor('Metros_REV')==='desc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6 L9 12 L15 18"/></g></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-400 opacity-60 group-hover:opacity-80 transition-all" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L3 12 L9 18"/><path d="M15 6 L21 12 L15 18"/></g></svg>
                  </button>
                </th>
                <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">
                  <button class="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-700" @click="toggleSort('Prod')" v-tippy="'Ordenar por Producción'">
                    <span>Prod.</span>
                    <svg v-if="sortDirFor('Prod')==='asc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L15 12 L9 18"/></g></svg>
                    <svg v-else-if="sortDirFor('Prod')==='desc'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-700 transition-colors" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6 L9 12 L15 18"/></g></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 text-slate-400 opacity-60 group-hover:opacity-80 transition-all" aria-hidden="true"><g transform="rotate(90 12 12)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L3 12 L9 18"/><path d="M15 6 L21 12 L15 18"/></g></svg>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingLista">
                <td colspan="8" class="px-2 py-[0.3rem] text-center text-slate-500">
                  <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-blue-600"></div>
                  <p class="mt-2">Cargando artículos...</p>
                </td>
              </tr>
              <tr v-else-if="articulosFiltrados.length === 0">
                <td colspan="8" class="px-2 py-[0.3rem] text-center text-slate-500">
                  No hay artículos disponibles para la fecha seleccionada
                </td>
              </tr>
              <tr 
                v-else
                v-for="item in articulosFiltrados" 
                :key="item.ARTIGO_COMPLETO"
                @click="seleccionarArticulo(item)"
                class="border-t border-slate-100 hover:bg-blue-50/30 transition-colors duration-150 cursor-pointer"
              >
                <td class="px-2 py-[0.3rem] text-center text-slate-700 font-mono">{{ item.Articulo }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ item.Color || '-' }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700 font-semibold">{{ item.Id || '-' }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ item.Nombre || '-' }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ item.Trama || '-' }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700 font-mono">{{ formatNumber(item.Metros_TEST) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700 font-mono">{{ formatNumber(item.Metros_REV) }}</td>
                <td class="px-2 py-[0.3rem] text-center text-slate-700">{{ item.Prod || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Vista de Gráfico (cuando se selecciona un artículo) -->
      <div v-else class="flex-1 min-h-0 flex flex-col relative overflow-hidden group/container">
        <!-- Trigger Area (siempre visible en el borde superior) -->
        <div class="absolute top-0 left-0 right-0 h-4 z-40 peer bg-transparent transition-colors flex justify-center cursor-pointer">
          <div class="w-24 h-1 bg-slate-300 rounded-b-full shadow-sm opacity-50 hover:opacity-100 transition-opacity"></div>
        </div>

        <!-- Toolbar Flotante -->
        <div class="absolute top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur shadow-md border-b border-slate-200 px-3 py-2 transition-transform duration-300 transform -translate-y-full peer-hover:translate-y-0 hover:translate-y-0 flex flex-nowrap items-center gap-2">
          <button 
            @click="volverALista" 
            class="p-1.5 bg-slate-600 text-white rounded-md hover:bg-slate-700 flex items-center justify-center transition-colors flex-shrink-0"
            v-tippy="'Volver a Lista'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          <div class="flex-1 flex flex-nowrap items-center gap-2">
            <CustomDatepicker 
              v-model="fechaInicial" 
              label="Inicio:" 
              :show-buttons="false"
            />

            <CustomDatepicker 
              v-model="fechaFinal" 
              label="Hasta:" 
              :show-buttons="false"
            />

            <div class="flex items-center gap-1.5">
              <label class="text-xs text-slate-600 font-medium whitespace-nowrap">Métrica:</label>
              <select v-model="metricaActiva" class="px-2 py-1.5 border border-slate-300 rounded-md text-sm max-w-[180px] truncate">
                <option v-for="m in metricas" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>

            <div class="flex items-center gap-1.5">
              <label class="text-xs text-slate-600 font-medium whitespace-nowrap">Aprob:</label>
              <select v-model="filtroAprobacion" class="px-2 py-1.5 border border-slate-300 rounded-md text-sm max-w-[100px]">
                <option value="A">Aprobado</option>
                <option value="R">Reprobado</option>
                <option value="all">Todos</option>
              </select>
            </div>

            <div class="flex items-center gap-1.5">
              <label class="text-xs text-slate-600 font-medium whitespace-nowrap">Repr:</label>
              <select v-model="filtroReproceso" class="px-2 py-1.5 border border-slate-300 rounded-md text-sm max-w-[120px]">
                <option value="sin">Sin Reprocesos</option>
                <option value="con">Con Reprocesos</option>
                <option value="all">Todos</option>
              </select>
            </div>
            
            <button 
              @click="loadData" 
              class="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center flex-shrink-0 ml-auto"
              :disabled="loading"
              v-tippy="'Actualizar Gráfico'"
            >
              <svg v-if="loading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Contenido Principal -->
        <div class="flex-1 min-h-0 flex flex-col pt-2">
          <!-- Indicador de carga del gráfico -->
          <div v-if="loading" class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-blue-600"></div>
              <p class="mt-3 text-sm text-slate-600">Cargando datos del gráfico...</p>
            </div>
          </div>

          <!-- Error -->
          <div v-else-if="error" class="flex-1 flex items-center justify-center">
            <div class="text-center p-6 bg-red-50 border border-red-200 rounded-md max-w-md">
              <div class="text-red-700 font-semibold mb-2">Error al cargar datos</div>
              <div class="text-red-600 text-sm">{{ error }}</div>
              <button @click="loadData" class="mt-4 px-4 py-2 bg-red-600 text-white rounded text-sm">
                Reintentar
              </button>
            </div>
          </div>

          <!-- Gráfico -->
          <div v-else-if="datos.length > 0" class="flex-1 min-h-0 flex flex-col">
            <!-- Stats resumen -->
            <div class="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-md flex items-center gap-6 text-sm flex-shrink-0">
              <div class="font-semibold text-slate-700">{{ articuloSeleccionado.Articulo }} - {{ articuloSeleccionado.Nombre || 'Sin nombre' }}</div>
              <div class="text-slate-600"><span class="font-semibold">Total ensayos:</span> {{ datosGrafico.length }}</div>
              <div class="text-slate-600"><span class="font-semibold">Período:</span> {{ periodoTexto }}</div>
            </div>

            <!-- Canvas para Chart.js -->
            <div class="flex-1 min-h-0 relative" style="min-height: 400px;">
              <canvas ref="chartCanvas" style="max-height: 100%;"></canvas>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
// Force refresh
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import CustomDatepicker from './CustomDatepicker.vue'
import { Chart, registerables } from 'chart.js'

// Registrar todos los componentes de Chart.js
Chart.register(...registerables)

const API_BASE = 'http://localhost:3002'

// Estado reactivo - Lista de artículos
const listaArticulos = ref([])
const loadingLista = ref(false)
// Ordenación multi-columna: lista de criterios [{ key, dir }]
const sortState = ref([{ key: 'Nombre', dir: 'asc' }]) // dir: 'asc' | 'desc'
const filtroTexto = ref('')
const filtroEnProduccion = ref(true)
const articuloSeleccionado = ref(null)

// Estado reactivo - Gráfico
const fechaInicial = ref('2024-01-01') // Fecha inicial por defecto
const fechaFinal = ref(new Date().toISOString().split('T')[0]) // Hoy
const metricaActiva = ref('Ancho_MESA')
const filtroAprobacion = ref('A') // 'A', 'R', 'all'
const filtroReproceso = ref('sin') // 'sin', 'con', 'all'
const datos = ref([])
const loading = ref(false)
const error = ref(null)
const chartCanvas = ref(null)
let chartInstance = null

// Métricas disponibles con campos MIN/STD/MAX
const metricas = [
  { label: 'Ancho - Mesa de Revisión', value: 'Ancho_MESA', min: 'Ancho_MIN', std: 'Ancho_STD', max: 'Ancho_MAX' },
  { label: 'Peso - Mesa de Revisión', value: 'Peso_MESA', min: 'Peso_MIN', std: 'Peso_STD', max: 'Peso_MAX' },
  { label: 'Ancho [cm] - Mesa de TEST', value: 'Ancho_TEST', min: 'Ancho_MIN', std: 'Ancho_STD', max: 'Ancho_MAX' },
  { label: 'Peso [gr/m²] - Mesa de TEST', value: 'Peso_TEST', min: 'Peso_MIN', std: 'Peso_STD', max: 'Peso_MAX' },
  { label: 'Potencial [%] - Mesa de TEST', value: 'Potencial', min: null, std: 'Potencial_STD', max: null },
  { label: 'Encogimiento Urdimbre %', value: 'ENC_URD_%', min: 'ENC_URD_MIN_%', std: 'ENC_URD_STD_%', max: 'ENC_URD_MAX_%' },
  { label: 'Encogimiento Trama %', value: 'ENC_TRA_%', min: 'ENC_TRA_MIN_%', std: 'ENC_TRA_STD_%', max: 'ENC_TRA_MAX_%' },
  { label: 'SK1 [%] - Mesa de TEST', value: '%_SK1', min: 'Skew_MIN', std: 'Skew_STD', max: 'Skew_MAX' },
  { label: 'SK2 [%] - Mesa de TEST', value: '%_SK2', min: 'Skew_MIN', std: 'Skew_STD', max: 'Skew_MAX' },
  { label: 'SK3 [%] - Mesa de TEST', value: '%_SK3', min: 'Skew_MIN', std: 'Skew_STD', max: 'Skew_MAX' },
  { label: 'SK4 [%] - Mesa de TEST', value: '%_SK4', min: 'Skew_MIN', std: 'Skew_STD', max: 'Skew_MAX' },
  { label: 'Skew %', value: '%_SKE', min: 'Skew_MIN', std: 'Skew_STD', max: 'Skew_MAX' },
  { label: 'Variación Stretch Trama %', value: '%_STT', min: '%_STT_MIN', std: '%_STT_STD', max: '%_STT_MAX' },
  { label: 'Pasadas Terminadas', value: 'Pasadas_Terminadas', min: 'Pasadas_MIN', std: 'Pasadas_STD', max: 'Pasadas_MAX' },
  { label: 'MESA de REVISIÓN - Peso [Oz/Yd²]', value: 'Peso_MESA_OzYd²', min: 'Peso_MIN_OzYd²', std: 'Peso_STD_OzYd²', max: 'Peso_MAX_OzYd²' }
]

// Computed: datos filtrados para el gráfico
const datosGrafico = computed(() => {
  return datos.value.filter(d => {
    // Filtro Aprobación
    if (filtroAprobacion.value !== 'all') {
      if (d.Ap !== filtroAprobacion.value) return false
    }

    // Filtro Reproceso
    if (filtroReproceso.value === 'sin') {
      // Sin reproceso: R es vacío o null
      if (d.R && d.R.trim() === 'R') return false
    } else if (filtroReproceso.value === 'con') {
      // Con reproceso: R es 'R'
      if (!d.R || d.R.trim() !== 'R') return false
    }
    // 'all' no filtra nada

    return true
  })
})

// Computed: artículos filtrados y ordenados
const articulosFiltrados = computed(() => {
  let lista = [...listaArticulos.value]
  
  // Filtrar por texto
  if (filtroTexto.value) {
    const buscar = filtroTexto.value.toLowerCase()
    lista = lista.filter(item => 
      (item.Articulo || '').toLowerCase().includes(buscar) ||
      (item.Nombre || '').toLowerCase().includes(buscar) ||
      (item.Color || '').toLowerCase().includes(buscar) ||
      (item.Trama || '').toLowerCase().includes(buscar)
    )
  }

  // Filtrar por En Producción
  if (filtroEnProduccion.value) {
    lista = lista.filter(item => item.Prod === 'S')
  }
  
  // Ordenar por múltiples columnas según sortState
  if (sortState.value.length > 0) {
    lista.sort((a, b) => {
      for (const { key, dir } of sortState.value) {
        const aVal = a[key]
        const bVal = b[key]
        let cmp = 0
        if (key === 'Metros_TEST' || key === 'Metros_REV' || key === 'Id') {
          const aNum = Number(aVal || 0)
          const bNum = Number(bVal || 0)
          cmp = aNum - bNum
        } else {
          const aStr = (aVal ?? '').toString()
          const bStr = (bVal ?? '').toString()
          cmp = aStr.localeCompare(bStr)
        }
        if (cmp !== 0) {
          return dir === 'asc' ? cmp : -cmp
        }
      }
      return 0
    })
  }
  
  return lista
})
// Manejo de clic en encabezado para ordenar (ASC -> DESC -> null)
const toggleSort = (key) => {
  const idx = sortState.value.findIndex(s => s.key === key)
  if (idx === -1) {
    // agregar como asc al final
    sortState.value.push({ key, dir: 'asc' })
    return
  }
  const current = sortState.value[idx]
  if (current.dir === 'asc') {
    sortState.value[idx] = { key, dir: 'desc' }
  } else {
    // quitar (estado none)
    sortState.value.splice(idx, 1)
  }
}

const sortDirFor = (key) => {
  const s = sortState.value.find(x => x.key === key)
  return s ? s.dir : null
}

// Computed: texto del período
const periodoTexto = computed(() => {
  if (datosGrafico.value.length === 0) return '-'
  const fechas = datosGrafico.value.map(d => d.Fecha).filter(Boolean).sort()
  if (fechas.length === 0) return '-'
  const primera = formatFechaCorta(fechas[0])
  const ultima = formatFechaCorta(fechas[fechas.length - 1])
  return primera === ultima ? primera : `${primera} - ${ultima}`
})

// Helper: formatea 'YYYY-MM-DD' a 'dd/mm/yy' para ejes/tooltip
const formatFechaCorta = (iso) => {
  if (!iso || typeof iso !== 'string') return '-'
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  const [y, m, d] = parts
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y.slice(-2)}`
}

// Función para formatear números con separador de miles
const formatNumber = (num) => {
  if (!num && num !== 0) return '-'
  return num.toLocaleString('es-ES')
}

// Función para cargar lista de artículos
const cargarListaArticulos = async () => {
  if (!fechaInicial.value) {
    error.value = 'Debes ingresar una fecha inicial'
    return
  }

  loadingLista.value = true

  try {
    let url = `${API_BASE}/api/articulos-mesa-test?fecha_inicial=${fechaInicial.value}`
    if (fechaFinal.value) {
      url += `&fecha_final=${fechaFinal.value}`
    }
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Error HTTP: ${response.status}`)
    }

    const data = await response.json()
    listaArticulos.value = data
    console.log(`Cargados ${data.length} artículos`)

  } catch (err) {
    console.error('Error cargando lista de artículos:', err)
    error.value = err.message
    listaArticulos.value = []
  } finally {
    loadingLista.value = false
  }
}

// Función para seleccionar un artículo y mostrar su gráfico
const seleccionarArticulo = (item) => {
  articuloSeleccionado.value = item
  loadData()
}

// Función para volver a la lista
const volverALista = () => {
  articuloSeleccionado.value = null
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
  datos.value = []
}

// Función para cargar datos del gráfico desde la API
const loadData = async () => {
  if (!articuloSeleccionado.value || !fechaInicial.value) {
    error.value = 'Debes seleccionar un artículo'
    return
  }
  
  const articulo = articuloSeleccionado.value.ARTIGO_COMPLETO

  // Destruir gráfico existente antes de cargar nuevos datos
  if (chartInstance) {
    console.log('Destruyendo gráfico anterior...')
    chartInstance.destroy()
    chartInstance = null
  }

  loading.value = true
  error.value = null

  try {
    let url = `${API_BASE}/api/analisis-mesa-test?articulo=${encodeURIComponent(articulo)}&fecha_inicial=${fechaInicial.value}`
    if (fechaFinal.value) {
      url += `&fecha_final=${fechaFinal.value}`
    }
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Error HTTP: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data || data.length === 0) {
      error.value = `No se encontraron datos para el artículo "${articulo}" en el período seleccionado`
      datos.value = []
      return
    }
    
    datos.value = data
    loading.value = false
    
    // Esperar a que Vue actualice el DOM con múltiples ticks
    await nextTick()
    await nextTick()
    
    // Intentar hasta 5 veces con timeout si el canvas no está listo
    let intentos = 0
    while (!chartCanvas.value && intentos < 5) {
      console.log(`Esperando canvas... intento ${intentos + 1}`)
      await new Promise(resolve => setTimeout(resolve, 100))
      intentos++
    }
    
    if (!chartCanvas.value) {
      console.error('Canvas no disponible después de 5 intentos')
      error.value = 'Error: No se pudo inicializar el área del gráfico'
      return
    }
    
    renderChart()

  } catch (err) {
    console.error('Error cargando datos:', err)
    error.value = err.message
    datos.value = []
    loading.value = false
  }
}

// Renderizar gráfico con Chart.js
const renderChart = () => {
  console.log('renderChart llamado', { 
    canvasExists: !!chartCanvas.value, 
    datosLength: datosGrafico.value.length 
  })
  
  if (!chartCanvas.value || datosGrafico.value.length === 0) {
    console.warn('No se puede renderizar: canvas o datos no disponibles')
    // Si hay datos pero el filtro los ocultó todos, podríamos mostrar un mensaje o limpiar el gráfico
    if (chartInstance) {
      chartInstance.destroy()
      chartInstance = null
    }
    return
  }

  // Destruir gráfico anterior si existe
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  // Obtener configuración de métrica
  const metricaConfig = metricas.find(m => m.value === metricaActiva.value)
  if (!metricaConfig) {
    console.warn('No se encontró configuración para métrica:', metricaActiva.value)
    return
  }

  // Preparar datos usando datosGrafico (filtrados)
  const labels = datosGrafico.value.map(d => d.Fecha || '-')
  const valoresReales = datosGrafico.value.map(d => d[metricaActiva.value])
  const valoresMin = datosGrafico.value.map(d => d[metricaConfig.min])
  const valoresStd = datosGrafico.value.map(d => d[metricaConfig.std])
  const valoresMax = datosGrafico.value.map(d => d[metricaConfig.max])
  
  console.log('Datos preparados:', { 
    labels: labels.length, 
    valoresReales: valoresReales.length,
    primeraFecha: labels[0],
    primerValor: valoresReales[0]
  })

  // Calcular rotación dinámica del eje X basada en número de datos
  const calcularRotacion = () => {
    const numLabels = labels.length
    const canvasWidth = chartCanvas.value.clientWidth || 1000
    const espacioPorLabel = canvasWidth / numLabels
    
    // Si hay suficiente espacio (>60px por etiqueta), mostrar horizontal
    if (espacioPorLabel > 60) {
      return { min: 0, max: 0 } // Horizontal
    }
    // Si hay poco espacio (<40px), mostrar vertical
    else if (espacioPorLabel < 40) {
      return { min: 90, max: 90 } // Vertical
    }
    // Espacio intermedio, 45 grados
    else {
      return { min: 45, max: 45 }
    }
  }
  
  const rotacion = calcularRotacion()
  
  // Configuración del gráfico
  try {
    const ctx = chartCanvas.value.getContext('2d')
    console.log('Contexto 2D obtenido:', ctx)
    console.log('Rotación calculada:', rotacion, `(${labels.length} puntos en ${chartCanvas.value.clientWidth}px)`)
    
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Valor Real',
            data: valoresReales,
            borderColor: 'rgb(37, 99, 235)', // blue-600
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.1
          },
          {
            label: 'Límite Mínimo',
            data: valoresMin,
            borderColor: 'rgb(239, 68, 68)', // red-500
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Estándar',
            data: valoresStd,
            borderColor: 'rgb(34, 197, 94)', // green-500
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Límite Máximo',
            data: valoresMax,
            borderColor: 'rgb(239, 68, 68)', // red-500
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          datalabels: {
            display: false
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'line',
              padding: 20
            }
          },
          title: {
            display: false,
            text: metricaConfig.label,
            font: { size: 16 }
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                if (!items || items.length === 0) return ''
                const lbl = items[0].label
                return formatFechaCorta(lbl)
              },
              afterLabel: (context) => {
                const index = context.dataIndex
                const dato = datosGrafico.value[index]
                return [
                  `Partida: ${dato.Partida || '-'}`,
                  `Máquina: ${dato.Maquina || '-'}`
                ]
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: false,
              text: 'Fecha'
            },
            ticks: {
              maxRotation: rotacion.max,
              minRotation: rotacion.min,
              autoSkip: true,
              maxTicksLimit: rotacion.max === 0 ? 20 : undefined,
              callback: (value, index) => {
                const lbl = labels[index]
                return formatFechaCorta(lbl)
              }
            }
          },
          y: {
            title: {
              display: true,
              text: metricaConfig.label
            }
          }
        }
      }
    })
    
    console.log('Chart creado exitosamente:', chartInstance)
  } catch (err) {
    console.error('Error creando Chart.js:', err)
    error.value = `Error renderizando gráfico: ${err.message}`
  }
}

// Watcher: re-renderizar cuando cambie la métrica o los filtros
watch([metricaActiva, filtroAprobacion, filtroReproceso], () => {
  if (datos.value.length > 0 && chartCanvas.value) {
    renderChart()
  }
})

// Watcher: detectar cuando el canvas esté disponible y haya datos
watch(chartCanvas, (newVal, oldVal) => {
  if (newVal && datos.value.length > 0 && !chartInstance && !loading.value) {
    console.log('Canvas detectado por watcher, renderizando gráfico...')
    nextTick(() => renderChart())
  }
})

// Lifecycle
onMounted(() => {
  // Cargar lista de artículos automáticamente
  if (fechaInicial.value) {
    cargarListaArticulos()
  }
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>

<style scoped>
/* Estilos adicionales si son necesarios */
</style>
