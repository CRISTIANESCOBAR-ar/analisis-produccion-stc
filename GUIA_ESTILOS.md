# Guía de Estilos del Proyecto - analisis-produccion-stc

**Basado en:** `carga-datos-vue/src/components/ResumenEnsayos.vue`  
**Última actualización:** 11 de diciembre de 2025

## 🎨 Paleta de Colores

### Colores Principales
- **Azul primario:** `blue-500`, `blue-600`, `blue-700`
- **Azul suave (fondos):** `blue-50` (muy claro, casi blanco con tinte azul)
- **Slate (grises neutros):** `slate-50`, `slate-100`, `slate-200`, `slate-600`, `slate-700`, `slate-800`

### Colores de Estado
- **Éxito/OK:** `green-50`, `green-700`, `green-500` (borde)
- **Error/Fuera de rango:** `red-50`, `red-600`, `red-700`, `red-500` (borde)
- **Advertencia:** `orange-100`, `orange-600`

---

## 📦 Contenedores Principales

### Contenedor externo (página completa)
```vue
<div class="w-full h-screen flex flex-col p-1">
```
- **Padding:** `p-1` (4px)
- **Layout:** `flex flex-col` (columna)
- **Tamaño:** `w-full h-screen`

### Contenedor principal (main)
```vue
<main class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col">
```
- **Fondo:** `bg-white`
- **Bordes redondeados:** `rounded-2xl` (16px)
- **Sombra:** `shadow-xl`
- **Padding:** `px-4 py-3` (16px horizontal, 12px vertical)
- **Borde:** `border border-slate-200` (gris claro, 1px)
- **Layout:** `flex flex-col`

---

## 🔘 Botones

### Botón estándar (minimalista y moderno)
```vue
<button class="inline-flex items-center gap-1 px-2 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md">
```

**Características:**
- **Layout:** `inline-flex items-center gap-1`
- **Padding:** `px-2 py-1` (8px horizontal, 4px vertical)
- **Borde:** `border border-slate-200` (gris claro)
- **Fondo:** `bg-white`
- **Texto:** `text-slate-700`, `text-sm`, `font-medium`
- **Bordes redondeados:** `rounded-md` (6px - **menos pronunciado que antes**)
- **Hover:** `hover:bg-slate-50`
- **Transición:** `transition-colors duration-150`
- **Sombra:** `shadow-sm hover:shadow-md`

### Botón con estado activo (filtro seleccionado)
```vue
<button :class="active ? 'bg-blue-50 text-blue-700 border-blue-500' : 'bg-white text-slate-700 hover:bg-slate-50'">
```

**Estados:**
- **Activo:** `bg-blue-50 text-blue-700 border-blue-500`
- **Inactivo:** `bg-white text-slate-700 hover:bg-slate-50`

### Botones de navegación (< >)
```vue
<button class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors duration-150 shadow-sm">
```

**Tamaño fijo:** `w-9 h-9` (36px × 36px)

---

## 📊 Tablas

### Contenedor de tabla
```vue
<div class="overflow-auto _minimal-scroll w-full flex-1 min-h-0 rounded-xl border border-slate-200 pb-0">
```

**Características:**
- **Overflow:** `overflow-auto` (scroll si es necesario)
- **Scroll minimalista:** `_minimal-scroll` (clase custom CSS)
- **Bordes redondeados:** `rounded-xl` (12px)
- **Borde:** `border border-slate-200` (**sin sombreado lateral, solo borde simple**)

### Elemento `<table>`
```vue
<table class="min-w-full w-full table-auto divide-y divide-slate-200 text-xs">
```

**Características:**
- **Ancho:** `min-w-full w-full`
- **Layout:** `table-auto`
- **Divisores:** `divide-y divide-slate-200` (líneas horizontales grises claras)
- **Tamaño de texto:** `text-xs` (12px)

### `<thead>` (cabecera)
```vue
<thead class="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-20">
```

**Fondo:** `bg-gradient-to-r from-slate-50 to-slate-100` (**gradiente azulado suave**)  
**Sticky:** `sticky top-0 z-20` (se queda fijo al hacer scroll)

### Celdas de cabecera `<th>`
```vue
<th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">
```

**Padding:** `px-2 py-[0.3rem]` (8px horizontal, ~4.8px vertical - **muy compacto**)  
**Texto:** `text-center font-semibold text-slate-700`  
**Borde inferior:** `border-b border-slate-200`

### Filas del cuerpo `<tr>`
```vue
<tr class="border-t border-slate-100 hover:bg-blue-50/30 transition-colors duration-150">
```

**Hover:** `hover:bg-blue-50/30` (**azul suave con 30% opacidad**)  
**Transición:** `transition-colors duration-150`  
**Borde:** `border-t border-slate-100` (línea superior muy sutil)

### Celdas del cuerpo `<td>`
```vue
<td class="px-2 py-[0.3rem] text-center text-slate-700">
```

**Padding:** `px-2 py-[0.3rem]` (igual que `<th>`)  
**Texto:** `text-center text-slate-700`

---

## 🎛️ Inputs y Selects

### Input de búsqueda
```vue
<input class="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
```

**Focus:**
- `focus:outline-none`
- `focus:ring-2 focus:ring-blue-500` (anillo azul)
- `focus:border-blue-500`

### Select
```vue
<select class="px-2 py-1 border border-slate-200 rounded-md text-sm">
```

---

## 📐 Espaciado y Layout

### Gaps entre elementos
- **Gap pequeño:** `gap-1` (4px), `gap-1.5` (6px)
- **Gap medio:** `gap-2` (8px)
- **Gap grande:** `gap-3` (12px)

### Margin bottom
- **Sección header:** `mb-3` (12px)

### Padding de contenedores
- **Contenedor principal:** `px-4 py-3` (16px horizontal, 12px vertical)
- **Tablas internas:** `px-2 py-[0.3rem]` (8px horizontal, ~5px vertical)

---

## 🔄 Transiciones

### Estándar
```css
transition-colors duration-150
```

### Con transformación
```css
transition-all duration-300
```

---

## 🎯 Patrones de Uso

### Botón con icono y texto
```vue
<button class="inline-flex items-center gap-1 px-2 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md">
  <svg class="h-4 w-4">...</svg>
  <span>Texto</span>
</button>
```

### Tabla completa (estructura mínima)
```vue
<div class="overflow-auto _minimal-scroll w-full flex-1 min-h-0 rounded-xl border border-slate-200 pb-0">
  <table class="min-w-full w-full table-auto divide-y divide-slate-200 text-xs">
    <thead class="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-20">
      <tr>
        <th class="px-2 py-[0.3rem] text-center font-semibold text-slate-700 border-b border-slate-200">Columna</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-t border-slate-100 hover:bg-blue-50/30 transition-colors duration-150">
        <td class="px-2 py-[0.3rem] text-center text-slate-700">Dato</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## ✨ Diferencias Clave vs. Estilos Anteriores

| Elemento | Antes | Ahora (ResumenEnsayos) |
|----------|-------|------------------------|
| **Bordes redondeados (botones)** | `rounded-lg` (8px) | `rounded-md` (6px) - **menos pronunciado** |
| **Bordes redondeados (main)** | `rounded-xl` (12px) | `rounded-2xl` (16px) |
| **Sombra tabla** | `shadow-lg` | `border border-slate-200` - **sin sombra, solo borde** |
| **Hover fila tabla** | `hover:bg-slate-100` | `hover:bg-blue-50/30` - **azul suave** |
| **Gradiente header** | `bg-gray-100` | `bg-gradient-to-r from-slate-50 to-slate-100` - **gradiente azulado** |
| **Padding celdas** | `px-4 py-2` | `px-2 py-[0.3rem]` - **mucho más compacto** |

---

## 🚀 Cómo Aplicar

Para aplicar estos estilos a un componente nuevo:

1. **Copiar la estructura de contenedores** (main con `rounded-2xl shadow-xl border border-slate-200`)
2. **Usar los botones estándar** (minimalistas con `shadow-sm hover:shadow-md`)
3. **Aplicar clases de tabla** (sin sombra lateral, solo `border border-slate-200`)
4. **Usar colores slate** para grises y `blue-50/30` para hover
5. **Mantener padding compacto** en celdas (`px-2 py-[0.3rem]`)

---

**Nota:** Esta guía debe actualizarse cuando se definan nuevos patrones de diseño.
