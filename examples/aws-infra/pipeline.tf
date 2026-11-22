# Connection to GitHub via CodeStar Connections (create the connection once in console, then reference here)
data "aws_codestarconnections_connection" "github" {
  name = local.name_prefix
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
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket", "s3:PutObjectAcl"],
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
        Resource = "*"
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
    image           = "aws/codebuild/standard:7.0"
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
      group_name  = "/codebuild/${local.name_prefix}-frontend"
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
      { Effect = "Allow", Action = ["codestar-connections:UseConnection"], Resource = data.aws_codestarconnections_connection.github.arn },
      { Effect = "Allow", Action = ["codebuild:BatchGetBuilds", "codebuild:StartBuild"], Resource = aws_codebuild_project.frontend.arn },
      { Effect = "Allow", Action = ["s3:PutObject", "s3:GetObject", "s3:GetObjectVersion", "s3:GetBucketVersioning", "s3:List*"], Resource = "*" }
    ]
  })
}


# Artifact store for pipeline
resource "aws_s3_bucket" "artifacts" {
  bucket        = "${local.name_prefix}-${random_id.suffix.hex}-artifacts"
  force_destroy = true
}


resource "aws_codepipeline" "frontend" {
  name     = "${local.name_prefix}-frontend"
  role_arn = aws_iam_role.codepipeline.arn


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
        ConnectionArn    = data.aws_codestarconnections_connection.github.arn
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
      # output_artifacts = ["BuildOutput"]
      version = "1"
      configuration = {
        ProjectName = aws_codebuild_project.frontend.name
      }
    }
  }
}
