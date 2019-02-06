# F5 AWS API Gateway Proxy iRules LX Plug-in

## Introduction

The f5_aws_apigw_proxy iRules LX plug-in is a BIG-IP iRules LX plugin for enables the BIG-IP to act as a many-to-one API proxy for AWS API Gateway requests.  The plug-in utilizes a data-group to perform 

For example:<br>,br>POST/api.f5demo.net/api  -- proxies to -- POST/jbfipbsqfa.execute-api.us-east-1.amazonaws.com/default/serverlessrepo-glc-publisher-LambdaPublisher-WFCGIBYB9AHI
                 <br><br>POST/api.f5demo.net/<b>ap2</B>  -- proxies to -- POST/jbfipbsqfa.execute-api.us-east-1.amazonaws.com/<b>default/serverlessrepo-glc-publisher-LambdaPublisher-WFCGIBYB9AHI</b>

This extension is community supported.

## Requirements

BIG-IP VE 13.1 or later running on EC2

## Docs

For installation and usage instructions, see the ./docs folder

## Building

This package works with icrdk, which can be found here: https://github.com/f5devcentral/f5-icontrollx-dev-kit

From the root directory, an invocation to `icrdk build` will place a built RPM inside the `./build` directory.

The package can be deployed like any other iControl LX extension, or upon configuring a local `devconfig.json`, the package can be deployed with `icrdk deploy`


















<HTML><title>F5 AWS API Gateway Proxy</title>
<body>
# The f5_aws_apigw_proxy iRules LX plugin 

1. Import workspace from .tgz file
 
2. Create LX plugin from imported workspace   -  //Note: must be named 'f5_aws_apigw_proxy'
	
	TMSH command example: tmsh create ilx plugin f5_aws_apigw_proxy from-workspace f5_aws_apigw_proxy  //Note: must be named 'f5_aws_apigw_proxy'


3. Create and populate the data-group  //Note: must be named 'aws-apis'
	
	TMSH command example: tmsh create ltm data-group internal aws-apis type string records add { api1 { data jbfipbsqfa.execute-api.us-east-1.amazonaws.com/default/serverlessrepo-glc-publisher-LambdaPublisher-WFCGIBYB9AHI }}

<embed src="images/installapigw.mp4" autostart="false" height="30" width="144" />
</body>	
</HTML>