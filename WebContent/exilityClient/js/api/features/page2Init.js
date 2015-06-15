/*
 * file : page2Init.js
 * 
 * this file has methods of P2 that are used to initialize it after loading the
 * page. .init() is the entry method. This is called from exilPageLoad() which
 * itself is called as part of onload event handler for every page.
 */

/**
 * called on page load from exilPageLoad() (inside exilityLoader.js). Note that
 * page.meta.js would have completed loaded, and hence all the component models
 * are all loaded before calling this method
 */
a.init = function() {
	/*
	 * has this project a function to set page title some where outside this
	 * page? We look for presence of specific function. This is to be set by
	 * project in their myProject.js
	 * 
	 * Also, note that we are not using this.win. setPageTitle() is to be loaded
	 * into the page where Exility is loaded
	 */
	if (window.setPageTitle) {
		window.setPageTitle(this.title);
	}

	/*
	 * we allow page designer to enable and disable action buttons when user
	 * edits anything/resets. For example, in an editable panel, only
	 * close-option is enabled in the beginning, but once user edits anything,
	 * close is disabled, and save-button and cancel-button could be enabled. We
	 * use the same array to keep dom elements instead of element names
	 */
	if (this.buttonsToEnable) {
		for ( var i = 0; i < this.buttonsToEnable.length; i++) {
			this.buttonsToEnable[i] = this.doc
					.getElementById(this.buttonsToEnable[i]);
		}
	}
	if (this.buttonsToDisable) {
		for ( var i = 0; i < this.buttonsToDisable.length; i++) {
			this.buttonsToDisable[i] = this.doc
					.getElementById(this.buttonsToDisable[i]);
		}
	}

	/*
	 * it is possible that a regular page is also used as a "picker window", but
	 * some options could be hidden
	 */
	if (this.buttonsToHideForPicker && this.win.name == "pickerWindow") {
		for ( var i = 0; i < this.buttonsToHideForPicker.length; i++) {
			this.doc.getElementById(this.buttonsToHideForPicker[i]).style.display = 'none';
		}
	}

	var listServiceGrid = this.getGridForListeners(this.listServices);
	var reportServiceGrid = this.getGridForListeners(this.reportServices);
	/*
	 * tables need to be initialized at this stage
	 */
	for ( var tableName in this.tables) {
		var tbl = this.tables[tableName];
		if (tbl.init) {
			tbl.init();
		}
	}

	/*
	 * linked tables are to be initialized after loading the page, as they
	 * manipulate dom
	 */
	if (this.hasLinkedTables) {
		for ( var tableName in this.tables) {
			var table = this.tables[tableName];
			if (table.linkedTableName || table.mergeWithTableName
					|| table.nestedTableName) {
				table.createLinks();
			}
		}
	}

	/*
	 * view related operations are done. Let us start the data part
	 */

	/*
	 * what parameters we are called with. Since actions to be fired depends on
	 * page parameters, this method also decides that and returns
	 */
	var actions = this.processPageParameters();

	/*
	 * We have designed an in-box concept utilizing the fact that the top window
	 * is always there, while pages keep changing inside iframes. Calling page
	 * uses PM.addToInbox() to add name-value pairs. These variables are set as
	 * global (window level) variables in this page when we call getInbox()
	 * method
	 */
	PM.getInbox(this.win);

	/*
	 * fire list and report services
	 */
	if (listServiceGrid) {
		this.callListService(listServiceGrid, null, null, null, null, null,
				true);
	}

	if (reportServiceGrid) {
		this.callReportService(reportServiceGrid, null);
	}

	/*
	 * it is also possible for the calling page to pass a dc that is to be used
	 * as data source for this page on load.
	 */
	if (window.passedDc) {
		this.refreshPage(window.passedDc);
		window.passedDc = null;
	}

	/*
	 * exility pages are hidden by default. If some data needs to be rendered on
	 * load, our design is to fetch data from server, render the page, and then
	 * make it visible
	 */
	if (actions) {
		/*
		 * what if there are several services. When should we make the page
		 * visible? It is not gauranteed that the servr calls will return in the
		 * same order, bit that is more likley, and hence we are showing the
		 * page after the last action
		 */
		var n = actions.length;
		var lastAction = actions[n - 1];
		this.actions[lastAction].showPage = true;
		for ( var i = 0; i < n; i++) {
			this.act(this.doc.body, 'body', actions[i], null, true);
		}
	} else {
		this.showPage();
	}

	/*
	 * some projects want client to control session-out and warn the user etc..
	 * Reset that timer to 0, as this is the beginning of a page
	 */
	if (window.resetInactiveTimer) {
		window.resetInactiveTimer();
	}
};
/**
 * look at the parameters being received as part of URL against what is designed
 * for this page. Validate these parameters and return the actions that needs to
 * be taken based on the parameters
 * 
 * @returns action to be taken. This would be page.onLoadActionNames, or
 *          onModifyModeActionNames or null
 */
a.processPageParameters = function() {
	var params = this.pageParameters;
	if (!params) {
		return this.onLoadActionNames;
	}
	/*
	 * do we have to worry about pageMode?
	 */
	var toLookForKeyField = this.pageMode != null;

	/*
	 * passed query fields
	 */
	var qryFields = queryFieldsToCollection(this.win.location.search);

	var nbrParams = 0;
	for (p in params) {
		var param = params[p];
		var val = qryFields[p];
		if (!val) {
			val = param.defaultValue;
		}
		if (!val) {
			if (toLookForKeyField && param.isPrimaryKey) {
				/*
				 * key not given means user is going to create a new row. add
				 * mode.
				 */
				this.pageMode = 'add';
				toLookForKeyField = false;
				continue;
			}
			if (param.isRequired) {
				message(
						'Internal error: '
								+ p
								+ ' is a required parameter for this page. It is not passed by the caller.',
						"Error", "Ok", null, null, null);
			}
			continue;
		}
		if (param.dataType) {
			try {
				var dt = dataTypes[param.dataType];
				if (dt) {
					val = dt.validate(val);
				}
			} catch (e) {
				message('Internal error: This page is called with ' + p + ' = '
						+ val + '. This is not a valid value.' + e.messageText,
						"Error", "Ok", null, null, null);
				continue;
			}
		}
		/*
		 * set this parameter to the right field
		 */
		if ('pageheader' == param.name) {
			var hdr = this.doc.getElementById('pageheader');
			if (hdr) {
				hdr.innerHTML = param.value;
			}
		} else {
			this.setFieldValue((param.setTo ? param.setTo : p), val, null,
					null, null, null, null, true);
		}
		/*
		 * store the value. We may require it any time...
		 */
		param.value = val;
		nbrParams++;
	}

	/*
	 * page designer may insist on receiving minimum number of parameters
	 */
	if (this.minParameters && nbrParams < this.minParameters) {
		message(
				'This page is to be invoked with '
						+ this.minParameters
						+ ' parameters. Only '
						+ nbrParams
						+ 'parameters are passed. This is a set-up problem. This page may not work properly',
				"Error", "Ok", null, null, null);
		return null;
	}

	/*
	 * do we have to act on some actions? Which ones?
	 */
	if (this.pageMode == 'modify') {
		if (this.fieldsToDisableOnModifyMode) {
			this.ableFields(this.fieldsToDisableOnModifyMode, false);
		}
		return this.onModifyModeActionNames;
	}

	if (this.minParametersToFireOnLoad
			&& nbrParams < this.minParametersToFireOnLoad) {
		return null;
	}

	return this.onLoadActionNames;
};

/**
 * put the service names and keys in an a grid with header and two columns. This
 * is the form in which it is to be sent to server along with a request for
 * ListService or ReportService
 * 
 * @param serviceListeners
 *            listeners registered for this service
 * @returns appropriate grid, or null if no requests needs to be made on load
 */
a.getGridForListeners = function(serviceListeners) {
	if (!serviceListeners) {
		return null;
	}

	var grid = [ [ 'serviceId', 'keyValue' ] ];
	for ( var x in serviceListeners) {
		var listeners = serviceListeners[x];
		var aRow = [ listeners.serviceId,
				listeners.keyValue ? listeners.keyValue : '' ];
		/*
		 * we push this if at least one of the listeners on this service wants
		 * it right away
		 */
		var toPush = false;
		for ( var i = 0; i < listeners.length; i++) {
			var field = listeners[i];
			field.obj = this.doc.getElementById(field.name);
			if (!field.obj) {
				debug('DESIGN ERROR: '
						+ field.name
						+ ' could not get its dom element at the time of regestering for list service');
				continue;
			}

			if (!field.noAutoLoad) {
				toPush = true;
			}
		}
		if (toPush) {
			debug('pushing a listService request for ' + aRow);
			grid.push(aRow);
		}
	}
	return grid;
};

/**
 * we are done with all activities on load, including any data being fetched
 * from server onload. Let us now make the page visible
 */
a.showPage = function() {
	/*
	 * our page is inside an iframe. iframe is part of a div on the index page.
	 * We have to adjust the position and size of that div to display this page
	 */
	/*
	 * page designer might have given height and width
	 */
	var ht = this.pageHeight;
	var wd = this.pageWidth;
	var tp = 0;
	var lft = 0;
	var frameEle = null;
	/*
	 * is this a pop up?
	 */
	if (this.win.name == "pickerWindow" || this.win.isAPopup) {
		/*
		 * if thi sproject has a 'loading' element, we have to hide that first
		 */
		var loadingEle = document.getElementById('loading');
		if (loadingEle) {
			loadingEle.style.display = 'none';
		}
		/*
		 * dimensions are to be over-ridden for popup
		 */
		if (this.popupHeight) {
			ht = this.popupHeight;
		}
		if (this.popupWidth) {
			wd = this.popupWidth;
		}
		if (this.popupLeft) {
			lft = this.popupLeft;
		}
		if (this.popupTop) {
			tp = this.popupTop;
		}

		/*
		 * further customization if this pop up is for picker codePickerLeft and
		 * codePickerTop are to be set by the project as a global variable in
		 * the indexPage.
		 */
		if (this.win.name == "pickerWindow") {
			if (PM.codePickerLeft && PM.codePickerLeft != -1) {
				lft = PM.codePickerLeft;
			}
			if (PM.codePickerTop && PM.codePickerTop != -1) {
				tp = PM.codePickerTop;
			}

			pickerEleStyle.left = lft + "px";
			pickerEleStyle.top = tp + "px";
			pickerEleStyle.display = '';
		} else {
			var parentDiv = this.win.parent
					&& this.win.parent.document.getElementById(this.win.name
							+ 'Div');
			if (parentDiv) {
				parentDiv.style.display = '';
				parentDiv.style.position = 'absolute';
				parentDiv.style.zIndex = '2';
				/*
				 * feature to center-align pop-up
				 */
				if (exilParms.alignPopupWindow) {
					frameEle = document.getElementById(this.win.name);
					var currWidth = this.popupWidth;
					if (!currWidth)
						currWidth = this.pageWidth;
					var calculatedPopupLeft = (parseInt(document.body.offsetWidth) - parseInt(currWidth)) / 2;
					lft = parseInt(calculatedPopupLeft);
					if (lft) {
						parentDiv.style.left = '0px';
						frameEle.style.left = lft + 'px';
					}

				} else {
					if (lft > 0) {
						parentDiv.style.left = lft + 'px';
					} else {
						parentDiv.style.left = '100px';
					}
				}
				if (tp > 0) {
					parentDiv.style.top = tp + 'px';
				} else {
					parentDiv.style.top = '100px';
				}
			}
		}
	}

	if (this.win.name == "pickerWindow") {
		resetWindowSize(this.win, wd, ht, tp, lft, true);
	} else {
		resetWindowSize(this.win, wd, ht, tp, lft);
	}
	/*
	 * Let the page show-up now. Note:
	 */
	this.doc.body.style.display = '';

	/*
	 * posiiton cursor on first editable field
	 */
	if (this.firstField) {
		var ele = this.doc.getElementById(this.firstField.name);
		if (ele && ele.focus) {
			try {
				ele.focus();
				if (field.isAssisted) {
					ele.select();
				}
			} catch (e) {
				//
			}
		}
	}

	if (this.fieldsToHideOnLoad && this.fieldsToHideOnLoad.length != 0)
		this.hideOrShowPanels(this.fieldsToHideOnLoad, 'none');

	/*
	 * because of our iframe approach, we may end-up with double scroll-bar on
	 * right. We are unable to get the right event for fixing that. Hence you
	 * will see the following trigger at many places
	 */
	this.win.checkIframeSize();
};
