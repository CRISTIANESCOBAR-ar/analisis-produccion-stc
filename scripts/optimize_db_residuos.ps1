$dbPath = "c:\analisis-produccion-stc\database\produccion.db"
$sqlite = "sqlite3.exe" # Assuming sqlite3 is in path, or I can use the one in the workspace if available. 
# Actually, I'll use the python script approach as I know python is available and I can use the sqlite3 module.

$pythonScript = @"
import sqlite3
import os

db_path = r'$dbPath'
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
"@

$pythonScript | Out-File -Encoding UTF8 "c:\analisis-produccion-stc\scripts\create_indexes_residuos.py"

python "c:\analisis-produccion-stc\scripts\create_indexes_residuos.py"
