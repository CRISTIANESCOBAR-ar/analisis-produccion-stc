#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera resumen de producción OE con transformaciones específicas
"""

import sqlite3
import re
from datetime import datetime
from pathlib import Path

# Configuración
DB_PATH = Path(__file__).parent.parent / "database" / "produccion.db"
OUTPUT_PATH = Path(__file__).parent.parent / "resumen_produccion_oe.txt"

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

def convertir_fecha(fecha_str):
    """
    Convierte fecha DD/MM/YYYY a objeto datetime
    """
    try:
        return datetime.strptime(fecha_str, '%d/%m/%Y')
    except:
        return None

def generar_resumen():
    """
    Genera el resumen de producción OE
    """
    print("📊 Generando resumen de producción OE...")
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
        [DESC ITEM]
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
    resumen = []
    registros_procesados = set()  # Para evitar duplicados
    
    for fecha_str, maquina, lado, desc_item in registros:
        # Extraer valores según especificaciones
        oe = extraer_oe(maquina, lado)
        ne = extraer_ne(desc_item)
        
        # Crear clave única para evitar duplicados
        clave = (fecha_str, oe, ne)
        
        if clave not in registros_procesados and oe and ne:
            resumen.append({
                'fecha': fecha_str,
                'oe': oe,
                'ne': ne
            })
            registros_procesados.add(clave)
    
    conn.close()
    
    # Ordenar por fecha y OE
    resumen.sort(key=lambda x: (
        convertir_fecha(x['fecha']) or datetime.min,
        x['oe']
    ))
    
    print(f"📝 Registros únicos procesados: {len(resumen)}")
    
    # Generar archivo TXT
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        # Encabezado
        f.write("RESUMEN DE PRODUCCIÓN OE\n")
        f.write("=" * 50 + "\n")
        f.write(f"Fecha de generación: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
        f.write(f"Registros desde: 28/10/2025\n")
        f.write("=" * 50 + "\n\n")
        
        # Tabla de datos
        f.write(f"{'Fecha':<15} {'OE':<10} {'Ne':<10}\n")
        f.write("-" * 40 + "\n")
        
        for item in resumen:
            f.write(f"{item['fecha']:<15} {item['oe']:<10} {item['ne']:<10}\n")
        
        f.write("\n" + "=" * 50 + "\n")
        f.write(f"Total de registros: {len(resumen)}\n")
    
    print(f"✅ Archivo generado: {OUTPUT_PATH}")
    print(f"\n📋 Primeros 10 registros:")
    print(f"{'Fecha':<15} {'OE':<10} {'Ne':<10}")
    print("-" * 40)
    for item in resumen[:10]:
        print(f"{item['fecha']:<15} {item['oe']:<10} {item['ne']:<10}")
    
    if len(resumen) > 10:
        print(f"... y {len(resumen) - 10} registros más")

if __name__ == "__main__":
    try:
        generar_resumen()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
