import sqlite3
import os

db_path = r'c:\analisis-produccion-stc\database\produccion.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

tables = ['tb_PRODUCCION', 'tb_FICHAS', 'tb_RESIDUOS_INDIGO']

for table in tables:
    print(f"--- Table: {table} ---")
    cursor.execute(f"PRAGMA table_info({table})")
    columns = cursor.fetchall()
    for col in columns:
        print(col)
    
    print(f"--- Indexes for {table} ---")
    cursor.execute(f"PRAGMA index_list({table})")
    indexes = cursor.fetchall()
    for idx in indexes:
        print(idx)
        idx_name = idx[1]
        cursor.execute(f"PRAGMA index_info({idx_name})")
        idx_info = cursor.fetchall()
        print(f"  Columns: {idx_info}")

conn.close()
