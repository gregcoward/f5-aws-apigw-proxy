# The f5_aws_apigw_proxy iRules LX implementation of an AWS API Gateway Proxy

1. Import workspace from .tgz file
 
2. Create LX plugin from imported workspace   -  //Note: must be named 'f5_aws_apigw_proxy'
	
	TMSH command example: tmsh create ilx plugin f5_aws_apigw_proxy from-workspace f5_aws_apigw_proxy  //Note: must be named 'f5_aws_apigw_proxy'


3. Create and populate the data-group  //Note: must be named 'aws-apis'
	
	TMSH command example: tmsh create ltm data-group internal aws-apis type string records add { api1 { data jbfipbsqfa.execute-api.us-east-1.amazonaws.com/default/serverlessrepo-glc-publisher-LambdaPublisher-WFCGIBYB9AHI }}

	
<embed src="images/installapigw.mp4" autostart="false" height="30" width="144" />