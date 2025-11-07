locals {
  name_prefix = lower(replace(var.project_name, " ", "-"))


  s3_bucket_name = "${local.name_prefix}-${random_id.suffix.hex}-web"


  # Cognito issuer for JWT authorizer
  cognito_issuer = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}


resource "random_id" "suffix" { byte_length = 4 }
