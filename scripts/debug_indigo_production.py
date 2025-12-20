import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = """
SELECT 
    P.DT_BASE_PRODUCAO,
    P.SELETOR,
    P.METRAGEM,
    P.[BASE URDUME],
    F.[CONS#URD/m]
FROM tb_PRODUCCION P
LEFT JOIN tb_FICHAS F ON TRIM(P.[BASE URDUME]) = F.URDUME
WHERE P.DT_BASE_PRODUCAO LIKE '01/12/2025%' 
  AND P.SELETOR = 'INDIGO'
LIMIT 20
"""

df = pd.read_sql_query(query, conn)
print(df)

# Also get total sum for Indigo on that day
query_sum = """
SELECT 
    SUM(CAST(REPLACE(REPLACE(P.METRAGEM, '.', ''), ',', '.') AS REAL)) as TotalMetros
FROM tb_PRODUCCION P
WHERE P.DT_BASE_PRODUCAO LIKE '01/12/2025%' 
  AND P.SELETOR = 'INDIGO'
"""
df_sum = pd.read_sql_query(query_sum, conn)
print("Total Indigo Metros:", df_sum.iloc[0,0])

conn.close()
