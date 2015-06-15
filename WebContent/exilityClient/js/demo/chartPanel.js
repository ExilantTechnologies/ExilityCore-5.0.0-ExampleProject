/**
 * some data for charts hard coded here, rather than getting from server
 */
var stateAndDistricts = [
                   ['state', 'districtCount','helpText']
                   ,['Andra Pradesh', 23 ,'Andhra Pradesh is often called as Food Bowl of the South India.']
                   ,['Assam', 23 ,'Land of lush green cover in the rolling plains' ]
                   ,['Arunachal Pradesh', 14 ,'Arunachal Pradesh is the first state in India to greet the morning sun']
                   ,['Gujarat', 25 ,'Needlework of Gujarat is famous in the world for its elegance and accuracy']
                   ,['Bihar', 37 ,'Bihar is well known throughout the world for Lord Budha and Lord Mahavira']
                   ,['Haryana', 19 ,'Heart of North India which means that most of the main routes connecting Delhi to other parts of India pass through this state']
                   ,['Himachal Pradesh', 12 ,'Himachal Pradesh is blessed with some of the most spectacular and beautiful landscapes']
                   ,['Jammu & Kashmir', 14 ,'Kashmir is famous all over the world for its woolens and wooden handicrafts. Saffron, shatoosh and pashmina shawls, hand woven carpets']
                   ,['Karnataka', 27 ,'Karnataka is one of the forerunners of the information technology revolution in the country' ]
                   ,['Kerala', 14 ,'Land of lush green cover in the rolling plains' ]
                   ,['Madhya Pradesh', 48 ,'Rich bouquet of famous tourism destinations' ]
                   ,['Maharashtra', 35 ,' famous for vada pav, juhu beach, koli dance, bollywood and mumbai' ]
                   
           ];
var stateCrops = [
	                 ['state', 'production','crop','helpText']
	                 ,['Andra Pradesh', 20 ,'sugarcane','20% area is cultivated with sugarcane'] 
	                 ,['Andra Pradesh', 10 ,'cotton','10% area is cultivated with cotton']
	                 ,['Andra Pradesh', 5 ,'Tea','5% area is cultivated with tea'] 
	                 
	                 ,['Karnataka', 40 ,'sugarcane','40% area is cultivated with sugarcane']
	                 ,['Karnataka', 60 ,'cotton','60% area is cultivated with cotton']
	                 ,['Karnataka', 20 ,'Tea','20% area is cultivated with tea']
	                 
	                 ,['Madhya Pradesh', 10 ,'sugarcane','10% area is cultivated with sugarcane'] 
	                 ,['Madhya Pradesh', 30 ,'cotton','30% area is cultivated with cotton']
	                 ,['Madhya Pradesh', 5 ,'Tea','5% area is cultivated with tea']    
                 ];

var pieData = [
               ['department', 'count','helpText']
               ,['Operatins', 20,'Operation: 20']
               ,['Travel', 30,'Travel: 30']
               ,['Retail', 40,'Retail: 40']
               ,['Marketing', 50,'Marketing: 50']
               ,['Customer Service', 10,'Customer Service: 10']
               ,['Corporate', 22,'Corporate: 22']
               ,['Admin', 50,'Admin : 50']
               ];

var bulletData = [
	               ['label','planned','adjusted','invoice','committed','helpText']
	               ,['AOS', 100,120,80,60,'My tooltip AOS: 20']
	               ,['GBI', 100,120,80,70,'My tooltip GBI: 30']
	               ,['Retail', 100,120,80,90,'My tooltip Retail: 40']
	               ,['Marketing', 100,120,80,50,'My tooltip Marketing: 50']
	               ,['Customer systems', 100,120,80,30,'My tooltip Customer systems: 10']
	               ,['Corporate systems', 100,120,80,80,'My tooltip Corporate: 22']
	               ,['IT gov', 100,120,80,70,'My tooltip IT gov: 50']
	               ];

var sunBurstData = [
	               ['source', 'level1','level2','distribution','helpText']
	               ,['INDIA','Karnataka','Bangalore',100,'garden city']
	               ,['INDIA','Karnataka','Mysore',80,'flower city']
	               ,['INDIA','Karnataka','Tumkur',60,'coconut city']
	               ,['INDIA','Andra pradesh','chitoor',25,'city1']
	               ,['INDIA','Andra pradesh','vellore',65,'city2']
	               ,['INDIA','Andra pradesh','anantapur',90,'city3']
	               ,['INDIA','Kerala','kochi',50,'city4']
	               ,['INDIA','Kerala','palakkad',80,'city5']
	               ,['INDIA','Kerala','thiruvananthpuram',90,'city6']
	               ];

var sankeyData = [
 	               ['source','target','count','helpText']
 	               ,['Karnataka','Bangalore',100,'garden city']
 	               ,['Karnataka','Mysore',80,'flower city']
 	               ,['Karnataka','Tumkur',60,'coconut city']
 	               ,['Andra pradesh','Guntur',25,'Chilli city']
 	               ,['Andra pradesh','Thirupathi',65,'Holy city']
 	               ,['Andra pradesh','anantapur',90,'Anant City :-)']
 	               ,['Kerala','kochi',50,'Kozhi Kodai']
 	               ,['Kerala','palakkad',80,'Palak ka kadu']
 	               ,['Kerala','thiruvananthpuram',90,'longest city!!']
 	               ];

/**
 * these are the panel names in page.xml. We follow <panelName>Data as tableName for these panels.
 * We also use these, in the same order, in the drop-down for user to choose the chart
 */
var panelNames = [	'bar'
              	,'multipleBar'
              	,'stacked'
              	,'horizontalBar'
              	,'horizontalStacked'
              	,'line'
              	,'multipleLine'
              	,'lineAndBar'
              	,'scatter'
            	,'pie'
            	,'speedomoter'
            	,'radar'
            	,'bubble'
            	,'run'
              	,'bullet'
              	,'sunBurst'
              	,'sankey'
              ];
/**
 * let us associate data with chart. Note that we re-use data across chart types
 */
var chartGrids = [stateAndDistricts, 
              stateCrops, 
              stateAndDistricts, 
              stateCrops, 
              stateCrops, 
              stateCrops, 
              stateCrops, 
              stateCrops, 
              stateCrops, 
              pieData,
              stateCrops,
              stateCrops,
              stateCrops,
              bulletData,
              sunBurstData,
              sankeyData
              ];


/**
 * called on change of seleciton field
 */
var drawChart = function(idx)
{
	var chartTable = panelNames[idx] + 'Data';
	var table = P2.getTable(chartTable);
	if(!table){
		PM.debug(panelNames[idx] + ' is not yet implemented');
		return;
	}

	var dc = new PM.DataCollection();
	dc.addGrid(chartTable, chartGrids[idx]);
	table.setData(dc);
};

var drawAllCharts = function(){
	for(var i = panelNames.length - 1; i >= 0; i--){
		drawChart(i);
	}
};
/**
 * this is the onload action
 */
var drawCharts = function(){
	/*
	 *there is some issue in timing about onload, because of which chart does not coome properly.
	 *we are to use a timer to fire it later
	 */
	window.setTimeout('drawAllCharts();', 10);
};

var xLabelFormatter = function (label) {
	return 'x-'+ label;
};

var yLabelFormatter = function(label) {
	return 'y-'+ label +'#';
};

var legendFormatter  = function(label){
	return '-' + label + '.';
};


var pieClicked = function(rowIdx){
	rowIdx++;
	alert('You clicked on segment that shows data for ' + pieData[rowIdx][0]);
};

var movedOnPie = function(rowIdx){
	rowIdx++;
	PM.debug('mouse moved on segment ' + rowIdx );
};