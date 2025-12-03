Option Explicit

' =====================================================================
' EXPORTACIÓN SEGMENTADA DE ACCESS A CSV - MIGRACIÓN A SQLITE
' =====================================================================
' Exporta tablas grandes por mes/año y tablas pequeñas completas
' Columnas fecha identificadas:
'   tb_PRODUCCION: DT_BASE_PRODUCAO
'   tb_CALIDAD: DAT_PROD
'   tb_PARADAS: DATA_BASE
'   tb_RESIDUOS_POR_SECTOR: DT_MOV
'   tb_TESTES: DT_PROD
'   tb_RESIDUOS_INDIGO: DT_MOV
'   tb_FICHAS: Sin fecha (exportación completa)
' =====================================================================

Const DB_PATH As String = "C:\STC\rptProdTec.accdb"
Const OUT_DIR As String = "C:\analisis-stock-stc\exports"

Private Type TableConfig
    Name As String
    DateField As String
    Strategy As String ' "monthly", "complete"
End Type

Private stopRequested As Boolean

Public Sub ExportarAccessSegmentado()
    On Error GoTo ErrorHandler
    stopRequested = False
    
    Dim configs() As TableConfig
    configs = GetTableConfigs()
    
    CreateFolderIfNotExists OUT_DIR
    
    Dim cn As Object, startTime As Double
    Set cn = CreateObject("ADODB.Connection")
    cn.Open "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=" & DB_PATH & ";Persist Security Info=False;"
    
    Dim logPath As String: logPath = OUT_DIR & "\log_exportacion.txt"
    Dim fso As Object: Set fso = CreateObject("Scripting.FileSystemObject")
    Dim log As Object: Set log = fso.CreateTextFile(logPath, True, True)
    
    log.WriteLine "=== INICIO EXPORTACIÓN: " & Now() & " ==="
    log.WriteLine ""
    
    Application.ScreenUpdating = False
    startTime = Timer
    
    Dim i As Long, total As Long
    total = UBound(configs) + 1
    
    For i = 0 To UBound(configs)
        If stopRequested Then
            log.WriteLine "❌ Exportación detenida por usuario."
            MsgBox "Exportación detenida.", vbExclamation
            Exit For
        End If
        
        Application.StatusBar = "Exportando " & configs(i).Name & " (" & (i + 1) & " de " & total & ")..."
        
        If configs(i).Strategy = "monthly" Then
            ExportByMonth cn, configs(i), log
        Else
            ExportComplete cn, configs(i), log
        End If
    Next i
    
    Dim elapsed As Double: elapsed = Timer - startTime
    log.WriteLine ""
    log.WriteLine "=== FIN EXPORTACIÓN: " & Now() & " ==="
    log.WriteLine "Tiempo total: " & Format(elapsed \ 60, "0") & " min " & Format(elapsed Mod 60, "0") & " seg"
    
    log.Close
    cn.Close
    Set cn = Nothing
    
    Application.StatusBar = False
    Application.ScreenUpdating = True
    
    MsgBox "✅ Exportación completada en " & Format(elapsed \ 60, "0") & " min." & vbCrLf & _
           "📁 Archivos en: " & OUT_DIR & vbCrLf & _
           "📝 Log: " & logPath, vbInformation
    
    Exit Sub
    
ErrorHandler:
    Application.StatusBar = False
    Application.ScreenUpdating = True
    MsgBox "❌ Error: " & Err.Description, vbCritical
    If Not log Is Nothing Then log.Close
    If Not cn Is Nothing Then cn.Close
End Sub

Private Function GetTableConfigs() As TableConfig()
    Dim configs(6) As TableConfig
    
    ' Tablas grandes: exportar por mes
    configs(0).Name = "tb_PRODUCCION"
    configs(0).DateField = "DT_BASE_PRODUCAO"
    configs(0).Strategy = "monthly"
    
    configs(1).Name = "tb_CALIDAD"
    configs(1).DateField = "DAT_PROD"
    configs(1).Strategy = "monthly"
    
    configs(2).Name = "tb_PARADAS"
    configs(2).DateField = "DATA_BASE"
    configs(2).Strategy = "monthly"
    
    ' Tablas medianas: exportación completa
    configs(3).Name = "tb_RESIDUOS_POR_SECTOR"
    configs(3).DateField = "DT_MOV"
    configs(3).Strategy = "complete"
    
    configs(4).Name = "tb_TESTES"
    configs(4).DateField = "DT_PROD"
    configs(4).Strategy = "complete"
    
    configs(5).Name = "tb_RESIDUOS_INDIGO"
    configs(5).DateField = "DT_MOV"
    configs(5).Strategy = "complete"
    
    configs(6).Name = "tb_FICHAS"
    configs(6).DateField = ""
    configs(6).Strategy = "complete"
    
    GetTableConfigs = configs
End Function

Private Sub ExportByMonth(ByVal cn As Object, ByRef cfg As TableConfig, ByVal log As Object)
    On Error GoTo ErrorHandler
    
    log.WriteLine "📊 " & cfg.Name & " (segmentado por mes):"
    
    ' Obtener rango de fechas
    Dim rs As Object, minDate As Date, maxDate As Date
    Set rs = cn.Execute("SELECT MIN([" & cfg.DateField & "]) AS MinDate, MAX([" & cfg.DateField & "]) AS MaxDate FROM [" & cfg.Name & "]")
    
    If rs.EOF Or IsNull(rs.Fields("MinDate").Value) Then
        log.WriteLine "  ⚠️  Tabla vacía, omitiendo."
        rs.Close: Exit Sub
    End If
    
    minDate = rs.Fields("MinDate").Value
    maxDate = rs.Fields("MaxDate").Value
    rs.Close
    
    log.WriteLine "  Rango: " & Format(minDate, "yyyy-mm-dd") & " a " & Format(maxDate, "yyyy-mm-dd")
    
    ' Exportar por mes
    Dim currentDate As Date, nextDate As Date
    Dim yearVal As Integer, monthVal As Integer
    Dim exported As Long: exported = 0
    
    currentDate = DateSerial(Year(minDate), Month(minDate), 1)
    
    Do While currentDate <= maxDate
        If stopRequested Then Exit Sub
        
        yearVal = Year(currentDate)
        monthVal = Month(currentDate)
        nextDate = DateAdd("m", 1, currentDate)
        
        Dim sql As String
        sql = "SELECT * FROM [" & cfg.Name & "] WHERE [" & cfg.DateField & "] >= #" & _
              Format(currentDate, "mm/dd/yyyy") & "# AND [" & cfg.DateField & "] < #" & _
              Format(nextDate, "mm/dd/yyyy") & "#"
        
        Set rs = CreateObject("ADODB.Recordset")
        rs.Open sql, cn, 0, 1
        
        If Not (rs.EOF And rs.BOF) Then
            Dim fileName As String
            fileName = cfg.Name & "_" & Format(yearVal, "0000") & "_" & Format(monthVal, "00") & ".csv"
            Dim filePath As String: filePath = OUT_DIR & "\" & fileName
            
            WriteRecordsetToCsv rs, filePath
            
            Dim count As Long: count = rs.RecordCount
            If count = 0 Then
                ' Fallback: contar manualmente si RecordCount no está disponible
                rs.MoveFirst
                Do While Not rs.EOF
                    count = count + 1
                    rs.MoveNext
                Loop
            End If
            
            exported = exported + count
            log.WriteLine "    " & Format(currentDate, "yyyy-mm") & ": " & count & " filas → " & fileName
        End If
        
        rs.Close
        currentDate = nextDate
        DoEvents ' Permitir detención con Esc
    Loop
    
    log.WriteLine "  ✓ Total exportado: " & exported & " filas"
    Exit Sub
    
ErrorHandler:
    log.WriteLine "  ❌ Error en " & cfg.Name & ": " & Err.Description
End Sub

Private Sub ExportComplete(ByVal cn As Object, ByRef cfg As TableConfig, ByVal log As Object)
    On Error GoTo ErrorHandler
    
    log.WriteLine "📊 " & cfg.Name & " (completo):"
    
    Dim rs As Object
    Set rs = CreateObject("ADODB.Recordset")
    rs.Open "SELECT * FROM [" & cfg.Name & "]", cn, 0, 1
    
    If rs.EOF And rs.BOF Then
        log.WriteLine "  ⚠️  Tabla vacía, omitiendo."
        rs.Close: Exit Sub
    End If
    
    Dim fileName As String: fileName = cfg.Name & ".csv"
    Dim filePath As String: filePath = OUT_DIR & "\" & fileName
    
    WriteRecordsetToCsv rs, filePath
    
    ' Contar filas
    Dim count As Long
    Dim sql As String: sql = "SELECT COUNT(*) AS C FROM [" & cfg.Name & "]"
    Dim rsCount As Object: Set rsCount = cn.Execute(sql)
    If Not (rsCount.EOF And rsCount.BOF) Then count = rsCount.Fields("C").Value
    rsCount.Close
    
    log.WriteLine "  ✓ " & count & " filas → " & fileName
    
    rs.Close
    Exit Sub
    
ErrorHandler:
    log.WriteLine "  ❌ Error en " & cfg.Name & ": " & Err.Description
End Sub

Private Sub WriteRecordsetToCsv(ByVal rs As Object, ByVal filePath As String)
    Dim fso As Object, ts As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    Set ts = fso.CreateTextFile(filePath, True, True) ' UTF-8 con BOM
    
    ' Encabezados
    Dim i As Long, header As String
    For i = 0 To rs.Fields.Count - 1
        header = header & IIf(i > 0, ",", "") & EscapeCsv(rs.Fields(i).Name)
    Next
    ts.WriteLine header
    
    ' Filas usando GetRows (rápido para grandes volúmenes)
    Dim arr, r As Long, c As Long, cols As Long, rows As Long
    
    Do While Not rs.EOF
        ' Leer en bloques de 10000 para no saturar memoria
        arr = rs.GetRows(10000)
        
        If IsArray(arr) Then
            cols = UBound(arr, 1) + 1
            rows = UBound(arr, 2) + 1
            
            For r = 0 To rows - 1
                Dim line As String: line = ""
                For c = 0 To cols - 1
                    Dim v: v = arr(c, r)
                    If IsNull(v) Then v = ""
                    If IsDate(v) Then v = Format(v, "yyyy-mm-dd hh:nn:ss")
                    line = line & IIf(c > 0, ",", "") & EscapeCsv(CStr(v))
                Next
                ts.WriteLine line
            Next
        End If
        
        DoEvents ' Permitir interrupciones
    Loop
    
    ts.Close
End Sub

Private Function EscapeCsv(ByVal s As String) As String
    Dim needs As Boolean
    needs = (InStr(1, s, ",") > 0) Or (InStr(1, s, vbLf) > 0) Or (InStr(1, s, vbCr) > 0) Or (InStr(1, s, """") > 0)
    s = Replace(s, """", """""")
    If needs Then s = """" & s & """"
    EscapeCsv = s
End Function

Private Sub CreateFolderIfNotExists(ByVal path As String)
    Dim fso As Object: Set fso = CreateObject("Scripting.FileSystemObject")
    If Not fso.FolderExists(path) Then fso.CreateFolder path
End Sub

' Para detener la exportación con Esc
Public Sub DetenerExportacion()
    stopRequested = True
End Sub
