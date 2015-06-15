/*
 * Copyright (c) 2015 EXILANT Technologies Private Limited
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/**
 * @module this is a crude way of putting the version of the engine
 */
var getExilityVersion = function() {
	return '3.3.0 19-Apr-2014';
};
/**********************************************************************************************
*
* EXILANT CONFIDENTIAL
* _____________________________________________________________________________________________
*
*  [2004 - 2013]  EXILANT Technologies Pvt. Ltd.
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains the property of EXILANT
* Technologies Pvt. Ltd. and its suppliers, if any.  
* The intellectual and technical concepts contained herein are proprietary to   
* EXILANT Technologies Pvt. Ltd. and its suppliers and may be covered by India and 
* Foreign Patents, patents in process, and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material is strictly forbidden 
* unless prior written permission is obtained * from EXILANT Technologies Pvt. Ltd.
***********************************************************************************************/

/**********************************************************************************************
*
* PURPOSE
* _____________________________________________________________________________________________
*
* This file defines a 'class' that is used to work with 'Background Jobs'.
* A service entry can be marked as "submitAsBackgroundProcess". When this attribute is true,
* Exility spawns a new thread and runs the service under the new thread. That way, the calling
* program returns immediately while the background process is still running.
* 
* When that happens, the returned DC contains the most recently created background job id
* Additionally, everytime a service call returns, the DC contains the status of each background
* job. One can also query for the status of a background job at any time (however, this will also
* delete the status after the first call)
* 
* This file defines a class that can be used on the client side to work with the returned
* background job information, most notably,
* 1. Paint/update UI using your custom function everytime a change happens in the 
* submitted background process list
* 2. Call a status checker service to know the status of a given background job. The service
* can be called based on an event or can be set to poll continuously.
************************************************************************************************/

/***********************************************************************************************
* Date			Version		Author			Comments
*-------------------------------------------------------------------------------------------
* 30-Oct-2013	 1.0.0		Vishnu Sharma	First draft
*-------------------------------------------------------------------------------------------
***********************************************************************************************/

/**
 * The object that you can use to work with the collection of background jobs.
 * Notice the Pascal case usage, we are creating a class, remember !
 */
var BackgroundJobs = function (){
	debug("BackgroundJobs Object Created...");	
	/**
	 * Holds the list of all background jobs in the current session
	 */
	this.allBackgroundJobs = [];
				
	/**
	 * Each call to the server updates the status of the background jobs in the returned DC.
	 * Set that value for client usage.
	 * ARGUMENTS:
	 * 1) se - The service entry. This also has DC that contains key/value pairs, separated by semicolon for each job and its status
	 * 			(e.g. jobid1=running;jobid2=complete). If user requested for the special service named
	 * 			"getBackgroundJobResult", then this field contains only the status "done/running" and the 
	 * 			DC contains the job completion result
	 * RETURNS:
	 * None
	 */
	this.setAllBackgroundJobStatuses = function(se){
		var dc = se.dc;
		if( dc === null || typeof dc === ClientConstants.TYPE_IS_UNDEFINED) return;		
		
		if(se.serviceId == ClientConstants.BACKGROUND_JOB_STATUS_SERVICE_ID && 
				dc.hasValue(ClientConstants.BACKGROUND_JOB_STATUS_FIELD)){
			//we have status of a specific job id
			var jobId = dc.getValue(ClientConstants.BACKGROUND_JOB_ID_FIELD);
			var idx = this.addJob(jobId, dc.getValue(ClientConstants.BACKGROUND_JOB_STATUS_FIELD));
			if(dc.getValue(ClientConstants.BACKGROUND_JOB_STATUS_FIELD) == 
				ClientConstants.BACKGROUND_JOB_IS_DONE)
				this.allBackgroundJobs[idx].dc = dc;//set the job completion result DC
		}else if(dc.hasValue(ClientConstants.BACKGROUND_JOBS_FIELD)){			
			//We have status of all jobs in this session			
			var jobStatuses = dc.getValue(ClientConstants.BACKGROUND_JOBS_FIELD).split(ClientConstants.KEY_VALUE_LIST_SEPARATOR);
			
			for(var count=0; count < jobStatuses.length; count++){
				var theJobStatus = jobStatuses[count].split(ClientConstants.KEY_VALUE_SEPARATOR);
				this.addJob(theJobStatus[0], theJobStatus[1]);
			}
		}		
	};
	/**
	 * Remove the job from this collection
	 * ARGUMENTS:
	 * 1) jobId - The job id to match for removal
	 * RETURNS: None
	 */
	this.removeJob = function(jobId){
		var idxToRemove = -1;
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			var bgJob = this.allBackgroundJobs[count];
			if(bgJob.jobId == jobId){
				idxToRemove = count;
				break;
			}	
		}
		if(idxToRemove >= 0)
			this.allBackgroundJobs.splice(idxToRemove, 1);
	};
	/**
	 * Add a new job to this collection. If the job already exists, it will be replaced
	 * ARGUMENTS:
	 * 1) jobId - The job id
	 * 2) status - The job status
	 * RETURNS: index of the newly added job in the collection
	 */
	this.addJob = function(jobId , status){
		if(this.hasJob(jobId)) this.removeJob(jobId);
		this.allBackgroundJobs[this.allBackgroundJobs.length]= new BackgroundJob(jobId,status);
		return (this.allBackgroundJobs.length - 1);
	};
	/**
	 * Get the count of background jobs in the current user session
	 * ARGUMENTS: None
	 * RETURNS: numeric
	 */
	this.getCountOfBackgroundJobs = function(){
		return this.allBackgroundJobs.length;
	};
	/**
	 * Check if the collection has the given job with the job id
	 * ARGUMENTS:
	 * 1) bgJobId - The background job id to check
	 * RETURNS: boolean
	 */
	this.hasJob = function(bgJobId){
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			var bgJob = this.allBackgroundJobs[count];
			if(bgJob.jobId == bgJobId)
				return true;
		}
		return false;
	};
	/**
	 * Get the status of the given background job
	 * ARUGMENTS:
	 * 1) bgJobId - The background job id
	 * RETURNS:
	 * The status string (done/running) if jobid found else null
	 */
	this.getBackgroundJobStatus = function(bgJobId){
		var bgJob = null;
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			bgJob = this.allBackgroundJobs[count];
			if(bgJob.jobId == bgJobId)
				return bgJob.status;
		}
		return null;
	};
	/**
	 * Check if the job is running
	 * ARGUMENTS:
	 * 1)bgJobId - The background job id to check the status for
	 * RETURNS: boolean
	 */
	this.isJobRunning = function(bgJobId){
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			bgJob = this.allBackgroundJobs[count];
			if(bgJob.jobId == bgJobId)
				return (bgJob.status === ClientConstants.BACKGROUND_JOB_IS_RUNNING);
		}
		return ClientConstants.BACKGROUND_JOB_IS_DONE;
	};
	/**
	 * Check if there are one or more jobs pending for completion
	 * ARGUMENTS: None
	 * RETURNS: boolean
	 */
	this.hasPendingJobs = function(){
		return (this.getCountOfPendingJobs() > 0);
	};
	/**
	 * Get how many jobs are pending
	 * ARGUMENTS:None
	 * RETURNS: numeric
	 */
	this.getCountOfPendingJobs = function(){
		var countOfPendingJobs = 0;
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			bgJob = this.allBackgroundJobs[count];
			if (bgJob.status === ClientConstants.BACKGROUND_JOB_IS_RUNNING)
				countOfPendingJobs++;
		}
		return countOfPendingJobs;
	};
	/**
	 * Get the job id that is still running. There is no method to mark
	 * the job as complete. It is mandates that the job status is marked complete
	 * only when the server action sets it
	 * ARGUMENTS: None
	 * RETURNS: JobId whose status is "running" else null
	 */
	this.getNextPendingJobId = function(){
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			bgJob = this.allBackgroundJobs[count];
			if (bgJob.status === ClientConstants.BACKGROUND_JOB_IS_RUNNING)
				return bgJob.jobId;
		}
		return null;
	};
	/**
	 * Clear information about all background jobs
	 * ARGUMENTS: None
	 * RETURNS: None
	 */
	this.clear = function(){
		this.allBackgroundJobs = [];
	};
};

/**
 * Represents a single background job
 */ 
var BackgroundJob = function (jobId, status){
	this.jobId = jobId;
	this.status = status;
	this.dc = null;
};
/**
 * Configuration parameters used by Exility client side engine. This file
 * provides the default values. An application can over-ride these in their
 * projectParameters.js which will have to be included after this file.
 */
var exilParms = {

	/**
	 * re-login is automated on session out. We would like to know where you
	 * have put your login page relative to index page
	 */
	loginPage : 'htm/common/login.htm'

	/**
	 * historically, exility has hard-coded several icons/images. folder name
	 * relative to index page
	 */
	,
	baseIMGFolderName : '../../images/'

	/**
	 * where are your html pages?
	 */
	,
	baseHTMLFolderName : 'htm/'

	/**
	 * some tricky placement of img elements require a path to image relative to
	 * one of your htm pages
	 */
	,
	htmlToImageFolder : '../../images'

	/**
	 * how many folders deep are your files/pages? this is the relative path of
	 * baseHTML folder from any of your page
	 */
	,
	fileToHtmlBase : '../../'

	/**
	 * calendar icon url relative to file
	 */
	,
	calendarImageSrc : '../../images/calendar.gif'

	/**
	 * code picker icon url relative to file/page
	 */
	,
	codePickerImageSrc : '../../images/codePicker.gif'

	/**
	 * calendar source file relative to file/page
	 */
	,
	calendarHtmlSrc : '../../htm/common/calendar.htm'

	/**
	 * TODO: check whether this is still used code picker htm file relative to
	 * any page
	 */
	,
	codePickerHtmlSrc : '../../htm/codePicker.htm'

	/**
	 * TODO: check whether this is still used code picker htm file relative to
	 * any page
	 */
	,
	errorMessageHtmlSrc : '../../htm/errorMessage.htm'
	/**
	 * what is path, after base URL, for the service request? e.g. if you use
	 * jsp, it could be jsp/Service.jsp If you have configured web.xml this
	 * should match the entry there
	 */
	,
	commonServiceName : 'Serve'

	/**
	 * ????
	 */
	,
	serviceName : 'Serve'

	/**
	 * TODO : remove this global min for any date used in your application
	 * 
	 * @deprecated
	 */
	,
	minDate : new Date("January 01, 2003")

	/**
	 * TODO: remove this global max for any date used in your application
	 * 
	 * @deprecated
	 */
	,
	maxDate : new Date("January 01, 2023")

	/**
	 * TODO: investigate real meaning
	 */
	,
	validateDatesForBetween : true

	/**
	 * number of rows to be displayed in a combo drop-down
	 */
	,
	comboMaxRows : 20

	/**
	 * some project was trying to send field values without validation. Not
	 * recommended though
	 */
	,
	validateQueryFields : true

	/**
	 * default value of check-box field if checked
	 */
	,
	checkedValue : '1'

	/**
	 * default value of unchecked field
	 */
	,
	uncheckedValue : '0'

	/**
	 * TODO: take it out from here and hard-code it wherever it is appropriate
	 * internally used for search panels. SHOULD NOT BE OVERRIDDEN
	 */
	,
	searchResultTableName : 'searchResult'

	/**
	 * Seamless tables behave like tables in word processor. If you hit tab from
	 * the last field, a row is automatically added This has gone out of
	 * fashion. Better way is to always keep an extra row!! And the negative
	 * name was to have false as a default !!
	 */
	,
	doNotAddRowsOnTabOut : true

	/**
	 * some one did not want to display initial rows. Not sure why they would
	 * set in page.xml, but do not want it
	 */
	,
	displayInitialRows : true

	/**
	 * in 2003 this was a hot feature, and some people did not want it as the
	 * norm was to validate only in the server!!
	 */
	,
	immediateValidation : true,
	stopAtFirstError : true
	/**
	 * legacy parameters when css was not widely used..
	 */
	,
	invalidBackgroundColor : 'lightgrey',
	listHoverColor : 'lightgrey',
	listSelectedColor : 'B4D4FE',
	gridDeletedColor : 'DarkSalmon',
	originalFieldColor : 'white'
	/**
	 * parameters used exclusively by pathFinder
	 */
	/***************************************************************************
	 * ,positionCalWithinPage : true ,calWidth : 195 ,calCorrection : 50
	 * ,donotAddColonToErrorMessage : true ,showSeparateErrorIfRegexFails : true
	 * ,errorDisplayedLocally = true
	 */

	,
	blockCodePicker : false,
	homePage : 'ide/home.htm',
	forbiddenChars : /[\^\\~]/,
	lowercasevariables : false,
	inDebugMode : true

	/**
	 * local date formatting. These parameters are reset using
	 * setLocalDateFormat()
	 */
	,
	dateSeparator : '-',
	dateAt : 0,
	monthAt : 1,
	yearAt : 2,
	useMonthName : true,
	useShortYear : true,
	cutOffForShortYear : 45

	/**
	 * When user tries to close a page with modified field, Exility warns and
	 * takes confirmation. You can decide to be a silent killer :-). Good
	 * practice is to use false here, and diligently set it to true in
	 * individual pages.
	 */
	,
	trackFieldChanges : false

	/**
	 * different from-to message . Means, Exility should not use default error
	 * message for from-to validation
	 */
	,
	diffToFrom : true

	/**
	 * calendar icon placement had an issue that the project could not solve
	 * using css TODO: explain
	 */
	,
	alignCalendar : false

	/**
	 * Seamless uses this to process whenever any key is pressed on the
	 * document, to disable special keys like right-click
	 */
	,
	appHotKeyFunctionName : 'appHotKeyFunc'

	/**
	 * by default, description service is assumed to get at most one row, and
	 * hence we just take the first row. TODO: explain further
	 */
	,
	donotSetFirstDescValue : true

	/**
	 * big NO from us, but projects want to automatically extend sessions,
	 * there-by defeating the ONLY purpose of setting such a limit on the server
	 */
	,
	serverActivityCallBackFunctionName : 'resetInactiveTimer'

	/**
	 * TODO: extend this to type of animation
	 */
	,
	animateHideAndShow : false

	/**
	 * input element will have this css TODO: provide an additional attribute
	 * exil-inError rather than changing css
	 */
	,
	fieldErrorCss : 'inerror'

	/**
	 * half-hearted : localization for Europe not fully handled
	 */
	,
	decimalChar : '.'

	/**
	 * convenient structure
	 */
	,
	monthNames : [ 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug',
			'sep', 'oct', 'nov', 'dec' ],
	monthIndex : {
		'jan' : 0,
		'feb' : 1,
		'mar' : 2,
		'apr' : 3,
		'may' : 4,
		'jun' : 5,
		'jul' : 6,
		'aug' : 7,
		'sep' : 8,
		'oct' : 9,
		'nov' : 10,
		'dec' : 11
	}

	/**
	 * date picker positioning was going out, and projects had a conflict of
	 * interest TODO : explain further
	 */
	,
	positionCalWithinPage : true
	/**
	 * should be delegated to css
	 */
	,
	calWidth : 195,
	calCorrection : 50

	/**
	 * error message has two parts like error/warning/info, message. We used to
	 * put a colon that a project didn't want
	 */
	,
	donotAddColonToErrorMessage : true

	/**
	 * could have been handled better by putting a custom error message at
	 * dataType level TODO: inform projects and deprecate this
	 */
	,
	showSeparateErrorIfRegexFails : true

	/**
	 * TODO: where else is error displayed? centrally???
	 */
	,
	errorDisplayedLocally : true

	/**
	 * legacy issue with cover-image to make a div look like a pop-up (refer to
	 * P2.popUpAPanel())
	 */
	,
	popupCoverColor : '#999999',
	popupCoverOpacity : 0.5

	/**
	 * apple uses 15 while others use 17 px. We need some precise calculation to
	 * avoid double-scroll-bar
	 */
	,
	scrollBarWidth : (navigator.userAgent.toUpperCase().indexOf('MAC OS') > -1) ? 15
			: 17

	,
	datePlaceHolder : null
	/**
	 * options for charts
	 */
	,
	chartPanelOptions : {
		colors : [ '#0000ff', '#00ff00', '#ff0000', '#9999ff', '#993366',
				'#ffffcc', '#ccffff', '#660066', '#ff8080' ],
		childColors : [ '#334455', '#551122', '#ff2266', '#9900ff', '#0099ff',
				'#ff00cc', '#cc00ff', '#66ff66', '#008080' ],
		shadowSize : 4,
		rawDataDisplay : 'value',
		labelColor : 'white'

		/* legend related */
		,
		hideLegend : false,
		legendNbrColumns : 1,
		legendLabelFormatter : null,
		legendLabelBoxBorderColor : '#ccc',
		legendPosition : 'ne',
		legendMargin : 5,
		legendBackgroundColor : 'gray',
		legendBackgroundOpacity : 0.85

		/* margin related */
		,
		marginLeft : 35,
		marginBottom : 35,
		barLabelLeftMargin : 3,
		barLabelBottomMargin : 3,
		yLabelMaxWidth : 35

		/* for bar */
		,
		lineWidth : 2,
		barWidth : 0.7

		/* for grid */
		,
		gridColor : '#545454',
		tickColor : '#dddddd'

		/* for points */
		,
		showFilledPoints : false,
		pointsRadius : 3,
		pointsFillColor : '#ffffff',
		labelLeftMargin : 5,
		labelBottomMargin : 5
	}
};

/**
 * default timer that does not do anything. Should be over-ridden by projects if
 * they want to keep the session perpetually on
 */
var resetInactiveTimer = function() {
	//
};

/**
 * Decide how dates are displayed on the client. Note that the server ALWAYS
 * sends dates in yyyy-mm-dd and wants it back that way. should be linked to
 * localization.
 */
var setLocalDateFormat = function(format, separator) {
	var separator = format.substr(0, 1);
	format = format.substr(1, format.length - 1);
	debug('Local date format will be set to ' + format + ' with ' + separator
			+ ' as the separator');
	if (format == 'ddmmyy') {
		exilParms.dateAt = 0;
		exilParms.monthAt = 1;
		exilParms.yearAt = 2;
		exilParms.useMonthName = false;
		exilParms.useShortYear = true;
		exilParms.cutOffForShortYear = 15; // specified only if shortYear is
		// used
	}

	else if (format == 'ddmmmyy') {
		exilParms.dateAt = 0;
		exilParms.monthAt = 1;
		exilParms.yearAt = 2;
		exilParms.useMonthName = true;
		exilParms.useShortYear = true;
		exilParms.cutOffForShortYear = 15; // specified only if shortYear is
		// used
	}

	else if (format == 'ddmmyyyy') {
		exilParms.dateAt = 0;
		exilParms.monthAt = 1;
		exilParms.yearAt = 2;
		exilParms.useMonthName = false;
		exilParms.useShortYear = false;
	}

	else if (format == 'mmddyy') {
		exilParms.dateAt = 1;
		exilParms.monthAt = 0;
		exilParms.yearAt = 2;
		exilParms.useMonthName = false;
		exilParms.useShortYear = true;
	} else
		return false;

	exilParms.dateSeparator = separator;
	return true;
};
/*******************************************************************************
 * 
 * PURPOSE
 * _____________________________________________________________________________________________
 * 
 * This file contains all the constants that are used as part of communication
 * between client and server. You will find similar definitions on the server
 ******************************************************************************/

var ClientConstants = {
	TYPE_IS_UNDEFINED : "undefined",
	KEY_VALUE_SEPARATOR : "=",
	KEY_VALUE_LIST_SEPARATOR : ";",

	/* Background Job related constants */
	BACKGROUND_JOB_IS_DONE : "done",
	BACKGROUND_JOB_IS_RUNNING : "running",
	BACKGROUND_JOB_STATUS_SERVICE_ID : "getBackgroundJobResult",
	BACKGROUND_JOB_STATUS_FIELD : "_backgroundJobStatus",
	BACKGROUND_JOBS_FIELD : "_backgroundJobs",
	BACKGROUND_JOB_ID_FIELD : "_backgroundJobId",

	/* Message releated constants */
	MESSAGE_TYPE_ERROR : "error",
	MESSAGE_TYPE_WARN : "warning",
	MESSAGE_TYPE_INFO : "info",

	/* naming convention between client and server */
	TEST_CASE_CAPTURE : '_testCaseToBeCaptured',
	AUTH_STATUS : 'authenticationStatus',
	TRACE_NAME : 'exilityServerTraceText',
	PERF_TRACE_NAME : 'exilityServerPerformanceText',
	GLOBAL_FIELDS : 'globalFields',
	CSRF_HEADER : 'X-CSRF-Token',
	REMOVE_CSRF : 'remove',
	NUMBER_OF_EXISTING_LOGINS : '_nbr_existing_logins'
};/*
 * File: pageManager.js
 * Description:
 * This file contains all objects and methods related to page navigation.
 */
var PM = window;
window.name = 'exilWin';
// on a navigation action that requires user to come back to the current page,
// we have to keep some info
var StackEntry = function(win, urlText, toReset, isPopup) {
	this.win = win;
	this.url = urlText;
	this.toReset = toReset;
	this.isPopup = isPopup;
	var b = window.document.body;
	var t = 0;
	var l = 0;
	if (b.scrollTop) {
		t = b.scrollTop;
		l = b.scrollLeft;
	} else if (win.pageYOffset) {
		t = win.pageYOffset;
		l = win.pageXOffset;
	} else if (b.parentElement && b.parentElement.scrollTop) {
		t = b.parentElement.scrollTop;
		l = b.parentElement.scrollLeft;
	}
	this.scrollTop = t;
	this.scrollLeft = l;
};

// ExilityPageStack is instantiated as a global object exilityPageStack. It
// keeps a stack of urls of succesive
// window navigations that need to be tracked back. That is when the current
// window says goBack, it should
// go back to the entry next to that...
var ExilityPageStack = function(win) {
	this.stack = new Array();
	this.activeWindows = new Object();
};

ExilityPageStack.prototype.push = function(entry) {
	this.stack.push(entry);
};

ExilityPageStack.prototype.pop = function() {
	return this.stack.pop();
};

ExilityPageStack.prototype.top = function() {
	var t = this.stack.length;
	if (t > 0)
		return this.stack[t - 1];
	return null;
};
ExilityPageStack.prototype.getEntry = function(index) {
	var t = this.stack.length;
	if ((t > 0) && (t > index))
		return this.stack[index];
	return null;
};

ExilityPageStack.prototype.goBack = function(win, fromReset) {
	if (!win)
		win = currentActiveWindow;
	var entry = this.pop();
	if (!entry) {
		if (!exilParms.homePage) {
			win.location.replace('about:blank');
			return;
		}
		win.location.replace(htmlRootPath + exilParms.homePage);
		window.scrollTo(0, 0);

		return win;
	}

	currentActiveWindow = entry.win;
	debug('currentActiveWindow set to ' + currentActiveWindow.location.href);
	if (entry.url) {
		if (!fromReset) {
			window.scrollTo(0, 0);
			win.location.replace(entry.url);
		}
	} else {
		window.scrollTo(0, 0);
		closeWindow(win);
		if (entry.isPopup) {
			uncoverPage(coverMainStyle);
			if (!fromReset) {
				if (entry.se)
					entry.win.serverAgent.callService(se);
				else {
					var p = entry.win.P2;
					if (p && p.reloadActionName)
						p.actions[p.reloadActionName].act();
				}
			}
		} else {
			showWindow(entry.win);
			if (entry.win.P2 && !fromReset)
				entry.win.P2.reload(entry.scrollLeft, entry.scrollTop);
		}
		if (entry.win.P2)
			entry.win.P2.setPageTitle();
	}
	return entry.win;
};

/*
 * goTo action depends on the mode, for which these are the possible values
 * defined in NavigationAction NavigationAction.REPLACE = 'replace'; //
 * NavigationAction.POPUP = 'popup'; NavigationAction.RETAIN_STATE =
 * 'retainState'; NavigationAction.RESET = 'reset';
 */
ExilityPageStack.prototype.goTo = function(win, mode, urlText, se, logicalName) {
	if (!win)
		win = currentActiveWindow;
	if (!win) {
		alert('Oooops where do you want me to go? There is NO window to go !!!');
		return null;
	}
	currentActiveWindow = win;
	// debug('currentActiveWindow set to ' + currentActiveWindow &&
	// currentActiveWindow.location.href);
	urlText = htmlRootPath + urlText;
	if (mode == NavigationAction.REPLACE) {
		if (logicalName)
			this.activeWindows[logicalName] = win;
		win.location.replace(urlText);
	} else if (mode == NavigationAction.POPUP) {
		var entry = new StackEntry(win, null, false, true);
		this.push(entry);
		if (se)
			entry.se = se;
		uncoverPage(coverPickerStyle);
		coverPage(coverMainStyle, imgMainStyle);
		currentActiveWindow = createWindow(urlText, true);
		debug('currentActiveWindow set to ' + currentActiveWindow.location.href);
		if (logicalName)
			this.activeWindows[logicalName] = currentActiveWindow;
	} else if (mode == NavigationAction.RETAIN_STATE) {
		this.push(new StackEntry(win, null, false));
		hideWindow(win);
		currentActiveWindow = createWindow(urlText, false);
		debug('currentActiveWindow set to ' + currentActiveWindow.location.href);
		if (logicalName)
			this.activeWindows[logicalName] = currentActiveWindow;
		uncoverPage(coverMainStyle);
	} else if (mode == NavigationAction.RESET) {
		this.push(new StackEntry(win, win.location.href, true));
		if (logicalName)
			this.activeWindows[logicalName] = win;
		win.location.replace(urlText);
	}
	// used only by Exis. Needs to be reviewed and redesigned
	else if (mode == NavigationAction.MENU_RESET) {
		/* since only home page needs to be pushed while resetting */
		if (this.stack.length == 0) {
			this.push(new StackEntry(win, win.location.href, true));
		}
		if (logicalName)
			this.activeWindows[logicalName] = win;
		win.location.replace(urlText);
	} else {
		message(
				'Design Error :Invallid window displosal mode recd by navigator : '
						+ mode, "Error", "Ok", null, null, null);
	}

	return win;
};

ExilityPageStack.prototype.resetStack = function(askOnChangedForm) {
	// current active window is what is visible, and the history is in the
	// stack. Over job is to remove all history, including current window, and
	// take user to home page.
	if (askOnChangedForm) {
		var p2 = currentActiveWindow && currentActiveWindow.P2;
		if (p2
				&& p2.lastModifiedNode
				&& p2.trackFieldChanges
				&& !window
						.confirm('You have modified some information on this page. Click OK to abandon editing, or CANCEL to go back')) {
			try {
				p2.lastModifiedNode.focus();
				p2.makePanelVisible(p2.lastModifiedNode);
			} catch (e) {
				//
			}
			return false;
		}
	}

	// let us keep popping up history and close window if required
	while (this.stack.length > 0) {
		var entry = this.stack.pop();
		if (entry.url) // entry.url implies that this was to be open in the
						// same window. No need to close it.
			continue;

		closeWindow(currentActiveWindow);
		if (!entry.isPopup)
			showWindow(entry.win);
		currentActiveWindow = entry.win;
	}
	// Clean this window as well
	/**
	 * PathFinder has been using resetStack and then goto with retainState open
	 * menu items. To provide backward compatibility for this, we have to avoid
	 * cleaning-up current window
	 */
	// currentActiveWindow.location.replace('about:blank');
	return true;
};

// more for tracing and debugging..
ExilityPageStack.prototype.showStack = function() {
	var str = 'Page History';
	if (!this.stack || this.stack.length == 0) {
		str += ' is empty ';
	} else {
		var stack = this.stack;
		for ( var i = 0; i < stack.length; i++)
			str += "\n" + (i + 1) + ". " + stack[i];
	}
	message(str, "", "Ok", null, null, null);
};

var getMessageText = function(dc) {
	return dc.getMessageText();
};

var confirmReset = function() {
	message('server reset', "", "Ok", null, null, null);
};

var HeaderMenu = function() {
	this.options = "directories=no, location=no, resizable=yes, menubar=no, status=no, titlebar=no, scrollbars=yes, toolbar=no";
	this.showVersion = function() {
		message("Version 1.21 released on date 20-Jan-09", "", "Ok", null,
				null, null);
	};

	this.resetServer = function() {
		var se = new ServiceEntry('internal.resetProject',
				new DataCollection(), true, confirmReset, null, null, false,
				true);
		exilityMainWindow.serverStub.callService(se);
	};

	this.startTrace = function() {
		if (!window.exilityTraceWindow || window.exilityTraceWindow.closed) {
			window.exilityTraceWindow = window.open(
					exilParms.baseHTMLFolderName + 'common/trace.htm', 'trace',
					this.options + ", left=0, top=0, height=500, width=600",
					true);
		}
		if (window.exilityTraceWindow)
			window.exilityTraceWindow.focus();
		else
			alert('Unable to open trace window because of pop-up blocker. You will not see trace information.');
	};

	this.traceClosed = function() {
		exilityTraceWindow = null;
	};

	this.startDataTrace = function() {
		if (!exilityDataTraceWindow)
			exilityDataTraceWindow = window.open(exilParms.baseHTMLFolderName
					+ 'common/datatrace.htm', 'datatrace', this.options
					+ ", left=0, top=0, height=500, width=600", true);
		exilityDataTraceWindow.focus();
	};
	this.datatraceClosed = function() {
		exilityDataTraceWindow = null;
	};

	this.startTestHarness = function() {
		window.testCaseToBeCaptured = true;
	};

	this.endTestHarness = function() {
		window.testCaseToBeCaptured = false;
	};

	this.showHtml = function() {
		var win = window.open('', '_blank');
		var doc = win.document;
		doc.write(currentActiveWindow.document.body.innerHTML);
		doc.close();
	};

	this.showData = function() {
		if (window.dataStore) // local data
		{
			var win = window.open('', '_blank');
			var doc = win.document;
			doc.write(dataStore.toHtml());
			doc.close();
			win.focus();
			return;
		}
		var p2 = currentActiveWindow.P2;
		if (!p2) {
			message(
					'Sorry, the current window is not an Exility window. Data can not be dumped',
					"", "Ok", null, null, null);
			return;
		}
		var win = window.open('', '_blank');
		var doc = win.document;
		doc
				.write('<h2>values</h2><table cellpadding="3" cellspacing="1" style="background-color:blue;"><tr style="background-color:gray"><th>Name</th><th>Value</th></tr>');
		for ( var fieldName in p2.fields) {
			var field = p2.fields[fieldName];
			if (field && !field.table) {
				var val = field.value;
				if (!val)
					val = "&nbsp;";
				doc.write('<tr style="background-color:silver"><td>'
						+ fieldName + "</td><td>" + val + "</td></tr>");
			}
		}
		doc.write("</table>");

		for ( var tableName in p2.tables) {
			doc
					.write("<br /><h2>"
							+ tableName
							+ '</h2><table cellpadding="3" cellspacing="1" style="background-color:blue;"><tr style="background-color:gray">');
			var table = p2.tables[tableName];
			var names = table.columnNames;
			var n = names.length;
			for ( var i = 0; i < n; i++)
				doc.write("<th>" + names[i] + "</th>");
			doc.write("</tr>");
			var m = table.grid.length;
			for ( var i = 1; i < m; i++) {
				var row = table.grid[i];
				if (!row || row.isDeleted)
					continue;
				doc.write('<tr style="background-color:silver">');
				for ( var j = 0; j < n; j++) {
					var val = row[j];
					if (!val)
						val = "&nbsp;";
					doc.write("<td>" + val + "</td>");
				}
				doc.write("</tr>");
			}
			doc.write('</table>');
		}
		doc.close();
		win.focus();

	};
	this.navigate = function(urlText) {
		exilityMainWindow.location.replace(exilParms.baseHTMLFolderName
				+ urltext);
	};
	this.showTester = function() {
		exilityPageStack.goTo(null, 'retainState', 'common/tester.htm', null,
				null);
	};

	// show cursor as cross-wire and sho current location for developrs to
	// measure pixels
	this.startCrossWire = function() {
		if (this.crossWired)
			return;
		if (!this.crossWireEle) {
			var ele = document.createElement('div');
			ele.style.position = 'fixed';
			ele.style.top = '1px';
			ele.style.left = '1px';
			ele.style.zIndex = 10;
			ele.style.cursor = 'resize';
			if (ele.addEventListener)
				ele.addEventListener('mousemove', showCoordinates, false);
			else
				ele.attachEvent('onmousemove', showCoordinates);
			ele.innerHTML = htmlForCrossWire;
			document.body.appendChild(ele);
			window.crossX = document.getElementById('crossX');
			window.crossY = document.getElementById('crossY');
			window.crossLineX = document.getElementById('crossLineX');
			window.crossLineY = document.getElementById('crossLineY');
			this.crossWireEle = ele;
		}
		this.crossWired = true;
		this.crossWireEle.style.display = '';
		crossLineX.style.width = this.crossWireEle.style.width = crossX.innerHTML = document.body.clientWidth
				+ 'px';
		crossLineY.style.height = this.crossWireEle.style.height = crossY.innerHTML = document.body.clientHeight
				+ 'px';
	};

	this.stopCrossWire = function() {
		if (!this.crossWired)
			return;
		this.crossWired = false;
		this.crossWireEle.style.display = 'none';
	};

	this.startIde = function() {
		var urlText = 'exilityClient/ez.htm';
		// this should be re-factored to get ExilityServerStub..
		var csr = window[ClientConstants.CSRF_HEADER];
		if (csr)
			urlText += '?' + csr;
		var win = window.open(urlText);
		if (!win) {
			alert('Unable to start IDE. window.open() failed, probably because of pop-up blocker issue.');
		} else {
			// allow IDE window to communicate with the this main window if
			// required..
			window.IDE_WINDOW = win;
			setTimeout(
					"try{window.IDE_WINDOW.PROJECT_WINDOW = window;}catch(e){}",
					1000);
		}

	};
};

var htmlForCrossWire = '<img id="crossLineY" src="images/blackDot.gif" style="width:1px;height:100px;position:absolute;top:1px;left:50px;valign:top;" /><img id="crossLineX" src="images/blackDot.gif" style="width:100px;height:1px;position:absolute;top:50px;left:1px;" /><span style="border:solid 1px blue; border-radius:4px; background-color:#EEEEEE; font-size:1.5em; margin-left:200px;"><img src="images/deleteIcon.png" alt="delete" style="cursor:pointer" onclick="headerMenu.stopCrossWire();" />&nbsp;&nbsp;X:<span id="crossX"></span>   Y:<span id="crossY"></span>&nbsp;&nbsp;</span>';
var showCoordinates = function(e) {
	if (!e)
		e = event;
	// ie8 and below: pageX is not available
	var x = e.pageX || e.clientX + document.body.scrollLeft;
	var y = e.pageY || e.clientY + document.body.scrollTop;
	crossX.innerHTML = x;
	crossY.innerHTML = y;
	// move the cross-wire
	crossLineX.style.top = e.clientY + 'px';
	crossLineY.style.left = e.clientX + 'px';
};

// debug is moved here as it is closely linked with the above
function debug(msg, alreadyAnHtml) {
	if (!exilityTraceWindow || !exilityTraceWindow.appendText)
		return;

	if (alreadyAnHtml) {
		exilityTraceWindow.appendText(msg);
		return;
	}
	msg = new String(msg);
	var msgs = msg.split("\n");
	for ( var i = 0; i < msgs.length; i++) {
		msg = msgs[i];
		if (msg.indexOf("error") >= 0 || msg.indexOf("Error") >= 0
				|| msg.indexOf("ERROR") >= 0)
			msg = '<font style="color:red;">' + msg + '</font>';
		else if (msg.indexOf("warning") >= 0 || msg.indexOf("Warning") >= 0
				|| msg.indexOf("WARNING") >= 0)
			msg = '<font style="color:blue;">' + msg + '</font>';
		else
			msg = msg.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
		exilityTraceWindow.appendText(msg);
	}
}

var datadebug = function(msg) {
	if (exilityDataTraceWindow == null)
		return;

	msg = "==============================================<br /><pre>"
			+ msg
			+ "</pre><br />==============================================<br />";
	exilityDataTraceWindow.appendText(msg);
};

var headerMenu = new HeaderMenu();
var exilityTraceWindow = null; // window where trace information is displayed
var exilityMainWindow = null; // set by the first page to point to the window
								// where the regualar pages are managed
var exilityPageStack = new PM.ExilityPageStack();
var exilityDataTraceWindow = null; // window where request / response dc is
									// displayed

// code moved from mainPage/index.htm here. This is to simplify
var inboxes = new Object(); // contins values to be passed to windows on load of
							// that window.
var urlField, urlArea, calWin, calElement, pickerWin, pickerEleStyle, mainBody, mainTop;
var coverMainStyle, coverPickerStyle, coverCalendarStyle, coverCalendarEle;
var imgMainStyle, imgPickerStyle, imgCalendarStyle, imgMainPrgIndStyle;
var htmlRootPath, topPath;
var lastWindowNumberUsed = 0;
var exilityMainWindow = null;
var globalFieldValues = new Object(); // global fields that act as default to
										// some commonly used fields
var currentActiveWindow = null;
var exilCombo, exilComboWin;
var toolTipEle, toolTipStyle;

var localServices = new Array();
var pageValidation = false;
var filesBeingUploaded = 0;

var mainLoaded = function() {
	IdentifyBrowser.init();
	if ((IdentifyBrowser.browser == "An unknown browser")
			|| (IdentifyBrowser.version == "an unknown version")) {
		// alert("The application is not supported on this Browser. Please use
		// IE 6 and above, firfox 3.0 and above or Safari ver 5 and above.");
		// window.close();
		// return;
	}

	exilityMainWindow = window.frames['mainZero'];
	if (exilityMainWindow) {
		exilityMainWindow.name = 'mainZero';
		currentActiveWindow = exilityMainWindow;
	}
	mainTop = document.getElementById('top');
	mainBody = document.documentElement;
	urlField = document.getElementById('url');
	urlArea = document.getElementById('urlSpan');
	calElement = document.getElementById('calendarElement');
	calWin = window.frames['calendarWindow'];
	pickerWin = window.frames['pickerWindow'];

	// we have several style variables. I am using a simple short-cut to create
	// all of them
	var styleNames = null;
	styleNames = [ [ 'pickerElement', 'pickerEleStyle' ],
			[ 'coverMain', 'coverMainStyle' ], [ 'imgMain', 'imgMainStyle' ],
			[ 'imgMainPrgInd', 'imgMainPrgIndStyle' ],
			[ 'coverPicker', 'coverPickerStyle' ],
			[ 'imgPicker', 'imgPickerStyle' ],
			[ 'coverCalendar', 'coverCalendarStyle' ],
			[ 'toolTip', 'toolTipStyle' ] ];

	for ( var i = 0; i < styleNames.length; i++) {
		var ele = document.getElementById(styleNames[i][0]);
		if (ele)
			window[styleNames[i][1]] = ele.style;
	}

	topPath = window.location.href;
	topPath = topPath.substring(0, (topPath.lastIndexOf('/') + 1));
	htmlRootPath = topPath + exilParms.baseHTMLFolderName;

	exilCombo = document.getElementById('exilComboFrame');
	exilComboWin = window.frames['exilComboFrame'];
	if (exilComboWin && exilParms.comboMaxRows)
		exilComboWin.comboMaxRows = exilParms.comboMaxRows;

	var src = exilParms.localResourceFolder;
	if (!src) {
		debug('If you intend to use local service, You MUST set exilParms.localResourceFolder to the root of the resource folder.');
	} else {
		src = src + 'localServiceList.xml';
		var xmlDoc = getLocalResource(src, true);
		if (!xmlDoc) {
			alert('Could not load ' + src + ' for a list of local services.');
			return;
		}
		var listOfLocalServices = xmlDoc.getElementsByTagName('serviceEntries')[0]
				.getElementsByTagName('serviceEntry');
		for ( var i = 0; i < listOfLocalServices.length; i++) {
			localServices[listOfLocalServices[i].getAttribute('name')] = listOfLocalServices[i];
		}
	}
};

var getLocalResource = function(urlText, asXmlDoc) {
	var p; // param to be supplied to call back function
	urlText = topPath + urlText;
	try {
		if (typeof (ActiveXObject) != 'undefined') {
			if (asXmlDoc) {
				p = new ActiveXObject("Msxml2.XMLHTTP.6.0");
				p.open('GET', urlText, false);
				p.send();
				var responseText = p.responseText;
				p = new ActiveXObject('Microsoft.XMLDOM');// 'Msxml2.DOMDocument.6.0'
				p.async = false;
				p.loadXML(responseText);
				if (!p.documentElement) {
					alert(urlText
							+ ' loaded into an empty document. Check for errors.\n'
							+ p.parseError);
					return;
				}
				return p.documentElement;
			}
			p = new ActiveXObject("Msxml2.XMLHTTP.6.0");
			p.open('GET', urlextT, false);
			p.send();
			return p.responseText;
		}
		p = new XMLHttpRequest();
		p.open('GET', urlText, false);
		p.send(null);
		p = asXmlDoc ? p.responseXML.documentElement : p.responseText;
		return p;
	} catch (e) {
		alert('Error while accessing ' + urlText + '\n' + e);
		return null;
	}
};

var htmlClicked = function() {
	urlArea.style.display = '';
	urlField.focus();
};
var goClicked = function() {
	// header menu is created as global with scope to this window. refer to
	// pageManager.HeaderMenu
	headerMenu.navigate(urlField.value);
	urlArea.style.display = 'none';
};

var showWindow = function(win) {
	var ele = document.getElementById(win.name + 'Div');
	if (ele)
		ele.style.display = '';
};

var hideWindow = function(win) {
	var ele = document.getElementById(win.name + 'Div');
	if (ele)
		ele.style.display = 'none';
};

var closeWindow = function(win) {
	if (!win)
		return;
	removeInbox(win.name);
	var ele = document.getElementById(win.name + 'Div');
	// alert(' I got ele as ' + (ele ? ele.id : " null") );
	win.location.href = 'about:blank';
	try {
		ele.parentNode.removeChild(ele);
	} catch (e) {
		//
	}
};

var createWindow = function(urlText, forPopUp) {
	lastWindowNumberUsed++;
	var nam = 'main' + lastWindowNumberUsed;
	var div = document.createElement('DIV');
	div.id = nam + 'Div';
	var popUp = 'style="width: 1028px; height: 570px;"';
	if (forPopUp) {
		// Typically, the popped-up window positioning will be part of that
		// window. that is, once the page opens,
		// it will resize and reposition itself. This results in users seeing
		// the window getting moved and resized.
		// to avoid this, we hide this div. All exility pages are aware of this,
		// and they take appropriate step.
		// However, if the opened page is a non-exility page, then it should
		// include the following statement in its onload function
		// window.top.document.getElementById(window.name + 'Div').style.display
		// = 'block';
		div.style.display = 'none';
		popUp = ' style="border:solid 0px #E8E8E8;position:absolute; z-index:2; background-color: #FFF;  -webkit-box-shadow: 0px 8px 32px rgba(0,0,0,0.5);-webkit-border-radius: 5px;-moz-box-shadow: 0px 8px 32px rgba(0,0,0,0.5);-moz-border-radius: 5px;" ';
		addToInbox(nam, 'isAPopup', true);
	}
	div.innerHTML = '<iframe id="' + nam + '" name="' + nam + '" src="'
			+ urlText + '" frameborder="0" marginheight="0" marginwidth="0" '
			+ popUp + '></iframe>';
	mainTop.appendChild(div);
	debug('New window created with name=' + nam);
	return window.frames[nam];
};

var getInbox = function(win) {
	var inbox = inboxes[win.name];
	if (inbox) {
		for ( var varName in inbox)
			win[varName] = inbox[varName];
	}
};

var addToInbox = function(boxName, fieldName, val) {
	var box = inboxes[boxName];
	if (!box) {
		box = new Object();
		inboxes[boxName] = box;
	}
	box[fieldName] = val;
};

function removeInbox(boxName) {
	inboxes[boxName] = null;
}

function resetWindowSize(win, w, h, top, left, donotscroll) {
	if (!donotscroll) {
		window.scrollTo(0, 0);
		win.scrollTo(0, 0);
	}
	if (!w && !h)
		return;
	var ele = document.getElementById(win.name);
	if (!ele) {
		if (win.parent.name.match("^main") == 'main') {
			return;
		}
		debug('DESIGN ERROR:' + win.name + ' is not a valid window element ',
				"Error", "Ok", null, null, null);
		return;
	}
	// alert('window name is ' + win.name + ' and I got an ele whose id is ' +
	// ele.id + ' and I am going to set its width=' + w + ' height=' + h + '
	// top=' + top + ' left=' + left );
	var s = ele.style;
	// alert(' w=' + w + ' width=' + s.width + ' and h=' + h + ' height=' +
	// s.height);

	if (w) {
		if (exilParms.showPageWidthInPercentage && win.name != "pickerWindow") {
			s.width = "100%"; // allow page width to fit in %
		} else {
			s.width = w + 'px'; // fix width in px when
								// showPageWidthInPercentage=false
		}
	}

	if (h)
		s.height = h + 'px';
	if (top)
		s.top = top + 'px';
	if (left)
		s.left = left + 'px';
}

var IdentifyBrowser = {
	init : function() {
		this.browser = this.searchString(this.browserIds)
				|| "An unknown browser";
		this.version = this.searchVersion(navigator.userAgent)
				|| this.searchVersion(navigator.appVersion)
				|| "an unknown version";
	},
	searchString : function(data) {
		for ( var i = 0; i < data.length; i++) {
			var dataString = data[i].string;
			var dataProp = data[i].prop;
			this.versionSearchString = data[i].versionSearch
					|| data[i].identity;
			if (dataString) {
				if (dataString.indexOf(data[i].subString) != -1)
					return data[i].identity;
			} else if (dataProp)
				return data[i].identity;
		}
	},
	searchVersion : function(dataString) {
		var index = dataString.indexOf(this.versionSearchString);
		if (index == -1)
			return;
		return parseFloat(dataString.substring(index
				+ this.versionSearchString.length + 1));
	},
	browserIds : [ {
		string : navigator.userAgent,
		subString : "Firefox",
		identity : "Firefox"
	}, {
		string : navigator.userAgent,
		subString : "MSIE",
		identity : "Explorer",
		versionSearch : "MSIE"
	}, {
		string : navigator.vendor,
		subString : "Apple",
		identity : "Safari",
		versionSearch : "Version"
	}

	]
};

var codePickerLeft = -1;
var codePickerTop = -1;
var fileUploadData = null;

// support multiple active windows instead of stack. Navigation actions are not
// allowed in this case. Each window is opened and closed!!!
// labelEle is the dom element that displays all labels of tabbed windows.
// windowsEle is the dom element to which we keep adding iframe elements
function TabbedWindows(labelsEle, windowsEle, homeUrl) {
	// for onclick function, we need to refer to this object. I have a
	// convoluted design as of now.
	// I am forcing a variable called tabbedWindows in the window that creates
	// an instance of this object
	// var win = labelsEle.ownerDocument.defaultView;
	// if (win.tabbedWindows)
	// {
	// debug('window already had a tabbedWinidows variable. Replacing it');
	// }
	// window.tabbedWindows = this;
	this.labelsEle = labelsEle;
	this.windowsEle = windowsEle;
	this.windows = {};
	this.names = [];
	this.nbrWindows = 0;

	// click on a label should show corresponding window
	if (labelsEle.addEventListener)
		labelsEle.addEventListener('click', tabbedWindowLabelClicked, false);
	else
		labelsEle.attachEvent('onclick', tabbedWindowLabelClicked);
	// start with sweet home..
	if (homeUrl)
		this.addWindow(homeUrl, this.HOME_NAME, 'Home');
}

var a = TabbedWindows.prototype;
a.ACTIVE_ATTR = 'exil-active';
a.NAME_ATTR = 'exil-name';
a.TAB_CLASS = 'winTab';
a.TAB_LABEL_CLASS = 'winTabLabel';
a.TAB_DELETE_CLASS = 'winTabDelete';
a.HOME_NAME = '_';
a.NAME_PREFIX = 'window_';
/*
 * Add a window. url to open in a unique named window. Label is for user to
 * identify this window
 */
a.addWindow = function(urlText, windowName, label) {
	var w = this.windows[windowName];
	if (w) // a window with this name already exists
	{
		if (w.url == urlText) {
			debug(windowName
					+ " is already open. shifting focus to that window");
			this.showWindow(windowName);
			return w;
		}
		debug(windowName + ' is already used for ' + w.url
				+ '. Can not create a new window with this name for ' + urlText);
		return null;
	}

	// create an iframe for this window
	var winEle = document.createElement('div');
	winEle.style.display = 'none';
	var frameName = this.NAME_PREFIX + windowName;
	winEle.innerHTML = '<iframe class="tabbedWindow" id="' + frameName
			+ '" name="' + frameName + '" src="' + urlText
			+ '" frameborder="0" marginheight="0" marginwidth="0"></iframe>';
	winEle.id = frameName + 'Div';
	this.windowsEle.appendChild(winEle);
	var win = window.frames[frameName];
	// a tab label for this window <div><div for label/><div for */></div>
	var labelEle = document.createElement('div');
	labelEle.className = this.TAB_CLASS;
	var html = '<div class="' + this.TAB_LABEL_CLASS + '">' + label + '</div>';
	if (windowName != '_') // home can not be deleted
		html += '<div class="' + this.TAB_DELETE_CLASS + '"/>';
	labelEle.innerHTML = html;
	labelEle.setAttribute(this.NAME_ATTR, windowName);
	this.labelsEle.appendChild(labelEle);
	// TODO: if there is not enough space? We will have to show <- and -> kind
	// of icon etc...
	// create and index a window object
	var n = this.names.length;
	this.windows[windowName] = w = {
		win : win,
		labelEle : labelEle,
		name : windowName,
		winEle : winEle,
		idx : n
	};
	this.names[n] = windowName;
	this.nbrWindows++;
	this.showWindow(windowName);
};

// show this window. We have to hide existing window and show this one.
a.showWindow = function(windowName) {
	var w = this.windows[windowName];
	if (!w) {
		alert('Design error: Trying to show a window that does ot exists -'
				+ windowName);
		return;
	}
	if (this.currentWin) {
		if (w === this.currentWin)
			return;

		this.currentWin.labelEle.removeAttribute(this.ACTIVE_ATTR);
		this.currentWin.winEle.style.display = 'none';
	}

	this.currentWin = w;

	w.labelEle.setAttribute(this.ACTIVE_ATTR, this.ACTIVE_ATTR);
	w.winEle.style.display = '';
	w.win.focus();
};

a.getFirstWindow = function() {
	if (!this.nbrWindows)
		return null;
	for ( var i = 0; i < this.names.length; i++) {
		if (this.names[i])
			return this.windows[this.names[i]];
	}
	alert('design error: tabbedWindows in not keeping track of its windows');
	return null;
};

a.removeWindow = function(winName, noNeedToConfirm) {
	var w = this.windows[winName];
	if (!w) {
		debug(winName + ' is not a tabbed window to be removed.');
		return null;
	}

	if (w.isModified && !noNeedToConfirm) {
		message("Do you want Abandon changes?", null, 'Abandon Changes',
				abandonChanges, 'No. Take me back to window', undoClick, w, w);
		// remember message() is asynch. Which means, you get back control as
		// the message is still waiting for an action from user
		return;
	}

	var nextWin = this.getFirstWindow();
	if (nextWin)
		this.showWindow(nextWin.name);
	// nextWin would be empty if the last window is closed, and there is no
	// home. We will not handle that situation as of now
	w.win.location.replace('about:blank'); // better garbage collection
	this.labelsEle.removeChild(w.labelEle);
	this.windowsEle.removeChild(w.winEle);
	delete this.windows[winName];
	delete this.names[w.idx];
	this.nbrWindows--;
};
// called from event handler
a.labelClicked = function(ele) {
	var winName = ele.getAttribute(this.NAME_ATTR)
			|| ele.parentNode.getAttribute(this.NAME_ATTR);
	if (!winName) {
		alert('Design Error: window tabs click handler is unabel to get window name');
		return;
	}
	if (ele.className == this.TAB_DELETE_CLASS)
		this.removeWindow(winName);
	else
		this.showWindow(winName);
};

// called from P2 when a window becomes dirty or is reset.
a.setModifiedStatus = function(frameName, isModified) {
	var winName = frameName.substr(this.NAME_PREFIX.length); // remove
																// 'window_'
																// from the name
	var w = this.windows[winName];
	if (!w) {
		alert('tabbedWindows.setModifiedStatus called with invalid window name '
				+ winName);
		return;
	}
	if (w.isModified) {
		if (!isModified) {
			w.labelEle.removeAttribute(this.MODIFIED_ATTR);
			w.isModified = false;
		}
		return;
	}
	if (isModified) {
		w.labelEle.setAttribute(this.MODIFIED_ATTR, this.MODIFIED_ATTR);
		w.isModified = true;
	}
};

// event function when window tab is clicked
function tabbedWindowLabelClicked(e) {
	var ele = e.target || e.srcElement;
	var win = ele.ownerDocument.defaultView;
	win.tabbedWindows.labelClicked(ele);
}

// funciton passed to message to be triggered when user clicks on Abandon
function abandonChanges(win) {
	tabbedWindows.removeWindow(win.name, true);
}

function undoTabClick(win) {
	debug(win.name
			+ ' was modified. User was about to close it, and then changed her mind');
}
/*******************************************************************************
 * PURPOSE: Sometimes a request to the Exility server side will result in a
 * background job. The server side task will initiate a background process and
 * return immediately. As of now, Exility returns the ID of the newly created
 * job. Additionally, it also returns the status of each job (running,done).
 * Lastly, one can also query the server side for a specific job's status.
 * 
 * This section is to take care of work with Exility background job statuses
 ******************************************************************************/
PM.backgroundJobs = new BackgroundJobs();

/**
 * Change the language in a multi-lingual application. conmventioin : if "htm/"
 * is baseHtmlFolderName, then the root folder for kannada, say, is
 * "htm-kannada/"
 */
var setLanguage = function(language) {
	if (exilityPageStack.resetStack(true) == false)
		return;
	var folderName = exilParms.baseHTMLFolderName;
	if (language) {
		var n = folderName.length;
		folderName = folderName.substring(0, n - 1);
		folderName += '-' + language + '/';
	}
	htmlRootPath = topPath + folderName;
};
/**********************************************************************
*
* EX!LANT CONFIDENTIAL
* ___________________________________________________________________
*
*  Copyright (c)[2004 - 2012]  EX!LANT Technologies Pvt. Ltd.
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains the property of EX!LANT * Technologies Pvt. Ltd. and its suppliers, if any.  
* The intellectual and technical concepts contained herein are proprietary to   
* EX!LANT Technologies Pvt. Ltd. and its suppliers and may be covered by India and 
* Foreign Patents, patents in process, and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material is strictly forbidden 
* unless prior written permission is obtained
* from EX!LANT Technologies Pvt. Ltd.
***********************************************************************/
/*
* utility functions.
*/

/**
 * trim supplied string. handle non-string input as well
 * @param str
 * @returns trimmed string
 */
var trim = function (str)
{
	if(!str)
		return '';

	if (str.trim) //this version of javascript supports trim()
		return str.trim();

    if (str.replace) //it is string
    	return str.replace(/^\s+|\s+$/g, '');
    
    return '' + str;
};


// Clones a metadata object. Used in cloning metadata table row.
// Note: Array() clone is not supported.
var clone = function (obj)
{
    //debug("clone() obj="+obj+" typeof()="+typeof(obj));
    if (typeof (obj) != 'object') return obj;
    if (obj == null) return obj;

    var clonedObj = new Object();
    for (var i in obj)
    {
        if (i == 'win') // culprit for infinite recursion, check it.
            clonedObj[i] = obj[i];
        else
            clonedObj[i] = clone(obj[i]);
    }
    return clonedObj;
};

// returns a <TR> element of which the object is a child of
var getRowInTable = function (obj)
{
    if (!obj || !obj.nodeName) return null;
    var tag = obj.nodeName.toUpperCase();
    if (tag == 'FONT')
    {
        while (tag != 'TABLE')
        {
            obj = obj.parentNode;
            tag = obj.nodeName.toUpperCase();
        }
    }

    while (tag != 'BODY')
    {
        //in some case, we treat div as tr. 
        if ((tag == 'TR' || tag == 'DIV') && obj.rowIdx) 
            return obj;
        obj = obj.parentNode;
        if (!obj)
            return null;
        tag = obj.nodeName.toUpperCase();
    }
    debug('no tr found for obj ' + obj.tagName + ' with id ' + obj.id);
    return null;
};

//returns the page name of a given location string 
//example if location = ../../jhjhk/nmnm/a.htm?a=1&b=2 it returns a.htm
var pageOf = function (win, location)
{
    if (!location) return '';
    var loc = String(location);
    var idx = loc.indexOf('?');
    if (idx > 0) loc = loc.substring(0, idx);
    idx = loc.lastIndexOf('/');
    if (idx > 0) loc = loc.substring(idx + 1, 999);
    return loc;
};


// returns an html text that can be set as innerHTMl of a dom element to render dc
var dcToText = function (dc)
{
    var str = '';
    //display messages
    for (var sev in dc.messages)
    {
        str += '<br/>' + sev + '<br/>';
        var endstr = '</font>';
        if (sev.toUpperCase() == "ERROR")
            str += '<font color="red">';
        else if (sev.toUpperCase() == "WARNING")
            str += '<font color="blue">';
        else
            endstr = '';

        var msgs = dc.messages[sev];
        for (var i = 0; i < msgs.length; i++)
            str += msgs[i] + '<br/>';
        str += endstr;
    }

    if (!str)
        str = '<br/>There are no messages<br/>';

    //display values
    str += '<br/>Values are :<br/>';
    str += '<table border="1"><tr><th>Variable</th><th>Value</th></tr>';
    for (var val in dc.values)
    {
        if ((val != 'exilityServerTraceText') && (val != 'exilityServerPerformanceText'))
            str += "<tr><td>" + val + "</td><td>" + dc.values[val] + "</td></tr>";
    }
    str += '</table>';

    //and grids
    str += "<br/>Grids are:<br/>";

    for (var g in dc.grids)
    {
        if (!dc.grids[g]) continue;
        var thisGrid = dc.grids[g];
        str += "<br/>" + g + " has " + thisGrid.length + " rows and ";
        if (thisGrid[0])
            str += (thisGrid[0].length || ' no ');
        str += ' columns<br/><table border="1">';
        //header row
        str += "<tr>";
        if (thisGrid.length > 0)
            for (var j = 0; j < thisGrid[0].length; j++) str += "<th>" + thisGrid[0][j] + "</th>";
        str += "</tr>";
        for (var i = 1; i < thisGrid.length; i++)
        {
            str += "<tr>";
            for (var j = 0; j < thisGrid[i].length; j++)
            {
                str += "<td>";
                if (thisGrid[i][j] == '') str += '&nbsp;';
                else str += thisGrid[i][j];
                str += "</td>";
            }
            str += "</tr>";
        }
        str += "</table>";
    }

    //and finally lists
    str += '<br/>Lists are:<br/><table border="1" cellpadding="0" cellspacing="2"><tr><th>List Name</th><th>Values</th></tr>';
    for (var list in dc.lists)
    {
        if (dc.lists[list]) str += "<tr><td>" + list + "</td><td>" + dc.lists[list] + "</td></tr>";
    }
    str += '</table>';

    return str;
};

//ele.scrollIntoView() is a dom method, but the problem is that it will scroll even if the ele is currently visible.
//Generally, that is not what we want. We want to scroll, if required, so that the ele is visible.
var scrollIntoView = function (ele)
{
    if (!ele || !ele.parentNode)
    {
        debug(ele + ' is not a dom element. scrollIntoView() will not work');
        return;
    }
    //problem with ele.scrollIntoView() is that it may scroll ele to the top of scrolling area even when the ele is visible
    var p = ele.parentNode;
    while (p && p.nodeName.toLowerCase() != 'body')
    {
        if (p.scrollHeight != p.clientHeight && p.scrollHeight != p.offsetHeight)
        {
            if (ele.offsetTop < p.scrollTop)
                p.scrollTop = ele.offsetTop;
            else if (ele.offsetTop > (p.scrollTop + p.clientHeight))
                p.scrollTop = ele.offsetTop - p.clientHeight + ele.clientHeight;
            else
                debug(' No need to scroll ');
            return;
        }
        p = p.parentNode;
    }
    debug('No scrolled parent found for ' + ele.id);
    return;
};

// returns xy-cooridnate of the object
//Needs to be revamped. I do not see code for Safari!!!
// we need to take care of scrolled dimensions as well. PathFinder version of combo.htm has this code.
//to be evaluated and brought-in here
//NOTE : deprecated. use getPageXY() or getDocumentXY instead.
var findXY = function (obj)
{
    //debug('got object ' + obj + ' with id=' + obj.id + ' with its offset parent=' + obj.offsetParent);
    var y = 0;
    var x = 0;
    // Dec 07 2009 : Bug 690 - Calendar Control - Exis (Start) : Aravinda
    IdentifyBrowser.init();
    if (IdentifyBrowser.browser == 'Explorer')
    {
        if (obj.offsetParent)
        {
            while (1)
            {
                x += obj.offsetLeft;
                y += obj.offsetTop;
                if (!obj.offsetParent)
                    break;
                obj = obj.offsetParent;
            }
        }
    }
    // Feb 22 2010 :  Bug ID 975 - Date picker and pop ups are coming down - Exis (Start): Venkat
    else if (IdentifyBrowser.browser == 'Firefox' && exilParms.alignCalendar == true)
    {
        if (obj.offsetParent)
        {
            while (1)
            {
                x += obj.offsetLeft;
                y += obj.offsetTop;
                if (!obj.offsetParent)
                    break;
                obj = obj.offsetParent;
            }
        }
    }
    // Feb 22 2010 :  Bug ID 975 - Date picker and pop ups are coming down - Exis (End): Venkat
    else if (IdentifyBrowser.browser == 'Firefox')
    {
        if (obj.parentNode)
        {
            while (1)
            {
                x += parseInt(obj.offsetLeft);
                y += parseInt(obj.offsetTop);
                if (!obj.parentNode || ((obj.tagName == 'DIV') && (obj.id == 'top')))
                    break;
                obj = obj.parentNode;
            }
        }
    }
    return {x:x, y:y};
};

// message box script BEGIN ////////////////////////////

var messageBtnAction1 = null;
var messageBtnAction2 = null;
var messageBtnActionParam1 = null;
var messageBtnActionParam2 = null;
var messageEles = null; //cache all elements 

//message() is an alternative to alert() and confirm()
/******************
text: message text 
label: optional. header/label for the text
btn1 : text for button 1
btnAction1: optional. action to be taken when button one is pressed. I would have preferred to give it as an object
btn2, btnAction2 :optional. another set, if required. Could be null
btnActionParam1 : parameter with which action1 to be invoked with
btnActionParam2 : ---
NOTE: This requires exility concepts for making this a pop-up
************************/
var message = function (text, label, btn1, btnAction1, btn2, btnAction2, btnActionParam1, btnActionParam2, field)
{
    if (!window.messageEles)
        cacheMessageElements();
    if (!btn1)
        btn1 = 'OK';
    var msgDiv = messageEles.msgDiv;
    if (!msgDiv) //this project has not designed an error panel
    {
        if (btn2) //we need two options
        {
            if (window.confirm(text)) //user clicked on first button
            {
                if (btnAction1)
                {
                	executeFunction(btnAction1, btnActionParam1);
                }
            }
            else
            {
            	executeFunction(btnAction2, btnActionParam2);
            }
        }
        else //just an alert. project may use a warningMsg div
        {
            msgDiv = document.getElementById('warningMsg');
            if (msgDiv) //exis uses this
            {
                alignMsgBox();
                showMessageInPanel(label, text, msgDiv);
            }
            else
            {
                alert(text);
                if (btnAction1)
                {
                	executeFunction(btnAction1, btnActionParam1);
                }
            }
        }

        if (btnActionParam1) //this is typically the html element that resulted in an validaiton error.
        {
            try
            {
                showPanelForSure(btnActionParam1.parentNode);
                if (btnActionParam1.focus)
                    btnActionParam1.focus();
                if (btnActionParam1.select)
                    btnActionParam1.select();
            }
            catch (e) {/*nothing to do */ }
        }
        return;
    }
    
    coverMainStyle.zIndex = 6;	
    coverPage(coverMainStyle, imgMainStyle);

    // reset the global variables for this message.
    messageBtnAction1 = null;
    messageBtnAction2 = null;

    if (messageEles.msgLabel != null)
    {
	    if (label)
	    {
	        messageEles.msgLabel.innerHTML = label;
	    }
	    messageEles.msgText.innerHTML = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }
    else
    {
    	//first line to go to header, and the rest to detail.
    	var n = text.indexOf('\n');
    	var hdr, dtl;
    	if(n < 0)
    	{
    		hdr = text;
    		dtl = '';
    	}
    	else
    	{
    		hdr = text.substr(0, n);
    		dtl = text.substr(n+1);
    	}
        messageEles.msgHeader.innerHTML = hdr;
    	dtl = dtl.split('\n').join('<br /><br />');
    	messageEles.msgDetail.innerHTML = dtl;
    }
    
    if (btn1 && btn1.length > 0)

        messageEles.msgBtnText1.innerHTML = (btn1 == 'Ok' || btn1 == 'ok') ? 'OK' : btn1;
    else
        messageEles.msgBtnText1.innerHTML = 'OK';
        
    if (btnAction1)
    {
        messageBtnAction1 = btnAction1;
        if (btnActionParam1) messageBtnActionParam1 = btnActionParam1;
    }            
    
    if (btn2)
    {
        messageEles.msgBtnText2.innerHTML = btn2;
        messageEles.btnDiv2.style.display = '';
        if (btnAction2)	// Mar 18 2010 : Changed to handle safari issues - Exility App : Aravinda
        {
            messageBtnAction2 = btnAction2;
            if (btnActionParam2) messageBtnActionParam2 = btnActionParam2;
        }
    }
    else
    {
        messageEles.btnDiv2.style.display = 'none';
    }

    msgDiv.style.display = 'block';

    var height = msgDiv.style.height;
    height = height.replace(/[p,P][x,X]/g, '');
    var width = msgDiv.style.width;
    width = width.replace(/[p,P][x,X]/g, '');
    if (height == '')
        height = msgDiv.offsetHeight;
    if (width == '')
        width = msgDiv.offsetWidth;
    var horizontalOffset = document.body.scrollLeft;
    var verticalOffset = document.body.scrollTop;
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;
    msgDiv.style.top = ((verticalOffset + windowHeight / 2) - height / 2 - 25) + "px";
    msgDiv.style.left = ((horizontalOffset + windowWidth / 2) - width / 2 - 225) + "px";
    
    //additional help
    if(messageEles.morePanel){
    	var msg = '';
    	
    	var btnShow = '';
    	if (field && field.additionalMessageName){
	    	msg = dataTypeMessages[field.additionalMessageName] || ('Sorry. We can not show additional help for this field, as we encountered an internal error while retrieving message for ' + field.additionalMessageName);
	    	msg = msg.replace(/&/g, '&amp;');
	    	mag = msg.replace(/</g, '&lt;');
    	}
    	else{
    		btnShow = 'none'; //button to be hidden if there is no message
    	}
    	messageEles.morePanel.innerHTML = msg;
    	messageEles.morePanel.style.display = 'none';
    	messageEles.moreBtnDiv.style.display = btnShow;
    	
    }
};

/**
 * execute a function with supplied parameter. action could be either a function, name of a funciton, or name of an action
 */
var executeFunction = function(action, param)
{
	if(typeof(action) == 'function')
	{
		action(param);
		return;
	}
	
	var fn = currentActiveWindow[action];
	if(typeof(fn) == 'function')
	{
		fn(param);
		return;
	}
	
	currentActiveWindow.P2.act(null, null, action);
};
//Specifically for exis team
var showMessageInPanel = function (label, text, msgDiv)
{
    msgDiv.style.display = 'block';
    var height = msgDiv.style.height;
    height = height.replace(/[p,P][x,X]/g, '');
    var width = msgDiv.style.width;
    width = width.replace(/[p,P][x,X]/g, '');

    var errorType = text.substring(0, 5); //this is only used for errors returned from server

    msgDiv.style.display = '';

    if (label)
    {
        msgDiv.className = 'error';
    }
    else if (errorType == 'error')
    {
        msgDiv.className = 'error';
    }
    else
    {
        msgDiv.className = 'success';
    }
    var ele = document.getElementById('warningMsg');
    ele.innerHTML = text;
};

var cacheMessageElements = function ()
{
    window.messageEles  = { 
    msgDiv : document.getElementById('messageBox'),
    msgLabel : document.getElementById('messageLabel'),
    msgText : document.getElementById('messageText'),
    msgHeader : document.getElementById('messageHeader'),
    msgDetail : document.getElementById('messageDetail'),
    msgBtnText1 : document.getElementById('messageButton1'),
    msgBtnText2 : document.getElementById('messageButton2'),
    btnDiv2 : document.getElementById('messageButtonDiv2'),
    morePanel : document.getElementById('messageAdditionalPanel'),
    moreBtnDiv : document.getElementById('messageButtonDiv3')
    };

};
//give me any object. I ensure  that the panel that contains this object is displayed. This is used for focusing the field
var showPanelForSure = function (panel)
{
    var doc = panel && panel.ownerDocument;
    if(!doc)
    {
        debug('wrong object ' + panel + ' sent to showPanelForSure');
        return;
    }
    for(; panel.tagName.toUpperCase() != 'BODY'; panel = panel.parentNode)
    {
        var panelName = panel.id;
        var tab = doc.getElementById(panelName + 'TabsDiv');
        if(tab)
        {
            if(tab.style.display != 'none')
                continue;
            panel = tab;
            tab = doc.getElementById(panelName + 'Tab');
            tab.onclick(tab, panel.id);
            //alert('I simulated a click on ' + tab.id + ' that shoudl have displayed ' + panel.id);
            continue;
        
        }
        if(!panel.style || panel.display != 'none')
            continue;
        var twister = doc.getElementById(panelName + 'Twister');
        if(twister)
            twister.onclick(twister, panelName);
        else
            panel.style.display = '';
     }
};

var messageButtonClicked = function (messageButton)
{
    var msgDiv = document.getElementById('messageBox');
    msgDiv.style.display = 'none';
    coverMainStyle.zIndex = 2;	
    if(!currentActiveWindow.isAPopup){
        uncoverPage(coverMainStyle, imgMainStyle);
    }
    
    if ((messageButton == 'messageButton1') && (messageBtnAction1 != null))
    {
    	executeFunction(messageBtnAction1, messageBtnActionParam1);
    }
    else if ((messageButton == 'messageButton2') && (messageBtnAction2 != null))
    {        
    	executeFunction(messageBtnAction2, messageBtnActionParam2);
    }
};

/////// div drag script
// Global object to hold drag information.

var dragObj = new Object();
dragObj.zIndex = 0;
var isIE = window.document.all;

var dragStart = function (event, id) 
{
  var x, y;

  // If an element id was given, find it. Otherwise use the element being
  // clicked on.

  if (id)
    dragObj.elNode = document.getElementById(id);
  else {
  	dragObj.elNode = window.event.srcElement;
  	if (!dragObj.elNode)
  	    dragObj.elNode = event.target;
  }
  // Get cursor position with respect to the page.

  if (isIE) {
    x = window.event.clientX + document.documentElement.scrollLeft
      + document.body.scrollLeft;
    y = window.event.clientY + document.documentElement.scrollTop
      + document.body.scrollTop;
  }
  else {
    x = event.clientX + window.scrollX;
    y = event.clientY + window.scrollY;
  }

  // Save starting positions of cursor and element.

  dragObj.cursorStartX = x;
  dragObj.cursorStartY = y;
  dragObj.elStartLeft  = parseInt(dragObj.elNode.style.left, 10);
  dragObj.elStartTop   = parseInt(dragObj.elNode.style.top,  10);

  if (isNaN(dragObj.elStartLeft)) dragObj.elStartLeft = 0;
  if (isNaN(dragObj.elStartTop))  dragObj.elStartTop  = 0;

  // Update element's z-index.

  dragObj.elNode.style.zIndex = ++dragObj.zIndex;

  // Capture mousemove and mouseup events on the page.

  if (isIE) {
    document.attachEvent("onmousemove", dragGo);
    document.attachEvent("onmouseup",   dragStop);
    window.event.cancelBubble = true;
    window.event.returnValue = false;
  }
  else {
    document.addEventListener("mousemove", dragGo,   true);
    document.addEventListener("mouseup",   dragStop, true);
    event.preventDefault();
  }
};

var dragGo = function (event) {

  var x, y;

  // Get cursor position with respect to the page.

  if (isIE) {
    x = window.event.clientX + document.documentElement.scrollLeft
      + document.body.scrollLeft;
    y = window.event.clientY + document.documentElement.scrollTop
      + document.body.scrollTop;
  }
  else {
    x = event.clientX + window.scrollX;
    y = event.clientY + window.scrollY;
  }

  // Move drag element by the same amount the cursor has moved.

  dragObj.elNode.style.left = (dragObj.elStartLeft + x - dragObj.cursorStartX) + "px";
  dragObj.elNode.style.top  = (dragObj.elStartTop  + y - dragObj.cursorStartY) + "px";

  if (isIE) {
    window.event.cancelBubble = true;
    window.event.returnValue = false;
  }
  else
    event.preventDefault();
};

var dragStop = function (event) {

  // Stop capturing mousemove and mouseup events.

  if (isIE) {
    document.detachEvent("onmousemove", dragGo);
    document.detachEvent("onmouseup",   dragStop);
  }
  else {
    document.removeEventListener("mousemove", dragGo,   true);
    document.removeEventListener("mouseup",   dragStop, true);
  }
};


var showToolTip = function (obj)
{
    var targetID = obj.id.replace('docNodeName', 'docXpath');
    PM.toolTipEle.innerHTML='<span class="field" style:"background-color: yellow;">' + document.getElementById(targetID).value + '</span>';
    PM.toolTipStyle.top = event.clientY + 130;
    PM.toolTipStyle.left = event.clientX + 130;
    PM.toolTipStyle.display = 'inline';
};

var hideToolTip = function (obj)
{
    PM.toolTipEle.innerHTML='';
    PM.toolTipStyle.display = 'none';
};

//worker function: accumulate offset xy, or deduct scroll xy
var getSpecificXy = function (node, xy, getOffset, reachTopWindow)
{
    var nextNode;
    while (node)
    {
        //debug('Going to work with ' + node);
        if (getOffset)
        {
            //debug('offset of ' + node.tagName + 'left:' + node.offsetLeft + ' right:' + node.offsetTop + ' with next node as ' + node.offsetParent );
            xy.x += node.offsetLeft;
            xy.y += node.offsetTop;
            nextNode = node.offsetParent;
        }
        else
        {
            //debug('Scroll of ' + node.tagName + 'left:' + node.scrollLeft + ' right:' + node.scrollTop + ' with next node as ' + node.parentNode);
            if (node.scrollLeft)
                xy.x -= node.scrollLeft;
            if (node.scrollTop)
                xy.y -= node.scrollTop;

            nextNode = node.parentNode;
        }

        //if we are to look within this docuent, then we should exclude body/html scrolls
        if (!reachTopWindow && node.nodeName.toUpperCase() == 'BODY')
            return;
            
        if (!nextNode)
        {
            var doc = node.ownerDocument;
            if (!doc)//happens if html element is reached
            {
                doc = node.getElementsByTagName('body')[0].ownerDocument;
            }
            var win = doc.defaultView || doc.parentWindow; //second one for IE8 and before
            if (win.parent == win) //we are on the window. No need to go up.
                return;
            //frameElement points to the dom element of the parent window that has this iframe in it (typically the <iframe> itself
            nextNode = win.frameElement;
            debug('Restarted with parent window element ' + nextNode);
        }
        node = nextNode;
    }
};

//gets XY coordinates of the node relative to the browser page. 
//If this document is part of an iframe, note that the coordinates returned is relative to this top window
var getPageXy = function (node)
{
	var xy = new Object();
	xy.y = 0;
	xy.x = 0;
	//get offset first, and then get scroll
	getSpecificXy(node, xy, true, true);
	getSpecificXy(node, xy, false, true);

	return xy;
};

//gets XY coordinates of the node relative to the documents top. 
//If this document is part of an iframe, note that the coordinates returned is relative to this frame, and not the whole window/page
var getDocumentXy = function (node)
{
	var xy = new Object();
	xy.y = 0;
	xy.x = 0;
	//get offset first, and then get scroll
	getSpecificXy(node, xy, true, false);
	getSpecificXy(node, xy, false, false);

	return xy;
};

//One of the issue in using setTimeout() is that we can not pass parameters. This class is a utility fot that
// caller would say timer = new A.TimeBomb(..). In case you want to stop, call timer.stop();
//obj.funcitonName would be the method called on obj with parm as sole parameter..
var TIMER_ID_PREFIX = 'timer_';
var nextTimerIdToUse = 0;
var TimeBomb = function (obj, functionName, parm, delay, win)
{
    if (!win)
        win = window;
    this.obj = obj;
    this.functionName = functionName;
    this.parm = parm;
    this.id = nextTimerIdToUse;
    nextTimerIdToUse++;
    this.win = win;
    win[TIMER_ID_PREFIX + this.id] = this;
    this.timer = win.setTimeout(TIMER_ID_PREFIX + this.id + '.go();', delay);
};

TimeBomb.prototype.go = function ()
{
    delete this.win[TIMER_ID_PREFIX + this.id];
    this.timer = null;
    try
    {
        this.obj[this.functionName](this.parm);
    } catch (e)
    {
        debug(this.obj + 'with id '+ this.obj.id + '.'+ this.functionName + '(' + this.parm + ') failed with error ' + e);
    }
};

TimeBomb.prototype.stop = function ()
{
    if (!this.timer)
        return;
    this.win.clearTimeout(this.timer);
    this.timer = null;
};


var htmlEscape = function (str)
{
    if (!str || !str.replace)
        return str;
        
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
};

//parse a string containing tab separated name/value pairs.(name=value\tname=value....
//return an object with names as its attributes. Always returns an object. all values are strings. (no parsing of numeric/date values etc..)
var parseAttributes = function (str)
{
    var obj = new Object();
    if (!str)
        return obj;

    var pairs = str.split('\t');
    for (var i = 0; i < pairs.length; i++)
    {
        var pair = pairs[i].split('=');
        if (pair.length != 2)
        {
            debug(str + ' has invalid name/values pairs. "' + pairs[i] + '" will be ignored');
            continue;
        }
        obj[pair[0]] = pair[1];
    }

    return obj;
};

//attach an event listener
//eventNameWithNoOn : blur, click etc.. and not onblur.., fn is the pointer to function
var attachListener = function (ele, eventNameWithNoOn, fn)
{
    if (ele.addEventListener)
        ele.addEventListener(eventNameWithNoOn, fn, true);
    else
        ele.attachEvent("on" + eventNameWithNoOn, fn);
};

/*
 *Purpose of this method to get first non-text node for given domObject.
 *We have an issue in table.js while getting first child for table or div incase if first child 
 *is a text node then table.js will fail.
 *Issue raised by Jintu from DBS Banking project.
 *@param domObj is the any html dom element(i.e div or tbody etc)
 *@returns First non-text Child element for given dom element
 *@author Exility Team on 25 july 2013
 */
//Adding node_type constants.Anant on 12 Dec 2013
var NODE_TYEPE = {TEXT: "#text", COMMENT: "#comment"};
var getFirstNonTextNode = function (domObj)
{
	var nonTextNode = null;	
	for (var i = 0; i < domObj.childNodes.length; i++) 
	{
		nonTextNode = domObj.childNodes[i];
		if (nonTextNode.nodeName === NODE_TYEPE.TEXT || nonTextNode.nodeName === NODE_TYEPE.COMMENT)
		{
			continue;
		}	
	 return nonTextNode;
	}
};


/**
 * 1. if grid has more than 1 rows and value found in any column of a row then return this row idx
 * else -1.
 * @param grid This is the grid with first row as column names obtained from dc.grids['gridName'].
 * @param val : This is the value for which need to look across the columns in row.
 * @param startWithRowIdx : This is the row idx from which we should start to itterate. OPTIONAL.
 * @returns rowIdx if value matched in any column of this row else -1.
 * @author Anant on 31 Dec 2013.
 */
var findRowIndex = function (grid, val, startWithRowIdx, columnsToMacth)
{
	var nbrRows = (grid && grid.length) ? grid.length : 1;
	if(nbrRows < 2 || !val)
	{
		return -1;
	}	
	
	var rowIdx = ( (startWithRowIdx >= 0) && (startWithRowIdx <= (nbrRows - 1) )  ) ? startWithRowIdx : 1;	
	var nbrCols = grid[0].length;//first row contains column names.
	var row, colValue; 
	
	val = val.toString().toUpperCase().trim();
	
	for( ; rowIdx < nbrRows; rowIdx++)
	{
		row = grid[rowIdx];			
		if (!row )
		{
			continue;	
		}	
		
		for(var colIdx = 0; colIdx < nbrCols ; colIdx++)//For searching text in given columns
		{			
			colValue = row[colIdx];	
			
			if (!colValue) 
			{
				continue;
			}	
			
			colValue = colValue.toString().toUpperCase().trim();
			
			if(val === colValue)
			{
				return rowIdx;
			}		
		}
		
	}
	return -1;
};

/**
 * convert SelectionField valueList into grid.
 * valueList is in the form k,v;k1,v1;....
 * @param valueList This is the valueList attached with selection field.
 * @returns grid if valueList is valid list else null.
 * @author Anant
 */
var valueListToGrid = function (valueList)
{
	if(!valueList)
	{
	   return null;		
	}
	var grid = [[]];
	var pair = [];
        
    var vl = valueList.split(';');
    for(var i = 0; i < vl.length; i++)
    {
        pair = vl[i].split(',');
        grid[i] = pair;
    }
    
    return (grid.length  > 0 )? grid : null;
};/**********************************************************************
*
* EX!LANT CONFIDENTIAL
* ___________________________________________________________________
*
*  Copyright (c)[2004 - 2012]  EX!LANT Technologies Pvt. Ltd.
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains the property of EX!LANT * Technologies Pvt. Ltd. and its suppliers, if any.  
* The intellectual and technical concepts contained herein are proprietary to   
* EX!LANT Technologies Pvt. Ltd. and its suppliers and may be covered by India and 
* Foreign Patents, patents in process, and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material is strictly forbidden 
* unless prior written permission is obtained
* from EX!LANT Technologies Pvt. Ltd.
***********************************************************************/
/*
* utility functions.
*/

/**
 * parse string as a date short-cut, or return null.
 */
var evaluateDateShortCuts = function (val)
{
    if (!val)
        return null;
    val = new String(val).toLowerCase();
    if (val == '.' || val == 'today')
        return getToday();

    if (val == '+' || val == 'tomorrow')
        return getToday(1);

    if (val == '-' || val == 'yesterday')
        return getToday(-1);

    var rexp = new RegExp(/^([-|+])(\d+)$/);
    var rexparts = rexp.exec(val);
    if (rexparts != null)
    {
        return getToday(1 * rexparts[0]);
    }

    //look for end-of-week (eow) or beginning-of-week (bow) etc... Not yet implemented
    if (val.length != 3 || val.substr(1, 1) != 'o')
        return null;
    var isBeginning = val.substr(0, 1);
    if (isBeginning == 'b')
        isBeginning = true;
    else if (isBeginning == 'e')
        isBeginning = false;
    else
        return null;

    var lastChar = val.substr(2, 1);
    var d = getToday();
    var n;
    switch (lastChar)
    {
        case 'w': //begin or end of week
            n = d.getDate() - d.getDay(); //points to begin of week
            if (!isBeginning)
                n = n + 6;

            d.setDate(n);
            break;

        case 'm': //month
            if (isBeginning)
                d.setDate(1);
            else
            {
                d.setMonth(d.getMonth + 1);
                d.setDate(-1);
            }
            break;

        case 'q': //quarter, calendar and, obvioulsy, not fiscal
            n = d.getMonth();
            n = n - (n % 3); //month of quarter beginning
            if (isBeginning)
            {
                d.setMonth(n);
                d.setDate(1);
            }
            else
            {
                d.setMonth(n + 3);
                d.setDate(-1);
            }
            break;

        case 'y':
            if (isBeginning)
            {
                d.setMonth(0);
                d.setDate(1);
            }
            else
            {
                d.setMonth(11);
                d.setDate(31);
            }
            break;
    }
    return d;
};

//parse a string as per current setting of client date/time format
var parseDateTime = function (val)
{
    var parts = val.split(' ');
    var dat = parseDate(parts[0]);
    if (!dat) return null;
    if (parts.length <= 1)
        return dat;
    //parse and add time to date;
    parts = parts[1].split(':');
    var hrs = parts[0] ? parseInt(parts[0], 10) : 0;
    var mts = parts[1] ? parseInt(parts[1], 10) : 0;
    var secs = parts[2] ? parseInt(parts[2]) : 0;
    if (isNaN(hrs) || hrs > 23 || hrs < 0 || isNaN(mts) || mts < 0 || mts > 59 || isNaN(secs) || secs < 0 || secs > 59)
        return null;
    dat.setHours(hrs, mts, secs);

    return dat;
};

//parse a string as date as per current client date format
var parseDate = function (val)
{
    var dat = evaluateDateShortCuts(val);
    if (!dat)
    	dat = parseStandardDate(val);
    if(!dat)
    	dat = parseNonStandardDate(val);
    return dat;
};

var parseStandardDate = function (val)
{
    var parts = val.split(exilParms.dateSeparator);
    if (parts.length < 3)
        return null;
    var dd = parseInt(parts[exilParms.dateAt], 10);
    if (isNaN(dd) || dd > 31 || dd <= 0)
        return null;

    var mm = null;
    var mmstr = new String(parts[exilParms.monthAt]);
    if (exilParms.useMonthName)
        mm = exilParms.monthIndex[mmstr.toLowerCase()];
    else
    {
        mm = parseFloat(mmstr, 10);
        mm--;
    }
    if (mm == null || isNaN(mm) || mm < 0 || mm > 11)
        return null;
    var y = parts[exilParms.yearAt];
    var ny = parseInt(y, 10);
    if (isNaN(ny) || ny < 0 || ny > 9999) return null;
    if(ny < 100) //two digit
    {
        if (ny < exilParms.cutOffForShortYear)
            ny = 2000 + ny;
        else
            ny = 1900 + ny;
    }

    var dat = new Date(ny, mm, dd);
    // Date constructor is forgiving, and it accepts 31-feb and makes it 2-Mar or 3-Mar
    if (dat.getMonth() != mm)
        return null;
    return dat;
};

var POSSIBLE_SEPARATORS = [' ', '.', '-', '/'];
/**
 * user did not follow the standard format. Let us try and see if we can still parse it
 * @param val String to be parsed into a date
 * @returns date if we could parse, null otherwise
 */
var parseNonStandardDate = function (val)
{
    var parts = [];
    //try various separators 
	for(var i = POSSIBLE_SEPARATORS.length - 1; i >= 0 ; i--)
	{
		var sep = POSSIBLE_SEPARATORS[i];
		if(val.indexOf(sep) >= 0)
		{
			parts = val.split(sep);
			break;
		}
	}
	if(parts.length > 3)
		return null;
	
	//let us set current month and year as default
	var today = new Date();
    var mm = today.getMonth();
    var yy = today.getFullYear();
    var dd = null;
 
	if(parts.length === 1) //only date specified
    {
		
    	dd = parseInt(parts[0], 10);
    	if(dd){
    		var d = new Date(yy, mm, dd);
    		if(d.getDate() === dd)
    			return d;
    		return null;
    	}
    	
    	return null;
    }
	
	if(parts.length === 2)
		return parseDateAndMonth(parts[0], parts[1], yy);
	return parseThreePartDate(parts[0], parts[1], parts[2]);
};


/**
 * gueass date based on two parts entered by user
 * @param p1 first part
 * @param p2 second part
 * @param year current year
 * @returns date or null if we can not guess the date
 */
var parseDateAndMonth = function (p1, p2, year){
	//guess date and month
	var n1 = parseInt(p1, 10);
	var n2 = parseInt(p2, 10);
	var m1 = exilParms.monthIndex[p1.toLowerCase()];
	var m2 = exilParms.monthIndex[p2.toLowerCase()];
	//our job is to set dd and mm
	var dd = null;
	var mm = null;
	//one of the parts is month short name?
	if(p1.length === 3){
		if(m1 >= 0 && m1 < 12 && n2){
    		dd = n2;
    		mm = m1 + 1;
		}else{
			return null;
		}
	}else if(p2.length === 3){
		if(m2 >= 0 && m2 < 12 && n1){
    		dd = n1;
    		mm = m2 + 1;
		}else{
			return null;
		}
	}else{
		//both have to be non-zero numbers
		if(!n1 || !n2){
			return null;
		}
		
		//at least one of them should be month
		if(n1 > 12 && n2 > 12)
			return null;
		
		if(n1 > 12){
			dd = n1;
			mm = n2;
		}else if(n2 > 12){
			dd = n2;
			mm = n1;
		}else{
			//which one is date? pick it based on current setting
			if(exilParms.dateAt === 0){
				dd = n1;
				mm = n2;
			}else{
	    		dd = n2;
	    		mm = n1;
			}
		}
	}
	var d = new Date(year, mm - 1, dd);
	if(dd === d.getDate())
		return d;
	return null;
};
/**
 * parse a date that came with three parts, but did not follow standards
 * @param p1 first part
 * @param p2 second part
 * @param p3 third part
 * @returns date or null if it can not be guessed
 */
var parseThreePartDate = function (p1, p2, p3){

	var mm, yy, dd;
	var n1 = parseInt(p1, 10);
	var n2 = parseInt(p2, 10);
	var n3 = parseInt(p3, 10);
	//year must be anumber
	if(!n3)
		return null;
	
	if(p2.length === 3){ //second part could be month name
		mm = exilParms.monthIndex[p2.toLowerCase()];
		if(mm < 12)
			mm++;
		else
			return null;
		dd = n1;
		yy = n3;
	} else 	if(p1.length === 3){ //first part could be month name
		mm = exilParms.monthIndex[p1.toLowerCase()];
		if(mm < 12)
			mm++;
		else
			return null;
		dd = n2;
		yy = n3;

	} else{
		if(!n2 || !n1)
			return null;
		
		if(n1 > 1000){
			yy = n1;
			mm = n2;
			dd = n3;
		}else{
			yy = n3;
			if(n1 > 12){
				dd = n1;
				mm = n2;
			} else if(n2 > 12){
				dd = n2;
				mm = n1;
			}else{
				if(exilParms.dateAt === 0){
					dd = n1;
					mm = n2;
				}else{
					dd = n2;
					mm = n1;
				}
			}
		}
			
	}
	var d = new Date(yy, mm - 1, dd);
	if(d.getDate() != dd)
		return null;
	return d;
};
// getToday() : gets today's date with 00:00 as its time.
// This has to be used if date are being compared.
var getToday = function (daysFromToday)
{
    var dat = new Date();
    //a small trick to get the date with todays date, but chop-off hours etc..
    dat = new Date(dat.getFullYear(), dat.getMonth(), dat.getDate());
    if (daysFromToday)
        dat.setDate(dat.getDate() + daysFromToday);
    return dat;
};

var formatDateTime = function (dat)
{
    if (!dat) return '';
    var val = formatDate(dat);
    var hr = dat.getHours();
    if (hr < 10)
        hr = '0' + hr;
    var mt = dat.getMinutes();
    if (mt < 10)
        mt = '0' + mt;
    var sec = dat.getSeconds();
    if (sec < 10)
        sec = '0' + sec;
    return val + ' ' + hr + ':' + mt + ':' + sec;
};

// formatDate()
var formatDate = function (dat)
{
    if (!dat) return "";
    var parts = new Array();
    var nn = dat.getDate();
    if (nn < 10)
        nn = '0' + nn;
    parts[exilParms.dateAt] = nn;
    if (exilParms.useMonthName)
        nn = exilParms.monthNames[dat.getMonth()];
    else
    {
        nn = dat.getMonth() + 1;
        if (nn < 10)
            nn = '0' + nn;
    }
    parts[exilParms.monthAt] = nn;
    var y = dat.getFullYear();
    if (exilParms.useShortYear)
        parts[exilParms.yearAt] = new String(y).substr(2, 2);
    else
        parts[exilParms.yearAt] = y;

    return parts[0] + exilParms.dateSeparator + parts[1] + exilParms.dateSeparator + parts[2];
};

//split a date string into its parts and send an object with these parts as its attributes. Used by InputField to populate split fields.
var getDateTimeParts = function (dateTimeString, showAmPm)
{
    var dt = '';
    var hr = '00';
    var mn = '00';
    var sc = '00';
    var am = 0;
    if (dateTimeString)
    {
        var parts = dateTimeString.split(' '); //split from "dd-mmm-yy hh:mm:sec" (date is already in local format)
        if (parts[0])
            dt = parts[0];

        if (parts[1])
        {
            parts = parts[1].split(':');
            if (parts[0])
            {
                hr = parts[0];
                if (showAmPm)
                {
                    hr = parseInt(parts[0], 10);
                    if (hr > 12)
                    {
                        hr -= 12;
                        am = 1;
                    }
                    if (hr < 10)
                        hr = '0' + hr;
                }
            }
            if (parts[1])
                mn = parts[1];
            if (parts[2])
                sc = parts[2];
        }
    }
    
    return{dt : dt, hr : hr, mn : mn, sc : sc, am : am};
};
/**********************************************************************************************
 *
 * EXILANT CONFIDENTIAL
 * _____________________________________________________________________________________________
 *
 *  [2004 - 2013]  EXILANT Technologies Pvt. Ltd.
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains the property of EXILANT
 * Technologies Pvt. Ltd. and its suppliers, if any.  
 * The intellectual and technical concepts contained herein are proprietary to   
 * EXILANT Technologies Pvt. Ltd. and its suppliers and may be covered by India and 
 * Foreign Patents, patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material is strictly forbidden 
 * unless prior written permission is obtained * from EXILANT Technologies Pvt. Ltd.
 ***********************************************************************************************/

/**********************************************************************************************
 *
 * PURPOSE
 * _____________________________________________________________________________________________
 *
 * In Exility, all data exchanged between various program elements (either java classes, or 
 * from client to server) is done via an object called DataCollection. This object contains
 * key/value pairs and grids. It also contains additional attributes to define success/failure
 * of a call. This object is serialized and de-serialized before sending and after receiving.
 * The serialization is purely text based. This is a fundamental object to exchange data.
 ************************************************************************************************/

/***********************************************************************************************
 * Date			Version		Author			Comments
 *-------------------------------------------------------------------------------------------
 * 10-Dec-2013	 1.0.0		Vishnu Sharma	First draft
 *-------------------------------------------------------------------------------------------
 ***********************************************************************************************/
/**
 * The default constructor
 */
var DataCollection = function() {
	this.values = new Object();
	this.lists = new Object();
	this.grids = new Object();
	this.success = true;
	this.messages = new Object();

};
var a = DataCollection.prototype;
/* Constants used internally by DC */
a.TABLE_SEPARATOR = String.fromCharCode(28); // ASCII file separator
a.BODY_SEPARATOR = String.fromCharCode(29); // ASCII group separator
a.ROW_SEPARATOR = String.fromCharCode(30); // ASCII record separator
a.FIELD_SEPARATOR = String.fromCharCode(31); // ASCII unit separator
a.VALUES_TABLE_NAME = 'values';
a.SUCCESS_FIELD_NAME = '_success';
a.MESSAGES_TABLE_NAME = '_messages';
a.MESSAGE_TYPE_ERROR = "error";
a.MESSAGE_TYPE_WARN = "warning";
a.AUTHENTICATION_STATUS = 'authenticationStatus';
a.TRACE_FIELD_NAME = 'exilityServerTraceText';
a.PERFORMANCE_FIELD_NAME = 'exilityServerPerformanceText';

/**
 * @method fromDc populate this data structure from an object that is possibly
 *         constructed from a json
 * @param dc
 *            object that has all data, but is not an instance of DataCollection
 */
a.fromDc = function(dc) {
	this.success = dc.success;
	this.values = dc.values;
	this.messages = dc.messages;
	this.grids = dc.grids;
	this.lists = dc.lists;
};

/**
 * @method addMessage add a message
 * @param {string}
 *            type of message error/warning/info
 * @param {string}
 *            message text
 */
a.addMessage = function(typ, text) {
	typ = typ.toLowerCase();
	var msgs = this.messages[typ];
	if (!msgs || typeof msgs === "undefined") {
		msgs = new Array();
		this.messages[typ] = msgs;
	}
	msgs.push(text);
	if (typ == this.MESSAGE_TYPE_ERROR)
		this.success = false;
};

/**
 * @method hasValues - checks whether there is at least one value in the
 *         collection
 * @returns {boolean} true if dc has at least one value, false otherwise
 */
a.hasValues = function() {
	for ( var val in this.values) {
		return true;
	}
	return false;
};

/**
 * @method getValue get the value from name-vale pairs
 * @param {string}
 *            name
 * @returns {any} value associated with this name, or null if no name-value pair
 *          found with this name
 */
a.getValue = function(name) {
	return this.values[name];
};
/**
 * @method hasValue check for a name-value pair with this name
 * @param {string}
 *            name
 * @return {boolean} true if this name is part of name-value pair collection,
 *         false otherwise
 */
a.hasValue = function(name) {
	return typeof this.values[name] !== 'undefined';
};

/**
 * @method addValue add a name-value pair, replacing any existing pair
 * @param {string}
 *            name
 * @param {any}
 *            value
 */
a.addValue = function(name, value) {
	this.values[name] = value;
};

/**
 * @method removeValue remove a name-value pair and return the that value
 * @param {string}
 *            name
 * @return {any} value if that is removed, or undefined if it did not exist
 */
a.removeValue = function(name) {
	var val = this.values[name];
	delete this.values[name];
	return val;
};
/**
 * Get the grid in the internal grids collection of this DC instance ARGUMENTS:
 * 1. name - The name of the grid to extract RETURNS: A grid object if found
 * else undefined
 */
a.getGrid = function(name) {
	return this.grids[name];
};
/**
 * Add a new grid to the internal grids collection. If a grid exists under the
 * same key, it will be updated ARGUMENTS: 1. name - The name of the grid 2.
 * grid - The grid object to add RETURNS: None
 */
a.addGrid = function(name, grid) {
	if (this.grids[name])
		debug('grid '
				+ name
				+ ' is already in the dc. It will be replaced with the new grid');
	this.grids[name] = grid;
};
/**
 * Remove a grid from the internal grids collection. If a grid with the given
 * key does not exists then no changes will be made. ARGUMENTS: 1. name - The
 * key name to use RETURNS: None
 */
a.removeGrid = function(name) {
	var grid = this.grids[name];
	delete this.grids[name];
	return grid;
};
/**
 * Add a list of values to the internal list of values A value list is nothing
 * but an array. If value list under the same name exists, it will be updated
 * ARGUMENTS: 1. name - The name of value list 2. valueList - The value list to
 * add RETURNS: None
 */
a.addList = function(name, valueList) {
	this.lists[name] = valueList;
};
/**
 * Get the value list for the given key name ARGUMENTS: 1. name - The key name
 * by which we need to get the value list RETURNS: The value list instance if
 * found else undefined
 */
a.getList = function(name) {
	return this.lists[name];
};
/**
 * Remove the value list from the internal collection of value list objects If
 * the value list for the given name is not found, then no changes take place
 * ARGUMENTS: 1. name - The name of the value list to remove
 */
a.removeList = function(name) {
	var list = this.lists[name];
	delete this.lists[name];
	return list;
};
/**
 * Check if the DC instance represents an error condition RETURNS: boolean
 */
a.hasError = function() {
	return (!this.success);
};
/**
 * Get all the messages embedded in this instance of DC RETURNS: string
 */
a.getMessageText = function() {
	var str = '';
	for ( var mKey in this.messages) {
		if (mKey == ClientConstants.MESSATE_TYPE_ERROR)
			str += 'Error\n';
		else
			str += mKey + '\n';

		var arr = this.messages[mKey];
		for ( var i = 0; i < arr.length; i++)
			str += arr[i] + '\n';
	}
	return str;
};
/**
 * Serialize the DC object RETURNS: string
 */
a.serialize = function() {
	var val = '';
	var str = [ this.VALUES_TABLE_NAME, this.BODY_SEPARATOR ];
	var firstValue = true;
	for (name in this.values) {
		val = this.values[name];
		if (!val && val != 0)
			val = '';
		if (firstValue)
			firstValue = false;
		else
			str.push(this.ROW_SEPARATOR);
		str.push(name);
		str.push(this.FIELD_SEPARATOR);
		str.push(val);
	}

	for ( var gridName in this.grids) {
		if (!this.grids[gridName])
			continue;
		var thisGrid = this.grids[gridName];

		str.push(this.TABLE_SEPARATOR);
		str.push(gridName);
		str.push(this.BODY_SEPARATOR);

		for ( var i = 0; i < thisGrid.length; i++) {
			if (i != 0)
				str.push(this.ROW_SEPARATOR);
			var row = thisGrid[i];
			for ( var j = 0; j < thisGrid[i].length; j++) {
				var val = row[j];
				if (!val && val != 0)
					val = '';
				if (j != 0)
					str.push(this.FIELD_SEPARATOR);
				str.push(val);
			}
		}
	}
	// and finally lists

	for ( var listName in this.lists) {
		var list = this.lists[listName];
		if (list) {
			str.push(this.TABLE_SEPARATOR);
			str.push(listName);
			str.push(this.BODY_SEPARATOR);
			for (i = 0; i < list.length; i++) {
				if (i != 0)
					str.push(this.ROW_SEPARATOR);
				str.push(list[i]);
			}
		}
	}
	return str.join('');
};
/**
 * De-serialize DC. From the given text, populate this DC instance ARGUMENTS: 1.
 * txt - The serialized text representation of the DC RETURNS: A new instance of
 * DC
 */
a.deserialize = function(txt) {
	var tablesAndNames = txt.split(this.TABLE_SEPARATOR);
	for ( var i = 0; i < tablesAndNames.length; i++) {
		var t = tablesAndNames[i].split(this.BODY_SEPARATOR);
		if (t.length != 2) // empty ones, put at the beginning and at end as
			// possible defence against characters added by jsp
			continue;
		var tableName = t[0];
		var rows = t[1].split(this.ROW_SEPARATOR);
		var grid = [];
		for ( var j = 0; j < rows.length; j++) {
			grid.push(rows[j].split(this.FIELD_SEPARATOR));
		}
		var row;
		if (tableName == this.VALUES_TABLE_NAME) {
			for ( var j = 1; j < grid.length; j++) {
				row = grid[j]; // row is name, value
				this.addValue(row[0], row[1]);
			}
			var st = this.getValue(this.SUCCESS_FIELD_NAME);
			this.success = st && (st == '1');
			continue;
		}

		if (tableName == this.MESSAGES_TABLE_NAME) {
			for ( var j = 1; j < grid.length; j++) {
				row = grid[j]; // columns are messageId, severity and text
				this.addMessage(row[0], row[1]);
			}
			continue;
		}
		this.addGrid(tableName, grid);
	}
};
/**
 * Pickup and populate DC instance attributes from the given HTML element
 * 
 * @param element
 *            do element from which fields are to be picked-up
 */
a.fromElement = function(element) {
	var children = element.getElementsByTagName('input');
	var n = children.length;
	var id, val;
	var ele = null;
	for ( var i = 0; i < n; i++) {
		ele = children[i];
		id = ele.name || ele.id;
		if (!id)
			continue;

		var typ = ele.type ? ele.type.toLowerCase() : 'text';
		if (typ != 'text')// small optimization because text is the most
		// common input
		{
			// buttons are not values. Also, we do not handle file in this
			if (typ === 'button' || typ == 'reset' || typ === 'submit'
					|| typ == 'image' || typ === 'file')
				continue;

			// unchecked radio/check-box to be ignored
			if (typ == 'radio' || typ == 'checkbox') {
				if (!ele.checked)
					continue;
			}
		}

		val = ele.value;
		// name should not repeat, except for check-boxes. We use comma
		// separated value
		if (this.hasValue(id))
			val = this.getValue(id) + ',' + val;
		this.addValue(id, val);
	}

	// drop-downs
	children = element.getElementsByTagName('select');
	n = children.length;
	for ( var i = 0; i < n; i++) {
		ele = children[i];
		id = ele.id || ele.name;
		if (!id)
			continue;
		var options = ele.childNodes;
		val = null;
		if (ele.multiple) {
			for ( var j = 0; j < options.length; j++) {
				var option = options[j];
				if (options.selected) {
					if (val)
						val += ',' + option.value;
					else
						val = option.value;
				}
			}
		} else if (ele.selectedIndex || ele.selectedIndex == 0)
			val = options[ele.selectedIndex].value;

		if (val != null)
			this.addValue(id, val);
	}
};
/**
 * Conver the DC instance to HTML representation
 * 
 * @return HTML string for rendering the dc
 */
a.toHtml = function() {
	var htmlArr = [];
	this.messagesToHtml(htmlArr);
	this.valuesToHtml(htmlArr);
	this.gridsToHtml(htmlArr);
	this.listsToHtml(htmlArr);
	return htmlArr.join('');
};
/**
 * Convert the messages stored in this DC instance to HTML ARGUMENTS: 1.
 * 
 * @param htmlStrArr -
 *            An array that will contain the HTML string
 */
a.messagesToHtml = function(htmlStrArr) {
	// we have to handle case when there are no messages
	var msgFound = false;
	for ( var sev in this.messages) {
		msgFound = true;
		htmlStrArr.push('<br/>');
		htmlStrArr.push(sev);
		htmlStrArr.push('<br/>');
		var endstr = '</font>';
		if (sev === this.MESSAGE_TYPE_ERROR)
			htmlStrArr.push('<font color="red">');
		else if (sev === this.MESSAGE_TYPE_WARN)
			htmlStrArr.push('<font color="blue">');
		else
			endstr = '';

		var msgs = this.messages[sev];
		for ( var i = 0; i < msgs.length; i++)
			htmlStrArr.push(msgs[i] + '<br/>');
		htmlStrArr.push(endstr);
	}

	if (!msgFound)
		htmlStrArr.push('<br/>There are no messages<br/>');
};
/**
 * Convert values stored in this DC instance to an HTML ARGUMENTS: 1. htmlStrArr -
 * 
 * @param htmlStrArr
 *            The array that will contain the returned HTML string
 */
a.valuesToHtml = function(htmlStrArr) {
	// very unlikely that there are no name-value pairs. It is OK to say values
	// and not print anything after that
	htmlStrArr.push('<br/>Values are :<br/>');
	htmlStrArr
			.push('<table border="1"><tr><th>Variable</th><th>Value</th></tr>');
	for ( var varName in this.values) {
		if ((varName == this.TRACE_FIELD_NAME)
				|| (varName == this.PERFORMANCE_FIELD_NAME))
			continue;
		htmlStrArr.push('<tr><td>');
		htmlStrArr.push(varName);
		htmlStrArr.push('</td><td>');
		htmlStrArr.push(this.values[varName]);
		htmlStrArr.push('</td></tr>');
	}
	htmlStrArr.push('</table>');
};
/**
 * Convert the grids stored in this DC instance into HTML ARGUMENTS: 1.
 * 
 * @param htmlStrArr -
 *            The array that will hold the returned HTML
 */
a.gridsToHtml = function(htmlStrArr) {
	var gridFound = false;

	for ( var gridName in this.grids) {
		var thisGrid = this.grids[gridName];
		if (!thisGrid)
			continue;
		if (!gridFound) {
			htmlStrArr.push('<br/>Grids are:');
			gridFound = true;
		}
		htmlStrArr.push('<br/>');
		var n = thisGrid.length;
		var m = n && thisGrid[0].length;
		htmlStrArr.push(gridName);
		htmlStrArr.push(' has ');
		if (!m) {
			htmlStrArr.push(' no data.');
			continue;
		}

		htmlStrArr.push(n - 1);
		htmlStrArr.push(' data rows and ');
		htmlStrArr.push(m);
		htmlStrArr.push(' columns<br/><table border="1"><tr>');
		// header row
		var hdr = thisGrid[0];
		for ( var j = 0; j < m; j++) {
			htmlStrArr.push('<th>');
			htmlStrArr.push(hdr[j]);
			htmlStrArr.push('</th>');
		}
		htmlStrArr.push('</tr>');

		// data rows
		for ( var i = 1; i < n; i++) {
			htmlStrArr.push('<tr>');
			var row = thisGrid[i];
			for ( var j = 0; j < m; j++) {
				htmlStrArr.push('<td>');
				htmlStrArr.push(row[j] || '&nbsp;');
				htmlStrArr.push('</td>');
			}
			htmlStrArr.push('</tr>');
		}
		htmlStrArr.push('</table>');
	}
};
/**
 * Convert the lists stored in this DC instance to HTML
 * 
 * @param htmlStrArr
 *            buffer array to which html is to be pushed to
 */
a.listsToHtml = function(htmlStrArr) {
	var listFound = false;
	for ( var listName in this.lists) {
		var list = this.lists[listName];
		if (!list)
			continue;
		if (!listFound) {
			htmlStrArr
					.push('<br/>Lists are:<br/><table border="1" cellpadding="0" cellspacing="2"><tr><th>List Name</th><th>Values</th></tr>');
			listFound = true;
		}
		htmlStrArr.push('<tr><td>');
		htmlStrArr.push(listName);
		htmlStrArr.push('</td><td>');
		htmlStrArr.push(list);
		htmlStrArr.push('</td></tr>');
	}
	if (listFound)
		htmlStrArr.push('</table>');
};
/**
 * @module fieldFormatters is a global object that has the actual function
 *         definition for the formatters used by designers as part of page.xml
 *         exility provides some default formatters that are defined here.
 *         Projects should add other formatetrs, on the lines of the code
 *         written here
 */

/**
 * let us play it safe and not wipe-out project defined definitions, in case
 * they include the file before this file
 */
if (!window.fieldFormatters)
	window.fieldFormatters = {};

/**
 * to lower case
 */
if (!fieldFormatters.lcase) {
	fieldFormatters.lcase = function(val) {
		if (val)
			val = val.toLowercase();
		return val;
	};
}

/**
 * utility function to format a whole number with digit separators.
 * International standard is to use separator after every three digits, while
 * India uses after every digits, except the last three digits as thousands
 * 
 * @param val
 *            integer to be formatted
 * @param nbrPlaces
 *            number of digits after which to put the separator. This is 2 for
 *            India (lacs, crores etc..) and 3 for millions/billions..
 * @param separator
 *            character to be used as separator. '.' for continental Europe, and
 *            ',' for rest of the world
 * @returns number as a formatted string
 */
fieldFormatters.formatWholeNumber = function(val, nbrPlaces, separator) {
	val = val + '';
	/*
	 * first separator (from right) is always after three places
	 */
	var n = val.length - 3;
	if (n <= 0)
		return val;
	newVal = val.substr(n, 3);
	while (true) {
		if (n <= nbrPlaces) // this is the last part
			return val.substr(0, n) + separator + newVal;
		// copy next 2-3 chars from right....
		n = n - nbrPlaces;
		newVal = val.substr(n, nbrPlaces) + separator + newVal;
	}
};

/**
 * formats a decimal number
 * 
 * @param val
 *            decimal number to be formatted
 * @param nbrPlaces
 *            2 for Indian system, 3 for others
 * @param separator
 *            character to be used as digit separator. '.' for continental
 *            Europe, and ',' for the rest. decimal charcter would be the
 *            otherway round
 * @returns formatted text
 */
fieldFormatters.formatFraction = function(val, nbrPlaces, separator) {
	val = Math.round(parseFloat(val) * 100); // val=12.35234 if it is 1235.
	var sign = '';
	/*
	 * floor would be an issue if we do not handle negative numbers this way
	 */
	if (val < 0) {
		sign = '-';
		val = -val;
	}
	var whole = Math.floor(val / 100);
	var frn = (val - whole * 100);
	if (frn < 10) {
		frn = '0' + frn;
	}
	if (separator == ',') {
		frn = '.' + frn;
	} else {
		frn = ',' + frn;
	}
	return sign
			+ fieldFormatters.formatWholeNumber(whole, nbrPlaces, separator)
			+ frn;
};

/**
 * format Indian Rupee with no decimal
 */
if (!fieldFormatters.inr) {
	fieldFormatters.inr = function(val) {
		val = Math.round(parseFloat(val));
		if (val >= 0) {
			return fieldFormatters.formatWholeNumber(val, 2, ',');
		}
		return '-' + fieldFormatters.formatWholeNumber(-val, 2, ',');

	};
}

/**
 * format Indian Rupee with 2 decimal
 */
if (!fieldFormatters.inr2) {
	fieldFormatters.inr2 = function(val) {
		return fieldFormatters.formatFraction(val, 2, ',');
	};
}
/**
 * format a euro number
 */
if (!fieldFormatters.eur) {
	fieldFormatters.eur = function(val) {
		val = Math.round(parseFloat(val));
		if (val >= 0) {
			return fieldFormatters.formatWholeNumber(val, 3, '.');
		}
		return '-' + fieldFormatters.formatWholeNumber(-val, 3, '.');

	};
}

/**
 * format a euro amount with 2 decimal places
 */
if (!fieldFormatters.eur2) {
	fieldFormatters.eur2 = function(val) {
		return fieldFormatters.formatFraction(val, 3, '.');
	};
}

/**
 * format usd with no decimal place
 */
if (!fieldFormatters.usd) {
	fieldFormatters.usd = function(val) {
		val = Math.round(parseFloat(val));
		if (val >= 0) {
			return fieldFormatters.formatWholeNumber(val, 3, ',');
		}
		return '-' + fieldFormatters.formatWholeNumber(-val, 3, ',');

	};
}

/**
 * format usd with two decimal places
 */
if (!fieldFormatters.usd2) {
	fieldFormatters.usd2 = function(val) {
		return fieldFormatters.formatFraction(val, 3, ',');
	};
}

/**
 * default amt maps to inr
 */
if (!fieldFormatters.amt) {
	fieldFormatters.amt = function(val) {
		return fieldFormatters.inr(val);
	};
}

/**
 * default amt maps to inr
 */
if (!fieldFormatters.amt2) {
	fieldFormatters.amt2 = function(val) {
		return fieldFormatters.inr2(val);
	};
}
/**
 * @module this is the base list of messages that Exility uses internally.
 *         dataTypes.js as generated by the generator will add other messages
 *         used by the application
 */
var messagesObject = function messagesObject() {
	messages = new Object();
	messages["exilGetValueError"] = "exilGetValueError";
	messages["exilSetValueError"] = "exilSetValueError";
	messages["exilSetValueErrorOutputField"] = "exilSetValueErrorOutputField";
	messages["exilSetValueErrorTextInputField"] = "exilSetValueErrorTextInputField";
	messages["exilFillListError1"] = "exilFillListError1";
	messages["exilSetValueErrorSelectionField"] = "exilSetValueErrorSelectionField";
	messages["exilMustEnterError"] = "This Field is Mandatory";
	messages["exilPageParameterMissing"] = "exilPageParameterMissing";
	messages["exilFillListNoGrids"] = "exilFillListNoGrids";
	messages["exilValidateDependecyFailed"] = "exilValidateDependecyFailed";
	messages["exilNoIdField"] = "exilNoIdField";
	messages["exilValidateUniqueColumnsFailed"] = "exilValidateUniqueColumnsFailed";
	messages["exilIdMismatchError"] = "exilIdMismatchError";
	messages["exilGetValueError"] = "exilGetValueError";
	messages["exilSetValueErrorCheckBoxField"] = "exilSetValueErrorCheckBoxField";
	messages["exilNumberValidateFromToFailed1"] = "exilNumberValidateFromToFailed1";
	messages["exilNumberValidateFromToFailed2"] = "exilNumberValidateFromToFailed2";
	messages["exilTextValidateFromToFailed1"] = "exilTextValidateFromToFailed1";
	messages["exilTextValidateFromToFailed2"] = "exilTextValidateFromToFailed2";
	messages["exilDateValidateFromToFailed1"] = "exilDateValidateFromToFailed1";
	messages["exilDateValidateFromToFailed2"] = "exilDateValidateFromToFailed2";
	messages["exilParseDateFailedNullValue"] = "exilParseDateFailedNullValue";
	messages["exilParseDateFailedImproperFormat"] = "exilParseDateFailedImproperFormat";
	messages["exilParseDateFailedDDisNaN"] = "exilParseDateFailedDDisNaN";
	messages["exilParseDateFailedYYYYisNaN"] = "exilParseDateFailedYYYYisNaN";
	messages["exilParseDateFailedDateChanged"] = "exilParseDateFailedDateChanged";

	this.getMessage = function(win, messageId) {
		return messages[messageId];
	};
};

var systemMessages = new messagesObject(); /*
  * File: serverAgent.js
  * Description:
  * This file contains objects and methods required for communicating to the
  * server.
  */
  
//var serverStub = new ExilityServerStub(window);

// Single jsp file is requested for all types of services. Based on the serviceId
// the server knows the type of service. The server has a predefined service list.

var pendingServerCalls = null; // global collection that accumulates services
								// that failed session before re-sending them

// ExilityServerStub class represents the server interface.
// Each html page has a global object 'serverStub' defined for communicating
// to the server. 'serverStub' handles multiple asynchronous service requests
// using a queue.
var ExilityServerStub = function (win)
{
    this.win = win;
	// Here we have fixed timeout value for all requests. We can have timeout on
	// a per request basis also,
	// in which case, timeout field has to be part of callBackObject.
	this.TIMEOUT = 120000; // that is two minutes
	this.SQ = new Object(); // of ServiceEntry
	this.SQ.nextIdx = 1;
	this.refreshPageUnderProgress = false;
	this.pendingServices = new Array();
};

// This class represents the queue entry for each service request. All kinds of
// information required to
// process it before/after call are stored in this
var ServiceEntry = function (serviceId, dc, waitForResponse, callBackAction, callBackObject, fieldName, toRefreshPage, disableForm, showPage, fieldToFocusAfterExecution, listServiceOnLoad, callBackEvenOnError)
{
    this.serviceId = serviceId;
	this.dc = dc || new DataCollection();
	this.waitForResponse = waitForResponse;
	// callBack action could be either a function object, or a string that is an
	// Action
	
	this.callBackAction = callBackAction;
	this.callBackObject = callBackObject;
	this.fieldName = fieldName;
	this.toRefreshPage = toRefreshPage ? toRefreshPage : ServerAction.BEFORE;
	this.httpObject = null; // xmlHttp object will be assigned at the time of
							// firing;
	this.timerHandle = null; // will be assigned at the time of firing the
								// service
	// current design is that the request to server is sent thru a single
	// aspx/jsp and serviceId is a field in dc
	this.dc.addValue('serviceId', serviceId);
	if (window.testCaseToBeCaptured) {
		this.dc.addValue(ClientConstants.TEST_CASE_CAPTURE, testCaseToBeCaptured);
	}
	this.url = ''; 
	this.disableForm = disableForm;
	this.showPage = showPage;
	this.fieldToFocusAfterExecution = fieldToFocusAfterExecution;
	this.listServiceOnLoad = listServiceOnLoad; 
	this.callBackEvenOnError = callBackEvenOnError;
};

// Is it possible that multiple types of service are invoked simultaneously from
// a single object?
// here the assumption is NO e.g. I should not be invoking both data and desc
// service from an
// text input field.
//
// callBackObject is the object from which the service is invoked.

ExilityServerStub.prototype.callService = function (se)
{
    var sid = se.serviceId;
    if (!sid)
        throw ('Design Error: Service is called with no service ID');
    var dc = se.dc;
    se.win = this.win;
    debug('Received a request for service=' + sid + ' and waitForResponse=' + (se.waitForResponse ? 'true' : 'false') + ' with following data.');
    debug(dcToText(dc), true);
    /*
	 * do we have local services?
	 */
    if(PM.localServices && PM.localServices[sid]){
		this.callLocalService(localService);
		return;
    }
    
    var src;
    if (exilParms.serviceName) // relative to root
        src = topPath + exilParms.serviceName;
    else
        src = exilParms.commonServiceName;
    var dcText = '';
    var method = "POST";

    debug('Going to make a request for url ' + src);
    // add tracer field if required
    if (exilityTraceWindow != null)
        dc.addValue('exilityServerTrace', '1');

    dcText = this.serializeDc(dc);

    if (exilityDataTraceWindow != null)
    {
        datadebug("Request : <br>" + dcText);
    }

    var httpObject = null;
    if (typeof (ActiveXObject) != "undefined")
        httpObject = new this.win.ActiveXObject("Microsoft.XMLHTTP");
    else
        httpObject = new this.win.XMLHttpRequest();

    se.url = src;
    // debug(src);
    se.httpObject = httpObject;
    var async = !se.waitForResponse;
    if (async)
    {
        // add se to the queue
        var n = this.SQ.nextIdx;
        this.SQ.nextIdx++;
        this.SQ[n] = (se);
        se.timerHandle = this.win.setTimeout("PM.timeoutCallback(serverStub, " + n + ")", this.TIMEOUT); // timeoutCallback()
																											// belongs
																											// to
																											// window
																											// object.;

        // we want our this.processServiceEntry(se) to be invoked when the
		// httpObject successfully returns.
        // problem is that the callBack function we attach can not take an
		// argument. We can create a global variable,
        // but there can be more than one active calls?
        // To take care of this, I have resorted to creating a function at run
		// time, in which the index to SQ is used
        // to call back this.httpCallBack(n) method. This function must be
		// created in the same window where we create
        // httpObject. To reduce possibility of clashes if several windows are
		// active at a time, httpObject
        // is created in the page window (and not Exility Window) Hence the
		// function is created in page window
        // refer to getCallbackFunction in exilityLoader.js.
        // If you do not want to complicate your life with all these details, it
		// is enough to know that the control comes to
		// this.handleServiceEntry(serviceId, se)
        httpObject.onreadystatechange = this.win.getCallbackFunction(n);
        // it is possible that the calling window has not called the stub as
		// exilityServerStub
        if (!this.win.serverStub)
        {
            this.win.serverStub = this;
        }
    }
    try
    {
        httpObject.open(method, src, async);
        httpObject.setRequestHeader("Content-Type", "text/html; charset=utf-8");
        var token = getCsrfToken();
        if(token)
        {
        	httpObject.setRequestHeader(ClientConstants.CSRF_HEADER, token);
        }
        httpObject.send(dcText);
    }
    catch (e)
    {
        if (se.serviceId == 'paginationService' && dc.values['pageNo'] == '0')
            debug("Ignoring the network error, as it is supposed to remove session data only");
        else
            message("Application is unable to process your request because network connection is not available. Please establish Network connection and try again.", "", "Ok", null, null, null);
        // alert('error while sending request to ' + src + '\n' + e);
        if (se.disableForm)
            uncoverPage(coverPickerStyle, imgMainPrgIndStyle);
        return;
    }
    // if it is sync, call would have returned right away, and hence we have to
	// process.
    // Else it gets processed when the onreadystatechange triggers.. Refer to
	// httpCallback in exilityLoader.
    if (se.waitForResponse)
        this.processServiceEntry(se);
};

ExilityServerStub.prototype.callLocalService = function(localService){
//
};

ExilityServerStub.prototype.httpCallBack = function (n)
{
    var se = this.SQ[n];
    if (!se)
    {
        // service had already timed out... alert("ServiceReturned(), unknown
		// response: index=" + n);
        return;
    }
    var rs = se.httpObject.readyState;
    // 4 is when it is ready
    if (rs < 4)
        return;
    // timer is ticking to handle the case when server refuses to respond..
	// switch that off first
    delete this.SQ[n];
    if (se.timerHandle)
        this.win.clearTimeout(se.timerHandle);

    this.processServiceEntry(se);
};

ExilityServerStub.prototype.processServiceEntry = function (se, timedOut)
{
    var docStatus = se.httpObject.status;
    debug('Asynch call has returned  for serviceId = ' + se.serviceId + ' with document status = ' + docStatus);

    if (docStatus != 200 && docStatus != 0)
    {
        var msg = systemMessages.getMessage(null, docStatus);
        if (msg)
            debug(msg);
        else
        {
            alert('Error while communicating with server. Status code returned = ' + docStatus + '\nSee trace for additional information.');
            debug('server returned the following error message.\n' + se.httpObject.responseText);
        }

        if (se.disableForm)
            uncoverPage(coverPickerStyle, imgMainPrgIndStyle); 

        return;
    }

    // is the window still there?
    try
    {
        if (!se.win || se.win.closed)
        {
            debug('Window is already closed for service ' + se.serviceId);
            return;
        }
        temp = se.win.location.href;
    }
    catch (e)
    {
        debug('Window is already closed for service ' + se.serviceId);
        return;
    }
    if (timedOut) // server time-out
    {
        this.windup(se, true);
        return;
    }
    var responseText = se.httpObject.responseText;

    var dc = null;
    try
    {
        if (responseText.length == 0)
        {
            dc = new DataCollection();
        }
        else
        {
            if (responseText.substr(0, 15).indexOf('var dc = ') >= 0)
                eval(responseText);
            else
                dc = this.deserializeDc(responseText);
        }
    }
    catch (e)
    {
        try
        {   // try to show the actual response in trace
            // headerMenu.startTrace();
            debug('error While Evaluating data returned by server. ' + e.toString());
            debug(responseText);
        }
        catch (ee) {
        	//
        }

        var msg = systemMessages.getMessage(null, "invalidDataFromServer") || ('Unable to get response from server.\n' + e);
        alert(msg);
        this.windup();
        return;
    }
    /**
	 * process CSRF token
	 */
    var token = se.httpObject.getResponseHeader(ClientConstants.CSRF_HEADER);
    if(token){
    	if(token === ClientConstants.REMOVE_CSRF)
    		token = null;
    	this.setCsrfToken(token);
    }

    this.handleReturnedDc(dc, se);
    if (se.fieldToFocusAfterExecution)
    {
        var eleToFocus = se.win.P2.doc.getElementById(se.fieldToFocusAfterExecution);
        if (eleToFocus)
        {
            try { eleToFocus.focus(); } catch (e) {
            	//
            }
        }
    }
};

ExilityServerStub.prototype.windup = function (se, hasFailed)
{
    if (hasFailed && se.field && se.field.descServiceId)
        se.field.isValid = false;
    if (se.disableForm)
        uncoverPage(coverPickerStyle, imgMainPrgIndStyle);
    if (se.showPage && se.win.P2)
        se.win.P2.showPage();
};

ExilityServerStub.prototype.handleReturnedDc = function(dc, se)
{
    
    // comment the following two lines if you need to serialize the processing
	// of services returned.
    this.processReturnedDc(dc, se);
    return;

    // rest of the function takes care of serialization
    if(this.refreshPageUnderProgress)
    {
        debug(' another srvice is executing. Going to set a timeout');
        this.pendingServices.push(new PendingService(dc, se));
        this.win.setTimeout("serverStub.processServiceQ();",100);
        return;
    }
    this.refreshPageUnderProgress = true;

    this.processReturnedDc(dc, se);
    this.refreshPageUnderProgress = false;
    return;
};

// required if serialization of processing is enabled.
ExilityServerStub.prototype.processServiceQ = function()
{
    if(this.refreshPageUnderProgress)
    {
        debug(' another srvice is Still busy, Once again going to set a timeout');
        this.win.setTimeout("P2.processServiceQ();",100);
        return;
    }
    
    var pe = this.pendingServices.pop();
    if(!pe)
    {
        debug('design error: pendingServices is empty when I tried to wake up and process it');
        return
    }
    this.refreshPageUnderProgress = true;
    this.processReturnedDc(pe.dc, pe.se);
    this.refreshPageUnderProgress = false;
};

ExilityServerStub.prototype.processReturnedDc = function (dc, se)
{
	var str;
    if (dc.values)
    {
        str = dc.values[ClientConstants.TRACE_NAME];
        if (str)
        {
            debug("*********** SERVER TRACE START *********");
            debug(str);
            debug("*********** SERVER TRACE END *********");
            delete dc.values[ClientConstants.TRACE_NAME];
        }
        str = dc.values[ClientConstants.PERF_TRACE_NAME];
        if (str)
        {
            debug("*********** SERVER PERFORMANCE START *********");
            debug(str);
            debug("*********** SERVER PERFORMANCE END *********");
            delete dc.values[ClientConstants.PERF_TRACE_NAME];
        }
        debug(' data recd from server is');
        debug(dcToText(dc), true);
        // is there issue with authentication etc??
        var authenticationStatus = dc.values[ClientConstants.AUTH_STATUS];
        if (authenticationStatus > 0)
        {
            if (authenticationStatus == 1) // session expired
            {
                if (pendingServerCalls) // nad we had already started a queue
                {
                    pendingServerCalls.push(se);
                    debug(se.serviceId + ' added to the pending sessioned out q.');
                    return;
                }
                // create a new queue
                debug('pendingServiceCalls initiated, and added ' + se.serviceId + ' to it.');
                pendingServerCalls = [se];
            }
            var rf = window.relogin;
            if (!rf)
            {
                try // parent and top may not belong to us, and hence trying to
					// access may result in error
                {
                    rf = parent.relogin || top.relogin;
                }
                catch (e) { 
                	//
                }
            }
            if (rf && typeof (rf) == 'function')
                rf(dc, se);
            else
                alert('Authentication failed. Please login to the system again.');
            return;
        }
    }

    var str = getMessageText(dc);

    // display error message
    if (str)
    {
         PM.message(str, "", "Ok", null, null, null);
        // main page may have warning message area, as in Exis
        var msgDiv = document.getElementById('warningMsg');
        if (msgDiv)
            msgDiv.style.display = '';
    }
    // dump trace info from server
    se.dc = dc; // se is passed to call back action/function. this is how they
				// access dc;
    this.win.dc = dc; // simpler way for call back functions!!!
    if (!dc.success)
    {
        debug('server error status is ERROR: No data refresh is going to happen');
        if (se.callBackEvenOnError)
            this.doCallBack(se);
        this.windup(se, true);
        return;
    }

    var grid = dc.grids[ClientConstants.GLOBAL_FIELDS]; 
    if (grid)
    {
        var n = grid.length;
        /**
		 * tow possible formats. First row could be names of fields, and second
		 * row has values, or, the normal format : first row is header, first
		 * column is field name and seond column is value
		 */
        if (n == 2 && grid[0].length > 2)
        {
            n = grid[0].length;
            var names = grid[0];
            var vals = grid[1];
            for (var i = 0; i < n; i++)
            {
                var nam = names[i];
                if (nam == 'localDateFormat')
                    setLocalDateFormat(vals[i]);
                else
                    globalFieldValues[nam] = vals[i];
            }
        }
        else
        {
            for (var i = 1; i < n; i++)
            {
                var row = grid[i];
                var nam = row[0];
                if (nam == 'localDateFormat')
                    setLocalDateFormat(row[1]);
                else
                    globalFieldValues[nam] = row[1];
            }
        }
        debug((n - 1) + ' global fields set');
    }
    /**
	 * update background jobs
	 */
    if(!PM.backgroundJobs)
    	PM.backgroundJobs = new BackgroundJobs();
    PM.backgroundJobs.setAllBackgroundJobStatuses(se);
    
    /**
	 * find the page object that is associated with this request
	 */
    var p2 = se && se.win && se.win.P2;
    if (p2)
    {
        if (se.toRefreshPage == ServerAction.BEFORE)
            p2.refreshPage(dc, se.listServiceOnLoad);                                
                
        this.doCallBack(se);

        if (se.toRefreshPage == ServerAction.AFTER)
            p2.refreshPage(dc, se.listServiceOnLoad);

    }
    else
        this.doCallBack(se);

    this.windup(se, false);
};

ExilityServerStub.prototype.doCallBack = function (se)
{
    /**
	 * callBackFunction and callBackActions are designed in such a way that a
	 * localActin as callbacAction is equivalent to a callBackFunction (of that
	 * local function directly) i.e. in both cases the function is called with
	 * (obj, fieldName and servicEntry). dc is se.dc. However, actionName could
	 * be any other action. Most of the time it is a NavigationAction to go to
	 * next page.
	 */ 
    var cb = se.callBackAction;
    if (cb)
    {
            if (typeof (cb) == 'function')
                return cb(se.callBackObject, se.fieldName, se, se.listServiceOnLoad);

            var method = se.win[cb] && se.win[cb]['serviceReturned'];
            if (method)
                return method(se.dc);
            return se.win.P2.act(se.callBackObject, se.fieldName, cb, se, se.listServiceOnLoad);
    }

    /**
	 * there is no call back action. Does the callbackObject itslef implement
	 * serviceReturned() method?
	 */ 
    if (se.callBackObject && se.callBackObject.serviceReturned) 
    {
        return se.callBackObject.serviceReturned(se.dc);
    }

};
/**
 * timeoutCallback() is triggered when no response is received from the server.
 */
var timeoutCallback = function (serverStub, index)
{
	var se = serverStub.SQ[index];
	if (!se)
	{
	    message("timeoutCallback(), unknown response: index="+index,"","Ok",null, null, null);
		// alert("timeoutCallback(), unknown response: index="+index);
		return;
	}

    var s = 'SERVERTIMEOUT : No response received from server';
    debug(s);
    // alert(s);
	message(s,"","Ok",null, null, null);
	delete serverStub.SQ[index];

    // ask for resubmission
    if(confirm("HTTP Status 408 - Network/Server access is lost. Do you want to re-submit the data?"))
    {
        serverStub.callService(se);
        debug('Resubmitting the request');
        return;
    }
    
	serverStub.processServiceEntry(se, true);
};

ExilityServerStub.prototype.serializeDc = function (dc)
{
	/**
	 * delegate it to DC
	 */
	return dc.serialize();
};

ExilityServerStub.prototype.deserializeDc = function (txt)
{
    /**
	 * delegate it to dc
	 */
	var dc = new DataCollection();
	dc.deserialize(txt);
	return dc;
};

 /**
	 * simpler version of callService : returns a dc that has the response from
	 * server
	 */
ExilityServerStub.prototype.getResponse = function(serviceId, dc)
{
    var se = new ServiceEntry(serviceId, dc, true, null, null, null, ServerAction.NONE, false, false);
    this.callService(se);
    
    return se.dc;
};

ExilityServerStub.prototype.resendServices = function()
{
    if(pendingServerCalls && pendingServerCalls.length)
    {
        for(var i = 0; i < pendingServerCalls.length; i++)
            this.callService(pendingServerCalls[i]);
    }
    pendingServerCalls = null;
};

/**
 * attaching this to this prototype is a mistake. Retained till we clean-up
 * 
 * @returns
 */
ExilityServerStub.prototype.getCsrfToken = function()
{
	return window[ClientConstants.CSRF_HEADER];
};

var getCsrfToken = function(){
	return window[ClientConstants.CSRF_HEADER];
};

ExilityServerStub.prototype.setCsrfToken = function(token)
{
	window[ClientConstants.CSRF_HEADER] = token;
};
/**
 * All Definitions of fields.. In our client MVC design, field represents a
 * control whose value changes at run time. Represents a control that
 * receives/sends data at run time. Concrete classes are defined with methods.
 * Stored in P2.fields collection Refer to corresponding classes in Java under
 * fields folder.
 */
var AbstractField = function() {
	this.value = '';
	/**
	 * index into the array that the table holds, in case this field is part of
	 * a table. -1 implies that this field is not in a table.
	 */
	this.columnIdx = -1;

	this.defaultValue = '';
	this.isEditable = true;
};

/**
 * we use a simple technique to put separators for amounts in Indian, US and
 * European styles
 */
AbstractField.inrPrefixes = [ '', '', '', ',', '', ',', '', ',', '', ',', '',
		',', '', ',', '', ',', '', ',', '', '', '' ];
AbstractField.usdPrefixes = [ '', '', '', ',', '', '', ',', '', '', ',', '',
		'', ',', '', '', ',', '', '', ',', '', '', '', ',', '' ];
/**
 * format the value for output. formatters are added in formatter.js. refer that
 * field for details.
 */
var a = AbstractField.prototype;
a.format = function(val) {
	if (!this.formatter || this.formatter == 'none')
		return val;

	var f = window.fieldFormatters && window.fieldFormatters[this.formatter];
	if (f)
		return f(val);

	debug('Design error: either formatter.js is not included in index page. or '
			+ this.formatter + ' is not a valid formatter.');
	return val;
};

/**
 * this is a half-hearted attempt to remove the separator character from a
 * number that is formatted
 * 
 * @param val
 *            to be formatted
 * @returns formatted value
 */
a.deformat = function(val) {
	formatter = this.formatter;
	if (!formatter || formatter == 'none')
		return val;
	if (formatter.indexOf('eur') != -1)
		return val.replace(/\./g, '');

	return val.replace(/,/g, '');
};

/**
 * set value to this field. This is the controller, and hence it has to do three
 * things. Set value to model, push value the view, and trigger any events
 * associated with this change of value. This method is same as calling
 * saveValue(), setValueToObject() and triggerFieldChangedEvents() in succession
 * 
 * @param val -
 *            value to be set
 * @param ele -
 *            dom element associated with this field. If null, we get the
 *            default dom element associated with this field
 * @param idx -
 *            if this field is part of a table, then the row number to be used.
 *            Defaults to currentRow of teh table
 * @param suppressDesc -
 *            do not trigger descriotion service. This is used to avoid a
 *            perpetual call to description service on return of a descriotion
 *            service.
 * @param formatValue -
 *            value is formatted using the associated data type before settig
 *            teh value
 * @param forceChangedEvents -
 *            force changed events even if the value has actually not changed.
 *            This looks vierd, but we got into this situation because of
 *            historic reasons and to provide backward compatibility
 * @param listServiceOnLoad -
 *            this method is invoked when the listServices fired on load return
 *            with data. This is passed around to avoid triggering fieldChanged
 *            events on teh associated fields
 */
a.setValue = function(val, ele, idx, suppressDesc, formatValue,
		forceChangedEvents, listServiceOnLoad) {
	if (val && formatValue && this.dataType) {
		var dt = dataTypes[this.dataType];
		if (dt)
			val = dt.formatIn(val);
	}
	var oldVal = val;
	/*
	 * if this is inside table, save value in table, and get the element
	 */
	if (this.table) {
		/*
		 * TODO: We have to investigate following statement and document
		 * accordingly. looks like suppressDesc is called ONLY when we are
		 * trying to assign desc fields. rowChanged() may get invoked sevral
		 * times
		 */
		if (suppressDesc) {
			this.table.rowChanged(ele, this.unqualifiedName, idx);
		}

		/*
		 * there are different scenarios. we have to get element and idx in all
		 * cases
		 */
		if (!ele && !idx) {
			/*
			 * if nothing is known, use current row
			 */
			idx = this.table.currentRow;
		}
		if (!idx) {
			/*
			 * Means, ele is given, but not idx. we get idx from the ele.
			 */
			idx = this.table.getRowNumber(ele);
		}
		if (!ele) {
			// note that we definitely have idx now.
			ele = this.P2.doc.getElementById(this.table.getObjectId(this.name,
					idx));
		}
		/*
		 * we have both ele and idx now
		 */
		oldVal = this.table.saveValue(val, this.columnIdx, idx);

		/*
		 * Trigger Aggregate function if user calls setValue explicitly
		 */
		if (this.table.hasAggregates) {
			this.table.aggregateAField(this, ele, idx);
		}
	} else {
		// non-table
		oldVal = this.value;
		this.value = val;

		if (!ele) {
			ele = this.P2.doc.getElementById(this.name);
		}
	}
	if (oldVal != val || forceChangedEvents) {
		if (!ele) {
			debug('Dom element for ' + this.name + ' not found');
			return;
		}

		if (val && formatValue) {
			var newFormattedValue = val;
			if (this.formatter) {
				newFormattedValue = this.format(val);
			}
			this.setValueToObject(ele, newFormattedValue);
		} else if (oldVal != val) {
			this.setValueToObject(ele, val);
		}

		if (this.triggerFieldChangedEvents) {
			this.triggerFieldChangedEvents(val, ele, idx, suppressDesc, true,
					listServiceOnLoad);
		}
	}
};

/**
 * save value into model, and not trigger anything else
 * 
 * @param val
 *            value to be saved
 * @param ele
 *            dom element that triggered this. Used to get row number if
 *            required
 * @param idx
 *            row number in the table to which this value is to be saved
 * @param internalChange
 *            if true, this vaue is set by a script, and not changed by user
 */
a.saveValue = function(val, ele, idx, internalChange) {
	var table = this.table;
	if (!table) {
		this.value = val;
		return;
	}
	if (ele && !idx)
		idx = table.getRowNumber(ele);
	/*
	 * we have an issue with radio buttons in the grid
	 */
	if (ele && ele.type == 'radio' && val == '')
		val = ele.value;
	/*
	 * special case of repeated-column
	 */
	if (table.repeatedField && table.repeatedField === this)
		table.saveRepeatedColumnValue(val,
				ele ? ele.getAttribute('key') : null, idx);
	else
		table.saveValue(val, this.columnIdx, idx, internalChange);
};

/**
 * get value from model
 * 
 * @param idx -
 *            row number if this is inside a table
 * @param toFormat -
 *            get formatted value
 * @param fromDeletedRowAsWell -
 *            special case where a caller wants a value from a grid row that is
 *            marked as deleted. By default we would return null
 * @returns value in the model
 */
a.getValue = function(idx, toFormat, fromDeletedRowAsWell) {
	var val;
	if (this.table)
		val = this.table.getValue(this.columnIdx, idx, fromDeletedRowAsWell);
	else
		val = this.value;
	if (val && toFormat) {
		var dt = dataTypes[this.dataType];
		if (dt)
			val = dt.formatOut(val);
	}
	return val;
};

/**
 * has this field got some value?
 * 
 * @returns true if this field has non-default value
 */
a.hasValue = function() {
	/* value is always in text form */
	if (this.value != null && this.value.length > 0)
		return true;
	return false;
};

/**
 * validate and retturn false in case teh field fails validation. COncrete
 * classes have to implement this methid if required
 * 
 * @param isFinalValidation
 *            if this is the final validation before sending values to server
 *            (false means validatiing when a user changes the value)
 * @return validated (possibly formatted or cleand) value
 * @throws error
 *             object that must be caught an dused for flashing message to user
 */
a.validate = function(isFinalValidation) {
	return this.getValue();
};

/**
 * validate the value and return validated value. returned value could be
 * cleaned-up, and hence it must be used by the caller. Any validation error is
 * handled by this routine before returning
 * 
 * @param val
 *            value to be validated
 * @param ele
 *            dom element that the user used to change this value
 * @param isFinalValidation
 *            is this the final validation that is done before we send it to
 *            server? (else means this is the validation whenuser chnages value)
 * @return formatted or cleaned-up value to be used
 * @throws exception
 *             if validaiton fails
 */
a.validateValue = function(val, ele, isFinalValidation) {
	return val;
};

/**
 * add this field and its value to dc. In case of filter-field etc.. it is the
 * job of this method to add other assoaited values, as the others do not have a
 * field object associated with them
 * 
 * @param dc
 *            to which to add the value
 */
a.fillDc = function(dc) {
	var val = this.getValue(0, true);
	var fieldName = this.unqualifiedName || this.name;
	dc.addValue(fieldName, val);
	this.fillDcWithRelatives(dc);
};

/**
 * add related fields to dc.
 * 
 * @param dc
 *            to which to add the value
 */
a.fillDcWithRelatives = function(dc) {
	if (this.aliasName) {
		dc.addValue(this.aliasName, val);
		dc.addValue(this.aliasName + 'DataType', this.dataType);
	}
	if (this.isFilterField) {
		/*
		 * operator and to fields are associated with filter field
		 */
		var nam = this.name + 'Operator';
		var field = this.P2.fields[nam];
		var val = field.getValue(0, true);
		dc.addValue(nam, val);
		if (this.aliasName) {
			dc.addValue(this.aliasName + 'Operator', val);
		}
		nam = this.name + 'To';
		field = this.P2.fields[nam];
		if (field) {
			val = field.getValue(0, true);
			dc.addValue(nam, val);
			if (this.aliasName) {
				dc.addValue(this.aliasName + 'To', val);
			}
		}
	}
};

/**
 * has this field value in teh view changed from its model? TO be overridden by
 * specialized field if this is not as abvious as checking with ele.value
 * 
 * @param ele
 *            dom element.
 * @returns {Boolean} whether the value in the view has changed
 */
a.isChanged = function(ele) {
	return (this.getValue() != ele.value);
};

/**
 * class that represents an out put field. It's view is typically the innerHTMl
 * of the dom element with this id
 */
var OutputField = function() {
	AbstractField.call(this);
	this.maxCharacters = 0;
	this.isEditable = false;
};

a = OutputField.prototype = new AbstractField;
/**
 * we clip value to max chars as of now. With strict html5, we should be able to
 * use css to create elipses
 * 
 * @param ele
 *            dom alement to be used for rendering value
 * @param val
 *            value to be rendered using the dom element
 */
a.setValueToObject = function(ele, val) {
	if (!ele) {
		debug('ERROR: null object passed to set value to field ' + this.name
				+ ' and val = ' + val);
		return;
	}
	/*
	 * we have the concept of internal value and display value, similar to a
	 * selection field
	 */
	if (this.valueList) {
		/*
		 * we cache the collection indexed by internal value
		 */
		if (!this.valueListCollection) {
			this.valueListCollection = {};
			var vl = this.valueList.split(';');
			for ( var i = 0; i < vl.length; i++) {
				var pair = vl[i].split(',');
				this.valueListCollection[pair[0]] = pair[1];
			}
		}
		var v = this.valueListCollection[val];
		if (v)
			val = v;
		ele.innerHTML = val;
		return;
	}

	/*
	 * we did not have ellipses as an option in css, and hence we have a max
	 * limit to ensure that this field will not run-off. we put the whoel text
	 * as help-text*title)
	 */
	var maxChars = this.maxCharacters == 0 ? 9999 : this.maxCharacters;
	/*
	 * -ve max chars means retain last chars rather than trimming them
	 */
	if (maxChars < 0) {
		maxChars = -maxChars;
	}
	val = new String(val);
	if (val && val.length > maxChars) {
		maxChars -= 3; // for the tree dots
		ele.title = val;
		if (this.maxCharacters < 0)
			val = '...' + val.substring(val.length - maxChars);
		else
			val = val.substring(0, maxChars) + '...';
	} else {
		ele.removeAttribute('title');
	}
	if (val == '') {
		val = '&nbsp;';
	} else {
		if (!this.allowHtmlFormattedText) {
			val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;');
		}
		val = val.replace(/\n/g, '<br />');
	}

	ele.innerHTML = val;
};

/**
 * special case of boolean output fields that require display support
 */
var BooleanOutputField = function() {
	AbstractField.call(this);
	this.trueValue = 'Yes';
	this.falseValue = 'No';
	this.isEditable = false;
};

a = BooleanOutputField.prototype = new AbstractField;
/**
 * render true/false value in this ele
 * 
 * @param ele
 *            dom element to be rendered
 * @param val
 *            value to be rendered
 */
a.setValueToObject = function(ele, val) {
	if (val == '1' || val === 1)
		ele.innerHTML = this.trueValue;
	else
		ele.innerHTML = this.falseValue;
};

/**
 * base class for all input fields
 */
var AbstractInputField = function() {
	AbstractField.call(this);

	this.toBeSentToServer = true;
};

a = AbstractInputField.prototype = new AbstractField;

/**
 * validate the value ins this model, and return current value if it is valid.
 * Throws exception in case of validaiton error, with all required info in the
 * trown object for P2 to manage the error
 * 
 * @param isFinalValidation
 *            false if this is validation after a field chage, true if this is
 *            the validaiton before sending a request to server
 * @returns current value
 * @throws error
 *             object in case of validation error
 */
a.validate = function(isFinalValidation) {
	if (this.doNotValidate) {
		return this.value;
	}
	var doc = this.P2.doc;
	var val = this.value;
	var validatedValue = val;
	var ele;

	/*
	 * validateValue will throw exception in case validaiton fails
	 */
	try {
		validatedValue = this.validateValue(val, null, isFinalValidation);
	} catch (e) {
		ele = doc.getElementById(this.name);
		if (ele)
			ele.isValid = false;
		e.ele = ele;
		e.field = this;
		// hand-over to P2 to render
		throw e;
	}

	/*
	 * If validator returned a different value, let us deal with that
	 */
	if (validatedValue != val) {
		/*
		 * TODO: following statement is useless, as val is this.vale at this
		 * time. Looks like it should be validatedValue. However, we can not fix
		 * it, becauase projects would have used the current behaviour as
		 * feature, and their logic will break if we "fix" this issue. We have
		 * to decide whether there is a need for the intended feature, in which
		 * case, we will have to introduce anotehr keyword for the same
		 */
		this.value = val;
		ele = doc.getElementById(this.name);
		if (ele)
			this.setValueToObject(ele, validatedValue);
	}
	return val;
};

/**
 * validate the value and return validated value. returned value could be
 * cleaned-up, and hence it must be used by the caller. Any validation error is
 * handled by this routine before returning
 * 
 * @param val
 *            value to be validated
 * @param dt
 *            data type to be used. If not passed, data type associated with
 *            this field
 * @param isFinalValidation
 *            is this the final validation that is done before we send it to
 *            server? (else means this is the validation whenuser chnages value)
 * @param linkedTable
 *            in case this is coming from a linked-table
 * @return formatted or cleaned-up value to be used
 * @throws exception
 *             if validaiton fails
 */
a.validateValue = function(val, dt, isFinalValidation, linkedTable) {

	if (this.multipleSelection && this.selectionValueType != 'text')
		return this.specialValidateValue(val);

	var otherFieldName, otherField, otherValue;

	if (!dt && this.dataType)
		dt = dataTypes[this.dataType];
	/*
	 * this logic is quite convoluted, and made for a specific case in some
	 * product. Looks like this feature is not used any more.
	 */
	if (exilParms.validateDatesForBetween && PM.pageValidation && dt
			&& dt.basicType == 'DATE' && (this.isFilterField || this.fromField)) {
		this.filterToFieldExists();
	}

	if (!this.requiresValidation || this.doNotValidate)
		return val;

	val = trim(val);
	/*
	 * let us start with the case when value is not entered
	 */
	if (!val) {
		this.validateOnEmpty(linkedTable);
		return val;
	}

	/*
	 * next, ask dataType if this value is OK.
	 */
	if (!dt) {
		debug(this.name
				+ " is not validated because it does not have a valid data type");
		return val;
	}

	val = dt.validate(val, this.messageName);

	/*
	 * is there an additional validaiton function?
	 */
	if (this.validationFunction) {
		var errText = this.P2.win[this.validationFunction](val);
		if (errText)
			throw new ExilityError(errText, val);
	}

	/*
	 * descipiton service based validation may be pending!
	 */
	if (isFinalValidation && this.descServiceId) {
		// see if the object is validated already
		otherFieldName = this.name;
		if (this.table)
			otherFieldName = this.table.getObjectId(this.name);
		var ele = this.P2.doc.getElementById(otherFieldName);
		if (!ele) {
			message("Design Error: Object for " + otherFieldName
					+ " is not available during final validation", "Error",
					"Ok", null, null, null);
			return val;
		}
		if (ele.pendingServiceRequest) {
			throw new ExilityError(
					"A call to server is still pending. Please submit again.");
		}
		if (ele.isValid === false) {
			throw new ExilityError("Invalid value");
		}
	}

	/*
	 * inter-field validation. Note that the other field may have to be
	 * picked-up from the linked table.
	 */

	otherFieldName = this.fromField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName.replace(this.table.name,
					linkedTable.name);
		}
		otherField = this.P2.getField(otherFieldName);
		otherValue = otherField && otherField.getValue();
		if (otherValue) {
			dt.validateFromTo(otherValue, val, otherField.label, this.label);
		}
	}
	// to field?
	otherFieldName = this.toField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName.replace(this.table.name,
					linkedTable.name);
		}
		otherField = this.P2.getField(otherFieldName);
		otherValue = otherField && otherField.getValue();
		if (otherValue) {
			dt
					.validateFromTo(val, otherValue, this.label,
							otherFieldName.label);
		}
	}

	// other field?
	otherFieldName = this.otherField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName.replace(this.table.name,
					linkedTable.name);
		}

		otherField = this.P2.getField(otherFieldName);
		otherValue = otherField && otherField.getValue();
		if (otherValue && val == val1) {
			throw new ExilityError(this.label + ' and ' + otherField.label
					+ ' should have different values.');
		}
	}

	return val;
};

/**
 * if either this field is a filter field, or the fromField of this field is a
 * filter field (I can't think of how that can be, but the logic is there :-)
 * )then ensure tha either both values are there, or both fields are empty. Note
 * that we DO NOT validate the value, but simply check whether the fields have
 * value. As per our standard design, to and operator fields are never
 * generated. Looks like some one had tweaked something in between
 * 
 * @throws exception
 *             in case tehvalues are not consistent
 */
a.filterToFieldExists = function() {
	var otherField = null;
	var operatorField = null;

	if (this.isFilterField) {
		otherField = this.P2.getField(this.name + 'To');
		operatorField = this.P2.getField(this.name + 'Operator');
	} else if (this.fromField) {
		otherField = this.P2.getField(this.fromField);
		if (!otherField.isFilterField) {
			return;
		}
		operatorField = this.P2.getField(this.fromField + 'Operator');
	} else { // it is fine.
		return;
	}

	if (!otherField || !operatorField) {
		debug('Other field for special filter validation could not be found in dom. Validation dropped');
		return;
	}
	var val = operatorField.getValue();
	if (val != 6) {
		return;
	}
	if ((this.vale && !otherField.value) || (!this.value && otherField.value)) {
		throw new ExilityError("exilBetweenError");
	}
};

/**
 * validate this field when there is nno value. Throw exception if it is an
 * error
 * 
 * @param linkedTable -
 *            if this field is in a linked table, null if not.
 * @throws exception
 *             in case this field requires value at this time
 */
a.validateOnEmpty = function(linkedTable) {
	if (this.isRequired) {
		throw new ExilityError("exilValueRequired");
	}
	/*
	 * is it mandatory based on onother field?
	 */
	var otherFieldName = this.basedOnField;
	if (!otherFieldName) {
		return;
	}
	if (linkedTable) {
		/*
		 * remember, if there is a linked table, we have to get the value from
		 * that table, and not this panel
		 */
		otherFieldName = this.basedOnField.replace(this.table.name,
				linkedTable.name);
	}
	var val = this.P2.getFieldValue(otherFieldName);
	if (!val) {
		return;
	}
	/*
	 * does it further depend on specific value in the other field?
	 */
	if (!this.basedOnFieldValue || val == this.basedOnFieldValue)
		throw new ExilityError("exilValueRequired");
};

/**
 * carry out inter-field validations
 * 
 * @param val
 *            value to be validated
 * @param dt
 *            data type of this field
 * @param linkedTable -
 *            if this was from a linked table, null if not
 * @throws exception
 *             in case of any validation error
 * 
 */
a.interFieldValidate = function(val, dt, linkedTable) {
	var otherFieldName, otherValue;

	otherFieldName = this.fromField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName(this.table.name, linkedTable.name);
		}
		otherValue = this.P2.getFieldValue(otherFieldName);
		if (otherValue)
			dt
					.validateFromTo(otherValue, val, this.fromField.label,
							this.label);
	}
	// to field?
	otherFieldName = this.toField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName(this.table.name, linkedTable.name);
		}
		otherValue = this.P2.getFieldValue(otherFieldName);
		if (otherValue)
			dt.validateFromTo(val, otherValue, this.label, this.toField.label);
	}

	// other field?
	otherFieldName = this.otherField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName.replace(this.table.name,
					linkedTable.name);
		}

		otherValue = this.P2.getFieldValue(otherFieldName);
		if (otherValue && val == otherValue) {
			throw new ExilityError(this.label + ' and '
					+ this.P2.fields[this.otherField].label
					+ ' should have different values.');
		}
	}
};

/**
 * call descriotion service for this field. This is called on change of this
 * field value.
 * 
 * @param ele
 *            doem element that triggered this event. This is used when the
 *            field is inside a table
 * @param idx -
 *            row number in the table if this field is inside a table
 */
a.callDescService = function(ele, idx) {
	/*
	 * If user changes a field with desc, and then directly clicks on submit
	 * field without tabbing out of the field,we get to a loop, because of which
	 * we use a timer to handle this crisis
	 */
	if (this.P2.pendingDescTimer) {
		ele = this.descObj;
		ele.internalChange = false;
		this.descObj = null;
		idx = this.descIdx;
		this.descIdx = 0;
		this.P2.pendingDescTimer = null;
	} else {
		ele.internalChange = true;
	}
	var dc = new DataCollection();
	var allOK = this.P2.fillDcFromQueryFields(dc, this.descQueryFields,
			this.descQueryFieldSources, idx, this.validateQueryFields);
	if (allOK) {
		var se = new ServiceEntry(this.descServiceId, dc, false, descReturned,
				ele, this.name, ServerAction.NONE, null, null,
				this.fieldToFocusAfterExecution);
		this.P2.win.serverStub.callService(se);
		ele.pendingServiceRequest = true;
	}
};

/**
 * trigger all events meant for value-changes for this field
 * 
 * @param val -
 *            new value of this field
 * @param ele -
 *            dom element that triggered this change
 * @param idx -
 *            row number of this element if this fields is in table
 * @param supressDesc -
 *            if true, we shoudl not trigger description service again. This is
 *            to avoid
 * @param internalChange
 *            if true, this is an internal change, else user has changed the
 *            value of this field
 * @param listServiceOnLoad
 *            is this triggered becaue of listservice that returned a value on
 *            load?
 */
a.triggerFieldChangedEvents = function(val, ele, idx, supressDesc,
		internalChange, listServiceOnLoad) {
	if (!supressDesc && this.descServiceId) {
		if (val == '') {
			this.setDescFields(ele, null, true, internalChange,
					listServiceOnLoad);

		} else if (!this.isUniqueField || this.P2.pageMode != 'modify') {
			ele.pendingServiceRequest = true;
			ele.internalChange = internalChange;
			var dc = new DataCollection();
			/*
			 * Passing the value to fillDcFromQueryFields for repeating columns.
			 */
			var allOK = this.P2.fillDcFromQueryFields(dc, this.descQueryFields,
					this.descQueryFieldSources, idx, this.validateQueryFields,
					val);
			if (allOK) {
				var se = new ServiceEntry(this.descServiceId, dc, false,
						descReturned, ele, this.name, ServerAction.NONE, null,
						null, this.fieldToFocusAfterExecution,
						listServiceOnLoad);
				this.P2.win.serverStub.callService(se);
			}
			/*
			 * rest of the processing will continue after the descservice return
			 */
			return;
		}
	}

	if (this.dependentSelectionField)
		this.manageDependentLists(val, idx, listServiceOnLoad);

	/*
	 * very special case. Is this from/to field, and has it now made that field
	 * valid? TODO: this has two issues. 1. it is possible that a field may have
	 * both fromField and toField
	 * 
	 * 2. fn.dependentSelectionField is wrong because fn is field name.
	 * 
	 * However, existing projects are working fine with this bug, and if we fix
	 * this, they will have issue. Hence we leave it as it is
	 */
	var fn = this.fromField || this.toField;
	if (fn && fn.dependentSelectionField) {
		var f = this.P2.fields[fn];
		var fval = f.getValue(idx);
		if (fval)
			f.manageDependentLists(val, idx, listServiceOnLoad);
	}

	/*
	 * do we have a copyTo field?
	 */
	if (val && this.copyTo) {
		var copyToField = this.P2.getField(this.copyTo);
		if (copyToField) {
			var existingValue = copyToField.getValue(idx);
			/*
			 * we are not supposed to over-ride existing value in that field
			 */
			if (!existingValue) {
				copyToField.setValue(val, null, idx,
						copyToField.supressDescOnLoad, false);
			}
		}
	}

	if (this.onChangeActionName) {
		debug('on change triggered for ' + this.name + ' onchange = '
				+ this.onChangeActionName);
		this.P2.act(ele, this.name, this.onChangeActionName, val);
	}

	if (this.onUserChangeActionName && !internalChange) {
		debug('on user change triggered for ' + this.name + ' onchange = '
				+ this.onUserChangeActionName);
		this.P2.act(ele, this.name, this.onUserChangeActionName, val);
	}

	if (this.isFilterOperator)
		this.filterSelectionChanged(ele, val);
};

/**
 * manage dpendent selection fields when this field value changes
 * 
 * @param val
 *            new value
 * @param idx
 *            row number in the table if relevant
 * @param listServiceOnLoad
 */
a.manageDependentLists = function(val, idx, listServiceOnLoad) {
	var fieldNames = this.dependentSelectionField;
	for ( var i = 0; i < fieldNames.length; i++) {
		var field = this.P2.fields[fieldNames[i]];
		if (!field) {
			debug(' field '
					+ fieldNames[i]
					+ ' is not found when it is tried as a dependent selection field for '
					+ this.name);
			continue;
		}
		if (!field.listServiceId) {
			debug(field.name
					+ ' is defined as a dependent selection field for '
					+ this.name + '. But ' + field.name
					+ ' does not have a listServiceId.');
			continue;
		}
		var newObjId = field.name;
		if (field.table)
			newObjId = field.table.getObjectId(newObjId, idx);
		var newObj = this.P2.doc.getElementById(newObjId);
		if (newObj) {
			if (newObj.keyValue == val) // it has the same value..
				return;
			newObj.keyValue = val;
		}
		if (val) {
			/*
			 * any value that may get changed now is an internal chnage
			 */
			field.callListService(val, newObj, idx, true);
		} else {
			field.fillList(null, newObj);
			if (field.getValue())
				field.saveValue('', newObj, idx, true);
		}
	}
};

/**
 * this is a function and not a method. this funciton is attached as call-back
 * function for serverAgent
 * 
 * @param ele -
 *            dom element that had trigegred this call to server
 * @param fieldName
 *            name of the field that had requested this service
 * @param se
 *            service entry that has all details about the call to server. We
 *            will get the dc from this
 */
var descReturned = function(ele, fieldName, se) {
	ele.pendingServiceRequest = null;
	/*
	 * se has serviceId and dc. dc has a grid with the name = serviceId, in
	 * which data is returned..
	 */
	var data = se.dc.grids[se.serviceId];
	se.win.P2.fields[fieldName].setDescFields(ele, data, false,
			ele.internalChange, se.listServiceOnLoad);
};
/**
 * Look at the data returned from description service, and assin values from the
 * data to corresponding fields. This method is also called toreset description
 * fields when this field value is changed (before requesting a desciption
 * service)
 * 
 * @param ele
 *            dom element that triggered this event
 * @param data
 *            returned from server, or null if this is called to reset
 *            description fields
 * @param toReset
 *            reset desc fields
 * @param internalChange
 *            true if this is triggered when the value is changed internally,and
 *            not by user
 * @param listServiceOnLoad
 *            true if this is triggered because of list service on load
 */
a.setDescFields = function(ele, data, toReset, internalChange,
		listServiceOnLoad) {
	var fieldNames = this.descFields;
	if (!fieldNames) {
		debug('descFields property is not set for ' + this.name
				+ '. Code picker will not show any values');
		return;
	}

	/*
	 * fieldNames would be qualified (tableName_fieldName) but column heading in
	 * data is unqualified. So, let us get unqualified names for mathching
	 */
	var namesToMatch = this.P2.getUnqualifiedNames(fieldNames);
	var idx = 0;
	/*
	 * we do not use currentRow of table because th euser might have clicked on
	 * a different row when the description service returns asynchronously from
	 * the server
	 */
	if (this.table)
		idx = this.table.getRowNumber(ele);

	/*
	 * isUniqueField means that the desc service is used to cheque uniqueness of
	 * this field. And hence we do not expect data.
	 */
	if (this.isUniqueField && this.P2.pageMode == 'add') {
		if (data && data.length > 1 && !this.doNotValidate) {
			ele.isValid = false;
			var e = new ExilityError(this.descMessageId
					|| 'Value already exists');
			e.field = this;
			e.obj = ele;
			this.P2.catchError(e);
		} else
			ele.isValid = true;
		return;
	}

	var namesInTable = null; // header row from table
	var n = 0; // nbr names above
	var fieldName = null; // in the header of data
	var nameToMatch = null; // corresponding name on the client
	var vals = null; // data row from server to be used
	var val = null;
	var dataFound = false; // did we find a data row that matches the value?

	var isCombo = (this.comboDisplayFields && exilComboWin);

	if (data && data.length > 1) // data exists
	{
		ele.isValid = true;
		dataFound = true;
		namesInTable = data[0];
		n = namesInTable.length;
		vals = data[1];

		/**
		 * programmers tend to reuse the combo-service as description service as
		 * well. While this is not a good design, this has been working for them
		 * in general. We had assumed that there will be exactly one row coming
		 * back from the server, and, in case of more than one rows, we simply
		 * picked-up the first one. This needs to be refined for combo. We do
		 * not take anything for granted. We check again whether there is a row
		 * with the desired value.
		 */
		if (isCombo && data.length > 2) {
			var dataRowIdx = findRowIndex(data, ele.value);
			if (dataRowIdx > 0) {
				vals = data[dataRowIdx];
			} else {
				/*
				 * this is the case when the value is not valid, but it is
				 * "contained" in other valid values. just simulate as no rows
				 * in data
				 */
				dataFound = false;
				vals = null;
				if (!this.doNotValidate) {
					ele.isValid = false;
				}
			}
		}

	} else {
		if (data && !this.doNotValidate) {
			ele.isValid = false;
			dataFound = false;
		}
	}

	var thisFieldValue = null;
	var m = fieldNames.length;
	for ( var i = 0; i < m; i++) {
		fieldName = fieldNames[i];
		if (!fieldName)
			continue;
		nameToMatch = namesToMatch[i];
		val = '';
		if (dataFound) {
			if (this.doNotMatchDescNames) {
				if (i <= n)
					val = vals[i];
			} else {
				for ( var j = 0; j < n; j++) {
					if (nameToMatch == namesInTable[j]) {
						val = vals[j];
						break;
					}
				}
			}
		}

		if (fieldName == this.name) {
			/*
			 * it is this field. We will handle it outside the loop
			 */
			thisFieldValue = val;
		} else {
			this.P2.setFieldValue(fieldName, val, null, idx, false, true,
					listServiceOnLoad);
		}
	}

	if (dataFound) {
		if (!thisFieldValue)
			thisFieldValue = this.getValueFromObject(ele);
		/*
		 * If this desc is a combo service then it should trigger change events
		 * after setting the data
		 */
		if (!(this.doNotValidate && exilParms.donotSetFirstDescValue)
				|| isCombo) {
			/*
			 * we need to set this value and continue to trigger other field
			 * changed events
			 */
			this.saveValue(thisFieldValue, ele, idx);
			this.setValueToObject(ele, thisFieldValue);
			if (this.table)
				this.table.rowChanged(ele, this.unqualifiedName, idx,
						internalChange);
			this.triggerFieldChangedEvents(thisFieldValue, ele, idx, true,
					internalChange, listServiceOnLoad);
		}
	} else if (!toReset) {
		/*
		 * we have to continue with triggering field changed events other than
		 * description service
		 */
		this.triggerFieldChangedEvents('', ele, idx, true, internalChange,
				listServiceOnLoad);
		if (!this.doNotValidate) {
			val = 'invalid ' + this.label;
			message(val, "Warning", "Ok", null, null, null);
			try {
				if (ele.select)
					ele.select();
				if (ele.focus)
					ele.focus();
			} catch (ex) {
				/*
				 * we just try to focus the field. If the field is shy, let us
				 * not loose our sleep on that :-)
				 */
			}
		}
	}
};

/**
 * set min and max date for this field, if it happens to be a date field. These
 * values over-ride the ones set by the underlying data type. Leave either min
 * or max null if you do not want to over-ride, or if you want to reset a value
 * that was set earlier
 * 
 * @param min
 *            minimum date optional
 * @param max
 *            maximum date optional
 */
a.setMinMax = function(min, max) {
	this.minDate = min;
	this.maxDate = max;
};

/**
 * when operator field in filter field changed. Note that this dom element is
 * not associated directly with a field. Hence we have to striggle with this a
 * bit
 * 
 * @param ele
 *            dom element that changed
 * @param val
 *            changed value
 */
a.filterSelectionChanged = function(ele, val) {
	var id = ele.id;
	/*
	 * knock-off 'Operator' from that rememebr substr(start, length) while
	 * substring(start, end)
	 */
	id = id.substr(0, id.length - 8);
	var toEle = this.P2.doc.getElementById(id + 'ToDiv');
	if (val == 6) {
		toEle.style.display = '';
	} else if (toEle) {
		toEle.style.display = 'none';
		// reset value in the to-field, so that from-to validation is disabled
		this.P2.setFieldValue(id + 'To', '');
	}
};

/**
 * 
 */
var TextInputField = function() {
	AbstractInputField.call(this);

	this.requiresValidation = true;
	this.minCharsToTriggerService = 0;
	// for the time being server side always return matching grid of max 5 rows.
	this.maxRowsToDisplay = 7;

};
a = TextInputField.prototype = new AbstractInputField;

/**
 * set value to dom element
 * 
 * @param ele
 *            dom element
 * @param val
 *            value to be set
 */
a.setValueToObject = function(ele, val) {
	var dt = dataTypes[this.dataType];
	if (!dt || !dt.includesTime) {
		ele.value = val;
		return;
	}

	var values = getDateTimeParts(val); // defined in utils.js
	var eles = this.getTimeObjects(ele);
	if (eles.dt) {
		eles.dt.value = values.dt;
	}
	if (eles.hr) {
		eles.hr.value = values.hr;
	}
	if (eles.mn) {
		eles.mn.value = values.mn;
	}
	if (eles.sc) {
		eles.sc.value = values.sc;
	}
	if (eles.am) {
		eles.am.selectedIndex = values.am;
	}
};

/**
 * get value from dom element
 * 
 * @param ele
 *            dom element
 * @returns value from dom element, or null in case of error
 */
a.getValueFromObject = function(ele) {
	var dataType = dataTypes[this.dataType];
	if (!dataType || !dataType.includesTime) {
		return ele.value = trim(ele.value);
	}
	// tricky job of picking-up pieces from date and time fields.
	var eles = this.getTimeObjects(ele);

	var dt = eles.dt.value;
	/*
	 * if date field is not entered, we ignore time fields....
	 */
	if (!dt) {
		return '';
	}

	var hr = (eles.hr && eles.hr.value) || '0';
	hr = parseInt(hr, 10) || 0;
	if (eles.am && eles.am.selectedIndex) {
		hr += 12;
	} else if (hr < 10) {
		hr = '0' + hr;
	}
	var mn = (eles.mn && eles.mn.value) || '00';
	var sc = (eles.sc && eles.sc.value) || '00';
	return dt + ' ' + hr + ':' + mn + ':' + sc;
};

/**
 * returns an object that has all html elements corresponding to time fields
 * 
 * @param ele
 *            dom element of main field
 * @returns object with attrbutes dt, mn, sc, and am as other dom elements for
 *          showing time
 */
a.getTimeObjects = function(ele) {
	var nam = this.name;
	if (this.table && ele.rowIdx)
		nam = nam + '__' + ele.rowIdx;
	var doc = this.P2.doc;
	return {
		dt : doc.getElementById(nam + 'Hr'),
		mn : doc.getElementById(nam + 'Mn'),
		sc : doc.getElementById(nam + 'Sc'),
		am : doc.getElementById(nam + 'Am')
	};
};

/**
 * class that represents a check-box in dom
 */
var CheckBoxField = function() {
	AbstractInputField.call(this);
	this.isChecked = false;
	/*
	 * default value of checked-unchecked. This may be over-ridden by attribute
	 * set in meta.js
	 */
	this.checkedValue = exilParms.checkedValue;
	this.uncheckedValue = exilParms.uncheckedValue;
};

a = CheckBoxField.prototype = new AbstractInputField;
/**
 * notion of value is different from that in HTML. Hence we keep track of its
 * checked status as well
 */
a.initialize = function() {
	if (this.isChecked)
		this.value = this.checkedValue;
	else
		this.value = this.uncheckedValue;
};

/**
 * get value from dom element
 * 
 * @param ele
 *            dom element to get the value from
 * @returns text value of teh dom element
 */
a.getValueFromObject = function(ele) {
	if (ele.checked) {
		return this.checkedValue;
	}
	return this.uncheckedValue;
};

/**
 * has this field a value? We condier checked as value, and unchecked as no
 * value
 * 
 * @returns true if this field is checked, false otherwise
 */
a.hasValue = function() {
	return this.isChecked;
};

/**
 * set value to object
 * 
 * @param ele
 *            dom element to which valoue is to be set to
 * @param val
 *            value to be set
 */
a.setValueToObject = function(ele, val) {
	var uval = val.toUpperCase();
	if (val == ele.value || val == this.checkedValue || val == '1'
			|| uval == 'Y' || uval == 'YES' || uval == "TRUE") {
		ele.checked = this.isChecked = true;
	} else {
		ele.checked = this.isChecked = false;
	}
};

/**
 * as per MVC principles, we do not need a view for hidden field. with html5
 * version, we have decided nnot to render hiddenFields. They are part of P2,
 * but not DOM
 */
var HiddenField = function() {
	AbstractInputField.call(this);
	this.isEditable = false;
};

a = HiddenField.prototype = new AbstractInputField;

/**
 * set value, but only if dom ele exists
 * 
 * @param ele
 *            do element
 * @param val
 *            value to be set
 */
a.setValueToObject = function(ele, val) {
	if (ele) {
		ele.value = val;
	}
};

/**
 * get the value from dom element. deprecated, but kept for backward
 * compatibility
 * 
 * @param ele
 *            domelement to get value from
 * @returns value from dom
 */
a.getValueFromObject = function(ele) {
	if (ele) {
		return ele.value;
	}
	debug("Hidden field shoudl not be used as a dom element. use P2.getFieldValue(fieldName) instead.");
	return null;
};

/**
 * class for a radio button
 */
var RadioButtonField = function() {
	AbstractInputField.call(this);
	this.isRadio = true;
};

a = RadioButtonField.prototype = new AbstractInputField;

/**
 * get the inupt elements of this radio group. two schemes are possible
 * 
 * new way : <div id="name"....><div class="radio"><input type="radio" ..></div><div
 * class="radioLabel">label</div> etc... </div>
 * 
 * old way : <span id="name" ...><input ..><span>label</label>etc..</span>
 * 
 * @param ele
 *            dom element that is associated with this event.
 * @returns array of input elements associated with this radio group. null if we
 *          can not find them.
 */
a.getInpuElements = function(ele) {
	if (ele.type) {
		ele = ele.parentNode;
	}
	if (!ele.id) {
		ele = ele.parentNode;
	}
	var eles = ele.getElementsByTagName('input');
	if (!eles || !eles.length) {
		debug('Design error: Radio buttons for field ' + this.name
				+ ' not found in the dom');
		return null;
	}
	return eles;
};

/**
 * set value to the dom element
 * 
 * @param ele
 *            dom element
 * @param val
 *            value to be set
 */
a.setValueToObject = function(ele, val) {
	var eles = this.getInpuElements(ele);
	if (!eles) {
		return;
	}
	var gotChecked = false;
	for ( var i = 0; i < eles.length; i++) {
		ele = eles[i];

		if (!gotChecked && ele.value == val) {
			ele.checked = true;
			gotChecked = true;
		} else
			ele.checked = false;
	}
	/*
	 * if we have checked a radio, we are done
	 */
	if (gotChecked)
		return;

	/*
	 * let us check the button for default value
	 */
	if (!this.defaultValue)
		return;

	for ( var i = 0; i < eles.length; i++) {
		ele = eles[i];
		if (ele.value == this.defaultValue) {
			ele.checked = true;
			return;
		}
	}
};

/**
 * get value from dom element
 * 
 * @param ele
 *            dom element
 * @returns value from teh dom element, null if value cannot be fetched
 */
a.getValueFromObject = function(ele) {
	var eles = this.getInpuElements(ele);
	if (!eles) {
		debug('Design error: Radio buttons for field ' + this.name
				+ ' not found in the dom');
		return null;
	}

	for ( var i = 0; i < eles.length; i++) {
		ele = eles[i];
		if (ele.checked)
			return ele.value;
	}
	/*
	 * no element selected.
	 */
	return '';
};

/**
 * call the list service associated with this field
 * 
 * @param val
 *            value of the key that triggered this call.
 * @param ele
 *            dom element that this field is currently associated, in a table
 *            context - optional
 * @param idx
 *            row number if this is inside a table context - optional
 * @param listServiceOnLoad
 *            if this is triggered as part of autoload
 */
a.callListService = function(val, ele, idx, listServiceOnLoad) {
	if (!ele) {
		var id = this.name;
		if (this.table)
			id = this.table.getObjectId(this.name, idx);
		ele = this.P2.doc.getElementById(id);
	}

	/*
	 * if field values change, dependent field may trigger list service in quick
	 * seccession. AND, if they do not come back in the same order, we will be
	 * in trouble. Let us remember the last key, so that the object can detect
	 * and reject old obsolete lists
	 */
	if (ele) {
		if (val)
			ele.listServiceKey = val;
		else if (ele.listServiceKey)
			delete ele.listServiceKey;
		debug(this.name + ' will expect a list service key value of '
				+ ele.listServiceKey);
	}

	var grid;
	grid = [ [ 'serviceId', 'keyValue' ], [ this.listServiceId, val ] ];

	this.P2.callListService(grid, ele, this.name,
			this.listServiceQueryFieldNames, this.listServiceQueryFieldSources,
			idx, listServiceOnLoad);
};

/**
 * render the value list into dom
 * 
 * @param grid
 *            rows of valid values, with first row as header, first column as
 *            internal value, and second column as display value
 * @param ele
 *            dom element
 * @param doNotSelect
 *            if true, then no value is selected. This parameter is checking for
 *            negative, as it got added later during a refactoring process
 * @param listServiceOnLoad
 *            true if this is triggered onLoad
 */
a.fillListToObject = function(grid, ele, doNotSelect, listServiceOnLoad) {
	this.grid = grid;
	var txt = '';
	var n = grid && grid.length;
	if (n && n > 1) {
		if (!this.htmlParts) {
			if (!this.init()) {
				debug("Error while initializing " + this.name
						+ " radio button field. ");
				return false;
			}
		}
		/*
		 * get all radio options as inner html. remember htmlParts has three
		 * parts. we have to do part1 + innerValue + part2 + displayValue +
		 * part3 for each row
		 */
		var t = [];
		for ( var i = 1; i < n; i++) {
			var row = grid[i];
			t.push(this.htmlParts[0]);
			t.push(row[0]);
			t.push(this.htmlParts[1]);
			t.push(row[1] || row[0]);
			t.push(this.htmlParts[2]);
		}
		txt = t.join('');
	}
	ele.innerHTML = txt;
	// set the value to this
	if (!doNotSelect)
		this.setValueToObject(ele, this.value);
};

/**
 * assign list of values to this field.
 * 
 * @param grid
 *            data with a header row that has the list of values for this field.
 *            First column is internal value and second column is display value
 * @param ele
 *            dom element associated with this field. passed if this is inside a
 *            table. Otherwise we use default one
 * @param keyValue
 *            if the list of valid values depends on a key (like countryCode for
 *            list of states) then the key value that is associated with the
 *            grid that is received
 * @param listServiceOnLoad
 *            true if this is triggered onLoad, false if it is triggered later
 */
a.fillList = function(grid, ele, keyValue, listServiceOnLoad) {
	/*
	 * non-able case is simpler..
	 */
	if (!this.table) {
		if (!ele)
			ele = this.obj;
		this.fillListToObject(grid, ele, false, listServiceOnLoad);
		return;
	}

	var id = null;
	var doc = this.P2.doc;
	/*
	 * is it for a specific row of a grid?
	 */
	if (!this.sameListForAllRows) {
		if (!ele) {
			id = this.table.getObjectId(this.name);
			ele = doc.getElementById(id);
			if (!ele) {
				debug("Unable to get the dom object for field " + this.name
						+ " for assigning the value list we got from server.");
				return;
			}
		}
		this.fillListToObject(grid, ele, false, listServiceOnLoad);
		return;
	}
	/*
	 * this is the case of a table in which the valid values are same across all
	 * rows. This MUST be called onLoad, or at least before the table receives
	 * data
	 */
	this.fillListToObject(grid, this.obj, true, listServiceOnLoad);

	var table = this.table;

	/*
	 * we have to push it to fields in all rows first into the row that is
	 * cashed
	 */
	var n = table.nbrRows;
	var tableData = table.grid;
	for ( var i = 1; i <= n; i++) {
		var row = tableData[i];
		if (!row)
			continue;
		id = table.getObjectId(this.name, i);
		ele = doc.getElementById(id);
		if (ele)
			this.fillListToObject(grid, ele, false, listServiceOnLoad);
		else
			debug(id + ' is not a DOM element for field name ' + this.name
					+ ' when we tried it to push a radio list to it');
	}
};

/**
 * page has <div id="name"...> with its innerHTML having two instances of '---' :
 * first one for internal value, and second one for display value. We can
 * recreate the inner html with repeating this pattern for each values in the
 * value list
 * 
 */
a.init = function() {
	var ele = this.P2.doc.getElementById(this.name);
	if (!ele) {
		debug('Design Error: dom element with id=' + this.name
				+ ' as a radio group is not found');
		return false;
	}
	/*
	 * innerHTML is the meant for one value, with '---' as place holder for
	 * value and label. We strip this and keep into an array for a convenient
	 * way of creating innerHTML for all values.
	 */
	this.htmlParts = ele.innerHTML.split('---');
	ele.innerHTML = '';
	/*
	 * generater hides it to ensure that '---' are not visible by default
	 */
	ele.style.visibility = 'visible';
	return true;
};

/**
 * class for a Text area element of html
 */
var TextAreaField = function() {
	AbstractInputField.call(this);

	this.requiresValidation = true;
	this.numberOfRows = 3;
	this.numberOfCharactersPerRow = 40;
};
a = TextAreaField.prototype = new AbstractInputField;

/**
 * get value from domelement
 * 
 * @param ele
 *            domelement to get value from
 * @returns value from dom element
 */
a.getValueFromObject = function(ele) {
	return ele.value = trim(ele.value);
};

/**
 * set value to dom element
 * 
 * @param ele
 *            dom element to set value to
 * @param val
 *            value to be assigned to dom
 */
a.setValueToObject = function(ele, val) {
	ele.value = val;
};

/**
 * represents a FileField in the browser. NOt fully supported end-to end as of
 * now. Needs some standardization
 */
var FileField = function() {
	AbstractInputField.call(this);
	/*
	 * some logic in fileUpload routine iterates thrua ll fields and looks for
	 * fiel field
	 */
	this.isFileField = true;
};

a = FileField.prototype = new AbstractInputField;

/**
 * interesting issue with Safari with a hard coded c:\fakepath!!!
 * 
 * @param ele
 *            file dom element from which to get value
 * @returns file name
 */
a.getValueFromObject = function(ele) {
	return ele.value.replace(/^C:\\fakepath\\/i, '');
};

/**
 * TODO : this obviously does not work. file field value MUST be selected by th
 * euser as per browser security standard
 * 
 * @param ele
 *            dom element
 * @param val
 *            value to be set to dom
 */
a.setValueToObject = function(ele, val) {
	ele.value = val;
};

/**
 * password field is same as text field as far as we are concerned. Just the
 * rendering dom element is different
 */
var PasswordField = function() {
	TextInputField.call(this);
};
/**
 * @module We intend to replace SelectionField with assistedInputField, once
 *        it stabilizes
 */

/**
 * @class SelectionField represents a selection tag in html. Normally referred
 *        as drop-down. Our design is to allow teh list of values to be fetched
 *        at run time automatically with a designated listService and a possible
 *        key for the service.
 * 
 */
var SelectionField = function() {
	AbstractInputField.call(this);
	this.valueType = 'text'; // list and grid are other two options
};

a = SelectionField.prototype = new AbstractInputField;
/**
 * set a grid as value for this field
 * 
 * @param grid
 *            data as received from server
 */
a.setGrid = function(grid) {
	var selectedValues = {};
	for ( var i = 1; i < grid.length; i++) {
		var key = grid[i][0];
		var val = grid[i][1];
		if (val && val != '0')
			selectedValues[key] = true;
	}
	this.setAllValues(null, selectedValues);
	this.value = grid;
};

/**
 * set a list of values (array) as value for this field
 * 
 * @param list
 *            as received from server
 */
a.setList = function(list) {
	var selectedValues = new Object();
	for ( var i = 0; i < list.length; i++) {
		selectedValues[list[i]] = true;
	}
	this.setAllValues(null, selectedValues);
	this.value = list;
};

/**
 * set value to dom element
 * 
 * @param ele
 *            dom element
 * @param val
 *            to be set
 */
a.setValueToObject = function(ele, val) {
	if (this.multipleSelection) {
		var selectedValues = {};
		var vals = val.split(',');
		for ( var i = 0; i < vals.length; i++) {
			selectedValues[vals[i]] = true;
		}
		this.setAllValues(ele, selectedValues);
		return;
	}
	/*
	 * in case this has a backupValue, this event should invalidate that
	 */
	ele.backupValue = null;
	var options = ele.options;
	for ( var i = 0; i < options.length; i++) {
		if (options[i].value == val) {
			options[i].selected = true;
			return;
		}
	}

	/*
	 * If we reach here it means that the value is not available as an option.
	 * add it.
	 */
	var option = this.P2.doc.createElement('option');
	var displayValue = val;
	option.innerHTML = new String(displayValue).replace(/&/g, '&amp;').replace(
			/</g, '&lt;');
	option.value = val;
	option.selected = true;
	ele.appendChild(option);
};

/**
 * set all values from selected value list. Warning : this method mutates
 * selectedValues TODO: avoid mutating objects that are passed, unless that is
 * the purpose of the method
 * 
 * @param ele
 *            dom element to set the values
 * @param selectedValues
 *            collection of selected values
 */
a.setAllValues = function(ele, selectedValues) {
	if (!ele) {
		ele = this.P2.doc.getElementById(this.name);
	}
	var options = ele.options;
	var n = options.length;
	for ( var i = 0; i < n; i++) {
		var opt = options[i];
		if (selectedValues[opt.value]) {
			opt.selected = true;
			// TODO: avoid the following side-effect
			delete selectedValues[opt.value];
		} else {
			opt.selected = false;
		}
	}
	/*
	 * are there any values that are not in options? we have to add them..
	 */
	var doc = this.P2.doc;
	for ( var val in selectedValues) {
		if (val) {
			var option = doc.createElement('option');
			var displayValue = val;
			option.innerHTML = new String(displayValue).replace(/&/g, "&amp;")
					.replace(/</g, '&lt;');
			option.value = val;
			option.selected = true;
			ele.appendChild(option);
		}
	}
};

/**
 * get value from dom element
 * 
 * @param ele
 *            dom element
 * @returns value of this field as present in the dom element
 */
a.getValueFromObject = function(ele) {
	if (!this.multipleSelection) {
		/*
		 * standard select tag
		 */
		if (ele.selectedIndex >= 0) {
			return ele.options[ele.selectedIndex].value;
		}
		return '';
	}
	// This is mutli-select. get all the selected values;
	var options = ele.options;
	var nbrOption = options.length;
	var val = [];
	var opt;
	switch (this.selectionValueType) {
	case 'text':
		for ( var i = 0; i < nbrOption; i++) {
			opt = options[i];
			if (opt.selected) {
				val.push(opt.value);
			}
		}
		return val.join(',');

	case 'list':
		for (i = 0; i < nbrOptions; i++) {
			opt = options[i];
			if (opt.selected)
				val.push(opt.value);
		}
		return val;

	case 'grid':
		val.push([ 'value', 'selected' ]);
		for (i = 0; i < nbrOptions; i++) {
			opt = options[i];
			if (opt.selected)
				val.push([ opt.value, '1' ]);
			else
				val.push([ opt.value, '0' ]);
		}
		if (val.length == 1) {
			/*
			 * zap header, if there is no data
			 */
			val.length = 0;
		}
		return val;
	default:
		message('Design error: Multiple select has valueType=' + this.valueType
				+ '. Only text, list and grid are allowed. ' + this.name
				+ ' will not work properly', "Error", "Ok", null, null, null);
		return '';
	}
};

/**
 * fill dc with the value of this field
 * 
 * @param dc
 */
a.fillDc = function(dc) {
	if (!this.multipleSelection) {
		dc.values[this.name] = this.value;
		this.fillDcWithRelatives(dc);
		/*
		 * multiSelect cannot have relatives..
		 */
	} else if (this.selectionValueType == 'text') {
		dc.values[this.name] = this.value;
	} else if (this.selectionValueType == 'grid') {
		dc.grids[this.name] = this.value || [ [ 'value', 'selected' ] ];
	} else {
		dc.lists[this.name] = this.value || [];
	}
};

a.fillList = RadioButtonField.prototype.fillList;
/**
 * select first option for this selection field, and return its value
 * 
 * @param ele
 *            dom element to be initialized
 * @returns value that this element is set to (selected)
 */
a.initSelection = function(ele) {
	var option = ele && ele.options && ele.options[0];
	if (option) {
		option.selected = true;
		return option.value;
	}
	return '';
};

/**
 * create options for the selection field based on the rows in the supplied grid
 * 
 * @param grid
 *            data as received from server
 * @param ele
 *            selection dom element
 * @param doNotSelect
 *            set options, but do not select any one
 * @param listServiceOnLoad
 *            whether this is triggered because of list service on load
 */
a.fillListToObject = function(grid, ele, doNotSelect, listServiceOnLoad) {
	if (!ele) {
		debug('fillListToObject can not work without an dom element');
		return;
	}
	this.grid = grid;
	if (this.multipleSelection) {
		this.fillMultiValuesToObject(grid, ele);
		return;
	}

	var oldVal = null; // existing selection
	var valToSelect = null;
	var n = grid ? grid.length : 0;

	/*
	 * we have to select the current value, if possible
	 */
	if (ele.selectedIndex >= 0) {
		oldVal = ele.options[ele.selectedIndex].value;
	}
	/*
	 * it is possible that an intermediate list came-in and cleaned-up existing
	 * value. We would have pushed that to backup. See below.
	 */
	if (!oldVal) {
		oldVal = ele.backupValue;
	}
	/*
	 * check if old value is a valid value with this new list
	 */
	if (oldVal) {
		/*
		 * If we are resetting options, we should remove back-up value
		 */
		ele.backupValue = null;
		if (n > 1) {
			/*
			 * If we have list of options, we have to decide what to do with
			 * back-up value
			 */
			for ( var i = 1; i < n; i++) {
				if (grid[i][0] == oldVal) {
					valToSelect = oldVal;
					break;
				}
			}
			/*
			 * if oldVal is not in the list what do we do? this can happen in
			 * two scenarios:
			 * 
			 * 1. field value was obsolete.
			 * 
			 * 2. this list is obsolete.
			 * 
			 * case 1 is fine. We just move on. But for case 2, we have to
			 * retain this value and re-select it when next list comes back.
			 */
			if (valToSelect == null) {
				ele.backupValue = oldVal;
			}
		}
	}

	/*
	 * we do not have an old value, and we have options now..
	 */
	if (valToSelect == null && n > 1) {
		if (this.selectFirstOption || (n == 2 && this.isRequired))
			valToSelect = grid[1][0];
	}

	var html = '';

	/*
	 * if it is optional or (it is mandatory, but we can not choose first
	 * option), we will have to add a blank row
	 */
	if (this.isRequired == false || valToSelect == null) {
		html = '<option value="" selected="selected">';
		/*
		 * A select element may want to have a specific text as blank option.
		 * exilBlankOption is this property
		 */
		if (this.blankOption) {
			html += this.blankOption.replace(/&/g, '&amp;').replace(/</g,
					'&lt;');
		}
		html += '</option>';
	}
	var selectedValues = null;
	if (valToSelect != null) {
		selectedValues = {};
		selectedValues[valToSelect] = true;
	}

	var optionsHtml = this.buildOptions(grid, ele, selectedValues);
	if (!optionsHtml) {
		if (oldVal) {
			this.P2
					.fieldChanged(ele, this.name, true, false,
							listServiceOnLoad);
		}
		ele.innerHTML = html;
		return;
	}
	html += optionsHtml;

	// so we need to add showMore option?
	if (this.showMoreFunctoinName) {
		html += '<option value="' + ExilityPage.MORE_OPTION_VALUE
				+ '">Show More</option>';
	}
	ele.innerHTML = html;
	// did this change the current value of the object?
	if (doNotSelect) {
		return;
	}
	if (valToSelect != oldVal) {
		var toSuppress = false;
		if (listServiceOnLoad)
			toSuppress = this.supressDescOnLoad;
		this.P2.fieldChanged(ele, this.name, true, toSuppress,
				listServiceOnLoad);
	}

};

/**
 * create options elements as child nodes of this dom element
 * 
 * @param grid
 *            data as received from server. First column is value. Second
 *            column, if present is label/display value. third column, if
 *            present, is the css class name to be set to the option element,
 *            with '0' to be interpreted as disabling.
 * @param ele
 *            dom element for select tag
 * @param selectedValues
 *            optional object that has selected internal values are attributes
 * @returns html to be set as innerHTML, null if no data
 */
a.buildOptions = function(grid, ele, selectedValues) {
	if (!grid || grid.length < 2) {
		return '';
	}
	var t = [];
	var nbrCols = grid[0].length;
	var hasLabel = nbrCols > 1;
	var hasClass = nbrCols > 2;
	for ( var i = 1; i < grid.length; i++) {
		var val = grid[i][0];
		t.push('<option value="');
		t.push(val);
		t.push('" ');
		if (selectedValues && selectedValues[val]) {
			t.push('selected="selected" ');
		}
		if (hasClass) {
			var cls = grid[i][2];
			if (cls) {
				t.push('class="');
				t.push(cls === '0' ? 'inactiveoption' : cls);
				t.push('" ');
			}
		}
		t.push('>');

		if (hasLabel) {
			if (this.codeAndDesc) {
				val = val + ' - ' + grid[i][1];
			} else {
				val = grid[i][1];
			}
		}
		t.push(val.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
		t.push('</option>');
	}
	return t.join('');
};
/**
 * part of setVlueoObject() process for a multi-select field
 * 
 * @param grid
 *            data as received from server
 * 
 * In case of codeAndDescriotion, displayed value is first column + ' - ' +
 * second column
 * 
 * @param ele
 *            dom element of this field
 * @param doNotSelect
 *            if true,we will not select any option
 */
a.fillMultiValuesToObject = function(grid, ele, doNotSelect) {
	var selectedValues = {};
	var options = ele.options;
	var nbrOldValues = 0;
	var n = options.length;
	var option;
	for ( var i = 0; i < n; i++) {
		option = options[i];
		if (option.selected && option.value != "") {
			selectedValues[option.value] = true;
			nbrOldValues++;
		}
	}
	var html = this.buildOptions(grid, ele, selectedValues);
	ele.innerHTML = html;

	/*
	 * if we ended up removing last selected value, we are to fure field changed
	 * events
	 */
	if (!html && nbrOldValues) {
		this.P2.fieldChanged(ele, this.name, true, false);
	}
};

/**
 * override to provide the displayed value for an internal value
 * 
 * @param val -
 *            internal value
 * @returns second column value. Because selection field has (K,V) pair.
 */
a.getDisplayVal = function(val) {
	var dataGrid = this.grid;

	/*
	 * Now selectionField will have valueList as an k,v;... Not as grid so we
	 * need to break it into grid.
	 */
	if (this.valueList) {
		dataGrid = PM.valueListToGrid(this.valueList);
	}

	var rowIdx = PM.findRowIndex(dataGrid, val, 0);
	if (rowIdx >= 0) {
		var row = dataGrid[rowIdx];
		return row[1] || row[0];
	}
	return val;
};

/**
 * issue with IE old version. IE was not re-rendering when a value was changed.
 * We used to force re-rendering by changinig its width
 * 
 * @ele selection dom element
 */
var takeCareOfIeGotcha = function(ele) {
	// var w = ele.style.width || 'auto';
	// ele.style.width = '150px';
	// ele.style.width = w;
};
a.callListService = RadioButtonField.prototype.callListService;

/*******************************************************************************
 * special validations for multiselect list/grid selection field. delegated to
 * this function from textInputField.validateValue() only for this case
 * 
 * @param val
 *            to be validated
 * @returns normally if all OK.
 * @throws (ExilityError}
 *             in case of validation error
 */

a.specialValidateValue = function(val) {
	/*
	 * Note that val is of the form
	 * 
	 * [[nameLabel, checkedLabel],[name1, checked1],[name2,checked2]...]
	 * 
	 * if length = 1; then there ae no rows. if no rows are checked, that means
	 * user has not selected any row for list, it is just an array of names
	 */
	var nbrChecks = val.length;
	if (this.selectionValueType == 'grid') {
		// val has a header. That is not a checked option
		nbrChecks = val.length - 1;
		for ( var i = 1; i < val.length; i++) {
			var checked = val[i][1];
			if (!checked || checked == '0') {
				nbrChecks--;
			}
		}
	}

	if (!nbrChecks)// user has not selected any row
	{
		if (this.isRequired) {
			throw new ExilityError("exilValueRequired");
		}

		if (!this.basedOnField) {
			return val;
		}
		var basedOnVal = this.P2.getFieldValue(this.basedOnField);
		if (!basedOnVal) {
			return val;
		}
		if (!this.basedOnFieldValue || basedOnVal == this.basedOnFieldValue) {
			throw new ExilityError("exilValueRequired");
		}
		return val;
	}

	/*
	 * there is no other validation for a seleciton field
	 */
	return val;
};
/**
 * @class AssistedInputField.
 * 
 * This field is the first 'conceptual field', that is not native to HTML. It is
 * designed to provide a platform for future fields. Objective of an assistant
 * is to help user in getting the right value in this field with minimum key
 * strokes and in an intuitive way. We keep adding new assistants as UI evolves
 * This field replaces calendarA pop-up and combo-box.
 * 
 * With no assistants, it works the same way as a text-input field. We define
 * assistants and attach an appropriate one at run time.See
 * FieldAssistantxxxxxx.js files
 */
var AssistedInputField = function() {
	AbstractInputField.call(this);
	this.requiresValidation = true;
	this.isAssisted = true;
};

/**
 * we allow projects to style the suggestion. The container will have an
 * attribute that will have different values based on the state attribute values
 * are :
 * 
 * fetching : we are waiting for server to respond back with suggestions
 * 
 * waitingn : Here, n is the minCharsToSuggest as set by page designer for this
 * field. we are waiting for user to type a minimum of n characters. note that
 * we keep it
 * 
 * active : suggestions are displayed
 * 
 * noMatch : server returned no suggestions
 * 
 * Attribute is removed when the field looses focus
 */
AssistedInputField.ATTR = 'data-suggest';
a = AssistedInputField.prototype = new AbstractInputField;

/**
 * whether to select values based on starting characters, or finding characters
 * anywhere
 */
a.matchStartingChars = false;
a.helpText = 'Help is not available on this field';
/**
 * this is in the form of valid list..
 */
a.FETCHING_MESSAGE = [ [ '', 'Fetching.....' ] ];
a.FETCHING_MESSAGE.stillFetching = true;

/**
 * called from P2 after adding this field to the fields collection
 */
a.initialize = function() {
	/*
	 * we keep a single assistant for a page, as we assist one field at a time
	 * anyways..
	 */
	if (!this.P2.ia)
		this.P2.ia = new InputAssistant(this.P2);

	/*
	 * value list is supplied as a comma separated string. Convert it to array
	 */
	if (this.valueList) {
		var vals = this.valueList.split(';');
		this.valueList = [];
		for ( var i = 0; i < vals.length; i++) {
			var pair = vals[i].split(',');
			var row = [ pair[0].trim() ];
			if (pair[1])
				row.push(pair[1].trim());
			else
				row.push(row[0]);
			this.valueList.push(row);
		}
	}
	/*
	 * html5 generator is now setting autocomplete="off", but we do not take
	 * chances..
	 */
	if (this.valueList || this.listServiceId || this.suggestionServiceId) {
		var ele = this.P2.doc.getElementById(this.name);
		if (ele) {
			ele.setAttribute('autocomplete', 'off');
		}
	}
};

/**
 * 
 * @param ele
 *            dom element to set value to
 * @param val
 *            value to be set to dom element
 */
a.setValueToObject = function(ele, val) {
	if (!this.valueList && !this.valueLists && !this.listServiceId) {
		ele.value = val;
		return;
	}

	/*
	 * possible that the val to be set is an internal value, and we may have to
	 * render a matching text in the view
	 * 
	 */
	ele.internalValue = val;

	/*
	 * if this.valueList exists, it means there is only one list of values.
	 * Otherwise we will have this.valueLists[] array with one entry for each
	 * row.
	 */
	var vList = this.valueList;
	if (!vList && this.valueLists) {
		var idx = ele && ele.rowIdx;
		if (idx || idx == 0) {
			// we are OK
		} else if (this.table) {
			idx = this.table.currentRow;
		} else {
			debug("Design Error: current row can not be established for an assisted field. Setting it to 0.");
			idx = 0;
		}
		vList = this.valueLists[idx];
		/*
		 * if we do not have list of values, we may have to haev an empty list
		 */
		if (!vList) {
			this.valueLists[idx] = vList = [];
		}
	}

	if (!vList) {
		this.valueList = vList = [];
	}

	var displayValue = '';
	if (val || val === '') {
		var valueFound = false;
		for ( var i = 0; i < vList.length; i++) {
			var row = vList[i];
			if (row[0] == val) // found matching internal value
			{
				displayValue = row[1] || val;
				valueFound = true;
				break;
			}
		}
		if (!valueFound) {
			displayValue = val;
			/*
			 * possible if values list is yet to arrive, or some issue with
			 * data. We ALWAYS assume that the value being set is VALID. Hence
			 * we add this value to the list
			 */
			debug(val + ' is not found in the list of values for ' + this.name);
			vList.push([ val, val ]);
			ele.valueNotFoundInList = true;
		} else if (ele.valueNotFoundInList) // was not found earlier...
			delete ele.valueNotFoundInList;
	}

	ele.value = displayValue;
};

/**
 * get value from do element
 * 
 * @param ele
 *            dom element from which to get the value
 * @returns vale from dom element
 */
a.getValueFromObject = function(ele) {
	if (ele.internalValue || ele.internalValue == '')
		return ele.internalValue;
	return ele.value || '';
};

/**
 * inherit from SelectionField
 */
a.callListService = SelectionField.prototype.callListService;
/**
 * it is possible that a value-list is attached to this assisted field. "display
 * value" of a value in such a case is the value in the second column for a
 * matching first column
 * 
 * @param val
 *            internal value for which we need display value
 * @returns display value for the internal value
 */
a.getDisplayVal = function(val) {
	if (!this.valueList) {
		if (val)
			return val;
		return '';
	}
	var dataGrid = this.valueList;
	if (!val && val != 0)
		val = this.internalValue;
	var rowIdx = findRowIndex(dataGrid, val, 0);
	if (rowIdx >= 0) {
		return dataGrid[rowIdx][1] || dataGrid[rowIdx][0];

	}
	debug('display value for [' + val + '] not found');
	return val || '';
};

/**
 * has the view-value changed from its model value?
 * 
 * @override Field will override it because it has more than one assistants for
 *           field.
 * @param obj :
 *            This is an object represents to html ele.
 * @returns {Boolean}
 */
a.isChanged = function(obj) {
	// get the model value
	var val = this.getValue();
	// It might be a list or suggestion list so get the display value
	if (this.valueList) {
		val = this.getDisplayVal(val);
	}

	return (val != obj.value);
};

/**
 * called back when server returns valueList for this field. Refer to
 * SelectionField.
 * 
 * @param grid
 *            array of arrays of values
 * @param ele
 *            dom element associated with this operation
 * @param keyValue
 *            if the list of values depend on a key, this is the key for which
 *            the values are to used
 * @param listServiceOnLoad
 *            true if this is triggered from a list service triggered on load
 * 
 */
a.fillList = function(grid, ele, keyValue, listServiceOnLoad) {
	if (!ele && !this.table) // it is a simple field, but ele is not passed
		ele = this.P2.getFieldObject(this.name);

	if (!grid)
		grid = [ [ '', '' ] ];
	if (this.blankOption)
		grid = this.addBlankOption(grid);

	var vlist = [];
	for ( var i = 1; i < grid.length; i++)
		// we skip the header.
		vlist.push(grid[i]);

	if (this.table && !this.sameListForAllRows) {
		/*
		 * we have to keep list for each row
		 */
		if (!this.valueLists)
			this.valueLists = {};

		/*
		 * assume this is for the current row
		 */
		var idx = this.table.currentRow;
		if (ele && ele.rowIdx != 'undefined') {
			idx = ele.rowIdx;
		} else {
			debug('ele not found for fillList. pushing to current row for '
					+ this.name);
		}
		this.valueLists[idx] = vlist;
	} else {
		/*
		 * for a normal field, or for a column that will have the same list for
		 * all rows
		 */
		this.valueList = vlist;
	}

	var val = '';
	if (this.selectFirstOption && vlist.length) {
		var v = vlist[0][0];
		if (v || v === '')
			val = v;
	}

	/*
	 * is there an assistant active for this field?
	 */
	var assistant = this.P2.ia && this.P2.ia.assistant;
	if (assistant && assistant.field != this)
		assistant = null;

	if (this.table && this.sameListForAllRows) {
		/*
		 * set default value for all rows in the table
		 */
		var data = this.table.grid;
		for ( var i = 1; i < data.length; i++) {
			var row = data[i];
			if (row && !row.isDeleted) {
				ele = this.P2.getFieldObject(this.name, i);
				if (ele.valueNotFoundInList)
					this.setValueToObject(ele, ele.internalValue);

				else
					this.setValue(val, ele, i, null, true, false,
							listServiceOnLoad);
				if (assistant && assistant.ele === ele)
					assistant.restart(vlist);
			}
		}
	} else if (ele) {
		/*
		 * this list is meant for thid dom element.
		 * 
		 * It is possible that the internal value was set when value list was
		 * not available
		 */
		if (ele.valueNotFoundInList)
			this.setValueToObject(ele, ele.internalValue);

		else
			this.setValue(val, ele, null, null, true, false, listServiceOnLoad);

		/*
		 * did we get this when the field is in focus, and an assistant is
		 * active?
		 */
		if (assistant && assistant.ele === ele)
			assistant.restart(vlist);
	}

};

/**
 * return a new grid with a blank option in addition to the supplied list
 * 
 * @param grid
 *            value list to which we are to add a blank option
 * @returns new grid
 */
a.addBlankOption = function(grid) {
	if (!grid || !grid.length) {
		return [ [ '', '' ], [ '', this.blankOption ] ];
	}
	var header = grid[0];
	var firstRow = [];
	var n = header.length;
	/*
	 * create a row with same number of columns
	 */
	for ( var j = 0; j < n; j++)
		firstRow.push('');

	/*
	 * add blank option as display value of first row
	 */
	firstRow[1] = this.blankOption;

	var newGrid = [ header, firstRow ];
	// add all rows
	for ( var i = 1; i < grid.length; i++) {
		var row = grid[i];
		if (n == 1) // single column
			row.push(row[0]);
		newGrid.push(row);
	}
	return newGrid;
};

/**
 * get the list of values attached wiht this field.
 * 
 * @param ele
 *            dom element caller is working with
 * @returns valueList for the dom element. If th elist is being fetched, a list
 *          with such a message is returned. Null is returned if this field does
 *          not have a list service associated with it.
 */
a.getValueList = function(ele) {
	/*
	 * if there is only one list, just return that
	 */
	if (this.valueList)
		return this.valueList;
	/*
	 * list is different for each row.
	 */
	if (this.valueLists) {
		var vlist = this.valueLists[ele.rowIdx];
		if (!vlist) {
			/*
			 * only possibility is that the list service is in-progress for this
			 * row
			 */
			this.valueLists[ele.rowIdx] = vlist = this.FETCHING_MESSAGE;
		}
		return vlist;
	}

	/*
	 * no list at all means list service is yet to fire. May be no-autoload.
	 */
	if (this.listServiceId) {
		debug(this.name
				+ ' does not have valueList though it has a list service attached to that');
		return this.FETCHING_MESSAGE;
	}

	return null;
};

/**
 * get suggested values from server for the chars that are typed into this field
 * 
 * @param ele
 *            dom element
 * @param val
 *            current value
 * @returns
 */
a.getSuggestions = function(ele, val) {
	/*
	 * is this available in a local store?
	 */
	if (this.localSuggestionList) {
		var newGrid = this.getSuggesitonsFromLocalStore(val);
		this.P2.ia.assistant.setSuggestions(ele, val, newGrid);
		return;
	}

	/*
	 * we will have to go to server
	 */
	var dc = new DataCollection();
	dc.addValue(this.unqualifiedName || this.name, val);

	if (this.suggestionServiceFields) {
		var nbrFields = this.suggestionServiceFields.length;
		for ( var i = 0; i < nbrFields; i++) {
			var fieldName = this.suggestionServiceFields[i];
			var field = this.P2.getField(fieldName);
			if (field && field.unqualifiedName)
				fieldName = field.unqualifiedName;
			var v;
			if (this.suggestionServiceFieldSources)
				v = this.P2
						.getFieldValue(this.suggestionServiceFieldSources[i]);
			else
				v = field.getValue();
			dc.addValue(fieldName, v);
		}
	}
	this.courier = new FieldServiceCourier(this, ele, val);
	var se = new ServiceEntry(this.suggestionServiceId, dc, false, null,
			this.courier, this.name, ServerAction.NONE, false, false, null);
	this.P2.win.serverStub.callService(se);
};

/**
 * gets suggestions for the token from local store
 * 
 * @param token
 *            for which suggestions are to be fetched
 * @returns list of suggestions or null if local store is not maintained
 */
a.getSuggesitonsFromLocalStore = function(token) {
	var grid = this.localSuggestionList;
	if (!grid) {
		return null;
	}
	/*
	 * if grid has not sotered text for comparison, we do that one time exercise
	 */
	var n = grid.length;
	if (!grid[1].text) {
		for ( var i = 1; i < n; i++) {
			var row = grid[i];
			row.text = row[0].toUppercase();
		}
	}

	token = token.toUppercase();
	var newGrid = [ grid[0] ];
	for ( var i = 1; i < n; i++) {
		var row = grid[i];
		var idx = row.text.indexOf(token);
		if (this.matchStartingChars) {
			if (idx !== 0)
				continue;
		} else if (idx === -1) {
			continue;
		}
		newGrid.push(row);
	}
	return newGrid;
};

/**
 * suggestion service rteurned from server. Called from this.courier after
 * ensuring that this indeed is the CURRENT expected data
 * 
 * @param dc
 *            in which data is received from server
 * @param ele -
 *            dom element
 * @param val -
 *            value for which we had asked for suggesitons
 */
a.gotSuggestions = function(dc, ele, val) {
	/*
	 * are we still assisting this field?
	 */
	if (!this.beingAssisted) {
		debug('Suggested values service came too late for field ' + this.name);
		return;
	}

	var data = null; // get the first grid
	for ( var gridName in dc.grids) {
		data = dc.grids[gridName];
		break;
	}
	this.P2.ia.assistant.setSuggestions(ele, val, data);
};

/**
 * called onfocus event. we are to return false if this is a false-start.
 * Delegeted to corresponding assistant
 * 
 * @param ele
 *            dom element that is focussed
 * @returns true if it is okay to focus.
 */
a.focussed = function(ele) {
	return (this.P2.ia.start(this, ele));
};

/**
 * called lodt onfocus event. we are to return false if we do not want to loose
 * focus. Delegeted to corresponding assistant
 * 
 * @param ele
 *            dom element that is focussed
 * @returns true if it is okay to let go.
 */
a.blurred = function(ele) {
	return (this.P2.ia.end(this, ele));
};

/**
 * @class with a callback method, instances of this class are used as call-back
 *        objects while making a servicerequest. Objects hold relevant data
 *        required to do a meaningful call-back
 * @param field
 *            that is firing this service
 * @param ele
 *            dom elemet being assisted
 * @param val
 *            value for which suggestions are requested
 */
FieldServiceCourier = function(field, ele, val) {
	this.field = field;
	this.ele = ele;
	this.val = val;
};

// a callBackObject needs to implement serviceReturned() method
FieldServiceCourier.prototype.serviceReturned = function(dc) {
	if (this.field.courier !== this) {
		// another courier is fired. this is obsolete
		debug('User has typed before we could suggest for what she had already typed for field '
				+ this.field.name);
		return;
	}

	this.field.courier = null;
	this.field.gotSuggestions(dc, this.ele, this.val);
};
/**
 * @module InputaAssistant is am interface through an assisted input field gets
 *         desired assistance for the user to edit a field.
 *         
 *         Actual work is delivered by singleton instances of specific assistants, like dateAssistant and listAssistant.
 *         @see fieldAssisted.js for AssistedInputField class, for which this is the assistant
 * 
 */

/**
 * @class InputAssistant One instance of this is maintained per page to assist
 *        any of the assistedInputField in that page. This class also has some
 *        specific assistant related event handlers, which is a violation of
 *        object orientation. Needs to be re-factored
 * @param page
 *            for which this is instantiated
 */
InputAssistant = function(page) {
	this.P2 = page;
	this.win = page.win;
};

InputAssistant.prototype = {

	/**
	 * start assisting this element
	 * 
	 * @param field
	 *            being assisted
	 * @param ele
	 *            dom element being assisted
	 * @return true if this is started, false otherwise
	 */
	start : function(field, ele) {
		/*
		 * It is possible that we are already assisting this field, but some
		 * event would have triggered because of click on a related part
		 */
		if (this.ele && this.ele === ele) {
			return false;
		}

		if (ele.hasAttribute('disabled') || ele.hasAttribute('readonly'))
			return false;

		this.ele = ele;
		this.field = field;
		this.oldValue = ele.value;
		field.beingAssisted = true;

		/*
		 * 
		 */
		var dataType = dataTypes[field.dataType];
		if (dataType && dataType.basicType == AbstractDataType.DATE) {
			if (!this.dateAssistant) {
				this.dateAssistant = new DateAssistant(this.P2);
			}
			this.assistant = this.dateAssistant;
			this.assistant.start(field, ele, dataType);
			return true;
		}

		// suggestions?
		if (field.suggestionServiceId) {
			if (!this.suggestionAssistant)
				this.suggestionAssistant = new SuggestionAssistant(this.P2);
			this.assistant = this.suggestionAssistant;
			this.assistant.start(field, ele);
			return true;
		}

		// fixed list?
		this.vList = null;
		var vList = field.getValueList(ele);
		if (vList) {
			if (!this.listAssistant)
				this.listAssistant = new ListAssistant(this.P2);
			this.assistant = this.listAssistant;
			this.assistant.start(field, ele, vList);
			// this.listener = this.P2.addListener(ele, 'keydown', this.P2.ia,
			// 'keyDowned');
			return true;
		}

		this.ele = null;
		field.beingAssisted = false;
		/*
		 * but still, this is not a false start. that is, caller should continue
		 * with the start event. Hence return true.
		 */
		return true;
	},

	/**
	 * done with. close shop and go home, but after verifying event related
	 * issues
	 * 
	 * @param field
	 *            being assisted
	 * @param ele
	 *            dom element being assisted
	 * @param toMoveOn -
	 *            force end. do not use any logic to check whether we realy have
	 *            to exit
	 */
	end : function(field, ele, toMoveOn) {
		// if we didn't start() for this ele, shouldn't be end()ing as well!!
		if (ele && ele !== this.ele)
			return false;

		/*
		 * to manage sequence of events that triggered when user shifts focus
		 * away from the field, but into the assisted area, we use an attribute
		 */
		if (this.toRetainFocus) {
			/*
			 * and an over-ride by some editable part of assisted area, like
			 * month field in date assistant
			 */
			if (this.letItGo) {
				this.letItGo = false;
			} else {
				/*
				 * we have to retain focus. We would have done ele.focus(); but
				 * that wouldn't work because of the way elements get queued. We
				 * have to let the queued events finish before we do ele.focus()
				 */
				new TimeBomb(this.ele, 'focus', null, 0, this.win);
			}
			return false;
		}

		if (this.assistant) {
			this.assistant.end(ele);
			this.assistant = null;
		} else {
			debug('Possible error. trying to close an assistent that was never created');
		}

		field.beingAssisted = false;
		this.ele = null;
		return true;
	},
	/*
	 * 
	 * event handling for calendar.
	 * 
	 * 1. month drop-down is the only control that can take focus
	 * 
	 * 2. we should treat the field and calendar together as one control. That
	 * is, any movement between teh two should not trigger focus/blur event for
	 * the field
	 * 
	 * 3. user can either type or select from the calendar.
	 */

	/**
	 * called whenever mouse downed on an assistant, that may take the input
	 * focus away from the dom element where user is editing. we have to
	 * simulate as if ele and assistant together form one unit, and any
	 * focus-blur between them is to be ignored
	 */
	mouseDownedOnAssistant : function() {
		/* set attribute for onBlur to act on */
		this.toRetainFocus = true;

		/*
		 * In nonIE, onscroll does not take the focus away from the input
		 * element.But if you click on scroll bar, onmousedown event is fired on
		 * the element, but not onclick. Hence, we just switch this flag after
		 * all events trigger when mouse down happens (mousedown, focus and
		 * blur)
		 */
		new TimeBomb(this, 'mousedownEventsDone', false, 0, this.win);
	},

	/**
	 * called from the timer above. reset toRetainFocus
	 */
	mousedownEventsDone : function() {
		this.toRetainFocus = false;
	},
	/**
	 * three cases to be handled :
	 * 
	 * 1. user clicked on the input element,
	 * 
	 * 2. clicked on other part of calendar,
	 * 
	 * 3. others
	 */

	monthBlurred : function() {
		if (this.toRetainFocus) {

			/*
			 * blurred because mouse is downed on some other area on the
			 * calendar
			 */
			new TimeBomb(this.ele, 'focus', null, 0, this.win);
		} else {
			this.end(this.field, this.ele, true);
		}
	}
};/**
 * @module This file contains definition of DateAssistant
 */
/**
 * @class DateAssistant is used as a singleton, for a page.
 */
var DateAssistant = function (p2){
    this.P2 = p2;
    this.win = p2.win;
    var doc = p2.doc;
    var div = doc.createElement('div');
    div.className = 'cal';
    div.style.position = 'absolute';
    div.innerHTML = this.paintCal();
    doc.body.appendChild(div);

    // cache frequently used elements
    this.viewStyle = div.style;
    this.yearEle = doc.getElementById('cal_year');
    this.monthEle = doc.getElementById('cal_month');
    this.dayEle = doc.getElementById('cal_dates');
};

DateAssistant.prototype = {
	weekDays : ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
	daysInMonth : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
	
	/**
	 * start the assistant for a field. invoked by fieldAssistant on a
	 * date-field
	 * 
	 * @param field
	 *            being assisted
	 * @param ele
	 *            dom element being assisted
	 * @param dt
	 *            data type of the field
	 */
	start : function (field, ele, dt){
	    this.field = field;
	    this.ele = ele;
	    this.lastValue = ele.value;
	    /*
		 * position the calendar just below the field
		 */
	    var xy = PM.getDocumentXy(ele);
	    this.viewStyle.top = (xy.y + ele.clientHeight + 1) + 'px';
	    this.viewStyle.left = xy.x + 'px'; // -1 to take care of border
	    var today = PM.getToday();
	
	    this.minDate = field.minDate || PM.getToday(-dt.maxDaysBeforeToday);
	    this.tmin = this.minDate.getFullYear() * 100 + this.minDate.getMonth();
	
	    this.maxDate = field.maxDate || PM.getToday(dt.maxDaysAfterToday);
	    this.tmax = this.maxDate.getFullYear() * 100 + this.maxDate.getMonth();
	    var val = ele.value;
	    if (val){
	        val = PM.parseDate(val);
	    }
	    if (!val){ 
	    	/*
			 * Not a date. choose today, unless today is outside valid range
			 */
	        if (this.maxDate < today){
	            val = this.maxDate;
	        } else if (this.minDate > today){
	            val = this.minDate; 
	        }else{
	            val = today;
	        }
	    }
	    this.year = this.oYear = val.getFullYear();
	    this.month = this.oMonth = val.getMonth();
	    this.date = this.oDate = val.getDate();
	    this.yearEle.innerHTML = this.year;
	    this.monthEle.selectedIndex = this.month;
	
	    this.render();
	    this.viewStyle.display = '';
	},
	
	/**
	 * close this assistant
	 */
	end : function (){
	    this.viewStyle.display = 'none';
	
	},
	
	/**
	 * return the text that is a valid html fragment for the calendar
	 * 
	 * @returns innerHTMl for painting a calendar assistant
	 */
	paintCal : function (){
	    var s = [];
	    s.push('<table id="cal_table" onmousedown="P2.ia.mouseDownedOnAssistant(event)" ><tr><td id="cal_header"><div id="cal_prev" onclick="P2.ia.assistant.changeYear(-1)"></div><div id="cal_year">Year</div><div id="cal_next" onclick="P2.ia.assistant.changeYear(1)" ></div><div id="cal_month_div"><select id="cal_month" onmousedown="P2.ia.letItGo = true;" onblur="P2.ia.monthBlurred();" onchange="P2.ia.assistant.changeMonth()" >');
	    for (var i = 0; i < 12; i++){
	        s.push('<option value="' + i + '">');
	        s.push(PM.exilParms.monthNames[i]);
	        s.push('</option>');
	    }
	    s.push('</select></div></td></tr><tr><td><table id="cal_dates_table"><thead><tr>');
	    for (var i = 0; i < 7; i++){
	        s.push('<th>');
	        s.push(this.weekDays[i]);
	        s.push('</th>');
	    }
	    s.push('</tr></thead><tbody id="cal_dates" onclick="P2.ia.assistant.clicked(event);">');
	    for (var i = 0; i < 6; i++){
	        s.push('<tr>');
	        for (var j = 0; j < 7; j++)
	            s.push('<td>&nbsp;</td>');
	        s.push('</tr>');
	    }
	    s.push('</tbody></table></td></tr></table>');
	    return s.join('');
	},
	
	/**
	 * change the dates for the painted calendar for current selected values
	 */
	render : function (){
	    this.yearEle.innerHTML = this.year;
	    this.monthEle.selectedIndex = this.month;
	
	    /**
		 * we have to disable dates that are not valid. css class is set based
		 * on that
		 */
	    var classForAll = null;
	    var min = 0;
	    var max = 32;
	
	    /*
		 * this.tmin and this.tmax are numbers of the form form yyyymm so that
		 * we can simplify comparison.
		 */
	    var t = this.year * 100 + this.month;
	    if (t < this.tmax && t > this.tmin){
	    	/*
			 * all dates in this month are in valid range
			 */
	        classForAll = 'ok'; 
	    }else if (t < this.tmin || t > this.tmax){
	    	/*
			 * all dates are outside range
			 */
	        classForAll = 'nok';
	    }else{ 
	    	/*
			 * some days are in range
			 */
	    
	        if (t == this.tmin){
	        	/*
				 * we are in the min month
				 */
	            min = this.minDate.getDate();
	        }
	        if (t == this.tmax){
	            max = this.maxDate.getDate();
	        }
	    }
	    var curDate = -1; // current date is not in this month
	    if (this.year === this.oYear && this.month === this.oMonth){
	        curDate = this.oDate; // to be highlighted
	    }
	    /*
		 * let us write dates into our table cells
		 */
	    var firstOfThisMonth = new Date(this.year, this.month, 1);
	    /*
		 * day of week this month starts
		 */
	    var startingCell = firstOfThisMonth.getDay(); 
	    var en = this.daysInMonth[this.month];
	    /*
		 * we will have a bug in this in next 400 years!!
		 */
	    if (this.month == 1 && (this.year % 4) == 0 && (this.year % 100)){
	        en = 29;
	    }
	    var val, cls;
	    var dateNumber = 1;
	    var rows = this.dayEle.childNodes;
	    
	    var rowsToBePainted = Math.ceil((en + startingCell)/7);
	
	    for (var i = 0; i < rowsToBePainted; i++){
	        var row = rows[i]; 
	        if(!row.style) // browsers are known to introduce #text elements in
							// between
	        	continue;
	        var cells = row.childNodes;
	        // Make it visible if hidden
	        row.style.display = '';
	        for (var j = 0; j < 7; j++){
	            var cell = cells[j];
	            if(!cell.style){
	            	continue;
	            }
	            /*
				 * first row may have some empty cells in the beginning. Also
				 * the cells after the last date of the month
				 */
	            if ((i == 0 && j < startingCell) || dateNumber > en){
	                val = ' ';
	                cls = 'empty';
	            }else{
	                val = dateNumber;
	                dateNumber++;
	                // what is the css we have to apply to this cell?
	                if (val == curDate){
	                    this.selectedTd = cell;
	                    cls = 'sel';
	                }  else if (classForAll){
	                    cls = classForAll;
	                }else if (val >= min && val <= max){
	                    cls = 'ok';
	                } else{
	                    cls = 'nok';
	                }
	            }
	            cell.className = cls;
	            cell.firstChild.nodeValue = val;
	        }
	    }
	    
	   // hide extra row if exist.
	   if(rows[rowsToBePainted]){
		  rows[rowsToBePainted].style.display = 'none';
	   }	  
	},
	
	/**
	 * we use mouseDown as a sneak-preview into click and prepare accordingly
	 */
	mouseDowned : function (){
	    /*
		 * this is a warning that our ia area is being clicked, because of which
		 * blur is going to be triggered
		 */
	    this.toRetainFocus = true;
	    /*
		 * however, in nonIE, onscroll does not take the focus away from the
		 * input element. and, what is 'funny' is, if you click on scroll bar,
		 * onmousedown event is fired on the element, but on onclick hence, we
		 * just switch this flag after all events trigger when mouse down
		 * happens (mousedown, focus and blur)
		 */
	    new TimeBomb(this.P2.ia, 'retainFocus', false, 0, this.win);
	},
	
	/**
	 * onclick anywhere on the calendar
	 * 
	 * @param e
	 *            event
	 */ 
	clicked : function (e){
	    // debug('calendar clicked');
	    var ele = e.target || e.srcElement;
	    if (ele.nodeType == 3)
	        ele = ele.parentNode;
	    if (ele.className != 'ok' && ele.className != 'sel'){ 
	    	/*
			 * clicked on a cell that is not a valid date
			 */
	    	return;
	    }
	    var d = new Date(this.year, this.month, parseInt(ele.innerHTML, 10));
	    var dt = dataTypes[this.dataType];
	    if(dt && dt.includesTime)
	    	this.ele.value = formatDateTime(d);
	    else
	    	this.ele.value = formatDate(d);
	    
	    this.P2.focusNext(this.field, this.ele);
	},
	
	/**
	 * called when arrow mark for next/prev year is clicked
	 * 
	 * @param incr
	 *            number by which year is to be incremented. Could be negative
	 */
	changeYear : function (incr){
	    this.year += incr;
	    this.render();
	},
	
	/**
	 * called when month is selected from drop-down box
	 */
	changeMonth : function (){
	    this.month = this.monthEle.selectedIndex;
	    this.render();
	}
};
/*******************************************************************************
 * fixed-list assistant : behaves like a drop-down, well almost.
 * 
 * 1. All values are displayed.
 * 
 * 2. As user types, list is shortened to show only rows that start with the
 * typed characters. (this behaviour is an improvement(?) over drop-down
 * 
 * 3. first matching row is also selected.
 * 
 * 4. If user types a character that results in no-match, a sound is produced,
 * and that character, and any subsequent ones are all ignored
 * 
 * 5. A pause of 500 millisecond is considered to be end of selection process.
 * Subsequent typing is considered to be a fresh start
 * 
 * 6. up/down arrow keys work.
 * 
 * 7. escape key restores old value and abandons selection. Focus is still
 * retained.
 * 
 * 8. click on a row selects the row and simulates a tab. we handle onkeydown
 * and cancel the event, so that onkeypress never triggers.
 ******************************************************************************/

/**
 * @class ListAssistant
 * @param p2
 *            page for which this assistant is instantiated
 */
var ListAssistant = function(p2) {
	this.P2 = p2;
	this.win = p2.win;

	/*
	 * create the assistant container, only once for a page
	 */
	if (!p2.listDiv) {
		p2.listDiv = this.createListDiv(p2.doc);
	}
	this.div = p2.listDiv;
};

ListAssistant.prototype = {

	/**
	 * one time creation of html div for rendering this assistant. This is
	 * re-used
	 * 
	 * @param doc
	 *            html document object
	 * @returns innerHTML for a div element
	 */
	createListDiv : function(doc) {
		var div = doc.createElement('div');
		div.innerHTML = '<div id="list_assistant" style="position:absolute; z-index:3;display:none" onmousedown="P2.ia.assistant.rowClicked(event)"></div>';
		// we need ul element and not div
		div = div.firstChild;
		// some browsers insert text-elements all-over the place
		if (div.nodeType == 3)
			div = div.nextSibling;
		doc.body.appendChild(div);
		return div;
	},
	/**
	 * start assisting an input element. this is typically invoked onfocus of
	 * the field
	 * 
	 * @param field
	 * @param ele
	 *            dom element being assisted
	 * @param vList
	 *            list of values to be used
	 * @param isRestart
	 */
	start : function(field, ele, vList, isRestart) {
		this.field = field;
		this.ele = ele;
		this.displayValue = this.oldValue = this.ele.value;
		this.oldInternalValue = this.ele.internalValue;
		this.vList = vList;
		this.nbrRows = vList.length;

		/*
		 * this.colIdx is the column that is used for matching. Additionally, it
		 * is possible that we are displaying other columns as well. If so, such
		 * columns are in this.colIndexes
		 */
		if (field.columnIndexesToShow) {
			var indexes = field.columnIndexesToShow.split(',');
			this.colIdx = parseInt(indexes[0], 10);
			if (indexes.length > 1) {
				this.colIndexes = [];
				for ( var i = 0; i < indexes.length; i++) {
					this.colIndexes.push(parseInt(indexes[i], 10));
				}
			}
		} else {
			// second column is what we have to use, if it exists of course
			if (vList.length && vList[0].length > 1)
				this.colIdx = 1;
			else
				this.colIdx = 0;
		}

		this.ucasedValues = []; // caches upper-cased values for performance
		this.val = null; // tracks the characters typed so far
		this.wrongChars = false; // has the user already typed characters
		// with no
		// match?
		this.curRow = null;
		this.position();
		this.div.removeAttribute(AssistedInputField.ATTR);
		this.render();
		if (!isRestart) {
			// let onkeydown from this element call this.keyDowned()
			this.listener = this.P2.addListener(ele, 'keydown', this,
					'keyDowned');
		}
		if (this.oldValue)
			this.matchARow(this.oldValue);
	},

	/**
	 * @method position position the list div just below the field being
	 *         assisted
	 */
	position : function() {
		var xy = getDocumentXy(this.ele); // part of exility utility
		var style = this.div.style;
		style.top = (xy.y + this.ele.clientHeight - 1) + 'px';
		style.left = (xy.x - 1) + 'px';
		this.div.innerHTML = '';
		if (this.field.listCss)
			this.div.className = this.field.listCss;
		else {
			this.div.className = '';
			style.width = (this.field.listWidth || this.ele.clientWidth) + 'px';
		}
	},

	/**
	 * @method end this assistance session
	 */
	end : function() {
		/*
		 * if user has left junk, or cleared it...
		 */
		if (!this.ele.value || this.displayValue != this.ele.value) {
			if (this.ele.value) // revert back to last value
				this.ele.value = this.displayValue;
			else
				this.displayValue = this.ele.internalValue = '';
		}
		this.P2.removeListener(this.listener);
		this.div.style.display = 'none';
	},
	/**
	 * @method keyDowned event handler when a key is downed.
	 * @param e
	 *            event
	 */
	keyDowned : function(e) {
		var key = e.keyCode;

		if (key === 9)// tab
			return;

		if (key === 27 || key === 13) {// esc or enter
			if (key === 27) {
				this.ele.value = this.oldValue;
				this.ele.internalValue = this.oldInternalValue;
			}
			if (e.preventDefault)
				e.preventDefault();
			else
				e.returnValue = false;
			this.P2.focusNext(this.field, this.ele);
			return;
		}

		/*
		 * so long as we are not waiting for list to come
		 */
		if (!this.vList.stillFetching) {
			if (key === 38) { // up
				this.moveUpDown(true, e.shiftKey);

			} else if (key === 40) { // down
				this.moveUpDown(false, e.shiftKey);

			} else if (key < 48 || key > 90) {
				/*
				 * not the characters we expect(space, del and backspace to be
				 * cancelled)
				 */
				if (key !== 32 && key !== 46 && key !== 8
						&& (key < 96 || key > 111)) {
					/*
					 * well, 32 is space, 46 is del, and 96-111 is numeric pad
					 */
					return;
				}
			} else
				this.matchARow(String.fromCharCode(key));
		}

		/*
		 * we do not want the character to show-up on the field. We are managing
		 * that.
		 */
		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
	},

	/**
	 * @method moveUpDown ove cursor on the list
	 * @param {boolean}
	 *            up true if it is up, false if it has to move down
	 * @param {boolean}
	 *            shift whether shift key is pressed. In that case it is treated
	 *            as scroll up/down
	 * @returns none
	 */
	moveUpDown : function(up, shift) {
		this.val = null;
		if (shift) {
			this.scroll(up);
			return;
		}
		if (!this.curRow) {
			this.select(null, 0); // let start
		}
		var row;
		if (up) {
			row = (this.curRow && this.curRow.previousSibling)
					|| this.div.lastChild;
		} else {
			row = (this.curRow && this.curRow.nextSibling)
					|| this.div.firstChild;
		}
		this.select(row);

		return;
	},

	/**
	 * @method matchARow find a row that matches what user has typed so far
	 * @param {string}
	 *            val what is typed now
	 * @returns none
	 */
	matchARow : function(val) {
		var row;
		if (this.val) { // continuous typing
			if (this.wrongChars)
				return;

			this.val += val;
			row = this.curRow;
		} else {
			this.wrongChars = false;
			if (val == ' ') // at this time, I am unable to see why space is
				// accepted. Hence trapping right here
				return;
			this.val = val;
			row = this.curRow && this.curRow.nextSibling;
		}
		if (!row) {// start from current row, or from the beginning
			row = this.div.firstChild;
		}
		var idx = +row.getAttribute('idx');

		var i = idx;
		while (true) {// look for break.. see if a row exists for all chars.
			if (i && i >= this.vList.length) {
				alert(i + ' points outside the array of length '
						+ this.ucasedValues.length);
				return;
			}
			var v = this.ucasedValues[i];
			if (!v) {
				v = this.vList[i] && this.vList[i][this.colIdx];
				if (v) {
					if (!v.toUpperCase)
						v = new String(v);
					this.ucasedValues[i] = v = v.toUpperCase();
				} else {
					alert('For i = ' + i + ' and colIdx ' + this.colIdx
							+ ' we did not get a value.\n' + this.vList);
					return;
				}
			}
			if (v.indexOf(this.val) == 0) { // indeed started with the typed
				// chars.
				this.select(row);
				break;
			}
			row = row.nextSibling;
			i++;
			if (!row) {// loop back
				row = this.div.firstChild;
				i = 0;
			}
			if (i === idx) { // reached back. No luck
				this.wrongChars = true; // small optimization. Any more typing
				// is
				// ignored..
				break;
			}
		}
		if (this.timer) {
			this.timer.stop();
			this.timer = null;
		}
		// if user pauses, current selection aborts..
		this.timer = new TimeBomb(this, 'resetValue', null, 500, this.win);
	},

	// user has paused typing. Assume end of typing to select a row
	/**
	 * @method resetValue - user has paused typing. Cancel what has been typed
	 *         so far
	 */
	resetValue : function() {
		this.val = null;
		this.wrongChars = false;
	},

	// row is the dom <div> element. idx is the index of the seletced row.
	/**
	 * @method select select a row that user clicked on
	 * @param {DomElement}
	 *            row that user clicked. null if the row selection is based on
	 *            index
	 * @param {integer}
	 *            idx row number to be selected. used only if row is null
	 */
	select : function(row, idx) {
		if (row) {
			idx = parseInt(row.getAttribute('idx'), 10);
		} else if (idx || idx == 0) {
			row = this.div.childNodes[idx];
		}
		if (this.curRow) {
			this.curRow.className = '';
		}
		if (row) {
			row.className = 'selected';
			this.curRow = row;
			this.displayValue = this.ele.value = this.vList[idx][this.colIdx];
			this.ele.internalValue = this.vList[idx][0];
		} else {
			this.curRow = null;
		}
		// We need to select and focus so that the carrot is not visisble...
		this.ele.focus();
		if (this.ele.select) {
			this.ele.select();
		}
		// is the actual row visible?
		if (!this.isScrolled || !row) {
			return;
		}
		var rowTop = row.offsetTop;
		var scrollTop = this.div.scrollTop;
		if (rowTop < scrollTop) {
			this.div.scrollTop = rowTop;
			return;
		}

		var rowBottom = rowTop + row.clientHeight;
		var scrollBottom = scrollTop + this.div.clientHeight;
		if (rowBottom > scrollBottom) {
			this.div.scrollTop = rowBottom - this.div.clientHeight;
			return;
		}
	},

	// called as an event handler when user clicks on any of the row.
	/**
	 * @method rowCLicked event handler when user clicks on a row
	 * @param {DomEvent}
	 *            e
	 */
	rowClicked : function(e) {
		var row = e.target || e.srcElement;
		if (row.nodeType == 3) {
			row = row.parentNode;
		}
		var idx = parseInt(row.getAttribute('idx'), 10);
		if (!idx && idx != 0) {
			debug('Suprising that there was a click on a dom element with no idx attriute. click ignored');
			return;
		}
		// this click action ends up executing after whtever we do (like
		// focusing to
		// next field et..) spoiling all that.
		// better prevent that.
		if (e.preventDefault)
			e.preventDefault();
		else
			e.returnValue = false;
		this.displayValue = this.ele.value = this.vList[idx][this.colIdx];
		this.ele.internalValue = this.vList[idx][0];
		this.P2.focusNext(this.field, this.ele);
	},

	/**
	 * @method render List of possible values are rendered
	 */
	render : function() {
		// this.vList has the rows to be rendered
		if (this.vList && this.vList.length) {
			this.nbrRows = this.vList.length;
			var s = new Array();
			if (this.colIndexes) {
				s.push('<table><tbody>');
				for ( var i = 0; i < this.nbrRows; i++) {
					var aRow = this.vList[i];
					s.push('<tr>');
					for ( var j = 0; j < this.colIndexes.length; j++) {
						s.push('<td idx="');
						s.push(i);
						s.push('">');
						s.push(htmlEscape(aRow[this.colIndexes]));
						s.push('</td>');
					}
					s.push('</tr>');
				}
				s.push('</tbody></table>');
			} else {
				for ( var i = 0; i < this.nbrRows; i++) {
					var txt = this.vList[i][this.colIdx];
					s.push('<div idx="');
					s.push(i);
					s.push('" ');
					s.push('title=\"');
					s.push(txt);
					s.push('\" >');
					s.push(htmlEscape(txt));
					s.push('</div>');
				}
			}
			// page designer would have asked for specific css
			if (this.field.suggestionCss)
				this.div.className = this.field.suggestionCss;
			this.div.innerHTML = s.join('');
		} else {
			this.nbrRows = 0;
			this.div.innerHTML = 'No valid options.';
		}
		this.div.style.display = '';

		if (this.div.scrollHeight > this.div.clientHeight)
			this.isScrolled = true;
		else
			this.isScrolled = false;
	},

	/**
	 * @method scroll scroll the list up/down
	 * @param {boolen}
	 *            up true for scroll-up, false for scroll-down
	 */
	scroll : function(up) {
		if (!this.isScrolled) {
			return;
		}
		var n;
		if (up) {
			if (!this.div.scrollTop) {
				/*
				 * scroll-top is zero means we can not go up any further
				 */
				return;
			}
			n = this.div.scrollTop - this.div.clientHeight;
			if (n < 0)
				n = 0;
		} else {
			n = this.div.scrollTop + this.div.clientHeight;
			if (n > this.div.scrollHeight) // can't go any lower than this
				return;
		}
		this.div.scrollTop = n;
	},

	/**
	 * @method restart list of valid values is received when this assistant is
	 *         active
	 * @param {array}
	 *            vList list of valid values
	 */
	restart : function(vList) {
		this.start(this.field, this.ele, vList, true);
	}
};/**
 * @class SuggestionAssistant provides suggestions based on what the user has
 *        typed. This works in conjunction with server that supplies valid value
 *        lists
 * 
 */
var SuggestionAssistant = function(p2) {
	this.P2 = p2;

	/* create the assistant container, only once for a page */
	if (!p2.listDiv)
		p2.listDiv = this.createListDiv(p2.doc);

	this.div = p2.listDiv;
};

SuggestionAssistant.prototype = {
	createListDiv : ListAssistant.prototype.createListDiv,
	position : ListAssistant.prototype.position,
	scroll : ListAssistant.prototype.scroll,
	/**
	 * start this assistant
	 * 
	 * @param field
	 *            for which this assistant is working for
	 * @param ele
	 *            dom element being assisted
	 */
	start : function(field, ele) {
		this.field = field;
		this.ele = ele;
		this.oldValue = ele.value;
		this.minChars = field.suggestAfterMinChars;
		this.matchStartingChars = field.matchStartingChars;

		this.suggestions = {};
		this.lastToken = null;
		this.position();
		this.div.setAttribute(AssistedInputField.ATTR, 'waiting'
				+ this.minChars);
		this.div.style.display = '';
		this.listener = this.P2.addListener(ele, 'keyup', this, 'keyPressed');
		// is there some character already ?
		if (ele.value) {
			this.filter();
		}
	},

	/**
	 * end this assistance session
	 * 
	 * @param field
	 *            for which this session was meant for
	 * @param ele
	 *            dom element that is assisted
	 */
	end : function(field, ele) {
		// debug('Suggestion assistance done. Bye..');
		this.P2.removeListener(this.listener);
		this.div.style.display = 'none';
	},

	/**
	 * @method keyPressed called as an event handler when user presses any key
	 *         on this field process escape and up/down keys as special case.
	 *         trigger filter() otherwise
	 * @param e
	 *            event
	 */
	keyPressed : function(e) {
		if (e) {
			var key = e.keyCode;
			if (key === 27) {
				this.ele.value = this.oldValue;
				this.P2.focusNext(this.field, this.ele);
				return;
			}
			if (key === 38 || key === 40) // 38 is up and 40 is down
			{
				this.move(key === 38, e.shiftKey);
				if (e.preventDefault) {
					e.preventDefault();
				} else {
					e.returnValue = false;
				}
				return;
			}
		}
		/*
		 * we queue the filter process for other events to complete bore
		 * filtering
		 */
		this.timer = new TimeBomb(this, 'filter', null, 0, this.win);
		return;
	},

	/**
	 * filter the suggestion list far additional chars that are typed
	 */
	filter : function() {
		/*
		 * with a maze of event triggers, I want to play it safe!!!!
		 */
		if (!this.ele) {
			debug('filter triggered but ele is null!!. possible bug with the implemented event model.');
			return;
		}

		var val = trim(this.ele.value);
		if (!val || val.length < this.minChars) {
			/*
			 * not yet ready to suggest, or user has back spaced
			 */

			this.clear();
			this.div.setAttribute(AssistedInputField.ATTR, 'waiting'
					+ this.minChars);
			return;
		}

		/*
		 * filtering is not case sensitive
		 */
		var token = val.substr(0, this.minChars).toUpperCase();
		var suggestion = this.suggestions[token];
		if (!suggestion) {
			/*
			 * we do not have the suggested values for this token. Ask field to
			 * get suggestions. a call back will be made to
			 */
			this.suggestions[token] = 'fetching';
			this.field.getSuggestions(this.ele, token);
			this.clear();
			this.div.setAttribute(AssistedInputField.ATTR, 'fetching');
			return;
		}

		if (suggestion == 'fetching') {
			/*
			 * more typing while suggestions for the corresponding token is
			 * underway...
			 */
			return;
		}
		/*
		 * if this is a different token, we have to render the list first
		 */
		if (this.lastToken != token) {
			this.lastToken = token;
			this.vList = suggestion.list;
			this.uCasedValues = suggestion.uList;
			this.colIdx = suggestion.idx;
			this.render();
		}

		/*
		 * Ok. right list is rendered. we have to show only matched rows from
		 * there
		 */
		this.hideAndShow(val);
		/*
		 * what if all rows are hidden?
		 */
		this.div.setAttribute(AssistedInputField.ATTR,
				(this.nbrActiveRows ? 'active' : 'noMatch'));
	},

	/**
	 * value list has arrived for this element
	 * 
	 * @param ele
	 *            dom element being assisted
	 * @param token
	 *            for which suggestions are received
	 * @param arr
	 *            suggestions received from server
	 */
	setSuggestions : function(ele, token, arr) {
		if (ele != this.ele) {
			debug(' List recd too late.');
			return;
		}
		/*
		 * if we get two columns, we use second column. idx holds this value
		 */
		var idx = 0;
		/*
		 * upper cased values that are to be matched against what user types
		 */
		var uCasedArr = [];
		if (arr && arr.length > 1) {
			if (arr[0].length > 1) {
				idx = 1;
			}
			for ( var i = 1; i < arr.length; i++) {
				uCasedArr.push(arr[i][idx].toUpperCase());
				/*
				 * we remove the header row by shift all other rows
				 */
				arr[i - 1] = arr[i];
			}
			arr.length--;
		} else {
			// no suggestions for this token
			arr = [];
		}

		var suggestion = {};
		suggestion.list = arr;
		suggestion.idx = idx;
		suggestion.uList = uCasedArr;
		this.suggestions[token] = suggestion;

		/*
		 * If the current value of ele is waiting for this list, we should
		 * render
		 */
		if (ele.value && ele.value.toUpperCase().indexOf(token) == 0) {
			this.filter(true);
		} else {
			debug('list stored for token ' + token + ' with ' + arr.length
					+ ' values');
		}
	},
	/**
	 * render suggestions. return an innerHTML for div element
	 * 
	 * @returns html text
	 */
	render : function() {
		this.curRow = null;
		if (this.vList) {
			this.nbrRows = this.vList.length;
		} else {
			this.nbrRows = 0;
		}
		this.nbrActiveRows = this.nbrRows;

		if (!this.nbrRows) {
			this.div.innerHTML = 'No Sugegstions..';
			this.div.setAttribute(AssistedInputField.ATTR, 'noMatch');
		} else {
			var s = new Array();
			for ( var i = 0; i < this.nbrRows; i++) {
				var txt = this.vList[i][this.colIdx];
				s.push('<div idx="');
				s.push(i);
				s.push('" title=\"');
				s.push(txt);
				s.push('\" >');
				s.push(htmlEscape(txt));
				s.push('</div>');
			}
			this.div.innerHTML = s.join('');
			if (this.div.scrollHeight > this.div.clientHeight) {
				this.isScrolled = true;
			} else {
				this.isScrolled = false;
			}
		}
		this.div.style.display = '';
		this.div.setAttribute(AssistedInputField.ATTR, 'active');
	},

	/**
	 * clean up whatever we had cached for last list, and get ready to get new
	 * list
	 */
	clear : function() {
		if (!this.nbrRows) {
			return;
		}
		this.lastValue = null;
		this.div.innerHTML = '';
	},

	// all suggestions are already rendered. hide/show based on match
	hideAndShow : function(val) {
		val = val.toUpperCase();
		if (val == this.lastValue) {
			return;
		}

		/*
		 * if this value is a character or more than what was used earlier, we
		 * know that hidden rows have no chance of getting displayed.
		 */
		var toOptimize = false;
		if (this.lastValue && val.indexOf(this.lastValue) == 0) {
			toOptimize = true;
		}
		this.lastValue = val;
		var row = this.div.firstChild;
		this.nbrActiveRows = 0;
		/*
		 * I am using a for loop to get values, but dom element row uses
		 * .nextSibling().
		 */
		for ( var i = 0; i < this.nbrRows; i++) {
			if (!row) {
				this.nbrRows = i;
				break;
			}
			if (!row.style) {
				row = row.nextSibling;
			}
			if (toOptimize && row.style.display) {
				/*
				 * hidden ones will continue to be hidden
				 */
			}
			row = row.nextSibling;
			continue;
		}

		var match = this.uCasedValues[i].indexOf(val);
		/*
		 * reads slightly complex. if val is non-empty and it does not match as
		 * per need (no-match or not-starting)
		 */
		if (val && (this.matchStartingChars ? match != 0 : match < 0)) {
			row.style.display = 'none';
		} else {
			row.style.display = '';
			this.nbrActiveRows++;
		}
		row = row.nextSibling;

		/*
		 * user had used the arrow key to go thru the list, strip it of its
		 * selection status
		 */
		if (this.curRow) {
			this.curRow.className = '';
			this.curRow = null;
		}
	},

	/**
	 * move cursor focus
	 * 
	 * @param up
	 *            boolean to indicate whether we are to move up.
	 * @param shift
	 *            boolean to indicate whether we are to scroll by page rather
	 *            than just by a row
	 */
	move : function(up, shift) {
		this.val = null;
		if (shift) {
			this.scroll(up);
			return;
		}
		if (!this.curRow) {
			this.select(null, 0); // let us start
		}
		var row = up ? this.getPreviousRow(this.curRow) : this
				.getNextRow(this.curRow);
		this.select(row);
		return;
	},
	/**
	 * get next row
	 * 
	 * @returns row next to the current row. If current row is the last one, we
	 *          wrap to first row
	 */
	getNextRow : function() {
		var row = this.curRow;
		var isLooping = false;
		while (true) {
			if (!row) {
				if (isLooping)
					return null;
				row = this.div.firstChild;
				isLooping = true;
			} else {
				row = row.nextSibling;
				/*
				 * beware of #text elements creeping-in
				 */
				if (!row.style)
					row = row.nextSibling;
			}
			if (row && !row.style.display) {
				// style.display == '' implies shown
				return row;
			}
		}
	},
	/**
	 * get previous row from the current row
	 * 
	 * @returns row that is next to the current row. If current row is the first
	 *          one, we wrap back to last row
	 */
	getPrevRow : function() {
		var row = this.curRow;
		var isLooping = false;
		while (true) {
			if (!row) {
				if (isLooping) {
					return null;
				}
				row = this.div.lastChild;
				isLooping = true;
			} else {
				row = row.previousSibling;
				/*
				 * beware of #text elements inserted by browser
				 */
				if (!row.style) {
					row = row.previousSibling;
				}
			}
			if (row && !row.style.display) {
				// style.display == '' implies shown
				return row;
			}
		}
	},

	/**
	 * select a row, as if user navigated to that
	 * 
	 * @param row
	 *            dom element row. If null, idx is used
	 * @param idx
	 *            row index ignored if row is specified
	 */
	select : function(row, idx) {
		if (row)
			idx = parseInt(row.getAttribute('idx'), 10);
		else if (idx || idx == 0)
			row = this.div.childNodes[idx];

		if (this.curRow)
			this.curRow.className = '';

		if (row) {
			row.className = 'selected';
			this.curRow = row;
			this.displayValue = this.ele.value = this.vList[idx][this.colIdx];
		} else {
			this.curRow = null;
		}
		if (!this.isScrolled || !row) {
			return;
		}
		/*
		 * we have to scroll to ensure that the selected row is in view
		 */
		var n = row.offsetTop;
		if (n < this.div.scrollTop) {
			/*
			 * this row is scrolled-up. That is it is above visible rows
			 */
			this.div.scrollTop = n; // bring current row to top
			return;
		}
		// row is somewhere below the top visible row
		row = this.getNextRow(row);
		if (row) {
			if (n > (this.div.scrollTop + this.div.clientHeight)) {
				/*
				 * next row is below the last visible row. Scroll just enough
				 * for the top of this to be visible. That way, our row WILL be
				 * visible
				 */
				this.div.scrollTop = n - this.div.clientHeight;
			}
		} else {
			// our row was the last row. scroll to the last page.
			this.div.scrollTop = this.div.scrollHeight - this.div.clientHeight;
		}
	},
	/**
	 * @method rowCLicked event handler when user clicks on a row. The row gets
	 *         selected, and we prevent the default action browser would take
	 * @param e
	 */
	rowClicked : function(e) {
		var row = e.target || e.srcElement;
		if (row.nodeType == 3) {
			row = row.parentNode;
		}
		var idx = parseInt(row.getAttribute('idx'), 10);
		if (!idx && idx != 0) {
			debug('Suprising that there was a click on a dom element with no idx attriute. click ignored');
			return;
		}
		/*
		 * this click action ends up executing after whatever we do (like
		 * focusing to next field et..) spoiling all that. better prevent that.
		 */
		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
		this.displayValue = this.ele.value = this.vList[idx][this.colIdx];
		this.P2.focusNext(this.field, this.ele);
	}
};
/**
 * @module this is the refined version of ChartField that is re-structured to
 *         implement drivers for actual plotting. charts are abstracted, and an
 *         interface is opened for us to use different plotting libraries. We
 *         have used PLOTR, and high-chart. Driver is still work-in progress and
 *         needs some actual projects to use and test thoroughly
 */

/**
 * @class extends ChartField as a base class for specific charts
 * @note Due to historic reason, we have issue with naming convention of
 *       attribute names. Several of them are all lower-case, which is against
 *       our standard of camel-case.
 */
var ChartField = function() {
	AbstractField.call(this);
	this.chartType = 'DEFAULT';
	this.showLegends = true;
	this.yaxislabelformatterid = null;
	this.colors = [ '#1D7CDC', '#0A233B', '#89BD00', '#950300', '#00ACD0',
			'#492873', '#F69035', '#72A0E9', '#C9271E' ];
	this.xaxiscolumn = null;
	this.yaxiscolumn = null;
	this.isMultiDataSet = false;
	this.groupbycolumn = null;
};

ChartField.prototype = new AbstractField;
/**
 * Flexibility for programmers to set the legend area
 * 
 * @param legend
 *            object with various attributes of legend.
 * @refer LEGEND_OPTIONS
 */
ChartField.prototype.setLegend = function(legend) {
	this.legend = legend;
};

/**
 * get current legend options
 * 
 * @returns object with attributes for setting legend options
 * @refer LEGEND_OPTIONS
 */
ChartField.prototype.getLegend = function() {
	return this.legend;
};

/**
 * this is a standard interface of AbstractField. To be implemented by actual
 * chart field
 * 
 * @param ele
 *            dom element where chart is to be drawn
 * @param val
 *            value to be set.
 */
ChartField.prototype.setValueToObject = function(ele, val) {
	//
};

/**
 * Controller (P2) uses this interface to render data
 * 
 * @param grid
 *            as received from the server
 */
ChartField.prototype.fillReport = function(grid) {
	this.setGrid(grid);
};
/**
 * this is the way to draw the chart
 * 
 * @param grid
 *            as received from the server
 */
ChartField.prototype.setGrid = function(grid) {
	this.value = grid;
	var win = this.P2.win;
	var ele = win.document.getElementById(this.name);
	if (!ele) {
		debug('Design Error: No dom element found with name ' + this.name
				+ ' for chart field, and hence no chart is drawn.');
		return;
	}
	if (!grid || grid.length < 2) // let us just clean-up
	{
		ele.innerHTML = '';
		ele.setAttribute('data-noData', 'data-noData');
		debug('No data for for chart ' + this.name);
		return;
	}

	ele.removeAttribute('data-noData');

	var options = this.getOptions();
	var dataSeries = this.getDataSeries(grid, options);
	if (!this.eventsAssigned) // first time
	{
		var onClickFn = null;
		var onMoveFn = null;
		if (this.onClickFunctionName) {
			onClickFn = this.P2.win[this.onClickFunctionName];
			if (!onClickFn || typeof (onClickFn) != 'function') {
				debug('Onclick function ' + this.onClickFunctionName
						+ ' is not defined in user page');
			} else
				this.mouseClicked = onClickFn;
		}

		if (this.onMoveFunctionName) {
			onMoveFn = this.P2.win[this.onMoveFunctionName];
			if (!onMoveFn || typeof (onMoveFn) != 'function') {
				debug('onMoveFunctionName ' + this.onMoveFunctionName
						+ ' is not defined in user page');
			} else
				this.mouseMoved = onMoveFn;
		}
		this.eventsAssigned = true;
	}

	this.drawChart(dataSeries, options);
};

/**
 * this method is over-ridden and implemented in the driver
 * 
 * @param dataSeries
 * @param options
 */
ChartField.prototype.drawChart = function(dataSeries, options) {
	alert("Index page for this project has not loaded chart driver. Chart will not be showing-up.");
};

// all chart options are attributes of the object that is returned
ChartField.prototype.getOptions = function() {
	var options = {};

	if (this.rawDataDisplay && this.rawDataDisplay != 'none')
		options.rawDataDisplay = this.rawDataDisplay;

	if (this.colors) {
		if (this.colors.split) {
			// it is a string set by page designer
			options.colors = this.colors.split(',');
		} else {
			options.colors = this.colors;
		}
	}

	if (this.labelColor) {
		options.labelColor = this.labelColor;
	}
	options.legend = this.getLegendOptions();

	// allow specific chart to add its own options
	if (this.addSpecialOptions)
		this.addSpecialOptions(options);

	return options;
};

/**
 * this must be implemented by specific chart
 * 
 * @param grid
 *            data as received from server
 * @param options
 *            object that has chart options as attributes
 */
ChartField.prototype.getDataSeries = function(grid, options) {
	debug('Design error: getDataSeries is not implemented for chart field '
			+ this.name);
};
/**
 * standardized legend options. maps Exility attribute names to legend
 * attributes. We has used flotr as the charting library. we haev standardized
 * on the attribute names used by flotr. Drivers should translate these to
 * desired form
 */
ChartField.LEGEND_OPTIONS = {
	legendNbrColumns : 'noColumns',
	legendLabelFormatter : 'labelFormatter',
	legendLabelBoxBorderColor : 'labelBoxBorderColor',
	legendPosition : 'position',
	legendContainer : 'container',
	legendMargin : 'margin',
	legendBackgroundColor : 'backgroundColor',
	legendBackgroundOpacity : 'backgroundOpacity',
	legendHighlight : 'legendHighlight'
};

/**
 * pick legend attributes from field into standard legend object
 * 
 * @returns an object wit standard legend options
 * @refer LEGEND_OPTIONS
 */
ChartField.prototype.getLegendOptions = function() {
	var legend = {
		show : true
	};
	for ( var opt in ChartField.LEGEND_OPTIONS) {
		var val = this[opt];
		if (val) {
			legend[ChartField.LEGEND_OPTIONS[opt]] = val;
		}
	}

	if (legend.labelFormatter) // this needs to be a function
	{
		var fn = this.P2.win[legend.labelFormatter];
		if (fn) {
			legend.labelFormatter = fn;
		} else {
			debug(legend.labelFormatter
					+ ' is specified as a formatter, but a function with that name is not defined for this page.');
			delete legend.labelFormatter;
		}
	}

	return legend;
};

/**
 * get data of the form [[x1,y1],[x2,y2].......] from a grid of the form
 * [[headerRow][row1].....] where row is an array of data that includes teh
 * columns for x and y
 * 
 * @param grid
 *            data as received from server
 * @returns Array in the desired format
 */
ChartField.prototype.getXYSeries = function(grid) {
	var series = [];
	/*
	 * find x, y and group column names
	 */
	var header = grid[0];
	if (header.length < 2) // obviously not enough data
	{
		debug('Data for chart ' + this.name + ' has less than two columns');
		return series;
	}
	/*
	 * 0th column is x and 1st is y by default
	 */
	var xIdx = 0;
	var yIdx = 1;
	var hIdx = null; // helpText
	/*
	 * get them if field has specifically set them
	 */
	if (this.xaxiscolumn || this.yaxiscolumn || this.helpTextColumn) {
		for ( var i = 0; i < header.length; i++) {
			var colName = header[i];
			if (colName == this.xaxiscolumn) {
				xIdx = i;
			} else if (colName == this.yaxiscolumn) {
				yIdx = i;

			} else if (colName == this.helpTextColumn) {
				hIdx = i;
			}
		}
	}

	this.helpTexts = (hIdx == null) ? null : [];
	for ( var i = 1; i < grid.length; i++) {
		var row = grid[i];
		series.push([ row[xIdx], row[yIdx] ]);
		if (hIdx != null)
			this.helpTexts.push(row[hIdx]);
	}
	return series;
};

/**
 * Common method used by specific chart fields to convert input data grid into
 * the right format for the driver
 * 
 * @param grid -
 *            input data grid
 * @param columnNames
 *            to be extracted into output grid, in that order
 * @returns grid with columns in the right order
 */
ChartField.prototype.getColumnData = function(grid, columnNames) {
	var win = this.P2.win;
	var series = new win.Array();
	var origNbrCols = columnNames.length;
	/*
	 * find x, y and group column names
	 */
	var header = grid[0];
	if (this.helpTextColumn) {
		columnNames.push(this.helpTextColumn);
	}
	if (this.groupHelpTextColumn) {
		columnNames.push(this.groupHelpTextColumn);
	}
	var nbrCols = columnNames.length;
	var indexes = [];
	for ( var j = 0; j < nbrCols; j++) {
		indexes[j] = j; // default is that they are in that order
		var colName = columnNames[j];
		if (!colName) {
			continue;
		}
		var idx = null;
		for ( var i = 0; i < header.length; i++) {
			if (colName == header[i]) {
				idx = i;
				break;
			}
		}
		if (idx == null) {
			debug('Column '
					+ colName
					+ ' is not found in data for chart '
					+ this.name
					+ '. Default column is used, and the chart may not render properly');
		} else {
			indexes[j] = idx;
		}
	}

	/*
	 * help column
	 */
	var hIdx = null;
	/*
	 * group help column
	 */
	var ghIdx = null;
	this.helpTexts = null;
	if (this.helpTextColumn) {
		hIdx = indexes[origNbrCols];
		this.helpTexts = [];
		if (this.groupHelpTextColumn) {
			ghIdx = indexes[origNbrCols + 1];
		}
	}

	for ( var i = 1; i < grid.length; i++) {
		var row = grid[i];
		var newRow = new win.Array();
		for ( var j = 0; j < nbrCols; j++) {
			newRow.push(row[indexes[j]]);
		}
		series.push(newRow);
		if (this.helpTexts) {
			/*
			 * group and help texts. We also assume that group help is provided
			 * only if help is provided
			 */
			if (ghIdx) {
				this.helpTexts.push([ row[hIdx], row[ghIdx] ]);
			} else {
				this.helpTexts.push(row[hIdx]);
			}
		}
	}
	return series;
};

/**
 * @class PieChart
 */
var PieChart = function() {
	ChartField.call(this);
	this.chartType = 'PIE';
};

PieChart.prototype = new ChartField;

/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param options
 *            options object
 * @returns column data in the form that the common charting driver expects
 */
PieChart.prototype.getDataSeries = function(grid, options) {
	return this.getColumnData(grid, [ this.xaxiscolumn, this.yaxiscolumn ]);
};

/**
 * ******************************Bar Chart and stacked bar
 * chart**************************
 */
var BarChart = function() {
	ChartField.call(this);
	this.chartType = 'BAR';
	this.direction = 'vertical';
	this.stacking = false;
};
/**
 * Inherit from ChartField. i.e Add ChartField() to __proto__ property in
 * BarChart, then we can access ChartField() using "this" in constructor
 * BarChart().
 */
BarChart.prototype = new ChartField;

/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param options
 *            options object
 * @returns column data in the form that the common charting driver expects
 */
BarChart.prototype.getDataSeries = function(grid, options) {
	var columnNames = [];

	if (this.isMultiDataSet)
		columnNames = [ this.xaxiscolumn, this.yaxiscolumn, this.groupbycolumn ];
	else
		columnNames = [ this.xaxiscolumn, this.yaxiscolumn ];

	if (this.direction == 'horizontal')
		columnNames.swapItemsByIndex(0, 1);

	return this.getColumnData(grid, columnNames);
};

Array.prototype.swapItemsByIndex = function(x, y) {
	this[x] = this.splice(y, 1, this[x])[0];
	/*
	 * following declaration is only to avoid eclipse marking a warning about
	 * type mismatch. we are just returning 'this';
	 */
	var valueToReturn;
	valueToReturn = this;
	return valueToReturn;
};

/** ******************************Line Chart************************** */
var LineChart = function() {
	ChartField.call(this);
	this.type = 'LINE';
};

/**
 * Inherit from ChartField i.e Add ChartField() to __proto__ property in
 * LineChart, then we can access ChartField() using "this" in constructor
 * LineChart().
 */
LineChart.prototype = new ChartField;

/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param options
 *            options object
 * @returns column data in the form that the common charting driver expects
 */
LineChart.prototype.getDataSeries = function(grid, options) {
	var columnNames = [];

	if (this.isMultiDataSet)
		columnNames = [ this.xaxiscolumn, this.yaxiscolumn, this.groupbycolumn ];
	else
		columnNames = [ this.xaxiscolumn, this.yaxiscolumn ];

	return this.getColumnData(grid, columnNames);
};

/**
 * @class BulletChart
 */
var BulletChart = function() {
	ChartField.call(this);
	this.type = 'BULLET';
	this.colors = [ '#3F81B7', '#000000', '#CCCCCC', '#EEEEEE' ];
};

BulletChart.prototype = new ChartField;

/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param options
 *            options object
 * @returns column data in the form that the common charting driver expects
 */
BulletChart.prototype.getDataSeries = function(grid, options) {
	var columnNames = [ this.valueOfInterest, this.comparativeValue,
			this.firstQualitativeRange, this.secondQualitativeRange,
			this.bulletlabelcolumn ];
	return this.getColumnData(grid, columnNames);
};

/**
 * @class SunBurstChart
 */
var SunBurstChart = function() {
	ChartField.call(this);
	this.type = 'SUNBURST';
	/*
	 * Column that has the data (value). if omitted, use first (0th column).
	 */
	this.distributionvaluecolumn = null;
	/*
	 * Column that has the label at the detail level. if omitted, defaults to
	 * second column.
	 */
	this.level2column = null;
	/*
	 * column that has the label for the group. defaults to third column
	 */
	this.level1column = null;
	/*
	 * title for the chart. Assumed that this is same for all columns. Last row
	 * is used. Defaults to 4th coulmn.
	 */
	this.corecolumn = null;
	this.helpTextColumn = null;
	this.groupHelpTextColumn = null;
};

SunBurstChart.prototype = new ChartField;

/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param ele
 *            dom element inside which chart is to be drawn
 * @returns column data in the form that the common charting driver expects
 */
SunBurstChart.prototype.getDataSeries = function(grid, ele) {
	var columnNames = [ this.distributionvaluecolumn, this.level2column,
			this.level1column, this.corecolumn ];
	return this.getColumnData(grid, columnNames);
};
/**
 * @class SankeyChart
 */
var SankeyChart = function() {
	ChartField.call(this);
	this.type = 'SANKEY';
	/*
	 * Column that has the data (value). if omitted, use first (0th column).
	 */
	this.distributionvaluecolumn = null;
	/*
	 * Column that has the label for left side. defaults to second column.
	 */
	this.fromcolumn = null;
	/*
	 * column that has the label for the right side defaults to third column
	 */
	this.tocolumn = null;
	/*
	 * color to be used for highlighting charts for clicked bar
	 */
	this.highlightColor = null;
};

SankeyChart.prototype = new ChartField;
/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param ele
 *            dom element inside which chart is to be drawn
 * @returns column data in the form that the common charting driver expects
 */
SankeyChart.prototype.getDataSeries = function(grid, ele) {
	var columnNames = [ this.distributionvaluecolumn, this.fromcolumn,
			this.tocolumn ];
	return this.getColumnData(grid, columnNames);
};
/**
 * @class SpeedometerChart
 */
var SpeedometerChart = function() {
	ChartField.call(this);
	this.type = 'SPEEDOMETER';
	/*
	 * Column that has the data (value). if omitted, use first (0th column).
	 */
	this.distributionvaluecolumn = null;
	/*
	 * Column that has the label for left side. defaults to second column.
	 */
	this.fromcolumn = null;
	/*
	 * column that has the label for the right side defaults to third column
	 */
	this.tocolumn = null;
	/*
	 * color to be used for highlighting charts for clicked bar
	 */
	this.highlightColor = null;
};

SpeedometerChart.prototype = new ChartField;
/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param options
 *            options object
 * @returns column data in the form that the common charting driver expects
 */
SpeedometerChart.prototype.getDataSeries = function(grid, options) {
	var columnNames = [ this.xaxiscolumn, this.yaxiscolumn ];
	return this.getColumnData(grid, columnNames);
};
/**
 * @module fields that are not commonly used are put in this file
 */

/**
 * @class ImageField A convenient way to change the src attribute of an image
 *        field at runtime based on the value of a field.
 */
var ImageField = function() {
	AbstractField.call(this);
	/*
	 * final image src is assumed to be baseSrc + <run time value in name> +
	 * imageExtension
	 */
	this.baseSrc = null;
	this.imageExtension = null;
};

ImageField.prototype = new AbstractField;

/**
 * standard field method. This is a theoretical one, and we do not expect the
 * field to be editable..
 * 
 * @param ele
 *            dom element
 * @returns value of this field from its dom element
 */
ImageField.prototype.getValueFromObject = function(ele) {
	var n1 = this.baseSrc.length;
	var s = ele.src;
	var n2 = s.length;
	if (this.imageExtension) {
		n2 = this.baseSrc.indexOf(this.imageExtension);
	}
	s = s.substring(n1, n2);
	debug('src was ' + ele.src + '. I returned ' + s + ' as its value');
	return s;
};

/**
 * change src of the dom element based on the value
 * 
 * @param ele
 *            dom element
 * @param val
 *            value to be set
 */
ImageField.prototype.setValueToObject = function(ele, val) {
	var src = this.baseSrc || '';
	var ext = this.imageExtension || '';
	ele.src = src + val + ext;
};

/**
 * @class StyleField This field is used to use the run-time value of the field
 *        to style a div element. attribute "data-style" is set to the value of
 *        the field. In the style sheet, designer can set style based on this
 *        attribute value as part of selector.
 */
var StyleField = function() {
	AbstractField.call(this);
	/*
	 * if value is not set, use this default
	 */
	this.defaultCss = this.name;
};

StyleField.prototype = new AbstractField;

/**
 * we use styleValue as attribute to save value
 * 
 * @param ele
 *            dom element from which to get the value
 * @returns value from dom element
 */
StyleField.prototype.getValueFromObject = function(ele) {
	return ele.getAttribute("data-style");
	if (val) {
		return val;
	}
	return '';
};

/**
 * set value to dom element
 * 
 * @param ele
 *            dom element to which value is to be set
 * @param val
 *            value to be set
 */
StyleField.prototype.setValueToObject = function(ele, val) {
	ele.setAttribute('data-style', val);
};

/**
 * @class CheckBoxGroup is an alternate to multiple-selection drop-down. It is a
 *        view component for a data element that is a value-list.
 */
var CheckBoxGroupField = function() {
	AbstractInputField.call(this);
};

CheckBoxGroupField.prototype = new AbstractInputField;

/**
 * gets value as a comma separated list of selected key values
 * 
 * @returns {String} comma separated list of selected values
 */
CheckBoxGroupField.prototype.getValue = function() {
	var val = '';
	var isFirst = true;
	for ( var key in this.checkedKeys) {
		if (this.checkedKeys[key]) {
			if (isFirst) {
				val = key;
				isFirst = null;
			} else {
				val += ',' + key;
			}
		}
	}
	return val;
};

/**
 * setValue when value is grid. Grid is assumed to have a header row; First
 * column is assumed to be the list of keys to be selected
 * 
 * @param grid
 *            data
 */
CheckBoxGroupField.prototype.setGrid = function(grid) {
	var keysToCheck = {};
	this.columnName = grid[0][0]; // over ride what is given at design time
	var n = grid.length;
	if (n > 1) {
		for ( var i = 1; i < n; i++) {
			keysToCheck[grid[i][0]] = true;
		}
	}
	this.checkKeys(keysToCheck);
};

/**
 * list is an array of keys to be selected.
 * 
 * @param list
 */
CheckBoxGroupField.prototype.setList = function(list) {
	var n = list.length;
	var keysToCheck = new Object();
	for ( var i = 0; i < n; i++) {
		keysToCheck[list[i]] = true;
	}
	this.checkKeys(keysToCheck);
};

/**
 * value is a comma separated list of keys to be selected.
 * 
 * @param val
 */
CheckBoxGroupField.prototype.setValue = function(val) {
	this.setList(val.split(','));
	this.value = val;
	/**
	 * trigger field changed events. TODO: this is a patch. P2 is to trigger
	 * onChnage etc..
	 */
	if (this.onChangeActionName) {
		this.P2.act(null, this.name, this.onChangeActionName, this.value);
	}

};

/**
 * common internal method to select set of keys
 * 
 * @param keysToCheck
 *            object with attribute names
 */
CheckBoxGroupField.prototype.checkKeys = function(keysToCheck) {
	var doc = this.P2.doc;
	if (this.keyList == null) {
		/*
		 * ooops fields are not there yet. They will get enabled when list
		 * comes..
		 */
		this.checkedKeys = keysToCheck;
		return;
	}
	this.checkedKeys = {};
	/*
	 * this.keyList as an array of all keys that can be selected
	 */
	var n = this.keyList.length;
	for ( var i = 0; i < n; i++) {
		var key = this.keyList[i];
		var ele = doc.getElementById(this.name + '_' + key);
		if (keysToCheck[key]) {
			ele.checked = true;
			this.checkedKeys[key] = true;
		} else {
			ele.checked = false;
		}
	}
	return;
};

/**
 * called before sending dc to server. put value, list or grid into dc based on
 * the requirement
 * 
 * @param dc
 */
CheckBoxGroupField.prototype.fillDc = function(dc) {
	if (!this.keyList) {
		this.buildKeyList();
	}
	if (!this.selectionValueType || this.selectionValueType == 'text') {
		dc.values[this.name] = this.getValue();
		return;
	}

	/*
	 * grid will have a column with only the selected keys as values
	 */
	if (this.selectionValueType == 'grid') {
		var grid = new Array();
		grid.push([ this.columnName || this.name ]);
		for ( var i = 0; i < this.keyList.length; i++) {
			var key = this.keyList[i];
			if (this.checkedKeys[key])
				grid.push([ key ]);
		}
		dc.grids[this.name] = grid;
		return;
	}

	if (this.selectionValueType == 'list') {
		var list = new Array();
		for ( var key in this.checkedKeys) {
			if (this.checkedKeys[key])
				list.push(key);
		}
		dc.lists[this.name] = list;
		return;
	}
	// default is text
	dc.values[this.name] = this.getValue();
	// this field can not have aliases etc..
	// this.fillDcWithRelatives(dc);
};

/**
 * build key lists based on possible keys and values
 */
CheckBoxGroupField.prototype.buildKeyList = function() {
	this.keyList = [];
	this.checkedKeys = {};
	var boxes = this.P2.doc.getElementById(this.name);
	if (!boxes) {
		debug('Design Error: No dom element found for check box group field '
				+ this.name);
		return;
	}
	boxes = boxes.getElementsByTagName('input');
	debug('Going to check ' + boxes.length + ' check boxes ');
	for ( var i = 0; i < boxes.length; i++) {
		var box = boxes[i];
		var key = box.value;
		this.keyList.push(key);
		this.checkedKeys[key] = box.checked;
	}
};
/**
 * render this field based on values received in the grid
 * 
 * @param grid
 *            as received from server
 * @param ele
 *            dom element
 */
CheckBoxGroupField.prototype.fillList = function(grid, ele) {
	if (!ele)
		ele = this.obj;
	ele.innerHTML = '';
	var oldCheckedKeys = this.checkedKeys;
	this.checkedKeys = {};
	this.keyList = [];
	if (!grid || grid.length <= 1)
		return;

	var n = grid.length;
	var k = [];
	for ( var i = 1; i < n; i++) {
		var row = grid[i];
		var key = row[0];
		this.keyList.push(key);
		var id = this.name + '_' + key;
		/*
		 * we are to create an html of the form
		 * 
		 * <input type="checkbox" id="namae_key" name="name+CheckBox"
		 * value="key" onclick="P2.checkBoxGroupChanged(event, this, 'name');"
		 * onChange="P2.fieldChanged(this,'name');" />
		 */
		k.push('<input type="checkbox" id="');
		k.push(id);
		k.push('" value="');
		k.push(key);
		k.push('" onchange="P2.checkBoxGroupChanged(this, \'');
		k.push(this.name);
		k.push('\');" ');
		if (oldCheckedKeys && oldCheckedKeys[key]) {
			this.checkedKeys[key] = true;
			k.push(' checked="checked"');
		}
		k.push('/><label for="');
		k.push(id);
		k.push('">');
		k.push(row[1] || row[0]); // that is the label
		k.push('</label><br />');
	}
	ele.innerHTML = k.join('');
};

/**
 * called from P2.checkBoxGroupChanged() which, in turn, is triggered on
 * onchange event of any of teh check boxes in the group also called from
 * select(). That is, whenever a user function changes the value
 * 
 * @param ele
 *            dom element
 */
CheckBoxGroupField.prototype.changed = function(ele) {
	if (!this.keyList)
		this.buildKeyList();

	if (this.minSelections || this.maxSelections) {
		var count = 0;
		for ( var k in this.checkedKeys) {
			if (this.checkedKeys[k])
				count++;
		}
		var inError = false;
		if (ele.checked) {
			if (this.maxSelections && count >= this.maxSelections) {
				inError = true;
			}
		} else {
			if (this.minSelections && count <= this.minSelections) {
				inError = true;
			}
		}
		if (inError) {
			// let us reverse selection
			ele.checked = ele.checked ? false : true;
			var msg = '';
			if (this.minSelections)
				msg = ' A minimum of ' + this.minSelections + ' selections ';
			if (this.maxSelections)
				msg = (msg ? msg + ' and a ' : 'A ') + ' maximum of '
						+ this.maxSelections;
			msg += ' selections expected for ' + this.label;
			var err = new ExilityError(msg);
			err.field = this;
			err.obj = ele;
			this.P2.catchError(e);
			return;
		}
	}
	this.checkedKeys[ele.value] = ele.checked;
	this.value = this.getValueFromObject(ele);

	if (this.onChangeActionName) {
		debug('on change triggered for ' + this.name + ' onchange = '
				+ this.onChangeActionName);
		this.P2.act(ele, this.name, this.onChangeActionName, this.value);
	}
};

/**
 * similar to SelectionField to trigger a service to fetch possible values in
 * the group
 * 
 * @param val
 *            value in this ele
 * @param ele
 *            dom element that triggered this
 */
CheckBoxGroupField.prototype.callListService = function(val, ele) {
	var grid = new Array();
	grid.push([ 'serviceId', 'keyValue' ]);
	grid.push([ this.listServiceId, val ]);

	this.P2.callListService(grid, ele, this.name,
			this.listServiceQueryFieldNames, this.listServiceQueryFieldSources);
};
/**
 * enable/disable an option for the supplied key
 * 
 * @param key
 *            internal value of the check box to be enabled or disabled
 * @param toEnable
 *            enable if true. disable otherwise
 */
CheckBoxGroupField.prototype.able = function(key, toEnable) {
	var ele = this.P2.doc.getElementById(this.name + '_' + key);
	if (!ele) {
		debug(this.name
				+ ' does not have "'
				+ key
				+ '" as an option. A user code is seeking to enable/disable this');
		return;
	}
	ele.disabled = !toEnable;
};

/**
 * select/de-select an option for the supplied key
 * 
 * @param key
 *            internal value of the check box to be checked
 * @param toSelect
 *            check if true. uncheck otherwise
 */
CheckBoxGroupField.prototype.select = function(key, toSelect) {
	var ele = this.P2.doc.getElementById(this.name + '_' + key);
	if (!ele) {
		debug(this.name
				+ ' does not have "'
				+ key
				+ '" as an option. A user code is seeking to enable/disable this');
		return;
	}
	ele.checked = toSelect ? true : false;
	// let us play it safe, and call changed()
	this.changed(ele);
};

/**
 * Set value to object.
 * 
 * @param ele
 *            dom element
 * @param val
 *            value to be set
 */
CheckBoxGroupField.prototype.setValueToObject = function(ele, val) {
	if (!ele) {
		debug('Design Error: CheckBoxGroupField.setValueToObject() called with invalid element for field '
				+ this.name);
		return;
	}

	if (!val) {
		ele.checked = false;
		return;
	}

	var uval = val.toUpperCase();
	if (val == ele.value || val == this.checkedValue || val == '1'
			|| uval == 'Y' || uval == 'YES' || uval == "TRUE") {
		ele.checked = true;
		return;
	}

	var vals = val.split('|');
	if (vals.length <= 1) {// possibly separated by ,
		vals = val.split(',');
	}
	if (vals.length <= 1)// not a list of values
	{
		ele.checked = false;
		return;
	}

	// list of values
	var children = ele.getElementsByTagName('input');
	if (!children || !children.length) {
		debug('Design error: CheckBoxGroupField is not rendered properly.');
		return;
	}
	for ( var i = 0; i < children.length; i++) {
		var thisEle = children[i];
		var matchFound = false;
		for ( var j = 0; j < val.length; j++) {
			if (val[j] == thisEle.value) {
				matchFound = true;
				break;
			}
		}
		thisEle.checked = matchFound;
	}
};

/**
 * get value from object
 * 
 * @param ele
 *            one of the chekc-boxes in the group
 * @returns {String} '|' separated list of values based on checked boxes
 */
CheckBoxGroupField.prototype.getValueFromObject = function(ele) {
	var val = '';
	/*
	 * this is a fragile code. We should replace this based on id rather than
	 * this assumption of the dom structure
	 */
	var childs = ele && ele.parentNode && ele.parentNode.childNodes;
	if (!childs || !childs.length)
		return val;

	for ( var i = 0; i < childs.length; i++) {
		var ele = childs[i];
		if (ele.type && ele.type.toUpperCase() == "CHECKBOX" && ele.checked) {
			if (val == '') {
				val = ele.value;
			} else {
				val += "|" + ele.value;
			}
		}
	}
	return val;
};

/**
 * @class ShadeOutputField a view component whse background color is changed
 *        based on runtime value
 */
var ShadeOutputField = function() {
	AbstractField.call(this);
	this.bgcolor = 'white';
};

ShadeOutputField.prototype = new AbstractField;

ShadeOutputField.prototype.setValueToObject = function(ele, val) {
	if (!ele) {
		debug('ERROR: null object passed to set value to object obj=' + ele
				+ ' and val = ' + val);
		return;
	}
	var stringval = '';
	if (val.length == 0) {
		stringval = this.bgcolor;
	} else {
		stringval = val;
	}
	ele.style.backgroundColor = stringval;
};

/**
 * @class ShadeInputField a view component that sets the background color based
 *        on the user edited value
 */
var ShadeInputField = function() {
	AbstractField.call(this);
	this.bgcolor = 'white';
};

ShadeInputField.prototype = new AbstractField;

/**
 * set value to dom element. Set its background color.
 * 
 * @param ele
 *            dom element to be used
 * @param val
 *            value to be set
 */
ShadeInputField.prototype.setValueToObject = function(ele, val) {
	if (!ele) {
		debug('ERROR: null object passed to set value to object ele=' + ele
				+ ' and val = ' + val);
		return;
	}
	ele.style.backgroundColor = val || 'white';
};

ShadeInputField.prototype.getValueFromObject = function(ele) {
	return ele.style.backgroundColor;
};
/**
 * @module - this field is deprecated, and is not used/supported anymore.
 */
var XmlTreeField = function() {
	AbstractField.call(this);
	this.treeStr = "";
};

XmlTreeField.prototype = new AbstractField;

XmlTreeField.prototype.setValueToObject = function(obj, val) {
	if (!obj) {
		debug('ERROR: null object passed to set value to object obj=' + obj
				+ ' and val = ' + val);
		return;
	}

	var httpObject;
	if (window.XMLHttpRequest)
		httpObject = new window.XMLHttpRequest();
	else
		httpObject = new window.ActiveXObject("Msxml2.XMLHTTP.6.0");

	try {
		httpObject.open('GET', val, false);
		httpObject.send(null);
	} catch (e) {
		message(
				"Application is unable to process your request because network connection is not available. Please establish Network connection and try again.",
				"", "Ok", null, null, null);
		// alert('error while sending request for ' + url + '\n' + e);
		return;
	}
	// alert(' responseText is ' + httpObject.responseText);

	var xmlDoc = null;
	var response = httpObject.responseText;
	try // Internet Explorer
	{
		xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
		xmlDoc.async = "false";
		xmlDoc.loadXML(response);
	} catch (e) {
		try // Firefox, Mozilla, Opera, etc.
		{
			parser = new DOMParser();
			xmlDoc = parser.parseFromString(response, "text/xml");
		} catch (e1) {
			alert(e1.message);
		}
	}
	// did we get a document?
	if (!xmlDoc.documentElement || !xmlDoc.documentElement.firstChild) {
		alert('Error loading contents of url '
				+ url
				+ ' as an XML. The file may have syntax errors.\n XML tree view will not be loaded.');
		return;
	}
	var txt = [ '<ul class="rootnode">' ];
	this.buildTree(txt, xmlDoc.documentElement, '/', this.showValues);
	txt.push('\n</ul>');
	txt = txt.join('');
	obj.innerHTML = txt;
	this.rootNode = obj.childNodes[0].childNodes[0];
	if (this.expandAllOnLoad)
		this.changeVisibility(this.rootNode, true, true);
};

XmlTreeField.prototype.buildTree = function(txt, domEle, parentPath, addValues) {
	var currentAttribute, htmlAttributes;
	if (domEle.nodeType != Node.ELEMENT_NODE)
		return;
	var id = domEle.nodeName;
	var n = id.indexOf(':');
	if (n >= 0) {
		n++;
		id = id.substring(n, id.length - n);
	}
	id = parentPath + id;
	var children = domEle.childNodes;
	var attributes = domEle.attributes;
	if (attributes.length == 0
			&& (children.length == 0 || (children.length == 1 && children[0].nodeType == Node.TEXT_NODE))) { // leaf
		// node
		if (this.childHtmlAttributes) {
			txt.push('\n<li ');
			htmlAttributes = this.childHtmlAttributes.split("\); ");
			for ( var j = 0; j < htmlAttributes.length; j++) {
				currentAttribute = htmlAttributes[j].split("=");
				if (currentAttribute.length < 2)
					break;
				if (currentAttribute[1].match(/\);/))
					txt.push(currentAttribute[0] + '="' + currentAttribute[1]
							+ '" ');
				else
					txt.push(currentAttribute[0] + '="' + currentAttribute[1]
							+ ');" ');
			}
			txt.push(' id="' + id + '" >');
		} else
			txt.push('\n<li id="' + id + '" >');
		txt.push(domEle.nodeName);
		if (addValues && domEle.firstChild) {
			var val = domEle.firstChild.nodeValue;
			if (val)
				txt.push('=&quot;' + val + '&quot;');
		}
		txt.push('</li>');
		return;
	}
	// txt.push('class="collapsednode" onclick="P2.xmlNodeClicked(this);"');
	txt.push('\n<li id="' + id + '" ');
	if (this.childHtmlAttributes) {
		txt.push('\n<li ');
		htmlAttributes = this.childHtmlAttributes.split("\); ");
		for ( var j = 0; j < htmlAttributes.length; j++) {
			currentAttribute = htmlAttributes[j].split("=");
			if (currentAttribute.length < 2)
				break;
			if (currentAttribute[1].match(/\);/))
				txt.push(currentAttribute[0] + '="' + currentAttribute[1]
						+ '" ');
			else
				txt.push(currentAttribute[0] + '="' + currentAttribute[1]
						+ ');" ');
		}
	}
	txt.push('onclick="P2.xmlNodeClicked(this, ' + "'" + this.name + "'"
			+ ');">');
	txt
			.push('<img border="0" src="../../exilityImages/plus.gif" style="cursor:pointer;vertical-align:middle;">');
	txt.push(domEle.nodeName);
	txt.push('</li>');

	txt.push('\n<ul style="display: none;">');
	// txt.push('\n<ul>');

	for ( var i = 0; i < attributes.length; i++) {
		var att = attributes[i];
		txt.push('\n<li ');
		if (this.childHtmlAttributes) {
			htmlAttributes = this.childHtmlAttributes.split("\); ");
			for ( var j = 0; j < htmlAttributes.length; j++) {
				currentAttribute = htmlAttributes[j].split("=");
				if (currentAttribute.length < 2)
					break;
				if (currentAttribute[1].match(/\);/))
					txt.push(currentAttribute[0] + '="' + currentAttribute[1]
							+ '" ');
				else
					txt.push(currentAttribute[0] + '="' + currentAttribute[1]
							+ ');" ');
			}
		}
		txt.push(' id="' + id + '/' + att.name + '">');
		txt.push(att.name);
		if (addValues)
			txt.push('=&quot;' + att.value + '&quot;');
		txt.push('</li>');
	}

	parentPath += domEle.nodeName + '/';
	for ( var i = 0; i < children.length; i++)
		this.buildTree(txt, children[i], parentPath, addValues);

	txt.push('\n</ul>');
	return;
};

XmlTreeField.prototype.changeVisibility = function(ele, toExpand, toCascade) {
	if (!ele)
		ele = this.rootNode;
	if (ele && ele.nodeType == 3) // Sep 21 2009 : Bug 694 - Nodetype Error In
		// XML Treefield - Exility: Venkat
		ele = ele.nextSibling;
	if (!ele)
		return;
	var ul = ele.nextSibling;
	if (ul && ul.nodeType == 3)
		ul = ul.nextSibling;
	// alert('ele is ' + (ele.tagName || ele.nodeType) +' while ul is ' +
	// (ul.tagName || ul.nodeType));
	if (!ul || ul.nodeName != 'UL')// leaf node
		return;
	var img = ele.firstChild;
	if (img.nodeType == 3)
		img = img.nextSibling;
	var n = img.src.indexOf('plus');
	if (n >= 0)// this is right now collapsed.
	{
		if (toExpand == null || toExpand)// either + is clicked, or we are to
		// expand
		{
			ul.style.display = '';
			img.src = img.src.replace('plus', 'minus');
		}
	} else // it is in expanded mode now
	{
		if (!toExpand)// either - is clicked, or we are to collapse
		{
			ul.style.display = 'none';
			img.src = img.src.replace('minus', 'plus');
		}
	}
	if (!toCascade)
		return;
	var lis = ul.childNodes;
	for ( var i = 0; i < lis.length; i++)
		this.changeVisibility(lis[i], toExpand, true);
};

XmlTreeField.prototype.setGrid = function(grid) {
	var htmlAttributes, currentAttribute, curEle;
	menuHolder = this.P2.doc.getElementById(this.name);
	if (menuHolder) {
		var childHtmlAttribsExist = false;
		htmlAttributes = new Array();
		if (this.childHtmlAttributes) {
			childHtmlAttribsExist = true;
			htmlAttributes = this.childHtmlAttributes.split("\); ");
		}
		var rootNodeElement = this.P2.doc.createElement('ul');
		rootNodeElement.setAttribute('class', 'rootnode');
		rootNodeElement.setAttribute('id', '0');
		menuHolder.appendChild(rootNodeElement);
		for ( var i = 1; i < grid.length; i++) {
			var parentId = grid[i][0];
			var nodeId = grid[i][1];
			var nodeText = grid[i][2];
			var isParent = grid[i][3];
			var nodeLink = grid[i][4];

			if (parentId == 0) {
				if ((isParent == 'y') || (isParent == 'Y')) {
					curEle = this.P2.doc.createElement('li');
					curEle.setAttribute('id', nodeId);
					curEle.setAttribute('onclick', 'P2.xmlNodeClicked(this, '
							+ "'" + this.name + "'" + ');menuNavigateToPage('
							+ "'" + nodeLink + "'" + ');');
					if (childHtmlAttribsExist) {
						for ( var j = 0; j < htmlAttributes.length; j++) {
							currentAttribute = htmlAttributes[j].split("=");
							if (currentAttribute.length < 2)
								break;
							if (currentAttribute[1].match(/\);/))
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1]);
							else
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1] + ");");
						}
					}
					curEle.innerHTML = '<img border="0" src="../../exilityImages/plus.gif" style="cursor:pointer;vertical-align:middle;">'
							+ nodeText;
					var curChildEle = this.P2.doc.createElement('ul');
					curChildEle.style.display = 'none';
					this.P2.doc.getElementById(parentId).appendChild(curEle);
					this.P2.doc.getElementById(parentId).appendChild(
							curChildEle);
				} else {
					curEle = this.P2.doc.createElement('li');
					curEle.setAttribute('id', nodeId);
					curEle.setAttribute('onclick', 'menuNavigateToPage(' + "'"
							+ nodeLink + "'" + ');');
					if (childHtmlAttribsExist) {
						for ( var j = 0; j < htmlAttributes.length; j++) {
							currentAttribute = htmlAttributes[j].split("=");
							if (currentAttribute.length < 2)
								break;
							if (currentAttribute[1].match(/\);/))
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1]);
							else
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1] + ");");
						}
					}
					// Jul 30 2009 : Bug 519 - XMLTree rendered using grid
					// needed addational functions - SABMiller (End) : Aravinda
					curEle.innerHTML = nodeText;
					this.P2.doc.getElementById(parentId).appendChild(curEle);
				}
			} else {
				if ((isParent == 'y') || (isParent == 'Y')) {
					curEle = this.P2.doc.createElement('li');
					curEle.setAttribute('id', nodeId);
					curEle.setAttribute('onclick', 'P2.xmlNodeClicked(this, '
							+ "'" + this.name + "'" + ');menuNavigateToPage('
							+ "'" + nodeLink + "'" + ');');
					if (childHtmlAttribsExist) {
						for ( var j = 0; j < htmlAttributes.length; j++) {
							currentAttribute = htmlAttributes[j].split("=");
							if (currentAttribute.length < 2)
								break;
							if (currentAttribute[1].match(/\);/))
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1]);
							else
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1] + ");");
						}
					}
					curEle.innerHTML = '<img border="0" src="../../exilityImages/plus.gif" style="cursor:pointer;vertical-align:middle;">'
							+ nodeText;
					curChildEle = this.P2.doc.createElement('ul');
					curChildEle.style.display = 'none';
					this.P2.doc.getElementById(parentId).nextSibling
							.appendChild(curEle);
					this.P2.doc.getElementById(parentId).nextSibling
							.appendChild(curChildEle);
				} else {
					curEle = this.P2.doc.createElement('li');
					curEle.setAttribute('id', nodeId);
					curEle.setAttribute('onclick', 'menuNavigateToPage(' + "'"
							+ nodeLink + "'" + ');');
					if (childHtmlAttribsExist) {
						for ( var j = 0; j < htmlAttributes.length; j++) {
							currentAttribute = htmlAttributes[j].split("=");
							if (currentAttribute.length < 2)
								break;
							if (currentAttribute[1].match(/\);/))
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1]);
							else
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1] + ");");
						}
					}
					curEle.innerHTML = nodeText;
					this.P2.doc.getElementById(parentId).nextSibling
							.appendChild(curEle);
				}
			}
		}
		var menuText = menuHolder.innerHTML;
		menuHolder.innerHTML = "";
		menuHolder.innerHTML = menuText;
		this.rootNode = menuHolder.childNodes[0].childNodes[0];
	}
	if (this.expandAllOnLoad)
		this.changeVisibility(this.rootNode, true, true);
	return;
};
/**
 * Action models a response to an event during the life-cycle of a page that
 * interacts with a user. Actions are declared first and are used at one or more
 * place in a page.xml, or can be called from a javaScript function.
 */
var AbstractAction = function() {
	//
};

/**
 * main method that is executed at run time. This is implemented at the concrete
 * class level. This method was originally designed to be an internal one, but
 * later opened as API. Hence the confusing parameters list
 * 
 * @param win
 *            window object where the page is loaded
 * @param obj
 *            dom object that is associated with the event that triggered this
 *            action
 * @param params
 *            other parameters associated with this
 * @returns {Boolean} true if all OK, false otherwise
 */
AbstractAction.prototype.act = function(win, obj, params) {
	message(
			'Design Error : A concrete class of AbstractAction has not implemented the required method act(win, obj, params)',
			"Error", "Ok", null, null, null);
	return false;
};

/**
 * @deprecated
 * 
 * create a string that can be used as query string to be appended to the url
 * that is used to contact server. Not used anymore
 * 
 * @returns {String}
 */
AbstractAction.prototype.getQryString = function() {
	var qryStr = '';
	var src = this.queryFieldSources || this.queryFieldNames;
	for ( var i = 0; i < this.queryFieldNames.length; i++) {
		qryStr += '&' + this.queryFieldNames[i] + '='
				+ this.P2.getFieldValue(src[i]);
	}
	return qryStr;
};

/**
 * execute a function. Used by concrete classes when a function is passed to
 * them as action. We had designed this to be just a name. like "foo". But
 * programmers had used "foo(1,'arg2');". This was working well, thanks to our
 * first design where we used eval(). When we re-factored this code with a view
 * to eliminate eval(), such code started failing, and this was reported as
 * "bug". Since programmers had already used it, we legalized that as "feature".
 * 
 * @param functionName
 *            name of the function to be executed. It can be either a function
 *            name, or a valid javaScript statement(s) that can be executed
 * @param obj
 *            dom element that is associated with the event that triggered the
 *            action
 * @param fieldName
 *            field that is associated with the event that triggered this action
 * @param params
 *            other parameters
 */
AbstractAction.prototype.executeFunction = function(functionName, obj,
		fieldName, params) {
	/*
	 * is it a statement with its own function invocation? like foo(1, 'arg2')?
	 */
	if (functionName.indexOf('(') > 0) {
		eval('this.P2.win.' + functionName);
		return;
	}

	/*
	 * is it a function defined at window level?
	 */
	var f = this.P2.win[functionName];
	if (f) {
		f(obj, fieldName, params);
		return;
	}

	debug(functionName
			+ ' is not defined as a function at window level. trying it as a method of an object..');
	try {
		/*
		 * it could be a method on an object in main window
		 */
		f = eval(functionName + '()');
	} catch (e) {
		/*
		 * last resort, it could be a method on an object in this page
		 */
		try {
			f = this.P2.win.eval(functionName + '()');
		} catch (ex) {
			alert(functionName
					+ ' is neither a function, nor a method of an object. local function not executed.');
		}
	}
};

/**
 * Action that is designed for its side effect, but no main action. That is it
 * has no .act() method
 */
var DummyAction = function() {
	AbstractAction.call(this);
	this.warnIfFormIsModified = false;
};

DummyAction.prototype = new AbstractAction;

DummyAction.prototype.act = function() {
	//
};

/**
 * reset means the data entered in the page are to be discarded, and the page
 * goes back to the state in which it was presented to the user. In standard
 * HTML, this is 'reset button' of HTML that will reset values of all form
 * fields to their values at the time of loading the page. For us, it is reload
 * the page. that is, we should load the page with the same parameters that it
 * was done in the beginning.
 */
var ResetAction = function() {
	AbstractAction.call(this);
	/*
	 * force this attribute
	 */
	this.resetFormModifiedState = true;
};

ResetAction.prototype = new AbstractAction;

/**
 * reload the page, except if certain other options are specified.
 * 
 * @returns {Boolean} true means we are OK. False means action failed
 */
ResetAction.prototype.act = function() {
	/*
	 * are we to reset a subset of fields?
	 */
	if (this.fieldsToReset) {
		if (this.fieldsToReset[0] == 'all')
			this.P2.resetAllFields();
		else
			this.P2.resetFields(this.fieldsToReset);
		return true;
	}
	this.P2.win.location.reload(true);
	return true;
};

/**
 * close this window. What to show after this window is closed is decided by the
 * page manager, who keeps track of page navigations
 */
var CloseAction = function() {
	AbstractAction.call(this);
	/*
	 * force this attribute. Note that the page generator does not set any
	 * attribute to false, hence this attribute will remain as true
	 */
	this.warnIfFormIsModified = true;
};

CloseAction.prototype = new AbstractAction;

CloseAction.prototype.act = function(obj, fieldName, params) {
	/*
	 * is this a code picker window? fairly round-about way.
	 */
	var p2 = this.P2.win.currentP2;
	if (p2 && p2.pendingPicker) {
		p2.codePickerReturned(null);
		return true;
	}

	if (this.functionName)
		this.executeFunction(this.functionName, obj, fieldName, params);

	/*
	 * one special case. under some circumstance, a message dialogue is open,
	 * and we are trying to close the window. (Can happen when programmers call
	 * actions)
	 */
	if (window.messageBtnAction1) {
		window.messageButtonClicked(null);
	} else if (this.P2.error) {
		/*
		 * an error window is open. Let s not close the window
		 */
		return false;
	}
	exilityPageStack.goBack(this.P2.win);
	return true;
};

/**
 * execute a javaScript function
 */
var LocalAction = function() {
	AbstractAction.call(this);
};

LocalAction.prototype = new AbstractAction;

/**
 * @override
 * @param obj
 *            dom element that triggered this
 * @param fieldName
 *            that triggered this
 * @param params
 *            parameters being passed to this action
 * 
 * @returns true if action is taken, false otherwise
 */
LocalAction.prototype.act = function(obj, fieldName, params) {
	/*
	 * parameter is an attribute of this action, but it is overridden by caller
	 */
	if (!params)
		params = this.parameter;
	if (this.functionName) {
		this.executeFunction(this.functionName, obj, fieldName, params);
		if (this.fieldToFocusAfterExecution) {
			var eleToFocus = this.P2.doc
					.getElementById(this.fieldToFocusAfterExecution);
			if (eleToFocus && eleToFocus.focus)
				eleToFocus.focus();
		}
		return true;
	}
	/*
	 * local function should certainly have a functionName
	 */
	debug('local action ' + this.name
			+ ' has no functionName. It is acting as a dummy function.');
	/*
	 * we are not returning false, because of backward compatibility
	 */
	return true;
};

/**
 * go to another page
 */
var NavigationAction = function() {
	AbstractAction.call(this);
	this.windowDisposal = this.REPLACE;
	/*
	 * force reporting.
	 */
	this.toBeReported = true;
};
NavigationAction.prototype = new AbstractAction;

// valid values for windowDisposal
NavigationAction.REPLACE = 'replace';
NavigationAction.POPUP = 'popup';
NavigationAction.RETAIN_STATE = 'retainState';
NavigationAction.RESET = 'reset';
NavigationAction.MENU_RESET = 'menuReset';

NavigationAction.TOKEN_TO_SUBSTITUTE = '#value#';

/**
 * navigate to the desired page
 */
NavigationAction.prototype.act = function(obj, fieldName, params) {
	var url = this.pageToGo;
	/*
	 * url may have place-holder for run time value. #value# will be replaced
	 * with the value of the designated field
	 */
	if (this.substituteValueFrom != null)
		url = url.replace(NavigationAction.TOKEN_TO_SUBSTITUTE, this.P2
				.getFieldValue(this.substituteValueFrom));

	/*
	 * query field names is a way to pass parameters to next page. Receiving
	 * page defines these as pageParameters to process them
	 */
	if (this.queryFieldNames || this.serviceId) {
		var qryStr = null;

		if (this.queryFieldNames)
			qryStr = this.P2.makeQueryString(this.queryFieldNames,
					this.queryFieldSources, null, this.validateQueryFields);

		/*
		 * following is a suspect code, and requires thorough investigation.
		 * Even if it is not correct, we can not change it, as some project may
		 * have used it as a feature.
		 * 
		 */
		if (!qryStr)
			return;

		if (this.serviceId) {
			if (this.queryFieldNames.length <= 0)
				qryStr = "serviceId=" + this.serviceId;
			else
				qryStr += "&serviceId=" + this.serviceId;
		}

		if (exilityTraceWindow != null)
			qryStr += "&exilityServerTrace=1";

		url += '?' + qryStr;
	}

	if (this.passDc) {
		if (params && params.dc)
			window.passedDc = params.dc;
		else
			window.passedDc = this.getDc();
	}

	var windowToGo = this.P2.win;

	// windowToGo means it is a subwindow, and hence current window should be
	// just there..
	if (this.windowToGo) {
		windowToGo = window.frames[this.windowToGo];
		if (!windowToGo) {
			message(this.windowToGo + ' is not a name of a frame. ', "Warning",
					"Ok", null, null, null);
			return false;
		}
		if (this.pageToGo)
			exilityPageStack.goTo(windowToGo, NavigationAction.REPLACE, url);
		else
			windowToGo.focus();
		return true;
	}

	exilityPageStack.goTo(windowToGo, this.windowDisposal, url, null,
			this.windowName);
};
/**
 * get the dc to be passed to next page
 * 
 * @returns dc or null in case of issues
 */
NavigationAction.prototype.getDc = function() {
	var dc = new DataCollection();
	if (this.queryFieldNames) {
		if (!this.P2.fillDcFromQueryFields(dc, this.queryFieldNames,
				this.queryFieldSources, null, this.validateQueryFields))
			return null;
	}
	this.P2.addPageSizes(dc);
	if (this.fieldsToSubmit) {
		if (!this.P2.validate(this.fieldsToSubmit, this.tablesToSubmit))
			return null;
		this.P2.fillDcFromForm(dc, this.fieldsToSubmit, this.tablesToSubmit,
				this.sendAllFields);
	} else if (this.passDc) {
		if (!this.P2.validate())
			return null;
		if (this.atLeastOneFieldIsRequired && this.P2.countEnteredFields() == 0) {
			var e = new ExilityError("At least one field must have some value");
			e.render();
			return null;
		}
		this.P2.fillDcFromForm(dc);
	}
	return dc;
};

/**
 * action that results in a RPC to server with dc as input parameter, and dc as
 * returned object
 */
var ServerAction = function() {
	AbstractAction.call(this);
	this.toRefreshPage = ServerAction.BEFORE;
	this.toBeReported = true;
};

ServerAction.prototype = new AbstractAction;

/*
 * when should Exility refresh page (after getting response from server)
 */
ServerAction.BEFORE = 'beforeMyAction';
ServerAction.AFTER = 'afterMyAction';
ServerAction.NONE = 'none';

/**
 * refer to abstractAction.act()
 * 
 * @param obj
 * @param fieldName
 * @param params
 * @param actionOnLoad
 * @returns {Boolean}
 */
ServerAction.prototype.act = function(obj, fieldName, params, actionOnLoad) {

	if (this.disableForm)
		coverPage(coverPickerStyle, imgPickerStyle, imgMainPrgIndStyle);

	var dc = this.getDc();
	if (!dc) {
		if (this.disableForm)
			uncoverPage(coverPickerStyle, imgPickerStyle, imgMainPrgIndStyle);
		debug('error: form validation failed');
		return false;
	}
	/*
	 * create a service entry and call the service
	 */
	var se = new ServiceEntry(this.serviceId, dc, this.waitForResponse,
			this.callBackActionName, obj, fieldName, this.toRefreshPage,
			this.disableForm, this.showPage, this.fieldToFocusAfterExecution,
			actionOnLoad, this.callBackEvenOnError); // Jun 11 2009 : Bug 507
	this.showPage = null;
	this.P2.win.serverStub.callService(se);
	return true;
};

/**
 * create dc object based on what is to be sent to the server
 */
ServerAction.prototype.getDc = function() {
	var dc = new DataCollection();
	/*
	 * query field names were designed for navigation action, but our early
	 * adapters used it for server action as well. Right usage is to use
	 * fieldsToSubmits
	 */
	if (this.queryFieldNames) {
		/*
		 * this method is delegated to P2
		 */
		if (!this.P2.fillDcFromQueryFields(dc, this.queryFieldNames,
				this.queryFieldSources, null, this.validateQueryFields))
			return null;
	}
	/*
	 * more delgation to P2 :-)
	 */
	this.P2.addPageSizes(dc);
	if (this.fieldsToSubmit) {
		if (!this.P2.validate(this.fieldsToSubmit, this.tablesToSubmit))
			return null;
		this.P2.fillDcFromForm(dc, this.fieldsToSubmit, this.tablesToSubmit,
				this.sendAllFields);
	} else if (this.submitForm) {
		if (!this.P2.validate())
			return null;
		if (this.atLeastOneFieldIsRequired && this.P2.countEnteredFields() == 0) {
			var e = new ExilityError("At least one field must have some value");
			e.render();
			return null;
		}
		this.P2.fillDcFromForm(dc);
	}
	return dc;
};

/**
 * Same service is used but with different sets of fields. To enable this, we
 * are providing this method to change the fieldsToSubmit attribute.
 * 
 * Example use is by UXD project where they want to save fields immediately
 * 
 * @param {String[]}
 *            fieldsToSubmit - array of field names to be submitted with this
 *            service request
 */
ServerAction.prototype.resetFieldsToSubmit = function(fieldsToSubmit) {
	this.sendAllFields = true;
	this.fieldsToSubmit = {};
	for ( var i = 0; i < fieldsToSubmit.length; i++) {
		this.fieldsToSubmit[fieldsToSubmit[i]] = true;
	}
};
/**
 * actions that are not common are included in this file. We can generate a
 * smaller engine by excluding this file.
 * 
 * These were adhoc functionality added for specific project. We need to redesign 
 * these to with current browser support and make them usable by all projects 
 */

/**
 * send a mail
 */
var MailToAction = function() {
	AbstractAction.call(this);
};

MailToAction.prototype = new AbstractAction;
/**
 * we open a browser window with mail protocol for the browser to take over from
 * here
 */
MailToAction.prototype.act = function(obj, fieldName, params) {
	var mailTo = this.mailTo;
	if (!mailTo) {
		debug('no address specified for mailTo action');
		return false;
	}

	if (this.substituteValueFrom)
		mailTo = mailTo.replace('#value#', this.P2
				.getFieldValue(this.substituteValueFrom));
	window.open('mailto:' + mailTo);
	return true;
};

/**
 * 
 */
var FileAction = function() {
	ServerAction.call(this);
};

FileAction.prototype = new ServerAction;

FileAction.prototype.act = function() {
	var dc = this.getDc();
	if (!dc)
		return false;
	dc.values['serviceId'] = this.serviceId;
	dc.values[ClientConstants.CSRF_HEADER] = getCsrfToken();
	this.formSubmit(dc);
	return true;
};
/**
 * this method needs to be re-factored. This is working with specific
 * requirements for one project
 * 
 * @param dc
 * @returns {Boolean}
 */

FileAction.prototype.formSubmit = function(dc) {
	if (this.submitInNewWindow) {
		var win = window.open("_blank");
		if (!win) {
			alert('Pop-up blocker is preventing us from opening a new window for file upload');
			return false;
		}
		var doc = win.document;
		doc
				.write('<body onload="document.forms[0].submit();"><span>Contacting the server... Please wait....</span><form method="post" accept-charset="UTF-8" enctype="multipart/form-data" action="'
						+ htmlRootPath + this.serverResource + '">');

		for ( var key in dc.values) {
			var val = dc.values[key];
			var field = this.P2.getField(key);
			if (field && field.isFileField)
				doc.write('<input type="file" name="' + key + '" value="' + val
						+ '"/>');
			else if (val)
				doc.write('<input type="hidden" name="' + key + '" value="'
						+ val + '"/>');
		}
		doc.write('</form></body>');
		doc.close();
		// doc.end();
	} else {
		var doc = this.P2.doc;
		var frm = doc.createElement("FORM");
		frm.acceptCharset = 'UTF-8';
		doc.body.appendChild(frm);
		for ( var key in dc.values) {
			var val = dc.values[key];
			var isFileField = false;
			var field = this.P2.getField(key);
			if (field) {
				var fieldCons = field.constructor;
				if (fieldCons == FileField)
					isFileField = true;
			}
			if (isFileField) {
				var hf = doc.createElement("INPUT");
				hf.type = "file";
				hf.name = key;
				hf.value = val;
				frm.appendChild(hf);
			} else if (val) {
				var hf = doc.createElement("INPUT");
				hf.type = "hidden";
				hf.name = key;
				hf.value = val;
				frm.appendChild(hf);
			}
		}
		frm.encType = 'multipart/form-data';
		frm.action = htmlRootPath + this.serverResource;
		frm.method = "POST";
		frm.submit();
		doc.body.removeChild(frm);
	}
};

if (!window.serverPlatform)
	window.serverPlatform = 'jsp';

var DownloadFileAction = function() {
	FileAction.call(this);
	this.serverResource = '../exilityClient/' + serverPlatform
			+ '/DownloadFile.' + serverPlatform;
};

DownloadFileAction.prototype = new FileAction;

var UploadFileAction = function() {
	FileAction.call(this);
	this.serverResource = '../exilityClient/' + serverPlatform + '/UploadFile.'
			+ serverPlatform;
};

UploadFileAction.prototype = new FileAction;

UploadFileAction.prototype.act = function() {
	var dc = this.getDc();
	if (!dc)
		return false;

	dc.values['serviceId'] = this.serviceId;
	dc.values[ClientConstants.CSRF_HEADER] = getCsrfToken();
	var doc = this.P2.doc;

	var fileFieldExists = false;
	for ( var key in dc.values) {
		var isFileField = false;
		var field = this.P2.getField(key);
		if (field) {
			var fieldCons = field.constructor;
			if (fieldCons == FileField)
				isFileField = true;
		}
		if (isFileField) {
			fileFieldExists = true;
			doc.getElementById(key).name = key;
		}
	}

	if (fileFieldExists) {
		var frm = doc.getElementById("form1");
		frm.acceptCharset = 'UTF-8'; // May 3 2011 : Change to support utf 8
		// char in multi-part form data -
		// Exility App : Aravinda

		var hf = doc.createElement("INPUT");
		hf.type = "hidden";
		hf.name = "dc";
		hf.value = this.P2.win.serverStub.serializeDc(dc);
		frm.appendChild(hf);

		var hf = doc.createElement("INPUT");
		hf.type = "hidden";
		hf.name = "baseHTMLFolderName";
		hf.value = exilParms.baseHTMLFolderName;
		frm.appendChild(hf);

		frm.encoding = 'multipart/form-data';
		this.P2.doc.onload = 'uploadFileReturned(true)';
		frm.action = htmlRootPath + this.serverResource;
		frm.method = "POST";
		frm.submit();
	} else {
		var gridNameContainingFile = null;
		var gridColumnContainingFile = null;
		var gridColumnFileIndex = null;
		var foundGrid = false;
		for ( var key in dc.grids) {
			var grid = dc.grids[key];
			for ( var i = 0; i < grid[0].length; i++) {
				var field = this.P2.getField(key + "_" + grid[0][i]);
				if (field) {
					var fieldCons = field.constructor;
					if (fieldCons == FileField) {
						foundGrid = true;
						gridNameContainingFile = key;
						gridColumnContainingFile = grid[0][i];
						gridColumnFileIndex = i;
						break;
					}
				}
			}
			if (foundGrid)
				break;
		}
		if (foundGrid) {
			PM.fileUploadData = new Array();
			PM.fileUploadData['fileDataGrid'] = dc.grids[gridNameContainingFile];
			PM.fileUploadData['gridNameContainingFile'] = gridNameContainingFile;
			PM.fileUploadData['gridColumnContainingFile'] = gridColumnContainingFile;
			PM.fileUploadData['gridColumnFileIndex'] = gridColumnFileIndex;
			PM.fileUploadData['noOfFilesToUpload'] = dc.grids[gridNameContainingFile].length - 1;
			PM.fileUploadData['currentFileToUpload'] = 1;
			PM.fileUploadData['doc'] = doc;
			PM.fileUploadData['P2'] = this.P2;
			PM.fileUploadData['serverResource'] = this.serverResource;
			dc.grids[gridNameContainingFile] = null;
			PM.fileUploadData['dc'] = dc;

			PM.fileUploaded = false;
			uploadFiles();
		}
	}
	return true;
};

/**
 * ability to upload multiple files at a time
 */
function uploadFiles() {
	var grid = PM.fileUploadData['fileDataGrid'];
	var dc = PM.fileUploadData['dc'];
	var gridNameContainingFile = PM.fileUploadData['gridNameContainingFile'];
	var gridColumnContainingFile = PM.fileUploadData['gridColumnContainingFile'];
	var gridColumnFileIndex = PM.fileUploadData['gridColumnFileIndex'];

	PM.debug('Grid : ' + grid);
	PM.debug('dc : ' + dc);
	PM.debug('gridNameContainingFile : ' + gridNameContainingFile);
	PM.debug('gridColumnContainingFile' + gridColumnContainingFile);
	PM.debug('gridColumnFileIndex : ' + gridColumnFileIndex);

	var doc = PM.fileUploadData['doc'];
	var div = doc.createElement("DIV");
	div.id = "exilFileUploadDiv";
	div.style.display = 'none';
	doc.body.appendChild(div);

	var frm = doc.createElement("FORM");
	frm.acceptCharset = 'UTF-8'; // May 3 2011 : Change to support utf 8 char
	// in multi-part form data - Exility App :
	// Aravinda
	div.appendChild(frm);

	for ( var j = 1; j < grid.length; j++) {
		var currentFileToUpload = j;

		if (grid[currentFileToUpload][gridColumnFileIndex] != "") {
			doc.getElementById(gridNameContainingFile + "_"
					+ gridColumnContainingFile + "__" + currentFileToUpload).name = gridColumnContainingFile;
			var node = doc.getElementById(gridNameContainingFile + "_"
					+ gridColumnContainingFile + "__" + currentFileToUpload);
			frm.appendChild(node);

			var rm = doc.createElement("INPUT");
			rm.type = "hidden";
			rm.name = "REMARK_" + currentFileToUpload;
			rm.value = grid[currentFileToUpload][gridColumnFileIndex + 1];
			frm.appendChild(rm);
		}
	}

	var hf = doc.createElement("INPUT");
	hf.type = "hidden";
	hf.name = "dc";
	hf.value = doSerialize(dc); // Added to fix the issue :
	// <rdar://problem/12861846> Attachment - Not
	// able to attach any file in the pathfinder
	// application - Guru
	frm.appendChild(hf);

	var tmpIframe = doc.createElement("IFRAME");
	tmpIframe.name = "exilFileUploadFrame";
	tmpIframe.src = "";
	tmpIframe.onload = 'uploadFileReturned()';
	frm.appendChild(tmpIframe);

	frm.encoding = 'multipart/form-data';
	frm.action = htmlRootPath + PM.fileUploadData['serverResource'];
	frm.method = "POST";
	frm.target = "exilFileUploadFrame";
	frm.submit();
}

function uploadFileReturned(url) {
	if (typeof (dc) == 'undefined') {
		var prevP2 = PM.currentActiveWindow.P2;
		prevP2.act(null, null, 'callBack');
		return;
	}
	if (!dc.success) {
		parent.message("Error while uploading the file. Please try again", "",
				"Ok", null, null, null);
	}

	if (url) {
		parent.PM.exilityPageStack.goBack();
	}
}

var ReportAction = function() {
	ServerAction.call(this);
	this.reportName = null;
	this.serverResource = '../' + serverPlatform + '/ShowReport.'
			+ serverPlatform;
	this.submitInNewWindow = false; // Mar 18 2011 : Changes to show the report
	// in new window - Exility App : Aravinda
};

ReportAction.prototype = new ServerAction;

// Feb 25 2011 : Report Download in background - Exility App : Aravinda
function checkFileDownloadCookie() {
	if (top.getCookie("fileDownloaded") != "")
		uncoverPage(coverPickerStyle);
	else
		setTimeout('checkFileDownloadCookie();', 100);
}

ReportAction.prototype.act = function() {
	var dc = this.getDc();
	if (!dc)
		return false;

	if (!this.submitInNewWindow) {
		coverPage(coverPickerStyle, imgPickerStyle);
		if (top.getCookie("fileDownloaded") != "")
			top.removeCookie("fileDownloaded");
		setTimeout('checkFileDownloadCookie();', 100);
	}

	dc.values['reportName'] = this.reportName;
	dc.values['serviceId'] = this.serviceId;
	var doc = this.P2.doc;
	var frm = doc.createElement("FORM");
	frm.acceptCharset = 'UTF-8'; // May 3 2011 : Change to support utf 8 char
	// in multi-part form data - Exility App :
	// Aravinda

	if (!this.submitInNewWindow) {
		top.exilReportFrame.document.body.appendChild(frm);
	} else {
		doc.body.appendChild(frm);
	}

	var hf = doc.createElement("INPUT");
	hf.type = "hidden";
	hf.name = "dc";
	hf.value = this.P2.win.serverStub.serializeDc(dc);
	frm.appendChild(hf);

	frm.encoding = 'multipart/form-data'; // Oct 29 2009 : Bug 747 - While
	// uploading check for already
	// existing file - Exility: Venkat
	frm.action = htmlRootPath + this.serverResource;
	frm.method = "POST";
	if (!this.submitInNewWindow) {
		frm.target = "_self";
	} else {
		frm.target = "_blank";
	}
	// Mar 18 2011 : Changes to show the report in new window - Exility App :
	// Aravinda

	frm.submit();
	// Mar 18 2011 : Changes to show the report in new window - Exility App :
	// Aravinda
	if (!this.submitInNewWindow) {
		top.exilReportFrame.document.body.removeChild(frm);
	} else {
		doc.body.removeChild(frm);
	}
	return true;
};

var SaveAsXlsAction = function() {
	ReportAction.call(this);
	this.reportName = null;
	this.serverResource = '../' + serverPlatform + '/DownloadXLS.'
			+ serverPlatform;
};

SaveAsXlsAction.prototype = new ReportAction;//last modified : 5-dec-2012

// Enum for the simulateClickOnRow function
var rowType = {
	none : 'none',
	first : 'first',
	current : 'current',
	next : 'next',
	last : 'last'
};

// represents a table element inside the page that receives data in a grid.
// Selection field receives data in grid, but that is not a table, it is still a
// field
var AbstractTable = function() {
	this.name = null;
	this.P2 = null;

	// all the field that this table has
	this.columns = new Object();
	this.columnNames = new Array();

	// grid in which data is recd and set to the elements. It is saved here..
	// it stores the default values as the zeroth row, which is not considered
	// to be data. It is used anly to
	// manipulate default data.
	this.grid = [ [] ];
	this.currentRow = 0; // active row on which user has clicked or changed
	// some field.
	this.nbrColumns = 0;
	this.nbrRows = 0; // by default data has no rows
};

AbstractTable.prototype.addColumn = function(field) {
	var n = this.nbrColumns;
	field.columnIdx = n;
	field.table = this;
	var fieldName = field.unqualifiedName;
	this.columnNames.push(fieldName);
	this.columns[fieldName] = field;
	// use value as default value
	this.grid[0][n] = field.value;
	if (this.hasSingleRow) // for display panels
		this.grid[1][n] = field.value;

	this.nbrColumns++;
	if (field.rowSum) {
		if (!this.rowSumIndexes)
			this.rowSumIndexes = new Array();
		this.rowSumIndexes.push(n);
		this.hasAggregates = true;
	}
	if (field.rowAverage) {
		if (!this.rowAverageIndexes)
			this.rowAverageIndexes = new Array();
		this.rowAverageIndexes.push(n);
		this.hasAggregates = true;
	}
	if (field.columnSum) {
		if (!this.columnSumIndexes)
			this.columnSumIndexes = new Array();
		this.columnSumIndexes.push(field);
		this.hasAggregates = true;
	}
	if (field.columnAverage) {
		if (!this.columnAverageIndexes)
			this.columnAverageIndexes = new Array();
		this.columnAverageIndexes.push(field);
		this.hasAggregates = true;
	}
};

// table stores the values in grid, with first row as header. get/set method for
// this.
// Most of the times, we deal with 'current row', for which the syntax is that
// row is null.
// (notice that it is the last parameter, so that it is 'optional' while calling
AbstractTable.prototype.getValue = function(colIdx, rowIdx,
		fromDeletedRowAsWell) {
	if (!rowIdx)
		rowIdx = this.currentRow;
	var dataRow = this.grid[rowIdx];
	if (!dataRow) // it is physically deleted
		return '';

	if (dataRow.isDeleted && !fromDeletedRowAsWell)// row is marked for
		// deletion, and we are
		// asked to skip such a row
		return '';

	return dataRow[colIdx];
};

AbstractTable.prototype.getColumnValue = function(columnName, rowIdx,
		fromDeletedRowAsWell) {
	if (!rowIdx)
		rowIdx = this.currentRow;
	var dataRow = this.grid[rowIdx];
	if (!dataRow) // it is physically deleted
		return '';

	if (dataRow.isDeleted && !fromDeletedRowAsWell)// row is marked for
		// deletion, and we are
		// asked to skip such a row
		return '';
	var field = this.columns[columnName];
	if (!field) {
		debug(columnName + ' is not a column in table ' + this.name);
		return '';
	}
	return dataRow[field.colIdx];
};

AbstractTable.prototype.setColumnValue = function(columnName, value, rowIdx) {
	var field = this.columns[columnName];
	if (field) {
		field.setValue(value, null, rowIdx);
		return;
	}
	debug(columnName + ' is not a column in table ' + this.name + '. Value '
			+ value + ' not set.');
};

AbstractTable.prototype.saveValue = function(val, col, row, internalChange) {
	// debug('going to set ' + val + ' to ' + this.name + ' table for row=' +
	// row + ' col=' + col);
	if (!row) {
		row = this.currentRow;
		if (row >= this.grid.length)
			row = 0;
	}
	var dataRow = this.grid[row];
	if (!dataRow) {
		debug(this.name + ' does not have row ' + row
				+ ' and hence can not save value of ' + val + ' to column no '
				+ col);
		return null;
	}
	var oldVal = dataRow[col];
	// no point doing all this if we are not changing anything
	if (oldVal === val)
		return;

	dataRow[col] = val;
	if (this.quickSearchEle) {
		this.quickSearchRebuildRow(row);
	}
	// save to the linked field as well
	if (this.linkedTable) {
		var linkedColumn = this.linkedColumns[col];
		if (linkedColumn != null) {
			linkedColumn.setValue(val, null, this.currentLinkedRow);
			if (!internalChange)
				this.linkedTable.rowChanged(null, null, this.currentLinkedRow);
		}
	}

	return oldVal;
};

// validate the column represented by the supplied field. This is called by form
// validation.
// hence we have to manage error handling.
AbstractTable.prototype.validateColumn = function(field, onlyIfChanged) {
	// display panel that is linked to a grid needs no validation
	if (this.linkedTable)
		return;

	var dt = dataTypes[field.dataType];
	if (!dt) {
		debug('field ' + field.name + ' has a dataType = ' + field.dataType
				+ '. This is not a valid dataType. Validation skipped.');
	}

	var colIdx = field.columnIdx;
	var obj, val, row, formattedValue, i;
	var doc = this.P2.doc;
	var linkedField = null;
	var validationTable = null;
	var validationField = field;
	if (this.linkedDisplayTable) {
		linkedField = this.P2.getField(this.linkedDisplayTable.name + '_'
				+ field.unqualifiedName);
		if (linkedField) {
			validationField = linkedField;
			validationTable = this;
		}
	}

	for (i = 1; i < this.grid.length; i++) {
		row = this.grid[i];
		if (row == null || row.isDeleted)
			continue;
		// is this row modified? This is not such a great optimiation!! A field
		// might have been invalidated due to from-to
		// if(this.actionIdx != null && !row[this.actionIdx])
		// continue;
		// should the row be ignored?
		if (this.keyFieldName
				&& !row[this.keyIdx]
				&& (!this.idFieldName || !row[this.idIdx] || row.keyIsGenerated))
			continue;
		if (onlyIfChanged && !row.changedByUser)
			continue;
		val = row[colIdx];
		this.currentRow = i; // in case any field tries to retrieve a related
		// field value...
		try {
			formattedValue = validationField.validateValue(val, dt, true,
					validationTable);
			if (formattedValue != val) {
				obj = doc.getElementById(this.getObjectId(field.name, i));
				field.setValueToObject(obj, formattedValue);
				row[colIdx] = formattedValue;
			}
		} catch (e) {
			if (linkedField) {
				e.obj = doc.getElementById(linkedField.name);
				e.field = linkedField;
				this.clicked(); // so that the display panel shows this row
			} else {
				e.obj = doc.getElementById(this.getObjectId(field.name, i));
				e.field = field;
			}
			if (exilParms.stopAtFirstError) {
				throw (e);
			}
			e.render(e.obj);
		}
	}
};

// for repeating panels
AbstractTable.prototype.initRepeatingPanel = function() {
	this.addedElements = new Array();
	this.repeatedPanels = new Object();
	this.nbrRepeatedPanels = 0;
	// It has to be removed from dom as of now. It will be cloned and added when
	// data comes in
	// Top level div of a panel is either TabsDiv or Top
	var doc = this.P2.doc;
	var id = this.repeatingPanelName || this.panelName;
	var ele = doc.getElementById(id + 'TabsDiv');
	if (ele)// it is a tabbed element
	{
		var ele1 = doc.getElementById(id + 'Tab');
		this.tabLabelParent = ele1.parentNode;
		this.tabLabelEle = this.tabLabelParent.removeChild(ele1);
		ele1 = doc.getElementById(id + 'TabLeft');
		this.tabLabelParentLeft = ele1.parentNode;
		this.tabLabelEleLeft = this.tabLabelParentLeft.removeChild(ele1);

		ele1 = doc.getElementById(id + 'TabRight');
		this.tabLabelParentRight = ele1.parentNode;
		this.tabLabelEleRight = this.tabLabelParentRight.removeChild(ele1);
	} else {
		id = this.panelName + 'Top';
		ele = doc.getElementById(id);
		if (!ele) {
			message('Design error: ' + this.name
					+ 'is being repeated, but its top panel with name = ' + id
					+ ' is not found in dom', "Error", "Ok", null, null, null);
			return;
		}
	}

	this.panelToClone = ele;
	var parentEle = ele.parentNode;
	this.parentPanel = parentEle;
	this.siblingElement = ele.nextSibling;
	parentEle.removeChild(ele);
	// we should insert using this.parentEle.insertBefore(newEle, this.sibling)
	// if sibling exists, else use appendChild()

	debug('I got ' + this.panelToClone.id
			+ ' as the panel to be removed from the dom with parentEle = '
			+ parentEle.id);
};

AbstractTable.prototype.cloneAndAddPanel = function(key, label, parentPanel,
		childPanel) // Dec 03 2009 : BugID 772 - panels are not colliding in
// repeating column - Exility : Venkat
{
	debug('going to repeat ' + (this.repeatingPanelName || this.panelName)
			+ ' for key = ' + key + ' and label = ' + label);
	if (!label)
		label = key;
	var doc = this.P2.doc;
	var topPanel = this.panelToClone.cloneNode(true);
	topPanel.id = topPanel.id + key;
	this.addedElements.push(topPanel);

	// where to add this panel?
	// very special case; (Odessey) This is part of a repeatedDisplayPanel. Let
	// that panel handle it.
	if (this.mergeWithTable) {
		if (this.stubNameForMerging) // merge with a repeating display panel
		{
			var stubId = this.stubNameForMerging;
			if (key)
				stubId += key;
			var stub = doc.getElementById(stubId);

			if (stub)
				stub.appendChild(topPanel);
			else
				debug(this.name + ' table has row with key ' + key
						+ ' but the linked table ' + this.mergeWithTableName
						+ ' does not have a row with that key.');
		} else // to be merged with another list/grid panel
		{
			this.mergeWithTable.mergeChildPanel(topPanel,
					this.mergeOnColumnName, key);
		}
		return topPanel;
	}

	if (this.siblingElement)
		this.parentPanel.insertBefore(topPanel, this.siblingElement);
	else
		this.parentPanel.appendChild(topPanel);

	var slidingPanel = doc.getElementById(this.panelName + 'Slider');
	if (slidingPanel) {
		slidingPanel.id = slidingPanel.id + key;
		slidingPanel.setAttribute('key', key);
	}
	var panel, id, idLeft, idRight;
	// was it a tab?
	if (this.tabLabelEle) {
		id = this.panelName + key + 'Tab';
		idLeft = this.panelName + key + 'TabLeft';
		idRight = this.panelName + key + 'TabRight';
		var containerName;
		panel = this.tabLabelEle.cloneNode(true);
		panel.id = id;
		panelLeft = this.tabLabelEleLeft.cloneNode(true);
		panelLeft.id = idLeft;
		panelRight = this.tabLabelEleRight.cloneNode(true);
		panelRight.id = idRight;
		this.tabLabelParentLeft.appendChild(panelLeft);
		this.tabLabelParent.appendChild(panel);
		this.tabLabelParentRight.appendChild(panelRight);
		containerName = panel.getAttribute('tabcontainername');
		if (this.nbrRepeatedPanels == 0) // this is the first panel
		{
			// global parameter that tracks what is active..
			var varName = containerName + 'ActiveTabName';
			this.P2.win[varName] = id;
			varName = containerName + 'ActivePanelName';
			this.P2.win[varName] = topPanel.id;
			topPanel.style.display = '';
		} else {
			panel.className = 'passivetablabel';
			topPanel.style.display = 'none';
		}
		this.addedElements.push(panel);
		this.addedElements.push(panelLeft);
		this.addedElements.push(panelRight);
		panel.onclick = this.P2.win.getTabFunction(topPanel.id, containerName);
		panel.innerHTML = label;
	}
	id = this.panelName + 'Label';
	panel = doc.getElementById(id);
	if (panel) {
		panel.innerHTML = label;
		panel.id = id + key;
	}

	// what do we do with the twister?
	id = this.panelName + 'Twister';
	panel = doc.getElementById(id);
	if (panel) {
		panel.id = id + key;
		panel.onclick = this.P2.win.getTwisterFunction(this.panelName + key); // Oct
		// 23
		// 2009
		// :
		// BugID
		// 717
		// -
		// Collapse
		// Feature
		// -
		// Grid
		// panel
		// -
		// Exility
		// :
		// Venkat
	}

	if (!panel && childPanel) {
		var parentPanelDoc = doc.getElementById(parentPanel);
		if (parentPanelDoc) {
			parentPanel = parentPanelDoc.parentNode.id;
			parentPanelDoc = doc.getElementById(parentPanel);
			parentPanelDoc.id = parentPanel + key;
		}

		parentPanelDoc = doc.getElementById(parentPanel + 'Twister');
		if (parentPanelDoc) {
			parentPanelDoc.id = parentPanel + 'Twister' + key;
			parentPanelDoc.onclick = this.P2.win.getTwisterFunction(parentPanel
					+ key);
		}

		var childPanelDoc = doc.getElementById(childPanel);
		if (childPanelDoc) {
			childPanel = childPanelDoc.parentNode.id;
			childPanelDoc = doc.getElementById(childPanel);
			childPanelDoc.id = childPanel + key;
		}

		childPanelDoc = doc.getElementById(childPanel + 'Twister');
		if (childPanelDoc) {
			childPanelDoc.id = childPanel + 'Twister' + key;
			childPanelDoc.onclick = this.P2.win.getTwisterFunction(childPanel
					+ key);
		}
	}

	return topPanel;
};

AbstractTable.prototype.changeIdsOfAddedPanel = function(key) {
	var id, panel;
	var doc = this.P2.doc;
	// is there an add row button?
	if (this.rowsCanBeAdded) {
		id = this.name + 'AddRow';
		panel = doc.getElementById(id);
		if (panel) {
			panel.id = id + key;
			panel.key = key; // key helps in identifying the corresponding
			// table
		} else
			debug('Design Error : add row button with id ' + id
					+ ' is missing in dom for table ' + this.name);
	}

	id = this.name + 'Footer';
	panel = doc.getElementById(id);
	if (panel) {
		panel.id = id + key;
		panel.key = key; // To get footer panel

		for ( var i = 0; i < this.columnNames.length; i++) {
			id = this.name + '_' + this.columnNames[i] + 'Footer';
			panel = doc.getElementById(id);
			if (panel) {
				panel.id = id + key;
				panel.key = key; // If column id is matching with footer id
				// then change its id.
			}
		}
	} else
		debug('Design Error : add row button with id ' + id
				+ ' is missing in dom for table ' + this.name);

	var panelToReturn = null;
	// it could be a single row panel : display panel. In this case, we have to
	// change the variable names
	panel = doc.getElementById(this.panelName);
	if (panel) {
		panelToReturn = panel;
		panel.id = this.panelName + key;
		panel.key = key;
	}

	// Jul 29 2009 : BugID 520 - Tab Panel and Repeating Panels do not have
	// sliding functionality - Exility (Start) : Venkat
	var slidingPanel = doc.getElementById(this.panelName + 'Slider');
	if (slidingPanel) {
		slidingPanel.id = slidingPanel.id + key;
		slidingPanel.setAttribute('key', key);
	}
	// Jul 29 2009 : BugID 520 - Tab Panel and Repeating Panels do not have
	// sliding functionality - Exility (End) : Venkat

	// and the table element
	panel = doc.getElementById(this.name);
	if (panel) {
		panel.id = this.name + key;
		panel.key = key;
		if (panel.tBodies)
			panelToReturn = panel.tBodies[0];
		else
			panelToReturn = panel.firstChild;
	}
	if (panelToReturn) {
		this.nbrRepeatedPanels++;
		this.repeatedPanels[key] = panelToReturn;
	}
	return panelToReturn;
};

AbstractTable.prototype.deleteAllRows = function() {
	if (!this.addedElements) {
		debug('Design error: this.addedElements  not found for a repeatng display panel');
		return;
	}

	/*
	 * remove panels that were added to dom
	 */
	var n = this.addedElements.length;
	for ( var i = 0; i < n; i++) {
		var panel = this.addedElements[i];
		panel.parentNode.removeChild(panel);
	}
	this.addedElements = [];

	// remove rows from data
	this.grid.length = 1;
	this.nbrRows = 0;
};

// if I have an id of a field, what row am I in?
AbstractTable.prototype.getRowNumber = function(obj) {
	return 1;
};

// If I have to find a field in a row, what id will it have?
AbstractTable.prototype.getObjectId = function(fieldName, rowIdx) {
	return fieldName;
};

// whenever a table row is clicked. Make the clicked row current, so that any
// reference to fields will point to this row by default
AbstractTable.prototype.clicked = function(obj) {
	if (!obj)
		return;
	var idx = this.getRowNumber(obj);
	if (idx)
		this.currentRow = idx;
};

// whenever a table row is is touched
AbstractTable.prototype.rowSelected = function(obj) {
	var idx = this.getRowNumber(obj);
	if (idx)
		this.currentRow = idx;
};

AbstractTable.prototype.validate = function() {
	return true;
};
// called when a field in the row is changed
AbstractTable.prototype.rowChanged = function(obj, fieldName, idx,
		internalChange) {
	if (!idx)
		idx = this.getRowNumber(obj);
	if (idx)
		this.currentRow = idx;
	if (internalChange || !idx)
		return;

	var row = this.grid[idx];
	if (!row)
		return;
	row.changedByUser = true;
	// if there is an action field, we have to update that
	if (!this.actionFieldName)
		return;

	var aVal = row[this.actionIdx];
	if (aVal) // it is already set
		return;
	// there is an interesting case. WeaveIT have been using actionFieldName
	// itself as keyField. Also, they have used actionFieldName as basedOnField
	// for almost all fields
	// This is a decent design, in the sense, the row becomes 'active' as and
	// when user enters any field. Probably this is what we should designed that
	// as default!!
	if (this.keyFieldName && this.keyFieldName != this.actionFieldName
			&& !row[this.keyIdx] && (!this.idFieldName || row.keyIsGenerated))// keyField
		// is
		// specified,
		// but
		// no
		// value.
		// Also
		// id
		// field,
		// if
		// present
		// is
		// generated
		// negative
		// number
		return;

	aVal = 'modify';
	if (row.keyIsGenerated || (this.idFieldName && !row[this.idIdx]))
		aVal = 'add';
	this.actionField.setValue(aVal, null, idx);
	debug('action field is set to ' + aVal);
};

// Check if the row of the grid is deleted
AbstractTable.prototype.isRowDeleted = function(rowIdx) {
	var row = this.grid[rowIdx];
	if (this.linkedTable)
		row = this.linkedTable.grid[this.currentLinkedRow];

	if (row)
		return row.isDeleted;

	return false;
};

// Get the old value of the field
AbstractTable.prototype.getFieldValue = function(rowIdx, field) {
	if (this.grid[rowIdx] != null) {
		return this.grid[rowIdx][field.columnIdx];
	}

	return false;
};

// common intermediate class for list and grid. Their data behaviour is common.
// However, their other actions are different
var ListOrGridTable = function() {
	AbstractTable.call(this);
	this.toBeSentToServer = true; // new feature added to supress sending
	// table to server
	this.initialNumberOfRows = 0; // in add mode, howmany rows to show

	// fields for run time management
	this.tableBodyObject = null; // very frequent visit. So, let us keep it
	this.htmlRowToClone = null;

	// /////////// following are required for "complex" table. May be we should
	// shift that to another derived class
	this.childTable = null;
	// used to get back the original normalized table
	this.childTableColumns = null;
	this.mainTableColumns = null;
	// field metadata for repeated elements
	// assumption is: all the child cols fields > 3 are of same type
	// childTable and childTableCell are design time values, to be
	// populated in xxx.metadata.js file.
	this.childTableMetaCell = null;
	this.childTableHtmlCell = null; // it's a string, to be used by innerHTML
	this.distinctKeys = null;
	// qty is primary col header, size is secondary col header.
	// did not get a better generic name that tells the meaning of it.
	this.qtyBySize = true;
	this.doNotShowTreeViewCheckBox = false;
	this.paginateCallback = null;

	this.numberOfOrigDataRows = 0;

	// do you have want the repeated tables to be appended to a corresponding
	// repeating display panel?
	// but link it to this panels using the following two attributes
	this.linkedTableName = null;
	this.linkedElementName = null; // panelName inside this diplay panel to
	// which rows from the linked table is to be
	// inserted
};

ListOrGridTable.prototype = new AbstractTable;

// object id is fieldName + "__" + one based row index
ListOrGridTable.prototype.getObjectId = function(fieldName, idx) {
	if (!idx) {
		if (this.nbrRows == 0) // table has no rows, probably yet...
			return fieldName;
		idx = this.currentRow;
	}
	return fieldName + '__' + idx;
};

ListOrGridTable.prototype.getRowNumber = function(obj) {
	if (!obj) {
		if (this.nbrRows == 0)
			return 0;
		return this.currentRow;
	}
	// obj could be either a tr element, or any field in the tr. Safe method
	// would be to get tr and get its attribute
	if (obj.rowIdx)
		return obj.rowIdx;
	while (obj && obj.tagName != 'BODY') {
		if (obj.rowIdx)
			return obj.rowIdx;
		obj = obj.parentNode;
	}
	// it shoudl never come here, but a defensive code
	return this.currentRow;
};

ListOrGridTable.prototype.getTopRowNumber = function() {
	var doc = this.P2.doc;
	var div = doc.getElementById(this.panelName + 'Left');
	if (!div)
		div = doc.getElementById(this.panelName);
	var scrollTop = div.scrollTop;
	var tr = this.tableBodyObject.firstChild;
	while (tr.nextSibling) {
		if (tr.offsetTop > scrollTop) {
			div.scrollTop = tr.offsetTop;
			break;
		}
		if (tr.offsetTop == tblTop && tr.display != 'none')
			break;
		tr = tr.nextSibling;
	}
	return tr.rowIdx;
};
// used for multiple panel..
ListOrGridTable.prototype.getKey = function() {
	if (!this.repeatOnFieldName)
		return null;
	var colIdx = this.P2.fields[this.repeatOnFieldName].columnIdx;
	return this.grid[this.currentRow][colIdx];
};

var NAVIGATION_ACTIONS = {
	MoveNext : 'next',
	MovePrev : 'prev',
	MoveLast : 'last',
	MoveFirst : 'first',
	DeleteRow : 'del',
	UndeleteRow : 'undelete',
	NewRow : 'new'
};
// some house keeping activities before we are ready to interact with the user
ListOrGridTable.prototype.init = function() {
	// situations where related tables want to control when to init each-other.
	// Hence this feature to avoid double init()
	if (this.inited)
		return;

	if (this.htmlFragments) {
		this.initTemplate();
		return;
	}
	var doc = this.P2.doc;
	this.cloneFlag = 0; // Oct 14 2009 : BugID 722 - Issue related to clone row
	// - Weavit : Vijay
	// cache the html row, as well as data row. These are cloned to add rows
	// later.
	if (this.repeatingColumnName)
		this.cacheRepeatingColumn(doc);

	// is there a right panel with frozen column?
	var thisObj = doc.getElementById(this.name + 'Body');
	if (!thisObj)
		thisObj = doc.getElementById(this.name);
	if (thisObj && thisObj.tBodies)
		this.tableBodyObject = thisObj.tBodies[0];
	else
		// this is rendered as a display panel
		this.tableBodyObject = getFirstNonTextNode(thisObj);

	var firstRow = getFirstNonTextNode(this.tableBodyObject);
	firstRow.rowIdx = 0;
	firstRow.id = this.name + '0';
	this.htmlRowToClone = this.tableBodyObject.removeChild(firstRow);

	if (this.frozenColumnIndex) {
		this.initFrozenPanel(doc);
	}

	this.grid.length = 1;
	this.nbrRows = 0;

	// for grid
	if (this.idFieldName)
		this.idIdx = this.P2.fields[this.idFieldName].columnIdx;
	else
		this.idIdx = null;

	if (this.keyFieldName)
		this.keyIdx = this.P2.fields[this.keyFieldName].columnIdx;
	else
		this.keyIdx = null;

	if (this.actionFieldName) {
		this.actionField = this.P2.fields[this.actionFieldName];
		this.actionIdx = this.actionField.columnIdx;
	} else
		this.actionIdx = null;

	if (this.initialNumberOfRows) {
		this.addRows(this.initialNumberOfRows, null);
		this.currentRow = 1;
	}

	// initialization for listPanel with tree view.
	if (this.treeViewInit)
		this.treeViewInit();

	if (this.pageSize && this.pageSize > 0) {
		this.P2.win[this.name + 'PageSize'] = this.pageSize;
	}

	if (this.rowSum || this.rowAverage) {
		var tfoot = doc.getElementById(this.name + 'tfoot');
		tfoot.style.display = '';
	}

	// is there a quick search field attached to ths list panel?
	if (this.quickSearchFieldName) {
		this.quickSearchInit();
	}

	// are there navigation buttons attched to this table?
	this.initNavigationButtons();

	// in case of two grids in a repeating panel, only elder brother is to be
	// initialized, but after both the grids initialize
	// in case of youngerBrother/elderBrother, one who comes afterwords should
	// trigger init
	if (this.repeatOnFieldName) {
		var otherTable = this.elderBrother || this.youngerBrother;
		if (otherTable)
			this.initBrothers(otherTable);
		else
			this.initRepeatingPanel();
	}
	this.inited = true;
};

/**
 * Nested table element is to be moved to this table
 * 
 * @param doc
 */
ListOrGridTable.prototype.initNestedTable = function() {
	var doc = this.P2.doc;
	var ele = doc.getElementById(this.nestedTableName);
	if (!ele) {
		debug(this.nestedTableName + ' is not defined as a list/grid panel');
		return;
	}
	ele.parentNode.removeChild(ele);

	// move the child table dom element into a new tr in this table. This tr
	// will be moved to appropriate place to display the child rows of a clicked
	// row
	this.setNestedTr(ele);

	/**
	 * link both tables
	 */
	var tbl = this.nestedTable = this.P2.tables[this.nestedTableName];
	tbl.nestedParent = this;

	/**
	 * let us remember the index for reuse
	 */
	var field = this.columns[this.nestOnColumnName];
	if (!field) {
		debug(this.nestOnColumnName
				+ ' is declared as the name of the column using which table '
				+ this.name + ' is to be linked too its child table '
				+ this.nestedTableName + '. This column does not exist');
		return;
	}
	this.nestOnIdx = field.columnIdx;

	// column from the child table
	field = tbl.columns[this.nestedTableColumnName];
	if (!field) {
		debug(this.nestedTableColumnName
				+ ' is declared as nestedTableColumnName to link parent table '
				+ this.name + ' with nested table ' + this.nestedTableName
				+ '. this column is not defined in the nested table.');
		return;
	}
	tbl.nestedColumnIdx = field.columnIdx;
};

ListOrGridTable.prototype.setNestedTr = function(div) {
	var tr = this.tableBodyObject.parentNode.insertRow(0);
	tr.style.display = 'none';
	var td = tr.insertCell(0);
	td.colSpan = this.htmlRowToClone.cells.length;
	td.appendChild(div);
	this.nestedTableTr = tr;
};
ListOrGridTable.prototype.EXIL_EXPANDED = 'exil-expanded';
ListOrGridTable.prototype.showNestedTable = function(tr) {
	if (tr.getAttribute(this.EXIL_EXPANDED)) {
		tr.removeAttribute(this.EXIL_EXPANDED);
		this.nestedTableTr.style.display = 'none';
		return;
	}

	if (this.nestedTableTr.parentNode) // it is right now displayed
	{
		var ele = this.nestedTableTr.previousSibling; // tr for which nested
		// rows are currently
		// shown
		if (ele)
			ele.removeAttribute(this.EXIL_EXPANDED); // users should change
		// the icon based on
		// this attribute
		this.nestedTableTr.parentNode.removeChild(this.nestedTableTr);
	}
	this.currentRow = tr.rowIdx;
	var nextTr = tr.nextSibling;
	if (nextTr)
		this.tableBodyObject.insertBefore(this.nestedTableTr, nextTr);
	else
		this.tableBodyObject.appendChild(this.nestedTableTr);
	tr.setAttribute('exil-expanded', 'exil-expanded');
	this.nestedTable.filterData(this.nestedTableColumnName,
			this.grid[this.currentRow][this.nestOnIdx], 'eq');
	this.nestedTableTr.style.display = '';
};

// two tables repeat in-synch based on a column. I don't rememebr why I coined
// the terms younger/elder brother...
ListOrGridTable.prototype.initBrothers = function(otherTableName) {
	var otherTable = this.P2.tables[otherTableName];
	if (!otherTable.inited)
		return;

	// trigger this only after both get inited
	// elder brother gets intied, while younger brother has only two objects
	// initialized
	if (this.elderBrother) {
		otherTable.initRepeatingPanel();
		this.repeatedPanels = new Object();
		this.nbrRepeatedPanels = 0;
	} else {
		this.initRepeatingPanel();
		otherTable.repeatedPanels = new Object();
		otherTable.nbrRepeatedPanels = 0;
	}
};

// cache teh column that is repeated. This is cloned while adding columns at run
// time
ListOrGridTable.prototype.cacheRepeatingColumn = function(doc) {
	var field = this.columns[this.repeatingColumnName];
	this.repeatedField = field;
	field.toBeSentToServer = false;

	// remove and cache repeating column, header and footer
	var ele = doc.getElementById(field.name).parentNode;
	this.repeatingColumnSibling = ele.nextSibling;
	this.repeatingColumnParent = ele.parentNode;
	this.repeatingColumnEle = this.repeatingColumnParent.removeChild(ele);

	ele = doc.getElementById(field.name + 'Label');
	this.repeatingHeaderSibling = ele.nextSibling;
	this.repeatingHeaderParent = ele.parentNode;
	this.repeatingHeaderEle = this.repeatingHeaderParent.removeChild(ele);

	if (this.columnSumIndexes || this.columnAverageIndexes) {
		ele = doc.getElementById(field.name + 'Footer');
		this.repeatingFooterSibling = ele.nextSibling;
		// Jun 11 2009 : BugID 532 - Column sum is not working in dynamic grid -
		// IndiaServices (Start) : Venkat
		this.repeatingFooterParent = ele.parentNode;
		this.repeatingFooterEle = this.repeatingFooterParent.removeChild(ele);
		// Jun 11 2009 : BugID 532 - Column sum is not working in dynamic grid -
		// IndiaServices (End) : Venkat
	}
	this.nbrColumnsRepeated = 0; // changes after a setData()

	if (field.rowSum)
		this.repeatedColumnToBeSummed = true;
	if (field.rowAverage)
		this.repeatedColumnToBeAveraged = true;
};

// A button that is thrown anywhere in the page with a predefined naming
// convention is to act navigationa button for this table
// find them and attach required event handlers for them
ListOrGridTable.prototype.initNavigationButtons = function() {
	// are there navigation buttons attched to this table?
	var buttons = new Object();
	var buttonFound = false;
	for ( var nav in NAVIGATION_ACTIONS) {
		var code = NAVIGATION_ACTIONS[nav];
		var btn = this.P2.doc.getElementById(this.name + nav);
		if (!btn) {
			// debug(this.name + nav + ' is not defined as a button for ' +
			// this.name);
			if (!this.linkedDisplayTable)
				continue;
			// possible that the button is inside the linked display panel
			btn = this.P2.doc.getElementById(this.linkedDisplayTable.name + '_'
					+ this.name + nav);
			if (!btn)
				continue;
		}
		// debug('onclick for ' + btn.id + ' set to ' + nav + ' action for table
		// ' + this.name);
		btn.tableName = this.name;
		btn.navigationAction = code;
		btn.disabled = code != 'new'; // all buttons except new should be
		// disabled by default.
		this.P2.addListener(btn, 'click', this, 'navigate');
		buttons[code] = btn;
		buttonFound = true;
	}
	if (buttonFound)
		this.navigationButtons = buttons;
};

// populate this.linkedColumns as an array of corresponding columns from the
// linked table
// IMP: this is triggered by P2.init(). That ensures that the links are
// available before tables do any activity
ListOrGridTable.prototype.createLinks = function() {
	if (this.nestedTableName) {
		this.initNestedTable();
	}

	if (!this.mergeWithTableName)
		return;

	var table = this.P2.tables[this.mergeWithTableName];
	if (!table) {
		debug(this.name + ' uses ' + this.mergeWithTableName
				+ ' but that table does not exist');
		return;
	}
	this.mergeWithTable = table;
	if (this.stubNameForMerging) // merge with a repeating display panel
	{
		if (!table.tablesToBeMerged) {
			table.tablesToBeMerged = [];
			table.stubsForMergingTables = [];
		}
		table.tablesToBeMerged.push(this);
		table.stubsForMergingTables.push(this.stubNameForMerging);
	} else if (this.mergeOnColumnName) {
		table.childTableToMerge = this;
	} else {
		debug('ERROR:'
				+ this.name
				+ ' is to be merged with '
				+ this.mergeWithTableName
				+ ' but neither stubNameForMerging nor mergeOnColumnName is specified.');
		return;
	}

	// if data is set to this table before the one this is going to merge into,
	// we will have problem because the stubs wouldn't have been cloned
	// hence we should ask P2 not to set data directly to this. Instead, table
	// with with this is going to merge will call setData for this table
	this.doNotSetDataToMe = true; // this panel will take care of that.
	// Otherwise, we have timing issue.
	// and, this panel is not going to be visible.
	this.P2.hideOrShowPanels([ this.name ], 'none');
};

ListOrGridTable.prototype.mergeChildPanel = function(panel, colName, colValue) {
	var col = this.columns[colName];
	if (!col) {
		debug('ERROR: ' + this.name + ' is missing a column by name ' + colName
				+ ' that is used for merging child table with it.');
		return;
	}

	var idx = col.columnIdx;
	var n = this.grid.length;
	var rowIdx = null;
	for ( var i = 1; i < n; i++) {
		if (colValue == this.grid[i][idx]) {
			rowIdx = i;
			break;
		}
	}
	if (rowIdx == null) {
		debug('ERROR: ' + this.name + ' does not have a row with a value of '
				+ colValue + ' in column ' + colName
				+ '. Child table rows are not merged properly.');
		return;
	}
	var tr = this.P2.doc.getElementById(this.name + rowIdx);
	if (tr.tagName == 'TR') {
		tr = this.tableBodyObject.parentNode.insertRow(tr.rowIndex + 1);
		var td = tr.insertCell(0);
		td.colSpan = this.htmlRowToClone.cells.length;
		td.append(panel);
	} else // this list/grid is rendered as a display panel
	{
		tr.appendChild(panel);
	}
};

ListOrGridTable.prototype.initFrozenPanel = function(doc) {
	var body = doc.getElementById(this.name + 'RightBody');
	if (!body)
		body = doc.getElementById(this.name + 'Right');
	this.rightTableBodyObject = body.tBodies[0];
	var firstRow = this.rightTableBodyObject.firstChild;
	firstRow.rowIdx = 0;
	firstRow.id = this.name + 'Right0';
	this.rightHtmlRowToClone = this.rightTableBodyObject.removeChild(firstRow);
	// scroll
	body = doc.getElementById(this.name + 'ScrollBody');
	if (!body)
		return;
	this.scrollTableBodyObject = body.tBodies[0];
	firstRow = this.scrollTableBodyObject.firstChild;
	firstRow.rowIdx = 0;
	firstRow.id = this.name + 'Scroll0';
	this.scrollHtmlRowToClone = this.scrollTableBodyObject
			.removeChild(firstRow);
};

ListOrGridTable.prototype.cloneFrozenRow = function(clsName, idx) {
	var newRow = this.rightHtmlRowToClone.cloneNode(true);
	newRow.className = clsName;
	newRow.rowIdx = idx; // set the pointer to the data row
	newRow.id = this.name + 'Right' + idx; // in case I need to reach the tr
	// with just the index...
	this.rightTableBodyObject.appendChild(newRow);

	if (!this.scrollHtmlRowToClone)
		return;
	newRow = this.scrollHtmlRowToClone.cloneNode(true);
	newRow.className = clsName;
	newRow.rowIdx = idx; // set the pointer to the data row
	newRow.id = this.name + 'Scroll' + idx; // in case I need to reach the tr
	// with just the index...
	if (this.actionDisabled) {
		newRow.style.cursor = 'default';
		newRow.title = 'click action disabled';
	}
	this.scrollTableBodyObject.appendChild(newRow);
};

// data is received from server in a dc. Set it to the table
ListOrGridTable.prototype.setData = function(dc, rowsToBeAppended,
		isFromAppendRows, listServiceOnLoad) // Aug 06 2009 : Bug ID 631 -
// suppressDescOnLoad is not
// working - WeaveIT: Venkat
{
	if (this.htmlFragments) {
		this.setDataToTemplate(dc);
		return;
	}

	if (this.repeatOnFieldName) // repeating panel
	{
		this.setDataToRepeatingPanel(dc, listServiceOnLoad);
		this.aggregate();
		if (this.childTableToMerge)
			this.childTableToMerge.setData(dc, rowsToBeAppended,
					isFromAppendRows);
		return;
	}

	if (this.pageSize) {
		// saved for pagination
		this.initPagination(dc);
	}

	var data = dc.grids[this.name];
	var nbrRows = data.length;

	/**
	 * what about any sorted column?
	 */
	if (this.sortByColumn) {
		this.resetSortImage(this.sortByColumn);
	}
	if (rowsToBeAppended) {
		if (nbrRows < 2)
			return;
		if (!this.serverData)
			this.serverData = [ data[0] ];
		for ( var i = 1; i < nbrRows; i++)
			this.serverData.push(data[i]);
	} else {
		/**
		 * one very special case we have to handle. If this table has a nested
		 * table, it is possible tha the nested table dom element is being
		 * displayed as a tr of this table. We have to save that before removing
		 * all rows, and add it afterwords
		 */
		var nestedDiv = this.nestedTableName
				&& this.P2.doc.getElementById(this.nestedTableName);
		if (nestedDiv) {
			nestedDiv.parentNode.removeChild(nestedDiv);
		}
		this.deleteAllRows();
		if (nestedDiv) {
			this.setNestedTr(nestedDiv);
		}
		this.serverData = data;
	}

	var repeatedData = null;
	if (this.repeatedField) {
		var childTable = dc.grids[this.childTableName];
		this.childGrid = childTable;
		if (this.childKeysTableName) {
			var keys = dc.grids[this.childKeysTableName];
			if (!keys) {
				// Oct 28 2008 : Incorporating Changes from Tanmay : Aravinda
				message("Design Error : Dc is to contain a grid with name = "
						+ this.childKeysTableName, "Error", "Ok", null, null,
						null);
				return;
			}
			repeatedData = this.createDataForRepeatedColumns(childTable, false);
			repeatedData.keys = keys;
		} else
			repeatedData = this.createDataForRepeatedColumns(childTable, true);

		this.repeatedData = repeatedData;
		this.repeatColumns();
	}

	// Has the designer asked for a message on no data?
	var doc = this.P2.doc;
	var msgEle = doc.getElementById(this.name + 'NoData');
	if (msgEle) {
		var tblEle = doc.getElementById(this.panelName)
				|| doc.getElementById(this.name);
		var topEle = doc.getElementById(this.panelName + 'Top');
		var totalRowsEle = doc.getElementById(this.name + 'PaginationData');
		if (nbrRows < 2) {
			if (!rowsToBeAppended) {
				msgEle.style.display = '';
				tblEle.style.display = 'none';
				if (topEle)
					topEle.className = 'collapsedfieldset';
				// April 21 2011 : Synching Bhandi's Changes for handling
				// pagination and no data - Exility App (Start) : Aravinda
				if (totalRowsEle)
					totalRowsEle.style.display = 'none';
				// April 21 2011 : Synching Bhandi's Changes for handling
				// pagination and no data - Exility App (End) : Aravinda
			}
		} else {
			msgEle.style.display = 'none';
			tblEle.style.display = '';
			if (topEle)
				topEle.className = 'expandedfieldset';
			// April 21 2011 : Synching Bhandi's Changes for handling pagination
			// and no data - Exility App (Start) : Aravinda
			if (totalRowsEle)
				totalRowsEle.style.display = '';
			// April 21 2011 : Synching Bhandi's Changes for handling pagination
			// and no data - Exility App (End) : Aravinda
		}
	}
	// should we reset pagination panel?
	if (this.pgEle) {
		this.pgEle.style.display = (nbrRows < 2) ? 'none' : '';
	}
	// reset quicksearch
	if (this.quickSearchEle) {
		this.quickSearchReset();
	}

	if (nbrRows < 2) {
		// are there navigaiton buttons?
		this.resetNavigationButtons();
		// and columnTotals?
		if (this.aggregate)
			this.aggregate();
		if (this.initialNumberOfRows && exilParms.displayInitialRows) {
			this.addRows(this.initialNumberOfRows, null, true,
					listServiceOnLoad);
		}
		this.numberOfOrigDataRows = 0;

		return;
	}

	var serverNames = data[0]; // first row is names
	// let us make a map of recd col to field. fieldCols[i] = j means the ith
	// column value is found in jth column of recd data
	var fieldCols = getcolumnToColumnMap(serverNames, this.columnNames);
	var doc = this.P2.doc;
	this.fieldCols = fieldCols;

	this.currentRow = this.grid.length - 1; // will be incremented
	for ( var i = 1; i < nbrRows; i++) {
		this.currentRow++;
		// add an html row
		var newRow = this.htmlRowToClone.cloneNode(true);
		var newDataRow = new Array(this.nbrColumns);
		var clsName = (this.currentRow % 2) ? 'row2' : 'row1';
		newRow.className = clsName;
		newRow.rowIdx = this.currentRow; // set the pointer to the data row
		newRow.id = this.name + this.currentRow; // in case I need to reach
		// the tr with just the
		// index...
		this.tableBodyObject.appendChild(newRow);
		newDataRow.tr = newRow;

		if (this.frozenColumnIndex) {
			this.cloneFrozenRow(clsName, this.currentRow);
			newDataRow.righTr = this.rightTableBodyObject.lastChild;
		}

		// is there a delete checkbox/img?
		var delObj = doc.getElementById(this.name + '_' + this.name + 'Delete');
		if (delObj)
			delObj.id = delObj.id + '__' + this.currentRow;
		// add a data row
		if (rowsToBeAppended)
			newDataRow.isAppended = true;
		this.grid.push(newDataRow);
		this.addDataToARow(doc, newDataRow, newRow.rowIdx, data[i], fieldCols,
				null, isFromAppendRows, listServiceOnLoad); // Aug 06 2009 : Bug
		// ID 631 -
		// suppressDescOnLoad
		// is not working -
		// WeaveIT: Venkat

		// code block for listPanel with tree view.
		if (this.treeViewColumnName && this.treeViewKeyColumn
				&& this.treeViewParentKeyColumn && this.treeViewHasChildColumn) {
			this.renameTreeIds(i);
			this.treeViewIndentRow(i, newDataRow, newRow);
		}

		if (this.repeatedField) {
			var pkey = newDataRow[this.idIdx];
			this.setDataToRepeatedColumns(doc, pkey, i);
		}
	}
	if (this.treeViewColumnName) {
		// clear the bulk checkbox in header
		var bulkChk = this.P2.doc.getElementById(this.name + 'BulkCheck');
		if (bulkChk)
			bulkChk.checked = false;
	}
	if (this.initialNumberOfRows && this.initialNumberOfRows > nbrRows
			&& exilParms.displayInitialRows) {
		this.addRows(this.initialNumberOfRows - nbrRows, null, true,
				listServiceOnLoad);
	}
	/*
	 * Sorting failed in Table in case of initialNumberofRows < actual number of
	 * rows in the grid because this.numberOfOrigDataRows is not initialized.
	 * --Pathfinder Harsha Bhat
	 */
	if (nbrRows > 1)
		this.numberOfOrigDataRows = nbrRows;

	this.nbrRows += nbrRows - 1; // Nov 27 2008 : If data already exists,
	// rows will be incremented : Aravinda
	if (!rowsToBeAppended)
		this.simulateClickIfRequired();

	if (this.hasAggregates)
		this.aggregate();

	this.hideOrShowColumns();
	this.resetNavigationButtons();
	// setting data to child table is our responsibility
	if (this.childTableToMerge)
		this.childTableToMerge.setData(dc);
};

/**
 * template based table. When data is received, we concatenate fragments to
 * create new innerHTML for the parent node
 */
ListOrGridTable.prototype.setDataToTemplate = function(dc) {
	var htmlText = "";
	var grid = dc.grids[this.name];
	/**
	 * no-data fragment is the second row
	 */
	var noDataText = "";
	var fragment = this.htmlFragments[1];
	if (fragment && fragment[0] == 1) {
		noDataText = fragment[2];
	}

	if (!grid || grid.length < 2) {
		htmlText = noDataText;
	} else {
		var t = [];
		var tableStartsAt = 1;
		fragment = this.htmlFragments[0]; // initial text
		if (noDataText) {
			fragment = this.htmlFragments[2];
			tableStartsAt = 3;
		}
		t.push(fragment[2]); // initial data before repeating for each row of
		// the table
		var f = this.getHtmlForATable(t, dc, grid, tableStartsAt);
		t.push(this.htmlFragments[f][2]);
		htmlText = t.join('');
	}

	this.tableBodyObject.innerHTML = htmlText;
};

/**
 * append html fragments and column values
 * 
 * @param t
 *            array to be used for pusing text
 * @param dc
 *            data store
 * @param data
 *            data table. first row is header and others are data rows
 * @param startAt
 *            pointer to this.htmlFragments to start at. This HAS to be a
 *            begin-data fragment
 */
ListOrGridTable.prototype.getHtmlForATable = function(t, dc, data, startAt) {
	if (!data || !data.length || data.length < 2) {
		debug("no data rows found for an embedded table "
				+ this.htmlFragments[startAt][1]);
		return;
	}

	var fragment = this.htmlFragments[startAt];
	var initialText = fragment[2];
	var indexToReturn = null;
	/**
	 * for each row in data (first row is header) append all framgents
	 */
	for ( var i = 1; i < data.length; i++) {
		t.push(initialText);
		var row = data[i];

		/**
		 * push each fragment, till we hit end of this table. For safety, we are
		 * putting end of fragments as teh limit for this loop, but it is a bug
		 * if we hit there
		 */
		var f = startAt + 1;
		var nbrFragments = this.htmlFragments.length;
		while (f < nbrFragments) {
			fragment = this.htmlFragments[f];
			var fragmentType = fragment[0];
			/**
			 * type can have only three values 3 : beginning of another table, 4 :
			 * end of table, 5 : column
			 */
			if (fragmentType == 4) {
				indexToReturn = f;
				break;
			}

			if (fragmentType == 3) {
				var tableName = fragment[1];
				var childRows = this.filterRowsFromChildTable(
						dc.grids[tableName], row[0]);
				f = this.getHtmlForATable(t, dc, childRows, f);
				t.push(this.htmlFragments[f][2]);
			} else if (fragmentType == 5) {
				/**
				 * push column value followed by the next html fragment
				 */
				var idx = fragment[1];
				// idx is 1 based, with 0 means the row index itself
				if (idx == 0)
					t.push(i);
				else
					t.push(row[idx - 1]);
				t.push(fragment[2]);
			} else {
				debug("Error in algorithm. Unable to create inner html for rows of table "
						+ this.tableName);
			}
			f++;
		}
	}
	return indexToReturn;
};

/**
 * filter rows from data based on supplied key
 * 
 * @param data
 *            second column in this table is assumed to be the "foreign key"
 *            that should match the supplied key
 * @param key
 *            to be used for filtering
 */
ListOrGridTable.prototype.filterRowsFromChildTable = function(data, key) {
	/**
	 * pardon me for being a person with negative outlook :-)
	 */
	if (!data || !data.length || !data[0] || !(data[0].length > 1))
		return [ [] ];

	var filteredGrid = [ data[0] ]; // start with the header row
	for ( var i = 1; i < data.length; i++) {
		var row = data[i];
		if (row[1] == key) {
			filteredGrid.push(row);
		}
	}
	debug(filteredGrid.length + " rows filtered. This iincludes the header row");
	return filteredGrid;
};

/**
 * initialize for template based panel. As of now, we just cache the top element
 * whose innerHTML will be reset at run time
 */
ListOrGridTable.prototype.initTemplate = function() {
	this.tableBodyObject = this.P2.doc.getElementById(this.name);
	if (!this.tableBodyObject) {
		alert('An element with id '
				+ this.name
				+ ' is required for this page to work properly. It is missing in the html template used by this page.');
	}

};

ListOrGridTable.prototype.simulateClickIfRequired = function() {
	// debug('this.simulateClickOnFirstRow=' + this.simulateClickOnFirstRow + '
	// and this.simulateClickOnRow=' + this.simulateClickOnRow);
	var idx;
	if ((this.simulateClickOnFirstRow)
			|| (this.simulateClickOnRow == rowType.first)) {
		idx = 1;
	}

	else if (this.simulateClickOnRow == rowType.current) {
		idx = this.currentRow;
	} else if (this.simulateClickOnRow == rowType.next) {
		idx = this.getNextRow(this.currentRow, false, false) || this.currentRow;
	} else
		return false;
	debug('going to simulate a click on ' + this.name);
	this.clicked(this.P2.doc.getElementById(this.name + idx));
	return true;
};
// reset row1/row2 class names for rows. This is useful if soome rows are to be
// hidden by user script
ListOrGridTable.prototype.setRowCss = function() {
	var rows = this.tableBodyObject.childNodes;
	if (!rows || !rows.length)
		return;
	var firstRow = true;
	for ( var i = 0; i < rows.length; i++) {
		var tr = rows[i];
		if (tr.style.display == 'none')
			continue;
		tr.className = firstRow ? 'row1' : 'row2';
		firstRow = !firstRow;
	}
};

ListOrGridTable.prototype.deleteAllRows = function() {
	// remove rows from the table dom object
	var tBody = this.tableBodyObject;
	var len;
	// IE does not like innerHTML for table compnents
	if (tBody.deleteRow && tBody.rows.length) {
		len = tBody.rows.length;

		while (--len >= 0)
			tBody.deleteRow(len);
	} else // rendered as display panel
	{
		tBody.innerHTML = '';
	}

	if (this.frozenColumnIndex) {
		tBody = this.rightTableBodyObject;
		len = this.rightTableBodyObject.childNodes.length;
		// this is guaranteed to be tbody..
		while (--len >= 0)
			tBody.deleteRow(len);
		tBody = this.scrollTableBodyObject;
		if (tBody) {
			len = this.rightTableBodyObject.childNodes.length;
			while (--len >= 0)
				tBody.deleteRow(len);
		}
	}

	// remove rows from data
	this.grid.length = 1;
	this.nbrRows = 0;

	// done if no repeating field, or if last time there were no repeated
	// columns
	if (!this.repeatedField || !this.nbrColumnsRepeated)
		return;

	var ele;
	while (this.nbrColumnsRepeated) {
		this.nbrColumnsRepeated--;
		if (this.repeatingHeaderSibling)
			ele = this.repeatingHeaderSibling.previousSibling;
		else
			ele = this.repeatingHeaderParent.lastChild;
		this.repeatingHeaderParent.removeChild(ele);

		if (this.repeatingColumnSibling)
			ele = this.repeatingColumnSibling.previousSibling;
		else
			ele = this.repeatingColumnParent.lastChild;
		this.repeatingColumnParent.removeChild(ele);

		if (!this.repeatingFooterParent)
			continue;

		if (this.repeatingFooterSibling)
			ele = this.repeatingFooterSibling.previousSibling;
		else
			ele = this.repeatingFooterParent.lastChild;
		this.repeatingFooterParent.removeChild(ele);
	}
};

ListOrGridTable.prototype.deleteAllRowsFromRepeatingPanel = function() {
	for ( var i = 0; i < this.addedElements.length; i++) {
		var ele = this.addedElements[i];
		if (ele && ele.parentNode)
			ele.parentNode.removeChild(ele);
	}
	this.addedElements = new Array();
	this.repeatedPanels = new Object();
	this.nbrRepeatedPanels = 0;
};
/**
 * definitely needs refactoring. This method is probably the lenghtiest I have
 * seen
 */
ListOrGridTable.prototype.addDataToARow = function(doc, localRow, rowIdx,
		serverRow, fieldCols, key, isFromAppendRows, listServiceOnLoad) {
	var ele;
	var suffix = '__' + rowIdx;
	// is there a sequence number?
	if (this.addSeqNo) {
		ele = doc.getElementById(this.name + 'SeqNo');
		if (!ele)
			debug('sequence number field not found for table ' + this.name);
		else {
			ele.id += suffix;
			ele.innerHTML = rowIdx;
		}
	}

	var delEle = doc
			.getElementById(this.name + '_' + this.panelName + 'Delete');
	if (delEle) {
		var delEleNewId = delEle.id + suffix;
		delEle.id = delEleNewId;
	}

	if (this.rowsCanBeDeleted) {
		ele = doc.getElementById(this.name + '_' + this.name + 'Delete');
		if (ele) {
			ele.id += suffix;
			ele.rowIdx = rowIdx;
		}
	}

	var n = this.columnNames.length;
	var val;
	var changedFields = new Array();
	var changedField = null;
	var defaultDataRow = new Array();
	if ((this.dataForNewRowToBeClonedFromFirstRow || (this.dataForNewRowToBeClonedFromRow == rowType.first))
			&& isFromAppendRows && (this.grid.length > 2)) {
		var rowLength = 1;
		for (rowLength = 1; rowLength < this.grid.length; rowLength++) {
			if (this.grid[rowLength])
				break;
		}
		for ( var defColCtr = 0; defColCtr < n; defColCtr++) {
			defaultDataRow[defColCtr] = this.grid[rowLength][defColCtr];
		}
		if (this.newRowColumnsNotToBePopulatedWithData
				&& this.newRowColumnsNotToBePopulatedWithData != "") {
			var newRowColumns = this.newRowColumnsNotToBePopulatedWithData
					.split(',');
			for ( var newRowColCtr = 0; newRowColCtr < newRowColumns.length; newRowColCtr++) {
				for ( var colCtr = 0; colCtr < n; colCtr++) {
					if (this.columnNames[colCtr] == newRowColumns[newRowColCtr]) {
						var curColumn = this.columns[this.columnNames[colCtr]];
						if (curColumn.defaultValue)
							defaultDataRow[colCtr] = curColumn.defaultValue;
						else
							defaultDataRow[colCtr] = "";

						break;
					}
				}
			}
		}
	} else if ((this.dataForNewRowToBeClonedFromRow == rowType.last)
			&& isFromAppendRows && (this.grid.length > 2)) {
		var lastNonNullRow = this.grid.length - 2;
		while (((!this.grid[lastNonNullRow]) && (lastNonNullRow > 0))
				|| (this.grid[lastNonNullRow].isDeleted))
			lastNonNullRow--;
		for ( var defColCtr = 0; defColCtr < n; defColCtr++) {
			defaultDataRow[defColCtr] = this.grid[lastNonNullRow][defColCtr];
		}
		if (this.newRowColumnsNotToBePopulatedWithData
				&& this.newRowColumnsNotToBePopulatedWithData != "") {
			var newRowColumns = this.newRowColumnsNotToBePopulatedWithData
					.split(',');
			for ( var newRowColCtr = 0; newRowColCtr < newRowColumns.length; newRowColCtr++) {
				for ( var colCtr = 0; colCtr < n; colCtr++) {
					if (this.columnNames[colCtr] == newRowColumns[newRowColCtr]) {
						var curColumn = this.columns[this.columnNames[colCtr]];
						if (curColumn.defaultValue)
							defaultDataRow[colCtr] = curColumn.defaultValue;
						else
							defaultDataRow[colCtr] = "";

						break;
					}
				}
			}
		}
	} else if ((this.dataForNewRowToBeClonedFromRow == rowType.current)
			&& isFromAppendRows && (this.grid.length > 2)) {
		for ( var defColCtr = 0; defColCtr < n; defColCtr++) {
			defaultDataRow[defColCtr] = this.grid[this.currentRow][defColCtr];
		}
		if (this.newRowColumnsNotToBePopulatedWithData
				&& this.newRowColumnsNotToBePopulatedWithData != "") {
			var newRowColumns = this.newRowColumnsNotToBePopulatedWithData
					.split(',');
			for ( var newRowColCtr = 0; newRowColCtr < newRowColumns.length; newRowColCtr++) {
				for ( var colCtr = 0; colCtr < n; colCtr++) {
					if (this.columnNames[colCtr] == newRowColumns[newRowColCtr]) {
						var curColumn = this.columns[this.columnNames[colCtr]];
						if (curColumn.defaultValue)
							defaultDataRow[colCtr] = curColumn.defaultValue;
						else
							defaultDataRow[colCtr] = "";

						break;
					}
				}
			}
		}
	} else if ((this.dataForNewRowToBeClonedFromRow == rowType.next)
			&& isFromAppendRows && (this.grid.length > 2)) {
		var nextRow = 0;
		if (this.grid.length > (this.currentRow + 2))
			nextRow = this.currentRow + 1;

		while (this.grid[nextRow] == null && nextRow < this.grid.length) {
			nextRow = nextRow + 1;
		}
		for ( var defColCtr = 0; defColCtr < n; defColCtr++) {
			defaultDataRow[defColCtr] = this.grid[nextRow][defColCtr];
		}

		if (this.newRowColumnsNotToBePopulatedWithData
				&& this.newRowColumnsNotToBePopulatedWithData != "") {
			var newRowColumns = this.newRowColumnsNotToBePopulatedWithData
					.split(',');
			for ( var newRowColCtr = 0; newRowColCtr < newRowColumns.length; newRowColCtr++) {
				for ( var colCtr = 0; colCtr < n; colCtr++) {
					if (this.columnNames[colCtr] == newRowColumns[newRowColCtr]) {
						var curColumn = this.columns[this.columnNames[colCtr]];
						if (curColumn.defaultValue)
							defaultDataRow[colCtr] = curColumn.defaultValue;
						else
							defaultDataRow[colCtr] = "";

						break;
					}
				}
			}
		}
	} else
		defaultDataRow = this.grid[0];

	/**
	 * if this is a nested child table, we need to populate the nested-on field
	 */
	var nestedParent = this.nestedParent;
	if (nestedParent) {
		defaultDataRow[this.nestedColumnIdx] = nestedParent
				.getKeyForNestedChild();
	}
	// for each field, rename id and push data
	for ( var j = 0; j < n; j++) {
		var columnName = this.columnNames[j];
		var field = this.columns[columnName];
		if (this.repeatedField && this.repeatedField == field)
			continue;
		ele = doc.getElementById(field.name);
		val = defaultDataRow[j];
		if (serverRow) {
			if (fieldCols && (fieldCols[j] || fieldCols[j] == 0)) // append
			// row case
			{
				val = serverRow[fieldCols[j]];
				if (val) {
					var dt = dataTypes[field.dataType];
					if (dt)
						val = dt.formatIn(val);
				}
			} else if (isFromAppendRows) {
				if (serverRow[j] == null || serverRow[j] == "")
					val = field.defaultValue;
				else
					val = serverRow[j];
			}
		} else if (key && field.name == this.repeatOnFieldName)
			val = key;
		else if (field.initSelection && this.cloneFlag == 0) // a dropdown.
			// see if we
			// have to
			// select first
			// option etc..
			// Oct 14 2009 :
			// Bug ID 722 -
			// Issue related
			// to clone row
			// - Weavit :
			// Vijay
			val = field.initSelection(ele);

		// id field is a must. If it is not there, we will have to generate -ve
		// numbers
		if (!val && this.idFieldName && j == this.idIdx) {
			if (this.localId)
				this.localId--;
			else
				this.localId = -1;
			val = this.localId;
			localRow.keyIsGenerated = true;
		}

		localRow[j] = val;
		if (!ele) {
			debug('DESIGN ERROR :table= ' + this.name + ' field =' + field.name
					+ ' is not found in dom');
			continue;
		}
		var objectVal = val;
		if (val && field.formatter)
			objectVal = field.format(val);
		field.setValueToObject(ele, objectVal);
		if ((val != defaultDataRow[j])
				|| ((val != "")
						&& (this.dataForNewRowToBeClonedFromFirstRow
								|| (this.dataForNewRowToBeClonedFromRow == rowType.current)
								|| (this.dataForNewRowToBeClonedFromRow == rowType.next)
								|| (this.dataForNewRowToBeClonedFromRow == rowType.first) || (this.dataForNewRowToBeClonedFromRow == rowType.last)) && isFromAppendRows)) // Oct
		// 22
		// 2009
		// :
		// Bug
		// ID
		// 744
		// -
		// Addrow
		// Issue
		// in
		// Dynamic
		// Tabpanel
		// -
		// SAB
		// Miller
		// :
		// Venkat
		{
			changedField = new Object();
			changedField.field = field;
			changedField.val = val;
			changedField.ele = ele;
			changedFields.push(changedField);
		}
		var newId = field.name + suffix;
		ele.id = newId;
		ele.rowIdx = rowIdx;
		if (field.isRadio) {
			// ele is the span element that contains all radio elements with
			// their labels.
			// We have to recreate them with changed names. only name= is
			// changed. name in event handlers should not be changed
			// we are using split and join as effective replace operation
			var curText = ele.innerHTML;
			var newText = curText.split(field.name + 'Radio').join(
					newId + 'Radio');
			ele.innerHTML = newText;
			field.setValueToObject(ele, objectVal);
		}

		if (field.isCheckbox && ele.innerHTML.length > 0) {
			var curText = ele.innerHTML;
			var newText = curText.split(field.name + 'Checkbox').join(
					newId + 'Checkbox');
			ele.innerHTML = newText;
			if (val) {
				var ValArr = val.split('|');
				for ( var k = 0; k < ValArr.length; k++) {
					for ( var i = 0; i < ele.childNodes.length; i++) {
						if (ele.childNodes[i].type
								&& ele.childNodes[i].type.toUpperCase() == "CHECKBOX") {
							if (ele.childNodes[i].value == ValArr[k])
								ele.childNodes[i].checked = true;
						}
					}
				}
			}
		}

		// is there a picker ?
		for ( var ri = 0; ri < relatedElementSuffixes.length; ri++) {
			ele = doc.getElementById(field.name + relatedElementSuffixes[ri]);
			if (ele) {
				ele.id = newId + relatedElementSuffixes[ri];
				ele.rowIdx = rowIdx;
			}

		}

	}
	// trigger fields changed events..
	for ( var i = 0; i < changedFields.length; i++) {
		changedField = changedFields[i];
		if (changedField.field.triggerFieldChangedEvents) {
			if (changedField.field.supressDescOnLoad && (!isFromAppendRows))
				changedField.field.triggerFieldChangedEvents(changedField.val,
						changedField.ele, rowIdx,
						changedField.field.supressDescOnLoad, true,
						listServiceOnLoad); // Aug 06 2009 : Bug ID 631 -
			// suppressDescOnLoad is not working
			// - WeaveIT: Venkat
			else
				changedField.field.triggerFieldChangedEvents(changedField.val,
						changedField.ele, rowIdx, false, true,
						listServiceOnLoad); // Aug 06 2009 : Bug ID 631 -
			// suppressDescOnLoad is not working
			// - WeaveIT: Venkat
		}
	}

	var buttonElements = this.htmlRowToClone.childNodes;
	for ( var i = 0; i < buttonElements.length; i++) {
		for ( var x = 0; x < buttonElements[i].childNodes.length; x++) {
			var buttonNode = new Array();
			buttonNode = buttonElements[i].childNodes[x];
			if (buttonNode.type
					&& (buttonNode.type.toUpperCase() == 'BUTTON'
							|| buttonNode.type.toUpperCase() == 'SUBMIT' || buttonNode.type
							.toUpperCase() == 'IMAGE')) {
				var ele = doc.getElementById(buttonNode.id);
				if (ele) {
					var newId = buttonNode.id + suffix;
					ele.id = newId;
					ele.rowIdx = rowIdx;
				}
			} else if (buttonNode.tagName
					&& buttonNode.tagName.toUpperCase() == 'TABLE'
					&& buttonNode.className == 'buttonelementtable') {
				var buttonNodes = new Array();
				buttonNodes = buttonNode.childNodes[buttonNode.childNodes.length - 1];
				var buttonNodeTables = buttonNodes.childNodes[0].childNodes;
				for ( var j = 0; j < buttonNodeTables.length; j++) {
					var ele = doc.getElementById(buttonNodeTables[j].id);
					if (ele) {
						var newId = buttonNodeTables[j].id + suffix;
						ele.id = newId;
						ele.rowIdx = rowIdx;

						for ( var k = 0; k < ele.childNodes.length; k++) {
							if (ele.childNodes[k].tagName
									&& ele.childNodes[k].tagName.toUpperCase() == 'FONT') {
								var newId = ele.childNodes[k].id + suffix;
								ele.childNodes[k].id = newId;
								ele.childNodes[k].rowIdx = rowIdx;
							}
						}
					}
				}
			}
		}
	}

	// for tree view
	if (this.treeViewColumnName) {
		this.treeViewIndentRow(rowIdx);
	}
};

/**
 * return key from current row for the nexted child row
 */
ListOrGridTable.prototype.getKeyForNestedChild = function() {
	return this.grid[this.currentRow][this.nestOnIdx];
};

ListOrGridTable.prototype.addInitialRowsToRepeatingPanel = function(dc,
		listServiceOnLoad) {
	var data = dc.grids[this.name];
	var serverNames = data[0];
	var keyName = this.P2.fields[this.repeatOnFieldName].unqualifiedName;
	var keyIdx = getColumnIndex(serverNames, keyName);
	var lastKey = null;

	for ( var i = 1; i < data.length; i++) {
		var serverData = data[i];
		var key = serverData[keyIdx];
		if (key != lastKey) {
			lastKey = key;
			var nbrToAdd = this.initialNumberOfRows
					- this.repeatedPanels[key].childNodes.length;
			if (nbrToAdd > 0) {
				this.addRows(nbrToAdd, key, true, listServiceOnLoad);
			}
		}
	}
};

ListOrGridTable.prototype.addRows = function(nbrRowsToAdd, key,
		isFromAddTableRow, listServiceOnLoad) // Aug 06 2009 : Bug ID 631 -
// suppressDescOnLoad is not
// working - WeaveIT: Venkat
{
	var tBody = key ? this.repeatedPanels[key] : this.tableBodyObject;
	if (this.maxRows && this.maxRows < (this.countAllRows() + nbrRowsToAdd)) {
		// Oct 28 2008 : Incorporating Changes from Tanmay : Aravinda
		message(
				'You can have a maximum of '
						+ this.maxRows
						+ ' data rows. If you intend to delete some rows, please do that before adding a new row',
				"Warning", "Ok", null, null, null);
		return;
	}
	var doc = this.P2.doc;
	var i = 1;
	while (i <= nbrRowsToAdd) {
		var n = this.grid.length;
		this.nbrRows++;
		var eles = this.htmlRowToClone.getElementsByTagName('INPUT');
		for ( var k = 0; k < eles.length; k++) {
			eles[k].removeAttribute('disabled', 0);
		}
		eles = this.htmlRowToClone.getElementsByTagName('SELECT');
		for ( var k = 0; k < eles.length; k++) {
			eles[k].removeAttribute('disabled', 0);
		}
		var eles = this.htmlRowToClone.getElementsByTagName('TEXTAREA');
		for ( var k = 0; k < eles.length; k++) {
			eles[k].removeAttribute('disabled', 0);
		}

		var newRow = this.htmlRowToClone.cloneNode(true);
		var clsName = (n % 2) ? 'row2' : 'row1';
		newRow.className = clsName;
		newRow.rowIdx = n; // set the pointer to the data row
		newRow.id = this.name + n; // in case I need to reach the tr with just
		// the index...
		if (this.actionDisabled) {
			newRow.style.cursor = 'default';
			newRow.title = 'row click is disabled';
		}
		tBody.appendChild(newRow);

		if (isFromAddTableRow && this.repeatedField)
			this.setDataToRepeatedColumns(doc, null, n);

		if (this.frozenColumnIndex) {
			this.cloneFrozenRow(clsName, n);
		}
		// add a data row
		var newDataRow = new Array(this.nbrColumns);
		newDataRow.addedByUser = true;
		this.grid.push(newDataRow);
		this.addDataToARow(doc, newDataRow, n, null, null, key,
				isFromAddTableRow, listServiceOnLoad); // Aug 06 2009 : Bug ID
		// 631 -
		// suppressDescOnLoad is
		// not working -
		// WeaveIT: Venkat
		i++;
		if (this.nestedTableOwner && isFromAddTableRow) {
			var ntOwner = this.P2.getTable(this.nestedTableOwner);
			var nestOnField = (ntOwner.nestOnColumnName) ? ntOwner.columns[ntOwner.nestOnColumnName]
					: null;

			if (!nestOnField) {
				return;
			}
			var nestOnFieldVal = this.P2.getFieldValue(nestOnField.name);

			// nestedOnField in nested table.
			var nestOnFieldName = this.columns[ntOwner.nestOnColumnName].name;

			if (!nestOnFieldName) {
				debug("Error: [" + ntOwner.nestOnColumnName
						+ "] is not exist for the grid [" + this.name + "]");
				return;
			}
			this.P2.setFieldValue(nestOnFieldName, nestOnFieldVal);

		}

	}
	if (this.totalRows)
		this.totalRows += nbrRowsToAdd;
	this.currentRow = this.grid.length - 1;
	// position cursor if required
	if (this.firstFieldName) {
		var eleName = this.getObjectId(this.firstFieldName, this.currentRow);
		try {
			doc.getElementById(eleName).focus();
		} catch (e) {
			//
		}
	}
	if (this.hasAggregates)
		this.aggregate();
	if (this.quickSearchEle) {
		this.quickSearchAdd(nbrRowsToAdd); // added rows to be
	}
	if (this.linkedDisplayTable) {
		var idxToClick = this.currentRow + nbrRowsToAdd - 1; // first row
		// that got
		// added
		this.clicked(doc.getElementById(this.name + idxToClick));
	} else
		this.resetNavigationButtons();
	// we may need to resize window
	this.P2.win.checkIframeSize();

};
ListOrGridTable.prototype.cloneRow = function(idx) {
	if (!idx)
		idx = this.currentRow;
	var doc = this.P2.doc;
	var tr = doc.getElementById(this.name + idx);
	if (!tr) {
		debug('Design Error : could not get row for insert with name = '
				+ this.name + idx);
		return;
	}
	tr = tr.nextSibling;
	var currentDataRow = this.grid[idx];
	var newDataRow = new Array();
	for ( var i = 0; i < currentDataRow.length; i++) {
		newDataRow[i] = currentDataRow[i];
	}
	newDataRow.addedByUser = true;

	// bulk action to be set to 'add'
	if (this.actionFieldName) {
		newDataRow[this.actionIdx] = 'add';
	}

	// whatabout the id?
	var pkey = null; // primary key. will be used if columns are repeated
	if (this.idFieldName) {
		pkey = newDataRow[this.idIdx];
		newDataRow[this.idIdx] = '';
	}
	this.nbrRows++;
	var n = this.grid.length; // this is the idx at which this row is going to
	// sit inside this.grids
	this.grid.push(newDataRow);

	var newRow = this.htmlRowToClone.cloneNode(true);
	newRow.className = (n % 2) ? 'row2' : 'row1';
	newRow.rowIdx = n; // set the pointer to the data row
	newRow.id = this.name + n; // in case I need to reach the tr with just the
	// index...
	if (tr)
		this.tableBodyObject.insertBefore(newRow, tr);
	else
		this.tableBodyObject.appendChild(newRow);

	this.addDataToARow(doc, newDataRow, n, null, null, null, true);
	// if (this.repeatedField)
	if (this.idFieldName) {
		// set id field to a local id (a negative number that helps in linking
		// child values to main row
		if (!this.localId)
			this.localId = 0;
		this.localId--;
		newDataRow[this.idIdx] = this.localId;
		newDataRow.keyIsGenerated = true;

		// copy childtable data as well for repeated columns
		if (this.repeatedField) {
			var data = this.repeatedData.data[pkey];
			var newData = new Object();
			for ( var x in data) {
				newData[x] = data[x];
			}
			this.repeatedData.data[this.localId] = newData;
			this.setDataToRepeatedColumns(doc, pkey, n);
		}
	}
	this.resetNavigationButtons();
	// we may need to resize window
	this.P2.win.checkIframeSize();

};

ListOrGridTable.prototype.getTBody = function(key, label) {
	var tbody = this.repeatedPanels[key];
	if (tbody)
		return tbody;
	// we have to add this.
	if (this.elderBrother) {
		var eb = this.P2.tables[this.elderBrother];
		eb.cloneAndAddPanel(key, label, this.name, this.elderBrother);
		eb.changeIdsOfAddedPanel(key);
	} else {
		this.cloneAndAddPanel(key, label, this.name, this.youngerBrother);
		if (this.youngerBrother) {
			var yb = this.P2.tables[this.youngerBrother];
			yb.changeIdsOfAddedPanel(key);
		}
	}

	return this.changeIdsOfAddedPanel(key);
};

ListOrGridTable.prototype.hideField = function(fieldName) {
	this.hideOrShowField(fieldName, 'none');
};

ListOrGridTable.prototype.hideOrShowField = function(fieldName, display) {
	var doc = this.P2.doc;
	var ele = doc.getElementById(fieldName + 'Label');
	// label is not to be hidden ???
	/*
	 * if(ele) { if(ele.tagName == 'th' || ele.tagName == 'TH')
	 * ele.style.display = display; else ele.parentNode.style.display = display; }
	 */
	for ( var i = 1; i < this.grid.length; i++) {
		var row = this.grid[i];
		if (!row)
			continue;
		var eleName = this.getObjectId(fieldName, i);
		ele = doc.getElementById(eleName);
		if (ele) {
			ele.style.display = display;
			ele = ele.nextSibling;
			if (ele && ele.nodeType == '3')
				ele = ele.nextSibling;
			if (ele)
				ele.style.display = display;
		}
	}
};
// SHOULD BE CHANGED TO GET COLIDX and used that rather than getting obj based
// id etc..
ListOrGridTable.prototype.hideOrShowColumns = function() {
	var doc = this.P2.doc;
	if (this.columnName && this.displayList) {
		var columnNames = new Array();
		var displayList = new Array();
		columnNames = this.columnName;
		displayList = this.displayList;
		for ( var j = 0; j < columnNames.length; j++) {
			var ele = doc.getElementById(columnNames[j] + 'Label');
			if (ele)
				ele.style.display = displayList[j];
			for ( var i = 1; i < this.grid.length; i++) {
				var row = this.grid[i];
				if (!row)
					continue;
				var eleName = columnNames[j] + '__' + i;
				ele = doc.getElementById(eleName);
				if (ele)
					ele.parentNode.style.display = displayList[j];
				if (ele.nextSibling)
					ele = ele.nextSibling;
				if (ele && ele.nodeType == '3')
					ele = ele.nextSibling;
				if (ele)
					ele.parentNode.style.display = displayList[j];
			}
			ele = doc.getElementById(columnNames[j] + 'Footer');
			if (ele)
				ele.style.display = displayList[j];
		}
	}
};

// called when mouse enters a row.
ListOrGridTable.prototype.mouseOver = function(tr, e, internalCall) {
	if (!tr.saveBgc)
		tr.saveBgc = tr.style.backgroundColor;
	if (exilParms.listHoverColor)
		tr.style.backgroundColor = exilParms.listHoverColor;
	if (internalCall) // avoid infinite recursion..
		return;

	if (this.frozenColumnIndex)// we have to simulate mouseover on the other
	// side as well
	{
		var otherId = 'Right';
		if (tr.id.indexOf('Right' + tr.rowIdx) > 0)// this is the left side
			otherId = '';
		var otherTr = this.P2.doc.getElementById(this.name + otherId
				+ tr.rowIdx);
		this.mouseOver(otherTr, e, true);
	}
	if (!PM.toolTipEle)
		return;
	// are we doing this always????
	var cursorX = 0;
	var cursorY = 0;

	if (e.pageX || e.pageY) {
		cursorX = e.pageX;
		cursorY = e.pageY;
	} else {
		cursorX = e.clientX
				+ (document.documentElement.scrollLeft || document.body.scrollLeft)
				- document.documentElement.clientLeft;
		cursorY = e.clientY
				+ (document.documentElement.scrollTop || document.body.scrollTop)
				- document.documentElement.clientTop;
	}

	var trValues = [];
	var cells = tr.cells;
	var n = tr.cells.length;
	for ( var cellctr = 0; cellctr < n; cellctr++) {
		trValues.push(cells[cellctr].innerHTML);
	}
	PM.toolTipEle.innerHTML = '<span class="field" style:"background-color: yellow;">'
			+ trValues.join('-') + '</span>';
	PM.toolTipStyle.top = cursorY + 130 + "px";
	PM.toolTipStyle.left = cursorX + 130 + "px";
	PM.toolTipStyle.display = 'inline';
};

// called when mouse leaves a row
ListOrGridTable.prototype.mouseOut = function(tr, e, internalCall) {
	tr.style.backgroundColor = tr.saveBgc || '';
	if (internalCall) // avoid infinite loop.
		return;
	if (this.frozenColumnIndex)// we have to simulate mouseover on the other
	// side as well
	{
		var otherId = 'Right';
		if (tr.id.indexOf('Right' + tr.rowIdx) > 0)// this is the left side
			otherId = '';
		var otherTr = this.P2.doc.getElementById(this.name + otherId
				+ tr.rowIdx);
		this.mouseOut(otherTr, e, true);
	}
	if (PM.toolTipEle) {
		PM.toolTipEle.innerHTML = '';
		PM.toolTipStyle.display = 'none';
	}
};

// PathFinder uses grid as list!!! onclick tbe implmented for grid
// called when user clicks on a row. This event is attached at the TR level.
// Hence ele would be a tr element
ListOrGridTable.prototype.clicked = function(tr, evt) {
	if (this.actionDisabled || this.P2.errorOccurred) // possible that a field
		// was in error and user
		// clicked on the row
		return false;

	var idx = tr ? tr.rowIdx : 1;
	var tr = this.P2.doc.getElementById(this.name + idx);
	if (!tr) {
		debug(this.name + ' has current row set to ' + this.currentRow
				+ ' and hence is not suitable to be clicked');
		return;
	}
	this.currentRow = idx;

	if (this.nestedTable)
		this.showNestedTable(tr);
	var data = new Array();
	data[0] = this.columnNames;
	// data[1] = this.grid[idx];
	data[1] = this.getClientRowWithServerData(idx) || this.grid[idx]; // Mar
	// 15
	// 2011
	// :
	// Changes
	// done
	// to
	// look
	// at
	// server
	// data
	// and
	// if
	// nothing
	// found,
	// fetch
	// client
	// data
	// -
	// Exis
	// :
	// Bhandi
	var rowIdx = tr.rowIdx;
	if (this.multipleSelect) {
		this.simulateClick(tr, null); // let simulator decide whether this is
		// to be selected or unselected
		if (this.onClickActionName)
			this.P2.act(tr, null, this.onClickActionName, data);
		return true;
	}

	// row clicked on a popup window for a description service
	var p2 = this.P2.win.currentP2;
	if (p2 && p2.pendingPicker) {
		// following line needs to be commented once Textile do a clean-up
		// data = [this.columnNames, this.grid[idx]];
		p2.codePickerReturned(data);
		return;
	}

	if (this.selectedRow) // some row was selected earlier
	{
		if (this.selectedRow != tr)
			this.simulateClick(this.selectedRow, false); // only one row to
		// be selected, so
		// deselect the
		// earlier one
	}
	this.simulateClick(tr, true);
	if (this.onClickActionName) {
		this.P2.act(tr, null, this.onClickActionName, data);
	}
	// is there a linked display panel?
	// debug(this.name + ' has its linkedDisplayTable set to ' +
	// this.linkedDisplayTable + ' with rowIdx= ' + rowIdx);
	if (this.linkedDisplayTable) {
		this.linkedDisplayTable.copyFromList(rowIdx);
		this.resetNavigationButtons();
	}

	scrollIntoView(tr); // this funcitons scrolls if required. defined in
	// utils.js
};

// called when user clicks on a row. This event is attached at the TR level.
// Hence ele would be a tr element
ListOrGridTable.prototype.dblClicked = function(tr) {
	debug("ListPanel.rowDblClicked() tableName=" + this.name);
	var idx;
	if (this.actionDisabled)
		return false;
	if (tr) {
		this.currentRow = idx = tr.rowIdx;
	} else {
		debug('clicked called with no tr for table ' + this.name
				+ ' Currrent row assumed');
		idx = this.currentRow;
		tr = this.P2.doc.getElementById(this.name + idx);
		if (!tr) {
			debug(this.name + ' has current row set to ' + this.currentRow
					+ ' and hence is not suitable to be clicked');
			return;
		}
	}

	if (this.onDblClickActionName)
		this.P2.act(tr, null, this.onDblClickActionName);

	return true;
};

ListOrGridTable.prototype.rowUp = function(tr) {
	debug("row up for " + this.name + ' with tr as ' + (tr && tr.nodeName));

	if (this.actionDisabled)
		return false;
	if (tr) {
		this.currentRow = tr.rowIdx;
	}
	var idx1 = this.currentRow;
	var idx2 = this.getNextRow(this.currentRow);
	if (!idx2) {
		debug(this.name + ' can not move the row ' + idx1
				+ ' up because there are no rows above this.');
		return false;
	}

	// swap data.
	var row = this.grid[idx1];
	this.grid[idx1] = this.grid[idx2];
	this.grid[idx2] = row;

	// move tr2 after tr1
	var tr1 = this.P2.doc.getElementById(this.name + idx1);
	var tr2 = this.P2.doc.getElementById(this.name + idx2);
	tr2.parentNode.removeChild(tr2);
	tr2.parentNode.appendChild(tr2, tr1);

	// are there linked rows?
	if (this.rightTableBodyObject) {
		tr1 = this.P2.doc.getElementById(this.name + 'Right' + idx1);
		tr2 = this.P2.doc.getElementById(this.name + 'Right' + idx2);
		tr2.parentNode.removeChild(tr2);
		tr2.parentNode.appendChild(tr2, tr1);
	}
	return true;
};

// finds the next/prev row that is visible. optionally you can opt to wrap.
ListOrGridTable.prototype.getNextRow = function(fromWhere, toGoBackwards,
		toWrap) {
	if (this.sortByColumn)
		return this.getNextSortedRow(fromWhere, toGoBackwards, toWrap);

	var n = this.grid.length;
	if (n <= 1 || this.nbrRows == 0) // this.nbrRows is the actual count
		// after excludiing possible null rows
		// in grid
		return 0;

	// for finding next row
	var incr = 1;
	var endAt = n;
	var restartAt = 1;
	if (toGoBackwards) // find previous row
	{
		incr = -1;
		endAt = 0;
		restartAt = n - 1;
	}

	if (!toWrap) // we should not restart
		restartAt = 0;
	var tryAt = fromWhere + incr; // row to check if it is visible

	// We are ready tp start, except for one special case;
	// if fromWhere itself is outside range, let us start search from the edge
	if (fromWhere <= 0 || fromWhere >= n) {
		restartAt = 0; // no need to wrap, we will check from end to end
		if (toGoBackwards)
			tryAt = n - 1;
		else
			tryAt = 1;
	}

	var tr;
	while (true) // of ourse this is not an infinite loop
	{
		if (tryAt == fromWhere) // we have wrapped and tried all rows in the
			// grid.
			return 0;

		if (tryAt == endAt)// we have hit the edge
		{
			if (restartAt == 0) // and we are not supposed to restart from the
				// other end
				return 0;

			tryAt = restartAt;
			restartAt = 0; // so that we stop looping again.
		}

		if (this.grid[tryAt]) {
			// is it hidden by any chance?
			tr = this.P2.doc.getElementById(this.name + tryAt);
			if (tr.style.display != 'none')
				return tryAt;
		}

		tryAt = tryAt + incr;
	}
	return 0;
};

ListOrGridTable.prototype.getNextSortedRow = function(fromWhere, toGoBackwards,
		toWrap) {
	var n = this.grid.length;
	if (n <= 1 || this.nbrRows == 0) // this.nbrRows is the actual count
		// after excludiing possible null rows
		// in grid
		return 0;

	var tr = this.P2.doc.getElementById(this.name + fromWhere);
	if (!tr) // fromWhere could be outside, or deleted
		toWrap = true; // ensure that we try something

	while (tr || toWrap) {
		if (tr)// get the next tr
		{
			if (toGoBackwards)
				tr = tr.previousSibling;
			else
				tr = tr.nextSibling;
		} else // get the next tr as the last/first
		{
			if (toGoBackwards)
				tr = this.tableBodyObject.lastChild;
			else
				tr = this.tableBodyObject.firstChild;
			toWrap = false; // Safe to switch this off to take care of situation
			// when there are no visible rows.
		}
		if (tr && tr.style.display != 'none')
			return tr.rowIdx;
	}
	return 0;
};

ListOrGridTable.prototype.getClientRowWithServerData = function(idx) {
	var arr = new Array();
	// Mar 15 2011 : Changes done to look at server data and if nothing found,
	// fetch client data - Exis : Bhandi
	var data = this.serverData && this.serverData[idx];
	if (!data)
		return null;
	// Mar 15 2011 : Changes done to look at server data and if nothing found,
	// fetch client data - Exis : Bhandi
	for ( var i = 0; i < this.nbrColumns; i++) {
		var j = this.fieldCols[i];
		var val = '';
		if (j || j == 0)
			val = data[j];
		else {
			var colName = this.columnNames[i];
			var col = this.columns[colName];
			if (col.defaultValue)
				val = col.defaultValue;
		}
		arr.push(val);
	}
	return arr;
};

// simulate a selected/unselect. toSelect=false means unselect
ListOrGridTable.prototype.simulateClick = function(tr, toSelect) {
	var otherTr = null;
	if (this.frozenColumnIndex)// we have to simulate click on the other table
	// as well
	{
		var otherId = 'Right';
		if (tr.id.indexOf('Right' + tr.rowIdx) > 0)// this is the left side
			otherId = '';
		otherTr = this.P2.doc.getElementById(this.name + otherId + tr.rowIdx);
		// we need to use left row as tr.
		if (!otherId) {
			var t = tr;
			tr = otherTr;
			otherTr = t;
		}
	}
	if (toSelect == null) {
		toSelect = !(this.selectedRows[tr.rowIdx]);
	}

	if (toSelect) {
		if (!tr.savedClassName)
			tr.savedClassName = tr.className;
		tr.className = 'selectedlistrow';
		this.selectedRow = tr;
		this.currentRow = tr.rowIdx;
		if (this.multipleSelect)
			this.selectedRows[tr.rowIdx] = true;
		if (otherTr) {
			otherTr.className = 'selectedlistrow';
			this.selectedOtherRow = otherTr;
		}
	} else {
		tr.className = tr.savedClassName;
		this.selectedRow = null;
		// currentRow will remain there as the default till something else is
		// selected
		// this.currentRow = 0;
		if (this.multipleSelect && this.selectedRows[tr.rowIdx])
			delete this.selectedRows[tr.rowIdx];
		if (otherTr) {
			otherTr.className = tr.savedClassName;
			this.selectedOtherRow = null;
		}
	}
};

ListOrGridTable.prototype.returnRows = function(toUnselect) {
	var data = new Array();
	data[0] = this.serverData[0];
	for ( var i in this.selectedRows) {
		data.push(this.serverData[i]);
	}
	if (toUnselect) {
		var rows = this.tableBodyObject.childNodes;
		for ( var i in this.selectedRows) {
			this.simulateClick(rows[i], false);
		}
	}
	var p2 = this.P2.win.currentP2;
	if (p2 && p2.pendingPicker)
		p2.codePickerReturned(data);
	else
		return data;
};

// shift input focus to next field in the table. if this is the last field,
// shift focus to first field of next row, failing which we can not focus.
// caller wants to get the element we focussed on. If we reached the end, caller
// wants to know about it and get the last field,
// so that the field next to it in the page can be tried.
ListOrGridTable.prototype.focusNext = function(field, ele) {
	var idx = field.columnIdx;
	var rowIdx = ele.rowIdx;
	var eleToReturn = null;
	for ( var i = idx + 1; i != idx; i++) {
		if (i == this.nbrColumns) // that was the last field
		{
			// Start with first column of next row;This is DEFINITELY not a good
			// design. We have to check for other panels, buttons etc...
			if (rowIdx < this.grid.length) {
				rowIdx = this.getNextRow(rowIdx, false);
				if (rowIdx == 0) {
					// we reached the end of this grid.
					break;
				}
			}
			i = 0;
		}
		column = this.columns[this.columnNames[i]];
		if (!column.isEditable)
			continue;

		if (rowIdx)
			ele = this.P2.doc.getElementById(column.name + '__' + rowIdx);

		if (!ele) {
			debug("Error:" + column.name + " has no HTML element");
			return null;
		}

		if (ele.disabled)
			continue;

		try {
			ele.focus();

			if (ele.select)
				ele.select();
			eleToReturn = ele;
			break;
		} catch (e) {
			return null;
		}

	}

	var gotFocussed = eleToReturn ? true : false;
	if (!gotFocussed) {
		// return the last field of the table, so that the caller can search
		// from ther
		eleToReturn = this.columns[this.columnNames[this.nbrColumns - 1]];
	}

	// we return an object with follwoing two attribures.
	var objToReturn = new Object();
	objToReturn.gotFocussed = gotFocussed;
	objToReturn.ele = eleToReturn;
	return objToReturn;
};

ListOrGridTable.prototype.fillDC = function(dc) {
	var grid = [ [] ]; // array of one array, one for the header
	var rowsToBeSent = [ null ]; // rows from this.grid that have to be sent.
	// first entry is dummy so as to align it
	// with grid
	var n = this.grid.length;
	// add desired number of empty rows first
	var i, field, val, j, dt, gridRow;
	var firstRowId = null;

	for (i = 1; i < n; i++) {
		gridRow = this.grid[i];
		if (!gridRow)
			continue;

		if (this.sendAffectedRowsOnly || this.autoSaveServiceName) {
			if (!gridRow[this.actionIdx] || gridRow.beingSaved) // we are to
				// send only
				// affected
				// rows, and
				// this row is
				// not affected
				continue;
		}

		if (this.keyFieldName && !gridRow[this.keyIdx])// key field is not
		// found
		{
			if (!this.idFieldName || !gridRow[this.idIdx]
					|| gridRow.keyIsGenerated) // and id field is also not
				// found
				continue;
		}
		rowsToBeSent.push(gridRow);
		grid.push(new Array());
		if (this.autoSaveServiceName) // we save only one row in this mode
		{
			firstRowId = i;
			break;
		}
	}

	// now go by column, and add values
	var col = 0;
	for ( var x in this.columns) {
		field = this.columns[x];
		if (!field.toBeSentToServer)
			continue;
		dt = dataTypes[field.dataType];
		grid[0][col] = x;
		j = field.columnIdx;
		// remember indexes[0] is dummy
		for (i = 1; i < rowsToBeSent.length; i++) {
			gridRow = rowsToBeSent[i];
			val = gridRow[j];
			if (val && dt)
				val = dt.formatOut(val);
			grid[i][col] = val;
		}
		col++;
	}
	if (!col) {
		debug(this.name + ' does not have any columns to be sent to server');
		return 0;
	}

	// is there data row at all?
	// in the original version, we used to send only header. This could have
	// been used as FEATURE. Hence we skip only for autoSaveServiceName.
	if (this.autoSaveServiceName && !firstRowId)
		return 0;
	dc.addGrid(this.name, grid);

	// is there a child table?
	if (this.repeatedField && this.childGrid) {
		var grid = new Array();
		var header = this.childGrid[0];
		if (!this.childKeysTableName)
			header[2] = header[3]; // label is not sent back. shift that
		// columns
		header.length = 3;
		grid.push(header);
		var data = this.repeatedData.data;
		for ( var i = 1; i < rowsToBeSent.length; i++) {
			var pkey = rowsToBeSent[i][this.idIdx];
			var aData = data[pkey];
			if (aData.isDeleted)
				continue;
			for ( var skey in aData) {
				var val = aData[skey];
				if (!val && val != 0)
					continue;
				var row = new Array();
				row[0] = pkey;
				row[1] = skey;
				row[2] = val;
				grid.push(row);
			}
		}
		dc.addGrid(this.childTableName, grid);
	}
	return firstRowId;
};

ListOrGridTable.prototype.resetNavigationButtons = function() {
	if (this.linkedDisplayTable) {
		if (this.nbrRows == 0)
			this.P2.hideOrShowPanels([ this.linkedDisplayTable.panelName ],
					'none');
		else {
			this.P2.hideOrShowPanels([ this.linkedDisplayTable.panelName ], '');
			var tableEle = this.P2.doc
					.getElementById(this.linkedDisplayTable.name);
			if (tableEle)
				tableEle.className = isDeleted ? 'deletedTable' : '';
		}

	}
	if (!this.navigationButtons)
		return;
	// debug('going to reset nav buttons for ' + this.name);
	var btns = this.navigationButtons;
	// if (this.selectedRow) //many user js codes tend to change currentRow for
	// their convinience
	// this.currentRow = this.selectedRow.rowIdx;

	var nextExists = false;
	var prevExists = false;
	var isDeleted = false;
	if (this.nbrRows) {
		nextExists = this.getNextRow(this.currentRow, false);
		prevExists = this.getNextRow(this.currentRow, true);
		isDeleted = this.grid[this.currentRow]
				&& this.grid[this.currentRow].isDeleted;
	}

	// in case this row is deleted,
	if (this.linkedDisplayTable) {
		var tableEle = this.P2.doc.getElementById(this.linkedDisplayTable.name);
		if (tableEle)
			tableEle.className = isDeleted ? 'deletedTable' : '';
	}
	// Double negatives are not easy to understand, but the attribute itself is
	// negative (disable="")

	if (btns.next)
		btns.next.disabled = !nextExists;

	if (btns.last)
		btns.last.disabled = !nextExists;

	if (btns.first)
		btns.first.disabled = !prevExists;

	if (btns.prev)
		btns.prev.disabled = !prevExists;

	if (btns.undelete)
		btns.undelete.disabled = !isDeleted;

	if (btns.del)
		btns.del.disabled = (this.nbrRows && isDeleted) ? true : false; // playing
	// it
	// safe
	// to
	// set a
	// boolean
};

ListOrGridTable.prototype.deleteAllTableRows = function(toDelete) {
	var n = this.grid.length;
	for ( var i = 1; i < n; i++) {
		var aRow = this.grid[i];
		if (!aRow)
			continue;
		if ((toDelete && aRow.isDeleted) || (!toDelete && !aRow.isDeleted))
			continue;
		var tr = this.P2.doc.getElementById(this.name + i);
		var obj = this.P2.doc.getElementById(this.name + '_' + this.name
				+ 'Delete' + '__' + i);
		if (this.deleteRow(obj, tr))
			obj.checked = !obj.checked;
	}
};

ListOrGridTable.prototype.deleteRow = function(obj, tr, overrideConfirmation) {
	if (!overrideConfirmation && this.confirmOnRowDelete
			&& !(confirm('Are you sure you want to delete?'))) {
		return false;
	}
	if (!tr) {
		debug('trying to delete/undelete row of ' + this.name);
		if (obj)
			tr = getRowInTable(obj);
		else
			tr = this.P2.doc.getElementById(this.name + this.currentRow);
		if (!tr) {
			debug('Unable get TR element for delete operation on ' + this.name);
			return;
		}
	}
	var idx = tr.rowIdx;
	var dataRow = this.grid[idx];
	if (!obj) {
		obj = this.P2.doc.getElementById(this.name + '_' + this.name + 'Delete'
				+ '__' + idx);
	}
	var tr1 = null;
	var tr2 = null;
	if (this.rightTableBodyObject) {
		var id = this.name + idx;
		if (tr.id == id)
			id = this.name + 'Right' + idx;
		tr1 = this.P2.doc.getElementById(id);
		if (this.scrollTableBodyObject)
			tr2 = this.P2.doc.getElementById(this.name + 'Scroll' + idx);
	}

	var isImg = obj && obj.tagName.toUpperCase() == 'IMG';
	var dat = this.repeatedData;
	var pkey = null;
	if (dat) {
		pkey = dataRow[this.idIdx];
		dat = dat.data[pkey];
	}
	if (dataRow.isDeleted) // so, it is undelete now
	{
		dataRow.isDeleted = false;
		this.undelete(tr, tr1, isImg ? obj : null, idx);
		if (dat) {
			dat.isDeleted = false;
			delete dat['isDeleted'];
		}
		if (this.hasAggregates)
			this.aggregate();
		this.resetNavigationButtons();
		return true;
	}
	if (this.minRows > 0 && this.countAllRows() <= this.minRows) {
		message(
				'A minimum of '
						+ this.minRows
						+ ' data rows is required. Can not delete this row. If you intend to add rows, please do that before deleting this row',
				"Warning", "Ok", null, null, null);
		return false;
	}
	dataRow.isDeleted = true;
	if (dat)
		dat.isDeleted = true;
	// After several rouunds of changes, here is the lagic effective dec-11 for
	// deletion of rows
	// 1. If id field is there, and it is not generated, we MUST NOT delete it
	// 2. Otherwise, we delete it, except if doNotDeleteAppendedRows=true is set
	// at the table level

	var nextIdx = null;
	if (this.toBeDeleted(dataRow))
		nextIdx = this.physicallyDelete(tr, tr1, tr2, idx);
	else
		this.logicallyDelete(tr, tr1, isImg ? obj : null, idx);

	if (this.hasAggregates)
		this.aggregate();
	// is there next row?
	if (nextIdx) {
		this.currentRow = nextIdx;
		this.clicked();
	} else
		this.resetNavigationButtons();
	return true;
};

// Should the row be physically deleted, or should it be shown as a deleted row?
ListOrGridTable.prototype.toBeDeleted = function(dataRow) {
	// if it is an existing row on the server, we mark it, and not delete it.
	if (this.idFieldName && dataRow[this.idIdx] && !dataRow.keyIsGenerated)
		return false;

	// was added locally, and has not been ever sent to server.
	if (dataRow.addedByUser)
		return true;

	// special keyword provided for exis
	if (this.doNotDeleteAppendedRows)
		return false;

	return true;
};

ListOrGridTable.prototype.undelete = function(tr, tr1, obj, idx) {
	tr.className = tr.savedClassName;
	// restore background color, in case it was reset
	tr.style.backgroundColor = exilParms.gridUnDeletedColor
			|| tr.savedBackgroundColor || '';
	if (tr1)
		tr1.className = tr.savedClassName;
	if (obj) {
		obj.src = obj.src.replace('undelete', 'delete');
		obj.className = 'deleteimg';
	}
	this.currentRow = idx;
	if (this.actionField) {
		this.actionField.setValue('modify', null, idx);
	}
};

ListOrGridTable.prototype.physicallyDelete = function(tr, tr1, tr2, idx) {
	tr.parentNode.removeChild(tr);
	if (tr1)
		tr1.parentNode.removeChild(tr1);
	if (tr2)
		tr2.parentNode.removeChild(tr2);
	this.grid[idx] = null; // no one willtouch this row, except fillDc....
	this.nbrRows--;
	if (this.totalRows)
		this.totalRows--;
	// Nov 25 2009 : BugID 794 - Getting Jscript error while Clone Row -
	// Weaveit(End) : Vijay
	if (this.quickSearchEle) {
		this.quickSearchRebuildRow(idx);
		if (this.gotFiltered)
			this.quickSearch(this.quickSearchEle.value);
	} else if (this.trEle)
		this.trEle.innerHTML = this.totalRows;

	var nextIdx = 0;
	if (this.nbrRows == 0) {
		// are we to always have a blank row?
		if (this.keepABlankRow)
			this.addRows(1);
	} else {
		// this row is deleted. we have to have focus on some row.
		// we look for previous row. If not found, then we look for a next row
		nextIdx = this.getNextRow(idx, true);
		if (!nextIdx)
			nextIdx = this.getNextRow(idx, false);
	}

	return nextIdx;
};

ListOrGridTable.prototype.logicallyDelete = function(tr, tr1, obj, idx) {
	tr.savedClassName = tr.className;
	tr.savedBackgroundColor = tr.style.backgroundColor;
	tr.className = 'deletedrow';
	if (exilParms.gridDeletedColor)
		tr.style.backgroundColor = exilParms.gridDeletedColor;
	if (tr1)
		tr1.className = 'deletedrow';
	if (obj) {
		obj.src = obj.src.replace('delete', 'undelete');
		obj.className = 'undeleteimg';
	}
	this.currentRow = idx;
	if (this.actionField)
		this.actionField.setValue('delete', null, idx);
};

ListOrGridTable.prototype.countAllRows = function() {
	var count = 0;
	var grid = this.grid;
	var n = grid.length;
	for ( var i = 1; i < n; i++) {
		var row = grid[i];
		if (row && !row.isDeleted)
			count++;
	}
	return count;
};

ListOrGridTable.prototype.countActiveRows = function() {
	if (this.keyIdx == null)
		return this.countAllRows();

	var count = 0;
	var grid = this.grid;
	var n = grid.length;
	for ( var i = 1; i < n; i++) {
		var row = grid[i];
		if (!row || row.isDeleted)
			continue;
		if (this.keyIdx != null && !row[this.keyIdx]) // key value not found
		{
			if (!this.idFieldName || !row[this.idIdx] || row.keyIsGenerated) // even
				// id
				// field
				// not
				// found
				continue;
		}
		count++;
	}
	return count;
};

ListOrGridTable.prototype.disableAction = function() {
	// if(this.actionDisabled) return;
	var rows = this.tableBodyObject.childNodes;
	var n = rows.length;
	for ( var i = 0; i < n; i++) {
		var row = rows[i];
		row.style.cursor = 'auto';
		row.title = 'row click is disbaled.';
	}
	this.actionDisabled = true;
	return;
};

ListOrGridTable.prototype.enableAction = function() {
	// if(!this.actionDisabled) return;
	var rows = this.tableBodyObject.childNodes;
	var n = rows.length;
	for ( var i = 0; i < n; i++) {
		var row = rows[i];
		row.style.cursor = 'pointer';
		row.title = this.rowHelpText;
	}
	this.actionDisabled = false;
	return;
};

// event function called when a navigation button in the linked panel is
// clicked.
// init() has attached these functions thru P2/addListeneres
ListOrGridTable.prototype.navigate = function(e, btn) {
	// debug(btn.id + ' clicked and the correspondng event fired with ' +
	// btn.navigationAction);
	if (!this.currentRow)
		this.currentRow = this.getSelectedRow();

	var n = this.currentRow;
	switch (btn.navigationAction) {
	case 'next':
		n = this.getNextRow(n, false); // go forward from current
		break;
	case 'prev':
		n = this.getNextRow(n, true); // go backwards from current
		break;
	case 'first':
		n = this.getNextRow(0, false); // go forward from beginning
		break;
	case 'last':
		n = this.getNextRow(this.grid.length, true);
		break;
	case 'del':
		this.P2.deleteTableRow(null, null, this.name);
		return;
	case 'undelete':
		this.P2.deleteTableRow(null, null, this.name);
		return;
	case 'new':
		this.P2.addTableRow(null, this.name);
		this.clicked();
		return;
	}
	if (n == 0) {
		debug('ERROR : ' + btn.navigationAction
				+ ' is not a valid navigaiton action on ' + this.name
				+ ' with its current row at ' + this.currentRow);
		return;
	}
	// debug('selecting row ' + n + ' of table ' + this.name);
	this.currentRow = n;
	this.clicked();
};

ListOrGridTable.prototype.getSelectedRow = function() {
	var doc = this.P2.doc;
	for ( var i = 1; i < this.grid.length; i++) {
		var tr = doc.getElementById(this.name + i);
		if (tr && tr.className == 'selectedlistrow')
			return i;
	}
	debug(' no selected row found for ' + this.name);
	return 0;
};

ListOrGridTable.prototype.initPagination = function(dc, skipLocal) {
	if (this.localPagination && !skipLocal) // server has sent all data back.
	// Let us simulate whatever server
	// woudl have done, like TotalRows
	// etc..
	{
		this.initLocalPagination(dc);
	}
	var doc = this.P2.doc;
	if (!this.pgEle) {
		this.pgEle = doc.getElementById(this.name + 'Pagination');
		this.pgCountEle = doc.getElementById(this.name + 'PageCount');
		if (!this.pgEle) {
			// debug('Design error: dom element for ' + this.name+'Pagination' +
			// ' not found');
			return;
		}
	}
	var tr = dc.values[this.name + 'TotalRows'];
	if (!tr) {
		this.pgCountEle.style.display = 'none';
		tr = dc.grids[this.name]; // this is actually grid, but I am reusing
		// tr
		tr = tr ? (tr.length - 1) : 0;
		this.totalRows = tr;
		// return;
	} else
		this.pgCountEle.style.display = '';

	if (!this.tpEle) {
		this.tpEle = doc.getElementById(this.name + 'TotalPages');
		this.cpEle = doc.getElementById(this.name + 'CurrentPage');
		this.trEle = doc.getElementById(this.name + 'TotalRows');
		this.fpEle = doc.getElementById(this.name + 'FirstPage');
		this.ppEle = doc.getElementById(this.name + 'PrevPage');
		this.npEle = doc.getElementById(this.name + 'NextPage');
		this.lpEle = doc.getElementById(this.name + 'LastPage');
	}
	this.pgEle.style.display = '';

	var tp = Math.floor((tr - 1) / this.pageSize) + 1;
	var cp = 1; // currentPage
	this.totalRows = tr;
	this.totalPages = tp;
	this.currentPage = cp;
	this.tpEle.innerHTML = tp;
	this.cpEle.value = cp;
	this.trEle.innerHTML = tr;
	if (!this.tpEle || !this.cpEle || !this.trEle || !this.fpEle || !this.ppEle
			|| !this.npEle || !this.lpEle)
		return;
	// when we are on page 1, ther is no prev page or first page
	this.fpEle.className = ListPanel.INACTIVE_PAGE_CLASS;
	this.ppEle.className = ListPanel.INACTIVE_PAGE_CLASS;
	if (tp == cp) {
		this.npEle.className = ListPanel.INACTIVE_PAGE_CLASS;
		this.lpEle.className = ListPanel.INACTIVE_PAGE_CLASS;
	} else {
		this.npEle.className = ListPanel.ACTIVE_PAGE_CLASS;
		this.lpEle.className = ListPanel.ACTIVE_PAGE_CLASS;
	}
	if (tp == 1) {
		this.fpEle.style.display = 'none';
		this.ppEle.style.display = 'none';
		this.npEle.style.display = 'none';
		this.lpEle.style.display = 'none';
	} else {
		this.fpEle.style.display = '';
		this.ppEle.style.display = '';
		this.npEle.style.display = '';
		this.lpEle.style.display = '';
	}
};

ListOrGridTable.prototype.initLocalPagination = function(dc) {
	if (this.localRepaginationTriggered) {
		this.localRepaginationTriggered = false;
		return;
	}

	var grid = dc.grids[this.name];
	var n = grid.length - 1; // first row is header
	this.entireServerData = null;
	this.filteredRows = null;
	if (n <= this.pageSize) {
		return;
	}

	// simulate pagination scenario by setting fields that are sent by server
	dc.values[this.name + 'TotalRows'] = n;
	this.entireServerData = grid; // save complete data
	// create a page of data and put that back in dc
	var page = [];
	n = this.pageSize;
	for ( var i = 0; i <= n; i++) // n+1 rows, including the header
	{
		page[i] = grid[i];
	}
	dc.grids[this.name] = page;
	// that's it. We are okay for the first page. Subsequent pagination is
	// handled in getLocalPage()
};

ListOrGridTable.prototype.getServerData = function() {
	// if local paginationis enabled, return entire data, else return this page
	// data
	return this.entireServerData || this.serverData;
};

// grid with its first row as header to be used as data for a locally paginated
// table
ListOrGridTable.prototype.setServerData = function(grid, filteredRows) {
	this.entireServerData = grid;
	this.filteredRows = filteredRows || null;
	this.localRepaginationTriggered = true;
	this.repaginateServerData();
};

// selected rows is an array of index of rows that are selected from local data
// e.g. [3,5,7,9] means only 3,5,7,9 th rows are selected, and the rest are
// filtered-out.
// list is repaginated based on this.
ListOrGridTable.prototype.setFilterRows = function(filteredRows) {
	this.filteredRows = filteredRows;
	this.localRepaginationTriggered = true;
	this.repaginateServerData();
};

ListOrGridTable.prototype.repaginateServerData = function() {
	var grid = this.entireServerData;
	var filteredRows = this.filteredRows;
	var page = [];
	page.push(grid[0]);
	var nbrRows, n;
	if (filteredRows) {
		n = nbrRows = filteredRows.length;
		if (n > this.pageSize)
			n = this.pageSize;

		for ( var i = 0; i < n; i++)
			page.push(grid[filteredRows[i]]);
	} else {
		n = nbrRows = grid.length - 1; // grid has header row
		if (n > this.pageSize)
			n = this.pageSize;

		for ( var i = 1; i <= n; i++)
			page.push(grid[i]);
	}

	var dc = new DataCollection();
	dc.grids[this.name] = page;
	if (nbrRows > this.pageSize)
		dc.values[this.name + 'TotalRows'] = nbrRows;

	this.setData(dc, false, false, false);
};

ListOrGridTable.prototype.paginate = function(action, noNeedToRequest) {
	// action links are hidden in such a way that we should never be asking for
	// a wrong action...
	var pageNo = this.currentPage;
	switch (action) {
	case 'next':
		pageNo++;
		break;
	case 'first':
		pageNo = 1;
		break;
	case 'last':
		pageNo = this.totalPages;
		break;
	case 'prev':
		pageNo--;
		break;
	case 'random':
		pageNo = this.cpEle.value;
		break;
	case 'go':
		pageNo = this.getPageNumber();
	}
	if (pageNo == this.currentPage || pageNo < 1 || pageNo > this.totalPages)
		return;
	var cls = (pageNo > 1) ? ListPanel.ACTIVE_PAGE_CLASS
			: ListPanel.INACTIVE_PAGE_CLASS;
	if (this.fpEle || this.ppEle) {
		this.fpEle.className = cls;
		this.ppEle.className = cls;
	}

	cls = (pageNo < this.totalPages) ? ListPanel.ACTIVE_PAGE_CLASS
			: ListPanel.INACTIVE_PAGE_CLASS;
	if (this.npEle)
		this.npEle.className = cls;
	if (this.lpEle)
		this.lpEle.className = cls;
	if (this.cpEle)
		this.cpEle.value = pageNo;

	this.currentPage = pageNo;
	if (!noNeedToRequest)
		this.requestPage(pageNo);
};

ListOrGridTable.prototype.getPageNumber = function() {
	var pageNo = this.currentPage;
	var action = this.P2.doc.getElementById(this.tableName + 'PageSelection').value;
	switch (action) {
	case 'next':
		pageNo++;
		break;
	case 'first':
		pageNo = 1;
		break;
	case 'last':
		pageNo = this.totalPages;
		break;
	case 'prev':
		pageNo--;
		break;
	}
	return pageNo;
};

ListOrGridTable.prototype.requestPage = function(pageNo, columnToSort,
		sortDesc, columnToMatch, valueToMatch) {
	if (this.localPagination) {
		this.getPageFromServerData(pageNo, columnToSort, sortDesc,
				columnToMatch, valueToMatch);
		return;
	}
	var dc = new DataCollection();
	dc.values['tableName'] = this.name;
	dc.values['pageNo'] = pageNo;
	dc.values['pageSize'] = this.pageSize;
	if (columnToSort) {
		dc.values['paginationColumnToSort'] = columnToSort;
		dc.values['paginationSortDesc'] = sortDesc ? 1 : 0;
		if (columnToMatch) {
			dc.values['paginationColumnToMatch'] = columnToMatch;
			dc.values['paginationValueToMatch'] = valueToMatch;
		}
	}

	if (this.paginationServiceName != null) {
		dc.values['paginationServiceName'] = this.paginationServiceName;
		dc.values[this.name + 'PageSize'] = this.pageSize;
	}
	if (this.paginationServiceFieldNames != null) {
		var paginationFieldNames = this.paginationServiceFieldNames.split(',');
		var paginationFieldSources = this.paginationServiceFieldNames
				.split(',');
		if (this.paginationServiceFieldSources != null) {
			paginationFieldSources = this.paginationServiceFieldSources
					.split(',');
		}
		if (paginationFieldNames.length == paginationFieldSources.length) {
			for ( var i = 0; i < paginationFieldNames.length; i++) {
				var curFieldName = trim(paginationFieldNames[i]);
				var curFieldSource = trim(paginationFieldSources[i]);
				var curField = this.P2.getField(curFieldSource);
				curField.validate();

				dc.values[curFieldName] = this.P2.getFieldValue(curFieldSource);
				if (curField.isFilterField) {
					dc.values[curFieldName + 'Operator'] = this.P2
							.getFieldValue(curFieldSource + 'Operator');
				}
				var dt = dataTypes[curField.dataType];
				if (dt && dt.basicType == 'DATE') {
					if (curField.isFilterField) {
						dc.values[curFieldName + 'To'] = this.P2
								.getFieldValue(curFieldSource + 'To');
					} else if (curField.fromField) {
						dc.values[curFieldName + 'Operator'] = this.P2
								.getFieldValue(curFieldSource + 'Operator');
					}
				}
			}
		}
	}

	var se = new ServiceEntry('paginationService', dc, false, null, this,
			this.name, ServerAction.NONE);
	this.P2.win.serverStub.callService(se);
};

ListOrGridTable.prototype.getPageFromServerData = function(pageNo,
		columnToSort, sortDesc, columnToMatch, valueToMatch) {
	/*
	 * page=0 is meant for server to flush. we need not do anything.
	 */
	if (!pageNo)
		return;

	if (columnToMatch)
		this.filterServerData(columnToMatch, valueToMatch);

	if (columnToSort) {
		this.sortServerData(columnToSort, sortDesc);
	}

	var data = this.entireServerData;
	var filteredRows = this.filteredRows;
	var nbrRows = filteredRows ? filteredRows.length : data.length - 1;
	var startAt = this.pageSize * (pageNo - 1);
	if (startAt >= nbrRows) //
		startAt = 0;
	var endAt = startAt + this.pageSize;
	if (endAt >= nbrRows)
		endAt = nbrRows;

	var page = [];
	if (filteredRows) // value in filteredRows point to index in data
	{
		for ( var i = startAt; i < endAt; i++)
			page.push(data[filteredRows[i]]);
	} else {
		// data has its first row as header
		startAt++;
		endAt++;
		for ( var i = startAt; i < endAt; i++)
			page.push(data[i]);
	}
	var dc = new DataCollection();
	dc.grids[this.name] = page;
	this.serviceReturned(dc);
};

ListOrGridTable.prototype.serviceReturned = function(dc) {
	var data = dc.grids[this.name];
	if (!data || !data.length) {
		debug('No data reced for ' + this.name
				+ ' when paginaiton service returned.');
		return;
	}
	this.setPageData(data);
	if (this.hasAggregates)
		this.aggregate();

	var paginateCBFunc = this.paginateCallback;
	if (paginateCBFunc) {
		try {
			if (typeof (paginateCBFunc) == 'function')
				paginateCBFunc(this, this.name, this.se, false);
			else
				this.P2.act(this, this.name, paginateCBFunc, this.se, false);
		} catch (e) {
			debug('Paginate Call back action failed with error :' + e);
		}
	}
};

ListOrGridTable.prototype.setPageData = function(data) {
	var nbrRows = data.length;
	this.deleteAllRows();
	this.grid.length = 1; // that is how we delete data, retaining the default
	// data

	// this.serverData saves a copy of the grid recd from server. In this, first
	// row is column names.
	// data recd in pagination does not have a header row. Hence, the data rows
	// are pushed.
	this.serverData.length = 1;
	for ( var i = 0; i < nbrRows; i++)
		this.serverData.push(data[i]);

	var doc = this.P2.doc;
	var fieldCols = this.fieldCols;
	var sequenceNo = (this.currentPage - 1) * this.pageSize;
	for ( var i = 1; i <= nbrRows; i++) {
		sequenceNo++;
		this.currentRow = i;
		// add an html row
		var newRow = this.htmlRowToClone.cloneNode(true);
		var clsName = (i % 2) ? 'row2' : 'row1';
		newRow.className = clsName;
		newRow.rowIdx = i; // set the pointer to the data row
		newRow.id = this.name + i; // in case I need to reach the tr with just
		// the index...
		this.tableBodyObject.appendChild(newRow);

		if (this.frozenColumnIndex) {
			this.cloneFrozenRow(clsName, i);
		}
		// add a data row
		var newDataRow = new Array(this.nbrColumns);
		this.grid.push(newDataRow);
		this.addPaginatedRow(doc, newDataRow, i, data[i - 1], fieldCols,
				sequenceNo);
	}
	if (this.initialNumberOfRows && this.initialNumberOfRows > nbrRows
			&& exilParms.displayInitialRows) {
		this.addRows(this.initialNumberOfRows - nbrRows, null, true);
	}
	/*
	 * Sorting failed in Table in case of initialNumberofRows < actual number of
	 * rows in the grid because this.numberOfOrigDataRows is not initialized.
	 * --Pathfinder Harsha Bhat
	 */
	if (nbrRows > 1)
		this.numberOfOrigDataRows = nbrRows;

	if (this.treeViewColumnName) {
		// clear the bulk checkbox in header
		var bulkChk = this.P2.doc.getElementById(this.name + 'BulkCheck');
		if (bulkChk)
			bulkChk.checked = false;
	}

	this.nbrRows = nbrRows;
	this.currentRow = 1;
	// are we to simulate a click on the first row?
	// debug(' done with setting data.');
	this.simulateClickIfRequired();
};

ListOrGridTable.prototype.addPaginatedRow = function(doc, localRow, rowIdx,
		serverRow, fieldCols, sequenceNo) {
	var ele;
	var suffix = '__' + rowIdx;
	// is there a sequence number?
	if (this.addSeqNo) {
		ele = doc.getElementById(this.name + 'SeqNo');
		ele.id += suffix;
		ele.innerHTML = sequenceNo;
	}
	var n = this.columnNames.length;
	var val;
	var defaultDataRow = this.grid[0];
	for ( var j = 0; j < n; j++) {
		var columnName = this.columnNames[j];
		var field = this.columns[columnName];
		ele = doc.getElementById(field.name);
		var k = fieldCols[j];
		if (!k && k != 0)
			val = defaultDataRow[j];
		else {
			val = serverRow[k];
			if (val) {
				if (field.formatter)
					val = field.format(val);
				else {
					var dt = dataTypes[field.dataType];
					if (dt)
						val = dt.formatIn(val);
				}
			}
		}

		localRow[j] = val;
		field.setValueToObject(ele, val);
		ele.id += suffix;
		ele.rowIdx = rowIdx;
	}
	this.hideOrShowColumns();
	// for tree view
	if (this.treeViewColumnName) {
		this.treeViewIndentRow(rowIdx);
	}

};

/**
 * called on page unload. If there was a server side pagination, let us let the
 * server kow that we are moving on..
 */
ListOrGridTable.prototype.doneWith = function() {
	if (this.totalRows && this.totalRows > this.nbrRows) {
		this.requestPage(0);
	}
};

var ListPanel = function() {
	ListOrGridTable.call(this);

	this.PAGE_SIZE = 30;

	// should the header be displayed at all? there could be situations where
	// you do not want the header row
	// to be diplayed at all. Default has to be true;
	this.showHeader = true;

	// pagination. Old design is discontinued, but the new one one is yet to be
	// designed
	this.pageSize = this.PAGE_SIZE;

	// do you need sequence numbrs to be displayed for each row?
	this.addSeqNo = false;

	// rows in list are highligted on mouse over, and a selection is highlighted
	// by default.
	// you can disable this if required. Is it disabled in the beginning?
	this.actionDisabled = false;

	// do you want to enable user to select multiple lines and then act on them
	// on click of a button?
	// this options lets you decide what happens when you click on a row. If
	// multiple select is on, a clicked row will be
	// selected, except if it is already selected, in which case, it gets
	// de-selected.
	// In single select mode, when you select a row, the earlier selected row
	// will be de-seletced.
	this.multipleSelect = false;
	this.selectedRows = {};
	// if pagination is on, let us track where we are
	this.serverGrid = null;
	this.totalPages = 0;
	this.activePageNo = 0;

	// store the row that is selected. This is 0 based. Hence -1 implies that no
	// row is selected
	this.selectedRow = null;
	this.onclickActionText = '';

	// what is to be done on row click, or row dbl click?
	this.onClickActionName = null;
	this.onDblClickActionName = null;
	this.simulateClickOnFirstRow = false;
	this.simulateClickOnRow = rowType.none;
	this.paginationServiceName = null;
	this.paginationServiceFieldNames = null;
	this.paginationServiceFieldSources = null;
	this.rowHelpText = '';
	this.toBeSentToServer = false;
};

ListPanel.prototype = new ListOrGridTable;

// we shoud not be validating anything in a list panel...
ListPanel.prototype.validateColumn = function() {
	return true;
};

// called when user double clicks on a row. This event is attached at the TR
// level. Hence ele would be a tr element
// Meaning of a double click is same as a click + any other meaning programmer
// might have attached
// event handler calls with tr, while a user function may call with idx instead

// pagination related.. only for list panel....well why not grid as well?
ListPanel.ACTIVE_PAGE_CLASS = 'activepaginationbutton';
ListPanel.INACTIVE_PAGE_CLASS = 'inactivepaginationbutton';

ListPanel.prototype.removeFromList = function(rowIdx) {
	if (!rowIdx)
		rowIdx = this.currentRow;
	var tr = this.P2.doc.getElementById(this.name + rowIdx);
	if (!tr) {
		debug(rowIdx + ' is not a valid row number in list panel ' + this.name);
		return;
	}
	tr.parentNode.removeChild(tr);
	this.grid[rowIdx] = null;
};

var getcolumnToColumnMap = function(serverNames, localNames) {
	var n = localNames.length;
	var m = serverNames.length;
	var map = new Array(n);
	for ( var i = 0; i < n; i++) {
		map[i] = null;
		var localName = localNames[i];
		for ( var j = 0; j < m; j++) {
			if (localName != serverNames[j])
				continue;
			map[i] = j;
			break;
		}
	}
	return map;
};

var getColumnIndex = function(names, nameToMatch) {
	var n = names.length;
	for ( var i = 0; i < n; i++) {
		if (names[i] == nameToMatch)
			return i;
	}
	return null;
};

//ButtonTable is a very very special case, because I am still not sure why it is a table :-)
// alternate design is to make it a field. Filed looks more logical, but table is more convenient at this time.
// we will review this design later and decide, meanwhile here is the ButtonPane table that DOES NOT inherit from AbstractTable

//button field is only a data structure that is stored under buttons collection
var ButtonField = function (nam, label, actionName)
{
    this.name = nam;
    this.label = label;
    this.actionName = actionName;
};

var ButtonPanel = function ()
{
    this.name = null;
    this.P2 = null;
    this.renderingOption = null;
    this.buttons = new Object(); //collection of buttonFields
};

ButtonPanel.prototype.setData = function (dc)
{
    var data = dc.grids[this.name];
    if (data.length <= 1)
    {
        if (this.renderingOption == 'nextToEachOther')
        {
            this.P2.hideOrShowPanels([this.name], 'none');
        }
        else
        {
            var listName = this.name + 'ButtonList';
            var buttonList = this.P2.doc.getElementById(listName);
            //should we do the following or just say buttonList.innerHTML = ''
            while (buttonList.options.length)
            {
                buttonList.remove(0);
            }
        }
        return;
    }
    data = this.transposeIfRequired(data);
    //possible that it was hidden earlier.. Let us show it first
    this.P2.hideOrShowPanels([this.name], '');
    if (this.renderingOption == 'nextToEachOther')
        this.enableButtons(data);
    else
        this.buildDropDown(data);
};

//enable/disable buttons in a button panel based on data received from server
ButtonPanel.prototype.enableButtons = function (data)
{
    var doc = this.P2.doc;
    var n = data.length;
    if (n <= 1) return;
    //if the table has its second column, it is interpreted as Yes/No for enable. 0 or empty string is No, everything else is Yes
    var hasFlag = data[0].length > 1;

    //for convenience, get the buttons into a collection indexed by name
    var btnsToEnable = {};
    for (var i = 1; i < n; i++)
    {
        var row = data[i];
        if (hasFlag)
        {
            var flag = row[1];
            if (!flag || flag == '0')
                continue;
        }
        btnsToEnable[row[0]] = true;
    }

    //now let us go thru each button, and hide or who it
    for (var btnName in this.buttons)
    {
        var ele = doc.getElementById(btnName);
        if (!ele)
        {
            debug('Design Error: Button panel ' + this.name + ' has not produced a DOM element with name  ' + btnName);
            continue;
        }
        ele.style.display = btnsToEnable[btnName] ? '' : 'none';
    }
};

ButtonPanel.prototype.buildDropDown = function (data)
{
    var flag;
    var doc = this.P2.doc;
    var ele = doc.getElementById(this.name + 'ButtonList');
    if (!ele)
    {
        debug('DESIGN ERROR: Button Panel ' + this.name + ' has not produced a drop-down boc with name = ' + this.Name + 'ButtonList');
        return;
    }
    //zap options first
    ele.innerHTML = '';
    //that took away the first one also. Add a blank option
    var option = doc.createElement('option');
    ele.appendChild(option);

    //this.buttons has all the button names defined for this panel with value = 'disabled'
    // i.e. this.buttons['button1'] = 'disabled';
    // for the rows that are in data, mark them as enabled.
    var n = data.length;
    if (n <= 1) return;

    if ((n == 2) && (data[0].length > 1))
    {
        var hasFlag = data[0].length > 1;
        for (var i = 0; i < data[0].length; i++)
        {
            if (hasFlag)
            {
                flag = data[1][i];
                if (!flag || flag == '0')
                    continue;
            }
            var btnName = data[0][i];
            var btn = this.buttons[btnName];
            if (!btn)
            {
                debug('Button Panel ' + this.name + ' is not defined with a button with name ' + btnName + ' but server is trying to enable this button');
                continue;
            }
            option = doc.createElement('option');
            option.value = btn.actionName;
            option.innerHTML = btn.label;
            ele.appendChild(option);
        }
    }
    else
    {
        var hasFlag = data[0].length > 1;
        for (var i = 1; i < n; i++)
        {
            if (hasFlag)
            {
                flag = data[i][1];
                if (!flag || flag == '0')
                    continue;
            }
            var btnName = data[i][0];
            var btn = this.buttons[btnName];
            if (!btn)
            {
                debug('Button Panel ' + this.name + ' is not defined with a button with name ' + btnName + ' but server is trying to enable this button');
                continue;
            }
            option = doc.createElement('option');
            option.value = btn.actionName;
            option.innerHTML = btn.label;
            ele.appendChild(option);
        }
    }
};

//Standard way of getting data from server is a grid with first row as header row and rest a data rows.
//But it is possible that server may send button names in first row, and optional second row as enable flag.
//We detect the second case, and transpose the grid, so that a common logic can be used.
ButtonPanel.prototype.transposeIfRequired = function (data)
{
    //we need to transpose only if we have one or two rows
    var nbrRows = data && data.length;
    if (!nbrRows || nbrRows > 2)
        return data;

    var row = data[0];
    var nbrCols = row.length;
    if (!nbrCols)
        return data;
  
    //We make a simple assumption, that the label for last column can not clash with the name of a button.
    if (!this.buttons[row[nbrCols - 1]])
        return data;

    //we transpose the grid, with an empty header row
    var newData = null;
    if (data.length == 1) //button name only
    {
        newData = [['']];
        for (var i = 0; i < nbrCols; i++)
            newData.push([row[i]]);
    }
    else
    {
        //button name with enable flag
        newData = [['', '']];
        var row1 = data[1];
        for (var i = 0; i < nbrCols; i++)
            newData.push([row[i], row1[i]]);
    }
    return newData;
};
// optional methods
// .init()
/// Single row panel /////
var DisplayPanel = function() {
	AbstractTable.call(this);
	this.toBeSentToServer = true;
	this.hasSingleRow = true;
	this.grid[1] = [];
	this.nbrRows = 1;
	this.currentRow = 1;
};

DisplayPanel.prototype = new AbstractTable;

// Jun 30 2009 : BugID 469 - Repeating Panel not working for display panel -
// Exis (Start) : Venkat
// data is received from server in a dc. Set it to the table
DisplayPanel.prototype.fillDC = function(dc) {
	var i, field, val, j, dt, row, gridRow;
	if (this.doNotSendInGrid) {
		for ( var col in this.columns) {
			field = this.columns[col];
			if (!field.toBeSentToServer)
				continue;
			field.fillDc(dc);
		}
		return;
	}

	var grid = [];
	var n = this.grid.length;
	// add desired number of empty rows first

	for (i = 0; i < n; i++) {
		gridRow = this.grid[i];
		if (!gridRow)
			continue;
		if (this.keyIdx == null || gridRow[this.keyIdx]) {
			gridRow.toBeSent = true;
			grid.push(new Array());
		} else
			this.grid[i].toBeSent = false;
	}

	// now go by column, and add values
	var col = 0;
	for ( var colName in this.columns) {
		field = this.columns[colName];
		if (!field.toBeSentToServer)
			continue;
		dt = dataTypes[field.dataType];
		grid[0][col] = colName;
		row = 1;
		j = field.columnIdx;
		for (i = 1; i < n; i++) {
			gridRow = this.grid[i];
			if (!gridRow || gridRow.toBeSent == false)
				continue;
			val = this.grid[i][j];
			if (val && dt)
				val = dt.formatOut(val);
			grid[row][col] = val;
			row++;
		}
		col++;
	}
	if (col)
		dc.addGrid(this.name, grid);
	else
		debug(this.name + ' has no columns to be sent to server. ');
};

// populate this.linkedColumns as an array of corresponding columns from the
// linked table
// IMP: this is triggered by P2.init(). That ensures that the links are
// available before tables do any activity
DisplayPanel.prototype.createLinks = function() {
	if (!this.linkedTableName)
		return;

	var linkedTable = this.P2.tables[this.linkedTableName];
	if (!linkedTable) {
		debug(this.name + ' uses ' + this.linkedTableName
				+ ' but that table does not exist');
		return;
	}

	this.linkedTable = linkedTable;
	this.linkedTable.simulateClickOnFirstRow = true;
	this.linkedTable.linkedDisplayTable = this; // link the other way round as
	// well
	this.linkedColumns = [];
	// This panel shows the fields from the linked table. Hence, data shoudl be
	// sent from only one of these
	this.toBeSentToServer = !linkedTable.toBeSentToServer;
	// data will not be set to this table. We have to have a row for it.
	var defRow = this.grid[0];
	var dataRow = this.grid[1] = [];

	// cache linke columns so that copying is effecient
	for ( var j = 0; j < this.columnNames.length; j++) {
		var colName = this.columnNames[j];
		dataRow[j] = defRow[j];
		var col = this.linkedTable.columns[colName];
		if (col)
			this.linkedColumns[j] = col;
	}

	if (linkedTable.nbrRows)
		linkedTable.clicked();
	else
		// hide this panel as of now. Any select will show that
		this.P2.hideOrShowPanels([ this.panelName ], 'none');

};

// copy data from clicked row of the list panel
DisplayPanel.prototype.copyFromList = function(idx) {
	// opportunnity for autoSave
	if (this.linkedTable.autoSaveServiceName)
		this.linkedTable.saveInBackground();

	// debug('copy from list for idx = ' + idx + ' and linked table = ' +
	// this.linkedTable.name);
	// data row of linked table
	var row = this.linkedTable.grid[idx];
	var thisRow = this.grid[1];
	if (!row)
		return;
	// for us to copy back to list/grid, let us establish link from this side
	this.currentLinkedRow = idx;
	for ( var j = 0; j < this.columnNames.length; j++) {
		var col = this.linkedColumns[j]; // refers to column in linked table
		if (!col)
			continue;
		var fieldName = this.columnNames[j]; // field name in the display
		// panel
		var field = this.columns[fieldName];
		var val = thisRow[j] = row[col.columnIdx];
		var obj = this.P2.doc.getElementById(field.name); // note that
		// field.name is not
		// fielName. It is
		// likely to be
		// this.name_fieldName
		field.setValueToObject(obj, val);
		if (field.triggerFieldChangedEvents)
			field.triggerFieldChangedEvents(val, obj, null, false, true);
	}
};
// Jun 30 2009 : BugID 469 - Repeating Panel not working for display panel -
// Exis (Start) : Venkat
DisplayPanel.prototype.init = function() {
	this.grid.length = 1;
	this.nbrRows = 0;
	// linked table does not carry its own data
	if (this.linkedTableName) // this is a linked table
		return;
	this.initRepeatingPanel();

	// for grid
	if (this.idFieldName)
		this.idIdx = this.P2.fields[this.idFieldName].columnIdx;
	else
		this.idIdx = null;

	if (this.keyFieldName)
		this.keyIdx = this.P2.fields[this.keyFieldName].columnIdx;
	else
		this.keyIdx = null;

	if (this.actionFieldName) {
		this.actionField = this.P2.fields[this.actionFieldName];
		this.actionIdx = this.actionField.columnIdx;
	} else
		this.actionIdx = null;
};

var relatedElementSuffixes = [ 'Indent', 'PlusMinus', 'Picker', 'Hr', 'Mn',
		'Sc', 'Am', 'FieldsTable' ];
DisplayPanel.prototype.setData = function(dc) {
	if (this.nbrRows)
		this.deleteAllRows();

	var data = dc.grids[this.name];
	if (!data || data.length < 2)
		return;

	var doc = this.P2.doc;
	this.nbrRepeatedPanels = 0;
	this.repeatedPanels = {};

	var serverNames = data[0];
	var nbrCols = serverNames.length;
	var labelIdx;
	if (this.labelFieldName)
		labelIdx = getColumnIndex(serverNames,
				this.P2.fields[this.labelFieldName].unqualifiedName);
	else
		labelIdx = 0;

	var defaultDataRow = this.grid[0];
	/**
	 * delete existing data rows, leaving the 0th row containing default values
	 */
	this.grid.length = 1;
	for ( var i = 1; i < data.length; i++) {
		var serverData = data[i];
		var key = i;
		var label = serverData[labelIdx];
		var panel = this.cloneAndAddPanel(key, label);
		if (!panel)
			continue;

		var tableEle = doc.getElementById(this.tableName);
		if (tableEle)
			tableEle.id = this.tableName + key;

		tableEle = doc.getElementById(this.panelName);
		if (tableEle) {
			tableEle.id = this.panelName + key;
		}

		this.nbrRepeatedPanels++;
		this.repeatedPanels[key] = i;
		var localData = new Array();
		var n = defaultDataRow.length;

		// initialize local data with default values
		for ( var j = 0; j < n; j++)
			localData[j] = defaultDataRow[j];

		this.grid.push(localData);
		this.nbrRows++;
		for ( var j = 0; j < nbrCols; j++) {
			var columnName = this.columnNames[j];
			var field = this.columns[serverNames[j]];
			if (!field) {
				debug(serverNames[j]
						+ ' is received from server but is not a field for table '
						+ this.name);
				continue;
			}
			var val = serverData[j];
			if (val) {
				var dt = dataTypes[field.dataType];
				if (dt)
					val = dt.formatIn(val);
			}
			localData[field.columnIdx] = val;
			var obj = doc.getElementById(field.name);
			if (!obj) {
				debug(field.name + " not found in dom. Skipping this field");
				continue;
			}
			field.setValueToObject(obj, val);
			var suffix = '__' + i;
			obj.id = field.name + suffix;
			obj.rowIdx = i;

			obj = doc.getElementById(columnName + 'Label');
			if (obj) {
				obj.id = field.name + suffix + 'Label';
				obj.rowIdx = i;
			}
			// picker etc???
			for ( var ri = 0; ri < relatedElementSuffixes.length; ri++) {
				obj = doc.getElementById(field.name
						+ relatedElementSuffixes[ri]);
				if (obj) {
					obj.id = field.name + suffix + relatedElementSuffixes[ri];
					obj.rowIdx = i;
				}
			}
		}
	}

	// is there a linked table? In that case, page wouldn't have caleld it,
	// leaving it for us to do it after adding properl panels here
	if (this.tablesToBeMerged) {
		for ( var i = this.tablesToBeMerged.length - 1; i >= 0; i--)
			this.tablesToBeMerged[i].setData(dc, rowsToBeAppended,
					isFromAppendRows, listServiceOnLoad);
	}
};

DisplayPanel.prototype.deleteAllRows = function() {
	for ( var i = 0; i < this.addedElements.length; i++) {
		var ele = this.addedElements[i];
		if (ele && ele.parentNode)
			ele.parentNode.removeChild(ele);
	}
	this.nbrRows = 0;
	this.addedElements = new Array();
	this.repeatedPanels = new Object();
	this.nbrRepeatedPanels = 0;
};

// object id is fieldName + "__" + one based row index
DisplayPanel.prototype.getObjectId = function(fieldName, idx) {
	if (this.linkedTable)
		return fieldName;
	if (!idx) {
		if (this.nbrRows == 0) // table has no rows, probably yet...
			return fieldName;
		idx = this.currentRow;
	}
	return fieldName + '__' + idx;
};

DisplayPanel.prototype.getRowNumber = function(obj) {
	if (!obj) {
		if (this.nbrRows == 0)
			return 0;
		return this.currentRow;
	}
	// obj could be either a tr element, or any field in the tr. Safe method
	// would be to get tr and get its attribute
	if (obj.rowIdx)
		return obj.rowIdx;
	while (obj.tagName != 'BODY') {
		if (obj.rowIdx)
			return obj.rowIdx;
		obj = obj.parentNode;
	}
	// it shoudl never come here, but a defensive code
	return this.currentRow;
};

DisplayPanel.prototype.initRepeatingPanel = function() {
	this.addedElements = new Array();
	this.repeatedPanels = new Object();
	this.nbrRepeatedPanels = 0;
	var doc = this.P2.doc;
	var id = this.panelName + 'Top';
	var ele = doc.getElementById(id);
	if (!ele) {
		ele = doc.getElementById(this.panelName);

		if (!ele) {
			message('Design error: ' + this.name
					+ 'is being repeated, but its panel with name = '
					+ this.name + ' is not found in dom', "Error", "Ok", null,
					null, null);
			return;
		}
		this.hasNoTop = true;
	}
	this.panelToClone = ele;
	this.parentPanel = ele.parentNode;
	this.siblingElement = ele.nextSibling;
	this.parentPanel.removeChild(ele);

};

DisplayPanel.prototype.cloneAndAddPanel = function(key, label) {
	if (!label)
		label = key;

	var doc = this.P2.doc;
	var topPanel = this.panelToClone.cloneNode(true);
	topPanel.id = topPanel.id + key;
	if (this.siblingElement)
		this.parentPanel.insertBefore(topPanel, this.siblingElement);
	else
		this.parentPanel.appendChild(topPanel);
	this.addedElements.push(topPanel);

	var slidingPanel = doc.getElementById(this.panelName + 'Slider');
	if (slidingPanel) {
		slidingPanel.id = slidingPanel.id + key;
		slidingPanel.setAttribute('key', key);
	}

	var panel, id;

	id = this.panelName + 'Label';
	panel = doc.getElementById(id);
	if (panel) {
		panel.innerHTML = label;
		panel.id = id + key;
	}

	id = this.panelName + 'Twister';
	panel = doc.getElementById(id);
	if (panel) {
		panel.id = id + key;
		panel.onclick = this.P2.win.getTwisterFunction(this.name + key);
	}
	return topPanel;
};

DisplayPanel.prototype.changeIdsOfAddedPanel = function(key) {
	var id, panel;
	var doc = this.P2.doc;
	if (this.rowsCanBeAdded) {
		id = this.name + 'AddRow';
		panel = doc.getElementById(id);
		if (panel) {
			panel.id = id + key;
			panel.key = key;
		} else
			debug('Design Error : add row button with id ' + id
					+ ' is missing in dom for table ' + this.name);
	}

	id = this.name + 'Footer';
	panel = doc.getElementById(id);
	if (panel) {
		panel.id = id + key;
		panel.key = key;

		for ( var i = 0; i < this.columnNames.length; i++) {
			id = this.name + '_' + this.columnNames[i] + 'Footer';
			panel = doc.getElementById(id);
			if (panel) {
				panel.id = id + key;
				panel.key = key;
			}
		}
	} else
		debug('Design Error : add row button with id ' + id
				+ ' is missing in dom for table ' + this.name);

	var panelToReturn = null;
	panel = doc.getElementById(this.panelName);
	if (panel) {
		panelToReturn = panel;
		panel.id = this.panelName + key;
		panel.key = key;
	}

	panel = doc.getElementById(this.name);
	if (panel) {
		panel.id = this.name + key;
		panel.key = key;
		if (panel.tBodies)
			panelToReturn = panel.tBodies[0];
		else
			panelToReturn = panel.firstChild;
	}
	if (panelToReturn) {
		this.nbrRepeatedPanels++;
		this.repeatedPanels[key] = panelToReturn;
	}

	// is this a repeated display panel inside which other repeating tables are
	// to be merged?
	if (this.stubsForMergingTables) {
		for ( var aName in this.stubsForMergingTables) {
			panel = document.getElementById(aName);
			if (panel) {
				panel.id = (aName + key);
			} else {
				debug(this.name
						+ ' has to have a panel with name '
						+ this.appendLinkedTableTo
						+ ' for it to accomdate a linked repeating table. Unable to find that. Data will not be added');
			}
		}
	}

	return panelToReturn;
};

DisplayPanel.prototype.focussed = function(obj) {
	var idx = this.getRowNumber(obj);
	if (idx)
		this.currentRow = idx;
};

DisplayPanel.prototype.deleteRow = function(obj) {
	var idx = null;
	if (obj)
		idx = this.getRowNumber(obj);
	if (!idx)
		idx = this.currentRow;
	this.grid[idx] = null;
};
var GridPanel = function ()
{
    ListOrGridTable.call(this);
    //what is the internal key field name that is the key to this row? Normally, this is a hidden field
    // If you specify this, you MUST include a field with this name as an element of this grid
    this.idFieldName = null;

    //what is that all important field that a user sees as the key on the grid? 
    // This has relevance only if rows can be added. If user adds a row, but leaves all fields empty, then 
    // she does not expect us to add that row. keyField is used as THE field that determines if she entered data to this row or not
    this.keyFieldName = null;

    // if you use bulk action on the server, you have to track what should be done to each of the row.
    // if a row is not touched, it should not be modified, if it is touched, it should be modified, if it is added here,
    // it has to be inserted. Exility manages to set the value of the actionFieldName appropriately to take care of this.
    this.actionFieldName = null;

    // is there one ot more columns, whose values should be unique across all rows? If two columns together have to be unique,
    // specify them as comma separated fields. In case you have more than one such constraint, put then  semicolon separated
    // for example uniqueColumns = "col1,col2;col5,col6,col9"
    this.uniqueColumns = null; // revisit: this has to be two dimensional array.

    this.minRows = 0;
    this.maxRows = 0;
};

GridPanel.prototype = new ListOrGridTable;

GridPanel.prototype.removeTableRows = function (toDelete)
{
    var nbrDeleted = 0;
    var n = this.grid.length;
    for (var i = 1; i < n; i++)
    {
        var aRow = this.grid[i];
        if (!aRow)
            continue;
        if ((toDelete && aRow.isDeleted) || (!toDelete && !aRow.isDeleted))
            continue;
        var tr = this.P2.doc.getElementById(this.name + i);
        var obj = this.P2.doc.getElementById(this.name + '_' + this.name + 'Delete' + '__' + i);
        var f;
        if (obj.checked)
        {
            var result = true;
            f = this.functionBeforeDeleteRow;
            if (f)
            {
                if(f.indexOf('(') >= 0){
                    eval('result = this.P2.win.' + f);
                	
                }else{
                	result = this.P2.win[f]();
                } 
                if (result) return;
            }
            result = this.deleteRow(obj, tr, nbrDeleted > 0);
            if (!result)
            {
                if (e && e.preventDefault)
                    e.preventDefault();
            }
            else
            {
            	f = this.functionAfterDeleteRow;
                if (f)
                {
                    if(f.indexOf('(') >= 0){
                        eval('result = this.P2.win.' + f);
                    	
                    }else{
                    	result = this.P2.win[f]();
                    } 
                    if (result == false) return;
                }
                nbrDeleted++;
            }
        }
    }
};


// method invoked when checkbox of a row is modified.
// either remove an empty row or simple modify the bulkaction field.
GridPanel.prototype.bulkCheckAction = function (obj, colName)
{
    var field = this.columns[colName];
    //alert(colName+" colName="+field.name);
    var val = (obj.checked) ? '1' : '0';
    for (var i = 1; i < this.grid.length; i++)
    {
        if (this.grid[i])
        {
            var id = this.getObjectId(field.name, i);
            obj = this.P2.doc.getElementById(id);
            field.setValueToObject(obj, val);
            this.P2.fieldChanged(obj, field.name, false);
        }
    }
};

GridPanel.prototype.validate = function ()
{
    var panellabel = this.panelName;

    var ele = this.P2.doc.getElementById(this.panelName + "Label");
    if (ele)
        panellabel = ele.firstChild.nodeValue;

    var tableRows = this.tableBodyObject.childNodes;
    for (var rowCtr = 0; rowCtr < tableRows.length; rowCtr++)
    {
        var currentRow = tableRows[rowCtr];
        if (currentRow.style.display == 'none')
            continue;

        if (rowCtr % 2)
            currentRow.className = 'row1';
        else
            currentRow.className = 'row2';
    }

    //min/max rows
    if (this.minRows || this.maxRows)
    {
        var n = this.countActiveRows();
        if (this.minRows && n < this.minRows)
        {
            var e = new ExilityError('At least ' + this.minRows + ' rows required for the grid ' + panellabel + '.');
            e.render();
            throw (e);
        }
        if (this.maxRows && n > this.maxRows)
        {
            var e = new ExilityError('A maximum of ' + this.minRows + ' rows allowed for the grid ' + panellabel + '.');
            e.render();
            throw (e);
        }
    }
    this.validateUniqueColumns();
};

GridPanel.prototype.focussed = function (obj)
{
    var idx = this.getRowNumber(obj);
    if (idx)
        this.currentRow = idx;
};

//validateUniqueColumns() : see if a cell or a combination of cells across rows are unique
// this validation facilitates checking a particular field or a combination of field values to be unique
// across the rows in a table.
// User specifies the column names in exilUniqueColumns tag for table element as comma separated.
// exilUniqueColumns='field1,field2;field3,field4' means that there are two constraints. 
// field1+field2 have to be unique aswell as field3+field4.
// algorithm used is : form a value for each row by concatenating values of the fields that vae to be unique
//  check whether this value is unique.

GridPanel.prototype.validateUniqueColumns = function ()
{
    //debug("GridPanel.validateUniqueColumns() tableName=" + this.name + " uniqueColumns=" + this.uniqueColumns);
    // nothing to validate
    if (!this.uniqueColumns)
        return true;
    if (!this.uniqeColumnArrays)
    {
        this.uniqeColumnArrays = new Array();
        var rows = this.uniqueColumns.split(';');
        for (var i = 0; i < rows.length; i++)
            this.uniqeColumnArrays.push(rows[i].split(','));
    }

    for (var i = 0; i < this.uniqeColumnArrays.length; i++)
        this.validateOneUniqueSet(this.uniqeColumnArrays[i]);
};

GridPanel.prototype.validateOneUniqueSet = function (uq)
{
    var columnIndexes = new Array();
    var nbrCols = uq.length;
    var labels = '';
    var doc = this.P2.doc;
    var field;

    for (var i = 0; i < nbrCols; i++)
    {
        field = this.columns[uq[i]];
        columnIndexes.push(field.columnIdx);
        labels += ' "' + field.label + '"';
    }

    var vals = new Array();
    var rowIdxes = new Array();
    var n = this.grid.length;
    var idx = 0;
    var prevRowIdx = 0; 
    for (var i = 1; i < n; i++)
    {
        var aRow = this.grid[i]; //for each row
        prevRowIdx++;
        if (aRow == null || aRow.isDeleted)
        {
            prevRowIdx--;
            if (prevRowIdx < 0)
                prevRowIdx = 0;
            continue;
        }
        var val = "";
        for (var j = 0; j < nbrCols; j++)
        { //concatenate values from columns
            var columnValue = aRow[columnIndexes[j]];
            //if field is empty, itis possible that it is an empty line. Let us not cheque for duplicate empties!!
            if (columnValue != "") val += ',' + columnValue; //',' used to avoid numbers being added
        }
        if (val == "")
            continue; //no unique checking if nothing is entered
        for (var k = 0; k < idx; k++)
        {
            //check whether this value clashes with values for ealrier rows
            if (val == vals[k])
            {
                field = this.columns[uq[0]];
                this.tableBodyObject.childNodes[rowIdxes[k]].className = 'validationfailedrow';
                if ((k >= prevRowIdx) && !this.tableBodyObject.childNodes[prevRowIdx - 1])  
                    continue;

                this.tableBodyObject.childNodes[prevRowIdx - 1].className = 'validationfailedrow';
                var obj = doc.getElementById(field.name + '__' + i);
                var e;
                if (this.messageIdForUniqueColumns) //specific message
                {
                    //The 4 params are: The column label, The duplicate Column index 1 ,The duplicate Column index 2 , value which is duplicated 
                     e = new ExilityError(this.messageIdForUniqueColumns, labels, (k+1), prevRowIdx, val.substr(1));
                }
                else
                {
                    errMsg = "Column";
                    if (nbrCols > 1)
                        errMsg += "s";
                    errMsg = " " + labels + " should have unique values across all rows. Rows " + (k + 1) + " and " + (prevRowIdx) + " have same values.";  
                    e = new ExilityError(errMsg);
                }
                e.render(obj);
                throw e;
            }
        }
        vals[idx] = val;
        rowIdxes[idx] = prevRowIdx - 1; 
        idx++;
    }
};

//added to get a column value even if the row is marked for deletion
GridPanel.prototype.getColumnValue = function (columnName, rowIdx)
{
    var row = rowIdx ? this.grid[rowIdx] : this.grid[this.currentRow];
    if (!row)
        return '';
    var field = this.columns[columnName];
    if (!field)
        return '';

    return row[field.columnIdx];
};

GridPanel.prototype.bulkDeleteClicked = function (obj)
{
    var lineObj;
    var isImg = false;
    if (obj.tagName == 'INPUT')
        bulkChecked = obj.checked;
    else
    {
        isImg = true;
        if (obj.className == 'undeleteimg')
        {
            bulkChecked = true;
            obj.className = 'deleteimg';
            obj.src = obj.src.replace('undelete', 'delete');
        }
        else
        {
            obj.className = 'undeleteimg';
            obj.src = obj.src.replace('delete', 'undelete');
        }
    }
    for (var i = 1; i < this.grid.length; i++)
    {
        var row = this.grid[i];
        if (!row)
            continue;
        lineObj = this.P2.doc.getElementById(this.name + '_' + this.name + 'Delete' + '__' + i);
        if (!lineObj)
            continue;
        if (isImg)
        {
            if (obj.className != lineObj.className)
            {
                var evt = this.P2.doc.createEvent("HTMLEvents");
                evt.initEvent('click', true, true);
                lineObj.dispatchEvent(evt);
            }
        }
        else
        {
            if (obj.checked != lineObj.checked)
                lineObj.click();
        }
    }
};

GridPanel.prototype.bulkCheckClicked = function (obj, columnName)
{
    var chk;
    for (var i = 1; i < this.grid.length; i++)
    {
        chk = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + i);
        if (obj.checked != chk.checked)
            chk.click();
    }
};

//meant for addRow on tab key being pressed on the last field of a grid.
GridPanel.prototype.tabKeyPressed = function ()
{
	//
};

//added to get a column value even if the row is marked for deletion
GridPanel.prototype.getColumnValue = function (columnName, rowIdx)
{
    var row = rowIdx ? this.grid[rowIdx] : this.grid[this.currentRow];
    if (!row)
        return '';

    var field = this.columns[columnName];
    if (!field)
        return '';

    return row[field.columnIdx];
};

/******************************************
saves the first affected row by calling server action
*******************************************/
GridPanel.prototype.saveInBackground = function ()
{

    var dc = new DataCollection();
    var rowIdx = this.fillDC(dc);
    debug('Got ' + rowIdx + ' as the row to be autosaved.');
    if (!rowIdx)
        return 0;

    if (this.functionBeforeAutoSave)
    {
        if (!this.P2.win[this.functionBeforeAutoSave](dc, rowIdx))
        {
            debug('user defined function ' + this.functionBeforeAutoSave + ' returned false, and hence we are not going ahead with save..');
            return 0;
        }
    }
    //mark the rows as 'being saved'
    var doc = this.P2.doc;
    var tr = doc.getElementById(this.name + rowIdx);
    //attribute set for page designers to use css like [exil-save=saving]
    tr.setAttribute('exil-save', 'saving');

    this.grid[rowIdx].beingSaved = true;
    //craeate a call back object that will call autoSaveReturned() when service returned
    var callBackObject = { gridPanel: this, rowIdx: rowIdx, serviceReturned: function (passedDc) { this.gridPanel.autoSaveReturned(passedDc, this.rowIdx); } };

    //we are sending "this" as the call back object and asking serverAgent to call us even if the service fails.
    //serverAgent will call serviceReturned(dc)
    var se = new ServiceEntry(this.autoSaveServiceName, dc, false, null, callBackObject, null, false, false, false, null, null, true);
    this.P2.win.serverStub.callService(se);
    return rowIdx;
};
/************************************
called back by server agent after the server returns after saving the row
*************************************/
GridPanel.prototype.autoSaveReturned = function (dc, rowIdx)
{
    if (this.functionAfterAutoSave)
        this.P2.win[this.functionAfterAutoSave](dc, rowIdx);

    //reset action field for this row
    var row = this.grid[rowIdx];
    if (row)
    {
        delete row.beingSaved;
        if (dc.success && this.actionFieldName)
            row[this.actionIdx] = '';
    }
    else
    {
        debug('ERROR: service returned for ' + rowIdx + ' but the row is already deleted.');
    }

    //reset exil-save attribute for tr element
    var tr = this.P2.doc.getElementById(this.name + rowIdx);
    tr.setAttribute('exil-save', dc.success ? 'saved' : 'failed');
};

//quick search on list panel based on a search field
ListOrGridTable.prototype.quickSearchInit = function ()
{
    var ele = this.P2.doc.getElementById(this.quickSearchFieldName);
    if (!ele)
    {
        alert('Design Error: ' + this.quickSearchFieldName + ' is not a valid field name. It is used as a quick search field for  list panel ' + this.panelName);
        return;
    }
    ele.searchTableName = this.name; //link for event handler function to get this object
    //attach event handlers. 
    //keyPressedOnQuickSearch() is defined in exilityLoader, so that it is available in the window that fires these events. It calls this.quickFIlter(val)
    if (ele.addEventListener)
        ele.addEventListener("keyup", this.keyPressedOnQuickSearch, true);
    else
        ele.attachEvent("onkeyup", this.keyPressedOnQuickSearch);
    this.quickSearchEle = ele;
};

/**
 * this is not a method, but an event function. Hence "this" will not work
 * @param evt
 */
ListOrGridTable.prototype.keyPressedOnQuickSearch = function ()
{
	if(!this.searchTableName){
		debug('We have issue with concept of this while handling events!!');
		return;
	}
	var table = null;
	try
	{
		table = currentActiveWindow.P2.getTable(this.searchTableName);
	}catch(e)
	{
		debug('unable to get table ' + e);
	}
	
	//debug("this is " + this + ' and value is ' + this.value);
	if(!table)
	{
		debug('Unable to find table for quick search for element ' + this.id);
		return;
	}
	debug(this.value + ' is the value with entireServerData =' + (table.entireServerData && table.entireServerData.length));
	if(table.entireServerData)
	{
		table.paginatedQuickSearch(this.value);
	}
	else
	{
		table.quickSearch(this.value);
	}
	
};

ListOrGridTable.prototype.quickSearchReset = function ()
{
    this.quickSearchEle.value = this.lastFilteredText = '';
    this.gotFiltered = false;
};

ListOrGridTable.prototype.quickSearchBuild = function ()
{
    var n = this.grid.length;
    var m = this.columnNames.length;
    for (var i = 1; i < n; i++)
    {
    	var row = this.grid[i];
    	if(row) this.assignSearchText(row, m);
    }
};

ListOrGridTable.prototype.assignSearchText = function (row, m)
{
	var text = [];
    for (var j = 0; j < m; j++)
    {
    	var col = row[j];
    	if(col.toUpperCase) text.push(col.toUpperCase());
    	else text.push(col);
    }
    row.searchText = text.join(' ');
};

ListOrGridTable.prototype.quickSearchRebuildRow = function (idx)
{
    if (!idx)
        idx = this.currentRow;
    var row = this.grid[idx];
    if (row) this.assignSearchText(row, this.columnNames.length);// row is deleted
};

ListOrGridTable.prototype.quickSearchAdd = function (nbrToAdd)
{
    var m = this.columnNames.length;
    var n = this.grid.length;
    var doc = this.P2.doc;
    for (var i = 0; i < nbrToAdd; i++)
    {
    	var row = this.grid[n];
        if(row) 
        { 
        	this.assignSearchText(row, m);
        	row.tr = doc.getElementById(this.name + i);
        }
        n++;
    }
    //re-search
    if (this.gotFiltered)
    {
        this.quickSearch(this.quickSearchEle.value);
    }
};

ListOrGridTable.prototype.quickSearch = function (text)
{
	debug('|' + text + '| and last text was  |' + this.lastFilteredText + '|' );
	if(this.lastFilteredText == text){
		debug('Not going to filter again!!|');
		return;
	}
	this.lastFilteredText = text;
    var n = this.grid.length;
    var nbrRows = 0;
    var m = this.columnNames.length;
    if (text)
    {
        this.gotFiltered = true;
        text = text.toUpperCase();
        for (var i = 1; i < n; i++)
        {
        	var row = this.grid[i];
        	if(!row)
        	{
        		continue;
        	}

        	if(!row.searchText)
        	{
        		this.assignSearchText(row, m);
        	}
        	if(!row.tr)
        	{
        		row.tr = this.P2.doc.getElementById(this.name + i);
        	}
        	var disp = 'none';
    		if(row.searchText.indexOf(text) >= 0)
            {
    			disp = '';
                nbrRows++;
            }
    		
			row.tr.style.display = disp;
			if(row.rightTr)
			{
				row.rightTr.style.display = disp;
			}
    	}
        if (this.trELe)
        {
            this.trEle.innerHTML = nbrRows + ' of ' + this.totalRows;
        }
    }
    else if (this.gotFiltered)//select all
    {
        this.gotFiltered = false;
        for (var i = 1; i < n; i++)
        {
        	var row = this.grid[i];
        	if(row && row.tr)
        	{
        		row.tr.style.display = '';
        	}
        	else
        	{
        		debug('Could not locate tr for row ' + i);
        	}
        }
        
        if(this.trEle)
        {
        	this.trEle.innerHTML = this.totalRows;
        }
    }

    this.P2.win.adjustFrameHeightToBodyHeight();
    return nbrRows;
};

ListOrGridTable.prototype.paginatedQuickSearch = function (text)
{
	/*
	 * get entire server data filtered, so that this.filteredRows is updated
	 */
	this.getQuickSearchIndexes(text);
	/*
	 * use filtered rows as entire data for pagination
	 */
    var totalRows = this.filteredRows.length;
    /*
     * pageData should have header row, and carry at most one page of data 
     */
	var pageData = [this.entireServerData[0]];
    var nbrRows = totalRows;
    if(nbrRows > this.pageSize) nbrRows = this.pageSize;
	for(var i = 0; i < nbrRows; i++)
	{
		var idx = this.filteredRows[i];
		pageData.push(this.entireServerData[idx]);
	}

	/*
	 * create a dc as if it came from server
	 */
	var dc = new DataCollection();
	dc.addGrid(this.name, pageData);
	if(totalRows > nbrRows)
	{
	    dc.values[this.name + 'TotalRows'] = totalRows;
	}
	/*
	 * reset pagination. ensure that it does not call localPaginaitonInit again
	 */
	this.initPagination(dc, true);
	
	/*
	 * now simulate setData. This portion is a simpler version of setData() method
	 */
	this.tableBodyObject.innerHTML = '';
    
    if (this.rightTableBodyObject)
    {
        this.rightTableBodyObject.innerHTML = '';
    }

    //remove rows from data 
    this.grid.length = 1;
    this.nbrRows = 0;

    this.serverData = pageData;

    var doc = this.P2.doc;
    this.currentRow = 0; 
    for (var i = 1; i <= nbrRows; i++)
    {
    	var serverDataRow = pageData[i];
        this.currentRow++;
        //add an html row
        var newRow = this.htmlRowToClone.cloneNode(true);
        var newDataRow = new Array(this.nbrColumns);
        var clsName = (this.currentRow % 2) ? 'row2' : 'row1';
        newRow.className = clsName;
        newRow.rowIdx = this.currentRow; // set the pointer to the data row
        newRow.id = this.name + this.currentRow; // in case I need to reach the tr with just the index...
        this.tableBodyObject.appendChild(newRow);
        
        if (this.frozenColumnIndex)
        {
            this.cloneFrozenRow(clsName, this.currentRow);
        }

        this.grid.push(newDataRow);
        this.addDataToARow(doc, newDataRow, newRow.rowIdx, serverDataRow, this.fieldCols);
    }
};

ListOrGridTable.prototype.getQuickSearchIndexes = function (text)
{
	if(text.toUpperCase) text = text.toUpperCase();
	var newFilteredRows = [];
    var data = this.entireServerData;
    var n = data.length - 1;
	debug('going to filter ' + n + ' rows');
   for (var i = 1; i < n; i++)
    {
        var row = data[i];
        if(!row.searchText)
        	this.assignSearchText(row, row.length);
		if(row.searchText.indexOf(text) >= 0)
            newFilteredRows.push(i);
    }
    this.filteredRows = newFilteredRows;
    debug('ended up filtering ' + this.filteredRows.length + ' rows');
};

//repeating display panel. Add as many panels as many rows we receive...
var RepeatingDisplayPanel = function ()
{
    AbstractTable.call(this);
    this.toBeSentToServer = true;
    this.repeatOnFieldName = null;
    this.labelFieldName = null;
};

RepeatingDisplayPanel.prototype = new AbstractTable;

RepeatingDisplayPanel.prototype.init = function ()
{
    this.grid.length = 1;
    this.nbrRows = 0;
    this.initRepeatingPanel();
};
RepeatingDisplayPanel.prototype.getRowNumber = function (obj)
{
    return obj.rowIdx || this.currentRow;
};

//If I have to find a field in a row, what id will it  have?
RepeatingDisplayPanel.prototype.getObjectId = function (fieldName, rowIdx)
{
    return fieldName + '__' + rowIdx;
};

//data is received from server in a dc. Set it to the table
RepeatingDisplayPanel.prototype.setData = function (dc, rowsToBeAppended, isFromAppendRows, listServiceOnLoad)
{
    if (this.nbrRows)
        this.deleteAllRows();
    var doc = this.P2.doc;
    this.nbrRepeatedPanels = 0;
    this.repeatedPanels = new Object();
    var data = dc.grids[this.name];
    if (!data || data.length < 2)
        return;

    var serverNames = data[0];
    var nbrCols = serverNames.length;
    var keyName = this.P2.fields[this.repeatOnFieldName].unqualifiedName;
    var keyIdx = getColumnIndex(serverNames, keyName);
    var labelIdx;
    if (this.labelFieldName)
        labelIdx = getColumnIndex(serverNames, this.P2.fields[this.labelFieldName].unqualifiedName);
    else
        labelIdx = keyIdx;
    var defaultDataRow = this.grid[0];
    for (var i = 1; i < data.length; i++)
    {
        var serverData = data[i];
        var key = serverData[keyIdx];
        var label = serverData[labelIdx];
        var panel = this.cloneAndAddPanel(key, label);
        if (!panel)
            continue;
        this.nbrRepeatedPanels++;
        this.repeatedPanels[key] = i;
        var localData = new Array();
        var n = defaultDataRow.length;
        //initialize data with default values
        for (var j = 0; j < n; j++)
            localData[j] = defaultDataRow[j];
        this.grid.push(localData);
        this.nbrRows++;
        for (var j = 0; j < nbrCols; j++)
        {
            var field = this.columns[serverNames[j]];
            if (!field)
            {
                debug(serverNames[j] + ' is received from server but is not a field for table ' + this.name);
                continue;
            }
            var val = serverData[j];
            if (val)
            {
                var dt = dataTypes[field.dataType];
                if (dt)
                    val = dt.formatIn(val);
            }
            localData[field.columnIdx] = val;
            var obj = doc.getElementById(field.name);
            field.setValueToObject(obj, val);
            obj.id = field.name + '__' + i;
            obj.rowIdx = i;
        }
    }
    var m = data.length - 1; //actual nbr of rows

    if (exilParms.displayInitialRows && this.initialNumberOfRows && this.initialNumberOfRows > m)
    {
        this.addInitialRowsToRepeatingPanel(dc, listServiceOnLoad);
    }
};

RepeatingDisplayPanel.prototype.fillDC = function (dc)
{
    var grid = new Array();
    var n = this.grid.length;
    //add desired number of empty rows first
    var i, field, val, j, dt, row, gridRow;

    for (i = 0; i < n; i++)
    {
        gridRow = this.grid[i];
        if (!gridRow)
            continue;
        if (this.keyIdx == null || gridRow[this.keyIdx])
        {
            gridRow.toBeSent = true;
            grid.push(new Array());
        }
        else
            this.grid[i].toBeSent = false;
    }

    //now go by column, and add values
    var col = 0;
    for (var x in this.columns)
    {
        field = this.columns[x];
        if (!field.toBeSentToServer)
            continue;
        dt = dataTypes[field.dataType];
        grid[0][col] = x;
        row = 1;
        j = field.columnIdx;
        for (i = 1; i < n; i++)
        {
            gridRow = this.grid[i];
            if (!gridRow || gridRow.toBeSent == false)
                continue;
            val = this.grid[i][j];
            if (val && dt)
                val = dt.formatOut(val);
            grid[row][col] = val;
            row++;
        }
        col++;
    }
    if (!col)
    {
        debug(this.name + ' does not have any columns to be sent to server');
        return;
    }
    dc.addGrid(this.name, grid);
};
/**
 * custom sort used by table sort. Sorts two objects that have an attribute
 * named value that holds the value to be compared
 * 
 * @param x
 *            has x.value as its value to be compared
 * @param y
 *            has y.value as the value to be compared
 * @returns as per array.sort() requirement
 */
var mySortWorker = function(x, y) {
	/*
	 * we have to return 0, 1 or -1 based on how x compares with y
	 */
	if (!x && x !== 0) {
		/*
		 * if both are null, it is better to make them equal
		 */
		if (!y && y !== 0)
			return 0;
		return -1;
	}

	if (!y && y !== 0)// y is null, x is higher
		return 1;

	if (x == y)
		return 0;

	if (x > y)
		return 1;

	return -1;
};

var mySort = function(x, y) {
	return mySortWorker(x.val, y.val);
};

/**
 * custom sort used by table sort for multiple columns. Sorts two arrays that
 * have equal number of values in them
 * 
 * @param x
 *            is an array of values
 * @param y
 *            is an array of values
 * @returns as per array.sort() requirement.
 */

var myMultiSort = function(x, y) {
	var n = x.length;
	for ( var i = 0; i < n; i++) {
		var comp = mySortWorker(x[i], y[i]);
		if (comp !== 0)
			return comp;
	}
	return 0;
};

ListOrGridTable.prototype.sort = function(obj, columnName, sortOrder) {
	if (!obj)
		obj = this.P2.doc.getElementById(this.name + '_' + columnName
				+ 'SortImage');
	var lastOne = this.sortByColumn;
	this.sortByColumn = columnName;

	// column that was sorted on earlier needs to be reset
	if (obj && lastOne && lastOne != columnName) {
		this.resetSortImage(lastOne);
	}

	// decide about the sort order
	if (sortOrder) // caller has specified. (directly called by a script)
	{
		this.sortOrder = (sortOrder < 0) ? -1 : 1;
	} else // user clicked on a column
	{
		if (lastOne == columnName && this.sortOrder)
			this.sortOrder = -this.sortOrder;
		else
			this.sortOrder = 1;
	}

	debug('Going to sort table ' + this.name + ' on column '
			+ this.sortByColumn + ' with sort order as ' + this.sortOrder);
	// set attributes of this column
	if (obj) {
		if (this.sortOrder > 0) {
			obj.src = obj.src.replace('sortable', 'sortedUp').replace(
					'sortedDown', 'sortedUp');
			obj.title = 'Sort Descending';
		} else {
			obj.src = obj.src.replace('sortable', 'sortedDown').replace(
					'sortedUp', 'sortedDown');
			obj.title = 'Sort Ascending';
		}

		var th = this.P2.doc.getElementById(this.name + '_' + columnName
				+ 'Label');

		// save the current class name to be restored later
		if (!th.savedClassName && th.savedClassName != '')
			th.savedClassName = th.className || '';
		th.className = "exilSortTHClass";
	}
	// do we ask server to do this job? We also have a special case of less than
	// a page because of local filtering..
	if ((this.totalRows && this.totalPages > 1)
			|| (this.localPagination && this.entireServerData)) {
		// request page with sort instructions
		this.requestPage(1, columnName, this.sortOrder < 0);
	} else {
		this.sortData();
		// has user asked for a call back function?
		var fn = this.P2.win[this.name + 'AfterSort'];
		if (fn)
			fn(columnName, this.sortOrder < 0);
		this.simulateClickIfRequired();
	}
	// if this is paginated, simulate as if user entered page no 1
	if (this.pageSize && this.totalPages && this.totalPages > 1 && this.cpEle) {
		this.cpEle.value = 1;
		this.paginate('random', true);
	}

	return;
};

ListOrGridTable.prototype.resetSortImage = function(colName) {
	var ele = this.P2.doc.getElementById(this.name + '_' + colName
			+ 'SortImage');
	if (!ele) {
		return;
	}
	if (this.sortOrder > 0)
		ele.src = ele.src.replace('sortedUp', 'sortable');
	else
		ele.src = ele.src.replace('sortedDown', 'sortable');
	ele.title = 'Sort Ascending';

	ele = this.P2.doc.getElementById(this.name + '_' + colName + 'Label');
	if (ele)
		ele.className = ele.savedClassName; // restored original class name
};

ListOrGridTable.prototype.sortData = function() {
	var field = this.columns[this.sortByColumn];
	if (!field) {
		debug(this.sortByColumn
				+ ' is not a valid column name. Sorting abandoned');
		return;
	}

	var sortedIndexes = this.sortedIndexes = this.getSortedIndexes(
			this.sortByColumn, this.sortOrder < 0);
	if (sortedIndexes == null)
		return;
	if (this.initialNumberOfRows) {
		var nextIdx = sortedIndexes.length + 1;
		while (nextIdx < this.initialNumberOfRows) {
			sortedIndexes.push(nextIdx);
			nextIdx++;
		}
	}

	// sortedIndexes now contains indexes from 1 to n in their sorted order
	// get the trs into an array first;
	// variables with 1 are for rigth panel
	var trs = [];
	var tr = this.tableBodyObject.lastChild;
	var tr1 = null;
	var trs1 = null;
	if (this.frozenColumnIndex) {
		tr1 = this.rightTableBodyObject.lastChild;
		trs1 = [];
	}
	// may be it helps optimizing the rendering
	this.tableBodyObject.style.display = 'none';
	if (trs1) {
		this.rightTableBodyObject.style.display = 'none';
		if (this.scrollTableBodyObject)
			this.scrollTableBodyObject.style.display = 'none';
	}
	// remove trs into the array
	while (tr) {
		trs[tr.rowIdx] = tr;
		this.tableBodyObject.removeChild(tr);
		tr = this.tableBodyObject.lastChild;
	}
	while (tr1) // takes care right panel as well
	{
		trs1[tr1.rowIdx] = tr1;
		this.rightTableBodyObject.removeChild(tr1);
		tr1 = this.rightTableBodyObject.lastChild;
	}
	// we need the table and the cell number which is being sorted
	var cellIdx = null;
	var cellOnRight = false;
	var ele = this.P2.doc.getElementById(field.name + 'Label'); // this is the
	// TH element
	if (ele) {
		cellIdx = ele.cellIndex;
		if (this.frozenColumnIndex) {
			while (ele.nodeName != 'TABLE')
				ele = ele.parentNode;
			var nchars = ele.id.length;
			if (ele.id.indexOf('Right') == (nchars - 5)
					|| ele.id.indexOf('RightHeader') == (nchars - 11)) // is
				// this
				// cell
				// on
				// the
				// right
				// panel?
				cellOnRight = true;
		}
	}

	var j = 1; // tracks actual number of rows that are displayed. to take care
	// of row1/row2
	var n = sortedIndexes.length;
	var cell;
	for ( var i = 0; i < n; i++) {
		tr = trs[sortedIndexes[i]];
		if (!tr) {
			debug(' for i = ' + i + ' index is ' + sortedIndexes[i]
					+ ' and tr is null!!!! ');
			continue;
		}
		this.tableBodyObject.appendChild(tr);
		// for right table
		if (trs1) {
			tr1 = trs1[sortedIndexes[i]];
			this.rightTableBodyObject.appendChild(tr1);
		}
		// change column css to unsorted
		if (tr.style.display != 'none') {
			var cls = (j % 2) ? 'row2' : 'row1';
			this.resetHeaderSortClass(tr, cls);
			if (trs1)
				this.resetHeaderSortClass(tr1, cls);
			// is the td being sorted int this tr, we have to set the class for
			// that celll
			if (cellIdx != null) {
				if (cellOnRight)
					cell = tr1.cells[cellIdx];
				else
					cell = tr.cells[cellIdx];
				cls = cell.className;
				if (cls)
					cls += ' exilSortTDClass';
				else
					cls = 'exilSortTDClass';
				cell.className = cls;
			}
			j++;
		}
	}

	// display the table back
	this.tableBodyObject.style.display = '';
	if (trs1) {
		this.rightTableBodyObject.style.display = '';
		if (this.scrollTableBodyObject)
			this.scrollTableBodyObject.style.display = '';
	}
};

ListOrGridTable.prototype.getSortedIndexes = function(colName, sortDescending) {
	if (!colName || colName === ' ')
		return null;

	/**
	 * has designer asked to sort by an additional column always?
	 */
	if (this.additionalColumnToSort && colName != this.additionalColumnToSort) {
		return this.getMutliSortedIndexes([ colName,
				this.additionalColumnToSort ], sortDescending);
	}
	var nbrRows = this.grid.length;
	if (this.initialNumberOfRows) {
		nbrRows = this.numberOfOrigDataRows; // remember this number also
		// includes header row. hence no
		// need to do - 1;
	}

	if (nbrRows <= 1)
		return null;
	var field = this.columns[colName];

	// set data type for comparison if it is different from text
	var dt = null;
	if (!field.getDisplayVal) {
		dt = dataTypes[field.dataType];
		if ((dt && dt.basicType == AbstractDataType.TEXT))
			dt = null;
	}

	// push values of the column into an array
	var colValues = [];
	var colIdx = field.columnIdx;
	for ( var i = 1; i < nbrRows; i++) {
		var row = this.grid[i];
		var val = row && row[colIdx];
		if (field.getDisplayVal) {
			val = field.getDisplayVal(val);
		}
		if (val) {
			// remember, dt has value only if it is non-text
			if (dt)
				val = dt.clientObject(val);
			else if (val.toUpperCase)
				val = val.toUpperCase();
		}
		// push an object with value and idx into array.
		colValues.push({
			val : val,
			idx : i
		});
	}
	// Our objective is to get the row indexes inn the order based on value.
	// Hence our sort function is supplied
	colValues.sort(mySort);
	var sortedIndexes = [];
	nbrRows = colValues.length;
	if (sortDescending) {
		for ( var i = nbrRows - 1; i >= 0; i--)
			sortedIndexes.push(colValues[i].idx);
	} else {
		for ( var i = 0; i < nbrRows; i++)
			sortedIndexes.push(colValues[i].idx);
	}

	return sortedIndexes;
};
/**
 * returns an array of indexes that would put the data grid sorted as per
 * supplied arguments
 */

ListOrGridTable.prototype.getMutliSortedIndexes = function(colNames,
		sortDescending) {
	var nbrRows = this.grid.length;
	if (this.initialNumberOfRows)
		nbrRows = this.numberOfOrigDataRows; // remember this number also
	// includes header row. hence no
	// need to do - 1;

	if (nbrRows <= 1)
		return null;

	/**
	 * each element of this is an {idx:<original index>, [columnObjects,,,,,]
	 */
	var fieldsToSort = [];
	var nbrCols = colNames.length;
	for ( var j = 0; j < nbrCols; j++) {
		var field = this.columns[colNames[j]];
		if (field) {
			var dt = null;
			if (!field.getDisplayVal) {
				dt = dataTypes[field.dataType];
				if ((dt && dt.basicType == AbstractDataType.TEXT))
					dt = null;
			}
			fieldsToSort.push({
				idx : field.columnIdx,
				dt : dt,
				field : field
			});
		} else {
			debug(this.columns[columnName[j]]
					+ ' is not included in sorting as it is not a valid column name');
		}
	}

	/*
	 * did we get any column to sort at all?
	 */
	nbrCols = fieldsToSort.length;
	if (nbrCols == 0) {
		debug('Not going to sort as no valid coulumns found.');
		return null;
	}
	/*
	 * now, we go thru all rows of the grid and prepare an array to be sorted
	 */

	// push values of the column into an array
	var dataToSort = [];
	for ( var i = 1; i < nbrRows; i++) {
		var row = this.grid[i];
		if (!row || row.isDeleted)
			continue;

		var valueToSort = [];
		valueToSort.idx = i;
		dataToSort.push(valueToSort);
		for ( var j = 0; j < nbrCols; j++) {
			var inf = fieldsToSort[j];
			var val = trim(row[inf.idx]);

			if (val) {
				var field = inf.field;
				if (field && field.getDisplayVal) {
					val = field.getDisplayVal(val);
				}
				// remember, dt has value only if it is non-text
				if (inf.dt)
					val = inf.dt.clientObject(val);
				else if (val.toUpperCase)
					val = val.toUpperCase();
			}
			valueToSort.push(val);
		}
	}

	// Our objective is to get the row indexes in the order based on value.
	// Hence our sort function is supplied
	dataToSort.sort(myMultiSort);

	var sortedIndexes = [];
	nbrRows = dataToSort.length;
	if (sortDescending) {
		for ( var i = nbrRows - 1; i >= 0; i--)
			sortedIndexes.push(dataToSort[i].idx);
	} else {
		for ( var i = 0; i < nbrRows; i++)
			sortedIndexes.push(dataToSort[i].idx);
	}

	return sortedIndexes;
};

ListOrGridTable.prototype.resetHeaderSortClass = function(tr, cls, idx) {
	if (tr.className != 'deletedrow' && tr.className != cls)
		tr.className = cls;
	var cells = tr.cells || tr.childNodes;
	var cell;
	var n = cells.length;
	// NEEDS REFACTORING : this is a wasteful activity. We should rememeber the
	// last sorted column idx
	for ( var j = 0; j < n; j++) {
		cell = cells[j];
		if (!cell || cell.nodeName === '#text')
			continue;

		if (cell.className) // remove sorted class.
			cell.className = cell.className.replace('exilSortTDClass', '');
	}
};

ListOrGridTable.prototype.removeFilter = function() {
	this.filterObject.src = this.filterObject.src.replace('filtered',
			'filterable');
	this.filterObject.title = 'Filter';
	this.filterData();
	this.filterByColumn = null;
	this.filterValue = null;
	this.filterObject = null;
};

ListOrGridTable.prototype.filter = function(obj, columnName, filterValue) {
	if (!obj)
		obj = this.P2.doc.getElementById(this.name + '_' + columnName
				+ 'FilterImage');
	var lastOne = this.filterByColumn;
	this.filterByColumn = columnName;
	this.filterValue = filterValue;
	this.filterObject = obj;
	if (lastOne != columnName)// unfilter
	{
		obj.src = obj.src.replace('filterable', 'filtered');
		obj.title = 'Filter/Cancel';
	}

	if (lastOne) {
		this.filterObject.src = this.filterObject.src.replace('filtered',
				'filterable');
		this.filterObject.title = 'Filter';
	}
	var n;
	var comp = null;
	if (filterValue.indexOf('<=') == 0) {
		comp = 'le';
		filterValue = filterValue.substr(2);
	} else if (filterValue.indexOf('>=') == 0) {
		comp = 'ge';
		filterValue = filterValue.substr(2);
	} else if (filterValue.indexOf('!=') == 0) {
		comp = 'ne';
		filterValue = filterValue.substr(2);
	} else if (filterValue.indexOf('==') == 0) {
		comp = 'eq';
		filterValue = filterValue.substr(2);
	} else if (filterValue.indexOf('=') == 0) {
		comp = 'eq';
		filterValue = filterValue.substr(1);
	} else if (filterValue.indexOf('<') == 0) {
		comp = 'lt';
		filterValue = filterValue.substr(1);
	} else if (filterValue.indexOf('>') == 0) {
		comp = 'gt';
		filterValue = filterValue.substr(1);
	} else {
		n = filterValue.indexOf('%');
		if (n == 0) {
			n = filterValue.lastIndexOf('%');
			if (n == 0) {
				filterValue = filterValue.substr(1);
				comp = 'ew';
			} else {
				filterValue = filterValue.substring(1, n);
				comp = 'cn';
			}
		} else if (n > 0) {
			filterValue = filterValue.substring(0, n);
			comp = 'sw';
		}
	}
	this.filterData(columnName, filterValue, comp);
};

// common one to remove or filter columnName == null implies remove filter
ListOrGridTable.prototype.filterData = function(columnName, filterValue, comp) {
	var n = this.grid.length;
	var val;
	var tr = null;
	var tr1 = null;
	var tr2 = null;
	var dt = null;
	var colIdx = null;
	if (columnName) {
		var field = this.columns[columnName];
		colIdx = field.columnIdx;
		dt = dataTypes[field.dataType];
		if (!dt)
			dt = new TextDataType('text', '', null, 0, 9999);
		filterValue = dt.clientObject(filterValue);
		if (dt.basicType == dt.TEXT)
			filterValue = filterValue.toUpperCase();
		if (comp == null) {
			if (dt.basicType == dt.TEXT)
				comp = 'cn';
			else
				comp = 'eq';
		}
		comp = ListOrGridTable.comparators[comp]; // that is a function
	}
	var doc = this.P2.doc;
	var j = 1;
	for ( var i = 1; i < n; i++) {
		var row = this.grid[i];
		if (!row)
			continue;
		tr = doc.getElementById(this.name + i);
		if (!tr)
			alert(this.name + i + ' is not a tr ');

		if (this.rightTableBodyObject) {
			tr1 = doc.getElementById(this.name + 'Right' + i);
			if (this.scrollTableBodyObject)
				tr2 = doc.getElementById(this.name + 'Scroll' + i);
		}
		var selected = true;
		if (columnName) {
			val = dt.clientObject(row[colIdx]);
			if (dt.basicType == dt.TEXT) {
				if (val)
					val = val.toUpperCase();
				else
					val = '';
			}
			selected = comp(val, filterValue);
		}
		var disp = selected ? '' : 'none';
		tr.style.display = disp;
		if (tr1) {
			tr1.style.display = disp;
			if (tr2)
				tr2.style.display = disp;
		}
		var cls = (j % 2) ? 'row2' : 'row1';
		if (selected) {
			if (tr.className != 'deletedrow' && tr.className != cls) {
				tr.className = cls;
				if (tr1)
					tr1.className = cls;
			}
			j++;
		}
	}
};

// convinient functions instead of switch-case in loops
ListOrGridTable.comparators = {
	eq : function(cv, fv) {
		if (!cv)
			return fv ? false : true;
		if (!fv)
			return false;
		return (cv.valueOf() == fv.valueOf());
	},
	ne : function(cv, fv) {
		return (cv != fv);
	},
	gt : function(cv, fv) {
		return (cv > fv);
	},
	ge : function(cv, fv) {
		return (cv >= fv);
	},
	lt : function(cv, fv) {
		return (cv < fv);
	},
	le : function(cv, fv) {
		return (cv <= fv);
	},
	sw : function(cv, fv) {
		return (cv.indexOf(fv) == 0);
	},
	ew : function(cv, fv) {
		return (cv.lastIndexOf(fv) == cv.length - fv.length);
	},
	cn : function(cv, fv) {
		return (cv.indexOf(fv) >= 0);
	}
};

// remember that this data is in server format, and hence dates will get sorted
// properly. Let us just sort them as string
ListOrGridTable.prototype.sortServerData = function(columnToSort, sortDesc) {
	var colIdx = this.getColIdxForServerData(columnToSort);
	if (colIdx == null)
		return;
	var data = this.entireServerData;
	var startAt = 1; // data starts at row 1 and not 0
	var n = data.length;
	var f = this.filteredRows;
	var isFiltered = false;
	if (f && (f.length + 1) != n) {
		/**
		 * filtering within rows that are already filtered.
		 */
		isFiltered = true;
		n = f.length;
		startAt = 0;
	}
	var colData = [];
	if (this.additionalColumnToSort
			&& columnToSort != this.additionalColumnToSort) {
		var otherColIdx = this
				.getColIdxForServerData(this.additionalColumnToSort);
		for ( var i = startAt; i < n; i++) {
			var idx = isFiltered ? f[i] : i;
			var row = data[idx];
			var val1 = row[colIdx];
			/*
			 * this is server data being sorted. date and numbers sort fine.
			 * 
			 */
			if (val1 && val1.toUpperCase) {
				val1 = val1.toUpperCase();
			}
			var val2 = row[otherColIdx];
			/*
			 * this is server data being sorted. date and numbers sort fine.
			 * 
			 */
			if (val2 && val2.toUpperCase) {
				val2 = val2.toUpperCase();
			}
			var valRow = [ val1, val2 ];
			valRow.idx = idx;
			colData.push(valRow);
		}
		colData.sort(myMultiSort);
	} else {
		for ( var i = startAt; i < n; i++) {
			var idx = isFiltered ? f[i] : i;
			var val = data[idx][colIdx];
			/*
			 * this is server data being sorted. date and numbers sort fine.
			 * 
			 */
			if (val && val.toUpperCase) {
				val = val.toUpperCase();
			}
			// push an object with val and idx for our mySort algorithm
			debug('going to push ' + val + ' and ' + idx);
			colData.push({
				val : val,
				idx : idx
			});
		}
		colData.sort(mySort);
	}
	if (sortDesc)
		colData.reverse();
	var sortedRows = this.filteredRows = [];
	n = colData.length;
	for ( var i = 0; i < n; i++)
		sortedRows.push(colData[i].idx);
};

ListOrGridTable.prototype.filterServerData = function(columnToMatch,
		valueToMatch, applyOnExistingFilter) {
	var colIdx = this.getColIdxForServerData(columnToMatch);
	if (colIdx === null)
		return;

	var data = this.entireServerData;
	valueToMatch = valueToMatch.toUpperCase();
	var newFilteredRows = [];
	var indexes = null;
	var n = data.length;
	var startAt = 0;
	if (applyOnExistingFilter && this.filteredRows) {
		indexes = this.filteredRows;
		n = indexes.length;
		startAt = 1;
	}
	for ( var i = startAt; i < n; i++) {
		var row = indexes ? indexes[i] : i;
		var val = data[row][colIdx];
		if (val && val.toString().toUpperCase().indexOf(valueToMatch) >= 0)
			newFilteredRows.push(i);
	}
	this.filteredRows = newFilteredRows;
};

ListOrGridTable.prototype.getColIdxForServerData = function(columnName) {
	var names = this.entireServerData[0];
	var n = names.length;
	for ( var i = 0; i < n; i++) {
		if (names[i] === columnName)
			return i;
	}

	debug(columnName + ' is not a column in paginated data of ' + this.name);
	return null;
};

ListOrGridTable.prototype.aggregateAField = function (field, obj, idx)
{
    if (this.repeatedField && field === this.repeatedField)
    {
        if (field.rowSum)
            this.updateRepeatedRowAggregate(field, idx, 'sum');
        if (field.rowAverage)
            this.updateRepeatedRowAggregate(field, idx, 'avg');
        if (field.columnSum)
            this.updateRepeatedColumnAggregate(field, obj, 'sum');
        if (field.columnAverage)
            this.updateRepeatedColumnAggregate(field, obj, 'avg');
    }

    else if (this.repeatOnFieldName)
    {
        if (field.columnSum)
            this.updateRepeatedPanelColumnAggregate(field, obj, 'sum');
    }

    else
    {
        if (field.rowSum)
            this.updateRowAggregate(idx, 'sum');
        if (field.rowAverage)
            this.updateRowAggregate(idx, 'avg');
        if (field.columnSum)
            this.updateColumnAggregate(field, 'sum');
        if (field.columnAverage)
            this.updateColumnAggregate(field, 'avg');
    }
};

ListOrGridTable.prototype.updateRepeatedPanelColumnAggregate = function (field, obj, aggregateType)
{
    var keyIdx = this.P2.fields[this.repeatOnFieldName].columnIdx;

    var sum = 0;
    var count = 0;
    var j = field.columnIdx;
    for (var rowId = 1; rowId < this.grid.length; rowId++)
    {

        if (!this.grid[rowId])
            continue;
        var key = this.grid[rowId][keyIdx];
        if ((aggregateType == 'sum') && (field.columnSumFunction))
        {
            try
            {
                sum = this.P2.win[field.columnSumFunction](this.grid);
            } catch (e)
            {
                debug('Error while executing columnSumFunction : ' + field.columnSumFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
                throw e;
            }
        }
        else if ((aggregateType == 'avg') && (field.columnAverageFunction))
        {
            try
            {
                sum = this.P2.win[field.columnAverageFunction](this.grid);
            } catch (e)
            {
                debug('Error while executing columnAverageFunction : ' + field.columnAverageFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
                throw e;
            }
        }
        else
        {
            for (var i = 1; i < this.grid.length; i++)
            {
                var row = this.grid[i];
                if (!row || row.isDeleted)
                    continue;

                if (row[keyIdx] == key)
                {
                    var val = parseFloat(row[j]);
                    if (isNaN(val)) continue;
                    sum += val;
                }
                count++;
            }
        }

        if (field.formatter)
            sum = field.format(sum);
        else if (field.dataType)
        {
            var dt = dataTypes[field.dataType];
            if (dt)
                sum = dt.formatIn(sum);
        }

        var ele = this.P2.doc.getElementById(field.name + 'Footer' + key);
        ele.innerHTML = sum;
        sum = 0;
    }
    return;
};

ListOrGridTable.prototype.aggregate = function ()
{
    if (this.rowSumIndexes || this.rowAverageIndexes)
    {
        for (var rowId = 1; rowId < this.grid.length; rowId++)
        {
            var row = this.grid[rowId];
            if (!row || row.isDeleted)
                continue;
            if (this.rowSumIndexes)
            {
                if (this.repeatedColumnToBeSummed)
                    this.updateRepeatedRowAggregate(this.repeatedField, rowId, 'sum');
                else
                    this.updateRowAggregate(rowId, 'sum');
            }
            if (this.rowAverageIndexes)
            {
                if (this.repeatedColumnToBeAveraged)
                    this.updateRepeatedRowAggregate(this.repeatedField, rowId, 'avg');
                else
                    this.updateRowAggregate(rowId, 'avg');
            }
        }
    }
    if (this.columnSumIndexes)
    {
        for (var i = 0; i < this.columnSumIndexes.length; i++)
        {
            var field = this.columnSumIndexes[i];
            if (field == this.repeatedField)
                this.updateRepeatedColumnAggregate(field, null, 'sum');
            else if (this.repeatOnFieldName)
                this.updateRepeatedPanelColumnAggregate(field, null, 'sum');
            else
                this.updateColumnAggregate(field, 'sum');
        }
    }
    if (this.columnAverageIndexes)
    {
        for (var i = 0; i < this.columnAverageIndexes.length; i++)
        {
            var field = this.columnAverageIndexes[i];
            if (field == this.repeatedField)
                this.updateRepeatedColumnAggregate(field, null, 'avg');
            else
                this.updateColumnAggregate(field, 'avg');
        }
    }
};

ListOrGridTable.prototype.updateRepeatedColumnAggregate = function (field, obj, aggregateType)
{
    var keys = new Array();
    //if obj is passed, it is for a column that changed, else for all columns
    if (obj)
        keys.push(obj.getAttribute('key'));
    else
    {
        keys = new Array();
        var keyRows = this.repeatedData.keys;
        for (var i = 1; i < keyRows.length; i++)
            keys.push(keyRows[i][0]);
    }
    var keyData = this.repeatedData.data;
    var sums = new Array();
    var counts = new Array();
    for (var i = 0; i < keys.length; i++)
    {
        sums.push(0);
        counts.push(0);
    }
    if ((aggregateType == 'sum') && (field.columnSumFunction))
    {
        try
        {
            sums = this.P2.win[field.columnSumFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing columnSumFunction : ' + field.columnSumFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else if ((aggregateType == 'avg') && (field.columnAverageFunction))
    {
        try
        {
            sums = this.P2.win[field.columnAverageFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing columnAverageFunction : ' + field.columnAverageFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else
    {
        for (var rowId = 1; rowId < this.grid.length; rowId++)
        {
            var row = this.grid[rowId];
            if (!row || row.isDeleted)
                continue;
            var id = row[this.idIdx];
            var colVals = keyData[id];
            for (var i = 0; i < keys.length; i++)
            {
                counts[i]++;
                if (!colVals)
                    continue;
                var val = parseFloat(colVals[keys[i]]);
                if (val)
                    sums[i] += val;
            }
        }
        for (var i = 0; i < sums.length; i++)
        {
            if (aggregateType == 'avg')
            {
                if (counts[i] == 0)
                    sums[i] = '--';
                else
                    sums[i] = sums[i] / counts[i];
            }
            if(!exilParams.doNotRoundOffColumnSumAndAvg)
                sums[i] = Math.round(Math.round(sums[i] * 100.0)) / 100;
        }
    }
    var doc = this.P2.doc;
    var id = field.name + 'Footer';
    for (var i = 0; i < keys.length; i++)
    {
        if (field.formatter)
            sums[i] = field.format(sums[i]);
        else if (field.dataType)
        {
            var dt = dataTypes[field.dataType];
            if (dt)
                sums[i] = dt.formatIn(sums[i]);
        }
        var ele = doc.getElementById(id + keys[i]);
        ele.innerHTML = sums[i];
    }
};

ListOrGridTable.prototype.updateRepeatedRowAggregate = function (field, rowId, aggregateType)
{
    var keys = this.repeatedData.keys;
    var keyData = this.repeatedData.data;
    var sum = 0;
    var count = 0;
    if ((aggregateType == 'sum') && (field.rowSumFunction))
    {
    	//
    }
    else if ((aggregateType == 'avg') && (field.rowAverageFunction))
    {
    	//
    }
    else
    {
        //Jun 12 2009 :  Bug 241 -  Colume sum feature cannot be overridden for average calculations - SABMiller (End) : Aravinda
        var row = this.grid[rowId];
        var id = row[this.idIdx];
        var colVals = keyData[id] || {};
        for (var i = 1; i < keys.length; i++)
        {
            var val = parseFloat(colVals[keys[i][0]]);
            if (isNaN(val))
                continue;
            sum += val;
            count++;
        }
    }
    this.assignRowAggregateValue(sum, count, rowId, aggregateType);
};

ListOrGridTable.prototype.assignRowAggregateValue = function (sum, count, rowId, aggregateType)
{
    var fieldName = 'rowSum';
    var rowSumFunction = null;
    var rowAverageFunction = null;
    for (var i = 0; i < this.columnNames.length; i++)
    {
        var curColumn = this.columns[this.columnNames[i]];
        if (curColumn.rowSumFunction)
        {
            rowSumFunction = curColumn.rowSumFunction;
        }
        if (curColumn.rowAverageFunction)
        {
            rowAverageFunction = curColumn.rowAverageFunction;
        }
    }
    if ((aggregateType == 'sum') && (rowSumFunction))
    {
        try
        {
            sum = this.P2.win[rowSumFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing rowSumFunction : ' + rowSumFunction + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else if ((aggregateType == 'avg') && (rowAverageFunction))
    {
        fieldName = 'rowAverage';
        try
        {
            sum = this.P2.win[rowAverageFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing rowAverageFunction : ' + rowAverageFunction + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else
    {
        if (aggregateType == 'avg')
        {
            fieldName = 'rowAverage';
            if (count)
                sum = Math.round(Math.round(sum * 100.0 / count)) / 100;
            else
                sum = '--';
        }
        else
            sum = Math.round(Math.round(sum * 100)) / 100;
    }

    var field = this.columns[fieldName];
    this.grid[rowId][field.columnIdx] = sum;
    if (field.formatter)
        sum = field.format(sum);
    this.P2.doc.getElementById(field.name + '__' + rowId).innerHTML = sum;
    if (field.columnSum)
        this.updateColumnAggregate(field, 'sum');
    if (field.columnAverage)
        this.updateColumnAggregate(field, 'avg');
};

ListOrGridTable.prototype.updateRowAggregate = function (rowId, aggregateType)
{
    var sum = 0;
    var count = 0;
    var rowSumFunction = null;
    var rowAverageFunction = null;
    for (var i = 0; i < this.columnNames.length; i++)
    {
        var curColumn = this.columns[this.columnNames[i]];
        if (curColumn.rowSumFunction)
        {
            rowSumFunction = curColumn.rowSumFunction;
        }
        if (curColumn.rowAverageFunction)
        {
            rowAverageFunction = curColumn.rowAverageFunction;
        }
    }
    if ((aggregateType == 'sum') && (rowSumFunction))
    {
    	//
    }
    else if ((aggregateType == 'avg') && (rowAverageFunction))
    {
    	//
    }
    else
    {
        var row = this.grid[rowId];
        for (var i = 0; i < this.rowSumIndexes.length; i++)
        {
            var val = parseFloat(row[this.rowSumIndexes[i]]);
            if (isNaN(val)) continue;
            sum += val;
            count++;
        }
    }
    this.assignRowAggregateValue(sum, count, rowId, aggregateType);
};

ListOrGridTable.prototype.updateColumnAggregate = function (field, aggregateType)
{
    var sum = 0;
    var count = 0;
    var j = field.columnIdx;
    //Jun 12 2009 :  Bug 241 -  Colume sum feature cannot be overridden for average calculations - SABMiller (Start) : Aravinda
    if ((aggregateType == 'sum') && (field.columnSumFunction))
    {
        try
        {
            sum = this.P2.win[field.columnSumFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing columnSumFunction : ' + field.columnSumFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else if ((aggregateType == 'avg') && (field.columnAverageFunction))
    {
        try
        {
            sum = this.P2.win[field.columnAverageFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing columnAverageFunction : ' + field.columnAverageFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else
    {
        for (var rowId = 1; rowId < this.grid.length; rowId++)
        {
            var row = this.grid[rowId];
            if (!row || row.isDeleted)
                continue;
            var val = parseFloat(row[j]);
            if (field.formatter && ((val + "").length < (row[j].length / 2)))
                val = parseFloat(field.deformat(row[j]));
            if (isNaN(val)) continue;
            sum += val;
            count++;
        }
        if (aggregateType == 'avg')
        {
            if (count == 0)
                sum = '--';
            else
                sum = Math.round(Math.round(sum * 100.0 / count)) / 100;
        }
        else
            sum = Math.round(Math.round(sum * 100)) / 100;
    }
    if (field.formatter)
        sum = field.format(sum);
    else if (field.dataType)
    {
        var dt = dataTypes[field.dataType];
        if (dt)
            sum = dt.formatIn(sum);
    }

    var ele = this.P2.doc.getElementById(field.name + 'Footer');
    ele.innerHTML = sum;
};

/****
for the supplied set of keys, repeat the supplied column in the header and the rowToClone
***/
ListOrGridTable.prototype.repeatColumns = function ()
{
    var field = this.repeatedField;
    var keys = this.repeatedData.keys;
    var id = field.name;
    var labelId = id + 'Label';

    var ele;
    var n = keys.length;
    for (var i = 1; i < n; i++)
    {
        var key = keys[i][0];

        //add header cell
        ele = this.repeatingHeaderEle.cloneNode(true);
        ele.innerHTML = keys[i][1];
        ele.id = labelId + key;
        if (this.repeatingHeaderSibling) //if sibling is avialble insert before, else append to parent
            this.repeatingHeaderParent.insertBefore(ele, this.repeatingHeaderSibling);
        else
            this.repeatingHeaderParent.appendChild(ele);

        //footer, if any
        if (this.repeatingFooterEle)
        {
            ele = this.repeatingFooterEle.cloneNode(true);
            ele.id = id + 'Footer' + key;
            if (this.repeatingFooterSibling)
                this.repeatingFooterParent.insertBefore(ele, this.repeatingFooterSibling);
            else
                this.repeatingFooterParent.appendChild(ele);
        }

        //data row
        ele = this.repeatingColumnEle.cloneNode(true);

        if (this.repeatingColumnSibling)
            this.repeatingColumnParent.insertBefore(ele, this.repeatingColumnSibling);
        else
            this.repeatingColumnParent.appendChild(ele);

        //get to the actual field element, that would be a child of ele
        ele = ele.childNodes[0]; //it is the first child of td,
        while (ele && !ele.id)
            ele = ele.nextSibling;
        if (!ele)
        {
            alert('Exility Design Error: Unable to get the repeated field for ' + this.name + '. Report to Exility Tect team');
            throw ('Repeating column design error for table ' + this.name);
        }
        ele.id = id + key;
        ele.setAttribute('key', key);

        this.nbrColumnsRepeated++;

        ele = ele.nextSibling;
        while (ele && ele.tagName && ele.tagName.toUpperCase() != 'SPAN')
            ele = ele.nextSibling;

        if (!ele)
            continue;

        ele = ele.childNodes[0]; //it is the first child of td and it is IMG element,
        if (ele && ele.tagName && ele.tagName.toUpperCase() == 'IMG')
            ele.setAttribute('key', key);
    }
};

ListOrGridTable.prototype.setDataToRepeatedColumns = function (doc, pkey, rowIdx)
{
    var field = this.repeatedField;
    var data = this.repeatedData.data[pkey];
    var keys = this.repeatedData.keys;
    var n = keys.length;
    var suffix = '__' + rowIdx;
    for (var i = 1; i < n; i++)
    {
        var key = keys[i][0];
        var id = field.name + key;
        var ele = doc.getElementById(id);
        if (data)
        {
            var val = data[key];
            if (val || val == 0)
                field.setValueToObject(ele, val);
        }

        ele.id = id + suffix;
        ele.rowIdx = rowIdx;
    }
};

ListOrGridTable.prototype.createDataForRepeatedColumns = function (grid, toGetKeys)
{
    //in data, first column is primary key, second is secondary key, third is label for secondary key, next is data
    var data = new Object();
    var keysAndLabels = [['key', 'label']]; //array of arrays with first row set..
    var objToReturn = new Object();
    objToReturn.data = data;
    if (toGetKeys)
        objToReturn.keys = keysAndLabels;

    if (grid.length <= 1)
        return objToReturn;

    var keys = new Object();
    var keysArray = new Array();
    var n = grid.length;
    for (var i = 1; i < n; i++)
    {
        var row = grid[i];
        var pkey = row[0];
        var skey = row[1];
        var subData = data[pkey];
        if (!subData)
        {
            subData = new Object();
            data[pkey] = subData;
        }
        if (toGetKeys)
        {
            if (!keys[skey])
            {
                keys[skey] = row[2];
                keysArray.push(skey);
            }
            subData[skey] = row[3];
        }
        else
            subData[skey] = row[2];
    }
    if (toGetKeys)
    {
        keysArray.sort();
        n = keysArray.length;
        for (var i = 0; i < n; i++)
        {
            var skey = keysArray[i];
            keysAndLabels.push([skey, keys[skey]]);
        }
    }
    return objToReturn;
};

ListOrGridTable.prototype.saveRepeatedColumnValue = function (val, key, idx)
{
    var pkey = this.grid[idx][this.idIdx];
    var data = this.repeatedData.data;
    var subData = data[pkey];
    if (!subData)
    {
        subData = new Object();
        data[pkey] = subData;
    }
    subData[key] = val;
};

//data is received from server in a dc. Set it to the table
ListOrGridTable.prototype.setDataToRepeatingPanel = function (dc, listServiceOnLoad) // Aug 06 2009 :  Bug ID 631 - suppressDescOnLoad is not working - WeaveIT: Venkat
{
    //in two-grids-in-a-panel case, deleterows should be triggered only once
    if (this.elderBrother || this.youngerBrother)
    {
        var tbl = this.elderBrother ? this.P2.tables[this.elderBrother] : this;
        if (tbl.rowsGotDeleted)
            tbl.rowsGotDeleted = false;
        else
        {
            tbl.deleteAllRowsFromRepeatingPanel();
            tbl.rowsGotDeleted = true;
        }
    }
    else
        this.deleteAllRowsFromRepeatingPanel();
    //remove rows from data 
    this.grid.length = 1;
    this.nbrRows = 0;
    var doc = this.P2.doc;
    var data = dc.grids[this.name];
    if (!data || data.length < 2)
        return;
    this.serverData = data;
    var serverNames = data[0];
    var fieldCols = getcolumnToColumnMap(serverNames, this.columnNames);
    this.fieldCols = fieldCols;
    var keyName = this.P2.fields[this.repeatOnFieldName].unqualifiedName;
    var keyIdx = getColumnIndex(serverNames, keyName);
    var labelIdx;
    if (this.labelFieldName)
        labelIdx = getColumnIndex(serverNames, this.labelFieldName);
    else
        labelIdx = keyIdx;
    var lastKey = null;
    var tBody = null;
    var localCount = 0;
    for (var i = 1; i < data.length; i++)
    {
        var serverData = data[i];
        var key = serverData[keyIdx];
        if (key != lastKey)
        {
            lastKey = key;
            var label = serverData[labelIdx];
            tBody = this.getTBody(key, label);
            if (!tBody)
                continue;
            var len = tBody.childNodes.length;
            if (len == this.initialNumberOfRows)
            {
                if (tBody.deleteRow)
                {
                    while (--len >= 0)
                        tBody.deleteRow(len);
                }
                else
                    tBody.innerHTML = '';
            }
            localCount = 0;
        }
        if (!tBody)
        {
            alert('Design Error: repeatingField is not set up properly for this repeating table ' + this.name + ' with panel name ' + this.panelName);
            return;
        }
        this.nbrRows++;
        var newRow = this.htmlRowToClone.cloneNode(true);
        localCount++;

        var clsName = (localCount % 2) ? 'row2' : 'row1';

        newRow.className = clsName;
        newRow.rowIdx = i; // set the pointer to the data row
        newRow.id = this.name + i; // in case I need to reach the tr with just the index...
        tBody.appendChild(newRow);
        if (this.frozenColumnIndex)
        {
            this.cloneFrozenRow(clsName, i);
        }

        //add a data row
        var newDataRow = new Array(this.nbrColumns);
        this.grid.push(newDataRow);
        this.addDataToARow(doc, newDataRow, i, data[i], fieldCols, null, null, listServiceOnLoad); 
    }
    //do I have to have initialNumberOfRows?
    if (this.initialNumberOfRows && exilParms.displayInitialRows)
    {
        this.addInitialRowsToRepeatingPanel(dc, listServiceOnLoad);
    }
};
ListPanel.prototype.treeViewInit = function ()
{
    // this.treeViewXXXXXXXXColumnIdx are used for optimization purpose 
    // to access the column values.
    this.treeViewKeyColumnIdx = -1;
    this.treeViewParentKeyColumnIdx = -1;
    this.treeViewHasChildColumnIdx = -1;
    if (this.treeViewColumnName)
    {
        for (var j = 0; j < this.columnNames.length; j++)
        {
            if (this.columnNames[j] == this.treeViewKeyColumn)
                this.treeViewKeyColumnIdx = j;
            else if (this.columnNames[j] == this.treeViewParentKeyColumn)
                this.treeViewParentKeyColumnIdx = j;
            else if (this.columnNames[j] == this.treeViewHasChildColumn)
                this.treeViewHasChildColumnIdx = j;
        }
    }
};

ListPanel.EXPANDED_NODE = 'minus.gif';
ListPanel.COLLAPSED_NODE = 'plus.gif';
ListPanel.LEAF_NODE = 'space.gif';

// Note on tr.rowState:
// --------------------
// tr.rowState = ListPanel.EXPANDED_NODE means tree node is expanded
// tr.rowState = ListPanel.COLLAPSED_NODE means tree node is collapsed
// tr.rowState = ListPanel.LEAF_NODE means tree node is a leaf node, no expand/collapse.
ListPanel.prototype.treeViewIndentRow = function (rowIdx)
{
    var doc = this.P2.doc;
    var tr = doc.getElementById(this.name + rowIdx);
    var dataRow = this.grid[rowIdx];

    // find the parent row of the current row (tr).
    // assumption: all child nodes appear immediately after the parent node.	    
    var treeViewParentKeyColumnValue = dataRow[this.treeViewParentKeyColumnIdx];
    var treeViewHasChildColumnValue = dataRow[this.treeViewHasChildColumnIdx];
    var parentIdx = null;
    if (treeViewParentKeyColumnValue && treeViewParentKeyColumnValue.length > 0)
    {
        for (var r = rowIdx - 1; r > 0; r--)
        {
            if (this.grid[r][this.treeViewKeyColumnIdx] == treeViewParentKeyColumnValue)
            {
                parentIdx = r;
                break;
            }
        }
    }

    this.renameTreeImages(rowIdx, tr, parentIdx);

    // if current row has parent row then adjust the indentation of the current row
    // using 1x1 pixel indentImg
    if (parentIdx)
    {
        tr.parentRowIdx = parentIdx;
        var parentIndentImg = doc.getElementById(this.name + '_' + this.treeViewColumnName + '__' + parentIdx + 'Indent');
        var w = parentIndentImg.style.width;
        w = parseInt(w.substr(0, w.indexOf('px')), 10) + 19; //increment by 19px;
        var indentEle = doc.getElementById(this.name + '_' + this.treeViewColumnName + '__' + rowIdx + 'Indent');
        indentEle.style.width = w + 'px';
    }
    // leaf node should not have plus/minus image prefix. Clear it.
    if (treeViewHasChildColumnValue == 'N')
    {
        var plusMinusImg = doc.getElementById(this.name + '_' + this.treeViewColumnName + '__' + rowIdx + 'PlusMinus');
        var srcArray = plusMinusImg.src.split('/');
        var img = srcArray[srcArray.length - 1];
        plusMinusImg.src = plusMinusImg.src.replace(img, ListPanel.LEAF_NODE);
        plusMinusImg.style.cursor = 'auto';
        tr.rowState = ListPanel.LEAF_NODE;
    }
    else
    {
        tr.rowState = ListPanel.EXPANDED_NODE;
    }
};

var treeViewImageSuffixes = ['PlusMinus', 'Select', 'Indent'];
ListPanel.prototype.renameTreeImages = function (rowIdx, tr, parentIdx)
{
    var thisId = this.name + '_' + this.treeViewColumnName + '__' + rowIdx;
    var doc = this.P2.doc;
    for (var i = 0; i < treeViewImageSuffixes.length; i++)
    {
        var suffix = treeViewImageSuffixes[i];
        var ele = doc.getElementById(this.treeViewColumnName + suffix);
        ele.id = thisId + suffix;
        ele.rowIdx = rowIdx;
        ele.tr = tr;
        if (parentIdx)
            ele.parentRowIdx = parentIdx;
    }
};

ListPanel.prototype.treeViewExpandCollapseRow = function (objImg, columnName)
{
    if (objImg.tr.rowState == ListPanel.EXPANDED_NODE)
    {
        objImg.src = objImg.src.replace(ListPanel.EXPANDED_NODE, ListPanel.COLLAPSED_NODE);
        objImg.tr.rowState = ListPanel.COLLAPSED_NODE;
        this.treeViewHideChildRows(objImg, columnName);
    }
    else if (objImg.tr.rowState == ListPanel.COLLAPSED_NODE)
    {
        objImg.src = objImg.src.replace(ListPanel.COLLAPSED_NODE, ListPanel.EXPANDED_NODE);
        objImg.tr.rowState = ListPanel.EXPANDED_NODE;
        this.treeViewShowChildRows(objImg, columnName);
    }
};

ListPanel.prototype.treeViewShowChildRows = function (objImg, columnName)
{
    var key = this.grid[objImg.rowIdx][this.treeViewKeyColumnIdx];
    if (objImg.tr.rowState != ListPanel.LEAF_NODE)
    {
        var tmpParentKey;
        for (var i = objImg.rowIdx + 1; i < this.grid.length; i++)
        {
            tmpParentKey = this.grid[i][this.treeViewParentKeyColumnIdx];
            if (tmpParentKey != key)
                break;

            // based on the state of this child, expand recursively
            var childObjImg = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + i + 'PlusMinus');
            childObjImg.tr.style.display = '';
            if (childObjImg.tr.rowState == ListPanel.EXPANDED_NODE)
                this.treeViewShowChildRows(childObjImg, columnName);
        }
    }
};

ListPanel.prototype.treeViewHideChildRows = function (objImg, columnName)
{
    var key = this.grid[objImg.rowIdx][this.treeViewKeyColumnIdx];
    if (objImg.tr.rowState != ListPanel.LEAF_NODE)
    {
        var tmpParentKey;
        for (var i = objImg.rowIdx + 1; i < this.grid.length; i++)
        {
            tmpParentKey = this.grid[i][this.treeViewParentKeyColumnIdx];
            if (tmpParentKey != key)
                break;
            var childObjImg = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + i + 'PlusMinus');
            childObjImg.tr.style.display = 'none';
            this.treeViewHideChildRows(childObjImg, columnName);
        }
    }
};

ListPanel.prototype.treeViewSelectDeselectRow = function (objChk, columnName)
{
    if (objChk.checked)
    {
        if (objChk.tr.className != 'selectedlistrow')
            objChk.tr.savedClassName = objChk.tr.className;
        objChk.tr.className = 'selectedlistrow';
        if (objChk.tr.rowState == ListPanel.LEAF_NODE)
            this.selectedRows[objChk.rowIdx] = true;
    }
    else
    {
        // clear the bulk checkbox in header
        var bulkChk = this.P2.doc.getElementById(this.name + 'BulkCheck');
        //Apr 09 2009 : Check whether bulk check element is present or not. - Perspicus (Start) : Venkat
        if (bulkChk)
            bulkChk.checked = false;
        //Apr 09 2009 : Check whether bulk check element is present or not. - Perspicus (End) : Venkat 

        objChk.tr.className = objChk.tr.savedClassName;
        if ((objChk.tr.rowState == ListPanel.LEAF_NODE) && (this.selectedRows[objChk.rowIdx]))
            delete this.selectedRows[objChk.rowIdx];
    }

    if (!objChk.checked && objChk.parentRowIdx)
    {
        var parentObjChk = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + objChk.parentRowIdx + 'Select');
        this.treeViewDeselectParentRow(parentObjChk, columnName);
    }
    this.treeViewSelectDeselectChildRows(objChk, columnName);
};

ListPanel.prototype.treeViewDeselectParentRow = function (objChk, columnName)
{
    objChk.tr.className = objChk.tr.savedClassName;
    objChk.checked = false;
    if (objChk.parentRowIdx)
    {
        var parentObjChk = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + objChk.parentRowIdx + 'Select');
        this.treeViewDeselectParentRow(parentObjChk, columnName);
    }
};

ListPanel.prototype.treeViewSelectDeselectChildRows = function (objChk, columnName)
{
    var key = this.grid[objChk.rowIdx][this.treeViewKeyColumnIdx];

    if (objChk.tr.rowState != ListPanel.LEAF_NODE)
    {
        var tmpParentKey;
        for (var i = objChk.rowIdx + 1; i < this.grid.length; i++)
        {
            tmpParentKey = this.grid[i][this.treeViewParentKeyColumnIdx];
            if (tmpParentKey != key)
                break;
            var childObjChk = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + i + 'Select');
            childObjChk.checked = objChk.checked;
            if (childObjChk.checked)
            {
                if (childObjChk.tr.className != 'selectedlistrow')
                    childObjChk.tr.savedClassName = childObjChk.tr.className;
                childObjChk.tr.className = 'selectedlistrow';
                if (childObjChk.tr.rowState == ListPanel.LEAF_NODE)
                    this.selectedRows[i] = true;
            }
            else
            {
                childObjChk.tr.className = childObjChk.tr.savedClassName;
                if ((childObjChk.tr.rowState == ListPanel.LEAF_NODE) && (this.selectedRows[i]))
                    delete this.selectedRows[i];
            }
            this.treeViewSelectDeselectChildRows(childObjChk, columnName);
        }
    }
};

ListPanel.prototype.treeViewBulkSelectDeselectRow = function (obj, columnName)
{
    var id = this.name + '_' + columnName + '__';
    for (var i = 1; i < this.grid.length; i++)
    {
        var chk = this.P2.doc.getElementById(id + i + 'Select');
        if (obj.checked != chk.checked)
            chk.click();
    }
};
var ChartPanel = function ()
{
	AbstractTable.call(this);
};

ChartPanel.prototype = new AbstractTable;

/**
 * different charts use different sets of columns.
 */
ChartPanel.XY_COLUMNS = ['xAxisColumn', 'yAxisColumn'];

ChartPanel.chartTypes = {
		bar : ChartPanel.XY_COLUMNS,
		//multipleBar : ChartPanel.XY_COLUMNS
		//stackedBar : ChartPanel.XY_COLUMNS
		//horizontalBar : ChartPanel.XY_COLUMNS
		//horizontalStackeBar : ChartPanel.XY_COLUMNS
		//line : ChartPanel.XY_COLUMNS
		//multipleLine : ChartPanel.XY_COLUMNS
		//lineAndBar : ChartPanel.XY_COLUMNS
		//scatter : ChartPanel.XY_COLUMNS
		pie : ChartPanel.XY_COLUMNS
		//speedometer : ChartPanel.XY_COLUMNS
		//radar : ChartPanel.XY_COLUMNS
		//bubble : ChartPanel.XY_COLUMNS
		//run : ChartPanel.XY_COLUMNS
		//bullet : ['valueOfInterest', 'comparativeValue', 'firstQualitativeRange', 'secondQualitativeRange', 'bulletlabelcolumn']
		//sunBurst : ['distributionValueColumn', 'level2Column', 'level1Column', 'coreColumn']
		//sankey : ['distributionValueColumn', 'fromColumn', 'toColumn']
};

ChartPanel.prototype.setLegend = function(legend)
{
    this.legend = legend;
    return;
};

ChartPanel.prototype.getLegend = function()
{
    return this.legend;
};

//this is the way to draw the chart
ChartPanel.prototype.setData = function (dc)
{
	/*
	 * <div id="panelName"><div id="tableName" /><div id="tableNameLegend"></div> is the dom structure
	 * #chrtaTable is where the chart is drawn, and is referred as container
	 */
    if(!this.container){
        var win = this.P2.win;
        this.container = win.document.getElementById(this.name);
        this.legendContainer = win.document.getElementById(this.name + 'Legend');
        if (!this.container)
        {
            debug('Design Error: No dom element found with name ' + this.name + ' for chart Panel,' + this.panelaName);
            return;
        }
    }
	var grid = dc.getGrid(this.name);
	//just in case some one sent an object instead of an instance of DataCollection
	if(!grid && dc.grids){
		grid = dc.grids[this.name];
	}
    this.value = grid;
    if (!grid || grid.length < 2) //let us just clean-up
    {
        this.container.innerHTML = '';
        if(this.legendContainer) this.legendContainer.innerHTML = '';
        this.container.parentNode.setAttribute('exil-noData', 'exil-noData');
        debug('No data for chart ' + this.name);
        return false;
    }

    this.container.parentNode.removeAttribute('exil-noData');
    
    /*
     * get column names to be extracted for this chart
     */
    var columnNames = ChartPanel.chartTypes[this.chartType];
    if(!columnNames){
        this.container.innerHTML = this.chartType + ' is not implemented as a chart';
        if(this.legendContainer) this.legendContainer.innerHTML = '';
        return false;
    }
    
    var data = this.getColumnData(grid, columnNames);
    /*
     * delegate the actual drawing function to the concrete class
     */
   	ChartPanelDriver.draw(this, data);
};

//get an array of data rows extracted from given grid.
//each row contains columns as in columnNames parameter.
ChartPanel.prototype.getColumnData = function (grid, columnNames)
{
	var colIndexes = {};
	
	/*
	 * get column indexes for column names
	 */
    var header = grid[0];
    var nbrCols = header.length;
    for(var j = 0; j < nbrCols; j++){
    	colIndexes[header[j]] = j;
    }
    
    var series = [];
    var nbrCols = columnNames.length;
    var indexes = [];
    for (var j = 0; j < nbrCols; j++)
    {
    	indexes[j] = j;
    	var colName = this[columnNames[j]]; 
    	if(!colName){
    		debug(columnNames[j] + " not specified for chart " + this.name + " default column index " + j + " is assumed.");
    	}else{
	        var idx = colIndexes[colName];
	        if(idx || idx === 0){
	        	indexes[j] = idx;
	        }else{ 
	        	debug(colName + " is specified as the column name for " + columnNames[j] + " but this column is not found in the data grid. A default index of " + j + " is assumed");
	        }
    	}
    }

    var hIdx = null; //help and group help
    var i;
    var ghIdx = null;
	this.helpTexts = null;
    if (this.helpTextColumn){
        i = colIndexes[this.helpTextColumn];
        if(i || i === 0){
        	hIdx = i;
	        this.helpTexts = [];
	        if (this.groupHelpTextColumn){
	            i = colIndexes[this.groupHelpTextColumn];
	    	    if(i || i === 0)
	    	    	ghIdx = i;
	        }  
	    }else{
	        	debug(this.helpTextColumn + ' is not found as a column in data grid for chart ' + this.name);
	    }
	}

    /*
     * now go thru rows of grid and construct a new table with rows with desired columns in that
     */
    for (var i = 1; i < grid.length; i++)
    {
        var row = grid[i];
        var newRow =[];
        for (var j = 0; j < nbrCols; j++)
        {
            newRow.push(row[indexes[j]]);
        }
        series.push(newRow);
        
        /*
         * accumulate help texts as well
         */
        if (this.helpTexts)
        {
            if (ghIdx)
                this.helpTexts.push([row[hIdx], row[ghIdx]]); //array of primary help text and group help text
            else
                this.helpTexts.push(row[hIdx]);
        }
    }
    return series;
};


/*
 * Create a dummy driver. 
 * This should be over-ridden by a valid driver that should be included after this file
 * Also, this documents the expectations from a driver
 */

var ChartPanelDriver = {
	/**
	 * @param {ChartPanel} panel : 
	 * @param data rows of data, with two columns : first one is value and the second one is label
	 * @param options object with options that are relevant. for example colors is an array of colors to be used for pie same order as values in data
	 */
	draw : function (panel, data){
		var container = panel.container;
		var t = [];
		t.push('<div><h1>');
		t.push(panel.chartType);
		t.push(' CHART </h1>(You are seeing this data table because no charting driver is available to render charts)</div>');
		this.getDataHtml(panel, data, t);
		container.innerHTML = t.join('');
	},
	/**
	 * private function : put data rows into an html
	 */
	getDataHtml : function(panel, data, t){
		var nbrRows = data.length;
		var nbrCols = data[0] && data[0].length;
		if(!nbrCols){
			t.push('<br /><div> NO DATA </div><br />');
			return;
		}
		//write header row
		t.push('<table><thead><tr>');
		if(panel.helpTexts){
			t.push('<th>help text</th>');
		}
		for(var j = 0; j < nbrCols; j++){
			t.push('<th>col - ');
			t.push(j);
			t.push('</th>');
		}
		t.push('</tr></thead><tbody>');
		//data rows
		for(var i  = 0; i < nbrRows; i++){
			t.push('<tr>');
			var row = data[i];
			if(panel.helpTexts){
				t.push('<td>');
				t.push(panel.helpTexts[i]);
				t.push('</td>');
			}
			for(var j = 0; j < row.length; j++){
				t.push('<td>');
				t.push(row[j]);
				t.push('</td>');
			}
			t.push('</tr>');
		}
		t.push('</tbody></table><br /><br />');
	}
};

/********************************End of charts***************************/
/* **************************************************************
 * file : page1Create.js
 * methods for constructing the P2 model and controller for a page. page.meta.js has 
 * the script to instantiate P2 = new ExilityPage() and set its attributes using the 
 * methods provided in this file
 ************************************************************** */

/**
 * @class ExilityPage Model as well as Controller of our client side MVC. This
 *        class is the essential core of Exility client. An instance of this
 *        class is created for every page, and its attributes are set to work as
 *        model for that page. This instance is loaded with all its model
 *        attributes using meta.js file.This instance is exposed to page
 *        programming as "P2".
 * @param win
 *            window object of the page that this instance is meant for.
 *            Remember that Exility is loaded once and for all into the index
 *            page, while individual pages are loaded as iframes. It is
 *            important to keep the window in mind.
 * @param nam
 *            name of the page, as in page.xml
 */
var ExilityPage = function(win, nam) {
	this.win = win;
	this.doc = win.document;
	this.name = nam;

	/**
	 * parameters passed to this page from the previous page as part of
	 * navigation action
	 */
	this.pageParameters = {};

	/**
	 * all fields used in this page. Fields inside a table (list/grid) are
	 * indexed by their qualified name (tableName_fieldName) while others,
	 * irrespective of the panels, are indexed by name.
	 */
	this.fields = {};

	/**
	 * all fields are stored in the order that they appear in the page
	 */
	this.fieldNames = [];

	/**
	 * tables are indexed by table name, and not panel name of, say, grid panel.
	 */
	this.tables = {};

	/**
	 * all actions defined for this page
	 */
	this.actions = {};

	/**
	 * this is used by table. We will move it there when we re-factor this
	 */
	this.idSplitter = "___";
};

/**
 * @class PageParameter this is just a data structure to capture all attributes
 *        specified in page.xml. A page is designed to optionally take some
 *        parameters at run time, just like a function.
 */
var PageParameter = function() {
	/*
	 * all attributes are loaded at run time
	 */
};

/**
 * we followed this simple, but really stupid way of adding methods to prototype
 * in the early 2000's... :-)
 */
var a = ExilityPage.prototype;

/**
 * add a page parameter to model
 * 
 * @param p
 *            page parameter to be added
 */
a.addParameter = function(p) {
	/*
	 * have two-way connectivity
	 */
	p.P2 = this;
	this.pageParameters[p.name] = p;
};

/**
 * get a page parameter
 * 
 * @param nam
 *            name of page parameter
 * @returns page parameter, or undefined if no parameter with that name
 */
a.getParameter = function(nam) {
	return this.pageParameters[nam];
};

/**
 * add a page field to the model. It is added to fields collection as well as
 * fieldNames array
 * 
 * @param field
 */
a.addField = function(field) {
	/*
	 * establish two-way link
	 */
	field.P2 = this;
	this.fields[field.name] = field;
	field.seqNo = this.fieldNames.length;
	this.fieldNames.push(field.name);

	/*
	 * we need to position cursor on the first editable field, unless of course
	 * the page designer has designated a specific field for this
	 */
	if (!this.firstField) {
		if (this.firstFieldName) {
			/*
			 * page designer has designated a field
			 */
			if (this.firstFieldName === field.name) {
				this.firstField = field;
			}
		} else if (field.isEditable) {
			this.firstField = field;
		}
	}

	/*
	 * add it to table if required
	 */
	if (field.tableName) {
		this.tables[field.tableName].addColumn(field);
	}

	if (field.initialize) {
		field.initialize();
	}

	/*
	 * register list and report services if required
	 */
	if (field.listServiceId) {
		this.addFiledToListeners(field, false);
	}

	if (field.reportServiceId) {
		this.addFiledToListeners(field, true);
	}
};

/**
 * get a field
 * 
 * @param nam
 *            name of the field to get
 * @returns named field, or undefined if it not defined
 */
a.getField = function(nam) {
	return this.fields[nam];
};

/**
 * get the view object (dom element) for the named field
 * 
 * @param nam
 *            name of the field
 * @param idx
 *            1 based index into the grid if this field is inside a table
 * @returns dom element (view object) for the field
 */
a.getFieldObject = function(nam, idx) {
	var field = this.fields[nam];
	if (!field)
		return null;
	var id = field.table ? field.table.getObjectId(nam, idx) : nam;
	return this.doc.getElementById(id);
};

/**
 * Add an action to the controller
 * 
 * @param action
 */
a.addAction = function(action) {
	/*
	 * establish two-way connectivity
	 */
	action.P2 = this;
	this.actions[action.name] = action;
};

/**
 * get an action from the controller
 * 
 * @param nam
 *            name of the action
 * @returns named action
 */
a.getAction = function(nam) {
	return this.actions[nam];
};

/**
 * add a table to the model
 * 
 * @param table
 *            to be added
 */
a.addTable = function(table) {
	/*
	 * link it up
	 */
	table.P2 = this;
	this.tables[table.name] = table;

	/*
	 * as per our design philosophy, client asks for pagination, and it is not
	 * server's decision to paginate. How does the client ask the server
	 * paginate the response table on the first call for data?
	 * 
	 * We have a crude answer. Ask always. With every server call, we ask it to
	 * paginate all the pages that the client designer has decided to paginate
	 */
	if (table.pageSize && !table.localPagination) {
		if (!this.pageSizes) {
			this.pageSizes = [];
		}
		this.pageSizes.push([ table.name + 'PageSize', table.pageSize ]);
	}

	/*
	 * tables could be inter-linked. They may have to do some initialization
	 * activity, but only after all tables are loaded. small optimization to
	 * trigger this.
	 */
	if (table.linkedTableName || table.mergeWithTableName
			|| table.nestedTableName) {
		this.hasLinkedTables = true;
	}
};

/**
 * get a named table
 * 
 * @param nam
 *            name of the table
 * @returns named table
 */
a.getTable = function(nam) {
	return this.tables[nam];
};

/**
 * register this field for list service or report service
 * 
 * @param field
 *            to be added
 * @param isReportService
 *            true if report service is to be added, false if list service is to
 *            be added
 */
a.addFiledToListeners = function(field, isReportService) {
	var services = null;
	var serviceId = null;
	if (isReportService) {
		if (!this.reportServices) {
			services = this.reportServices = {};
		} else {
			services = this.reportServices;
		}
		serviceId = field.reportServiceId;
	} else {
		if (!this.listServices) {
			services = this.listServices = {};
		} else {
			services = this.listServices;
		}
		serviceId = field.listServiceId;
	}
	/*
	 * gridName = serviceId. Except when keyValeu is specified in which case it
	 * is serviceId + '_' keyValue
	 */
	var gridName = serviceId;
	if (field.keyValue) {
		gridName += '_' + field.keyValue;
	}
	var listeners = services[gridName];
	/*
	 * It is possible that there may be more than one listener for the same
	 * listService and key. We allow this by having an array of listeners.
	 */
	if (!listeners) {
		listeners = [];
		/*
		 * we are no purists. array is also an object, and can have its
		 * attributes
		 */
		listeners.serviceId = serviceId;
		listeners.keyValue = field.keyValue;
		services[gridName] = listeners;
	}
	listeners.push(field);
	debug(field.name + ' pushed as a listener for ' + gridName);
};/*
 * file : page2Init.js
 * 
 * this file has methods of P2 that are used to initialize it after loading the
 * page. .init() is the entry method. This is called from exilPageLoad() which
 * itself is called as part of onload event handler for every page.
 */

/**
 * called on page load from exilPageLoad() (inside exilityLoader.js). Note that
 * page.meta.js would have completed loaded, and hence all the component models
 * are all loaded before calling this method
 */
a.init = function() {
	/*
	 * has this project a function to set page title some where outside this
	 * page? We look for presence of specific function. This is to be set by
	 * project in their myProject.js
	 * 
	 * Also, note that we are not using this.win. setPageTitle() is to be loaded
	 * into the page where Exility is loaded
	 */
	if (window.setPageTitle) {
		window.setPageTitle(this.title);
	}

	/*
	 * we allow page designer to enable and disable action buttons when user
	 * edits anything/resets. For example, in an editable panel, only
	 * close-option is enabled in the beginning, but once user edits anything,
	 * close is disabled, and save-button and cancel-button could be enabled. We
	 * use the same array to keep dom elements instead of element names
	 */
	if (this.buttonsToEnable) {
		for ( var i = 0; i < this.buttonsToEnable.length; i++) {
			this.buttonsToEnable[i] = this.doc
					.getElementById(this.buttonsToEnable[i]);
		}
	}
	if (this.buttonsToDisable) {
		for ( var i = 0; i < this.buttonsToDisable.length; i++) {
			this.buttonsToDisable[i] = this.doc
					.getElementById(this.buttonsToDisable[i]);
		}
	}

	/*
	 * it is possible that a regular page is also used as a "picker window", but
	 * some options could be hidden
	 */
	if (this.buttonsToHideForPicker && this.win.name == "pickerWindow") {
		for ( var i = 0; i < this.buttonsToHideForPicker.length; i++) {
			this.doc.getElementById(this.buttonsToHideForPicker[i]).style.display = 'none';
		}
	}

	var listServiceGrid = this.getGridForListeners(this.listServices);
	var reportServiceGrid = this.getGridForListeners(this.reportServices);
	/*
	 * tables need to be initialized at this stage
	 */
	for ( var tableName in this.tables) {
		var tbl = this.tables[tableName];
		if (tbl.init) {
			tbl.init();
		}
	}

	/*
	 * linked tables are to be initialized after loading the page, as they
	 * manipulate dom
	 */
	if (this.hasLinkedTables) {
		for ( var tableName in this.tables) {
			var table = this.tables[tableName];
			if (table.linkedTableName || table.mergeWithTableName
					|| table.nestedTableName) {
				table.createLinks();
			}
		}
	}

	/*
	 * view related operations are done. Let us start the data part
	 */

	/*
	 * what parameters we are called with. Since actions to be fired depends on
	 * page parameters, this method also decides that and returns
	 */
	var actions = this.processPageParameters();

	/*
	 * We have designed an in-box concept utilizing the fact that the top window
	 * is always there, while pages keep changing inside iframes. Calling page
	 * uses PM.addToInbox() to add name-value pairs. These variables are set as
	 * global (window level) variables in this page when we call getInbox()
	 * method
	 */
	PM.getInbox(this.win);

	/*
	 * fire list and report services
	 */
	if (listServiceGrid) {
		this.callListService(listServiceGrid, null, null, null, null, null,
				true);
	}

	if (reportServiceGrid) {
		this.callReportService(reportServiceGrid, null);
	}

	/*
	 * it is also possible for the calling page to pass a dc that is to be used
	 * as data source for this page on load.
	 */
	if (window.passedDc) {
		this.refreshPage(window.passedDc);
		window.passedDc = null;
	}

	/*
	 * exility pages are hidden by default. If some data needs to be rendered on
	 * load, our design is to fetch data from server, render the page, and then
	 * make it visible
	 */
	if (actions) {
		/*
		 * what if there are several services. When should we make the page
		 * visible? It is not gauranteed that the servr calls will return in the
		 * same order, bit that is more likley, and hence we are showing the
		 * page after the last action
		 */
		var n = actions.length;
		var lastAction = actions[n - 1];
		this.actions[lastAction].showPage = true;
		for ( var i = 0; i < n; i++) {
			this.act(this.doc.body, 'body', actions[i], null, true);
		}
	} else {
		this.showPage();
	}

	/*
	 * some projects want client to control session-out and warn the user etc..
	 * Reset that timer to 0, as this is the beginning of a page
	 */
	if (window.resetInactiveTimer) {
		window.resetInactiveTimer();
	}
};
/**
 * look at the parameters being received as part of URL against what is designed
 * for this page. Validate these parameters and return the actions that needs to
 * be taken based on the parameters
 * 
 * @returns action to be taken. This would be page.onLoadActionNames, or
 *          onModifyModeActionNames or null
 */
a.processPageParameters = function() {
	var params = this.pageParameters;
	if (!params) {
		return this.onLoadActionNames;
	}
	/*
	 * do we have to worry about pageMode?
	 */
	var toLookForKeyField = this.pageMode != null;

	/*
	 * passed query fields
	 */
	var qryFields = queryFieldsToCollection(this.win.location.search);

	var nbrParams = 0;
	for (p in params) {
		var param = params[p];
		var val = qryFields[p];
		if (!val) {
			val = param.defaultValue;
		}
		if (!val) {
			if (toLookForKeyField && param.isPrimaryKey) {
				/*
				 * key not given means user is going to create a new row. add
				 * mode.
				 */
				this.pageMode = 'add';
				toLookForKeyField = false;
				continue;
			}
			if (param.isRequired) {
				message(
						'Internal error: '
								+ p
								+ ' is a required parameter for this page. It is not passed by the caller.',
						"Error", "Ok", null, null, null);
			}
			continue;
		}
		if (param.dataType) {
			try {
				var dt = dataTypes[param.dataType];
				if (dt) {
					val = dt.validate(val);
				}
			} catch (e) {
				message('Internal error: This page is called with ' + p + ' = '
						+ val + '. This is not a valid value.' + e.messageText,
						"Error", "Ok", null, null, null);
				continue;
			}
		}
		/*
		 * set this parameter to the right field
		 */
		if ('pageheader' == param.name) {
			var hdr = this.doc.getElementById('pageheader');
			if (hdr) {
				hdr.innerHTML = param.value;
			}
		} else {
			this.setFieldValue((param.setTo ? param.setTo : p), val, null,
					null, null, null, null, true);
		}
		/*
		 * store the value. We may require it any time...
		 */
		param.value = val;
		nbrParams++;
	}

	/*
	 * page designer may insist on receiving minimum number of parameters
	 */
	if (this.minParameters && nbrParams < this.minParameters) {
		message(
				'This page is to be invoked with '
						+ this.minParameters
						+ ' parameters. Only '
						+ nbrParams
						+ 'parameters are passed. This is a set-up problem. This page may not work properly',
				"Error", "Ok", null, null, null);
		return null;
	}

	/*
	 * do we have to act on some actions? Which ones?
	 */
	if (this.pageMode == 'modify') {
		if (this.fieldsToDisableOnModifyMode) {
			this.ableFields(this.fieldsToDisableOnModifyMode, false);
		}
		return this.onModifyModeActionNames;
	}

	if (this.minParametersToFireOnLoad
			&& nbrParams < this.minParametersToFireOnLoad) {
		return null;
	}

	return this.onLoadActionNames;
};

/**
 * put the service names and keys in an a grid with header and two columns. This
 * is the form in which it is to be sent to server along with a request for
 * ListService or ReportService
 * 
 * @param serviceListeners
 *            listeners registered for this service
 * @returns appropriate grid, or null if no requests needs to be made on load
 */
a.getGridForListeners = function(serviceListeners) {
	if (!serviceListeners) {
		return null;
	}

	var grid = [ [ 'serviceId', 'keyValue' ] ];
	for ( var x in serviceListeners) {
		var listeners = serviceListeners[x];
		var aRow = [ listeners.serviceId,
				listeners.keyValue ? listeners.keyValue : '' ];
		/*
		 * we push this if at least one of the listeners on this service wants
		 * it right away
		 */
		var toPush = false;
		for ( var i = 0; i < listeners.length; i++) {
			var field = listeners[i];
			field.obj = this.doc.getElementById(field.name);
			if (!field.obj) {
				debug('DESIGN ERROR: '
						+ field.name
						+ ' could not get its dom element at the time of regestering for list service');
				continue;
			}

			if (!field.noAutoLoad) {
				toPush = true;
			}
		}
		if (toPush) {
			debug('pushing a listService request for ' + aRow);
			grid.push(aRow);
		}
	}
	return grid;
};

/**
 * we are done with all activities on load, including any data being fetched
 * from server onload. Let us now make the page visible
 */
a.showPage = function() {
	/*
	 * our page is inside an iframe. iframe is part of a div on the index page.
	 * We have to adjust the position and size of that div to display this page
	 */
	/*
	 * page designer might have given height and width
	 */
	var ht = this.pageHeight;
	var wd = this.pageWidth;
	var tp = 0;
	var lft = 0;
	var frameEle = null;
	/*
	 * is this a pop up?
	 */
	if (this.win.name == "pickerWindow" || this.win.isAPopup) {
		/*
		 * if thi sproject has a 'loading' element, we have to hide that first
		 */
		var loadingEle = document.getElementById('loading');
		if (loadingEle) {
			loadingEle.style.display = 'none';
		}
		/*
		 * dimensions are to be over-ridden for popup
		 */
		if (this.popupHeight) {
			ht = this.popupHeight;
		}
		if (this.popupWidth) {
			wd = this.popupWidth;
		}
		if (this.popupLeft) {
			lft = this.popupLeft;
		}
		if (this.popupTop) {
			tp = this.popupTop;
		}

		/*
		 * further customization if this pop up is for picker codePickerLeft and
		 * codePickerTop are to be set by the project as a global variable in
		 * the indexPage.
		 */
		if (this.win.name == "pickerWindow") {
			if (PM.codePickerLeft && PM.codePickerLeft != -1) {
				lft = PM.codePickerLeft;
			}
			if (PM.codePickerTop && PM.codePickerTop != -1) {
				tp = PM.codePickerTop;
			}

			pickerEleStyle.left = lft + "px";
			pickerEleStyle.top = tp + "px";
			pickerEleStyle.display = '';
		} else {
			var parentDiv = this.win.parent
					&& this.win.parent.document.getElementById(this.win.name
							+ 'Div');
			if (parentDiv) {
				parentDiv.style.display = '';
				parentDiv.style.position = 'absolute';
				parentDiv.style.zIndex = '2';
				/*
				 * feature to center-align pop-up
				 */
				if (exilParms.alignPopupWindow) {
					frameEle = document.getElementById(this.win.name);
					var currWidth = this.popupWidth;
					if (!currWidth)
						currWidth = this.pageWidth;
					var calculatedPopupLeft = (parseInt(document.body.offsetWidth) - parseInt(currWidth)) / 2;
					lft = parseInt(calculatedPopupLeft);
					if (lft) {
						parentDiv.style.left = '0px';
						frameEle.style.left = lft + 'px';
					}

				} else {
					if (lft > 0) {
						parentDiv.style.left = lft + 'px';
					} else {
						parentDiv.style.left = '100px';
					}
				}
				if (tp > 0) {
					parentDiv.style.top = tp + 'px';
				} else {
					parentDiv.style.top = '100px';
				}
			}
		}
	}

	if (this.win.name == "pickerWindow") {
		resetWindowSize(this.win, wd, ht, tp, lft, true);
	} else {
		resetWindowSize(this.win, wd, ht, tp, lft);
	}
	/*
	 * Let the page show-up now. Note:
	 */
	this.doc.body.style.display = '';

	/*
	 * posiiton cursor on first editable field
	 */
	if (this.firstField) {
		var ele = this.doc.getElementById(this.firstField.name);
		if (ele && ele.focus) {
			try {
				ele.focus();
				if (field.isAssisted) {
					ele.select();
				}
			} catch (e) {
				//
			}
		}
	}

	if (this.fieldsToHideOnLoad && this.fieldsToHideOnLoad.length != 0)
		this.hideOrShowPanels(this.fieldsToHideOnLoad, 'none');

	/*
	 * because of our iframe approach, we may end-up with double scroll-bar on
	 * right. We are unable to get the right event for fixing that. Hence you
	 * will see the following trigger at many places
	 */
	this.win.checkIframeSize();
};
/*
 * file : page3ActionRelated.js
 * 
 * act() is the only method directly related to action.
 */

/**
 * main method for action. We take care of common work across all actions, and
 * delegate the actual action to the relevant action object.
 * 
 * parameter order is bit odd, but that has history!! I woudl have loved to have
 * actionName as the first parameter, so that most callers could simply ignore
 * other parameters. You will frequently see a snippet P2.act(null, null,
 * actionName) in page specific scripts.
 * 
 * @param obj :
 *            dom object that triggered this action.
 * @param fieldName
 *            that triggered this action
 * @param actionName
 *            to be acted upon
 * @param param
 *            depending on the context, different sets of parameters are passed
 *            to the action.
 * @param actionOnLoad
 *            true if this action is part of onload actions. This need to passed
 *            to some MVC methods for them to avoid perpetual event triggers
 * 
 */
a.act = function(obj, fieldName, actionName, param, actionOnLoad) {
	debug(actionName + ' invoked as an action with obj=' + obj + ' fieldName='
			+ fieldName);
	/*
	 * exis specific code injected to avoid some clumsy design there..
	 */
	var msgDiv = document.getElementById('warningMsg');
	if (msgDiv) {
		msgDiv.style.display = 'none';
	}

	/*
	 * custom solution to avoid some action being taken on fields. 'eleDisabled'
	 * attribute is set to fields that should not trigger actions. we would have
	 * loved to change this to HTML5 standard data-xxxxxxx, but our programmers
	 * have used this in their code :-(
	 */
	if (obj && obj.type
			&& obj.getAttribute(this.DISABLED_ATTRIBUTE_NAME) == 'true') {
		return;
	}

	var action = this.actions[actionName];
	if (!action) {
		debug('action ' + actionName + ' is not a valid action');
		return;
	}

	/*
	 * do we need to warn the user and take confirmation before proceeding?
	 * Typically used to abandon changes.
	 */
	if (action.warnIfFormIsModified) {
		/*
		 * has this project or the page enabled this feature?
		 */
		if ((exilParms.trackFieldChanges == true)
				|| (exilParms.trackFieldChanges == false && this.trackFieldChanges == true)) {
			/*
			 * is the form modified?
			 */
			if (this.lastModifiedNode) {
				/*
				 * call back functions could have been defined using closure to
				 * carry context, but then we coded this long time back :-(
				 * Hence, we store the context in a global object that the
				 * call-back functions pageActionActAfterMessageOk and
				 * pageActionActAfterMessageNotOk will use
				 * 
				 */
				PM.actionBeingConfirmed = {
					P2 : this,
					obj : obj,
					fieldName : fieldName,
					actionName : actionName,
					param : param,
					actionOnLoad : actionOnLoad
				};
				PM.message('Do you want to abandon change(s)?', 'Warning',
						'Yes', pageActionActAfterMessageOk, 'No',
						pageActionActAfterMessageNotOk, null, null);
				return;
			}
		}
	}

	if (action.showPanels != null) {
		this.hideOrShowPanels(action.showPanels, '');
	}
	if (action.hidePanels != null) {
		this.hideOrShowPanels(action.hidePanels, 'none');
	}
	if (action.disableFields != null) {
		this.ableFields(action.disableFields, false);
	}
	if (action.enableFields != null) {
		this.ableFields(action.enableFields, true);
	}
	if (action.popupPanel) {
		this.popupAPanel(action.popupPanel);
	} else if (action.popdownPanel) {
		this.popDown();
	}
	var actionDone = action.act(obj, fieldName, param, actionOnLoad);

	/*
	 * has init() deferred showing the page to this action? Note that action is
	 * "done" if this is not a serverAction. A serverAction is "done" only when
	 * the call back action (default is refreshPage() ) is called after the call
	 * to server returns.
	 */
	if (action.showPage && !action.serviceId) {
		this.showPage();
	}

	/*
	 * if this action took care of form modifications, then we are to reset that
	 */
	if (actionDone && action.resetFormModifiedState) {
		this.resetLastModifiedNode();
	}

	/*
	 * special feature for project to log actions.
	 */
	if (exilParms.serverActivityCallBackFunctionName && action.toBeReported) {
		var fn = PM[exilParms.serverActivityCallBackFunctionName];
		if (fn) {
			fn();
		} else {
			debug('Design error : Project has specified exilParms.serverActivityCallBackFunctionName = '
					+ exilParms.serverActivityCallBackFunctionName
					+ ' but no function is defined with that name.');
		}
	}
};
/**
 * call back function for OK button for confirmation message while warning user
 * of action
 */
var pageActionActAfterMessageOk = function() {
	/*
	 * retrieve context
	 */
	var action = PM.actionBeingConfirmed;
	PM.actionBeingConfirmed = null;
	if (!action) {
		debug('Design error : PM.actionBeingConfirmed is not available after message()');
		return;
	}
	var p2 = action.P2;
	/*
	 * Now that user has conformed, we re-start the action, but of course after
	 * resetting modified state to avoid a perpetual confirmation activity.
	 */
	p2.resetLastModifiedNode();
	p2.act(action.obj, action.fieldName, action.actionName, action.param,
			action.actionOnLoad);
};

/**
 * call back function for not-OK button for confirmation message while warning
 * user of action
 */
var pageActionActAfterMessageNotOk = function() {
	/*
	 * retrieve context
	 */
	var p2 = PM.actionBeingConfirmed && PM.actionBeingConfirmed.P2;
	PM.actionBeingConfirmed = null;
	if (!p2) {
		debug('Design error : PM.actionBeingConfirmed is not available after message()');
		return;
	}
	/*
	 * user does not want this action. Let us try to take her back to the field
	 * she was editing
	 */
	try {
		var node = p2.lastModifiedNode;
		if (!node.disabled) {
			node.focus();
		}
		p2.makePanelVisible(node);
	} catch (e) {
		//
	}
};
/**
 * hide or show an array of panels. Trick here is to look for various scenarios
 * of panel rendering and handle all such cases
 * 
 * @param panelNames
 *            array of panelNames
 * @param display
 *            'none' to hide and '' to show. This,as you can see, used to be the
 *            value for style.display
 */
a.hideOrShowPanels = function(panelNames, display) {
	if (display != 'none') {
		display = '';
	}

	for ( var i = 0; i < panelNames.length; i++) {
		var panelName = panelNames[i];
		/*
		 * though we call it a panel, it could be a field as well
		 */
		if (this.fields[panelName]) {
			this.hideOrShowField(panelName, display);
			continue;
		}
		var panel = this.doc.getElementById(panelName);
		if (!panel) {
			debug("design error: panelName " + panelName
					+ " is to be hidden/shown, but it is not a dom element");
			continue;
		}

		/*
		 * unfortunately, animateHideAndShow() requires values 'hide' or 'show'
		 * while we are using 'none' or ''
		 */
		var hideOrSho = display == 'none' ? 'hide' : 'show';

		/*
		 * let us look for any wrapper or decorator on top of this panel.
		 * 
		 * case 1 : this is a tabbed panel. we will also have a div for showing
		 * all tabs. That has to be shown/hidden as well
		 */
		var tabs = this.doc.getElementById(panelName + 'Tabs');
		if (tabs) {
			/*
			 * tabs is a separate div that has all the tabs for child panels.
			 * hide/show that
			 */
			if (exilParms.animateHideAndShow) {
				PM.animateHideAndShow(tabs, hideOrSho, this);
			} else {
				tabs.style.display = display;
			}
		}

		/*
		 * case 2 : this panel is a child of a tabbed panel. So, this panel will
		 * have a corresponding tab.
		 * 
		 */
		var tab = this.doc.getElementById(panelName + 'Tab');
		/*
		 * possibly left and right decorations as well
		 */
		var tabLeft = this.doc.getElementById(panelName + 'TabLeft');
		var tabRight = this.doc.getElementById(panelName + 'TabRight');

		if (tab) {
			tab.style.display = display;
			if (tabLeft) {
				tabLeft.style.display = display;
			}
			if (tabRight) {
				tabRight.style.display = display;
			}
			if (!display) {
				/*
				 * we need to simulate a click on this tab for us to show this
				 */
				tab.onclick.call(tab);
			} else if (tab.clickDisabled || tab.getAttribute('clickdisabled')) {
				var newTab = this.getTabToEnable(tabLeft, tabRight);
				/*
				 * if we find a valid tab, let us click
				 */
				if (newTab) {
					newtab.onclick.call(newtab);
				}
			}
			continue;
		}

		/*
		 * not sure why we did all the earlier activity if the current state is
		 * same as what is being asked for. It could be a waste, but too risky
		 * to change at this time, as we do not know what side-effect has been
		 * used as feature by any project
		 */
		if (panel.style.display == display) {
			continue;
		}

		/*
		 * is there a twister?
		 */
		var twister = this.doc.getElementById(panelName + 'Twister');
		if (twister) {
			this.twist(twister, panelName);
			continue;
		}

		/*
		 * is there a top panel?
		 */
		var topPanel = this.doc.getElementById(panelName + 'Top');
		if (topPanel) {
			topPanel.style.display = display;
		}

		/*
		 * ok. we are done will all wrappers...
		 */
		if (panel.tagName != 'DIV' || !exilParms.animateHideAndShow) {
			panel.style.display = display;
		} else {
			animateHideAndShow(panel, hideOrSho, this);
		}
	}
	/*
	 * page size might have changed...
	 */
	this.win.checkIframeSize();
};

/**
 * this is a fragile code that detects a visible 'tag' div. we first try to teh
 * left, and then to right to find one.
 * 
 * @param tabLeft
 *            element that is at the left of the current tab
 * @param tabRight
 *            element that is to the right of the current tab
 * @returns tab element that is active, or null if there is none
 */
a.getTabToEnable = function(tabLeft, tabRight) {

	var newtab = tabLeft.previousSibling;
	if (newtab)
		newtab = newtab.previousSibling;
	/*
	 * keep going back till you get a tab that is not hidden, or there is no
	 * more
	 */

	while (newtab) {
		/*
		 * there could be other text/empty elements
		 */
		if (newtab.id && newtab.style.display != 'none') {
			return newTab;
		}
		newtab = newtab.previousSibling;
	}
	/*
	 * We didn't get. try in the forward direction
	 */
	newtab = tabRight.nextSibling;
	if (newtab) {
		newtab = newtab.nextSibling;
	}
	while (newtab && newtab.style.display == 'none') {
		if (newtab.id && newtab.style.display != 'none') {
			return newTab;
		}
		newtab = newtab.nextSibling;
	}
	return null;
};
a.DISABLED_CLASS = 'disabledinput';
a.DISABLED_ATTRIBUTE_NAME = 'eleDisabled';
a.DISABLED_DOM_ATTRIBUTE = 'disabled';
/**
 * disable or enable fields. This method is long, but we let it that way because
 * it is not complex
 * 
 * @param fieldNames
 *            array of field names to be worked on
 * @param toEnable
 *            true if fields have to be enabled. False if they have to be
 *            disabled
 * @param idx
 *            1 based index into the table if the field happens to be in a table
 */
a.ableFields = function(fieldNames, toEnable, idx) {
	for ( var i = fieldNames.length - 1; i >= 0; i--) {
		var id = fieldNames[i];
		var field = this.fields[id];
		var table = this.tables[id];
		/*
		 * special feature to enable/disable table, though this method is named
		 * as ableFields!!
		 */
		if (!field && table) {
			if (toEnable) {
				table.enableAction && table.enableAction();
			} else {
				table.disableAction && table.disableAction();
			}
			continue;
		}

		var eleFoundInTable = false;
		var suffix = '';
		var ele = this.doc.getElementById(id);
		if (!ele) {
			/*
			 * possible that it is a field in the table. We have to get the do
			 * element for desired row
			 */
			if (field && field.table) {
				/*
				 * we are going to use current row later in this function
				 */
				eleFoundInTable = true;
				suffix = '__' + (idx || field.table.currentRow);
				ele = this.doc.getElementById(id + suffix);
			} else if (idx) {
				/*
				 * last chance. It could be delete check box. We will have
				 * name__idx for each row
				 */
				ele = this.doc.getElementById(id + '__' + idx);
			}
		}
		if (!ele) {
			debug(id + ' is marked for enable/disable. But it is not defined.');
			continue;
		}

		var eleIsButton = (ele.tagName && ele.tagName.toUpperCase() == 'FONT')
				|| (ele.type && ele.type.toUpperCase() == 'BUTTON');

		var tabIndex = 0;
		var className = '';
		var cursor = 'poniter';
		var disp = '';
		var attValue = 'flase';

		if (toEnable) {
			if (ele.savedClassName && ele.savedClassName != this.DISABLED_CLASS) {
				className = ele.savedClassName;
			}
			delete ele.savedClassName;
			ele.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
		} else {
			if (ele.className) {
				ele.savedClassName = ele.className;
			}
			tabIndex = -1;
			className = this.DISABLED_CLASS;
			cursor = '';
			disp = 'none';
			attValue = 'true';
			ele.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
					this.DISABLED_DOM_ATTRIBUTE);
		}

		ele.tabIndex = tabIndex;
		ele.className = className;
		if (eleIsButton) {
			ele.style.cursor = cursor;
			ele.setAttribute(this.DISABLED_ATTRIBUTE_NAME, attValue);
		}

		var picker = this.doc.getElementById(id + suffix + 'Picker');
		if (picker) {
			picker.style.display = disp;
		}

		var timeEle = this.doc.getElementById(id + 'Hr');
		if (timeEle) {
			var objs = field.getTimeObjects(timeEle);
			for (a in objs) {
				timeEle = objs[a];
				if (timeEle) {
					if (toEnable) {
						timeEle.className = timeEle.savedClassName || '';
						timeEle.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
					} else {
						timeEle.savedClassName = timeEle.className;
						timeEle.className = this.DISABLED_CLASS;
						timeEle.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
								this.DISABLED_DOM_ATTRIBUTE);
					}
				}
			}
		}
		/*
		 * is this a filterField? we have to take care of operator and to-field
		 */
		var toFieldEle = this.doc.getElementById(id + 'To');
		if (toFieldEle) {
			toFieldEle.className = className;
			if (toEnable) {
				toFieldEle.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
			} else {
				toFieldEle.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
						this.DISABLED_DOM_ATTRIBUTE);
			}
		}

		var opFieldEle = this.doc.getElementById(id + 'Operator');
		if (opFieldEle) {
			opFieldEle.className = className;
			if (toEnable) {
				opFieldEle.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
			} else {
				opFieldEle.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
						this.DISABLED_DOM_ATTRIBUTE);
			}
		}

		/*
		 * we also have the possibility of this ele having child nodes
		 */
		var children = ele.childNodes;
		if (children.length) {
			for ( var j = children.length - 1; j >= 0; j--) {
				var child = children[j];
				var childName = child.name;
				if (child.nodeType == 1 && childName) {
					if (ele.name.search(/Radio/) > 0
							|| childName.search(/Checkbox/) > 0) {
						if (toEnable) {
							child.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
						} else {
							child.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
									this.DISABLED_DOM_ATTRIBUTE);
						}
					}
				}
			}
		}

		/*
		 * is this a field in the table? Note that we haev already found a
		 * domelement in the current row, and we have taken care of that. We
		 * have to take care of the dom element in the row that is cached as
		 * rowToClone.
		 * 
		 */
		if (!eleFoundInTable) {
			continue;
		}

		var nodeName = ele.nodeName;
		var fieldObjects = field.table.rowToClone
				.getElementsByTagName(nodeName);
		if (fieldObjects.length == 0) {
			continue;
		}

		for ( var k = fieldObjects.length - 1; k >= 0; k--) {
			var obj = fieldObjects[k];
			if (obj.id != id) {
				continue;
			}
			/*
			 * we found the field
			 */
			if (toEnable) {
				obj.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
			} else {
				obj.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
						this.DISABLED_DOM_ATTRIBUTE);
			}
			break;
		}
	}
};

/**
 * render a panel as if it is a pop-up. This is achieved by putting a cover and
 * changing the z-index of this panel
 * 
 * @param panelName
 *            to be popped-up
 */
a.popupAPanel = function(panelName) {
	/*
	 * panel may have wrappers
	 */
	var panel = this.doc.getElementById(panelName + 'Top')
			|| this.doc.getElementById(panelName);
	if (!panel) {
		debug('Error: ' + panelName
				+ ' is not found as a DOM element. popup option failed ');
		return;
	}

	if (this.poppedUpPanel) {
		/*
		 * there is already a panl rendered as pop-up. bring it down. cover is
		 * already tehre
		 */
		this.poppedUpPanel.style.position = '';
	} else {
		/*
		 * create the cover, but once
		 */
		if (!this.myCoverStyle) {
			var div = this.doc.createElement('div');
			div.style.position = 'absolute';
			div.style.zIndex = 2;
			div.style.top = '0px';
			div.style.left = '0px';
			div.style.backgroundColor = exilParms.popupCoverColor;
			div.style.opacity = exilParms.popupCoverOpacity;
			this.doc.body.appendChild(div);
			this.myCoverStyle = div.style;
		}
		/*
		 * stretch the cover
		 */
		this.myCoverStyle.height = this.doc.body.clientHeight + 'px';
		this.myCoverStyle.width = this.doc.body.clientWidth + 'px';
		this.myCoverStyle.display = 'block';
	}
	/*
	 * pop it up
	 */
	panel.style.position = 'relative';
	panel.style.zIndex = 10;
	this.poppedUpPanel = panel;
};

/**
 * bring back a popped-up panel as normal
 */
a.popDown = function() {
	if (!this.poppedUpPanel) {
		debug('Nothing to popdown');
		return;
	}
	if (this.myCoverStyle) {
		this.myCoverStyle.display = 'none';
	}

	this.poppedUpPanel.style.position = '';
	this.poppedUpPanel = null;
};

/**
 * add page size variables as input to server
 * 
 * @param dc
 *            to be sent to server
 */
a.addPageSizes = function(dc) {
	if (!this.pageSizes) {
		return;
	}
	for ( var i = this.pageSizes.length - 1; i >= 0; i--) {
		/*
		 * each array element is an array of two elements, pageSize name and
		 * number of rows
		 */
		var pair = this.pageSizes[i];
		dc.values[pair[0]] = pair[1];
	}
};

/**
 * add fields to dc from query fields
 * 
 * @param dc
 * @param names
 *            array of name of fields to be pushed to dc
 * @param sources
 *            array of name of fields to be used to get value. it could be same
 *            as names.
 * @param idx
 *            optional 1-based index into table if the field happens to be in a
 *            table. Current row is taken if this is not specified
 * @param toValidate
 *            fields were not validated by mistake in our first version, and
 *            then it became a feature! we had to provide an override
 * @param repeatingColumnValue
 *            value to be used if the field happens to be the repeating column
 *            of its table
 * @param exemptedFieldName
 *            exceptional field name that should not be validated. Very quirky
 *            design indeed!!
 * @returns true if dc was filled successfully with no validation errors. False
 *          in case of errors.
 * 
 */
a.fillDcFromQueryFields = function(dc, names, sources, idx, toValidate,
		repeatingColumnValue, exemptedFieldName) {
	if (!names) {
		return true;
	}

	if (!sources) {
		message("Design error: Source not supplied for name = " + names,
				"Error", "Ok", null, null, null);
		return false;
	}

	for ( var i = names.length - 1; i >= 0; i--) {
		var sourceName = sources[i];
		var field = this.fields[sourceName];
		var val = null;
		if (field) {
			/*
			 * right thing would have been to delegate this to field object. But
			 * this method has taken its own course of customization of
			 * features... It stays here with some quirky designs
			 */
			if (toValidate && field.name != exemptedFieldName) {
				val = field.getValue(idx);
				try {
					val = field.validateValue(val);
				} catch (e) {
					e.field = field;
					this.catchError(e);
					return false;
				}
			}
			val = field.getValue(idx, true);
		} else {
			val = this.win[sourceName];
		}

		/*
		 * play it safe for null and undefined. 0 will also become '' but that
		 * is what we need
		 */
		if (!val) {
			val = '';
		}

		var fieldName = names[i];
		dc.addValue(fieldName, val);

		if (!field) {
			continue;
		}
		/*
		 * there are some related fields that need to be pushed
		 */
		if (field.isFilterField) {
			var otherField = this.fields[sourceName + "Operator"];
			val = otherField.getValue(idx, true);
			dc.addValue(fieldName + "Operator", val);
			/*
			 * could be a to-field if filter is 'between'
			 */
			if (val == 6) {
				otherField = this.fields[sourceName + "To"];
				val = otherField.getValue(idx, true);
				dc.addValue(fieldName + "To", val);
			}
		}

		/*
		 * in case this field is THE repeating column of a table, use the
		 * specified value
		 */
		var table = field.table;
		if (table && table.repeatingColumnName) {
			/*
			 * get the fully qualified name
			 */
			var fn = table.name + '_' + table.repeatingColumnName;
			if (fn == field.name) {
				dc.addValue(fieldName, fieldVal);
			}
		}
	}
	return true;
};

/**
 * ad fields and grids from the page
 * 
 * @param dc
 *            to be filled-up
 * @param fields
 *            collection of fields to be filled, null for all fields
 * @param tables
 *            collection of tables to be sent, null for all of them
 * @param sendAllFields -
 *            override toBeSentToServer attribute of fields. If this is true,
 *            just send the fields..
 */
a.fillDcFromForm = function(dc, fields, tables, sendAllFields) {
	if (!fields) {
		fields = this.fields;
		tables = this.tables;
	}
	for ( var fieldName in fields) {
		var field = this.fields[fieldName];
		if (field) {
			if (sendAllFields || (field.toBeSentToServer && !field.tableName)) {
				field.fillDc(dc);
			}
			continue;
		}
		/*
		 * special feature. Programmer can keep a grid with the name of the
		 * field in the window, and we send it to server!!
		 * 
		 * Why did we add this feature? Because someone asked for it :-)
		 */
		var grid = this.win[fieldName]; // a ready grid
		if (grid) {
			dc.addGrid(fieldName, grid);
			contine;
		}

		debug(fieldName
				+ ' is neither a field, nor a grid in the window. It will not be submitted.');
	}

	for ( var tableName in tables) {
		var table = this.tables[tableName];
		if (table) {
			if (table.fillDC && table.toBeSentToServer) {
				table.fillDC(dc);
			}
		} else {
			debug(tableName + ' is not a table. It will not be submitted.');
		}
	}
};
/*
 * file : page3Field.js
 * 
 * methods of P2 that work as controller for fields
 */
/**
 * get value of a field from the model. If field is inside a table, value from
 * the specified or current row is returned. If a field with this name is not
 * defined in the model, we try it as a local variable
 * 
 * @param fieldName
 * @param idx
 *            1-based index to the table. optional. currentRow of the table is
 *            used.
 * @param toFormat
 *            true implies that the value is to be formatted as per data type
 * @param fromDeletedRowAsWell
 *            if the specified row happens to be marked for deletion, by default
 *            we would treat as if the field does not exist. If this is set to
 *            true, we will treat deleted row on par with other rows
 * @returns value of the field in the model, or null if the field is not found
 */
a.getFieldValue = function(fieldName, idx, toFormat, fromDeletedRowAsWell) {
	var field = this.fields[fieldName];
	/*
	 * delegate it to the field
	 */
	if (field) {
		return field.getValue(idx, toFormat, fromDeletedRowAsWell);
	}
	/*
	 * It is not a field. We try it as a local variable. To avoid name-clash, we
	 * keep them in an object
	 */
	if (this.win.name_value_) {
		field = this.win.name_value_[fieldName];
		if (typeof (field) != 'undefined' && field != null) {
			return field;
		}
	}
	// last resort : it is just a local variable
	field = this.win[fieldName];
	if (typeof (field) != 'undefined' && field != null) {
		return field;
	}

	debug(fieldName + ' is not found any where ');
	return null;

};

/**
 * hide a field. this API is used, and hence we retained even after having a
 * common method for hide/show
 * 
 * @param fieldName
 *            to hide
 * 
 */
a.hideField = function(fieldName) {
	this.hideOrShowField(fieldName, 'none');
};
a.FIELD_RELATED_SIFFIXES = [ '', 'Label', 'Picker', 'Operator', 'FieldsTable',
		'ToDiv', 'Left', 'Middle', 'Right' ];
/**
 * common method to hide or show a field.
 * 
 * @param fieldName
 *            to be shown or hidden
 * @param display
 *            'none' to hide and '' to show. This is the attribute value of
 *            style.display
 */
a.hideOrShowField = function(fieldName, display) {
	var field = this.fields[fieldName];
	if (field && field.table) {
		field.table.hideOrShowField(fieldName, display);
		return;
	}
	/*
	 * suffix includes empty string, and hence field is also included in that
	 */
	for ( var i = this.FIELD_RELATED_SIFFIXES.length - 1; i >= 0; i--) {
		var ele = this.doc.getElementById(fieldName
				+ this.FIELD_RELATED_SIFFIXES[i]);
		if (ele) {
			ele.style.display = display;
		}
	}

	/*
	 * avoid prompting user for validation errors on hidden fields
	 */
	if (field) {
		if (display) {
			if (field.requiresValidation) {
				field.validationStatusOnHide = true;
				field.requiresValidation = false;
			}
		} else {
			if (field.validationStatusOnHide) {
				field.requiresValidation = true;
			}
		}
	}
};

/**
 * set given value as default value of a field
 * 
 * @param fieldName
 *            field whose defaultValue is to be set
 * @param defaultValue
 *            value to be set as defaultValue
 */
a.setDefaultValue = function(fieldName, defaultValue) {
	var field = this.fields[fieldName];
	if (field) {
		field.defaultValue = value;
	} else {
		debug('field ' + fieldName
				+ ' is not a feild and hence a default value of ' + value
				+ ' is not set');
	}
};

/**
 * we started with just two parameters, and over a period of time, we ended up
 * with all these parameters!!!
 * 
 * @param fieldName
 *            to set value to
 * @param value
 *            to be set to the field
 * @param obj
 *            optional dom element that the value cam from o
 * @param idx
 *            optional 1-based index if this is inside a table
 * @param suppressDesc
 *            do not fire description service after setting this value
 * @param formatValue
 *            whether to format the value before setting it to the field
 * @param listServiceOnLoad
 *            whether this call was initiated due a lost service that got fired
 *            on load
 * @param pageParameterOnLoad
 *            whether this is initiated becaue of a page parameter being set on
 *            load of page
 * @returns false if field was not found. TODO: other paths are not returning
 *          true, and hence we have to investigate this and re-factor
 * 
 */
a.setFieldValue = function(fieldName, value, obj, idx, suppressDesc,
		formatValue, listServiceOnLoad, pageParameterOnLoad) {
	if (!fieldName) {
		debug('Internal error: callto P2.setFieldValue with no name');
		return;
	}
	var field = this.fields[fieldName];
	if (!field) { // try local variable
		debug(fieldName + ' is not a field. value is not set');
		if (!this.win.name_value_)
			this.win.name_value_ = {};
		this.win.name_value_[fieldName] = value;
		// this.win[name] = value;
		return false;
	}
	if (pageParameterOnLoad) {
		field.setValue(value, obj, idx, field.supressDescOnLoad, formatValue,
				false, listServiceOnLoad);
	} else {
		field.setValue(value, obj, idx, suppressDesc, formatValue, false,
				listServiceOnLoad);
	}
};

a.setFieldLabel = function(fieldName, label) {
	var f = this.doc.getElementById(fieldName + 'Label');
	if (!f)
		return;
	f.innerHTML = label.replace(/&/g, '&amp;');
	var field = this.fields[fieldName];
	if (!field)
		return;
	field.label = label;
};

// Called to get values for a drop-downreturns a dc populated with list
// serviceId and keyvalue pairs
a.callListService = function(grid, field, fieldName, qryFields, qrySources,
		idx, listServiceOnLoad) // Aug 06 2009 : Bug ID
// 631 -
// suppressDescOnLoad is
// not working -
// WeaveIT: Venkat
{
	var dc = new DataCollection();
	dc.addGrid('listServiceIds', grid);
	if (qryFields) {
		if (!this.fillDcFromQueryFields(dc, qryFields, qrySources, idx))
			return false;
	}
	var se = new ServiceEntry('listService', dc, false, listServiceReturned,
			field, fieldName, ServerAction.NONE, null, null, null,
			listServiceOnLoad); // Aug 06 2009 : Bug ID 631 - suppressDescOnLoad
	// is not working - WeaveIT: Venkat
	this.win.serverStub.callService(se);
};

// Called to get values for a report returns a dc populated with report
// serviceId and keyvalue pairs
a.callReportService = function(grid, field, fieldName, qryFields, qrySources,
		idx) {
	var dc = new DataCollection();
	dc.addGrid('reportServiceIds', grid);
	if (qryFields) {
		if (!this.fillDcFromQueryFields(dc, qryFields, qrySources, idx))
			return false;
	}
	var se = new ServiceEntry('reportService', dc, false,
			reportServiceReturned, field, fieldName, ServerAction.NONE);
	this.win.serverStub.callService(se);
};

a.setLastModifiedNode = function(ele) {
	if (!ele) {
		ele = {};
		ele.id = 'unknown';
	}
	// form is already modified
	if (this.lastModifiedNode) {
		this.lastModifiedNode = ele;
		return;
	}

	// this is the first field change..
	this.lastModifiedNode = ele;
	if (this.onFormChangeActionName) {
		this.act(ele, ele.id, this.onFormChangeActionName);
	}
	if (this.buttonsToEnable) {
		for ( var i = 0; i < this.buttonsToEnable.length; i++)
			this.buttonsToEnable[i].disabled = false;
	}

	if (this.buttonsToDisable) {
		for ( var i = 0; i < this.buttonsToDisable.length; i++)
			this.buttonsToDisable[i].disabled = true;
	}
	if (window.tabbedWindows)
		tabbedWindows.setModifiedStatus(this.win.name, true);
};

a.resetLastModifiedNode = function() {
	this.lastModifiedNode = null;
	if (this.buttonsToEnable) {
		for ( var i = 0; i < this.buttonsToEnable.length; i++)
			this.buttonsToEnable[i].disabled = true;
	}

	if (this.onFormResetActionName) {
		this.act(null, null, this.onFormResetActionName);
	}
	if (this.buttonsToDisable) {
		for ( var i = 0; i < this.buttonsToDisable.length; i++)
			this.buttonsToDisable[i].disabled = false;
	}
	if (window.tabbedWindows)
		tabbedWindows.setModifiedStatus(this.win.name, false);
};

a.applyFieldAliases = function(grid) {
	var f;
	for ( var i = 1; i < grid.length; i++) {
		var row = grid[i];
		var fieldName = row[0];
		var field = this.fields[fieldName];
		if (!field)
			continue;
		if (row[1])
			field.aliasName = row[1];
		else {
			field.toBeSentToServer = false;
			field.requiresValidation = false;
			f = this.doc.getElementById(field.name + 'Label');
			if (f)
				f.style.display = 'none';
			f = this.doc.getElementById(field.name);
			if (f)
				f.style.display = 'none';

		}
		if (row[2]) {
			field.label = row[1];
			f = this.doc.getElementById(field.name + 'Label');
			if (f)
				f.innerHTML = row[1].replace(/&/g, '&amp;');
		}
		if (row[3]) {
			field.dataType = row[3];
		}
	}
};

a.resetFields = function(fieldsToReset) {
	var n = fieldsToReset.length;
	for ( var i = 0; i < n; i++) {
		var field = this.fields[fieldsToReset[i]];
		if (field && field.toBeSentToServer
				&& field.value != field.defaultValue)
			field.setValue(field.defaultValue);
		if (field.isFilterField) {
			field = this.fields[field.name + 'Operator'];
			if (field && field.value != field.defaultValue)
				field.setValue(field.defaultValue);
		}
	}
};

a.resetAllFields = function() {
	for ( var fieldName in this.fields) {
		var field = this.fields[fieldName];
		if (field && field.toBeSentToServer
				&& field.value != field.defaultValue)
			field.setValue(field.defaultValue);
	}
};
/**
 * reset fields to be submitted for a server action. This feature provides
 * flexibility for designer to re-use the same server action with different sets
 * of data. Primarily designed for auto-save feature for UXD project
 * 
 * @param actionName
 *            {String} name of service
 * @param fields
 *            {String[]} fields to be sent to server
 */
a.resetFieldsToSubmit = function(actionName, fields) {

	var action = this.actions[actionName];
	if (!action) {
		debug('action ' + actionName + ' is not a valid action');
		return;
	}

	if (!fields || !fields.length) {
		debug('Fields to be reset shoudl be an array of field names');
		return;
	}

	action.resetFieldsToSubmit(fields);
};

a.countEnteredFields = function() {
	var fields = this.fields;
	var kount = 0;

	for ( var fieldName in fields) {
		var field = fields[fieldName];
		if (field.toBeSentToServer && field.hasValue())
			kount++;
	}
	return kount;
};

a.fieldFocussed = function(obj, fieldName) {
	var field = this.fields[fieldName];
	if (!field)
		return;
	if (field.focussed) {
		if (!field.focussed(obj)) {
			// debug('p2 is abandoning field-focus');
			return;
		}
	}
	// debug('p2 is processing field-focus');
	var table = field.table;
	if (table && table.focussed)
		table.focussed(obj);
	if (field.onFocusActionName)
		this.act(obj, fieldName, field.onFocusActionName, null);
};

// Have you read the comments on the top about event qing issues? Do that before
// trying to understand this method
a.fieldChanged = function(obj, fieldName, internalChange, supressDesc,
		listServiceOnLoad) // Oct 20 2009 : Bug ID 737 -
// suppressDescOnLoad='true' for
// dependant selection field is
// triggering description service on
// reload. - WeaveIT: Venkat
{
	// do we have to remove error message ?
	if (!internalChange && !listServiceOnLoad) {
		var msgDiv = document.getElementById('warningMsg'); // used by exis team
		if (msgDiv)
			msgDiv.style.display = 'none';
	}

	var isDeleteField = false;
	if (fieldName.match(/Delete$/)) {
		debug('field ' + fieldName
				+ ' is Delete. Hence ignoring the field change');
		isDeleteField = true;
	}

	var field = this.fields[fieldName];

	if (!field) {
		if (!isDeleteField)
			debug('designError: field ' + fieldName
					+ ' not found in fields collection');
		return;
	}

	// checkbox group fix by RGB:14-Dec-08
	var tag = obj.tagName.toUpperCase();
	if (tag == 'SPAN') // checkbox group..
		return;
	if (tag == 'SELECT' && obj.selectedIndex >= 0) {
		if (obj.options[obj.selectedIndex].className == "inactiveoption") {
			debug('field ' + fieldName + ' cannot be set with inactiveoption');
			var val = field.getValue();
			field.setValueToObject(obj, val);
		}
	}

	// if this field is part of a table, this row becomes the current row now
	var idx = 0;
	var table = field.table;
	if (table) {
		idx = table.getRowNumber(obj);
		if (table.isRowDeleted && table.isRowDeleted(idx)) {
			var val = table.getFieldValue(idx, field);
			field.setValueToObject(obj, val);
			message(
					"You cannot modify a deleted row. Please un-delete the row before modifying it.",
					"Warning", "Ok", null, null, null);
			return false;
		}
	}

	if (!internalChange && !field.donotTrackChanges) {
		this.setLastModifiedNode(obj);
		field.changedByUser = true;
		this.pageChangedByUser = true;
	}

	var val = field.getValueFromObject(obj);

	if (typeof (val) == 'undefined') {
		debug(field.name + ' has undefined value');
		return;

	}
	// a field attached with desc service is not considered to be changed until
	// either the code picker returns or the
	// description service returns. Field changes will be triggered at that time
	var formattedValue = trim(val);
	var pp = this.pendingPicker;
	if (val.length == 0 && field.descServiceId && pp && pp.obj == obj) {
		// skip validation
	} else if (!internalChange) // validate only of user entered the value
	{
		try {
			formattedValue = field.validateValue(val);
			if (field.validationFunction) {
				var fn = this.win[field.validationFunction];
				if (typeof (fn) == 'function') {
					var errorText = fn(formattedValue);
					if (errorText && errorText.length)// user defined funciton
						// has returned an error
						throw new ExilityError(errorText);
				}
			}
		} catch (e) {
			obj.isValid = false;
			e.field = field;
			e.obj = obj;
			this.catchError(e);
			field.saveValue(val, obj, idx);
			if (table && table.rowChanged)
				table.rowChanged(obj, field.unqualifiedName, idx,
						internalChange);
			if (field.triggerFieldChangedEvents)
				field.triggerFieldChangedEvents('', obj, idx, supressDesc,
						internalChange);
			return;
		}
	}
	field.saveValue(formattedValue, obj, idx, internalChange);
	if (table && table.rowChanged)
		table.rowChanged(obj, field.unqualifiedName, idx, internalChange);
	// RGB:22-Dec-08. If code picker is pending, we should set .isValid to
	// false. Set it to true for other cases
	// obj.isValid = true;
	if (pp && pp.obj == obj) {
		obj.isValid = false;
		pp.validated = true;
		return;
	}
	obj.isValid = true;
	// if validator formatted it, let us save it...
	if ((field instanceof TextInputField) && (field.formatter)) {
		field.setValueToObject(obj, field.format(formattedValue));
	} else if (formattedValue != val)
		field.setValueToObject(obj, formattedValue);
	if (field.table && field.table.hasAggregates)
		field.table.aggregateAField(field, obj, idx);

	if (field.triggerFieldChangedEvents)
		field.triggerFieldChangedEvents(formattedValue, obj, idx, supressDesc,
				internalChange, listServiceOnLoad);
};
// called when selectionField is clicked with "more option"
a.MORE_OPTION_VALUE = '_more_';
a.moreOptionClicked = function(fieldName, e) {
	var option = e.target || e.srcElement;
	if (!option.value || option.value != this.MORE_OPTION_VALUE)
		return;

	var field = this.fields[fieldName];
	var fn = field && this.win[field.showMoreFunctionName];
	if (!fn) {
		alert('Function ' + (field && field.showMoreFunctoinName)
				+ ' is not defined. Show More option on ' + field.name
				+ ' will not work.');
		return;
	}
	fn(fieldName);
};
// pending: how do we handle combo box?
a.keyPressedOnField = function(obj, objName, e) {
	if (exilParms.doNotAddRowsOnTabOut)
		return;
	var key = e.keyCode || e.which;
	// debug('tab pressed on field ' + objName + ' is ' + key);
	if (key != 9)
		return; // tab
	var field = this.fields[objName];
	var tbl = field.table;
	if (!tbl || !tbl.rowsCanBeAdded)
		return;
	// How do I know whether this is the last row, as it appears in the HTML?
	// it is not possible to determine based on metadata, because of cloneRow
	// and multi-panel grids
	// best way is to check with the html itself
	var tr = this.doc.getElementById(tbl.name + tbl.currentRow);
	if (tr && tr.nextSibling)
		return;
	var f = "P2.addTableRow(null,'" + field.tableName + "');";
	this.addRowTimer = this.win.setTimeout(f, 0);
	debug('timer set for ' + f);
};
a.filterTable = function(obj, tableName, columnName) {
	var td = obj.parentNode; // obj is img, and it is a child of td.
	var xy = getDocumentXy(td);// modified findXY() to getDocumentXy. Since
	// findXY() is deprecated.
	var ele = document.getElementById(currentActiveWindow.name);
	// alert('current window is at ' + ele.offsetTop + ' and ' +
	// ele.offsetLeft);
	var x = xy.x + ele.offsetLeft;
	var y = xy.y + ele.offsetTop + 30;
	// alert('I got ' + td.tagName +' element at ' + x + ' and ' + y + ' and
	// towindop is ' + document.body.clientTop);
	if (!window.filterDiv)
		window.filterDiv = document.getElementById('filterArea');
	filterDiv.style.display = '';
	filterDiv.style.left = x + 'px';
	filterDiv.style.top = y + 'px';
	var table = this.tables[tableName];
	var btn = document.getElementById('removeFilterButton');
	if (table.filterByColumn)
		btn.disabled = false;
	else
		btn.disabled = true;
	coverPage(coverCalendarStyle, imgCalendarStyle);
	this.tableBeingFiltered = table;
	this.filterObj = obj;
	this.filterColumnName = columnName;
};

a.goFilter = function() {
	var val = document.getElementById('filterField').value;
	this.tableBeingFiltered.filter(this.filterObj, this.filterColumnName, val);
	this.cancelFilter();
};

a.cancelFilter = function() {
	filterDiv.style.display = 'none';
	uncoverPage(coverCalendarStyle);
	this.tableBeingFiltered = null;
	this.filterObj = null;
	this.filterColumnName = null;
};

a.removeFilter = function() {
	this.tableBeingFiltered.removeFilter();
	this.cancelFilter();
};

var ENTER = 13;
var BACKSPACE = 8;
var DELETE = 46;
var ZERO = 48;
var ONE = 49;
var TWO = 50;
var THREE = 51;
var FOUR = 52;
var FIVE = 53;
var SIX = 54;
var SEVEN = 55;
var EIGHT = 56;
var NINE = 57;
var LEFT = 37;
var RIGHT = 39;
// Apr 29 2009 : Bug 455 - List panel Pagination Issue - WeaveIT (Start) :
// Venkat
var TAB = 9;
var ZERONUMPAD = 96;
var ONENUMPAD = 97;
var TWONUMPAD = 98;
var THREENUMPAD = 99;
var FOURNUMPAD = 100;
var FIVENUMPAD = 101;
var SIXNUMPAD = 102;
var SEVENNUMPAD = 103;
var EIGHTNUMPAD = 104;
var NINENUMPAD = 105;
a.checkPageValue = function(field, evt) {

	switch (evt.keyCode) {
	case BACKSPACE:
	case DELETE:
	case ZERO:
	case ONE:
	case TWO:
	case THREE:
	case FOUR:
	case FIVE:
	case SIX:
	case SEVEN:
	case EIGHT:
	case NINE:
	case LEFT:
	case RIGHT:
	case ZERONUMPAD:
	case ONENUMPAD:
	case TWONUMPAD:
	case THREENUMPAD:
	case FOURNUMPAD:
	case FIVENUMPAD:
	case SIXNUMPAD:
	case SEVENNUMPAD:
	case EIGHTNUMPAD:
	case NINENUMPAD:
		return true;

	case TAB:
	case ENTER: {
		var curValue = parseInt(field.value, 10);
		var tableName = field.id.replace(/CurrentPage$/g, '');
		var table = this.tables[tableName];
		var totalValue = this.doc.getElementById(tableName + 'TotalPages').innerHTML;
		totalValue = parseInt(totalValue, 10);
		if (curValue < 1 || curValue > totalValue) {
			message(curValue + ' is not a valid page number', "Error", "Ok",
					null, null, null);
			field.value = '1';
		}
		table.paginate('random');
		return false;
	}

	default:
		if (evt.preventDefault)
			evt.preventDefault();
		else
			evt.returnValue = false;
		return false;
	}
};
// called onclick on a checlbox in a checkboxgroup
a.checkBoxGroupChanged = function(obj, groupName) {
	// note that we do not call fieldChanged for checkbox group. Hence some
	// functionality is copied.
	// we may have to re-factor it later.
	var msgDiv = document.getElementById('warningMsg'); // used by exis team
	if (msgDiv)
		msgDiv.style.display = 'none';

	var field = this.fields[groupName];
	if (!field) {
		debug('Design Error: CheckbBoxGroupField : ' + groupName
				+ ' is not rendered properly.');
		return;
	}
	this.setLastModifiedNode(obj);
	this.pageChangedByUser = true;
	field.changedByUser = true;

	field.changed(obj);
};
a.createCodePicker = function(pickerObj, e, fieldName) {
	var field, obj, id;
	var thisRow = null;
	field = this.fields[fieldName];
	id = field.name;
	if (field.table) {
		var table = field.table;
		table.focussed(pickerObj);
		thisRow = table.getRowNumber(pickerObj);
		var key = pickerObj.key;
		if (key)
			id = id + key;
		id = table.getObjectId(id, thisRow);
		debug('field id on which code picker is to be triggered is ' + id);
	}
	obj = this.doc.getElementById(id);
	var x = e.clientX;
	if (this.left)
		x = x + this.left;
	var y = e.clientY;
	if (this.top)
		y = y + this.top;
	this.pendingPicker = new PendingPicker(field, obj, x, y, thisRow);
};

a.startCodePicker = function() {
	var pp = this.pendingPicker;
	if (!pp)
		return;
	var field = pp.field;
	var idx = field.table ? field.table.getRowNumber(pp.obj) : 0;

	// do we need to validate this before going?
	if (!pp.validated) {
		var obj = pp.obj;
		var val = trim(field.getValueFromObject(obj));
		if (val.length > 0) {
			try {
				val = field.validateValue(val);
			} catch (e) {
				pp.obj.isValid = false;
				e.obj = obj;
				e.field = field;
				this.catchError(e);
				return;
			}
		}
		obj.isValid = true;
	}
	var src = field.codePickerSrc;
	if (field.codePickerLeft)
		PM.codePickerLeft = field.codePickerLeft;
	if (field.codePickerTop)
		PM.codePickerTop = field.codePickerTop;
	if (field.descQueryFields) {
		var qry = this.makeQueryString(field.descQueryFields,
				field.descQueryFieldSources, idx, field.validateQueryFields,
				field.name);
		if (qry == false)
			return false;
		src += '?' + qry;
	}

	debug('going to open pop-up with src = ' + src);
	coverPage(coverPickerStyle, imgPickerStyle);
	pickerWin.location.replace(htmlRootPath + src);
	addToInbox('pickerWindow', 'currentP2', this);
};

a.codePickerReturned = function(data) {
	debug('Code picker returned with data = ' + data);
	uncoverPage(coverPickerStyle);
	pickerWin.location.replace('about:blank');
	pickerEleStyle.display = 'none';
	var pp = this.pendingPicker;
	this.pendingPicker = null;
	PM.codePickerLeft = -1;
	PM.codePickerTop = -1;
	// if user didn't change the field, nor did she choose any code from picker,
	// move on...
	if (!pp.modifiedByUser && !data)
		return;

	if (data) // user picked a code.
	{
		this.setLastModifiedNode(pp.obj);
		pp.field.setDescFields(pp.obj, data);
	}

	else
		// user had modified the code, opened the picker and then closed it
		// woithout a selection
		this.fieldChanged(pp.obj, pp.field.name, false, false);

	pp.obj.focus();
};

a.createDatePicker = function(pickerObj, e, fieldName) {
	var field, obj, id;
	var thisRow = null;
	field = this.fields[fieldName];
	id = field.name;
	if (field.table) {
		thisRow = field.table.getRowNumber(pickerObj);
		id = field.table.getObjectId(id, thisRow);
	}
	obj = this.doc.getElementById(id);
	var xy = getPageXy(obj); // defined in utils. gets x,y relative to window
	// top taking care of scrolls
	// position date picker
	var pTop = xy.y + obj.offsetHeight; // just below this object
	var pLeft = xy.x + Math.floor((obj.offsetWidth - 190) / 2); // and center
	// aligned
	this.pendingPicker = new PendingPicker(field, obj, pLeft, pTop, thisRow);
};

a.startDatePicker = function() {
	var pp = this.pendingPicker;
	if (!pp)
		return;
	var obj = pp.obj;
	var field = pp.field;
	// ensure that this object click sets the current row in a table
	if (field.table)
		field.table.currentRow = field.table.getRowNumber(obj);

	var val = field.getValueFromObject(obj);
	var dt = dataTypes[field.dataType];
	if (val) {
		if (dt && dt.includesTime)
			val = parseDateTime(val);
		else
			val = parseDate(val); // parseDate will return null if it is not a
		// valid date. That is fine with us
	}
	var minDate = null;
	var maxDate = null;
	if (exilParms.restrictDatesInCalendar) {
		minDate = field.minDate;
		maxDate = field.maxDate;
		if (dt) {
			var minMax = dt.getMinMax();
			if (!minDate)
				minDate = minMax.min;
			if (!maxDate)
				maxDate = minMax.max;
		}
	}
	calElement.style.display = '';
	var calTop = pp.y;
	// do we have space to show the calendar?
	if (calTop + 185 > window.innerHeight) // not enough space below, move it
	// above
	{
		calTop = calTop - 200;
		if (calTop < 0) // not enough space above as well!!! it will overlap on
			// the date field now.
			calTop = 10;
	}
	var xy = getPageXy(calElement.offsetParent); // these are the coordinates
	// of calendar's parent
	// relative to window. this
	// + top/jeft should give
	// rise to pp.x/y
	calElement.style.top = (calTop - xy.y) + "px";
	calElement.style.left = (pp.x - xy.x) + "px";
	coverPage(coverCalendarStyle, imgCalendarStyle);
	// debug('for calendar objLeft:' + pp.x + ' objTop:' + calTop + ' calLeft:'
	// + xy.x + ' calTop' + xy.y);
	calWin.interact(this, val, minDate, maxDate);
};

a.datePickerReturned = function(date) {
	debug('Date picker returned with date=' + date);
	uncoverPage(coverCalendarStyle);
	calElement.style.display = 'none';
	// did the user click on date picker after touching the date field?
	var pp = this.pendingPicker;
	this.pendingPicker = null;
	// if the field was not changed and the user did not choose he date, we have
	// no work
	if (!pp.modifiedByUser && !date)
		return;

	if (date) {
		var dt = dataTypes[pp.field.dataType];
		if (dt && dt.includesTime) {
			pp.field.setValueToObject(pp.obj, formatDateTime(date));
			pp.field.setValue(formatDateTime(date));
		} else
			pp.obj.value = formatDate(date);
	}

	this.fieldChanged(pp.obj, pp.field.name, false, false);
	pp.obj.focus();
};

// Jan 07 2010 : Bug 844 - Issue related to ValidateQueryFields attribute -
// WeaveIT (Start): Venkat
var PendingPicker = function(field, obj, x, y, idx) {
	this.obj = obj;
	this.field = field;
	this.timer = null;
	this.x = x;
	this.y = y;
	this.idx = idx;
};
a.tableClicked = function(tableName, obj) {
	var table = this.tables[tableName];
	if (table && table.clicked)
		table.clicked(obj);
};

/**
 * Function to be called on click of table header.
 * 
 * @function tableHeaderClicked
 * @lends ExilityPage
 * @param {Object}
 *            event - The onclick event from table header th.
 * @param {String}
 *            tableName - The name of the table.
 * @param {columnName}
 *            columnName -The name of the column in table.
 * @author vinay 03-August-2013
 */
a.tableHeaderClicked = function(event, tableName, columnName) {
	// get the target element where it is clicked(th or img).
	var obj = event.target;
	// get the custom attribute data-exilIconType from the obj
	var imageType = obj.getAttribute("data-exilImageType");

	if (imageType == 'filter')
		this.filterTable(obj, tableName, columnName);
	else if (imageType == 'sort')
		this.sortTable(obj, tableName, columnName);
	else
		this.sortTable(null, tableName, columnName);// default is sort.
};

a.sortTable = function(obj, tableName, columnName) {
	this.tables[tableName].sort(obj, columnName);
};

a.rowSelected = function(tableName, obj) {
	var table = this.tables[tableName];
	if (table)
		table.rowSelected(obj);
};

a.listMouseOver = function(obj, tableName, e) {
	if (!e) {
		e = window.event;
	}
	this.tables[tableName].mouseOver(obj, e);
};

a.listMouseOut = function(obj, tableName, e) {
	if (!e) {
		e = window.event;
	}
	this.tables[tableName].mouseOut(obj, e);
};

a.listClicked = function(obj, tableName, evt) {
	this.tables[tableName].clicked(obj, evt);
};

a.listDblClicked = function(obj, tableName, actionName) {
	this.tables[tableName].dblClicked(obj, actionName);
};

a.addTableRow = function(obj, tableName) {
	this.addRowTimer = null; // it could have been triggered with a timer
	// that was set when tab was pressed
	var table = this.tables[tableName];
	var f = table.functionBeforeAddRow;
	var result = true;
	if (f) {
		try {
			if (f.indexOf('(') >= 0) {
				eval('result = this.win.' + f);
			} else {
				result = this.win[f]();
			}
		} catch (e) {
			//
		}
		if (!result)
			return;
	}

	// var key = obj ? obj.key : null;
	// table.addRows(1, obj && key, true);
	var key = obj ? obj.key : table.getKey();
	// Dec 09 2009 : Bug ID 798 - In single selction value-inside grid -
	// Exility(Start): Vijay
	if ((table.dataForNewRowToBeClonedFromRow && table.dataForNewRowToBeClonedFromRow != 'none')
			|| table.dataForNewRowToBeClonedFromFirstRow
			|| table.rowsCanBeCloned) // Feb 16 2010 : Bug ID 967 - Drop down
		// issue in Grid - Exility : Venkat
		table.cloneFlag = 1;
	else
		table.cloneFlag = 0;
	// Dec 09 2009 : Bug ID 798 - In single selction value-inside grid -
	// Exility(End) : Vijay
	table.addRows(1, key, true);
	f = table.functionAfterAddRow;
	if (f) {
		try {
			if (f.indexOf('(') >= 0) // use has typed a funciton with
				// parameters
				eval('this.win.' + f);
			else
				// it is name of a function
				this.win[f]();
		} catch (e) {
			debug(f
					+ ' could not be run as a function. An exception occurred: '
					+ e);
		}
	}
};

a.cloneTableRow = function(obj, tableName) {
	var table = this.tables[tableName];
	var f = table.functionBeforeAddRow;
	var result = true;
	if (f) {
		try {
			if (f.indexOf('(') >= 0) {
				eval('result = this.win.' + f);
			} else {
				result = this.wan[f]();
			}
		} catch (e) {
			//
		}
		if (!result)
			return;
	}
	if (this.tables[tableName].dataForNewRowToBeClonedFromFirstRow
			|| this.tables[tableName].rowsCanBeCloned)
		this.tables[tableName].cloneFlag = 1;
	else
		this.tables[tableName].cloneFlag = 0;

	this.tables[tableName].cloneRow();
	f = table.functionAfterAddRow;
	if (f) {
		try {
			if (f.indexOf('(') >= 0) {
				eval('this.win.' + f);
			} else {
				this.win[f]();
			}
		} catch (e) {
			//
		}
	}
};

a.removeTableRows = function(obj, tableName) {
	this.tables[tableName].removeTableRows(tableName);
};

a.removeTableRow = function(evt, obj, tableName) {
	var curTable = this.tables[tableName];
	var tr = getRowInTable(obj);
	var idx = tr.rowIdx;
	var dataRow = curTable.grid[idx];
	if (dataRow.isDeleted) {
		this.setLastModifiedNode(obj);
		var result = true;
		var f = curTable.functionBeforeDeleteRow;
		if (f) {
			try {
				if (f.indexOf('(') >= 0) {
					eval('result = this.win.' + f);
				} else {
					result = this.win[f]();
				}
			} catch (ex) {
				//
			}
			if (!result)
				return false;
		}
		result = curTable.deleteRow(obj);
		if (!result) {
			if (evt && evt.preventDefault)
				evt.preventDefault();
			return false;
		}

		f = curTable.functionAfterDeleteRow;
		if (f) {
			try {
				if (f.indexOf('(') >= 0) {
					eval('result = this.win.' + f);
				} else {
					result = this.win[f]();
				}
			} catch (e) {
				//
			}
		}
		return result;
	}
	return true;
};

a.deleteAllTableRows = function(obj, tableName) {
	this.tables[tableName].deleteAllTableRows(!obj.checked);
};

a.deleteTableRow = function(evt, obj, tableName) {
	this.setLastModifiedNode(obj);
	var result = true;
	var table = this.tables[tableName];
	var f = table.functionBeforeDeleteRow;
	if (f) {
		try {
			if (f.indexOf('(') >= 0) {
				eval('result = this.win.' + f);
			} else {
				result = this.win[f]();
			}
		} catch (e) {
			//
		}
		if (!result)
			return;
	}

	result = table.deleteRow(obj);
	if (!result) {
		if (evt && evt.preventDefault)
			evt.preventDefault();
		return result;
	}

	f = table.functionAfterDeleteRow;
	if (f) {
		a.appendRow = function(tblNAme, dataRow) {
			this.tables[tblName].appendRow(dataRow);
		};

		a.insertRow = function(tblName, idx) {
			this.tables[tblName].insertRow(idx);
		};

		try {
			if (f.indexOf('(') >= 0) {
				eval('result = this.win.' + f);
			} else {
				result = this.win[f]();
			}
		} catch (e) {
			//
		}
	}
	return result;
};

a.paginate = function(tableName, action) {
	this.tables[tableName].paginate(action);
};

a.handleGridNav = function(obj, fieldName, e) {
	var field = this.fields[fieldName];
	var keycode = e.keyCode || e.which;

	if (keycode == 40 && e.altKey) {
		if (field && field.table) {
			var curTable = field.table;
			var curNbrRows = curTable.nbrRows;
			var curRow = obj.rowIdx;
			if (obj.name && obj.name.match(/.*Radio$/)) {
				curRow = this.doc
						.getElementById(obj.name.replace(/Radio$/, '')).rowIdx;
			}
			if (curRow < curNbrRows) {
				curRow++;
				var fieldIdToFocus = curTable.getObjectId(fieldName, curRow);
				var fieldToFocus = this.doc.getElementById(fieldIdToFocus);
				if (fieldToFocus) {
					if (obj.name && obj.name.match(/.*Radio$/)) {
						if (fieldToFocus.getElementsByTagName("input")
								&& fieldToFocus.getElementsByTagName("input")[0]) {
							fieldToFocus.getElementsByTagName("input")[0]
									.focus();
						}
					} else if (obj.className
							&& obj.className == 'checkboxgroup') {
						if (fieldToFocus.getElementsByTagName("input")
								&& fieldToFocus.getElementsByTagName("input")[0]) {
							fieldToFocus.getElementsByTagName("input")[0]
									.focus();
						}
					} else
						fieldToFocus.focus();
				}

			}
		} else {
			var curObjId = obj.id;
			if (curObjId.match(/Delete__(\d)+$/)) {
				var curObjIdParts = curObjId.split("__");
				var curObjIdPartsLength = curObjIdParts.length;
				var curIndex = parseInt(curObjIdParts[curObjIdPartsLength - 1]);
				curObjIdParts[curObjIdPartsLength - 1] = ++curIndex + "";
				var fieldToFocus = this.doc.getElementById(curObjIdParts
						.join("__"));
				if (fieldToFocus) {
					fieldToFocus.focus();
				}
			}
		}
		if (e && e.stopPropagation) {
			e.stopPropagation();
			e.preventDefault();
		} else
			e.returnValue = false;
		return false;
	} else if (keycode == 38 && e.altKey) {
		if (field && field.tableName) {
			var curTableName = field.tableName;
			var curTable = this.getTable(curTableName);
			var curRow = obj.rowIdx;
			if (obj.name && obj.name.match(/.*Radio$/)) {
				curRow = this.doc
						.getElementById(obj.name.replace(/Radio$/, '')).rowIdx;
			}
			if (1 < curRow) {
				curRow--;
				var fieldIdToFocus = curTable.getObjectId(fieldName, curRow);
				var fieldToFocus = this.doc.getElementById(fieldIdToFocus);
				if (fieldToFocus) {
					if (obj.name && obj.name.match(/.*Radio$/)) {
						if (fieldToFocus.getElementsByTagName("input")
								&& fieldToFocus.getElementsByTagName("input")[0]) {
							fieldToFocus.getElementsByTagName("input")[0]
									.focus();
						}
					} else if (obj.className
							&& obj.className == 'checkboxgroup') {
						if (fieldToFocus.getElementsByTagName("input")
								&& fieldToFocus.getElementsByTagName("input")[0]) {
							fieldToFocus.getElementsByTagName("input")[0]
									.focus();
						}
					} else
						fieldToFocus.focus();
				}

			}
		} else {
			var curObjId = obj.id;
			if (curObjId.match(/Delete__(\d)+$/)) {
				var curObjIdParts = curObjId.split("__");
				var curObjIdPartsLength = curObjIdParts.length;
				var curIndex = parseInt(curObjIdParts[curObjIdPartsLength - 1]);
				curObjIdParts[curObjIdPartsLength - 1] = --curIndex + "";
				var fieldToFocus = this.doc.getElementById(curObjIdParts
						.join("__"));
				if (fieldToFocus) {
					fieldToFocus.focus();
				}
			}
		}
		if (e && e.stopPropagation) {
			e.stopPropagation();
			e.preventDefault();
		} else
			e.returnValue = false;
		return false;
	}
};

a.bulkCheckAction = function(obj, colName, tableName) {
	var table = this.tables[tableName];
	if (table.bulkCheckAction)
		table.bulkCheckAction(obj, colName);
};
/**
 * called before leaving the page. We use server based pagination. We have to
 * server let know that we are moving on, and any cached pages shoudl be purged.
 * This is done by sending request for page 0. This functionality is delegated
 * to table
 * 
 */
a.doneWith = function() {
	try {
		for ( var tableName in this.tables) {
			var table = this.tables[tableName];
			table.doneWith && table.doneWith();
		}
	} catch (e) {
		// 
	}
};

/**
 * make a query string out of the fields that are given
 * 
 * @param names
 *            comma separated list of field names
 * @param sources
 *            field names from which to extract field valaues. caller can send
 *            the same field for both in case source are same as names.
 * @param idx
 *            1 based index to the table in case the fields are in a table
 * @param toValidate
 *            validate the fields and return false in case validaiton fails.
 *            false means just send them
 * @param pickerSource
 *            if this is meant for a code-picke, we do not validate the field
 *            that is the oicker source
 * @returns a string that is suitable to be used as query string for URL
 */
a.makeQueryString = function(names, sources, idx, toValidate, pickerSource) {
	var qryStr = '';
	if (!names) {
		return '';
	}
	if (!sources) {
		sources = names;
	}
	var val;
	// prepare a string of the form name=vale&name1=value1.....
	var prefix = '';
	for ( var i = 0; i < sources.length; i++) {
		var field = this.fields[sources[i]];
		if (field) {
			val = field.getValue(idx);
			if (toValidate == "true"
					&& (!pickerSource || field.name != pickerSource)) {
				try {
					val = field.validateValue(val);
				} catch (e) {
					e.field = field;
					this.catchError(e);
					return false;
				}
			}
		} else {
			val = this.win[sources[i]];
			if (!val) {
				val = '';
			}
		}

		qryStr += prefix + names[i] + "=" + escape(val);
		prefix = '&';

		/*
		 * we extended this for filter field as well
		 */
		if (field && field.isFilterField) {
			field = this.fields[sources[i] + "Operator"];
			if (field) {
				val = field.getValue(idx);
				qryStr += prefix + names[i] + "Operator=" + escape(val);

				field = this.fields[sources[i] + 'To'];
				if (field && val == 6) // between
				{
					val = field.getValue(idx);
					qryStr += prefix + names[i] + 'To=' + escape(val);
				}
			}
		}
	}
	return qryStr;
};

/**
 * called from our animator, to take care of window size issue that may lead to
 * double-scroll bar. We wait till all animations end to trigger resize.
 */
a.animationStarted = function() {
	this.nbrBeingAnimated++;
};

/**
 * called from our animator, to take care of window size issue that may lead to
 * double-scroll bar. We wait till all animations end to trigger resize.
 */
a.animationEnded = function() {
	this.nbrBeingAnimated--;
	if (!this.nbrBeingAnimated) {
		this.win.checkIframeSize();
	}
};

/**
 * append rows from data to table
 * 
 * @tableName table name
 * @param data
 *            in form of array of rows, with first row as header
 */
a.appendRows = function(tableName, data) {
	var table = this.tables[tableName];
	if (!table) {
		debug('Table ' + tableName
				+ ' not found for this page. Rows will not be appended');
		return;
	}
	var dc = new PM.DataCollection();
	dc.addGrid[tableName] = data;
	table.setData(dc, true, true);
};

/**
 * core MVC function : push data received from server into the model and to the
 * view
 * 
 * @param dc
 *            our standard data carrier
 * @param listServiceOnLoad
 *            is this done when the list service is returned from onload
 */
a.refreshPage = function(dc, listServiceOnLoad) {
	var field;

	/*
	 * see if any of the grid is meant for listService/reportservice
	 */
	this.fillList(dc.grids, true);
	this.fillReport(dc.grids);

	/*
	 * take care of fields
	 */
	for ( var nam in dc.values) {
		field = this.fields[nam];
		var supressDesc = (field && field.supressDescOnLoad) ? true : false;
		this.setFieldValue(nam, dc.values[nam], null, 0, supressDesc, true,
				listServiceOnLoad);
	}

	/*
	 * take care of entries in grids that work as data source for tables in HTML
	 */
	for ( var nam in dc.grids) {
		var grid = dc.grids[nam];
		if (!grid || !grid.length) {
			continue;
		}
		if (nam == 'fieldAliases') {
			this.applyFieldAliases(grid);
			continue;
		}
		var table = this.tables[nam];
		if (table) {
			if (!table.doNotSetDataToMe) {
				table.setData(dc, null, null, listServiceOnLoad);
			}
			continue;
		}
		/*
		 * some fields get data as grid
		 */
		field = this.fields[nam];
		if (field && field.setGrid)
			field.setGrid(grid);
	}

	// and lists?
	for ( var nam in dc.lists) {
		field = this.fields[nam];
		if (field && field.setList) {
			var lst = dc.lists[nam];
			if (lst) {
				field.setList(lst);
			}
		}
	}
	/*
	 * playing it safe, as we have changed the view
	 */
	this.win.checkIframeSize();
};
/**
 * validate data. called before sending data to server
 * 
 * @param fields
 *            to be sent to server. optional, defaults to all fields
 * @param tables
 *            to be sent server. optional, defaults to all tables
 * @returns true of validation completed successfully, false otherwise
 */
a.validate = function(fields, tables) {

	var userFunction = null;
	if (!fields && !tables) {
		userFunction = this.formValidationFunction;
		fields = this.fields;
		tables = this.tables;
	}
	var field;
	var returnValue = true;
	/*
	 * piece of bad-design, but a good short-cut. setting a global field that we
	 * will reset at the end.
	 */
	PM.pageValidation = true;

	for ( var fieldName in fields) {
		field = this.fields[fieldName];
		if (!field || !field.toBeSentToServer) {
			continue;
		}
		var onlyIfChanged = this.validateOnlyOnUserChange
				|| field.validateOnlyOnUserChange;
		if (onlyIfChanged && !field.changedByUser) {
			continue;
		}
		try {
			if (field.table)
				field.table.validateColumn(field, onlyIfChanged);
			else
				field.validate(true);
		} catch (e) {
			this.error = e;
			this.handleError();
			if (exilParms.stopAtFirstError) {
				PM.pageValidation = false;
				return false;
			}
			returnValue = false;
		}
	}

	if (!tables) {
		return returnValue;
	}
	/*
	 * note that the field values inside table are already validated. we have to
	 * carry out only table level validations
	 */
	for ( var tableName in tables) {
		try {
			var table = this.tables[tableName];
			if (table.validate && table.toBeSentToServer)
				table.validate();
		} catch (e) {
			/*
			 * it could be validation error or general error as well. validation
			 * error would have set message id
			 */
			if (!e.messageId) {
				var fName = 'unknown';
				if (e.href) {
					var parts = e.href.split('/');
					fName = parts[parts.length - 1];
				}

				debug(' script error in ' + fName + ' line no ' + e.lineNo
						+ ' ' + e.source + '\n' + e.message);
				return false;
			}
			if (exilParms.stopAtFirstError) {
				PM.pageValidation = false;
				return false;
			}
			returnValue = false;
		}
	}

	if (returnValue && userFunction) {
		try {
			returnValue = this.win[userFunction]();
		} catch (e) {
			debug("user function " + userFunction
					+ " has aborted with an error." + e);
			returnValue = false;
		}

	}
	PM.pageValidation = false;
	return returnValue;
};

/**
 * internally called to handle error on validation
 * 
 * @param e
 *            exception/error object thrown by validation routine. This may
 *            contain info about the error that need to be displayed to user
 * @returns
 */
a.catchError = function(e) {

	/*
	 * if any picker is pending, stop that..
	 */
	if (this.pendingPicker) {
		this.pendingPicker = null;
		debug('ticker for a picker silenced');
	}
	if (this.addRowTimer) {
		this.win.clearTimeout(this.addRowTimer);
		this.addRowTimer = null;
		debug('ticker for a add row silenced');
	}

	this.error = e;
	/*
	 * we are not sure what all events are pending in the queue. Now that we
	 * have detected an error, we would like to signal that to them, and we get
	 * back to business after they finish.
	 * 
	 * TODO: find out why are resetting error with a timer rather than in
	 * handleError()
	 */
	this.errorOccurred = true;
	this.win.setTimeout('P2.errorOccurred = false;', 500);
	this.win.setTimeout("P2.handleError()", 0);
};

/**
 * back to handling error thru timer after all events are handled. all info is
 * available as part of this.*
 */
a.handleError = function() {
	if (!this.error) {
		/*
		 * not sure how this can happen, but for safety
		 */
		debug('Design Error: reached handleError but P2.error has no erroe message.');
		return;
	}

	/*
	 * show field in error
	 */

	if (this.error.render) {
		this.error.render(this.error.obj);
	} else {
		alert(this.error);
	}
	this.error = null;
	return;
};

/**
 * tab of a tabbed panel is clicked. Hide current panel, and show the new panel.
 * This design quite cryptic because we are using attributes of elements and
 * some naming conventions. read carefully
 * 
 * @param obj
 *            dom element being clicked
 * @param tabbedPanelName
 *            panel associated with this tab
 * @param tabContainerName
 * 
 */
a.tabClicked = function(obj, tabbedPanelName, tabContainerName) {
	var newId = obj.id;
	/*
	 * possible that the click was on left/right area of the tab
	 */
	newId = newId.replace(/Right$/, '');
	newId = newId.replace(/Left$/, '');

	obj = this.doc.getElementById(newId);
	if (obj.clickDisabled) {
		return;
	}

	if (!tabContainerName) {
		tabContainerName = obj.getAttribute('tabcontainername');
	}
	debug('Tab action started for panel name ' + tabbedPanelName
			+ ' when user clicked on ' + newId);
	var tabVariableName = tabContainerName + 'ActiveTabName';
	var panelVariableName = tabContainerName + 'ActivePanelName';
	var currentTab = this.doc.getElementById(this.win[tabVariableName]);
	var currentPanel = this.doc.getElementById(this.win[panelVariableName]);
	if (!currentPanel || !currentTab) {
		debug('Current active tab panel for table ' + tabbedPanelName
				+ ' could not be found in variables ' + tabVariableName
				+ ' and ' + panelVariableName);
		return;
	}

	/*
	 * get the panel associated with the tab
	 */
	var panel = this.doc.getElementById(tabbedPanelName);
	if (!panel) {
		debug('tab element for tabPanelName ' + tabbedPanelName + ' not found.');
		return;
	}
	/*
	 * show/hide
	 */
	currentTab.className = 'passivetablabel';
	currentTab.clickDisabled = null;
	var currentTabLeft = this.doc.getElementById(this.win[tabVariableName]
			+ 'Left');
	if (currentTabLeft) {
		currentTabLeft.className = 'passivetablabelLeft';
		currentTabLeft.clickDisabled = null;
	}
	var currentTabRight = this.doc.getElementById(this.win[tabVariableName]
			+ 'Right');
	if (currentTabRight) {
		currentTabRight.className = 'passivetablabelRight';
		currentTabRight.clickDisabled = null;
	}
	currentPanel.style.display = 'none';

	obj.className = 'activetablabel';
	obj.clickDisabled = true;
	var objTabLeft = this.doc.getElementById(newId + 'Left');
	if (objTabLeft) {
		objTabLeft.className = 'activetablabelLeft';
		objTabLeft.clickDisabled = null;
	}
	var objTabRight = this.doc.getElementById(newId + 'Right');
	if (objTabRight) {
		objTabRight.className = 'activetablabelRight';
		objTabRight.clickDisabled = null;
	}
	panel.style.display = '';

	// store the this panel as current
	this.win[tabVariableName] = newId;
	this.win[panelVariableName] = tabbedPanelName;
	if (this.tabClickFunctionName) {
		this.win[this.tabClickFunctionName](newId, tabbedPanelName);
	}
};

/**
 * twistie was one of our hit features when we started in early 2000's. A panel
 * could be expanded/collapsed easily ..
 */
a.TWISTED = 'collapsedTwister';
a.NOT_TWISTED = 'expandedTwister';
a.TOP_TWISTED = 'collapsedfieldset';
a.TOP_NOT_TWISTED = 'expandedfieldset';

/**
 * act on a click on the twister element
 * 
 * @param ele
 *            dom element of the twister
 * @param divName
 *            div element that is associated with this twister
 * 
 */
a.twist = function(ele, divName) {
	var tpnl = this.doc.getElementById(divName + 'Top');
	var clsName = ele && ele.className;

	// css5 compliant generated code would just set css
	if (clsName == this.TWISTED) // css5 page
	{
		ele.className = this.NOT_TWISTED;
		if (tpnl) {
			tpnl.className = this.TOP_NOT_TWISTED;
		}
		return;
	}
	if (clsName == this.NOT_TWISTED) // css5 page
	{
		ele.className = this.TWISTED;
		if (tpnl)
			tpnl.className = this.TOP_TWISTED;
		return;
	}

	// old pages that rely on script for rendering

	var div = this.doc.getElementById(divName);

	if (div.childNodes.length == 2 && div.childNodes[1].tagName == 'DIV') {
		var innerDiv = div.childNodes[1];
		if (innerDiv.childNodes.length == 2
				&& innerDiv.childNodes[0].tagName == 'TABLE') {
			var tableEle = innerDiv.childNodes[0];
			var tableObj = this.getTable(tableEle.id);
			if (tableObj != null && tableObj.grid && tableObj.grid.length == 1
					&& this.doc.getElementById(tableEle.id + 'NoData') != null)
				div = this.doc.getElementById(tableEle.id + 'NoData');
		}
	}

	var divContainer = this.doc.getElementById(divName + 'Container');
	var divTabs = this.doc.getElementById(divName + 'Tabs');

	// is there an image before this element that represents
	// expanded/collpapsed??
	var imgEle = null;
	if (ele) {
		imgEle = ele.firstChild;
		if (imgEle && !imgEle.src)
			imgEle = imgEle.nextSibling; // sometimes, a #text will slip in
		// between
	}

	// see if top panel is there
	var tpnl = this.doc.getElementById(divName + 'Top');

	if (div.style.display == 'none') {
		// it is hidden now. Display that
		div.style.display = '';
		if (divContainer)
			divContainer.style.display = '';
		if (divTabs)
			divTabs.style.display = '';
		if (imgEle) {
			imgEle.src = htmlRootPath + '../exilityImages/expanded.gif';
			imgEle.title = "Collapse";
		}
		if (tpnl)
			tpnl.className = 'expandedfieldset';
		return;
	}
	div.style.display = 'none';
	if (divContainer)
		divContainer.style.display = 'none';
	if (divTabs)
		divTabs.style.display = 'none';
	if (imgEle) {
		imgEle.src = htmlRootPath + '../exilityImages/collapsed.gif';
		imgEle.title = "Expand";
	}
	if (tpnl)
		tpnl.className = 'collapsedfieldset';
	return;
};

/**
 * use grid in grids colleciton as list service results
 * 
 * @param grids
 *            collection of grids from dc
 * @param listServiceOnLoad
 */
a.fillList = function(grids, listServiceOnLoad) {
	for ( var gridName in this.listServices) {
		var grid = grids[gridName];

		if (!grid) {
			continue;
		}
		/*
		 * remember, listeners are field obbjects. Refer to .init() routine
		 */
		var listeners = this.listServices[gridName];
		for ( var i = 0; i < listeners.length; i++) {
			listeners[i].fillList(grid, null, listeners.keyValue,
					listServiceOnLoad);
		}
	}
};

/**
 * user grids as reports
 * 
 * @param grids
 *            collection of grids
 */
a.fillReport = function(grids) {
	for ( var gridName in this.reportServices) {
		var grid = grids[gridName];

		if (!grid)
			continue;
		var listeners = this.reportServices[gridName];
		for ( var i = 0; i < listeners.length; i++) {
			listeners[i].fillReport(grid, null, listeners.keyValue);
		}
	}
};

/**
 * when buttons are rendered as selction field, we show a go button infornt of
 * that. That button is clicked
 * 
 * @param selectionName
 *            button name associated with the selected option
 */
a.goButtonClicked = function(selectionName) {
	var ele = this.doc.getElementById(selectionName);
	if (!ele) {
		debug('ERROR : Dom element for buttonDropDown with name = '
				+ selectionName + ' not found');
		return;
	}
	var idx = ele.selectedIndex;
	if (idx <= 0) {
		message('Please select an action before clicking on GO button', "",
				"Ok", null, null, null);
		ele.focus();
		return;
	}
	var actionName = ele.options[idx].value;
	this.act(ele, selectionName, actionName);
};

/**
 * get an array of unqualified name for an array of fully qualified field names.
 * We use the fact that the field collection is indexed by fully qualified name,
 * and field has unqualifiedNAme as an attribute
 */
a.getUnqualifiedNames = function(names) {
	var unames = [];
	for ( var i = 0; i < names.length; i++) {
		var uname = names[i];
		var field = this.fields[uname];
		if (!field) {
			debug(uname
					+ ' is not a valid field. getUnqualifiedNames will not work properly');
		} else if (field.unqualifiedName) {
			uname = field.unqualifiedName;
		}
		unames.push(uname);
	}
	return unames;
};

/**
 * function called back by server agent when list service returns
 * 
 * @param obj
 *            that triggered list service
 * @param fieldName
 *            that triggered list service
 * @param se
 *            service entry that has all details of the server call as well as
 *            its result. refer to serverAgent.js
 * @param listServiceOnLoad
 *            true if this was triggered on load
 */
var listServiceReturned = function(obj, fieldName, se, listServiceOnLoad) {
	var P2 = se.win.P2;
	var grids = se.dc.grids;
	if (!fieldName) {
		/*
		 * service was NOT for a specific field or object, but is a geric one.
		 * Let us hand over to fillList
		 */
		P2.fillList(grids, true);
		return;
	}
	var field = P2.getField(fieldName);
	if (!field) {
		debug('Design error: list service ' + gridName
				+ ' returned successfully for field ' + fieldName
				+ ' but there is no field with this name.');
		return;
	}

	var gridName = field.listServiceId;
	var grid = null;
	var keyValue = null;
	/*
	 * gridName should start with service name. It may not match because of
	 * keyValue
	 */
	for ( var gn in grids) {
		if (gn.indexOf(gridName) != 0)
			continue;

		grid = grids[gn];
		if (gn.length > gridName.length) {
			/*
			 * it has keyValue in that
			 */
			keyValue = gn.substring(gridName.length + 1);
		}
		break;
	}

	if (!grid) {
		debug('Error: list service ' + gridName
				+ 'did not come back with a grid name starting with '
				+ gridName);
		return;
	}
	/*
	 * is it a list for different key?
	 */
	if (obj && obj.listServiceKey && keyValue != obj.listServiceKey) {
		debug('Info: list service '
				+ gridName
				+ ' returned successfully. But the object is waiting for key value '
				+ obj.listServiceKey + ' whiel this service was for keyValue '
				+ keyValue);
		return;
	}

	field.fillList(grid, obj, keyValue, listServiceOnLoad);
	return;
};

/**
 * call back function from server agent when report service returns. this is a
 * clone of listServicereturned
 * 
 * @param obj
 *            domelement that triggered the service
 * @param fieldName
 *            that triggered the service
 * @param se
 *            serviceEntry that has all details on the server call
 */
var reportServiceReturned = function(obj, fieldName, se) {
	debug('reportServiceReturned() for object=' + obj + ' with field name '
			+ fieldName);

	var P2 = se.win.P2;
	var grids = se.dc.grids;
	if (fieldName) {
		var field = P2.getField(fieldName);
		for ( var gridName in grids) {
			if (gridName.indexOf(field.reportServiceId) >= 0) {
				field.fillReport(grids[gridName], obj);
				return;
			}
		}
		debug("design error: " + field.name + ' asked for a list service = '
				+ field.listServiceId
				+ ' but the dc did not have a grid starting with that name');
		return;
	}
	// it is a generic one. go thru p2.
	P2.fillReport(grids);
};

/**
 * get window object for a window name. This is used if we assign a logical name
 * to a window at the time of navigation action, and later want to refer to
 * that. than a method on P2
 * 
 * @param windowName
 *            logical name assigned the window
 * @returns window object, or null
 */
a.getWindow = function(windowName) {
	var win = PM.exilityPageStack.activeWindows[windowName];
	if (!win || win.closed)
		return null;
	return win;
};

/**
 * Check if any of the enclosing panel of a control is hidden, and make it
 * visible
 * 
 * @param ele
 *            to be made visible
 * @returns true of we could do it, false to say sorry :-(
 */
a.makePanelVisible = function(ele) {
	var div = ele.parentNode;
	var tag, ele;
	while (true) {
		tag = div.tagName.toUpperCase();
		if (tag == 'BODY')
			return true;

		// If it is not a hidden div, let us move up..
		if (tag != 'DIV' || div.style.display != 'none') {
			div = div.parentNode;
			continue;
		}
		// OK. It is a hidden div.
		// Is it part of a tab panel??
		ele = this.doc.getElementById(div.id + 'Tab');
		if (ele) {
			this.tabClicked(ele, div.id + 'TabsDiv');
		} else {
			// is it linked to a twistie? in a collapsible fieldset?
			ele = this.doc.getElementById(div.id + 'Twister');
			if (ele) {
				this.twist(ele, div.id);
			}
			// those are the only two things we know of. What else can we do?
			// Just make it visible
			else
				div.style.visible = '';
		}
		// Look up and see if the parent is visible..
		div = div.parentNode;
	}
	return true;
};

/**
 * reload this window
 */
a.reload = function(scrollLeft, scrollTop) {
	if (this.reloadActionName) {
		window.scrollTo(0, 0);
		this.actions[this.reloadActionName].act();
		return;
	}

	window.scrollTo(scrollLeft, scrollTop);
};

/**
 * set local date format on the client. This is done by default based on
 * parameters in exilParms. This API allows you to change to at any time. You
 * may provide such an option to user
 * 
 * @param format
 *            'dmy', 'ymd', or 'dmy'
 * @param separator
 *            date separator '-' or '/'
 * @returns true if we could do it, false otherwise
 */
a.setLocalDateFormat = function(format, separator) {
	if (PM.setDateFormat(format, separator))
		return true;
	message(
			format
					+ ' is not a valid date format. Specify one of ddmmyy ddmmmyy ddmmyyyy or mmddyy',
			"Warning", "Ok", null, null, null);
	return false;
};

/**
 * make a fields collection out of a query string of a url
 */
var queryFieldsToCollection = function(qryStr) {
	debug('going to make a collection out of qry string = ' + qryStr);
	var fields = {};
	if (!qryStr)
		return fields;
	if (qryStr.substr(0, 1) == '?')
		qryStr = qryStr.substr(1);

	var pairs = qryStr.split('&');
	var i, pair;
	for (i = 0; i < pairs.length; i++) {
		pair = pairs[i].split('=');
		if (pair.length != 2) {
			debug('invalid pair found in query string : ' + pairs[i]);
			continue;
		}
		fields[pair[0]] = unescape(pair[1]);
	}
	return fields;
};

/**
 * put a cover on the page
 */
var coverPage = function(coverStyle, imgStyle, otherStyle) {
	// TODO: do not show this for code/date picker
	var loadingEle = document.getElementById('loading');
	if (loadingEle)
		loadingEle.style.display = '';

	if (imgStyle) {
		// alert('going yo cover page');
		imgStyle.width = mainBody.scrollWidth + 'px';
		imgStyle.height = mainBody.scrollHeight + 'px';
	}
	if (coverStyle) {
		coverStyle.display = '';
	}
	if (otherStyle)
		otherStyle.display = '';
};

/**
 * remove cover from the page
 */
var uncoverPage = function(coverStyle, otherStyle, imgStyle) {
	if (imgStyle)
		imgStyle.display = 'none';
	// TODO: do not show this for code/date picker
	var loadingEle = document.getElementById('loading');
	if (loadingEle)
		loadingEle.style.display = 'none';
	// alert('going to uncover page');
	if (coverStyle)
		coverStyle.display = 'none';
	// style.zIndex = -1;
	if (otherStyle) {
		otherStyle.display = 'none';
	}
};

var ObjectToValidate = function(field, obj) {
	this.obj = obj;
	this.field = field;
	this.timer = null;
};

// for Combo. Refer to common.combo.htm and common/comboTest.htm
a.getComboUrl = function(obj, val, fieldName) {
	var field = this.fields[fieldName];
	var url;
	if (exilParms.useLocalData || !this.win.location.host
			|| localServices[field.descServiceId])
		url = exilParms.localData + field.descServiceId.replace(/\./g, '/')
				+ '.js';
	else
		url = exilParms.comboServiceName;
	url += '?serviceId=' + field.descServiceId;
	var qry = this.makeQueryString(field.descQueryFields,
			field.descQueryFieldSources, null, field.validateQueryFields,
			field.name);
	if (qry == false)
		return null;
	if (qry)
		url += '&' + qry;
	return url;
};
/**
 * triggered on focus out from an input field
 * 
 * @param obj
 *            dom element
 * @param fieldName
 */
a.inputFocusOut = function(obj, fieldName) {
	debug(fieldName + ' lost focus');
	if (exilComboWin)
		exilComboWin.inputFocusOut();
	var field = this.fields[fieldName];
	/*
	 * has programmer asked for onblur function?
	 */
	if (field.blurred) {
		if (field.blurred(obj) == false) // flase means do not proceed
		{
			return;
		}
	}

	if (field.isChanged(obj))
		this.fieldChanged(obj, fieldName);

	if (field.onBlurActionName)
		this.act(obj, fieldName, field.onBlurActionName, null);
};

/**
 * used as event handler onkey up in combo field
 * 
 * @param ele
 *            dom element
 * @param fieldName
 * @param e
 *            event object
 */
a.inputKeyUp = function(ele, fieldName, e) {
	if (e.keyCode == 122) {
		if (ele) {
			ele = ele.nextSibling;
			if (ele && ele.nodeType == '3')
				ele = ele.nextSibling;
			if (ele.onmousedown)
				ele.onmousedown();
		}
		return;
	}

	var field = this.fields[fieldName];
	if (!field) {
		debug('invalid field name supplied to inputKeyUp ' + fieldName);
		return;
	}

	/*
	 * do we have to fire inputKeyUp for compbo?
	 */
	if (!field.descServiceId || !exilComboWin)
		return;
	if (field.minCharsToTriggerService) {
		var charsEntered = 0;
		if (ele && ele.value)
			charsEntered = ele.value.trim().length;
		if (charsEntered < field.minCharsToTriggerService)
			return;
	}

	exilComboWin.inputKeyUp(ele, e, this.win, fieldName);
};

/**
 * call combo service
 * 
 * @param obj
 *            dom element of combo field
 * @param fieldName
 *            of combo field
 * @param val
 *            current value in the combo field
 */
a.comboCall = function(obj, fieldName, val) {
	var field = this.fields[fieldName];
	var dc = new DataCollection();
	// Passing the value to fillDcFromQueryFields for repeating columns.
	if (this.fillDcFromQueryFields(dc, field.descQueryFields,
			field.descQueryFieldSources, null, field.validateQueryFields, val,
			fieldName)) {
		dc.values[field.unqualifiedName] = val;

		var n = field.descQueryFields.length;
		for ( var i = 0; i < n; i++) {
			var newfieldname = field.descQueryFieldSources[i];
			if (newfieldname == field.name) {
				if ((dc.values[field.descQueryFields[i]] == "")
						|| (dc.values[field.descQueryFields[i]] != val))
					dc.addValue(field.descQueryFields[i], val);
			}
		}

		var se = new ServiceEntry(field.descServiceId, dc, false,
				comboReturned, obj, field.name, ServerAction.NONE, false,
				false, field.fieldToFocusAfterExecution);
		se.keyValue = val;
		this.win.serverStub.callService(se);
	}
};

var comboReturned = function(obj, fieldName, se) {
	var data = se.dc.grids[se.serviceId];
	exilComboWin.comboProcess(data, obj, se.keyValue);
};

a.treeViewExpandCollapseRow = function(objImg, tableName, columnName) {
	var table = this.tables[tableName];
	table.treeViewExpandCollapseRow(objImg, columnName);
};

a.treeViewSelectDeselectRow = function(objChk, tableName, columnName) {
	var table = this.tables[tableName];
	table.treeViewSelectDeselectRow(objChk, columnName);
};

a.bulkDeleteClicked = function(obj, tableName) {
	var table = this.tables[tableName];
	table.bulkDeleteClicked(obj);
};

a.bulkCheckClicked = function(obj, tableName, columnName) {
	var table = this.tables[tableName];
	table.bulkCheckClicked(obj, columnName);
};

a.treeViewBulkSelectDeselectRow = function(objChk, tableName, columnName) {
	var table = this.tables[tableName];
	table.treeViewBulkSelectDeselectRow(objChk, columnName);
};

a.xmlNodeClicked = function(li, fieldName) {
	this.fields[fieldName].changeVisibility(li, null, false);
};

a.xmlTreeExpandAll = function(fieldName) {
	this.fields[fieldName].changeVisibility(null, true, true);
};

a.xmlTreeCollapseAll = function(fieldName) {
	this.fields[fieldName].changeVisibility(null, false, true);
};

/**
 * @deprecated
 * @param obj
 * @param tableName
 * @param fieldName
 */
a.columnClicked = function(obj, tableName, fieldName) {
	/*
	 * used to sort. funcitonality disabled, but we have reteined the funciton
	 */
};

/**
 * mark columns for hide/show.
 * 
 * @param tableName
 * @param columnNames
 *            comma separated list of columns to be shown/hidden
 * @param displayLists
 *            comma separated list of show/hide corresponding to column names
 */
a.hideOrShowColumns = function(tableName, columnNames, displayLists) {
	var table = this.tables[tableName];
	if (!table || !columnName || !displayLists) {
		debug('hideOrShowColumns called with imporper parameters.');
		return;
	}
	table.columnName = columnNames.split(";");
	table.displayList = displayLists.split(";");
	table.hideOrShowColumns();
};

/**
 * find th enext field, as perceived by user, and shift focus to that. This is
 * just a guess, and may not work always.
 * 
 * @param field
 *            current field that is active
 * @param currentEle
 *            current dom element
 * @returns dom element being focussed, or null if we could not do that
 */
// move the focus to next field
a.focusNext = function(field, currentEle) {
	if (currentEle && currentEle.blur) {
		currentEle.blur();
	}
	var seqNo;

	// if this is a field inside a table, we should try and move inside the
	// table
	if (field.table && field.table.focusNext) {
		var obj = field.table.focusNext(field, currentEle);
		if (obj == null) // some issue, unable to move
			return null;

		if (obj.gotFocussed)
			return obj.ele;

		// no field to move inside this table. We should move to field next to
		// the table
		seqNo = obj.ele.seqNo;
	} else
		seqNo = field.seqNo;

	if (!seqNo && seqNo !== 0) {
		return null;
	}

	// I am looping to wrap-back after the last field.
	var ele = null;
	var eleName = null;
	var nbrFields = this.fieldNames.length;
	for ( var i = seqNo + 1; i !== seqNo; i++) {
		if (i == nbrFields) // we crossed the last field
		{
			/*
			 * is there a defualt button that we can focus on?
			 */
			if (this.defaultButtonName) {
				eleName = this.defaultButtonName;
				ele = this.doc.getElementById(this.defaultButtonName);
				break;
			}
			/**
			 * alright. let us wrap to first field..
			 * 
			 */
			i = -1;
		} else {
			field = this.fields[this.fieldNames[i]];
			if (field && field.isEditable) {
				eleName = field.name;
				if (field.table)
					eleName = field.table.getObjectId(eleName);
				ele = this.doc.getElementById(field.name);
				if (!ele) {
					debug("Error:" + eleName
							+ " has no HTML element. Field is sjipped.");
				} else if (!ele.disabled && !ele.readonly) {
					break;
				}
			}
		}
	}

	if (!ele) {
		debug('Unable to find another field after ' + field.name
				+ ' to shit its focus from '
				+ (currentEle ? currentEle.id : 'it'));
		return;
	}
	try {
		if (ele.focus)
			ele.focus();
		if (ele.select)
			ele.select();
	} catch (e) {
		debug('focus COULD NOT BE shifted to ' + ele.id + '. Error: ' + e
				+ ". Will blur from this field at least.");
	}
	return ele;
};

/**
 * wrapper provided before closure was popular to keep associated variables with
 * a function. This utility allows you to supply the object and the funciton
 * name as event handler.
 * 
 * @param ele
 *            dom element to which the event is to be attached
 * @param eventNameWithoutOn
 *            name of event
 * @param callBackObject
 *            object to be used as call back
 * @param fName
 *            funciton/method name on the callBackObject to be used. That is,
 *            acllBackObject.fName()
 * @returns an integer that is to be used to remove the listener once you are
 *          done
 * 
 */
a.addListener = function(ele, eventNameWithoutOn, callBackObject, fName) {
	// keep all required info as attributes of an object.
	// note that P2 will point to 'this' in the window the element is used.
	var idx = this.nextListenerId;
	if (idx) {
		this.nextListenerId++;
	} else {
		/*
		 * first tim einitialization
		 */
		idx = 0;
		this.nextListenerId = 1;
		this.eventListeners = {};
	}

	var fn = this.win.getEventFunction(idx, fName);
	var newObj = {
		idx : idx,
		obj : callBackObject,
		ele : ele,
		name : eventNameWithoutOn,
		fn : fn
	};
	this.eventListeners[idx] = newObj;

	if (ele.addEventListener) {
		ele.addEventListener(eventNameWithoutOn, fn, false);
	} else {
		ele.attachEvent('on' + eventNameWithoutOn, fn);
	}
	return idx;
};

/**
 * remove a listener that was attached earlier
 * 
 * @param idx
 *            associated with this listener, and was returned on a call to
 *            addListener()
 */
a.removeListener = function(idx) {
	var obj = this.eventListeners && this.eventListeners[idx];
	if (!obj) {
		debug('design Error: '
				+ idx
				+ ' is supplied for removing an event listener, but no event listener is available with that idx');
		return;
	}
	if (obj.ele.removeEventListener) {
		obj.ele.removeEventListener(obj.name, obj.fn, false);
	} else {
		obj.ele.detachEvent('on' + obj.name, obj.fn);
	}
	delete this.eventListeners[idx];
};
// xml tree routines /////
var Node =
{
	ELEMENT_NODE                :  1,
	ATTRIBUTE_NODE              :  2,
	TEXT_NODE                   :  3,
	CDATA_SECTION_NODE          :  4,
	ENTITY_REFERENCE_NODE       :  5,
	ENTITY_NODE                 :  6,
	PROCESSING_INSTRUCTION_NODE :  7,
	COMMENT_NODE                :  8,
	DOCUMENT_NODE               :  9,
	DOCUMENT_TYPE_NODE          : 10,
	DOCUMENT_FRAGMENT_NODE      : 11,
	NOTATION_NODE               : 12
};


var hideSourceTree = function (sourceTreeName, gridName) {
    var sourceEle = document.getElementById(sourceTreeName);
    var gridEle = document.getElementById(gridName);
    
    if(sourceEle.style.display != 'none')
    {
        sourceEle.style.display = 'none';
        sourceEle.style.width = '0%';
        gridEle.style.width = '99%';
    }
    else
    {
        gridEle.style.width = '69%';
        sourceEle.style.display = 'block';
        sourceEle.style.width = '30%';
    }
};

var hideAttributeGrid = function (attributeGridName, nameGridName) {
    var attributeEle = document.getElementById(attributeGridName);
    var nameEle = document.getElementById(nameGridName);
    
    if(attributeEle.style.display != 'none')
    {
        attributeEle.style.display = 'none';
        attributeEle.style.width = '0%';
        nameEle.style.width = '99%';
    }
    else
    {
        nameEle.style.width = '30%';
        attributeEle.style.display = 'block';
        attributeEle.style.width = '69%';
    }
};

var toggleDocStructure = function (docStructureName)
{
    var docStructureLabelEle = document.getElementById(docStructureName + 'Label');
    var docStructureEle = document.getElementById(docStructureName);
    if(docStructureLabelEle.style.display != 'none')
    {
        docStructureLabelEle.style.display = 'none';
        docStructureEle.style.display = 'none';
    }
    else
    {
        docStructureLabelEle.style.display = 'block';
        docStructureEle.style.display = 'block';
    }
};

var toggleGrid = function (gridName, noOfVisibleColumns, divName)
{
    var gridEle = document.getElementById(gridName);
    var numOfRows = gridEle.rows.length;
    var numOfCells = gridEle.rows[0].cells.length;
    var styleValue = "";

    if(noOfVisibleColumns >= numOfCells)
    {
        return;
    }

    if(gridEle.tHead.rows[0].cells[noOfVisibleColumns].style.display != 'none')
    {
        styleValue = 'none';
    }
    else
    {
        styleValue = 'block';
    }

    for(var j = noOfVisibleColumns; j < numOfCells; j++)
    {
        var curCellEle = gridEle.tHead.rows[0].cells[j];
        curCellEle.style.display = styleValue;
    }
    
    for(var i = 0; i < numOfRows; i++)
    {
        for(var j = noOfVisibleColumns; j < numOfCells; j++)
        {
            var curCellEle = gridEle.rows[i].cells[j];
            curCellEle.style.display = styleValue;
        }
    }

};

var toggleAttributeGrid = function (attributeGridName)
{
    var attributeGridEle = document.getElementById(attributeGridName);
    var displayWidth = null;
    if((attributeGridEle.style.marginLeft == "") || (parseInt(attributeGridEle.style.marginLeft) == 0))
    {
        displayWidth = attributeGridEle.offsetWidth;
        attributeGridEle.style.marginLeft = "0px";
    }
    else
    {
        displayWidth = parseInt(attributeGridEle.style.marginLeft);        
    }
    if(displayWidth < 0)
    {
        setTimeout("slideOutGrid('" + attributeGridName + "', '0')", 0);
    }
    else
    {
        setTimeout("slideInGrid('" + attributeGridName + "', '" + displayWidth + "')", 0);
    }
};

var slideInGrid = function (gridName, width)
{
    var attributeGridEle = document.getElementById(gridName);
    var currentWidth = parseInt(attributeGridEle.style.marginLeft);
    var finalWidth = (-1 * parseInt(width));
    if(currentWidth > finalWidth)
    {
        currentWidth -= 6;
        if(currentWidth < finalWidth)
            currentWidth = finalWidth;
        attributeGridEle.style.marginLeft = currentWidth + "px";
        setTimeout("slideInGrid('" + gridName + "', '" + width + "')", 0);
    }
};

var slideOutGrid = function (gridName, width)
{
    var attributeGridEle = document.getElementById(gridName);
    var currentWidth = parseInt(attributeGridEle.style.marginLeft);
    var finalWidth = parseInt(width);
    if(currentWidth < finalWidth)
    {
        currentWidth += 6;
        if(currentWidth > finalWidth)
            currentWidth = finalWidth;
        attributeGridEle.style.marginLeft = currentWidth + "px";
        setTimeout("slideOutGrid('" + gridName + "', '" + width + "')", 0);
    }
};

var slideInTree = function (treeName, width)
{
    var treeEle = document.getElementById(treeName);
    var currentWidth = parseInt(treeEle.style.width);
    var finalWidth = parseInt(width);
    if(currentWidth > finalWidth)
    {
        currentWidth -= 6;
        if(currentWidth < finalWidth)
            currentWidth = finalWidth;
        treeEle.style.width = currentWidth + "px";
        setTimeout("slideInTree('" + treeName + "', '" + width + "')", 0);
    }
};

var slideOutTree = function (treeName, width)
{
    var treeEle = document.getElementById(treeName);
    var currentWidth = parseInt(treeEle.style.width);
    var finalWidth = parseInt(width);
    if(currentWidth < finalWidth)
    {
        currentWidth += 6;
        if(currentWidth > finalWidth)
            currentWidth = finalWidth;
        treeEle.style.width = currentWidth + "px";
        setTimeout("slideOutTree('" + treeName + "', '" + width + "')", 0);
    }
};


var toggleXMLTree = function (xmlTreeName)
{
    var xmlTreeEle = document.getElementById(xmlTreeName);
    var wrapperEle = document.getElementById(xmlTreeName + 'DivWrapper');
    var displayWidth = null;
    if(wrapperEle.style.width == "")
    {
        displayWidth = parseInt(xmlTreeEle.style.width);
        wrapperEle.style.width = (displayWidth + 2) + "px";
    }
    else
    {
        displayWidth = parseInt(wrapperEle.style.width);
    }
    
    if(displayWidth > 0)
    {
        setTimeout("slideInTree('" + xmlTreeName + "DivWrapper', '0')", 0);
    }
    else
    {
        setTimeout("slideOutTree('" + xmlTreeName + "DivWrapper', '" + (parseInt(xmlTreeEle.style.width) + 2) + "')", 0);
    }
};



ExilityPage.prototype.slidePanel = function (obj, panelName, slideFrom)
{
    var sliderPanel = this.doc.getElementById(panelName + 'Slider' + obj.getAttribute('key'));
    if (sliderPanel)
        panelName = panelName + obj.getAttribute('key');
    if (slideFrom == 'right')
        this.toggleSlideLeft(panelName);
    else if (slideFrom == 'left')
        this.toggleSlideRight(panelName);
};

ExilityPage.prototype.toggleSlideLeft = function (tableName)
{
    var tableDivEle = this.doc.getElementById(tableName + 'Container');
    if (!tableDivEle)
        tableDivEle = this.doc.getElementById(tableName);

    var displayWidth = null;
    if ((tableDivEle.style.marginLeft == "") || (parseInt(tableDivEle.style.marginLeft) == 0))
    {
        displayWidth = tableDivEle.offsetWidth;
        tableDivEle.style.marginLeft = "0px";
    }
    else
    {
        displayWidth = parseInt(tableDivEle.style.marginLeft);
    }
    if (displayWidth < 0)
    {
        this.win.setTimeout("P2.slideOutLeft('" + tableName + "', '0')", 0);
    }
    else
    {
        this.win.setTimeout("P2.slideInLeft('" + tableName + "', '" + displayWidth + "')", 0);
    }
};

ExilityPage.prototype.slideInLeft = function (tableName, width)
{
    var tableEle = this.doc.getElementById(tableName + 'Container');
    if (!tableEle)
        tableEle = this.doc.getElementById(tableName);
    var currentWidth = parseInt(tableEle.style.marginLeft);
    var finalWidth = (-1 * parseInt(width));
    if (currentWidth > finalWidth)
    {
        currentWidth -= 6;
        if (currentWidth <= finalWidth)
        {
            currentWidth = finalWidth;
            tableEle.style.display = 'none';
        }
        tableEle.style.marginLeft = currentWidth + "px";
        this.win.setTimeout("P2.slideInLeft('" + tableName + "', '" + width + "')", 0);
    }
};

ExilityPage.prototype.slideOutLeft = function (tableName, width)
{
    var tableEle = this.doc.getElementById(tableName + 'Container');
    if (!tableEle)
        tableEle = this.doc.getElementById(tableName);
    var currentWidth = parseInt(tableEle.style.marginLeft);
    var finalWidth = parseInt(width);
    if (currentWidth < finalWidth)
    {
        currentWidth += 6;
        if (currentWidth >= finalWidth)
        {
            currentWidth = finalWidth;
        }
        tableEle.style.marginLeft = currentWidth + "px";
        this.win.setTimeout("P2.slideOutLeft('" + tableName + "', '" + width + "')", 0);
        tableEle.style.display = 'block';
    }
};

ExilityPage.prototype.toggleSlideRight = function (tableName)
{
    var tableEle = this.doc.getElementById(tableName + 'Container');
    var wrapperEle = this.doc.getElementById(tableName + 'Wrapper');

    if (!wrapperEle)
        wrapperEle = this.doc.getElementById(tableName);
    else
        tableName = tableName + 'Wrapper';

    var displayWidth = null;
    if (wrapperEle.style.width == "")
    {
        wrapperEle.storeWidth = wrapperEle.offsetWidth + 2;
        if (tableEle)
            displayWidth = parseInt(tableEle.style.width);
        else
            displayWidth = parseInt(wrapperEle.style.width);
        wrapperEle.style.width = (wrapperEle.offsetWidth + 2) + "px";
    }
    else
    {
        displayWidth = parseInt(wrapperEle.style.width);
        if (displayWidth > 0)
            wrapperEle.storeWidth = displayWidth;
    }

    if (displayWidth > 0)
    {
        this.win.setTimeout("P2.slideInRight('" + tableName + "', '0')", 0);
    }
    else
    {
        this.win.setTimeout("P2.slideOutRight('" + tableName + "', '" + parseInt(wrapperEle.storeWidth) + "')", 0);
    }
};

ExilityPage.prototype.slideInRight = function (tableName, width)
{
    var tableEle = this.doc.getElementById(tableName);
    var currentWidth = parseInt(tableEle.style.width);
    var finalWidth = parseInt(width);
    if (currentWidth > finalWidth)
    {
        currentWidth -= 6;
        if (currentWidth <= finalWidth)
        {
            currentWidth = finalWidth;
            tableEle.style.display = 'none';
        }
        tableEle.style.width = currentWidth + "px";
        this.win.setTimeout("P2.slideInRight('" + tableName + "', '" + width + "')", 0);
    }
};

ExilityPage.prototype.slideOutRight = function (tableName, width)
{
    var tableEle = this.doc.getElementById(tableName);
    var currentWidth = parseInt(tableEle.style.width);
    var finalWidth = parseInt(width);
    if (currentWidth < finalWidth)
    {
        currentWidth += 6;
        if (currentWidth >= finalWidth)
            currentWidth = finalWidth;
        tableEle.style.width = currentWidth + "px";
        this.win.setTimeout("P2.slideOutRight('" + tableName + "', '" + width + "')", 0);
        tableEle.style.display = 'block';
    }
};
/**
 * @module validation utility. Data type is the primary basis of validation. We
 *         implement data type class hierarchy and provide .validate() method
 *         accordingly
 */
var AbstractDataType = function ()
{   
    //
};
AbstractDataType.TEXT = 'TEXT';
AbstractDataType.INTEGRAL = 'INTEGRAL';
AbstractDataType.DECIMAL = 'DECIMAL';
AbstractDataType.BOOLEAN = 'BOOLEAN';
AbstractDataType.DATE = 'DATE';
AbstractDataType.TIMESTAMP = 'TIMESTAMP';

a = AbstractDataType.prototype;

/**
 * abstract method, would be over ridden by specific data types
 * 
 * @param fromVal
 * @param toVal
 * @param showAlternateMessage
 *            Customization for a project that insisted that they would like to
 *            see different message for from-to and to-from
 * @param fromLabel
 * @param toLabel
 * @throws ExilityError
 *             in case of validation failure
 */
a.validateFromTo = function(fromVal, toVal, showAlternateMessage, fromLabel, toLabel){
    if(fromVal && toVal && (fromVal > toVal)){
        if(showAlternateMessage){
            throw new ExilityError("exilityInvalidToFrom", fromVal, toVal, fromLabel, toLabel);}
        throw new ExilityError("exilityInvalidFromTo", fromVal, toVal, fromLabel, toLabel);
    }
};

/**
 * abstract method, would be over ridden by specific data types
 * 
 * @param val
 *            value to be validated
 * @param msg
 *            error message or id
 * @returns possibly formatted value. Hence caller should use this as the value
 */
a.validateSpecifics = function(val, msg)
{
	return val;
};

// abstract method, would be over ridden by specific data types
a.evaluateShortCuts = function(val){
	return val;	
};

a.validate = function (val, msg){
    val = String(val);
    if (this.regex){
        var vals = val.split('\n');
        for (var i = 0; i < vals.length; i++){
            var v = vals[i];
            var matched_array = v.match(this.regex);
            if (!matched_array || (matched_array[0] != v)) {
                if (!msg)
                    msg = this.messageName;
                if (exilParms.showSeparateErrorIfRegexFails){
                    if (!msg){
                        msg = this.messageName + 'Regex';
                    }
                    var regexString = "" + this.regex + "";
                    regexString = regexString.replace(/^\//, '');
                    regexString = regexString.replace(/^\^/, '');
                    regexString = regexString.replace(/\/$/, '');
                    regexString = regexString.replace(/\$$/, '');

                    eval("v = val.replace(/" + regexString + "/ig,'');");
                    v = v.split('').sort().join(',');
                    while (/\s*([^,]+),\s*\1(?=,|$)/.test(v)){
                        v = v.replace(/\s*([^,]+),\s*\1(?=,|$)/g, "$1");
                }
                    v = "'" + v.replace(/,/g, "','") + "'";
                }
                throw new ExilityError(msg, v);
            }
        }
    }
    return this.validateSpecifics(val, msg);
};

a.formatIn = function(val){
    return val;
};

a.formatOut = function(val){
    return val;
};
// internal value format, like date
a.clientObject = function(val){
    return val;
};

var TextDataType = function (nam, messageName, regex, minLength, maxLength){
	AbstractDataType.call(this);

	this.basicType = AbstractDataType.TEXT;
	this.name = nam;
	this.messageName = messageName;
	this.regex = regex;
	this.minLength = minLength;
	this.maxLength = maxLength;
};

TextDataType.prototype = new AbstractDataType;

TextDataType.prototype.validateSpecifics = function(val, msg){
	if ((val.length < this.minLength) || 
	    ( this.maxLength && (val.length > this.maxLength))  ){
		throw new ExilityError(msg || this.messageName, val, val.length);
	}
	return val;
};

var negativeIntegerRegex = /^[+-]?\d*$/;
var positiveIntegerRegex = /^\d*$/;
var IntegralDataType = function (nam, messageName, minValue, maxValue, allowNegativeValue)
{
    AbstractDataType.call(this);

	this.basicType = AbstractDataType.INTEGRAL;
	this.name = nam;
	this.messageName = messageName;
	this.minValue = minValue;
	this.maxValue = maxValue;
	this.allowNegativeValue = allowNegativeValue;
	this.regex = (this.allowNegativeValue) ? negativeIntegerRegex : positiveIntegerRegex ;
};

IntegralDataType.prototype = new AbstractDataType;

IntegralDataType.prototype.validateSpecifics = function(val, msg)
{
	var nbr = parseFloat(val);
	
	if( (this.maxValue != null && this.maxValue < nbr) ||
	    (this.minValue != null && this.minValue > nbr) )
	{
		throw new ExilityError(msg || this.messageName, val);
	}
	return val;
};

IntegralDataType.prototype.validateFromTo = function(fromVal, toVal, showAlternateMessage, fromLabel, toLabel)
{
    var n1 = parseInt(fromVal.replace(/,/g, ''),  10);
    var n2 = parseInt(toVal.replace(/,/g, ''), 10);
    if (isNaN(n1) || isNaN(n2)) return;
    if (n1 > n2)
    {
        if(showAlternateMessage)
            throw new ExilityError("exilityInvalidToFrom", fromVal, toVal, fromLabel, toLabel);
        
        throw new ExilityError("exilityInvalidFromTo", fromVal, toVal, fromLabel, toLabel);
    }
};

IntegralDataType.prototype.clientObject = function(val)
{
	if(val.replace)
		val = val.replace(/,/g, '');
    return parseInt(val, 10);
};

var negativeDecimalRegex = /^[+-]?\d*\.?\d{1,}$/;
var positiveDecimalRegex = /^\d*\.?\d{1,}$/;
var DecimalDataType = function(nam, messageName, minValue, maxValue,allowNegativeValue,numberOfDecimals)
{
    AbstractDataType.call(this);

	this.basicType = AbstractDataType.DECIMAL;
	this.name = nam;
	this.messageName = messageName;
	this.numberOfDecimals = numberOfDecimals;
	this.minValue = minValue;
	this.maxValue = maxValue;
	this.allowNegativeValue = allowNegativeValue;
	// parseFloat() parses an input '12.45xyz' without error, taking only 12.45
	// So regex is required for validation.
	this.regex = (this.allowNegativeValue) ? negativeDecimalRegex : positiveDecimalRegex;
};
DecimalDataType.prototype = new AbstractDataType;

DecimalDataType.prototype.validateSpecifics = function(val, msg)
{
	
	// debug("DecimalDataType.validateSpecifics("+val+")....");
	if(val == "") return val;
	var nbr = parseFloat(val);
	
	if( (this.maxValue != null && this.maxValue < nbr) ||
	    (this.minValue != null && this.minValue > nbr) )
	{
		throw new ExilityError(msg || this.messageName, val);
	}
	// OK, it is valid. but are we supposed to format it?
	return this.formatIn(nbr);
};

DecimalDataType.prototype.validateFromTo = function(fromVal, toVal, showAlternateMessage, fromLabel, toLabel)
{
    var d1 = parseFloat(fromVal);
    var d2 = parseFloat(toVal);
    if (isNaN(d1) || isNaN(d2)) return;
   if (d1 > d2)
    {
        if(showAlternateMessage)
            throw new ExilityError("exilityInvalidToFrom", fromVal, toVal, fromLabel, toLabel);
        throw new ExilityError("exilityInvalidFromTo", fromVal, toVal, fromLabel, toLabel);
    }
};

DecimalDataType.prototype.formatIn = function(nbr)
{
	var len;
	if(this.numberOfDecimals == 0)
		return new String(Math.round(nbr));
    
    var multiplier =  Math.pow(10, this.numberOfDecimals);
	nbr = Math.round(nbr*multiplier)/multiplier;
	var currentDecimals = 0;
    var val;
	if(nbr == 0)
	    val = new String("0.");
	else
	{
	    val = new String(nbr);
	    len = val.length;
	    var decimalAt = val.indexOf('.');
	    if(decimalAt >= 0)
	       currentDecimals = len - decimalAt - 1;
	    else
	        val = val.concat('.');
	}
	len = this.numberOfDecimals - currentDecimals;
	while(len-- > 0)
	{
		val = val.concat('0');
	}
	return val;
};

DecimalDataType.prototype.clientObject = function(val)
{
    return parseFloat(val.replace(/,/g, ''));
};

var BooleanDataType = function(nam, messageName, trueValue, falseValue)
{
    AbstractDataType.call(this);

	this.basicType = AbstractDataType.BOOLEAN;	
	this.name = nam;
	this.messageName = messageName;
	this.trueValue = trueValue;
	this.falseValue = falseValue;
};

BooleanDataType.prototype = new AbstractDataType;
BooleanDataType.prototype.allTrueValues = ['1', 1, 'y', 'Y', 'true', 'TRUE', 'True', 'yes', 'YES', 'Yes'];
BooleanDataType.prototype.nbrTrues = BooleanDataType.prototype.allTrueValues.length;
BooleanDataType.prototype.allFalseValues =['0', 0, 'n','N','false', 'FALSE', 'false', 'no', 'No', 'No'];
BooleanDataType.prototype.nbrFalses = BooleanDataType.prototype.allFalseValues.length;
BooleanDataType.prototype.basicType = AbstractDataType.BOOLEAN;

BooleanDataType.prototype.validateSpecifics = function (val, msg)
{
    if (this.trueValue == val || this.falseValue == val)
        return val;
    
    for (var i = 0; i < this.nbrTrues; i++)
    {
        if (this.allTrueValues[i] == val)
            return val;
    }
    
    for (var i = 0; i < this.nbrFalses; i++)
    {
        if (this.allFalseValues[i] == val)
            return val;
    }
    throw new ExilityError(msg || this.messageName, val);
};

var DateDataType = function(nam, messageName, maxDaysBeforeToday, maxDaysAfterToday, includesTime)
{
    AbstractDataType.call(this);

	this.basicType = AbstractDataType.DATE;
	this.name = nam;
	this.messageName = messageName;
	this.maxDaysBeforeToday = maxDaysBeforeToday;
	this.maxDaysAfterToday = maxDaysAfterToday;
	this.includesTime = includesTime; // currently not used.
};

DateDataType.prototype = new AbstractDataType;

// Dec 29 2009 : Bug 826 - Display different messages during date validate (one
// for toField, one for fromField) - Exis (Start)
DateDataType.prototype.validateFromTo = function(fromVal, toVal, showAlternateMessage, fromLabel, toLabel)
{
    if(this.includesTime)
    {
        this.validateDateTimeFromTo(fromVal, toVal, showAlternateMessage);
        return
    }
    var d1 = parseDate(fromVal);
    var d2 = parseDate(toVal);
    if(d1 && d2 && d1 > d2)
    {
    	if(showAlternateMessage)
            throw new ExilityError('exilityInvalidToFrom', fromVal, toVal, formLabel, toLabel);
        throw new ExilityError('exilityInvalidFromTo', fromVal, toVal, formLabel, toLabel);
    }
};

DateDataType.prototype.validateDateTimeFromTo = function(fromVal, toVal, showAlternateMessage, formLabel, toLabel)
{
    var val, timePart, d1, d2;
    var h1 = 0, h2 = 0, m1 = 0, m2 = 0, s1 = 0, s2 = 0;
    
    val = this.seperateTimeFromDate(fromVal);
    fromVal = val[0];
    if(val.length > 1)
    {
        timePart = val[1].split(':');
        h1 = timePart[0];
        m1 = timePart[1];
        s1 = timePart[2];
    }
    
    val = this.seperateTimeFromDate(toVal);
    toVal = val[0];
    if(val.length > 1)
    {
        timePart = val[1].split(':');
        h2 = timePart[0];
        m2 = timePart[1];
        s2 = timePart[2];
    }
    
    d1 = parseDate(fromVal);
    d2 = parseDate(toVal);
    if(d1 && d2 && h1 && h2 && m1 && m2 && s1 && s2 && ((d1 > d2) || ((d1 >= d2) && (h1 > h2)) || ((d1 >= d2) && (h1 >= h2) && (m1 > m2)) || ((d1 >= d2) && (h1 >= h2) && (m1 >= m2) && (s1 > s2))))
    {
        if(showAlternateMessage)
            throw new ExilityError("exilityInvalidToFrom", fromVal, toVal, formLabel, toLabel);
        throw new ExilityError("exilityInvalidFromTo", fromVal, toVal, formLabel, toLabel);
    }
};

DateDataType.prototype.seperateTimeFromDate = function(dateValue)
{
    return dateValue.split(' ');
};

DateDataType.prototype.validateSpecifics = function (val, msg)
{
    if (!msg)
        msg = this.messageName;
    var dat = this.includesTime ? parseDateTime(val) : parseDate(val);
    if (dat == null)
        throw new ExilityError(msg, val);

    if (this.maxDaysBeforeToday != null || this.maxDaysAfterToday != null)
    {
        var tday;
        if (this.maxDaysBeforeToday != null)
        {
            tday = getToday(-this.maxDaysBeforeToday);
            if (dat < tday)
                throw new ExilityError(msg, val);
        }

        if (this.maxDaysAfterToday != null)
        {
            tday = getToday(this.maxDaysAfterToday);
            if (dat > tday)
                throw new ExilityError(msg, val);
        }
    }
    return this.includesTime ? formatDateTime(dat) : formatDate(dat);
};
// server format is yyyy-mm-dd. Convert that to local
DateDataType.prototype.formatIn = function (val)
{
    if (!val) return '';
    dat = evaluateDateShortCuts(val);
    if (dat)
        return formatDate(dat);

    // get rid of any time components..
    val = val.split(' ');
    var tim = val[1];
    if (tim)
        tim = tim.split('.')[0]; // get rid of fraction of seconds
    val = val[0];
    var serverParts = val.split('-');
    var localParts = new Array();
    var y = serverParts[0];
    if (exilParms.useShortYear)
        y = y.substr(2, 2);
    localParts[exilParms.yearAt] = y; // year
    var mm = serverParts[1];
    if(mm)
    {
	    if (exilParms.useMonthName)
	        mm = exilParms.monthNames[parseInt(mm, 10) - 1];
	    else if (mm.length == 1)
	        mm = '0' + mm;
    }
    localParts[exilParms.monthAt] = mm;
    var dd = serverParts[2];
    if (dd && dd.length == 1)
        dd = '0' + dd;
    localParts[exilParms.dateAt] = dd;
    val = localParts[0] + exilParms.dateSeparator + localParts[1] + exilParms.dateSeparator + localParts[2];
    if (this.includesTime && tim)
        val += ' ' + tim;
    return val;
};

DateDataType.prototype.textileFormatIn = function(val)
{
    val = val.split(' ')[0];
    var serverParts = val.split('/');
    var localParts = new Array();
    var y = serverParts[2];
    if(exilParms.useShortYear)
        y = y.substr(2,2);
    localParts[exilParms.yearAt] =  y; // year
    var mm = serverParts[0];
    if(exilParms.useMonthName)
        mm = exilParms.monthNames[parseInt(mm,10) - 1];
    localParts[exilParms.monthAt] = mm;
    localParts[exilParms.dateAt] = serverParts[1];
    return localParts[0] + exilParms.dateSeparator + localParts[1] + exilParms.dateSeparator + localParts[2];
};

DateDataType.prototype.formatOut = function(val)
{
    if(!val) return '';
    var serverParts = new Array();
    val = val.split(' ');
    var tim = val[1];
    var localParts = val[0].split(exilParms.dateSeparator);
    var y = localParts[exilParms.yearAt];
    if(y.length < 2)
        y = '0' + y;
    if(exilParms.useShortYear)
    {
        if(y < exilParms.cutOffForShortYear)
            y = '20' + y;
        else
            y = '19' + y;
    }
    serverParts[0] = y;
    var mm = localParts[exilParms.monthAt];
    if(exilParms.useMonthName)
        mm = new String(exilParms.monthIndex[mm.toLowerCase()] + 1);
    if(mm.length < 2)
        mm = '0' + mm;
    serverParts[1] = mm;
    var dd = localParts[exilParms.dateAt];
    if(dd.length < 2)
        dd = '0' + dd;
    serverParts[2] = dd;
    val = serverParts[0] + '-' + serverParts[1] + '-' + serverParts[2];
    if(this.includesTime && tim)
        val += ' ' + tim;
    return val;
};

DateDataType.prototype.clientObject = function(val)
{
    return parseDate(val);
};

DateDataType.prototype.getMinMax = function ()
{
    if (this.maxDaysBeforeToday == null && this.maxDaysAfterToday == null)
        return null;
    var minDate = this.maxDaysBeforeToday == null ? null : getToday(-this.maxDaysBeforeToday);
    var maxDate = this.maxDaysAfterToday == null ? null : getToday(this.maxDaysAfterToday);
    return { min: minDate, max: maxDate };
};

var TimeStampDataType = function(nam, messageName)
{
	AbstractDataType.call(this);
	this.basicType = AbstractDataType.TIMESTAMP;
	this.name = nam;
	this.messageName = messageName;
    this.AbstractDataType();
};

TimeStampDataType.prototype = new AbstractDataType;

TimeStampDataType.prototype.validateSpecifics = function(val, msg)
{
	return val; // validation always pass.
};

// FUTURE:
// let the page translator read the ClientMessages.xml file and
// generate one more js file with entries like:
// errorMessages[messageId] = "actual message string";
// where errorMessages[] is a global array.
ExilityError = function (messageId, val1, val2)
{
	this.messageId = messageId;
	this.val1 = val1;
	this.val2 = val2;
	var msg = PM.dataTypeMessages[this.messageId];
	
	if(!msg && exilParms.showSeparateErrorIfRegexFails)
    {
            msg = PM.dataTypeMessages[this.messageId.replace(/Regex$/,'')];
    }
	
	if(msg) // first parameter, indeed was a message id. let us substitute
			// parameter values
	{
        var val, par;
        for (var i = arguments.length - 1; i > 0; i--)
        {
            this['val' + i] = val = arguments[i];
            par = '@' + i;
            if (val == "'$'")
                msg = msg.replace(par, "'" + par + "'").replace(par, "$");
            else
                msg = msg.replace(par, val);
        }
        
    }
    else
        msg = messageId; // assume it to be actual message text
        
	this.messageText = msg;
};

ExilityError.prototype.toString = function()
{
    return this.messageText;
};

ExilityError.prototype.render = function(obj)
{
    if(!obj)
        obj = this.obj;
    
    if(this.field)
    {
        if(obj != null && this.messageText && this.messageText.length > 0 && this.messageText.charAt(0) != '\n')
            this.messageText = '\n' + this.messageText;
        
        if(exilParms.donotAddColonToErrorMessage != 'undefined' && exilParms.donotAddColonToErrorMessage)
            this.messageText = this.field.label + this.messageText;
        else
            this.messageText = this.field.label + ' : ' + this.messageText;
    }
    message(this.messageText, "Warning", "Ok", setFocus, null, null, obj,null, this.field);
};

var setFocus = function (obj)
{
    if (!obj)
        return;

    try
    {
        showPanelForSure(obj);
    }
    catch (e) { 
    	//
    }

    if (obj.focus) obj.focus();
    if (obj.select) obj.select();
};
var additionalHelpWindow = null;
var showAdditionalHelp = function(helpId)
{
	if(!additionalHelpWindow || additionalHelpWindow.closed()) 
	{
		additionalHelpWindow = window.open("additionalHelp");
		if(!additionalHelpWindow)
		{
			alert("Popup Blocker is preventing us from showing you additional help.");
			return;
		}
	}
	var src = currentActiveWindow.location.href;
	var idx = src.lastIndexOf(".htm");
	if(idx == -1)
	{
		alert("We are sorry. We are unable to locate the resource required for providing additional help.");
		return;
	}
	src = src.substring(0, idx) + ".help.htm";
	if(helpId)
		src += '#'+ helpId;
	
	additionalHelpWindow.location.href = src;
};
/**
 * @module Eixlity provides a very basic animation utility.
 */
/*
 * global array to facilitate timeOut() function. Stores elements being
 * animated. once done, they are deleted to keep this tidy.
 */
/**
 * keep track of all elements being eliminated. we keep it tidy and clean.
 */
var elementsBeingAnimated = {};

/**
 * animate an element to show or hide (fade or appear)
 * 
 * @param ele :
 *            element being animated
 * @param showOrHide
 *            {String} 'show' or 'hide'
 * @param callBackObject
 *            {Object} If you want us to call on start and end. We will call
 *            animationStarted() and animationEnded() methods on this object
 */
var animateHideAndShow = function(ele, showOrHide, callBackObject) {
	var obj = elementsBeingAnimated[ele.id];
	/*
	 * are we in the middle of animation for this element?
	 */
	if (obj) {
		/*
		 * we need to reverse the animation if required
		 */
		if (obj.showOrHide != showOrHide)
			obj.reverse(showOrHide);
		return;
	}

	obj = new Animator(ele, showOrHide, callBackObject);
	/*
	 * in case the element can not be animated..
	 */
	if (!obj.showOrHide)
		return;

	elementsBeingAnimated[ele.id] = obj;
	obj.animate();
};

// showOrHide = 'show', 'hide'.

/**
 * We have designed just one animator : appear or fade
 */
var Animator = function(ele, showOrHide, callBackObject) {
	/*
	 * our technique requires getComputedStyle
	 */
	if (!window.getComputedStyle) {
		/*
		 * no animation, but straight to the desired end-state
		 */
		ele.style.display = showOrHide == this.HIDE ? 'none' : 'block';
		return;
	}
	var win = ele.ownerDocument && ele.ownerDocument.win || window;
	var style = win.getComputedStyle(ele, null);
	// debug('computed style for ' + (ele && ele.id) + ' in ' + win.name + ' is
	// ' + style);
	this.height = parseInt(style.height);

	if (style.display == 'none') {
		if (showOrHide == this.HIDE)
			return;
		if (!this.height) {
			ele.style.display = 'block';
			style = win.getComputedStyle(ele, null);
			this.height = parseInt(style.height);
			this.width = parseInt(style.width);
			if (!this.height) {
				return;
			}
		}
	} else {
		if (showOrHide == this.SHOW)
			return;
	}

	// set required attributes for animation
	this.showOrHide = showOrHide;
	this.target = this.height;
	this.ele = ele;
	style = ele.style;
	this.styleHeight = style.height || '';
	this.styleWidth = style.width || '';
	this.ox = style.overflow;
	style.overflow = 'hidden';
	this.stepSize = Math.ceil(this.height / this.NBR_STEPS);
	this.callBackObject = callBackObject;
	// alert('height = ' + this.height + ' style ' + this.styleHeight);
};

var a = Animator.prototype;
// constants
a.SHOW = 'show';
a.HIDE = 'hide';
a.NBR_STEPS = 20;
a.DELAY = 20; // milliseconds

/**
 * carry out desired animation. Either start reducing or increasiing height
 */
a.animate = function() {
	if (this.showOrHide == this.SHOW) {
		this.ele.style.height = '1px';
		this.ele.style.display = 'block';
		this.height = 0;
		this.increase();
	} else {
		this.reduce();
	}
	if (this.callBackObject && this.callBackObject.animationStarted)
		this.callBackObject.animationStarted();
};

/**
 * reduce height, if possible, else stop animation
 */
a.reduce = function() {
	var style = this.ele.style;
	this.height = this.height - this.stepSize;
	if (this.height <= 0) {
		style.display = 'none';
		this.done();
		return;
	}

	style.height = this.height + 'px';
	this.timer = window.setTimeout('elementsBeingAnimated[\'' + this.ele.id
			+ '\'].reduce();', this.DELAY);
};

/**
 * increase height, if required. else end animation
 */
a.increase = function() {
	var style = this.ele.style;
	this.height = this.height + this.stepSize;
	if (this.height >= this.target) {
		this.done();
		return;
	}
	style.height = this.height + 'px';
	style.display = 'block';
	this.timer = window.setTimeout('elementsBeingAnimated[\'' + this.ele.id
			+ '\'].increase();', this.DELAY);
};

/**
 * our unique feature : reverse animation if required
 */
a.reverse = function() {
	window.clearTimeout(this.timer);
	if (this.showOrHide == this.SHOW) {
		this.showOrHide = this.HIDE;
		this.reduce();
	} else {
		this.showOrHide = this.SHOW;
		this.increase();
	}
};

/**
 * we are done with animation. Clean-up
 */
a.done = function() {
	var s = this.ele.style;
	s.height = this.styleHeight;
	s.width = this.styleWidth;
	s.overflow = this.ox;
	delete elementsBeingAnimated[this.ele.id];
	if (this.callBackObject && this.callBackObject.animationEnded)
		this.callBackObject.animationEnded();
};//funcitons to be defined if this is used outside of exility
if (!window.htmlEscape) {
	if (window.PM)
		window.htmlEscape = PM.htmlEscape;
	else {
		window.htmlEscape = function(str) {
			return str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
		};
	}
}

/*******************************************************************************
 * Tree - fairly straight forward, except one change. No root node. Instead we
 * keep an array branches, and there is NO ROOT NODE. And we call root node of
 * branches as roots. This is for convenience of its intended use so far
 ******************************************************************************/
var TreeNode = function() {
	//
};

var a = TreeNode.prototype;

/*******************************************************************************
 * row is assumed to have following columns 0: id unique 1: parentId - empty
 * string for trunks 2: name - text that is displayed as menu item 3: value -
 * passed to the call back function 4: type - if present, treeNodeType="type" is
 * set for the item, so that you can use that as rule selector in css.
 ******************************************************************************/
a.setFromRow = function(treeName, row) {
	this.id = row[0];
	this.eleId = treeName + '.' + this.id; // avoid id conflict with possible
											// other elements of dom
	this.parentId = row[1] || null;
	this.name = row[2];
	this.value = row[3] || null;
	this.type = row[4] || null;
	this.treeName = treeName;
	this.data = row;
	// this.childNodes ; //contains an array of child nodes, built by tree
	// this.parentNode;
};
a.setFromObject = function(treeName, obj) {
	this.id = obj.id;
	this.eleId = treeName + '.' + this.id; // avoid id conflict with possible
											// other elements of dom
	this.parentId = obj.parentId || null;
	this.name = obj.name;
	this.value = obj.value || null;
	this.type = obj.type || null;
	this.treeName = treeName;
	this.data = obj;
};

a.disable = function() {
	this.disabled = true;
	var ele = document.getElementById(this.eleId);
	if (ele)
		ele.disabled = true;
	if (this.quickEle) {
		this.quickEle.style.display = 'none';
	}
};

a.enable = function() {
	this.disabled = false;
	var ele = document.getElementById(this.eleId);
	if (ele)
		ele.disabled = false;
	if (this.quickEle) {
		this.quickEle.style.display = '';
	}
};

/*******************************************************************************
 * A node is rendered with following dom structure <div class="nodeBranch"> <div
 * id="this.eleId" class="trunk/branch/leaf+NodeText" treeNodeType="type">node
 * name</div> <div id="this.eleId+Group" class="nodeGroup"> recursive rendering
 * of each childNode.. </div> </div>
 ******************************************************************************/
// t is the array that accumulates html text
a.render = function(t) {
	if (this.childNodes) {
		t.push('<div class="nodeBranch">'); // div-1 open
	}

	// render this node
	t.push('<div id="'); // div-2 open
	t.push(this.eleId);
	t.push('" class="');
	if (this.childNodes) {
		if (this.parentNode)
			t.push('branch');
		else
			t.push('trunk');
	} else
		t.push('leaf');
	t.push('NodeText" ');
	if (this.disabled)
		t.push('disabled="disabled" ');
	if (this.type) {
		t.push('treeNodeType="');
		t.push(this.type);
		t.push('" ');
	}
	t.push('>');
	t.push(htmlEscape(this.name)); // htmlEscape is in utils.js
	t.push('</div>'); // div - 2 closed

	// render child nodes, if any
	if (this.childNodes) {
		t.push('<div style="display:none; z-index:10" class="nodeGroup" id="'); // div-3
																				// open
		t.push(this.eleId);
		t.push('Group">');
		for ( var i = 0; i < this.childNodes.length; i++) {
			this.childNodes[i].render(t);
		}
		t.push('</div></div>'); // div 3 - closed, div-1 cosed. Div-1 was opened
								// only if this.childNodes
	}
};
// get <ul><li>..</li><li>..</li>.......</ul>
a.getUlLi = function(t) {
	t.push('<li><a href="#">');
	t.push(htmlEscape(this.name));
	t.push('</a>');
	if (this.childNodes) {
		t.push('\n<ul>\n');
		for ( var i = 0; i < this.childNodes.length; i++) {
			this.childNodes[i].getUlLi(t);
		}
		t.push('\n</ul>\n');
	}
	t.push('</li>\n');
};
/*******************************************************************************
 * add this node to the quick-menu list to implement a spot-light like quick
 * search t - array of innerHTML text for the element prefix - text representing
 * parent menus to be prefixed to this menu name
 ******************************************************************************/
a.addQuickMenu = function(t, prefix) {
	var txt = this.name;
	if (prefix)
		txt = prefix + ' > ' + txt;
	var encodedText = htmlEscape(txt);
	if (!this.childNodes) // this is a leaf. to be added to the list
	{
		this.tree.quickNodes.push(this);
		t.push('<div title="');
		t.push(encodedText);
		t.push('" class="quickMenuNode" id="');
		t.push(this.eleId);
		t.push('QuickEle" class="quickMenuNode" data-nodeId="');
		t.push(this.id);
		t.push('" ');
		if (this.disabled)
			t.push('style="display:none" ');
		t.push('>');
		t.push(encodedText);
		t.push('</div>');
		// this.quickEle = ele; this will be done as part of render() at which
		// time quickMenu would have been added to dom
		this.quickText = txt.toUpperCase();

		return;
	}

	// No need to add this node, as it is a group name.
	// recurse for each of the child nodesthis is a menu.
	for ( var i = 0; i < this.childNodes.length; i++)
		this.childNodes[i].addQuickMenu(t, txt);
};

/* quickEle is the dom element inside quick menu for this node */
a.cacheQuickEle = function() {
	if (this.quickText) {
		this.quickEle = document.getElementById(this.eleId + 'QuickEle');
	} else {
		for ( var i = 0; i < this.childNodes.length; i++)
			this.childNodes[i].cacheQuickEle();
	}
};
// expand the branch below
a.expand = function(toCascade) {
	if (!this.childNodes)
		return;

	if (!this.expanded) {
		this.expanded = true;
		var ele = document.getElementById(this.eleId);
		ele.setAttribute('expanded', 'expanded');
		ele = document.getElementById(this.eleId + 'Group');
		animateHideAndShow(ele, 'show');
		// ele.style.display = '';
	}

	if (toCascade) {
		for ( var i = 0; i < this.childNodes.length; i++)
			this.childNodes[i].expand(toCascade);
	}
};

a.collapse = function(toCascade) {
	if (!this.childNodes)
		return;
	if (this.expanded) {
		this.expanded = false;
		var ele = document.getElementById(this.eleId);
		ele.removeAttribute('expanded');
		var ele = document.getElementById(this.eleId + 'Group');
		animateHideAndShow(ele, 'hide');
		// ele.style.display = 'none';
	}

	if (toCascade) {
		for ( var i = 0; i < this.childNodes.length; i++)
			this.childNodes[i].collapse(toCascade);
	}
};

a.alternate = function() {
	if (this.expanded)
		this.collapse(false);
	else
		this.expand(false);
};
/*******************************************************************************
 * Tree is the main class that represents a menu
 ******************************************************************************/
var Tree = function(nam) {
	this.name = nam;
	if (document.getElementById(nam)) {
		alert(nam
				+ ' is already used as an html element. A menu with this name can not be built');
		return;
	}
	if (window[nam]) {
		alert(nam
				+ ' is already used as a variable in your javascript. A menu with this name can not be built');
		return;
	}
	window[nam] = this; // created as a variable in the window. Used by event
						// functions to execute method of this tree
};

var a = Tree.prototype;
/*******************************************************************************
 * Build a tree from an array. If you want to show all menu items, but disable
 * items that the logged-in user is not authorized, let values be empty string
 * for them, and set disableNodesWithNoValues = true
 ******************************************************************************/
a.buildFromArray = function(data, disableNodesWithNoValues, dataContainsObjects) {
	this.roots = []; // top level menu items
	this.nodes = {}; // all menu itmes indexed by id

	var duplicates = {}; // temp collection to eliminate duplicates
	// convert rows in array into nodes and push them into this.nodes collection
	var row, node, id;
	var startAt = dataContainsObjects ? 0 : 1;
	for ( var i = startAt; i < data.length; i++) {
		row = data[i];
		id = dataContainsObjects ? row.id : row[0];
		if (this.nodes[id]) {
			alert('Menu item id :' + id
					+ ' is a duplicate. This item will be ignored.');
			duplicates[i] = true;
			continue;
		}

		node = new TreeNode();
		if (dataContainsObjects)
			node.setFromObject(this.name, row);
		else
			node.setFromRow(this.name, row);

		if (disableNodesWithNoValues && !node.value && node.value != 0) {
			node.disable();
		}

		this.nodes[id] = node;
		this.nodes[node.eleId] = node; // also indexed by the domele id

		if (!node.parentId)
			this.roots.push(node);

		node.tree = this;
	}

	// build childCollections for all nodes. We are reading from the array to
	// maintain sequence of child nodes
	for ( var i = startAt; i < data.length; i++) {
		if (duplicates[i])
			continue;

		row = data[i];
		id = dataContainsObjects ? row.id : row[0];
		node = this.nodes[id];
		if (!node.parentId) // root
			continue;

		var parentNode = this.nodes[node.parentId];
		if (!parentNode) {
			alert(node.name + ' has its parent id set to ' + node.parentId
					+ '. There is no item with this id. Node is ignored.');
			continue;
		}

		if (!parentNode.childNodes)
			parentNode.childNodes = [];

		parentNode.childNodes.push(node);
		node.parentNode = parentNode;
	}
};

/*******************************************************************************
 * divId is the id of the dom element inside which the menu is to be rendered
 * position : 'top' or 'left'. default is left. dom structure is same in both
 * case, but events are slightly different. onClickFn : pointer to a function
 * that is called back when a leaf node is clicked omcClickFn(value, node)
 * quickMenuId : optional if you want a hot-spot. id of a text box.
 ******************************************************************************/
a.createMenu = function(divId, position, onClickFn, quickMenuId) {
	this.rootEle = document.getElementById(divId);
	if (!this.rootEle) {
		alert(divId + ' is not a dom element. Menu can not be built for '
				+ this.name);
		return;
	}

	if (onClickFn)
		this.onClickFn = onClickFn;

	var n = this.roots.length;
	if (!n) {
		alert(this.name
				+ ' does not have any nodes in that. Menu will not be rendered');
		return;
	}

	var t = [];
	if (position == 'top') {
		t.push('<div class="topMenu" id="');
		t.push(this.name);
		t.push('RootEle" onmouseover="');
		t.push(this.name);
		t.push('.inOut(event, false);" onmouseout="');
		t.push(this.name);
		t.push('.inOut(event, true);" onclick="');
		t.push(this.name);
		t.push('.selected(event);"> ');
	} else {
		t.push('<div class="leftMenu" id="');
		t.push(this.name);
		t.push('RootEle" onclick="');
		t.push(this.name);
		t.push('.clicked(event);"> ');
	}

	for ( var i = 0; i < n; i++) {
		this.roots[i].render(t);
	}

	t.push('</div>');
	this.rootEle.innerHTML = t.join('');

	this.visibleGroups = new Object();
	if (quickMenuId) {
		this.addQuickMenu(quickMenuId);
		// optimize search by caching quickEle
		for ( var i = 0; i < n; i++) {
			this.roots[i].cacheQuickEle();
		}
	}
};

// add spot-light functionality
a.addQuickMenu = function(id) {
	this.quickNodes = [];
	var ele = document.getElementById(id);
	if (!ele || ele.nodeName.toLowerCase() != 'input') {
		alert(id
				+ ' is not an inpiut field on your page. Quick search will not work for menu '
				+ this.name);
		return;
	}

	ele.setAttribute('data-menuName', this.name);
	if (ele.addEventListener) {
		ele.addEventListener("keypress", keyPressedOnQuickMenu, true);
		ele.addEventListener("blur", quickMenuBlurred, true);
	} else {
		ele.attachEvent("onkeypress", keyPressedOnQuickMenu);
		ele.attachEvent("blur", quickMenuBlurred);
	}

	this.quickMenuEle = ele;

	// for simplicity, we enclose this in an inline-block div and make the quick
	// menu relative to that
	var sibling = ele.nextSibling;
	var par = ele.parentNode;
	par.removeChild(ele);

	// create a wrpper that is relative
	var div = document.createElement('div');
	div.style.display = 'inline-block';
	div.style.position = 'relative';
	div.id = id + 'QuickMenuContainer';
	div.appendChild(ele); // add text box back to this

	// add this wrapper to dom
	if (sibling)
		par.insertBefore(div, sibling);
	else
		par.appendChild(div);

	var q = document.createElement('div');
	q.style.position = 'absolute'; // expect users to supply the right css to
									// align it below
	q.style.display = 'none';
	q.className = 'quickMenuSuggestions';
	q.id = id + 'QuickMenu';
	q.setAttribute('data-menuName', this.name);

	div.appendChild(q);
	this.quickEle = q;
	// ele will be reused to carry temp meanings
	// show this ele when no matching elements
	ele = document.createElement('div');
	ele.innerHTML = 'No matching items';
	ele.id = id + 'NoMatch';
	this.noMatchEle = ele;

	q.appendChild(ele);

	this.quickTexts = [];
	ele = document.createElement('div');
	ele.className = 'quickMenuNodes';
	if (ele.addEventListener)
		ele.addEventListener("mousedown", menuItemSelected, true);
	else
		ele.attachEvent("onmousedown", menuItemSelected);
	var t = [];
	for ( var i = 0; i < this.roots.length; i++) {
		this.roots[i].addQuickMenu(t);
	}
	ele.innerHTML = t.join('');
	q.appendChild(ele);
};

a.quickEleBlurred = function() {
	this.quickMenuEle.value = '';
	this.quickEle.style.display = 'none';
};

var quickMenuBlurred = function(e) {
	var ele = e.target || e.srcElement;
	var menu = ele.getAttribute('data-menuName');
	window[menu].quickEleBlurred();
};
// note that this is a funciton defined into the window, and is used as an event
// function
var keyPressedOnQuickMenu = function(e) {
	var ele = e.target || e.srcElement;
	var menu = ele.getAttribute('data-menuName');
	window.setTimeout('window["' + menu + '"].quickSearch(' + e.keyCode + ')',
			0);
};

// note that this is a funciton defined into the window, and is used as an event
// function
var menuItemSelected = function(e) {
	var ele = e.target || e.srcElement;
	var menu = ele.parentNode.parentNode.getAttribute('data-menuName');

	window[menu].quickSelect(ele.getAttribute('data-nodeId'));
};

// if search string contains more than one tokens.. "ab cd" will match if cd is
// found some time after ab
// takes value from input element and shows matching menu items
a.quickSearch = function(keyCode) {
	if (keyCode == 9) // tab
	{
		this.quickMenuEle.value = ''; // zap it
		return;
	}
	var val = trim(this.quickMenuEle.value);
	if (!val.length) {
		this.quickEle.style.display = 'none';
		return;
	}

	val = val.replace(/[\.]/g, '\\.').replace(/[>]/g, '.*');
	val = val.toUpperCase();
	var nbrMatched = 0;

	for ( var i = 0; i < this.quickNodes.length; i++) {
		var node = this.quickNodes[i];
		// alert('going to match ' + val + ' with ' + node.quickText + ' with
		// result = ' + node.quickText.match(val));
		// return;
		if (node.quickText.match(val)) {
			nbrMatched++;
			node.quickEle.style.display = '';
		} else {
			node.quickEle.style.display = 'none';
		}
	}

	this.quickEle.style.display = '';
	this.noMatchEle.style.display = nbrMatched ? 'none' : '';
};

// we ignore focus in/out on areas other than the actual node areas. Let us try
// this approach till it breaks!!
// Since show and hide are animated, it is possible that a user may be
// quick-enough to catch a menu group that is about to wind-up.
// Hence our event handling has to be quite exhaustive
a.inOut = function(e, isOut) {
	var ele = e.target || e.srcElement;
	// some browsers used to return text node as target. Do they still DO?,
	// playing it safe
	if (!ele.id && ele.nodeType == 3) // text node
		ele = ele.parentNode;
	var node = this.nodes[ele.id];
	if (!node)
		return;

	if (isOut)// move out
	{
		this.fromNode = node;
		this.timer = window.setTimeout(this.name + '.hideAll()', 100);
		return;
	}
	// mouse in
	if (this.timer) {
		window.clearTimeout(this.timer);
		this.timer = null;
	}

	// move in. We have to show the branch attached to this node, and possibly
	// all ancestors
	var toShow = this.getAncestors(node);
	var endShow = toShow.length; // by default show all groups. You will see
									// later that we may do some optimization

	if (this.fromNode) // focus shifted from another node. See what has to be
						// hidden
	{
		var toHide = this.getAncestors(this.fromNode);
		this.fromNode = null;

		// it is possible that we are trying to show as well as close some
		// branches.
		// try and see if the two have common ancestors
		endHide = toHide.length;
		var match = this.getMatch(toShow, toHide);
		if (match) {
			endShow = match.m1;
			endHide = match.m2;
		}

		// hide if requires
		for ( var i = 0; i < endHide; i++) {
			this.hideGroup(toHide[i]);
		}
	}

	for ( var i = 0; i < endShow; i++) {
		this.showGroup(toShow[i]);
	}

};

// compares content objects of two arrays and retruns the index at which a match
// is found
// returned object has m1 and m2 as the index for arr1 and arr2. null is
// returned if no match is found
a.getMatch = function(arr1, arr2) {
	for ( var i = 0; i < arr1.length; i++) {
		for ( var j = 0; j < arr2.length; j++) {
			if (arr1[i] === arr2[j]) {
				var ret = new Object();
				ret.m1 = i;
				ret.m2 = j;
				return ret;
			}
		}
	}
};

// returns an array of all ancestor nodes
a.getAncestors = function(node) {
	var arr = [];
	while (node) {
		arr.push(node);
		node = node.parentNode;
	}
	return arr;
};

a.hideAll = function() {
	this.fromNode = null;
	for ( var id in this.visibleGroups) {
		var ele = document.getElementById(id + 'Group');
		if (ele) {
			// ele.style.display = 'none';
			animateHideAndShow(ele, 'hide');
		}
	}
	this.visibleGroups = new Object();
};

a.showGroup = function(node) {
	var ele = document.getElementById(node.eleId + 'Group');
	if (ele) {
		// ele.style.display = 'block';
		animateHideAndShow(ele, 'show');
		this.visibleGroups[node.eleId] = true;
	}
};

a.hideGroup = function(node) {
	var ele = document.getElementById(node.eleId + 'Group');
	if (ele) {
		// ele.style.display = 'none';
		animateHideAndShow(ele, 'hide');
		delete this.visibleGroups[node.eleId];
	}
};

a.clicked = function(e) {
	var ele = e.target || e.srcElement;
	var node = this.nodes[ele.id];
	if (!node || node.disabled)
		return;

	if (!node.childNodes) {
		this.onClickFn(node.value, node.data);
		return;
	}
	node.alternate();
};

a.selected = function(e) {
	var ele = e.target || e.srcElement;
	var node = this.nodes[ele.id];
	if (!node || node.disabled || node.childNodes) {
		// alert(name + ' is not a menu item in ' + this.name);
		return;
	}
	this.hideAll();
	this.onClickFn(node.value, node.data);
};

a.expandAll = function() {
	for ( var i = 0; i < this.roots.length; i++)
		this.roots[i].expand(true);
};

a.collapseAll = function() {
	for ( var i = 0; i < this.roots.length; i++)
		this.roots[i].collapse(true);
};

a.showNode = function(id) {
	var node = this.nodes[id];
	if (!node)
		return;
	node = node.parentNode;
	while (node) {
		node.expand(false);
		node = node.parentNode;
	}
};

// selects a menu item dispalyed below the quick search field
a.quickSelect = function(id) {
	var node = this.nodes[id];
	if (!node || node.childNodes)
		return;
	this.onClickFn(node.value, node.data);
	this.quickEle.style.display = 'none';
};

// default function to be executed when a leaf menu item is clicked. Overridden
// with user supplied function
a.onClickFn = function(value, data) {
	if (!value && value != 0)
		return;
	if (value.toString().indexOf('(') > 0) // we assume it to be a java script
	{
		try {
			eval(value);
		} catch (e) {
			alert('invalid script assigned as value to menu item\n' + value);
		}
		return;
	}
	var win = window.currentActiveWindow;
	if (win) // it is an exility page
	{
		exilityPageStack.resetStack();
		exilityPageStack.goTo(win, NavigationAction.REPLACE, value);
		return;
	}
};

/*******************************************************************************
 * returns an html that renders the menu as set of
 * <ul>
 * <li> tags
 ******************************************************************************/
a.getUlLi = function() {
	var n = this.roots.length;
	if (!n) {
		alert(this.name
				+ ' does not have any nodes in that. Menu will not be rendered');
		return;
	}

	var t = [];
	t.push('<ul>');
	for ( var i = 0; i < n; i++) {
		this.roots[i].getUlLi(t);
	}
	t.push('</ul>');
	return t.join('');
};
