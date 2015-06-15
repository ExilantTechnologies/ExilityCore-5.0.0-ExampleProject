/*
Copyright (c) 2015 EXILANT Technologies Private Limited

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */

/*******************************************************************************
 * ****** Data format for highchart
 * 
 * 1) For line,bar,area chart series: [ { name: 'Tokyo', data: [7.0, 6.9, 9.5,
 * 14.5, 18.2, 23.3, 18.3, 13.9, 9.6] }, { name: 'New York', data: [0.2, 0.8,
 * 5.7, 11.3, 17.0, 20.1, 14.1, 8.6, 2.5] } ]
 * 
 * 2) For pie chart
 * 
 * series: [{ name: 'Browser share', data: [ ['Firefox', 45.0], ['IE', 26.8],
 * ['chrome', 12.8], ['Safari', 8.5], ['Opera', 6.2], ['Others', 0.7] ] }]
 * 
 ******************************************************************************/

function drawHighChart(options, grid) {
	try {
		/* global variables */
		var xaxisColumnIndex = null;
		var yaxisColumnIndex = null;
		var groupByColumnIndex = null;

		var series = [];
		var chartData = {};
		var data = [];
		var chartType;
		var toolTip = {};
		var chartPlotOptions = {};
		var xaxiscategories = [];
		var myXaxisCategories = [];
		var groupByArray = [];
		var xaxisArray = [];
		var margin = [];
		var legend = {
			enabled : false
		};
		var colors = [ '#5580FF', '#00CED1', '#CFC890', '#D87093', '#FFA07A',
				'#87CEFA', '#9ACD32', '#7EC7BE', '#CD853F', '#7B68EE',
				'#FF6347', '#DA70D6', '#FFE4E1', '#FFF0F5' ];// Added by
																// Hemanth:Need
																// more colors
																// for
																// sankeychart.
		var maxCharForLabels = options.maxCharForLabels - 3;// for 3 dot
															// ellipsis.
		/* end of global variables */

		/* getting column indexes of table */
		var gridHeader = grid[0];
		for ( var i = 0; i < gridHeader.length; i++) {
			if (gridHeader[i] == options.xaxiscolumn)
				xaxisColumnIndex = i;

			if (gridHeader[i] == options.yaxiscolumn)
				yaxisColumnIndex = i;

			if (options.isMultiDataSet) {
				if (gridHeader[i] == options.groupbycolumn)
					groupByColumnIndex = i;
			}
		}

		/* setting chart type value w.r.t Highchart */
		switch (options.chartType) {
		case 'DEFAULT':
			chartType = 'line';
			margin = [ 80, 80, 80, 80 ];
			legend = {
				enabled : true,
				layout : 'vertical',
				align : 'right',
				verticalAlign : 'top',
				x : 0,
				y : 100,
				borderWidth : 1
			};
			break;

		case 'BAR':
			chartType = 'column';
			margin = [ 80, 80, 80, 80 ];
			legend = {
				enabled : false
			};
			break;

		case 'AREA':
			chartType = 'area';
			margin = [ 80, 80, 80, 80 ];
			break;

		case 'PIE':
			chartType = 'pie';
			margin = [ 0, 100, 0, 195 ];
			break;

		case 'HORIZONTALBAR':
			chartType = 'bar';
			margin = [ 15, 80, 80, 175 ]; // modified margin-top as exporting
											// icon is removed by
											// Anand-23-July-2013
			if (options.isMultiDataSet)
				legend = {
					enabled : true
				};
			break;

		case 'HORIZONTALSTACKED':
			chartType = 'bar';
			margin = [ 10, 80, 120, 175 ];// modified margin-top as exporting
											// icon is removed by
											// Anand-23-July-2013
			if (options.isMultiDataSet)
				legend = {
					enabled : true
				};
			chartPlotOptions = {
				series : {
					stacking : 'normal'
				}
			};
			break;

		default:
			chartType = 'line';
			margin = [ 80, 80, 80, 80 ];
		}

		/* sort grid without header */
		function arraySwap(array) {
			if (!array || !array.length)
				return array;

			var left = 1;
			var right = array.length - 1;
			for (; left < right; left++, right--) {
				var temporary = array[left];
				array[left] = array[right];
				array[right] = temporary;
			}
			return array;
		}

		/* preparing data model for line,bar and area chart */

		if (chartType == 'line' || chartType == 'bar' || chartType == 'area'
				|| chartType == 'column') {
			var name, value;

			if (options.isMultiDataSet) {
				var groupByValue, groupContent, groupContentFromTable, groupbyFactor, groupbyFactorFromTable;

				/* grouping rows from table w.r.t groupby column */
				for ( var i = 1; i < grid.length; i++) {
					groupByValue = grid[i][groupByColumnIndex];
					groupByArray.push(groupByValue);

					name = grid[i][xaxisColumnIndex];
					xaxisArray.push(name);
				}
				/*
				 * sorting groupBy column and then getting distinct values out
				 * of it
				 */
				groupByArray.sort();
				// jQuery.unique(groupByArray);
				groupByArray = sort_unique(groupByArray);

				/*
				 * sorting xaxis column and then getting distinct values out of
				 * it
				 */
				// xaxisArray.sort();
				// jQuery.unique(xaxisArray);
				/* setting distinct values for xaxiscategories */
				xaxisArray = unique(xaxisArray);
				xaxiscategories = xaxisArray;

				for ( var i = 0; i < groupByArray.length; i++) {
					chartData.name = groupByArray[i];

					data = [];

					for ( var j = 0; j < xaxisArray.length; j++) {
						for ( var k = 0; k < grid.length; k++) {
							groupContent = xaxisArray[j];
							groupContentFromTable = grid[k][xaxisColumnIndex];
							groupbyFactor = groupByArray[i];
							groupbyFactorFromTable = grid[k][groupByColumnIndex];

							if (groupContent == groupContentFromTable
									&& groupbyFactor == groupbyFactorFromTable) {
								value = parseFloat(grid[k][yaxisColumnIndex]);
								data.push(value);
							}
						}

						/* if there is no value during grouping then push zero. */
						if (data.length != j + 1)
							data.push(0);
					}

					chartData.data = data;
					series.push(chartData);
					chartData = {};
				}
			} else {
				data = [];

				chartData.name = options.xaxislabel;

				for ( var i = 1; i < grid.length; i++) {
					name = grid[i][xaxisColumnIndex];
					myXaxisCategories.push(name);
					// apply maxCharForLabels
					if (options.maxCharForLabels
							&& name.length > options.maxCharForLabels)
						name = name.substring(0, maxCharForLabels) + '...';

					xaxiscategories.push(name);
					value = parseFloat(grid[i][yaxisColumnIndex]);
					data.push(value);
				}
				chartData.data = data;
				series.push(chartData);
			}

			// tool tip for normal data
			if (!options.isMultiDataSet) {

				toolTip = {
					formatter : function() {
						var y = this.y;
						/*
						 * Added by Hemanth values in the tooltip should be
						 * formatted.
						 */
						if (options.formatter == 'usd'
								|| options.formatter == 'usd2')
							y = '$' + formatCurrency(y);
						/* End by Hemanth */
						var x = this.x;
						if (options.maxCharForLabels)
							x = getCompleteLabel(x);

						var ttip = '<b>' + this.series.name + '</b><br/>' + x
								+ ': ' + y;
						return ttip;
					}
				};
			}

		}

		/* preparing data model for pie chart */

		if (chartType == 'pie') {
			var name, value;
			data = [];
			chartData.data = data;
			/* sorting data in ascending order */
			grid.sort(function(a, b) {
				return a[xaxisColumnIndex] - b[xaxisColumnIndex];
			});
			/* sorting data in descending order except header */
			grid = arraySwap(grid);

			for ( var i = 1; i < grid.length; i++) {
				var pieData = [];
				name = grid[i][yaxisColumnIndex];
				value = parseFloat(grid[i][xaxisColumnIndex]);
				pieData.push(name);
				pieData.push(value);
				chartData.data.push(pieData);
			}
			chartData.name = options.xaxislabel;
			series.push(chartData);

			chartPlotOptions = {
				pie : {
					allowPointSelect : true,
					cursor : 'pointer',
					dataLabels : {
						color : 'black',
						connectorColor : 'black',
						formatter : function() {
							var label = '<b>' + this.point.name + '</b>: ';
							var percentage = Math.floor(this.percentage);
							this.point.visible = true;

							if (percentage < options.minPercentToShowLabel) {
								this.point.visible = false; // <--hide this
															// dataLabel
								return "";
							}

							return label + percentage + ' %';
						}
					}
				}
			};

			toolTip = {
				formatter : function() {
					return this.point.name + '<br/> ' + this.y;
				}
			};

		}

		/** *****Highchart options****** */

		var chart = new Highcharts.Chart({
			chart : {
				renderTo : options.name,
				type : chartType,
				borderRadius : 10,
				margin : margin
			},
			// below comment is written for hidding exporting icons by
			// Anand-23-July-2013
			exporting : {
				enabled : false
			},

			// code ended
			colors : colors,

			credits : {
				enabled : false
			},

			title : {
				text : options.label
			},

			xAxis : {
				title : {
					text : options.xaxislabel || null
				},
				categories : xaxiscategories
			},

			yAxis : {
				title : {
					text : options.yaxislabel || null
				},
				min : 0
			},

			tooltip : toolTip,

			legend : legend,

			plotOptions : chartPlotOptions,

			series : series
		});
		function getCompleteLabel(x) {
			var actualData = myXaxisCategories;
			var trimmedData = xaxiscategories;

			for ( var i = 0; i < trimmedData.length; i++) {
				var trimmedX = trimmedData[i];

				if (trimmedX == x) {
					return actualData[i];
				}
			}
		}

	}

	catch (e) {
		alert('Exception from exilHighchart.js: ' + e);
	}

}

/**
 * @example pass array like [
 *          'label1','label2','label3','label1','label2','label3'] returns array
 *          with unique values[ 'label1','label2','label3']
 */
function sort_unique(arr) {
	arr = arr.sort();
	var ret = [ arr[0] ];
	for ( var i = 1; i < arr.length; i++) { // start loop at 1 as element 0 can
											// never be a duplicate
		if (arr[i - 1] !== arr[i]) {
			ret.push(arr[i]);
		}
	}
	return ret;
}

function unique(arr) {

	var ret = [ arr[0] ];
	for ( var i = 1; i < arr.length; i++) { // start loop at 1 as element 0 can
											// never be a duplicate
		if (arr[i - 1] !== arr[i]) {
			ret.push(arr[i]);
		}
	}
	return ret;
}

// TODO : let us add a method to decimalDataType for this.
function formatCurrency(val) {
	var ele = new PM.OutputField();
	ele.dataType = 'largedecimal';
	ele.defaultValue = '0';
	ele.formatter = 'usd';
	var retVal = ele.format(val);
	ele = null;
	return retVal;
}