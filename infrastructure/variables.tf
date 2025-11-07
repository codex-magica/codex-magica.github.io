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


# Cognito social IdPs
variable "google_client_id" {
  type = string
  default = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
}

# Apple Sign-in (use Services ID flow)
variable "apple_services_id" {
  type = string
  default = null
} # e.g. com.example.signin
variable "apple_team_id" {
  type = string
  default = null
}
variable "apple_key_id" {
  type = string
  default = null
}
variable "apple_private_key" {
  type = string
  default = null
  sensitive = true
}


# Whitelisted emails allowed to authenticate
variable "allowed_emails" {
  type = list(string)
  default = ["owner@example.com"]
}


# Callback / logout URLs for Cognito Hosted UI
variable "cognito_callback_urls" {
  type = list(string)
  default = ["https://dexample000001.cloudfront.net/callback.html"]
}
variable "cognito_logout_urls" {
  type = list(string)
  default = []
}
