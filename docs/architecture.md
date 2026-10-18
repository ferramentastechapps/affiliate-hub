# Code and architecture

## Actual stack

- **Framework:** Next.js 16.2, App Router (`src/app/`), React 19, TypeScript 5
- **Runtime / package manager:** Node 24.22.0, npm, `package-lock.json`
- **Persistence:** Prisma 5 + PostgreSQL (requires `DATABASE_URL` and `DIRECT_URL`). `src/lib/prisma.ts` is the single connection entry point.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`), `tailwind-merge`, `clsx`
- **Icons / motion:** `@phosphor-icons/react`, framer-motion
- **Charts:** recharts (internal analytics)
- **PWA:** `@ducanh2912/next-pwa`
- **AI:** Google Gemini (`@google/generative-ai`) in `src/lib/ai.ts`
- **Scraping:** Cheerio primary, Scrapling Python FastAPI service (`:8001`) fallback
- **Python services:** 6 processes under PM2, each with its own virtualenv and `.env`

Exceptions to toolkit defaults: no Drizzle ORM (Prisma is the working ORM — migration is separate work), no structured logger installed (uses `console`; full ESLint profile gated on adding one), no Vitest/Playwright (manual validation via dev server and Python bot scripts).

## Code map

```
affiliate-hub/
├── src/
│   ├── app/                    # App Router
│   │   ├── page.tsx            # Public catalog
│   │   ├── admin/              # Admin CRUD (products, coupons, AI contexts); cache-control: no-store
│   │   └── api/                # REST endpoints (webhooks, scrape, admin)
│   ├── components/             # ProductCard, ProductGrid, HeroSection, PlatformModal, admin/*
│   └── lib/                    # prisma.ts, scraper.ts, ai.ts, auth.ts
├── prisma/                     # schema.prisma (PostgreSQL)
├── bot/                        # Python: telegram_listener, main (scraper), group_monitor, video_generator
├── whatsapp/engine.js          # WhatsApp Business integration (Node)
├── scraper-service/main.py     # FastAPI Scrapling microservice (:8001)
├── eslint-rules/               # Custom quality rules (core-rules, index, utils, next-base)
├── scripts/                    # verify-quality-rules.mjs + project scripts
├── docs/                       # architecture, design, onboarding, quality, setup + 60+ historical
└── ecosystem.config.js         # PM2 process definitions (7 processes)
```

## Boundaries and flow

- Presentation (`src/app`, `src/components`) must not import the Prisma client directly. Feature modules in `src/lib/` own data access. Enforced by `quality/no-direct-data-access` (modules `@/db`, layers `/src/app/`, `/src/components/`, extensions `.tsx`).
- `console.*` is banned from production code by `quality/no-direct-console`; test files and `console.error` (when allowed) are exempt.
- Auth: `validateApiKey()` (header vs `API_SECRET_KEY`/`AFFILIATE_HUB_API_KEY`) and `validateWebhookSignature()` (HMAC-SHA256 via `WEBHOOK_SECRET`, timing-safe; falls back to API key; allows `x-webhook-secret` for testing). Default doc key is blocked.
- Scraping pipeline: short-URL expansion (`amzn.to`, `s.shopee`, `a.aliexpress`) → Cheerio HTTP fetch → `scrapeWithScrapling()` fallback to the Python service. Returns typed `ScrapedProduct`.
- AI pipeline: Gemini scoring (`aiScore`) and caption generation with `AiWordSubstitution`, `AiBannedWord`, `AiContext`; token usage tracked in `AiTokenLog`; captions audited in `CaptionHistory`.

## Data and migrations

- Prisma schema in `prisma/schema.prisma`. Deduplication by `platformId` + `platformType`. `isFixed = true` protects products from bot overwrite.
- Dual link system in migration: `ProductLink` (new: `sourceUrl`, `affiliateUrl`, `generatedAffiliateUrl` per platform) for new code; `Link` (legacy) kept for backward compatibility, not removed until migration completes.
- `npm run db:push` pushes schema without generating migration files. No `db:generate`/migration workflow in use.
- No tests exist; database access requires `DATABASE_URL`/`DIRECT_URL`, so `lint` and `tsc --noEmit` run without a live connection.

## Decisions

| Decision | Reason | Source / date | Revisit condition |
| --- | --- | --- | --- |
| Lite ESLint profile, not full | No Drizzle ORM, no structured logger | toolkit `templates/eslint/next.config.mjs.example` | when a structured logger is added |
| Copy mode for Vercel skills | Windows junction/symlink unreliable without admin | `docs/tools/16-vercel-skills.md` | when running on a Unix host or via `npx skills update` |
| Graphify skill only, no graph generated | Graph generated on demand via `/graphify .` | `docs/tools/07-graphify.md` | after significant code changes |
| Context7 left unconfigured | Requires OAuth browser flow; cannot be scripted | `docs/tools/12-context7.md` | user runs `npx ctx7 setup --claude` |
| Python services untouched | Each has working config; toolkit targets TS/JS | `docs/setup.md` (prior) | only on explicit request |

## Maintenance

Update this map when directories, dependencies, contracts, or boundaries change. Record verified behavior; remove decisions that no longer apply. Do not present planned architecture as implemented.