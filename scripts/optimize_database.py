#!/usr/bin/env python3
"""
Script de optimización de base de datos SQLite
Aplica índices estratégicos y configuraciones de rendimiento
"""
import sqlite3
import os
import time
from datetime import datetime

db_path = os.path.join(os.getcwd(), 'database', 'produccion.db')

def execute_with_timing(cursor, sql, description):
    """Ejecuta SQL y mide tiempo"""
    print(f"\n⏱️  {description}...")
    start = time.time()
    try:
        cursor.execute(sql)
        elapsed = time.time() - start
        print(f"   ✅ Completado en {elapsed:.2f}s")
        return True
    except sqlite3.Error as e:
        elapsed = time.time() - start
        print(f"   ⚠️  Error ({elapsed:.2f}s): {e}")
        return False

def main():
    print("=" * 70)
    print("OPTIMIZACIÓN DE BASE DE DATOS - analisis-produccion-stc")
    print("=" * 70)
    print(f"Database: {db_path}")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if not os.path.exists(db_path):
        print(f"\n❌ ERROR: No se encontró la base de datos en {db_path}")
        return 1
    
    # Tamaño inicial
    size_before = os.path.getsize(db_path) / (1024*1024)
    print(f"Tamaño inicial: {size_before:.2f} MB\n")
    
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    
    # 1. CONFIGURACIONES DE RENDIMIENTO
    print("\n" + "=" * 70)
    print("PASO 1: CONFIGURACIONES DE RENDIMIENTO")
    print("=" * 70)
    
    configs = [
        ("PRAGMA journal_mode=WAL", "Write-Ahead Logging (mejor concurrencia)"),
        ("PRAGMA synchronous=NORMAL", "Sincronización balanceada"),
        ("PRAGMA cache_size=-64000", "Cache de 64MB"),
        ("PRAGMA temp_store=MEMORY", "Tablas temporales en RAM"),
        ("PRAGMA mmap_size=268435456", "Memory-mapped I/O (256MB)"),
    ]
    
    for sql, desc in configs:
        cur.execute(sql)
        result = cur.fetchone()
        print(f"✅ {desc}")
        print(f"   {sql} → {result[0] if result else 'OK'}")
    
    # 2. ANÁLISIS PRE-ÍNDICES
    print("\n" + "=" * 70)
    print("PASO 2: ANÁLISIS PRE-ÍNDICES")
    print("=" * 70)
    
    # Test query sin índice
    print("\n📊 Test query (sin índices): SELECT * FROM tb_CALIDAD WHERE DAT_PROD = '2024-01-01'")
    start = time.time()
    cur.execute("SELECT COUNT(*) FROM tb_CALIDAD WHERE DAT_PROD = '2024-01-01'")
    count_before = cur.fetchone()[0]
    time_before = time.time() - start
    print(f"   Resultados: {count_before} filas en {time_before:.3f}s")
    
    # 3. CREACIÓN DE ÍNDICES
    print("\n" + "=" * 70)
    print("PASO 3: CREACIÓN DE ÍNDICES")
    print("=" * 70)
    
    indices = [
        # tb_CALIDAD (666k filas) - los más críticos primero
        {
            'name': 'idx_calidad_dat_prod',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_calidad_dat_prod ON tb_CALIDAD(DAT_PROD)',
            'reason': 'Queries por fecha (API: /api/calidad con dateRange)'
        },
        {
            'name': 'idx_calidad_rolada',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_calidad_rolada ON tb_CALIDAD(ROLADA)',
            'reason': 'Búsqueda por rolada (clave de negocio)'
        },
        {
            'name': 'idx_calidad_tear',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_calidad_tear ON tb_CALIDAD(TEAR)',
            'reason': 'Filtrado por máquina'
        },
        {
            'name': 'idx_calidad_qualidade',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_calidad_qualidade ON tb_CALIDAD(QUALIDADE)',
            'reason': 'Filtrado por calidad (ej: RETALHO)'
        },
        {
            'name': 'idx_calidad_artigo',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_calidad_artigo ON tb_CALIDAD(ARTIGO)',
            'reason': 'Filtrado por artículo'
        },
        
        # tb_PRODUCCION (668k filas)
        {
            'name': 'idx_produccion_dt_base',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_produccion_dt_base ON tb_PRODUCCION(DT_BASE_PRODUCAO)',
            'reason': 'Queries por fecha (API: /api/produccion)'
        },
        {
            'name': 'idx_produccion_artigo',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_produccion_artigo ON tb_PRODUCCION(ARTIGO)',
            'reason': 'Filtrado por artículo'
        },
        {
            'name': 'idx_produccion_partida',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_produccion_partida ON tb_PRODUCCION(PARTIDA)',
            'reason': 'Búsqueda por partida (usado en análisis)'
        },
        {
            'name': 'idx_produccion_seletor',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_produccion_seletor ON tb_PRODUCCION(SELETOR)',
            'reason': 'Filtrado por sector (TECELAGEM, etc)'
        },
        
        # tb_TESTES (18k filas)
        {
            'name': 'idx_testes_fecha',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_testes_fecha ON tb_TESTES(FECHA)',
            'reason': 'Queries temporales'
        },
        {
            'name': 'idx_testes_artigo',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_testes_artigo ON tb_TESTES(ARTIGO)',
            'reason': 'Búsqueda por artículo'
        },
        
        # tb_FICHAS (1.7k filas) - menos crítico pero útil
        {
            'name': 'idx_fichas_artigo',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_fichas_artigo ON tb_FICHAS(ARTIGO)',
            'reason': 'JOIN con producción/calidad'
        },
        
        # tb_PARADAS (79k filas)
        {
            'name': 'idx_paradas_data',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_paradas_data ON tb_PARADAS(DATA_BASE)',
            'reason': 'Queries por fecha'
        },
    ]
    
    print(f"\nCreando {len(indices)} índices...\n")
    success_count = 0
    
    for idx in indices:
        success = execute_with_timing(cur, idx['sql'], f"{idx['name']}: {idx['reason']}")
        if success:
            success_count += 1
    
    con.commit()
    
    print(f"\n📈 Índices creados: {success_count}/{len(indices)}")
    
    # 4. ANÁLISIS POST-ÍNDICES
    print("\n" + "=" * 70)
    print("PASO 4: ANÁLISIS POST-ÍNDICES")
    print("=" * 70)
    
    # Test query con índice
    print("\n📊 Test query (con índices): SELECT * FROM tb_CALIDAD WHERE DAT_PROD = '2024-01-01'")
    start = time.time()
    cur.execute("SELECT COUNT(*) FROM tb_CALIDAD WHERE DAT_PROD = '2024-01-01'")
    count_after = cur.fetchone()[0]
    time_after = time.time() - start
    print(f"   Resultados: {count_after} filas en {time_after:.3f}s")
    
    if time_before > 0:
        speedup = time_before / time_after if time_after > 0 else float('inf')
        print(f"   🚀 Mejora: {speedup:.1f}x más rápido")
    
    # Verificar índices creados
    print("\n📋 Índices activos:")
    cur.execute("""
        SELECT tbl_name, name 
        FROM sqlite_master 
        WHERE type='index' 
        AND tbl_name IN ('tb_CALIDAD', 'tb_PRODUCCION', 'tb_TESTES', 'tb_FICHAS', 'tb_PARADAS')
        ORDER BY tbl_name, name
    """)
    indices_created = cur.fetchall()
    for tbl, idx in indices_created:
        print(f"   • {tbl}.{idx}")
    
    # 5. ANÁLISIS DE QUERY PLAN
    print("\n" + "=" * 70)
    print("PASO 5: EXPLAIN QUERY PLAN")
    print("=" * 70)
    
    test_queries = [
        "SELECT * FROM tb_CALIDAD WHERE DAT_PROD = '2024-01-01' LIMIT 10",
        "SELECT * FROM tb_CALIDAD WHERE ROLADA = '12345' LIMIT 10",
        "SELECT * FROM tb_PRODUCCION WHERE DT_BASE_PRODUCAO BETWEEN '2024-01-01' AND '2024-01-31'",
    ]
    
    for query in test_queries:
        print(f"\nQuery: {query[:65]}...")
        cur.execute(f"EXPLAIN QUERY PLAN {query}")
        for row in cur.fetchall():
            # row = (id, parent, notused, detail)
            print(f"   {row[3]}")
    
    # 6. ESTADÍSTICAS FINALES
    print("\n" + "=" * 70)
    print("PASO 6: ESTADÍSTICAS FINALES")
    print("=" * 70)
    
    con.close()
    
    size_after = os.path.getsize(db_path) / (1024*1024)
    size_diff = size_after - size_before
    
    print(f"\n📊 Tamaño inicial: {size_before:.2f} MB")
    print(f"📊 Tamaño final:   {size_after:.2f} MB")
    print(f"📊 Diferencia:     +{size_diff:.2f} MB (costo de índices)")
    print(f"\n✅ Optimización completada exitosamente!")
    
    print("\n" + "=" * 70)
    print("RECOMENDACIONES ADICIONALES:")
    print("=" * 70)
    print("""
1. Ejecutar ANALYZE periódicamente para actualizar estadísticas:
   sqlite3 database/produccion.db "ANALYZE;"

2. Si la DB crece mucho, considerar VACUUM para compactar:
   sqlite3 database/produccion.db "VACUUM;"
   
3. Monitorear queries lentas con:
   PRAGMA query_only = ON;
   EXPLAIN QUERY PLAN <tu_query>;

4. Los índices se mantienen automáticamente en INSERT/UPDATE/DELETE

5. Backup recomendado antes de cambios importantes:
   copy database\\produccion.db database\\backups\\produccion_backup_YYYYMMDD.db
""")
    
    return 0

if __name__ == '__main__':
    exit(main())
