// =====================================================================
// Configuración centralizada de la aplicación
// =====================================================================
// Usa variables de entorno de Vite (.env, .env.local)
// =====================================================================

/**
 * URL base del API backend
 * - Desarrollo local: http://localhost:3002
 * - Con ngrok: https://xxxx.ngrok-free.app
 * 
 * Para cambiar, edita el archivo .env.local:
 * VITE_API_URL=https://tu-url-ngrok.ngrok-free.app
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * URL completa del API (con /api)
 */
export const API_URL = `${API_BASE_URL}/api`

/**
 * Función helper para hacer fetch al API
 * Añade headers necesarios para ngrok
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
  
  // Headers por defecto (ngrok requiere bypass del warning)
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  })
  
  return response
}

/**
 * Versión de apiFetch que retorna JSON directamente
 */
export async function apiJson(endpoint, options = {}) {
  const response = await apiFetch(endpoint, options)
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Verifica si el API está disponible
 */
export async function checkApiStatus() {
  try {
    const response = await apiFetch('/status', { 
      method: 'GET',
      // Timeout corto para verificación
    })
    return response.ok
  } catch {
    return false
  }
}

// Log de configuración en desarrollo
if (import.meta.env.DEV) {
  console.log('🔧 API Config:', {
    API_BASE_URL,
    API_URL,
    mode: import.meta.env.MODE
  })
}
