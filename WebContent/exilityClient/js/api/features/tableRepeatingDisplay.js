
//repeating display panel. Add as many panels as many rows we receive...
var RepeatingDisplayPanel = function ()
{
    AbstractTable.call(this);
    this.toBeSentToServer = true;
    this.repeatOnFieldName = null;
    this.labelFieldName = null;
};

RepeatingDisplayPanel.prototype = new AbstractTable;

RepeatingDisplayPanel.prototype.init = function ()
{
    this.grid.length = 1;
    this.nbrRows = 0;
    this.initRepeatingPanel();
};
RepeatingDisplayPanel.prototype.getRowNumber = function (obj)
{
    return obj.rowIdx || this.currentRow;
};

//If I have to find a field in a row, what id will it  have?
RepeatingDisplayPanel.prototype.getObjectId = function (fieldName, rowIdx)
{
    return fieldName + '__' + rowIdx;
};

//data is received from server in a dc. Set it to the table
RepeatingDisplayPanel.prototype.setData = function (dc, rowsToBeAppended, isFromAppendRows, listServiceOnLoad)
{
    if (this.nbrRows)
        this.deleteAllRows();
    var doc = this.P2.doc;
    this.nbrRepeatedPanels = 0;
    this.repeatedPanels = new Object();
    var data = dc.grids[this.name];
    if (!data || data.length < 2)
        return;

    var serverNames = data[0];
    var nbrCols = serverNames.length;
    var keyName = this.P2.fields[this.repeatOnFieldName].unqualifiedName;
    var keyIdx = getColumnIndex(serverNames, keyName);
    var labelIdx;
    if (this.labelFieldName)
        labelIdx = getColumnIndex(serverNames, this.P2.fields[this.labelFieldName].unqualifiedName);
    else
        labelIdx = keyIdx;
    var defaultDataRow = this.grid[0];
    for (var i = 1; i < data.length; i++)
    {
        var serverData = data[i];
        var key = serverData[keyIdx];
        var label = serverData[labelIdx];
        var panel = this.cloneAndAddPanel(key, label);
        if (!panel)
            continue;
        this.nbrRepeatedPanels++;
        this.repeatedPanels[key] = i;
        var localData = new Array();
        var n = defaultDataRow.length;
        //initialize data with default values
        for (var j = 0; j < n; j++)
            localData[j] = defaultDataRow[j];
        this.grid.push(localData);
        this.nbrRows++;
        for (var j = 0; j < nbrCols; j++)
        {
            var field = this.columns[serverNames[j]];
            if (!field)
            {
                debug(serverNames[j] + ' is received from server but is not a field for table ' + this.name);
                continue;
            }
            var val = serverData[j];
            if (val)
            {
                var dt = dataTypes[field.dataType];
                if (dt)
                    val = dt.formatIn(val);
            }
            localData[field.columnIdx] = val;
            var obj = doc.getElementById(field.name);
            field.setValueToObject(obj, val);
            obj.id = field.name + '__' + i;
            obj.rowIdx = i;
        }
    }
    var m = data.length - 1; //actual nbr of rows

    if (exilParms.displayInitialRows && this.initialNumberOfRows && this.initialNumberOfRows > m)
    {
        this.addInitialRowsToRepeatingPanel(dc, listServiceOnLoad);
    }
};

RepeatingDisplayPanel.prototype.fillDC = function (dc)
{
    var grid = new Array();
    var n = this.grid.length;
    //add desired number of empty rows first
    var i, field, val, j, dt, row, gridRow;

    for (i = 0; i < n; i++)
    {
        gridRow = this.grid[i];
        if (!gridRow)
            continue;
        if (this.keyIdx == null || gridRow[this.keyIdx])
        {
            gridRow.toBeSent = true;
            grid.push(new Array());
        }
        else
            this.grid[i].toBeSent = false;
    }

    //now go by column, and add values
    var col = 0;
    for (var x in this.columns)
    {
        field = this.columns[x];
        if (!field.toBeSentToServer)
            continue;
        dt = dataTypes[field.dataType];
        grid[0][col] = x;
        row = 1;
        j = field.columnIdx;
        for (i = 1; i < n; i++)
        {
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
    if (!col)
    {
        debug(this.name + ' does not have any columns to be sent to server');
        return;
    }
    dc.addGrid(this.name, grid);
};
