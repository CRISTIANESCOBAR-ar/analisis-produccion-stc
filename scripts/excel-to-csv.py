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

# Normalizar columna PARTIDA: quitar .0 de valores numéricos y agregar cero inicial si tiene 6 dígitos
if 'PARTIDA' in df.columns:
    def normalize_partida(x):
        if pd.isna(x):
            return ''
        # Convertir a entero si es float (quita .0)
        if isinstance(x, (int, float)) and x == int(x):
            s = str(int(x))
        else:
            s = str(x)
        # Agregar cero inicial si tiene 6 dígitos numéricos
        if len(s) == 6 and s.isdigit():
            s = '0' + s
        return s
    df['PARTIDA'] = df['PARTIDA'].apply(normalize_partida)

# Normalizar columna FILIAL: asegurar formato '05' en lugar de '5'
if 'FILIAL' in df.columns:
    def normalize_filial(x):
        if pd.isna(x):
            return ''
        s = str(int(x)) if isinstance(x, (int, float)) else str(x)
        # Agregar cero inicial si es un solo dígito
        if len(s) == 1 and s.isdigit():
            s = '0' + s
        return s
    df['FILIAL'] = df['FILIAL'].apply(normalize_filial)

# Normalizar columnas de fecha: convertir de YYYY-MM-DD a DD/MM/YYYY
date_columns = ['DT_BASE_PRODUCAO', 'DT_INICIO', 'DT_FIM']
for col in date_columns:
    if col in df.columns:
        def normalize_date(x):
            if pd.isna(x):
                return ''
            s = str(x)
            # Si ya está en formato DD/MM/YYYY, dejarlo
            if '/' in s and len(s) == 10:
                return s
            # Si está en formato YYYY-MM-DD, convertir
            if '-' in s and len(s) >= 10:
                parts = s[:10].split('-')
                if len(parts) == 3 and len(parts[0]) == 4:
                    return f"{parts[2]}/{parts[1]}/{parts[0]}"
            # Si es datetime de pandas
            if hasattr(x, 'strftime'):
                return x.strftime('%d/%m/%Y')
            return s
        df[col] = df[col].apply(normalize_date)

# Guardar a CSV sin encabezados (SQLite espera solo datos)
df.to_csv(csv_path, index=False, header=False)
