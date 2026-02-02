WITH BASE AS (
  SELECT *,
    CASE
      WHEN HR_ENTRADA_PROD IS NULL OR HR_ENTRADA_PROD = '' THEN DT_ENTRADA_PROD
      WHEN CAST(substr(HR_ENTRADA_PROD, 1, 2) AS INTEGER) >= 6 THEN DT_ENTRADA_PROD
      ELSE (
        substr(date(substr(DT_ENTRADA_PROD, 7, 4) || '-' || substr(DT_ENTRADA_PROD, 4, 2) || '-' || substr(DT_ENTRADA_PROD, 1, 2), '-1 day'), 9, 2) || '/' ||
        substr(date(substr(DT_ENTRADA_PROD, 7, 4) || '-' || substr(DT_ENTRADA_PROD, 4, 2) || '-' || substr(DT_ENTRADA_PROD, 1, 2), '-1 day'), 6, 2) || '/' ||
        substr(date(substr(DT_ENTRADA_PROD, 7, 4) || '-' || substr(DT_ENTRADA_PROD, 4, 2) || '-' || substr(DT_ENTRADA_PROD, 1, 2), '-1 day'), 1, 4)
      )
    END AS FECHA_PRODUCTIVA_DB
  FROM tb_CALIDAD_FIBRA
  WHERE TIPO_MOV = 'MIST'
    AND DT_ENTRADA_PROD BETWEEN '01/09/2025' AND '03/09/2025'
)
SELECT FECHA_PRODUCTIVA_DB, COUNT(*) as registros 
FROM BASE 
GROUP BY FECHA_PRODUCTIVA_DB
ORDER BY FECHA_PRODUCTIVA_DB;
