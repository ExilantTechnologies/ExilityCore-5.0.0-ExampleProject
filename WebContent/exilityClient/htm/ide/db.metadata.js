
 var ele;
var P2 = new PM.ExilityPage(window, 'db');
P2.onLoadActionNames = [ 'getAllTables'];
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.breadCrumpTitle = 'db';
/*Page parameters */
ele = new PM.PageParameter();
ele.name = 'tableName';
P2.addParameter(ele);

ele = new PM.AssistedInputField();
ele.dataType = 'text';
ele.listServiceId = 'tables';
ele.onChangeActionName = 'getTableDetails';
ele.noAutoLoad = true;
ele.minCharsToTriggerService = 1;
ele.isValid = true;
ele.codePickerLeft = -1;
ele.codePickerTop = -1;
ele.suggestAfterMinChars = 1;
ele.name = 'tableNameToFetch';
ele.label = 'DB Table';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'tableName';
ele.label = 'Table Name';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'tableType';
ele.label = 'Table Type';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'name';
ele.label = 'Name';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'module';
ele.label = 'Module';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'description';
ele.label = 'Description';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.valueList = '0,No;1,Yes';
ele.name = 'okToDelete';
ele.label = 'Can rows be deleted?';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'keyToBeGenerated';
ele.label = 'Key To be generated?';
ele.value = '';
P2.addField(ele);

/* MetaData for Panel :columnsList with table name = columns*/
ele = new PM.ListPanel();
ele.name = 'columns';
ele.panelName = 'columnsList';
ele.onClickActionName = 'showDetails';
ele.paginateButtonType = 'linear';
ele.showHeader = true;
ele.simulateClickOnRow = 'none';
ele.tableName = 'columns';
ele.slideEffect = 'none';
//linkedTableName  DOES NOT EXIST

P2.addTable(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'columns_columnName';
ele.tableName = 'columns';
ele.unqualifiedName = 'columnName';
ele.label = 'Column Name';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'columns_sqlDataType';
ele.tableName = 'columns';
ele.unqualifiedName = 'sqlDataType';
ele.label = 'Data Type';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'columns_size';
ele.tableName = 'columns';
ele.unqualifiedName = 'size';
ele.label = 'Size';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'columns_precision';
ele.tableName = 'columns';
ele.unqualifiedName = 'precision';
ele.label = 'Precision';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'columns_scale';
ele.tableName = 'columns';
ele.unqualifiedName = 'scale';
ele.label = 'Scale';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'columns_isNullable';
ele.tableName = 'columns';
ele.unqualifiedName = 'isNullable';
ele.label = 'Scale';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'columns_defaultValue';
ele.tableName = 'columns';
ele.unqualifiedName = 'defaultValue';
ele.label = 'Default Value';
ele.value = '';
P2.addField(ele);
/***** action field = getAllTables  ********/
ele = new PM.LocalAction();
ele.name = 'getAllTables';
ele.functionName = 'getAllTables';
ele.hidePanels = [ 'tableDetails'];
P2.addAction(ele);
/***** action field = getTableDetails-------------  ********/
ele = new PM.ServerAction();
ele.name = 'getTableDetails-------------';
ele.serviceId = 'ide.getDbTables';
ele.toRefreshPage = 'beforeMyAction';
ele.closeWindow = true;
ele.showPanels = [ 'tableDetails'];
P2.addAction(ele);
var getTableDetails-------------fieldsToSubmit = new Object();
 ele.fieldsToSubmit = getTableDetails-------------fieldsToSubmit;
var getTableDetails-------------tablesToSubmit = new Object();
 ele.tablesToSubmit = getTableDetails-------------tablesToSubmit;
getTableDetails-------------fieldsToSubmit['tableName'] = true;
/***** action field = getTableDetails  ********/
ele = new PM.LocalAction();
ele.name = 'getTableDetails';
ele.functionName = 'getTableDetails';
ele.showPanels = [ 'tableDetails'];
P2.addAction(ele);
/***** action field = showDetails  ********/
ele = new PM.DummyAction();
ele.name = 'showDetails';
P2.addAction(ele);