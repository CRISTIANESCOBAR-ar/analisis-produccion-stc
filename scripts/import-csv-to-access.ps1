param(
    [Parameter(Mandatory=$true)][string]$CsvPath,
    [Parameter(Mandatory=$true)][string]$AccessPath,
    [Parameter(Mandatory=$true)][string]$TableName
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $CsvPath)) { throw "Archivo CSV no encontrado: $CsvPath" }
if (-not (Test-Path $AccessPath)) { throw "Base de datos Access no encontrada: $AccessPath" }

$csvFile = Split-Path $CsvPath -Leaf
$csvDir = Split-Path $CsvPath -Parent

$provider = "Microsoft.ACE.OLEDB.12.0"
try {
    $testConn = New-Object System.Data.OleDb.OleDbConnection "Provider=$provider;Data Source=$AccessPath;"
    $testConn.Open(); $testConn.Close()
} catch {
    $provider = "Microsoft.ACE.OLEDB.16.0"
}

$connString = "Provider=$provider;Data Source=$AccessPath;Persist Security Info=False;"
$conn = New-Object System.Data.OleDb.OleDbConnection $connString

try {
    $conn.Open()
    Write-Host "Conectado a Access." -ForegroundColor Cyan

    try {
        $cmdDrop = $conn.CreateCommand()
        $cmdDrop.CommandText = "DROP TABLE [$TableName]"
        $cmdDrop.ExecuteNonQuery() | Out-Null
        Write-Host "Tabla [$TableName] eliminada." -ForegroundColor Yellow
    } catch {
        Write-Host "La tabla [$TableName] no existía." -ForegroundColor Gray
    }

    # Importar CSV usando el driver de Texto de Access/Jet
    # Nota: Requiere que el CSV esté en formato estándar (comas o tabulaciones definidas en schema.ini si es complejo)
    $query = "SELECT * INTO [$TableName] FROM [Text;HDR=YES;FMT=Delimited;Database=$csvDir].[$csvFile]"
    
    $cmdImport = $conn.CreateCommand()
    $cmdImport.CommandText = $query
    $cmdImport.ExecuteNonQuery() | Out-Null
    
    Write-Host "Importación de CSV a Access completada." -ForegroundColor Green

} catch {
    Write-Error "Error: $_"
} finally {
    if ($conn.State -eq 'Open') { $conn.Close() }
}
