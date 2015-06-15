
//quick search on list panel based on a search field
ListOrGridTable.prototype.quickSearchInit = function ()
{
    var ele = this.P2.doc.getElementById(this.quickSearchFieldName);
    if (!ele)
    {
        alert('Design Error: ' + this.quickSearchFieldName + ' is not a valid field name. It is used as a quick search field for  list panel ' + this.panelName);
        return;
    }
    ele.searchTableName = this.name; //link for event handler function to get this object
    //attach event handlers. 
    //keyPressedOnQuickSearch() is defined in exilityLoader, so that it is available in the window that fires these events. It calls this.quickFIlter(val)
    if (ele.addEventListener)
        ele.addEventListener("keyup", this.keyPressedOnQuickSearch, true);
    else
        ele.attachEvent("onkeyup", this.keyPressedOnQuickSearch);
    this.quickSearchEle = ele;
};

/**
 * this is not a method, but an event function. Hence "this" will not work
 * @param evt
 */
ListOrGridTable.prototype.keyPressedOnQuickSearch = function ()
{
	if(!this.searchTableName){
		debug('We have issue with concept of this while handling events!!');
		return;
	}
	var table = null;
	try
	{
		table = currentActiveWindow.P2.getTable(this.searchTableName);
	}catch(e)
	{
		debug('unable to get table ' + e);
	}
	
	//debug("this is " + this + ' and value is ' + this.value);
	if(!table)
	{
		debug('Unable to find table for quick search for element ' + this.id);
		return;
	}
	debug(this.value + ' is the value with entireServerData =' + (table.entireServerData && table.entireServerData.length));
	if(table.entireServerData)
	{
		table.paginatedQuickSearch(this.value);
	}
	else
	{
		table.quickSearch(this.value);
	}
	
};

ListOrGridTable.prototype.quickSearchReset = function ()
{
    this.quickSearchEle.value = this.lastFilteredText = '';
    this.gotFiltered = false;
};

ListOrGridTable.prototype.quickSearchBuild = function ()
{
    var n = this.grid.length;
    var m = this.columnNames.length;
    for (var i = 1; i < n; i++)
    {
    	var row = this.grid[i];
    	if(row) this.assignSearchText(row, m);
    }
};

ListOrGridTable.prototype.assignSearchText = function (row, m)
{
	var text = [];
    for (var j = 0; j < m; j++)
    {
    	var col = row[j];
    	if(col.toUpperCase) text.push(col.toUpperCase());
    	else text.push(col);
    }
    row.searchText = text.join(' ');
};

ListOrGridTable.prototype.quickSearchRebuildRow = function (idx)
{
    if (!idx)
        idx = this.currentRow;
    var row = this.grid[idx];
    if (row) this.assignSearchText(row, this.columnNames.length);// row is deleted
};

ListOrGridTable.prototype.quickSearchAdd = function (nbrToAdd)
{
    var m = this.columnNames.length;
    var n = this.grid.length;
    var doc = this.P2.doc;
    for (var i = 0; i < nbrToAdd; i++)
    {
    	var row = this.grid[n];
        if(row) 
        { 
        	this.assignSearchText(row, m);
        	row.tr = doc.getElementById(this.name + i);
        }
        n++;
    }
    //re-search
    if (this.gotFiltered)
    {
        this.quickSearch(this.quickSearchEle.value);
    }
};

ListOrGridTable.prototype.quickSearch = function (text)
{
	debug('|' + text + '| and last text was  |' + this.lastFilteredText + '|' );
	if(this.lastFilteredText == text){
		debug('Not going to filter again!!|');
		return;
	}
	this.lastFilteredText = text;
    var n = this.grid.length;
    var nbrRows = 0;
    var m = this.columnNames.length;
    if (text)
    {
        this.gotFiltered = true;
        text = text.toUpperCase();
        for (var i = 1; i < n; i++)
        {
        	var row = this.grid[i];
        	if(!row)
        	{
        		continue;
        	}

        	if(!row.searchText)
        	{
        		this.assignSearchText(row, m);
        	}
        	if(!row.tr)
        	{
        		row.tr = this.P2.doc.getElementById(this.name + i);
        	}
        	var disp = 'none';
    		if(row.searchText.indexOf(text) >= 0)
            {
    			disp = '';
                nbrRows++;
            }
    		
			row.tr.style.display = disp;
			if(row.rightTr)
			{
				row.rightTr.style.display = disp;
			}
    	}
        if (this.trELe)
        {
            this.trEle.innerHTML = nbrRows + ' of ' + this.totalRows;
        }
    }
    else if (this.gotFiltered)//select all
    {
        this.gotFiltered = false;
        for (var i = 1; i < n; i++)
        {
        	var row = this.grid[i];
        	if(row && row.tr)
        	{
        		row.tr.style.display = '';
        	}
        	else
        	{
        		debug('Could not locate tr for row ' + i);
        	}
        }
        
        if(this.trEle)
        {
        	this.trEle.innerHTML = this.totalRows;
        }
    }

    this.P2.win.adjustFrameHeightToBodyHeight();
    return nbrRows;
};

ListOrGridTable.prototype.paginatedQuickSearch = function (text)
{
	/*
	 * get entire server data filtered, so that this.filteredRows is updated
	 */
	this.getQuickSearchIndexes(text);
	/*
	 * use filtered rows as entire data for pagination
	 */
    var totalRows = this.filteredRows.length;
    /*
     * pageData should have header row, and carry at most one page of data 
     */
	var pageData = [this.entireServerData[0]];
    var nbrRows = totalRows;
    if(nbrRows > this.pageSize) nbrRows = this.pageSize;
	for(var i = 0; i < nbrRows; i++)
	{
		var idx = this.filteredRows[i];
		pageData.push(this.entireServerData[idx]);
	}

	/*
	 * create a dc as if it came from server
	 */
	var dc = new DataCollection();
	dc.addGrid(this.name, pageData);
	if(totalRows > nbrRows)
	{
	    dc.values[this.name + 'TotalRows'] = totalRows;
	}
	/*
	 * reset pagination. ensure that it does not call localPaginaitonInit again
	 */
	this.initPagination(dc, true);
	
	/*
	 * now simulate setData. This portion is a simpler version of setData() method
	 */
	this.tableBodyObject.innerHTML = '';
    
    if (this.rightTableBodyObject)
    {
        this.rightTableBodyObject.innerHTML = '';
    }

    //remove rows from data 
    this.grid.length = 1;
    this.nbrRows = 0;

    this.serverData = pageData;

    var doc = this.P2.doc;
    this.currentRow = 0; 
    for (var i = 1; i <= nbrRows; i++)
    {
    	var serverDataRow = pageData[i];
        this.currentRow++;
        //add an html row
        var newRow = this.htmlRowToClone.cloneNode(true);
        var newDataRow = new Array(this.nbrColumns);
        var clsName = (this.currentRow % 2) ? 'row2' : 'row1';
        newRow.className = clsName;
        newRow.rowIdx = this.currentRow; // set the pointer to the data row
        newRow.id = this.name + this.currentRow; // in case I need to reach the tr with just the index...
        this.tableBodyObject.appendChild(newRow);
        
        if (this.frozenColumnIndex)
        {
            this.cloneFrozenRow(clsName, this.currentRow);
        }

        this.grid.push(newDataRow);
        this.addDataToARow(doc, newDataRow, newRow.rowIdx, serverDataRow, this.fieldCols);
    }
};

ListOrGridTable.prototype.getQuickSearchIndexes = function (text)
{
	if(text.toUpperCase) text = text.toUpperCase();
	var newFilteredRows = [];
    var data = this.entireServerData;
    var n = data.length - 1;
	debug('going to filter ' + n + ' rows');
   for (var i = 1; i < n; i++)
    {
        var row = data[i];
        if(!row.searchText)
        	this.assignSearchText(row, row.length);
		if(row.searchText.indexOf(text) >= 0)
            newFilteredRows.push(i);
    }
    this.filteredRows = newFilteredRows;
    debug('ended up filtering ' + this.filteredRows.length + ' rows');
};
