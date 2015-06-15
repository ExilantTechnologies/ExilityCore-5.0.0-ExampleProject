/*******************************************************************************
 * fixed-list assistant : behaves like a drop-down, well almost.
 * 
 * 1. All values are displayed.
 * 
 * 2. As user types, list is shortened to show only rows that start with the
 * typed characters. (this behaviour is an improvement(?) over drop-down
 * 
 * 3. first matching row is also selected.
 * 
 * 4. If user types a character that results in no-match, a sound is produced,
 * and that character, and any subsequent ones are all ignored
 * 
 * 5. A pause of 500 millisecond is considered to be end of selection process.
 * Subsequent typing is considered to be a fresh start
 * 
 * 6. up/down arrow keys work.
 * 
 * 7. escape key restores old value and abandons selection. Focus is still
 * retained.
 * 
 * 8. click on a row selects the row and simulates a tab. we handle onkeydown
 * and cancel the event, so that onkeypress never triggers.
 ******************************************************************************/

/**
 * @class ListAssistant
 * @param p2
 *            page for which this assistant is instantiated
 */
var ListAssistant = function(p2) {
	this.P2 = p2;
	this.win = p2.win;

	/*
	 * create the assistant container, only once for a page
	 */
	if (!p2.listDiv) {
		p2.listDiv = this.createListDiv(p2.doc);
	}
	this.div = p2.listDiv;
};

ListAssistant.prototype = {

	/**
	 * one time creation of html div for rendering this assistant. This is
	 * re-used
	 * 
	 * @param doc
	 *            html document object
	 * @returns innerHTML for a div element
	 */
	createListDiv : function(doc) {
		var div = doc.createElement('div');
		div.innerHTML = '<div id="list_assistant" style="position:absolute; z-index:3;display:none" onmousedown="P2.ia.assistant.rowClicked(event)"></div>';
		// we need ul element and not div
		div = div.firstChild;
		// some browsers insert text-elements all-over the place
		if (div.nodeType == 3)
			div = div.nextSibling;
		doc.body.appendChild(div);
		return div;
	},
	/**
	 * start assisting an input element. this is typically invoked onfocus of
	 * the field
	 * 
	 * @param field
	 * @param ele
	 *            dom element being assisted
	 * @param vList
	 *            list of values to be used
	 * @param isRestart
	 */
	start : function(field, ele, vList, isRestart) {
		this.field = field;
		this.ele = ele;
		this.displayValue = this.oldValue = this.ele.value;
		this.oldInternalValue = this.ele.internalValue;
		this.vList = vList;
		this.nbrRows = vList.length;

		/*
		 * this.colIdx is the column that is used for matching. Additionally, it
		 * is possible that we are displaying other columns as well. If so, such
		 * columns are in this.colIndexes
		 */
		if (field.columnIndexesToShow) {
			var indexes = field.columnIndexesToShow.split(',');
			this.colIdx = parseInt(indexes[0], 10);
			if (indexes.length > 1) {
				this.colIndexes = [];
				for ( var i = 0; i < indexes.length; i++) {
					this.colIndexes.push(parseInt(indexes[i], 10));
				}
			}
		} else {
			// second column is what we have to use, if it exists of course
			if (vList.length && vList[0].length > 1)
				this.colIdx = 1;
			else
				this.colIdx = 0;
		}

		this.ucasedValues = []; // caches upper-cased values for performance
		this.val = null; // tracks the characters typed so far
		this.wrongChars = false; // has the user already typed characters
		// with no
		// match?
		this.curRow = null;
		this.position();
		this.div.removeAttribute(AssistedInputField.ATTR);
		this.render();
		if (!isRestart) {
			// let onkeydown from this element call this.keyDowned()
			this.listener = this.P2.addListener(ele, 'keydown', this,
					'keyDowned');
		}
		if (this.oldValue)
			this.matchARow(this.oldValue);
	},

	/**
	 * @method position position the list div just below the field being
	 *         assisted
	 */
	position : function() {
		var xy = getDocumentXy(this.ele); // part of exility utility
		var style = this.div.style;
		style.top = (xy.y + this.ele.clientHeight - 1) + 'px';
		style.left = (xy.x - 1) + 'px';
		this.div.innerHTML = '';
		if (this.field.listCss)
			this.div.className = this.field.listCss;
		else {
			this.div.className = '';
			style.width = (this.field.listWidth || this.ele.clientWidth) + 'px';
		}
	},

	/**
	 * @method end this assistance session
	 */
	end : function() {
		/*
		 * if user has left junk, or cleared it...
		 */
		if (!this.ele.value || this.displayValue != this.ele.value) {
			if (this.ele.value) // revert back to last value
				this.ele.value = this.displayValue;
			else
				this.displayValue = this.ele.internalValue = '';
		}
		this.P2.removeListener(this.listener);
		this.div.style.display = 'none';
	},
	/**
	 * @method keyDowned event handler when a key is downed.
	 * @param e
	 *            event
	 */
	keyDowned : function(e) {
		var key = e.keyCode;

		if (key === 9)// tab
			return;

		if (key === 27 || key === 13) {// esc or enter
			if (key === 27) {
				this.ele.value = this.oldValue;
				this.ele.internalValue = this.oldInternalValue;
			}
			if (e.preventDefault)
				e.preventDefault();
			else
				e.returnValue = false;
			this.P2.focusNext(this.field, this.ele);
			return;
		}

		/*
		 * so long as we are not waiting for list to come
		 */
		if (!this.vList.stillFetching) {
			if (key === 38) { // up
				this.moveUpDown(true, e.shiftKey);

			} else if (key === 40) { // down
				this.moveUpDown(false, e.shiftKey);

			} else if (key < 48 || key > 90) {
				/*
				 * not the characters we expect(space, del and backspace to be
				 * cancelled)
				 */
				if (key !== 32 && key !== 46 && key !== 8
						&& (key < 96 || key > 111)) {
					/*
					 * well, 32 is space, 46 is del, and 96-111 is numeric pad
					 */
					return;
				}
			} else
				this.matchARow(String.fromCharCode(key));
		}

		/*
		 * we do not want the character to show-up on the field. We are managing
		 * that.
		 */
		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
	},

	/**
	 * @method moveUpDown ove cursor on the list
	 * @param {boolean}
	 *            up true if it is up, false if it has to move down
	 * @param {boolean}
	 *            shift whether shift key is pressed. In that case it is treated
	 *            as scroll up/down
	 * @returns none
	 */
	moveUpDown : function(up, shift) {
		this.val = null;
		if (shift) {
			this.scroll(up);
			return;
		}
		if (!this.curRow) {
			this.select(null, 0); // let start
		}
		var row;
		if (up) {
			row = (this.curRow && this.curRow.previousSibling)
					|| this.div.lastChild;
		} else {
			row = (this.curRow && this.curRow.nextSibling)
					|| this.div.firstChild;
		}
		this.select(row);

		return;
	},

	/**
	 * @method matchARow find a row that matches what user has typed so far
	 * @param {string}
	 *            val what is typed now
	 * @returns none
	 */
	matchARow : function(val) {
		var row;
		if (this.val) { // continuous typing
			if (this.wrongChars)
				return;

			this.val += val;
			row = this.curRow;
		} else {
			this.wrongChars = false;
			if (val == ' ') // at this time, I am unable to see why space is
				// accepted. Hence trapping right here
				return;
			this.val = val;
			row = this.curRow && this.curRow.nextSibling;
		}
		if (!row) {// start from current row, or from the beginning
			row = this.div.firstChild;
		}
		var idx = +row.getAttribute('idx');

		var i = idx;
		while (true) {// look for break.. see if a row exists for all chars.
			if (i && i >= this.vList.length) {
				alert(i + ' points outside the array of length '
						+ this.ucasedValues.length);
				return;
			}
			var v = this.ucasedValues[i];
			if (!v) {
				v = this.vList[i] && this.vList[i][this.colIdx];
				if (v) {
					if (!v.toUpperCase)
						v = new String(v);
					this.ucasedValues[i] = v = v.toUpperCase();
				} else {
					alert('For i = ' + i + ' and colIdx ' + this.colIdx
							+ ' we did not get a value.\n' + this.vList);
					return;
				}
			}
			if (v.indexOf(this.val) == 0) { // indeed started with the typed
				// chars.
				this.select(row);
				break;
			}
			row = row.nextSibling;
			i++;
			if (!row) {// loop back
				row = this.div.firstChild;
				i = 0;
			}
			if (i === idx) { // reached back. No luck
				this.wrongChars = true; // small optimization. Any more typing
				// is
				// ignored..
				break;
			}
		}
		if (this.timer) {
			this.timer.stop();
			this.timer = null;
		}
		// if user pauses, current selection aborts..
		this.timer = new TimeBomb(this, 'resetValue', null, 500, this.win);
	},

	// user has paused typing. Assume end of typing to select a row
	/**
	 * @method resetValue - user has paused typing. Cancel what has been typed
	 *         so far
	 */
	resetValue : function() {
		this.val = null;
		this.wrongChars = false;
	},

	// row is the dom <div> element. idx is the index of the seletced row.
	/**
	 * @method select select a row that user clicked on
	 * @param {DomElement}
	 *            row that user clicked. null if the row selection is based on
	 *            index
	 * @param {integer}
	 *            idx row number to be selected. used only if row is null
	 */
	select : function(row, idx) {
		if (row) {
			idx = parseInt(row.getAttribute('idx'), 10);
		} else if (idx || idx == 0) {
			row = this.div.childNodes[idx];
		}
		if (this.curRow) {
			this.curRow.className = '';
		}
		if (row) {
			row.className = 'selected';
			this.curRow = row;
			this.displayValue = this.ele.value = this.vList[idx][this.colIdx];
			this.ele.internalValue = this.vList[idx][0];
		} else {
			this.curRow = null;
		}
		// We need to select and focus so that the carrot is not visisble...
		this.ele.focus();
		if (this.ele.select) {
			this.ele.select();
		}
		// is the actual row visible?
		if (!this.isScrolled || !row) {
			return;
		}
		var rowTop = row.offsetTop;
		var scrollTop = this.div.scrollTop;
		if (rowTop < scrollTop) {
			this.div.scrollTop = rowTop;
			return;
		}

		var rowBottom = rowTop + row.clientHeight;
		var scrollBottom = scrollTop + this.div.clientHeight;
		if (rowBottom > scrollBottom) {
			this.div.scrollTop = rowBottom - this.div.clientHeight;
			return;
		}
	},

	// called as an event handler when user clicks on any of the row.
	/**
	 * @method rowCLicked event handler when user clicks on a row
	 * @param {DomEvent}
	 *            e
	 */
	rowClicked : function(e) {
		var row = e.target || e.srcElement;
		if (row.nodeType == 3) {
			row = row.parentNode;
		}
		var idx = parseInt(row.getAttribute('idx'), 10);
		if (!idx && idx != 0) {
			debug('Suprising that there was a click on a dom element with no idx attriute. click ignored');
			return;
		}
		// this click action ends up executing after whtever we do (like
		// focusing to
		// next field et..) spoiling all that.
		// better prevent that.
		if (e.preventDefault)
			e.preventDefault();
		else
			e.returnValue = false;
		this.displayValue = this.ele.value = this.vList[idx][this.colIdx];
		this.ele.internalValue = this.vList[idx][0];
		this.P2.focusNext(this.field, this.ele);
	},

	/**
	 * @method render List of possible values are rendered
	 */
	render : function() {
		// this.vList has the rows to be rendered
		if (this.vList && this.vList.length) {
			this.nbrRows = this.vList.length;
			var s = new Array();
			if (this.colIndexes) {
				s.push('<table><tbody>');
				for ( var i = 0; i < this.nbrRows; i++) {
					var aRow = this.vList[i];
					s.push('<tr>');
					for ( var j = 0; j < this.colIndexes.length; j++) {
						s.push('<td idx="');
						s.push(i);
						s.push('">');
						s.push(htmlEscape(aRow[this.colIndexes]));
						s.push('</td>');
					}
					s.push('</tr>');
				}
				s.push('</tbody></table>');
			} else {
				for ( var i = 0; i < this.nbrRows; i++) {
					var txt = this.vList[i][this.colIdx];
					s.push('<div idx="');
					s.push(i);
					s.push('" ');
					s.push('title=\"');
					s.push(txt);
					s.push('\" >');
					s.push(htmlEscape(txt));
					s.push('</div>');
				}
			}
			// page designer would have asked for specific css
			if (this.field.suggestionCss)
				this.div.className = this.field.suggestionCss;
			this.div.innerHTML = s.join('');
		} else {
			this.nbrRows = 0;
			this.div.innerHTML = 'No valid options.';
		}
		this.div.style.display = '';

		if (this.div.scrollHeight > this.div.clientHeight)
			this.isScrolled = true;
		else
			this.isScrolled = false;
	},

	/**
	 * @method scroll scroll the list up/down
	 * @param {boolen}
	 *            up true for scroll-up, false for scroll-down
	 */
	scroll : function(up) {
		if (!this.isScrolled) {
			return;
		}
		var n;
		if (up) {
			if (!this.div.scrollTop) {
				/*
				 * scroll-top is zero means we can not go up any further
				 */
				return;
			}
			n = this.div.scrollTop - this.div.clientHeight;
			if (n < 0)
				n = 0;
		} else {
			n = this.div.scrollTop + this.div.clientHeight;
			if (n > this.div.scrollHeight) // can't go any lower than this
				return;
		}
		this.div.scrollTop = n;
	},

	/**
	 * @method restart list of valid values is received when this assistant is
	 *         active
	 * @param {array}
	 *            vList list of valid values
	 */
	restart : function(vList) {
		this.start(this.field, this.ele, vList, true);
	}
};