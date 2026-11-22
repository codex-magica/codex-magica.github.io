# Remote state in S3 with DynamoDB locking. The concrete bucket/profile are kept out of the
# repo; supply them at init time:
#   terraform init -backend-config=backend.hcl   (see backend.hcl.example)
terraform {
  backend "s3" {
    key     = "main/terraform.tfstate"
    encrypt = true
  }
}
