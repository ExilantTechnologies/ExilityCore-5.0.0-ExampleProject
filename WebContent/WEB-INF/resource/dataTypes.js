
 var dt;
var dataTypes = {};
dataTypes['text'] = new TextDataType('text', 'invalidText', null, 0, 3000);

dataTypes['timeStamp'] = new DateDataType('timeStamp', 'invalidDateTime', 3650000, 730000, true);

dataTypes['dateTime'] = new DateDataType('dateTime', 'invalidDateTime', 3650000, 730000, true);

dataTypes['yesNo'] = new BooleanDataType('yesNo', 'invalidYesNo', 'No', 'Yes');

dataTypes['number'] = new IntegralDataType('number', 'invalidNumber', 0, 99999999999999, false);

dataTypes['code'] = new TextDataType('code', 'invalidCode', /^[\d\w\.\-_]{0,20}/, 0, 20);

dataTypes['pastDate'] = new DateDataType('pastDate', 'invalidPastDate', 3650000, 0, false);

dataTypes['date'] = new DateDataType('date', 'invalidDate', 3650000, 730000, false);

dataTypes['decimal'] = new DecimalDataType('decimal', 'invalidDecimal', 0.0, 9.9999999E14, false, 6);

dataTypes['entityName'] = new TextDataType('entityName', 'invalidEntityName', /^[a-zA-Z.][a-zA-Z0-9.-_]*$/, 0, 250);

dataTypes['id'] = new IntegralDataType('id', 'invalidId', -9999999999999, 99999999999999, true);

dataTypes['futureDate'] = new DateDataType('futureDate', 'invalidFutureDate', 0, 730000, false);

dataTypes['price'] = new TextDataType('price', 'invalidPrice', /^\d+(\.\d\d?)?(\sw*)?/, 0, 20);

dataTypes['amt2'] = new DecimalDataType('amt2', 'invalidAmt2', 0.0, 1.0E16, false, 2);

dataTypes['trueFalse'] = new BooleanDataType('trueFalse', 'invalidTrueFalse', 'False', 'True');

dataTypes['description'] = new TextDataType('description', 'invalidDescription', null, 0, 3000);

dataTypes['signedNumber'] = new IntegralDataType('signedNumber', 'invalidSignedNumber', -99999999999999, 99999999999999, true);

dataTypes['yn'] = new TextDataType('yn', 'invalidYn', /[01yYnN]/, 0, 1);

dataTypes['boolean'] = new BooleanDataType('boolean', 'invalidBoolean', '0', '1');

dataTypes['signedDecimal'] = new DecimalDataType('signedDecimal', 'invalidSignedDecimal', -9.9999999999999E13, 9.9999999999999E13, true, 6);

dataTypes['maxValue'] = new IntegralDataType('maxValue', 'invalidMaxValue', -9999999999999, 99999999999999, true);


//************ messages ****************
 var dataTypeMessages = new Object();
// client messages for generic validation **
dataTypeMessages['exilColumnIsRequired'] = 'Value for column @2 is required in table @1.';
dataTypeMessages['exilValueRequired'] = 'Please enter value ';
dataTypeMessages['exilPageParameterMissing'] = 'exilPageParameterMissing is not defined.';
dataTypeMessages['exilValidateDependencyFailed'] = 'Dependeant field missing';
dataTypeMessages['exilValidateUniqueColumnsFailed'] = 'Unique Column Validation failed as there are @1 .';
dataTypeMessages['exilFromToDataTypeMismatch'] = 'Dependeant field missing';
dataTypeMessages['exilFromToValidationError'] = 'Dependeant field missing';
dataTypeMessages['exilInvalidFromTo'] = 'Dependeant field missing';
// data type specific messge. If the message is not found in meesages.xml, description of data type is put here *
dataTypeMessages['invalidSignedDecimal'] = 'Number with an optional negative sign, and an optional decimal point.';
dataTypeMessages['invalidMaxValue'] = 'maximum of 15 digits allowed';
dataTypeMessages['invalidNumber'] = 'Non-negative whole number with a max of 14 digits is accepted.';
dataTypeMessages['invalidBoolean'] = '0 for false and 1 for true';
dataTypeMessages['invalidSignedNumber'] = 'Whole number, possibly signed with a max of 14 digits.';
dataTypeMessages['invalidYn'] = 'Y for true/yes N for false/No';
dataTypeMessages['invalidTrueFalse'] = 'true and false are the only valid values';
dataTypeMessages['invalidCode'] = 'alphanumeric and these special characters -._ And nothing else for a max of 20 characters';
dataTypeMessages['invalidFutureDate'] = 'date in the future';
dataTypeMessages['invalidEntityName'] = 'Entity name starts with an alpha character and can follow with any alpha-numeric characters. Dot, hiphen and underscore are also allowed. 200 chars is considered enough.';
dataTypeMessages['invalidText'] = 'Three thousand characters are more than enough to describe pretty much anything. Well almost.';
dataTypeMessages['invalidDate'] = 'Date';
dataTypeMessages['invalidDecimal'] = 'Number with an optional decimal point, but not negative.';
dataTypeMessages['invalidPastDate'] = 'Date in the past';
dataTypeMessages['invalidPrice'] = 'Price can have up to two decimal palces. Optionally you may specify the currency after the amount. Example \'34.56 USD\' ';
dataTypeMessages['invalidYesNo'] = 'yes or no please';
dataTypeMessages['invalidId'] = 'Internally generated number by the system as primary key for table';
dataTypeMessages['invalidDescription'] = 'Three thousand characters are more than enough to describe pretty much anything. Well almost.';
dataTypeMessages['invalidDateTime'] = 'Date with time';
dataTypeMessages['invalidAmt2'] = 'Amount with two decimal places';
dataTypeMessages['specialMessage1'] = 'This is a special test message with name as speciallMessage1';
dataTypeMessages['specialMessage'] = 'This is a special test message';