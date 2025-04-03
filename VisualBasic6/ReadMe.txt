LunchTime 1.0  ---  Readme.txt

Overview
--------------------
The lunch server is based on a Microsoft Access database.  There are
three tables that are kept:  Users, Groups, and Restaurants.  The 
database file is called lunch.mdb and is kept in the same directory
as the executable file.  There is also an initialization file called
lunch.ini that is kept in the same directory as the .exe file.  

The Users table holds the Username, GroupID, the Users IP
address and Port, and an indicator to whether or not they are
currently logged in (connections to the server are dynamic, like http.
Clients connect only long enough to get/set the information they need).

The Groups table holds the GroupID, the Time of Notification
for the members in the group, the Current Restaurant choice for that
group, the Current number of "Yes" votes received on this choice, 
the current number of "No" votes received for this choice, Confirmation
indicator for this choice, and confirmation time set up by the program.

The Restaurants table holds the Restaurant Name, the GroupIDs
that have that restaurant in their list, the Occurance Rating of 
that restaurant for that group, and a flag that indicates whether it has
been sent out as a selection already.

The main idea is that users organize themselves into groups that would
go to lunch together.  They would give themselves a groupid, put 
restaurants into their groups list and set a time for the server to
generate a random choice for them and to notify them of that choice.
The user would minimize this window and forget about it.  When a group's
notification time arrives, the server will pick a random selection
for that group, store it in the 'groups' table, get all the IP addresses
of the users in that group, and send them all a notification of the
restaurant choice.  This will appear in the black screen in the main
window.  The window will pop up when the choice is made and their 
notification time has been reached.  Each user can then choose to 
send in a 'Yes' or 'No' vote on that choice, and in predefined time
span (specified in the 'VOTEWAIT:' parameter in the initialization file)
the server will tally the votes.  Then, after the VoteWait time has passed
if the majority votes 'Yes', then a confirmation notification is sent to
each client which turns the LED green.  If the majority votes no, then 
another random selection is made and broadcast to the group.  This 
happen until all restaurants in the list have been exhausted, then the text
"No Restaurants Set Up" will appear.  If the users want, they can just hit the
'Random Selection' button on the main panel to get a continuous stream
of random choices until they find one that they like.


Operation
----------------------
As Delivered, there is only one user and one group defined.  The 
username is "LunchMaster" and the group is "Default".  There are two
ways to log in.  First, you can log in by selecting 'Start - Login'
and type your userid at the prompt and hit enter.  If you are starting
the program up for the first time, you will use "LunchMaster" as your
userid.  The other method would be to place a line in the initialization
file that reads:

	USERNAME: <put username here>

Then, everytime the program is started up, it will read your username
from the file, and you won't have to type it.  If you log in successfully,
then a message box will appear confirming that fact.  You must press 'OK'
to continue.  If you don't want this message box to appear, you can
set a line in your Initialization file as such (also, once you successfully 
log in, your username will appear in the title bar):

	LoginNotify: False   (set to 'True' if you want the message box)

If you are running just the client, then you need to specify the server
Address and port in the initialization file.  These are done as:

	Server: <server name or IP address> <port number>

In order to run your own server, you will need to set the server to your
local loopback IP address:

	Server: 127.0.0.1 {your listening port}

This tells the program to run your copy of the program as the server,
and to open the database on your machine.
Specify which port will be used as the 'listening port'.  This has been 
defaulted to 2627.  You can change this in the intialization file as
'ListenPort:' under the [Server Parameters] section.

	ListenPort: {your listening port}

When you start up the program, the username is taken and searched for
in the database.  If it is found, then the IP address of the client
is stored, the listening port of the client is stored (for notification
and message sending purposes, a random port number is assigned to the client
at startup, and stored in the DB), and the 'LoggedIn' field is set to 'TRUE'.
The 'Administer' menus are enabled as well as the voting buttons at the
bottom of the main panel.

After you have logged in, you are free to administer different settings
for yourself and your group.

Administer - User Info
------------------------------
This panel will show you who is currently logged in, and all of the 
usernames currently in the database.  You will see which groups they
belong to, and also see their IP addresses and listening ports.  If you
right click on a highlighted name, you can type a short message to send
 to that person, which will pop-upin their Restaurant Notification window.  
You can also start a chat session with someone in this same manner.
You cannot modify/add/delete anything from this panel.

Administer - Group Info
-----------------------------
From this panel you can see all of the groups currently set up in the
database, their notification time, Current/Last restaurant choice,
and current number of 'Yes' and 'No' votes recieved on this choice.
 You can add new groups by pressing the 'Add New Group' button,
typing in a new name at the prompt, and pressing enter.  This new group
will become your current GroupID.  You can join any other group at 
any time by right clicking on a highlighted group name, and clicking on
'Join This Group'.  You can also update your groups notification
time from thie panel by putting in the new time and pressing the 
'Update Notify Time' button.  If you change groups, and want to see the
current confirmation status of the restaurant choice, just click
Start-Login from the menu.  This will send a login command to the server
and it will send back the confirmation status of the current choice.  You
don't need to do this if the choice hasn't been presented yet (the 
notification time hasn't been reached yet.)

Administer - Restaurants
------------------------------
From this panel you can view all the restaurants in the database in the
listbox to the left.  On the right, there is a combo box with all the
current groupids in the database, and you can use this combo box to 
browse through the restaurants that are in each groups list.  You can
add restaurants from the 'pool' to your group, or remove them from
your group.  You can add new restaurants to the 'pool' and to your group.
You can also set the occurance rate for each restaurant in your group.
The 'pool' is the listbox on the leftside of the screen.  Whenever a
restaurant is added to the current group, it is added to the entire pool
so that anyone else can access it.  Although many other groups can have
the same restaurant, they can all have different occurance ratings for them.
If the executives want the maisonette to come up more often, then they
can set it up that way.

Occurance Rate
------------------------------
This is used in the random selection of restaurants.  You would set
the restaurants you want to show up the most as 'often', the ones you
want to show up the least as 'seldom' and the 'once in a while' restaurants
to 'Sometimes'.  These could be interpreted as 'Cheap', 'Reasonable',
and 'Expensive'.  You would want McDonalds to come up more often than
say, The Maisonette.  So you would set McDonalds to 'Often', and The
Maisonette to 'Seldom'.  There are two parameters in the intialization 
file that need to be set for these variables as well.  They are the 
cutoff points of these groups... think of them as percentages of 100%.
If you want the 'Often' group to come up 50% of the time, you would
set:

	OftenMark: 50

Then you would set the 'Seldom Mark' so that the remaining 50% was 
divided up as you want it.  So if we want the 'Sometimes' rate to 
show up 35% of the time, we would add 35 to 50 and set:

	SeldomMark: 85

With these settings you are telling the server that you want random
numbers less .50 to resolve to 'Often', numbers greater than .85 to
resolve to 'Seldom', and numbers between .5 and .85 to resolve to 
'Sometimes'.  This is how random selection is done.

Security
-----------------------------
This system has no security except for the deleting of users and groups.
The only person that can delete a user or group is the LunchMaster.
This system was created on the idea that it would be used in a friendly
work environment where people don't need to worry about others messing
with their settings.  Future releases may have more security, but for now
we will stick with this.

Warnings.. Notes...
------------------------------
For this version, you cannot place certain punctuation in the fields
for groupid or username or restaurant name (like apostrophe's).

Username must be one word, but groupid and restaurant names can be 
multiple words.

Be careful with Case sensitivity.  This isn't fully tested, and I'm not
sure where case differences will affect groups.  There is code to keep
similar restaurant names from being added, but not certain on usernames
and/or groupids








