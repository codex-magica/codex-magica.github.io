
# CloudFront for HTTPS + CDN
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${local.name_prefix}-oac"
  description                       = "OAC for ${aws_s3_bucket.frontend.bucket}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}



# AWS-managed policies: cache on path only (the edge auth runs on every viewer request before the
# cache, so query strings and cookies never need to be part of the cache key), plus a standard set
# of security response headers (HSTS, nosniff, frame-options, referrer-policy).
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  comment             = "${local.name_prefix} frontend"
  default_root_object = "index.html"
  http_version        = "http2and3"
  is_ipv6_enabled     = true


  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "s3-origin"


    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }


  default_cache_behavior {
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]


    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id

    lambda_function_association {
      event_type   = "viewer-request"
      include_body = false
      lambda_arn   = aws_lambda_function.viewer_auth.qualified_arn
    }
  }


  price_class = "PriceClass_100"


  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  # The default *.cloudfront.net certificate. For a custom domain, use an ACM certificate in
  # us-east-1 and set minimum_protocol_version = "TLSv1.2_2021".
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# The edge function is a template: Lambda@Edge has no environment variables, so the email
# allowlist (var.allowed_emails) is rendered into the source at plan time. Changing the list
# therefore means a terraform apply (new function version + CloudFront propagation, ~5 min).
locals {
  edge_src = templatefile("${path.module}/cloudfront_edge.js", {
    allowed_emails_json = jsonencode([for e in var.allowed_emails : lower(e)])
    firebase_project_id = var.firebase_project_id
  })
  edge_hash = sha256(local.edge_src)
}

data "archive_file" "edge_zip" {
  type        = "zip"
  output_path = "${path.module}/build/cloudfront_edge-${local.edge_hash}.zip"

  source {
    content  = local.edge_src
    filename = "index.mjs"
  }
}

resource "aws_lambda_function" "viewer_auth" {
  provider         = aws.us_east_1
  filename         = data.archive_file.edge_zip.output_path
  source_code_hash = data.archive_file.edge_zip.output_base64sha256
  function_name    = "${local.name_prefix}-edge-auth"
  role             = aws_iam_role.lambda_edge.arn
  handler          = "index.handler"
  runtime          = "nodejs24.x"
  publish          = true
  # Viewer-request cap is 5s; the only slow path is the (cached) Google cert fetch.
  timeout = 5
}

resource "aws_iam_role" "lambda_edge" {
  name = "${local.name_prefix}-edge-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"
          ]
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_edge_logging" {
  name = "${local.name_prefix}-edge-logging"
  role = aws_iam_role.lambda_edge.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        # Lambda@Edge replicas write to /aws/lambda/us-east-1.<name> in whichever region served the
        # request; direct invocations in us-east-1 (e.g. console tests) use /aws/lambda/<name>.
        Resource = [
          "arn:aws:logs:us-east-1:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.name_prefix}-edge-auth",
          "arn:aws:logs:us-east-1:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.name_prefix}-edge-auth:*",
          "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/us-east-1.${local.name_prefix}-edge-auth",
          "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/us-east-1.${local.name_prefix}-edge-auth:*",
        ]
      }
    ]
  })
}



