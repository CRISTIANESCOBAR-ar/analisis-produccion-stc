import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = "SELECT * FROM tb_FICHAS LIMIT 1"
df = pd.read_sql_query(query, conn)
for col in df.columns:
    print(f"{col}: {df[col][0]}")

conn.close()
