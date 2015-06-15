// data for grid panel
var junkData1 = [
    ['fileName', 'dateField']
    , ['a', '2014-07-01']
    , ['c', '2013-06-08']
];

var onderadu = [['value', 'label'],['a', 'Ondu'],['b', 'eradu'],['c', 'mooru']];

var junkData2 = [
                ['folderName', 'id']
                , ['file2', 'id2']
            ];

var loadData = function(){
	var dc = new PM.DataCollection();
	//dc.addGrid('listService', onderadu);
	//P2.refreshPage(dc);
	dc.addGrid('tbl1', junkData1);
	dc.addGrid('tbl2', junkData2);
	dc.addValue('fileName', 'file nemu');
	dc.addValue('folderName', 'kadatha');
	P2.tables['tbl1'].description = 'discripshannu';
	//alert(P2.tables['tbl2'].description);
	P2.refreshPage(dc);
	 dc = new PM.DataCollection();
	dc.addGrid('listService', onderadu);
	P2.refreshPage(dc);
	//P2.refreshPage(dc);
};