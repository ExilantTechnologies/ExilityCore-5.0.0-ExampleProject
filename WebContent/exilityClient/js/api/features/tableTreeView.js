ListPanel.prototype.treeViewInit = function ()
{
    // this.treeViewXXXXXXXXColumnIdx are used for optimization purpose 
    // to access the column values.
    this.treeViewKeyColumnIdx = -1;
    this.treeViewParentKeyColumnIdx = -1;
    this.treeViewHasChildColumnIdx = -1;
    if (this.treeViewColumnName)
    {
        for (var j = 0; j < this.columnNames.length; j++)
        {
            if (this.columnNames[j] == this.treeViewKeyColumn)
                this.treeViewKeyColumnIdx = j;
            else if (this.columnNames[j] == this.treeViewParentKeyColumn)
                this.treeViewParentKeyColumnIdx = j;
            else if (this.columnNames[j] == this.treeViewHasChildColumn)
                this.treeViewHasChildColumnIdx = j;
        }
    }
};

ListPanel.EXPANDED_NODE = 'minus.gif';
ListPanel.COLLAPSED_NODE = 'plus.gif';
ListPanel.LEAF_NODE = 'space.gif';

// Note on tr.rowState:
// --------------------
// tr.rowState = ListPanel.EXPANDED_NODE means tree node is expanded
// tr.rowState = ListPanel.COLLAPSED_NODE means tree node is collapsed
// tr.rowState = ListPanel.LEAF_NODE means tree node is a leaf node, no expand/collapse.
ListPanel.prototype.treeViewIndentRow = function (rowIdx)
{
    var doc = this.P2.doc;
    var tr = doc.getElementById(this.name + rowIdx);
    var dataRow = this.grid[rowIdx];

    // find the parent row of the current row (tr).
    // assumption: all child nodes appear immediately after the parent node.	    
    var treeViewParentKeyColumnValue = dataRow[this.treeViewParentKeyColumnIdx];
    var treeViewHasChildColumnValue = dataRow[this.treeViewHasChildColumnIdx];
    var parentIdx = null;
    if (treeViewParentKeyColumnValue && treeViewParentKeyColumnValue.length > 0)
    {
        for (var r = rowIdx - 1; r > 0; r--)
        {
            if (this.grid[r][this.treeViewKeyColumnIdx] == treeViewParentKeyColumnValue)
            {
                parentIdx = r;
                break;
            }
        }
    }

    this.renameTreeImages(rowIdx, tr, parentIdx);

    // if current row has parent row then adjust the indentation of the current row
    // using 1x1 pixel indentImg
    if (parentIdx)
    {
        tr.parentRowIdx = parentIdx;
        var parentIndentImg = doc.getElementById(this.name + '_' + this.treeViewColumnName + '__' + parentIdx + 'Indent');
        var w = parentIndentImg.style.width;
        w = parseInt(w.substr(0, w.indexOf('px')), 10) + 19; //increment by 19px;
        var indentEle = doc.getElementById(this.name + '_' + this.treeViewColumnName + '__' + rowIdx + 'Indent');
        indentEle.style.width = w + 'px';
    }
    // leaf node should not have plus/minus image prefix. Clear it.
    if (treeViewHasChildColumnValue == 'N')
    {
        var plusMinusImg = doc.getElementById(this.name + '_' + this.treeViewColumnName + '__' + rowIdx + 'PlusMinus');
        var srcArray = plusMinusImg.src.split('/');
        var img = srcArray[srcArray.length - 1];
        plusMinusImg.src = plusMinusImg.src.replace(img, ListPanel.LEAF_NODE);
        plusMinusImg.style.cursor = 'auto';
        tr.rowState = ListPanel.LEAF_NODE;
    }
    else
    {
        tr.rowState = ListPanel.EXPANDED_NODE;
    }
};

var treeViewImageSuffixes = ['PlusMinus', 'Select', 'Indent'];
ListPanel.prototype.renameTreeImages = function (rowIdx, tr, parentIdx)
{
    var thisId = this.name + '_' + this.treeViewColumnName + '__' + rowIdx;
    var doc = this.P2.doc;
    for (var i = 0; i < treeViewImageSuffixes.length; i++)
    {
        var suffix = treeViewImageSuffixes[i];
        var ele = doc.getElementById(this.treeViewColumnName + suffix);
        ele.id = thisId + suffix;
        ele.rowIdx = rowIdx;
        ele.tr = tr;
        if (parentIdx)
            ele.parentRowIdx = parentIdx;
    }
};

ListPanel.prototype.treeViewExpandCollapseRow = function (objImg, columnName)
{
    if (objImg.tr.rowState == ListPanel.EXPANDED_NODE)
    {
        objImg.src = objImg.src.replace(ListPanel.EXPANDED_NODE, ListPanel.COLLAPSED_NODE);
        objImg.tr.rowState = ListPanel.COLLAPSED_NODE;
        this.treeViewHideChildRows(objImg, columnName);
    }
    else if (objImg.tr.rowState == ListPanel.COLLAPSED_NODE)
    {
        objImg.src = objImg.src.replace(ListPanel.COLLAPSED_NODE, ListPanel.EXPANDED_NODE);
        objImg.tr.rowState = ListPanel.EXPANDED_NODE;
        this.treeViewShowChildRows(objImg, columnName);
    }
};

ListPanel.prototype.treeViewShowChildRows = function (objImg, columnName)
{
    var key = this.grid[objImg.rowIdx][this.treeViewKeyColumnIdx];
    if (objImg.tr.rowState != ListPanel.LEAF_NODE)
    {
        var tmpParentKey;
        for (var i = objImg.rowIdx + 1; i < this.grid.length; i++)
        {
            tmpParentKey = this.grid[i][this.treeViewParentKeyColumnIdx];
            if (tmpParentKey != key)
                break;

            // based on the state of this child, expand recursively
            var childObjImg = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + i + 'PlusMinus');
            childObjImg.tr.style.display = '';
            if (childObjImg.tr.rowState == ListPanel.EXPANDED_NODE)
                this.treeViewShowChildRows(childObjImg, columnName);
        }
    }
};

ListPanel.prototype.treeViewHideChildRows = function (objImg, columnName)
{
    var key = this.grid[objImg.rowIdx][this.treeViewKeyColumnIdx];
    if (objImg.tr.rowState != ListPanel.LEAF_NODE)
    {
        var tmpParentKey;
        for (var i = objImg.rowIdx + 1; i < this.grid.length; i++)
        {
            tmpParentKey = this.grid[i][this.treeViewParentKeyColumnIdx];
            if (tmpParentKey != key)
                break;
            var childObjImg = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + i + 'PlusMinus');
            childObjImg.tr.style.display = 'none';
            this.treeViewHideChildRows(childObjImg, columnName);
        }
    }
};

ListPanel.prototype.treeViewSelectDeselectRow = function (objChk, columnName)
{
    if (objChk.checked)
    {
        if (objChk.tr.className != 'selectedlistrow')
            objChk.tr.savedClassName = objChk.tr.className;
        objChk.tr.className = 'selectedlistrow';
        if (objChk.tr.rowState == ListPanel.LEAF_NODE)
            this.selectedRows[objChk.rowIdx] = true;
    }
    else
    {
        // clear the bulk checkbox in header
        var bulkChk = this.P2.doc.getElementById(this.name + 'BulkCheck');
        //Apr 09 2009 : Check whether bulk check element is present or not. - Perspicus (Start) : Venkat
        if (bulkChk)
            bulkChk.checked = false;
        //Apr 09 2009 : Check whether bulk check element is present or not. - Perspicus (End) : Venkat 

        objChk.tr.className = objChk.tr.savedClassName;
        if ((objChk.tr.rowState == ListPanel.LEAF_NODE) && (this.selectedRows[objChk.rowIdx]))
            delete this.selectedRows[objChk.rowIdx];
    }

    if (!objChk.checked && objChk.parentRowIdx)
    {
        var parentObjChk = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + objChk.parentRowIdx + 'Select');
        this.treeViewDeselectParentRow(parentObjChk, columnName);
    }
    this.treeViewSelectDeselectChildRows(objChk, columnName);
};

ListPanel.prototype.treeViewDeselectParentRow = function (objChk, columnName)
{
    objChk.tr.className = objChk.tr.savedClassName;
    objChk.checked = false;
    if (objChk.parentRowIdx)
    {
        var parentObjChk = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + objChk.parentRowIdx + 'Select');
        this.treeViewDeselectParentRow(parentObjChk, columnName);
    }
};

ListPanel.prototype.treeViewSelectDeselectChildRows = function (objChk, columnName)
{
    var key = this.grid[objChk.rowIdx][this.treeViewKeyColumnIdx];

    if (objChk.tr.rowState != ListPanel.LEAF_NODE)
    {
        var tmpParentKey;
        for (var i = objChk.rowIdx + 1; i < this.grid.length; i++)
        {
            tmpParentKey = this.grid[i][this.treeViewParentKeyColumnIdx];
            if (tmpParentKey != key)
                break;
            var childObjChk = this.P2.doc.getElementById(this.name + '_' + columnName + '__' + i + 'Select');
            childObjChk.checked = objChk.checked;
            if (childObjChk.checked)
            {
                if (childObjChk.tr.className != 'selectedlistrow')
                    childObjChk.tr.savedClassName = childObjChk.tr.className;
                childObjChk.tr.className = 'selectedlistrow';
                if (childObjChk.tr.rowState == ListPanel.LEAF_NODE)
                    this.selectedRows[i] = true;
            }
            else
            {
                childObjChk.tr.className = childObjChk.tr.savedClassName;
                if ((childObjChk.tr.rowState == ListPanel.LEAF_NODE) && (this.selectedRows[i]))
                    delete this.selectedRows[i];
            }
            this.treeViewSelectDeselectChildRows(childObjChk, columnName);
        }
    }
};

ListPanel.prototype.treeViewBulkSelectDeselectRow = function (obj, columnName)
{
    var id = this.name + '_' + columnName + '__';
    for (var i = 1; i < this.grid.length; i++)
    {
        var chk = this.P2.doc.getElementById(id + i + 'Select');
        if (obj.checked != chk.checked)
            chk.click();
    }
};
