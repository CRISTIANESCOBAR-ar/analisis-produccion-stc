#!/usr/bin/env python3
import sqlite3
import os

db_path = r'c:\analisis-produccion-stc\database\produccion.db'

if not os.path.exists(db_path):
    print(f"❌ Base de datos no encontrada: {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Columnas de tb_CALIDAD
    print("\n=== DIAGNÓSTICO tb_CALIDAD ===\n")
    cursor.execute("PRAGMA table_info(tb_CALIDAD)")
    columns = cursor.fetchall()
    print("📋 Columnas:")
    for idx, col in enumerate(columns, 1):
        print(f"  {idx}. {col[1]} ({col[2]})")
    
    # 2. Total de registros
    cursor.execute("SELECT COUNT(*) FROM tb_CALIDAD")
    total = cursor.fetchone()[0]
    print(f"\n📊 Total de registros: {total}")
    
    # 3. Rango de fechas
    cursor.execute("SELECT MIN(DAT_PROD), MAX(DAT_PROD) FROM tb_CALIDAD")
    result = cursor.fetchone()
    min_d, max_d = result if result else (None, None)
    print(f"📅 Rango de fechas: {min_d} a {max_d}")
    
    # 4. Valores únicos de GRP_DEF
    cursor.execute("SELECT DISTINCT GRP_DEF, COUNT(*) as cnt FROM tb_CALIDAD GROUP BY GRP_DEF ORDER BY cnt DESC")
    sectors = cursor.fetchall()
    print("\n🏭 Sectores únicos (GRP_DEF):")
    for sector, count in sectors:
        print(f"  {sector}: {count}")
    
    # 5. Sample de datos
    cursor.execute("SELECT DAT_PROD, GRP_DEF, EMP, METRAGEM FROM tb_CALIDAD LIMIT 3")
    samples = cursor.fetchall()
    print("\n📋 Ejemplos de registros:")
    for row in samples:
        print(f"  Fecha: {row[0]}, Sector: {row[1]}, EMP: {row[2]}, Metros: {row[3]}")
    
    # 6. Datos para 19/01/2026
    print("\n🔍 Datos para 19/01/2026 (EMP='STC'):")
    cursor.execute("""
        SELECT GRP_DEF, SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) as total
        FROM tb_CALIDAD
        WHERE DAT_PROD = '19/01/2026' AND EMP = 'STC'
        GROUP BY GRP_DEF
    """)
    result_data = cursor.fetchall()
    if not result_data:
        print("  ⚠️ NO HAY DATOS para esa fecha")
    else:
        for row in result_data:
            print(f"  {row[0]}: {row[1]} metros")
    
    # 7. Datos para la primer fecha disponible
    print("\n✅ Datos para la primera fecha disponible:")
    cursor.execute("SELECT DISTINCT DAT_PROD FROM tb_CALIDAD LIMIT 1")
    first_date_result = cursor.fetchone()
    if first_date_result:
        first_date = first_date_result[0]
        print(f"   Fecha: {first_date}")
        cursor.execute("""
            SELECT GRP_DEF, SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) as total
            FROM tb_CALIDAD
            WHERE DAT_PROD = ? AND EMP = 'STC'
            GROUP BY GRP_DEF
        """, (first_date,))
        first_date_data = cursor.fetchall()
        for row in first_date_data:
            print(f"   {row[0]}: {row[1]} metros")
    
    print("\n================================\n")
    
    conn.close()
