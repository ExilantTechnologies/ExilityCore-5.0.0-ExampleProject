<%@ page session="true" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@page import="org.apache.commons.fileupload.*,org.apache.commons.fileupload.disk.*,org.apache.commons.fileupload.servlet.*,java.util.*,java.io.*"%>
<%@page import="com.exilant.exility.core.*, java.util.Properties, org.apache.tika.config.TikaConfig, org.apache.tika.detect.Detector, org.apache.tika.io.TikaInputStream, org.apache.tika.metadata.Metadata"%>
<%
	String scriptToOutput = "";
	String urlString = "";
    String urlStringPath = "";
    String sessionId = request.getSession().getId(); // Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility: Venkat
	if (AP.projectName == null)
	    scriptToOutput = "alert('Your application is not set properly. Change your web.config to set the resource folder properly.');";
	else
	{
	    try
	    {
	    	ServletContext context = getServletContext();
            long maxFileSizeForUpload = Long.parseLong(context.getInitParameter("maxFileSize"));  // Get the max file size for upload from web.xml : Guru
            
			request.setCharacterEncoding("UTF-8");	// May 3 2011 : Change to support utf 8 char in multi-part form data - Exility App : Aravinda
			FileItemFactory factory = new DiskFileItemFactory();
			ServletFileUpload upload = new ServletFileUpload(factory);
			upload.setHeaderEncoding("UTF-8");	// May 3 2011 : Change to support utf 8 char in multi-part form data - Exility App : Aravinda
			
			upload.setSizeMax(maxFileSizeForUpload);  //Set max file size for upload : Guru
			TikaInputStream tikaIS = null;
			
			boolean isMultipart = ServletFileUpload.isMultipartContent(request);
			// Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility (Start): Venkat
			List ExilityFileItemsList =  new ArrayList();
			request.getSession().setAttribute("ExilityIsMultipart", isMultipart);
			// Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility (End): Venkat
			
			//Oct 12 2009 : Bug 672 - Upload file ASPX and JSP issue - Exility (Start) : Aravinda
     		String homepage = request.getHeader("referer");
  			//Oct 12 2009 : Bug 672 - Upload file ASPX and JSP issue - Exility (End) : Aravinda
  			
  			String fileType = context.getInitParameter("ENC_ATLASCONFIG");
			
           	String fnameArr[][] = new String[6][3];    
           	fnameArr[0][0] = "FILENAME__ExilityFilePath";
           	fnameArr[0][1] = "FILENAME";
           	fnameArr[0][2] = "REMARKS";
           	
           	String actualFileName = null;
           	Boolean flag = true;
           	String uploadedFileTypes = "";
           	String comma = "";
            if(isMultipart)
            {
            	FileItem fitem = null;     
            	List items = upload.parseRequest(request); // Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility: Venkat
            	Iterator iterator = items.iterator();
            	int fileCount = 1;
            	int remarkCount = 1;
            	
            	Properties p = new Properties();
		    	InputStream input = null;
		    	
		    	input = new FileInputStream(ResourceManager.getResourceFolder() + "../../" + context.getInitParameter("ENC_CONFIGDIR") + "/" + fileType);
				p.load(input);
				
				String acceptedFileTypes = p.getProperty("fileType");
				Spit.out("Accepted file types : " + fileType);
				Spit.out("Accepted file types : " + acceptedFileTypes);
				
				
          		while(iterator.hasNext())
          		{
            		fitem = (FileItem)iterator.next();
            		String fldName = fitem.getFieldName();
            		ExilityFileItemsList.add(fldName);
            		
            		Spit.out("Field names : " + fldName);
            		
            		Spit.out("fitem.isFormField() : " + fitem.isFormField());
            		
          			if(!fitem.isFormField())
          			{
  						// Feb 05 2011 : Bug 2045 - Fix file upload action for Safari browser - Exility App : Aravinda
                    	String fileName = getServletContext().getRealPath("/") + AP.filePath + "/";
          				Spit.out("fitem.getName() : " + fitem.getName());
            			StringBuffer s2 = new StringBuffer(fitem.getName()); 
          				if(s2 != null && s2.length() > 0)
          				{
  							// Feb 05 2011 : Bug 2045 - Fix file upload action for Safari browser - Exility App (Start) : Aravinda
							/*
    						int separatorPos = s2.lastIndexOf("\\");
    						int separatorExtnPos = s2.lastIndexOf(".");
          					if(separatorPos > 0)
                				fileName = fileName + s2.substring(separatorPos+1,separatorExtnPos) + "__" + sessionId + "." + s2.substring(separatorExtnPos+1,s2.length()); // Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility: Venkat
          					else
                				fileName += s2.substring(0,separatorExtnPos) + "__" + sessionId + "." + s2.substring(separatorExtnPos+1,s2.length());     // Sep 03 2010 : Bug 1516 - File upload is not working correctly. - Nirmanith : Aravinda 
							*/
							fileName += s2;
  							// Feb 05 2011 : Bug 2045 - Fix file upload action for Safari browser - Exility App (End) : Aravinda
							File fl = new File(fileName);
							fitem.write(fl);
							
							actualFileName = fl.getName();
							Spit.out("Absolute file path  : '" + fl.getAbsolutePath() + "'" );
							
							Spit.out("Actual file Name : '" + actualFileName  + "'" );
							
					    	// validate file type : Guru
					    	TikaConfig tcConfig = TikaConfig.getDefaultConfig();
					    	Detector detector = tcConfig.getDetector();

					    	tikaIS = TikaInputStream.get(fl); 
					    	final Metadata metadata = new Metadata(); 
					    	String mimeType = detector.detect(tikaIS, metadata).toString();
					    	Spit.out("file mimeType : '" + mimeType + "'" );
					    	
					    	if(!acceptedFileTypes.contains(mimeType)){
					    		uploadedFileTypes = uploadedFileTypes + comma + mimeType;
					    		flag = false;
					    		comma = ",";
					    	}
							
							// validate file type : Guru
							
							fnameArr[fileCount][0] = fileName;
							fnameArr[fileCount][1] = actualFileName;
							fileCount++;
			            	
							//request.getSession().setAttribute(fldName + "__ExilityFilePath", fileName); // Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility: Venkat
          				}
          			}
          			//Oct 12 2009 : Bug 672 - Upload file ASPX and JSP issue - Exility (Start) : Aravinda
          			else
          			{
          				if(fldName.equals("baseHTMLFolderName"))
          				{
          					urlString = fitem.getString("UTF-8");	// May 3 2011 : Change to support utf 8 char in multi-part form data - Exility App : Aravinda
          				}
          				// Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility (Start): Venkat
          				else if(fldName.equals("dc"))
          				{
          					request.getSession().setAttribute("dc", fitem.getString("UTF-8")); 	// May 3 2011 : Change to support utf 8 char in multi-part form data - Exility App : Aravinda
          				}
          				else if(fldName.startsWith("REMARK"))
          				{
          					fnameArr[remarkCount][2]= fitem.getString("UTF-8");
          					remarkCount++;
          				}
          				// Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility (End): Venkat
          			}
          			//Oct 12 2009 : Bug 672 - Upload file ASPX and JSP issue - Exility (End) : Aravinda
          		}

				request.getSession().setAttribute("ExilityFileItemsList", ExilityFileItemsList); // Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility: Venkat
     		}//end of if
     		else
			{
            	out.println("Not a Multipart request");
     		}
			
        	
			//request.getSession().setAttribute("ExilityFileGrid", filesGrid); // Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility: Venkat
			
			//Oct 12 2009 : Bug 672 - Upload file ASPX and JSP issue - Exility (Start) : Aravinda
     		urlStringPath = "var urlString = " + "'" + homepage.substring(homepage.indexOf(urlString) + urlString.length(), homepage.length()) + "'";
  			//Oct 12 2009 : Bug 672 - Upload file ASPX and JSP issue - Exility (End) : Aravinda
	        //HtmlRequestHandler htmlRequestHandler = HtmlRequestHandler.getHandler();
	        //ServiceData data = htmlRequestHandler.processRequest(request, response, true, true); // Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility: Venkat
	        
	        if(flag == true){  // If all the files are valid files.
	        	ServiceData outData = new ServiceData();
	            HtmlRequestHandler htmlRequestHandler = HtmlRequestHandler.getHandler();
	            ServiceData inData = htmlRequestHandler.createInData(request, true, true, outData);
	            
	            inData.addGrid("exilityFilePathGrid",fnameArr);
	            
	            ServiceCleanserInterface serviceCleanser = ServiceCleansers.getCleanser(AP.cleanserName);
				serviceCleanser.cleanseBeforeService(request, inData);
		    					
	            ServiceAgent agent = ServiceAgent.getAgent();
	            agent.serve(inData.getValue("serviceId"), inData.getValue("userID"), inData, outData);
		            
		        StringBuilder sbf = new StringBuilder("var dc = ");
		        JsUtil.toJson(sbf, inData);
		        scriptToOutput = sbf.toString();
	        }
	        else{
	        	scriptToOutput = "alert('" + uploadedFileTypes + ": is not a valid mime type');";
	        }
	        
	    }
	    catch (Exception ex)
	    {
	        scriptToOutput = "alert('Error on the server : " + ex.getMessage().replace("'", "") + "');";
	        scriptToOutput = scriptToOutput.replace("\r", "\\r").replace("\n", "\\n"); // Nov 16 2009 : Bug 776 - exception handling in upload action - Exility: Venkat
	    }
	}
%> 
<html>
    <head>
        <script type="text/javascript" src="../Exility2.0/exilityLoader.js"></script>
        <script type="text/javascript" src="../Exility2.0/utils.js"></script>
    </head>
    <body onload="UploadFileReturned(urlString);">
        <script type="text/javascript" language="javascript">
            <%= urlStringPath %>
            <%= scriptToOutput %>
         </script>
    </body>
</html>




