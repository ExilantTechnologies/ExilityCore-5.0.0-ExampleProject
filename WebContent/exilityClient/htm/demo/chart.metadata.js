
 var ele;
var P2 = new PM.ExilityPage(window, 'chart');
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.breadCrumpTitle = 'chart';

/* MetaData for the Page element :chartTypes*/
ele = new PM.SelectionField();
ele.blankOption = 'select';
ele.dataType = 'description';
ele.onChangeActionName = 'drawChart';
ele.selectionValueType = 'text';
ele.valueList = '1,vert Bar (single);2,vert Bar (multiple);3,Line (single);4,Line (multiple);5,pie;6,stacked Bar;7,horizontal bar;8,horizontal stacked;9,bullet;10,Sun Burst;11,Sankey';
ele.name = 'chartTypes';
ele.label = 'Chart Type';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :barChart1*/
ele = new PM.BarChart();
ele.dataType = 'text';
ele.noAutoLoad = true;
ele.reportServiceId = 'chart.barChart1';
ele.xaxiscolumn = 'state';
ele.yaxiscolumn = 'districtCount';
ele.xaxislabel = 'Indian states';
ele.yaxislabel = 'districts';
ele.showLegend = true;
ele.bubbleradiusdenominator = '1.0';
ele.helpTextColumn = 'toolTip';
ele.onClickFunctionName = 'drillDownDistrict';
ele.direction = 'vertical';
ele.marginLeft = 35;
ele.marginBottom = 35;
ele.onMoveFunctionName = 'mouseMoveOnDistricts';
ele.yLabelMaxWidth = 10;
ele.xLabelFormatterFunction = 'xlabelformatter';
ele.yLabelFormatterFunction = 'xlabelformatter';
ele.name = 'barChart1';
ele.label = 'Indian states with District Count';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :barChart2*/
ele = new PM.BarChart();
ele.dataType = 'text';
ele.noAutoLoad = true;
ele.reportServiceId = 'chart.barChart2';
ele.xaxiscolumn = 'state';
ele.yaxiscolumn = 'production';
ele.isMultiDataSet = true;
ele.groupbycolumn = 'crop';
ele.xaxislabel = 'Indian states';
ele.yaxislabel = 'crop production';
ele.showLegend = true;
ele.bubbleradiusdenominator = '1.0';
ele.legendLabelFormatter = 'formatLegend';
ele.legendContainer = 'myLegendDiv';
ele.helpTextColumn = 'toolTip';
ele.onClickFunctionName = 'drillDownCrop';
ele.direction = 'vertical';
ele.onMoveFunctionName = 'mouseMoveonCrops';
ele.legendHighlight = true;
ele.name = 'barChart2';
ele.label = 'Indian state wise commercial crops';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :lineChart1*/
ele = new PM.LineChart();
ele.dataType = 'text';
ele.noAutoLoad = true;
ele.reportServiceId = 'chart.lineChart1';
ele.xaxiscolumn = 'state';
ele.yaxiscolumn = 'districtCount';
ele.xaxislabel = 'Indian states';
ele.yaxislabel = 'districts';
ele.showLegend = true;
ele.bubbleradiusdenominator = '1.0';
ele.helpTextColumn = 'toolTip';
ele.onClickFunctionName = 'drillDownDistrict';
ele.name = 'lineChart1';
ele.label = 'State and Districts';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :lineChart2*/
ele = new PM.LineChart();
ele.dataType = 'text';
ele.noAutoLoad = true;
ele.reportServiceId = 'chart.lineChart2';
ele.xaxiscolumn = 'state';
ele.yaxiscolumn = 'production';
ele.isMultiDataSet = true;
ele.groupbycolumn = 'crop';
ele.xaxislabel = 'Indian states';
ele.yaxislabel = 'crop production';
ele.showLegend = true;
ele.bubbleradiusdenominator = '1.0';
ele.helpTextColumn = 'toolTip';
ele.onClickFunctionName = 'drillDownCrop';
ele.name = 'lineChart2';
ele.label = 'state wise commercial crops';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :stackedBarChart*/
ele = new PM.BarChart();
ele.dataType = 'text';
ele.noAutoLoad = true;
ele.reportServiceId = 'chart.stackedBarChart';
ele.xaxiscolumn = 'state';
ele.yaxiscolumn = 'production';
ele.isMultiDataSet = true;
ele.groupbycolumn = 'crop';
ele.xaxislabel = 'Indian states';
ele.yaxislabel = 'crop production';
ele.showLegend = true;
ele.bubbleradiusdenominator = '1.0';
ele.helpTextColumn = 'toolTip';
ele.onClickFunctionName = 'drillDownCrop';
ele.stacking = true;
ele.direction = 'vertical';
ele.legendHighlight = true;
ele.name = 'stackedBarChart';
ele.label = 'state wise commercial crops';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :horizontalbarChart*/
ele = new PM.BarChart();
ele.dataType = 'text';
ele.noAutoLoad = true;
ele.reportServiceId = 'chart.horizontalbarChart';
ele.xaxiscolumn = 'production';
ele.yaxiscolumn = 'state';
ele.isMultiDataSet = true;
ele.groupbycolumn = 'crop';
ele.xaxislabel = 'crop production';
ele.yaxislabel = 'Indian states';
ele.showLegend = true;
ele.bubbleradiusdenominator = '1.0';
ele.helpTextColumn = 'toolTip';
ele.onClickFunctionName = 'drillDownCrop';
ele.direction = 'horizontal';
ele.legendHighlight = true;
ele.yLabelMaxWidth = 10;
ele.name = 'horizontalbarChart';
ele.label = 'state wise commercial crops';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :horizontalstacked*/
ele = new PM.BarChart();
ele.dataType = 'text';
ele.noAutoLoad = true;
ele.reportServiceId = 'chart.horizontalstacked';
ele.xaxiscolumn = 'production';
ele.yaxiscolumn = 'state';
ele.isMultiDataSet = true;
ele.groupbycolumn = 'crop';
ele.xaxislabel = 'crop production';
ele.yaxislabel = 'Indian states';
ele.showLegend = true;
ele.bubbleradiusdenominator = '1.0';
ele.helpTextColumn = 'toolTip';
ele.onClickFunctionName = 'drillDownCrop';
ele.stacking = true;
ele.direction = 'horizontal';
ele.legendHighlight = true;
ele.yLabelMaxWidth = 10;
ele.name = 'horizontalstacked';
ele.label = 'state wise commercial crops';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :pieChart*/
ele = new PM.PieChart();
ele.dataType = 'text';
ele.noAutoLoad = true;
ele.reportServiceId = 'chart.pieData';
ele.xaxiscolumn = 'count';
ele.yaxiscolumn = 'functionalGroup';
ele.showLegend = true;
ele.bubbleradiusdenominator = '1.0';
ele.rawDataDisplay = 'percent';
ele.helpTextColumn = 'ttip';
ele.name = 'pieChart';
ele.label = 'Functional group(pie)';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :bulletChart*/
ele = new PM.BulletChart();
ele.dataType = 'text';
ele.noAutoLoad = true;
ele.reportServiceId = 'chart.bulletChart';
ele.showLegend = true;
ele.bubbleradiusdenominator = '1.0';
ele.firstQualitativeRange = 'planned';
ele.secondQualitativeRange = 'adjusted';
ele.valueOfInterest = 'invoice';
ele.comparativeValue = 'committed';
ele.bulletlabelcolumn = 'label';
ele.helpTextColumn = 'ttip';
ele.onClickFunctionName = 'myFunction';
ele.name = 'bulletChart';
ele.label = 'Step Label';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :sunBurstChart*/
ele = new PM.SunBurstChart();
ele.dataType = 'text';
ele.noAutoLoad = true;
ele.reportServiceId = 'chart.sunBurstChart';
ele.showLegend = true;
ele.bubbleradiusdenominator = '1.0';
ele.distributionvaluecolumn = 'distribution';
ele.corecolumn = 'source';
ele.level1column = 'level1';
ele.level2column = 'level2';
ele.rawDataDisplay = 'percent';
ele.colors = '#32BF7C,#F8D400,#F2A963,#FACE5F,#6C6AD2,#6081CF,#CC706F,#995577,#558899,#558866,#555588,#888844,#884444,#774477,#885544,#66aabb,#bb6677,#aa6655,#bb77cc,#665599,#885588,#886655';
ele.helpTextColumn = 'ttip';
ele.name = 'sunBurstChart';
ele.label = 'Step Label';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :sankeyChart*/
ele = new PM.SankeyChart();
ele.dataType = 'text';
ele.noAutoLoad = true;
ele.reportServiceId = 'chart.sankeyChart';
ele.showLegend = true;
ele.bubbleradiusdenominator = '1.0';
ele.distributionvaluecolumn = 'count';
ele.fromcolumn = 'source';
ele.tocolumn = 'target';
ele.helpTextColumn = 'ttip';
ele.onClickFunctionName = 'myFunction';
ele.name = 'sankeyChart';
ele.label = 'Step Label';
ele.value = '';
P2.addField(ele);
/***** action field = drawChart  ********/
ele = new PM.LocalAction();
ele.name = 'drawChart';
ele.functionName = 'drawChart';
P2.addAction(ele);