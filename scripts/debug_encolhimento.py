import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = """
SELECT 
    URDUME, 
    [CONS#URD/m], 
    [ENC#TEC#URDUME]
FROM tb_FICHAS 
WHERE URDUME = 'U12/1F4236516'
LIMIT 1
"""

df = pd.read_sql_query(query, conn)
print(df)

conn.close()
