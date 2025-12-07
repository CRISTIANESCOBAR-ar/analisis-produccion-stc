-- DIAGNÓSTICO: Comparar agrupaciones con y sin PEÇA/ETIQUETA

-- 1. Total de registros sin agrupar
SELECT 
  'Total registros sin filtro' as tipo,
  COUNT(*) as registros,
  SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) as metros_totales
FROM tb_CALIDAD
WHERE
  EMP = 'STC'
  AND DAT_PROD BETWEEN '2025-12-06' AND '2025-12-06'  -- AJUSTAR FECHAS
  AND QUALIDADE NOT LIKE '%RETALHO%';

-- 2. Agrupado por REVISOR, ARTIGO, DAT_PROD (sin PEÇA/ETIQUETA)
SELECT 
  'Agrupado sin PEÇA/ETIQUETA' as tipo,
  COUNT(*) as registros,
  SUM(METRAGEM) as metros_totales
FROM (
  SELECT
    DAT_PROD,
    ARTIGO,
    "REVISOR FINAL",
    SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) AS METRAGEM
  FROM tb_CALIDAD
  WHERE
    EMP = 'STC'
    AND DAT_PROD BETWEEN '2025-12-06' AND '2025-12-06'  -- AJUSTAR FECHAS
    AND QUALIDADE NOT LIKE '%RETALHO%'
  GROUP BY
    DAT_PROD,
    ARTIGO,
    "REVISOR FINAL"
);

-- 3. Agrupado CON PEÇA/ETIQUETA (como en la query actual)
SELECT 
  'Agrupado con PEÇA/ETIQUETA' as tipo,
  COUNT(*) as registros,
  SUM(METRAGEM) as metros_totales
FROM (
  SELECT
    DAT_PROD,
    ARTIGO,
    "REVISOR FINAL",
    SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) AS METRAGEM
  FROM tb_CALIDAD
  WHERE
    EMP = 'STC'
    AND DAT_PROD BETWEEN '2025-12-06' AND '2025-12-06'  -- AJUSTAR FECHAS
    AND QUALIDADE NOT LIKE '%RETALHO%'
  GROUP BY
    DAT_PROD,
    ARTIGO,
    "REVISOR FINAL",
    PEÇA,
    QUALIDADE,
    ETIQUETA
);

-- 4. Ver si hay registros con PEÇA o ETIQUETA NULL/duplicados
SELECT 
  "REVISOR FINAL",
  COUNT(*) as total_registros,
  COUNT(DISTINCT PEÇA) as pecas_distintas,
  COUNT(DISTINCT ETIQUETA) as etiquetas_distintas,
  SUM(CASE WHEN PEÇA IS NULL OR PEÇA = '' THEN 1 ELSE 0 END) as pecas_nulas,
  SUM(CASE WHEN ETIQUETA IS NULL OR ETIQUETA = '' THEN 1 ELSE 0 END) as etiquetas_nulas
FROM tb_CALIDAD
WHERE
  EMP = 'STC'
  AND DAT_PROD BETWEEN '2025-12-06' AND '2025-12-06'  -- AJUSTAR FECHAS
  AND QUALIDADE NOT LIKE '%RETALHO%'
GROUP BY "REVISOR FINAL"
ORDER BY "REVISOR FINAL";

-- 5. Desglose por Alejandro G (quien tiene la mayor diferencia)
SELECT 
  'Alejandro G - Por PEÇA/ETIQUETA' as tipo,
  QUALIDADE,
  COUNT(*) as rollos,
  SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) as metros,
  AVG(CAST(REPLACE(PONTUACAO, ',', '.') AS REAL)) as pts_promedio
FROM tb_CALIDAD
WHERE
  EMP = 'STC'
  AND DAT_PROD BETWEEN '2025-12-06' AND '2025-12-06'  -- AJUSTAR FECHAS
  AND QUALIDADE NOT LIKE '%RETALHO%'
  AND "REVISOR FINAL" = 'Alejandro G'
GROUP BY QUALIDADE;
