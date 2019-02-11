// index.js
var f5 = require('f5-nodejs');
var http = require('http');
var AWS = require('aws-sdk');
var apigClientFactory = require('aws-api-gateway-client').default;

var ilx = new f5.ILXServer();

ilx.addMethod('apigw_proxy_call', function(req, res){
    var body = JSON.parse(req.params()[1]);  //'{"here": "I am"}';//
    var apiUri = req.params()[0];  //'glc-hello-sns'; //
    var mthd = req.params()[2];  //'POST'; //
    console.log('starting nodejs');
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
            if (response.statusCode >= 400) {
                console.log('ERROR: Non 200 status code recievd when fetching credentials.  Verify if appropriate IAM role "f5ApiProxyRole" has been attached to the BIGIP instance - https://aws.amazon.com/blogs/security/easily-replace-or-attach-an-iam-role-to-an-existing-ec2-instance-by-using-the-ec2-console/');
                console.log(data);
                return;
            }

            retJson = JSON.parse(data);
            AWS.config = new AWS.Config();
            var accessKeyId = retJson.AccessKeyId;
            var secretAccessKey = retJson.SecretAccessKey;
            var sessionToken = retJson.Token;
            var defRegion = "us-east-1";
            AWS.config.update({ accessKeyId: accessKeyId, secretAccessKey: secretAccessKey, sessionToken: sessionToken, region: defRegion });

            // Determine whether API or lambda function call based on URI presented
            console.log('Calling subroutine');
            var foundApi = apiUri.includes('execute-api.');
            if(foundApi){
            // apicall
              console.log("apicaller started");
              var pathParams = {};
              // Template syntax follows url-template https://www.npmjs.com/package/url-template
              var pathTemplate = '';
              var method = mthd;
              var additionalParams = {};
              var apiUrl = 'https://' + apiUri;
              var apiSlice = apiUri.indexOf("/");

              //extract region from url
              var startRg = apiUri.indexOf("execute-api.") + 12;
              var endRg = apiUri.indexOf(".amazonaws.com");
              var apiRegion = apiUri.substring(startRg, endRg);

              // Use returned temporary creds for api call
              var apigClient = apigClientFactory.newClient({
                  invokeUrl: apiUrl, // REQUIRED
                  accessKey: accessKeyId, // REQUIRED
                  secretKey: secretAccessKey, // REQUIRED
                  sessionToken: sessionToken, //REQUIRED
                  region: apiRegion, // REQUIRED: The region where the API is deployed.
              });

              //Invoke API using apigClientFactory and role temporary creds
              apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
                  .then(function (result) {
                    res.reply(JSON.stringify(result.data));
                  }).catch(function (result) {
                      return "fail";
                  });
            } else {

              // Defaulting to Lambda function Call
              lambdaBody = JSON.stringify(body);
              var lambda = new AWS.Lambda();
              var params = {
                  FunctionName: apiUri,   // required
                  Payload: lambdaBody
                };

                lambda.invoke(params, function (err, data) {
                  if (err) res.reply(data.FunctionError);
                  else     res.reply(data.Payload);
                });
              }
        });
        response.on('error', (err) => {
            console.log("Error on index.js", err);
            res.reply("fail");
        });
    };
    http.request(http_opts, callback).end();
});

ilx.listen();
