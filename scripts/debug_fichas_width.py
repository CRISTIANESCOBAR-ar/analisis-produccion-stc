import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = """
SELECT 
    URDUME, 
    LARGURA,
    [LARGURA MIN],
    [LARGURA MAX],
    [LARG#PENTE],
    [LARG#CRU]
FROM tb_FICHAS 
WHERE [CONS#URD/m] IS NOT NULL 
LIMIT 10
"""

df = pd.read_sql_query(query, conn)
print(df)

conn.close()
