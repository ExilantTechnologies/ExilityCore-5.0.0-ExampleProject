/**********************************************************************************************
*
* EXILANT CONFIDENTIAL
* _____________________________________________________________________________________________
*
*  [2004 - 2013]  EXILANT Technologies Pvt. Ltd.
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains the property of EXILANT
* Technologies Pvt. Ltd. and its suppliers, if any.  
* The intellectual and technical concepts contained herein are proprietary to   
* EXILANT Technologies Pvt. Ltd. and its suppliers and may be covered by India and 
* Foreign Patents, patents in process, and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material is strictly forbidden 
* unless prior written permission is obtained * from EXILANT Technologies Pvt. Ltd.
***********************************************************************************************/

/**********************************************************************************************
*
* PURPOSE
* _____________________________________________________________________________________________
*
* This file defines a 'class' that is used to work with 'Background Jobs'.
* A service entry can be marked as "submitAsBackgroundProcess". When this attribute is true,
* Exility spawns a new thread and runs the service under the new thread. That way, the calling
* program returns immediately while the background process is still running.
* 
* When that happens, the returned DC contains the most recently created background job id
* Additionally, everytime a service call returns, the DC contains the status of each background
* job. One can also query for the status of a background job at any time (however, this will also
* delete the status after the first call)
* 
* This file defines a class that can be used on the client side to work with the returned
* background job information, most notably,
* 1. Paint/update UI using your custom function everytime a change happens in the 
* submitted background process list
* 2. Call a status checker service to know the status of a given background job. The service
* can be called based on an event or can be set to poll continuously.
************************************************************************************************/

/***********************************************************************************************
* Date			Version		Author			Comments
*-------------------------------------------------------------------------------------------
* 30-Oct-2013	 1.0.0		Vishnu Sharma	First draft
*-------------------------------------------------------------------------------------------
***********************************************************************************************/

/**
 * The object that you can use to work with the collection of background jobs.
 * Notice the Pascal case usage, we are creating a class, remember !
 */
var BackgroundJobs = function (){
	debug("BackgroundJobs Object Created...");	
	/**
	 * Holds the list of all background jobs in the current session
	 */
	this.allBackgroundJobs = [];
				
	/**
	 * Each call to the server updates the status of the background jobs in the returned DC.
	 * Set that value for client usage.
	 * ARGUMENTS:
	 * 1) se - The service entry. This also has DC that contains key/value pairs, separated by semicolon for each job and its status
	 * 			(e.g. jobid1=running;jobid2=complete). If user requested for the special service named
	 * 			"getBackgroundJobResult", then this field contains only the status "done/running" and the 
	 * 			DC contains the job completion result
	 * RETURNS:
	 * None
	 */
	this.setAllBackgroundJobStatuses = function(se){
		var dc = se.dc;
		if( dc === null || typeof dc === ClientConstants.TYPE_IS_UNDEFINED) return;		
		
		if(se.serviceId == ClientConstants.BACKGROUND_JOB_STATUS_SERVICE_ID && 
				dc.hasValue(ClientConstants.BACKGROUND_JOB_STATUS_FIELD)){
			//we have status of a specific job id
			var jobId = dc.getValue(ClientConstants.BACKGROUND_JOB_ID_FIELD);
			var idx = this.addJob(jobId, dc.getValue(ClientConstants.BACKGROUND_JOB_STATUS_FIELD));
			if(dc.getValue(ClientConstants.BACKGROUND_JOB_STATUS_FIELD) == 
				ClientConstants.BACKGROUND_JOB_IS_DONE)
				this.allBackgroundJobs[idx].dc = dc;//set the job completion result DC
		}else if(dc.hasValue(ClientConstants.BACKGROUND_JOBS_FIELD)){			
			//We have status of all jobs in this session			
			var jobStatuses = dc.getValue(ClientConstants.BACKGROUND_JOBS_FIELD).split(ClientConstants.KEY_VALUE_LIST_SEPARATOR);
			
			for(var count=0; count < jobStatuses.length; count++){
				var theJobStatus = jobStatuses[count].split(ClientConstants.KEY_VALUE_SEPARATOR);
				this.addJob(theJobStatus[0], theJobStatus[1]);
			}
		}		
	};
	/**
	 * Remove the job from this collection
	 * ARGUMENTS:
	 * 1) jobId - The job id to match for removal
	 * RETURNS: None
	 */
	this.removeJob = function(jobId){
		var idxToRemove = -1;
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			var bgJob = this.allBackgroundJobs[count];
			if(bgJob.jobId == jobId){
				idxToRemove = count;
				break;
			}	
		}
		if(idxToRemove >= 0)
			this.allBackgroundJobs.splice(idxToRemove, 1);
	};
	/**
	 * Add a new job to this collection. If the job already exists, it will be replaced
	 * ARGUMENTS:
	 * 1) jobId - The job id
	 * 2) status - The job status
	 * RETURNS: index of the newly added job in the collection
	 */
	this.addJob = function(jobId , status){
		if(this.hasJob(jobId)) this.removeJob(jobId);
		this.allBackgroundJobs[this.allBackgroundJobs.length]= new BackgroundJob(jobId,status);
		return (this.allBackgroundJobs.length - 1);
	};
	/**
	 * Get the count of background jobs in the current user session
	 * ARGUMENTS: None
	 * RETURNS: numeric
	 */
	this.getCountOfBackgroundJobs = function(){
		return this.allBackgroundJobs.length;
	};
	/**
	 * Check if the collection has the given job with the job id
	 * ARGUMENTS:
	 * 1) bgJobId - The background job id to check
	 * RETURNS: boolean
	 */
	this.hasJob = function(bgJobId){
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			var bgJob = this.allBackgroundJobs[count];
			if(bgJob.jobId == bgJobId)
				return true;
		}
		return false;
	};
	/**
	 * Get the status of the given background job
	 * ARUGMENTS:
	 * 1) bgJobId - The background job id
	 * RETURNS:
	 * The status string (done/running) if jobid found else null
	 */
	this.getBackgroundJobStatus = function(bgJobId){
		var bgJob = null;
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			bgJob = this.allBackgroundJobs[count];
			if(bgJob.jobId == bgJobId)
				return bgJob.status;
		}
		return null;
	};
	/**
	 * Check if the job is running
	 * ARGUMENTS:
	 * 1)bgJobId - The background job id to check the status for
	 * RETURNS: boolean
	 */
	this.isJobRunning = function(bgJobId){
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			bgJob = this.allBackgroundJobs[count];
			if(bgJob.jobId == bgJobId)
				return (bgJob.status === ClientConstants.BACKGROUND_JOB_IS_RUNNING);
		}
		return ClientConstants.BACKGROUND_JOB_IS_DONE;
	};
	/**
	 * Check if there are one or more jobs pending for completion
	 * ARGUMENTS: None
	 * RETURNS: boolean
	 */
	this.hasPendingJobs = function(){
		return (this.getCountOfPendingJobs() > 0);
	};
	/**
	 * Get how many jobs are pending
	 * ARGUMENTS:None
	 * RETURNS: numeric
	 */
	this.getCountOfPendingJobs = function(){
		var countOfPendingJobs = 0;
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			bgJob = this.allBackgroundJobs[count];
			if (bgJob.status === ClientConstants.BACKGROUND_JOB_IS_RUNNING)
				countOfPendingJobs++;
		}
		return countOfPendingJobs;
	};
	/**
	 * Get the job id that is still running. There is no method to mark
	 * the job as complete. It is mandates that the job status is marked complete
	 * only when the server action sets it
	 * ARGUMENTS: None
	 * RETURNS: JobId whose status is "running" else null
	 */
	this.getNextPendingJobId = function(){
		for(var count=0; count < this.allBackgroundJobs.length; count++){
			bgJob = this.allBackgroundJobs[count];
			if (bgJob.status === ClientConstants.BACKGROUND_JOB_IS_RUNNING)
				return bgJob.jobId;
		}
		return null;
	};
	/**
	 * Clear information about all background jobs
	 * ARGUMENTS: None
	 * RETURNS: None
	 */
	this.clear = function(){
		this.allBackgroundJobs = [];
	};
};

/**
 * Represents a single background job
 */ 
var BackgroundJob = function (jobId, status){
	this.jobId = jobId;
	this.status = status;
	this.dc = null;
};
