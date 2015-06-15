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

/*
 * File: exilityLoader2.js
 * Description:
 * This file must be included in all pages that use exility. In an html page
 * only this file is included which in turn include other related files.
 */

//locate Exility engine and ensure that PM points to that window. This method is called at the end of this file
function setPM() {
	var win = window;
	while (true) { // not going to be an infinite loop
		if (win.PM) // found exility loaded here...
		{
			window.PM = win.PM;
			window.exilParms = win.exilParms;
			return;
		}
		if (win.parent && win.parent != win)
			win = win.parent; // check with the parent
		else if (win.opener)
			win = win.opener; // check with the opener
		else
			break; // exility not found anywhere..
	}
	// We have reached the top. No sign of exility anywhere. Let us load Exility
	// here
	alert("Exility is not loaded. Probably this page is not lodaed as part of the frameset where Exility is normally loaded.\n THIS PAGE WILL NOT WORK PROPERLY");
	return;
}

// included as onload event for pages.
function exilPageLoad() {
	// there is one link missing in DOM. from document, you can not figure out
	// which window it is in..
	document.win = window;

	P2.init(window);
	window.onmouseup = checkIframeSize; // Feb 04 2011 : Bug 2038 - automatic
										// resize of page - Exility App :
										// Aravinda
}

// Feb 04 2011 : Bug 2038 - automatic resize of page - Exility App (Start) :
// Aravinda
// April 19 2011 : Refactoring the page height reset - Exility App (Start) :
// Aravinda
// This might have issue with sub window panels
var checkIframetimer;
function checkIframeSize() {
	if (checkIframetimer)
		window.clearTimeout(checkIframetimer);
	checkIframetimer = window
			.setTimeout('adjustFrameHeightToBodyHeight();', 10); // hoping
																	// that all
																	// actions
																	// leading
																	// to change
																	// in window
																	// size will
																	// happen
																	// before
																	// calling
																	// this
																	// function
	return;
}
var minimumPageHeight = null;

function adjustFrameHeightToBodyHeight() {
	checkIframetimer = null;
	if (minimumPageHeight == null) {
		if (window.isAPopup || window.name == 'pickerWindow') {
			if (P2.popupHeight)
				minimumPageHeight = parseInt(P2.popupHeight) || 0;
		} else {
			if (P2.pageHeight)
				minimumPageHeight = parseInt(P2.pageHeight) || 0;
		}
	}
	var iframeElement = PM.document.getElementById(window.name);
	if (!iframeElement) // no work
		return;

	var totalHeight = document.body.scrollHeight;
	var availableHeight = iframeElement.clientHeight;
	// PM.debug('document.body.scrollHeight :' + totalHeight + '
	// iframeElement.clientHeight: ' + availableHeight + '
	// iframeElement.scrollHeight :' + iframeElement.scrollHeight + '
	// document.body.scrollHeight:' + document.body.scrollHeight + ' minimum:' +
	// minimumPageHeight);
	if (minimumPageHeight && totalHeight < minimumPageHeight)
		totalHeight = minimumPageHeight;
	// if (document.body.scrollWidth > iframeElement.clientWidth ||
	// document.body.parentNode.scrollWidth > iframeElement.clientWidth) //
	// there is ahorizontal scroll-bar
	// I may also want to check w = window.innerWidth ||
	// (document.documentElement) ? document.documentElement.clientWidth :
	// document.body.clientWidth; if (w < document.body.offsetWidth)
	var scrolledWidth = document.documentElement.scrollWidth
			- document.documentElement.offsetWidth;
	if (scrolledWidth > 2) // issue with ios/safari: scrollWidth is always 1
							// pixel more than offsetWidth. Hence, our algo to
							// check whether there is a horizontal scrollong or
							// not is failing there
		totalHeight += exilParms.scrollBarWidth;
	iframeElement.style.height = totalHeight + 'px'; // 16 px for possible
														// scroll bar. i will
														// have to figure out
														// how to squeeze this
														// out...
}

// April 19 2011 : Refactoring the page height reset - Exility App (End) :
// Aravinda
// Feb 04 2011 : Bug 2038 - automatic resize of page - Exility App (End) :
// Aravinda

function exilPageUnload() {
	P2.doneWith();
}

// called at onload time to center align the page
function centerAlign() {
	var tableWidth = document.getElementById('pageTable').offsetWidth;
	var bodyWidth = document.getElementsByTagName('body')[0].offsetWidth;
	var calcOffset = Math.floor((bodyWidth - tableWidth) / 2);
	document.getElementById('pageTable').style.position = 'relative';
	document.getElementById('pageTable').style.left = calcOffset;
	/*
	 * var tableHeight = document.getElementById('pageTable').offsetHeight;
	 * if(tableHeight < 500) { document.getElementById('pageTable').style.height =
	 * '500'; }
	 */
}

// IE has some security settings that stops a window from changing the URL of a
// subwindow!!
// so, setting it from within the window
function replaceLocation(url) {
	window.location.replace(url);
}

// used only when we would have set a field in error.
function fieldBlurred(e) {
	this.onblur = null;
	this.style.backgroundColor = obj.savedColor;
}

function handleError(error) {
	alert(error.getMessageText());
	if (error.obj)
		P2.makePanelVisible(error.obj);
}

// this is probably the trickiest function. when we call onreadystatechange on
// xmlhttpobject, I am just not able to
// get to the object that triggered it. Tried all kinds of things. Tried to see
// if an event is passed, or
// that the function is attached to the object, so tried 'this'. Nothing worked.
// Hence I am dynamically creating an anonymous function with hard coded value
// in that.
// And why am I doing it here, and not in serverAgent? Guess what, I do not get
// the window. function will have the
// window where it is defined (and hence it will execute in that window,
// irrespective of where it is triggered from
function getCallbackFunction(n) {
	return new Function('serverStub.httpCallBack(' + n + ');');
}

function getTwisterFunction(name) {
	return new Function("P2.twist(this,'" + name + "');");
}

function getTabFunction(tabName, containerName) {
	return new Function("P2.tabClicked(this,'" + tabName + "','"
			+ containerName + "');");
}

function getEventFunction(idx, fName) {
	return new Function('e', 'e = e || event; P2.eventListeners[' + idx
			+ '].obj.' + fName + '(e, e.target || e.srcElement);');
}
// quick search on list panel
function keyPressedOnQuickSearch(e) {
	if (!e)
		e = event;
	var ele = e.target || e.srcElement;
	// funciton qued back to ensure that ele.value is available for the function
	setTimeout("callQuickSearch('" + ele.id + "', '" + ele.searchTableName
			+ "');", 0);
}

function callQuickSearch(id, tableId) {
	var val = document.getElementById(id).value;
	var table = P2.getTable(tableId);
	PM.debug('going to quick search ' + tableId + ' with value ' + val);
	table.quickSearch(val);
}

// a table navigation action button is clicked. Note that this event function is
// attached by table.init()
function navigateTable(e) {
	if (!e)
		e = event;
	var ele = e.target || e.srcElement;
	if (!ele.tableName || !ele.navigationAction) {
		PM.debug('Button ' + ele.id
				+ ' does not have table/action associated with that');
		return;
	}
	P2.tables[ele.tableName].navigate(ele.navigationAction);
}
// NOTE : these are statements that are executed, and not part of any functions
// where is Exility? trace it and set
setPM();
// var P2 = new PM.ExilityPage(window); moved to meta for consistency
var serverStub = new PM.ExilityServerStub(window);
var exilParms = PM.exilParms;