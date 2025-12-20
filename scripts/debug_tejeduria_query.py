import sqlite3

conn = sqlite3.connect('database/produccion.db')
cursor = conn.cursor()

fecha = '01/12/2025'

# 1. Total metros sin JOIN (raw)
query1 = """
SELECT 
    SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) as TotalMetros
FROM tb_PRODUCCION
WHERE DT_BASE_PRODUCAO = ? AND SELETOR IN ('INDIGO', 'TECELAGEM')
"""
result1 = cursor.execute(query1, (fecha,)).fetchone()
print(f"1. Total Metros RAW (sin JOIN): {result1[0]:,.0f}")

# 2. Total metros CON JOIN actual (como está en el código)
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
    SUM(CAST(REPLACE(REPLACE(P.METRAGEM, '.', ''), ',', '.') AS REAL)) as TotalMetros,
    (SUM(CAST(REPLACE(REPLACE(P.METRAGEM, '.', ''), ',', '.') AS REAL) * F.Consumo) / 1000.0) * 0.98 as TotalKg
FROM tb_PRODUCCION P
JOIN FichasUnique F ON REPLACE(REPLACE(TRIM(P.[BASE URDUME]), '.', '/'), '-', '/') = F.URDUME
WHERE P.DT_BASE_PRODUCAO = ? AND P.SELETOR IN ('INDIGO', 'TECELAGEM')
"""
result2 = cursor.execute(query2, (fecha,)).fetchone()
print(f"2. Total Metros CON JOIN normalizado: {result2[0]:,.0f}")
print(f"   Total Kg CON JOIN normalizado: {result2[1]:,.2f}")

# 3. TECELAGEM solo
query3 = """
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
JOIN FichasUnique F ON REPLACE(REPLACE(TRIM(P.[BASE URDUME]), '.', '/'), '-', '/') = F.URDUME
WHERE P.DT_BASE_PRODUCAO = ? AND P.SELETOR = 'TECELAGEM'
"""
result3 = cursor.execute(query3, (fecha,)).fetchone()
print(f"3. TECELAGEM Metros CON JOIN: {result3[0]:,.0f}")
print(f"   TECELAGEM Kg CON JOIN: {result3[1]:,.2f}")

# 4. Verificar cuántos registros NO hacen match
query4 = """
WITH FichasUnique AS (
    SELECT URDUME 
    FROM tb_FICHAS 
    WHERE [CONS#URD/m] IS NOT NULL AND [CONS#URD/m] != '0,00'
    GROUP BY URDUME
)
SELECT COUNT(*) as NoMatch
FROM tb_PRODUCCION P
LEFT JOIN FichasUnique F ON REPLACE(REPLACE(TRIM(P.[BASE URDUME]), '.', '/'), '-', '/') = F.URDUME
WHERE P.DT_BASE_PRODUCAO = ? AND P.SELETOR IN ('INDIGO', 'TECELAGEM') AND F.URDUME IS NULL
"""
result4 = cursor.execute(query4, (fecha,)).fetchone()
print(f"4. Registros SIN MATCH en JOIN: {result4[0]}")

# 5. Ejemplos de BASE URDUME que no hacen match
query5 = """
WITH FichasUnique AS (
    SELECT URDUME 
    FROM tb_FICHAS 
    WHERE [CONS#URD/m] IS NOT NULL AND [CONS#URD/m] != '0,00'
    GROUP BY URDUME
)
SELECT 
    P.[BASE URDUME] as Original,
    REPLACE(REPLACE(TRIM(P.[BASE URDUME]), '.', '/'), '-', '/') as Normalizado
FROM tb_PRODUCCION P
LEFT JOIN FichasUnique F ON REPLACE(REPLACE(TRIM(P.[BASE URDUME]), '.', '/'), '-', '/') = F.URDUME
WHERE P.DT_BASE_PRODUCAO = ? AND P.SELETOR IN ('INDIGO', 'TECELAGEM') AND F.URDUME IS NULL
LIMIT 10
"""
result5 = cursor.execute(query5, (fecha,)).fetchall()
if result5:
    print(f"\n5. Ejemplos de URDUME sin match:")
    for row in result5:
        print(f"   Original: '{row[0]}' -> Normalizado: '{row[1]}'")

conn.close()
