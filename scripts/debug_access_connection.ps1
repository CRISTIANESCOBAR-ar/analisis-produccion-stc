$AccessPath = "c:\STC\rptProdTec.accdb"
$TableName = "tb_CALIDAD"

try {
    Write-Host "Creating Access.Application..."
    $app = New-Object -ComObject Access.Application
    $app.OpenCurrentDatabase($AccessPath)
    
    Write-Host "Trying CurrentDb..."
    try {
        $db = $app.CurrentDb()
        Write-Host "CurrentDb success. TableDefs count: $($db.TableDefs.Count)"
    } catch {
        Write-Host "CurrentDb failed: $_"
    }

    Write-Host "Trying CurrentProject.Connection..."
    try {
        $conn = $app.CurrentProject.Connection
        Write-Host "Connection provider: $($conn.Provider)"
        
        $rs = $conn.Execute("SELECT TOP 1 * FROM [$TableName]")
        Write-Host "Recordset fields:"
        foreach ($field in $rs.Fields) {
            # Write-Host "  $($field.Name)"
        }
        Write-Host "Recordset success."
        $rs.Close()
    } catch {
        Write-Host "CurrentProject.Connection failed: $_"
    }

} catch {
    Write-Error $_
} finally {
    if ($app) {
        $app.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($app) | Out-Null
    }
}
