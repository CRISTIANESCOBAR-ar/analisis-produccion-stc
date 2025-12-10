#!/usr/bin/env python3
import sqlite3
import os

db = os.path.join(os.getcwd(), 'database', 'produccion.db')
con = sqlite3.connect(db)
cur = con.cursor()

print("=== ANÁLISIS DE ÍNDICES Y OPTIMIZACIÓN ===\n")

# 1. Listar índices actuales
print("1. ÍNDICES ACTUALES:")
cur.execute("""
    SELECT m.tbl_name, m.name, m.sql 
    FROM sqlite_master m
    WHERE m.type = 'index' 
    AND m.tbl_name NOT LIKE 'sqlite_%'
    ORDER BY m.tbl_name, m.name
""")
indices = cur.fetchall()
if indices:
    for tbl, idx, sql in indices:
        print(f"  {tbl}: {idx}")
        if sql:
            print(f"    {sql}")
else:
    print("  ⚠️  NO HAY ÍNDICES definidos en ninguna tabla")

print("\n2. ESTADÍSTICAS DE TABLAS:")
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
tables = [r[0] for r in cur.fetchall()]

for tbl in tables:
    cur.execute(f'SELECT COUNT(*) FROM "{tbl}"')
    cnt = cur.fetchone()[0]
    print(f"\n  {tbl}: {cnt:,} filas")
    
    # Obtener columnas
    cur.execute(f'PRAGMA table_info("{tbl}")')
    cols = cur.fetchall()
    
    # Analizar valores únicos en columnas clave comunes
    key_cols = []
    for col in cols:
        col_name = col[1]
        if any(x in col_name.upper() for x in ['DAT', 'FECHA', 'DATE', 'EMP', 'TEAR', 'ROLADA', 'ARTIGO', 'TURNO', 'REVISOR', 'CODIGO', 'COD']):
            key_cols.append(col_name)
    
    if key_cols[:5]:  # Limitar a 5 columnas
        print(f"    Columnas clave analizadas:")
        for col_name in key_cols[:5]:
            try:
                cur.execute(f'SELECT COUNT(DISTINCT "{col_name}") FROM "{tbl}" WHERE "{col_name}" IS NOT NULL AND "{col_name}" != ""')
                distinct = cur.fetchone()[0]
                selectivity = (distinct / cnt * 100) if cnt > 0 else 0
                print(f"      {col_name}: {distinct:,} valores únicos ({selectivity:.1f}% selectividad)")
            except:
                pass

print("\n3. ANÁLISIS DE QUERY PLAN (sin índices):")
# Simular consultas comunes
test_queries = [
    ("tb_CALIDAD", "SELECT * FROM tb_CALIDAD WHERE DAT_PROD = '2024-01-01' LIMIT 10"),
    ("tb_CALIDAD", "SELECT * FROM tb_CALIDAD WHERE ROLADA = '12345' LIMIT 10"),
    ("tb_PRODUCCION", "SELECT * FROM tb_PRODUCCION WHERE DATA = '2024-01-01' LIMIT 10"),
    ("tb_PRODUCCION", "SELECT * FROM tb_PRODUCCION WHERE ARTIGO = 'ART001' LIMIT 10"),
]

for tbl, query in test_queries:
    try:
        cur.execute(f"EXPLAIN QUERY PLAN {query}")
        plan = cur.fetchall()
        print(f"\n  Query: {query[:60]}...")
        for row in plan:
            print(f"    {row}")
    except Exception as e:
        print(f"  Error: {e}")

print("\n4. RECOMENDACIONES DE ÍNDICES:")
recommendations = []

# tb_CALIDAD - tabla más grande
if 'tb_CALIDAD' in tables:
    recommendations.append({
        'table': 'tb_CALIDAD',
        'index': 'idx_calidad_dat_prod',
        'sql': 'CREATE INDEX idx_calidad_dat_prod ON tb_CALIDAD(DAT_PROD);',
        'reason': 'Filtrado por fecha de producción (queries temporales)'
    })
    recommendations.append({
        'table': 'tb_CALIDAD',
        'index': 'idx_calidad_rolada',
        'sql': 'CREATE INDEX idx_calidad_rolada ON tb_CALIDAD(ROLADA);',
        'reason': 'Búsqueda por rolada (clave de negocio)'
    })
    recommendations.append({
        'table': 'tb_CALIDAD',
        'index': 'idx_calidad_tear',
        'sql': 'CREATE INDEX idx_calidad_tear ON tb_CALIDAD(TEAR);',
        'reason': 'Filtrado por máquina tear'
    })
    recommendations.append({
        'table': 'tb_CALIDAD',
        'index': 'idx_calidad_composite',
        'sql': 'CREATE INDEX idx_calidad_composite ON tb_CALIDAD(DAT_PROD, TEAR, ROLADA);',
        'reason': 'Índice compuesto para queries multi-columna (fecha + tear + rolada)'
    })

# tb_PRODUCCION - segunda tabla más grande
if 'tb_PRODUCCION' in tables:
    recommendations.append({
        'table': 'tb_PRODUCCION',
        'index': 'idx_produccion_data',
        'sql': 'CREATE INDEX idx_produccion_data ON tb_PRODUCCION(DATA);',
        'reason': 'Filtrado por fecha'
    })
    recommendations.append({
        'table': 'tb_PRODUCCION',
        'index': 'idx_produccion_artigo',
        'sql': 'CREATE INDEX idx_produccion_artigo ON tb_PRODUCCION(ARTIGO);',
        'reason': 'Búsqueda por artículo'
    })

# tb_TESTES
if 'tb_TESTES' in tables:
    recommendations.append({
        'table': 'tb_TESTES',
        'index': 'idx_testes_fecha',
        'sql': 'CREATE INDEX idx_testes_fecha ON tb_TESTES(FECHA);',
        'reason': 'Filtrado temporal en testes'
    })

print("\n  ÍNDICES RECOMENDADOS:")
for i, rec in enumerate(recommendations, 1):
    print(f"\n  {i}. {rec['table']}.{rec['index']}")
    print(f"     Razón: {rec['reason']}")
    print(f"     SQL: {rec['sql']}")

print("\n5. CONFIGURACIONES SQLITE RECOMENDADAS:")
configs = [
    ("PRAGMA journal_mode=WAL;", "Write-Ahead Logging para mejor concurrencia"),
    ("PRAGMA synchronous=NORMAL;", "Balance entre seguridad y velocidad"),
    ("PRAGMA cache_size=-64000;", "Cache de ~64MB para queries grandes"),
    ("PRAGMA temp_store=MEMORY;", "Temporales en RAM"),
    ("PRAGMA mmap_size=268435456;", "Memory-mapped I/O (256MB)"),
]
print()
for sql, desc in configs:
    print(f"  {sql:<40} # {desc}")

print("\n6. ESTIMACIÓN DE IMPACTO:")
print("  - Índices en tb_CALIDAD: pueden reducir queries de O(n) a O(log n)")
print("  - Con 666k filas, un índice B-tree reduce búsquedas de ~666k a ~19 comparaciones")
print("  - Costo: ~30-50MB adicionales de espacio en disco")
print("  - Beneficio: 10-100x más rápido en queries filtradas")

con.close()
