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
  
  // Configurar para leer datos frescos del WAL
  db.run('PRAGMA journal_mode=WAL;');
  db.run('PRAGMA wal_checkpoint(PASSIVE);');
  db.run('PRAGMA query_only=0;');
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

      // 1. Verificar archivo en disco - usar AMBAS fechas (mtime Y birthtime/ctime)
      try {
        if (fs.existsSync(config.xlsxPath)) {
          const stats = fs.statSync(config.xlsxPath);
          // Usar la fecha más reciente entre mtime (modificación) y ctime (cambio de atributos/descarga)
          const mtime = stats.mtime.getTime();
          const ctime = stats.ctime.getTime();
          const mostRecent = new Date(Math.max(mtime, ctime));
          fileModified = mostRecent.toISOString(); // Fecha más reciente
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
            // Comparar la última importación con la fecha actual del archivo
            const lastImportDate = new Date(dbRecord.last_import_date).getTime();
            const diskFileDate = new Date(fileModified).getTime();
            
            // Si el archivo en disco es más nuevo que la última importación, está desactualizado
            if (diskFileDate > lastImportDate + 2000) {
              fileStatus = 'OUTDATED';
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
        file_modified: fileModified,
        last_import_date: lastImport ? lastImport.last_import_date : null,
        rows_imported: lastImport ? lastImport.rows_imported : null,
        xlsx_last_modified: lastImport ? lastImport.xlsx_last_modified : null
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

// POST /api/import/force-all - Forzar importación de todas las tablas (sincrónico)
app.post('/api/import/force-all', async (req, res) => {
  // Usar script secuencial optimizado (paralelo no mejora por limitaciones SQLite)
  const scriptPath = path.join(__dirname, 'import-all-fast.ps1');
  const command = `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;

  console.log('⚡ Forzando importación completa...');

  try {
    const tStart = Date.now();
    // Ejecutar script y esperar resultado
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 10 * 1024 * 1024, timeout: 180000 }, (error, stdout, stderr) => {
        if (error) {
          reject({ error, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
    const tExecDone = Date.now();

    if (stderr) {
      console.warn(`⚠️ Stderr del script: ${stderr}`);
    }

    console.log(`✅ Importación forzada finalizada`);

    // Checkpoint para asegurar que el frontend vea los datos frescos
    await new Promise((resolve) => {
      db.run('PRAGMA wal_checkpoint(FULL);', () => resolve());
    });
    const tCheckpointDone = Date.now();

    res.setHeader('Connection', 'close');
    const timings = {
      totalMs: tCheckpointDone - tStart,
      execMs: tExecDone - tStart,
      checkpointMs: tCheckpointDone - tExecDone
    };
    console.log(`⏱️  force-all timings:`, timings);
    res.json({ success: true, output: stdout, timings });
  } catch (err) {
    console.error(`❌ Error ejecutando script: ${err.error?.message || err}`);
    console.error(`Stderr: ${err.stderr || ''}`);
    res.status(500).json({ error: err.error?.message || 'Error en importación', details: err.stderr });
  }
});

// POST /api/import/force-table - Forzar importación de una tabla específica
app.post('/api/import/force-table', async (req, res) => {
  const { table } = req.body;
  
  if (!table) {
    return res.status(400).json({ error: 'Debe especificar una tabla' });
  }

  const config = TABLE_CONFIGS.find(c => c.table === table);
  if (!config) {
    return res.status(404).json({ error: `Tabla ${table} no encontrada en configuración` });
  }

  const fastScripts = {
    'tb_FICHAS': 'import-fichas-fast.ps1',
    'tb_RESIDUOS_INDIGO': 'import-residuos-indig-fast.ps1',
    'tb_RESIDUOS_POR_SECTOR': 'import-residuos-por-sector-fast.ps1',
    'tb_TESTES': 'import-testes-fast.ps1',
    'tb_PARADAS': 'import-paradas-fast.ps1',
    'tb_PRODUCCION': 'import-produccion-fast.ps1',
    'tb_CALIDAD': 'import-calidad-fast.ps1'
  };

  const scriptFile = fastScripts[table] || 'import-xlsx-to-sqlite.ps1';
  const scriptPath = path.join(__dirname, scriptFile);
  const command = (scriptFile === 'import-xlsx-to-sqlite.ps1')
    ? (() => {
        const mappingJson = path.join(__dirname, 'mappings', `${config.table}.json`);
        return `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -XlsxPath "${config.xlsxPath}" -Table "${config.table}" -Sheet "${config.sheet}" -SqlitePath "${DB_PATH}" -MappingSource json -MappingJson "${mappingJson}"`;
      })()
    : `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -XlsxPath "${config.xlsxPath}" -SqlitePath "${DB_PATH}" -Sheet "${config.sheet}"`;

  console.log(`⚡ Forzando importación de ${table}...`);
  console.log(`Comando: ${command}`);
  
  try {
    // Convertir exec a Promise
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 10 * 1024 * 1024, timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          reject({ error, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
    
    console.log(`✅ ${table} importada correctamente`);
    console.log(`Stdout:`, stdout);
    
    // Forzar checkpoint para sincronizar WAL
    await new Promise((resolve) => {
      db.run('PRAGMA wal_checkpoint(FULL);', () => resolve());
    });
    
    // Obtener datos actualizados
    const dbRecord = await dbGet(
      `SELECT * FROM import_control WHERE tabla_destino = ?`,
      [config.table]
    );
    
    const response = { 
      success: true, 
      message: `${table} importado correctamente`,
      table: table,
      rows: dbRecord ? dbRecord.rows_imported : null,
      timestamp: dbRecord ? dbRecord.last_import_date : null
    };
    
    console.log(`📤 Respondiendo al frontend:`, response);
    res.setHeader('Connection', 'close');
    res.json(response);
    
  } catch (err) {
    console.error(`❌ Error ejecutando script para ${table}:`, err.error?.message || err);
    console.error(`Stderr:`, err.stderr);
    res.status(500).json({ error: err.error?.message || 'Error en importación', stderr: err.stderr });
  }
});

// POST /api/import/update-outdated - Actualizar solo tablas desactualizadas
app.post('/api/import/update-outdated', async (req, res) => {
  const { tables } = req.body;
  
  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    return res.status(400).json({ error: 'Debe especificar un array de tablas' });
  }

  console.log(`🔄 Iniciando actualización de ${tables.length} tabla(s): ${tables.join(', ')}`);
  
  const tStart = Date.now();
  const results = [];
  const errors = [];

  // Mapa de scripts optimizados para cada tabla
  const fastScripts = {
    'tb_FICHAS': 'import-fichas-fast.ps1',
    'tb_RESIDUOS_INDIGO': 'import-residuos-indig-fast.ps1',
    'tb_RESIDUOS_POR_SECTOR': 'import-residuos-por-sector-fast.ps1',
    'tb_TESTES': 'import-testes-fast.ps1',
    'tb_PARADAS': 'import-paradas-fast.ps1',
    'tb_PRODUCCION': 'import-produccion-fast.ps1',
    'tb_CALIDAD': 'import-calidad-fast.ps1'
  };

  // Importar cada tabla secuencialmente (SQLite no beneficia de paralelización)
  for (const table of tables) {
    const config = TABLE_CONFIGS.find(c => c.table === table);
    if (!config) {
      errors.push({ table, error: 'Tabla no encontrada en configuración' });
      continue;
    }

    const scriptFile = fastScripts[table] || 'import-xlsx-to-sqlite.ps1';
    const scriptPath = path.join(__dirname, scriptFile);
    const command = (scriptFile === 'import-xlsx-to-sqlite.ps1')
      ? (() => {
          const mappingJson = path.join(__dirname, 'mappings', `${config.table}.json`);
          return `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -XlsxPath "${config.xlsxPath}" -Table "${config.table}" -Sheet "${config.sheet}" -SqlitePath "${DB_PATH}" -MappingSource json -MappingJson "${mappingJson}"`;
        })()
      : `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -XlsxPath "${config.xlsxPath}" -SqlitePath "${DB_PATH}" -Sheet "${config.sheet}"`;

    console.log(`  ⚡ Importando ${table}...`);
    
    const t0 = Date.now();
    try {
      const { stdout, stderr } = await new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 10 * 1024 * 1024, timeout: 60000 }, (error, stdout, stderr) => {
          if (error) {
            reject({ error, stderr });
          } else {
            resolve({ stdout, stderr });
          }
        });
      });
      const elapsed = Date.now() - t0;
      
      if (stderr && stderr.trim()) {
        console.warn(`  ⚠️ Stderr para ${table}: ${stderr.trim()}`);
      }
      
      // Obtener datos actualizados
      const dbRecord = await dbGet(
        `SELECT * FROM import_control WHERE tabla_destino = ?`,
        [table]
      );
      
      results.push({ 
        table,
        success: true,
        rows: dbRecord ? dbRecord.rows_imported : null,
        elapsedMs: elapsed
      });
      
      console.log(`  ✅ ${table} completado (${(elapsed/1000).toFixed(2)}s, ${dbRecord?.rows_imported || 0} filas)`);
      
    } catch (err) {
      const elapsed = Date.now() - t0;
      errors.push({ 
        table,
        error: err.error?.message || 'Error desconocido',
        stderr: err.stderr,
        elapsedMs: elapsed
      });
      console.error(`  ❌ Error en ${table}:`, err.error?.message || err);
    }
  }

  const tExecDone = Date.now();

  // Checkpoint para asegurar sincronización con frontend
  console.log('  🔄 Ejecutando PRAGMA wal_checkpoint(FULL)...');
  await new Promise((resolve) => {
    db.run('PRAGMA wal_checkpoint(FULL);', () => resolve());
  });
  const tCheckpointDone = Date.now();

  const success = errors.length === 0;
  const timings = {
    totalMs: tCheckpointDone - tStart,
    execMs: tExecDone - tStart,
    checkpointMs: tCheckpointDone - tExecDone
  };

  console.log(`✅ Actualización finalizada - ${results.length} exitosas, ${errors.length} errores`);
  console.log(`⏱️  update-outdated timings:`, timings);

  res.setHeader('Connection', 'close');
  res.json({ 
    success,
    results,
    errors,
    timings,
    summary: {
      total: tables.length,
      successful: results.length,
      failed: errors.length
    }
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

// GET /api/calidad/revision-cq - Reporte agrupado por Revisor (Lógica VBA exacta)
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

    // Lógica: Revisores individuales sin RETALHO + fila RETALHO separada
    const sql = `
      WITH CAL AS (
        SELECT
          DAT_PROD,
          ARTIGO,
          SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) AS METRAGEM,
          AVG(CAST(REPLACE(PONTUACAO, ',', '.') AS REAL)) AS PONTUACAO,
          AVG(CAST(REPLACE(LARGURA, ',', '.') AS REAL)) AS LARGURA,
          "REVISOR FINAL",
          TRIM(QUALIDADE) AS QUALIDADE
        FROM tb_CALIDAD
        WHERE
          EMP = 'STC'
          AND DAT_PROD BETWEEN ? AND ?
          AND QUALIDADE NOT LIKE '%RETALHO%'
          ${tramasFilter}
        GROUP BY
          DAT_PROD,
          ARTIGO,
          "REVISOR FINAL",
          PEÇA,
          QUALIDADE,
          ETIQUETA
      ),
      RETALHO_METROS AS (
        SELECT
          SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) AS METRAGEM_RETALHO
        FROM tb_CALIDAD
        WHERE
          EMP = 'STC'
          AND DAT_PROD BETWEEN ? AND ?
          AND QUALIDADE LIKE '%RETALHO%'
          ${tramasFilter}
      ),
      REVISORES AS (
        SELECT
          "REVISOR FINAL" AS Revisor,
          CAST(SUM(METRAGEM) AS INTEGER) AS Mts_Total,
          
          -- Calidad %: (Metros 1era / Total Metros) * 100
          ROUND(
            SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END) 
            / NULLIF(SUM(METRAGEM), 0) * 100
          , 1) AS Calidad_Perc,
          
          -- Pts 100m²: Fórmula VBA exacta
          ROUND(
            (SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN PONTUACAO ELSE 0 END) * 100)
            /
            NULLIF(
              (SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM * LARGURA ELSE 0 END))
              / NULLIF(SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END), 0)
              / 100
              * SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END)
            , 0)
          , 1) AS Pts_100m2,
          
          -- Rollos 1era
          COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN 1 END) AS Rollos_1era,
          
          -- Sin Pts (1era con Puntos NULL o 0)
          COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' AND (PONTUACAO IS NULL OR PONTUACAO = 0) THEN 1 END) AS Rollos_Sin_Pts,
          
          -- % Sin Pts
          ROUND(
            CAST(COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' AND (PONTUACAO IS NULL OR PONTUACAO = 0) THEN 1 END) AS REAL)
            / NULLIF(COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN 1 END), 0) * 100
          , 1) AS Perc_Sin_Pts

        FROM CAL
        GROUP BY "REVISOR FINAL"
      )
      SELECT * FROM REVISORES
      UNION ALL
      SELECT
        'RETALHO' AS Revisor,
        ROUND(METRAGEM_RETALHO) AS Mts_Total,
        0 AS Calidad_Perc,
        0 AS Pts_100m2,
        0 AS Rollos_1era,
        0 AS Rollos_Sin_Pts,
        0 AS Perc_Sin_Pts
      FROM RETALHO_METROS
      WHERE METRAGEM_RETALHO > 0
      ORDER BY Mts_Total DESC
    `;

    const rows = await dbAll(sql, [dateRange.start, dateRange.end, dateRange.start, dateRange.end]);
    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calidad/available-dates - Obtener fechas disponibles en tb_CALIDAD
app.get('/api/calidad/available-dates', async (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT 
        DAT_PROD as fecha,
        strftime('%Y', DAT_PROD) as year,
        strftime('%m', DAT_PROD) as month,
        strftime('%d', DAT_PROD) as day
      FROM tb_CALIDAD
      WHERE DAT_PROD IS NOT NULL 
        AND DAT_PROD != ''
      ORDER BY DAT_PROD DESC
    `;
    
    const rows = await dbAll(sql);
    
    // Agrupar por año y mes
    const dateStructure = {
      years: {},
      minDate: null,
      maxDate: null
    };
    
    if (rows.length > 0) {
      dateStructure.minDate = rows[rows.length - 1].fecha;
      dateStructure.maxDate = rows[0].fecha;
      
      rows.forEach(row => {
        const { year, month, day, fecha } = row;
        
        if (!dateStructure.years[year]) {
          dateStructure.years[year] = {};
        }
        
        if (!dateStructure.years[year][month]) {
          dateStructure.years[year][month] = [];
        }
        
        dateStructure.years[year][month].push({ day, fecha });
      });
    }
    
    res.json(dateStructure);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calidad/revisor-detalle - Detalle de producción por revisor (con partidas)
app.get('/api/calidad/revisor-detalle', async (req, res) => {
  try {
    const dateRange = getDateRangeParams(req.query.startDate, req.query.endDate);
    const revisor = req.query.revisor;
    const tramas = req.query.tramas || 'Todas';

    if (!dateRange || !revisor) {
      return res.status(400).json({ error: 'Se requieren startDate, endDate y revisor' });
    }

    let tramasFilter = '';
    if (tramas === 'ALG 100%') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'A'";
    } else if (tramas === 'P + E') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'Y'";
    } else if (tramas === 'POL 100%') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'P'";
    }

    // Lógica VBA exacta: subconsulta con SUM(METRAGEM), AVG(PONTUACAO), AVG(LARGURA)
    // HORA NO debe estar en el GROUP BY de CAL, solo se usa para ordenar
    const sql = `
      WITH CAL AS (
        SELECT
          "NM MERC" as NombreArticulo,
          PARTIDA,
          DAT_PROD,
          ARTIGO,
          SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) AS METRAGEM,
          AVG(CAST(REPLACE(PONTUACAO, ',', '.') AS REAL)) AS PONTUACAO,
          AVG(CAST(REPLACE(LARGURA, ',', '.') AS REAL)) AS LARGURA,
          TRIM(QUALIDADE) AS QUALIDADE
        FROM tb_CALIDAD
        WHERE
          EMP = 'STC'
          AND DAT_PROD BETWEEN ? AND ?
          AND "REVISOR FINAL" = ?
          AND QUALIDADE NOT LIKE '%RETALHO%'
          ${tramasFilter}
        GROUP BY
          "NM MERC",
          PARTIDA,
          DAT_PROD,
          ARTIGO,
          PEÇA,
          QUALIDADE,
          ETIQUETA
      ),
      HorasPartida AS (
        SELECT 
          PARTIDA,
          MIN(HORA) as HoraInicio
        FROM tb_CALIDAD
        WHERE
          EMP = 'STC'
          AND DAT_PROD BETWEEN ? AND ?
          AND "REVISOR FINAL" = ?
          AND QUALIDADE NOT LIKE '%RETALHO%'
          ${tramasFilter}
        GROUP BY PARTIDA
      ),
      CalidadPorPartida AS (
        SELECT
          NombreArticulo,
          PARTIDA,
          CAST(CAST(PARTIDA AS INTEGER) AS TEXT) as Partidas,
          CAST(SUM(METRAGEM) AS INTEGER) as MetrosRevisados,
          
          -- Calidad %
          ROUND(
            SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END) 
            / NULLIF(SUM(METRAGEM), 0) * 100
          , 1) as CalidadPct,
          
          -- Pts 100m² (fórmula VBA exacta)
          ROUND(
            (SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN PONTUACAO ELSE 0 END) * 100)
            /
            NULLIF(
              (SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM * LARGURA ELSE 0 END))
              / NULLIF(SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END), 0)
              / 100
              * SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END)
            , 0)
          , 1) as Pts100m2,
          
          -- Total Rollos 1era
          COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN 1 END) as TotalRollos,
          
          -- Sin Puntos
          COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' AND (PONTUACAO IS NULL OR PONTUACAO = 0) THEN 1 END) as SinPuntos,
          
          -- % Sin Puntos
          ROUND(
            CAST(COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' AND (PONTUACAO IS NULL OR PONTUACAO = 0) THEN 1 END) AS REAL)
            / NULLIF(COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN 1 END), 0) * 100
          , 1) as SinPuntosPct
          
        FROM CAL
        GROUP BY NombreArticulo, PARTIDA
      ),
      -- Variantes de cada partida
      PartidaVariantes AS (
        SELECT 
          PARTIDA as CalPartida,
          PARTIDA as Var0,
          CASE WHEN LENGTH(PARTIDA) > 1 AND CAST(SUBSTR(PARTIDA, 1, 1) AS INTEGER) > 0 
               THEN CAST(CAST(SUBSTR(PARTIDA, 1, 1) AS INTEGER) - 1 AS TEXT) || SUBSTR(PARTIDA, 2)
          END as Var1,
          CASE WHEN LENGTH(PARTIDA) > 1 AND CAST(SUBSTR(PARTIDA, 1, 1) AS INTEGER) > 1 
               THEN CAST(CAST(SUBSTR(PARTIDA, 1, 1) AS INTEGER) - 2 AS TEXT) || SUBSTR(PARTIDA, 2)
          END as Var2,
          CASE WHEN LENGTH(PARTIDA) > 1 AND CAST(SUBSTR(PARTIDA, 1, 1) AS INTEGER) > 2 
               THEN CAST(CAST(SUBSTR(PARTIDA, 1, 1) AS INTEGER) - 3 AS TEXT) || SUBSTR(PARTIDA, 2)
          END as Var3,
          CASE WHEN LENGTH(PARTIDA) > 1 
               THEN '0' || SUBSTR(PARTIDA, 2)
          END as Var4
        FROM CalidadPorPartida
      ),
      -- Buscar en producción usando índice (sin fecha para encontrar todas las partidas)
      ProduccionTelares AS (
        SELECT
          P.PARTIDA,
          MAX(CAST(SUBSTR(P.MAQUINA, -2) AS INTEGER)) as Telar,
          SUM(COALESCE(P.PONTOS_LIDOS, 0)) as PtsLei,
          SUM(COALESCE(P."PONTOS_100%", 0)) as Pts100,
          SUM(COALESCE(P."PARADA TEC TRAMA", 0)) as ParTra,
          SUM(COALESCE(P."PARADA TEC URDUME", 0)) as ParUrd
        FROM tb_PRODUCCION P
        WHERE
          P.FILIAL = '05'
          AND P.SELETOR = 'TECELAGEM'
          AND P.PARTIDA IN (SELECT Var0 FROM PartidaVariantes WHERE Var0 IS NOT NULL
                           UNION SELECT Var1 FROM PartidaVariantes WHERE Var1 IS NOT NULL
                           UNION SELECT Var2 FROM PartidaVariantes WHERE Var2 IS NOT NULL
                           UNION SELECT Var3 FROM PartidaVariantes WHERE Var3 IS NOT NULL
                           UNION SELECT Var4 FROM PartidaVariantes WHERE Var4 IS NOT NULL)
        GROUP BY P.PARTIDA
      ),
      -- Mapeo con LEFT JOINs en cascada (más eficiente que COALESCE con subqueries)
      PartidaMapping AS (
        SELECT 
          PV.CalPartida,
          COALESCE(PT0.PARTIDA, PT1.PARTIDA, PT2.PARTIDA, PT3.PARTIDA, PT4.PARTIDA) as ProdPartida
        FROM PartidaVariantes PV
        LEFT JOIN ProduccionTelares PT0 ON PT0.PARTIDA = PV.Var0
        LEFT JOIN ProduccionTelares PT1 ON PT1.PARTIDA = PV.Var1
        LEFT JOIN ProduccionTelares PT2 ON PT2.PARTIDA = PV.Var2
        LEFT JOIN ProduccionTelares PT3 ON PT3.PARTIDA = PV.Var3
        LEFT JOIN ProduccionTelares PT4 ON PT4.PARTIDA = PV.Var4
      )
      SELECT
        HP.HoraInicio,
        CAL.NombreArticulo,
        CAL.PARTIDA,
        CAL.Partidas,
        CAL.MetrosRevisados,
        CAL.CalidadPct,
        CAL.Pts100m2,
        CAL.TotalRollos,
        CAL.SinPuntos,
        CAL.SinPuntosPct,
        COALESCE(TEJ.Telar, 0) as Telar,
        CASE 
          WHEN TEJ.PtsLei IS NULL OR TEJ.PtsLei = 0 THEN NULL
          ELSE ROUND((CAST(TEJ.PtsLei AS REAL) / NULLIF(TEJ.Pts100, 0)) * 100, 1)
        END as EficienciaPct,
        CASE 
          WHEN TEJ.PtsLei IS NULL OR TEJ.PtsLei = 0 THEN NULL
          ELSE ROUND((CAST(TEJ.ParUrd AS REAL) * 100000.0) / NULLIF((TEJ.PtsLei * 1000.0), 0), 1)
        END as RU105,
        CASE 
          WHEN TEJ.PtsLei IS NULL OR TEJ.PtsLei = 0 THEN NULL
          ELSE ROUND((CAST(TEJ.ParTra AS REAL) * 100000.0) / NULLIF((TEJ.PtsLei * 1000.0), 0), 1)
        END as RT105
      FROM CalidadPorPartida CAL
      LEFT JOIN HorasPartida HP ON CAL.PARTIDA = HP.PARTIDA
      LEFT JOIN PartidaMapping PM ON CAL.PARTIDA = PM.CalPartida
      LEFT JOIN ProduccionTelares TEJ ON PM.ProdPartida = TEJ.PARTIDA
      ORDER BY HP.HoraInicio ASC
    `;

    // Parámetros: CAL (2), HorasPartida (2)
    // ProduccionTelares ya no necesita parámetros porque filtra por EXISTS con PartidasCalidad
    const rows = await dbAll(sql, [
      dateRange.start, dateRange.end, revisor,  // CAL
      dateRange.start, dateRange.end, revisor   // HorasPartida
    ]);
    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calidad/partida-detalle - Detalle de defectos de una partida específica
app.get('/api/calidad/partida-detalle', async (req, res) => {
  try {
    const fecha = req.query.fecha;
    const partida = req.query.partida;
    const revisor = req.query.revisor;

    if (!fecha || !partida || !revisor) {
      return res.status(400).json({ error: 'Se requieren fecha, partida y revisor' });
    }

    const sql = `
      SELECT
        DAT_PROD,
        ARTIGO,
        COR,
        "NM MERC" as NM_MERC,
        TRAMA,
        GRP_DEF,
        COD_DE,
        DEFEITO,
        CAST(REPLACE(METRAGEM, ',', '.') AS REAL) as METRAGEM,
        QUALIDADE,
        HORA,
        EMENDAS,
        PEÇA,
        ETIQUETA,
        CAST(REPLACE(LARGURA, ',', '.') AS REAL) as LARGURA,
        CAST(REPLACE(PONTUACAO, ',', '.') AS REAL) as PONTUACAO
      FROM tb_CALIDAD
      WHERE
        EMP = 'STC'
        AND DATE(DAT_PROD) = ?
        AND PARTIDA = ?
        AND "REVISOR FINAL" = ?
        AND QUALIDADE NOT LIKE '%RETALHO%'
      ORDER BY HORA ASC, PEÇA ASC
    `;

    const rows = await dbAll(sql, [fecha, partida, revisor]);
    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/test/produccion-partida - TEST: Ver datos raw de producción para una partida
app.get('/api/test/produccion-partida', async (req, res) => {
  try {
    const partida = req.query.partida || '1541315';
    
    // Ver registros con PONTOS_LIDOS no nulo
    const sqlWithData = `
      SELECT 
        PARTIDA,
        MAQUINA,
        SELETOR,
        PONTOS_LIDOS,
        "PONTOS_100%",
        "PARADA TEC TRAMA",
        "PARADA TEC URDUME",
        DT_BASE_PRODUCAO
      FROM tb_PRODUCCION
      WHERE PONTOS_LIDOS IS NOT NULL
        AND FILIAL = '05'
        AND SELETOR = 'TECELAGEM'
      LIMIT 10
    `;
    
    const withData = await dbAll(sqlWithData);
    
    // Contar registros con y sin datos
    const sqlCount = `
      SELECT 
        COUNT(*) as Total,
        COUNT(PONTOS_LIDOS) as ConPontosLidos,
        COUNT("PONTOS_100%") as ConPontos100
      FROM tb_PRODUCCION
      WHERE FILIAL = '05'
        AND SELETOR = 'TECELAGEM'
    `;
    
    const counts = await dbGet(sqlCount);
    
    res.json({
      examplesWithData: withData,
      counts: counts,
      message: "Si examplesWithData está vacío, PONTOS_LIDOS nunca tiene datos"
    });
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
  console.log('   GET  /api/calidad/revisores       - Lista de revisores');
  console.log('   GET  /api/calidad/historico-revisor - Análisis histórico por revisor');
  console.log('');
});

// GET /api/calidad/revisores - Lista de revisores únicos
app.get('/api/calidad/revisores', async (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT "REVISOR FINAL" AS revisor
      FROM tb_CALIDAD
      WHERE "REVISOR FINAL" IS NOT NULL 
        AND "REVISOR FINAL" != ''
        AND "REVISOR FINAL" != 'RETALHO'
      ORDER BY "REVISOR FINAL"
    `;
    
    const rows = await dbAll(sql);
    res.json(rows.map(r => r.revisor));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calidad/historico-revisor - Análisis histórico mensual por revisor
app.get('/api/calidad/historico-revisor', async (req, res) => {
  try {
    const { startDate, endDate, revisor, tramas } = req.query;

    if (!startDate || !endDate || !revisor) {
      return res.status(400).json({ error: 'Se requieren startDate, endDate y revisor' });
    }

    // Filtro de tramas (misma lógica que revision-cq)
    let tramasFilter = '';
    if (tramas === 'ALG 100%') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'A'";
    } else if (tramas === 'P + E') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'Y'";
    } else if (tramas === 'POL 100%') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'P'";
    }

    const sql = `
      WITH CAL AS (
        SELECT
          strftime('%Y-%m', DAT_PROD) AS MesAno,
          DAT_PROD,
          ARTIGO,
          SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) AS METRAGEM,
          AVG(CAST(REPLACE(PONTUACAO, ',', '.') AS REAL)) AS PONTUACAO,
          AVG(CAST(REPLACE(LARGURA, ',', '.') AS REAL)) AS LARGURA,
          TRIM(QUALIDADE) AS QUALIDADE
        FROM tb_CALIDAD
        WHERE EMP = 'STC'
          AND DAT_PROD BETWEEN ? AND ?
          AND "REVISOR FINAL" = ?
          AND QUALIDADE NOT LIKE '%RETALHO%'
          ${tramasFilter}
        GROUP BY
          strftime('%Y-%m', DAT_PROD),
          DAT_PROD,
          ARTIGO,
          PEÇA,
          QUALIDADE,
          ETIQUETA
      ),
      MENSUAL AS (
        SELECT
          MesAno,
          CAST(SUM(METRAGEM) AS INTEGER) AS Mts_Total,
          
          -- Calidad %: (Metros 1era / Total Metros) * 100 - MISMA FÓRMULA que revision-cq
          ROUND(
            SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END) 
            / NULLIF(SUM(METRAGEM), 0) * 100
          , 1) AS Calidad_Perc,
          
          -- Pts 100m²: Fórmula exacta de revision-cq
          ROUND(
            (SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN PONTUACAO ELSE 0 END) * 100)
            /
            NULLIF(
              (SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM * LARGURA ELSE 0 END))
              / NULLIF(SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END), 0)
              / 100
              * SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END)
            , 0)
          , 1) AS Pts_100m2,
          
          -- Rollos 1era
          COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN 1 END) AS Rollos_1era,
          
          -- Sin Pts (1era con Puntos NULL o 0)
          COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' AND (PONTUACAO IS NULL OR PONTUACAO = 0) THEN 1 END) AS Rollos_Sin_Pts,
          
          -- % Sin Pts
          ROUND(
            CAST(COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' AND (PONTUACAO IS NULL OR PONTUACAO = 0) THEN 1 END) AS REAL)
            / NULLIF(COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN 1 END), 0) * 100
          , 1) AS Perc_Sin_Pts

        FROM CAL
        GROUP BY MesAno
      )
      SELECT * FROM MENSUAL
      ORDER BY MesAno
    `;

    const rows = await dbAll(sql, [startDate, endDate, revisor]);
    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calidad/historico-global - Análisis histórico mensual GLOBAL (todos los revisores)
app.get('/api/calidad/historico-global', async (req, res) => {
  try {
    const { startDate, endDate, tramas } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Se requieren startDate y endDate' });
    }

    // Filtro de tramas
    let tramasFilter = '';
    if (tramas === 'ALG 100%') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'A'";
    } else if (tramas === 'P + E') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'Y'";
    } else if (tramas === 'POL 100%') {
      tramasFilter = "AND SUBSTR(ARTIGO, 1, 1) = 'P'";
    }

    const sql = `
      WITH CAL AS (
        SELECT
          strftime('%Y-%m', DAT_PROD) AS MesAno,
          DAT_PROD,
          ARTIGO,
          SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) AS METRAGEM,
          AVG(CAST(REPLACE(PONTUACAO, ',', '.') AS REAL)) AS PONTUACAO,
          AVG(CAST(REPLACE(LARGURA, ',', '.') AS REAL)) AS LARGURA,
          TRIM(QUALIDADE) AS QUALIDADE
        FROM tb_CALIDAD
        WHERE EMP = 'STC'
          AND DAT_PROD BETWEEN ? AND ?
          AND "REVISOR FINAL" IS NOT NULL 
          AND "REVISOR FINAL" != ''
          AND "REVISOR FINAL" != 'RETALHO'
          AND QUALIDADE NOT LIKE '%RETALHO%'
          ${tramasFilter}
        GROUP BY
          strftime('%Y-%m', DAT_PROD),
          DAT_PROD,
          ARTIGO,
          PEÇA,
          QUALIDADE,
          ETIQUETA
      ),
      MENSUAL AS (
        SELECT
          MesAno,
          CAST(SUM(METRAGEM) AS INTEGER) AS Mts_Total,
          
          -- Calidad %
          ROUND(
            SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END) 
            / NULLIF(SUM(METRAGEM), 0) * 100
          , 1) AS Calidad_Perc,
          
          -- Pts 100m²
          ROUND(
            (SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN PONTUACAO ELSE 0 END) * 100)
            /
            NULLIF(
              (SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM * LARGURA ELSE 0 END))
              / NULLIF(SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END), 0)
              / 100
              * SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN METRAGEM ELSE 0 END)
            , 0)
          , 1) AS Pts_100m2,
          
          -- % Sin Pts
          ROUND(
            CAST(COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' AND (PONTUACAO IS NULL OR PONTUACAO = 0) THEN 1 END) AS REAL)
            / NULLIF(COUNT(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' THEN 1 END), 0) * 100
          , 1) AS Perc_Sin_Pts

        FROM CAL
        GROUP BY MesAno
      )
      SELECT * FROM MENSUAL
      ORDER BY MesAno
    `;

    const rows = await dbAll(sql, [startDate, endDate]);
    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Análisis Mesa de Test (TESTES + CALIDAD + FICHAS)
// =====================================================================
// GET /api/analisis-mesa-test?articulo=XXX&fecha_inicial=YYYY-MM-DD&fecha_final=YYYY-MM-DD
app.get('/api/analisis-mesa-test', async (req, res) => {
  try {
    const { articulo, fecha_inicial, fecha_final } = req.query;

    if (!articulo) {
      return res.status(400).json({ error: 'Parámetro "articulo" requerido' });
    }
    if (!fecha_inicial) {
      return res.status(400).json({ error: 'Parámetro "fecha_inicial" requerido' });
    }

    // Convertir fechas a formato compatible con SQLite
    const fechaInicio = `${fecha_inicial} 00:00:00`;
    const fechaFin = fecha_final ? `${fecha_final} 23:59:59` : '9999-12-31 23:59:59';

    // SQL equivalente al query de Excel VBA, adaptado a SQLite
    const sql = `
      -- Subconsulta TESTES
      -- IMPORTANTE: Convertir formato europeo (1.980,00) a numérico (1980.00)
      WITH TESTES AS (
        SELECT 
          MAQUINA,
          ARTIGO AS ART_TEST,
          CAST(PARTIDA AS INTEGER) AS PARTIDA,
          ARTIGO AS TESTES,
          DT_PROD,
          APROV,
          OBS,
          REPROCESSO,
          CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) AS METRAGEM,
          LARG_AL,
          GRAMAT,
          POTEN,
          "%_ENC_URD",
          "%_ENC_TRAMA",
          "%_SK1",
          "%_SK2",
          "%_SK3",
          "%_SK4",
          "%_SKE",
          "%_STT",
          "%_SKM"
        FROM tb_TESTES
        WHERE ARTIGO = ?
          AND DATE(DT_PROD) >= DATE(?)
          AND DATE(DT_PROD) <= DATE(?)
      ),
      
      -- Subconsulta CALIDAD (agregada por PARTIDA)
      -- IMPORTANTE: Convertir formato europeo (1.980,00) a numérico (1980.00)
      CALIDAD AS (
        SELECT 
          MIN(DATE(DAT_PROD)) AS DAT_PROD,
          ARTIGO AS ART_CAL,
          CAST(PARTIDA AS INTEGER) AS PARTIDA,
          ROUND(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) AS METRAGEM,
          ROUND(AVG(LARGURA), 1) AS LARGURA,
          ROUND(AVG("GR/M2"), 1) AS "GR/M2"
        FROM tb_CALIDAD
        WHERE ARTIGO = ?
          AND DATE(DAT_PROD) >= DATE(?)
          AND DATE(DAT_PROD) <= DATE(?)
        GROUP BY ARTIGO, PARTIDA
      ),
      
      -- LEFT JOIN TESTES + CALIDAD
      TESTES_CALIDAD AS (
        SELECT 
          T.*,
          C.DAT_PROD,
          C.METRAGEM AS CALIDAD_METRAGEM,
          C.LARGURA AS CALIDAD_LARGURA,
          C."GR/M2" AS CALIDAD_GRM2
        FROM TESTES T
        LEFT JOIN CALIDAD C ON T.PARTIDA = C.PARTIDA
      ),
      
      -- Subconsulta ESPECIFICACION (tb_FICHAS)
      ESPECIFICACION AS (
        SELECT 
          "ARTIGO CODIGO",
          URDUME,
          "TRAMA REDUZIDO",
          BATIDA,
          "Oz/jd2",
          "Peso/m2",
          "LARGURA MIN",
          LARGURA AS ANCHO,
          "LARGURA MAX",
          "SKEW MIN",
          ("SKEW MIN" + "SKEW MAX") / 2.0 AS "SKEW STD",
          "SKEW MAX",
          "URD#MIN",
          ("URD#MIN" + "URD#MAX") / 2.0 AS "URD#STD",
          "URD#MAX",
          "TRAMA MIN",
          ("TRAMA MIN" + "TRAMA MAX") / 2.0 AS "TRAMA STD",
          "TRAMA MAX",
          "VAR STR#MIN TRAMA",
          ("VAR STR#MIN TRAMA" + "VAR STR#MAX TRAMA") / 2.0 AS "VAR STR#STD TRAMA",
          "VAR STR#MAX TRAMA",
          "VAR STR#MIN URD",
          ("VAR STR#MIN URD" + "VAR STR#MAX URD") / 2.0 AS "VAR STR#STD URD",
          "VAR STR#MAX URD",
          "ENC#ACAB URD"
        FROM tb_FICHAS
        WHERE "ARTIGO CODIGO" = ?
      )
      
      -- SELECT FINAL con LEFT JOIN a ESPECIFICACION
      SELECT 
        CAST(TC.MAQUINA AS INTEGER) AS Maquina,
        TC.ART_TEST AS Articulo,
        E."TRAMA REDUZIDO" AS Trama,
        TC.PARTIDA AS Partida,
        TC.TESTES AS C,
        DATE(TC.DT_PROD) AS Fecha,
        TC.APROV AS Ap,
        TC.OBS AS Obs,
        TC.REPROCESSO AS R,
        ROUND(TC.METRAGEM, 0) AS Metros_TEST,
        ROUND(TC.CALIDAD_METRAGEM, 0) AS Metros_MESA,
        
        ROUND(TC.CALIDAD_LARGURA, 1) AS Ancho_MESA,
        ROUND(E."LARGURA MIN", 1) AS Ancho_MIN,
        ROUND(E.ANCHO, 1) AS Ancho_STD,
        ROUND(E."LARGURA MAX", 1) AS Ancho_MAX,
        ROUND(TC.LARG_AL, 1) AS Ancho_TEST,
        
        ROUND(TC.CALIDAD_GRM2, 1) AS Peso_MESA,
        E."Peso/m2" * 0.95 AS Peso_MIN,
        ROUND(E."Peso/m2", 1) AS Peso_STD,
        E."Peso/m2" * 1.05 AS Peso_MAX,
        ROUND(TC.GRAMAT, 1) AS Peso_TEST,
        
        TC.POTEN AS Potencial,
        E."ENC#ACAB URD" AS Potencial_STD,
        
        TC."%_ENC_URD" AS "ENC_URD_%",
        E."URD#MIN" AS "ENC_URD_MIN_%",
        E."URD#STD" AS "ENC_URD_STD_%",
        E."URD#MAX" AS "ENC_URD_MAX_%",
        -1.5 AS "%_ENC_URD_MIN_Meta",
        -1.0 AS "%_ENC_URD_MAX_Meta",
        
        TC."%_ENC_TRAMA" AS "ENC_TRA_%",
        E."TRAMA MIN" AS "ENC_TRA_MIN_%",
        E."TRAMA STD" AS "ENC_TRA_STD_%",
        E."TRAMA MAX" AS "ENC_TRA_MAX_%",
        
        TC."%_SK1" AS "%_SK1",
        TC."%_SK2" AS "%_SK2",
        TC."%_SK3" AS "%_SK3",
        TC."%_SK4" AS "%_SK4",
        TC."%_SKE" AS "%_SKE",
        
        E."SKEW MIN" AS Skew_MIN,
        E."SKEW STD" AS Skew_STD,
        E."SKEW MAX" AS Skew_MAX,
        
        CAST(TC."%_STT" AS REAL) AS "%_STT",
        E."VAR STR#MIN TRAMA" AS "%_STT_MIN",
        E."VAR STR#STD TRAMA" AS "%_STT_STD",
        E."VAR STR#MAX TRAMA" AS "%_STT_MAX",
        
        TC."%_SKM" AS Pasadas_Terminadas,
        E."VAR STR#MIN URD" AS Pasadas_MIN,
        E."VAR STR#STD URD" AS Pasadas_STD,
        E."VAR STR#MAX URD" AS Pasadas_MAX,
        
        ROUND(TC.CALIDAD_GRM2 * 0.0295, 1) AS "Peso_MESA_OzYd²",
        ROUND(E."Peso/m2" * 0.95 * 0.0295, 1) AS "Peso_MIN_OzYd²",
        ROUND(E."Peso/m2" * 0.0295, 1) AS "Peso_STD_OzYd²",
        ROUND(E."Peso/m2" * 1.05 * 0.0295, 1) AS "Peso_MAX_OzYd²"
        
      FROM TESTES_CALIDAD TC
      LEFT JOIN ESPECIFICACION E ON TC.ART_TEST = E."ARTIGO CODIGO"
      ORDER BY DATE(TC.DT_PROD);
    `;

    const rows = await dbAll(sql, [articulo, fechaInicio, fechaFin, articulo, fechaInicio, fechaFin, articulo]);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/analisis-mesa-test:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Lista de Artículos para Análisis Mesa Test
// =====================================================================
// GET /api/articulos-mesa-test?fecha_inicial=YYYY-MM-DD
app.get('/api/articulos-mesa-test', async (req, res) => {
  try {
    const { fecha_inicial } = req.query;

    if (!fecha_inicial) {
      return res.status(400).json({ error: 'Parámetro "fecha_inicial" requerido' });
    }

    const fechaInicio = `${fecha_inicial} 00:00:00`;

    // SQL optimizado para listar artículos con métricas agregadas
    const sql = `
      -- Obtener artículos únicos de ambas tablas con sus métricas
      WITH ArticulosUnicos AS (
        -- Artículos de tb_CALIDAD (excluir artículos sin TRAMA)
        SELECT DISTINCT ARTIGO
        FROM tb_CALIDAD
        WHERE DATE(DAT_PROD) >= DATE(?)
          AND TRAMA IS NOT NULL
        
        UNION
        
        -- Artículos de tb_TESTES
        SELECT DISTINCT ARTIGO
        FROM tb_TESTES
        WHERE DATE(DT_PROD) >= DATE(?)
      ),
      
      -- Métricas de CALIDAD (directo, excluir artículos sin TRAMA)
      -- IMPORTANTE: Convertir formato europeo (1.980,00) a numérico (1980.00)
      MetricasCalidad AS (
        SELECT 
          ARTIGO,
          ROUND(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) AS METROS_REV
        FROM tb_CALIDAD
        WHERE DATE(DAT_PROD) >= DATE(?)
          AND TRAMA IS NOT NULL
        GROUP BY ARTIGO
      ),
      
      -- Métricas de TESTES (AVG por PARTIDA primero para evitar duplicados)
      -- IMPORTANTE: Convertir formato europeo (1.980,00) a numérico (1980.00)
      MetricasTestes AS (
        SELECT 
          ARTIGO,
          ROUND(SUM(METRAGEM_AVG), 0) AS METROS_TEST
        FROM (
          SELECT 
            ARTIGO,
            PARTIDA,
            AVG(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM_AVG
          FROM tb_TESTES
          WHERE DATE(DT_PROD) >= DATE(?)
          GROUP BY ARTIGO, PARTIDA
        )
        GROUP BY ARTIGO
      )
      
      -- SELECT FINAL con JOIN a tb_FICHAS
      SELECT 
        AU.ARTIGO AS ARTIGO_COMPLETO,
        SUBSTR(AU.ARTIGO, 1, 10) AS Articulo,
        SUBSTR(AU.ARTIGO, 7, 2) AS Id,
        F.COR AS Color,
        F."NOME DE MERCADO" AS Nombre,
        F."TRAMA REDUZIDO" AS Trama,
        COALESCE(MT.METROS_TEST, 0) AS Metros_TEST,
        COALESCE(MC.METROS_REV, 0) AS Metros_REV
      FROM ArticulosUnicos AU
      LEFT JOIN MetricasTestes MT ON AU.ARTIGO = MT.ARTIGO
      LEFT JOIN MetricasCalidad MC ON AU.ARTIGO = MC.ARTIGO
      LEFT JOIN tb_FICHAS F ON AU.ARTIGO = F."ARTIGO CODIGO"
      WHERE F."TRAMA REDUZIDO" IS NOT NULL
      ORDER BY AU.ARTIGO;
    `;

    const rows = await dbAll(sql, [fechaInicio, fechaInicio, fechaInicio, fechaInicio]);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/articulos-mesa-test:', error);
    res.status(500).json({ error: error.message });
  }
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
