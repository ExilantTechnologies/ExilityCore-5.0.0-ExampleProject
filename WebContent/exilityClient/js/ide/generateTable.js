//if this project has no folders under resource/table, we will have to deal with root folder
//not that this funciton is called before the grid is used to populate drop-down..
function handleNoFolders()
{
    var grid = dc.grids['folders'];
    if (!grid)
    {
        alert('Error in table.js: grid named folders is not found in dc');
        return;
    }
    if (grid.length == 1)
    {
        grid[0].push('name');
        grid.push(['', 'rootFolder']);
    }
}
