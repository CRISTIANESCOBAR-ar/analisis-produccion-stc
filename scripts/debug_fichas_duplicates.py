import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = """
SELECT 
    F.URDUME,
    F.COR,
    F.ARTIGO,
    F.[ENC#TEC#URDUME]
FROM tb_FICHAS F
WHERE F.URDUME = '10+10F4760561' AND F.COR LIKE '561%'
"""

df = pd.read_sql_query(query, conn)
print(df)

conn.close()
