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
