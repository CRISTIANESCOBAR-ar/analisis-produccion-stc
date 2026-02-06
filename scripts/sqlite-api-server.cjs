// =====================================================================
// API Backend Node.js para acceder a SQLite desde Vue.js
// =====================================================================
// Servidor Express que expone endpoints REST para consultar SQLite
// Usar con: node scripts/sqlite-api-server.js
// =====================================================================

/* eslint-disable security/detect-object-injection */
/* eslint-disable security/detect-non-literal-fs-filename */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const app = express();
const PORT = 3002;
const DB_PATH = path.join(__dirname, '../database/produccion.db');

// Configuración de tablas y archivos (Sincronizado con update-all-tables.ps1)
// NOTA: xlsxPath ahora se construye dinámicamente basado en la carpeta elegida por el usuario
const TABLE_DEFINITIONS = [
  { table: 'tb_FICHAS', filename: 'fichaArtigo.csv', sheet: 'lista de tecidos' },
  { table: 'tb_RESIDUOS_INDIGO', filename: 'RelResIndigo.csv', sheet: 'rptResiduosIndigo' },
  { table: 'tb_RESIDUOS_POR_SECTOR', filename: 'rptResiduosPorSetor.csv', sheet: 'rptResiduosPorSetor' },
  { table: 'tb_TESTES', filename: 'rptPrdTestesFisicos.csv', sheet: 'report2' },
  { table: 'tb_PARADAS', filename: 'rptParadaMaquinaPRD.csv', sheet: 'rptpm' },
  { table: 'tb_PRODUCCION', filename: 'rptProducaoMaquina.csv', sheet: 'rptProdMaq' },
  { table: 'tb_CALIDAD', filename: 'rptAcompDiarioPBI.csv', sheet: 'report5' },
  { table: 'tb_PROCESO', filename: 'rpsPosicaoEstoquePRD.csv', sheet: 'rptStock' },
  { table: 'tb_DEFECTOS', filename: 'rptDefPeca.csv', sheet: 'rptDefPeca' },
  { table: 'tb_CALIDAD_FIBRA', filename: 'rptMovimMP.csv', sheet: 'rptMovimMP' },
  { table: 'tb_PRODUCCION_OE', filename: 'rptProducaoOE.csv', sheet: 'Sheet1' }
];

// Helper para obtener configuración con ruta dinámica
const getTableConfig = (folderPath) => {
  const root = folderPath || 'C:\\STC';
  return TABLE_DEFINITIONS.map(def => ({
    ...def,
    xlsxPath: path.join(root, def.filename)
  }));
};

// Middleware - CORS permisivo para ngrok
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3002',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como Postman o ngrok)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Permitir orígenes de localhost
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // Permitir cualquier origen de ngrok
    if (origin.includes('ngrok') || origin.includes('ngrok-free.app')) {
      callback(null, true);
      return;
    }
    
    // Permitir cualquier origen en desarrollo (para flexibilidad)
    // En producción, esto debería ser más restrictivo
    console.log(`⚠️ CORS: Permitiendo origen no listado: ${origin}`);
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Rate limiting básico
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_REQUESTS = 100;
const MAX_REQUESTS_LOCALHOST = 10000; // Límite mucho más alto para localhost (importaciones masivas)

// Helper para detectar localhost
const isLocalhost = (ip) => {
  return ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';
};

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const maxRequests = isLocalhost(ip) ? MAX_REQUESTS_LOCALHOST : MAX_REQUESTS;
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const data = requestCounts.get(ip);
  
  if (now > data.resetTime) {
    data.count = 1;
    data.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (data.count >= maxRequests) {
    securityLog('warn', 'Rate Limit Exceeded', { ip, count: data.count, maxRequests });
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  data.count++;
  next();
});

// Helper para validar query parameters
const validateQueryParams = (req, allowedParams) => {
  const validated = {};
  for (const param of allowedParams) {
    if (req.query[param] !== undefined) {
      const value = String(req.query[param]).trim();
      // Para csvFolder, permitir backslashes (rutas de Windows)
      // Para otros parámetros, validar que no contenga caracteres peligrosos
      if (param === 'csvFolder') {
        // Solo validar contra caracteres HTML peligrosos, permitir backslash
        if (!/[<>"';]/.test(value)) {
          validated[param] = value;
        }
      } else {
        // Para otros parámetros, incluir backslash en caracteres prohibidos
        if (!/[<>"';\\]/.test(value)) {
          validated[param] = value;
        }
      }
    }
  }
  return validated;
};

// Helper para validar rutas contra path traversal
const validatePath = (inputPath, allowedBasePaths) => {
  const normalized = path.normalize(inputPath);
  const resolved = path.resolve(normalized);
  
  // Verificar que la ruta resuelva a una de las rutas base permitidas
  const isValid = allowedBasePaths.some(basePath => {
    const resolvedBase = path.resolve(basePath);
    return resolved.startsWith(resolvedBase);
  });
  
  if (!isValid) {
    securityLog('warn', 'Path Traversal Attempt', { attemptedPath: inputPath, resolvedPath: resolved });
    return null;
  }
  
  return resolved;
};

// Helper para logging de seguridad
const securityLog = (level, event, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    event,
    ...details
  };
  
  // Log a consola con formato
  const emoji = level === 'error' ? '🔴' : level === 'warn' ? '⚠️' : '🔒';
  console.log(`${emoji} [SECURITY] ${timestamp} - ${event}:`, JSON.stringify(details));
  
  // TODO: Aquí se podría agregar logging a archivo o servicio externo
  // fs.appendFileSync('security.log', JSON.stringify(logEntry) + '\n');
};

// ✅ Servir archivos estáticos del frontend (producción)
const distPath = path.join(__dirname, '../dist');
// Permitir la carpeta `dist` ubicada en la raíz del proyecto (../)
const projectRoot = path.join(__dirname, '..');
// Servir `dist` si existe (evita validaciones que puedan bloquear rutas válidas)
if (fs.existsSync(distPath)) {
  console.log('✅ Sirviendo frontend desde:', distPath);
  app.use(express.static(distPath));
} else {
  console.log('⚠️  Carpeta dist/ no encontrada. Ejecuta: npm run build');
}

// Conectar a SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error conectando a SQLite:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado a SQLite:', DB_PATH);
  
  // Configurar para leer datos frescos del WAL - con callbacks para evitar locks
  db.run('PRAGMA journal_mode=WAL;', (err) => {
    if (err) console.error('⚠️  Error configurando WAL:', err.message);
  });
  db.run('PRAGMA query_only=0;', (err) => {
    if (err) console.error('⚠️  Error configurando query_only:', err.message);
  });
  // Ejecutar checkpoint después de asegurar que el modo WAL está activo
  db.run('PRAGMA busy_timeout=5000;', (err) => {
    if (err) console.error('⚠️  Error configurando busy_timeout:', err.message);
  });
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

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
};

// =====================================================================
// Inicialización - Costos mensuales (ARS/kg)
// =====================================================================

const initCostosMensualesSchema = async () => {
  await dbRun(
    `CREATE TABLE IF NOT EXISTS tb_COSTO_ITEMS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      descripcion TEXT NOT NULL,
      unidad TEXT NOT NULL DEFAULT 'KG',
      activo INTEGER NOT NULL DEFAULT 1
    );`
  );

  await dbRun(
    `CREATE TABLE IF NOT EXISTS tb_COSTO_ITEM_ALIAS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      origen TEXT NOT NULL,
      nombre_en_origen TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES tb_COSTO_ITEMS(id),
      UNIQUE (origen, nombre_en_origen)
    );`
  );

  await dbRun(
    `CREATE TABLE IF NOT EXISTS tb_COSTO_MENSUAL (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      yyyymm TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      ars_por_unidad REAL NOT NULL,
      observaciones TEXT,
      FOREIGN KEY (item_id) REFERENCES tb_COSTO_ITEMS(id),
      UNIQUE (yyyymm, item_id)
    );`
  );

  await dbRun(`CREATE INDEX IF NOT EXISTS idx_costo_mensual_mes ON tb_COSTO_MENSUAL(yyyymm);`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_costo_alias_item ON tb_COSTO_ITEM_ALIAS(item_id);`);
  
  // Agregar columna observaciones si no existe (para DBs existentes)
  try {
    await dbRun(`ALTER TABLE tb_COSTO_MENSUAL ADD COLUMN observaciones TEXT;`);
  } catch (e) {
    // Columna ya existe, ignorar
  }

  // Seed de ítems: ESTOPA_AZUL, URDIDO_TENIDO, TELA_TERMINADA
  await dbRun(
    `INSERT OR IGNORE INTO tb_COSTO_ITEMS (codigo, descripcion, unidad, activo)
     VALUES (?, ?, 'KG', 1);`,
    ['ESTOPA_AZUL', 'Estopa Azul']
  );
  
  await dbRun(
    `INSERT OR IGNORE INTO tb_COSTO_ITEMS (codigo, descripcion, unidad, activo)
     VALUES (?, ?, 'M', 1);`,
    ['URDIDO_TENIDO', 'Urdido Teñido']
  );
  
  // Actualizar unidad de URDIDO_TENIDO si ya existe
  await dbRun(
    `UPDATE tb_COSTO_ITEMS SET unidad = 'M' WHERE codigo = 'URDIDO_TENIDO';`
  );
  
  await dbRun(
    `INSERT OR IGNORE INTO tb_COSTO_ITEMS (codigo, descripcion, unidad, activo)
     VALUES (?, ?, 'M', 1);`,
    ['TELA_TERMINADA', 'Tela Terminada']
  );

  const estopa = await dbGet(`SELECT id FROM tb_COSTO_ITEMS WHERE codigo = ?`, ['ESTOPA_AZUL']);
  if (estopa?.id) {
    await dbRun(
      `INSERT OR IGNORE INTO tb_COSTO_ITEM_ALIAS (item_id, origen, nombre_en_origen)
       VALUES (?, ?, ?);`,
      [estopa.id, 'INDIGO', 'ESTOPA AZUL']
    );
    await dbRun(
      `INSERT OR IGNORE INTO tb_COSTO_ITEM_ALIAS (item_id, origen, nombre_en_origen)
       VALUES (?, ?, ?);`,
      [estopa.id, 'TEJEDURIA', 'ESTOPA AZUL TEJEDURÍA']
    );
  }
  
  // Seed de datos históricos (2023-01 a 2025-12)
  const urdidoId = (await dbGet(`SELECT id FROM tb_COSTO_ITEMS WHERE codigo = ?`, ['URDIDO_TENIDO']))?.id;
  const telaId = (await dbGet(`SELECT id FROM tb_COSTO_ITEMS WHERE codigo = ?`, ['TELA_TERMINADA']))?.id;
  
  if (urdidoId && telaId) {
    const historicos = [
      ['2023-01', urdidoId, 252.48, null],
      ['2023-01', telaId, 506.2, null],
      ['2023-02', urdidoId, 232.86, null],
      ['2023-02', telaId, 454.65, null],
      ['2023-03', urdidoId, 238.34, null],
      ['2023-03', telaId, 456.95, null],
      ['2023-04', urdidoId, 270.19, null],
      ['2023-04', telaId, 512.52, null],
      ['2023-05', urdidoId, 274.91, null],
      ['2023-05', telaId, 544.02, null],
      ['2023-06', urdidoId, 295.43, null],
      ['2023-06', telaId, 625.83, null],
      ['2023-07', urdidoId, 298.85, null],
      ['2023-07', telaId, 610.33, null],
      ['2023-08', urdidoId, 336.77, null],
      ['2023-08', telaId, 651.29, null],
      ['2023-09', urdidoId, 317.75, null],
      ['2023-09', telaId, 656.18, null],
      ['2023-10', urdidoId, 347.79, null],
      ['2023-10', telaId, 715.11, null],
      ['2023-11', urdidoId, 375.5, null],
      ['2023-11', telaId, 743.87, null],
      ['2023-12', urdidoId, 525.53, null],
      ['2023-12', telaId, 1016.41, null],
      ['2024-01', urdidoId, 526.16, null],
      ['2024-01', telaId, 1104.14, null],
      ['2024-02', urdidoId, 531.46, null],
      ['2024-02', telaId, 1077.16, null],
      ['2024-03', urdidoId, 630.99, null],
      ['2024-03', telaId, 1291.66, null],
      ['2024-04', urdidoId, 716.75, null],
      ['2024-04', telaId, 1426.87, null],
      ['2024-05', urdidoId, 697.17, null],
      ['2024-05', telaId, 1504.82, null],
      ['2024-06', urdidoId, 727.22, null],
      ['2024-06', telaId, 1643.52, null],
      ['2024-07', urdidoId, 748.7, null],
      ['2024-07', telaId, 1637.77, null],
      ['2024-08', urdidoId, 797.31, null],
      ['2024-08', telaId, 1777.46, null],
      ['2024-09', urdidoId, 786.14, null],
      ['2024-09', telaId, 1822.38, null],
      ['2024-10', urdidoId, 832.49, null],
      ['2024-10', telaId, 1849.98, null],
      ['2024-11', urdidoId, 833.43, 'Costo de oct-24.'],
      ['2024-11', telaId, 1914.93, 'Costo de oct-24.'],
      ['2024-12', urdidoId, 989.03, null],
      ['2024-12', telaId, 2208.08, null],
      ['2025-01', urdidoId, 1062.57, null],
      ['2025-01', telaId, 2276.66, null],
      ['2025-02', urdidoId, 902.61, null],
      ['2025-02', telaId, 2019.03, null],
      ['2025-03', urdidoId, 871.83, null],
      ['2025-03', telaId, 1940.12, null],
      ['2025-04', urdidoId, 866.25, null],
      ['2025-04', telaId, 1948.84, null],
      ['2025-05', urdidoId, 932.15, null],
      ['2025-05', telaId, 2103.07, null],
      ['2025-06', urdidoId, 932.15, 'Costo de may-25.'],
      ['2025-06', telaId, 2103.07, 'Costo de may-25.'],
      ['2025-07', urdidoId, 1000, null],
      ['2025-07', telaId, 1500, null],
      ['2025-08', urdidoId, 1100, null],
      ['2025-08', telaId, 1600, null],
      ['2025-09', urdidoId, 1300, null],
      ['2025-09', telaId, 1700, null],
      ['2025-10', urdidoId, 1500, null],
      ['2025-10', telaId, 1800, null],
      ['2025-11', urdidoId, 2000, null],
      ['2025-11', telaId, 3000, null],
      ['2025-12', urdidoId, 2500, null],
      ['2025-12', telaId, 3100, null]
    ];
    
    for (const [yyyymm, itemId, valor, obs] of historicos) {
      await dbRun(
        `INSERT OR IGNORE INTO tb_COSTO_MENSUAL (yyyymm, item_id, ars_por_unidad, observaciones)
         VALUES (?, ?, ?, ?);`,
        [yyyymm, itemId, valor, obs]
      );
    }
  }
};

// Ejecutar inicialización después de un breve delay para asegurar que PRAGMA termine
setTimeout(() => {
  initCostosMensualesSchema().catch((err) => {
    console.error('❌ Error inicializando esquema de costos mensuales:', err);
  });
}, 100);

// =====================================================================
// Inicialización - Tabla de auditoría de cambios de esquema
// =====================================================================

const initSchemaChangesLog = async () => {
  await dbRun(
    `CREATE TABLE IF NOT EXISTS schema_changes_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      tabla_destino TEXT NOT NULL,
      tipo_cambio TEXT NOT NULL,
      columna_afectada TEXT NOT NULL,
      tipo_dato TEXT,
      origen TEXT NOT NULL,
      usuario TEXT,
      csv_path TEXT,
      notas TEXT,
      estado TEXT DEFAULT 'APLICADO'
    );`
  );

  await dbRun(`CREATE INDEX IF NOT EXISTS idx_schema_changes_tabla ON schema_changes_log(tabla_destino);`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_schema_changes_timestamp ON schema_changes_log(timestamp);`);
};

// Ejecutar inicialización después de un breve delay para asegurar que PRAGMA termine
setTimeout(() => {
  initSchemaChangesLog().catch((err) => {
    console.error('❌ Error inicializando tabla de auditoría de esquema:', err);
  });
}, 150);

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
    const params = validateQueryParams(req, ['csvFolder']);
    const csvFolder = params.csvFolder || 'C:\\STC';
    const configs = getTableConfig(csvFolder);
    const statusList = [];

    for (const config of configs) {
      let fileStatus = 'UNKNOWN';
      let fileModified = null;
      let lastImport = null;

      // 1. Consultar base de datos primero
      let dbRecord = null;
      try {
        dbRecord = await dbGet(
          `SELECT * FROM import_control WHERE tabla_destino = ?`,
          [config.table]
        );
        if (dbRecord) {
          lastImport = dbRecord;
        }
      } catch (e) {
        console.error(`Error consultando DB para ${config.table}:`, e);
        fileStatus = 'DB_ERROR';
      }

      // 2. Verificar archivo en disco - usar AMBAS fechas (mtime Y birthtime/ctime)
      try {
        // Validar ruta - permitir C:\STC y cualquier subcarpeta
        const validXlsxPath = validatePath(config.xlsxPath, ['C:\\STC', 'C:\\', csvFolder]);
        
        // Intentar leer archivo directamente si validatePath falla pero la ruta parece segura
        let pathToCheck = validXlsxPath || config.xlsxPath;
        
        if (fs.existsSync(pathToCheck)) {
          const stats = fs.statSync(pathToCheck);
          // Usar la fecha más reciente entre mtime (modificación) y ctime (cambio de atributos/descarga)
          const mtime = stats.mtime.getTime();
          const ctime = stats.ctime.getTime();
          const mostRecent = new Date(Math.max(mtime, ctime));
          fileModified = mostRecent.toISOString(); // Fecha más reciente del archivo en disco
          
          // Si tenemos registro en BD, comparar fechas
          if (dbRecord) {
            const lastImportDate = new Date(dbRecord.last_import_date).getTime();
            const diskFileDate = new Date(fileModified).getTime();
            
            // Si el archivo en disco es más nuevo que la última importación, está desactualizado
            if (diskFileDate > lastImportDate + 2000) {
              fileStatus = 'OUTDATED';
            } else {
              fileStatus = 'UP_TO_DATE';
            }
          } else {
            // Archivo existe pero nunca se importó
            fileStatus = 'NOT_IMPORTED';
          }
        } else {
          // Archivo no existe en disco
          if (dbRecord) {
            // Si hay datos importados, usar fecha de BD y marcar como actualizado
            // (el archivo puede haber sido movido/eliminado después de la importación)
            fileModified = dbRecord.xlsx_last_modified; // Usar fecha histórica de la BD
            fileStatus = 'UP_TO_DATE';
          } else {
            // Archivo no existe y nunca se importó
            fileStatus = 'MISSING_FILE';
          }
        }
      } catch (e) {
        // Error al leer archivo
        if (dbRecord) {
          fileModified = dbRecord.xlsx_last_modified; // Usar fecha histórica de la BD
          fileStatus = 'UP_TO_DATE';
        } else {
          fileStatus = 'ERROR_READING_FILE';
          securityLog('error', 'File Read Error', { path: config.xlsxPath, error: e.message });
        }
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

  console.log('🚀 Ejecutando actualización manual...');
  
  execFile('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], (error, stdout, stderr) => {
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
  let csvFolder = req.body.csvFolder || 'C:\\STC';
  // Sanitizar ruta: eliminar barra final si existe para evitar problemas de escape en PowerShell
  if (csvFolder.endsWith('\\')) {
    csvFolder = csvFolder.slice(0, -1);
  }

  // Usar script secuencial optimizado (paralelo no mejora por limitaciones SQLite)
  const scriptPath = path.join(__dirname, 'import-all-fast.ps1');

  console.log(`⚡ Forzando importación completa desde ${csvFolder}...`);

  try {
    const tStart = Date.now();
    // Ejecutar script y esperar resultado
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      execFile('powershell', ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-CsvFolder', csvFolder], 
        { maxBuffer: 50 * 1024 * 1024, timeout: 600000 }, 
        (error, stdout, stderr) => {
          if (error) {
            reject({ error, stderr });
          } else {
            resolve({ stdout, stderr });
          }
        }
      );
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
  const { table, csvFolder } = req.body;
  const rootFolder = csvFolder || 'C:\\STC';
  
  if (!table) {
    return res.status(400).json({ error: 'Debe especificar una tabla' });
  }

  const configs = getTableConfig(rootFolder);
  const config = configs.find(c => c.table === table);
  if (!config) {
    return res.status(404).json({ error: `Tabla ${table} no encontrada en configuración` });
  }

  // Mapeo de scripts específicos para force-table
  const scriptMap = {
    'tb_FICHAS': 'import-fichas-fast.ps1',
    'tb_RESIDUOS_INDIGO': 'import-residuos-indig-fast.ps1',
    'tb_RESIDUOS_POR_SECTOR': 'import-residuos-por-sector-fast.ps1',
    'tb_TESTES': 'import-testes-fast.ps1',
    'tb_PARADAS': 'import-paradas-fast.ps1',
    'tb_PRODUCCION': 'import-produccion-fast.ps1',
    'tb_CALIDAD': 'import-calidad-fast.ps1',
    'tb_PROCESO': 'import-proceso-fast.ps1',
    'tb_DEFECTOS': 'import-defectos-fast.ps1',
    'tb_CALIDAD_FIBRA': 'import-calidad-fibra-fast.ps1',
    'tb_PRODUCCION_OE': 'import-produccion-oe-fast.ps1'
  };

  const scriptFile = scriptMap[table] || 'import-calidad-fast.ps1';
  const scriptPath = path.join(__dirname, scriptFile);

  console.log(`⚡ Forzando importación de ${table} desde ${config.xlsxPath}...`);
  
  try {
    // Convertir exec a Promise
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      const scriptArgs = [
        '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', 
        '-File', scriptPath, 
        '-XlsxPath', config.xlsxPath, 
        '-DbPath', DB_PATH
      ];
      
      // Solo agregar -Sheet si la tabla no es tb_PRODUCCION_OE (no tiene ese parámetro)
      if (table !== 'tb_PRODUCCION_OE' && config.sheet) {
        scriptArgs.push('-Sheet', config.sheet);
      }
      
      console.log(`🔧 Ejecutando:`, 'powershell', scriptArgs.join(' '));
      
      execFile('powershell', scriptArgs,
        { maxBuffer: 50 * 1024 * 1024, timeout: 300000 }, 
        (error, stdout, stderr) => {
          if (error) {
            reject({ error, stderr, stdout });
          } else {
            resolve({ stdout, stderr });
          }
        }
      );
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
    console.error(`❌ Error ejecutando script para ${table}:`);
    console.error(`  Error object:`, err.error || err);
    console.error(`  Stderr:`, err.stderr || '(vacío)');
    console.error(`  Stack:`, err.error?.stack || err.stack || '(no stack trace)');
    
    const errorMessage = err.error?.message || err.stderr || err.message || 'Error desconocido en importación';
    const errorDetails = {
      error: errorMessage,
      table: table,
      scriptPath: scriptPath,
      stderr: err.stderr || null
    };
    
    console.error(`📤 Respondiendo error al frontend:`, errorDetails);
    res.status(500).json(errorDetails);
  }
});

// POST /api/system/pick-folder - Abrir diálogo de selección de carpeta
app.post('/api/system/pick-folder', (req, res) => {
  // Comando PowerShell para abrir FolderBrowserDialog
  // Requiere modo STA (-sta) para diálogos de Windows Forms
  const command = `powershell -NoProfile -Sta -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Seleccione la carpeta de archivos CSV'; $f.ShowNewFolderButton = $false; if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath }"`;
  
  console.log('📂 Abriendo diálogo de selección de carpeta...');
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error abriendo diálogo: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    
    const selectedPath = stdout.trim();
    console.log(`📂 Carpeta seleccionada: ${selectedPath || '(Cancelado)'}`);
    
    if (selectedPath) {
      res.json({ path: selectedPath });
    } else {
      res.json({ path: null }); // Usuario canceló
    }
  });
});

// POST /api/import/update-outdated - Actualizar solo tablas desactualizadas
app.post('/api/import/update-outdated', async (req, res) => {
  const { tables, csvFolder } = req.body;
  const rootFolder = csvFolder || 'C:\\STC';
  
  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    return res.status(400).json({ error: 'Debe especificar un array de tablas' });
  }

  console.log(`🔄 Iniciando actualización de ${tables.length} tabla(s) desde ${rootFolder}: ${tables.join(', ')}`);
  
  const tStart = Date.now();
  const results = [];
  const errors = [];
  const configs = getTableConfig(rootFolder);
  
  // Mapeo de scripts específicos
  const scriptMap = {
    'tb_FICHAS': 'import-fichas-fast.ps1',
    'tb_RESIDUOS_INDIGO': 'import-residuos-indig-fast.ps1',
    'tb_RESIDUOS_POR_SECTOR': 'import-residuos-por-sector-fast.ps1',
    'tb_TESTES': 'import-testes-fast.ps1',
    'tb_PARADAS': 'import-paradas-fast.ps1',
    'tb_PRODUCCION': 'import-produccion-fast.ps1',
    'tb_CALIDAD': 'import-calidad-fast.ps1',
    'tb_PROCESO': 'import-proceso-fast.ps1',
    'tb_DEFECTOS': 'import-defectos-fast.ps1',
    'tb_CALIDAD_FIBRA': 'import-calidad-fibra-fast.ps1',
    'tb_PRODUCCION_OE': 'import-produccion-oe-fast.ps1'
  };

  // Importar cada tabla secuencialmente (SQLite no beneficia de paralelización)
  for (const table of tables) {
    const config = configs.find(c => c.table === table);
    if (!config) {
      errors.push({ table, error: 'Tabla no encontrada en configuración' });
      continue;
    }

    // Usar script específico o fallback al genérico
    const scriptFile = scriptMap[table] || 'import-calidad-fast.ps1';
    const scriptPath = path.join(__dirname, scriptFile);

    console.log(`  ⚡ Importando ${table} desde ${config.xlsxPath} usando ${scriptFile}...`);
    
    const t0 = Date.now();
    try {
      const { stdout, stderr } = await new Promise((resolve, reject) => {
        execFile('powershell',
          ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath,
           '-XlsxPath', config.xlsxPath, '-SqlitePath', DB_PATH, '-Sheet', config.sheet],
          { maxBuffer: 50 * 1024 * 1024, timeout: 300000 },
          (error, stdout, stderr) => {
            if (error) {
              reject({ error, stderr });
            } else {
              resolve({ stdout, stderr });
            }
          }
        );
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

// GET /api/import/column-warnings - Obtener warnings de columnas recientes (solo pendientes)
app.get('/api/import/column-warnings', async (req, res) => {
  try {
    // Verificar si la tabla existe
    const tableExists = await dbGet(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='import_column_warnings'`
    );
    
    if (!tableExists) {
      return res.json({ warnings: [] });
    }
    
    // Obtener los últimos 20 warnings, agrupados por tabla
    const warnings = await dbAll(
      `SELECT 
        id,
        tabla_destino,
        timestamp,
        csv_path,
        extra_columns,
        missing_columns,
        total_csv_columns,
        total_table_columns
      FROM import_column_warnings
      ORDER BY timestamp DESC
      LIMIT 20`
    );
    
    // Procesar y verificar estado actual de las columnas
    const processed = [];
    
    for (const w of warnings) {
      const extraCols = w.extra_columns ? w.extra_columns.split(', ') : [];
      const missingCols = w.missing_columns ? w.missing_columns.split(', ') : [];
      
      // Obtener columnas actuales de la tabla en SQLite
      let currentColumns = [];
      try {
        const tableInfo = await dbAll(`PRAGMA table_info(${w.tabla_destino})`);
        currentColumns = tableInfo.map(col => col.name);
      } catch (err) {
        console.error(`Error obteniendo info de ${w.tabla_destino}:`, err);
      }
      
      // Función para normalizar nombres (eliminar caracteres especiales corruptos)
      const normalize = (name) => {
        return name
          .replace(/[^\x20-\x7E]/g, '') // Mantener solo caracteres ASCII imprimibles
          .replace(/[^A-Z0-9_\s]/gi, '') // Mantener solo letras, números, guiones bajos y espacios
          .replace(/\s+/g, '')           // Eliminar todos los espacios
          .toUpperCase();
      };
      
      const normalizedCurrentColumns = currentColumns.map(normalize);
      
      // Filtrar columnas EXTRA que ya NO están en SQLite (fueron sincronizadas)
      // Usar comparación normalizada para detectar variantes con encoding corrupto
      const stillExtraColumns = extraCols.filter(col => {
        const normalizedCol = normalize(col);
        return !normalizedCurrentColumns.includes(normalizedCol);
      });
      
      // Solo agregar warning si todavía hay diferencias pendientes
      const hasPendingDifferences = stillExtraColumns.length > 0;
      
      if (hasPendingDifferences) {
        processed.push({
          id: w.id,
          table: w.tabla_destino,
          timestamp: w.timestamp,
          csvPath: w.csv_path,
          extraColumns: stillExtraColumns, // Solo las que faltan sincronizar
          missingColumns: missingCols,
          totalCsvColumns: w.total_csv_columns,
          totalTableColumns: currentColumns.length, // Usar conteo actual
          hasDifferences: true
        });
      }
    }
    
    // Solo enviar warnings de las últimas 24 horas
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentWarnings = processed.filter(w => {
      const warnDate = new Date(w.timestamp);
      return warnDate > oneDayAgo;
    });
    
    res.json({ warnings: recentWarnings });
  } catch (error) {
    console.error('Error obteniendo column warnings:', error);
    res.status(500).json({ error: error.message, warnings: [] });
  }
});

// GET /api/import/warnings-history - Obtener historial completo de diferencias detectadas
app.get('/api/import/warnings-history', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['table', 'limit']);
    const table = params.table;
    const limit = params.limit ? parseInt(params.limit) : 100;
    
    // Verificar si la tabla existe
    const tableExists = await dbGet(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='import_column_warnings'`
    );
    
    if (!tableExists) {
      return res.json({ history: [] });
    }
    
    let sql = `SELECT 
      id,
      tabla_destino as table_name,
      timestamp as detected_at,
      csv_path,
      extra_columns,
      missing_columns,
      total_csv_columns,
      total_table_columns
    FROM import_column_warnings`;
    
    const sqlParams = [];
    
    if (table) {
      sql += ` WHERE tabla_destino = ?`;
      sqlParams.push(table);
    }
    
    sql += ` ORDER BY timestamp DESC LIMIT ?`;
    sqlParams.push(limit);
    
    const warnings = await dbAll(sql, sqlParams);
    
    // Procesar para enviar al frontend
    const processed = warnings.map(w => ({
      id: w.id,
      table_name: w.table_name,
      detected_at: w.detected_at,
      csv_path: w.csv_path,
      extra_columns: w.extra_columns ? w.extra_columns.split(', ') : [],
      missing_columns: w.missing_columns ? w.missing_columns.split(', ') : [],
      total_csv_columns: w.total_csv_columns,
      total_table_columns: w.total_table_columns
    }));
    
    res.json({ history: processed });
  } catch (error) {
    console.error('Error obteniendo historial de warnings:', error);
    res.status(500).json({ error: error.message, history: [] });
  }
});

// POST /api/schema/sync-columns - Sincronizar columnas de CSV a SQLite
app.post('/api/schema/sync-columns', async (req, res) => {
  const { table, csvPath, reimport } = req.body;
  
  if (!table || !csvPath) {
    return res.status(400).json({ error: 'Debe especificar table y csvPath' });
  }

  console.log(`🔄 Sincronizando columnas para ${table} desde ${csvPath}...`);

  try {
    // 1. Leer columnas del CSV
    let csvColumns = [];
    try {
      const firstLine = fs.readFileSync(csvPath, 'utf8').split('\n')[0];
      const isTab = firstLine.includes('\t');
      csvColumns = isTab 
        ? firstLine.split('\t').map(c => c.trim())
        : firstLine.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      csvColumns = csvColumns.filter(c => c !== '');
    } catch (err) {
      return res.status(400).json({ error: `Error leyendo CSV: ${err.message}` });
    }

    // 2. Leer columnas de SQLite
    const sqliteColumnsRaw = await dbAll(`PRAGMA table_info(${table});`);
    const sqliteColumns = sqliteColumnsRaw.map(col => col.name);

    // 3. Comparar
    const extraColumns = csvColumns.filter(c => !sqliteColumns.includes(c));
    const missingColumns = sqliteColumns.filter(c => !csvColumns.includes(c));

    if (extraColumns.length === 0) {
      return res.json({
        success: true,
        message: 'No hay columnas extra para sincronizar',
        extraColumns: [],
        missingColumns,
        columnsAdded: 0
      });
    }

    // 4. Agregar columnas extra a SQLite
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const addedColumns = [];
    const errors = [];

    for (const col of extraColumns) {
      try {
        // Evitar duplicados de columnas con el mismo nombre
        if (addedColumns.includes(col)) {
          console.warn(`⚠️ Columna duplicada ignorada: ${col}`);
          continue;
        }

        const safeColName = col.replace(/'/g, "''");
        await dbRun(`ALTER TABLE ${table} ADD COLUMN '${safeColName}' TEXT;`);
        addedColumns.push(col);

        // Registrar en auditoría
        await dbRun(
          `INSERT INTO schema_changes_log 
           (timestamp, tabla_destino, tipo_cambio, columna_afectada, tipo_dato, origen, csv_path, notas, estado)
           VALUES (?, ?, 'ADD_COLUMN', ?, 'TEXT', 'UI', ?, ?, 'APLICADO');`,
          [
            timestamp,
            table,
            col,
            csvPath,
            `Sincronización automática desde UI. Total columnas CSV: ${csvColumns.length}, SQLite antes: ${sqliteColumns.length}`
          ]
        );

        console.log(`✅ Columna agregada: ${col}`);
      } catch (err) {
        console.error(`❌ Error agregando columna ${col}:`, err.message);
        errors.push({ column: col, error: err.message });
      }
    }

    // 5. Re-importar si se solicitó
    let reimportResult = null;
    if (reimport && addedColumns.length > 0) {
      console.log(`🔄 Re-importando ${table}...`);
      
      const scriptMap = {
        'tb_FICHAS': 'import-fichas-fast.ps1',
        'tb_RESIDUOS_INDIGO': 'import-residuos-indig-fast.ps1',
        'tb_RESIDUOS_POR_SECTOR': 'import-residuos-por-sector-fast.ps1',
        'tb_TESTES': 'import-testes-fast.ps1',
        'tb_PARADAS': 'import-paradas-fast.ps1',
        'tb_PRODUCCION': 'import-produccion-fast.ps1',
        'tb_CALIDAD': 'import-calidad-fast.ps1',
        'tb_PROCESO': 'import-proceso-fast.ps1',
        'tb_DEFECTOS': 'import-defectos-fast.ps1',
        'tb_CALIDAD_FIBRA': 'import-calidad-fibra-fast.ps1',
        'tb_PRODUCCION_OE': 'import-produccion-oe-fast.ps1'
      };

      const scriptFile = scriptMap[table];
      if (scriptFile) {
        const scriptPath = path.join(__dirname, scriptFile);
        try {
          const { stdout, stderr } = await new Promise((resolve, reject) => {
            execFile('powershell',
              ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath,
               '-XlsxPath', csvPath, '-SqlitePath', DB_PATH],
              { maxBuffer: 50 * 1024 * 1024, timeout: 300000 },
              (error, stdout, stderr) => {
                if (error) reject({ error, stderr });
                else resolve({ stdout, stderr });
              }
            );
          });
          reimportResult = { success: true, output: stdout };
          console.log(`✅ Re-importación completada`);
        } catch (err) {
          reimportResult = { success: false, error: err.error?.message || 'Error en re-importación' };
          console.error(`❌ Error en re-importación:`, err);
        }
      }
    }

    // 6. Checkpoint SQLite
    await new Promise((resolve) => {
      db.run('PRAGMA wal_checkpoint(FULL);', () => resolve());
    });

    res.json({
      success: true,
      message: `${addedColumns.length} columna(s) agregada(s) correctamente`,
      extraColumns,
      missingColumns,
      columnsAdded: addedColumns.length,
      addedColumns,
      errors,
      reimportResult
    });

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schema/changes-log - Obtener historial de cambios de esquema
app.get('/api/schema/changes-log', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['table', 'limit']);
    const table = params.table;
    const limit = params.limit ? parseInt(params.limit) : 100;

    // Verificar si la tabla existe
    const tableExists = await dbGet(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_changes_log'`
    );
    
    if (!tableExists) {
      return res.json({ changes: [] });
    }

    let sql = `SELECT 
      id,
      tabla_destino as table_name,
      timestamp as applied_at,
      tipo_cambio as change_type,
      columna_afectada as column_name,
      tipo_dato as data_type,
      origen as source,
      notas as notes,
      estado as status
    FROM schema_changes_log`;
    const sqlParams = [];

    if (table) {
      sql += ` WHERE tabla_destino = ?`;
      sqlParams.push(table);
    }

    sql += ` ORDER BY timestamp DESC LIMIT ?`;
    sqlParams.push(limit);

    const changes = await dbAll(sql, sqlParams);
    
    // Agrupar por sincronización (tabla + timestamp similar)
    const grouped = [];
    const processedSyncs = new Set();
    
    for (const change of changes) {
      const syncKey = `${change.table_name}_${change.applied_at.substring(0, 16)}`; // Agrupar por minuto
      
      if (!processedSyncs.has(syncKey)) {
        processedSyncs.add(syncKey);
        
        // Buscar todas las columnas de esta sincronización
        const relatedChanges = changes.filter(c => 
          c.table_name === change.table_name && 
          c.applied_at.substring(0, 16) === change.applied_at.substring(0, 16)
        );
        
        const columnsAdded = relatedChanges.map(c => c.column_name);
        const reimported = relatedChanges.some(c => c.notes && c.notes.includes('Re-importación'));
        
        grouped.push({
          id: change.id,
          table_name: change.table_name,
          applied_at: change.applied_at,
          change_type: change.change_type,
          columns_added: columnsAdded,
          reimported: reimported,
          source: change.source,
          status: change.status
        });
      }
    }

    res.json({ changes: grouped });
  } catch (error) {
    console.error('Error obteniendo historial de cambios:', error);
    res.status(500).json({ error: error.message, changes: [] });
  }
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

// =====================================================================
// ENDPOINTS - Costos mensuales (ARS/kg)
// =====================================================================

// GET /api/costos/items - Catálogo de ítems + alias
app.get('/api/costos/items', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT
         i.id as item_id,
         i.codigo,
         i.descripcion,
         i.unidad,
         i.activo,
         a.id as alias_id,
         a.origen,
         a.nombre_en_origen
       FROM tb_COSTO_ITEMS i
       LEFT JOIN tb_COSTO_ITEM_ALIAS a ON a.item_id = i.id
       ORDER BY i.descripcion, a.origen, a.nombre_en_origen;`
    );

    const byItemId = new Map();
    for (const row of rows) {
      if (!byItemId.has(row.item_id)) {
        byItemId.set(row.item_id, {
          id: row.item_id,
          codigo: row.codigo,
          descripcion: row.descripcion,
          unidad: row.unidad,
          activo: row.activo === 1,
          aliases: []
        });
      }
      if (row.alias_id) {
        byItemId.get(row.item_id).aliases.push({
          id: row.alias_id,
          origen: row.origen,
          nombre_en_origen: row.nombre_en_origen
        });
      }
    }

    res.json({ items: Array.from(byItemId.values()) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/costos/mensual - Costos de múltiples meses (últimos N meses o rango)
app.get('/api/costos/mensual', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['limite']);
    const limite = parseInt(params.limite) || 24; // Por defecto últimos 24 meses
    
    const rows = await dbAll(
      `WITH MesesUnicos AS (
         SELECT DISTINCT yyyymm FROM tb_COSTO_MENSUAL
         ORDER BY yyyymm DESC
         LIMIT ?
       )
       SELECT
         mu.yyyymm,
         i.id as item_id,
         i.codigo,
         i.descripcion,
         i.unidad,
         cm.ars_por_unidad,
         cm.observaciones
       FROM MesesUnicos mu
       CROSS JOIN tb_COSTO_ITEMS i
       LEFT JOIN tb_COSTO_MENSUAL cm
         ON cm.item_id = i.id AND cm.yyyymm = mu.yyyymm
       WHERE i.activo = 1
       ORDER BY mu.yyyymm DESC, i.descripcion;`,
      [limite]
    );

    res.json({ rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/costos/mensual - Upsert masivo de múltiples meses/ítems
app.put('/api/costos/mensual', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;

    if (!rows) {
      return res.status(400).json({ error: 'Campo rows inválido. Debe ser un array.' });
    }

    await dbRun('BEGIN;');
    let upserts = 0;
    let deletes = 0;

    for (const row of rows) {
      const yyyymm = String(row?.yyyymm || '').trim();
      const itemId = Number(row?.item_id);
      const rawValue = row?.ars_por_unidad;
      const obs = row?.observaciones || null;

      if (!/^\d{4}-\d{2}$/.test(yyyymm)) {
        throw new Error(`yyyymm inválido: ${yyyymm}`);
      }
      if (!Number.isFinite(itemId) || itemId <= 0) {
        throw new Error('rows contiene item_id inválido');
      }

      // Si viene vacío/null => borrar para ese mes/ítem
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        await dbRun(`DELETE FROM tb_COSTO_MENSUAL WHERE yyyymm = ? AND item_id = ?;`, [yyyymm, itemId]);
        deletes += 1;
        continue;
      }

      const value = Number(rawValue);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error('rows contiene ars_por_unidad inválido');
      }

      await dbRun(
        `INSERT INTO tb_COSTO_MENSUAL (yyyymm, item_id, ars_por_unidad, observaciones)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(yyyymm, item_id)
         DO UPDATE SET ars_por_unidad = excluded.ars_por_unidad, observaciones = excluded.observaciones;`,
        [yyyymm, itemId, value, obs]
      );
      upserts += 1;
    }

    await dbRun('COMMIT;');
    res.json({ success: true, upserts, deletes });
  } catch (error) {
    try {
      await dbRun('ROLLBACK;');
    } catch (_) {
      // ignore
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/produccion - Listar producción con paginación
app.get('/api/produccion', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['page', 'limit', 'startDate', 'endDate']);
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 50;
    const offset = (page - 1) * limit;
    
    const dateRange = getDateRangeParams(params.startDate, params.endDate);
    
    let whereClause = '';
    let queryParams = [];
    
    if (dateRange) {
      whereClause = 'WHERE DT_BASE_PRODUCAO BETWEEN ? AND ?';
      queryParams = [dateRange.start, dateRange.end];
    }
    
    const data = await dbAll(
      `SELECT * FROM tb_PRODUCCION ${whereClause} 
       ORDER BY DT_BASE_PRODUCAO DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
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
    const params = validateQueryParams(req, ['startDate', 'endDate']);
    const dateRange = getDateRangeParams(params.startDate, params.endDate);
    
    let whereClause = '';
    let queryParams = [];
    
    if (dateRange) {
      whereClause = 'WHERE DT_BASE_PRODUCAO BETWEEN ? AND ?';
      queryParams = [dateRange.start, dateRange.end];
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
      queryParams
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
    const params = validateQueryParams(req, ['page', 'limit', 'startDate', 'endDate']);
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 50;
    const offset = (page - 1) * limit;
    
    const dateRange = getDateRangeParams(params.startDate, params.endDate);
    
    let whereClause = '';
    let queryParams = [];
    
    if (dateRange) {
      whereClause = 'WHERE DAT_PROD BETWEEN ? AND ?';
      queryParams = [dateRange.start, dateRange.end];
    }
    
    const data = await dbAll(
      `SELECT * FROM tb_CALIDAD ${whereClause} 
       ORDER BY DAT_PROD DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
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
    const params = validateQueryParams(req, ['startDate', 'endDate', 'tramas']);
    const dateRange = getDateRangeParams(params.startDate, params.endDate);
    const tramas = params.tramas || 'Todas'; // Todas, ALG 100%, P + E, POL 100%

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
    const params = validateQueryParams(req, ['startDate', 'endDate', 'revisor', 'tramas']);
    const dateRange = getDateRangeParams(params.startDate, params.endDate);
    const revisor = params.revisor;
    const tramas = params.tramas || 'Todas';

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
    const params = validateQueryParams(req, ['fecha', 'partida', 'revisor']);
    const fecha = params.fecha;
    const partida = params.partida;
    const revisor = params.revisor;

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

// GET /api/calidad/defectos-detalle - Consulta detallada de defectos por etiqueta en tb_DEFECTOS
app.get('/api/calidad/defectos-detalle', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['etiqueta']);
    const etiqueta = params.etiqueta?.trim();

    console.log(`🔍 [API] Consultando defectos para etiqueta: "${etiqueta}" (length: ${etiqueta?.length})`);

    if (!etiqueta) {
      return res.status(400).json({ error: 'Se requiere la etiqueta' });
    }

    // Primero verificamos si existe en la tabla
    const checkSql = `SELECT COUNT(*) as count FROM tb_DEFECTOS WHERE trim(ETIQUETA) = ?`;
    const checkResult = await dbGet(checkSql, [etiqueta]);
    console.log(`📊 [API] Registros encontrados con trim(): ${checkResult.count}`);

    // Consulta principal
    const sql = `
      SELECT
        PARTIDA,
        PECA,
        ETIQUETA,
        COD_DEF,
        DESC_DEFEITO,
        PONTOS,
        QUALIDADE,
        DATA_PROD
      FROM tb_DEFECTOS
      WHERE trim(ETIQUETA) = trim(?)
      ORDER BY PECA ASC, COD_DEF ASC
    `;

    const rows = await dbAll(sql, [etiqueta]);
    console.log(`📊 [API] Defectos retornados para ${etiqueta}: ${rows.length}`);
    
    if (rows.length === 0) {
      // Debug: mostrar algunas etiquetas de ejemplo
      const sampleSql = `SELECT DISTINCT quote(ETIQUETA) as etiq FROM tb_DEFECTOS LIMIT 5`;
      const samples = await dbAll(sampleSql);
      console.log(`🔍 [API] Ejemplos de etiquetas en tb_DEFECTOS:`, samples.map(s => s.etiq).join(', '));
    }
    
    res.json(rows);

  } catch (error) {
    console.error('❌ [API] Error en defectos-detalle:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/test/produccion-partida - TEST: Ver datos raw de producción para una partida
app.get('/api/test/produccion-partida', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['partida']);
    const partida = params.partida || '1541315';
    
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
    const params = validateQueryParams(req, ['page', 'limit', 'startDate', 'endDate']);
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 50;
    const offset = (page - 1) * limit;
    
    const dateRange = getDateRangeParams(params.startDate, params.endDate);
    
    let whereClause = '';
    let queryParams = [];
    
    if (dateRange) {
      whereClause = 'WHERE DATA_BASE BETWEEN ? AND ?';
      queryParams = [dateRange.start, dateRange.end];
    }
    
    const data = await dbAll(
      `SELECT * FROM tb_PARADAS ${whereClause} 
       ORDER BY DATA_BASE DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
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
    const params = validateQueryParams(req, ['startDate', 'endDate']);
    const dateRange = getDateRangeParams(params.startDate, params.endDate);
    
    let whereClause = '';
    let queryParams = [];
    
    if (dateRange) {
      whereClause = 'WHERE DATA_BASE BETWEEN ? AND ?';
      queryParams = [dateRange.start, dateRange.end];
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
      queryParams
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
    const params = validateQueryParams(req, ['search']);
    const search = params.search;
    
    let whereClause = '';
    let queryParams = [];
    
    if (search) {
      whereClause = `WHERE [ARTIGO CODIGO] LIKE ? OR ARTIGO LIKE ? OR COR LIKE ?`;
      queryParams = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    
    const data = await dbAll(
      `SELECT * FROM tb_FICHAS ${whereClause} 
       ORDER BY [ARTIGO CODIGO]
       LIMIT 100`,
      queryParams
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
    const params = validateQueryParams(req, ['page', 'limit']);
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 50;
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
// ENDPOINTS - METAS
// =====================================================================

// GET /api/metas - Obtener metas de un mes específico
app.get('/api/metas', async (req, res) => {
  try {
    const { mes, año } = req.query;
    
    if (!mes || !año) {
      return res.status(400).json({ error: 'Se requieren parámetros mes y año' });
    }
    
    // Construir rango de fechas
    const fechaInicio = `${año}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(parseInt(año), parseInt(mes), 0).getDate();
    const fechaFin = `${año}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    
    const data = await dbAll(
      `SELECT * FROM tb_METAS 
       WHERE Dia >= ? AND Dia <= ?
       ORDER BY Dia ASC`,
      [fechaInicio, fechaFin]
    );
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/metas/:fecha - Obtener meta de una fecha específica
app.get('/api/metas/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params;
    
    const data = await dbGet(
      `SELECT * FROM tb_METAS WHERE Dia = ?`,
      [fecha]
    );
    
    if (!data) {
      return res.status(404).json({ error: 'Meta no encontrada para esta fecha' });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/metas - Guardar/actualizar metas (batch)
app.post('/api/metas', async (req, res) => {
  try {
    const metas = req.body;
    
    if (!Array.isArray(metas) || metas.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de metas' });
    }
    
    let insertados = 0;
    let actualizados = 0;
    
    for (const meta of metas) {
      const existente = await dbGet(
        `SELECT id FROM tb_METAS WHERE Dia = ?`,
        [meta.Dia]
      );
      
      if (existente) {
        // Actualizar
        await dbRun(
          `UPDATE tb_METAS SET
            Indigo = ?,
            Meta_Eficiencia_INDIGO = ?,
            Meta_Rotura_INDIGO = ?,
            Meta_Estopa_Azul = ?,
            Tejeduria = ?,
            RU105 = ?,
            RT105 = ?,
            EFI_Percent = ?,
            Meta_Estopa_Azul_Tejeduria = ?,
            Integrada = ?,
            Meta_Velocidad_Integrada = ?,
            Meta_ENC_URD_Integrada = ?,
            Revision = ?,
            Dia_Invertido = ?
           WHERE Dia = ?`,
          [
            meta.Indigo,
            meta.Meta_Eficiencia_INDIGO,
            meta.Meta_Rotura_INDIGO,
            meta.Meta_Estopa_Azul,
            meta.Tejeduria,
            meta.RU105,
            meta.RT105,
            meta.EFI_Percent,
            meta.Meta_Estopa_Azul_Tejeduria || meta.Meta_Estopa_Azul,
            meta.Integrada,
            meta.Meta_Velocidad_Integrada,
            meta.Meta_ENC_URD_Integrada,
            meta.Revision,
            meta.Dia_Invertido,
            meta.Dia
          ]
        );
        actualizados++;
      } else {
        // Insertar
        await dbRun(
          `INSERT INTO tb_METAS (
            Dia, Indigo, Meta_Eficiencia_INDIGO, Meta_Rotura_INDIGO, Meta_Estopa_Azul,
            Tejeduria, RU105, RT105, EFI_Percent, Meta_Estopa_Azul_Tejeduria,
            Integrada, Meta_Velocidad_Integrada, Meta_ENC_URD_Integrada,
            Revision, Dia_Invertido
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            meta.Dia,
            meta.Indigo,
            meta.Meta_Eficiencia_INDIGO,
            meta.Meta_Rotura_INDIGO,
            meta.Meta_Estopa_Azul,
            meta.Tejeduria,
            meta.RU105,
            meta.RT105,
            meta.EFI_Percent,
            meta.Meta_Estopa_Azul_Tejeduria || meta.Meta_Estopa_Azul,
            meta.Integrada,
            meta.Meta_Velocidad_Integrada,
            meta.Meta_ENC_URD_Integrada,
            meta.Revision,
            meta.Dia_Invertido
          ]
        );
        insertados++;
      }
    }
    
    res.json({ 
      success: true, 
      insertados, 
      actualizados,
      total: insertados + actualizados
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/metas/:fecha - Eliminar meta de una fecha específica
app.delete('/api/metas/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params;
    
    const result = await dbRun(
      `DELETE FROM tb_METAS WHERE Dia = ?`,
      [fecha]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Meta no encontrada para esta fecha' });
    }
    
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/metas/resumen/:fecha - Obtener meta del día y acumulado del mes
app.get('/api/metas/resumen/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params;
    
    // Extraer año y mes de la fecha
    const [year, month] = fecha.split('-');
    const monthStart = `${year}-${month}-01`;
    
    // Meta del día específico
    const metaDia = await dbGet(
      `SELECT Revision FROM tb_METAS WHERE Dia = ?`,
      [fecha]
    );
    
    // Acumulado del mes hasta la fecha
    const metaMes = await dbGet(
      `SELECT SUM(Revision) as total FROM tb_METAS 
       WHERE Dia >= ? AND Dia <= ?`,
      [monthStart, fecha]
    );
    
    res.json({
      day: metaDia ? (metaDia.Revision || 0) : 0,
      month: metaMes ? (metaMes.total || 0) : 0,
      fecha: fecha
    });
  } catch (error) {
    console.error('Error en /api/metas/resumen/:fecha:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calidad-fibra/resumen - Resumen de análisis HVI agrupado por mezcla
app.get('/api/calidad-fibra/resumen', async (req, res) => {
  try {
    const sql = `
      SELECT 
        CAST(CAST(MISTURA AS INTEGER) AS TEXT) as MISTURA,
        CAST(CAST(LOTE_FIAC AS INTEGER) AS TEXT) as LOTE_FIAC,
        MIN(DT_ENTRADA_PROD) as fecha_ingreso,
        MIN(HR_ENTRADA_PROD) as hora_ingreso,
        ROUND(AVG(SCI), 2) as sci_avg,
        ROUND(AVG(MST), 2) as mst_avg,
        ROUND(AVG(MIC), 2) as mic_avg,
        ROUND(AVG(MAT), 2) as mat_avg,
        ROUND(AVG(UHML), 2) as uhml_avg,
        ROUND(AVG(UI), 2) as ui_avg,
        ROUND(AVG(SF), 2) as sf_avg,
        ROUND(AVG(STR), 2) as str_avg,
        ROUND(AVG(ELG), 2) as elg_avg,
        ROUND(AVG(RD), 2) as rd_avg,
        ROUND(AVG(PLUS_B), 2) as plus_b_avg,
        ROUND(AVG(TrCNT), 2) as trcnt_avg,
        ROUND(AVG(TrAR), 2) as trar_avg,
        ROUND(AVG(TRID), 2) as trid_avg,
        ROUND((SUM(CASE WHEN COR='BCO' THEN PESO ELSE 0 END) * 100.0 / NULLIF(SUM(PESO), 0)), 2) as color_bco_pct,
        ROUND((SUM(CASE WHEN COR='GRI' THEN PESO ELSE 0 END) * 100.0 / NULLIF(SUM(PESO), 0)), 2) as color_gri_pct,
        ROUND((SUM(CASE WHEN COR='LG' THEN PESO ELSE 0 END) * 100.0 / NULLIF(SUM(PESO), 0)), 2) as color_lg_pct,
        ROUND((SUM(CASE WHEN COR='AMA' THEN PESO ELSE 0 END) * 100.0 / NULLIF(SUM(PESO), 0)), 2) as color_ama_pct,
        ROUND((SUM(CASE WHEN COR='LA' THEN PESO ELSE 0 END) * 100.0 / NULLIF(SUM(PESO), 0)), 2) as color_la_pct,
        CAST(SUM(QTDE) AS INTEGER) as fardos_total,
        ROUND(SUM(PESO), 2) as peso_total_kg,
        COUNT(DISTINCT SEQ) as seq_count
      FROM tb_CALIDAD_FIBRA
      WHERE MISTURA IS NOT NULL AND MISTURA != ''
        AND TIPO_MOV = 'MIST'
      GROUP BY MISTURA, LOTE_FIAC
      ORDER BY CAST(MISTURA AS INTEGER) ASC, CAST(LOTE_FIAC AS INTEGER) ASC
    `;
    
    const rows = await dbAll(sql);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/calidad-fibra/resumen:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calidad/pts100m2 - Calcular puntos por 100m² (Pts 100²)
app.get('/api/calidad/pts100m2', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['date', 'monthStart', 'monthEnd']);
    const { date, monthStart, monthEnd } = params;

    if (!date) {
      return res.status(400).json({ error: 'Se requiere parámetro "date" (formato YYYY-MM-DD)' });
    }

    const datePattern = date.split('T')[0];
    const [year, month] = datePattern.split('-');
    const mesInicio = monthStart || `${year}-${month}-01`;
    const mesFin = monthEnd || datePattern;

    console.log(`🎯 Calculando Pts 100m² para fecha: ${datePattern}, mes: ${mesInicio} a ${mesFin}`);

    // Consulta para el día específico
    // Nota: LARGURA puede venir en formato europeo (sin decimales: 148, 165) o con punto decimal (165.16)
    // Para evitar errores, usamos CASE para detectar el formato correcto:
    // - Si contiene punto Y la parte antes del punto es < 4 dígitos, es decimal americano → usar directamente
    // - Si no contiene punto o coma, es entero → usar directamente
    // - Si contiene coma, es decimal europeo → reemplazar coma por punto
    const sqlDia = `
      WITH PTS AS (
        SELECT 
          DATE(DAT_PROD) AS FECHA,
          SUM(PONTUACAO_AVG) AS PONTUACAO
        FROM (
          SELECT DISTINCT
            EMP,
            DATE(DAT_PROD) AS DAT_PROD,
            QUALIDADE,
            PEÇA,
            AVG(CAST(REPLACE(REPLACE(PONTUACAO, '.', ''), ',', '.') AS REAL)) AS PONTUACAO_AVG
          FROM tb_CALIDAD
          WHERE DATE(DAT_PROD) = DATE(?)
            AND QUALIDADE = 'PRIMEIRA '
          GROUP BY EMP, DATE(DAT_PROD), QUALIDADE, PEÇA
        ) AS SUB
        GROUP BY DATE(DAT_PROD)
      ),
      ANCHO AS (
        SELECT
          DATE(DAT_PROD) AS FECHA,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
              CASE 
                WHEN LARGURA LIKE '%.%' AND LENGTH(SUBSTR(LARGURA, 1, INSTR(LARGURA, '.') - 1)) <= 3 
                  THEN CAST(LARGURA AS REAL)
                WHEN LARGURA LIKE '%,%' 
                  THEN CAST(REPLACE(LARGURA, ',', '.') AS REAL)
                ELSE CAST(LARGURA AS REAL)
              END) / 
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS ANCHO_POND
        FROM tb_CALIDAD
        WHERE DATE(DAT_PROD) = DATE(?)
          AND QUALIDADE = 'PRIMEIRA '
        GROUP BY EMP, DATE(DAT_PROD), QUALIDADE
      )
      SELECT
        CASE 
          WHEN ANCHO.METROS > 0 AND ANCHO.ANCHO_POND > 0 THEN
            (PTS.PONTUACAO * 100) / (ANCHO.METROS * ANCHO.ANCHO_POND) * 100
          ELSE 0
        END AS PTS1002
      FROM ANCHO
      LEFT JOIN PTS ON ANCHO.FECHA = PTS.FECHA
    `;

    // Consulta para el acumulado del mes
    const sqlMes = `
      WITH PTS AS (
        SELECT 
          SUM(PONTUACAO_AVG) AS PONTUACAO
        FROM (
          SELECT DISTINCT
            EMP,
            DATE(DAT_PROD) AS DAT_PROD,
            QUALIDADE,
            PEÇA,
            AVG(CAST(REPLACE(REPLACE(PONTUACAO, '.', ''), ',', '.') AS REAL)) AS PONTUACAO_AVG
          FROM tb_CALIDAD
          WHERE DATE(DAT_PROD) >= DATE(?)
            AND DATE(DAT_PROD) <= DATE(?)
            AND QUALIDADE = 'PRIMEIRA '
          GROUP BY EMP, DATE(DAT_PROD), QUALIDADE, PEÇA
        ) AS SUB
      ),
      ANCHO AS (
        SELECT
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
              CASE 
                WHEN LARGURA LIKE '%.%' AND LENGTH(SUBSTR(LARGURA, 1, INSTR(LARGURA, '.') - 1)) <= 3 
                  THEN CAST(LARGURA AS REAL)
                WHEN LARGURA LIKE '%,%' 
                  THEN CAST(REPLACE(LARGURA, ',', '.') AS REAL)
                ELSE CAST(LARGURA AS REAL)
              END) / 
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS ANCHO_POND
        FROM tb_CALIDAD
        WHERE DATE(DAT_PROD) >= DATE(?)
          AND DATE(DAT_PROD) <= DATE(?)
          AND QUALIDADE = 'PRIMEIRA '
      )
      SELECT
        CASE 
          WHEN ANCHO.METROS > 0 AND ANCHO.ANCHO_POND > 0 THEN
            (PTS.PONTUACAO * 100) / (ANCHO.METROS * ANCHO.ANCHO_POND) * 100
          ELSE 0
        END AS PTS1002
      FROM ANCHO, PTS
    `;

    const resultDia = await dbGet(sqlDia, [datePattern, datePattern]);
    const resultMes = await dbGet(sqlMes, [mesInicio, mesFin, mesInicio, mesFin]);

    console.log(`✅ Pts 100m² calculado - Día: ${resultDia?.PTS1002 || 0}, Mes: ${resultMes?.PTS1002 || 0}`);

    res.json({
      day: resultDia?.PTS1002 || 0,
      month: resultMes?.PTS1002 || 0,
      date: datePattern
    });

  } catch (error) {
    console.error('Error en /api/calidad/pts100m2:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/produccion/indigo-resumen - Metros y Roturas 10³ para sección INDIGO
app.get('/api/produccion/indigo-resumen', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['date', 'monthStart', 'monthEnd']);
    const { date, monthStart, monthEnd } = params;

    if (!date) {
      return res.status(400).json({ error: 'Se requiere parámetro "date" (formato YYYY-MM-DD)' });
    }

    const datePattern = date.split('T')[0];
    const [year, month, day] = datePattern.split('-');
    const mesInicio = monthStart || `${year}-${month}-01`;
    const mesFin = monthEnd || datePattern;
    
    // Convertir fechas a formato DD/MM/YYYY para comparación con tb_PRODUCCION
    const fechaDia = `${day}/${month}/${year}`;
    const [yInicio, mInicio, dInicio] = mesInicio.split('-');
    const [yFin, mFin, dFin] = mesFin.split('-');

    console.log(`🎯 Calculando INDIGO resumen para fecha: ${fechaDia}, mes: ${mesInicio} a ${mesFin}`);

    // Consulta para el día específico
    // La fecha en tb_PRODUCCION está en formato DD/MM/YYYY, usamos conversión
    const sqlDia = `
      SELECT
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) > 0 THEN
            SUM(CAST(REPLACE(REPLACE(RUPTURAS, '.', ''), ',', '.') AS REAL) * 1000) / 
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL))
          ELSE 0
        END AS ROT_103
      FROM tb_PRODUCCION
      WHERE (
        SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 1, 2)
      ) = ?
        AND SELETOR = 'INDIGO'
    `;

    // Consulta para el acumulado del mes
    // Convertimos la fecha DD/MM/YYYY a YYYY-MM-DD para comparación
    const sqlMes = `
      SELECT
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) > 0 THEN
            SUM(CAST(REPLACE(REPLACE(RUPTURAS, '.', ''), ',', '.') AS REAL) * 1000) / 
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL))
          ELSE 0
        END AS ROT_103
      FROM tb_PRODUCCION
      WHERE (
        SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 1, 2)
      ) >= ?
        AND (
        SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 1, 2)
      ) <= ?
        AND SELETOR = 'INDIGO'
    `;

    const resultDia = await dbGet(sqlDia, [datePattern]);
    const resultMes = await dbGet(sqlMes, [mesInicio, mesFin]);

    // Consulta para obtener la meta acumulada de INDIGO desde tb_METAS
    const sqlMetaAcumulada = `
      SELECT 
        SUM(Indigo) AS META_ACUMULADA,
        MAX(Indigo) AS META_DIA
      FROM tb_METAS 
      WHERE Dia >= ? AND Dia <= ?
    `;
    const resultMeta = await dbGet(sqlMetaAcumulada, [mesInicio, mesFin]);
    
    // Meta del día específico
    const sqlMetaDia = `
      SELECT Indigo AS META_DIA FROM tb_METAS WHERE Dia = ?
    `;
    const resultMetaDia = await dbGet(sqlMetaDia, [datePattern]);

    console.log(`✅ INDIGO resumen - Día: ${resultDia?.METROS || 0} m, Rot: ${resultDia?.ROT_103 || 0}`);
    console.log(`✅ INDIGO resumen - Mes: ${resultMes?.METROS || 0} m, Rot: ${resultMes?.ROT_103 || 0}`);
    console.log(`✅ INDIGO metas - Acumulada: ${resultMeta?.META_ACUMULADA || 0}, Día: ${resultMetaDia?.META_DIA || 0}`);

    res.json({
      day: {
        metros: resultDia?.METROS || 0,
        rot103: resultDia?.ROT_103 || 0,
        meta: resultMetaDia?.META_DIA || 0
      },
      month: {
        metros: resultMes?.METROS || 0,
        rot103: resultMes?.ROT_103 || 0,
        metaAcumulada: resultMeta?.META_ACUMULADA || 0
      },
      date: datePattern
    });

  } catch (error) {
    console.error('Error en /api/produccion/indigo-resumen:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/produccion/estopa-azul - Porcentaje de Estopa Azul INDIGO
// Fórmula: (Estopa Azul kg) / (SUM(Metros × Peso_manta) / 1000 × 0.98) × 100
app.get('/api/produccion/estopa-azul', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['date', 'monthStart', 'monthEnd']);
    const { date, monthStart, monthEnd } = params;

    if (!date) {
      return res.status(400).json({ error: 'Se requiere parámetro "date" (formato YYYY-MM-DD)' });
    }

    const datePattern = date.split('T')[0];
    const [year, month, day] = datePattern.split('-');
    const mesInicio = monthStart || `${year}-${month}-01`;
    const mesFin = monthEnd || datePattern;

    console.log(`🎯 Calculando Estopa Azul % para fecha: ${datePattern}, mes: ${mesInicio} a ${mesFin}`);

    // Subconsulta para obtener PESO_MANTA desde tb_FICHAS (reemplaza tb_BASES)
    // SELECT URDUME AS ARTIGO, CONS#URD/m AS PESO_MANTA FROM tb_FICHAS WHERE URDUME != '' AND CONS#URD/m != 0
    
    // Consulta para el día específico
    const sqlDia = `
      WITH BASES AS (
        SELECT DISTINCT
          URDUME AS ARTIGO,
          CAST(REPLACE(REPLACE([CONS#URD/m], '.', ''), ',', '.') AS REAL) AS PESO_MANTA
        FROM tb_FICHAS
        WHERE URDUME != '' 
          AND [CONS#URD/m] != '' 
          AND [CONS#URD/m] != '0'
          AND [CONS#URD/m] != '0,00'
      ),
      METROS_BASE AS (
        SELECT
          p.[BASE URDUME] AS BASE,
          SUM(CAST(REPLACE(REPLACE(p.METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS
        FROM tb_PRODUCCION p
        WHERE (
          SUBSTR(p.DT_BASE_PRODUCAO, 7, 4) || '-' || 
          SUBSTR(p.DT_BASE_PRODUCAO, 4, 2) || '-' || 
          SUBSTR(p.DT_BASE_PRODUCAO, 1, 2)
        ) = ?
          AND p.SELETOR = 'INDIGO'
        GROUP BY p.[BASE URDUME]
      ),
      PESO_DIA AS (
        SELECT
          SUM(mb.METROS * COALESCE(b.PESO_MANTA, 0)) / 1000 * 0.98 AS SUMA_PRODUCTO
        FROM METROS_BASE mb
        LEFT JOIN BASES b ON mb.BASE = b.ARTIGO
      ),
      ESTOPA_AZUL AS (
        SELECT
          SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)) AS ESTOPA
        FROM tb_RESIDUOS_INDIGO
        WHERE (
          SUBSTR(DT_MOV, 7, 4) || '-' || 
          SUBSTR(DT_MOV, 4, 2) || '-' || 
          SUBSTR(DT_MOV, 1, 2)
        ) = ?
          AND SUBPRODUTO = 1746437
      )
      SELECT
        ea.ESTOPA,
        pd.SUMA_PRODUCTO,
        CASE 
          WHEN pd.SUMA_PRODUCTO > 0 THEN (ea.ESTOPA / pd.SUMA_PRODUCTO) * 100
          ELSE 0
        END AS PORCENTAJE
      FROM PESO_DIA pd, ESTOPA_AZUL ea
    `;

    // Consulta para el acumulado del mes
    const sqlMes = `
      WITH BASES AS (
        SELECT DISTINCT
          URDUME AS ARTIGO,
          CAST(REPLACE(REPLACE([CONS#URD/m], '.', ''), ',', '.') AS REAL) AS PESO_MANTA
        FROM tb_FICHAS
        WHERE URDUME != '' 
          AND [CONS#URD/m] != '' 
          AND [CONS#URD/m] != '0'
          AND [CONS#URD/m] != '0,00'
      ),
      METROS_BASE AS (
        SELECT
          p.[BASE URDUME] AS BASE,
          SUM(CAST(REPLACE(REPLACE(p.METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS
        FROM tb_PRODUCCION p
        WHERE (
          SUBSTR(p.DT_BASE_PRODUCAO, 7, 4) || '-' || 
          SUBSTR(p.DT_BASE_PRODUCAO, 4, 2) || '-' || 
          SUBSTR(p.DT_BASE_PRODUCAO, 1, 2)
        ) >= ?
          AND (
          SUBSTR(p.DT_BASE_PRODUCAO, 7, 4) || '-' || 
          SUBSTR(p.DT_BASE_PRODUCAO, 4, 2) || '-' || 
          SUBSTR(p.DT_BASE_PRODUCAO, 1, 2)
        ) <= ?
          AND p.SELETOR = 'INDIGO'
        GROUP BY p.[BASE URDUME]
      ),
      PESO_MES AS (
        SELECT
          SUM(mb.METROS * COALESCE(b.PESO_MANTA, 0)) / 1000 * 0.98 AS SUMA_PRODUCTO
        FROM METROS_BASE mb
        LEFT JOIN BASES b ON mb.BASE = b.ARTIGO
      ),
      ESTOPA_AZUL AS (
        SELECT
          SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)) AS ESTOPA
        FROM tb_RESIDUOS_INDIGO
        WHERE (
          SUBSTR(DT_MOV, 7, 4) || '-' || 
          SUBSTR(DT_MOV, 4, 2) || '-' || 
          SUBSTR(DT_MOV, 1, 2)
        ) >= ?
          AND (
          SUBSTR(DT_MOV, 7, 4) || '-' || 
          SUBSTR(DT_MOV, 4, 2) || '-' || 
          SUBSTR(DT_MOV, 1, 2)
        ) <= ?
          AND SUBPRODUTO = 1746437
      )
      SELECT
        ea.ESTOPA,
        pm.SUMA_PRODUCTO,
        CASE 
          WHEN pm.SUMA_PRODUCTO > 0 THEN (ea.ESTOPA / pm.SUMA_PRODUCTO) * 100
          ELSE 0
        END AS PORCENTAJE
      FROM PESO_MES pm, ESTOPA_AZUL ea
    `;

    const resultDia = await dbGet(sqlDia, [datePattern, datePattern]);
    const resultMes = await dbGet(sqlMes, [mesInicio, mesFin, mesInicio, mesFin]);

    console.log(`✅ Estopa Azul - Día: ${resultDia?.ESTOPA || 0} kg, Peso: ${resultDia?.SUMA_PRODUCTO || 0}, %: ${resultDia?.PORCENTAJE || 0}`);
    console.log(`✅ Estopa Azul - Mes: ${resultMes?.ESTOPA || 0} kg, Peso: ${resultMes?.SUMA_PRODUCTO || 0}, %: ${resultMes?.PORCENTAJE || 0}`);

    res.json({
      day: {
        estopaKg: resultDia?.ESTOPA || 0,
        pesoProducto: resultDia?.SUMA_PRODUCTO || 0,
        porcentaje: resultDia?.PORCENTAJE || 0
      },
      month: {
        estopaKg: resultMes?.ESTOPA || 0,
        pesoProducto: resultMes?.SUMA_PRODUCTO || 0,
        porcentaje: resultMes?.PORCENTAJE || 0
      },
      date: datePattern
    });

  } catch (error) {
    console.error('Error en /api/produccion/estopa-azul:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/produccion/tecelagem-resumen - Metros, Eficiencia, Roturas y Estopa Azul para sección TECELAGEM
app.get('/api/produccion/tecelagem-resumen', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['date', 'monthStart', 'monthEnd']);
    const { date, monthStart, monthEnd } = params;

    if (!date) {
      return res.status(400).json({ error: 'Se requiere parámetro "date" (formato YYYY-MM-DD)' });
    }

    const datePattern = date.split('T')[0];
    const [year, month, day] = datePattern.split('-');
    const mesInicio = monthStart || `${year}-${month}-01`;
    const mesFin = monthEnd || datePattern;

    console.log(`🎯 Calculando TECELAGEM resumen para fecha: ${datePattern}, mes: ${mesInicio} a ${mesFin}`);

    // Consulta para el día específico - Metros, Eficiencia y Roturas
    // Metros usa [METRAGEM ENCOLH], Roturas usan [PARADA TEC TRAMA/URDUME] / ([PONTOS_LIDOS] * 1000) * 100000
    const sqlDia = `
      SELECT
        SUM(CAST(REPLACE(REPLACE([METRAGEM ENCOLH], '.', ''), ',', '.') AS REAL)) AS METROS,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) > 0 THEN
            SUM(CAST(REPLACE(REPLACE([PARADA TEC TRAMA], '.', ''), ',', '.') AS REAL)) * 100000.0 / 
            (SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) * 1000)
          ELSE 0
        END AS ROT_TRA_105,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) > 0 THEN
            SUM(CAST(REPLACE(REPLACE([PARADA TEC URDUME], '.', ''), ',', '.') AS REAL)) * 100000.0 / 
            (SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) * 1000)
          ELSE 0
        END AS ROT_URD_105,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL)) > 0 THEN
            SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) * 100.0 / 
            SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL))
          ELSE 0
        END AS EFICIENCIA
      FROM tb_PRODUCCION
      WHERE (
        SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 1, 2)
      ) = ?
        AND SELETOR = 'TECELAGEM'
    `;

    // Consulta para el acumulado del mes
    const sqlMes = `
      SELECT
        SUM(CAST(REPLACE(REPLACE([METRAGEM ENCOLH], '.', ''), ',', '.') AS REAL)) AS METROS,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) > 0 THEN
            SUM(CAST(REPLACE(REPLACE([PARADA TEC TRAMA], '.', ''), ',', '.') AS REAL)) * 100000.0 / 
            (SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) * 1000)
          ELSE 0
        END AS ROT_TRA_105,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) > 0 THEN
            SUM(CAST(REPLACE(REPLACE([PARADA TEC URDUME], '.', ''), ',', '.') AS REAL)) * 100000.0 / 
            (SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) * 1000)
          ELSE 0
        END AS ROT_URD_105,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL)) > 0 THEN
            SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) * 100.0 / 
            SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL))
          ELSE 0
        END AS EFICIENCIA
      FROM tb_PRODUCCION
      WHERE (
        SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 1, 2)
      ) >= ?
        AND (
        SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 1, 2)
      ) <= ?
        AND SELETOR = 'TECELAGEM'
    `;

    const resultDia = await dbGet(sqlDia, [datePattern]);
    const resultMes = await dbGet(sqlMes, [mesInicio, mesFin]);

    // Consulta para obtener las metas de TECELAGEM desde tb_METAS
    const sqlMetaAcumulada = `
      SELECT 
        SUM(Tejeduria) AS META_ACUMULADA,
        MAX(Tejeduria) AS META_DIA,
        AVG(EFI_Percent) AS META_EFI,
        AVG(RT105) AS META_RT105,
        AVG(RU105) AS META_RU105,
        AVG(Meta_Estopa_Azul_Tejeduria) AS META_ESTOPA_AZUL
      FROM tb_METAS 
      WHERE Dia >= ? AND Dia <= ?
    `;
    const resultMeta = await dbGet(sqlMetaAcumulada, [mesInicio, mesFin]);
    
    // Meta del día específico
    const sqlMetaDia = `
      SELECT 
        Tejeduria AS META_DIA,
        EFI_Percent AS META_EFI,
        RT105 AS META_RT105,
        RU105 AS META_RU105,
        Meta_Estopa_Azul_Tejeduria AS META_ESTOPA_AZUL
      FROM tb_METAS WHERE Dia = ?
    `;
    const resultMetaDia = await dbGet(sqlMetaDia, [datePattern]);

    // =====================================================================
    // ESTOPA AZUL TEJEDURÍA - DÍA
    // Usa producción TECELAGEM con PESO_MANTA y ENC#TEC#URDUME de tb_FICHAS
    // Fórmula: ESTOPA_AZUL / SUM(METRAGEM * ((100 + ENC_URD) / 100) * (PESO_MANTA / 1000)) * 100
    // Residuos de tb_RESIDUOS_POR_SECTOR con SUBPRODUTO = 1785582
    // =====================================================================
    const sqlEstopaDiaPeso = `
      WITH TEJ AS (
        SELECT
          ARTIGO AS ARTICULO,
          [BASE URDUME] AS BASE,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM
        FROM tb_PRODUCCION
        WHERE (
          SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
          SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
          SUBSTR(DT_BASE_PRODUCAO, 1, 2)
        ) = ?
          AND SELETOR = 'TECELAGEM'
        GROUP BY ARTIGO, [BASE URDUME]
      ),
      FIC AS (
        SELECT
          [ARTIGO CODIGO] AS ARTICULO,
          CAST(REPLACE(REPLACE([CONS#URD/m], '.', ''), ',', '.') AS REAL) AS PESO_MANTA,
          CAST(REPLACE(REPLACE([ENC#TEC#URDUME], '.', ''), ',', '.') AS REAL) AS ENC_URD
        FROM tb_FICHAS
        WHERE [ARTIGO CODIGO] IS NOT NULL AND [ARTIGO CODIGO] != ''
      )
      SELECT
        SUM(TEJ.METRAGEM * ((100 + COALESCE(FIC.ENC_URD, 0)) / 100) * (COALESCE(FIC.PESO_MANTA, 0) / 1000)) AS PESO_URD
      FROM TEJ
      LEFT JOIN FIC ON TEJ.ARTICULO = FIC.ARTICULO
    `;

    const sqlEstopaDiaResiduo = `
      SELECT
        SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)) AS ESTOPA
      FROM tb_RESIDUOS_POR_SECTOR
      WHERE (
        SUBSTR(DT_MOV, 7, 4) || '-' || 
        SUBSTR(DT_MOV, 4, 2) || '-' || 
        SUBSTR(DT_MOV, 1, 2)
      ) = ?
        AND SUBPRODUTO = 1785582
    `;

    // =====================================================================
    // ESTOPA AZUL TEJEDURÍA - MES
    // Usa producción TECELAGEM con PESO_MANTA y ENC#TEC#URDUME de tb_FICHAS
    // Fórmula: ESTOPA_AZUL / SUM(METRAGEM * ((100 + ENC_URD) / 100) * (PESO_MANTA / 1000)) * 100
    // Residuos de tb_RESIDUOS_POR_SECTOR con SUBPRODUTO = 1785582
    // =====================================================================
    const sqlEstopaMesPeso = `
      WITH TEJ AS (
        SELECT
          ARTIGO AS ARTICULO,
          [BASE URDUME] AS BASE,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM
        FROM tb_PRODUCCION
        WHERE (
          SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
          SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
          SUBSTR(DT_BASE_PRODUCAO, 1, 2)
        ) >= ?
          AND (
          SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
          SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
          SUBSTR(DT_BASE_PRODUCAO, 1, 2)
        ) <= ?
          AND SELETOR = 'TECELAGEM'
        GROUP BY ARTIGO, [BASE URDUME]
      ),
      FIC AS (
        SELECT
          [ARTIGO CODIGO] AS ARTICULO,
          CAST(REPLACE(REPLACE([CONS#URD/m], '.', ''), ',', '.') AS REAL) AS PESO_MANTA,
          CAST(REPLACE(REPLACE([ENC#TEC#URDUME], '.', ''), ',', '.') AS REAL) AS ENC_URD
        FROM tb_FICHAS
        WHERE [ARTIGO CODIGO] IS NOT NULL AND [ARTIGO CODIGO] != ''
      )
      SELECT
        SUM(TEJ.METRAGEM * ((100 + COALESCE(FIC.ENC_URD, 0)) / 100) * (COALESCE(FIC.PESO_MANTA, 0) / 1000)) AS PESO_URD
      FROM TEJ
      LEFT JOIN FIC ON TEJ.ARTICULO = FIC.ARTICULO
    `;

    const sqlEstopaMesResiduo = `
      SELECT
        SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)) AS ESTOPA
      FROM tb_RESIDUOS_POR_SECTOR
      WHERE (
        SUBSTR(DT_MOV, 7, 4) || '-' || 
        SUBSTR(DT_MOV, 4, 2) || '-' || 
        SUBSTR(DT_MOV, 1, 2)
      ) >= ?
        AND (
        SUBSTR(DT_MOV, 7, 4) || '-' || 
        SUBSTR(DT_MOV, 4, 2) || '-' || 
        SUBSTR(DT_MOV, 1, 2)
      ) <= ?
        AND SUBPRODUTO = 1785582
    `;

    const resultEstopaDiaPeso = await dbGet(sqlEstopaDiaPeso, [datePattern]);
    const resultEstopaDiaResiduo = await dbGet(sqlEstopaDiaResiduo, [datePattern]);
    const resultEstopaMesPeso = await dbGet(sqlEstopaMesPeso, [mesInicio, mesFin]);
    const resultEstopaMesResiduo = await dbGet(sqlEstopaMesResiduo, [mesInicio, mesFin]);

    // Calcular porcentaje de estopa azul para día y mes
    const pesoProductoDia = resultEstopaDiaPeso?.PESO_URD || 0;
    const pesoProductoMes = resultEstopaMesPeso?.PESO_URD || 0;
    const estopaAzulPctDia = pesoProductoDia > 0 ? ((resultEstopaDiaResiduo?.ESTOPA || 0) / pesoProductoDia) * 100 : 0;
    const estopaAzulPctMes = pesoProductoMes > 0 ? ((resultEstopaMesResiduo?.ESTOPA || 0) / pesoProductoMes) * 100 : 0;

    console.log(`✅ TECELAGEM Estopa Azul - Día: Peso=${pesoProductoDia}, Estopa=${resultEstopaDiaResiduo?.ESTOPA || 0}, %=${estopaAzulPctDia.toFixed(2)}`);
    console.log(`✅ TECELAGEM Estopa Azul - Mes: Peso=${pesoProductoMes}, Estopa=${resultEstopaMesResiduo?.ESTOPA || 0}, %=${estopaAzulPctMes.toFixed(2)}`);

    console.log(`✅ TECELAGEM resumen - Día: ${resultDia?.METROS || 0} m, Efi: ${resultDia?.EFICIENCIA || 0}%`);
    console.log(`✅ TECELAGEM resumen - Mes: ${resultMes?.METROS || 0} m, Efi: ${resultMes?.EFICIENCIA || 0}%`);
    console.log(`✅ TECELAGEM metas - Acumulada: ${resultMeta?.META_ACUMULADA || 0}, Día: ${resultMetaDia?.META_DIA || 0}`);

    res.json({
      day: {
        metros: resultDia?.METROS || 0,
        eficiencia: resultDia?.EFICIENCIA || 0,
        rotTra105: resultDia?.ROT_TRA_105 || 0,
        rotUrd105: resultDia?.ROT_URD_105 || 0,
        estopaAzulPct: estopaAzulPctDia,
        meta: resultMetaDia?.META_DIA || 0,
        metaEfi: resultMetaDia?.META_EFI || 0,
        metaRt105: resultMetaDia?.META_RT105 || 0,
        metaRu105: resultMetaDia?.META_RU105 || 0,
        metaEstopaAzul: resultMetaDia?.META_ESTOPA_AZUL || 0
      },
      month: {
        metros: resultMes?.METROS || 0,
        eficiencia: resultMes?.EFICIENCIA || 0,
        rotTra105: resultMes?.ROT_TRA_105 || 0,
        rotUrd105: resultMes?.ROT_URD_105 || 0,
        estopaAzulPct: estopaAzulPctMes,
        metaAcumulada: resultMeta?.META_ACUMULADA || 0,
        metaEfi: resultMeta?.META_EFI || 0,
        metaRt105: resultMeta?.META_RT105 || 0,
        metaRu105: resultMeta?.META_RU105 || 0,
        metaEstopaAzul: resultMeta?.META_ESTOPA_AZUL || 0
      },
      date: datePattern
    });

  } catch (error) {
    console.error('Error en /api/produccion/tecelagem-resumen:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/produccion/acabamento-resumen - Metros y ENC URD % para sección ACABAMENTO/INTEGRADA
// MAQUINA = '165001' filtra los datos de la máquina integrada
app.get('/api/produccion/acabamento-resumen', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['date', 'monthStart', 'monthEnd']);
    const { date, monthStart, monthEnd } = params;

    if (!date) {
      return res.status(400).json({ error: 'Se requiere parámetro "date" (formato YYYY-MM-DD)' });
    }

    const datePattern = date.split('T')[0];
    const [year, month, day] = datePattern.split('-');
    const mesInicio = monthStart || `${year}-${month}-01`;
    const mesFin = monthEnd || datePattern;

    console.log(`🟣 Calculando ACABAMENTO resumen para fecha: ${datePattern}, mes: ${mesInicio} a ${mesFin}`);

    // =====================================================================
    // METROS - Desde tb_PRODUCCION donde MAQUINA = '165001'
    // =====================================================================
    
    // Metros del día
    const sqlMetrosDia = `
      SELECT
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS
      FROM tb_PRODUCCION
      WHERE (
        SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 1, 2)
      ) = ?
        AND MAQUINA = '165001'
    `;

    // Metros del mes (acumulado)
    const sqlMetrosMes = `
      SELECT
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS
      FROM tb_PRODUCCION
      WHERE (
        SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 1, 2)
      ) >= ?
        AND (
        SUBSTR(DT_BASE_PRODUCAO, 7, 4) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 4, 2) || '-' || 
        SUBSTR(DT_BASE_PRODUCAO, 1, 2)
      ) <= ?
        AND MAQUINA = '165001'
    `;

    const resultMetrosDia = await dbGet(sqlMetrosDia, [datePattern]);
    const resultMetrosMes = await dbGet(sqlMetrosMes, [mesInicio, mesFin]);

    // =====================================================================
    // ENC URD % - Desde tb_TESTES donde MAQUINA = '165001' y APROV = 'A'
    // Fórmula: SUM(METRAGEM * %_ENC_URD) / SUM(METRAGEM)
    // =====================================================================
    
    // ENC URD del día
    const sqlEncUrdDia = `
      SELECT
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) > 0 THEN
            SUM(
              CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
              CAST(REPLACE(REPLACE("%_ENC_URD", '.', ''), ',', '.') AS REAL)
            ) / SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL))
          ELSE 0
        END AS ENC_URD_PCT
      FROM tb_TESTES
      WHERE (
        SUBSTR(DT_PROD, 7, 4) || '-' || 
        SUBSTR(DT_PROD, 4, 2) || '-' || 
        SUBSTR(DT_PROD, 1, 2)
      ) = ?
        AND MAQUINA = '165001'
        AND APROV = 'A'
    `;

    // ENC URD del mes (acumulado)
    const sqlEncUrdMes = `
      SELECT
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) > 0 THEN
            SUM(
              CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
              CAST(REPLACE(REPLACE("%_ENC_URD", '.', ''), ',', '.') AS REAL)
            ) / SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL))
          ELSE 0
        END AS ENC_URD_PCT
      FROM tb_TESTES
      WHERE (
        SUBSTR(DT_PROD, 7, 4) || '-' || 
        SUBSTR(DT_PROD, 4, 2) || '-' || 
        SUBSTR(DT_PROD, 1, 2)
      ) >= ?
        AND (
        SUBSTR(DT_PROD, 7, 4) || '-' || 
        SUBSTR(DT_PROD, 4, 2) || '-' || 
        SUBSTR(DT_PROD, 1, 2)
      ) <= ?
        AND MAQUINA = '165001'
        AND APROV = 'A'
    `;

    const resultEncUrdDia = await dbGet(sqlEncUrdDia, [datePattern]);
    const resultEncUrdMes = await dbGet(sqlEncUrdMes, [mesInicio, mesFin]);

    // =====================================================================
    // METAS - Desde tb_METAS (columnas Integrada, Meta_ENC_URD_Integrada)
    // =====================================================================
    
    // Meta del día específico
    const sqlMetaDia = `
      SELECT 
        Integrada AS META_DIA,
        Meta_ENC_URD_Integrada AS META_ENC_URD
      FROM tb_METAS WHERE Dia = ?
    `;
    const resultMetaDia = await dbGet(sqlMetaDia, [datePattern]);

    // Meta acumulada del mes
    const sqlMetaAcumulada = `
      SELECT 
        SUM(Integrada) AS META_ACUMULADA,
        AVG(Meta_ENC_URD_Integrada) AS META_ENC_URD
      FROM tb_METAS 
      WHERE Dia >= ? AND Dia <= ?
    `;
    const resultMetaAcumulada = await dbGet(sqlMetaAcumulada, [mesInicio, mesFin]);

    console.log(`✅ ACABAMENTO Metros - Día: ${resultMetrosDia?.METROS || 0}, Mes: ${resultMetrosMes?.METROS || 0}`);
    console.log(`✅ ACABAMENTO ENC URD - Día: ${resultEncUrdDia?.ENC_URD_PCT || 0}%, Mes: ${resultEncUrdMes?.ENC_URD_PCT || 0}%`);
    console.log(`✅ ACABAMENTO Metas - Día: ${resultMetaDia?.META_DIA || 0}, Acumulada: ${resultMetaAcumulada?.META_ACUMULADA || 0}`);
    console.log(`✅ ACABAMENTO Meta ENC URD - ${resultMetaDia?.META_ENC_URD || resultMetaAcumulada?.META_ENC_URD || -1.5}`);

    res.json({
      day: {
        metros: resultMetrosDia?.METROS || 0,
        encUrdPct: resultEncUrdDia?.ENC_URD_PCT || 0,
        meta: resultMetaDia?.META_DIA || 0,
        metaEncUrd: resultMetaDia?.META_ENC_URD || -1.5
      },
      month: {
        metros: resultMetrosMes?.METROS || 0,
        encUrdPct: resultEncUrdMes?.ENC_URD_PCT || 0,
        metaAcumulada: resultMetaAcumulada?.META_ACUMULADA || 0,
        metaEncUrd: resultMetaAcumulada?.META_ENC_URD || -1.5
      },
      date: datePattern
    });

  } catch (error) {
    console.error('Error en /api/produccion/acabamento-resumen:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/informe-diario - Informe STC Diario (iniciando solo con INDIGO)
app.get('/api/informe-diario', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['fecha']);
    const fecha = params.fecha || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Extraer año, mes y día de la fecha
    const [year, month, day] = fecha.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Día hasta el cual mostrar datos (fecha solicitada)
    const maxDay = Math.min(day, daysInMonth);
    
    // 1. Obtener METAS del mes para INDIGO
    const metas = await dbAll(`
      SELECT 
        CAST(strftime('%d', Dia) AS INTEGER) as dia,
        CAST(Indigo as REAL) as meta_indigo
      FROM tb_METAS
      WHERE strftime('%Y-%m', Dia) = ?
      ORDER BY dia
    `, [`${year}-${String(month).padStart(2, '0')}`]);
    
    // Organizar metas por día
    const metasPorDia = {};
    let metaMensualIndigo = 0;
    
    metas.forEach(m => {
      metasPorDia[m.dia] = { INDIGO: m.meta_indigo || 0 };
      metaMensualIndigo += m.meta_indigo || 0;
    });
    
    // 2. Obtener datos de INDIGO (por día)
    const indigoData = await dbAll(`
      SELECT 
        CAST(substr(DT_BASE_PRODUCAO, 1, 2) AS INTEGER) as dia,
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS metragem,
        SUM(CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL) * CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) / 
          NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) AS velocidad,
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) / 
          NULLIF((SUM(CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL) * CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) / 
          NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0)) * 1440, 0) * 100 AS eficiencia
      FROM tb_PRODUCCION
      WHERE substr(DT_BASE_PRODUCAO, 4, 2) = ? 
        AND substr(DT_BASE_PRODUCAO, 7, 4) = ?
        AND SELETOR = 'INDIGO'
      GROUP BY dia
      ORDER BY dia
    `, [String(month).padStart(2, '0'), String(year)]);
    
    // Organizar datos por día
    const indigoPorDia = {};
    indigoData.forEach(d => { indigoPorDia[d.dia] = d; });
    
    // 3. Obtener datos de TECELAGEM (por día)
    const tecelagemData = await dbAll(`
      SELECT 
        CAST(substr(DT_BASE_PRODUCAO, 1, 2) AS INTEGER) as dia,
        SUM(CAST(REPLACE(REPLACE([TEMPO LEIT MIN], '.', ''), ',', '.') AS REAL)) / 1440.0 AS telares,
        SUM(CAST(REPLACE(REPLACE([METRAGEM ENCOLH], '.', ''), ',', '.') AS REAL)) AS metragem,
        (SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) / 
         NULLIF(SUM(CAST(REPLACE(REPLACE([PONTOS_100%], '.', ''), ',', '.') AS REAL)), 0) * 100.0) AS eficiencia,
        SUM(CAST(REPLACE(BATIDAS, ',', '.') AS REAL) * CAST(REPLACE(REPLACE([METRAGEM ENCOLH], '.', ''), ',', '.') AS REAL)) / 
         NULLIF(SUM(CAST(REPLACE(REPLACE([METRAGEM ENCOLH], '.', ''), ',', '.') AS REAL)), 0) AS batidas,
        SUM(CAST(REPLACE(REPLACE([RPM LEITURA], '.', ''), ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) / 
         NULLIF(SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)), 0) AS rpm
      FROM tb_PRODUCCION
      WHERE substr(DT_BASE_PRODUCAO, 4, 2) = ? 
        AND substr(DT_BASE_PRODUCAO, 7, 4) = ?
        AND SELETOR = 'TECELAGEM'
      GROUP BY dia
      ORDER BY dia
    `, [String(month).padStart(2, '0'), String(year)]);
    
    // Organizar datos de TECELAGEM por día
    const tecelagemPorDia = {};
    tecelagemData.forEach(d => { tecelagemPorDia[d.dia] = d; });
    
    // Obtener metas de TECELAGEM
    const metasTecelagem = await dbAll(`
      SELECT 
        CAST(strftime('%d', Dia) AS INTEGER) as dia,
        CAST(Tejeduria as REAL) as meta_tecelagem
      FROM tb_METAS
      WHERE strftime('%Y-%m', Dia) = ?
      ORDER BY dia
    `, [`${year}-${String(month).padStart(2, '0')}`]);
    
    // Organizar metas de TECELAGEM por día y calcular meta mensual
    let metaMensualTecelagem = 0;
    metasTecelagem.forEach(m => {
      if (!metasPorDia[m.dia]) metasPorDia[m.dia] = {};
      metasPorDia[m.dia].TECELAGEM = m.meta_tecelagem || 0;
      metaMensualTecelagem += m.meta_tecelagem || 0;
    });
    
    // 4. Obtener datos de ACABAMENTO (por día) - Máquina 165001
    const acabamentoData = await dbAll(`
      SELECT 
        CAST(substr(DT_BASE_PRODUCAO, 1, 2) AS INTEGER) as dia,
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS metragem,
        SUM(CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL) * CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) / 
          NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) AS velocidad,
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) / 
          NULLIF((SUM(CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL) * CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) / 
          NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0)) * 1440, 0) * 100 AS eficiencia
      FROM tb_PRODUCCION
      WHERE substr(DT_BASE_PRODUCAO, 4, 2) = ? 
        AND substr(DT_BASE_PRODUCAO, 7, 4) = ?
        AND MAQUINA = '165001'
      GROUP BY dia
      ORDER BY dia
    `, [String(month).padStart(2, '0'), String(year)]);
    
    // Organizar datos de ACABAMENTO por día
    const acabamentoPorDia = {};
    acabamentoData.forEach(d => { acabamentoPorDia[d.dia] = d; });
    
    // Obtener metas de ACABAMENTO (Integrada)
    const metasAcabamento = await dbAll(`
      SELECT 
        CAST(strftime('%d', Dia) AS INTEGER) as dia,
        CAST(Integrada as REAL) as meta_acabamento
      FROM tb_METAS
      WHERE strftime('%Y-%m', Dia) = ?
      ORDER BY dia
    `, [`${year}-${String(month).padStart(2, '0')}`]);
    
    // Organizar metas de ACABAMENTO por día y calcular meta mensual
    let metaMensualAcabamento = 0;
    metasAcabamento.forEach(m => {
      if (!metasPorDia[m.dia]) metasPorDia[m.dia] = {};
      metasPorDia[m.dia].ACABAMENTO = m.meta_acabamento || 0;
      metaMensualAcabamento += m.meta_acabamento || 0;
    });
    
    // 5. Obtener datos de CALIDAD (por día)
    // Total de metros por día
    const calidadTotalData = await dbAll(`
      SELECT 
        CAST(substr(DAT_PROD, 9, 2) AS INTEGER) as dia,
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS metragem_total
      FROM tb_CALIDAD
      WHERE substr(DAT_PROD, 6, 2) = ? 
        AND substr(DAT_PROD, 1, 4) = ?
        AND EMP = 'STC'
      GROUP BY dia
      ORDER BY dia
    `, [String(month).padStart(2, '0'), String(year)]);
    
    // Metros de PRIMEIRA calidad por día
    const calidadPrimeiraData = await dbAll(`
      SELECT 
        CAST(substr(DAT_PROD, 9, 2) AS INTEGER) as dia,
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS metragem_primeira
      FROM tb_CALIDAD
      WHERE substr(DAT_PROD, 6, 2) = ? 
        AND substr(DAT_PROD, 1, 4) = ?
        AND EMP = 'STC'
        AND QUALIDADE = 'PRIMEIRA '
      GROUP BY dia
      ORDER BY dia
    `, [String(month).padStart(2, '0'), String(year)]);
    
    // Puntos/100m² para PRIMEIRA calidad - Usando la misma lógica que /api/calidad/pts100m2
    // LARGURA está en cm (160), la fórmula compensa: (puntos * 100) / (metros * ancho_cm) * 100
    const calidadPuntosData = await dbAll(`
      WITH PTS AS (
        SELECT 
          CAST(strftime('%d', DAT_PROD) AS INTEGER) as dia,
          SUM(PONTUACAO_AVG) AS PONTUACAO
        FROM (
          SELECT DISTINCT
            EMP,
            DATE(DAT_PROD) AS DAT_PROD,
            QUALIDADE,
            PEÇA,
            AVG(CAST(REPLACE(REPLACE(PONTUACAO, '.', ''), ',', '.') AS REAL)) AS PONTUACAO_AVG
          FROM tb_CALIDAD
          WHERE strftime('%m', DAT_PROD) = ?
            AND strftime('%Y', DAT_PROD) = ?
            AND QUALIDADE = 'PRIMEIRA '
            AND EMP = 'STC'
          GROUP BY EMP, DATE(DAT_PROD), QUALIDADE, PEÇA
        ) AS SUB
        GROUP BY dia
      ),
      ANCHO AS (
        SELECT
          CAST(strftime('%d', DAT_PROD) AS INTEGER) as dia,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * CAST(LARGURA AS REAL)) / 
            NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) AS ANCHO_POND
        FROM tb_CALIDAD
        WHERE strftime('%m', DAT_PROD) = ?
          AND strftime('%Y', DAT_PROD) = ?
          AND QUALIDADE = 'PRIMEIRA '
          AND EMP = 'STC'
        GROUP BY dia
      )
      SELECT
        ANCHO.dia,
        CASE 
          WHEN ANCHO.METROS > 0 AND ANCHO.ANCHO_POND > 0 THEN
            (PTS.PONTUACAO * 100) / (ANCHO.METROS * ANCHO.ANCHO_POND) * 100
          ELSE 0
        END AS pts100m2
      FROM ANCHO
      LEFT JOIN PTS ON ANCHO.dia = PTS.dia
      ORDER BY ANCHO.dia
    `, [String(month).padStart(2, '0'), String(year), String(month).padStart(2, '0'), String(year)]);
    
    // Organizar datos de CALIDAD por día
    const calidadPorDia = {};
    calidadTotalData.forEach(d => {
      if (!calidadPorDia[d.dia]) calidadPorDia[d.dia] = {};
      calidadPorDia[d.dia].metragem_total = d.metragem_total;
    });
    calidadPrimeiraData.forEach(d => {
      if (!calidadPorDia[d.dia]) calidadPorDia[d.dia] = {};
      calidadPorDia[d.dia].metragem_primeira = d.metragem_primeira;
    });
    calidadPuntosData.forEach(d => {
      if (!calidadPorDia[d.dia]) calidadPorDia[d.dia] = {};
      // Pts/100m² ya viene calculado del query
      calidadPorDia[d.dia].puntos100m2 = d.pts100m2 || 0;
    });
    
    // Obtener metas de CALIDAD (Revisión)
    const metasCalidad = await dbAll(`
      SELECT 
        CAST(strftime('%d', Dia) AS INTEGER) as dia,
        CAST(Revision as REAL) as meta_calidad
      FROM tb_METAS
      WHERE strftime('%Y-%m', Dia) = ?
      ORDER BY dia
    `, [`${year}-${String(month).padStart(2, '0')}`]);
    
    // Organizar metas de CALIDAD por día y calcular meta mensual
    let metaMensualCalidad = 0;
    metasCalidad.forEach(m => {
      if (!metasPorDia[m.dia]) metasPorDia[m.dia] = {};
      metasPorDia[m.dia].CALIDAD = m.meta_calidad || 0;
      metaMensualCalidad += m.meta_calidad || 0;
    });
    
    // Encontrar el primer día con meta > 0 (INDIGO, TECELAGEM, ACABAMENTO, CALIDAD)
    let primerDiaConMeta = null;
    let primerDiaConMetaTecelagem = null;
    let primerDiaConMetaAcabamento = null;
    let primerDiaConMetaCalidad = null;
    for (let i = 1; i <= daysInMonth; i++) {
      if (metasPorDia[i]?.INDIGO && metasPorDia[i].INDIGO > 0 && primerDiaConMeta === null) {
        primerDiaConMeta = i;
      }
      if (metasPorDia[i]?.TECELAGEM && metasPorDia[i].TECELAGEM > 0 && primerDiaConMetaTecelagem === null) {
        primerDiaConMetaTecelagem = i;
      }
      if (metasPorDia[i]?.ACABAMENTO && metasPorDia[i].ACABAMENTO > 0 && primerDiaConMetaAcabamento === null) {
        primerDiaConMetaAcabamento = i;
      }
      if (metasPorDia[i]?.CALIDAD && metasPorDia[i].CALIDAD > 0 && primerDiaConMetaCalidad === null) {
        primerDiaConMetaCalidad = i;
      }
      if (primerDiaConMeta !== null && primerDiaConMetaTecelagem !== null && primerDiaConMetaAcabamento !== null && primerDiaConMetaCalidad !== null) break;
    }
    
    // Construir array de días (mostrar todo el mes para metas, datos solo hasta maxDay)
    const days = [];
    const dayNames = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá'];
    
    // Calcular producción acumulada real hasta maxDay una sola vez (INDIGO, TECELAGEM, ACABAMENTO, CALIDAD)
    let prodAcumuladaTotal = 0;
    let prodAcumuladaTotalTecelagem = 0;
    let prodAcumuladaTotalAcabamento = 0;
    let prodAcumuladaTotalCalidad = 0;
    for (let i = primerDiaConMeta || 1; i <= maxDay; i++) {
      prodAcumuladaTotal += indigoPorDia[i]?.metragem || 0;
    }
    for (let i = primerDiaConMetaTecelagem || 1; i <= maxDay; i++) {
      prodAcumuladaTotalTecelagem += tecelagemPorDia[i]?.metragem || 0;
    }
    for (let i = primerDiaConMetaAcabamento || 1; i <= maxDay; i++) {
      prodAcumuladaTotalAcabamento += acabamentoPorDia[i]?.metragem || 0;
    }
    for (let i = primerDiaConMetaCalidad || 1; i <= maxDay; i++) {
      prodAcumuladaTotalCalidad += calidadPorDia[i]?.metragem_total || 0;
    }
    
    // Variable para acumular metas ajustadas de días futuros
    let metasAjustadasFuturas = 0;
    let metasAjustadasFuturasTecelagem = 0;
    let metasAjustadasFuturasAcabamento = 0;
    let metasAjustadasFuturasCalidad = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dayOfWeek = currentDate.getDay();
      
      const metaDiaIndigo = metasPorDia[day]?.INDIGO || 0;
      
      // Solo usar datos de producción hasta maxDay
      const prodIndigo = day <= maxDay ? (indigoPorDia[day]?.metragem || 0) : 0;
      const saldoIndigo = day <= maxDay ? (prodIndigo - metaDiaIndigo) : null;
      
      // Calcular Meta Ajustada para este día específico
      let metaAjustadaIndigo = null;
      
      // Calcular si:
      // 1. Ya pasó el primer día con meta
      // 2. El día actual tiene meta > 0
      if (primerDiaConMeta !== null && day >= primerDiaConMeta && metaDiaIndigo > 0) {
        if (day <= maxDay) {
          // Días con datos reales: calcular producción acumulada INCLUYENDO el día actual
          let prodAcumuladaHasta = 0;
          for (let i = primerDiaConMeta; i <= day; i++) {
            prodAcumuladaHasta += indigoPorDia[i]?.metragem || 0;
          }
          
          // Contar días con meta POSTERIORES a este día (del día+1 hasta fin de mes)
          let diasPosterioresConMeta = 0;
          for (let i = day + 1; i <= daysInMonth; i++) {
            if (metasPorDia[i]?.INDIGO && metasPorDia[i].INDIGO > 0) {
              diasPosterioresConMeta++;
            }
          }
          
          if (diasPosterioresConMeta > 0) {
            metaAjustadaIndigo = (metaMensualIndigo - prodAcumuladaHasta) / diasPosterioresConMeta;
          }
        } else {
          // Días futuros: usar producción acumulada total hasta maxDay + metas ajustadas futuras anteriores
          let diasRestantesConMeta = 0;
          for (let i = day; i <= daysInMonth; i++) {
            if (metasPorDia[i]?.INDIGO && metasPorDia[i].INDIGO > 0) {
              diasRestantesConMeta++;
            }
          }
          
          if (diasRestantesConMeta > 0) {
            metaAjustadaIndigo = (metaMensualIndigo - prodAcumuladaTotal - metasAjustadasFuturas) / diasRestantesConMeta;
            // Acumular esta meta ajustada para el siguiente día futuro
            metasAjustadasFuturas += metaAjustadaIndigo;
          }
        }
      }
      
      // ===== TECELAGEM =====
      const metaDiaTecelagem = metasPorDia[day]?.TECELAGEM || 0;
      const prodTecelagem = day <= maxDay ? (tecelagemPorDia[day]?.metragem || 0) : 0;
      const saldoTecelagem = day <= maxDay ? (prodTecelagem - metaDiaTecelagem) : null;
      
      let metaAjustadaTecelagem = null;
      
      if (primerDiaConMetaTecelagem !== null && day >= primerDiaConMetaTecelagem && metaDiaTecelagem > 0) {
        if (day <= maxDay) {
          // Días con datos reales
          let prodAcumuladaHastaTecelagem = 0;
          for (let i = primerDiaConMetaTecelagem; i <= day; i++) {
            prodAcumuladaHastaTecelagem += tecelagemPorDia[i]?.metragem || 0;
          }
          
          let diasPosterioresConMetaTecelagem = 0;
          for (let i = day + 1; i <= daysInMonth; i++) {
            if (metasPorDia[i]?.TECELAGEM && metasPorDia[i].TECELAGEM > 0) {
              diasPosterioresConMetaTecelagem++;
            }
          }
          
          if (diasPosterioresConMetaTecelagem > 0) {
            metaAjustadaTecelagem = (metaMensualTecelagem - prodAcumuladaHastaTecelagem) / diasPosterioresConMetaTecelagem;
          }
        } else {
          // Días futuros
          let diasRestantesConMetaTecelagem = 0;
          for (let i = day; i <= daysInMonth; i++) {
            if (metasPorDia[i]?.TECELAGEM && metasPorDia[i].TECELAGEM > 0) {
              diasRestantesConMetaTecelagem++;
            }
          }
          
          if (diasRestantesConMetaTecelagem > 0) {
            metaAjustadaTecelagem = (metaMensualTecelagem - prodAcumuladaTotalTecelagem - metasAjustadasFuturasTecelagem) / diasRestantesConMetaTecelagem;
            metasAjustadasFuturasTecelagem += metaAjustadaTecelagem;
          }
        }
      }
      
      // ===== ACABAMENTO =====
      const metaDiaAcabamento = metasPorDia[day]?.ACABAMENTO || 0;
      const prodAcabamento = day <= maxDay ? (acabamentoPorDia[day]?.metragem || 0) : 0;
      const saldoAcabamento = day <= maxDay ? (prodAcabamento - metaDiaAcabamento) : null;
      
      let metaAjustadaAcabamento = null;
      
      if (primerDiaConMetaAcabamento !== null && day >= primerDiaConMetaAcabamento && metaDiaAcabamento > 0) {
        if (day <= maxDay) {
          // Días con datos reales
          let prodAcumuladaHastaAcabamento = 0;
          for (let i = primerDiaConMetaAcabamento; i <= day; i++) {
            prodAcumuladaHastaAcabamento += acabamentoPorDia[i]?.metragem || 0;
          }
          
          let diasPosterioresConMetaAcabamento = 0;
          for (let i = day + 1; i <= daysInMonth; i++) {
            if (metasPorDia[i]?.ACABAMENTO && metasPorDia[i].ACABAMENTO > 0) {
              diasPosterioresConMetaAcabamento++;
            }
          }
          
          if (diasPosterioresConMetaAcabamento > 0) {
            metaAjustadaAcabamento = (metaMensualAcabamento - prodAcumuladaHastaAcabamento) / diasPosterioresConMetaAcabamento;
          }
        } else {
          // Días futuros
          let diasRestantesConMetaAcabamento = 0;
          for (let i = day; i <= daysInMonth; i++) {
            if (metasPorDia[i]?.ACABAMENTO && metasPorDia[i].ACABAMENTO > 0) {
              diasRestantesConMetaAcabamento++;
            }
          }
          
          if (diasRestantesConMetaAcabamento > 0) {
            metaAjustadaAcabamento = (metaMensualAcabamento - prodAcumuladaTotalAcabamento - metasAjustadasFuturasAcabamento) / diasRestantesConMetaAcabamento;
            metasAjustadasFuturasAcabamento += metaAjustadaAcabamento;
          }
        }
      }
      
      // ===== CALIDAD =====
      const metaDiaCalidad = metasPorDia[day]?.CALIDAD || 0;
      const prodCalidad = day <= maxDay ? (calidadPorDia[day]?.metragem_total || 0) : 0;
      const saldoCalidad = day <= maxDay ? (prodCalidad - metaDiaCalidad) : null;
      
      // Calcular % de Primera Calidad
      let primeraCalidadPct = null;
      if (day <= maxDay && calidadPorDia[day]?.metragem_total && calidadPorDia[day].metragem_total > 0) {
        const metrosPrimeira = calidadPorDia[day]?.metragem_primeira || 0;
        primeraCalidadPct = (metrosPrimeira / calidadPorDia[day].metragem_total) * 100;
      }
      
      let metaAjustadaCalidad = null;
      
      if (primerDiaConMetaCalidad !== null && day >= primerDiaConMetaCalidad && metaDiaCalidad > 0) {
        if (day <= maxDay) {
          // Días con datos reales
          let prodAcumuladaHastaCalidad = 0;
          for (let i = primerDiaConMetaCalidad; i <= day; i++) {
            prodAcumuladaHastaCalidad += calidadPorDia[i]?.metragem_total || 0;
          }
          
          let diasPosterioresConMetaCalidad = 0;
          for (let i = day + 1; i <= daysInMonth; i++) {
            if (metasPorDia[i]?.CALIDAD && metasPorDia[i].CALIDAD > 0) {
              diasPosterioresConMetaCalidad++;
            }
          }
          
          if (diasPosterioresConMetaCalidad > 0) {
            metaAjustadaCalidad = (metaMensualCalidad - prodAcumuladaHastaCalidad) / diasPosterioresConMetaCalidad;
          }
        } else {
          // Días futuros
          let diasRestantesConMetaCalidad = 0;
          for (let i = day; i <= daysInMonth; i++) {
            if (metasPorDia[i]?.CALIDAD && metasPorDia[i].CALIDAD > 0) {
              diasRestantesConMetaCalidad++;
            }
          }
          
          if (diasRestantesConMetaCalidad > 0) {
            metaAjustadaCalidad = (metaMensualCalidad - prodAcumuladaTotalCalidad - metasAjustadasFuturasCalidad) / diasRestantesConMetaCalidad;
            metasAjustadasFuturasCalidad += metaAjustadaCalidad;
          }
        }
      }
      
      days.push({
        dayNumber: day,
        dayLabel: `${String(day).padStart(2, '0')}- ${dayNames[dayOfWeek]}`,
        hasData: day <= maxDay ? !!indigoPorDia[day] : false,
        indigo: {
          eficiencia: day <= maxDay ? indigoPorDia[day]?.eficiencia : null,
          produccion: prodIndigo,
          meta: metaDiaIndigo,
          saldo: saldoIndigo,
          metaAjustada: metaAjustadaIndigo,
          velocidad: day <= maxDay ? indigoPorDia[day]?.velocidad : null,
          telares: null,
          batidas: null
        },
        tecelagem: {
          telares: day <= maxDay ? tecelagemPorDia[day]?.telares : null,
          batidas: day <= maxDay ? tecelagemPorDia[day]?.batidas : null,
          rpm: day <= maxDay ? tecelagemPorDia[day]?.rpm : null,
          eficiencia: day <= maxDay ? tecelagemPorDia[day]?.eficiencia : null,
          produccion: prodTecelagem,
          meta: metaDiaTecelagem,
          saldo: saldoTecelagem,
          metaAjustada: metaAjustadaTecelagem
        },
        acabamento: {
          eficiencia: day <= maxDay ? acabamentoPorDia[day]?.eficiencia : null,
          produccion: prodAcabamento,
          meta: metaDiaAcabamento,
          saldo: saldoAcabamento,
          metaAjustada: metaAjustadaAcabamento,
          primeraCalidad: primeraCalidadPct
        },
        calidad: {
          puntos100m2: day <= maxDay ? calidadPorDia[day]?.puntos100m2 : null,
          produccion: prodCalidad,
          meta: metaDiaCalidad,
          saldo: saldoCalidad,
          metaAjustada: metaAjustadaCalidad
        }
      });
    }
    
    res.json({ fecha, year, month, daysInMonth, days });
    
  } catch (error) {
    console.error('Error en /api/informe-diario:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// NOTA: app.listen() movido al final del archivo después de todos los endpoints
// =====================================================================

/*
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
  console.log('   GET  /api/metas?mes=1&año=2026    - Obtener metas del mes');
  console.log('   GET  /api/metas/:fecha            - Obtener meta de fecha específica');
  console.log('   POST /api/metas                   - Guardar/actualizar metas (batch)');
  console.log('   DEL  /api/metas/:fecha            - Eliminar meta de una fecha');
  console.log('');
});
*/


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
    const params = validateQueryParams(req, ['startDate', 'endDate', 'revisor', 'tramas']);
    const { startDate, endDate, revisor, tramas } = params;

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

// GET /api/calidad/debug-sectores - Diagnóstico para tabla de sectores
app.get('/api/calidad/debug-sectores', async (req, res) => {
  try {
    console.log('\n=== DEBUG: DIAGNOSTICO tb_CALIDAD ===\n');

    // 1. Columnas de tb_CALIDAD
    const columnas = await dbAll(`PRAGMA table_info(tb_CALIDAD)`);
    console.log('📋 Columnas en tb_CALIDAD:');
    columnas.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col.name} (${col.type})`);
    });

    // 2. Contador de registros
    const count = await dbGet(`SELECT COUNT(*) as total FROM tb_CALIDAD`);
    console.log(`\n📊 Total de registros: ${count.total}`);

    // 3. Rango de fechas disponibles
    const dateRange = await dbGet(`
      SELECT MIN(DAT_PROD) as min_date, MAX(DAT_PROD) as max_date 
      FROM tb_CALIDAD
    `);
    console.log(`📅 Rango de fechas: ${dateRange.min_date} a ${dateRange.max_date}`);

    // 4. Valores únicos de GRP_DEF
    const sectors = await dbAll(`
      SELECT DISTINCT GRP_DEF, COUNT(*) as count
      FROM tb_CALIDAD
      GROUP BY GRP_DEF
      ORDER BY count DESC
    `);
    console.log('\n🏭 Sectores (GRP_DEF):');
    sectors.forEach(s => {
      console.log(`  ${s.GRP_DEF}: ${s.count} registros`);
    });

    // 5. Ejemplo de registros
    const sample = await dbAll(`
      SELECT 
        DAT_PROD,
        GRP_DEF,
        EMP,
        METRAGEM,
        QUALIDADE
      FROM tb_CALIDAD
      LIMIT 5
    `);
    console.log('\n📋 Ejemplo de registros:');
    sample.forEach((row, idx) => {
      console.log(`  ${idx + 1}. Fecha: ${row.DAT_PROD}, Sector: ${row.GRP_DEF}, Emp: ${row.EMP}, Metros: ${row.METRAGEM}`);
    });

    // 6. Datos para la fecha especificada (19/01/2026)
    const testDate = '19/01/2026';
    const testData = await dbAll(`
      SELECT 
        DAT_PROD,
        GRP_DEF,
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) as total_metros,
        COUNT(*) as registros
      FROM tb_CALIDAD
      WHERE DAT_PROD = ?
        AND EMP = 'STC'
      GROUP BY GRP_DEF
    `, [testDate]);
    console.log(`\n🔍 Datos para ${testDate} (EMP='STC'):`);
    if (testData.length === 0) {
      console.log('  ⚠️ NO HAY DATOS');
    } else {
      testData.forEach(row => {
        console.log(`  ${row.GRP_DEF}: ${row.total_metros} metros (${row.registros} registros)`);
      });
    }

    // 7. Datos para cualquier fecha
    const anyDate = await dbGet(`
      SELECT DISTINCT DAT_PROD
      FROM tb_CALIDAD
      LIMIT 1
    `);
    if (anyDate) {
      const anyDateData = await dbAll(`
        SELECT 
          DAT_PROD,
          GRP_DEF,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) as total_metros
        FROM tb_CALIDAD
        WHERE DAT_PROD = ?
          AND EMP = 'STC'
        GROUP BY GRP_DEF
      `, [anyDate.DAT_PROD]);
      console.log(`\n✅ Datos para ${anyDate.DAT_PROD} (EMP='STC'):`);
      anyDateData.forEach(row => {
        console.log(`  ${row.GRP_DEF}: ${row.total_metros} metros`);
      });
    }

    console.log('\n====================================\n');

    res.json({
      totalRegistros: count.total,
      rango: dateRange,
      sectores: sectors,
      ejemplo: sample,
      testDate19Jan: testData,
      primeraFecha: anyDate
    });
  } catch (error) {
    console.error('❌ Error en debug-sectores:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calidad/sectores-resumen - Metros revisados por sector (similar al VBA)
app.get('/api/calidad/sectores-resumen', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['date', 'monthStart', 'monthEnd']);
    const { date, monthStart, monthEnd } = params;

    if (!date) {
      return res.status(400).json({ error: 'Se requiere parámetro "date" (formato YYYY-MM-DD)' });
    }

    // Las fechas en tb_CALIDAD están en formato YYYY-MM-DD HH:MM:SS
    // Usar LIKE para comparar solo la parte de fecha
    const datePattern = date.split('T')[0]; // Obtener solo YYYY-MM-DD si viene con T
    
    // Usar monthStart y monthEnd si se proporcionan, si no calcular mes actual
    const [year, month] = datePattern.split('-');
    const mesInicio = monthStart || `${year}-${month}-01`;
    const mesFin = monthEnd || `${year}-${month}-${new Date(year, month, 0).getDate()}`;

    console.log(`🔍 Consultando sectores para fecha: ${datePattern}, mes: ${mesInicio} a ${mesFin}`);

    const sql = `
      WITH Sectores AS (
        -- Tabla de sectores con su número de orden y porcentaje meta
        SELECT 
          'S/ Def.' AS SECTOR,
          1 AS NRO,
          95.5 AS PORCENTAJE_META
        UNION ALL
        SELECT 'FIACAO', 2, 0.15
        UNION ALL
        SELECT 'INDIGO', 3, 1.4
        UNION ALL
        SELECT 'TECELAGEM', 4, 2.5
        UNION ALL
        SELECT 'ACABMTO', 5, 0.3
        UNION ALL
        SELECT 'GERAL', 6, 0.15
      ),
      CalidadDia AS (
        -- Metros por sector para el día especificado
        -- Comparar solo la parte YYYY-MM-DD de DAT_PROD
        SELECT 
          GRP_DEF AS SECTOR,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS
        FROM tb_CALIDAD
        WHERE EMP = 'STC'
          AND DATE(DAT_PROD) = DATE(?)
        GROUP BY GRP_DEF
      ),
      CalidadMes AS (
        -- Metros por sector acumulados en el mes
        -- Usar DATE() para comparar solo la parte de fecha
        SELECT 
          GRP_DEF AS SECTOR,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS
        FROM tb_CALIDAD
        WHERE EMP = 'STC'
          AND DATE(DAT_PROD) >= DATE(?)
          AND DATE(DAT_PROD) <= DATE(?)
        GROUP BY GRP_DEF
      )
      SELECT 
        s.SECTOR,
        COALESCE(d.METROS, 0) AS metrosDia,
        COALESCE(m.METROS, 0) AS metrosMes,
        s.PORCENTAJE_META AS metaPct
      FROM Sectores s
      LEFT JOIN CalidadDia d ON s.SECTOR = d.SECTOR
      LEFT JOIN CalidadMes m ON s.SECTOR = m.SECTOR
      ORDER BY s.NRO ASC
    `;

    const rows = await dbAll(sql, [datePattern, mesInicio, mesFin]);
    console.log(`📊 Resultados para ${datePattern}:`, rows.map(r => `${r.SECTOR}: ${r.metrosDia}m`).join(', '));
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/calidad/sectores-resumen:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/produccion/eficiencia-roturas - Eficiencias y Roturas de Trama (similar al gráfico Excel)
app.get('/api/produccion/eficiencia-roturas', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['date', 'trama', 'monthStart', 'monthEnd']);
    const { date, trama, monthStart, monthEnd } = params;

    if (!date) {
      return res.status(400).json({ error: 'Se requiere parámetro "date" (formato YYYY-MM-DD)' });
    }

    // Usar monthStart y monthEnd si están presentes, sino usar el mes completo
    const [year, month, day] = date.split('-');
    const startDate = monthStart || `${year}-${month}-01`;
    const endDate = monthEnd || date;

    console.log(`🔍 Consultando eficiencias y roturas desde ${startDate} hasta ${endDate}, trama: ${trama || 'todas'}`);

    // Construir filtro de trama si se especifica
    const tramaFilter = trama ? `AND "TRAMA REDUZIDA 1" = ?` : '';
    const queryParams = trama 
      ? [startDate, endDate, trama] 
      : [startDate, endDate];

    // DT_BASE_PRODUCAO está en formato DD/MM/YYYY
    const sql = `
      SELECT 
        -- Convertir DD/MM/YYYY a YYYY-MM-DD para el resultado
        substr(DT_BASE_PRODUCAO, 7, 4) || '-' || 
        substr(DT_BASE_PRODUCAO, 4, 2) || '-' || 
        substr(DT_BASE_PRODUCAO, 1, 2) AS fecha,
        "TRAMA REDUZIDA 1" AS trama,
        ROUND(
          (SUM(COALESCE(PONTOS_LIDOS, 0)) * 100.0) / NULLIF(SUM(COALESCE("PONTOS_100%", 0)), 0)
        , 1) AS eficiencia,
        ROUND(
          (SUM(COALESCE("PARADA TEC TRAMA", 0)) * 100000.0) / NULLIF((SUM(COALESCE(PONTOS_LIDOS, 0)) * 1000), 0)
        , 1) AS rt105
      FROM tb_PRODUCCION
      WHERE FILIAL = '05'
        AND SELETOR = 'TECELAGEM'
        AND (
          substr(DT_BASE_PRODUCAO, 7, 4) || '-' || 
          substr(DT_BASE_PRODUCAO, 4, 2) || '-' || 
          substr(DT_BASE_PRODUCAO, 1, 2)
        ) >= ?
        AND (
          substr(DT_BASE_PRODUCAO, 7, 4) || '-' || 
          substr(DT_BASE_PRODUCAO, 4, 2) || '-' || 
          substr(DT_BASE_PRODUCAO, 1, 2)
        ) <= ?
        ${tramaFilter}
      GROUP BY fecha, "TRAMA REDUZIDA 1"
      ORDER BY fecha ASC
    `;

    const rows = await dbAll(sql, queryParams);
    console.log(`📊 Resultados encontrados: ${rows.length} días (desde ${startDate} hasta ${endDate})`);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/produccion/eficiencia-roturas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calidad/historico-global - Análisis histórico mensual GLOBAL (todos los revisores)
app.get('/api/calidad/historico-global', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['startDate', 'endDate', 'tramas']);
    const { startDate, endDate, tramas } = params;

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
    const params = validateQueryParams(req, ['articulo', 'fecha_inicial', 'fecha_final']);
    const { articulo, fecha_inicial, fecha_final } = params;

    if (!articulo) {
      return res.status(400).json({ error: 'Parámetro "articulo" requerido' });
    }
    if (!fecha_inicial) {
      return res.status(400).json({ error: 'Parámetro "fecha_inicial" requerido' });
    }

    // Convertir fechas a formato compatible con SQLite
    const fechaInicio = `${fecha_inicial} 00:00:00`;
    const fechaFin = fecha_final ? `${fecha_final} 23:59:59` : '9999-12-31 23:59:59';
    
    const fechaInicioShort = fecha_inicial;
    const fechaFinShort = fecha_final || '9999-12-31';

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
          AND DT_PROD >= ?
          AND DT_PROD <= ?
      ),
      
      -- Subconsulta CALIDAD (agregada por PARTIDA)
      -- IMPORTANTE: Convertir formato europeo (1.980,00) a numérico (1980.00)
      CALIDAD AS (
        SELECT 
          MIN(DAT_PROD) AS DAT_PROD,
          ARTIGO AS ART_CAL,
          CAST(PARTIDA AS INTEGER) AS PARTIDA,
          ROUND(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) AS METRAGEM,
          ROUND(AVG(LARGURA), 1) AS LARGURA,
          ROUND(AVG("GR/M2"), 1) AS "GR/M2"
        FROM tb_CALIDAD
        WHERE ARTIGO = ?
          AND DAT_PROD >= ?
          AND DAT_PROD <= ?
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
          CAST(REPLACE("LARGURA MIN", ',', '.') AS REAL) AS LARGURA_MIN_VAL,
          CAST(REPLACE(LARGURA, ',', '.') AS REAL) AS ANCHO,
          CAST(REPLACE("LARGURA MAX", ',', '.') AS REAL) AS LARGURA_MAX_VAL,
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
        TC.DT_PROD AS Fecha,
        TC.APROV AS Ap,
        TC.OBS AS Obs,
        TC.REPROCESSO AS R,
        ROUND(TC.METRAGEM, 0) AS Metros_TEST,
        ROUND(TC.CALIDAD_METRAGEM, 0) AS Metros_MESA,
        
        ROUND(TC.CALIDAD_LARGURA, 1) AS Ancho_MESA,
        
        ROUND(CASE 
          WHEN E.LARGURA_MIN_VAL < (E.ANCHO * 0.5) THEN E.ANCHO - E.LARGURA_MIN_VAL
          ELSE E.LARGURA_MIN_VAL
        END, 1) AS Ancho_MIN,
        
        ROUND(E.ANCHO, 1) AS Ancho_STD,
        
        ROUND(CASE 
          WHEN E.LARGURA_MAX_VAL < (E.ANCHO * 0.5) THEN E.ANCHO + E.LARGURA_MAX_VAL
          ELSE E.LARGURA_MAX_VAL
        END, 1) AS Ancho_MAX,
        
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
      ORDER BY TC.DT_PROD;
    `;

    const rows = await dbAll(sql, [articulo, fechaInicioShort, fechaFinShort, articulo, fechaInicio, fechaFin, articulo]);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/analisis-mesa-test:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Residuos de INDIGO y TEJEDURIA
// =====================================================================
app.get('/api/residuos-indigo-tejeduria', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['fecha_inicio', 'fecha_fin']);
    const { fecha_inicio, fecha_fin } = params;
    
    // Filtro de fechas opcional (si no se envían, trae todo)
    let dateFilter = '';
    let produccionWhere = "WHERE P.SELETOR = 'INDIGO'";
    let tejeduriaWhere = "WHERE P.SELETOR = 'TECELAGEM'";
    let residuosWhere = "WHERE DESCRICAO = 'ESTOPA AZUL'";
    let residuosTejeduriaWhere = "WHERE DESCRICAO = 'ESTOPA AZUL TEJEDURÍA'";
    let anudadosWhere = "WHERE MOTIVO = 101";
    let prensadaWhere = "WHERE DESCRICAO = 'ESTOPA AZUL'";
    
    const queryParams = [];
    
    if (fecha_inicio && fecha_fin) {
      // Convertir DD/MM/YYYY a YYYY-MM-DD para comparación
      // Se aplica sobre la fecha unificada D.Fecha
      dateFilter = `
        WHERE (substr(D.Fecha, 7, 4) || '-' || substr(D.Fecha, 4, 2) || '-' || substr(D.Fecha, 1, 2)) >= ?
        AND (substr(D.Fecha, 7, 4) || '-' || substr(D.Fecha, 4, 2) || '-' || substr(D.Fecha, 1, 2)) <= ?
      `;
      
      // Filtros para las CTEs (Push Down Predicates)
      const dateCondition = `
        AND (substr(DT_BASE_PRODUCAO, 7, 4) || '-' || substr(DT_BASE_PRODUCAO, 4, 2) || '-' || substr(DT_BASE_PRODUCAO, 1, 2)) >= ?
        AND (substr(DT_BASE_PRODUCAO, 7, 4) || '-' || substr(DT_BASE_PRODUCAO, 4, 2) || '-' || substr(DT_BASE_PRODUCAO, 1, 2)) <= ?
      `;
      
      const residuosDateCondition = `
        AND (substr(DT_MOV, 7, 4) || '-' || substr(DT_MOV, 4, 2) || '-' || substr(DT_MOV, 1, 2)) >= ?
        AND (substr(DT_MOV, 7, 4) || '-' || substr(DT_MOV, 4, 2) || '-' || substr(DT_MOV, 1, 2)) <= ?
      `;

      const anudadosDateCondition = `
        AND (substr(DATA_BASE, 7, 4) || '-' || substr(DATA_BASE, 4, 2) || '-' || substr(DATA_BASE, 1, 2)) >= ?
        AND (substr(DATA_BASE, 7, 4) || '-' || substr(DATA_BASE, 4, 2) || '-' || substr(DATA_BASE, 1, 2)) <= ?
      `;

      produccionWhere += dateCondition.replace(/DT_BASE_PRODUCAO/g, 'P.DT_BASE_PRODUCAO');
      tejeduriaWhere += dateCondition.replace(/DT_BASE_PRODUCAO/g, 'P.DT_BASE_PRODUCAO');
      residuosWhere += residuosDateCondition;
      residuosTejeduriaWhere += residuosDateCondition;
      anudadosWhere += anudadosDateCondition;
      prensadaWhere += residuosDateCondition;

      // Params for CTEs
      queryParams.push(fecha_inicio, fecha_fin); // ProduccionDiaria
      queryParams.push(fecha_inicio, fecha_fin); // TejeduriaProduccion
      queryParams.push(fecha_inicio, fecha_fin); // ResiduosDiarios
      queryParams.push(fecha_inicio, fecha_fin); // ResiduosTejeduria
      queryParams.push(fecha_inicio, fecha_fin); // AnudadosDiarios
      queryParams.push(fecha_inicio, fecha_fin); // ResiduosPrensada
      
      // Params for outer query
      queryParams.push(fecha_inicio, fecha_fin);
    }

    const sql = `
      WITH FichasUnique AS (
          SELECT 
              URDUME, 
              MAX(CAST(REPLACE(REPLACE([CONS#URD/m], '.', ''), ',', '.') AS REAL)) AS Consumo,
              AVG(CAST(REPLACE(REPLACE([ENC#TEC#URDUME], '.', ''), ',', '.') AS REAL)) AS Sizing
          FROM tb_FICHAS 
          WHERE [CONS#URD/m] IS NOT NULL AND [CONS#URD/m] != '0,00'
          GROUP BY URDUME
      ),
      FichasArtigo AS (
          SELECT 
              URDUME, 
              ARTIGO,
              MAX(CAST(REPLACE(REPLACE([CONS#URD/m], '.', ''), ',', '.') AS REAL)) AS Consumo,
              AVG(CAST(REPLACE(REPLACE([ENC#TEC#URDUME], '.', ''), ',', '.') AS REAL)) AS Sizing
          FROM tb_FICHAS 
          WHERE [CONS#URD/m] IS NOT NULL AND [CONS#URD/m] != '0,00'
          GROUP BY URDUME, ARTIGO
      ),
      ProduccionDiaria AS (
          SELECT 
              P.DT_BASE_PRODUCAO as Fecha,
              SUM(CAST(REPLACE(REPLACE(P.METRAGEM, '.', ''), ',', '.') AS REAL)) as TotalMetros,
              (SUM(CAST(REPLACE(REPLACE(P.METRAGEM, '.', ''), ',', '.') AS REAL) * F.Consumo) / 1000.0) * 0.98 as TotalKg
          FROM tb_PRODUCCION P
          JOIN FichasUnique F ON TRIM(P.[BASE URDUME]) = F.URDUME
          ${produccionWhere}
          GROUP BY P.DT_BASE_PRODUCAO
      ),
      TejeduriaRaw AS (
          SELECT 
              P.DT_BASE_PRODUCAO,
              MAX(CAST(REPLACE(REPLACE(P.METRAGEM, '.', ''), ',', '.') AS REAL)) as Metros,
              MAX(COALESCE(FA.Consumo, FU.Consumo)) as Consumo,
              MAX(COALESCE(FA.Sizing, FU.Sizing, 0)) as Sizing
          FROM tb_PRODUCCION P
          LEFT JOIN FichasArtigo FA ON TRIM(P.[BASE URDUME]) = FA.URDUME AND P.ARTIGO LIKE FA.ARTIGO || '%'
          LEFT JOIN FichasUnique FU ON TRIM(P.[BASE URDUME]) = FU.URDUME
          ${tejeduriaWhere}
          GROUP BY P.rowid
      ),
      TejeduriaProduccion AS (
          SELECT 
              DT_BASE_PRODUCAO as Fecha,
              SUM(Metros) as TejeduriaMetros,
              SUM(Metros * Consumo / (1 - (Sizing / 100.0))) / 1000.0 as TejeduriaKg
          FROM TejeduriaRaw
          GROUP BY DT_BASE_PRODUCAO
      ),
      ResiduosDiarios AS (
          SELECT 
              DT_MOV as Fecha,
              SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)) as ResiduosKg
          FROM tb_RESIDUOS_INDIGO
          ${residuosWhere}
          GROUP BY DT_MOV
      ),
      ResiduosTejeduria AS (
          SELECT 
              DT_MOV as Fecha,
              SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)) as ResiduosTejeduriaKg
          FROM tb_RESIDUOS_POR_SECTOR
          ${residuosTejeduriaWhere}
          GROUP BY DT_MOV
      ),
      AnudadosDiarios AS (
          SELECT 
              DATA_BASE as Fecha,
              COUNT(*) as AnudadosCount
          FROM tb_PARADAS
          ${anudadosWhere}
          GROUP BY DATA_BASE
      ),
      ResiduosPrensada AS (
          SELECT 
              DT_MOV as Fecha,
              SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)) as ResiduosPrensadaKg
          FROM tb_RESIDUOS_POR_SECTOR
          ${prensadaWhere}
          GROUP BY DT_MOV
      ),
      AllDates AS (
          SELECT Fecha FROM ProduccionDiaria
          UNION
          SELECT Fecha FROM ResiduosDiarios
          UNION
          SELECT Fecha FROM TejeduriaProduccion
          UNION
          SELECT Fecha FROM ResiduosTejeduria
          UNION
          SELECT Fecha FROM AnudadosDiarios
          UNION
          SELECT Fecha FROM ResiduosPrensada
      )
      SELECT 
          D.Fecha as DT_BASE_PRODUCAO,
          COALESCE(P.TotalMetros, 0) as TotalMetros,
          COALESCE(P.TotalKg, 0) as TotalKg,
          COALESCE(R.ResiduosKg, 0) as ResiduosKg,
          COALESCE(T.TejeduriaMetros, 0) as TejeduriaMetros,
          COALESCE(T.TejeduriaKg, 0) as TejeduriaKg,
          COALESCE(RT.ResiduosTejeduriaKg, 0) as ResiduosTejeduriaKg,
          COALESCE(A.AnudadosCount, 0) as AnudadosCount,
          COALESCE(RP.ResiduosPrensadaKg, 0) as ResiduosPrensadaKg
      FROM AllDates D
      LEFT JOIN ProduccionDiaria P ON D.Fecha = P.Fecha
      LEFT JOIN ResiduosDiarios R ON D.Fecha = R.Fecha
      LEFT JOIN TejeduriaProduccion T ON D.Fecha = T.Fecha
      LEFT JOIN ResiduosTejeduria RT ON D.Fecha = RT.Fecha
      LEFT JOIN AnudadosDiarios A ON D.Fecha = A.Fecha
      LEFT JOIN ResiduosPrensada RP ON D.Fecha = RP.Fecha
      ${dateFilter}
      ORDER BY 
        substr(D.Fecha, 7, 4) ASC, 
        substr(D.Fecha, 4, 2) ASC, 
        substr(D.Fecha, 1, 2) ASC;
    `;

    const rows = await dbAll(sql, queryParams);
    res.json(rows);
  } catch (error) {
    console.error('Error en /api/residuos-indigo-tejeduria:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Detalle de Residuos por Fecha
// =====================================================================
// GET /api/detalle-residuos?fecha=DD/MM/YYYY
app.get('/api/detalle-residuos', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['fecha']);
    const { fecha } = params;
    
    if (!fecha) {
      return res.status(400).json({ error: 'Parámetro "fecha" requerido (formato DD/MM/YYYY)' });
    }

    const sql = `
      SELECT 
        DT_MOV,
        TURNO,
        SUBPRODUTO,
        DESCRICAO,
        ID,
        [PESO LIQUIDO (KG)],
        PARTIDA,
        ROLADA,
        MOTIVO,
        DESC_MOTIVO,
        URDUME,
        [PE DE ROLO],
        INDIGO,
        GAIOLA,
        OBS
      FROM tb_RESIDUOS_INDIGO
      WHERE DT_MOV = ?
      ORDER BY ID ASC
    `;

    const rows = await dbAll(sql, [fecha]);
    res.json(rows);
  } catch (error) {
    console.error('Error en /api/detalle-residuos:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Detalle de Residuos por Sector (Por Fecha)
// =====================================================================
// GET /api/detalle-residuos-sector?fecha=DD/MM/YYYY
app.get('/api/detalle-residuos-sector', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['fecha']);
    const { fecha } = params;
    
    if (!fecha) {
      return res.status(400).json({ error: 'Parámetro "fecha" requerido (formato DD/MM/YYYY)' });
    }

    const sql = `
      SELECT 
        DT_MOV,
        TURNO,
        SUBPRODUTO,
        DESCRICAO,
        ID,
        [PESO LIQUIDO (KG)],
        OBS
      FROM tb_RESIDUOS_POR_SECTOR
      WHERE DT_MOV = ? AND DESC_SETOR = 'TECELAGEM'
      ORDER BY ID ASC
    `;

    const rows = await dbAll(sql, [fecha]);
    res.json(rows);
  } catch (error) {
    console.error('Error en /api/detalle-residuos-sector:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Análisis de Residuos Índigo por Motivo
// =====================================================================
// GET /api/residuos-indigo-analisis?fecha_inicio=DD/MM/YYYY&fecha_fin=DD/MM/YYYY
app.get('/api/residuos-indigo-analisis', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['fecha_inicio', 'fecha_fin']);
    const { fecha_inicio, fecha_fin } = params;
    
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Parámetros "fecha_inicio" y "fecha_fin" requeridos (formato DD/MM/YYYY)' });
    }

    // Convertir DD/MM/YYYY a YYYY-MM-DD para comparación
    const [diaIni, mesIni, anioIni] = fecha_inicio.split('/');
    const [diaFin, mesFin, anioFin] = fecha_fin.split('/');
    const fechaIniISO = `${anioIni}-${mesIni}-${diaIni}`;
    const fechaFinISO = `${anioFin}-${mesFin}-${diaFin}`;

    const sql = `
      SELECT 
        MOTIVO,
        DESC_MOTIVO,
        SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)) as TotalKg
      FROM tb_RESIDUOS_INDIGO
      WHERE TRIM(DESCRICAO) = 'ESTOPA AZUL'
        AND (
          substr(DT_MOV, 7, 4) || '-' || substr(DT_MOV, 4, 2) || '-' || substr(DT_MOV, 1, 2)
          BETWEEN ? AND ?
        )
      GROUP BY MOTIVO, DESC_MOTIVO
      HAVING TotalKg > 0
      ORDER BY TotalKg DESC
    `;

    const rows = await dbAll(sql, [fechaIniISO, fechaFinISO]);
    console.log(`📊 Residuos Índigo: ${rows.length} motivos encontrados para ${fecha_inicio} a ${fecha_fin}`);
    res.json(rows);
  } catch (error) {
    console.error('Error en /api/residuos-indigo-analisis:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Resumen de Residuos Índigo (temporal para análisis)
// =====================================================================
// GET /api/residuos-indigo-resumen
app.get('/api/residuos-indigo-resumen', async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('📋 RESUMEN DE tb_RESIDUOS_INDIGO');
    console.log('========================================\n');

    // 1. Elementos únicos de DT_BASE_PRODUCAO
    const fechasQuery = `
      SELECT DISTINCT DT_BASE_PRODUCAO 
      FROM tb_RESIDUOS_INDIGO 
      WHERE SELETOR = 'INDIGO'
      ORDER BY DT_BASE_PRODUCAO
    `;
    const fechas = await dbAll(fechasQuery);
    console.log(`📅 DT_BASE_PRODUCAO (elementos únicos): ${fechas.length}`);
    console.log(`   Desde: ${fechas[0]?.DT_BASE_PRODUCAO || 'N/A'}`);
    console.log(`   Hasta: ${fechas[fechas.length - 1]?.DT_BASE_PRODUCAO || 'N/A'}\n`);

    // 2. Elementos únicos de PARTIDA
    const partidasQuery = `
      SELECT DISTINCT PARTIDA 
      FROM tb_RESIDUOS_INDIGO 
      WHERE SELETOR = 'INDIGO'
      ORDER BY PARTIDA
    `;
    const partidas = await dbAll(partidasQuery);
    console.log(`📦 PARTIDA (elementos únicos): ${partidas.length}`);
    console.log(`   Ejemplos: ${partidas.slice(0, 5).map(p => p.PARTIDA).join(', ')}\n`);

    // 3. Elementos únicos de S
    const sQuery = `
      SELECT DISTINCT S 
      FROM tb_RESIDUOS_INDIGO 
      WHERE SELETOR = 'INDIGO'
      ORDER BY S
    `;
    const sValues = await dbAll(sQuery);
    console.log(`🔤 S (elementos únicos): ${sValues.length}`);
    console.log(`   Valores: ${sValues.map(s => s.S || 'NULL').join(', ')}\n`);

    // 4. Conteo por elementos de la columna S
    const sCountQuery = `
      SELECT 
        S,
        COUNT(*) as Cantidad,
        SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)) as TotalKg
      FROM tb_RESIDUOS_INDIGO 
      WHERE SELETOR = 'INDIGO'
      GROUP BY S
      ORDER BY Cantidad DESC
    `;
    const sCounts = await dbAll(sCountQuery);
    console.log('📊 CONTEO POR COLUMNA S:');
    console.log('   Valor S          | Cantidad | Total Kg');
    console.log('   -----------------|----------|----------');
    sCounts.forEach(row => {
      const sValue = (row.S || 'NULL').padEnd(16);
      const cantidad = String(row.Cantidad).padStart(8);
      const kg = String(Math.round(row.TotalKg)).padStart(8);
      console.log(`   ${sValue} | ${cantidad} | ${kg}`);
    });

    // 5. Total general con SELETOR = INDIGO
    const totalQuery = `
      SELECT 
        COUNT(*) as TotalRegistros,
        SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)) as TotalKg
      FROM tb_RESIDUOS_INDIGO 
      WHERE SELETOR = 'INDIGO'
    `;
    const total = await dbGet(totalQuery);
    console.log('\n📈 TOTAL GENERAL (SELETOR = INDIGO):');
    console.log(`   Registros: ${total.TotalRegistros}`);
    console.log(`   Total Kg: ${Math.round(total.TotalKg)}\n`);
    console.log('========================================\n');

    res.json({
      fechas: fechas.length,
      partidas: partidas.length,
      sValues: sValues.length,
      sConteo: sCounts,
      total: total
    });
  } catch (error) {
    console.error('Error en /api/residuos-indigo-resumen:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Residuos ESTOPA AZUL por Mes (últimos 12 meses)
// =====================================================================
// GET /api/residuos-indigo-estopa-por-mes
app.get('/api/residuos-indigo-estopa-por-mes', async (req, res) => {
  try {
    const sql = `
      WITH MesesRecientes AS (
        SELECT DISTINCT 
          strftime('%Y-%m', 
            substr(DT_MOV, 7, 4) || '-' || substr(DT_MOV, 4, 2) || '-' || substr(DT_MOV, 1, 2)
          ) AS Mes
        FROM tb_RESIDUOS_INDIGO
        WHERE TRIM(DESCRICAO) = 'ESTOPA AZUL'
        ORDER BY Mes DESC
        LIMIT 12
      ),
      ResiduesPorMes AS (
        SELECT 
          strftime('%Y-%m', 
            substr(DT_MOV, 7, 4) || '-' || substr(DT_MOV, 4, 2) || '-' || substr(DT_MOV, 1, 2)
          ) AS Mes,
          SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)) as KgResiduo
        FROM tb_RESIDUOS_INDIGO
        WHERE TRIM(DESCRICAO) = 'ESTOPA AZUL'
          AND strftime('%Y-%m', 
            substr(DT_MOV, 7, 4) || '-' || substr(DT_MOV, 4, 2) || '-' || substr(DT_MOV, 1, 2)
          ) IN (SELECT Mes FROM MesesRecientes)
        GROUP BY Mes
      )
      SELECT 
        rpm.Mes,
        CAST(ROUND(rpm.KgResiduo, 0) AS INTEGER) as KgResiduo
      FROM ResiduesPorMes rpm
      ORDER BY Mes ASC
    `;

    const rows = await dbAll(sql);
    res.json(rows);
  } catch (error) {
    console.error('Error en /api/residuos-indigo-estopa-por-mes:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Residuos ESTOPA AZUL por Día de un rango de fechas
// =====================================================================
// GET /api/residuos-indigo-estopa-por-dia?fecha_inicio=DD/MM/YYYY&fecha_fin=DD/MM/YYYY
app.get('/api/residuos-indigo-estopa-por-dia', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['fecha_inicio', 'fecha_fin']);
    const { fecha_inicio, fecha_fin } = params;
    
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Parámetros "fecha_inicio" y "fecha_fin" requeridos (formato DD/MM/YYYY)' });
    }

    // Convertir DD/MM/YYYY a YYYY-MM-DD para comparación
    const [diaIni, mesIni, anioIni] = fecha_inicio.split('/');
    const [diaFin, mesFin, anioFin] = fecha_fin.split('/');
    const fechaIniISO = `${anioIni}-${mesIni}-${diaIni}`;
    const fechaFinISO = `${anioFin}-${mesFin}-${diaFin}`;

    const sql = `
      SELECT 
        DT_MOV as Fecha,
        CAST(ROUND(SUM(CAST(REPLACE(REPLACE([PESO LIQUIDO (KG)], '.', ''), ',', '.') AS REAL)), 0) AS INTEGER) as KgResiduo
      FROM tb_RESIDUOS_INDIGO
      WHERE TRIM(DESCRICAO) = 'ESTOPA AZUL'
        AND (
          substr(DT_MOV, 7, 4) || '-' || substr(DT_MOV, 4, 2) || '-' || substr(DT_MOV, 1, 2)
          BETWEEN ? AND ?
        )
      GROUP BY DT_MOV
      ORDER BY 
        substr(DT_MOV, 7, 4) ASC,
        substr(DT_MOV, 4, 2) ASC,
        substr(DT_MOV, 1, 2) ASC
    `;

    const rows = await dbAll(sql, [fechaIniISO, fechaFinISO]);
    res.json(rows);
  } catch (error) {
    console.error('Error en /api/residuos-indigo-estopa-por-dia:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT TEMPORAL - Resumen tb_PRODUCCION con SELETOR=INDIGO
// =====================================================================
app.get('/api/produccion-indigo-resumen', async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Faltan parámetros fecha_inicio y fecha_fin (formato DD/MM/YYYY)' });
    }
    
    // Convertir fechas DD/MM/YYYY a YYYY-MM-DD para comparación
    const convertirFecha = (fecha) => {
      const [dia, mes, año] = fecha.split('/');
      return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    };
    
    const fechaInicioISO = convertirFecha(fecha_inicio);
    const fechaFinISO = convertirFecha(fecha_fin);
    
    console.log(`\n📊 ===== RESUMEN tb_PRODUCCION (SELETOR=INDIGO) ${fecha_inicio} - ${fecha_fin} =====\n`);
    
    // Columna S - elementos únicos y cuenta (con filtro de fechas)
    const sUnicos = await dbAll(`
      SELECT DISTINCT S, COUNT(*) as count
      FROM tb_PRODUCCION 
      WHERE SELETOR = 'INDIGO' 
        AND S IS NOT NULL
        AND (
          substr(DT_BASE_PRODUCAO, 7, 4) || '-' || 
          substr(DT_BASE_PRODUCAO, 4, 2) || '-' || 
          substr(DT_BASE_PRODUCAO, 1, 2)
        ) BETWEEN '${fechaInicioISO}' AND '${fechaFinISO}'
      GROUP BY S
      ORDER BY count DESC
    `);
    
    console.log(`\n✓ Valores únicos en columna S (período seleccionado): ${sUnicos.length}`);
    console.log('\n📋 Cuenta por elementos de columna S:');
    sUnicos.forEach(item => {
      console.log(`   "${item.S}": ${item.count} registros`);
    });
    
    console.log('\n===================================================\n');
    
    res.json({
      s_valores: sUnicos
    });
  } catch (error) {
    console.error('Error en resumen produccion-indigo:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Lista de Artículos para Análisis Mesa Test
// =====================================================================
// GET /api/articulos-mesa-test?fecha_inicial=YYYY-MM-DD&fecha_final=YYYY-MM-DD
app.get('/api/articulos-mesa-test', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['fecha_inicial', 'fecha_final']);
    const { fecha_inicial, fecha_final } = params;

    if (!fecha_inicial) {
      return res.status(400).json({ error: 'Parámetro "fecha_inicial" requerido' });
    }

    const fechaInicioFull = `${fecha_inicial} 00:00:00`;
    const fechaFinFull = fecha_final ? `${fecha_final} 23:59:59` : '2099-12-31 23:59:59';
    
    const fechaInicioShort = fecha_inicial;
    const fechaFinShort = fecha_final || '2099-12-31';

    // SQL optimizado para listar artículos con métricas agregadas
    // NOTA: Se eliminó DATE() en WHERE para usar índices (idx_calidad_dat_prod, idx_testes_dt_prod)
    // OPTIMIZACIÓN: Usar MATERIALIZED CTEs para evitar escanear las tablas múltiples veces
    const sql = `
      -- Métricas de CALIDAD (directo, excluir artículos sin TRAMA)
      -- IMPORTANTE: Convertir formato europeo (1.980,00) a numérico (1980.00)
      WITH MetricasCalidad AS MATERIALIZED (
        SELECT 
          ARTIGO,
          ROUND(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) AS METROS_REV
        FROM tb_CALIDAD
        WHERE DAT_PROD >= ? AND DAT_PROD <= ?
          AND TRAMA IS NOT NULL
        GROUP BY ARTIGO
      ),
      
      -- Métricas de TESTES (AVG por PARTIDA primero para evitar duplicados)
      -- IMPORTANTE: Convertir formato europeo (1.980,00) a numérico (1980.00)
      MetricasTestes AS MATERIALIZED (
        SELECT 
          ARTIGO,
          ROUND(SUM(METRAGEM_AVG), 0) AS METROS_TEST
        FROM (
          SELECT 
            ARTIGO,
            PARTIDA,
            AVG(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM_AVG
          FROM tb_TESTES
          WHERE DT_PROD >= ? AND DT_PROD <= ?
          GROUP BY ARTIGO, PARTIDA
        )
        GROUP BY ARTIGO
      ),

      -- Obtener lista única de artículos desde las métricas ya calculadas (sin volver a escanear tablas)
      AllArtigos AS (
        SELECT ARTIGO FROM MetricasCalidad
        UNION 
        SELECT ARTIGO FROM MetricasTestes
      )
      
      -- SELECT FINAL con JOIN a tb_FICHAS
      SELECT 
        AU.ARTIGO AS ARTIGO_COMPLETO,
        SUBSTR(AU.ARTIGO, 1, 10) AS Articulo,
        SUBSTR(AU.ARTIGO, 7, 2) AS Id,
        F.COR AS Color,
        F."NOME DE MERCADO" AS Nombre,
        F."TRAMA REDUZIDO" AS Trama,
        F."PRODUCAO" AS Prod,
        COALESCE(MT.METROS_TEST, 0) AS Metros_TEST,
        COALESCE(MC.METROS_REV, 0) AS Metros_REV
      FROM AllArtigos AU
      LEFT JOIN MetricasTestes MT ON AU.ARTIGO = MT.ARTIGO
      LEFT JOIN MetricasCalidad MC ON AU.ARTIGO = MC.ARTIGO
      LEFT JOIN tb_FICHAS F ON AU.ARTIGO = F."ARTIGO CODIGO"
      WHERE F."TRAMA REDUZIDO" IS NOT NULL
      ORDER BY AU.ARTIGO;
    `;

    const rows = await dbAll(sql, [
      fechaInicioFull, fechaFinFull,   // MetricasCalidad
      fechaInicioShort, fechaFinShort  // MetricasTestes
    ]);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/articulos-mesa-test:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Consulta ROLADA TECELAGEM (TEJEDURÍA)
// =====================================================================
app.get('/api/consulta-rolada-tecelagem', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['rolada']);
    const { rolada } = params;
    
    if (!rolada) {
      return res.status(400).json({ error: 'Parámetro ROLADA requerido' });
    }

    const sql = `
      SELECT 
        PARTIDA,
        MIN(DT_INICIO || ' ' || HORA_INICIO) AS FECHA_INICIAL,
        MAX(DT_FINAL || ' ' || HORA_FINAL) AS FECHA_FINAL,
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM,
        MAQUINA,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL)) > 0 
          THEN SUM(CAST(REPLACE(REPLACE("PONTOS_LIDOS", '.', ''), ',', '.') AS REAL)) / 
               SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL)) * 100 
          ELSE 0 
        END AS EFICIENCIA,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE("PONTOS_LIDOS", '.', ''), ',', '.') AS REAL)) > 0 
          THEN (SUM(CAST(COALESCE("PARADA TEC TRAMA", 0) AS INTEGER)) * 100000.0) / 
               (SUM(CAST(REPLACE(REPLACE("PONTOS_LIDOS", '.', ''), ',', '.') AS REAL)) * 1000) 
          ELSE 0 
        END AS ROTURAS_TRA_105,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE("PONTOS_LIDOS", '.', ''), ',', '.') AS REAL)) > 0 
          THEN (SUM(CAST(COALESCE("PARADA TEC URDUME", 0) AS INTEGER)) * 100000.0) / 
               (SUM(CAST(REPLACE(REPLACE("PONTOS_LIDOS", '.', ''), ',', '.') AS REAL)) * 1000) 
          ELSE 0 
        END AS ROTURAS_URD_105,
        substr(ARTIGO, 1, 10) AS ARTIGO,
        COR,
        "NM MERCADO" AS NM_MERCADO,
        "TRAMA REDUZIDA 1" AS TRAMA,
        AVG(CAST(BATIDAS AS REAL)) AS PASADAS,
        CASE 
          WHEN SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) > 0 
          THEN SUM(CAST(REPLACE(REPLACE(COALESCE("RPM LEITURA", '0'), '.', ''), ',', '.') AS REAL) * 
                   CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) / 
               SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) 
          ELSE 0 
        END AS RPM
      FROM tb_PRODUCCION
      WHERE SELETOR = 'TECELAGEM'
        AND ROLADA = ?
      GROUP BY PARTIDA, MAQUINA, ARTIGO, COR, "NM MERCADO", "TRAMA REDUZIDA 1"
      ORDER BY substr(PARTIDA, -6), PARTIDA
    `;

    const rows = await dbAll(sql, [rolada]);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/consulta-rolada-tecelagem:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Consulta DETALLE PARTIDA TECELAGEM
// =====================================================================
app.get('/api/consulta-partida-tecelagem', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['partida', 'cor']);
    const { partida, cor } = params;
    
    if (!partida) {
      return res.status(400).json({ error: 'Parámetro PARTIDA requerido' });
    }

    // Determinar orden: ASC si COR tiene 3 chars, DESC si tiene 4
    const orden = (cor && cor.length === 4) ? 'DESC' : 'ASC';

    const sql = `
      SELECT 
        DT_BASE_PRODUCAO,
        TURNO,
        PARTIDA,
        CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) AS METRAGEM,
        CAST(COALESCE("PARADA TEC TRAMA", 0) AS INTEGER) AS PARADA_TRAMA,
        CAST(COALESCE("PARADA TEC URDUME", 0) AS INTEGER) AS PARADA_URDUME,
        CASE 
          WHEN CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL) > 0 
          THEN (CAST(REPLACE(REPLACE("PONTOS_LIDOS", '.', ''), ',', '.') AS REAL) / 
                CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL)) * 100 
          ELSE 0 
        END AS EFICIENCIA,
        CASE 
          WHEN CAST(REPLACE(REPLACE("PONTOS_LIDOS", '.', ''), ',', '.') AS REAL) > 0 
          THEN (CAST(COALESCE("PARADA TEC TRAMA", 0) AS INTEGER) * 100000.0) / 
               (CAST(REPLACE(REPLACE("PONTOS_LIDOS", '.', ''), ',', '.') AS REAL) * 1000) 
          ELSE 0 
        END AS ROTURAS_TRA_105,
        CASE 
          WHEN CAST(REPLACE(REPLACE("PONTOS_LIDOS", '.', ''), ',', '.') AS REAL) > 0 
          THEN (CAST(COALESCE("PARADA TEC URDUME", 0) AS INTEGER) * 100000.0) / 
               (CAST(REPLACE(REPLACE("PONTOS_LIDOS", '.', ''), ',', '.') AS REAL) * 1000) 
          ELSE 0 
        END AS ROTURAS_URD_105,
        CAST(BATIDAS AS REAL) AS BATIDAS,
        CAST(REPLACE(REPLACE(COALESCE("RPM LEITURA", '0'), '.', ''), ',', '.') AS REAL) AS RPM,
        substr(ARTIGO, 1, 10) AS ARTIGO,
        COR,
        "NM MERCADO" AS NM_MERCADO,
        "TRAMA REDUZIDA 1" AS TRAMA,
        MAQUINA,
        "GRUPO TEAR" AS GRUPO_TEAR,
        "BASE URDUME" AS BASE_URDUME
      FROM tb_PRODUCCION
      WHERE SELETOR = 'TECELAGEM'
        AND PARTIDA = ?
      ORDER BY DT_BASE_PRODUCAO ${orden}, TURNO ${orden}
    `;

    const rows = await dbAll(sql, [partida]);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/consulta-partida-tecelagem:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Consulta ROLADA CALIDAD
// =====================================================================
app.get('/api/consulta-rolada-calidad', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['rolada']);
    const { rolada } = params;
    
    if (!rolada) {
      return res.status(400).json({ error: 'Parámetro ROLADA requerido' });
    }

    const sql = `
      SELECT 
        PARTIDA,
        "ST IND" AS ST_IND,
        REPROCESSO,
        TEAR,
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM_TOTAL,
        SUM(CASE WHEN QUALIDADE = 'PRIMEIRA ' THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) AS METROS_1ERA,
        SUM(CASE WHEN QUALIDADE = 'SEGUNDA ' THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) AS METROS_2DA,
        SUM(CASE WHEN GRP_DEF = 'FIACAO' THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) AS METROS_2DA_HIL,
        SUM(CASE WHEN GRP_DEF = 'INDIGO' THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) AS METROS_2DA_IND,
        SUM(CASE WHEN GRP_DEF = 'TECELAGEM' THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) AS METROS_2DA_TE,
        SUM(CASE WHEN GRP_DEF = 'ACABMTO' THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) AS METROS_2DA_TEF,
        substr(ARTIGO, 1, 10) AS ARTIGO,
        COR,
        "NM MERC" AS NM_MERCADO,
        TRAMA
      FROM tb_CALIDAD
      WHERE substr(substr(PARTIDA, -6), 1, 4) = ?
      GROUP BY PARTIDA, TEAR, ARTIGO, COR, "NM MERC", TRAMA
      ORDER BY PARTIDA
    `;

    const rows = await dbAll(sql, [rolada]);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/consulta-rolada-calidad:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Consulta detalle CALIDAD por partida (sin agrupar)
// =====================================================================
app.get('/api/consulta-partida-calidad', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['partida']);
    const { partida } = params;
    
    if (!partida) {
      return res.status(400).json({ error: 'Parámetro PARTIDA requerido' });
    }

    const sql = `
      SELECT 
        GRP_DEF,
        COD_DE,
        DEFEITO,
        CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) AS METRAGEM,
        QUALIDADE,
        HORA,
        EMENDAS,
        "PEÇA" AS PECA,
        ETIQUETA,
        LARGURA,
        PONTUACAO,
        "REVISOR FINAL" AS REVISOR_FINAL
      FROM tb_CALIDAD
      WHERE PARTIDA = ?
      ORDER BY HORA ASC
    `;

    const rows = await dbAll(sql, [partida]);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/consulta-partida-calidad:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Consulta ROLADA ÍNDIGO
// =====================================================================
app.get('/api/consulta-rolada-indigo', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['rolada']);
    const { rolada } = params;
    
    if (!rolada) {
      return res.status(400).json({ error: 'Parámetro ROLADA requerido' });
    }

    const sql = `
      SELECT 
        ROLADA,
        DT_INICIO,
        HORA_INICIO,
        DT_FINAL,
        HORA_FINAL,
        TURNO,
        PARTIDA,
        ARTIGO,
        COR,
        CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) AS METRAGEM,
        CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL) AS VELOC,
        S,
        CAST(RUPTURAS AS INTEGER) AS RUPTURAS,
        CAST(REPLACE(REPLACE(CAVALOS, '.', ''), ',', '.') AS REAL) AS CAVALOS,
        OPERADOR,
        [NM OPERADOR] AS NM_OPERADOR
      FROM tb_PRODUCCION
      WHERE SELETOR = 'INDIGO'
        AND ROLADA = ?
      ORDER BY DT_INICIO, HORA_INICIO
    `;

    const rows = await dbAll(sql, [rolada]);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/consulta-rolada-indigo:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// ENDPOINT - Consulta ROLADA URDIMBRE
// =====================================================================
app.get('/api/consulta-rolada-urdimbre', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['rolada']);
    const { rolada } = params;
    
    if (!rolada) {
      return res.status(400).json({ error: 'Parámetro ROLADA requerido' });
    }

    const sql = `
      SELECT 
        PARTIDA,
        DT_INICIO,
        HORA_INICIO,
        DT_FINAL,
        HORA_FINAL,
        ARTIGO,
        CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) AS METRAGEM,
        CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL) AS VELOC,
        CAST(NUM_FIOS AS INTEGER) AS NUM_FIOS,
        CAST(REPLACE(REPLACE([RUP FIACAO], '.', ''), ',', '.') AS REAL) AS RUP_FIACAO,
        CAST(REPLACE(REPLACE([RUP URD], '.', ''), ',', '.') AS REAL) AS RUP_URD,
        CAST(REPLACE(REPLACE([RUP OPER], '.', ''), ',', '.') AS REAL) AS RUP_OPER,
        CAST(REPLACE(REPLACE(RUPTURAS, '.', ''), ',', '.') AS REAL) AS RUPTURAS,
        [NM OPERADOR] AS NM_OPERADOR,
        [LOTE FIACAO] AS LOTE_FIACAO,
        [MAQ  FIACAO] AS MAQ_FIACAO,
        [BASE URDUME] AS BASE_URDUME
      FROM tb_PRODUCCION
      WHERE SELETOR = 'URDIDEIRA'
        AND ROLADA = ?
      ORDER BY DT_INICIO, HORA_INICIO
    `;

    const rows = await dbAll(sql, [rolada]);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/consulta-rolada-urdimbre:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====================================
// 📊 INFORME PRODUCCIÓN INDIGO (ROLADAS DEL MES)
// ====================================
app.get('/api/informe-produccion-indigo', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['fechaInicio', 'fechaFin']);
    const { fechaInicio, fechaFin } = params;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Parámetros fechaInicio y fechaFin requeridos (formato: YYYY-MM-DD)' });
    }

    const sql = `
      WITH RoladaBase AS (
        SELECT 
          ROLADA,
          COR,
          MIN(substr(DT_INICIO, 7, 4) || '-' || 
              substr(DT_INICIO, 4, 2) || '-' || 
              substr(DT_INICIO, 1, 2)) AS FECHA_INICIO,
          ARTIGO
        FROM tb_PRODUCCION
        WHERE SELETOR = 'INDIGO'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA, COR, ARTIGO
      ),
      NumFiosPorRolada AS (
        SELECT 
          ROLADA,
          SUM(NUM_FIOS_MAX) AS NUM_FIOS_SUM
        FROM (
          SELECT 
            ROLADA,
            PARTIDA,
            MAX(CAST(REPLACE(REPLACE(NUM_FIOS, '.', ''), ',', '.') AS REAL)) AS NUM_FIOS_MAX
          FROM tb_PRODUCCION
          WHERE SELETOR = 'URDIDEIRA'
            AND ROLADA IS NOT NULL
            AND PARTIDA IS NOT NULL
            AND NUM_FIOS IS NOT NULL
          GROUP BY ROLADA, PARTIDA
        )
        GROUP BY ROLADA
      ),
      UrdideiraMetrics AS (
        SELECT
          p.ROLADA,
          MIN(substr(p.DT_INICIO, 7, 4) || '-' || 
              substr(p.DT_INICIO, 4, 2) || '-' || 
              substr(p.DT_INICIO, 1, 2)) AS FECHA_URDIDORA,
          GROUP_CONCAT(DISTINCT CAST(CAST(TRIM(substr("MAQ  FIACAO", -2)) AS INTEGER) AS TEXT)) AS MAQ_OE,
          GROUP_CONCAT(DISTINCT CAST(CAST("LOTE FIACAO" AS INTEGER) AS TEXT)) AS LOTE,
          SUM(CAST(REPLACE(REPLACE(p.METRAGEM, '.', ''), ',', '.') AS REAL)) / 
            NULLIF(COUNT(DISTINCT p.PARTIDA), 0) AS METRAGEM_AVG,
          SUM(CAST(p.RUPTURAS AS INTEGER)) AS RUPTURAS_TOTAL,
          MIN(substr(p.DT_INICIO, 7, 4) || '-' || 
              substr(p.DT_INICIO, 4, 2) || '-' || 
              substr(p.DT_INICIO, 1, 2) || ' ' || 
              p.HORA_INICIO) AS INICIO_MIN,
          MAX(substr(p.DT_FINAL, 7, 4) || '-' || 
              substr(p.DT_FINAL, 4, 2) || '-' || 
              substr(p.DT_FINAL, 1, 2) || ' ' || 
              p.HORA_FINAL) AS FIN_MAX
        FROM tb_PRODUCCION p
        WHERE p.SELETOR = 'URDIDEIRA'
          AND p.ROLADA IS NOT NULL
          AND p.ROLADA != ''
          AND "MAQ  FIACAO" IS NOT NULL
          AND "LOTE FIACAO" IS NOT NULL
        GROUP BY p.ROLADA
      ),
      RoladaMetrics AS (
        SELECT
          ROLADA,
          COR,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM_TOTAL,
          SUM(CAST(RUPTURAS AS INTEGER)) AS RUPTURAS_TOTAL,
          SUM(CAST(REPLACE(REPLACE(CAVALOS, '.', ''), ',', '.') AS REAL)) AS CAVALOS_TOTAL,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
              CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL)) AS VELOC_POND_NUM,
          MIN(substr(DT_INICIO, 7, 4) || '-' || 
              substr(DT_INICIO, 4, 2) || '-' || 
              substr(DT_INICIO, 1, 2) || ' ' || 
              HORA_INICIO) AS INICIO_MIN,
          MAX(substr(DT_FINAL, 7, 4) || '-' || 
              substr(DT_FINAL, 4, 2) || '-' || 
              substr(DT_FINAL, 1, 2) || ' ' || 
              HORA_FINAL) AS FIN_MAX
        FROM tb_PRODUCCION
        WHERE SELETOR = 'INDIGO'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA, COR
      ),
      RoladaCalidad AS (
        SELECT
          ROLADA,
          COR,
          COUNT(DISTINCT CASE WHEN S = 'N' THEN PARTIDA || '_' || S END) AS N_COUNT,
          COUNT(DISTINCT CASE WHEN S = 'P' THEN PARTIDA || '_' || S END) AS P_COUNT,
          COUNT(DISTINCT CASE WHEN S = 'Q' THEN PARTIDA || '_' || S END) AS Q_COUNT,
          COUNT(DISTINCT PARTIDA || '_' || S) AS TOTAL_COUNT
        FROM tb_PRODUCCION
        WHERE SELETOR = 'INDIGO'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
          AND PARTIDA IS NOT NULL
          AND S IS NOT NULL
        GROUP BY ROLADA, COR
      ),
      TecelagemMetrics AS (
        SELECT
          ROLADA,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM_TOTAL,
          SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) AS PONTOS_LIDOS_TOTAL,
          SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL)) AS PONTOS_100_TOTAL,
          SUM(CAST(REPLACE(REPLACE("PARADA TEC TRAMA", '.', ''), ',', '.') AS REAL)) AS PARADA_TRAMA_TOTAL,
          SUM(CAST(REPLACE(REPLACE("PARADA TEC URDUME", '.', ''), ',', '.') AS REAL)) AS PARADA_URDUME_TOTAL
        FROM tb_PRODUCCION
        WHERE SELETOR = 'TECELAGEM'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA
      ),
      CalidadMetrics AS (
        SELECT
          CAL_M.ROLADA,
          CAL_M.MTS_CAL,
          CAL_M.CAL_PERCENT,
          ROUND(
            (PTS.PUNTOS * 100.0) / NULLIF((PTS.MTS_1ERA * PTS.ANC_POND), 0),
            1
          ) AS PTS_100M2
        FROM (
          SELECT
            CAST(ROLADA AS TEXT) AS ROLADA,
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS MTS_CAL,
            ROUND(
              (SUM(CASE WHEN QUALIDADE = 'PRIMEIRA ' THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) * 100.0) / 
              NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0), 
              1
            ) AS CAL_PERCENT
          FROM tb_CALIDAD
          WHERE EMP = 'STC'
            AND ROLADA IS NOT NULL
            AND ROLADA != ''
          GROUP BY ROLADA
        ) AS CAL_M
        LEFT JOIN (
          SELECT
            CAST(ROLADA AS TEXT) AS ROLADA,
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS MTS_1ERA,
            SUM(CAST(REPLACE(REPLACE(PONTUACAO, '.', ''), ',', '.') AS REAL)) AS PUNTOS,
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
                CAST(REPLACE(REPLACE(LARGURA, '.', ''), ',', '.') AS REAL)) / 
            NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) / 100.0 AS ANC_POND
          FROM tb_CALIDAD
          WHERE EMP = 'STC'
            AND QUALIDADE = 'PRIMEIRA '
            AND ROLADA IS NOT NULL
            AND ROLADA != ''
          GROUP BY ROLADA
        ) AS PTS ON CAL_M.ROLADA = PTS.ROLADA
      )
      SELECT
        rb.ROLADA,
        substr(um.FECHA_URDIDORA, 9, 2) || '/' || 
        substr(um.FECHA_URDIDORA, 6, 2) || '/' || 
        substr(um.FECHA_URDIDORA, 1, 4) AS FECHA_URDIDORA,
        um.MAQ_OE,
        um.LOTE,
        ROUND(um.METRAGEM_AVG, 3) AS URDIDORA_M,
        um.RUPTURAS_TOTAL AS URDIDORA_ROT_TOT,
        ROUND((CAST(um.RUPTURAS_TOTAL AS REAL) * 1000000.0) / 
              NULLIF((um.METRAGEM_AVG * nf.NUM_FIOS_SUM), 0), 6) AS URDIDORA_ROT_106,
        CAST((julianday(um.FIN_MAX) - julianday(um.INICIO_MIN)) * 1440 AS INTEGER) AS URDIDORA_TIEMPO_MIN,
        substr(rb.FECHA_INICIO, 9, 2) || '/' || 
        substr(rb.FECHA_INICIO, 6, 2) || '/' || 
        substr(rb.FECHA_INICIO, 1, 4) AS FECHA_INDIGO,
        rb.COR,
        rb.ARTIGO,
        ROUND(rm.METRAGEM_TOTAL, 3) AS METRAGEM,
        rm.RUPTURAS_TOTAL AS RUPTURAS,
        ROUND((CAST(rm.RUPTURAS_TOTAL AS REAL) * 1000.0) / NULLIF(rm.METRAGEM_TOTAL, 0), 2) AS ROT_103,
        ROUND(rm.CAVALOS_TOTAL, 1) AS CAVALOS,
        ROUND((rm.VELOC_POND_NUM / NULLIF(rm.METRAGEM_TOTAL, 0)), 2) AS VELOC_PROMEDIO,
        CAST((julianday(rm.FIN_MAX) - julianday(rm.INICIO_MIN)) * 1440 AS INTEGER) AS TIEMPO_MINUTOS,
        COALESCE(rc.N_COUNT, 0) AS N_COUNT,
        ROUND((CAST(COALESCE(rc.N_COUNT, 0) AS REAL) * 100.0) / NULLIF(rc.TOTAL_COUNT, 0), 1) AS N_PERCENT,
        COALESCE(rc.P_COUNT, 0) AS P_COUNT,
        ROUND((CAST(COALESCE(rc.P_COUNT, 0) AS REAL) * 100.0) / NULLIF(rc.TOTAL_COUNT, 0), 1) AS P_PERCENT,
        COALESCE(rc.Q_COUNT, 0) AS Q_COUNT,
        ROUND((CAST(COALESCE(rc.Q_COUNT, 0) AS REAL) * 100.0) / NULLIF(rc.TOTAL_COUNT, 0), 1) AS Q_PERCENT,
        ROUND(tm.METRAGEM_TOTAL, 0) AS TECELAGEM_METROS,
        ROUND((tm.PONTOS_LIDOS_TOTAL * 100.0) / NULLIF(tm.PONTOS_100_TOTAL, 0), 1) AS TECELAGEM_EFICIENCIA,
        ROUND((tm.PARADA_TRAMA_TOTAL * 100000.0) / NULLIF((tm.PONTOS_LIDOS_TOTAL * 1000.0), 0), 2) AS RT105,
        ROUND((tm.PARADA_URDUME_TOTAL * 100000.0) / NULLIF((tm.PONTOS_LIDOS_TOTAL * 1000.0), 0), 2) AS RU105,
        ROUND(cm.MTS_CAL, 0) AS METROS_CAL,
        cm.CAL_PERCENT,
        cm.PTS_100M2
      FROM RoladaBase rb
      INNER JOIN UrdideiraMetrics um ON rb.ROLADA = um.ROLADA
      INNER JOIN NumFiosPorRolada nf ON rb.ROLADA = nf.ROLADA
      INNER JOIN RoladaMetrics rm ON rb.ROLADA = rm.ROLADA AND rb.COR = rm.COR
      LEFT JOIN RoladaCalidad rc ON rb.ROLADA = rc.ROLADA AND rb.COR = rc.COR
      LEFT JOIN TecelagemMetrics tm ON rb.ROLADA = tm.ROLADA
      LEFT JOIN CalidadMetrics cm ON rb.ROLADA = cm.ROLADA
      WHERE rb.FECHA_INICIO BETWEEN ? AND ?
      ORDER BY rb.FECHA_INICIO DESC, rb.ROLADA DESC, rb.COR
    `;

    const rows = await dbAll(sql, [fechaInicio, fechaFin]);
    res.json(rows);

  } catch (error) {
    console.error('Error en /api/informe-produccion-indigo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====================================
// 📈 SEGUIMIENTO DE ROLADAS INDIGO
// ====================================
app.get('/api/seguimiento-roladas', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['fechaInicio', 'fechaFin']);
    const { fechaInicio, fechaFin } = params;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Parámetros fechaInicio y fechaFin requeridos (formato: YYYY-MM-DD)' });
    }

    // Convertir fechas de YYYY-MM-DD a DD/MM/YYYY para comparar con la base de datos
    const convertirFecha = (fecha) => {
      const [year, month, day] = fecha.split('-');
      return `${day}/${month}/${year}`;
    };

    const fechaInicioDB = convertirFecha(fechaInicio);
    const fechaFinDB = convertirFecha(fechaFin);

    console.log(`📅 Consultando seguimiento de roladas desde ${fechaInicioDB} hasta ${fechaFinDB}`);

    // Consulta SQL basada en el código VBA proporcionado
    const sql = `
      WITH R_IND AS (
        SELECT 
          CAST(ROLADA AS INTEGER) AS ROLADA
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND substr(DT_BASE_PRODUCAO, 7, 4) || '-' || 
              substr(DT_BASE_PRODUCAO, 4, 2) || '-' || 
              substr(DT_BASE_PRODUCAO, 1, 2) BETWEEN ? AND ?
          AND SELETOR = 'INDIGO'
          AND DT_BASE_PRODUCAO != '19/10/2025'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA
      ),
      URD AS (
        SELECT
          inner_urd.ROLADA,
          GROUP_CONCAT(DISTINCT CAST(CAST(TRIM(substr(inner_urd."MAQ  FIACAO", -2)) AS INTEGER) AS TEXT)) AS MAQ_OE,
          GROUP_CONCAT(DISTINCT CAST(CAST(inner_urd."LOTE FIACAO" AS INTEGER) AS TEXT)) AS LOTE,
          SUM(inner_urd.METRAGEM) / NULLIF(COUNT(DISTINCT inner_urd.PARTIDA), 0) AS URDIDORA_METROS,
          SUM(inner_urd.RUPTURAS) AS URDIDORA_ROTURAS,
          SUM(inner_urd.NUM_FIOS_MAX) AS NUM_FIOS
        FROM (
          SELECT 
            CAST(ROLADA AS INTEGER) AS ROLADA,
            PARTIDA,
            "MAQ  FIACAO",
            "LOTE FIACAO",
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM,
            SUM(CAST(RUPTURAS AS INTEGER)) AS RUPTURAS,
            MAX(CAST(REPLACE(REPLACE(NUM_FIOS, '.', ''), ',', '.') AS REAL)) AS NUM_FIOS_MAX
          FROM tb_PRODUCCION
          WHERE SELETOR = 'URDIDEIRA'
            AND ROLADA IS NOT NULL
            AND PARTIDA IS NOT NULL
            AND NUM_FIOS IS NOT NULL
          GROUP BY ROLADA, PARTIDA
        ) AS inner_urd
        WHERE inner_urd.ROLADA IS NOT NULL
          AND inner_urd."MAQ  FIACAO" IS NOT NULL
          AND inner_urd."LOTE FIACAO" IS NOT NULL
        GROUP BY inner_urd.ROLADA
      ),
      IND AS (
        SELECT
          MIN(DT_BASE_PRODUCAO) AS FECHA,
          CAST(ROLADA AS INTEGER) AS ROLADA,
          substr(ARTIGO, 1, 10) AS BASE,
          COR AS COLOR,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS MTS_IND,
          SUM(CAST(RUPTURAS AS INTEGER)) AS ROT_IND,
          SUM(CAST(REPLACE(REPLACE(CAVALOS, '.', ''), ',', '.') AS REAL)) AS CAV,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
              CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL)) / 
              NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) AS VEL_PROM
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND DT_BASE_PRODUCAO != '19/10/2025'
          AND SELETOR = 'INDIGO'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA, ARTIGO, COR
      ),
      VEL_MODA AS (
        SELECT 
          CAST(ROLADA AS INTEGER) AS ROLADA,
          CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL) AS VELOC,
          COUNT(*) AS cnt
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND SELETOR = 'INDIGO'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
          AND VELOC IS NOT NULL
          AND VELOC != ''
        GROUP BY ROLADA, VELOC
      ),
      VEL_NOM AS (
        SELECT 
          ROLADA,
          VELOC AS VEL_NOM
        FROM VEL_MODA v1
        WHERE cnt = (SELECT MAX(cnt) FROM VEL_MODA v2 WHERE v2.ROLADA = v1.ROLADA)
        GROUP BY ROLADA
      ),
      INDI AS (
        SELECT
          R_IND.ROLADA,
          URD.MAQ_OE,
          URD.LOTE,
          URD.URDIDORA_METROS,
          URD.URDIDORA_ROTURAS,
          URD.NUM_FIOS,
          IND.FECHA,
          IND.BASE,
          IND.COLOR,
          IND.MTS_IND,
          (IND.ROT_IND * 1000.0) / NULLIF(IND.MTS_IND, 0) AS R103,
          IND.CAV,
          VEL_NOM.VEL_NOM,
          IND.VEL_PROM
        FROM R_IND
        LEFT JOIN URD ON R_IND.ROLADA = URD.ROLADA
        LEFT JOIN IND ON R_IND.ROLADA = IND.ROLADA
        LEFT JOIN VEL_NOM ON R_IND.ROLADA = VEL_NOM.ROLADA
      ),
      TEJ AS (
        SELECT
          CAST(ROLADA AS INTEGER) AS ROLADA,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS MTS_CRUDOS,
          SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) AS PONTOS_LIDOS,
          -- Solo sumar PONTOS_100% cuando PONTOS_LIDOS > 0 (excluir registros sin produccion)
          SUM(CASE WHEN CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL) > 0 
                   THEN CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL) 
                   ELSE 0 END) AS PONTOS_100,
          SUM(CAST(REPLACE(REPLACE("PARADA TEC URDUME", '.', ''), ',', '.') AS REAL)) AS PARADA_TEC_URDUME,
          SUM(CAST(REPLACE(REPLACE("PARADA TEC TRAMA", '.', ''), ',', '.') AS REAL)) AS PARADA_TEC_TRAMA
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND SELETOR = 'TECELAGEM'
          AND DT_BASE_PRODUCAO != '19/10/2025'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA
      ),
      IT AS (
        SELECT
          INDI.ROLADA,
          INDI.MAQ_OE,
          INDI.LOTE,
          INDI.URDIDORA_METROS,
          INDI.URDIDORA_ROTURAS,
          INDI.NUM_FIOS,
          INDI.FECHA,
          INDI.BASE,
          INDI.COLOR,
          INDI.MTS_IND,
          INDI.R103,
          INDI.CAV,
          INDI.VEL_NOM,
          INDI.VEL_PROM,
          TEJ.MTS_CRUDOS,
          (TEJ.PONTOS_LIDOS / NULLIF(TEJ.PONTOS_100, 0)) * 100.0 AS EFI_TEJ,
          (TEJ.PARADA_TEC_URDUME * 100000.0) / NULLIF((TEJ.PONTOS_LIDOS * 1000.0), 0) AS RU105,
          (TEJ.PARADA_TEC_TRAMA * 100000.0) / NULLIF((TEJ.PONTOS_LIDOS * 1000.0), 0) AS RT105
        FROM INDI
        LEFT JOIN TEJ ON INDI.ROLADA = TEJ.ROLADA
      ),
      CAL_M AS (
        SELECT
          CAST(ROLADA AS INTEGER) AS ROLADA,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS MTS_CAL,
          ROUND(
            (SUM(CASE WHEN QUALIDADE = 'PRIMEIRA ' THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) * 100.0) / 
            NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0), 
            1
          ) AS CAL_PERCENT
        FROM tb_CALIDAD
        WHERE EMP = 'STC'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA
      ),
      PTS AS (
        SELECT
          CAST(ROLADA AS INTEGER) AS ROLADA,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS MTS_1ERA,
          SUM(CAST(REPLACE(REPLACE(PONTUACAO, '.', ''), ',', '.') AS REAL)) AS PUNTOS,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
              CAST(REPLACE(REPLACE(LARGURA, '.', ''), ',', '.') AS REAL)) / 
          NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) / 100.0 AS ANC_POND
        FROM tb_CALIDAD
        WHERE EMP = 'STC'
          AND QUALIDADE = 'PRIMEIRA '
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA
      ),
      CAL AS (
        SELECT
          CAL_M.ROLADA,
          CAL_M.MTS_CAL,
          CAL_M.CAL_PERCENT,
          (PTS.PUNTOS * 100.0) / NULLIF((PTS.MTS_1ERA * PTS.ANC_POND), 0) AS PTS_100M2
        FROM CAL_M
        LEFT JOIN PTS ON CAL_M.ROLADA = PTS.ROLADA
      )
      SELECT
        IT.ROLADA,
        IT.MAQ_OE,
        IT.LOTE,
        ROUND(IT.URDIDORA_METROS, 0) AS URDIDORA_METROS,
        IT.URDIDORA_ROTURAS,
        IT.NUM_FIOS,
        IT.FECHA AS FECHA,
        IT.BASE,
        IT.COLOR,
        ROUND(IT.MTS_IND, 0) AS MTS_IND,
        ROUND(IT.R103, 1) AS R103,
        IT.CAV,
        ROUND(IT.VEL_NOM, 0) AS VEL_NOM,
        ROUND(IT.VEL_PROM, 0) AS VEL_PROM,
        ROUND(IT.MTS_CRUDOS, 0) AS MTS_CRUDOS,
        ROUND(IT.EFI_TEJ, 1) AS EFI_TEJ,
        ROUND(IT.RU105, 1) AS RU105,
        ROUND(IT.RT105, 1) AS RT105,
        ROUND(CAL.MTS_CAL, 0) AS MTS_CAL,
        ROUND(CAL.CAL_PERCENT, 1) AS CAL_PERCENT,
        ROUND(CAL.PTS_100M2, 1) AS PTS_100M2
      FROM IT
      LEFT JOIN CAL ON IT.ROLADA = CAL.ROLADA
      ORDER BY IT.ROLADA ASC
    `;

    const rows = await dbAll(sql, [fechaInicio, fechaFin]);
    
    // Calcular totales ponderados para las roladas encontradas
    if (rows.length > 0) {
      const roladas = rows.map(r => r.ROLADA);
      const placeholders = roladas.map(() => '?').join(',');
      
      const sqlTotales = `
        WITH 
        ROLADAS_SEL AS (
          SELECT CAST(value AS INTEGER) AS ROLADA FROM json_each('[' || ? || ']')
        ),
        URD_RAW AS (
          SELECT
            SUM(inner_urd.METRAGEM) / NULLIF(COUNT(DISTINCT inner_urd.PARTIDA), 0) AS TOTAL_URDIDORA_METROS,
            SUM(inner_urd.RUPTURAS) AS TOTAL_URDIDORA_ROTURAS,
            SUM(inner_urd.NUM_FIOS_MAX) AS TOTAL_NUM_FIOS
          FROM (
            SELECT 
              PARTIDA,
              SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM,
              SUM(CAST(RUPTURAS AS INTEGER)) AS RUPTURAS,
              MAX(CAST(REPLACE(REPLACE(NUM_FIOS, '.', ''), ',', '.') AS REAL)) AS NUM_FIOS_MAX
            FROM tb_PRODUCCION
            WHERE SELETOR = 'URDIDEIRA'
              AND ROLADA IS NOT NULL
              AND ROLADA != ''
              AND CAST(ROLADA AS INTEGER) IN (SELECT ROLADA FROM ROLADAS_SEL)
            GROUP BY ROLADA, PARTIDA
          ) AS inner_urd
        ),
        IND_RAW AS (
          SELECT
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS TOTAL_MTS_IND,
            SUM(CAST(RUPTURAS AS INTEGER)) AS TOTAL_ROT_IND,
            SUM(CAST(REPLACE(REPLACE(CAVALOS, '.', ''), ',', '.') AS REAL)) AS TOTAL_CAV,
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
                CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL)) AS SUM_VEL_MTS,
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS SUM_MTS_VEL
          FROM tb_PRODUCCION
          WHERE FILIAL = '05'
            AND SELETOR = 'INDIGO'
            AND DT_BASE_PRODUCAO != '19/10/2025'
            AND CAST(ROLADA AS INTEGER) IN (SELECT ROLADA FROM ROLADAS_SEL)
        ),
        TEJ_RAW AS (
          SELECT
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS TOTAL_MTS_CRUDOS,
            SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) AS TOTAL_PONTOS_LIDOS,
            SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL)) AS TOTAL_PONTOS_100,
            SUM(CAST(REPLACE(REPLACE("PARADA TEC URDUME", '.', ''), ',', '.') AS REAL)) AS TOTAL_PARADA_URD,
            SUM(CAST(REPLACE(REPLACE("PARADA TEC TRAMA", '.', ''), ',', '.') AS REAL)) AS TOTAL_PARADA_TRAMA
          FROM tb_PRODUCCION
          WHERE FILIAL = '05'
            AND SELETOR = 'TECELAGEM'
            AND DT_BASE_PRODUCAO != '19/10/2025'
            AND CAST(ROLADA AS INTEGER) IN (SELECT ROLADA FROM ROLADAS_SEL)
        ),
        CAL_RAW AS (
          SELECT
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS TOTAL_MTS_CAL,
            SUM(CASE WHEN QUALIDADE = 'PRIMEIRA ' THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) AS TOTAL_MTS_1ERA,
            SUM(CASE WHEN QUALIDADE = 'PRIMEIRA ' THEN CAST(REPLACE(REPLACE(PONTUACAO, '.', ''), ',', '.') AS REAL) ELSE 0 END) AS TOTAL_PUNTOS,
            SUM(CASE WHEN QUALIDADE = 'PRIMEIRA ' THEN 
                CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
                CAST(REPLACE(REPLACE(LARGURA, '.', ''), ',', '.') AS REAL) 
              ELSE 0 END) AS SUM_MTS_ANCHO
          FROM tb_CALIDAD
          WHERE EMP = 'STC'
            AND CAST(ROLADA AS INTEGER) IN (SELECT ROLADA FROM ROLADAS_SEL)
        )
        SELECT
          ROUND(URD.TOTAL_URDIDORA_METROS, 0) AS URDIDORA_METROS,
          URD.TOTAL_URDIDORA_ROTURAS AS URDIDORA_ROTURAS,
          URD.TOTAL_NUM_FIOS AS NUM_FIOS,
          ROUND(IND.TOTAL_MTS_IND, 0) AS MTS_IND,
          ROUND((IND.TOTAL_ROT_IND * 1000.0) / NULLIF(IND.TOTAL_MTS_IND, 0), 1) AS R103,
          IND.TOTAL_CAV AS CAV,
          ROUND(IND.SUM_VEL_MTS / NULLIF(IND.SUM_MTS_VEL, 0), 0) AS VEL_PROM,
          ROUND(TEJ.TOTAL_MTS_CRUDOS, 0) AS MTS_CRUDOS,
          ROUND((TEJ.TOTAL_PONTOS_LIDOS / NULLIF(TEJ.TOTAL_PONTOS_100, 0)) * 100.0, 1) AS EFI_TEJ,
          ROUND((TEJ.TOTAL_PARADA_URD * 100000.0) / NULLIF((TEJ.TOTAL_PONTOS_LIDOS * 1000.0), 0), 1) AS RU105,
          ROUND((TEJ.TOTAL_PARADA_TRAMA * 100000.0) / NULLIF((TEJ.TOTAL_PONTOS_LIDOS * 1000.0), 0), 1) AS RT105,
          ROUND(CAL.TOTAL_MTS_CAL, 0) AS MTS_CAL,
          ROUND((CAL.TOTAL_MTS_1ERA * 100.0) / NULLIF(CAL.TOTAL_MTS_CAL, 0), 1) AS CAL_PERCENT,
          ROUND((CAL.TOTAL_PUNTOS * 100.0) / NULLIF(CAL.SUM_MTS_ANCHO / 100.0, 0), 1) AS PTS_100M2
        FROM URD_RAW URD, IND_RAW IND, TEJ_RAW TEJ, CAL_RAW CAL
      `;
      
      const roladasStr = roladas.join(',');
      const totalesRows = await dbAll(sqlTotales, [roladasStr]);
      const totales = totalesRows[0] || {};
      totales.TOTAL_ROLADAS = rows.length;
      
      res.json({ datos: rows, totales });
    } else {
      res.json({ datos: [], totales: null });
    }

  } catch (error) {
    console.error('Error en /api/seguimiento-roladas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====================================
// � ESTADÍSTICAS HVI POR MEZCLA (DATOS CRUDOS)
// ====================================
// ====================================
// 📊 ESTADÍSTICAS HVI POR MEZCLA (DATOS CRUDOS)
// ====================================
app.get('/api/hvi-estadisticas-mezcla', async (req, res) => {
  const params = validateQueryParams(req, ['fechaInicio', 'fechaFin']);
  const { fechaInicio, fechaFin } = params;

  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Parámetros fechaInicio y fechaFin requeridos (formato: YYYY-MM-DD)' });
  }

  // Convertir fechas de YYYY-MM-DD a DD/MM/YYYY
  const convertirFecha = (fecha) => {
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  };

  const fechaInicioDB = convertirFecha(fechaInicio);
  const fechaFinDB = convertirFecha(fechaFin);

  console.log(`📊 Calculando estadísticas HVI por mezcla desde ${fechaInicioDB} hasta ${fechaFinDB}`);

    // Reutilizar la MISMA query del endpoint principal hasta obtener las mezclas
    const mezclasSQL = `
      WITH R_IND AS (
        SELECT 
          CAST(ROLADA AS INTEGER) AS ROLADA
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND substr(DT_BASE_PRODUCAO, 7, 4) || '-' || 
              substr(DT_BASE_PRODUCAO, 4, 2) || '-' || 
              substr(DT_BASE_PRODUCAO, 1, 2) BETWEEN ? AND ?
          AND SELETOR = 'INDIGO'
          AND DT_BASE_PRODUCAO != '19/10/2025'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA
      ),
      URD AS (
        SELECT
          inner_urd.ROLADA,
          GROUP_CONCAT(DISTINCT CAST(CAST(inner_urd."LOTE FIACAO" AS INTEGER) AS TEXT)) AS LOTE
        FROM (
          SELECT 
            CAST(ROLADA AS INTEGER) AS ROLADA,
            "LOTE FIACAO"
          FROM tb_PRODUCCION
          WHERE SELETOR = 'URDIDEIRA'
            AND ROLADA IS NOT NULL
            AND "LOTE FIACAO" IS NOT NULL
            AND "LOTE FIACAO" != ''
          GROUP BY ROLADA, "LOTE FIACAO"
        ) AS inner_urd
        WHERE inner_urd.ROLADA IS NOT NULL
        GROUP BY inner_urd.ROLADA
      ),
      IT AS (
        SELECT 
          R_IND.ROLADA,
          URD.LOTE
        FROM R_IND
        LEFT JOIN URD ON R_IND.ROLADA = URD.ROLADA
      ),
      FIBRA_HVI AS (
        SELECT 
          CAST(CAST(LOTE_FIAC AS INTEGER) AS TEXT) as LOTE_NUM,
          MISTURA
        FROM tb_CALIDAD_FIBRA
        WHERE LOTE_FIAC IS NOT NULL AND LOTE_FIAC != ''
          AND MISTURA IS NOT NULL AND TRIM(MISTURA) != ''
          AND TIPO_MOV = 'MIST'
        GROUP BY LOTE_FIAC
      ),
      IT_FIBRA AS (
        SELECT DISTINCT
          FIBRA_HVI.MISTURA
        FROM IT
        LEFT JOIN FIBRA_HVI ON (
          ',' || REPLACE(IT.LOTE, ' ', '') || ',' LIKE '%,' || FIBRA_HVI.LOTE_NUM || ',%'
        )
        WHERE FIBRA_HVI.MISTURA IS NOT NULL
      )
      SELECT MISTURA FROM IT_FIBRA
    `;

    db.all(mezclasSQL, [fechaInicio, fechaFin], (err, mezclas) => {
      if (err) {
        console.error('❌ Error obteniendo mezclas del período:', err);
        return res.status(500).json({ error: err.message });
      }

      if (!mezclas || mezclas.length === 0) {
        console.log('⚠️ No se encontraron mezclas en el período');
        return res.json({ stats: {} });
      }

      const listaMezclas = mezclas.map(m => m.MISTURA);
      console.log(`🔍 Mezclas encontradas: ${listaMezclas.join(', ')}`);

      // Ahora obtener TODOS los datos crudos de esas mezclas
      const placeholders = listaMezclas.map(() => '?').join(',');
      const dataSQL = `
        SELECT 
          MISTURA,
          CAST(REPLACE(SCI, ',', '.') AS REAL) as SCI,
          CAST(REPLACE(MST, ',', '.') AS REAL) as MST,
          CAST(REPLACE(MIC, ',', '.') AS REAL) as MIC,
          CAST(REPLACE(MAT, ',', '.') AS REAL) as MAT,
          CAST(REPLACE(UHML, ',', '.') AS REAL) as UHML,
          CAST(REPLACE(UI, ',', '.') AS REAL) as UI,
          CAST(REPLACE(SF, ',', '.') AS REAL) as SF,
          CAST(REPLACE(STR, ',', '.') AS REAL) as STR,
          CAST(REPLACE(ELG, ',', '.') AS REAL) as ELG,
          CAST(REPLACE(RD, ',', '.') AS REAL) as RD,
          CAST(REPLACE(PLUS_B, ',', '.') AS REAL) as PLUS_B,
          CAST(REPLACE(TrCNT, ',', '.') AS REAL) as TrCNT,
          CAST(REPLACE(TrAR, ',', '.') AS REAL) as TrAR,
          CAST(REPLACE(TRID, ',', '.') AS REAL) as TRID
        FROM tb_CALIDAD_FIBRA
        WHERE TIPO_MOV = 'MIST'
          AND MISTURA IN (${placeholders})
        ORDER BY MISTURA
      `;

      db.all(dataSQL, listaMezclas, (err, rows) => {
        if (err) {
          console.error('❌ Error obteniendo datos crudos HVI:', err);
          return res.status(500).json({ error: err.message });
        }

        console.log(`📦 Registros crudos obtenidos: ${rows.length}`);

        // Agrupar por mezcla (normalizando a número sin ceros)
        const datosPorMezcla = {};
        rows.forEach(row => {
          // Normalizar mezcla: quitar ceros iniciales
          const mezcla = String(parseInt(row.MISTURA, 10));
          if (!datosPorMezcla[mezcla]) {
            datosPorMezcla[mezcla] = {
              SCI: [], MST: [], MIC: [], MAT: [], UHML: [], UI: [], SF: [],
              STR: [], ELG: [], RD: [], PLUS_B: [], TrCNT: [], TrAR: [], TRID: []
            };
          }
          
          // Agregar valores no nulos (CAST ya convirtió a números)
          if (row.SCI !== null) datosPorMezcla[mezcla].SCI.push(row.SCI);
          if (row.MST !== null) datosPorMezcla[mezcla].MST.push(row.MST);
          if (row.MIC !== null) datosPorMezcla[mezcla].MIC.push(row.MIC);
          if (row.MAT !== null) datosPorMezcla[mezcla].MAT.push(row.MAT);
          if (row.UHML !== null) datosPorMezcla[mezcla].UHML.push(row.UHML);
          if (row.UI !== null) datosPorMezcla[mezcla].UI.push(row.UI);
          if (row.SF !== null) datosPorMezcla[mezcla].SF.push(row.SF);
          if (row.STR !== null) datosPorMezcla[mezcla].STR.push(row.STR);
          if (row.ELG !== null) datosPorMezcla[mezcla].ELG.push(row.ELG);
          if (row.RD !== null) datosPorMezcla[mezcla].RD.push(row.RD);
          if (row.PLUS_B !== null) datosPorMezcla[mezcla].PLUS_B.push(row.PLUS_B);
          if (row.TrCNT !== null) datosPorMezcla[mezcla].TrCNT.push(row.TrCNT);
          if (row.TrAR !== null) datosPorMezcla[mezcla].TrAR.push(row.TrAR);
          if (row.TRID !== null) datosPorMezcla[mezcla].TRID.push(row.TRID);
        });

        // Función para calcular estadísticas
        const calcularEstadisticas = (valores) => {
          if (valores.length === 0) return { MIN: null, MAX: null, DESV: 0 };
          
          const min = Math.min(...valores);
          const max = Math.max(...valores);
          
          // Calcular desviación estándar
          const media = valores.reduce((a, b) => a + b, 0) / valores.length;
          const varianza = valores.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / valores.length;
          const desv = Math.sqrt(varianza);
          
          return { MIN: min, MAX: max, DESV: desv };
        };

        // Calcular estadísticas para cada mezcla
        const stats = {};
        Object.keys(datosPorMezcla).forEach(mezcla => {
          const data = datosPorMezcla[mezcla];
          const n = Math.max(...Object.values(data).map(arr => arr.length));
          
          stats[mezcla] = {
            N: n,
            SCI: calcularEstadisticas(data.SCI),
            MST: calcularEstadisticas(data.MST),
            MIC: calcularEstadisticas(data.MIC),
            MAT: calcularEstadisticas(data.MAT),
            UHML: calcularEstadisticas(data.UHML),
            UI: calcularEstadisticas(data.UI),
            SF: calcularEstadisticas(data.SF),
            STR: calcularEstadisticas(data.STR),
            ELG: calcularEstadisticas(data.ELG),
            RD: calcularEstadisticas(data.RD),
            PLUS_B: calcularEstadisticas(data.PLUS_B),
            TrCNT: calcularEstadisticas(data.TrCNT),
            TrAR: calcularEstadisticas(data.TrAR),
            TRID: calcularEstadisticas(data.TRID)
          };
        });

        console.log(`✅ Estadísticas calculadas para ${Object.keys(stats).length} mezclas (${rows.length} registros crudos)`);
        res.json({ stats });
      });
    });
});

// ====================================
// 📈 SEGUIMIENTO DE ROLADAS CON FIBRA HVI
// ====================================
app.get('/api/seguimiento-roladas-fibra', async (req, res) => {
  try {
    const params = validateQueryParams(req, ['fechaInicio', 'fechaFin']);
    const { fechaInicio, fechaFin } = params;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Parámetros fechaInicio y fechaFin requeridos (formato: YYYY-MM-DD)' });
    }

    // Convertir fechas de YYYY-MM-DD a DD/MM/YYYY para comparar con la base de datos
    const convertirFecha = (fecha) => {
      const [year, month, day] = fecha.split('-');
      return `${day}/${month}/${year}`;
    };

    const fechaInicioDB = convertirFecha(fechaInicio);
    const fechaFinDB = convertirFecha(fechaFin);

    console.log(`📅 Consultando seguimiento de roladas + fibra desde ${fechaInicioDB} hasta ${fechaFinDB}`);

    // Consulta SQL con JOIN a tb_CALIDAD_FIBRA por LOTE
    const sql = `
      WITH R_IND AS (
        SELECT 
          CAST(ROLADA AS INTEGER) AS ROLADA
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND substr(DT_BASE_PRODUCAO, 7, 4) || '-' || 
              substr(DT_BASE_PRODUCAO, 4, 2) || '-' || 
              substr(DT_BASE_PRODUCAO, 1, 2) BETWEEN ? AND ?
          AND SELETOR = 'INDIGO'
          AND DT_BASE_PRODUCAO != '19/10/2025'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA
      ),
      URD AS (
        SELECT
          inner_urd.ROLADA,
          GROUP_CONCAT(DISTINCT CAST(CAST(TRIM(substr(inner_urd."MAQ  FIACAO", -2)) AS INTEGER) AS TEXT)) AS MAQ_OE,
          GROUP_CONCAT(DISTINCT CAST(CAST(inner_urd."LOTE FIACAO" AS INTEGER) AS TEXT)) AS LOTE,
          SUM(inner_urd.METRAGEM) / NULLIF(COUNT(DISTINCT inner_urd.PARTIDA), 0) AS URDIDORA_METROS,
          SUM(inner_urd.RUPTURAS) AS URDIDORA_ROTURAS,
          SUM(inner_urd.NUM_FIOS_MAX) AS NUM_FIOS
        FROM (
          SELECT 
            CAST(ROLADA AS INTEGER) AS ROLADA,
            PARTIDA,
            "MAQ  FIACAO",
            "LOTE FIACAO",
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM,
            SUM(CAST(RUPTURAS AS INTEGER)) AS RUPTURAS,
            MAX(CAST(REPLACE(REPLACE(NUM_FIOS, '.', ''), ',', '.') AS REAL)) AS NUM_FIOS_MAX
          FROM tb_PRODUCCION
          WHERE SELETOR = 'URDIDEIRA'
            AND ROLADA IS NOT NULL
            AND PARTIDA IS NOT NULL
            AND NUM_FIOS IS NOT NULL
          GROUP BY ROLADA, PARTIDA
        ) AS inner_urd
        WHERE inner_urd.ROLADA IS NOT NULL
          AND inner_urd."MAQ  FIACAO" IS NOT NULL
          AND inner_urd."LOTE FIACAO" IS NOT NULL
        GROUP BY inner_urd.ROLADA
      ),
      IND AS (
        SELECT
          MIN(DT_BASE_PRODUCAO) AS FECHA,
          CAST(ROLADA AS INTEGER) AS ROLADA,
          substr(ARTIGO, 1, 10) AS BASE,
          COR AS COLOR,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS MTS_IND,
          SUM(CAST(RUPTURAS AS INTEGER)) AS ROT_IND,
          SUM(CAST(REPLACE(REPLACE(CAVALOS, '.', ''), ',', '.') AS REAL)) AS CAV,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
              CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL)) / 
              NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) AS VEL_PROM
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND DT_BASE_PRODUCAO != '19/10/2025'
          AND SELETOR = 'INDIGO'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA, ARTIGO, COR
      ),
      VEL_MODA AS (
        SELECT 
          CAST(ROLADA AS INTEGER) AS ROLADA,
          CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL) AS VELOC,
          COUNT(*) AS cnt
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND SELETOR = 'INDIGO'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
          AND VELOC IS NOT NULL
          AND VELOC != ''
        GROUP BY ROLADA, VELOC
      ),
      VEL_NOM AS (
        SELECT 
          ROLADA,
          VELOC AS VEL_NOM
        FROM VEL_MODA v1
        WHERE cnt = (SELECT MAX(cnt) FROM VEL_MODA v2 WHERE v2.ROLADA = v1.ROLADA)
        GROUP BY ROLADA
      ),
      INDI AS (
        SELECT
          R_IND.ROLADA,
          URD.MAQ_OE,
          URD.LOTE,
          URD.URDIDORA_METROS,
          URD.URDIDORA_ROTURAS,
          URD.NUM_FIOS,
          IND.FECHA,
          IND.BASE,
          IND.COLOR,
          IND.MTS_IND,
          (IND.ROT_IND * 1000.0) / NULLIF(IND.MTS_IND, 0) AS R103,
          IND.CAV,
          VEL_NOM.VEL_NOM,
          IND.VEL_PROM
        FROM R_IND
        LEFT JOIN URD ON R_IND.ROLADA = URD.ROLADA
        LEFT JOIN IND ON R_IND.ROLADA = IND.ROLADA
        LEFT JOIN VEL_NOM ON R_IND.ROLADA = VEL_NOM.ROLADA
      ),
      TEJ AS (
        SELECT
          CAST(ROLADA AS INTEGER) AS ROLADA,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS MTS_CRUDOS,
          SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) AS PONTOS_LIDOS,
          -- Solo sumar PONTOS_100% cuando PONTOS_LIDOS > 0 (excluir registros sin produccion)
          SUM(CASE WHEN CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL) > 0 
                   THEN CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL) 
                   ELSE 0 END) AS PONTOS_100,
          SUM(CAST(REPLACE(REPLACE("PARADA TEC URDUME", '.', ''), ',', '.') AS REAL)) AS PARADA_TEC_URDUME,
          SUM(CAST(REPLACE(REPLACE("PARADA TEC TRAMA", '.', ''), ',', '.') AS REAL)) AS PARADA_TEC_TRAMA
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND SELETOR = 'TECELAGEM'
          AND DT_BASE_PRODUCAO != '19/10/2025'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA
      ),
      IT AS (
        SELECT
          INDI.ROLADA,
          INDI.MAQ_OE,
          INDI.LOTE,
          INDI.URDIDORA_METROS,
          INDI.URDIDORA_ROTURAS,
          INDI.NUM_FIOS,
          INDI.FECHA,
          INDI.BASE,
          INDI.COLOR,
          INDI.MTS_IND,
          INDI.R103,
          INDI.CAV,
          INDI.VEL_NOM,
          INDI.VEL_PROM,
          TEJ.MTS_CRUDOS,
          (TEJ.PONTOS_LIDOS / NULLIF(TEJ.PONTOS_100, 0)) * 100.0 AS EFI_TEJ,
          (TEJ.PARADA_TEC_URDUME * 100000.0) / NULLIF((TEJ.PONTOS_LIDOS * 1000.0), 0) AS RU105,
          (TEJ.PARADA_TEC_TRAMA * 100000.0) / NULLIF((TEJ.PONTOS_LIDOS * 1000.0), 0) AS RT105
        FROM INDI
        LEFT JOIN TEJ ON INDI.ROLADA = TEJ.ROLADA
      ),
      CAL_M AS (
        SELECT
          CAST(ROLADA AS INTEGER) AS ROLADA,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS MTS_CAL,
          ROUND(
            (SUM(CASE WHEN QUALIDADE = 'PRIMEIRA ' THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) * 100.0) / 
            NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0), 
            1
          ) AS CAL_PERCENT
        FROM tb_CALIDAD
        WHERE EMP = 'STC'
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA
      ),
      PTS AS (
        SELECT
          CAST(ROLADA AS INTEGER) AS ROLADA,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS MTS_1ERA,
          SUM(CAST(REPLACE(REPLACE(PONTUACAO, '.', ''), ',', '.') AS REAL)) AS PUNTOS,
          SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
              CAST(REPLACE(REPLACE(LARGURA, '.', ''), ',', '.') AS REAL)) / 
          NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0) / 100.0 AS ANC_POND
        FROM tb_CALIDAD
        WHERE EMP = 'STC'
          AND QUALIDADE = 'PRIMEIRA '
          AND ROLADA IS NOT NULL
          AND ROLADA != ''
        GROUP BY ROLADA
      ),
      CAL AS (
        SELECT
          CAL_M.ROLADA,
          CAL_M.MTS_CAL,
          CAL_M.CAL_PERCENT,
          (PTS.PUNTOS * 100.0) / NULLIF((PTS.MTS_1ERA * PTS.ANC_POND), 0) AS PTS_100M2
        FROM CAL_M
        LEFT JOIN PTS ON CAL_M.ROLADA = PTS.ROLADA
      ),
      -- Datos HVI por lote (promedio ponderado por PESO de TODAS las misturas del lote, excluyendo valores nulos/cero)
      FIBRA_HVI AS (
        SELECT 
          CAST(CAST(LOTE_FIAC AS INTEGER) AS TEXT) as LOTE_NUM,
          GROUP_CONCAT(DISTINCT CAST(CAST(MISTURA AS INTEGER) AS TEXT)) as MISTURA,
          MIN(CASE WHEN DT_ENTRADA_PROD IS NOT NULL AND TRIM(DT_ENTRADA_PROD) != '' THEN DT_ENTRADA_PROD END) as FECHA_INGRESO,
          -- Promedio ponderado por PESO (convertido de formato europeo), excluyendo valores NULL o 0
          ROUND(SUM(CASE WHEN CAST(REPLACE(SCI, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(SCI, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(SCI, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as SCI,
          ROUND(SUM(CASE WHEN CAST(REPLACE(MST, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(MST, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(MST, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as MST,
          ROUND(SUM(CASE WHEN CAST(REPLACE(MIC, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(MIC, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(MIC, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as MIC,
          ROUND(SUM(CASE WHEN CAST(REPLACE(MAT, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(MAT, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(MAT, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as MAT,
          ROUND(SUM(CASE WHEN CAST(REPLACE(UHML, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(UHML, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(UHML, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as UHML,
          ROUND(SUM(CASE WHEN CAST(REPLACE(UI, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(UI, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(UI, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as UI,
          ROUND(SUM(CASE WHEN CAST(REPLACE(SF, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(SF, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(SF, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as SF,
          ROUND(SUM(CASE WHEN CAST(REPLACE(STR, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(STR, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(STR, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as STR,
          ROUND(SUM(CASE WHEN CAST(REPLACE(ELG, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(ELG, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(ELG, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as ELG,
          ROUND(SUM(CASE WHEN CAST(REPLACE(RD, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(RD, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(RD, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as RD,
          ROUND(SUM(CASE WHEN CAST(REPLACE(PLUS_B, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(PLUS_B, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(PLUS_B, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as PLUS_B,
          ROUND(SUM(CASE WHEN CAST(REPLACE(TrCNT, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(TrCNT, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(TrCNT, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as TrCNT,
          ROUND(SUM(CASE WHEN CAST(REPLACE(TrAR, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(TrAR, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(TrAR, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as TrAR,
          ROUND(SUM(CASE WHEN CAST(REPLACE(TRID, ',', '.') AS REAL) > 0 
                         THEN CAST(REPLACE(TRID, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN CAST(REPLACE(TRID, ',', '.') AS REAL) > 0 
                               THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) 
                               ELSE 0 END), 0), 2) as TRID,
          ROUND((SUM(CASE WHEN COR='BCO' THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) * 100.0 / 
                 NULLIF(SUM(CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL)), 0)), 1) as COLOR_BCO_PCT,
          ROUND((SUM(CASE WHEN COR='GRI' THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) * 100.0 / 
                 NULLIF(SUM(CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL)), 0)), 1) as COLOR_GRI_PCT,
          ROUND((SUM(CASE WHEN COR='LG' THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) * 100.0 / 
                 NULLIF(SUM(CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL)), 0)), 1) as COLOR_LG_PCT,
          ROUND((SUM(CASE WHEN COR='AMA' THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) * 100.0 / 
                 NULLIF(SUM(CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL)), 0)), 1) as COLOR_AMA_PCT,
          ROUND((SUM(CASE WHEN COR='LA' THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) * 100.0 / 
                 NULLIF(SUM(CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL)), 0)), 1) as COLOR_LA_PCT
        FROM tb_CALIDAD_FIBRA
        WHERE LOTE_FIAC IS NOT NULL AND LOTE_FIAC != ''
          AND MISTURA IS NOT NULL AND TRIM(MISTURA) != ''
          AND TIPO_MOV = 'MIST'
        GROUP BY LOTE_FIAC
      ),
      -- JOIN expandido: buscar cada lote individual (separado por coma) y promediar
      IT_FIBRA AS (
        SELECT 
          IT.ROLADA,
          GROUP_CONCAT(DISTINCT FIBRA_HVI.MISTURA) as MISTURA,
          MIN(FIBRA_HVI.FECHA_INGRESO) as FECHA_INGRESO,
          ROUND(AVG(FIBRA_HVI.SCI), 2) as SCI,
          ROUND(AVG(FIBRA_HVI.MST), 2) as MST,
          ROUND(AVG(FIBRA_HVI.MIC), 2) as MIC,
          ROUND(AVG(FIBRA_HVI.MAT), 2) as MAT,
          ROUND(AVG(FIBRA_HVI.UHML), 2) as UHML,
          ROUND(AVG(FIBRA_HVI.UI), 2) as UI,
          ROUND(AVG(FIBRA_HVI.SF), 2) as SF,
          ROUND(AVG(FIBRA_HVI.STR), 2) as STR,
          ROUND(AVG(FIBRA_HVI.ELG), 2) as ELG,
          ROUND(AVG(FIBRA_HVI.RD), 2) as RD,
          ROUND(AVG(FIBRA_HVI.PLUS_B), 2) as PLUS_B,
          ROUND(AVG(FIBRA_HVI.TrCNT), 2) as TrCNT,
          ROUND(AVG(FIBRA_HVI.TrAR), 2) as TrAR,
          ROUND(AVG(FIBRA_HVI.TRID), 2) as TRID,
          ROUND(AVG(FIBRA_HVI.COLOR_BCO_PCT), 1) as COLOR_BCO_PCT,
          ROUND(AVG(FIBRA_HVI.COLOR_GRI_PCT), 1) as COLOR_GRI_PCT,
          ROUND(AVG(FIBRA_HVI.COLOR_LG_PCT), 1) as COLOR_LG_PCT,
          ROUND(AVG(FIBRA_HVI.COLOR_AMA_PCT), 1) as COLOR_AMA_PCT,
          ROUND(AVG(FIBRA_HVI.COLOR_LA_PCT), 1) as COLOR_LA_PCT
        FROM IT
        LEFT JOIN FIBRA_HVI ON (
          -- Buscar coincidencia exacta o como parte de lista separada por comas
          ',' || REPLACE(IT.LOTE, ' ', '') || ',' LIKE '%,' || FIBRA_HVI.LOTE_NUM || ',%'
        )
        GROUP BY IT.ROLADA
      )
      SELECT
        IT.ROLADA,
        IT.MAQ_OE,
        IT.LOTE,
        ROUND(IT.URDIDORA_METROS, 0) AS URDIDORA_METROS,
        IT.URDIDORA_ROTURAS,
        IT.NUM_FIOS,
        IT.FECHA AS FECHA,
        IT.BASE,
        IT.COLOR,
        ROUND(IT.MTS_IND, 0) AS MTS_IND,
        ROUND(IT.R103, 1) AS R103,
        IT.CAV,
        ROUND(IT.VEL_NOM, 0) AS VEL_NOM,
        ROUND(IT.VEL_PROM, 0) AS VEL_PROM,
        ROUND(IT.MTS_CRUDOS, 0) AS MTS_CRUDOS,
        ROUND(IT.EFI_TEJ, 1) AS EFI_TEJ,
        ROUND(IT.RU105, 1) AS RU105,
        ROUND(IT.RT105, 1) AS RT105,
        ROUND(CAL.MTS_CAL, 0) AS MTS_CAL,
        ROUND(CAL.CAL_PERCENT, 1) AS CAL_PERCENT,
        ROUND(CAL.PTS_100M2, 1) AS PTS_100M2,
        -- Datos HVI (promediados si hay múltiples lotes)
        IT_FIBRA.MISTURA,
        IT_FIBRA.FECHA_INGRESO,
        IT_FIBRA.SCI,
        IT_FIBRA.MST,
        IT_FIBRA.MIC,
        IT_FIBRA.MAT,
        IT_FIBRA.UHML,
        IT_FIBRA.UI,
        IT_FIBRA.SF,
        IT_FIBRA.STR,
        IT_FIBRA.ELG,
        IT_FIBRA.RD,
        IT_FIBRA.PLUS_B,
        IT_FIBRA.TrCNT,
        IT_FIBRA.TrAR,
        IT_FIBRA.TRID,
        IT_FIBRA.COLOR_BCO_PCT,
        IT_FIBRA.COLOR_GRI_PCT,
        IT_FIBRA.COLOR_LG_PCT,
        IT_FIBRA.COLOR_AMA_PCT,
        IT_FIBRA.COLOR_LA_PCT
      FROM IT
      LEFT JOIN CAL ON IT.ROLADA = CAL.ROLADA
      LEFT JOIN IT_FIBRA ON IT.ROLADA = IT_FIBRA.ROLADA
      ORDER BY IT.ROLADA ASC
    `;

    const rows = await dbAll(sql, [fechaInicio, fechaFin]);
    
    // Calcular totales (sin fibra, ya que los promedios no tienen sentido para el total)
    if (rows.length > 0) {
      const roladas = rows.map(r => r.ROLADA);
      
      const sqlTotales = `
        WITH 
        ROLADAS_SEL AS (
          SELECT CAST(value AS INTEGER) AS ROLADA FROM json_each('[' || ? || ']')
        ),
        URD_RAW AS (
          SELECT
            SUM(inner_urd.METRAGEM) / NULLIF(COUNT(DISTINCT inner_urd.PARTIDA), 0) AS TOTAL_URDIDORA_METROS,
            SUM(inner_urd.RUPTURAS) AS TOTAL_URDIDORA_ROTURAS,
            SUM(inner_urd.NUM_FIOS_MAX) AS TOTAL_NUM_FIOS
          FROM (
            SELECT 
              PARTIDA,
              SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METRAGEM,
              SUM(CAST(RUPTURAS AS INTEGER)) AS RUPTURAS,
              MAX(CAST(REPLACE(REPLACE(NUM_FIOS, '.', ''), ',', '.') AS REAL)) AS NUM_FIOS_MAX
            FROM tb_PRODUCCION
            WHERE SELETOR = 'URDIDEIRA'
              AND ROLADA IS NOT NULL
              AND ROLADA != ''
              AND CAST(ROLADA AS INTEGER) IN (SELECT ROLADA FROM ROLADAS_SEL)
            GROUP BY ROLADA, PARTIDA
          ) AS inner_urd
        ),
        IND_RAW AS (
          SELECT
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS TOTAL_MTS_IND,
            SUM(CAST(RUPTURAS AS INTEGER)) AS TOTAL_ROT_IND,
            SUM(CAST(REPLACE(REPLACE(CAVALOS, '.', ''), ',', '.') AS REAL)) AS TOTAL_CAV,
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
                CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL)) AS SUM_VEL_MTS,
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS SUM_MTS_VEL
          FROM tb_PRODUCCION
          WHERE FILIAL = '05'
            AND SELETOR = 'INDIGO'
            AND DT_BASE_PRODUCAO != '19/10/2025'
            AND CAST(ROLADA AS INTEGER) IN (SELECT ROLADA FROM ROLADAS_SEL)
        ),
        TEJ_RAW AS (
          SELECT
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS TOTAL_MTS_CRUDOS,
            SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) AS TOTAL_PONTOS_LIDOS,
            SUM(CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL)) AS TOTAL_PONTOS_100,
            SUM(CAST(REPLACE(REPLACE("PARADA TEC URDUME", '.', ''), ',', '.') AS REAL)) AS TOTAL_PARADA_URD,
            SUM(CAST(REPLACE(REPLACE("PARADA TEC TRAMA", '.', ''), ',', '.') AS REAL)) AS TOTAL_PARADA_TRAMA
          FROM tb_PRODUCCION
          WHERE FILIAL = '05'
            AND SELETOR = 'TECELAGEM'
            AND DT_BASE_PRODUCAO != '19/10/2025'
            AND CAST(ROLADA AS INTEGER) IN (SELECT ROLADA FROM ROLADAS_SEL)
        ),
        CAL_RAW AS (
          SELECT
            SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS TOTAL_MTS_CAL,
            SUM(CASE WHEN QUALIDADE = 'PRIMEIRA ' THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) AS TOTAL_MTS_1ERA,
            SUM(CASE WHEN QUALIDADE = 'PRIMEIRA ' THEN CAST(REPLACE(REPLACE(PONTUACAO, '.', ''), ',', '.') AS REAL) ELSE 0 END) AS TOTAL_PUNTOS,
            SUM(CASE WHEN QUALIDADE = 'PRIMEIRA ' THEN 
                CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
                CAST(REPLACE(REPLACE(LARGURA, '.', ''), ',', '.') AS REAL) 
              ELSE 0 END) AS SUM_MTS_ANCHO
          FROM tb_CALIDAD
          WHERE EMP = 'STC'
            AND CAST(ROLADA AS INTEGER) IN (SELECT ROLADA FROM ROLADAS_SEL)
        )
        SELECT
          ROUND(URD.TOTAL_URDIDORA_METROS, 0) AS URDIDORA_METROS,
          URD.TOTAL_URDIDORA_ROTURAS AS URDIDORA_ROTURAS,
          URD.TOTAL_NUM_FIOS AS NUM_FIOS,
          ROUND(IND.TOTAL_MTS_IND, 0) AS MTS_IND,
          ROUND((IND.TOTAL_ROT_IND * 1000.0) / NULLIF(IND.TOTAL_MTS_IND, 0), 1) AS R103,
          IND.TOTAL_CAV AS CAV,
          ROUND(IND.SUM_VEL_MTS / NULLIF(IND.SUM_MTS_VEL, 0), 0) AS VEL_PROM,
          ROUND(TEJ.TOTAL_MTS_CRUDOS, 0) AS MTS_CRUDOS,
          ROUND((TEJ.TOTAL_PONTOS_LIDOS / NULLIF(TEJ.TOTAL_PONTOS_100, 0)) * 100.0, 1) AS EFI_TEJ,
          ROUND((TEJ.TOTAL_PARADA_URD * 100000.0) / NULLIF((TEJ.TOTAL_PONTOS_LIDOS * 1000.0), 0), 1) AS RU105,
          ROUND((TEJ.TOTAL_PARADA_TRAMA * 100000.0) / NULLIF((TEJ.TOTAL_PONTOS_LIDOS * 1000.0), 0), 1) AS RT105,
          ROUND(CAL.TOTAL_MTS_CAL, 0) AS MTS_CAL,
          ROUND((CAL.TOTAL_MTS_1ERA * 100.0) / NULLIF(CAL.TOTAL_MTS_CAL, 0), 1) AS CAL_PERCENT,
          ROUND((CAL.TOTAL_PUNTOS * 100.0) / NULLIF(CAL.SUM_MTS_ANCHO / 100.0, 0), 1) AS PTS_100M2
        FROM URD_RAW URD, IND_RAW IND, TEJ_RAW TEJ, CAL_RAW CAL
      `;
      
      const roladasStr = roladas.join(',');
      const totalesRows = await dbAll(sqlTotales, [roladasStr]);
      const totales = totalesRows[0] || {};
      totales.TOTAL_ROLADAS = rows.length;
      
      res.json({ datos: rows, totales });
    } else {
      res.json({ datos: [], totales: null });
    }

  } catch (error) {
    console.error('Error en /api/seguimiento-roladas-fibra:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Endpoint para obtener datos detallados de MISTURA con promedios ponderados
app.get('/api/calidad-fibra-mistura', (req, res) => {
  const { mistura } = req.query;
  
  console.log('🔍 Solicitud de MISTURA:', mistura);
  
  if (!mistura) {
    return res.status(400).json({ error: 'Parámetro mistura requerido' });
  }
  
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Error conectando a BD:', err);
      return res.status(500).json({ error: err.message });
    }
  });
  
  // Primero verificar si la tabla existe
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='tb_CALIDAD_FIBRA'", (err, tableCheck) => {
    if (err) {
      console.error('❌ Error verificando tabla:', err);
      db.close();
      return res.status(500).json({ error: err.message });
    }
    
    if (!tableCheck) {
      console.error('❌ Tabla tb_CALIDAD_FIBRA no existe');
      db.close();
      return res.status(404).json({ error: 'Tabla tb_CALIDAD_FIBRA no encontrada' });
    }
    
    console.log('✓ Tabla tb_CALIDAD_FIBRA existe');
    
    // Consultar datos de tb_CALIDAD_FIBRA donde TIPO_MOV = 'MIST' y MISTURA coincide
    const query = `
      SELECT 
        SEQ,
        DT_ENTRADA_PROD,
        HR_ENTRADA_PROD,
        SCI,
        MST,
        MIC,
        MAT,
        UHML,
        UI,
        SF,
        STR,
        ELG,
        RD,
        PLUS_B,
        TrCNT,
        TrAR,
        TRID,
        PESO
      FROM tb_CALIDAD_FIBRA
      WHERE TIPO_MOV = 'MIST' 
        AND MISTURA = ?
      ORDER BY SEQ, DT_ENTRADA_PROD, HR_ENTRADA_PROD
    `;
    
    db.all(query, [mistura], (err, rows) => {
      if (err) {
        console.error('❌ Error en query:', err);
        db.close();
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`📊 Encontrados ${rows.length} registros para MISTURA ${mistura}`);
      
      // Si no hay resultados con la MISTURA exacta, intentar con padding de ceros
      if (rows.length === 0) {
        const misturaPadded = mistura.padStart(10, '0');
        console.log(`🔄 Reintentando con MISTURA padded: ${misturaPadded}`);
        
        db.all(query, [misturaPadded], (err2, rows2) => {
          if (err2) {
            console.error('❌ Error en query con padding:', err2);
            db.close();
            return res.status(500).json({ error: err2.message });
          }
          
          console.log(`📊 Encontrados ${rows2.length} registros con padding`);
          procesarResultados(rows2);
        });
        return;
      }
      
      procesarResultados(rows);
    });
    
    // Función para procesar los resultados y calcular promedios
    function procesarResultados(rows) {
      if (rows.length === 0) {
        db.close();
        return res.json({ seqs: [], mistura, totales: {} });
      }
      
      // Calcular totales ponderados de TODA la MISTURA (sin agrupar por SEQ)
      // Se mantiene un acumulador de peso por variable para excluir valores nulos/cero
      const totalesMistura = {
        SCI: 0, MST: 0, MIC: 0, MAT: 0, UHML: 0, UI: 0, SF: 0,
        STR: 0, ELG: 0, RD: 0, PLUS_B: 0, TrCNT: 0, TrAR: 0, TRID: 0
      };
      
      const pesosPorVariable = {
        SCI: 0, MST: 0, MIC: 0, MAT: 0, UHML: 0, UI: 0, SF: 0,
        STR: 0, ELG: 0, RD: 0, PLUS_B: 0, TrCNT: 0, TrAR: 0, TRID: 0
      };
      
      rows.forEach(row => {
        // Convertir PESO de formato europeo (1.100,00) a número
        const pesoStr = String(row.PESO || '').replace(/\./g, '').replace(',', '.');
        const peso = parseFloat(pesoStr);
        if (!peso || peso <= 0) return; // Saltar si no hay peso válido
        
        const variables = ['SCI', 'MST', 'MIC', 'MAT', 'UHML', 'UI', 'SF', 'STR', 'ELG', 'RD', 'PLUS_B', 'TrCNT', 'TrAR', 'TRID'];
        variables.forEach(v => {
          // Convertir valor de formato europeo a número
          const valueStr = String(row[v] || '').replace(/\./g, '').replace(',', '.');
          const value = parseFloat(valueStr);
          // Solo incluir si el valor es válido (no nulo, no cero, no NaN)
          if (value !== null && value !== undefined && !isNaN(value) && value !== 0) {
            totalesMistura[v] += value * peso;
            pesosPorVariable[v] += peso;
          }
        });
      });
      
      // Calcular promedios ponderados totales (solo con registros válidos de cada variable)
      const promediosTotales = {};
      const variables = ['SCI', 'MST', 'MIC', 'MAT', 'UHML', 'UI', 'SF', 'STR', 'ELG', 'RD', 'PLUS_B', 'TrCNT', 'TrAR', 'TRID'];
      variables.forEach(v => {
        promediosTotales[v] = pesosPorVariable[v] > 0 ? totalesMistura[v] / pesosPorVariable[v] : null;
      });
      promediosTotales['+b'] = promediosTotales.PLUS_B;
      
      // Agrupar por SEQ y calcular promedios ponderados
      const seqMap = {};
      
      rows.forEach(row => {
        const seq = row.SEQ;
        if (!seqMap[seq]) {
          seqMap[seq] = {
            SEQ: seq,
            DT_ENTRADA_PROD: row.DT_ENTRADA_PROD,
            HR_ENTRADA_PROD: row.HR_ENTRADA_PROD,
            // Acumuladores para promedios ponderados
            SCI: 0, MST: 0, MIC: 0, MAT: 0, UHML: 0, UI: 0, SF: 0,
            STR: 0, ELG: 0, RD: 0, PLUS_B: 0, TrCNT: 0, TrAR: 0, TRID: 0,
            // Pesos válidos por variable
            pesoSCI: 0, pesoMST: 0, pesoMIC: 0, pesoMAT: 0, pesoUHML: 0, pesoUI: 0, pesoSF: 0,
            pesoSTR: 0, pesoELG: 0, pesoRD: 0, pesoPLUS_B: 0, pesoTrCNT: 0, pesoTrAR: 0, pesoTRID: 0
          };
        }
        
        // Convertir PESO de formato europeo (1.100,00) a número
        const pesoStr = String(row.PESO || '').replace(/\./g, '').replace(',', '.');
        const peso = parseFloat(pesoStr);
        if (!peso || peso <= 0) return; // Saltar si no hay peso válido
        
        // Acumular valores ponderados por PESO solo si el valor es válido
        const variables = ['SCI', 'MST', 'MIC', 'MAT', 'UHML', 'UI', 'SF', 'STR', 'ELG', 'RD', 'PLUS_B', 'TrCNT', 'TrAR', 'TRID'];
        variables.forEach(v => {
          // Convertir valor de formato europeo a número
          const valueStr = String(row[v] || '').replace(/\./g, '').replace(',', '.');
          const value = parseFloat(valueStr);
          // Solo incluir si el valor es válido (no nulo, no cero, no NaN)
          if (value !== null && value !== undefined && !isNaN(value) && value !== 0) {
            seqMap[seq][v] += value * peso;
            seqMap[seq]['peso' + v] += peso;
          }
        });
      });
      
      // Calcular promedios ponderados dividiendo por peso válido de cada variable
      const seqs = Object.values(seqMap).map(seq => {
        const result = {
          SEQ: seq.SEQ,
          DT_ENTRADA_PROD: seq.DT_ENTRADA_PROD,
          HR_ENTRADA_PROD: seq.HR_ENTRADA_PROD
        };
        
        const variables = ['SCI', 'MST', 'MIC', 'MAT', 'UHML', 'UI', 'SF', 'STR', 'ELG', 'RD', 'PLUS_B', 'TrCNT', 'TrAR', 'TRID'];
        variables.forEach(v => {
          const pesoVariable = seq['peso' + v];
          result[v] = pesoVariable > 0 ? seq[v] / pesoVariable : null;
        });
        
        // Renombrar PLUS_B a +b para consistencia
        result['+b'] = result.PLUS_B;
        delete result.PLUS_B;
        
        return result;
      });
      
      console.log(`✅ Devolviendo ${seqs.length} SEQs para MISTURA ${mistura} con promedios totales`);
      
      db.close();
      res.json({ mistura, seqs, totales: promediosTotales });
    }
  });
});

// ✅ Health check endpoint
app.get('/api/health', (req, res) => {
  const dbExists = fs.existsSync(DB_PATH);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbExists ? 'connected' : 'error',
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// ============================================================================
// ENDPOINT: Métricas diarias de CALIDAD para gráficos
// Solo tb_CALIDAD: Calidad% y Pts100m² por día
// ============================================================================
app.get('/api/metricas-diarias-calidad', async (req, res) => {
  console.log('📊 [metricas-diarias-calidad] Endpoint llamado');
  try {
    const { fechaInicio, fechaFin } = req.query;
    console.log(`📊 Parámetros: ${fechaInicio} - ${fechaFin}`);

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Parámetros fechaInicio y fechaFin requeridos (formato: YYYY-MM-DD)' });
    }

    // Query para obtener métricas de calidad por día
    const sql = `
      SELECT 
        DATE(DAT_PROD) AS FECHA,
        ROUND(
          SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' 
              THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) * 100.0 / 
          NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0), 1
        ) AS CALIDAD_PERCENT,
        ROUND(
          SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' 
              THEN CAST(REPLACE(REPLACE(PONTUACAO, '.', ''), ',', '.') AS REAL) ELSE 0 END) * 100.0 /
          NULLIF(
            SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' 
                THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
                     CAST(REPLACE(REPLACE(LARGURA, '.', ''), ',', '.') AS REAL) / 100.0 ELSE 0 END), 0
          ), 2
        ) AS PTS_100M2,
        SUM(CASE WHEN QUALIDADE LIKE 'PRIMEIRA%' 
            THEN CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) ELSE 0 END) AS METROS_1ERA,
        SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)) AS METROS_TOTAL,
        COUNT(*) AS ROLLOS
      FROM tb_CALIDAD 
      WHERE EMP = 'STC' 
        AND DATE(DAT_PROD) BETWEEN DATE(?) AND DATE(?)
        AND QUALIDADE NOT LIKE '%RETALHO%'
      GROUP BY DATE(DAT_PROD)
      ORDER BY FECHA
    `;
    
    console.log('📊 Ejecutando query...');
    const datos = await dbAll(sql, [fechaInicio, fechaFin]);
    console.log(`📊 Resultados: ${datos.length} días`);
    
    // Calcular rangos para normalización
    const rangos = {};
    const metricas = ['CALIDAD_PERCENT', 'PTS_100M2', 'METROS_1ERA', 'METROS_TOTAL'];
    
    metricas.forEach(m => {
      const valores = datos.map(r => r[m]).filter(v => v !== null && v !== undefined && !isNaN(v));
      if (valores.length > 0) {
        rangos[m] = {
          min: Math.min(...valores),
          max: Math.max(...valores),
          avg: valores.reduce((a, b) => a + b, 0) / valores.length
        };
      }
    });

    res.json({ 
      datos, 
      rangos,
      totalDias: datos.length 
    });

  } catch (error) {
    console.error('Error en /api/metricas-diarias-calidad:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT: Métricas diarias de PRODUCCION para gráficos
// tb_PRODUCCION: Urdidora (RU103), Índigo (Metros, R103, Velocidad), Tejeduría (Eficiencia, RU105, RT105)
// ============================================================================
app.get('/api/metricas-diarias-produccion', async (req, res) => {
  console.log('📊 [metricas-diarias-produccion] Endpoint llamado');
  try {
    const { fechaInicio, fechaFin } = req.query;
    console.log(`📊 Parámetros: ${fechaInicio} - ${fechaFin}`);

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Parámetros fechaInicio y fechaFin requeridos (formato: YYYY-MM-DD)' });
    }

    // Convertir fechas YYYY-MM-DD a DD/MM/YYYY para comparar con DT_BASE_PRODUCAO
    const fechaInicioArr = fechaInicio.split('-');
    const fechaFinArr = fechaFin.split('-');
    const fechaInicioDB = `${fechaInicioArr[2]}/${fechaInicioArr[1]}/${fechaInicioArr[0]}`;
    const fechaFinDB = `${fechaFinArr[2]}/${fechaFinArr[1]}/${fechaFinArr[0]}`;

    // Query para métricas de producción por día
    const sql = `
      WITH FECHAS AS (
        SELECT DISTINCT DT_BASE_PRODUCAO AS FECHA
        FROM tb_PRODUCCION
        WHERE FILIAL = '05'
          AND substr(DT_BASE_PRODUCAO, 7, 4) || '-' || 
              substr(DT_BASE_PRODUCAO, 4, 2) || '-' || 
              substr(DT_BASE_PRODUCAO, 1, 2) BETWEEN ? AND ?
        ORDER BY substr(DT_BASE_PRODUCAO, 7, 4) || '-' || 
                 substr(DT_BASE_PRODUCAO, 4, 2) || '-' || 
                 substr(DT_BASE_PRODUCAO, 1, 2)
      )
      SELECT 
        F.FECHA AS FECHA_DB,
        substr(F.FECHA, 7, 4) || '-' || substr(F.FECHA, 4, 2) || '-' || substr(F.FECHA, 1, 2) AS FECHA,
        
        -- Urdidora: RU106 (rupturas por millón de metros-hilo)
        -- Fórmula: (RUPTURAS * 1,000,000) / (METRAGEM * NUM_FIOS)
        (SELECT ROUND(
          (SUM(CAST(p.RUPTURAS AS INTEGER)) * 1000000.0) / 
          NULLIF(
            SUM(
              CAST(REPLACE(REPLACE(p.METRAGEM, '.', ''), ',', '.') AS REAL) * 
              CAST(REPLACE(REPLACE(p.NUM_FIOS, '.', ''), ',', '.') AS REAL)
            ), 0
          ), 2)
         FROM tb_PRODUCCION p 
         WHERE p.SELETOR = 'URDIDEIRA' AND p.FILIAL = '05' AND p.DT_BASE_PRODUCAO = F.FECHA
           AND p.NUM_FIOS IS NOT NULL AND p.NUM_FIOS != ''
        ) AS RU106_URDIDORA,
        
        -- Índigo: Metros
        (SELECT ROUND(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0)
         FROM tb_PRODUCCION WHERE SELETOR = 'INDIGO' AND FILIAL = '05' AND DT_BASE_PRODUCAO = F.FECHA
        ) AS METROS_INDIGO,
        
        -- Índigo: R103 (rupturas por 1000m)
        (SELECT ROUND((SUM(CAST(RUPTURAS AS INTEGER)) * 1000.0) / 
                      NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0), 2)
         FROM tb_PRODUCCION WHERE SELETOR = 'INDIGO' AND FILIAL = '05' AND DT_BASE_PRODUCAO = F.FECHA
        ) AS R103_INDIGO,
        
        -- Índigo: Velocidad ponderada por metros
        (SELECT ROUND(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL) * 
                          CAST(REPLACE(REPLACE(VELOC, '.', ''), ',', '.') AS REAL)) / 
                      NULLIF(SUM(CAST(REPLACE(REPLACE(METRAGEM, '.', ''), ',', '.') AS REAL)), 0), 0)
         FROM tb_PRODUCCION WHERE SELETOR = 'INDIGO' AND FILIAL = '05' AND DT_BASE_PRODUCAO = F.FECHA
        ) AS VELOCIDAD_INDIGO,
        
        -- Tejeduría: Eficiencia %
        (SELECT ROUND((SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) / 
                       NULLIF(SUM(CASE WHEN CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL) > 0 
                                  THEN CAST(REPLACE(REPLACE("PONTOS_100%", '.', ''), ',', '.') AS REAL) ELSE 0 END), 0)) * 100.0, 1)
         FROM tb_PRODUCCION WHERE SELETOR = 'TECELAGEM' AND FILIAL = '05' AND DT_BASE_PRODUCAO = F.FECHA
        ) AS EFICIENCIA_TELAR,
        
        -- Tejeduría: RU105 (paradas urdumbre por 100k puntos)
        (SELECT ROUND((SUM(CAST(REPLACE(REPLACE("PARADA TEC URDUME", '.', ''), ',', '.') AS REAL)) * 100000.0) / 
                      NULLIF((SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) * 1000.0), 0), 2)
         FROM tb_PRODUCCION WHERE SELETOR = 'TECELAGEM' AND FILIAL = '05' AND DT_BASE_PRODUCAO = F.FECHA
        ) AS RU105_TELAR,
        
        -- Tejeduría: RT105 (paradas trama por 100k puntos)
        (SELECT ROUND((SUM(CAST(REPLACE(REPLACE("PARADA TEC TRAMA", '.', ''), ',', '.') AS REAL)) * 100000.0) / 
                      NULLIF((SUM(CAST(REPLACE(REPLACE(PONTOS_LIDOS, '.', ''), ',', '.') AS REAL)) * 1000.0), 0), 2)
         FROM tb_PRODUCCION WHERE SELETOR = 'TECELAGEM' AND FILIAL = '05' AND DT_BASE_PRODUCAO = F.FECHA
        ) AS RT105_TELAR
        
      FROM FECHAS F
    `;
    
    console.log('📊 Ejecutando query producción...');
    const datos = await dbAll(sql, [fechaInicio, fechaFin]);
    console.log(`📊 Resultados: ${datos.length} días`);
    
    // Calcular rangos para normalización
    const rangos = {};
    const metricas = ['RU106_URDIDORA', 'METROS_INDIGO', 'R103_INDIGO', 'VELOCIDAD_INDIGO', 
                      'EFICIENCIA_TELAR', 'RU105_TELAR', 'RT105_TELAR'];
    
    metricas.forEach(m => {
      const valores = datos.map(r => r[m]).filter(v => v !== null && v !== undefined && !isNaN(v));
      if (valores.length > 0) {
        rangos[m] = {
          min: Math.min(...valores),
          max: Math.max(...valores),
          avg: valores.reduce((a, b) => a + b, 0) / valores.length
        };
      }
    });

    res.json({ 
      datos, 
      rangos,
      totalDias: datos.length 
    });

  } catch (error) {
    console.error('Error en /api/metricas-diarias-produccion:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT: Métricas diarias de FIBRA HVI para gráficos
// tb_CALIDAD_FIBRA: Promedios ponderados por peso de SCI, MIC, MAT, UHML, UI, SF, STR, ELG, RD, +b
// ============================================================================
app.get('/api/metricas-diarias-fibra', async (req, res) => {
  console.log('📊 [metricas-diarias-fibra] Endpoint llamado');
  try {
    const { fechaInicio, fechaFin } = req.query;
    console.log(`📊 Parámetros: ${fechaInicio} - ${fechaFin}`);

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Parámetros fechaInicio y fechaFin requeridos (formato: YYYY-MM-DD)' });
    }

    // Query para métricas de fibra HVI por día (promedios ponderados por PESO)
    // PESO viene en formato europeo: "2.485,33" (punto=miles, coma=decimal)
    const sql = `
      WITH BASE AS (
        SELECT
          *,
          CASE
            WHEN HR_ENTRADA_PROD IS NULL OR HR_ENTRADA_PROD = '' THEN DT_ENTRADA_PROD
            WHEN CAST(substr(HR_ENTRADA_PROD, 1, 2) AS INTEGER) >= 6 THEN DT_ENTRADA_PROD
            ELSE (
              -- Convertir fecha a ISO, restar 1 día, convertir de vuelta a DD/MM/YYYY
              substr(date(substr(DT_ENTRADA_PROD, 7, 4) || '-' || substr(DT_ENTRADA_PROD, 4, 2) || '-' || substr(DT_ENTRADA_PROD, 1, 2), '-1 day'), 9, 2) || '/' ||
              substr(date(substr(DT_ENTRADA_PROD, 7, 4) || '-' || substr(DT_ENTRADA_PROD, 4, 2) || '-' || substr(DT_ENTRADA_PROD, 1, 2), '-1 day'), 6, 2) || '/' ||
              substr(date(substr(DT_ENTRADA_PROD, 7, 4) || '-' || substr(DT_ENTRADA_PROD, 4, 2) || '-' || substr(DT_ENTRADA_PROD, 1, 2), '-1 day'), 1, 4)
            )
          END AS FECHA_PRODUCTIVA_DB,
          CASE
            WHEN HR_ENTRADA_PROD IS NULL OR HR_ENTRADA_PROD = '' THEN
              substr(DT_ENTRADA_PROD, 7, 4) || '-' || substr(DT_ENTRADA_PROD, 4, 2) || '-' || substr(DT_ENTRADA_PROD, 1, 2)
            WHEN CAST(substr(HR_ENTRADA_PROD, 1, 2) AS INTEGER) >= 6 THEN
              substr(DT_ENTRADA_PROD, 7, 4) || '-' || substr(DT_ENTRADA_PROD, 4, 2) || '-' || substr(DT_ENTRADA_PROD, 1, 2)
            ELSE
              date(
                substr(DT_ENTRADA_PROD, 7, 4) || '-' || 
                substr(DT_ENTRADA_PROD, 4, 2) || '-' || 
                substr(DT_ENTRADA_PROD, 1, 2),
                '-1 day'
              )
          END AS FECHA_PRODUCTIVA
        FROM tb_CALIDAD_FIBRA
        WHERE TIPO_MOV = 'MIST'
      ),
      FECHAS AS (
        SELECT DISTINCT FECHA_PRODUCTIVA_DB AS FECHA
        FROM BASE
        WHERE FECHA_PRODUCTIVA BETWEEN ? AND ?
        ORDER BY FECHA_PRODUCTIVA
      )
      SELECT 
        F.FECHA AS FECHA_DB,
        substr(F.FECHA, 7, 4) || '-' || substr(F.FECHA, 4, 2) || '-' || substr(F.FECHA, 1, 2) AS FECHA,
        
        -- SCI (ponderado por peso)
        (SELECT ROUND(
          SUM(CASE WHEN CAST(REPLACE(SCI, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(SCI, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN CAST(REPLACE(SCI, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END), 0), 2)
         FROM BASE WHERE FECHA_PRODUCTIVA_DB = F.FECHA
        ) AS SCI,
        
        -- MIC (ponderado por peso)
        (SELECT ROUND(
          SUM(CASE WHEN CAST(REPLACE(MIC, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(MIC, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN CAST(REPLACE(MIC, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END), 0), 2)
         FROM BASE WHERE FECHA_PRODUCTIVA_DB = F.FECHA
        ) AS MIC,
        
        -- MAT (ponderado por peso)
        (SELECT ROUND(
          SUM(CASE WHEN CAST(REPLACE(MAT, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(MAT, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN CAST(REPLACE(MAT, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END), 0), 2)
         FROM BASE WHERE FECHA_PRODUCTIVA_DB = F.FECHA
        ) AS MAT,
        
        -- UHML (ponderado por peso)
        (SELECT ROUND(
          SUM(CASE WHEN CAST(REPLACE(UHML, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(UHML, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN CAST(REPLACE(UHML, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END), 0), 2)
         FROM BASE WHERE FECHA_PRODUCTIVA_DB = F.FECHA
        ) AS UHML,
        
        -- UI (ponderado por peso)
        (SELECT ROUND(
          SUM(CASE WHEN CAST(REPLACE(UI, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(UI, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN CAST(REPLACE(UI, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END), 0), 2)
         FROM BASE WHERE FECHA_PRODUCTIVA_DB = F.FECHA
        ) AS UI,
        
        -- SF (ponderado por peso)
        (SELECT ROUND(
          SUM(CASE WHEN CAST(REPLACE(SF, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(SF, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN CAST(REPLACE(SF, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END), 0), 2)
         FROM BASE WHERE FECHA_PRODUCTIVA_DB = F.FECHA
        ) AS SF,
        
        -- STR (ponderado por peso)
        (SELECT ROUND(
          SUM(CASE WHEN CAST(REPLACE(STR, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(STR, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN CAST(REPLACE(STR, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END), 0), 2)
         FROM BASE WHERE FECHA_PRODUCTIVA_DB = F.FECHA
        ) AS STR,
        
        -- ELG (ponderado por peso)
        (SELECT ROUND(
          SUM(CASE WHEN CAST(REPLACE(ELG, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(ELG, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN CAST(REPLACE(ELG, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END), 0), 2)
         FROM BASE WHERE FECHA_PRODUCTIVA_DB = F.FECHA
        ) AS ELG,
        
        -- RD (ponderado por peso)
        (SELECT ROUND(
          SUM(CASE WHEN CAST(REPLACE(RD, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(RD, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN CAST(REPLACE(RD, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END), 0), 2)
         FROM BASE WHERE FECHA_PRODUCTIVA_DB = F.FECHA
        ) AS RD,
        
        -- PLUS_B (+b, ponderado por peso)
        (SELECT ROUND(
          SUM(CASE WHEN CAST(REPLACE(PLUS_B, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(PLUS_B, ',', '.') AS REAL) * CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN CAST(REPLACE(PLUS_B, ',', '.') AS REAL) > 0 
              THEN CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL) ELSE 0 END), 0), 2)
         FROM BASE WHERE FECHA_PRODUCTIVA_DB = F.FECHA
        ) AS PLUS_B,
        
        -- Total peso del día
        (SELECT ROUND(SUM(CAST(REPLACE(REPLACE(PESO, '.', ''), ',', '.') AS REAL)), 0)
         FROM BASE WHERE FECHA_PRODUCTIVA_DB = F.FECHA
        ) AS PESO_TOTAL
        
      FROM FECHAS F
    `;
    
    console.log('📊 Ejecutando query fibra...');
    try {
      const datos = await dbAll(sql, [fechaInicio, fechaFin]);
      console.log(`📊 Resultados: ${datos.length} días`);
    
      // Calcular rangos para normalización
      const rangos = {};
      const metricas = ['SCI', 'MIC', 'MAT', 'UHML', 'UI', 'SF', 'STR', 'ELG', 'RD', 'PLUS_B'];
    
      metricas.forEach(m => {
        const valores = datos.map(r => r[m]).filter(v => v !== null && v !== undefined && !isNaN(v));
        if (valores.length > 0) {
          rangos[m] = {
            min: Math.min(...valores),
          max: Math.max(...valores),
          avg: valores.reduce((a, b) => a + b, 0) / valores.length
        };
      }
    });

    res.json({ 
      datos, 
      rangos,
      totalDias: datos.length 
    });
    } catch (innerError) {
      console.error('❌ Error ejecutando query fibra:', innerError);
      throw innerError;
    }

  } catch (error) {
    console.error('Error en /api/metricas-diarias-fibra:', error);
    res.status(500).json({ error: error.message });
  }
});

// TEST: Endpoint simple para diagnosticar crashes
app.get('/api/test-calidad-simple', async (req, res) => {
  console.log('🧪 [test-calidad-simple] Iniciando...');
  try {
    console.log('🧪 Ejecutando query simple...');
    const result = await dbAll(`SELECT COUNT(*) as total FROM tb_CALIDAD LIMIT 1`);
    console.log('🧪 Query completada:', result);
    res.json({ success: true, result });
  } catch (error) {
    console.error('🧪 Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Catch-all para Vue Router (debe ir al final, después de todas las rutas API)
// Express 5 usa use() en lugar de get() para catch-all
app.use((req, res, next) => {
  // Solo servir index.html para rutas que no son de API
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend no encontrado. Ejecuta: npm run build');
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

// Iniciar servidor en todas las interfaces de red
const HOST = '0.0.0.0'; // Escuchar en todas las IPs
app.listen(PORT, HOST, () => {
  console.log('');
  console.log('========================================');
  console.log('  🚀 Servidor STC Producción Iniciado');
  console.log('========================================');
  console.log('');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`📁 Base de datos: ${DB_PATH}`);
  
  // Mostrar IP local para acceso en red
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const localIPs = [];
  
  Object.keys(interfaces).forEach(name => {
    interfaces[name].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIPs.push(iface.address);
      }
    });
  });
  
  console.log('');
  console.log('🌐 Acceso:');
  console.log(`   Local:     http://localhost:${PORT}`);
  localIPs.forEach(ip => {
    console.log(`   Red local: http://${ip}:${PORT}`);
  });
  console.log('');
  console.log('Presiona Ctrl+C para detener');
  console.log('========================================');
  console.log('');
});

// =====================================================================
// ENDPOINTS - Sistema de Alertas
// =====================================================================

// GET /api/alerts - Obtener alertas activas (últimas 24 horas)
app.get('/api/alerts', async (req, res) => {
  try {
    const fs = require('fs');
    const alertsLogPath = path.join(__dirname, '..', 'logs', 'alerts.log');
    
    // Verificar si existe el archivo de log
    if (!fs.existsSync(alertsLogPath)) {
      return res.json([]);
    }
    
    const alertsContent = fs.readFileSync(alertsLogPath, 'utf-8');
    const alertsLog = alertsContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(alert => alert !== null)
      .filter(alert => {
        // Solo últimas 24 horas
        const alertTime = new Date(alert.timestamp);
        const now = new Date();
        return (now - alertTime) < 24 * 60 * 60 * 1000;
      });
    
    res.json(alertsLog);
  } catch (error) {
    console.error('Error en /api/alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/alerts/summary - Resumen de alertas por tipo
app.get('/api/alerts/summary', async (req, res) => {
  try {
    const fs = require('fs');
    const alertsLogPath = path.join(__dirname, '..', 'logs', 'alerts.log');
    
    if (!fs.existsSync(alertsLogPath)) {
      return res.json({ total: 0, por_tipo: {} });
    }
    
    const alertsContent = fs.readFileSync(alertsLogPath, 'utf-8');
    const alertsLog = alertsContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(alert => alert !== null)
      .filter(alert => {
        const alertTime = new Date(alert.timestamp);
        const now = new Date();
        return (now - alertTime) < 24 * 60 * 60 * 1000;
      });
    
    // Contar por tipo
    const porTipo = {};
    alertsLog.forEach(alert => {
      porTipo[alert.type] = (porTipo[alert.type] || 0) + 1;
    });
    
    res.json({
      total: alertsLog.length,
      por_tipo: porTipo,
      ultima_actualizacion: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /api/alerts/summary:', error);
    res.status(500).json({ error: error.message });
  }
});


// GET /api/metrics/daily - Métricas diarias para dashboard
app.get('/api/metrics/daily', async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    
    // Producción total
    const produccion = await dbGet(`
      SELECT SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) as total_metros
      FROM tb_PRODUCCION 
      WHERE SELETOR = 'TECELAGEM' 
        AND DATE(DT_BASE_PRODUCAO) = ?
    `, [fecha]);
    
    // Calidad promedio
    const calidad = await dbGet(`
      SELECT 
        COUNT(*) as total_piezas,
        SUM(CASE WHEN QUALIDADE LIKE '%1ERA%' THEN 1 ELSE 0 END) as piezas_1era,
        ROUND(100.0 * SUM(CASE WHEN QUALIDADE LIKE '%1ERA%' THEN 1 ELSE 0 END) / COUNT(*), 2) as porc_calidad
      FROM tb_CALIDAD 
      WHERE DATE(DAT_PROD) = ? AND EMP = 'STC'
    `, [fecha]);
    
    // Horas de parada
    const paradas = await dbGet(`
      SELECT SUM(CAST(REPLACE(DURACAO, ',', '.') AS REAL)) as horas_parada
      FROM tb_PARADAS 
      WHERE DATE(DT_INICIAL) = ?
    `, [fecha]);
    
    // Top 3 motivos de parada
    const topMotivos = await dbAll(`
      SELECT 
        MOTIVO,
        SUM(CAST(REPLACE(DURACAO, ',', '.') AS REAL)) as horas_total,
        COUNT(*) as cantidad
      FROM tb_PARADAS
      WHERE DATE(DT_INICIAL) = ?
      GROUP BY MOTIVO
      ORDER BY horas_total DESC
      LIMIT 3
    `, [fecha]);
    
    res.json({
      fecha,
      produccion: {
        metros_total: produccion?.total_metros || 0
      },
      calidad: {
        total_piezas: calidad?.total_piezas || 0,
        piezas_1era: calidad?.piezas_1era || 0,
        porcentaje: calidad?.porc_calidad || 0
      },
      paradas: {
        horas_total: paradas?.horas_parada || 0,
        top_motivos: topMotivos
      }
    });
  } catch (error) {
    console.error('Error en /api/metrics/daily:', error);
    res.status(500).json({ error: error.message });
  }
});