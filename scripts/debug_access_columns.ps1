$AccessPath = "c:\STC\rptProdTec.accdb"
$TableName = "tb_CALIDAD"

try {
    $access = New-Object -ComObject Access.Application
    $access.OpenCurrentDatabase($AccessPath)
    $db = $access.CurrentDb()
    $tableDef = $db.TableDefs.Item($TableName)
    
    Write-Host "Columns in $TableName :"
    foreach ($field in $tableDef.Fields) {
        Write-Host "  [$($field.Name)]"
    }
} catch {
    Write-Error $_
} finally {
    if ($access) {
        $access.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($access) | Out-Null
    }
}
