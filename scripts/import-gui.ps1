# =====================================================================
# INTERFAZ GRÁFICA PARA ACTUALIZACIÓN INCREMENTAL - XLSX A SQLITE
# =====================================================================
# Modal interactivo que muestra estado de archivos y permite importar
# solo los seleccionados o todos con cambios detectados
# =====================================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$SqlitePath = "C:\analisis-stock-stc\database\produccion.db"
$ScriptRoot = "C:\analisis-stock-stc\scripts"
$ImportScript = "$ScriptRoot\import-xlsx-to-sqlite.ps1"

# Buscar sqlite3.exe
$sqlite3Paths = @(
  "sqlite3",
  "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\SQLite.SQLite_*\sqlite3.exe",
  "$env:LOCALAPPDATA\Microsoft\WinGet\Links\sqlite3.exe",
  "C:\Program Files\SQLite\sqlite3.exe",
  "C:\sqlite\sqlite3.exe"
)

$global:sqlite3Cmd = $null
foreach ($path in $sqlite3Paths) {
  try {
    if ($path -like "*``**") {
      $resolved = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
      if ($resolved -and (Test-Path $resolved)) {
        $global:sqlite3Cmd = $resolved
        break
      }
    } else {
      $testResult = Get-Command $path -ErrorAction SilentlyContinue
      if ($testResult) {
        $global:sqlite3Cmd = $path
        break
      }
    }
  } catch { continue }
}

if (-not $global:sqlite3Cmd) {
  [System.Windows.Forms.MessageBox]::Show(
    "sqlite3.exe no encontrado.`n`nPor favor instala SQLite:`n   winget install SQLite.SQLite",
    "Error - SQLite Requerido",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  )
  exit 1
}

# Configuración de tablas
$tableConfigs = @(
  @{
    Table = 'tb_FICHAS'
    XlsxPath = 'C:\STC\fichaArtigo.xlsx'
    Sheet = 'lista de tecidos'
    MappingJson = "$ScriptRoot\mappings\tb_FICHAS.json"
    DateColumn = $null
    Strategy = 'clear_table'
    DisplayName = 'Fichas de Artículos'
  },
  @{
    Table = 'tb_RESIDUOS_INDIGO'
    XlsxPath = 'C:\STC\RelResIndigo.xlsx'
    Sheet = 'Índigo'
    MappingJson = "$ScriptRoot\mappings\tb_RESIDUOS_INDIGO.json"
    DateColumn = 'DT_MOV'
    Strategy = 'date_delete'
    DisplayName = 'Residuos Índigo'
  },
  @{
    Table = 'tb_RESIDUOS_POR_SECTOR'
    XlsxPath = 'C:\STC\rptResiduosPorSetor.xlsx'
    Sheet = 'Setor'
    MappingJson = "$ScriptRoot\mappings\tb_RESIDUOS_POR_SECTOR.json"
    DateColumn = 'DT_MOV'
    Strategy = 'date_delete'
    DisplayName = 'Residuos por Sector'
  },
  @{
    Table = 'tb_TESTES'
    XlsxPath = 'C:\STC\rptPrdTestesFisicos.xlsx'
    Sheet = 'report2'
    MappingJson = "$ScriptRoot\mappings\tb_TESTES.json"
    DateColumn = 'DT_PROD'
    Strategy = 'date_delete'
    DisplayName = 'Testes Físicos'
  },
  @{
    Table = 'tb_PARADAS'
    XlsxPath = 'C:\STC\rptParadaMaquinaPRD.xlsx'
    Sheet = 'report1'
    MappingJson = "$ScriptRoot\mappings\tb_PARADAS.json"
    DateColumn = 'DATA_BASE'
    Strategy = 'date_delete'
    DisplayName = 'Paradas de Máquina'
  },
  @{
    Table = 'tb_PRODUCCION'
    XlsxPath = 'C:\STC\rptProducaoMaquina.xlsx'
    Sheet = 'report1'
    MappingJson = "$ScriptRoot\mappings\tb_PRODUCCION.json"
    DateColumn = 'DT_BASE_PRODUCAO'
    Strategy = 'date_delete'
    DisplayName = 'Producción'
  },
  @{
    Table = 'tb_CALIDAD'
    XlsxPath = 'C:\STC\rptAcompDiarioPBI.xlsx'
    Sheet = 'report1'
    MappingJson = "$ScriptRoot\mappings\tb_CALIDAD.json"
    DateColumn = 'DAT_PROD'
    Strategy = 'date_delete'
    DisplayName = 'Control de Calidad'
  }
)

# Funciones auxiliares
function Get-FileHashMD5 {
  param([string]$FilePath)
  try {
    $hash = Get-FileHash -Path $FilePath -Algorithm MD5
    return $hash.Hash
  } catch {
    return $null
  }
}

function Get-LastImportState {
  param([string]$Table)
  $query = "SELECT * FROM import_control WHERE tabla_destino='$Table';"
  $result = & $global:sqlite3Cmd $SqlitePath $query -json 2>$null
  if ($LASTEXITCODE -eq 0 -and $result) {
    try {
      return ($result | ConvertFrom-Json)[0]
    } catch {
      return $null
    }
  }
  return $null
}

function Get-FileStatus {
  param($Config)
  
  $status = @{
    Config = $Config
    FileExists = $false
    LastModified = $null
    CurrentHash = $null
    LastState = $null
    HasChanges = $false
    ChangeReason = ""
    FileSize = 0
  }
  
  if (-not (Test-Path $Config.XlsxPath)) {
    $status.ChangeReason = "Archivo no encontrado"
    return $status
  }
  
  $fileInfo = Get-Item $Config.XlsxPath
  $status.FileExists = $true
  $status.LastModified = $fileInfo.LastWriteTime
  $status.FileSize = [math]::Round($fileInfo.Length / 1MB, 2)
  $status.CurrentHash = Get-FileHashMD5 $Config.XlsxPath
  $status.LastState = Get-LastImportState $Config.Table
  
  if (-not $status.LastState) {
    $status.HasChanges = $true
    $status.ChangeReason = "Primera importación"
  } elseif ($status.LastModified.ToString('yyyy-MM-dd HH:mm:ss') -ne $status.LastState.xlsx_last_modified) {
    $status.HasChanges = $true
    $status.ChangeReason = "Fecha modificada: $($status.LastState.xlsx_last_modified)"
  } elseif ($status.CurrentHash -and $status.CurrentHash -ne $status.LastState.xlsx_hash) {
    $status.HasChanges = $true
    $status.ChangeReason = "Contenido modificado"
  } else {
    $status.HasChanges = $false
    $status.ChangeReason = "Sin cambios desde $($status.LastState.last_import_date)"
  }
  
  return $status
}

# Crear formulario principal
$form = New-Object System.Windows.Forms.Form
$form.Text = "Actualización Incremental - XLSX → SQLite"
$form.Size = New-Object System.Drawing.Size(900, 650)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false

# Panel superior - Título
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Location = New-Object System.Drawing.Point(20, 15)
$titleLabel.Size = New-Object System.Drawing.Size(860, 25)
$titleLabel.Text = "Selecciona las tablas a importar"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($titleLabel)

# Subtítulo con info
$subtitleLabel = New-Object System.Windows.Forms.Label
$subtitleLabel.Location = New-Object System.Drawing.Point(20, 45)
$subtitleLabel.Size = New-Object System.Drawing.Size(860, 20)
$subtitleLabel.Text = "Base de datos: produccion.db | Ubicación archivos: C:\STC\"
$subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$subtitleLabel.ForeColor = [System.Drawing.Color]::Gray
$form.Controls.Add($subtitleLabel)

# CheckedListBox para las tablas
$listBox = New-Object System.Windows.Forms.CheckedListBox
$listBox.Location = New-Object System.Drawing.Point(20, 75)
$listBox.Size = New-Object System.Drawing.Size(860, 400)
$listBox.CheckOnClick = $true
$listBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$form.Controls.Add($listBox)

# Panel de botones
$btnPanel = New-Object System.Windows.Forms.Panel
$btnPanel.Location = New-Object System.Drawing.Point(20, 485)
$btnPanel.Size = New-Object System.Drawing.Size(860, 50)
$form.Controls.Add($btnPanel)

# Botón: Seleccionar solo con cambios
$btnSelectChanged = New-Object System.Windows.Forms.Button
$btnSelectChanged.Location = New-Object System.Drawing.Point(0, 10)
$btnSelectChanged.Size = New-Object System.Drawing.Size(180, 35)
$btnSelectChanged.Text = "✓ Solo con Cambios"
$btnSelectChanged.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$btnPanel.Controls.Add($btnSelectChanged)

# Botón: Seleccionar todo
$btnSelectAll = New-Object System.Windows.Forms.Button
$btnSelectAll.Location = New-Object System.Drawing.Point(190, 10)
$btnSelectAll.Size = New-Object System.Drawing.Size(150, 35)
$btnSelectAll.Text = "☑ Seleccionar Todo"
$btnSelectAll.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$btnPanel.Controls.Add($btnSelectAll)

# Botón: Deseleccionar todo
$btnDeselectAll = New-Object System.Windows.Forms.Button
$btnDeselectAll.Location = New-Object System.Drawing.Point(350, 10)
$btnDeselectAll.Size = New-Object System.Drawing.Size(150, 35)
$btnDeselectAll.Text = "☐ Deseleccionar Todo"
$btnDeselectAll.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$btnPanel.Controls.Add($btnDeselectAll)

# Botón: Refrescar estado
$btnRefresh = New-Object System.Windows.Forms.Button
$btnRefresh.Location = New-Object System.Drawing.Point(510, 10)
$btnRefresh.Size = New-Object System.Drawing.Size(130, 35)
$btnRefresh.Text = "🔄 Refrescar"
$btnRefresh.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$btnPanel.Controls.Add($btnRefresh)

# Label de resumen
$summaryLabel = New-Object System.Windows.Forms.Label
$summaryLabel.Location = New-Object System.Drawing.Point(20, 545)
$summaryLabel.Size = New-Object System.Drawing.Size(500, 20)
$summaryLabel.Text = "Seleccionadas: 0 | Con cambios: 0 | Sin cambios: 0"
$summaryLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($summaryLabel)

# Panel de botones principales
$mainBtnPanel = New-Object System.Windows.Forms.Panel
$mainBtnPanel.Location = New-Object System.Drawing.Point(20, 570)
$mainBtnPanel.Size = New-Object System.Drawing.Size(860, 45)
$form.Controls.Add($mainBtnPanel)

# Botón: Importar
$btnImport = New-Object System.Windows.Forms.Button
$btnImport.Location = New-Object System.Drawing.Point(600, 5)
$btnImport.Size = New-Object System.Drawing.Size(120, 35)
$btnImport.Text = "▶ Importar"
$btnImport.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$btnImport.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)
$btnImport.ForeColor = [System.Drawing.Color]::White
$btnImport.FlatStyle = 'Flat'
$mainBtnPanel.Controls.Add($btnImport)

# Botón: Cancelar
$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Location = New-Object System.Drawing.Point(730, 5)
$btnCancel.Size = New-Object System.Drawing.Size(120, 35)
$btnCancel.Text = "✖ Cancelar"
$btnCancel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$mainBtnPanel.Controls.Add($btnCancel)

# Variable global para estados
$global:fileStatuses = @()

# Función para cargar estados
function Load-FileStatuses {
  $listBox.Items.Clear()
  $global:fileStatuses = @()
  
  foreach ($config in $tableConfigs) {
    $status = Get-FileStatus $config
    $global:fileStatuses += $status
    
    # Formatear línea para el listbox
    $icon = if ($status.HasChanges) { "🔄" } else { "✓" }
    $fileName = Split-Path $config.XlsxPath -Leaf
    $fileStatus = if (-not $status.FileExists) { 
      "[NO ENCONTRADO]" 
    } elseif ($status.HasChanges) { 
      "[MODIFICADO]" 
    } else { 
      "[OK]" 
    }
    
    $line = "$icon $($config.DisplayName.PadRight(25)) $fileStatus $($status.ChangeReason)"
    $listBox.Items.Add($line, $status.HasChanges) | Out-Null
  }
  
  Update-Summary
}

# Función para actualizar resumen
function Update-Summary {
  $selected = ($listBox.CheckedItems.Count)
  $withChanges = ($global:fileStatuses | Where-Object { $_.HasChanges }).Count
  $noChanges = ($global:fileStatuses | Where-Object { -not $_.HasChanges }).Count
  $summaryLabel.Text = "Seleccionadas: $selected | Con cambios: $withChanges | Sin cambios: $noChanges"
}

# Event: Seleccionar solo con cambios
$btnSelectChanged.Add_Click({
  for ($i = 0; $i -lt $listBox.Items.Count; $i++) {
    $listBox.SetItemChecked($i, $global:fileStatuses[$i].HasChanges)
  }
  Update-Summary
})

# Event: Seleccionar todo
$btnSelectAll.Add_Click({
  for ($i = 0; $i -lt $listBox.Items.Count; $i++) {
    $listBox.SetItemChecked($i, $true)
  }
  Update-Summary
})

# Event: Deseleccionar todo
$btnDeselectAll.Add_Click({
  for ($i = 0; $i -lt $listBox.Items.Count; $i++) {
    $listBox.SetItemChecked($i, $false)
  }
  Update-Summary
})

# Event: Refrescar
$btnRefresh.Add_Click({
  Load-FileStatuses
})

# Event: Cambio en checkboxes
$listBox.Add_ItemCheck({
  $timer = New-Object System.Windows.Forms.Timer
  $timer.Interval = 100
  $timer.Add_Tick({
    Update-Summary
    $this.Stop()
    $this.Dispose()
  })
  $timer.Start()
})

# Event: Importar
$btnImport.Add_Click({
  $selectedIndices = @()
  for ($i = 0; $i -lt $listBox.Items.Count; $i++) {
    if ($listBox.GetItemChecked($i)) {
      $selectedIndices += $i
    }
  }
  
  if ($selectedIndices.Count -eq 0) {
    [System.Windows.Forms.MessageBox]::Show(
      "Por favor selecciona al menos una tabla para importar.",
      "Ninguna tabla seleccionada",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Warning
    )
    return
  }
  
  $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.Tag = $selectedIndices
  $form.Close()
})

# Cargar estados iniciales
Load-FileStatuses

# Mostrar formulario
$result = $form.ShowDialog()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  $selectedIndices = $form.Tag
  
  # Crear formulario de progreso
  $progressForm = New-Object System.Windows.Forms.Form
  $progressForm.Text = "Importando Datos..."
  $progressForm.Size = New-Object System.Drawing.Size(600, 300)
  $progressForm.StartPosition = "CenterScreen"
  $progressForm.FormBorderStyle = 'FixedDialog'
  $progressForm.MaximizeBox = $false
  $progressForm.MinimizeBox = $false
  $progressForm.ControlBox = $false
  
  $progressLabel = New-Object System.Windows.Forms.Label
  $progressLabel.Location = New-Object System.Drawing.Point(20, 20)
  $progressLabel.Size = New-Object System.Drawing.Size(560, 30)
  $progressLabel.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
  $progressForm.Controls.Add($progressLabel)
  
  $progressBar = New-Object System.Windows.Forms.ProgressBar
  $progressBar.Location = New-Object System.Drawing.Point(20, 60)
  $progressBar.Size = New-Object System.Drawing.Size(560, 30)
  $progressBar.Style = 'Continuous'
  $progressForm.Controls.Add($progressBar)
  
  $detailsTextBox = New-Object System.Windows.Forms.TextBox
  $detailsTextBox.Location = New-Object System.Drawing.Point(20, 100)
  $detailsTextBox.Size = New-Object System.Drawing.Size(560, 150)
  $detailsTextBox.Multiline = $true
  $detailsTextBox.ScrollBars = 'Vertical'
  $detailsTextBox.ReadOnly = $true
  $detailsTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
  $progressForm.Controls.Add($detailsTextBox)
  
  # Mostrar ventana de progreso
  $progressForm.Show()
  $progressForm.Refresh()
  
  $totalTables = $selectedIndices.Count
  $currentTable = 0
  $successCount = 0
  $errorCount = 0
  
  foreach ($index in $selectedIndices) {
    $currentTable++
    $status = $global:fileStatuses[$index]
    $config = $status.Config
    
    $progressBar.Value = [math]::Round(($currentTable / $totalTables) * 100)
    $progressLabel.Text = "Importando $($config.DisplayName) ($currentTable de $totalTables)..."
    $detailsTextBox.AppendText("`r`n=== $($config.DisplayName) ===`r`n")
    $progressForm.Refresh()
    
    try {
      $importParams = @{
        XlsxPath = $config.XlsxPath
        Sheet = $config.Sheet
        SqlitePath = $SqlitePath
        Table = $config.Table
        MappingSource = 'json'
        MappingJson = $config.MappingJson
      }
      
      if ($config.Strategy -eq 'clear_table') {
        $importParams['ClearTable'] = $true
      } elseif ($config.DateColumn) {
        $importParams['DateColumn'] = $config.DateColumn
      }
      
      $importOutput = & $ImportScript @importParams 2>&1 | Out-String
      
      if ($LASTEXITCODE -eq 0 -or $importOutput -match "completada") {
        $detailsTextBox.AppendText("✓ Importación exitosa`r`n")
        $successCount++
      } else {
        $detailsTextBox.AppendText("✗ Error en importación`r`n")
        $detailsTextBox.AppendText($importOutput + "`r`n")
        $errorCount++
      }
    } catch {
      $detailsTextBox.AppendText("✗ Excepción: $($_.Exception.Message)`r`n")
      $errorCount++
    }
    
    $detailsTextBox.SelectionStart = $detailsTextBox.Text.Length
    $detailsTextBox.ScrollToCaret()
    $progressForm.Refresh()
  }
  
  $progressBar.Value = 100
  $progressLabel.Text = "Importación completada"
  
  $detailsTextBox.AppendText("`r`n=== RESUMEN ===`r`n")
  $detailsTextBox.AppendText("✓ Exitosas: $successCount`r`n")
  $detailsTextBox.AppendText("✗ Errores: $errorCount`r`n")
  
  $btnClose = New-Object System.Windows.Forms.Button
  $btnClose.Location = New-Object System.Drawing.Point(250, 260)
  $btnClose.Size = New-Object System.Drawing.Size(100, 30)
  $btnClose.Text = "Cerrar"
  $btnClose.Add_Click({ $progressForm.Close() })
  $progressForm.Controls.Add($btnClose)
  
  $progressForm.ControlBox = $true
  $progressForm.ShowDialog() | Out-Null
}
