# Quality

## Quality Gates

This project uses custom ESLint rules (in `eslint-rules/`) to enforce quality standards.

### Active Rules

#### `quality/max-lines` (error)
Maximum 350 lines per file (excluding blanks and comments).

**Rationale:** Large files are hard to understand, test, and maintain. 350 lines is generous but forces periodic refactoring.

**Exemptions:**
- Test files (`*.test.*`, `*.spec.*`, `__tests__/`)
- Declaration files (`*.d.ts`)
- Pure barrel files (only `export * from` or `export { x } from`)
- Generated code (`**/generated/**`)
- Files in baseline (`ignore` option)

**How to fix:**
- Extract related functions into separate modules
- Split by domain/responsibility
- Use composition over monolithic classes

#### `quality/no-direct-console` (error)
No `console.log()`, `console.warn()`, etc. in production code.

**Rationale:** Console calls lack structure, context, and filtering. Use proper logging.

**Exemptions:**
- Test files
- `console.error()` if explicitly allowed in config

**How to fix:**
- Use structured logger (currently not installed — add if needed)
- Or suppress temporarily in dev/debug contexts
- Tests can use console freely

#### `quality/no-direct-data-access` (error)
Presentation layers cannot import database client directly.

**Rationale:** Separates data access from presentation, making code testable and maintainable.

**Configuration:**
```js
{
  modules: ["@/lib/prisma", "@/db"],  // Modules with db client
  bindings: ["db", "prisma"],          // Client binding names
  layers: ["/src/app/", "/src/components/"],  // Guarded paths
  extensions: [".tsx"]                 // Additional guards by extension
}
```

**Exemptions:**
- Test files
- API routes (allowed to use db)
- Repository/service layer

**How to fix:**
- Create repository functions in `src/lib/repositories/`
- Import repositories in components, not `prisma` client
- Pass data as props from Server Components

### Baseline Management

Legacy violations can be baselined while gradually fixing them:

```js
{
  rules: {
    "quality/max-lines": ["error", { 
      max: 350,
      ignore: [
        "src/legacy-module.ts",  // Will fix in next sprint
      ]
    }]
  }
}
```

**Process:**
1. Add to `ignore` list with comment explaining when/why it will be fixed
2. Track in issue/backlog
3. Remove from baseline when fixed
4. Don't add new files to baseline without justification

### Self-Check

Verify rules themselves are correct:

```bash
node scripts/verify-quality-rules.mjs
```

This runs ESLint's RuleTester on the custom rules with known-good and known-bad cases.

## Lint Workflow

```bash
npm run lint          # Check all files
npm run lint -- --fix # Auto-fix what's fixable
```

**Current baseline (as of setup):**
- 13 `@typescript-eslint/no-explicit-any` errors
- 3 unused variable warnings
- 1 `@typescript-eslint/no-require-imports` in examples/

**Goal:** Zero lint errors. Fix incrementally; don't add `// eslint-disable` without justification.

## TypeScript

```bash
npx tsc --noEmit  # Check types without building
```

**Config:** `typescript.ignoreBuildErrors: true` in `next.config.ts` means build won't fail on type errors, but they should still be fixed.

**Current baseline (as of setup):**
- 5 type errors (null handling, missing properties, incompatible assignments)

**Goal:** Zero type errors. `any` is a lint error; use proper types or `unknown` with narrowing.

## Build Verification

```bash
npm run build  # prisma generate + next build
```

**Success criteria:**
- Prisma schema valid
- No fatal compilation errors
- Output bundle created in `.next/`

**Note:** TypeScript errors don't block build currently, but should be fixed before merge.

## Manual Testing

No automated tests currently. All changes verified manually:

### Web App Testing
1. Start dev server: `npm run dev`
2. Test affected routes in browser
3. Check responsive layouts (mobile, tablet, desktop)
4. Test interactive elements (forms, modals, buttons)
5. Verify data changes in Prisma Studio or database

### API Testing
```bash
# Example: Test product creation webhook
curl -X POST http://localhost:3000/api/webhook/products \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","category":"Test","imageUrl":"https://example.com/image.jpg"}'
```

### Python Services Testing
Scripts in `bot/` for testing individual services:
```bash
cd bot
source venv/bin/activate
python test_scraper.py  # Example test script
```

## Accessibility

While no automated accessibility tests exist, manually verify:

- **Keyboard navigation:** Tab through interactive elements
- **Focus visible:** Can you see what's focused?
- **Screen reader:** Test with NVDA/JAWS/VoiceOver on key flows
- **Color contrast:** Check text/background combinations meet WCAG AA
- **Alt text:** All product images have meaningful alt text
- **Form labels:** All inputs have associated labels

Use browser DevTools Lighthouse audit for baseline accessibility score.

## Performance

No automated performance testing. Monitor manually:

- **Lighthouse score:** Run in Chrome DevTools
- **Bundle size:** Check `.next/static/` after build
- **Page load:** First load vs. cached navigation
- **Image loading:** Check lazy loading works
- **API response times:** Check logs/network tab

## Security

### Static Analysis
ESLint catches some issues (unused vars, type errors that could cause runtime issues).

### Manual Checks
- **Environment vars:** Never commit secrets to Git
- **API authentication:** All webhook/admin endpoints validated
- **SQL injection:** Prisma parameterizes queries (safe by default)
- **XSS:** React escapes by default; be careful with `dangerouslySetInnerHTML`
- **CSRF:** API routes use API key auth (no cookie-based auth currently)

### Dependency Scanning
```bash
npm audit
```

Fix high/critical vulnerabilities. Moderate/low can be deferred if no direct exploit path.

## Code Review Checklist

Before requesting review:

- [ ] Lint passes (`npm run lint`)
- [ ] Types pass (`npx tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manually tested affected features
- [ ] No new `any` types (fix or use `unknown`)
- [ ] No new console.log in production code
- [ ] Files under 350 lines (or justified exemption)
- [ ] Accessible (keyboard, screen reader friendly)
- [ ] No secrets committed
- [ ] Documentation updated if behavior changed

### AI-Assisted Review

After implementation, request **3-8 review cycles** focusing on:

1. **Requirements & behavior** — Does it do what was asked?
2. **Regressions & tests** — Any broken existing features?
3. **Security & data** — Input validation, auth, sensitive data handling
4. **Integrations & config** — External services, env vars, deployment concerns
5. **Accessibility & UX** — Keyboard nav, screen readers, error states
6. **Performance** — Bundle size, unnecessary renders, queries
7. **Clarity & maintenance** — Code readability, docs, future developer experience

Pick 3-8 based on scope and risk. Small changes get 3 focused cycles; complex/risky changes get 6-8.

## Metrics & Monitoring

### Current State
No automated metrics collection. Production monitoring via:
- PM2 logs (`pm2 logs`)
- PM2 monitoring dashboard (`pm2 monit`)
- Database query logs (if enabled in PostgreSQL config)

### Future Considerations
- Add error tracking (Sentry, Rollbar)
- Add analytics (Vercel Analytics, Plausible)
- Add performance monitoring (Vercel Speed Insights)
- Add structured logging (Pino, Winston)
- Track AI token usage (already logged in database via `AiTokenLog`)

## Technical Debt

Tracked in code and docs:

**Active Migrations:**
- Dual link system (`Link` → `ProductLink`) — use `ProductLink` for new code
- Some TypeScript errors need fixing (5 known errors)
- Some ESLint errors need fixing (13 `any` usages)

**Deferred Improvements:**
- Add automated tests (Vitest + Playwright)
- Add structured logger (replace console)
- Unified Python .env management
- Redis caching layer
- Message queue for scraping jobs

**Known Limitations:**
- No UI authentication for admin panel (API key only)
- No rate limiting on scraping endpoints
- Manual testing only
- `typescript.ignoreBuildErrors: true` masks type issues

## Quality Standards

### Code

- **Readability over cleverness** — Clear code beats clever code
- **Consistency** — Match existing patterns
- **Single Responsibility** — Functions/modules do one thing well
- **DRY (Don't Repeat Yourself)** — Extract common logic
- **Error handling** — Always handle errors, don't silently fail

### Documentation

- **Accurate** — Docs match reality
- **Concise** — Say what's needed, no more
- **Up-to-date** — Update docs with code changes
- **Examples** — Show, don't just tell

### Architecture

- **Separation of concerns** — Clear boundaries between layers
- **Fail fast** — Validate inputs early
- **Idempotent operations** — Safe to retry
- **Observable** — Log important events, track errors

## Continuous Improvement

Quality is a practice, not a destination:

1. **Fix incrementally** — Don't let technical debt grow
2. **Learn from bugs** — Add checks to prevent recurrence
3. **Refactor continuously** — Small improvements add up
4. **Share knowledge** — Document learnings
5. **Automate what matters** — Tests, lint, builds

## Resources

- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Next.js Best Practices](https://nextjs.org/docs/architecture/nextjs-compiler)
