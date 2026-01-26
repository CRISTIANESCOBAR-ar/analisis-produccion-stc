#!/usr/bin/env python3
"""
Reemplazar la lógica de TURNOS_VALIDOS por filtro CASE WHEN en PONTOS_100%
"""
import re

file_path = 'scripts/sqlite-api-server.cjs'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Patrón viejo a buscar
old_pattern = r'''      -- Identificar turnos validos \(donde la suma de PONTOS_LIDOS del turno > 0\)
      TURNOS_VALIDOS AS \(
        SELECT
          CAST\(ROLADA AS INTEGER\) AS ROLADA,
          DT_BASE_PRODUCAO,
          TURNO
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND SELETOR = 'TECELAGEM'
          AND DT_BASE_PRODUCAO != '19/10/2025'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
          AND TURNO IS NOT NULL
        GROUP BY ROLADA, DT_BASE_PRODUCAO, TURNO
        HAVING SUM\(CAST\(REPLACE\(REPLACE\(PONTOS_LIDOS, '\.', ''\), ',', '\.'\) AS REAL\)\) > 0
      \),
      TEJ AS \(
        SELECT
          CAST\(p\.ROLADA AS INTEGER\) AS ROLADA,
          SUM\(CAST\(REPLACE\(REPLACE\(p\.METRAGEM, '\.', ''\), ',', '\.'\) AS REAL\)\) AS MTS_CRUDOS,
          SUM\(CAST\(REPLACE\(REPLACE\(p\.PONTOS_LIDOS, '\.', ''\), ',', '\.'\) AS REAL\)\) AS PONTOS_LIDOS,
          SUM\(CAST\(REPLACE\(REPLACE\(p\."PONTOS_100%", '\.', ''\), ',', '\.'\) AS REAL\)\) AS PONTOS_100,
          SUM\(CAST\(REPLACE\(REPLACE\(p\."PARADA TEC URDUME", '\.', ''\), ',', '\.'\) AS REAL\)\) AS PARADA_TEC_URDUME,
          SUM\(CAST\(REPLACE\(REPLACE\(p\."PARADA TEC TRAMA", '\.', ''\), ',', '\.'\) AS REAL\)\) AS PARADA_TEC_TRAMA
        FROM tb_PRODUCCION p
        INNER JOIN TURNOS_VALIDOS tv ON CAST\(p\.ROLADA AS INTEGER\) = tv\.ROLADA 
                                      AND p\.DT_BASE_PRODUCAO = tv\.DT_BASE_PRODUCAO 
                                      AND p\.TURNO = tv\.TURNO
        WHERE p\.FILIAL = '05'
          AND p\.SELETOR = 'TECELAGEM'
          AND p\.DT_BASE_PRODUCAO != '19/10/2025'
          AND p\.ROLADA IS NOT NULL
          AND p\.ROLADA != ''
        GROUP BY p\.ROLADA
      \),'''

# Nuevo código a insertar
new_code = '''      TEJ AS (
        SELECT
          CAST(ROLADA AS INTEGER) AS ROLADA,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS MTS_CRUDOS,
          SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) AS PONTOS_LIDOS,
          -- Solo sumar PONTOS_100% cuando PONTOS_LIDOS > 0 (excluir registros sin produccion)
          SUM(CASE WHEN CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL) > 0 
                   THEN CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL) 
                   ELSE 0 END) AS PONTOS_100,
          SUM(CAST(REPLACE(REPLACE("PARADA TEC URDUME", '.', ''), ',', '.') AS REAL)) AS PARADA_TEC_URDUME,
          SUM(CAST(REPLACE(REPLACE("PARADA TEC TRAMA", '.', ''), ',', '.') AS REAL)) AS PARADA_TEC_TRAMA
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND SELETOR = 'TECELAGEM'
          AND DT_BASE_PRODUCAO != '19/10/2025'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA
      ),'''

# Contar coincidencias
matches = re.findall(old_pattern, content)
print(f"Coincidencias encontradas: {len(matches)}")

if len(matches) >= 2:
    # Hacer el reemplazo
    new_content = re.sub(old_pattern, new_code, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Reemplazo completado exitosamente")
else:
    print("No se encontraron las coincidencias esperadas")
    print("Buscando patrón simplificado...")
    
    # Intentar un patrón más simple
    simple_pattern = r'-- Identificar turnos validos.*?GROUP BY p\.ROLADA\n      \),'
    matches2 = re.findall(simple_pattern, content, re.DOTALL)
    print(f"Coincidencias con patrón simple: {len(matches2)}")
