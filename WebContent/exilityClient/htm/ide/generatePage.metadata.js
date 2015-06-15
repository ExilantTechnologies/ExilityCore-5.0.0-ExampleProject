
 var ele;
var P2 = new PM.ExilityPage(window, 'generatePage');
P2.onLoadActionNames = [ 'getFolders','getLanguages'];
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.breadCrumpTitle = 'generatePage';
P2.onFormResetActionName = 'showResult';
P2.firstFieldName = 'folderName';
P2.title = 'Generate Page';
ele = new PM.AssistedInputField();
ele.blankOption = 'Default';
ele.dataType = 'text';
ele.listServiceId = 'languages';
ele.noAutoLoad = true;
ele.selectFirstOption = true;
ele.minCharsToTriggerService = 1;
ele.isValid = true;
ele.codePickerLeft = -1;
ele.codePickerTop = -1;
ele.suggestAfterMinChars = 1;
ele.name = 'language';
ele.label = 'Language';
ele.value = '';
P2.addField(ele);
ele = new PM.AssistedInputField();
ele.dataType = 'text';
ele.doNotValidate = true;
ele.listServiceId = 'folders';
ele.onChangeActionName = 'getPages';
ele.noAutoLoad = true;
ele.selectFirstOption = true;
ele.minCharsToTriggerService = 1;
ele.isValid = true;
ele.codePickerLeft = -1;
ele.codePickerTop = -1;
ele.suggestAfterMinChars = 1;
ele.name = 'folderName';
ele.label = 'Folder Name';
ele.value = '';
P2.addField(ele);
ele = new PM.AssistedInputField();
ele.blankOption = 'All files In this folder';
ele.dataType = 'text';
ele.doNotValidate = true;
ele.listServiceId = 'files';
ele.onChangeActionName = 'hideResult';
ele.noAutoLoad = true;
ele.selectFirstOption = true;
ele.minCharsToTriggerService = 1;
ele.isValid = true;
ele.codePickerLeft = -1;
ele.codePickerTop = -1;
ele.suggestAfterMinChars = 1;
ele.name = 'fileName';
ele.label = 'Page Name';
ele.value = '';
P2.addField(ele);
ele = new PM.HiddenField();
ele.dataType = 'text';
ele.defaultValue = 'page';
ele.name = 'resourceType';
ele.label = '';
ele.value = 'page';
P2.addField(ele);
ele = new PM.HiddenField();
ele.dataType = 'text';
ele.defaultValue = 'false';
ele.name = 'liveWithErrors';
ele.label = '';
ele.value = 'false';
P2.addField(ele);

/* MetaData for Panel :generatedPanel with table name = fileNames*/
ele = new PM.ListPanel();
ele.name = 'fileNames';
ele.panelName = 'generatedPanel';
ele.initialNumberOfRows = 1;
ele.paginateButtonType = 'linear';
ele.showHeader = true;
ele.simulateClickOnRow = 'none';
ele.tableName = 'fileNames';
ele.slideEffect = 'none';
//linkedTableName  DOES NOT EXIST

P2.addTable(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'fileNames_fileName';
ele.tableName = 'fileNames';
ele.unqualifiedName = 'fileName';
ele.label = 'Files Generated';
ele.value = '';
P2.addField(ele);

/* MetaData for Panel :messageList with table name = messages*/
ele = new PM.ListPanel();
ele.name = 'messages';
ele.panelName = 'messageList';
ele.paginateButtonType = 'linear';
ele.showHeader = true;
ele.simulateClickOnRow = 'none';
ele.tableName = 'messages';
ele.slideEffect = 'none';
//linkedTableName  DOES NOT EXIST

P2.addTable(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'messages_message';
ele.tableName = 'messages';
ele.unqualifiedName = 'message';
ele.label = 'Text';
ele.value = '';
P2.addField(ele);
/***** action field = action  ********/
ele = new PM.ServerAction();
ele.name = 'action';
ele.serviceId = 'ide.generatePage';
ele.callBackActionName = 'checkForMessage';
ele.submitForm = true;
ele.toRefreshPage = 'beforeMyAction';
ele.disableForm = true;
ele.resetFormModifiedState = true;
ele.closeWindow = true;
ele.callBackEvenOnError = true;
P2.addAction(ele);
/***** action field = getFolders  ********/
ele = new PM.ServerAction();
ele.name = 'getFolders';
ele.serviceId = 'ide.getFolders';
ele.toRefreshPage = 'beforeMyAction';
ele.disableForm = true;
ele.queryFieldNames = [ 'resourceType'];
ele.closeWindow = true;
ele.queryFieldSources = [ 'resourceType'];
P2.addAction(ele);
/***** action field = getPages  ********/
ele = new PM.ServerAction();
ele.name = 'getPages';
ele.serviceId = 'ide.getFiles';
ele.toRefreshPage = 'beforeMyAction';
ele.disableForm = true;
ele.queryFieldNames = [ 'resourceType','folderName'];
ele.closeWindow = true;
ele.queryFieldSources = [ 'resourceType','folderName'];
P2.addAction(ele);
/***** action field = getLanguages  ********/
ele = new PM.ServerAction();
ele.name = 'getLanguages';
ele.serviceId = 'ide.getLanguages';
ele.callBackActionName = 'checkLanguages';
ele.toRefreshPage = 'afterMyAction';
ele.closeWindow = true;
P2.addAction(ele);
/***** action field = checkLanguages  ********/
ele = new PM.LocalAction();
ele.name = 'checkLanguages';
ele.functionName = 'checkLanguages';
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
/***** action field = checkForMessage  ********/
ele = new PM.LocalAction();
ele.name = 'checkForMessage';
ele.functionName = 'checkForMessage';
P2.addAction(ele);
/***** action field = showResult  ********/
ele = new PM.DummyAction();
ele.name = 'showResult';
ele.showPanels = [ 'generatedPanel'];
P2.addAction(ele);
/***** action field = hideResult  ********/
ele = new PM.DummyAction();
ele.name = 'hideResult';
ele.hidePanels = [ 'generatedPanel'];
P2.addAction(ele);