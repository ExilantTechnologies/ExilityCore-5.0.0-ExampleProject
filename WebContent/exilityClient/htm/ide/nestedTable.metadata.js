
 var ele;
var P2 = new PM.ExilityPage(window, 'nestedTable');
P2.onLoadActionNames = [ 'foo'];
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.breadCrumpTitle = 'nestedTable';

/* MetaData for Panel :parentPanel with table name = parentTable*/
ele = new PM.ListPanel();
ele.name = 'parentTable';
ele.panelName = 'parentPanel';
ele.paginateButtonType = 'linear';
ele.showHeader = true;
ele.simulateClickOnRow = 'none';
ele.tableName = 'parentTable';
ele.slideEffect = 'none';
//linkedTableName  DOES NOT EXIST

ele.nestedTableName = 'nestedTable';
ele.nestOnColumnName = 'parentKey';
ele.nestedTableColumnName = 'parentKey';
P2.addTable(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'parentTable_parentKey';
ele.tableName = 'parentTable';
ele.unqualifiedName = 'parentKey';
ele.label = 'key';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'parentTable_parentData';
ele.tableName = 'parentTable';
ele.unqualifiedName = 'parentData';
ele.label = 'data';
ele.value = '';
P2.addField(ele);

/* MetaData for Panel :nestedPanel with table name = nestedTable*/
ele = new PM.ListPanel();
ele.name = 'nestedTable';
ele.panelName = 'nestedPanel';
ele.paginateButtonType = 'linear';
ele.showHeader = true;
ele.simulateClickOnRow = 'none';
ele.tableName = 'nestedTable';
ele.slideEffect = 'none';
//linkedTableName  DOES NOT EXIST

P2.addTable(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'nestedTable_childKey';
ele.tableName = 'nestedTable';
ele.unqualifiedName = 'childKey';
ele.label = 'key';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'nestedTable_parentKey';
ele.tableName = 'nestedTable';
ele.unqualifiedName = 'parentKey';
ele.label = 'linked key';
ele.value = '';
P2.addField(ele);
ele = new PM.OutputField();
ele.dataType = 'text';
ele.name = 'nestedTable_childData';
ele.tableName = 'nestedTable';
ele.unqualifiedName = 'childData';
ele.label = 'data';
ele.value = '';
P2.addField(ele);
/***** action field = foo  ********/
ele = new PM.LocalAction();
ele.name = 'foo';
ele.functionName = 'foo';
P2.addAction(ele);