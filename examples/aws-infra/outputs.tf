output "site_bucket" { value = aws_s3_bucket.frontend.bucket }
output "cloudfront_domain" { value = aws_cloudfront_distribution.cdn.domain_name }
output "github_connection_status" {
  description = "PENDING until approved in the AWS console (see pipeline.tf)"
  value       = aws_codeconnections_connection.github.connection_status
}
