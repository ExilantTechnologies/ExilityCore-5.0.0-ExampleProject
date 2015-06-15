/**
 * @module This file contains definition of DateAssistant
 */
/**
 * @class DateAssistant is used as a singleton, for a page.
 */
var DateAssistant = function (p2){
    this.P2 = p2;
    this.win = p2.win;
    var doc = p2.doc;
    var div = doc.createElement('div');
    div.className = 'cal';
    div.style.position = 'absolute';
    div.innerHTML = this.paintCal();
    doc.body.appendChild(div);

    // cache frequently used elements
    this.viewStyle = div.style;
    this.yearEle = doc.getElementById('cal_year');
    this.monthEle = doc.getElementById('cal_month');
    this.dayEle = doc.getElementById('cal_dates');
};

DateAssistant.prototype = {
	weekDays : ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
	daysInMonth : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
	
	/**
	 * start the assistant for a field. invoked by fieldAssistant on a
	 * date-field
	 * 
	 * @param field
	 *            being assisted
	 * @param ele
	 *            dom element being assisted
	 * @param dt
	 *            data type of the field
	 */
	start : function (field, ele, dt){
	    this.field = field;
	    this.ele = ele;
	    this.lastValue = ele.value;
	    /*
		 * position the calendar just below the field
		 */
	    var xy = PM.getDocumentXy(ele);
	    this.viewStyle.top = (xy.y + ele.clientHeight + 1) + 'px';
	    this.viewStyle.left = xy.x + 'px'; // -1 to take care of border
	    var today = PM.getToday();
	
	    this.minDate = field.minDate || PM.getToday(-dt.maxDaysBeforeToday);
	    this.tmin = this.minDate.getFullYear() * 100 + this.minDate.getMonth();
	
	    this.maxDate = field.maxDate || PM.getToday(dt.maxDaysAfterToday);
	    this.tmax = this.maxDate.getFullYear() * 100 + this.maxDate.getMonth();
	    var val = ele.value;
	    if (val){
	        val = PM.parseDate(val);
	    }
	    if (!val){ 
	    	/*
			 * Not a date. choose today, unless today is outside valid range
			 */
	        if (this.maxDate < today){
	            val = this.maxDate;
	        } else if (this.minDate > today){
	            val = this.minDate; 
	        }else{
	            val = today;
	        }
	    }
	    this.year = this.oYear = val.getFullYear();
	    this.month = this.oMonth = val.getMonth();
	    this.date = this.oDate = val.getDate();
	    this.yearEle.innerHTML = this.year;
	    this.monthEle.selectedIndex = this.month;
	
	    this.render();
	    this.viewStyle.display = '';
	},
	
	/**
	 * close this assistant
	 */
	end : function (){
	    this.viewStyle.display = 'none';
	
	},
	
	/**
	 * return the text that is a valid html fragment for the calendar
	 * 
	 * @returns innerHTMl for painting a calendar assistant
	 */
	paintCal : function (){
	    var s = [];
	    s.push('<table id="cal_table" onmousedown="P2.ia.mouseDownedOnAssistant(event)" ><tr><td id="cal_header"><div id="cal_prev" onclick="P2.ia.assistant.changeYear(-1)"></div><div id="cal_year">Year</div><div id="cal_next" onclick="P2.ia.assistant.changeYear(1)" ></div><div id="cal_month_div"><select id="cal_month" onmousedown="P2.ia.letItGo = true;" onblur="P2.ia.monthBlurred();" onchange="P2.ia.assistant.changeMonth()" >');
	    for (var i = 0; i < 12; i++){
	        s.push('<option value="' + i + '">');
	        s.push(PM.exilParms.monthNames[i]);
	        s.push('</option>');
	    }
	    s.push('</select></div></td></tr><tr><td><table id="cal_dates_table"><thead><tr>');
	    for (var i = 0; i < 7; i++){
	        s.push('<th>');
	        s.push(this.weekDays[i]);
	        s.push('</th>');
	    }
	    s.push('</tr></thead><tbody id="cal_dates" onclick="P2.ia.assistant.clicked(event);">');
	    for (var i = 0; i < 6; i++){
	        s.push('<tr>');
	        for (var j = 0; j < 7; j++)
	            s.push('<td>&nbsp;</td>');
	        s.push('</tr>');
	    }
	    s.push('</tbody></table></td></tr></table>');
	    return s.join('');
	},
	
	/**
	 * change the dates for the painted calendar for current selected values
	 */
	render : function (){
	    this.yearEle.innerHTML = this.year;
	    this.monthEle.selectedIndex = this.month;
	
	    /**
		 * we have to disable dates that are not valid. css class is set based
		 * on that
		 */
	    var classForAll = null;
	    var min = 0;
	    var max = 32;
	
	    /*
		 * this.tmin and this.tmax are numbers of the form form yyyymm so that
		 * we can simplify comparison.
		 */
	    var t = this.year * 100 + this.month;
	    if (t < this.tmax && t > this.tmin){
	    	/*
			 * all dates in this month are in valid range
			 */
	        classForAll = 'ok'; 
	    }else if (t < this.tmin || t > this.tmax){
	    	/*
			 * all dates are outside range
			 */
	        classForAll = 'nok';
	    }else{ 
	    	/*
			 * some days are in range
			 */
	    
	        if (t == this.tmin){
	        	/*
				 * we are in the min month
				 */
	            min = this.minDate.getDate();
	        }
	        if (t == this.tmax){
	            max = this.maxDate.getDate();
	        }
	    }
	    var curDate = -1; // current date is not in this month
	    if (this.year === this.oYear && this.month === this.oMonth){
	        curDate = this.oDate; // to be highlighted
	    }
	    /*
		 * let us write dates into our table cells
		 */
	    var firstOfThisMonth = new Date(this.year, this.month, 1);
	    /*
		 * day of week this month starts
		 */
	    var startingCell = firstOfThisMonth.getDay(); 
	    var en = this.daysInMonth[this.month];
	    /*
		 * we will have a bug in this in next 400 years!!
		 */
	    if (this.month == 1 && (this.year % 4) == 0 && (this.year % 100)){
	        en = 29;
	    }
	    var val, cls;
	    var dateNumber = 1;
	    var rows = this.dayEle.childNodes;
	    
	    var rowsToBePainted = Math.ceil((en + startingCell)/7);
	
	    for (var i = 0; i < rowsToBePainted; i++){
	        var row = rows[i]; 
	        if(!row.style) // browsers are known to introduce #text elements in
							// between
	        	continue;
	        var cells = row.childNodes;
	        // Make it visible if hidden
	        row.style.display = '';
	        for (var j = 0; j < 7; j++){
	            var cell = cells[j];
	            if(!cell.style){
	            	continue;
	            }
	            /*
				 * first row may have some empty cells in the beginning. Also
				 * the cells after the last date of the month
				 */
	            if ((i == 0 && j < startingCell) || dateNumber > en){
	                val = ' ';
	                cls = 'empty';
	            }else{
	                val = dateNumber;
	                dateNumber++;
	                // what is the css we have to apply to this cell?
	                if (val == curDate){
	                    this.selectedTd = cell;
	                    cls = 'sel';
	                }  else if (classForAll){
	                    cls = classForAll;
	                }else if (val >= min && val <= max){
	                    cls = 'ok';
	                } else{
	                    cls = 'nok';
	                }
	            }
	            cell.className = cls;
	            cell.firstChild.nodeValue = val;
	        }
	    }
	    
	   // hide extra row if exist.
	   if(rows[rowsToBePainted]){
		  rows[rowsToBePainted].style.display = 'none';
	   }	  
	},
	
	/**
	 * we use mouseDown as a sneak-preview into click and prepare accordingly
	 */
	mouseDowned : function (){
	    /*
		 * this is a warning that our ia area is being clicked, because of which
		 * blur is going to be triggered
		 */
	    this.toRetainFocus = true;
	    /*
		 * however, in nonIE, onscroll does not take the focus away from the
		 * input element. and, what is 'funny' is, if you click on scroll bar,
		 * onmousedown event is fired on the element, but on onclick hence, we
		 * just switch this flag after all events trigger when mouse down
		 * happens (mousedown, focus and blur)
		 */
	    new TimeBomb(this.P2.ia, 'retainFocus', false, 0, this.win);
	},
	
	/**
	 * onclick anywhere on the calendar
	 * 
	 * @param e
	 *            event
	 */ 
	clicked : function (e){
	    // debug('calendar clicked');
	    var ele = e.target || e.srcElement;
	    if (ele.nodeType == 3)
	        ele = ele.parentNode;
	    if (ele.className != 'ok' && ele.className != 'sel'){ 
	    	/*
			 * clicked on a cell that is not a valid date
			 */
	    	return;
	    }
	    var d = new Date(this.year, this.month, parseInt(ele.innerHTML, 10));
	    var dt = dataTypes[this.dataType];
	    if(dt && dt.includesTime)
	    	this.ele.value = formatDateTime(d);
	    else
	    	this.ele.value = formatDate(d);
	    
	    this.P2.focusNext(this.field, this.ele);
	},
	
	/**
	 * called when arrow mark for next/prev year is clicked
	 * 
	 * @param incr
	 *            number by which year is to be incremented. Could be negative
	 */
	changeYear : function (incr){
	    this.year += incr;
	    this.render();
	},
	
	/**
	 * called when month is selected from drop-down box
	 */
	changeMonth : function (){
	    this.month = this.monthEle.selectedIndex;
	    this.render();
	}
};
