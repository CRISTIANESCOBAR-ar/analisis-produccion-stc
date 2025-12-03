<template>
  <div class="fichas-container">
    <div class="header">
      <h1 class="title">🔍 Búsqueda de Fichas</h1>
      <p class="subtitle">Buscar artículos por código, descripción o composición</p>
    </div>

    <!-- Barra de búsqueda -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <span class="search-icon">🔎</span>
        <input
          v-model="searchQuery"
          @input="onSearchInput"
          type="text"
          placeholder="Buscar por código, descripción, gramagem..."
          class="search-input"
        />
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="clear-btn"
          title="Limpiar búsqueda"
        >
          ✕
        </button>
      </div>
      <button @click="performSearch" class="btn-search">
        Buscar
      </button>
    </div>

    <!-- Resultados -->
    <div v-if="fichas.length > 0" class="results-section">
      <div class="results-header">
        <span class="results-count">
          {{ fichas.length }} artículo{{ fichas.length !== 1 ? 's' : '' }} encontrado{{ fichas.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <div class="fichas-grid">
        <div
          v-for="ficha in fichas"
          :key="ficha['ARTIGO CODIGO']"
          class="ficha-card"
          @click="selectFicha(ficha)"
        >
          <div class="ficha-header">
            <div class="ficha-code">{{ ficha['ARTIGO CODIGO'] }}</div>
            <div v-if="ficha.GRAMAGEM" class="ficha-badge">
              {{ ficha.GRAMAGEM }} g/m²
            </div>
          </div>

          <div class="ficha-body">
            <div v-if="ficha['DESCRICAO COMPLETA']" class="ficha-description">
              {{ ficha['DESCRICAO COMPLETA'] }}
            </div>

            <div class="ficha-details">
              <div v-if="ficha['% ALGODAO']" class="detail-item">
                <span class="detail-label">Algodón:</span>
                <span class="detail-value">{{ ficha['% ALGODAO'] }}%</span>
              </div>
              <div v-if="ficha['% ELASTANO']" class="detail-item">
                <span class="detail-label">Elastano:</span>
                <span class="detail-value">{{ ficha['% ELASTANO'] }}%</span>
              </div>
              <div v-if="ficha['% POLIESTER']" class="detail-item">
                <span class="detail-label">Poliéster:</span>
                <span class="detail-value">{{ ficha['% POLIESTER'] }}%</span>
              </div>
            </div>

            <div v-if="ficha.ESTRUTURA" class="ficha-estructura">
              {{ ficha.ESTRUTURA }}
            </div>
          </div>

          <div class="ficha-footer">
            <button @click.stop="viewDetails(ficha)" class="btn-details">
              Ver Detalles →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-else-if="!loading && searchPerformed" class="empty-state">
      <div class="empty-icon">📄</div>
      <p class="empty-message">No se encontraron artículos</p>
      <p class="empty-hint">Intenta con otros términos de búsqueda</p>
    </div>

    <!-- Estado inicial -->
    <div v-else-if="!loading && !searchPerformed" class="empty-state">
      <div class="empty-icon">🔍</div>
      <p class="empty-message">Realiza una búsqueda para ver resultados</p>
      <p class="empty-hint">Puedes buscar por código, descripción, composición, etc.</p>
    </div>

    <!-- Modal de detalles -->
    <div v-if="selectedFicha" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ selectedFicha['ARTIGO CODIGO'] }}</h2>
          <button @click="closeModal" class="modal-close">✕</button>
        </div>

        <div class="modal-body">
          <div class="detail-section">
            <h3 class="section-title">Información General</h3>
            <div class="detail-grid">
              <div v-for="(value, key) in getGeneralInfo(selectedFicha)" :key="key" class="detail-row">
                <span class="detail-key">{{ formatKey(key) }}:</span>
                <span class="detail-value-modal">{{ value || '-' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3 class="section-title">Composición</h3>
            <div class="detail-grid">
              <div v-for="(value, key) in getComposition(selectedFicha)" :key="key" class="detail-row">
                <span class="detail-key">{{ formatKey(key) }}:</span>
                <span class="detail-value-modal">{{ value || '-' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3 class="section-title">Medidas y Especificaciones</h3>
            <div class="detail-grid">
              <div v-for="(value, key) in getMeasurements(selectedFicha)" :key="key" class="detail-row">
                <span class="detail-key">{{ formatKey(key) }}:</span>
                <span class="detail-value-modal">{{ value || '-' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Buscando...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      ⚠️ Error: {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDatabase } from '../composables/useDatabase'

const db = useDatabase()

const searchQuery = ref('')
const fichas = ref([])
const selectedFicha = ref(null)
const searchPerformed = ref(false)

const loading = computed(() => db.loading.value)
const error = computed(() => db.error.value)

let searchTimeout = null

function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (searchQuery.value.length >= 2) {
      performSearch()
    }
  }, 500)
}

async function performSearch() {
  if (!searchQuery.value.trim()) {
    fichas.value = []
    searchPerformed.value = false
    return
  }

  try {
    fichas.value = await db.getFichas(searchQuery.value)
    searchPerformed.value = true
  } catch (err) {
    console.error('Error buscando fichas:', err)
    fichas.value = []
    searchPerformed.value = true
  }
}

function clearSearch() {
  searchQuery.value = ''
  fichas.value = []
  searchPerformed.value = false
}

function selectFicha(ficha) {
  selectedFicha.value = ficha
}

async function viewDetails(ficha) {
  try {
    const fullFicha = await db.getFichaByCodigo(ficha['ARTIGO CODIGO'])
    selectedFicha.value = fullFicha
  } catch (err) {
    console.error('Error cargando detalles:', err)
    selectedFicha.value = ficha
  }
}

function closeModal() {
  selectedFicha.value = null
}

function getGeneralInfo(ficha) {
  return {
    'ARTIGO CODIGO': ficha['ARTIGO CODIGO'],
    'DESCRICAO COMPLETA': ficha['DESCRICAO COMPLETA'],
    'ESTRUTURA': ficha.ESTRUTURA,
    'GRAMAGEM': ficha.GRAMAGEM,
    'TIPO_TECIDO': ficha.TIPO_TECIDO,
    'LAV STONE': ficha['LAV STONE']
  }
}

function getComposition(ficha) {
  return {
    '% ALGODAO': ficha['% ALGODAO'] ? `${ficha['% ALGODAO']}%` : null,
    '% ELASTANO': ficha['% ELASTANO'] ? `${ficha['% ELASTANO']}%` : null,
    '% POLIESTER': ficha['% POLIESTER'] ? `${ficha['% POLIESTER']}%` : null,
    'URDUME': ficha.URDUME,
    'TRAMA': ficha.TRAMA
  }
}

function getMeasurements(ficha) {
  return {
    'LARGURA': ficha.LARGURA,
    'ALONGAMENTO URDUME': ficha['ALONGAMENTO URDUME'],
    'ALONGAMENTO TRAMA': ficha['ALONGAMENTO TRAMA'],
    'ENCOLHIMENTO URDUME': ficha['ENCOLHIMENTO URDUME'],
    'ENCOLHIMENTO TRAMA': ficha['ENCOLHIMENTO TRAMA'],
    'NE RESULTANTE': ficha['NE RESULTANTE']
  }
}

function formatKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^\w/, c => c.toUpperCase())
}
</script>

<style scoped>
.fichas-container {
  max-width: 1400px;
  margin: 0 auto;
  background: transparent;
  min-height: 100vh;
}

.header {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 24px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.search-bar {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 24px;
  display: flex;
  gap: 12px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 0 16px;
}

.search-icon {
  font-size: 18px;
  margin-right: 12px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 0;
  font-size: 15px;
  outline: none;
}

.clear-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 4px 8px;
  margin-left: 8px;
}

.clear-btn:hover {
  color: #333;
}

.btn-search {
  padding: 12px 32px;
  background: #0078d4;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-search:hover {
  background: #005a9e;
}

.results-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.results-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.results-count {
  font-weight: 600;
  color: #0078d4;
  font-size: 16px;
}

.fichas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.ficha-card {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.ficha-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-color: #0078d4;
}

.ficha-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ficha-code {
  font-size: 18px;
  font-weight: 700;
  color: #0078d4;
}

.ficha-badge {
  background: #0078d4;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.ficha-body {
  margin-bottom: 16px;
}

.ficha-description {
  color: #333;
  font-weight: 500;
  margin-bottom: 12px;
  line-height: 1.4;
  min-height: 40px;
}

.ficha-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-item {
  background: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.detail-label {
  color: #666;
  margin-right: 4px;
}

.detail-value {
  color: #1a1a1a;
  font-weight: 600;
}

.ficha-estructura {
  color: #666;
  font-size: 13px;
  font-style: italic;
}

.ficha-footer {
  padding-top: 16px;
  border-top: 1px solid #dee2e6;
}

.btn-details {
  background: #0078d4;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  width: 100%;
}

.btn-details:hover {
  background: #005a9e;
}

.empty-state {
  background: white;
  padding: 60px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-message {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.empty-hint {
  color: #666;
  margin: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 24px;
  border-bottom: 2px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.modal-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0078d4;
}

.modal-close {
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f0f0f0;
  color: #333;
}

.modal-body {
  padding: 24px;
}

.detail-section {
  margin-bottom: 32px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #f0f0f0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.detail-row {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-key {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
}

.detail-value-modal {
  font-size: 15px;
  color: #1a1a1a;
  font-weight: 600;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0078d4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}
</style>
