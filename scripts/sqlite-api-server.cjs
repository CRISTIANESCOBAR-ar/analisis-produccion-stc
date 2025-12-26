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
  { table: 'tb_DEFECTOS', filename: 'rptDefPeca.csv', sheet: 'rptDefPeca' }
];

// Helper para obtener configuración con ruta dinámica
const getTableConfig = (folderPath) => {
  const root = folderPath || 'C:\\STC';
  return TABLE_DEFINITIONS.map(def => ({
    ...def,
    xlsxPath: path.join(root, def.filename)
  }));
};

// Middleware
app.use(cors({
  origin: '*', // Permitir todas las IPs de red local
  credentials: true
}));
app.use(express.json());

// ✅ Servir archivos estáticos del frontend (producción)
const distPath = path.join(__dirname, '../dist');
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

initCostosMensualesSchema().catch((err) => {
  console.error('❌ Error inicializando esquema de costos mensuales:', err);
});

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
    const csvFolder = req.query.csvFolder || 'C:\\STC';
    const configs = getTableConfig(csvFolder);
    const statusList = [];

    for (const config of configs) {
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
  let csvFolder = req.body.csvFolder || 'C:\\STC';
  // Sanitizar ruta: eliminar barra final si existe para evitar problemas de escape en PowerShell
  if (csvFolder.endsWith('\\')) {
    csvFolder = csvFolder.slice(0, -1);
  }

  // Usar script secuencial optimizado (paralelo no mejora por limitaciones SQLite)
  const scriptPath = path.join(__dirname, 'import-all-fast.ps1');
  const command = `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -CsvFolder "${csvFolder}"`;

  console.log(`⚡ Forzando importación completa desde ${csvFolder}...`);

  try {
    const tStart = Date.now();
    // Ejecutar script y esperar resultado
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 10 * 1024 * 1024, timeout: 300000 }, (error, stdout, stderr) => { // Timeout aumentado a 5 min
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
    'tb_DEFECTOS': 'import-defectos-fast.ps1'
  };

  const scriptFile = scriptMap[table] || 'import-calidad-fast.ps1';
  const scriptPath = path.join(__dirname, scriptFile);
  
  // El script import-calidad-fast.ps1 espera XlsxPath pero maneja CSV si la extensión es .csv
  const command = `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -XlsxPath "${config.xlsxPath}" -SqlitePath "${DB_PATH}" -Sheet "${config.sheet}"`;

  console.log(`⚡ Forzando importación de ${table} desde ${config.xlsxPath}...`);
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
    'tb_DEFECTOS': 'import-defectos-fast.ps1'
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

    const command = `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -XlsxPath "${config.xlsxPath}" -SqlitePath "${DB_PATH}" -Sheet "${config.sheet}"`;

    console.log(`  ⚡ Importando ${table} desde ${config.xlsxPath} usando ${scriptFile}...`);
    
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
    const limite = parseInt(req.query.limite) || 24; // Por defecto últimos 24 meses
    
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
    const { fecha_inicio, fecha_fin } = req.query;
    
    // Filtro de fechas opcional (si no se envían, trae todo)
    let dateFilter = '';
    let produccionWhere = "WHERE P.SELETOR = 'INDIGO'";
    let tejeduriaWhere = "WHERE P.SELETOR = 'TECELAGEM'";
    let residuosWhere = "WHERE DESCRICAO = 'ESTOPA AZUL'";
    let residuosTejeduriaWhere = "WHERE DESCRICAO = 'ESTOPA AZUL TEJEDURÍA'";
    let anudadosWhere = "WHERE MOTIVO = 101";
    let prensadaWhere = "WHERE DESCRICAO = 'ESTOPA AZUL'";
    
    const params = [];
    
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
      params.push(fecha_inicio, fecha_fin); // ProduccionDiaria
      params.push(fecha_inicio, fecha_fin); // TejeduriaProduccion
      params.push(fecha_inicio, fecha_fin); // ResiduosDiarios
      params.push(fecha_inicio, fecha_fin); // ResiduosTejeduria
      params.push(fecha_inicio, fecha_fin); // AnudadosDiarios
      params.push(fecha_inicio, fecha_fin); // ResiduosPrensada
      
      // Params for outer query
      params.push(fecha_inicio, fecha_fin);
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

    const rows = await dbAll(sql, params);
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
    const { fecha } = req.query;
    
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
    const { fecha } = req.query;
    
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
    const { fecha_inicio, fecha_fin } = req.query;
    
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
    const { fecha_inicial, fecha_final } = req.query;

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
// ENDPOINT - Consulta ROLADA ÍNDIGO
// =====================================================================
app.get('/api/consulta-rolada-indigo', async (req, res) => {
  try {
    const { rolada } = req.query;
    
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

// ✅ Catch-all para Vue Router (debe ir al final, después de todas las rutas API)
app.get('*', (req, res) => {
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
