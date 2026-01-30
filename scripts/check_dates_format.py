"""
Verificar cómo se almacenan las fechas en tb_TESTES
"""
import sqlite3

DB_PATH = 'C:/analisis-produccion-stc/database/produccion.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("FECHAS ÚNICAS EN tb_TESTES (MAQUINA 165001, APROV A):")
print("=" * 80)

cursor.execute("""
    SELECT DISTINCT DT_PROD
    FROM tb_TESTES
    WHERE MAQUINA = '165001'
      AND APROV = 'A'
    ORDER BY DT_PROD DESC
    LIMIT 50
""")

fechas = cursor.fetchall()
for fecha in fechas:
    print(fecha[0])

print("\n" + "=" * 80)
print("REGISTROS CON FECHA 28/01/2026:")
print("=" * 80)

cursor.execute("""
    SELECT DT_PROD, COUNT(*), SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL))
    FROM tb_TESTES
    WHERE MAQUINA = '165001'
      AND APROV = 'A'
      AND DT_PROD LIKE '%28/01/2026%'
    GROUP BY DT_PROD
""")

result = cursor.fetchall()
for row in result:
    print(f"Fecha: {row[0]}, Registros: {row[1]}, Total Metragem: {row[2]}")

conn.close()
