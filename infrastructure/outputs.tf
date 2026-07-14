output "site_bucket" { value = aws_s3_bucket.frontend.bucket }
output "cloudfront_domain" { value = aws_cloudfront_distribution.cdn.domain_name }
# output "api_endpoint" { value = aws_apigatewayv2_stage.stage.invoke_url }
