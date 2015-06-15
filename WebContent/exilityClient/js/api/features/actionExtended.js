/**
 * actions that are not common are included in this file. We can generate a
 * smaller engine by excluding this file.
 * 
 * These were adhoc functionality added for specific project. We need to redesign 
 * these to with current browser support and make them usable by all projects 
 */

/**
 * send a mail
 */
var MailToAction = function() {
	AbstractAction.call(this);
};

MailToAction.prototype = new AbstractAction;
/**
 * we open a browser window with mail protocol for the browser to take over from
 * here
 */
MailToAction.prototype.act = function(obj, fieldName, params) {
	var mailTo = this.mailTo;
	if (!mailTo) {
		debug('no address specified for mailTo action');
		return false;
	}

	if (this.substituteValueFrom)
		mailTo = mailTo.replace('#value#', this.P2
				.getFieldValue(this.substituteValueFrom));
	window.open('mailto:' + mailTo);
	return true;
};

/**
 * 
 */
var FileAction = function() {
	ServerAction.call(this);
};

FileAction.prototype = new ServerAction;

FileAction.prototype.act = function() {
	var dc = this.getDc();
	if (!dc)
		return false;
	dc.values['serviceId'] = this.serviceId;
	dc.values[ClientConstants.CSRF_HEADER] = getCsrfToken();
	this.formSubmit(dc);
	return true;
};
/**
 * this method needs to be re-factored. This is working with specific
 * requirements for one project
 * 
 * @param dc
 * @returns {Boolean}
 */

FileAction.prototype.formSubmit = function(dc) {
	if (this.submitInNewWindow) {
		var win = window.open("_blank");
		if (!win) {
			alert('Pop-up blocker is preventing us from opening a new window for file upload');
			return false;
		}
		var doc = win.document;
		doc
				.write('<body onload="document.forms[0].submit();"><span>Contacting the server... Please wait....</span><form method="post" accept-charset="UTF-8" enctype="multipart/form-data" action="'
						+ htmlRootPath + this.serverResource + '">');

		for ( var key in dc.values) {
			var val = dc.values[key];
			var field = this.P2.getField(key);
			if (field && field.isFileField)
				doc.write('<input type="file" name="' + key + '" value="' + val
						+ '"/>');
			else if (val)
				doc.write('<input type="hidden" name="' + key + '" value="'
						+ val + '"/>');
		}
		doc.write('</form></body>');
		doc.close();
		// doc.end();
	} else {
		var doc = this.P2.doc;
		var frm = doc.createElement("FORM");
		frm.acceptCharset = 'UTF-8';
		doc.body.appendChild(frm);
		for ( var key in dc.values) {
			var val = dc.values[key];
			var isFileField = false;
			var field = this.P2.getField(key);
			if (field) {
				var fieldCons = field.constructor;
				if (fieldCons == FileField)
					isFileField = true;
			}
			if (isFileField) {
				var hf = doc.createElement("INPUT");
				hf.type = "file";
				hf.name = key;
				hf.value = val;
				frm.appendChild(hf);
			} else if (val) {
				var hf = doc.createElement("INPUT");
				hf.type = "hidden";
				hf.name = key;
				hf.value = val;
				frm.appendChild(hf);
			}
		}
		frm.encType = 'multipart/form-data';
		frm.action = htmlRootPath + this.serverResource;
		frm.method = "POST";
		frm.submit();
		doc.body.removeChild(frm);
	}
};

if (!window.serverPlatform)
	window.serverPlatform = 'jsp';

var DownloadFileAction = function() {
	FileAction.call(this);
	this.serverResource = '../exilityClient/' + serverPlatform
			+ '/DownloadFile.' + serverPlatform;
};

DownloadFileAction.prototype = new FileAction;

var UploadFileAction = function() {
	FileAction.call(this);
	this.serverResource = '../exilityClient/' + serverPlatform + '/UploadFile.'
			+ serverPlatform;
};

UploadFileAction.prototype = new FileAction;

UploadFileAction.prototype.act = function() {
	var dc = this.getDc();
	if (!dc)
		return false;

	dc.values['serviceId'] = this.serviceId;
	dc.values[ClientConstants.CSRF_HEADER] = getCsrfToken();
	var doc = this.P2.doc;

	var fileFieldExists = false;
	for ( var key in dc.values) {
		var isFileField = false;
		var field = this.P2.getField(key);
		if (field) {
			var fieldCons = field.constructor;
			if (fieldCons == FileField)
				isFileField = true;
		}
		if (isFileField) {
			fileFieldExists = true;
			doc.getElementById(key).name = key;
		}
	}

	if (fileFieldExists) {
		var frm = doc.getElementById("form1");
		frm.acceptCharset = 'UTF-8'; // May 3 2011 : Change to support utf 8
		// char in multi-part form data -
		// Exility App : Aravinda

		var hf = doc.createElement("INPUT");
		hf.type = "hidden";
		hf.name = "dc";
		hf.value = this.P2.win.serverStub.serializeDc(dc);
		frm.appendChild(hf);

		var hf = doc.createElement("INPUT");
		hf.type = "hidden";
		hf.name = "baseHTMLFolderName";
		hf.value = exilParms.baseHTMLFolderName;
		frm.appendChild(hf);

		frm.encoding = 'multipart/form-data';
		this.P2.doc.onload = 'uploadFileReturned(true)';
		frm.action = htmlRootPath + this.serverResource;
		frm.method = "POST";
		frm.submit();
	} else {
		var gridNameContainingFile = null;
		var gridColumnContainingFile = null;
		var gridColumnFileIndex = null;
		var foundGrid = false;
		for ( var key in dc.grids) {
			var grid = dc.grids[key];
			for ( var i = 0; i < grid[0].length; i++) {
				var field = this.P2.getField(key + "_" + grid[0][i]);
				if (field) {
					var fieldCons = field.constructor;
					if (fieldCons == FileField) {
						foundGrid = true;
						gridNameContainingFile = key;
						gridColumnContainingFile = grid[0][i];
						gridColumnFileIndex = i;
						break;
					}
				}
			}
			if (foundGrid)
				break;
		}
		if (foundGrid) {
			PM.fileUploadData = new Array();
			PM.fileUploadData['fileDataGrid'] = dc.grids[gridNameContainingFile];
			PM.fileUploadData['gridNameContainingFile'] = gridNameContainingFile;
			PM.fileUploadData['gridColumnContainingFile'] = gridColumnContainingFile;
			PM.fileUploadData['gridColumnFileIndex'] = gridColumnFileIndex;
			PM.fileUploadData['noOfFilesToUpload'] = dc.grids[gridNameContainingFile].length - 1;
			PM.fileUploadData['currentFileToUpload'] = 1;
			PM.fileUploadData['doc'] = doc;
			PM.fileUploadData['P2'] = this.P2;
			PM.fileUploadData['serverResource'] = this.serverResource;
			dc.grids[gridNameContainingFile] = null;
			PM.fileUploadData['dc'] = dc;

			PM.fileUploaded = false;
			uploadFiles();
		}
	}
	return true;
};

/**
 * ability to upload multiple files at a time
 */
function uploadFiles() {
	var grid = PM.fileUploadData['fileDataGrid'];
	var dc = PM.fileUploadData['dc'];
	var gridNameContainingFile = PM.fileUploadData['gridNameContainingFile'];
	var gridColumnContainingFile = PM.fileUploadData['gridColumnContainingFile'];
	var gridColumnFileIndex = PM.fileUploadData['gridColumnFileIndex'];

	PM.debug('Grid : ' + grid);
	PM.debug('dc : ' + dc);
	PM.debug('gridNameContainingFile : ' + gridNameContainingFile);
	PM.debug('gridColumnContainingFile' + gridColumnContainingFile);
	PM.debug('gridColumnFileIndex : ' + gridColumnFileIndex);

	var doc = PM.fileUploadData['doc'];
	var div = doc.createElement("DIV");
	div.id = "exilFileUploadDiv";
	div.style.display = 'none';
	doc.body.appendChild(div);

	var frm = doc.createElement("FORM");
	frm.acceptCharset = 'UTF-8'; // May 3 2011 : Change to support utf 8 char
	// in multi-part form data - Exility App :
	// Aravinda
	div.appendChild(frm);

	for ( var j = 1; j < grid.length; j++) {
		var currentFileToUpload = j;

		if (grid[currentFileToUpload][gridColumnFileIndex] != "") {
			doc.getElementById(gridNameContainingFile + "_"
					+ gridColumnContainingFile + "__" + currentFileToUpload).name = gridColumnContainingFile;
			var node = doc.getElementById(gridNameContainingFile + "_"
					+ gridColumnContainingFile + "__" + currentFileToUpload);
			frm.appendChild(node);

			var rm = doc.createElement("INPUT");
			rm.type = "hidden";
			rm.name = "REMARK_" + currentFileToUpload;
			rm.value = grid[currentFileToUpload][gridColumnFileIndex + 1];
			frm.appendChild(rm);
		}
	}

	var hf = doc.createElement("INPUT");
	hf.type = "hidden";
	hf.name = "dc";
	hf.value = doSerialize(dc); // Added to fix the issue :
	// <rdar://problem/12861846> Attachment - Not
	// able to attach any file in the pathfinder
	// application - Guru
	frm.appendChild(hf);

	var tmpIframe = doc.createElement("IFRAME");
	tmpIframe.name = "exilFileUploadFrame";
	tmpIframe.src = "";
	tmpIframe.onload = 'uploadFileReturned()';
	frm.appendChild(tmpIframe);

	frm.encoding = 'multipart/form-data';
	frm.action = htmlRootPath + PM.fileUploadData['serverResource'];
	frm.method = "POST";
	frm.target = "exilFileUploadFrame";
	frm.submit();
}

function uploadFileReturned(url) {
	if (typeof (dc) == 'undefined') {
		var prevP2 = PM.currentActiveWindow.P2;
		prevP2.act(null, null, 'callBack');
		return;
	}
	if (!dc.success) {
		parent.message("Error while uploading the file. Please try again", "",
				"Ok", null, null, null);
	}

	if (url) {
		parent.PM.exilityPageStack.goBack();
	}
}

var ReportAction = function() {
	ServerAction.call(this);
	this.reportName = null;
	this.serverResource = '../' + serverPlatform + '/ShowReport.'
			+ serverPlatform;
	this.submitInNewWindow = false; // Mar 18 2011 : Changes to show the report
	// in new window - Exility App : Aravinda
};

ReportAction.prototype = new ServerAction;

// Feb 25 2011 : Report Download in background - Exility App : Aravinda
function checkFileDownloadCookie() {
	if (top.getCookie("fileDownloaded") != "")
		uncoverPage(coverPickerStyle);
	else
		setTimeout('checkFileDownloadCookie();', 100);
}

ReportAction.prototype.act = function() {
	var dc = this.getDc();
	if (!dc)
		return false;

	if (!this.submitInNewWindow) {
		coverPage(coverPickerStyle, imgPickerStyle);
		if (top.getCookie("fileDownloaded") != "")
			top.removeCookie("fileDownloaded");
		setTimeout('checkFileDownloadCookie();', 100);
	}

	dc.values['reportName'] = this.reportName;
	dc.values['serviceId'] = this.serviceId;
	var doc = this.P2.doc;
	var frm = doc.createElement("FORM");
	frm.acceptCharset = 'UTF-8'; // May 3 2011 : Change to support utf 8 char
	// in multi-part form data - Exility App :
	// Aravinda

	if (!this.submitInNewWindow) {
		top.exilReportFrame.document.body.appendChild(frm);
	} else {
		doc.body.appendChild(frm);
	}

	var hf = doc.createElement("INPUT");
	hf.type = "hidden";
	hf.name = "dc";
	hf.value = this.P2.win.serverStub.serializeDc(dc);
	frm.appendChild(hf);

	frm.encoding = 'multipart/form-data'; // Oct 29 2009 : Bug 747 - While
	// uploading check for already
	// existing file - Exility: Venkat
	frm.action = htmlRootPath + this.serverResource;
	frm.method = "POST";
	if (!this.submitInNewWindow) {
		frm.target = "_self";
	} else {
		frm.target = "_blank";
	}
	// Mar 18 2011 : Changes to show the report in new window - Exility App :
	// Aravinda

	frm.submit();
	// Mar 18 2011 : Changes to show the report in new window - Exility App :
	// Aravinda
	if (!this.submitInNewWindow) {
		top.exilReportFrame.document.body.removeChild(frm);
	} else {
		doc.body.removeChild(frm);
	}
	return true;
};

var SaveAsXlsAction = function() {
	ReportAction.call(this);
	this.reportName = null;
	this.serverResource = '../' + serverPlatform + '/DownloadXLS.'
			+ serverPlatform;
};

SaveAsXlsAction.prototype = new ReportAction;