/**
 * @module Eixlity provides a very basic animation utility.
 */
/*
 * global array to facilitate timeOut() function. Stores elements being
 * animated. once done, they are deleted to keep this tidy.
 */
/**
 * keep track of all elements being eliminated. we keep it tidy and clean.
 */
var elementsBeingAnimated = {};

/**
 * animate an element to show or hide (fade or appear)
 * 
 * @param ele :
 *            element being animated
 * @param showOrHide
 *            {String} 'show' or 'hide'
 * @param callBackObject
 *            {Object} If you want us to call on start and end. We will call
 *            animationStarted() and animationEnded() methods on this object
 */
var animateHideAndShow = function(ele, showOrHide, callBackObject) {
	var obj = elementsBeingAnimated[ele.id];
	/*
	 * are we in the middle of animation for this element?
	 */
	if (obj) {
		/*
		 * we need to reverse the animation if required
		 */
		if (obj.showOrHide != showOrHide)
			obj.reverse(showOrHide);
		return;
	}

	obj = new Animator(ele, showOrHide, callBackObject);
	/*
	 * in case the element can not be animated..
	 */
	if (!obj.showOrHide)
		return;

	elementsBeingAnimated[ele.id] = obj;
	obj.animate();
};

// showOrHide = 'show', 'hide'.

/**
 * We have designed just one animator : appear or fade
 */
var Animator = function(ele, showOrHide, callBackObject) {
	/*
	 * our technique requires getComputedStyle
	 */
	if (!window.getComputedStyle) {
		/*
		 * no animation, but straight to the desired end-state
		 */
		ele.style.display = showOrHide == this.HIDE ? 'none' : 'block';
		return;
	}
	var win = ele.ownerDocument && ele.ownerDocument.win || window;
	var style = win.getComputedStyle(ele, null);
	// debug('computed style for ' + (ele && ele.id) + ' in ' + win.name + ' is
	// ' + style);
	this.height = parseInt(style.height);

	if (style.display == 'none') {
		if (showOrHide == this.HIDE)
			return;
		if (!this.height) {
			ele.style.display = 'block';
			style = win.getComputedStyle(ele, null);
			this.height = parseInt(style.height);
			this.width = parseInt(style.width);
			if (!this.height) {
				return;
			}
		}
	} else {
		if (showOrHide == this.SHOW)
			return;
	}

	// set required attributes for animation
	this.showOrHide = showOrHide;
	this.target = this.height;
	this.ele = ele;
	style = ele.style;
	this.styleHeight = style.height || '';
	this.styleWidth = style.width || '';
	this.ox = style.overflow;
	style.overflow = 'hidden';
	this.stepSize = Math.ceil(this.height / this.NBR_STEPS);
	this.callBackObject = callBackObject;
	// alert('height = ' + this.height + ' style ' + this.styleHeight);
};

var a = Animator.prototype;
// constants
a.SHOW = 'show';
a.HIDE = 'hide';
a.NBR_STEPS = 20;
a.DELAY = 20; // milliseconds

/**
 * carry out desired animation. Either start reducing or increasiing height
 */
a.animate = function() {
	if (this.showOrHide == this.SHOW) {
		this.ele.style.height = '1px';
		this.ele.style.display = 'block';
		this.height = 0;
		this.increase();
	} else {
		this.reduce();
	}
	if (this.callBackObject && this.callBackObject.animationStarted)
		this.callBackObject.animationStarted();
};

/**
 * reduce height, if possible, else stop animation
 */
a.reduce = function() {
	var style = this.ele.style;
	this.height = this.height - this.stepSize;
	if (this.height <= 0) {
		style.display = 'none';
		this.done();
		return;
	}

	style.height = this.height + 'px';
	this.timer = window.setTimeout('elementsBeingAnimated[\'' + this.ele.id
			+ '\'].reduce();', this.DELAY);
};

/**
 * increase height, if required. else end animation
 */
a.increase = function() {
	var style = this.ele.style;
	this.height = this.height + this.stepSize;
	if (this.height >= this.target) {
		this.done();
		return;
	}
	style.height = this.height + 'px';
	style.display = 'block';
	this.timer = window.setTimeout('elementsBeingAnimated[\'' + this.ele.id
			+ '\'].increase();', this.DELAY);
};

/**
 * our unique feature : reverse animation if required
 */
a.reverse = function() {
	window.clearTimeout(this.timer);
	if (this.showOrHide == this.SHOW) {
		this.showOrHide = this.HIDE;
		this.reduce();
	} else {
		this.showOrHide = this.SHOW;
		this.increase();
	}
};

/**
 * we are done with animation. Clean-up
 */
a.done = function() {
	var s = this.ele.style;
	s.height = this.styleHeight;
	s.width = this.styleWidth;
	s.overflow = this.ox;
	delete elementsBeingAnimated[this.ele.id];
	if (this.callBackObject && this.callBackObject.animationEnded)
		this.callBackObject.animationEnded();
};