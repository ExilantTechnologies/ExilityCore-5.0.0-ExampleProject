/* **************************************************************
 * file : page1Create.js
 * methods for constructing the P2 model and controller for a page. page.meta.js has 
 * the script to instantiate P2 = new ExilityPage() and set its attributes using the 
 * methods provided in this file
 ************************************************************** */

/**
 * @class ExilityPage Model as well as Controller of our client side MVC. This
 *        class is the essential core of Exility client. An instance of this
 *        class is created for every page, and its attributes are set to work as
 *        model for that page. This instance is loaded with all its model
 *        attributes using meta.js file.This instance is exposed to page
 *        programming as "P2".
 * @param win
 *            window object of the page that this instance is meant for.
 *            Remember that Exility is loaded once and for all into the index
 *            page, while individual pages are loaded as iframes. It is
 *            important to keep the window in mind.
 * @param nam
 *            name of the page, as in page.xml
 */
var ExilityPage = function(win, nam) {
	this.win = win;
	this.doc = win.document;
	this.name = nam;

	/**
	 * parameters passed to this page from the previous page as part of
	 * navigation action
	 */
	this.pageParameters = {};

	/**
	 * all fields used in this page. Fields inside a table (list/grid) are
	 * indexed by their qualified name (tableName_fieldName) while others,
	 * irrespective of the panels, are indexed by name.
	 */
	this.fields = {};

	/**
	 * all fields are stored in the order that they appear in the page
	 */
	this.fieldNames = [];

	/**
	 * tables are indexed by table name, and not panel name of, say, grid panel.
	 */
	this.tables = {};

	/**
	 * all actions defined for this page
	 */
	this.actions = {};

	/**
	 * this is used by table. We will move it there when we re-factor this
	 */
	this.idSplitter = "___";
};

/**
 * @class PageParameter this is just a data structure to capture all attributes
 *        specified in page.xml. A page is designed to optionally take some
 *        parameters at run time, just like a function.
 */
var PageParameter = function() {
	/*
	 * all attributes are loaded at run time
	 */
};

/**
 * we followed this simple, but really stupid way of adding methods to prototype
 * in the early 2000's... :-)
 */
var a = ExilityPage.prototype;

/**
 * add a page parameter to model
 * 
 * @param p
 *            page parameter to be added
 */
a.addParameter = function(p) {
	/*
	 * have two-way connectivity
	 */
	p.P2 = this;
	this.pageParameters[p.name] = p;
};

/**
 * get a page parameter
 * 
 * @param nam
 *            name of page parameter
 * @returns page parameter, or undefined if no parameter with that name
 */
a.getParameter = function(nam) {
	return this.pageParameters[nam];
};

/**
 * add a page field to the model. It is added to fields collection as well as
 * fieldNames array
 * 
 * @param field
 */
a.addField = function(field) {
	/*
	 * establish two-way link
	 */
	field.P2 = this;
	this.fields[field.name] = field;
	field.seqNo = this.fieldNames.length;
	this.fieldNames.push(field.name);

	/*
	 * we need to position cursor on the first editable field, unless of course
	 * the page designer has designated a specific field for this
	 */
	if (!this.firstField) {
		if (this.firstFieldName) {
			/*
			 * page designer has designated a field
			 */
			if (this.firstFieldName === field.name) {
				this.firstField = field;
			}
		} else if (field.isEditable) {
			this.firstField = field;
		}
	}

	/*
	 * add it to table if required
	 */
	if (field.tableName) {
		this.tables[field.tableName].addColumn(field);
	}

	if (field.initialize) {
		field.initialize();
	}

	/*
	 * register list and report services if required
	 */
	if (field.listServiceId) {
		this.addFiledToListeners(field, false);
	}

	if (field.reportServiceId) {
		this.addFiledToListeners(field, true);
	}
};

/**
 * get a field
 * 
 * @param nam
 *            name of the field to get
 * @returns named field, or undefined if it not defined
 */
a.getField = function(nam) {
	return this.fields[nam];
};

/**
 * get the view object (dom element) for the named field
 * 
 * @param nam
 *            name of the field
 * @param idx
 *            1 based index into the grid if this field is inside a table
 * @returns dom element (view object) for the field
 */
a.getFieldObject = function(nam, idx) {
	var field = this.fields[nam];
	if (!field)
		return null;
	var id = field.table ? field.table.getObjectId(nam, idx) : nam;
	return this.doc.getElementById(id);
};

/**
 * Add an action to the controller
 * 
 * @param action
 */
a.addAction = function(action) {
	/*
	 * establish two-way connectivity
	 */
	action.P2 = this;
	this.actions[action.name] = action;
};

/**
 * get an action from the controller
 * 
 * @param nam
 *            name of the action
 * @returns named action
 */
a.getAction = function(nam) {
	return this.actions[nam];
};

/**
 * add a table to the model
 * 
 * @param table
 *            to be added
 */
a.addTable = function(table) {
	/*
	 * link it up
	 */
	table.P2 = this;
	this.tables[table.name] = table;

	/*
	 * as per our design philosophy, client asks for pagination, and it is not
	 * server's decision to paginate. How does the client ask the server
	 * paginate the response table on the first call for data?
	 * 
	 * We have a crude answer. Ask always. With every server call, we ask it to
	 * paginate all the pages that the client designer has decided to paginate
	 */
	if (table.pageSize && !table.localPagination) {
		if (!this.pageSizes) {
			this.pageSizes = [];
		}
		this.pageSizes.push([ table.name + 'PageSize', table.pageSize ]);
	}

	/*
	 * tables could be inter-linked. They may have to do some initialization
	 * activity, but only after all tables are loaded. small optimization to
	 * trigger this.
	 */
	if (table.linkedTableName || table.mergeWithTableName
			|| table.nestedTableName) {
		this.hasLinkedTables = true;
	}
};

/**
 * get a named table
 * 
 * @param nam
 *            name of the table
 * @returns named table
 */
a.getTable = function(nam) {
	return this.tables[nam];
};

/**
 * register this field for list service or report service
 * 
 * @param field
 *            to be added
 * @param isReportService
 *            true if report service is to be added, false if list service is to
 *            be added
 */
a.addFiledToListeners = function(field, isReportService) {
	var services = null;
	var serviceId = null;
	if (isReportService) {
		if (!this.reportServices) {
			services = this.reportServices = {};
		} else {
			services = this.reportServices;
		}
		serviceId = field.reportServiceId;
	} else {
		if (!this.listServices) {
			services = this.listServices = {};
		} else {
			services = this.listServices;
		}
		serviceId = field.listServiceId;
	}
	/*
	 * gridName = serviceId. Except when keyValeu is specified in which case it
	 * is serviceId + '_' keyValue
	 */
	var gridName = serviceId;
	if (field.keyValue) {
		gridName += '_' + field.keyValue;
	}
	var listeners = services[gridName];
	/*
	 * It is possible that there may be more than one listener for the same
	 * listService and key. We allow this by having an array of listeners.
	 */
	if (!listeners) {
		listeners = [];
		/*
		 * we are no purists. array is also an object, and can have its
		 * attributes
		 */
		listeners.serviceId = serviceId;
		listeners.keyValue = field.keyValue;
		services[gridName] = listeners;
	}
	listeners.push(field);
	debug(field.name + ' pushed as a listener for ' + gridName);
};