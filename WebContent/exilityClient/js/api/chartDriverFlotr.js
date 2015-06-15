/*this file is included in the index page of the project after field.js */

/**
 * @fileOverview This file acts as a driver for the flotr charting library.
 * @fileDescription 
 * 1) The primary purpose of this file is to prepare input data from exility grid object and handle data to flotr chart library.
 * 2) set chart options before handling data to flotr chart library like xaxis labels, yaxis labels, colors, margins etc.
 * @name flotrDriver.js
 * @version 1.0.2
 * Version history
 * 1.0.0	19/03/2013   	Bhandi
 * 1.0.1	24/06/2013     	Vinay
 * 1.0.2	27/08/2013		Vinay
 */

if (!window.ChartField)
{
	alert('chart driver file is not included properly in your project. Charts will not work in your project');
	//create dummy objects to avoid exceptions
	window.ChartField = {};
	window.PieChart = {};
	window.LineChart = {};
	window.BarChart = {};
	window.AreaChart = {};
	window.SankeyChart = {};
	window.SunBurstChart = {};
}

if (window.FlotrDriver)
{
	alert("Charts will not work in your project.\n "+
		   "Namespace by the name FlotrDriver is already defined by Exility Framework. " +
			"Please use different namespace in your user code.");
}

/**
 * The FlotrDriver global namespace object. 
 *  
 * @class FlotrDriver
 * @static
 */
var FlotrDriver = {};

/***
 * prepare data, set required options and handle to flotr library to draw pie chart.
 * 
 * @param {Object} data - The data for pie chart.
 * @param {Object} options.
 * 
 * Data Format:
 * [[xaxisColumnValue_1, yaxisColumnValue_1, helpText_1],[xaxisColumnValue_2, yaxisColumnValue_2, helpText_2],[xaxisColumnValue_3, yaxisColumnValue_3, helpText_3] ...]
 */
PieChart.prototype.drawChart = function (data, options)
{
	var chartType = 'PIE';
	//setting options for chart 
	options = FlotrDriver.setDefaultOptions(this, options);
	//handle to flotr to draw chart
	var f = this.P2.win.Flotr.draw(this.container, [data], options, chartType);
	this.setLegend(f.getLegend());
};

/***
 * prepare data, set required options and handle to flotr library to draw line chart.
 * @lends LineChart
 * @param {Object} data - The data for line chart.
 * @param {Object} options.
 * 
 * Data Format:
 * 1) Normal Data
 * {data: [[0,0], [idx_1, yaxiscolumnValue_1, helpText_1], [idx_2, yaxiscolumnValue_2, helpText_2], [idx_3, yaxiscolumnValue_3, helpText_3] ....] }
 * 
 * 
 * Note: 
 * --> [0,0] is for x-y origin value in chart.
 * --> xaxisColumnvalue i.e xaxis tick label values will be present in options object.
 * 
 * 2) MultiSet Data.
 *  	[ 
		  	{ data: [[0,0], [1, yaxiscolumnValue_1, helpText_1, row_Idx_1], [2, yaxiscolumnValue_4, helpText_4, row_Idx_4],.... ], 
		  	  label: groupbyValue1 },
			{ data: [[0,0], [1, yaxiscolumnValue_3, helpText_3, row_Idx_3], [2, yaxiscolumnValue_6, helpText_6, row_Idx_6],.... ], 
			  label: groupbyValue2 },
			{ data: [[0,0], [1, yaxiscolumnValue_5, helpText_5, row_Idx_5], [2, yaxiscolumnValue_2, helpText_2, row_Idx_2],.... ], 
			  label: groupbyValue3 }
		  ]
 * 
 */
LineChart.prototype.drawChart = function (data, options)
{
	var chartType = 'LINE';
	options = FlotrDriver.setDefaultOptions(this, options);
	options.points = {show:true, fill:true},
	options.lines = {show:true};
	options.xaxis = FlotrDriver.getXyLabelOptions(this, data);
	options.yaxis = {};
	
	if(this.yLabelFormatterFunction)
		options.yaxis.tickFormatter = this.P2.win[this.yLabelFormatterFunction];
		
	if(this.xLabelFormatterFunction)
	options.xaxis.tickFormatter = this.P2.win[this.xLabelFormatterFunction];
	
	//formating the data according to flotr
	data = FlotrDriver.createSeriesData(this, data);
	this.P2.win.Flotr.draw(this.container, data, options, chartType);
};

/***
 * prepare data, set required options and handle to flotr library to draw bar chart.
 * @lends BarChart
 * @param {Object} data - The data for bar chart.
 * @param {Object} options.
 * 
 *  * Data Format:
 * 1) Normal Data
 * {data: [[0,0], [1, yaxiscolumnValue_1, helpText_1], [2, yaxiscolumnValue_2, helpText_2], [3, yaxiscolumnValue_3, helpText_3] ....] }
 * 
 * 
 * Note: 
 * --> [0,0] is for x-y origin value in chart.
 * --> xaxisColumnvalue i.e xaxis tick label values will be present in options object.
 * 
 * 2) MultiSet Data.
 *  	[ 
		  	{ data: [[0,0], [1, yaxiscolumnValue_1, helpText_1, row_Idx_1], [2, yaxiscolumnValue_4, helpText_4, row_Idx_4],.... ], 
		  	  label: groupbyValue1 },
			{ data: [[0,0], [1, yaxiscolumnValue_3, helpText_3, row_Idx_3], [2, yaxiscolumnValue_6, helpText_6, row_Idx_6],.... ], 
			  label: groupbyValue2 },
			{ data: [[0,0], [1, yaxiscolumnValue_5, helpText_5, row_Idx_5], [2, yaxiscolumnValue_2, helpText_2, row_Idx_2],.... ], 
			  label: groupbyValue3 }
		  ]
		  
For horizontal bar charts
--> xaxisColumnvalue will be in series data and yaxis column value will be in option object.
	
	1) Normal Data
 * {data: [[0,0], [xaxiscolumnValue_1, 1, helpText_1], [xaxiscolumnValue_2, 2, helpText_2], [xaxiscolumnValue_3, 3, helpText_3] ....] }
 * 
 * 2) MultiSet Data.
 *  	[ 
		  	{ data: [[0,0], [xaxiscolumnValue_1, 1, helpText_1, row_Idx_1], [xaxiscolumnValue_4, 2, helpText_4, row_Idx_4],.... ], 
		  	  label: groupbyValue1 },
			{ data: [[0,0], [xaxiscolumnValue_3, 1, helpText_3, row_Idx_3], [xaxiscolumnValue_6, 2, helpText_6, row_Idx_6],.... ], 
			  label: groupbyValue2 },
			{ data: [[0,0], [xaxiscolumnValue_5, 1, helpText_5, row_Idx_5], [xaxiscolumnValue_4, 2, helpText_2, row_Idx_2],.... ], 
			  label: groupbyValue3 }
		  ]
 */
BarChart.prototype.drawChart = function (data, options)
{
	var stacking = this.stacking;
	var direction = this.direction;
	//get chart type
	var chartType = FlotrDriver.getBarChartType(stacking, direction);
	options = FlotrDriver.setDefaultOptions(this, options);
	//set bar chart specific options
	options.bars = { show: true };
	options.xaxis = {};
	options.yaxis = {};
	
	if(this.direction == 'horizontal')
		options.yaxis = FlotrDriver.getXyLabelOptions(this, data);
	else
		options.xaxis = FlotrDriver.getXyLabelOptions(this, data);
	
	if(this.yLabelFormatterFunction)
	options.yaxis.tickFormatter = this.P2.win[this.yLabelFormatterFunction];
	
	if(this.xLabelFormatterFunction)
	options.xaxis.tickFormatter = this.P2.win[this.xLabelFormatterFunction];
	
	//formating the data according to flotr.
	data = FlotrDriver.createSeriesData(this, data);
	this.P2.win.Flotr.draw(this.container, data, options, chartType);
};

/***
 *prepare data, set required options and handle to flotr library to draw sunburst chart.
 * @lends SunBurstChart
 * @param {Object} data - The data for sun burst chart.
 * @param {Object} options.
 * Data Format : [[distributionvaluecolumn, level2column, level1column, corecolumn], [distributionvaluecolumn, level2column, level1column, corecolumn] ....]
 */
SunBurstChart.prototype.drawChart = function (data, options)
{
	var chartType = 'SUNBURST';
	options = FlotrDriver.setDefaultOptions(this, options);
	this.P2.win.Flotr.draw(this.container, [data], options, chartType);
};

/***
 * prepare data, set required options and handle to flotr library to draw sankey chart.
 * @lends SankeyChart
 * @param {Object} data - The data for sankey chart.
 * @param {Object} options.
 * Data Format: [[distributionvaluecolumn, fromcolumn, tocolumn], [distributionvaluecolumn, fromcolumn, tocolumn]....]
 */
SankeyChart.prototype.drawChart = function (data, options)
{
	var chartType = 'SANKEY';
	options = FlotrDriver.setDefaultOptions(this, options);
	this.P2.win.Flotr.draw(this.container, [data], options, chartType);
};

/***
 * prepare data, set required options and handle to flotr library to draw bullet chart.
 * @lends BulletChart
 * @param {Object} data - The data for bullet chart.
 * @param {Object} options.
 * 
 * Data Format: 
 * [
 * 	{data: [valueOfInterest, comparativeValue, firstQualitativeRange, secondQualitativeRange, helpText], label: bulletlabelcolumn}
 * ,{data: [valueOfInterest, comparativeValue, firstQualitativeRange, secondQualitativeRange, helpText], label: bulletlabelcolumn}
 * ,{data: [valueOfInterest, comparativeValue, firstQualitativeRange, secondQualitativeRange, helpText], label: bulletlabelcolumn} ...
 * ]
 * 
 * @description Bullet graphs are used to compare one value, represented by a horizontal bar, to another value,
 * represented by a vertical line, and relate those to qualitative ranges.
 */
BulletChart.prototype.drawChart = function (data, options)
{
	var chartType = 'BULLET';
	options = FlotrDriver.setDefaultOptions(this, options);
	var series = new this.P2.win.Array();
	data.each(function(item) {
		series.push({ data: item });
	});

	this.P2.win.Flotr.draw(this.container, series, options, chartType);
};

/***
 * prepare data, set required options and handle to flotr library to draw speedometer chart.
 * @lends SpeedometerChart
 * @param {Object} data - The data for speedometer chart.
 * @param {Object} options.
 */
SpeedometerChart.prototype.drawChart = function (data, options)
{
	var chartType = 'SPEEDOMETER';
	options = FlotrDriver.setDefaultOptions(this, options);
	var series = new this.P2.win.Array();
	var spData = [];
	data.each(function(item) {
		spData.push(item[1]);
	});
	data = series.push([spData]);
	this.P2.win.Flotr.draw(this.container, [data], options, chartType);
};

/***
 * Set default chart option values and mouse event function names.
 * 
 * @function setDefaultOptions
 * @param {Object} chart - The chart element Object.
 * @param {Object} options - The option object to set.
 * @returns {Object} options.
 */
FlotrDriver.setDefaultOptions = function (chart, options)
{ 
	/**container where chart has to be drawn.*/
	chart.container = chart.P2.win.$(chart.name + "Container");
	
	/**set the mouse options here.*/
	options.mouse = { track: true };
	
	/**
	 *  chart is drawn on a canvas where it has 3 sections; 
		1. Bottom x-axis label values section.
		2. Left y-axis label values section.
		3. center chart section named as chart grid.
		
		chart grid should have proper margins at 
		1.Left side for y-axis values and its label.
		2.Bottom side for x-axis values and its label.
		
		Note: value of 35px is set as default to have a nice margin.
	*/
	
	options.grid = {};
	 /**
     * @default "35px"
     */
	options.grid.labelLeftMargin = chart.marginLeft || 35;
	/**
     * @default "35px"
     */
	options.grid.labelBottomMargin = chart.marginBottom || 35;
	/**
     * @default "35px"
     */
	options.yLabelMaxWidth = chart.yLabelMaxWidth || 35;

	//bind mouse-click and mouse-move event functions
	FlotrDriver.bindEvents(chart); 
	
	return options;
};

/***
 * Set tooltip on mouse over if xaxislabels and yaxislabels overflows available width.
 * 
 * @function setLabelOverflowtoolTip
 * @param {Object} event - The mouse over event object.
 * @param {String} label - The label to be shown on mouse over.
 */
FlotrDriver.setLabelOverflowtoolTip = function(event, label) {
	var ele = event.target;
	if(ele.offsetWidth < ele.scrollWidth)//text is overflowed
	ele.title = label;
};


/***
 * Get chart type among bar charts(bar, horizontalBar, stacked, horizontalStacked) .
 * 
 * @function getBarChartType
 * @param {Boolean} stacking - stacking is true for stacked bar charts and false for normal bar charts.
 * @param (String) direction - direction is horizontal for horizontal bar charts and vertical for vertical bar charts.
 * @returns {String} chartType - The chart type among bar charts.
 */

FlotrDriver.getBarChartType = function(stacking, direction) {

	if( !stacking && direction == 'vertical') {
		return 'BAR';
	}
	if( stacking && direction == 'vertical') {
		return 'STACKED';
	}
	if( !stacking && direction == 'horizontal') {
		return 'HORIZONTALBAR';
	}
	if( stacking && direction == 'horizontal') {
		return 'HORIZONTALSTACKED';
	}
};

/**
 * @function createSeriesData
 * @param {Object} chart - The chart element object (this)
 * @param {Array} grid - The chart data in grid format i.e 2d array.
 * @returns {Array} series - The series data for multisetdata in line and bar chart is of the form 
		  [ 
		  	{ data: [[0,0], [labelIdx1, data1, helptext1], [labelIdx2, data2, helptext2] ], 
		  	  label: groupbyValue1 },
			{ data: [[0,0], [labelIdx1, data3, helptext3], [labelIdx2, data4, helptext4] ], 
			  label: groupbyValue2 },
			{ data: [[0,0], [labelIdx1, data5, helptext5], [labelIdx2, data6, helptext6] ], 
			  label: groupbyValue3 }
		  ]
		  
		  -The series data for normal data in line and bar chart is of the form 
		  [{data: [[0,0], [labelIdx1, data1], [labelIdx2, data2], [labelIdx3, data3] ....] }]	  
 */
FlotrDriver.createSeriesData = function (chart, grid)
{
	//creating array in current window. such that prototype library methods gets inherited automatically.
	var series = new chart.P2.win.Array();
	var axisLabels = chart.axisLabels;
	if(chart.isMultiDataSet)
	{
		var count = 1;
		//inserting row id in grid for each row
		grid.each(function(item) {
			var eachRow = item;
			var lastIndex = eachRow.length;
			eachRow.splice(lastIndex, 0, count);
			count++;
		});

		var groupByValues = [];
		var gColIdx = 2;//group by column index
		//before starting group by operation, sort grid based on groupbycolumn, .
		grid = grid.sort(function(a,b){
			if (a[gColIdx] < b[gColIdx]) return -1;
			if (a[gColIdx] > b[gColIdx]) return 1;
			return 0;
		});
		//storing group values in groupByValues array.
		grid.each(function(item) {
			groupByValues.push(item[gColIdx]);
		});
		//getting distinct values from groupByValues array
		groupByValues = sort_unique(groupByValues);

		for (var idx = 0; idx < groupByValues.length; idx++) 
		{
			var dataByGroup = { label: '', data: [] };
			dataByGroup.label = groupByValues[idx];//setting group by label
			for (var rowId = 0; rowId < grid.length; rowId++) 
			{
				var dataSet = [];
				if( groupByValues[idx] == grid[rowId][gColIdx] )
				{
					for (var i = 0; i < axisLabels.length; i++) 
					{
						if(axisLabels[i] == grid[rowId][0])
							dataSet.push(i+1);// pushing id to map with axis labels.
					}

					dataSet.push(grid[rowId][1]);//data-axis value
					var helpText = grid[rowId][3] || '';// help-text value
					dataSet.push(helpText);
					dataSet.push(grid[rowId][4]);// row id value

					if(chart.direction && chart.direction == 'horizontal')
						dataSet.swapItemsByIndex(0, 1);//swap label and data index for horizontal charts.

					dataByGroup.data.push(dataSet);
				}
			}	
			dataByGroup.data.splice(0,0,[0,0]);//left padding [0,0] for data.
			series.push(dataByGroup);
		}
	}
	else
	{
		var data = FlotrDriver.simpleSeriesData(grid, chart.axisLabels);
		series.push(data);
	}
	return series;
};

/** series data for simple line and bar chart is of the form 
 * {data: [[0,0], [labelIdx1, data1], [labelIdx2, data2], [labelIdx3, data3] ....] }
 */
FlotrDriver.simpleSeriesData = function(grid, axisLabels)
{
	var seriesData = { data: [] };	
	for (var rowId = 0; rowId < grid.length; rowId++) 
	{
		var dataSet = [];
		for (var i = 0; i < axisLabels.length; i++) 
		{
			if(axisLabels[i] == grid[rowId][0])
				dataSet.push(i+1);// xaxis label id to map with xaxislabels.
		}
		dataSet.push(grid[rowId][1]);//y-axis value
		var helpText = grid[rowId][2] || '';// help-text value
		dataSet.push(helpText);
		dataSet.push(rowId + 1);//row id value
		
		
		seriesData.data.push(dataSet);
	}
	seriesData.data.splice(0,0,[0,0]);//left padding for data.

	return seriesData;
};

/**labelOptions is of the form 
 * {noTicks: nbrTicks, min:minTicks, max:maxTicks, ticks:[[tickx1, ticky1], [tickx2, ticky2].....]}
 */
FlotrDriver.getXyLabelOptions = function (chart, data)
{
	var labels = [];

	//filling labels array.
	for (var rowId = 0; rowId < data.length; rowId++) {
		var xval = data[rowId][0];
		labels.push(xval);
	}

	if(chart.isMultiDataSet){ 
		labels = sort_unique(labels); 
	}
	chart.axisLabels = labels;

	//adding left padding for labels array [' ', 'label1','label2','label3'].
	labels.splice(0,0," ");
	//adding right padding for labels array [' ', 'label1','label2','label3', ' '].
	labels.splice(labels.length,0," ");
	var n = labels.length;
	var minTicks = 0;
	var maxTicks = n - 1;
	var ticks = [];
	for (var i = 0; i < n; i++)
	{
		var labelParts = labels[i];
		ticks.push([i, labelParts]);
	}
	//Removing left  and right padding for labels array ['label1','label2','label3'].
	labels.splice(0,1);
	labels.splice(labels.length - 1, 1);

	return { noTicks: n, min: minTicks, max: maxTicks, ticks: ticks };
};

/** binding mouse events(mouseclick and mousemove) for chart*/
FlotrDriver.bindEvents = function bindEvents(chart)
{
	var container = chart.container;
	if (chart.helpTexts || chart.mouseMoved)
	{
		container.observe('flotr:mousemove', function (e)
				{
			var idx = e.memo && e.memo[1] && e.memo[1].rowIdx;
			if (chart.helpTexts)
			{
				chart.container.title = '';
				var txt = chart.helpTexts[idx - 1];
				if (txt)
					chart.obj.title = txt;
			}

			if (chart.mouseMoved)
				chart.mouseMoved(idx);
				});
	}

	if (chart.mouseClicked)
	{
		container.observe('flotr:click', function (e)
				{
					var idx = e.memo && e.memo[1] && e.memo[1].rowIdx;
					PM.debug(idx + '\n' + chart.mouseClicked);
					chart.mouseClicked(idx);
				});
	}
};

/**
 *@example 
 * pass array like [ 'label1','label2','label3','label1','label2','label3']
 * returns array with unique values[ 'label1','label2','label3']
 * */
var sort_unique = function(arr) 
{
	arr = arr.sort();
	var ret = [arr[0]];
	for (var i = 1; i < arr.length; i++) 
	{ // start loop at 1 as element 0 can never be a duplicate
		if (arr[i-1] !== arr[i]) {
			ret.push(arr[i]);
		}
	}
	return ret;
};