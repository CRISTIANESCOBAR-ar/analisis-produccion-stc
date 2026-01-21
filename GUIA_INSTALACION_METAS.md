# Guía de Instalación - Sistema de Metas

## ✅ Archivos Creados

1. **Script SQL**: `scripts/create-tb_METAS.sql`
   - Crea la tabla `tb_METAS` con todas las columnas necesarias
   - Incluye índices y triggers

2. **Componente Vue**: `src/components/MetasCarga.vue`
   - Interfaz tipo Excel para cargar/editar metas
   - Selector de mes/año
   - Totales automáticos
   - Exportar a Excel

3. **Script PowerShell**: `scripts/init-metas.ps1`
   - Crea la tabla automáticamente
   - Carga datos de enero 2026

4. **API Endpoints**: Agregados a `scripts/sqlite-api-server.cjs`
   - GET `/api/metas?mes=1&año=2026` - Obtener metas del mes
   - GET `/api/metas/:fecha` - Obtener meta de fecha específica
   - POST `/api/metas` - Guardar/actualizar metas (batch)
   - DELETE `/api/metas/:fecha` - Eliminar meta

## 📋 Pasos de Instalación

### 1. Crear la tabla y cargar datos iniciales

Ejecuta el siguiente comando en **PowerShell** (NO en Python):

```powershell
# Opción 1: Ejecutar el script completo
.\scripts\init-metas.ps1

# Opción 2: Ejecutar manualmente con SQLite
sqlite3 .\database\produccion.db < .\scripts\create-tb_METAS.sql
```

### 2. Verificar que la tabla fue creada

```powershell
sqlite3 .\database\produccion.db "SELECT COUNT(*) FROM tb_METAS;"
```

Debería devolver `31` (los 31 días de enero 2026).

### 3. Ver los totales cargados

```powershell
sqlite3 .\database\produccion.db -header -column "SELECT SUM(Indigo) as Total_Indigo, SUM(Tejeduria) as Total_Tejeduria, SUM(Integrada) as Total_Integrada, SUM(Revision) as Total_Revision FROM tb_METAS WHERE strftime('%Y-%m', Dia) = '2026-01';"
```

Debería mostrar:
- Total_Indigo: 687500
- Total_Tejeduria: 550000
- Total_Integrada: 550000
- Total_Revision: 550000

### 4. Reiniciar el servidor API (si está corriendo)

```powershell
# Si el servidor está corriendo, detenerlo con Ctrl+C
# Luego reiniciarlo:
node .\scripts\sqlite-api-server.cjs
```

El servidor ahora mostrará los nuevos endpoints de metas.

### 5. Usar el componente en tu aplicación

Agrega el componente a tu router o página:

```javascript
// En tu archivo de router (src/router/index.js)
import MetasCarga from '@/components/MetasCarga.vue'

// Agregar ruta
{
  path: '/metas',
  name: 'Metas',
  component: MetasCarga
}
```

O úsalo directamente en cualquier vista:

```vue
<template>
  <div>
    <MetasCarga />
  </div>
</template>

<script setup>
import MetasCarga from '@/components/MetasCarga.vue'
</script>
```

## 🔍 Verificación de Funcionamiento

### Probar endpoints con cURL o navegador:

```bash
# Obtener metas de enero 2026
curl http://localhost:3002/api/metas?mes=1&año=2026

# Obtener meta del 20 de enero
curl http://localhost:3002/api/metas/2026-01-20
```

## 📊 Estructura de Datos

Cada registro de meta incluye:

- **Dia**: Fecha (YYYY-MM-DD)
- **Indigo**: Meta de producción Indigo
- **Meta_Eficiencia_INDIGO**: Meta de eficiencia (%)
- **Meta_Rotura_INDIGO**: Meta de rotura (%)
- **Meta_Estopa_Azul**: Meta de estopa azul (%)
- **Tejeduria**: Meta de producción Tejeduria
- **RU105**: Meta RU105
- **RT105**: Meta RT105
- **EFI_Percent**: Meta de eficiencia (%)
- **Meta_Estopa_Azul_Tejeduria**: Meta estopa tejeduria
- **Integrada**: Meta producción integrada
- **Meta_Velocidad_Integrada**: Meta de velocidad
- **Meta_ENC_URD_Integrada**: Meta ENC/URD
- **Revision**: Meta de revisión
- **Dia_Invertido**: Día del mes invertido (31, 30, 29...)

## 🎯 Datos Iniciales Cargados

Enero 2026 (31 días):
- Días 1-11: Solo metas de eficiencia/calidad (sin metas de producción)
- Días 12-17: Metas de producción activas (20,000/12,000/20,000)
- Día 18: Domingo (sin metas de producción)
- Días 19-31: Metas completas (43,654/36,769/36,154/41,667)

**Totales del mes:**
- Indigo: 687,500 m
- Tejeduria: 550,000 m
- Integrada: 550,000 m
- Revisión: 550,000 m

## 🚀 Próximos Pasos

1. ✅ Ejecutar `.\scripts\init-metas.ps1`
2. ✅ Verificar datos cargados
3. ✅ Reiniciar servidor API
4. ✅ Integrar componente MetasCarga.vue en tu aplicación
5. ⬜ Cargar metas de otros meses según sea necesario

## 📝 Notas

- El componente genera automáticamente plantillas mensuales con valores por defecto
- Los fines de semana se resaltan en color diferente
- Los totales se calculan automáticamente
- Se puede exportar a Excel/CSV
- Todas las metas son editables inline
- Los cambios se guardan con un solo clic

---

**¡Sistema de Metas listo para usar!** 🎉
