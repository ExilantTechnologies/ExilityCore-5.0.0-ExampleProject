 /*
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
