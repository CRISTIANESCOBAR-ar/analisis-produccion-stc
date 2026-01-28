/**
 * Componente para renderizar la tabla con formato Excel exacto
 * Se usa exclusivamente para capturar como imagen
 */

/**
 * Genera el HTML de la tabla formateada como Excel
 * @param {Object} data - Datos de la tabla
 * @returns {string} HTML de la tabla
 */
export function generateExcelTableHTML(data) {
  const {
    fecha,
    sectores,
    totals,
    metaTargets,
    differences,
    pts100m2,
    indigoData,
    indigoMetas,
    estopaAzulData,
    tecelagemData,
    acabamentoData
  } = data

  // Funciones de formato
  const fmt = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0'
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(num))
  }

  const fmtDec = (num, decimals = 1) => {
    if (num === null || num === undefined || isNaN(num)) return '0'
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num)
  }

  const fmtDec2 = (num) => fmtDec(num, 2)

  const signNum = (num) => {
    const formatted = fmt(num)
    return num >= 0 ? `+${formatted}` : formatted
  }

  const signDec = (num, decimals = 2) => {
    const formatted = fmtDec(num, decimals)
    return num >= 0 ? `+${formatted}` : formatted
  }

  // Obtener sector por nombre
  const getSector = (nombre) => sectores.find(s => s.sector === nombre) || { 
    metrosDia: 0, metrosMes: 0, percDia: 0, percMes: 0, metaPct: 0 
  }

  const sDefecto = getSector('S/ Def.')
  const fiacao = getSector('FIACAO')
  const indigo = getSector('INDIGO')
  const tecelagem = getSector('TECELAGEM')
  const acabamento = getSector('ACABMTO')
  const geral = getSector('GERAL')

  // Colores
  const colorPositivo = '#008000'  // Verde
  const colorNegativo = '#FF0000'  // Rojo
  const bgAzulClaro = '#B4C6E7'    // Azul claro para headers
  const bgAzulMedio = '#D6DCE4'    // Azul medio para INDIGO
  const bgVerdeClaro = '#C6EFCE'   // Verde claro para ACABMTO (según imagen)
  const bgNaranja = '#F4B183'      // Naranja para Pts 100²

  // Función para color condicional
  const getColor = (value, isPositiveGood = true) => {
    if (isPositiveGood) {
      return value >= 0 ? colorPositivo : colorNegativo
    } else {
      return value <= 0 ? colorPositivo : colorNegativo
    }
  }

  // Calcular diferencias para INDIGO
  const indigoDiffMetros = indigoData.month.metros - indigoData.month.metaAcumulada
  const indigoDiffRot = indigoMetas.rot103 - indigoData.month.rot103
  const indigoDiffEstopa = indigoMetas.estopaAzul - estopaAzulData.month.porcentaje

  // Calcular diferencias para TECELAGEM
  const tejDiffMetros = tecelagemData.month.metros - tecelagemData.month.metaAcumulada
  const tejDiffEfi = tecelagemData.month.eficiencia - tecelagemData.month.metaEfi
  const tejDiffRt = tecelagemData.month.rotTra105 - tecelagemData.month.metaRt105
  const tejDiffRu = tecelagemData.month.rotUrd105 - tecelagemData.month.metaRu105
  const tejDiffEstopa = tecelagemData.month.metaEstopaAzul - tecelagemData.month.estopaAzulPct

  // Calcular diferencias para ACABMTO
  const acabDiffMetros = acabamentoData.month.metros - acabamentoData.month.metaAcumulada
  const acabDiffEncUrd = acabamentoData.month.encUrdPct - acabamentoData.month.metaEncUrd

  // Estilos CSS inline para la tabla
  const styles = `
    <style>
      .excel-export-table {
        font-family: Verdana, Arial, sans-serif;
        font-size: 10px;
        border-collapse: collapse;
        background: white;
        color: #000;
      }
      .excel-export-table td, .excel-export-table th {
        border: 1px solid #000;
        padding: 2px 4px;
        text-align: center;
        vertical-align: middle;
        white-space: nowrap;
      }
      .excel-export-table .header {
        background: ${bgAzulClaro};
        font-weight: bold;
      }
      .excel-export-table .alt-row {
        background: ${bgAzulClaro};
      }
      .excel-export-table .indigo-bg {
        background: ${bgAzulMedio};
      }
      .excel-export-table .acabmto-bg {
        background: ${bgVerdeClaro};
      }
      .excel-export-table .pts-bg {
        background: ${bgNaranja};
      }
      .excel-export-table .left {
        text-align: left;
      }
      .excel-export-table .right {
        text-align: right;
      }
      .excel-export-table .bold {
        font-weight: bold;
      }
      .excel-export-table .small {
        font-size: 9px;
      }
      .excel-export-table .vertical {
        writing-mode: vertical-rl;
        text-orientation: mixed;
        transform: rotate(180deg);
        padding: 4px 2px;
      }
      .excel-export-table .border-thick-top {
        border-top: 2px solid #000;
      }
      .excel-export-table .border-thick-bottom {
        border-bottom: 2px solid #000;
      }
      .excel-export-table .border-thick-right {
        border-right: 2px solid #000;
      }
      .excel-export-table .separator-row td {
        height: 3px;
        padding: 0;
        border: none;
        background: white;
      }
    </style>
  `

  const html = `
    ${styles}
    <table class="excel-export-table">
      <!-- SECCIÓN 1: Tabla de Calidad por Sector -->
      <!-- Fila 5: Headers principales -->
      <tr>
        <td colspan="3" class="header">${fecha}</td>
        <td colspan="4" class="header">Metros [m]</td>
        <td colspan="3" class="header">Porcentaje [%]</td>
      </tr>
      
      <!-- Fila 6: Subheaders -->
      <tr>
        <td colspan="3" class="header">Sector</td>
        <td class="header">Dia</td>
        <td colspan="2" class="header">Acumulado</td>
        <td class="header">Dia</td>
        <td class="header">Mes</td>
        <td class="header">Meta</td>
      </tr>
      
      <!-- Fila 7: S/ Def. -->
      <tr class="alt-row">
        <td colspan="3" class="left">S/ Def.</td>
        <td class="right">${fmt(sDefecto.metrosDia)}</td>
        <td colspan="2" class="right">${fmt(sDefecto.metrosMes)}</td>
        <td>${fmtDec(sDefecto.percDia)}</td>
        <td>${fmtDec(sDefecto.percMes)}</td>
        <td>${fmtDec(sDefecto.metaPct)}</td>
      </tr>
      
      <!-- Fila 8: FIACAO -->
      <tr>
        <td colspan="3" class="left">FIACAO</td>
        <td class="right">${fmt(fiacao.metrosDia)}</td>
        <td colspan="2" class="right">${fmt(fiacao.metrosMes)}</td>
        <td>${fmtDec2(fiacao.percDia)}</td>
        <td>${fmtDec2(fiacao.percMes)}</td>
        <td>${fmtDec2(fiacao.metaPct)}</td>
      </tr>
      
      <!-- Fila 9: INDIGO -->
      <tr class="alt-row">
        <td colspan="3" class="left">INDIGO</td>
        <td class="right">${fmt(indigo.metrosDia)}</td>
        <td colspan="2" class="right">${fmt(indigo.metrosMes)}</td>
        <td>${fmtDec(indigo.percDia)}</td>
        <td>${fmtDec(indigo.percMes)}</td>
        <td>${fmtDec(indigo.metaPct)}</td>
      </tr>
      
      <!-- Fila 10: TECELAGEM -->
      <tr>
        <td colspan="3" class="left">TECELAGEM</td>
        <td class="right">${fmt(tecelagem.metrosDia)}</td>
        <td colspan="2" class="right">${fmt(tecelagem.metrosMes)}</td>
        <td>${fmtDec(tecelagem.percDia)}</td>
        <td>${fmtDec(tecelagem.percMes)}</td>
        <td>${fmtDec(tecelagem.metaPct)}</td>
      </tr>
      
      <!-- Fila 11: ACABMTO -->
      <tr class="alt-row">
        <td colspan="3" class="left">ACABMTO</td>
        <td class="right">${fmt(acabamento.metrosDia)}</td>
        <td colspan="2" class="right">${fmt(acabamento.metrosMes)}</td>
        <td>${fmtDec(acabamento.percDia)}</td>
        <td>${fmtDec(acabamento.percMes)}</td>
        <td>${fmtDec(acabamento.metaPct)}</td>
      </tr>
      
      <!-- Fila 12: GERAL -->
      <tr>
        <td colspan="3" class="left">GERAL</td>
        <td class="right">${fmt(geral.metrosDia)}</td>
        <td colspan="2" class="right">${fmt(geral.metrosMes)}</td>
        <td>${fmtDec(geral.percDia)}</td>
        <td>${fmtDec(geral.percMes)}</td>
        <td>${fmtDec(geral.metaPct)}</td>
      </tr>
      
      <!-- Fila 13: Revisado -->
      <tr>
        <td colspan="3" class="left bold">Revisado</td>
        <td class="right bold" style="color: ${getColor(totals.day - metaTargets.day)}">${fmt(totals.day)}</td>
        <td colspan="2" class="right bold" style="color: ${getColor(totals.month - metaTargets.month)}">${fmt(totals.month)}</td>
        <td class="bold">100</td>
        <td class="bold">100</td>
        <td class="bold">100</td>
      </tr>
      
      <!-- Fila 14: Meta -->
      <tr>
        <td colspan="3" class="left bold">Meta</td>
        <td class="right">${fmt(metaTargets.day)}</td>
        <td colspan="2" class="right">${fmt(metaTargets.month)}</td>
        <td rowspan="2" class="pts-bg bold">Pts<br>100²</td>
        <td class="pts-bg bold">Dia</td>
        <td class="pts-bg bold">Mes</td>
      </tr>
      
      <!-- Fila 15: Diferencia -->
      <tr>
        <td colspan="3" class="left bold">Diferencia</td>
        <td class="right bold" style="color: ${getColor(differences.day)}">${signNum(differences.day)}</td>
        <td colspan="2" class="right bold" style="color: ${getColor(differences.month)}">${signNum(differences.month)}</td>
        <td class="pts-bg">${fmtDec2(pts100m2.day)}</td>
        <td class="pts-bg">${fmtDec2(pts100m2.month)}</td>
      </tr>
      
      <!-- Fila separadora -->
      <tr class="separator-row">
        <td colspan="10"></td>
      </tr>
      
      <!-- SECCIÓN 2: Tabla de Producción por Sector -->
      <!-- Fila 17: Headers -->
      <tr class="border-thick-top border-thick-bottom">
        <td class="header small">Sec</td>
        <td colspan="2" class="header small">Variable</td>
        <td class="header small">Meta Dia</td>
        <td class="header small">Prod. Dia</td>
        <td class="header small">Acumulado</td>
        <td colspan="2" class="header small">Sob./Fal.<br>Mes</td>
      </tr>
      
      <!-- INDIGO - Metros -->
      <tr class="indigo-bg">
        <td rowspan="3" class="vertical small indigo-bg border-thick-right">INDIGO</td>
        <td colspan="2" class="left small">Metros</td>
        <td class="right">${fmt(indigoData.day.meta)}</td>
        <td class="right" style="color: ${getColor(indigoData.day.metros - indigoData.day.meta)}">${fmt(indigoData.day.metros)}</td>
        <td class="right" style="color: ${getColor(indigoData.month.metros - indigoData.month.metaAcumulada)}">${fmt(indigoData.month.metros)}</td>
        <td colspan="2" class="right" style="color: ${getColor(indigoDiffMetros)}">${signNum(indigoDiffMetros)}</td>
      </tr>
      
      <!-- INDIGO - Roturas 10³ -->
      <tr class="indigo-bg">
        <td colspan="2" class="left small">Roturas 10³</td>
        <td>${fmtDec(indigoMetas.rot103)}</td>
        <td style="color: ${getColor(indigoMetas.rot103 - indigoData.day.rot103)}">${fmtDec2(indigoData.day.rot103)}</td>
        <td style="color: ${getColor(indigoMetas.rot103 - indigoData.month.rot103)}">${fmtDec2(indigoData.month.rot103)}</td>
        <td colspan="2" style="color: ${getColor(indigoDiffRot)}">${signDec(indigoDiffRot)}</td>
      </tr>
      
      <!-- INDIGO - Est. Azul % -->
      <tr class="indigo-bg border-thick-bottom">
        <td colspan="2" class="left small">Est. Azul %</td>
        <td>${fmtDec(indigoMetas.estopaAzul)}</td>
        <td style="color: ${getColor(indigoMetas.estopaAzul - estopaAzulData.day.porcentaje)}">${fmtDec2(estopaAzulData.day.porcentaje)}</td>
        <td style="color: ${getColor(indigoMetas.estopaAzul - estopaAzulData.month.porcentaje)}">${fmtDec2(estopaAzulData.month.porcentaje)}</td>
        <td colspan="2" style="color: ${getColor(indigoDiffEstopa)}">${signDec(indigoDiffEstopa)}</td>
      </tr>
      
      <!-- TECELAGEM - Metros -->
      <tr class="border-thick-top">
        <td rowspan="5" class="vertical small border-thick-right">TECELAGEM</td>
        <td colspan="2" class="left small">Metros</td>
        <td class="right">${fmt(tecelagemData.day.meta)}</td>
        <td class="right" style="color: ${getColor(tecelagemData.day.metros - tecelagemData.day.meta)}">${fmt(tecelagemData.day.metros)}</td>
        <td class="right" style="color: ${getColor(tecelagemData.month.metros - tecelagemData.month.metaAcumulada)}">${fmt(tecelagemData.month.metros)}</td>
        <td colspan="2" class="right" style="color: ${getColor(tejDiffMetros)}">${signNum(tejDiffMetros)}</td>
      </tr>
      
      <!-- TECELAGEM - Eficiencia % -->
      <tr>
        <td colspan="2" class="left small">Eficiencia %</td>
        <td>${fmt(tecelagemData.day.metaEfi)}</td>
        <td style="color: ${getColor(tecelagemData.day.eficiencia - tecelagemData.day.metaEfi)}">${fmtDec(tecelagemData.day.eficiencia)}</td>
        <td style="color: ${getColor(tecelagemData.month.eficiencia - tecelagemData.month.metaEfi)}">${fmtDec(tecelagemData.month.eficiencia)}</td>
        <td colspan="2" style="color: ${getColor(tejDiffEfi)}">${signDec(tejDiffEfi, 1)}</td>
      </tr>
      
      <!-- TECELAGEM - Rot. TRA 10⁵ -->
      <tr>
        <td colspan="2" class="left small">Rot. TRA 10⁵</td>
        <td>${fmtDec(tecelagemData.day.metaRt105)}</td>
        <td style="color: ${getColor(tecelagemData.day.metaRt105 - tecelagemData.day.rotTra105)}">${fmtDec(tecelagemData.day.rotTra105)}</td>
        <td style="color: ${getColor(tecelagemData.month.metaRt105 - tecelagemData.month.rotTra105)}">${fmtDec(tecelagemData.month.rotTra105)}</td>
        <td colspan="2" style="color: ${getColor(-tejDiffRt)}">${signDec(tejDiffRt, 1)}</td>
      </tr>
      
      <!-- TECELAGEM - Rot. URD 10⁵ -->
      <tr>
        <td colspan="2" class="left small">Rot. URD 10⁵</td>
        <td>${fmtDec(tecelagemData.day.metaRu105)}</td>
        <td style="color: ${getColor(tecelagemData.day.metaRu105 - tecelagemData.day.rotUrd105)}">${fmtDec(tecelagemData.day.rotUrd105)}</td>
        <td style="color: ${getColor(tecelagemData.month.metaRu105 - tecelagemData.month.rotUrd105)}">${fmtDec(tecelagemData.month.rotUrd105)}</td>
        <td colspan="2" style="color: ${getColor(-tejDiffRu)}">${signDec(tejDiffRu, 1)}</td>
      </tr>
      
      <!-- TECELAGEM - Est. Azul % -->
      <tr class="border-thick-bottom">
        <td colspan="2" class="left small">Est. Azul %</td>
        <td>${fmtDec(tecelagemData.day.metaEstopaAzul)}</td>
        <td style="color: ${getColor(tecelagemData.day.metaEstopaAzul - tecelagemData.day.estopaAzulPct)}">${fmtDec2(tecelagemData.day.estopaAzulPct)}</td>
        <td style="color: ${getColor(tecelagemData.month.metaEstopaAzul - tecelagemData.month.estopaAzulPct)}">${fmtDec2(tecelagemData.month.estopaAzulPct)}</td>
        <td colspan="2" style="color: ${getColor(tejDiffEstopa)}">${signDec(tejDiffEstopa)}</td>
      </tr>
      
      <!-- ACABMTO - Metros -->
      <tr class="acabmto-bg border-thick-top">
        <td rowspan="2" class="vertical small acabmto-bg border-thick-right">ACABMTO</td>
        <td colspan="2" class="left small">Metros</td>
        <td class="right">${fmt(acabamentoData.day.meta)}</td>
        <td class="right" style="color: ${getColor(acabamentoData.day.metros - acabamentoData.day.meta)}">${fmt(acabamentoData.day.metros)}</td>
        <td class="right" style="color: ${getColor(acabamentoData.month.metros - acabamentoData.month.metaAcumulada)}">${fmt(acabamentoData.month.metros)}</td>
        <td colspan="2" class="right" style="color: ${getColor(acabDiffMetros)}">${signNum(acabDiffMetros)}</td>
      </tr>
      
      <!-- ACABMTO - ENC URD % -->
      <tr class="acabmto-bg">
        <td colspan="2" class="left small">ENC URD %</td>
        <td>${fmtDec2(acabamentoData.day.metaEncUrd)}</td>
        <td style="color: ${getColor(acabamentoData.day.metaEncUrd - acabamentoData.day.encUrdPct, false)}">${fmtDec2(acabamentoData.day.encUrdPct)}</td>
        <td style="color: ${getColor(acabamentoData.month.metaEncUrd - acabamentoData.month.encUrdPct, false)}">${fmtDec2(acabamentoData.month.encUrdPct)}</td>
        <td colspan="2" style="color: ${getColor(acabDiffEncUrd)}">${signDec(acabDiffEncUrd)}</td>
      </tr>
    </table>
  `

  return html
}

/**
 * Renderiza la tabla en un contenedor oculto y la captura como imagen
 * @param {Object} data - Datos de la tabla
 * @returns {Promise<Blob>} - Blob de la imagen PNG
 */
export async function captureTableAsImage(data) {
  // Importar html2canvas dinámicamente si es necesario
  const html2canvas = (await import('html2canvas')).default

  // Crear contenedor temporal oculto
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    background: white;
    padding: 8px;
  `
  
  // Generar el HTML de la tabla
  container.innerHTML = generateExcelTableHTML(data)
  
  // Agregar al DOM temporalmente
  document.body.appendChild(container)

  try {
    // Esperar a que se renderice
    await new Promise(resolve => setTimeout(resolve, 100))

    // Capturar con html2canvas
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    })

    // Convertir a blob
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b)
        else reject(new Error('Error creando blob'))
      }, 'image/png', 1.0)
    })

    return blob
  } finally {
    // Limpiar el DOM
    document.body.removeChild(container)
  }
}

/**
 * Copia la imagen de la tabla al portapapeles
 * @param {Object} data - Datos de la tabla
 * @returns {Promise<boolean>} - true si se copió correctamente
 */
export async function copyTableImageToClipboard(data) {
  const blob = await captureTableAsImage(data)

  // Intentar copiar al portapapeles
  if (navigator.clipboard && navigator.clipboard.write) {
    const clipboardItem = new ClipboardItem({ 'image/png': blob })
    await navigator.clipboard.write([clipboardItem])
    return true
  } else {
    throw new Error('API Clipboard no disponible')
  }
}

export default {
  generateExcelTableHTML,
  captureTableAsImage,
  copyTableImageToClipboard
}
