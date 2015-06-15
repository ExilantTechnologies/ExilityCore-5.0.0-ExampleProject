
 var ele;
var P2 = new PM.ExilityPage(window, 'page');
P2.onLoadActionNames = [ 'checkForPageParameters'];
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.trackFieldChanges = true;
P2.breadCrumpTitle = 'page';
/*Page parameters */
ele = new PM.PageParameter();
ele.name = 'resourceName';
ele.setTo = 'fileName';
P2.addParameter(ele);

ele = new PM.OutputField();
ele.dataType = 'text';
ele.allowHtmlFormattedText = true;
ele.name = 'traceText';
ele.label = '';
ele.value = '';
P2.addField(ele);
ele = new PM.HiddenField();
ele.dataType = 'text';
ele.defaultValue = 'true';
ele.name = 'liveWithErrors';
ele.label = '';
ele.value = 'true';
P2.addField(ele);
ele = new PM.HiddenField();
ele.dataType = 'text';
ele.name = 'fileName';
ele.label = '';
ele.value = '';
P2.addField(ele);
ele = new PM.HiddenField();
ele.dataType = 'text';
ele.name = 'folderName';
ele.label = '';
ele.value = '';
P2.addField(ele);
/***** action field = action  ********/
ele = new PM.ServerAction();
ele.name = 'action';
ele.serviceId = 'ide.generatePage';
ele.callBackActionName = 'showResult';
ele.toRefreshPage = 'beforeMyAction';
ele.disableForm = true;
ele.resetFormModifiedState = true;
ele.queryFieldNames = [ 'fileName','folderName','liveWithErrors'];
ele.closeWindow = true;
ele.callBackEvenOnError = true;
ele.hidePanels = [ 'result'];
ele.queryFieldSources = [ 'fileName','folderName','liveWithErrors'];
P2.addAction(ele);
/***** action field = showResult  ********/
ele = new PM.DummyAction();
ele.name = 'showResult';
ele.showPanels = [ 'result'];
P2.addAction(ele);
/***** action field = checkForPageParameters  ********/
ele = new PM.LocalAction();
ele.name = 'checkForPageParameters';
ele.functionName = 'checkForPageParameters';
P2.addAction(ele);