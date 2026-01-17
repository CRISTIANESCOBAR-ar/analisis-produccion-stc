// =====================================================================
// SISTEMA DE ALERTAS AUTOMATIZADO
// =====================================================================
// Monitorea métricas críticas y envía notificaciones
// Ejecutar con cron/task scheduler: node alert-system.cjs
// =====================================================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database', 'produccion.db');
const ALERTS_LOG = path.join(__dirname, '..', 'logs', 'alerts.log');

// =====================================================================
// CONFIGURACIÓN DE UMBRALES
// =====================================================================
const THRESHOLDS = {
  calidadMinima: 80,          // % calidad mínimo aceptable
  paradasMaxHoras: 2,         // horas máximas de parada por máquina
  produccionMinMetros: 5000,  // metros mínimos esperados por día
  roturasMaxPorMaquina: 50,   // roturas máximas por máquina/día
  variacionMaxPorc: 20        // % variación permitida vs promedio
};

// =====================================================================
// HELPERS
// =====================================================================
function dbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
    db.all(sql, params, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function logAlert(type, message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    message,
    data
  };
  
  // Crear directorio logs si no existe
  const logsDir = path.dirname(ALERTS_LOG);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Agregar al log
  fs.appendFileSync(ALERTS_LOG, JSON.stringify(logEntry) + '\n');
  
  console.log(`🚨 [${type}] ${message}`);
  if (data) console.log('   Datos:', JSON.stringify(data, null, 2));
}

// =====================================================================
// VERIFICACIONES DE ALERTAS
// =====================================================================

// 1. Verificar calidad baja en últimas 24 horas
async function checkCalidadBaja() {
  const sql = `
    SELECT 
      DATE(DAT_PROD) as fecha,
      TEAR,
      COUNT(*) as total_piezas,
      SUM(CASE WHEN QUALIDADE LIKE '%1ERA%' THEN 1 ELSE 0 END) as piezas_1era,
      ROUND(100.0 * SUM(CASE WHEN QUALIDADE LIKE '%1ERA%' THEN 1 ELSE 0 END) / COUNT(*), 2) as porc_calidad
    FROM tb_CALIDAD
    WHERE DATE(DAT_PROD) >= DATE('now', '-1 day')
      AND EMP = 'STC'
    GROUP BY DATE(DAT_PROD), TEAR
    HAVING porc_calidad < ?
    ORDER BY porc_calidad ASC
  `;
  
  const rows = await dbQuery(sql, [THRESHOLDS.calidadMinima]);
  
  if (rows.length > 0) {
    logAlert('CALIDAD_BAJA', `${rows.length} máquinas con calidad < ${THRESHOLDS.calidadMinima}%`, rows);
    return rows;
  }
  return [];
}

// 2. Verificar paradas prolongadas
async function checkParadasProlongadas() {
  const sql = `
    SELECT 
      MAQUINA,
      MOTIVO,
      SUM(CAST(REPLACE(DURACAO, ',', '.') AS REAL)) as horas_total
    FROM tb_PARADAS
    WHERE DATE(DT_INICIAL) >= DATE('now', '-1 day')
    GROUP BY MAQUINA, MOTIVO
    HAVING horas_total > ?
    ORDER BY horas_total DESC
  `;
  
  const rows = await dbQuery(sql, [THRESHOLDS.paradasMaxHoras]);
  
  if (rows.length > 0) {
    logAlert('PARADAS_PROLONGADAS', `${rows.length} máquinas con paradas > ${THRESHOLDS.paradasMaxHoras}h`, rows);
    return rows;
  }
  return [];
}

// 3. Verificar producción baja
async function checkProduccionBaja() {
  const sql = `
    SELECT 
      DATE(DT_BASE_PRODUCAO) as fecha,
      SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) as metros_totales
    FROM tb_PRODUCCION
    WHERE SELETOR = 'TECELAGEM'
      AND DATE(DT_BASE_PRODUCAO) = DATE('now', '-1 day')
    GROUP BY DATE(DT_BASE_PRODUCAO)
    HAVING metros_totales < ?
  `;
  
  const rows = await dbQuery(sql, [THRESHOLDS.produccionMinMetros]);
  
  if (rows.length > 0) {
    logAlert('PRODUCCION_BAJA', `Producción < ${THRESHOLDS.produccionMinMetros}m`, rows);
    return rows;
  }
  return [];
}

// 4. Verificar variación anormal (comparar con promedio semanal)
async function checkVariacionAnormal() {
  const sql = `
    WITH PromedioSemanal AS (
      SELECT AVG(metros_dia) as promedio
      FROM (
        SELECT 
          DATE(DT_BASE_PRODUCAO) as fecha,
          SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) as metros_dia
        FROM tb_PRODUCCION
        WHERE SELETOR = 'TECELAGEM'
          AND DATE(DT_BASE_PRODUCAO) BETWEEN DATE('now', '-8 days') AND DATE('now', '-2 days')
        GROUP BY DATE(DT_BASE_PRODUCAO)
      )
    ),
    ProduccionAyer AS (
      SELECT SUM(CAST(REPLACE(METRAGEM, ',', '.') AS REAL)) as metros_ayer
      FROM tb_PRODUCCION
      WHERE SELETOR = 'TECELAGEM'
        AND DATE(DT_BASE_PRODUCAO) = DATE('now', '-1 day')
    )
    SELECT 
      promedio,
      metros_ayer,
      ROUND(100.0 * ABS(metros_ayer - promedio) / promedio, 2) as variacion_porc
    FROM PromedioSemanal, ProduccionAyer
    WHERE variacion_porc > ?
  `;
  
  const rows = await dbQuery(sql, [THRESHOLDS.variacionMaxPorc]);
  
  if (rows.length > 0) {
    logAlert('VARIACION_ANORMAL', `Variación > ${THRESHOLDS.variacionMaxPorc}% vs promedio semanal`, rows);
    return rows;
  }
  return [];
}

// 5. Verificar roturas excesivas
async function checkRoturasExcesivas() {
  const sql = `
    SELECT 
      MAQUINA,
      SUM(CAST(RUPTURAS AS INTEGER)) as total_roturas
    FROM tb_PRODUCCION
    WHERE SELETOR = 'URDIDEIRA'
      AND DATE(DT_BASE_PRODUCAO) = DATE('now', '-1 day')
      AND RUPTURAS IS NOT NULL
    GROUP BY MAQUINA
    HAVING total_roturas > ?
    ORDER BY total_roturas DESC
  `;
  
  const rows = await dbQuery(sql, [THRESHOLDS.roturasMaxPorMaquina]);
  
  if (rows.length > 0) {
    logAlert('ROTURAS_EXCESIVAS', `${rows.length} máquinas con roturas > ${THRESHOLDS.roturasMaxPorMaquina}`, rows);
    return rows;
  }
  return [];
}

// =====================================================================
// EJECUCIÓN PRINCIPAL
// =====================================================================
async function runAlertSystem() {
  console.log('═════════════════════════════════════════════════');
  console.log('  SISTEMA DE ALERTAS - ' + new Date().toLocaleString('es-ES'));
  console.log('═════════════════════════════════════════════════\n');
  
  try {
    const alerts = {
      calidadBaja: await checkCalidadBaja(),
      paradasProlongadas: await checkParadasProlongadas(),
      produccionBaja: await checkProduccionBaja(),
      variacionAnormal: await checkVariacionAnormal(),
      roturasExcesivas: await checkRoturasExcesivas()
    };
    
    const totalAlertas = Object.values(alerts).reduce((sum, arr) => sum + arr.length, 0);
    
    if (totalAlertas === 0) {
      console.log('✅ No se detectaron alertas. Todo normal.\n');
    } else {
      console.log(`\n⚠️  TOTAL ALERTAS: ${totalAlertas}\n`);
      
      // Generar resumen
      const resumen = {
        timestamp: new Date().toISOString(),
        totalAlertas,
        alertas: alerts
      };
      
      // Guardar resumen diario
      const resumenPath = path.join(__dirname, '..', 'logs', `resumen-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(resumenPath, JSON.stringify(resumen, null, 2));
      
      console.log(`📊 Resumen guardado: ${resumenPath}`);
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando sistema de alertas:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAlertSystem();
}

module.exports = { runAlertSystem, THRESHOLDS };
