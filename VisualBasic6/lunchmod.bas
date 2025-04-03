Attribute VB_Name = "ClientModule"
Public strServerSelect As String
Public lngServerPort As Long
Public lngMyListeningPort As Long
Public strLocal As Boolean
Public strLoginName As String
Public strUsersGroup As String
Public OuttaHere As Boolean
Public strLoginControl As String
Public strGroupControl As String
Public strUserControl As String
Public strRestaurantControl As String
Public strChatControl
Public sOftenMark As Single
Public sSeldomMark As Single
Public lngServerListen As Long
Public intConfirmationWait As Integer
Public bServerConnectLock As Boolean
Public strDataRecieved As String
Public bTimeOut As Boolean
Public strSocketError As String
Public LoginNotify As Boolean
Public strTheirName As String
Public HadRequest As Boolean
Public bChatError As Boolean
Public strGroupChat As String

Global Const vbConnected = 1
Global Const vbNotConnected = 2
Global Const vbConnecting = 0
Global Const vbWaitForRecieve = 3000



Public Function ParseData(ByVal strReceivedData As String, strOutputArray() As String)

    Dim length As Long
    Dim strDisplay As String
    Dim strWorkThrough As String
    Dim intCount As Integer
    Dim intColumns As Integer
    Dim intRows As Integer
    Dim intRowCount As Integer
    Dim intColCount As Integer
    
'    MsgBox (strReceivedData)
    
    intRows = StrCount(strReceivedData, vbCrLf)
    intColumns = StrCount(strReceivedData, vbTab)

'    MsgBox ("Rows = " & intRows & vbCrLf & "Columns = " & intColumns)
    If intRows > 0 Then intColumns = intColumns / intRows Else MsgBox ("Error: " & strReceivedData)
      
      ReDim strOutputArray(intRows, intColumns)

'   intThisPosition = InStr(strReceivedData, vbTab)
   For intRowCount = 0 To (intRows - 1)
        For intColCount = 0 To (intColumns - 1)
            intThisPosition = InStr(strReceivedData, vbTab)
            strDisplay = Left(strReceivedData, intThisPosition - 1)
            strReceivedData = Mid(strReceivedData, intThisPosition + 1)
 '           intThisPosition = InStr(strReceivedData, vbTab)
 '           MsgBox ("strDisplay = " & strDisplay & vbCrLf & _
                   "strReceivedData = " & strReceivedData & vbCrLf & _
                   "intThisPosition = " & intThisPosition)
             strOutputArray(intRowCount, intColCount) = strDisplay
        Next intColCount
        strReceivedData = Mid(strReceivedData, 3)
   Next intRowCount

End Function

Public Function StrCount(ByVal strCountThis As String, strToken As String)

    Dim intThisCount As Integer
    Dim intThisPosition As Long
    
    Let intThisCount = 0
    intThisPosition = InStr(strCountThis, strToken)
    
    Do While intThisPosition > 0
        Let intThisCount = intThisCount + 1
        strCountThis = Mid(strCountThis, intThisPosition + 1)
        intThisPosition = InStr(strCountThis, strToken)
    Loop
    
    Let StrCount = intThisCount

End Function

Public Sub ServerLogin()
    Dim strGetData As String
    Dim strValueArray() As String
    Dim parms As String
    
    If ServerConnect("LGI " & strLoginName & " " & frmLunchClient.Winsock2.LocalIP & " " & frmLunchClient.Winsock2.LocalPort, strGetData) Then
      Let parms = Mid(strGetData, 6)
      If Left(parms, 3) <> "ERR" Then
        If UCase(Left(strLoginName, 4)) = "ADD " Then strLoginName = Mid(strLoginName, 5)
        If InStr(frmLunchClient.Caption, ":") = 0 Then frmLunchClient.Caption = frmLunchClient.Caption & ":" & strLoginName
        ParseData parms, strValueArray()
        strUsersGroup = strValueArray(1, 0)
        If DateDiff("s", CDate(strValueArray(1, 2)), CDate(Format(Now, "hh:mm:ss AMPM"))) > 0 Then
          If UCase(strValueArray(1, 1)) = "TRUE" Then
            frmLunchClient.imgGREEN.Visible = True
            frmLunchClient.imgRED.Visible = False
            frmLunchClient.lblRestaurantChoice = strValueArray(1, 3)
          Else
            frmLunchClient.imgGREEN.Visible = False
            frmLunchClient.imgRED.Visible = True
            frmLunchClient.lblRestaurantChoice = strValueArray(1, 3)
          End If
        End If
        If LoginNotify = True Then MsgBox ("Logged In!!!")
        frmLunchClient.Administer.Enabled = True
        frmLunchClient.cmdPickRand.Enabled = True
        frmLunchClient.cmdVoteYes.Enabled = True
        frmLunchClient.cmdVoteNo.Enabled = True
      Else
        MsgBox ("You were not logged in to the Lunch Server." + vbCrLf + parms)
        strLoginName = ""
      End If
    Else
        MsgBox ("You were not logged in to the Lunch Server." + vbCrLf + strGetData)
        strLoginName = ""
    End If

End Sub


Public Function ServerConnect(strSendData As String, strGetData As String, Optional strServer, Optional lPort) As Boolean
  'Is this procedure being run already?  (for doEvents() protection - and socket errors)
  If bServerConnectLock = False Then
    Dim temp As Integer
    
    'Lock this procedure so that it can't be run while we're using it
    Let bServerConnectLock = True
    
    'set up the Socket for the connection to Server
    If IsMissing(strServer) Then
        frmLunchClient.Winsock1.RemoteHost = strServerSelect
        frmLunchClient.Winsock1.RemotePort = lngServerPort
    Else
        frmLunchClient.Winsock1.RemoteHost = strServer
        frmLunchClient.Winsock1.RemotePort = lPort
    End If
    
    'IMPORTANT STEP!  As I came to find, you have to continually set this to zero
    'so you know that it will pick a random port everytime.
    frmLunchClient.Winsock1.LocalPort = 0
    frmLunchClient.Winsock1.Connect
    
    'Wait for connect or error
    Do
        temp = DoEvents()
    Loop Until (frmLunchClient.Winsock1.State = sckConnected) Or (frmLunchClient.Winsock1.State = sckError)
    
    'Check to see if it connected or failed
    If frmLunchClient.Winsock1.State = sckConnected Then
    
        'It connected, now send the data
        frmLunchClient.Winsock1.SendData strSendData
        
        'set up the compare variables and start the timer
        Let strDataRecieved = ""
        bTimeOut = False
        frmLunchClient.Timer.Interval = vbWaitForRecieve
        frmLunchClient.Timer.Enabled = True
        'Wait for data to come in
        Do
            temp = DoEvents()
        Loop Until (strDataRecieved <> "") Or bTimeOut
        
        frmLunchClient.Timer.Enabled = False
        
        'check to see if any data was recieved, or if we timed out.
        If strDataRecieved <> "" Then

            'Data was recieved - set strDataRecieved and Exit function
            Let strGetData = strDataRecieved
            ServerConnect = True
        
        Else
            
            'Waited too long for recieve...
            strGetData = strSocketError
            ServerConnect = False
        
        End If
    
    Else
        
        'Error trying to connect
        strGetData = strSocketError
        ServerConnect = False
    
    End If
    
    frmLunchClient.Winsock1.Close
    bServerConnectLock = False
    
  Else
    
    'error... trying to connect while already running
    strGetData = "SLOWDOWN!"
    ServerConnect = False
    
  End If


End Function

Public Function GetParams(ByVal strReceivedData As String, strOutputArray() As String, Optional Max As Integer = 0) As Integer
Dim i As Integer
Let i = 0

    Do While InStr(strReceivedData, " ") > 0 And Max <> 1
      ReDim Preserve strOutputArray(i)
      strOutputArray(i) = Left(strReceivedData, InStr(strReceivedData, " ") - 1)
      strReceivedData = Mid(strReceivedData, InStr(strReceivedData, " ") + 1)
      i = i + 1
      If Max > 1 And i = Max - 1 Then Exit Do
    Loop
       
    If i = 0 Then ReDim strOutputArray(0) Else ReDim Preserve strOutputArray(i)
    strOutputArray(i) = strReceivedData
    GetParams = i + 1
    
End Function
