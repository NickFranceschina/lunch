-- ----------------------------------------------------------
-- MDB Tools - A library for reading MS Access database files
-- Copyright (C) 2000-2011 Brian Bruns and others.
-- Files in libmdb are licensed under LGPL and the utilities under
-- the GPL, see COPYING.LIB and COPYING files respectively.
-- Check out http://mdbtools.sourceforge.net
-- ----------------------------------------------------------

-- That file uses encoding UTF-8

CREATE TABLE Users
 (
	IPAddress			varchar (15), 
	UserName			varchar (20), 
	GroupID			varchar (20), 
	LoggedOn			boolean NOT NULL, 
	Port			int
);

-- CREATE INDEXES ...
ALTER TABLE Users ADD PRIMARY KEY (UserName);

CREATE TABLE Groups
 (
	CurrentRestaurantChoice			varchar (30), 
	CurrentYesVotes			int, 
	CurrentNoVotes			int, 
	GroupID			varchar (20), 
	NotificationTime			datetime, 
	Confirmed			boolean NOT NULL, 
	ConfirmationTime			datetime
);

-- CREATE INDEXES ...
ALTER TABLE Groups ADD PRIMARY KEY (GroupID);

CREATE TABLE Restaurants
 (
	GroupID			varchar (20), 
	RestaurantName			varchar (30), 
	GroupRating			varchar (50), 
	Chosen			boolean NOT NULL
);

-- CREATE INDEXES ...


-- CREATE Relationships ...
-- relationships are not implemented for mysql
