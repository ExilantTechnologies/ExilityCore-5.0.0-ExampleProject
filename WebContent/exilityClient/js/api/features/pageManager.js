/*
 * File: pageManager.js
 * Description:
 * This file contains all objects and methods related to page navigation.
 */
var PM = window;
window.name = 'exilWin';
// on a navigation action that requires user to come back to the current page,
// we have to keep some info
var StackEntry = function(win, urlText, toReset, isPopup) {
	this.win = win;
	this.url = urlText;
	this.toReset = toReset;
	this.isPopup = isPopup;
	var b = window.document.body;
	var t = 0;
	var l = 0;
	if (b.scrollTop) {
		t = b.scrollTop;
		l = b.scrollLeft;
	} else if (win.pageYOffset) {
		t = win.pageYOffset;
		l = win.pageXOffset;
	} else if (b.parentElement && b.parentElement.scrollTop) {
		t = b.parentElement.scrollTop;
		l = b.parentElement.scrollLeft;
	}
	this.scrollTop = t;
	this.scrollLeft = l;
};

// ExilityPageStack is instantiated as a global object exilityPageStack. It
// keeps a stack of urls of succesive
// window navigations that need to be tracked back. That is when the current
// window says goBack, it should
// go back to the entry next to that...
var ExilityPageStack = function(win) {
	this.stack = new Array();
	this.activeWindows = new Object();
};

ExilityPageStack.prototype.push = function(entry) {
	this.stack.push(entry);
};

ExilityPageStack.prototype.pop = function() {
	return this.stack.pop();
};

ExilityPageStack.prototype.top = function() {
	var t = this.stack.length;
	if (t > 0)
		return this.stack[t - 1];
	return null;
};
ExilityPageStack.prototype.getEntry = function(index) {
	var t = this.stack.length;
	if ((t > 0) && (t > index))
		return this.stack[index];
	return null;
};

ExilityPageStack.prototype.goBack = function(win, fromReset) {
	if (!win)
		win = currentActiveWindow;
	var entry = this.pop();
	if (!entry) {
		if (!exilParms.homePage) {
			win.location.replace('about:blank');
			return;
		}
		win.location.replace(htmlRootPath + exilParms.homePage);
		window.scrollTo(0, 0);

		return win;
	}

	currentActiveWindow = entry.win;
	debug('currentActiveWindow set to ' + currentActiveWindow.location.href);
	if (entry.url) {
		if (!fromReset) {
			window.scrollTo(0, 0);
			win.location.replace(entry.url);
		}
	} else {
		window.scrollTo(0, 0);
		closeWindow(win);
		if (entry.isPopup) {
			uncoverPage(coverMainStyle);
			if (!fromReset) {
				if (entry.se)
					entry.win.serverAgent.callService(se);
				else {
					var p = entry.win.P2;
					if (p && p.reloadActionName)
						p.actions[p.reloadActionName].act();
				}
			}
		} else {
			showWindow(entry.win);
			if (entry.win.P2 && !fromReset)
				entry.win.P2.reload(entry.scrollLeft, entry.scrollTop);
		}
		if (entry.win.P2)
			entry.win.P2.setPageTitle();
	}
	return entry.win;
};

/*
 * goTo action depends on the mode, for which these are the possible values
 * defined in NavigationAction NavigationAction.REPLACE = 'replace'; //
 * NavigationAction.POPUP = 'popup'; NavigationAction.RETAIN_STATE =
 * 'retainState'; NavigationAction.RESET = 'reset';
 */
ExilityPageStack.prototype.goTo = function(win, mode, urlText, se, logicalName) {
	if (!win)
		win = currentActiveWindow;
	if (!win) {
		alert('Oooops where do you want me to go? There is NO window to go !!!');
		return null;
	}
	currentActiveWindow = win;
	// debug('currentActiveWindow set to ' + currentActiveWindow &&
	// currentActiveWindow.location.href);
	urlText = htmlRootPath + urlText;
	if (mode == NavigationAction.REPLACE) {
		if (logicalName)
			this.activeWindows[logicalName] = win;
		win.location.replace(urlText);
	} else if (mode == NavigationAction.POPUP) {
		var entry = new StackEntry(win, null, false, true);
		this.push(entry);
		if (se)
			entry.se = se;
		uncoverPage(coverPickerStyle);
		coverPage(coverMainStyle, imgMainStyle);
		currentActiveWindow = createWindow(urlText, true);
		debug('currentActiveWindow set to ' + currentActiveWindow.location.href);
		if (logicalName)
			this.activeWindows[logicalName] = currentActiveWindow;
	} else if (mode == NavigationAction.RETAIN_STATE) {
		this.push(new StackEntry(win, null, false));
		hideWindow(win);
		currentActiveWindow = createWindow(urlText, false);
		debug('currentActiveWindow set to ' + currentActiveWindow.location.href);
		if (logicalName)
			this.activeWindows[logicalName] = currentActiveWindow;
		uncoverPage(coverMainStyle);
	} else if (mode == NavigationAction.RESET) {
		this.push(new StackEntry(win, win.location.href, true));
		if (logicalName)
			this.activeWindows[logicalName] = win;
		win.location.replace(urlText);
	}
	// used only by Exis. Needs to be reviewed and redesigned
	else if (mode == NavigationAction.MENU_RESET) {
		/* since only home page needs to be pushed while resetting */
		if (this.stack.length == 0) {
			this.push(new StackEntry(win, win.location.href, true));
		}
		if (logicalName)
			this.activeWindows[logicalName] = win;
		win.location.replace(urlText);
	} else {
		message(
				'Design Error :Invallid window displosal mode recd by navigator : '
						+ mode, "Error", "Ok", null, null, null);
	}

	return win;
};

ExilityPageStack.prototype.resetStack = function(askOnChangedForm) {
	// current active window is what is visible, and the history is in the
	// stack. Over job is to remove all history, including current window, and
	// take user to home page.
	if (askOnChangedForm) {
		var p2 = currentActiveWindow && currentActiveWindow.P2;
		if (p2
				&& p2.lastModifiedNode
				&& p2.trackFieldChanges
				&& !window
						.confirm('You have modified some information on this page. Click OK to abandon editing, or CANCEL to go back')) {
			try {
				p2.lastModifiedNode.focus();
				p2.makePanelVisible(p2.lastModifiedNode);
			} catch (e) {
				//
			}
			return false;
		}
	}

	// let us keep popping up history and close window if required
	while (this.stack.length > 0) {
		var entry = this.stack.pop();
		if (entry.url) // entry.url implies that this was to be open in the
						// same window. No need to close it.
			continue;

		closeWindow(currentActiveWindow);
		if (!entry.isPopup)
			showWindow(entry.win);
		currentActiveWindow = entry.win;
	}
	// Clean this window as well
	/**
	 * PathFinder has been using resetStack and then goto with retainState open
	 * menu items. To provide backward compatibility for this, we have to avoid
	 * cleaning-up current window
	 */
	// currentActiveWindow.location.replace('about:blank');
	return true;
};

// more for tracing and debugging..
ExilityPageStack.prototype.showStack = function() {
	var str = 'Page History';
	if (!this.stack || this.stack.length == 0) {
		str += ' is empty ';
	} else {
		var stack = this.stack;
		for ( var i = 0; i < stack.length; i++)
			str += "\n" + (i + 1) + ". " + stack[i];
	}
	message(str, "", "Ok", null, null, null);
};

var getMessageText = function(dc) {
	return dc.getMessageText();
};

var confirmReset = function() {
	message('server reset', "", "Ok", null, null, null);
};

var HeaderMenu = function() {
	this.options = "directories=no, location=no, resizable=yes, menubar=no, status=no, titlebar=no, scrollbars=yes, toolbar=no";
	this.showVersion = function() {
		message("Version 1.21 released on date 20-Jan-09", "", "Ok", null,
				null, null);
	};

	this.resetServer = function() {
		var se = new ServiceEntry('internal.resetProject',
				new DataCollection(), true, confirmReset, null, null, false,
				true);
		exilityMainWindow.serverStub.callService(se);
	};

	this.startTrace = function() {
		if (!window.exilityTraceWindow || window.exilityTraceWindow.closed) {
			window.exilityTraceWindow = window.open(
					exilParms.baseHTMLFolderName + 'common/trace.htm', 'trace',
					this.options + ", left=0, top=0, height=500, width=600",
					true);
		}
		if (window.exilityTraceWindow)
			window.exilityTraceWindow.focus();
		else
			alert('Unable to open trace window because of pop-up blocker. You will not see trace information.');
	};

	this.traceClosed = function() {
		exilityTraceWindow = null;
	};

	this.startDataTrace = function() {
		if (!exilityDataTraceWindow)
			exilityDataTraceWindow = window.open(exilParms.baseHTMLFolderName
					+ 'common/datatrace.htm', 'datatrace', this.options
					+ ", left=0, top=0, height=500, width=600", true);
		exilityDataTraceWindow.focus();
	};
	this.datatraceClosed = function() {
		exilityDataTraceWindow = null;
	};

	this.startTestHarness = function() {
		window.testCaseToBeCaptured = true;
	};

	this.endTestHarness = function() {
		window.testCaseToBeCaptured = false;
	};

	this.showHtml = function() {
		var win = window.open('', '_blank');
		var doc = win.document;
		doc.write(currentActiveWindow.document.body.innerHTML);
		doc.close();
	};

	this.showData = function() {
		if (window.dataStore) // local data
		{
			var win = window.open('', '_blank');
			var doc = win.document;
			doc.write(dataStore.toHtml());
			doc.close();
			win.focus();
			return;
		}
		var p2 = currentActiveWindow.P2;
		if (!p2) {
			message(
					'Sorry, the current window is not an Exility window. Data can not be dumped',
					"", "Ok", null, null, null);
			return;
		}
		var win = window.open('', '_blank');
		var doc = win.document;
		doc
				.write('<h2>values</h2><table cellpadding="3" cellspacing="1" style="background-color:blue;"><tr style="background-color:gray"><th>Name</th><th>Value</th></tr>');
		for ( var fieldName in p2.fields) {
			var field = p2.fields[fieldName];
			if (field && !field.table) {
				var val = field.value;
				if (!val)
					val = "&nbsp;";
				doc.write('<tr style="background-color:silver"><td>'
						+ fieldName + "</td><td>" + val + "</td></tr>");
			}
		}
		doc.write("</table>");

		for ( var tableName in p2.tables) {
			doc
					.write("<br /><h2>"
							+ tableName
							+ '</h2><table cellpadding="3" cellspacing="1" style="background-color:blue;"><tr style="background-color:gray">');
			var table = p2.tables[tableName];
			var names = table.columnNames;
			var n = names.length;
			for ( var i = 0; i < n; i++)
				doc.write("<th>" + names[i] + "</th>");
			doc.write("</tr>");
			var m = table.grid.length;
			for ( var i = 1; i < m; i++) {
				var row = table.grid[i];
				if (!row || row.isDeleted)
					continue;
				doc.write('<tr style="background-color:silver">');
				for ( var j = 0; j < n; j++) {
					var val = row[j];
					if (!val)
						val = "&nbsp;";
					doc.write("<td>" + val + "</td>");
				}
				doc.write("</tr>");
			}
			doc.write('</table>');
		}
		doc.close();
		win.focus();

	};
	this.navigate = function(urlText) {
		exilityMainWindow.location.replace(exilParms.baseHTMLFolderName
				+ urltext);
	};
	this.showTester = function() {
		exilityPageStack.goTo(null, 'retainState', 'common/tester.htm', null,
				null);
	};

	// show cursor as cross-wire and sho current location for developrs to
	// measure pixels
	this.startCrossWire = function() {
		if (this.crossWired)
			return;
		if (!this.crossWireEle) {
			var ele = document.createElement('div');
			ele.style.position = 'fixed';
			ele.style.top = '1px';
			ele.style.left = '1px';
			ele.style.zIndex = 10;
			ele.style.cursor = 'resize';
			if (ele.addEventListener)
				ele.addEventListener('mousemove', showCoordinates, false);
			else
				ele.attachEvent('onmousemove', showCoordinates);
			ele.innerHTML = htmlForCrossWire;
			document.body.appendChild(ele);
			window.crossX = document.getElementById('crossX');
			window.crossY = document.getElementById('crossY');
			window.crossLineX = document.getElementById('crossLineX');
			window.crossLineY = document.getElementById('crossLineY');
			this.crossWireEle = ele;
		}
		this.crossWired = true;
		this.crossWireEle.style.display = '';
		crossLineX.style.width = this.crossWireEle.style.width = crossX.innerHTML = document.body.clientWidth
				+ 'px';
		crossLineY.style.height = this.crossWireEle.style.height = crossY.innerHTML = document.body.clientHeight
				+ 'px';
	};

	this.stopCrossWire = function() {
		if (!this.crossWired)
			return;
		this.crossWired = false;
		this.crossWireEle.style.display = 'none';
	};

	this.startIde = function() {
		var urlText = 'exilityClient/ez.htm';
		// this should be re-factored to get ExilityServerStub..
		var csr = window[ClientConstants.CSRF_HEADER];
		if (csr)
			urlText += '?' + csr;
		var win = window.open(urlText);
		if (!win) {
			alert('Unable to start IDE. window.open() failed, probably because of pop-up blocker issue.');
		} else {
			// allow IDE window to communicate with the this main window if
			// required..
			window.IDE_WINDOW = win;
			setTimeout(
					"try{window.IDE_WINDOW.PROJECT_WINDOW = window;}catch(e){}",
					1000);
		}

	};
};

var htmlForCrossWire = '<img id="crossLineY" src="images/blackDot.gif" style="width:1px;height:100px;position:absolute;top:1px;left:50px;valign:top;" /><img id="crossLineX" src="images/blackDot.gif" style="width:100px;height:1px;position:absolute;top:50px;left:1px;" /><span style="border:solid 1px blue; border-radius:4px; background-color:#EEEEEE; font-size:1.5em; margin-left:200px;"><img src="images/deleteIcon.png" alt="delete" style="cursor:pointer" onclick="headerMenu.stopCrossWire();" />&nbsp;&nbsp;X:<span id="crossX"></span>   Y:<span id="crossY"></span>&nbsp;&nbsp;</span>';
var showCoordinates = function(e) {
	if (!e)
		e = event;
	// ie8 and below: pageX is not available
	var x = e.pageX || e.clientX + document.body.scrollLeft;
	var y = e.pageY || e.clientY + document.body.scrollTop;
	crossX.innerHTML = x;
	crossY.innerHTML = y;
	// move the cross-wire
	crossLineX.style.top = e.clientY + 'px';
	crossLineY.style.left = e.clientX + 'px';
};

// debug is moved here as it is closely linked with the above
function debug(msg, alreadyAnHtml) {
	if (!exilityTraceWindow || !exilityTraceWindow.appendText)
		return;

	if (alreadyAnHtml) {
		exilityTraceWindow.appendText(msg);
		return;
	}
	msg = new String(msg);
	var msgs = msg.split("\n");
	for ( var i = 0; i < msgs.length; i++) {
		msg = msgs[i];
		if (msg.indexOf("error") >= 0 || msg.indexOf("Error") >= 0
				|| msg.indexOf("ERROR") >= 0)
			msg = '<font style="color:red;">' + msg + '</font>';
		else if (msg.indexOf("warning") >= 0 || msg.indexOf("Warning") >= 0
				|| msg.indexOf("WARNING") >= 0)
			msg = '<font style="color:blue;">' + msg + '</font>';
		else
			msg = msg.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
		exilityTraceWindow.appendText(msg);
	}
}

var datadebug = function(msg) {
	if (exilityDataTraceWindow == null)
		return;

	msg = "==============================================<br /><pre>"
			+ msg
			+ "</pre><br />==============================================<br />";
	exilityDataTraceWindow.appendText(msg);
};

var headerMenu = new HeaderMenu();
var exilityTraceWindow = null; // window where trace information is displayed
var exilityMainWindow = null; // set by the first page to point to the window
								// where the regualar pages are managed
var exilityPageStack = new PM.ExilityPageStack();
var exilityDataTraceWindow = null; // window where request / response dc is
									// displayed

// code moved from mainPage/index.htm here. This is to simplify
var inboxes = new Object(); // contins values to be passed to windows on load of
							// that window.
var urlField, urlArea, calWin, calElement, pickerWin, pickerEleStyle, mainBody, mainTop;
var coverMainStyle, coverPickerStyle, coverCalendarStyle, coverCalendarEle;
var imgMainStyle, imgPickerStyle, imgCalendarStyle, imgMainPrgIndStyle;
var htmlRootPath, topPath;
var lastWindowNumberUsed = 0;
var exilityMainWindow = null;
var globalFieldValues = new Object(); // global fields that act as default to
										// some commonly used fields
var currentActiveWindow = null;
var exilCombo, exilComboWin;
var toolTipEle, toolTipStyle;

var localServices = new Array();
var pageValidation = false;
var filesBeingUploaded = 0;

var mainLoaded = function() {
	IdentifyBrowser.init();
	if ((IdentifyBrowser.browser == "An unknown browser")
			|| (IdentifyBrowser.version == "an unknown version")) {
		// alert("The application is not supported on this Browser. Please use
		// IE 6 and above, firfox 3.0 and above or Safari ver 5 and above.");
		// window.close();
		// return;
	}

	exilityMainWindow = window.frames['mainZero'];
	if (exilityMainWindow) {
		exilityMainWindow.name = 'mainZero';
		currentActiveWindow = exilityMainWindow;
	}
	mainTop = document.getElementById('top');
	mainBody = document.documentElement;
	urlField = document.getElementById('url');
	urlArea = document.getElementById('urlSpan');
	calElement = document.getElementById('calendarElement');
	calWin = window.frames['calendarWindow'];
	pickerWin = window.frames['pickerWindow'];

	// we have several style variables. I am using a simple short-cut to create
	// all of them
	var styleNames = null;
	styleNames = [ [ 'pickerElement', 'pickerEleStyle' ],
			[ 'coverMain', 'coverMainStyle' ], [ 'imgMain', 'imgMainStyle' ],
			[ 'imgMainPrgInd', 'imgMainPrgIndStyle' ],
			[ 'coverPicker', 'coverPickerStyle' ],
			[ 'imgPicker', 'imgPickerStyle' ],
			[ 'coverCalendar', 'coverCalendarStyle' ],
			[ 'toolTip', 'toolTipStyle' ] ];

	for ( var i = 0; i < styleNames.length; i++) {
		var ele = document.getElementById(styleNames[i][0]);
		if (ele)
			window[styleNames[i][1]] = ele.style;
	}

	topPath = window.location.href;
	topPath = topPath.substring(0, (topPath.lastIndexOf('/') + 1));
	htmlRootPath = topPath + exilParms.baseHTMLFolderName;

	exilCombo = document.getElementById('exilComboFrame');
	exilComboWin = window.frames['exilComboFrame'];
	if (exilComboWin && exilParms.comboMaxRows)
		exilComboWin.comboMaxRows = exilParms.comboMaxRows;

	var src = exilParms.localResourceFolder;
	if (!src) {
		debug('If you intend to use local service, You MUST set exilParms.localResourceFolder to the root of the resource folder.');
	} else {
		src = src + 'localServiceList.xml';
		var xmlDoc = getLocalResource(src, true);
		if (!xmlDoc) {
			alert('Could not load ' + src + ' for a list of local services.');
			return;
		}
		var listOfLocalServices = xmlDoc.getElementsByTagName('serviceEntries')[0]
				.getElementsByTagName('serviceEntry');
		for ( var i = 0; i < listOfLocalServices.length; i++) {
			localServices[listOfLocalServices[i].getAttribute('name')] = listOfLocalServices[i];
		}
	}
};

var getLocalResource = function(urlText, asXmlDoc) {
	var p; // param to be supplied to call back function
	urlText = topPath + urlText;
	try {
		if (typeof (ActiveXObject) != 'undefined') {
			if (asXmlDoc) {
				p = new ActiveXObject("Msxml2.XMLHTTP.6.0");
				p.open('GET', urlText, false);
				p.send();
				var responseText = p.responseText;
				p = new ActiveXObject('Microsoft.XMLDOM');// 'Msxml2.DOMDocument.6.0'
				p.async = false;
				p.loadXML(responseText);
				if (!p.documentElement) {
					alert(urlText
							+ ' loaded into an empty document. Check for errors.\n'
							+ p.parseError);
					return;
				}
				return p.documentElement;
			}
			p = new ActiveXObject("Msxml2.XMLHTTP.6.0");
			p.open('GET', urlextT, false);
			p.send();
			return p.responseText;
		}
		p = new XMLHttpRequest();
		p.open('GET', urlText, false);
		p.send(null);
		p = asXmlDoc ? p.responseXML.documentElement : p.responseText;
		return p;
	} catch (e) {
		alert('Error while accessing ' + urlText + '\n' + e);
		return null;
	}
};

var htmlClicked = function() {
	urlArea.style.display = '';
	urlField.focus();
};
var goClicked = function() {
	// header menu is created as global with scope to this window. refer to
	// pageManager.HeaderMenu
	headerMenu.navigate(urlField.value);
	urlArea.style.display = 'none';
};

var showWindow = function(win) {
	var ele = document.getElementById(win.name + 'Div');
	if (ele)
		ele.style.display = '';
};

var hideWindow = function(win) {
	var ele = document.getElementById(win.name + 'Div');
	if (ele)
		ele.style.display = 'none';
};

var closeWindow = function(win) {
	if (!win)
		return;
	removeInbox(win.name);
	var ele = document.getElementById(win.name + 'Div');
	// alert(' I got ele as ' + (ele ? ele.id : " null") );
	win.location.href = 'about:blank';
	try {
		ele.parentNode.removeChild(ele);
	} catch (e) {
		//
	}
};

var createWindow = function(urlText, forPopUp) {
	lastWindowNumberUsed++;
	var nam = 'main' + lastWindowNumberUsed;
	var div = document.createElement('DIV');
	div.id = nam + 'Div';
	var popUp = 'style="width: 1028px; height: 570px;"';
	if (forPopUp) {
		// Typically, the popped-up window positioning will be part of that
		// window. that is, once the page opens,
		// it will resize and reposition itself. This results in users seeing
		// the window getting moved and resized.
		// to avoid this, we hide this div. All exility pages are aware of this,
		// and they take appropriate step.
		// However, if the opened page is a non-exility page, then it should
		// include the following statement in its onload function
		// window.top.document.getElementById(window.name + 'Div').style.display
		// = 'block';
		div.style.display = 'none';
		popUp = ' style="border:solid 0px #E8E8E8;position:absolute; z-index:2; background-color: #FFF;  -webkit-box-shadow: 0px 8px 32px rgba(0,0,0,0.5);-webkit-border-radius: 5px;-moz-box-shadow: 0px 8px 32px rgba(0,0,0,0.5);-moz-border-radius: 5px;" ';
		addToInbox(nam, 'isAPopup', true);
	}
	div.innerHTML = '<iframe id="' + nam + '" name="' + nam + '" src="'
			+ urlText + '" frameborder="0" marginheight="0" marginwidth="0" '
			+ popUp + '></iframe>';
	mainTop.appendChild(div);
	debug('New window created with name=' + nam);
	return window.frames[nam];
};

var getInbox = function(win) {
	var inbox = inboxes[win.name];
	if (inbox) {
		for ( var varName in inbox)
			win[varName] = inbox[varName];
	}
};

var addToInbox = function(boxName, fieldName, val) {
	var box = inboxes[boxName];
	if (!box) {
		box = new Object();
		inboxes[boxName] = box;
	}
	box[fieldName] = val;
};

function removeInbox(boxName) {
	inboxes[boxName] = null;
}

function resetWindowSize(win, w, h, top, left, donotscroll) {
	if (!donotscroll) {
		window.scrollTo(0, 0);
		win.scrollTo(0, 0);
	}
	if (!w && !h)
		return;
	var ele = document.getElementById(win.name);
	if (!ele) {
		if (win.parent.name.match("^main") == 'main') {
			return;
		}
		debug('DESIGN ERROR:' + win.name + ' is not a valid window element ',
				"Error", "Ok", null, null, null);
		return;
	}
	// alert('window name is ' + win.name + ' and I got an ele whose id is ' +
	// ele.id + ' and I am going to set its width=' + w + ' height=' + h + '
	// top=' + top + ' left=' + left );
	var s = ele.style;
	// alert(' w=' + w + ' width=' + s.width + ' and h=' + h + ' height=' +
	// s.height);

	if (w) {
		if (exilParms.showPageWidthInPercentage && win.name != "pickerWindow") {
			s.width = "100%"; // allow page width to fit in %
		} else {
			s.width = w + 'px'; // fix width in px when
								// showPageWidthInPercentage=false
		}
	}

	if (h)
		s.height = h + 'px';
	if (top)
		s.top = top + 'px';
	if (left)
		s.left = left + 'px';
}

var IdentifyBrowser = {
	init : function() {
		this.browser = this.searchString(this.browserIds)
				|| "An unknown browser";
		this.version = this.searchVersion(navigator.userAgent)
				|| this.searchVersion(navigator.appVersion)
				|| "an unknown version";
	},
	searchString : function(data) {
		for ( var i = 0; i < data.length; i++) {
			var dataString = data[i].string;
			var dataProp = data[i].prop;
			this.versionSearchString = data[i].versionSearch
					|| data[i].identity;
			if (dataString) {
				if (dataString.indexOf(data[i].subString) != -1)
					return data[i].identity;
			} else if (dataProp)
				return data[i].identity;
		}
	},
	searchVersion : function(dataString) {
		var index = dataString.indexOf(this.versionSearchString);
		if (index == -1)
			return;
		return parseFloat(dataString.substring(index
				+ this.versionSearchString.length + 1));
	},
	browserIds : [ {
		string : navigator.userAgent,
		subString : "Firefox",
		identity : "Firefox"
	}, {
		string : navigator.userAgent,
		subString : "MSIE",
		identity : "Explorer",
		versionSearch : "MSIE"
	}, {
		string : navigator.vendor,
		subString : "Apple",
		identity : "Safari",
		versionSearch : "Version"
	}

	]
};

var codePickerLeft = -1;
var codePickerTop = -1;
var fileUploadData = null;

// support multiple active windows instead of stack. Navigation actions are not
// allowed in this case. Each window is opened and closed!!!
// labelEle is the dom element that displays all labels of tabbed windows.
// windowsEle is the dom element to which we keep adding iframe elements
function TabbedWindows(labelsEle, windowsEle, homeUrl) {
	// for onclick function, we need to refer to this object. I have a
	// convoluted design as of now.
	// I am forcing a variable called tabbedWindows in the window that creates
	// an instance of this object
	// var win = labelsEle.ownerDocument.defaultView;
	// if (win.tabbedWindows)
	// {
	// debug('window already had a tabbedWinidows variable. Replacing it');
	// }
	// window.tabbedWindows = this;
	this.labelsEle = labelsEle;
	this.windowsEle = windowsEle;
	this.windows = {};
	this.names = [];
	this.nbrWindows = 0;

	// click on a label should show corresponding window
	if (labelsEle.addEventListener)
		labelsEle.addEventListener('click', tabbedWindowLabelClicked, false);
	else
		labelsEle.attachEvent('onclick', tabbedWindowLabelClicked);
	// start with sweet home..
	if (homeUrl)
		this.addWindow(homeUrl, this.HOME_NAME, 'Home');
}

var a = TabbedWindows.prototype;
a.ACTIVE_ATTR = 'exil-active';
a.NAME_ATTR = 'exil-name';
a.TAB_CLASS = 'winTab';
a.TAB_LABEL_CLASS = 'winTabLabel';
a.TAB_DELETE_CLASS = 'winTabDelete';
a.HOME_NAME = '_';
a.NAME_PREFIX = 'window_';
/*
 * Add a window. url to open in a unique named window. Label is for user to
 * identify this window
 */
a.addWindow = function(urlText, windowName, label) {
	var w = this.windows[windowName];
	if (w) // a window with this name already exists
	{
		if (w.url == urlText) {
			debug(windowName
					+ " is already open. shifting focus to that window");
			this.showWindow(windowName);
			return w;
		}
		debug(windowName + ' is already used for ' + w.url
				+ '. Can not create a new window with this name for ' + urlText);
		return null;
	}

	// create an iframe for this window
	var winEle = document.createElement('div');
	winEle.style.display = 'none';
	var frameName = this.NAME_PREFIX + windowName;
	winEle.innerHTML = '<iframe class="tabbedWindow" id="' + frameName
			+ '" name="' + frameName + '" src="' + urlText
			+ '" frameborder="0" marginheight="0" marginwidth="0"></iframe>';
	winEle.id = frameName + 'Div';
	this.windowsEle.appendChild(winEle);
	var win = window.frames[frameName];
	// a tab label for this window <div><div for label/><div for */></div>
	var labelEle = document.createElement('div');
	labelEle.className = this.TAB_CLASS;
	var html = '<div class="' + this.TAB_LABEL_CLASS + '">' + label + '</div>';
	if (windowName != '_') // home can not be deleted
		html += '<div class="' + this.TAB_DELETE_CLASS + '"/>';
	labelEle.innerHTML = html;
	labelEle.setAttribute(this.NAME_ATTR, windowName);
	this.labelsEle.appendChild(labelEle);
	// TODO: if there is not enough space? We will have to show <- and -> kind
	// of icon etc...
	// create and index a window object
	var n = this.names.length;
	this.windows[windowName] = w = {
		win : win,
		labelEle : labelEle,
		name : windowName,
		winEle : winEle,
		idx : n
	};
	this.names[n] = windowName;
	this.nbrWindows++;
	this.showWindow(windowName);
};

// show this window. We have to hide existing window and show this one.
a.showWindow = function(windowName) {
	var w = this.windows[windowName];
	if (!w) {
		alert('Design error: Trying to show a window that does ot exists -'
				+ windowName);
		return;
	}
	if (this.currentWin) {
		if (w === this.currentWin)
			return;

		this.currentWin.labelEle.removeAttribute(this.ACTIVE_ATTR);
		this.currentWin.winEle.style.display = 'none';
	}

	this.currentWin = w;

	w.labelEle.setAttribute(this.ACTIVE_ATTR, this.ACTIVE_ATTR);
	w.winEle.style.display = '';
	w.win.focus();
};

a.getFirstWindow = function() {
	if (!this.nbrWindows)
		return null;
	for ( var i = 0; i < this.names.length; i++) {
		if (this.names[i])
			return this.windows[this.names[i]];
	}
	alert('design error: tabbedWindows in not keeping track of its windows');
	return null;
};

a.removeWindow = function(winName, noNeedToConfirm) {
	var w = this.windows[winName];
	if (!w) {
		debug(winName + ' is not a tabbed window to be removed.');
		return null;
	}

	if (w.isModified && !noNeedToConfirm) {
		message("Do you want Abandon changes?", null, 'Abandon Changes',
				abandonChanges, 'No. Take me back to window', undoClick, w, w);
		// remember message() is asynch. Which means, you get back control as
		// the message is still waiting for an action from user
		return;
	}

	var nextWin = this.getFirstWindow();
	if (nextWin)
		this.showWindow(nextWin.name);
	// nextWin would be empty if the last window is closed, and there is no
	// home. We will not handle that situation as of now
	w.win.location.replace('about:blank'); // better garbage collection
	this.labelsEle.removeChild(w.labelEle);
	this.windowsEle.removeChild(w.winEle);
	delete this.windows[winName];
	delete this.names[w.idx];
	this.nbrWindows--;
};
// called from event handler
a.labelClicked = function(ele) {
	var winName = ele.getAttribute(this.NAME_ATTR)
			|| ele.parentNode.getAttribute(this.NAME_ATTR);
	if (!winName) {
		alert('Design Error: window tabs click handler is unabel to get window name');
		return;
	}
	if (ele.className == this.TAB_DELETE_CLASS)
		this.removeWindow(winName);
	else
		this.showWindow(winName);
};

// called from P2 when a window becomes dirty or is reset.
a.setModifiedStatus = function(frameName, isModified) {
	var winName = frameName.substr(this.NAME_PREFIX.length); // remove
																// 'window_'
																// from the name
	var w = this.windows[winName];
	if (!w) {
		alert('tabbedWindows.setModifiedStatus called with invalid window name '
				+ winName);
		return;
	}
	if (w.isModified) {
		if (!isModified) {
			w.labelEle.removeAttribute(this.MODIFIED_ATTR);
			w.isModified = false;
		}
		return;
	}
	if (isModified) {
		w.labelEle.setAttribute(this.MODIFIED_ATTR, this.MODIFIED_ATTR);
		w.isModified = true;
	}
};

// event function when window tab is clicked
function tabbedWindowLabelClicked(e) {
	var ele = e.target || e.srcElement;
	var win = ele.ownerDocument.defaultView;
	win.tabbedWindows.labelClicked(ele);
}

// funciton passed to message to be triggered when user clicks on Abandon
function abandonChanges(win) {
	tabbedWindows.removeWindow(win.name, true);
}

function undoTabClick(win) {
	debug(win.name
			+ ' was modified. User was about to close it, and then changed her mind');
}
/*******************************************************************************
 * PURPOSE: Sometimes a request to the Exility server side will result in a
 * background job. The server side task will initiate a background process and
 * return immediately. As of now, Exility returns the ID of the newly created
 * job. Additionally, it also returns the status of each job (running,done).
 * Lastly, one can also query the server side for a specific job's status.
 * 
 * This section is to take care of work with Exility background job statuses
 ******************************************************************************/
PM.backgroundJobs = new BackgroundJobs();

/**
 * Change the language in a multi-lingual application. conmventioin : if "htm/"
 * is baseHtmlFolderName, then the root folder for kannada, say, is
 * "htm-kannada/"
 */
var setLanguage = function(language) {
	if (exilityPageStack.resetStack(true) == false)
		return;
	var folderName = exilParms.baseHTMLFolderName;
	if (language) {
		var n = folderName.length;
		folderName = folderName.substring(0, n - 1);
		folderName += '-' + language + '/';
	}
	htmlRootPath = topPath + folderName;
};
