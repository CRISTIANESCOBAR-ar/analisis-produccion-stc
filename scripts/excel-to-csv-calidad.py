import sys
import warnings
warnings.filterwarnings('ignore')

import pandas as pd

xlsx_path = sys.argv[1]
sheet_name = sys.argv[2]
csv_path = sys.argv[3]
start_row = int(sys.argv[4]) if len(sys.argv) > 4 else 2

# Usar motor calamine (mucho más rápido que openpyxl)
try:
    df = pd.read_excel(xlsx_path, sheet_name=sheet_name, header=0, engine='calamine')
except Exception:
    # Fallback a openpyxl si calamine falla
    df = pd.read_excel(xlsx_path, sheet_name=sheet_name, header=0, engine='openpyxl')

# Filtrar filas donde la primera columna (GRP_DEF) no es nula ni 'GRP_DEF'
first_col = df.iloc[:, 0]
df = df[first_col.notna() & (first_col != 'GRP_DEF')]

# NO formatear aquí - dejar que SQLite lo haga durante UPDATE
# Esto es mucho más rápido que formatear 665k filas en Python

# Guardar a CSV sin encabezados (SQLite espera solo datos)
df.to_csv(csv_path, index=False, header=False)
