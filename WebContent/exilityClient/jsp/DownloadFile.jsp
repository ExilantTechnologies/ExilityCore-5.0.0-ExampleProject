<%@ page session="true" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@page import="java.util.*,java.io.*"%>
<%@page import="com.exilant.exility.core.*, java.net.* "%>
<%
	String scriptToOutput = "";
	System.out.println("Starting to send file to client");
	if (AP.projectName == null)
	    scriptToOutput = "alert('Your application is not set properly. Change your web.config to set the resource folder properly.');";
	else
	{
	    try
	    {
	        HtmlRequestHandler htmlRequestHandler = HtmlRequestHandler.getHandler();
	        ServiceData data = htmlRequestHandler.processRequest(request, response, false, false);
	        DataCollection dc = new DataCollection();
	        dc.copyFrom(data);
        
	        if (dc.hasError())
	        {
	            scriptToOutput = dc.getErrorMessage();
	        }
	        else
	        {
	            String contentType = dc.getTextValue("download_fileType", "text/html");
	            String contentName = dc.getTextValue("download_fileName", "error.htm");
	            String encdownloadPath = dc.getTextValue("download_filePath", "");
	            response.setContentType("application/octet-stream");
	            response.setCharacterEncoding("UTF-8");	// May 3 2011 : Change to support utf 8 char in multi-part form data - Exility App : Aravinda
	            String fileName = new String(contentName.getBytes("UTF8"),"ISO8859_15");
	            response.setHeader("Content-Disposition", "attachment;filename=" + contentName );
	            
	            FileInputStream sourceFile = new FileInputStream(encdownloadPath + "/" + fileName);
				int fileSize = sourceFile.available();	            
	            byte[] getContent = new byte[fileSize];
	            sourceFile.read(getContent, 0, fileSize);
	            sourceFile.close();
	    		OutputStream outs = response.getOutputStream();
	    		outs.write(getContent);
	    		outs.flush();
	    		outs.close();
	        }
	    }
	    catch (Exception ex)
	    {
	        scriptToOutput = "alert('Error on the server : " + ex.getMessage().replace("'", "") + "');";
	    }
	}
%> 
<%= scriptToOutput %>




