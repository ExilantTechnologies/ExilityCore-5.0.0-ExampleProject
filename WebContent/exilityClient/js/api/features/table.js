//last modified : 5-dec-2012

// Enum for the simulateClickOnRow function
var rowType = {
	none : 'none',
	first : 'first',
	current : 'current',
	next : 'next',
	last : 'last'
};

// represents a table element inside the page that receives data in a grid.
// Selection field receives data in grid, but that is not a table, it is still a
// field
var AbstractTable = function() {
	this.name = null;
	this.P2 = null;

	// all the field that this table has
	this.columns = new Object();
	this.columnNames = new Array();

	// grid in which data is recd and set to the elements. It is saved here..
	// it stores the default values as the zeroth row, which is not considered
	// to be data. It is used anly to
	// manipulate default data.
	this.grid = [ [] ];
	this.currentRow = 0; // active row on which user has clicked or changed
	// some field.
	this.nbrColumns = 0;
	this.nbrRows = 0; // by default data has no rows
};

AbstractTable.prototype.addColumn = function(field) {
	var n = this.nbrColumns;
	field.columnIdx = n;
	field.table = this;
	var fieldName = field.unqualifiedName;
	this.columnNames.push(fieldName);
	this.columns[fieldName] = field;
	// use value as default value
	this.grid[0][n] = field.value;
	if (this.hasSingleRow) // for display panels
		this.grid[1][n] = field.value;

	this.nbrColumns++;
	if (field.rowSum) {
		if (!this.rowSumIndexes)
			this.rowSumIndexes = new Array();
		this.rowSumIndexes.push(n);
		this.hasAggregates = true;
	}
	if (field.rowAverage) {
		if (!this.rowAverageIndexes)
			this.rowAverageIndexes = new Array();
		this.rowAverageIndexes.push(n);
		this.hasAggregates = true;
	}
	if (field.columnSum) {
		if (!this.columnSumIndexes)
			this.columnSumIndexes = new Array();
		this.columnSumIndexes.push(field);
		this.hasAggregates = true;
	}
	if (field.columnAverage) {
		if (!this.columnAverageIndexes)
			this.columnAverageIndexes = new Array();
		this.columnAverageIndexes.push(field);
		this.hasAggregates = true;
	}
};

// table stores the values in grid, with first row as header. get/set method for
// this.
// Most of the times, we deal with 'current row', for which the syntax is that
// row is null.
// (notice that it is the last parameter, so that it is 'optional' while calling
AbstractTable.prototype.getValue = function(colIdx, rowIdx,
		fromDeletedRowAsWell) {
	if (!rowIdx)
		rowIdx = this.currentRow;
	var dataRow = this.grid[rowIdx];
	if (!dataRow) // it is physically deleted
		return '';

	if (dataRow.isDeleted && !fromDeletedRowAsWell)// row is marked for
		// deletion, and we are
		// asked to skip such a row
		return '';

	return dataRow[colIdx];
};

AbstractTable.prototype.getColumnValue = function(columnName, rowIdx,
		fromDeletedRowAsWell) {
	if (!rowIdx)
		rowIdx = this.currentRow;
	var dataRow = this.grid[rowIdx];
	if (!dataRow) // it is physically deleted
		return '';

	if (dataRow.isDeleted && !fromDeletedRowAsWell)// row is marked for
		// deletion, and we are
		// asked to skip such a row
		return '';
	var field = this.columns[columnName];
	if (!field) {
		debug(columnName + ' is not a column in table ' + this.name);
		return '';
	}
	return dataRow[field.colIdx];
};

AbstractTable.prototype.setColumnValue = function(columnName, value, rowIdx) {
	var field = this.columns[columnName];
	if (field) {
		field.setValue(value, null, rowIdx);
		return;
	}
	debug(columnName + ' is not a column in table ' + this.name + '. Value '
			+ value + ' not set.');
};

AbstractTable.prototype.saveValue = function(val, col, row, internalChange) {
	// debug('going to set ' + val + ' to ' + this.name + ' table for row=' +
	// row + ' col=' + col);
	if (!row) {
		row = this.currentRow;
		if (row >= this.grid.length)
			row = 0;
	}
	var dataRow = this.grid[row];
	if (!dataRow) {
		debug(this.name + ' does not have row ' + row
				+ ' and hence can not save value of ' + val + ' to column no '
				+ col);
		return null;
	}
	var oldVal = dataRow[col];
	// no point doing all this if we are not changing anything
	if (oldVal === val)
		return;

	dataRow[col] = val;
	if (this.quickSearchEle) {
		this.quickSearchRebuildRow(row);
	}
	// save to the linked field as well
	if (this.linkedTable) {
		var linkedColumn = this.linkedColumns[col];
		if (linkedColumn != null) {
			linkedColumn.setValue(val, null, this.currentLinkedRow);
			if (!internalChange)
				this.linkedTable.rowChanged(null, null, this.currentLinkedRow);
		}
	}

	return oldVal;
};

// validate the column represented by the supplied field. This is called by form
// validation.
// hence we have to manage error handling.
AbstractTable.prototype.validateColumn = function(field, onlyIfChanged) {
	// display panel that is linked to a grid needs no validation
	if (this.linkedTable)
		return;

	var dt = dataTypes[field.dataType];
	if (!dt) {
		debug('field ' + field.name + ' has a dataType = ' + field.dataType
				+ '. This is not a valid dataType. Validation skipped.');
	}

	var colIdx = field.columnIdx;
	var obj, val, row, formattedValue, i;
	var doc = this.P2.doc;
	var linkedField = null;
	var validationTable = null;
	var validationField = field;
	if (this.linkedDisplayTable) {
		linkedField = this.P2.getField(this.linkedDisplayTable.name + '_'
				+ field.unqualifiedName);
		if (linkedField) {
			validationField = linkedField;
			validationTable = this;
		}
	}

	for (i = 1; i < this.grid.length; i++) {
		row = this.grid[i];
		if (row == null || row.isDeleted)
			continue;
		// is this row modified? This is not such a great optimiation!! A field
		// might have been invalidated due to from-to
		// if(this.actionIdx != null && !row[this.actionIdx])
		// continue;
		// should the row be ignored?
		if (this.keyFieldName
				&& !row[this.keyIdx]
				&& (!this.idFieldName || !row[this.idIdx] || row.keyIsGenerated))
			continue;
		if (onlyIfChanged && !row.changedByUser)
			continue;
		val = row[colIdx];
		this.currentRow = i; // in case any field tries to retrieve a related
		// field value...
		try {
			formattedValue = validationField.validateValue(val, dt, true,
					validationTable);
			if (formattedValue != val) {
				obj = doc.getElementById(this.getObjectId(field.name, i));
				field.setValueToObject(obj, formattedValue);
				row[colIdx] = formattedValue;
			}
		} catch (e) {
			if (linkedField) {
				e.obj = doc.getElementById(linkedField.name);
				e.field = linkedField;
				this.clicked(); // so that the display panel shows this row
			} else {
				e.obj = doc.getElementById(this.getObjectId(field.name, i));
				e.field = field;
			}
			if (exilParms.stopAtFirstError) {
				throw (e);
			}
			e.render(e.obj);
		}
	}
};

// for repeating panels
AbstractTable.prototype.initRepeatingPanel = function() {
	this.addedElements = new Array();
	this.repeatedPanels = new Object();
	this.nbrRepeatedPanels = 0;
	// It has to be removed from dom as of now. It will be cloned and added when
	// data comes in
	// Top level div of a panel is either TabsDiv or Top
	var doc = this.P2.doc;
	var id = this.repeatingPanelName || this.panelName;
	var ele = doc.getElementById(id + 'TabsDiv');
	if (ele)// it is a tabbed element
	{
		var ele1 = doc.getElementById(id + 'Tab');
		this.tabLabelParent = ele1.parentNode;
		this.tabLabelEle = this.tabLabelParent.removeChild(ele1);
		ele1 = doc.getElementById(id + 'TabLeft');
		this.tabLabelParentLeft = ele1.parentNode;
		this.tabLabelEleLeft = this.tabLabelParentLeft.removeChild(ele1);

		ele1 = doc.getElementById(id + 'TabRight');
		this.tabLabelParentRight = ele1.parentNode;
		this.tabLabelEleRight = this.tabLabelParentRight.removeChild(ele1);
	} else {
		id = this.panelName + 'Top';
		ele = doc.getElementById(id);
		if (!ele) {
			message('Design error: ' + this.name
					+ 'is being repeated, but its top panel with name = ' + id
					+ ' is not found in dom', "Error", "Ok", null, null, null);
			return;
		}
	}

	this.panelToClone = ele;
	var parentEle = ele.parentNode;
	this.parentPanel = parentEle;
	this.siblingElement = ele.nextSibling;
	parentEle.removeChild(ele);
	// we should insert using this.parentEle.insertBefore(newEle, this.sibling)
	// if sibling exists, else use appendChild()

	debug('I got ' + this.panelToClone.id
			+ ' as the panel to be removed from the dom with parentEle = '
			+ parentEle.id);
};

AbstractTable.prototype.cloneAndAddPanel = function(key, label, parentPanel,
		childPanel) // Dec 03 2009 : BugID 772 - panels are not colliding in
// repeating column - Exility : Venkat
{
	debug('going to repeat ' + (this.repeatingPanelName || this.panelName)
			+ ' for key = ' + key + ' and label = ' + label);
	if (!label)
		label = key;
	var doc = this.P2.doc;
	var topPanel = this.panelToClone.cloneNode(true);
	topPanel.id = topPanel.id + key;
	this.addedElements.push(topPanel);

	// where to add this panel?
	// very special case; (Odessey) This is part of a repeatedDisplayPanel. Let
	// that panel handle it.
	if (this.mergeWithTable) {
		if (this.stubNameForMerging) // merge with a repeating display panel
		{
			var stubId = this.stubNameForMerging;
			if (key)
				stubId += key;
			var stub = doc.getElementById(stubId);

			if (stub)
				stub.appendChild(topPanel);
			else
				debug(this.name + ' table has row with key ' + key
						+ ' but the linked table ' + this.mergeWithTableName
						+ ' does not have a row with that key.');
		} else // to be merged with another list/grid panel
		{
			this.mergeWithTable.mergeChildPanel(topPanel,
					this.mergeOnColumnName, key);
		}
		return topPanel;
	}

	if (this.siblingElement)
		this.parentPanel.insertBefore(topPanel, this.siblingElement);
	else
		this.parentPanel.appendChild(topPanel);

	var slidingPanel = doc.getElementById(this.panelName + 'Slider');
	if (slidingPanel) {
		slidingPanel.id = slidingPanel.id + key;
		slidingPanel.setAttribute('key', key);
	}
	var panel, id, idLeft, idRight;
	// was it a tab?
	if (this.tabLabelEle) {
		id = this.panelName + key + 'Tab';
		idLeft = this.panelName + key + 'TabLeft';
		idRight = this.panelName + key + 'TabRight';
		var containerName;
		panel = this.tabLabelEle.cloneNode(true);
		panel.id = id;
		panelLeft = this.tabLabelEleLeft.cloneNode(true);
		panelLeft.id = idLeft;
		panelRight = this.tabLabelEleRight.cloneNode(true);
		panelRight.id = idRight;
		this.tabLabelParentLeft.appendChild(panelLeft);
		this.tabLabelParent.appendChild(panel);
		this.tabLabelParentRight.appendChild(panelRight);
		containerName = panel.getAttribute('tabcontainername');
		if (this.nbrRepeatedPanels == 0) // this is the first panel
		{
			// global parameter that tracks what is active..
			var varName = containerName + 'ActiveTabName';
			this.P2.win[varName] = id;
			varName = containerName + 'ActivePanelName';
			this.P2.win[varName] = topPanel.id;
			topPanel.style.display = '';
		} else {
			panel.className = 'passivetablabel';
			topPanel.style.display = 'none';
		}
		this.addedElements.push(panel);
		this.addedElements.push(panelLeft);
		this.addedElements.push(panelRight);
		panel.onclick = this.P2.win.getTabFunction(topPanel.id, containerName);
		panel.innerHTML = label;
	}
	id = this.panelName + 'Label';
	panel = doc.getElementById(id);
	if (panel) {
		panel.innerHTML = label;
		panel.id = id + key;
	}

	// what do we do with the twister?
	id = this.panelName + 'Twister';
	panel = doc.getElementById(id);
	if (panel) {
		panel.id = id + key;
		panel.onclick = this.P2.win.getTwisterFunction(this.panelName + key); // Oct
		// 23
		// 2009
		// :
		// BugID
		// 717
		// -
		// Collapse
		// Feature
		// -
		// Grid
		// panel
		// -
		// Exility
		// :
		// Venkat
	}

	if (!panel && childPanel) {
		var parentPanelDoc = doc.getElementById(parentPanel);
		if (parentPanelDoc) {
			parentPanel = parentPanelDoc.parentNode.id;
			parentPanelDoc = doc.getElementById(parentPanel);
			parentPanelDoc.id = parentPanel + key;
		}

		parentPanelDoc = doc.getElementById(parentPanel + 'Twister');
		if (parentPanelDoc) {
			parentPanelDoc.id = parentPanel + 'Twister' + key;
			parentPanelDoc.onclick = this.P2.win.getTwisterFunction(parentPanel
					+ key);
		}

		var childPanelDoc = doc.getElementById(childPanel);
		if (childPanelDoc) {
			childPanel = childPanelDoc.parentNode.id;
			childPanelDoc = doc.getElementById(childPanel);
			childPanelDoc.id = childPanel + key;
		}

		childPanelDoc = doc.getElementById(childPanel + 'Twister');
		if (childPanelDoc) {
			childPanelDoc.id = childPanel + 'Twister' + key;
			childPanelDoc.onclick = this.P2.win.getTwisterFunction(childPanel
					+ key);
		}
	}

	return topPanel;
};

AbstractTable.prototype.changeIdsOfAddedPanel = function(key) {
	var id, panel;
	var doc = this.P2.doc;
	// is there an add row button?
	if (this.rowsCanBeAdded) {
		id = this.name + 'AddRow';
		panel = doc.getElementById(id);
		if (panel) {
			panel.id = id + key;
			panel.key = key; // key helps in identifying the corresponding
			// table
		} else
			debug('Design Error : add row button with id ' + id
					+ ' is missing in dom for table ' + this.name);
	}

	id = this.name + 'Footer';
	panel = doc.getElementById(id);
	if (panel) {
		panel.id = id + key;
		panel.key = key; // To get footer panel

		for ( var i = 0; i < this.columnNames.length; i++) {
			id = this.name + '_' + this.columnNames[i] + 'Footer';
			panel = doc.getElementById(id);
			if (panel) {
				panel.id = id + key;
				panel.key = key; // If column id is matching with footer id
				// then change its id.
			}
		}
	} else
		debug('Design Error : add row button with id ' + id
				+ ' is missing in dom for table ' + this.name);

	var panelToReturn = null;
	// it could be a single row panel : display panel. In this case, we have to
	// change the variable names
	panel = doc.getElementById(this.panelName);
	if (panel) {
		panelToReturn = panel;
		panel.id = this.panelName + key;
		panel.key = key;
	}

	// Jul 29 2009 : BugID 520 - Tab Panel and Repeating Panels do not have
	// sliding functionality - Exility (Start) : Venkat
	var slidingPanel = doc.getElementById(this.panelName + 'Slider');
	if (slidingPanel) {
		slidingPanel.id = slidingPanel.id + key;
		slidingPanel.setAttribute('key', key);
	}
	// Jul 29 2009 : BugID 520 - Tab Panel and Repeating Panels do not have
	// sliding functionality - Exility (End) : Venkat

	// and the table element
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
	return panelToReturn;
};

AbstractTable.prototype.deleteAllRows = function() {
	if (!this.addedElements) {
		debug('Design error: this.addedElements  not found for a repeatng display panel');
		return;
	}

	/*
	 * remove panels that were added to dom
	 */
	var n = this.addedElements.length;
	for ( var i = 0; i < n; i++) {
		var panel = this.addedElements[i];
		panel.parentNode.removeChild(panel);
	}
	this.addedElements = [];

	// remove rows from data
	this.grid.length = 1;
	this.nbrRows = 0;
};

// if I have an id of a field, what row am I in?
AbstractTable.prototype.getRowNumber = function(obj) {
	return 1;
};

// If I have to find a field in a row, what id will it have?
AbstractTable.prototype.getObjectId = function(fieldName, rowIdx) {
	return fieldName;
};

// whenever a table row is clicked. Make the clicked row current, so that any
// reference to fields will point to this row by default
AbstractTable.prototype.clicked = function(obj) {
	if (!obj)
		return;
	var idx = this.getRowNumber(obj);
	if (idx)
		this.currentRow = idx;
};

// whenever a table row is is touched
AbstractTable.prototype.rowSelected = function(obj) {
	var idx = this.getRowNumber(obj);
	if (idx)
		this.currentRow = idx;
};

AbstractTable.prototype.validate = function() {
	return true;
};
// called when a field in the row is changed
AbstractTable.prototype.rowChanged = function(obj, fieldName, idx,
		internalChange) {
	if (!idx)
		idx = this.getRowNumber(obj);
	if (idx)
		this.currentRow = idx;
	if (internalChange || !idx)
		return;

	var row = this.grid[idx];
	if (!row)
		return;
	row.changedByUser = true;
	// if there is an action field, we have to update that
	if (!this.actionFieldName)
		return;

	var aVal = row[this.actionIdx];
	if (aVal) // it is already set
		return;
	// there is an interesting case. WeaveIT have been using actionFieldName
	// itself as keyField. Also, they have used actionFieldName as basedOnField
	// for almost all fields
	// This is a decent design, in the sense, the row becomes 'active' as and
	// when user enters any field. Probably this is what we should designed that
	// as default!!
	if (this.keyFieldName && this.keyFieldName != this.actionFieldName
			&& !row[this.keyIdx] && (!this.idFieldName || row.keyIsGenerated))// keyField
		// is
		// specified,
		// but
		// no
		// value.
		// Also
		// id
		// field,
		// if
		// present
		// is
		// generated
		// negative
		// number
		return;

	aVal = 'modify';
	if (row.keyIsGenerated || (this.idFieldName && !row[this.idIdx]))
		aVal = 'add';
	this.actionField.setValue(aVal, null, idx);
	debug('action field is set to ' + aVal);
};

// Check if the row of the grid is deleted
AbstractTable.prototype.isRowDeleted = function(rowIdx) {
	var row = this.grid[rowIdx];
	if (this.linkedTable)
		row = this.linkedTable.grid[this.currentLinkedRow];

	if (row)
		return row.isDeleted;

	return false;
};

// Get the old value of the field
AbstractTable.prototype.getFieldValue = function(rowIdx, field) {
	if (this.grid[rowIdx] != null) {
		return this.grid[rowIdx][field.columnIdx];
	}

	return false;
};

// common intermediate class for list and grid. Their data behaviour is common.
// However, their other actions are different
var ListOrGridTable = function() {
	AbstractTable.call(this);
	this.toBeSentToServer = true; // new feature added to supress sending
	// table to server
	this.initialNumberOfRows = 0; // in add mode, howmany rows to show

	// fields for run time management
	this.tableBodyObject = null; // very frequent visit. So, let us keep it
	this.htmlRowToClone = null;

	// /////////// following are required for "complex" table. May be we should
	// shift that to another derived class
	this.childTable = null;
	// used to get back the original normalized table
	this.childTableColumns = null;
	this.mainTableColumns = null;
	// field metadata for repeated elements
	// assumption is: all the child cols fields > 3 are of same type
	// childTable and childTableCell are design time values, to be
	// populated in xxx.metadata.js file.
	this.childTableMetaCell = null;
	this.childTableHtmlCell = null; // it's a string, to be used by innerHTML
	this.distinctKeys = null;
	// qty is primary col header, size is secondary col header.
	// did not get a better generic name that tells the meaning of it.
	this.qtyBySize = true;
	this.doNotShowTreeViewCheckBox = false;
	this.paginateCallback = null;

	this.numberOfOrigDataRows = 0;

	// do you have want the repeated tables to be appended to a corresponding
	// repeating display panel?
	// but link it to this panels using the following two attributes
	this.linkedTableName = null;
	this.linkedElementName = null; // panelName inside this diplay panel to
	// which rows from the linked table is to be
	// inserted
};

ListOrGridTable.prototype = new AbstractTable;

// object id is fieldName + "__" + one based row index
ListOrGridTable.prototype.getObjectId = function(fieldName, idx) {
	if (!idx) {
		if (this.nbrRows == 0) // table has no rows, probably yet...
			return fieldName;
		idx = this.currentRow;
	}
	return fieldName + '__' + idx;
};

ListOrGridTable.prototype.getRowNumber = function(obj) {
	if (!obj) {
		if (this.nbrRows == 0)
			return 0;
		return this.currentRow;
	}
	// obj could be either a tr element, or any field in the tr. Safe method
	// would be to get tr and get its attribute
	if (obj.rowIdx)
		return obj.rowIdx;
	while (obj && obj.tagName != 'BODY') {
		if (obj.rowIdx)
			return obj.rowIdx;
		obj = obj.parentNode;
	}
	// it shoudl never come here, but a defensive code
	return this.currentRow;
};

ListOrGridTable.prototype.getTopRowNumber = function() {
	var doc = this.P2.doc;
	var div = doc.getElementById(this.panelName + 'Left');
	if (!div)
		div = doc.getElementById(this.panelName);
	var scrollTop = div.scrollTop;
	var tr = this.tableBodyObject.firstChild;
	while (tr.nextSibling) {
		if (tr.offsetTop > scrollTop) {
			div.scrollTop = tr.offsetTop;
			break;
		}
		if (tr.offsetTop == tblTop && tr.display != 'none')
			break;
		tr = tr.nextSibling;
	}
	return tr.rowIdx;
};
// used for multiple panel..
ListOrGridTable.prototype.getKey = function() {
	if (!this.repeatOnFieldName)
		return null;
	var colIdx = this.P2.fields[this.repeatOnFieldName].columnIdx;
	return this.grid[this.currentRow][colIdx];
};

var NAVIGATION_ACTIONS = {
	MoveNext : 'next',
	MovePrev : 'prev',
	MoveLast : 'last',
	MoveFirst : 'first',
	DeleteRow : 'del',
	UndeleteRow : 'undelete',
	NewRow : 'new'
};
// some house keeping activities before we are ready to interact with the user
ListOrGridTable.prototype.init = function() {
	// situations where related tables want to control when to init each-other.
	// Hence this feature to avoid double init()
	if (this.inited)
		return;

	if (this.htmlFragments) {
		this.initTemplate();
		return;
	}
	var doc = this.P2.doc;
	this.cloneFlag = 0; // Oct 14 2009 : BugID 722 - Issue related to clone row
	// - Weavit : Vijay
	// cache the html row, as well as data row. These are cloned to add rows
	// later.
	if (this.repeatingColumnName)
		this.cacheRepeatingColumn(doc);

	// is there a right panel with frozen column?
	var thisObj = doc.getElementById(this.name + 'Body');
	if (!thisObj)
		thisObj = doc.getElementById(this.name);
	if (thisObj && thisObj.tBodies)
		this.tableBodyObject = thisObj.tBodies[0];
	else
		// this is rendered as a display panel
		this.tableBodyObject = getFirstNonTextNode(thisObj);

	var firstRow = getFirstNonTextNode(this.tableBodyObject);
	firstRow.rowIdx = 0;
	firstRow.id = this.name + '0';
	this.htmlRowToClone = this.tableBodyObject.removeChild(firstRow);

	if (this.frozenColumnIndex) {
		this.initFrozenPanel(doc);
	}

	this.grid.length = 1;
	this.nbrRows = 0;

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

	if (this.initialNumberOfRows) {
		this.addRows(this.initialNumberOfRows, null);
		this.currentRow = 1;
	}

	// initialization for listPanel with tree view.
	if (this.treeViewInit)
		this.treeViewInit();

	if (this.pageSize && this.pageSize > 0) {
		this.P2.win[this.name + 'PageSize'] = this.pageSize;
	}

	if (this.rowSum || this.rowAverage) {
		var tfoot = doc.getElementById(this.name + 'tfoot');
		tfoot.style.display = '';
	}

	// is there a quick search field attached to ths list panel?
	if (this.quickSearchFieldName) {
		this.quickSearchInit();
	}

	// are there navigation buttons attched to this table?
	this.initNavigationButtons();

	// in case of two grids in a repeating panel, only elder brother is to be
	// initialized, but after both the grids initialize
	// in case of youngerBrother/elderBrother, one who comes afterwords should
	// trigger init
	if (this.repeatOnFieldName) {
		var otherTable = this.elderBrother || this.youngerBrother;
		if (otherTable)
			this.initBrothers(otherTable);
		else
			this.initRepeatingPanel();
	}
	this.inited = true;
};

/**
 * Nested table element is to be moved to this table
 * 
 * @param doc
 */
ListOrGridTable.prototype.initNestedTable = function() {
	var doc = this.P2.doc;
	var ele = doc.getElementById(this.nestedTableName);
	if (!ele) {
		debug(this.nestedTableName + ' is not defined as a list/grid panel');
		return;
	}
	ele.parentNode.removeChild(ele);

	// move the child table dom element into a new tr in this table. This tr
	// will be moved to appropriate place to display the child rows of a clicked
	// row
	this.setNestedTr(ele);

	/**
	 * link both tables
	 */
	var tbl = this.nestedTable = this.P2.tables[this.nestedTableName];
	tbl.nestedParent = this;

	/**
	 * let us remember the index for reuse
	 */
	var field = this.columns[this.nestOnColumnName];
	if (!field) {
		debug(this.nestOnColumnName
				+ ' is declared as the name of the column using which table '
				+ this.name + ' is to be linked too its child table '
				+ this.nestedTableName + '. This column does not exist');
		return;
	}
	this.nestOnIdx = field.columnIdx;

	// column from the child table
	field = tbl.columns[this.nestedTableColumnName];
	if (!field) {
		debug(this.nestedTableColumnName
				+ ' is declared as nestedTableColumnName to link parent table '
				+ this.name + ' with nested table ' + this.nestedTableName
				+ '. this column is not defined in the nested table.');
		return;
	}
	tbl.nestedColumnIdx = field.columnIdx;
};

ListOrGridTable.prototype.setNestedTr = function(div) {
	var tr = this.tableBodyObject.parentNode.insertRow(0);
	tr.style.display = 'none';
	var td = tr.insertCell(0);
	td.colSpan = this.htmlRowToClone.cells.length;
	td.appendChild(div);
	this.nestedTableTr = tr;
};
ListOrGridTable.prototype.EXIL_EXPANDED = 'exil-expanded';
ListOrGridTable.prototype.showNestedTable = function(tr) {
	if (tr.getAttribute(this.EXIL_EXPANDED)) {
		tr.removeAttribute(this.EXIL_EXPANDED);
		this.nestedTableTr.style.display = 'none';
		return;
	}

	if (this.nestedTableTr.parentNode) // it is right now displayed
	{
		var ele = this.nestedTableTr.previousSibling; // tr for which nested
		// rows are currently
		// shown
		if (ele)
			ele.removeAttribute(this.EXIL_EXPANDED); // users should change
		// the icon based on
		// this attribute
		this.nestedTableTr.parentNode.removeChild(this.nestedTableTr);
	}
	this.currentRow = tr.rowIdx;
	var nextTr = tr.nextSibling;
	if (nextTr)
		this.tableBodyObject.insertBefore(this.nestedTableTr, nextTr);
	else
		this.tableBodyObject.appendChild(this.nestedTableTr);
	tr.setAttribute('exil-expanded', 'exil-expanded');
	this.nestedTable.filterData(this.nestedTableColumnName,
			this.grid[this.currentRow][this.nestOnIdx], 'eq');
	this.nestedTableTr.style.display = '';
};

// two tables repeat in-synch based on a column. I don't rememebr why I coined
// the terms younger/elder brother...
ListOrGridTable.prototype.initBrothers = function(otherTableName) {
	var otherTable = this.P2.tables[otherTableName];
	if (!otherTable.inited)
		return;

	// trigger this only after both get inited
	// elder brother gets intied, while younger brother has only two objects
	// initialized
	if (this.elderBrother) {
		otherTable.initRepeatingPanel();
		this.repeatedPanels = new Object();
		this.nbrRepeatedPanels = 0;
	} else {
		this.initRepeatingPanel();
		otherTable.repeatedPanels = new Object();
		otherTable.nbrRepeatedPanels = 0;
	}
};

// cache teh column that is repeated. This is cloned while adding columns at run
// time
ListOrGridTable.prototype.cacheRepeatingColumn = function(doc) {
	var field = this.columns[this.repeatingColumnName];
	this.repeatedField = field;
	field.toBeSentToServer = false;

	// remove and cache repeating column, header and footer
	var ele = doc.getElementById(field.name).parentNode;
	this.repeatingColumnSibling = ele.nextSibling;
	this.repeatingColumnParent = ele.parentNode;
	this.repeatingColumnEle = this.repeatingColumnParent.removeChild(ele);

	ele = doc.getElementById(field.name + 'Label');
	this.repeatingHeaderSibling = ele.nextSibling;
	this.repeatingHeaderParent = ele.parentNode;
	this.repeatingHeaderEle = this.repeatingHeaderParent.removeChild(ele);

	if (this.columnSumIndexes || this.columnAverageIndexes) {
		ele = doc.getElementById(field.name + 'Footer');
		this.repeatingFooterSibling = ele.nextSibling;
		// Jun 11 2009 : BugID 532 - Column sum is not working in dynamic grid -
		// IndiaServices (Start) : Venkat
		this.repeatingFooterParent = ele.parentNode;
		this.repeatingFooterEle = this.repeatingFooterParent.removeChild(ele);
		// Jun 11 2009 : BugID 532 - Column sum is not working in dynamic grid -
		// IndiaServices (End) : Venkat
	}
	this.nbrColumnsRepeated = 0; // changes after a setData()

	if (field.rowSum)
		this.repeatedColumnToBeSummed = true;
	if (field.rowAverage)
		this.repeatedColumnToBeAveraged = true;
};

// A button that is thrown anywhere in the page with a predefined naming
// convention is to act navigationa button for this table
// find them and attach required event handlers for them
ListOrGridTable.prototype.initNavigationButtons = function() {
	// are there navigation buttons attched to this table?
	var buttons = new Object();
	var buttonFound = false;
	for ( var nav in NAVIGATION_ACTIONS) {
		var code = NAVIGATION_ACTIONS[nav];
		var btn = this.P2.doc.getElementById(this.name + nav);
		if (!btn) {
			// debug(this.name + nav + ' is not defined as a button for ' +
			// this.name);
			if (!this.linkedDisplayTable)
				continue;
			// possible that the button is inside the linked display panel
			btn = this.P2.doc.getElementById(this.linkedDisplayTable.name + '_'
					+ this.name + nav);
			if (!btn)
				continue;
		}
		// debug('onclick for ' + btn.id + ' set to ' + nav + ' action for table
		// ' + this.name);
		btn.tableName = this.name;
		btn.navigationAction = code;
		btn.disabled = code != 'new'; // all buttons except new should be
		// disabled by default.
		this.P2.addListener(btn, 'click', this, 'navigate');
		buttons[code] = btn;
		buttonFound = true;
	}
	if (buttonFound)
		this.navigationButtons = buttons;
};

// populate this.linkedColumns as an array of corresponding columns from the
// linked table
// IMP: this is triggered by P2.init(). That ensures that the links are
// available before tables do any activity
ListOrGridTable.prototype.createLinks = function() {
	if (this.nestedTableName) {
		this.initNestedTable();
	}

	if (!this.mergeWithTableName)
		return;

	var table = this.P2.tables[this.mergeWithTableName];
	if (!table) {
		debug(this.name + ' uses ' + this.mergeWithTableName
				+ ' but that table does not exist');
		return;
	}
	this.mergeWithTable = table;
	if (this.stubNameForMerging) // merge with a repeating display panel
	{
		if (!table.tablesToBeMerged) {
			table.tablesToBeMerged = [];
			table.stubsForMergingTables = [];
		}
		table.tablesToBeMerged.push(this);
		table.stubsForMergingTables.push(this.stubNameForMerging);
	} else if (this.mergeOnColumnName) {
		table.childTableToMerge = this;
	} else {
		debug('ERROR:'
				+ this.name
				+ ' is to be merged with '
				+ this.mergeWithTableName
				+ ' but neither stubNameForMerging nor mergeOnColumnName is specified.');
		return;
	}

	// if data is set to this table before the one this is going to merge into,
	// we will have problem because the stubs wouldn't have been cloned
	// hence we should ask P2 not to set data directly to this. Instead, table
	// with with this is going to merge will call setData for this table
	this.doNotSetDataToMe = true; // this panel will take care of that.
	// Otherwise, we have timing issue.
	// and, this panel is not going to be visible.
	this.P2.hideOrShowPanels([ this.name ], 'none');
};

ListOrGridTable.prototype.mergeChildPanel = function(panel, colName, colValue) {
	var col = this.columns[colName];
	if (!col) {
		debug('ERROR: ' + this.name + ' is missing a column by name ' + colName
				+ ' that is used for merging child table with it.');
		return;
	}

	var idx = col.columnIdx;
	var n = this.grid.length;
	var rowIdx = null;
	for ( var i = 1; i < n; i++) {
		if (colValue == this.grid[i][idx]) {
			rowIdx = i;
			break;
		}
	}
	if (rowIdx == null) {
		debug('ERROR: ' + this.name + ' does not have a row with a value of '
				+ colValue + ' in column ' + colName
				+ '. Child table rows are not merged properly.');
		return;
	}
	var tr = this.P2.doc.getElementById(this.name + rowIdx);
	if (tr.tagName == 'TR') {
		tr = this.tableBodyObject.parentNode.insertRow(tr.rowIndex + 1);
		var td = tr.insertCell(0);
		td.colSpan = this.htmlRowToClone.cells.length;
		td.append(panel);
	} else // this list/grid is rendered as a display panel
	{
		tr.appendChild(panel);
	}
};

ListOrGridTable.prototype.initFrozenPanel = function(doc) {
	var body = doc.getElementById(this.name + 'RightBody');
	if (!body)
		body = doc.getElementById(this.name + 'Right');
	this.rightTableBodyObject = body.tBodies[0];
	var firstRow = this.rightTableBodyObject.firstChild;
	firstRow.rowIdx = 0;
	firstRow.id = this.name + 'Right0';
	this.rightHtmlRowToClone = this.rightTableBodyObject.removeChild(firstRow);
	// scroll
	body = doc.getElementById(this.name + 'ScrollBody');
	if (!body)
		return;
	this.scrollTableBodyObject = body.tBodies[0];
	firstRow = this.scrollTableBodyObject.firstChild;
	firstRow.rowIdx = 0;
	firstRow.id = this.name + 'Scroll0';
	this.scrollHtmlRowToClone = this.scrollTableBodyObject
			.removeChild(firstRow);
};

ListOrGridTable.prototype.cloneFrozenRow = function(clsName, idx) {
	var newRow = this.rightHtmlRowToClone.cloneNode(true);
	newRow.className = clsName;
	newRow.rowIdx = idx; // set the pointer to the data row
	newRow.id = this.name + 'Right' + idx; // in case I need to reach the tr
	// with just the index...
	this.rightTableBodyObject.appendChild(newRow);

	if (!this.scrollHtmlRowToClone)
		return;
	newRow = this.scrollHtmlRowToClone.cloneNode(true);
	newRow.className = clsName;
	newRow.rowIdx = idx; // set the pointer to the data row
	newRow.id = this.name + 'Scroll' + idx; // in case I need to reach the tr
	// with just the index...
	if (this.actionDisabled) {
		newRow.style.cursor = 'default';
		newRow.title = 'click action disabled';
	}
	this.scrollTableBodyObject.appendChild(newRow);
};

// data is received from server in a dc. Set it to the table
ListOrGridTable.prototype.setData = function(dc, rowsToBeAppended,
		isFromAppendRows, listServiceOnLoad) // Aug 06 2009 : Bug ID 631 -
// suppressDescOnLoad is not
// working - WeaveIT: Venkat
{
	if (this.htmlFragments) {
		this.setDataToTemplate(dc);
		return;
	}

	if (this.repeatOnFieldName) // repeating panel
	{
		this.setDataToRepeatingPanel(dc, listServiceOnLoad);
		this.aggregate();
		if (this.childTableToMerge)
			this.childTableToMerge.setData(dc, rowsToBeAppended,
					isFromAppendRows);
		return;
	}

	if (this.pageSize) {
		// saved for pagination
		this.initPagination(dc);
	}

	var data = dc.grids[this.name];
	var nbrRows = data.length;

	/**
	 * what about any sorted column?
	 */
	if (this.sortByColumn) {
		this.resetSortImage(this.sortByColumn);
	}
	if (rowsToBeAppended) {
		if (nbrRows < 2)
			return;
		if (!this.serverData)
			this.serverData = [ data[0] ];
		for ( var i = 1; i < nbrRows; i++)
			this.serverData.push(data[i]);
	} else {
		/**
		 * one very special case we have to handle. If this table has a nested
		 * table, it is possible tha the nested table dom element is being
		 * displayed as a tr of this table. We have to save that before removing
		 * all rows, and add it afterwords
		 */
		var nestedDiv = this.nestedTableName
				&& this.P2.doc.getElementById(this.nestedTableName);
		if (nestedDiv) {
			nestedDiv.parentNode.removeChild(nestedDiv);
		}
		this.deleteAllRows();
		if (nestedDiv) {
			this.setNestedTr(nestedDiv);
		}
		this.serverData = data;
	}

	var repeatedData = null;
	if (this.repeatedField) {
		var childTable = dc.grids[this.childTableName];
		this.childGrid = childTable;
		if (this.childKeysTableName) {
			var keys = dc.grids[this.childKeysTableName];
			if (!keys) {
				// Oct 28 2008 : Incorporating Changes from Tanmay : Aravinda
				message("Design Error : Dc is to contain a grid with name = "
						+ this.childKeysTableName, "Error", "Ok", null, null,
						null);
				return;
			}
			repeatedData = this.createDataForRepeatedColumns(childTable, false);
			repeatedData.keys = keys;
		} else
			repeatedData = this.createDataForRepeatedColumns(childTable, true);

		this.repeatedData = repeatedData;
		this.repeatColumns();
	}

	// Has the designer asked for a message on no data?
	var doc = this.P2.doc;
	var msgEle = doc.getElementById(this.name + 'NoData');
	if (msgEle) {
		var tblEle = doc.getElementById(this.panelName)
				|| doc.getElementById(this.name);
		var topEle = doc.getElementById(this.panelName + 'Top');
		var totalRowsEle = doc.getElementById(this.name + 'PaginationData');
		if (nbrRows < 2) {
			if (!rowsToBeAppended) {
				msgEle.style.display = '';
				tblEle.style.display = 'none';
				if (topEle)
					topEle.className = 'collapsedfieldset';
				// April 21 2011 : Synching Bhandi's Changes for handling
				// pagination and no data - Exility App (Start) : Aravinda
				if (totalRowsEle)
					totalRowsEle.style.display = 'none';
				// April 21 2011 : Synching Bhandi's Changes for handling
				// pagination and no data - Exility App (End) : Aravinda
			}
		} else {
			msgEle.style.display = 'none';
			tblEle.style.display = '';
			if (topEle)
				topEle.className = 'expandedfieldset';
			// April 21 2011 : Synching Bhandi's Changes for handling pagination
			// and no data - Exility App (Start) : Aravinda
			if (totalRowsEle)
				totalRowsEle.style.display = '';
			// April 21 2011 : Synching Bhandi's Changes for handling pagination
			// and no data - Exility App (End) : Aravinda
		}
	}
	// should we reset pagination panel?
	if (this.pgEle) {
		this.pgEle.style.display = (nbrRows < 2) ? 'none' : '';
	}
	// reset quicksearch
	if (this.quickSearchEle) {
		this.quickSearchReset();
	}

	if (nbrRows < 2) {
		// are there navigaiton buttons?
		this.resetNavigationButtons();
		// and columnTotals?
		if (this.aggregate)
			this.aggregate();
		if (this.initialNumberOfRows && exilParms.displayInitialRows) {
			this.addRows(this.initialNumberOfRows, null, true,
					listServiceOnLoad);
		}
		this.numberOfOrigDataRows = 0;

		return;
	}

	var serverNames = data[0]; // first row is names
	// let us make a map of recd col to field. fieldCols[i] = j means the ith
	// column value is found in jth column of recd data
	var fieldCols = getcolumnToColumnMap(serverNames, this.columnNames);
	var doc = this.P2.doc;
	this.fieldCols = fieldCols;

	this.currentRow = this.grid.length - 1; // will be incremented
	for ( var i = 1; i < nbrRows; i++) {
		this.currentRow++;
		// add an html row
		var newRow = this.htmlRowToClone.cloneNode(true);
		var newDataRow = new Array(this.nbrColumns);
		var clsName = (this.currentRow % 2) ? 'row2' : 'row1';
		newRow.className = clsName;
		newRow.rowIdx = this.currentRow; // set the pointer to the data row
		newRow.id = this.name + this.currentRow; // in case I need to reach
		// the tr with just the
		// index...
		this.tableBodyObject.appendChild(newRow);
		newDataRow.tr = newRow;

		if (this.frozenColumnIndex) {
			this.cloneFrozenRow(clsName, this.currentRow);
			newDataRow.righTr = this.rightTableBodyObject.lastChild;
		}

		// is there a delete checkbox/img?
		var delObj = doc.getElementById(this.name + '_' + this.name + 'Delete');
		if (delObj)
			delObj.id = delObj.id + '__' + this.currentRow;
		// add a data row
		if (rowsToBeAppended)
			newDataRow.isAppended = true;
		this.grid.push(newDataRow);
		this.addDataToARow(doc, newDataRow, newRow.rowIdx, data[i], fieldCols,
				null, isFromAppendRows, listServiceOnLoad); // Aug 06 2009 : Bug
		// ID 631 -
		// suppressDescOnLoad
		// is not working -
		// WeaveIT: Venkat

		// code block for listPanel with tree view.
		if (this.treeViewColumnName && this.treeViewKeyColumn
				&& this.treeViewParentKeyColumn && this.treeViewHasChildColumn) {
			this.renameTreeIds(i);
			this.treeViewIndentRow(i, newDataRow, newRow);
		}

		if (this.repeatedField) {
			var pkey = newDataRow[this.idIdx];
			this.setDataToRepeatedColumns(doc, pkey, i);
		}
	}
	if (this.treeViewColumnName) {
		// clear the bulk checkbox in header
		var bulkChk = this.P2.doc.getElementById(this.name + 'BulkCheck');
		if (bulkChk)
			bulkChk.checked = false;
	}
	if (this.initialNumberOfRows && this.initialNumberOfRows > nbrRows
			&& exilParms.displayInitialRows) {
		this.addRows(this.initialNumberOfRows - nbrRows, null, true,
				listServiceOnLoad);
	}
	/*
	 * Sorting failed in Table in case of initialNumberofRows < actual number of
	 * rows in the grid because this.numberOfOrigDataRows is not initialized.
	 * --Pathfinder Harsha Bhat
	 */
	if (nbrRows > 1)
		this.numberOfOrigDataRows = nbrRows;

	this.nbrRows += nbrRows - 1; // Nov 27 2008 : If data already exists,
	// rows will be incremented : Aravinda
	if (!rowsToBeAppended)
		this.simulateClickIfRequired();

	if (this.hasAggregates)
		this.aggregate();

	this.hideOrShowColumns();
	this.resetNavigationButtons();
	// setting data to child table is our responsibility
	if (this.childTableToMerge)
		this.childTableToMerge.setData(dc);
};

/**
 * template based table. When data is received, we concatenate fragments to
 * create new innerHTML for the parent node
 */
ListOrGridTable.prototype.setDataToTemplate = function(dc) {
	var htmlText = "";
	var grid = dc.grids[this.name];
	/**
	 * no-data fragment is the second row
	 */
	var noDataText = "";
	var fragment = this.htmlFragments[1];
	if (fragment && fragment[0] == 1) {
		noDataText = fragment[2];
	}

	if (!grid || grid.length < 2) {
		htmlText = noDataText;
	} else {
		var t = [];
		var tableStartsAt = 1;
		fragment = this.htmlFragments[0]; // initial text
		if (noDataText) {
			fragment = this.htmlFragments[2];
			tableStartsAt = 3;
		}
		t.push(fragment[2]); // initial data before repeating for each row of
		// the table
		var f = this.getHtmlForATable(t, dc, grid, tableStartsAt);
		t.push(this.htmlFragments[f][2]);
		htmlText = t.join('');
	}

	this.tableBodyObject.innerHTML = htmlText;
};

/**
 * append html fragments and column values
 * 
 * @param t
 *            array to be used for pusing text
 * @param dc
 *            data store
 * @param data
 *            data table. first row is header and others are data rows
 * @param startAt
 *            pointer to this.htmlFragments to start at. This HAS to be a
 *            begin-data fragment
 */
ListOrGridTable.prototype.getHtmlForATable = function(t, dc, data, startAt) {
	if (!data || !data.length || data.length < 2) {
		debug("no data rows found for an embedded table "
				+ this.htmlFragments[startAt][1]);
		return;
	}

	var fragment = this.htmlFragments[startAt];
	var initialText = fragment[2];
	var indexToReturn = null;
	/**
	 * for each row in data (first row is header) append all framgents
	 */
	for ( var i = 1; i < data.length; i++) {
		t.push(initialText);
		var row = data[i];

		/**
		 * push each fragment, till we hit end of this table. For safety, we are
		 * putting end of fragments as teh limit for this loop, but it is a bug
		 * if we hit there
		 */
		var f = startAt + 1;
		var nbrFragments = this.htmlFragments.length;
		while (f < nbrFragments) {
			fragment = this.htmlFragments[f];
			var fragmentType = fragment[0];
			/**
			 * type can have only three values 3 : beginning of another table, 4 :
			 * end of table, 5 : column
			 */
			if (fragmentType == 4) {
				indexToReturn = f;
				break;
			}

			if (fragmentType == 3) {
				var tableName = fragment[1];
				var childRows = this.filterRowsFromChildTable(
						dc.grids[tableName], row[0]);
				f = this.getHtmlForATable(t, dc, childRows, f);
				t.push(this.htmlFragments[f][2]);
			} else if (fragmentType == 5) {
				/**
				 * push column value followed by the next html fragment
				 */
				var idx = fragment[1];
				// idx is 1 based, with 0 means the row index itself
				if (idx == 0)
					t.push(i);
				else
					t.push(row[idx - 1]);
				t.push(fragment[2]);
			} else {
				debug("Error in algorithm. Unable to create inner html for rows of table "
						+ this.tableName);
			}
			f++;
		}
	}
	return indexToReturn;
};

/**
 * filter rows from data based on supplied key
 * 
 * @param data
 *            second column in this table is assumed to be the "foreign key"
 *            that should match the supplied key
 * @param key
 *            to be used for filtering
 */
ListOrGridTable.prototype.filterRowsFromChildTable = function(data, key) {
	/**
	 * pardon me for being a person with negative outlook :-)
	 */
	if (!data || !data.length || !data[0] || !(data[0].length > 1))
		return [ [] ];

	var filteredGrid = [ data[0] ]; // start with the header row
	for ( var i = 1; i < data.length; i++) {
		var row = data[i];
		if (row[1] == key) {
			filteredGrid.push(row);
		}
	}
	debug(filteredGrid.length + " rows filtered. This iincludes the header row");
	return filteredGrid;
};

/**
 * initialize for template based panel. As of now, we just cache the top element
 * whose innerHTML will be reset at run time
 */
ListOrGridTable.prototype.initTemplate = function() {
	this.tableBodyObject = this.P2.doc.getElementById(this.name);
	if (!this.tableBodyObject) {
		alert('An element with id '
				+ this.name
				+ ' is required for this page to work properly. It is missing in the html template used by this page.');
	}

};

ListOrGridTable.prototype.simulateClickIfRequired = function() {
	// debug('this.simulateClickOnFirstRow=' + this.simulateClickOnFirstRow + '
	// and this.simulateClickOnRow=' + this.simulateClickOnRow);
	var idx;
	if ((this.simulateClickOnFirstRow)
			|| (this.simulateClickOnRow == rowType.first)) {
		idx = 1;
	}

	else if (this.simulateClickOnRow == rowType.current) {
		idx = this.currentRow;
	} else if (this.simulateClickOnRow == rowType.next) {
		idx = this.getNextRow(this.currentRow, false, false) || this.currentRow;
	} else
		return false;
	debug('going to simulate a click on ' + this.name);
	this.clicked(this.P2.doc.getElementById(this.name + idx));
	return true;
};
// reset row1/row2 class names for rows. This is useful if soome rows are to be
// hidden by user script
ListOrGridTable.prototype.setRowCss = function() {
	var rows = this.tableBodyObject.childNodes;
	if (!rows || !rows.length)
		return;
	var firstRow = true;
	for ( var i = 0; i < rows.length; i++) {
		var tr = rows[i];
		if (tr.style.display == 'none')
			continue;
		tr.className = firstRow ? 'row1' : 'row2';
		firstRow = !firstRow;
	}
};

ListOrGridTable.prototype.deleteAllRows = function() {
	// remove rows from the table dom object
	var tBody = this.tableBodyObject;
	var len;
	// IE does not like innerHTML for table compnents
	if (tBody.deleteRow && tBody.rows.length) {
		len = tBody.rows.length;

		while (--len >= 0)
			tBody.deleteRow(len);
	} else // rendered as display panel
	{
		tBody.innerHTML = '';
	}

	if (this.frozenColumnIndex) {
		tBody = this.rightTableBodyObject;
		len = this.rightTableBodyObject.childNodes.length;
		// this is guaranteed to be tbody..
		while (--len >= 0)
			tBody.deleteRow(len);
		tBody = this.scrollTableBodyObject;
		if (tBody) {
			len = this.rightTableBodyObject.childNodes.length;
			while (--len >= 0)
				tBody.deleteRow(len);
		}
	}

	// remove rows from data
	this.grid.length = 1;
	this.nbrRows = 0;

	// done if no repeating field, or if last time there were no repeated
	// columns
	if (!this.repeatedField || !this.nbrColumnsRepeated)
		return;

	var ele;
	while (this.nbrColumnsRepeated) {
		this.nbrColumnsRepeated--;
		if (this.repeatingHeaderSibling)
			ele = this.repeatingHeaderSibling.previousSibling;
		else
			ele = this.repeatingHeaderParent.lastChild;
		this.repeatingHeaderParent.removeChild(ele);

		if (this.repeatingColumnSibling)
			ele = this.repeatingColumnSibling.previousSibling;
		else
			ele = this.repeatingColumnParent.lastChild;
		this.repeatingColumnParent.removeChild(ele);

		if (!this.repeatingFooterParent)
			continue;

		if (this.repeatingFooterSibling)
			ele = this.repeatingFooterSibling.previousSibling;
		else
			ele = this.repeatingFooterParent.lastChild;
		this.repeatingFooterParent.removeChild(ele);
	}
};

ListOrGridTable.prototype.deleteAllRowsFromRepeatingPanel = function() {
	for ( var i = 0; i < this.addedElements.length; i++) {
		var ele = this.addedElements[i];
		if (ele && ele.parentNode)
			ele.parentNode.removeChild(ele);
	}
	this.addedElements = new Array();
	this.repeatedPanels = new Object();
	this.nbrRepeatedPanels = 0;
};
/**
 * definitely needs refactoring. This method is probably the lenghtiest I have
 * seen
 */
ListOrGridTable.prototype.addDataToARow = function(doc, localRow, rowIdx,
		serverRow, fieldCols, key, isFromAppendRows, listServiceOnLoad) {
	var ele;
	var suffix = '__' + rowIdx;
	// is there a sequence number?
	if (this.addSeqNo) {
		ele = doc.getElementById(this.name + 'SeqNo');
		if (!ele)
			debug('sequence number field not found for table ' + this.name);
		else {
			ele.id += suffix;
			ele.innerHTML = rowIdx;
		}
	}

	var delEle = doc
			.getElementById(this.name + '_' + this.panelName + 'Delete');
	if (delEle) {
		var delEleNewId = delEle.id + suffix;
		delEle.id = delEleNewId;
	}

	if (this.rowsCanBeDeleted) {
		ele = doc.getElementById(this.name + '_' + this.name + 'Delete');
		if (ele) {
			ele.id += suffix;
			ele.rowIdx = rowIdx;
		}
	}

	var n = this.columnNames.length;
	var val;
	var changedFields = new Array();
	var changedField = null;
	var defaultDataRow = new Array();
	if ((this.dataForNewRowToBeClonedFromFirstRow || (this.dataForNewRowToBeClonedFromRow == rowType.first))
			&& isFromAppendRows && (this.grid.length > 2)) {
		var rowLength = 1;
		for (rowLength = 1; rowLength < this.grid.length; rowLength++) {
			if (this.grid[rowLength])
				break;
		}
		for ( var defColCtr = 0; defColCtr < n; defColCtr++) {
			defaultDataRow[defColCtr] = this.grid[rowLength][defColCtr];
		}
		if (this.newRowColumnsNotToBePopulatedWithData
				&& this.newRowColumnsNotToBePopulatedWithData != "") {
			var newRowColumns = this.newRowColumnsNotToBePopulatedWithData
					.split(',');
			for ( var newRowColCtr = 0; newRowColCtr < newRowColumns.length; newRowColCtr++) {
				for ( var colCtr = 0; colCtr < n; colCtr++) {
					if (this.columnNames[colCtr] == newRowColumns[newRowColCtr]) {
						var curColumn = this.columns[this.columnNames[colCtr]];
						if (curColumn.defaultValue)
							defaultDataRow[colCtr] = curColumn.defaultValue;
						else
							defaultDataRow[colCtr] = "";

						break;
					}
				}
			}
		}
	} else if ((this.dataForNewRowToBeClonedFromRow == rowType.last)
			&& isFromAppendRows && (this.grid.length > 2)) {
		var lastNonNullRow = this.grid.length - 2;
		while (((!this.grid[lastNonNullRow]) && (lastNonNullRow > 0))
				|| (this.grid[lastNonNullRow].isDeleted))
			lastNonNullRow--;
		for ( var defColCtr = 0; defColCtr < n; defColCtr++) {
			defaultDataRow[defColCtr] = this.grid[lastNonNullRow][defColCtr];
		}
		if (this.newRowColumnsNotToBePopulatedWithData
				&& this.newRowColumnsNotToBePopulatedWithData != "") {
			var newRowColumns = this.newRowColumnsNotToBePopulatedWithData
					.split(',');
			for ( var newRowColCtr = 0; newRowColCtr < newRowColumns.length; newRowColCtr++) {
				for ( var colCtr = 0; colCtr < n; colCtr++) {
					if (this.columnNames[colCtr] == newRowColumns[newRowColCtr]) {
						var curColumn = this.columns[this.columnNames[colCtr]];
						if (curColumn.defaultValue)
							defaultDataRow[colCtr] = curColumn.defaultValue;
						else
							defaultDataRow[colCtr] = "";

						break;
					}
				}
			}
		}
	} else if ((this.dataForNewRowToBeClonedFromRow == rowType.current)
			&& isFromAppendRows && (this.grid.length > 2)) {
		for ( var defColCtr = 0; defColCtr < n; defColCtr++) {
			defaultDataRow[defColCtr] = this.grid[this.currentRow][defColCtr];
		}
		if (this.newRowColumnsNotToBePopulatedWithData
				&& this.newRowColumnsNotToBePopulatedWithData != "") {
			var newRowColumns = this.newRowColumnsNotToBePopulatedWithData
					.split(',');
			for ( var newRowColCtr = 0; newRowColCtr < newRowColumns.length; newRowColCtr++) {
				for ( var colCtr = 0; colCtr < n; colCtr++) {
					if (this.columnNames[colCtr] == newRowColumns[newRowColCtr]) {
						var curColumn = this.columns[this.columnNames[colCtr]];
						if (curColumn.defaultValue)
							defaultDataRow[colCtr] = curColumn.defaultValue;
						else
							defaultDataRow[colCtr] = "";

						break;
					}
				}
			}
		}
	} else if ((this.dataForNewRowToBeClonedFromRow == rowType.next)
			&& isFromAppendRows && (this.grid.length > 2)) {
		var nextRow = 0;
		if (this.grid.length > (this.currentRow + 2))
			nextRow = this.currentRow + 1;

		while (this.grid[nextRow] == null && nextRow < this.grid.length) {
			nextRow = nextRow + 1;
		}
		for ( var defColCtr = 0; defColCtr < n; defColCtr++) {
			defaultDataRow[defColCtr] = this.grid[nextRow][defColCtr];
		}

		if (this.newRowColumnsNotToBePopulatedWithData
				&& this.newRowColumnsNotToBePopulatedWithData != "") {
			var newRowColumns = this.newRowColumnsNotToBePopulatedWithData
					.split(',');
			for ( var newRowColCtr = 0; newRowColCtr < newRowColumns.length; newRowColCtr++) {
				for ( var colCtr = 0; colCtr < n; colCtr++) {
					if (this.columnNames[colCtr] == newRowColumns[newRowColCtr]) {
						var curColumn = this.columns[this.columnNames[colCtr]];
						if (curColumn.defaultValue)
							defaultDataRow[colCtr] = curColumn.defaultValue;
						else
							defaultDataRow[colCtr] = "";

						break;
					}
				}
			}
		}
	} else
		defaultDataRow = this.grid[0];

	/**
	 * if this is a nested child table, we need to populate the nested-on field
	 */
	var nestedParent = this.nestedParent;
	if (nestedParent) {
		defaultDataRow[this.nestedColumnIdx] = nestedParent
				.getKeyForNestedChild();
	}
	// for each field, rename id and push data
	for ( var j = 0; j < n; j++) {
		var columnName = this.columnNames[j];
		var field = this.columns[columnName];
		if (this.repeatedField && this.repeatedField == field)
			continue;
		ele = doc.getElementById(field.name);
		val = defaultDataRow[j];
		if (serverRow) {
			if (fieldCols && (fieldCols[j] || fieldCols[j] == 0)) // append
			// row case
			{
				val = serverRow[fieldCols[j]];
				if (val) {
					var dt = dataTypes[field.dataType];
					if (dt)
						val = dt.formatIn(val);
				}
			} else if (isFromAppendRows) {
				if (serverRow[j] == null || serverRow[j] == "")
					val = field.defaultValue;
				else
					val = serverRow[j];
			}
		} else if (key && field.name == this.repeatOnFieldName)
			val = key;
		else if (field.initSelection && this.cloneFlag == 0) // a dropdown.
			// see if we
			// have to
			// select first
			// option etc..
			// Oct 14 2009 :
			// Bug ID 722 -
			// Issue related
			// to clone row
			// - Weavit :
			// Vijay
			val = field.initSelection(ele);

		// id field is a must. If it is not there, we will have to generate -ve
		// numbers
		if (!val && this.idFieldName && j == this.idIdx) {
			if (this.localId)
				this.localId--;
			else
				this.localId = -1;
			val = this.localId;
			localRow.keyIsGenerated = true;
		}

		localRow[j] = val;
		if (!ele) {
			debug('DESIGN ERROR :table= ' + this.name + ' field =' + field.name
					+ ' is not found in dom');
			continue;
		}
		var objectVal = val;
		if (val && field.formatter)
			objectVal = field.format(val);
		field.setValueToObject(ele, objectVal);
		if ((val != defaultDataRow[j])
				|| ((val != "")
						&& (this.dataForNewRowToBeClonedFromFirstRow
								|| (this.dataForNewRowToBeClonedFromRow == rowType.current)
								|| (this.dataForNewRowToBeClonedFromRow == rowType.next)
								|| (this.dataForNewRowToBeClonedFromRow == rowType.first) || (this.dataForNewRowToBeClonedFromRow == rowType.last)) && isFromAppendRows)) // Oct
		// 22
		// 2009
		// :
		// Bug
		// ID
		// 744
		// -
		// Addrow
		// Issue
		// in
		// Dynamic
		// Tabpanel
		// -
		// SAB
		// Miller
		// :
		// Venkat
		{
			changedField = new Object();
			changedField.field = field;
			changedField.val = val;
			changedField.ele = ele;
			changedFields.push(changedField);
		}
		var newId = field.name + suffix;
		ele.id = newId;
		ele.rowIdx = rowIdx;
		if (field.isRadio) {
			// ele is the span element that contains all radio elements with
			// their labels.
			// We have to recreate them with changed names. only name= is
			// changed. name in event handlers should not be changed
			// we are using split and join as effective replace operation
			var curText = ele.innerHTML;
			var newText = curText.split(field.name + 'Radio').join(
					newId + 'Radio');
			ele.innerHTML = newText;
			field.setValueToObject(ele, objectVal);
		}

		if (field.isCheckbox && ele.innerHTML.length > 0) {
			var curText = ele.innerHTML;
			var newText = curText.split(field.name + 'Checkbox').join(
					newId + 'Checkbox');
			ele.innerHTML = newText;
			if (val) {
				var ValArr = val.split('|');
				for ( var k = 0; k < ValArr.length; k++) {
					for ( var i = 0; i < ele.childNodes.length; i++) {
						if (ele.childNodes[i].type
								&& ele.childNodes[i].type.toUpperCase() == "CHECKBOX") {
							if (ele.childNodes[i].value == ValArr[k])
								ele.childNodes[i].checked = true;
						}
					}
				}
			}
		}

		// is there a picker ?
		for ( var ri = 0; ri < relatedElementSuffixes.length; ri++) {
			ele = doc.getElementById(field.name + relatedElementSuffixes[ri]);
			if (ele) {
				ele.id = newId + relatedElementSuffixes[ri];
				ele.rowIdx = rowIdx;
			}

		}

	}
	// trigger fields changed events..
	for ( var i = 0; i < changedFields.length; i++) {
		changedField = changedFields[i];
		if (changedField.field.triggerFieldChangedEvents) {
			if (changedField.field.supressDescOnLoad && (!isFromAppendRows))
				changedField.field.triggerFieldChangedEvents(changedField.val,
						changedField.ele, rowIdx,
						changedField.field.supressDescOnLoad, true,
						listServiceOnLoad); // Aug 06 2009 : Bug ID 631 -
			// suppressDescOnLoad is not working
			// - WeaveIT: Venkat
			else
				changedField.field.triggerFieldChangedEvents(changedField.val,
						changedField.ele, rowIdx, false, true,
						listServiceOnLoad); // Aug 06 2009 : Bug ID 631 -
			// suppressDescOnLoad is not working
			// - WeaveIT: Venkat
		}
	}

	var buttonElements = this.htmlRowToClone.childNodes;
	for ( var i = 0; i < buttonElements.length; i++) {
		for ( var x = 0; x < buttonElements[i].childNodes.length; x++) {
			var buttonNode = new Array();
			buttonNode = buttonElements[i].childNodes[x];
			if (buttonNode.type
					&& (buttonNode.type.toUpperCase() == 'BUTTON'
							|| buttonNode.type.toUpperCase() == 'SUBMIT' || buttonNode.type
							.toUpperCase() == 'IMAGE')) {
				var ele = doc.getElementById(buttonNode.id);
				if (ele) {
					var newId = buttonNode.id + suffix;
					ele.id = newId;
					ele.rowIdx = rowIdx;
				}
			} else if (buttonNode.tagName
					&& buttonNode.tagName.toUpperCase() == 'TABLE'
					&& buttonNode.className == 'buttonelementtable') {
				var buttonNodes = new Array();
				buttonNodes = buttonNode.childNodes[buttonNode.childNodes.length - 1];
				var buttonNodeTables = buttonNodes.childNodes[0].childNodes;
				for ( var j = 0; j < buttonNodeTables.length; j++) {
					var ele = doc.getElementById(buttonNodeTables[j].id);
					if (ele) {
						var newId = buttonNodeTables[j].id + suffix;
						ele.id = newId;
						ele.rowIdx = rowIdx;

						for ( var k = 0; k < ele.childNodes.length; k++) {
							if (ele.childNodes[k].tagName
									&& ele.childNodes[k].tagName.toUpperCase() == 'FONT') {
								var newId = ele.childNodes[k].id + suffix;
								ele.childNodes[k].id = newId;
								ele.childNodes[k].rowIdx = rowIdx;
							}
						}
					}
				}
			}
		}
	}

	// for tree view
	if (this.treeViewColumnName) {
		this.treeViewIndentRow(rowIdx);
	}
};

/**
 * return key from current row for the nexted child row
 */
ListOrGridTable.prototype.getKeyForNestedChild = function() {
	return this.grid[this.currentRow][this.nestOnIdx];
};

ListOrGridTable.prototype.addInitialRowsToRepeatingPanel = function(dc,
		listServiceOnLoad) {
	var data = dc.grids[this.name];
	var serverNames = data[0];
	var keyName = this.P2.fields[this.repeatOnFieldName].unqualifiedName;
	var keyIdx = getColumnIndex(serverNames, keyName);
	var lastKey = null;

	for ( var i = 1; i < data.length; i++) {
		var serverData = data[i];
		var key = serverData[keyIdx];
		if (key != lastKey) {
			lastKey = key;
			var nbrToAdd = this.initialNumberOfRows
					- this.repeatedPanels[key].childNodes.length;
			if (nbrToAdd > 0) {
				this.addRows(nbrToAdd, key, true, listServiceOnLoad);
			}
		}
	}
};

ListOrGridTable.prototype.addRows = function(nbrRowsToAdd, key,
		isFromAddTableRow, listServiceOnLoad) // Aug 06 2009 : Bug ID 631 -
// suppressDescOnLoad is not
// working - WeaveIT: Venkat
{
	var tBody = key ? this.repeatedPanels[key] : this.tableBodyObject;
	if (this.maxRows && this.maxRows < (this.countAllRows() + nbrRowsToAdd)) {
		// Oct 28 2008 : Incorporating Changes from Tanmay : Aravinda
		message(
				'You can have a maximum of '
						+ this.maxRows
						+ ' data rows. If you intend to delete some rows, please do that before adding a new row',
				"Warning", "Ok", null, null, null);
		return;
	}
	var doc = this.P2.doc;
	var i = 1;
	while (i <= nbrRowsToAdd) {
		var n = this.grid.length;
		this.nbrRows++;
		var eles = this.htmlRowToClone.getElementsByTagName('INPUT');
		for ( var k = 0; k < eles.length; k++) {
			eles[k].removeAttribute('disabled', 0);
		}
		eles = this.htmlRowToClone.getElementsByTagName('SELECT');
		for ( var k = 0; k < eles.length; k++) {
			eles[k].removeAttribute('disabled', 0);
		}
		var eles = this.htmlRowToClone.getElementsByTagName('TEXTAREA');
		for ( var k = 0; k < eles.length; k++) {
			eles[k].removeAttribute('disabled', 0);
		}

		var newRow = this.htmlRowToClone.cloneNode(true);
		var clsName = (n % 2) ? 'row2' : 'row1';
		newRow.className = clsName;
		newRow.rowIdx = n; // set the pointer to the data row
		newRow.id = this.name + n; // in case I need to reach the tr with just
		// the index...
		if (this.actionDisabled) {
			newRow.style.cursor = 'default';
			newRow.title = 'row click is disabled';
		}
		tBody.appendChild(newRow);

		if (isFromAddTableRow && this.repeatedField)
			this.setDataToRepeatedColumns(doc, null, n);

		if (this.frozenColumnIndex) {
			this.cloneFrozenRow(clsName, n);
		}
		// add a data row
		var newDataRow = new Array(this.nbrColumns);
		newDataRow.addedByUser = true;
		this.grid.push(newDataRow);
		this.addDataToARow(doc, newDataRow, n, null, null, key,
				isFromAddTableRow, listServiceOnLoad); // Aug 06 2009 : Bug ID
		// 631 -
		// suppressDescOnLoad is
		// not working -
		// WeaveIT: Venkat
		i++;
		if (this.nestedTableOwner && isFromAddTableRow) {
			var ntOwner = this.P2.getTable(this.nestedTableOwner);
			var nestOnField = (ntOwner.nestOnColumnName) ? ntOwner.columns[ntOwner.nestOnColumnName]
					: null;

			if (!nestOnField) {
				return;
			}
			var nestOnFieldVal = this.P2.getFieldValue(nestOnField.name);

			// nestedOnField in nested table.
			var nestOnFieldName = this.columns[ntOwner.nestOnColumnName].name;

			if (!nestOnFieldName) {
				debug("Error: [" + ntOwner.nestOnColumnName
						+ "] is not exist for the grid [" + this.name + "]");
				return;
			}
			this.P2.setFieldValue(nestOnFieldName, nestOnFieldVal);

		}

	}
	if (this.totalRows)
		this.totalRows += nbrRowsToAdd;
	this.currentRow = this.grid.length - 1;
	// position cursor if required
	if (this.firstFieldName) {
		var eleName = this.getObjectId(this.firstFieldName, this.currentRow);
		try {
			doc.getElementById(eleName).focus();
		} catch (e) {
			//
		}
	}
	if (this.hasAggregates)
		this.aggregate();
	if (this.quickSearchEle) {
		this.quickSearchAdd(nbrRowsToAdd); // added rows to be
	}
	if (this.linkedDisplayTable) {
		var idxToClick = this.currentRow + nbrRowsToAdd - 1; // first row
		// that got
		// added
		this.clicked(doc.getElementById(this.name + idxToClick));
	} else
		this.resetNavigationButtons();
	// we may need to resize window
	this.P2.win.checkIframeSize();

};
ListOrGridTable.prototype.cloneRow = function(idx) {
	if (!idx)
		idx = this.currentRow;
	var doc = this.P2.doc;
	var tr = doc.getElementById(this.name + idx);
	if (!tr) {
		debug('Design Error : could not get row for insert with name = '
				+ this.name + idx);
		return;
	}
	tr = tr.nextSibling;
	var currentDataRow = this.grid[idx];
	var newDataRow = new Array();
	for ( var i = 0; i < currentDataRow.length; i++) {
		newDataRow[i] = currentDataRow[i];
	}
	newDataRow.addedByUser = true;

	// bulk action to be set to 'add'
	if (this.actionFieldName) {
		newDataRow[this.actionIdx] = 'add';
	}

	// whatabout the id?
	var pkey = null; // primary key. will be used if columns are repeated
	if (this.idFieldName) {
		pkey = newDataRow[this.idIdx];
		newDataRow[this.idIdx] = '';
	}
	this.nbrRows++;
	var n = this.grid.length; // this is the idx at which this row is going to
	// sit inside this.grids
	this.grid.push(newDataRow);

	var newRow = this.htmlRowToClone.cloneNode(true);
	newRow.className = (n % 2) ? 'row2' : 'row1';
	newRow.rowIdx = n; // set the pointer to the data row
	newRow.id = this.name + n; // in case I need to reach the tr with just the
	// index...
	if (tr)
		this.tableBodyObject.insertBefore(newRow, tr);
	else
		this.tableBodyObject.appendChild(newRow);

	this.addDataToARow(doc, newDataRow, n, null, null, null, true);
	// if (this.repeatedField)
	if (this.idFieldName) {
		// set id field to a local id (a negative number that helps in linking
		// child values to main row
		if (!this.localId)
			this.localId = 0;
		this.localId--;
		newDataRow[this.idIdx] = this.localId;
		newDataRow.keyIsGenerated = true;

		// copy childtable data as well for repeated columns
		if (this.repeatedField) {
			var data = this.repeatedData.data[pkey];
			var newData = new Object();
			for ( var x in data) {
				newData[x] = data[x];
			}
			this.repeatedData.data[this.localId] = newData;
			this.setDataToRepeatedColumns(doc, pkey, n);
		}
	}
	this.resetNavigationButtons();
	// we may need to resize window
	this.P2.win.checkIframeSize();

};

ListOrGridTable.prototype.getTBody = function(key, label) {
	var tbody = this.repeatedPanels[key];
	if (tbody)
		return tbody;
	// we have to add this.
	if (this.elderBrother) {
		var eb = this.P2.tables[this.elderBrother];
		eb.cloneAndAddPanel(key, label, this.name, this.elderBrother);
		eb.changeIdsOfAddedPanel(key);
	} else {
		this.cloneAndAddPanel(key, label, this.name, this.youngerBrother);
		if (this.youngerBrother) {
			var yb = this.P2.tables[this.youngerBrother];
			yb.changeIdsOfAddedPanel(key);
		}
	}

	return this.changeIdsOfAddedPanel(key);
};

ListOrGridTable.prototype.hideField = function(fieldName) {
	this.hideOrShowField(fieldName, 'none');
};

ListOrGridTable.prototype.hideOrShowField = function(fieldName, display) {
	var doc = this.P2.doc;
	var ele = doc.getElementById(fieldName + 'Label');
	// label is not to be hidden ???
	/*
	 * if(ele) { if(ele.tagName == 'th' || ele.tagName == 'TH')
	 * ele.style.display = display; else ele.parentNode.style.display = display; }
	 */
	for ( var i = 1; i < this.grid.length; i++) {
		var row = this.grid[i];
		if (!row)
			continue;
		var eleName = this.getObjectId(fieldName, i);
		ele = doc.getElementById(eleName);
		if (ele) {
			ele.style.display = display;
			ele = ele.nextSibling;
			if (ele && ele.nodeType == '3')
				ele = ele.nextSibling;
			if (ele)
				ele.style.display = display;
		}
	}
};
// SHOULD BE CHANGED TO GET COLIDX and used that rather than getting obj based
// id etc..
ListOrGridTable.prototype.hideOrShowColumns = function() {
	var doc = this.P2.doc;
	if (this.columnName && this.displayList) {
		var columnNames = new Array();
		var displayList = new Array();
		columnNames = this.columnName;
		displayList = this.displayList;
		for ( var j = 0; j < columnNames.length; j++) {
			var ele = doc.getElementById(columnNames[j] + 'Label');
			if (ele)
				ele.style.display = displayList[j];
			for ( var i = 1; i < this.grid.length; i++) {
				var row = this.grid[i];
				if (!row)
					continue;
				var eleName = columnNames[j] + '__' + i;
				ele = doc.getElementById(eleName);
				if (ele)
					ele.parentNode.style.display = displayList[j];
				if (ele.nextSibling)
					ele = ele.nextSibling;
				if (ele && ele.nodeType == '3')
					ele = ele.nextSibling;
				if (ele)
					ele.parentNode.style.display = displayList[j];
			}
			ele = doc.getElementById(columnNames[j] + 'Footer');
			if (ele)
				ele.style.display = displayList[j];
		}
	}
};

// called when mouse enters a row.
ListOrGridTable.prototype.mouseOver = function(tr, e, internalCall) {
	if (!tr.saveBgc)
		tr.saveBgc = tr.style.backgroundColor;
	if (exilParms.listHoverColor)
		tr.style.backgroundColor = exilParms.listHoverColor;
	if (internalCall) // avoid infinite recursion..
		return;

	if (this.frozenColumnIndex)// we have to simulate mouseover on the other
	// side as well
	{
		var otherId = 'Right';
		if (tr.id.indexOf('Right' + tr.rowIdx) > 0)// this is the left side
			otherId = '';
		var otherTr = this.P2.doc.getElementById(this.name + otherId
				+ tr.rowIdx);
		this.mouseOver(otherTr, e, true);
	}
	if (!PM.toolTipEle)
		return;
	// are we doing this always????
	var cursorX = 0;
	var cursorY = 0;

	if (e.pageX || e.pageY) {
		cursorX = e.pageX;
		cursorY = e.pageY;
	} else {
		cursorX = e.clientX
				+ (document.documentElement.scrollLeft || document.body.scrollLeft)
				- document.documentElement.clientLeft;
		cursorY = e.clientY
				+ (document.documentElement.scrollTop || document.body.scrollTop)
				- document.documentElement.clientTop;
	}

	var trValues = [];
	var cells = tr.cells;
	var n = tr.cells.length;
	for ( var cellctr = 0; cellctr < n; cellctr++) {
		trValues.push(cells[cellctr].innerHTML);
	}
	PM.toolTipEle.innerHTML = '<span class="field" style:"background-color: yellow;">'
			+ trValues.join('-') + '</span>';
	PM.toolTipStyle.top = cursorY + 130 + "px";
	PM.toolTipStyle.left = cursorX + 130 + "px";
	PM.toolTipStyle.display = 'inline';
};

// called when mouse leaves a row
ListOrGridTable.prototype.mouseOut = function(tr, e, internalCall) {
	tr.style.backgroundColor = tr.saveBgc || '';
	if (internalCall) // avoid infinite loop.
		return;
	if (this.frozenColumnIndex)// we have to simulate mouseover on the other
	// side as well
	{
		var otherId = 'Right';
		if (tr.id.indexOf('Right' + tr.rowIdx) > 0)// this is the left side
			otherId = '';
		var otherTr = this.P2.doc.getElementById(this.name + otherId
				+ tr.rowIdx);
		this.mouseOut(otherTr, e, true);
	}
	if (PM.toolTipEle) {
		PM.toolTipEle.innerHTML = '';
		PM.toolTipStyle.display = 'none';
	}
};

// PathFinder uses grid as list!!! onclick tbe implmented for grid
// called when user clicks on a row. This event is attached at the TR level.
// Hence ele would be a tr element
ListOrGridTable.prototype.clicked = function(tr, evt) {
	if (this.actionDisabled || this.P2.errorOccurred) // possible that a field
		// was in error and user
		// clicked on the row
		return false;

	var idx = tr ? tr.rowIdx : 1;
	var tr = this.P2.doc.getElementById(this.name + idx);
	if (!tr) {
		debug(this.name + ' has current row set to ' + this.currentRow
				+ ' and hence is not suitable to be clicked');
		return;
	}
	this.currentRow = idx;

	if (this.nestedTable)
		this.showNestedTable(tr);
	var data = new Array();
	data[0] = this.columnNames;
	// data[1] = this.grid[idx];
	data[1] = this.getClientRowWithServerData(idx) || this.grid[idx]; // Mar
	// 15
	// 2011
	// :
	// Changes
	// done
	// to
	// look
	// at
	// server
	// data
	// and
	// if
	// nothing
	// found,
	// fetch
	// client
	// data
	// -
	// Exis
	// :
	// Bhandi
	var rowIdx = tr.rowIdx;
	if (this.multipleSelect) {
		this.simulateClick(tr, null); // let simulator decide whether this is
		// to be selected or unselected
		if (this.onClickActionName)
			this.P2.act(tr, null, this.onClickActionName, data);
		return true;
	}

	// row clicked on a popup window for a description service
	var p2 = this.P2.win.currentP2;
	if (p2 && p2.pendingPicker) {
		// following line needs to be commented once Textile do a clean-up
		// data = [this.columnNames, this.grid[idx]];
		p2.codePickerReturned(data);
		return;
	}

	if (this.selectedRow) // some row was selected earlier
	{
		if (this.selectedRow != tr)
			this.simulateClick(this.selectedRow, false); // only one row to
		// be selected, so
		// deselect the
		// earlier one
	}
	this.simulateClick(tr, true);
	if (this.onClickActionName) {
		this.P2.act(tr, null, this.onClickActionName, data);
	}
	// is there a linked display panel?
	// debug(this.name + ' has its linkedDisplayTable set to ' +
	// this.linkedDisplayTable + ' with rowIdx= ' + rowIdx);
	if (this.linkedDisplayTable) {
		this.linkedDisplayTable.copyFromList(rowIdx);
		this.resetNavigationButtons();
	}

	scrollIntoView(tr); // this funcitons scrolls if required. defined in
	// utils.js
};

// called when user clicks on a row. This event is attached at the TR level.
// Hence ele would be a tr element
ListOrGridTable.prototype.dblClicked = function(tr) {
	debug("ListPanel.rowDblClicked() tableName=" + this.name);
	var idx;
	if (this.actionDisabled)
		return false;
	if (tr) {
		this.currentRow = idx = tr.rowIdx;
	} else {
		debug('clicked called with no tr for table ' + this.name
				+ ' Currrent row assumed');
		idx = this.currentRow;
		tr = this.P2.doc.getElementById(this.name + idx);
		if (!tr) {
			debug(this.name + ' has current row set to ' + this.currentRow
					+ ' and hence is not suitable to be clicked');
			return;
		}
	}

	if (this.onDblClickActionName)
		this.P2.act(tr, null, this.onDblClickActionName);

	return true;
};

ListOrGridTable.prototype.rowUp = function(tr) {
	debug("row up for " + this.name + ' with tr as ' + (tr && tr.nodeName));

	if (this.actionDisabled)
		return false;
	if (tr) {
		this.currentRow = tr.rowIdx;
	}
	var idx1 = this.currentRow;
	var idx2 = this.getNextRow(this.currentRow);
	if (!idx2) {
		debug(this.name + ' can not move the row ' + idx1
				+ ' up because there are no rows above this.');
		return false;
	}

	// swap data.
	var row = this.grid[idx1];
	this.grid[idx1] = this.grid[idx2];
	this.grid[idx2] = row;

	// move tr2 after tr1
	var tr1 = this.P2.doc.getElementById(this.name + idx1);
	var tr2 = this.P2.doc.getElementById(this.name + idx2);
	tr2.parentNode.removeChild(tr2);
	tr2.parentNode.appendChild(tr2, tr1);

	// are there linked rows?
	if (this.rightTableBodyObject) {
		tr1 = this.P2.doc.getElementById(this.name + 'Right' + idx1);
		tr2 = this.P2.doc.getElementById(this.name + 'Right' + idx2);
		tr2.parentNode.removeChild(tr2);
		tr2.parentNode.appendChild(tr2, tr1);
	}
	return true;
};

// finds the next/prev row that is visible. optionally you can opt to wrap.
ListOrGridTable.prototype.getNextRow = function(fromWhere, toGoBackwards,
		toWrap) {
	if (this.sortByColumn)
		return this.getNextSortedRow(fromWhere, toGoBackwards, toWrap);

	var n = this.grid.length;
	if (n <= 1 || this.nbrRows == 0) // this.nbrRows is the actual count
		// after excludiing possible null rows
		// in grid
		return 0;

	// for finding next row
	var incr = 1;
	var endAt = n;
	var restartAt = 1;
	if (toGoBackwards) // find previous row
	{
		incr = -1;
		endAt = 0;
		restartAt = n - 1;
	}

	if (!toWrap) // we should not restart
		restartAt = 0;
	var tryAt = fromWhere + incr; // row to check if it is visible

	// We are ready tp start, except for one special case;
	// if fromWhere itself is outside range, let us start search from the edge
	if (fromWhere <= 0 || fromWhere >= n) {
		restartAt = 0; // no need to wrap, we will check from end to end
		if (toGoBackwards)
			tryAt = n - 1;
		else
			tryAt = 1;
	}

	var tr;
	while (true) // of ourse this is not an infinite loop
	{
		if (tryAt == fromWhere) // we have wrapped and tried all rows in the
			// grid.
			return 0;

		if (tryAt == endAt)// we have hit the edge
		{
			if (restartAt == 0) // and we are not supposed to restart from the
				// other end
				return 0;

			tryAt = restartAt;
			restartAt = 0; // so that we stop looping again.
		}

		if (this.grid[tryAt]) {
			// is it hidden by any chance?
			tr = this.P2.doc.getElementById(this.name + tryAt);
			if (tr.style.display != 'none')
				return tryAt;
		}

		tryAt = tryAt + incr;
	}
	return 0;
};

ListOrGridTable.prototype.getNextSortedRow = function(fromWhere, toGoBackwards,
		toWrap) {
	var n = this.grid.length;
	if (n <= 1 || this.nbrRows == 0) // this.nbrRows is the actual count
		// after excludiing possible null rows
		// in grid
		return 0;

	var tr = this.P2.doc.getElementById(this.name + fromWhere);
	if (!tr) // fromWhere could be outside, or deleted
		toWrap = true; // ensure that we try something

	while (tr || toWrap) {
		if (tr)// get the next tr
		{
			if (toGoBackwards)
				tr = tr.previousSibling;
			else
				tr = tr.nextSibling;
		} else // get the next tr as the last/first
		{
			if (toGoBackwards)
				tr = this.tableBodyObject.lastChild;
			else
				tr = this.tableBodyObject.firstChild;
			toWrap = false; // Safe to switch this off to take care of situation
			// when there are no visible rows.
		}
		if (tr && tr.style.display != 'none')
			return tr.rowIdx;
	}
	return 0;
};

ListOrGridTable.prototype.getClientRowWithServerData = function(idx) {
	var arr = new Array();
	// Mar 15 2011 : Changes done to look at server data and if nothing found,
	// fetch client data - Exis : Bhandi
	var data = this.serverData && this.serverData[idx];
	if (!data)
		return null;
	// Mar 15 2011 : Changes done to look at server data and if nothing found,
	// fetch client data - Exis : Bhandi
	for ( var i = 0; i < this.nbrColumns; i++) {
		var j = this.fieldCols[i];
		var val = '';
		if (j || j == 0)
			val = data[j];
		else {
			var colName = this.columnNames[i];
			var col = this.columns[colName];
			if (col.defaultValue)
				val = col.defaultValue;
		}
		arr.push(val);
	}
	return arr;
};

// simulate a selected/unselect. toSelect=false means unselect
ListOrGridTable.prototype.simulateClick = function(tr, toSelect) {
	var otherTr = null;
	if (this.frozenColumnIndex)// we have to simulate click on the other table
	// as well
	{
		var otherId = 'Right';
		if (tr.id.indexOf('Right' + tr.rowIdx) > 0)// this is the left side
			otherId = '';
		otherTr = this.P2.doc.getElementById(this.name + otherId + tr.rowIdx);
		// we need to use left row as tr.
		if (!otherId) {
			var t = tr;
			tr = otherTr;
			otherTr = t;
		}
	}
	if (toSelect == null) {
		toSelect = !(this.selectedRows[tr.rowIdx]);
	}

	if (toSelect) {
		if (!tr.savedClassName)
			tr.savedClassName = tr.className;
		tr.className = 'selectedlistrow';
		this.selectedRow = tr;
		this.currentRow = tr.rowIdx;
		if (this.multipleSelect)
			this.selectedRows[tr.rowIdx] = true;
		if (otherTr) {
			otherTr.className = 'selectedlistrow';
			this.selectedOtherRow = otherTr;
		}
	} else {
		tr.className = tr.savedClassName;
		this.selectedRow = null;
		// currentRow will remain there as the default till something else is
		// selected
		// this.currentRow = 0;
		if (this.multipleSelect && this.selectedRows[tr.rowIdx])
			delete this.selectedRows[tr.rowIdx];
		if (otherTr) {
			otherTr.className = tr.savedClassName;
			this.selectedOtherRow = null;
		}
	}
};

ListOrGridTable.prototype.returnRows = function(toUnselect) {
	var data = new Array();
	data[0] = this.serverData[0];
	for ( var i in this.selectedRows) {
		data.push(this.serverData[i]);
	}
	if (toUnselect) {
		var rows = this.tableBodyObject.childNodes;
		for ( var i in this.selectedRows) {
			this.simulateClick(rows[i], false);
		}
	}
	var p2 = this.P2.win.currentP2;
	if (p2 && p2.pendingPicker)
		p2.codePickerReturned(data);
	else
		return data;
};

// shift input focus to next field in the table. if this is the last field,
// shift focus to first field of next row, failing which we can not focus.
// caller wants to get the element we focussed on. If we reached the end, caller
// wants to know about it and get the last field,
// so that the field next to it in the page can be tried.
ListOrGridTable.prototype.focusNext = function(field, ele) {
	var idx = field.columnIdx;
	var rowIdx = ele.rowIdx;
	var eleToReturn = null;
	for ( var i = idx + 1; i != idx; i++) {
		if (i == this.nbrColumns) // that was the last field
		{
			// Start with first column of next row;This is DEFINITELY not a good
			// design. We have to check for other panels, buttons etc...
			if (rowIdx < this.grid.length) {
				rowIdx = this.getNextRow(rowIdx, false);
				if (rowIdx == 0) {
					// we reached the end of this grid.
					break;
				}
			}
			i = 0;
		}
		column = this.columns[this.columnNames[i]];
		if (!column.isEditable)
			continue;

		if (rowIdx)
			ele = this.P2.doc.getElementById(column.name + '__' + rowIdx);

		if (!ele) {
			debug("Error:" + column.name + " has no HTML element");
			return null;
		}

		if (ele.disabled)
			continue;

		try {
			ele.focus();

			if (ele.select)
				ele.select();
			eleToReturn = ele;
			break;
		} catch (e) {
			return null;
		}

	}

	var gotFocussed = eleToReturn ? true : false;
	if (!gotFocussed) {
		// return the last field of the table, so that the caller can search
		// from ther
		eleToReturn = this.columns[this.columnNames[this.nbrColumns - 1]];
	}

	// we return an object with follwoing two attribures.
	var objToReturn = new Object();
	objToReturn.gotFocussed = gotFocussed;
	objToReturn.ele = eleToReturn;
	return objToReturn;
};

ListOrGridTable.prototype.fillDC = function(dc) {
	var grid = [ [] ]; // array of one array, one for the header
	var rowsToBeSent = [ null ]; // rows from this.grid that have to be sent.
	// first entry is dummy so as to align it
	// with grid
	var n = this.grid.length;
	// add desired number of empty rows first
	var i, field, val, j, dt, gridRow;
	var firstRowId = null;

	for (i = 1; i < n; i++) {
		gridRow = this.grid[i];
		if (!gridRow)
			continue;

		if (this.sendAffectedRowsOnly || this.autoSaveServiceName) {
			if (!gridRow[this.actionIdx] || gridRow.beingSaved) // we are to
				// send only
				// affected
				// rows, and
				// this row is
				// not affected
				continue;
		}

		if (this.keyFieldName && !gridRow[this.keyIdx])// key field is not
		// found
		{
			if (!this.idFieldName || !gridRow[this.idIdx]
					|| gridRow.keyIsGenerated) // and id field is also not
				// found
				continue;
		}
		rowsToBeSent.push(gridRow);
		grid.push(new Array());
		if (this.autoSaveServiceName) // we save only one row in this mode
		{
			firstRowId = i;
			break;
		}
	}

	// now go by column, and add values
	var col = 0;
	for ( var x in this.columns) {
		field = this.columns[x];
		if (!field.toBeSentToServer)
			continue;
		dt = dataTypes[field.dataType];
		grid[0][col] = x;
		j = field.columnIdx;
		// remember indexes[0] is dummy
		for (i = 1; i < rowsToBeSent.length; i++) {
			gridRow = rowsToBeSent[i];
			val = gridRow[j];
			if (val && dt)
				val = dt.formatOut(val);
			grid[i][col] = val;
		}
		col++;
	}
	if (!col) {
		debug(this.name + ' does not have any columns to be sent to server');
		return 0;
	}

	// is there data row at all?
	// in the original version, we used to send only header. This could have
	// been used as FEATURE. Hence we skip only for autoSaveServiceName.
	if (this.autoSaveServiceName && !firstRowId)
		return 0;
	dc.addGrid(this.name, grid);

	// is there a child table?
	if (this.repeatedField && this.childGrid) {
		var grid = new Array();
		var header = this.childGrid[0];
		if (!this.childKeysTableName)
			header[2] = header[3]; // label is not sent back. shift that
		// columns
		header.length = 3;
		grid.push(header);
		var data = this.repeatedData.data;
		for ( var i = 1; i < rowsToBeSent.length; i++) {
			var pkey = rowsToBeSent[i][this.idIdx];
			var aData = data[pkey];
			if (aData.isDeleted)
				continue;
			for ( var skey in aData) {
				var val = aData[skey];
				if (!val && val != 0)
					continue;
				var row = new Array();
				row[0] = pkey;
				row[1] = skey;
				row[2] = val;
				grid.push(row);
			}
		}
		dc.addGrid(this.childTableName, grid);
	}
	return firstRowId;
};

ListOrGridTable.prototype.resetNavigationButtons = function() {
	if (this.linkedDisplayTable) {
		if (this.nbrRows == 0)
			this.P2.hideOrShowPanels([ this.linkedDisplayTable.panelName ],
					'none');
		else {
			this.P2.hideOrShowPanels([ this.linkedDisplayTable.panelName ], '');
			var tableEle = this.P2.doc
					.getElementById(this.linkedDisplayTable.name);
			if (tableEle)
				tableEle.className = isDeleted ? 'deletedTable' : '';
		}

	}
	if (!this.navigationButtons)
		return;
	// debug('going to reset nav buttons for ' + this.name);
	var btns = this.navigationButtons;
	// if (this.selectedRow) //many user js codes tend to change currentRow for
	// their convinience
	// this.currentRow = this.selectedRow.rowIdx;

	var nextExists = false;
	var prevExists = false;
	var isDeleted = false;
	if (this.nbrRows) {
		nextExists = this.getNextRow(this.currentRow, false);
		prevExists = this.getNextRow(this.currentRow, true);
		isDeleted = this.grid[this.currentRow]
				&& this.grid[this.currentRow].isDeleted;
	}

	// in case this row is deleted,
	if (this.linkedDisplayTable) {
		var tableEle = this.P2.doc.getElementById(this.linkedDisplayTable.name);
		if (tableEle)
			tableEle.className = isDeleted ? 'deletedTable' : '';
	}
	// Double negatives are not easy to understand, but the attribute itself is
	// negative (disable="")

	if (btns.next)
		btns.next.disabled = !nextExists;

	if (btns.last)
		btns.last.disabled = !nextExists;

	if (btns.first)
		btns.first.disabled = !prevExists;

	if (btns.prev)
		btns.prev.disabled = !prevExists;

	if (btns.undelete)
		btns.undelete.disabled = !isDeleted;

	if (btns.del)
		btns.del.disabled = (this.nbrRows && isDeleted) ? true : false; // playing
	// it
	// safe
	// to
	// set a
	// boolean
};

ListOrGridTable.prototype.deleteAllTableRows = function(toDelete) {
	var n = this.grid.length;
	for ( var i = 1; i < n; i++) {
		var aRow = this.grid[i];
		if (!aRow)
			continue;
		if ((toDelete && aRow.isDeleted) || (!toDelete && !aRow.isDeleted))
			continue;
		var tr = this.P2.doc.getElementById(this.name + i);
		var obj = this.P2.doc.getElementById(this.name + '_' + this.name
				+ 'Delete' + '__' + i);
		if (this.deleteRow(obj, tr))
			obj.checked = !obj.checked;
	}
};

ListOrGridTable.prototype.deleteRow = function(obj, tr, overrideConfirmation) {
	if (!overrideConfirmation && this.confirmOnRowDelete
			&& !(confirm('Are you sure you want to delete?'))) {
		return false;
	}
	if (!tr) {
		debug('trying to delete/undelete row of ' + this.name);
		if (obj)
			tr = getRowInTable(obj);
		else
			tr = this.P2.doc.getElementById(this.name + this.currentRow);
		if (!tr) {
			debug('Unable get TR element for delete operation on ' + this.name);
			return;
		}
	}
	var idx = tr.rowIdx;
	var dataRow = this.grid[idx];
	if (!obj) {
		obj = this.P2.doc.getElementById(this.name + '_' + this.name + 'Delete'
				+ '__' + idx);
	}
	var tr1 = null;
	var tr2 = null;
	if (this.rightTableBodyObject) {
		var id = this.name + idx;
		if (tr.id == id)
			id = this.name + 'Right' + idx;
		tr1 = this.P2.doc.getElementById(id);
		if (this.scrollTableBodyObject)
			tr2 = this.P2.doc.getElementById(this.name + 'Scroll' + idx);
	}

	var isImg = obj && obj.tagName.toUpperCase() == 'IMG';
	var dat = this.repeatedData;
	var pkey = null;
	if (dat) {
		pkey = dataRow[this.idIdx];
		dat = dat.data[pkey];
	}
	if (dataRow.isDeleted) // so, it is undelete now
	{
		dataRow.isDeleted = false;
		this.undelete(tr, tr1, isImg ? obj : null, idx);
		if (dat) {
			dat.isDeleted = false;
			delete dat['isDeleted'];
		}
		if (this.hasAggregates)
			this.aggregate();
		this.resetNavigationButtons();
		return true;
	}
	if (this.minRows > 0 && this.countAllRows() <= this.minRows) {
		message(
				'A minimum of '
						+ this.minRows
						+ ' data rows is required. Can not delete this row. If you intend to add rows, please do that before deleting this row',
				"Warning", "Ok", null, null, null);
		return false;
	}
	dataRow.isDeleted = true;
	if (dat)
		dat.isDeleted = true;
	// After several rouunds of changes, here is the lagic effective dec-11 for
	// deletion of rows
	// 1. If id field is there, and it is not generated, we MUST NOT delete it
	// 2. Otherwise, we delete it, except if doNotDeleteAppendedRows=true is set
	// at the table level

	var nextIdx = null;
	if (this.toBeDeleted(dataRow))
		nextIdx = this.physicallyDelete(tr, tr1, tr2, idx);
	else
		this.logicallyDelete(tr, tr1, isImg ? obj : null, idx);

	if (this.hasAggregates)
		this.aggregate();
	// is there next row?
	if (nextIdx) {
		this.currentRow = nextIdx;
		this.clicked();
	} else
		this.resetNavigationButtons();
	return true;
};

// Should the row be physically deleted, or should it be shown as a deleted row?
ListOrGridTable.prototype.toBeDeleted = function(dataRow) {
	// if it is an existing row on the server, we mark it, and not delete it.
	if (this.idFieldName && dataRow[this.idIdx] && !dataRow.keyIsGenerated)
		return false;

	// was added locally, and has not been ever sent to server.
	if (dataRow.addedByUser)
		return true;

	// special keyword provided for exis
	if (this.doNotDeleteAppendedRows)
		return false;

	return true;
};

ListOrGridTable.prototype.undelete = function(tr, tr1, obj, idx) {
	tr.className = tr.savedClassName;
	// restore background color, in case it was reset
	tr.style.backgroundColor = exilParms.gridUnDeletedColor
			|| tr.savedBackgroundColor || '';
	if (tr1)
		tr1.className = tr.savedClassName;
	if (obj) {
		obj.src = obj.src.replace('undelete', 'delete');
		obj.className = 'deleteimg';
	}
	this.currentRow = idx;
	if (this.actionField) {
		this.actionField.setValue('modify', null, idx);
	}
};

ListOrGridTable.prototype.physicallyDelete = function(tr, tr1, tr2, idx) {
	tr.parentNode.removeChild(tr);
	if (tr1)
		tr1.parentNode.removeChild(tr1);
	if (tr2)
		tr2.parentNode.removeChild(tr2);
	this.grid[idx] = null; // no one willtouch this row, except fillDc....
	this.nbrRows--;
	if (this.totalRows)
		this.totalRows--;
	// Nov 25 2009 : BugID 794 - Getting Jscript error while Clone Row -
	// Weaveit(End) : Vijay
	if (this.quickSearchEle) {
		this.quickSearchRebuildRow(idx);
		if (this.gotFiltered)
			this.quickSearch(this.quickSearchEle.value);
	} else if (this.trEle)
		this.trEle.innerHTML = this.totalRows;

	var nextIdx = 0;
	if (this.nbrRows == 0) {
		// are we to always have a blank row?
		if (this.keepABlankRow)
			this.addRows(1);
	} else {
		// this row is deleted. we have to have focus on some row.
		// we look for previous row. If not found, then we look for a next row
		nextIdx = this.getNextRow(idx, true);
		if (!nextIdx)
			nextIdx = this.getNextRow(idx, false);
	}

	return nextIdx;
};

ListOrGridTable.prototype.logicallyDelete = function(tr, tr1, obj, idx) {
	tr.savedClassName = tr.className;
	tr.savedBackgroundColor = tr.style.backgroundColor;
	tr.className = 'deletedrow';
	if (exilParms.gridDeletedColor)
		tr.style.backgroundColor = exilParms.gridDeletedColor;
	if (tr1)
		tr1.className = 'deletedrow';
	if (obj) {
		obj.src = obj.src.replace('delete', 'undelete');
		obj.className = 'undeleteimg';
	}
	this.currentRow = idx;
	if (this.actionField)
		this.actionField.setValue('delete', null, idx);
};

ListOrGridTable.prototype.countAllRows = function() {
	var count = 0;
	var grid = this.grid;
	var n = grid.length;
	for ( var i = 1; i < n; i++) {
		var row = grid[i];
		if (row && !row.isDeleted)
			count++;
	}
	return count;
};

ListOrGridTable.prototype.countActiveRows = function() {
	if (this.keyIdx == null)
		return this.countAllRows();

	var count = 0;
	var grid = this.grid;
	var n = grid.length;
	for ( var i = 1; i < n; i++) {
		var row = grid[i];
		if (!row || row.isDeleted)
			continue;
		if (this.keyIdx != null && !row[this.keyIdx]) // key value not found
		{
			if (!this.idFieldName || !row[this.idIdx] || row.keyIsGenerated) // even
				// id
				// field
				// not
				// found
				continue;
		}
		count++;
	}
	return count;
};

ListOrGridTable.prototype.disableAction = function() {
	// if(this.actionDisabled) return;
	var rows = this.tableBodyObject.childNodes;
	var n = rows.length;
	for ( var i = 0; i < n; i++) {
		var row = rows[i];
		row.style.cursor = 'auto';
		row.title = 'row click is disbaled.';
	}
	this.actionDisabled = true;
	return;
};

ListOrGridTable.prototype.enableAction = function() {
	// if(!this.actionDisabled) return;
	var rows = this.tableBodyObject.childNodes;
	var n = rows.length;
	for ( var i = 0; i < n; i++) {
		var row = rows[i];
		row.style.cursor = 'pointer';
		row.title = this.rowHelpText;
	}
	this.actionDisabled = false;
	return;
};

// event function called when a navigation button in the linked panel is
// clicked.
// init() has attached these functions thru P2/addListeneres
ListOrGridTable.prototype.navigate = function(e, btn) {
	// debug(btn.id + ' clicked and the correspondng event fired with ' +
	// btn.navigationAction);
	if (!this.currentRow)
		this.currentRow = this.getSelectedRow();

	var n = this.currentRow;
	switch (btn.navigationAction) {
	case 'next':
		n = this.getNextRow(n, false); // go forward from current
		break;
	case 'prev':
		n = this.getNextRow(n, true); // go backwards from current
		break;
	case 'first':
		n = this.getNextRow(0, false); // go forward from beginning
		break;
	case 'last':
		n = this.getNextRow(this.grid.length, true);
		break;
	case 'del':
		this.P2.deleteTableRow(null, null, this.name);
		return;
	case 'undelete':
		this.P2.deleteTableRow(null, null, this.name);
		return;
	case 'new':
		this.P2.addTableRow(null, this.name);
		this.clicked();
		return;
	}
	if (n == 0) {
		debug('ERROR : ' + btn.navigationAction
				+ ' is not a valid navigaiton action on ' + this.name
				+ ' with its current row at ' + this.currentRow);
		return;
	}
	// debug('selecting row ' + n + ' of table ' + this.name);
	this.currentRow = n;
	this.clicked();
};

ListOrGridTable.prototype.getSelectedRow = function() {
	var doc = this.P2.doc;
	for ( var i = 1; i < this.grid.length; i++) {
		var tr = doc.getElementById(this.name + i);
		if (tr && tr.className == 'selectedlistrow')
			return i;
	}
	debug(' no selected row found for ' + this.name);
	return 0;
};

ListOrGridTable.prototype.initPagination = function(dc, skipLocal) {
	if (this.localPagination && !skipLocal) // server has sent all data back.
	// Let us simulate whatever server
	// woudl have done, like TotalRows
	// etc..
	{
		this.initLocalPagination(dc);
	}
	var doc = this.P2.doc;
	if (!this.pgEle) {
		this.pgEle = doc.getElementById(this.name + 'Pagination');
		this.pgCountEle = doc.getElementById(this.name + 'PageCount');
		if (!this.pgEle) {
			// debug('Design error: dom element for ' + this.name+'Pagination' +
			// ' not found');
			return;
		}
	}
	var tr = dc.values[this.name + 'TotalRows'];
	if (!tr) {
		this.pgCountEle.style.display = 'none';
		tr = dc.grids[this.name]; // this is actually grid, but I am reusing
		// tr
		tr = tr ? (tr.length - 1) : 0;
		this.totalRows = tr;
		// return;
	} else
		this.pgCountEle.style.display = '';

	if (!this.tpEle) {
		this.tpEle = doc.getElementById(this.name + 'TotalPages');
		this.cpEle = doc.getElementById(this.name + 'CurrentPage');
		this.trEle = doc.getElementById(this.name + 'TotalRows');
		this.fpEle = doc.getElementById(this.name + 'FirstPage');
		this.ppEle = doc.getElementById(this.name + 'PrevPage');
		this.npEle = doc.getElementById(this.name + 'NextPage');
		this.lpEle = doc.getElementById(this.name + 'LastPage');
	}
	this.pgEle.style.display = '';

	var tp = Math.floor((tr - 1) / this.pageSize) + 1;
	var cp = 1; // currentPage
	this.totalRows = tr;
	this.totalPages = tp;
	this.currentPage = cp;
	this.tpEle.innerHTML = tp;
	this.cpEle.value = cp;
	this.trEle.innerHTML = tr;
	if (!this.tpEle || !this.cpEle || !this.trEle || !this.fpEle || !this.ppEle
			|| !this.npEle || !this.lpEle)
		return;
	// when we are on page 1, ther is no prev page or first page
	this.fpEle.className = ListPanel.INACTIVE_PAGE_CLASS;
	this.ppEle.className = ListPanel.INACTIVE_PAGE_CLASS;
	if (tp == cp) {
		this.npEle.className = ListPanel.INACTIVE_PAGE_CLASS;
		this.lpEle.className = ListPanel.INACTIVE_PAGE_CLASS;
	} else {
		this.npEle.className = ListPanel.ACTIVE_PAGE_CLASS;
		this.lpEle.className = ListPanel.ACTIVE_PAGE_CLASS;
	}
	if (tp == 1) {
		this.fpEle.style.display = 'none';
		this.ppEle.style.display = 'none';
		this.npEle.style.display = 'none';
		this.lpEle.style.display = 'none';
	} else {
		this.fpEle.style.display = '';
		this.ppEle.style.display = '';
		this.npEle.style.display = '';
		this.lpEle.style.display = '';
	}
};

ListOrGridTable.prototype.initLocalPagination = function(dc) {
	if (this.localRepaginationTriggered) {
		this.localRepaginationTriggered = false;
		return;
	}

	var grid = dc.grids[this.name];
	var n = grid.length - 1; // first row is header
	this.entireServerData = null;
	this.filteredRows = null;
	if (n <= this.pageSize) {
		return;
	}

	// simulate pagination scenario by setting fields that are sent by server
	dc.values[this.name + 'TotalRows'] = n;
	this.entireServerData = grid; // save complete data
	// create a page of data and put that back in dc
	var page = [];
	n = this.pageSize;
	for ( var i = 0; i <= n; i++) // n+1 rows, including the header
	{
		page[i] = grid[i];
	}
	dc.grids[this.name] = page;
	// that's it. We are okay for the first page. Subsequent pagination is
	// handled in getLocalPage()
};

ListOrGridTable.prototype.getServerData = function() {
	// if local paginationis enabled, return entire data, else return this page
	// data
	return this.entireServerData || this.serverData;
};

// grid with its first row as header to be used as data for a locally paginated
// table
ListOrGridTable.prototype.setServerData = function(grid, filteredRows) {
	this.entireServerData = grid;
	this.filteredRows = filteredRows || null;
	this.localRepaginationTriggered = true;
	this.repaginateServerData();
};

// selected rows is an array of index of rows that are selected from local data
// e.g. [3,5,7,9] means only 3,5,7,9 th rows are selected, and the rest are
// filtered-out.
// list is repaginated based on this.
ListOrGridTable.prototype.setFilterRows = function(filteredRows) {
	this.filteredRows = filteredRows;
	this.localRepaginationTriggered = true;
	this.repaginateServerData();
};

ListOrGridTable.prototype.repaginateServerData = function() {
	var grid = this.entireServerData;
	var filteredRows = this.filteredRows;
	var page = [];
	page.push(grid[0]);
	var nbrRows, n;
	if (filteredRows) {
		n = nbrRows = filteredRows.length;
		if (n > this.pageSize)
			n = this.pageSize;

		for ( var i = 0; i < n; i++)
			page.push(grid[filteredRows[i]]);
	} else {
		n = nbrRows = grid.length - 1; // grid has header row
		if (n > this.pageSize)
			n = this.pageSize;

		for ( var i = 1; i <= n; i++)
			page.push(grid[i]);
	}

	var dc = new DataCollection();
	dc.grids[this.name] = page;
	if (nbrRows > this.pageSize)
		dc.values[this.name + 'TotalRows'] = nbrRows;

	this.setData(dc, false, false, false);
};

ListOrGridTable.prototype.paginate = function(action, noNeedToRequest) {
	// action links are hidden in such a way that we should never be asking for
	// a wrong action...
	var pageNo = this.currentPage;
	switch (action) {
	case 'next':
		pageNo++;
		break;
	case 'first':
		pageNo = 1;
		break;
	case 'last':
		pageNo = this.totalPages;
		break;
	case 'prev':
		pageNo--;
		break;
	case 'random':
		pageNo = this.cpEle.value;
		break;
	case 'go':
		pageNo = this.getPageNumber();
	}
	if (pageNo == this.currentPage || pageNo < 1 || pageNo > this.totalPages)
		return;
	var cls = (pageNo > 1) ? ListPanel.ACTIVE_PAGE_CLASS
			: ListPanel.INACTIVE_PAGE_CLASS;
	if (this.fpEle || this.ppEle) {
		this.fpEle.className = cls;
		this.ppEle.className = cls;
	}

	cls = (pageNo < this.totalPages) ? ListPanel.ACTIVE_PAGE_CLASS
			: ListPanel.INACTIVE_PAGE_CLASS;
	if (this.npEle)
		this.npEle.className = cls;
	if (this.lpEle)
		this.lpEle.className = cls;
	if (this.cpEle)
		this.cpEle.value = pageNo;

	this.currentPage = pageNo;
	if (!noNeedToRequest)
		this.requestPage(pageNo);
};

ListOrGridTable.prototype.getPageNumber = function() {
	var pageNo = this.currentPage;
	var action = this.P2.doc.getElementById(this.tableName + 'PageSelection').value;
	switch (action) {
	case 'next':
		pageNo++;
		break;
	case 'first':
		pageNo = 1;
		break;
	case 'last':
		pageNo = this.totalPages;
		break;
	case 'prev':
		pageNo--;
		break;
	}
	return pageNo;
};

ListOrGridTable.prototype.requestPage = function(pageNo, columnToSort,
		sortDesc, columnToMatch, valueToMatch) {
	if (this.localPagination) {
		this.getPageFromServerData(pageNo, columnToSort, sortDesc,
				columnToMatch, valueToMatch);
		return;
	}
	var dc = new DataCollection();
	dc.values['tableName'] = this.name;
	dc.values['pageNo'] = pageNo;
	dc.values['pageSize'] = this.pageSize;
	if (columnToSort) {
		dc.values['paginationColumnToSort'] = columnToSort;
		dc.values['paginationSortDesc'] = sortDesc ? 1 : 0;
		if (columnToMatch) {
			dc.values['paginationColumnToMatch'] = columnToMatch;
			dc.values['paginationValueToMatch'] = valueToMatch;
		}
	}

	if (this.paginationServiceName != null) {
		dc.values['paginationServiceName'] = this.paginationServiceName;
		dc.values[this.name + 'PageSize'] = this.pageSize;
	}
	if (this.paginationServiceFieldNames != null) {
		var paginationFieldNames = this.paginationServiceFieldNames.split(',');
		var paginationFieldSources = this.paginationServiceFieldNames
				.split(',');
		if (this.paginationServiceFieldSources != null) {
			paginationFieldSources = this.paginationServiceFieldSources
					.split(',');
		}
		if (paginationFieldNames.length == paginationFieldSources.length) {
			for ( var i = 0; i < paginationFieldNames.length; i++) {
				var curFieldName = trim(paginationFieldNames[i]);
				var curFieldSource = trim(paginationFieldSources[i]);
				var curField = this.P2.getField(curFieldSource);
				curField.validate();

				dc.values[curFieldName] = this.P2.getFieldValue(curFieldSource);
				if (curField.isFilterField) {
					dc.values[curFieldName + 'Operator'] = this.P2
							.getFieldValue(curFieldSource + 'Operator');
				}
				var dt = dataTypes[curField.dataType];
				if (dt && dt.basicType == 'DATE') {
					if (curField.isFilterField) {
						dc.values[curFieldName + 'To'] = this.P2
								.getFieldValue(curFieldSource + 'To');
					} else if (curField.fromField) {
						dc.values[curFieldName + 'Operator'] = this.P2
								.getFieldValue(curFieldSource + 'Operator');
					}
				}
			}
		}
	}

	var se = new ServiceEntry('paginationService', dc, false, null, this,
			this.name, ServerAction.NONE);
	this.P2.win.serverStub.callService(se);
};

ListOrGridTable.prototype.getPageFromServerData = function(pageNo,
		columnToSort, sortDesc, columnToMatch, valueToMatch) {
	/*
	 * page=0 is meant for server to flush. we need not do anything.
	 */
	if (!pageNo)
		return;

	if (columnToMatch)
		this.filterServerData(columnToMatch, valueToMatch);

	if (columnToSort) {
		this.sortServerData(columnToSort, sortDesc);
	}

	var data = this.entireServerData;
	var filteredRows = this.filteredRows;
	var nbrRows = filteredRows ? filteredRows.length : data.length - 1;
	var startAt = this.pageSize * (pageNo - 1);
	if (startAt >= nbrRows) //
		startAt = 0;
	var endAt = startAt + this.pageSize;
	if (endAt >= nbrRows)
		endAt = nbrRows;

	var page = [];
	if (filteredRows) // value in filteredRows point to index in data
	{
		for ( var i = startAt; i < endAt; i++)
			page.push(data[filteredRows[i]]);
	} else {
		// data has its first row as header
		startAt++;
		endAt++;
		for ( var i = startAt; i < endAt; i++)
			page.push(data[i]);
	}
	var dc = new DataCollection();
	dc.grids[this.name] = page;
	this.serviceReturned(dc);
};

ListOrGridTable.prototype.serviceReturned = function(dc) {
	var data = dc.grids[this.name];
	if (!data || !data.length) {
		debug('No data reced for ' + this.name
				+ ' when paginaiton service returned.');
		return;
	}
	this.setPageData(data);
	if (this.hasAggregates)
		this.aggregate();

	var paginateCBFunc = this.paginateCallback;
	if (paginateCBFunc) {
		try {
			if (typeof (paginateCBFunc) == 'function')
				paginateCBFunc(this, this.name, this.se, false);
			else
				this.P2.act(this, this.name, paginateCBFunc, this.se, false);
		} catch (e) {
			debug('Paginate Call back action failed with error :' + e);
		}
	}
};

ListOrGridTable.prototype.setPageData = function(data) {
	var nbrRows = data.length;
	this.deleteAllRows();
	this.grid.length = 1; // that is how we delete data, retaining the default
	// data

	// this.serverData saves a copy of the grid recd from server. In this, first
	// row is column names.
	// data recd in pagination does not have a header row. Hence, the data rows
	// are pushed.
	this.serverData.length = 1;
	for ( var i = 0; i < nbrRows; i++)
		this.serverData.push(data[i]);

	var doc = this.P2.doc;
	var fieldCols = this.fieldCols;
	var sequenceNo = (this.currentPage - 1) * this.pageSize;
	for ( var i = 1; i <= nbrRows; i++) {
		sequenceNo++;
		this.currentRow = i;
		// add an html row
		var newRow = this.htmlRowToClone.cloneNode(true);
		var clsName = (i % 2) ? 'row2' : 'row1';
		newRow.className = clsName;
		newRow.rowIdx = i; // set the pointer to the data row
		newRow.id = this.name + i; // in case I need to reach the tr with just
		// the index...
		this.tableBodyObject.appendChild(newRow);

		if (this.frozenColumnIndex) {
			this.cloneFrozenRow(clsName, i);
		}
		// add a data row
		var newDataRow = new Array(this.nbrColumns);
		this.grid.push(newDataRow);
		this.addPaginatedRow(doc, newDataRow, i, data[i - 1], fieldCols,
				sequenceNo);
	}
	if (this.initialNumberOfRows && this.initialNumberOfRows > nbrRows
			&& exilParms.displayInitialRows) {
		this.addRows(this.initialNumberOfRows - nbrRows, null, true);
	}
	/*
	 * Sorting failed in Table in case of initialNumberofRows < actual number of
	 * rows in the grid because this.numberOfOrigDataRows is not initialized.
	 * --Pathfinder Harsha Bhat
	 */
	if (nbrRows > 1)
		this.numberOfOrigDataRows = nbrRows;

	if (this.treeViewColumnName) {
		// clear the bulk checkbox in header
		var bulkChk = this.P2.doc.getElementById(this.name + 'BulkCheck');
		if (bulkChk)
			bulkChk.checked = false;
	}

	this.nbrRows = nbrRows;
	this.currentRow = 1;
	// are we to simulate a click on the first row?
	// debug(' done with setting data.');
	this.simulateClickIfRequired();
};

ListOrGridTable.prototype.addPaginatedRow = function(doc, localRow, rowIdx,
		serverRow, fieldCols, sequenceNo) {
	var ele;
	var suffix = '__' + rowIdx;
	// is there a sequence number?
	if (this.addSeqNo) {
		ele = doc.getElementById(this.name + 'SeqNo');
		ele.id += suffix;
		ele.innerHTML = sequenceNo;
	}
	var n = this.columnNames.length;
	var val;
	var defaultDataRow = this.grid[0];
	for ( var j = 0; j < n; j++) {
		var columnName = this.columnNames[j];
		var field = this.columns[columnName];
		ele = doc.getElementById(field.name);
		var k = fieldCols[j];
		if (!k && k != 0)
			val = defaultDataRow[j];
		else {
			val = serverRow[k];
			if (val) {
				if (field.formatter)
					val = field.format(val);
				else {
					var dt = dataTypes[field.dataType];
					if (dt)
						val = dt.formatIn(val);
				}
			}
		}

		localRow[j] = val;
		field.setValueToObject(ele, val);
		ele.id += suffix;
		ele.rowIdx = rowIdx;
	}
	this.hideOrShowColumns();
	// for tree view
	if (this.treeViewColumnName) {
		this.treeViewIndentRow(rowIdx);
	}

};

/**
 * called on page unload. If there was a server side pagination, let us let the
 * server kow that we are moving on..
 */
ListOrGridTable.prototype.doneWith = function() {
	if (this.totalRows && this.totalRows > this.nbrRows) {
		this.requestPage(0);
	}
};

var ListPanel = function() {
	ListOrGridTable.call(this);

	this.PAGE_SIZE = 30;

	// should the header be displayed at all? there could be situations where
	// you do not want the header row
	// to be diplayed at all. Default has to be true;
	this.showHeader = true;

	// pagination. Old design is discontinued, but the new one one is yet to be
	// designed
	this.pageSize = this.PAGE_SIZE;

	// do you need sequence numbrs to be displayed for each row?
	this.addSeqNo = false;

	// rows in list are highligted on mouse over, and a selection is highlighted
	// by default.
	// you can disable this if required. Is it disabled in the beginning?
	this.actionDisabled = false;

	// do you want to enable user to select multiple lines and then act on them
	// on click of a button?
	// this options lets you decide what happens when you click on a row. If
	// multiple select is on, a clicked row will be
	// selected, except if it is already selected, in which case, it gets
	// de-selected.
	// In single select mode, when you select a row, the earlier selected row
	// will be de-seletced.
	this.multipleSelect = false;
	this.selectedRows = {};
	// if pagination is on, let us track where we are
	this.serverGrid = null;
	this.totalPages = 0;
	this.activePageNo = 0;

	// store the row that is selected. This is 0 based. Hence -1 implies that no
	// row is selected
	this.selectedRow = null;
	this.onclickActionText = '';

	// what is to be done on row click, or row dbl click?
	this.onClickActionName = null;
	this.onDblClickActionName = null;
	this.simulateClickOnFirstRow = false;
	this.simulateClickOnRow = rowType.none;
	this.paginationServiceName = null;
	this.paginationServiceFieldNames = null;
	this.paginationServiceFieldSources = null;
	this.rowHelpText = '';
	this.toBeSentToServer = false;
};

ListPanel.prototype = new ListOrGridTable;

// we shoud not be validating anything in a list panel...
ListPanel.prototype.validateColumn = function() {
	return true;
};

// called when user double clicks on a row. This event is attached at the TR
// level. Hence ele would be a tr element
// Meaning of a double click is same as a click + any other meaning programmer
// might have attached
// event handler calls with tr, while a user function may call with idx instead

// pagination related.. only for list panel....well why not grid as well?
ListPanel.ACTIVE_PAGE_CLASS = 'activepaginationbutton';
ListPanel.INACTIVE_PAGE_CLASS = 'inactivepaginationbutton';

ListPanel.prototype.removeFromList = function(rowIdx) {
	if (!rowIdx)
		rowIdx = this.currentRow;
	var tr = this.P2.doc.getElementById(this.name + rowIdx);
	if (!tr) {
		debug(rowIdx + ' is not a valid row number in list panel ' + this.name);
		return;
	}
	tr.parentNode.removeChild(tr);
	this.grid[rowIdx] = null;
};

var getcolumnToColumnMap = function(serverNames, localNames) {
	var n = localNames.length;
	var m = serverNames.length;
	var map = new Array(n);
	for ( var i = 0; i < n; i++) {
		map[i] = null;
		var localName = localNames[i];
		for ( var j = 0; j < m; j++) {
			if (localName != serverNames[j])
				continue;
			map[i] = j;
			break;
		}
	}
	return map;
};

var getColumnIndex = function(names, nameToMatch) {
	var n = names.length;
	for ( var i = 0; i < n; i++) {
		if (names[i] == nameToMatch)
			return i;
	}
	return null;
};
