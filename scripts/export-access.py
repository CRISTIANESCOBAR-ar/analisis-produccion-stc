import pyodbc
import csv
import json
import os
from pathlib import Path

# Configuración
accdb_path = r'C:\STC\rptProdTec.accdb'
out_dir = Path(__file__).parent.parent / 'exports'
out_dir.mkdir(exist_ok=True)

# Conexión con ODBC (funciona con Office 32-bit)
# Intentar diferentes nombres de driver
drivers_to_try = [
    r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};',
    r'DRIVER={Microsoft Access Driver (*.mdb)};',
    r'Driver={Microsoft Access Driver (*.mdb, *.accdb)};',
]

conn_str = None
for driver in drivers_to_try:
    try:
        test_str = f'{driver}DBQ={accdb_path};'
        conn = pyodbc.connect(test_str)
        conn_str = test_str
        print(f'✓ Driver encontrado: {driver}')
        break
    except pyodbc.Error as e:
        continue

if not conn_str:
    print('\n❌ No se encontró un driver ODBC compatible.')
    print('\nDrivers ODBC instalados:')
    for driver in pyodbc.drivers():
        print(f'  - {driver}')
    print('\n💡 Solución: Necesitas instalar Access Database Engine 2016 x64:')
    print('   https://www.microsoft.com/en-us/download/details.aspx?id=54920')
    print('\n   NOTA: Desinstala Office 32-bit primero o usa la opción /passive')
    exit(1)
    
conn_str_final = conn_str

print(f'Conectando a: {accdb_path}')
conn = pyodbc.connect(conn_str_final)
cursor = conn.cursor()

# Obtener lista de tablas
tables = []
for table_info in cursor.tables(tableType='TABLE'):
    table_name = table_info.table_name
    if not table_name.startswith('MSys'):
        tables.append(table_name)

print(f'\nTablas encontradas: {len(tables)}\n')

schema = {}

for table_name in tables:
    print(f'Exportando: {table_name}')
    
    try:
        # Obtener datos
        cursor.execute(f'SELECT * FROM [{table_name}]')
        rows = cursor.fetchall()
        
        if not rows:
            print(f'  ⚠️  Tabla vacía, omitiendo')
            continue
        
        # Obtener nombres de columnas
        columns = [column[0] for column in cursor.description]
        
        # Guardar esquema
        schema[table_name] = {
            'columns': columns,
            'rowCount': len(rows)
        }
        
        # Exportar a CSV
        csv_path = out_dir / f'{table_name}.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(columns)
            writer.writerows(rows)
        
        print(f'  ✓ {len(rows)} registros → {csv_path}')
        
    except Exception as e:
        print(f'  ❌ Error: {e}')

# Guardar esquema
schema_path = out_dir / 'schema.json'
with open(schema_path, 'w', encoding='utf-8') as f:
    json.dump(schema, f, indent=2)

print(f'\n✓ Esquema guardado: {schema_path}')
print(f'✅ Exportación completada!')
print(f'📁 Archivos en: {out_dir}')

conn.close()
