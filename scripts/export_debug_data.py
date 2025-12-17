import sqlite3
import csv
import os

# Configuration
DB_PATH = 'database/produccion.db'
OUTPUT_FILE = 'debug_data_AF311006E5561.csv'
ARTICULO = 'AF311006E5561'
FECHA_INICIAL = '2025-01-01'
FECHA_FINAL = '2025-12-14'

# SQL Query (from sqlite-api-server.cjs /api/analisis-mesa-test)
SQL = """
      -- Subconsulta TESTES
      -- IMPORTANTE: Convertir formato europeo (1.980,00) a numérico (1980.00)
      WITH TESTES AS (
        SELECT 
          MAQUINA,
          ARTIGO AS ART_TEST,
          CAST(PARTIDA AS INTEGER) AS PARTIDA,
          ARTIGO AS TESTES,
          DT_PROD,
          APROV,
          OBS,
          REPROCESSO,
          CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) AS METRAGEM,
          LARG_AL,
          GRAMAT,
          POTEN,
          "%_ENC_URD",
          "%_ENC_TRAMA",
          "%_SK1",
          "%_SK2",
          "%_SK3",
          "%_SK4",
          "%_SKE",
          "%_STT",
          "%_SKM"
        FROM tb_TESTES
        WHERE ARTIGO = ?
          AND DATE(DT_PROD) >= DATE(?)
          AND DATE(DT_PROD) <= DATE(?)
      ),
      
      -- Subconsulta CALIDAD (agregada por PARTIDA)
      -- IMPORTANTE: Convertir formato europeo (1.980,00) a numérico (1980.00)
      CALIDAD AS (
        SELECT 
          MIN(DATE(DAT_PROD)) AS DAT_PROD,
          ARTIGO AS ART_CAL,
          CAST(PARTIDA AS INTEGER) AS PARTIDA,
          ROUND(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) AS METRAGEM,
          ROUND(AVG(LARGURA), 1) AS LARGURA,
          ROUND(AVG("GR/M2"), 1) AS "GR/M2"
        FROM tb_CALIDAD
        WHERE ARTIGO = ?
          AND DATE(DAT_PROD) >= DATE(?)
          AND DATE(DAT_PROD) <= DATE(?)
        GROUP BY ARTIGO, PARTIDA
      ),
      
      -- LEFT JOIN TESTES + CALIDAD
      TESTES_CALIDAD AS (
        SELECT 
          T.*,
          C.DAT_PROD,
          C.METRAGEM AS CALIDAD_METRAGEM,
          C.LARGURA AS CALIDAD_LARGURA,
          C."GR/M2" AS CALIDAD_GRM2
        FROM TESTES T
        LEFT JOIN CALIDAD C ON T.PARTIDA = C.PARTIDA
      ),
      
      -- Subconsulta ESPECIFICACION (tb_FICHAS)
      ESPECIFICACION AS (
        SELECT 
          "ARTIGO CODIGO",
          URDUME,
          "TRAMA REDUZIDO",
          BATIDA,
          "Oz/jd2",
          "Peso/m2",
          "LARGURA MIN",
          LARGURA AS ANCHO,
          "LARGURA MAX",
          "SKEW MIN",
          ("SKEW MIN" + "SKEW MAX") / 2.0 AS "SKEW STD",
          "SKEW MAX",
          "URD#MIN",
          ("URD#MIN" + "URD#MAX") / 2.0 AS "URD#STD",
          "URD#MAX",
          "TRAMA MIN",
          ("TRAMA MIN" + "TRAMA MAX") / 2.0 AS "TRAMA STD",
          "TRAMA MAX",
          "VAR STR#MIN TRAMA",
          ("VAR STR#MIN TRAMA" + "VAR STR#MAX TRAMA") / 2.0 AS "VAR STR#STD TRAMA",
          "VAR STR#MAX TRAMA",
          "VAR STR#MIN URD",
          ("VAR STR#MIN URD" + "VAR STR#MAX URD") / 2.0 AS "VAR STR#STD URD",
          "VAR STR#MAX URD",
          "ENC#ACAB URD"
        FROM tb_FICHAS
        WHERE "ARTIGO CODIGO" = ?
      )
      
      -- SELECT FINAL con LEFT JOIN a ESPECIFICACION
      SELECT 
        CAST(TC.MAQUINA AS INTEGER) AS Maquina,
        TC.ART_TEST AS Articulo,
        E."TRAMA REDUZIDO" AS Trama,
        TC.PARTIDA AS Partida,
        TC.TESTES AS C,
        DATE(TC.DT_PROD) AS Fecha,
        TC.APROV AS Ap,
        TC.OBS AS Obs,
        TC.REPROCESSO AS R,
        ROUND(TC.METRAGEM, 0) AS Metros_TEST,
        ROUND(TC.CALIDAD_METRAGEM, 0) AS Metros_MESA,
        
        ROUND(TC.CALIDAD_LARGURA, 1) AS Ancho_MESA,
        ROUND(E."LARGURA MIN", 1) AS Ancho_MIN,
        ROUND(E.ANCHO, 1) AS Ancho_STD,
        ROUND(E."LARGURA MAX", 1) AS Ancho_MAX,
        ROUND(TC.LARG_AL, 1) AS Ancho_TEST,
        
        ROUND(TC.CALIDAD_GRM2, 1) AS Peso_MESA,
        E."Peso/m2" * 0.95 AS Peso_MIN,
        ROUND(E."Peso/m2", 1) AS Peso_STD,
        E."Peso/m2" * 1.05 AS Peso_MAX,
        ROUND(TC.GRAMAT, 1) AS Peso_TEST,
        
        TC.POTEN AS Potencial,
        E."ENC#ACAB URD" AS Potencial_STD,
        
        TC."%_ENC_URD" AS "ENC_URD_%",
        E."URD#MIN" AS "ENC_URD_MIN_%",
        E."URD#STD" AS "ENC_URD_STD_%",
        E."URD#MAX" AS "ENC_URD_MAX_%",
        -1.5 AS "%_ENC_URD_MIN_Meta",
        -1.0 AS "%_ENC_URD_MAX_Meta",
        
        TC."%_ENC_TRAMA" AS "ENC_TRA_%",
        E."TRAMA MIN" AS "ENC_TRA_MIN_%",
        E."TRAMA STD" AS "ENC_TRA_STD_%",
        E."TRAMA MAX" AS "ENC_TRA_MAX_%",
        
        TC."%_SK1" AS "%_SK1",
        TC."%_SK2" AS "%_SK2",
        TC."%_SK3" AS "%_SK3",
        TC."%_SK4" AS "%_SK4",
        TC."%_SKE" AS "%_SKE",
        
        E."SKEW MIN" AS Skew_MIN,
        E."SKEW STD" AS Skew_STD,
        E."SKEW MAX" AS Skew_MAX,
        
        CAST(TC."%_STT" AS REAL) AS "%_STT",
        E."VAR STR#MIN TRAMA" AS "%_STT_MIN",
        E."VAR STR#STD TRAMA" AS "%_STT_STD",
        E."VAR STR#MAX TRAMA" AS "%_STT_MAX",
        
        TC."%_SKM" AS Pasadas_Terminadas,
        E."VAR STR#MIN URD" AS Pasadas_MIN,
        E."VAR STR#STD URD" AS Pasadas_STD,
        E."VAR STR#MAX URD" AS Pasadas_MAX,
        
        ROUND(TC.CALIDAD_GRM2 * 0.0295, 1) AS "Peso_MESA_OzYd²",
        ROUND(E."Peso/m2" * 0.95 * 0.0295, 1) AS "Peso_MIN_OzYd²",
        ROUND(E."Peso/m2" * 0.0295, 1) AS "Peso_STD_OzYd²",
        ROUND(E."Peso/m2" * 1.05 * 0.0295, 1) AS "Peso_MAX_OzYd²"
        
      FROM TESTES_CALIDAD TC
      LEFT JOIN ESPECIFICACION E ON TC.ART_TEST = E."ARTIGO CODIGO"
      ORDER BY DATE(TC.DT_PROD);
"""

def export_data():
    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Prepare parameters
    # The query expects: [articulo, fechaInicio, fechaFin, articulo, fechaInicio, fechaFin, articulo]
    # Note: The server code appends times to dates, but here we use DATE() function in SQL so YYYY-MM-DD is fine.
    # However, the server code does:
    # const fechaInicio = `${fecha_inicial} 00:00:00`;
    # const fechaFin = fecha_final ? `${fecha_final} 23:59:59` : ...
    # And the SQL uses DATE(?). DATE('2025-01-01 00:00:00') works same as DATE('2025-01-01').
    
    fecha_inicio_param = f"{FECHA_INICIAL} 00:00:00"
    fecha_fin_param = f"{FECHA_FINAL} 23:59:59"
    
    params = [
        ARTICULO, fecha_inicio_param, fecha_fin_param,  # TESTES
        ARTICULO, fecha_inicio_param, fecha_fin_param,  # CALIDAD
        ARTICULO                                        # ESPECIFICACION
    ]
    
    print(f"Executing query for {ARTICULO} from {FECHA_INICIAL} to {FECHA_FINAL}...")
    cursor.execute(SQL, params)
    
    rows = cursor.fetchall()
    
    if not rows:
        print("No data found.")
        return

    # Get column names
    column_names = [description[0] for description in cursor.description]
    
    print(f"Writing {len(rows)} rows to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(column_names)
        writer.writerows(rows)
        
    print("Done.")
    conn.close()

if __name__ == "__main__":
    export_data()
