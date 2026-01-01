#!/usr/bin/env python3
import sqlite3
import os

db = os.path.join(os.getcwd(), 'database', 'produccion.db')
con = sqlite3.connect(db)
cur = con.cursor()

# Simular la consulta del endpoint /api/consulta-rolada-urdimbre
query = """
SELECT 
  PARTIDA,
  DT_INICIO,
  HORA_INICIO,
  DT_FINAL,
  HORA_FINAL,
  ARTIGO,
  CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) AS METRAGEM,
  CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL) AS VELOC,
  CAST(NUM_FIOS AS INTEGER) AS NUM_FIOS,
  CAST(REPLACE(REPLACE([RUP FIACAO], '.', ''), ',', '.') AS REAL) AS RUP_FIACAO,
  CAST(REPLACE(REPLACE([RUP URD], '.', ''), ',', '.') AS REAL) AS RUP_URD,
  CAST(REPLACE(REPLACE([RUP OPER], '.', ''), ',', '.') AS REAL) AS RUP_OPER,
  CAST(REPLACE(REPLACE(RUPTURAS, '.', ''), ',', '.') AS REAL) AS RUPTURAS,
  [NM OPERADOR] AS NM_OPERADOR,
  [LOTE FIACAO] AS LOTE_FIACAO,
  [MAQ  FIACAO] AS MAQ_FIACAO,
  [BASE URDUME] AS BASE_URDUME
FROM tb_PRODUCCION
WHERE SELETOR = 'URDIDEIRA'
  AND ROLADA = ?
ORDER BY DT_INICIO, HORA_INICIO
"""

print("PARTIDA | RUPTURAS | RUP_FIACAO | RUP_URD | RUP_OPER")
print("-" * 60)
cur.execute(query, ['5429'])
for row in cur.fetchall():
    partida = row[0]
    rupturas = row[12]
    rup_fiacao = row[9]
    rup_urd = row[10]
    rup_oper = row[11]
    print(f"{partida} | {rupturas} | {rup_fiacao} | {rup_urd} | {rup_oper}")

con.close()
