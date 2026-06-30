terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }

  # Remote state recommended (S3 + DynamoDB lock). Uncomment + fill in to share.
  # backend "s3" {
  #   bucket         = "aithrex-tfstate"
  #   key            = "jobpilot-frontend/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "aithrex-tflock"
  #   encrypt        = true
  # }
}

# CloudFront + ACM for CloudFront MUST live in us-east-1.
provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Component   = "jobpilot-frontend"
    }
  }
}
