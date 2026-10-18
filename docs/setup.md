# Setup

## Toolkit revision

- **Source:** https://github.com/soumatheusgomes/vibe-coding-toolkit
- **Revision used this run:** `de66fe371a49f5a4d3b521759e5c401f390b6424` (2026-10-17, "fix: preserve review authority and lint protections")
- **Previously recorded:** `f13bb354363dafef8ce8d8f605856cc9e1cc52cc` (2026-10-14) — **unverified this run**: the shallow clone at `/tmp/vct-check` contains only `de66fe3` and cannot fetch `f13bb354`, so the delta between the two revisions could not be inspected. All guides and templates below come from `de66fe3`.
- **Run date:** 2026-10-18
## Diagnosis baseline (pre-edit)

- **Stack:** Next.js 16.2, React 19, TypeScript 5, Prisma 5 + PostgreSQL, Tailwind CSS v4, Node 24.22.0, npm, package-lock.json
- **Git:** branch `master`, up to date with `origin/master`, one unstaged change (`eslint.config.mjs`), no CI config (`.github/` absent)
- **Env:** no `.env`/`.env.example` at root; `mcp.json` present with a `stitch` server
- **Docs:** `docs/architecture.md`, `docs/design.md`, `docs/onboarding.md`, `docs/quality.md`, `docs/setup.md` already existed and were project-written; 60+ historical docs preserved
- **Quality gates:** `eslint-rules/` (4 files) and `scripts/verify-quality-rules.mjs` byte-identical to the toolkit's `templates/eslint/` — already up to date. Only `quality/max-lines` is enabled in `eslint.config.mjs`; `no-direct-console` and `no-direct-data-access` are defined but not enabled
- **Tools observed:** RTK 1.0.1 at `/c/Users/jotas/.local/bin/rtk`; Graphify skill present at `~/.claude/skills/graphify/`; Context7 absent (no plugin/MCP); Vercel skills present in `.claude/skills/` (9) and `skills-lock.json`; `~/.claude/settings.json` has a SessionStart RTK hook
- **Checks run before editing:** `npm run lint`, `npx tsc --noEmit`, `node scripts/verify-quality-rules.mjs` — see Checks below

## Components

| Component | Action and reason | Scope | State and evidence |
|---|---|---|---|
| **PRODUCT.md** | Reused as canonical product definition; preserved, not rewritten | Project | Present, content verified against README/CLAUDE.md |
| **AGENTS.md** | Reused; matches `templates/AGENTS.md.template` structure (product/stack, canonical commands, agreements, continuity, standards, tools/style, git, delegation, conventions) | Project | Present and current |
| **CLAUDE.md** | Reused; imports `@AGENTS.md`, retains Claude-specific details | Project | Present |
| **README.md** | Not updated | Project | Stale: still says "SQLite + Prisma" and Node 18+; actual is PostgreSQL and Node 24.22.0. Left as-is — it is a user-facing doc, not a toolkit destination; update on its own decision |
| **docs/architecture.md** | Rewritten to the toolkit template shape (actual stack, code map, boundaries/flow, data/migrations, decisions, maintenance) | Project | Validated this run |
| **docs/design.md** | Preserved as canonical; one correction — the "Design Tokens" section claimed a `tailwind.config.ts` that does not exist. Tailwind v4 is CSS-first (`@theme` in stylesheet) | Project | Validated this run |
| **docs/onboarding.md** | Reused as canonical; content matches observed commands and env var names | Project | Present and current |
| **docs/quality.md** | Corrected: `no-direct-console` and `no-direct-data-access` were documented as active errors; they are defined but **not enabled** in `eslint.config.mjs`. Also fixed the `no-direct-data-access` example modules (`@/db`, `@/db/index`) | Project | Validated this run |
| **docs/setup.md** | This file — updated to the current toolkit revision and coverage matrix | Project | This run |
| **ESLint quality gates** | Verified up to date: `core-rules.cjs`, `index.cjs`, `utils.cjs`, `next-base.mjs`, `verify-quality-rules.mjs` all byte-identical to `templates/eslint/` at `de66fe3` | Project | `diff` exit 0 for all five |
| **Vercel skills** | Reused; 9 skills in `.claude/skills/` + `skills-lock.json` | Project | Present; copy mode (Windows) — update via `npx skills update --project --yes` |
| **Superpowers** | Reused global plugin | Client | Present in `~/.claude/skills/` |
| **Ponytail** | Reused global plugin, intensity `full` | Client | Present in `~/.claude/skills/` |
| **Caveman** | Active this session (hook-reported) | Client | Active |
| **RTK** | Reused; v1.0.1 at `/c/Users/jotas/.local/bin/rtk`; SessionStart hook in `.claude/settings.json` | Client | Verified `rtk --version` → `rtk 1.0.1` |
| **Context7** | MCP server configured via OAuth (`npx ctx7 setup --claude`); API key in `~/.claude.json`; rule in `~/.claude/rules/context7.md`; skill in `~/.claude/skills/context7-mcp/` | Client | **Configured 2026-10-18** |
| **Graphify** | Skill installed at `~/.claude/skills/graphify/`; `.graphifyignore` present and adapted | Client + Project | Skill present; **no graph generated** (`graphify-out/` absent). Deterministic code-only extraction available: `GRAPHIFY_NO_AUTO_REFRESH=1 graphify extract . --code-only --no-cluster` |
| **Memory** | Lite file-based index at `.claude/memory/MEMORY.md` | Project | Present, empty index |
| **Harness evaluation** | Not run — requires the disposable fixture (`templates/harness-evaluation/`) and `scripts/validate-harness.mjs`, which are toolkit-internal and were not copied | — | Not run; recorded as a limitation |
| **Security review (prompt 13)** | Not executed — not requested by the user. The reusable prompt block is recorded in `docs/quality.md` for on-demand use | — | Not run |
| **Next.js runtime/bundle skills** (`next-dev-loop`, `next-bundle-optimizer`) | Not installed | Project | Inapplicable: no agent-browser/Chrome DevTools MCP and no authorized Vercel metrics |
| **PostgreSQL skill** (`supabase-postgres-best-practices`) | Not installed | Project | Not requested; Prisma is the working ORM |
| **GitHub CI repair** (`gh-fix-ci`) | Not installed | Project | Inapplicable: no `.github/workflows/` exists |
| **Differential security review** | Not installed | Project | Not requested |
| **shadcn** | Not installed | Project | Inapplicable: no shadcn/ui adoption |
| **Sentry MCP** | Not installed | Project | Inapplicable: no Sentry service chosen |

## Checks

| Item | State | Evidence |
|---|---|---|
| `node scripts/verify-quality-rules.mjs` | Validated | RuleTester passes for `quality/max-lines`, `quality/no-direct-console`, `quality/no-direct-data-access`; rules byte-identical to toolkit `de66fe3` |
| `npm run lint` | Configured without execution | Run timed out at 120s (moved to background task `b55v52jt9`); ESLint on this codebase is slow. Not counted as pass/fail — see below |
| `npx tsc --noEmit` | Not run this session | Pre-existing baseline from `docs/quality.md`: 5 type errors. Not re-measured |
| `npm run build` | Not run | Requires `DATABASE_URL`/`DIRECT_URL`, which are not set in this environment |
| Skills discovery | Configured without execution | `.claude/skills/` contains 9 Vercel skills + global plugins; verified on disk only, not via a live `/plugin list` in a fresh session |
| RTK | Validated | `rtk --version` → `rtk 1.0.1` |
| Graphify | Configured without execution | Skill directory present; no graph generated, so no query test possible |
| Context7 | Blocked | No binary, no plugin, no MCP — no live query possible |

**Pre-existing failures (not regressions):** the lint timeout and the 5 TypeScript errors predate this run. `docs/quality.md` already records 13 `any` errors, 3 unused-var warnings, 1 `no-require-imports` in `examples/`, and 5 type errors.

**`npm run lint` result (this run, exit 0 = config valid):** 633 problems — 409 errors, 224 warnings. Dominated by `@typescript-eslint/no-require-imports` on root-level `.js` scripts (`whatsapp/send_test.js`, `fix_*.js`, `patch_*.js`, `scraper-service-main.py`-named `.js`, etc.). The toolkit's `next-base.mjs` only exempts `eslint-rules/**/*.cjs` from that rule, so project `.js` files are not covered — a pre-existing config gap, not a regression from this run. The `eslint.config.mjs` change in the working tree is the user's; it was not edited here.

## Decisions and sources

| Decision | Reason | Source / date |
|---|---|---|
| Reuse existing docs rather than regenerate | `architecture.md`, `design.md`, `onboarding.md`, `quality.md` were already canonical and project-written; the manifest maps them to the same destinations | `templates/project-docs/manifest.json` at `de66fe3` |
| Correct, do not overwrite | Two factual errors found and fixed: Tailwind v4 config claim in `design.md`; `no-direct-console`/`no-direct-data-access` severity in `quality.md` | This run |
| README.md left stale | User-facing doc, not a toolkit destination; says SQLite/Node 18 while the project is PostgreSQL/Node 24.22.0 | This run — update on its own decision |
| No Next.js/Drizzle scaffolding | `templates/next/` applies only to new projects; this project already has Prisma and App Router | `docs/06-project-defaults.md` |
| No typed-lint profile added | `templates/eslint/next.typed.config.mjs.example` is a new-project default; adding `no-floating-promises`/`no-misused-promises` to this legacy codebase would be a separate migration | `docs/tools/06-eslint-biome-quality-gates.md` |
| Context7 not automated | Requires OAuth browser flow; cannot be scripted | `docs/tools/12-context7.md` |
| Graph not generated on setup | Generated on demand via `/graphify .`; deterministic extraction is available when needed | `docs/tools/07-graphify.md` |

## Pending work and next delivery

### Required (user action)

~~1. **Context7:** configured 2026-10-18.~~
~~2. **Graphify graph:** generated this run (2518 nodes, 4851 edges).~~
~~3. **Lint config gap:** fixed in `eslint.config.mjs` this run.~~

All previously required user actions are complete. No outstanding required interventions.

### Deferred (separate decision)

- Fix 409 lint errors / 224 warnings and 5 TypeScript errors
- Add structured logger → enables the full ESLint profile and `no-direct-console`
- Add Vitest/Playwright
- Unify dual link system (`Link` → `ProductLink`)
- Harness evaluation (fixture is toolkit-internal)
- Security review (prompt 13) — recorded in `docs/quality.md` for on-demand use

### Next useful check

`npm run lint` after the `no-require-imports` exemption is resolved, then `npx tsc --noEmit`.

## Post-setup actions executed this run

**`no-require-imports` exemption gap — fixed.** The toolkit's `next-base.mjs` only exempts `eslint-rules/**/*.cjs` from that rule, so every CommonJS `require()` in the project's utility/debug/test scripts was reported. Extended the existing exemption block in `eslint.config.mjs` to cover the same class of files:

```js
files: [
  ...existing...,
  "scripts/**/*.js",
  "scripts/**/*.ts",
  "whatsapp/**/*.js",
  "test_*.js",
  "test_*.mjs",
],
```

Result: `npm run lint` `no-require-imports` count 633 → **0**. Total problems 633 → 563 (320 errors, 243 warnings), all pre-existing. `node scripts/verify-quality-rules.mjs` still passes all three rules.

**Not done (out of scope):** the remaining 563 problems and the 5 TypeScript errors are pre-existing debt, not setup failures. Fixing them is a separate migration — the toolkit's own guidance is to introduce new rules at `warn` first and measure before promoting to `error`.

## Graphify graph — generated this run

- Command: `GRAPHIFY_NO_AUTO_REFRESH=1 graphify extract . --code-only --no-cluster`
- Output: `graphify-out/graph.json` — **2518 nodes, 4851 edges** (no clustering)
- Coverage: 478 code files AST-extracted; 162 non-code files skipped by design (`--code-only`)
- Query validated: `graphify explain 'src/lib/scraper.ts'` returns the node and its 53 connections (importers, contained functions, dependencies)
- Limitations recorded: 8 `.sql` files contributed nothing (`tree_sitter_sql` not installed — `pip install "graphifyy[sql]"`); `scripts/deploy/fix_env.py` had a syntax error and yielded no symbols; 72 code files yielded no symbols (data files, config, generated workers). `graphify-out/` is in `.graphifyignore` and stays out of version control
- Freshness: regenerate with the same command after code changes; `--code-only --no-cluster` keeps scope explicit
