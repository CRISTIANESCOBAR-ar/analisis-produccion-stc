/**
 * Script para generar un resumen compacto del formato Excel
 */

const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeExcel() {
  const workbook = new ExcelJS.Workbook();
  const filePath = path.join(__dirname, '..', 'formato-referencia.xlsx');
  
  await workbook.xlsx.readFile(filePath);
  const ws = workbook.worksheets[0];
  
  console.log('📋 RESUMEN ESTRUCTURA EXCEL - RANGO B5:Q28\n');
  
  // Celdas combinadas relevantes
  console.log('🔗 CELDAS COMBINADAS:');
  console.log('─'.repeat(50));
  
  const merges = ws.model.merges.filter(m => {
    const match = m.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    if (match) {
      const row = parseInt(match[2]);
      return row >= 5 && row <= 28;
    }
    return false;
  }).sort((a, b) => {
    const matchA = a.match(/([A-Z]+)(\d+)/);
    const matchB = b.match(/([A-Z]+)(\d+)/);
    const rowA = parseInt(matchA[2]);
    const rowB = parseInt(matchB[2]);
    if (rowA !== rowB) return rowA - rowB;
    return matchA[1].localeCompare(matchB[1]);
  });
  
  merges.forEach(m => console.log(`  ${m}`));
  
  // Mapa de estructura por fila
  console.log('\n\n📊 ESTRUCTURA POR FILA (contenido principal):');
  console.log('─'.repeat(50));
  
  const processed = new Set();
  
  for (let row = 5; row <= 28; row++) {
    const rowContent = [];
    for (let col = 2; col <= 17; col++) {
      const cell = ws.getCell(row, col);
      const addr = cell.address;
      
      // Si es celda master o celda individual con valor
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        const masterAddr = cell.master ? cell.master.address : addr;
        
        if (!processed.has(masterAddr)) {
          processed.add(masterAddr);
          
          // Buscar el rango de la celda combinada
          const merge = merges.find(m => m.startsWith(masterAddr + ':'));
          const range = merge || addr;
          
          let val = cell.value;
          if (typeof val === 'object' && val !== null) {
            if (val.richText) {
              val = val.richText.map(rt => rt.text).join('');
            } else {
              val = JSON.stringify(val);
            }
          }
          
          // Info de color de fondo
          let bgInfo = '';
          if (cell.fill && cell.fill.fgColor) {
            if (cell.fill.fgColor.argb) {
              bgInfo = ` [bg:#${cell.fill.fgColor.argb.substring(2)}]`;
            } else if (cell.fill.fgColor.theme !== undefined) {
              bgInfo = ` [bg:theme${cell.fill.fgColor.theme}]`;
            }
          }
          
          // Info de rotación
          let rotInfo = '';
          if (cell.alignment && cell.alignment.textRotation) {
            rotInfo = ` [rot:${cell.alignment.textRotation}°]`;
          }
          
          rowContent.push(`${range}: "${val}"${bgInfo}${rotInfo}`);
        }
      }
    }
    
    if (rowContent.length > 0) {
      console.log(`\nFila ${row}:`);
      rowContent.forEach(c => console.log(`  ${c}`));
    }
  }
  
  // Colores de fondo únicos
  console.log('\n\n🎨 COLORES DE FONDO USADOS:');
  console.log('─'.repeat(50));
  
  const colors = new Set();
  for (let row = 5; row <= 28; row++) {
    for (let col = 2; col <= 17; col++) {
      const cell = ws.getCell(row, col);
      if (cell.fill && cell.fill.fgColor) {
        if (cell.fill.fgColor.argb) {
          colors.add(`ARGB: ${cell.fill.fgColor.argb} => #${cell.fill.fgColor.argb.substring(2)}`);
        } else if (cell.fill.fgColor.theme !== undefined) {
          colors.add(`Theme: ${cell.fill.fgColor.theme}, Tint: ${cell.fill.fgColor.tint || 0}`);
        }
      }
    }
  }
  colors.forEach(c => console.log(`  ${c}`));
  
  console.log('\n✅ Resumen completado');
}

analyzeExcel().catch(console.error);
