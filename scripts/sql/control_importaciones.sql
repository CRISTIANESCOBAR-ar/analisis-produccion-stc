-- Tabla de control para rastrear estado de importaciones XLSX
CREATE TABLE IF NOT EXISTS import_control (
  tabla_destino TEXT PRIMARY KEY,
  xlsx_path TEXT NOT NULL,
  xlsx_sheet TEXT NOT NULL,
  last_import_date TEXT NOT NULL,  -- ISO 8601: yyyy-MM-dd HH:mm:ss
  xlsx_last_modified TEXT NOT NULL, -- Fecha de modificación del archivo XLSX
  xlsx_hash TEXT NOT NULL,          -- MD5 hash del archivo para detectar cambios
  rows_imported INTEGER NOT NULL,
  mapping_json_path TEXT,
  date_column TEXT,                 -- NULL si usa -ClearTable
  import_strategy TEXT NOT NULL,    -- 'date_delete' o 'clear_table'
  notes TEXT
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_import_control_last_import 
ON import_control(last_import_date);
