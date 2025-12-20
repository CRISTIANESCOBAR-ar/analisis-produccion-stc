import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = """
SELECT 
    METRAGEM, 
    [METRAGEM ENCOLH]
FROM tb_PRODUCCION 
WHERE SELETOR = 'TECELAGEM'
LIMIT 10
"""

df = pd.read_sql_query(query, conn)
print(df)

conn.close()
