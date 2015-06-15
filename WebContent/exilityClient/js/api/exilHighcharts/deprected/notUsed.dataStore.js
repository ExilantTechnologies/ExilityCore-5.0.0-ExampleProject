/*
=============================================================================================
    Purpose : 
 CHANGE LOG :

   DATE                              CHANGED BY                       DESCRIPTION
===========                          ==========                     ===============
27-Apr-2009							   Venkat	    Bug 466 -  Sum, Average and Append is not working in Local Service. - Exility
04-May-2009							   Venkat	        Bug 468 -  Add COlumn Is not working. - Exility  
25-Sep-2009							   Aravinda PR	    Bug 708 - Problems in using xls data in local service - PTW  
26-Dec-2010							   Aravinda PR		Bug 1895 - Pagination in Local Service - CPT
=============================================================================================
*/
// Defines a datastore that is a simple in-memory source of data to pages.
function DataStore()
{
    this.tables = new Object();//stores tables and views
    this.sessionVariables = new Object();//simualtes session variable on the server
}

DataStore.prototype.addTable = function (tableName, data)
{
    var tbl = new DataTable(tableName, false);
    tbl.setData(data);
    this.tables[tableName] = tbl;
    tbl.dataStore = this;
}

DataStore.prototype.getTable = function (tableName)
{
    var tbl = this.tables[tableName];
    if(tbl)
        return tbl;
    raiseError(tableName + ' is not a view/table ');
}
/*
 * Creates a view from joining two or more tables and cretaes simple denormalized view
 * This is designed to add columns to the primary tables based on foreign keys into other tables
 * tables, primaryColumn, joiningColumn, columnsToInclude, onlyMatchedColumns are arrays with same number of elements in each
 * primary column is the name of the column in primaryTable to be matched with joiningColumn in joiningTable
 * onlyMatchedRows, if set to true, avoids adding rows in primary table for which no matching column is found.
 * NOTE: this join is designed for equi or left join only. Which means the resulting view has same number
 * of rows if noRowIfNoMatch is false for all (or mathing column is found for all rows)
 * Only the first match is considered from the joining table, and hence rows from primary table is never repeated
 * NOTE 1: Data in views are dynamically managed by Exility. They will always show the latest data.
 */
DataStore.prototype.createView = function (viewName, baseTable, joiningTables, primaryColumns, joiningColumns, columnsToAdd, onlyMatchedRows)
{
    var tbl = new DataTable(viewName, true);
    var btable = this.tables[baseTable];
    if(!btable)
        raiseError(baseTable + ' is not a table or view ');

    tbl.baseTable = btable;
    var row = new Array();
    var nbrTables = joiningTables.length;
    var row1 = btable.data[0];
    //create the header row for the join by appending all column names
    for(var i = 0; i < row1.length; i++)
        row.push(row1[i]);
    //let us convert column names to indexes and keep it as attribute of this view
    tbl.joiningTables = new Array(nbrTables);
    tbl.primaryIndexes = new Array(nbrTables);
    tbl.joiningIndexes = new Array(nbrTables);
    tbl.originalColumnsToAdd = columnsToAdd;

    tbl.columnIndexesToAdd = new Array(nbrTables);
    tbl.onlyMatchedRows = onlyMatchedRows;
    for(var i = 0; i < nbrTables; i++)
    {
        //does the table exist?
        var tName = joiningTables[i];
        var t = this.tables[tName];
        if(!t)
            raiseError('CreateView: invalid table to join - ' + tName);
        var cols = columnsToAdd[i];
        if( cols == '*')
            cols = this.getJoiningFields(baseTable, tName);
        else
            cols = cols.split(',');

        tbl.joiningTables[i] = t;
        
        //what about other columns
        var tmp = btable.getColumnIndex(primaryColumns[i]);
        if(tmp == null)
            raiseError('CreateView: invalid column name - ' + primaryColumns[i] + ' is not a column in table ' + btable.name);

        tbl.primaryIndexes[i] = tmp;
        
        tmp = t.getColumnIndex(joiningColumns[i]);
        if(tmp == null)
            raiseError('CreateView: invalid column name - ' + joiningColumns[i] + ' is not a column in table ' + joiningTables[i]);

        tbl.joiningIndexes[i] = tmp;
        
        var indxes = new Array();
        var colName, newName;
        tbl.columnIndexesToAdd[i] = indxes;
        for(var j = 0; j < cols.length; j++)
        {
            colName = cols[j];
            if(colName.indexOf(' as ') > 0)
            {
                var aliases = colName.split(' as ');
                colName = aliases[0];
                newName = aliases[1];
            }
            else
                newName = colName;
            tmp = t.getColumnIndex(colName);
            if(tmp == null)
                raiseError('CreateView: invalid column name - ' + colName + ' is not a column in table ' + joiningTables[i]);

            indxes.push(tmp);
            row.push(newName);
        }
    }
    tbl.setData([row]);
    tbl.nbrTables = nbrTables;
    this.tables[viewName] = tbl;
    tbl.dataStore = this;

    //set dependencies
    btable.views[viewName] = tbl;
    for(var i = 0; i < nbrTables; i++)
        this.tables[joiningTables[i]].views[viewName] = tbl;
}

/*
 * xl is the xml of a xl sheet, as saved by microsoft xl applicaiton.
 */
DataStore.prototype.loadTables = function(xl)
{
	var sheets = xl.getElementsByTagName('Worksheet');
	debug('There are ' + sheets.length + ' sheets in xls.');
	var viewsData = null;
	for(var i = 0; i < sheets.length; i++)
	{
	    var sheet = sheets[i];
	    var nam = sheet.getAttribute('ss:Name');
	    var tables = sheet.getElementsByTagName('Table');
	    if (tables.length == 0)
	        continue;
	    var data = xlTableToGird(tables[0]);
	    if(!data || data.length == 0)
	        continue;
	    if(nam == 'views')//we will handle that later
	    {
	        viewsData = data;
	        continue;
	    }
	    var tbl = new DataTable(nam, false);
	    this.addTable(nam, data);
	}
	if(viewsData)
	    this.loadViews(viewsData);
}
/*
 * views is a grid with a header row and subsequent rows representing views
 * First row of a view has two cells, viewName and baseTableName
 * subsequent rows has their first cell empty, and the following cells
 * 1. joiningTableName - name of the table to be joined
 * 2. baseColumnName - name of the column in base table to be used for joining
 * 3. joiningColumnName - name of the column in joining tabe to be used for joining
 * 4. fieldsToBeAdded - comma separated list of column names from the joining table to be included in the view. * means all
 * 5. flag indicating whether a match is a MUST for the row to be included. If set to false (or 0) view will not have rows for which matches are not found
 */
DataStore.prototype.loadViews = function(views)
{
    var i = 1;
    var n = views.length;
    while(i < n)//i incremented on a need basis. Some part of teh code has to look ahead
    {
        var row = views[i];
        var nam = row[0];
        var baseName = row[1];
        
        if(!nam)//could be empty row
        {
            i++;
            continue;
        }
        if(!baseName)
        {
            raiseError('Base table name is not specified for view ' + nam);
            i++;
            continue;
        }
        var tables = new Array();
        var bCols = new Array();
        var jCols = new Array();
        var fields = new Array();
        var flags = new Array();
    
        while (++i < n)//sorry about that ++i, but that is apt here
        {
            row = views[i];
            var mc = row[2];
            if(!mc)
                break;
            tables.push(row[1]);
            bCols.push(mc);
            jCols.push(row[3]);
            var f = new String(row[4]);
            fields.push(f);
            flags.push(row[5]);
        }
        if(tables.length > 0)
            this.createView(nam, baseName, tables, bCols, jCols, fields, flags);
    }
}
/* local function to get indexes of joining fields */
DataStore.prototype.getJoiningFields = function(name1, name2)
{
    var fields = new Array();
    var tbl1 = this.tables[name1];
    var tbl2 = this.tables[name2];
    if(!tbl1 || !tbl2)
        return fields;
        
    for (var a in tbl2.columns)
    {
        if(tbl1[a])
            continue;
        fields.push(a);
    }
    
    return fields;
}

DataStore.prototype.toHtml = function()
{
	var str = '<div><div style="align:center"> Tables in xl</div>';
	for(var nam in this.tables)
	    str += nam + this.tables[nam].toHtml(nam) + '<br />';
    str += '</div>';
    return str;
}

DataStore.prototype.toXml = function()
{
    var txt = '<?xml version="1.0" ?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n\txmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    var viewTxt = '';
    for(var tableName in this.tables)
    {
        var tbl = this.tables[tableName];
        if(tbl.isView)
            viewTxt += tbl.viewToXml();
        else
            txt += '<Worksheet ss:Name="' + tableName + '"><Table>\n' + tbl.dataToXml() + '</Table></Worksheet>\n';
    }
    if(viewTxt)
        txt += '<Worksheet ss:Name="views"><Table>\n' + viewTxt +  '</Table></Worksheet>\n'
    return txt + '</Workbook>\n';
}

//table represents a sheet in the xl sheet. first (zeroth) column must be the unique key
function DataTable(name, isView)
{
    this.name = name;
    this.views = new Object(); //tracks voews that are dependent on this table
    this.isView = isView;
    if(isView)
        this.toBeRefreshed = true; //views are built on need basis. this flag tracks the need.
}

DataTable.prototype.setData = function(data)
{
    var columns = new Object(); //column names are indexed with their idx for easy retrieval
    var vtypes = new Array();
    var names = data[0];
    var n = names.length;
    for(var i = 0; i < n; i++)
    {
        var name = names[i];
        columns[name] = i;
        vtypes.push(dataDictionary.getValueType(name));
    }
    this.valueTypes = vtypes;
    this.columns = columns;
    this.nbrCols = n;
    this.data = new Array();
    this.data.push(data[0]);

    if(this.isView)
        return;
    n = data.length;
    var startAt = 1;
    if(n > 1 && data[1][0] == 'default')
    {
        this.defaultRow = this.parseRow(data[1]);
        startAt = 2;
    }
    for(var i = startAt; i < n; i++)
        this.data.push(this.parseRow(data[i]));
}

DataTable.prototype.parseRow = function(row)
{
    for(var j = 0; j < this.nbrCols; j++)
        row[j] = this.valueTypes[j].parse(row[j]);
    return row;
}

DataTable.prototype.getData = function ()
{
    if(this.toBeRefreshed)
    {
        this.refresh();
        this.toBeRefreshed = false;
    }
    return this.data;
}

DataTable.prototype.getColumnIndex = function (columnName)
{
    var idx = this.columns[columnName];
    if(idx || idx == 0)
        return idx;
    return null;
}

/* sets dirty flag recirsively for all dependent views */
DataTable.prototype.setDirty = function ()
{
    if(this.isView)
    {
        this.toBeRefreshed = true;
        this.data.length = 1;
    }
    for(var vname in this.views)
        this.views[vname].setDirty();
}

/* bilds data rows for a view. Note that this is called by getData() and hence all underlying views are gauranteed to be current */
DataTable.prototype.refresh = function ()
{
    var ds = this.dataStore;
    this.data.length = 1; //chop-off data
    var data1 = this.baseTable.getData();
    //now for each row in primary table, get the mathing row ids in all secondary table, if all are found, copy columns
    for(var rowNumber = 1; rowNumber < data1.length; rowNumber++)
    {
        var primaryRow = data1[rowNumber];
        var matchingRows = new Array(this.nbrTables);
        var rowSelected = true;
        for(var i = 0; i < this.nbrTables; i++)
        {
            var columnVale = primaryRow[this.primaryIndexes[i]];
            var matchIdx = this.joiningIndexes[i];
            var data = this.joiningTables[i].getData();
            var rowFound = false;
            var row;
            for(var j = 1; j < data.length; j++)
            {
                row = data[j]; 
                if(columnVale != row[matchIdx])
                    continue;
                rowFound = true;
                matchingRows[i] = row;
                break;
            }
            if(this.onlyMatchedRows[i] == '1' && !rowFound)
            {
                rowSelected = false
                break;
            }
        }
        if(!rowSelected)
            continue;  
        row = new Array();
        this.data.push(row);
        for(var j = 0; j < primaryRow.length; j++)
            row.push(primaryRow[j]);
        for(var i = 0; i < this.nbrTables; i++)
        {
            var row2 = matchingRows[i];
            var cols = this.columnIndexesToAdd[i];
            for(var j = 0; j < cols.length; j++)
                row.push(row2 ? row2[cols[j]] : '');
        }
    }
    debug(this.name + ' view refreshed with ' + (this.data.length - 1) + ' rows of data.');
}

//columnName defaults to key columns
DataTable.prototype.getRowIndex = function (columnValue, columnName)
{
    var data = this.getData();
    var n = data.length;
    var j = 0;
    if(columnName)
    {
        j = this.columns[columnName];
        if(!j && j != 0)
            raiseError(columnName + ' is not a column in ' + this.name);
    }
    else
        columnName = data[0][0];
    for(var i = 1; i < n; i++)
    {
        if(data[i][j] == columnValue)
        {
            debug('Returning a row from ' + this.name + '(with  ' + (n -1) + ' rows) that has a value ' + columnValue + ' for column ' + columnName );
            return i;
        }
    }
    debug(this.name + '(with  ' + (n -1) + ' rows) does not have a row with ' + columnValue + ' for column ' + columnName );
    return -1;
}

DataTable.prototype.getAllIndexes = function ()
{
    var indexes = new Array();
    var n = this.getData().length;
    for(var i = 1; i < n; i++)
        indexes.push(i);
    return indexes;
}

DataTable.prototype.getRowIndexes = function (condition, values)
{
    if(!condition)
        return this.getAllIndexes();;
    var data = this.getData();
    var nbrRows = data.length;
    var indexes = new Array();
    if(condition.value != null) //condition has no variables!!
    {
        if(condition.value)
            indexes = this.getAllIndexes();
        debug(this.name + ' has ' + (nbrRows-1) + ' rows. ' + indexes.length  + ' rows matched condition = ' + condition.text);
        return indexes;
    }
    
    //look at current parts. For every variable part, see if it is row variable or it is to be found in values.
    //creta new parts by treating only row variable as variables, and substituting other values..
    var parts = new Array;
    var startsWithVariable = false;
    var isVariable = !condition.startsWithVariable;
    var accumulatedPart = null;
    var fixedValue = null;

    var n = condition.parts.length;
    for( var i = 0; i < n; i++)
    {
        var part = condition.parts[i];
        isVariable = !isVariable;
        if(isVariable)
        {
            if(part.indexOf('row.') == 0) //this is a column variable
            {
                var colName = part.substr(4, part.length-4);
                var idx = this.columns[colName];
                if(!idx && idx != 0)
                    condition.raiseError(-1, colName + ' is not a column in ' + this.name + ' when part = ' + part);
                if(accumulatedPart)
                    parts.push(accumulatedPart);
                else
                    startsWithVariable = true;
                parts.push(idx);
                accumulatedPart = null;
                continue;
            }
            part = condition.getFormattedValue(part, values); //and fall off to next block to accumulate the part
        }
        if(accumulatedPart == null)
            accumulatedPart = part;
        else
            accumulatedPart += part;
    }
    if(parts.length == 0) //no column variables
    {
        if(eval(accumulatedPart))
            indexes = this.getAllIndexes();
        debug(this.name + ' has ' + (nbrRows-1) + ' rows. ' + indexes.length  + ' rows matched condition = ' + condition.text);
        return indexes;
    }        
    
    if(accumulatedPart != null)
        parts.push(accumulatedPart);

    var data = this.getData();
    for(var i = 1; i < this.data.length; i++)
    {
        var row = this.data[i];
        isVariable = startsWithVariable;
        var exp = '';
        for(var j = 0; j < parts.length; j++)
        {
            if(isVariable)
            {
                var idx = parts[j];
                var val = row[idx];
                if(val)
                    val = this.valueTypes[idx].formatForExpr(val);
                else
                    val = "''";
                exp += val;
            }
            else
                exp += parts[j];
            isVariable = !isVariable;
        }
        if(eval(exp))
            indexes.push(i);
    }
    debug(this.name + ' has ' + (nbrRows-1) + ' rows. ' + indexes.length  + ' rows matched condition = ' + condition.text);
    
    return indexes;
}

//copy a row matched by either a selection criterion, or by primary key
DataTable.prototype.copyRow = function (values, prefix, selectionCriterion)
{
    var i = -1;
    if(selectionCriterion)
    {
        var expr = selectionCriterion && selectionCriterion.getExpression(values); 
        var indexes = this.getRowIndexes(expr, values);
        if(indexes && indexes.length)
            i = indexes[0];
    }
    else //look-up based on primary key
    {
        val = values[this.data[0][0]]; //first column is key. get key value
        if(typeof(val) == 'undefined')
            raiseError('No value is supplied for column ' + this.data[0][0] + ' in table/view ' + this.name); 
        i = this.getRowIndex(val);
    }
    if(i == -1)
        return false;
    row = this.getData()[i];
    if(prefix)
    {
        for(var name in this.columns)
            values[prefix+name] = row[this.columns[name]];
    }
    else
    {
        for(var name in this.columns)
            values[name] = row[this.columns[name]];
    }
    return true;
}

DataTable.prototype.deleteRow = function (values, keyValue)
{
    if(this.isView)
    {
        alert(this.name + 'is a view. Row can not be deleted from a view.');
        return false;
    }
    if(!keyValue)
        keyValue = values[this.data[0][0]];
    if(!keyValue)
    {
        debug(' Value for field ' + this.data[0][0] + ' not supplied for deleting a row in table ' + this.name);
        return 0; 
    }
    var i = this.getRowIndex(keyValue);
    if(i == -1)
        return 0;
    for(var j = i+1; j < this.data.length; j++)
        this.data[j-1] = this.data[j];
    this.data.length--;
    this.setDirty();
    debug('A row with ' + this.data[0][0] + ' == ' + keyValue + ' is deleted from ' + this.name);
    return 1;
}

DataTable.prototype.deleteRows = function (selectionCriterion, values)
{
    if(this.isView)
    {
        alert(this.name + ' is a view. It can not be modified directly. Only tables can be updated');
        return null;
    }
    var expr = selectionCriterion && selectionCriterion.getExpression(values); 
    var indexes = this.getRowIndexes(expr, values);
    debug(indexes.length + ' rows matched condition ' + expr.text + ' and are set to be deleted.'); 
    if(indexes.length == 0)
        return 0;
    var n = this.data.length;
    indexes.push(n); //a small trick to simplify the loop structure. Non exesting row is slated for deletion !!
    var newIdx = indexes[0]; //start shifting from the first one to be deleted
    var currentIdx = newIdx;
    for(var idx = 1; idx < indexes.length; idx++)
    {
        currentIdx++; //currentIdx is skipped, and start copying from the next
        var idxToBeDeleted = indexes[idx];
        while(currentIdx < idxToBeDeleted)
        {
            this.data[newIdx] = this.data[currentIdx];
            newIdx++;
            currentIdx++;
        }
    }
    var nbrDeleted = indexes.length - 1; 
    this.data.length = n - nbrDeleted; 
    return nbrDeleted;
}

DataTable.prototype.insertRow = function (values)
{
    if(this.isView)
    {
        alert(this.name + ' is a view. Data can not be inserted into a view');
        return 0;
    }
    var names = this.data[0];
    var row = new Array();
    for(var i = 1; i < this.nbrCols; i++)
    {
        var val = values[names[i]];
        if(!val)
        {
            if(this.defaultRow)
            {
                val = this.defaultRow[i];
                val = values[val] || val; //it can be a field name, or a constant
            }
            else
                val = '';
        }
        row[i] = val;
    }
    var keyName = this.data[0][0];
    var keyValue = values[keyName];
    if(!keyValue)
    {
        if(this.data.length == 1)
            keyValue = 1;
        else
            keyValue = parseInt(this.data[this.data.length-1][0], 10) + 1; // next key
        values[keyName] = keyValue; // put teh generated key in values
    }
    row[0] = keyValue;
    this.data.push(row);
    this.setDirty();
    debug('A row is added to ' + this.name + ' with keyColumn ' + keyName + ' set to ' + keyValue);
    return 1;
}

DataTable.prototype.updateRow = function (values)
{
    if(this.isView)
    {
        alert(this.name + ' is a view. Data can not be updated for a view');
        return null;
    }
    var columnName = this.data[0][0]; //primary key is always the first column
    var columnValue = values[columnName];
    if(!columnValue)
    {
        alert('No primary key in table ' + this.name + ' with value = ' + columnValue);
        return 0;
    }
    var i = this.getRowIndex(columnValue);
    //alert('going to change ' + this.name + ' with ' + columnName + '=' + columnValue + ' and rowId = ' + i);
    if(i == -1)
        return 0;
    var row = this.data[i];
    var names = this.data[0];
    for(var i = 1; i < this.nbrCols; i++)
    {
        var val = values[names[i]];
        if(val)
            row[i] = val;
    }
    this.setDirty();
    debug(this.name + ' modified for row with ' + names[0] + ' == ' + columnValue);
    return 1;
}

DataTable.prototype.saveRow = function (values)
{
    var key = values[this.data[0][0]];
    if(!key) 
        return this.insertRow(values);
    var ret = this.updateRow(values);
    if(ret) return ret;
    //key not found
    return this.insertRow(values);
}


DataTable.prototype.saveGrid = function (values, grid, saveOption)
{
    if(this.isView)
        raiseError(this.name + ' is a view. Data can not be updated for a view');
    if(!grid)
    {
        alert('Data not supplied for saving into ' + this.name  + '. Probably designer has forgotten to use submitForm=true, or there is a mismatch of grid name.');
        return;
    }
    var nbrRowsAdded = 0;
    var nbrRowsModified = 0;
    var nbrRowsDeleted = 0;
    
    var defaultRow = new Array();
    var fromNames = new Object();
    var copyFrom = new Array();
    var row = grid[0];
    var newRow;
    for(var i = 0; i < row.length; i++)
        fromNames[row[i]] = i;
    var val; 
    var names = this.data[0];     
    for(var i = 0; i < this.nbrCols; i++)
    {
        var name = names[i]
        var idx = fromNames[name];
        var val = null;
        if(!idx && idx != 0)
        {
            val = values[name];
            if(val)
                idx = -1;
            else if(this.defaultRow && this.defaultRow[i])
                idx = -2;
            else
                idx = -3;
        }
        defaultRow[i] = val;
        copyFrom[i] = idx;
    }
    var actionVal = null;
    var actionIdx = null;
    if(saveOption == 'bulkAction')
    {
        actionIdx = fromNames['bulkAction'];
        if(!actionIdx && actionIdx != 0)
            raiseError('Grid to be saved into ' + this.name + ' has saveOption set to "bulkAction". A field with name "bulkAction" should be defined on the client. refer to actionFieldName attribute of gridPanel in page.xml');
    }        
    else
        actionVal = saveOption;

    var keyRowExists = true;
    var keyIdx = fromNames[this.data[0][0]];
    if(!keyIdx && keyIdx != 0 )//add a key columns
    {
        keyIdx = grid[0].length;
        grid[0].push(this.data[0][0]);    
        keyRowExists = false;
    }

    //did lots of preparaion for copying rows. Hopefully, copying shouldn't be as complex as the preparation :-)
    for(var rowNbr = 1; rowNbr < grid.length; rowNbr++)
    {
        row = grid[rowNbr];
        var keyVal = keyRowExists ? row[keyIdx] : null;
        var action = actionVal || row[actionIdx];
        switch (action)
        {
        case 'add':
        case 'modify':
        case 'save':
            var toInsert = true;
            var newRow = null;
            if(keyVal) // possibly modify, except when key is supplied and you are to insert
            {
                j = this.getRowIndex(row[keyIdx]);
                if(j != -1) //new row
                {
                    toInsert = false;
                    newRow = this.data[j];
                }
            }
            else// key is to be generated
            {
                keyVal = parseInt(this.data[this.data.length-1][0], 10) + 1;
                row[keyIdx] = keyVal;
            }
            if(toInsert)
            {
                newRow = new Array();
                newRow[0] = keyVal;
                this.data.push(newRow);
                nbrRowsAdded++;
                for(var i = 1; i < this.nbrCols; i++)
                {
                    var idx = copyFrom[i];
                    var val;
                    if(idx >= 0)
                        val = row[idx];
                    else if( idx == -1)
                        val = defaultRow[i];
                    else if(idx == -2)
                    {
                        val = this.defaultRow[i];
                        val = values[val] || val;
                    }
                    else
                        val = '';
                    newRow.push(val)
                }
            }
            else
            {
                for(var i = 1; i < this.nbrCols; i++)
                {
                    var idx = copyFrom[i];
                    if(idx >= 0)
                        newRow[i] = row[idx];
                    else if(idx  == -1)
                        newRow[i] = defaultRow[i];
                }
                nbrRowsModified++;
            }
            break;
        case 'delete':
            this.deleteRow(null, row[keyIdx]);
            nbrRowsDeleted++;
            break;
        case '':
            break;
        default:
            raiseError(action + ' is not a save option for saveGrid for table ' + this.name);
        }
   }
   this.setDirty();
   debug(this.name + ' is mass modified. Number of rows added=' + nbrRowsAdded + '. Number of rows modified=' + nbrRowsModified +'. Number rows deleted=' + nbrRowsDeleted);
   return nbrRowsAdded + nbrRowsModified + nbrRowsDeleted;
}

DataTable.prototype.filter = function(fields, selectionCriterion, values, sortOnColumns, sortOrder, eliminateDuplicates)
{
    var expr = null;
    if(selectionCriterion)
        expr = selectionCriterion && selectionCriterion.getExpression(values); 
    var indexes = this.getRowIndexes(expr, values);
debug(' selected ' + indexes.length + ' rows from ' + this.name);
    if(sortOnColumns)
        indexes = this.sortIndexes(indexes, sortOnColumns, sortOrder, eliminateDuplicates);
    var rows = new Array();
    var data = this.getData();
    if(!fields)
    {
        rows[0] = data[0];
        for(var i = 0; i < indexes.length; i++)
            rows.push(data[indexes[i]]);
    }
    else
    {   
        var cols = new Array();
        var row = new Array();
        var hdr = data[0];
        fields = fields.split(',');
        for(var i = 0; i < fields.length; i++)
        {
            var k = this.columns[fields[i]];
            if(!k && k != 0)
            {
                alert(fields[i] + ' is not a column in ' + this.name);
                continue;
            }
            cols.push(k);
            row.push(hdr[k]);
        }
        rows.push(row);
        for(var i = 0; i < indexes.length; i++)
        {
            row = new Array();
            var dataRow = data[indexes[i]];
            for(var k = 0; k < cols.length; k++)
                row.push(dataRow[cols[k]]);
            rows.push(row);
        }
    }
    return rows;
}

DataTable.prototype.sortIndexes = function(indexes, columns, sortOrder, eliminateDuplicates)
{
    columns = columns.split(',');
    var m = columns.length;
    var colIdxes = new Array();
    for(var j = 0; j < m; j++)
    {
        var colName = columns[j];
        var k = this.getColumnIndex(colName);
        if(k < 0)
            raiseError(colName + ' is specified as a column name to be sorted. It is not a column in ' + this.name);
        colIdxes.push(k);
    }

    var data = this.getData();
    n = indexes.length;
    var vals = new Array(); //will have appended values of all fields and the index
    for(var i = 0; i < n; i++)
    {
        var row = data[indexes[i]];
        var val = '';
        for(var j = 0; j < m; j++)
        {
            var idx = colIdxes[j];
            val += row[idx] + '_';
        }
        val += i;
        vals.push(val);
    }
    vals.sort();
    var sortedIndexes = new Array();
    var lastVal = null;
    var j = 0
    var increment = 1;
    if(sortOrder == 'desc')
    {
        j = n -1;
        increment = -1;
    }
    for(var i = 0; i < n; i++)
    {
        var val = vals[j];
        var idxAt = val.lastIndexOf('_') + 1;
        var idx = parseInt(val.substring(idxAt, val.length),10);
        idx = indexes[idx];
        if(eliminateDuplicates)
        {
            val = val.substr(0,idxAt-1);
            if(!lastVal || lastVal != val)
                sortedIndexes.push(idx);
            lastVal = val;
        }
        else
            sortedIndexes.push(idx);
        j = j + increment;
    }

    return sortedIndexes;
}

DataTable.prototype.updateRows = function(columnsToUpdate, valuesToUpdate, selectionCriterion, values)
{
    if(this.isView)
        raiseError(this.name + ' is a view. It can not be updated. Only tables can be updated');

    var expr = selectionCriterion && selectionCriterion.getExpression(values); 
    var indexes = this.getRowIndexes(expr, values);
    if(indexes.length == 0)
        return 0;
    var cols = new Array();
    var vals = new Array();
    columnsToUpdate = columnsToUpdate.split(',');
    valuesToUpdate = valuesToUpdate.split(',');
    
    for(var i = 0; i < columnsToUpdate.length; i++)
    {
        var k = this.columns[columnsToUpdate[i]];
        if(!k && k != 0)
            raiseError(columnsToUpdate[i] + ' is not a column in ' + this.name);

        expr.setText(valuesToUpdate[i]);
        var val = expr.evaluate(values);
        cols.push(k);
        vals.push(val);
    }
    for(var i = 0; i < indexes.length; i++)
    {
        var row = this.data[indexes[i]];
        for(var j = 0; j < cols.length; j++)
            row[cols[j]] = vals[j];
    }
    this.setDirty();
    debug(indexes.length + ' rows from table ' + this.name + ' updated. Columnidexes = ' + cols + '. Values = ' + vals); 
    return indexes.length;
}

DataTable.prototype.toHtml = function()
{
    var str = '<table border="1"><theader><tr>';
    var data = this.getData();
    var row = data[0];
    var nbrCols = row.length;
    var nbrRows = data.length ;
    for(var j = 0; j < nbrCols; j++)
        str += '<th>' + row[j] + '</th>';
    str += '</tr></theader><tbody>';
    for(var i = 1; i < nbrRows; i++)
    {
        str += '<tr>';
        row = this.data[i];
        if(!row)
            continue;

        for(var j = 0; j < this.nbrCols; j++)
            str += '<td>' + row[j] + '</td>';
        str += '</tr>';
    }
    str += '</tbody></table>';
    return str;
}

function xlTableToGird(tbl)
{
    var grid = new Array();
    var rows = tbl.getElementsByTagName('Row');
    var n = rows.length;
    if(n == 0 )
        return grid;
    var row = rows[0];
    var cols = row.getElementsByTagName('Cell');
    var nbrCols = cols.length;
    if(nbrCols == 0)
        return grid;
    //create a typical exility grid: first row header and rest data
    var gridRow = new Array();
    grid.push(gridRow);
    var val, col;
    //header row will not have any empty cells. hence we can safrly assume continuous cells
    for(var i = 0; i < nbrCols; i++)
    {
        var hdr = valueOfXlCell(cols[i]);
        if(hdr)
            gridRow.push(hdr);
        else
        {
            nbrCols = gridRow.length;
            break;
        }
    }
    
    for(var j = 1; j < n; j++)
    {
        gridRow = new Array();
        grid.push(gridRow);
        row = rows[j];
        cols = row.getElementsByTagName('Cell');
        for(var i = 0; i < nbrCols; i++)
        {
            // Sep 25 2009 : Bug 708 - Problems in using xls data in local service - PTW (Start) : Aravinda
            if(gridRow.length >= nbrCols)
                break;
            // Sep 25 2009 : Bug 708 - Problems in using xls data in local service - PTW (End) : Aravinda
            var cell = cols[i];
            if(!cell)//empty cells in this row..
            {
                gridRow.push('');
                continue;
            }
            //if there are empty cells, xl does not write them. Instead, a 1 based index is set to ss:Index attribute
            idx = cell.getAttribute('ss:Index');
            if(idx)
            {
                idx = parseInt(idx, 10) - 1;
                if(idx >= nbrCols)//should not be there, but users could have put some junk!!
                    idx = nbrCols - 1;
                while(idx > i)
                {
                    gridRow.push('');
                    idx--;
                }
            }
            gridRow.push(valueOfXlCell(cell));
        }
   }
   return grid;  
}

DataTable.prototype.dataToXml = function()
{
    var data = this.getData();
    var xmlText = '';
    var n = data.length;
    var m = data[0].length;
    xmlText += this.rowToXml(data[0], m)+ this.defaultRowToXml(m);
    for(var rowId = 1; rowId < n; rowId++)
        xmlText += this.rowToXml(data[rowId], m);
    return xmlText;
}

DataTable.prototype.rowToXml = function(row, m)
{
    var xmlText = '<Row>';
    for(var colId = 0; colId < m; colId++)
    {
        var val = row[colId];
        if (val == null)
            val = '';
        xmlText += '<Cell><Data ss:Type="String">' + val + '</Data></Cell>';
    }
    return xmlText + '</Row>\n';
}

DataTable.prototype.defaultRowToXml = function(m)
{
    if(!this.defaultRow)
        return '';
    var xmlText = '<Row><Cell><Data ss:Type="String">default</Data></Cell>';
    for(var colId = 1; colId < m; colId++)
    {
        var val = this.defaultRow[colId];
        if (val == null)
            val = '';
        xmlText += '<Cell><Data ss:Type="String">' + val + '</Data></Cell>';
    }
    return xmlText + '</Row>\n';
}

DataTable.prototype.viewToXml= function()
{
    var xmlText = '<Row><Cell><Data ss:Type="String">' + this.name + '</Data></Cell><Cell><Data ss:Type="String">' + this.baseTable.name + '</Data></Cell></Row>';
    var nbrTables = this.joiningTables.length;
    var names = this.baseTable.getData()[0];
    for(var i = 0; i < nbrTables; i++)
    {
        var jt = this.joiningTables[i];
        var jtNames = jt.getData[0];
        xmlText += '<Row><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String">' 
                + jt.name 
                + '</Data></Cell><Cell><Data ss:Type="String">' 
                + names[this.primaryIndexes[i]]
                + '</Data></Cell><Cell><Data ss:Type="String">'
                + jt.getData()[0][this.joiningIndexes[i]]
                + '</Data></Cell><Cell><Data ss:Type="String">' 
                + this.originalColumnsToAdd
                + '</Data></Cell><Cell><Data ss:Type="String">' 
                + this.onlyMatchedRows[i]
                + '</Data></Cell></Row>';
    }
    return xmlText;
}

function valueOfXlCell(cell)
{
    if(!cell)
        return '';
    cell = cell.getElementsByTagName('Data');
    if(cell && cell[0] && cell[0].firstChild)
    {
        var data = cell[0].firstChild.data;
        var typ = cell[0].getAttribute('ss:Type');
        if(typ == 'DateTime')
            data = data.substr(0,10);
        return data;
    }
    return '';
}


function LocalService()
{
    this.steps = new Array();
}

LocalService.prototype.execute = function(dc)
{
    this.formatDc(dc, true);
    var stepSucceded = true;
    //load 'session variables'
    for(var a in dataStore.sessionVariables)
        dc.values[a] = dataStore.sessionVariables[a];
        
    if(this.steps)
    {
        for(var i = 0; i < this.steps.length; i++)
        {
            var step = this.steps[i];
            if(( step.onSuccess && !stepSucceded ) || (step.onFailure && stepSucceded) )
                continue;
            var condition = step.condition;
            if(condition && condition.evaluate(dc.values) == false)
            {
                stepSucceded = false;
                continue;
            }
            stepSucceded = step.execute(dc, stepSucceded);
            if(stepSucceded == null)
                break;
        }
    }
    if(this.name == 'login' || this.name.lastIndexOf('.login') == this.name.length - 6)
    {
        for(var a in dc.values)
        {
            if(a != 'serviceId')
                dataStore.sessionVariables[a] = dc.values[a];
        }
    }
    else if(this.name == 'logout' || this.name.lastIndexOf('.logout') == this.name.length - 7)
        dataStore.sessionVariables = new Object();
    this.formatDc(dc, false);
}

LocalService.prototype.formatDc = function(dc, forInput)
{
    for(var nam in dc.values)
    {
        var vt = dataDictionary.getValueType(nam, true);
        if(!vt)
        {
            if(nam.lastIndexOf('To') == nam.length - 2 
                || nam.lastIndexOf('Operator') == nam.length - 8 
                || nam.lastIndexOf('PageSize') == nam.length - 8 )
                vt = exilityValueTypes['text'];
            else
            {
                debug('Error: ' + nam + ' is a field name, but it is not defined in data dictionary.');
                vt = exilityValueTypes['text'];
            }
        }
        dc.values[nam] = forInput ? vt.parse(dc.values[nam]) : vt.format(dc.values[nam]);
    }
    
    // Dec 26 2010 : Bug 1895 - Pagination in Local Service - CPT (Start) : Aravinda
    window.paginationData = new Array();
    // Dec 26 2010 : Bug 1895 - Pagination in Local Service - CPT (End) : Aravinda
    for(var gridName in dc.grids)
    {
        var grid = dc.grids[gridName];
        var names = grid[0];
        var m = names.length;
        var n = grid.length;
        var vts = new Array();
        for(var i = 0; i < m; i++)
            vts.push(dataDictionary.getValueType(names[i]));
        var newGrid = new Array();
        newGrid.push(names);
        for(var i = 1; i < n; i++)
        {
            var row = grid[i];
            var newRow = new Array();
            for(var j = 0; j < m; j++)
                newRow.push(forInput ? vts[j].parse(row[j]) : vts[j].format(row[j]) ) ;
            newGrid.push(newRow); 
        }
		// Dec 26 2010 : Bug 1895 - Pagination in Local Service - CPT (Start) : Aravinda
		var pageSize = dc.values[gridName + 'PageSize'];
		if(pageSize)
		{
			if(newGrid.length >= pageSize)
			{
				var noOfPages = Math.ceil((newGrid.length - 1)/pageSize);
				for(var i = 0; i < noOfPages; i++)
				{
					var curTempGrid = new Array();
					for(var j = 1; j <= pageSize; j++)
					{
						if(((i * pageSize) + j) >= newGrid.length)
						{
							break;
						}
						curTempGrid.push(newGrid[((i * pageSize) + j)]);
					}
					window.paginationData[gridName+'_' + (i + 1)] = curTempGrid;
				}
				dc.values[gridName + 'TotalRows'] = newGrid.length - 1;
				newGrid = window.paginationData[gridName+'_1'];
				var newTempGrid = new Array();
				newTempGrid.push(names);
				for(var j = 0;j < window.paginationData[gridName+'_1'].length; j++)
					newTempGrid.push(window.paginationData[gridName+'_1'][j]);
				newGrid = newTempGrid;
			}
		}
		// Dec 26 2010 : Bug 1895 - Pagination in Local Service - CPT (End) : Aravinda
        dc.grids[gridName] = newGrid;
    }
}

LocalService.prototype.load = function(doc)
{
    this.name = doc.getAttribute('name');
    var step = doc.firstChild;
    if(!step)
        return;
    for(; step; step = step.nextSibling)
    {
        if(nodeToBeIgnored(step.nodeType))
            continue;
        var stepName = step.tagName;
        var functionName = stepName.charAt(0).toUpperCase() + stepName.substr(1,stepName.length-1) + 'Step';
        var serviceStep = null;
        try
        {
            serviceStep = eval(' new ' + functionName + '()');
        }
        catch(e)
        {
            raiseError(stepName + ' is not a valid step in local service');
        }
        this.steps.push(serviceStep);
        var m = step.attributes.length;
        for(var j = 0 ; j < m; j++)
        {
            var att = step.attributes[j];
            serviceStep[att.name] = att.value;
        }
        if(serviceStep.condition)
        {
            if(serviceStep.condition == 'onSuccess')
            {
               serviceStep.onSuccess = true;
               serviceStep.condition = null;
            }
            else if(serviceStep.condition == 'onFailure')
            {
               serviceStep.onFailure = true; 
               serviceStep.condition = null;
            }
            else
            {
                var expr = new Expression();
                expr.setText(serviceStep.condition);
                serviceStep.condition = expr;
            }
        }
        var child = step.firstChild;
        while(child && nodeToBeIgnored(child.nodeType))
            child = child.nextSibling;
        if(child)
        {
            if(child.nodeType == 4)//CDATA for a script
            {
                serviceStep.script = child.nodeValue;
            }
        //I am coding for selectionCriterion right now...
            else if(child.tagName == 'selectionCriterion')
            {
                var sc = new SelectionCriterion();
                serviceStep.selectionCriterion = sc;
                var condition = child.getAttribute('condition');
                if(condition)
                    sc.condition = condition;

                for(var c = child.firstChild; c; c = c.nextSibling)
                {
                    if(nodeToBeIgnored(c.nodeType))
                        continue;
                    var e = new Object();
                    sc.conditions.push(e);
                    var m1 = c.attributes.length;
                    for(var k = 0; k < m1; k++)
                    {
                        var p = c.attributes[k];
                        e[p.name] = p.value;
                    }
                }
            }
            else if(stepName == 'aggregate')
            {
                var aggregator = null;
                var cols = step.getElementsByTagName('column');
                var columns = new Array();
                serviceStep.columns = columns;
                var appendParsed = false;
                for(var k = 0; k < cols.length; k++)
                {
                    var col = cols[k];
                    var colType = col.getAttribute('aggregator');
                    var objectName = colType.charAt(0).toUpperCase() + colType.substr(1,colType.length-1) + 'Aggregator';
                    try{aggregator = eval('new ' + objectName + '();')}
                    catch(e){raiseError(colType + ' is not yet implemented as an aggragator.');}
                    aggregator.name = col.getAttribute('name');
                    var separator = col.getAttribute('separator');
                    if(separator)
                        aggregator.separator = separator;
                    columns.push(aggregator);
                    if(colType == 'append')//next one also has to be append
                    {
                        k++;
                        if(k == cols.length)
                            raiseError('Append aggregators have to be defined for two successive columns.' + aggregator.name + ' is an append aggregator, but it is the last column.');
                        col = cols[k];
                        colType = col.getAttribute('aggregator');
                        if(colType != 'append')
                            raiseError('Append aggregators have to be defined for two successive columns.' + aggregator.name + ' is an append aggregator, but next column is not an append aggregator.');
                        var ag = new AppendWorker();
                        columns.push(ag);
                        ag.aggregator = aggregator;
                        ag.name = col.getAttribute('name');
                        separator = col.getAttribute('separator');
                        if(separator)
                            ag.separator = separator;
                    }
                }
            }
            else
                raiseError((child.tagName || ('Child node for ' + stepName)) + ' is not yet implemented in local service.');
        }
    }
}

function StopStep()
{
    this.condition = null;
}

StopStep.prototype.execute = function(dc)
{
    return null;
}

function SetValueStep()
{
    this.condition = null;
    this.name = null;
    this.expression = null;
}

SetValueStep.prototype.execute = function(dc)
{
    var abortIfNameNotFound = true;
    var vt = dataDictionary.getValueType(this.name, abortIfNameNotFound);
    var expression = new Expression();
    expression.setText(this.expression);
    var val = expression.evaluate(dc.values);
    if( val == null)
        return false;
    dc.values[this.name] = val;
    return true;        
}

function ListStep()
{
    this.condition = null;
    this.name = null;
    this.values = null;
    this.fromFieldName = null;
}

ListStep.prototype.execute = function(dc)
{
    //just ensure that there is discipline in using colum nnames from data dictionary
    var abortIfNameNotFound = true;
    var vt = dataDictionary.getValueType(this.name, abortIfNameNotFound);
    var val = this.values || dc.values[this.fromFieldName];
    if(!val)
        val = '';
    dc.lists[this.name] = val.split(',');
    return true;        
}

function AppendToListStep()
{
    this.condition = null;
    this.name = null;
    this.expression = null;
}

AppendToListStep.prototype.execute = function(dc)
{
    var list = dc.lists[this.name];
    if(!list)
    {
        //just ensure that there is discipline in using colum nnames from data dictionary
        var abortIfNameNotFound = true;
        var vt = dataDictionary.getValueType(this.name, abortIfNameNotFound);
        list = new Array();
        dc.lists[this.name] = list;
    }
    var expression = new Expression();
    expression.setText(this.expression);
    var val = expression.evaluate(dc.values);
    if( val == null)
        return false;
    list.push(val);
    return true;        
}

function GridStep()
{
    this.condition = null;
    this.name = null;
    this.columns = null;
}

GridStep.prototype.execute = function(dc)
{
    var names = this.columns.split(',');
    var n = names.length;
    var lists = new Array();
    var grid = new Array();
    var row = new Array();
    var m = 0;
    for(var i = 0; i < n; i++)
    {
        var nam = names[i];
        var list = dc.lists[nam];
        if(!list)
            raiseError(nam + ' is being listed as a column for grid  ' + this.name +'. No value is set to this list.');
        if(m == 0)
            m = list.length;
        else if( m != list.length)
            raiseError(name + ' has ' + list.length + ' values in it but other columns have ' + m + ' values in them. All columns in a grid should have same number of values');
        lists.push(list);
        row.push(nam);
    }
    grid.push(row);
    for(var j = 0; j < m; j++)
    {
        row = new Array();
        for(var i = 0; i < n; i++)
            row.push(lists[i][j]);
        grid.push(row);
    }
    dc.grids[this.name] = grid;
    return true;        
}
function AddColumnStep()
{
    this.gridName = null;
    this.columnName = null;
    this.expression = null;
}

AddColumnStep.prototype.execute = function(dc)
{
    var grid = dc.getGrid(this.gridName);
    if(!grid)
        raiseError(this.gridName + ' not found in dc. You have used this grid name in an AddColumn Step.');
    var columnNames = grid[0];
    var nbrCols = columnNames.length;
    //save any dc.values wiht the same names as column names
    var savedValues = new Object();
    var valuesSaved = false;
    var val = null;
    for(var i = 0; i < nbrCols; i++)
    {
        var colName = columnNames[i];
        val = dc.getValue(colName);
        if(val || val == 0)
        {
            // May 04 2009 : Bug 468 -  Add COlumn Is not working. - Exility (Start) : Venkat    
            savedValues[colName] = val;
            // May 04 2009 : Bug 468 -  Add COlumn Is not working. - Exility (End) : Venkat 
            valuesSaved = true;
        }
    }   
    columnNames.push(this.columnName);
    var nbrRows = grid.length;
    var values = dc.values;
    var expr = new Expression();
    expr.setText(this.expression);
    for(var i = 0; i < nbrRows; i++)
    {
        var row = grid[i];
        for(var j = 0; j < nbrCols; j++)
        {
            values[columnNames[j]] = row[j];
        }
        // May 04 2009 : Bug 468 -  Add COlumn Is not working. - Exility (Start) : Venkat    
        row.push(expr.evaluate(values));
        // May 04 2009 : Bug 468 -  Add COlumn Is not working. - Exility (End) : Venkat 
    } 
    
    if(valuesSaved)
    {
        for(var name in savedValues)
            dc.values[name] = savedValues[name];
    }   
    return true;        
}

function LookupStep()
{
    this.condition = null;
    this.source = null;
    this.prefix = null;
    this.selectionCriterion = null;
}

LookupStep.prototype.execute = function(dc)
{
    return dataStore.getTable(this.source).copyRow(dc.values, this.prefix, this.selectionCriterion); 
}

function FilterStep()
{
    this.condition = null;
    this.name = null;
    this.source = null;
    this.columnNames = null;
    this.selectionCriterion = null;
    this.sortByColumns = null;
    this.sortOrder = 'asc';
    this.eliminateDuplicates = false;
}

FilterStep.prototype.execute = function(dc)
{
    var data = dataStore.getTable(this.source).filter(this.columnNames, this.selectionCriterion, dc.values, this.sortByColumns, this.sortOrder, this.eliminateDuplicates); 
    if(!data)
        return false;
    dc.grids[this.name] = data;
    return(data.length > 1)
}

function SaveStep()
{
    this.condition = null;
    this.table = null;
}

SaveStep.prototype.execute = function(dc)
{
    return dataStore.getTable(this.table).saveRow(dc.values);
}

function SaveGridStep()
{
    this.condition = null;
    this.table = null;
    this.grid = null;
    this.saveOption = 'bulkAction';
}

SaveGridStep.prototype.execute = function(dc)
{
    return dataStore.getTable(this.table).saveGrid(dc.values, dc.grids[this.grid], this.saveOption);
}

function DeleteStep()
{
    this.condition = null;
    this.table = null;
}

DeleteStep.prototype.execute = function(dc)
{
    return dataStore.getTable(this.table).deleteRow(dc.values, null);
}

function MassUpdateStep()
{
    this.condition = null;
    this.selectionCriterion = null;
    this.table = null;
    this.columnsToUpdate = null;
    this.valuesToUpdate = null;
}

MassUpdateStep.prototype.execute = function(dc)
{
    return dataStore.getTable(this.table).updateRows(this.columnsToUpdate, this.valuesToUpdate, this.selectionCriterion, dc.values);
}

function MassDeleteStep()
{
    this.condition = null;
    this.selectionCriterion = null;
    this.table = null;
}

MassDeleteStep.prototype.execute = function(dc)
{
    return dataStore.getTable(this.table).deleteRows(this.selectionCriterion, dc.values);
}

function MessageStep()
{
    this.condition = null;
    this.name = null;
    this.parameters = null;
}

MessageStep.prototype.execute = function(dc)
{
    var msg = messagesFromXml[this.name];
    if(!msg)
        raiseError("Error:" + this.name + " is used as a message name, but it is not defined.\nParameter supplied at run time :" + this.parameters);
    var txt = msg.text;
    if(this.parameters)
    {
        var params = this.parameters.split(",");
        for(var i = 0; i < params.length; i++)
        {
            var paramName = '@'+ (i+1);
            var paramValue = params[i];
            var val = dc.values[paramValue];
            if(val)
                paramValue = val;
            txt =  txt.replace(paramName, paramValue);
        }
    }
    dc.addMessage(msg.severity, txt);
}

function AggregateStep()
{
    this.condition = null;
    this.groupByColumns = null;
    this.columns = null;//of aggregateColumns
    this.gridName = null;
    this.newGridName = null;
}

AggregateStep.prototype.execute = function(dc)
{
    if(!this.gColumns)
        this.gColumns = this.groupByColumns.split(',');
    var grid = dc.grids[this.gridName];
    if(!grid)
        raiseError(this.gridName + ' is not found as a grid. Aggregate step is aborted');
    var row = grid[0];
    var newGrid = new Array();
    var newRow = new Array();
    newGrid.push(newRow);
    var nbrNewCols = this.columns.length;
    for(var j = 0; j < nbrNewCols; j++)
        newRow.push(this.columns[j].name);
    var newGridName = this.newGridName || this.gridName;
    dc.grids[newGridName] = newGrid;
    
    var n = grid.length;
    if( n < 2)
        return 0;
    var row = grid[0];
    var nbrCols = row.length;
    var indexes = new Object();
    for(var j = 0; j < nbrCols; j++)
        indexes[row[j]] = j;
    var groupIndexes = new Array();
    var idx;
    var nbrGroups = this.gColumns.length;
    for(var j = 0; j < nbrGroups; j++)
    {
        idx = indexes[this.gColumns[j]];
        if(!idx && idx != 0)
            raiseError(this.gColumns[j] + ' is specified as a groupBy field for aggregating grid ' + this.gridName + '. This column is not found in the grid');
        groupIndexes.push(idx);
    }
        
    var colIndexes = new Array();
    for(var j = 0; j < nbrNewCols; j++)
    {
        idx = indexes[newRow[j]];
        if(!idx && idx != 0)
            raiseError(newRow[j] + ' is specified as an output column for aggregating grid ' + this.gridName + '. This column is not found in the grid');
        colIndexes.push(idx);
    }
    var val;
    var lastValues = new Array(nbrGroups);
    for(var j = 0; j < nbrGroups; j++)
        lastValues[j] = null;

    for(var i = 1; i <= n; i++)
    {
        row = grid[i];
        if(i < n)
        {
            //if new group, write the accumulated row
            var changed = false;
            for(var j = 0; j < nbrGroups; j++)
            {
                val = row[groupIndexes[j]];
                var lastVal = lastValues[j];
                if(lastVal == null)
                {
                    lastValues[j] = val;
                    continue;
                }
                if(lastVal == val)
                    continue;
                lastValues[j] = val;
                changed = true;
            }
        }
        if(changed || i == n)
        {
            newRow = new Array();
            newGrid.push(newRow);
            for(j = 0; j < nbrNewCols; j++)
                newRow.push(this.columns[j].getValue());
            if(i == n)
                break;
        }
        for(j = 0; j < nbrNewCols; j++)
            this.columns[j].accumulate(row[colIndexes[j]]);
    }
}

function AggregateColumn()
{
    this.name = null;
    this.aggregator = null;
    this.separator = null;
}

function ScriptStep()
{
    this.condition = null;
    this.script = null;
}

ScriptStep.prototype.execute = function(dc)
{
    eval(this.script);
    return 1;  
}


function Expression()
{
    this.text = null;
    this.value = null;
    this.parts = null;
    this.startsWithVariable = false;
}

Expression.prototype.setText = function(text)
{
    if(!text)
        return;
    text = text.toString();
    this.text = text;
    this.parts = new Array();
    this.value = null;
    this.startsWithVariable = false;
    this.lastExpression = null;
    this.lastValue = null;

    var n = text.length;
    var operandExpected = true;
    var unaryParsed = false;
    var nbrOpenBrackets = 0;
    var nbrBracketsBeforeFunction = 0;
    var nbrOfCommasParsed = 0;
    var nbrOfCommasExpected = 0;
    var functionStarted = false;
    var existenceParsed = false;
    var startAt = 0;
    var i = 0;
    while(i < n)
    {
        var c = text.charAt(i);
        switch(c)
        {
        case ' ':
        case '\t':
            break;
        case '(':
        case '[':
            if(!operandExpected)
                this.raiseError(i, c + ' can be put only before an operand.' );
            nbrOpenBrackets++;
            break;
            
        case ')':
        case ']':
            if(operandExpected)
                this.raiseError(i, 'Open bracket not valid here.');
            if(!nbrOpenBrackets)
                this.raiseError(i, 'No matching open bracket.');
            nbrOpenBrackets--;
            if(functionStarted)
            {
                if(nbrOpenBrackets == nbrBracketsBeforeFunction)
                {
                    if(nbrOfCommasParsed != nbrOfCommasExpected)
                        this.raiseError(i, ' Function requires ' + (nbrOfCommasExpected + 1) + ' parameters.');
                    functionStarted = false;
                }
            }
            break;
            
        case '-':
            if(operandExpected)
            {
                if(unaryParsed)
                    this.raiseError(i, c + ' unary negative sign not valid here.');
                unaryParsed = true;
                break;
            }
            operandExpected = true;
            break;

        case '!':
            if(text.charAt(i+1) == '=')
            {
                if(operandExpected)
                    this.raiseErr(i);
                i++;
                operandExpected = true;
                break;
            }
            if(!operandExpected || unaryParsed)
                this.raiseErr(i);
            unaryParsed = true;
            break;
            
        case '+':
        case '*':
        case '/':
        case '^':
            if(operandExpected)
                this.raiseError(i, c + ' is not valid here.');
            operandExpected = true;
            break;
            
        case '<':
        case '>':
            if(operandExpected)
                this.raiseError(i, c + ' is not valid here.');
            operandExpected = true;
            if(text.charAt(i+1) == '=')
                i++;
            break;
            
        case '=':
        case '|':
        case '&':
            if(operandExpected)
                this.raiseError(i, c + ' is not valid here.');
            i++;
            if(text.charAt(i) != c )
                this.raiseError(i, c + ' is not valid. Use ' + c + c + ' instead.');
            operandExpected = true;
            break;
            
        case "'":
        case '"':
            if(!operandExpected)
                this.raiseError(i, 'Constant found where an operator is expected.');
            operandExpected = false;
            var t = text.substring(i+1, n);
            var j = t.indexOf(c);
            if(j < 0)
                this.raiseError(n-1, ' No matching closing quote found for ' + c);
            i += j + 1;
            operandExpected = false;
            unaryParsed = false;
            break;

        case ',':
            if(!functionStarted)
                this.raiseError(i, ', is no valid outside of a funciton.');
            if(operandExpected)
                this.raiseError(i, ', is no valid here. Operand expected.');
            if(nbrOfCommasExpected == nbrOfCommasParsed)
                this.raiseError(i, 'function expects only ' + (nbrOfCommasExpected + 1) + ' parameters.');
            nbrOfCommasParsed++;
            operandExpected = true;
            break;
        
        default:
            if(!operandExpected)
                this.raiseError(i, 'Operator is expected here.');
                
            operandExpected = false;
            unaryParsed = false;
            var cd = text.charCodeAt(i);
            if(cd > 47 && cd < 58) //c >= '0' && c <=  '9'
            {
                var dotParsed = false;
                while(++i < n)
                {
                    c = text.charAt(i);
                    cd = text.charCodeAt(i);
                    if(cd > 47 && cd < 58)
                        continue;
                    if(c == '.' && !dotParsed)
                    {
                        dotParsed = true;
                        continue;
                    }
                    break;
                }
                i--; //we had already read the next character
                break;
            }
            if(c == '?')
            {
                i++;
                c = text.charAt(i);
                cd = text.charAt(i);
                existenceParsed = true;
            }
            else
                existenceParsed = false;
            
            if((cd > 96 && cd < 123) || (cd > 64 && cd < 91 ) || c == '_')//a-z or A-Z or _
            {
                //it is a variable
                var variableStartedAt = i;
                
                while(++i < n)
                {
                    c = text.charAt(i);
                    var cd = text.charCodeAt(i);
                    if((cd > 96 && cd < 123) || (cd > 64 && cd < 91) || c == '_' || (cd > 47 && cd < 58) || c == '.')
                        continue;
                    else
                        break;
                }
                var variableName = text.substring(variableStartedAt, i);
                if(variableName == 'contains' || variableName == 'startsWith')
                {
                    if(functionStarted)
                        this.raiseError(i, 'function can not be used within another function.');
                    if(existenceParsed)
                        this.raiseError(i, '? is valid for variables. Not for functions.');
                    //is there a bracket?
                    while(i < n)
                    {
                        if(c == '(')
                            break;
                        if(c != ' ' && c != '\t')
                            this.raiseError(i, variableName + ' is a function. It shoudl be followed with (.' );
                        i++;
                        c = text.charAt(i);
                        continue;
                    }
                    if(i == n)
                            this.raiseError(i, variableName + ' is a function. It shoudl be followed with (.' );
                    functionStarted = true;
                    nbrBracketsBeforeFunction = nbrOpenBrackets;
                    nbrOpenBrackets++;
                    nbrOfCommasParsed = 0;
                    operandExpected = true;
                    nbrOfCommasExpected = 1; //as of now both functions have this..
                }
                else if(variableName == 'true' || variableName == 'false')
                {
                    if(existenceParsed)
                        this.raiseError(i, '? is valid for variables. not for true/false.');
                    i--;
                }
                else
                {
                    var t = variableName.indexOf('.');
                    if(t >= 0)
                    {
                        if(t != 3 || variableName.substr(0,3) != 'row')
                            this.raiseError(i, 'Variable can contain only "row." as its prefix.');
                        if(variableName.lastIndexOf('.') != t)
                            this.raiseError(i, 'Variable can not contain "." more than once. Only "row." canbe used as prefix.');
                    }
                    if(variableStartedAt == 0)
                        this.startsWithVariable = true;
                    else
                        this.parts.push(text.substring(startAt, variableStartedAt));
                    if(existenceParsed)
                        this.parts.push('?' + variableName);
                    else
                        this.parts.push(variableName);
                    startAt = i;
                    i--;
                }
                break;
            }
            if(existenceParsed)
                this.raiseError(i, '? should be immediately followed by a variable name, with no spaces in between.');
            
            this.raiseError(i, c + ' is not used in expressions.');
        }
        i++;
    }
    //was there anything at all?
    if(operandExpected)
        this.raiseError(text.length - 1, 'Expression abruptly ended when I was expecting an operand.');
        
    if(nbrOpenBrackets)
        this.raiseError(text.length - 1, (nbrOpenBrackets == 1 ? 'A bracket' : (nbrOpenBrackets + ' brackets')) + ' not closed.');
    if(this.parts.length == 0) //no variables
    {
        this.value = eval(text.valueOf());
        this.lastExpression = text;
        this.lastValue = this.value;
    }
    else 
    {
        if(startAt != n)
            this.parts.push(text.substring(startAt, n));
    }
}

Expression.prototype.raiseError = function(i, txt)
{
    var msg;
    if(i < 0) //during evaluation
        msg = 'Error while evaluating evaluating expression : ' + this.text + '\nError : '
    else
        msg = 'Syntax error in expression : ' + this.text + '\n error at :' + this.text.substr(0,i+1);
    if(txt)
        msg += '\n' + txt;
    alert(msg);
    throw(new SyntaxError(msg));
}

Expression.prototype.format = function(val)
{
    var v = trim(val.toString());
    var n = v.length;
    if(n == 0)
        return '';
    var t = typeof(val);
    if(t == 'number' || t == 'boolean' || val instanceof Boolean || val instanceof Number || v == 'true' || v == 'false')
        return v;

    var dotParsed = false;
    for(var i = 0; i < n; i++)
    {
        var c = v.charAt(i);
        var cd = v.charCodeAt(i);
        if(c == '-' )
        {
            if(i == 0)
                continue;
            return "'" + v +"'";
        }
        if(cd > 47 && cd < 58)
            continue;
        if(dotParsed || c != '.')
            return "'" + v + "'";
    }
    return v;
}

Expression.prototype.getFormattedValue = function(name, values)
{
    var val;
    if(name.charAt(0) == '?')
    {
        name = name.substr(1, name.length-1);
        val = values[name];
        if(typeof(val) == 'undefined')
            return 'false';
        else
            return 'true';
     }
    val = values[name];
    if(typeof(val) == 'undefined')
        this.raiseError(-1, 'Undefined Variable: ' + name + ' does not have a value.');
    return dataDictionary.getValueType(name).formatForExpr(val);
}

Expression.prototype.evaluate = function(values)
{
    if(this.value != null)
        return this.value;
    var isVariable = this.startsWithVariable;
    var txt = '';
    for(var i = 0; i < this.parts.length; i++)
    {
        txt += ' ';
        var val;
        if(isVariable)
            txt += this.getFormattedValue(this.parts[i], values);
        else
            txt += this.parts[i];
            
        isVariable = !isVariable; //alternate parts are variables
    }
    this.lastExpression = txt;
    this.lastValue = txt;
    return eval(txt);
}

function contains(a, b)
{
    if(a.indexOf(b) >= 0)
        return true;
    return false;
}

function startsWith(a, b)
{
    if(a.indexOf(b) == 0)
        return true;
    return false;
}

function raiseError(msg)
{
    alert(msg);
    throw new Error(msg);
}

function SelectionCriterion()
{
    this.condition = null;
    this.conditions = new Array()
}
/* filter field operators
        OPERATOR_ANY = 0;
        OPERATOR_EQUAL = 1;
        OPERATOR_STARTS_WITH = 2;
        OPERATOR_CONTAINS = 3;
        OPERATOR_GREATER_THAN = 4;
        OPERATOR_LESS_THAN = 5;
        OPERATOR_BETWEEN = 6;
*/

SelectionCriterion.prototype.getExpression = function(values)
{
    var exp = new Expression();
    var n = this.conditions ? this.conditions.length : 0;
    var txt = '';
    var prefix = ' ';
    for(var i = 0; i < n; i++)
    {
        var c = this.conditions[i];
        var val = values[c.fieldName];
        if(!val)
            continue;
        val = exp.format(val);
        var name = 'row.' + c.columnName;
        if(c.comparator == 'filter')
        {
            var cn = values[c.fieldName+'Operator'];
            if(!cn)
                continue;
            txt += prefix;
            if(cn == 1)
                txt += name + ' == ' + val;
            else if(cn == 2)
                txt += 'startsWith(' + name + ',' + val + ')';
            else if(cn == 3)
                txt += 'contains(' + name + ',' + val + ')';
            else if(cn == 4)
                txt += name + ' > ' + val;
            else if(cn == 5)
                txt += name + ' < ' + val;
            else if(cn == 6)
            {
                txt += name + ' >= ' + val;
                val = exp.format(values[c.fieldName+'To']);
                txt += ' && ' + name + ' <= ' + val;
            }
        }
        else
        {
            txt += prefix;
            if(c.comparator == 'startsWith' || c.comparator == 'contains')
                txt += c.comparator + '(' + name +',' + val + ')';
            else
                txt += name + comparators[c.comparator] + val;
        }
        prefix = ' && ';
    }

    if(!txt && !this.condition)
        return null;
        
    if(this.condition)
    {
        if(txt)
            txt =  this.condition +  ' && ' + txt ;
        else
            txt = this.condition;
    }
    exp.setText(txt);
    return exp;
}

var comparators = new Object();
comparators['equalTo'] = ' == ';
comparators['lessThan'] = ' < ';
comparators['greaterThan'] = ' > ';
comparators['lessThanOrEqualTo'] = ' <= ';
comparators['greaterThanOrEqualTo'] = ' >= ';
comparators['notEqualTo'] = ' != ';

// this part needs to be generalized befoer putting to production....
var dataStore = new DataStore();
var dataDictionary = new DataDictionary();
var dataTypesFromXml = new Object(); //dataTypes.js has them from .js file. Those are to be eliminated later..
var messagesFromXml = new Object();
var resourceFolder = exilParms.localResourceFolder || PM.exilparms.localResourceFolder || 'WEB-INF/Resource/';

function loadMessages(doc)
{
    var msgs = doc.getElementsByTagName('messages')[0].getElementsByTagName('message');
    for(var i = 0; i < msgs.length; i++)
    {
        var msgEle = msgs[i];
        var msg = new Object();
        msg.name = msgEle.getAttribute('name');
        msg.severity = msgEle.getAttribute('severity');
        msg.text = msgEle.getAttribute('text');
        messagesFromXml[msg.name] = msg;
    }
    //alert(msgs.length + ' messages loaded.');
}

function loadDataStore(doc)
{
	dataStore.loadTables(doc);
}


function DataDictionary()
{
    this.elements = new Object();
    this.getValueType = function(name, beTolerant)
    {
        var vt = this.elements[name];
        if(vt)
            return vt;
        if(beTolerant)
            return null;
        raiseError('Error:' + name +' is not found in data dictionary. Application can not be started.');
    }
}


function loadDataDictionaries(filesText)
{
    var lines = filesText.split('\n');
    for(var i = 0; i < lines.length; i++)
    {
        var line = lines[i];
        if(line.indexOf('201:') != 0)
            continue;
        if(line.lastIndexOf('FILE') != line.length - 5)
            continue;
        k = line.lastIndexOf('.xml');
        if( k < 0)
            continue;
        var fileName = line.substring(5,k+4);
        var url = resourceFolder + '/dictionary/' + fileName;
        debug('Going to load elements from file ' + url);
        var doc = getLocalResource(url, true)
        loadADictionary(doc);
    }

}
function nodeToBeIgnored(nodeType)
{
    return (nodeType != 1 && nodeType != 4); //elements and cdata are fine..
}

function loadADictionary(doc)
{
    var groupsEle = doc.getElementsByTagName('groups')[0];
    var nbrGroups = 0;
    var nbrElements = 0; 
    var groups = groupsEle.getElementsByTagName('dataGroup');
    var n = groups.length;
    for(var i =0; i < n; i++)
    {
        var group = groups[i];
        var groupName = group.getAttribute('name');
        var eles = group.getElementsByTagName('elements')[0].getElementsByTagName('dataElement');
        var m = eles.length;
        for(var j = 0; j < m; j++)
        {
            var ele = eles[j];
            var eleName = ele.getAttribute('name');
            var dataType = ele.getAttribute('dataType');
            var valueType = dataTypesFromXml[dataType];
            if(!valueType)
                raiseError(eleName + ' in group ' + groupName + ' has a data type of ' + dataType + '. this is not defined in dataTypes.xml');
            if(dataDictionary.elements[eleName])
                raiseError(eleName + ' has a duplicate definition in dataDictionary');
            dataDictionary.elements[eleName] = valueType;
        }
        nbrElements += m;
    }
    debug('Data dictionary loaded with ' + nbrElements + ' elements from ' + n + ' groups.');
}

function loadDataTypes(doc)
{
    var dataTypes = doc.firstChild;
    while(nodeToBeIgnored(dataTypes.nodeType))
        dataTypes = dataTypes.nextSibling;
    var nbr = 0;
    for(var dataType = dataTypes.firstChild; dataType; dataType = dataType.nextSibling)
    {
        if (nodeToBeIgnored(dataType.nodeType))
            continue;
        nbr++;
        var valueType = dataType.tagName;
        valueType = valueType.substr(0,valueType.length-8); //knockoff dataType at the end of th tag
        valueType = exilityValueTypes[valueType];
        if(!valueType)
            raiseError(dataType.tagName + ' is not a valid value type.');
        dataTypesFromXml[dataType.getAttribute('name')] = valueType;
    }
    debug(nbr + ' data types loaded.');
}

function TextValueType()
{
    this.xlType = 'String';
    this.parse = function(val){return val;}
    this.formatForExpr = function(val){return "'" + val + "'"}
    this.format = function(val){return val;}
}

function IntegralValueType()
{
    this.xlType = 'Number';
    this.parse = function(val){if(!val) return null; return parseInt(val,10);}
    this.formatForExpr = function(val){val.toString()}
    this.format = function(val){if(val == null) return ''; return val.toString();}
}

function DecimalValueType()
{
    this.xlType = 'Number';
    this.parse = function(val){if(!val) return null; return parseFloat(val);}
    this.formatForExpr = function(val){val.toString();}
    this.format = function(val){if(val == null) return ''; return val.toString();}
}

function DateValueType()
{
    this.xlType = 'DateTime';
    this.parse = function(val){return new Date(val.substr(0,10));}
    this.formatForExpr = function(val){if(!val)return "''"; return "'" + dateToYmd(val) + "'";}
    this.format = function(val){if(val) return dateToYmd(val); return '';}
}

function BooleanValueType()
{
    this.xlType = 'Boolean';
    this.parse = function(val){if (val) return true; else return false;}
    this.formatForExpr = function(val){if (val) return 'true'; return 'false';}
    this.format = function(val){if (val) return '1'; return '0';}
}

var exilityValueTypes = new Object();
exilityValueTypes['text'] = new TextValueType();
exilityValueTypes['integral'] = new TextValueType();
exilityValueTypes['decimal'] = new TextValueType();
exilityValueTypes['date'] = new TextValueType();
exilityValueTypes['boolean'] = new TextValueType();


function dateToYmd(dat)
{
    var mm = dat.getMonth();
    if(mm < 10)
        mm = '0' + mm;
    var dd = dat.getDate();
    if(dd < 10)
        dd = '0' + dd;
    return  dat.getFullYear() + '-' + mm + '-' + dd;  
}

function SumAggregator()
{
    this.value = 0;
}

SumAggregator.prototype.accumulate = function(val)
{
    // Apr 29 2009 : Bug 466 -  Sum, Average and Append is not working in Local Service. - Exility (Start) : Venkat    
    if(val)
        this.value += parseInt(val);
    // Apr 29 2009 : Bug 466 -  Sum, Average and Append is not working in Local Service. - Exility (End) : Venkat 
}

SumAggregator.prototype.getValue = function()
{
    var val = this.value; 
    this.value = 0;
    return val;
}

SumAggregator.prototype.reset = function()
{
    this.value = 0;
}

function AverageAggregator()
{
    this.value = 0;
    this.count = 0;
}

AverageAggregator.prototype.accumulate = function(val)
{
    if(val || val == 0)
    {
        // Apr 29 2009 : Bug 466 -  Sum, Average and Append is not working in Local Service. - Exility (Start) : Venkat    
        this.value += parseInt(val);
        // Apr 29 2009 : Bug 466 -  Sum, Average and Append is not working in Local Service. - Exility (End) : Venkat 
        this.count++;
    }
}

AverageAggregator.prototype.getValue = function()
{
    if(!this.count)
        return 0;
    var val = this.value/this.count; 
    this.value = 0;
    this.count = 0;
    return val;
}

AverageAggregator.prototype.reset = function()
{
    this.value = 0;
    this.count = 0
}

function ConcatAggregator()
{
    this.value = '';
    this.separator = ',';
}

ConcatAggregator.prototype.accumulate = function(val)
{
    if(val == null)
        return;
    if(this.value)
        this.value += this.separator;
    this.value +=  val;
}

ConcatAggregator.prototype.getValue = function()
{
    var val = this.value;
    this.value = '';
    return val;
}

ConcatAggregator.prototype.reset = function()
{
    this.value = '';
}

function MinAggregator()
{
    this.value = null;
}

MinAggregator.prototype.accumulate = function(val)
{
    if(val == null)
        return;
    if(this.value == null || val < this.value)
        this.value = val;
}

MinAggregator.prototype.getValue = function()
{
    var val = this.value;
    this.value = null;
    return val;
}

MinAggregator.prototype.reset = function()
{
    this.value = null;
}

function MaxAggregator()
{
    this.value = null;
}

MaxAggregator.prototype.accumulate = function(val)
{
    if(val == null)
        return;
    if(this.value == null || val > this.value )
        this.value = val;
}

MaxAggregator.prototype.getValue = function()
{
    var val = this.value;
    this.value = null;
    return val;
}

MaxAggregator.prototype.reset = function()
{
    this.value = null;
}


function FirstAggregator()
{
    this.value = null;
}

FirstAggregator.prototype.accumulate = function(val)
{
    if(val != null &&  this.value == null)
        this.value = val;
}

FirstAggregator.prototype.getValue = function()
{
    var val = this.value;
    this.value = null;
    return val;
}

FirstAggregator.prototype.reset = function()
{
    this.value = null;
}

function LastAggregator()
{
    this.value = null;
}

LastAggregator.prototype.accumulate = function(val)
{
    if(val != null)
       this.value = val;
}

LastAggregator.prototype.getValue = function()
{
    var val = this.value;
    this.value = null;
    return val;
}

LastAggregator.prototype.reset = function()
{
    this.value = null;
}

function AppendAggregator()
{
    this.value = null;
    this.separator = '-';
}

AppendAggregator.prototype.accumulate = function(val)
{
    this.value = val;
}

AppendAggregator.prototype.getValue = function()
{
    this.value = null;
    return '';
}

AppendAggregator.prototype.reset = function()
{
    this.value = null;
}

function AppendWorker()
{
    this.value = null;
    this.separator = ';';
}

AppendWorker.prototype.accumulate = function(val)
{
    var v = this.aggregator.value;
    if(!v)
        return;
    if(this.value)
        this.value += this.separator;
    // Apr 29 2009 : Bug 466 -  Sum, Average and Append is not working in Local Service. - Exility (Start) : Venkat     
    if(this.value == null)    
        this.value = v + this.aggregator.separator + val;
    else    
        this.value += v + this.aggregator.separator + val;
    // Apr 29 2009 : Bug 466 -  Sum, Average and Append is not working in Local Service. - Exility (End) : Venkat     
}

AppendWorker.prototype.getValue = function()
{
    var val = this.value;
    this.value = null;
    return val;
}

AppendWorker.prototype.reset = function()
{
    this.value = null;
}
