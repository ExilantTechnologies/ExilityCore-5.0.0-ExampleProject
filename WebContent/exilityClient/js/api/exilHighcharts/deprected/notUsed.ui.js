 /*
  * File: ui2.js
  * Description:
  * This file contains all UI related functions and all event handler
  * functions used by exility.
  */


// display/hide tab panels
// conventions
// 1. a tab is always visible. It must be set properly in the beginning
// 2. a javascript global variable with the name '<parent element id>ExilVisibleTab'
//    is used to keep track of the visible panel. This variable has the element id of the
//    current visible panel. In an html page, corresponding to each tabPanel, there is
//    one such variable present.
// 3. id of the tab label is <tabName>Tab, where <tabName> is the displaypanel id.
//    And <tabName> is again <parent element id>_<a name>. So from <tabName>, parent element id
//    can be retrieved.
// 4. class for label when visible is tablabelvisible and it is tablabelhidden otherwise
function tabClicked(win, ele)
{
	debug("tabClicked() ele.id="+ele.id);
	var tabParentName = ele.id.split("_")[0];
	var tabParent = win.document.getElementById(tabParentName);
	var visibleTabVariable = tabParentName + "ExilVisibleTab";
	var visibleTab = eval(visibleTabVariable);
	debug("tabClicked() visibleTabVariable="+visibleTabVariable+" and its value="+visibleTab);	
	//debug("tabClicked() visibleTab="+visibleTab);
	var tab = ele.id;
	tab = tab.substr(0, (tab.length-3)); //chop off last three charatcters 'Tab' from that
	
	if(visibleTab == tab) return true;  // it is already visible
	
	// hide the one that is visible now
	var otherEle = win.document.getElementById(visibleTab);
	otherEle.style.display = 'none';
	
	// by the way, the corresponding tab label should change its style
	// its id is same as the real tab + 'Tab'
	otherEle = win.document.getElementById(visibleTab+'Tab');
	//this tab flap is passive now
	otherEle.className ='passivetablabel';
	
	// and show the current tab 
	//tabParent.setAttribute('exilVisibleTab', tab);
	eval(visibleTabVariable + " = tab;");
	tab = win.document.getElementById(tab);
	tab.style.display = '';
	//and change the look and feel of this label
	ele.className = 'activetablabel';
	
	return true;
}

// Twisties are used to hide a section of the page. On click, the area would expand/collapse
// the element on which the user clicks carries the name of the area to be expanded/collapsed 
// Specific assumption is made about the structure of the html.
// fieldset contians legend. Legend is enclosed in an A element, on click of which, this event is triggered
// a twisty image normally precedes the legend text. This image has to be changed on click
// The fieldset element contains a div element that can be hidden/displayed to provide a collapse/expand effect
// id of this div is stored as an attribute of the legend. Refer to AbstractPanel.java for the exact syntax
function twist(win, ele)
{
	debug("twist() ele.id="+ele.id);
	var divName = ele.id;
	
	divName = divName.substr(0,(divName.length-7)); //chop off 'Twister" from the name
	//panel may have a containing table, Try that first
	var div = win.document.getElementById(divName+'Table');
	if(!div) 
		div = win.document.getElementById(divName);
	// is there an image before this element that represents expanded/collpapsed??
	var imgEle = ele.firstChild;
	if(imgEle && !imgEle.src) imgEle = imgEle.nextSibling; // sometimes, a #text will slip in between
	
	//field set element as an id = divName+'FieldSet'
	if (div.style.display == 'none')
	{
		// it is hidden now. Display that
		div.style.display = '';
		if(imgEle)imgEle.src = exilPars.htmlToImageFolder +  'expanded.gif';
		return;
	}
	div.style.display = 'none';
	if(imgEle)imgEle.src = exilPars.htmlToImageFolder + 'collapsed.gif';
	return;
}

// Check if any of the enclosing panel of a control is hidden, and make it visible
function makePanelVisible(win, ele)
{
	var div = ele.parentNode;
	var hiddenDiv = null;
	var tag, ele, nam;
	while (true)
	{
		tag = div.tagName.toUpperCase();
		if (tag == 'BODY') return true;
		
		// If it is not a hidden div, let us move up..
		if (tag != 'DIV' || div.style.display != 'none')
		{
			div = div.parentNode;
			continue;
		}
		//OK. It is a hidden div.
		// Is it part of a tab panel??
		ele = win.document.getElementById(div.id+'Tab');
		if (ele)
		{
			tabClicked(ele);
		}
		else	
		{
			// is it linked to a twistie? in a collapsible fieldset?
			ele = win.document.getElementById(div.id+'Twister');
			if (ele)
			{
				twist(ele);
			}
			// those are the only two things we know of. What else can we do? Just make it visible
			else div.style.visible = '';
		}
		//Look up and see if the parent is visible..
		div = div.parentNode;
	}
	return true;
}
/*
function fieldChanged(e)
{
	if (!e) e = window.event; // revisit
	var obj = e.srcElement;
	if(!obj) obj = e.target;
	debug("window.fieldChanged() obj.id="+obj.id);
	try
	{		
		var objMeta = P2.getElement(obj.id);
		if (!objMeta) return;
	
		if (objMeta.fieldChanged) objMeta.fieldChanged(obj);	
	}
	catch(e)
	{
		handleError(e);
	}	
}

function handleError(error)
{
	debug("handleError() error.messageId="+error.messageId);
	P2.savedError = error;
	setTimeout('showErrorTimed();', 200);
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
	showErrorAfterTimed(error);
}
*/
//showErrorAfterTimed() : common routine to show error message for an invalid field.
// Programmers, if doing a vlidation of their own, should still call this function for consistency in visual aspects	
// If you want to flash the error differently, this is the only place you wave to tinker with..
function showErrorAfterTimed(win, error) 
{
	if (error.obj)
	{
		// paramaters for this functions are saved in a global bobject. extract them first
		var ele = win.document.getElementById(error.obj.name);
		debug("showErrorAfterTimed() error.obj.name="+error.obj.name);
		//var err = a.err;
		//var fromEle = a.fromEle;
		
		error.obj.savedColor = ele.style.backgroundColor; // save so that we can set it back after flashing it in red..
		ele.style.backgroundColor = win.exilParms.invalidBackgroundColor;
		//if (fromEle) fromEle.style.backgroundColor = exilParms.invalidBackgroundColor;
		//a custom error message can be assigned by programmer with exilErrorMessage tag
		//alert (fromEle.id + " is the id of the from element");
		//makePanelVisible(win, ele); need to modify makePanelVisible() for new tabPanel.
		if (ele.focus) ele.focus();
		if (ele.select) ele.select();
		ele.onblur = win.fieldBlurred;
	}
	//var fieldName = ele.getAttribute('exilFieldName');
	//if (fieldName) err = fieldName +' : ' + err;
	var src = win.exilParms.errorMessageHtmlSrc;
	var msg = getMessage(error.win,error.messageId,error.msgParams);
	msg = (msg) ? msg : error.messageId;
	var re = / /g;
	msg = msg.replace(re, "+");
	src += '?message=' + msg;
	src += '&severity='+error.severity;
	
	// option 1
	// set the target for the code picker to assign value to.
	src += '&windowMode=popup';
	var newWin = openModal(win, src, 'errorMessage', "directories=no, location=no, menubar=no, resizable=yes, scrollbars=yes, status=no, titlebar=no, toolbar=no, left=200, top=100, height=150, width=500");
	
	// option 2
	//openDiv(win, msg, error.severity, 200, 100, 150, 500);
	
	// option 3
	//src += '&windowMode=iframe';
	//openIframe(win, src, 200, 100, 150, 500);
		
	//background colors are not restored immediately, but after the user goes out of that field
	//store these fields in the designated names in the window for the event handler 
	//win.fieldInError = ele;
	//win.field2InError = fromEle;
	//attach the event handler
	//ele.onblur = fieldBlurred;
}
/*
function fieldBlurred(e)
{
	if (!e) e = window.event; 
	var ele = e.srcElement;
	if(!ele) ele = e.target;

	//onblur is a temporary requirement to reset background color. So remove the handler right away
	ele.onblur = null;

	if (!ele.id) return; // event from an unknown field
	var objMeta = P2.getElement(ele.id);
	if (!objMeta) return;
	
	ele.style.backgroundColor = objMeta.savedColor;
}

function fieldClicked(e)
{
	if (!e) e = window.event; 
	var obj = e.srcElement;
	if(!obj) obj = e.target;
	//var win = obj.ownerDocument.window;
	debug("window.fieldClicked() obj.id="+obj.id);
	//alert("fieldClicked src="+obj+" src.id="+obj.id);
	if (!obj.id) return; // event from an unknown field
	var objMeta = P2.getElement(obj.id);
	if (!objMeta) return;
	try
	{
		if (objMeta.fieldClicked) objMeta.fieldClicked(obj);
	}
	catch(e)
	{
		handleError(e);
	}	
}

function mouseOver(e)
{
	if (!e) e = window.event; 
	var obj = e.srcElement;
	if(!obj) obj = e.target;
	
	if (!obj.id) return; // event from an unknown field
	var objMeta = P2.getElement(obj.id);
	if (!objMeta) return;
	
	try
	{
		if (objMeta.inTable)
		{
			//alert("mouseOver src="+obj+" src.id="+obj.id+" objMeta.name="+objMeta.name+" tableName="+objMeta.tableName);
			objTable = P2.getElement(objMeta.tableName);
			if (objTable && objTable.mouseOver) objTable.mouseOver(obj, objMeta.rowNum);
		}
	}
	catch(e)
	{
		handleError(e);
	}	
}	

function mouseOut(e)
{
	if (!e) e = window.event; 
	var obj = e.srcElement;
	if(!obj) obj = e.target;
	
	//alert("fieldClicked src="+obj+" src.id="+obj.id);
	if (!obj.id) return; // event from an unknown field
	var objMeta = P2.getElement(obj.id);
	if (!objMeta) return;	
	try
	{
		if (objMeta.inTable)
		{
			objTable = P2.getElement(objMeta.tableName);
			if (objTable && objTable.mouseOut) objTable.mouseOut(obj, objMeta.rowNum);
		}
	}
	catch(e)
	{
		handleError(e);
	}		
}

function keyPressed(e)
{
	if (!e) e = window.event; 
	var obj = e.srcElement;
	if(!obj) obj = e.target;

	var key = e.keyCode;
	debug("window.keyPressed() key="+key);
	// we are interested only in tab character
	if (key != 9) return true;
	
	objMeta = P2.getElement(obj.id);
	if (!objMeta) return;
	debug("window.keyPressed() objMeta.name="+objMeta.name);
	try
	{
		if (objMeta.inTable && objMeta.isLastField)
		{
			var row = getRowInTable(obj);
			if (row && row.nextSibling == null)
			{
				objTable = P2.getElement(objMeta.tableName);
				if (objTable.addRow) objTable.addRow();
			}
		}
	}
	catch(e)
	{
		handleError(e);
	}	
}
*/
//returns the next leaf-node in the depth-first order for the root node after the current node.
// returns null if there are no more child nodes for root. Leaf node is any node that does not have a child other than #text node
// This, in my books, is a superior algorithm to using recursion to traverse through all nodes
function getNextNode(win, rootNode, currentNode)
{
	if(!rootNode) return null;
	var nextNode, children;
	if(currentNode) nextNode =  currentNode.nextSibling;
	else nextNode = rootNode.firstChild;
	
	//go through the next siblings. skip text nodes. return if there is no element. get the next non-text sibling
	while (true)
	{
		//skip text nodes
		while(nextNode && nextNode.nodeType == 3)
		{
			nextNode = nextNode.nextSibling;
		}
		//if non-text sibling found. break to next block.
		if(nextNode) break;
		//OK. next node is not found. Means no next sibking, Means we have to go one level up and try the next child
		//currentNode is null means it is the starting point. There is no way up.
		if(!currentNode) return null;
		
		currentNode = currentNode.parentNode;
		// if this is the root, we have exhausted all nodes
		if (currentNode == rootNode) return null;
		nextNode = currentNode.nextSibling;
	}
	while(true)
	{
		// select is a funny control. While it has 'options' as children, we consider select itself as the leaf node
		if(nextNode.nodeName.toUpperCase() == 'SELECT') return nextNode;
		children = nextNode.childNodes;
		// if there are no children, this is a leaf
		if(!children || children.length == 0)return nextNode;
		//return the first non-text node, failing which return this element itself
		var found = false;
		for(var i=0; i<children.length; i++)
		{
			if(children[i].nodeType == 3) continue;
			found = true;
			nextNode = children[i];
			break;
		}
		if(!found) return nextNode;
	}
}

// convert dc to a readable HTML
function dcToHtml(dc)
{
	var str = '';
	//header for the dc
	str = '<bold>' + dc.values['serviceId'] + '</bold><br/>';
	//display messages
	if (dc.messages && dc.messages.length)
	{
			str += "There are " + dc.messages.length + " Message/s <br/>";
			for (var i=0; i<dc.messages.length; i++) str+= dc.messages[i] + "<br/>";
	}
	//else str += ' There are no messages';
	
	//display values
	str += "Values are :<br/>";
	str += '<table border="1" cellpadding="0" cellspacing="2"><tr><th>Variable</th><th>Value</th></tr>';
	for (var a in dc.values)str += "<tr><td>" + a + "</td><td>" + dc.values[a] + "</td></tr>";
	str += '</table><br/>';

	//and grids
	str += "Grids are:<br/>";
	
	for (var a in dc.grids) 
	{
		if(!dc.grids[a])continue;
		var thisGrid = dc.grids[a];
		str += "<br/>" + a + " has " + thisGrid.length + " rows and " + thisGrid[0].length + " columns<br/>";
		str += '<table border="1">';
		//header row
		str += "<tr>";
		for(var j=0; j<thisGrid[0].length; j++) str += "<th>" + thisGrid[0][j] + "</th>";
		str += "</tr>";
		for(var i=1; i<thisGrid.length; i++)
		{
			str += "<tr>";
			for(var j=0; j<thisGrid[i].length; j++) str += "<td>" + thisGrid[i][j] + "</td>";
			str += "</tr>";
		}
		str += "</table><br/>";
	}

	//and finally lists
	str += 'Lists are:<br/><table border="1" cellpadding="0" cellspacing="2"><thead><tr><th>List Name</th><th>Values</th></tr></thead><tbody>';
	for (var a in dc.lists)
	{
		if (dc.lists[a])str += "<tr><td>" + a + "</td><td>" + dc.lists[a] + "</td></tr>";
	}
		str += '</tbody></table><br/>';

	return str;
}

function showDc(dc)
{
	var str = dcToHtml(dc);
	w = window.open();
	w.document.write(str);
	w.document.close();
}

function showPropertiesOfAnObject(obj, inWindow)
{
	if(!obj)
	{
		alert ('passed object is ' + obj);
		return;
	}
	var nextLine = '\n';
	if (inWindow) nextLine = '<br/>';
	var s = '';
	for(var a in obj)
	{
		s += a + '=' + obj[a] + nextLine;
	} 
	if(inWindow)
	{
		var w = window.open();
		w.document.write(s);
		w.document.close();
	}
	else alert(s);
	return;
}
/*
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
*/
function initMessageArea(win, messageAreaId)
{
	if (!messageAreaId || messageAreaId.length==0)
	{
		alert("initMessageArea(): must pass messageAreaId argument");
		return;
	}
	if (win.document.getElementById(messageAreaId))
	{
		alert("initMessageArea(): already created...");
		return; // message area already created
	}
	var msgButton = win.document.createElement('input');
	msgButton.type = 'button';
	msgButton.id = messageAreaId;
	msgButton.value = 'show Logs';
	msgButton.onclick = win.messageButtonClicked;
	win.document.body.appendChild(msgButton);
	
	var msgDiv = win.document.createElement('div');
	msgDiv.style.display = 'none';
	msgDiv.style.border = '3px groove red';
	msgDiv.id = messageAreaId + 'Div';
	msgDiv.innerHTML = '<span id="' + messageAreaId + 'Span'+ '">log</span>';
	win.document.body.appendChild(msgDiv);
}
/*
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
		msgDiv.innerHTML = '<span id="' + obj.id + 'Span' + '">' + exilMessages.join("<br/>") + '</span>';
		obj.value = 'hide Logs';
	}
	else
	{
		msgDiv.style.display = 'none';	
		obj.value = 'show Logs';
	}
}
*/
/*
// sample matched rows returned from server that is displayed in drop down box
var sDB2 = [["1448", "Tanmay Pradhan"], 
	       ["1001", "Raghu Bhandi"], 
	       ["1003", "Muthukumar Selva"], 
	       ["1033", "Praveen KG"], 
	       ["1113", "Nandakumar"], 
	       ["1000", "Giri"], 
	       ["1445", "Arvinda De selva"], 
	       ["1440", "Arvinda"], 
	       ["2033", "Vaishali"], 	       
	       ];
*/
////////////////////////////////// comboBox scripts BEGIN

// combo Box feature implementation:
// ---------------------------------
// Specify comboBox="true" for an input field in the page.xml to make it comboBox field.
// onfocus="PM.comboBoxInit(window, event);" is set for the <input> control by the page translator.
// For every key pressed, the input string is matched against the databse and the matching
// string array (2D-array) is rendered in a drop down list just below the <input> field.
// drop down list is implemented using 2 columns X N rows <table>. Each table row contains
// one matching code and description cell.
// absolute positioning of the list <table> just below the <input> field is taken care by
// enclosing the <table> inside a <div>. 
// <div><table> for the drop down list is created/destroyed dynamically depending upon the 
// input key pressed.
//
// Description service request triggers only if the number of chars typed by the user is
// greater than 'inputMetaObj.minCharToTriggerService'.
// And 'inputMetaObj.grid' is populated with the matched strings by the service callBack function.
var LEFT_ARROW = 37;
var UP_ARROW = 38;
var RIGHT_ARROW = 39;
var DOWN_ARROW = 40;
var BACKSPACE = 8;
var SAFARI_UP_ARROW = 63232;
var SAFARI_DOWN_ARROW = 63233;
var DELETE = 46;

var COMBO_SELECT_TIMEOUT = 200; // in miliseconds

// comboBoxInit() is the onfocus event handler for <input> field with comboBox="true"
// Intializes various values required for comboBox feature.
function comboBoxInit(win, inputObj, comboMaxRowsToDisplay)
{
		var combo = new Object;
		var a = findXY(inputObj);
		combo.x = a.x;  // x, y, w, h are required for drawing the dropdown list just below <input>
		combo.y = a.y;
		combo.w = inputObj.offsetWidth;
		combo.h = inputObj.offsetHeight;
		combo.bgcolor = "#DDDDDD";
		combo.bgcolorHilighted = "#AAAAAA";
		combo.bgcolorSelected = "#3E7CEF";
		combo.fontColor = "#000000";
		combo.fontColorHilighted = "#FFFFFF";
		combo.maxVisibleRows = (comboMaxRowsToDisplay > 0) ? comboMaxRowsToDisplay : 5;
		combo.inputString = ""; // value typed in the <input>
		combo.currentRowObj = null; // current selected row in the list
		combo.currentRow = -1;
		inputObj.combo = combo;
		
		drawComboList(win, inputObj);
}

function drawComboList(win, inputObj)
{
	var divObj = win.document.createElement('DIV');
	inputObj.parentNode.appendChild(divObj);
	divObj.style.position = 'absolute';
	divObj.style.display = 'none';
	divObj.style.zIndex = 5;
	divObj.style.left = inputObj.combo.x;
	divObj.style.top = inputObj.combo.y + inputObj.combo.h;
	divObj.style.width = inputObj.combo.w;
	inputObj.combo.divObj = divObj;	
		
	var tableObj = win.document.createElement('TABLE');
	divObj.appendChild(tableObj);
	tableObj.cellSpacing = '0';
	tableObj.cellPadding = '2';
	tableObj.border = '0';

	var rowObj, cellObj1, cellObj2;
	for (i=0; i<inputObj.combo.maxVisibleRows; i++)
	{
		rowObj = tableObj.insertRow(-1);
		rowObj.id = 'row' + i;
		rowObj.style.fontFamily = 'arial';
		rowObj.style.fontStyle = 'normal';
		rowObj.style.fontSize = '10px';
		rowObj.inputObj = inputObj;
		
		cellObj1 = rowObj.insertCell(-1);
		cellObj1.style.width = inputObj.combo.w;		
		rowObj.cellObj1 = cellObj1;
		
		cellObj2 = rowObj.insertCell(-1);
		cellObj2.style.width = inputObj.combo.w;
		
		rowObj.onmouseover = win.comboHilightRow;
		rowObj.onmouseout = win.comboRestoreRow;
		rowObj.onmousedown = win.comboSelectRow;		
	}	
	// for scrolling
	//divObj.style.height = inputObj.combo.currentRowObj.offsetHeight * inputObj.combo.maxVisibleRows;
	//divObj.style.overflow = 'scroll';
}

function flashHandler(win, ele, text)
{
	var span = win.document.getElementById(ele.id+'Span');
	if (span)
	{
		span.style.display = '';
	}
	else
	{
		span = win.document.createElement('SPAN');
		ele.parentNode.appendChild(span);
		span.id = ele.id+'Span';
		span.style.position = 'absolute';
		span.style.zIndex = 5;
		var a = findXY(ele);
		span.style.left = a.x + ele.offsetWidth;
		span.style.top = a.y;
		span.style.height = ele.offsetHeight;
		span.style.width = ele.offsetWidth;		
		span.innerHTML = text;
		span.style.fontFamily = 'arial';
		span.style.fontSize = '12px';
		span.style.color = "red";
		span.style.backgroundColor = "#000000";
	}
	win.setTimeout("vanishFlash(\""+span.id+"\")", 1000);	
}

// destroys the drop down list i.e. <div> evnclosing the list <table>
function destroyComboList(win, inputObj)
{
	var divObj = inputObj.combo.divObj;
	if (divObj)
	{
		var objParent = divObj.parentNode;
		objParent.removeChild(divObj);
		inputObj.combo.divObj = null;
	}	
}

function hideComboList(inputObj)
{
	inputObj.combo.divObj.style.display = 'none';
}

// renders the drop down list with strings passed through obj
// inputObj - <input> object for comboBox
// stringObj - string array to be rendered in the drop down table
function populateComboList(win, inputObj, stringObj)
{
	var tableObj = inputObj.combo.divObj.firstChild;
	var numRows = (stringObj.length > inputObj.combo.maxVisibleRows) ? inputObj.combo.maxVisibleRows : stringObj.length;
	inputObj.combo.currentRow = -1;

	var rowObj, cellObj1, cellObj2;
	for (i=0; i<numRows; i++)
	{
		rowObj = tableObj.rows[i];
		rowObj.style.display = '';
		rowObj.style.color = inputObj.combo.fontColor;		
		rowObj.style.backgroundColor = inputObj.combo.bgcolor;
		cellObj1 = rowObj.childNodes[0];
		cellObj1.innerHTML = stringObj[i][0];
		if (i == 0)
		{
			inputObj.combo.currentRowObj = rowObj;
			rowObj.style.backgroundColor = inputObj.combo.bgcolorSelected;
			rowObj.style.color = inputObj.combo.fontColorHilighted;
		}		
		cellObj2 = rowObj.childNodes[1];
		cellObj2.innerHTML = stringObj[i][1];	
	}
	if (numRows < inputObj.combo.maxVisibleRows)
	{
		for (i=numRows; i<inputObj.combo.maxVisibleRows; i++)
		{
			rowObj = tableObj.rows[i];
			rowObj.style.display = 'none';
		}
	}
	tableObj.numRows = numRows;
	inputObj.combo.divObj.style.display = '';	
	// for scrolling
	//divObj.style.height = inputObj.combo.currentRowObj.offsetHeight * inputObj.combo.maxVisibleRows;
	//divObj.style.overflow = 'scroll';
}

function comboSelectOnBlur(win, inputObj)
{	
	if (inputObj.combo.divObj)
		comboSelectRowOnBlur(win, inputObj);
}

function comboSelectRowOnBlur(win, inputObj)
{
	if (inputObj.combo.currentRowObj)
	{
		debug("inputObj.combo.currentRowObj="+inputObj.combo.currentRowObj);
		cell = inputObj.combo.currentRowObj.childNodes[0];
		inputObj.value = cell.innerHTML;
	}
	destroyComboList(win, inputObj);
}

// comboGetMatchedGrid() matches the input string with the database and returns the matched string array.
//var gc = 0;
function comboGetMatchedGrid(win, inputObj, objMeta)
{
	var keyValue = inputObj.combo.inputString;
	
    var dc = new DataCollection();
    //this.P2.fillDcFromQueryFields(dc, this.queryFieldNames, this.queryFieldSources);
    dc.addValue('keyValue', keyValue);
    var se = new ServiceEntry(objMeta.descServiceId, dc, true, null, inputObj, fieldName, ServerAction.NONE)
    win.serverStub.callService(se);
    objMeta.grid = se.dc.getGrid(se.serviceId);
    /*
    if (gc == 0)
    {
    	objMeta.grid = [['aa', 'emp zero']
    ,['aaa', 'emp one'] 
    ,['aaabb', 'emp two']];
    }
    else if (gc == 1)
    {
    	objMeta.grid = [['aa', 'emp zero']
    ,['aaabb', 'emp two']];    	
    }
    else if (gc == 2)
    {
    	objMeta.grid = [['aa', 'emp zero']];
    }
    gc = (gc + 1) % 3;
    */ 
	// service response populates objMeta.grid with the matching grid
	return objMeta.grid;
}	

function comboArrowKeyHandler(win, ele, objMeta, e)
{
	var keycode = (e.keyCode) ? e.keyCode : e.which;
	//alert("comboArrowKeyHandler: keycode:"+keycode);
	if (keycode == DOWN_ARROW)
	{
		if (ele.combo.currentRow < 0)
		{
			// id='row0' for two comboBox won't conflict as only one comboBox list would be active at any point of time
			var firstRow = win.document.getElementById('row0');
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
				ele.combo.currentRowObj = win.document.getElementById(nextRow);
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
				ele.combo.currentRowObj = win.document.getElementById(prevRow);
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
			hideComboList(ele);
			return true;
		}
		// don't trigger the descService untill the keyValue size is less than minCharToTriggerService
		if (ele.combo.inputString.length < objMeta.minCharToTriggerService)
			return true;		
		var outString = comboGetMatchedGrid(win, ele, objMeta);
		if (!outString)
		{
			flashHandler(win, ele, "No Match Found!");
			// cancels the default post event action 
			if(e.preventDefault)
				e.preventDefault();
			else 
				e.returnValue = false;
			return false;			
		}
		else
		{
			populateComboList(win, ele, outString);
		}
	}
	
	return true;
}

// comboCharKeyHandler() is the onkeypress event handler for comboBox <input>.
// It handles only alphaNumeric chars entered.
// accumulates the chars entered and matches with the database, draws the drop down
// list dynamically for every key pressed.
function comboCharKeyHandler(win, ele, objMeta, e)
{
	var keycode = (e.keyCode) ? e.keyCode : e.which;
	var keychar = String.fromCharCode(keycode);

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
	
	// don't trigger the descService untill the keyValue size is less than minCharToTriggerService
	if (ele.combo.inputString.length < objMeta.minCharToTriggerService)
		return true;
	var outString = comboGetMatchedGrid(win, ele, objMeta);
	if (!outString)
	{
		flashHandler(win, ele, "No Match Found!");
		// cancels the default post event action 
		if(e.preventDefault)
			e.preventDefault();
		else 
			e.returnValue = false;

		return false;			
	}
	else
	{
		populateComboList(win, ele, outString);
		return true;
	}
}
////////////////////////////////// comboBox scripts END
