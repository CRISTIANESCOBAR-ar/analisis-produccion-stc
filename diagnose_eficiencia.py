#!/usr/bin/env python3
"""
Diagnóstico: Comparar cálculo de eficiencia para rolada 5431
"""
import sqlite3

db_path = 'database/produccion.db'
conn = sqlite3.connect(db_path)

# 1. Consultar todos los registros de TECELAGEM para rolada 5431
query_all = """
SELECT 
    DT_BASE_PRODUCAO,
    TURNO,
    CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL) as PONTOS_LIDOS,
    CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL) as PONTOS_100
FROM tb_PRODUCCION
WHERE FILIAL = '05'
  AND SELETOR = 'TECELAGEM'
  AND CAST(ROLADA AS INTEGER) = 5431
  AND DT_BASE_PRODUCAO != '19/10/2025'
ORDER BY DT_BASE_PRODUCAO, TURNO
"""

print("=" * 80)
print("REGISTROS DE TECELAGEM PARA ROLADA 5431")
print("=" * 80)

cursor = conn.execute(query_all)
rows = cursor.fetchall()

total_pontos_lidos = 0
total_pontos_100 = 0

for row in rows:
    dt, turno, pl, p100 = row
    total_pontos_lidos += (pl or 0)
    total_pontos_100 += (p100 or 0)
    print(f"{dt} | {turno} | PONTOS_LIDOS: {pl:,.1f} | PONTOS_100%: {p100:,.1f}")

print("-" * 80)
print(f"TOTAL SIN FILTRO: PONTOS_LIDOS = {total_pontos_lidos:,.1f}, PONTOS_100% = {total_pontos_100:,.1f}")
print(f"EFICIENCIA SIN FILTRO: {(total_pontos_lidos / total_pontos_100 * 100):.1f}%")

# 2. Agrupar por DT_BASE_PRODUCAO + TURNO y ver cuáles tienen suma = 0
query_grouped = """
SELECT 
    DT_BASE_PRODUCAO,
    TURNO,
    SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) as SUM_PONTOS_LIDOS,
    SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL)) as SUM_PONTOS_100
FROM tb_PRODUCCION
WHERE FILIAL = '05'
  AND SELETOR = 'TECELAGEM'
  AND CAST(ROLADA AS INTEGER) = 5431
  AND DT_BASE_PRODUCAO != '19/10/2025'
GROUP BY DT_BASE_PRODUCAO, TURNO
ORDER BY DT_BASE_PRODUCAO, TURNO
"""

print("\n" + "=" * 80)
print("AGRUPADO POR DT_BASE_PRODUCAO + TURNO")
print("=" * 80)

cursor = conn.execute(query_grouped)
rows = cursor.fetchall()

turnos_validos_pl = 0
turnos_validos_p100 = 0
turnos_invalidos = []

for row in rows:
    dt, turno, sum_pl, sum_p100 = row
    if sum_pl > 0:
        turnos_validos_pl += sum_pl
        turnos_validos_p100 += sum_p100
        status = "VALIDO"
    else:
        turnos_invalidos.append((dt, turno, sum_pl, sum_p100))
        status = "EXCLUIR (sum=0)"
    print(f"{dt} | {turno} | SUM_PL: {sum_pl:,.1f} | SUM_P100: {sum_p100:,.1f} | {status}")

print("-" * 80)
print(f"\nTURNOS A EXCLUIR ({len(turnos_invalidos)}):")
for t in turnos_invalidos:
    print(f"  - {t[0]} {t[1]}: PONTOS_LIDOS={t[2]}, PONTOS_100%={t[3]}")

print(f"\nTOTAL CON FILTRO: PONTOS_LIDOS = {turnos_validos_pl:,.1f}, PONTOS_100% = {turnos_validos_p100:,.1f}")
if turnos_validos_p100 > 0:
    print(f"EFICIENCIA CON FILTRO: {(turnos_validos_pl / turnos_validos_p100 * 100):.1f}%")

conn.close()
