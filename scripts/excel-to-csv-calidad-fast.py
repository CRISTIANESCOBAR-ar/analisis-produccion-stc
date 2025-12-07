import sys
import warnings
warnings.filterwarnings('ignore')

try:
    import pandas as pd
    USE_PANDAS = True
except ImportError:
    import openpyxl
    import csv
    USE_PANDAS = False

xlsx_path = sys.argv[1]
sheet_name = sys.argv[2]
csv_path = sys.argv[3]
start_row = int(sys.argv[4]) if len(sys.argv) > 4 else 2

# Columnas que deben tener formato con coma (índices 0-based)
# METRAGEM=17, LARGURA=30, GR/M2=31, PONTUACAO=33
DECIMAL_COLUMNS = {17, 30, 31, 33}

if USE_PANDAS:
    # Pandas es 3-5x más rápido que openpyxl
    df = pd.read_excel(xlsx_path, sheet_name=sheet_name, skiprows=start_row-1, engine='openpyxl')
    
    # Filtrar filas donde la primera columna (GRP_DEF) no es nula ni 'GRP_DEF'
    if len(df.columns) > 0:
        df = df[df.iloc[:, 0].notna() & (df.iloc[:, 0] != 'GRP_DEF')]
    
    # Formatear columnas decimales específicas
    for col_idx in DECIMAL_COLUMNS:
        if col_idx < len(df.columns):
            # Convertir float a string con coma y 2 decimales
            df.iloc[:, col_idx] = df.iloc[:, col_idx].apply(
                lambda x: f"{x:.2f}".replace('.', ',') if pd.notna(x) and isinstance(x, (int, float)) else x
            )
    
    # Guardar a CSV
    df.to_csv(csv_path, index=False, header=False)
    
else:
    # Fallback a openpyxl si pandas no está disponible
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb[sheet_name]
    
    def format_cell_value(value, col_index):
        """Formatea valores de celda para mantener consistencia con formato CSV histórico"""
        if isinstance(value, float) and col_index in DECIMAL_COLUMNS:
            return f"{value:.2f}".replace('.', ',')
        return value
    
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        for i, row in enumerate(ws.iter_rows(min_row=start_row, values_only=True), start=start_row):
            if row and any(cell is not None for cell in row):
                grp_def = row[0]
                if grp_def and grp_def != 'GRP_DEF':
                    formatted_row = [format_cell_value(cell, idx) for idx, cell in enumerate(row)]
                    writer.writerow(formatted_row)
    
    wb.close()
