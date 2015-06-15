// JScript File
// since table elements belong to page.fields, following validations are taken care in page.validate()
GridPanel.prototype.registerOnchangeHandler = function(win)
{
	debug("GridPanel.registerOnchangeHandler()");
	for (fieldName in this.fields)
	{
		//alert(fieldName);
		if (this.fields[fieldName].direction == this.fields[fieldName].IN)
		{
			var obj = win.document.getElementById(fieldName);
			obj.onchange = win.fieldChanged;
		}			
	}	
}

GridPanel.prototype.fieldChanged = function(win, obj)
{	
	debug("GridPanel.fieldChanged() tableName="+this.name+" obj.id="+obj.id);
	if(!this.actionFieldName) return;
		
	var rowIndex = this.getRowIndexFromId(obj.id);
	var actionField = this.getRowField(win, rowIndex, this.name+'_'+this.actionFieldName);
	var idField = (this.name+'_'+this.idFieldName) ? this.getRowField(win, rowIndex, this.name+'_'+this.idFieldName) : null;
	if(actionField.value == "delete")
	{
		alert('NOTE :This row is marked for deletion.'); //why is the user mdofying a deleted row??. no action from our side.
		return true;
	}

	if(idField && idField.value) actionField.value = "modify";//it is an existing row. mark it for update
	else actionField.value = "add";//it is a new row
	return true;
}


// revisit : TBD
// used for tables with repeated headings.
ListOrGridTable.prototype.updateTableHeader = function(win)
{
   	debug("updateTableHeader() tableName="+this.name+" htmlRowToClone="+this.htmlRowToClone);	
	var colIndex = this.mainTableColumns.length;
   	var tbl = win.document.getElementById(this.name);
	var rowToClone = this.htmlRowToClone;
	
   	if (this.qtyBySize)
   	{
	   	for (j in this.childTableColumns)
	   	{
	   		if (j < 3) continue; //skip 1st 3 cols
	   		var colSpan = 0;
	   		for (key in this.distinctKeys)
	   		{
	   			cell = tbl.tHead.rows[1].insertCell(-1);
	   			cell.innerHTML = this.distinctKeys[key];
	   			// prefix the col names with tableName. is it required?
	   			colName = this.childTableColumns[j]+"__"+key;
	   			this.columnNames[colName] = colIndex;
	   			this.metaRowToClone[colIndex] = clone(win, this.childTableMetaCell);
	   			this.metaRowToClone[colIndex].name = colName;
	   			//dataCell = rowToClone.insertCell(-1);
	   			dataCell = win.document.createElement('TD');
	   			rowToClone.insertBefore(dataCell, null);
	   			dataCell.innerHTML = this.childTableHtmlCell;
	   			colIndex++;
	   			colSpan++;
	   		}
			cell = tbl.tHead.rows[0].insertCell(-1);
			cell.colSpan = colSpan;
			cell.innerHTML = this.childTableColumns[j];	
	   	}
   	}
   	else
   	{
   		for (key in this.distinctKeys)
   		{
	   		var colSpan = 0;
   			for (j in this.childTableColumns)
   			{
	   			if (j < 3) continue; //skip 1st 3 cols
	   			cell = tbl.tHead.rows[1].insertCell(-1);
	   			cell.innerHTML = this.childTableColumns[j];
	   			colName = this.childTableColumns[j]+"__"+key;
	   			this.columnNames[colName] = colIndex;
	   			this.metaRowToClone[colIndex] = clone(win,this.childTableMetaCell);
	   			this.metaRowToClone[colIndex].name = colName;	   			
	   			//dataCell = rowToClone.insertCell(-1);
	   			dataCell = win.document.createElement('TD');
	   			rowToClone.insertBefore(dataCell, null);	   			
	   			dataCell.innerHTML = this.childTableHtmlCell;
	   			colIndex++;
	   			colSpan++;
   			}
			cell = tbl.tHead.rows[0].insertCell(-1);
			cell.colSpan = colSpan;
			cell.innerHTML = this.distinctKeys[key];
   		}
   	}
   	this.htmlRowToClone = rowToClone;
   	this.assignDataByName = true;
   	//debug("updateTableHeader() AFTER tableName="+this.name+" htmlRowToClone="+this.htmlRowToClone);
}

ListOrGridTable.prototype.updateTableBody = function (win, grid)
{
    debug("AbstractTable.updateTableBody() tableName=" + this.name);
    this.deleteAllRows(win);

    var uniqueRowIndex = -1;
    var lastRow;

    var tbl = win.document.getElementById(this.name);
    var rowToClone = this.htmlRowToClone;
    var tbody, rows;
    if (tbl.tBodies)
    {
        tbody = tbl.tBodies[0];
        rows = tbody.rows;
    }
    else //it is rendered inside div as a display panel
    {
        tbody = tbl;
        rows = tbl.childNodes;
    }

    //simple way to add data to a row, is in the order of data. That is for each column in data
    // there is a dom element that receives that data, in the same order.
    //A more complex, but flexible way is to assign data by name. See what the programmer wants
    var rowIdxs = new Object();
    if (this.assignDataByName)
    {
        // first row contains data. let us get the name/index organized as a collection, so that given a name I can get its index
        // and remeber, the full name of the column is the tableName_columnName
        for (var i = 0; i < grid[0].length; i++)
            rowIdxs[grid[0][i]] = i; // rowIdxs[column name] = idx in data row from server.	
    }
    // add more rows
    var cloneIdx = 0;
    var tr, rootNode, nextNode;

    for (var i = 1; i < grid.length; i++)
    {
        uniqueRowIndex = this.generateUniqueRowIndex(win);
        this.rowIndexes[i] = uniqueRowIndex;

        //clone the html row
        tr = rowToClone.cloneNode(true);
        if (i % 2)
            tr.className = 'row2';
        else
            tr.className = 'row1';
        // and add it to the table
        tr = tbody.appendChild(tr);

        dataIdx = -1; //points to the column in the data grid				
        nextNode = getNextNode(win, tr, null);

        for (var j = 0; j < this.columnNames.length; j++)
        {
            var objMeta = clone(win, win.P2.getElement(this.getFieldName(win, this.columnNames[j])));
            objMeta.name = this.getFieldName(win, this.columnNames[j], uniqueRowIndex);
            objMeta.rowNum = uniqueRowIndex;
            if (objMeta.basedOnField) objMeta.basedOnField = this.getFieldName(win, objMeta.basedOnField, uniqueRowIndex);
            if (objMeta.copyTo) objMeta.copyTo = this.getFieldName(win, objMeta.copyTo, uniqueRowIndex);
            if (objMeta.fromFieldName) objMeta.fromFieldName = this.getFieldName(win, objMeta.fromFieldName, uniqueRowIndex);
            if (objMeta.toFieldName) objMeta.toFieldName = this.getFieldName(win, objMeta.fromFieldName, uniqueRowIndex);
            nextNode.id = objMeta.name;
            nextNode.onchange = win.fieldChanged;

            win.P2.fields[objMeta.name] = objMeta;

            if (objMeta.calendar == true || objMeta.codePickerSrc)
            {
                var id;
                if (objMeta.calendar == true)
                    id = this.getFieldName(win, this.columnNames[j] + 'DatePicker', uniqueRowIndex);
                else
                    id = this.getFieldName(win, this.columnNames[j] + 'CodePicker', uniqueRowIndex);
                var imgMeta = clone(win.P2.getElement(id));
                imgMeta.name = id + this.idSplitter + uniqueRowIndex;
                imgMeta.targetName = objMeta.name;

                nextNode = getNextNode(win, tr, nextNode);
                nextNode.id = imgMeta.name;
                win.P2.fields[imgMeta.name] = imgMeta;
            }

            //debug(i+") nextNode.id="+nextNode.id+" lastRow["+j+"].name="+lastRow[j].name);
            if (j == 0 && this.addSeqNo) objMeta.setValue(win, i);
            if (!objMeta.doNotReceiveData)
            {
                if (this.assignDataByName) dataIdx = rowIdxs[this.columnNames[j]];
                else dataIdx++;

                if (dataIdx >= 0 && dataIdx < grid[0].length)
                    objMeta.setValue(win, grid[i][dataIdx]);
            }
            nextNode = getNextNode(win, tr, nextNode);
        }
    }
}

// addDataToTable() does the following:
// 1. add/remove HTML table rows based on the grid received from server
// 2. then push the data to the table elements
ListOrGridTable.prototype.addDataToTable = function(win, mainGrid, childGrid)
{
	var grid;
	debug("AbstractTable.addDataToTable() tableName="+this.name);
	if (!mainGrid || mainGrid.length == 0) return;
	if(childGrid)
	{
		grid = this.getDenormalizedGridAndChildTableKeys(win, mainGrid, childGrid);
		this.updateTableHeader(win); // updates both html and meta header info
	}
	else
	{
		grid = mainGrid;
	}
	this.updateTableBody(win, grid); // populate both html and meta info	
	// Below code is for testing getNormalizedGrids()
	/*
	if (childGrid)
	{
		var normalGrids = this.getNormalizedGrids();
		// display the mainGrid
		debug("GRID: ************* mainGrid:"+this.name)
		for (i=0; i<normalGrids[this.name].length; i++)
			debug(i+")"+normalGrids[this.name][i]);

		// display the childGrid
		debug("GRID: ************* childGrid:"+this.childTable)
		for (i=0; i<normalGrids[this.childTable].length; i++)
			debug(i+")"+normalGrids[this.childTable][i]);
	}
	*/
}

ListOrGridTable.prototype.getDenormalizedGridAndChildTableKeys = function(win, mainGrid, childGrid)
{
	var grid = new Array();
	var dataRows = new Object();
	var distinctKeys = new Object();

	// step1: prepare required data from childGrid for denormalization
	//
	// i=1; skip the first row i.e. header row.
	for(i=1; i<childGrid.length; i++)
	{
		var aRow = childGrid[i];
		distinctKeys[aRow[1]] = aRow[2];
		dataRows[aRow[0]+"_"+aRow[1]] = aRow;
	}
	
	// step2: copy existing data from mainGrid first
	for (i=0; i<mainGrid.length; i++)
	{
		grid[i] = new Array();
		for (j=0; j<mainGrid[0].length; j++)
		{
			grid[i][j] = mainGrid[i][j];
		}
	}
	
	// step3: copy the header row values
	var mainColIdx = mainGrid[0].length;
	for(childKey in distinctKeys)
	{
		for (j=3; j<childGrid[0].length; j++)
		{
			grid[0][mainColIdx] = childGrid[0][j]+"__"+childKey;
			mainColIdx++;
		}
	}
	
	// step4: copy remaining data rows
	//
	//child table may or may not have rows for every possible combination of parent key and child key.
	// null string will have to be copied to such cell. For this, let us have a blank row
	var blankRow = new Array(childGrid[0].length);
	for (j=0; j<childGrid[0].length; j++)
		blankRow[j] = "";
	//now, let us copy the rest of the grid
	//for each row in the main table
	for (i=1; i<mainGrid.length; i++) 
	{
		var mainKey = mainGrid[i][0];
		mainColIdx = mainGrid[0].length;
		//for each unique child key value
		for(childKey in distinctKeys) 
		{
			var vals = dataRows[mainKey+"_"+childKey];
			if (vals == null)
				vals = blankRow;
			//copy each of the childColumns
			for (j=3; j<childGrid[0].length; j++)
			{
				grid[i][mainColIdx] = vals[j];
				mainColIdx++;
			}
		}
	}
	
	// keep relevant info in metadata that would be used during normalization.
	this.distinctKeys = distinctKeys;
	this.childTableColumns = new Array();
	for (j=0; j<childGrid[0].length;j++)
		this.childTableColumns[j] = childGrid[0][j];
	this.mainTableColumns = new Array(); //mainGrid[0];
	for (j=0; j<mainGrid[0].length; j++)
		this.mainTableColumns[j] = mainGrid[0][j];
	
	return grid;
}

ListOrGridTable.prototype.getNormalizedGrids = function(win)
{
	var grids = new Object();
	
	// construct mainGrid
	var mainGrid = new Array();
	mainGrid[0] = this.mainTableColumns;
	colSize = this.mainTableColumns.length;
	for (i=1; i<this.fieldArray.length;i++)
	{
		mainGrid[i] = this.fieldArray[i].slice(0, colSize);
		for (j=0; j<colSize; j++)
			mainGrid[i][j] = mainGrid[i][j].getValue(win);
	}
	
	// construct childGrid
	var childGrid = new Array();
	childGrid[0] = this.childTableColumns;
	// construct column name hash map
	var columnMap = new Object();
	for (j=0; j<this.fieldArray[0].length; j++)
	{
		columnMap[this.fieldArray[0][j]] = j;
	}
	//let us first fill the first two columns. it is a cross product of foreign key and internal key
	foreignKeyColIdx = columnMap[childGrid[0][0]];
		
	for (colIdx=3; colIdx<childGrid[0].length; colIdx++) //for each column other than the first one... 
	{
		rowIdx = 1; 
		for (keyIdx in this.distinctKeys) // for each repetition of the repeated field
		{
			thisColIdx = columnMap[childGrid[0][colIdx]+"__"+keyIdx];
			for (inputRowIdx=1; inputRowIdx<this.fieldArray.length; inputRowIdx++)
			{
				var val = this.fieldArray[inputRowIdx][thisColIdx].getValue(win);
				//debug(rowIdx+") inputRowIdx="+inputRowIdx+" "+childGrid[rowIdx]);
				if (val != ' ')
				{
					if (!childGrid[rowIdx]) childGrid[rowIdx] = new Array();
					childGrid[rowIdx][colIdx] = val;
					childGrid[rowIdx][0] = this.fieldArray[inputRowIdx][foreignKeyColIdx].getValue(win);
					childGrid[rowIdx][1] = keyIdx;
					childGrid[rowIdx][2] = this.distinctKeys[keyIdx];				
					rowIdx++;
				}

			}
		}
	}
	grids[this.name] = mainGrid;
	grids[this.childTable] = childGrid;
	return grids;
}

// Calculates the sum of columns (column group specified by columnName)
// for a specified row (rowIndex).
// if rowIndex is not specified, calculates for all rows.
// if columnName is not specified, calculates for all column groups.
ListOrGridTable.prototype.sumOfColumns = function(win, rowIndex, columnName)
{
	var start, end;
	var id;
	var obj;
	// get column sum for a particular row
	if (rowIndex && rowIndex > 0 && rowIndex < this.rowIndexes.length)
	{
		start = rowIndex;
		end = rowIndex;
	}
	else
	{
		start = 1;
		end = this.rowIndexes.length; 
	}
	
	var columnList = new Object();
	var localColumnName;
	if (columnName)
	{
		columnList[columnName] = true;
	}
	else
	{
		for (j=0; j<this.columnNames.length; j++)
		{
			id = this.getFieldName(win,this.columnNames[j], this.rowIndexes[0]);
			metaObj = win.P2.getElement(id);
			if(!metaObj)continue;
			localColumnName = metaObj.columnSum;
			if (localColumnName) columnList[localColumnName] = true;
		}
	}
	for (i=start; i<end; i++)
	{
		var sum = new Object(); // assumption is sum[localColumnName] is initialized to zero.
		for (j=0; j<this.columnNames.length; j++)
		{
			id = this.getFieldName(win,this.columnNames[j], this.rowIndexes[i]);
			obj = win.P2.getElement(id);
			if(!obj)continue;
			localColumnName = obj.columnSum;
			if (columnList[localColumnName] == true)
				sum[localColumnName] += obj.getValue(win);
		}
		for (localColumnName in columnList)
		{
			id = localColumnName + this.idSplitter + this.rowIndexes[i];
			metaObj = win.P2.getElement(id);
			if(!metaObj)continue;
			metaObj.setValue(win, sum[localColumnName]);
		}
		delete sum;	
	}
}

ListOrGridTable.prototype.averageOfColumns = function(win, rowIndex, columnName)
{
	var start, end;
	var id;
	var obj;
	// get column sum for a particular row
	if (rowIndex && rowIndex > 0 && rowIndex < this.rowIndexes.length)
	{
		start = rowIndex;
		end = rowIndex;
	}
	else
	{
		start = 1;
		end = this.rowIndexes.length; 
	}
	
	var columnList = new Object();
	var localColumnName;
	if (columnName)
	{
		columnList[columnName] = true;
	}
	else
	{
		for (j=0; j<this.columnNames.length; j++)
		{
			id = this.getFieldName(win,this.columnNames[j], this.rowIndexes[0]);
			metaObj = win.P2.getElement(id);
			if(!metaObj)continue;
			localColumnName = metaObj.columnAverage;
			if (localColumnName) columnList[localColumnName] = true;
		}
	}
	for (i=start; i<end; i++)
	{
		var sum = new Object(); // assumption is sum[localColumnName] is initialized to zero.
		var count = new Object();
		for (j=0; j<this.columnNames.length; j++)
		{
			id = this.getFieldName(win,this.columnNames[j], this.rowIndexes[i]);
			obj = win.P2.getElement(id);			
			localColumnName = obj.columnAverage;
			if (columnList[localColumnName] == true)
			{
				sum[localColumnName] += obj.getValue(win);
				count[localColumnName]++;
			}
		}
		for (localColumnName in columnList)
		{
			var result = sum[localColumnName]/count[localColumnName];
			id = localColumnName + this.idSplitter + this.rowIndexes[i];
			win.P2.getElement(id).setValue(win, result);
		}
		delete sum;	delete count;
	}
}

// Calculates sum of all rows for a particular column (specified by columnIndex).
// if columnIndex is not specified, sum is calculated for all columns for 
// which rowSum=true
ListOrGridTable.prototype.sumOfRows = function(win, columnIndex)
{
	var id;
	
	if (columnIndex && columnIndex >= 0 || columnIndex < this.columnNames.length)
	{
		var sum = 0;
		for (i=0; i<this.rowIndexes.length; i++)
		{
			id = this.getFieldName(win,this.columnNames[columnIndex], this.rowIndexes[i]);
			
			sum += win.P2.getElement(id).getValue(win);
		}
		var obj = win.P2.getElement(this.getFieldName(win,this.columnNames[columnIndex] + "RowSum"));
		if (obj) obj.setValue(win, sum);
	}
	// calculate sum of rows for all columns whose rowSum=true
	else
	{
		for (j=0; j<this.columnNames.length; j++)
		{
			id = this.getFieldName(win,this.columnNames[j], this.rowIndexes[0]);
			metaObj = win.P2.getElement(id);
			if(!metaObj)continue;
			
			if (metaObj.rowSum == true)
			{
				var sum = 0;
				for (i=0; i<this.rowIndexes.length; i++)
				{
					id = this.getFieldName(win,this.columnNames[j], this.rowIndexes[i]);
					sum += win.P2.getElement(id).getValue(win);
				}
				var obj = win.P2.getElement(this.getFieldName(win,this.columnNames[j] + "RowSum"));
				if (obj) obj.setValue(win, sum);								
			}
		}
	}	
}

ListOrGridTable.prototype.averageOfRows = function(win, columnIndex)
{
	var id;
	
	if (columnIndex && columnIndex >= 0 || columnIndex < this.columnNames.length)
	{
		var sum = 0;
		for (i=0; i<this.rowIndexes.length; i++)
		{
			id = this.columnNames[columnIndex] + this.idSplitter + this.rowIndexes[i];
			metaObj = win.P2.getElement(id);
			if(!metaObj)continue;
			sum += metaObj.getValue(win);			
		}
		var obj = win.P2.getElement(this.columnNames[columnIndex] + "RowAverage");
		if (obj) obj.setValue(win, sum/this.rowIndexes.length);		
	}
	else
	{
		for (j=0; j<this.columnNames.length; j++)
		{
			id = this.columnNames[j] + this.idSplitter + this.rowIndexes[0];
			metaObj = win.P2.getElement(id);
			if(!metaObj)continue;
			if (metaObj.rowAverage == true)
			{
				var sum = 0;
				for (i=0; i<this.rowIndexes.length; i++)
				{
					id = this.columnNames[j] + this.idSplitter + this.rowIndexes[i];
					sum += win.P2.getElement(id).getValue(win);	
				}
				var obj = win.P2.getElement(this.columnNames[j] + "RowAverage");
				if (obj) obj.setValue(win, sum/this.rowIndexes.length);								
			}
		}
	}	
}