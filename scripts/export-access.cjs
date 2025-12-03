const ADODB = require('node-adodb');
const fs = require('fs');
const path = require('path');

const accdbPath = 'C:\\STC\\rptProdTec.accdb';
const outDir = path.join(__dirname, '..', 'exports');

// Crear directorio de salida
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Conectar con Office 32-bit instalado
const connection = ADODB.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${accdbPath};`);

async function exportAccess() {
  try {
    console.log('Conectando a Access...');
    
    // Obtener lista de tablas
    const tablesQuery = `
      SELECT MSysObjects.Name AS TABLE_NAME
      FROM MSysObjects
      WHERE MSysObjects.Type=1 
        AND MSysObjects.Flags=0
        AND NOT MSysObjects.Name LIKE 'MSys%'
      ORDER BY MSysObjects.Name
    `;
    
    let tables;
    try {
      tables = await connection.query(tablesQuery);
    } catch (e) {
      // Fallback: intentar listar tablas conocidas o usar conexión alternativa
      console.warn('No se pudo listar tablas automáticamente. Usando método alternativo...');
      // Intentar con ACE si está disponible
      const connAce = ADODB.open(`Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${accdbPath};`);
      tables = await connAce.query(tablesQuery);
    }
    
    console.log(`Tablas encontradas: ${tables.length}`);
    
    const schema = {};
    
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`\nExportando: ${tableName}`);
      
      // Obtener datos
      const data = await connection.query(`SELECT * FROM [${tableName}]`);
      
      // Guardar esquema
      if (data.length > 0) {
        schema[tableName] = {
          columns: Object.keys(data[0]),
          rowCount: data.length
        };
      }
      
      // Exportar a CSV
      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        let csv = columns.join(',') + '\n';
        
        for (const row of data) {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""');
            return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
          });
          csv += values.join(',') + '\n';
        }
        
        const csvPath = path.join(outDir, `${tableName}.csv`);
        fs.writeFileSync(csvPath, csv, 'utf8');
        console.log(`  ✓ ${data.length} registros → ${csvPath}`);
      }
    }
    
    // Guardar esquema
    const schemaPath = path.join(outDir, 'schema.json');
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2), 'utf8');
    console.log(`\n✓ Esquema guardado: ${schemaPath}`);
    
    console.log('\n✅ Exportación completada exitosamente!');
    console.log(`📁 Archivos en: ${outDir}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

exportAccess();
