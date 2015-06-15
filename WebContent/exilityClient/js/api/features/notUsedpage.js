/* 
 * VERY VERY IMPORTANT
 * To understand fieldChange and picker event handling processes, you should first understand how events are handled
 * specifically, how they are queued, and also how setTimeout works. I put a brief explantaion and then our strategy
 * This article is quite useful http://dev.opera.com/articles/view/timing-and-synchronization-in-javascript/
 * 1. One user action may trigger several events. All the events are queued first, and then executed in that order.
 *    For example, when you press TAB key from a field, onfieldchange, onblur, onkeydown, on keypress, onfocus
 *    (for the next field) all occur simultaneously. What is the order? I do not know, one can experiment.
 * 2. Each event is 'fully' executed before the next one in the queue is taken up. This includes all the bubbled ones
 *    or the captured ones. All the event processers attached at any level for that specific event. This also includes
 *    alerts. That is, if you have an alert() in one of the processing function, the execution waits for the alert to
 *    complete, but does not proceed.
 * 3. While you can cancel bubbling of an event and cancel the 'default action' attached to an event, there is no way
 *    you can touch any of the events that are already in the q. You can not cancel them. Unfortunately, you can not even
 *    find out what they are. For example, I would ahve loved to know whether the user clicked in the picker before I
 *    process onchange event of the corresponding field.
 * 4. One curious point is what if the default action of an event triggers another event? such an event (or events)
 *    will be attached to the queue, and not nested. Exception to this is an explicit triggering of an event thru 
 *    script (dispatchEvent() - or fireEvent() in IE) will be executed immediately, as if it is part of the current execution.
 * 5. setTimeout() function. Browsers implement this as an event. That is an event is triggered after the specified number of
 *    milliseconds. Interesting part is that the event is also part of the same q as the events that we have been discussing
 *    For example, if the browser is in the middle of executing a set of four events that fired because of a user action,
 *     and, a timer's time reaches its time, the function specified in setTimeout is added at the end of the queue.
 *    This means that, setTimeout() does not gaurantee that the function executes exactly after that time, 
 *    but is taken-up for execution after that.
 * 6. If you change a field, and then click on another field following is the order in which events fire
 *    onmousedown (of field where you clicked), onchange ond onblur of first field and onfocus of second field. This is one group. All these happen because of mousedown action.
 *    onmouseup and onclick on another group. Note that any timeout(0) from first group will fire before the second group.
 *
 * What is the implication for us?
 * 1. Cursor positioning glitch on immediate validation:
 *      We have onchange event for field for this. We validate the field on change. If validation fails, we show a
 *      a message thru alert. After user click OK, we take the cursor back to the field in error, and select() the
 *      the field. However, the other events, like onfocus of the next field will fire after this, and they take the 
 *      cursor focus to the next field (this happens on row, and not on ie). Net effect is that the field in error
 *      is selected, (i.e. blocked with blue color) but the focus in on the next field.
 * SOLUTION: Problem can be solved by eliminating alert. We can have a div of our own that just shows up. Cursor
 *      positioning can take place after user presses OK on that div, by which other events would have finished their actions.
 *      Another approach is to push the error-actions into a timer of time 0. That way, it gets queued immediatelyafter all the 
 *      associated actions. We take this approach.
 *
 * 2. When a user clicks on a code picker /date picker, we have to wait till we dispose the onchange for the last field.
 *      If the field is in error, then we we should not trigger the picker. However, the onchange itself should be
 *      ignored, if the user changes the field, and then clicks on the associated date/time picker. Generally, it could be any
 *      onclick action that may have to be supressed if there if onchange action fails.
 * SOLUTION: If we use onclick action, the event is not queueed untill all actions associated with onmousedown are disposed.
 *      If any of those events put timer-0 event, those events will also be fored before onclick. For example, 
 *      if onchange results in an error, and if we want to display error after after onclick action, we can not use timer-0,
 *      Instead we should use timer with 'sufficient' delay. We will never be able to do justice to this 'sufficient' : if it is 
 *      too much, some other event may trigger in between, and if it is not enough, we will have more trouoble.
 *      So, it is critical that the onclick event should be part of the same event group that onchange is.
 *      Hence, we use onmousedown event instead of onclick event in Exility. 
 * 
 *      We are still not done. onmousedown fires before onchange. that is too early for us. Hence all the onclick
 *      actions are triggered on onmousedown, but they use timer-0 technique to q themselves after onchange.
 * TO SUMMARIZE:
 *      a. onmousedown is the first event that fires. Note that users know this event as onClickAction. Exility
 *         page generator associates this action with onmousedown rather than onclick. event handler queues itself with a timer-0.
 *  
 *      b. onchange proceeds with validation. If there is any error, it kills any pending timer for onmousedown action, and queues itself for error-display. 
 *         Exception to this is the picker event. If the pending event is the picker event for the field that is in error, error is not displayed.
 *      
 *      c. If use a div to show error message, then there is no need to queue the error-display. Button click on that
 *         div should take care of moving the cursor to the field in error.
 * IMPLEMENTATION DETAILS:
 * Only pickers are attached to onlousedown as of now. All others are still on onclick. Since no user has asked for it,
 *  we have delayed the implementation.
 */

//var P2 = new ExilityPage(window); //this is created in exilityLoader.js
//////////////////////////////////////////////////////
// The main object that stores information of all the objects of html page,
// that are required for data binding.
//win is the window of the page that cretaes this, and name is the name of the page, (typically the name without .htm)
var ExilityPage = function(win, nam) {
	this.win = win;
	this.doc = win.document;
	this.name = nam;
	// advantage of Object() over Array() is, you can associate
	// <name, obj> pair easily.
	this.pageParameters = new Object();
	this.fields = new Object();
	this.tables = new Object();
	this.actions = new Object();
	// this.panels = new Object();
	this.minParameters = 0;
	this.minParametersToFireOnLoad = 0;
	this.onLoadActionNames = null;
	this.onModifyModeActionNames = null;
	this.pageMode = null;
	this.messageArea = null;
	this.popupTarget = null; // targetObject name for code picker
	this.savedError = null;
	this.lastModifiedNode = null;
	this.idSplitter = "___"; // id of a table element =
	// "eleId<idSplitter><uniqueRowNum>"
	this.listServices = null;
	this.globalFields = new Array(); // accumulates fields that are to take
	// value from a global field
	this.globalFieldLabels = new Array(); // accumulates fields whose labels
	// are to be taken from globallabels
	this.reportServices = null;
	this.trackFieldChanges = false;
	this.fieldNames = []; // keeps unqualified field names in the order that
	// are added
	// in case we want to add event listeners...
	this.nextListenerId = 0;
	this.eventListeners = {};
};
// ////////////////////////////////////////////////////
// page parameter class
// Some pages may need to be invoked with certain parameters.
// These parameters are passed through query string of the URL.
// PageParameter class defines each parameter that is expected.
// page parameters are defined in metadata.js files.
var PageParameter = function() {
	this.name = null;
	this.defaultValue = null;
	this.value = null;
	this.dataType = null;
	this.isRequired = false;
	// id of DOM element to which the value is to be set.
	this.setTo = null;
	this.isPrimaryKey = false;
	this.P2 = null;
};

// We start with methods on P2. Start with simple add/set/get methods to dip
// into the collections
ExilityPage.prototype.addParameter = function(p) {
	p.P2 = this;
	this.pageParameters[p.name] = p;
};

ExilityPage.prototype.getParameter = function(nam) {
	return this.pageParameters[nam];
};

ExilityPage.prototype.addField = function(field) {
	var gridName, listeners;
	field.P2 = this;
	// register first editable field, or the specified field as the first field
	if (!this.firstField) {
		if (this.firstFieldName) {
			if (this.firstFieldName === field.name)
				this.firstField = field;
		} else {
			if (field.isEditable)
				this.firstField = field;
		}
	}
	this.fields[field.name] = field;
	if (field.tableName)
		this.tables[field.tableName].addColumn(field);
	if (field.initialize)
		field.initialize();
	if (field.listServiceId) {
		// register this field as a listener on serviceId/keyValue
		if (!this.listServices) // collection is not yet created..
			this.listServices = new Object();
		// gridName = serviceId. Except when keyValeu is specified in which case
		// it is serviceId + '_' keyValue
		gridName = field.listServiceId;
		if (field.keyValue)
			gridName += '_' + field.keyValue;
		listeners = this.listServices[gridName];
		if (!listeners) // this is the first listener
		{
			listeners = new Array();
			listeners.serviceId = field.listServiceId;
			listeners.keyValue = field.keyValue;
			this.listServices[gridName] = listeners;
		}
		listeners.push(field);
		debug(field.name + ' pushed as a listener for ' + gridName);
	}
	if (field.reportServiceId) {
		// register his field as a listener on serviceId/keyValue
		if (!this.reportServices) // collection is not yet created..
			this.reportServices = new Object();
		// gridName = serviceId. Except when keyValeu is specified in which case
		// it is serviceId + '_' keyValue
		gridName = field.reportServiceId;
		if (field.keyValue)
			gridName += '_' + field.keyValue;
		listeners = this.reportServices[gridName];
		if (!listeners) // this is the first listener
		{
			listeners = new Array();
			listeners.serviceId = field.reportServiceId;
			listeners.keyValue = field.keyValue;
			this.reportServices[gridName] = listeners;
		}
		listeners.push(field);
	}

	if (field.globalFieldName)
		this.globalFields.push(field);

	if (field.globalFieldLabelName)
		this.globalFieldLabels.push(field);
	field.seqNo = this.fieldNames.length;
	this.fieldNames.push(field.name);
};

ExilityPage.prototype.getField = function(nam) {
	return this.fields[nam];
};

ExilityPage.prototype.getFieldObject = function(nam, idx) {
	var field = this.fields[nam];
	if (!field)
		return null;
	var id = field.table ? field.table.getObjectId(nam, idx) : nam;
	return this.doc.getElementById(id);
};

ExilityPage.prototype.addAction = function(action) {
	action.P2 = this;
	this.actions[action.name] = action;
};

ExilityPage.prototype.getAction = function(nam) {
	return this.actions[nam];
};

// add a table object to P2
ExilityPage.prototype.addTable = function(table) {
	table.P2 = this;
	this.tables[table.name] = table;

	// A service is not associated with any table. Client does not know what
	// data is being asked when a server call is made.
	// It is a crude design to send pginationSize for all tables. To facilitate
	// this, we accumulate all of them in an array of arrays. See next function
	// addPageSizes()
	if (table.pageSize && !table.localPagination) {
		if (!this.pageSizes)
			this.pageSizes = new Array();
		this.pageSizes.push([ table.name + 'PageSize', table.pageSize ]);
	}

	// small optimization to trigger linked/merged table utilities that has to
	// be triggered after all tables are loaded.
	if (table.linkedTableName || table.mergeWithTableName
			|| table.nestedTableName)
		this.hasLinkedTables = true;
};

ExilityPage.prototype.addPageSizes = function(dc) {
	if (!this.pageSizes)
		return;
	for ( var i = 0; i < this.pageSizes.length; i++) {
		var pair = this.pageSizes[i];
		dc.values[pair[0]] = pair[1];
	}
};

ExilityPage.prototype.getTable = function(nam) {
	return this.tables[nam];
};

// getFiled value will return the value in the field. Note that field value is
// always synchronized with
// the dom element.
// index is optional, and is used by the field.getValue if it happens to be in a
// table, in which case the field value from that row is returned
ExilityPage.prototype.getFieldValue = function(nam, idx, toFormat,
		fromDeletedRowAsWell) {
	var field = this.fields[nam];
	if (!field) { // try local variable
		debug(nam + ' is not a field. Trying local variable');
		if (this.win.name_value_) {
			field = this.win.name_value_[nam];
			if (typeof (field) != 'undefined' && field != null)
				return field;
		}
		// last resort : it is just a local variable
		field = this.win[nam];
		if (typeof (field) != 'undefined' && field != null)
			return field;

		debug(nam + ' is not found any where ');
		return null;
	}
	return field.getValue(idx, toFormat, fromDeletedRowAsWell);
};

// initially written only to hide, but changed that to unhide as well.
ExilityPage.prototype.hideField = function(nam) {
	this.hideOrShowField(nam, 'none');
};
ExilityPage.prototype.hideOrShowField = function(nam, display) {
	var field = this.fields[nam];
	if (field && field.table) {
		field.table.hideOrShowField(nam, display);
		return;
	}
	var ele = this.doc.getElementById(nam);
	if (ele) {
		ele.style.display = display;
		ele = this.doc.getElementById(nam + 'Label');
		if (ele)
			ele.style.display = display;
		ele = this.doc.getElementById(nam + 'Picker');
		if (ele)
			ele.style.display = display;
		ele = this.doc.getElementById(nam + 'Operator');
		if (ele)
			ele.style.display = display;

		// is this a date element with time ?
		ele = this.doc.getElementById(nam + 'FieldsTable');
		if (ele)
			ele.style.display = display;

		ele = this.doc.getElementById(nam + 'ToDiv');
		if (ele)
			ele.style.display = display;
	}

	var eleLeft = this.doc.getElementById(nam + 'Left');
	if (eleLeft) {
		eleLeft.style.display = display;
		if (eleLeft)
			eleLeft.style.display = display;
	}

	var eleMiddle = this.doc.getElementById(nam + 'Middle');
	if (eleMiddle) {
		eleMiddle.style.display = display;
		if (eleMiddle)
			eleMiddle.style.display = display;
	}

	var eleRight = this.doc.getElementById(nam + 'Right');
	if (eleRight) {
		eleRight.style.display = display;
		if (eleRight)
			eleRight.style.display = display;
	}
	// get the back the validation status - Exis (Start) : Venkat
	if (field && display) {
		field.validationStatusOnHide = field.requiresValidation;
		field.requiresValidation = false;
	} else if (field && field.validationStatusOnHide) // Sep 08 2009 : Bug 477
		// - Buttons are not
		// hiding when Hidden is
		// given - Exility:
		// Venkat
		field.requiresValidation = field.validationStatusOnHide;
	// get the back the validation status - Exis (End) : Venkat
};

ExilityPage.prototype.setDefaultValue = function(fieldName, value) {
	var field = this.fields[fieldName];
	if (field)
		field.defaultValue = value;
	else
		debug('field ' + fieldName
				+ ' is not a feild and hence a default value of ' + value
				+ ' is not set');
};
// index is optional. It is used only if the field is inside a table. For a
// table, if this is omitted,
// current selected row is assumed.
// returns true if the value is assigned to a field, else false for the fact
// that it got assigned to a window variable
ExilityPage.prototype.setFieldValue = function(fieldName, value, obj, idx,
		suppressDesc, formatValue, listServiceOnLoad, pageParameterOnLoad) // Aug
// 06
// 2009
// :
// Bug
// ID
// 631
// -
// suppressDescOnLoad
// is
// not
// working
// -
// WeaveIT:
// Venkat
{
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
	if (pageParameterOnLoad)
		field.setValue(value, obj, idx, field.supressDescOnLoad, formatValue,
				false, listServiceOnLoad); // Aug 06 2009 : Bug ID 631 -
	// suppressDescOnLoad is not working
	// - WeaveIT: Venkat
	else
		field.setValue(value, obj, idx, suppressDesc, formatValue, false,
				listServiceOnLoad); // Aug 06 2009 : Bug ID 631 -
	// suppressDescOnLoad is not working -
	// WeaveIT: Venkat
};

ExilityPage.prototype.setFieldLabel = function(fieldName, label) {
	var f = this.doc.getElementById(fieldName + 'Label');
	if (!f)
		return;
	f.innerHTML = label.replace(/&/g, '&amp;');
	var field = this.fields[fieldName];
	if (!field)
		return;
	field.label = label;
};

ExilityPage.prototype.doneWith = function() {
	// in case some pagination is pending, we will try to tell server that we
	// are done
	try {
		for ( var tableName in this.tables) {
			var table = this.tables[tableName];
			if (table.totalRows && table.totalRows > table.nbrRows)
				table.requestPage(0);
		}
	} catch (e) {
		// 
	}
};

// init is the first method that is triggered after loading the page

ExilityPage.prototype.init = function() {
	this.setPageTitle();
	// We have been inserting some variable into a newly opened window in the
	// window that opened it. for e.g.
	// win=window.open(blaaaaa); win.someValriable = 'someValue'. This is not
	// reliable across browsers,
	// probably because of the time taken to create the window object, and when
	// it is avialable..
	// To solve this, I am introducing the ocncept of an inbox for a window.
	// Note that the caller should create the inbox
	// before creating the window
	getInbox(this.win);
	// this inbox is not destroyed now. It will be used again if this page is to
	// be reset. It is upto the caller
	// to change the inbox..
	this.win.framesAll = PM.frames;
	var val, f;
	// any drop-downs? Let the trip to server start as early as possible
	var grid = new Array();
	var listeners, toPush, aRow, field;
	if (this.listServices) {
		grid.push([ 'serviceId', 'keyValue' ]);
		for ( var x in this.listServices) {
			listeners = this.listServices[x];
			aRow = [ listeners.serviceId,
					listeners.keyValue ? listeners.keyValue : '' ];
			toPush = false;
			for ( var i = 0; i < listeners.length; i++) {
				field = listeners[i];
				field.obj = this.doc.getElementById(field.name);
				if (!field.obj)
					debug('DESIGN ERROR: '
							+ field.name
							+ ' could not get its dom element at the time of regestering for list service');
				if (field.noAutoLoad)
					continue;
				debug('pushing a listService request for ' + aRow);
				toPush = true;
			}
			if (toPush)
				grid.push(aRow);
		}
	}

	// any reports? Let the trip to server start as early as possible
	var reportgrid = new Array();
	if (this.reportServices) {
		reportgrid.push([ 'serviceId', 'keyValue' ]);
		for ( var x in this.reportServices) {
			listeners = this.reportServices[x];
			aRow = [ listeners.serviceId,
					listeners.keyValue ? listeners.keyValue : '' ];
			debug('pushing a reportService request for ' + aRow);
			toPush = false;
			for ( var i = 0; i < listeners.length; i++) {
				field = listeners[i];
				field.obj = this.doc.getElementById(field.name);
				if (!field.obj)
					debug('DESIGN ERROR: '
							+ field.name
							+ ' could not get its dom element at the time of regestering for list service');
				if (field.noAutoLoad)
					continue;
				toPush = true;
			}
			if (toPush)
				reportgrid.push(aRow);
		}
	}
	// are there special buttons?
	if (this.buttonsToEnable) {
		for ( var i = 0; i < this.buttonsToEnable.length; i++)
			this.buttonsToEnable[i] = this.doc
					.getElementById(this.buttonsToEnable[i]);
	}
	if (this.buttonsToDisable) {
		for ( var i = 0; i < this.buttonsToDisable.length; i++)
			this.buttonsToDisable[i] = this.doc
					.getElementById(this.buttonsToDisable[i]);
	}

	// any buttons to be disabled on code picker mode?
	if (this.buttonsToHideForPicker && this.win.name == "pickerWindow") {
		for ( var i = 0; i < this.buttonsToHideForPicker.length; i++)
			this.doc.getElementById(this.buttonsToHideForPicker[i]).style.display = 'none';
	}

	// what parameters we are called with..
	var actions = this.processPageParameters();
	// call init for tables..
	var tbl;
	for ( var tableName in this.tables) {
		tbl = this.tables[tableName];
		if (tbl.init)
			tbl.init();
	}

	// any global fields?
	for ( var i = 0; i < this.globalFields.length; i++) {
		field = this.globalFields[i];
		val = globalFieldValues[field.globalFieldName];
		if (val)
			field.setValue(val, null, 0, false, true);
	}
	this.globalFields = null; // we are done with that..
	for ( var i = 0; i < this.globalFieldLabels.length; i++) {
		field = this.globalFieldLabels[i];
		val = globalFieldValues[field.globalFieldLabelName];
		if (val) {
			field.label = val;
			var fieldName = field.name;
			if (field.table && field.table.linkedTableName) {
				// replace link tablename and underscore to blank
				fieldName = fieldName.replace(field.tableName + '_', '');
			}
			f = this.doc.getElementById(fieldName + 'Label');
			if (f) {
				if (f.firstChild)
					f.firstChild.nodeValue = val;
				else
					f.appendChild(this.doc.createTextNode(val));
			}
		}
	}
	this.globalFieldLabels = null;
	if (exilParms.errorAtBottom) // do we show field errors in a panel that
		// is always at the bottom?
		this.initErrorPanel();
	// /////// we are done with formatting the page. We are ready to receive
	// data now. /////
	// did we get any page parameter?
	for ( var p in this.pageParameters) {
		var param = this.pageParameters[p];
		if ('pageheader' == param.name && param.value) {
			this.doc.getElementById('pageheader').innerHTML = param.value;
		} else if (param.value)
			this.setFieldValue((param.setTo ? param.setTo : p), param.value,
					null, null, null, null, null, true); // Sep 23 2009 : Bug
		// 697 - In The
		// Modify Mode
		// 'Description
		// serviece is
		// Calling' -
		// SABMiller :
		// Aravinda
	}

	// did the calling page pass any dc ??
	if (window.passedDc) {
		this.refreshPage(window.passedDc);
		window.passedDc = null;
	}

	// are there list services to be triggered on load?
	if (grid.length > 1)
		this.callListService(grid, null, null, null, null, null, true); // Aug
	// 06
	// 2009
	// : Bug
	// ID
	// 631 -
	// suppressDescOnLoad
	// is
	// not
	// working
	// -
	// WeaveIT:
	// Venkat
	// are there report services to be triggered on load?
	if (this.reportServices && reportgrid.length > 1)
		this.callReportService(reportgrid, null);
	// and finally, any onload action?
	if (actions && actions.length > 0) {
		// mark the last action for display
		var n = actions.length;
		var lastAction = actions[n - 1];
		this.actions[lastAction].showPage = true;
		for ( var i = 0; i < n; i++)
			this.act(this.doc.body, 'body', actions[i], null, true); // Aug
		// 06
		// 2009
		// : Bug
		// ID
		// 631 -
		// suppressDescOnLoad
		// is
		// not
		// working
		// -
		// WeaveIT:
		// Venkat
	} else
		this.showPage();

	if (this.hotkeyFunction) {
		if (this.doc.addEventListener)
			this.doc.addEventListener("keydown", this.win[this.hotkeyFunction],
					false);
		else
			this.doc.onkeydown = this.win[this.hotkeyFunction];
	} else if (exilParms.appHotKeyFunctionName
			&& exilParms.appHotKeyFunctionName != '') {
		if (this.doc.addEventListener)
			this.doc.addEventListener("keydown",
					PM[exilParms.appHotKeyFunctionName], false);
		else
			this.doc.onkeydown = function() {
				var ret = PM[exilParms.appHotKeyFunctionName]
						(this.win.event.keyCode);
				if (!ret)
					this.win.event.returnValue = false;
			};
	}

	if (PM.window.resetInactiveTimer)
		PM.window.resetInactiveTimer();
	if (this.hasLinkedTables) {
		for ( var tableName in this.tables) {
			var table = this.tables[tableName];
			if (table.linkedTableName || table.mergeWithTableName
					|| table.nestedTableName) {
				table.createLinks();
			}
		}
	}

	/**
	 * add place holder for date field if required
	 */
	if (exilParms.datePlaceHolder) {
		this.addDatePlaceHolders();
	}
};

/**
 * add place holders for all date fields.
 */
ExilityPage.prototype.addDatePlaceHolders = function() {
	var eles = this.doc.body.getElementsByTagName('input');
	var p = exilParms.datePlaceHolder;
	for ( var i = eles.length - 1; i >= 0; i--) {
		var ele = eles[i];
		if (ele.className == 'dateinputfield'
				&& !ele.getAttribute('placeholder'))
			ele.setAttribute('placeholder', p);
	}
};

// Checks and processes query string parameters.
ExilityPage.prototype.showPage = function() {
	// set the window size to accomodate the size of this htm
	var ht = this.pageHeight;
	var wd = this.pageWidth;
	var tp = 0;
	var lft = 0;
	var frameEle = null;
	if (this.win.name == "pickerWindow" || this.win.isAPopup) // it is popup
	// mode
	{
		// is there a 'loading' element to be hidden? used by exis team
		var loadingEle = document.getElementById('loading');
		if (loadingEle)
			loadingEle.style.display = 'none';

		if (this.popupHeight)
			ht = this.popupHeight;
		if (this.popupWidth)
			wd = this.popupWidth;
		if (this.popupLeft) {
			lft = this.popupLeft;
		}
		if (this.popupTop) {
			tp = this.popupTop;
		}
		if (this.win.name == "pickerWindow") {
			if (PM.codePickerLeft && PM.codePickerLeft != -1) {
				lft = PM.codePickerLeft;
			}
			if (PM.codePickerTop && PM.codePickerTop != -1) {
				tp = PM.codePickerTop;
			}

			pickerEleStyle.left = lft + "px";
			pickerEleStyle.top = tp + "px";
			pickerEleStyle.display = ''; // Feb 22 2011 : Bug 2123 - code
			// picker should not show blank
			// screen - Exility App : Aravinda
			// Dec 21 2010 : Bug 1893 - The pop-up page is not positioned
			// properly - Exility (End) : Aravinda
		} else {
			var parentDiv = this.win.parent
					&& this.win.parent.document.getElementById(this.win.name
							+ 'Div');
			if (parentDiv) {
				parentDiv.style.display = ''; // Feb 25 2011 : Fixed for Popup
				// - Exility App : Aravinda
				parentDiv.style.position = 'absolute';
				parentDiv.style.zIndex = '2';
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

				} else // no need to centeralign
				{
					if (lft > 0)

						parentDiv.style.left = lft + 'px';
					else
						parentDiv.style.left = '100px';
				}
				if (tp > 0)
					parentDiv.style.top = tp + 'px';
				else
					parentDiv.style.top = '100px';
			}
		}
	}

	if (this.win.name == "pickerWindow") {
		resetWindowSize(this.win, wd, ht, tp, lft, true);
	} else {
		resetWindowSize(this.win, wd, ht, tp, lft);
	}
	// Let the page show-up now. Note: Idealy it shoudl show-up after all onload
	// services return
	this.doc.body.style.display = '';
	if (this.firstField) {
		var ele = this.doc.getElementById(this.firstField.name);
		if (ele && ele.focus) {
			try {
				ele.focus();
				if (field.isAssisted)
					ele.select();
			} catch (e) {
				//
			}
		}
	}

	if (this.fieldsToHideOnLoad && this.fieldsToHideOnLoad.length != 0)
		this.hideOrShowPanels(this.fieldsToHideOnLoad, 'none');

	this.win.checkIframeSize();
};

// Checks and processes query string parameters.
ExilityPage.prototype.processPageParameters = function() {
	var params = this.pageParameters;
	var param, val;
	var toLookForKeyField = false;
	if (this.pageMode != null) // its default value is modify, (if not null)
		toLookForKeyField = true;

	var qryFields = queryFieldsToCollection(this.win.location.search);

	// do we have to worry about pageMode?

	var n = 0; // number of params actually recvd
	for (p in params) {
		param = params[p];
		val = qryFields[p];
		if (!val)
			val = param.defaultValue;
		if (!val) {
			if (toLookForKeyField && param.isPrimaryKey) {
				// too bad. A key field is not given
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
				val = dt.validate(val);
			} catch (e) {
				// Oct 28 2008 : Incorporating Changes from Tanmay : Aravinda
				message('Internal error: This page is called with ' + p + ' = '
						+ val + '. This is not a valid value.' + e.messageText,
						"Error", "Ok", null, null, null);
				continue;
			}
		}
		// store the value. We may require it any time...
		param.value = val;
		n++;
	}

	// check for minimum number of parameters being passed to this page

	if (n < this.minParameters) {
		// Oct 28 2008 : Incorporating Changes from Tanmay : Aravinda
		message(
				'This page is to be invoked with '
						+ this.minParameters
						+ ' parameters. Only '
						+ n
						+ 'parameters are passed. This is a set-up problem. This page may not work properly',
				"Error", "Ok", null, null, null);
		return null;
	}
	// do we have to act on some actions? Which ones?
	if (this.pageMode == 'modify') {
		if (this.fieldsToDisableOnModifyMode)
			this.ableFields(this.fieldsToDisableOnModifyMode, false);
		return this.onModifyModeActionNames;
	}
	if (n >= this.minParametersToFireOnLoad && this.onLoadActionNames)
		return this.onLoadActionNames;
	return null;
};

ExilityPage.prototype.ableFields = function(fieldNames, toEnable, idx) {
	var tabIndex = 0;
	var disp = '';
	var disabled = false;
	if (!toEnable) {
		tabIndex = -1;
		disp = 'none';
		disabled = true;
	}

	for ( var i = 0; i < fieldNames.length; i++) {
		var id = fieldNames[i];
		var field = this.fields[id];
		var table = this.tables[id];
		if (!field && table)// enable/disable table click action
		{
			if (table.enableAction) {
				if (toEnable)
					table.enableAction();
				else
					table.disableAction();
			} else
				debug('Error: '
						+ id
						+ ' is a table but it does not have enableAction() method. enable/disable action ignored');
			continue;
		}

		var currRow = null;
		var rowObjArr = new Array();
		var colCnt = 0;
		var nodeName = null;
		var suffix = '';
		var ele = this.doc.getElementById(id);
		if (!ele) {
			if (field && field.table) {
				currRow = field.table.htmlRowToClone;
				if (!idx)
					idx = field.table.currentRow;
				suffix = '__' + idx;
				ele = this.doc.getElementById(id + suffix);
			} else if (idx) // it could be delete check box
				ele = this.doc.getElementById(id + '__' + idx);
		}
		if (!ele) {
			debug(id + ' is marked for enable/disable. But it is not defined.');
			continue;
		}
		// this needs to be delegated to table to take care of more complex
		// tables (like frozen columns etc..)
		var inputObj = null;
		if (currRow) {
			nodeName = ele.nodeName;
			inputObj = currRow.getElementsByTagName(nodeName);
			for ( var k = 0; k < inputObj.length; k++) {
				if (inputObj[k].id == id) {
					rowObjArr[colCnt] = inputObj[k];
					colCnt++;
				}
			}
		}
		if (disabled) {
			ele.savedClassName = ele.className;
			ele.className = 'disabledinput';

			if ((ele.tagName && ele.tagName.toUpperCase() == 'FONT')
					|| (ele.type && ele.type.toUpperCase() == 'BUTTON')) // Aug
			// 7
			// 2009
			// :
			// Bug
			// ID
			// 632
			// -
			// Value
			// is
			// Undefined
			// -
			// Exis:
			// Vijay
			{
				ele.style.cursor = '';
				ele.setAttribute("eleDisabled", "true");
			}
		} else {
			if (ele.savedClassName)
				ele.className = (ele.savedClassName == 'disabledinput') ? ''
						: ele.savedClassName || '';

			if ((ele.tagName && ele.tagName.toUpperCase() == 'FONT')
					|| (ele.type && ele.type.toUpperCase() == 'BUTTON')) {
				ele.style.cursor = 'pointer';
				ele.setAttribute("eleDisabled", "false");
			}
		}

		ele.disabled = disabled;

		if (ele.childNodes.length > 0) {
			for ( var j = 0; j < ele.childNodes.length; j++) {
				if (ele.childNodes[j].nodeType == 1 && ele.childNodes[j].name) {
					if ((ele.childNodes[j].name).search(/Radio/) > 0
							|| (ele.childNodes[j].name).search(/Checkbox/) > 0) {
						ele.childNodes[j].disabled = disabled;
					}
				}
			}
		}

		ele.tabIndex = tabIndex;

		var picker = this.doc.getElementById(id + suffix + 'Picker');
		if (picker)
			picker.style.display = disp;

		var timeEle = this.doc.getElementById(id + 'Hr');
		if (timeEle) {
			var objs = field.getTimeObjects(timeEle);
			for (a in objs) {
				timeEle = objs[a];
				if (!timeEle)
					continue;
				if (disabled) {
					timeEle.savedClassName = timeEle.className;
					timeEle.className = 'disabledinput';
				} else
					timeEle.className = timeEle.savedClassName || '';
			}
		}
		// following block of code is looking ugly. Needs to be fixed.
		// too many loops and too many operations. isn't inputObj same as
		// field.table.htmlRowToClone.getElementsByTagName(nodeName)? And, why
		// is that done inside the loop??
		if (rowObjArr.length) {
			for ( var j = 0; j < rowObjArr.length; j++) {
				for ( var k = 0; k < inputObj.length; k++) {
					if (rowObjArr[j].id == inputObj[k].id
							&& inputObj[k].getAttribute('disabled') == false) {
						field.table.htmlRowToClone
								.getElementsByTagName(nodeName)[k]
								.removeAttribute('disabled', 0);
					}
				}
			}
		}

		var toFieldEle = this.doc.getElementById(id + 'ToDiv');
		if (toFieldEle) {
			toFieldEle.disabled = disabled;
			if (disabled)
				toFieldEle.className = 'disabledinput';
			else
				toFieldEle.className = '';
		}

		var opFieldEle = this.doc.getElementById(id + 'Operator');
		if (opFieldEle) {
			opFieldEle.disabled = disabled;
			if (disabled)
				opFieldEle.className = 'disabledinput';
			else
				opFieldEle.className = '';
		}
		// Nov 26 2009 : Bug 796 - calender control-problem with hidding the
		// datefield - Exility (End) : Venkat
	}
};

// Called to get values for a drop-downreturns a dc populated with list
// serviceId and keyvalue pairs
ExilityPage.prototype.callListService = function(grid, field, fieldName,
		qryFields, qrySources, idx, listServiceOnLoad) // Aug 06 2009 : Bug ID
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
ExilityPage.prototype.callReportService = function(grid, field, fieldName,
		qryFields, qrySources, idx) {
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

// Expecting the value to fillDcFromQueryFields for repeating columns.
ExilityPage.prototype.fillDcFromQueryFields = function(dc, names, sources, idx,
		toValidate, fieldVal, fieldName) {
	if (!names)
		return true;
	if (!sources) {
		message("Design error: Source not supplied for name = " + names,
				"Error", "Ok", null, null, null);
		return false;
	}
	var n = names.length;
	var val;

	for ( var i = 0; i < n; i++) {
		var sourceName = sources[i];
		var field = this.fields[sourceName];
		if (field) {
			if (toValidate == "true" && field.name != fieldName) // Nov 21
			// 2009 :
			// Bug 767 -
			// ValidateQueryFields="false"
			// -
			// Exility:
			// Venkat
			{
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
		} else
			val = this.win[sourceName];
		if (!val)
			val = '';
		dc.addValue(names[i], val);
		if (field && field.isFilterField) {
			field = this.fields[sourceName + "Operator"];
			val = field.getValue(idx, true);
			dc.addValue(names[i] + "Operator", val);
			if (val == 6) // between
			{
				field = this.fields[sourceName + "To"];
				val = field.getValue(idx, true);
				dc.addValue(names[i] + "To", val);
			}

		}

		if (field && field.table && field.table.repeatingColumnName) {
			var fn = field.table.name + '_' + field.table.repeatingColumnName;
			if (fn == field.name)
				dc.addValue(names[i], fieldVal);
		}
	}
	return true;
};

ExilityPage.prototype.fillDcFromForm = function(dc, fields, tables,
		sendAllFields) {
	if (!fields) {
		fields = this.fields;
		tables = this.tables;
	}
	for ( var fieldName in fields) {
		var field = this.fields[fieldName];
		if (field) {
			if (sendAllFields || (field.toBeSentToServer && !field.tableName))
				field.fillDc(dc);
		} else {
			var grid = this.win[fieldName]; // a ready grid
			if (grid)
				dc.addGrid(fieldName, grid);
			else
				debug(fieldName
						+ ' is neither a field, nor a javascript variable name. It will not be submitted.');
		}
	}

	// tables
	for ( var tableName in tables) {
		var table = this.tables[tableName];
		if (table) {
			if (table.fillDC && table.toBeSentToServer)
				table.fillDC(dc);
		} else
			debug(tableName + ' is not a table. It will not be submitted.');
	}
};

ExilityPage.prototype.getQueryStringFromPageParamaters = function() {
	var str = '';
	var prefix = '';
	for ( var param in this.pageParameters) {
		var val = this.getFieldValue(param);
		if (val) {
			str += prefix + param + '=' + val;
			prefix = '&';
		}
	}
	return str;
};

// create a query string out of supplied field names. Sources is optional.
// supplied, should have exactly same number of comma separated fields as the
// naems
ExilityPage.prototype.makeQueryString = function(names, sources, idx,
		toValidate, pickerSource) {
	debug('P2.makeQueryString() names=' + names + ' and soureces = ' + sources);
	var qryStr = '';
	if (!names)
		return '';
	if (!sources) {
		// Oct 28 2008 : Incorporating Changes from Tanmay : Aravinda
		message('Design error: Sources not supplied for name ' + names,
				"Error", "Ok", null, null, null);
		return;
	}
	var val;
	// prepare a string of the form name=vale&name1=value1.....
	var prefix = '';
	for ( var i = 0; i < sources.length; i++) {
		var field = this.fields[sources[i]];
		if (field) {
			val = field.getValue(idx);
			if (toValidate == "true"
					&& (!pickerSource || field.name != pickerSource)) // Nov
			// 21
			// 2009
			// : Bug
			// 767 -
			// ValidateQueryFields="false"
			// -
			// Exility:
			// Venkat
			{
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
			if (!val)
				val = '';
		}

		qryStr += prefix + names[i] + "=" + escape(val);
		prefix = '&';

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

ExilityPage.prototype.setLastModifiedNode = function(ele) {
	if (!ele) {
		ele = new Object();
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

ExilityPage.prototype.resetLastModifiedNode = function() {
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
	// is there an error area that is rendering existing errors? Errors will all
	// be obsolete now
	this.resetFieldErrors();
	if (window.tabbedWindows)
		tabbedWindows.setModifiedStatus(this.win.name, false);
};

ExilityPage.prototype.tableClicked = function(tableName, obj) {
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
ExilityPage.prototype.tableHeaderClicked = function(event, tableName,
		columnName) {
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

ExilityPage.prototype.sortTable = function(obj, tableName, columnName) {
	this.tables[tableName].sort(obj, columnName);
};

ExilityPage.prototype.rowSelected = function(tableName, obj) {
	var table = this.tables[tableName];
	if (table)
		table.rowSelected(obj);
};

// avoiding window.confirm and using PM.message instead
var actionBeingConfirmed = null;
var p2BeingConfirmed = null;
var pageActionActAfterMessageOk = function() {
	// action is confirmed. Reset and call the action again.
	p2BeingConfirmed.resetLastModifiedNode();
	p2BeingConfirmed.act(actionBeingConfirmed.obj,
			actionBeingConfirmed.fieldName, actionBeingConfirmed.actionName,
			actionBeingConfirmed.param, actionBeingConfirmed.actionOnLoad);
	actionBeingConfirmed = null;
	p2BeingConfirmed = null;
};

var pageActionActAfterMessageNotOk = function() {
	try {
		var node = p2BeingConfirmed.lastModifiedNode;
		if (!node.disabled)
			node.focus();
		p2BeingConfirmed.makePanelVisible(node);
	} catch (e) {
		//
	}
	actionBeingConfirmed = null;
	p2BeingConfirmed = null;
};

ExilityPage.prototype.act = function(obj, fieldName, actionName, param,
		actionOnLoad) {
	debug('P2.act() with actionName = ' + actionName + ' obj=' + obj
			+ ' fieldName=' + fieldName);
	var msgDiv = document.getElementById('warningMsg'); // used by exis team
	if (msgDiv)
		msgDiv.style.display = 'none';

	if (obj && obj.type && obj.getAttribute('eleDisabled') == 'true') // Jul
		// 22
		// 2009
		// : Bug
		// ID
		// 611 -
		// Java
		// Script
		// Error
		// -
		// India
		// Services:
		// Venkat
		return;

	var action = this.actions[actionName];
	if (!action) {
		debug('action ' + actionName + ' is not a valid action');
		return;
	}
	if (action.warnIfFormIsModified) {
		if ((exilParms.trackFieldChanges == true)
				|| (exilParms.trackFieldChanges == false && this.trackFieldChanges == true)) {
			if (this.lastModifiedNode) {
				p2BeingConfirmed = this;
				actionBeingConfirmed = {
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

	if (action.showPanels != null)
		this.hideOrShowPanels(action.showPanels, '');

	if (action.hidePanels != null)
		this.hideOrShowPanels(action.hidePanels, 'none');

	if (action.disableFields != null)
		this.ableFields(action.disableFields, false);

	if (action.enableFields != null)
		this.ableFields(action.enableFields, true);
	if (action.popupPanel)
		this.popupAPanel(action.popupPanel);
	else if (action.popdownPanel)
		this.popDown();
	var actionDone = action.act(obj, fieldName, param, actionOnLoad); // Aug
	// 06
	// 2009
	// : Bug
	// ID
	// 631 -
	// suppressDescOnLoad
	// is
	// not
	// working
	// -
	// WeaveIT:
	// Venkat
	// if it is not a serverAction, and if we are to show page at end.
	if (action.showPage && !action.serviceId)
		this.showPage();
	// moved reset to the end to handle the case when a service did not fire
	// because of validation issues.
	if (actionDone && action.resetFormModifiedState) {
		this.resetLastModifiedNode();
	}

	if (exilParms.serverActivityCallBackFunctionName && action.toBeReported) {
		PM[exilParms.serverActivityCallBackFunctionName]();
	}
};

ExilityPage.prototype.hideOrShowPanels = function(panelNames, display) {
	var i, panelName, panel, twister, tab, tabLeft, tabRight;

	for (i = 0; i < panelNames.length; i++) {
		panelName = panelNames[i];
		// is it a field?
		var field = this.fields[panelName];
		if (field) {
			this.hideOrShowField(panelName, display);
			continue;
		}
		panel = this.doc.getElementById(panelName);
		if (!panel) {
			debug("design error: panelName " + panelName
					+ " is to be hidden/shown, but it is not a dom element");
			continue;
		}
		// is it tabbed panel?
		tab = this.doc.getElementById(panelName + 'Tab');
		tabLeft = this.doc.getElementById(panelName + 'TabLeft');
		tabRight = this.doc.getElementById(panelName + 'TabRight');

		var hideOrSho = display == 'none' ? 'hide' : 'show';
		tabs = this.doc.getElementById(panelName + 'Tabs');
		if (tabs) {
			if (exilParms.animateHideAndShow) {
				animateHideAndShow(tabs, hideOrSho, this);
			} else {
				if (display != 'none')
					tabs.style.display = '';
				else
					tabs.style.display = 'none';
			}
		}

		if (tab) {
			if (display != 'none') // show this
			{
				tab.style.display = '';
				// May 20 2009 : Bug 482 - Issue while hiding Tab - ADCP (Start)
				// : Venkat
				if (tabLeft)
					tabLeft.style.display = '';
				if (tabRight)
					tabRight.style.display = '';
				// May 20 2009 : Bug 482 - Issue while hiding Tab - ADCP (End) :
				// Venkat
				tab.onclick.call(tab);
				continue;
			}
			// we have to hide. If this is the active tab, let us make another
			// tab active
			if (tab.clickDisabled || tab.getAttribute('clickdisabled')) {
				var newtab = tabLeft.previousSibling;
				if (newtab)
					newtab = newtab.previousSibling;
				// keep going back till you get a tab that is not hidden, or
				// there is no more
				while (newtab) {// there could be other text/empty elements
					if (newtab.id && newtab.style.display != 'none')
						break;
					newtab = newtab.previousSibling;
				}
				if (!newtab) // We didn't get. try inthe forward direction
				{
					newtab = tabRight.nextSibling;
					if (newtab)
						newtab = newtab.nextSibling;
					while (newtab && newtab.style.display == 'none') {
						if (newtab.id && newtab.style.display != 'none')
							break;
						newtab = newtab.nextSibling;
					}
				}
				// if we find a valid tab, let us click
				if (newtab)
					newtab.onclick.call(newtab);
			}
			tab.style.display = 'none';
			if (tabLeft)
				tabLeft.style.display = 'none';
			if (tabRight)
				tabRight.style.display = 'none';
			continue;
		}
		if (panel.style.display == display)
			continue;

		// is there a twistie?
		twister = this.doc.getElementById(panelName + 'Twister');
		if (twister) {
			this.twist(twister, panelName);
			continue;
		}

		// alright. No decorations around this. Looks like a simple hide/show
		// is there a top panel?
		var topPanel = this.doc.getElementById(panelName + 'Top');
		if (topPanel)
			topPanel.style.display = display;
		if (panel.tagName != 'DIV' || !exilParms.animateHideAndShow)
			panel.style.display = display;
		else
			animateHideAndShow(panel, hideOrSho, this);
	}
	// page size would have increased. If animated, then animationEnd() would
	// take care of this
	// if (!exilParms.animateHideAndShow)
	this.win.checkIframeSize();
};

// show a panel as if it is a pop-up. We whould be able to move it, but as of
// now, it is a simple popup
// We use a simple tehnique. cover the page. Jack-up the panel by making its
// posiiton 'relative' and a hihger zIndex.
ExilityPage.prototype.popupAPanel = function(panelName) {
	// panel may have a top to include borders etc.. get the top, failing which
	// get this panel
	var panel = this.doc.getElementById(panelName + 'Top')
			|| this.doc.getElementById(panelName);
	if (!panel) {
		debug('Error: ' + panelName
				+ ' is not found as a DOM element. popup option failed ');
		return;
	}

	if (this.poppedUpPanel)
		this.poppedUpPanel.style.position = '';
	// cover is already there...
	else {
		// create the cover, but once
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
		// stretch the cover
		this.myCoverStyle.height = this.doc.body.clientHeight + 'px';
		this.myCoverStyle.width = this.doc.body.clientWidth + 'px';
		this.myCoverStyle.display = 'block';
	}
	// popup th epanel
	panel.style.position = 'relative';
	panel.style.zIndex = 10;
	this.poppedUpPanel = panel;
};

// if a panel is being rendered as a popup, make it back to normal
ExilityPage.prototype.popDown = function() {
	if (!this.poppedUpPanel) {
		debug('Nothing to popdown');
		return;
	}
	if (this.myCoverStyle)
		this.myCoverStyle.display = 'none';

	this.poppedUpPanel.style.position = '';
	this.poppedUpPanel = null;
};
// when panels are animated, we don't know when to resize window(to avoid
// double-scroll-bar)
// animations are disciplied to keep calling the following two methods..
ExilityPage.prototype.animationStarted = function() {
	this.nbrBeingAnimated++;
};

ExilityPage.prototype.animationEnded = function() {
	this.nbrBeingAnimated--;
	if (!this.nbrBeingAnimated)
		this.win.checkIframeSize();
};

ExilityPage.prototype.appendRows = function(tableName, data) {
	var table = this.tables[tableName];
	if (table) {
		var dc = new Object();
		dc.grids = new Object();
		dc.grids[tableName] = data;
		table.setData(dc, true, true);
	} else
		debug('Table ' + tableName
				+ ' not found for this page. Rows will not be appended');
};

// push values from dc to page
ExilityPage.prototype.refreshPage = function(dc, listServiceOnLoad) {
	var table, field;

	this.fillList(dc.grids, true);
	this.fillReport(dc.grids);

	for ( var nam in dc.values) // setfieldvalue(fieldname, value, obj, index,
	// supressDesc, toFormat
	{
		var supressDesc = false;
		if (this.fields[nam] && this.fields[nam].supressDescOnLoad)
			supressDesc = this.fields[nam].supressDescOnLoad;
		this.setFieldValue(nam, dc.values[nam], null, 0, supressDesc, true,
				listServiceOnLoad); // last true is for formatting.. // Aug 06
		// 2009 : Bug ID 631 - suppressDescOnLoad is
		// not working - WeaveIT: Venkat
	}

	// take care of entries in grids that work as data source for tables in HTML
	for ( var nam in dc.grids) {
		var grid = dc.grids[nam];
		if (!grid || !grid.length)
			continue;
		if (nam == 'fieldAliases') {
			this.applyFieldAliases(grid);
			continue;
		}
		table = this.tables[nam];
		if (table) {
			// some tables do not want data to be set to them directly.
			// Typically linked tables.
			if (table.doNotSetDataToMe)
				continue;
			table.setData(dc, null, null, listServiceOnLoad);
		}
		// it is also possible that there is a multipleselection list
		else {
			field = this.fields[nam];
			if (field && field.setGrid)
				field.setGrid(grid);
		}
	}

	// and lists?
	for ( var nam in dc.lists) {
		var lst = dc.lists[nam];
		if (!lst)
			continue;
		field = this.fields[nam];
		if (field && field.setList)
			field.setList(lst);
	}
	this.win.checkIframeSize();
};

ExilityPage.prototype.applyFieldAliases = function(grid) {
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

ExilityPage.prototype.resetFields = function(fieldsToReset) {
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

ExilityPage.prototype.resetAllFields = function() {
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
 * of data. Primarility designed for auto-save feature for UXD project
 * 
 * @param actionName
 *            {String} name of service
 * @param fields
 *            {String[]} fields to be sent to server
 */
ExilityPage.prototype.resetFieldsToSubmit = function(actionName, fields) {

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

ExilityPage.prototype.countEnteredFields = function() {
	var fields = this.fields;
	var kount = 0;

	for ( var fieldName in fields) {
		var field = fields[fieldName];
		if (field.toBeSentToServer && field.hasValue())
			kount++;
	}
	return kount;
};

// validate : triggered before a form is sent to the server
ExilityPage.prototype.validate = function(fields, tables) {

	this.resetFieldErrors();
	var userFunction = null;
	if (!fields && !tables) {
		userFunction = this.formValidationFunction;
		fields = this.fields;
		tables = this.tables;
	}
	var field;
	var returnValue = true;

	// as of now, when we find an error, we alert the messsage, and hence it
	// makes sense to
	// take the user to the field in error right away. That means, we stop
	// validation.
	// However, it is possible that we can validate all fields in one go, and
	// accumulate all erros on the way.
	// messgaes can be rendered in such a way that user can click on any of
	// them, and go to the field in error.
	// In such a design, just set the next variable to false, and change
	// e.render()
	// 
	PM.pageValidation = true;
	// validate field as per its validation method
	for ( var fieldName in fields) {
		field = this.fields[fieldName];
		if (!field || !field.toBeSentToServer)
			continue;
		var onlyIfChanged = this.validateOnlyOnUserChange
				|| field.validateOnlyOnUserChange;
		if (onlyIfChanged && !field.changedByUser)
			continue;
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

	if (!tables)
		return returnValue;

	// table validation; unique cols
	for ( var tableName in tables) {
		try {
			var table = this.tables[tableName];
			if (table.validate && table.toBeSentToServer)
				table.validate();
		} catch (e) {
			if (!e.messageId) // it is not an exility error
			{
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
				PM.pageValidation = false; // Nov 30 2009 : Bug 758 - Filter
				// field-Between value Issue - Exis
				// (Start): Aravinda
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

ExilityPage.prototype.fieldFocussed = function(obj, fieldName) {
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
ExilityPage.prototype.fieldChanged = function(obj, fieldName, internalChange,
		supressDesc, listServiceOnLoad) // Oct 20 2009 : Bug ID 737 -
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
	// now that the field is valid, let us reset error display
	this.setFieldCss(obj, false);
	if (this.fieldErrorDisplayEle) {
		this.removeErrorFromPanel(obj);
		this.registerFieldError(obj, false);
	}
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

ExilityPage.prototype.catchError = function(e) {
	// signal to other scripts that may run that we haev just raised aan error.
	// 500 ms is acceptable, because anyways we will be showing an error message
	// that the user has to see..
	this.errorOccurred = true;
	this.win.setTimeout('P2.errorOccurred = false;', 500);

	// if any picker is pending, stop that..
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
	this.win.setTimeout("P2.handleError()", 0);
};

// pending: how do we handle combo box?
ExilityPage.prototype.keyPressedOnField = function(obj, objName, e) {
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

ExilityPage.prototype.createCodePicker = function(pickerObj, e, fieldName) {
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

ExilityPage.prototype.startCodePicker = function() {
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
		// it is valid. ensure that any error rendering is reset
		this.setFieldCss(obj, false);
		if (this.fieldErrorDisplayEle) {
			this.removeErrorFromPanel(obj);
			this.registerFieldError(obj, false);
		}
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

ExilityPage.prototype.codePickerReturned = function(data) {
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

ExilityPage.prototype.createDatePicker = function(pickerObj, e, fieldName) {
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

ExilityPage.prototype.startDatePicker = function() {
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

ExilityPage.prototype.datePickerReturned = function(date) {
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
ExilityPage.prototype.handleError = function() {
	debug('in handle error');
	if (!this.error) // not sure how this can happen, but for safety
	{
		debug('Design Error: reached handleError but P2.error has no erroe message.');
		return;
	}

	// this field is in error. set css for it.
	this.setFieldCss(this.error.obj, true);

	// do we need to show errors in a panel at the bottom of the page?
	if (this.fieldErrorDisplayEle) {
		var text = this.error.messageText;
		this.showErrorInPanel(this.error.obj, text);
		this.registerFieldError(this.error.obj, true);
		// this would have increased page size
		this.win.checkIframeSize();
	} else if (this.error.render)
		this.error.render(this.error.obj);
	else
		alert(this.error);
	this.error = null;
	return;
};

// mark/unmark this field to be in error
ExilityPage.prototype.registerFieldError = function(ele, isInError) {
	// tracking is required if projetc has set up exilParms.fieldErrorCss
	if (!ele || !ele.id || !exilParms.fieldErrorCss)
		return;
	// collection of elements in error
	if (!this.fieldsInError)
		this.fieldsInError = new Object();
	if (isInError)
		this.fieldsInError[ele.id] = ele;
	else
		delete this.fieldsInError[ele.id];
};

ExilityPage.prototype.setFieldCss = function(ele, isInError) {
	if (!ele || !ele.id || !exilParms.fieldErrorCss)
		return;
	var clsName = exilParms.fieldErrorCss;
	var currentName = ele.className;
	var alreadyInError = currentName && currentName.indexOf(clsName) > 0;
	if (isInError) {
		if (alreadyInError)
			return;

		if (currentName)
			clsName = currentName + ' ' + clsName;
	} else {
		if (alreadyInError == false)
			return;
		if (currentName.indexOf(' ') > 0)
			clsName = currentName.split(' ')[0];
		else
			clsName = '';
	}
	ele.className = clsName;
};

ExilityPage.prototype.resetFieldErrors = function() {
	if (this.fieldsInError) {
		for ( var id in this.fieldsInError) {
			var ele = this.fieldsInError[id];
			this.registerFieldError(ele, false);
			this.setFieldCss(ele, false);
		}
	}
	this.removeAllErrorsFromPanel();
};
// strcuture of error display div is
// <div#fieldErrorDisplayMain>
// <div#fieldErrorCollapse/>
// <div#fieldErrorExpand/>
// <div#fieldErrorDisplayEle>
// <div#fieldId+ErrorEle.fieldErrorEle> (for each display)
// <div.fieldErrorClose/>
// <div.fieldErrorText>erro text</div>
// </div>
// </div>
// </div>
var ERR_PANEL_MAIN = '<div id="fieldErrorCollapse"  onclick="P2.collapseErrorPanel();"></div><div onclick="P2.expandErrorPanel();" id="fieldErrorExpand"></div><div id="fieldErrorDisplayEle"></div>';
var ERR_PANEL_PREFIX = '<div class="fieldErrorRemove" onclick="P2.fieldErrorRemoveClicked(this);"></div><div class="fieldErrorText">';
var ERR_PANEL_SUFFIX = '</div>';
ExilityPage.prototype.initErrorPanel = function() {
	var ele = this.doc.createElement('div');
	ele.id = 'fieldErrorDisplayMain';
	ele.innerHTML = ERR_PANEL_MAIN;
	this.doc.body.appendChild(ele);
	this.fieldErrorDisplayMain = ele;
	this.fieldErrorCollapse = this.doc.getElementById('fieldErrorCollapse');
	this.fieldErrorExpand = this.doc.getElementById('fieldErrorExpand');
	this.fieldErrorDisplayEle = this.doc.getElementById('fieldErrorDisplayEle');
};

// id of the element in error, and the error text
ExilityPage.prototype.showErrorInPanel = function(obj, text) {
	if (!this.fieldErrorDisplayEle)
		return;

	// debug('Trying to show error text ' + text + ' for field ' + (obj &&
	// obj.id));
	var ele;
	var id = null;
	this.removeErrorFromPanel(obj, true);
	ele = this.doc.createElement('div');
	if (obj) {
		id = obj.id;
		var lbl = this.doc.getElementById(id.split('__')[0] + 'Label');// in
		// case
		// obj
		// is
		// inside
		// a
		// table
		if (lbl)
			text = lbl.innerHTML + ' : ' + text;
		id = id + 'ErrorEle';
		obj.errorEle = ele;
	}
	ele.innerHTML = ERR_PANEL_PREFIX + text + ERR_PANEL_SUFFIX;
	if (id)
		ele.id = id;
	ele.className = 'fieldErrorEle';
	this.fieldErrorDisplayEle.appendChild(ele);
	this.expandErrorPanel();
};

/*
 * user has clicked on remove icon of an error message
 */
ExilityPage.prototype.fieldErrorRemoveClicked = function(ele) {

	ele = ele.parentNode; // that is the message dom ele to be removed
	// is this associated with a field?
	var fieldObj = null;
	var id = ele.id;
	if (id) {
		id = id.substr(0, ele.id.length - 8); // remove ErrorEle
		fieldObj = this.doc.getElementById(id);
	}
	this.removeErrorFromPanel(fieldObj, false, ele);
};
/*
 * Remove error message related to a field. obj : dom object that represents the
 * field that was in error. If this is not supplied (e.g. error that is not
 * related to a field) ele must be supplied retainPanel : optional. If set to
 * true, container panel is not removed even if this was the last error message
 * ele: error element that needs to be removed. Used when the error panel may
 * not be associated with a field (e.g. error from server)
 */
ExilityPage.prototype.removeErrorFromPanel = function(obj, retainPanel, ele) {
	if (!this.fieldErrorDisplayEle)
		return;
	if (!ele) {
		if (!obj || !obj.errorEle)
			return;

		ele = obj.errorEle;
	}
	if (!ele.parentNode) {
		debug('Invalid elements supplied to removeErrorFromPanel(). obj = '
				+ obj + '=obj ele=' + ele);
		return;
	}

	if (obj)
		delete obj.errorEle;
	ele.parentNode.removeChild(ele);
	if (retainPanel)
		return;

	var n = this.fieldErrorDisplayEle.getElementsByTagName('div');
	if (!n || !n.length)
		this.fieldErrorDisplayMain.style.display = 'none';
};

ExilityPage.prototype.removeAllErrorsFromPanel = function() {
	if (!this.fieldErrorDisplayEle)
		return;

	this.fieldErrorDisplayEle.innerHTML = '';
	this.fieldErrorDisplayMain.style.display = 'none';
};

ExilityPage.prototype.collapseErrorPanel = function() {
	if (!this.fieldErrorDisplayEle)
		return;
	this.fieldErrorDisplayEle.style.display = 'none';
	this.fieldErrorCollapse.style.display = 'none';
	this.fieldErrorExpand.style.display = '';
};

ExilityPage.prototype.expandErrorPanel = function() {
	if (!this.fieldErrorDisplayEle)
		return;
	this.fieldErrorDisplayMain.style.display = 'block';
	this.fieldErrorDisplayEle.style.display = '';
	this.fieldErrorCollapse.style.display = '';
	this.fieldErrorExpand.style.display = 'none';
};

ExilityPage.prototype.listMouseOver = function(obj, tableName, e) {
	if (!e) {
		e = window.event;
	}
	this.tables[tableName].mouseOver(obj, e);
};

ExilityPage.prototype.listMouseOut = function(obj, tableName, e) {
	if (!e) {
		e = window.event;
	}
	this.tables[tableName].mouseOut(obj, e);
};

ExilityPage.prototype.listClicked = function(obj, tableName, evt) {
	this.tables[tableName].clicked(obj, evt);
};

ExilityPage.prototype.listDblClicked = function(obj, tableName, actionName) {
	this.tables[tableName].dblClicked(obj, actionName);
};

ExilityPage.prototype.addTableRow = function(obj, tableName) {
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

ExilityPage.prototype.cloneTableRow = function(obj, tableName) {
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

ExilityPage.prototype.removeTableRows = function(obj, tableName) {
	this.tables[tableName].removeTableRows(tableName);
};

ExilityPage.prototype.removeTableRow = function(evt, obj, tableName) {
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

ExilityPage.prototype.deleteAllTableRows = function(obj, tableName) {
	this.tables[tableName].deleteAllTableRows(!obj.checked);
};

ExilityPage.prototype.deleteTableRow = function(evt, obj, tableName) {
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

ExilityPage.prototype.bulkCheckAction = function(obj, colName, tableName) {
	var table = this.tables[tableName];
	if (table.bulkCheckAction)
		table.bulkCheckAction(obj, colName);
};

ExilityPage.prototype.tabClicked = function(obj, tabbedPanelName,
		tabContainerName) {
	// we have to display the tabbed panel, and hide the panel that is currently
	// visible.
	var newId = obj.id;
	newId = newId.replace(/Right$/, '');
	newId = newId.replace(/Left$/, '');
	obj = this.doc.getElementById(newId);
	if (obj.clickDisabled)
		return;
	if (!tabContainerName)
		tabContainerName = obj.getAttribute('tabcontainername');
	debug('Tab action started for panel name ' + tabbedPanelName
			+ ' when user clicked on ' + newId);
	// current active tab and panel names are stored as global variable in
	// window
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

	// get the panel associated with the tab
	var panel = this.doc.getElementById(tabbedPanelName);
	if (!panel) {
		debug('tab element for tabPanelName ' + tabbedPanelName + ' not found.');
		return;
	}
	// show/hide
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
		return this.win[this.tabClickFunctionName](newId, tabbedPanelName);
	}
	return;
};

ExilityPage.prototype.TWISTED = 'collapsedTwister';
ExilityPage.prototype.NOT_TWISTED = 'expandedTwister';
ExilityPage.prototype.TOP_TWISTED = 'collapsedfieldset';
ExilityPage.prototype.TOP_NOT_TWISTED = 'expandedfieldset';

// twister is cliked on ele, or an internal function wants divName to be
// hidden/shown
ExilityPage.prototype.twist = function(ele, divName) {
	var tpnl = this.doc.getElementById(divName + 'Top');
	var clsName = ele && ele.className;

	// css5 complaint generated code would just set css
	if (clsName == this.TWISTED) // css5 page
	{
		ele.className = this.NOT_TWISTED;
		if (tpnl)
			tpnl.className = this.TOP_NOT_TWISTED;
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
	// debug("twist() ele.id=" + ele.id + ' on panel ' + divName);

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

ExilityPage.prototype.fillList = function(grids, listServiceOnLoad) // Aug 06
// 2009 :
// Bug ID
// 631 -
// suppressDescOnLoad
// is not
// working -
// WeaveIT:
// Venkat
{
	for ( var gridName in this.listServices) {
		var grid = grids[gridName];

		if (!grid)
			continue;
		var listeners = this.listServices[gridName];
		debug('got ' + listeners.length + ' listeners for ' + gridName
				+ ' with first one being '
				+ (listeners[0] && listeners[0].name || 'null'));
		for ( var i = 0; i < listeners.length; i++)
			listeners[i].fillList(grid, null, listeners.keyValue,
					listServiceOnLoad);
	}
};

ExilityPage.prototype.fillReport = function(grids) {
	for ( var gridName in this.reportServices) {
		var grid = grids[gridName];

		if (!grid)
			continue;
		var listeners = this.reportServices[gridName];
		for ( var i = 0; i < listeners.length; i++)
			listeners[i].fillReport(grid, null, listeners.keyValue);
	}
};

ExilityPage.prototype.appendRow = function(tableName, dataRow) {
	this.tables[tableName].appendRow(dataRow);
};

ExilityPage.prototype.insertRow = function(tableName, idx) {
	this.tables[tableName].insertRow(idx);
};

ExilityPage.prototype.goButtonClicked = function(selectionName) {
	var ele = this.doc.getElementById(selectionName);
	if (!ele) {
		debug('ERROR : Dom element for buttonDropDown with name = '
				+ selectionName + ' not found');
		return;
	}
	var idx = ele.selectedIndex;
	if (idx <= 0) {
		// Oct 28 2008 : Incorporating Changes from Tanmay : Aravinda
		message('Please select an action before clicking on GO button', "",
				"Ok", null, null, null);
		ele.focus();
		return;
	}
	var actionName = ele.options[idx].value;
	this.act(ele, selectionName, actionName);
};

ExilityPage.prototype.paginate = function(tableName, action) {
	this.tables[tableName].paginate(action);
};

ExilityPage.prototype.getUnqualifiedNames = function(names) {
	var unames = new Array();
	for ( var i = 0; i < names.length; i++) {
		var uname = names[i];
		var field = this.fields[uname];
		if (!field)
			debug(uname
					+ ' is not a valid field. getUnqualifiedNames will not work properly');
		else if (field.unqualifiedName)
			uname = field.unqualifiedName;
		unames.push(uname);
	}
	return unames;
};

// utility function for local data.
// picks up a row from the grid and copies the columns of this row as values in
// dc.
// the key is the name of the column, and val is the value to match in the
// column to select the row
var addFieldsFormGridToDc = function(dc, grid, key, val) {
	dc.success = false;
	if (!val)
		return false;
	var colIdx = -1;
	var i, j, row;
	var names = grid[0];
	// get the column index for the key column
	for (j = 0; j < names.length; j++) {
		if (names[j] != key)
			continue;
		colIdx = j;
		break;
	}

	if (colIdx < 0)
		return false;

	for (i = 1; i < grid.length; i++) {
		row = grid[i];
		if (row[colIdx] != val)
			continue;
		// we got the row
		for ( var j = 0; j < names.length; j++)
			dc.addValue(names[j], row[j]);
		dc.success = true;
		return i;
	}
};
// another utility function that goes thru a grid, tries to match a column value
// with the supplied value
// and returns a grid with the matching rows, (along with the header) Match is
// assumed when the value
// in the column starts with the supplied value.
// this is specifically designed for a local data js for a description service
var getGridForDescService = function(grid, columnName, valueToMatch) {
	var newGrid = new Array();
	var headerRow = grid[0];
	newGrid.push(headerRow);
	var colIdx = -1;
	var i;
	for (i = 0; i < headerRow.length; i++) {
		if (headerRow[i] == columnName) {
			colIdx = i;
			break;
		}
	}
	if (colIdx == -1) {
		debug(columnName
				+ ' is not a column name in the supplied grid that as the header row '
				+ headerRow);
		return newGrid;
	}

	for (i = 1; i < grid.length; i++) {
		var aRow = grid[i];
		var val = new String(aRow[colIdx]);
		if (val.indexOf(valueToMatch) == 0)
			newGrid.push(aRow);
	}
	return newGrid;
};

// callBack function, to be invoked upon list service response.
var listServiceReturned = function(obj, fieldName, se, listServiceOnLoad) {
	var P2 = se.win.P2;
	var grids = se.dc.grids;
	if (!fieldName) // service was NOT for a specific field or object, but is a
	// geric one. Let us hand over to fillList
	{
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
	// grid name should start with list service id, but it could be having
	// _keyValue after that.
	for ( var gn in grids) {
		if (gn.indexOf(gridName) != 0)
			continue; // starting is good enough for us

		grid = grids[gn];
		if (gn.length > gridName.length) // it has keyValue in that
			keyValue = gn.substring(gridName.length + 1);
		break;
	}

	if (!grid) {
		debug('Error: list service ' + gridName
				+ 'did not come back with a grid name starting with '
				+ gridName);
		return;
	}
	// is it a list for different key?
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

// callBack function, to be invoked upon report service response.
var reportServiceReturned = function(obj, fieldName, se) {
	debug('reportServiceReturned() for object=' + obj + ' with field name '
			+ fieldName);

	var P2 = se.win.P2;
	var grids = se.dc.grids;
	if (fieldName) // service was for a specific field or object
	{
		var field = P2.getField(fieldName);
		// we have a small issue. What is the name of the grid? as of now, there
		// is no scope of two grids coming in
		// when the request is for a specific object. hence we safely use the
		// first one.
		for ( var gridName in grids) {
			if (gridName.indexOf(field.reportServiceId) >= 0) {
				field.fillReport(grids[gridName], obj);
				return;
			}
		}
		// Oct 28 2008 : Incorporating Changes from Tanmay : Aravinda
		debug("design error: " + field.name + ' asked for a list service = '
				+ field.listServiceId
				+ ' but the dc did not have a grid starting with that name',
				"Error", "Ok", null, null, null);
		return;
	}
	// it is a generic one. go thru p2.
	P2.fillReport(grids);
};

ExilityPage.prototype.getWindow = function(windowName) {
	var win = exilityPageStack.activeWindows[windowName];
	if (!win || win.closed)
		return null;
	return win;
};
// Check if any of the enclosing panel of a control is hidden, and make it
// visible
ExilityPage.prototype.makePanelVisible = function(ele) {
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

// called onclick on a checlbox in a checkboxgroup
ExilityPage.prototype.checkBoxGroupChanged = function(obj, groupName) {
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

ExilityPage.prototype.reload = function(scrollLeft, scrollTop) {
	if (this.reloadActionName) {
		window.scrollTo(0, 0);
		this.actions[this.reloadActionName].act();
		return;
	}

	window.scrollTo(scrollLeft, scrollTop);
};

ExilityPage.prototype.setLocalDateFormat = function(format, separator) {
	if (setDateFormat(format, separator))
		return true;
	// Oct 28 2008 : Incorporating Changes from Tanmay : Aravinda
	message(
			format
					+ ' is not a valid date format. Specify one of ddmmyy ddmmmyy ddmmyyyy or mmddyy',
			"Warning", "Ok", null, null, null);
	return false;
};

// a utility function that takes a query string and returns a collection of
// field/values
var queryFieldsToCollection = function(qryStr) {
	debug('going to make a collection out of qry string = ' + qryStr);
	var fields = new Object();
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

var coverPage = function(coverStyle, imgStyle, otherStyle) // Feb 21 2011 : Bug
// 2119 - Spinner
// need not appear
// when there is a
// message displayed
// - Exility App :
// Aravinda
{
	// TODO: do not show this for code/date picker
	var loadingEle = document.getElementById('loading');
	if (loadingEle)
		loadingEle.style.display = '';

	// NOTE : Bhandi 7-Jan-09 document.documentElement.clientHeight/Width did
	// not work for IE
	// bringing it back to scrollWidth and scrollHeight
	if (imgStyle) {
		// alert('going yo cover page');
		imgStyle.width = mainBody.scrollWidth + 'px';
		imgStyle.height = mainBody.scrollHeight + 'px';
		// Oct 21 2008 : Incorporating Changes from Tanmay (Start) : Aravinda
		// imgStyle.width = document.documentElement.clientWidth + 'px';
		// if((document.documentElement.clientHeight-2) > 0)
		// {
		// Oct 28 2008 : Incorporating Changes from Tanmay (End) : Aravinda
		// imgStyle.height = (document.documentElement.clientHeight-2) + 'px';
		// }
	}
	if (coverStyle) {
		coverStyle.display = '';
	}
	if (otherStyle)
		otherStyle.display = '';
};

var uncoverPage = function(coverStyle, otherStyle, imgStyle) // Feb 21 2011 :
// Bug 2119 -
// Spinner need
// not appear
// when there is
// a message
// displayed -
// Exility App :
// Aravinda
{
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

var PendingPicker = function(field, obj, x, y, idx) {
	this.obj = obj;
	this.field = field;
	this.timer = null;
	this.x = x;
	this.y = y;
	this.idx = idx;
};
// for Combo. Refer to common.combo.htm and common/comboTest.htm
ExilityPage.prototype.getComboUrl = function(obj, val, fieldName) {
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

ExilityPage.prototype.inputFocusOut = function(obj, fieldName) {
	debug(fieldName + ' lost focus');
	if (exilComboWin)
		exilComboWin.inputFocusOut();
	var field = this.fields[fieldName];
	/**
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

ExilityPage.prototype.handleGridNav = function(obj, fieldName, e) {
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

ExilityPage.prototype.inputKeyUp = function(ele, fieldName, e) {
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

	/**
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

ExilityPage.prototype.comboCall = function(obj, fieldName, val) {
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
				false, field.fieldToFocusAfterExecution); // Jun 11 2009 : Bug
		// 507 - feild Focus
		// - WeaveIT :
		// Aravinda
		se.keyValue = val;
		this.win.serverStub.callService(se);
	}
};

var comboReturned = function(obj, fieldName, se) {
	var data = se.dc.grids[se.serviceId];
	exilComboWin.comboProcess(data, obj, se.keyValue);
};

ExilityPage.prototype.treeViewExpandCollapseRow = function(objImg, tableName,
		columnName) {
	var table = this.tables[tableName];
	table.treeViewExpandCollapseRow(objImg, columnName);
};

ExilityPage.prototype.treeViewSelectDeselectRow = function(objChk, tableName,
		columnName) {
	var table = this.tables[tableName];
	table.treeViewSelectDeselectRow(objChk, columnName);
};

ExilityPage.prototype.bulkDeleteClicked = function(obj, tableName) {
	var table = this.tables[tableName];
	table.bulkDeleteClicked(obj);
};

ExilityPage.prototype.bulkCheckClicked = function(obj, tableName, columnName) {
	var table = this.tables[tableName];
	table.bulkCheckClicked(obj, columnName);
};

ExilityPage.prototype.treeViewBulkSelectDeselectRow = function(objChk,
		tableName, columnName) {
	var table = this.tables[tableName];
	table.treeViewBulkSelectDeselectRow(objChk, columnName);
};

ExilityPage.prototype.xmlNodeClicked = function(li, fieldName) {
	this.fields[fieldName].changeVisibility(li, null, false);
};

ExilityPage.prototype.xmlTreeExpandAll = function(fieldName) {
	this.fields[fieldName].changeVisibility(null, true, true);
};

ExilityPage.prototype.xmlTreeCollapseAll = function(fieldName) {
	this.fields[fieldName].changeVisibility(null, false, true);
};

// this is a temp funcitonality to take care of issue with IE 7 while sliding.
// If there are any fixed header theader,
// then that portion remains unmoved, till you shake then somehow...
ExilityPage.prototype.ieScrollIssueReset = function() {
	if (!this.headersToBeFixed) {
		this.headersToBeFixed = new Array();
		var eles = this.doc.getElementsByTagName('THEAD');
		for ( var i = 0; i < eles.length; i++) {
			if (eles[i].className = 'fixedheaderthead')
				this.headersToBeFixed.push(eles[i].firstChild);
		}
	}
	for ( var i = 0; i < this.headersToBeFixed.length; i++) {
		this.headersToBeFixed[i].style.margin = '1px';
	}
	for ( var i = 0; i < this.headersToBeFixed.length; i++) {
		this.headersToBeFixed[i].style.margin = '';
	}
};
ExilityPage.prototype.columnClicked = function(obj, tableName, fieldName) {
	// this.tables[tableName].sort(obj, fieldName);
};

ExilityPage.prototype.filterTable = function(obj, tableName, columnName) {
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

ExilityPage.prototype.goFilter = function() {
	var val = document.getElementById('filterField').value;
	this.tableBeingFiltered.filter(this.filterObj, this.filterColumnName, val);
	this.cancelFilter();
};

ExilityPage.prototype.cancelFilter = function() {
	filterDiv.style.display = 'none';
	uncoverPage(coverCalendarStyle);
	this.tableBeingFiltered = null;
	this.filterObj = null;
	this.filterColumnName = null;
};

ExilityPage.prototype.removeFilter = function() {
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
ExilityPage.prototype.checkPageValue = function(field, evt) {

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

ExilityPage.prototype.hideOrShowColumns = function(gridName, columnName,
		displayLists) {
	if (gridName && columnName && displayLists) {
		var columnNames = columnName.split(";");
		var displayList = displayLists.split(";");
		this.tables[gridName].columnName = columnNames;
		this.tables[gridName].displayList = displayList;
		this.tables[gridName].hideOrShowColumns();
	} else
		alert("Kindly verify your parameters! which are supplied for Hidding columns in list panel");
};
ExilityPage.prototype.testService = function(serviceId, testServiceDc) {
	var dc = new DataCollection();
	dc = testServiceDc;

	var se = new ServiceEntry(serviceId, dc, true, testServiceReturned);
	this.win.serverStub.callService(se);
};
// move the focus to next field
ExilityPage.prototype.focusNext = function(field, currentEle) {
	if (currentEle && currentEle.blur)
		currentEle.blur();
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
			/**
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

var testServiceReturned = function(obj, fieldName, se) {
	currentActiveWindow.P2.win.captureResult(se);
};

/*******************************************************************************
 * event listener utility ************** One of the problems in event handling
 * is passing parameters etc.. I allow you to use a method on your object to be
 * called back with event as a sole parameter BY the way, be a responsible
 * programmr, and do remove the listener once you are done.
 ******************************************************************************/
// ele 'click' is what you shoudl supply and not 'onclick'. obj must have a
// method by fName. method fname will receive (e, ele) where e is event and ele
// is the dom element that caused the event.
// keep the returned value to be supplied back to me to remove the listener
ExilityPage.prototype.addListener = function(ele, eventNameWithoutOn, obj,
		fName) {
	// keep all required info as attributes of an object.
	// note that P2 will point to 'this' in the window the element is used.
	var idx = this.nextListenerId;
	this.nextListenerId++;
	var fn = this.win.getEventFunction(idx, fName);
	var newObj = {};
	newObj.obj = obj;
	newObj.ele = ele;
	newObj.name = eventNameWithoutOn;
	newObj.fn = fn;
	this.eventListeners[idx] = newObj;
	if (ele.addEventListener)
		ele.addEventListener(eventNameWithoutOn, fn, false);
	else
		ele.attachEvent('on' + eventNameWithoutOn, fn);
	// debug(idx + ' :' + fName + ' added as on' + eventNameWithoutOn + ' event
	// listener for ele ' + ele.id);
	return idx;
};

// idx should be the one I had returned to you on addListener
ExilityPage.prototype.removeListener = function(idx) {
	var obj = this.eventListeners[idx];
	if (!obj) {
		debug('design Error: '
				+ idx
				+ ' is supplied for removing an event listener, but no event listener is available with that idx');
		return;
	}
	if (obj.ele.removeEventListener)
		obj.ele.removeEventListener(obj.name, obj.fn, false);
	else
		obj.ele.detachEvent('on' + obj.name, obj.fn);
	delete this.eventListeners[idx];
	debug('listener at ' + idx + ' removed');
};
// called when selectionField is clicked with "more option"
ExilityPage.prototype.MORE_OPTION_VALUE = '_more_';
ExilityPage.prototype.moreOptionClicked = function(fieldName, e) {
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

/**
 * project may have space in the index page to show title of the actual
 * transaction page being used at the point. This is called from PageManager on
 * navigation, as well as from P2.init()
 * 
 * @param pageTitle
 */
ExilityPage.prototype.setPageTitle = function() {
	if (window.setPageTitle && this.title) {
		setPageTitle(this.title);
	}
};
