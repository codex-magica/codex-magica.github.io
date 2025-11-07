terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = ">= 5.0"
    }
    archive = {
      source = "hashicorp/archive"
      version = ">= 2.3"
    }
    random = {
      source = "hashicorp/random"
      version = ">= 3.5"
    }
  }
}


provider "aws" {
  region = var.aws_region
  profile = var.aws_profile
}


# CloudFront certificates or Lambda@Edge must be in us-east-1
provider "aws" {
  alias = "us_east_1"
  region = "us-east-1"
  profile = var.aws_profile
}
