import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = """
SELECT 
    P.DT_BASE_PRODUCAO,
    P.[BASE URDUME],
    P.COR as Prod_Cor,
    P.ARTIGO as Prod_Artigo,
    F.URDUME,
    F.COR as Ficha_Cor,
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
