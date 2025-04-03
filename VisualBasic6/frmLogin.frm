VERSION 5.00
Begin VB.Form frmLogin 
   BorderStyle     =   4  'Fixed ToolWindow
   Caption         =   "LunchTime Login"
   ClientHeight    =   675
   ClientLeft      =   615
   ClientTop       =   5760
   ClientWidth     =   3015
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   675
   ScaleWidth      =   3015
   ShowInTaskbar   =   0   'False
   Begin VB.TextBox txtLogin 
      Height          =   285
      Left            =   0
      TabIndex        =   0
      Top             =   360
      Width           =   3015
   End
   Begin VB.Label Label1 
      Caption         =   "Type Your Login Name and Press Enter:"
      Height          =   255
      Left            =   0
      TabIndex        =   1
      Top             =   120
      Width           =   2895
   End
End
Attribute VB_Name = "frmLogin"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
  
Private Sub Form_GotFocus()
    If txtLogin.Visible = True Then txtLogin.SetFocus
End Sub

Private Sub Form_Unload(Cancel As Integer)
  If strGroupControl = "" Then strGroupControl = "KIL"
  If strRestaurantControl = "" Then strRestaurantControl = "KIL"
  If strUserControl = "" Then strUserControl = "KIL"
End Sub

Private Sub txtLogin_KeyDown(KeyCode As Integer, Shift As Integer)
    If KeyCode = 13 Then
        Select Case Left(strLoginControl, 3)
        Case Is = "LGI"
            If (InStr(5, txtLogin.Text, " ") = 0) And (UCase(txtLogin.Text) <> "ADD") Then
                strLoginName = txtLogin.Text
                Call ServerLogin
            Else
                MsgBox ("Syntax: 'ADD <username>' (Username cannot contain any spaces)")
            End If
            Unload Me
        Case Is = "ADG"
            strGroupControl = "ADG" & " " & strLoginName & " " & txtLogin.Text
            Unload Me
        Case Is = "ARG"
            strRestaurantControl = "ARG" & " " & strLoginName & " " & txtLogin.Text
            Unload Me
        Case Is = "MFG"
            strGroupControl = txtLogin.Text
            Unload Me
        Case Is = "MFU"
            strUserControl = "MFU " & strLoginName & ": " & txtLogin.Text
            Unload Me
        End Select
    End If
End Sub

