# Setup

## Toolkit Information

- **Repository:** https://github.com/soumatheusgomes/vibe-coding-toolkit
- **Revision:** f13bb354363dafef8ce8d8f605856cc9e1cc52cc (2026-10-14)
- **Installation Date:** 2026-10-17
- **Installed By:** Vibe Coding Toolkit setup automation

## Coverage Matrix

| Component | Status | Scope | Notes |
|---|---|---|---|
| **PRODUCT.md** | ✅ Installed | Full product definition with MVP, flows, constraints | Created from README + CLAUDE.md context |
| **AGENTS.md** | ✅ Updated | Shared instructions with commands, multi-service architecture | Expanded from minimal Next.js rule |
| **CLAUDE.md** | ✅ Existing | Imports AGENTS.md | Already present, preserved |
| **Superpowers** | ⚠️ Unknown | Process skills | Global install check required in new session |
| **Ponytail** | ⚠️ Unknown | Minimal solution (full) | Global install check required in new session |
| **Caveman** | ✅ Active | Concise communication | Confirmed active via hook context |
| **RTK** | ✅ Installed | Token-optimized commands | v1.0.1 at `~/.local/bin/rtk`, SessionStart hook added |
| **Context7** | ⏸️ Manual Config | Library documentation | Requires OAuth setup: `npx ctx7 setup --claude` |
| **Graphify** | ✅ Installed | Knowledge graph | v0.9.91, skill installed globally, `.graphifyignore` created |
| **Skills Vercel** | ✅ Installed | 9 skills (8 web + find-skills) | Copied to `.claude/skills/` |
| **ESLint Quality Gates** | ✅ Installed | Next.js lite profile + custom rules | `eslint-rules/` copied, config updated, verify script at `scripts/verify-quality-rules.mjs` |
| **.claude/settings.json** | ✅ Created | RTK version hook | SessionStart shows RTK version |
| **.claude/memory/** | ✅ Created | Memory system (lite) | `MEMORY.md` index ready for use |
| **docs/architecture.md** | ✅ Created | System architecture, data flow, tech stack | Multi-service, scraping pipeline, AI integration |
| **docs/design.md** | ✅ Created | UI/UX patterns, accessibility, PWA | Component design, responsive behavior, animations |
| **docs/onboarding.md** | ✅ Created | Developer onboarding guide | Quick start, common tasks, troubleshooting |
| **docs/quality.md** | ✅ Created | Quality gates, checks, review process | ESLint rules, manual testing, accessibility |
| **docs/setup.md** | ✅ Created | This file | Toolkit coverage and decisions |

## Decisions & Rationale

### ESLint Profile: Lite (Not Full)

**Decision:** Used `next.config.mjs.example` (lite profile) instead of `next-app.config.mjs.example` (full profile).

**Rationale:**
- Project doesn't use Drizzle ORM guards (uses Prisma)
- No structured logger installed (uses console — could add later)
- Lite profile includes: max-lines (350), no-direct-console, no-direct-data-access
- Full profile adds: Drizzle-specific rules, logger requirements

**Future:** If structured logger added, consider upgrading to full profile.

### Context7: Manual Configuration

**Decision:** Context7 marked as manual config, not automated.

**Rationale:**
- Requires OAuth flow (browser interaction)
- API key management needs user decision
- Can't be scripted in setup automation
- User should run: `npx ctx7 setup --claude` or install plugin manually

### Skills: Copy Mode (Not Links)

**Decision:** Used `--copy` flag for Vercel skills installation on Windows.

**Rationale:**
- Windows junction/symlink requires admin or special config
- Copy mode works reliably across all Windows setups
- Trade-off: Manual update needed via `npx skills update --project`
- Alternative would be absolute links (not portable)

### Python Services: Not Modified

**Decision:** Python virtualenvs and `.env` files untouched.

**Rationale:**
- Each service has working config
- Separate from Next.js environment
- Toolkit focuses on TS/JS tooling
- Python tooling (if added) would be separate enhancement

### Graphify: Skill Only (No Graph Generated)

**Decision:** Installed Graphify skill globally, created `.graphifyignore`, but didn't generate graph.

**Rationale:**
- Graph generation via `/graphify .` command in Claude session
- User triggers when needed (not automatic on every setup)
- `.graphifyignore` excludes node_modules, venvs, .next, generated files

### Memory: Lite System (No Obsidian)

**Decision:** Created `.claude/memory/` with `MEMORY.md` index, no Obsidian MCP.

**Rationale:**
- Lite system is zero-dependency, file-based
- Obsidian optional for projects needing external vault
- Can add Obsidian MCP later if needed
- File-based memory sufficient for most use cases

### Hooks: RTK Only (No Custom Scripts)

**Decision:** Only RTK version display hook, no custom command proxy or session banner.

**Rationale:**
- RTK handles token optimization natively
- Custom hooks need maintenance and testing
- SessionStart hook shows RTK is available
- Minimal hooks = less complexity

### Docs: Consolidated (Not Scattered)

**Decision:** Created 5 structured docs, preserved existing `docs/` with 60+ historical files.

**Rationale:**
- New docs follow toolkit manifest pattern
- Historical docs preserved for reference (changelogs, testing guides, configs)
- Clear separation: structured docs for development, historical docs for context
- Could organize/archive historical docs later if needed

## Validation Results

### Pre-Setup Baseline

**ESLint (before quality gates):**
- 13 errors: `@typescript-eslint/no-explicit-any`
- 3 warnings: unused variables
- 1 error: `@typescript-eslint/no-require-imports` in examples

**TypeScript:**
- 5 errors: null type incompatibilities, missing properties, wrong types

**Build:** Not tested (requires DATABASE_URL)

### Post-Setup Validation

**ESLint (after quality gates):**
```bash
npm run lint
```
Result: New violations from quality gates (max-lines, no-direct-console, no-direct-data-access) — expected on first run. Baseline documented in `docs/quality.md`.

**TypeScript:** Same 5 errors (quality gates don't fix existing TS issues).

**Quality Rules Self-Check:**
```bash
node scripts/verify-quality-rules.mjs
```
Result: Rules verified correct (RuleTester passes).

**Skills Installation:**
- 8 Vercel web skills installed to `.claude/skills/`
- 1 find-skills installed to `.claude/skills/`
- All copied (not linked) for Windows compatibility

**Graphify:**
- Skill installed globally at `~/.claude/skills/graphify/`
- Registered in global `~/.claude/CLAUDE.md`
- `.graphifyignore` created in project

**RTK:**
- Binary at `~/.local/bin/rtk` (v1.0.1)
- Hook shows version on session start

## Commands Reference

### Development
```bash
npm run dev          # Dev server 0.0.0.0:3000
npm run build        # Build (requires DATABASE_URL)
npm run start        # Production server (port 3005)
npm run lint         # ESLint with quality gates
npx tsc --noEmit     # TypeScript check
```

### Database
```bash
npm run db:push      # Sync schema (no migrations)
npm run db:studio    # Prisma Studio UI
```

### Quality
```bash
node scripts/verify-quality-rules.mjs  # Self-check ESLint rules
npm run lint -- --fix                   # Auto-fix lint issues
```

### AI Tools
```bash
/graphify .                      # Generate knowledge graph (in Claude session)
/graphify explain "Product"      # Explain node
/graphify path "A" "B"           # Find path between nodes
npx ctx7 setup --claude          # Configure Context7 (manual, not done yet)
```

### Skills
```bash
npx skills list --agent claude-code       # List installed skills
npx skills update --project --yes         # Update skills (after toolkit updates)
```

### Python Services
```bash
cd bot && source venv/bin/activate && python telegram_listener.py
cd scraper-service && source venv/bin/activate && python main.py
pm2 start ecosystem.config.js   # Start all services
```

## Pending Actions

### Required (User Action Needed)

1. **Context7 Setup:**
   ```bash
   npx ctx7 setup --claude
   ```
   Follow OAuth flow in browser. Validates library doc queries.

2. **Generate Graphify Graph:**
   In new Claude session:
   ```
   /graphify .
   ```
   Creates `graphify-out/graph.json` for codebase queries.

3. **Fix Existing Lint/TS Errors:**
   - 13 `any` types → proper types or `unknown`
   - 3 unused vars → remove or use
   - 1 `require()` → convert to `import` or exempt examples
   - 5 TS errors → fix null handling, types

4. **Verify Global Plugins:**
   New Claude session to check:
   ```
   /plugin list
   ```
   Confirm Superpowers, Ponytail, Caveman active.

### Optional (Future Enhancements)

- Add structured logger (Pino/Winston) to enable full ESLint profile
- Automate tests (Vitest + Playwright)
- Configure Obsidian MCP if external memory vault needed
- Organize/archive historical docs in `docs/`
- Add Redis caching layer
- Unify dual link system migration (Link → ProductLink)

## Maintenance

### Updating Toolkit

When new toolkit version available:

1. Pull toolkit updates:
   ```bash
   cd /tmp/vibe-coding-toolkit && git pull
   ```

2. Compare templates with installed files (manual diff)

3. Update skills:
   ```bash
   npx skills update --project --yes
   ```

4. Re-run setup if major changes (or cherry-pick updates)

### Updating Skills

Skills are copied, not linked. Update manually:
```bash
npx skills update --project --yes
```

Review diff in `skills-lock.json` and skill contents.

### Regenerating Graph

After significant code changes:
```
/graphify .
```

Or use watch mode in separate terminal:
```bash
graphify watch .
```

### Updating Documentation

When behavior/architecture changes:
- Update relevant doc in `docs/`
- Keep `PRODUCT.md`, `AGENTS.md`, `CLAUDE.md` in sync
- Don't duplicate — reference other docs

## Troubleshooting

### Skills Not Discovered

- Check `.claude/skills/` exists with SKILL.md files
- Restart Claude session (skills loaded at session start)
- Verify `skills-lock.json` present

### Graphify Not Working

- Check skill installed: `ls ~/.claude/skills/graphify/`
- Verify registered: `grep graphify ~/.claude/CLAUDE.md`
- Generate graph first: `/graphify .`

### Quality Gates Too Strict

Baseline violations temporarily:
```js
// eslint.config.mjs
{
  rules: {
    "quality/max-lines": ["error", {
      max: 350,
      ignore: ["src/specific-legacy-file.ts"]
    }]
  }
}
```

Document why and plan to fix.

### RTK Not Showing

- Check binary: `which rtk`
- Check version: `rtk --version`
- Check hook: `.claude/settings.json` has SessionStart entry
- Restart Claude session to trigger hook

## Metrics

**Files created/modified:**
- 1 created: `PRODUCT.md`
- 1 updated: `AGENTS.md`
- 1 updated: `eslint.config.mjs` (backup at `eslint.config.mjs.backup`)
- 1 created: `.graphifyignore`
- 1 created: `.claude/settings.json`
- 1 created: `.claude/memory/MEMORY.md`
- 1 directory created: `eslint-rules/` (4 files)
- 1 directory created: `scripts/` (1 file)
- 4 created: `docs/architecture.md`, `docs/design.md`, `docs/onboarding.md`, `docs/quality.md`
- 9 skills installed: `.claude/skills/` (vercel-react-best-practices, vercel-composition-patterns, web-design-guidelines, writing-guidelines, vercel-react-view-transitions, vercel-optimize, deploy-to-vercel, vercel-cli-with-tokens, find-skills)

**Total additions:** 20 new files/directories in project, 1 global Graphify skill, 1 RTK hook.

**Preserved:** All existing code, configs, Python services, historical docs.

## Next Steps

1. Complete pending actions (Context7, Graphify graph, fix errors)
2. Verify plugins in new session
3. Test workflow with a small feature
4. Request 3-8 code review cycles focused on setup quality
5. Use toolkit for future development

## Contact & Support

- **Toolkit:** https://github.com/soumatheusgomes/vibe-coding-toolkit
- **Issues:** Toolkit GitHub issues or project-specific Git issues
- **AI Agent:** Ask Claude directly, referencing toolkit docs
