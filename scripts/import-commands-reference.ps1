# =====================================================================
# COMANDOS DE IMPORTACIÓN INDIVIDUALES - REFERENCIA RÁPIDA
# =====================================================================
# Usar solo cuando necesites importar UNA tabla específica manualmente
# Para actualización automática de todas, usa: update-all-tables.ps1
# =====================================================================

# Variables comunes
$SqlitePath = "C:\analisis-stock-stc\database\produccion.db"
$ScriptPath = "C:\analisis-stock-stc\scripts\import-xlsx-to-sqlite.ps1"

# =====================================================================
# tb_FICHAS (SIN fecha - Borrado completo)
# =====================================================================
pwsh -File $ScriptPath `
  -XlsxPath "C:\STC\fichaArtigo.xlsx" `
  -Sheet "lista de tecidos" `
  -SqlitePath $SqlitePath `
  -Table "tb_FICHAS" `
  -ClearTable `
  -MappingSource json `
  -MappingJson "C:\analisis-stock-stc\scripts\mappings\tb_FICHAS.json"

# =====================================================================
# tb_RESIDUOS_INDIGO (CON fecha DT_MOV)
# =====================================================================
pwsh -File $ScriptPath `
  -XlsxPath "C:\STC\RelResIndigo.xlsx" `
  -Sheet "Índigo" `
  -SqlitePath $SqlitePath `
  -Table "tb_RESIDUOS_INDIGO" `
  -DateColumn "DT_MOV" `
  -MappingSource json `
  -MappingJson "C:\analisis-stock-stc\scripts\mappings\tb_RESIDUOS_INDIGO.json"

# =====================================================================
# tb_RESIDUOS_POR_SECTOR (CON fecha DT_MOV)
# =====================================================================
pwsh -File $ScriptPath `
  -XlsxPath "C:\STC\rptResiduosPorSetor.xlsx" `
  -Sheet "Setor" `
  -SqlitePath $SqlitePath `
  -Table "tb_RESIDUOS_POR_SECTOR" `
  -DateColumn "DT_MOV" `
  -MappingSource json `
  -MappingJson "C:\analisis-stock-stc\scripts\mappings\tb_RESIDUOS_POR_SECTOR.json"

# =====================================================================
# tb_TESTES (CON fecha DT_PROD)
# =====================================================================
pwsh -File $ScriptPath `
  -XlsxPath "C:\STC\rptPrdTestesFisicos.xlsx" `
  -Sheet "report2" `
  -SqlitePath $SqlitePath `
  -Table "tb_TESTES" `
  -DateColumn "DT_PROD" `
  -MappingSource json `
  -MappingJson "C:\analisis-stock-stc\scripts\mappings\tb_TESTES.json"

# =====================================================================
# tb_PARADAS (CON fecha DATA_BASE)
# =====================================================================
pwsh -File $ScriptPath `
  -XlsxPath "C:\STC\rptParadaMaquinaPRD.xlsx" `
  -Sheet "report1" `
  -SqlitePath $SqlitePath `
  -Table "tb_PARADAS" `
  -DateColumn "DATA_BASE" `
  -MappingSource json `
  -MappingJson "C:\analisis-stock-stc\scripts\mappings\tb_PARADAS.json"

# =====================================================================
# tb_PRODUCCION (CON fecha DT_BASE_PRODUCAO)
# =====================================================================
pwsh -File $ScriptPath `
  -XlsxPath "C:\STC\rptProducaoMaquina.xlsx" `
  -Sheet "report1" `
  -SqlitePath $SqlitePath `
  -Table "tb_PRODUCCION" `
  -DateColumn "DT_BASE_PRODUCAO" `
  -MappingSource json `
  -MappingJson "C:\analisis-stock-stc\scripts\mappings\tb_PRODUCCION.json"

# =====================================================================
# tb_CALIDAD (CON fecha DAT_PROD)
# =====================================================================
pwsh -File $ScriptPath `
  -XlsxPath "C:\STC\rptAcompDiarioPBI.xlsx" `
  -Sheet "report1" `
  -SqlitePath $SqlitePath `
  -Table "tb_CALIDAD" `
  -DateColumn "DAT_PROD" `
  -MappingSource json `
  -MappingJson "C:\analisis-stock-stc\scripts\mappings\tb_CALIDAD.json"
