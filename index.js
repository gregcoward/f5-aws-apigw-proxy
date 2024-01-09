// index.js
// Import required modules
var f5 = require('f5-nodejs');
var http = require('http');
var AWS = require('aws-sdk');
var apigClientFactory = require('aws-api-gateway-client').default;

// Create a new instance of F5 ILX server
var ilx = new f5.ILXServer();

// Add a method to handle API Gateway proxy calls
ilx.addMethod('apigw_proxy_call', function(req, res){
    // Parse request parameters
    var body = JSON.parse(req.params()[1]);  // Request body
    var apiUri = req.params()[0];  // API Gateway URI
    var mthd = req.params()[2];  // HTTP method (POST in this case)

    // Capture region from URI if provided, else use default of 'us-east-1'
    const localRegion = {
        host: '169.254.169.254',
        path: '/latest/dynamic/instance-identity/document',
        method: 'GET'
    };

    // Callback function to handle the response for region information
    callbackRegion = function (response2) {
        const bufferRegion = [];
        response2.on('data', (data2) => {
            bufferRegion.push(data2.toString('utf8'));
        });
        response2.on('end', function () {
            const data2 = bufferRegion.join('');

            // Handle errors for non-200 status codes
            if (response2.statusCode >= 400) {
                console.log('ERROR: Non 200 status code received when requesting instance region.  Will default to us-east-1');
                console.log(data2);
                return;
            }

            // Parse region information from the response
            retJson2 = JSON.parse(data2);
            console.log('here is query region:', retJson2.region);
            var defRegion = retJson2.region;
            var awsRegions = ["us-east-1","us-east-2","us-west-1","us-west-2","ca-central-1","eu-west-1","eu-central-1","eu-west-2","eu-west-3","ap-northeast-1","ap-northeast-2","ap-southeast-1","ap-southeast-2","ap-south-1","sa-east-1","us-gov-west-1"];
            var i = 0;
            var lambdaRegion = 'no';

            // Check if the API URI contains a specific AWS region
            while ( i < awsRegions.length ) {
                if (apiUri.includes(awsRegions[i])) {
                    defRegion = awsRegions[i];
                    lambdaRegion = 'yes';
                }
                i++;
            }

            // Derive Lambda function Name - default to us-east-1 if no region entered
            if (lambdaRegion == 'yes') {
                var regIndex = apiUri.indexOf(defRegion);
                var fxIndex = apiUri.indexOf("/", regIndex);
                lambdaName = apiUri.substring(fxIndex + 1);
            } else {
                lambdaName = apiUri;
            }

            // Define options for fetching IAM role credentials
            const http_opts = {
                host: '169.254.169.254',
                path: '/latest/meta-data/iam/security-credentials/f5ApiProxyRole',
                method: 'GET'
            };

            // Callback function to handle the response for IAM role credentials
            callback = function (response) {
                const buffer = [];
                response.on('data', (data) => {
                    buffer.push(data.toString('utf8'));
                });
                response.on('end', function () {
                    const data = buffer.join('');

                    // Handle errors for non-200 status codes
                    if (response.statusCode >= 400) {
                        console.log('ERROR: Non 200 status code received when fetching credentials.  Verify if appropriate IAM role "f5ApiProxyRole" has been attached to the BIGIP instance - https://aws.amazon.com/blogs/security/easily-replace-or-attach-an-iam-role-to-an-existing-ec2-instance-by-using-the-ec2-console/');
                        console.log(data);
                        return;
                    }

                    // Parse IAM role credentials from the response
                    retJson = JSON.parse(data);

                    // Configure AWS SDK with IAM role credentials and region
                    AWS.config = new AWS.Config();
                    var accessKeyId = retJson.AccessKeyId;
                    var secretAccessKey = retJson.SecretAccessKey;
                    var sessionToken = retJson.Token;
                    AWS.config.update({ accessKeyId: accessKeyId, secretAccessKey: secretAccessKey, sessionToken: sessionToken, region: defRegion });

                    // Determine whether API or lambda function call based on URI presented
                    console.log('Calling subroutine');
                    var foundApi = apiUri.includes('execute-api.');
                    if(foundApi){
                        // API Gateway call
                        console.log("apicaller started");
                        var pathParams = {};
                        var pathTemplate = '';
                        var method = mthd;
                        var additionalParams = {};
                        var apiUrl = 'https://' + apiUri;
                        var apiSlice = apiUri.indexOf("/");

                        // Use returned temporary creds for API call
                        var apigClient = apigClientFactory.newClient({
                            invokeUrl: apiUrl, // REQUIRED
                            accessKey: accessKeyId, // REQUIRED
                            secretKey: secretAccessKey, // REQUIRED
                            sessionToken: sessionToken, // REQUIRED
                            region: defRegion, // REQUIRED: The region where the API is deployed.
                        });

                        // Invoke API using apigClientFactory and role temporary creds
                        apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
                            .then(function (result) {
                                res.reply(JSON.stringify(result.data));
                            }).catch(function (result) {
                                return "failed";
                            });

                    } else {
                        // Defaulting to Lambda function Call
                        lambdaBody = JSON.stringify(body);
                        var lambda = new AWS.Lambda();
                        var params = {
                            FunctionName: lambdaName,   // required
                            Payload: lambdaBody
                        };

                        // Invoke Lambda function using AWS SDK
                        lambda.invoke(params, function (err, data) {
                            if (err) res.reply("failed");
                            else     res.reply(data.Payload);
                        });
                    }
                });
                response.on('error', (err) => {
                    console.log("Error on index.js", err);
                    res.reply("failed");
                });
            };
            http.request(http_opts, callback).end();
        });
        response2.on('error', (err) => {
            console.log("Error calling Region", err);
        });
    };
    http.request(localRegion, callbackRegion).end();
});

// Start listening for ILX events
ilx.listen();
