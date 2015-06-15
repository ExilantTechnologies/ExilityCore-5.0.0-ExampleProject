/* *****************************************************************************
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
 * our menu items. Exility is used to render menu
 */
var ez = (function() {

	/*
	 * all constants used by me
	 */
	var MENU_ITEMS = null;
	/***************************************************************************
	 * MENU_ITEMS = [ [ 'id', 'parentId', 'name', 'value' ], [ 'm1', null, 'Core
	 * Components', 'Core Components' ], [ 'm2', null, 'Client Side', 'Client
	 * Side' ], [ 'm3', null, 'Server Side', 'Server Side' ], [ 'm4', null,
	 * 'Admin', 'Admin' ], [ 'm5', null, 'Demo', 'Demo' ], [ 'm6', null,
	 * 'Workflow', 'Workflow Test' ], [ 'm1.1', 'm1', 'App Parameters',
	 * 'ide/applicationParameter.htm' ], [ 'm1.2', 'm1', 'Data Type',
	 * 'ide/dataType.htm' ], [ 'm1.3', 'm1', 'Data Element',
	 * 'ide/dataElement.htm' ], [ 'm1.4', 'm1', 'Message', 'ide/message.htm' ], [
	 * 'm2.1', 'm2', 'Page', 'alert("Page is not ready yet")' ], [ 'm3.1', 'm3',
	 * 'Service', 'alert("We are working on Service...");//ide/service.htm' ], [
	 * 'm3.2', 'm3', 'SQL', 'alert("SQl is almost ready. we have to build just
	 * the client side and the server side :-)");' ], [ 'm3.3', 'm3', 'Table',
	 * 'ide/db.htm' ], [ 'm4.1', 'm4', 'Generate Page', 'ide/generatePage.htm' ], [
	 * 'm4.2', 'm4', 'Generate DataTypes', 'ide/generateDataTypes.htm' ], [
	 * 'm4.3', 'm4', 'Generate Labels File', 'ide/generateLabels.htm' ], [
	 * 'm4.4', 'm4', 'Temp - Test', 'ide/temp.htm' ], [ 'm4.5', 'm4', 'Junk',
	 * 'demo/autoPanel.htm' ], [ 'm5.1', 'm5', 'Chart Fields', 'demo/chart.htm' ], [
	 * 'm5.2', 'm5', 'Chart Panels', 'demo/chartPanel.htm' ], [ 'm6.1', 'm6',
	 * 'Workflow', 'workflow/workflow.htm' ] ];
	 **************************************************************************/
	MENU_ITEMS = [ [ 'id', 'parentId', 'name', 'value' ],
			[ 'm4', null, 'Admin', 'Admin' ],
			[ 'm4.1', 'm4', 'Generate Page', 'ide/generatePage.htm' ],
			[ 'm4.2', 'm4', 'Generate DataTypes', 'ide/generateDataTypes.htm' ] ];

	var RESET_SERVICE = 'internal.resetService';
	var MENU_ID = 'ezMenu';
	var MENU_NAME = 'navMenu';
	var MENU_TYPE = 'top';
	var QUICK_MENU_ID = 'quickMenu';
	var HOME_PAGE_NAME = 'ide/home.htm';
	var INVALID_SCRIPT = 'Invalid script attached to menu item.';
	var PROJECT_RESET = 'Project is reloaded with latest resources.';
	var RESET_FAILED = 'Project coudl not be reloaded because of an eror on the server.';
	var APP_ID = "hdrAppName";

	/**
	 * updates are disabled by default. Our common script looks at this variable
	 */
	var disableResourceUpdates = true;

	/**
	 * agent thru whom we contact server. This is initialized onload.
	 */
	var myServerAgent = null;

	/**
	 * go to a specific page. Called normally on click of a menu item
	 * 
	 * @param pageName
	 */
	var goToPage = function(pageName) {
		if (!pageName)
			return;

		if (pageName.indexOf('(') > 0) // it is actually a javaScript..
		{
			try {
				eval(pageName);
			} catch (e) {
				alert(INVALID_SCRIPT + '\n' + pageName);
			}
			return;
		}

		/**
		 * exilityPageStack is a global variable exposed by Exility. Refer to
		 * pageManager.js
		 */
		exilityPageStack.resetStack();
		var win = exilityPageStack.goTo(null, NavigationAction.REPLACE,
				pageName);

		/**
		 * do we disable save option in this?
		 */
		if (disableResourceUpdates) {
			win.addEventListener('load', function() {
				var ele = document.getElementById('save');
				if (ele) {
					ele.style.display = 'none';
					alert('Save silenced');
				} else {
					alerrt('Save option not found in this page');
				}
			}, true);
		}
	};

	return {
		/**
		 * onload function of this page
		 */
		indexLoaded : function() {
			var menu = new Tree(MENU_ID);
			menu.buildFromArray(MENU_ITEMS, true);
			menu.createMenu(MENU_NAME, MENU_TYPE, goToPage, QUICK_MENU_ID);
			this.goHome();
			myServerAgent = new ExilityServerStub(window);
			var qry = window.location.search;
			if (qry) {
				qry = qry.substr(1); // get rid of ?
				myServerAgent.setCsrfToken(qry);
			}
			/*
			 * set version
			 */
			document.getElementById(APP_ID).title = "Version : "
					+ getExilityVersion();

		},
		/**
		 * always love to do this
		 */

		goHome : function() {
			goToPage(HOME_PAGE_NAME);
			setPageTitle('Home');
		},

		/**
		 * if messages, data type or dictionary is changed, project has to be
		 * reset to flush cached components
		 */
		resetProject : function() {
			var dc = serverStub.getResponse(RESET_SERVICE);
			if (dc.success)
				message(PROJECT_RESET);
			else
				message(RESET_FAILED);
		}
	};

})();

/**
 * Exility API looks for a function by name relogin. This is called whenever a
 * call to server fails because of authentication.
 */
var relogin = function(dc, se) {
	alert('Please login to your application in the other tab and then use this IDE.');
};

/**
 * cache the dom ele
 */
var pageTitleEle = null;

/**
 * individual pages that get loaded in the iFrame may ask home page to show
 * their title as the title of the whole mage
 */
var setPageTitle = function(pageTitle) {
	if (pageTitleEle == null) {
		pageTitleEle = document.getElementById('pageTitle');
	}
	if (pageTitleEle) {
		pageTitleEle.innerHTML = htmlEscape(pageTitle);
	}
};
