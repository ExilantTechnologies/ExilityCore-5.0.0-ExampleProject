/**********************************************************************************************
 *
 * EXILANT CONFIDENTIAL
 * _____________________________________________________________________________________________
 *
 *  [2004 - 2013]  EXILANT Technologies Pvt. Ltd.
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains the property of EXILANT
 * Technologies Pvt. Ltd. and its suppliers, if any.  
 * The intellectual and technical concepts contained herein are proprietary to   
 * EXILANT Technologies Pvt. Ltd. and its suppliers and may be covered by India and 
 * Foreign Patents, patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material is strictly forbidden 
 * unless prior written permission is obtained * from EXILANT Technologies Pvt. Ltd.
 ***********************************************************************************************/

/**********************************************************************************************
 *
 * PURPOSE
 * _____________________________________________________________________________________________
 *
 * In Exility, all data exchanged between various program elements (either java classes, or 
 * from client to server) is done via an object called DataCollection. This object contains
 * key/value pairs and grids. It also contains additional attributes to define success/failure
 * of a call. This object is serialized and de-serialized before sending and after receiving.
 * The serialization is purely text based. This is a fundamental object to exchange data.
 ************************************************************************************************/

/***********************************************************************************************
 * Date			Version		Author			Comments
 *-------------------------------------------------------------------------------------------
 * 10-Dec-2013	 1.0.0		Vishnu Sharma	First draft
 *-------------------------------------------------------------------------------------------
 ***********************************************************************************************/
/**
 * The default constructor
 */
var DataCollection = function() {
	this.values = new Object();
	this.lists = new Object();
	this.grids = new Object();
	this.success = true;
	this.messages = new Object();

};
var a = DataCollection.prototype;
/* Constants used internally by DC */
a.TABLE_SEPARATOR = String.fromCharCode(28); // ASCII file separator
a.BODY_SEPARATOR = String.fromCharCode(29); // ASCII group separator
a.ROW_SEPARATOR = String.fromCharCode(30); // ASCII record separator
a.FIELD_SEPARATOR = String.fromCharCode(31); // ASCII unit separator
a.VALUES_TABLE_NAME = 'values';
a.SUCCESS_FIELD_NAME = '_success';
a.MESSAGES_TABLE_NAME = '_messages';
a.MESSAGE_TYPE_ERROR = "error";
a.MESSAGE_TYPE_WARN = "warning";
a.AUTHENTICATION_STATUS = 'authenticationStatus';
a.TRACE_FIELD_NAME = 'exilityServerTraceText';
a.PERFORMANCE_FIELD_NAME = 'exilityServerPerformanceText';

/**
 * @method fromDc populate this data structure from an object that is possibly
 *         constructed from a json
 * @param dc
 *            object that has all data, but is not an instance of DataCollection
 */
a.fromDc = function(dc) {
	this.success = dc.success;
	this.values = dc.values;
	this.messages = dc.messages;
	this.grids = dc.grids;
	this.lists = dc.lists;
};

/**
 * @method addMessage add a message
 * @param {string}
 *            type of message error/warning/info
 * @param {string}
 *            message text
 */
a.addMessage = function(typ, text) {
	typ = typ.toLowerCase();
	var msgs = this.messages[typ];
	if (!msgs || typeof msgs === "undefined") {
		msgs = new Array();
		this.messages[typ] = msgs;
	}
	msgs.push(text);
	if (typ == this.MESSAGE_TYPE_ERROR)
		this.success = false;
};

/**
 * @method hasValues - checks whether there is at least one value in the
 *         collection
 * @returns {boolean} true if dc has at least one value, false otherwise
 */
a.hasValues = function() {
	for ( var val in this.values) {
		return true;
	}
	return false;
};

/**
 * @method getValue get the value from name-vale pairs
 * @param {string}
 *            name
 * @returns {any} value associated with this name, or null if no name-value pair
 *          found with this name
 */
a.getValue = function(name) {
	return this.values[name];
};
/**
 * @method hasValue check for a name-value pair with this name
 * @param {string}
 *            name
 * @return {boolean} true if this name is part of name-value pair collection,
 *         false otherwise
 */
a.hasValue = function(name) {
	return typeof this.values[name] !== 'undefined';
};

/**
 * @method addValue add a name-value pair, replacing any existing pair
 * @param {string}
 *            name
 * @param {any}
 *            value
 */
a.addValue = function(name, value) {
	this.values[name] = value;
};

/**
 * @method removeValue remove a name-value pair and return the that value
 * @param {string}
 *            name
 * @return {any} value if that is removed, or undefined if it did not exist
 */
a.removeValue = function(name) {
	var val = this.values[name];
	delete this.values[name];
	return val;
};
/**
 * Get the grid in the internal grids collection of this DC instance ARGUMENTS:
 * 1. name - The name of the grid to extract RETURNS: A grid object if found
 * else undefined
 */
a.getGrid = function(name) {
	return this.grids[name];
};
/**
 * Add a new grid to the internal grids collection. If a grid exists under the
 * same key, it will be updated ARGUMENTS: 1. name - The name of the grid 2.
 * grid - The grid object to add RETURNS: None
 */
a.addGrid = function(name, grid) {
	if (this.grids[name])
		debug('grid '
				+ name
				+ ' is already in the dc. It will be replaced with the new grid');
	this.grids[name] = grid;
};
/**
 * Remove a grid from the internal grids collection. If a grid with the given
 * key does not exists then no changes will be made. ARGUMENTS: 1. name - The
 * key name to use RETURNS: None
 */
a.removeGrid = function(name) {
	var grid = this.grids[name];
	delete this.grids[name];
	return grid;
};
/**
 * Add a list of values to the internal list of values A value list is nothing
 * but an array. If value list under the same name exists, it will be updated
 * ARGUMENTS: 1. name - The name of value list 2. valueList - The value list to
 * add RETURNS: None
 */
a.addList = function(name, valueList) {
	this.lists[name] = valueList;
};
/**
 * Get the value list for the given key name ARGUMENTS: 1. name - The key name
 * by which we need to get the value list RETURNS: The value list instance if
 * found else undefined
 */
a.getList = function(name) {
	return this.lists[name];
};
/**
 * Remove the value list from the internal collection of value list objects If
 * the value list for the given name is not found, then no changes take place
 * ARGUMENTS: 1. name - The name of the value list to remove
 */
a.removeList = function(name) {
	var list = this.lists[name];
	delete this.lists[name];
	return list;
};
/**
 * Check if the DC instance represents an error condition RETURNS: boolean
 */
a.hasError = function() {
	return (!this.success);
};
/**
 * Get all the messages embedded in this instance of DC RETURNS: string
 */
a.getMessageText = function() {
	var str = '';
	for ( var mKey in this.messages) {
		if (mKey == ClientConstants.MESSATE_TYPE_ERROR)
			str += 'Error\n';
		else
			str += mKey + '\n';

		var arr = this.messages[mKey];
		for ( var i = 0; i < arr.length; i++)
			str += arr[i] + '\n';
	}
	return str;
};
/**
 * Serialize the DC object RETURNS: string
 */
a.serialize = function() {
	var val = '';
	var str = [ this.VALUES_TABLE_NAME, this.BODY_SEPARATOR ];
	var firstValue = true;
	for (name in this.values) {
		val = this.values[name];
		if (!val && val != 0)
			val = '';
		if (firstValue)
			firstValue = false;
		else
			str.push(this.ROW_SEPARATOR);
		str.push(name);
		str.push(this.FIELD_SEPARATOR);
		str.push(val);
	}

	for ( var gridName in this.grids) {
		if (!this.grids[gridName])
			continue;
		var thisGrid = this.grids[gridName];

		str.push(this.TABLE_SEPARATOR);
		str.push(gridName);
		str.push(this.BODY_SEPARATOR);

		for ( var i = 0; i < thisGrid.length; i++) {
			if (i != 0)
				str.push(this.ROW_SEPARATOR);
			var row = thisGrid[i];
			for ( var j = 0; j < thisGrid[i].length; j++) {
				var val = row[j];
				if (!val && val != 0)
					val = '';
				if (j != 0)
					str.push(this.FIELD_SEPARATOR);
				str.push(val);
			}
		}
	}
	// and finally lists

	for ( var listName in this.lists) {
		var list = this.lists[listName];
		if (list) {
			str.push(this.TABLE_SEPARATOR);
			str.push(listName);
			str.push(this.BODY_SEPARATOR);
			for (i = 0; i < list.length; i++) {
				if (i != 0)
					str.push(this.ROW_SEPARATOR);
				str.push(list[i]);
			}
		}
	}
	return str.join('');
};
/**
 * De-serialize DC. From the given text, populate this DC instance ARGUMENTS: 1.
 * txt - The serialized text representation of the DC RETURNS: A new instance of
 * DC
 */
a.deserialize = function(txt) {
	var tablesAndNames = txt.split(this.TABLE_SEPARATOR);
	for ( var i = 0; i < tablesAndNames.length; i++) {
		var t = tablesAndNames[i].split(this.BODY_SEPARATOR);
		if (t.length != 2) // empty ones, put at the beginning and at end as
			// possible defence against characters added by jsp
			continue;
		var tableName = t[0];
		var rows = t[1].split(this.ROW_SEPARATOR);
		var grid = [];
		for ( var j = 0; j < rows.length; j++) {
			grid.push(rows[j].split(this.FIELD_SEPARATOR));
		}
		var row;
		if (tableName == this.VALUES_TABLE_NAME) {
			for ( var j = 1; j < grid.length; j++) {
				row = grid[j]; // row is name, value
				this.addValue(row[0], row[1]);
			}
			var st = this.getValue(this.SUCCESS_FIELD_NAME);
			this.success = st && (st == '1');
			continue;
		}

		if (tableName == this.MESSAGES_TABLE_NAME) {
			for ( var j = 1; j < grid.length; j++) {
				row = grid[j]; // columns are messageId, severity and text
				this.addMessage(row[0], row[1]);
			}
			continue;
		}
		this.addGrid(tableName, grid);
	}
};
/**
 * Pickup and populate DC instance attributes from the given HTML element
 * 
 * @param element
 *            do element from which fields are to be picked-up
 */
a.fromElement = function(element) {
	var children = element.getElementsByTagName('input');
	var n = children.length;
	var id, val;
	var ele = null;
	for ( var i = 0; i < n; i++) {
		ele = children[i];
		id = ele.name || ele.id;
		if (!id)
			continue;

		var typ = ele.type ? ele.type.toLowerCase() : 'text';
		if (typ != 'text')// small optimization because text is the most
		// common input
		{
			// buttons are not values. Also, we do not handle file in this
			if (typ === 'button' || typ == 'reset' || typ === 'submit'
					|| typ == 'image' || typ === 'file')
				continue;

			// unchecked radio/check-box to be ignored
			if (typ == 'radio' || typ == 'checkbox') {
				if (!ele.checked)
					continue;
			}
		}

		val = ele.value;
		// name should not repeat, except for check-boxes. We use comma
		// separated value
		if (this.hasValue(id))
			val = this.getValue(id) + ',' + val;
		this.addValue(id, val);
	}

	// drop-downs
	children = element.getElementsByTagName('select');
	n = children.length;
	for ( var i = 0; i < n; i++) {
		ele = children[i];
		id = ele.id || ele.name;
		if (!id)
			continue;
		var options = ele.childNodes;
		val = null;
		if (ele.multiple) {
			for ( var j = 0; j < options.length; j++) {
				var option = options[j];
				if (options.selected) {
					if (val)
						val += ',' + option.value;
					else
						val = option.value;
				}
			}
		} else if (ele.selectedIndex || ele.selectedIndex == 0)
			val = options[ele.selectedIndex].value;

		if (val != null)
			this.addValue(id, val);
	}
};
/**
 * Conver the DC instance to HTML representation
 * 
 * @return HTML string for rendering the dc
 */
a.toHtml = function() {
	var htmlArr = [];
	this.messagesToHtml(htmlArr);
	this.valuesToHtml(htmlArr);
	this.gridsToHtml(htmlArr);
	this.listsToHtml(htmlArr);
	return htmlArr.join('');
};
/**
 * Convert the messages stored in this DC instance to HTML ARGUMENTS: 1.
 * 
 * @param htmlStrArr -
 *            An array that will contain the HTML string
 */
a.messagesToHtml = function(htmlStrArr) {
	// we have to handle case when there are no messages
	var msgFound = false;
	for ( var sev in this.messages) {
		msgFound = true;
		htmlStrArr.push('<br/>');
		htmlStrArr.push(sev);
		htmlStrArr.push('<br/>');
		var endstr = '</font>';
		if (sev === this.MESSAGE_TYPE_ERROR)
			htmlStrArr.push('<font color="red">');
		else if (sev === this.MESSAGE_TYPE_WARN)
			htmlStrArr.push('<font color="blue">');
		else
			endstr = '';

		var msgs = this.messages[sev];
		for ( var i = 0; i < msgs.length; i++)
			htmlStrArr.push(msgs[i] + '<br/>');
		htmlStrArr.push(endstr);
	}

	if (!msgFound)
		htmlStrArr.push('<br/>There are no messages<br/>');
};
/**
 * Convert values stored in this DC instance to an HTML ARGUMENTS: 1. htmlStrArr -
 * 
 * @param htmlStrArr
 *            The array that will contain the returned HTML string
 */
a.valuesToHtml = function(htmlStrArr) {
	// very unlikely that there are no name-value pairs. It is OK to say values
	// and not print anything after that
	htmlStrArr.push('<br/>Values are :<br/>');
	htmlStrArr
			.push('<table border="1"><tr><th>Variable</th><th>Value</th></tr>');
	for ( var varName in this.values) {
		if ((varName == this.TRACE_FIELD_NAME)
				|| (varName == this.PERFORMANCE_FIELD_NAME))
			continue;
		htmlStrArr.push('<tr><td>');
		htmlStrArr.push(varName);
		htmlStrArr.push('</td><td>');
		htmlStrArr.push(this.values[varName]);
		htmlStrArr.push('</td></tr>');
	}
	htmlStrArr.push('</table>');
};
/**
 * Convert the grids stored in this DC instance into HTML ARGUMENTS: 1.
 * 
 * @param htmlStrArr -
 *            The array that will hold the returned HTML
 */
a.gridsToHtml = function(htmlStrArr) {
	var gridFound = false;

	for ( var gridName in this.grids) {
		var thisGrid = this.grids[gridName];
		if (!thisGrid)
			continue;
		if (!gridFound) {
			htmlStrArr.push('<br/>Grids are:');
			gridFound = true;
		}
		htmlStrArr.push('<br/>');
		var n = thisGrid.length;
		var m = n && thisGrid[0].length;
		htmlStrArr.push(gridName);
		htmlStrArr.push(' has ');
		if (!m) {
			htmlStrArr.push(' no data.');
			continue;
		}

		htmlStrArr.push(n - 1);
		htmlStrArr.push(' data rows and ');
		htmlStrArr.push(m);
		htmlStrArr.push(' columns<br/><table border="1"><tr>');
		// header row
		var hdr = thisGrid[0];
		for ( var j = 0; j < m; j++) {
			htmlStrArr.push('<th>');
			htmlStrArr.push(hdr[j]);
			htmlStrArr.push('</th>');
		}
		htmlStrArr.push('</tr>');

		// data rows
		for ( var i = 1; i < n; i++) {
			htmlStrArr.push('<tr>');
			var row = thisGrid[i];
			for ( var j = 0; j < m; j++) {
				htmlStrArr.push('<td>');
				htmlStrArr.push(row[j] || '&nbsp;');
				htmlStrArr.push('</td>');
			}
			htmlStrArr.push('</tr>');
		}
		htmlStrArr.push('</table>');
	}
};
/**
 * Convert the lists stored in this DC instance to HTML
 * 
 * @param htmlStrArr
 *            buffer array to which html is to be pushed to
 */
a.listsToHtml = function(htmlStrArr) {
	var listFound = false;
	for ( var listName in this.lists) {
		var list = this.lists[listName];
		if (!list)
			continue;
		if (!listFound) {
			htmlStrArr
					.push('<br/>Lists are:<br/><table border="1" cellpadding="0" cellspacing="2"><tr><th>List Name</th><th>Values</th></tr>');
			listFound = true;
		}
		htmlStrArr.push('<tr><td>');
		htmlStrArr.push(listName);
		htmlStrArr.push('</td><td>');
		htmlStrArr.push(list);
		htmlStrArr.push('</td></tr>');
	}
	if (listFound)
		htmlStrArr.push('</table>');
};
