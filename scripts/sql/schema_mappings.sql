-- Tabla de mapeos de columnas desde XLSX a tablas SQLite
CREATE TABLE IF NOT EXISTS column_mappings (
  tabla_destino TEXT NOT NULL,
  columna_destino TEXT NOT NULL,
  columna_excel TEXT NOT NULL,
  es_requerida INTEGER DEFAULT 0,
  valor_default TEXT,
  transformacion TEXT,
  PRIMARY KEY (tabla_destino, columna_destino)
);

-- Ejemplos de mapeo para tb_PRODUCCION (ajusta según tu Excel)
-- INSERT INTO column_mappings (tabla_destino, columna_destino, columna_excel, es_requerida, valor_default, transformacion)
-- VALUES
-- ('tb_PRODUCCION','DT_BASE_PRODUCAO','FechaBase',1,NULL,'date_iso'),
-- ('tb_PRODUCCION','ARTIGO','Articulo',1,NULL,'trim'),
-- ('tb_PRODUCCION','COR','Color',0,NULL,'uppercase');
