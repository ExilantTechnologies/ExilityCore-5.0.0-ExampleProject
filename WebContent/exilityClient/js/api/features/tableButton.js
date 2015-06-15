
//ButtonTable is a very very special case, because I am still not sure why it is a table :-)
// alternate design is to make it a field. Filed looks more logical, but table is more convenient at this time.
// we will review this design later and decide, meanwhile here is the ButtonPane table that DOES NOT inherit from AbstractTable

//button field is only a data structure that is stored under buttons collection
var ButtonField = function (nam, label, actionName)
{
    this.name = nam;
    this.label = label;
    this.actionName = actionName;
};

var ButtonPanel = function ()
{
    this.name = null;
    this.P2 = null;
    this.renderingOption = null;
    this.buttons = new Object(); //collection of buttonFields
};

ButtonPanel.prototype.setData = function (dc)
{
    var data = dc.grids[this.name];
    if (data.length <= 1)
    {
        if (this.renderingOption == 'nextToEachOther')
        {
            this.P2.hideOrShowPanels([this.name], 'none');
        }
        else
        {
            var listName = this.name + 'ButtonList';
            var buttonList = this.P2.doc.getElementById(listName);
            //should we do the following or just say buttonList.innerHTML = ''
            while (buttonList.options.length)
            {
                buttonList.remove(0);
            }
        }
        return;
    }
    data = this.transposeIfRequired(data);
    //possible that it was hidden earlier.. Let us show it first
    this.P2.hideOrShowPanels([this.name], '');
    if (this.renderingOption == 'nextToEachOther')
        this.enableButtons(data);
    else
        this.buildDropDown(data);
};

//enable/disable buttons in a button panel based on data received from server
ButtonPanel.prototype.enableButtons = function (data)
{
    var doc = this.P2.doc;
    var n = data.length;
    if (n <= 1) return;
    //if the table has its second column, it is interpreted as Yes/No for enable. 0 or empty string is No, everything else is Yes
    var hasFlag = data[0].length > 1;

    //for convenience, get the buttons into a collection indexed by name
    var btnsToEnable = {};
    for (var i = 1; i < n; i++)
    {
        var row = data[i];
        if (hasFlag)
        {
            var flag = row[1];
            if (!flag || flag == '0')
                continue;
        }
        btnsToEnable[row[0]] = true;
    }

    //now let us go thru each button, and hide or who it
    for (var btnName in this.buttons)
    {
        var ele = doc.getElementById(btnName);
        if (!ele)
        {
            debug('Design Error: Button panel ' + this.name + ' has not produced a DOM element with name  ' + btnName);
            continue;
        }
        ele.style.display = btnsToEnable[btnName] ? '' : 'none';
    }
};

ButtonPanel.prototype.buildDropDown = function (data)
{
    var flag;
    var doc = this.P2.doc;
    var ele = doc.getElementById(this.name + 'ButtonList');
    if (!ele)
    {
        debug('DESIGN ERROR: Button Panel ' + this.name + ' has not produced a drop-down boc with name = ' + this.Name + 'ButtonList');
        return;
    }
    //zap options first
    ele.innerHTML = '';
    //that took away the first one also. Add a blank option
    var option = doc.createElement('option');
    ele.appendChild(option);

    //this.buttons has all the button names defined for this panel with value = 'disabled'
    // i.e. this.buttons['button1'] = 'disabled';
    // for the rows that are in data, mark them as enabled.
    var n = data.length;
    if (n <= 1) return;

    if ((n == 2) && (data[0].length > 1))
    {
        var hasFlag = data[0].length > 1;
        for (var i = 0; i < data[0].length; i++)
        {
            if (hasFlag)
            {
                flag = data[1][i];
                if (!flag || flag == '0')
                    continue;
            }
            var btnName = data[0][i];
            var btn = this.buttons[btnName];
            if (!btn)
            {
                debug('Button Panel ' + this.name + ' is not defined with a button with name ' + btnName + ' but server is trying to enable this button');
                continue;
            }
            option = doc.createElement('option');
            option.value = btn.actionName;
            option.innerHTML = btn.label;
            ele.appendChild(option);
        }
    }
    else
    {
        var hasFlag = data[0].length > 1;
        for (var i = 1; i < n; i++)
        {
            if (hasFlag)
            {
                flag = data[i][1];
                if (!flag || flag == '0')
                    continue;
            }
            var btnName = data[i][0];
            var btn = this.buttons[btnName];
            if (!btn)
            {
                debug('Button Panel ' + this.name + ' is not defined with a button with name ' + btnName + ' but server is trying to enable this button');
                continue;
            }
            option = doc.createElement('option');
            option.value = btn.actionName;
            option.innerHTML = btn.label;
            ele.appendChild(option);
        }
    }
};

//Standard way of getting data from server is a grid with first row as header row and rest a data rows.
//But it is possible that server may send button names in first row, and optional second row as enable flag.
//We detect the second case, and transpose the grid, so that a common logic can be used.
ButtonPanel.prototype.transposeIfRequired = function (data)
{
    //we need to transpose only if we have one or two rows
    var nbrRows = data && data.length;
    if (!nbrRows || nbrRows > 2)
        return data;

    var row = data[0];
    var nbrCols = row.length;
    if (!nbrCols)
        return data;
  
    //We make a simple assumption, that the label for last column can not clash with the name of a button.
    if (!this.buttons[row[nbrCols - 1]])
        return data;

    //we transpose the grid, with an empty header row
    var newData = null;
    if (data.length == 1) //button name only
    {
        newData = [['']];
        for (var i = 0; i < nbrCols; i++)
            newData.push([row[i]]);
    }
    else
    {
        //button name with enable flag
        newData = [['', '']];
        var row1 = data[1];
        for (var i = 0; i < nbrCols; i++)
            newData.push([row[i], row1[i]]);
    }
    return newData;
};
