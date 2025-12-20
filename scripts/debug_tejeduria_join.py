import sqlite3

conn = sqlite3.connect('database/produccion.db')
cursor = conn.cursor()

fecha = '01/12/2025'

# Probar diferentes estrategias de JOIN para TECELAGEM

print("=== 1. JOIN directo (sin TRIM) ===")
query1 = """
WITH FichasUnique AS (
    SELECT 
        URDUME, 
        MAX(CAST(REPLACE(REPLACE([CONS#URD/m], '.', ''), ',', '.') AS REAL)) AS Consumo
    FROM tb_FICHAS 
    WHERE [CONS#URD/m] IS NOT NULL AND [CONS#URD/m] != '0,00'
    GROUP BY URDUME
)
SELECT 
    SUM(CAST(REPLACE(REPLACE(P.METRAGEM, '.', ''), ',', '.') AS REAL)) as TejeduriaMetros,
    SUM(CAST(REPLACE(REPLACE(P.METRAGEM, '.', ''), ',', '.') AS REAL) * F.Consumo) / 1000.0 as TejeduriaKg
FROM tb_PRODUCCION P
JOIN FichasUnique F ON P.[BASE URDUME] = F.URDUME
WHERE P.DT_BASE_PRODUCAO = ? AND P.SELETOR = 'TECELAGEM'
"""
result1 = cursor.execute(query1, (fecha,)).fetchone()
print(f"Metros: {result1[0] if result1[0] else 0:,.0f}, Kg: {result1[1] if result1[1] else 0:,.2f}")

print("\n=== 2. JOIN con TRIM ===")
query2 = """
WITH FichasUnique AS (
    SELECT 
        URDUME, 
        MAX(CAST(REPLACE(REPLACE([CONS#URD/m], '.', ''), ',', '.') AS REAL)) AS Consumo
    FROM tb_FICHAS 
    WHERE [CONS#URD/m] IS NOT NULL AND [CONS#URD/m] != '0,00'
    GROUP BY URDUME
)
SELECT 
    SUM(CAST(REPLACE(REPLACE(P.METRAGEM, '.', ''), ',', '.') AS REAL)) as TejeduriaMetros,
    SUM(CAST(REPLACE(REPLACE(P.METRAGEM, '.', ''), ',', '.') AS REAL) * F.Consumo) / 1000.0 as TejeduriaKg
FROM tb_PRODUCCION P
JOIN FichasUnique F ON TRIM(P.[BASE URDUME]) = F.URDUME
WHERE P.DT_BASE_PRODUCAO = ? AND P.SELETOR = 'TECELAGEM'
"""
result2 = cursor.execute(query2, (fecha,)).fetchone()
print(f"Metros: {result2[0] if result2[0] else 0:,.0f}, Kg: {result2[1] if result2[1] else 0:,.2f}")

print("\n=== 3. Contar registros TECELAGEM con/sin match ===")
query3 = """
SELECT 
    COUNT(*) as Total,
    SUM(CASE WHEN F.URDUME IS NOT NULL THEN 1 ELSE 0 END) as ConMatch,
    SUM(CASE WHEN F.URDUME IS NULL THEN 1 ELSE 0 END) as SinMatch
FROM tb_PRODUCCION P
LEFT JOIN (
    SELECT URDUME FROM tb_FICHAS 
    WHERE [CONS#URD/m] IS NOT NULL AND [CONS#URD/m] != '0,00'
    GROUP BY URDUME
) F ON TRIM(P.[BASE URDUME]) = F.URDUME
WHERE P.DT_BASE_PRODUCAO = ? AND P.SELETOR = 'TECELAGEM'
"""
result3 = cursor.execute(query3, (fecha,)).fetchone()
print(f"Total: {result3[0]}, Con match: {result3[1]}, Sin match: {result3[2]}")

print("\n=== 4. Total TECELAGEM sin JOIN (RAW) ===")
query4 = """
SELECT 
    COUNT(*) as Registros,
    SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) as TotalMetros
FROM tb_PRODUCCION
WHERE DT_BASE_PRODUCAO = ? AND SELETOR = 'TECELAGEM'
"""
result4 = cursor.execute(query4, (fecha,)).fetchone()
print(f"Registros: {result4[0]}, Metros RAW: {result4[1]:,.0f}")

conn.close()
