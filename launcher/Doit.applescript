-- Doit launcher. A stay-open applet: double-click it to start the
-- server and open the board; quit it (Cmd-Q, or Quit from its Dock icon)
-- to stop the server again.
--
-- This is the source. Build the app with launcher/build.sh, which fills in
-- __PROJECT_DIR__ below with the project folder's path. The real work is in
-- launcher/start-server.sh, so changing that needs no rebuild.

global projectDir, boardURL, logFile, serverPID

on setup()
	set projectDir to "__PROJECT_DIR__"
	set boardURL to "http://localhost:4317/"
	set logFile to (POSIX path of (path to application support folder from user domain)) & "Doit/server.log"
end setup

on run
	setup()
	set serverPID to ""

	-- Already running (another launcher, or npm start in a terminal):
	-- just open the page, and don't own a server we didn't start.
	if serverAnswers() then
		open location boardURL
		quit
		return
	end if

	try
		set serverPID to do shell script quoted form of (projectDir & "/launcher/start-server.sh")
	on error
		showFailure("The server could not be started.")
		quit
		return
	end try

	-- Wait up to 20 seconds for it to answer.
	repeat 80 times
		if serverAnswers() then
			open location boardURL
			return
		end if
		if not serverAlive() then exit repeat
		delay 0.25
	end repeat

	stopServer()
	showFailure("The server did not start.")
	quit
end run

-- Clicking the Dock icon again reopens the board.
on reopen
	if serverPID is not "" then open location boardURL
end reopen

-- Notice a server that stopped on its own, instead of sitting in the Dock
-- looking as if it were still running.
on idle
	if serverPID is not "" and not serverAlive() then
		set serverPID to ""
		showFailure("The server stopped.")
		quit
	end if
	return 5
end idle

on quit
	stopServer()
	continue quit
end quit

on serverAnswers()
	try
		do shell script "curl -s -o /dev/null --max-time 1 " & quoted form of boardURL
		return true
	on error
		return false
	end try
end serverAnswers

on serverAlive()
	if serverPID is "" then return false
	try
		do shell script "kill -0 " & serverPID
		return true
	on error
		return false
	end try
end serverAlive

-- SIGTERM lets the server close cleanly. Give it five seconds.
on stopServer()
	if serverPID is "" then return
	try
		do shell script "kill " & serverPID
	end try
	repeat 20 times
		if not serverAlive() then exit repeat
		delay 0.25
	end repeat
	if serverAlive() then
		try
			do shell script "kill -9 " & serverPID
		end try
	end if
	set serverPID to ""
end stopServer

on showFailure(headline)
	set tailText to ""
	try
		set tailText to do shell script "tail -n 15 " & quoted form of logFile
	end try
	display dialog headline & return & return & tailText & return & return & "Full log: " & logFile buttons {"OK"} default button 1 with title "Doit" with icon stop
end showFailure
