VERSION 5.00
Begin VB.Form frmChatRequest 
   BorderStyle     =   4  'Fixed ToolWindow
   Caption         =   "Chat Request"
   ClientHeight    =   1590
   ClientLeft      =   615
   ClientTop       =   3495
   ClientWidth     =   2670
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   1590
   ScaleWidth      =   2670
   ShowInTaskbar   =   0   'False
   Begin VB.Frame Frame1 
      Height          =   1575
      Left            =   0
      TabIndex        =   3
      Top             =   0
      Width           =   2655
      Begin VB.CommandButton cmdAccept 
         Caption         =   "Accept"
         Height          =   495
         Left            =   120
         TabIndex        =   5
         Top             =   960
         Width           =   975
      End
      Begin VB.CommandButton cmdDecline 
         Caption         =   "Decline"
         Height          =   495
         Left            =   1440
         TabIndex        =   4
         Top             =   960
         Width           =   975
      End
      Begin VB.Label Label1 
         Caption         =   "You have a chat request from"
         Height          =   255
         Left            =   120
         TabIndex        =   7
         Top             =   240
         Width           =   2175
      End
      Begin VB.Label lblName 
         Height          =   255
         Left            =   120
         TabIndex        =   6
         Top             =   480
         Width           =   2415
      End
   End
   Begin VB.TextBox txtIP 
      Height          =   375
      Left            =   240
      TabIndex        =   2
      Top             =   600
      Width           =   2055
   End
   Begin VB.TextBox txtPort 
      Height          =   375
      Left            =   240
      TabIndex        =   1
      Top             =   1080
      Width           =   2055
   End
   Begin VB.TextBox txtName 
      Height          =   375
      Left            =   240
      TabIndex        =   0
      Top             =   120
      Width           =   2055
   End
End
Attribute VB_Name = "frmChatRequest"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Private Sub cmdAccept_Click()
    If strGroupChat <> "GOT" Then
        strChatControl = "GOT"
        frmUserChat.Show
    Else
        frmGroupChat.Show
    End If
    Unload Me
End Sub

Private Sub cmdDecline_Click()
Dim strGetData As String
    If Not ServerConnect("NTH", strGetData, txtIP.Text, CLng(txtPort.Text)) Then
        Label1.Caption = "User No Longer Listening"
    End If
    Unload Me
End Sub
  
