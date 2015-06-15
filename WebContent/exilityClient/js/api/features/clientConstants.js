/*******************************************************************************
 * 
 * PURPOSE
 * _____________________________________________________________________________________________
 * 
 * This file contains all the constants that are used as part of communication
 * between client and server. You will find similar definitions on the server
 ******************************************************************************/

var ClientConstants = {
	TYPE_IS_UNDEFINED : "undefined",
	KEY_VALUE_SEPARATOR : "=",
	KEY_VALUE_LIST_SEPARATOR : ";",

	/* Background Job related constants */
	BACKGROUND_JOB_IS_DONE : "done",
	BACKGROUND_JOB_IS_RUNNING : "running",
	BACKGROUND_JOB_STATUS_SERVICE_ID : "getBackgroundJobResult",
	BACKGROUND_JOB_STATUS_FIELD : "_backgroundJobStatus",
	BACKGROUND_JOBS_FIELD : "_backgroundJobs",
	BACKGROUND_JOB_ID_FIELD : "_backgroundJobId",

	/* Message releated constants */
	MESSAGE_TYPE_ERROR : "error",
	MESSAGE_TYPE_WARN : "warning",
	MESSAGE_TYPE_INFO : "info",

	/* naming convention between client and server */
	TEST_CASE_CAPTURE : '_testCaseToBeCaptured',
	AUTH_STATUS : 'authenticationStatus',
	TRACE_NAME : 'exilityServerTraceText',
	PERF_TRACE_NAME : 'exilityServerPerformanceText',
	GLOBAL_FIELDS : 'globalFields',
	CSRF_HEADER : 'X-CSRF-Token',
	REMOVE_CSRF : 'remove',
	NUMBER_OF_EXISTING_LOGINS : '_nbr_existing_logins'
};