CREATE TABLE IF NOT EXISTS tb_METAS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Dia DATE NOT NULL UNIQUE,
    Indigo REAL,
    Meta_Eficiencia_INDIGO REAL,
    Meta_Rotura_INDIGO REAL,
    Meta_Estopa_Azul REAL,
    Tejeduria REAL,
    RU105 REAL,
    RT105 REAL,
    EFI_Percent REAL,
    Meta_Estopa_Azul_Tejeduria REAL,
    Integrada REAL,
    Meta_Velocidad_Integrada REAL,
    Meta_ENC_URD_Integrada REAL,
    Revision REAL,
    Dia_Invertido INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metas_dia ON tb_METAS(Dia);

CREATE TRIGGER IF NOT EXISTS update_metas_timestamp 
AFTER UPDATE ON tb_METAS
BEGIN
    UPDATE tb_METAS SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
