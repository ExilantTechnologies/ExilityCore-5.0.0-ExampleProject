/**********************************************************************
*
* EX!LANT CONFIDENTIAL
* ___________________________________________________________________
*
*  Copyright (c)[2004 - 2012]  EX!LANT Technologies Pvt. Ltd.
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains the property of EX!LANT * Technologies Pvt. Ltd. and its suppliers, if any.  
* The intellectual and technical concepts contained herein are proprietary to   
* EX!LANT Technologies Pvt. Ltd. and its suppliers and may be covered by India and 
* Foreign Patents, patents in process, and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material is strictly forbidden 
* unless prior written permission is obtained
* from EX!LANT Technologies Pvt. Ltd.
***********************************************************************/
/*
* utility functions.
*/

/**
 * trim supplied string. handle non-string input as well
 * @param str
 * @returns trimmed string
 */
var trim = function (str)
{
	if(!str)
		return '';

	if (str.trim) //this version of javascript supports trim()
		return str.trim();

    if (str.replace) //it is string
    	return str.replace(/^\s+|\s+$/g, '');
    
    return '' + str;
};


// Clones a metadata object. Used in cloning metadata table row.
// Note: Array() clone is not supported.
var clone = function (obj)
{
    //debug("clone() obj="+obj+" typeof()="+typeof(obj));
    if (typeof (obj) != 'object') return obj;
    if (obj == null) return obj;

    var clonedObj = new Object();
    for (var i in obj)
    {
        if (i == 'win') // culprit for infinite recursion, check it.
            clonedObj[i] = obj[i];
        else
            clonedObj[i] = clone(obj[i]);
    }
    return clonedObj;
};

// returns a <TR> element of which the object is a child of
var getRowInTable = function (obj)
{
    if (!obj || !obj.nodeName) return null;
    var tag = obj.nodeName.toUpperCase();
    if (tag == 'FONT')
    {
        while (tag != 'TABLE')
        {
            obj = obj.parentNode;
            tag = obj.nodeName.toUpperCase();
        }
    }

    while (tag != 'BODY')
    {
        //in some case, we treat div as tr. 
        if ((tag == 'TR' || tag == 'DIV') && obj.rowIdx) 
            return obj;
        obj = obj.parentNode;
        if (!obj)
            return null;
        tag = obj.nodeName.toUpperCase();
    }
    debug('no tr found for obj ' + obj.tagName + ' with id ' + obj.id);
    return null;
};

//returns the page name of a given location string 
//example if location = ../../jhjhk/nmnm/a.htm?a=1&b=2 it returns a.htm
var pageOf = function (win, location)
{
    if (!location) return '';
    var loc = String(location);
    var idx = loc.indexOf('?');
    if (idx > 0) loc = loc.substring(0, idx);
    idx = loc.lastIndexOf('/');
    if (idx > 0) loc = loc.substring(idx + 1, 999);
    return loc;
};


// returns an html text that can be set as innerHTMl of a dom element to render dc
var dcToText = function (dc)
{
    var str = '';
    //display messages
    for (var sev in dc.messages)
    {
        str += '<br/>' + sev + '<br/>';
        var endstr = '</font>';
        if (sev.toUpperCase() == "ERROR")
            str += '<font color="red">';
        else if (sev.toUpperCase() == "WARNING")
            str += '<font color="blue">';
        else
            endstr = '';

        var msgs = dc.messages[sev];
        for (var i = 0; i < msgs.length; i++)
            str += msgs[i] + '<br/>';
        str += endstr;
    }

    if (!str)
        str = '<br/>There are no messages<br/>';

    //display values
    str += '<br/>Values are :<br/>';
    str += '<table border="1"><tr><th>Variable</th><th>Value</th></tr>';
    for (var val in dc.values)
    {
        if ((val != 'exilityServerTraceText') && (val != 'exilityServerPerformanceText'))
            str += "<tr><td>" + val + "</td><td>" + dc.values[val] + "</td></tr>";
    }
    str += '</table>';

    //and grids
    str += "<br/>Grids are:<br/>";

    for (var g in dc.grids)
    {
        if (!dc.grids[g]) continue;
        var thisGrid = dc.grids[g];
        str += "<br/>" + g + " has " + thisGrid.length + " rows and ";
        if (thisGrid[0])
            str += (thisGrid[0].length || ' no ');
        str += ' columns<br/><table border="1">';
        //header row
        str += "<tr>";
        if (thisGrid.length > 0)
            for (var j = 0; j < thisGrid[0].length; j++) str += "<th>" + thisGrid[0][j] + "</th>";
        str += "</tr>";
        for (var i = 1; i < thisGrid.length; i++)
        {
            str += "<tr>";
            for (var j = 0; j < thisGrid[i].length; j++)
            {
                str += "<td>";
                if (thisGrid[i][j] == '') str += '&nbsp;';
                else str += thisGrid[i][j];
                str += "</td>";
            }
            str += "</tr>";
        }
        str += "</table>";
    }

    //and finally lists
    str += '<br/>Lists are:<br/><table border="1" cellpadding="0" cellspacing="2"><tr><th>List Name</th><th>Values</th></tr>';
    for (var list in dc.lists)
    {
        if (dc.lists[list]) str += "<tr><td>" + list + "</td><td>" + dc.lists[list] + "</td></tr>";
    }
    str += '</table>';

    return str;
};

//ele.scrollIntoView() is a dom method, but the problem is that it will scroll even if the ele is currently visible.
//Generally, that is not what we want. We want to scroll, if required, so that the ele is visible.
var scrollIntoView = function (ele)
{
    if (!ele || !ele.parentNode)
    {
        debug(ele + ' is not a dom element. scrollIntoView() will not work');
        return;
    }
    //problem with ele.scrollIntoView() is that it may scroll ele to the top of scrolling area even when the ele is visible
    var p = ele.parentNode;
    while (p && p.nodeName.toLowerCase() != 'body')
    {
        if (p.scrollHeight != p.clientHeight && p.scrollHeight != p.offsetHeight)
        {
            if (ele.offsetTop < p.scrollTop)
                p.scrollTop = ele.offsetTop;
            else if (ele.offsetTop > (p.scrollTop + p.clientHeight))
                p.scrollTop = ele.offsetTop - p.clientHeight + ele.clientHeight;
            else
                debug(' No need to scroll ');
            return;
        }
        p = p.parentNode;
    }
    debug('No scrolled parent found for ' + ele.id);
    return;
};

// returns xy-cooridnate of the object
//Needs to be revamped. I do not see code for Safari!!!
// we need to take care of scrolled dimensions as well. PathFinder version of combo.htm has this code.
//to be evaluated and brought-in here
//NOTE : deprecated. use getPageXY() or getDocumentXY instead.
var findXY = function (obj)
{
    //debug('got object ' + obj + ' with id=' + obj.id + ' with its offset parent=' + obj.offsetParent);
    var y = 0;
    var x = 0;
    // Dec 07 2009 : Bug 690 - Calendar Control - Exis (Start) : Aravinda
    IdentifyBrowser.init();
    if (IdentifyBrowser.browser == 'Explorer')
    {
        if (obj.offsetParent)
        {
            while (1)
            {
                x += obj.offsetLeft;
                y += obj.offsetTop;
                if (!obj.offsetParent)
                    break;
                obj = obj.offsetParent;
            }
        }
    }
    // Feb 22 2010 :  Bug ID 975 - Date picker and pop ups are coming down - Exis (Start): Venkat
    else if (IdentifyBrowser.browser == 'Firefox' && exilParms.alignCalendar == true)
    {
        if (obj.offsetParent)
        {
            while (1)
            {
                x += obj.offsetLeft;
                y += obj.offsetTop;
                if (!obj.offsetParent)
                    break;
                obj = obj.offsetParent;
            }
        }
    }
    // Feb 22 2010 :  Bug ID 975 - Date picker and pop ups are coming down - Exis (End): Venkat
    else if (IdentifyBrowser.browser == 'Firefox')
    {
        if (obj.parentNode)
        {
            while (1)
            {
                x += parseInt(obj.offsetLeft);
                y += parseInt(obj.offsetTop);
                if (!obj.parentNode || ((obj.tagName == 'DIV') && (obj.id == 'top')))
                    break;
                obj = obj.parentNode;
            }
        }
    }
    return {x:x, y:y};
};

// message box script BEGIN ////////////////////////////

var messageBtnAction1 = null;
var messageBtnAction2 = null;
var messageBtnActionParam1 = null;
var messageBtnActionParam2 = null;
var messageEles = null; //cache all elements 

//message() is an alternative to alert() and confirm()
/******************
text: message text 
label: optional. header/label for the text
btn1 : text for button 1
btnAction1: optional. action to be taken when button one is pressed. I would have preferred to give it as an object
btn2, btnAction2 :optional. another set, if required. Could be null
btnActionParam1 : parameter with which action1 to be invoked with
btnActionParam2 : ---
NOTE: This requires exility concepts for making this a pop-up
************************/
var message = function (text, label, btn1, btnAction1, btn2, btnAction2, btnActionParam1, btnActionParam2, field)
{
    if (!window.messageEles)
        cacheMessageElements();
    if (!btn1)
        btn1 = 'OK';
    var msgDiv = messageEles.msgDiv;
    if (!msgDiv) //this project has not designed an error panel
    {
        if (btn2) //we need two options
        {
            if (window.confirm(text)) //user clicked on first button
            {
                if (btnAction1)
                {
                	executeFunction(btnAction1, btnActionParam1);
                }
            }
            else
            {
            	executeFunction(btnAction2, btnActionParam2);
            }
        }
        else //just an alert. project may use a warningMsg div
        {
            msgDiv = document.getElementById('warningMsg');
            if (msgDiv) //exis uses this
            {
                alignMsgBox();
                showMessageInPanel(label, text, msgDiv);
            }
            else
            {
                alert(text);
                if (btnAction1)
                {
                	executeFunction(btnAction1, btnActionParam1);
                }
            }
        }

        if (btnActionParam1) //this is typically the html element that resulted in an validaiton error.
        {
            try
            {
                showPanelForSure(btnActionParam1.parentNode);
                if (btnActionParam1.focus)
                    btnActionParam1.focus();
                if (btnActionParam1.select)
                    btnActionParam1.select();
            }
            catch (e) {/*nothing to do */ }
        }
        return;
    }
    
    coverMainStyle.zIndex = 6;	
    coverPage(coverMainStyle, imgMainStyle);

    // reset the global variables for this message.
    messageBtnAction1 = null;
    messageBtnAction2 = null;

    if (messageEles.msgLabel != null)
    {
	    if (label)
	    {
	        messageEles.msgLabel.innerHTML = label;
	    }
	    messageEles.msgText.innerHTML = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }
    else
    {
    	//first line to go to header, and the rest to detail.
    	var n = text.indexOf('\n');
    	var hdr, dtl;
    	if(n < 0)
    	{
    		hdr = text;
    		dtl = '';
    	}
    	else
    	{
    		hdr = text.substr(0, n);
    		dtl = text.substr(n+1);
    	}
        messageEles.msgHeader.innerHTML = hdr;
    	dtl = dtl.split('\n').join('<br /><br />');
    	messageEles.msgDetail.innerHTML = dtl;
    }
    
    if (btn1 && btn1.length > 0)

        messageEles.msgBtnText1.innerHTML = (btn1 == 'Ok' || btn1 == 'ok') ? 'OK' : btn1;
    else
        messageEles.msgBtnText1.innerHTML = 'OK';
        
    if (btnAction1)
    {
        messageBtnAction1 = btnAction1;
        if (btnActionParam1) messageBtnActionParam1 = btnActionParam1;
    }            
    
    if (btn2)
    {
        messageEles.msgBtnText2.innerHTML = btn2;
        messageEles.btnDiv2.style.display = '';
        if (btnAction2)	// Mar 18 2010 : Changed to handle safari issues - Exility App : Aravinda
        {
            messageBtnAction2 = btnAction2;
            if (btnActionParam2) messageBtnActionParam2 = btnActionParam2;
        }
    }
    else
    {
        messageEles.btnDiv2.style.display = 'none';
    }

    msgDiv.style.display = 'block';

    var height = msgDiv.style.height;
    height = height.replace(/[p,P][x,X]/g, '');
    var width = msgDiv.style.width;
    width = width.replace(/[p,P][x,X]/g, '');
    if (height == '')
        height = msgDiv.offsetHeight;
    if (width == '')
        width = msgDiv.offsetWidth;
    var horizontalOffset = document.body.scrollLeft;
    var verticalOffset = document.body.scrollTop;
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;
    msgDiv.style.top = ((verticalOffset + windowHeight / 2) - height / 2 - 25) + "px";
    msgDiv.style.left = ((horizontalOffset + windowWidth / 2) - width / 2 - 225) + "px";
    
    //additional help
    if(messageEles.morePanel){
    	var msg = '';
    	
    	var btnShow = '';
    	if (field && field.additionalMessageName){
	    	msg = dataTypeMessages[field.additionalMessageName] || ('Sorry. We can not show additional help for this field, as we encountered an internal error while retrieving message for ' + field.additionalMessageName);
	    	msg = msg.replace(/&/g, '&amp;');
	    	mag = msg.replace(/</g, '&lt;');
    	}
    	else{
    		btnShow = 'none'; //button to be hidden if there is no message
    	}
    	messageEles.morePanel.innerHTML = msg;
    	messageEles.morePanel.style.display = 'none';
    	messageEles.moreBtnDiv.style.display = btnShow;
    	
    }
};

/**
 * execute a function with supplied parameter. action could be either a function, name of a funciton, or name of an action
 */
var executeFunction = function(action, param)
{
	if(typeof(action) == 'function')
	{
		action(param);
		return;
	}
	
	var fn = currentActiveWindow[action];
	if(typeof(fn) == 'function')
	{
		fn(param);
		return;
	}
	
	currentActiveWindow.P2.act(null, null, action);
};
//Specifically for exis team
var showMessageInPanel = function (label, text, msgDiv)
{
    msgDiv.style.display = 'block';
    var height = msgDiv.style.height;
    height = height.replace(/[p,P][x,X]/g, '');
    var width = msgDiv.style.width;
    width = width.replace(/[p,P][x,X]/g, '');

    var errorType = text.substring(0, 5); //this is only used for errors returned from server

    msgDiv.style.display = '';

    if (label)
    {
        msgDiv.className = 'error';
    }
    else if (errorType == 'error')
    {
        msgDiv.className = 'error';
    }
    else
    {
        msgDiv.className = 'success';
    }
    var ele = document.getElementById('warningMsg');
    ele.innerHTML = text;
};

var cacheMessageElements = function ()
{
    window.messageEles  = { 
    msgDiv : document.getElementById('messageBox'),
    msgLabel : document.getElementById('messageLabel'),
    msgText : document.getElementById('messageText'),
    msgHeader : document.getElementById('messageHeader'),
    msgDetail : document.getElementById('messageDetail'),
    msgBtnText1 : document.getElementById('messageButton1'),
    msgBtnText2 : document.getElementById('messageButton2'),
    btnDiv2 : document.getElementById('messageButtonDiv2'),
    morePanel : document.getElementById('messageAdditionalPanel'),
    moreBtnDiv : document.getElementById('messageButtonDiv3')
    };

};
//give me any object. I ensure  that the panel that contains this object is displayed. This is used for focusing the field
var showPanelForSure = function (panel)
{
    var doc = panel && panel.ownerDocument;
    if(!doc)
    {
        debug('wrong object ' + panel + ' sent to showPanelForSure');
        return;
    }
    for(; panel.tagName.toUpperCase() != 'BODY'; panel = panel.parentNode)
    {
        var panelName = panel.id;
        var tab = doc.getElementById(panelName + 'TabsDiv');
        if(tab)
        {
            if(tab.style.display != 'none')
                continue;
            panel = tab;
            tab = doc.getElementById(panelName + 'Tab');
            tab.onclick(tab, panel.id);
            //alert('I simulated a click on ' + tab.id + ' that shoudl have displayed ' + panel.id);
            continue;
        
        }
        if(!panel.style || panel.display != 'none')
            continue;
        var twister = doc.getElementById(panelName + 'Twister');
        if(twister)
            twister.onclick(twister, panelName);
        else
            panel.style.display = '';
     }
};

var messageButtonClicked = function (messageButton)
{
    var msgDiv = document.getElementById('messageBox');
    msgDiv.style.display = 'none';
    coverMainStyle.zIndex = 2;	
    if(!currentActiveWindow.isAPopup){
        uncoverPage(coverMainStyle, imgMainStyle);
    }
    
    if ((messageButton == 'messageButton1') && (messageBtnAction1 != null))
    {
    	executeFunction(messageBtnAction1, messageBtnActionParam1);
    }
    else if ((messageButton == 'messageButton2') && (messageBtnAction2 != null))
    {        
    	executeFunction(messageBtnAction2, messageBtnActionParam2);
    }
};

/////// div drag script
// Global object to hold drag information.

var dragObj = new Object();
dragObj.zIndex = 0;
var isIE = window.document.all;

var dragStart = function (event, id) 
{
  var x, y;

  // If an element id was given, find it. Otherwise use the element being
  // clicked on.

  if (id)
    dragObj.elNode = document.getElementById(id);
  else {
  	dragObj.elNode = window.event.srcElement;
  	if (!dragObj.elNode)
  	    dragObj.elNode = event.target;
  }
  // Get cursor position with respect to the page.

  if (isIE) {
    x = window.event.clientX + document.documentElement.scrollLeft
      + document.body.scrollLeft;
    y = window.event.clientY + document.documentElement.scrollTop
      + document.body.scrollTop;
  }
  else {
    x = event.clientX + window.scrollX;
    y = event.clientY + window.scrollY;
  }

  // Save starting positions of cursor and element.

  dragObj.cursorStartX = x;
  dragObj.cursorStartY = y;
  dragObj.elStartLeft  = parseInt(dragObj.elNode.style.left, 10);
  dragObj.elStartTop   = parseInt(dragObj.elNode.style.top,  10);

  if (isNaN(dragObj.elStartLeft)) dragObj.elStartLeft = 0;
  if (isNaN(dragObj.elStartTop))  dragObj.elStartTop  = 0;

  // Update element's z-index.

  dragObj.elNode.style.zIndex = ++dragObj.zIndex;

  // Capture mousemove and mouseup events on the page.

  if (isIE) {
    document.attachEvent("onmousemove", dragGo);
    document.attachEvent("onmouseup",   dragStop);
    window.event.cancelBubble = true;
    window.event.returnValue = false;
  }
  else {
    document.addEventListener("mousemove", dragGo,   true);
    document.addEventListener("mouseup",   dragStop, true);
    event.preventDefault();
  }
};

var dragGo = function (event) {

  var x, y;

  // Get cursor position with respect to the page.

  if (isIE) {
    x = window.event.clientX + document.documentElement.scrollLeft
      + document.body.scrollLeft;
    y = window.event.clientY + document.documentElement.scrollTop
      + document.body.scrollTop;
  }
  else {
    x = event.clientX + window.scrollX;
    y = event.clientY + window.scrollY;
  }

  // Move drag element by the same amount the cursor has moved.

  dragObj.elNode.style.left = (dragObj.elStartLeft + x - dragObj.cursorStartX) + "px";
  dragObj.elNode.style.top  = (dragObj.elStartTop  + y - dragObj.cursorStartY) + "px";

  if (isIE) {
    window.event.cancelBubble = true;
    window.event.returnValue = false;
  }
  else
    event.preventDefault();
};

var dragStop = function (event) {

  // Stop capturing mousemove and mouseup events.

  if (isIE) {
    document.detachEvent("onmousemove", dragGo);
    document.detachEvent("onmouseup",   dragStop);
  }
  else {
    document.removeEventListener("mousemove", dragGo,   true);
    document.removeEventListener("mouseup",   dragStop, true);
  }
};


var showToolTip = function (obj)
{
    var targetID = obj.id.replace('docNodeName', 'docXpath');
    PM.toolTipEle.innerHTML='<span class="field" style:"background-color: yellow;">' + document.getElementById(targetID).value + '</span>';
    PM.toolTipStyle.top = event.clientY + 130;
    PM.toolTipStyle.left = event.clientX + 130;
    PM.toolTipStyle.display = 'inline';
};

var hideToolTip = function (obj)
{
    PM.toolTipEle.innerHTML='';
    PM.toolTipStyle.display = 'none';
};

//worker function: accumulate offset xy, or deduct scroll xy
var getSpecificXy = function (node, xy, getOffset, reachTopWindow)
{
    var nextNode;
    while (node)
    {
        //debug('Going to work with ' + node);
        if (getOffset)
        {
            //debug('offset of ' + node.tagName + 'left:' + node.offsetLeft + ' right:' + node.offsetTop + ' with next node as ' + node.offsetParent );
            xy.x += node.offsetLeft;
            xy.y += node.offsetTop;
            nextNode = node.offsetParent;
        }
        else
        {
            //debug('Scroll of ' + node.tagName + 'left:' + node.scrollLeft + ' right:' + node.scrollTop + ' with next node as ' + node.parentNode);
            if (node.scrollLeft)
                xy.x -= node.scrollLeft;
            if (node.scrollTop)
                xy.y -= node.scrollTop;

            nextNode = node.parentNode;
        }

        //if we are to look within this docuent, then we should exclude body/html scrolls
        if (!reachTopWindow && node.nodeName.toUpperCase() == 'BODY')
            return;
            
        if (!nextNode)
        {
            var doc = node.ownerDocument;
            if (!doc)//happens if html element is reached
            {
                doc = node.getElementsByTagName('body')[0].ownerDocument;
            }
            var win = doc.defaultView || doc.parentWindow; //second one for IE8 and before
            if (win.parent == win) //we are on the window. No need to go up.
                return;
            //frameElement points to the dom element of the parent window that has this iframe in it (typically the <iframe> itself
            nextNode = win.frameElement;
            debug('Restarted with parent window element ' + nextNode);
        }
        node = nextNode;
    }
};

//gets XY coordinates of the node relative to the browser page. 
//If this document is part of an iframe, note that the coordinates returned is relative to this top window
var getPageXy = function (node)
{
	var xy = new Object();
	xy.y = 0;
	xy.x = 0;
	//get offset first, and then get scroll
	getSpecificXy(node, xy, true, true);
	getSpecificXy(node, xy, false, true);

	return xy;
};

//gets XY coordinates of the node relative to the documents top. 
//If this document is part of an iframe, note that the coordinates returned is relative to this frame, and not the whole window/page
var getDocumentXy = function (node)
{
	var xy = new Object();
	xy.y = 0;
	xy.x = 0;
	//get offset first, and then get scroll
	getSpecificXy(node, xy, true, false);
	getSpecificXy(node, xy, false, false);

	return xy;
};

//One of the issue in using setTimeout() is that we can not pass parameters. This class is a utility fot that
// caller would say timer = new A.TimeBomb(..). In case you want to stop, call timer.stop();
//obj.funcitonName would be the method called on obj with parm as sole parameter..
var TIMER_ID_PREFIX = 'timer_';
var nextTimerIdToUse = 0;
var TimeBomb = function (obj, functionName, parm, delay, win)
{
    if (!win)
        win = window;
    this.obj = obj;
    this.functionName = functionName;
    this.parm = parm;
    this.id = nextTimerIdToUse;
    nextTimerIdToUse++;
    this.win = win;
    win[TIMER_ID_PREFIX + this.id] = this;
    this.timer = win.setTimeout(TIMER_ID_PREFIX + this.id + '.go();', delay);
};

TimeBomb.prototype.go = function ()
{
    delete this.win[TIMER_ID_PREFIX + this.id];
    this.timer = null;
    try
    {
        this.obj[this.functionName](this.parm);
    } catch (e)
    {
        debug(this.obj + 'with id '+ this.obj.id + '.'+ this.functionName + '(' + this.parm + ') failed with error ' + e);
    }
};

TimeBomb.prototype.stop = function ()
{
    if (!this.timer)
        return;
    this.win.clearTimeout(this.timer);
    this.timer = null;
};


var htmlEscape = function (str)
{
    if (!str || !str.replace)
        return str;
        
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
};

//parse a string containing tab separated name/value pairs.(name=value\tname=value....
//return an object with names as its attributes. Always returns an object. all values are strings. (no parsing of numeric/date values etc..)
var parseAttributes = function (str)
{
    var obj = new Object();
    if (!str)
        return obj;

    var pairs = str.split('\t');
    for (var i = 0; i < pairs.length; i++)
    {
        var pair = pairs[i].split('=');
        if (pair.length != 2)
        {
            debug(str + ' has invalid name/values pairs. "' + pairs[i] + '" will be ignored');
            continue;
        }
        obj[pair[0]] = pair[1];
    }

    return obj;
};

//attach an event listener
//eventNameWithNoOn : blur, click etc.. and not onblur.., fn is the pointer to function
var attachListener = function (ele, eventNameWithNoOn, fn)
{
    if (ele.addEventListener)
        ele.addEventListener(eventNameWithNoOn, fn, true);
    else
        ele.attachEvent("on" + eventNameWithNoOn, fn);
};

/*
 *Purpose of this method to get first non-text node for given domObject.
 *We have an issue in table.js while getting first child for table or div incase if first child 
 *is a text node then table.js will fail.
 *Issue raised by Jintu from DBS Banking project.
 *@param domObj is the any html dom element(i.e div or tbody etc)
 *@returns First non-text Child element for given dom element
 *@author Exility Team on 25 july 2013
 */
//Adding node_type constants.Anant on 12 Dec 2013
var NODE_TYEPE = {TEXT: "#text", COMMENT: "#comment"};
var getFirstNonTextNode = function (domObj)
{
	var nonTextNode = null;	
	for (var i = 0; i < domObj.childNodes.length; i++) 
	{
		nonTextNode = domObj.childNodes[i];
		if (nonTextNode.nodeName === NODE_TYEPE.TEXT || nonTextNode.nodeName === NODE_TYEPE.COMMENT)
		{
			continue;
		}	
	 return nonTextNode;
	}
};


/**
 * 1. if grid has more than 1 rows and value found in any column of a row then return this row idx
 * else -1.
 * @param grid This is the grid with first row as column names obtained from dc.grids['gridName'].
 * @param val : This is the value for which need to look across the columns in row.
 * @param startWithRowIdx : This is the row idx from which we should start to itterate. OPTIONAL.
 * @returns rowIdx if value matched in any column of this row else -1.
 * @author Anant on 31 Dec 2013.
 */
var findRowIndex = function (grid, val, startWithRowIdx, columnsToMacth)
{
	var nbrRows = (grid && grid.length) ? grid.length : 1;
	if(nbrRows < 2 || !val)
	{
		return -1;
	}	
	
	var rowIdx = ( (startWithRowIdx >= 0) && (startWithRowIdx <= (nbrRows - 1) )  ) ? startWithRowIdx : 1;	
	var nbrCols = grid[0].length;//first row contains column names.
	var row, colValue; 
	
	val = val.toString().toUpperCase().trim();
	
	for( ; rowIdx < nbrRows; rowIdx++)
	{
		row = grid[rowIdx];			
		if (!row )
		{
			continue;	
		}	
		
		for(var colIdx = 0; colIdx < nbrCols ; colIdx++)//For searching text in given columns
		{			
			colValue = row[colIdx];	
			
			if (!colValue) 
			{
				continue;
			}	
			
			colValue = colValue.toString().toUpperCase().trim();
			
			if(val === colValue)
			{
				return rowIdx;
			}		
		}
		
	}
	return -1;
};

/**
 * convert SelectionField valueList into grid.
 * valueList is in the form k,v;k1,v1;....
 * @param valueList This is the valueList attached with selection field.
 * @returns grid if valueList is valid list else null.
 * @author Anant
 */
var valueListToGrid = function (valueList)
{
	if(!valueList)
	{
	   return null;		
	}
	var grid = [[]];
	var pair = [];
        
    var vl = valueList.split(';');
    for(var i = 0; i < vl.length; i++)
    {
        pair = vl[i].split(',');
        grid[i] = pair;
    }
    
    return (grid.length  > 0 )? grid : null;
};