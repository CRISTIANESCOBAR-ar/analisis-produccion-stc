#!/usr/bin/env python3
import sqlite3
import os

db = os.path.join(os.getcwd(), 'database', 'produccion.db')
con = sqlite3.connect(db)
cur = con.cursor()

# Consultar datos de roturas para la rolada 5429
query = """
SELECT PARTIDA, RUPTURAS, [RUP FIACAO], [RUP URD], [RUP OPER]
FROM tb_PRODUCCION 
WHERE ROLADA='5429' AND SELETOR='URDIDEIRA' 
ORDER BY PARTIDA
"""

print("PARTIDA | RUPTURAS | RUP FIACAO | RUP URD | RUP OPER")
print("-" * 60)
cur.execute(query)
for row in cur.fetchall():
    print(f"{row[0]} | '{row[1]}' | '{row[2]}' | '{row[3]}' | '{row[4]}'")

con.close()
