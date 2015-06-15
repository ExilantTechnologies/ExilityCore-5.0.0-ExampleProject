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
