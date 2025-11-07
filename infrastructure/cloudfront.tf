
# CloudFront for HTTPS + CDN
resource "aws_cloudfront_origin_access_control" "oac" {
  name = "${local.name_prefix}-oac"
  description = "OAC for ${aws_s3_bucket.frontend.bucket}"
  origin_access_control_origin_type = "s3"
  signing_behavior = "always"
  signing_protocol = "sigv4"
}



resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  comment             = "${local.name_prefix} frontend"
  default_root_object = "index.html"


  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "s3-origin"


    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }


  default_cache_behavior {
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods = ["GET", "HEAD", "OPTIONS"]


    forwarded_values {
      query_string = true
      headers = ["Origin"]
      cookies { forward = "none" }
    }

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

  viewer_certificate {
    cloudfront_default_certificate = true
    # minimum_protocol_version = "TLSv1.2_2021"
  }
}

locals {
  edge_hash = filesha256("${path.module}/cloudfront_edge.js")
}

data "archive_file" "edge_zip" {
  type        = "zip"
  output_path = "${path.module}/build/cloudfront_edge-${local.edge_hash}.zip"

  source {
    content  = file("${path.module}/cloudfront_edge.js")
    filename = "index.mjs"
  }
}

resource "aws_lambda_function" "viewer_auth" {
  provider         = aws.us_east_1
  filename         = data.archive_file.edge_zip.output_path
  function_name    = "${local.name_prefix}-edge-auth"
  role             = aws_iam_role.lambda_edge.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  publish          = true
}
# environment {
#   variables = {
#     COGNITO_JWKS_URL   = "https://cognito-idp.eu-central-1.amazonaws.com/${aws_cognito_user_pool.main.id}/.well-known/jwks.json"
#     COGNITO_CLIENT_ID  = aws_cognito_user_pool_client.web.id
#     COGNITO_DOMAIN     = "${aws_cognito_user_pool.main.domain}.auth.eu-central-1.amazoncognito.com"
#   }
# }

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


