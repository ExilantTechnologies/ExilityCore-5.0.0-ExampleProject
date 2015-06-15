
 var ele;
var P2 = new PM.ExilityPage(window, 'dataElement');
P2.onLoadActionNames = [ 'getFiles'];
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.trackFieldChanges = true;
P2.breadCrumpTitle = 'dataElement';
ele = new PM.SelectionField();
ele.dataType = 'text';
ele.isRequired = true;
ele.listServiceId = 'files';
ele.onChangeActionName = 'getDataElements';
ele.noAutoLoad = true;
ele.selectFirstOption = true;
ele.selectionValueType = 'text';
ele.donotTrackChanges = true;
ele.name = 'fileName';
ele.label = 'File Name';
ele.value = '';
P2.addField(ele);
ele = new PM.HiddenField();
ele.dataType = 'text';
ele.defaultValue = 'dictionary';
ele.name = 'resourceType';
ele.label = '';
ele.value = 'dictionary';
P2.addField(ele);
/***** action field = getFiles  ********/
ele = new PM.ServerAction();
ele.name = 'getFiles';
ele.serviceId = 'ide.getFiles';
ele.toRefreshPage = 'beforeMyAction';
ele.disableForm = true;
ele.queryFieldNames = [ 'resourceType'];
ele.closeWindow = true;
ele.queryFieldSources = [ 'resourceType'];
P2.addAction(ele);
/***** action field = getDataElements  ********/
ele = new PM.DummyAction();
ele.name = 'getDataElements';
P2.addAction(ele);
/***** action field = doSave  ********/
ele = new PM.DummyAction();
ele.name = 'doSave';
P2.addAction(ele);
/***** action field = close  ********/
ele = new PM.CloseAction();
ele.name = 'close';
ele.warnIfFormIsModified = true;
P2.addAction(ele);
/***** action field = reload  ********/
ele = new PM.ResetAction();
ele.name = 'reload';
ele.warnIfFormIsModified = true;
P2.addAction(ele);