import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

# Get production for 2025-12-01
query = """
SELECT 
    P.DT_BASE_PRODUCAO,
    P.[BASE URDUME],
    P.METRAGEM,
    F.[CONS#URD/m],
    F.[CONS#TR/m],
    F.[ENC#TEC#URDUME]
FROM tb_PRODUCCION P
LEFT JOIN tb_FICHAS F ON TRIM(P.[BASE URDUME]) = F.URDUME
WHERE P.DT_BASE_PRODUCAO = '2025-12-01 00:00:00' 
  AND P.SELETOR = 'TECELAGEM'
LIMIT 20
"""
# Note: Date format in DB might be different. 
# Based on previous queries, it seems to be YYYY-MM-DD HH:MM:SS or similar.
# But the user query used substr(D.Fecha, 7, 4)... implying DD/MM/YYYY.
# Let's check the date format first.

cursor = conn.cursor()
cursor.execute("SELECT DT_BASE_PRODUCAO FROM tb_PRODUCCION LIMIT 1")
print(f"Date format: {cursor.fetchone()[0]}")

# Adjust query if needed
query = """
SELECT 
    P.DT_BASE_PRODUCAO,
    P.[BASE URDUME],
    P.METRAGEM,
    F.[CONS#URD/m],
    F.[CONS#TR/m],
    F.[ENC#TEC#URDUME]
FROM tb_PRODUCCION P
LEFT JOIN tb_FICHAS F ON TRIM(P.[BASE URDUME]) = F.URDUME
WHERE P.DT_BASE_PRODUCAO LIKE '01/12/2025%' 
  AND P.SELETOR = 'TECELAGEM'
LIMIT 20
"""

df = pd.read_sql_query(query, conn)
print(df)

conn.close()
