/*
 * file : page3ActionRelated.js
 * 
 * act() is the only method directly related to action.
 */

/**
 * main method for action. We take care of common work across all actions, and
 * delegate the actual action to the relevant action object.
 * 
 * parameter order is bit odd, but that has history!! I woudl have loved to have
 * actionName as the first parameter, so that most callers could simply ignore
 * other parameters. You will frequently see a snippet P2.act(null, null,
 * actionName) in page specific scripts.
 * 
 * @param obj :
 *            dom object that triggered this action.
 * @param fieldName
 *            that triggered this action
 * @param actionName
 *            to be acted upon
 * @param param
 *            depending on the context, different sets of parameters are passed
 *            to the action.
 * @param actionOnLoad
 *            true if this action is part of onload actions. This need to passed
 *            to some MVC methods for them to avoid perpetual event triggers
 * 
 */
a.act = function(obj, fieldName, actionName, param, actionOnLoad) {
	debug(actionName + ' invoked as an action with obj=' + obj + ' fieldName='
			+ fieldName);
	/*
	 * exis specific code injected to avoid some clumsy design there..
	 */
	var msgDiv = document.getElementById('warningMsg');
	if (msgDiv) {
		msgDiv.style.display = 'none';
	}

	/*
	 * custom solution to avoid some action being taken on fields. 'eleDisabled'
	 * attribute is set to fields that should not trigger actions. we would have
	 * loved to change this to HTML5 standard data-xxxxxxx, but our programmers
	 * have used this in their code :-(
	 */
	if (obj && obj.type
			&& obj.getAttribute(this.DISABLED_ATTRIBUTE_NAME) == 'true') {
		return;
	}

	var action = this.actions[actionName];
	if (!action) {
		debug('action ' + actionName + ' is not a valid action');
		return;
	}

	/*
	 * do we need to warn the user and take confirmation before proceeding?
	 * Typically used to abandon changes.
	 */
	if (action.warnIfFormIsModified) {
		/*
		 * has this project or the page enabled this feature?
		 */
		if ((exilParms.trackFieldChanges == true)
				|| (exilParms.trackFieldChanges == false && this.trackFieldChanges == true)) {
			/*
			 * is the form modified?
			 */
			if (this.lastModifiedNode) {
				/*
				 * call back functions could have been defined using closure to
				 * carry context, but then we coded this long time back :-(
				 * Hence, we store the context in a global object that the
				 * call-back functions pageActionActAfterMessageOk and
				 * pageActionActAfterMessageNotOk will use
				 * 
				 */
				PM.actionBeingConfirmed = {
					P2 : this,
					obj : obj,
					fieldName : fieldName,
					actionName : actionName,
					param : param,
					actionOnLoad : actionOnLoad
				};
				PM.message('Do you want to abandon change(s)?', 'Warning',
						'Yes', pageActionActAfterMessageOk, 'No',
						pageActionActAfterMessageNotOk, null, null);
				return;
			}
		}
	}

	if (action.showPanels != null) {
		this.hideOrShowPanels(action.showPanels, '');
	}
	if (action.hidePanels != null) {
		this.hideOrShowPanels(action.hidePanels, 'none');
	}
	if (action.disableFields != null) {
		this.ableFields(action.disableFields, false);
	}
	if (action.enableFields != null) {
		this.ableFields(action.enableFields, true);
	}
	if (action.popupPanel) {
		this.popupAPanel(action.popupPanel);
	} else if (action.popdownPanel) {
		this.popDown();
	}
	var actionDone = action.act(obj, fieldName, param, actionOnLoad);

	/*
	 * has init() deferred showing the page to this action? Note that action is
	 * "done" if this is not a serverAction. A serverAction is "done" only when
	 * the call back action (default is refreshPage() ) is called after the call
	 * to server returns.
	 */
	if (action.showPage && !action.serviceId) {
		this.showPage();
	}

	/*
	 * if this action took care of form modifications, then we are to reset that
	 */
	if (actionDone && action.resetFormModifiedState) {
		this.resetLastModifiedNode();
	}

	/*
	 * special feature for project to log actions.
	 */
	if (exilParms.serverActivityCallBackFunctionName && action.toBeReported) {
		var fn = PM[exilParms.serverActivityCallBackFunctionName];
		if (fn) {
			fn();
		} else {
			debug('Design error : Project has specified exilParms.serverActivityCallBackFunctionName = '
					+ exilParms.serverActivityCallBackFunctionName
					+ ' but no function is defined with that name.');
		}
	}
};
/**
 * call back function for OK button for confirmation message while warning user
 * of action
 */
var pageActionActAfterMessageOk = function() {
	/*
	 * retrieve context
	 */
	var action = PM.actionBeingConfirmed;
	PM.actionBeingConfirmed = null;
	if (!action) {
		debug('Design error : PM.actionBeingConfirmed is not available after message()');
		return;
	}
	var p2 = action.P2;
	/*
	 * Now that user has conformed, we re-start the action, but of course after
	 * resetting modified state to avoid a perpetual confirmation activity.
	 */
	p2.resetLastModifiedNode();
	p2.act(action.obj, action.fieldName, action.actionName, action.param,
			action.actionOnLoad);
};

/**
 * call back function for not-OK button for confirmation message while warning
 * user of action
 */
var pageActionActAfterMessageNotOk = function() {
	/*
	 * retrieve context
	 */
	var p2 = PM.actionBeingConfirmed && PM.actionBeingConfirmed.P2;
	PM.actionBeingConfirmed = null;
	if (!p2) {
		debug('Design error : PM.actionBeingConfirmed is not available after message()');
		return;
	}
	/*
	 * user does not want this action. Let us try to take her back to the field
	 * she was editing
	 */
	try {
		var node = p2.lastModifiedNode;
		if (!node.disabled) {
			node.focus();
		}
		p2.makePanelVisible(node);
	} catch (e) {
		//
	}
};
/**
 * hide or show an array of panels. Trick here is to look for various scenarios
 * of panel rendering and handle all such cases
 * 
 * @param panelNames
 *            array of panelNames
 * @param display
 *            'none' to hide and '' to show. This,as you can see, used to be the
 *            value for style.display
 */
a.hideOrShowPanels = function(panelNames, display) {
	if (display != 'none') {
		display = '';
	}

	for ( var i = 0; i < panelNames.length; i++) {
		var panelName = panelNames[i];
		/*
		 * though we call it a panel, it could be a field as well
		 */
		if (this.fields[panelName]) {
			this.hideOrShowField(panelName, display);
			continue;
		}
		var panel = this.doc.getElementById(panelName);
		if (!panel) {
			debug("design error: panelName " + panelName
					+ " is to be hidden/shown, but it is not a dom element");
			continue;
		}

		/*
		 * unfortunately, animateHideAndShow() requires values 'hide' or 'show'
		 * while we are using 'none' or ''
		 */
		var hideOrSho = display == 'none' ? 'hide' : 'show';

		/*
		 * let us look for any wrapper or decorator on top of this panel.
		 * 
		 * case 1 : this is a tabbed panel. we will also have a div for showing
		 * all tabs. That has to be shown/hidden as well
		 */
		var tabs = this.doc.getElementById(panelName + 'Tabs');
		if (tabs) {
			/*
			 * tabs is a separate div that has all the tabs for child panels.
			 * hide/show that
			 */
			if (exilParms.animateHideAndShow) {
				PM.animateHideAndShow(tabs, hideOrSho, this);
			} else {
				tabs.style.display = display;
			}
		}

		/*
		 * case 2 : this panel is a child of a tabbed panel. So, this panel will
		 * have a corresponding tab.
		 * 
		 */
		var tab = this.doc.getElementById(panelName + 'Tab');
		/*
		 * possibly left and right decorations as well
		 */
		var tabLeft = this.doc.getElementById(panelName + 'TabLeft');
		var tabRight = this.doc.getElementById(panelName + 'TabRight');

		if (tab) {
			tab.style.display = display;
			if (tabLeft) {
				tabLeft.style.display = display;
			}
			if (tabRight) {
				tabRight.style.display = display;
			}
			if (!display) {
				/*
				 * we need to simulate a click on this tab for us to show this
				 */
				tab.onclick.call(tab);
			} else if (tab.clickDisabled || tab.getAttribute('clickdisabled')) {
				var newTab = this.getTabToEnable(tabLeft, tabRight);
				/*
				 * if we find a valid tab, let us click
				 */
				if (newTab) {
					newtab.onclick.call(newtab);
				}
			}
			continue;
		}

		/*
		 * not sure why we did all the earlier activity if the current state is
		 * same as what is being asked for. It could be a waste, but too risky
		 * to change at this time, as we do not know what side-effect has been
		 * used as feature by any project
		 */
		if (panel.style.display == display) {
			continue;
		}

		/*
		 * is there a twister?
		 */
		var twister = this.doc.getElementById(panelName + 'Twister');
		if (twister) {
			this.twist(twister, panelName);
			continue;
		}

		/*
		 * is there a top panel?
		 */
		var topPanel = this.doc.getElementById(panelName + 'Top');
		if (topPanel) {
			topPanel.style.display = display;
		}

		/*
		 * ok. we are done will all wrappers...
		 */
		if (panel.tagName != 'DIV' || !exilParms.animateHideAndShow) {
			panel.style.display = display;
		} else {
			animateHideAndShow(panel, hideOrSho, this);
		}
	}
	/*
	 * page size might have changed...
	 */
	this.win.checkIframeSize();
};

/**
 * this is a fragile code that detects a visible 'tag' div. we first try to teh
 * left, and then to right to find one.
 * 
 * @param tabLeft
 *            element that is at the left of the current tab
 * @param tabRight
 *            element that is to the right of the current tab
 * @returns tab element that is active, or null if there is none
 */
a.getTabToEnable = function(tabLeft, tabRight) {

	var newtab = tabLeft.previousSibling;
	if (newtab)
		newtab = newtab.previousSibling;
	/*
	 * keep going back till you get a tab that is not hidden, or there is no
	 * more
	 */

	while (newtab) {
		/*
		 * there could be other text/empty elements
		 */
		if (newtab.id && newtab.style.display != 'none') {
			return newTab;
		}
		newtab = newtab.previousSibling;
	}
	/*
	 * We didn't get. try in the forward direction
	 */
	newtab = tabRight.nextSibling;
	if (newtab) {
		newtab = newtab.nextSibling;
	}
	while (newtab && newtab.style.display == 'none') {
		if (newtab.id && newtab.style.display != 'none') {
			return newTab;
		}
		newtab = newtab.nextSibling;
	}
	return null;
};
a.DISABLED_CLASS = 'disabledinput';
a.DISABLED_ATTRIBUTE_NAME = 'eleDisabled';
a.DISABLED_DOM_ATTRIBUTE = 'disabled';
/**
 * disable or enable fields. This method is long, but we let it that way because
 * it is not complex
 * 
 * @param fieldNames
 *            array of field names to be worked on
 * @param toEnable
 *            true if fields have to be enabled. False if they have to be
 *            disabled
 * @param idx
 *            1 based index into the table if the field happens to be in a table
 */
a.ableFields = function(fieldNames, toEnable, idx) {
	for ( var i = fieldNames.length - 1; i >= 0; i--) {
		var id = fieldNames[i];
		var field = this.fields[id];
		var table = this.tables[id];
		/*
		 * special feature to enable/disable table, though this method is named
		 * as ableFields!!
		 */
		if (!field && table) {
			if (toEnable) {
				table.enableAction && table.enableAction();
			} else {
				table.disableAction && table.disableAction();
			}
			continue;
		}

		var eleFoundInTable = false;
		var suffix = '';
		var ele = this.doc.getElementById(id);
		if (!ele) {
			/*
			 * possible that it is a field in the table. We have to get the do
			 * element for desired row
			 */
			if (field && field.table) {
				/*
				 * we are going to use current row later in this function
				 */
				eleFoundInTable = true;
				suffix = '__' + (idx || field.table.currentRow);
				ele = this.doc.getElementById(id + suffix);
			} else if (idx) {
				/*
				 * last chance. It could be delete check box. We will have
				 * name__idx for each row
				 */
				ele = this.doc.getElementById(id + '__' + idx);
			}
		}
		if (!ele) {
			debug(id + ' is marked for enable/disable. But it is not defined.');
			continue;
		}

		var eleIsButton = (ele.tagName && ele.tagName.toUpperCase() == 'FONT')
				|| (ele.type && ele.type.toUpperCase() == 'BUTTON');

		var tabIndex = 0;
		var className = '';
		var cursor = 'poniter';
		var disp = '';
		var attValue = 'flase';

		if (toEnable) {
			if (ele.savedClassName && ele.savedClassName != this.DISABLED_CLASS) {
				className = ele.savedClassName;
			}
			delete ele.savedClassName;
			ele.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
		} else {
			if (ele.className) {
				ele.savedClassName = ele.className;
			}
			tabIndex = -1;
			className = this.DISABLED_CLASS;
			cursor = '';
			disp = 'none';
			attValue = 'true';
			ele.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
					this.DISABLED_DOM_ATTRIBUTE);
		}

		ele.tabIndex = tabIndex;
		ele.className = className;
		if (eleIsButton) {
			ele.style.cursor = cursor;
			ele.setAttribute(this.DISABLED_ATTRIBUTE_NAME, attValue);
		}

		var picker = this.doc.getElementById(id + suffix + 'Picker');
		if (picker) {
			picker.style.display = disp;
		}

		var timeEle = this.doc.getElementById(id + 'Hr');
		if (timeEle) {
			var objs = field.getTimeObjects(timeEle);
			for (a in objs) {
				timeEle = objs[a];
				if (timeEle) {
					if (toEnable) {
						timeEle.className = timeEle.savedClassName || '';
						timeEle.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
					} else {
						timeEle.savedClassName = timeEle.className;
						timeEle.className = this.DISABLED_CLASS;
						timeEle.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
								this.DISABLED_DOM_ATTRIBUTE);
					}
				}
			}
		}
		/*
		 * is this a filterField? we have to take care of operator and to-field
		 */
		var toFieldEle = this.doc.getElementById(id + 'To');
		if (toFieldEle) {
			toFieldEle.className = className;
			if (toEnable) {
				toFieldEle.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
			} else {
				toFieldEle.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
						this.DISABLED_DOM_ATTRIBUTE);
			}
		}

		var opFieldEle = this.doc.getElementById(id + 'Operator');
		if (opFieldEle) {
			opFieldEle.className = className;
			if (toEnable) {
				opFieldEle.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
			} else {
				opFieldEle.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
						this.DISABLED_DOM_ATTRIBUTE);
			}
		}

		/*
		 * we also have the possibility of this ele having child nodes
		 */
		var children = ele.childNodes;
		if (children.length) {
			for ( var j = children.length - 1; j >= 0; j--) {
				var child = children[j];
				var childName = child.name;
				if (child.nodeType == 1 && childName) {
					if (ele.name.search(/Radio/) > 0
							|| childName.search(/Checkbox/) > 0) {
						if (toEnable) {
							child.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
						} else {
							child.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
									this.DISABLED_DOM_ATTRIBUTE);
						}
					}
				}
			}
		}

		/*
		 * is this a field in the table? Note that we haev already found a
		 * domelement in the current row, and we have taken care of that. We
		 * have to take care of the dom element in the row that is cached as
		 * rowToClone.
		 * 
		 */
		if (!eleFoundInTable) {
			continue;
		}

		var nodeName = ele.nodeName;
		var fieldObjects = field.table.rowToClone
				.getElementsByTagName(nodeName);
		if (fieldObjects.length == 0) {
			continue;
		}

		for ( var k = fieldObjects.length - 1; k >= 0; k--) {
			var obj = fieldObjects[k];
			if (obj.id != id) {
				continue;
			}
			/*
			 * we found the field
			 */
			if (toEnable) {
				obj.removeAttribute(this.DISABLED_DOM_ATTRIBUTE);
			} else {
				obj.setAttribute(this.DISABLED_DOM_ATTRIBUTE,
						this.DISABLED_DOM_ATTRIBUTE);
			}
			break;
		}
	}
};

/**
 * render a panel as if it is a pop-up. This is achieved by putting a cover and
 * changing the z-index of this panel
 * 
 * @param panelName
 *            to be popped-up
 */
a.popupAPanel = function(panelName) {
	/*
	 * panel may have wrappers
	 */
	var panel = this.doc.getElementById(panelName + 'Top')
			|| this.doc.getElementById(panelName);
	if (!panel) {
		debug('Error: ' + panelName
				+ ' is not found as a DOM element. popup option failed ');
		return;
	}

	if (this.poppedUpPanel) {
		/*
		 * there is already a panl rendered as pop-up. bring it down. cover is
		 * already tehre
		 */
		this.poppedUpPanel.style.position = '';
	} else {
		/*
		 * create the cover, but once
		 */
		if (!this.myCoverStyle) {
			var div = this.doc.createElement('div');
			div.style.position = 'absolute';
			div.style.zIndex = 2;
			div.style.top = '0px';
			div.style.left = '0px';
			div.style.backgroundColor = exilParms.popupCoverColor;
			div.style.opacity = exilParms.popupCoverOpacity;
			this.doc.body.appendChild(div);
			this.myCoverStyle = div.style;
		}
		/*
		 * stretch the cover
		 */
		this.myCoverStyle.height = this.doc.body.clientHeight + 'px';
		this.myCoverStyle.width = this.doc.body.clientWidth + 'px';
		this.myCoverStyle.display = 'block';
	}
	/*
	 * pop it up
	 */
	panel.style.position = 'relative';
	panel.style.zIndex = 10;
	this.poppedUpPanel = panel;
};

/**
 * bring back a popped-up panel as normal
 */
a.popDown = function() {
	if (!this.poppedUpPanel) {
		debug('Nothing to popdown');
		return;
	}
	if (this.myCoverStyle) {
		this.myCoverStyle.display = 'none';
	}

	this.poppedUpPanel.style.position = '';
	this.poppedUpPanel = null;
};

/**
 * add page size variables as input to server
 * 
 * @param dc
 *            to be sent to server
 */
a.addPageSizes = function(dc) {
	if (!this.pageSizes) {
		return;
	}
	for ( var i = this.pageSizes.length - 1; i >= 0; i--) {
		/*
		 * each array element is an array of two elements, pageSize name and
		 * number of rows
		 */
		var pair = this.pageSizes[i];
		dc.values[pair[0]] = pair[1];
	}
};

/**
 * add fields to dc from query fields
 * 
 * @param dc
 * @param names
 *            array of name of fields to be pushed to dc
 * @param sources
 *            array of name of fields to be used to get value. it could be same
 *            as names.
 * @param idx
 *            optional 1-based index into table if the field happens to be in a
 *            table. Current row is taken if this is not specified
 * @param toValidate
 *            fields were not validated by mistake in our first version, and
 *            then it became a feature! we had to provide an override
 * @param repeatingColumnValue
 *            value to be used if the field happens to be the repeating column
 *            of its table
 * @param exemptedFieldName
 *            exceptional field name that should not be validated. Very quirky
 *            design indeed!!
 * @returns true if dc was filled successfully with no validation errors. False
 *          in case of errors.
 * 
 */
a.fillDcFromQueryFields = function(dc, names, sources, idx, toValidate,
		repeatingColumnValue, exemptedFieldName) {
	if (!names) {
		return true;
	}

	if (!sources) {
		message("Design error: Source not supplied for name = " + names,
				"Error", "Ok", null, null, null);
		return false;
	}

	for ( var i = names.length - 1; i >= 0; i--) {
		var sourceName = sources[i];
		var field = this.fields[sourceName];
		var val = null;
		if (field) {
			/*
			 * right thing would have been to delegate this to field object. But
			 * this method has taken its own course of customization of
			 * features... It stays here with some quirky designs
			 */
			if (toValidate && field.name != exemptedFieldName) {
				val = field.getValue(idx);
				try {
					val = field.validateValue(val);
				} catch (e) {
					e.field = field;
					this.catchError(e);
					return false;
				}
			}
			val = field.getValue(idx, true);
		} else {
			val = this.win[sourceName];
		}

		/*
		 * play it safe for null and undefined. 0 will also become '' but that
		 * is what we need
		 */
		if (!val) {
			val = '';
		}

		var fieldName = names[i];
		dc.addValue(fieldName, val);

		if (!field) {
			continue;
		}
		/*
		 * there are some related fields that need to be pushed
		 */
		if (field.isFilterField) {
			var otherField = this.fields[sourceName + "Operator"];
			val = otherField.getValue(idx, true);
			dc.addValue(fieldName + "Operator", val);
			/*
			 * could be a to-field if filter is 'between'
			 */
			if (val == 6) {
				otherField = this.fields[sourceName + "To"];
				val = otherField.getValue(idx, true);
				dc.addValue(fieldName + "To", val);
			}
		}

		/*
		 * in case this field is THE repeating column of a table, use the
		 * specified value
		 */
		var table = field.table;
		if (table && table.repeatingColumnName) {
			/*
			 * get the fully qualified name
			 */
			var fn = table.name + '_' + table.repeatingColumnName;
			if (fn == field.name) {
				dc.addValue(fieldName, fieldVal);
			}
		}
	}
	return true;
};

/**
 * ad fields and grids from the page
 * 
 * @param dc
 *            to be filled-up
 * @param fields
 *            collection of fields to be filled, null for all fields
 * @param tables
 *            collection of tables to be sent, null for all of them
 * @param sendAllFields -
 *            override toBeSentToServer attribute of fields. If this is true,
 *            just send the fields..
 */
a.fillDcFromForm = function(dc, fields, tables, sendAllFields) {
	if (!fields) {
		fields = this.fields;
		tables = this.tables;
	}
	for ( var fieldName in fields) {
		var field = this.fields[fieldName];
		if (field) {
			if (sendAllFields || (field.toBeSentToServer && !field.tableName)) {
				field.fillDc(dc);
			}
			continue;
		}
		/*
		 * special feature. Programmer can keep a grid with the name of the
		 * field in the window, and we send it to server!!
		 * 
		 * Why did we add this feature? Because someone asked for it :-)
		 */
		var grid = this.win[fieldName]; // a ready grid
		if (grid) {
			dc.addGrid(fieldName, grid);
			contine;
		}

		debug(fieldName
				+ ' is neither a field, nor a grid in the window. It will not be submitted.');
	}

	for ( var tableName in tables) {
		var table = this.tables[tableName];
		if (table) {
			if (table.fillDC && table.toBeSentToServer) {
				table.fillDC(dc);
			}
		} else {
			debug(tableName + ' is not a table. It will not be submitted.');
		}
	}
};
