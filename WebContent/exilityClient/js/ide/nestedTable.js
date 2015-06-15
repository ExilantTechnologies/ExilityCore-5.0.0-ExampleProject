function myFormatter(label, val)
{
    return label + ' - ' + val;
}

function foo()
{
    setTimeout('faa()', 1000);
}

var parentData = [['parentKey', 'parentData']
    , ['1', 'a']
    , ['2', 'b']
    , ['3', 'c']
    ];

var childData = [['childKey', 'parentKey', 'childData']
    , ['1', '1', 'a']
    , ['2', '1', 'aa']
    , ['3', '1', 'aaa']
    , ['4', '2', 'b']
    , ['5', '2', 'bb']
    , ['6', '2', 'bbb']
    , ['7', '2', 'bbbb']
    , ['8', '2', 'bbbbb']
    , ['9', '3', 'c']
    , ['10', '3', 'cc']
    , ['11', '3', 'ccc']
    , ['12', '3', 'cccc']
    , ['13', '3', 'ccccc']
    , ['14', '3', 'cccccc']
    , ['15', '3', 'ccccccc']
    ];

//simulating server call to get data for chart
function faa()
{
    var dc = new PM.DataCollection();
    dc.addGrid('parentTable', parentData);
    dc.addGrid('nestedTable', childData);
    P2.refreshPage(dc);
}

