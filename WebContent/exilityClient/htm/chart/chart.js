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

var stateAndDistricts = [
		[ 'state', 'districtCount', 'toolTip' ],
		[ 'Andra Pradesh', 23,
				'Andhra Pradesh is often called as Food Bowl of the South India.' ],
		[ 'Assam', 23, 'Land of lush green cover in the rolling plains' ],
		[ 'Arunachal Pradesh', 14,
				'Arunachal Pradesh is the first state in India to greet the morning sun' ],
		[ 'Gujarat', 25,
				'Needlework of Gujarat is famous in the world for its elegance and accuracy' ],
		[ 'Bihar', 37,
				'Bihar is well known throughout the world for Lord Budha and Lord Mahavira' ],
		[
				'Haryana',
				19,
				'Heart of North India which means that most of the main routes connecting Delhi to other parts of India pass through this state' ],
		[
				'Himachal Pradesh',
				12,
				'Himachal Pradesh is blessed with some of the most spectacular and beautiful landscapes' ],
		[
				'Jammu & Kashmir',
				14,
				'Kashmir is famous all over the world for its woolens and wooden handicrafts. Saffron, shatoosh and pashmina shawls, hand woven carpets' ],
		[
				'Karnataka',
				27,
				'Karnataka is one of the forerunners of the information technology revolution in the country' ],
		[ 'Kerala', 14, 'Land of lush green cover in the rolling plains' ],
		[ 'Madhya Pradesh', 48, 'Rich bouquet of famous tourism destinations' ],
		[ 'Maharashtra', 35,
				' famous for vada pav, juhu beach, koli dance, bollywood and mumbai' ]

];

var stateCrops = [
		[ 'state', 'production', 'crop', 'toolTip' ],
		[ 'Andra PradeshPradeshPradesh', 20, 'sugarcane',
				'20% area is cultivalted with sugarcane' ],
		[ 'Andra PradeshPradeshPradesh', 10, 'cotton',
				'10% area is cultivalted with cotton' ]
		/*
		 * ,['Andra PradeshPradeshPradesh', 5 ,'Tea','5% area is cultivalted
		 * with tea']
		 */

		,
		[ 'Karnataka', 40, 'sugarcane',
				'40% area is cultivalted with sugarcane' ]
		/* ,['Karnataka', 60 ,'cotton','60% area is cultivalted with cotton'] */
		,
		[ 'Karnataka', 20, 'Tea', '20% area is cultivalted with tea' ]

		,
		[ 'Madhya Pradesh', 10, 'sugarcane',
				'10% area is cultivalted with sugarcane' ],
		[ 'Madhya Pradesh', 30, 'cotton', '30% area is cultivalted with cotton' ],
		[ 'Madhya Pradesh', 5, 'Tea', '5% area is cultivalted with tea' ] ];

var pieData = [ [ 'functionalGroup', 'count', 'ttip' ],
		[ 'AOS', 20, 'My tooltip AOS: 20' ],
		[ 'GBI', 30, 'My tooltip GBI: 30' ],
		[ 'Retail', 40, 'My tooltip Retail: 40' ],
		[ 'Marketing', 50, 'My tooltip Marketing: 50' ],
		[ 'Customer systems', 10, 'My tooltip Customer systems: 10' ],
		[ 'Corporate systems', 22, 'My tooltip Corporate: 22' ],
		[ 'IT gov', 50, 'My tooltip IT gov: 50' ] ];

var bulletData = [
		[ 'label', 'planned', 'adjusted', 'invoice', 'committed', 'ttip' ],
		[ 'AOS', 100, 120, 80, 60, 'My tooltip AOS: 20' ],
		[ 'GBI', 100, 120, 80, 70, 'My tooltip GBI: 30' ],
		[ 'Retail', 100, 120, 80, 90, 'My tooltip Retail: 40' ],
		[ 'Marketing', 100, 120, 80, 50, 'My tooltip Marketing: 50' ],
		[ 'Customer systems', 100, 120, 80, 30,
				'My tooltip Customer systems: 10' ],
		[ 'Corporate systems', 100, 120, 80, 80, 'My tooltip Corporate: 22' ],
		[ 'IT gov', 100, 120, 80, 70, 'My tooltip IT gov: 50' ] ];

var sunBurstData = [ [ 'source', 'level1', 'level2', 'distribution', 'ttip' ],
		[ 'INDIA', 'Karnataka', 'Bangalore', 100, 'garden city' ],
		[ 'INDIA', 'Karnataka', 'Mysore', 80, 'flower city' ],
		[ 'INDIA', 'Karnataka', 'Tumkur', 60, 'coconut city' ],
		[ 'INDIA', 'Andra pradesh', 'chitoor', 25, 'city1' ],
		[ 'INDIA', 'Andra pradesh', 'vellore', 65, 'city2' ],
		[ 'INDIA', 'Andra pradesh', 'anantapur', 90, 'city3' ],
		[ 'INDIA', 'Kerala', 'kochi', 50, 'city4' ],
		[ 'INDIA', 'Kerala', 'palakkad', 80, 'city5' ],
		[ 'INDIA', 'Kerala', 'thiruvananthpuram', 90, 'city6' ] ];

var sankeyData = [ [ 'source', 'target', 'count', 'ttip' ],
		[ 'Karnataka', 'Bangalore', 100, 'garden city' ],
		[ 'Karnataka', 'Mysore', 80, 'flower city' ],
		[ 'Karnataka', 'Tumkur', 60, 'coconut city' ],
		[ 'Andra pradesh', 'chitoor', 25, '' ],
		[ 'Andra pradesh', 'vellore', 65, '' ],
		[ 'Andra pradesh', 'anantapur', 90, '' ],
		[ 'Kerala', 'kochi', 50, '' ], [ 'Kerala', 'palakkad', 80, '' ],
		[ 'Kerala', 'thiruvananthpuram', 90, '' ] ];

var panels = [ 'barChart1', 'barChart2', 'lineChart1', 'lineChart2',
		'pieChart', 'stackedBarChart', 'horizontalbarChart',
		'horizontalstacked', 'bulletChart', 'sunBurstChart', 'sankeyChart' ];

function hideAndShowPanel(panelIdx) {
	for ( var i = 0; i < panels.length; i++) {
		var panel = document.getElementById(panels[i]);
		panel.style.display = i == panelIdx ? 'block' : 'none';
	}

	// todo: legends needs to be cleared
	if (panelIdx != 1) {
		var legendDiv = document.getElementById('myLegendDiv');
		if (!legendDiv)
			return;
		legendDiv.innerHTML = '';
	}

}

function drawChart() {
	var selectedVal = parseInt(P2.getFieldValue('chartTypes'));
	var dc = new PM.DataCollection();

	hideAndShowPanel(selectedVal - 1);

	switch (selectedVal) {
	case 1:
		dc.addGrid('chart.barChart1', stateAndDistricts);
		break;

	case 2:
		dc.addGrid('chart.barChart2', stateCrops);
		break;

	case 3:
		dc.addGrid('chart.lineChart1', stateAndDistricts);
		break;

	case 4:
		dc.addGrid('chart.lineChart2', stateCrops);
		break;

	case 5:
		dc.addGrid('chart.pieData', pieData);
		break;

	case 6:
		dc.addGrid('chart.stackedBarChart', stateCrops);
		break;

	case 7:
		dc.addGrid('chart.horizontalbarChart', stateCrops);
		break;

	case 8:
		dc.addGrid('chart.horizontalstacked', stateCrops);
		break;

	case 9:
		dc.addGrid('chart.bulletChart', bulletData);
		break;

	case 10:
		dc.addGrid('chart.sunBurstChart', sunBurstData);
		break;

	case 11:
		dc.addGrid('chart.sankeyChart', sankeyData);
		break;

	case 12:
		dc.addGrid('chart.speedometerChart', pieData);
		break;

	default:
		P2.act(null, null, 'hideAll');
	}

	P2.refreshPage(dc);
}

function formatLegend(label) {
	// format legend label; if required.
	return label;
}

function drillDownDistrict(id) {
	alert('you have clicked on bar id: ' + id);
}

function drillDownCrop(id) {
	alert('you have clicked on bar id: ' + id);
}

function mouseMoveonCrops(id) {
	PM.debug('mouse move on bar ' + id);
}

function mouseMoveOnDistricts(id) {
	PM.debug('mouse move on bar ' + id);
}

function xlabelformatter(label) {
	PM.debug('x axis label' + label);
	return label;
}

function ylabelformatter(label) {
	PM.debug('y axis label' + label + '#');
	return label.toString();
}

function clickFunction(rowId) {
	alert('clickFunction called with rowid = ' + rowId);
	PM.debug('type ' + typeof rowId);
}

function moveFunction(rowId) {
	PM.debug('moveFunction called with rowid = ' + rowId);

}
