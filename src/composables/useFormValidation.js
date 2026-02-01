// =====================================================================
// Composable para validación de formularios
// =====================================================================
// Uso: import { useFormValidation } from '@/composables/useFormValidation'
// =====================================================================
// Nota: Los accesos dinámicos a objetos en este archivo son seguros porque
// las claves provienen del schema de validación definido por el desarrollador.
/* eslint-disable security/detect-object-injection */

import { ref, reactive, computed, watch } from 'vue'

/**
 * Reglas de validación predefinidas
 */
export const ValidationRules = {
  /**
   * Campo requerido
   */
  required: (message = 'Este campo es requerido') => (value) => {
    if (value === null || value === undefined) return message
    if (typeof value === 'string' && value.trim() === '') return message
    if (Array.isArray(value) && value.length === 0) return message
    return null
  },

  /**
   * Longitud mínima
   */
  minLength: (min, message) => (value) => {
    if (!value) return null // Usar required para campos obligatorios
    const msg = message || `Debe tener al menos ${min} caracteres`
    return String(value).length >= min ? null : msg
  },

  /**
   * Longitud máxima
   */
  maxLength: (max, message) => (value) => {
    if (!value) return null
    const msg = message || `No puede exceder ${max} caracteres`
    return String(value).length <= max ? null : msg
  },

  /**
   * Email válido
   */
  email: (message = 'Ingresa un email válido') => (value) => {
    if (!value) return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value) ? null : message
  },

  /**
   * Número válido
   */
  numeric: (message = 'Debe ser un número') => (value) => {
    if (!value && value !== 0) return null
    return !isNaN(Number(value)) ? null : message
  },

  /**
   * Número entero
   */
  integer: (message = 'Debe ser un número entero') => (value) => {
    if (!value && value !== 0) return null
    return Number.isInteger(Number(value)) ? null : message
  },

  /**
   * Valor mínimo
   */
  min: (minValue, message) => (value) => {
    if (!value && value !== 0) return null
    const msg = message || `El valor mínimo es ${minValue}`
    return Number(value) >= minValue ? null : msg
  },

  /**
   * Valor máximo
   */
  max: (maxValue, message) => (value) => {
    if (!value && value !== 0) return null
    const msg = message || `El valor máximo es ${maxValue}`
    return Number(value) <= maxValue ? null : msg
  },

  /**
   * Rango numérico
   */
  between: (min, max, message) => (value) => {
    if (!value && value !== 0) return null
    const msg = message || `El valor debe estar entre ${min} y ${max}`
    const num = Number(value)
    return num >= min && num <= max ? null : msg
  },

  /**
   * Patrón regex
   */
  pattern: (regex, message = 'Formato inválido') => (value) => {
    if (!value) return null
    return regex.test(value) ? null : message
  },

  /**
   * Fecha válida
   */
  date: (message = 'Ingresa una fecha válida') => (value) => {
    if (!value) return null
    const date = new Date(value)
    return !isNaN(date.getTime()) ? null : message
  },

  /**
   * Fecha mínima
   */
  minDate: (minDate, message) => (value) => {
    if (!value) return null
    const date = new Date(value)
    const min = new Date(minDate)
    const msg = message || `La fecha debe ser posterior a ${min.toLocaleDateString()}`
    return date >= min ? null : msg
  },

  /**
   * Fecha máxima
   */
  maxDate: (maxDate, message) => (value) => {
    if (!value) return null
    const date = new Date(value)
    const max = new Date(maxDate)
    const msg = message || `La fecha debe ser anterior a ${max.toLocaleDateString()}`
    return date <= max ? null : msg
  },

  /**
   * Coincide con otro campo
   */
  sameAs: (otherValue, message = 'Los valores no coinciden') => (value) => {
    return value === otherValue ? null : message
  },

  /**
   * URL válida
   */
  url: (message = 'Ingresa una URL válida') => (value) => {
    if (!value) return null
    try {
      new URL(value)
      return null
    } catch {
      return message
    }
  },

  /**
   * Validador personalizado
   */
  custom: (validatorFn, message = 'Valor inválido') => (value) => {
    return validatorFn(value) ? null : message
  }
}

/**
 * Composable principal para validación de formularios
 */
export function useFormValidation(initialValues = {}, validationSchema = {}) {
  // Estado del formulario
  const formData = reactive({ ...initialValues })
  const errors = reactive({})
  const touched = reactive({})
  const isDirty = ref(false)
  const isValidating = ref(false)
  
  // Inicializar errores vacíos
  Object.keys(validationSchema).forEach(field => {
    errors[field] = null
    touched[field] = false
  })

  /**
   * Valida un campo específico
   */
  const validateField = (fieldName) => {
    const rules = validationSchema[fieldName]
    if (!rules) return null
    
    const value = formData[fieldName]
    const rulesArray = Array.isArray(rules) ? rules : [rules]
    
    for (const rule of rulesArray) {
      const error = rule(value)
      if (error) {
        errors[fieldName] = error
        return error
      }
    }
    
    errors[fieldName] = null
    return null
  }

  /**
   * Valida todos los campos
   */
  const validateAll = () => {
    isValidating.value = true
    let isValid = true
    
    Object.keys(validationSchema).forEach(field => {
      touched[field] = true
      const error = validateField(field)
      if (error) isValid = false
    })
    
    isValidating.value = false
    return isValid
  }

  /**
   * Marca un campo como tocado
   */
  const touchField = (fieldName) => {
    touched[fieldName] = true
    validateField(fieldName)
  }

  /**
   * Resetea el formulario
   */
  const reset = (newValues = initialValues) => {
    Object.keys(formData).forEach(key => {
      formData[key] = newValues[key] ?? initialValues[key] ?? null
    })
    
    Object.keys(errors).forEach(key => {
      errors[key] = null
      touched[key] = false
    })
    
    isDirty.value = false
  }

  /**
   * Actualiza un valor del formulario
   */
  const setValue = (fieldName, value) => {
    formData[fieldName] = value
    isDirty.value = true
    
    // Validar si ya fue tocado
    if (touched[fieldName]) {
      validateField(fieldName)
    }
  }

  /**
   * Actualiza múltiples valores
   */
  const setValues = (values) => {
    Object.entries(values).forEach(([key, value]) => {
      formData[key] = value
    })
    isDirty.value = true
  }

  /**
   * Limpia errores de un campo
   */
  const clearFieldError = (fieldName) => {
    errors[fieldName] = null
  }

  /**
   * Limpia todos los errores
   */
  const clearErrors = () => {
    Object.keys(errors).forEach(key => {
      errors[key] = null
    })
  }

  /**
   * Obtiene el primer error
   */
  const firstError = computed(() => {
    for (const field of Object.keys(errors)) {
      if (errors[field]) return errors[field]
    }
    return null
  })

  /**
   * Verifica si el formulario es válido
   */
  const isValid = computed(() => {
    return Object.values(errors).every(e => e === null)
  })

  /**
   * Cuenta errores
   */
  const errorCount = computed(() => {
    return Object.values(errors).filter(e => e !== null).length
  })

  /**
   * Handler para submit
   */
  const handleSubmit = (onSubmit, onError) => async (event) => {
    if (event) event.preventDefault()
    
    const valid = validateAll()
    
    if (valid) {
      try {
        await onSubmit({ ...formData })
      } catch (err) {
        if (onError) onError(err)
      }
    } else if (onError) {
      onError(new Error('Validación fallida'))
    }
    
    return valid
  }

  /**
   * Crea binding para v-model con validación
   */
  const field = (fieldName) => ({
    modelValue: formData[fieldName],
    'onUpdate:modelValue': (value) => setValue(fieldName, value),
    onBlur: () => touchField(fieldName),
    error: touched[fieldName] ? errors[fieldName] : null
  })

  // Watcher para detectar cambios
  watch(
    () => ({ ...formData }),
    () => {
      isDirty.value = true
    },
    { deep: true }
  )

  return {
    // Estado
    formData,
    errors,
    touched,
    isDirty,
    isValid,
    isValidating,
    firstError,
    errorCount,
    
    // Métodos
    validateField,
    validateAll,
    touchField,
    reset,
    setValue,
    setValues,
    clearFieldError,
    clearErrors,
    handleSubmit,
    field
  }
}

// Re-exportar reglas para conveniencia
export const { 
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
} = ValidationRules
