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
