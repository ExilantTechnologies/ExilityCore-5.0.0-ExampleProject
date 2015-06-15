	<%@page language = "java" import = "com.exilant.exility.core.*"%> 
<%@ page import="datasource.*" %>
<%@ page import="net.sf.jasperreports.engine.*" %>
<%@ page import="net.sf.jasperreports.engine.util.*" %>
<%@ page import="net.sf.jasperreports.engine.export.*" %>
<%@ page import="net.sf.jasperreports.j2ee.servlets.*" %>
<%@ page import="net.sf.jasperreports.engine.data.*" %>
<%@ page import="java.util.*" %>
<%@ page import="java.io.*" %>
<%
		String scriptToOutput = "";
		ReportParameters rp = new ReportParameters();
	    if (AP.projectName == null)
	        scriptToOutput = "alert('Your application is not set properly. Change your web.config to set the resource folder properly.');";
	    else
	    {
	        try
	        {
	        	ServiceData outData = new ServiceData();
	            HtmlRequestHandler htmlRequestHandler = HtmlRequestHandler.getHandler();
	            ServiceData inData = htmlRequestHandler.createInData(request, true, true, outData);
	            if (inData == null)
	            {
	            	scriptToOutput = "Authentication Failed: You are either not logged-in, or you are not authorized to see this report";
	            	Spit.out(scriptToOutput);
	            	System.out.println(scriptToOutput);
	            }
	            else
	            {
	                String reportName = inData.getValue("reportName");
	                if (reportName == null)
	                {
	                	scriptToOutput = "Design Error : Report Name not sent from Client";
	                	Spit.out(scriptToOutput);
	            		System.out.println(scriptToOutput);
	                }
	                else
	                {
	                    rp = Reports.getReport(reportName);
	                    if (rp == null)
	                    {
	                    	scriptToOutput = "Design Error : Report " + reportName + " Not defined";
	                    	Spit.out(scriptToOutput);
	            			System.out.println(scriptToOutput);
	                    }
	                    else
	                    {
	                        ServerAgent agent = ServerAgent.getAgent();
	                        DataCollection dc = agent.serve(rp.serviceName, inData.getValue("userID"), inData);
	                        if (dc.hasError())
	                        {
	                            String msg = dc.getErrorMessage();
	                            scriptToOutput = "ERROR:<br />" + msg;
	                        	Spit.out(scriptToOutput);
	            				System.out.println(scriptToOutput);
	                        }
	                        else
	                        {
								String reportFileName = application.getRealPath("/" + reportName.replaceAll("\\.", "/") + ".jasper");
								reportFileName = reportFileName.replace("\\","/");
								File reportFile = new File(reportFileName);
								if (!reportFile.exists())
								{
	                    			scriptToOutput = "Design Error : Report " + reportFileName + " not found.";
	                    			Spit.out(scriptToOutput);
	            					System.out.println(scriptToOutput);
								}
								else
								{
									scriptToOutput = reportName;
	                        		HashMap reportParametersMap = new HashMap();
	                        		for(String key : dc.values.keySet())
	                        		{
	                        			if(dc.getValueType(key).equals(DataValueType.TEXT))
	                        			{
	                        				String textValue = dc.getTextValue(key, "");
	                        				String formattedValue = textValue.replaceAll("</li>", "</li>&nbsp;");
	                        				reportParametersMap.put(key, formattedValue);
	                        			}
	                        			else if(dc.getValueType(key).equals(DataValueType.INTEGRAL))
	                        				reportParametersMap.put(key, dc.getIntegralValue(key, 0));
	                        			else if(dc.getValueType(key).equals(DataValueType.DECIMAL))
	                        				reportParametersMap.put(key, dc.getDecimalValue(key, 0.0));
	                        			else if(dc.getValueType(key).equals(DataValueType.DATE))
	                        				reportParametersMap.put(key, dc.getDateValue(key, new Date()));
	                        			else if(dc.getValueType(key).equals(DataValueType.TIMESTAMP))
	                        				reportParametersMap.put(key, dc.getDateValue(key, new Date()));
	                        			else if(dc.getValueType(key).equals(DataValueType.BOOLEAN))
	                        				reportParametersMap.put(key, dc.getBooleanValue(key, false));
	                        			else
	                        			{
	                        				String textValue = dc.getTextValue(key, "");
	                        				String formattedValue = textValue.replaceAll("</li>", "</li>&nbsp;");
	                        				reportParametersMap.put(key, formattedValue);
	                        			}
	                        		}
		                        	
	                        		JRDataSource mainReportData = null;
	                        		for(String key : dc.grids.keySet())
	                        		{
	                        			Grid curGrid = dc.getGrid(key);
	                        			List dataList = new ArrayList();
	                        			String[][] gridData = curGrid.getRawData();
	                        			
	                        			System.out.println("Grid Name : '" + key + "'");
		                        		
	                        			
	                        			
	                        			for(int rowCtr = 1; rowCtr < gridData.length; rowCtr++)
	                        			{
	                        				System.out.println("Row Ctr : '" + rowCtr + "'");
	                        				HashMap curValues = new HashMap();
	                        				for(int colCtr = 0; colCtr < gridData[0].length; colCtr++)
	                        				{
	                        					System.out.println("Col Ctr : '" + colCtr + "'");
	                        					String curColumnName = curGrid.getColumnNames()[colCtr];
	                        					DataValueType curDataValueType = curGrid.getColumn(curColumnName).getValueType();
	                        					System.out.println("Data Value Type : '" + curDataValueType + "'");
	                        					System.out.println("Data Value  : '" + gridData[rowCtr][colCtr] + "'");
		                        				
	    	                        			if(curDataValueType.equals(DataValueType.TEXT))
	                        					{
	                        						String textValue = gridData[rowCtr][colCtr];
	                        						String formattedValue = textValue.replaceAll("</li>", "</li>&nbsp;");
	    	                        				curValues.put(curColumnName, formattedValue);
	                        					}
	    	                        			else if(curDataValueType.equals(DataValueType.INTEGRAL))
	    	                        				curValues.put(curColumnName, Long.parseLong(gridData[rowCtr][colCtr]));
	    	                        			else if(curDataValueType.equals(DataValueType.DECIMAL))
	    	                        				curValues.put(curColumnName, Float.parseFloat(gridData[rowCtr][colCtr]));
	    	                        			else if(curDataValueType.equals(DataValueType.DATE))
	    	                        				curValues.put(curColumnName, DateUtility.parseDate(gridData[rowCtr][colCtr]));
	    	                        			else if(curDataValueType.equals(DataValueType.TIMESTAMP))
	    	                        				curValues.put(curColumnName, DateUtility.parseDateTime(gridData[rowCtr][colCtr]));
	    	                        			else if(curDataValueType.equals(DataValueType.BOOLEAN))
	    	                        				curValues.put(curColumnName, Boolean.parseBoolean(gridData[rowCtr][colCtr]));
	    	                        			else
	                        					{
	                        						String textValue = gridData[rowCtr][colCtr];
	                        						String formattedValue = textValue.replaceAll("</li>", "</li>&nbsp;");
	    	                        				curValues.put(curColumnName, formattedValue);
	                        					}
	                        				}
	                        				dataList.add(curValues);
	                        			}
	                        			if(key.equals(reportName))
	                        			{
	                        				System.out.println("1");
	                        				mainReportData = new JRMapCollectionDataSource(dataList);
	                        			}
	                        			else
	                        			{
	                        				System.out.println("2");
	                        				JRMapCollectionDataSource curDS = new JRMapCollectionDataSource(dataList);
	                        				reportParametersMap.put(key, curDS);
	                        			}
	                        		}
	                        		
	                        		if(mainReportData == null)
	                        		{
	                        			System.out.println("3");
	                        			List dataList = new ArrayList();
	                        			HashMap curValues = new HashMap();
	                        			curValues.put("dummykey", "dummyvalue");
	                        			dataList.add(curValues);
	                        			mainReportData = new JRMapCollectionDataSource(dataList);
	                        		}
	                        		
	                        		Map parameters = new HashMap();
	                        		System.out.println("4");
									parameters.put("exilParamCollection", reportParametersMap);
									System.out.println("5");
	                    			JasperReport jasperReport = (JasperReport)JRLoader.loadObject(reportFileName);
	                    			System.out.println("6");
	                    			System.out.println("Jasper Report is loaded");
	                    			System.out.println("7");
	                    			System.out.println(reportFileName);
	                    			System.out.println(parameters);
	                    			System.out.println(mainReportData);
	                    			System.out.println("7");
                    				JasperPrint jasperPrint = JasperFillManager.fillReport(reportFileName, parameters, mainReportData); 
	                    			System.out.println("Jasper Report fill is over");
                    				
                    				if(!rp.exportTo.equals("HTML"))
                    				{
										Cookie cookie = new Cookie ("fileDownloaded",reportName);
										cookie.setMaxAge(345 * 24 * 60 * 60);
										cookie.setPath(request.getContextPath());
										response.addCookie(cookie);
        							}

                    				JRExporter exporter = null;
                    				
                    				if(rp.exportTo.equals("HTML"))
                    				{
                    					exporter = new JRHtmlExporter();
                    					exporter.setParameter(JRHtmlExporterParameter.IMAGES_URI,"../images/spacer.gif");
										response.setContentType("text/html");
        							}
                    				else if(rp.exportTo.equals("EXCEL"))
                    				{
                    					exporter = new JRXlsExporter();
										if(dc.hasValue("SHOWREPORTBACKGROUND"))
										{
											exporter.setParameter(JRXlsExporterParameter.IS_WHITE_PAGE_BACKGROUND, Boolean.FALSE);
											exporter.setParameter(JRXlsExporterParameter.IS_REMOVE_EMPTY_SPACE_BETWEEN_ROWS, Boolean.TRUE);
			                                exporter.setParameter(JRXlsExporterParameter.IS_DETECT_CELL_TYPE, Boolean.TRUE);
			                                exporter.setParameter(JRXlsExporterParameter.IS_AUTO_DETECT_CELL_TYPE, Boolean.TRUE);											
	
										}
                    					response.setContentType("application/vnd.ms-excel");
                    						
        								if(dc.hasValue("REPORTFILENAME"))
        									response.addHeader("Content-Disposition", "attachment;filename=" + dc.getTextValue("REPORTFILENAME","") + ".xls");
        								else
        									response.addHeader("Content-Disposition", "attachment;filename=" + reportFileName.substring(reportFileName.lastIndexOf("/") + 1).replace(".jasper",".xls"));
        							}
                    				else if(rp.exportTo.equals("PDF"))
                    				{
                    					exporter = new JRPdfExporter();
										response.setContentType("application/pdf");
        								if(dc.hasValue("REPORTFILENAME"))
        									response.addHeader("Content-Disposition", "attachment;filename=" + dc.getTextValue("REPORTFILENAME","") + ".pdf");
        								else
        									response.addHeader("Content-Disposition", "attachment;filename=" + reportFileName.substring(reportFileName.lastIndexOf("/") + 1).replace(".jasper",".pdf"));
                    				}
									exporter.setParameter(JRExporterParameter.JASPER_PRINT, jasperPrint);
								
									OutputStream outStream = null;
									try {
										outStream = response.getOutputStream();
									} catch (Exception ex) {
									}	
									exporter.setParameter(JRExporterParameter.OUTPUT_STREAM, outStream);
									exporter.exportReport();
									outStream.close();
	                        		
								}
	                        }
	                    }
	                }
	            }
	        }
	        catch (Exception ex)
	        {
	            scriptToOutput = "alert('Error on the server : " + ex.getMessage().replace("'", "") + " stacktrace=" + ex.getStackTrace() + "');";
	            Spit.out(ex.getStackTrace());
	        	System.out.println(scriptToOutput);
	        	out.write(scriptToOutput);
	        }
	    }
%>
