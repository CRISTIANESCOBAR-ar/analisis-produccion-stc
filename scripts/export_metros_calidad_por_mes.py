import sqlite3
import pandas as pd
from pathlib import Path

DB_PATH = Path("database/produccion.db")
OUTPUT_PATH = Path("exports_metros_calidad_por_mes.csv")

QUERY = """
SELECT
  strftime('%Y-%m', DAT_PROD) AS mes,
  SUM(CAST(METRAGEM AS REAL)) AS metros_total,
  COUNT(*) AS registros
FROM tb_CALIDAD
GROUP BY mes
ORDER BY mes;
"""

def main() -> None:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"No se encontró la base de datos en {DB_PATH}")

    with sqlite3.connect(DB_PATH) as conn:
        df = pd.read_sql_query(QUERY, conn)

    # Guardar CSV
    df.to_csv(OUTPUT_PATH, index=False)
    print("CSV generado:", OUTPUT_PATH)
    print(df)

if __name__ == "__main__":
    main()
