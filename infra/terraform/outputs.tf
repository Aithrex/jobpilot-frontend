# ── Values you need in Cloudflare ───────────────────────────────────────────

# 1) ACM validation records — add these as CNAMEs in Cloudflare (DNS-only/grey)
#    BEFORE the cert can be issued (phase 1 of the two-phase apply).
output "acm_validation_records" {
  description = "CNAMEs to add in Cloudflare to validate the ACM cert."
  value = [
    for o in aws_acm_certificate.main.domain_validation_options : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ]
}

# 2) The CloudFront domain — point aspirely.me (+ www) at this with a CNAME.
output "cloudfront_domain_name" {
  description = "Target for the aspirely.me / www CNAME records in Cloudflare."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

# ── Values you need as GitHub Actions secrets (frontend CI) ──────────────────
output "cloudfront_distribution_id" {
  description = "Set as secret CLOUDFRONT_DISTRIBUTION_ID (cache invalidation)."
  value       = aws_cloudfront_distribution.frontend.id
}

output "s3_bucket_name" {
  description = "Set as secret S3_BUCKET_NAME (frontend deploy target)."
  value       = aws_s3_bucket.frontend.bucket
}
