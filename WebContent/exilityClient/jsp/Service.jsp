<%@page language = "java" import = "com.exilant.exility.core.*"%><%
	response.setHeader("Cache-Control", "no-store");
	String scriptToOutput = "";
	ServiceData data = new ServiceData();
    if (AP.projectName == null)
	{
		String txt = "Your application is not set properly. Change your web.config to set the resource folder properly.";
		data.addMessage("exilError", txt);
		Spit.out(txt);
	}
    else
    {
        try
        {
            HtmlRequestHandler htmlRequestHandler = HtmlRequestHandler.getHandler();
            data = htmlRequestHandler.processRequest(request, response, false, true);
        }
        catch (Exception ex)
        {
            String txt = "Error on the server : " + ex.getMessage();
			ex.printStackTrace();
            Spit.out(txt);
			data.addMessage("exilError", txt);
        }
    }
	//StringBuilder sbf = new StringBuilder("var dc = ");
	//JsUtil.toJson(sbf, data);
	//scriptToOutput = sbf.toString();
    scriptToOutput = data.toSerializedData();
%><%= scriptToOutput %>
