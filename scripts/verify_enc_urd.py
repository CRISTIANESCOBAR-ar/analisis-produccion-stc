"""
Script para verificar los valores de ENC URD % para ACABAMENTO
Fecha: 28/01/2026
"""
import sqlite3
import sys

DB_PATH = 'C:/analisis-produccion-stc/database/produccion.db'

def format_date_access_to_iso(date_str):
    """Convierte formato Access (DD/MM/YYYY) a ISO (YYYY-MM-DD)"""
    if not date_str or len(date_str) < 10:
        return None
    try:
        day = date_str[0:2]
        month = date_str[3:5]
        year = date_str[6:10]
        return f"{year}-{month}-{day}"
    except:
        return None

def main():
    fecha_dia = '2026-01-28'
    fecha_inicio_mes = '2026-01-01'
    fecha_fin_mes = '2026-01-28'
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("=" * 80)
    print(f"VERIFICACIÓN ENC URD % - ACABAMENTO (MAQUINA 165001)")
    print(f"Fecha específica: {fecha_dia}")
    print(f"Rango del mes: {fecha_inicio_mes} a {fecha_fin_mes}")
    print("=" * 80)
    
    # =========================================================================
    # CONSULTA PARA EL DIA
    # =========================================================================
    print("\n📅 DATOS DEL DÍA 28/01/2026:")
    print("-" * 80)
    
    # Ver todos los registros del día
    sql_registros_dia = """
        SELECT 
            DT_PROD,
            MAQUINA,
            APROV,
            ARTIGO,
            METRAGEM,
            [%_ENC_URD],
            (CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
             CAST(REPLACE(REPLACE([%_ENC_URD], '.', ''), ',', '.') AS REAL)) AS PRODUCTO
        FROM tb_TESTES
        WHERE MAQUINA = '165001'
          AND APROV = 'A'
    """
    
    cursor.execute(sql_registros_dia)
    registros = cursor.fetchall()
    
    # Filtrar por fecha
    registros_dia = []
    for row in registros:
        fecha_iso = format_date_access_to_iso(row[0])
        if fecha_iso == fecha_dia:
            registros_dia.append(row)
    
    if registros_dia:
        print(f"\nEncontrados {len(registros_dia)} registros para el día:")
        print(f"{'DT_PROD':<12} {'MAQUINA':<8} {'APROV':<6} {'ARTIGO':<10} {'METRAGEM':<12} {'%_ENC_URD':<12} {'PRODUCTO':<15}")
        print("-" * 90)
        
        suma_metragem = 0
        suma_producto = 0
        
        for row in registros_dia:
            dt_prod, maquina, aprov, artigo, metragem, enc_urd, producto = row
            
            # Convertir valores
            metragem_num = float(str(metragem).replace('.', '').replace(',', '.')) if metragem else 0
            enc_urd_num = float(str(enc_urd).replace('.', '').replace(',', '.')) if enc_urd else 0
            producto_num = metragem_num * enc_urd_num
            
            suma_metragem += metragem_num
            suma_producto += producto_num
            
            print(f"{dt_prod:<12} {maquina:<8} {aprov:<6} {artigo:<10} {metragem_num:<12.2f} {enc_urd_num:<12.2f} {producto_num:<15.2f}")
        
        print("-" * 90)
        print(f"{'TOTALES:':<49} {suma_metragem:<12.2f} {'':<12} {suma_producto:<15.2f}")
        
        if suma_metragem > 0:
            resultado_dia = suma_producto / suma_metragem
            print(f"\n✅ RESULTADO DÍA: {resultado_dia:.2f}%")
            print(f"   Fórmula: {suma_producto:.2f} / {suma_metragem:.2f} = {resultado_dia:.2f}")
        else:
            print("\n⚠️ No hay metraje para calcular")
    else:
        print("⚠️ No se encontraron registros para esta fecha")
    
    # =========================================================================
    # CONSULTA PARA EL MES
    # =========================================================================
    print("\n\n📅 DATOS DEL MES (01/01/2026 a 28/01/2026):")
    print("-" * 80)
    
    # Filtrar registros del mes
    registros_mes = []
    for row in registros:
        fecha_iso = format_date_access_to_iso(row[0])
        if fecha_iso and fecha_inicio_mes <= fecha_iso <= fecha_fin_mes:
            registros_mes.append((fecha_iso, row))
    
    if registros_mes:
        print(f"\nEncontrados {len(registros_mes)} registros para el mes:")
        
        # Agrupar por fecha
        fechas_dict = {}
        for fecha_iso, row in registros_mes:
            if fecha_iso not in fechas_dict:
                fechas_dict[fecha_iso] = []
            fechas_dict[fecha_iso].append(row)
        
        print(f"\n{'FECHA':<12} {'REGISTROS':<10} {'METRAGEM':<15} {'ENC_URD_PCT':<15}")
        print("-" * 60)
        
        suma_metragem_mes = 0
        suma_producto_mes = 0
        
        for fecha in sorted(fechas_dict.keys()):
            registros_fecha = fechas_dict[fecha]
            suma_m = 0
            suma_p = 0
            
            for row in registros_fecha:
                metragem = row[4]
                enc_urd = row[5]
                
                metragem_num = float(str(metragem).replace('.', '').replace(',', '.')) if metragem else 0
                enc_urd_num = float(str(enc_urd).replace('.', '').replace(',', '.')) if enc_urd else 0
                
                suma_m += metragem_num
                suma_p += (metragem_num * enc_urd_num)
            
            enc_urd_pct = (suma_p / suma_m) if suma_m > 0 else 0
            
            suma_metragem_mes += suma_m
            suma_producto_mes += suma_p
            
            print(f"{fecha:<12} {len(registros_fecha):<10} {suma_m:<15.2f} {enc_urd_pct:<15.2f}")
        
        print("-" * 60)
        print(f"{'TOTALES:':<12} {len(registros_mes):<10} {suma_metragem_mes:<15.2f}")
        
        if suma_metragem_mes > 0:
            resultado_mes = suma_producto_mes / suma_metragem_mes
            print(f"\n✅ RESULTADO MES: {resultado_mes:.2f}%")
            print(f"   Fórmula: {suma_producto_mes:.2f} / {suma_metragem_mes:.2f} = {resultado_mes:.2f}")
        else:
            print("\n⚠️ No hay metraje para calcular")
    else:
        print("⚠️ No se encontraron registros para este rango de fechas")
    
    conn.close()
    print("\n" + "=" * 80)

if __name__ == '__main__':
    main()
