// =====================================================================
// Composable para API fetch con caching básico
// =====================================================================
// Uso: import { useApiCache } from '@/composables/useApiCache'
// =====================================================================

import { ref, reactive, readonly } from 'vue'

// Cache global compartido entre instancias
const globalCache = reactive(new Map())
const pendingRequests = reactive(new Map())

/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG = {
  // Tiempo de vida del cache en ms (5 minutos)
  cacheTTL: 5 * 60 * 1000,
  
  // Tiempo máximo de espera para requests (30 segundos)
  timeout: 30000,
  
  // Reintentos automáticos
  retries: 2,
  
  // Delay entre reintentos (ms)
  retryDelay: 1000,
  
  // Headers por defecto
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  }
}

/**
 * Genera una clave única para el cache basada en la URL y opciones
 */
const generateCacheKey = (url, options = {}) => {
  const method = options.method || 'GET'
  const body = options.body ? JSON.stringify(options.body) : ''
  return `${method}:${url}:${body}`
}

/**
 * Verifica si una entrada de cache es válida
 */
const isCacheValid = (entry, ttl) => {
  if (!entry) return false
  const age = Date.now() - entry.timestamp
  return age < ttl
}

/**
 * Composable principal para API con cache
 */
export function useApiCache(baseUrl = '', config = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  const loading = ref(false)
  const error = ref(null)
  const lastFetchTime = ref(null)
  
  /**
   * Ejecuta un fetch con soporte de cache y reintentos
   */
  const cachedFetch = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
    
    const {
      cache = true,
      cacheTTL = mergedConfig.cacheTTL,
      forceRefresh = false,
      retries = mergedConfig.retries,
      timeout = mergedConfig.timeout,
      ...fetchOptions
    } = options
    
    const cacheKey = generateCacheKey(url, fetchOptions)
    
    // 1. Verificar cache (solo para GET sin forceRefresh)
    const method = (fetchOptions.method || 'GET').toUpperCase()
    if (cache && method === 'GET' && !forceRefresh) {
      const cached = globalCache.get(cacheKey)
      if (isCacheValid(cached, cacheTTL)) {
        return cached.data
      }
    }
    
    // 2. Verificar si ya hay un request pendiente para esta URL
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey)
    }
    
    // 3. Crear el request con timeout
    loading.value = true
    error.value = null
    
    const fetchWithTimeout = async (attempt = 1) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            ...mergedConfig.headers,
            ...fetchOptions.headers
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        // Guardar en cache
        if (cache && method === 'GET') {
          globalCache.set(cacheKey, {
            data,
            timestamp: Date.now()
          })
        }
        
        lastFetchTime.value = Date.now()
        return data
        
      } catch (err) {
        clearTimeout(timeoutId)
        
        // Reintentar si no es abort y quedan intentos
        if (err.name !== 'AbortError' && attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, mergedConfig.retryDelay * attempt))
          return fetchWithTimeout(attempt + 1)
        }
        
        throw err
      }
    }
    
    // Crear promesa y guardarla para deduplicación
    const requestPromise = fetchWithTimeout()
      .finally(() => {
        loading.value = false
        pendingRequests.delete(cacheKey)
      })
    
    pendingRequests.set(cacheKey, requestPromise)
    
    try {
      return await requestPromise
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  /**
   * GET request
   */
  const get = (endpoint, options = {}) => {
    return cachedFetch(endpoint, { ...options, method: 'GET' })
  }
  
  /**
   * POST request (sin cache por defecto)
   */
  const post = (endpoint, body, options = {}) => {
    return cachedFetch(endpoint, { 
      ...options, 
      method: 'POST',
      body: JSON.stringify(body),
      cache: false
    })
  }
  
  /**
   * PUT request (sin cache)
   */
  const put = (endpoint, body, options = {}) => {
    return cachedFetch(endpoint, { 
      ...options, 
      method: 'PUT',
      body: JSON.stringify(body),
      cache: false
    })
  }
  
  /**
   * DELETE request (sin cache)
   */
  const del = (endpoint, options = {}) => {
    return cachedFetch(endpoint, { 
      ...options, 
      method: 'DELETE',
      cache: false
    })
  }
  
  /**
   * Invalida cache para una URL específica o patrón
   */
  const invalidateCache = (pattern) => {
    if (!pattern) {
      // Limpiar todo el cache
      globalCache.clear()
      return
    }
    
    // Limpiar entradas que coincidan con el patrón
    for (const key of globalCache.keys()) {
      if (key.includes(pattern)) {
        globalCache.delete(key)
      }
    }
  }
  
  /**
   * Precarga datos en cache
   */
  const prefetch = async (endpoint, options = {}) => {
    try {
      await get(endpoint, { ...options, forceRefresh: true })
    } catch {
      // Silenciar errores en prefetch
    }
  }
  
  /**
   * Obtiene estadísticas del cache
   */
  const getCacheStats = () => {
    const entries = Array.from(globalCache.entries())
    const now = Date.now()
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([, v]) => isCacheValid(v, mergedConfig.cacheTTL)).length,
      expiredEntries: entries.filter(([, v]) => !isCacheValid(v, mergedConfig.cacheTTL)).length,
      pendingRequests: pendingRequests.size
    }
  }
  
  return {
    // Estado
    loading: readonly(loading),
    error: readonly(error),
    lastFetchTime: readonly(lastFetchTime),
    
    // Métodos
    get,
    post,
    put,
    delete: del,
    cachedFetch,
    
    // Cache management
    invalidateCache,
    prefetch,
    getCacheStats
  }
}

// Instancia global preconfigurada
let globalInstance = null

export function useGlobalApiCache() {
  if (!globalInstance) {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'
    globalInstance = useApiCache(API_BASE_URL)
  }
  return globalInstance
}
