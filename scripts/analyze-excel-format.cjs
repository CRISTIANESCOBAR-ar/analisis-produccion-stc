/**
 * Script para analizar el formato del archivo Excel de referencia
 * Examina celdas combinadas, estilos, colores, bordes, etc.
 */

const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeExcel() {
  const workbook = new ExcelJS.Workbook();
  const filePath = path.join(__dirname, '..', 'formato-referencia.xlsx');
  
  console.log('📂 Leyendo archivo:', filePath);
  await workbook.xlsx.readFile(filePath);
  
  // Obtener la primera hoja
  const worksheet = workbook.worksheets[0];
  console.log('\n📋 Hoja:', worksheet.name);
  console.log('━'.repeat(80));
  
  // Analizar rango B5:Q28
  const startRow = 5;
  const endRow = 28;
  const startCol = 2; // B
  const endCol = 17;  // Q
  
  // Obtener celdas combinadas en el rango
  console.log('\n🔗 CELDAS COMBINADAS EN RANGO B5:Q28:');
  console.log('─'.repeat(80));
  
  const merges = [];
  worksheet.model.merges.forEach(merge => {
    merges.push(merge);
  });
  
  // Filtrar merges en el rango B5:Q28
  const relevantMerges = merges.filter(m => {
    const match = m.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    if (match) {
      const startRowMerge = parseInt(match[2]);
      const endRowMerge = parseInt(match[4]);
      return startRowMerge >= startRow && endRowMerge <= endRow;
    }
    return false;
  });
  
  console.log(`Encontradas ${relevantMerges.length} celdas combinadas:`);
  relevantMerges.forEach(m => console.log(`  ${m}`));
  
  // Analizar celda por celda
  console.log('\n📊 ANÁLISIS CELDA POR CELDA:');
  console.log('─'.repeat(80));
  
  for (let row = startRow; row <= endRow; row++) {
    console.log(`\n--- FILA ${row} ---`);
    
    for (let col = startCol; col <= endCol; col++) {
      const cell = worksheet.getCell(row, col);
      const colLetter = String.fromCharCode(64 + col);
      const cellAddress = `${colLetter}${row}`;
      
      // Verificar si la celda tiene contenido o estilos
      const hasValue = cell.value !== null && cell.value !== undefined && cell.value !== '';
      const hasFill = cell.fill && cell.fill.type !== 'pattern' || (cell.fill && cell.fill.fgColor);
      const hasFont = cell.font && (cell.font.bold || cell.font.color || cell.font.size);
      const hasBorder = cell.border && Object.keys(cell.border).length > 0;
      const isMerged = cell.isMerged;
      
      if (hasValue || hasFill || hasFont || hasBorder || isMerged) {
        console.log(`\n  📍 ${cellAddress}:`);
        
        if (hasValue) {
          console.log(`     Valor: "${cell.value}" (${typeof cell.value})`);
        }
        
        if (isMerged) {
          console.log(`     ⊞ Es parte de celda combinada`);
          if (cell.master && cell.master !== cell) {
            console.log(`       Master: ${cell.master.address}`);
          }
        }
        
        if (cell.font) {
          const f = cell.font;
          const fontInfo = [];
          if (f.name) fontInfo.push(`fuente: ${f.name}`);
          if (f.size) fontInfo.push(`tamaño: ${f.size}`);
          if (f.bold) fontInfo.push('negrita');
          if (f.italic) fontInfo.push('cursiva');
          if (f.color) {
            if (f.color.argb) fontInfo.push(`color: #${f.color.argb.substring(2)}`);
            if (f.color.theme !== undefined) fontInfo.push(`theme: ${f.color.theme}`);
          }
          if (fontInfo.length > 0) {
            console.log(`     🔤 Font: ${fontInfo.join(', ')}`);
          }
        }
        
        if (cell.fill && cell.fill.fgColor) {
          const fg = cell.fill.fgColor;
          if (fg.argb) {
            console.log(`     🎨 Fondo: #${fg.argb.substring(2)}`);
          } else if (fg.theme !== undefined) {
            console.log(`     🎨 Fondo: theme ${fg.theme}, tint: ${fg.tint || 0}`);
          }
        }
        
        if (cell.alignment) {
          const a = cell.alignment;
          const alignInfo = [];
          if (a.horizontal) alignInfo.push(`H: ${a.horizontal}`);
          if (a.vertical) alignInfo.push(`V: ${a.vertical}`);
          if (a.wrapText) alignInfo.push('wrap');
          if (a.textRotation) alignInfo.push(`rot: ${a.textRotation}°`);
          if (alignInfo.length > 0) {
            console.log(`     📐 Alineación: ${alignInfo.join(', ')}`);
          }
        }
        
        if (cell.border) {
          const b = cell.border;
          const borderInfo = [];
          if (b.top) borderInfo.push(`top: ${b.top.style}`);
          if (b.bottom) borderInfo.push(`bottom: ${b.bottom.style}`);
          if (b.left) borderInfo.push(`left: ${b.left.style}`);
          if (b.right) borderInfo.push(`right: ${b.right.style}`);
          if (borderInfo.length > 0) {
            console.log(`     🔲 Bordes: ${borderInfo.join(', ')}`);
          }
        }
      }
    }
  }
  
  // Mostrar anchos de columnas
  console.log('\n\n📏 ANCHOS DE COLUMNAS (B-Q):');
  console.log('─'.repeat(80));
  for (let col = startCol; col <= endCol; col++) {
    const colLetter = String.fromCharCode(64 + col);
    const column = worksheet.getColumn(col);
    console.log(`  ${colLetter}: ${column.width || 'default'}`);
  }
  
  // Mostrar alturas de filas
  console.log('\n📐 ALTURAS DE FILAS (5-28):');
  console.log('─'.repeat(80));
  for (let row = startRow; row <= endRow; row++) {
    const rowObj = worksheet.getRow(row);
    console.log(`  Fila ${row}: ${rowObj.height || 'default'}`);
  }
  
  console.log('\n✅ Análisis completado');
}

analyzeExcel().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
