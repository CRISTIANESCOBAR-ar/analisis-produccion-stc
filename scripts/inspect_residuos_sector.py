import sqlite3
import os

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

table = 'tb_RESIDUOS_POR_SECTOR'
print(f"--- Table: {table} ---")
cursor.execute(f"PRAGMA table_info({table})")
columns = cursor.fetchall()
for col in columns:
    print(col)

# Check sample data for 'ESTOPA AZUL TEJEDURÍA'
print(f"\n--- Sample data for 'ESTOPA AZUL TEJEDURÍA' ---")
cursor.execute(f"SELECT * FROM {table} WHERE DESCRICAO = 'ESTOPA AZUL TEJEDURÍA' LIMIT 5")
rows = cursor.fetchall()
for row in rows:
    print(row)

# Check distinct descriptions to be sure about the name
print(f"\n--- Distinct Descriptions ---")
cursor.execute(f"SELECT DISTINCT DESCRICAO FROM {table} LIMIT 20")
rows = cursor.fetchall()
for row in rows:
    print(row)

conn.close()
