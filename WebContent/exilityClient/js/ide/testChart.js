function myLabelFormatter(label, val)
{
    return label + ' - ' + val;
}

function foo()
{
    setTimeout('faa()', 100);
}

var pieData = [['x', 'y', 'h']
    , ['1', 'a', 'help for a']
    , ['2', 'b', 'this is help b']
    , ['3', 'c', 'what do you want to c?']
    , ['4', 'd', 'ddddd']
    ];

var sunData = [['x', 'l1', 'l2', 'c', 'h', 'g']
    , ['15', 'abcdefghijklmnopqrstuvw', 'az', 'core', 'h1', 'ga']
    , ['14', 'abcdefghijklmnopqrstuvw', 'aa xczxczx zxzcz', 'core', 'h2', 'ga']
    , ['13', 'abcdefghijklmnopqrstuvw', 'aaa czxczxc cx', 'core', 'h3', 'ga']
    , ['12', 'bbb', 'bzx zxczxc', 'core', 'h4', 'gb']
    , ['11', 'bbb', 'bb sdasdas asdasda sdasdasdasd asasdas asdasdas ', 'core', 'h5', 'gb']
    , ['10', 'bbb', 'bbb sdasdasda asdasdasda asdasdasdas asdasdas ', 'core', 'h6', 'gb']
    , ['9', 'bbb', 'bbbb sdasdasdas asdasdas ', 'core', 'h7', 'gb']
    , ['8', 'bbb', 'bbbbb xczxczx', 'core', 'h8', 'gb']
    , ['7', 'CAAA', 'c sdasdasd asdasdasda asdasdas ', 'core', 'h9', 'gc']
    , [6, 'CAAA', 'cccccccccccccccccccccccccc', 'core', 'h10', 'gc']
    , [5, 'CAAA', 'ccc klkjl kjkl jlkjh k j hlkhlkmvmvnbvmnbvmn', 'core', 'h11', 'gc']
    , [4, 'CAAA', 'cccc kjh lkjh kjhl kjhlkj hlkjh lkjh lkj', 'core', 'h12', 'gc']
    , [3, 'CAAA', 'ccccc lkjh lkljhlkjhlkjhll kjhlk lhkjh lkjh', 'core', 'h13', 'gc']
    , [2, 'd4d4d', 'cccccclk h lkjhlkkjhk lkjhlkjhljklkjlkjhlkjh', 'core', 'h14', 'gc']
    , [1, 'd4d4d', 'ccccccc h gkhgkjygkjh gkjhgkjh gkjhgkjh gkjhgkjhgljh go', 'core', 'h15', 'gc']
    ];

var sanData = [['from', 'to', 'value']
    ,['a1', 'b1', '10']
    , ['a2', 'b2', 20]
    , ['a3', 'b3', '30']
    , ['a1', 'b3', 40]
    , ['a2', 'b1', '50']
    , ['a1', 'b4', 60]
    , ['a1', 'b5', 60]
    , ['a1', 'b6', 60]
    , ['a1', 'b7', 60]
    , ['a1', 'b8', 60]
    ];
var lineData = [['h', 'g', 'x', 'y']
    , ['help a1 b1', 'a1', 'b1', '10']
    , ['help a1 b2', 'a1', 'b2', 20]
    , ['help a1 b3', 'a1', 'b3', '30']
    , ['help a2 b4', 'a1', 'b4', 40]
    , ['help a2 b1', 'a2', 'b1', '20']
    , ['help a2 b2', 'a2', 'b2', 30]
    , ['help a2 b3', 'a2', 'b3', 40]
    , ['help a2 b4', 'a2', 'b4', 50]
    , ['help a3 b1', 'a3', 'b1', 60]
    , ['help a3 b2', 'a3', 'b2', 50]
    , ['help a3 b3', 'a3', 'b3', 40]
    , ['help a3 b4', 'a3', 'b4', 10]
    ];
//simulating server call to get data for chart
function faa()
{
    var pie = P2.getField('pie');
    pie.onMoveFunctionName = 'pieMoved';
    pie.onClickFunctionName = 'pieClicked';
    var dc = new PM.DataCollection();
    dc.addGrid('pieData', pieData);
    dc.addGrid('sunData', sunData);
    dc.addGrid('sanData', sanData);
    dc.addGrid('lineData', lineData);
    P2.refreshPage(dc);
}


function pieMoved(idx)
{
    PM.debug('pie moved to ' + idx);
}

function pieClicked(idx)
{
    alert('You clicked on row idx with data ' + pieData[idx]); 
}

