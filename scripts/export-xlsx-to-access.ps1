param(
    [Parameter(Mandatory=$true)][string]$ExcelPath,
    [Parameter(Mandatory=$true)][string]$AccessPath,
    [Parameter(Mandatory=$true)][string]$TableName,
    [Parameter(Mandatory=$false)][string]$SheetName = "rptStock"
)

$ErrorActionPreference = 'Stop'

# Verificar archivos
if (-not (Test-Path $ExcelPath)) { throw "Archivo Excel no encontrado: $ExcelPath" }
if (-not (Test-Path $AccessPath)) { throw "Base de datos Access no encontrada: $AccessPath" }

# Cadena de conexión para Access (ACE OLEDB)
# Intentar 12.0 (Office 2010-2016) y 16.0 (Office 2016/2019/365)
$provider = "Microsoft.ACE.OLEDB.12.0"
try {
    $testConn = New-Object System.Data.OleDb.OleDbConnection "Provider=$provider;Data Source=$AccessPath;"
    $testConn.Open()
    $testConn.Close()
} catch {
    $provider = "Microsoft.ACE.OLEDB.16.0"
    try {
        $testConn = New-Object System.Data.OleDb.OleDbConnection "Provider=$provider;Data Source=$AccessPath;"
        $testConn.Open()
        $testConn.Close()
    } catch {
        throw "No se pudo conectar a Access. Asegúrese de tener instalado 'Microsoft Access Database Engine 2010' o superior."
    }
}

$connString = "Provider=$provider;Data Source=$AccessPath;Persist Security Info=False;"
$conn = New-Object System.Data.OleDb.OleDbConnection $connString

try {
    $conn.Open()
    Write-Host "Conectado a Access ($AccessPath)" -ForegroundColor Cyan

    # 1. Eliminar tabla existente
    try {
        $cmdDrop = $conn.CreateCommand()
        $cmdDrop.CommandText = "DROP TABLE [$TableName]"
        $cmdDrop.ExecuteNonQuery() | Out-Null
        Write-Host "Tabla [$TableName] eliminada." -ForegroundColor Yellow
    } catch {
        # Ignorar error si la tabla no existe
        Write-Host "La tabla [$TableName] no existía (o no se pudo borrar)." -ForegroundColor Gray
    }

    # 2. Importar desde Excel
    # Nota: Se usa la sintaxis de Jet/ACE SQL para consultar Excel externo
    # [Excel 12.0 Xml;HDR=YES;Database=PATH].[Sheet$]
    
    $sheetRef = "[$SheetName$]"
    if ($SheetName.EndsWith('$')) { $sheetRef = "[$SheetName]" }

    $excelConnStr = "Excel 12.0 Xml;HDR=YES;Database=$ExcelPath"
    
    $query = "SELECT * INTO [$TableName] FROM [$excelConnStr].$sheetRef"
    
    Write-Host "Ejecutando importación desde Excel..." -ForegroundColor Cyan
    $cmdImport = $conn.CreateCommand()
    $cmdImport.CommandText = $query
    $cmdImport.ExecuteNonQuery() | Out-Null
    
    Write-Host "Importación exitosa a la tabla [$TableName]." -ForegroundColor Green

} catch {
    Write-Error "Error durante la exportación: $_"
} finally {
    if ($conn.State -eq 'Open') { $conn.Close() }
}
