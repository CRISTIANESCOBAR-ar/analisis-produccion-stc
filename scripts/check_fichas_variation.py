import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = """
SELECT 
    ARTIGO, 
    COUNT(DISTINCT [CONS#URD/m]) as distinct_cons,
    COUNT(DISTINCT [ENC#TEC#URDUME]) as distinct_enc
FROM tb_FICHAS
GROUP BY ARTIGO
HAVING distinct_cons > 1 OR distinct_enc > 1
LIMIT 10
"""

df = pd.read_sql_query(query, conn)
print("ARTIGOs with varying parameters:")
print(df)

conn.close()
