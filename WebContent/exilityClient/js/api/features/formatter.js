/**
 * @module fieldFormatters is a global object that has the actual function
 *         definition for the formatters used by designers as part of page.xml
 *         exility provides some default formatters that are defined here.
 *         Projects should add other formatetrs, on the lines of the code
 *         written here
 */

/**
 * let us play it safe and not wipe-out project defined definitions, in case
 * they include the file before this file
 */
if (!window.fieldFormatters)
	window.fieldFormatters = {};

/**
 * to lower case
 */
if (!fieldFormatters.lcase) {
	fieldFormatters.lcase = function(val) {
		if (val)
			val = val.toLowercase();
		return val;
	};
}

/**
 * utility function to format a whole number with digit separators.
 * International standard is to use separator after every three digits, while
 * India uses after every digits, except the last three digits as thousands
 * 
 * @param val
 *            integer to be formatted
 * @param nbrPlaces
 *            number of digits after which to put the separator. This is 2 for
 *            India (lacs, crores etc..) and 3 for millions/billions..
 * @param separator
 *            character to be used as separator. '.' for continental Europe, and
 *            ',' for rest of the world
 * @returns number as a formatted string
 */
fieldFormatters.formatWholeNumber = function(val, nbrPlaces, separator) {
	val = val + '';
	/*
	 * first separator (from right) is always after three places
	 */
	var n = val.length - 3;
	if (n <= 0)
		return val;
	newVal = val.substr(n, 3);
	while (true) {
		if (n <= nbrPlaces) // this is the last part
			return val.substr(0, n) + separator + newVal;
		// copy next 2-3 chars from right....
		n = n - nbrPlaces;
		newVal = val.substr(n, nbrPlaces) + separator + newVal;
	}
};

/**
 * formats a decimal number
 * 
 * @param val
 *            decimal number to be formatted
 * @param nbrPlaces
 *            2 for Indian system, 3 for others
 * @param separator
 *            character to be used as digit separator. '.' for continental
 *            Europe, and ',' for the rest. decimal charcter would be the
 *            otherway round
 * @returns formatted text
 */
fieldFormatters.formatFraction = function(val, nbrPlaces, separator) {
	val = Math.round(parseFloat(val) * 100); // val=12.35234 if it is 1235.
	var sign = '';
	/*
	 * floor would be an issue if we do not handle negative numbers this way
	 */
	if (val < 0) {
		sign = '-';
		val = -val;
	}
	var whole = Math.floor(val / 100);
	var frn = (val - whole * 100);
	if (frn < 10) {
		frn = '0' + frn;
	}
	if (separator == ',') {
		frn = '.' + frn;
	} else {
		frn = ',' + frn;
	}
	return sign
			+ fieldFormatters.formatWholeNumber(whole, nbrPlaces, separator)
			+ frn;
};

/**
 * format Indian Rupee with no decimal
 */
if (!fieldFormatters.inr) {
	fieldFormatters.inr = function(val) {
		val = Math.round(parseFloat(val));
		if (val >= 0) {
			return fieldFormatters.formatWholeNumber(val, 2, ',');
		}
		return '-' + fieldFormatters.formatWholeNumber(-val, 2, ',');

	};
}

/**
 * format Indian Rupee with 2 decimal
 */
if (!fieldFormatters.inr2) {
	fieldFormatters.inr2 = function(val) {
		return fieldFormatters.formatFraction(val, 2, ',');
	};
}
/**
 * format a euro number
 */
if (!fieldFormatters.eur) {
	fieldFormatters.eur = function(val) {
		val = Math.round(parseFloat(val));
		if (val >= 0) {
			return fieldFormatters.formatWholeNumber(val, 3, '.');
		}
		return '-' + fieldFormatters.formatWholeNumber(-val, 3, '.');

	};
}

/**
 * format a euro amount with 2 decimal places
 */
if (!fieldFormatters.eur2) {
	fieldFormatters.eur2 = function(val) {
		return fieldFormatters.formatFraction(val, 3, '.');
	};
}

/**
 * format usd with no decimal place
 */
if (!fieldFormatters.usd) {
	fieldFormatters.usd = function(val) {
		val = Math.round(parseFloat(val));
		if (val >= 0) {
			return fieldFormatters.formatWholeNumber(val, 3, ',');
		}
		return '-' + fieldFormatters.formatWholeNumber(-val, 3, ',');

	};
}

/**
 * format usd with two decimal places
 */
if (!fieldFormatters.usd2) {
	fieldFormatters.usd2 = function(val) {
		return fieldFormatters.formatFraction(val, 3, ',');
	};
}

/**
 * default amt maps to inr
 */
if (!fieldFormatters.amt) {
	fieldFormatters.amt = function(val) {
		return fieldFormatters.inr(val);
	};
}

/**
 * default amt maps to inr
 */
if (!fieldFormatters.amt2) {
	fieldFormatters.amt2 = function(val) {
		return fieldFormatters.inr2(val);
	};
}
