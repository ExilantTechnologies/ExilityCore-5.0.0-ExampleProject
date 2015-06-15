
 var ele;
var P2 = new PM.ExilityPage(window, 'generateDataTypes');
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.breadCrumpTitle = 'generateDataTypes';
P2.title = 'Generate Data Types';
ele = new PM.OutputField();
ele.dataType = 'text';
ele.defaultValue = '<p />Cilck on action to generate Data Types. <br /><br /> dataTypes.js and dataTypes.xsd will be created inside your resource folder. Copy dataTypes.js to the location from where your home/index page includes this. <br /><br /> NOTE: your resource folder is generally not accessible to client directly. Hence you should not include dataTypes.js from resource folder.';
ele.allowHtmlFormattedText = true;
ele.name = 'traceText';
ele.label = '';
ele.value = '<p />Cilck on action to generate Data Types. <br /><br /> dataTypes.js and dataTypes.xsd will be created inside your resource folder. Copy dataTypes.js to the location from where your home/index page includes this. <br /><br /> NOTE: your resource folder is generally not accessible to client directly. Hence you should not include dataTypes.js from resource folder.';
P2.addField(ele);
/***** action field = action  ********/
ele = new PM.ServerAction();
ele.name = 'action';
ele.serviceId = 'ide.generateDataTypes';
ele.toRefreshPage = 'beforeMyAction';
ele.closeWindow = true;
P2.addAction(ele);
/***** action field = close  ********/
ele = new PM.CloseAction();
ele.name = 'close';
ele.warnIfFormIsModified = true;
P2.addAction(ele);