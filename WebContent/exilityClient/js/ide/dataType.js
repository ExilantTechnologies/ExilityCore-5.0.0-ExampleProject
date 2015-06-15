//doSave action uses an action field to direct server as to what to do to the data type
var ACTION_FIELD = 'bulkAction';
var DELETE_ACTION = 'delete';
var MODIFY_ACTION = 'modify';
var ADD_ACTION = 'add';

//fired on load. we will check for parameter
function checkForPageParameters()
{
    var fileName = P2.getFieldValue('fileName');
    if (fileName) //we already have file name. We are called for managing this specific file
    {
        P2.hideOrShowPanels(['searchPanel'], 'none');
        P2.act(null, null, 'getDataTypes');
        return;
    }
    //No parameter is passed. We have to allow user to select file
    P2.act(null, null, 'getFiles');
}

//We have to show only the relevant fields for a given data type, and hide other fields
//page.xml has dummy yactions to show/hide. we map data type to these actions
var actions =
{
    TextDataType : 'showText',
    IntegralDataType : 'showNumber',
    DecimalDataType: 'showNumber',
    DateDataType : 'showDate',
    BooleanDataType : 'showBoolean'
}

function showRelevantFields()
{
    var actionName = actions[P2.getFieldValue('editingTable__type')];
    if (!actionName)
        actionName = 'hideAll';
    P2.act(null, null, actionName);
}

//this is called when messages are recd, but before data is rendered.
//we use internal.getMessages service that returns all details of message. Chop columns to make this suitable for our list service
function assignMessages()
{
    //fileName is a parameter in this, and it clashes with a field name
    delete dc.values['fileName'];
    var grid = dc.grids['messages'];
    for (var i = 0; i < grid.length; i++)
    {
        var row = grid[i];
        row[0] = row[1]; //first col is _type, and second one is messageName. We want messageName in both.
        row.length = 2;
    }
}

//name is to be enabled in add mode only
var NAME_NAME = 'editingTable_name';
var KEY_NAME = 'dataTypes_name';
var TYPE_NAME = 'dataTypes__type';
var DESC_NAME = 'editingTable_description';
function rowClicked()
{
    var key = P2.getFieldValue(KEY_NAME);
    if (!key) //Exility generates an additional rowClicked for add row
        return;
    var fieldName = DESC_NAME; //to focus cursor
    var actionName = 'disableName';
    if (parseInt(key)) //key is number means this is add row
    {
        P2.setFieldValue(KEY_NAME, ''); //because exility would have set it to -1 etc...
        actionName = 'enableName';
        fieldName = NAME_NAME;
    }
    //and let user start entering name
    P2.act(null, null, actionName);
    document.getElementById(fieldName).focus();
}

var INT_TYPE = 'IntegralDataType';
var DEC_TYPE = 'DecimalDataType';
//min/Max is a common field for Integral and Decimal data type. Hence its validation can not be set in page.xml. validationFunction is set to this function
function validateMinMaxValue(val)
{
    var dt = P2.getFieldValue(TYPE_NAME);
    if (dt == INT_TYPE || dt == DEC_TYPE)
    {
        if(!val || val.length == 0)
            return "Min/Max values are required"
    }
    return null;
}

