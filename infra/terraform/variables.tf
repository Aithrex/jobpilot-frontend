variable "project" {
  type    = string
  default = "jobpilot"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "domain_name" {
  type        = string
  default     = "aspirely.me"
  description = "Apex domain served by CloudFront (DNS managed in Cloudflare)."
}

variable "subject_alternative_names" {
  type        = list(string)
  default     = ["www.aspirely.me"]
  description = "Extra names on the ACM cert / CloudFront aliases."
}

variable "api_gateway_domain" {
  type        = string
  description = "Backend API Gateway host (no scheme), e.g. abc123.execute-api.us-east-1.amazonaws.com. From `terraform output api_endpoint` in jobpilot-backend (strip https://)."
}

variable "price_class" {
  type        = string
  default     = "PriceClass_100"
  description = "PriceClass_100 = NA+EU (cheapest). 200 adds Asia; All = everywhere."
}

variable "bucket_name" {
  type        = string
  default     = ""
  description = "Override the S3 bucket name. Empty = <project>-frontend-<environment>-<account-id>."
}
