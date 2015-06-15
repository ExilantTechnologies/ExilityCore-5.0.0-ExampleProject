
 var ele;
var P2 = new PM.ExilityPage(window, 'test');
P2.onLoadActionNames = [ 'populate'];
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.breadCrumpTitle = 'test';

/* MetaData for the Page element :myDate*/
ele = new PM.AssistedInputField();
ele.dataType = 'date';
ele.minCharsToTriggerService = 1;
ele.isValid = true;
ele.codePickerLeft = -1;
ele.codePickerTop = -1;
ele.suggestAfterMinChars = 1;
ele.name = 'myDate';
ele.label = 'Date';
ele.value = '';
P2.addField(ele);

/* MetaData for the Page element :fileName*/
ele = new PM.TextInputField();
ele.dataType = 'entityName';
ele.minCharsToTriggerService = 1;
ele.isValid = true;
ele.codePickerLeft = -1;
ele.codePickerTop = -1;
ele.name = 'fileName';
ele.label = 'File Name';
ele.value = '';
P2.addField(ele);
/***** action field = populate  ********/
ele = new PM.LocalAction();
ele.name = 'populate';
ele.functionName = 'populate';
P2.addAction(ele);