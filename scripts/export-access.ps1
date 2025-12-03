Param(
  [Parameter(Mandatory=$true)] [string]$AccdbPath,
  [Parameter(Mandatory=$true)] [string]$OutDir
)

$ErrorActionPreference = 'Stop'

function Get-OleDbProvider {
  foreach ($p in 'Microsoft.ACE.OLEDB.16.0','Microsoft.ACE.OLEDB.12.0') {
    try {
      $cn = New-Object System.Data.OleDb.OleDbConnection ("Provider=$p;Data Source=$AccdbPath;Persist Security Info=False;")
      $cn.Open(); $cn.Close(); return $p
    } catch {}
  }
  throw "No se encontraron proveedores ACE OLEDB (16.0/12.0). Instala Access Database Engine 2016 x64: https://www.microsoft.com/en-us/download/details.aspx?id=54920"
}

function Ensure-OutDir($dir) {
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
}

Ensure-OutDir $OutDir
$provider = Get-OleDbProvider
Write-Host "Proveedor OLEDB usado: $provider" -ForegroundColor Cyan

$cn = New-Object System.Data.OleDb.OleDbConnection ("Provider=$provider;Data Source=$AccdbPath;Persist Security Info=False;")
$cn.Open()

$tables = $cn.GetSchema('Tables') | Where-Object { $_.TABLE_TYPE -in @('TABLE','VIEW') -and -not $_.TABLE_NAME.StartsWith('MSys') }
$cols = $cn.GetSchema('Columns')
$indexes = $cn.GetSchema('Indexes')
$pk = $cn.GetSchema('IndexColumns') | Where-Object { $_.PRIMARY_KEY -eq $true }

# Guardar esquema a JSON
$schema = @{}
foreach ($t in $tables) {
  $tn = $t.TABLE_NAME
  $schema[$tn] = [PSCustomObject]@{
    Type = $t.TABLE_TYPE
    Columns = @()
    PrimaryKey = @()
  }
  $tcols = $cols | Where-Object { $_.TABLE_NAME -eq $tn } | Sort-Object ORDINAL_POSITION
  foreach ($c in $tcols) {
    $schema[$tn].Columns += [PSCustomObject]@{
      Name = $c.COLUMN_NAME
      DataType = $c.DATA_TYPE
      Ordinal = $c.ORDINAL_POSITION
      Nullable = $c.IS_NULLABLE
    }
  }
  $pkn = $pk | Where-Object { $_.TABLE_NAME -eq $tn } | Select-Object -ExpandProperty COLUMN_NAME -Unique
  $schema[$tn].PrimaryKey = $pkn
}
($schema | ConvertTo-Json -Depth 6) | Out-File (Join-Path $OutDir 'schema.json') -Encoding UTF8

# Exportar CSV por tabla (solo TABLE, no VIEW)
foreach ($t in ($tables | Where-Object { $_.TABLE_TYPE -eq 'TABLE' })) {
  $tn = $t.TABLE_NAME
  $cmd = $cn.CreateCommand()
  $cmd.CommandText = "SELECT * FROM [$tn]"
  $ad = New-Object System.Data.OleDb.OleDbDataAdapter $cmd
  $dt = New-Object System.Data.DataTable
  [void]$ad.Fill($dt)
  $csvPath = Join-Path $OutDir ("$tn.csv")
  $dt | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
  Write-Host "Exportado: $csvPath" -ForegroundColor Green
}

$cn.Close()

Write-Host "Listo. Archivos generados en $OutDir:" -ForegroundColor Yellow
Get-ChildItem $OutDir | Select-Object Name,Length | Format-Table -AutoSize
