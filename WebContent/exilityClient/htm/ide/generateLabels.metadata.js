
 var ele;
var P2 = new PM.ExilityPage(window, 'generateLabels');
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.breadCrumpTitle = 'generateLabels';
ele = new PM.OutputField();
ele.dataType = 'text';
ele.defaultValue = '<p />Cilck on action to generate Labels file resourceFolder/i18n/translations.xml. If the file exists, existing entries in the file are retained, and only missing labels are added at the end.';
ele.allowHtmlFormattedText = true;
ele.name = 'traceText';
ele.label = '';
ele.value = '<p />Cilck on action to generate Labels file resourceFolder/i18n/translations.xml. If the file exists, existing entries in the file are retained, and only missing labels are added at the end.';
P2.addField(ele);
/***** action field = action  ********/
ele = new PM.ServerAction();
ele.name = 'action';
ele.serviceId = 'ide.generateLabels';
ele.toRefreshPage = 'beforeMyAction';
ele.closeWindow = true;
P2.addAction(ele);
/***** action field = close  ********/
ele = new PM.CloseAction();
ele.name = 'close';
ele.warnIfFormIsModified = true;
P2.addAction(ele);