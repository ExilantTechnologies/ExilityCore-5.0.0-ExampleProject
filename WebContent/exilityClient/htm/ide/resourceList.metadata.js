
 var ele;
var P2 = new PM.ExilityPage(window, 'resourceList');
P2.onLoadActionNames = [ 'getAllFiles'];
P2.pageWidth = 200;
P2.pageHeight = 700;
P2.breadCrumpTitle = 'resourceList';
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'name';
ele.label = 'Name';
ele.value = '';
P2.addField(ele);
/***** action field = getAllFiles  ********/
ele = new PM.ServerAction();
ele.name = 'getAllFiles';
ele.serviceId = 'ide.getAllFiles';
ele.callBackActionName = 'buildMenu';
ele.toRefreshPage = 'none';
ele.closeWindow = true;
P2.addAction(ele);
/***** action field = buildMenu  ********/
ele = new PM.LocalAction();
ele.name = 'buildMenu';
ele.functionName = 'buildMenu';
P2.addAction(ele);