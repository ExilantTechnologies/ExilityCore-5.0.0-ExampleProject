//called onload
var serviceId, userFieldName, pwdFieldName
function setServiceId()
{
    serviceId = P2.getFieldValue('serviceId');
    userFieldName = P2.getFieldValue('userFieldName');
    pwdFieldName = P2.getFieldValue('pwdFieldName');
    if (serviceId == 'internal.dummyLogin')
    {
        serverStub.getResponse(serviceId, null);
        alert('No login required for this project.');
        P2.act(null, null, 'close');
    }
}

function login()
{
    var dc = new PM.DataCollection();
    if(!P2.validate())
        return;
    dc.addValue(userFieldName, P2.getFieldValue('userId'));
    dc.addValue(pwdFieldName, P2.getFieldValue('pwd'));
    dc = serverStub.getResponse(serviceId, dc);
    if (!dc.success)
        return;

    var stub = PM.currentActiveWindow && PM.currentActiveWindow.serverStub;
    if (stub)
        stub.resendServices();
    //we are a pop-up. we have to just close.
}
