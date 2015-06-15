/******** Data format example from highchart
 
1) For  line,bar,pie,area chart
  
   series: [ {
                name: 'Tokyo',
                data: [7.0, 6.9, 9.5, 14.5, 18.2, 23.3, 18.3, 13.9, 9.6]
            }, 
            {
                name: 'New York',
                data: [0.2, 0.8, 5.7, 11.3, 17.0, 20.1, 14.1, 8.6, 2.5]
            }
            ]
      
2) For pie chart

             series: [{
             	name: 'Browser share',
                data: [
                    ['Firefox',   45.0],
                    ['IE',       26.8],
                    ['chrome', 12.8],
                    ['Safari',    8.5],
                    ['Opera',     6.2],
                    ['Others',   0.7]
                ]
            }]
 
 ******/
//this file is included in the index page of the project after field.js so that it overrides the charting functions to work with high chart
if (!window.ChartField)
{
    alert('chart driver file is not included properly in your project. Charts will not work in your project');
    //create dummy objects to avoid exceptions
    window.ChartField = {};
    window.PieChart = {};
    window.LineChart = {};
    window.BarChart = {};
    window.AreaChart = {};
    window.SankeyChart = {};
    window.SunBurstChart = {};
}

//common methods across different charts are defined as base class level

ChartField.prototype.drawChart = function (win, eleName, data, option, onClickFunction, onMoveFunction)
{
	//TODO : this method will execute if the concrete class has 
};

//for pie chart data has the following columns: label, data,
PieChart.prototype.drawChart = function (data, options)
{
    var win = this.P2.win;
    obj = win.$(this.name);
    if (this.helpTexts || this.mouseMoved)
    {
        //options.mouse = {track:true};
        obj.field = this;
        obj.observe('flotr:mousemove', function (e)
        {
            var field = this.field;
            var idx = e.memo[1].rowIdx;
            if (field.helpTexts)
            {
                this.title = '';
                var txt = field.helpTexts[idx];
                if (txt)
                    this.title = txt;
            }

            if (field.mouseMoved)
                field.mouseMoved(idx);
        });
    }
    if (this.mouseClicked)
    {
        obj.field = this;
        obj.observe('flotr:click', function (e)
        {
            var idx = e.memo && e.memo[1] && e.memo[1].rowIdx;
            alert(idx + '\n' + this.field.mouseClicked);
            this.field.mouseClicked(idx);
        });
    }
    var f = this.P2.win.Flotr.draw(obj, [data], options, 'PIE');
    this.setLegend(f.getLegend());
};
