<%@page import="org.apache.commons.fileupload.*,org.apache.commons.fileupload.disk.*,org.apache.commons.fileupload.servlet.*,java.util.*,java.io.*"%>
<%@page import="com.exilant.exility.core.*, java.net.*"%>
<%
	String scriptToOutput = "";
	if (AP.projectName == null)
	    scriptToOutput = "alert('Your application is not set properly. Change your web.config to set the resource folder properly.');";
	else
	{
	    try
	    {
			// Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility (Start): Venkat
			FileItemFactory factory = new DiskFileItemFactory();
			ServletFileUpload upload = new ServletFileUpload(factory);
			boolean isMultipart = ServletFileUpload.isMultipartContent(request);
			List items = null; 
			
            if(isMultipart)
            {
            	FileItem fitem = null;     
            	items = upload.parseRequest(request); 
            	Iterator iterator = items.iterator();
          		while(iterator.hasNext())
          		{
            		fitem = (FileItem)iterator.next();
            		String fldName = fitem.getFieldName();
          			if(fitem.isFormField() && fldName.equals("dc"))
          			{
          				request.getSession().setAttribute("dc", fitem.getString());
          			}
          		}
          		request.getSession().setAttribute("ExilityFileItemsList", items);
     		}
     		else
			{
            	out.println("Not a Multipart request");
     		}
     		
     		request.getSession().setAttribute("ExilityIsMultipart", isMultipart);
     		// Oct 29 2009 : Bug 747 - While uploading check for already existing file - Exility (End): Venkat
			
	        HtmlRequestHandler htmlRequestHandler = HtmlRequestHandler.getHandler();
	        ServiceData data = htmlRequestHandler.processRequest(request, response, true, true);
	        DataCollection dc = new DataCollection();
	        dc.copyFrom(data);
	        if (dc.hasError())
	        {
	            scriptToOutput = dc.getErrorMessage();
	        }
	        else
	        {
            	String fileName = ((dc.getTextValue("reportName","") != "") ? dc.getTextValue("reportName","") : dc.getTextValue("serviceId",""));
            	fileName = fileName.replaceAll(" ","_");
            	response.setContentType("application/vnd.ms-excel");
            	response.addHeader("Content-Disposition", "attachment;filename=" + fileName);
	    		OutputStream outs = response.getOutputStream();
	            outs.write("<html xmlns = \"http://www.w3.org/1999/xhtml\">".getBytes());
	            outs.write("<head>".getBytes());
	            outs.write("<style>".getBytes());
	            outs.write("table { border-collapse: collapse; } ".getBytes());
	            outs.write("table th.mainHeader { background-color: #000099; border-color:     #000000; font-weight:      bold; color:            #FFFFFF; margin-top:       10px; line-height:      25px; font-size:        10px; } ".getBytes());
	            outs.write("table th { background-color: #6687C4; border-color:     #000000; color:            #FFFFFF; margin-top:       7px; line-height:      20px; font-weight:      bold; font-size:        10pt; } ".getBytes());
	            outs.write("table td.color1 { background-color: #FFFFFF; border-color:     #A2C2E8; color:            #000000; font-weight:      normal; font-size:        10pt; } ".getBytes());
	            outs.write("table td.color2 { background-color: #FFFFFF; border-color:     #A2C2E8; color:            #000000; font-weight:      bold; font-size:        10pt; } ".getBytes());
	            outs.write("</style>".getBytes());
	            outs.write("</head>".getBytes());
	            outs.write("<body>".getBytes());
	            outs.write("<br>".getBytes());
	            outs.write("<table cellspacing = \"0\" cellpadding = \"2\" border = \"1\">".getBytes());
	            for (String fieldName : dc.getFieldNames())
	            {
	            	outs.write("<tr>".getBytes());
	            	outs.write(new String("<td class=\"color2\" colspan=\"1\">" + fieldName + "</td>").getBytes());
	            	outs.write(new String("<td class=\"color2\" colspan=\"1\">" + dc.getValue(fieldName).toString() + "</td>").getBytes());
	            	outs.write("</tr>".getBytes());
	            }
	            outs.write("</table>".getBytes());
	            outs.write("<br>".getBytes());
	            for (String gridName : dc.getGridNames())
	            {
	            	outs.write("<br>".getBytes());
	                String[][] reportGrid = dc.getGrid(gridName).getRawData();
	                outs.write("<table cellspacing = \"0\" cellpadding = \"2\" border = \"1\">".getBytes());
	                outs.write(new String("<tr><th colspan=\"" + reportGrid[0].length + "\" align=\"center\">" + gridName + "</th></tr>").getBytes());
	                outs.write("<tr>".getBytes());
	                for (int i = 0; i < reportGrid[0].length; i++)
	                {
	                	outs.write("<th colspan = \"1\">".getBytes());
	                	outs.write(reportGrid[0][i].getBytes());
	                	outs.write("</th>".getBytes());
	                }
	                outs.write("</tr>".getBytes());
	                int p = 0;
	                for (int j = 1; j < reportGrid.length; j++)
	                {
	                	outs.write("<tr>".getBytes());
	                    for (int k = 0; k < reportGrid[0].length; k++)
	                    {
	                    	outs.write("<td class = \"color1\" colspan = \"1\">".getBytes());
	                    	outs.write(reportGrid[j][k].getBytes());
	                    	outs.write("</td>".getBytes());
	                    }
	                    outs.write("</tr>".getBytes());
	                }
	                outs.write("</table>".getBytes());
	            }
	            outs.write("</body>".getBytes());
	            outs.write("</html>".getBytes());
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
