import sys
import warnings
warnings.filterwarnings('ignore')

import openpyxl
import csv

xlsx_path = sys.argv[1]
sheet_name = sys.argv[2]
csv_path = sys.argv[3]
start_row = int(sys.argv[4]) if len(sys.argv) > 4 else 2

wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
ws = wb[sheet_name]

with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    for i, row in enumerate(ws.iter_rows(min_row=start_row, values_only=True), start=start_row):
        if row and any(cell is not None for cell in row):
            # Filtrar filas donde la primera columna (GRP_DEF) es nula o 'GRP_DEF'
            grp_def = row[0]
            if grp_def and grp_def != 'GRP_DEF':
                writer.writerow(row)

wb.close()
