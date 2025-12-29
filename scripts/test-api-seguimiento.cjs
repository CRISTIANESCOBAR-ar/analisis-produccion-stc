const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/produccion.db');
const db = new sqlite3.Database(DB_PATH);

// Probar con un período que sabemos que tiene datos
const fechaInicio = '2025-10-01';  // YYYY-MM-DD
const fechaFin = '2025-10-31';

console.log('🔍 Probando endpoint de seguimiento de roladas\n');
console.log(`📅 Período: ${fechaInicio} hasta ${fechaFin}\n`);

// Simular lo que hace el endpoint
const convertirFecha = (fecha) => {
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
};

const fechaInicioDB = convertirFecha(fechaInicio);
const fechaFinDB = convertirFecha(fechaFin);

console.log(`📅 Formato BD: ${fechaInicioDB} hasta ${fechaFinDB}\n`);

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
  )
  SELECT COUNT(*) as total_roladas FROM R_IND
`;

db.get(sql, [fechaInicio, fechaFin], (err, row) => {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.log('✅ Roladas encontradas:', row.total_roladas);
  }
  db.close();
});
