
 /*
  * File: chartutil.js
  * Description:
  * This file contains all generic utility functions for charts.
  */

function createChart(containerName, dataforReport, optionsforReport, chartType)
{
    //var f = Flotr.draw($(containerName), [reportData], options, chartType);
    try
	{
	    eval(dataforReport);
	    eval(optionsforReport);
	    var f = Flotr.draw($(containerName), reportData.series, options, chartType);
	    if (chartType == 'PIE')
	    {
	        P2.getField(containerName.replace(/Container$/, '')).setLegend(f.getLegend());
	    }
	}
	catch(e)
	{
        PM.debug('Report Data sent by server is not valid. It failed with error : ' + e);
	}

}			
