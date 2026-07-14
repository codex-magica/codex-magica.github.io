locals {
  name_prefix = lower(replace(var.project_name, " ", "-"))


  s3_bucket_name = "${local.name_prefix}-${random_id.suffix.hex}-web"
}


resource "random_id" "suffix" { byte_length = 4 }
