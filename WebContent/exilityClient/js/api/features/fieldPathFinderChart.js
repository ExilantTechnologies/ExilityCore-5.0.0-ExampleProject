
function ChartField()
{
	AbstractField.call(this);
	this.yaxislabelformatterid = null;
}

ChartField.prototype = new AbstractField;

ChartField.prototype.setLegend = function(legend)
{
    this.legend = legend;
    return;
};

ChartField.prototype.getLegend = function()
{
    return this.legend;
};

ChartField.prototype.setValueToObject = function(obj, val)
{
	//
};

ChartField.prototype.setGrid = function(grid)
{
    this.value = grid;
    this.fillReportToObject(grid, this.obj);
    return;
};

ChartField.prototype.fillReport = function (grid, obj, keyValue)
{	
    if (!obj)
    {
        if (!this.obj)
            this.obj = this.P2.win.$(this.name);
        obj = this.obj;
    }
    this.fillReportToObject(grid, obj);
    return;
};

ChartField.prototype.fillReportToObject = function (grid, obj)
{
	/*added by vinay for highchart */
	if(this.chartType == 'DEFAULT' || this.chartType == 'HORIZONTALBAR'  || this.chartType == 'HORIZONTALSTACKED')
	{
		var w = this.P2.win;
		if(w.drawHighChart)
		{
			w.drawHighChart(this, grid);
			return;
		}
	}
	/* end */
    var xaxiscolumnindex, yaxiscolumnindex, gridHeader, delim, distributionvaluecolumnindex;
    var labels, curlabelparts, yaxisformatter;
    var chartContainerName = this.name + 'Container';
	if (!grid || grid.length < 2 )
	{
		try
		{
			var dataforReport = "var reportData = {series:[";
    		dataforReport += "]}";
			var optionsforReport = "var options = {";
			optionsforReport += "}";
	    	PM.currentActiveWindow.createChart(chartContainerName, dataforReport, optionsforReport, this.chartType);
		}
		catch(e)
		{
        	debug('Report Data sent by server is not valid. It failed with error : ' + e);
		}
	    return;
	}

    var dataforReport = "var reportData = {series:[";
    // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
    // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App : Aravinda
    // Apr 14 2010 : Bug 1108 - Run Chart - Exility App : Aravinda
    if ((this.chartType == 'DEFAULT') || (this.chartType == 'BAR') || (this.chartType == 'SCATTER') || (this.chartType == 'BUBBLE') || (this.chartType == 'HORIZONTALBAR') || (this.chartType == 'STACKED') || (this.chartType == 'HORIZONTALSTACKED') || (this.chartType == 'RUNCHART'))
    {
        xaxiscolumnindex = null;
        yaxiscolumnindex = null;
        var groupcolumnindex = null;
        var bubblecolumnindex = null;  
        var helpTextColumnindex= null;
        var horizontalBarTextIndex = null;//temporary added by anand on 3-jan-2012 for horizontalbar
        gridHeader = grid[0];
        for (var i = 0; i < gridHeader.length; i++)
        {
            if (gridHeader[i] == this.xaxiscolumn)
                xaxiscolumnindex = i;
            if (gridHeader[i] == this.yaxiscolumn)
                yaxiscolumnindex = i;
            if (gridHeader[i] == this.groupbycolumn)
                groupcolumnindex = i;
            // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
            if (gridHeader[i] == this.bubblecolumn)
                bubblecolumnindex = i;
            // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
            if (gridHeader[i] == this.helpTextColumn)
            	helpTextColumnindex = i;
          //temporary added by anand on 3-jan-2012 for horizontalbar
            if (gridHeader[i] == this.horizontalBarText)
            	horizontalBarTextIndex = i;	
        }
        if (xaxiscolumnindex == null)
        {
            debug('Report Data sent by server is not valid. It does not contain the column ' + this.xaxiscolumn);
            return;
        }
        if (yaxiscolumnindex == null)
        {
            debug('Report Data sent by server is not valid. It does not contain the column ' + this.yaxiscolumn);
            return;
        }
        // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
        if ((this.chartType == 'BUBBLE') && (bubblecolumnindex == null))
        {
            debug('Report Data sent by server is not valid. It does not contain the column ' + this.bubblecolumn);
            return;
        }
        // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
        // Feb 25 2009 : Display the x-axis labels dynamically - Nirmanith (Start) : Aravinda 
        // Apr 19 2010 : Bug 1123 - Barchart problems with decimals - Exility App : Aravinda
        if (!(/^\d+(\.\d+){0,1}$/.test(grid[1][xaxiscolumnindex])))
        {
            var xaxisMap = new Array();
            var xaxisLabelMap = new Array();
            this.xaxislabels = null;
            for (var i = 1; i < grid.length; i++)
            {
                if (xaxisMap[grid[i][xaxiscolumnindex]])
                {
                    grid[i][xaxiscolumnindex] = xaxisMap[grid[i][xaxiscolumnindex]];
                }
                else
                {
                    xaxisMap[grid[i][xaxiscolumnindex]] = (xaxisLabelMap.length + 1);
                    xaxisLabelMap[xaxisLabelMap.length] = grid[i][xaxiscolumnindex];
                    grid[i][xaxiscolumnindex] = xaxisMap[grid[i][xaxiscolumnindex]];
                }
            }
            this.xaxislabels = "0: ;";
            for (i = 0; i < xaxisLabelMap.length; i++)
            {
                this.xaxislabels += (i + 1) + ":" + xaxisLabelMap[i] + ";";
            }
            this.xaxislabels += (xaxisLabelMap.length + 1) + ": ";
        }
        // Feb 25 2009 : Display the x-axis labels dynamically - Nirmanith (End) : Aravinda 
        // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (Start) : Aravinda
        // Apr 19 2010 : Bug 1123 - Barchart problems with decimals - Exility App : Aravinda
        if (!(/^\d+(\.\d+){0,1}$/.test(grid[1][yaxiscolumnindex])))
        {
            var yaxisMap = new Array();
            var yaxisLabelMap = new Array();
            this.yaxislabels = null;
            for (var i = 1; i < grid.length; i++)
            {
                if (yaxisMap[grid[i][yaxiscolumnindex]])
                {
                    grid[i][yaxiscolumnindex] = yaxisMap[grid[i][yaxiscolumnindex]];
                }
                else
                {
                    yaxisMap[grid[i][yaxiscolumnindex]] = (yaxisLabelMap.length + 1);
                    yaxisLabelMap[yaxisLabelMap.length] = grid[i][yaxiscolumnindex];
                    grid[i][yaxiscolumnindex] = yaxisMap[grid[i][yaxiscolumnindex]];
                }
            }
            this.yaxislabels = "0: ;";
            for (i = 0; i < yaxisLabelMap.length; i++)
            {
                this.yaxislabels += (i + 1) + ":" + yaxisLabelMap[i] + ";";
            }
            this.yaxislabels += (yaxisLabelMap.length + 1) + ": ";
        }
        // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App (End) : Aravinda
        if (this.isMultiDataSet)
        {
            if (groupcolumnindex == null)
            {
                debug('Report Data sent by server is not valid. It does not contain the column ' + this.yaxiscolumn);
                return;
            }
            var reportSources = new Array();
            var bubbleSource = new Array();     // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
            for (var i = 1; i < grid.length; i++)
            {
                if (reportSources[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')])
                {
                    // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
                    if ((i == (grid.length - 1)) && this.maxx && this.maxy)
                    {
                        reportSources[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] += ", [" + grid[i][xaxiscolumnindex] + ", " + grid[i][yaxiscolumnindex] + "], [" + this.maxx + ", " + this.maxy + "]";
                        if (this.chartType == 'BUBBLE')
                        {
                            // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
                            bubbleSource[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] += " ," + (grid[i][bubblecolumnindex]) + ", 0";
                        }
                    }
                    else
                    {
                        reportSources[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] += ", [" + grid[i][xaxiscolumnindex] + ", " + grid[i][yaxiscolumnindex];
                        
                        if(helpTextColumnindex != null) //add help text column if required
                        	reportSources[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] += ",'" + grid[i][helpTextColumnindex]+"'";
                        
                        reportSources[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] += "]";
                        
                        if (this.chartType == 'BUBBLE')
                        {
                            // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
                            bubbleSource[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] += " ," + (grid[i][bubblecolumnindex]);
                        }
                    }
                    // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
                }
                else
                {
                    // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
                    if (this.minx && this.miny)
                    {
                        reportSources[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] = "[" + this.minx + "," + this.miny + "], [" + grid[i][xaxiscolumnindex] + ", " + grid[i][yaxiscolumnindex] + "]";
                    }
                    // Apr 14 2010 : Bug 1108 - Run Chart - Exility App (Start) : Aravinda
                    else if (this.chartType == 'RUNCHART')
                    {
                        reportSources[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] = "[" + grid[i][xaxiscolumnindex] + ", " + grid[i][yaxiscolumnindex] + "]";
                    }
                    // Apr 14 2010 : Bug 1108 - Run Chart - Exility App (End) : Aravinda
                    else
                    {
                        reportSources[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] = "[0,0], [" + grid[i][xaxiscolumnindex] + ", " + grid[i][yaxiscolumnindex];
                        
                        if(helpTextColumnindex != null) //add help text column if required
                        	reportSources[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] += ",'" + grid[i][helpTextColumnindex]+"'";
                        
                        reportSources[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] += "]";
                    }
                    if (this.chartType == 'BUBBLE')
                    {
                        // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
                        bubbleSource[grid[i][groupcolumnindex].replace(/,/g, '').replace(/ /g, '')] = "[0, " + (grid[i][bubblecolumnindex]);
                    }
                    // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
                }
            }
            var newArrays = "";
            var newArrayElements = "";
            for (var group in reportSources)
            {
            //June 8 3013 : Changing "group" to "group.replace(/[^\w\s]/gi, '')" to avoid brackets in the data for charts: Hemanth as per Vinay's Suggestion.
                newArrays += "var " + group.replace(/[^\w\s]/gi, '') + " = [" + reportSources[group] + "];";
                // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
                if (newArrayElements.length == 0)
                {
                    if (this.chartType == 'BUBBLE')
                    {
                        // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
                        newArrayElements += "{data: " + group.replace(/[^\w\s]/gi, '') + ", bubbleData: " + bubbleSource[group] + "], bubbleDenominator: " + this.bubbleradiusdenominator + ", label:'" + group + "'}";
                    }
                    else
                        newArrayElements += "{data: " + group.replace(/[^\w\s]/gi, '') + ", label:'" + group + "'}";
                }
                else
                {
                    if (this.chartType == 'BUBBLE')
                    {
                        // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
                        newArrayElements += ",{data: " + group.replace(/[^\w\s]/gi, '') + ", bubbleData: " + bubbleSource[group] + "], bubbleDenominator: " + this.bubbleradiusdenominator + ", label:'" + group + "'}";
                    }
                    else
                        newArrayElements += ",{data: " + group.replace(/[^\w\s]/gi, '') + ", label:'" + group + "'}";
                }
                // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
            }
            dataforReport = newArrays + dataforReport + newArrayElements;
        }
        else
        {
            var currentData = "";
            var bubbleData = "";
            for (var i = 1; i < grid.length; i++)
            {
                delim = ", ";
                if (i == 1)
                {
                    if (this.minx && this.miny)
                        delim = "[" + this.minx + ", " + this.miny + "], ";
                    // Apr 14 2010 : Bug 1108 - Run Chart - Exility App (Start) : Aravinda    
                    else if (this.chartType == 'RUNCHART')
                        delim = " ";
                    // Apr 14 2010 : Bug 1108 - Run Chart - Exility App (End) : Aravinda
                    else
                        delim = "[0,0], ";
                    // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
                    if (this.chartType == 'BUBBLE')
                    {
                        bubbleData = "[0, ";
                    }
                    // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
                }
                currentData += delim + "[" + grid[i][xaxiscolumnindex] + ", " + grid[i][yaxiscolumnindex];

                if(helpTextColumnindex != null) //add help text column if required
                	currentData += ",'" + grid[i][helpTextColumnindex]+"'";

                //temporary added by anand on 3-jan-2012 for horizontalbar
                if(horizontalBarTextIndex != null) //add help text column if required
                	currentData += ",'" + grid[i][horizontalBarTextIndex]+"'";
                //end of temporary addition by Anand
                
                currentData += "]";
                // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
                if (this.chartType == 'BUBBLE')
                {
                    // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
                    bubbleData += (grid[i][bubblecolumnindex]) + ", ";
                }
                if ((i == (grid.length - 1)) && this.maxx && this.maxy)
                {
                    currentData += ", [" + this.maxx + ", " + this.maxy + "]"; // Apr 19 2010 : Bug 1124 - Maxx Problem for CHart Field  - Exility : Venkat
                    if (this.chartType == 'BUBBLE')
                    {
                        bubbleData += "0";
                    }
                }
                // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda

            }
            // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
            if (this.chartType == 'BUBBLE')
            {
                // Apr 14 2010 : Bug 1109 - Bubble Chart - Exility App : Aravinda
                dataforReport = "var " + this.yaxiscolumn + " = [" + currentData + "]; " + dataforReport + "{data: " + this.yaxiscolumn + ", bubbleData: " + bubbleData + "], bubbleDenominator: " + this.bubbleradiusdenominator + "}";
            }
            else
            {
                dataforReport = "var " + this.yaxiscolumn + " = [" + currentData + "]; " + dataforReport + "{data: " + this.yaxiscolumn + " }";
            }
            // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
        }
    } else if (this.chartType == 'PIE')
    {
        xaxiscolumnindex = null;
        yaxiscolumnindex = null;
        gridHeader = grid[0];
        for (var i = 0; i < gridHeader.length; i++)
        {
            if (gridHeader[i] == this.xaxiscolumn)
                xaxiscolumnindex = i;
            if (gridHeader[i] == this.yaxiscolumn)
                yaxiscolumnindex = i;
            if (gridHeader[i] == this.groupbycolumn)
                groupcolumnindex = i;
        }
        if (xaxiscolumnindex == null)
        {
            debug('Report Data sent by server is not valid. It does not contain the column ' + this.xaxiscolumn);
            return;
        }
        if (yaxiscolumnindex == null)
        {
            debug('Report Data sent by server is not valid. It does not contain the column ' + this.yaxiscolumn);
            return;
        }
        dataforReport += "[ ";
        for (var i = 1; i < grid.length; i++)
        {
            delim = ", ";
            if (i == 1) delim = "";
            dataforReport += delim + "[" + grid[i][xaxiscolumnindex] + ", '" + grid[i][yaxiscolumnindex] + "']";
        }
        dataforReport += " ]";
    } else if (this.chartType == 'SPEEDOMETER')
    {
        dataforReport += "[[ ";
        for (var i = 0; i < grid[0].length; i++)
        {
            delim = ", ";
            if (i == 0) delim = "";
            dataforReport += delim + grid[1][i];
        }
        dataforReport += " ]]";
    } else if (this.chartType == 'RADAR')
    {
        for (var i = 1; i < grid.length; i++)
        {
            if (i > 1)
                dataforReport += ", ";
            dataforReport += "{ data: [";
            for (var j = 1; j < grid[0].length; j++)
            {
                if (j > 1)
                    dataforReport += ", ";
                dataforReport += grid[i][j];
            }
            dataforReport += "], label: '";
            dataforReport += grid[i][0];
            dataforReport += "'}";
        }
    }
    
    // May 09 2012 : Chart Extension - Pathfinder (Start) : Aravinda
    if (this.chartType == 'BULLET')
    {
        var invoicecolumnindex = null;
        var commitedcolumnindex = null;
        var plannedcolumnindex = null;
        var adjustedcolumnindex = null;
        var bulletlabelcolumnindex = null;
        gridHeader = grid[0];
        for (var i = 0; i < gridHeader.length; i++)
        {
            if (gridHeader[i] == this.invoicecolumn)
                invoicecolumnindex = i;
            if (gridHeader[i] == this.commitedcolumn)
                commitedcolumnindex = i;
            if (gridHeader[i] == this.plannedcolumn)
                plannedcolumnindex = i;
            if (gridHeader[i] == this.adjustedcolumn)
                adjustedcolumnindex = i;
            if (gridHeader[i] == this.bulletlabelcolumn)
                bulletlabelcolumnindex = i;
            if (gridHeader[i] == this.helpTextColumn)
            	helpTextColumnIndex = i;
        }
        if (invoicecolumnindex == null || commitedcolumnindex == null || plannedcolumnindex == null || adjustedcolumnindex == null || bulletlabelcolumnindex == null)
        {
            debug('Report Data sent by server is not valid. It does not contain all the necessary columns');
            return;
        }

        for (var i = 1; i < grid.length; i++)
        {
            if (i != 1)
            {
                dataforReport += ", ";
            }
            dataforReport += "{data:[" + grid[i][invoicecolumnindex] + ", " + grid[i][commitedcolumnindex] + ", " + grid[i][plannedcolumnindex] + ", " + grid[i][adjustedcolumnindex] + ", '" + grid[i][helpTextColumnIndex] + "'], ";
            dataforReport += "label: '" + grid[i][bulletlabelcolumnindex] + "'}";
        }
    }
    else if (this.chartType == 'SANKEY')
    {
        distributionvaluecolumnindex = null;
        var fromcolumnindex = null;
        var tocolumnindex = null;
        gridHeader = grid[0];
        for (var i = 0; i < gridHeader.length; i++)
        {
            if (gridHeader[i] == this.distributionvaluecolumn)
                distributionvaluecolumnindex = i;
            if (gridHeader[i] == this.fromcolumn)
                fromcolumnindex = i;
            if (gridHeader[i] == this.tocolumn)
                tocolumnindex = i;
        }
        if (distributionvaluecolumnindex == null || fromcolumnindex == null || tocolumnindex == null)
        {
            debug('Report Data sent by server is not valid. It does not contain all the necessary columns');
            return;
        }

        dataforReport += "[";
        for (var i = 1; i < grid.length; i++)
        {
            if (i != 1)
            {
                dataforReport += ", ";
            }
            dataforReport += "[" + grid[i][distributionvaluecolumnindex] + ", '" + grid[i][fromcolumnindex] + "', '" + grid[i][tocolumnindex] + "']";
        }
        dataforReport += "]";
    }
    else if (this.chartType == 'SUNBURST')
    {
        distributionvaluecolumnindex = null;
        var corecolumnindex = null;
        var level1columnindex = null;
        var level2columnindex = null;
        gridHeader = grid[0];
        for (var i = 0; i < gridHeader.length; i++)
        {
            if (gridHeader[i] == this.distributionvaluecolumn)
                distributionvaluecolumnindex = i;
            if (gridHeader[i] == this.corecolumn)
                corecolumnindex = i;
            if (gridHeader[i] == this.level1column)
                level1columnindex = i;
            if (gridHeader[i] == this.level2column)
                level2columnindex = i;
        }
        if (distributionvaluecolumnindex == null || corecolumnindex == null || level1columnindex == null || level2columnindex == null)
        {
            debug('Report Data sent by server is not valid. It does not contain all the necessary columns');
            return;
        }

        dataforReport += "[";
        for (var i = 1; i < grid.length; i++)
        {
            if (i != 1)
            {
                dataforReport += ", ";
            }
            dataforReport += "[" + grid[i][distributionvaluecolumnindex] + ", '" + grid[i][level2columnindex] + "', '" + grid[i][level1columnindex] + "', '" + grid[i][corecolumnindex] + "']";
        }
        dataforReport += "]";
    }
    //May 09 2012 : Chart Extension - Pathfinder (End) : Aravinda
    dataforReport += "]}";
    var optionsforReport = "var options = {";
    var optionsforReportLen = optionsforReport.length;
    // Apr 12 2010 : Bug 1107 - Horizontal & Vertical Stacked bar char - Exility App : Aravinda
    if ((this.chartType == 'BAR') || (this.chartType == 'HORIZONTALBAR') || (this.chartType == 'STACKED'))
    {
        optionsforReport += "bars: {show:true},colors: ['#C3C790','#CC706F','#EBE647'] ";
    }
    else if(this.chartType == 'HORIZONTALSTACKED')//Added as per Vinay's suggestion to have more colors for Horizontal Stacked:Hemanth
    {
        optionsforReport += "bars: {show:true},colors: ['#1D7CDC','#0A233B','#89BD00', '#950300','#00ACD0', '#492873','#F69035','#72A0E9','#C9271E'] ";
    }
    else if (this.chartType == 'RADAR')
    {
        optionsforReport += "axislabels: [";
        for (var j = 1; j < grid[0].length; j++)
        {
            if (j > 1)
                optionsforReport += ", ";
            optionsforReport += "'" + grid[0][j] + "'";
        }
        optionsforReport += "] ";
    }
    // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
    else if ((this.chartType == 'SCATTER') || (this.chartType == 'BUBBLE') || (this.chartType == 'DEFAULT'))
    {
        optionsforReport += "points: {show:true, fill:true},lines :{show:true},colors:['#463EED','#F26F6D']";
    }
    // Mar 25 2010 : Bug 1004 - Bubble Chart feature - Exility App : Aravinda
    // May 09 2012 : Chart Extension - Pathfinder (Start) : Aravinda
    // formatter is added in optionForReport for BULLET Chart which is used for identifying whether dollar formating is required or not --Anand 12-aug-2013
    else if (this.chartType == 'BULLET')
    {
   	    optionsforReport += "colors: ['#204D77','#C1272D','#668AAA','#AABDD2'] , formatter: '"+this.formatter+ "'";//'#424c7b', '#ff3333', '#7ea8cf', '#dbd9fe' //modified by Anand as suggested by UX team
    }
	else if(this.chartType == 'SUNBURST')
	{
		 optionsforReport += "colors: ['#CA3276','#30D1D1', '#D13030', '#C6E498', '#DBA450', '#416D9C', '#8480BD', '#FFAAAA'] ";
	}

    else if (this.chartType == 'SANKEY')
    {
        optionsforReport += "colors: ['#B8C75A','#F8D400','#F26F6D','#32BF7C','#F2A963','#FACE5F','#6C6AD2','#6081CF','#FF73B9','#33FDC0','#995577','#558899','#558866','#555588','#888844','#884444','#774477','#885544','#66aabb','#bb6677','#aa6655','#bb77cc','#665599','#885588','#886655'] ";
    }
	
	// May 09 2012 : Chart Extension - Pathfinder (End) : Aravinda

    if (this.xaxislabels)
    {
        if (optionsforReport.length != optionsforReportLen)
            optionsforReport += ", ";
        labels = this.xaxislabels.split(";");
        var xaxisformatter = "xaxis: {";
        xaxisformatter += " noTicks: " + labels.length + ", ";
        xaxisformatter += " min: " + labels[0].split(":")[0] + ", ";
        xaxisformatter += " max: " + labels[labels.length - 1].split(":")[0] + ", ticks: [";
        for (var xaxislblctr = 0; xaxislblctr < labels.length; xaxislblctr++)
        {
            delim = ", ";
            if (xaxislblctr == 0)
                delim = "";
            curlabelparts = labels[xaxislblctr].split(":");
            xaxisformatter += delim + "[" + curlabelparts[0] + ", '" + curlabelparts[1] + "']";
        }
        xaxisformatter += "]}";
        optionsforReport += xaxisformatter;
    }

    // Feb 26 2009 : Y-Axis Label Formatter for Charts - Nirmanith (Start) : Aravinda
    if (this.yaxislabels || this.yaxislabelformatterid)
    {
        if (this.yaxislabels)
        {
            if (optionsforReport.length != optionsforReportLen)
                optionsforReport += ", ";
            labels = this.yaxislabels.split(";");
            yaxisformatter = "yaxis: {";
            yaxisformatter += " noTicks: " + labels.length + ", ";
            yaxisformatter += " min: " + labels[0].split(":")[0] + ", ";
            yaxisformatter += " max: " + labels[labels.length - 1].split(":")[0] + ", ticks: [";
            for (var yaxislblctr = 0; yaxislblctr < labels.length; yaxislblctr++)
            {
                delim = ", ";
                if (yaxislblctr == 0)
                    delim = "";
                curlabelparts = labels[yaxislblctr].split(":");
                yaxisformatter += delim + "[" + curlabelparts[0] + ", '" + curlabelparts[1] + "']";
            }
            yaxisformatter += "]}";
            optionsforReport += yaxisformatter;
        }
        else
        {
            if (optionsforReport.length != optionsforReportLen)
                optionsforReport += ", ";
            yaxisformatter = "yaxis: {";
            yaxisformatter += " formatId: '" + this.yaxislabelformatterid + "'";
            yaxisformatter += "}";
            optionsforReport += yaxisformatter;
        }
    }
    // Feb 26 2009 : Y-Axis Label Formatter for Charts - Nirmanith (End) : Aravinda

    //if(this.isMultiDataSet)
    //{
    if (optionsforReport.length != optionsforReportLen)
        optionsforReport += ", ";
    // Jun 10 2009 :  Bug 436 -  Tool Tip - Seamless (Start) : Aravinda
    optionsforReport += "mouse: {track: true}, legend: {show:" + this.showLegend + "}"; // Feb 6 2009 : Hide / Display Legend on Charts : Aravinda
    // Jun 10 2009 :  Bug 436 -  Tool Tip - Seamless (End) : Aravinda
    //}
    optionsforReport += "}";PM.debug('dataforReport:'+dataforReport);
    try
    {	
        PM.currentActiveWindow.createChart(chartContainerName, dataforReport, optionsforReport, this.chartType);
        /*
        eval(dataforReport);
        eval(optionsforReport);
        PM.currentActiveWindow.createChart(chartContainerName, reportData.series, options, this.chartType);
        */
    }
    catch (e)
    {
        debug('Report Data sent by server is not valid. It failed with error : ' + e);
    }
};

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
};


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
};

//get an array of data rows extracted from given grid.
//each row contains columns as in columnNames.
ChartField.prototype.getDataSeries = function (grid, columnNames)
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
};

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
};

function PieChart()
{
    ChartField.call(this);
    this.chartType = 'PIE';
    this.xaxiscolumn = null; //Required. Name of the column to get data
    this.yaxiscolumn = null; //Requqired. column to get name (label)
    this.yaxislabelformatterid = null; //formatter function for y axis labels. function(label, data){return formatted-data}
    this.showLegends = true;
    this.minPercentToShowLabel = 0;
}

PieChart.prototype = new ChartField;

PieChart.prototype.fillReportToObject = function (grid, obj)
{
    var w = this.P2.win;
    /*added by vinay: To draw highchart pie*/
    if(w.$)
    obj = w.$(this.name);
    
    if(w.drawHighChart)
    {
    	w.drawHighChart(this, grid, obj);
    	return;
    }
    /*end*/
    
    var series = new w.Array();
    var options = new w.Object();
    if (grid && grid.length > 1)
    {
        series = this.getDataSeries(grid, [this.xaxiscolumn, this.yaxiscolumn]);
        options = this.getOptions(grid);
        if (this.helpTexts)
        {
            //options.mouse = {track:true};
            obj.helpTexts = this.helpTexts;
            obj.observe('flotr:mousemove', function (e)
            {
                this.title = '';
                var txt = this.helpTexts[e.memo[1].rowIdx];
                if (txt)
                    this.title = txt;
            });
        }
    }
    var f = w.Flotr.draw(obj, [series], options, 'PIE');  
    this.setLegend(f.getLegend());
};

//options is of the form {xaxis:{xaxisOptions}, yaxis:{yaxisOptions}}
PieChart.prototype.getOptions = function (grid)
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
};

function SunBurstChart()
{
    ChartField.call(this);
    this.chartType = 'SUNBURST';
    this.distributionvaluecolumn = null; //Column that has the data (value). if omitted, use first (0th column).
    this.level2column = null; //Column that has the label at the detail level. if omitted, defaults to second column.
    this.level1column = null; //column that has the label for the group. defaults to third column
    this.corecolumn = null; //title for the chart. Assumed that this is same for all columns. Last row is used. Defaults to 4th coulmn.
    this.colors = null; //comma separated colors used at the group level. Detailed ones always use random colors.
    this.helpTextColumn = null;
    this.groupHelpTextColumn = null;
}

SunBurstChart.prototype = new ChartField;

SunBurstChart.prototype.fillReportToObject = function (grid, obj)
{
    var series = [];
    var options = {};
    if (grid && grid.length > 1)
    {
        series = this.getDataSeries(grid, [this.distributionvaluecolumn, this.level2column, this.level1column, this.corecolumn]);
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
};

function SankeyChart()
{
    ChartField.call(this);
    this.chartType = 'SANKEY';
    this.distributionvaluecolumn = null; //Column that has the data (value). if omitted, use first (0th column).
    this.fromcolumn = null; //Column that has the label for left side. defaults to second column.
    this.tocolumn = null; //column that has the label for the right side defaults to third column
    this.colors = ['#B8C75A','#F8D400','#F26F6D','#32BF7C','#F2A963','#FACE5F','#6C6AD2','#6081CF','#FF73B9','#33FDC0','#995577','#558899','#558866','#555588','#888844','#884444','#774477','#885544','#66aabb','#bb6677','#aa6655','#bb77cc','#665599','#885588','#886655'];
    this.highlightColor = null; //color tobe used for highlighting charts for clicked bar
}

SankeyChart.prototype = new ChartField;

SankeyChart.prototype.fillReportToObject = function (grid, obj)
{
    var series = [];
    var options = {};
    if (grid && grid.length > 1)
    {
        series = this.getDataSeries(grid, [this.distributionvaluecolumn, this.fromcolumn, this.tocolumn]);
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
