a.tableClicked = function(tableName, obj) {
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
a.tableHeaderClicked = function(event, tableName, columnName) {
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

a.sortTable = function(obj, tableName, columnName) {
	this.tables[tableName].sort(obj, columnName);
};

a.rowSelected = function(tableName, obj) {
	var table = this.tables[tableName];
	if (table)
		table.rowSelected(obj);
};

a.listMouseOver = function(obj, tableName, e) {
	if (!e) {
		e = window.event;
	}
	this.tables[tableName].mouseOver(obj, e);
};

a.listMouseOut = function(obj, tableName, e) {
	if (!e) {
		e = window.event;
	}
	this.tables[tableName].mouseOut(obj, e);
};

a.listClicked = function(obj, tableName, evt) {
	this.tables[tableName].clicked(obj, evt);
};

a.listDblClicked = function(obj, tableName, actionName) {
	this.tables[tableName].dblClicked(obj, actionName);
};

a.addTableRow = function(obj, tableName) {
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

a.cloneTableRow = function(obj, tableName) {
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

a.removeTableRows = function(obj, tableName) {
	this.tables[tableName].removeTableRows(tableName);
};

a.removeTableRow = function(evt, obj, tableName) {
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

a.deleteAllTableRows = function(obj, tableName) {
	this.tables[tableName].deleteAllTableRows(!obj.checked);
};

a.deleteTableRow = function(evt, obj, tableName) {
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
		a.appendRow = function(tblNAme, dataRow) {
			this.tables[tblName].appendRow(dataRow);
		};

		a.insertRow = function(tblName, idx) {
			this.tables[tblName].insertRow(idx);
		};

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

a.paginate = function(tableName, action) {
	this.tables[tableName].paginate(action);
};

a.handleGridNav = function(obj, fieldName, e) {
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

a.bulkCheckAction = function(obj, colName, tableName) {
	var table = this.tables[tableName];
	if (table.bulkCheckAction)
		table.bulkCheckAction(obj, colName);
};
