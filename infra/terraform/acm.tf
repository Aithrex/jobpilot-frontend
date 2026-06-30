# ACM certificate for aspirely.me (+ www), DNS-validated.
# DNS is in Cloudflare (not Route53), so the validation CNAME records are
# OUTPUT for you to add in Cloudflare manually (see outputs.tf + README).
#
# Two-phase apply (because the cert must be ISSUED before CloudFront can use it):
#   1) terraform apply -target=aws_acm_certificate.main
#      -> add the `acm_validation_records` output to Cloudflare (DNS-only/grey)
#   2) terraform apply        (validation completes, then CloudFront builds)

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Waits until ACM reports the cert ISSUED. With external (Cloudflare) DNS it
# takes no validation_record_fqdns — it simply blocks until you've added the
# CNAMEs and ACM has verified them.
resource "aws_acm_certificate_validation" "main" {
  certificate_arn = aws_acm_certificate.main.arn

  timeouts {
    create = "60m"
  }
}
