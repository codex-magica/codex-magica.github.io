variable "project_name" {
  type = string
  default = "codex-magica"
}
variable "aws_region" {
  type = string
  default = "eu-central-1"
}
variable "aws_profile" {
  type = string
  default = "default"
}


# GitHub source for pipeline
variable "github_owner" {
  type = string
  default = "marcigo36"
}
variable "github_repo" {
  type = string
  default = "codex-magica"
}
variable "github_branch" {
  type = string
  default = "main"
}


# Path to frontend relative to repo root (e.g. "frontend")
variable "frontend_dir" {
  type = string
  default = "."
}


# Whitelisted emails allowed past the CloudFront edge gate (baked into the edge function;
# changing this list requires a terraform apply).
variable "allowed_emails" {
  type = list(string)
  default = ["owner@example.com","player1@example.com","player2@example.com","player3@example.com","player4@example.com"]
}
