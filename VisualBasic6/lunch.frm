VERSION 5.00
Object = "{248DD890-BB45-11CF-9ABC-0080C7E7B78D}#1.0#0"; "MSWINSCK.OCX"
Begin VB.Form frmLunchClient 
   BackColor       =   &H00000000&
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Lunch Time!"
   ClientHeight    =   1755
   ClientLeft      =   420
   ClientTop       =   990
   ClientWidth     =   4575
   ForeColor       =   &H00E0E0E0&
   Icon            =   "lunch.frx":0000
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   ScaleHeight     =   1755
   ScaleWidth      =   4575
   Begin VB.Timer Timer 
      Left            =   1920
      Top             =   0
   End
   Begin VB.CommandButton cmdPickRand 
      Caption         =   "New Random"
      Enabled         =   0   'False
      Height          =   255
      Left            =   3120
      TabIndex        =   4
      Top             =   1440
      Width           =   1215
   End
   Begin VB.CommandButton cmdVoteNo 
      Caption         =   "Vote No"
      Enabled         =   0   'False
      Height          =   255
      Left            =   1680
      TabIndex        =   3
      Top             =   1440
      Width           =   1215
   End
   Begin VB.CommandButton cmdVoteYes 
      Caption         =   "Vote Yes"
      Enabled         =   0   'False
      Height          =   255
      Left            =   240
      TabIndex        =   2
      Top             =   1440
      Width           =   1215
   End
   Begin MSWinsockLib.Winsock Winsock2 
      Left            =   4080
      Top             =   480
      _ExtentX        =   741
      _ExtentY        =   741
   End
   Begin MSWinsockLib.Winsock Winsock1 
      Left            =   4080
      Top             =   0
      _ExtentX        =   741
      _ExtentY        =   741
   End
   Begin VB.Image imgRED 
      Height          =   255
      Left            =   3720
      Picture         =   "lunch.frx":030A
      Top             =   120
      Width           =   255
   End
   Begin VB.Image imgGREEN 
      Height          =   255
      Left            =   3720
      Picture         =   "lunch.frx":1527
      Top             =   120
      Width           =   255
   End
   Begin VB.Label Label2 
      BackColor       =   &H00000000&
      Caption         =   "Confirmed:"
      ForeColor       =   &H00E0E0E0&
      Height          =   255
      Left            =   2880
      TabIndex        =   5
      Top             =   120
      Width           =   735
   End
   Begin VB.Label lblRestaurantChoice 
      BackColor       =   &H00000000&
      BorderStyle     =   1  'Fixed Single
      BeginProperty Font 
         Name            =   "Comic Sans MS"
         Size            =   18
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H00FFFFFF&
      Height          =   855
      Left            =   120
      TabIndex        =   1
      Top             =   480
      Width           =   4335
      WordWrap        =   -1  'True
   End
   Begin VB.Label Label1 
      BackColor       =   &H00000000&
      Caption         =   "Lunch is Served:"
      ForeColor       =   &H00E0E0E0&
      Height          =   255
      Left            =   240
      TabIndex        =   0
      Top             =   120
      Width           =   1935
   End
   Begin VB.Menu Start 
      Caption         =   "Start"
      Begin VB.Menu SystemLogin 
         Caption         =   "Login"
      End
      Begin VB.Menu Exit 
         Caption         =   "Logout"
      End
   End
   Begin VB.Menu Administer 
      Caption         =   "Administer"
      Begin VB.Menu Users 
         Caption         =   "User Info"
      End
      Begin VB.Menu Groups 
         Caption         =   "Group Info"
      End
      Begin VB.Menu Restaurants 
         Caption         =   "Restaurants"
      End
      Begin VB.Menu popup 
         Caption         =   "Set Popup"
         Checked         =   -1  'True
      End
      Begin VB.Menu ChatAccept 
         Caption         =   "Accepting Chats"
         Checked         =   -1  'True
      End
      Begin VB.Menu ServerTables 
         Caption         =   "Server"
      End
   End
   Begin VB.Menu spacer 
      Caption         =   "                                                 "
      Enabled         =   0   'False
   End
   Begin VB.Menu About 
      Caption         =   "About"
   End
End
Attribute VB_Name = "frmLunchClient"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Dim success As Boolean
Dim strGetData As String


Private Sub About_Click()
    frmAbout.Show
End Sub

Private Sub ChatAccept_Click()
    ChatAccept.Checked = Not ChatAccept.Checked
End Sub

Private Sub cmdPickRand_Click()
    Dim parms As String
    
    If ServerConnect("GRR " & strUsersGroup, strGetData) Then
        parms = Mid(strGetData, 6)
        Let lblRestaurantChoice.Font.Name = "Comic Sans MS"
        Let lblRestaurantChoice.Font.Size = 18
        lblRestaurantChoice.Caption = parms
    Else
        MsgBox (strGetData)
    End If

End Sub

Private Sub cmdVoteNo_Click()
    
    Dim parms As String

    If ServerConnect("SNV " & strUsersGroup, strGetData) Then
        MsgBox ("Vote was cast")
        cmdVoteYes.Enabled = False
        cmdVoteNo.Enabled = False
    Else
        MsgBox (strGetData)
    End If

End Sub

Private Sub cmdVoteYes_Click()
    
    Dim parms As String

    If ServerConnect("SYV " & strUsersGroup, strGetData) Then
        MsgBox ("Vote was cast")
        cmdVoteYes.Enabled = False
        cmdVoteNo.Enabled = False
    Else
        MsgBox (strGetData)
    End If

End Sub

Private Sub Exit_Click()
    If strLoginName <> "" Then success = ServerConnect("LGO " & strLoginName, strGetData)
    strUserControl = "LGO"
    Unload Me
End Sub

Private Sub Form_Load()
    If frmLunchClient.Winsock2.State <> sckClosed Then frmLunchClient.Winsock2.Close
    frmLunchClient.Winsock2.LocalPort = 0
    frmLunchClient.Winsock2.Listen
 Administer.Enabled = False
 Call StartUp
 If strLoginName <> "" Then
    Call ServerLogin
 End If
 Let HadRequest = False
 LoginNotify = False
End Sub

Private Sub Form_Unload(Cancel As Integer)
Dim iOK As Integer
    If strLocal = True Then
        iOK = MsgBox("Are you sure you want to shut down the server?", vbYesNo)
    Else
        iOK = vbYes
    End If
    
    If iOK = vbYes Then
         If strLoginName <> "" Then success = ServerConnect("LGO " & strLoginName, strGetData)
        
         OuttaHere = True
         Unload frmLunchServer
         Unload frmUser
         Unload frmGroups
         Unload frmRestaurants
         Unload frmLogin
         Unload frmAbout
         Unload Me
         End
    Else
        Cancel = 1
    End If

End Sub

Private Sub Groups_Click()
    frmGroups.Show
End Sub

Private Sub lblRestaurantChoice_DblClick()
    lblRestaurantChoice.Caption = ""
End Sub


Private Sub popup_Click()
    popup.Checked = Not popup.Checked
End Sub

Private Sub Restaurants_Click()
    frmRestaurants.Show
End Sub

Private Sub ServerTables_Click()
    frmLunchServer.Show
End Sub

Private Sub SystemLogin_Click()
 If strLoginName <> "" Then
    ServerLogin
 Else
    strLoginControl = "LGI"
    frmLogin.Show
 End If
End Sub

Private Sub Timer_Timer()
    bTimeOut = True
    Timer.Enabled = False
End Sub

Private Sub Users_Click()
    frmUser.Show
End Sub

Private Sub StartUp()
Dim strInputLine As String
Dim strParam As String
Dim strValue As String
' MsgBox (CurDir("C:"))
'   Open "lunchtime\LUNCH.INI" For Input As #1
'   Open "lunchtime2\LUNCH.INI" For Input As #1
  Open "LUNCH.INI" For Input As #1
  
    Let strLoginName = ""
    
    Do While Not EOF(1) ' Loop until end of file.
        Line Input #1, strInputLine ' Read line into variable.
If Len(strInputLine) > 2 Then
  If InStr(strInputLine, " ") Then
    Let strParam = UCase(Left(strInputLine, InStr(strInputLine, " ") - 1))
    Let strValue = Mid(strInputLine, InStr(strInputLine, " ") + 1)
  Else
    Let strParam = UCase(strInputLine)
  End If
        Select Case UCase(strParam)
        Case Is = "USERNAME:"
            Let strLoginName = strValue
        Case Is = "SERVER:"
            Let strServerSelect = Left(strValue, InStr(strValue, " ") - 1)
            If strServerSelect = "127.0.0.1" Then strLocal = True Else strLocal = False
            If strLocal = True Then
                 strServerSelect = "127.0.0.1"
                 Let lngServerPort = lngServerListen
                 frmLunchClient.Caption = frmLunchClient.Caption & " - Server"
            Else: strLocal = False
                Let lngServerPort = Val(Mid(strValue, InStr(strValue, " ") + 1))
                frmLunchClient.Caption = frmLunchClient.Caption & " - Client"
                frmLunchClient.ServerTables.Visible = False
            End If
        Case Is = "LISTENPORT:"
            lngServerListen = Val(strValue)
            If strLocal = "TRUE" Then Let lngServerPort = lngServerListen
        Case Is = "OFTENMARK:"
            Let sOftenMark = Val(strValue) / 100
        Case Is = "SELDOMMARK:"
            Let sSeldomMark = Val(strValue) / 100
        Case Is = "LOGINNOTIFY"
                LoginNotify = True
        Case Is = "CONFIRMATIONWAIT:"
            Let intConfirmationWait = Val(strValue)
        Case Is = "NOPOPUP"
            popup.Checked = False
        Case Is = "NOCHATACCEPT"
            ChatAccept.Checked = False
        End Select
End If
    Loop
    
 Close #1

'MsgBox ("Done with Login")
If strLocal = True Then Load frmLunchServer

End Sub



Private Sub Winsock1_DataArrival(ByVal bytesTotal As Long)
    Winsock1.GetData strDataRecieved
End Sub



Private Sub Winsock1_Error(ByVal Number As Integer, Description As String, ByVal Scode As Long, ByVal Source As String, ByVal HelpFile As String, ByVal HelpContext As Long, CancelDisplay As Boolean)
    strSocketError = Description
'    MsgBox (Description)
End Sub

Private Sub Winsock2_Close()
'    MsgBox ("client Connection closed")
    Winsock2.Close
    Winsock2.Listen
End Sub

Private Sub Winsock2_ConnectionRequest(ByVal requestID As Long)
    If Winsock2.State <> sckClosed Then Winsock2.Close
    Winsock2.Accept requestID
End Sub

Private Sub Winsock2_DataArrival(ByVal bytesTotal As Long)
    Dim strGetData As String
    Dim DataArray() As String
    Dim count As Integer
    
    Winsock2.GetData strGetData
   
    Select Case Left(strGetData, 3)
    Case Is = "NRC"
        Winsock2.SendData "NRC"
        Dim strchoice As String
        count = GetParams(Mid(strGetData, 5), DataArray(), 2)
        strchoice = DataArray(0)
        If UCase(strchoice) = "TRUE" Then
            imgGREEN.Visible = True
            imgRED.Visible = False
            cmdVoteYes.Enabled = False
            cmdVoteNo.Enabled = False
        Else
            imgGREEN.Visible = False
            imgRED.Visible = True
            cmdVoteYes.Enabled = True
            cmdVoteNo.Enabled = True
        End If
        Let lblRestaurantChoice.Font.Name = "Comic Sans MS"
        Let lblRestaurantChoice.Font.Size = 18
        lblRestaurantChoice = DataArray(1)
        If popup.Checked = True Then
            frmLunchClient.WindowState = vbNormal
            frmLunchClient.SetFocus
        End If
    Case Is = "CFC"
        Winsock2.SendData "ISH"
    Case Is = "MFU"
        Winsock2.SendData "MFU"
        Let lblRestaurantChoice.Font.Name = "system"
        Let lblRestaurantChoice.Font.Size = 5
        lblRestaurantChoice = Mid(strGetData, 5)
        If popup.Checked = True Then
            frmLunchClient.WindowState = vbNormal
            frmLunchClient.SetFocus
        End If
    Case Is = "CWM"
        strGroupChat = ""
        count = GetParams(Mid(strGetData, 5), DataArray())
'        MsgBox (ChatAccept.Checked & vbCrLf & count)
        If ChatAccept.Checked = True And count = 2 Then
            frmChatRequest.Show
            frmChatRequest.SetFocus
            frmChatRequest.lblName = DataArray(0) & " at " & Format(Now, "hh:mm:ss AMPM")
            frmChatRequest.txtName = DataArray(0)
            frmChatRequest.txtIP = Winsock2.RemoteHostIP
            frmChatRequest.txtPort = DataArray(1)
            Winsock2.SendData "GOT"
        Else
            Winsock2.SendData "NTH"
        End If
    Case Is = "CWG"
        count = GetParams(Mid(strGetData, 5), DataArray(), 2)
        If ChatAccept.Checked = True And count = 2 Then
            strGroupChat = "GOT"
            frmChatRequest.Show
            frmChatRequest.SetFocus
            frmChatRequest.lblName = DataArray(1) & " at " & Format(Now, "hh:mm:ss AMPM")
            frmChatRequest.txtName = DataArray(1)
            frmChatRequest.txtIP = Winsock2.RemoteHostIP
            frmChatRequest.txtPort = DataArray(0)
            Winsock2.SendData "GOT"
        Else
            Winsock2.SendData "NTH"
        End If
    Case Is = "BYE"
        Winsock2.SendData "C-Ya"
    End Select
    
End Sub

Private Sub Winsock2_Error(ByVal Number As Integer, Description As String, ByVal Scode As Long, ByVal Source As String, ByVal HelpFile As String, ByVal HelpContext As Long, CancelDisplay As Boolean)
    MsgBox (Description)
    If Winsock2.State <> sckClosed Then Winsock2.Close
End Sub

Private Sub Winsock2_SendComplete()
    Winsock2.Close
    Winsock2.Listen
End Sub


