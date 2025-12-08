import pandas as pd

# Leer XLSX
df = pd.read_excel('C:/STC/rptAcompDiario.xlsx', sheet_name='report5', engine='calamine')

# Filtrar CarlosD el 04/12/2025 (usando Timestamp)
filtered = df[(df['REVISOR FINAL'] == 'CarlosD') & (df['DAT_PROD'] == pd.Timestamp('2025-12-04'))]

print(f'Registros en XLSX: {len(filtered)}')

if len(filtered) > 0:
    # Convertir METRAGEM a float
    metragem_total = filtered['METRAGEM'].astype(str).str.replace(',', '.').astype(float).sum()
    print(f'Metros totales XLSX: {metragem_total:.0f}')
    print(f'\nPrimeros 10 registros:')
    print(filtered[['DAT_PROD', 'REVISOR FINAL', 'PEÇA', 'ETIQUETA', 'METRAGEM', 'QUALIDADE']].head(10))

    # Contar duplicados PEÇA-ETIQUETA
    print(f'\nRegistros únicos por PEÇA-ETIQUETA: {filtered.groupby(["PEÇA", "ETIQUETA"]).ngroups}')

    # Metros después de deduplicación
    deduped = filtered.groupby(['PEÇA', 'ETIQUETA', 'QUALIDADE']).agg({'METRAGEM': 'first'}).reset_index()
    deduped_metros = deduped['METRAGEM'].astype(str).str.replace(',', '.').astype(float).sum()
    print(f'Metros después de agrupar por PEÇA-ETIQUETA-QUALIDADE: {deduped_metros:.0f}')

