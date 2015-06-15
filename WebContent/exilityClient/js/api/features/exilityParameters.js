/**
 * Configuration parameters used by Exility client side engine. This file
 * provides the default values. An application can over-ride these in their
 * projectParameters.js which will have to be included after this file.
 */
var exilParms = {

	/**
	 * re-login is automated on session out. We would like to know where you
	 * have put your login page relative to index page
	 */
	loginPage : 'htm/common/login.htm'

	/**
	 * historically, exility has hard-coded several icons/images. folder name
	 * relative to index page
	 */
	,
	baseIMGFolderName : '../../images/'

	/**
	 * where are your html pages?
	 */
	,
	baseHTMLFolderName : 'htm/'

	/**
	 * some tricky placement of img elements require a path to image relative to
	 * one of your htm pages
	 */
	,
	htmlToImageFolder : '../../images'

	/**
	 * how many folders deep are your files/pages? this is the relative path of
	 * baseHTML folder from any of your page
	 */
	,
	fileToHtmlBase : '../../'

	/**
	 * calendar icon url relative to file
	 */
	,
	calendarImageSrc : '../../images/calendar.gif'

	/**
	 * code picker icon url relative to file/page
	 */
	,
	codePickerImageSrc : '../../images/codePicker.gif'

	/**
	 * calendar source file relative to file/page
	 */
	,
	calendarHtmlSrc : '../../htm/common/calendar.htm'

	/**
	 * TODO: check whether this is still used code picker htm file relative to
	 * any page
	 */
	,
	codePickerHtmlSrc : '../../htm/codePicker.htm'

	/**
	 * TODO: check whether this is still used code picker htm file relative to
	 * any page
	 */
	,
	errorMessageHtmlSrc : '../../htm/errorMessage.htm'
	/**
	 * what is path, after base URL, for the service request? e.g. if you use
	 * jsp, it could be jsp/Service.jsp If you have configured web.xml this
	 * should match the entry there
	 */
	,
	commonServiceName : 'Serve'

	/**
	 * ????
	 */
	,
	serviceName : 'Serve'

	/**
	 * TODO : remove this global min for any date used in your application
	 * 
	 * @deprecated
	 */
	,
	minDate : new Date("January 01, 2003")

	/**
	 * TODO: remove this global max for any date used in your application
	 * 
	 * @deprecated
	 */
	,
	maxDate : new Date("January 01, 2023")

	/**
	 * TODO: investigate real meaning
	 */
	,
	validateDatesForBetween : true

	/**
	 * number of rows to be displayed in a combo drop-down
	 */
	,
	comboMaxRows : 20

	/**
	 * some project was trying to send field values without validation. Not
	 * recommended though
	 */
	,
	validateQueryFields : true

	/**
	 * default value of check-box field if checked
	 */
	,
	checkedValue : '1'

	/**
	 * default value of unchecked field
	 */
	,
	uncheckedValue : '0'

	/**
	 * TODO: take it out from here and hard-code it wherever it is appropriate
	 * internally used for search panels. SHOULD NOT BE OVERRIDDEN
	 */
	,
	searchResultTableName : 'searchResult'

	/**
	 * Seamless tables behave like tables in word processor. If you hit tab from
	 * the last field, a row is automatically added This has gone out of
	 * fashion. Better way is to always keep an extra row!! And the negative
	 * name was to have false as a default !!
	 */
	,
	doNotAddRowsOnTabOut : true

	/**
	 * some one did not want to display initial rows. Not sure why they would
	 * set in page.xml, but do not want it
	 */
	,
	displayInitialRows : true

	/**
	 * in 2003 this was a hot feature, and some people did not want it as the
	 * norm was to validate only in the server!!
	 */
	,
	immediateValidation : true,
	stopAtFirstError : true
	/**
	 * legacy parameters when css was not widely used..
	 */
	,
	invalidBackgroundColor : 'lightgrey',
	listHoverColor : 'lightgrey',
	listSelectedColor : 'B4D4FE',
	gridDeletedColor : 'DarkSalmon',
	originalFieldColor : 'white'
	/**
	 * parameters used exclusively by pathFinder
	 */
	/***************************************************************************
	 * ,positionCalWithinPage : true ,calWidth : 195 ,calCorrection : 50
	 * ,donotAddColonToErrorMessage : true ,showSeparateErrorIfRegexFails : true
	 * ,errorDisplayedLocally = true
	 */

	,
	blockCodePicker : false,
	homePage : 'ide/home.htm',
	forbiddenChars : /[\^\\~]/,
	lowercasevariables : false,
	inDebugMode : true

	/**
	 * local date formatting. These parameters are reset using
	 * setLocalDateFormat()
	 */
	,
	dateSeparator : '-',
	dateAt : 0,
	monthAt : 1,
	yearAt : 2,
	useMonthName : true,
	useShortYear : true,
	cutOffForShortYear : 45

	/**
	 * When user tries to close a page with modified field, Exility warns and
	 * takes confirmation. You can decide to be a silent killer :-). Good
	 * practice is to use false here, and diligently set it to true in
	 * individual pages.
	 */
	,
	trackFieldChanges : false

	/**
	 * different from-to message . Means, Exility should not use default error
	 * message for from-to validation
	 */
	,
	diffToFrom : true

	/**
	 * calendar icon placement had an issue that the project could not solve
	 * using css TODO: explain
	 */
	,
	alignCalendar : false

	/**
	 * Seamless uses this to process whenever any key is pressed on the
	 * document, to disable special keys like right-click
	 */
	,
	appHotKeyFunctionName : 'appHotKeyFunc'

	/**
	 * by default, description service is assumed to get at most one row, and
	 * hence we just take the first row. TODO: explain further
	 */
	,
	donotSetFirstDescValue : true

	/**
	 * big NO from us, but projects want to automatically extend sessions,
	 * there-by defeating the ONLY purpose of setting such a limit on the server
	 */
	,
	serverActivityCallBackFunctionName : 'resetInactiveTimer'

	/**
	 * TODO: extend this to type of animation
	 */
	,
	animateHideAndShow : false

	/**
	 * input element will have this css TODO: provide an additional attribute
	 * exil-inError rather than changing css
	 */
	,
	fieldErrorCss : 'inerror'

	/**
	 * half-hearted : localization for Europe not fully handled
	 */
	,
	decimalChar : '.'

	/**
	 * convenient structure
	 */
	,
	monthNames : [ 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug',
			'sep', 'oct', 'nov', 'dec' ],
	monthIndex : {
		'jan' : 0,
		'feb' : 1,
		'mar' : 2,
		'apr' : 3,
		'may' : 4,
		'jun' : 5,
		'jul' : 6,
		'aug' : 7,
		'sep' : 8,
		'oct' : 9,
		'nov' : 10,
		'dec' : 11
	}

	/**
	 * date picker positioning was going out, and projects had a conflict of
	 * interest TODO : explain further
	 */
	,
	positionCalWithinPage : true
	/**
	 * should be delegated to css
	 */
	,
	calWidth : 195,
	calCorrection : 50

	/**
	 * error message has two parts like error/warning/info, message. We used to
	 * put a colon that a project didn't want
	 */
	,
	donotAddColonToErrorMessage : true

	/**
	 * could have been handled better by putting a custom error message at
	 * dataType level TODO: inform projects and deprecate this
	 */
	,
	showSeparateErrorIfRegexFails : true

	/**
	 * TODO: where else is error displayed? centrally???
	 */
	,
	errorDisplayedLocally : true

	/**
	 * legacy issue with cover-image to make a div look like a pop-up (refer to
	 * P2.popUpAPanel())
	 */
	,
	popupCoverColor : '#999999',
	popupCoverOpacity : 0.5

	/**
	 * apple uses 15 while others use 17 px. We need some precise calculation to
	 * avoid double-scroll-bar
	 */
	,
	scrollBarWidth : (navigator.userAgent.toUpperCase().indexOf('MAC OS') > -1) ? 15
			: 17

	,
	datePlaceHolder : null
	/**
	 * options for charts
	 */
	,
	chartPanelOptions : {
		colors : [ '#0000ff', '#00ff00', '#ff0000', '#9999ff', '#993366',
				'#ffffcc', '#ccffff', '#660066', '#ff8080' ],
		childColors : [ '#334455', '#551122', '#ff2266', '#9900ff', '#0099ff',
				'#ff00cc', '#cc00ff', '#66ff66', '#008080' ],
		shadowSize : 4,
		rawDataDisplay : 'value',
		labelColor : 'white'

		/* legend related */
		,
		hideLegend : false,
		legendNbrColumns : 1,
		legendLabelFormatter : null,
		legendLabelBoxBorderColor : '#ccc',
		legendPosition : 'ne',
		legendMargin : 5,
		legendBackgroundColor : 'gray',
		legendBackgroundOpacity : 0.85

		/* margin related */
		,
		marginLeft : 35,
		marginBottom : 35,
		barLabelLeftMargin : 3,
		barLabelBottomMargin : 3,
		yLabelMaxWidth : 35

		/* for bar */
		,
		lineWidth : 2,
		barWidth : 0.7

		/* for grid */
		,
		gridColor : '#545454',
		tickColor : '#dddddd'

		/* for points */
		,
		showFilledPoints : false,
		pointsRadius : 3,
		pointsFillColor : '#ffffff',
		labelLeftMargin : 5,
		labelBottomMargin : 5
	}
};

/**
 * default timer that does not do anything. Should be over-ridden by projects if
 * they want to keep the session perpetually on
 */
var resetInactiveTimer = function() {
	//
};

/**
 * Decide how dates are displayed on the client. Note that the server ALWAYS
 * sends dates in yyyy-mm-dd and wants it back that way. should be linked to
 * localization.
 */
var setLocalDateFormat = function(format, separator) {
	var separator = format.substr(0, 1);
	format = format.substr(1, format.length - 1);
	debug('Local date format will be set to ' + format + ' with ' + separator
			+ ' as the separator');
	if (format == 'ddmmyy') {
		exilParms.dateAt = 0;
		exilParms.monthAt = 1;
		exilParms.yearAt = 2;
		exilParms.useMonthName = false;
		exilParms.useShortYear = true;
		exilParms.cutOffForShortYear = 15; // specified only if shortYear is
		// used
	}

	else if (format == 'ddmmmyy') {
		exilParms.dateAt = 0;
		exilParms.monthAt = 1;
		exilParms.yearAt = 2;
		exilParms.useMonthName = true;
		exilParms.useShortYear = true;
		exilParms.cutOffForShortYear = 15; // specified only if shortYear is
		// used
	}

	else if (format == 'ddmmyyyy') {
		exilParms.dateAt = 0;
		exilParms.monthAt = 1;
		exilParms.yearAt = 2;
		exilParms.useMonthName = false;
		exilParms.useShortYear = false;
	}

	else if (format == 'mmddyy') {
		exilParms.dateAt = 1;
		exilParms.monthAt = 0;
		exilParms.yearAt = 2;
		exilParms.useMonthName = false;
		exilParms.useShortYear = true;
	} else
		return false;

	exilParms.dateSeparator = separator;
	return true;
};
