# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server on 0.0.0.0 (all interfaces)
npm run build        # prisma generate + next build
npm run start        # Production Next.js server
npm run lint         # ESLint

# Database
npm run db:push      # Push schema changes (no migration files generated)
npm run db:studio    # Open Prisma Studio UI

# Run a TypeScript script directly
npx tsx src/scripts/some-script.ts
```

There are no automated tests — manual verification and the Python bot test scripts in `bot/` are how things are validated.

## Multi-Service Architecture

Production is managed by PM2 (`ecosystem.config.js`). Seven processes run simultaneously:

| PM2 name | Entry point | Purpose |
|---|---|---|
| `nextjs` | `npm start` (port 3005) | Next.js web app |
| `affiliate-hub-listener` | `bot/telegram_listener.py` | Telegram command bot |
| `affiliate-scraper` | `bot/main.py` | Automated product scraping loop |
| `whatsapp-engine` | `whatsapp/engine.js` | WhatsApp integration |
| `telegram-group-monitor` | `bot/telegram_group_monitor.py` | Monitors Telegram groups for deals |
| `scrapling-service` | `scraper-service/main.py` | Python FastAPI scraper microservice (port 8001) |
| `video-generator` | `bot/video_generator.py` | Scheduled Instagram video generation |

The `scrapling-service` uses its own virtualenv at `scraper-service/venv/`. Dependencies: `scrapling[all]`, `fastapi`, `uvicorn[standard]`.

## Key Architecture

### Scraping Pipeline (`src/lib/scraper.ts`)

Two-tier scraping with automatic fallback:
1. **Primary**: Cheerio (Node.js HTML parser) — direct HTTP fetch
2. **Fallback**: `scrapeWithScrapling()` — calls the Python microservice at `SCRAPLING_SERVICE_URL` (default `http://127.0.0.1:8001`) which uses Scrapling's browser automation to bypass Cloudflare/TLS fingerprinting

Short URL expansion is handled for `amzn.to`, `s.shopee`, `a.aliexpress` before scraping.

### Database (`prisma/schema.prisma`)

PostgreSQL — requires `DATABASE_URL` and `DIRECT_URL` env vars. The README incorrectly states SQLite; ignore it.

**Dual link system (migration in progress)**:
- `ProductLink` — new model with `sourceUrl`, `affiliateUrl`, `generatedAffiliateUrl` per platform. Use this for new code.
- `Link` — legacy model kept for backward compatibility. Do not remove until migration completes.

`Product` deduplication uses `platformId` + `platformType`. Products with `isFixed = true` are protected from bot overwrites. AI fields (`aiScore`, `aiAnalysis`, `aiProcessed`) are populated by the Gemini pipeline.

### Auth (`src/lib/auth.ts`)

- `validateApiKey()` — checks `x-api-key` header against `API_SECRET_KEY` or `AFFILIATE_HUB_API_KEY` env vars
- `validateWebhookSignature()` — HMAC-SHA256 via `WEBHOOK_SECRET` with timing-safe comparison

### AI Pipeline

Google Gemini (`@google/generative-ai`) handles:
- Caption generation with substitution rules (`AiWordSubstitution`), banned words (`AiBannedWord`), and context (`AiContext`)
- Product scoring (`aiScore`) used for ranking
- Token usage tracked in `AiTokenLog`
- Caption history in `CaptionHistory`

### Frontend

- **Routing**: App Router (`src/app/`). Admin panel at `/admin`, public catalog at `/`.
- **Styling**: Tailwind CSS v4 — note that v4 has a completely different config API than v3.
- **Icons**: Phosphor Icons (`phosphor-react`)
- **Animation**: Framer Motion
- **PWA**: `@ducanh2912/next-pwa`

## Important Notes

- `typescript.ignoreBuildErrors: true` in `next.config.ts` — TypeScript errors won't block builds but should still be fixed.
- Image remote patterns in `next.config.ts` allow all HTTPS domains (`hostname: '**'`) as a catch-all.
- The `bot/` directory is a Python project with its own `venv/` and `.env` — configuration is separate from the Next.js `.env`.
- Security headers and no-cache rules for `/admin` and sensitive API routes are set in `next.config.ts`, not middleware.
