
var SQL_NAME = 'name';
var NEW_SQL_NAME = 'newSql';



//fired on load. we will check for parameter
function checkForPageParameters()
{
  var fileName = P2.getFieldValue('fileName');
  if (fileName) //we already have file name. We are called for managing this specific file
  {
      P2.hideOrShowPanels(['searchPanel'], 'none');
      P2.act(null, null, 'getSql');
      document.getElementById("btnPanel").className = "btnPanel";
      return;
  }
  //No parameter is passed. We have to allow user to select file
  P2.act(null, null, 'getSqls');
}


//when user clicks on newTable button
function newSql()
{
    P2.setFieldValue(SQL_NAME, NEW_SQL_NAME);
    //we will keep everything else the same allowing users to copy a Sql as it is...
}


// when a new table is added, drop-down willnot have this. easiest way is to just add table name. It will work OK even when a table is modified and not added
function reselectSql()
{
    var sqlName = P2.getFieldValue('name');
    P2.setFieldValue('fileName', sqlName);
}

//for stored procedure, sql is to be hidden and storedProcedureName is to be shown.
// the otherway round for others
function hideOrShowSql()
{
    //sql is displayed in two tr elements, and stored proecure in another tr.
    var sqlTr1 = document.getElementById('sql').parentNode.parentNode;
    var sqlTr2 = sqlTr1.previousSibling;
    var spTr = document.getElementById('storedProcedureName').parentNode.parentNode;

    //let us hide/show required ones
    if (P2.getFieldValue('sqlType') == 'storedProcedure')
    {
        sqlTr1.style.display = 'none';
        sqlTr2.style.display = 'none';
        spTr.style.display = '';
    }
    else
    {
        sqlTr1.style.display = '';
        sqlTr2.style.display = '';
        spTr.style.display = 'none';
    }
}