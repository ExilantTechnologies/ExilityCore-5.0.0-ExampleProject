// xml tree routines /////
var Node =
{
	ELEMENT_NODE                :  1,
	ATTRIBUTE_NODE              :  2,
	TEXT_NODE                   :  3,
	CDATA_SECTION_NODE          :  4,
	ENTITY_REFERENCE_NODE       :  5,
	ENTITY_NODE                 :  6,
	PROCESSING_INSTRUCTION_NODE :  7,
	COMMENT_NODE                :  8,
	DOCUMENT_NODE               :  9,
	DOCUMENT_TYPE_NODE          : 10,
	DOCUMENT_FRAGMENT_NODE      : 11,
	NOTATION_NODE               : 12
};


var hideSourceTree = function (sourceTreeName, gridName) {
    var sourceEle = document.getElementById(sourceTreeName);
    var gridEle = document.getElementById(gridName);
    
    if(sourceEle.style.display != 'none')
    {
        sourceEle.style.display = 'none';
        sourceEle.style.width = '0%';
        gridEle.style.width = '99%';
    }
    else
    {
        gridEle.style.width = '69%';
        sourceEle.style.display = 'block';
        sourceEle.style.width = '30%';
    }
};

var hideAttributeGrid = function (attributeGridName, nameGridName) {
    var attributeEle = document.getElementById(attributeGridName);
    var nameEle = document.getElementById(nameGridName);
    
    if(attributeEle.style.display != 'none')
    {
        attributeEle.style.display = 'none';
        attributeEle.style.width = '0%';
        nameEle.style.width = '99%';
    }
    else
    {
        nameEle.style.width = '30%';
        attributeEle.style.display = 'block';
        attributeEle.style.width = '69%';
    }
};

var toggleDocStructure = function (docStructureName)
{
    var docStructureLabelEle = document.getElementById(docStructureName + 'Label');
    var docStructureEle = document.getElementById(docStructureName);
    if(docStructureLabelEle.style.display != 'none')
    {
        docStructureLabelEle.style.display = 'none';
        docStructureEle.style.display = 'none';
    }
    else
    {
        docStructureLabelEle.style.display = 'block';
        docStructureEle.style.display = 'block';
    }
};

var toggleGrid = function (gridName, noOfVisibleColumns, divName)
{
    var gridEle = document.getElementById(gridName);
    var numOfRows = gridEle.rows.length;
    var numOfCells = gridEle.rows[0].cells.length;
    var styleValue = "";

    if(noOfVisibleColumns >= numOfCells)
    {
        return;
    }

    if(gridEle.tHead.rows[0].cells[noOfVisibleColumns].style.display != 'none')
    {
        styleValue = 'none';
    }
    else
    {
        styleValue = 'block';
    }

    for(var j = noOfVisibleColumns; j < numOfCells; j++)
    {
        var curCellEle = gridEle.tHead.rows[0].cells[j];
        curCellEle.style.display = styleValue;
    }
    
    for(var i = 0; i < numOfRows; i++)
    {
        for(var j = noOfVisibleColumns; j < numOfCells; j++)
        {
            var curCellEle = gridEle.rows[i].cells[j];
            curCellEle.style.display = styleValue;
        }
    }

};

var toggleAttributeGrid = function (attributeGridName)
{
    var attributeGridEle = document.getElementById(attributeGridName);
    var displayWidth = null;
    if((attributeGridEle.style.marginLeft == "") || (parseInt(attributeGridEle.style.marginLeft) == 0))
    {
        displayWidth = attributeGridEle.offsetWidth;
        attributeGridEle.style.marginLeft = "0px";
    }
    else
    {
        displayWidth = parseInt(attributeGridEle.style.marginLeft);        
    }
    if(displayWidth < 0)
    {
        setTimeout("slideOutGrid('" + attributeGridName + "', '0')", 0);
    }
    else
    {
        setTimeout("slideInGrid('" + attributeGridName + "', '" + displayWidth + "')", 0);
    }
};

var slideInGrid = function (gridName, width)
{
    var attributeGridEle = document.getElementById(gridName);
    var currentWidth = parseInt(attributeGridEle.style.marginLeft);
    var finalWidth = (-1 * parseInt(width));
    if(currentWidth > finalWidth)
    {
        currentWidth -= 6;
        if(currentWidth < finalWidth)
            currentWidth = finalWidth;
        attributeGridEle.style.marginLeft = currentWidth + "px";
        setTimeout("slideInGrid('" + gridName + "', '" + width + "')", 0);
    }
};

var slideOutGrid = function (gridName, width)
{
    var attributeGridEle = document.getElementById(gridName);
    var currentWidth = parseInt(attributeGridEle.style.marginLeft);
    var finalWidth = parseInt(width);
    if(currentWidth < finalWidth)
    {
        currentWidth += 6;
        if(currentWidth > finalWidth)
            currentWidth = finalWidth;
        attributeGridEle.style.marginLeft = currentWidth + "px";
        setTimeout("slideOutGrid('" + gridName + "', '" + width + "')", 0);
    }
};

var slideInTree = function (treeName, width)
{
    var treeEle = document.getElementById(treeName);
    var currentWidth = parseInt(treeEle.style.width);
    var finalWidth = parseInt(width);
    if(currentWidth > finalWidth)
    {
        currentWidth -= 6;
        if(currentWidth < finalWidth)
            currentWidth = finalWidth;
        treeEle.style.width = currentWidth + "px";
        setTimeout("slideInTree('" + treeName + "', '" + width + "')", 0);
    }
};

var slideOutTree = function (treeName, width)
{
    var treeEle = document.getElementById(treeName);
    var currentWidth = parseInt(treeEle.style.width);
    var finalWidth = parseInt(width);
    if(currentWidth < finalWidth)
    {
        currentWidth += 6;
        if(currentWidth > finalWidth)
            currentWidth = finalWidth;
        treeEle.style.width = currentWidth + "px";
        setTimeout("slideOutTree('" + treeName + "', '" + width + "')", 0);
    }
};


var toggleXMLTree = function (xmlTreeName)
{
    var xmlTreeEle = document.getElementById(xmlTreeName);
    var wrapperEle = document.getElementById(xmlTreeName + 'DivWrapper');
    var displayWidth = null;
    if(wrapperEle.style.width == "")
    {
        displayWidth = parseInt(xmlTreeEle.style.width);
        wrapperEle.style.width = (displayWidth + 2) + "px";
    }
    else
    {
        displayWidth = parseInt(wrapperEle.style.width);
    }
    
    if(displayWidth > 0)
    {
        setTimeout("slideInTree('" + xmlTreeName + "DivWrapper', '0')", 0);
    }
    else
    {
        setTimeout("slideOutTree('" + xmlTreeName + "DivWrapper', '" + (parseInt(xmlTreeEle.style.width) + 2) + "')", 0);
    }
};



ExilityPage.prototype.slidePanel = function (obj, panelName, slideFrom)
{
    var sliderPanel = this.doc.getElementById(panelName + 'Slider' + obj.getAttribute('key'));
    if (sliderPanel)
        panelName = panelName + obj.getAttribute('key');
    if (slideFrom == 'right')
        this.toggleSlideLeft(panelName);
    else if (slideFrom == 'left')
        this.toggleSlideRight(panelName);
};

ExilityPage.prototype.toggleSlideLeft = function (tableName)
{
    var tableDivEle = this.doc.getElementById(tableName + 'Container');
    if (!tableDivEle)
        tableDivEle = this.doc.getElementById(tableName);

    var displayWidth = null;
    if ((tableDivEle.style.marginLeft == "") || (parseInt(tableDivEle.style.marginLeft) == 0))
    {
        displayWidth = tableDivEle.offsetWidth;
        tableDivEle.style.marginLeft = "0px";
    }
    else
    {
        displayWidth = parseInt(tableDivEle.style.marginLeft);
    }
    if (displayWidth < 0)
    {
        this.win.setTimeout("P2.slideOutLeft('" + tableName + "', '0')", 0);
    }
    else
    {
        this.win.setTimeout("P2.slideInLeft('" + tableName + "', '" + displayWidth + "')", 0);
    }
};

ExilityPage.prototype.slideInLeft = function (tableName, width)
{
    var tableEle = this.doc.getElementById(tableName + 'Container');
    if (!tableEle)
        tableEle = this.doc.getElementById(tableName);
    var currentWidth = parseInt(tableEle.style.marginLeft);
    var finalWidth = (-1 * parseInt(width));
    if (currentWidth > finalWidth)
    {
        currentWidth -= 6;
        if (currentWidth <= finalWidth)
        {
            currentWidth = finalWidth;
            tableEle.style.display = 'none';
        }
        tableEle.style.marginLeft = currentWidth + "px";
        this.win.setTimeout("P2.slideInLeft('" + tableName + "', '" + width + "')", 0);
    }
};

ExilityPage.prototype.slideOutLeft = function (tableName, width)
{
    var tableEle = this.doc.getElementById(tableName + 'Container');
    if (!tableEle)
        tableEle = this.doc.getElementById(tableName);
    var currentWidth = parseInt(tableEle.style.marginLeft);
    var finalWidth = parseInt(width);
    if (currentWidth < finalWidth)
    {
        currentWidth += 6;
        if (currentWidth >= finalWidth)
        {
            currentWidth = finalWidth;
        }
        tableEle.style.marginLeft = currentWidth + "px";
        this.win.setTimeout("P2.slideOutLeft('" + tableName + "', '" + width + "')", 0);
        tableEle.style.display = 'block';
    }
};

ExilityPage.prototype.toggleSlideRight = function (tableName)
{
    var tableEle = this.doc.getElementById(tableName + 'Container');
    var wrapperEle = this.doc.getElementById(tableName + 'Wrapper');

    if (!wrapperEle)
        wrapperEle = this.doc.getElementById(tableName);
    else
        tableName = tableName + 'Wrapper';

    var displayWidth = null;
    if (wrapperEle.style.width == "")
    {
        wrapperEle.storeWidth = wrapperEle.offsetWidth + 2;
        if (tableEle)
            displayWidth = parseInt(tableEle.style.width);
        else
            displayWidth = parseInt(wrapperEle.style.width);
        wrapperEle.style.width = (wrapperEle.offsetWidth + 2) + "px";
    }
    else
    {
        displayWidth = parseInt(wrapperEle.style.width);
        if (displayWidth > 0)
            wrapperEle.storeWidth = displayWidth;
    }

    if (displayWidth > 0)
    {
        this.win.setTimeout("P2.slideInRight('" + tableName + "', '0')", 0);
    }
    else
    {
        this.win.setTimeout("P2.slideOutRight('" + tableName + "', '" + parseInt(wrapperEle.storeWidth) + "')", 0);
    }
};

ExilityPage.prototype.slideInRight = function (tableName, width)
{
    var tableEle = this.doc.getElementById(tableName);
    var currentWidth = parseInt(tableEle.style.width);
    var finalWidth = parseInt(width);
    if (currentWidth > finalWidth)
    {
        currentWidth -= 6;
        if (currentWidth <= finalWidth)
        {
            currentWidth = finalWidth;
            tableEle.style.display = 'none';
        }
        tableEle.style.width = currentWidth + "px";
        this.win.setTimeout("P2.slideInRight('" + tableName + "', '" + width + "')", 0);
    }
};

ExilityPage.prototype.slideOutRight = function (tableName, width)
{
    var tableEle = this.doc.getElementById(tableName);
    var currentWidth = parseInt(tableEle.style.width);
    var finalWidth = parseInt(width);
    if (currentWidth < finalWidth)
    {
        currentWidth += 6;
        if (currentWidth >= finalWidth)
            currentWidth = finalWidth;
        tableEle.style.width = currentWidth + "px";
        this.win.setTimeout("P2.slideOutRight('" + tableName + "', '" + width + "')", 0);
        tableEle.style.display = 'block';
    }
};
