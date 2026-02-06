<#
.SYNOPSIS
    Importa datos de producción Open End (OE) desde Excel/CSV a SQLite de forma rápida y eficiente.

.DESCRIPTION
    Script optimizado para importar rptProducaoOE.xlsx a tb_PRODUCCION_OE eliminando encabezados
    duplicados y aplicando validaciones necesarias.

.PARAMETER XlsxPath
    Ruta al archivo Excel o CSV de origen

.PARAMETER DbPath
    Ruta a la base de datos SQLite (por defecto: produccion.db en el directorio actual)

.EXAMPLE
    .\import-produccion-oe-fast.ps1 -XlsxPath "C:\STC\rptProducaoOE.xlsx"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$XlsxPath = "C:\STC\rptProducaoOE.xlsx",
    
    [Parameter(Mandatory=$false)]
    [string]$DbPath = "$PSScriptRoot\..\database\produccion.db"
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  IMPORTACIÓN PRODUCCIÓN OE (FAST)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# Validar archivo de entrada
if (-not (Test-Path $XlsxPath)) {
    Write-Host "ERROR: No se encontro el archivo $XlsxPath" -ForegroundColor Red
    exit 1
}

$fileInfo = Get-Item $XlsxPath
$fileSizeMB = [math]::Round($fileInfo.Length/1MB, 2)
Write-Host "Archivo: $($fileInfo.Name) ($fileSizeMB MB)" -ForegroundColor White
Write-Host "Ultima modificacion: $($fileInfo.LastWriteTime)" -ForegroundColor Gray

# Determinar si es CSV o XLSX
$isCsv = $XlsxPath -like "*.csv"
$tempCsv = $null

try {
    # Si es XLSX, convertir a CSV primero
    if (-not $isCsv) {
        Write-Host ""
        Write-Host "Convirtiendo XLSX a CSV..." -ForegroundColor Yellow
        $tempCsv = [System.IO.Path]::GetTempFileName() + ".csv"
        
        $pythonScript = @"
import pandas as pd
import sys

try:
    # Leer Excel
    df = pd.read_excel('$($XlsxPath.Replace('\','\\'))', sheet_name=0)
    
    # Eliminar columnas sin nombre o vacías
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
    
    # Eliminar filas donde todas las columnas son NaN
    df = df.dropna(how='all')
    
    # Eliminar encabezados duplicados (filas donde FILIAL == 'FILIAL')
    if 'FILIAL' in df.columns:
        df = df[df['FILIAL'].astype(str) != 'FILIAL']
    
    # Convertir DATA_PRODUCAO a formato DD/MM/YYYY
    if 'DATA_PRODUCAO' in df.columns:
        df['DATA_PRODUCAO'] = pd.to_datetime(df['DATA_PRODUCAO'], errors='coerce')
        df['DATA_PRODUCAO'] = df['DATA_PRODUCAO'].dt.strftime('%d/%m/%Y')
    
    # Normalizar FILIAL (5 -> 05)
    if 'FILIAL' in df.columns:
        df['FILIAL'] = df['FILIAL'].apply(lambda x: str(int(float(x))).zfill(2) if pd.notna(x) else '')
    
    # Normalizar MAQUINA (agregar ceros a la izquierda si es necesario)
    if 'MAQUINA' in df.columns:
        df['MAQUINA'] = df['MAQUINA'].apply(lambda x: str(int(float(x))).zfill(5) if pd.notna(x) else '')
    
    # Guardar a CSV
    df.to_csv('$($tempCsv.Replace('\','\\'))', index=False, encoding='utf-8')
    print(f'OK: {len(df)} registros')
    
except Exception as e:
    print(f'ERROR: {str(e)}', file=sys.stderr)
    sys.exit(1)
"@
        
        $result = python -c $pythonScript 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Error al convertir Excel: $result"
        }
        
        $recordCount = ($result -replace 'OK: (\d+) registros', '$1')
        Write-Host "CSV generado: $recordCount registros" -ForegroundColor Green
        
        $csvPath = $tempCsv
    } else {
        $csvPath = $XlsxPath
    }
    
    # Importar a SQLite
    Write-Host ""
    Write-Host "Importando a SQLite..." -ForegroundColor Yellow
    
    # Crear tabla si no existe
    $createTableSql = @"
CREATE TABLE IF NOT EXISTS tb_PRODUCCION_OE (
    FILIAL TEXT,
    [LOC. FISICO] TEXT,
    MAQUINA TEXT,
    NOME_MAQUINA TEXT,
    DATA_PRODUCAO TEXT,
    TURNO TEXT,
    LADO TEXT,
    ITEM TEXT,
    [DESC ITEM] TEXT,
    [HORA INICIAL] TEXT,
    [HORA FINAL] TEXT,
    RPM TEXT,
    [NUM FUSOS] TEXT,
    ALFA TEXT,
    [LOTE PRODUC] TEXT,
    [TÍTULO] TEXT,
    TEMPO TEXT,
    [TORCAO P POLEG] TEXT,
    [TORCAO P METRO] TEXT,
    [PROD MT/MIN] TEXT,
    [PROD KG/HR] TEXT,
    [PROD CALCULADA] TEXT,
    [PROD INFORMADA] TEXT,
    [EFIC CALCULADA] TEXT,
    [EFIC INFORMADA] TEXT,
    OPERADOR TEXT,
    [T.BOB.] TEXT,
    [RPM CARD] TEXT,
    N TEXT,
    S TEXT,
    L TEXT,
    T TEXT,
    MO TEXT,
    [CP V+ SL+] TEXT,
    [CM V- SL-] TEXT,
    [CCp C+] TEXT,
    [CCm C-] TEXT,
    [JP (P+)] TEXT,
    [JM (P-)] TEXT,
    CVP TEXT,
    CVM TEXT,
    [CORT NAT] TEXT,
    [% ROB 01] TEXT,
    [% ROB 02] TEXT,
    [% ROB 03] TEXT
);
"@
    
    # Ejecutar con sqlite3
    $createTableSql | sqlite3 $DbPath
    
    # Limpiar tabla antes de importar
    "DELETE FROM tb_PRODUCCION_OE;" | sqlite3 $DbPath
    
    # Importar CSV - usar tabla temporal para evitar problemas con encabezados
    Write-Host "Ejecutando importacion..." -ForegroundColor Yellow
    
    # Estrategia: crear tabla temp, importar allí, copiar a tabla final
    $importSql = @"
/* Crear tabla temporal */
DROP TABLE IF EXISTS tb_PRODUCCION_OE_TEMP;
CREATE TABLE tb_PRODUCCION_OE_TEMP (
    FILIAL TEXT, [LOC. FISICO] TEXT, MAQUINA TEXT, NOME_MAQUINA TEXT,
    DATA_PRODUCAO TEXT, TURNO TEXT, LADO TEXT, ITEM TEXT, [DESC ITEM] TEXT,
    [HORA INICIAL] TEXT, [HORA FINAL] TEXT, RPM TEXT, [NUM FUSOS] TEXT,
    ALFA TEXT, [LOTE PRODUC] TEXT, [TÍTULO] TEXT, TEMPO TEXT,
    [TORCAO P POLEG] TEXT, [TORCAO P METRO] TEXT, [PROD MT/MIN] TEXT,
    [PROD KG/HR] TEXT, [PROD CALCULADA] TEXT, [PROD INFORMADA] TEXT,
    [EFIC CALCULADA] TEXT, [EFIC INFORMADA] TEXT, OPERADOR TEXT,
    [T.BOB.] TEXT, [RPM CARD] TEXT, N TEXT, S TEXT, L TEXT, T TEXT,
    MO TEXT, [CP V+ SL+] TEXT, [CM V- SL-] TEXT, [CCp C+] TEXT,
    [CCm C-] TEXT, [JP (P+)] TEXT, [JM (P-)] TEXT, CVP TEXT,
    CVM TEXT, [CORT NAT] TEXT, [% ROB 01] TEXT, [% ROB 02] TEXT, [% ROB 03] TEXT
);

/* Importar CSV */
.mode csv
.import '$($csvPath.Replace('\', '/'))' tb_PRODUCCION_OE_TEMP

/* Copiar solo datos excluyendo encabezado duplicado si existe */
INSERT INTO tb_PRODUCCION_OE
SELECT * FROM tb_PRODUCCION_OE_TEMP
WHERE FILIAL != 'FILIAL';

/* Limpiar tabla temporal */
DROP TABLE tb_PRODUCCION_OE_TEMP;
"@
    
    $importOutput = $importSql | sqlite3 $DbPath 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error en importacion:" -ForegroundColor Red
        Write-Host $importOutput -ForegroundColor Red
        throw "Error al importar CSV a SQLite: $importOutput"
    }
    
    if ($importOutput) {
        Write-Host "Advertencias durante importacion:" -ForegroundColor Yellow
        Write-Host $importOutput -ForegroundColor Gray
    }
    
    # Verificar registros importados
    $count = sqlite3 $DbPath "SELECT COUNT(*) FROM tb_PRODUCCION_OE;"
    
    Write-Host "Importacion completada: $count registros" -ForegroundColor Green
    
    # Crear índices
    Write-Host ""
    Write-Host "Creando indices..." -ForegroundColor Yellow
    
    $indexSql = @"
CREATE INDEX IF NOT EXISTS idx_produccion_oe_fecha ON tb_PRODUCCION_OE(DATA_PRODUCAO);
CREATE INDEX IF NOT EXISTS idx_produccion_oe_maquina ON tb_PRODUCCION_OE(MAQUINA);
CREATE INDEX IF NOT EXISTS idx_produccion_oe_filial ON tb_PRODUCCION_OE(FILIAL);
CREATE INDEX IF NOT EXISTS idx_produccion_oe_turno ON tb_PRODUCCION_OE(TURNO);
"@
    
    $indexSql | sqlite3 $DbPath
    
    Write-Host "Indices creados" -ForegroundColor Green
    
    # Actualizar registro de importación
    $updateMetaSql = @"
INSERT OR REPLACE INTO import_control (tabla_destino, xlsx_path, xlsx_sheet, last_import_date, xlsx_last_modified, xlsx_hash, rows_imported, import_strategy)
VALUES ('tb_PRODUCCION_OE', '$($XlsxPath.Replace("'", "''"))', 'Sheet1', datetime('now', 'localtime'), datetime('$($fileInfo.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))'), 'NA', $count, 'fast_csv');
"@
    
    $updateMetaSql | sqlite3 $DbPath 2>&1 | Out-Null
    
    $stopwatch.Stop()
    $elapsed = $stopwatch.Elapsed
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  IMPORTACION EXITOSA" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Tiempo total: $($elapsed.TotalSeconds.ToString('F2'))s" -ForegroundColor White
    Write-Host "Registros: $count" -ForegroundColor White
    Write-Host "Base de datos: $DbPath" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
} finally {
    # Limpiar archivo temporal
    if ($tempCsv -and (Test-Path $tempCsv)) {
        Remove-Item $tempCsv -Force -ErrorAction SilentlyContinue
    }
}
