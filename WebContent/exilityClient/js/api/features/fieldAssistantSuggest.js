/**
 * @class SuggestionAssistant provides suggestions based on what the user has
 *        typed. This works in conjunction with server that supplies valid value
 *        lists
 * 
 */
var SuggestionAssistant = function(p2) {
	this.P2 = p2;

	/* create the assistant container, only once for a page */
	if (!p2.listDiv)
		p2.listDiv = this.createListDiv(p2.doc);

	this.div = p2.listDiv;
};

SuggestionAssistant.prototype = {
	createListDiv : ListAssistant.prototype.createListDiv,
	position : ListAssistant.prototype.position,
	scroll : ListAssistant.prototype.scroll,
	/**
	 * start this assistant
	 * 
	 * @param field
	 *            for which this assistant is working for
	 * @param ele
	 *            dom element being assisted
	 */
	start : function(field, ele) {
		this.field = field;
		this.ele = ele;
		this.oldValue = ele.value;
		this.minChars = field.suggestAfterMinChars;
		this.matchStartingChars = field.matchStartingChars;

		this.suggestions = {};
		this.lastToken = null;
		this.position();
		this.div.setAttribute(AssistedInputField.ATTR, 'waiting'
				+ this.minChars);
		this.div.style.display = '';
		this.listener = this.P2.addListener(ele, 'keyup', this, 'keyPressed');
		// is there some character already ?
		if (ele.value) {
			this.filter();
		}
	},

	/**
	 * end this assistance session
	 * 
	 * @param field
	 *            for which this session was meant for
	 * @param ele
	 *            dom element that is assisted
	 */
	end : function(field, ele) {
		// debug('Suggestion assistance done. Bye..');
		this.P2.removeListener(this.listener);
		this.div.style.display = 'none';
	},

	/**
	 * @method keyPressed called as an event handler when user presses any key
	 *         on this field process escape and up/down keys as special case.
	 *         trigger filter() otherwise
	 * @param e
	 *            event
	 */
	keyPressed : function(e) {
		if (e) {
			var key = e.keyCode;
			if (key === 27) {
				this.ele.value = this.oldValue;
				this.P2.focusNext(this.field, this.ele);
				return;
			}
			if (key === 38 || key === 40) // 38 is up and 40 is down
			{
				this.move(key === 38, e.shiftKey);
				if (e.preventDefault) {
					e.preventDefault();
				} else {
					e.returnValue = false;
				}
				return;
			}
		}
		/*
		 * we queue the filter process for other events to complete bore
		 * filtering
		 */
		this.timer = new TimeBomb(this, 'filter', null, 0, this.win);
		return;
	},

	/**
	 * filter the suggestion list far additional chars that are typed
	 */
	filter : function() {
		/*
		 * with a maze of event triggers, I want to play it safe!!!!
		 */
		if (!this.ele) {
			debug('filter triggered but ele is null!!. possible bug with the implemented event model.');
			return;
		}

		var val = trim(this.ele.value);
		if (!val || val.length < this.minChars) {
			/*
			 * not yet ready to suggest, or user has back spaced
			 */

			this.clear();
			this.div.setAttribute(AssistedInputField.ATTR, 'waiting'
					+ this.minChars);
			return;
		}

		/*
		 * filtering is not case sensitive
		 */
		var token = val.substr(0, this.minChars).toUpperCase();
		var suggestion = this.suggestions[token];
		if (!suggestion) {
			/*
			 * we do not have the suggested values for this token. Ask field to
			 * get suggestions. a call back will be made to
			 */
			this.suggestions[token] = 'fetching';
			this.field.getSuggestions(this.ele, token);
			this.clear();
			this.div.setAttribute(AssistedInputField.ATTR, 'fetching');
			return;
		}

		if (suggestion == 'fetching') {
			/*
			 * more typing while suggestions for the corresponding token is
			 * underway...
			 */
			return;
		}
		/*
		 * if this is a different token, we have to render the list first
		 */
		if (this.lastToken != token) {
			this.lastToken = token;
			this.vList = suggestion.list;
			this.uCasedValues = suggestion.uList;
			this.colIdx = suggestion.idx;
			this.render();
		}

		/*
		 * Ok. right list is rendered. we have to show only matched rows from
		 * there
		 */
		this.hideAndShow(val);
		/*
		 * what if all rows are hidden?
		 */
		this.div.setAttribute(AssistedInputField.ATTR,
				(this.nbrActiveRows ? 'active' : 'noMatch'));
	},

	/**
	 * value list has arrived for this element
	 * 
	 * @param ele
	 *            dom element being assisted
	 * @param token
	 *            for which suggestions are received
	 * @param arr
	 *            suggestions received from server
	 */
	setSuggestions : function(ele, token, arr) {
		if (ele != this.ele) {
			debug(' List recd too late.');
			return;
		}
		/*
		 * if we get two columns, we use second column. idx holds this value
		 */
		var idx = 0;
		/*
		 * upper cased values that are to be matched against what user types
		 */
		var uCasedArr = [];
		if (arr && arr.length > 1) {
			if (arr[0].length > 1) {
				idx = 1;
			}
			for ( var i = 1; i < arr.length; i++) {
				uCasedArr.push(arr[i][idx].toUpperCase());
				/*
				 * we remove the header row by shift all other rows
				 */
				arr[i - 1] = arr[i];
			}
			arr.length--;
		} else {
			// no suggestions for this token
			arr = [];
		}

		var suggestion = {};
		suggestion.list = arr;
		suggestion.idx = idx;
		suggestion.uList = uCasedArr;
		this.suggestions[token] = suggestion;

		/*
		 * If the current value of ele is waiting for this list, we should
		 * render
		 */
		if (ele.value && ele.value.toUpperCase().indexOf(token) == 0) {
			this.filter(true);
		} else {
			debug('list stored for token ' + token + ' with ' + arr.length
					+ ' values');
		}
	},
	/**
	 * render suggestions. return an innerHTML for div element
	 * 
	 * @returns html text
	 */
	render : function() {
		this.curRow = null;
		if (this.vList) {
			this.nbrRows = this.vList.length;
		} else {
			this.nbrRows = 0;
		}
		this.nbrActiveRows = this.nbrRows;

		if (!this.nbrRows) {
			this.div.innerHTML = 'No Sugegstions..';
			this.div.setAttribute(AssistedInputField.ATTR, 'noMatch');
		} else {
			var s = new Array();
			for ( var i = 0; i < this.nbrRows; i++) {
				var txt = this.vList[i][this.colIdx];
				s.push('<div idx="');
				s.push(i);
				s.push('" title=\"');
				s.push(txt);
				s.push('\" >');
				s.push(htmlEscape(txt));
				s.push('</div>');
			}
			this.div.innerHTML = s.join('');
			if (this.div.scrollHeight > this.div.clientHeight) {
				this.isScrolled = true;
			} else {
				this.isScrolled = false;
			}
		}
		this.div.style.display = '';
		this.div.setAttribute(AssistedInputField.ATTR, 'active');
	},

	/**
	 * clean up whatever we had cached for last list, and get ready to get new
	 * list
	 */
	clear : function() {
		if (!this.nbrRows) {
			return;
		}
		this.lastValue = null;
		this.div.innerHTML = '';
	},

	// all suggestions are already rendered. hide/show based on match
	hideAndShow : function(val) {
		val = val.toUpperCase();
		if (val == this.lastValue) {
			return;
		}

		/*
		 * if this value is a character or more than what was used earlier, we
		 * know that hidden rows have no chance of getting displayed.
		 */
		var toOptimize = false;
		if (this.lastValue && val.indexOf(this.lastValue) == 0) {
			toOptimize = true;
		}
		this.lastValue = val;
		var row = this.div.firstChild;
		this.nbrActiveRows = 0;
		/*
		 * I am using a for loop to get values, but dom element row uses
		 * .nextSibling().
		 */
		for ( var i = 0; i < this.nbrRows; i++) {
			if (!row) {
				this.nbrRows = i;
				break;
			}
			if (!row.style) {
				row = row.nextSibling;
			}
			if (toOptimize && row.style.display) {
				/*
				 * hidden ones will continue to be hidden
				 */
			}
			row = row.nextSibling;
			continue;
		}

		var match = this.uCasedValues[i].indexOf(val);
		/*
		 * reads slightly complex. if val is non-empty and it does not match as
		 * per need (no-match or not-starting)
		 */
		if (val && (this.matchStartingChars ? match != 0 : match < 0)) {
			row.style.display = 'none';
		} else {
			row.style.display = '';
			this.nbrActiveRows++;
		}
		row = row.nextSibling;

		/*
		 * user had used the arrow key to go thru the list, strip it of its
		 * selection status
		 */
		if (this.curRow) {
			this.curRow.className = '';
			this.curRow = null;
		}
	},

	/**
	 * move cursor focus
	 * 
	 * @param up
	 *            boolean to indicate whether we are to move up.
	 * @param shift
	 *            boolean to indicate whether we are to scroll by page rather
	 *            than just by a row
	 */
	move : function(up, shift) {
		this.val = null;
		if (shift) {
			this.scroll(up);
			return;
		}
		if (!this.curRow) {
			this.select(null, 0); // let us start
		}
		var row = up ? this.getPreviousRow(this.curRow) : this
				.getNextRow(this.curRow);
		this.select(row);
		return;
	},
	/**
	 * get next row
	 * 
	 * @returns row next to the current row. If current row is the last one, we
	 *          wrap to first row
	 */
	getNextRow : function() {
		var row = this.curRow;
		var isLooping = false;
		while (true) {
			if (!row) {
				if (isLooping)
					return null;
				row = this.div.firstChild;
				isLooping = true;
			} else {
				row = row.nextSibling;
				/*
				 * beware of #text elements creeping-in
				 */
				if (!row.style)
					row = row.nextSibling;
			}
			if (row && !row.style.display) {
				// style.display == '' implies shown
				return row;
			}
		}
	},
	/**
	 * get previous row from the current row
	 * 
	 * @returns row that is next to the current row. If current row is the first
	 *          one, we wrap back to last row
	 */
	getPrevRow : function() {
		var row = this.curRow;
		var isLooping = false;
		while (true) {
			if (!row) {
				if (isLooping) {
					return null;
				}
				row = this.div.lastChild;
				isLooping = true;
			} else {
				row = row.previousSibling;
				/*
				 * beware of #text elements inserted by browser
				 */
				if (!row.style) {
					row = row.previousSibling;
				}
			}
			if (row && !row.style.display) {
				// style.display == '' implies shown
				return row;
			}
		}
	},

	/**
	 * select a row, as if user navigated to that
	 * 
	 * @param row
	 *            dom element row. If null, idx is used
	 * @param idx
	 *            row index ignored if row is specified
	 */
	select : function(row, idx) {
		if (row)
			idx = parseInt(row.getAttribute('idx'), 10);
		else if (idx || idx == 0)
			row = this.div.childNodes[idx];

		if (this.curRow)
			this.curRow.className = '';

		if (row) {
			row.className = 'selected';
			this.curRow = row;
			this.displayValue = this.ele.value = this.vList[idx][this.colIdx];
		} else {
			this.curRow = null;
		}
		if (!this.isScrolled || !row) {
			return;
		}
		/*
		 * we have to scroll to ensure that the selected row is in view
		 */
		var n = row.offsetTop;
		if (n < this.div.scrollTop) {
			/*
			 * this row is scrolled-up. That is it is above visible rows
			 */
			this.div.scrollTop = n; // bring current row to top
			return;
		}
		// row is somewhere below the top visible row
		row = this.getNextRow(row);
		if (row) {
			if (n > (this.div.scrollTop + this.div.clientHeight)) {
				/*
				 * next row is below the last visible row. Scroll just enough
				 * for the top of this to be visible. That way, our row WILL be
				 * visible
				 */
				this.div.scrollTop = n - this.div.clientHeight;
			}
		} else {
			// our row was the last row. scroll to the last page.
			this.div.scrollTop = this.div.scrollHeight - this.div.clientHeight;
		}
	},
	/**
	 * @method rowCLicked event handler when user clicks on a row. The row gets
	 *         selected, and we prevent the default action browser would take
	 * @param e
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
		/*
		 * this click action ends up executing after whatever we do (like
		 * focusing to next field et..) spoiling all that. better prevent that.
		 */
		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
		this.displayValue = this.ele.value = this.vList[idx][this.colIdx];
		this.P2.focusNext(this.field, this.ele);
	}
};
