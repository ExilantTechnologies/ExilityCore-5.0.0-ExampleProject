var FILES = 'files';
var LANGUAGES = 'languages';
var FILE_NAMES = 'fileNames';
var MESSAGES = 'messages';
var NBR_GENERATED = "nbrGenerated";
/**
 * call-back function for server action getFiles. We have to extract files and
 * format it for to be suitable for files field NOTE : dc is global
 */
var addAllFilesOption = function() {
	return;
	var grid = dc.grids[FILES];
	if (!grid || grid.length == 0) {
		PM.debug('Unusual for service not to get files grid');
		return;
	}
	/**
	 * header row and blank option
	 */
	var newGrid = null;
	newGrid = [ [ grid[0], grid[0] ], [ '.', '**** All Pages ****' ] ];

	/**
	 * grid has only one column. add values to both column
	 */
	for ( var i = 1, n = grid.length; i < n; i++)
		newGrid.push([ grid[i], grid[i] ]);
	dc.grids[FILES] = newGrid;
};
/**
 * formats languages grid for languages and enables the option, but only if the
 * project has set up more than one languages.
 * 
 * @returns
 */
var checkLanguages = function() {
	var grid = dc.getGrid('languages');
	if (grid && grid.length && grid.length > 2) {
		P2.hideOrShowPanels([ 'languagePanel' ], '');
	}
	return;
};

/**
 * called after a server call to generate page. Let us show red message in case
 * the file is not generated.
 */
var checkForMessage = function() {
	/*
	 * msgs imply that there were some errors.
	 */
	var msgs = dc.getGrid('messages');
	var panel = document.getElementById('errorPanel');
	if (msgs && msgs.length > 1) {
		panel.style.display = '';
	} else {
		panel.style.display = 'none';
	}
};