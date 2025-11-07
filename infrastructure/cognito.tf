resource "aws_cognito_user_pool" "main" {
  name = "${local.name_prefix}-users"


  auto_verified_attributes = ["email"]


  schema {
    attribute_data_type = "String"
    name = "email"
    required = true
    mutable = true
  }


  lambda_config {
    post_authentication = aws_lambda_function.cognito_whitelist.arn
  }
}


resource "aws_cognito_user_pool_client" "web" {
  name = "${local.name_prefix}-web"
  user_pool_id = aws_cognito_user_pool.main.id
  generate_secret = false
  allowed_oauth_flows = ["code"]
  allowed_oauth_scopes = ["email", "openid", "profile"]
  allowed_oauth_flows_user_pool_client = true
  callback_urls = var.cognito_callback_urls
  logout_urls = var.cognito_logout_urls
  supported_identity_providers = compact(["COGNITO", var.google_client_id != null ? "Google" : null, var.apple_services_id != null ? "SignInWithApple" : null])
  prevent_user_existence_errors = "ENABLED"
}


# Hosted UI domain (random suffix by default)
resource "aws_cognito_user_pool_domain" "domain" {
  domain = "${local.name_prefix}-${random_id.suffix.hex}"
  user_pool_id = aws_cognito_user_pool.main.id
}

data "aws_ssm_parameter" "cognito_client_secret_google" {
  name  = "codex-magica-google-sso-secret"
}

# Google IdP (optional)
resource "aws_cognito_identity_provider" "google" {
  count = var.google_client_id != null ? 1 : 0
  user_pool_id = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"
  provider_details = {
    client_id = var.google_client_id
    client_secret = data.aws_ssm_parameter.cognito_client_secret_google.value
    authorize_scopes = "openid email profile"
  }
  attribute_mapping = { email = "email" }
}


# Apple IdP (optional)
# resource "aws_cognito_identity_provider" "apple" {
#   count = var.apple_services_id != null ? 1 : 0
#   user_pool_id = aws_cognito_user_pool.main.id
#   provider_name = "SignInWithApple"
#   provider_type = "SignInWithApple"
#   provider_details = {
#     client_id = var.apple_services_id
#     team_id = var.apple_team_id
#     key_id = var.apple_key_id
#     private_key = var.apple_private_key
#     authorize_scopes = "name email"
#     # ignored_since_token_issued = true
#   }
#   attribute_mapping = { email = "email" }
# }


# Cognito JWT Authorizer for HTTP API
# resource "aws_apigatewayv2_authorizer" "jwt" {
#   api_id = aws_apigatewayv2_api.http.id
#   authorizer_type = "JWT"
#   identity_sources = ["$request.header.Authorization"]
#   name = "cognito-jwt"
#   jwt_configuration {
#     audience = [aws_cognito_user_pool_client.web.id]
#     issuer = local.cognito_issuer
#   }
# }


# Whitelist Lambda (PostAuthentication) — blocks users not in allowed_emails
resource "aws_iam_role" "cog_lambda" {
  name = "${local.name_prefix}-cog-lambda-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}


resource "aws_iam_role_policy_attachment" "cog_lambda_basic" {
  role = aws_iam_role.cog_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

locals {
  whitelist_hash = filesha256("${path.module}/cognito_whitelist.js")
}

data "archive_file" "whitelist_zip" {
  type = "zip"
  output_path = "${path.module}/build/cognito_whitelist-${local.whitelist_hash}.zip"
  source {
    content = file("${path.module}/cognito_whitelist.js")
    filename = "index.mjs"
  }
}

resource "aws_lambda_function" "cognito_whitelist" {
  function_name = "${local.name_prefix}-cognito-whitelist"
  role = aws_iam_role.cog_lambda.arn
  runtime = "nodejs20.x"
  handler = "index.handler"
  filename = data.archive_file.whitelist_zip.output_path
  environment { variables = { ALLOWED_EMAILS_JSON = jsonencode(var.allowed_emails) } }
}
