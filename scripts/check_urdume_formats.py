import sqlite3

conn = sqlite3.connect('database/produccion.db')
cursor = conn.cursor()

# Ver ejemplos de URDUME en tb_FICHAS
print("=== URDUME en tb_FICHAS ===")
result = cursor.execute("SELECT URDUME FROM tb_FICHAS WHERE URDUME LIKE 'U12%' LIMIT 10").fetchall()
for row in result:
    print(f"  '{row[0]}'")

print("\n=== BASE URDUME en tb_PRODUCCION (01/12/2025, primeros 10) ===")
result2 = cursor.execute("SELECT DISTINCT [BASE URDUME] FROM tb_PRODUCCION WHERE DT_BASE_PRODUCAO = '01/12/2025' LIMIT 10").fetchall()
for row in result2:
    print(f"  '{row[0]}'")

conn.close()
