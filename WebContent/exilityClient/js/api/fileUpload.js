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

var FileUploader = function(form) {
	this.form = form;
	this.serviceId = null;
	/**
	 * Remember PageManger.js has DC class and ExilityAgent also. Here dc refers
	 * to ExilityAgent dc so it should include after PageManger.js in the Page.
	 */
	this.dc = null;
	this.P2 = form ? form.ownerDocument.win.P2 : null;// caller P2
	this.serviceUrl = 'jsp/Service.jsp';
	this.serverActionName = null;
	this.fileFieldName = null;
	this.refreshPage = false;
	this.fileFieldObjs = [];
	this.isFiles = true;

	/**
	 * @param Object
	 *            HTTP headers to send to the server, the key is the header
	 *            name, the value is the header value.
	 */
	this.headers = {
		'simple_file_upload' : true
	};

	/*
	 * Add message with messageId for showing custom messages to the user also
	 * can be modified by using messageId
	 */
	this.messages = {
		'chooseFile' : 'Please select the file for upload',
		'FormDataNotSupported' : 'This browser dons not suport FormData object, you cannot use simple file upload feature',
		'XMLHttpObjectNotSupported' : 'XMLHttpObject not supported, you cant make ajax call'
	};

	this.listeners = {
		"load" : this.onSuccess,
		"error" : this.onError
	};
};

/**
 * Set to upload multiple file from the form xhr.setHeader("allowMultiple",
 * true) so need to set this header for uploading multiple files. In this case
 * user can do upload and not allow to read as grid.
 * 
 * @param trueOrFalse
 *            boolean val either true or false. default is false.
 * 
 */
FileUploader.prototype.allowMultiple = function(trueOrFalse) {
	this.headers['allowMultiple'] = trueOrFalse ? true : false;
};

/**
 * If user is uploading valid excel file and want to read content as grid then
 * specify grid name. record from excel will be available in given grid at the
 * server.
 * 
 * @param name
 */
FileUploader.prototype.setXlsGridName = function(gridName) {
	this.xlsGridName = gridName;
};

/**
 * If user is uploading multiple files then corresponding path will set in given
 * grid will have columns({"fileName", "fileSize","filePath"}. If user did not
 * set grid then at the server path will be available as
 * file1_ExilityPath="path/location of file1 at the server disk"...... record
 * from excel will be available in given grid at the server.
 * 
 * @param Grid
 *            name which will have path for uploaded files.This grid will have
 *            columns({"fileName", "fileSize","filePath"};).
 */
FileUploader.prototype.setFilesPathInGrid = function(filesPathGridName) {
	this.headers['filesPathGridName'] = filesPathGridName;

};

FileUploader.prototype.setServiceUrl = function(url) {
	this.serviceUrl = url;
};

FileUploader.prototype.callService = function(serviceId) {
	this.serviceId = serviceId;
};

FileUploader.prototype.callServerAction = function(name) {
	this.serverActionName = name;
};

/**
 * purpose of this method to set the callback function which will be invoked
 * with dc(Exility DataCollection object. It will have all server data).
 * 
 * @param callback
 *            is the name of the function.
 * 
 */
FileUploader.prototype.setCallback = function(callback) {
	this.callbackFunction = callback;
};

/**
 * purpose of this method to set the fileFiledName which will contains filePath
 * at the server and same var/field available in the dc(at the server). By
 * default page fileField Id to be set. One possible use of this to set this
 * name as a column of a table which saves the filePath.
 * 
 * @param name
 *            is the name of the fileField which will be available in the dc at
 *            the server.
 */
FileUploader.prototype.setFileFieldName = function(name) {
	this.fileFieldName = name;
};

FileUploader.prototype.addMessage = function(messageId, message) {
	this.messages[messageId] = message;
};

FileUploader.prototype.doPageRefresh = function(trueOrFalse) {
	this.refreshPage = trueOrFalse;
};

/**
 * Let allow the user to set their own dc to pass along the file upload If user
 * set dc then this dc only will be passed to server otherwise Exility will
 * create dc based on page and pass to the server.
 * 
 * @param dc
 *            is the instance of DataCollection class.
 */

FileUploader.prototype.setDc = function(dc) {
	if (dc instanceof DataCollection) {
		this.dc = dc;
	}

};

FileUploader.prototype.getDc = function() {
	if (!this.dc) {
		this.dc = new DataCollection();// from ExilityAgent class not from the
										// PM class
	}
	return this.dc;
};

FileUploader.prototype.getSerializeDcText = function() {
	var act;
	if (this.P2 && this.serverActionName
			&& this.P2.actions[this.serverActionName]) {
		act = this.P2.actions[this.serverActionName];
		this.dc = this.dc ? this.dc : act.getDc();
		this.serviceId = act.serviceId;
	}

	if (!this.dc) {
		this.dc = this.getDc();
	}

	this.dc.addValue('serviceId', this.serviceId);
	this.dc.addValue('fileFieldName', this.fileFieldName);
	if (this.xlsGridName) {
		this.dc.addValue('xlsGridName', this.xlsGridName);
	}
	return this.dc.serialize ? this.dc.serialize() : new ExilityServerStub()
			.serializeDc(this.dc);

};

/**
 * purpose of this method to upload a file and read the content in case user has
 * supplied an excel file with grid name.
 * 
 * @param fileFieldObj
 *            this is the file field object (i.e
 *            document.getElementById("fileFieldName")) or an array of file
 *            field object.
 * @param isArrayOffileFieldObjs
 *            true or false. If true then user should pass an array of file
 *            field object.
 * @returns Exility DataCollection object which contains all server data.
 */
FileUploader.prototype.upload = function(fileFieldObj, isArrayOffileFieldObjs) {
	if (!window.FormData) {
		alert(this.messages.FormDataNotSupported);
		return;
	}

	if (isArrayOffileFieldObjs) {
		this.sendFiles(fileFieldObj);
		return;
	}

	if (!fileFieldObj) {
		alert("Please supply file field object.");
		return;
	}
	if (!fileFieldObj.files.length) {
		alert(this.messages.chooseFile);
		fileFieldObj.focus();
		return;
	}
	this.fileFieldName = this.fileFieldName ? this.fileFieldName
			: fileFieldObj.id;
	if (!this.P2) {
		this.P2 = fileFieldObj.ownerDocument.win.P2;// caller P2
	}
	this.send(fileFieldObj);
};

FileUploader.prototype.sendFiles = function(arrayOfFileFieldObj) {

	if (!arrayOfFileFieldObj || !arrayOfFileFieldObj.length) {
		alert("Please supply array of file field objects.");
		return;
	}

	this.fileFieldName = this.fileFieldName ? this.fileFieldName : "fileField";
	if (!this.P2) {
		this.P2 = arrayOfFileFieldObj[0].ownerDocument.win.P2;// caller P2
	}
	this.isFiles = false;
	this.send(arrayOfFileFieldObj);
};

FileUploader.prototype.send = function(files) {
	var xhr = FileUploader.getHttpObject();
	var formdata = new FormData();
	var hasAttachment = this.appendFiles(files, formdata);
	if (!hasAttachment) {
		alert(this.messages.chooseFile);
		var fileFieldObj = this.isFiles ? files.files[0] : files[0];
		fileFieldObj.focus();
		return;
	}

	if (!xhr) {
		alert(this.messages.XMLHttpObjectNotSupported);
		return;
	}
	xhr.open("post", this.serviceUrl, true);

	xhr.fileUploader = this; // This is how we can attach any object to xhr
	this.bindListeners(xhr);
	var dcTxt = this.getSerializeDcText();

	debug(dcToText(this.getDc()));

	this.appendHeaders(xhr, formdata);
	this.appendFields({
		'dc' : dcTxt,
		'fileFieldName' : this.fileFieldName
	}, formdata);

	xhr.send(formdata);
};

FileUploader.prototype.bindListeners = function(xhr) {
	for ( var listener in this.listeners) {
		FileUploader.addListener(xhr, listener, this.listeners[listener]);
	}
};

FileUploader.prototype.appendHeaders = function(xhr, formdata) {
	for ( var header in this.headers) {
		xhr.setRequestHeader(header, this.headers[header]);
	}
	/*
	 * Exility is adding token into header so sync with it. TODO: what will
	 * happen when this file included into userPage.js rather
	 * indexPage.js?ExilityServerStub would be undef.
	 */
	xhr.setRequestHeader(ClientConstants.CSRF_HEADER, getCsrfToken());
};

FileUploader.prototype.appendFiles = function(filesObj, formdata) {
	var f;
	var trurOrFalse = false;
	var nbrFiles = this.isFiles ? filesObj.files.length : filesObj.length;
	for ( var i = 0; i < nbrFiles; i++) {
		f = this.isFiles ? filesObj.files[i] : filesObj[i].files[0];
		if (!f) {
			continue;
		}
		formdata.append("fileToUpload" + i, f);
		trurOrFalse = true;
		if (!this.headers['allowMultiple']) {
			break;
		}
	}

	return trurOrFalse;
};

FileUploader.prototype.appendFields = function(fields, formdata) {
	for ( var field in fields) {
		formdata.append(field, fields[field]);
	}
};

FileUploader.prototype.onSuccess = function(e) {
	// here e.target refers to http object
	var xhrObject = e.target;
	var fileUploader = xhrObject.fileUploader;

	var responseText = xhrObject.responseText;
	var dc = new DataCollection();

	if (responseText && responseText.substr(0, 15).indexOf('var dc = ') >= 0) {
		eval(responseText);
	} else {
		dc = dc.deserializeDc ? dc.deserializeDc(responseText)
				: new ExilityServerStub().deserializeDc(responseText);
	}

	try {
		debug("Response : <br>" + dcToText(dc));
		if (fileUploader.refreshPage) {
			fileUploader.P2.refreshPage(dc);// This is the caller page P2.
		}
	} catch (ex) {
		debug(ex);
		alert("error at server:\n" + ex);
	}

	if (fileUploader.callbackFunction) {
		fileUploader.callbackFunction(dc);
	}

};

FileUploader.prototype.onError = function(e) {
	// here e.target refers to http object
	var xhrObject = e.target;
	var fileUploader = xhrObject.fileUploader;
	if (fileUploader.callbackFunction) {
		fileUploader.callbackFunction(xhrObject.responseText);
		return;
	}

	alert("response from the server:\n" + xhrObject.responseText);
};

/**
 * This will take care of cross browsers compatibility for addLister()
 */

FileUploader.addListener = function(el, ev, fn) {
	if (el.addEventListener) {
		el.addEventListener(ev, fn, false);
	} else if (el.attachEvent) {
		el.attachEvent('on' + ev, fn);
	} else {
		el['on' + ev] = fn;
	}
};

/**
 * This will take care of cross browsers compatibility for getHttpObject()
 */
FileUploader.getHttpObject = function() {
	if (window.XMLHttpRequest) {
		return new XMLHttpRequest();
	}
	// Test for support for ActiveXObject in IE first (as XMLHttpRequest in IE7
	// is broken)
	var activexmodes = [ "Msxml2.XMLHTTP", "Microsoft.XMLHTTP" ]; // activeX
																	// versions
																	// to check
																	// for in IE
	if (window.ActiveXObject) {
		for ( var i = 0; i < activexmodes.length; i++) {
			try {
				return new ActiveXObject(activexmodes[i]);
			} catch (e) {
				// suppress error
			}
		}
	}

	return false;
};

/**
 * purpose of readAtClient() is to read any text file at the client only that is
 * no server call involved in this if a text file is an xml of an excel and user
 * set gridName then it will read xml content into a grid and call a given
 * callback with data as Exility DataCollection(dc) which will have a grid with
 * gridName otherwise text.
 * 
 * @param fileObj
 *            file field object like getElementById("fileFieldId").files[0]
 * @param callback
 *            this is the function name which will be called after reading the
 *            file content.
 * @param gridName
 *            If this param is supplied then callback will be called with
 *            Exility DataCollection(dc) which will have grid with gridName.
 * @returns DataCollection(dc) if gridName is given otherwise text
 */
// This method need to be tested
FileUploader.readAtClient = function(fileObj, callback, gridName) {
	if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
		alert('The File APIs are not fully supported in this browser.');
		return;
	}
	// All the File APIs are supported.
	if (!fileObj || !fileObj.name) {
		alert("Please select a file to read");
		fileObj.focus();
		return;
	}
	var fileType = fileObj.type;

	if (fileType.match('image.*')) {
		alert("This method can be used for reading only to text file");
		return;
	}
	var reader = new FileReader();
	reader.onerror = errorHandler;
	reader.onprogress = updateProgress;
	reader.callback = callback;
	reader.gridName = gridName;
	reader.onabort = function(e) {
		alert('File read cancelled');
	};

	reader.onload = function(e) {
		// here this means reader object and we attached user callback with
		// reader itself.
		var responseText = e.target.result;
		if (this.gridName) {
			var parser = new XmlDomParser();
			var grid = parser.parseXmlString(responseText);
			// Lets convert into Exility DataCollection dc
			responseText = new DataCollection().addGrid(this.gridName, grid);
		}

		if (this.callback) {
			this.callback(responseText);
			return;
		}
		alert("data==>\n" + responseText);
	};

	reader.readAsText(fileObj);
};

/**
 * This method is used to get url for an image file and this url can be assigend
 * to either img.src or a canvas with image bitmap. After assigning the url
 * image will be displayed.
 * 
 * @param fileObj
 *            is the file field object, this will read as url at the client
 * @param callback
 *            is the function name which will be called with image url and then
 *            this url can be used as <img src =url> by js
 */
FileUploader.getImageURLForPreview = function(fileObj, callback) {
	if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
		alert('The File APIs are not fully supported in this browser.');
		return;
	}
	// All the File APIs are supported.
	if (!fileObj || !fileObj.name) {
		alert("Please select a file to read");
		fileObj.focus();
		return;
	}
	var fileType = fileObj.type;

	if (!fileType.match('image.*')) {
		alert("This method can be used for reading only to image file");
		return;
	}
	var reader = new FileReader();
	reader.onerror = errorHandler;
	reader.onprogress = updateProgress;
	reader.callback = callback;
	reader.onabort = function(e) {
		alert('File read cancelled');
	};

	reader.onload = function(e) {
		if (this.callback) {

			this.callback(this.result);
			return;
		}
		alert("data==>\n" + responseText);
	};

	reader.readAsDataURL(fileObj);
};

function updateProgress(evt) {
	// show progress here
}

function abortRead() {
	this.abort();
}

function errorHandler(evt) {
	switch (evt.target.error.code) {
	case evt.target.error.NOT_FOUND_ERR:
		alert('File Not Found!');
		break;
	case evt.target.error.NOT_READABLE_ERR:
		alert('File is not readable');
		break;
	case evt.target.error.ABORT_ERR:
		break; // noop
	default:
		alert('An error occurred reading this file.');
	}
}

/**
 * Purpose of this class is parse an xml file content to htm Dom object and
 * returnt the grid out of this.
 * 
 * @returns {XmlDomParser}
 */
function XmlDomParser() {
	this.domType = 'text/html';// This is used to get an HTML Dom object which
								// is also a Document.
	this.domPrser = (window.DOMParser) ? new DOMParser() : new ActiveXObject(
			"Microsoft.XMLDOM");
}

XmlDomParser.HTML_TAG = {
	ROW : 'row',
	PARSER_ERROR : 'parsererror'
};

/**
 * Purpose of parseXmlString(xmlString) is parse an xml file content to the
 * grid.
 * 
 * @param xmlString
 *            is the xml file content as text which can represent to an excel
 *            file because user can save an excel to a xml.
 * @returns {grid that is two dimensional array which represent to a sheet into
 *          the excel file which is converted into an xml}
 */
XmlDomParser.prototype.parseXmlString = function(xmlString) {
	var xmlDoc;
	var grid = [ [] ];
	if (window.DOMParser) {
		xmlDoc = this.domPrser.parseFromString(xmlString, this.domType);// It
																		// should
																		// be
																		// text/html
																		// not
																		// xml
																		// otherwise
																		// parsing
																		// will
																		// fail.
	} else {
		// Internet Explorer
		xmlDoc = this.domPrser;
		xmlDoc.async = false;
		xmlDoc.loadXML(xmlString);
	}

	if (xmlDoc.documentElement.nodeName == XmlDomParser.HTML_TAG.PARSER_ERROR) {
		errStr = xmlDoc.documentElement.childNodes[0].nodeValue;
		PM.debug(errStr);
		alert(errStr);
		return grid;

	}
	grid = this.getGrid(xmlDoc);
	return grid;
};

/**
 * parse an xl that is read as a dom into a grid
 * 
 * @param xlAsXmlDom
 *            dom object
 * @returns grid that represents this xls
 */
XmlDomParser.prototype.getGrid = function(xlAsXmlDom) {
	var rows = xlAsXmlDom.getElementsByTagName(XmlDomParser.HTML_TAG.ROW);
	var nbrRows = rows.length;
	var grid = [ [] ];
	if (!nbrRows) {
		return grid;
	}
	var nbrCols = rows[0].childNodes.length;
	var isEmptyRow = false;
	for ( var rowIdx = 0; rowIdx < nbrRows; rowIdx++) {
		var row = rows[rowIdx];
		if (!row)
			continue;
		var cells = row.childNodes;
		if (!cells)
			continue;

		var cols = [];
		isEmptyRow = true;
		for ( var colIdx = 0; colIdx < nbrCols; colIdx++) {
			var cell = cells[colIdx];
			var val = '';
			if (cell) {
				var dataNode = cell.childNodes[0];

				if (dataNode)
					val = dataNode.innerHTML;
				if (isEmptyRow && val) {
					isEmptyRow = false;
				}
			}
			cols[colIdx] = val;
		}

		if (!isEmptyRow) {
			grid.push(cols);
		}

	}

	return data;
};

/**
 * This method can be used to split an array into 2d array.
 * 
 * @param anArray
 *            this is an array which is being to be split
 * @param nbrCols
 *            this is the size of each one dimensional array inside the grid
 * @returns a grid(2d array which will have one dimensional array of fixed size
 *          equal to nbrElePerRow)
 */
XmlDomParser.splitAnArrayToGrid = function(anArray, nbrCols) {
	var grid = [];
	var n = anArray.length;
	for ( var idx = 0; idx < n; idx += nbrCols) {
		grid.push(anArray.slice(idx, nbrCols));

	}
	return grid;
};
