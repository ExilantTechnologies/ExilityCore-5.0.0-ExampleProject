
var fieldSeparator = "_";
var masterTabName = "steps";
var keyColName = "id";//This is stepId
var stepTypeCol = "_type";

var detailTabName = "stepAttributes"; 
var attrColName ="fieldName";
var attrValColName = "value";
var attrKeyColName = "key";//This is just stepId in detail table


var processorsType = {addColumn:'addColumn', cloneColumn:'cloneColumn', gridToValues:'gridToValues'};
var hasSubStep = {gridProcessorStep:'Processor', taskStep:'Task'};

//This is an exhaustive list of panels in Exility service!
var panelList = {'addColumn':'addColumn',
	             'appendToList':'appendToList',
	             'dummyStep':'dummyStep',
	             'errorCheckStep':'errorCheckStep',
	             'expressionAssignmentStep':'expressionAssignmentStep',
	             'functionAssignmentStep':'functionAssignmentStep',
	             'gridProcessorStep':'gridProcessorStep',
	             'gridStep':'gridStep',
	             'listStep':'listStep',
	             'lookUpStep':'lookUpStep',
	             'loopStep':'loopStep',
	             'massDeleteStep':'massDeleteStep',
	             'massUpdateStep':'massUpdateStep',
	             'serviceStep':'serviceStep',
	             'setValueStep':'setValueStep',
	             'stopStep':'stopStep',
	             'switchStep':'switchStep',
	             'taskStep':'taskStep',
	             'validationStep':'validationStep'
	             };


function rowClicked()
{
	var stepChosen = P2.getFieldValue(masterTabName+fieldSeparator+stepTypeCol);
	var stepId = P2.getFieldValue(masterTabName+fieldSeparator+keyColName);
	
	P2.setFieldValue(keyColName, stepId);
	P2.setFieldValue('stepType', stepChosen);	
	P2.setFieldValue(stepTypeCol, stepChosen);
	
	var pc = PageController.getPageController();
	var activeService = pc.getActiveServiceId();
	PageController.setPageData(stepId, activeService);
	Util.hideOrShowPanels();
}

//This will called as call back of getData service.After getting the data, initialize ServiceManager and PageController so that rest thing will be taken care by them.
function  doServiceInit()
{
	var stepId = P2.getFieldValue(masterTabName + fieldSeparator + keyColName);
	PageController.initPageController("service", stepId);	
}

//On click of save button set DC with service data.ServiceManager will do this.
function setDcBeforeSave()
{	
	ServiceManager.setDc(); //Before saving set all detailTable attributes from model, Changed/modified by the user
	P2.act(null, null, "saveService");
}

function Service(name)
{
	this.name = name;
	this.data = {};
	this.listeners = {};
	this.stepsType = {};
}

Service.prototype.getName = function()
{
	return this.name;
};

Service.prototype.setData = function(data) 
{
	this.data = data;
}; 

Service.prototype.getData = function()
{
	return this.data;
};

Service.prototype.getStepAttrs = function(serviceStepId)
{	
	var attrs = this.data[serviceStepId];
	if(!attrs)
	{
		PM.debug("error: Attrs not defined for service step "+serviceStepId);
		return Util.string.EMPTY;
	}
	return attrs;
};

Service.prototype.getStepAttrValue = function(serviceStepId, attr)
{	
	var attrs = this.getStepAttrs(serviceStepId);
	if(!attrs)
	{
		PM.debug("error: Attrs not defined for service step "+serviceStepId);
		return Util.string.EMPTY;
	}	
	
	var val = Util.string.EMPTY;
	if(attrs[attr])
	{
		val = attrs[attr];
	}	
	return val;	
};

Service.prototype.setStepAttrs = function(serviceStepId, attrName)
{
   var attrs = this.getStepAttrs(serviceStepId);
    
	if(!attrs)
	{
		return;
	}
	if(attrName)
	{
		var modelId = PageController.modelId[attrName];
		attrs[modelId] = PageController.getPageValue(attrName);		
		this.data[serviceStepId] = attrs;
		return;
	}
	
	for(var attrName in attrs)
	{	
		var attrVal = PageController.getPageValue(attrName);
		attrs[attrName] = attrVal;		
	}	
	
	this.data[serviceStepId] = attrs;
}

Service.prototype.setStepsType = function(_stepTypes)
{
	this.stepsType = _stepTypes;
}

Service.prototype.bindListeners = function()
{	
    var eventName = "blur";
	var fn = PageController.onFieldChange;
	
	for(var step in this.data)
	{
		var attrs = this.getStepAttrs(step);
		if(!attrs)
		{
			continue;
		}
		
		for(var attrName in attrs)
		{		
			var fieldId = PageController.getPageId(attrName, this.stepsType[step], step);//common fields i.e top panel;	
			
			var eleObj = document.getElementById(fieldId);//common fields i.e top panel;
			
			if(eleObj && !this.listeners[fieldId])
			{
				Util.addListener(eleObj, eventName, fn);
				this.listeners[fieldId] = eleObj;//keep track of all fields for those listener added successfully.
				PM.debug("Listener binded to ===>"+fieldId+" for step type===>"+this.stepsType[step]);
				continue;
			}
			
			if(!this.listeners[fieldId])
			PM.debug("Listener NOT binded to ===>"+fieldId);			
		}	
	}
	
}


//ServiceManager based on Singleton Pattern.
/**
 * This is Singleton class so user can have one instance in any situation.
 * This is responsible to handle/manage to service class which has taken care of a service.xml.
 *  User can create instance of ServiceManger class by two way
 *  1. var sManager = ServiceManager.getManager(); or
 *  2. var sManager = new ServiceManager();
 *  Once user instantiated this class then any where in a program or application he/she can get manager by invoking ServiceManager.getManager(); so no need to have global var.   
 */
function ServiceManager()
{
	var services = {};   
	function getInstance() 
	{
	    if (!this.instance) 
	    {
	      this.instance = {
	    		  
	        createService: function(serviceName, data)
	        {
	          var sob = new Service(serviceName);
	          services[serviceName]  = sob;
	          return sob;
	        },
	        
	        deleteService: function(serviceName)
	        {
		         if( services[serviceName])
		         {
		        	 services[serviceName] = null;
		         }	 
	        },
	        
	        getService: function(serviceName)
	        {
	        	if( services[serviceName])
		         {
	        		 return services[serviceName];
		         }
				PM.debug("error: Service '"+serviceName+"' doesn't exist");
			},
			
			getServiceData: function(serviceName)
	        {
	        	if( services[serviceName])
		         {
	        		 return services[serviceName].getData();
		         }
				PM.debug("error: Service '"+serviceName+"' doesn't exist");
			},
			
			setServiceData: function(serviceName, data)
	        {
	        	if( services[serviceName])
		         {
	        		services[serviceName].setData(data);
		         }
				PM.debug("error: Service '"+serviceName+"' doesn't exist");
			},
			
			
			clear: function()
			{
				services ={};
			}
	        
	      };
	    }
	    
	 return this.instance;
	}
	
  return getInstance();
}

ServiceManager.getManager = function()
{
	return new ServiceManager();
}

ServiceManager.copyServiceDataToDc = function(serviceId)
{
	var detailTabObj = P2.getTable(detailTabName);
	var detailGrid = detailTabObj.grid;
	var service = ServiceManager.getManager().getService(serviceId);
	if(!service)
	{
		return;
	}	
	
	for(var rIdx =1; rIdx< detailGrid.length; rIdx++)
	{
		detailTabObj.currentRow = rIdx;
		var step = P2.getFieldValue(detailTabName + fieldSeparator + attrKeyColName);//this is just stepId from master table into detail table.
		var attr = P2.getFieldValue(detailTabName + fieldSeparator + attrColName);
		var attrValue = service.getStepAttrValue(step, attr); 		
		P2.setFieldValue(detailTabName + fieldSeparator + attrValColName, attrValue);		
	}	
}

ServiceManager.setDc = function()
{
	var serviceId = PageController.getPageController().getActiveServiceId();
	ServiceManager.copyServiceDataToDc(serviceId);
}	

ServiceManager.SERVICE_PACKAGE = "com.exilant.exility.core";

//=============================Page Related Stub=====================>
/**
 * PageController: Same as ServiceManager class.
 * This will interact to page and service data.
 */
function PageController()
{	
	var activeServiceId = "defaultServiceId";
	
	function getInstance() 
	{
	    if (!this.pageInstance) 
	    {
	      this.pageInstance = {
	    		
	    	initPage:  function(initServiceId)
	    	{
	    		var tabObj = P2.getTable(masterTabName);
	    		var masterGrid = tabObj.grid;	
	    		var stepType;
	    		var stepId;
	    		var stepAttrsMap ={};//Containing master and detail table data at one object for each step in a service.
	    		var attrs = {};
	    		var stepTypes = {};
	    		
	    		if(masterGrid.length < 2)
	    		{
	    			PM.debug("error: Data not available");
	    			return;
	    		}	

	    		for(var i= 1; i < masterGrid.length; i++)
	    		{	
	    			tabObj.currentRow = i;
	    			stepId = P2.getFieldValue(masterTabName + fieldSeparator + keyColName);
	    			stepType = P2.getFieldValue(masterTabName + fieldSeparator + stepTypeCol);
	    			attrs = this.getAttrs(stepId);
	    			stepAttrsMap[stepId] = attrs;	
	    			stepTypes[stepId] = stepType;	    			
	    		}	
	    		
	    		tabObj.currentRow = 1;
	    		var service = ServiceManager.getManager().createService(initServiceId);
	    		activeServiceId = initServiceId;
	    		service.setData(stepAttrsMap);
	    		service.setStepsType(stepTypes);
	    		service.bindListeners();
			},
			
			getAttrs:  function(valueToMatch)
			{				
				var attrs = {};
				var tabObj = P2.getTable(detailTabName);
				var grid = tabObj.grid;				
				for(var i = 1; i<grid.length; i++)
				{
					tabObj.currentRow = i;		
					var attr ={};		
					var keyColValue = P2.getFieldValue(detailTabName + fieldSeparator + attrKeyColName);//This is stepId from Master Table					
					var attrName = P2.getFieldValue(detailTabName + fieldSeparator + attrColName);//column=fieldName
				    var attrValue = P2.getFieldValue(detailTabName + fieldSeparator + attrValColName);//column=value    				  
					if(keyColValue == valueToMatch)
					{
					   attrs[attrName] = attrValue;					
					}	
				}
			   return attrs;
			},
			
			getActiveServiceId: function()
			{
			  return activeServiceId;	
			},
			
			clear: function()
			{
				//do cleanup here
			}         
	         
	      };
	    }
	    
	 return this.pageInstance;
	}
	
  return getInstance();
}

PageController.modelId = {};

PageController.getPageController = function()
{
	return new PageController();
}

PageController.initPageController = function (serviceId, stepId)
{	
	var activeServiceId;	
	var pc = PageController.getPageController();	
	pc.initPage(serviceId);	
	activeServiceId = pc.getActiveServiceId();	
	PageController.setPageData(stepId, activeServiceId);	
	Util.hideOrShowPanels();
}

PageController.onFieldChange = function(event)
{
	if(!event)
	{
	   event = window.event;	
	}
	var stepId = P2.getFieldValue(keyColName);
	var activeService = PageController.getPageController().getActiveServiceId();
	var eleId = event.target.id;
	
	ServiceManager.getManager().getService(activeService).setStepAttrs(stepId, eleId);
	 
}

PageController.setPageData = function(serviceStepId, serviceId)
{	
	var service = ServiceManager.getManager().getService(serviceId);
	if(!service)
	{
		return;
	}	
	var attrs = service.getStepAttrs(serviceStepId);	
	if(!attrs)
	{
		return;
	}	
	if(!attrs)
	{
		return;
	}	
	for(var attrName in attrs)
	{		
		var fieldId = PageController.getPageId(attrName, null, serviceStepId);		
		P2.setFieldValue(fieldId, attrs[attrName]);
		
		if(!PageController.modelId[fieldId])
		{
		  PageController.modelId[fieldId] = attrName;
		}
	}	
}

PageController.getPageId = function(attrName, _stepType, stepId)
{
	var stepType = P2.getFieldValue("stepType");//In the form of dummyStepGoto=type+attributeName with camel case
	var service = ServiceManager.getManager().getService("service");
	if(_stepType)
	{
		stepType = _stepType;
	}	
	if(!attrName || !stepType)
	{
		PM.debug("attrName or stepType either not defined or not supplied ");
		return;
	}
    
	if(document.getElementById(attrName))
	{
		return attrName;//If this is common one
	}
	
	var pageId = Util.initSmall(stepType) + Util.initCap(attrName);//This is distinguished attrName for different. step
	if (!document.getElementById(pageId))
	{
		//Check for subStep View Ele in page.
		var st = Util.initSmall(stepType);
		if(hasSubStep[st])
		{
			var fullyQualifiedName = service.getStepAttrValue(stepId, Util.initSmall(hasSubStep[st]));
			var subStepName = Util.extractName(fullyQualifiedName);
			pageId = Util.initSmall(subStepName) + Util.initCap(attrName);
		}	
		
		if (!document.getElementById(pageId))
		{
			pageId = attrName;//No where I found this attr
		}
	  }
	return pageId;
 }	
 
PageController.getPageValue = function(attrName)
{
	 var fieldId = PageController.getPageId(attrName);	
	 return P2.getFieldValue(fieldId);				
}	         
//<==================================Other uitility function====================================>

function Util()
{	
	var params = {prevPanel:'default'};
	
	function getInstance() 
	{
	    if (!this.utilInstance) 
	    {
	      this.utilInstance = {
	    		
	    				
			setParamValue: function(paramName, value)
			{
			  params[paramName] = value;	
			},
			
			getParamValue: function(paramName)
			{
			  return params[paramName];	
			},
			
			clear: function()
			{
				params = {};
			}         
	         
	      };
	    }
	    
	 return this.utilInstance;
	}
	
  return getInstance();
}

Util.style = { SHOW:'', HIDE:'none' };
Util.string = { EMPTY:"", NULL:null };

Util.getUtil = function()
{
	return new Util();
}

Util.extractName = function(fullyQualifiedName) 
{
	var pkgName = ServiceManager.SERVICE_PACKAGE;
	var isPkgContain = fullyQualifiedName.indexOf(pkgName) >= 0;	
	var subStepName = fullyQualifiedName;
	if(isPkgContain)
	{
		var startIdx = pkgName.length + 1;
		var endIdx = fullyQualifiedName.length;
		subStepName = fullyQualifiedName.substring(startIdx, endIdx);
		subStepName = Util.initSmall(subStepName);		
	}	
   return Util.initSmall(subStepName);	
}

/* First letter as small case */
Util.initSmall = function(str) 
{
	if(!str)
	{	
	  return Util.string.EMPTY;	
	}
	return (str.substring(0,1).toLowerCase() + str.substring(1,str.length));
} 

/* First letter as uppercase */
Util.initCap = function(str)
{
	if(!str)
	{	
	  return Util.string.EMPTY;	
	}
	return (str.substring(0,1).toUpperCase() + str.substring(1,str.length));
}

/**
 * This will take care of cross browsers compatibility and addLister() is initialized at once only on load of script with proper setListener
 * So when we will call addListner successively/consecutively then below inner body/space wont execute because addListener initialized at once only.
 * This design is known as (closure + memoization) This technique used primarily to speed up 
 * computer programs by having function calls avoid repeating the calculation of results for previously processed inputs.
 */

Util.addListener = (function () {
	  var setListener = function (el, ev, fn) {
          if (el.addEventListener) {	             
            setListener = function (el, ev, fn) {
                 el.addEventListener(ev, fn, false);
             };
         } else if (el.attachEvent) {	            
             setListener = function (el, ev, fn) {
                 el.attachEvent('on' + ev, fn);
             };
        } else {	          
    setListener = function (el, ev, fn) {
                 el['on' + ev] =  fn;
             };
         }	         
     };
     return function (el, ev, fn) {
         setListener(el, ev, fn);
     };
    
 }());


Util.hideOrShowPanels = function()
{
	var stepType = P2.getFieldValue(stepTypeCol);//i.e Type=GridProcessor
	var subPanelName = Util.string.EMPTY;
	var prevPanel = Util.getUtil().getParamValue('prevPanel');
	var prevSubPanel = Util.getUtil().getParamValue('prevSubPanel');	
	
	stepType = Util.initSmall(stepType);
	if (panelList[stepType] && ( prevPanel && prevPanel != stepType) )
	{
		P2.hideOrShowPanels([prevPanel], Util.style.HIDE);    
	}
	
	if(hasSubStep[stepType])
	{
	   subPanelName = Util.extractName( P2.getFieldValue(stepType+hasSubStep[stepType]) ); 
	}	
	P2.setFieldValue(stepType+hasSubStep[stepType], subPanelName);
	
	if(prevSubPanel && (prevSubPanel != subPanelName) )
	{
		P2.hideOrShowPanels([prevSubPanel], Util.style.HIDE);
	}	 
	
	P2.hideOrShowPanels([stepType], Util.style.SHOW);
	P2.hideOrShowPanels([subPanelName], Util.style.SHOW);	
	
	Util.getUtil().setParamValue('prevPanel', stepType);
	Util.getUtil().setParamValue('prevSubPanel', subPanelName);	

}
