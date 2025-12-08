import pandas as pd
import sqlite3

# Leer XLSX
print("Leyendo XLSX...")
df_xlsx = pd.read_excel('C:/STC/rptAcompDiario.xlsx', sheet_name='report5', engine='calamine')
df_xlsx_carlos = df_xlsx[(df_xlsx['REVISOR FINAL'] == 'CarlosD') & (df_xlsx['DAT_PROD'] == pd.Timestamp('2025-12-04'))]

# Crear conjunto de piezas únicas en XLSX
xlsx_pieces = set()
for _, row in df_xlsx_carlos.iterrows():
    key = f"{row['PEÇA']}-{row['ETIQUETA']}"
    xlsx_pieces.add(key)

print(f"\nXLSX: {len(df_xlsx_carlos)} registros, {len(xlsx_pieces)} piezas únicas")

# Leer SQLite
print("\nLeyendo SQLite...")
conn = sqlite3.connect('C:/analisis-produccion-stc/database/produccion.db')
query = """
SELECT "PEÇA", ETIQUETA, METRAGEM, QUALIDADE
FROM tb_CALIDAD 
WHERE "REVISOR FINAL"='CarlosD' 
AND DAT_PROD='2025-12-04 00:00:00'
"""
df_sqlite = pd.read_sql_query(query, conn)
conn.close()

# Crear conjunto de piezas únicas en SQLite
sqlite_pieces = set()
for _, row in df_sqlite.iterrows():
    key = f"{row['PEÇA']}-{row['ETIQUETA']}"
    sqlite_pieces.add(key)

print(f"SQLite: {len(df_sqlite)} registros, {len(sqlite_pieces)} piezas únicas")

# Encontrar diferencias
missing_in_sqlite = xlsx_pieces - sqlite_pieces
extra_in_sqlite = sqlite_pieces - xlsx_pieces

print(f"\n❌ Piezas en XLSX pero NO en SQLite: {len(missing_in_sqlite)}")
if len(missing_in_sqlite) > 0:
    # Calcular metros faltantes por calidad
    missing_primeira = []
    missing_segunda = []
    
    for piece in missing_in_sqlite:
        peca, etiqueta = piece.split('-')
        rows = df_xlsx_carlos[(df_xlsx_carlos['PEÇA'].astype(str) == peca) & (df_xlsx_carlos['ETIQUETA'].astype(str) == etiqueta)]
        if len(rows) > 0:
            row = rows.iloc[0]
            metragem = float(str(row['METRAGEM']).replace(',', '.'))
            qualidade = row['QUALIDADE']
            
            if qualidade == 'PRIMEIRA':
                missing_primeira.append((piece, metragem))
            else:
                missing_segunda.append((piece, metragem))
    
    print(f"\n📊 PRIMEIRA faltantes: {len(missing_primeira)} piezas")
    metros_primeira = sum(m for _, m in missing_primeira)
    print(f"   Metros: {metros_primeira:.0f}")
    
    print(f"\n📊 SEGUNDA faltantes: {len(missing_segunda)} piezas")
    metros_segunda = sum(m for _, m in missing_segunda)
    print(f"   Metros: {metros_segunda:.0f}")
    
    print(f"\n📊 TOTAL metros faltantes: {metros_primeira + metros_segunda:.0f}")
    
    print(f"\nPrimeras 5 PRIMEIRA faltantes:")
    for piece, metros in missing_primeira[:5]:
        print(f"  {piece}: {metros}m")
    
    # Calcular metros faltantes
    missing_metros = 0
    for piece in missing_in_sqlite:
        peca, etiqueta = piece.split('-')
        rows = df_xlsx_carlos[(df_xlsx_carlos['PEÇA'] == int(peca)) & (df_xlsx_carlos['ETIQUETA'] == int(etiqueta))]
        if len(rows) > 0:
            metragem = float(str(rows.iloc[0]['METRAGEM']).replace(',', '.'))
            missing_metros += metragem
    
    print(f"\n📊 Metros faltantes: {missing_metros:.0f}")

print(f"\n✅ Piezas en SQLite pero NO en XLSX: {len(extra_in_sqlite)}")
if len(extra_in_sqlite) > 0:
    print("(Estas son raras, deberían estar en XLSX):")
    for piece in list(extra_in_sqlite)[:5]:
        print(f"  {piece}")
