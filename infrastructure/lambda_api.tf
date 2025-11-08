# resource "aws_iam_role" "lambda_exec" {
#   name = "${local.name_prefix}-lambda-exec"
#   assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
# }


# data "aws_iam_policy_document" "lambda_assume" {
#   statement {
#     actions = ["sts:AssumeRole"]
#     principals {
#       type = "Service"
#       identifiers = ["lambda.amazonaws.com"]
#     }
#   }
# }
#
#
# resource "aws_iam_role_policy_attachment" "lambda_basic" {
#   role = aws_iam_role.lambda_exec.name
#   policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
# }
#
#
# resource "aws_iam_role_policy" "ddb_access" {
#   name = "${local.name_prefix}-ddb-access"
#   role = aws_iam_role.lambda_exec.id
#   policy = jsonencode({
#     Version = "2012-10-17",
#     Statement = [
#       {
#         Effect = "Allow",
#         Action = [
#           "dynamodb:PutItem",
#           "dynamodb:GetItem",
#           "dynamodb:UpdateItem",
#           "dynamodb:DeleteItem",
#           "dynamodb:Query",
#           "dynamodb:Scan"
#         ],
#         Resource = [aws_dynamodb_table.characters.arn]
#       }
#     ]
#   })
# }
#
#
# # Simple example Lambda (Node.js 20) — replace with your handlers
# locals {
#   api_handler = <<-EOT
#     export const handler = async (event) => {
#       const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
#       return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, user: sub }) };
#     };
# EOT
# }
#
#
# data "archive_file" "api_zip" {
#   type = "zip"
#   output_path = "build/api.zip"
#   source {
#     content = local.api_handler
#     filename = "index.mjs"
#   }
# }
#
#
# resource "aws_lambda_function" "api" {
#   function_name = "${local.name_prefix}-api"
#   role = aws_iam_role.lambda_exec.arn
#   runtime = "nodejs20.x"
#   handler = "index.handler"
#   filename = data.archive_file.api_zip.output_path
#   source_code_hash = data.archive_file.api_zip.output_base64sha256
#   timeout = 10
#   environment { variables = { TABLE_NAME = aws_dynamodb_table.characters.name } }
# }
#
#
# # HTTP API with Cognito JWT authorizer
# resource "aws_apigatewayv2_api" "http" {
#   name = "${local.name_prefix}-api"
#   protocol_type = "HTTP"
# }
#
#
# resource "aws_apigatewayv2_integration" "lambda" {
#   api_id = aws_apigatewayv2_api.http.id
#   integration_type = "AWS_PROXY"
#   integration_uri = aws_lambda_function.api.arn
#   payload_format_version = "2.0"
# }
#
#
# resource "aws_apigatewayv2_route" "proxy" {
#   api_id = aws_apigatewayv2_api.http.id
#   route_key = "ANY /api/{proxy+}"
#   target = "integrations/${aws_apigatewayv2_integration.lambda.id}"
#   authorizer_id = aws_apigatewayv2_authorizer.jwt.id
#   authorization_type = "JWT"
# }
#
#
# resource "aws_apigatewayv2_stage" "stage" {
#   api_id = aws_apigatewayv2_api.http.id
#   name = "${var.project_name}-api"
#   auto_deploy = true
# }
#
#
# resource "aws_lambda_permission" "allow_apigw" {
#   statement_id = "AllowAPIGatewayInvoke"
#   action = "lambda:InvokeFunction"
#   function_name = aws_lambda_function.api.function_name
#   principal = "apigateway.amazonaws.com"
#   source_arn = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
# }
