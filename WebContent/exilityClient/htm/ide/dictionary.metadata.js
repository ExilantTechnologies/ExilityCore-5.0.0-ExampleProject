
 var ele;
var P2 = new PM.ExilityPage(window, 'dictionary');
P2.onLoadActionNames = [ 'checkForPageParameters'];
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.trackFieldChanges = true;
P2.breadCrumpTitle = 'dictionary';
/*Page parameters */
ele = new PM.PageParameter();
ele.name = 'fileName';
P2.addParameter(ele);

/***** action field = checkForPageParameters  ********/
ele = new PM.LocalAction();
ele.name = 'checkForPageParameters';
ele.functionName = 'checkForPageParameters';
P2.addAction(ele);