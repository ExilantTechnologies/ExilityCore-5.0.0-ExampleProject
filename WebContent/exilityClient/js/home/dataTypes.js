
 var dt;
var dataTypes = {};
dataTypes['text'] = new TextDataType('text', 'invalidText', null, 0, 3000);

dataTypes['yesNo'] = new BooleanDataType('yesNo', 'invalidYesNo', 'No', 'Yes');

dataTypes['dateTime'] = new DateDataType('dateTime', 'invalidDateTime', 3650000, 730000, true);

dataTypes['number'] = new IntegralDataType('number', 'invalidNumber', 0, 999999999, false);

dataTypes['date'] = new DateDataType('date', 'invalidDate', 3650000, 730000, false);

dataTypes['decimal'] = new DecimalDataType('decimal', 'invalidDecimal', 0.0, 9.9999999E7, false, 6);

dataTypes['entityName'] = new TextDataType('entityName', 'invalidEntityName', /^[a-zA-Z][a-zA-Z0-9.-_]*$/, 0, 250);

dataTypes['trueFalse'] = new BooleanDataType('trueFalse', 'invalidTrueFalse', 'False', 'True');

dataTypes['description'] = new TextDataType('description', 'invalidDescription', null, 0, 3000);

dataTypes['signedNumber'] = new IntegralDataType('signedNumber', 'invalidSignedNumber', -999999999, 999999999, true);

dataTypes['boolean'] = new BooleanDataType('boolean', 'invalidBoolean', '0', '1');

dataTypes['signedDecimal'] = new DecimalDataType('signedDecimal', 'invalidSignedDecimal', -99999.0, 99999.0, true, 6);

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
dataTypeMessages['invalidNumber'] = 'Non-negative whole number with a max of 9 digits is accepted.';
dataTypeMessages['invalidMaxValue'] = 'maximum of 15 digits allowed';
dataTypeMessages['invalidSignedNumber'] = 'Whole number, possibly signed with a max of 9 digits.';
dataTypeMessages['invalidBoolean'] = '0 for false and 1 for true';
dataTypeMessages['invalidTrueFalse'] = 'true and false are the only valid values';
dataTypeMessages['invalidEntityName'] = 'Entity name starts with an alpha character and can follow with any alpha-numeric characters. Dot, hiphen and underscore are also allowed. 200 chars is considered enough.';
dataTypeMessages['invalidText'] = 'Three thousand characters are more than enough to describe pretty much anything. Well almost.';
dataTypeMessages['invalidDate'] = 'Date';
dataTypeMessages['invalidDecimal'] = 'Number with an optional decimal point, but not negative.';
dataTypeMessages['invalidYesNo'] = 'yes or no please';
dataTypeMessages['invalidDescription'] = 'Three thousand characters are more than enough to describe pretty much anything. Well almost.';
dataTypeMessages['invalidDateTime'] = 'Date with time';
dataTypeMessages['specialMessage'] = 'This is a special test message';
dataTypeMessages['specialMessage1'] = 'This is a special test message with name as speciallMessage1';