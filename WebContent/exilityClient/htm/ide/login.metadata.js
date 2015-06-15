
 var ele;
var P2 = new PM.ExilityPage(window, 'login');
P2.onLoadActionNames = [ 'setServiceId'];
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.breadCrumpTitle = 'login';
/*Page parameters */
ele = new PM.PageParameter();
ele.name = 'serviceId';
ele.isRequired = true;
P2.addParameter(ele);

ele = new PM.PageParameter();
ele.name = 'userFieldName';
ele.isRequired = true;
P2.addParameter(ele);

ele = new PM.PageParameter();
ele.name = 'pwdFieldName';
ele.isRequired = true;
P2.addParameter(ele);

ele = new PM.AssistedInputField();
ele.dataType = 'text';
ele.isRequired = true;
ele.minCharsToTriggerService = 1;
ele.isValid = true;
ele.codePickerLeft = -1;
ele.codePickerTop = -1;
ele.suggestAfterMinChars = 1;
ele.name = 'userId';
ele.label = 'User Id';
ele.value = '';
P2.addField(ele);
ele = new PM.PasswordField();
ele.dataType = 'text';
ele.isRequired = true;
ele.name = 'pwd';
ele.label = 'Password';
ele.value = '';
P2.addField(ele);
ele = new PM.HiddenField();
ele.dataType = 'text';
ele.name = 'serviceId';
ele.label = '';
ele.value = '';
P2.addField(ele);
ele = new PM.HiddenField();
ele.dataType = 'text';
ele.name = 'fieldName';
ele.label = '';
ele.value = '';
P2.addField(ele);
/***** action field = setServiceId  ********/
ele = new PM.LocalAction();
ele.name = 'setServiceId';
ele.functionName = 'setServiceId';
P2.addAction(ele);
/***** action field = login  ********/
ele = new PM.LocalAction();
ele.name = 'login';
ele.functionName = 'login';
P2.addAction(ele);
/***** action field = close  ********/
ele = new PM.CloseAction();
ele.name = 'close';
ele.warnIfFormIsModified = true;
P2.addAction(ele);