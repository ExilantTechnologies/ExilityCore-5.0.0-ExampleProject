
/**
 * @fileOverview This file acts as a driver for the flotr charting library for chart panel. 
 * This implements the interfaces that are required by a charting driver  for Exility
 * @fileDescription 
 * 1) The primary purpose of this file is to prepare input data from exility grid object and handle data to flotr chart library.
 * 2) set chart options before handling data to flotr chart library like xaxis labels, yaxis labels, colors, margins etc.
 * @name chartFlotr.js
 * @version 2.0
 * Version history
 * 1.0.0	19/03/2013   	Bhandi
 * 1.0.1	24/06/2013     	Vinay
 * 1.0.2	27/08/2013		Vinay
 * 2.0      4-oct-2013 		Bhandi re-factored completely for new design as chart Panel instead of chart field
 */

if (!window.ChartPanel)
{
	alert('chart driver file is not included properly in your project. Charts will not work in your project');
	//create dummy objects to avoid exceptions
}
/**
 * driver that works between an Exility chartPanel and Flotr charting utility.
 * We have primarily three tasks:
 * 1. data preparation. Exility supplies data in a grid with a header row and data rows.
 *   We have to convert this into a data object that Flotr expects. (refer to prepareData())
 * 2. Exility chartPanel has all options as it attributes. We have to create options object the way Flotr expects
 * 3. Manage event handlers
 */
var ChartPanelDriver = (function(){
	/**
	 * Flotr uses prototype framework, and uses extended arrays. Exility would have created  simple array.
	 * We just recreate array with Array being constructed in page Window (where prototype is loaded)
	 */
	var prepareData = function(win, data){
		var newData = new win.Array();
		var nbrRows = data.length;
		var nbrCols = data[0] ? data[0].length : 0;
		for(var i = 0; i < nbrRows; i++){
			var row = data[i];
			var newRow = new win.Array();
			newData.push(newRow);
			for(var j = 0; j < nbrCols; j++){
				newRow.push(row[j]);
			}
		}
		/**
		 * FLotr expects data rows as an attribute named 'data' 
		 */
		var arr = new win.Array();
		arr.push(newData);
		return arr;
	};

	//flotr attributes at root level
	var basicOptions = ['colors','childColors','shadowSize', 'rawDataDisplay','labelColor'];
	//other attributes grouped into objects
	var otherOptions = {
            legend: {
                // show: we have the reverse here called hideLegend. We will handle that as an exception			// => setting to true will show the legend, hide otherwise
                noColumns: 'legendNbrColumns', 		// => number of colums in legend table
                labelFormatter: 'legendLabelFormatter', // => fn: string -> string
                labelBoxBorderColor: 'legendLabelBoxBorderColor', // => border color for the little label boxes
                //container: not an attribute. will be handled separatelyull, 		// => container (as jQuery object) to put legend in, null means default on top of graph
                position: 'legendPosition', 		// => position of default legend container within plot(ne: north east)
                margin: 'legendMargin', 			// => distance from grid edge to default legend container within plot
                backgroundColor: 'legendBackgroundColor', // => null means auto-detect
                backgroundOpacity: 'legendBackgroundOpacity'	// => set to 0 to avoid background, set to 1 for a solid background
            },
            xaxis: {
                //ticks: null, 		// => format: either [1, 3] or [[1, 'a'], 3]
                //noTicks: 5, 			// => number of ticks for automagically generated ticks
                //tickFormatter: defaultTickFormatter, // => fn: number -> string
                //tickDecimals: 0, 	// => no. of decimals, null means auto
                min: 'minX', 			// => min. value to show, null means set automatically
                max: 'maxX' 			// => max. value to show, null means set automatically
                //autoscaleMargin: 0		// => margin in % to add if auto-setting min/max
            },
            yaxis: {
                //ticks: null, 		// => format: either [1, 3] or [[1, 'a'], 3]
                //noTicks: 5, 			// => number of ticks for automagically generated ticks
                //tickFormatter: defaultTickFormatter, // => fn: number -> string
                //tickDecimals: 0, 	// => no. of decimals, null means auto
                min: 'minY', 			// => min. value to show, null means set automatically
                max: 'minY' 			// => max. value to show, null means set automatically
                //autoscaleMargin: 0		// => margin in % to add if auto-setting min/max
            },
            points: {
                show: 'showFilledPoints', 		// => setting to true will show points, false will hide
                radius: 'pointsRadius', 			// => point radius (pixels)
                lineWidth: 'lineWidth', 		// => line width in pixels
                fillColor: 'pointsFillColor'	// => fill color
            },
            lines: {
                //show: false, 		// => setting to true will show lines, false will hide
                lineWidth: 'lineWidth', 			// => line width in pixels
                //fill: false, 		// => true to fill the area from the line to the x axis, false for (transparent) no fill
                fillColor: 'pointsFillColor'			// => fill color
            },
            bars: {
                //show: false, 		// => setting to true will show bars, false will hide
                lineWidth: 'lineWidth', 		// => in pixels
                barWidth: 'barWidth', 		// => in units of the x axis
                //fill: true, 			// => true to fill the area from the line to the x axis, false for (transparent) no fill
                fillColor: 'pointsFillColor'			// => fill color
            },
            grid: {
                color: 'gridColor', 	// => primary color used for outline and labels
                //backgroundColor: null, // => null for transparent, else color
                tickColor: 'tickColor', // => color used for the ticks
                labelLeftMargin: 'labelLeftMargin' , // => margin in pixels
                labelBottomMargin: 'labelBottomMargin' // => margin in pixels
            }
	};
	
	var getOptions = function(panel){
		//create a new options object by merging defaults with any over-riding options in panel
		var currentOptions = merge(exilParms.chartPanelOptions, panel);
		var flotrOptions = {mouse : { track : true}, chartType : panel.chartType};
		
		
		//copy basic options
		for(var i = basicOptions.length - 1; i >= 0; i--){
			var att = basicOptions[i];
			flotrOptions[att] = currentOptions[att];
			debug(att + ' = ' + currentOptions[att]);
		}
		
		//copy other options
		for(var optionType in otherOptions){
			var opts = flotrOptions[optionType] = {};
			var subOpts = otherOptions[optionType];
			debug(optionType);
			for(var att in subOpts){
				opts[att] = currentOptions[subOpts[att]];
				debug(att + ' = ' + currentOptions[subOpts[att]]);
			}
		}
		var ch = panel.chartType || flotrOptions.chartType || 'bar';
		ch = ch.toUpperCase();
		flotrOptions.chartType = ch;
		if(ch.indexOf('BAR') != -1){
			var bars = flotrOptions.bars;
			if(!bars) bars = flotrOptions.bars = {};
			bars.show = true;
		}
		if(ch.indexOf('LINE') != -1){
			var lines = flotrOptions.lines;
			if(!lines) bars = flotrOptions.lines = {};
			lines.show = true;
		}
		var lg = flotrOptions.legend;
		lg.show = !currentOptions.hideLegend;
		lg.legendHighlight = true;
		var fn = lg.labelFormatter;
		if(fn){
			fn = panel.P2 && panel.P2.win[fn];
			if(typeof fn != 'function'){
				debug(lg.labelFormatter + ' should have been defined as a function for legend label formatting. Label is not formatted.');
				fn = null;
			}
			lg.labelFormatter = fn;
		}
		return flotrOptions;
		
	};
	var bindEvents = function(win, panel){
		/*
		 * mouse move is required if help text is available, or a call back function is designed
		 */
		if(panel.onMoveFunctionName){
			panel.mouseMoved = win[panel.onMoveFunctionName];
			if(!panel.mouseMoved){
				alert('Design error : ' + panel.onMoveFunctionName + ' is not found to be a funciton in your window. MouseMove will not work properly for your chart');
				delete panel.mouseMoved;
			}
		}
		
		if(panel.onClickFunctionName){
			panel.mouseClicked = win[panel.onClickFunctionName];
			if(!panel.mouseClicked){
				alert('Design error : ' + panel.onClickFunctionName + ' is not found to be a funciton in your window. onCLick will not work properly for your chart');
				delete panel.mouseClicked;
			}
		}
		
		/**
		 * see if we need to add mousemove
		 */
		if(panel.helpTexts || panel.mouseMoved){
			panel.container.observe('flotr:mousemove', function(e){
				/*
				 * flotr passes a memo from which we can get the row number that the mouse is moving on
				 */
				var myPos = e.memo && e.memo[1] && e.memo[1];
				var rowIdx = myPos.rowIdx;
				if(panel.helpTexts){
					var txt = '';
					if(rowIdx != null){
						txt = panel.helpTexts[rowIdx] || '';
					}
					panel.container.title = txt;
					debug(txt + 'set as title for segment ' + rowIdx );
				}
				
				if(panel.mouseMoved){
					panel.mouseMoved(rowIdx, myPos.lastIdx);
				}
			});
		}
		
		/**
		 * is mouse click required?
		 */
		if (panel.mouseClicked)
		{
			panel.container.observe('flotr:click', function (e)
				{
					var idx = e.memo && e.memo[1] && e.memo[1].rowIdx;
					panel.mouseClicked(idx);
				});
		}
		
	};
	/**
	 * sort the array and remove duplicates
	 */
	var sortUnique = function(arr) 
	{
		arr = arr.sort();
		var n = arr.length;
		var lastValue = arr[0];
		var sortedArray = [lastValue];
		for (var i = 1; i < n; i++) 
		{
			var thisValue = arr[i];
			if(thisValue != lastValue){
				lastValue = thisValue;
				sortedArray.push(thisValue);
			}
		}
		return sortedArray;
	};

	var merge = function(defOptions, overRider){
		var obj = {};
		for(var att in defOptions){
			var val = overRider[att];
			if(typeof(val) == 'undefined'){
				obj[att] = defOptions[att];
			}else{
				obj[att] = val;
			}
		}
		return obj;
	};
	//we return an object with this one public method
	return {
		/**
		 * draw chart on this panel
		 * @param panel a div dom-element inside which chart is to be drawn
		 * @param data data for the chart as an array of rows. Rows are arrays of columns
		 * @returns drawn chart object
		 */
		draw : function(panel, data){
			var win = panel.P2.win;
			/**
			 * convert container to a jquery element
			 */
			if(!panel.container.selector){
				panel.container = win.$(panel.container);
				panel.legendContainer = win.$(panel.legendContainer);
			}
			var options = getOptions(panel);
			data = prepareData(win, data, options);
			bindEvents(win, panel);
			PM.debug('Going to draw ' + panel.chartType + ' with data as ' + data);
			return win.Flotr.draw(panel.container, data, options, options.chartType);
		}
	};
})();
