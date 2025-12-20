import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = """
SELECT 
    P.ARTIGO as Prod_Artigo,
    F.ARTIGO as Ficha_Artigo,
    F.[CONS#URD/m],
    F.[ENC#TEC#URDUME]
FROM tb_PRODUCCION P
LEFT JOIN tb_FICHAS F ON P.ARTIGO = F.ARTIGO
WHERE P.DT_BASE_PRODUCAO LIKE '01/12/2025%' 
  AND P.SELETOR = 'TECELAGEM'
LIMIT 10
"""

df = pd.read_sql_query(query, conn)
print(df)

conn.close()
