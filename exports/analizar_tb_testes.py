import csv
import re
from pathlib import Path
from collections import defaultdict

src = Path(r'C:\analisis-stock-stc\exports\tb_TESTES.csv')

# Analizar estructura
stats = defaultdict(int)
max_cols_found = 0
sample_rows = []

with src.open('r', encoding='utf-8', newline='') as f:
    reader = csv.reader(f)
    header = next(reader)
    print(f"Encabezado original: {len(header)} columnas")
    print(f"Columnas: {header}")
    
    for i, row in enumerate(reader, 1):
        if i <= 3:
            sample_rows.append((i, len(row), row))
        
        stats[len(row)] += 1
        max_cols_found = max(max_cols_found, len(row))
        
        if i >= 5000:
            break

print(f"\nDistribución de columnas (primeras 5000 filas):")
for ncols in sorted(stats.keys())[:20]:
    print(f"  {ncols} columnas: {stats[ncols]} filas")
if len(stats) > 20:
    print(f"  ... y {len(stats) - 20} combinaciones más")

print(f"\nMáximo de columnas encontradas: {max_cols_found}")
print(f"Total de filas analizadas: {sum(stats.values())}")
print(f"\nPrimera fila de datos (10 primeros campos):")
if sample_rows:
    for j, val in enumerate(sample_rows[0][2][:10]):
        print(f"  [{j}]: {val[:60]}")
