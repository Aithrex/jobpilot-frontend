# Job feed title filtering

How Jobs **Job feed** Sync uses resume / AI title chips — and what happens when they are cleared.

## Product contract (two modes)

| User state | Behavior |
| --- | --- |
| **Has title chips** (resume AI or manual) | Strict chip allowlist: every significant token of at least one chip must appear in the job title (`title_matched`) |
| **Clears all chips** (resume still on account) | **Family mode**: retrieve + list from resume **role families** (not the whole market) |
| **No chips and no resume signal** | Do not sync — prompt add title / suggest from resume |

```
Chips present
  → retrieve (wide net / families OK)
  → score
  → keep only title_matched chip roles
  → marketplace boards (Jobgether) pin last

Chips cleared + resume families
  → retrieve with family seed phrases
  → score
  → keep jobs whose classified role_family is in the resume set
  → marketplace pin last
```

Same-family but off-chip titles are **not** listed in chip mode (e.g. chip `Software Engineer` keeps `Senior Software Engineer`, drops `Backend Engineer` and `Systems Engineer` unless those chips are also present).

## What Sync sends

| Piece | Where |
| --- | --- |
| Shared title chips | [`src/hooks/useJobTitles.ts`](../src/hooks/useJobTitles.ts) |
| Fan-out scan (`canSearch` = chips **or** resume titles) | [`src/hooks/useCombinedJobs.ts`](../src/hooks/useCombinedJobs.ts) |
| Empty chips still call APIs with `titles: []` when a resume seed exists | same |

## Server gate

- `resolve_feed_search_titles` chooses chips / family / none
- Live crawl / career / MNC: `_score_jobs` chip gate vs family membership
- Inventory: chip `title_matches_chips` **or** family membership after scoring
- Chip matcher: `_role_matchers` / `title_matches_chips` in `workday_jobs_service.py`

Pinned by `jobpilot-backend/tests/test_job_feed_title_matching.py`.

## Client filters (unchanged)

Recency, free-text, seniority, min score, sponsorship. Sort: Best match / Newest; marketplace listings last.
