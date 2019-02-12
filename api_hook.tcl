when HTTP_REQUEST {
    ## Capture path
    set orig_path [string trimleft [HTTP::path] "/"]
    log local0.info "Starting the process..with path of:  $orig_path"
    set mthd [HTTP::method]
    ## Trigger the collection for up to 1MB of data
    set content_length 1000
    HTTP::collect $content_length
    #log local0.info "Here is the content length:  $content_length"
}

when HTTP_REQUEST_DATA {
    ## Do stuff with the payload
    set payload [HTTP::payload]

    ### check if URI presented is in DG. If so pass path to proxy
    if { [class match [string tolower $orig_path] contains aws-apis]}{
        set apiUrl [class match -value [string tolower $orig_path] contains aws-apis]

        ## Initialize plugin and call proxy
        log local0.info "Sending to nodejs:  $apiUrl"
        set RPC_HANDLE [ILX::init f5_aws_apigw_proxy aws_apigw_proxy]

        if {[catch {ILX::call $RPC_HANDLE "apigw_proxy_call" $apiUrl $payload $mthd} result]} {
           log local0.error  "Client - [IP::client_addr], ILX failure: $result"
           HTTP::respond 500 content "Unable to proxy call, verify AWS API endpoint in registered in the aws-apis datagroup and verify if appropriate IAM role 'f5ApiProxyRole' has been attached to the BIGIP instance - https://aws.amazon.com/blogs/security/easily-replace-or-attach-an-iam-role-to-an-existing-ec2-instance-by-using-the-ec2-console/"
           return
        }
        ## return proxy result
        if { $result eq "failed" }{
            HTTP::respond 400 content '{"error":"Failed to call API or function"}'  "Content-Type" "application/json"
        } else {
            HTTP::respond 200 content $result  "Content-Type" "application/json"
        }

    } else {
        ## Not a legitimate URI
        #log local0.info "Failure: No matching API found"
        HTTP::respond 404 content "Requested API not found at this location"
    }
}
