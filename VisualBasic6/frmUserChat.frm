VERSION 5.00
Object = "{248DD890-BB45-11CF-9ABC-0080C7E7B78D}#1.0#0"; "MSWINSCK.OCX"
Begin VB.Form frmUserChat 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Chat With "
   ClientHeight    =   5280
   ClientLeft      =   4020
   ClientTop       =   2790
   ClientWidth     =   7215
   Icon            =   "frmUserChat.frx":0000
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   5280
   ScaleWidth      =   7215
   ShowInTaskbar   =   0   'False
   WindowState     =   1  'Minimized
   Begin VB.Timer SendTimer 
      Enabled         =   0   'False
      Interval        =   500
      Left            =   4680
      Top             =   2400
   End
   Begin VB.Timer Timer1 
      Enabled         =   0   'False
      Interval        =   10000
      Left            =   3840
      Top             =   2400
   End
   Begin MSWinsockLib.Winsock ChatSock 
      Left            =   3000
      Top             =   2520
      _ExtentX        =   741
      _ExtentY        =   741
   End
   Begin VB.Frame TheirFrame 
      Caption         =   "Them"
      ClipControls    =   0   'False
      Height          =   2535
      Left            =   0
      TabIndex        =   1
      Top             =   2640
      Width           =   7215
      Begin VB.TextBox txtThem 
         Enabled         =   0   'False
         Height          =   2175
         Left            =   120
         MultiLine       =   -1  'True
         ScrollBars      =   2  'Vertical
         TabIndex        =   3
         Top             =   240
         Width           =   6975
      End
   End
   Begin VB.Frame YourFrame 
      Caption         =   "You"
      Height          =   2535
      Left            =   0
      TabIndex        =   0
      Top             =   0
      Width           =   7215
      Begin VB.TextBox txtYou 
         Enabled         =   0   'False
         Height          =   2175
         Left            =   120
         MultiLine       =   -1  'True
         ScrollBars      =   2  'Vertical
         TabIndex        =   2
         Top             =   240
         Width           =   6975
      End
   End
End
Attribute VB_Name = "frmUserChat"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Dim SockControl As Boolean
Dim timeout_g As Boolean
Dim loaded As Boolean
Dim FirstTime As Boolean
Dim Denied As Boolean
Dim ThisSendComplete As Boolean
Dim SendBuffer As String

Const GettingPort = True
Const Chatting = False

Private Sub ChatSock_Close()
    SendTimer.Enabled = False
    If Not Denied Then MsgBox (TheirFrame.Caption & " has left the chat")
    Unload Me
End Sub

Private Sub ChatSock_Connect()
    Unload frmLogin
    ChatSock.SendData "STC"
    Do
        DoEvents
    Loop Until ThisSendComplete
    frmUserChat.WindowState = 0
    txtYou.Enabled = True
    txtThem.Enabled = True
    SendTimer = True
End Sub

Private Sub ChatSock_ConnectionRequest(ByVal requestID As Long)
    If ChatSock.State <> sckClosed Then ChatSock.Close
    ChatSock.Accept requestID
    txtYou.Enabled = True
    txtThem.Enabled = True
    Unload frmLogin
    frmUserChat.WindowState = 0
End Sub

Private Sub ChatSock_DataArrival(ByVal bytesTotal As Long)
    Dim i As Long
    Dim iGetData As Integer
    Dim YeaOrNay As String
    Dim sGetData As String
    Dim sTextBuffer As String
    
    If FirstTime And strChatControl = "GET" Then
        FirstTime = False
        ChatSock.GetData YeaOrNay
        If Left(YeaOrNay, 3) = "NTH" Then
            Timer1.Enabled = False
            Unload frmLogin
            ChatSock.SendData "FUQ"
            Denied = True
            MsgBox ("Chat Was Denied")
            Unload Me
        End If
        SendTimer.Enabled = True
    Else
        FirstTime = False
        ChatSock.GetData sGetData
        sTextBuffer = txtThem.Text
        For i = 1 To Len(sGetData)
            Select Case Asc(Mid(sGetData, i, 1))
            Case Is = 13
                sTextBuffer = sTextBuffer & vbCrLf
            Case Is = 8
                sTextBuffer = Left(sTextBuffer, Len(sTextBuffer) - 1)
            Case Is >= 32
                sTextBuffer = sTextBuffer & Mid(sGetData, i, 1)
            End Select
        Next i
        txtThem.Text = sTextBuffer
        txtThem.SelStart = Len(txtThem.Text)
    End If
    
End Sub

Private Sub ChatSock_Error(ByVal Number As Integer, Description As String, ByVal Scode As Long, ByVal Source As String, ByVal HelpFile As String, ByVal HelpContext As Long, CancelDisplay As Boolean)
    SendTimer.Enabled = False
    MsgBox (Description & vbCrLf & TheirFrame.Caption & " may have cancelled request")
    Unload frmLogin
    Unload Me
End Sub

Private Sub ChatSock_SendComplete()
    ThisSendComplete = True
End Sub

Private Sub Form_Load()
    Dim success As Boolean
    Dim strGetData As String
    frmLunchClient.ChatAccept.Checked = False
    frmLunchClient.ChatAccept.Enabled = False
    Denied = False
    FirstTime = True
    ThisSendComplete = False
    YourFrame.Caption = strLoginName
    
    If strChatControl = "GET" Then
        ChatSock.Listen
        Do
            DoEvents
        Loop Until ChatSock.State = sckListening
        TheirFrame.Caption = frmUser.lstUsers.Text
        frmUserChat.Caption = frmUserChat.Caption & TheirFrame.Caption
        success = ServerConnect("CWM " & strLoginName & " " & CStr(ChatSock.LocalPort), strGetData, frmUser.txtCurrentIP, CLng(frmUser.txtCurrentPort))
        If strGetData = "NTH" Then
            Denied = True
            MsgBox ("Not Accepting Chats Now")
            bChatError = True
        Else
            timeout_g = False
            Timer1.Enabled = True
            ShowStatus (frmUser.lstUsers.Text)
        End If
    ElseIf strChatControl = "GOT" Then
        TheirFrame.Caption = frmChatRequest.txtName.Text
        frmUserChat.Caption = frmUserChat.Caption & TheirFrame.Caption
        ChatSock.RemoteHost = frmChatRequest.txtIP.Text
        ChatSock.RemotePort = CLng(frmChatRequest.txtPort.Text)
        ChatSock.LocalPort = 0
        ChatSock.Connect
        ShowStatus frmChatRequest.txtName.Text
    End If
End Sub

Private Sub Form_Unload(Cancel As Integer)
    Unload frmLogin
    If ChatSock.State <> sckClosed Then ChatSock.Close
    strChatControl = ""
    frmLunchClient.ChatAccept.Checked = True
    frmLunchClient.ChatAccept.Enabled = True
End Sub

Private Sub SendTimer_Timer()
    ChatSock.SendData SendBuffer
    Let SendBuffer = ""
End Sub

Private Sub Timer1_Timer()
    timeout_g = True
    Timer1.Enabled = False
    If ChatSock.State <> sckConnected Then MsgBox ("Timed Out"): Unload Me
End Sub

Private Sub txtThem_KeyDown(KeyCode As Integer, Shift As Integer)
    txtYou.SetFocus
End Sub

Private Sub txtYou_KeyPress(KeyAscii As Integer)
    If (KeyAscii >= 32) Or (KeyAscii = 8) Or (KeyAscii = 13) Then SendBuffer = SendBuffer & Chr(KeyAscii)
End Sub

Private Sub ShowStatus(ThisName As String)
    frmLogin.Caption = "Chat Request"
    frmLogin.Label1 = "Connecting to " & ThisName & "..."
    frmLogin.txtLogin.Visible = False
    frmLogin.Show
    frmLogin.SetFocus
End Sub
