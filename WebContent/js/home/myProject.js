/*
Copyright (c) 2015 EXILANT Technologies Private Limited

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */

/*******************************************************************************
 * set project parameters that over ride default exility setting. Refer to
 * ExilityParameters.js. Commonly set parameters are mentioned here, but you
 * should certainly take a look at all the parameters inside .js file given to
 * you, where these are well documented loginPage : 'htm/common/login.htm'
 * baseIMGFolderName : '../../images/' baseHTMLFolderName : 'htm/'
 * htmlToImageFolder : '../../images' fileToHtmlBase : '../../' calendarImageSrc :
 * '../../images/calendar.gif' codePickerImageSrc :
 * '../../images/codePicker.gif' calendarHtmlSrc :
 * '../../htm/common/calendar.htm' codePickerHtmlSrc :
 * '../../htm/codePicker.htm' errorMessageHtmlSrc : '../../htm/errorMessage.htm'
 * datePlaceHolder : null; //hint inside a input field for a date field
 ******************************************************************************/
exilParms.datePlaceHolder = 'dd-mmm-yyyy';
/**
 * these parameters are used by pathFinder
 */
exilParms.positionCalWithinPage = true;
exilParms.calWidth = 195;
exilParms.calCorrection = 50;
exilParms.donotAddColonToErrorMessage = true;
exilParms.showSeparateErrorIfRegexFails = true;
exilParms.errorDisplayedLocally = false;
exilParms.additionalHelpLabel = "additional help";
