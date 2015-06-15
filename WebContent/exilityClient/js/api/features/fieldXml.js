/**
 * @module - this field is deprecated, and is not used/supported anymore.
 */
var XmlTreeField = function() {
	AbstractField.call(this);
	this.treeStr = "";
};

XmlTreeField.prototype = new AbstractField;

XmlTreeField.prototype.setValueToObject = function(obj, val) {
	if (!obj) {
		debug('ERROR: null object passed to set value to object obj=' + obj
				+ ' and val = ' + val);
		return;
	}

	var httpObject;
	if (window.XMLHttpRequest)
		httpObject = new window.XMLHttpRequest();
	else
		httpObject = new window.ActiveXObject("Msxml2.XMLHTTP.6.0");

	try {
		httpObject.open('GET', val, false);
		httpObject.send(null);
	} catch (e) {
		message(
				"Application is unable to process your request because network connection is not available. Please establish Network connection and try again.",
				"", "Ok", null, null, null);
		// alert('error while sending request for ' + url + '\n' + e);
		return;
	}
	// alert(' responseText is ' + httpObject.responseText);

	var xmlDoc = null;
	var response = httpObject.responseText;
	try // Internet Explorer
	{
		xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
		xmlDoc.async = "false";
		xmlDoc.loadXML(response);
	} catch (e) {
		try // Firefox, Mozilla, Opera, etc.
		{
			parser = new DOMParser();
			xmlDoc = parser.parseFromString(response, "text/xml");
		} catch (e1) {
			alert(e1.message);
		}
	}
	// did we get a document?
	if (!xmlDoc.documentElement || !xmlDoc.documentElement.firstChild) {
		alert('Error loading contents of url '
				+ url
				+ ' as an XML. The file may have syntax errors.\n XML tree view will not be loaded.');
		return;
	}
	var txt = [ '<ul class="rootnode">' ];
	this.buildTree(txt, xmlDoc.documentElement, '/', this.showValues);
	txt.push('\n</ul>');
	txt = txt.join('');
	obj.innerHTML = txt;
	this.rootNode = obj.childNodes[0].childNodes[0];
	if (this.expandAllOnLoad)
		this.changeVisibility(this.rootNode, true, true);
};

XmlTreeField.prototype.buildTree = function(txt, domEle, parentPath, addValues) {
	var currentAttribute, htmlAttributes;
	if (domEle.nodeType != Node.ELEMENT_NODE)
		return;
	var id = domEle.nodeName;
	var n = id.indexOf(':');
	if (n >= 0) {
		n++;
		id = id.substring(n, id.length - n);
	}
	id = parentPath + id;
	var children = domEle.childNodes;
	var attributes = domEle.attributes;
	if (attributes.length == 0
			&& (children.length == 0 || (children.length == 1 && children[0].nodeType == Node.TEXT_NODE))) { // leaf
		// node
		if (this.childHtmlAttributes) {
			txt.push('\n<li ');
			htmlAttributes = this.childHtmlAttributes.split("\); ");
			for ( var j = 0; j < htmlAttributes.length; j++) {
				currentAttribute = htmlAttributes[j].split("=");
				if (currentAttribute.length < 2)
					break;
				if (currentAttribute[1].match(/\);/))
					txt.push(currentAttribute[0] + '="' + currentAttribute[1]
							+ '" ');
				else
					txt.push(currentAttribute[0] + '="' + currentAttribute[1]
							+ ');" ');
			}
			txt.push(' id="' + id + '" >');
		} else
			txt.push('\n<li id="' + id + '" >');
		txt.push(domEle.nodeName);
		if (addValues && domEle.firstChild) {
			var val = domEle.firstChild.nodeValue;
			if (val)
				txt.push('=&quot;' + val + '&quot;');
		}
		txt.push('</li>');
		return;
	}
	// txt.push('class="collapsednode" onclick="P2.xmlNodeClicked(this);"');
	txt.push('\n<li id="' + id + '" ');
	if (this.childHtmlAttributes) {
		txt.push('\n<li ');
		htmlAttributes = this.childHtmlAttributes.split("\); ");
		for ( var j = 0; j < htmlAttributes.length; j++) {
			currentAttribute = htmlAttributes[j].split("=");
			if (currentAttribute.length < 2)
				break;
			if (currentAttribute[1].match(/\);/))
				txt.push(currentAttribute[0] + '="' + currentAttribute[1]
						+ '" ');
			else
				txt.push(currentAttribute[0] + '="' + currentAttribute[1]
						+ ');" ');
		}
	}
	txt.push('onclick="P2.xmlNodeClicked(this, ' + "'" + this.name + "'"
			+ ');">');
	txt
			.push('<img border="0" src="../../exilityImages/plus.gif" style="cursor:pointer;vertical-align:middle;">');
	txt.push(domEle.nodeName);
	txt.push('</li>');

	txt.push('\n<ul style="display: none;">');
	// txt.push('\n<ul>');

	for ( var i = 0; i < attributes.length; i++) {
		var att = attributes[i];
		txt.push('\n<li ');
		if (this.childHtmlAttributes) {
			htmlAttributes = this.childHtmlAttributes.split("\); ");
			for ( var j = 0; j < htmlAttributes.length; j++) {
				currentAttribute = htmlAttributes[j].split("=");
				if (currentAttribute.length < 2)
					break;
				if (currentAttribute[1].match(/\);/))
					txt.push(currentAttribute[0] + '="' + currentAttribute[1]
							+ '" ');
				else
					txt.push(currentAttribute[0] + '="' + currentAttribute[1]
							+ ');" ');
			}
		}
		txt.push(' id="' + id + '/' + att.name + '">');
		txt.push(att.name);
		if (addValues)
			txt.push('=&quot;' + att.value + '&quot;');
		txt.push('</li>');
	}

	parentPath += domEle.nodeName + '/';
	for ( var i = 0; i < children.length; i++)
		this.buildTree(txt, children[i], parentPath, addValues);

	txt.push('\n</ul>');
	return;
};

XmlTreeField.prototype.changeVisibility = function(ele, toExpand, toCascade) {
	if (!ele)
		ele = this.rootNode;
	if (ele && ele.nodeType == 3) // Sep 21 2009 : Bug 694 - Nodetype Error In
		// XML Treefield - Exility: Venkat
		ele = ele.nextSibling;
	if (!ele)
		return;
	var ul = ele.nextSibling;
	if (ul && ul.nodeType == 3)
		ul = ul.nextSibling;
	// alert('ele is ' + (ele.tagName || ele.nodeType) +' while ul is ' +
	// (ul.tagName || ul.nodeType));
	if (!ul || ul.nodeName != 'UL')// leaf node
		return;
	var img = ele.firstChild;
	if (img.nodeType == 3)
		img = img.nextSibling;
	var n = img.src.indexOf('plus');
	if (n >= 0)// this is right now collapsed.
	{
		if (toExpand == null || toExpand)// either + is clicked, or we are to
		// expand
		{
			ul.style.display = '';
			img.src = img.src.replace('plus', 'minus');
		}
	} else // it is in expanded mode now
	{
		if (!toExpand)// either - is clicked, or we are to collapse
		{
			ul.style.display = 'none';
			img.src = img.src.replace('minus', 'plus');
		}
	}
	if (!toCascade)
		return;
	var lis = ul.childNodes;
	for ( var i = 0; i < lis.length; i++)
		this.changeVisibility(lis[i], toExpand, true);
};

XmlTreeField.prototype.setGrid = function(grid) {
	var htmlAttributes, currentAttribute, curEle;
	menuHolder = this.P2.doc.getElementById(this.name);
	if (menuHolder) {
		var childHtmlAttribsExist = false;
		htmlAttributes = new Array();
		if (this.childHtmlAttributes) {
			childHtmlAttribsExist = true;
			htmlAttributes = this.childHtmlAttributes.split("\); ");
		}
		var rootNodeElement = this.P2.doc.createElement('ul');
		rootNodeElement.setAttribute('class', 'rootnode');
		rootNodeElement.setAttribute('id', '0');
		menuHolder.appendChild(rootNodeElement);
		for ( var i = 1; i < grid.length; i++) {
			var parentId = grid[i][0];
			var nodeId = grid[i][1];
			var nodeText = grid[i][2];
			var isParent = grid[i][3];
			var nodeLink = grid[i][4];

			if (parentId == 0) {
				if ((isParent == 'y') || (isParent == 'Y')) {
					curEle = this.P2.doc.createElement('li');
					curEle.setAttribute('id', nodeId);
					curEle.setAttribute('onclick', 'P2.xmlNodeClicked(this, '
							+ "'" + this.name + "'" + ');menuNavigateToPage('
							+ "'" + nodeLink + "'" + ');');
					if (childHtmlAttribsExist) {
						for ( var j = 0; j < htmlAttributes.length; j++) {
							currentAttribute = htmlAttributes[j].split("=");
							if (currentAttribute.length < 2)
								break;
							if (currentAttribute[1].match(/\);/))
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1]);
							else
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1] + ");");
						}
					}
					curEle.innerHTML = '<img border="0" src="../../exilityImages/plus.gif" style="cursor:pointer;vertical-align:middle;">'
							+ nodeText;
					var curChildEle = this.P2.doc.createElement('ul');
					curChildEle.style.display = 'none';
					this.P2.doc.getElementById(parentId).appendChild(curEle);
					this.P2.doc.getElementById(parentId).appendChild(
							curChildEle);
				} else {
					curEle = this.P2.doc.createElement('li');
					curEle.setAttribute('id', nodeId);
					curEle.setAttribute('onclick', 'menuNavigateToPage(' + "'"
							+ nodeLink + "'" + ');');
					if (childHtmlAttribsExist) {
						for ( var j = 0; j < htmlAttributes.length; j++) {
							currentAttribute = htmlAttributes[j].split("=");
							if (currentAttribute.length < 2)
								break;
							if (currentAttribute[1].match(/\);/))
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1]);
							else
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1] + ");");
						}
					}
					// Jul 30 2009 : Bug 519 - XMLTree rendered using grid
					// needed addational functions - SABMiller (End) : Aravinda
					curEle.innerHTML = nodeText;
					this.P2.doc.getElementById(parentId).appendChild(curEle);
				}
			} else {
				if ((isParent == 'y') || (isParent == 'Y')) {
					curEle = this.P2.doc.createElement('li');
					curEle.setAttribute('id', nodeId);
					curEle.setAttribute('onclick', 'P2.xmlNodeClicked(this, '
							+ "'" + this.name + "'" + ');menuNavigateToPage('
							+ "'" + nodeLink + "'" + ');');
					if (childHtmlAttribsExist) {
						for ( var j = 0; j < htmlAttributes.length; j++) {
							currentAttribute = htmlAttributes[j].split("=");
							if (currentAttribute.length < 2)
								break;
							if (currentAttribute[1].match(/\);/))
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1]);
							else
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1] + ");");
						}
					}
					curEle.innerHTML = '<img border="0" src="../../exilityImages/plus.gif" style="cursor:pointer;vertical-align:middle;">'
							+ nodeText;
					curChildEle = this.P2.doc.createElement('ul');
					curChildEle.style.display = 'none';
					this.P2.doc.getElementById(parentId).nextSibling
							.appendChild(curEle);
					this.P2.doc.getElementById(parentId).nextSibling
							.appendChild(curChildEle);
				} else {
					curEle = this.P2.doc.createElement('li');
					curEle.setAttribute('id', nodeId);
					curEle.setAttribute('onclick', 'menuNavigateToPage(' + "'"
							+ nodeLink + "'" + ');');
					if (childHtmlAttribsExist) {
						for ( var j = 0; j < htmlAttributes.length; j++) {
							currentAttribute = htmlAttributes[j].split("=");
							if (currentAttribute.length < 2)
								break;
							if (currentAttribute[1].match(/\);/))
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1]);
							else
								curEle.setAttribute(currentAttribute[0],
										currentAttribute[1] + ");");
						}
					}
					curEle.innerHTML = nodeText;
					this.P2.doc.getElementById(parentId).nextSibling
							.appendChild(curEle);
				}
			}
		}
		var menuText = menuHolder.innerHTML;
		menuHolder.innerHTML = "";
		menuHolder.innerHTML = menuText;
		this.rootNode = menuHolder.childNodes[0].childNodes[0];
	}
	if (this.expandAllOnLoad)
		this.changeVisibility(this.rootNode, true, true);
	return;
};
