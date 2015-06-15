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
