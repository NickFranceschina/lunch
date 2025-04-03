VERSION 5.00
Begin VB.Form frmRestaurants 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Lunch Resaurants"
   ClientHeight    =   3555
   ClientLeft      =   4785
   ClientTop       =   2400
   ClientWidth     =   4680
   Icon            =   "frmRestaurants.frx":0000
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3555
   ScaleWidth      =   4680
   ShowInTaskbar   =   0   'False
   Begin VB.ComboBox cmbWeight 
      Height          =   315
      Left            =   3120
      Locked          =   -1  'True
      TabIndex        =   9
      Top             =   2880
      Width           =   1350
   End
   Begin VB.CommandButton cmdAdd 
      Caption         =   "Add New"
      Height          =   375
      Left            =   360
      TabIndex        =   7
      ToolTipText     =   "Add New Restaurant"
      Top             =   3000
      Width           =   1215
   End
   Begin VB.CommandButton cmdUpdate 
      Caption         =   "Update Weight"
      Enabled         =   0   'False
      Height          =   255
      Left            =   3000
      TabIndex        =   6
      Top             =   3240
      Width           =   1455
   End
   Begin VB.ComboBox cmbGroups 
      Height          =   315
      Left            =   2640
      Locked          =   -1  'True
      TabIndex        =   5
      Text            =   "Group IDs"
      Top             =   240
      Width           =   1935
   End
   Begin VB.CommandButton cmdDRG 
      Caption         =   "<--"
      Height          =   375
      Left            =   2040
      TabIndex        =   3
      ToolTipText     =   "Remove Restaurant from group"
      Top             =   1920
      Width           =   375
   End
   Begin VB.CommandButton cmdARG 
      Caption         =   "-->"
      Height          =   375
      Left            =   2040
      TabIndex        =   2
      ToolTipText     =   "Add Restaurant to group"
      Top             =   1200
      Width           =   375
   End
   Begin VB.ListBox lstGroupRests 
      Height          =   2205
      Left            =   2640
      MultiSelect     =   2  'Extended
      TabIndex        =   1
      Top             =   600
      Width           =   1935
   End
   Begin VB.ListBox lstRestaurants 
      Height          =   2205
      Left            =   120
      MultiSelect     =   2  'Extended
      TabIndex        =   0
      Top             =   480
      Width           =   1695
   End
   Begin VB.Label Label3 
      Caption         =   "Restaurants in group:"
      Height          =   255
      Left            =   2640
      TabIndex        =   10
      Top             =   0
      Width           =   1935
   End
   Begin VB.Label Label2 
      Caption         =   "Occurance:"
      Height          =   255
      Left            =   2160
      TabIndex        =   8
      Top             =   2880
      Width           =   855
   End
   Begin VB.Label Label1 
      Caption         =   "All Restaurants:"
      Height          =   255
      Left            =   120
      TabIndex        =   4
      Top             =   120
      Width           =   1215
   End
End
Attribute VB_Name = "frmRestaurants"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Dim intNameCol As Integer
Dim intGroupIDCol As Integer
Dim intGroupRatCol As Integer
Dim intTypeCol As Integer
Dim strValueArray() As String

Private Sub cmbGroups_Click()
    cmbGroups.Locked = True
    Let cmdUpdate.Enabled = False

    If cmbGroups.Text = strUsersGroup Then
        cmdARG.Enabled = True
        cmdDRG.Enabled = True
        cmbWeight.Enabled = True
    Else
        cmdARG.Enabled = False
        cmdDRG.Enabled = False
        cmbWeight.Enabled = False
    End If
    If UCase(cmbGroups.Text) = "All" Then cmdDRG.Enabled = False
    populate "GGR " & cmbGroups.Text
End Sub

Private Sub cmbGroups_DropDown()
    cmbGroups.Locked = False
End Sub

Private Sub cmbWeight_Click()
    cmbWeight.Locked = True
    Let strValueArray(lstGroupRests.ListIndex + 1, intGroupRatCol) = cmbWeight.Text
End Sub

Private Sub cmbWeight_DropDown()
    cmbWeight.Locked = False
End Sub

Private Sub cmdAdd_Click()
    frmLogin.Caption = "LunchTime Restaurant Admin"
    frmLogin.Label1 = "Please Enter the New Restaurant:"
    strLoginControl = "ARG"
    strRestaurantControl = ""
    frmLogin.Show
        
    Do
        success = DoEvents()
    Loop Until strRestaurantControl <> ""
    
    If strRestaurantControl <> "KIL" Then
        populate strRestaurantControl
        populate "GAR"
    '    populate "GDG"
        populate "GGR" & " " & strUsersGroup    'get Groups Restaurants
    End If
    
End Sub

Private Sub cmdARG_Click()
    Dim intGroupCount As Integer
    Dim Exist As Boolean
    Dim intlistcount As Integer
    
    Let intlistcount = 0
    
     Do While intlistcount < lstRestaurants.ListCount
      If lstRestaurants.Selected(intlistcount) Then
        Let Exist = False
        For intGroupCount = 0 To lstGroupRests.ListCount - 1
          If lstGroupRests.List(intGroupCount) = lstRestaurants.List(intlistcount) Then Exist = True: Exit For
        Next intGroupCount
        If Exist = False Then populate "ARG" & " " & strLoginName & " " & lstRestaurants.List(intlistcount)
      End If
      Let intlistcount = intlistcount + 1
     Loop
    
    populate "GGR" & " " & strUsersGroup    'get Groups Restaurants

End Sub

Private Sub cmdDRG_Click()
    Dim intlistcount As Integer
    Let intlistcount = 0
    
        Do While intlistcount < lstGroupRests.ListCount
           If lstGroupRests.Selected(intlistcount) Then populate "DRG" & " " & strLoginName & " " & lstGroupRests.List(intlistcount)
           Let intlistcount = intlistcount + 1
        Loop
    
    populate "GGR" & " " & strUsersGroup    'get Groups Restaurants

End Sub

Private Sub cmdUpdate_Click()
    populate "URW " & strLoginName & " " & cmbWeight.Text & " " & lstGroupRests.Text
    populate "GGR" & " " & strUsersGroup    'get Groups Restaurants
End Sub

Private Sub Form_Load()
    frmRestaurants.Caption = "Restaurant Admin for " + strUsersGroup
    cmbGroups.Text = strUsersGroup
    If UCase(strUsersGroup) = "All" Then cmdDRG.Enabled = False
    cmbWeight.AddItem "Often"
    cmbWeight.AddItem "Sometimes"
    cmbWeight.AddItem "Seldom"
    populate "GAR"                          'get all restaurants
    populate "GDG"                          'get distinct groups
    populate "GGR" & " " & strUsersGroup    'get Groups Restaurants
End Sub

Private Sub lstGroupRests_Click()
     cmbWeight.Text = strValueArray(lstGroupRests.ListIndex + 1, intGroupRatCol)
End Sub

Private Sub lstRestaurants_Click()
    If lstRestaurants.Text = "<New>" Then MsgBox ("add new restaraunt")
End Sub

Private Sub cmbweight_GotFocus()
    cmdUpdate.Enabled = True
End Sub

Private Sub populate(strRestaurantControl As String)
    Dim strGetData As String
    If ServerConnect(strRestaurantControl, strGetData) Then
'          MsgBox (strGetData)
          strRestaurantControl = Left(strGetData, 3)
          strGetData = Mid(strGetData, 6)
          
          ParseData strGetData, strValueArray()
            
          For intCount = 0 To (UBound(strValueArray, 2))
          Select Case UCase(strValueArray(0, intCount))
              Case Is = "RESTAURANTNAME"
                  Let intNameCol = intRestCol
              Case Is = "GROUPID"
                  Let intGroupIDCol = intCount
              Case Is = "GROUPRATING"
                  Let intGroupRatCol = intCount
              End Select
          Next intCount
          Select Case Left(strRestaurantControl, 3)
          Case Is = "GAR"
                lstRestaurants.Clear
                For intCount = 1 To (UBound(strValueArray) - 1)
                    lstRestaurants.AddItem strValueArray(intCount, intNameCol)
                Next intCount
          Case Is = "GDG"
                cmbGroups.Clear
                cmbGroups.Text = strUsersGroup
                For intCount = 1 To (UBound(strValueArray) - 1)
                    cmbGroups.AddItem strValueArray(intCount, intGroupIDCol)
                Next intCount
          Case Is = "GGR"
                lstGroupRests.Clear
                For intCount = 1 To (UBound(strValueArray) - 1)
                    lstGroupRests.AddItem strValueArray(intCount, intNameCol)
                Next intCount
          Case Is = "ARG"

          Case Is = "DRG"

          Case Is = "URW"

          Case Is = "ERR"
                MsgBox (strGetData)
          End Select

    Else
        MsgBox (strRestaurantControl & vbCrLf & strGetData)
    End If
End Sub
