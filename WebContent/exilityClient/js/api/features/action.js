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
