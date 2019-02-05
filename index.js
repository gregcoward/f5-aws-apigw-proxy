var f5 = require('f5-nodejs');
var AWS = require('aws-sdk');
var apigClientFactory = require('aws-api-gateway-client').default;
var http = require('http');

var ilx = new f5.ILXServer();

ilx.addMethod('apigw_proxy_call', function(req, res){

  /*
   Construct call fo temporary credentials The endpoint correspond to the role
   attached to the BIG-IP instance.  The name of the role must be f5ApiProxyRole
   or modified below.  The role must include the AmazonAPIGatewayInvokeFullAccess
   permission - see below json

   {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "execute-api:Invoke",
                "execute-api:ManageConnections"
            ],
            "Resource": "arn:aws:execute-api:*:*:*"
        }
    ]
   }
*/
  const http_opts = {
      host: '169.254.169.254',
      path: '/latest/meta-data/iam/security-credentials/f5ApiProxyRole',
      method: 'GET'
  };

  callback = function (response) {
      const buffer = [];
      response.on('data', (data) => {
          buffer.push(data.toString('utf8'));
      });
      response.on('end', function () {
          const data = buffer.join('');
          if( response.statusCode >= 400 ) {
              console.log('ERROR: Non 200 status code recievd when fetching credentials.  Verify if appropriate IAM role "f5ApiProxyRole" has been attached to the BIGIP instance - https://aws.amazon.com/blogs/security/easily-replace-or-attach-an-iam-role-to-an-existing-ec2-instance-by-using-the-ec2-console/');
              console.log(data);
              return;
          }
          retJson = JSON.parse(data);

          // Capture credentials retrieved call
          tmpaccessKey = retJson.AccessKeyId;
          tmpsecretKey = retJson.SecretAccessKey;
          tmpsessionToken = retJson.Token;
          var pathParams = {};
          // Template syntax follows url-template https://www.npmjs.com/package/url-template
          var pathTemplate = '';
          var method = 'POST';
          var additionalParams = {};
          var body = JSON.parse(req.params()[1]);
          var apiUri = req.params()[0];
          var apiUrl = 'https://' + apiUri;
          var apiSlice = apiUri.indexOf("/");

          //extract region from url
          var startRg = apiUri.indexOf("execute-api.") + 12;
          var endRg = apiUri.indexOf(".amazonaws.com");
          var apiRegion = apiUri.substring(startRg, endRg);

          // Use returned temporary creds for api call
          var apigClient = apigClientFactory.newClient({
              invokeUrl: apiUrl, // REQUIRED
              accessKey: tmpaccessKey, // REQUIRED
              secretKey: tmpsecretKey, // REQUIRED
              sessionToken: tmpsessionToken, //REQUIRED
              region: apiRegion, // REQUIRED: The region where the API is deployed.
          });

          //Invoke API using apigClientFactory and role temporary creds
          response = apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
              .then(function (result) {
                  res.reply("success");
              }).catch(function (result) {
                  res.reply("fail");
              });
      });
      response.on('error', (err) => {
        res.reply("fail");
      });
  };
  http.request(http_opts, callback).end();
});

ilx.listen();
