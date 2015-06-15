var ChartPanel = function ()
{
	AbstractTable.call(this);
};

ChartPanel.prototype = new AbstractTable;

/**
 * different charts use different sets of columns.
 */
ChartPanel.XY_COLUMNS = ['xAxisColumn', 'yAxisColumn'];

ChartPanel.chartTypes = {
		bar : ChartPanel.XY_COLUMNS,
		//multipleBar : ChartPanel.XY_COLUMNS
		//stackedBar : ChartPanel.XY_COLUMNS
		//horizontalBar : ChartPanel.XY_COLUMNS
		//horizontalStackeBar : ChartPanel.XY_COLUMNS
		//line : ChartPanel.XY_COLUMNS
		//multipleLine : ChartPanel.XY_COLUMNS
		//lineAndBar : ChartPanel.XY_COLUMNS
		//scatter : ChartPanel.XY_COLUMNS
		pie : ChartPanel.XY_COLUMNS
		//speedometer : ChartPanel.XY_COLUMNS
		//radar : ChartPanel.XY_COLUMNS
		//bubble : ChartPanel.XY_COLUMNS
		//run : ChartPanel.XY_COLUMNS
		//bullet : ['valueOfInterest', 'comparativeValue', 'firstQualitativeRange', 'secondQualitativeRange', 'bulletlabelcolumn']
		//sunBurst : ['distributionValueColumn', 'level2Column', 'level1Column', 'coreColumn']
		//sankey : ['distributionValueColumn', 'fromColumn', 'toColumn']
};

ChartPanel.prototype.setLegend = function(legend)
{
    this.legend = legend;
    return;
};

ChartPanel.prototype.getLegend = function()
{
    return this.legend;
};

//this is the way to draw the chart
ChartPanel.prototype.setData = function (dc)
{
	/*
	 * <div id="panelName"><div id="tableName" /><div id="tableNameLegend"></div> is the dom structure
	 * #chrtaTable is where the chart is drawn, and is referred as container
	 */
    if(!this.container){
        var win = this.P2.win;
        this.container = win.document.getElementById(this.name);
        this.legendContainer = win.document.getElementById(this.name + 'Legend');
        if (!this.container)
        {
            debug('Design Error: No dom element found with name ' + this.name + ' for chart Panel,' + this.panelaName);
            return;
        }
    }
	var grid = dc.getGrid(this.name);
	//just in case some one sent an object instead of an instance of DataCollection
	if(!grid && dc.grids){
		grid = dc.grids[this.name];
	}
    this.value = grid;
    if (!grid || grid.length < 2) //let us just clean-up
    {
        this.container.innerHTML = '';
        if(this.legendContainer) this.legendContainer.innerHTML = '';
        this.container.parentNode.setAttribute('exil-noData', 'exil-noData');
        debug('No data for chart ' + this.name);
        return false;
    }

    this.container.parentNode.removeAttribute('exil-noData');
    
    /*
     * get column names to be extracted for this chart
     */
    var columnNames = ChartPanel.chartTypes[this.chartType];
    if(!columnNames){
        this.container.innerHTML = this.chartType + ' is not implemented as a chart';
        if(this.legendContainer) this.legendContainer.innerHTML = '';
        return false;
    }
    
    var data = this.getColumnData(grid, columnNames);
    /*
     * delegate the actual drawing function to the concrete class
     */
   	ChartPanelDriver.draw(this, data);
};

//get an array of data rows extracted from given grid.
//each row contains columns as in columnNames parameter.
ChartPanel.prototype.getColumnData = function (grid, columnNames)
{
	var colIndexes = {};
	
	/*
	 * get column indexes for column names
	 */
    var header = grid[0];
    var nbrCols = header.length;
    for(var j = 0; j < nbrCols; j++){
    	colIndexes[header[j]] = j;
    }
    
    var series = [];
    var nbrCols = columnNames.length;
    var indexes = [];
    for (var j = 0; j < nbrCols; j++)
    {
    	indexes[j] = j;
    	var colName = this[columnNames[j]]; 
    	if(!colName){
    		debug(columnNames[j] + " not specified for chart " + this.name + " default column index " + j + " is assumed.");
    	}else{
	        var idx = colIndexes[colName];
	        if(idx || idx === 0){
	        	indexes[j] = idx;
	        }else{ 
	        	debug(colName + " is specified as the column name for " + columnNames[j] + " but this column is not found in the data grid. A default index of " + j + " is assumed");
	        }
    	}
    }

    var hIdx = null; //help and group help
    var i;
    var ghIdx = null;
	this.helpTexts = null;
    if (this.helpTextColumn){
        i = colIndexes[this.helpTextColumn];
        if(i || i === 0){
        	hIdx = i;
	        this.helpTexts = [];
	        if (this.groupHelpTextColumn){
	            i = colIndexes[this.groupHelpTextColumn];
	    	    if(i || i === 0)
	    	    	ghIdx = i;
	        }  
	    }else{
	        	debug(this.helpTextColumn + ' is not found as a column in data grid for chart ' + this.name);
	    }
	}

    /*
     * now go thru rows of grid and construct a new table with rows with desired columns in that
     */
    for (var i = 1; i < grid.length; i++)
    {
        var row = grid[i];
        var newRow =[];
        for (var j = 0; j < nbrCols; j++)
        {
            newRow.push(row[indexes[j]]);
        }
        series.push(newRow);
        
        /*
         * accumulate help texts as well
         */
        if (this.helpTexts)
        {
            if (ghIdx)
                this.helpTexts.push([row[hIdx], row[ghIdx]]); //array of primary help text and group help text
            else
                this.helpTexts.push(row[hIdx]);
        }
    }
    return series;
};


/*
 * Create a dummy driver. 
 * This should be over-ridden by a valid driver that should be included after this file
 * Also, this documents the expectations from a driver
 */

var ChartPanelDriver = {
	/**
	 * @param {ChartPanel} panel : 
	 * @param data rows of data, with two columns : first one is value and the second one is label
	 * @param options object with options that are relevant. for example colors is an array of colors to be used for pie same order as values in data
	 */
	draw : function (panel, data){
		var container = panel.container;
		var t = [];
		t.push('<div><h1>');
		t.push(panel.chartType);
		t.push(' CHART </h1>(You are seeing this data table because no charting driver is available to render charts)</div>');
		this.getDataHtml(panel, data, t);
		container.innerHTML = t.join('');
	},
	/**
	 * private function : put data rows into an html
	 */
	getDataHtml : function(panel, data, t){
		var nbrRows = data.length;
		var nbrCols = data[0] && data[0].length;
		if(!nbrCols){
			t.push('<br /><div> NO DATA </div><br />');
			return;
		}
		//write header row
		t.push('<table><thead><tr>');
		if(panel.helpTexts){
			t.push('<th>help text</th>');
		}
		for(var j = 0; j < nbrCols; j++){
			t.push('<th>col - ');
			t.push(j);
			t.push('</th>');
		}
		t.push('</tr></thead><tbody>');
		//data rows
		for(var i  = 0; i < nbrRows; i++){
			t.push('<tr>');
			var row = data[i];
			if(panel.helpTexts){
				t.push('<td>');
				t.push(panel.helpTexts[i]);
				t.push('</td>');
			}
			for(var j = 0; j < row.length; j++){
				t.push('<td>');
				t.push(row[j]);
				t.push('</td>');
			}
			t.push('</tr>');
		}
		t.push('</tbody></table><br /><br />');
	}
};

/********************************End of charts***************************/
