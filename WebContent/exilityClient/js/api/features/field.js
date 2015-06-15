/**
 * All Definitions of fields.. In our client MVC design, field represents a
 * control whose value changes at run time. Represents a control that
 * receives/sends data at run time. Concrete classes are defined with methods.
 * Stored in P2.fields collection Refer to corresponding classes in Java under
 * fields folder.
 */
var AbstractField = function() {
	this.value = '';
	/**
	 * index into the array that the table holds, in case this field is part of
	 * a table. -1 implies that this field is not in a table.
	 */
	this.columnIdx = -1;

	this.defaultValue = '';
	this.isEditable = true;
};

/**
 * we use a simple technique to put separators for amounts in Indian, US and
 * European styles
 */
AbstractField.inrPrefixes = [ '', '', '', ',', '', ',', '', ',', '', ',', '',
		',', '', ',', '', ',', '', ',', '', '', '' ];
AbstractField.usdPrefixes = [ '', '', '', ',', '', '', ',', '', '', ',', '',
		'', ',', '', '', ',', '', '', ',', '', '', '', ',', '' ];
/**
 * format the value for output. formatters are added in formatter.js. refer that
 * field for details.
 */
var a = AbstractField.prototype;
a.format = function(val) {
	if (!this.formatter || this.formatter == 'none')
		return val;

	var f = window.fieldFormatters && window.fieldFormatters[this.formatter];
	if (f)
		return f(val);

	debug('Design error: either formatter.js is not included in index page. or '
			+ this.formatter + ' is not a valid formatter.');
	return val;
};

/**
 * this is a half-hearted attempt to remove the separator character from a
 * number that is formatted
 * 
 * @param val
 *            to be formatted
 * @returns formatted value
 */
a.deformat = function(val) {
	formatter = this.formatter;
	if (!formatter || formatter == 'none')
		return val;
	if (formatter.indexOf('eur') != -1)
		return val.replace(/\./g, '');

	return val.replace(/,/g, '');
};

/**
 * set value to this field. This is the controller, and hence it has to do three
 * things. Set value to model, push value the view, and trigger any events
 * associated with this change of value. This method is same as calling
 * saveValue(), setValueToObject() and triggerFieldChangedEvents() in succession
 * 
 * @param val -
 *            value to be set
 * @param ele -
 *            dom element associated with this field. If null, we get the
 *            default dom element associated with this field
 * @param idx -
 *            if this field is part of a table, then the row number to be used.
 *            Defaults to currentRow of teh table
 * @param suppressDesc -
 *            do not trigger descriotion service. This is used to avoid a
 *            perpetual call to description service on return of a descriotion
 *            service.
 * @param formatValue -
 *            value is formatted using the associated data type before settig
 *            teh value
 * @param forceChangedEvents -
 *            force changed events even if the value has actually not changed.
 *            This looks vierd, but we got into this situation because of
 *            historic reasons and to provide backward compatibility
 * @param listServiceOnLoad -
 *            this method is invoked when the listServices fired on load return
 *            with data. This is passed around to avoid triggering fieldChanged
 *            events on teh associated fields
 */
a.setValue = function(val, ele, idx, suppressDesc, formatValue,
		forceChangedEvents, listServiceOnLoad) {
	if (val && formatValue && this.dataType) {
		var dt = dataTypes[this.dataType];
		if (dt)
			val = dt.formatIn(val);
	}
	var oldVal = val;
	/*
	 * if this is inside table, save value in table, and get the element
	 */
	if (this.table) {
		/*
		 * TODO: We have to investigate following statement and document
		 * accordingly. looks like suppressDesc is called ONLY when we are
		 * trying to assign desc fields. rowChanged() may get invoked sevral
		 * times
		 */
		if (suppressDesc) {
			this.table.rowChanged(ele, this.unqualifiedName, idx);
		}

		/*
		 * there are different scenarios. we have to get element and idx in all
		 * cases
		 */
		if (!ele && !idx) {
			/*
			 * if nothing is known, use current row
			 */
			idx = this.table.currentRow;
		}
		if (!idx) {
			/*
			 * Means, ele is given, but not idx. we get idx from the ele.
			 */
			idx = this.table.getRowNumber(ele);
		}
		if (!ele) {
			// note that we definitely have idx now.
			ele = this.P2.doc.getElementById(this.table.getObjectId(this.name,
					idx));
		}
		/*
		 * we have both ele and idx now
		 */
		oldVal = this.table.saveValue(val, this.columnIdx, idx);

		/*
		 * Trigger Aggregate function if user calls setValue explicitly
		 */
		if (this.table.hasAggregates) {
			this.table.aggregateAField(this, ele, idx);
		}
	} else {
		// non-table
		oldVal = this.value;
		this.value = val;

		if (!ele) {
			ele = this.P2.doc.getElementById(this.name);
		}
	}
	if (oldVal != val || forceChangedEvents) {
		if (!ele) {
			debug('Dom element for ' + this.name + ' not found');
			return;
		}

		if (val && formatValue) {
			var newFormattedValue = val;
			if (this.formatter) {
				newFormattedValue = this.format(val);
			}
			this.setValueToObject(ele, newFormattedValue);
		} else if (oldVal != val) {
			this.setValueToObject(ele, val);
		}

		if (this.triggerFieldChangedEvents) {
			this.triggerFieldChangedEvents(val, ele, idx, suppressDesc, true,
					listServiceOnLoad);
		}
	}
};

/**
 * save value into model, and not trigger anything else
 * 
 * @param val
 *            value to be saved
 * @param ele
 *            dom element that triggered this. Used to get row number if
 *            required
 * @param idx
 *            row number in the table to which this value is to be saved
 * @param internalChange
 *            if true, this vaue is set by a script, and not changed by user
 */
a.saveValue = function(val, ele, idx, internalChange) {
	var table = this.table;
	if (!table) {
		this.value = val;
		return;
	}
	if (ele && !idx)
		idx = table.getRowNumber(ele);
	/*
	 * we have an issue with radio buttons in the grid
	 */
	if (ele && ele.type == 'radio' && val == '')
		val = ele.value;
	/*
	 * special case of repeated-column
	 */
	if (table.repeatedField && table.repeatedField === this)
		table.saveRepeatedColumnValue(val,
				ele ? ele.getAttribute('key') : null, idx);
	else
		table.saveValue(val, this.columnIdx, idx, internalChange);
};

/**
 * get value from model
 * 
 * @param idx -
 *            row number if this is inside a table
 * @param toFormat -
 *            get formatted value
 * @param fromDeletedRowAsWell -
 *            special case where a caller wants a value from a grid row that is
 *            marked as deleted. By default we would return null
 * @returns value in the model
 */
a.getValue = function(idx, toFormat, fromDeletedRowAsWell) {
	var val;
	if (this.table)
		val = this.table.getValue(this.columnIdx, idx, fromDeletedRowAsWell);
	else
		val = this.value;
	if (val && toFormat) {
		var dt = dataTypes[this.dataType];
		if (dt)
			val = dt.formatOut(val);
	}
	return val;
};

/**
 * has this field got some value?
 * 
 * @returns true if this field has non-default value
 */
a.hasValue = function() {
	/* value is always in text form */
	if (this.value != null && this.value.length > 0)
		return true;
	return false;
};

/**
 * validate and retturn false in case teh field fails validation. COncrete
 * classes have to implement this methid if required
 * 
 * @param isFinalValidation
 *            if this is the final validation before sending values to server
 *            (false means validatiing when a user changes the value)
 * @return validated (possibly formatted or cleand) value
 * @throws error
 *             object that must be caught an dused for flashing message to user
 */
a.validate = function(isFinalValidation) {
	return this.getValue();
};

/**
 * validate the value and return validated value. returned value could be
 * cleaned-up, and hence it must be used by the caller. Any validation error is
 * handled by this routine before returning
 * 
 * @param val
 *            value to be validated
 * @param ele
 *            dom element that the user used to change this value
 * @param isFinalValidation
 *            is this the final validation that is done before we send it to
 *            server? (else means this is the validation whenuser chnages value)
 * @return formatted or cleaned-up value to be used
 * @throws exception
 *             if validaiton fails
 */
a.validateValue = function(val, ele, isFinalValidation) {
	return val;
};

/**
 * add this field and its value to dc. In case of filter-field etc.. it is the
 * job of this method to add other assoaited values, as the others do not have a
 * field object associated with them
 * 
 * @param dc
 *            to which to add the value
 */
a.fillDc = function(dc) {
	var val = this.getValue(0, true);
	var fieldName = this.unqualifiedName || this.name;
	dc.addValue(fieldName, val);
	this.fillDcWithRelatives(dc);
};

/**
 * add related fields to dc.
 * 
 * @param dc
 *            to which to add the value
 */
a.fillDcWithRelatives = function(dc) {
	if (this.aliasName) {
		dc.addValue(this.aliasName, val);
		dc.addValue(this.aliasName + 'DataType', this.dataType);
	}
	if (this.isFilterField) {
		/*
		 * operator and to fields are associated with filter field
		 */
		var nam = this.name + 'Operator';
		var field = this.P2.fields[nam];
		var val = field.getValue(0, true);
		dc.addValue(nam, val);
		if (this.aliasName) {
			dc.addValue(this.aliasName + 'Operator', val);
		}
		nam = this.name + 'To';
		field = this.P2.fields[nam];
		if (field) {
			val = field.getValue(0, true);
			dc.addValue(nam, val);
			if (this.aliasName) {
				dc.addValue(this.aliasName + 'To', val);
			}
		}
	}
};

/**
 * has this field value in teh view changed from its model? TO be overridden by
 * specialized field if this is not as abvious as checking with ele.value
 * 
 * @param ele
 *            dom element.
 * @returns {Boolean} whether the value in the view has changed
 */
a.isChanged = function(ele) {
	return (this.getValue() != ele.value);
};

/**
 * class that represents an out put field. It's view is typically the innerHTMl
 * of the dom element with this id
 */
var OutputField = function() {
	AbstractField.call(this);
	this.maxCharacters = 0;
	this.isEditable = false;
};

a = OutputField.prototype = new AbstractField;
/**
 * we clip value to max chars as of now. With strict html5, we should be able to
 * use css to create elipses
 * 
 * @param ele
 *            dom alement to be used for rendering value
 * @param val
 *            value to be rendered using the dom element
 */
a.setValueToObject = function(ele, val) {
	if (!ele) {
		debug('ERROR: null object passed to set value to field ' + this.name
				+ ' and val = ' + val);
		return;
	}
	/*
	 * we have the concept of internal value and display value, similar to a
	 * selection field
	 */
	if (this.valueList) {
		/*
		 * we cache the collection indexed by internal value
		 */
		if (!this.valueListCollection) {
			this.valueListCollection = {};
			var vl = this.valueList.split(';');
			for ( var i = 0; i < vl.length; i++) {
				var pair = vl[i].split(',');
				this.valueListCollection[pair[0]] = pair[1];
			}
		}
		var v = this.valueListCollection[val];
		if (v)
			val = v;
		ele.innerHTML = val;
		return;
	}

	/*
	 * we did not have ellipses as an option in css, and hence we have a max
	 * limit to ensure that this field will not run-off. we put the whoel text
	 * as help-text*title)
	 */
	var maxChars = this.maxCharacters == 0 ? 9999 : this.maxCharacters;
	/*
	 * -ve max chars means retain last chars rather than trimming them
	 */
	if (maxChars < 0) {
		maxChars = -maxChars;
	}
	val = new String(val);
	if (val && val.length > maxChars) {
		maxChars -= 3; // for the tree dots
		ele.title = val;
		if (this.maxCharacters < 0)
			val = '...' + val.substring(val.length - maxChars);
		else
			val = val.substring(0, maxChars) + '...';
	} else {
		ele.removeAttribute('title');
	}
	if (val == '') {
		val = '&nbsp;';
	} else {
		if (!this.allowHtmlFormattedText) {
			val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;');
		}
		val = val.replace(/\n/g, '<br />');
	}

	ele.innerHTML = val;
};

/**
 * special case of boolean output fields that require display support
 */
var BooleanOutputField = function() {
	AbstractField.call(this);
	this.trueValue = 'Yes';
	this.falseValue = 'No';
	this.isEditable = false;
};

a = BooleanOutputField.prototype = new AbstractField;
/**
 * render true/false value in this ele
 * 
 * @param ele
 *            dom element to be rendered
 * @param val
 *            value to be rendered
 */
a.setValueToObject = function(ele, val) {
	if (val == '1' || val === 1)
		ele.innerHTML = this.trueValue;
	else
		ele.innerHTML = this.falseValue;
};

/**
 * base class for all input fields
 */
var AbstractInputField = function() {
	AbstractField.call(this);

	this.toBeSentToServer = true;
};

a = AbstractInputField.prototype = new AbstractField;

/**
 * validate the value ins this model, and return current value if it is valid.
 * Throws exception in case of validaiton error, with all required info in the
 * trown object for P2 to manage the error
 * 
 * @param isFinalValidation
 *            false if this is validation after a field chage, true if this is
 *            the validaiton before sending a request to server
 * @returns current value
 * @throws error
 *             object in case of validation error
 */
a.validate = function(isFinalValidation) {
	if (this.doNotValidate) {
		return this.value;
	}
	var doc = this.P2.doc;
	var val = this.value;
	var validatedValue = val;
	var ele;

	/*
	 * validateValue will throw exception in case validaiton fails
	 */
	try {
		validatedValue = this.validateValue(val, null, isFinalValidation);
	} catch (e) {
		ele = doc.getElementById(this.name);
		if (ele)
			ele.isValid = false;
		e.ele = ele;
		e.field = this;
		// hand-over to P2 to render
		throw e;
	}

	/*
	 * If validator returned a different value, let us deal with that
	 */
	if (validatedValue != val) {
		/*
		 * TODO: following statement is useless, as val is this.vale at this
		 * time. Looks like it should be validatedValue. However, we can not fix
		 * it, becauase projects would have used the current behaviour as
		 * feature, and their logic will break if we "fix" this issue. We have
		 * to decide whether there is a need for the intended feature, in which
		 * case, we will have to introduce anotehr keyword for the same
		 */
		this.value = val;
		ele = doc.getElementById(this.name);
		if (ele)
			this.setValueToObject(ele, validatedValue);
	}
	return val;
};

/**
 * validate the value and return validated value. returned value could be
 * cleaned-up, and hence it must be used by the caller. Any validation error is
 * handled by this routine before returning
 * 
 * @param val
 *            value to be validated
 * @param dt
 *            data type to be used. If not passed, data type associated with
 *            this field
 * @param isFinalValidation
 *            is this the final validation that is done before we send it to
 *            server? (else means this is the validation whenuser chnages value)
 * @param linkedTable
 *            in case this is coming from a linked-table
 * @return formatted or cleaned-up value to be used
 * @throws exception
 *             if validaiton fails
 */
a.validateValue = function(val, dt, isFinalValidation, linkedTable) {

	if (this.multipleSelection && this.selectionValueType != 'text')
		return this.specialValidateValue(val);

	var otherFieldName, otherField, otherValue;

	if (!dt && this.dataType)
		dt = dataTypes[this.dataType];
	/*
	 * this logic is quite convoluted, and made for a specific case in some
	 * product. Looks like this feature is not used any more.
	 */
	if (exilParms.validateDatesForBetween && PM.pageValidation && dt
			&& dt.basicType == 'DATE' && (this.isFilterField || this.fromField)) {
		this.filterToFieldExists();
	}

	if (!this.requiresValidation || this.doNotValidate)
		return val;

	val = trim(val);
	/*
	 * let us start with the case when value is not entered
	 */
	if (!val) {
		this.validateOnEmpty(linkedTable);
		return val;
	}

	/*
	 * next, ask dataType if this value is OK.
	 */
	if (!dt) {
		debug(this.name
				+ " is not validated because it does not have a valid data type");
		return val;
	}

	val = dt.validate(val, this.messageName);

	/*
	 * is there an additional validaiton function?
	 */
	if (this.validationFunction) {
		var errText = this.P2.win[this.validationFunction](val);
		if (errText)
			throw new ExilityError(errText, val);
	}

	/*
	 * descipiton service based validation may be pending!
	 */
	if (isFinalValidation && this.descServiceId) {
		// see if the object is validated already
		otherFieldName = this.name;
		if (this.table)
			otherFieldName = this.table.getObjectId(this.name);
		var ele = this.P2.doc.getElementById(otherFieldName);
		if (!ele) {
			message("Design Error: Object for " + otherFieldName
					+ " is not available during final validation", "Error",
					"Ok", null, null, null);
			return val;
		}
		if (ele.pendingServiceRequest) {
			throw new ExilityError(
					"A call to server is still pending. Please submit again.");
		}
		if (ele.isValid === false) {
			throw new ExilityError("Invalid value");
		}
	}

	/*
	 * inter-field validation. Note that the other field may have to be
	 * picked-up from the linked table.
	 */

	otherFieldName = this.fromField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName.replace(this.table.name,
					linkedTable.name);
		}
		otherField = this.P2.getField(otherFieldName);
		otherValue = otherField && otherField.getValue();
		if (otherValue) {
			dt.validateFromTo(otherValue, val, otherField.label, this.label);
		}
	}
	// to field?
	otherFieldName = this.toField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName.replace(this.table.name,
					linkedTable.name);
		}
		otherField = this.P2.getField(otherFieldName);
		otherValue = otherField && otherField.getValue();
		if (otherValue) {
			dt
					.validateFromTo(val, otherValue, this.label,
							otherFieldName.label);
		}
	}

	// other field?
	otherFieldName = this.otherField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName.replace(this.table.name,
					linkedTable.name);
		}

		otherField = this.P2.getField(otherFieldName);
		otherValue = otherField && otherField.getValue();
		if (otherValue && val == val1) {
			throw new ExilityError(this.label + ' and ' + otherField.label
					+ ' should have different values.');
		}
	}

	return val;
};

/**
 * if either this field is a filter field, or the fromField of this field is a
 * filter field (I can't think of how that can be, but the logic is there :-)
 * )then ensure tha either both values are there, or both fields are empty. Note
 * that we DO NOT validate the value, but simply check whether the fields have
 * value. As per our standard design, to and operator fields are never
 * generated. Looks like some one had tweaked something in between
 * 
 * @throws exception
 *             in case tehvalues are not consistent
 */
a.filterToFieldExists = function() {
	var otherField = null;
	var operatorField = null;

	if (this.isFilterField) {
		otherField = this.P2.getField(this.name + 'To');
		operatorField = this.P2.getField(this.name + 'Operator');
	} else if (this.fromField) {
		otherField = this.P2.getField(this.fromField);
		if (!otherField.isFilterField) {
			return;
		}
		operatorField = this.P2.getField(this.fromField + 'Operator');
	} else { // it is fine.
		return;
	}

	if (!otherField || !operatorField) {
		debug('Other field for special filter validation could not be found in dom. Validation dropped');
		return;
	}
	var val = operatorField.getValue();
	if (val != 6) {
		return;
	}
	if ((this.vale && !otherField.value) || (!this.value && otherField.value)) {
		throw new ExilityError("exilBetweenError");
	}
};

/**
 * validate this field when there is nno value. Throw exception if it is an
 * error
 * 
 * @param linkedTable -
 *            if this field is in a linked table, null if not.
 * @throws exception
 *             in case this field requires value at this time
 */
a.validateOnEmpty = function(linkedTable) {
	if (this.isRequired) {
		throw new ExilityError("exilValueRequired");
	}
	/*
	 * is it mandatory based on onother field?
	 */
	var otherFieldName = this.basedOnField;
	if (!otherFieldName) {
		return;
	}
	if (linkedTable) {
		/*
		 * remember, if there is a linked table, we have to get the value from
		 * that table, and not this panel
		 */
		otherFieldName = this.basedOnField.replace(this.table.name,
				linkedTable.name);
	}
	var val = this.P2.getFieldValue(otherFieldName);
	if (!val) {
		return;
	}
	/*
	 * does it further depend on specific value in the other field?
	 */
	if (!this.basedOnFieldValue || val == this.basedOnFieldValue)
		throw new ExilityError("exilValueRequired");
};

/**
 * carry out inter-field validations
 * 
 * @param val
 *            value to be validated
 * @param dt
 *            data type of this field
 * @param linkedTable -
 *            if this was from a linked table, null if not
 * @throws exception
 *             in case of any validation error
 * 
 */
a.interFieldValidate = function(val, dt, linkedTable) {
	var otherFieldName, otherValue;

	otherFieldName = this.fromField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName(this.table.name, linkedTable.name);
		}
		otherValue = this.P2.getFieldValue(otherFieldName);
		if (otherValue)
			dt
					.validateFromTo(otherValue, val, this.fromField.label,
							this.label);
	}
	// to field?
	otherFieldName = this.toField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName(this.table.name, linkedTable.name);
		}
		otherValue = this.P2.getFieldValue(otherFieldName);
		if (otherValue)
			dt.validateFromTo(val, otherValue, this.label, this.toField.label);
	}

	// other field?
	otherFieldName = this.otherField;
	if (otherFieldName) {
		if (linkedTable) {
			otherFieldName = otherFieldName.replace(this.table.name,
					linkedTable.name);
		}

		otherValue = this.P2.getFieldValue(otherFieldName);
		if (otherValue && val == otherValue) {
			throw new ExilityError(this.label + ' and '
					+ this.P2.fields[this.otherField].label
					+ ' should have different values.');
		}
	}
};

/**
 * call descriotion service for this field. This is called on change of this
 * field value.
 * 
 * @param ele
 *            doem element that triggered this event. This is used when the
 *            field is inside a table
 * @param idx -
 *            row number in the table if this field is inside a table
 */
a.callDescService = function(ele, idx) {
	/*
	 * If user changes a field with desc, and then directly clicks on submit
	 * field without tabbing out of the field,we get to a loop, because of which
	 * we use a timer to handle this crisis
	 */
	if (this.P2.pendingDescTimer) {
		ele = this.descObj;
		ele.internalChange = false;
		this.descObj = null;
		idx = this.descIdx;
		this.descIdx = 0;
		this.P2.pendingDescTimer = null;
	} else {
		ele.internalChange = true;
	}
	var dc = new DataCollection();
	var allOK = this.P2.fillDcFromQueryFields(dc, this.descQueryFields,
			this.descQueryFieldSources, idx, this.validateQueryFields);
	if (allOK) {
		var se = new ServiceEntry(this.descServiceId, dc, false, descReturned,
				ele, this.name, ServerAction.NONE, null, null,
				this.fieldToFocusAfterExecution);
		this.P2.win.serverStub.callService(se);
		ele.pendingServiceRequest = true;
	}
};

/**
 * trigger all events meant for value-changes for this field
 * 
 * @param val -
 *            new value of this field
 * @param ele -
 *            dom element that triggered this change
 * @param idx -
 *            row number of this element if this fields is in table
 * @param supressDesc -
 *            if true, we shoudl not trigger description service again. This is
 *            to avoid
 * @param internalChange
 *            if true, this is an internal change, else user has changed the
 *            value of this field
 * @param listServiceOnLoad
 *            is this triggered becaue of listservice that returned a value on
 *            load?
 */
a.triggerFieldChangedEvents = function(val, ele, idx, supressDesc,
		internalChange, listServiceOnLoad) {
	if (!supressDesc && this.descServiceId) {
		if (val == '') {
			this.setDescFields(ele, null, true, internalChange,
					listServiceOnLoad);

		} else if (!this.isUniqueField || this.P2.pageMode != 'modify') {
			ele.pendingServiceRequest = true;
			ele.internalChange = internalChange;
			var dc = new DataCollection();
			/*
			 * Passing the value to fillDcFromQueryFields for repeating columns.
			 */
			var allOK = this.P2.fillDcFromQueryFields(dc, this.descQueryFields,
					this.descQueryFieldSources, idx, this.validateQueryFields,
					val);
			if (allOK) {
				var se = new ServiceEntry(this.descServiceId, dc, false,
						descReturned, ele, this.name, ServerAction.NONE, null,
						null, this.fieldToFocusAfterExecution,
						listServiceOnLoad);
				this.P2.win.serverStub.callService(se);
			}
			/*
			 * rest of the processing will continue after the descservice return
			 */
			return;
		}
	}

	if (this.dependentSelectionField)
		this.manageDependentLists(val, idx, listServiceOnLoad);

	/*
	 * very special case. Is this from/to field, and has it now made that field
	 * valid? TODO: this has two issues. 1. it is possible that a field may have
	 * both fromField and toField
	 * 
	 * 2. fn.dependentSelectionField is wrong because fn is field name.
	 * 
	 * However, existing projects are working fine with this bug, and if we fix
	 * this, they will have issue. Hence we leave it as it is
	 */
	var fn = this.fromField || this.toField;
	if (fn && fn.dependentSelectionField) {
		var f = this.P2.fields[fn];
		var fval = f.getValue(idx);
		if (fval)
			f.manageDependentLists(val, idx, listServiceOnLoad);
	}

	/*
	 * do we have a copyTo field?
	 */
	if (val && this.copyTo) {
		var copyToField = this.P2.getField(this.copyTo);
		if (copyToField) {
			var existingValue = copyToField.getValue(idx);
			/*
			 * we are not supposed to over-ride existing value in that field
			 */
			if (!existingValue) {
				copyToField.setValue(val, null, idx,
						copyToField.supressDescOnLoad, false);
			}
		}
	}

	if (this.onChangeActionName) {
		debug('on change triggered for ' + this.name + ' onchange = '
				+ this.onChangeActionName);
		this.P2.act(ele, this.name, this.onChangeActionName, val);
	}

	if (this.onUserChangeActionName && !internalChange) {
		debug('on user change triggered for ' + this.name + ' onchange = '
				+ this.onUserChangeActionName);
		this.P2.act(ele, this.name, this.onUserChangeActionName, val);
	}

	if (this.isFilterOperator)
		this.filterSelectionChanged(ele, val);
};

/**
 * manage dpendent selection fields when this field value changes
 * 
 * @param val
 *            new value
 * @param idx
 *            row number in the table if relevant
 * @param listServiceOnLoad
 */
a.manageDependentLists = function(val, idx, listServiceOnLoad) {
	var fieldNames = this.dependentSelectionField;
	for ( var i = 0; i < fieldNames.length; i++) {
		var field = this.P2.fields[fieldNames[i]];
		if (!field) {
			debug(' field '
					+ fieldNames[i]
					+ ' is not found when it is tried as a dependent selection field for '
					+ this.name);
			continue;
		}
		if (!field.listServiceId) {
			debug(field.name
					+ ' is defined as a dependent selection field for '
					+ this.name + '. But ' + field.name
					+ ' does not have a listServiceId.');
			continue;
		}
		var newObjId = field.name;
		if (field.table)
			newObjId = field.table.getObjectId(newObjId, idx);
		var newObj = this.P2.doc.getElementById(newObjId);
		if (newObj) {
			if (newObj.keyValue == val) // it has the same value..
				return;
			newObj.keyValue = val;
		}
		if (val) {
			/*
			 * any value that may get changed now is an internal chnage
			 */
			field.callListService(val, newObj, idx, true);
		} else {
			field.fillList(null, newObj);
			if (field.getValue())
				field.saveValue('', newObj, idx, true);
		}
	}
};

/**
 * this is a function and not a method. this funciton is attached as call-back
 * function for serverAgent
 * 
 * @param ele -
 *            dom element that had trigegred this call to server
 * @param fieldName
 *            name of the field that had requested this service
 * @param se
 *            service entry that has all details about the call to server. We
 *            will get the dc from this
 */
var descReturned = function(ele, fieldName, se) {
	ele.pendingServiceRequest = null;
	/*
	 * se has serviceId and dc. dc has a grid with the name = serviceId, in
	 * which data is returned..
	 */
	var data = se.dc.grids[se.serviceId];
	se.win.P2.fields[fieldName].setDescFields(ele, data, false,
			ele.internalChange, se.listServiceOnLoad);
};
/**
 * Look at the data returned from description service, and assin values from the
 * data to corresponding fields. This method is also called toreset description
 * fields when this field value is changed (before requesting a desciption
 * service)
 * 
 * @param ele
 *            dom element that triggered this event
 * @param data
 *            returned from server, or null if this is called to reset
 *            description fields
 * @param toReset
 *            reset desc fields
 * @param internalChange
 *            true if this is triggered when the value is changed internally,and
 *            not by user
 * @param listServiceOnLoad
 *            true if this is triggered because of list service on load
 */
a.setDescFields = function(ele, data, toReset, internalChange,
		listServiceOnLoad) {
	var fieldNames = this.descFields;
	if (!fieldNames) {
		debug('descFields property is not set for ' + this.name
				+ '. Code picker will not show any values');
		return;
	}

	/*
	 * fieldNames would be qualified (tableName_fieldName) but column heading in
	 * data is unqualified. So, let us get unqualified names for mathching
	 */
	var namesToMatch = this.P2.getUnqualifiedNames(fieldNames);
	var idx = 0;
	/*
	 * we do not use currentRow of table because th euser might have clicked on
	 * a different row when the description service returns asynchronously from
	 * the server
	 */
	if (this.table)
		idx = this.table.getRowNumber(ele);

	/*
	 * isUniqueField means that the desc service is used to cheque uniqueness of
	 * this field. And hence we do not expect data.
	 */
	if (this.isUniqueField && this.P2.pageMode == 'add') {
		if (data && data.length > 1 && !this.doNotValidate) {
			ele.isValid = false;
			var e = new ExilityError(this.descMessageId
					|| 'Value already exists');
			e.field = this;
			e.obj = ele;
			this.P2.catchError(e);
		} else
			ele.isValid = true;
		return;
	}

	var namesInTable = null; // header row from table
	var n = 0; // nbr names above
	var fieldName = null; // in the header of data
	var nameToMatch = null; // corresponding name on the client
	var vals = null; // data row from server to be used
	var val = null;
	var dataFound = false; // did we find a data row that matches the value?

	var isCombo = (this.comboDisplayFields && exilComboWin);

	if (data && data.length > 1) // data exists
	{
		ele.isValid = true;
		dataFound = true;
		namesInTable = data[0];
		n = namesInTable.length;
		vals = data[1];

		/**
		 * programmers tend to reuse the combo-service as description service as
		 * well. While this is not a good design, this has been working for them
		 * in general. We had assumed that there will be exactly one row coming
		 * back from the server, and, in case of more than one rows, we simply
		 * picked-up the first one. This needs to be refined for combo. We do
		 * not take anything for granted. We check again whether there is a row
		 * with the desired value.
		 */
		if (isCombo && data.length > 2) {
			var dataRowIdx = findRowIndex(data, ele.value);
			if (dataRowIdx > 0) {
				vals = data[dataRowIdx];
			} else {
				/*
				 * this is the case when the value is not valid, but it is
				 * "contained" in other valid values. just simulate as no rows
				 * in data
				 */
				dataFound = false;
				vals = null;
				if (!this.doNotValidate) {
					ele.isValid = false;
				}
			}
		}

	} else {
		if (data && !this.doNotValidate) {
			ele.isValid = false;
			dataFound = false;
		}
	}

	var thisFieldValue = null;
	var m = fieldNames.length;
	for ( var i = 0; i < m; i++) {
		fieldName = fieldNames[i];
		if (!fieldName)
			continue;
		nameToMatch = namesToMatch[i];
		val = '';
		if (dataFound) {
			if (this.doNotMatchDescNames) {
				if (i <= n)
					val = vals[i];
			} else {
				for ( var j = 0; j < n; j++) {
					if (nameToMatch == namesInTable[j]) {
						val = vals[j];
						break;
					}
				}
			}
		}

		if (fieldName == this.name) {
			/*
			 * it is this field. We will handle it outside the loop
			 */
			thisFieldValue = val;
		} else {
			this.P2.setFieldValue(fieldName, val, null, idx, false, true,
					listServiceOnLoad);
		}
	}

	if (dataFound) {
		if (!thisFieldValue)
			thisFieldValue = this.getValueFromObject(ele);
		/*
		 * If this desc is a combo service then it should trigger change events
		 * after setting the data
		 */
		if (!(this.doNotValidate && exilParms.donotSetFirstDescValue)
				|| isCombo) {
			/*
			 * we need to set this value and continue to trigger other field
			 * changed events
			 */
			this.saveValue(thisFieldValue, ele, idx);
			this.setValueToObject(ele, thisFieldValue);
			if (this.table)
				this.table.rowChanged(ele, this.unqualifiedName, idx,
						internalChange);
			this.triggerFieldChangedEvents(thisFieldValue, ele, idx, true,
					internalChange, listServiceOnLoad);
		}
	} else if (!toReset) {
		/*
		 * we have to continue with triggering field changed events other than
		 * description service
		 */
		this.triggerFieldChangedEvents('', ele, idx, true, internalChange,
				listServiceOnLoad);
		if (!this.doNotValidate) {
			val = 'invalid ' + this.label;
			message(val, "Warning", "Ok", null, null, null);
			try {
				if (ele.select)
					ele.select();
				if (ele.focus)
					ele.focus();
			} catch (ex) {
				/*
				 * we just try to focus the field. If the field is shy, let us
				 * not loose our sleep on that :-)
				 */
			}
		}
	}
};

/**
 * set min and max date for this field, if it happens to be a date field. These
 * values over-ride the ones set by the underlying data type. Leave either min
 * or max null if you do not want to over-ride, or if you want to reset a value
 * that was set earlier
 * 
 * @param min
 *            minimum date optional
 * @param max
 *            maximum date optional
 */
a.setMinMax = function(min, max) {
	this.minDate = min;
	this.maxDate = max;
};

/**
 * when operator field in filter field changed. Note that this dom element is
 * not associated directly with a field. Hence we have to striggle with this a
 * bit
 * 
 * @param ele
 *            dom element that changed
 * @param val
 *            changed value
 */
a.filterSelectionChanged = function(ele, val) {
	var id = ele.id;
	/*
	 * knock-off 'Operator' from that rememebr substr(start, length) while
	 * substring(start, end)
	 */
	id = id.substr(0, id.length - 8);
	var toEle = this.P2.doc.getElementById(id + 'ToDiv');
	if (val == 6) {
		toEle.style.display = '';
	} else if (toEle) {
		toEle.style.display = 'none';
		// reset value in the to-field, so that from-to validation is disabled
		this.P2.setFieldValue(id + 'To', '');
	}
};

/**
 * 
 */
var TextInputField = function() {
	AbstractInputField.call(this);

	this.requiresValidation = true;
	this.minCharsToTriggerService = 0;
	// for the time being server side always return matching grid of max 5 rows.
	this.maxRowsToDisplay = 7;

};
a = TextInputField.prototype = new AbstractInputField;

/**
 * set value to dom element
 * 
 * @param ele
 *            dom element
 * @param val
 *            value to be set
 */
a.setValueToObject = function(ele, val) {
	var dt = dataTypes[this.dataType];
	if (!dt || !dt.includesTime) {
		ele.value = val;
		return;
	}

	var values = getDateTimeParts(val); // defined in utils.js
	var eles = this.getTimeObjects(ele);
	if (eles.dt) {
		eles.dt.value = values.dt;
	}
	if (eles.hr) {
		eles.hr.value = values.hr;
	}
	if (eles.mn) {
		eles.mn.value = values.mn;
	}
	if (eles.sc) {
		eles.sc.value = values.sc;
	}
	if (eles.am) {
		eles.am.selectedIndex = values.am;
	}
};

/**
 * get value from dom element
 * 
 * @param ele
 *            dom element
 * @returns value from dom element, or null in case of error
 */
a.getValueFromObject = function(ele) {
	var dataType = dataTypes[this.dataType];
	if (!dataType || !dataType.includesTime) {
		return ele.value = trim(ele.value);
	}
	// tricky job of picking-up pieces from date and time fields.
	var eles = this.getTimeObjects(ele);

	var dt = eles.dt.value;
	/*
	 * if date field is not entered, we ignore time fields....
	 */
	if (!dt) {
		return '';
	}

	var hr = (eles.hr && eles.hr.value) || '0';
	hr = parseInt(hr, 10) || 0;
	if (eles.am && eles.am.selectedIndex) {
		hr += 12;
	} else if (hr < 10) {
		hr = '0' + hr;
	}
	var mn = (eles.mn && eles.mn.value) || '00';
	var sc = (eles.sc && eles.sc.value) || '00';
	return dt + ' ' + hr + ':' + mn + ':' + sc;
};

/**
 * returns an object that has all html elements corresponding to time fields
 * 
 * @param ele
 *            dom element of main field
 * @returns object with attrbutes dt, mn, sc, and am as other dom elements for
 *          showing time
 */
a.getTimeObjects = function(ele) {
	var nam = this.name;
	if (this.table && ele.rowIdx)
		nam = nam + '__' + ele.rowIdx;
	var doc = this.P2.doc;
	return {
		dt : doc.getElementById(nam + 'Hr'),
		mn : doc.getElementById(nam + 'Mn'),
		sc : doc.getElementById(nam + 'Sc'),
		am : doc.getElementById(nam + 'Am')
	};
};

/**
 * class that represents a check-box in dom
 */
var CheckBoxField = function() {
	AbstractInputField.call(this);
	this.isChecked = false;
	/*
	 * default value of checked-unchecked. This may be over-ridden by attribute
	 * set in meta.js
	 */
	this.checkedValue = exilParms.checkedValue;
	this.uncheckedValue = exilParms.uncheckedValue;
};

a = CheckBoxField.prototype = new AbstractInputField;
/**
 * notion of value is different from that in HTML. Hence we keep track of its
 * checked status as well
 */
a.initialize = function() {
	if (this.isChecked)
		this.value = this.checkedValue;
	else
		this.value = this.uncheckedValue;
};

/**
 * get value from dom element
 * 
 * @param ele
 *            dom element to get the value from
 * @returns text value of teh dom element
 */
a.getValueFromObject = function(ele) {
	if (ele.checked) {
		return this.checkedValue;
	}
	return this.uncheckedValue;
};

/**
 * has this field a value? We condier checked as value, and unchecked as no
 * value
 * 
 * @returns true if this field is checked, false otherwise
 */
a.hasValue = function() {
	return this.isChecked;
};

/**
 * set value to object
 * 
 * @param ele
 *            dom element to which valoue is to be set to
 * @param val
 *            value to be set
 */
a.setValueToObject = function(ele, val) {
	var uval = val.toUpperCase();
	if (val == ele.value || val == this.checkedValue || val == '1'
			|| uval == 'Y' || uval == 'YES' || uval == "TRUE") {
		ele.checked = this.isChecked = true;
	} else {
		ele.checked = this.isChecked = false;
	}
};

/**
 * as per MVC principles, we do not need a view for hidden field. with html5
 * version, we have decided nnot to render hiddenFields. They are part of P2,
 * but not DOM
 */
var HiddenField = function() {
	AbstractInputField.call(this);
	this.isEditable = false;
};

a = HiddenField.prototype = new AbstractInputField;

/**
 * set value, but only if dom ele exists
 * 
 * @param ele
 *            do element
 * @param val
 *            value to be set
 */
a.setValueToObject = function(ele, val) {
	if (ele) {
		ele.value = val;
	}
};

/**
 * get the value from dom element. deprecated, but kept for backward
 * compatibility
 * 
 * @param ele
 *            domelement to get value from
 * @returns value from dom
 */
a.getValueFromObject = function(ele) {
	if (ele) {
		return ele.value;
	}
	debug("Hidden field shoudl not be used as a dom element. use P2.getFieldValue(fieldName) instead.");
	return null;
};

/**
 * class for a radio button
 */
var RadioButtonField = function() {
	AbstractInputField.call(this);
	this.isRadio = true;
};

a = RadioButtonField.prototype = new AbstractInputField;

/**
 * get the inupt elements of this radio group. two schemes are possible
 * 
 * new way : <div id="name"....><div class="radio"><input type="radio" ..></div><div
 * class="radioLabel">label</div> etc... </div>
 * 
 * old way : <span id="name" ...><input ..><span>label</label>etc..</span>
 * 
 * @param ele
 *            dom element that is associated with this event.
 * @returns array of input elements associated with this radio group. null if we
 *          can not find them.
 */
a.getInpuElements = function(ele) {
	if (ele.type) {
		ele = ele.parentNode;
	}
	if (!ele.id) {
		ele = ele.parentNode;
	}
	var eles = ele.getElementsByTagName('input');
	if (!eles || !eles.length) {
		debug('Design error: Radio buttons for field ' + this.name
				+ ' not found in the dom');
		return null;
	}
	return eles;
};

/**
 * set value to the dom element
 * 
 * @param ele
 *            dom element
 * @param val
 *            value to be set
 */
a.setValueToObject = function(ele, val) {
	var eles = this.getInpuElements(ele);
	if (!eles) {
		return;
	}
	var gotChecked = false;
	for ( var i = 0; i < eles.length; i++) {
		ele = eles[i];

		if (!gotChecked && ele.value == val) {
			ele.checked = true;
			gotChecked = true;
		} else
			ele.checked = false;
	}
	/*
	 * if we have checked a radio, we are done
	 */
	if (gotChecked)
		return;

	/*
	 * let us check the button for default value
	 */
	if (!this.defaultValue)
		return;

	for ( var i = 0; i < eles.length; i++) {
		ele = eles[i];
		if (ele.value == this.defaultValue) {
			ele.checked = true;
			return;
		}
	}
};

/**
 * get value from dom element
 * 
 * @param ele
 *            dom element
 * @returns value from teh dom element, null if value cannot be fetched
 */
a.getValueFromObject = function(ele) {
	var eles = this.getInpuElements(ele);
	if (!eles) {
		debug('Design error: Radio buttons for field ' + this.name
				+ ' not found in the dom');
		return null;
	}

	for ( var i = 0; i < eles.length; i++) {
		ele = eles[i];
		if (ele.checked)
			return ele.value;
	}
	/*
	 * no element selected.
	 */
	return '';
};

/**
 * call the list service associated with this field
 * 
 * @param val
 *            value of the key that triggered this call.
 * @param ele
 *            dom element that this field is currently associated, in a table
 *            context - optional
 * @param idx
 *            row number if this is inside a table context - optional
 * @param listServiceOnLoad
 *            if this is triggered as part of autoload
 */
a.callListService = function(val, ele, idx, listServiceOnLoad) {
	if (!ele) {
		var id = this.name;
		if (this.table)
			id = this.table.getObjectId(this.name, idx);
		ele = this.P2.doc.getElementById(id);
	}

	/*
	 * if field values change, dependent field may trigger list service in quick
	 * seccession. AND, if they do not come back in the same order, we will be
	 * in trouble. Let us remember the last key, so that the object can detect
	 * and reject old obsolete lists
	 */
	if (ele) {
		if (val)
			ele.listServiceKey = val;
		else if (ele.listServiceKey)
			delete ele.listServiceKey;
		debug(this.name + ' will expect a list service key value of '
				+ ele.listServiceKey);
	}

	var grid;
	grid = [ [ 'serviceId', 'keyValue' ], [ this.listServiceId, val ] ];

	this.P2.callListService(grid, ele, this.name,
			this.listServiceQueryFieldNames, this.listServiceQueryFieldSources,
			idx, listServiceOnLoad);
};

/**
 * render the value list into dom
 * 
 * @param grid
 *            rows of valid values, with first row as header, first column as
 *            internal value, and second column as display value
 * @param ele
 *            dom element
 * @param doNotSelect
 *            if true, then no value is selected. This parameter is checking for
 *            negative, as it got added later during a refactoring process
 * @param listServiceOnLoad
 *            true if this is triggered onLoad
 */
a.fillListToObject = function(grid, ele, doNotSelect, listServiceOnLoad) {
	this.grid = grid;
	var txt = '';
	var n = grid && grid.length;
	if (n && n > 1) {
		if (!this.htmlParts) {
			if (!this.init()) {
				debug("Error while initializing " + this.name
						+ " radio button field. ");
				return false;
			}
		}
		/*
		 * get all radio options as inner html. remember htmlParts has three
		 * parts. we have to do part1 + innerValue + part2 + displayValue +
		 * part3 for each row
		 */
		var t = [];
		for ( var i = 1; i < n; i++) {
			var row = grid[i];
			t.push(this.htmlParts[0]);
			t.push(row[0]);
			t.push(this.htmlParts[1]);
			t.push(row[1] || row[0]);
			t.push(this.htmlParts[2]);
		}
		txt = t.join('');
	}
	ele.innerHTML = txt;
	// set the value to this
	if (!doNotSelect)
		this.setValueToObject(ele, this.value);
};

/**
 * assign list of values to this field.
 * 
 * @param grid
 *            data with a header row that has the list of values for this field.
 *            First column is internal value and second column is display value
 * @param ele
 *            dom element associated with this field. passed if this is inside a
 *            table. Otherwise we use default one
 * @param keyValue
 *            if the list of valid values depends on a key (like countryCode for
 *            list of states) then the key value that is associated with the
 *            grid that is received
 * @param listServiceOnLoad
 *            true if this is triggered onLoad, false if it is triggered later
 */
a.fillList = function(grid, ele, keyValue, listServiceOnLoad) {
	/*
	 * non-able case is simpler..
	 */
	if (!this.table) {
		if (!ele)
			ele = this.obj;
		this.fillListToObject(grid, ele, false, listServiceOnLoad);
		return;
	}

	var id = null;
	var doc = this.P2.doc;
	/*
	 * is it for a specific row of a grid?
	 */
	if (!this.sameListForAllRows) {
		if (!ele) {
			id = this.table.getObjectId(this.name);
			ele = doc.getElementById(id);
			if (!ele) {
				debug("Unable to get the dom object for field " + this.name
						+ " for assigning the value list we got from server.");
				return;
			}
		}
		this.fillListToObject(grid, ele, false, listServiceOnLoad);
		return;
	}
	/*
	 * this is the case of a table in which the valid values are same across all
	 * rows. This MUST be called onLoad, or at least before the table receives
	 * data
	 */
	this.fillListToObject(grid, this.obj, true, listServiceOnLoad);

	var table = this.table;

	/*
	 * we have to push it to fields in all rows first into the row that is
	 * cashed
	 */
	var n = table.nbrRows;
	var tableData = table.grid;
	for ( var i = 1; i <= n; i++) {
		var row = tableData[i];
		if (!row)
			continue;
		id = table.getObjectId(this.name, i);
		ele = doc.getElementById(id);
		if (ele)
			this.fillListToObject(grid, ele, false, listServiceOnLoad);
		else
			debug(id + ' is not a DOM element for field name ' + this.name
					+ ' when we tried it to push a radio list to it');
	}
};

/**
 * page has <div id="name"...> with its innerHTML having two instances of '---' :
 * first one for internal value, and second one for display value. We can
 * recreate the inner html with repeating this pattern for each values in the
 * value list
 * 
 */
a.init = function() {
	var ele = this.P2.doc.getElementById(this.name);
	if (!ele) {
		debug('Design Error: dom element with id=' + this.name
				+ ' as a radio group is not found');
		return false;
	}
	/*
	 * innerHTML is the meant for one value, with '---' as place holder for
	 * value and label. We strip this and keep into an array for a convenient
	 * way of creating innerHTML for all values.
	 */
	this.htmlParts = ele.innerHTML.split('---');
	ele.innerHTML = '';
	/*
	 * generater hides it to ensure that '---' are not visible by default
	 */
	ele.style.visibility = 'visible';
	return true;
};

/**
 * class for a Text area element of html
 */
var TextAreaField = function() {
	AbstractInputField.call(this);

	this.requiresValidation = true;
	this.numberOfRows = 3;
	this.numberOfCharactersPerRow = 40;
};
a = TextAreaField.prototype = new AbstractInputField;

/**
 * get value from domelement
 * 
 * @param ele
 *            domelement to get value from
 * @returns value from dom element
 */
a.getValueFromObject = function(ele) {
	return ele.value = trim(ele.value);
};

/**
 * set value to dom element
 * 
 * @param ele
 *            dom element to set value to
 * @param val
 *            value to be assigned to dom
 */
a.setValueToObject = function(ele, val) {
	ele.value = val;
};

/**
 * represents a FileField in the browser. NOt fully supported end-to end as of
 * now. Needs some standardization
 */
var FileField = function() {
	AbstractInputField.call(this);
	/*
	 * some logic in fileUpload routine iterates thrua ll fields and looks for
	 * fiel field
	 */
	this.isFileField = true;
};

a = FileField.prototype = new AbstractInputField;

/**
 * interesting issue with Safari with a hard coded c:\fakepath!!!
 * 
 * @param ele
 *            file dom element from which to get value
 * @returns file name
 */
a.getValueFromObject = function(ele) {
	return ele.value.replace(/^C:\\fakepath\\/i, '');
};

/**
 * TODO : this obviously does not work. file field value MUST be selected by th
 * euser as per browser security standard
 * 
 * @param ele
 *            dom element
 * @param val
 *            value to be set to dom
 */
a.setValueToObject = function(ele, val) {
	ele.value = val;
};

/**
 * password field is same as text field as far as we are concerned. Just the
 * rendering dom element is different
 */
var PasswordField = function() {
	TextInputField.call(this);
};
