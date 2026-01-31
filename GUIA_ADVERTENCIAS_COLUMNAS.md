# 📋 Guía de Advertencias de Columnas

## 🎯 Comportamiento del Sistema

### Panel de Advertencias (amarillo)
**Ubicación:** Aparece en la parte superior de "Control de Importaciones"

**Propósito:** Mostrar **solo** las diferencias **pendientes** que requieren acción del usuario.

**Cuándo aparece:**
- ✅ Cuando hay columnas NUEVAS en el CSV que NO están en SQLite
- ✅ Solo muestra diferencias detectadas en las últimas 24 horas
- ❌ NO aparece si ya sincronizaste las columnas
- ❌ Se oculta automáticamente después de una sincronización exitosa

### Botón "Historial" (morado)
**Ubicación:** Barra superior, junto a "Refrescar"

**Propósito:** Ver el historial COMPLETO de evolución de diferencias y sincronizaciones.

**Contenido:**
1. **Pestaña "Diferencias Detectadas":**
   - Todas las diferencias históricas (no filtradas)
   - Incluye diferencias ya resueltas
   - Útil para auditoría y diagnóstico

2. **Pestaña "Sincronizaciones Aplicadas":**
   - Registro de cada sincronización ejecutada
   - Qué columnas se agregaron
   - Fecha y si se re-importó

---

## 🔍 Tipos de Diferencias

### 🟠 Columnas EXTRA en CSV (Pendientes)
**Qué significa:**
- El CSV tiene columnas que NO existen en SQLite
- Estas columnas se **ignoran** durante la importación
- Los datos de estas columnas NO se guardan

**Qué hacer:**
1. Click en "🔄 Sincronizar Columnas"
2. Revisar la lista de columnas a agregar
3. Decidir si re-importar datos (recomendado)
4. Aplicar sincronización

**Resultado:**
- Las columnas se agregan a SQLite como tipo TEXT
- El warning desaparece del panel amarillo
- Queda registrado en el historial

### 🔵 Columnas en SQLite no presentes en CSV (Informativas)
**Qué significa:**
- SQLite tiene columnas que NO vienen en el CSV actual
- Se rellenan automáticamente con NULL
- No requiere acción

**Razones comunes:**
- La columna se eliminó del reporte Access
- Era una columna temporal o calculada
- Error de encoding (PEÇA → PE?A)

**Qué hacer:**
- ✅ **Ignorar** - Es comportamiento normal
- ⚠️ Si la columna nunca se usa, puedes eliminarla manualmente
- 📊 Revisar el historial para ver cuándo se agregó originalmente

---

## 🔄 Flujo de Trabajo Recomendado

### Cuando aparece una advertencia:

```
1. Revisar el panel amarillo
   └─ ¿Columnas EXTRA? → Decidir si sincronizar
   
2. Click "Sincronizar Columnas"
   └─ Revisar lista de columnas
   └─ Marcar "Re-importar datos" si quieres históricos
   └─ Aplicar
   
3. Esperar confirmación
   └─ "✓ Sincronización completada"
   └─ Panel amarillo desaparece automáticamente
   
4. (Opcional) Revisar historial
   └─ Click "Historial"
   └─ Ver registro de la sincronización
```

---

## 🛠️ Preguntas Frecuentes

### ¿Por qué sigo viendo "PE?A" o "G4PR" como FALTANTES?
**R:** Probablemente son columnas con caracteres especiales mal codificados:
- PEÇA se convirtió en PE?A por encoding
- G.PR se convirtió en G4PR

**Solución:** 
- Ignorar (se llenan con NULL automáticamente)
- O eliminarlas manualmente de SQLite si no se usan

### ¿Qué pasa si ignoro las columnas EXTRA?
**R:** Los datos de esas columnas NO se guardarán en la base de datos. Solo se importarán las columnas que existan en SQLite.

### ¿Puedo deshacer una sincronización?
**R:** No automáticamente. Deberías:
1. Eliminar manualmente la columna con `ALTER TABLE DROP COLUMN` (requiere recrear tabla en SQLite)
2. O mantenerla (no afecta el rendimiento)

### ¿Se pierden datos al sincronizar?
**R:** NO. La sincronización solo AGREGA columnas, nunca elimina datos existentes.

### ¿Qué significa "Re-importar datos"?
**R:** Después de agregar las columnas a SQLite, vuelve a importar el CSV completo para llenar las columnas nuevas con datos históricos.

**Recomendado cuando:**
- Necesitas los datos históricos de las columnas nuevas
- El CSV tiene registros pasados con esos valores

**NO necesario cuando:**
- Solo te interesan los datos futuros
- El CSV solo tiene datos del día actual

---

## 📊 Auditoría y Trazabilidad

Todas las operaciones quedan registradas en 2 tablas SQLite:

1. **`import_column_warnings`**
   - Cada detección de diferencia
   - Timestamp de cuándo se detectó
   - Qué columnas estaban diferentes

2. **`schema_changes_log`**
   - Cada ALTER TABLE ejecutado
   - Qué columna se agregó
   - Si se re-importó
   - Timestamp de aplicación

Ambas son accesibles desde el botón "📋 Historial".

---

## 🎨 Códigos de Color

| Color | Significado | Acción Requerida |
|-------|-------------|------------------|
| 🟠 Naranja | Columnas pendientes de agregar | ✅ Sincronizar |
| 🔵 Azul | Columnas faltantes en CSV | ℹ️ Solo informativo |
| 🟢 Verde | Sincronización exitosa | ✓ Completado |
| 🔴 Rojo | Error en operación | ⚠️ Revisar log |

---

## 💡 Mejores Prácticas

1. **Revisar advertencias diariamente** durante la primera semana de uso
2. **Sincronizar inmediatamente** cuando aparezcan columnas nuevas importantes
3. **Usar "Re-importar"** si necesitas datos históricos
4. **Revisar historial mensualmente** para entender la evolución del esquema
5. **Ignorar columnas faltantes** con nombres corruptos (PE?A, G4PR)

---

## 🔧 Troubleshooting

### El panel no desaparece después de sincronizar
1. Refrescar la página (F5)
2. Click en "↻ Refrescar" 
3. Verificar que la sincronización fue exitosa en el historial

### Aparecen las mismas advertencias cada día
- Normal: El sistema detecta diferencias en cada importación
- Desaparecerán después de sincronizar

### Error al sincronizar
1. Revisar log de terminal del servidor
2. Verificar que el archivo CSV es accesible
3. Comprobar que no hay caracteres especiales problemáticos en nombres de columnas

---

**Última actualización:** 30 enero 2026  
**Versión del sistema:** 2.1.0
