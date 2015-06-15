/**
* set project parameters that over ride default exility setting. Refer to ExilityParameters.js.
* Commonly set parameters are mentioned here, but you should certainly take a look at all the parameters inside
* .js file given to you, where these are well documented
		loginPage : 'htm/common/login.htm'
		baseIMGFolderName : '../../images/'
		baseHTMLFolderName : 'htm/'
		htmlToImageFolder : '../../images'
		fileToHtmlBase : '../../'
		calendarImageSrc : '../../images/calendar.gif'
		codePickerImageSrc : '../../images/codePicker.gif'
		calendarHtmlSrc : '../../htm/common/calendar.htm'
		codePickerHtmlSrc : '../../htm/codePicker.htm'
		errorMessageHtmlSrc :  '../../htm/errorMessage.htm'
		datePlaceHolder : null; //hint inside a input field for a date field
***************/
exilParms.datePlaceHolder = 'dd-mmm-yyyy';
/**
 * these parameters are used by pathFinder
 */
exilParms.positionCalWithinPage = true;
exilParms.calWidth = 195;
exilParms.calCorrection = 50;
exilParms.donotAddColonToErrorMessage = true;
exilParms.showSeparateErrorIfRegexFails = true;
exilParms.errorDisplayedLocally = true;
exilParms.additionalHelpLabel = "additional help";

