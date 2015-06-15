/*
Chart Field : extention of field.js for all chart fields
*/

function ChartField()
{
	this.AbstractField();
	this.yaxislabelformatterid = null;
}

ChartField.inherits(AbstractField);

ChartField.prototype.setLegend = function(legend)
{
    this.legend = legend;
    return;
};

ChartField.prototype.getLegend = function()
{
    return this.legend;
};

ChartField.prototype.setValueToObject = function (obj, val)
{
    //debug('Chart field can not take value.');
    return false;
};

ChartField.prototype.fillReport = function (grid)
{
    this.setGrid(grid);
};
//this is the way to draw the chart
ChartField.prototype.setGrid = function (grid)
{
    debug('going to draw chart for ' + this.name);
    this.value = grid;
    var win = this.P2.win;
    var ele = win.document.getElementById(this.name);
    if (!ele)
    {
        debug('Design Error: No dom element found with name ' + this.name + ' for chart field, and hence no chart is drawn.');
        return;
    }
    if (!this.grid || grid.length < 2) //let us just clean-up
    {
        ele.innerHTML = '';
        ele.setAttribute('exil-noData', 'exil-noData');
        debug('No data for for chart ' + this.name);
        return false;
    }

    ele.removeAttribute('exil-noData');

    var options = this.getOptions();
    var dataSeries = this.getDataSeries(grid, options);
    if (typeof (this.mouseMoved) == 'undefined') //first time
    {
        var onClickFn = null;
        var onMoveFn = null;
        if (this.onClickFunctionName)
        {
            onClickFn = this.P2.win[this.onClickFunctionName];
            if (!onClickFn || typeof (onClickFn) != 'function')
            {
                debug('Onclick function ' + this.onClickFunctionName + ' is not defined in user page');
            }
        }

        if (this.onMoveFunctionName)
        {
            onMoveFn = this.P2.win[this.onMoveFunctionName];
            if (!onMoveFn || typeof (onMoveFn) != 'function')
            {
                debug('onMoveFunctionName ' + this.onMoveFunctionName + ' is not defined in user page');
            }
        }
        this.mouseMoved = onMoveFn;
        this.mouseClicked = onClickFn;
    }
    debug('going to draw chart for ' + this.name);
    this.drawChart(dataSeries, options);
}

//all chart options are attributes of the oobject that is returned
ChartField.prototype.getOptions = function ()
{
    var options = {};

    if (this.rawDataDisplay && this.rawDataDisplay != 'none')
        options.rawDataDisplay = this.rawDataDisplay;

    if (this.colors)
        options.colors = this.colors.split(',');
    if (this.labelColor)
        options.labelColor = this.labelColor;

    options.legend = this.getLegendOptions();
    return options;

    //allow specific chart to add its own options
    if (this.addSpecialOptions)
        this.addSpecialOptions(options);
    return options;
}

//this must be implemented by specific chart
ChartField.prototype.getDataSeries = function (grid, options)
{
    debug('Design error: getDataSeries is no timplemented for chart field ' + this.name);
}


ChartField.LEGEND_OPTIONS = {
    legendNbrColumns: 'noColumns'
    , legendLabelFormatter: 'labelFormatter'
    , legendLabelBoxBorderColor: 'labelBoxBorderColor'
    , legendPosition: 'position'
    , legendContainer: 'container'
    , legendMargin: 'margin'
    , legendBackgroundColor: 'backgroundColor'
    , legendBackgroundOpacity: 'backgroundOpacity'
};

ChartField.prototype.getLegendOptions = function ()
{
    var legend = { show: true };
    for (var opt in ChartField.LEGEND_OPTIONS)
    {
        var val = this[opt];
        if (val)
            legend[ChartField.LEGEND_OPTIONS[opt]] = val;
    }
    if (legend.labelFormatter) //this needs to be a function
    {
        var fn = this.P2.win[legend.labelFormatter];
        if (fn)
            legend.labelFormatter = fn;
        else
        {
            debug(legend.labelFormatter + ' is specified as a formatter, but a function with that name is not defined for this page.');
            delete legend.labelFormatter;
        }
    }

    return legend;
}


//data is of the form [[x1,y1],[x2,y2].......]
ChartField.prototype.getXYSeries = function (grid)
{
    var series = [];
    //find x, y and group coolumn  names
    var header = grid[0];
    if (header.length < 2) //obviously not enough data
    {
        debug('Data for chart ' + this.name + ' has less than two columns');
        return series;
    }
    var xIdx = 0; //default : first col is x axis and second one is y axis
    var yIdx = 1;
    var hIdx = null; //helpText
    if (this.xaxiscolumn || this.yaxiscolumn || this.helpTextColumn)
    {
        for (var i = 0; i < header.length; i++)
        {
            var colName = header[i];
            if (colName == this.xaxiscolumn)
                xIdx = i;
            else if (colName == this.yaxiscolumn)
                yIdx = i;
            else if (colName == this.helpTextColumn)
                hIdx = i;
        }
    }

    this.helpTexts = (hIdx == null) ? null : [];
    for (var i = 1; i < grid.length; i++)
    {
        var row = grid[i];
        series.push([row[xIdx], row[yIdx]]);
        if (hIdx != null)
            this.helpTexts.push(row[hIdx]);
    }
    return series;
}

//get an array of data rows extracted from given grid.
//each row contains columns as in columnNames.
ChartField.prototype.getColumnData = function (grid, columnNames)
{
    var win = this.P2.win;
    var series = new win.Array();
    var origNbrCols = columnNames.length;
    //find x, y and group coolumn  names
    var header = grid[0];
    if (this.helpTextColumn)
        columnNames.push(this.helpTextColumn);
    if (this.groupHelpTextColumn)
        columnNames.push(this.groupHelpTextColumn);
    var nbrCols = columnNames.length;
    var indexes = [];
    for (var j = 0; j < nbrCols; j++)
    {
        indexes[j] = j; //default is that they are in that order
        var colName = columnNames[j];
        if (!colName)
            continue;
        var idx = null;
        for (var i = 0; i < header.length; i++)
        {
            if (colName == header[i])
            {
                idx = i;
                break;
            }
        }
        if (idx == null)
        {
            debug('Column ' + colName + ' is not found in data for chart ' + this.name + '. Default column is used, and the chart may not render properly');
        }
        else
            indexes[j] = idx;
    }

    var hIdx = null;
    var ghIdx = null;
    this.helpTexts = null;
    if (this.helpTextColumn)
    {
        hIdx = indexes[origNbrCols];
        this.helpTexts = [];
        if (this.groupHelpTextColumn)
            ghIdx = indexes[origNbrCols + 1];
    }

    for (var i = 1; i < grid.length; i++)
    {
        var row = grid[i];
        var newRow = new win.Array();
        for (var j = 0; j < nbrCols; j++)
        {
            newRow.push(row[indexes[j]]);
        }
        series.push(newRow);
        if (this.helpTexts)
        {
            if (ghIdx)
                this.helpTexts.push([row[hIdx], row[ghIdx]]); //array of primary help text and group help text
            else
                this.helpTexts.push(row[hIdx]);
        }
    }
    return series;
}

//labelOptions is of the form {noTicks: nbrTicks, min:minTicks, max:maxTicks, ticks:[[tickx1, ticky1], [tickx2, ticky2].....]}
ChartField.prototype.getLabelOptions = function (labels)
{
    labels = labels.split(";");
    var n = labels.length;
    var minTicks = labels[0].split(':')[0];
    var maxTicks = labels[n - 1].split(':')[0];
    var ticks = [];
    for (var i = 0; i < n; i++)
    {
        var labelParts = labels[i].split(':');
        ticks.push([labelParts[0], labelParts[1]]);
    }

    return { noTicks: n, min: minTicks, max: maxTicks, ticks: ticks };
}

function PieChart()
{
    this.ChartField();
    this.chartType = 'PIE';
    this.xaxiscolumn = null; //Required. Name of the column to get data
    this.yaxiscolumn = null; //Requqired. column to get name (label)
    this.yaxislabelformatterid = null; //formatter function for y axis labels. function(label, data){return formatted-data}
    this.showLegends = true;
}

PieChart.inherits(ChartField);

PieChart.prototype.getDataSeries = function (grid, obj)
{
    return this.getColumnData(grid, [this.xaxiscolumn, this.yaxiscolumn]);
}

function SunBurstChart()
{
    this.ChartField();
    this.chartType = 'SUNBURST';
    this.distributionvaluecolumn = null; //Column that has the data (value). if omitted, use first (0th column).
    this.level2column = null; //Column that has the label at the detail level. if omitted, defaults to second column.
    this.level1column = null; //column that has the label for the group. defaults to third column
    this.corecolumn = null; //title for the chart. Assumed that this is same for all columns. Last row is used. Defaults to 4th coulmn.
    this.colors = null; //comma separated colors used at the group level. Detailed ones always use random colors.
    this.helpTextColumn = null;
    this.groupHelpTextColumn = null;
}

SunBurstChart.inherits(ChartField);

SunBurstChart.prototype.fillReportToObject = function (grid, obj)
{
    var series = [];
    var options = {};
    if (grid && grid.length > 1)
    {
        series = this.getColumnData(grid, [this.distributionvaluecolumn, this.level2column, this.level1column, this.corecolumn]);
        options = {};
        if (this.colors)
            options.colors = this.colors.split(',');
        if (this.childColors)
            options.childColors = this.childColors.split(',');

        if (this.helpTexts)
        {
            //options.mouse = {track:true};
            obj.helpTexts = this.helpTexts;
            obj.observe('flotr:mousemove', function (e)
            {
                this.title = '';
                var memo = e.memo[1];
                if (memo.rowIdx != null)
                {
                    var txts = this.helpTexts[memo.rowIdx];
                    this.title = txts[memo.groupIdx];
                }
            });
        }
    }
    var w = this.P2.win;
    obj = w.$(this.name);
    var f = w.Flotr.draw(obj, [series], options, 'SUNBURST');
    this.setLegend(f.getLegend());
}

function SankeyChart()
{
    this.ChartField();
    this.chartType = 'SANKEY';
    this.distributionvaluecolumn = null; //Column that has the data (value). if omitted, use first (0th column).
    this.fromcolumn = null; //Column that has the label for left side. defaults to second column.
    this.tocolumn = null; //column that has the label for the right side defaults to third column
    this.colors = ['#B8C75A','#F8D400','#F26F6D','#32BF7C','#F2A963','#FACE5F','#6C6AD2','#6081CF','#FF73B9','#33FDC0','#995577','#558899','#558866','#555588','#888844','#884444','#774477','#885544','#66aabb','#bb6677','#aa6655','#bb77cc','#665599','#885588','#886655'];
    this.highlightColor = null; //color tobe used for highlighting charts for clicked bar
}

SankeyChart.inherits(ChartField);

SankeyChart.prototype.fillReportToObject = function (grid, obj)
{
    var series = [];
    var options = {};
    if (grid && grid.length > 1)
    {
        series = this.getColumnData(grid, [this.distributionvaluecolumn, this.fromcolumn, this.tocolumn]);
        options = {};
        if (this.colors)
        {
            if (this.colors.split) //it is a string set by pafe designer
                options.colors = this.colors.split(',');
            else
                options.colors = this.colors;
        }
        if (this.highlightColor)
            options.highlightColor = this.highlightColor;
    }
    var w = this.P2.win;
    obj = w.$(this.name);
    var f = w.Flotr.draw(obj, [series], options, 'SANKEY');
    this.setLegend(f.getLegend());
};

