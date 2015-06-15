<%@ page session="true" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@page import="java.io.*, sun.misc.*"%>
<%
    response.setContentType("image/png");
    response.setCharacterEncoding("UTF-8");
    response.setHeader("Content-Disposition", "attachment;filename=chart.png");
 	OutputStream outs = response.getOutputStream();
	String data = request.getParameter("data");
	BASE64Decoder decoder = new BASE64Decoder();
	byte[] bytes = decoder.decodeBuffer(data);
 	outs.write(bytes);
 	outs.flush();
 	outs.close();
%> 



