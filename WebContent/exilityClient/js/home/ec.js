//it is VERY VERY important that we call this serverStub. Otherwise, exility has trouble getting the response back from server

var ec = (function() {
	var GET_ALL_FILES = 'ide.getAllFiles';
	var TABS_ID = 'tabs';
	var FILES_ID = 'files';
	var RESOURCE_LIST = 'resourceList';
	var HOME_PAGE = 'htm/ide/home.htm';
	var TRACE = "trace";
	var myTree = null;
	/**
	 * exility server agent
	 */
	var serverStub = null;

	/**
	 * 
	 */
	var tabbedWindows = null;

	/**
	 * call-back when server returns all file names
	 */
	var loadResources = function(dc) {
		alert('OK. I am back here sir..');
		var data = dc.getGrid(RESOURCE_LIST);
		if (!data || data.length < 2) {
			alert('ooooops. Unable to load files for your project. I have no suggestions :-) ');
			return;
		}
		var nodes = [];
		for ( var i = 1; i < data.length; i++) {
			var row = data[i];
			var fileName = row[0];
			var node = {
				id : fileName,
				value : fileName,
				type : row[1]
			};
			var parentId = null;
			var n = fileName.indexOf('/');
			if (n > -1) {
				node.resourceType = fileName.substr(0, n);
				n = fileName.lastIndexOf('/');
				parentId = fileName.substring(0, n);
				fileName = fileName.substring(n + 1);
			}
			node.parentId = parentId;
			node.name = fileName;
			nodes.push(node);
		}
		myTree = new Tree('resources');
		myTree.buildFromArray(nodes, false, true);
		myTree.createMenu('resourceDiv', 'left', ec.openResource, null);
	};
	/**
	 * one-time activities before we start
	 */
	var openShop = function() {
		/*
		 * allow trace right from beginning
		 */
		if (window.location.search.indexOf(TRACE) != -1) {
			PM.headerMenu.startTrace();
		}
		serverStub = new ExilityServerStub(window);

		/*
		 * create tabbed-window infrastructure
		 */
		var labelsEle = document.getElementById(TABS_ID);
		var filesEle = document.getElementById(FILES_ID);
		tabbedWindows = new TabbedWindows(labelsEle, filesEle, HOME_PAGE);
		/*
		 * get all file names from server to show in the left tree. we use a
		 * simple synch call for this
		 */

		var dc = serverStub.getResponse(GET_ALL_FILES);
		loadResources(dc);
	};

	var openResource = function(resourceName, node) {
		if (node.type == 'folder') // an empty folder is clicked
			return;

		// we expect id in the form
		// "resourceType/module/subModule.../resourceName.xml
		var n = node.id.indexOf('.xml');
		if (n == -1 || n != resourceName.length - 4) // it does not end with
		// .xml
		{
			alert('Sorry buddy, I do not know how to open this file. :-(');
			return;
		}
		var fullName = node.id.substr(0, n); // knocked .xml from it
		var url;
		var n = fullName.indexOf('/'); // we have to remove the first part, as
		// it is resource type itself
		if (n > -1) // need to get resourceName as fully qualified name
		{
			fullName = fullName.substr(n + 1).replace(/\//g, '.');
			url = 'htm/internal/' + node.resourceType + '.htm?resourceName='
					+ fullName;
		} else if (fullName == 'applicationParameters')
			url = 'htm/internal/applicationParameter.htm';
		else {
			alert('Sorry. This resource can not be edited.');
			return;
		}
		tabbedWindows.addWindow(url, node.id, node.name);
	};

	/**
	 * methods that are used externally
	 */
	return {
		/**
		 * triggered on-load of document
		 * 
		 * @returns nothing
		 */
		indexLoaded : openShop,

		/**
		 * called by Exility when a service returns with a response
		 * 
		 * @param dc
		 *            response
		 * @returns nothing
		 */
		serviceReturned : // loadResources,
		function(dc) {
			alert('I got dc with success = ' + dc.success);
		},

		/**
		 * open a resource, typically for editing
		 */
		opernResource : openResource
	};

})();
