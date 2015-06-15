
 var ele;
var P2 = new PM.ExilityPage(window, 'chartPanel');
P2.onLoadActionNames = [ 'drawCharts'];
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.breadCrumpTitle = 'chartPanel';

//special variable for tracking active tab of tab panel charts
var chartsActiveTabName = 'barTab';
var chartsActivePanelName = 'barTabsDiv';

/* MetaData for Panel :bar with table name = barData*/
ele = new PM.ChartPanel();
ele.name = 'barData';
ele.panelName = 'bar';
ele.tableName = 'barData';
ele.slideEffect = 'none';
//linkedTableName  DOES NOT EXIST

ele.chartType = 'bar';
ele.onClickFunctionName = 'pieClicked';
ele.onMoveFunctionName = 'movedOnPie';
ele.xAxisColumn = 'districtCount';
ele.yAxisColumn = 'districtCount';
ele.helpTextColumn = 'helpText';
ele.labelColor = 'blue';
ele.xLabelFormatterFunction = 'xLabelFormatter';
ele.yLabelFormatterFunction = 'yLabelFormatter';
ele.bubbleRadiusDenominator = '1.0';
ele.labelLeftMargin = 12;
ele.labelBottomMargin = 3;
ele.colors = [ 'red','black','#aabbcc','#cc2211','blue'];
ele.shadowSize = 6;
ele.rawDataDisplay = 'value';
ele.legendNbrColumns = 1;
ele.legendLabelFormatter = 'legendFormatter';
ele.legendLabelBoxBorderColor = 'red';
ele.legendPosition = 'se';
ele.legendMargin = 1;
ele.legendBackgroundColor = 'white';
ele.legendBackgroundOpacity = '0.5';
ele.marginLeft = 10;
ele.marginBottom = 11;
ele.barLabelLeftMargin = 5;
ele.barLabelBottomMargin = 6;
ele.yLabelMaxWidth = 26;
ele.lineWidth = 5;
ele.barWidth = '2.0';
ele.gridColor = 'green';
ele.tickColor = 'blue';
ele.showFilledPoints = true;
ele.pointsRadius = 5;
ele.pointsFillColor = 'yellow';
P2.addTable(ele);

/* MetaData for Panel :pie with table name = pieData*/
ele = new PM.ChartPanel();
ele.name = 'pieData';
ele.panelName = 'pie';
ele.tableName = 'pieData';
ele.slideEffect = 'none';
//linkedTableName  DOES NOT EXIST

ele.chartType = 'pie';
ele.onClickFunctionName = 'pieClicked';
ele.onMoveFunctionName = 'movedOnPie';
ele.xAxisColumn = 'count';
ele.yAxisColumn = 'department';
ele.helpTextColumn = 'helpText';
ele.labelColor = 'blue';
ele.xLabelFormatterFunction = 'xLabelFormatter';
ele.yLabelFormatterFunction = 'yLabelFormatter';
ele.bubbleRadiusDenominator = '1.0';
ele.labelLeftMargin = 12;
ele.labelBottomMargin = 3;
ele.colors = [ 'red','black','#aabbcc','#cc2211','blue'];
ele.shadowSize = 6;
ele.rawDataDisplay = 'value';
ele.legendNbrColumns = 1;
ele.legendLabelFormatter = 'legendFormatter';
ele.legendLabelBoxBorderColor = 'red';
ele.legendPosition = 'se';
ele.legendMargin = 1;
ele.legendBackgroundColor = 'white';
ele.legendBackgroundOpacity = '0.5';
ele.marginLeft = 10;
ele.marginBottom = 11;
ele.barLabelLeftMargin = 5;
ele.barLabelBottomMargin = 6;
ele.yLabelMaxWidth = 26;
ele.lineWidth = 5;
ele.barWidth = '0.5';
ele.gridColor = 'green';
ele.tickColor = 'blue';
ele.showFilledPoints = true;
ele.pointsRadius = 5;
ele.pointsFillColor = 'yellow';
P2.addTable(ele);
/***** action field = drawCharts  ********/
ele = new PM.LocalAction();
ele.name = 'drawCharts';
ele.functionName = 'drawCharts';
P2.addAction(ele);