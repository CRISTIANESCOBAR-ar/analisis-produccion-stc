"""
Ver la estructura de tb_TESTES y registros duplicados
"""
import sqlite3

DB_PATH = 'C:/analisis-produccion-stc/database/produccion.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Ver estructura
cursor.execute("PRAGMA table_info(tb_TESTES)")
columns = cursor.fetchall()

print("ESTRUCTURA DE tb_TESTES:")
print("=" * 80)
for col in columns:
    print(f"{col[1]:<20} {col[2]:<15} PK:{col[5]}")

print("\n" + "=" * 80)
print("MUESTRA DE REGISTROS DEL 28/01/2026:")
print("=" * 80)

cursor.execute("""
    SELECT * FROM tb_TESTES 
    WHERE MAQUINA = '165001' 
      AND APROV = 'A'
    LIMIT 5
""")

rows = cursor.fetchall()
for row in rows:
    print(row)

conn.close()
