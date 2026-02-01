// =====================================================================
// Exportación centralizada de composables
// =====================================================================
// Uso: import { useDatabase, useErrorHandler, ... } from '@/composables'
// =====================================================================

// Base de datos
export { useDatabase } from './useDatabase'

// Manejo de errores centralizado
export { 
  useErrorHandler, 
  useGlobalErrorHandler,
  ErrorTypes 
} from './useErrorHandler'

// Notificaciones unificadas
export { 
  useNotifications, 
  useGlobalNotifications,
  NotificationTypes,
  ToastPositions 
} from './useNotifications'

// API con cache
export { 
  useApiCache, 
  useGlobalApiCache 
} from './useApiCache'

// Validación de formularios
export { 
  useFormValidation,
  ValidationRules,
  // Reglas individuales
  required,
  minLength,
  maxLength,
  email,
  numeric,
  integer,
  min,
  max,
  between,
  pattern,
  date,
  minDate,
  maxDate,
  sameAs,
  url,
  custom
} from './useFormValidation'

// KPIs
export { useKPIs } from './useKPIs'

// Sidebar
export { useSidebar } from './useSidebar'
