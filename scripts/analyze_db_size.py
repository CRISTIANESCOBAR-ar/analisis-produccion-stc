import sqlite3
import os

db_path = 'database/produccion.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Obtener todas las tablas
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'tb_%' ORDER BY name")
tables = cursor.fetchall()

print("=" * 80)
print(f"ANÁLISIS DE BASE DE DATOS: {db_path}")
print(f"Tamaño: {os.path.getsize(db_path) / (1024**2):.2f} MB")
print("=" * 80)
print()

total_rows = 0
table_stats = []

for table_name in tables:
    table = table_name[0]
    
    # Contar registros
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    total_rows += count
    
    # Obtener info de columnas
    cursor.execute(f"PRAGMA table_info({table})")
    columns = cursor.fetchall()
    col_count = len(columns)
    
    # Estimar tamaño aproximado
    cursor.execute(f"SELECT * FROM {table} LIMIT 1")
    sample = cursor.fetchone()
    
    table_stats.append({
        'name': table,
        'rows': count,
        'columns': col_count
    })

# Ordenar por cantidad de registros
table_stats.sort(key=lambda x: x['rows'], reverse=True)

print(f"{'Tabla':<30} {'Registros':>15} {'Columnas':>10}")
print("-" * 80)

for stat in table_stats:
    print(f"{stat['name']:<30} {stat['rows']:>15,} {stat['columns']:>10}")

print("-" * 80)
print(f"{'TOTAL':<30} {total_rows:>15,}")
print()

# Calcular estimación de tamaño promedio por registro
avg_size_per_row = (os.path.getsize(db_path) / total_rows) if total_rows > 0 else 0
print(f"Tamaño promedio por registro: {avg_size_per_row:.2f} bytes")
print(f"Total de tablas: {len(table_stats)}")
print()

# Analizar índices
cursor.execute("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
indexes = cursor.fetchall()
print(f"Índices creados: {len(indexes)}")
print()

# Tablas más grandes
print("TOP 5 TABLAS MÁS GRANDES:")
print("-" * 80)
for i, stat in enumerate(table_stats[:5], 1):
    pct = (stat['rows'] / total_rows * 100) if total_rows > 0 else 0
    print(f"{i}. {stat['name']}: {stat['rows']:,} registros ({pct:.1f}%)")

conn.close()
