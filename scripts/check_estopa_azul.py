import sqlite3
import pandas as pd

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)

query = "SELECT DISTINCT DESCRICAO FROM tb_RESIDUOS_POR_SECTOR WHERE DESCRICAO LIKE '%ESTOPA%'"
df = pd.read_sql_query(query, conn)
print("Descriptions in tb_RESIDUOS_POR_SECTOR:")
print(df)

query_sample = "SELECT * FROM tb_RESIDUOS_POR_SECTOR WHERE DESCRICAO = 'ESTOPA AZUL' LIMIT 5"
df_sample = pd.read_sql_query(query_sample, conn)
print("\nSample data for 'ESTOPA AZUL':")
print(df_sample)

conn.close()
