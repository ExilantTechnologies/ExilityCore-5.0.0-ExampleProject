//Flotr 0.1.0alpha Copyright (c) 2008 Bas Wenneker, <http://solutoire.com>, MIT License.
/* 
 * Modified periodically by Exilant Technologies to add new types of chart
 */
var typeOfChart = { LINE: 'LINE', PIE: 'PIE', SPEEDOMETER: 'SPEEDOMETER', RADAR: 'RADAR', BARANDLINE: 'BARANDLINE', BAR: 'BAR', SCATTER: 'SCATTER', BUBBLE: 'BUBBLE', HORIZONTALBAR: 'HORIZONTALBAR', STACKED: 'STACKED', HORIZONTALSTACKED: 'HORIZONTALSTACKED', RUNCHART: 'RUNCHART', BULLET: 'BULLET', SUNBURST: 'SUNBURST', SANKEY: 'SANKEY' };

var typeOfFormat = {};
var typeOfDecimalSeparator = {};
var typeOfFieldSeparator = {};
var numberOfPlacesForSeparator = {};

typeOfFormat['inr'] = "##,##,##,###";
typeOfDecimalSeparator['inr'] = ".";
typeOfFieldSeparator['inr'] = ",";
numberOfPlacesForSeparator['inr'] = "2";

typeOfFormat['usd'] = "###,###,###,###";
typeOfDecimalSeparator['usd'] = ".";
typeOfFieldSeparator['usd'] = ",";
numberOfPlacesForSeparator['usd'] = "3";

typeOfFormat['dem'] = "###.###.###.###";
typeOfDecimalSeparator['dem'] = ",";
typeOfFieldSeparator['dem'] = ".";
numberOfPlacesForSeparator['dem'] = "3";
// Feb 26 2009 : Y-Axis Label Formatter for Charts - Nirmanith (End) : Aravinda

var Flotr = (function () {
    /**
    * Function: (private) getSeries
    * 
    * Collects dataseries from input and parses the series into the right format. It 
    * returns an Array of Objects each having at least the 'data' key set.
    * 
    * Parameters:
    * 		data - Object or array of dataseries
    * 
    * Returns:
    * 		Array of Objects parsed into the right format ({(...,) data: [[x1,y1], [x2,y2], ...] (, ...)})
    */
    function getSeries(data) {
        return data.collect(function (serie) {
            return (serie.data) ? Object.clone(serie) : { 'data': serie };
        });
    }
    
    function isArray(object)
    {
        if (object.constructor === Array) return true;
        return false;
    }
    
    /**
    * Function: (private) merge
    * 
    * Recursively merges two objects.
    * 
    * Parameters:
    * 		src - Source object (likely the object with the least properties)
    * 		dest - Destination object (optional, object with the most properties)
    * 
    * Returns:
    * 		Recursively merged Object.
    */
    function merge(src, dest) {
        var result = dest || {};
        for (var i in src) {
        	try
        	{
        		var s = src[i];
        		//if it is an object, but not array or regexp, then we recurse
        		if(typeof (s) == 'object' && !(Array.isArray(s) || s.constructor == RegExp))
        			merge(s, dest[i]);
    			else
        			result[i] = src[i];
        			
        	}
        	
        	catch (e) 
        	{
        		PM.debug('exception :'+e);
			}
        }
        return result;
    }
    /**
    * Function: (private) getTickSize
    * 
    * Function calculates the ticksize and returns it.
    * 
    * Parameters:
    * 		noTicks - Number of ticks
    * 		min - Lower bound integer value for the current axis.
    * 		max - Upper bound integer value for the current axis.
    * 		decimals - Number of decimals for the ticks.
    * 
    * Returns:
    * 		Returns the size of a tick.
    */
    function getTickSize(noTicks, min, max, decimals) {
        var delta = (max - min) / noTicks;
        var magn = getMagnitude(delta);
        /**
        * Norm is between 1.0 and 10.0.
        */
        var norm = delta / magn;

        var tickSize = 10;
        if (norm < 1.5) tickSize = 1;
        else if (norm < 2.25) tickSize = 2;
        else if (norm < 3) tickSize = 2.5;
        else if (norm < 7.5) tickSize = 5;

        if (tickSize == 2.5 && decimals == 0)
            tickSize = 2;

        tickSize *= magn;

        if (tickSize < 1)
            tickSize = 1;

        return tickSize;
    }
    /**
    * Function: (private) defaultTickFormatter
    * 
    * Formats the ticks.
    * 
    * Parameters:
    * 		val - Tick value integer.
    * 
    * Returns:
    * 		Formatted tick string.
    */
    function defaultTickFormatter(val) {
        return val.toString();
    }
    /**
    * Function: (private) defaultTrackFormatter
    * 
    * Formats the mouse tracker values.
    * 
    * Parameters:
    * 		val - Track value Object {x:..,y:..}.
    * 
    * Returns:
    * 		Formatted track string.
    */
    function defaultTrackFormatter(obj) {
        return '(' + obj.x + ', ' + obj.y + ')';
    }
    /**
    * Function: (private) getMagnitude
    * 
    * Returns the magnitude of the input value.
    * 
    * Parameters:
    * 		x - Integer or float value
    * 
    * Returns:
    * 		Returns the magnitude of the input value.
    */
    function getMagnitude(x) {
        return Math.pow(10, Math.floor(Math.log(x) / Math.LN10));
    }
    /**
    * Function: (private) parseColor
    * 
    * Parses a color string and returns a corresponding Color.
    * 
    * Parameters:
    * 		str - String that represents a color.
    */
    function parseColor(str) {
        var result;

        /**
        * rgb(num,num,num)
        */
        if ((result = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(str)))
            return new Color(parseInt(result[1]), parseInt(result[2]), parseInt(result[3]));

        /**
        * rgba(num,num,num,num)
        */
        if ((result = /rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*\)/.exec(str)))
            return new Color(parseInt(result[1]), parseInt(result[2]), parseInt(result[3]), parseFloat(result[4]));

        /**
        * rgb(num%,num%,num%)
        */
        if ((result = /rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(str)))
            return new Color(parseFloat(result[1]) * 2.55, parseFloat(result[2]) * 2.55, parseFloat(result[3]) * 2.55);

        /**
        * rgba(num%,num%,num%,num)
        */
        if ((result = /rgba\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*\)/.exec(str)))
            return new Color(parseFloat(result[1]) * 2.55, parseFloat(result[2]) * 2.55, parseFloat(result[3]) * 2.55, parseFloat(result[4]));

        /**
        * #a0b1c2
        */
        if ((result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(str)))
            return new Color(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16));

        /**
        * #fff
        */
        if ((result = /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(str)))
            return new Color(parseInt(result[1] + result[1], 16), parseInt(result[2] + result[2], 16), parseInt(result[3] + result[3], 16));

        /**
        * Otherwise, we're most likely dealing with a named color.
        */
        var name = str.strip().toLowerCase();
        if (name == 'transparent') {
            return new Color(255, 255, 255, 0);
        }
        result = lookupColors[name];
        if(result)
        	return new Color(result[0], result[1], result[2]);
        return new Color(getRandomRgb(), getRandomRgb(), getRandomRgb());
    }
    
    function getRandomRgb(){
    	return Math.round(Math.random()*255);
    }
    /**
    * Function: (private) extractColor
    * 
    * Returns the background-color of the canvas container color string.
    * 
    * Parameters:
    * 		element - String that represents a color.
    * 
    * Returns:
    * 		Returns the background-color of the canvas container color string.
    */
    function extractColor(element) {
        var color;
        /**
        * Loop until we find an element with a background color and stop when we hit the body element. 
        */
        do {
            color = element.getStyle('background-color').toLowerCase();
            if (color != '' && color != 'transparent') break;
            element = element.up(0);
        } while (element.nodeName.toLowerCase() != 'body');

        /**
        * Catch Safari's way of signalling transparent
        */
        if (color == 'rgba(0, 0, 0, 0)') return 'transparent';
        return color;
    }
    /**
    * Function: (private) Color
    * 
    * Returns a Color object.
    * 
    * Parameters:
    * 		r - Red value.
    * 		g - Green value.
    * 		b - Blue value.
    * 		a - Alpha value.
    * 
    * Returns:
    * 		void
    */
    /**
    * @todo create class from function.
    */
    function Color(r, g, b, a) {
        var rgba = ['r', 'g', 'b', 'a'];
        var x = 4;
        while (-1 < --x) {
            this[rgba[x]] = arguments[x] || ((x == 3) ? 1.0 : 0);
        }

        this.toString = function () {
            return (this.a >= 1.0) ? 'rgb(' + [this.r, this.g, this.b].join(',') + ')' : 'rgba(' + [this.r, this.g, this.b, this.a].join(',') + ')';
        };

        this.scale = function (rf, gf, bf, af) {
            x = 4;
            while (-1 < --x) {
                if (arguments[x] != null)
                    this[rgba[x]] *= arguments[x];
            }
            return this.normalize();
        };

        this.adjust = function (rd, gd, bd, ad) {
            x = 4;
            while (-1 < --x) {
                if (arguments[x] != null)
                    this[rgba[x]] += arguments[x];
            }
            return this.normalize();
        };

        this.clone = function () {
            return new Color(this.r, this.b, this.g, this.a);
        };

        var limit = function (val, minVal, maxVal) {
            return Math.max(Math.min(val, maxVal), minVal);
        };

        this.normalize = function () {
            this.r = limit(parseInt(this.r), 0, 255);
            this.g = limit(parseInt(this.g), 0, 255);
            this.b = limit(parseInt(this.b), 0, 255);
            this.a = limit(this.a, 0, 1);
            return this;
        };

        this.normalize();
    }
    lookupColors = {
        aqua: [0, 255, 255],
        azure: [240, 255, 255],
        beige: [245, 245, 220],
        black: [0, 0, 0],
        blue: [0, 0, 255],
        brown: [165, 42, 42],
        cyan: [0, 255, 255],
        darkblue: [0, 0, 139],
        darkcyan: [0, 139, 139],
        darkgrey: [169, 169, 169],
        darkgreen: [0, 100, 0],
        darkkhaki: [189, 183, 107],
        darkmagenta: [139, 0, 139],
        darkolivegreen: [85, 107, 47],
        darkorange: [255, 140, 0],
        darkorchid: [153, 50, 204],
        darkred: [139, 0, 0],
        darksalmon: [233, 150, 122],
        darkviolet: [148, 0, 211],
        fuchsia: [255, 0, 255],
        gold: [255, 215, 0],
        green: [0, 128, 0],
        indigo: [75, 0, 130],
        khaki: [240, 230, 140],
        lightblue: [173, 216, 230],
        lightcyan: [224, 255, 255],
        lightgreen: [144, 238, 144],
        lightgrey: [211, 211, 211],
        lightpink: [255, 182, 193],
        lightyellow: [255, 255, 224],
        lime: [0, 255, 0],
        magenta: [255, 0, 255],
        maroon: [128, 0, 0],
        navy: [0, 0, 128],
        olive: [128, 128, 0],
        orange: [255, 165, 0],
        pink: [255, 192, 203],
        purple: [128, 0, 128],
        violet: [128, 0, 128],
        red: [255, 0, 0],
        silver: [192, 192, 192],
        white: [255, 255, 255],
        yellow: [255, 255, 0]
    };

    var currentChartType = '';
    // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (Start) : Aravinda
    var arrayXStack = new Array();
    var arrayYStack = new Array();
    // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (End) : Aravinda

    function Plot(container, data, opts, chartType) {
        PM.debug('Going to plot ' + chartType + ' chart inside ' + container.id );
    	//data is supposed to be an array created as per prototype. If it is not, let us recreate array 
        if (!data.collect)
            data = [data[0]];
        /**
        * Initialize variables.
        */
        var ctx = null;
        var options = null;
        var canvas = null;
        var overlay = null;
        var octx = null;
        var series = getSeries(data);
        var target = container;
        var xaxis = {}, yaxis = {};
        var plotOffset = { left: 0, right: 0, top: 0, bottom: 0 };
        var labelMaxWidth = 0;
        var labelMaxHeight = 0;
        var canvasWidth = 0;
        var canvasHeight = 0;
        var plotWidth = 0;
        var plotHeight = 0;
        var hozScale = 0;
        var vertScale = 0;
        var legendDetails = new Object;
        var pieData = {}; //storing relevant data for mouse events
        var sankeyData = {}; //for sankey
        var chartData = { lines: [], bars: [], bullets: [] }; //for all other charts
        var prvTop; //added by vinay for displaying labels in stacked chart
        var prvRight;
        var pixelPosition = {};
        var currentHighlightedRow = 0;
        currentChartType = chartType;
        	
        $(document).stopObserving('mouseover', mouseMoveHandler); /*added by vinay to stop mouseover binded by sankeychart */

        // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
        // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App : Aravinda
        // Apr 14 2010 : Bug 1108 - Run Chart - Exility App : Aravinda
        // May 09 2012 : Chart Extension - Pathfinder (Start) : Aravinda

        setOptions(opts);
        if (typeof options.legend.container == 'string') {
            options.legend.container = $(options.legend.container);
        }
        constructCanvas();
        if ((typeOfChart.LINE == chartType) || (typeOfChart.BAR == chartType) || (typeOfChart.SCATTER == chartType) || (typeOfChart.BUBBLE == chartType) || (typeOfChart.HORIZONTALBAR == chartType) || (typeOfChart.STACKED == chartType) || (typeOfChart.HORIZONTALSTACKED == chartType) || (typeOfChart.RUNCHART == chartType)) {
            bindEvents();
            findDataRanges();
            calculateRange(xaxis, options.xaxis ,'Y');//Passing the value 'Y' for Xaxis checking By Anand
            extendXRangeIfNeededByBar();
            calculateRange(yaxis, options.yaxis ,'N');//Passing the value 'N' for Yaxis checking By Anand
            // Feb 6 2009 : Hide / Display Legend on Charts (Start) : Aravinda
            if (yaxis.datamax == yaxis.max) {
                yaxis.max += yaxis.tickSize;
                options.yaxis.noTicks += 1;
            }
            // Feb 6 2009 : Hide / Display Legend on Charts (End): Aravinda
            calculateTicks(xaxis, options.xaxis);     
            
            // Feb 26 2009 : Y-Axis Label Formatter for Charts - Nirmanith (Start) : Aravinda
            if (options.yaxis.formatId)
                options.yaxis.tickFormatter = formatValue;
            // Feb 26 2009 : Y-Axis Label Formatter for Charts - Nirmanith (End) : Aravinda
            calculateTicks(yaxis, options.yaxis);
            calculateSpacing();
            draw();
            insertLegend();
        } else if (typeOfChart.PIE == chartType) {
            drawPie();
        } else if (typeOfChart.SPEEDOMETER == chartType) {
            drawSpeedometer();
        } else if (typeOfChart.RADAR == chartType) {
            drawRadar();
            insertLegend();
        } else if (typeOfChart.BULLET == chartType) {
        	bindEvents();
            drawBullet();
        } else if (typeOfChart.SUNBURST == chartType) {
            drawSunBurst();
        } else if (typeOfChart.SANKEY == chartType) {
            drawSankey();
        } else if (typeOfChart.BARANDLINE == chartType) {
            bindEvents();
            findDataRanges();
            calculateRange(xaxis, options.xaxis);
            extendXRangeIfNeededByBar();
            calculateRange(yaxis, options.yaxis);
            if (yaxis.datamax == yaxis.max) {
                yaxis.max += yaxis.tickSize;
                options.yaxis.noTicks += 1;
            }
            calculateTicks(xaxis, options.xaxis);
            calculateTicks(yaxis, options.yaxis);
            calculateSpacing();
            series[0].bars.show = true;
            series[1].bars.show = false;
            series[1].lines.show = true;
            draw();
        }
        // May 09 2012 : Chart Extension - Pathfinder (End) : Aravinda

        this.getCanvas = function () { return canvas; };
        this.getPlotOffset = function () { return plotOffset; };
        this.clearSelection = clearSelection;
        this.setSelection = setSelection;
        this.getLegend = getLegend;

        /**
        * Function: (private) setOptions
        * 
        * Merges usedefined and default options. Also generates colors for series for which 
        * the user didn't specify a color, and merge user-defined series options with default options. 
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function setOptions(o) {

            options = merge(o, {
                colors: ['#0000ff', '#00ff00', '#ff0000', '#9999ff', '#993366', '#ffffcc', '#ccffff', '#660066', '#ff8080'], //=> The default colorscheme. When there are > 5 series, additional colors are generated.
                childColors: ['#334455', '#551122', '#ff2266', '#9900ff', '#0099ff', '#ff00cc', '#cc00ff', '#66ff66', '#008080'], //=> secondoary, like in sunburst
                highlightColor: null, //color to be used for highlighting, used in Sankey as of now
                shadowSize: 4,				// => size of the 'fake' shadow
                // option to display % for pie charts Begin oct-2012
                rawDataDisplay: null,     // 'none', 'percent', 'fraction', 'data'
                labelColor: 'white', //color of label printed on pie, and sunburst
                legend: {
                    show: false, 			// => setting to true will show the legend, hide otherwise
                    noColumns: 1, 		// => number of colums in legend table
                    labelFormatter: null, // => fn: string -> string
                    labelBoxBorderColor: '#ccc', // => border color for the little label boxes
                    container: null, 		// => container (as jQuery object) to put legend in, null means default on top of graph
                    position: 'ne', 		// => position of default legend container within plot(ne: north east)
                    margin: 5, 			// => distance from grid edge to default legend container within plot
                    backgroundColor: 'inactiveborder', // => null means auto-detect
                    backgroundOpacity: 0.85,	// => set to 0 to avoid background, set to 1 for a solid background
                    legendHighlight: false
                },
                xaxis: {
                    ticks: null, 		// => format: either [1, 3] or [[1, 'a'], 3]
                    noTicks: 5, 			// => number of ticks for automagically generated ticks
                    tickFormatter: defaultTickFormatter, // => fn: number -> string
                    tickDecimals: 0, 	// => no. of decimals, null means auto
                    min: null, 			// => min. value to show, null means set automatically
                    max: null, 			// => max. value to show, null means set automatically
                    autoscaleMargin: 0		// => margin in % to add if auto-setting min/max
                },
                yaxis: {
                    ticks: null, 		// => format: either [1, 3] or [[1, 'a'], 3]
                    noTicks: 5, 			// => number of ticks for automagically generated ticks
                    tickFormatter: defaultTickFormatter, // => fn: number -> string
                    tickDecimals: 0, 	// => no. of decimals, null means auto
                    min: null, 			// => min. value to show, null means set automatically
                    max: null, 			// => max. value to show, null means set automatically
                    autoscaleMargin: 0		// => margin in % to add if auto-setting min/max
                },
                points: {
                    show: false, 		// => setting to true will show points, false will hide
                    radius: 3, 			// => point radius (pixels)
                    lineWidth: 2, 		// => line width in pixels
                    fill: true, 			// => true to fill the points with a color, false for (transparent) no fill
                    fillColor: '#ffffff'	// => fill color
                },
                lines: {
                    show: false, 		// => setting to true will show lines, false will hide
                    lineWidth: 2, 			// => line width in pixels
                    fill: false, 		// => true to fill the area from the line to the x axis, false for (transparent) no fill
                    fillColor: null			// => fill color
                },
                bars: {
                    show: false, 		// => setting to true will show bars, false will hide
                    lineWidth: 2, 		// => in pixels
                    barWidth: 0.7, 		// => in units of the x axis
                    fill: true, 			// => true to fill the area from the line to the x axis, false for (transparent) no fill
                    fillColor: null			// => fill color
                },
                grid: {
                    color: '#545454', 	// => primary color used for outline and labels
                    backgroundColor: null, // => null for transparent, else color
                    tickColor: '#dddddd', // => color used for the ticks
                    labelLeftMargin: 3 , // => margin in pixels
                    labelBottomMargin: 3 // => margin in pixels
                },
                selection: {
                    mode: null, 			// => one of null, 'x', 'y' or 'xy'
                    color: '#B6D9FF', 	// => selection box color
                    fps: 10					// => frames-per-second
                },
                mouse: {
                    track: null, 		// => true to track the mouse, no tracking otherwise
                    position: 'se', 		// => position of the value box (default south-east)
                    trackFormatter: defaultTrackFormatter, // => formats the values in the value box
                    margin: 3, 			// => margin in pixels of the valuebox
                    color: '#ff3f19', 	// => line color of points that are drawn when mouse comes near a value of a series
                    trackDecimals: 1, 	// => decimals for the track values
                    sensibility: 2, 		// => the lower this number, the more precise you have to aim to show a value
                    radius: 3				// => radius of the tracck point
                }
            });

            /**
            * Collect colors assigned by the user to a serie.
            */
            var neededColors = series.length;
            var usedColors = [];
            var assignedColors = [];
            for (var i = 0; i < series.length; ++i) {
                var sc = series[i].color;
                if (sc != null) {
                    --neededColors;
                    if (Object.isNumber(sc)) assignedColors.push(sc);
                    else usedColors.push(parseColor(series[i].color));
                }
            }

            /**
            * Calculate the number of colors that need to be generated.
            */
            for (var j = 0; j < assignedColors.length; ++j) {
                neededColors = Math.max(neededColors, assignedColors[j] + 1);
            }

            /**
            * Generate colors.
            */
            var colors = [];
            var variation = 0;
            var k = 0;
            while (colors.length < neededColors) {
                var c = (options.colors.length == k) ? new Color(100, 100, 100) : parseColor(options.colors[k]);

                /**
                * Make sure each serie gets a different color.
                */
                var sign = variation % 2 == 1 ? -1 : 1;
                var factor = 1 + sign * Math.ceil(variation / 2) * 0.2;
                c.scale(factor, factor, factor);

                /**
                * @todo if we're getting to close to something else, we should probably skip this one
                */
                colors.push(c);

                if (++k >= options.colors.length) {
                    k = 0;
                    ++variation;
                }
            }

            /**
            * Fill the options with the generated colors.
            */
            var colori = 0;
            for (var m = 0, s; m < series.length; ++m) {
                s = series[m];

                /**
                * Assign the color.
                */
                if (s.color == null) {
                    s.color = colors[colori].toString();
                    ++colori;
                } else if (Object.isNumber(s.color)) {
                    s.color = colors[s.color].toString();
                }

                s.lines = Object.extend(Object.clone(options.lines), s.lines);
                s.points = Object.extend(Object.clone(options.points), s.points);
                s.bars = Object.extend(Object.clone(options.bars), s.bars);
                s.mouse = Object.extend(Object.clone(options.mouse), s.mouse);

                if (s.shadowSize == null) s.shadowSize = options.shadowSize;
            }
        }

        function getLegend() {
            return legendDetails;
        }

        /**
        * Function: (private) constructCanvas
        * 
        * Initializes the canvas and it's overlay canvas. When the browser is IE, we make use of excanvas.
        * The overlay canvas is inserted for displaying interaction.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function constructCanvas() {
        	//canvasWidth = target.getWidth();
            //canvasHeight = target.getHeight();

        	canvasWidth = getStyle(target.id,'width');
        	canvasHeight = getStyle(target.id,'height');
            
            canvasWidth = parseInt(canvasWidth, 10);
            canvasHeight = parseInt(canvasHeight, 10);
            if(!canvasHeight ||  canvasHeight < 0){
            	PM.debug("Height for plot not specified. defualt of 400px assumed.");
            	canvasHeight = 400;
            }
            if(!canvasWidth ||  canvasWidth < 0){
            	PM.debug("width for plot not specified. defualt of 800x assumed.");
            	canvasWidth = 800;
            }
            target.innerHTML = '';

            /**
            * For positioning labels and overlay.
            */
            target.setStyle({ 'position': 'relative' });

            if (canvasWidth <= 0 || canvasHeight <= 0) {
                throw 'Invalid dimensions for plot, width = ' + canvasWidth + ', height = ' + canvasHeight;
            }

            /**
            * Insert main canvas.
            */
            canvas = $(document.createElement('canvas')).writeAttribute({
                'width': canvasWidth,
                'height': canvasHeight
            });
            target.appendChild(canvas);
            //if (Prototype.Browser.IE)
            //{
            //    canvas = $(window.G_vmlCanvasManager.initElement(canvas));
            //}
            ctx = canvas.getContext('2d');
            ctx.font = "11px Lucida Grande"; // Font being set for all the charts .. modified by Anand

            /**
            * Insert overlay canvas for interactive features.
            */
            overlay = $(document.createElement('canvas')).writeAttribute({
                'width': canvasWidth,
                'height': canvasHeight
            }).setStyle({
                'position': 'absolute',
                'left': '0px',
                'top': '0px'
            });
            target.setStyle({ cursor: 'default', zIndex: 5 }).appendChild(overlay);
            //if (Prototype.Browser.IE)
            //{
            //    overlay = $(window.G_vmlCanvasManager.initElement(overlay));
            //}
            octx = overlay.getContext('2d');
            octx.font = "11px Lucida Grande";

        }
        /**
        * Function: (private) bindEvents
        * 
        * 
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function bindEvents() {
            if (options.selection.mode != null) {
                overlay.observe('mousedown', mouseDownHandler);
            }
            overlay.observe('mousemove', mouseMoveHandler);
            overlay.observe('click', clickHandler);
            overlay.observe('mouseout', mouseOutHandler);
        }


        function mouseOutHandler(evt) {
            octx.clearRect(0, 0, canvasWidth, canvasHeight);
            if(pieData){
            	pieData.lastIdx = null;
            }
            tr = document.getElementById(target.id + 'Label' + currentHighlightedRow);
            if (!tr)
                return;
            tr.setAttribute("style", "box-shadow: 0px 0px 0px; border: 0px");
            currentHighlightedRow = 0;
        }


        /**
        * Function: (private) findDataRanges
        * 
        * Function determines the min and max values for the xaxis and yaxis.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function findDataRanges() {
            yaxis.datamin = xaxis.datamin = 0;
            xaxis.datamax = yaxis.datamax = 1;
            if (series.length == 0) return;

            /**
            * Get datamin, datamax start values
            */
            var found = false;
            for (var i = 0; i < series.length; ++i) {
                if (series[i].data.length > 0) {
                    xaxis.datamin = xaxis.datamax = series[i].data[0][0];
                    yaxis.datamin = yaxis.datamax = series[i].data[0][1];
                    found = true;
                    break;
                }
            }

            /**
            * Return because series are empty.
            */
            if (!found) return;

            /**
            * then find real datamin, datamax
            */
            // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (Start) : Aravinda 
            var stackXArray = new Array();
            var stackYArray = new Array();
            // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (End) : Aravinda
            for (var j = 0; j < series.length; ++j) {
                var data = series[j].data;
                for (var h = 0; h < data.length; ++h) {
                    var x = data[h][0];
                    var y = data[h][1];
                    if (x < xaxis.datamin) xaxis.datamin = x;
                    else if (x > xaxis.datamax) xaxis.datamax = x;
                    if (y < yaxis.datamin) yaxis.datamin = y;
                    else if (y > yaxis.datamax) yaxis.datamax = y;
                    // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (Start) : Aravinda
                    if (stackXArray['x' + x]) {
                        stackXArray['x' + x] = stackXArray['x' + x] + y;
                    } else {
                        stackXArray['x' + x] = y;
                    }
                    if (stackYArray['y' + y]) {
                        stackYArray['y' + y] = stackYArray['y' + y] + x;
                    } else {
                        stackYArray['y' + y] = x;
                    }
                    // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (End) : Aravinda
                }
            }

            // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (Start) : Aravinda
            if (typeOfChart.STACKED == chartType) {
                for (var x in stackXArray) {
                    if (stackXArray[x] > yaxis.datamax)
                        yaxis.datamax = stackXArray[x];
                }
            }
            if (typeOfChart.HORIZONTALSTACKED == chartType) {
                for (var y in stackYArray) {
                    if (stackYArray[y] > xaxis.datamax)
                        xaxis.datamax = stackYArray[y];
                }
            }
            // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (End) : Aravinda
        }
        /**
        * Function: (private) calculateRange
        * 
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function calculateRange(axis, axisOptions ,isXaxis)//modified by Anand..Passing isXaxis parameter so that to set range of bar
        {
            var min = axisOptions.min != null ? axisOptions.min : axis.datamin;
            var max = axisOptions.max != null ? axisOptions.max : axis.datamax;
            if (max - min == 0.0) {
                var widen = (max == 0.0) ? 1.0 : 0.01;
                min -= widen;
                max += widen;
            }
            axis.tickSize = getTickSize(axisOptions.noTicks, min, max, axisOptions.tickDecimals);

            /**
            * Autoscaling.
            */
            var margin;
            if (axisOptions.min == null) {

                /**
                * Add a margin.
                */
                margin = axisOptions.autoscaleMargin;
                if (margin != 0) {
                    min -= axis.tickSize * margin;
                    /**
                    * Make sure we don't go below zero if all values are positive.
                    */
                    if (min < 0 && axis.datamin >= 0) min = 0;
                    min = axis.tickSize * Math.floor(min / axis.tickSize);
                }
            }
            if (axisOptions.max == null) {
                margin = axisOptions.autoscaleMargin;
                if (margin != 0) {
                    max += axis.tickSize * margin;
                    if (max > 0 && axis.datamax <= 0) max = 0;
                    max = axis.tickSize * Math.ceil(max / axis.tickSize);
                }
            }
            axis.min = min;
            //temporary fix by Anand as axis.min is coming negative
            if(axis.min < 0)
            	axis.min = 0;
            //Checking and setting the axis.max value for X-axis for Horizontal Bar--Anand 
            if(isXaxis == 'Y' && (typeOfChart.HORIZONTALBAR == currentChartType || typeOfChart.HORIZONTALSTACKED == currentChartType))
            	 axis.max = max + (axis.tickSize/2);
            else
            	 axis.max = max;
            //end of modification By Anand-3-Jan-2012
        }
        /**
        * Function: (private) extendXRangeIfNeededByBar
        * 
        * Bar series autoscaling.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function extendXRangeIfNeededByBar() {
            if (options.xaxis.max == null) {
                /**
                * Autoscaling.
                */
                var newmax = xaxis.max;
                for (var i = 0; i < series.length; ++i) {
                    if (series[i].bars.show && series[i].bars.barWidth + xaxis.datamax > newmax) {
                        newmax = xaxis.max + series[i].bars.barWidth;
                    }
                }
                xaxis.max = newmax;
            }
        }
        /**
        * Function: (private) calculateTicks
        * 
        * 
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function calculateTicks(axis, axisOptions) {
            axis.ticks = [];
            if (axisOptions.ticks) {
                var ticks = axisOptions.ticks;

                if (Object.isFunction(ticks)) {
                    ticks = ticks({ min: axis.min, max: axis.max });
                }

                /**
                * Clean up the user-supplied ticks, copy them over.
                */
                for (var i = 0, v, label; i < ticks.length; ++i) {
                    var t = ticks[i];
                    if (typeof (t) == 'object') {
                        v = t[0];
                        label = (t.length > 1) ? t[1] : axisOptions.tickFormatter(v);
                    } else {
                        v = t;
                        label = axisOptions.tickFormatter(v);
                    }
                    axis.ticks[i] = { v: v, label: label };
                }
            } else {
                /**
                * Round to nearest multiple of tick size.
                */
                var start = axis.tickSize * Math.ceil(axis.min / axis.tickSize);
                /**
                * Then spew out all possible ticks.
                */
                for (i = 0; start + i * axis.tickSize <= axis.max; ++i) {
                    v = start + i * axis.tickSize;

                    /**
                    * Round (this is always needed to fix numerical instability).
                    */
                    var decimals = axisOptions.tickDecimals;
                    if (decimals == null) decimals = 1 - Math.floor(Math.log(axis.tickSize) / Math.LN10);
                    if (decimals < 0) decimals = 0;

                    v = v.toFixed(decimals);
                    axis.ticks.push({ v: v, label: axisOptions.tickFormatter(v) });
                }
            }
        }
        /**
        * Function: (private)
        * 
        * 
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function calculateSpacing() {
            var max_label = '';
            for (var i = 0; i < yaxis.ticks.length; ++i) {
                var l = yaxis.ticks[i].label.length;
                if (l > max_label.length) {
                    max_label = yaxis.ticks[i].label;
                } 
                
                if(options.yLabelMaxWidth && max_label.length > options.yLabelMaxWidth)
            	{
                	max_label = max_label.substring(0, options.yLabelMaxWidth);
            	}
              
            }
            var dummyDiv = target.insert('<div id="dummyDiv" style="position:absolute;top:-10000px;font-size:smaller" class="flotr-grid-label">' + max_label + '</div>').down(0).next(1);
            labelMaxWidth = dummyDiv.getWidth();
            labelMaxHeight = dummyDiv.getHeight();          
            dummyDiv.remove();

            /**
            * Grid outline line width.
            */
            var maxOutset = 2;
            if (options.points.show) {
                maxOutset = Math.max(maxOutset, options.points.radius + options.points.lineWidth / 2);
            }
            for (var j = 0; j < series.length; ++j) {
                if (series[j].points.show) {
                    maxOutset = Math.max(maxOutset, series[j].points.radius + series[j].points.lineWidth / 2);
                }
            }
            
            plotOffset.left = plotOffset.right = plotOffset.top = plotOffset.bottom = maxOutset;
            plotOffset.left += labelMaxWidth + options.grid.labelLeftMargin + 4;//border 2px(canvas) + 2px y-axislabel
            plotOffset.bottom += labelMaxHeight + options.grid.labelBottomMargin;
            plotWidth = canvasWidth - plotOffset.left - plotOffset.right;
            plotHeight = canvasHeight - plotOffset.bottom - plotOffset.top;
            hozScale = plotWidth / (xaxis.max - xaxis.min);
            vertScale = plotHeight / (yaxis.max - yaxis.min);
            //added by anand to remove the horizontal scroll coming for bars when there is no record in the grid
            if (hozScale == plotWidth) {
                hozScale = plotWidth / 1.5;
            }
            //end of addition by Anand
        }
        /**
        * Function: (private) draw
        * 
        * Draws grid, labels and series.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function draw() {
            prvTop = []; //added by vinay for displaying labels in stacked chart
            prvRight = [];
            drawGrid();
            drawLabels();
            arrayXStack = new Array();
            arrayYStack = new Array();
            for (var i = 0; i < series.length; i++) {
                drawSeries(series[i], i, series.length);
            }
            drawBarLabels();
        }

        function hozPxToScale(px) {
        	return (px / hozScale) + xaxis.min;
		}
        
        function vertPxToScale(px) {
        	return (px / vertScale) + yaxis.min;
		}
        

        /**
        * Function: (private) tHoz
        * 
        * Translates absolute horizontal x coordinates to relative coordinates.
        * 
        * Parameters:
        * 		x - Absolute integer x coordinate.
        * 
        * Returns:
        * 		Translated relative x coordinate.
        */
        function tHoz(x) {
        	//PM.debug('x '+x+ ' xaxis.min '+xaxis.min +' hozScale '+hozScale);
        	var pxHoz = (x - xaxis.min) * hozScale;
            return pxHoz;
        }
        /**
        * Function: (private) tVert
        * 
        * Translates absolute vertical x coordinates to relative coordinates.
        * 
        * Parameters:
        * 		y - Absolute integer y coordinate.
        * 
        * Returns:
        * 		Translated relative y coordinate.
        */
        function tVert(y) {
        	var pxVert = plotHeight - (y - yaxis.min) * vertScale
            return pxVert;
        }
        /**
        * Function: (private) drawGrid
        * 
        * Draws a grid for the graph
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawGrid() {
            ctx.save();
            ctx.translate(plotOffset.left, plotOffset.top);

            /**
            * Draw grid background, when defined.
            */
            if (options.grid.backgroundColor != null) {
                ctx.fillStyle = options.grid.backgroundColor;
                ctx.fillRect(0, 0, plotWidth, plotHeight);
            }

            ctx.lineWidth = 1;
        	ctx.strokeStyle = options.grid.tickColor;
        	
            /**
            * Draw grid lines in vertical direction.
            */
            if ('HORIZONTALBAR' == chartType || 'HORIZONTALSTACKED' == chartType) 
            {
            	ctx.beginPath();
            	for (var i = 0, v = null; i < xaxis.ticks.length; ++i) {
            		v = xaxis.ticks[i].v;
            		/**
            		 * Don't show lines on upper and lower bounds.
            		 */
            		//if (v == xaxis.min || v == xaxis.max)
            			//continue;
            		
            		if (v == xaxis.max)
            			continue;

            		ctx.moveTo(Math.floor(tHoz(v)) + ctx.lineWidth / 2, 0);
            		ctx.lineTo(Math.floor(tHoz(v)) + ctx.lineWidth / 2, plotHeight);
            	}
            }

            /**
            * Draw grid lines in horizontal direction.
            */
            if ('BAR' == chartType || 'STACKED' == chartType || 'LINE' == chartType) 
            {
            	for (var j = 0, v = null; j < yaxis.ticks.length; ++j) {
            		v = yaxis.ticks[j].v;
            		/**
            		 * Don't show lines on upper and lower bounds.
            		 */
            		//if (v == yaxis.min || v == yaxis.max)
            			//continue;
            		
            		if ( v == yaxis.max)
        			continue;

            		ctx.moveTo(0, Math.floor(tVert(v)) + ctx.lineWidth / 2);
            		ctx.lineTo(plotWidth, Math.floor(tVert(v)) + ctx.lineWidth / 2);
            	}
            }
            
            ctx.stroke();
            /**
            * Draw axis/grid border.
            */
            /*
            ctx.lineWidth = 2;
            ctx.strokeStyle = options.grid.color;
            ctx.lineJoin = 'round';
            ctx.strokeRect(0, 0, plotWidth, plotHeight);
             */
            ctx.restore();
           
        }
        /**
        * Function: (private) drawLabels
        * 
        * Draws labels for x and y axis.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawLabels() {
            if (!options.legend.show)
                return;
            
            if(options.legend.isCssBased){
            	drawLegends();
            	return;
            }
            /**
            * Construct fixed width label boxes, which can be styled easily. 
            */
            var noLabels = 0;
            for (var i = 0; i < xaxis.ticks.length; ++i) {
                if (xaxis.ticks[i].label) {
                    ++noLabels;
                }
            }
            var xBoxWidth = plotWidth / noLabels;
            var html = '<div style="font-size:smaller;color:' + options.grid.color + '">';
            /**
            * Add xlabels
            */
           
            for (var j = 0, tick = null; j < xaxis.ticks.length; ++j) {
                tick = xaxis.ticks[j];
                if (!tick.label) continue;
                html += '<div onmouseover="PM.FlotrDriver.setLabelOverflowtoolTip(event,\''+
                tick.label + '\');" style="position:absolute;overflow: hidden;text-overflow: ellipsis;top:' 
                + (plotOffset.top + plotHeight + 2) + 'px;left:' + (plotOffset.left + tHoz(tick.v) - xBoxWidth/2) +
                'px;width:' + xBoxWidth + 'px;text-align:center" class="flotr-grid-label">' + tick.label + "</div>";
            }

            /**
            * Add ylabels.
            */
   
            for (var k = 0, tick = null; k < yaxis.ticks.length; ++k) {
                tick = yaxis.ticks[k];
                if (!tick.label || tick.label.length == 0) 
                	continue;
          
				html += '<div onmouseover="PM.FlotrDriver.setLabelOverflowtoolTip(event,\''+
                		tick.label + '\');" style="position:absolute;overflow: hidden;text-overflow: ellipsis;top:' + (plotOffset.top +
                		tVert(tick.v) - labelMaxHeight/2) + 'px;left:'+options.grid.labelLeftMargin+'px;width:' + labelMaxWidth + 'px;text-align:right" class="flotr-grid-label">' 
                		+ tick.label + "</div>";
			  }
            html += '</div>';
            target.insert(html);
        }

        /**
        /**
        * Function: (private) drawLabels
        * 
        * Draws labels for x and y axis.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawLegends() {
            if (!options.legend.show)
                return;
            /**
            * Construct fixed width label boxes, which can be styled easily. 
            */
            var noLabels = 0;
            for (var i = 0; i < xaxis.ticks.length; ++i) {
                if (xaxis.ticks[i].label) {
                    ++noLabels;
                }
            }
            var xBoxWidth = plotWidth / noLabels;
            var html = '<div style="font-size:smaller;color:' + options.grid.color + '">';
            /**
            * Add xlabels
            */
           
            for (var j = 0, tick = null; j < xaxis.ticks.length; ++j) {
                tick = xaxis.ticks[j];
                if (!tick.label) continue;
                html += '<div onmouseover="PM.FlotrDriver.setLabelOverflowtoolTip(event,\''+
                tick.label + '\');" style="position:absolute;overflow: hidden;text-overflow: ellipsis;top:' 
                + (plotOffset.top + plotHeight + 2) + 'px;left:' + (plotOffset.left + tHoz(tick.v) - xBoxWidth/2) +
                'px;width:' + xBoxWidth + 'px;text-align:center" class="flotr-grid-label">' + tick.label + "</div>";
            }

            /**
            * Add ylabels.
            */
   
            for (var k = 0, tick = null; k < yaxis.ticks.length; ++k) {
                tick = yaxis.ticks[k];
                if (!tick.label || tick.label.length == 0) 
                	continue;
          
				html += '<div onmouseover="PM.FlotrDriver.setLabelOverflowtoolTip(event,\''+
                		tick.label + '\');" style="position:absolute;overflow: hidden;text-overflow: ellipsis;top:' + (plotOffset.top +
                		tVert(tick.v) - labelMaxHeight/2) + 'px;left:'+options.grid.labelLeftMargin+'px;width:' + labelMaxWidth + 'px;text-align:right" class="flotr-grid-label">' 
                		+ tick.label + "</div>";
			  }
            html += '</div>';
            target.insert(html);
        }
        
        /* Function: (private) drawSeries
        * 
        * Actually draws the graph.
        * 
        * Parameters:
        * 		series - Array of series that need to be drawn.
        * 
        * Returns:
        * 		void
        */
        function drawSeries(ser, currentindex, serieslength) {
            if (ser.lines.show || (!ser.bars.show && !ser.points.show))
                drawSeriesLines(ser, currentindex, serieslength);
            if (ser.bars.show)
                drawSeriesBars(ser, currentindex, serieslength);
            // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
            if ((ser.points.show) && (typeOfChart.BUBBLE == chartType))
                drawSeriesBubbles(ser, currentindex, serieslength);
            else if (ser.points.show) {
                drawSeriesPoints(ser, currentindex, serieslength);
                if (ser.lines.show)
                    drawSeriesLines(ser, currentindex, serieslength);
            }
            // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
        }
        /**
        * Function: (private) drawSeriesLines
        * 
        * Function draws lines series in the canvas element.
        * 
        * Parameters:
        * 		series - Series with options.lines.show = true.
        * 
        * Returns:
        * 		void
        */
        function drawSeriesLines(series, currentindex, serieslength) {
            function plotLine(data, offset) {
                if (data.length < 2) return;

                var prevx = tHoz(data[0][0]),
					prevy = tVert(data[0][1]) + offset;

                ctx.beginPath();
                ctx.moveTo(prevx, prevy);
                for (var i = 1; i < data.length - 1; ++i)//modified by anand so that lines start from first point along x-axis and not from origin
                {
                    var x1 = data[i][0], y1 = data[i][1],
						x2 = data[i + 1][0], y2 = data[i + 1][1];

                    /**
                    * Clip with ymin.
                    */
                    if (y1 <= y2 && y1 < yaxis.min) {
                        /**
                        * Line segment is outside the drawing area.
                        */
                        if (y2 < yaxis.min) continue;

                        /**
                        * Compute new intersection point.
                        */
                        x1 = (yaxis.min - y1) / (y2 - y1) * (x2 - x1) + x1;
                        y1 = yaxis.min;
                    } else if (y2 <= y1 && y2 < yaxis.min) {
                        if (y1 < yaxis.min) continue;
                        x2 = (yaxis.min - y1) / (y2 - y1) * (x2 - x1) + x1;
                        y2 = yaxis.min;
                    }

                    /**
                    * Clip with ymax.
                    */
                    if (y1 >= y2 && y1 > yaxis.max) {
                        if (y2 > yaxis.max) continue;
                        x1 = (yaxis.max - y1) / (y2 - y1) * (x2 - x1) + x1;
                        y1 = yaxis.max;
                    }
                    else if (y2 >= y1 && y2 > yaxis.max) {
                        if (y1 > yaxis.max) continue;
                        x2 = (yaxis.max - y1) / (y2 - y1) * (x2 - x1) + x1;
                        y2 = yaxis.max;
                    }

                    /**
                    * Clip with xmin.
                    */
                    if (x1 <= x2 && x1 < xaxis.min) {
                        if (x2 < xaxis.min) continue;
                        y1 = (xaxis.min - x1) / (x2 - x1) * (y2 - y1) + y1;
                        x1 = xaxis.min;
                    } else if (x2 <= x1 && x2 < xaxis.min) {
                        if (x1 < xaxis.min) continue;
                        y2 = (xaxis.min - x1) / (x2 - x1) * (y2 - y1) + y1;
                        x2 = xaxis.min;
                    }

                    /**
                    * Clip with xmax.
                    */
                    if (x1 >= x2 && x1 > xaxis.max) {
                        if (x2 > xaxis.max) continue;
                        y1 = (xaxis.max - x1) / (x2 - x1) * (y2 - y1) + y1;
                        x1 = xaxis.max;
                    } else if (x2 >= x1 && x2 > xaxis.max) {
                        if (x1 > xaxis.max) continue;
                        y2 = (xaxis.max - x1) / (x2 - x1) * (y2 - y1) + y1;
                        x2 = xaxis.max;
                    }

                    if (prevx != tHoz(x1) || prevy != tVert(y1) + offset)
                        ctx.moveTo(tHoz(x1), tVert(y1) + offset);

                    prevx = tHoz(x2);
                    prevy = tVert(y2) + offset;
                    ctx.lineTo(prevx, prevy);
                }
                ctx.stroke();
            }

            /**
            * Function used to fill
            * @param {Object} data
            */
            function plotLineArea(data) {
                if (data.length < 2) return;

                var bottom = Math.min(Math.max(0, yaxis.min), yaxis.max);
                var top, lastX = 0;
                var first = true;

                ctx.beginPath();
                for (var i = 0; i < data.length - 1; ++i) {

                    var x1 = data[i][0], y1 = data[i][1],
						x2 = data[i + 1][0], y2 = data[i + 1][1];

                    if (x1 <= x2 && x1 < xaxis.min) {
                        if (x2 < xaxis.min) continue;
                        y1 = (xaxis.min - x1) / (x2 - x1) * (y2 - y1) + y1;
                        x1 = xaxis.min;
                    } else if (x2 <= x1 && x2 < xaxis.min) {
                        if (x1 < xaxis.min) continue;
                        y2 = (xaxis.min - x1) / (x2 - x1) * (y2 - y1) + y1;
                        x2 = xaxis.min;
                    }

                    if (x1 >= x2 && x1 > xaxis.max) {
                        if (x2 > xaxis.max) continue;
                        y1 = (xaxis.max - x1) / (x2 - x1) * (y2 - y1) + y1;
                        x1 = xaxis.max;
                    } else if (x2 >= x1 && x2 > xaxis.max) {
                        if (x1 > xaxis.max) continue;
                        y2 = (xaxis.max - x1) / (x2 - x1) * (y2 - y1) + y1;
                        x2 = xaxis.max;
                    }

                    if (first) {
                        ctx.moveTo(tHoz(x1), tVert(bottom));
                        first = false;
                    }

                    /**
                    * Now check the case where both is outside.
                    */
                    if (y1 >= yaxis.max && y2 >= yaxis.max) {
                        ctx.lineTo(tHoz(x1), tVert(yaxis.max));
                        ctx.lineTo(tHoz(x2), tVert(yaxis.max));
                        continue;
                    } else if (y1 <= yaxis.min && y2 <= yaxis.min) {
                        ctx.lineTo(tHoz(x1), tVert(yaxis.min));
                        ctx.lineTo(tHoz(x2), tVert(yaxis.min));
                        continue;
                    }

                    /**
                    * Else it's a bit more complicated, there might
                    * be two rectangles and two triangles we need to fill
                    * in; to find these keep track of the current x values.
                    */
                    var x1old = x1, x2old = x2;

                    /**
                    * And clip the y values, without shortcutting.
                    * Clip with ymin.
                    */
                    if (y1 <= y2 && y1 < yaxis.min && y2 >= yaxis.min) {
                        x1 = (yaxis.min - y1) / (y2 - y1) * (x2 - x1) + x1;
                        y1 = yaxis.min;
                    } else if (y2 <= y1 && y2 < yaxis.min && y1 >= yaxis.min) {
                        x2 = (yaxis.min - y1) / (y2 - y1) * (x2 - x1) + x1;
                        y2 = yaxis.min;
                    }

                    /**
                    * Clip with ymax.
                    */
                    if (y1 >= y2 && y1 > yaxis.max && y2 <= yaxis.max) {
                        x1 = (yaxis.max - y1) / (y2 - y1) * (x2 - x1) + x1;
                        y1 = yaxis.max;
                    } else if (y2 >= y1 && y2 > yaxis.max && y1 <= yaxis.max) {
                        x2 = (yaxis.max - y1) / (y2 - y1) * (x2 - x1) + x1;
                        y2 = yaxis.max;
                    }

                    /**
                    * If the x value was changed we got a rectangle to fill.
                    */
                    if (x1 != x1old) {
                        top = (y1 <= yaxis.min) ? top = yaxis.min : yaxis.max;
                        ctx.lineTo(tHoz(x1old), tVert(top));
                        ctx.lineTo(tHoz(x1), tVert(top));
                    }

                    /**
                    * Fill the triangles.
                    */
                    ctx.lineTo(tHoz(x1), tVert(y1));
                    ctx.lineTo(tHoz(x2), tVert(y2));

                    /**
                    * Fill the other rectangle if it's there.
                    */
                    if (x2 != x2old) {
                        top = (y2 <= yaxis.min) ? yaxis.min : yaxis.max;
                        ctx.lineTo(tHoz(x2old), tVert(top));
                        ctx.lineTo(tHoz(x2), tVert(top));
                    }

                    lastX = Math.max(x2, x2old);
                }
                /*
                ctx.beginPath();
                ctx.moveTo(tHoz(data[0][0]), tVert(0));
                for (var i = 0; i < data.length; i++) {
                ctx.lineTo(tHoz(data[i][0]), tVert(data[i][1]));
                }
                ctx.lineTo(tHoz(data[data.length - 1][0]), tVert(0));*/
                ctx.lineTo(tHoz(lastX), tVert(bottom));
                ctx.closePath();
                ctx.fill();
            }

            ctx.save();
            ctx.translate(plotOffset.left, plotOffset.top);
            ctx.lineJoin = 'round';

            var lw = series.lines.lineWidth;
            var sw = series.shadowSize;
            /**
            * @todo: consider another form of shadow when filling is turned on
            */
            if (sw > 0) {
                ctx.lineWidth = sw / 2;
                ctx.strokeStyle = "rgba(0,0,0,0.1)";
                plotLine(series.data, lw / 2 + sw / 2 + ctx.lineWidth / 2);

                ctx.lineWidth = sw / 2;
                ctx.strokeStyle = "rgba(0,0,0,0.2)";
                plotLine(series.data, lw / 2 + ctx.lineWidth / 2);
            }

            ctx.lineWidth = lw;
            ctx.strokeStyle = series.color;
            if (series.lines.fill) {
                //ctx.fillStyle = series.lines.fillColor != null ? series.lines.fillColor : parseColor(series.color).scale(null, null, null, 0.4).toString();
                ctx.fillStyle = series.lines.fillColor != null ? series.lines.fillColor : parseColor(series.color).scale(null, null, null).toString();
                plotLineArea(series.data, 0);
            }

            plotLine(series.data, 0);
            ctx.restore();
        }
        /**
        * Function: (private) drawSeriesPoints
        * 
        * Function draws point series in the canvas element.
        * 
        * Parameters:
        * 		series - Series with options.points.show = true.
        * 
        * Returns:
        * 		void 
        */
        function drawSeriesPoints(series, currentindex, serieslength) {
            function plotPoints(data, radius, fill) {
                var x, y;
                var line = { radius: radius, points: [] }; //store bubble info for mousemove operations
                chartData.lines.push(line);

                for (var i = 1; i < data.length; ++i) //modified by anand so that point start from first point along x-axis and not from origin
                {
                    x = data[i][0];
                    y = data[i][1];
                    if (x < xaxis.min || x > xaxis.max || y < yaxis.min || y > yaxis.max)
                        continue;

                    ctx.beginPath();
                    x = tHoz(x);
                    y = tVert(y);
                    ctx.arc(x, y, radius, 0, 2 * Math.PI, true);

                    //save data for this point
                    x = Math.round(x);
                    y = Math.round(y);
                    //ctx.fillStyle = 'black';
                    //ctx.fillText( x + ':' + y, x + 10,y);
                    line.points.push({ x: x, y: y, idx: i, helpText: data[i][2] || ('help line-' + chartData.lines.length + ' point ' + i) });
                    //PM.debug('point pushed with x:' + x + '  y:' + y + '  idx:' + i + '  radius ' + radius);
                    if (fill)
                        ctx.fill();
                    ctx.stroke();
                }
            }

            function plotPointShadows(data, offset, radius) {
                for (var i = 1; i < data.length; ++i) //modified by anand so that point shadow start from first point along x-axis and not from origin
                {
                    var x = data[i][0], y = data[i][1];
                    if (x < xaxis.min || x > xaxis.max || y < yaxis.min || y > yaxis.max)
                        continue;
                    ctx.beginPath();
                    ctx.arc(tHoz(x), tVert(y) + offset, radius, 0, Math.PI, false);
                    ctx.stroke();
                }
            }

            ctx.save();
            ctx.translate(plotOffset.left, plotOffset.top);

            var lw = series.lines.lineWidth;
            var sw = series.shadowSize;
            if (sw > 0) {
                /**
                * Draw fake shadow in two steps.
                */
                ctx.lineWidth = sw / 2;
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                plotPointShadows(series.data, sw / 2 + ctx.lineWidth / 2, series.points.radius);

                ctx.lineWidth = sw / 2;
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                plotPointShadows(series.data, ctx.lineWidth / 2, series.points.radius);
            }

            ctx.lineWidth = series.points.lineWidth;
            ctx.strokeStyle = series.color;
            ctx.fillStyle = series.points.fillColor != null ? series.points.fillColor : series.color;
            plotPoints(series.data, series.points.radius, series.points.fill);
            ctx.restore();
        }
        // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
        /**
        * Function: (private) drawSeriesBubbles
        * 
        * Function draws point series in the canvas element.
        * 
        * Parameters:
        * 		series - Series with options.points.show = true.
        * 
        * Returns:
        * 		void
        */
        function drawSeriesBubbles(series, currentindex, serieslength) {
            // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
            function plotBubbles(data, radius, scaleratio, fill) {
                for (var i = 0; i < data.length; ++i) {
                    var x = data[i][0], y = data[i][1];
                    if (x < xaxis.min || x > xaxis.max || y < yaxis.min || y > yaxis.max)
                        continue;

                    ctx.beginPath();
                    // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
                    ctx.arc(tHoz(x), tVert(y), (radius[i] / scaleratio), 0, 2 * Math.PI, true);
                    if (fill) ctx.fill();
                    ctx.stroke();
                    // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App (Start) : Aravinda
                    var curBubbleText = '' + radius[i] + '';
                    if (ctx.fillText && options.legend.show && (radius[i] / scaleratio) >= 5) {
                        if (ctx.drawWindow) {
                            var tempFillStyle = ctx.fillStyle;
                            ctx.fillStyle = '#ffffff';
                            ctx.fillText(curBubbleText, tHoz(x) - ((curBubbleText.length / 2) * 5), tVert(y) + 3);
                            ctx.fillStyle = tempFillStyle;
                        } else {
                            ctx.fillText(curBubbleText, tHoz(x) - ((curBubbleText.length / 2) * 5), tVert(y) - 5, '#ffffff');
                        }
                    }
                    // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App (End) : Aravinda
                }
            }

            // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
            function plotBubbleShadows(data, offset, radius, scaleratio) {
                for (var i = 0; i < data.length; ++i) {
                    var x = data[i][0], y = data[i][1];
                    if (x < xaxis.min || x > xaxis.max || y < yaxis.min || y > yaxis.max)
                        continue;
                    ctx.beginPath();
                    ctx.arc(tHoz(x), tVert(y) + offset, (radius[i] / scaleratio), 0, Math.PI, false);
                    ctx.stroke();
                }
            }

            ctx.save();
            ctx.translate(plotOffset.left, plotOffset.top);

            var lw = series.lines.lineWidth;
            var sw = series.shadowSize;
            if (sw > 0) {
                /**
                * Draw fake shadow in two steps.
                */
                ctx.lineWidth = sw / 2;
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
                plotBubbleShadows(series.data, sw / 2 + ctx.lineWidth / 2, series.bubbleData, series.bubbleDenominator);

                ctx.lineWidth = sw / 2;
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
                plotBubbleShadows(series.data, ctx.lineWidth / 2, series.bubbleData, series.bubbleDenominator);
            }

            ctx.lineWidth = series.points.lineWidth;
            ctx.strokeStyle = series.color;
            ctx.fillStyle = series.color;
            // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
            plotBubbles(series.data, series.bubbleData, series.bubbleDenominator, true);
            ctx.restore();
        }
        // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
        /**
        * Function: (private) drawSeriesBars
        * 
        * Function draws bar series in the canvas element.
        * 
        * Parameters:
        * 		series - Series with options.bars.show = true.
        * 
        * Returns:
        * 		void
        */

        function drawSeriesBars(series, currentindex, serieslength) {

            function plotBars(data, barWidth, offset, fill, label) {
                if (data.length < 2)
                    return;

                var bar = { label: label, color: series.color, barCordinates: [] };
                chartData.bars.push(bar);
                
                var individualBarWidth = barWidth / serieslength;
                
                var barBorder = 1;
                var fixedBarWidth = -1;

                
                if(fixedBarWidth > 0)
                {	
                	fixedBarWidth = fixedBarWidth + (2 * barBorder);
                	
                	if ( chartType =='BAR' && fixedBarWidth < tHoz(individualBarWidth))
                	{	
                		individualBarWidth = hozPxToScale(fixedBarWidth);
                		barWidth = individualBarWidth * serieslength;
                	}
                		
                	else if ( chartType == 'HORIZONTALBAR' && fixedBarWidth < (plotHeight - tVert(individualBarWidth)))
                	{ 
                		individualBarWidth = vertPxToScale(fixedBarWidth);
                		barWidth = individualBarWidth * serieslength;
                	}
                		
                	else if ( chartType == 'STACKED' && fixedBarWidth < tHoz(barWidth))
                		barWidth = hozPxToScale(fixedBarWidth);
                	
                	else if ( chartType == 'HORIZONTALSTACKED' && fixedBarWidth < (plotHeight - tVert(barWidth)))
                		barWidth = vertPxToScale(fixedBarWidth);
                }

                
                for (var i = 0; i < data.length; i++) {
                	
                	if(i == 0) continue;

                	var x = data[i][0], y = data[i][1];
                    var drawLeft = true, drawTop = true, drawRight = true;
                    var left = x, right = x + barWidth, bottom = 0, top = y;
                    var curIndex = currentindex + 1;
                    var barValue = 0;
                    var sequence = 0;
                    
                    if (typeOfChart.BARANDLINE == currentChartType)
                        individualBarWidth = barWidth;

                    // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (Start) : Aravinda
                    if (typeOfChart.HORIZONTALBAR == currentChartType) {
                        left = 0;
                        right = x;
                        top = y - (barWidth / 2) + individualBarWidth * (((curIndex - 1) > 0) ? (curIndex - 1) : 0);
                        bottom = top + individualBarWidth;
                        barValue = x;
                        sequence = y;

                    } else if (typeOfChart.STACKED == currentChartType) {
                        individualBarWidth = barWidth;
                        left = x - (barWidth / 2);
                        right = left + individualBarWidth;
                        if (arrayXStack['x' + x]) {
                            bottom = arrayXStack['x' + x];
                        } else {
                            bottom = 0;
                            arrayXStack['x' + x] = 0;
                        }
                        arrayXStack['x' + x] = arrayXStack['x' + x] + y;
                        top = bottom + y;
                        barValue = y;
                        sequence = x;
                        
                    } else if (typeOfChart.HORIZONTALSTACKED == currentChartType) {
                        individualBarWidth = barWidth;
                        bottom = y - (barWidth / 2);
                        top = bottom + individualBarWidth;
                        if (arrayYStack['y' + y]) {
                            left = arrayYStack['y' + y];
                        } else {
                            left = 0;
                            arrayYStack['y' + y] = 0;
                        }
                        arrayYStack['y' + y] = arrayYStack['y' + y] + x;
                        right = left + x;
                        barValue = x;
                        sequence = y;
                    } 
                    else 
                    {
                        left = x - (barWidth / 2) + individualBarWidth * (((curIndex - 1) > 0) ? (curIndex - 1) : 0);
                        right = left + individualBarWidth;
                        ctx.fillStyle = series.bars.fillColor != null ? series.bars.fillColor : parseColor(series.color).scale(null, null, null).toString();
                        barValue = y;
                        sequence = x;
                    }

                    // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (End) : Aravinda
                    if (right < xaxis.min || left > xaxis.max || top < yaxis.min || bottom > yaxis.max)
                        continue;

                    if (left < xaxis.min) {
                        left = xaxis.min;
                        drawLeft = false;
                    }

                    if (right > xaxis.max) {
                        right = xaxis.max;
                        drawRight = false;
                    }

                    if (bottom < yaxis.min)
                        bottom = yaxis.min;

                    if (top > yaxis.max) {
                        top = yaxis.max;
                        drawTop = false;
                    }
                    
                    var xleft = tHoz(left) + barBorder;
                	var xright = tHoz(right) - barBorder;
                	var ytop = tVert(top) - barBorder;
                	var ybottom = tVert(bottom) + barBorder;

                	bar.barCordinates.push({ 	leftPx: xleft, 
						                		rightPx: xright, 
						                		bottomPx: ybottom, 
						                		topPx: ytop, 
						                		left: left, 
						                		right: right, 
						                		bottom: bottom, 
						                		top: top,
						                		val: barValue,
						                		sequence: sequence,
						                		idx: data[i][3], 
						                		helpText: data[i][2] || ('help text Bar-' + chartData.bars.length + ' bar ' + i) 
                						});
                    
                    /**
                    * Fill the bar.
                    */

                    if (fill) {
                        ctx.beginPath();
                        ctx.moveTo(xleft , ybottom + offset);
                        ctx.lineTo(xleft , ytop + offset);
                        ctx.lineTo(xright , ytop + offset);
                        ctx.lineTo(xright , ybottom + offset);
                        ctx.fill();
                    }

                    /**
                    * Draw bar outline/border.
                    */
                    if (drawLeft || drawRight || drawTop)
                    {
                        ctx.beginPath();
                        ctx.moveTo(xleft, ybottom + offset);
                        if (drawLeft) ctx.lineTo(xleft, ytop + offset);
                        else ctx.moveTo(xleft, ytop + offset);
                        if (drawTop) ctx.lineTo(xright, ytop + offset);
                        else ctx.moveTo(xright, ytop + offset);
                        if (drawRight) ctx.lineTo(xright, ybottom + offset);
                        else ctx.moveTo(xright, ybottom + offset);
                        ctx.closePath();
                        ctx.stroke();
                    }
                }
            }

            ctx.save();
            ctx.translate(plotOffset.left, plotOffset.top);
            ctx.lineJoin = 'round';

            var bw = series.bars.barWidth;
            /**
            * @todo linewidth not interpreted the right way.
            */
            var lw = Math.min(series.bars.lineWidth, bw);
            /**
            * @todo figure out a way to add shadows.
            */
            /*
            var sw = series.shadowSize;
            if (sw > 0) {
            // draw shadow in two steps
            ctx.lineWidth = sw / 2;
            ctx.strokeStyle = "rgba(0,0,0,0.1)";
            plotBars(series.data, bw, lw/2 + sw/2 + ctx.lineWidth/2, false);
	
            ctx.lineWidth = sw / 2;
            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            plotBars(series.data, bw, lw/2 + ctx.lineWidth/2, false);
            }*/

            ctx.lineWidth = lw;
            ctx.strokeStyle = series.color;
             if (series.bars.fill) {
            	 ctx.fillStyle = series.bars.fillColor != null ? series.bars.fillColor : parseColor(series.color).scale(null, null, null).toString();
            //ctx.fillStyle =series.bars.fillColor != null ? series.bars.fillColor :parseColor(series.color).scale(.5, .5, .5).toString();
             }

            plotBars(series.data, bw, 0, series.bars.fill, series.label);
            ctx.restore();
        }
        
        function drawBarLabels() 
        {
        	var bars = chartData.bars;
        	var nbrStacks = bars.length;
        	var bar, pos, right;
        	ctx.save();
        	ctx.translate(plotOffset.left, plotOffset.top);

        	/**
        	 * keep track of totals for horizontal stacked bar charts
        	 */
        	var totalsAt = [];
        	for (var barIdx = 0; barIdx < bars.length && false; barIdx++) 
        	{
        		var individualBar = bars[barIdx].barCordinates;
        		individualBar.sort(orderBySequence);

        		for (var individualBarIdx = 0; individualBarIdx < individualBar.length; individualBarIdx++) 
        		{
        			bar = individualBar[individualBarIdx];
        			var left = bar.left;
        			right = bar.right;
        			var top = bar.top;
        			var bottom = bar.bottom;

        			if ('STACKED' == chartType)
        			{
        				var previousTop = prvTop[individualBarIdx] || 0;
        				var label = Math.round(top - previousTop);
        				pos = getMidXY(bar.leftPx, bar.rightPx, bar.topPx, bar.bottomPx, label);
        				 ctx.save();
	   					 ctx.translate(pos.x, pos.y);
	   					 if(pos.direction == 'vert')
	   					 ctx.rotate(-Math.PI/2);
	   					 ctx.fillStyle = 'white';
	   					 ctx.fillText(label, 0, 0);
	   					 ctx.restore();
        				prvTop[individualBarIdx] = top;

        				if (barIdx == nbrStacks - 1)/* write the count on the topest stack */
        				{
        					ctx.fillStyle = '#545454';
        					ctx.font = "12px Lucida Grande";
        					ctx.fillText(top, pos.x, bar.topPx - 5);
        				}
        			}

        			else if ('HORIZONTALBAR' == chartType)
        			{
        				ctx.fillStyle = '#545454';
        				var midPy = bar.bottomPx - (bar.bottomPx - bar.topPx) / 2;       				
        				ctx.fillText(right, bar.rightPx + 5, midPy);
        			}
        			
        			else if ('BAR' == chartType)
        			{
        				var label = top;
        				pos = getMidXY(bar.leftPx, bar.rightPx, bar.topPx, bar.bottomPx, label);
        				 ctx.save();
	   					 ctx.translate(pos.x, pos.y);
	   					 if(pos.direction == 'vert')
	   					 ctx.rotate(-Math.PI/2);
	   					 ctx.fillStyle = 'white';
	   					 ctx.fillText(label, 0, 0);
	   					 ctx.restore();
        			}

        			else if(chartType == 'HORIZONTALSTACKED')
        			{
        				var previousRight = prvRight[individualBarIdx] || 0;

        				var label = Math.round(right - previousRight);
        				pos = getMidXY(bar.leftPx, bar.rightPx, bar.topPx, bar.bottomPx, label);
	   					
        				ctx.fillStyle = 'white';
	   					ctx.fillText(label, pos.x, pos.y);

        				prvRight[individualBarIdx] = right;
        				totalsAt[barIdx] = {right : right, x : bar.rightPx, y : pos.y};
        				if (barIdx == nbrStacks - 1) //write the count on the topest stack 
        				{
        					ctx.fillStyle = '#545454';
        					ctx.fillText(right, bar.rightPx + 5, pos.y);
        				}
        			}
        		}
        	}	
			if(chartType == 'HORIZONTALSTACKEDDDDDD')
			{
	        	for (var i = 0; i < totalsAt.length; i++) 
	        	{
	        		var p = totalsAt[i];
					ctx.fillStyle = '#545454';
					ctx.fillText(p.right, p.x  + 5, p.y);
	        	}
			}

        }
        
        
        function getMidXY(left, right, top, bottom, label) {
        	
        	var dummyCanvas = document.createElement('canvas');
			var dctx = dummyCanvas.getContext("2d");
			dctx.font = "11px Arial";        
			var labelWidth = dctx.measureText(label).width + 5;//5px margin
			dummyCanvas ='';
			dctx = '';
			
			var labelDirection = 'none';
			var horz_bw = right - left;
			var vert_bw = bottom - top;
			
			if(horz_bw > labelWidth && vert_bw > labelWidth)
			{
				labelDirection = 'horz';
			}
			else if(vert_bw > labelWidth && horz_bw < labelWidth)
			{
				labelDirection = 'vert';
			}
			else
			{
				PM.debug('label '+ label + 'will not appear on bar');
				return;
			}

			var midPx, midPy;
			 if(labelDirection == 'vert') {
				 midPx = left + (horz_bw/2) + 5;//5px label margin
			 }
			 if(labelDirection == 'horz') {
				 midPx = left + (horz_bw - labelWidth)/2;
			 }
			 
			 midPy = bottom - (vert_bw - labelWidth)/2;
			
			 return {x: midPx, y: midPy, direction: labelDirection};
		}

        /**
        * Function: (private) insertLegend
        * 
        * Function adds a legend div to the canvas container.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function insertLegend() {
            if (!options.legend.show)
                return;

            var fragments = [];
            var rowStarted = false;
            for (var i = 0; i < series.length; ++i) {
                if (!series[i].label) continue;

                if (i % options.legend.noColumns == 0) {
                    fragments.push((rowStarted) ? '</tr><tr>' : '<tr>');
                    rowStarted = true;
                }

                var label = series[i].label;
                if (options.legend.labelFormatter)
                    label = options.legend.labelFormatter(label);

                fragments.push('<td class="flotr-legend-color-box"><div style="border:1px solid ' + options.legend.labelBoxBorderColor + ';padding:1px"><div style="width:14px;height:10px;background-color:' + series[i].color + '"></div></div></td>' +
					'<td class="flotr-legend-label" id ="' + target.id + 'Label' + (i + 1) + '">' + label + '</td>');
            }
            if (rowStarted) fragments.push('</tr>');

            if (fragments.length > 0) 
            {
                var table = '<table style="font-size:smaller;color:' + options.grid.color +
                			';background:'+options.legend.backgroundColor+';opacity:'+options.legend.backgroundOpacity+'">' +
                			fragments.join("") + '</table>';
                
                if (options.legend.container != null) {
                    options.legend.container.innerHTML = table;
                } 
                else {
                    var pos = '';
                    var p = options.legend.position, m = options.legend.margin;

                    if (p.charAt(0) == 'n') 
                    	pos += 'top:' + (m + plotOffset.top) + 'px;';
                    else if (p.charAt(0) == 's')
                    	pos += 'bottom:' + (m + plotOffset.bottom) + 'px;';
                    if (p.charAt(1) == 'e') 
                    	pos += 'right:' + (m + plotOffset.right) + 'px;';
                    else if (p.charAt(1) == 'w') 
                    	pos += 'left:' + (m + plotOffset.bottom) + 'px;';
                    
                    var div = target.insert('<div class="flotr-legend" style="position:absolute;z-index:2;' + pos + '">' + table + '</div>').getElementsBySelector('div.flotr-legend').first();

                    if (options.legend.backgroundOpacity != 0.0) {
                        /**
                        * Put in the transparent background separately to avoid blended labels and
                        * label boxes.
                        */

                        var c = options.legend.backgroundColor;
                        if (c == null) {
                            var tmp = (options.grid.backgroundColor != null) ? options.grid.backgroundColor : extractColor(div);
                            c = parseColor(tmp).adjust(null, null, null, 1).toString();
                        }
                        target.insert('<div class="flotr-legend-bg" style="position:absolute;width:' + div.getWidth() + 'px;height:' + div.getHeight() + 'px;' + pos + 'background-color:' + c + ';"> </div>').select('div.flotr-legend-bg').first().setStyle({
                            'opacity': options.legend.backgroundOpacity
                        });
                    }
                }
            }
        }
        var lastMousePos = { pageX: null, pageY: null };
        var selection = { first: { x: -1, y: -1 }, second: { x: -1, y: -1} };
        var prevSelection = null;
        var selectionInterval = null;
        var ignoreClick = false;
        var prevHit = null;
        /**
        * Function: (private) clickHandler
        * 
        * Handler observes the 'click' event and fires the 'flotr:click' event.
        * 
        * Parameters:
        * 		event - 'click' Event object.
        * 
        * Returns:
        * 		void
        */
        function clickHandler(event) {
            if (ignoreClick) {
                ignoreClick = false;
                return;
            }
            /*
            var offset = overlay.cumulativeOffset();
            var x = xaxis.min + (event.pageX - offset.left - plotOffset.left) / hozScale;
            var y = yaxis.max - (event.pageY - offset.top - plotOffset.top) / vertScale;
            target.fire('flotr:click', [{ x: x, y: y}]);

            */
            if ('BAR' == chartType || 'HORIZONTALBAR' == chartType || 'HORIZONTALSTACKED' == chartType || 'STACKED' == chartType) 
            {
                mouseMoveOnBar(event, 'mouseClick');
            }
            
            if ('PIE' == chartType )
            	mouseMoveHandler(event, 'mouseClick');
        }
        
        function mouseMoveOnBullet(event, eventName) {
           
        	var px = event.offsetX;
            var py = event.offsetY;
            var lastBullet = null;
            
            var bullets = chartData.bullets;
            var bulletFocussed = null;
            for (var bulletIdx = 0; bulletIdx < bullets.length; bulletIdx++) 
            {
            	 var bullet = bullets[bulletIdx];
            	 if (px > bullet.startX && px < bullet.endX && py > bullet.startY && py < bullet.endY ) 
                 {
            		 bulletFocussed = bullet;
            		 break;
                 }
            }

            if (lastBullet && lastBullet === bulletFocussed) {
                PM.debug('Moving within the same bullet');
                return;
            }
            target.title = bulletFocussed ? bulletFocussed.helpText : '';
            lastBullet = bulletFocussed;
            return;
        }

        function mouseMoveOnBar(event, eventName) {

            getPixelXY(event);

            var px = pixelPosition.px;
            var py = pixelPosition.py;
            var x = pixelPosition.x;
            var y = pixelPosition.y;
            var plotOffsetLeft = pixelPosition.plotOffsetLeft;
            var plotOffsetTop = pixelPosition.plotOffsetTop;

            var pos = { x: x, y: y };
            var bars = chartData.bars;
            var barFocussed = null;
            var currentBarIdx = 0;
            var axisCategory = null;

            for (var barIdx = 0; barIdx < bars.length; barIdx++) {

                var barCordinates = bars[barIdx].barCordinates;
                for (var i = 0; i < barCordinates.length; i++) {

                    var bar = barCordinates[i];
                    if (px > bar.leftPx && px < bar.rightPx && py > bar.bottomPx && py < bar.topPx && ( chartType == 'HORIZONTALBAR')) 
                    {
                        barFocussed = bar;
                        currentBarIdx = barIdx + 1;
                        break;
                    }
                    else if (px > bar.leftPx && px < bar.rightPx && py < bar.bottomPx && py > bar.topPx && ( chartType == 'BAR' || chartType == 'STACKED' || chartType == 'HORIZONTALSTACKED')) 
                    {
                        barFocussed = bar;
                        currentBarIdx = barIdx + 1;
                        break;
                    }
                    
                    if (barFocussed)
                        break;
                }
            }
            
            if (eventName == 'mouseClick')
            {
                if(barFocussed)
                {
                	pos.rowIdx = barFocussed.idx;
                	target.fire('flotr:click', [event, pos]);
                	return;
                }
            }

            if (!chartData.bars.lastBar && !barFocussed) //floating around...
                return;

            if (chartData.bars.lastBar && chartData.bars.lastBar === barFocussed) {
                //PM.debug('Moving within the same Bar');
                return;
            }
           
           // target.title = barFocussed ? barFocussed.helpText : '';
            pos.rowIdx = barFocussed ? barFocussed.idx : -1;
       	 	target.fire('flotr:mousemove', [event, pos]);
       	 	
       	 	if(options.legend.legendHighlight)
       	 	{
       	 		highlightlegend(currentBarIdx);
       	 	}
       	 	
            if (barFocussed) 
            {
                var left = barFocussed.leftPx + plotOffsetLeft;
                var right = barFocussed.rightPx + plotOffsetLeft;
                var top = barFocussed.topPx + plotOffsetTop;
                var bottom = barFocussed.bottomPx + plotOffsetTop;
                
            	 octx.clearRect(0, 0, canvasWidth, canvasHeight);
                 octx.beginPath();
                 octx.moveTo(left  - 1, bottom + 1);
             	 octx.lineTo(left  - 1, top - 1);
             	 octx.lineTo(right  + 1, top - 1);
             	 octx.lineTo(right  + 1, bottom + 1);
                 octx.closePath();
                 var clr = parseColor(bars[currentBarIdx - 1].color);
                 clr.scale(1.1, 1.1, 1.1);
                 octx.fillStyle = clr.toString();
                 octx.fill();
            	 
            	var label = Math.round(barFocussed.val);
  				var pos = getMidXY(left, right, top, bottom, label)
            	 
                 if ('STACKED' == chartType || 'BAR' == chartType)
                 {
     				 	 octx.save();
	   					 octx.translate(pos.x, pos.y);
	   					 if(pos.direction == 'vert')
	   					 octx.rotate(-Math.PI/2);
	   					 octx.fillStyle = 'white';
	   					 octx.fillText(label, 0, 0);
	   					 octx.restore();
                 }
                 
                 if ('HORIZONTALSTACKED' == chartType)
                 {
                		 octx.fillStyle = 'white';
                		 octx.fillText(barFocussed.val, pos.x, pos.y + 5); /* write the count on each stack */
                 }   
            }
            chartData.bars.lastBar = barFocussed;
            return;
        }

        function getPixelXY(event) {

            if (typeof (lastMousePos) == 'undefined')
                lastMousePos = {};
            if (event.pageX == null && event.clientX != null) {
                var de = document.documentElement, b = document.body;
                lastMousePos.pageX = event.clientX + (de && de.scrollLeft || b.scrollLeft || 0);
                lastMousePos.pageY = event.clientY + (de && de.scrollTop || b.scrollTop || 0);
            } else {
                lastMousePos.pageX = event.pageX;
                lastMousePos.pageY = event.pageY;
            }

            var offset = overlay.cumulativeOffset();
            //px and py are position in pixels 
            var px = event.pageX - offset.left - plotOffset.left;
            var py = event.pageY - offset.top - plotOffset.top;
            
            if(xaxis.min >= 0)
            var x = (xaxis.min + px) / hozScale;
            if(yaxis.max >= 0)
            var y = (yaxis.max - py) / vertScale;

            if (document.getElementById('scrollPanel')) //for horizontal scroll position of charts in pathfinder
                var chartScroll = document.getElementById('scrollPanel').scrollLeft || 0;

            if (x < 0)
                x += chartScroll || 0;

            pixelPosition = { x: x, y: y, px: px, py: py, plotOffsetLeft: plotOffset.left, plotOffsetTop: plotOffset.top };
        }



        /**
        * Function: (private) mouseMoveHandler
        * 
        * Handler observes mouse movement over the graph area. Fires the 
        * 'flotr:mousemove' event.
        * 
        * Parameters:
        * 		event - 'mousemove' Event object.
        * 
        * Returns:
        * 		void
        */
        function mouseMoveHandler(event,eventName) {

            if ('BAR' == chartType || 'HORIZONTALBAR' == chartType || 'HORIZONTALSTACKED' == chartType || 'STACKED' == chartType) 
            {
                mouseMoveOnBar(event, 'mouseMove');
                return;
            }
            
            if ('BULLET' == chartType) 
            {
                mouseMoveOnBullet(event, 'mouseMove');
                return;
            }

            getPixelXY(event);

            var px = pixelPosition.px;
            var py = pixelPosition.py;
            var x = pixelPosition.x;
            var y = pixelPosition.y;
            var pos = { x: x, y: y };
            /* added by vinay on 28-dec-2012
            * If mouse is outside the sankey chart container, clear the overlay .
            * */
            if (typeOfChart.SANKEY == currentChartType) {
                var docXY = PM.getDocumentXy(target);
                if (event.pageX < docXY.x || event.pageX > (docXY.x + canvasWidth)) {
                    octx.clearRect(sankeyData.startX, sankeyData.startY, (sankeyData.endX - sankeyData.startX), (sankeyData.endY - sankeyData.startY));
                    sankeyData.currentLabel = null;
                }
            }
            /* end of addition*/

            if ('LINE' === chartType) {
                
                var pointFocussed = null;
                var lines = chartData.lines;
                for (var lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                    var points = lines[lineIdx].points;
                    var r = 10; // lines[lineIdx].radius;
                    for (var i = 0; i < points.length; i++) {
                        var point = points[i]; //points are already sorted by point.x
                        if (px < point.x - r) //mouse is before this point. mouse is not on any point on this line
                            break;

                        if (px < point.x + r) //mouse is possibly on this point, provided y is in range
                        {
                            if (py >= (point.y - r) && py <= (point.y + r)) {
                                pointFocussed = point;
                                break;
                            }
                        }
                    }
                    if (pointFocussed)
                        break;
                }
                if (!chartData.lastPoint && !pointFocussed) //floating around...
                    return;

                if (chartData.lastPoint && chartData.lastPoint === pointFocussed) {
                    //PM.debug('Moving within the same point');
                    return;
                }
                //clear highlight
                octx.clearRect(0, 0, canvasWidth, canvasHeight);

                //highlight with a circle drawn around the point
                if (pointFocussed) {
                    octx.beginPath();
                    octx.fillStyle = 'rgba(100,100,100,0.4)'; //change color/opacity to suit your taste !!!
                    octx.arc(point.x + plotOffset.left, point.y + plotOffset.top, 10, 0, 2 * Math.PI, false);
                    octx.fill();

                    //AND, if you want the parent document to highlight data associated with this, call it with point.idx!!
                }

                //help text to be set/reset
                target.title = pointFocussed ? pointFocussed.helpText : '';
                //save this point for optimization.
                chartData.lastPoint = pointFocussed;
                return;
            }
            
            if ('SUNBURST' === chartType)
            {
                var x2 = x - pieData.originX;
                var y2 = y - pieData.originY;
                var r = Math.sqrt(x2 * x2 + y2 * y2);
                var rowIdx = null;
                if (r <= pieData.radius && (!pieData.coreRadius || r >= pieData.coreRadius)) //mouse is within the pie, and in case of sunburst, not inside core as well
                {
                    var angle = Math.acos(y2 / r); //this will give us angle between 0 and pi.
                    if (x2 > 0)
                        angle = angle - Math.PI * 0.5;
                    else
                        angle = 1.5 * Math.PI - angle;
                    var n = pieData.endAngles.length;
                    for (var i = 0; i < n; i++)
                    {
                        if (angle <= pieData.endAngles[i])
                        {
                            rowIdx = i + 1;
                            break;
                        }
                    }
                }
                pos.rowIdx = rowIdx;
                if(rowIdx)
                	target.fire('flotr:mousemove', [event, pos]);

                if (window.highlightRow)
                {
                    if (rowIdx != null)
                    {
                        if (pieData.lastIdx == null || pieData.lastIdx != rowIdx)
                        {
                            var color = pieData.colors[rowIdx];
                            	highlightRow(rowIdx + 1, color,pos.groupIdx );
                            
                        }
                    }
                    else if (pieData.lastIdx != null)
                        highlightRow(-1, null,null);
                    pieData.lastIdx = rowIdx;
                }
                return;
            }
            
            if ('PIE' === chartType) {
                var rowIdx = null;
                var x2 = x - pieData.originX;
                var y2 = y - pieData.originY;
                var r = Math.sqrt(x2 * x2 + y2 * y2);
                if (r <= pieData.radius && (!pieData.coreRadius || r >= pieData.coreRadius)) //mouse is within the pie, and in case of sunburst, not inside core as well
                {
                    var angle = Math.acos(y2 / r); //this will give us angle between 0 and pi.
                    if (x2 > 0)
                        angle = angle - Math.PI * 0.5;
                    else
                        angle = 1.5 * Math.PI - angle;
                    //let us find the segment that this angle lies in. We check for the last segment that as its end angle
                    var endAngles = pieData.endAngles;
                    var n = endAngles.length;
                    rowIdx = n - 1; //last segment
                    for (var i = 0; i < n; i++) {
                    	if(angle <= endAngles[i]){
                    		rowIdx = i;
                    		break;
                    	}
                    }
                    pos.rowIdx = rowIdx;
                    pos.lastIdx = pieData.lastIdx;
                    if (pieData.groupRadius) {
                        pos.groupIdx = (r < pieData.groupRadius) ? 1 : 0;
                    }
                    if(eventName === 'mouseClick'){
                    	target.fire('flotr:click', [event, pos]);
                    	return;
                    }
                    if((pieData.lastIdx === rowIdx) || (pieData.lastIdx === null && rowIdx === null)){
                    	return;
                    }
                    //clear existing overlay
                    octx.clearRect(0, 0, canvasWidth, canvasHeight);
                    
                    var pieX = pieData.originX;
                    var pieY = pieData.originY;
                    var pieR = pieData.radius;
                    var startAngle = -Math.PI * 0.5;
                    if (rowIdx > 0) startAngle = pieData.endAngles[rowIdx - 1];
                    var endAngle = endAngles[rowIdx];

/* We have discontinuing highlighting of pie segment 
                    var percent = pieData.piePercent.percentage[rowIdx];
                    var percentX = pieData.piePercent.percentX[rowIdx];
                    var percentY = pieData.piePercent.percentY[rowIdx];

                    octx.beginPath();
                    octx.moveTo(pieX, pieY);
                    octx.arc(pieX, pieY, pieR - 10, startAngle, endAngle);
                    octx.lineTo(pieX, pieY);
                    var grad = ctx.createRadialGradient(pieX, pieY, 0, pieX, pieY, pieR);
                    var clr = parseColor(pieData.colors[i]);
                    clr.scale(0.9, 0.9, 0.9);
                    grad.addColorStop(1, clr.toString());
                    clr.scale(1.7, 1.7, 1.7);
                    grad.addColorStop(0, clr.toString());
                    octx.fillStyle = grad;
                    octx.fill();

                    octx.beginPath();
                    octx.fillStyle = options.labelColor;
                    octx.fillText(percent, percentX, percentY);
                    octx.fill();

*/
                    octx.beginPath();
                    octx.lineWidth = 6;
                    octx.arc(pieX, pieY, pieR - 5, startAngle, endAngle);
                    octx.strokeStyle = pieData.colors[i];
                    octx.stroke();
                    target.fire('flotr:mousemove', [event, pos]);
                }
                
                //draw an additional arc to highlight this segment
                else if(pieData.lastIdx != null)
                {
                    octx.clearRect(0, 0, canvasWidth, canvasHeight);
                    target.fire('flotr:mousemove', [event, pos]);
                }
            	pieData.lastIdx = rowIdx;
            	return;
            }
            else if (options.mouse.track && selectionInterval == null) {
                hit(pos);
            }

            target.fire('flotr:mousemove', [event, pos]);
        }

        function highlightlegend(row) {
            if (currentHighlightedRow && currentHighlightedRow > 0) 
            {
                tr = document.getElementById(target.id + 'Label' + currentHighlightedRow);
                tr.setAttribute("style", "box-shadow: 0px 0px 0px; border: 0px");
            }
            tr = document.getElementById(target.id + 'Label' + row);
            if(tr)
            {
            	tr.setAttribute("style", "box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.7); border: solid 1px #A8A8A8");
            	currentHighlightedRow = row;
            }
            
        }
        /**
        * Function: (private) mouseMoveHandler
        * 
        * Handler observes mouse movement over the graph area. Fires the 
        * 'flotr:mousemove' event.
        * 
        * Parameters:
        * 		event - 'mousemove' Event object.
        * 
        * Returns:
        * 		void
        */
        function mouseMoveHandlerforPie(event) {
            if (event.pageX == null && event.clientX != null) {
                var de = document.documentElement, b = document.body;
                lastMousePos.pageX = event.clientX + (de && de.scrollLeft || b.scrollLeft || 0);
                lastMousePos.pageY = event.clientY + (de && de.scrollTop || b.scrollTop || 0);
            } else {
                lastMousePos.pageX = event.pageX;
                lastMousePos.pageY = event.pageY;
            }

            var offset = overlay.cumulativeOffset();
            var x = xaxis.min + (event.pageX - offset.left - plotOffset.left) / hozScale;
            var y = yaxis.max - (event.pageY - offset.top - plotOffset.top) / vertScale;
            var pos = { x: x, y: y };
            if (options.mouse.track && selectionInterval == null) {
                hit(pos);
            }

            target.fire('flotr:mousemove', [event, pos]);
        }
        /**
        * Function: (private) mouseDownHandler
        * 
        * Handler observes the 'mousedown' event.
        * 
        * Parameters:
        * 		event - 'mousedown' Event object.
        * 
        * Returns:
        * 		void
        */
        function mouseDownHandler(event) {
            if (!event.isLeftClick()) return;

            setSelectionPos(selection.first, event);
            if (selectionInterval != null) {
                clearInterval(selectionInterval);
            }
            lastMousePos.pageX = null;
            selectionInterval = setInterval(updateSelection, 1000 / options.selection.fps);

            $(document).observe('mouseup', mouseUpHandler);
        }
        /**
        * Function: (private) fireSelectedEvent
        * 
        * Fires the 'flotr:select' event when the user made a selection.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function fireSelectedEvent() {
            var x1 = (selection.first.x <= selection.second.x) ? selection.first.x : selection.second.x;
            var x2 = (selection.first.x <= selection.second.x) ? selection.second.x : selection.first.x;
            var y1 = (selection.first.y >= selection.second.y) ? selection.first.y : selection.second.y;
            var y2 = (selection.first.y >= selection.second.y) ? selection.second.y : selection.first.y;

            x1 = xaxis.min + x1 / hozScale;
            x2 = xaxis.min + x2 / hozScale;
            y1 = yaxis.max - y1 / vertScale;
            y2 = yaxis.max - y2 / vertScale;

            target.fire('flotr:select', [{ x1: x1, y1: y1, x2: x2, y2: y2}]);
        }
        /**
        * Function: (private) mouseUpHandler
        * 
        * Handler observes the mouseup event for the document. 
        * 
        * Parameters:
        * 		event - 'mouseup' Event object.
        * 
        * Returns:
        * 		void
        */
        function mouseUpHandler(event) {
            $(document).stopObserving('mouseup', mouseUpHandler);
            if (selectionInterval != null) {
                clearInterval(selectionInterval);
                selectionInterval = null;
            }

            setSelectionPos(selection.second, event);
            clearSelection();

            if (selectionIsSane() || event.isLeftClick()) {
                drawSelection();
                fireSelectedEvent();
                ignoreClick = true;
            }
            Event.stop(event);
        }
        /**
        * Function: (private) setSelectionPos
        * 
        * Calculates the position of the selection.
        * 
        * Parameters:
        * 		pos - Position object.
        * 		event - Event object.
        * 
        * Returns:
        * 		void
        */
        function setSelectionPos(pos, event) {
            var offset = $(overlay).cumulativeOffset();
            if (options.selection.mode == 'y') {
                pos.x = (pos == selection.first) ? 0 : plotWidth;
            } else {
                pos.x = event.pageX - offset.left - plotOffset.left;
                pos.x = Math.min(Math.max(0, pos.x), plotWidth);
            }

            if (options.selection.mode == 'x') {
                pos.y = (pos == selection.first) ? 0 : plotHeight;
            } else {
                pos.y = event.pageY - offset.top - plotOffset.top;
                pos.y = Math.min(Math.max(0, pos.y), plotHeight);
            }
        }
        /**
        * Function: (private) updateSelection
        * 
        * Updates (draws) the selection box.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function updateSelection() {
            if (lastMousePos.pageX == null) return;

            setSelectionPos(selection.second, lastMousePos);
            clearSelection();

            if (selectionIsSane()) drawSelection();
        }
        /**
        * Function: (private) clearSelection
        * 
        * Removes the selection box from the overlay canvas.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function clearSelection() {
            if (prevSelection == null) return;

            var x = Math.min(prevSelection.first.x, prevSelection.second.x),
				y = Math.min(prevSelection.first.y, prevSelection.second.y),
				w = Math.abs(prevSelection.second.x - prevSelection.first.x),
				h = Math.abs(prevSelection.second.y - prevSelection.first.y);

            octx.clearRect(x + plotOffset.left - octx.lineWidth,
						   y + plotOffset.top - octx.lineWidth,
						   w + octx.lineWidth * 2,
						   h + octx.lineWidth * 2);

            prevSelection = null;
        }
        /**
        * Function: (private) setSelection
        * 
        * Allows the user the manually select an area.
        * 
        * Parameters:
        * 		area - Object with coordinates to select.
        * 
        * Returns:
        * 		void
        */
        function setSelection(area) {
            clearSelection();

            selection.first.y = (options.selection.mode == "x") ? 0 : (yaxis.max - area.y1) * vertScale;
            selection.second.y = (options.selection.mode == "x") ? plotHeight : (yaxis.max - area.y2) * vertScale;
            selection.first.x = (options.selection.mode == "y") ? 0 : (area.x1 - xaxis.min) * hozScale;
            selection.second.x = (options.selection.mode == "y") ? plotWidth : (area.x2 - xaxis.min) * hozScale;

            drawSelection();
            fireSelectedEvent();
        }
        /**
        * Function: (private) drawSelection
        * 
        * Draws the selection box.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawSelection() {
            if (prevSelection != null &&
				selection.first.x == prevSelection.first.x &&
				selection.first.y == prevSelection.first.y &&
				selection.second.x == prevSelection.second.x &&
				selection.second.y == prevSelection.second.y)
                return;

            octx.strokeStyle = parseColor(options.selection.color).scale(null, null, null, 0.8).toString();
            octx.lineWidth = 1;
            ctx.lineJoin = 'round';
            octx.fillStyle = parseColor(options.selection.color).scale(null, null, null, 0.4).toString();

            prevSelection = { first: { x: selection.first.x,
                y: selection.first.y
            },
                second: { x: selection.second.x,
                    y: selection.second.y
                }
            };

            var x = Math.min(selection.first.x, selection.second.x),
				y = Math.min(selection.first.y, selection.second.y),
				w = Math.abs(selection.second.x - selection.first.x),
				h = Math.abs(selection.second.y - selection.first.y);

            octx.fillRect(x + plotOffset.left, y + plotOffset.top, w, h);
            octx.strokeRect(x + plotOffset.left, y + plotOffset.top, w, h);
        }
        /**
        * Function: (private) selectionIsSane
        * 
        * Determines whether or not the selection is sane and should be drawn.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		boolean - True when sane, false otherwise.
        */
        function selectionIsSane() {
            var minSize = 5;
            return Math.abs(selection.second.x - selection.first.x) >= minSize &&
				Math.abs(selection.second.y - selection.first.y) >= minSize;
        }
        /**
        * Function: (private) clearHit
        * 
        * Removes the mouse tracking point from the overlay.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function clearHit() {
            if (prevHit) {
                octx.clearRect(
					tHoz(prevHit.x) + plotOffset.left - options.points.radius * 2,
					tVert(prevHit.y) + plotOffset.top - options.points.radius * 2,
					options.points.radius * 3 + options.points.lineWidth * 3,
					options.points.radius * 3 + options.points.lineWidth * 3
				);
                prevHit = null;
            }
        }
        /**
        * Function: (private) hit
        * 
        * Retrieves the nearest data point from the mouse cursor. If it's within
        * a certain range, draw a point on the overlay canvas and display the x and y
        * value of the data.
        * 
        * Parameters:
        * 		mouse - Object that holds the relative x and y coordinates of the cursor.
        * 
        * Returns:
        * 		void
        */
        function hit(mouse) {
            /**
            * Nearest data element.
            */
            var n = {
                dist: Number.MAX_VALUE,
                x: null,
                y: null,
                mouse: null
            };

            for (var i = 0, data, xsens, ysens; i < series.length; i++) {
                if (!series[i].mouse.track) continue;
                data = series[i].data;
                xsens = (hozScale * series[i].mouse.sensibility);
                ysens = (vertScale * series[i].mouse.sensibility);
                for (var j = 0, xabs, yabs; j < data.length; j++) {
                    xabs = hozScale * Math.abs(data[j][0] - mouse.x);
                    yabs = vertScale * Math.abs(data[j][1] - mouse.y);

                    if (xabs < xsens && yabs < ysens && (xabs + yabs) < n.dist) {
                        n.dist = (xabs + yabs);
                        n.x = data[j][0];
                        n.y = data[j][1];
                        n.mouse = series[i].mouse;
                    }
                }
            }

            if (n.mouse && n.mouse.track && !prevHit || (prevHit && n.x != prevHit.x && n.y != prevHit.y)) {
                var el = target.select('.flotr-mouse-value').first();
                if (!el) {
                    var pos = '', p = options.mouse.position, m = options.mouse.margin;
                    if (p.charAt(0) == 'n') pos += 'top:' + (m + plotOffset.top) + 'px;';
                    else if (p.charAt(0) == 's') pos += 'bottom:' + (m + plotOffset.bottom) + 'px;';
                    if (p.charAt(1) == 'e') pos += 'right:' + (m + plotOffset.right) + 'px;';
                    else if (p.charAt(1) == 'w') pos += 'left:' + (m + plotOffset.bottom) + 'px;';

                    target.insert('<div class="flotr-mouse-value" style="opacity:0.7;background-color:#000;color:#fff;display:none;position:absolute;' + pos + '"></div>');
                    return;
                }
                if (n.x !== null && n.y !== null) {
                    el.setStyle({ display: 'block' });

                    clearHit();
                    if (n.mouse.lineColor != null) {
                        octx.save();
                        octx.translate(plotOffset.left, plotOffset.top);
                        octx.lineWidth = options.points.lineWidth;
                        octx.strokeStyle = n.mouse.lineColor;
                        octx.fillStyle = '#ffffff';
                        octx.beginPath();
                        octx.arc(tHoz(n.x), tVert(n.y), options.points.radius, 0, 2 * Math.PI, true);
                        octx.fill();
                        octx.stroke();
                        octx.restore();
                    }
                    prevHit = n;

                    var decimals = n.mouse.trackDecimals;
                    if (decimals == null || decimals < 0) decimals = 0;

                    el.innerHTML = n.mouse.trackFormatter({ x: n.x.toFixed(decimals), y: n.y.toFixed(decimals) });
                    target.fire('flotr:hit', [n]);
                } else if (prevHit) {
                    el.setStyle({ display: 'none' });
                    clearHit();
                }
            }
        }
        /**
        * Function: (private) getColor
        * 
        * Gives new color.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		new rgb color as rgb(r, g, b). If isObject is true, returns an instance of Color
        */
        function getColor(asObject) {
            var rgb = [];
            for (var i = 0; i < 3; i++) {
                rgb[i] = Math.round(100 * Math.random() + 50); // [155-255] = lighter colors
            }
            if (asObject)
                return new Color(rgb[0], rgb[1], rgb[2], 1);

            return 'rgb(' + rgb.join(',') + ')';
        }

        /**
        * Function: (private) drawPie
        * 
        * Draws Pie chart.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawPie() {
            if (series.length < 1) {
                // No data in the series
                return;
            }
            var PIE_RADII = [0.5, 0.35, 0.45, 0.6, 0.65, 0.8, 0.6, 0.65, 0.7, 0.75]; //label to be put at different posiitons fr slices.. aribitatry values are put by Anand to remove the overlapping of labels.
            //[0.3, 0.6, 0.8]  
            var pieSeries = series[0].data;
            //pieSeries.sort(pieSort);
            // pieSeries.reverse();
            var nbr = pieSeries.length;
            if (!nbr){
                return;
            }

            bindEvents();


            //set min-max for x-y
            xaxis.min = 0;
            var wd = xaxis.max = canvasWidth || 400;
            yaxis.min = 0;
            var ht = yaxis.max = canvasHeight || 400;
            hozScale = 1;
            vertScale = 1;

            //centre of pie at pcX, pcY
            var pcX = (wd / 2);
            var pcY = (ht / 2);
            var pRadius = (pcX > pcY) ? (pcY * 0.9) : (pcX * 0.9);

            var pieSeriesData = new Array(nbr);
            var pieSeriesLabels = new Array(nbr);
            var pieSeriesColors = new Array(nbr);
            var endAngles = new Array(nbr);
            var piePercent = { percentage: [], percentX: [], percentY: [] };

            var dataTotal = 0;
            for (var i = 0; i < nbr; i++) {
                var row = pieSeries[i];
                var x = parseFloat(row[0]);
                pieSeriesData[i] = x;
                pieSeriesLabels[i] = row[1];
                pieSeriesColors[i] = (i < options.colors.length) ? options.colors[i] : getColor();
                dataTotal += x;
            }
            var showValue = options.rawDataDisplay;
            var startAngle = -Math.PI * 0.5; //start at top of circle.
            var endAngle;
            for (var i = 0; i < nbr; i++) {
                var curValue = pieSeriesData[i] / dataTotal;
                if (i == (nbr - 1)) //this is the last one. Let us not get into round-off errors
                    endAngle = 1.5 * Math.PI;
                else
                    endAngle = startAngle + curValue * 2 * Math.PI;
                endAngles[i] = endAngle;
                ctx.beginPath();
                ctx.moveTo(pcX, pcY);
                // Added to fix the immediate issue of label wrapping. Needs to be revisited to give a generic implementation
                if (Math.abs(startAngle - endAngle) > 0.25) //modified the value by Anand from 0.15 to 0.25 so that arc for slices start at differnt position if the value is gretear than 0.25
                {
                    ctx.arc(pcX, pcY, pRadius - 10, startAngle, endAngle, false);
                }
                else {
                    ctx.arc(pcX, pcY, pRadius, startAngle, endAngle, false);
                }
                ctx.lineTo(pcX, pcY);
                ctx.closePath();
                var grad = ctx.createRadialGradient(pcX, pcY, 0, pcX, pcY, pRadius);
                var clr = parseColor(pieSeriesColors[i]);
                clr.scale(0.6, 0.6, 0.6);
                grad.addColorStop(1, clr.toString());
                clr.scale(2.5, 2.5, 2.5);
                grad.addColorStop(0, clr.toString());
                ctx.fillStyle = grad; 
                ctx.fill();
                startAngle = endAngle;
            }

            // Added to fix the immediate issue of label wrapping. Needs to be revisited to give a generic implementation
            ctx.save();
            startAngle = -Math.PI * 0.5; //start at top of circle.
            var radIdx = 0;
            for (var i = 0; i < nbr; i++) {
                var curValue = pieSeriesData[i] / dataTotal;
                if (i == (nbr - 1)) //this is the last one. Let us not get into round-off errors
                    endAngle = 1.5 * Math.PI;
                else
                    endAngle = startAngle + curValue * 2 * Math.PI;
                endAngles[i] = endAngle;
                //do we need to print % ?
                    var val = pieSeriesData[i];
                    if (showValue == 'percent') {
                        val = Math.round(curValue * 100) + '%';
                    }
                    piePercent.percentage.push(val);

                   // val = pieSeriesLabels[i] + ' - ' + val;
                    var angle = startAngle + (endAngle - startAngle) / 2;
                    var x = pcX + Math.cos(angle) * pRadius / 2;
                    x = Math.round(x);
                    x = x - ctx.measureText(val).width / 2; //so that the text is centered 
                    var textRadius = pRadius * PIE_RADII[radIdx];
                    radIdx++;
                    if (radIdx >= PIE_RADII.length)
                        radIdx = 0;
                    var y = pcY + Math.sin(angle) * textRadius;
                    y = Math.round(y);

                    piePercent.percentX.push(x);
                    piePercent.percentY.push(y);
                if (showValue && (Math.abs(startAngle - endAngle) > 0.25))//modified by Anand from 0.15 to 0.25 to show the labels and percentage if the angle differnce is more than 0.25
                {
                    ctx.fillStyle = options.labelColor;
                    ctx.fillText(val, x, y);
                }
                startAngle = endAngle;
            }

            ctx.restore();
            // Added to fix the immediate issue of label wrapping. Needs to be revisited to give a generic implementation

            if (options.legend.show)
                drawPieLegends(pieSeriesLabels, pieSeriesData, pieSeriesColors);
            //keep info for mouse move handler
            pieData = { originX: pcX
                , originY: pcY
                , radius: pRadius
                , endAngles: endAngles
                , colors: pieSeriesColors
                , lastIdx: null
                , piePercent: piePercent
            };
        }

        function pieSort(a, b) {
            return parseFloat(a[0]) - parseFloat(b[0]);
        }

        /**
        * Function: (private) drawPieLegends
        * 
        * Draws legends for a pie chart.
        * 
        * Parameters:
        * 		labels : array of labels
        *       data   : array of data points
        *       colors : array of colors used for drawing pie charts
        * 
        * Returns:
        * 		void
        */
        function drawPieLegends(labels, data, colors) {
            var fragments = [];
            //we open/close tr after inserting the rest
            var nbrCols = options.legend.noColumns || 1;
            var colsSoFar = 0;
            for (var i = 0; i < labels.length; ++i) {
                if (colsSoFar == nbrCols) {
                    fragments.push('</tr><tr>');
                    colsSoFar = 0;
                }
                var label = labels[i];
                var val = data[i];
                if (options.legend.labelFormatter)
                    label = options.legend.labelFormatter(label, val);
                else
                    label = label + '(' + val + ')';

                var div = legendDetails[label] = '<div style="border:1px solid '
                        + options.legend.labelBoxBorderColor
                        + ';padding:1px"><div style="width:14px;height:10px;background-color:'
                        + colors[i]
                        + '"></div></div>';
                fragments.push('<td class="flotr-legend-color-box">');
                fragments.push(div);
                fragments.push('</td><td class="flotr-legend-label"id ="' + target.id + 'Label' + (i + 1) + '">');
                fragments.push(label);
                fragments.push('</td>');
                colsSoFar++;
            }

            var table = '<table style="font-size:smaller;color:' + options.grid.color + '"><tr>' + fragments.join("") + '</tr></table>';
            if (options.legend.container)
                options.legend.container.insert(table);
            else
                drawLegendContainer(table);
        }

        /**
        * Function: (private) drawLegendContainer
        * 
        * gets html required to paint container for legends
        * 
        * Parameters:
        * 		table : html for table that has all the legends in it
        * 
        * Returns:
        * 		void
        */
        function drawLegendContainer(table) {
            var p = options.legend.position;
            var m = options.legend.margin;
            var pos;
            if (p.charAt(0) == 'n')
                pos = 'top:' + (m + plotOffset.top) + 'px;';
            else if (p.charAt(0) == 's')
                pos = 'bottom:' + (m + plotOffset.bottom) + 'px;';

            if (p.charAt(1) == 'e')
                pos += 'right:' + (m + plotOffset.right) + 'px;';
            else if (p.charAt(1) == 'w')
                pos += 'left:' + (m + plotOffset.bottom) + 'px;';

            var divText = '<div class="flotr-legend" style="position:absolute;z-index:2;' + pos;

            if (options.legend.backgroundOpacity != 0.0) {
                var c = options.legend.backgroundColor;
                if (!c) {
                    var tmp = options.grid.backgroundColor ? options.grid.backgroundColor : extractColor(div);
                    c = parseColor(tmp).adjust(null, null, null, 1).toString();
                }
                divText += ';background-color:' + c + ';opacity:' + options.legend.backgroundOpacity;
            }

            target.insert(divText + '">' + table + '</div>').getElementsBySelector('div.flotr-legend').first();
        }
        // May 09 2012 : Chart Extension - Pathfinder (Start) : Aravinda
        /**
        * Function: (private) drawSunBurst
        * 
        * Draws SunBurst chart.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawSunBurstOld() {
            if (series.length < 1) {
                // No data in the series
                return;
            }

            var pcX = (target.getWidth() / 2);
            var pcY = (target.getHeight() / 2);
            var pRadius = (pcX > pcY) ? (pcY * 0.9) : (pcX * 0.9);

            var pieSeries = series[0].data;

            var dataTotal = 0;
            for (var i = 0; i < pieSeries.length; i++) {
                dataTotal += pieSeries[i][0];
            }

            var dataPaintedSoFar = 0;
            var curGroup = '';
            var j = -1;
            var pieSeriesColors;
            var innerStartAngle;
            var innerEndAngle;

            for (var i = 0; i < pieSeries.length; i++) {
            	var row = pieSeries[i];
                var curValue = row[0] / dataTotal;
                var startAngle = Math.PI * (-0.5 + 2 * dataPaintedSoFar);
                var endAngle = Math.PI * (-0.5 + 2 * (dataPaintedSoFar + curValue));

                if (curGroup != row[2]) {

                    if (curGroup != '') {
                        ctx.beginPath();
                        ctx.moveTo(pcX, pcY);
                        ctx.arc(pcX, pcY, pRadius * 0.6, innerStartAngle, startAngle, false);
                        ctx.lineTo(pcX, pcY);
                        ctx.closePath();
                        var radialGrad = ctx.createRadialGradient(pcX, pcY, pRadius * 0.3, pcX, pcY, pRadius * 0.6);
                        radialGrad.addColorStop(0.01, pieSeriesColors);
                        radialGrad.addColorStop(0.9, pieSeriesColors);
                        radialGrad.addColorStop(0.9, pieSeriesColors);
                        radialGrad.addColorStop(0.01, pieSeriesColors);

                        ctx.fillStyle = radialGrad;
                        ctx.fill();
                        ctx.lineWidth = 0.25;
                        ctx.strokeStyle = 'black';
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                        ctx.fillStyle = 'black';
                        if (Math.abs(innerStartAngle - endAngle) > 0.15) {
                            ctx.save();
                            if (Math.abs(innerStartAngle + (startAngle - innerStartAngle) / 2) > 1.5) {
                                var yValue = Math.sin(innerStartAngle + (startAngle - innerStartAngle) / 2) * (pRadius * 0.51) + pcY;
                                var xValue = Math.cos(innerStartAngle + (startAngle - innerStartAngle) / 2) * (pRadius * 0.51) + pcX;
                                ctx.translate(xValue, yValue);
                                ctx.rotate(innerStartAngle + (startAngle - innerStartAngle) / 2 + Math.PI);
                            } else {
                                var yValue = Math.sin(innerStartAngle + (startAngle - innerStartAngle) / 2) * (pRadius * 0.31) + pcY;
                                var xValue = Math.cos(innerStartAngle + (startAngle - innerStartAngle) / 2) * (pRadius * 0.31) + pcX;
                                ctx.translate(xValue, yValue);
                                ctx.rotate(innerStartAngle + (startAngle - innerStartAngle) / 2);
                            }
                            var availableWidth = (pRadius * 0.51 - pRadius * 0.31);
                            if (curGroup.length * 5 > availableWidth) {
                                ctx.fillText(curGroup.substring(0, Math.floor(availableWidth / 5)), 0, 0);
                            } else {
                                ctx.fillText(curGroup, 0, 0);
                            }
                            ctx.restore();
                        }
                    }
                    curGroup = row[2];
                    innerStartAngle = startAngle;
                    j++;
                    pieSeriesColors = (j < options.colors.length) ? options.colors[j] : getColor();

                }

                ctx.beginPath();
                ctx.moveTo(pcX, pcY);
                ctx.arc(pcX, pcY, pRadius, startAngle, endAngle, false);
                ctx.lineTo(pcX, pcY);
                ctx.closePath();

                var radialGrad = ctx.createRadialGradient(pcX, pcY, pRadius * 0.6, pcX, pcY, pRadius);
                radialGrad.addColorStop(0.01, pieSeriesColors);
                radialGrad.addColorStop(0.9, pieSeriesColors);
                radialGrad.addColorStop(0.9, pieSeriesColors);
                radialGrad.addColorStop(0.01, pieSeriesColors);
                ctx.fillStyle = radialGrad;
                ctx.globalAlpha = 0.8;
                ctx.fill();
                ctx.lineWidth = 0.25;
                ctx.strokeStyle = 'black';
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.fillStyle = 'black';
                if (Math.abs(startAngle - endAngle) > 0.15) {
                    ctx.save();
                    if (Math.abs(startAngle + (endAngle - startAngle) / 2) > 1.5) {
                        var yValue = Math.sin(startAngle + (endAngle - startAngle) / 2) * (pRadius * 0.91) + pcY;
                        var xValue = Math.cos(startAngle + (endAngle - startAngle) / 2) * (pRadius * 0.91) + pcX;
                        ctx.translate(xValue, yValue);
                        ctx.rotate(startAngle + (endAngle - startAngle) / 2 + Math.PI);
                    } else {
                        var yValue = Math.sin(startAngle + (endAngle - startAngle) / 2) * (pRadius * 0.61) + pcY;
                        var xValue = Math.cos(startAngle + (endAngle - startAngle) / 2) * (pRadius * 0.61) + pcX;
                        ctx.translate(xValue, yValue);
                        ctx.rotate(startAngle + (endAngle - startAngle) / 2);
                    }
                    var availableWidth = (pRadius * 0.91 - pRadius * 0.61);
                    var txt = row[1] + '';
                    if (txt.length * 5 > availableWidth) {
                        ctx.fillText(txt.substring(0, Math.floor(availableWidth / 5)), 0, 0);
                    } else {
                        ctx.fillText(txt, 0, 0);
                    }
                    ctx.restore();
                }

                if (i == (pieSeries.length - 1)) {
                    ctx.beginPath();
                    ctx.moveTo(pcX, pcY);
                    ctx.arc(pcX, pcY, pRadius * 0.6, innerStartAngle, endAngle, false);
                    ctx.lineTo(pcX, pcY);
                    ctx.closePath();
                    var radialGrad = ctx.createRadialGradient(pcX, pcY, pRadius * 0.3, pcX, pcY, pRadius * 0.6);
                    radialGrad.addColorStop(0.01, pieSeriesColors);
                    radialGrad.addColorStop(0.9, pieSeriesColors);
                    radialGrad.addColorStop(0.9, pieSeriesColors);
                    radialGrad.addColorStop(0.01, pieSeriesColors);
                    ctx.fillStyle = radialGrad;
                    ctx.fill();
                    ctx.lineWidth = 0.25;
                    ctx.strokeStyle = 'black';
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = 'black';
                    if (Math.abs(innerStartAngle - endAngle) > 0.15) {
                        ctx.save();
                        if (Math.abs(innerStartAngle + (endAngle - innerStartAngle) / 2) > 1.5) {
                            var yValue = Math.sin(innerStartAngle + (endAngle - innerStartAngle) / 2) * (pRadius * 0.51) + pcY;
                            var xValue = Math.cos(innerStartAngle + (endAngle - innerStartAngle) / 2) * (pRadius * 0.51) + pcX;
                            ctx.translate(xValue, yValue);
                            ctx.rotate(innerStartAngle + (endAngle - innerStartAngle) / 2 + Math.PI);
                        } else {
                            var yValue = Math.sin(innerStartAngle + (endAngle - innerStartAngle) / 2) * (pRadius * 0.31) + pcY;
                            var xValue = Math.cos(innerStartAngle + (endAngle - innerStartAngle) / 2) * (pRadius * 0.31) + pcX;
                            ctx.translate(xValue, yValue);
                            ctx.rotate(innerStartAngle + (endAngle - innerStartAngle) / 2);
                        }
                        var availableWidth = (pRadius * 0.51 - pRadius * 0.31);
                        if (curGroup.length * 5 > availableWidth) {
                            ctx.fillText(curGroup.substring(0, Math.floor(availableWidth / 5)), 0, 0);
                        } else {
                            ctx.fillText(curGroup, 0, 0);
                        }
                        ctx.restore();
                    }

                    ctx.beginPath();
                    ctx.arc(pcX, pcY, pRadius * 0.3, 0, Math.PI * 2, false);
                    ctx.closePath();
                    var radialGrad = ctx.createRadialGradient(pcX, pcY, pRadius * 0.0, pcX, pcY, pRadius * 0.3);
                    radialGrad.addColorStop(0.01, "#ffffff");
                    radialGrad.addColorStop(0.9, "#ffffff");
                    radialGrad.addColorStop(0.9, "#ffffff");
                    radialGrad.addColorStop(0.01, "#ffffff");
                    ctx.fillStyle = radialGrad;
                    ctx.globalAlpha = 1;
                    ctx.fill();
                    ctx.lineWidth = 0.25;
                    ctx.strokeStyle = 'black';
                    ctx.stroke();
                    ctx.fillStyle = 'black';
                    var availableWidth = (pRadius * 0.3 * 2 - 10);
                    var txt = row[3] + '';
                    if (txt.length * 5 > availableWidth) {
                        ctx.fillText(txt.substring(0, Math.floor(availableWidth / 5)), pcX - (pieSeries[i][3].length / 2) * 5, pcY + 3);
                    } else {
                        ctx.fillText(txt, pcX - (txt.length / 2) * 5, pcY + 3);
                    }
                    ctx.globalAlpha = 1;
                }

                dataPaintedSoFar += curValue;

            }

        }
        /**
        * Function: (private) drawSunBurst
        * 
        * Draws SunBurst chart.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawSunBurst() {
            if (series.length < 1) {
                // No data in the series
                return;
            }
            var pieSeries = series[0].data;
            var nbr = pieSeries.length;
            if (!nbr)
                return;

            bindEvents();
            //set min-max for x-y
            xaxis.min = 0;
            var wd = xaxis.max = canvasWidth;
            yaxis.min = 0;
            var ht = yaxis.max = canvasHeight;
            hozScale = 1;
            vertScale = 1;

            //centre of pie at pcX, pcY
            var pcX = (wd / 2);
            var pcY = (ht / 2);
            var pRadius = (pcX > pcY) ? (pcY * 0.9) : (pcX * 0.9);
            var groupRadius = 0.6 * pRadius;
            var coreRadius = 0.3 * pRadius;

            var nodes = []; //each node contains all attributes.
            var dataTotal = 0;
            var coreLabel = pieSeries[0][3];
            var groupIndex = -1; //0 woudl point to first group
            var group = null;
            var color = null;
            for (var i = 0; i < nbr; i++) {
                var row = pieSeries[i];
                if (group != row[2]) //new group
                {
                    groupIndex++;
                    color = (groupIndex < options.colors.length) ? parseColor(options.colors[groupIndex]) : getColor(true);
                    group = row[2];
                }
                var x = parseFloat(row[0]);
                dataTotal += x;
                nodes.push({ x: x, label: row[1], group: group, color: color });
            }

            var startAngle = -Math.PI * 0.5; //start at top of circle.
            var groupStartAngle = startAngle;
            var endAngle, curValue, angle;
            //to simplify group processing, let us populate first group ouside the loop
            var node = nodes[0];
            group = node.group;
            endAngles = [];
            var groupSlice = { x: pcX, y: pcY, radius: groupRadius, textRadius: 0.35 * pRadius, color: node.color, useGradient: true, label: group, startAngle: startAngle };
            var slice = { x: pcX, y: pcY, radius: pRadius, textRadius: 0.65 * pRadius, useGradient: true };
            var i = 0;
            while (node) //better than for loop because of the way we are handling group change
            {
                curValue = node.x / dataTotal;
                angle = curValue * 2 * Math.PI;
                if (i == (nbr - 1)) //this is the last one. Let us not get into round-off errors
                    endAngle = 1.5 * Math.PI;
                else
                    endAngle = startAngle + angle;
                endAngles.push(endAngle);
                slice.startAngle = startAngle;
                slice.endAngle = endAngle;
                slice.color = node.color;
                slice.label = node.label;
                drawSlice(slice, 0.6);

                i++;
                node = nodes[i];
                //draw group slice if required
                if (!node || group != node.group) {
                    groupSlice.endAngle = endAngle;
                    drawSlice(groupSlice, 0.4);

                    //change attributes of next group slice
                    if (node) {
                        group = groupSlice.label = node.group;
                        groupSlice.color = node.color;
                        groupSlice.startAngle = endAngle;
                    }
                    else //we are done. draw the core circle
                    {
                        groupSlice.startAngle = 0;
                        groupSlice.endAngle = 2 * Math.PI;
                        groupSlice.radius = coreRadius;
                        groupSlice.color = '#FFFFFF';
                        groupSlice.label = coreLabel;
                        groupSlice.textRadius = -10;
                        groupSlice.useGradient = false;
                        drawSlice(groupSlice, 0);
                       // drawCoreImage(groupSlice);
                    }
                }
                startAngle = endAngle;
            }
            pieData = { originX: pcX, originY: pcY, radius: pRadius, groupRadius: groupRadius, coreRadius: coreRadius, endAngles: endAngles }
        }

        function drawCoreImage(slice) {
            var img = new Image();
            img.src = '../../images/Apple-Chrome.tiff';
            ctx.drawImage(img, slice.x - 20, slice.y - 25, 40, 40);
        }


        /**
        * Function: (private) drawSlice
        * 
        * Draws one slice of a pie
        * 
        * Parameters:
        * 		slice: object that has all the required parameters to draw the slice
        * x, y, radius, startAngle, endAngle, label, color, useGradient(we use a fixed gradient of teh supplied color as of now)
        * 
        * Returns:
        * 		void
        */
        function drawSlice(slice, gradientStart) {
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(slice.x, slice.y); //go to center
            ctx.arc(slice.x, slice.y, slice.radius, slice.startAngle, slice.endAngle, false);
            ctx.lineTo(slice.x, slice.y);
            ctx.closePath();
            var clr = parseColor(slice.color);
            clr.a = 1;
            if (slice.useGradient) {
                var grad = ctx.createRadialGradient(slice.x, slice.y, slice.radius * gradientStart, slice.x, slice.y, slice.radius);
                grad.addColorStop(0.0, clr);
                clr.scale(0.5, 0.5, 0.5);
                grad.addColorStop(0.001, clr.toString());
                clr.scale(2, 2, 2);
                grad.addColorStop(1, clr.toString());
                ctx.fillStyle = grad;
            }
            else
                ctx.fillStyle = clr.toString();
            ctx.fill();
            var angle = slice.endAngle - slice.startAngle;
            if (Math.abs(angle) * 180 / Math.PI <= 358) //it is not a full circle
            {
                ctx.lineWidth = 0.25;
                ctx.strokeStyle = 'black';
                ctx.stroke();
            }

            if (!slice.label || Math.abs(angle) <= 0.1)
                return;
            ctx.save();

            ctx.fillStyle = options.labelColor;
            //take the radius along the middle of this slice
            var midAngle = slice.startAngle + (slice.endAngle - slice.startAngle) / 2;
            var hyp, angle, x, y; // hupotenues and rotation angle
            var maxChars = Math.floor((slice.radius - slice.textRadius) * 0.3); // 0.4 = 2 /5 : that is length * 2 / nbr of pixels per char
            var label = slice.label;
            var nbrChars = label.length;
            if (nbrChars > maxChars) {
                label = label.substring(0, maxChars);
                nbrChars = maxChars;
            }
            var labelWidth = ctx.measureText(label).width;
            var availWidth = slice.radius - slice.textRadius;
            while (labelWidth > availWidth) //there is overflow
            {
                label = label.substr(0, label.length - 2);
                labelWidth = ctx.measureText(label).width;
                PM.debug("label " + label + " is too long. will be chopped ");
            }
            //PM.debug(label.length + ' ' + maxChars + ' ' + nbrChars);
            if (Math.abs(midAngle) > 0.5 * Math.PI) //this is on the left side of center
            {

                hyp = slice.textRadius + ctx.measureText(label).width; // nbrChars * 2.5; //pixels for half the chars, so that it is centered
                angle = midAngle + Math.PI;
            }
            else {
                hyp = slice.textRadius; // -nbrChars * 2.5;
                angle = midAngle;
            }
            var y = Math.sin(midAngle) * hyp + slice.y;
            var x = Math.cos(midAngle) * hyp + slice.x;
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        }

        /**
        * Function: (private) drawSankey
        * 
        * Draws Sankey chart.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawSankeyOld() {
            if (series.length < 1) {
                // No data in the series
                return;
            }

            var scX = (target.getWidth() * 0.2);
            var scY = (target.getHeight() * 0.05);

            var ecX = (target.getWidth() * 0.8);
            var ecY = (target.getHeight() * 0.95);

            var sankeySeries = series[0].data;

            var dataTotal = 0;
            var leftData = {};
            var rightData = {};
            var allData = {};

            var slicesLeft = 0;
            var slicesRight = 0;
            var dataLeft = 0;
            var dataRight = 0;

            for (var i = 0; i < sankeySeries.length; i++) {

                dataTotal += sankeySeries[i][0];

                if (leftData[sankeySeries[i][2]]) {
                    leftData[sankeySeries[i][2]] += sankeySeries[i][0];
                    dataLeft += sankeySeries[i][0];
                } else {
                    leftData[sankeySeries[i][2]] = sankeySeries[i][0];
                    dataLeft += sankeySeries[i][0];
                    slicesLeft++;
                }

                if (rightData[sankeySeries[i][1]]) {
                    rightData[sankeySeries[i][1]] += sankeySeries[i][0];
                    dataRight += sankeySeries[i][0];
                } else {
                    rightData[sankeySeries[i][1]] = sankeySeries[i][0];
                    dataRight += sankeySeries[i][0];
                    slicesRight++;
                }

                if (allData[sankeySeries[i][1]]) {
                    allData[sankeySeries[i][1]][sankeySeries[i][2]] = sankeySeries[i][0];
                } else {
                    var newArray = {};
                    newArray[sankeySeries[i][2]] = sankeySeries[i][0];
                    allData[sankeySeries[i][1]] = newArray;
                }

            }

            var leftYScale = ((ecY - scY) - (5 * slicesLeft)) / dataLeft;
            var rightYScale = ((ecY - scY) - (5 * slicesRight)) / dataRight;

            var leftPositions = {};
            var leftDataCovered = {};
            var startY = scY;
            for (var leftKey in leftData) {

                var endY = startY + leftData[leftKey] * leftYScale;
                ctx.moveTo(scX, startY);
                ctx.lineTo(scX, endY);
                ctx.fillText(leftKey, 0, startY + (endY - startY) / 2 + 3);
                leftPositions[leftKey] = [startY, endY];
                leftDataCovered[leftKey] = startY;
                startY = endY + 5;
                ctx.stroke();
            }

            var rightPositions = {};
            var rightDataCovered = {};
            startY = scY;
            for (var rightKey in rightData) {

                var endY = startY + rightData[rightKey] * rightYScale;
                ctx.moveTo(ecX, startY);
                ctx.lineTo(ecX, endY);
                ctx.fillText(rightKey, ecX + 5, startY + (endY - startY) / 2 + 3);
                rightPositions[rightKey] = [startY, endY];
                rightDataCovered[rightKey] = startY;
                startY = endY + 5;
                ctx.stroke();
            }

            var centerX = (ecX - scX) * 0.7;
            var i = 0;
            for (var key in allData) {
                var lineColor = (options.colors.length && options.colors.length >= i) ? options.colors[i++] : getColor();
                for (var ikey in allData[key]) {
                    ctx.beginPath();
                    ctx.moveTo(ecX - 1, rightDataCovered[key]);
                    ctx.bezierCurveTo(ecX - centerX, rightDataCovered[key], scX + centerX, leftDataCovered[ikey], scX + 1, leftDataCovered[ikey]);
                    leftDataCovered[ikey] += (allData[key][ikey] * leftYScale);
                    rightDataCovered[key] += (allData[key][ikey] * rightYScale);
                    ctx.lineTo(scX + 1, leftDataCovered[ikey]);
                    ctx.bezierCurveTo(scX + centerX, leftDataCovered[ikey], ecX - centerX, rightDataCovered[key], ecX - 1, rightDataCovered[key]);
                    ctx.closePath();
                    ctx.fillStyle = lineColor;
                    ctx.globalAlpha = 0.7;
                    ctx.fill();
                }
            }
        }
        /**
        * Function: (private) drawSankey1 - temp one for developing a new one
        * 
        * Draws Sankey chart.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawSankey() {
            if (series.length < 1) {
                // No data in the series
                return;
            }

            sankeyData = {}; //model that holds all data
            //set min-max for x-y
            xaxis.min = 0;
            var w = xaxis.max = sankeyData.maxX = canvasWidth;
            yaxis.min = 0;
            var h = yaxis.max = sankeyData.maxY = canvasHeight;
            hozScale = 1;
            vertScale = 1;
            //our actual chart area: 5% top/bottom margin. 20% on either side for labels
            sankeyData.labelWidth = Math.round(0.2 * w) - 16; //1 pixel for borders 2 pixel for clearance on left/right..
            sankeyData.startX = Math.round(0.2 * w);
            sankeyData.endX = Math.round(0.8 * w);
            sankeyData.startY = Math.round(0.05 * h); //vertical scale is modified by Anand as height is set dynamically from page and with eariler scale I am getting enough margin from top.
            sankeyData.endY = Math.round(0.95 * h);

            //two intermittant points for sankey curves
            sankeyData.x1 = 0.4 * w;
            sankeyData.x2 = 0.6 * w;
            //read raw data into bars and strips
            sankeySetData(series[0].data);

            //decide scale after allowing 10 pixel gap between bars
            sankeyData.leftScale = (0.9 * h - sankeyData.leftLabels.length * 10) / sankeyData.value;
            sankeyData.rightScale = (0.9 * h - sankeyData.rightLabels.length * 10) / sankeyData.value;

            //Now, let us fix coordinates for left bar, rigth bar and all strips.
            sankeySetBarData(sankeyData.leftLabels, sankeyData.leftBars, sankeyData.leftScale);
            sankeySetBarData(sankeyData.rightLabels, sankeyData.rightBars, sankeyData.rightScale);
            sankeySetStripData();

            //we are now ready to draw the chart
            sankyDrawChart();

            //draw labels on either side
            sankeyDrawLabels();
            //bindEvents();
            target.observe('mouseover', sankeyMouseOver);
            // target.observe('mouseout', sankeyMouseOut);

            /* added by vinay on 28-dec-2012; 
            * if mouse is moved very fastly outside the chart container, mouseout was not firing from the browser.
            * */
            $(document).observe('mouseover', mouseMoveHandler);
            /*end of addition*/
        }

  

        /**
        * Function: (private) sankeyAddRawData
        * 
        * Data model for Sankey :
        * labels = [label1, ....]
        * bar = {value, startY, endY}
        * leftBars = {leftLabel1:left-bar1, ......} with labels within bar being right labels...
        * rightBars = ditto..
        * strip = {value, leftStartY, leftEndY, rightStartY, rightEndY}
        * we add these attributes  sm  : leftLabels, rightLabels, leftBars, rightBars, strips[leftLabel][rightLabel], nbrStrips, value
        * 
        * Parameters:
        *       sm: sankey data model to be updated with cells 
        * 		rawData : array of rows with data, leftLabel and rightLabel as columns
        * 
        * Returns:
        * 		none, but after adding additional data to model
        */
        function sankeySetData(rawData) {
            var totalData = 0;
            var leftBars = {}; //indexed by leftLabel. bar contains bar details and strips within that indexed by label
            var rightBars = {}; //ditto for right
            var allStrips = {}; //sankey strips that connect from left to rightindexed by leftLabel and then rightLabel
            var nbrTotal = rawData.length;

            //and we need distinct labels as arrays
            var leftLabels = [];
            var rightLabels = [];

            var leftLabel, rightLabel, val, bar, strips, row;
            var nbrStrips = 0;
            for (var i = 0; i < nbrTotal; i++) {
                row = rawData[i];
                val = parseFloat(row[0]);
                if (!val)
                    continue; //0 can not be represented in sankey

                leftLabel = row[1];
                rightLabel = row[2];

                totalData += val;
                nbrStrips++;
                //add bars 
                bar = leftBars[leftLabel];
                if (!bar) {
                    leftBars[leftLabel] = bar = { value: 0, label: leftLabel };
                    allStrips[leftLabel] = strips = {};
                    leftLabels.push(leftLabel);
                }
                else
                    strips = allStrips[leftLabel];
                bar.value += val;

                //cretae and add a strip
                strips[rightLabel] = { value: val };

                //add right bar
                bar = rightBars[rightLabel];
                if (!bar) {
                    rightBars[rightLabel] = bar = { value: 0, label: rightLabel };
                    rightLabels.push(rightLabel);
                }
                bar.value += val;
            }

            //we are better-off with labels sorted by ascending order of value
            sankeySortLabels(leftLabels, leftBars);
            sankeySortLabels(rightLabels, rightBars);

            //add attributes of model
            sankeyData.value = totalData;
            sankeyData.nbrStrips = nbrStrips;
            sankeyData.leftLabels = leftLabels;
            sankeyData.rightLabels = rightLabels;
            sankeyData.leftBars = leftBars;
            sankeyData.rightBars = rightBars;
            sankeyData.strips = allStrips;
        }

        //sort labels based their values
        function sankeySortLabels(labels, bars) {
            var n = labels.length;
            var arr = [];
            for (var i = 0; i < n; i++) {
                var label = labels[i]
                arr.push({ label: label, value: bars[label].value });
            }
            arr.sort(mySort);
            arr.reverse();
            for (var i = 0; i < n; i++)
                labels[i] = arr[i].label;
        }

        function sankeySetBarData(labels, bars, scale) {
            var startY = sankeyData.startY;
            var n = labels.length;
            var colors = options.colors || [];
            for (var i = 0; i < n; i++) {
                var label = labels[i];
                var bar = bars[label];
                bar.startY = bar.curY = startY;
                bar.endY = startY + bar.value * scale;
                startY = bar.endY + 10;
                bar.color = colors[i] || getColor();
            }
        }

        function sankeySetStripData() {
            var labels = sankeyData.leftLabels;
            var n = labels.length;
            for (var i = 0; i < n; i++) {
                var leftLabel = labels[i];
                var leftBar = sankeyData.leftBars[leftLabel];
                var strips = sankeyData.strips[leftLabel];
                var color = leftBar.color;
                var startY = leftBar.startY;
                var rightLabels = sankeyData.rightLabels;
                var m = rightLabels.length;
                for (var j = 0; j < m; j++) {
                    var rightLabel = rightLabels[j];
                    var strip = strips[rightLabel];
                    if (!strip)
                        continue;

                    var rightBar = sankeyData.rightBars[rightLabel];
                    strip.color = color;
                    strip.leftStartY = startY;
                    strip.leftEndY = startY = startY + strip.value * sankeyData.leftScale;
                    strip.rightStartY = rightBar.curY;
                    strip.rightEndY = rightBar.curY = rightBar.curY + strip.value * sankeyData.rightScale;
                }
            }
        }

        function sankeyDrawLabels() {
            var div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.left = '0px';
            div.style.top = '0px';
            var t = [];
            sankeyLabelWorker(sankeyData.leftLabels, sankeyData.leftBars, 'left', 15, t);
            sankeyLabelWorker(sankeyData.rightLabels, sankeyData.rightBars, 'right', sankeyData.endX, t);
            div.innerHTML = t.join('');
            target.appendChild(div);
        }

        function sankeyLabelWorker(labels, bars, side, left, t) {
            var idPrefix = target.id + '_' + side;
            var css = 'flotr-' + side + '-label';

            for (var i = 0; i < labels.length; i++) {
                var label = labels[i];
                var bar = bars[label];
                var top = Math.round(bar.startY);
                var hite = Math.round(bar.endY - bar.startY);
                t.push('<div id ="');
                t.push(idPrefix);
                t.push(i + 1);
                t.push('" class="');
                t.push(css);
                t.push('" flotr-label="');
                t.push(label);
                t.push('" flotr-side="');
                t.push(side);
                t.push('" style="position:absolute;width:');
                t.push(sankeyData.labelWidth);
                t.push('px;top:');
                t.push(top);
                t.push('px;left:');
                t.push(left);
                t.push('px;height:');
                t.push(hite);
                t.push('px"><span ');
                if (label.length > 15) {
                    t.push('title="');
                    t.push(label);
                    t.push('"');
                    label = label.substring(0, 15);
                }
                t.push('>');
                t.push(label.replace(/&/g, '&amp;').replace(/[<]/g, '&lt;'));
                t.push('</span></div>');
            }
        }

        function sankyDrawChart() {
            ctx.globalAlpha = 0.7;
            for (var i = sankeyData.leftLabels.length - 1; i >= 0; i--) {
                var bar = sankeyData.leftBars[sankeyData.leftLabels[i]];
                sankeyDrawBar(bar, false);
            }
        }

        function sankeyDrawBar(bar, toHilite) {
            var leftLabel = bar.label;
            var color = bar.color;
            var startY = bar.startY;
            ctx.globalAlpha = toHilite ? 1.0 : 0.7;

            //we draw from last to first, so that we see top strips on top...
            for (var j = sankeyData.rightLabels.length - 1; j >= 0; j--) {
                var rightLabel = sankeyData.rightLabels[j];
                var strip = sankeyData.strips[leftLabel][rightLabel];
                if (!strip)
                    continue;

                var rightBar = sankeyData.rightBars[rightLabel];
                sankeyDrawStrip(strip, toHilite);
                if (toHilite) //add attributes of strip if this is not a redraw for highlighting. we expect 30px for the label, and 10 px as margin
                    sankeyLabelIt(sankeyData.endX - 40, (strip.rightStartY + strip.rightEndY) / 2, 40, Math.round(strip.value / bar.value * 1000) / 10 + '%');
            }
            if (toHilite) {
                sankeyLabelIt(sankeyData.startX, (bar.startY + bar.endY) / 2, 40, Math.round(bar.value * 1000 / sankeyData.value) / 10 + '%');
            }
        }

        function sankeyDrawStrip(strip, toHilite) {
            ctx.beginPath();
            ctx.fillStyle = strip.color;
            if (toHilite && options.highlightColor)
                ctx.fillStyle = options.highlightColor;

            ctx.moveTo(sankeyData.startX, strip.leftStartY);
            ctx.bezierCurveTo(sankeyData.x1, strip.leftStartY, sankeyData.x2, strip.rightStartY, sankeyData.endX, strip.rightStartY);
            ctx.lineTo(sankeyData.endX, strip.rightEndY);
            ctx.bezierCurveTo(sankeyData.x2, strip.rightEndY, sankeyData.x1, strip.leftEndY, sankeyData.startX, strip.leftEndY);
            ctx.closePath();
            ctx.fill();
        }

        /**
        * Function: (private) sankeyLabelIt
        * 
        * put a small label on the strip with % of the strip
        * 
        * Parameters:
        * 		x,y   : where to print the label
        *       width : width to draw teh rectangle
        *       label : text to write
        * 
        * Returns:
        * 		none
        */
        function sankeyLabelIt(x, y, width, label) {
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = '#dddddd';
            ctx.strokeStyle = '#888888';
            ctx.lineJoin = 'round';
            ctx.fillRect(x, y - 10, width, 16);

            ctx.fillStyle = 'black';
            ctx.fillText(label, x + 5, y);
            ctx.restore();
        }

        /**
        * Function: (private) sankeyGetBar
        * 
        * Get the bar that is at the supplied y
        * 
        * Parameters:
        * 		y - y axis
        *       label : labels to search from
        *       bars  : corresponding bars
        * 
        * Returns:
        * 		bar, or null if y falls within the gaps between bars
        */
        function sankeyGetBar(y, labels, bars) {
            var n = labels.length;
            for (var i = 0; i < n; i++) {
                var bar = bars[labels[i]];
                if (y <= bar.startY) //it is inside gap
                    return null;
                if (y <= bar.endY)
                    return bar;
            }
            return null;
        }

        /**
        * Function: (private) sankeyMouseOut
        * 
        * Removes highlight  that a mouseover would have triggered
        * 
        * Parameters:
        * 		evt - event
        * 
        * Returns:
        * 		void
        */
        function sankeyMouseOut(evt) {
            var ele = evt.target || evt.srcElement;
            if (ele.tagName != 'CANVAS') //will be still within our area..modified By Anand as per suggested by Bhandi Sir
                return;
            octx.clearRect(sankeyData.startX, sankeyData.startY, (sankeyData.endX - sankeyData.startX), (sankeyData.endY - sankeyData.startY));
            //mark the fact that there is no label is highlighted...
            sankeyData.currentLabel = null;
        }

        /**
        * Function: (private) sankeyMouseOver
        * 
        * Highlights the bar for the label that user has moused over. this is an event funciton that is attached to mouseover of target
        * 
        * Parameters:
        * 		evt - event
        * 
        * Returns:
        * 		void
        */
        function sankeyMouseOver(evt) {
            //target has <div> that contains alal labels. each label is <div><span>label</span></div>
            //div element has all attributes that we need
            var ele = evt.target || evt.srcElement;
            if (ele.tagName == 'SPAN')
                ele = ele.parentNode;

            var label = ele.getAttribute('flotr-label');
            if (!label) //not a label div. we are not interested
                return;

            var side = ele.getAttribute('flotr-side');
            //is focus shofts from span to dov, we might get this fired...
            if (sankeyData.currentSide == side && sankeyData.currentLabel == label) //same label is highlighted
                return;

            //
            sankeyData.currentLabel = label;
            sankeyData.currentSide = side
            octx.globalAlpha = 0.7;
            octx.fillStyle = 'white';
            //cover chart-area with this translucent layer 
            octx.fillRect(sankeyData.startX, sankeyData.startY, (sankeyData.endX - sankeyData.startX), (sankeyData.endY - sankeyData.startY));

            //ooops we have an issue. our functions alwasy use ctx...
            var oldCtx = ctx;
            ctx = octx;
            if (side == 'left') {
                //we are organized by left bar. So this is easy...
                sankeyDrawBar(sankeyData.leftBars[label], true);
            }
            else {
                var bar = sankeyData.rightBars[label];
                //go thru all left bars, and draw strips that have this rightbar as their other end
                for (var leftLabel in sankeyData.strips) {
                    var strip = sankeyData.strips[leftLabel][label];
                    if (!strip)
                        continue;

                    sankeyDrawStrip(strip, options.highlightColor || strip.color);
                    sankeyLabelIt(sankeyData.startX, (strip.leftStartY + strip.leftEndY) / 2, 40, Math.round(strip.value / bar.value * 1000) / 10 + '%');
                }
                //we have to show % for this bar
                sankeyLabelIt(sankeyData.endX - 40, (bar.startY + bar.endY) / 2, 40, Math.round(bar.value / sankeyData.value * 1000) / 10 + '%');
            }
            ctx = oldCtx;
        }

        /**
        * Function: (private) drawBullet
        * 
        * Draws Bullet chart.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawBullet() {

        	var data = series;
            if (series.length < 1) {
                // No data in the series
                return;
            }
            var scX = (target.getWidth() * 0.9);//available width
            var scY = (target.getHeight() * 0.9);//available height
            var startX = (target.getWidth() * 0.05);//0.05 is left margin
            var startY = (target.getHeight() * 0.05);//0.05 is right margin
            var colHeight = scY / series.length;
            colHeight = 70; //todo: hardcoding height for pathfinder of each bullet group to 70px;
            
            var barlength = (scX - startX);//available width - left margin will give remaing width, which can be used for drawing bullet bar.
            
            for (var i = 0; i < series.length; i++) 
            {
            	var label =  series[i].data[4];
            	var labelStartX = startX;
            	var labelStartY = startY + (colHeight * i) + 30;
            	var labelEndY = startY + colHeight * (i + 1) + 2; //2px for proper spacing
            	
                ctx.fillText(label, labelStartX, labelStartY);
                ctx.fillText('0', labelStartX, labelEndY);

                var valueOfInterest = series[i].data[0];
                var valueOfInterestColor = (0 < options.colors.length) ? options.colors[0] : getColor();
                var comparativeValue = series[i].data[1];
                var comparativeValueColor = (1 < options.colors.length) ? options.colors[1] : getColor();
                var firstQualitativeRange = series[i].data[2];
                var firstQualitativeRangeColor = (2 < options.colors.length) ? options.colors[2] : getColor();
                var secondQualitativeRange = series[i].data[3];
                var secondQualitativeRangeColor = (3 < options.colors.length) ? options.colors[3] : getColor();
                var toolTip = series[i].data[5] || ('help-text of bullet'+ i);
                var max;
				/**
				 * To draw a Bullet, 4 co-ordinates are required.
				 * (x1,y1)-------------------------------(x2,y1)
				 *  |										|
				 *  |										|
				 * (x1,y2)-------------------------------(x2,y2)
				 * */
                var x1 = startX
                ,y1 = startY + (colHeight * i) + 35
                ,x2 = startX + barlength
                ,y2 = startY + (colHeight * (i + 1)) - 7;
                
                var bullet = { label: series[i].data[4], startX: x1, endX: x2, startY: y1, endY: y2, helpText: toolTip };
                chartData.bullets.push(bullet);
                
                if (firstQualitativeRange > secondQualitativeRange) 
                {
                    max = firstQualitativeRange;
                    var maxLabel = Math.round(firstQualitativeRange);
                    var labelEndX = startX + barlength - ((firstQualitativeRange + "").length / 2) * 5;
                    ctx.fillText(maxLabel, labelEndX, labelEndY);
                    
                    drawEachBullet(x1, x2, y1, y2 , firstQualitativeRangeColor);

                    if (secondQualitativeRange > 0) 
                    {
                        var secondQualitativeRangeBarWidth = barlength * secondQualitativeRange / firstQualitativeRange;
                        var param_x2 = x1 + secondQualitativeRangeBarWidth,
                        	param_y1 = y1 + 2, // decreasing 2px in y cordinate to make secondQualitativeRange Bar less than firstQualitativeRange Bar.
                        	param_y2 = y2 - 2; 
                        drawEachBullet(x1, param_x2, param_y1, param_y2, secondQualitativeRangeColor);
                    }
                } 
                else 
                {
                    max = secondQualitativeRange;
                    var maxLabel = Math.round(secondQualitativeRange);
                    var labelEndX = startX + barlength - ((secondQualitativeRange + "").length / 2) * 5;
                    ctx.fillText(maxLabel, labelEndX, labelEndY);
                    
                    drawEachBullet(x1, x2, y1, y2 , secondQualitativeRangeColor);

                    if (firstQualitativeRange > 0) 
                    {
                        var firstQualitativeRangeWidth = barlength * firstQualitativeRange / secondQualitativeRange;
                        var param_x2 = x1 + firstQualitativeRangeWidth,
	                        param_y1 = y1 + 2,  // decreasing 2px in y cordinate to make firstQualitativeRange Bar less than secondQualitativeRange Bar.
	                        param_y2 = y2 - 2;
                        drawEachBullet(x1, param_x2, param_y1, param_y2, firstQualitativeRangeColor);
                    }
                }

                if (valueOfInterest > 0) 
                {
                    var valueOfInterestBarWidth = barlength * valueOfInterest / max;
                    var param_y1 = y1 + 10, // decreasing 10px in y cordinate to make valueOfInterest Bar thinner.
	                    param_x2 = x1 + valueOfInterestBarWidth,
	                    param_y2 = y2 - 10;
                    drawEachBullet(x1, param_x2, param_y1, param_y2, valueOfInterestColor);
                }

                if (comparativeValue > 0) {
                    var comparativeValueBarWidth = barlength * comparativeValue / max;
                    x1 = x1 + comparativeValueBarWidth;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x1, y2);
                    ctx.closePath();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = comparativeValueColor;
                    ctx.stroke();
                }
                //added condition by Anand for showing different colors when zero value came for firstQualitativeRange,secondQualitativeRange,committed and valueOfInterest
                if (firstQualitativeRange == 0 && secondQualitativeRange == 0 && comparativeValue == 0 && valueOfInterest == 0) {
                    ctx.fillStyle = '#F6F6F6';
                    ctx.fill();
                }
                //end of addition by Anand for showing different colors when zero value came for firstQualitativeRange,secondQualitativeRange,committed and valueOfInterest
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'black';
                ctx.fillStyle = 'black';

            }
        }
        
        /**
		 * To draw a Bullet, 4 co-ordinates are required.
		 * (x1,y1)-------------------------------(x2,y1)
		 *  |										|
		 *  |										|
		 * (x1,y2)-------------------------------(x2,y2)
		 * */
        function drawEachBullet(x1, x2, y1, y2 , color)
        {
        	ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x1, y2);
            ctx.lineTo(x1, y1);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }
        
        // May 09 2012 : Chart Extension - Pathfinder (End) : Aravinda
        /**
        * Function: (private) drawSpeedometer
        * 
        * Draws Speedometer chart.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawSpeedometer() {

            if (series.length < 1) {
                // No data in the series
                return;
            }

            var scX = (target.getWidth() / 2 * 0.9);
            var scY = (target.getHeight() * 0.9);
            var sRadius = (scX > scY) ? (scY * 0.85) : (scX * 0.85);

            ctx.translate(scX, scY);
            ctx.rotate(Math.PI);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'black';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(sRadius, 0);
            ctx.arc(0, 0, sRadius, 0, Math.PI, false);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.stroke();

            var dataSeries = series[0].data;
            var totalPoints = 0;
            for (var i = 1; i < dataSeries[0].length - 1; i++) {
                totalPoints += (dataSeries[0][i] - dataSeries[0][i - 1]);
            }

            var colorSeries = new Array("rgb(255, 0, 0)", "rgb(255, 165, 0)", "rgb(0, 255, 0)", "rgb(0, 0, 0)");
            var labelSeries = new Array("Red", "Orange", "Green", "Actual");
            if ((dataSeries[0][0] < 0) && (dataSeries[0].length == 5)) {
                colorSeries = new Array("rgb(0, 255, 0)", "rgb(255, 165, 0)", "rgb(255, 0, 0)", "rgb(0, 0, 0)");
                labelSeries = new Array("Green", "Orange", "Red", "Actual");
            }
            else if ((dataSeries[0][0] < 0) && (dataSeries[0].length == 7)) {
                colorSeries = new Array("rgb(255, 0, 0)", "rgb(255, 165, 0)", "rgb(0, 255, 0)", "rgb(255, 165, 0)", "rgb(255, 0, 0)", "rgb(0, 0, 0)");
                labelSeries = new Array("Red", "Orange", "Green", "Orange", "Red", "Actual");
            }
            else if ((dataSeries[0][0] >= 0) && (dataSeries[0].length == 7)) {
                colorSeries = new Array("rgb(0, 255, 0)", "rgb(255, 165, 0)", "rgb(255, 0, 0)", "rgb(255, 165, 0)", "rgb(0, 255, 0)", "rgb(0, 0, 0)");
                labelSeries = new Array("Green", "Orange", "Red", "Orange", "Green", "Actual");
            }

            var currentAngle = 0;
            for (var i = 1; i < dataSeries[0].length - 1; i++) {
                var currentValue;
                currentValue = (dataSeries[0][i] - dataSeries[0][i - 1]);
                var endAngle = currentAngle + (currentValue / totalPoints) * Math.PI;
                ctx.fillStyle = colorSeries[i - 1];
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, sRadius - 1, currentAngle, endAngle, false);
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
                currentAngle = endAngle;
            }

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, sRadius * 0.8, 0, Math.PI, false);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.save();

            var currentValue = (dataSeries[0][dataSeries[0].length - 1] - dataSeries[0][0]);
            var startAngle = (currentValue / totalPoints) * Math.PI;
            ctx.lineWidth = 1;
            ctx.fillStyle = colorSeries[colorSeries.length - 1]
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.moveTo(sRadius * 0.01 * -1, 0);
            ctx.arc(0, 0, sRadius * 0.9, startAngle, startAngle, false);
            ctx.lineTo(sRadius * 0.01, 0);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
            ctx.save();


            // Feb 6 2009 : Hide / Display Legend on Charts : Aravinda
            if (options.legend.show) {

                var calibSize = totalPoints / 10;
                for (var i = 0; i <= 10; i++) {
                    var curAngle = ((calibSize * i) / totalPoints) * Math.PI;
                    var y1Value = Math.sin(curAngle) * sRadius;
                    var x1Value = Math.cos(curAngle) * sRadius;
                    var y2Value = Math.sin(curAngle) * sRadius * 0.9;
                    var x2Value = Math.cos(curAngle) * sRadius * 0.9;
                    var y3Value = Math.sin(curAngle) * sRadius * 1.05;
                    var x3Value = Math.cos(curAngle) * sRadius * 1.05;
                    ctx.beginPath();
                    ctx.moveTo(x1Value, y1Value);
                    ctx.lineTo(x2Value, y2Value);
                    ctx.closePath();
                    ctx.stroke();
                    if (ctx.fillText) {
                        var curText = ' ' + ((calibSize * i) + dataSeries[0][0]) + ' ';
                        if (curAngle == 0)
                            ctx.fillText(curText, x3Value + 5 + (curText.length * 5), y3Value);
                        else if (curAngle == (Math.PI / 2))
                            ctx.fillText(curText, x3Value + (curText.length / 2 * 5), y3Value + 5);
                        else if (curAngle == Math.PI)
                            ctx.fillText(curText, x3Value - 5, y3Value);
                        else if (curAngle < (Math.PI / 2))
                            ctx.fillText(curText, x3Value + 5 + (curText.length * 5), y3Value + 5);
                        else if (curAngle < Math.PI)
                            ctx.fillText(curText, x3Value - 5, y3Value + 5);
                    }
                    ctx.save();
                }
                if (ctx.fillText) {
                    var curText = ' ' + dataSeries[0][dataSeries[0].length - 1] + ' ';
                    ctx.fillText(curText, 0 + (curText.length / 2 * 5), -5);
                }

                var fragments = [];
                var rowStarted = false;
                for (var i = 0; i < dataSeries[0].length - 1; ++i) {
                    fragments.push((rowStarted) ? '</tr><tr>' : '<tr>');
                    if (i == 0) {
                        rowStarted = true;
                    }

                    var label;
                    switch (i) {
                        case (dataSeries[0].length - 2):
                            label = labelSeries[i] + '(' + dataSeries[0][i + 1] + ')';
                            break;
                        default:
                            label = labelSeries[i] + '(' + dataSeries[0][i] + ' : ' + dataSeries[0][i + 1] + ')';
                            break;
                    }
                    if (options.legend.labelFormatter != null)
                        label = options.legend.labelFormatter(label);

                    fragments.push('<td class="flotr-legend-color-box"><div style="border:1px solid ' + options.legend.labelBoxBorderColor + ';padding:1px"><div style="width:14px;height:10px;background-color:' + colorSeries[i] + '"></div></div></td>' +
					    '<td class="flotr-legend-label" id ="' + target.id + 'Label' + (i + 1) + '">' + label + '</td>');
                }
                if (rowStarted) fragments.push('</tr>');

                if (fragments.length > 0) {
                    var table = '<table style="font-size:smaller;color:' + options.grid.color + '">' + fragments.join("") + '</table>';
                    if (options.legend.container != null) {
                        options.legend.container.append(table);
                    } else {
                        var pos = '';
                        var p = options.legend.position, m = options.legend.margin;

                        if (p.charAt(0) == 'n') pos += 'top:' + (m + plotOffset.top) + 'px;';
                        else if (p.charAt(0) == 's') pos += 'bottom:' + (m + plotOffset.bottom) + 'px;';
                        if (p.charAt(1) == 'e') pos += 'right:' + (m + plotOffset.right) + 'px;';
                        else if (p.charAt(1) == 'w') pos += 'left:' + (m + plotOffset.bottom) + 'px;';
                        var div = target.insert('<div class="flotr-legend" style="position:absolute;z-index:2;' + pos + '">' + table + '</div>').getElementsBySelector('div.flotr-legend').first();

                        if (options.legend.backgroundOpacity != 0.0) {
                            var c = options.legend.backgroundColor;
                            if (c == null) {
                                var tmp = (options.grid.backgroundColor != null) ? options.grid.backgroundColor : extractColor(div);
                                c = parseColor(tmp).adjust(null, null, null, 1).toString();
                            }
                            target.insert('<div class="flotr-legend-bg" style="position:absolute;width:' + div.getWidth() + 'px;height:' + div.getHeight() + 'px;' + pos + 'background-color:' + c + ';"> </div>').select('div.flotr-legend-bg').first().setStyle({
                                'opacity': options.legend.backgroundOpacity
                            });
                        }
                    }
                }

            }

        }
        /**
        * Function: (private) drawRadar
        * 
        * Draws Radar chart.
        * 
        * Parameters:
        * 		none
        * 
        * Returns:
        * 		void
        */
        function drawRadar() {

            if (series.length < 1) {
                // No data in the series
                return;
            }

            var scX = (target.getWidth() / 2);
            var scY = (target.getHeight() / 2);
            var aRadius = (scX > scY) ? (scY * 0.85) : (scX * 0.85);
            var sRadius = (scX > scY) ? (scY * 0.85) : (scX * 0.85);
            ctx.strokeStyle = 'gray';
            ctx.beginPath();
            ctx.translate(scX, scY);
            ctx.closePath();
            ctx.save();

            var numberOfAxes = 0;
            var minValue = 0;
            var maxValue = 0;
            for (var i = 0; i < series.length; i++) {
                if (numberOfAxes < series[i].data.length)
                    numberOfAxes = series[i].data.length;
                for (var j = 0; j < series[i].data.length; j++) {
                    if (minValue > series[i].data[j])
                        minValue = series[i].data[j];
                    if (maxValue < series[i].data[j])
                        maxValue = series[i].data[j];
                }
            }
            options.xaxis.noTicks = 5;
            while ((maxValue % options.xaxis.noTicks) != 0) {
                maxValue++;
            }

            var angleInDegrees = 360 / numberOfAxes;
            ctx.strokeStyle = 'gray';
            for (var i = 0; i < numberOfAxes; i++) {
                var angleInRadians = i * angleInDegrees * (Math.PI / 180);
                var yValue = Math.sin(angleInRadians) * aRadius;
                var xValue = Math.cos(angleInRadians) * aRadius;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(xValue, yValue);
                ctx.closePath();
                ctx.stroke();
                ctx.save();
                if (ctx.fillText && options.legend.show) {
                    if ((i * angleInDegrees) == 0)
                        ctx.fillText(options.axislabels[i], xValue + 10, yValue);
                    else if ((i * angleInDegrees) == 90)
                        ctx.fillText(options.axislabels[i], xValue - (5 * (options.axislabels[i].length / 2)), yValue + 10);
                    else if ((i * angleInDegrees) == 180)
                        ctx.fillText(options.axislabels[i], (xValue - 10) - (5 * (options.axislabels[i].length)), yValue);
                    else if ((i * angleInDegrees) == 270)
                        ctx.fillText(options.axislabels[i], xValue - (5 * (options.axislabels[i].length / 2)), yValue - 10);
                    else if ((i * angleInDegrees) < 90)
                        ctx.fillText(options.axislabels[i], xValue + 10, yValue + 10);
                    else if ((i * angleInDegrees) < 180)
                        ctx.fillText(options.axislabels[i], (xValue - 10) - (5 * (options.axislabels[i].length)), yValue + 10);
                    else if ((i * angleInDegrees) < 270)
                        ctx.fillText(options.axislabels[i], (xValue - 10) - (5 * (options.axislabels[i].length)), yValue - 10);
                    else if ((i * angleInDegrees) < 360)
                        ctx.fillText(options.axislabels[i], (xValue + 10), yValue - 10);
                    else
                        ctx.fillText(options.axislabels[i], xValue + 10, yValue + 10);
                }
            }
            for (var i = 0; i < numberOfAxes; i++) {
                for (var j = 0; j < series.length; j++) {
                    var k = i + 1;
                    if (k >= numberOfAxes)
                        k = 0;
                    var currentAxisValue = series[j].data[i];
                    var currentX = (currentAxisValue / maxValue) * sRadius;
                    var nextAxisValue = series[j].data[k];
                    var nextX = (nextAxisValue / maxValue) * sRadius;
                    ctx.strokeStyle = options.colors[j];
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(currentX, 0);
                    if (nextX == 0)
                        nextX = 1;
                    ctx.arc(0, 0, nextX, Math.PI * 2 / numberOfAxes, Math.PI * 2 / numberOfAxes, false);
                    ctx.closePath();
                    ctx.stroke();
                    ctx.save();
                }
                for (var j = 0; j < options.xaxis.noTicks; j++) {
                    var currentValue = j * (sRadius / options.xaxis.noTicks)
                    ctx.strokeStyle = 'gray';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(currentValue, 0);
                    if (currentValue == 0)
                        currentValue = 1;
                    ctx.arc(0, 0, currentValue, Math.PI * 2 / numberOfAxes, Math.PI * 2 / numberOfAxes, false);
                    ctx.closePath();
                    ctx.stroke();
                    ctx.save();
                    if (ctx.fillText && options.legend.show && (i == 0)) {
                        var curText = ' ' + Math.round((maxValue / options.xaxis.noTicks) * j) + ' ';
                        ctx.fillText(curText, currentValue, -5);
                    }
                }
                ctx.strokeStyle = 'gray';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(aRadius, 0);
                ctx.arc(0, 0, aRadius, Math.PI * 2 / numberOfAxes, Math.PI * 2 / numberOfAxes, false);
                ctx.closePath();
                ctx.stroke();
                ctx.save();
                ctx.beginPath();
                ctx.rotate(Math.PI * 2 / numberOfAxes);
                ctx.closePath();
                ctx.save();
            }
        }

        // Feb 26 2009 : Y-Axis Label Formatter for Charts - Nirmanith (Start) : Aravinda
        /**
        * Function: (private) formatValue
        * 
        * Formats the value.
        * 
        * Parameters:
        * 		value to be formatted
        * 
        * Returns:
        * 		formatted value
        */
        function formatValue(valueToFormat) {

            var formatId = options.yaxis.formatId.toLowerCase();

            var format = (typeOfFormat[formatId]) ? typeOfFormat[formatId] : typeOfFormat['inr'];
            var decimalSeparator = (typeOfDecimalSeparator[formatId]) ? typeOfDecimalSeparator[formatId] : typeOfDecimalSeparator['inr'];
            var placesSeparatorPosn = (numberOfPlacesForSeparator[formatId]) ? numberOfPlacesForSeparator[formatId] : numberOfPlacesForSeparator['inr'];
            placesSeparatorPosn++;
            var fieldSeparator = (typeOfFieldSeparator[formatId]) ? typeOfFieldSeparator[formatId] : typeOfFieldSeparator['inr'];

            var decimalSeparatorPosn = valueToFormat.indexOf(decimalSeparator);
            var formattedValue = '';

            if (decimalSeparatorPosn == 0) {

                formattedValue = '00' + valueToFormat;

            }
            else {

                var valueAfterDec = '';
                var valueBeforeDec = valueToFormat;

                if (decimalSeparatorPosn > 0) {

                    valueAfterDec = decimalSeparator + valueToFormat.substring(decimalSeparatorPosn + 1);
                    valueBeforeDec = valueToFormat.substring(0, decimalSeparatorPosn);

                }

                if (valueBeforeDec.length < format.length) {
                    format = format.substring(format.length - valueBeforeDec.length);
                    if (format.substring(0, 1) == fieldSeparator)
                        format = format.substring(1, format.length);
                }

                for (var i = (valueBeforeDec.length - 1); i >= 0; i--) {

                    var nextPlaceHolder = format.lastIndexOf('#');

                    if (nextPlaceHolder >= 0)
                        format = format.substring(0, nextPlaceHolder) + valueBeforeDec.substring((i + 1), i) + format.substring(nextPlaceHolder + 1);
                    else {
                        if (((format.length - 4) % placesSeparatorPosn) == (placesSeparatorPosn - 1))
                            format = fieldSeparator + format;
                        format = valueBeforeDec.substring((i + 1), i) + format;
                    }

                }

                formattedValue = format + valueAfterDec;

            }

            return formattedValue;

        }
        // Feb 26 2009 : Y-Axis Label Formatter for Charts - Nirmanith (End) : Aravinda


    }

    return {
        clean: function (element) {
            element.innerHTML = '';
        },

        draw: function (target, data, options, chartType, grid) {
        	PM.debug('Going to plot ' + chartType);
        	var plot = new Plot(target, data, options, chartType, grid);
            return plot;
        }
    };
})();

function mySort(a, b) {
    if (!a.value)
        return -1;
    if (!b.value)
        return 1;
    if (a.value == b.value)
        return 0;
    if (a.value > b.value)
        return 1;
    return -1;
}

function orderBySequence(a,b) 
{
	  if (a.sequence < b.sequence)
	     return -1;
	  if (a.sequence > b.sequence)
	    return 1;
	  return 0;
}

function getlength(number) 
{
    return number.toString().length;
}

/**
 * Sometimes you'll want to see what styles the default document view has. 
 * For instance, you gave a paragraph an width of 50%, but how do you see how many pixels that is in your users' browser?
 * @param el
 * @param styleProp
 * @returns
 */
function getStyle(el,styleProp)
{
	var x = document.getElementById(el);
	var y = '';
	if (x.currentStyle)
		y = x.currentStyle[styleProp];
	else if (window.getComputedStyle)
		y = document.defaultView.getComputedStyle(x,null).getPropertyValue(styleProp);
	return y;
}
