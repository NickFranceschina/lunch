VERSION 5.00
Begin VB.Form frmGroups 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Lunch Group Admin"
   ClientHeight    =   2655
   ClientLeft      =   4410
   ClientTop       =   2790
   ClientWidth     =   5400
   BeginProperty Font 
      Name            =   "Arial"
      Size            =   8.25
      Charset         =   0
      Weight          =   400
      Underline       =   0   'False
      Italic          =   0   'False
      Strikethrough   =   0   'False
   EndProperty
   Icon            =   "frmGroups.frx":0000
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   2655
   ScaleWidth      =   5400
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtUsersGroup 
      Enabled         =   0   'False
      Height          =   315
      Left            =   3720
      TabIndex        =   12
      Top             =   120
      Width           =   1575
   End
   Begin VB.TextBox txtNoVotes 
      Enabled         =   0   'False
      Height          =   315
      Left            =   4800
      TabIndex        =   7
      Top             =   1680
      Width           =   495
   End
   Begin VB.TextBox txtYesVotes 
      Enabled         =   0   'False
      Height          =   315
      Left            =   3120
      TabIndex        =   6
      Top             =   1680
      Width           =   495
   End
   Begin VB.TextBox txtCurrentChoice 
      Enabled         =   0   'False
      Height          =   315
      Left            =   3720
      TabIndex        =   5
      Top             =   1200
      Width           =   1575
   End
   Begin VB.TextBox txtNotificationTime 
      Enabled         =   0   'False
      Height          =   315
      Left            =   3720
      TabIndex        =   4
      Top             =   720
      Width           =   1575
   End
   Begin VB.CommandButton cmdUpdate 
      Caption         =   "Update Notify Time"
      Enabled         =   0   'False
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   375
      Left            =   3720
      TabIndex        =   3
      Top             =   2160
      Width           =   1575
   End
   Begin VB.ListBox lstGroups 
      Height          =   1950
      ItemData        =   "frmGroups.frx":030A
      Left            =   120
      List            =   "frmGroups.frx":0311
      TabIndex        =   2
      Top             =   600
      Width           =   1935
   End
   Begin VB.CommandButton cmdAdd 
      Caption         =   "Add New Group"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   375
      Left            =   2160
      TabIndex        =   1
      Top             =   2160
      Width           =   1455
   End
   Begin VB.Label Label5 
      Caption         =   "You Currently Belong To:"
      ForeColor       =   &H00000000&
      Height          =   255
      Left            =   1800
      TabIndex        =   13
      Top             =   120
      Width           =   1815
   End
   Begin VB.Label Label4 
      Caption         =   """No"" Votes:"
      ForeColor       =   &H00000000&
      Height          =   255
      Left            =   3960
      TabIndex        =   11
      Top             =   1680
      Width           =   855
   End
   Begin VB.Label Label3 
      Caption         =   """Yes"" Votes:"
      ForeColor       =   &H00000000&
      Height          =   255
      Left            =   2160
      TabIndex        =   10
      Top             =   1680
      Width           =   975
   End
   Begin VB.Label Label2 
      Caption         =   "Current/Last Choice:"
      ForeColor       =   &H00000000&
      Height          =   255
      Left            =   2160
      TabIndex        =   9
      Top             =   1200
      Width           =   1695
   End
   Begin VB.Label Label1 
      Caption         =   "Notification Time:"
      ForeColor       =   &H00000000&
      Height          =   255
      Left            =   2400
      TabIndex        =   8
      Top             =   720
      Width           =   1215
   End
   Begin VB.Label lblAdminTitle 
      Caption         =   "Existing Groups:"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H00000000&
      Height          =   255
      Left            =   120
      TabIndex        =   0
      Top             =   240
      Width           =   2055
   End
   Begin VB.Menu GroupMenu 
      Caption         =   "Group Menu"
      Visible         =   0   'False
      Begin VB.Menu Title 
         Caption         =   ""
      End
      Begin VB.Menu seperator 
         Caption         =   "-"
      End
      Begin VB.Menu showusers 
         Caption         =   "Show Me The Users In This Group"
      End
      Begin VB.Menu Join 
         Caption         =   "Join This Group"
      End
      Begin VB.Menu SendMessage 
         Caption         =   "Send Message to Group"
      End
      Begin VB.Menu GroupChat 
         Caption         =   "Set Up Group Chat"
      End
   End
End
Attribute VB_Name = "frmGroups"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
    Dim strValueArray() As String
    Dim intGroupCol As Integer
    Dim intNotifyCol As Integer
    Dim intChoiceCol As Integer
    Dim intYesCol As Integer
    Dim intNoCOl As Integer
    Dim intMyIndex As Integer
    Dim strGetData As String
    

Private Sub cmdAdd_Click()
    frmLogin.Caption = "LunchTime Group Admin"
    frmLogin.Label1 = "Please Enter the New GroupID:"
    strLoginControl = "ADG"
    strGroupControl = ""
    frmLogin.Show
    
    Do
        success = DoEvents()
    Loop Until strGroupControl <> ""
    
    If strGroupControl <> "KIL" Then
        populate strGroupControl
        populate "GAG"
    End If
End Sub

Private Sub GroupChat_Click()
    If strGroupChat <> "GOT" Then strGroupChat = "GET"
    frmGroupChat.Show
    If bChatError Then Unload frmGroupChat
End Sub

Private Sub Join_Click()
    If lstGroups.Text <> "" Then
        populate "JTG " + strLoginName + " " + lstGroups.Text
        populate "GAG"
    End If
End Sub

Private Sub SendMessage_Click()
    Dim strGetData As String
    Dim strIPArray() As String
    
    frmLogin.Caption = "LunchTime Group Message"
    frmLogin.Label1 = "Type Your Message and Press Enter:"
    strLoginControl = "MFG"
    strGroupControl = ""
    frmLogin.Show
    
    Do
        success = DoEvents()
    Loop Until strGroupControl <> ""
    
    If strGroupControl <> "KIL" Then
        If ServerConnect("SQL select ipaddress, port from users where groupid = '" & lstGroups.Text & "' and loggedon = TRUE", strGetData) Then
    '            Stop
            strGetData = Mid(strGetData, 6)
            ParseData strGetData, strIPArray()
            For intCount = 1 To (UBound(strIPArray) - 1)
                If Not ServerConnect("MFU " & strLoginName & ": " & strGroupControl, strGetData, strIPArray(intCount, 0), strIPArray(intCount, 1)) Then MsgBox (strGetData)
    '                Stop
            Next intCount
        Else
            MsgBox (strGetData)
        End If
    End If
End Sub

Private Sub cmdUpdate_Click()
    populate "UNT " & strLoginName & " " & strValueArray(intMyIndex, intNotifyCol)
    populate "GAG"
End Sub

Private Sub Form_Load()
    txtUsersGroup = strUsersGroup
    populate "GAG"
End Sub


Private Sub lstGroups_Click()
    txtNotificationTime.Text = strValueArray(lstGroups.ListIndex + 1, intNotifyCol)
    txtCurrentChoice.Text = strValueArray(lstGroups.ListIndex + 1, intChoiceCol)
    txtYesVotes.Text = strValueArray(lstGroups.ListIndex + 1, intYesCol)
    txtNoVotes.Text = strValueArray(lstGroups.ListIndex + 1, intNoCOl)
    If lstGroups.Text = strUsersGroup Then
        Let txtNotificationTime.Enabled = True
        Let cmdUpdate.Enabled = True
        Let intMyIndex = lstGroups.ListIndex + 1
    Else
        Let txtNotificationTime.Enabled = False
        Let cmdUpdate.Enabled = False
    End If
End Sub

Private Sub lstGroups_MouseDown(Button As Integer, Shift As Integer, X As Single, Y As Single)
    Title.Caption = "Options for " & lstGroups.Text
    If Button = 2 Then frmGroups.PopupMenu GroupMenu
End Sub

Private Sub ShowUsers_Click()
    Dim position As Integer
    If (lstGroups.Text <> "") And ServerConnect("SQL select Username from users where groupid = '" & lstGroups.Text & "'", strGetData) Then
        strGetData = Mid(strGetData, InStr(strGetData, "Username") + 11) 'get to the end of username
        If InStr(UCase(strGetData), "ERROR") Then
            Let strGetData = "Users In This Group" & vbCrLf & "-----------------------------" & vbCrLf & "No One Currently Belongs To This Group"
        Else
            Let strGetData = "Users In This Group" & vbCrLf & "-----------------------------" & vbCrLf & strGetData
        End If
        MsgBox (strGetData)
    ElseIf (lstGroups.Text = "") Then
        MsgBox ("Select a Group First")
    Else
        MsgBox ("Error Connecting to Server")
    End If
    
End Sub

Private Sub txtNotificationTime_gotfocus()
    cmdUpdate.Enabled = True
End Sub

Private Sub txtNotificationTime_LostFocus()
    Let strValueArray(intMyIndex, intNotifyCol) = Format(txtNotificationTime.Text, "hh:mm:ss AMPM")
    Let txtNotificationTime = Format(txtNotificationTime.Text, "hh:mm:ss AMPM")
    txtNotificationTime.Enabled = False
End Sub

Private Sub populate(strGroupControl As String)
    Dim strGetData As String
    Dim strArrayItem As Variant
    Dim intColumns As Integer
    Dim intCount As Integer
    
    If ServerConnect(strGroupControl, strGetData) Then
        
        strGroupControl = Left(strGetData, 3)
        strGetData = Mid(strGetData, 6)
    
        'Fills aryOutputArray With returned data
        ParseData strGetData, strValueArray()
    
        For intCount = 0 To (UBound(strValueArray, 2))
            Select Case UCase(strValueArray(0, intCount))
            Case Is = "GROUPID"
                Let intGroupCol = intCount
            Case Is = "NOTIFICATIONTIME"
                Let intNotifyCol = intCount
            Case Is = "CURRENTRESTAURANTCHOICE"
                Let intChoiceCol = intCount
            Case Is = "CURRENTYESVOTES"
                Let intYesCol = intCount
            Case Is = "CURRENTNOVOTES"
                Let intNoCOl = intCount
            End Select
        Next intCount
    
        Select Case strGroupControl
            Case Is = "GAG"
                lstGroups.Clear
                For intCount = 1 To (UBound(strValueArray) - 1)
                    lstGroups.AddItem strValueArray(intCount, intGroupCol)
                    If strValueArray(intCount, intGroupCol) = strUsersGroup Then lstGroups.Selected(intCount - 1) = True
                Next intCount
                strGroupControl = ""
            Case Is = "ADG"
                strUsersGroup = strValueArray(1, intGroupCol)
                txtUsersGroup = strUsersGroup
            Case Is = "JTG"
                strUsersGroup = strValueArray(1, intGroupCol)
                txtUsersGroup = strUsersGroup
            Case Is = "UNT"
            If Format(txtNotificationTime.Text, "hh:mm:ss AMPM") = Format(strValueArray(1, intNotifyCol), "hh:mm:ss AMPM") Then
                cmdUpdate.Enabled = False
            Else
                MsgBox ("Error updating Time")
            End If
        End Select
    
    Else
        MsgBox (strGroupControl & vbCrLf & strGetData)
    End If
End Sub
