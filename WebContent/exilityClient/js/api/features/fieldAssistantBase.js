/**
 * @module InputaAssistant is am interface through an assisted input field gets
 *         desired assistance for the user to edit a field.
 *         
 *         Actual work is delivered by singleton instances of specific assistants, like dateAssistant and listAssistant.
 *         @see fieldAssisted.js for AssistedInputField class, for which this is the assistant
 * 
 */

/**
 * @class InputAssistant One instance of this is maintained per page to assist
 *        any of the assistedInputField in that page. This class also has some
 *        specific assistant related event handlers, which is a violation of
 *        object orientation. Needs to be re-factored
 * @param page
 *            for which this is instantiated
 */
InputAssistant = function(page) {
	this.P2 = page;
	this.win = page.win;
};

InputAssistant.prototype = {

	/**
	 * start assisting this element
	 * 
	 * @param field
	 *            being assisted
	 * @param ele
	 *            dom element being assisted
	 * @return true if this is started, false otherwise
	 */
	start : function(field, ele) {
		/*
		 * It is possible that we are already assisting this field, but some
		 * event would have triggered because of click on a related part
		 */
		if (this.ele && this.ele === ele) {
			return false;
		}

		if (ele.hasAttribute('disabled') || ele.hasAttribute('readonly'))
			return false;

		this.ele = ele;
		this.field = field;
		this.oldValue = ele.value;
		field.beingAssisted = true;

		/*
		 * 
		 */
		var dataType = dataTypes[field.dataType];
		if (dataType && dataType.basicType == AbstractDataType.DATE) {
			if (!this.dateAssistant) {
				this.dateAssistant = new DateAssistant(this.P2);
			}
			this.assistant = this.dateAssistant;
			this.assistant.start(field, ele, dataType);
			return true;
		}

		// suggestions?
		if (field.suggestionServiceId) {
			if (!this.suggestionAssistant)
				this.suggestionAssistant = new SuggestionAssistant(this.P2);
			this.assistant = this.suggestionAssistant;
			this.assistant.start(field, ele);
			return true;
		}

		// fixed list?
		this.vList = null;
		var vList = field.getValueList(ele);
		if (vList) {
			if (!this.listAssistant)
				this.listAssistant = new ListAssistant(this.P2);
			this.assistant = this.listAssistant;
			this.assistant.start(field, ele, vList);
			// this.listener = this.P2.addListener(ele, 'keydown', this.P2.ia,
			// 'keyDowned');
			return true;
		}

		this.ele = null;
		field.beingAssisted = false;
		/*
		 * but still, this is not a false start. that is, caller should continue
		 * with the start event. Hence return true.
		 */
		return true;
	},

	/**
	 * done with. close shop and go home, but after verifying event related
	 * issues
	 * 
	 * @param field
	 *            being assisted
	 * @param ele
	 *            dom element being assisted
	 * @param toMoveOn -
	 *            force end. do not use any logic to check whether we realy have
	 *            to exit
	 */
	end : function(field, ele, toMoveOn) {
		// if we didn't start() for this ele, shouldn't be end()ing as well!!
		if (ele && ele !== this.ele)
			return false;

		/*
		 * to manage sequence of events that triggered when user shifts focus
		 * away from the field, but into the assisted area, we use an attribute
		 */
		if (this.toRetainFocus) {
			/*
			 * and an over-ride by some editable part of assisted area, like
			 * month field in date assistant
			 */
			if (this.letItGo) {
				this.letItGo = false;
			} else {
				/*
				 * we have to retain focus. We would have done ele.focus(); but
				 * that wouldn't work because of the way elements get queued. We
				 * have to let the queued events finish before we do ele.focus()
				 */
				new TimeBomb(this.ele, 'focus', null, 0, this.win);
			}
			return false;
		}

		if (this.assistant) {
			this.assistant.end(ele);
			this.assistant = null;
		} else {
			debug('Possible error. trying to close an assistent that was never created');
		}

		field.beingAssisted = false;
		this.ele = null;
		return true;
	},
	/*
	 * 
	 * event handling for calendar.
	 * 
	 * 1. month drop-down is the only control that can take focus
	 * 
	 * 2. we should treat the field and calendar together as one control. That
	 * is, any movement between teh two should not trigger focus/blur event for
	 * the field
	 * 
	 * 3. user can either type or select from the calendar.
	 */

	/**
	 * called whenever mouse downed on an assistant, that may take the input
	 * focus away from the dom element where user is editing. we have to
	 * simulate as if ele and assistant together form one unit, and any
	 * focus-blur between them is to be ignored
	 */
	mouseDownedOnAssistant : function() {
		/* set attribute for onBlur to act on */
		this.toRetainFocus = true;

		/*
		 * In nonIE, onscroll does not take the focus away from the input
		 * element.But if you click on scroll bar, onmousedown event is fired on
		 * the element, but not onclick. Hence, we just switch this flag after
		 * all events trigger when mouse down happens (mousedown, focus and
		 * blur)
		 */
		new TimeBomb(this, 'mousedownEventsDone', false, 0, this.win);
	},

	/**
	 * called from the timer above. reset toRetainFocus
	 */
	mousedownEventsDone : function() {
		this.toRetainFocus = false;
	},
	/**
	 * three cases to be handled :
	 * 
	 * 1. user clicked on the input element,
	 * 
	 * 2. clicked on other part of calendar,
	 * 
	 * 3. others
	 */

	monthBlurred : function() {
		if (this.toRetainFocus) {

			/*
			 * blurred because mouse is downed on some other area on the
			 * calendar
			 */
			new TimeBomb(this.ele, 'focus', null, 0, this.win);
		} else {
			this.end(this.field, this.ele, true);
		}
	}
};