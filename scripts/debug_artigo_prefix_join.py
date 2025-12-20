import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = """
SELECT 
    P.DT_BASE_PRODUCAO,
    P.ARTIGO as Prod_Artigo,
    F.ARTIGO as Ficha_Artigo,
    F.[ENC#TEC#URDUME]
FROM tb_PRODUCCION P
JOIN tb_FICHAS F ON TRIM(P.[BASE URDUME]) = F.URDUME 
                 AND P.ARTIGO LIKE F.ARTIGO || '%'
WHERE P.DT_BASE_PRODUCAO LIKE '01/12/2025%' 
  AND P.SELETOR = 'TECELAGEM'
LIMIT 20
"""

df = pd.read_sql_query(query, conn)
print(df)

conn.close()
