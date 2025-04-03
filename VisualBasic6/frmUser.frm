VERSION 5.00
Begin VB.Form frmUser 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Lunch User Information"
   ClientHeight    =   3270
   ClientLeft      =   4590
   ClientTop       =   2595
   ClientWidth     =   4785
   Icon            =   "frmUser.frx":0000
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3270
   ScaleWidth      =   4785
   ShowInTaskbar   =   0   'False
   Begin VB.OptionButton optAll 
      Caption         =   "All Users"
      Height          =   195
      Left            =   120
      TabIndex        =   11
      Top             =   3000
      Width           =   1455
   End
   Begin VB.OptionButton optCurrent 
      Caption         =   "Currently Logged On"
      Height          =   195
      Left            =   120
      TabIndex        =   10
      Top             =   2640
      Value           =   -1  'True
      Width           =   1935
   End
   Begin VB.TextBox txtCurrentPort 
      Enabled         =   0   'False
      Height          =   285
      Left            =   3000
      TabIndex        =   9
      Top             =   1920
      Width           =   855
   End
   Begin VB.TextBox txtCurrentIP 
      Enabled         =   0   'False
      Height          =   285
      Left            =   3000
      TabIndex        =   5
      Top             =   1440
      Width           =   1575
   End
   Begin VB.TextBox txtGroupID 
      Enabled         =   0   'False
      Height          =   285
      Left            =   3000
      TabIndex        =   4
      Top             =   960
      Width           =   1575
   End
   Begin VB.TextBox txtUserName 
      Enabled         =   0   'False
      Height          =   285
      Left            =   2280
      TabIndex        =   2
      Top             =   360
      Width           =   1575
   End
   Begin VB.ListBox lstUsers 
      Height          =   2010
      Left            =   120
      TabIndex        =   0
      Top             =   480
      Width           =   1455
   End
   Begin VB.Label Label5 
      Caption         =   "Port:"
      Height          =   255
      Left            =   2400
      TabIndex        =   8
      Top             =   1920
      Width           =   375
   End
   Begin VB.Label Label4 
      Caption         =   "Current/Last IP:"
      Height          =   255
      Left            =   1680
      TabIndex        =   7
      Top             =   1440
      Width           =   1215
   End
   Begin VB.Label Label3 
      Caption         =   "Group ID:"
      Height          =   255
      Left            =   2040
      TabIndex        =   6
      Top             =   960
      Width           =   735
   End
   Begin VB.Label Label2 
      Caption         =   "Your Current Username is:"
      Height          =   255
      Left            =   2160
      TabIndex        =   3
      Top             =   120
      Width           =   2175
   End
   Begin VB.Label Label1 
      Alignment       =   2  'Center
      Caption         =   "Users :"
      Height          =   255
      Left            =   120
      TabIndex        =   1
      Top             =   120
      Width           =   855
      WordWrap        =   -1  'True
   End
   Begin VB.Menu UserMenu 
      Caption         =   "UserMenu"
      Visible         =   0   'False
      Begin VB.Menu Title 
         Caption         =   ""
      End
      Begin VB.Menu seperator 
         Caption         =   "-"
      End
      Begin VB.Menu SendMessage 
         Caption         =   "Send Message"
      End
      Begin VB.Menu UserChat 
         Caption         =   "Chat with"
      End
   End
End
Attribute VB_Name = "frmUser"
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
    Dim strGetData As String

Private Sub Form_Load()
    PopulateForm ("GUL")
    If strLocal = False Then txtCurrentPort.Visible = False: Label5.Visible = False
    txtUserName.Text = strLoginName
End Sub

Private Sub lstUsers_Click()
    txtGroupID.Text = strValueArray(lstUsers.ListIndex + 1, intGroupCol)
    txtCurrentIP.Text = strValueArray(lstUsers.ListIndex + 1, intIPCol)
    txtCurrentPort.Text = strValueArray(lstUsers.ListIndex + 1, intPortCol)
End Sub

Private Sub lstUsers_MouseDown(Button As Integer, Shift As Integer, X As Single, Y As Single)
    If UCase(lstUsers.Text) = UCase(strLoginName) Or optAll.Value = True Then UserChat.Enabled = False Else UserChat.Enabled = True
    If Button = 2 Then
        Title.Caption = "Options for " & lstUsers.Text
        frmUser.PopupMenu UserMenu
    End If
End Sub

Private Sub optAll_Click()
    Call PopulateForm("GAU")
End Sub

Private Sub optCurrent_Click()
    Call PopulateForm("GUL")
End Sub

Private Sub sckClient_Close()
    sckClient.Close
End Sub

Private Sub PopulateForm(strControlCase As String)
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
            If UCase(strValueArray(intCount, intNameCol)) = UCase(strLoginName) Then lstUsers.Selected(intCount - 1) = True
        Next intCount
        If strControlCase = "GAU" Then SendMessage.Enabled = False: UserChat.Enabled = False
        If strControlCase = "GUL" Then SendMessage.Enabled = True: UserChat.Enabled = True
    Else
        MsgBox (strGetData)
    End If
End Sub

Private Sub SendMessage_Click()
    Dim strGetData As String
    
    frmLogin.Caption = "LunchTime Personal Message"
    frmLogin.Label1 = "Type Your Message and Press Enter:"
    strLoginControl = "MFU"
    strUserControl = ""
    frmLogin.Show
    
    Do
        success = DoEvents()
    Loop Until strUserControl <> ""
    If (strUserControl <> "KIL") Then
            If Not ServerConnect(strUserControl, strGetData, txtCurrentIP.Text, txtCurrentPort.Text) Then MsgBox ("Can't make connection...")
    End If
End Sub

Private Sub UserChat_Click()
    If Left(strChatControl, 3) <> "GOT" Then
        strChatControl = "GET"
        frmUserChat.Show
        If bChatError Then Unload frmUserChat
    End If
End Sub
