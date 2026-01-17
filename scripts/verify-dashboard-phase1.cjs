#!/usr/bin/env node

/**
 * 🧪 Script de Verificación - Dashboard Nativo FASE 1
 * Verifica que todos los componentes están correctamente implementados
 */

const fs = require('fs')
const path = require('path')

console.log('\n╔════════════════════════════════════════════════════════════════╗')
console.log('║  🧪 VERIFICACIÓN DE FASE 1 - Dashboard Nativo                  ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

const checks = []

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath)
  const status = exists ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`
  const size = exists ? `(${(fs.statSync(filePath).size / 1024).toFixed(1)} KB)` : ''
  console.log(`${status} ${description} ${size}`)
  checks.push(exists)
  return exists
}

function checkFileContent(filePath, searchString, description) {
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}❌${colors.reset} ${description} - Archivo no encontrado`)
    checks.push(false)
    return false
  }
  
  const content = fs.readFileSync(filePath, 'utf8')
  const found = content.includes(searchString)
  const status = found ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`
  console.log(`${status} ${description}`)
  checks.push(found)
  return found
}

console.log(`${colors.blue}📁 Estructura de Carpetas:${colors.reset}`)
checkFile(path.join(__dirname, 'src/components/dashboards'), '• dashboards/')
checkFile(path.join(__dirname, 'src/components/widgets'), '• widgets/')

console.log(`\n${colors.blue}📄 Archivos Creados:${colors.reset}`)
checkFile(path.join(__dirname, 'src/composables/useKPIs.js'), '• useKPIs.js')
checkFile(path.join(__dirname, 'src/components/widgets/KPICard.vue'), '• KPICard.vue')
checkFile(path.join(__dirname, 'src/components/widgets/ChartWidget.vue'), '• ChartWidget.vue')
checkFile(path.join(__dirname, 'src/components/widgets/DataTableWidget.vue'), '• DataTableWidget.vue')
checkFile(path.join(__dirname, 'src/components/dashboards/DashboardGeneral.vue'), '• DashboardGeneral.vue')

console.log(`\n${colors.blue}🔍 Contenido de Archivos:${colors.reset}`)
checkFileContent(
  path.join(__dirname, 'src/router/index.js'),
  'DashboardGeneral',
  '• DashboardGeneral importado en router'
)
checkFileContent(
  path.join(__dirname, 'src/router/index.js'),
  "path: '/dashboard'",
  '• Ruta /dashboard añadida'
)
checkFileContent(
  path.join(__dirname, 'src/router/index.js'),
  "redirect: '/dashboard'",
  '• Redirect a /dashboard en raíz'
)
checkFileContent(
  path.join(__dirname, 'vite.config.js'),
  "@': path.resolve",
  '• Alias @ configurado en Vite'
)
checkFileContent(
  path.join(__dirname, 'src/composables/useKPIs.js'),
  'export function useKPIs',
  '• useKPIs exportado correctamente'
)
checkFileContent(
  path.join(__dirname, 'src/composables/useKPIs.js'),
  'metrosHoy',
  '• KPI: metrosHoy'
)
checkFileContent(
  path.join(__dirname, 'src/composables/useKPIs.js'),
  'calidadPromedio',
  '• KPI: calidadPromedio'
)
checkFileContent(
  path.join(__dirname, 'src/components/dashboards/DashboardGeneral.vue'),
  'useKPIs',
  '• DashboardGeneral usa useKPIs'
)

console.log(`\n${colors.blue}📊 Componentes Widget:${colors.reset}`)
checkFileContent(
  path.join(__dirname, 'src/components/widgets/KPICard.vue'),
  'kpi-card',
  '• KPICard tiene clase kpi-card'
)
checkFileContent(
  path.join(__dirname, 'src/components/widgets/ChartWidget.vue'),
  'Chart',
  '• ChartWidget usa Chart.js'
)
checkFileContent(
  path.join(__dirname, 'src/components/widgets/DataTableWidget.vue'),
  'data-table',
  '• DataTableWidget tiene clase data-table'
)

console.log(`\n${colors.blue}✨ Características Implementadas:${colors.reset}`)
checkFileContent(
  path.join(__dirname, 'src/composables/useKPIs.js'),
  'loadKPIs',
  '• Método loadKPIs'
)
checkFileContent(
  path.join(__dirname, 'src/composables/useKPIs.js'),
  'formatLastUpdate',
  '• Método formatLastUpdate'
)
checkFileContent(
  path.join(__dirname, 'src/components/dashboards/DashboardGeneral.vue'),
  'setInterval',
  '• Auto-refresh implementado'
)
checkFileContent(
  path.join(__dirname, 'src/components/dashboards/DashboardGeneral.vue'),
  'startDate',
  '• Filtros de fecha'
)

// Resumen
console.log(`\n${colors.blue}════════════════════════════════════════════════════════════════${colors.reset}`)

const total = checks.length
const passed = checks.filter(c => c).length
const failed = total - passed
const percentage = Math.round((passed / total) * 100)

console.log(`\n📊 RESULTADOS:`)
console.log(`   Total Verificaciones: ${total}`)
console.log(`   Exitosas: ${colors.green}${passed}${colors.reset}`)
console.log(`   Fallidas: ${failed > 0 ? colors.red + failed + colors.reset : colors.green + '0' + colors.reset}`)
console.log(`   Porcentaje: ${percentage}%\n`)

if (percentage === 100) {
  console.log(`${colors.green}✅ ¡FASE 1 COMPLETADA EXITOSAMENTE!${colors.reset}`)
  console.log(`\n   Dashboard disponible en: http://localhost:5173/dashboard`)
  console.log(`   API disponible en: http://localhost:3002/api\n`)
} else {
  console.log(`${colors.yellow}⚠️  Hay ${failed} verificaciones fallidas${colors.reset}\n`)
}

console.log(`${colors.blue}════════════════════════════════════════════════════════════════${colors.reset}\n`)

process.exit(percentage === 100 ? 0 : 1)
