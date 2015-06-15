// optional methods
// .init()
/// Single row panel /////
var DisplayPanel = function() {
	AbstractTable.call(this);
	this.toBeSentToServer = true;
	this.hasSingleRow = true;
	this.grid[1] = [];
	this.nbrRows = 1;
	this.currentRow = 1;
};

DisplayPanel.prototype = new AbstractTable;

// Jun 30 2009 : BugID 469 - Repeating Panel not working for display panel -
// Exis (Start) : Venkat
// data is received from server in a dc. Set it to the table
DisplayPanel.prototype.fillDC = function(dc) {
	var i, field, val, j, dt, row, gridRow;
	if (this.doNotSendInGrid) {
		for ( var col in this.columns) {
			field = this.columns[col];
			if (!field.toBeSentToServer)
				continue;
			field.fillDc(dc);
		}
		return;
	}

	var grid = [];
	var n = this.grid.length;
	// add desired number of empty rows first

	for (i = 0; i < n; i++) {
		gridRow = this.grid[i];
		if (!gridRow)
			continue;
		if (this.keyIdx == null || gridRow[this.keyIdx]) {
			gridRow.toBeSent = true;
			grid.push(new Array());
		} else
			this.grid[i].toBeSent = false;
	}

	// now go by column, and add values
	var col = 0;
	for ( var colName in this.columns) {
		field = this.columns[colName];
		if (!field.toBeSentToServer)
			continue;
		dt = dataTypes[field.dataType];
		grid[0][col] = colName;
		row = 1;
		j = field.columnIdx;
		for (i = 1; i < n; i++) {
			gridRow = this.grid[i];
			if (!gridRow || gridRow.toBeSent == false)
				continue;
			val = this.grid[i][j];
			if (val && dt)
				val = dt.formatOut(val);
			grid[row][col] = val;
			row++;
		}
		col++;
	}
	if (col)
		dc.addGrid(this.name, grid);
	else
		debug(this.name + ' has no columns to be sent to server. ');
};

// populate this.linkedColumns as an array of corresponding columns from the
// linked table
// IMP: this is triggered by P2.init(). That ensures that the links are
// available before tables do any activity
DisplayPanel.prototype.createLinks = function() {
	if (!this.linkedTableName)
		return;

	var linkedTable = this.P2.tables[this.linkedTableName];
	if (!linkedTable) {
		debug(this.name + ' uses ' + this.linkedTableName
				+ ' but that table does not exist');
		return;
	}

	this.linkedTable = linkedTable;
	this.linkedTable.simulateClickOnFirstRow = true;
	this.linkedTable.linkedDisplayTable = this; // link the other way round as
	// well
	this.linkedColumns = [];
	// This panel shows the fields from the linked table. Hence, data shoudl be
	// sent from only one of these
	this.toBeSentToServer = !linkedTable.toBeSentToServer;
	// data will not be set to this table. We have to have a row for it.
	var defRow = this.grid[0];
	var dataRow = this.grid[1] = [];

	// cache linke columns so that copying is effecient
	for ( var j = 0; j < this.columnNames.length; j++) {
		var colName = this.columnNames[j];
		dataRow[j] = defRow[j];
		var col = this.linkedTable.columns[colName];
		if (col)
			this.linkedColumns[j] = col;
	}

	if (linkedTable.nbrRows)
		linkedTable.clicked();
	else
		// hide this panel as of now. Any select will show that
		this.P2.hideOrShowPanels([ this.panelName ], 'none');

};

// copy data from clicked row of the list panel
DisplayPanel.prototype.copyFromList = function(idx) {
	// opportunnity for autoSave
	if (this.linkedTable.autoSaveServiceName)
		this.linkedTable.saveInBackground();

	// debug('copy from list for idx = ' + idx + ' and linked table = ' +
	// this.linkedTable.name);
	// data row of linked table
	var row = this.linkedTable.grid[idx];
	var thisRow = this.grid[1];
	if (!row)
		return;
	// for us to copy back to list/grid, let us establish link from this side
	this.currentLinkedRow = idx;
	for ( var j = 0; j < this.columnNames.length; j++) {
		var col = this.linkedColumns[j]; // refers to column in linked table
		if (!col)
			continue;
		var fieldName = this.columnNames[j]; // field name in the display
		// panel
		var field = this.columns[fieldName];
		var val = thisRow[j] = row[col.columnIdx];
		var obj = this.P2.doc.getElementById(field.name); // note that
		// field.name is not
		// fielName. It is
		// likely to be
		// this.name_fieldName
		field.setValueToObject(obj, val);
		if (field.triggerFieldChangedEvents)
			field.triggerFieldChangedEvents(val, obj, null, false, true);
	}
};
// Jun 30 2009 : BugID 469 - Repeating Panel not working for display panel -
// Exis (Start) : Venkat
DisplayPanel.prototype.init = function() {
	this.grid.length = 1;
	this.nbrRows = 0;
	// linked table does not carry its own data
	if (this.linkedTableName) // this is a linked table
		return;
	this.initRepeatingPanel();

	// for grid
	if (this.idFieldName)
		this.idIdx = this.P2.fields[this.idFieldName].columnIdx;
	else
		this.idIdx = null;

	if (this.keyFieldName)
		this.keyIdx = this.P2.fields[this.keyFieldName].columnIdx;
	else
		this.keyIdx = null;

	if (this.actionFieldName) {
		this.actionField = this.P2.fields[this.actionFieldName];
		this.actionIdx = this.actionField.columnIdx;
	} else
		this.actionIdx = null;
};

var relatedElementSuffixes = [ 'Indent', 'PlusMinus', 'Picker', 'Hr', 'Mn',
		'Sc', 'Am', 'FieldsTable' ];
DisplayPanel.prototype.setData = function(dc) {
	if (this.nbrRows)
		this.deleteAllRows();

	var data = dc.grids[this.name];
	if (!data || data.length < 2)
		return;

	var doc = this.P2.doc;
	this.nbrRepeatedPanels = 0;
	this.repeatedPanels = {};

	var serverNames = data[0];
	var nbrCols = serverNames.length;
	var labelIdx;
	if (this.labelFieldName)
		labelIdx = getColumnIndex(serverNames,
				this.P2.fields[this.labelFieldName].unqualifiedName);
	else
		labelIdx = 0;

	var defaultDataRow = this.grid[0];
	/**
	 * delete existing data rows, leaving the 0th row containing default values
	 */
	this.grid.length = 1;
	for ( var i = 1; i < data.length; i++) {
		var serverData = data[i];
		var key = i;
		var label = serverData[labelIdx];
		var panel = this.cloneAndAddPanel(key, label);
		if (!panel)
			continue;

		var tableEle = doc.getElementById(this.tableName);
		if (tableEle)
			tableEle.id = this.tableName + key;

		tableEle = doc.getElementById(this.panelName);
		if (tableEle) {
			tableEle.id = this.panelName + key;
		}

		this.nbrRepeatedPanels++;
		this.repeatedPanels[key] = i;
		var localData = new Array();
		var n = defaultDataRow.length;

		// initialize local data with default values
		for ( var j = 0; j < n; j++)
			localData[j] = defaultDataRow[j];

		this.grid.push(localData);
		this.nbrRows++;
		for ( var j = 0; j < nbrCols; j++) {
			var columnName = this.columnNames[j];
			var field = this.columns[serverNames[j]];
			if (!field) {
				debug(serverNames[j]
						+ ' is received from server but is not a field for table '
						+ this.name);
				continue;
			}
			var val = serverData[j];
			if (val) {
				var dt = dataTypes[field.dataType];
				if (dt)
					val = dt.formatIn(val);
			}
			localData[field.columnIdx] = val;
			var obj = doc.getElementById(field.name);
			if (!obj) {
				debug(field.name + " not found in dom. Skipping this field");
				continue;
			}
			field.setValueToObject(obj, val);
			var suffix = '__' + i;
			obj.id = field.name + suffix;
			obj.rowIdx = i;

			obj = doc.getElementById(columnName + 'Label');
			if (obj) {
				obj.id = field.name + suffix + 'Label';
				obj.rowIdx = i;
			}
			// picker etc???
			for ( var ri = 0; ri < relatedElementSuffixes.length; ri++) {
				obj = doc.getElementById(field.name
						+ relatedElementSuffixes[ri]);
				if (obj) {
					obj.id = field.name + suffix + relatedElementSuffixes[ri];
					obj.rowIdx = i;
				}
			}
		}
	}

	// is there a linked table? In that case, page wouldn't have caleld it,
	// leaving it for us to do it after adding properl panels here
	if (this.tablesToBeMerged) {
		for ( var i = this.tablesToBeMerged.length - 1; i >= 0; i--)
			this.tablesToBeMerged[i].setData(dc, rowsToBeAppended,
					isFromAppendRows, listServiceOnLoad);
	}
};

DisplayPanel.prototype.deleteAllRows = function() {
	for ( var i = 0; i < this.addedElements.length; i++) {
		var ele = this.addedElements[i];
		if (ele && ele.parentNode)
			ele.parentNode.removeChild(ele);
	}
	this.nbrRows = 0;
	this.addedElements = new Array();
	this.repeatedPanels = new Object();
	this.nbrRepeatedPanels = 0;
};

// object id is fieldName + "__" + one based row index
DisplayPanel.prototype.getObjectId = function(fieldName, idx) {
	if (this.linkedTable)
		return fieldName;
	if (!idx) {
		if (this.nbrRows == 0) // table has no rows, probably yet...
			return fieldName;
		idx = this.currentRow;
	}
	return fieldName + '__' + idx;
};

DisplayPanel.prototype.getRowNumber = function(obj) {
	if (!obj) {
		if (this.nbrRows == 0)
			return 0;
		return this.currentRow;
	}
	// obj could be either a tr element, or any field in the tr. Safe method
	// would be to get tr and get its attribute
	if (obj.rowIdx)
		return obj.rowIdx;
	while (obj.tagName != 'BODY') {
		if (obj.rowIdx)
			return obj.rowIdx;
		obj = obj.parentNode;
	}
	// it shoudl never come here, but a defensive code
	return this.currentRow;
};

DisplayPanel.prototype.initRepeatingPanel = function() {
	this.addedElements = new Array();
	this.repeatedPanels = new Object();
	this.nbrRepeatedPanels = 0;
	var doc = this.P2.doc;
	var id = this.panelName + 'Top';
	var ele = doc.getElementById(id);
	if (!ele) {
		ele = doc.getElementById(this.panelName);

		if (!ele) {
			message('Design error: ' + this.name
					+ 'is being repeated, but its panel with name = '
					+ this.name + ' is not found in dom', "Error", "Ok", null,
					null, null);
			return;
		}
		this.hasNoTop = true;
	}
	this.panelToClone = ele;
	this.parentPanel = ele.parentNode;
	this.siblingElement = ele.nextSibling;
	this.parentPanel.removeChild(ele);

};

DisplayPanel.prototype.cloneAndAddPanel = function(key, label) {
	if (!label)
		label = key;

	var doc = this.P2.doc;
	var topPanel = this.panelToClone.cloneNode(true);
	topPanel.id = topPanel.id + key;
	if (this.siblingElement)
		this.parentPanel.insertBefore(topPanel, this.siblingElement);
	else
		this.parentPanel.appendChild(topPanel);
	this.addedElements.push(topPanel);

	var slidingPanel = doc.getElementById(this.panelName + 'Slider');
	if (slidingPanel) {
		slidingPanel.id = slidingPanel.id + key;
		slidingPanel.setAttribute('key', key);
	}

	var panel, id;

	id = this.panelName + 'Label';
	panel = doc.getElementById(id);
	if (panel) {
		panel.innerHTML = label;
		panel.id = id + key;
	}

	id = this.panelName + 'Twister';
	panel = doc.getElementById(id);
	if (panel) {
		panel.id = id + key;
		panel.onclick = this.P2.win.getTwisterFunction(this.name + key);
	}
	return topPanel;
};

DisplayPanel.prototype.changeIdsOfAddedPanel = function(key) {
	var id, panel;
	var doc = this.P2.doc;
	if (this.rowsCanBeAdded) {
		id = this.name + 'AddRow';
		panel = doc.getElementById(id);
		if (panel) {
			panel.id = id + key;
			panel.key = key;
		} else
			debug('Design Error : add row button with id ' + id
					+ ' is missing in dom for table ' + this.name);
	}

	id = this.name + 'Footer';
	panel = doc.getElementById(id);
	if (panel) {
		panel.id = id + key;
		panel.key = key;

		for ( var i = 0; i < this.columnNames.length; i++) {
			id = this.name + '_' + this.columnNames[i] + 'Footer';
			panel = doc.getElementById(id);
			if (panel) {
				panel.id = id + key;
				panel.key = key;
			}
		}
	} else
		debug('Design Error : add row button with id ' + id
				+ ' is missing in dom for table ' + this.name);

	var panelToReturn = null;
	panel = doc.getElementById(this.panelName);
	if (panel) {
		panelToReturn = panel;
		panel.id = this.panelName + key;
		panel.key = key;
	}

	panel = doc.getElementById(this.name);
	if (panel) {
		panel.id = this.name + key;
		panel.key = key;
		if (panel.tBodies)
			panelToReturn = panel.tBodies[0];
		else
			panelToReturn = panel.firstChild;
	}
	if (panelToReturn) {
		this.nbrRepeatedPanels++;
		this.repeatedPanels[key] = panelToReturn;
	}

	// is this a repeated display panel inside which other repeating tables are
	// to be merged?
	if (this.stubsForMergingTables) {
		for ( var aName in this.stubsForMergingTables) {
			panel = document.getElementById(aName);
			if (panel) {
				panel.id = (aName + key);
			} else {
				debug(this.name
						+ ' has to have a panel with name '
						+ this.appendLinkedTableTo
						+ ' for it to accomdate a linked repeating table. Unable to find that. Data will not be added');
			}
		}
	}

	return panelToReturn;
};

DisplayPanel.prototype.focussed = function(obj) {
	var idx = this.getRowNumber(obj);
	if (idx)
		this.currentRow = idx;
};

DisplayPanel.prototype.deleteRow = function(obj) {
	var idx = null;
	if (obj)
		idx = this.getRowNumber(obj);
	if (!idx)
		idx = this.currentRow;
	this.grid[idx] = null;
};
