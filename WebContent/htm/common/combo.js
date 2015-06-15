// JScript File
var exilCombo, exilComboWin, exilComboTimer, exilCurrentInput;
function comboInit(maxRows)
{
    exilCombo = document.getElementById('exilComboFrame');
    exilComboWin = window.frames['exilComboFrame'];
    if (maxRows) exilComboWin.comboMaxRows = maxRows;
}

function findXY(obj)
{
//debug('got object ' + obj + ' with id=' + obj.id + ' with its offset parent=' + obj.offsetParent);
	var y = 0;
	var x = 0;
	if(obj.offsetParent)
	{
		while(1)
		{
		  x += obj.offsetLeft;
		  y += obj.offsetTop;
		  if(!obj.offsetParent)
			break;
		  obj = obj.offsetParent;
		}
	}
	var a = new Object();
	a.x = x;
	a.y = y;
	return a;
}

function comboStart(obj, data)
{
    exilCurrentInput = obj;
    exilComboWin.maxLength = obj.size;
    var a = findXY(obj);
    var top = a.y + obj.clientHeight;
    
    var left = a.x;
    var width = obj.clientWidth;
    exilCombo.style.width  = width + 'px';
    exilCombo.style.top = top + 'px';
    exilCombo.style.left = left + 'px';
    exilCombo.style.display = ''; 
    exilComboWin.changeComboRows(obj, data);
}

function comboEnd()
{
    exilCurrentInput = null;
    exilCombo.style.display = 'none'; 
}
var UP_ARROW = 38;
var DOWN_ARROW = 40;

function comboKeyDowned(obj, e)
{
    var key = e ? e.which : event.keyCode;
    if(key != UP_ARROW && key != DOWN_ARROW) return; //we will handle others on key up
    //has the combo started ?
    if(!exilCurrentInpu)
        comboStart(obj)
    
}