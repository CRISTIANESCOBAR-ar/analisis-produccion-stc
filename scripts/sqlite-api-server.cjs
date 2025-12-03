// =====================================================================
// API Backend Node.js para acceder a SQLite desde Vue.js
// =====================================================================
// Servidor Express que expone endpoints REST para consultar SQLite
// Usar con: node scripts/sqlite-api-server.js
// =====================================================================

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = 3002;
const DB_PATH = path.join(__dirname, '../database/produccion.db');

// Configuración de tablas y archivos (Sincronizado con update-all-tables.ps1)
const TABLE_CONFIGS = [
  { table: 'tb_FICHAS', xlsxPath: 'C:\\STC\\fichaArtigo.xlsx', sheet: 'lista de tecidos' },
  { table: 'tb_RESIDUOS_INDIGO', xlsxPath: 'C:\\STC\\RelResIndigo.xlsx', sheet: 'rptResiduosIndigo' },
  { table: 'tb_RESIDUOS_POR_SECTOR', xlsxPath: 'C:\\STC\\rptResiduosPorSetor.xlsx', sheet: 'rptResiduosPorSetor' },
  { table: 'tb_TESTES', xlsxPath: 'C:\\STC\\rptPrdTestesFisicos.xlsx', sheet: 'report2' },
  { table: 'tb_PARADAS', xlsxPath: 'C:\\STC\\rptParadaMaquinaPRD.xlsx', sheet: 'rptpm' },
  { table: 'tb_PRODUCCION', xlsxPath: 'C:\\STC\\rptProducaoMaquina.xlsx', sheet: 'rptProdMaq' },
  { table: 'tb_CALIDAD', xlsxPath: 'C:\\STC\\rptAcompDiarioPBI.xlsx', sheet: 'report5' }
];

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error conectando a SQLite:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado a SQLite:', DB_PATH);
});

// Helper para ejecutar queries con promesas
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper para rangos de fecha (agrega horas para cubrir todo el día)
const getDateRangeParams = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  // Asumimos formato YYYY-MM-DD
  return {
    start: `${startDate} 00:00:00`,
    end: `${endDate} 23:59:59`
  };
};

// =====================================================================
// ENDPOINTS - Estado del Sistema e Importaciones
// =====================================================================

// GET /api/import-status - Estado detallado de importaciones
app.get('/api/import-status', async (req, res) => {
  try {
    const statusList = [];

    for (const config of TABLE_CONFIGS) {
      let fileStatus = 'UNKNOWN';
      let fileModified = null;
      let lastImport = null;

      // 1. Verificar archivo en disco
      try {
        if (fs.existsSync(config.xlsxPath)) {
          const stats = fs.statSync(config.xlsxPath);
          fileModified = stats.mtime.toISOString(); // Fecha modificación archivo
        } else {
          fileStatus = 'MISSING_FILE';
        }
      } catch (e) {
        fileStatus = 'ERROR_READING_FILE';
      }

      // 2. Consultar base de datos
      try {
        const dbRecord = await dbGet(
          `SELECT * FROM import_control WHERE tabla_destino = ?`,
          [config.table]
        );

        if (dbRecord) {
          lastImport = dbRecord;
          
          if (fileStatus !== 'MISSING_FILE' && fileStatus !== 'ERROR_READING_FILE') {
            // Comparar fechas (usando timestamps para precisión)
            // Nota: import_control.xlsx_last_modified se guarda como string ISO en el script PS
            const dbFileDate = new Date(dbRecord.xlsx_last_modified).getTime();
            const diskFileDate = new Date(fileModified).getTime();

            // Permitimos una pequeña diferencia de segundos por conversiones
            if (diskFileDate > dbFileDate + 1000) {
              fileStatus = 'OUTDATED'; // Archivo es más nuevo que la importación
            } else {
              fileStatus = 'UP_TO_DATE';
            }
          }
        } else {
          if (fileStatus !== 'MISSING_FILE') {
            fileStatus = 'NOT_IMPORTED'; // Archivo existe pero nunca se importó
          }
        }
      } catch (e) {
        console.error(`Error consultando DB para ${config.table}:`, e);
        fileStatus = 'DB_ERROR';
      }

      statusList.push({
        table: config.table,
        file: config.xlsxPath,
        sheet: config.sheet,
        status: fileStatus,
        fileModified: fileModified,
        lastImportDate: lastImport ? lastImport.last_import_date : null,
        lastImportedRows: lastImport ? lastImport.rows_imported : null,
        lastImportFileDate: lastImport ? lastImport.xlsx_last_modified : null
      });
    }

    res.json(statusList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/import/trigger - Ejecutar script de actualización
app.post('/api/import/trigger', (req, res) => {
  // Ejecuta el script de PowerShell que ya existe
  const scriptPath = path.join(__dirname, 'update-all-tables.ps1');
  const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;

  console.log('🚀 Ejecutando actualización manual...');
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error ejecutando script: ${error.message}`);
      return res.status(500).json({ error: error.message, details: stderr });
    }
    if (stderr) {
      console.warn(`⚠️ Stderr del script: ${stderr}`);
    }
    console.log(`✅ Script finalizado:\n${stdout}`);
    res.json({ success: true, output: stdout });
  });
});

// GET /api/status - Estado general de la base de datos
app.get('/api/status', async (req, res) => {
  try {
    const tables = [
      'tb_PRODUCCION',
      'tb_CALIDAD',
      'tb_PARADAS',
      'tb_TESTES',
      'tb_RESIDUOS_POR_SECTOR',
      'tb_RESIDUOS_INDIGO',
      'tb_FICHAS'
    ];
    
    const counts = {};
    for (const table of tables) {
      const result = await dbGet(`SELECT COUNT(*) as count FROM [${table}]`);
      counts[table] = result.count;
    }
    
    // Estado de última importación
    const lastImports = await dbAll(
      `SELECT tabla_destino, last_import_date, rows_imported 
       FROM import_control 
       ORDER BY last_import_date DESC`
    );

    // Obtener tamaño del archivo de base de datos
    let dbSize = 0;
    try {
      const stats = fs.statSync(DB_PATH);
      dbSize = stats.size;
    } catch (e) {
      console.error('Error obteniendo tamaño de DB:', e);
    }
    
    res.json({
      status: 'ok',
      database: DB_PATH,
      sizeBytes: dbSize,
      sizeMB: (dbSize / (1024 * 1024)).toFixed(2),
      timestamp: new Date().toISOString(),
      tables: counts,
      lastImports: lastImports
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINTS - Producción
// =====================================================================

// GET /api/produccion - Listar producción con paginación
app.get('/api/produccion', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const dateRange = getDateRangeParams(req.query.startDate, req.query.endDate);
    
    let whereClause = '';
    let params = [];
    
    if (dateRange) {
      whereClause = 'WHERE DT_BASE_PRODUCAO BETWEEN ? AND ?';
      params = [dateRange.start, dateRange.end];
    }
    
    const data = await dbAll(
      `SELECT * FROM tb_PRODUCCION ${whereClause} 
       ORDER BY DT_BASE_PRODUCAO DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const totalResult = await dbGet(
      `SELECT COUNT(*) as total FROM tb_PRODUCCION ${whereClause}`,
      params
    );
    
    res.json({
      data: data,
      pagination: {
        page: page,
        limit: limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/produccion/summary - Resumen de producción por fecha
app.get('/api/produccion/summary', async (req, res) => {
  try {
    const dateRange = getDateRangeParams(req.query.startDate, req.query.endDate);
    
    let whereClause = '';
    let params = [];
    
    if (dateRange) {
      whereClause = 'WHERE DT_BASE_PRODUCAO BETWEEN ? AND ?';
      params = [dateRange.start, dateRange.end];
    }
    
    const summary = await dbAll(
      `SELECT 
        DATE(DT_BASE_PRODUCAO) as fecha,
        COUNT(*) as total_registros,
        SUM(CAST(METRAGEM AS REAL)) as total_metros
       FROM tb_PRODUCCION 
       ${whereClause}
       GROUP BY DATE(DT_BASE_PRODUCAO)
       ORDER BY fecha DESC`,
      params
    );
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINTS - Calidad
// =====================================================================

// GET /api/calidad - Listar control de calidad
app.get('/api/calidad', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const dateRange = getDateRangeParams(req.query.startDate, req.query.endDate);
    
    let whereClause = '';
    let params = [];
    
    if (dateRange) {
      whereClause = 'WHERE DAT_PROD BETWEEN ? AND ?';
      params = [dateRange.start, dateRange.end];
    }
    
    const data = await dbAll(
      `SELECT * FROM tb_CALIDAD ${whereClause} 
       ORDER BY DAT_PROD DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const totalResult = await dbGet(
      `SELECT COUNT(*) as total FROM tb_CALIDAD ${whereClause}`,
      params
    );
    
    res.json({
      data: data,
      pagination: {
        page: page,
        limit: limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calidad/revision-cq - Reporte agrupado por Revisor (Lógica VBA)
app.get('/api/calidad/revision-cq', async (req, res) => {
  try {
    const dateRange = getDateRangeParams(req.query.startDate, req.query.endDate);
    const tramas = req.query.tramas || 'Todas'; // Todas, ALG 100%, P + E, POL 100%

    if (!dateRange) {
      return res.status(400).json({ error: 'Se requieren startDate y endDate' });
    }

    let tramasFilter = '';
    if (tramas === 'ALG 100%') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'A'";
    } else if (tramas === 'P + E') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'Y'";
    } else if (tramas === 'POL 100%') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'P'";
    }

    // 1. CTE para de-duplicar rollos (agrupar defectos)
    // Se asume que METRAGEM, PONTUACAO, LARGURA son datos del rollo y se repiten por defecto.
    // Usamos MAX para obtener el valor único del rollo.
    const sql = `
      WITH RollosUnicos AS (
        SELECT
          "REVISOR FINAL" as Revisor,
          SUM(CAST(REPLACE(METRAGEM, ',', '.') as REAL)) as Metros,
          MAX(CAST(REPLACE(PONTUACAO, ',', '.') as REAL)) as Puntos,
          MAX(CAST(REPLACE(LARGURA, ',', '.') as REAL)) as Ancho,
          TRIM(QUALIDADE) as QualidadeLimpa
        FROM tb_CALIDAD
        WHERE
          EMP = 'STC'
          AND DAT_PROD BETWEEN ? AND ?
          AND QUALIDADE NOT LIKE '%RETALHO%'
          ${tramasFilter}
        GROUP BY
          "REVISOR FINAL",
          DAT_PROD,
          PEÇA,
          ETIQUETA,
          QUALIDADE,
          ARTIGO
      )
      SELECT
        Revisor,
        SUM(Metros) as Mts_Total,
        
        -- Calidad %: (Metros 1era / Total Metros) * 100
        ROUND(
          SUM(CASE WHEN QualidadeLimpa LIKE 'PRIMEIRA%' THEN Metros ELSE 0 END) 
          / NULLIF(SUM(Metros), 0) 
          * 100
        , 1) as Calidad_Perc,
        
        -- Pts 100m2: (Puntos 1era * 100) / Area 1era m2
        -- Area = (Metros * Ancho_cm) / 100
        ROUND(
          (SUM(CASE WHEN QualidadeLimpa LIKE 'PRIMEIRA%' THEN IFNULL(Puntos, 0) ELSE 0 END) * 100.0) 
          / 
          NULLIF(
            (SUM(CASE WHEN QualidadeLimpa LIKE 'PRIMEIRA%' THEN (Metros * IFNULL(Ancho,0)) ELSE 0 END) / 100.0)
          , 0)
        , 1) as Pts_100m2,
        
        -- Rollos 1era
        COUNT(CASE WHEN QualidadeLimpa LIKE 'PRIMEIRA%' THEN 1 END) as Rollos_1era,
        
        -- Sin Pts (1era con Puntos 0 o Null)
        COUNT(CASE WHEN QualidadeLimpa LIKE 'PRIMEIRA%' AND (Puntos IS NULL OR Puntos = 0) THEN 1 END) as Rollos_Sin_Pts,
        
        -- % Sin Pts
        ROUND(
          CAST(COUNT(CASE WHEN QualidadeLimpa LIKE 'PRIMEIRA%' AND (Puntos IS NULL OR Puntos = 0) THEN 1 END) AS REAL)
          / NULLIF(COUNT(CASE WHEN QualidadeLimpa LIKE 'PRIMEIRA%' THEN 1 END), 0)
          * 100
        , 1) as Perc_Sin_Pts

      FROM RollosUnicos
      GROUP BY Revisor
      ORDER BY Mts_Total DESC
    `;

    const rows = await dbAll(sql, [dateRange.start, dateRange.end]);
    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINTS - Paradas
// =====================================================================

// GET /api/paradas - Listar paradas de máquina
app.get('/api/paradas', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const dateRange = getDateRangeParams(req.query.startDate, req.query.endDate);
    
    let whereClause = '';
    let params = [];
    
    if (dateRange) {
      whereClause = 'WHERE DATA_BASE BETWEEN ? AND ?';
      params = [dateRange.start, dateRange.end];
    }
    
    const data = await dbAll(
      `SELECT * FROM tb_PARADAS ${whereClause} 
       ORDER BY DATA_BASE DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const totalResult = await dbGet(
      `SELECT COUNT(*) as total FROM tb_PARADAS ${whereClause}`,
      params
    );
    
    res.json({
      data: data,
      pagination: {
        page: page,
        limit: limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/paradas/top-motivos - Top motivos de parada
app.get('/api/paradas/top-motivos', async (req, res) => {
  try {
    const dateRange = getDateRangeParams(req.query.startDate, req.query.endDate);
    
    let whereClause = '';
    let params = [];
    
    if (dateRange) {
      whereClause = 'WHERE DATA_BASE BETWEEN ? AND ?';
      params = [dateRange.start, dateRange.end];
    }
    
    const topMotivos = await dbAll(
      `SELECT 
        MOTIVO,
        COUNT(*) as cantidad,
        SUM(CAST(DURACAO AS REAL) / 60.0) as total_horas
       FROM tb_PARADAS 
       ${whereClause}
       GROUP BY MOTIVO
       ORDER BY total_horas DESC
       LIMIT 10`,
      params
    );
    
    res.json(topMotivos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINTS - Fichas
// =====================================================================

// GET /api/fichas - Listar fichas de artículos
app.get('/api/fichas', async (req, res) => {
  try {
    const search = req.query.search;
    
    let whereClause = '';
    let params = [];
    
    if (search) {
      whereClause = `WHERE [ARTIGO CODIGO] LIKE ? OR ARTIGO LIKE ? OR COR LIKE ?`;
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    
    const data = await dbAll(
      `SELECT * FROM tb_FICHAS ${whereClause} 
       ORDER BY [ARTIGO CODIGO]
       LIMIT 100`,
      params
    );
    
    res.json({ data: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fichas/:codigo - Obtener ficha por código
app.get('/api/fichas/:codigo', async (req, res) => {
  try {
    const ficha = await dbGet(
      `SELECT * FROM tb_FICHAS WHERE [ARTIGO CODIGO] = ?`,
      [req.params.codigo]
    );
    
    if (ficha) {
      res.json(ficha);
    } else {
      res.status(404).json({ error: 'Ficha no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINTS - Testes
// =====================================================================

// GET /api/testes - Listar testes físicos
app.get('/api/testes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const data = await dbAll(
      `SELECT * FROM tb_TESTES 
       ORDER BY DT_PROD DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    const totalResult = await dbGet(`SELECT COUNT(*) as total FROM tb_TESTES`);
    
    res.json({
      data: data,
      pagination: {
        page: page,
        limit: limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINTS - Residuos
// =====================================================================

// GET /api/residuos/indigo - Residuos índigo
app.get('/api/residuos/indigo', async (req, res) => {
  try {
    const data = await dbAll(
      `SELECT * FROM tb_RESIDUOS_INDIGO 
       ORDER BY DT_MOV DESC 
       LIMIT 100`
    );
    
    res.json({ data: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/residuos/sector - Residuos por sector
app.get('/api/residuos/sector', async (req, res) => {
  try {
    const data = await dbAll(
      `SELECT * FROM tb_RESIDUOS_POR_SECTOR 
       ORDER BY DT_MOV DESC 
       LIMIT 100`
    );
    
    res.json({ data: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// Iniciar servidor
// =====================================================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║      🚀 API SQLite para Vue.js - ACTIVA              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✓ Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`✓ Base de datos: ${DB_PATH}`);
  console.log('');
  console.log('📋 Endpoints disponibles:');
  console.log('   GET  /api/status                  - Estado del sistema');
  console.log('   GET  /api/produccion              - Listar producción');
  console.log('   GET  /api/produccion/summary      - Resumen producción');
  console.log('   GET  /api/calidad                 - Listar calidad');
  console.log('   GET  /api/paradas                 - Listar paradas');
  console.log('   GET  /api/paradas/top-motivos     - Top motivos');
  console.log('   GET  /api/fichas                  - Listar fichas');
  console.log('   GET  /api/fichas/:codigo          - Obtener ficha');
  console.log('   GET  /api/testes                  - Listar testes');
  console.log('   GET  /api/residuos/indigo         - Residuos índigo');
  console.log('   GET  /api/residuos/sector         - Residuos sector');
  console.log('');
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  db.close((err) => {
    if (err) console.error(err.message);
    console.log('✓ Conexión SQLite cerrada');
    process.exit(0);
  });
});
