import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const accdbPath = 'C:\\STC\\rptProdTec.accdb';
const outDir = path.join(__dirname, '..', 'exports');
const sqlitePath = path.join(outDir, 'prodtec.db');

// Usar mdbtools (si está instalado) o exportar manual
console.log('⚠️  node-adodb requiere cscript que puede tener problemas en tu sistema.');
console.log('\n📋 Opciones alternativas:\n');
console.log('1. Manual: Abre Access, exporta cada tabla a CSV en exports/');
console.log('2. Python: Instala pyodbc y ejecuta el script Python');
console.log('3. UCanAccess: Usa el JAR de Java (sin instalar nada de Office)');
console.log('\n🔧 Voy a preparar el método Python para ti...\n');
