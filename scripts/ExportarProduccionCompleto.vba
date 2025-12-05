Option Explicit

' =====================================================================
' EXPORTACIÓN SEGMENTADA DE ACCESS A CSV - MIGRACIÓN A SQLITE
' =====================================================================
' Exporta tb_PRODUCCION por mes (PRUEBA: solo nov-2024)
' =====================================================================

Const DB_PATH As String = "C:\STC\rptProdTec.accdb"
Const OUT_DIR As String = "C:\analisis-stock-stc\exports"

Public Sub ExportarProduccionCompleto()
    On Error GoTo ErrorHandler
    
    Dim cn As Object
    Dim rs As Object
    Dim fso As Object
    Dim ts As Object
    Dim sql As String
    Dim fileName As String
    Dim filePath As String
    Dim startTime As Double
    Dim exported As Long
    
    startTime = Timer
    exported = 0
    
    ' Crear carpeta si no existe
    Set fso = CreateObject("Scripting.FileSystemObject")
    If Not fso.FolderExists(OUT_DIR) Then fso.CreateFolder OUT_DIR
    
    If Not fso.FileExists(DB_PATH) Then
        MsgBox "ERROR: No se encuentra " & DB_PATH, vbCritical
        Exit Sub
    End If
    
    Application.ScreenUpdating = False
    
    ' Conectar a Access
    Set cn = CreateObject("ADODB.Connection")
    cn.Open "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=" & DB_PATH & ";Persist Security Info=False;"
    
    ' PRUEBA: Solo noviembre 2024
    sql = "SELECT * FROM tb_PRODUCCION WHERE FILIAL = 5 AND DT_BASE_PRODUCAO >= #11/01/2024# AND DT_BASE_PRODUCAO < #12/01/2024#"
    
    Set rs = CreateObject("ADODB.Recordset")
    rs.Open sql, cn, 0, 1
    
    If rs.EOF And rs.BOF Then
        MsgBox "No hay datos en noviembre 2024", vbExclamation
        rs.Close
        cn.Close
        Application.ScreenUpdating = True
        Exit Sub
    End If
    
    fileName = "tb_PRODUCCION_2024_11.csv"
    filePath = OUT_DIR & "\" & fileName
    
    ' Eliminar archivo anterior
    If fso.FileExists(filePath) Then fso.DeleteFile filePath
    
    ' Escribir CSV
    Set ts = fso.CreateTextFile(filePath, True, True)
    
    ' Encabezados
    Dim i As Long
    Dim header As String
    header = ""
    For i = 0 To rs.Fields.Count - 1
        header = header & IIf(i > 0, ",", "") & """" & rs.Fields(i).Name & """"
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
                    
                    If IsNull(v) Then
                        v = ""
                    ElseIf IsDate(v) Then
                        v = Format(v, "yyyy-mm-dd hh:nn:ss")
                    ElseIf IsNumeric(v) And Not IsDate(v) Then
                        ' Convertir numeros: reemplazar coma por punto
                        v = Replace(CStr(v), ",", ".")
                    End If
                    
                    line = line & IIf(c > 0, ",", "") & EscapeCsv(CStr(v))
                Next
                ts.WriteLine line
                exported = exported + 1
                
                If exported Mod 100 = 0 Then
                    Application.StatusBar = "Exportando: " & exported & " registros..."
                    DoEvents
                End If
            Next
        End If
    Loop
    
    ts.Close
    rs.Close
    cn.Close
    
    Dim elapsed As Double: elapsed = Timer - startTime
    
    Application.StatusBar = False
    Application.ScreenUpdating = True
    
    MsgBox "Exportacion completada!" & vbCrLf & vbCrLf & _
           "Total exportado: " & Format(exported, "#,##0") & " registros" & vbCrLf & _
           "Archivo: " & filePath & vbCrLf & _
           "Tiempo: " & Format(elapsed, "0.0") & " segundos", vbInformation
    
    Exit Sub
    
ErrorHandler:
    Application.StatusBar = False
    Application.ScreenUpdating = True
    MsgBox "Error: " & Err.Description, vbCritical
    If Not ts Is Nothing Then ts.Close
    If Not cn Is Nothing Then cn.Close
End Sub

Private Function EscapeCsv(ByVal s As String) As String
    Dim needs As Boolean
    needs = (InStr(1, s, ",") > 0) Or (InStr(1, s, vbLf) > 0) Or (InStr(1, s, vbCr) > 0) Or (InStr(1, s, """") > 0)
    s = Replace(s, """", """""")
    If needs Then s = """" & s & """"
    EscapeCsv = s
End Function



