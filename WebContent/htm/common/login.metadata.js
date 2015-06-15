
 var ele;
var P2 = new PM.ExilityPage(window, 'login');
P2.pageWidth = 950;
P2.pageHeight = 535;
P2.breadCrumpTitle = 'login';

/* MetaData for the Page element :userMaster_userID*/
ele = new PM.TextInputField();
ele.dataType = 'text';
ele.defaultValue = 'exility';
ele.isRequired = true;
ele.minCharsToTriggerService = 1;
ele.isValid = true;
ele.codePickerLeft = -1;
ele.codePickerTop = -1;
ele.name = 'userMaster_userID';
ele.label = 'User Name';
ele.value = 'exility';
P2.addField(ele);

/* MetaData for the Page element :userMaster_password*/
ele = new PM.PasswordField();
ele.dataType = 'text';
ele.defaultValue = 'exility';
ele.isRequired = true;
ele.name = 'userMaster_password';
ele.label = 'Password';
ele.value = 'exility';
P2.addField(ele);
/***** action field = LoginSubmit  ********/
ele = new PM.ServerAction();
ele.name = 'LoginSubmit';
ele.serviceId = 'demo.loginService';
ele.callBackActionName = 'ProessAfterLogin';
ele.submitForm = true;
ele.toRefreshPage = 'beforeMyAction';
ele.resetFormModifiedState = true;
ele.closeWindow = true;
P2.addAction(ele);
/***** action field = AfterLogin  ********/
ele = new PM.NavigationAction();
ele.name = 'AfterLogin';
ele.pageToGo = 'PagePanel/PageHeader.htm';
ele.windowDisposal = 'replace';
P2.addAction(ele);
/***** action field = ProessAfterLogin  ********/
ele = new PM.LocalAction();
ele.name = 'ProessAfterLogin';
ele.functionName = 'ProessAfterLogin';
P2.addAction(ele);