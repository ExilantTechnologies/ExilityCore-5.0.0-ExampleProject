//Exility assumes that id is always internal (hidden). It generates negaive numbers for this field on addRow. We do not want that
function resetName()
{
    P2.setFieldValue('messages_name', '');
}

//fired on load. we will check for parameter
function checkForPageParameters()
{
    var fileName = P2.getFieldValue('fileName');
    if (fileName) //we already have file name. We are called for managing this specific file
    {
        P2.hideOrShowPanels(['searchPanel'], 'none');
        P2.act(null, null, 'getMessages');
        return;
    }
    //No parameter is passed. We have to allow user to select file
    P2.act(null, null, 'getFiles');   
}