# Solución: Encabezados Repetidos en tb_CALIDAD

## Problema

Los archivos XLSX de calidad (`report5`) contienen filas de encabezados repetidos intercalados con los datos:

```
EMP	DAT_PROD	GRP_DEF	COD_DE	DEFEITO	INDIGO	CC	...
01	2024-01-15	A	123	Defecto1	...
EMP	DAT_PROD	GRP_DEF	COD_DE	DEFEITO	INDIGO	CC	...  ← Encabezado repetido
01	2024-01-16	B	456	Defecto2	...
```

Estas filas se importaban como datos, contaminando la tabla con 78+ filas inválidas.

## Solución Implementada

### 1. Filtro en Python (Prevención)

Modificado `scripts/excel-to-csv-calidad.py` para excluir filas donde `EMP = 'EMP'`:

```python
# Filtrar filas de encabezados repetidos
first_col = df.iloc[:, 0]
df = df[first_col.notna() & (first_col != 'GRP_DEF') & (first_col != 'EMP')]
```

**Efecto**: Los futuros imports automáticamente excluirán estas filas.

### 2. Script de Limpieza (Corrección)

Creado `scripts/clean-calidad-headers.ps1` para eliminar encabezados ya importados:

```powershell
.\scripts\clean-calidad-headers.ps1
```

**Efecto**: Elimina todas las filas donde:
- `EMP = 'EMP'`
- `DAT_PROD = 'DAT_PROD'`
- `GRP_DEF = 'GRP_DEF'`
- `COD_DE = 'COD_DE'`
- `DEFEITO = 'DEFEITO'`

### 3. Limpieza Manual Ejecutada

Ya se ejecutó la limpieza en la base de datos actual:

```
✅ Filas eliminadas: 78
✅ Filas restantes: 666,642
✅ Encabezados restantes: 0
```

## Uso Futuro

### Importación Normal
```powershell
# El filtro está integrado, no requiere pasos adicionales
.\scripts\import-calidad-fast.ps1 `
    -XlsxPath "C:\STC\rptAcompDiarioPBI.xlsx" `
    -SqlitePath "C:\analisis-produccion-stc\database\produccion.db" `
    -Sheet "report5"
```

### Si Detectas Encabezados Nuevamente
```powershell
# Ejecutar script de limpieza
.\scripts\clean-calidad-headers.ps1
```

### Verificación Manual
```sql
-- Ver si hay encabezados
SELECT COUNT(*) FROM tb_CALIDAD WHERE EMP = 'EMP';

-- Eliminar manualmente si es necesario
DELETE FROM tb_CALIDAD WHERE EMP = 'EMP';
```

## Archivos Modificados

1. **scripts/excel-to-csv-calidad.py** - Agregado filtro `!= 'EMP'`
2. **scripts/clean-calidad-headers.ps1** - Nuevo script de limpieza

## Verificación

Para confirmar que la tabla está limpia:

```powershell
sqlite3 database/produccion.db "SELECT * FROM tb_CALIDAD WHERE EMP = 'EMP' LIMIT 5;"
```

Debe retornar 0 resultados.

---

**Fecha de solución**: 9 de diciembre de 2025  
**Filas corregidas**: 78 encabezados eliminados de 666,720 filas totales
