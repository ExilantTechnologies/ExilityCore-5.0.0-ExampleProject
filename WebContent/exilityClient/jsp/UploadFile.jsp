<%@page session="true" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
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
			FileItemFactory factory = new DiskFileItemFactory();
			ServletFileUpload upload = new ServletFileUpload(factory);
			boolean isMultipart = ServletFileUpload.isMultipartContent(request);
			// Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility (Start): Venkat
			List ExilityFileItemsList =  new ArrayList();
			request.getSession().setAttribute("ExilityIsMultipart", isMultipart);
			// Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility (End): Venkat
			
			//Oct 12 2009 : Bug 672 - Upload file ASPX and JSP issue - Exility (Start) : Aravinda
     		String homepage = request.getHeader("referer");
  			//Oct 12 2009 : Bug 672 - Upload file ASPX and JSP issue - Exility (End) : Aravinda
			
           	String fnameArr[] = new String[2];      
            if(isMultipart)
            {
            	FileItem fitem = null;     
            	List items = upload.parseRequest(request); // Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility: Venkat
            	Iterator iterator = items.iterator();
          		while(iterator.hasNext())
          		{
            		fitem = (FileItem)iterator.next();
            		String fldName = fitem.getFieldName();
            		ExilityFileItemsList.add(fldName);
          			if(!fitem.isFormField())
          			{
                    	String fileName = AP.filePath;
            			StringBuffer s2 = new StringBuffer(fitem.getName()); 
          				if(s2 != null && s2.length() > 0)
          				{
    						int separatorPos = s2.lastIndexOf("\\");
    						int separatorExtnPos = s2.lastIndexOf(".");
          					if(separatorPos > 0)
                				fileName = fileName + s2.substring(separatorPos+1,separatorExtnPos) + "__" + sessionId + "." + s2.substring(separatorExtnPos+1,s2.length()); // Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility: Venkat
          					else
                				fileName += s2.substring(0,separatorExtnPos) + "__" + sessionId + "." + s2.substring(separatorExtnPos+1,s2.length());     // Sep 03 2010 : Bug 1516 - File upload is not working correctly. - Nirmanith : Aravinda 
							File fl = new File(fileName);
			            	fitem.write(fl);
			            	
							request.getSession().setAttribute(fldName + "__ExilityFilePath", fileName); // Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility: Venkat
          				}
          			}
          			//Oct 12 2009 : Bug 672 - Upload file ASPX and JSP issue - Exility (Start) : Aravinda
          			else
          			{
          				if(fldName.equals("baseHTMLFolderName"))
          				{
          					urlString = fitem.getString();
          				}
          				// Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility (Start): Venkat
          				else if(fldName.equals("dc"))
          				{
          					request.getSession().setAttribute("dc", fitem.getString()); 
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
     		
			//Oct 12 2009 : Bug 672 - Upload file ASPX and JSP issue - Exility (Start) : Aravinda
     		urlStringPath = "var urlString = " + "'" + homepage.substring(homepage.indexOf(urlString) + urlString.length(), homepage.length()) + "'";
  			//Oct 12 2009 : Bug 672 - Upload file ASPX and JSP issue - Exility (End) : Aravinda
	        HtmlRequestHandler htmlRequestHandler = HtmlRequestHandler.getHandler();
	        ServiceData data = htmlRequestHandler.processRequest(request, response, true, true); // Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility: Venkat
	        StringBuilder sbf = new StringBuilder("var dc = ");
	        JsUtil.toJson(sbf, data);
	        scriptToOutput = sbf.toString();
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
        <script type="text/javascript" src="../js/api/exilityLoader.js"></script>
        <script type="text/javascript" src="../Exility2.0/utils.js"></script>
    </head>
    <body onload="UploadFileReturned(urlString);">
        <script type="text/javascript" language="javascript">
            <%= urlStringPath %>
            <%= scriptToOutput %>
         </script>
    </body>
</html>




