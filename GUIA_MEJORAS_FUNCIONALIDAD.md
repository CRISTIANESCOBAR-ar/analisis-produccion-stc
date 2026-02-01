# 🚀 Guía de Mejoras de Funcionalidad

Esta guía documenta los nuevos composables y componentes UI implementados para mejorar la funcionalidad del sistema.

## 📦 Composables

### 1. useErrorHandler
Manejo centralizado de errores con notificaciones y logging.

```javascript
import { useErrorHandler } from '@/composables/useErrorHandler'

const { handleError, tryCatch, clearError, ErrorTypes } = useErrorHandler()

// Uso básico - manejo manual
try {
  await fetchData()
} catch (error) {
  handleError(error, 'Cargar datos')
}

// Uso recomendado - wrapper automático
const result = await tryCatch(
  () => fetchData(),
  'Cargar datos',
  { toast: true, silent: false }
)

if (result) {
  // Éxito
}
```

### 2. useNotifications
Sistema unificado de notificaciones usando SweetAlert2.

```javascript
import { useNotifications } from '@/composables/useNotifications'

const notifications = useNotifications()

// Toasts
notifications.success('Guardado correctamente')
notifications.error('Error al procesar')
notifications.warning('Atención requerida')
notifications.info('Información importante')

// Confirmaciones
const confirmed = await notifications.confirm('¿Estás seguro?', 'Esta acción no se puede deshacer')
if (confirmed) {
  // Usuario confirmó
}

const deleteConfirmed = await notifications.confirmDelete('este registro')

// Loading
const closeLoading = notifications.showLoading('Procesando...')
// ... hacer operación
closeLoading()

// Prompt
const nombre = await notifications.prompt('Ingresa tu nombre', {
  placeholder: 'Nombre completo'
})
```

### 3. useApiCache
Fetch con caching automático, reintentos y deduplicación.

```javascript
import { useApiCache } from '@/composables/useApiCache'

const api = useApiCache('http://localhost:3002/api')

// GET con cache (5 min por defecto)
const data = await api.get('/produccion')

// GET forzando refresh
const freshData = await api.get('/produccion', { forceRefresh: true })

// POST (sin cache)
const result = await api.post('/import', { table: 'tb_CALIDAD' })

// Invalidar cache
api.invalidateCache('/produccion')  // Específico
api.invalidateCache()                // Todo

// Precarga
api.prefetch('/dashboard-data')
```

### 4. useFormValidation
Validación de formularios con reglas predefinidas.

```javascript
import { useFormValidation, required, email, minLength } from '@/composables/useFormValidation'

const { formData, errors, isValid, validateAll, field, handleSubmit } = useFormValidation(
  // Valores iniciales
  { nombre: '', email: '', password: '' },
  // Schema de validación
  {
    nombre: [required(), minLength(2)],
    email: [required(), email()],
    password: [required(), minLength(8)]
  }
)

// En template
<FormInput v-bind="field('nombre')" label="Nombre" />

// Submit
const onSubmit = handleSubmit(
  async (data) => {
    await api.post('/users', data)
    notifications.success('Usuario creado')
  },
  (error) => {
    notifications.error('Error en el formulario')
  }
)
```

**Reglas disponibles:**
- `required(msg?)` - Campo obligatorio
- `email(msg?)` - Email válido
- `minLength(n, msg?)` - Longitud mínima
- `maxLength(n, msg?)` - Longitud máxima
- `numeric(msg?)` - Solo números
- `integer(msg?)` - Entero
- `min(n, msg?)` - Valor mínimo
- `max(n, msg?)` - Valor máximo
- `between(min, max, msg?)` - Rango
- `pattern(regex, msg?)` - Patrón regex
- `date(msg?)` - Fecha válida
- `url(msg?)` - URL válida
- `custom(fn, msg?)` - Validador personalizado

---

## 🎨 Componentes UI

### SkeletonLoader
Placeholder animado durante carga de datos.

```vue
<template>
  <SkeletonLoader v-if="loading" type="table" :rows="10" :columns="6" />
  <MyTable v-else :data="data" />
</template>

<script setup>
import { SkeletonLoader } from '@/components/ui'
</script>
```

**Props:**
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| type | String | 'lines' | 'table', 'cards', 'stats', 'list', 'text', 'chart', 'form' |
| rows | Number | 5 | Número de filas |
| columns | Number | 4 | Columnas para tipo table |
| count | Number | 4 | Elementos para cards/stats |
| gridCols | Number | 4 | Columnas del grid |

### LoadingOverlay
Overlay de carga con diferentes indicadores.

```vue
<template>
  <div class="relative">
    <LoadingOverlay 
      :show="loading" 
      message="Procesando..." 
      type="spinner"
    />
    <MyContent />
  </div>
</template>
```

**Props:**
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| show | Boolean | false | Mostrar/ocultar |
| message | String | '' | Mensaje principal |
| type | String | 'spinner' | 'spinner', 'dots', 'bars', 'progress' |
| fullscreen | Boolean | false | Cubrir toda la pantalla |
| progress | Number | 0 | Porcentaje (para type='progress') |

### EmptyState
Estado vacío cuando no hay datos.

```vue
<template>
  <EmptyState 
    v-if="data.length === 0"
    icon="📭"
    title="No hay datos"
    description="No se encontraron registros para esta búsqueda."
    :show-action="true"
    action-text="Actualizar"
    @action="loadData"
  />
</template>
```

### FormInput
Input con validación integrada.

```vue
<template>
  <FormInput
    v-model="form.email"
    type="email"
    label="Email"
    placeholder="correo@ejemplo.com"
    :error="errors.email"
    required
    clearable
  />
</template>
```

**Props:**
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| modelValue | String/Number | '' | Valor |
| type | String | 'text' | Tipo de input |
| label | String | '' | Etiqueta |
| error | String | null | Mensaje de error |
| hint | String | '' | Texto de ayuda |
| clearable | Boolean | false | Botón para limpiar |
| size | String | 'md' | 'sm', 'md', 'lg' |

---

## 📁 Estructura de Archivos

```
src/
├── composables/
│   ├── index.js              # Exports centralizados
│   ├── useErrorHandler.js    # Manejo de errores
│   ├── useNotifications.js   # Notificaciones
│   ├── useApiCache.js        # API con cache
│   ├── useFormValidation.js  # Validación forms
│   ├── useDatabase.js        # (existente)
│   ├── useKPIs.js            # (existente)
│   └── useSidebar.js         # (existente)
├── components/
│   └── ui/
│       ├── index.js          # Exports UI
│       ├── SkeletonLoader.vue
│       ├── LoadingOverlay.vue
│       ├── EmptyState.vue
│       └── FormInput.vue
```

---

## ✨ Ejemplo Completo

```vue
<template>
  <div class="p-4">
    <!-- Loading -->
    <SkeletonLoader v-if="loading" type="table" :rows="8" />
    
    <!-- Empty -->
    <EmptyState 
      v-else-if="!data.length"
      icon="📊"
      title="Sin registros"
      :show-action="true"
      @action="loadData"
    />
    
    <!-- Data -->
    <table v-else>
      <!-- ... -->
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useErrorHandler, useNotifications } from '@/composables'
import { SkeletonLoader, EmptyState } from '@/components/ui'

const { tryCatch } = useErrorHandler()
const notifications = useNotifications()

const loading = ref(false)
const data = ref([])

async function loadData() {
  loading.value = true
  
  const result = await tryCatch(
    () => fetch('/api/data').then(r => r.json()),
    'Cargar datos'
  )
  
  if (result) {
    data.value = result
    notifications.success('Datos cargados')
  }
  
  loading.value = false
}

onMounted(loadData)
</script>
```

---

## 📝 Notas de Migración

Para migrar componentes existentes:

1. **Reemplazar imports de Swal:**
```javascript
// Antes
import Swal from 'sweetalert2'
const toast = Swal.mixin({ ... })

// Después
import { useNotifications } from '@/composables'
const notifications = useNotifications()
```

2. **Reemplazar try/catch con tryCatch:**
```javascript
// Antes
try {
  const result = await fetchData()
} catch (err) {
  console.error(err)
  toast.fire({ icon: 'error', title: 'Error' })
}

// Después
const result = await tryCatch(fetchData, 'Cargar datos')
```

3. **Reemplazar spinners con SkeletonLoader:**
```vue
<!-- Antes -->
<div v-if="loading">
  <div class="animate-spin">↻</div>
</div>

<!-- Después -->
<SkeletonLoader v-if="loading" type="table" />
```
