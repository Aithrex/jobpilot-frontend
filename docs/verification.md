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

## One test run per change

The full suite runs once per change, on the pull request:

1. **Pull request:** the suite runs on the tree GitHub would merge and, when it
   passes, records that tree on the head commit (`tests/tested-tree`).
2. **Merge to `main`:** the run on the merge commit compares trees. Same tree as
   a green pull request run means it passes in seconds without re-running. If
   the pull request's run is still going, it waits for it instead of starting
   a second one. A different tree (main moved) runs the full suite.
3. **Deploy** waits for the `main` run on that commit, as before.

The `main` ruleset requires a pull request, a green `Test and production build` check and a branch
that is up to date with `main`, so a merge cannot land before its tests or on a
tree they did not see. Merge with auto-merge so it lands the moment the check
passes:

```bash
gh pr merge <number> --merge --auto
```

If `main` moved after the pull request was tested, update the branch first
(`gh pr update-branch <number>`); that re-tests the new combination once.

## Deployment

`deploy.yml` polls `tests.yml` for `GITHUB_SHA` and refuses on failure,
cancel, timeout, or a missing run. Mark the `tests` check required in
GitHub branch protection / rulesets (admin) so PRs cannot merge red.

`pnpm lint` is a local quality check. It is not part of `--full` because
the repo currently has known ESLint findings; do not add a `tsc` gate
(see CLAUDE.md).
