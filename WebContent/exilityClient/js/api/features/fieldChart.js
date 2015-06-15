/**
 * @module this is the refined version of ChartField that is re-structured to
 *         implement drivers for actual plotting. charts are abstracted, and an
 *         interface is opened for us to use different plotting libraries. We
 *         have used PLOTR, and high-chart. Driver is still work-in progress and
 *         needs some actual projects to use and test thoroughly
 */

/**
 * @class extends ChartField as a base class for specific charts
 * @note Due to historic reason, we have issue with naming convention of
 *       attribute names. Several of them are all lower-case, which is against
 *       our standard of camel-case.
 */
var ChartField = function() {
	AbstractField.call(this);
	this.chartType = 'DEFAULT';
	this.showLegends = true;
	this.yaxislabelformatterid = null;
	this.colors = [ '#1D7CDC', '#0A233B', '#89BD00', '#950300', '#00ACD0',
			'#492873', '#F69035', '#72A0E9', '#C9271E' ];
	this.xaxiscolumn = null;
	this.yaxiscolumn = null;
	this.isMultiDataSet = false;
	this.groupbycolumn = null;
};

ChartField.prototype = new AbstractField;
/**
 * Flexibility for programmers to set the legend area
 * 
 * @param legend
 *            object with various attributes of legend.
 * @refer LEGEND_OPTIONS
 */
ChartField.prototype.setLegend = function(legend) {
	this.legend = legend;
};

/**
 * get current legend options
 * 
 * @returns object with attributes for setting legend options
 * @refer LEGEND_OPTIONS
 */
ChartField.prototype.getLegend = function() {
	return this.legend;
};

/**
 * this is a standard interface of AbstractField. To be implemented by actual
 * chart field
 * 
 * @param ele
 *            dom element where chart is to be drawn
 * @param val
 *            value to be set.
 */
ChartField.prototype.setValueToObject = function(ele, val) {
	//
};

/**
 * Controller (P2) uses this interface to render data
 * 
 * @param grid
 *            as received from the server
 */
ChartField.prototype.fillReport = function(grid) {
	this.setGrid(grid);
};
/**
 * this is the way to draw the chart
 * 
 * @param grid
 *            as received from the server
 */
ChartField.prototype.setGrid = function(grid) {
	this.value = grid;
	var win = this.P2.win;
	var ele = win.document.getElementById(this.name);
	if (!ele) {
		debug('Design Error: No dom element found with name ' + this.name
				+ ' for chart field, and hence no chart is drawn.');
		return;
	}
	if (!grid || grid.length < 2) // let us just clean-up
	{
		ele.innerHTML = '';
		ele.setAttribute('data-noData', 'data-noData');
		debug('No data for for chart ' + this.name);
		return;
	}

	ele.removeAttribute('data-noData');

	var options = this.getOptions();
	var dataSeries = this.getDataSeries(grid, options);
	if (!this.eventsAssigned) // first time
	{
		var onClickFn = null;
		var onMoveFn = null;
		if (this.onClickFunctionName) {
			onClickFn = this.P2.win[this.onClickFunctionName];
			if (!onClickFn || typeof (onClickFn) != 'function') {
				debug('Onclick function ' + this.onClickFunctionName
						+ ' is not defined in user page');
			} else
				this.mouseClicked = onClickFn;
		}

		if (this.onMoveFunctionName) {
			onMoveFn = this.P2.win[this.onMoveFunctionName];
			if (!onMoveFn || typeof (onMoveFn) != 'function') {
				debug('onMoveFunctionName ' + this.onMoveFunctionName
						+ ' is not defined in user page');
			} else
				this.mouseMoved = onMoveFn;
		}
		this.eventsAssigned = true;
	}

	this.drawChart(dataSeries, options);
};

/**
 * this method is over-ridden and implemented in the driver
 * 
 * @param dataSeries
 * @param options
 */
ChartField.prototype.drawChart = function(dataSeries, options) {
	alert("Index page for this project has not loaded chart driver. Chart will not be showing-up.");
};

// all chart options are attributes of the object that is returned
ChartField.prototype.getOptions = function() {
	var options = {};

	if (this.rawDataDisplay && this.rawDataDisplay != 'none')
		options.rawDataDisplay = this.rawDataDisplay;

	if (this.colors) {
		if (this.colors.split) {
			// it is a string set by page designer
			options.colors = this.colors.split(',');
		} else {
			options.colors = this.colors;
		}
	}

	if (this.labelColor) {
		options.labelColor = this.labelColor;
	}
	options.legend = this.getLegendOptions();

	// allow specific chart to add its own options
	if (this.addSpecialOptions)
		this.addSpecialOptions(options);

	return options;
};

/**
 * this must be implemented by specific chart
 * 
 * @param grid
 *            data as received from server
 * @param options
 *            object that has chart options as attributes
 */
ChartField.prototype.getDataSeries = function(grid, options) {
	debug('Design error: getDataSeries is not implemented for chart field '
			+ this.name);
};
/**
 * standardized legend options. maps Exility attribute names to legend
 * attributes. We has used flotr as the charting library. we haev standardized
 * on the attribute names used by flotr. Drivers should translate these to
 * desired form
 */
ChartField.LEGEND_OPTIONS = {
	legendNbrColumns : 'noColumns',
	legendLabelFormatter : 'labelFormatter',
	legendLabelBoxBorderColor : 'labelBoxBorderColor',
	legendPosition : 'position',
	legendContainer : 'container',
	legendMargin : 'margin',
	legendBackgroundColor : 'backgroundColor',
	legendBackgroundOpacity : 'backgroundOpacity',
	legendHighlight : 'legendHighlight'
};

/**
 * pick legend attributes from field into standard legend object
 * 
 * @returns an object wit standard legend options
 * @refer LEGEND_OPTIONS
 */
ChartField.prototype.getLegendOptions = function() {
	var legend = {
		show : true
	};
	for ( var opt in ChartField.LEGEND_OPTIONS) {
		var val = this[opt];
		if (val) {
			legend[ChartField.LEGEND_OPTIONS[opt]] = val;
		}
	}

	if (legend.labelFormatter) // this needs to be a function
	{
		var fn = this.P2.win[legend.labelFormatter];
		if (fn) {
			legend.labelFormatter = fn;
		} else {
			debug(legend.labelFormatter
					+ ' is specified as a formatter, but a function with that name is not defined for this page.');
			delete legend.labelFormatter;
		}
	}

	return legend;
};

/**
 * get data of the form [[x1,y1],[x2,y2].......] from a grid of the form
 * [[headerRow][row1].....] where row is an array of data that includes teh
 * columns for x and y
 * 
 * @param grid
 *            data as received from server
 * @returns Array in the desired format
 */
ChartField.prototype.getXYSeries = function(grid) {
	var series = [];
	/*
	 * find x, y and group column names
	 */
	var header = grid[0];
	if (header.length < 2) // obviously not enough data
	{
		debug('Data for chart ' + this.name + ' has less than two columns');
		return series;
	}
	/*
	 * 0th column is x and 1st is y by default
	 */
	var xIdx = 0;
	var yIdx = 1;
	var hIdx = null; // helpText
	/*
	 * get them if field has specifically set them
	 */
	if (this.xaxiscolumn || this.yaxiscolumn || this.helpTextColumn) {
		for ( var i = 0; i < header.length; i++) {
			var colName = header[i];
			if (colName == this.xaxiscolumn) {
				xIdx = i;
			} else if (colName == this.yaxiscolumn) {
				yIdx = i;

			} else if (colName == this.helpTextColumn) {
				hIdx = i;
			}
		}
	}

	this.helpTexts = (hIdx == null) ? null : [];
	for ( var i = 1; i < grid.length; i++) {
		var row = grid[i];
		series.push([ row[xIdx], row[yIdx] ]);
		if (hIdx != null)
			this.helpTexts.push(row[hIdx]);
	}
	return series;
};

/**
 * Common method used by specific chart fields to convert input data grid into
 * the right format for the driver
 * 
 * @param grid -
 *            input data grid
 * @param columnNames
 *            to be extracted into output grid, in that order
 * @returns grid with columns in the right order
 */
ChartField.prototype.getColumnData = function(grid, columnNames) {
	var win = this.P2.win;
	var series = new win.Array();
	var origNbrCols = columnNames.length;
	/*
	 * find x, y and group column names
	 */
	var header = grid[0];
	if (this.helpTextColumn) {
		columnNames.push(this.helpTextColumn);
	}
	if (this.groupHelpTextColumn) {
		columnNames.push(this.groupHelpTextColumn);
	}
	var nbrCols = columnNames.length;
	var indexes = [];
	for ( var j = 0; j < nbrCols; j++) {
		indexes[j] = j; // default is that they are in that order
		var colName = columnNames[j];
		if (!colName) {
			continue;
		}
		var idx = null;
		for ( var i = 0; i < header.length; i++) {
			if (colName == header[i]) {
				idx = i;
				break;
			}
		}
		if (idx == null) {
			debug('Column '
					+ colName
					+ ' is not found in data for chart '
					+ this.name
					+ '. Default column is used, and the chart may not render properly');
		} else {
			indexes[j] = idx;
		}
	}

	/*
	 * help column
	 */
	var hIdx = null;
	/*
	 * group help column
	 */
	var ghIdx = null;
	this.helpTexts = null;
	if (this.helpTextColumn) {
		hIdx = indexes[origNbrCols];
		this.helpTexts = [];
		if (this.groupHelpTextColumn) {
			ghIdx = indexes[origNbrCols + 1];
		}
	}

	for ( var i = 1; i < grid.length; i++) {
		var row = grid[i];
		var newRow = new win.Array();
		for ( var j = 0; j < nbrCols; j++) {
			newRow.push(row[indexes[j]]);
		}
		series.push(newRow);
		if (this.helpTexts) {
			/*
			 * group and help texts. We also assume that group help is provided
			 * only if help is provided
			 */
			if (ghIdx) {
				this.helpTexts.push([ row[hIdx], row[ghIdx] ]);
			} else {
				this.helpTexts.push(row[hIdx]);
			}
		}
	}
	return series;
};

/**
 * @class PieChart
 */
var PieChart = function() {
	ChartField.call(this);
	this.chartType = 'PIE';
};

PieChart.prototype = new ChartField;

/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param options
 *            options object
 * @returns column data in the form that the common charting driver expects
 */
PieChart.prototype.getDataSeries = function(grid, options) {
	return this.getColumnData(grid, [ this.xaxiscolumn, this.yaxiscolumn ]);
};

/**
 * ******************************Bar Chart and stacked bar
 * chart**************************
 */
var BarChart = function() {
	ChartField.call(this);
	this.chartType = 'BAR';
	this.direction = 'vertical';
	this.stacking = false;
};
/**
 * Inherit from ChartField. i.e Add ChartField() to __proto__ property in
 * BarChart, then we can access ChartField() using "this" in constructor
 * BarChart().
 */
BarChart.prototype = new ChartField;

/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param options
 *            options object
 * @returns column data in the form that the common charting driver expects
 */
BarChart.prototype.getDataSeries = function(grid, options) {
	var columnNames = [];

	if (this.isMultiDataSet)
		columnNames = [ this.xaxiscolumn, this.yaxiscolumn, this.groupbycolumn ];
	else
		columnNames = [ this.xaxiscolumn, this.yaxiscolumn ];

	if (this.direction == 'horizontal')
		columnNames.swapItemsByIndex(0, 1);

	return this.getColumnData(grid, columnNames);
};

Array.prototype.swapItemsByIndex = function(x, y) {
	this[x] = this.splice(y, 1, this[x])[0];
	/*
	 * following declaration is only to avoid eclipse marking a warning about
	 * type mismatch. we are just returning 'this';
	 */
	var valueToReturn;
	valueToReturn = this;
	return valueToReturn;
};

/** ******************************Line Chart************************** */
var LineChart = function() {
	ChartField.call(this);
	this.type = 'LINE';
};

/**
 * Inherit from ChartField i.e Add ChartField() to __proto__ property in
 * LineChart, then we can access ChartField() using "this" in constructor
 * LineChart().
 */
LineChart.prototype = new ChartField;

/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param options
 *            options object
 * @returns column data in the form that the common charting driver expects
 */
LineChart.prototype.getDataSeries = function(grid, options) {
	var columnNames = [];

	if (this.isMultiDataSet)
		columnNames = [ this.xaxiscolumn, this.yaxiscolumn, this.groupbycolumn ];
	else
		columnNames = [ this.xaxiscolumn, this.yaxiscolumn ];

	return this.getColumnData(grid, columnNames);
};

/**
 * @class BulletChart
 */
var BulletChart = function() {
	ChartField.call(this);
	this.type = 'BULLET';
	this.colors = [ '#3F81B7', '#000000', '#CCCCCC', '#EEEEEE' ];
};

BulletChart.prototype = new ChartField;

/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param options
 *            options object
 * @returns column data in the form that the common charting driver expects
 */
BulletChart.prototype.getDataSeries = function(grid, options) {
	var columnNames = [ this.valueOfInterest, this.comparativeValue,
			this.firstQualitativeRange, this.secondQualitativeRange,
			this.bulletlabelcolumn ];
	return this.getColumnData(grid, columnNames);
};

/**
 * @class SunBurstChart
 */
var SunBurstChart = function() {
	ChartField.call(this);
	this.type = 'SUNBURST';
	/*
	 * Column that has the data (value). if omitted, use first (0th column).
	 */
	this.distributionvaluecolumn = null;
	/*
	 * Column that has the label at the detail level. if omitted, defaults to
	 * second column.
	 */
	this.level2column = null;
	/*
	 * column that has the label for the group. defaults to third column
	 */
	this.level1column = null;
	/*
	 * title for the chart. Assumed that this is same for all columns. Last row
	 * is used. Defaults to 4th coulmn.
	 */
	this.corecolumn = null;
	this.helpTextColumn = null;
	this.groupHelpTextColumn = null;
};

SunBurstChart.prototype = new ChartField;

/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param ele
 *            dom element inside which chart is to be drawn
 * @returns column data in the form that the common charting driver expects
 */
SunBurstChart.prototype.getDataSeries = function(grid, ele) {
	var columnNames = [ this.distributionvaluecolumn, this.level2column,
			this.level1column, this.corecolumn ];
	return this.getColumnData(grid, columnNames);
};
/**
 * @class SankeyChart
 */
var SankeyChart = function() {
	ChartField.call(this);
	this.type = 'SANKEY';
	/*
	 * Column that has the data (value). if omitted, use first (0th column).
	 */
	this.distributionvaluecolumn = null;
	/*
	 * Column that has the label for left side. defaults to second column.
	 */
	this.fromcolumn = null;
	/*
	 * column that has the label for the right side defaults to third column
	 */
	this.tocolumn = null;
	/*
	 * color to be used for highlighting charts for clicked bar
	 */
	this.highlightColor = null;
};

SankeyChart.prototype = new ChartField;
/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param ele
 *            dom element inside which chart is to be drawn
 * @returns column data in the form that the common charting driver expects
 */
SankeyChart.prototype.getDataSeries = function(grid, ele) {
	var columnNames = [ this.distributionvaluecolumn, this.fromcolumn,
			this.tocolumn ];
	return this.getColumnData(grid, columnNames);
};
/**
 * @class SpeedometerChart
 */
var SpeedometerChart = function() {
	ChartField.call(this);
	this.type = 'SPEEDOMETER';
	/*
	 * Column that has the data (value). if omitted, use first (0th column).
	 */
	this.distributionvaluecolumn = null;
	/*
	 * Column that has the label for left side. defaults to second column.
	 */
	this.fromcolumn = null;
	/*
	 * column that has the label for the right side defaults to third column
	 */
	this.tocolumn = null;
	/*
	 * color to be used for highlighting charts for clicked bar
	 */
	this.highlightColor = null;
};

SpeedometerChart.prototype = new ChartField;
/**
 * get data series from the supplied grid. use getColumnData() with appropriate
 * parameters
 * 
 * @param grid
 *            data grid
 * @param options
 *            options object
 * @returns column data in the form that the common charting driver expects
 */
SpeedometerChart.prototype.getDataSeries = function(grid, options) {
	var columnNames = [ this.xaxiscolumn, this.yaxiscolumn ];
	return this.getColumnData(grid, columnNames);
};
