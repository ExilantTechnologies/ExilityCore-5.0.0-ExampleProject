//change db related attributes based on the rdbms chosen
var DEFAULTS = {
    oracle: {
        systemDateFunction: '',
        dateFormattingPrefix: '',
        dateFormattingPostfix: '',
        dateTimeFormattingPrefix: '',
        dateTimeFormattingPostfix: '',
        nlsDateFormat: '',
        useQuotesInSql: ''
    }
    ,sqlServer: {
        systemDateFunction: '',
        dateFormattingPrefix: '',
        dateFormattingPostfix: '',
        dateTimeFormattingPrefix: '',
        dateTimeFormattingPostfix: '',
        nlsDateFormat: '',
        useQuotesInSql: ''
    }
    ,postgre: {
        systemDateFunction: '',
        dateFormattingPrefix: '',
        dateFormattingPostfix: '',
        dateTimeFormattingPrefix: '',
        dateTimeFormattingPostfix: '',
        nlsDateFormat: '',
        useQuotesInSql: ''
    }
    ,mySql: {
        systemDateFunction: '',
        dateFormattingPrefix: '',
        dateFormattingPostfix: '',
        dateTimeFormattingPrefix: '',
        dateTimeFormattingPostfix: '',
        nlsDateFormat: '',
        useQuotesInSql: ''
    }
};

var resetDefaultFields = function ()
{
    var rdbms = P2.getFieldValue('rdbmsBeingUsed');
    var defaults = DEFAULTS[rdbms];
    if (!defaults)
    {
        PM.message('Default values are not available for rdbms ' + rdbms);
        return;
    }
    
    for (var a in defaults)
    {
        var f = P2.getField(a);
        if(f)
            f.setValue(defaults[a]);
        else
            PM.message(a + ' is not a field');
    }
};