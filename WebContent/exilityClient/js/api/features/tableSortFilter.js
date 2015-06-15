/**
 * custom sort used by table sort. Sorts two objects that have an attribute
 * named value that holds the value to be compared
 * 
 * @param x
 *            has x.value as its value to be compared
 * @param y
 *            has y.value as the value to be compared
 * @returns as per array.sort() requirement
 */
var mySortWorker = function(x, y) {
	/*
	 * we have to return 0, 1 or -1 based on how x compares with y
	 */
	if (!x && x !== 0) {
		/*
		 * if both are null, it is better to make them equal
		 */
		if (!y && y !== 0)
			return 0;
		return -1;
	}

	if (!y && y !== 0)// y is null, x is higher
		return 1;

	if (x == y)
		return 0;

	if (x > y)
		return 1;

	return -1;
};

var mySort = function(x, y) {
	return mySortWorker(x.val, y.val);
};

/**
 * custom sort used by table sort for multiple columns. Sorts two arrays that
 * have equal number of values in them
 * 
 * @param x
 *            is an array of values
 * @param y
 *            is an array of values
 * @returns as per array.sort() requirement.
 */

var myMultiSort = function(x, y) {
	var n = x.length;
	for ( var i = 0; i < n; i++) {
		var comp = mySortWorker(x[i], y[i]);
		if (comp !== 0)
			return comp;
	}
	return 0;
};

ListOrGridTable.prototype.sort = function(obj, columnName, sortOrder) {
	if (!obj)
		obj = this.P2.doc.getElementById(this.name + '_' + columnName
				+ 'SortImage');
	var lastOne = this.sortByColumn;
	this.sortByColumn = columnName;

	// column that was sorted on earlier needs to be reset
	if (obj && lastOne && lastOne != columnName) {
		this.resetSortImage(lastOne);
	}

	// decide about the sort order
	if (sortOrder) // caller has specified. (directly called by a script)
	{
		this.sortOrder = (sortOrder < 0) ? -1 : 1;
	} else // user clicked on a column
	{
		if (lastOne == columnName && this.sortOrder)
			this.sortOrder = -this.sortOrder;
		else
			this.sortOrder = 1;
	}

	debug('Going to sort table ' + this.name + ' on column '
			+ this.sortByColumn + ' with sort order as ' + this.sortOrder);
	// set attributes of this column
	if (obj) {
		if (this.sortOrder > 0) {
			obj.src = obj.src.replace('sortable', 'sortedUp').replace(
					'sortedDown', 'sortedUp');
			obj.title = 'Sort Descending';
		} else {
			obj.src = obj.src.replace('sortable', 'sortedDown').replace(
					'sortedUp', 'sortedDown');
			obj.title = 'Sort Ascending';
		}

		var th = this.P2.doc.getElementById(this.name + '_' + columnName
				+ 'Label');

		// save the current class name to be restored later
		if (!th.savedClassName && th.savedClassName != '')
			th.savedClassName = th.className || '';
		th.className = "exilSortTHClass";
	}
	// do we ask server to do this job? We also have a special case of less than
	// a page because of local filtering..
	if ((this.totalRows && this.totalPages > 1)
			|| (this.localPagination && this.entireServerData)) {
		// request page with sort instructions
		this.requestPage(1, columnName, this.sortOrder < 0);
	} else {
		this.sortData();
		// has user asked for a call back function?
		var fn = this.P2.win[this.name + 'AfterSort'];
		if (fn)
			fn(columnName, this.sortOrder < 0);
		this.simulateClickIfRequired();
	}
	// if this is paginated, simulate as if user entered page no 1
	if (this.pageSize && this.totalPages && this.totalPages > 1 && this.cpEle) {
		this.cpEle.value = 1;
		this.paginate('random', true);
	}

	return;
};

ListOrGridTable.prototype.resetSortImage = function(colName) {
	var ele = this.P2.doc.getElementById(this.name + '_' + colName
			+ 'SortImage');
	if (!ele) {
		return;
	}
	if (this.sortOrder > 0)
		ele.src = ele.src.replace('sortedUp', 'sortable');
	else
		ele.src = ele.src.replace('sortedDown', 'sortable');
	ele.title = 'Sort Ascending';

	ele = this.P2.doc.getElementById(this.name + '_' + colName + 'Label');
	if (ele)
		ele.className = ele.savedClassName; // restored original class name
};

ListOrGridTable.prototype.sortData = function() {
	var field = this.columns[this.sortByColumn];
	if (!field) {
		debug(this.sortByColumn
				+ ' is not a valid column name. Sorting abandoned');
		return;
	}

	var sortedIndexes = this.sortedIndexes = this.getSortedIndexes(
			this.sortByColumn, this.sortOrder < 0);
	if (sortedIndexes == null)
		return;
	if (this.initialNumberOfRows) {
		var nextIdx = sortedIndexes.length + 1;
		while (nextIdx < this.initialNumberOfRows) {
			sortedIndexes.push(nextIdx);
			nextIdx++;
		}
	}

	// sortedIndexes now contains indexes from 1 to n in their sorted order
	// get the trs into an array first;
	// variables with 1 are for rigth panel
	var trs = [];
	var tr = this.tableBodyObject.lastChild;
	var tr1 = null;
	var trs1 = null;
	if (this.frozenColumnIndex) {
		tr1 = this.rightTableBodyObject.lastChild;
		trs1 = [];
	}
	// may be it helps optimizing the rendering
	this.tableBodyObject.style.display = 'none';
	if (trs1) {
		this.rightTableBodyObject.style.display = 'none';
		if (this.scrollTableBodyObject)
			this.scrollTableBodyObject.style.display = 'none';
	}
	// remove trs into the array
	while (tr) {
		trs[tr.rowIdx] = tr;
		this.tableBodyObject.removeChild(tr);
		tr = this.tableBodyObject.lastChild;
	}
	while (tr1) // takes care right panel as well
	{
		trs1[tr1.rowIdx] = tr1;
		this.rightTableBodyObject.removeChild(tr1);
		tr1 = this.rightTableBodyObject.lastChild;
	}
	// we need the table and the cell number which is being sorted
	var cellIdx = null;
	var cellOnRight = false;
	var ele = this.P2.doc.getElementById(field.name + 'Label'); // this is the
	// TH element
	if (ele) {
		cellIdx = ele.cellIndex;
		if (this.frozenColumnIndex) {
			while (ele.nodeName != 'TABLE')
				ele = ele.parentNode;
			var nchars = ele.id.length;
			if (ele.id.indexOf('Right') == (nchars - 5)
					|| ele.id.indexOf('RightHeader') == (nchars - 11)) // is
				// this
				// cell
				// on
				// the
				// right
				// panel?
				cellOnRight = true;
		}
	}

	var j = 1; // tracks actual number of rows that are displayed. to take care
	// of row1/row2
	var n = sortedIndexes.length;
	var cell;
	for ( var i = 0; i < n; i++) {
		tr = trs[sortedIndexes[i]];
		if (!tr) {
			debug(' for i = ' + i + ' index is ' + sortedIndexes[i]
					+ ' and tr is null!!!! ');
			continue;
		}
		this.tableBodyObject.appendChild(tr);
		// for right table
		if (trs1) {
			tr1 = trs1[sortedIndexes[i]];
			this.rightTableBodyObject.appendChild(tr1);
		}
		// change column css to unsorted
		if (tr.style.display != 'none') {
			var cls = (j % 2) ? 'row2' : 'row1';
			this.resetHeaderSortClass(tr, cls);
			if (trs1)
				this.resetHeaderSortClass(tr1, cls);
			// is the td being sorted int this tr, we have to set the class for
			// that celll
			if (cellIdx != null) {
				if (cellOnRight)
					cell = tr1.cells[cellIdx];
				else
					cell = tr.cells[cellIdx];
				cls = cell.className;
				if (cls)
					cls += ' exilSortTDClass';
				else
					cls = 'exilSortTDClass';
				cell.className = cls;
			}
			j++;
		}
	}

	// display the table back
	this.tableBodyObject.style.display = '';
	if (trs1) {
		this.rightTableBodyObject.style.display = '';
		if (this.scrollTableBodyObject)
			this.scrollTableBodyObject.style.display = '';
	}
};

ListOrGridTable.prototype.getSortedIndexes = function(colName, sortDescending) {
	if (!colName || colName === ' ')
		return null;

	/**
	 * has designer asked to sort by an additional column always?
	 */
	if (this.additionalColumnToSort && colName != this.additionalColumnToSort) {
		return this.getMutliSortedIndexes([ colName,
				this.additionalColumnToSort ], sortDescending);
	}
	var nbrRows = this.grid.length;
	if (this.initialNumberOfRows) {
		nbrRows = this.numberOfOrigDataRows; // remember this number also
		// includes header row. hence no
		// need to do - 1;
	}

	if (nbrRows <= 1)
		return null;
	var field = this.columns[colName];

	// set data type for comparison if it is different from text
	var dt = null;
	if (!field.getDisplayVal) {
		dt = dataTypes[field.dataType];
		if ((dt && dt.basicType == AbstractDataType.TEXT))
			dt = null;
	}

	// push values of the column into an array
	var colValues = [];
	var colIdx = field.columnIdx;
	for ( var i = 1; i < nbrRows; i++) {
		var row = this.grid[i];
		var val = row && row[colIdx];
		if (field.getDisplayVal) {
			val = field.getDisplayVal(val);
		}
		if (val) {
			// remember, dt has value only if it is non-text
			if (dt)
				val = dt.clientObject(val);
			else if (val.toUpperCase)
				val = val.toUpperCase();
		}
		// push an object with value and idx into array.
		colValues.push({
			val : val,
			idx : i
		});
	}
	// Our objective is to get the row indexes inn the order based on value.
	// Hence our sort function is supplied
	colValues.sort(mySort);
	var sortedIndexes = [];
	nbrRows = colValues.length;
	if (sortDescending) {
		for ( var i = nbrRows - 1; i >= 0; i--)
			sortedIndexes.push(colValues[i].idx);
	} else {
		for ( var i = 0; i < nbrRows; i++)
			sortedIndexes.push(colValues[i].idx);
	}

	return sortedIndexes;
};
/**
 * returns an array of indexes that would put the data grid sorted as per
 * supplied arguments
 */

ListOrGridTable.prototype.getMutliSortedIndexes = function(colNames,
		sortDescending) {
	var nbrRows = this.grid.length;
	if (this.initialNumberOfRows)
		nbrRows = this.numberOfOrigDataRows; // remember this number also
	// includes header row. hence no
	// need to do - 1;

	if (nbrRows <= 1)
		return null;

	/**
	 * each element of this is an {idx:<original index>, [columnObjects,,,,,]
	 */
	var fieldsToSort = [];
	var nbrCols = colNames.length;
	for ( var j = 0; j < nbrCols; j++) {
		var field = this.columns[colNames[j]];
		if (field) {
			var dt = null;
			if (!field.getDisplayVal) {
				dt = dataTypes[field.dataType];
				if ((dt && dt.basicType == AbstractDataType.TEXT))
					dt = null;
			}
			fieldsToSort.push({
				idx : field.columnIdx,
				dt : dt,
				field : field
			});
		} else {
			debug(this.columns[columnName[j]]
					+ ' is not included in sorting as it is not a valid column name');
		}
	}

	/*
	 * did we get any column to sort at all?
	 */
	nbrCols = fieldsToSort.length;
	if (nbrCols == 0) {
		debug('Not going to sort as no valid coulumns found.');
		return null;
	}
	/*
	 * now, we go thru all rows of the grid and prepare an array to be sorted
	 */

	// push values of the column into an array
	var dataToSort = [];
	for ( var i = 1; i < nbrRows; i++) {
		var row = this.grid[i];
		if (!row || row.isDeleted)
			continue;

		var valueToSort = [];
		valueToSort.idx = i;
		dataToSort.push(valueToSort);
		for ( var j = 0; j < nbrCols; j++) {
			var inf = fieldsToSort[j];
			var val = trim(row[inf.idx]);

			if (val) {
				var field = inf.field;
				if (field && field.getDisplayVal) {
					val = field.getDisplayVal(val);
				}
				// remember, dt has value only if it is non-text
				if (inf.dt)
					val = inf.dt.clientObject(val);
				else if (val.toUpperCase)
					val = val.toUpperCase();
			}
			valueToSort.push(val);
		}
	}

	// Our objective is to get the row indexes in the order based on value.
	// Hence our sort function is supplied
	dataToSort.sort(myMultiSort);

	var sortedIndexes = [];
	nbrRows = dataToSort.length;
	if (sortDescending) {
		for ( var i = nbrRows - 1; i >= 0; i--)
			sortedIndexes.push(dataToSort[i].idx);
	} else {
		for ( var i = 0; i < nbrRows; i++)
			sortedIndexes.push(dataToSort[i].idx);
	}

	return sortedIndexes;
};

ListOrGridTable.prototype.resetHeaderSortClass = function(tr, cls, idx) {
	if (tr.className != 'deletedrow' && tr.className != cls)
		tr.className = cls;
	var cells = tr.cells || tr.childNodes;
	var cell;
	var n = cells.length;
	// NEEDS REFACTORING : this is a wasteful activity. We should rememeber the
	// last sorted column idx
	for ( var j = 0; j < n; j++) {
		cell = cells[j];
		if (!cell || cell.nodeName === '#text')
			continue;

		if (cell.className) // remove sorted class.
			cell.className = cell.className.replace('exilSortTDClass', '');
	}
};

ListOrGridTable.prototype.removeFilter = function() {
	this.filterObject.src = this.filterObject.src.replace('filtered',
			'filterable');
	this.filterObject.title = 'Filter';
	this.filterData();
	this.filterByColumn = null;
	this.filterValue = null;
	this.filterObject = null;
};

ListOrGridTable.prototype.filter = function(obj, columnName, filterValue) {
	if (!obj)
		obj = this.P2.doc.getElementById(this.name + '_' + columnName
				+ 'FilterImage');
	var lastOne = this.filterByColumn;
	this.filterByColumn = columnName;
	this.filterValue = filterValue;
	this.filterObject = obj;
	if (lastOne != columnName)// unfilter
	{
		obj.src = obj.src.replace('filterable', 'filtered');
		obj.title = 'Filter/Cancel';
	}

	if (lastOne) {
		this.filterObject.src = this.filterObject.src.replace('filtered',
				'filterable');
		this.filterObject.title = 'Filter';
	}
	var n;
	var comp = null;
	if (filterValue.indexOf('<=') == 0) {
		comp = 'le';
		filterValue = filterValue.substr(2);
	} else if (filterValue.indexOf('>=') == 0) {
		comp = 'ge';
		filterValue = filterValue.substr(2);
	} else if (filterValue.indexOf('!=') == 0) {
		comp = 'ne';
		filterValue = filterValue.substr(2);
	} else if (filterValue.indexOf('==') == 0) {
		comp = 'eq';
		filterValue = filterValue.substr(2);
	} else if (filterValue.indexOf('=') == 0) {
		comp = 'eq';
		filterValue = filterValue.substr(1);
	} else if (filterValue.indexOf('<') == 0) {
		comp = 'lt';
		filterValue = filterValue.substr(1);
	} else if (filterValue.indexOf('>') == 0) {
		comp = 'gt';
		filterValue = filterValue.substr(1);
	} else {
		n = filterValue.indexOf('%');
		if (n == 0) {
			n = filterValue.lastIndexOf('%');
			if (n == 0) {
				filterValue = filterValue.substr(1);
				comp = 'ew';
			} else {
				filterValue = filterValue.substring(1, n);
				comp = 'cn';
			}
		} else if (n > 0) {
			filterValue = filterValue.substring(0, n);
			comp = 'sw';
		}
	}
	this.filterData(columnName, filterValue, comp);
};

// common one to remove or filter columnName == null implies remove filter
ListOrGridTable.prototype.filterData = function(columnName, filterValue, comp) {
	var n = this.grid.length;
	var val;
	var tr = null;
	var tr1 = null;
	var tr2 = null;
	var dt = null;
	var colIdx = null;
	if (columnName) {
		var field = this.columns[columnName];
		colIdx = field.columnIdx;
		dt = dataTypes[field.dataType];
		if (!dt)
			dt = new TextDataType('text', '', null, 0, 9999);
		filterValue = dt.clientObject(filterValue);
		if (dt.basicType == dt.TEXT)
			filterValue = filterValue.toUpperCase();
		if (comp == null) {
			if (dt.basicType == dt.TEXT)
				comp = 'cn';
			else
				comp = 'eq';
		}
		comp = ListOrGridTable.comparators[comp]; // that is a function
	}
	var doc = this.P2.doc;
	var j = 1;
	for ( var i = 1; i < n; i++) {
		var row = this.grid[i];
		if (!row)
			continue;
		tr = doc.getElementById(this.name + i);
		if (!tr)
			alert(this.name + i + ' is not a tr ');

		if (this.rightTableBodyObject) {
			tr1 = doc.getElementById(this.name + 'Right' + i);
			if (this.scrollTableBodyObject)
				tr2 = doc.getElementById(this.name + 'Scroll' + i);
		}
		var selected = true;
		if (columnName) {
			val = dt.clientObject(row[colIdx]);
			if (dt.basicType == dt.TEXT) {
				if (val)
					val = val.toUpperCase();
				else
					val = '';
			}
			selected = comp(val, filterValue);
		}
		var disp = selected ? '' : 'none';
		tr.style.display = disp;
		if (tr1) {
			tr1.style.display = disp;
			if (tr2)
				tr2.style.display = disp;
		}
		var cls = (j % 2) ? 'row2' : 'row1';
		if (selected) {
			if (tr.className != 'deletedrow' && tr.className != cls) {
				tr.className = cls;
				if (tr1)
					tr1.className = cls;
			}
			j++;
		}
	}
};

// convinient functions instead of switch-case in loops
ListOrGridTable.comparators = {
	eq : function(cv, fv) {
		if (!cv)
			return fv ? false : true;
		if (!fv)
			return false;
		return (cv.valueOf() == fv.valueOf());
	},
	ne : function(cv, fv) {
		return (cv != fv);
	},
	gt : function(cv, fv) {
		return (cv > fv);
	},
	ge : function(cv, fv) {
		return (cv >= fv);
	},
	lt : function(cv, fv) {
		return (cv < fv);
	},
	le : function(cv, fv) {
		return (cv <= fv);
	},
	sw : function(cv, fv) {
		return (cv.indexOf(fv) == 0);
	},
	ew : function(cv, fv) {
		return (cv.lastIndexOf(fv) == cv.length - fv.length);
	},
	cn : function(cv, fv) {
		return (cv.indexOf(fv) >= 0);
	}
};

// remember that this data is in server format, and hence dates will get sorted
// properly. Let us just sort them as string
ListOrGridTable.prototype.sortServerData = function(columnToSort, sortDesc) {
	var colIdx = this.getColIdxForServerData(columnToSort);
	if (colIdx == null)
		return;
	var data = this.entireServerData;
	var startAt = 1; // data starts at row 1 and not 0
	var n = data.length;
	var f = this.filteredRows;
	var isFiltered = false;
	if (f && (f.length + 1) != n) {
		/**
		 * filtering within rows that are already filtered.
		 */
		isFiltered = true;
		n = f.length;
		startAt = 0;
	}
	var colData = [];
	if (this.additionalColumnToSort
			&& columnToSort != this.additionalColumnToSort) {
		var otherColIdx = this
				.getColIdxForServerData(this.additionalColumnToSort);
		for ( var i = startAt; i < n; i++) {
			var idx = isFiltered ? f[i] : i;
			var row = data[idx];
			var val1 = row[colIdx];
			/*
			 * this is server data being sorted. date and numbers sort fine.
			 * 
			 */
			if (val1 && val1.toUpperCase) {
				val1 = val1.toUpperCase();
			}
			var val2 = row[otherColIdx];
			/*
			 * this is server data being sorted. date and numbers sort fine.
			 * 
			 */
			if (val2 && val2.toUpperCase) {
				val2 = val2.toUpperCase();
			}
			var valRow = [ val1, val2 ];
			valRow.idx = idx;
			colData.push(valRow);
		}
		colData.sort(myMultiSort);
	} else {
		for ( var i = startAt; i < n; i++) {
			var idx = isFiltered ? f[i] : i;
			var val = data[idx][colIdx];
			/*
			 * this is server data being sorted. date and numbers sort fine.
			 * 
			 */
			if (val && val.toUpperCase) {
				val = val.toUpperCase();
			}
			// push an object with val and idx for our mySort algorithm
			debug('going to push ' + val + ' and ' + idx);
			colData.push({
				val : val,
				idx : idx
			});
		}
		colData.sort(mySort);
	}
	if (sortDesc)
		colData.reverse();
	var sortedRows = this.filteredRows = [];
	n = colData.length;
	for ( var i = 0; i < n; i++)
		sortedRows.push(colData[i].idx);
};

ListOrGridTable.prototype.filterServerData = function(columnToMatch,
		valueToMatch, applyOnExistingFilter) {
	var colIdx = this.getColIdxForServerData(columnToMatch);
	if (colIdx === null)
		return;

	var data = this.entireServerData;
	valueToMatch = valueToMatch.toUpperCase();
	var newFilteredRows = [];
	var indexes = null;
	var n = data.length;
	var startAt = 0;
	if (applyOnExistingFilter && this.filteredRows) {
		indexes = this.filteredRows;
		n = indexes.length;
		startAt = 1;
	}
	for ( var i = startAt; i < n; i++) {
		var row = indexes ? indexes[i] : i;
		var val = data[row][colIdx];
		if (val && val.toString().toUpperCase().indexOf(valueToMatch) >= 0)
			newFilteredRows.push(i);
	}
	this.filteredRows = newFilteredRows;
};

ListOrGridTable.prototype.getColIdxForServerData = function(columnName) {
	var names = this.entireServerData[0];
	var n = names.length;
	for ( var i = 0; i < n; i++) {
		if (names[i] === columnName)
			return i;
	}

	debug(columnName + ' is not a column in paginated data of ' + this.name);
	return null;
};
