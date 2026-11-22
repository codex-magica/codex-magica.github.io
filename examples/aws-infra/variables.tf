variable "project_name" {
  type    = string
  default = "codex-magica"
}
variable "aws_region" {
  type    = string
  default = "eu-central-1"
}
# Named AWS CLI profile; null falls back to the default credential chain.
variable "aws_profile" {
  type    = string
  default = null
}


# GitHub source for pipeline
variable "github_owner" {
  type    = string
  default = "marcigo36"
}
variable "github_repo" {
  type    = string
  default = "codex-magica"
}
variable "github_branch" {
  type    = string
  default = "main"
}


# Path to frontend relative to repo root (e.g. "frontend")
variable "frontend_dir" {
  type    = string
  default = "."
}


# Google accounts allowed past the CloudFront edge gate (baked into the edge function;
# changing this list requires a terraform apply). No default on purpose: set it in a
# gitignored terraform.tfvars (see terraform.tfvars.example).
variable "allowed_emails" {
  type = list(string)
}


# Firebase project whose ID tokens the edge gate accepts (token audience/issuer check).
variable "firebase_project_id" {
  type = string
}
