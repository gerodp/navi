
var DATABASE_NAME = 'sessionTrackerDB';

function DEBUG(msg)
{
	console.log(arguments.callee.name + " : " + msg);
}

function errorHandler(e)
{
	console.log("Error ocurred: " + e.message);
}

function dateToStr(date)
{
	var str = '';
	
	str += date.getFullYear();
	str += '/';
	
	var month = date.getMonth();
	
	if( month < 10 )
		str += '0';
	
	str += month;
	str += '/';
	
	var day = date.getDate();
	
	if(day < 10 )
		str += '0';
	str += day;
	
	return str;
}

function timeToStr(seconds,verbose)
{
	var days = parseInt(seconds / (24*3600));
	
	var remainingSeconds = seconds % (24*3600);
	
	var hours = parseInt(remainingSeconds / 3600);
	
	remainingSeconds = remainingSeconds % (3600);
	
	var minutes = parseInt(remainingSeconds / 60);
	
	if( verbose )
	{
		var result = "";
		
		if( days > 0 )
			result += days + " days ";
		if( hours > 1 )
			result += hours + " hours and ";
		else if(hours > 0 )
			result += hours + " hour and ";
		
		result += minutes + " minutes";
		
		return result;
	}
	else
	{
		var result = "";
		
		if(days < 10)
			result += "0";
		result += days + ":";
		
		if(hours < 10)
			result += "0";
		result += hours + ":";;
		
		if(minutes < 10)
			result += "0";
		result += minutes;
		
		return result;
	}
}

function strToDate(str)
{
	var year  = parseInt( str.substring(0,3) );
	var month = parseInt( str.substring(5,6) );
	var day   = parseInt( str.substring(10,11) );
	
	return new Date(year, month, day);
}

function extractDomain(url)
{
	if( url == null )
		return null;
	
	var begin  = 0;
	var end    = url.length;
	var prefix = "http://";
	
	var httpSubStr = url.indexOf(prefix);
	
	if( httpSubStr == -1 )
	{
		prefix     = "https://";
		httpSubStr = url.indexOf(prefix);
	}
	
	if( httpSubStr == -1 )
		return null;
	else
		begin = httpSubStr + prefix.length;
		
	var domainEnd = url.indexOf("/", begin);
	
	if( domainEnd != -1 )
		end = domainEnd;
	
	return url.substring(begin,end);
}

function getCurrentTime()
{
	var date = new Date();
	
	return date.getTime() / 1000;
}

function ActiveSession(domain, initialTime)
{	
	this.domain      = domain;
	this.initialTime = initialTime;
}

ActiveSession.prototype.getDomain = function()
{
	return this.domain;
}

ActiveSession.prototype.getInitialTime = function()
{
	return this.initialTime;
}

function Session(domain, date, duration)
{
	this.domain   = domain;
	this.date	  = date;
	this.duration = duration;
}

Session.prototype.getDuration = function()
{
	return this.duration;
}

Session.prototype.getDate = function()
{
	return this.date;
}

Session.prototype.getDomain = function()
{
	return this.domain;
}

function SessionStorage()
{
	this.database = null;
}

SessionStorage.prototype.load = function(dbName)
{
	this.database = openDatabase(dbName, '1.0', 'Offline document storage', 5*1024*1024, null);
	
	this.database.transaction( function(t)
								{	
									t.executeSql('CREATE TABLE IF NOT EXISTS sessions (domain Text, date Text, duration Number, PRIMARY KEY(domain,date))');
								}, errorHandler);
	
}

SessionStorage.prototype.updateSession = function(activeSession)
{
	var dateStr = dateToStr(activeSession.getDate());
		
	this.database.transaction(
		function(t)
		{
			t.executeSql('UPDATE sessions SET duration=duration+? WHERE domain=? AND date=?', 
						[activeSession.getDuration(), activeSession.getDomain(), dateStr], null, errorHandler);
		},
		errorHandler
	);
}

SessionStorage.prototype.insertSession = function(session)
{
	var dateStr = dateToStr(session.getDate());
	
	this.database.transaction(
		function (t) 
		{
			t.executeSql('INSERT INTO sessions (domain,date,duration) VALUES (?,?,?)',
						[session.getDomain(), dateStr, session.getDuration()], null, errorHandler );
		},
		errorHandler);
}

SessionStorage.prototype.getSessions = function(startDate, endDate, sessionListener)
{
	var startDateStr = dateToStr(startDate);
	var endDateStr   = dateToStr(endDate);
								
	this.database.readTransaction(
		function (t) 
		{			
			t.executeSql('SELECT * FROM sessions WHERE date>=? AND date<=?', [startDateStr,endDateStr], 
				function (t, data) 
				{
					var surfSessionArray = new Array();
					
					for( var i=0; i<data.rows.length; i++ )
					{
						var selRow = data.rows.item(i);
						
						surfSessionArray.push( new Session(selRow.domain, selRow.date, selRow.duration) ); 
					}
					
					sessionListener.setSessions( surfSessionArray );
				},
				errorHandler );
		});
}

function ActiveSessionManager()
{	
	this.activeSession = null;
	
	this.sessionStorage = new SessionStorage();
	
	this.sessionStorage.load( DATABASE_NAME );
}

ActiveSessionManager.prototype.terminateCurrentSession = function()
{
	if( this.activeSession != null )
	{
		var activeSessionDuration = getCurrentTime() - this.activeSession.getInitialTime();
		
		var se = new Session( this.activeSession.getDomain(), new Date(), activeSessionDuration );
		
		this.sessionStorage.updateSession( se );
		
		this.activeSession = null;
	}
}

ActiveSessionManager.prototype.currentPageChanged = function(url)
{
	this.terminateCurrentSession();
	
	var domain = extractDomain(url);
	
	DEBUG("Current page changed: " + domain);
	
	if( domain != null )
	{
		this.activeSession = new ActiveSession( domain, getCurrentTime() );
	
		var se = new Session( domain, new Date(), 0 );
		
		this.sessionStorage.insertSession( se );
	}
}

ActiveSessionManager.prototype.getSessions = function(startDate, endDate, sessionListener)
{
	//Updates database with current session info.
	if( this.activeSession != null )
	{
		this.currentPageChanged( "http://" + this.activeSession.getDomain() );
	}
	
	this.sessionStorage.getSessions(startDate, endDate, sessionListener);
}

