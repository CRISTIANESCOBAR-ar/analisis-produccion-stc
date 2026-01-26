#!/usr/bin/env python3
"""
Verificar si la eficiencia esperada es filtrando solo registros con PONTOS_LIDOS > 0
"""
import sqlite3

db_path = 'database/produccion.db'
conn = sqlite3.connect(db_path)

# Opción 1: Filtrar registros donde PONTOS_LIDOS > 0 individualmente
query = """
SELECT 
    SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) as SUM_PL,
    SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL)) as SUM_P100,
    COUNT(*) as CNT
FROM tb_PRODUCCION
WHERE FILIAL = '05'
  AND SELETOR = 'TECELAGEM'
  AND CAST(ROLADA AS INTEGER) = 5431
  AND DT_BASE_PRODUCAO != '19/10/2025'
  AND CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL) > 0
"""
r = conn.execute(query).fetchone()
print("=" * 70)
print("OPCIÓN 1: Solo registros individuales con PONTOS_LIDOS > 0")
print("=" * 70)
print(f"  SUM_PL: {r[0]:,.1f}")
print(f"  SUM_P100: {r[1]:,.1f}")
print(f"  Eficiencia: {(r[0]/r[1]*100):.1f}%")
print(f"  Registros: {r[2]}")

# Opción 2: Todos los registros (sin filtro)
query2 = """
SELECT 
    SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) as SUM_PL,
    SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL)) as SUM_P100,
    COUNT(*) as CNT
FROM tb_PRODUCCION
WHERE FILIAL = '05'
  AND SELETOR = 'TECELAGEM'
  AND CAST(ROLADA AS INTEGER) = 5431
  AND DT_BASE_PRODUCAO != '19/10/2025'
"""
r2 = conn.execute(query2).fetchone()
print("\n" + "=" * 70)
print("OPCIÓN 2: Todos los registros (sin filtro)")
print("=" * 70)
print(f"  SUM_PL: {r2[0]:,.1f}")
print(f"  SUM_P100: {r2[1]:,.1f}")
print(f"  Eficiencia: {(r2[0]/r2[1]*100):.1f}%")
print(f"  Registros: {r2[2]}")

# Opción 3: Excluyendo turnos completos con suma = 0
query3 = """
WITH TURNOS_VALIDOS AS (
    SELECT DT_BASE_PRODUCAO, TURNO
    FROM tb_PRODUCCION
    WHERE FILIAL = '05'
      AND SELETOR = 'TECELAGEM'
      AND CAST(ROLADA AS INTEGER) = 5431
      AND DT_BASE_PRODUCAO != '19/10/2025'
    GROUP BY DT_BASE_PRODUCAO, TURNO
    HAVING SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) > 0
)
SELECT 
    SUM(CAST(REPLACE(REPLACE(P.PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) as SUM_PL,
    SUM(CAST(REPLACE(REPLACE(P."PONTOS_100%", '.', ''), ',', '.') AS REAL)) as SUM_P100,
    COUNT(*) as CNT
FROM tb_PRODUCCION P
INNER JOIN TURNOS_VALIDOS TV ON P.DT_BASE_PRODUCAO = TV.DT_BASE_PRODUCAO AND P.TURNO = TV.TURNO
WHERE P.FILIAL = '05'
  AND P.SELETOR = 'TECELAGEM'
  AND CAST(P.ROLADA AS INTEGER) = 5431
  AND P.DT_BASE_PRODUCAO != '19/10/2025'
"""
r3 = conn.execute(query3).fetchone()
print("\n" + "=" * 70)
print("OPCIÓN 3: Excluyendo turnos completos con suma = 0")
print("=" * 70)
print(f"  SUM_PL: {r3[0]:,.1f}")
print(f"  SUM_P100: {r3[1]:,.1f}")
print(f"  Eficiencia: {(r3[0]/r3[1]*100):.1f}%")
print(f"  Registros: {r3[2]}")

print("\n" + "=" * 70)
print("RESUMEN")
print("=" * 70)
print(f"  Opción 1 (solo PONTOS_LIDOS > 0): {(r[0]/r[1]*100):.1f}%")
print(f"  Opción 2 (todos): {(r2[0]/r2[1]*100):.1f}%")
print(f"  Opción 3 (excluir turnos con sum=0): {(r3[0]/r3[1]*100):.1f}%")
print(f"  Usuario espera: 75.7%")

conn.close()
