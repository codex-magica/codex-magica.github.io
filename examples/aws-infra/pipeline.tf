# Connection to GitHub via AWS CodeConnections (formerly CodeStar Connections). Terraform creates it
# in PENDING state; approve it once in the console (Developer Tools → Settings → Connections →
# "Update pending connection") so AWS can install its GitHub app. The pipeline can't run until then.
resource "aws_codeconnections_connection" "github" {
  name          = local.name_prefix
  provider_type = "GitHub"
}


# CodeBuild role
resource "aws_iam_role" "codebuild" {
  name               = "${local.name_prefix}-codebuild"
  assume_role_policy = data.aws_iam_policy_document.codebuild_assume.json
}


data "aws_iam_policy_document" "codebuild_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
  }
}


resource "aws_iam_role_policy" "codebuild_policy" {
  name = "${local.name_prefix}-codebuild-policy"
  role = aws_iam_role.codebuild.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = ["s3:GetObject", "s3:ListBucket"],
        Resource = [aws_s3_bucket.artifacts.arn, "${aws_s3_bucket.artifacts.arn}/*"]
      },
      {
        Effect   = "Allow",
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
        Resource = [aws_s3_bucket.frontend.arn, "${aws_s3_bucket.frontend.arn}/*"]
      },
      {
        Effect   = "Allow",
        Action   = ["cloudfront:CreateInvalidation"],
        Resource = [aws_cloudfront_distribution.cdn.arn]
      },
      {
        Effect   = "Allow",
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        Resource = ["${local.codebuild_log_group_arn}", "${local.codebuild_log_group_arn}:*"]
      }
    ]
  })
}


resource "aws_codebuild_project" "frontend" {
  name         = "${local.name_prefix}-frontend"
  service_role = aws_iam_role.codebuild.arn
  artifacts { type = "CODEPIPELINE" }
  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/amazonlinux-x86_64-standard:5.0" # Amazon Linux 2023; Node 22 via buildspec
    type            = "LINUX_CONTAINER"
    privileged_mode = false
    environment_variable {
      name  = "S3_BUCKET"
      value = aws_s3_bucket.frontend.bucket
    }
    environment_variable {
      name  = "CLOUDFRONT_DIST_ID"
      value = aws_cloudfront_distribution.cdn.id
    }
  }
  source {
    type      = "CODEPIPELINE"
    buildspec = file("${path.module}/buildspec.yaml")
  }
  logs_config {
    cloudwatch_logs {
      group_name  = local.codebuild_log_group
      stream_name = "build"
    }
  }
}


# CodePipeline role
resource "aws_iam_role" "codepipeline" {
  name               = "${local.name_prefix}-codepipeline"
  assume_role_policy = data.aws_iam_policy_document.codepipeline_assume.json
}


data "aws_iam_policy_document" "codepipeline_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["codepipeline.amazonaws.com"]
    }
  }
}


resource "aws_iam_role_policy" "codepipeline_policy" {
  name = "${local.name_prefix}-codepipeline-policy"
  role = aws_iam_role.codepipeline.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      # Both prefixes: connections created before the rename still authorize via codestar-connections.
      { Effect = "Allow", Action = ["codeconnections:UseConnection", "codestar-connections:UseConnection"], Resource = aws_codeconnections_connection.github.arn },
      { Effect = "Allow", Action = ["codebuild:BatchGetBuilds", "codebuild:StartBuild"], Resource = aws_codebuild_project.frontend.arn },
      { Effect = "Allow", Action = ["s3:PutObject", "s3:GetObject", "s3:GetObjectVersion"], Resource = "${aws_s3_bucket.artifacts.arn}/*" },
      { Effect = "Allow", Action = ["s3:GetBucketVersioning", "s3:ListBucket"], Resource = aws_s3_bucket.artifacts.arn }
    ]
  })
}


data "aws_caller_identity" "current" {}

locals {
  codebuild_log_group     = "/codebuild/${local.name_prefix}-frontend"
  codebuild_log_group_arn = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:${local.codebuild_log_group}"
}

# Artifact store for the pipeline: it holds a zip of the repository for every run, so it gets the
# same lockdown as the site bucket, plus an expiry so old runs don't pile up.
resource "aws_s3_bucket" "artifacts" {
  bucket        = "${local.name_prefix}-${random_id.suffix.hex}-artifacts"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "artifacts_tls_only" {
  bucket = aws_s3_bucket.artifacts.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid       = "DenyInsecureTransport",
        Effect    = "Deny",
        Principal = "*",
        Action    = "s3:*",
        Resource  = [aws_s3_bucket.artifacts.arn, "${aws_s3_bucket.artifacts.arn}/*"],
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      }
    ]
  })
  depends_on = [aws_s3_bucket_public_access_block.artifacts]
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  rule {
    id     = "expire-old-pipeline-artifacts"
    status = "Enabled"
    filter {}
    expiration { days = 30 }
  }
}


resource "aws_codepipeline" "frontend" {
  name           = "${local.name_prefix}-frontend"
  role_arn       = aws_iam_role.codepipeline.arn
  pipeline_type  = "V2"     # V1 is legacy; V2 bills per action-minute (a small site stays in the free tier)
  execution_mode = "QUEUED" # pushes in quick succession deploy in order instead of superseding each other


  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }


  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["SourceOutput"]
      configuration = {
        ConnectionArn    = aws_codeconnections_connection.github.arn
        FullRepositoryId = "${var.github_owner}/${var.github_repo}"
        BranchName       = var.github_branch
        DetectChanges    = true
      }
    }
  }


  stage {
    name = "Build"
    action {
      name            = "BuildAndDeploy"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      input_artifacts = ["SourceOutput"]
      version         = "1"
      configuration = {
        ProjectName = aws_codebuild_project.frontend.name
      }
    }
  }
}
