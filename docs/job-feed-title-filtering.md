# Job feed title filtering

How Jobs **Job feed** Sync uses resume / chip titles.

## Product contract

1. Resume upload → parse / suggest **suitable role titles** (chips).
2. Those titles classify into **role families** (e.g. Software Engineer → `software_engineering`).
3. Sync shows the **whole family** of jobs for those families (Backend, Full Stack, Staff Engineer, …), not only exact chip strings.
4. Jobs outside those families are **dropped**, even if keyword recall pulled them in.

Example: chips / resume titles are Software Engineer only → family `software_engineering`. Backend Engineer stays. Bare **Systems Engineer** is `devops` and is **not** shown.

```
Resume / chips → role families
  → retrieve (keyword / inventory by family)
  → score
  → keep only jobs whose live title family ∈ allowed families
```

## What Sync sends

| Piece | Where |
| --- | --- |
| Shared title chips | [`src/hooks/useJobTitles.ts`](../src/hooks/useJobTitles.ts) |
| Fan-out scan | [`src/hooks/useCombinedJobs.ts`](../src/hooks/useCombinedJobs.ts) |

Payload: `{ titles, location, remote_only, us_only, force_refresh }`.

## Server gate

- Taxonomy: [`fit_score.ROLE_FAMILIES`](../../jobpilot-backend/shared/python/services/fit_score.py) / `classify_role`
- Live crawl filter: `_score_jobs` → `_allowed_families_for_titles` in `workday_jobs_service.py` (also used by career pages / MNC)
- Inventory: `inventory_feed.build_feed` re-classifies titles against the retrieval family set after scoring

Pinned by `jobpilot-backend/tests/test_job_feed_title_matching.py`.

## Client filters (unchanged)

Recency, free-text search, seniority, min score, sponsorship — not a second title allowlist.
