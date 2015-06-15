
 var ele;
var P2 = new PM.ExilityPage(window, 'junk');
P2.onLoadActionNames = [ 'getAllResources'];
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.breadCrumpTitle = 'junk';

/* MetaData for Panel :panel1 with table name = someTable*/
ele = new PM.GridPanel();
ele.name = 'someTable';
ele.panelName = 'panel1';
ele.rowsCanBeAdded = true;
ele.showHeader = true;
ele.simulateClickOnRow = 'none';
ele.tableName = 'someTable';
ele.dataForNewRowToBeClonedFromRow = 'none';
ele.slideEffect = 'none';
//linkedTableName  DOES NOT EXIST

ele.firstFieldName = 'someTable_name';
P2.addTable(ele);
ele = new PM.AssistedInputField();
ele.dataType = 'entityName';
ele.minCharsToTriggerService = 1;
ele.isValid = true;
ele.onUserChangeActionName = 'junkAction';
ele.codePickerLeft = -1;
ele.codePickerTop = -1;
ele.suggestionServiceId = 'ide.getAllResourceLists';
ele.suggestAfterMinChars = 1;
ele.name = 'someTable_name';
ele.tableName = 'someTable';
ele.unqualifiedName = 'name';
ele.label = 'Name';
ele.value = '';
P2.addField(ele);
ele = new PM.TextInputField();
ele.dataType = 'text';
ele.onChangeActionName = 'dummyServerAction';
ele.minCharsToTriggerService = 1;
ele.isValid = true;
ele.codePickerLeft = -1;
ele.codePickerTop = -1;
ele.name = 'junkNumber';
ele.label = 'junkNumber';
ele.value = '';
P2.addField(ele);

/* MetaData for Panel :junkPanel with table name = junk*/
ele = new PM.ListPanel();
ele.name = 'junk';
ele.panelName = 'junkPanel';
ele.paginateButtonType = 'linear';
ele.showHeader = true;
ele.simulateClickOnRow = 'none';
ele.tableName = 'junk';
ele.slideEffect = 'none';
//linkedTableName  DOES NOT EXIST

P2.addTable(ele);
ele = new PM.OutputField();
ele.dataType = 'entityName';
ele.name = 'junk_name';
ele.tableName = 'junk';
ele.unqualifiedName = 'name';
ele.label = 'Name';
ele.value = '';
P2.addField(ele);
/***** action field = getAllResources  ********/
ele = new PM.ServerAction();
ele.name = 'getAllResources';
ele.serviceId = 'ide.getAllResourceLists';
ele.toRefreshPage = 'beforeMyAction';
ele.closeWindow = true;
P2.addAction(ele);
/***** action field = junkAction  ********/
ele = new PM.LocalAction();
ele.name = 'junkAction';
ele.functionName = 'alert(123);';
P2.addAction(ele);
/***** action field = dummyServerAction  ********/
ele = new PM.ServerAction();
ele.name = 'dummyServerAction';
ele.serviceId = 'ide.getAllResourceLists';
ele.submitForm = true;
ele.toRefreshPage = 'beforeMyAction';
ele.resetFormModifiedState = true;
ele.closeWindow = true;
P2.addAction(ele);