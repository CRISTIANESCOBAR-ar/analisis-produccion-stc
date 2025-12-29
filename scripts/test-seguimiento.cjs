const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/produccion.db');
const db = new sqlite3.Database(DB_PATH);

// Probar consulta de seguimiento de roladas
console.log('🔍 Verificando datos de INDIGO...\n');

// Primero, ver qué fechas existen en la base de datos
db.all(`
  SELECT 
    MIN(DT_BASE_PRODUCAO) as fecha_min,
    MAX(DT_BASE_PRODUCAO) as fecha_max,
    COUNT(*) as total_registros,
    COUNT(DISTINCT ROLADA) as total_roladas
  FROM tb_PRODUCCION
  WHERE SELETOR = 'INDIGO'
    AND ROLADA IS NOT NULL
    AND ROLADA != ''
`, [], (err0, rows0) => {
  if (err0) {
    console.error('❌ Error:', err0);
  } else {
    console.log('📅 Rango de fechas disponibles:');
    console.log(JSON.stringify(rows0, null, 2));
    console.log('\n');
  }
});

const fechaInicio = '2024-01-01';
const fechaFin = '2025-12-31';

setTimeout(() => {
  console.log('🔍 Buscando en rango amplio (2024-2025)...\n');

// 1. Verificar si hay datos de INDIGO en ese período
db.all(`
  SELECT 
    DT_BASE_PRODUCAO, 
    FILIAL,
    SELETOR,
    COUNT(*) as count,
    COUNT(DISTINCT ROLADA) as roladas_distintas
  FROM tb_PRODUCCION
  WHERE SELETOR = 'INDIGO'
    AND DT_BASE_PRODUCAO BETWEEN ? AND ?
  GROUP BY DT_BASE_PRODUCAO, FILIAL, SELETOR
  ORDER BY DT_BASE_PRODUCAO DESC
  LIMIT 20
`, [fechaInicio, fechaFin], (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.log('📊 Registros de INDIGO por fecha:');
    console.log(JSON.stringify(rows, null, 2));
    console.log('\n');
  }
  
  // 2. Verificar registros con FILIAL='05'
  db.all(`
    SELECT 
      FILIAL,
      SELETOR,
      COUNT(*) as count,
      COUNT(DISTINCT ROLADA) as roladas
    FROM tb_PRODUCCION
    WHERE SELETOR = 'INDIGO'
      AND DT_BASE_PRODUCAO BETWEEN ? AND ?
    GROUP BY FILIAL, SELETOR
  `, [fechaInicio, fechaFin], (err2, rows2) => {
    if (err2) {
      console.error('❌ Error:', err2);
    } else {
      console.log('🏢 Registros por FILIAL:');
      console.log(JSON.stringify(rows2, null, 2));
      console.log('\n');
    }
    
    // 3. Ver una muestra de roladas
    db.all(`
      SELECT DISTINCT
        ROLADA,
        FILIAL,
        DT_BASE_PRODUCAO
      FROM tb_PRODUCCION
      WHERE SELETOR = 'INDIGO'
        AND DT_BASE_PRODUCAO BETWEEN ? AND ?
        AND ROLADA IS NOT NULL
        AND ROLADA != ''
      ORDER BY DT_BASE_PRODUCAO DESC
      LIMIT 10
    `, [fechaInicio, fechaFin], (err3, rows3) => {
      if (err3) {
        console.error('❌ Error:', err3);
      } else {
        console.log('📦 Muestra de ROLADAS encontradas:');
        console.log(JSON.stringify(rows3, null, 2));
      }
      
      db.close();
    });
  });
});
}, 500);
