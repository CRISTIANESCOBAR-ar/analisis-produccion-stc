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
except PermissionError:
    print(f"ERROR: No se puede leer el archivo '{xlsx_path}'. Asegúrate de que NO esté abierto en Excel.", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    try:
        # Fallback a openpyxl si calamine falla
        df = pd.read_excel(xlsx_path, sheet_name=sheet_name, header=0, engine='openpyxl')
    except PermissionError:
        print(f"ERROR: No se puede leer el archivo '{xlsx_path}'. Asegúrate de que NO esté abierto en Excel.", file=sys.stderr)
        sys.exit(1)
    except Exception as e2:
        print(f"ERROR: Falló la lectura del Excel. Calamine: {e}, Openpyxl: {e2}", file=sys.stderr)
        sys.exit(1)

# Filtrar filas vacías
df = df.dropna(how='all')

# Guardar a CSV sin encabezados (SQLite espera solo datos)
df.to_csv(csv_path, index=False, header=False)
