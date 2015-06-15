//build menu from grid of folder/file returned from getALlFiles service
function buildMenu()
{
    var nodes = [];
    var data = dc && dc.getGrid('resourceList');
    if (!data || data.length <= 1)
    {
        PM.debug('No data found for resourceList');
        return;
    }

    for (var i = 1; i < data.length; i++)
    {
        //columns: fullyQualifiedFileNameFromResourceFolderRoot, fileType(file/folder)
        var row = data[i];
        var fileName = row[0];
        var node = { id: fileName, value: fileName, type: row[1]};
        var parentId = null;
        var n = fileName.lastIndexOf('/');
        if (n > -1)
        {
            parentId = fileName.substring(0, n);
            fileName = fileName.substring(n + 1);
        }
        node.parentId = parentId;
        node.name = fileName;
        nodes.push(node);
    }

    var tree = new Tree('files');
    tree.buildFromArray(nodes, false, true);
    tree.createMenu('resources', 'left', foo, null);
}

function foo(name, node)
{
    alert('name: ' + name + ' and id' + node.id);
}
