
 var ele;
var P2 = new PM.ExilityPage(window, 'addNewStep');
P2.onLoadActionNames = [ 'fixCss'];
P2.pageWidth = 1028;
P2.pageHeight = 700;
P2.popupWidth = 500;
P2.popupHeight = 300;
P2.popupTop = 150;
P2.popupLeft = 300;
P2.trackFieldChanges = true;
P2.breadCrumpTitle = 'addNewStep';
ele = new PM.SelectionField();
ele.dataType = 'text';
ele.isRequired = true;
ele.selectionValueType = 'text';
ele.onUserChangeActionName = 'getSubSteps';
ele.valueList = '1,Expression Assignment;2,Dummy;gridProcessors,Grid Processor;taskSteps,Task Step';
ele.name = 'steps';
ele.label = 'Choose Step';
ele.value = '';
P2.addField(ele);
ele = new PM.SelectionField();
ele.dataType = 'text';
ele.isRequired = true;
ele.selectionValueType = 'text';
ele.name = 'subSteps';
ele.label = 'Type';
ele.value = '';
P2.addField(ele);
ele = new PM.SelectionField();
ele.dataType = 'text';
ele.isRequired = true;
ele.selectionValueType = 'text';
ele.onUserChangeActionName = 'disableOrEnableStepNum';
ele.valueList = '1,Before;2,After;3,At Begining;4,At Last';
ele.name = 'placeOrder';
ele.label = 'Place This Step';
ele.value = '';
P2.addField(ele);
ele = new PM.AssistedInputField();
ele.dataType = 'text';
ele.minCharsToTriggerService = 1;
ele.isValid = true;
ele.codePickerLeft = -1;
ele.codePickerTop = -1;
ele.suggestAfterMinChars = 1;
ele.name = 'stepNum';
ele.label = 'To Step:';
ele.value = '';
P2.addField(ele);
/***** action field = getSubSteps  ********/
ele = new PM.LocalAction();
ele.name = 'getSubSteps';
ele.functionName = 'getSubSteps';
P2.addAction(ele);
/***** action field = addStep  ********/
ele = new PM.CloseAction();
ele.name = 'addStep';
ele.warnIfFormIsModified = true;
P2.addAction(ele);
/***** action field = fixCss  ********/
ele = new PM.LocalAction();
ele.name = 'fixCss';
ele.functionName = 'fixCss';
P2.addAction(ele);
/***** action field = disableOrEnableStepNum  ********/
ele = new PM.LocalAction();
ele.name = 'disableOrEnableStepNum';
ele.functionName = 'disableOrEnableStepNum';
P2.addAction(ele);
/***** action field = enableStepNum  ********/
ele = new PM.DummyAction();
ele.name = 'enableStepNum';
ele.fieldToFocusAfterExecution = 'stepNum';
ele.enableFields = [ 'stepNum'];
P2.addAction(ele);
/***** action field = disableStepNum  ********/
ele = new PM.DummyAction();
ele.name = 'disableStepNum';
ele.disableFields = [ 'stepNum'];
P2.addAction(ele);
/***** action field = showSubStepPanel  ********/
ele = new PM.DummyAction();
ele.name = 'showSubStepPanel';
ele.showPanels = [ 'subStepPanel'];
P2.addAction(ele);
/***** action field = hideSubStepPanel  ********/
ele = new PM.DummyAction();
ele.name = 'hideSubStepPanel';
ele.hidePanels = [ 'subStepPanel'];
P2.addAction(ele);