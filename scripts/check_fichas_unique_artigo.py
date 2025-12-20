import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = """
SELECT ARTIGO, COUNT(*) as cnt
FROM tb_FICHAS
GROUP BY ARTIGO
HAVING cnt > 1
LIMIT 10
"""

df = pd.read_sql_query(query, conn)
print("Duplicate ARTIGOs in tb_FICHAS:")
print(df)

conn.close()
