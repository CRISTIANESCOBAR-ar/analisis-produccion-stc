import sqlite3
import os

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

indexes = [
    ("idx_produccion_base_urdume", "tb_PRODUCCION", "([BASE URDUME])"),
    ("idx_fichas_urdume", "tb_FICHAS", "(URDUME)"),
    ("idx_residuos_dt_mov", "tb_RESIDUOS_INDIGO", "(DT_MOV)"),
    ("idx_residuos_descricao", "tb_RESIDUOS_INDIGO", "(DESCRICAO)")
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
