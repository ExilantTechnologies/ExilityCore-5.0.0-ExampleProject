
 /*
  * File: chartutil.js
  * Description:
  * This file contains all generic utility functions for charts.
  */

function createChart(containerName, reportData, options, chartType)
{
    try
	{
	    eval(dataforReport);
	    eval(optionsforReport);
	    var f = Flotr.draw($(containerName), reportData.series, options, chartType);
	}
	catch(e)
	{
        debug('Report Data sent by server is not valid. It failed with error : ' + e);
	}

}			
