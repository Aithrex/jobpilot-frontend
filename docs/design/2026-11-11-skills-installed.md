# Agent skills: survey, vetting and what was installed

Date: 2026-11-11. Author: research track. Scope: Claude Code / Agent Skills (`SKILL.md` format)
useful for the US launch redesign: frontend and visual design, 3D / three.js / WebGL, typography and
color, accessibility, legal and privacy compliance, copywriting.

Install location: `C:\Users\harsh\.claude\skills\<skill-name>\` (user scope, every project).

---

## 1. Result

| Skill (folder) | Upstream repo | Stars (2026-11-11) | License | Pinned commit | What it is for | Files installed |
|---|---|---|---|---|---|---|
| `web-interface-guidelines` | [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) (rules), wrapper from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | 1,153 (rules repo); 33,922 (agent-skills) | MIT | `434b7f91364665f2f733b310ec54809bf8f37937` (2026-10-05) | Reviewing UI code for accessibility, focus states, forms, motion and `prefers-reduced-motion`, image sizing (CLS), dark mode, touch targets, copy. Outputs `file:line` findings | `SKILL.md` (local wrapper + upstream `command.md` rules, rules section byte-identical), `LICENSE` |
| `threejs-react-three-fiber` | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) `skills/threejs-react-three-fiber` | 4,142 | MIT | `0e181866f095b5f06d005133876e926515390d95` (2026-10-19) | R3F Canvas props, hooks, loading, drei helpers (Environment, Lightformer, ContactShadows, Bounds), on-demand rendering, PerformanceMonitor, disposal | `SKILL.md` (byte-identical), `LICENSE`, `PROVENANCE.md` |
| `threejs-materials` | same repo, `skills/threejs-materials` | 4,142 | MIT | same | PBR materials: MeshStandard and MeshPhysical (clearcoat, transmission, sheen), color spaces, environment maps, material cost order | `SKILL.md` (byte-identical), `LICENSE`, `PROVENANCE.md` |
| `threejs-performance` | same repo, `skills/threejs-performance` | 4,142 | MIT | same | Measuring and cutting draw calls, fill rate (DPR), shadow cost, transmission cost, shader compile stalls, disposal | `SKILL.md` (byte-identical), `LICENSE`, `PROVENANCE.md` |

Four skill folders, chosen for this project's gaps. The 3D track had no skill at all; the a11y
track had only the Chrome DevTools `a11y-debugging` skill, which audits a running page, while the
Vercel guidelines review source code before it ships.

### 1.1 The one local change, stated plainly

The upstream `vercel-labs/agent-skills` `web-design-guidelines` skill does not contain its rules.
Its `SKILL.md` says: "Fetch fresh guidelines before each review" from
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` and "The
fetched content contains all the rules and output format instructions." That makes every future
session follow instructions downloaded at run time, which can change after vetting. It was
therefore **not installed as published**. Instead `web-interface-guidelines/SKILL.md` contains:

1. A frontmatter and a short header naming the source file and commit, the MIT license, and the two
   local rules: do not fetch a newer copy; where a rule conflicts with the repository's own written
   rules (CLAUDE.md, copy guide, lint), the repository wins. For Aspirely that means ASCII copy and
   no dash punctuation, so the upstream Typography items about curly quotes, the ellipsis character
   and Title Case are not applied.
2. The `## Rules` section through the end of upstream `command.md`, byte-identical (checked with
   `diff`).

### 1.2 Caveats a future session must know

- The three.js skills target three.js r186 and fiber 9 / drei 10 (React 19). This repo pins
  three 0.182, fiber 8 and drei 9 (React 18). Check every API against r182 before using it; each
  folder's `PROVENANCE.md` repeats this. Examples in the R3F skill use `<Environment preset=...>`
  and the default `useGLTF` Draco CDN decoder, which this repo's CSP blocks
  (see `2026-11-11-3d-web-principles.md`, section 3.3).
- The three installed three.js files contain no `npx` commands (checked with grep). The pack's
  `threejs-asset-pipeline` skill, which was not installed, is full of `npx @gltf-transform/cli`
  and `npx gltfjsx` examples; if it is ever added, a session must still ask before running any
  `npx` command.

---

## 2. Already installed, not duplicated

| Skill | Where | Upstream |
|---|---|---|
| `ui-ux-pro-max` | `~/.claude/skills/ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill, 148,311 stars |
| `graphify` | `~/.claude/skills/graphify` | Graphify-Labs/graphify, 146,287 stars |
| superpowers set (`writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`) | plugin / synced | obra/superpowers, 316,406 stars |
| `frontend-design` | plugin `frontend-design@claude-plugins-official` | also in anthropics/skills, 193,297 stars |
| `copywriting` | available in this environment | coreyhaines31/marketingskills, 59,822 stars |
| `chrome-devtools-mcp:a11y-debugging` | plugin `chrome-devtools-mcp@claude-plugins-official` | Chrome DevTools MCP |
| `legal:*` (`compliance-check`, `legal-risk-assessment`, `review-contract`, ...) | knowledge-work plugin already available in this environment | Anthropic |

---

## 3. How the candidates were found

GitHub REST API, unauthenticated (search is limited to 10 requests per minute):
`GET https://api.github.com/search/repositories?q=<query>&sort=stars&order=desc`, queries
`claude skills`, `agent skills`, `awesome claude skills`, `claude-code skills`, `SKILL.md`,
`skills threejs`, `skills accessibility claude`, `skills design claude`, `skills legal claude`, then
`GET /repos/<owner>/<repo>` for exact star counts and licenses. Star counts were read on
2026-11-11 (US time; the API's `Date` header read 06:35 GMT on 12 November).

Highest-starred repos seen, with relevance:

| Repo | Stars | License | Relevance | Outcome |
|---|---|---|---|---|
| mattpocock/skills | 322,255 | MIT | General engineering | Off scope |
| obra/superpowers | 316,406 | MIT | Process | Already installed |
| affaan-m/ECC | 301,526 | MIT | Agent harness system | Off scope |
| anthropics/skills | 193,297 | none at repo root (per-skill license files) | Official. Has `frontend-design`, `theme-factory`, `canvas-design`, `brand-guidelines` (Anthropic's own brand), `web-artifacts-builder` | `frontend-design` already installed; the rest are off scope |
| nextlevelbuilder/ui-ux-pro-max-skill | 148,311 | MIT | Design | Already installed |
| addyosmani/agent-skills | 116,136 | MIT | Has `performance-optimization`, `frontend-ui-engineering` | Considered, not installed (section 4) |
| Leonxlnx/taste-skill | 113,751 | MIT | Art direction | Rejected (section 4) |
| ComposioHQ/awesome-claude-skills | 79,298 | none | Index (awesome list) | Used as an index only |
| coreyhaines31/marketingskills | 59,822 | MIT | Copywriting, CRO | `copywriting` already installed |
| hesreallyhim/awesome-claude-code | 57,814 | NOASSERTION | Index | Used as an index only |
| Nutlope/hallmark | 53,570 | MIT | Anti-AI-slop design | Rejected (section 4) |
| sickn33/agentic-awesome-skills | 49,573 | MIT | Index | Used as an index only |
| VoltAgent/awesome-agent-skills | 37,106 | MIT | Index of skills from official dev teams | Used as an index only |
| vercel-labs/agent-skills | 33,922 | MIT (README) | Official Vercel: `web-design-guidelines`, `writing-guidelines`, `react-best-practices` | Rules installed as a pinned copy (section 1.1) |
| heydamir/unslop | 14,704 | CC-BY-4.0 | AI-looking UI to designed UI | Not evaluated: overlaps `frontend-design` and `ui-ux-pro-max` |
| CloudAI-X/threejs-skills | 4,142 | MIT | three.js, 13 skills | Three installed |
| bergside/awesome-design-skills | 3,616 | MIT | Index of design skills | Index only |
| plugin87/ux-ui-agent-skills | 3,163 | MIT | Tokens, WCAG | Not evaluated (time) |
| zubair-trabzada/ai-legal-claude | 1,828 | none | Contract review | Rejected: no license, and contract review is not this launch's need |
| viettranx/3dviz-pro-max | 1,251 | MIT | Three.js / Blender scenes | Not evaluated: CloudAI-X covers it with higher stars |
| vercel-labs/web-interface-guidelines | 1,153 | MIT | The rules behind `web-design-guidelines` | Installed (pinned) |
| scottstts/Threejs-Awesome-Graphics-Agent-Skills | 990 | MIT | three.js graphics | Rejected (section 4) |
| meodai/skill.color-expert | 652 | CC-BY-4.0 | Color science, APCA, palettes | Rejected (section 4) |
| evolsb/claude-legal-skill | 504 | MIT | Contract risk review | Not installed: contract review, not privacy compliance |
| Community-Access/accessibility-agents | 445 | MIT | WCAG 2.2 review suite | Rejected (section 4) |

The awesome lists were used to confirm there is no higher-starred skill in a category than the
search found; their entries were not read one by one.

---

## 4. Vetting

### 4.1 Procedure

1. Each candidate was cloned with `git clone --depth 1` (hooks disabled, symlinks off) into its own
   new empty directory in the session scratchpad. No install script, `npx`, `pip` or `npm` command
   from any candidate was run. The only Python run near them was this session's own scripts, with
   `python -I`, passing paths as arguments.
2. Every file of each folder considered for install was read in full: the four installed
   `SKILL.md` files, `command.md`, both `LICENSE` files, and all six files of `contrast-master`
   (which was then rejected).
3. Grep over the candidate folders for network calls, installers, telemetry, credentials,
   obfuscation and instruction-override phrases
   (`curl`, `wget`, `fetch(`, URLs, `npx`, `pip install`, `telemetry`, `analytics`,
   `ignore ... previous`, `api_key`, `token`, `password`, `secret`, `.env`, `base64`, `eval(`,
   `exec(`, `child_process`, `subprocess`).
4. A Unicode scan for hidden or bidirectional control characters (categories Cf, Co, Cs and stray
   Cc) in every installed file: none found.
5. Line endings: all installed files are LF.

### 4.2 Findings for the installed four

- No scripts, no executables, no hooks, no settings changes, no telemetry, no credential access, no
  instruction-override language. Content is technical documentation with code examples.
- URLs present are documentation or code-example values (for example jsDelivr import maps in a
  skill that was not installed, `cdn.example.com` in a loader example). The installed three.js
  skills reference other skills in the same pack by name in "See Also"; those were not installed,
  so the references are inert.
- The upstream Vercel wrapper's runtime fetch was removed (section 1.1).

### 4.3 Rejected, and why

| Candidate | Reason |
|---|---|
| vercel-labs/agent-skills `web-design-guidelines` and `writing-guidelines` (as published) | Both instruct the agent to fetch their rules from a GitHub URL "before each review"; unvetted, mutable instructions at run time. The web rules were installed as a pinned copy instead; the writing rules were not needed (copy is covered by `copywriting` and the repo's copy rules) |
| Nutlope/hallmark | `scripts/imagegen.mjs` posts to `https://api.together.xyz/v1/images/generations` (network call, needs an API key); `scripts/install-hook.mjs` writes a hook into `~/.claude/settings.json` (changes agent configuration). 187 files, 7.2 MB |
| Leonxlnx/taste-skill | 1,631 files, 38.7 MB, including 133 `.js` and 20 `.mjs` files; `assets/components/fx-map/bake.mjs` posts to an endpoint and `assets/backgrounds/check.mjs` connects to a local DevTools port. Too large to read every file, and it ships network-calling scripts |
| meodai/skill.color-expert | About 200 reference Markdown files (about 4 MB). Grep found nothing suspicious and its one shell script only counts files, but the vetting rule is to read every file before installing, which is not practical here. Worth revisiting if a slimmer subset is published |
| Community-Access/accessibility-agents `contrast-master` | Read in full. Not standalone: it requires `skills/a11y-core` (router, JSON schema, `.mjs` scripts) outside its folder, sets `disable-model-invocation: true`, and its output contract is "Return only JSON". It is a sub-agent component of a larger suite. Its rules are already covered by the type and color doc and the installed Vercel guidelines |
| scottstts/Threejs-Awesome-Graphics-Agent-Skills | No `SKILL.md`; it is a `CLAUDE.md` / `AGENTS.md` pair plus an npm `bin` installer (`bin/*.mjs`) and a discovery script |
| addyosmani/agent-skills `performance-optimization` | Clean and well written, but it links to `../../references/performance-checklist.md` outside its folder, and it overlaps the installed Chrome DevTools `debug-optimize-lcp` skill. Not needed for this launch |
| vercel-labs/agent-skills `react-best-practices` | 76 files (414 KB); not read in full, so not installed |
| zubair-trabzada/ai-legal-claude, evolsb/claude-legal-skill | Contract review rather than privacy-law compliance; the first has no license |

### 4.4 Gaps

- **Legal and privacy compliance:** no high-starred, licensed, standalone skill for CCPA/CPRA,
  CAN-SPAM or WCAG legal posture was found. The compliance tracks should rely on the already
  available `legal:compliance-check` and `legal:legal-risk-assessment` skills plus counsel review
  (a human gate in the plan).
- **Typography and color:** the best candidate (meodai/skill.color-expert) could not be vetted at
  its size. The evidence base is in `2026-11-11-type-color-principles.md` instead.

---

## 5. Reproducing or removing

- Remove any of these by deleting its folder under `C:\Users\harsh\.claude\skills\`.
- To update a three.js skill: clone the upstream repo at a new commit into an empty directory,
  read the changed `SKILL.md` in full, re-run the grep and Unicode checks, copy it over, and update
  the commit in `PROVENANCE.md` and in this doc.
- To update `web-interface-guidelines`: read the new upstream `command.md` in full, replace the
  `## Rules` section onward, keep the local header, and update the commit line.
