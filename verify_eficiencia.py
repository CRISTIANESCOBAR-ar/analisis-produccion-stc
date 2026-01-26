#!/usr/bin/env python3
"""
Verificar eficiencia con la nueva lógica directamente en SQLite
"""
import sqlite3

db_path = 'database/produccion.db'
conn = sqlite3.connect(db_path)

# Nueva consulta TEJ con CASE WHEN
query = """
SELECT
  CAST(ROLADA AS INTEGER) AS ROLADA,
  SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) AS PONTOS_LIDOS,
  SUM(CASE WHEN CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL) > 0 
           THEN CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL) 
           ELSE 0 END) AS PONTOS_100
FROM tb_PRODUCCION
WHERE FILIAL = '05'
  AND SELETOR = 'TECELAGEM'
  AND DT_BASE_PRODUCAO != '19/10/2025'
  AND ROLADA IS NOT NULL
  AND ROLADA != ''
  AND CAST(ROLADA AS INTEGER) = 5431
GROUP BY ROLADA
"""

r = conn.execute(query).fetchone()
print("=" * 60)
print("NUEVA LÓGICA: CASE WHEN PONTOS_LIDOS > 0")
print("=" * 60)
print(f"ROLADA: {r[0]}")
print(f"PONTOS_LIDOS: {r[1]:,.1f}")
print(f"PONTOS_100%: {r[2]:,.1f}")
efic = (r[1] / r[2]) * 100 if r[2] > 0 else 0
print(f"EFICIENCIA: {efic:.1f}%")
print()
print(f"Esperado: 75.7%")
print(f"Obtenido: {efic:.1f}%")

conn.close()
