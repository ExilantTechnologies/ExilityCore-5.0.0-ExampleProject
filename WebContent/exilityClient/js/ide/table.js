
var TABLE_NAME = 'name';
var NEW_TABLE_NAME = 'newTable';
var FOLDER_NAME = 'folderName';
var FILE_NAME = 'fileName';
//when user clicks on newTable/cloneTable button 

function checkForPageParameters()
{
  var fileName = P2.getFieldValue('fileName');
  if (fileName) //we already have file name. We are called for managing this specific file
  {
      P2.hideOrShowPanels(['searchPanel'], 'none');
      P2.act(null, null, 'getTable');
      document.getElementById("btnPanel").className = "btnPanel";
      return;
  }
  //No parameter is passed. We have to allow user to select file
  P2.act(null, null, 'getTables');
}


function newTable()
{
    P2.setFieldValue(TABLE_NAME, NEW_TABLE_NAME);
}


// when a new table is added, drop-down willnot have this. easiest way is to just add table name. It will work OK even when a table is modified and not added
function reselectTable()
{
    var tableName = P2.getFieldValue(TABLE_NAME);
    P2.setFieldValue(FILE_NAME, tableName);
}