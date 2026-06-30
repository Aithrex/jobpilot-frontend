# Single CloudFront distribution: serves the SPA from S3 and proxies /api/* to
# the backend API Gateway — one origin domain (aspirely.me), so no CORS.

locals {
  # AWS managed policy IDs (avoid extra cloudfront:Get* perms)
  cache_optimized        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
  cache_disabled         = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
  orp_all_viewer_no_host = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # Managed-AllViewerExceptHostHeader
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project}-frontend-oac-${var.environment}"
  description                       = "OAC for JobPilot frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${var.project}-security-headers-${var.environment}"
  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    content_type_options { override = true }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }
  # CSP intentionally omitted to avoid breaking the SPA (Datadog RUM, fonts,
  # API). Add a content_security_policy block here once you've confirmed the
  # exact allow-list for aspirely.me.
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "JobPilot (aspirely.me) - ${var.environment}"
  default_root_object = "index.html"
  price_class         = var.price_class
  aliases             = concat([var.domain_name], var.subject_alternative_names)

  # Origin 1 — S3 SPA (private, via OAC)
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-Frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # Origin 2 — backend API Gateway
  origin {
    domain_name = var.api_gateway_domain
    origin_id   = "API-Backend"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default — SPA from S3
  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "S3-Frontend"
    cache_policy_id            = local.cache_optimized
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    viewer_protocol_policy     = "redirect-to-https"
  }

  # /api/* — proxy to API Gateway, no caching, forward everything except Host
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    target_origin_id         = "API-Backend"
    cache_policy_id          = local.cache_disabled
    origin_request_policy_id = local.orp_all_viewer_no_host
    viewer_protocol_policy   = "https-only"
  }

  # SPA routing — serve index.html for client-side routes
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  depends_on = [aws_acm_certificate_validation.main]
}
