import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = """
SELECT 
    URDUME, 
    COUNT(DISTINCT [ENC#TEC#URDUME]) as distinct_enc,
    MIN([ENC#TEC#URDUME]) as min_enc,
    MAX([ENC#TEC#URDUME]) as max_enc
FROM tb_FICHAS 
WHERE [ENC#TEC#URDUME] IS NOT NULL
GROUP BY URDUME
HAVING distinct_enc > 1
"""

df = pd.read_sql_query(query, conn)
print("URDUMEs with multiple ENC values:")
print(df)

conn.close()
