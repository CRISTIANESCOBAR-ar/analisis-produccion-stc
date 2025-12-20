import sqlite3
import os

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Creating index idx_produccion_base_urdume_trim on tb_PRODUCCION...")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_produccion_base_urdume_trim ON tb_PRODUCCION (TRIM([BASE URDUME]))")
    print("Done.")
except Exception as e:
    print(f"Error creating index: {e}")

conn.commit()
conn.close()
