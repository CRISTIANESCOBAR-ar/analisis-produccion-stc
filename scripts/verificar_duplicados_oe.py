#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verifica duplicados en combinación Fecha-OE-Ne con diferentes Lotes
"""

import sqlite3
import re
from pathlib import Path
from collections import defaultdict

# Configuración
DB_PATH = Path(__file__).parent.parent / "database" / "produccion.db"

def extraer_oe(maquina, lado):
    """Extrae OE según especificación"""
    if not maquina or str(maquina).upper() == 'NA':
        return ""
    
    ultimos_dos = str(maquina)[-2:]
    try:
        numero = str(int(ultimos_dos))
    except ValueError:
        return ""
    
    if lado == 'A':
        return f"{numero} LP"
    elif lado == 'B':
        return f"{numero} LI"
    else:
        return numero

def extraer_ne(desc_item):
    """Extrae Ne según especificación"""
    if not desc_item or len(desc_item) < 6:
        return ""
    
    resto = desc_item[5:].strip()
    match = re.match(r'^([^\s/]+)', resto)
    if match:
        return match.group(1)
    
    return ""

def extraer_lote(lote_produc):
    """Extrae lote sin ceros a la izquierda"""
    if not lote_produc or str(lote_produc).upper() == 'NA':
        return ""
    
    try:
        return str(int(float(str(lote_produc))))
    except (ValueError, TypeError):
        return str(lote_produc).lstrip('0') or '0'

def verificar_duplicados():
    """Verifica si hay múltiples Lotes para misma Fecha-OE-Ne"""
    print("🔍 Verificando duplicados en Fecha-OE-Ne con diferentes Lotes...")
    print(f"📁 Base de datos: {DB_PATH}")
    
    # Conectar a la base de datos
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Consulta SQL
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
    conn.close()
    
    print(f"✅ Registros analizados: {len(registros)}\n")
    
    # Agrupar por Fecha-OE-Ne
    grupos = defaultdict(set)
    
    for fecha_str, maquina, lado, desc_item, lote_produc in registros:
        oe = extraer_oe(maquina, lado)
        ne = extraer_ne(desc_item)
        lote = extraer_lote(lote_produc)
        
        if oe and ne:
            clave = (fecha_str, oe, ne)
            if lote:  # Solo agregar si hay lote
                grupos[clave].add(lote)
    
    # Identificar duplicados
    duplicados = []
    for (fecha, oe, ne), lotes in grupos.items():
        if len(lotes) > 1:
            duplicados.append({
                'fecha': fecha,
                'oe': oe,
                'ne': ne,
                'lotes': sorted(lotes)
            })
    
    # Mostrar resultados
    if duplicados:
        print("⚠️  SE ENCONTRARON REGISTROS CON MÚLTIPLES LOTES:")
        print("=" * 70)
        print(f"{'Fecha':<15} {'OE':<10} {'Ne':<10} {'Lotes encontrados':<30}")
        print("-" * 70)
        
        for dup in sorted(duplicados, key=lambda x: (x['fecha'], x['oe'], x['ne'])):
            lotes_str = ', '.join(dup['lotes'])
            print(f"{dup['fecha']:<15} {dup['oe']:<10} {dup['ne']:<10} {lotes_str:<30}")
        
        print("-" * 70)
        print(f"Total de casos con múltiples lotes: {len(duplicados)}")
        print("\n⚠️  RECOMENDACIÓN: Estos casos deberían ser revisados en el sistema origen.")
        print("   Una combinación Fecha-OE-Ne debería tener un único Lote.")
    else:
        print("✅ NO SE ENCONTRARON DUPLICADOS")
        print("=" * 70)
        print("Todas las combinaciones Fecha-OE-Ne tienen un único Lote.")
        print(f"Total de combinaciones únicas verificadas: {len(grupos)}")
    
    print("\n📊 RESUMEN DE VALIDACIÓN:")
    print(f"   • Registros procesados: {len(registros)}")
    print(f"   • Combinaciones Fecha-OE-Ne únicas: {len(grupos)}")
    print(f"   • Casos con múltiples Lotes: {len(duplicados)}")
    print(f"   • Casos sin problemas: {len(grupos) - len(duplicados)}")

if __name__ == "__main__":
    try:
        verificar_duplicados()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
