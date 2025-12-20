import sqlite3

db_path = r'c:\analisis-produccion-stc\database\produccion.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT [BASE URDUME] FROM tb_PRODUCCION WHERE [BASE URDUME] LIKE '% ' LIMIT 5")
rows = cursor.fetchall()
if rows:
    print("Found rows with trailing spaces in BASE URDUME:")
    for row in rows:
        print(f"'{row[0]}'")
else:
    print("No trailing spaces found in BASE URDUME (checked with LIKE '% ').")

conn.close()
