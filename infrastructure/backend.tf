terraform {
  backend "s3" {
    bucket         = "codex-magica-001-terraform-state"
    key            = "main/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
    profile = "default"
  }
}

