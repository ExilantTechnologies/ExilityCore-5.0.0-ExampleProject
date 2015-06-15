
ListOrGridTable.prototype.aggregateAField = function (field, obj, idx)
{
    if (this.repeatedField && field === this.repeatedField)
    {
        if (field.rowSum)
            this.updateRepeatedRowAggregate(field, idx, 'sum');
        if (field.rowAverage)
            this.updateRepeatedRowAggregate(field, idx, 'avg');
        if (field.columnSum)
            this.updateRepeatedColumnAggregate(field, obj, 'sum');
        if (field.columnAverage)
            this.updateRepeatedColumnAggregate(field, obj, 'avg');
    }

    else if (this.repeatOnFieldName)
    {
        if (field.columnSum)
            this.updateRepeatedPanelColumnAggregate(field, obj, 'sum');
    }

    else
    {
        if (field.rowSum)
            this.updateRowAggregate(idx, 'sum');
        if (field.rowAverage)
            this.updateRowAggregate(idx, 'avg');
        if (field.columnSum)
            this.updateColumnAggregate(field, 'sum');
        if (field.columnAverage)
            this.updateColumnAggregate(field, 'avg');
    }
};

ListOrGridTable.prototype.updateRepeatedPanelColumnAggregate = function (field, obj, aggregateType)
{
    var keyIdx = this.P2.fields[this.repeatOnFieldName].columnIdx;

    var sum = 0;
    var count = 0;
    var j = field.columnIdx;
    for (var rowId = 1; rowId < this.grid.length; rowId++)
    {

        if (!this.grid[rowId])
            continue;
        var key = this.grid[rowId][keyIdx];
        if ((aggregateType == 'sum') && (field.columnSumFunction))
        {
            try
            {
                sum = this.P2.win[field.columnSumFunction](this.grid);
            } catch (e)
            {
                debug('Error while executing columnSumFunction : ' + field.columnSumFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
                throw e;
            }
        }
        else if ((aggregateType == 'avg') && (field.columnAverageFunction))
        {
            try
            {
                sum = this.P2.win[field.columnAverageFunction](this.grid);
            } catch (e)
            {
                debug('Error while executing columnAverageFunction : ' + field.columnAverageFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
                throw e;
            }
        }
        else
        {
            for (var i = 1; i < this.grid.length; i++)
            {
                var row = this.grid[i];
                if (!row || row.isDeleted)
                    continue;

                if (row[keyIdx] == key)
                {
                    var val = parseFloat(row[j]);
                    if (isNaN(val)) continue;
                    sum += val;
                }
                count++;
            }
        }

        if (field.formatter)
            sum = field.format(sum);
        else if (field.dataType)
        {
            var dt = dataTypes[field.dataType];
            if (dt)
                sum = dt.formatIn(sum);
        }

        var ele = this.P2.doc.getElementById(field.name + 'Footer' + key);
        ele.innerHTML = sum;
        sum = 0;
    }
    return;
};

ListOrGridTable.prototype.aggregate = function ()
{
    if (this.rowSumIndexes || this.rowAverageIndexes)
    {
        for (var rowId = 1; rowId < this.grid.length; rowId++)
        {
            var row = this.grid[rowId];
            if (!row || row.isDeleted)
                continue;
            if (this.rowSumIndexes)
            {
                if (this.repeatedColumnToBeSummed)
                    this.updateRepeatedRowAggregate(this.repeatedField, rowId, 'sum');
                else
                    this.updateRowAggregate(rowId, 'sum');
            }
            if (this.rowAverageIndexes)
            {
                if (this.repeatedColumnToBeAveraged)
                    this.updateRepeatedRowAggregate(this.repeatedField, rowId, 'avg');
                else
                    this.updateRowAggregate(rowId, 'avg');
            }
        }
    }
    if (this.columnSumIndexes)
    {
        for (var i = 0; i < this.columnSumIndexes.length; i++)
        {
            var field = this.columnSumIndexes[i];
            if (field == this.repeatedField)
                this.updateRepeatedColumnAggregate(field, null, 'sum');
            else if (this.repeatOnFieldName)
                this.updateRepeatedPanelColumnAggregate(field, null, 'sum');
            else
                this.updateColumnAggregate(field, 'sum');
        }
    }
    if (this.columnAverageIndexes)
    {
        for (var i = 0; i < this.columnAverageIndexes.length; i++)
        {
            var field = this.columnAverageIndexes[i];
            if (field == this.repeatedField)
                this.updateRepeatedColumnAggregate(field, null, 'avg');
            else
                this.updateColumnAggregate(field, 'avg');
        }
    }
};

ListOrGridTable.prototype.updateRepeatedColumnAggregate = function (field, obj, aggregateType)
{
    var keys = new Array();
    //if obj is passed, it is for a column that changed, else for all columns
    if (obj)
        keys.push(obj.getAttribute('key'));
    else
    {
        keys = new Array();
        var keyRows = this.repeatedData.keys;
        for (var i = 1; i < keyRows.length; i++)
            keys.push(keyRows[i][0]);
    }
    var keyData = this.repeatedData.data;
    var sums = new Array();
    var counts = new Array();
    for (var i = 0; i < keys.length; i++)
    {
        sums.push(0);
        counts.push(0);
    }
    if ((aggregateType == 'sum') && (field.columnSumFunction))
    {
        try
        {
            sums = this.P2.win[field.columnSumFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing columnSumFunction : ' + field.columnSumFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else if ((aggregateType == 'avg') && (field.columnAverageFunction))
    {
        try
        {
            sums = this.P2.win[field.columnAverageFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing columnAverageFunction : ' + field.columnAverageFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else
    {
        for (var rowId = 1; rowId < this.grid.length; rowId++)
        {
            var row = this.grid[rowId];
            if (!row || row.isDeleted)
                continue;
            var id = row[this.idIdx];
            var colVals = keyData[id];
            for (var i = 0; i < keys.length; i++)
            {
                counts[i]++;
                if (!colVals)
                    continue;
                var val = parseFloat(colVals[keys[i]]);
                if (val)
                    sums[i] += val;
            }
        }
        for (var i = 0; i < sums.length; i++)
        {
            if (aggregateType == 'avg')
            {
                if (counts[i] == 0)
                    sums[i] = '--';
                else
                    sums[i] = sums[i] / counts[i];
            }
            if(!exilParams.doNotRoundOffColumnSumAndAvg)
                sums[i] = Math.round(Math.round(sums[i] * 100.0)) / 100;
        }
    }
    var doc = this.P2.doc;
    var id = field.name + 'Footer';
    for (var i = 0; i < keys.length; i++)
    {
        if (field.formatter)
            sums[i] = field.format(sums[i]);
        else if (field.dataType)
        {
            var dt = dataTypes[field.dataType];
            if (dt)
                sums[i] = dt.formatIn(sums[i]);
        }
        var ele = doc.getElementById(id + keys[i]);
        ele.innerHTML = sums[i];
    }
};

ListOrGridTable.prototype.updateRepeatedRowAggregate = function (field, rowId, aggregateType)
{
    var keys = this.repeatedData.keys;
    var keyData = this.repeatedData.data;
    var sum = 0;
    var count = 0;
    if ((aggregateType == 'sum') && (field.rowSumFunction))
    {
    	//
    }
    else if ((aggregateType == 'avg') && (field.rowAverageFunction))
    {
    	//
    }
    else
    {
        //Jun 12 2009 :  Bug 241 -  Colume sum feature cannot be overridden for average calculations - SABMiller (End) : Aravinda
        var row = this.grid[rowId];
        var id = row[this.idIdx];
        var colVals = keyData[id] || {};
        for (var i = 1; i < keys.length; i++)
        {
            var val = parseFloat(colVals[keys[i][0]]);
            if (isNaN(val))
                continue;
            sum += val;
            count++;
        }
    }
    this.assignRowAggregateValue(sum, count, rowId, aggregateType);
};

ListOrGridTable.prototype.assignRowAggregateValue = function (sum, count, rowId, aggregateType)
{
    var fieldName = 'rowSum';
    var rowSumFunction = null;
    var rowAverageFunction = null;
    for (var i = 0; i < this.columnNames.length; i++)
    {
        var curColumn = this.columns[this.columnNames[i]];
        if (curColumn.rowSumFunction)
        {
            rowSumFunction = curColumn.rowSumFunction;
        }
        if (curColumn.rowAverageFunction)
        {
            rowAverageFunction = curColumn.rowAverageFunction;
        }
    }
    if ((aggregateType == 'sum') && (rowSumFunction))
    {
        try
        {
            sum = this.P2.win[rowSumFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing rowSumFunction : ' + rowSumFunction + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else if ((aggregateType == 'avg') && (rowAverageFunction))
    {
        fieldName = 'rowAverage';
        try
        {
            sum = this.P2.win[rowAverageFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing rowAverageFunction : ' + rowAverageFunction + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else
    {
        if (aggregateType == 'avg')
        {
            fieldName = 'rowAverage';
            if (count)
                sum = Math.round(Math.round(sum * 100.0 / count)) / 100;
            else
                sum = '--';
        }
        else
            sum = Math.round(Math.round(sum * 100)) / 100;
    }

    var field = this.columns[fieldName];
    this.grid[rowId][field.columnIdx] = sum;
    if (field.formatter)
        sum = field.format(sum);
    this.P2.doc.getElementById(field.name + '__' + rowId).innerHTML = sum;
    if (field.columnSum)
        this.updateColumnAggregate(field, 'sum');
    if (field.columnAverage)
        this.updateColumnAggregate(field, 'avg');
};

ListOrGridTable.prototype.updateRowAggregate = function (rowId, aggregateType)
{
    var sum = 0;
    var count = 0;
    var rowSumFunction = null;
    var rowAverageFunction = null;
    for (var i = 0; i < this.columnNames.length; i++)
    {
        var curColumn = this.columns[this.columnNames[i]];
        if (curColumn.rowSumFunction)
        {
            rowSumFunction = curColumn.rowSumFunction;
        }
        if (curColumn.rowAverageFunction)
        {
            rowAverageFunction = curColumn.rowAverageFunction;
        }
    }
    if ((aggregateType == 'sum') && (rowSumFunction))
    {
    	//
    }
    else if ((aggregateType == 'avg') && (rowAverageFunction))
    {
    	//
    }
    else
    {
        var row = this.grid[rowId];
        for (var i = 0; i < this.rowSumIndexes.length; i++)
        {
            var val = parseFloat(row[this.rowSumIndexes[i]]);
            if (isNaN(val)) continue;
            sum += val;
            count++;
        }
    }
    this.assignRowAggregateValue(sum, count, rowId, aggregateType);
};

ListOrGridTable.prototype.updateColumnAggregate = function (field, aggregateType)
{
    var sum = 0;
    var count = 0;
    var j = field.columnIdx;
    //Jun 12 2009 :  Bug 241 -  Colume sum feature cannot be overridden for average calculations - SABMiller (Start) : Aravinda
    if ((aggregateType == 'sum') && (field.columnSumFunction))
    {
        try
        {
            sum = this.P2.win[field.columnSumFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing columnSumFunction : ' + field.columnSumFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else if ((aggregateType == 'avg') && (field.columnAverageFunction))
    {
        try
        {
            sum = this.P2.win[field.columnAverageFunction](this.grid);
        } catch (e)
        {
            debug('Error while executing columnAverageFunction : ' + field.columnAverageFunction + ' on the field : ' + field.name + ' of the grid : ' + this.name);
            throw e;
        }
    }
    else
    {
        for (var rowId = 1; rowId < this.grid.length; rowId++)
        {
            var row = this.grid[rowId];
            if (!row || row.isDeleted)
                continue;
            var val = parseFloat(row[j]);
            if (field.formatter && ((val + "").length < (row[j].length / 2)))
                val = parseFloat(field.deformat(row[j]));
            if (isNaN(val)) continue;
            sum += val;
            count++;
        }
        if (aggregateType == 'avg')
        {
            if (count == 0)
                sum = '--';
            else
                sum = Math.round(Math.round(sum * 100.0 / count)) / 100;
        }
        else
            sum = Math.round(Math.round(sum * 100)) / 100;
    }
    if (field.formatter)
        sum = field.format(sum);
    else if (field.dataType)
    {
        var dt = dataTypes[field.dataType];
        if (dt)
            sum = dt.formatIn(sum);
    }

    var ele = this.P2.doc.getElementById(field.name + 'Footer');
    ele.innerHTML = sum;
};

/****
for the supplied set of keys, repeat the supplied column in the header and the rowToClone
***/
ListOrGridTable.prototype.repeatColumns = function ()
{
    var field = this.repeatedField;
    var keys = this.repeatedData.keys;
    var id = field.name;
    var labelId = id + 'Label';

    var ele;
    var n = keys.length;
    for (var i = 1; i < n; i++)
    {
        var key = keys[i][0];

        //add header cell
        ele = this.repeatingHeaderEle.cloneNode(true);
        ele.innerHTML = keys[i][1];
        ele.id = labelId + key;
        if (this.repeatingHeaderSibling) //if sibling is avialble insert before, else append to parent
            this.repeatingHeaderParent.insertBefore(ele, this.repeatingHeaderSibling);
        else
            this.repeatingHeaderParent.appendChild(ele);

        //footer, if any
        if (this.repeatingFooterEle)
        {
            ele = this.repeatingFooterEle.cloneNode(true);
            ele.id = id + 'Footer' + key;
            if (this.repeatingFooterSibling)
                this.repeatingFooterParent.insertBefore(ele, this.repeatingFooterSibling);
            else
                this.repeatingFooterParent.appendChild(ele);
        }

        //data row
        ele = this.repeatingColumnEle.cloneNode(true);

        if (this.repeatingColumnSibling)
            this.repeatingColumnParent.insertBefore(ele, this.repeatingColumnSibling);
        else
            this.repeatingColumnParent.appendChild(ele);

        //get to the actual field element, that would be a child of ele
        ele = ele.childNodes[0]; //it is the first child of td,
        while (ele && !ele.id)
            ele = ele.nextSibling;
        if (!ele)
        {
            alert('Exility Design Error: Unable to get the repeated field for ' + this.name + '. Report to Exility Tect team');
            throw ('Repeating column design error for table ' + this.name);
        }
        ele.id = id + key;
        ele.setAttribute('key', key);

        this.nbrColumnsRepeated++;

        ele = ele.nextSibling;
        while (ele && ele.tagName && ele.tagName.toUpperCase() != 'SPAN')
            ele = ele.nextSibling;

        if (!ele)
            continue;

        ele = ele.childNodes[0]; //it is the first child of td and it is IMG element,
        if (ele && ele.tagName && ele.tagName.toUpperCase() == 'IMG')
            ele.setAttribute('key', key);
    }
};

ListOrGridTable.prototype.setDataToRepeatedColumns = function (doc, pkey, rowIdx)
{
    var field = this.repeatedField;
    var data = this.repeatedData.data[pkey];
    var keys = this.repeatedData.keys;
    var n = keys.length;
    var suffix = '__' + rowIdx;
    for (var i = 1; i < n; i++)
    {
        var key = keys[i][0];
        var id = field.name + key;
        var ele = doc.getElementById(id);
        if (data)
        {
            var val = data[key];
            if (val || val == 0)
                field.setValueToObject(ele, val);
        }

        ele.id = id + suffix;
        ele.rowIdx = rowIdx;
    }
};

ListOrGridTable.prototype.createDataForRepeatedColumns = function (grid, toGetKeys)
{
    //in data, first column is primary key, second is secondary key, third is label for secondary key, next is data
    var data = new Object();
    var keysAndLabels = [['key', 'label']]; //array of arrays with first row set..
    var objToReturn = new Object();
    objToReturn.data = data;
    if (toGetKeys)
        objToReturn.keys = keysAndLabels;

    if (grid.length <= 1)
        return objToReturn;

    var keys = new Object();
    var keysArray = new Array();
    var n = grid.length;
    for (var i = 1; i < n; i++)
    {
        var row = grid[i];
        var pkey = row[0];
        var skey = row[1];
        var subData = data[pkey];
        if (!subData)
        {
            subData = new Object();
            data[pkey] = subData;
        }
        if (toGetKeys)
        {
            if (!keys[skey])
            {
                keys[skey] = row[2];
                keysArray.push(skey);
            }
            subData[skey] = row[3];
        }
        else
            subData[skey] = row[2];
    }
    if (toGetKeys)
    {
        keysArray.sort();
        n = keysArray.length;
        for (var i = 0; i < n; i++)
        {
            var skey = keysArray[i];
            keysAndLabels.push([skey, keys[skey]]);
        }
    }
    return objToReturn;
};

ListOrGridTable.prototype.saveRepeatedColumnValue = function (val, key, idx)
{
    var pkey = this.grid[idx][this.idIdx];
    var data = this.repeatedData.data;
    var subData = data[pkey];
    if (!subData)
    {
        subData = new Object();
        data[pkey] = subData;
    }
    subData[key] = val;
};

//data is received from server in a dc. Set it to the table
ListOrGridTable.prototype.setDataToRepeatingPanel = function (dc, listServiceOnLoad) // Aug 06 2009 :  Bug ID 631 - suppressDescOnLoad is not working - WeaveIT: Venkat
{
    //in two-grids-in-a-panel case, deleterows should be triggered only once
    if (this.elderBrother || this.youngerBrother)
    {
        var tbl = this.elderBrother ? this.P2.tables[this.elderBrother] : this;
        if (tbl.rowsGotDeleted)
            tbl.rowsGotDeleted = false;
        else
        {
            tbl.deleteAllRowsFromRepeatingPanel();
            tbl.rowsGotDeleted = true;
        }
    }
    else
        this.deleteAllRowsFromRepeatingPanel();
    //remove rows from data 
    this.grid.length = 1;
    this.nbrRows = 0;
    var doc = this.P2.doc;
    var data = dc.grids[this.name];
    if (!data || data.length < 2)
        return;
    this.serverData = data;
    var serverNames = data[0];
    var fieldCols = getcolumnToColumnMap(serverNames, this.columnNames);
    this.fieldCols = fieldCols;
    var keyName = this.P2.fields[this.repeatOnFieldName].unqualifiedName;
    var keyIdx = getColumnIndex(serverNames, keyName);
    var labelIdx;
    if (this.labelFieldName)
        labelIdx = getColumnIndex(serverNames, this.labelFieldName);
    else
        labelIdx = keyIdx;
    var lastKey = null;
    var tBody = null;
    var localCount = 0;
    for (var i = 1; i < data.length; i++)
    {
        var serverData = data[i];
        var key = serverData[keyIdx];
        if (key != lastKey)
        {
            lastKey = key;
            var label = serverData[labelIdx];
            tBody = this.getTBody(key, label);
            if (!tBody)
                continue;
            var len = tBody.childNodes.length;
            if (len == this.initialNumberOfRows)
            {
                if (tBody.deleteRow)
                {
                    while (--len >= 0)
                        tBody.deleteRow(len);
                }
                else
                    tBody.innerHTML = '';
            }
            localCount = 0;
        }
        if (!tBody)
        {
            alert('Design Error: repeatingField is not set up properly for this repeating table ' + this.name + ' with panel name ' + this.panelName);
            return;
        }
        this.nbrRows++;
        var newRow = this.htmlRowToClone.cloneNode(true);
        localCount++;

        var clsName = (localCount % 2) ? 'row2' : 'row1';

        newRow.className = clsName;
        newRow.rowIdx = i; // set the pointer to the data row
        newRow.id = this.name + i; // in case I need to reach the tr with just the index...
        tBody.appendChild(newRow);
        if (this.frozenColumnIndex)
        {
            this.cloneFrozenRow(clsName, i);
        }

        //add a data row
        var newDataRow = new Array(this.nbrColumns);
        this.grid.push(newDataRow);
        this.addDataToARow(doc, newDataRow, i, data[i], fieldCols, null, null, listServiceOnLoad); 
    }
    //do I have to have initialNumberOfRows?
    if (this.initialNumberOfRows && exilParms.displayInitialRows)
    {
        this.addInitialRowsToRepeatingPanel(dc, listServiceOnLoad);
    }
};
