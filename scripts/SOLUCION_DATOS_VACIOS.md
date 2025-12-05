# 🔧 Solución: Datos Vacíos en PONTOS_LIDOS

## 📋 Problema Identificado

Los archivos CSV en `C:\analisis-stock-stc\exports\` tienen columnas **PONTOS_LIDOS**, **PONTOS_100%**, **PARADA TEC TRAMA** y **PARADA TEC URDUME** **completamente vacías**.

**Causa:** El script de exportación original no capturó correctamente estas columnas desde Access.

**Impacto:** 5 años de datos (~100,000+ registros desde 2020 a 2025) sin información crítica de producción.

---

## ✅ Solución: Re-exportar desde Access con Excel VBA

### 📝 Paso 1: Configurar el código VBA

1. **Abre Excel** (cualquier archivo o uno nuevo)
2. Presiona `Alt + F11` para abrir el Editor de VBA
3. Ve a `Insertar > Módulo` (Insert > Module)
4. Copia y pega **TODO** el contenido de `ExportarProduccionCompleto.vba`
5. **IMPORTANTE**: Modifica la línea 25 con la ruta correcta a tu base de datos Access:
   ```vba
   strAccessPath = "C:\STC\STC_Database.accdb"  ' <--- CAMBIA ESTA RUTA
   ```

### 🔍 Paso 2: Verificar datos en Access (OPCIONAL pero recomendado)

1. En el Editor VBA, ubica la función `VerificarColumnasVacias`
2. Haz clic dentro de la función
3. Presiona `F5` para ejecutarla
4. Esto te mostrará:
   - ✓ Cuántos registros de TECELAGEM tiene Access
   - ✓ Cuántos tienen PONTOS_LIDOS con datos vs NULL
   - ✓ Ejemplo específico de la partida 1541315

**Resultado esperado:**
```
Total registros TECELAGEM: 120,000+
PONTOS_LIDOS:
  • Con datos: 115,000+
  • NULL/0: 5,000
```

### 🚀 Paso 3: Exportar los datos (mes por mes)

1. En el Editor VBA, ubica la función `ExportarProduccionCompleto`
2. Haz clic dentro de la función
3. Presiona `F5` para ejecutarla
4. El script procesará **automáticamente todos los meses desde 2020 hasta 2025**

**Durante la exportación verás:**
- Barra de estado de Excel mostrando progreso
- Ventana Inmediato (`Ctrl + G`) con log detallado:
  ```
  ✓ 2020-01: 2,145 registros exportados
  ✓ 2020-02: 1,987 registros exportados
  ...
  ✓ 2025-11: 2,312 registros exportados
  ```

**Resultado:**
- 📁 Archivos CSV en: `C:\analisis-stock-stc\exports\`
- 📄 Formato: `tb_PRODUCCION_2020_01.csv`, `tb_PRODUCCION_2020_02.csv`, etc.
- ⏱️ Tiempo estimado: 3-8 minutos (dependiendo de hardware)

**Ventajas de exportar mes por mes:**
- ✅ Maneja 5 años de datos sin problemas de memoria
- ✅ Si falla un mes, puedes continuar con los demás
- ✅ Más fácil de diagnosticar problemas
- ✅ Compatible con el sistema de importación actual

Una vez que tengas los CSV correctos en `C:\analisis-stock-stc\exports\`:

```powershell
# Opción 1: Usar el script de actualización completo
.\scripts\update-all-tables.ps1

# Opción 2: Importar solo tb_PRODUCCION
.\scripts\import-xlsx-to-sqlite.ps1 -TableName "tb_PRODUCCION"
```

---

## 🔍 Verificación Post-Importación

Después de importar, verifica que los datos estén correctos:

### Opción 1: Verificar en la API

```powershell
# Reiniciar API
npm run api

# En otro terminal, verificar datos
Invoke-RestMethod "http://localhost:3002/api/test/produccion-partida?partida=1541315"
```

Deberías ver:
- `PONTOS_LIDOS` con valores numéricos (no NULL)
- `PONTOS_100%` con valores numéricos
- `PARADA TEC TRAMA` y `PARADA TEC URDUME` con valores

### Opción 2: Verificar directamente en SQLite

```powershell
sqlite3 .\database\produccion.db "SELECT PONTOS_LIDOS, [PONTOS_100%] FROM tb_PRODUCCION WHERE PARTIDA = '1541315' AND SELETOR = 'TECELAGEM' LIMIT 5"
```

---

## 📊 Columnas Críticas Exportadas

El script VBA exporta **64 columnas** incluyendo:

| Columna | Descripción | Uso |
|---------|-------------|-----|
| `PONTOS_LIDOS` | Puntos leídos en producción | Cálculo de Eficiencia % |
| `PONTOS_100%` | Puntos al 100% | Cálculo de Eficiencia % |
| `PARADA TEC TRAMA` | Paradas técnicas de trama | Cálculo de RT105 |
| `PARADA TEC URDUME` | Paradas técnicas de urdimbre | Cálculo de RU105 |
| `MAQUINA` | Número de máquina | Extracción de Telar (últimos 2 dígitos) |
| `PARTIDA` | ID de partida | JOIN con tb_CALIDAD |

---

## 🎯 Resultado Esperado

Después de seguir estos pasos, en la pantalla de **Revisión CQ**:

- ✅ Al hacer clic en un revisor, la tabla de detalle mostrará:
  - **Telar**: 01, 02, 49, etc.
  - **Eficiencia %**: valores calculados (ej: 85.3%)
  - **RU 105**: valores calculados
  - **RT 105**: valores calculados

En lugar de mostrar `-` (guiones) por datos NULL.

---

## 🚨 Troubleshooting

### Error: "No hay datos para exportar"
- Verifica que `FILIAL = 5` tenga registros en Access
- Prueba ejecutar `VerificarColumnasVacias` primero

### Los archivos CSV tienen comas en lugar de puntos
- El script VBA convierte automáticamente comas a puntos
- Verifica la configuración regional de Windows

### La importación a SQLite falla
- Asegúrate de que los archivos estén en `C:\analisis-stock-stc\exports\`
- Verifica que tengan el formato: `tb_PRODUCCION_2024_11.csv`
- Revisa que las columnas tengan encabezados entre comillas: `"PONTOS_LIDOS"`

---

## 📝 Notas Adicionales

- **Backup**: Los archivos CSV anteriores se sobrescribirán. Haz backup si necesitas conservarlos.
- **Tiempo**: La exportación puede tardar 2-5 minutos dependiendo del volumen de datos.
- **Memoria**: Exportar mes por mes evita problemas de memoria con tablas grandes.
- **Encoding**: Los CSV se exportan con UTF-8 para preservar caracteres especiales.

---

**Autor**: Sistema de Análisis de Producción STC  
**Fecha**: Diciembre 2024  
**Versión**: 1.0
