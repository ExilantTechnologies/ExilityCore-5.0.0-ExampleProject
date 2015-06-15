/**********************************************************************
*
* EX!LANT CONFIDENTIAL
* ___________________________________________________________________
*
*  Copyright (c)[2004 - 2012]  EX!LANT Technologies Pvt. Ltd.
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains the property of EX!LANT * Technologies Pvt. Ltd. and its suppliers, if any.  
* The intellectual and technical concepts contained herein are proprietary to   
* EX!LANT Technologies Pvt. Ltd. and its suppliers and may be covered by India and 
* Foreign Patents, patents in process, and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material is strictly forbidden 
* unless prior written permission is obtained
* from EX!LANT Technologies Pvt. Ltd.
***********************************************************************/
/*
* utility functions.
*/

/**
 * parse string as a date short-cut, or return null.
 */
var evaluateDateShortCuts = function (val)
{
    if (!val)
        return null;
    val = new String(val).toLowerCase();
    if (val == '.' || val == 'today')
        return getToday();

    if (val == '+' || val == 'tomorrow')
        return getToday(1);

    if (val == '-' || val == 'yesterday')
        return getToday(-1);

    var rexp = new RegExp(/^([-|+])(\d+)$/);
    var rexparts = rexp.exec(val);
    if (rexparts != null)
    {
        return getToday(1 * rexparts[0]);
    }

    //look for end-of-week (eow) or beginning-of-week (bow) etc... Not yet implemented
    if (val.length != 3 || val.substr(1, 1) != 'o')
        return null;
    var isBeginning = val.substr(0, 1);
    if (isBeginning == 'b')
        isBeginning = true;
    else if (isBeginning == 'e')
        isBeginning = false;
    else
        return null;

    var lastChar = val.substr(2, 1);
    var d = getToday();
    var n;
    switch (lastChar)
    {
        case 'w': //begin or end of week
            n = d.getDate() - d.getDay(); //points to begin of week
            if (!isBeginning)
                n = n + 6;

            d.setDate(n);
            break;

        case 'm': //month
            if (isBeginning)
                d.setDate(1);
            else
            {
                d.setMonth(d.getMonth + 1);
                d.setDate(-1);
            }
            break;

        case 'q': //quarter, calendar and, obvioulsy, not fiscal
            n = d.getMonth();
            n = n - (n % 3); //month of quarter beginning
            if (isBeginning)
            {
                d.setMonth(n);
                d.setDate(1);
            }
            else
            {
                d.setMonth(n + 3);
                d.setDate(-1);
            }
            break;

        case 'y':
            if (isBeginning)
            {
                d.setMonth(0);
                d.setDate(1);
            }
            else
            {
                d.setMonth(11);
                d.setDate(31);
            }
            break;
    }
    return d;
};

//parse a string as per current setting of client date/time format
var parseDateTime = function (val)
{
    var parts = val.split(' ');
    var dat = parseDate(parts[0]);
    if (!dat) return null;
    if (parts.length <= 1)
        return dat;
    //parse and add time to date;
    parts = parts[1].split(':');
    var hrs = parts[0] ? parseInt(parts[0], 10) : 0;
    var mts = parts[1] ? parseInt(parts[1], 10) : 0;
    var secs = parts[2] ? parseInt(parts[2]) : 0;
    if (isNaN(hrs) || hrs > 23 || hrs < 0 || isNaN(mts) || mts < 0 || mts > 59 || isNaN(secs) || secs < 0 || secs > 59)
        return null;
    dat.setHours(hrs, mts, secs);

    return dat;
};

//parse a string as date as per current client date format
var parseDate = function (val)
{
    var dat = evaluateDateShortCuts(val);
    if (!dat)
    	dat = parseStandardDate(val);
    if(!dat)
    	dat = parseNonStandardDate(val);
    return dat;
};

var parseStandardDate = function (val)
{
    var parts = val.split(exilParms.dateSeparator);
    if (parts.length < 3)
        return null;
    var dd = parseInt(parts[exilParms.dateAt], 10);
    if (isNaN(dd) || dd > 31 || dd <= 0)
        return null;

    var mm = null;
    var mmstr = new String(parts[exilParms.monthAt]);
    if (exilParms.useMonthName)
        mm = exilParms.monthIndex[mmstr.toLowerCase()];
    else
    {
        mm = parseFloat(mmstr, 10);
        mm--;
    }
    if (mm == null || isNaN(mm) || mm < 0 || mm > 11)
        return null;
    var y = parts[exilParms.yearAt];
    var ny = parseInt(y, 10);
    if (isNaN(ny) || ny < 0 || ny > 9999) return null;
    if(ny < 100) //two digit
    {
        if (ny < exilParms.cutOffForShortYear)
            ny = 2000 + ny;
        else
            ny = 1900 + ny;
    }

    var dat = new Date(ny, mm, dd);
    // Date constructor is forgiving, and it accepts 31-feb and makes it 2-Mar or 3-Mar
    if (dat.getMonth() != mm)
        return null;
    return dat;
};

var POSSIBLE_SEPARATORS = [' ', '.', '-', '/'];
/**
 * user did not follow the standard format. Let us try and see if we can still parse it
 * @param val String to be parsed into a date
 * @returns date if we could parse, null otherwise
 */
var parseNonStandardDate = function (val)
{
    var parts = [];
    //try various separators 
	for(var i = POSSIBLE_SEPARATORS.length - 1; i >= 0 ; i--)
	{
		var sep = POSSIBLE_SEPARATORS[i];
		if(val.indexOf(sep) >= 0)
		{
			parts = val.split(sep);
			break;
		}
	}
	if(parts.length > 3)
		return null;
	
	//let us set current month and year as default
	var today = new Date();
    var mm = today.getMonth();
    var yy = today.getFullYear();
    var dd = null;
 
	if(parts.length === 1) //only date specified
    {
		
    	dd = parseInt(parts[0], 10);
    	if(dd){
    		var d = new Date(yy, mm, dd);
    		if(d.getDate() === dd)
    			return d;
    		return null;
    	}
    	
    	return null;
    }
	
	if(parts.length === 2)
		return parseDateAndMonth(parts[0], parts[1], yy);
	return parseThreePartDate(parts[0], parts[1], parts[2]);
};


/**
 * gueass date based on two parts entered by user
 * @param p1 first part
 * @param p2 second part
 * @param year current year
 * @returns date or null if we can not guess the date
 */
var parseDateAndMonth = function (p1, p2, year){
	//guess date and month
	var n1 = parseInt(p1, 10);
	var n2 = parseInt(p2, 10);
	var m1 = exilParms.monthIndex[p1.toLowerCase()];
	var m2 = exilParms.monthIndex[p2.toLowerCase()];
	//our job is to set dd and mm
	var dd = null;
	var mm = null;
	//one of the parts is month short name?
	if(p1.length === 3){
		if(m1 >= 0 && m1 < 12 && n2){
    		dd = n2;
    		mm = m1 + 1;
		}else{
			return null;
		}
	}else if(p2.length === 3){
		if(m2 >= 0 && m2 < 12 && n1){
    		dd = n1;
    		mm = m2 + 1;
		}else{
			return null;
		}
	}else{
		//both have to be non-zero numbers
		if(!n1 || !n2){
			return null;
		}
		
		//at least one of them should be month
		if(n1 > 12 && n2 > 12)
			return null;
		
		if(n1 > 12){
			dd = n1;
			mm = n2;
		}else if(n2 > 12){
			dd = n2;
			mm = n1;
		}else{
			//which one is date? pick it based on current setting
			if(exilParms.dateAt === 0){
				dd = n1;
				mm = n2;
			}else{
	    		dd = n2;
	    		mm = n1;
			}
		}
	}
	var d = new Date(year, mm - 1, dd);
	if(dd === d.getDate())
		return d;
	return null;
};
/**
 * parse a date that came with three parts, but did not follow standards
 * @param p1 first part
 * @param p2 second part
 * @param p3 third part
 * @returns date or null if it can not be guessed
 */
var parseThreePartDate = function (p1, p2, p3){

	var mm, yy, dd;
	var n1 = parseInt(p1, 10);
	var n2 = parseInt(p2, 10);
	var n3 = parseInt(p3, 10);
	//year must be anumber
	if(!n3)
		return null;
	
	if(p2.length === 3){ //second part could be month name
		mm = exilParms.monthIndex[p2.toLowerCase()];
		if(mm < 12)
			mm++;
		else
			return null;
		dd = n1;
		yy = n3;
	} else 	if(p1.length === 3){ //first part could be month name
		mm = exilParms.monthIndex[p1.toLowerCase()];
		if(mm < 12)
			mm++;
		else
			return null;
		dd = n2;
		yy = n3;

	} else{
		if(!n2 || !n1)
			return null;
		
		if(n1 > 1000){
			yy = n1;
			mm = n2;
			dd = n3;
		}else{
			yy = n3;
			if(n1 > 12){
				dd = n1;
				mm = n2;
			} else if(n2 > 12){
				dd = n2;
				mm = n1;
			}else{
				if(exilParms.dateAt === 0){
					dd = n1;
					mm = n2;
				}else{
					dd = n2;
					mm = n1;
				}
			}
		}
			
	}
	var d = new Date(yy, mm - 1, dd);
	if(d.getDate() != dd)
		return null;
	return d;
};
// getToday() : gets today's date with 00:00 as its time.
// This has to be used if date are being compared.
var getToday = function (daysFromToday)
{
    var dat = new Date();
    //a small trick to get the date with todays date, but chop-off hours etc..
    dat = new Date(dat.getFullYear(), dat.getMonth(), dat.getDate());
    if (daysFromToday)
        dat.setDate(dat.getDate() + daysFromToday);
    return dat;
};

var formatDateTime = function (dat)
{
    if (!dat) return '';
    var val = formatDate(dat);
    var hr = dat.getHours();
    if (hr < 10)
        hr = '0' + hr;
    var mt = dat.getMinutes();
    if (mt < 10)
        mt = '0' + mt;
    var sec = dat.getSeconds();
    if (sec < 10)
        sec = '0' + sec;
    return val + ' ' + hr + ':' + mt + ':' + sec;
};

// formatDate()
var formatDate = function (dat)
{
    if (!dat) return "";
    var parts = new Array();
    var nn = dat.getDate();
    if (nn < 10)
        nn = '0' + nn;
    parts[exilParms.dateAt] = nn;
    if (exilParms.useMonthName)
        nn = exilParms.monthNames[dat.getMonth()];
    else
    {
        nn = dat.getMonth() + 1;
        if (nn < 10)
            nn = '0' + nn;
    }
    parts[exilParms.monthAt] = nn;
    var y = dat.getFullYear();
    if (exilParms.useShortYear)
        parts[exilParms.yearAt] = new String(y).substr(2, 2);
    else
        parts[exilParms.yearAt] = y;

    return parts[0] + exilParms.dateSeparator + parts[1] + exilParms.dateSeparator + parts[2];
};

//split a date string into its parts and send an object with these parts as its attributes. Used by InputField to populate split fields.
var getDateTimeParts = function (dateTimeString, showAmPm)
{
    var dt = '';
    var hr = '00';
    var mn = '00';
    var sc = '00';
    var am = 0;
    if (dateTimeString)
    {
        var parts = dateTimeString.split(' '); //split from "dd-mmm-yy hh:mm:sec" (date is already in local format)
        if (parts[0])
            dt = parts[0];

        if (parts[1])
        {
            parts = parts[1].split(':');
            if (parts[0])
            {
                hr = parts[0];
                if (showAmPm)
                {
                    hr = parseInt(parts[0], 10);
                    if (hr > 12)
                    {
                        hr -= 12;
                        am = 1;
                    }
                    if (hr < 10)
                        hr = '0' + hr;
                }
            }
            if (parts[1])
                mn = parts[1];
            if (parts[2])
                sc = parts[2];
        }
    }
    
    return{dt : dt, hr : hr, mn : mn, sc : sc, am : am};
};
