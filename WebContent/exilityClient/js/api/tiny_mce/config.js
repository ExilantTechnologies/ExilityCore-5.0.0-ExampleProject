function exilTinyMCEOnChangeHandler(inst)
{
    var reformatVal = inst.getBody().innerHTML;
    reformatVal = reformatVal.replace(/Ò|Ó/g, "\"");
    reformatVal = reformatVal.replace(/Ô|Õ/g, "'");
    reformatVal = reformatVal.replace(/<\/li><\/ul><\/div><\/div><\/p>$/,
			"</li></ul><p><br _mce_bogus=\"1\"></p></div></div><p></p>");
    P2.setFieldValue(inst.id, reformatVal);
}
function exilTinyMCEInit(args)
{
    tinyMCE.init({
        mode: "exact",
        theme: "advanced",
        plugins: "paste",
        elements: args,
        theme_advanced_buttons1: "bold,italic,underline,strikethrough,|,bullist,numlist,undo,redo",
        theme_advanced_buttons2: "",
        theme_advanced_buttons3: "",
        theme_advanced_buttons4: "",
        theme_advanced_toolbar_location: "bottom",
        theme_advanced_toolbar_align: "center",
        theme_advanced_resizing: false,
        onchange_callback: "exilTinyMCEOnChangeHandler",
        encoding: "raw",
        setup: function (ed)
        {
            var curElement = P2.getFieldObject(ed.id);
            if (curElement.disabled || curElement.readOnly)
            {
                ed.settings.readonly = true;
            } else
            {
                ed.settings.readonly = false;
            }
        }
    });
}
