/*
 * Agent to make an Ajax call to an exility service
 * TODO: this is not integrated with serverAgent. Exility is NOT using this. 
 * This is being designed specifically for projects that use ONLY Exility 
 * server, and NOT exility client
 */

/**
 * @module represents an adaptor to connect to an exility server for an ajax
 *         call Two possible usage scenarios: 1. There is a home page that is
 *         always present, and the application opens pages as iframes within
 *         this (Exility client application use this technique) In this case,
 *         you include this file in the home page. Set url in your home page,
 *         and individual pages can refer to this single object for service 2.
 *         Home page goes out of scope when individual pages are opened. Include
 *         this file in each of your pages that need to make ajax calls and use
 *         this service
 */
var ExilityAgent = (function() {
	/*
	 * exility uses csrf header token for authentication
	 */
	var CSRF_HEADER = 'X-CSRF-Token';
	/*
	 * and the header token has the value 'remove" when user logs out..
	 */
	var REMOVE_CSRF = 'remove';

	/*
	 * map logger, or make it dummy
	 */
	var trace = null;
	if (window.debug) { // exility
		trace = window.debug;
	} else if (window.logger && window.logger.trace) { // possible generic
		// logger
		trace = window.logger;
	} else {
		trace = function() {
			//
		};
	}

	var showMessage = null;
	if (window.message) { // exility
		showMessage = window.message;
	} else {
		showMessage = window.alert;
	}
	/*
	 * in case caller wants a one-way call, we can live with a dummy call back
	 * object
	 */
	var dummyCallBackObject = {
		/*
		 * called when ajax call fails
		 */
		serviceFailed : function(code, msg) {
			showMessage('ERROR : Agent reported an error with code = ' + code
					+ ' and msg = ' + msg);
		},

		/*
		 * called when ajax call succeeds. dc is the data collection returned
		 * from the server
		 */

		serviceReturned : function(dc) {
			trace('Call to server succeded.');
		}
	};

	/*
	 * default time out is 2 minutes. Can be changed with a call to setTimeout()
	 */
	var timeout = 120000;
	/*
	 * we keep track of all pending requests till they are disposed one way or
	 * the other
	 */
	var requests = {};

	/*
	 * counter that acts as key for storing requests in requests object
	 */
	var nextReqId = 1;

	/*
	 * csrf token as returned by server, to be sent back to server each time
	 */
	var csrfToken = null;
	/*
	 * function called by XmlHttpRequest on state change. note that "this" would
	 * refer to xmlHttpObject
	 */
	var stateChanged = function() {
		if (this.readyState == 4) {
			ExilityAgent.serviceReturned(this);
		}
	};

	return {
		/*
		 * error codes returned by serve() method that the API users can use
		 */
		/**
		 * @constant serve() called before setting url using setUrl() method
		 */
		ERROR_NO_URL : 1,

		/**
		 * @constant unable to connect to server. Possible network error, or
		 *           invalid url
		 */
		ERROR_CONNECTION_ERROR : 2,

		/**
		 * @constant server returned an error
		 */
		ERRROR_HTTP_ERROR : 3,

		/**
		 * @constant server did not respond within reasonable time
		 */
		ERROR_TIMED_OUT : 4,

		/**
		 * @constant server responded with a text that could not be parsed
		 */
		ERROR_INVALID_RESPONSE : 5,

		/**
		 * @constant this user session has expired. you should re-authenticate
		 */
		ERROR_SESSION_EXPIRED : 6,

		/**
		 * @constant server requires authentication, and you have not
		 *           authenticated
		 */
		ERROR_NOT_LOGGED_IN : 7,

		/**
		 * @constant error on server.
		 */
		ERROR_SERVER_ERROR : 8,

		/**
		 * @method change default timeout
		 * @param {integer}
		 *            timeInSeconds time to wait for server to respond. default
		 *            is two minutes
		 */
		setTimeout : function(timeInSeconds) {
			var t = parseInt(timeInSeconds);
			if (t)
				timeout = t * 1000;
		},

		/**
		 * @method url to be used for the service. Note that exility uses just
		 *         one url for the entire server.
		 */
		setUrl : function(serviceUrl) {
			url = serviceUrl;
		},

		/**
		 * @method main method that asks for a service.setUrl() should have been
		 *         called before this
		 * @param {string}
		 *            serviceId service to b service from server
		 * @param {object}
		 *            callBackObject This object should have the desired method
		 *            definitions for call back serviceReturned(dc) is called on
		 *            success, and serviceFailed(messageId, message) on failure
		 * @param {DataCollection}
		 *            dc data to be sent as part of this service request
		 * @param {boolean}
		 *            waitForResponse default is false resulting in aan asynch
		 *            call. true value implies a sych call that will stall the
		 *            execution thread till server returns
		 * @param {object}
		 *            httpOptions refer to xmlHttpRequest of browser
		 * @returns {integer} a handle that can be used to cancel() the call.
		 *          null in case of error
		 */
		serve : function(serviceId, callBackObject, dc, waitForResponse,
				httpOptions) {
			if (!callBackObject)
				callBackObject = dummyCallBackObject;
			else if (!callBackObject.serviceReturned
					|| !callBackObject.serviceFailed) {
				showMessage('Callback object provided for serve() must have method serviceReturned(dc) for handling data returned from server, and serviceFailed(errorCode, errorMessage) to handle error. If you do not want to do any of these, pass null as callBackObject.');
				return null;
			}

			var msg;
			if (!url) {
				msg = 'Design error: url for server is not set before requesting a service';
				trace(msg);
				callBackObject.serviceFailed(ERROR_NO_URL, msg);
				return;
			}

			trace('Received a request for service ' + serviceId);
			if (dc) {
				trace('Data to be sent to serve\n' + dc.toHtml(), true);
			} else {
				dc = new DataCollection();
			}

			dc.addValue('serviceId', serviceId);
			var dcText = dc.serialize();

			var httpObject = new XMLHttpRequest();
			httpObject.startedAt = new Date();
			httpObject.serviceId = serviceId;
			httpObject.callBackObject = callBackObject;
			/*
			 * keep all info about this request in httpObject, and save
			 * httpObject in a global collection to be available for timeout
			 * function
			 */
			var n = httpObject.reqId = nextReqId;
			requests[n] = httpObject;
			nextReqId++;
			httpObject.timerHandle = setTimeout('ExilityAgent.timedOut(' + n
					+ ')', timeout);
			if (!waitForResponse) // asynch call
			{
				httpObject.onreadystatechange = stateChanged;
			}

			// we are ready to contact server
			try {
				httpObject.open((httpOptions && httpOptions.requestMethod)
						|| 'POST', url, !waitForResponse);
				var contentType = (httpOptions && httpOptions.contentType)
						|| 'text/html; charset=utf-8';
				httpObject.setRequestHeader("Content-Type", contentType);

				if (csrfToken) {
					httpObject.setRequestHeader(CSRF_HEADER, csrfToken);
				}
				httpObject.send(dcText);
			} catch (e) {
				msg = 'Error while requesting for url ' + url + '. ' + e;
				trace(msg);
				callBackObject.serviceFailed(ERROR_CONNECTION_ERROR, msg);
				return null;
			}

			/*
			 * if this is a synch call, we already have the response
			 */
			if (waitForResponse)
				serviceReturned(httpObject);
			else
				return n; // caller can use this index to cancel
		},

		/**
		 * @method cancel a service request
		 * @param {integer}
		 *            idx index that was returned to you by serve() method
		 * @return {boolean} true if the service request cancelled successfully,
		 *         false otherwise
		 */
		cancel : function(idx) {
			var httpObject = requests[idx];
			if (!httpObject) {
				trace(idx + ' is not a valid handle to a service request.');
				return false;
			}
			clearTimeout(httpObject.timerHandle);
			httpObject.gotCancelled = true;
			httpObject.timerHandle = null;
			delete requests[idx];
			trace('Service request for ' + httpObject.serviceId
					+ ' was cancelled by caller.');
			return true;
		},

		/**
		 * called by window timer. Hence it has to be public
		 */
		timedOut : function(n) {
			var httpObject = requests[n];
			if (!httpObject) {
				trace('Design error: timedOut called with ' + n
						+ ' which is not a valid inidex to a service call.');
				return false;
			}
			httpObject.timerHandle = null;
			delete requests[n];
			var msg = 'Request to url ' + url + ' for service '
					+ httpObject.serviceId + ' did not return within '
					+ timeout / 1000 + ' seconds. Giving-up.';
			trace(msg);
			httpObject.callBackObject.serviceFailed(ERROR_TIMED_OUT, msg);
			return true;
		},

		/**
		 * @method call back method for xmlHttpRequest, hence this method is
		 *         public
		 * @param {XmlHttpRequest}
		 *            httpObject
		 * @returns true if all ok, false otherwise
		 */
		serviceReturned : function(httpObject) {
			if (!httpObject.timerHandle) // it got timed out
			{
				trace(httpObject.serviceId + ' did come back,'
						+ httpObject.gotCancelled ? ' but caller had already cancelled it.'
						: 'but too late to avoid a time-out.');
				return false;
			}

			clearTimeout(httpObject.timerHandle);
			httpObject.timerHandle = null;
			delete requests[httpObject.reqId];
			if (httpObject.status < 200 || httpObject.status >= 300) {
				var msg = 'Http Error: Request for service '
						+ httpObject.serviceId + ' failed with status : '
						+ httpObject.status + ' - ' + httpObject.statusText;
				trace(msg);
				httpObject.callBackObject.serviceFailed(
						ExilityAgent.HTTP_ERROR, msg);
				return false;
			}

			var responseText = httpObject.responseText;
			var myDc = new DataCollection();
			if (responseText.length > 0) {
				try {
					if (responseText.substr(0, 15).indexOf('var dc = ') >= 0) {
						// legacy code that was used before xmlHttp
						eval(responseText); // this creates an object dc, but we
						// want an instance of
						// DataCollection()
						myDc.fromDc(dc);
					} else
						myDc.deserialize(responseText);
				} catch (e) {
					msg = 'Error while evaluating data returned by server. '
							+ e;
					trace(msg);
					trace('Text recd from server:');
					trace(responseText, true); // we do not want any html
					// formatting
					httpObject.callBackObject.serviceFailed(
							ERROR_INVALID_RESPONSE, msg);
					return false;
				}
			}

			// last possible error : authentication
			var aStstus = myDc.getValue(myDc.AUTHENTICATION_STATUS);
			if (aStstus && aStstus != '0') {
				var msg;
				if (aStstus == '1') {
					msg = 'Session expired';
					trace(msg);
					httpObject.callbackObject.serviceFailed(
							ERROR_SESSION_EXPIRED, msg);
					return false;
				}
				msg = 'Authentication failed. May be you are not logged-in.';
				trace(msg);
				httpObject.callbackObject.serviceFailed(ERROR_NOT_LOGGED_IN,
						msg);
				return false;
			}

			/**
			 * process CSRF token
			 */
			var t = httpObject.getResponseHeader(CSRF_HEADER);
			if (t) {
				if (t === REMOVE_CSRF)
					csrfToken = null;
				else
					csrfToken = t;
			}

			// alright.. everything is aaaalright!!
			trace('Time taken for service ' + httpObject.serviceId + ' : '
					+ (new Date() - httpObject.startedAt) + ' ticks.');
			var txt = myDc.removeValue(myDc.PERFORMANCE_FIELD_NAME);
			if (txt) {
				trace('Server Performance : ');
				trace(txt);
			}

			txt = myDc.removeValue(myDc.TRACE_FIELD_NAME);
			if (txt) {
				trace('******* begin trace from server ********');
				trace(txt);
				trace('******* end server trace ********');
			}

			trace('Data returned:');
			myDc.addValue('serviceId', httpObject.serviceId);
			trace(myDc.toHtml(), true);
			httpObject.callBackObject.serviceReturned(myDc);
			return true;
		}

	};
})();
