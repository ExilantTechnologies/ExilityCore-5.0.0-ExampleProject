//constants used
var ALL_TABLES = [['name'],['table1'],['ಮಂಚ'],['मेज'],['और एक मेज'],['ಮತ್ತೊಂದು ಮಂಚ'],['ಇನ್ನೊಂದು ಮಂಚ'],['Another table']];
var ALL_COLUMNS = [['columnName', 'sqlDataType', 'size', 'precision', 'scale', 'isNullable', 'defaultValue']
                   ,['col-1', 'integer', 12, 3, 2, 1, '12']
				   ,['col-2', 'text', 21, 0, 0, 0, 'Some Text Value']
                   ];
var ALL_TABLES_NAME = 'tables';
var ALL_COLUMNS_NAME = 'columns';
/**
 * dummy function to test/start instead of service getALlTables
 */
var getAllTables = function(){
	var dc = new PM.DataCollection();
	dc.addGrid(ALL_TABLES_NAME, ALL_TABLES);
	P2.refreshPage(dc);
	
};

var getTableDetails = function(){
	var dc = new PM.DataCollection();
	dc.addGrid(ALL_COLUMNS_NAME, ALL_COLUMNS);
	P2.refreshPage(dc);
};