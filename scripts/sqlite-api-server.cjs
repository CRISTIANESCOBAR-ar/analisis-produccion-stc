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

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, '../database/produccion.db');

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

// =====================================================================
// ENDPOINTS - Estado del Sistema
// =====================================================================

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
    
    res.json({
      status: 'ok',
      database: DB_PATH,
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
    
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let whereClause = '';
    let params = [];
    
    if (startDate && endDate) {
      whereClause = 'WHERE DT_BASE_PRODUCAO BETWEEN ? AND ?';
      params = [startDate, endDate];
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
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let whereClause = '';
    let params = [];
    
    if (startDate && endDate) {
      whereClause = 'WHERE DT_BASE_PRODUCAO BETWEEN ? AND ?';
      params = [startDate, endDate];
    }
    
    const summary = await dbAll(
      `SELECT 
        DATE(DT_BASE_PRODUCAO) as fecha,
        COUNT(*) as total_registros,
        SUM(CAST([TOTAL METROS] AS REAL)) as total_metros
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
    
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let whereClause = '';
    let params = [];
    
    if (startDate && endDate) {
      whereClause = 'WHERE DAT_PROD BETWEEN ? AND ?';
      params = [startDate, endDate];
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

// =====================================================================
// ENDPOINTS - Paradas
// =====================================================================

// GET /api/paradas - Listar paradas de máquina
app.get('/api/paradas', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let whereClause = '';
    let params = [];
    
    if (startDate && endDate) {
      whereClause = 'WHERE DATA_BASE BETWEEN ? AND ?';
      params = [startDate, endDate];
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
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let whereClause = '';
    let params = [];
    
    if (startDate && endDate) {
      whereClause = 'WHERE DATA_BASE BETWEEN ? AND ?';
      params = [startDate, endDate];
    }
    
    const topMotivos = await dbAll(
      `SELECT 
        MOTIVO,
        COUNT(*) as cantidad,
        SUM(CAST([TOTAL HORAS] AS REAL)) as total_horas
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
