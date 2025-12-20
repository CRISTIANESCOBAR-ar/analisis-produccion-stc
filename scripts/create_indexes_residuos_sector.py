import sqlite3
import os

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

indexes = [
    ("idx_residuos_sector_dt_mov", "tb_RESIDUOS_POR_SECTOR", "(DT_MOV)"),
    ("idx_residuos_sector_descricao", "tb_RESIDUOS_POR_SECTOR", "(DESCRICAO)")
]

for idx_name, table, columns in indexes:
    try:
        print(f"Creating index {idx_name} on {table}...")
        cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} {columns}")
        print("Done.")
    except Exception as e:
        print(f"Error creating index {idx_name}: {e}")

conn.commit()
conn.close()
