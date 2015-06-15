var GridPanel = function ()
{
    ListOrGridTable.call(this);
    //what is the internal key field name that is the key to this row? Normally, this is a hidden field
    // If you specify this, you MUST include a field with this name as an element of this grid
    this.idFieldName = null;

    //what is that all important field that a user sees as the key on the grid? 
    // This has relevance only if rows can be added. If user adds a row, but leaves all fields empty, then 
    // she does not expect us to add that row. keyField is used as THE field that determines if she entered data to this row or not
    this.keyFieldName = null;

    // if you use bulk action on the server, you have to track what should be done to each of the row.
    // if a row is not touched, it should not be modified, if it is touched, it should be modified, if it is added here,
    // it has to be inserted. Exility manages to set the value of the actionFieldName appropriately to take care of this.
    this.actionFieldName = null;

    // is there one ot more columns, whose values should be unique across all rows? If two columns together have to be unique,
    // specify them as comma separated fields. In case you have more than one such constraint, put then  semicolon separated
    // for example uniqueColumns = "col1,col2;col5,col6,col9"
    this.uniqueColumns = null; // revisit: this has to be two dimensional array.

    this.minRows = 0;
    this.maxRows = 0;
};

GridPanel.prototype = new ListOrGridTable;

GridPanel.prototype.removeTableRows = function (toDelete)
{
    var nbrDeleted = 0;
    var n = this.grid.length;
    for (var i = 1; i < n; i++)
    {
        var aRow = this.grid[i];
        if (!aRow)
            continue;
        if ((toDelete && aRow.isDeleted) || (!toDelete && !aRow.isDeleted))
            continue;
        var tr = this.P2.doc.getElementById(this.name + i);
        var obj = this.P2.doc.getElementById(this.name + '_' + this.name + 'Delete' + '__' + i);
        var f;
        if (obj.checked)
        {
            var result = true;
            f = this.functionBeforeDeleteRow;
            if (f)
            {
                if(f.indexOf('(') >= 0){
                    eval('result = this.P2.win.' + f);
                	
                }else{
                	result = this.P2.win[f]();
                } 
                if (result) return;
            }
            result = this.deleteRow(obj, tr, nbrDeleted > 0);
            if (!result)
            {
                if (e && e.preventDefault)
                    e.preventDefault();
            }
            else
            {
            	f = this.functionAfterDeleteRow;
                if (f)
                {
                    if(f.indexOf('(') >= 0){
                        eval('result = this.P2.win.' + f);
                    	
                    }else{
                    	result = this.P2.win[f]();
                    } 
                    if (result == false) return;
                }
                nbrDeleted++;
            }
        }
    }
};


// method invoked when checkbox of a row is modified.
// either remove an empty row or simple modify the bulkaction field.
GridPanel.prototype.bulkCheckAction = function (obj, colName)
{
    var field = this.columns[colName];
    //alert(colName+" colName="+field.name);
    var val = (obj.checked) ? '1' : '0';
    for (var i = 1; i < this.grid.length; i++)
    {
        if (this.grid[i])
        {
            var id = this.getObjectId(field.name, i);
            obj = this.P2.doc.getElementById(id);
            field.setValueToObject(obj, val);
            this.P2.fieldChanged(obj, field.name, false);
        }
    }
};

GridPanel.prototype.validate = function ()
{
    var panellabel = this.panelName;

    var ele = this.P2.doc.getElementById(this.panelName + "Label");
    if (ele)
        panellabel = ele.firstChild.nodeValue;

    var tableRows = this.tableBodyObject.childNodes;
    for (var rowCtr = 0; rowCtr < tableRows.length; rowCtr++)
    {
        var currentRow = tableRows[rowCtr];
        if (currentRow.style.display == 'none')
            continue;

        if (rowCtr % 2)
            currentRow.className = 'row1';
        else
            currentRow.className = 'row2';
    }

    //min/max rows
    if (this.minRows || this.maxRows)
    {
        var n = this.countActiveRows();
        if (this.minRows && n < this.minRows)
        {
            var e = new ExilityError('At least ' + this.minRows + ' rows required for the grid ' + panellabel + '.');
            e.render();
            throw (e);
        }
        if (this.maxRows && n > this.maxRows)
        {
            var e = new ExilityError('A maximum of ' + this.minRows + ' rows allowed for the grid ' + panellabel + '.');
            e.render();
            throw (e);
        }
    }
    this.validateUniqueColumns();
};

GridPanel.prototype.focussed = function (obj)
{
    var idx = this.getRowNumber(obj);
    if (idx)
        this.currentRow = idx;
};

//validateUniqueColumns() : see if a cell or a combination of cells across rows are unique
// this validation facilitates checking a particular field or a combination of field values to be unique
// across the rows in a table.
// User specifies the column names in exilUniqueColumns tag for table element as comma separated.
// exilUniqueColumns='field1,field2;field3,field4' means that there are two constraints. 
// field1+field2 have to be unique aswell as field3+field4.
// algorithm used is : form a value for each row by concatenating values of the fields that vae to be unique
//  check whether this value is unique.

GridPanel.prototype.validateUniqueColumns = function ()
{
    //debug("GridPanel.validateUniqueColumns() tableName=" + this.name + " uniqueColumns=" + this.uniqueColumns);
    // nothing to validate
    if (!this.uniqueColumns)
        return true;
    if (!this.uniqeColumnArrays)
    {
        this.uniqeColumnArrays = new Array();
        var rows = this.uniqueColumns.split(';');
        for (var i = 0; i < rows.length; i++)
            this.uniqeColumnArrays.push(rows[i].split(','));
    }

    for (var i = 0; i < this.uniqeColumnArrays.length; i++)
        this.validateOneUniqueSet(this.uniqeColumnArrays[i]);
};

GridPanel.prototype.validateOneUniqueSet = function (uq)
{
    var columnIndexes = new Array();
    var nbrCols = uq.length;
    var labels = '';
    var doc = this.P2.doc;
    var field;

    for (var i = 0; i < nbrCols; i++)
    {
        field = this.columns[uq[i]];
        columnIndexes.push(field.columnIdx);
        labels += ' "' + field.label + '"';
    }

    var vals = new Array();
    var rowIdxes = new Array();
    var n = this.grid.length;
    var idx = 0;
    var prevRowIdx = 0; 
    for (var i = 1; i < n; i++)
    {
        var aRow = this.grid[i]; //for each row
        prevRowIdx++;
        if (aRow == null || aRow.isDeleted)
        {
            prevRowIdx--;
            if (prevRowIdx < 0)
                prevRowIdx = 0;
            continue;
        }
        var val = "";
        for (var j = 0; j < nbrCols; j++)
        { //concatenate values from columns
            var columnValue = aRow[columnIndexes[j]];
            //if field is empty, itis possible that it is an empty line. Let us not cheque for duplicate empties!!
            if (columnValue != "") val += ',' + columnValue; //',' used to avoid numbers being added
        }
        if (val == "")
            continue; //no unique checking if nothing is entered
        for (var k = 0; k < idx; k++)
        {
            //check whether this value clashes with values for ealrier rows
            if (val == vals[k])
            {
                field = this.columns[uq[0]];
                this.tableBodyObject.childNodes[rowIdxes[k]].className = 'validationfailedrow';
                if ((k >= prevRowIdx) && !this.tableBodyObject.childNodes[prevRowIdx - 1])  
                    continue;

                this.tableBodyObject.childNodes[prevRowIdx - 1].className = 'validationfailedrow';
                var obj = doc.getElementById(field.name + '__' + i);
                var e;
                if (this.messageIdForUniqueColumns) //specific message
                {
                    //The 4 params are: The column label, The duplicate Column index 1 ,The duplicate Column index 2 , value which is duplicated 
                     e = new ExilityError(this.messageIdForUniqueColumns, labels, (k+1), prevRowIdx, val.substr(1));
                }
                else
                {
                    errMsg = "Column";
                    if (nbrCols > 1)
                        errMsg += "s";
                    errMsg = " " + labels + " should have unique values across all rows. Rows " + (k + 1) + " and " + (prevRowIdx) + " have same values.";  
                    e = new ExilityError(errMsg);
                }
                e.render(obj);
                throw e;
            }
        }
        vals[idx] = val;
        rowIdxes[idx] = prevRowIdx - 1; 
        idx++;
    }
};

//added to get a column value even if the row is marked for deletion
GridPanel.prototype.getColumnValue = function (columnName, rowIdx)
{
    var row = rowIdx ? this.grid[rowIdx] : this.grid[this.currentRow];
    if (!row)
        return '';
    var field = this.columns[columnName];
    if (!field)
        return '';

    return row[field.columnIdx];
};

GridPanel.prototype.bulkDeleteClicked = function (obj)
{
    var lineObj;
    var isImg = false;
    if (obj.tagName == 'INPUT')
        bulkChecked = obj.checked;
    else
    {
        isImg = true;
        if (obj.className == 'undeleteimg')
        {
            bulkChecked = true;
            obj.className = 'deleteimg';
            obj.src = obj.src.replace('undelete', 'delete');
        }
        else
        {
            obj.className = 'undeleteimg';
            obj.src = obj.src.replace('delete', 'undelete');
        }
    }
    for (var i = 1; i < this.grid.length; i++)
    {
        var row = this.grid[i];
        if (!row)
            continue;
        lineObj = this.P2.doc.getElementById(this.name + '_' + this.name + 'Delete' + '__' + i);
        if (!lineObj)
            continue;
        if (isImg)
        {
            if (obj.className != lineObj.className)
            {
                var evt = this.P2.doc.createEvent("HTMLEvents");
                evt.initEvent('click', true, true);
                lineObj.dispatchEvent(evt);
            }
        }
        else
        {
            if (obj.checked != lineObj.checked)
                lineObj.click();
        }
    }
};

GridPanel.prototype.bulkCheckClicked = function (obj, columnName)
{
    var chk;
    for (var i = 1; i < this.grid.length; i++)
    {
        chk = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + i);
        if (obj.checked != chk.checked)
            chk.click();
    }
};

//meant for addRow on tab key being pressed on the last field of a grid.
GridPanel.prototype.tabKeyPressed = function ()
{
	//
};

//added to get a column value even if the row is marked for deletion
GridPanel.prototype.getColumnValue = function (columnName, rowIdx)
{
    var row = rowIdx ? this.grid[rowIdx] : this.grid[this.currentRow];
    if (!row)
        return '';

    var field = this.columns[columnName];
    if (!field)
        return '';

    return row[field.columnIdx];
};

/******************************************
saves the first affected row by calling server action
*******************************************/
GridPanel.prototype.saveInBackground = function ()
{

    var dc = new DataCollection();
    var rowIdx = this.fillDC(dc);
    debug('Got ' + rowIdx + ' as the row to be autosaved.');
    if (!rowIdx)
        return 0;

    if (this.functionBeforeAutoSave)
    {
        if (!this.P2.win[this.functionBeforeAutoSave](dc, rowIdx))
        {
            debug('user defined function ' + this.functionBeforeAutoSave + ' returned false, and hence we are not going ahead with save..');
            return 0;
        }
    }
    //mark the rows as 'being saved'
    var doc = this.P2.doc;
    var tr = doc.getElementById(this.name + rowIdx);
    //attribute set for page designers to use css like [exil-save=saving]
    tr.setAttribute('exil-save', 'saving');

    this.grid[rowIdx].beingSaved = true;
    //craeate a call back object that will call autoSaveReturned() when service returned
    var callBackObject = { gridPanel: this, rowIdx: rowIdx, serviceReturned: function (passedDc) { this.gridPanel.autoSaveReturned(passedDc, this.rowIdx); } };

    //we are sending "this" as the call back object and asking serverAgent to call us even if the service fails.
    //serverAgent will call serviceReturned(dc)
    var se = new ServiceEntry(this.autoSaveServiceName, dc, false, null, callBackObject, null, false, false, false, null, null, true);
    this.P2.win.serverStub.callService(se);
    return rowIdx;
};
/************************************
called back by server agent after the server returns after saving the row
*************************************/
GridPanel.prototype.autoSaveReturned = function (dc, rowIdx)
{
    if (this.functionAfterAutoSave)
        this.P2.win[this.functionAfterAutoSave](dc, rowIdx);

    //reset action field for this row
    var row = this.grid[rowIdx];
    if (row)
    {
        delete row.beingSaved;
        if (dc.success && this.actionFieldName)
            row[this.actionIdx] = '';
    }
    else
    {
        debug('ERROR: service returned for ' + rowIdx + ' but the row is already deleted.');
    }

    //reset exil-save attribute for tr element
    var tr = this.P2.doc.getElementById(this.name + rowIdx);
    tr.setAttribute('exil-save', dc.success ? 'saved' : 'failed');
};
