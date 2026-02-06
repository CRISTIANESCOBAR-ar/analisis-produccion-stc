#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera resumen de producción OE en formato Excel
"""

import sqlite3
import re
from datetime import datetime
from pathlib import Path
import pandas as pd

# Configuración
DB_PATH = Path(__file__).parent.parent / "database" / "produccion.db"
OUTPUT_PATH = Path(__file__).parent.parent / "resumen_produccion_oe.xlsx"

def extraer_oe(maquina, lado):
    """
    Extrae los 2 últimos dígitos de MAQUINA, quita ceros a la izquierda
    y agrega LP (LADO=A) o LI (LADO=B)
    
    Ejemplo: MAQUINA=050402, LADO=A -> "2 LP"
    """
    if not maquina or str(maquina).upper() == 'NA':
        return ""
    
    # Extraer últimos 2 dígitos
    ultimos_dos = str(maquina)[-2:]
    
    # Validar que sean dígitos
    try:
        numero = str(int(ultimos_dos))
    except ValueError:
        return ""
    
    # Agregar sufijo según LADO
    if lado == 'A':
        return f"{numero} LP"
    elif lado == 'B':
        return f"{numero} LI"
    else:
        return numero

def extraer_ne(desc_item):
    """
    Extrae Ne desde posición 6 hasta encontrar un espacio o /
    
    Ejemplos:
    - "HILO 12,5 LISO OE CARDA TECEL" -> "12,5"
    - "HILO 9.5/1 FANTA SUAVE OE CARDA TECEL" -> "9.5"
    - "HILO 14/1 LISO OE CARDA TECEL" -> "14"
    """
    if not desc_item or len(desc_item) < 6:
        return ""
    
    # Extraer desde posición 6
    resto = desc_item[5:].strip()  # Posición 6 es índice 5
    
    # Buscar hasta espacio o /
    match = re.match(r'^([^\s/]+)', resto)
    if match:
        return match.group(1)
    
    return ""

def extraer_lote(lote_produc):
    """
    Extrae el lote quitando ceros a la izquierda
    
    Ejemplo: "000123" -> "123"
    """
    if not lote_produc or str(lote_produc).upper() == 'NA':
        return ""
    
    try:
        # Convertir a int para quitar ceros y luego a string
        return str(int(float(str(lote_produc))))
    except (ValueError, TypeError):
        # Si no se puede convertir, devolver el valor limpio
        return str(lote_produc).lstrip('0') or '0'

def convertir_fecha(fecha_str):
    """
    Convierte fecha DD/MM/YYYY a objeto datetime
    """
    try:
        return datetime.strptime(fecha_str, '%d/%m/%Y')
    except:
        return None

def generar_resumen_excel():
    """
    Genera el resumen de producción OE en formato Excel
    """
    print("📊 Generando resumen de producción OE en Excel...")
    print(f"📁 Base de datos: {DB_PATH}")
    
    # Conectar a la base de datos
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Consulta SQL - obtener datos desde 28/10/2025
    query = """
    SELECT 
        DATA_PRODUCAO,
        MAQUINA,
        LADO,
        [DESC ITEM],
        [LOTE PRODUC]
    FROM tb_PRODUCCION_OE
    WHERE DATA_PRODUCAO >= '28/10/2025'
    ORDER BY DATA_PRODUCAO, MAQUINA, LADO
    """
    
    cursor.execute(query)
    registros = cursor.fetchall()
    
    print(f"✅ Registros encontrados: {len(registros)}")
    
    if len(registros) == 0:
        print("⚠️  No se encontraron registros desde 28/10/2025")
        conn.close()
        return
    
    # Procesar y generar resumen
    datos_procesados = []
    registros_procesados = set()  # Para evitar duplicados
    
    for fecha_str, maquina, lado, desc_item, lote_produc in registros:
        # Extraer valores según especificaciones
        oe = extraer_oe(maquina, lado)
        ne = extraer_ne(desc_item)
        lote = extraer_lote(lote_produc)
        
        # Crear clave única para evitar duplicados
        clave = (fecha_str, oe, ne, lote)
        
        if clave not in registros_procesados and oe and ne:
            datos_procesados.append({
                'Fecha': fecha_str,
                'OE': oe,
                'Ne': ne,
                'Lote': lote
            })
            registros_procesados.add(clave)
    
    conn.close()
    
    print(f"📝 Registros únicos procesados: {len(datos_procesados)}")
    
    # Crear DataFrame de pandas
    df = pd.DataFrame(datos_procesados)
    
    # Ordenar por fecha y OE
    df['fecha_sort'] = df['Fecha'].apply(convertir_fecha)
    df = df.sort_values(['fecha_sort', 'OE']).drop('fecha_sort', axis=1)
    
    # Crear archivo Excel con formato
    with pd.ExcelWriter(OUTPUT_PATH, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Resumen OE', index=False)
        
        # Obtener el worksheet para aplicar formato
        worksheet = writer.sheets['Resumen OE']
        
        # Ajustar ancho de columnas
        worksheet.column_dimensions['A'].width = 15  # Fecha
        worksheet.column_dimensions['B'].width = 12  # OE
        worksheet.column_dimensions['C'].width = 12  # Ne
        worksheet.column_dimensions['D'].width = 15  # Lote
        
        # Aplicar formato a encabezados
        from openpyxl.styles import Font, PatternFill, Alignment
        
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        header_font = Font(bold=True, color='FFFFFF', size=12)
        
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
        
        # Aplicar alineación a datos
        for row in worksheet.iter_rows(min_row=2, max_row=len(df)+1, min_col=1, max_col=4):
            for cell in row:
                cell.alignment = Alignment(horizontal='left', vertical='center')
        
        # Agregar filtros
        worksheet.auto_filter.ref = f'A1:D{len(df)+1}'
        
        print("✅ Formato aplicado al Excel")
    
    print(f"✅ Archivo Excel generado: {OUTPUT_PATH}")
    print(f"\n📋 Primeros 10 registros:")
    print(df.head(10).to_string(index=False))
    
    if len(df) > 10:
        print(f"\n... y {len(df) - 10} registros más")
    
    print(f"\n📊 Total de registros en Excel: {len(df)}")

if __name__ == "__main__":
    try:
        generar_resumen_excel()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
