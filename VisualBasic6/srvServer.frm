VERSION 5.00
Object = "{248DD890-BB45-11CF-9ABC-0080C7E7B78D}#1.0#0"; "MSWINSCK.OCX"
Object = "{00028C01-0000-0000-0000-000000000046}#1.0#0"; "DBGRID32.OCX"
Begin VB.Form frmLunchServer 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Lunch Server"
   ClientHeight    =   3900
   ClientLeft      =   3270
   ClientTop       =   2880
   ClientWidth     =   7305
   BeginProperty Font 
      Name            =   "Arial"
      Size            =   8.25
      Charset         =   0
      Weight          =   400
      Underline       =   0   'False
      Italic          =   0   'False
      Strikethrough   =   0   'False
   EndProperty
   Icon            =   "srvServer.frx":0000
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   ScaleHeight     =   3900
   ScaleWidth      =   7305
   ShowInTaskbar   =   0   'False
   Begin VB.Timer TimeOut 
      Interval        =   2000
      Left            =   5640
      Top             =   2880
   End
   Begin VB.Timer timConnectionCheck 
      Interval        =   3000
      Left            =   1560
      Top             =   2760
   End
   Begin VB.Timer LunchTimer 
      Interval        =   900
      Left            =   1080
      Top             =   2760
   End
   Begin MSWinsockLib.Winsock Winsock2 
      Left            =   6840
      Top             =   0
      _ExtentX        =   741
      _ExtentY        =   741
   End
   Begin VB.CommandButton cmdClear 
      Caption         =   "Clear"
      Height          =   375
      Left            =   6000
      TabIndex        =   6
      Top             =   3360
      Width           =   1095
   End
   Begin VB.CommandButton cmdSubmit 
      Caption         =   "Submit"
      Height          =   375
      Left            =   6000
      TabIndex        =   4
      Top             =   2760
      Width           =   1095
   End
   Begin VB.TextBox txtQuery 
      Height          =   975
      Left            =   2040
      MultiLine       =   -1  'True
      TabIndex        =   3
      Text            =   "srvServer.frx":030A
      Top             =   2760
      Width           =   3615
   End
   Begin VB.OptionButton optGroups 
      Caption         =   "Groups"
      Height          =   210
      Left            =   120
      TabIndex        =   2
      Top             =   3120
      Width           =   975
   End
   Begin VB.OptionButton optRestaurants 
      Caption         =   "Restaurants"
      Height          =   255
      Left            =   120
      TabIndex        =   1
      Top             =   3480
      Width           =   1455
   End
   Begin VB.OptionButton optUsers 
      Caption         =   "Users"
      Height          =   210
      Left            =   120
      TabIndex        =   0
      Top             =   2760
      Value           =   -1  'True
      Width           =   975
   End
   Begin MSWinsockLib.Winsock Winsock1 
      Left            =   0
      Top             =   0
      _ExtentX        =   741
      _ExtentY        =   741
      LocalPort       =   2627
   End
   Begin VB.Data dtUsers 
      Caption         =   "Users"
      Connect         =   "Access"
      DatabaseName    =   "Lunch.mdb"
      DefaultCursorType=   0  'DefaultCursor
      DefaultType     =   2  'UseODBC
      Exclusive       =   0   'False
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   495
      Left            =   720
      Options         =   0
      ReadOnly        =   0   'False
      RecordsetType   =   1  'Dynaset
      RecordSource    =   "Users"
      Top             =   3360
      Visible         =   0   'False
      Width           =   1140
   End
   Begin MSDBGrid.DBGrid DBGrid1 
      Bindings        =   "srvServer.frx":031F
      Height          =   2535
      Left            =   120
      OleObjectBlob   =   "srvServer.frx":0331
      TabIndex        =   5
      Top             =   120
      Width           =   7095
   End
   Begin VB.Menu ShowMe 
      Caption         =   "Show Me"
      Begin VB.Menu NextTimeDisplay 
         Caption         =   "Next Lunch Time"
      End
      Begin VB.Menu NextConfirmDisplay 
         Caption         =   "Next Confirm Time"
      End
   End
End
Attribute VB_Name = "frmLunchServer"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Dim ErrorControl As Boolean
Dim timNextTime As Date
Dim timNextConfirm As Date
Dim StartupControl As Boolean
Dim rstIP2Send2 As Recordset
Dim rstIPCFC As Recordset
Dim strControl As String
Dim bClientConnectLock As Boolean
Dim bClientTimeOut As Boolean
Dim bSendComplete As Boolean
Dim strClientSocketError As String
Dim strClientDataRecieved As String

Private Sub cmdClear_Click()
    Let txtQuery = "Type Query Here... "
End Sub

Private Sub cmdSubmit_Click()
    Dim success As Long
    Dim strtemp As String
    Dim strQuery As String
    If InStr(txtQuery.Text, " ") Then
        Let strQuery = UCase(Left(txtQuery.Text, InStr(txtQuery.Text, " ") - 1))
    Else
        Let strQuery = "ERR"
    End If
    If strQuery = "SELECT" Then
        success = SubmitQuery(txtQuery.Text, strtemp)
        MsgBox (strtemp)
    ElseIf ((strQuery = "INSERT") Or (strQuery = "DELETE") Or (strQuery = "UPDATE")) Then
        success = SubmitQuery(txtQuery.Text, strtemp)
        dtUsers.Refresh
        DBGrid1.Refresh
    Else: MsgBox ("Not a valid query!")
    End If
End Sub

Private Sub dtUsers_Error(DataErr As Integer, Response As Integer)
    MsgBox (Str(DataErr))
End Sub

Private Sub dtUsers_Validate(Action As Integer, Save As Integer)
  If DBGrid1.DataChanged Then
    dtUsers.UpdateRecord
    Call GetNextTime
  End If
End Sub

Private Sub Form_Load()
    Winsock1.LocalPort = lngServerListen
    Winsock1.Listen
    OuttaHere = False
    StartupControl = True
End Sub

Private Sub Form_Paint()
    dtUsers.Refresh
    DBGrid1.Refresh
End Sub


Private Sub Form_Unload(Cancel As Integer)
    If OuttaHere = True Then
        Cancel = 0
        Unload Me
    Else
        Cancel = 1
        frmLunchServer.Hide
    End If
End Sub

Private Sub NextConfirmDisplay_Click()
    MsgBox (timNextConfirm)
End Sub

Private Sub NextTimeDisplay_Click()
    MsgBox (timNextTime)
End Sub

Private Sub optGroups_Click()
    dtUsers.RecordSource = "Groups"
    dtUsers.Refresh
    DBGrid1.Refresh
End Sub

Private Sub optRestaurants_Click()
    dtUsers.RecordSource = "Restaurants"
    dtUsers.Refresh
    DBGrid1.Refresh
End Sub

Private Sub optUsers_Click()
    dtUsers.RecordSource = "Users"
    dtUsers.Refresh
    DBGrid1.Refresh
End Sub


Private Sub LunchTimer_Timer()
        Dim qryTemp As QueryDef
        Dim strRating As String
        Dim sRandomIndex As Single
        Dim rstgroups As Recordset
        Dim rstChoice As Recordset
        Dim strQuery As String
        Dim strRestName As String
        Dim ThisConfirm As Date
        Dim intYesVotes As Integer
        Dim intNoVotes As Integer
        Dim strGetData As String
        Dim timNOW As Date
            
    Let timNOW = Format(Now, "hh:mm:ss AMPM")
    If StartupControl = True Then Call SetUpConfirmationTimes("ALL"): Call GetNextTime: Let StartupControl = False

    If Format(timNextTime, "hh:mm:ss AMPM") = timNOW Then

        strControl = "NRC"
        
        Set qryTemp = dtUsers.Database.CreateQueryDef("", "Select groupid from groups where notificationtime = #" & timNextTime & "# and groupid in (select distinct a.groupid from users a)")
        Set rstgroups = qryTemp.OpenRecordset
        
        rstgroups.MoveFirst
        Do While rstgroups.EOF = False
            Let strQuery = "update restaurants set chosen = FALSE where groupid = '" & rstgroups.Fields("groupid").Value & "'"
            dtUsers.Database.Execute strQuery

            strRating = GetRandomRating(rstgroups.Fields("groupid").Value)
            If Left(strRating, 3) = "ERR" Then
                Let strRestName = Mid(strRating, 5)
            Else
                Set qryTemp = dtUsers.Database.CreateQueryDef("", _
                  "Select restaurantname from restaurants where groupid = '" _
                  & rstgroups.Fields("groupid").Value _
                  & "' and grouprating = '" & strRating & "' and chosen = FALSE")
                Set rstChoice = qryTemp.OpenRecordset
                rstChoice.MoveLast
                rstChoice.MoveFirst
           
                Randomize
                rstChoice.Move CLng(Rnd() * (rstChoice.RecordCount - 1))
                Let strRestName = rstChoice.Fields("restaurantname").Value
            End If
            
            Let strQuery = "update groups set currentrestaurantchoice = '" & strRestName & "', currentyesvotes = 0, currentnovotes = 0, confirmed = FALSE where groupid = '" & rstgroups.Fields("groupid").Value & "'"
            dtUsers.Database.Execute strQuery
            Let strQuery = "update restaurants set chosen = TRUE where groupid = '" & rstgroups.Fields("groupid").Value & "' and restaurantname = '" & strRestName & "'"
            dtUsers.Database.Execute strQuery
            rstgroups.MoveNext
        Loop
        
        Set qryTemp = dtUsers.Database.CreateQueryDef("", _
           "Select u.ipaddress as [IP Address], u.port as [ClientPort], g.confirmed as [Confirmed], g.currentrestaurantchoice as [Restaurant Choice] " & _
           "from users u, groups g " & _
           "where g.notificationtime = #" & timNextTime & "#" & _
           " and u.groupid = g.groupid " & _
           " and u.loggedon = True")
        
        Set rstIP2Send2 = qryTemp.OpenRecordset
        
        If rstIP2Send2.RecordCount > 0 Then
           rstIP2Send2.MoveFirst
           Do While rstIP2Send2.EOF = False
                If Not ClientConnect("NRC " & rstIP2Send2.Fields("Confirmed").Value & " " & rstIP2Send2.Fields("Restaurant Choice").Value, strGetData, rstIP2Send2.Fields("IP Address").Value, rstIP2Send2.Fields("ClientPort").Value) Then
                    If Left(strGetData, 3) = "ERC" Then dtUsers.Database.Execute "update users set loggedon = false where ipaddress = '" & rstIP2Send2.Fields("IP Address").Value & "' and port = " & rstIP2Send2.Fields("ClientPort").Value
                End If
                rstIP2Send2.MoveNext
           Loop
        End If
        
        dtUsers.Refresh
        DBGrid1.Refresh
    End If
    If Format(timNextConfirm, "hh:mm:ss AMPM") = timNOW Then

        strControl = "NRC"
        
        Set qryTemp = dtUsers.Database.CreateQueryDef("", "Select groupid, currentyesvotes, currentnovotes from groups where confirmationtime = #" & timNextConfirm & "# and groupid in (select distinct a.groupid from users a)")
        Set rstgroups = qryTemp.OpenRecordset
        rstgroups.MoveFirst
        
        Do While rstgroups.EOF = False
            If rstgroups.Fields("currentyesvotes").Value > rstgroups.Fields("currentnovotes").Value Then
                dtUsers.Database.Execute "update groups set confirmed = TRUE where groupid = '" & rstgroups.Fields("groupid").Value & "'"
            Else
                strRating = GetRandomRating(rstgroups.Fields("groupid").Value)
                If Left(strRating, 3) = "ERR" Then
                    Let strRestName = Mid(strRating, 5)
                    Let strQuery = "update groups set currentrestaurantchoice = '" & strRestName & "', currentyesvotes = 0, currentnovotes = 0 where groupid = '" & rstgroups.Fields("groupid").Value & "'"
                    dtUsers.Database.Execute strQuery
                Else
                    Set qryTemp = dtUsers.Database.CreateQueryDef("", _
                      "Select restaurantname from restaurants where groupid = '" _
                      & rstgroups.Fields("groupid").Value _
                      & "' and grouprating = '" & strRating & "' and chosen = FALSE")
                    Set rstChoice = qryTemp.OpenRecordset
                    rstChoice.MoveLast
                    rstChoice.MoveFirst
                    
                    Randomize
                    rstChoice.Move CLng(Rnd() * (rstChoice.RecordCount - 1))
                    Let strRestName = rstChoice.Fields("restaurantname").Value
                    
                    Let strQuery = "update groups set currentrestaurantchoice = '" & strRestName & "', confirmationtime = #" & DateAdd("n", intConfirmationWait, timNextConfirm) & "# , currentyesvotes = 0, currentnovotes = 0 where groupid = '" & rstgroups.Fields("groupid").Value & "'"
                    dtUsers.Database.Execute strQuery
                    Let strQuery = "update restaurants set chosen = TRUE where groupid = '" & rstgroups.Fields("groupid").Value & "' and restaurantname = '" & strRestName & "'"
                    dtUsers.Database.Execute strQuery

                End If
            End If
            rstgroups.MoveNext
        Loop
        
        Set qryTemp = dtUsers.Database.CreateQueryDef("", _
           "Select u.ipaddress as [IP Address], u.port as [ClientPort], g.confirmed as [Confirmed], g.currentrestaurantchoice as [Restaurant Choice] " & _
           "from users u, groups g " & _
           "where ((g.confirmationtime = #" & DateAdd("n", intConfirmationWait, timNextConfirm) & "# and g.confirmed = FALSE) " & _
           " or (g.confirmationtime = #" & timNextConfirm & "#)) " & _
           " and u.groupid = g.groupid " & _
           " and u.loggedon = True")

        Set rstIP2Send2 = qryTemp.OpenRecordset
        
        If rstIP2Send2.RecordCount > 0 Then
           rstIP2Send2.MoveFirst
           Do While rstIP2Send2.EOF = False
                If Not ClientConnect("NRC " & rstIP2Send2.Fields("Confirmed").Value & " " & rstIP2Send2.Fields("Restaurant Choice").Value, strGetData, rstIP2Send2.Fields("IP Address").Value, rstIP2Send2.Fields("ClientPort").Value) Then
                    If Left(strGetData, 3) = "ERC" Then dtUsers.Database.Execute "update users set loggedon = false where ipaddress = '" & rstIP2Send2.Fields("IP Address").Value & "' and port = " & rstIP2Send2.Fields("ClientPort").Value
                End If
                rstIP2Send2.MoveNext
           Loop
        End If
        
        dtUsers.Refresh
        DBGrid1.Refresh
    End If
    Call GetNextTime
    Let strControl = ""
End Sub

Private Function GetRandomRating(strThisGroup As String, Optional IgnoreChosen)
    Dim qryTemp As QueryDef
    Dim rstgroups As Recordset
    Dim strRandom As String
    Dim sRandom As Single
    
    Randomize
    Let sRandom = Rnd()
    
    Select Case sRandom
    Case Is < sOftenMark
        Let strRandom = "Often"
    Case Is > sSeldomMark
        Let strRandom = "Seldom"
    Case Else
        Let strRandom = "Sometimes"
    End Select
    If IsMissing(IgnoreChosen) Then
        Set qryTemp = dtUsers.Database.CreateQueryDef("", "Select distinct grouprating from restaurants where groupid = '" & strThisGroup & "' and chosen = FALSE order by grouprating")
        Set rstgroups = qryTemp.OpenRecordset
    Else
        Set qryTemp = dtUsers.Database.CreateQueryDef("", "Select distinct grouprating from restaurants where groupid = '" & strThisGroup & "' order by grouprating")
        Set rstgroups = qryTemp.OpenRecordset
    End If
    
    If rstgroups.RecordCount = 1 Then
        rstgroups.MoveFirst
        Let GetRandomRating = rstgroups.Fields("grouprating").Value
    ElseIf rstgroups.RecordCount = 3 Then
        Let GetRandomRating = strRandom
    ElseIf rstgroups.RecordCount = 2 Then
        rstgroups.MoveFirst
        If rstgroups.Fields("grouprating").Value = "Often" Then
            rstgroups.MoveNext
            If rstgroups.Fields("grouprating").Value = "Sometimes" Then

            'Often and Sometimes
                If strRandom = "Seldom" Then
                    Let GetRandomRating = "Sometimes"
                Else
                    Let GetRandomRating = strRandom
                End If
            Else

            'Often and Seldom
                If sRandom > (sOftenMark + 0.5 * (sSeldomMark - sOftenMark)) Then
                    Let GetRandomRating = "Seldom"
                Else
                    Let GetRandomRating = "Often"
                End If
            End If
        Else

        'Sometimes and Seldom
            If strRandom = "Often" Then
                Let GetRandomRating = "Sometimes"
            Else
                Let GetRandomRating = strRandom
            End If
        End If
    Else
        Let GetRandomRating = "ERR No Restaurants Set Up"
    End If
End Function

Private Sub timConnectionCheck_Timer()
    If Left(strControl, 3) <> "NRC" Then
        Call CheckConnections
    End If
End Sub

Private Sub TimeOut_Timer()
    bClientTimeOut = True
    TimeOut.Enabled = False
End Sub

Private Sub Winsock1_Close()
    Winsock1.Close
    Winsock1.Listen
End Sub

Private Sub Winsock1_ConnectionRequest(ByVal requestID As Long)
    If Winsock1.State <> sckClosed Then Winsock1.Close
    Winsock1.Accept requestID
End Sub

Private Sub Winsock1_DataArrival(ByVal bytesTotal As Long)
    Dim success As Long
    Dim strSendData As String
    Dim strparams As String
    Dim strGetData As String
    Dim strRequest As String
    Dim strQuery As String
    Dim strError As String
    Dim strName As String
    Dim strUserIP As String
    Dim strUserPort As String
    Dim position1 As Integer
    Dim strPleaseHold As String
    Dim strAdd As Boolean
    Dim thissuccess As Long
    Dim addsuccess As Long
    Dim strGroupID As String
    Dim strRestaurantName As String
    Dim strRating As String
    Dim strGroupTime As String
    Dim qryTemp As QueryDef
    Dim rstChoice As Recordset
    
  Winsock1.GetData strGetData

  If Right(strGetData, 2) = vbCrLf Then strGetData = Left(strGetData, Len(strGetData) - 2)

  Let strRequest = UCase(Left(strGetData, 3))

If InStr(strGetData, " ") > 0 Then
  Let strparams = Mid(strGetData, InStr(strGetData, " ") + 1)
End If

'  MsgBox (strRequest)
'  MsgBox (strparams)

  Select Case strRequest
  Case Is = "ADU"   'Add User

  Case Is = "DLU"   'Delete User
  
  Case Is = "JTG"   'Joing This Group
        Let position1 = InStr(strparams, " ")
        Let strName = Left(strparams, position1 - 1)
        Let strQuery = "Select username from users where username = '" & strName & "'"
        Let success = SubmitQuery(strQuery, strSendData)
        If (success > 0) Then
            Let strparams = Mid(strparams, position1 + 1)
            Let strGroupID = strparams
            Let strQuery = "update users set groupid = '" & strGroupID & "' where username = '" & strName & "'"
            Let strError = "ERR Error updating user group"
            thissuccess = SubmitQuery(strQuery, strSendData)
            Let strQuery = "Select groupid from users where username = '" & strName & "'"
        Else
            Let strQuery = ""
            Let strError = "ERR UserName not found"
        End If
  Case Is = "UNT"   'Update Notification Time for group
        Let position1 = InStr(strparams, " ")
        Let strName = Left(strparams, position1 - 1)
        Let strQuery = "Select groupid from users where username = '" & strName & "'"
        Let success = SubmitQuery(strQuery, strSendData)
        If (success > 0) Then
            Let strGroupID = Mid(strSendData, InStr(strSendData, vbCrLf) + 2)
            Let strGroupID = Left(strGroupID, InStr(strGroupID, vbTab) - 1)
            Let strparams = Mid(strparams, position1 + 1)
            Let strGroupTime = strparams
            Let strQuery = "update groups set notificationtime = #" & Format(strGroupTime, "hh:mm:ss AMPM") & "# where groupid = '" & strGroupID & "'"
            Let strError = "ERR Error updating user group"
            thissuccess = SubmitQuery(strQuery, strSendData)
            If thissuccess = 0 Then
                Let strQuery = "update groups set notificationtime = #12:00:00 PM# where groupid = '" & strGroupID & "'"
                thissuccess = SubmitQuery(strQuery, strSendData)
            End If
            Call SetUpConfirmationTimes(strGroupID)
            Call GetNextTime
            Let strQuery = "Select notificationtime from groups where groupid = '" & strGroupID & "'"
        Else
            Let strQuery = ""
            Let strError = "ERR UserName not found"
        End If
  Case Is = "URW"   ' Update Restaurant Weight
        Let position1 = InStr(strparams, " ")
        Let strName = Left(strparams, position1 - 1)
        Let strQuery = "Select groupid from users where username = '" & strName & "'"
        Let success = SubmitQuery(strQuery, strSendData)
        If (success > 0) Then
            Let strGroupID = Mid(strSendData, InStr(strSendData, vbCrLf) + 2)
            Let strGroupID = Left(strGroupID, InStr(strGroupID, vbTab) - 1)
            Let strparams = Mid(strparams, position1 + 1)
            Let position1 = InStr(strparams, " ")
            Let strRating = Left(strparams, position1 - 1)
            Let strRestaurantName = Mid(strparams, position1 + 1)
            Let strQuery = "update restaurants set grouprating = '" & strRating & "' where groupid = '" & strGroupID & "'" & " and restaurantname = '" & strRestaurantName & "'"
            Let strError = "ERR Error updating user group"
            thissuccess = SubmitQuery(strQuery, strSendData)
            Let strQuery = "Select grouprating from restaurants where groupid = '" & strGroupID & "' and restaurantname = '" & strRestaurantName & "'"
        Else
            Let strQuery = ""
            Let strError = "ERR UserName not found"
        End If
  Case Is = "ADG"   'Add Group
    strQuery = "Insert into groups values('" & Mid(strparams, InStr(strparams, " ") + 1) & "', #12:00:00 PM#,' ',0,0, FALSE,#12:10:00 PM#)"
    Let success = SubmitQuery(strQuery, strSendData)
    strQuery = "update users set groupid = '" & Mid(strparams, InStr(strparams, " ") + 1) & "' where username = '" & Left(strparams, InStr(strparams, " ") - 1) & "'"
    Let success = SubmitQuery(strQuery, strSendData)
    Let strQuery = "Select Groupid from users where username = '" + Left(strparams, InStr(strparams, " ") - 1) + "'"
    Let strError = "ERR Error Adding Group" & strparams
  Case Is = "DLG"   'Delete Group
  
  Case Is = "GAU"   'Get All User Info
    Let strQuery = "Select username,groupid,ipaddress,port from users"
    Let strError = "ERR No Groups"
  Case Is = "GUL"   'Get Users Logged On
    Let strQuery = "Select username,groupid,ipaddress,port from users where loggedon = True"
    Let strError = "ERR No Users Logged On"
  Case Is = "GAG"   'Get All Group Info
    Let strQuery = "Select * from groups order by groupid"
    Let strError = "ERR No Group Info"
  Case Is = "GCG"   'Get This Users Group
    Let strQuery = "Select Groupid from users where username = '" + strparams + "'"
    Let strError = "ERR this user has no group"
  Case Is = "GAR"   'Get All Restaurant Names
    Let strQuery = "Select distinct restaurantname from restaurants order by restaurantname"
    Let strError = "ERR no restaurant names"
  Case Is = "GDG"
    Let strQuery = "Select groupid from groups order by groupid"
    Let strError = "ERR no group names"
  Case Is = "ADR"   'Add Restaurant
  
  Case Is = "GRR"   'Get Random Restaurant
        strRating = GetRandomRating(strparams, Ignore)
        If Left(strRating, 3) = "ERR" Then
            Let strRestaurantName = Mid(strRating, 5)
        Else
            Set qryTemp = dtUsers.Database.CreateQueryDef("", _
              "Select restaurantname from restaurants where groupid = '" _
               & strparams & "' and grouprating = '" & strRating & "'")
            Set rstChoice = qryTemp.OpenRecordset
            rstChoice.MoveLast
            rstChoice.MoveFirst
            
            Randomize
            rstChoice.Move CLng(Rnd() * (rstChoice.RecordCount - 1))
            Let strRestaurantName = rstChoice.Fields("restaurantname").Value
        End If
        Let strQuery = ""
        Let strSendData = strRestaurantName
  Case Is = "ARG"   'Add Restaurant to group
        Let position1 = InStr(strparams, " ")
        Let strName = Left(strparams, position1 - 1)
        Let strQuery = "Select groupid from users where username = '" & strName & "'"
        Let success = SubmitQuery(strQuery, strSendData)
        If (success > 0) Then
            Let strGroupID = Mid(strSendData, InStr(strSendData, vbCrLf) + 2)
            Let strGroupID = Left(strGroupID, InStr(strGroupID, vbTab) - 1)
            Let strparams = Mid(strparams, position1 + 1)
            Let strRestaurantName = strparams
            Let strQuery = "select restaurantname from restaurants where restaurantname = '" & strRestaurantName & "'" ' and groupid = '" & strGroupID & "'"
            Let strError = "ERR Error Restaurant already exists"
            thissuccess = SubmitQuery(strQuery, strSendData)
            If thissuccess = 0 Then
                Let strQuery = "insert into restaurants values('" & strGroupID & "','" & strRestaurantName & "','Often',FALSE)"
                Let strError = "ERR Error updating user group"
                thissuccess = SubmitQuery(strQuery, strSendData)
                If UCase(strGroupID) <> "All" Then
                    Let strQuery = "insert into restaurants values('All','" & strRestaurantName & "','Often',FALSE)"
                    thissuccess = SubmitQuery(strQuery, strSendData)
                End If
                Let strQuery = "Select distinct restaurantname from restaurants where restaurantname = '" & strRestaurantName & "' and groupid = '" & strGroupID & "'"
            End If
        Else
            Let strQuery = ""
            Let strError = "ERR UserName not found"
        End If
  Case Is = "DRG"   'Delete Restaurant
        Let position1 = InStr(strparams, " ")
        Let strName = Left(strparams, position1 - 1)
        Let strQuery = "Select groupid from users where username = '" & strName & "'"
        Let success = SubmitQuery(strQuery, strSendData)
        If (success > 0) Then
            Let strGroupID = Mid(strSendData, InStr(strSendData, vbCrLf) + 2)
            Let strGroupID = Left(strGroupID, InStr(strGroupID, vbTab) - 1)
            Let strparams = Mid(strparams, position1 + 1)
            Let strRestaurantName = strparams
            Let strQuery = "delete from restaurants where groupid = '" & strGroupID & "' and restaurantname = '" & strRestaurantName & "'"
            Let strError = "ERR Error updating user group"
        Else
            Let strQuery = ""
            Let strError = "ERR UserName not found"
        End If
  Case Is = "GGR"   'Get Group Restaurant Information
        Let strQuery = "Select restaurantname, grouprating from restaurants where groupid = '" + strparams + "' order by restaurantname"
        Let strError = "ERR No restaurants for group " + strparams
  Case Is = "SQL"   'SQL query
        Let strQuery = strparams
        Let strError = "ERR SQL Error"
  Case Is = "LGI"   'Log in
        If UCase(Left(strparams, 4)) = "ADD " Then strAdd = True: strparams = Mid(strparams, 5)
                
        Let position1 = InStr(strparams, " ")
        Let strName = Left(strparams, position1 - 1)
        
        Let strUserIP = Mid(strparams, position1 + 1)
        Let strUserIP = Left(strUserIP, InStr(strUserIP, " ") - 1)

        If strUserIP = frmLunchClient.Winsock2.LocalIP Then
            Let strQuery = "select u.groupid, g.confirmed, g.notificationtime, g.currentrestaurantchoice " & _
                       "from users u, groups g " & _
                       "where u.groupid = g.groupid " & _
                       "and u.username = '" & strName & "'"
            Let success = SubmitQuery(strQuery, strSendData)
        Else
            Let strQuery = "select u.groupid, g.confirmed, g.notificationtime, g.currentrestaurantchoice " & _
                       "from users u, groups g " & _
                       "where u.groupid = g.groupid " & _
                       "and u.username = '" & strName & "'" & _
                       "and u.loggedon = FALSE"
            Let success = SubmitQuery(strQuery, strSendData)
        End If
        
        If (success > 0) And (strAdd = False) Then
            Let strPleaseHold = strSendData
            Let strparams = Mid(strparams, position1 + 1)
            Let position1 = InStr(strparams, " ")
            Let strUserIP = Left(strparams, position1 - 1)
            Let strUserPort = Mid(strparams, position1 + 1)
            Let strQuery = "Update users set IPAddress = '" & strUserIP & "', port = '" & strUserPort & "', loggedon = true where username = '" & strName & "'"
            Let strError = "ERR Error updating user info"
            thissuccess = SubmitQuery(strQuery, strSendData)
            Let strQuery = ""
            Let strSendData = strPleaseHold
        ElseIf (success > 0) And (strAdd = True) Then
            Let strQuery = ""
            Let strSendData = "ERR UserID already exists!"
        ElseIf (success = 0) And (strAdd = True) Then
            Let strparams = Mid(strparams, position1 + 1)
            Let position1 = InStr(strparams, " ")
            Let strUserIP = Left(strparams, position1 - 1)
            Let strUserPort = Mid(strparams, position1 + 1)
            Let strQuery = "insert into users values('" & strName & "','All','" & strUserIP & "','" & strUserPort & "',true)"
            Let addsuccess = SubmitQuery(strQuery, strSendData)
        Let strQuery = "select u.groupid, g.confirmed, g.notificationtime, g.currentrestaurantchoice " & _
                       "from users u, groups g " & _
                       "where u.groupid = g.groupid " & _
                       "and u.username = '" & strName & "'"
        Let strError = "ERR Error adding " & strName
        ElseIf (success = 0) And (strAdd = False) Then
            Let strQuery = ""
            Let strSendData = "ERR No Users Found, or This Name is already logged in"
        End If
  Case Is = "LGO"
        strQuery = "update users set loggedon = FALSE where username = '" & strparams & "'"
  Case Is = "SYV"
        Let strQuery = "update groups set currentyesvotes = (currentyesvotes + 1) where groupid = '" & strparams & "'"
  Case Is = "SNV"
        Let strQuery = "update groups set currentnovotes = (currentnovotes + 1) where groupid = '" & strparams & "'"
  Case Is = "BYE"   'close socket'
        strSendData = "C-Ya!" & vbCrLf & vbCrLf
        strControl = "BYE"
  Case Is = "HLP"
        strQuery = ""
        strSendData = GetHelpScreen(strparams)
  Case Else
        strSendData = "ERR Invalid Request" & vbCrLf
End Select

  If strQuery <> "" Then
    Let success = SubmitQuery(strQuery, strSendData)
    If success = 0 Then
        strSendData = strError & vbCrLf
    End If
  End If

    dtUsers.Refresh
    DBGrid1.Refresh
    Winsock1.SendData strRequest & vbCrLf & strSendData

End Sub

Private Function SubmitQuery(ByVal strQuery As String, strReturn As String, Optional pass As String) As Long
On Error GoTo ErrorHandler

Dim qryTemp As QueryDef
Dim FieldCount As Integer
Dim querytype As String
Dim rstUsers As Recordset

  Let querytype = UCase(Left(strQuery, InStr(strQuery, " ") - 1))

 Select Case querytype
 Case Is = "SELECT"
    Set qryTemp = dtUsers.Database.CreateQueryDef("", strQuery)
    Set rstUsers = qryTemp.OpenRecordset
    rstUsers.MoveLast
    rstUsers.MoveFirst

  If rstUsers.RecordCount > 0 Then
    'Send Column Headings First
    Let strReturn = ""
    For FieldCount = 0 To (rstUsers.Fields.Count - 1)
      Let strReturn = strReturn & rstUsers.Fields(FieldCount).Name & vbTab
    Next FieldCount
    Let strReturn = strReturn + vbCrLf
    
    rstUsers.MoveFirst
  
  Do While rstUsers.EOF = False
    For FieldCount = 0 To (rstUsers.Fields.Count - 1)
      If (rstUsers.Fields(FieldCount).Type = Number) _
      Then Let strReturn = strReturn & Str(rstUsers.Fields(FieldCount).Value) & vbTab _
      Else Let strReturn = strReturn & rstUsers.Fields(FieldCount).Value & vbTab
    Next FieldCount
    Let strReturn = strReturn + vbCrLf
    rstUsers.MoveNext
  Loop
  End If
  Let SubmitQuery = rstUsers.RecordCount
 Case Else
    dtUsers.Database.Execute strQuery
    Let SubmitQuery = dtUsers.Database.RecordsAffected
    dtUsers.Refresh
    DBGrid1.Refresh
 End Select
 
ErrorHandler:
    Select Case Err.Number
    Case 3134
        MsgBox (Err.Description)
    End Select
End Function

Private Sub Winsock1_SendComplete()
        Winsock1.Close
        Winsock1.Listen
End Sub

Private Sub Winsock2_DataArrival(ByVal bytesTotal As Long)
    
    Winsock2.GetData strClientDataRecieved
    
End Sub

Private Sub GetNextTime()
    Dim qryTemp As QueryDef
    Dim rstUsers As Recordset

    Set qryTemp = dtUsers.Database.CreateQueryDef("", "Select min(notificationtime) as [Notification Time] from groups where notificationtime > #" & Format(Now, "hh:mm:ss AMPM") & "#")
    Set rstUsers = qryTemp.OpenRecordset
    rstUsers.MoveLast
    rstUsers.MoveFirst
    
    If IsNull(rstUsers.Fields("Notification Time").Value) Then
        Set qryTemp = dtUsers.Database.CreateQueryDef("", "Select min(notificationtime) as [Notification Time] from groups")
        Set rstUsers = qryTemp.OpenRecordset
    End If
    If rstUsers.RecordCount <> 0 Then
        Let timNextTime = rstUsers.Fields("Notification Time").Value
    End If
    
    Call GetNextConfirm
End Sub

Private Sub CheckConnections()
Static THISSTATE As Boolean
  If THISSTATE = False Then
    Dim qryTemp As QueryDef

    Set qryTemp = dtUsers.Database.CreateQueryDef("", "select username, ipaddress, port from users where loggedon = true")
    Set rstIPCFC = qryTemp.OpenRecordset
    
   If rstIPCFC.RecordCount > 0 Then
    rstIPCFC.MoveFirst
    THISSTATE = True
   End If
  Else
    Dim strQuery As String
    Dim strtemp As String
    Dim success As Long
    Dim strGetData As String

    If rstIPCFC.EOF = False Then
        If Not ClientConnect("CFC Are you there?", strGetData, rstIPCFC.Fields("ipaddress").Value, rstIPCFC.Fields("port").Value) Then
            If Left(strGetData, 3) = "ERC" Then
                strQuery = "update users set loggedon = false where username = '" & rstIPCFC.Fields("username").Value & "'"
                success = SubmitQuery(strQuery, strtemp)
            End If
        End If
        rstIPCFC.MoveNext
    Else
        THISSTATE = False
    End If
  End If
End Sub
Private Sub SetUpConfirmationTimes(strGroups As String)
    Dim strQuery As String
    Dim strtemp As String
    Dim success As Long
    Dim qryTemp As QueryDef
    Dim rstTimes As Recordset
    
    If strGroups = "ALL" Then
        Set qryTemp = dtUsers.Database.CreateQueryDef("", "Select groupid, notificationtime from groups")
        Set rstTimes = qryTemp.OpenRecordset
    
        rstTimes.MoveFirst
        Do While rstTimes.EOF = False
            Let strQuery = "update groups set confirmationtime = #" & DateAdd("n", intConfirmationWait, rstTimes.Fields("notificationtime").Value) & "# where groupid = '" & rstTimes.Fields("groupid").Value & "'"
            success = SubmitQuery(strQuery, strtemp)
            rstTimes.MoveNext
        Loop
    Else
        Set qryTemp = dtUsers.Database.CreateQueryDef("", "Select notificationtime from groups where groupid = '" & strGroups & "'")
        Set rstTimes = qryTemp.OpenRecordset
        
        Let strQuery = "update groups set confirmationtime = #" & DateAdd("n", intConfirmationWait, rstTimes.Fields("notificationtime").Value) & "# where groupid = '" & strGroups & "'"
        success = SubmitQuery(strQuery, strtemp)
    End If

    DBGrid1.Refresh
    
End Sub

Private Sub GetNextConfirm()
    Dim qryTemp As QueryDef
    Dim rstUsers As Recordset

    Set qryTemp = dtUsers.Database.CreateQueryDef("", "Select min(confirmationtime) as [Confirmation Time] from groups where confirmationtime > #" & Format(Now, "hh:mm:ss AMPM") & "#")
    Set rstUsers = qryTemp.OpenRecordset
    rstUsers.MoveLast
    rstUsers.MoveFirst
    
    If IsNull(rstUsers.Fields("Confirmation Time").Value) Then
        Set qryTemp = dtUsers.Database.CreateQueryDef("", "Select min(confirmationtime) as [Confirmation Time] from groups")
        Set rstUsers = qryTemp.OpenRecordset
    End If
    If rstUsers.RecordCount <> 0 Then
        Let timNextConfirm = rstUsers.Fields("Confirmation Time").Value
    End If
End Sub

Public Function ClientConnect(strSendData As String, strGetData As String, Optional strServer, Optional lPort) As Boolean
  'Is this procedure being run already?  (for doEvents() protection - and socket errors)
  If bClientConnectLock = False Then
    Dim temp As Integer
    
    'Lock this procedure so that it can't be run while we're using it
    Let bClientConnectLock = True
    
    'set up the Socket for the connection to Server
    If IsMissing(lPort) Then
        Winsock2.RemoteHost = strServerSelect
        Winsock2.RemotePort = lngServerPort
    Else
        Winsock2.RemoteHost = strServer
        Winsock2.RemotePort = lPort
    End If
    
    'IMPORTANT STEP!  As I came to find, you have to continually set this to zero
    'so you know that it will pick a random port everytime.
    Winsock2.LocalPort = 0
    Winsock2.Connect
    
    'Wait for connect or error
    Do
        temp = DoEvents()
    Loop Until (Winsock2.State = sckConnected) Or (Winsock2.State = sckError)
    
    'Check to see if it connected or failed
    If Winsock2.State = sckConnected Then
    
        'It connected, now send the data
        Winsock2.SendData strSendData
        
        'set up the compare variables and start the timer
        Let strClientDataRecieved = ""
        bTimeOut = False
        TimeOut.Interval = vbWaitForRecieve
        TimeOut.Enabled = True
        'Wait for data to come in
        Do
            temp = DoEvents()
        Loop Until (strClientDataRecieved <> "") Or bTimeOut

        'check to see if any data was recieved, or if we timed out.
        If strClientDataRecieved <> "" Then

            'Data was recieved - set strDataRecieved and Exit function
            Let strGetData = strClientDataRecieved
            TimeOut.Enabled = False
            ClientConnect = True
        
        Else
            
            'Waited too long for recieve...
            strGetData = strSocketError
            ClientConnect = False
        
        End If
    
    Else
        
        'Error trying to connect
        strGetData = "ERC " & strSocketError
        ClientConnect = False
    
    End If
    
    Winsock2.Close
    bClientConnectLock = False
    
  Else
    
    'error... trying to connect while already running
    strGetData = "SLOWDOWN!"
    ClientConnect = False
    
  End If

End Function

Private Sub Winsock2_Error(ByVal Number As Integer, Description As String, ByVal Scode As Long, ByVal Source As String, ByVal HelpFile As String, ByVal HelpContext As Long, CancelDisplay As Boolean)
    strClientSocketError = Description
End Sub

Private Function GetHelpScreen(Params As String) As String

    GetHelpScreen = vbCrLf & vbCrLf & _
        "JTG - Joint This Group (username,groupid)" & vbCrLf & _
        "UNT - Update Notification Time(username,new time)" & vbCrLf & _
        "URW - Update Restaurant Weight (username,rating,restaurant name)" & vbCrLf & _
        "ADG - Add New Group (username,groupid)" & vbCrLf & _
        "GAU - Get All User Info" & vbCrLf & _
        "GUL - Get Users Logged In" & vbCrLf & _
        "GAG - Get All Group Info" & vbCrLf & _
        "GCG - Get This Groups Info (groupid)" & vbCrLf & _
        "GAR - Get All Restaurant Names" & vbCrLf & _
        "GDG - Get Distinct Restaurants" & vbCrLf & _
        "GRR - Get Random Restaurant" & vbCrLf & _
        "ARG - Add Restaurant to group (username, restaurant name)" & vbCrLf & _
        "DRG - Delete Restaurant from group (username, restaurant name)" & vbCrLf & _
        "GGR - Get Group Restaurant Information (groupid)" & vbCrLf & _
        "SQL - Run SQL command (Sql command)" & vbCrLf & _
        "LGI - Log In (username, ipaddress, port)" & vbCrLf & _
        "LGO - Log Off (username)" & vbCrLf & _
        "SYV - Send Yes Vote" & vbCrLf & _
        "SNV - Send No Vote" & vbCrLf & _
        "BYE - Quit/Exit" & vbCrLf & _
        "HLP - Show Help Screen" & vbCrLf & vbCrLf

End Function
