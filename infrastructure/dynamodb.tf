# resource "aws_dynamodb_table" "characters" {
#   name = "${local.name_prefix}-characters"
#   billing_mode = "PAY_PER_REQUEST"
#
#
#   hash_key = "userId"
#   range_key = "characterId"
#
#
#   attribute {
#     name = "userId"
#     type = "S"
#   }
#   attribute {
#     name = "characterId"
#     type = "S"
#   }
#
#   tags = {
#     Project = var.project_name
#   }
# }
