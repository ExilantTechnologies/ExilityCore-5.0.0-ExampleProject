//funcitons to be defined if this is used outside of exility
if (!window.htmlEscape) {
	if (window.PM)
		window.htmlEscape = PM.htmlEscape;
	else {
		window.htmlEscape = function(str) {
			return str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
		};
	}
}

/*******************************************************************************
 * Tree - fairly straight forward, except one change. No root node. Instead we
 * keep an array branches, and there is NO ROOT NODE. And we call root node of
 * branches as roots. This is for convenience of its intended use so far
 ******************************************************************************/
var TreeNode = function() {
	//
};

var a = TreeNode.prototype;

/*******************************************************************************
 * row is assumed to have following columns 0: id unique 1: parentId - empty
 * string for trunks 2: name - text that is displayed as menu item 3: value -
 * passed to the call back function 4: type - if present, treeNodeType="type" is
 * set for the item, so that you can use that as rule selector in css.
 ******************************************************************************/
a.setFromRow = function(treeName, row) {
	this.id = row[0];
	this.eleId = treeName + '.' + this.id; // avoid id conflict with possible
											// other elements of dom
	this.parentId = row[1] || null;
	this.name = row[2];
	this.value = row[3] || null;
	this.type = row[4] || null;
	this.treeName = treeName;
	this.data = row;
	// this.childNodes ; //contains an array of child nodes, built by tree
	// this.parentNode;
};
a.setFromObject = function(treeName, obj) {
	this.id = obj.id;
	this.eleId = treeName + '.' + this.id; // avoid id conflict with possible
											// other elements of dom
	this.parentId = obj.parentId || null;
	this.name = obj.name;
	this.value = obj.value || null;
	this.type = obj.type || null;
	this.treeName = treeName;
	this.data = obj;
};

a.disable = function() {
	this.disabled = true;
	var ele = document.getElementById(this.eleId);
	if (ele)
		ele.disabled = true;
	if (this.quickEle) {
		this.quickEle.style.display = 'none';
	}
};

a.enable = function() {
	this.disabled = false;
	var ele = document.getElementById(this.eleId);
	if (ele)
		ele.disabled = false;
	if (this.quickEle) {
		this.quickEle.style.display = '';
	}
};

/*******************************************************************************
 * A node is rendered with following dom structure <div class="nodeBranch"> <div
 * id="this.eleId" class="trunk/branch/leaf+NodeText" treeNodeType="type">node
 * name</div> <div id="this.eleId+Group" class="nodeGroup"> recursive rendering
 * of each childNode.. </div> </div>
 ******************************************************************************/
// t is the array that accumulates html text
a.render = function(t) {
	if (this.childNodes) {
		t.push('<div class="nodeBranch">'); // div-1 open
	}

	// render this node
	t.push('<div id="'); // div-2 open
	t.push(this.eleId);
	t.push('" class="');
	if (this.childNodes) {
		if (this.parentNode)
			t.push('branch');
		else
			t.push('trunk');
	} else
		t.push('leaf');
	t.push('NodeText" ');
	if (this.disabled)
		t.push('disabled="disabled" ');
	if (this.type) {
		t.push('treeNodeType="');
		t.push(this.type);
		t.push('" ');
	}
	t.push('>');
	t.push(htmlEscape(this.name)); // htmlEscape is in utils.js
	t.push('</div>'); // div - 2 closed

	// render child nodes, if any
	if (this.childNodes) {
		t.push('<div style="display:none; z-index:10" class="nodeGroup" id="'); // div-3
																				// open
		t.push(this.eleId);
		t.push('Group">');
		for ( var i = 0; i < this.childNodes.length; i++) {
			this.childNodes[i].render(t);
		}
		t.push('</div></div>'); // div 3 - closed, div-1 cosed. Div-1 was opened
								// only if this.childNodes
	}
};
// get <ul><li>..</li><li>..</li>.......</ul>
a.getUlLi = function(t) {
	t.push('<li><a href="#">');
	t.push(htmlEscape(this.name));
	t.push('</a>');
	if (this.childNodes) {
		t.push('\n<ul>\n');
		for ( var i = 0; i < this.childNodes.length; i++) {
			this.childNodes[i].getUlLi(t);
		}
		t.push('\n</ul>\n');
	}
	t.push('</li>\n');
};
/*******************************************************************************
 * add this node to the quick-menu list to implement a spot-light like quick
 * search t - array of innerHTML text for the element prefix - text representing
 * parent menus to be prefixed to this menu name
 ******************************************************************************/
a.addQuickMenu = function(t, prefix) {
	var txt = this.name;
	if (prefix)
		txt = prefix + ' > ' + txt;
	var encodedText = htmlEscape(txt);
	if (!this.childNodes) // this is a leaf. to be added to the list
	{
		this.tree.quickNodes.push(this);
		t.push('<div title="');
		t.push(encodedText);
		t.push('" class="quickMenuNode" id="');
		t.push(this.eleId);
		t.push('QuickEle" class="quickMenuNode" data-nodeId="');
		t.push(this.id);
		t.push('" ');
		if (this.disabled)
			t.push('style="display:none" ');
		t.push('>');
		t.push(encodedText);
		t.push('</div>');
		// this.quickEle = ele; this will be done as part of render() at which
		// time quickMenu would have been added to dom
		this.quickText = txt.toUpperCase();

		return;
	}

	// No need to add this node, as it is a group name.
	// recurse for each of the child nodesthis is a menu.
	for ( var i = 0; i < this.childNodes.length; i++)
		this.childNodes[i].addQuickMenu(t, txt);
};

/* quickEle is the dom element inside quick menu for this node */
a.cacheQuickEle = function() {
	if (this.quickText) {
		this.quickEle = document.getElementById(this.eleId + 'QuickEle');
	} else {
		for ( var i = 0; i < this.childNodes.length; i++)
			this.childNodes[i].cacheQuickEle();
	}
};
// expand the branch below
a.expand = function(toCascade) {
	if (!this.childNodes)
		return;

	if (!this.expanded) {
		this.expanded = true;
		var ele = document.getElementById(this.eleId);
		ele.setAttribute('expanded', 'expanded');
		ele = document.getElementById(this.eleId + 'Group');
		animateHideAndShow(ele, 'show');
		// ele.style.display = '';
	}

	if (toCascade) {
		for ( var i = 0; i < this.childNodes.length; i++)
			this.childNodes[i].expand(toCascade);
	}
};

a.collapse = function(toCascade) {
	if (!this.childNodes)
		return;
	if (this.expanded) {
		this.expanded = false;
		var ele = document.getElementById(this.eleId);
		ele.removeAttribute('expanded');
		var ele = document.getElementById(this.eleId + 'Group');
		animateHideAndShow(ele, 'hide');
		// ele.style.display = 'none';
	}

	if (toCascade) {
		for ( var i = 0; i < this.childNodes.length; i++)
			this.childNodes[i].collapse(toCascade);
	}
};

a.alternate = function() {
	if (this.expanded)
		this.collapse(false);
	else
		this.expand(false);
};
/*******************************************************************************
 * Tree is the main class that represents a menu
 ******************************************************************************/
var Tree = function(nam) {
	this.name = nam;
	if (document.getElementById(nam)) {
		alert(nam
				+ ' is already used as an html element. A menu with this name can not be built');
		return;
	}
	if (window[nam]) {
		alert(nam
				+ ' is already used as a variable in your javascript. A menu with this name can not be built');
		return;
	}
	window[nam] = this; // created as a variable in the window. Used by event
						// functions to execute method of this tree
};

var a = Tree.prototype;
/*******************************************************************************
 * Build a tree from an array. If you want to show all menu items, but disable
 * items that the logged-in user is not authorized, let values be empty string
 * for them, and set disableNodesWithNoValues = true
 ******************************************************************************/
a.buildFromArray = function(data, disableNodesWithNoValues, dataContainsObjects) {
	this.roots = []; // top level menu items
	this.nodes = {}; // all menu itmes indexed by id

	var duplicates = {}; // temp collection to eliminate duplicates
	// convert rows in array into nodes and push them into this.nodes collection
	var row, node, id;
	var startAt = dataContainsObjects ? 0 : 1;
	for ( var i = startAt; i < data.length; i++) {
		row = data[i];
		id = dataContainsObjects ? row.id : row[0];
		if (this.nodes[id]) {
			alert('Menu item id :' + id
					+ ' is a duplicate. This item will be ignored.');
			duplicates[i] = true;
			continue;
		}

		node = new TreeNode();
		if (dataContainsObjects)
			node.setFromObject(this.name, row);
		else
			node.setFromRow(this.name, row);

		if (disableNodesWithNoValues && !node.value && node.value != 0) {
			node.disable();
		}

		this.nodes[id] = node;
		this.nodes[node.eleId] = node; // also indexed by the domele id

		if (!node.parentId)
			this.roots.push(node);

		node.tree = this;
	}

	// build childCollections for all nodes. We are reading from the array to
	// maintain sequence of child nodes
	for ( var i = startAt; i < data.length; i++) {
		if (duplicates[i])
			continue;

		row = data[i];
		id = dataContainsObjects ? row.id : row[0];
		node = this.nodes[id];
		if (!node.parentId) // root
			continue;

		var parentNode = this.nodes[node.parentId];
		if (!parentNode) {
			alert(node.name + ' has its parent id set to ' + node.parentId
					+ '. There is no item with this id. Node is ignored.');
			continue;
		}

		if (!parentNode.childNodes)
			parentNode.childNodes = [];

		parentNode.childNodes.push(node);
		node.parentNode = parentNode;
	}
};

/*******************************************************************************
 * divId is the id of the dom element inside which the menu is to be rendered
 * position : 'top' or 'left'. default is left. dom structure is same in both
 * case, but events are slightly different. onClickFn : pointer to a function
 * that is called back when a leaf node is clicked omcClickFn(value, node)
 * quickMenuId : optional if you want a hot-spot. id of a text box.
 ******************************************************************************/
a.createMenu = function(divId, position, onClickFn, quickMenuId) {
	this.rootEle = document.getElementById(divId);
	if (!this.rootEle) {
		alert(divId + ' is not a dom element. Menu can not be built for '
				+ this.name);
		return;
	}

	if (onClickFn)
		this.onClickFn = onClickFn;

	var n = this.roots.length;
	if (!n) {
		alert(this.name
				+ ' does not have any nodes in that. Menu will not be rendered');
		return;
	}

	var t = [];
	if (position == 'top') {
		t.push('<div class="topMenu" id="');
		t.push(this.name);
		t.push('RootEle" onmouseover="');
		t.push(this.name);
		t.push('.inOut(event, false);" onmouseout="');
		t.push(this.name);
		t.push('.inOut(event, true);" onclick="');
		t.push(this.name);
		t.push('.selected(event);"> ');
	} else {
		t.push('<div class="leftMenu" id="');
		t.push(this.name);
		t.push('RootEle" onclick="');
		t.push(this.name);
		t.push('.clicked(event);"> ');
	}

	for ( var i = 0; i < n; i++) {
		this.roots[i].render(t);
	}

	t.push('</div>');
	this.rootEle.innerHTML = t.join('');

	this.visibleGroups = new Object();
	if (quickMenuId) {
		this.addQuickMenu(quickMenuId);
		// optimize search by caching quickEle
		for ( var i = 0; i < n; i++) {
			this.roots[i].cacheQuickEle();
		}
	}
};

// add spot-light functionality
a.addQuickMenu = function(id) {
	this.quickNodes = [];
	var ele = document.getElementById(id);
	if (!ele || ele.nodeName.toLowerCase() != 'input') {
		alert(id
				+ ' is not an inpiut field on your page. Quick search will not work for menu '
				+ this.name);
		return;
	}

	ele.setAttribute('data-menuName', this.name);
	if (ele.addEventListener) {
		ele.addEventListener("keypress", keyPressedOnQuickMenu, true);
		ele.addEventListener("blur", quickMenuBlurred, true);
	} else {
		ele.attachEvent("onkeypress", keyPressedOnQuickMenu);
		ele.attachEvent("blur", quickMenuBlurred);
	}

	this.quickMenuEle = ele;

	// for simplicity, we enclose this in an inline-block div and make the quick
	// menu relative to that
	var sibling = ele.nextSibling;
	var par = ele.parentNode;
	par.removeChild(ele);

	// create a wrpper that is relative
	var div = document.createElement('div');
	div.style.display = 'inline-block';
	div.style.position = 'relative';
	div.id = id + 'QuickMenuContainer';
	div.appendChild(ele); // add text box back to this

	// add this wrapper to dom
	if (sibling)
		par.insertBefore(div, sibling);
	else
		par.appendChild(div);

	var q = document.createElement('div');
	q.style.position = 'absolute'; // expect users to supply the right css to
									// align it below
	q.style.display = 'none';
	q.className = 'quickMenuSuggestions';
	q.id = id + 'QuickMenu';
	q.setAttribute('data-menuName', this.name);

	div.appendChild(q);
	this.quickEle = q;
	// ele will be reused to carry temp meanings
	// show this ele when no matching elements
	ele = document.createElement('div');
	ele.innerHTML = 'No matching items';
	ele.id = id + 'NoMatch';
	this.noMatchEle = ele;

	q.appendChild(ele);

	this.quickTexts = [];
	ele = document.createElement('div');
	ele.className = 'quickMenuNodes';
	if (ele.addEventListener)
		ele.addEventListener("mousedown", menuItemSelected, true);
	else
		ele.attachEvent("onmousedown", menuItemSelected);
	var t = [];
	for ( var i = 0; i < this.roots.length; i++) {
		this.roots[i].addQuickMenu(t);
	}
	ele.innerHTML = t.join('');
	q.appendChild(ele);
};

a.quickEleBlurred = function() {
	this.quickMenuEle.value = '';
	this.quickEle.style.display = 'none';
};

var quickMenuBlurred = function(e) {
	var ele = e.target || e.srcElement;
	var menu = ele.getAttribute('data-menuName');
	window[menu].quickEleBlurred();
};
// note that this is a funciton defined into the window, and is used as an event
// function
var keyPressedOnQuickMenu = function(e) {
	var ele = e.target || e.srcElement;
	var menu = ele.getAttribute('data-menuName');
	window.setTimeout('window["' + menu + '"].quickSearch(' + e.keyCode + ')',
			0);
};

// note that this is a funciton defined into the window, and is used as an event
// function
var menuItemSelected = function(e) {
	var ele = e.target || e.srcElement;
	var menu = ele.parentNode.parentNode.getAttribute('data-menuName');

	window[menu].quickSelect(ele.getAttribute('data-nodeId'));
};

// if search string contains more than one tokens.. "ab cd" will match if cd is
// found some time after ab
// takes value from input element and shows matching menu items
a.quickSearch = function(keyCode) {
	if (keyCode == 9) // tab
	{
		this.quickMenuEle.value = ''; // zap it
		return;
	}
	var val = trim(this.quickMenuEle.value);
	if (!val.length) {
		this.quickEle.style.display = 'none';
		return;
	}

	val = val.replace(/[\.]/g, '\\.').replace(/[>]/g, '.*');
	val = val.toUpperCase();
	var nbrMatched = 0;

	for ( var i = 0; i < this.quickNodes.length; i++) {
		var node = this.quickNodes[i];
		// alert('going to match ' + val + ' with ' + node.quickText + ' with
		// result = ' + node.quickText.match(val));
		// return;
		if (node.quickText.match(val)) {
			nbrMatched++;
			node.quickEle.style.display = '';
		} else {
			node.quickEle.style.display = 'none';
		}
	}

	this.quickEle.style.display = '';
	this.noMatchEle.style.display = nbrMatched ? 'none' : '';
};

// we ignore focus in/out on areas other than the actual node areas. Let us try
// this approach till it breaks!!
// Since show and hide are animated, it is possible that a user may be
// quick-enough to catch a menu group that is about to wind-up.
// Hence our event handling has to be quite exhaustive
a.inOut = function(e, isOut) {
	var ele = e.target || e.srcElement;
	// some browsers used to return text node as target. Do they still DO?,
	// playing it safe
	if (!ele.id && ele.nodeType == 3) // text node
		ele = ele.parentNode;
	var node = this.nodes[ele.id];
	if (!node)
		return;

	if (isOut)// move out
	{
		this.fromNode = node;
		this.timer = window.setTimeout(this.name + '.hideAll()', 100);
		return;
	}
	// mouse in
	if (this.timer) {
		window.clearTimeout(this.timer);
		this.timer = null;
	}

	// move in. We have to show the branch attached to this node, and possibly
	// all ancestors
	var toShow = this.getAncestors(node);
	var endShow = toShow.length; // by default show all groups. You will see
									// later that we may do some optimization

	if (this.fromNode) // focus shifted from another node. See what has to be
						// hidden
	{
		var toHide = this.getAncestors(this.fromNode);
		this.fromNode = null;

		// it is possible that we are trying to show as well as close some
		// branches.
		// try and see if the two have common ancestors
		endHide = toHide.length;
		var match = this.getMatch(toShow, toHide);
		if (match) {
			endShow = match.m1;
			endHide = match.m2;
		}

		// hide if requires
		for ( var i = 0; i < endHide; i++) {
			this.hideGroup(toHide[i]);
		}
	}

	for ( var i = 0; i < endShow; i++) {
		this.showGroup(toShow[i]);
	}

};

// compares content objects of two arrays and retruns the index at which a match
// is found
// returned object has m1 and m2 as the index for arr1 and arr2. null is
// returned if no match is found
a.getMatch = function(arr1, arr2) {
	for ( var i = 0; i < arr1.length; i++) {
		for ( var j = 0; j < arr2.length; j++) {
			if (arr1[i] === arr2[j]) {
				var ret = new Object();
				ret.m1 = i;
				ret.m2 = j;
				return ret;
			}
		}
	}
};

// returns an array of all ancestor nodes
a.getAncestors = function(node) {
	var arr = [];
	while (node) {
		arr.push(node);
		node = node.parentNode;
	}
	return arr;
};

a.hideAll = function() {
	this.fromNode = null;
	for ( var id in this.visibleGroups) {
		var ele = document.getElementById(id + 'Group');
		if (ele) {
			// ele.style.display = 'none';
			animateHideAndShow(ele, 'hide');
		}
	}
	this.visibleGroups = new Object();
};

a.showGroup = function(node) {
	var ele = document.getElementById(node.eleId + 'Group');
	if (ele) {
		// ele.style.display = 'block';
		animateHideAndShow(ele, 'show');
		this.visibleGroups[node.eleId] = true;
	}
};

a.hideGroup = function(node) {
	var ele = document.getElementById(node.eleId + 'Group');
	if (ele) {
		// ele.style.display = 'none';
		animateHideAndShow(ele, 'hide');
		delete this.visibleGroups[node.eleId];
	}
};

a.clicked = function(e) {
	var ele = e.target || e.srcElement;
	var node = this.nodes[ele.id];
	if (!node || node.disabled)
		return;

	if (!node.childNodes) {
		this.onClickFn(node.value, node.data);
		return;
	}
	node.alternate();
};

a.selected = function(e) {
	var ele = e.target || e.srcElement;
	var node = this.nodes[ele.id];
	if (!node || node.disabled || node.childNodes) {
		// alert(name + ' is not a menu item in ' + this.name);
		return;
	}
	this.hideAll();
	this.onClickFn(node.value, node.data);
};

a.expandAll = function() {
	for ( var i = 0; i < this.roots.length; i++)
		this.roots[i].expand(true);
};

a.collapseAll = function() {
	for ( var i = 0; i < this.roots.length; i++)
		this.roots[i].collapse(true);
};

a.showNode = function(id) {
	var node = this.nodes[id];
	if (!node)
		return;
	node = node.parentNode;
	while (node) {
		node.expand(false);
		node = node.parentNode;
	}
};

// selects a menu item dispalyed below the quick search field
a.quickSelect = function(id) {
	var node = this.nodes[id];
	if (!node || node.childNodes)
		return;
	this.onClickFn(node.value, node.data);
	this.quickEle.style.display = 'none';
};

// default function to be executed when a leaf menu item is clicked. Overridden
// with user supplied function
a.onClickFn = function(value, data) {
	if (!value && value != 0)
		return;
	if (value.toString().indexOf('(') > 0) // we assume it to be a java script
	{
		try {
			eval(value);
		} catch (e) {
			alert('invalid script assigned as value to menu item\n' + value);
		}
		return;
	}
	var win = window.currentActiveWindow;
	if (win) // it is an exility page
	{
		exilityPageStack.resetStack();
		exilityPageStack.goTo(win, NavigationAction.REPLACE, value);
		return;
	}
};

/*******************************************************************************
 * returns an html that renders the menu as set of
 * <ul>
 * <li> tags
 ******************************************************************************/
a.getUlLi = function() {
	var n = this.roots.length;
	if (!n) {
		alert(this.name
				+ ' does not have any nodes in that. Menu will not be rendered');
		return;
	}

	var t = [];
	t.push('<ul>');
	for ( var i = 0; i < n; i++) {
		this.roots[i].getUlLi(t);
	}
	t.push('</ul>');
	return t.join('');
};
