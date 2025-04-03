VERSION 5.00
Object = "{248DD890-BB45-11CF-9ABC-0080C7E7B78D}#1.0#0"; "MSWINSCK.OCX"
Begin VB.Form frmGroupChat 
   Caption         =   "Group Chat"
   ClientHeight    =   7500
   ClientLeft      =   60
   ClientTop       =   345
   ClientWidth     =   9300
   Icon            =   "frmGroupChat.frx":0000
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   ScaleHeight     =   7500
   ScaleWidth      =   9300
   StartUpPosition =   3  'Windows Default
   Begin VB.Frame frmCurrent 
      Caption         =   "Current Chatters"
      Height          =   2775
      Left            =   7800
      TabIndex        =   7
      Top             =   120
      Width           =   1455
      Begin VB.ListBox lstCurrent 
         Height          =   2400
         Left            =   120
         TabIndex        =   8
         Top             =   240
         Width           =   1215
      End
   End
   Begin VB.Frame frmAdd 
      Caption         =   "Add Person"
      Height          =   3375
      Left            =   7800
      TabIndex        =   3
      Top             =   3000
      Width           =   1455
      Begin VB.ListBox lstUsers 
         Height          =   2595
         Left            =   120
         TabIndex        =   6
         Top             =   240
         Width           =   1215
      End
      Begin VB.OptionButton optGroup 
         Caption         =   "Group"
         Height          =   195
         Left            =   240
         TabIndex        =   5
         Top             =   2880
         Value           =   -1  'True
         Width           =   975
      End
      Begin VB.OptionButton optAll 
         Caption         =   "All"
         Height          =   195
         Left            =   240
         TabIndex        =   4
         Top             =   3120
         Width           =   1095
      End
   End
   Begin MSWinsockLib.Winsock sckGChat 
      Left            =   6120
      Top             =   6360
      _ExtentX        =   741
      _ExtentY        =   741
   End
   Begin VB.Frame Frame1 
      Caption         =   "Enter Text to Send, and hit Return"
      Height          =   975
      Left            =   0
      TabIndex        =   2
      Top             =   6480
      Width           =   9255
      Begin VB.TextBox txtMyText 
         Height          =   615
         Left            =   120
         MultiLine       =   -1  'True
         TabIndex        =   0
         Top             =   240
         Width           =   9015
      End
   End
   Begin VB.TextBox txtGroupText 
      Height          =   6255
      Left            =   120
      MultiLine       =   -1  'True
      ScrollBars      =   2  'Vertical
      TabIndex        =   1
      Top             =   120
      Width           =   7575
   End
   Begin VB.Menu RequestChat 
      Caption         =   "RequestChat"
      Visible         =   0   'False
      Begin VB.Menu AddToThisChat 
         Caption         =   "Add To This Chat"
      End
   End
End
Attribute VB_Name = "frmGroupChat"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
    Dim strControlCase As String
    Dim strValueArray() As String
    Dim intNameCol As Integer
    Dim intIPCol As Integer
    Dim intGroupCol As Integer
    Dim intPortCol As Integer
    Dim strIP2Send2() As String

Private Sub AddToThisChat_Click()
    Dim strGetData As String
    If Not ServerConnect("CWG " & CStr(sckGChat.LocalPort) & " " & strUsersGroup, strGetData, strValueArray(lstUsers.ListIndex + 1, intIPCol), CLng(strValueArray(lstUsers.ListIndex + 1, intPortCol))) Then
        MsgBox ("couldn't connect to " & strValueArray(lstUsers.ListIndex + 1, intIPCol))
    End If
End Sub

Private Sub Form_Load()
    
    Dim strGetData As String
    frmLunchClient.ChatAccept.Checked = False
    frmLunchClient.ChatAccept.Enabled = False
    PopulateForm "SQL select username,groupid,ipaddress,port from users where loggedon = TRUE and groupid = '" & strUsersGroup & "'"
    sckGChat.Listen
    lstCurrent.AddItem strLoginName
    ReDim Preserve strIP2Send2(0)
    strIP2Send2(0) = sckGChat.LocalIP & " " & sckGChat.LocalPort

'    MsgBox (sckGChat.LocalPort)
    If strGroupChat = "GOT" Then
        If Not ServerConnect("ACC " & strLoginName & " " & sckGChat.LocalIP & " " & sckGChat.LocalPort, strGetData, frmChatRequest.txtIP.Text, CLng(frmChatRequest.txtPort.Text)) Then
            MsgBox ("Could Not Connect to Group Chat")
            bChatError = True
        Else
            lstCurrent.AddItem strGetData, lstCurrent.ListCount
            ReDim Preserve strIP2Send2(UBound(strIP2Send2) + 1)
            strIP2Send2(lstCurrent.ListCount - 1) = frmChatRequest.txtIP.Text & " " & frmChatRequest.txtPort.Text
        End If
    End If
End Sub

Private Sub Form_Unload(Cancel As Integer)
    SendOutData "KLM " & strLoginName & " " & sckGChat.LocalIP & " " & sckGChat.LocalPort, "", True
    strGroupChat = ""
    If sckGChat.State <> sckClosed Then sckGChat.Close
    frmLunchClient.ChatAccept.Checked = True
    frmLunchClient.ChatAccept.Enabled = True
End Sub

Private Sub lstCurrent_Click()
    MsgBox (strIP2Send2(lstCurrent.ListIndex))
End Sub

Private Sub lstUsers_MouseDown(Button As Integer, Shift As Integer, X As Single, Y As Single)
    If Button = 2 Then
        If UCase(lstUsers.Text) = UCase(strLoginName) Then AddToThisChat.Enabled = False Else AddToThisChat.Enabled = True
        frmGroupChat.PopupMenu RequestChat
    End If
End Sub

Private Sub optAll_Click()
    PopulateForm "SQL select username,groupid,ipaddress,port from users where loggedon = TRUE"
End Sub

Private Sub optGroup_Click()
    PopulateForm "SQL select username,groupid,ipaddress,port from users where loggedon = TRUE and groupid = '" & strUsersGroup & "'"
End Sub

Private Sub sckGChat_Close()
    sckGChat.Close
    sckGChat.Listen
End Sub

Private Sub sckGChat_ConnectionRequest(ByVal requestID As Long)
    If sckGChat.State <> sckClosed Then sckGChat.Close
    sckGChat.Accept requestID
End Sub

Private Sub sckGChat_DataArrival(ByVal bytesTotal As Long)
    Dim strOutput() As String
    Dim strIPFrom As String
    Dim strGetData As String
    
    sckGChat.GetData strGetData
    strIPFrom = sckGChat.RemoteHostIP
    
    Select Case Left(strGetData, 3)
    Case Is = "NTH"
        sckGChat.SendData "FUQ"
    Case Is = "MSG"
        sckGChat.SendData "GOT"
        txtGroupText = txtGroupText & vbCrLf & Mid(strGetData, 5)
        txtGroupText.SelStart = Len(txtGroupText.Text)
    Case Is = "ACC"
        sckGChat.SendData strLoginName
        
        GetParams Mid(strGetData, 5), strOutput()
        lstCurrent.AddItem strOutput(0), lstCurrent.ListCount
        ReDim Preserve strIP2Send2(UBound(strIP2Send2) + 1)
        strIP2Send2(lstCurrent.ListCount - 1) = strOutput(1) & " " & strOutput(2)
        
        Do
            DoEvents
        Loop Until sckGChat.State = sckListening
        
        SendOutData "CTP " & Mid(strGetData, 5), strIPFrom, True
    
    Case Is = "CTP"
        sckGChat.SendData "GOT"
        
        GetParams Mid(strGetData, 5), strOutput()
        
      '  MsgBox (strOutput(1) & vbCrLf & strOutput(2))
'        If ServerConnect("ADM " & strLoginName & " " & sckGChat.LocalIP & " " & sckGChat.LocalPort, strGetData, strOutput(1), CLng(strOutput(2))) Then
'            lstCurrent.AddItem strOutput(0), lstCurrent.ListCount
'            ReDim Preserve strIP2Send2(UBound(strIP2Send2) + 1)
'            strIP2Send2(lstCurrent.ListCount - 1) = strOutput(1) & " " & strOutput(2)
'        Else
'            MsgBox ("couldn't connect to " & strOutput(1) & ":" & strOutput(2))
'        End If
        Do While Not ServerConnect("ADM " & strLoginName & " " & sckGChat.LocalIP & " " & sckGChat.LocalPort, strGetData, strOutput(1), CLng(strOutput(2)))
        Loop
            
        lstCurrent.AddItem strOutput(0), lstCurrent.ListCount
        ReDim Preserve strIP2Send2(UBound(strIP2Send2) + 1)
        strIP2Send2(lstCurrent.ListCount - 1) = strOutput(1) & " " & strOutput(2)
            
    Case Is = "ADM"
        sckGChat.SendData "GOT"
        GetParams Mid(strGetData, 5), strOutput()
        lstCurrent.AddItem strOutput(0), lstCurrent.ListCount
        ReDim Preserve strIP2Send2(UBound(strIP2Send2) + 1)
        strIP2Send2(lstCurrent.ListCount - 1) = strOutput(1) & " " & strOutput(2)
    Case Is = "KLM"
        Dim intlistcount As Integer
        Dim bCopy As Boolean
        bCopy = False
        
        sckGChat.SendData "GOT"
        GetParams Mid(strGetData, 5), strOutput()
        For intlistcount = 0 To lstCurrent.ListCount - 1
            If bCopy Then
                strIP2Send2(intlistcount - 1) = strIP2Send2(intlistcount)
            End If
            If lstCurrent.List(intlistcount) = strOutput(0) Then
                lstCurrent.RemoveItem (intlistcount)
                bCopy = True
            End If
        Next intlistcount
        
        ReDim Preserve strIP2Send2(intlistcount - 2)
        
    End Select
    
    strIPFrom = ""
End Sub

Private Sub sckGChat_SendComplete()
    sckGChat.Close
    sckGChat.Listen
End Sub

Private Sub txtGroupText_KeyDown(KeyCode As Integer, Shift As Integer)
    txtMyText.SetFocus
End Sub

Private Sub txtMyText_KeyDown(KeyCode As Integer, Shift As Integer)
    If KeyCode = 13 Then
        SendOutData "MSG <" & strLoginName & "> " & txtMyText.Text, "", False
        txtMyText.Text = ""
    End If
End Sub

Private Sub PopulateForm(strControlCase As String)
    Dim strGetData As String
    
    If ServerConnect(strControlCase, strGetData) Then
        strGetData = Mid(strGetData, 5)
        ParseData strGetData, strValueArray()

        lstUsers.Clear
        For intCount = 0 To (UBound(strValueArray, 2))
        Select Case UCase(strValueArray(0, intCount))
            Case Is = "USERNAME"
                Let intNameCol = intCount
            Case Is = "GROUPID"
                Let intGroupCol = intCount
            Case Is = "IPADDRESS"
                Let intIPCol = intCount
            Case Is = "PORT"
                Let intPortCol = intCount
            End Select
        Next intCount
        For intCount = 1 To (UBound(strValueArray) - 1)
            lstUsers.AddItem strValueArray(intCount, intNameCol)
        Next intCount
    Else
        MsgBox (strGetData)
    End If
End Sub

Private Function SendOutData(Data2Send As String, strIPFrom As String, IgnoreSelf As Boolean) As Boolean
    Dim i As Integer
    Dim strGetData As String
    Dim strConnect() As String

    For i = 0 To UBound(strIP2Send2)
        GetParams strIP2Send2(i), strConnect()
'        MsgBox ("|" & strConnect(0) & ":" & strConnect(1) & "|")
'        If (strConnect(0) <> strIPFrom) And (strConnect(0) <> sckGChat.LocalIP) Then
        If Not ((strConnect(0) = strIPFrom) Or (IgnoreSelf And strConnect(0) = sckGChat.LocalIP)) Then
'            MsgBox (Data2Send & vbCrLf & strConnect(0) & vbCrLf & strConnect(1))
            If Not ServerConnect(Data2Send, strGetData, strConnect(0), CLng(strConnect(1))) Then
                MsgBox ("cant make connection with " & strConnect(0) & ":" & strConnect(1))
            End If
        End If
    Next i
    
    SendOutData = True
    
End Function

