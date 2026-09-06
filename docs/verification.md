# Verification gate

Frontend checks run independently of deploy. Deploy waits for a green
`tests` workflow on **this commit SHA**. Local hooks are supplementary;
GitHub Actions is authoritative.

## Commands

From the frontend repo root. Node **22**, pnpm from `packageManager`.

| When | Command |
| --- | --- |
| Fast (Vitest) | `node scripts/verify.mjs --fast` |
| Full pre-push / CI-equivalent | `node scripts/verify.mjs --full` |

`--full` is `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`.
No backend credentials or paid APIs. Salary composition tests use the host
locale (`toLocaleString`); they must not assume `en-US` grouping.

`pnpm copy:check` and `pnpm lint` are recommended locally. They are **not**
in `--full` / CI: measured 2026-09-05, `copy:check` reported 172 substitutions
across 65 existing files, and lint has known pre-existing findings. Do not
add them to the required gate until those are green. Never add a `tsc` gate.

## Pre-push hook (opt-in, repository-local)

```
node scripts/install-pre-push-hook.mjs
```

Does not change global Git settings. The hook runs `--full --cache` and
reuses a stamp only when HEAD, the working tree, and the lockfile are
unchanged. `git push --no-verify` bypasses the hook; CI still blocks a
red suite.

## Deployment

`deploy.yml` polls `tests.yml` for `GITHUB_SHA` and refuses on failure,
cancel, timeout, or a missing run. Mark the `tests` check required in
GitHub branch protection / rulesets (admin) so PRs cannot merge red.

`pnpm lint` is a local quality check. It is not part of `--full` because
the repo currently has known ESLint findings; do not add a `tsc` gate
(see CLAUDE.md).
