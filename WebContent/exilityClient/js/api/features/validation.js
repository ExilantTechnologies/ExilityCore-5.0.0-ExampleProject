/**
 * @module validation utility. Data type is the primary basis of validation. We
 *         implement data type class hierarchy and provide .validate() method
 *         accordingly
 */
var AbstractDataType = function ()
{   
    //
};
AbstractDataType.TEXT = 'TEXT';
AbstractDataType.INTEGRAL = 'INTEGRAL';
AbstractDataType.DECIMAL = 'DECIMAL';
AbstractDataType.BOOLEAN = 'BOOLEAN';
AbstractDataType.DATE = 'DATE';
AbstractDataType.TIMESTAMP = 'TIMESTAMP';

a = AbstractDataType.prototype;

/**
 * abstract method, would be over ridden by specific data types
 * 
 * @param fromVal
 * @param toVal
 * @param showAlternateMessage
 *            Customization for a project that insisted that they would like to
 *            see different message for from-to and to-from
 * @param fromLabel
 * @param toLabel
 * @throws ExilityError
 *             in case of validation failure
 */
a.validateFromTo = function(fromVal, toVal, showAlternateMessage, fromLabel, toLabel){
    if(fromVal && toVal && (fromVal > toVal)){
        if(showAlternateMessage){
            throw new ExilityError("exilityInvalidToFrom", fromVal, toVal, fromLabel, toLabel);}
        throw new ExilityError("exilityInvalidFromTo", fromVal, toVal, fromLabel, toLabel);
    }
};

/**
 * abstract method, would be over ridden by specific data types
 * 
 * @param val
 *            value to be validated
 * @param msg
 *            error message or id
 * @returns possibly formatted value. Hence caller should use this as the value
 */
a.validateSpecifics = function(val, msg)
{
	return val;
};

// abstract method, would be over ridden by specific data types
a.evaluateShortCuts = function(val){
	return val;	
};

a.validate = function (val, msg){
    val = String(val);
    if (this.regex){
        var vals = val.split('\n');
        for (var i = 0; i < vals.length; i++){
            var v = vals[i];
            var matched_array = v.match(this.regex);
            if (!matched_array || (matched_array[0] != v)) {
                if (!msg)
                    msg = this.messageName;
                if (exilParms.showSeparateErrorIfRegexFails){
                    if (!msg){
                        msg = this.messageName + 'Regex';
                    }
                    var regexString = "" + this.regex + "";
                    regexString = regexString.replace(/^\//, '');
                    regexString = regexString.replace(/^\^/, '');
                    regexString = regexString.replace(/\/$/, '');
                    regexString = regexString.replace(/\$$/, '');

                    eval("v = val.replace(/" + regexString + "/ig,'');");
                    v = v.split('').sort().join(',');
                    while (/\s*([^,]+),\s*\1(?=,|$)/.test(v)){
                        v = v.replace(/\s*([^,]+),\s*\1(?=,|$)/g, "$1");
                }
                    v = "'" + v.replace(/,/g, "','") + "'";
                }
                throw new ExilityError(msg, v);
            }
        }
    }
    return this.validateSpecifics(val, msg);
};

a.formatIn = function(val){
    return val;
};

a.formatOut = function(val){
    return val;
};
// internal value format, like date
a.clientObject = function(val){
    return val;
};

var TextDataType = function (nam, messageName, regex, minLength, maxLength){
	AbstractDataType.call(this);

	this.basicType = AbstractDataType.TEXT;
	this.name = nam;
	this.messageName = messageName;
	this.regex = regex;
	this.minLength = minLength;
	this.maxLength = maxLength;
};

TextDataType.prototype = new AbstractDataType;

TextDataType.prototype.validateSpecifics = function(val, msg){
	if ((val.length < this.minLength) || 
	    ( this.maxLength && (val.length > this.maxLength))  ){
		throw new ExilityError(msg || this.messageName, val, val.length);
	}
	return val;
};

var negativeIntegerRegex = /^[+-]?\d*$/;
var positiveIntegerRegex = /^\d*$/;
var IntegralDataType = function (nam, messageName, minValue, maxValue, allowNegativeValue)
{
    AbstractDataType.call(this);

	this.basicType = AbstractDataType.INTEGRAL;
	this.name = nam;
	this.messageName = messageName;
	this.minValue = minValue;
	this.maxValue = maxValue;
	this.allowNegativeValue = allowNegativeValue;
	this.regex = (this.allowNegativeValue) ? negativeIntegerRegex : positiveIntegerRegex ;
};

IntegralDataType.prototype = new AbstractDataType;

IntegralDataType.prototype.validateSpecifics = function(val, msg)
{
	var nbr = parseFloat(val);
	
	if( (this.maxValue != null && this.maxValue < nbr) ||
	    (this.minValue != null && this.minValue > nbr) )
	{
		throw new ExilityError(msg || this.messageName, val);
	}
	return val;
};

IntegralDataType.prototype.validateFromTo = function(fromVal, toVal, showAlternateMessage, fromLabel, toLabel)
{
    var n1 = parseInt(fromVal.replace(/,/g, ''),  10);
    var n2 = parseInt(toVal.replace(/,/g, ''), 10);
    if (isNaN(n1) || isNaN(n2)) return;
    if (n1 > n2)
    {
        if(showAlternateMessage)
            throw new ExilityError("exilityInvalidToFrom", fromVal, toVal, fromLabel, toLabel);
        
        throw new ExilityError("exilityInvalidFromTo", fromVal, toVal, fromLabel, toLabel);
    }
};

IntegralDataType.prototype.clientObject = function(val)
{
	if(val.replace)
		val = val.replace(/,/g, '');
    return parseInt(val, 10);
};

var negativeDecimalRegex = /^[+-]?\d*\.?\d{1,}$/;
var positiveDecimalRegex = /^\d*\.?\d{1,}$/;
var DecimalDataType = function(nam, messageName, minValue, maxValue,allowNegativeValue,numberOfDecimals)
{
    AbstractDataType.call(this);

	this.basicType = AbstractDataType.DECIMAL;
	this.name = nam;
	this.messageName = messageName;
	this.numberOfDecimals = numberOfDecimals;
	this.minValue = minValue;
	this.maxValue = maxValue;
	this.allowNegativeValue = allowNegativeValue;
	// parseFloat() parses an input '12.45xyz' without error, taking only 12.45
	// So regex is required for validation.
	this.regex = (this.allowNegativeValue) ? negativeDecimalRegex : positiveDecimalRegex;
};
DecimalDataType.prototype = new AbstractDataType;

DecimalDataType.prototype.validateSpecifics = function(val, msg)
{
	
	// debug("DecimalDataType.validateSpecifics("+val+")....");
	if(val == "") return val;
	var nbr = parseFloat(val);
	
	if( (this.maxValue != null && this.maxValue < nbr) ||
	    (this.minValue != null && this.minValue > nbr) )
	{
		throw new ExilityError(msg || this.messageName, val);
	}
	// OK, it is valid. but are we supposed to format it?
	return this.formatIn(nbr);
};

DecimalDataType.prototype.validateFromTo = function(fromVal, toVal, showAlternateMessage, fromLabel, toLabel)
{
    var d1 = parseFloat(fromVal);
    var d2 = parseFloat(toVal);
    if (isNaN(d1) || isNaN(d2)) return;
   if (d1 > d2)
    {
        if(showAlternateMessage)
            throw new ExilityError("exilityInvalidToFrom", fromVal, toVal, fromLabel, toLabel);
        throw new ExilityError("exilityInvalidFromTo", fromVal, toVal, fromLabel, toLabel);
    }
};

DecimalDataType.prototype.formatIn = function(nbr)
{
	var len;
	if(this.numberOfDecimals == 0)
		return new String(Math.round(nbr));
    
    var multiplier =  Math.pow(10, this.numberOfDecimals);
	nbr = Math.round(nbr*multiplier)/multiplier;
	var currentDecimals = 0;
    var val;
	if(nbr == 0)
	    val = new String("0.");
	else
	{
	    val = new String(nbr);
	    len = val.length;
	    var decimalAt = val.indexOf('.');
	    if(decimalAt >= 0)
	       currentDecimals = len - decimalAt - 1;
	    else
	        val = val.concat('.');
	}
	len = this.numberOfDecimals - currentDecimals;
	while(len-- > 0)
	{
		val = val.concat('0');
	}
	return val;
};

DecimalDataType.prototype.clientObject = function(val)
{
    return parseFloat(val.replace(/,/g, ''));
};

var BooleanDataType = function(nam, messageName, trueValue, falseValue)
{
    AbstractDataType.call(this);

	this.basicType = AbstractDataType.BOOLEAN;	
	this.name = nam;
	this.messageName = messageName;
	this.trueValue = trueValue;
	this.falseValue = falseValue;
};

BooleanDataType.prototype = new AbstractDataType;
BooleanDataType.prototype.allTrueValues = ['1', 1, 'y', 'Y', 'true', 'TRUE', 'True', 'yes', 'YES', 'Yes'];
BooleanDataType.prototype.nbrTrues = BooleanDataType.prototype.allTrueValues.length;
BooleanDataType.prototype.allFalseValues =['0', 0, 'n','N','false', 'FALSE', 'false', 'no', 'No', 'No'];
BooleanDataType.prototype.nbrFalses = BooleanDataType.prototype.allFalseValues.length;
BooleanDataType.prototype.basicType = AbstractDataType.BOOLEAN;

BooleanDataType.prototype.validateSpecifics = function (val, msg)
{
    if (this.trueValue == val || this.falseValue == val)
        return val;
    
    for (var i = 0; i < this.nbrTrues; i++)
    {
        if (this.allTrueValues[i] == val)
            return val;
    }
    
    for (var i = 0; i < this.nbrFalses; i++)
    {
        if (this.allFalseValues[i] == val)
            return val;
    }
    throw new ExilityError(msg || this.messageName, val);
};

var DateDataType = function(nam, messageName, maxDaysBeforeToday, maxDaysAfterToday, includesTime)
{
    AbstractDataType.call(this);

	this.basicType = AbstractDataType.DATE;
	this.name = nam;
	this.messageName = messageName;
	this.maxDaysBeforeToday = maxDaysBeforeToday;
	this.maxDaysAfterToday = maxDaysAfterToday;
	this.includesTime = includesTime; // currently not used.
};

DateDataType.prototype = new AbstractDataType;

// Dec 29 2009 : Bug 826 - Display different messages during date validate (one
// for toField, one for fromField) - Exis (Start)
DateDataType.prototype.validateFromTo = function(fromVal, toVal, showAlternateMessage, fromLabel, toLabel)
{
    if(this.includesTime)
    {
        this.validateDateTimeFromTo(fromVal, toVal, showAlternateMessage);
        return
    }
    var d1 = parseDate(fromVal);
    var d2 = parseDate(toVal);
    if(d1 && d2 && d1 > d2)
    {
    	if(showAlternateMessage)
            throw new ExilityError('exilityInvalidToFrom', fromVal, toVal, formLabel, toLabel);
        throw new ExilityError('exilityInvalidFromTo', fromVal, toVal, formLabel, toLabel);
    }
};

DateDataType.prototype.validateDateTimeFromTo = function(fromVal, toVal, showAlternateMessage, formLabel, toLabel)
{
    var val, timePart, d1, d2;
    var h1 = 0, h2 = 0, m1 = 0, m2 = 0, s1 = 0, s2 = 0;
    
    val = this.seperateTimeFromDate(fromVal);
    fromVal = val[0];
    if(val.length > 1)
    {
        timePart = val[1].split(':');
        h1 = timePart[0];
        m1 = timePart[1];
        s1 = timePart[2];
    }
    
    val = this.seperateTimeFromDate(toVal);
    toVal = val[0];
    if(val.length > 1)
    {
        timePart = val[1].split(':');
        h2 = timePart[0];
        m2 = timePart[1];
        s2 = timePart[2];
    }
    
    d1 = parseDate(fromVal);
    d2 = parseDate(toVal);
    if(d1 && d2 && h1 && h2 && m1 && m2 && s1 && s2 && ((d1 > d2) || ((d1 >= d2) && (h1 > h2)) || ((d1 >= d2) && (h1 >= h2) && (m1 > m2)) || ((d1 >= d2) && (h1 >= h2) && (m1 >= m2) && (s1 > s2))))
    {
        if(showAlternateMessage)
            throw new ExilityError("exilityInvalidToFrom", fromVal, toVal, formLabel, toLabel);
        throw new ExilityError("exilityInvalidFromTo", fromVal, toVal, formLabel, toLabel);
    }
};

DateDataType.prototype.seperateTimeFromDate = function(dateValue)
{
    return dateValue.split(' ');
};

DateDataType.prototype.validateSpecifics = function (val, msg)
{
    if (!msg)
        msg = this.messageName;
    var dat = this.includesTime ? parseDateTime(val) : parseDate(val);
    if (dat == null)
        throw new ExilityError(msg, val);

    if (this.maxDaysBeforeToday != null || this.maxDaysAfterToday != null)
    {
        var tday;
        if (this.maxDaysBeforeToday != null)
        {
            tday = getToday(-this.maxDaysBeforeToday);
            if (dat < tday)
                throw new ExilityError(msg, val);
        }

        if (this.maxDaysAfterToday != null)
        {
            tday = getToday(this.maxDaysAfterToday);
            if (dat > tday)
                throw new ExilityError(msg, val);
        }
    }
    return this.includesTime ? formatDateTime(dat) : formatDate(dat);
};
// server format is yyyy-mm-dd. Convert that to local
DateDataType.prototype.formatIn = function (val)
{
    if (!val) return '';
    dat = evaluateDateShortCuts(val);
    if (dat)
        return formatDate(dat);

    // get rid of any time components..
    val = val.split(' ');
    var tim = val[1];
    if (tim)
        tim = tim.split('.')[0]; // get rid of fraction of seconds
    val = val[0];
    var serverParts = val.split('-');
    var localParts = new Array();
    var y = serverParts[0];
    if (exilParms.useShortYear)
        y = y.substr(2, 2);
    localParts[exilParms.yearAt] = y; // year
    var mm = serverParts[1];
    if(mm)
    {
	    if (exilParms.useMonthName)
	        mm = exilParms.monthNames[parseInt(mm, 10) - 1];
	    else if (mm.length == 1)
	        mm = '0' + mm;
    }
    localParts[exilParms.monthAt] = mm;
    var dd = serverParts[2];
    if (dd && dd.length == 1)
        dd = '0' + dd;
    localParts[exilParms.dateAt] = dd;
    val = localParts[0] + exilParms.dateSeparator + localParts[1] + exilParms.dateSeparator + localParts[2];
    if (this.includesTime && tim)
        val += ' ' + tim;
    return val;
};

DateDataType.prototype.textileFormatIn = function(val)
{
    val = val.split(' ')[0];
    var serverParts = val.split('/');
    var localParts = new Array();
    var y = serverParts[2];
    if(exilParms.useShortYear)
        y = y.substr(2,2);
    localParts[exilParms.yearAt] =  y; // year
    var mm = serverParts[0];
    if(exilParms.useMonthName)
        mm = exilParms.monthNames[parseInt(mm,10) - 1];
    localParts[exilParms.monthAt] = mm;
    localParts[exilParms.dateAt] = serverParts[1];
    return localParts[0] + exilParms.dateSeparator + localParts[1] + exilParms.dateSeparator + localParts[2];
};

DateDataType.prototype.formatOut = function(val)
{
    if(!val) return '';
    var serverParts = new Array();
    val = val.split(' ');
    var tim = val[1];
    var localParts = val[0].split(exilParms.dateSeparator);
    var y = localParts[exilParms.yearAt];
    if(y.length < 2)
        y = '0' + y;
    if(exilParms.useShortYear)
    {
        if(y < exilParms.cutOffForShortYear)
            y = '20' + y;
        else
            y = '19' + y;
    }
    serverParts[0] = y;
    var mm = localParts[exilParms.monthAt];
    if(exilParms.useMonthName)
        mm = new String(exilParms.monthIndex[mm.toLowerCase()] + 1);
    if(mm.length < 2)
        mm = '0' + mm;
    serverParts[1] = mm;
    var dd = localParts[exilParms.dateAt];
    if(dd.length < 2)
        dd = '0' + dd;
    serverParts[2] = dd;
    val = serverParts[0] + '-' + serverParts[1] + '-' + serverParts[2];
    if(this.includesTime && tim)
        val += ' ' + tim;
    return val;
};

DateDataType.prototype.clientObject = function(val)
{
    return parseDate(val);
};

DateDataType.prototype.getMinMax = function ()
{
    if (this.maxDaysBeforeToday == null && this.maxDaysAfterToday == null)
        return null;
    var minDate = this.maxDaysBeforeToday == null ? null : getToday(-this.maxDaysBeforeToday);
    var maxDate = this.maxDaysAfterToday == null ? null : getToday(this.maxDaysAfterToday);
    return { min: minDate, max: maxDate };
};

var TimeStampDataType = function(nam, messageName)
{
	AbstractDataType.call(this);
	this.basicType = AbstractDataType.TIMESTAMP;
	this.name = nam;
	this.messageName = messageName;
    this.AbstractDataType();
};

TimeStampDataType.prototype = new AbstractDataType;

TimeStampDataType.prototype.validateSpecifics = function(val, msg)
{
	return val; // validation always pass.
};

// FUTURE:
// let the page translator read the ClientMessages.xml file and
// generate one more js file with entries like:
// errorMessages[messageId] = "actual message string";
// where errorMessages[] is a global array.
ExilityError = function (messageId, val1, val2)
{
	this.messageId = messageId;
	this.val1 = val1;
	this.val2 = val2;
	var msg = PM.dataTypeMessages[this.messageId];
	
	if(!msg && exilParms.showSeparateErrorIfRegexFails)
    {
            msg = PM.dataTypeMessages[this.messageId.replace(/Regex$/,'')];
    }
	
	if(msg) // first parameter, indeed was a message id. let us substitute
			// parameter values
	{
        var val, par;
        for (var i = arguments.length - 1; i > 0; i--)
        {
            this['val' + i] = val = arguments[i];
            par = '@' + i;
            if (val == "'$'")
                msg = msg.replace(par, "'" + par + "'").replace(par, "$");
            else
                msg = msg.replace(par, val);
        }
        
    }
    else
        msg = messageId; // assume it to be actual message text
        
	this.messageText = msg;
};

ExilityError.prototype.toString = function()
{
    return this.messageText;
};

ExilityError.prototype.render = function(obj)
{
    if(!obj)
        obj = this.obj;
    
    if(this.field)
    {
        if(obj != null && this.messageText && this.messageText.length > 0 && this.messageText.charAt(0) != '\n')
            this.messageText = '\n' + this.messageText;
        
        if(exilParms.donotAddColonToErrorMessage != 'undefined' && exilParms.donotAddColonToErrorMessage)
            this.messageText = this.field.label + this.messageText;
        else
            this.messageText = this.field.label + ' : ' + this.messageText;
    }
    message(this.messageText, "Warning", "Ok", setFocus, null, null, obj,null, this.field);
};

var setFocus = function (obj)
{
    if (!obj)
        return;

    try
    {
        showPanelForSure(obj);
    }
    catch (e) { 
    	//
    }

    if (obj.focus) obj.focus();
    if (obj.select) obj.select();
};
var additionalHelpWindow = null;
var showAdditionalHelp = function(helpId)
{
	if(!additionalHelpWindow || additionalHelpWindow.closed()) 
	{
		additionalHelpWindow = window.open("additionalHelp");
		if(!additionalHelpWindow)
		{
			alert("Popup Blocker is preventing us from showing you additional help.");
			return;
		}
	}
	var src = currentActiveWindow.location.href;
	var idx = src.lastIndexOf(".htm");
	if(idx == -1)
	{
		alert("We are sorry. We are unable to locate the resource required for providing additional help.");
		return;
	}
	src = src.substring(0, idx) + ".help.htm";
	if(helpId)
		src += '#'+ helpId;
	
	additionalHelpWindow.location.href = src;
};
