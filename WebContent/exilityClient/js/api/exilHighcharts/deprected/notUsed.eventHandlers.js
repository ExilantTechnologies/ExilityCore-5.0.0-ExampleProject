 /*
  * File: eventHandlers2.js
  * Description:
  * This file contains all event handler functions specific to a
  * particular page. It's loaded into all pages unlike other .js
  * files which are loaded only in the parent frame window.
  */

/************** deprecated.... NOT USED ANY MORE ****************************************/
function fieldChangedHandler(obj, P2)
{
    var objMeta = P2.actions[obj.id];
	if (!objMeta) objMeta = P2.getElement(obj.id);
	
	if (!objMeta) return;

	if (objMeta.fieldChanged) objMeta.fieldChanged(window, obj);	
	if (objMeta.inTable)
	{
		objTable = P2.getElement(objMeta.tableName);
		if (objTable && objTable.fieldChanged) objTable.fieldChanged(window, obj);
	}
}

function handleError(error)
{
	var msg = systemMessages.getMessage(error.win,error.messageId);
	if(!msg)alert(error.messageId);
	else
	alert(msg);
	
}

function showErrorTimed() // win, ele, err, fromEle are required, but these are passd through a saved global object
{
	debug("showErrorTimed()");
	// paramaters for this functions are saved in a global object. extract them first
	var error = P2.savedError;
	if (!error)
	{ 
		alert('Problem with error message handling'); 
		return;
	}
	P2.savedError = null;
	showErrorAfterTimed(window, error);
}

function fieldBlurredHandler(ele, P2)
{

	//onblur is a temporary requirement to reset background color. So remove the handler right away
	ele.onblur = null;

	if (!ele.id) return; // event from an unknown field
	var objMeta = P2.actions[obj.id];
	if (!objMeta) objMeta = P2.getElement(obj.id);
	     
	if (!objMeta) return;
	
	ele.style.backgroundColor = objMeta.savedColor;
}

function fieldDblClickedHandler(obj, P2)
{
	if (!obj.id) return; // event from an unknown field
    var objMeta = P2.actions[obj.id];
	if (!objMeta) objMeta = P2.getElement(obj.id);
	
	if (!objMeta) return;

	if (objMeta.inTable)
	{
		objTable = P2.getElement(objMeta.tableName);
		if (objTable && objTable.mouseOver) objTable.rowDblClicked(window, obj, objMeta.rowNum);
	}
}
function fieldClickedHandler(obj, P2)
{
    var objMeta = P2.actions[obj.id];
	if (!objMeta) objMeta = P2.getElement(obj.id);
	if (!objMeta) return;
	try
	{
		if (objMeta.fieldClicked) objMeta.fieldClicked(window, obj);
	}
	catch(e)
	{
		handleError(e);
	}	
}

function mouseOverHandler(obj, P2)
{
	if (!obj.id) return; // event from an unknown field
	var objMeta = P2.getElement(obj.id);
	if (!objMeta) return;
	if (objMeta.tableName)
	{
		objTable = P2.getElement(objMeta.tableName);
		if (objTable && objTable.mouseOver) objTable.mouseOver(window, obj, objMeta.rowNum);
	}
}	

function mouseOutHandler(obj, P2)
{
	if (!obj.id) return; // event from an unknown field
	var objMeta = P2.getElement(obj.id);
	if (!objMeta) return;	
	if (objMeta.tableName)
	{
		//alert(objMeta.tableName);
		objTable = P2.getElement(objMeta.tableName);
		if (objTable && objTable.mouseOut) objTable.mouseOut(window, obj, objMeta.rowNum);
	}
}

function tabPressedHandler(obj, P2)
{
	var objMeta = P2.getElement(obj.id);
	if (!objMeta) return;
	if (objMeta.inTable && objMeta.isLastField)
	{
		var row = getRowInTable(obj);
		if (row && row.nextSibling == null)
		{
			objTable = P2.getElement(objMeta.tableName);
			if (objTable.addRow) objTable.addRow(window);
		}
	}
}

////////////////// Filter Field //////////////
// drop-down for a filter field operator changed. Hide/display value fields
function filterOperatorChanged(e)
{
	if (!e) e = window.event; 
	var obj = e.srcElement;
	if(!obj) obj = e.target;
	//var win = obj.ownerDocument.window;
	
	//alert("fieldClicked src="+obj+" src.id="+obj.id);
	if (!obj.id) return; // event from an unknown field
	
	var val = obj.options[obj.selectedIndex].value;
	// id of the drop-down is <fieldName>Operator. get the field name by substringing	
	var fieldName = new String(obj.id);
	fieldName = fieldName.substr(0,fieldName.length-8);
	var fld1 = document.getElementById(fieldName);
	var div2 = document.getElementById(fieldName+'ToDiv');
	var fld2 = document.getElementById(fieldName+'To');
	
	if (div2)
	{
		// Second field is visible only if val==6 i.e. operator = BETWEEN
		if (val == 6){
			div2.style.display = 'inline';
		}
		else
		{
			div2.style.display = 'none';
			fld2.value = '';
		}
	}
	//and, first value is to be displayed except when the operator is 'any'
	if (val == 0)
	{
		fld1.style.display = 'none';
		fld1.value = '';
	}
	else
	{
		fld1.style.display = 'inline';
		fld1.focus();
	}
}

// onclick event handler for button, used to display/hide log messages.
function messageButtonClicked(e)
{
	if (!e) e = window.event; 
	var obj = e.srcElement;
	if(!obj) obj = e.target;

	if (!obj.id) return;

	var msgDiv = document.getElementById(obj.id + 'Div');
	
	if (obj.value == 'show Logs') // currently hidden, we have to show
	{
		msgDiv.style.display = '';
		msgDiv.innerHTML = '<span id="' + obj.id + 'Span' + '">' + PM.exilMessages.join("<br/>") + '</span>';
		obj.value = 'hide Logs';
	}
	else
	{
		msgDiv.style.display = 'none';	
		obj.value = 'show Logs';
	}
}

function httpCallback()
{
	//try
	//{
		for (var i=0; i<window.serverStub.SQ.length; i++)
		{
			var se = window.serverStub.SQ[i];
			if (se && se.httpObject.readyState == 4)
			// additional check should be done for se.httpObject.status==200 for actual server case
			{
			    debug('Got response from the Server');
			    //alert(se.httpObject.responseText);
				window.serverStub.removeFromServiceQueue(window, i);
			}
		}
	//}
	//catch(e)
	//{
	//	handleError(e);
	//}
}

// timeoutCallback() is triggered when no response is received from the server.
function timeoutCallback(index)
{
	var se = window.serverStub.SQ[index];
	if (!se)
	{
		alert("timeoutCallback(), unknown response: index="+index);
		return;
	}

	// TBD: add messages to indicate that its a timeout error
	var dc = {'success':false, 'messages':[]};
	var obj = se.callBackObject;
	var callBackFunction = se.callBackFunction;
	serverStub.SQ.splice(index,1);
	//debug("after splice i="+index+" http.length="+serverStub.SQ.length);
	try
	{											
		callBackFunction(window, dc, obj); // mostly refreshPage()
	}
	catch(e)
	{
		handleError(e);
	}
}

////////////////////////////////// comboBox scripts BEGIN
function vanishFlash(eleId)
{
	var ele = document.getElementById(eleId);
	debug("vanishFlash() eleId="+eleId);	
	ele.style.display = 'none';
}

function comboHilightRow()
{
	if ((!this.inputObj.combo.currentRowObj) || (this.id != this.inputObj.combo.currentRowObj.id))
	{
		this.style.backgroundColor = this.inputObj.combo.bgcolorHilighted;
		this.style.color = this.inputObj.combo.fontColorHilighted;
	}
}

function comboRestoreRow()
{
	if ((!this.inputObj.combo.currentRowObj) || (this.id != this.inputObj.combo.currentRowObj.id))
	{
		this.style.backgroundColor = this.inputObj.combo.bgcolor;
		this.style.color = this.inputObj.combo.fontColor;
	}
}

function comboSelectRow()
{
	if (this.inputObj.combo.currentRowObj)
	{
		this.inputObj.combo.currentRowObj.style.backgroundColor = this.inputObj.combo.bgcolor;
		this.inputObj.combo.currentRowObj.style.color = this.inputObj.combo.fontColor;
	}
	this.style.backgroundColor = this.inputObj.combo.bgcolorSelected;
	this.style.color = this.inputObj.combo.fontColorHilighted;
	this.inputObj.combo.currentRowObj = this;
	cell = this.childNodes[0]; 	
	this.inputObj.value = cell.innerHTML;
}

function comboSelectOnBlurTimer(e)
{
	if (!e)
		e = window.event;
	var ele = (e.srcElement)? e.srcElement : e.target;
	var eleId = ele.id;
	setTimeout("comboSelectOnBlur(\""+eleId+"\")", COMBO_SELECT_TIMEOUT);
}	
			
function comboSelectOnBlur(eleId)
{
	var inputObj = document.getElementById(eleId);
	if (inputObj.combo.divObj)
		comboSelectRowOnBlur(window, inputObj);
}	

function comboArrowKeyHandler(e)
{
	if (!e)
		e = window.event;
	
	var keycode = (e.keyCode) ? e.keyCode : e.which;
	var ele = (e.srcElement)? e.srcElement : e.target;	
	//alert("comboArrowKeyHandler: keycode:"+keycode);
	if (keycode == DOWN_ARROW)
	{
		if (ele.combo.currentRow < 0)
		{
			// id='row0' for two comboBox won't conflict as only one comboBox list would be active at any point of time
			var firstRow = document.getElementById('row0');
			if (firstRow)
			{	
				ele.combo.currentRowObj = firstRow;
				ele.combo.currentRowObj.style.backgroundColor = ele.combo.bgcolorSelected;
				ele.combo.currentRowObj.style.color = ele.combo.fontColorHilighted;
				cell = ele.combo.currentRowObj.childNodes[0];
				ele.value = cell.innerHTML;
				ele.combo.currentRow = 0;
			}
		}
		else
		{
			var numRows = ele.combo.divObj.firstChild.numRows;
			if (ele.combo.currentRow < (numRows-1))
			{
				var rowNo = ele.combo.currentRowObj.id;
				var tmp = rowNo.slice(3);
				tmp = tmp - 0;
				tmp++;
				var nextRow = 'row' + tmp;
				ele.combo.currentRowObj.style.backgroundColor = ele.combo.bgcolor;
				ele.combo.currentRowObj.style.color = ele.combo.fontColor;
				ele.combo.currentRowObj = document.getElementById(nextRow);
				ele.combo.currentRowObj.style.backgroundColor = ele.combo.bgcolorSelected; 
				ele.combo.currentRowObj.style.color = ele.combo.fontColorHilighted;
				cell = ele.combo.currentRowObj.childNodes[0];
				ele.value = cell.innerHTML;
				ele.combo.currentRow++;
			}
		}
	}
	else if (keycode == UP_ARROW)
	{
		if (ele.combo.currentRow >= 0)
		{
			if (ele.combo.currentRowObj.id == 'row0')
			{
				ele.value = ele.combo.inputString;
			}
			else // hilight prev row
			{
				var rowNo = ele.combo.currentRowObj.id;
				var tmp = rowNo.slice(3);
				tmp = tmp - 0;
				tmp--;
				var prevRow = 'row' + tmp;
				ele.combo.currentRowObj.style.backgroundColor = ele.combo.bgcolor;
				ele.combo.currentRowObj.style.color = ele.combo.fontColor;
				ele.combo.currentRowObj = document.getElementById(prevRow);
				ele.combo.currentRowObj.style.backgroundColor = ele.combo.bgcolorSelected; 
				ele.combo.currentRowObj.style.color = ele.combo.fontColorHilighted;	
				cell = ele.combo.currentRowObj.childNodes[0];
				ele.value = cell.innerHTML;
			}
			ele.combo.currentRow--;
		}
	}	
	else if (keycode == BACKSPACE)
	{
		ele.combo.inputString = ele.value.slice(0, -1);
		if (ele.combo.inputString.length == 0)
		{
			destroyComboList(window, ele);
			return true;
		}
		var objMeta = P2.getElement(ele.id);
		// don't trigger the descService untill the keyValue size is less than minCharToTriggerService
		if (ele.combo.inputString.length < objMeta.minCharToTriggerService)
			return true;		
		var outString = comboGetMatchedGrid(window, ele);
		if (!outString)
		{
			flashHandler(ele, "No Match Found!");
			// cancels the default post event action 
			if(e.preventDefault)
				e.preventDefault();
			else 
				e.returnValue = false;
			return false;			
		}
		else
		{
			drawComboList(window, ele, outString);
		}
	}
	
	return true;
}

// comboCharKeyHandler() is the onkeypress event handler for comboBox <input>.
// It handles only alphaNumeric chars entered.
// accumulates the chars entered and matches with the database, draws the drop down
// list dynamically for every key pressed.
function comboCharKeyHandler(e)
{
	if (!e)
		e = window.event;
	
	var keycode = (e.keyCode) ? e.keyCode : e.which;
	var keychar = String.fromCharCode(keycode);
	var ele = (e.srcElement)? e.srcElement : e.target;
	//alert("comboCharKeyHandler: keycode:"+keycode+" keychar:"+keychar);

	var pattern = new RegExp("\\w", "i"); // match only alphaNumeric keys i.e. [0-9a-zA-Z_]
	if (!(keychar.match(pattern)))
	{
		// safari workaround: up/down arrow key press event fired twice
		if ((keycode == SAFARI_UP_ARROW) ||
		    (keycode == SAFARI_DOWN_ARROW))
		{
			return false;
		}
		else
		{
			return true; // do not handle non-alphaNumeric char here
		}
	}

	ele.combo.inputString = ele.value + keychar;
	
	var objMeta = P2.getElement(ele.id);
	// don't trigger the descService untill the keyValue size is less than minCharToTriggerService
	if (ele.combo.inputString.length < objMeta.minCharToTriggerService)
		return true;
	var outString = comboGetMatchedGrid(window, ele);
	if (!outString)
	{
		flashHandler(ele, "No Match Found!");
		// cancels the default post event action 
		if(e.preventDefault)
			e.preventDefault();
		else 
			e.returnValue = false;

		return false;			
	}
	else
	{
		drawComboList(window, ele, outString);
		return true;
	}
}

////////////////////////////////// comboBox scripts END
