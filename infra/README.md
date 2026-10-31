# JobPilot Deployment — Edge (frontend) + DNS

> **Retired 2026-10-31.** This describes the AWS setup (S3, CloudFront, ACM), which has been deleted. It is kept for history. The site now runs on the Oracle box behind Cloudflare: see `infra/compose/README.md` in `jobpilot-backend`.

`aspirely.me` is served by **one CloudFront distribution**:
- `/*` → S3 bucket (this repo's built SPA, private via OAC)
- `/api/*` → backend API Gateway (the `jobpilot-backend` Lambdas)

Same origin ⇒ no CORS. DNS is in **Cloudflare** (not Route53), so Terraform
**outputs** the records for you to add by hand.

```
jobpilot-backend  ── terraform ─►  Lambdas + layer + API Gateway  ──┐
                                                                     │ (/api/* origin)
jobpilot-frontend ── terraform ─►  S3 + CloudFront + ACM  ◄──────────┘
                                          │
                                   outputs ─► Cloudflare records (you add)
```

## Order of operations (first-time setup)

### 1. Deploy the backend infra first (need its API Gateway host)
```bash
cd ../../../jobpilot-backend          # build artifacts first (see its infra/README.md)
bash scripts/build_layer.sh && bash scripts/package.sh
cd infra/terraform
terraform init && terraform apply
terraform output -raw api_endpoint     # e.g. https://abc123.execute-api.us-east-1.amazonaws.com
```
Strip the `https://` — that host is `api_gateway_domain` below.

### 2. Frontend infra — phase 1: create the ACM cert
```bash
cd jobpilot-frontend/infra/terraform
cp terraform.tfvars.example terraform.tfvars   # set api_gateway_domain = the host from step 1
terraform init
terraform apply -target=aws_acm_certificate.main
terraform output acm_validation_records        # -> add these in Cloudflare (step 3)
```

### 3. Add the ACM validation record(s) in Cloudflare
For each entry in `acm_validation_records`, add a **DNS-only (grey cloud)** record:

| Type | Name (Cloudflare) | Target/Value |
|------|-------------------|--------------|
| CNAME | `_xxxx.aspirely.me` (the `name`, minus the trailing dot) | `_yyyy.acm-validations.aws` (the `value`) |

> Cloudflare strips the zone suffix automatically — paste the full `name`, it
> shows the host part. Keep proxy **OFF** (grey) for validation records.

Wait until ACM shows the cert **Issued** (minutes). Check:
```bash
aws acm describe-certificate --certificate-arn "$(terraform output -raw ... )" --query Certificate.Status
```

### 4. Frontend infra — phase 2: build CloudFront
```bash
terraform apply        # validation completes, CloudFront + S3 policy created (~5-15 min)
terraform output       # cloudfront_domain_name, distribution id, bucket name
```

### 5. Point the domain at CloudFront (Cloudflare)
Add these (DNS-only / grey cloud recommended — CloudFront already does CDN+TLS):

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `aspirely.me` (`@`) | `<cloudfront_domain_name>` (e.g. `d123.cloudfront.net`) | DNS only |
| CNAME | `www` | `<cloudfront_domain_name>` | DNS only |

Cloudflare flattens the apex CNAME automatically.

### 6. First content deploy
Push to `main` in each repo (CI deploys), or manually:
```bash
# frontend
pnpm build && aws s3 sync dist/ s3://<bucket>/ --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

---

## CI/CD (auto-deploy on push to `main`)

Both repos have `.github/workflows/deploy.yml`. **Terraform provisions infra
once; GitHub Actions deploys code on every push** (no `terraform apply` in CI).

### Required GitHub Actions secrets

**jobpilot-frontend** (Settings → Secrets and variables → Actions):
| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | deploy IAM user |
| `S3_BUCKET_NAME` | `terraform output -raw s3_bucket_name` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output -raw cloudfront_distribution_id` |
| `VITE_DD_RUM_APPLICATION_ID` / `VITE_DD_RUM_CLIENT_TOKEN` / `VITE_DD_RUM_SITE` | optional (Datadog RUM) |

**jobpilot-backend**:
| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | deploy IAM user |

> The deploy IAM user needs: `s3:*` on the FE bucket, `cloudfront:CreateInvalidation`,
> `lambda:UpdateFunctionCode/Configuration`, `lambda:PublishLayerVersion`,
> `lambda:GetFunction`. (Tighter than admin; scope to the project resources.)

---

## Cost allocation tags (industry standard)

Every Terraform-managed resource is tagged via provider `default_tags`:
`Project=jobpilot`, `Environment=prod` (+ `ManagedBy`, `Component`). To filter
AWS costs by these, **activate them once** as cost-allocation tags:

> AWS Billing console → **Cost allocation tags** → select **`Project`** and
> **`Environment`** → **Activate**. (User-defined tags take ~24h to appear in
> Cost Explorer, then filter/group by `Project` / `Environment`.)

A handful of resources can't carry tags (API Gateway routes, Lambda permissions,
S3 bucket policies, CloudFront OAC, Lambda *layer versions*) — that's an AWS
limitation, not a gap; all billable resources (Lambda, S3, CloudFront, API GW,
log groups, ACM) are tagged.
