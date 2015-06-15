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
