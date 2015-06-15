//Exility assumes that id is always internal (hidden). It generates negaive numbers for this field on addRow. We do not want that
function resetName()
{
    P2.setFieldValue('messages_name', '');
}

function deleteThisRow(obj, fieldName, evt)
{
    var tbl = P2.getTable('messages');
    alert('current row is ' + tbl.currentRow);
    P2.deleteTableRow(null, null, 'messages');
}
