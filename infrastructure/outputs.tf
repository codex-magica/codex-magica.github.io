output "site_bucket" { value = aws_s3_bucket.frontend.bucket }
output "cloudfront_domain" { value = aws_cloudfront_distribution.cdn.domain_name }
# output "api_endpoint" { value = aws_apigatewayv2_stage.stage.invoke_url }
output "cognito_user_pool_id" { value = aws_cognito_user_pool.main.id }
output "cognito_client_id" { value = aws_cognito_user_pool_client.web.id }
output "cognito_hosted_ui" { value = "https://${aws_cognito_user_pool_domain.domain.domain}.auth.${var.aws_region}.amazoncognito.com/login" }
