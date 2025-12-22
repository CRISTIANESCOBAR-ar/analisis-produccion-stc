import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = "SELECT DATA_BASE, MOTIVO FROM tb_PARADAS WHERE MOTIVO = 101 LIMIT 5"
df = pd.read_sql_query(query, conn)
print(df)
conn.close()
