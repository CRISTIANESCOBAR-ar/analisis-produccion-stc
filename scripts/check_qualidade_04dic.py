import pandas as pd

df = pd.read_excel('C:/STC/rptAcompDiario.xlsx', sheet_name='report5', engine='calamine')
df_04 = df[df['DAT_PROD'] == pd.Timestamp('2025-12-04')]

print(f'Total 04/12: {len(df_04)} registros')

df_segunda = df_04[df_04['QUALIDADE'] == 'SEGUNDA']
print(f'\nSEGUNDA: {len(df_segunda)} registros')
print(f'\nRevisores con SEGUNDA:')
print(df_segunda['REVISOR FINAL'].value_counts())

df_primeira = df_04[df_04['QUALIDADE'] == 'PRIMEIRA']
print(f'\nPRIMEIRA: {len(df_primeira)} registros')
print(f'\nRevisores con PRIMEIRA:')
print(df_primeira['REVISOR FINAL'].value_counts())
