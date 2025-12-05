import sqlite3
import csv
import os
import glob

exports_dir = r'C:\analisis-stock-stc\exports'
db_path = r'c:\analisis-produccion-stc\database\produccion.db'

# Buscar todos los CSV de tb_CALIDAD
csv_files = sorted(glob.glob(os.path.join(exports_dir, 'tb_CALIDAD_*.csv')))
print(f'Encontrados {len(csv_files)} archivos CSV')

conn = sqlite3.connect(db_path)
c = conn.cursor()

# Eliminar tabla actual y crear nueva
c.execute('DROP TABLE IF EXISTS tb_CALIDAD')
headers = None
total_rows = 0

for i, csv_file in enumerate(csv_files):
    fname = os.path.basename(csv_file)
    with open(csv_file, 'r', encoding='utf-16') as f:
        reader = csv.reader(f)
        file_headers = next(reader)
        rows = list(reader)
    
    # Crear tabla con el primer archivo
    if headers is None:
        headers = file_headers
        cols_sql = ', '.join([f'[{h}] TEXT' for h in headers])
        c.execute(f'CREATE TABLE tb_CALIDAD ({cols_sql})')
    
    # Insertar datos
    placeholders = ','.join(['?' for _ in headers])
    c.executemany(f'INSERT INTO tb_CALIDAD VALUES ({placeholders})', rows)
    total_rows += len(rows)
    
    if (i+1) % 10 == 0:
        print(f'  [{i+1}/{len(csv_files)}] Procesados... ({total_rows:,} registros)')

conn.commit()

# Verificar
c.execute('SELECT COUNT(*) FROM tb_CALIDAD')
count = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM tb_CALIDAD WHERE DAT_PROD IS NOT NULL AND DAT_PROD != ''")
with_date = c.fetchone()[0]

print('')
print('RESULTADO:')
print(f'  Total registros: {count:,}')
print(f'  Con DAT_PROD: {with_date:,}')

c.execute('SELECT DAT_PROD, COUNT(*) as cnt FROM tb_CALIDAD GROUP BY DAT_PROD ORDER BY DAT_PROD DESC LIMIT 5')
print('  Ultimas fechas:')
for row in c.fetchall():
    print(f'    {row[0]}: {row[1]:,} registros')

conn.close()
print('OK!')
