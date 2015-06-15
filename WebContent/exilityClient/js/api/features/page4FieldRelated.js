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
