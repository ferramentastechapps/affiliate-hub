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

**Testing**: No automated test framework. Validation is manual and via Python bot test scripts in `bot/`. All changes should be verified by running the dev server and testing through the UI or manual API calls.

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

**Python Services Setup**:
- `bot/` has its own `.env` separate from the Next.js `.env`
- `scraper-service/` uses a dedicated virtualenv at `scraper-service/venv/`
- Dependencies: `scrapling[all]`, `fastapi`, `uvicorn[standard]`
- To run scrapling service manually: `cd scraper-service && source venv/bin/activate && python main.py`

## Key Architecture

### Scraping Pipeline (`src/lib/scraper.ts`)

Two-tier scraping with automatic fallback:
1. **Primary**: Cheerio (Node.js HTML parser) — direct HTTP fetch
2. **Fallback**: `scrapeWithScrapling()` — calls the Python microservice at `SCRAPLING_SERVICE_URL` (default `http://127.0.0.1:8001`) which uses Scrapling's browser automation to bypass Cloudflare/TLS fingerprinting

**Features**:
- Short URL expansion handled for `amzn.to`, `s.shopee`, `a.aliexpress` before scraping
- Returns typed `ScrapedProduct` with `name`, `imageUrl`, `price`, `description`, `category`
- Uses User-Agent headers to avoid basic blocking

### Database (`prisma/schema.prisma`)

PostgreSQL — requires `DATABASE_URL` and `DIRECT_URL` env vars (not SQLite, despite README).

**Dual link system (migration in progress)**:
- `ProductLink` — new model with `sourceUrl`, `affiliateUrl`, `generatedAffiliateUrl` per platform. Use this for new code.
- `Link` — legacy model kept for backward compatibility. Do not remove until migration completes.

**Product Records**:
- Deduplication uses `platformId` + `platformType` 
- `isFixed = true` protects products from bot overwrites
- AI fields (`aiScore`, `aiAnalysis`, `aiProcessed`) populated by Gemini pipeline
- `CaptionHistory` tracks all generated captions per product

### Auth (`src/lib/auth.ts`)

Two authentication methods for API/webhooks:
- `validateApiKey()` — checks `x-api-key` header against `API_SECRET_KEY` or `AFFILIATE_HUB_API_KEY` env vars
- `validateWebhookSignature()` — HMAC-SHA256 via `WEBHOOK_SECRET` with timing-safe comparison
  - Falls back to `validateApiKey()` if `WEBHOOK_SECRET` not configured
  - Allows direct `x-webhook-secret` header for testing

**Security**: Default key in docs (`mude-esta-chave...`) is blocked to prevent unsafe deployments.

### AI Pipeline

Google Gemini (`@google/generative-ai`) in `src/lib/ai.ts`:
- Caption generation with:
  - Substitution rules (`AiWordSubstitution`) — word replacements per context
  - Banned words (`AiBannedWord`) — words excluded from captions
  - Context (`AiContext`) — rules/instructions per product category
- Product scoring (`aiScore`) — used for ranking/recommendations
- Token usage tracked in `AiTokenLog` — for quota monitoring
- Caption history in `CaptionHistory` — audit trail of all generated captions

### Frontend

- **Routing**: App Router (`src/app/`)
  - Admin panel at `/admin` (with cache-control: no-store)
  - Public catalog at `/`
  - API routes at `/api/...`
- **Styling**: Tailwind CSS v4 — completely different config API than v3
- **Icons**: Phosphor Icons (`phosphor-react`)
- **Animation**: Framer Motion
- **PWA**: `@ducanh2912/next-pwa` for offline/installable app
- **Charts**: Recharts (`recharts`) for analytics dashboards

## Important Notes

### Build & TypeScript
- `typescript.ignoreBuildErrors: true` in `next.config.ts` — errors won't block builds but should still be fixed
- ESLint configured via `eslint.config.mjs` (flat config format, ESLint 9+)

### Images & CDN
- Image remote patterns in `next.config.ts` allow all HTTPS domains (`hostname: '**'`) as fallback
- Specific CDN patterns for: Amazon, Mercado Livre, Shopee, AliExpress, TikTok Shop, Promobit, Cloudinary, etc.
- Image optimization: AVIF/WebP formats, minimum 60s TTL cache

### Configuration Separation
- Next.js `.env` — frontend/API config
- `bot/.env` — separate for Python bot services
- `scraper-service/venv/` — isolated Python virtualenv for Scrapling

### Security & Caching
- Security headers set in `next.config.ts` headers() config, not middleware
- Routes `/admin`, `/admin/*`, `/api/auth/*`, `/api/admin/*` have `Cache-Control: no-store`
- Standard headers: X-Frame-Options (DENY), X-Content-Type-Options, HSTS, CSP Permissions-Policy

### Development Patterns
- Use path aliases: `@/*` maps to `./src/*`
- Organize lib utilities by domain: `auth.ts`, `scraper.ts`, `ai.ts`, `telegram.ts`, etc.
- API routes use standard Next.js App Router pattern with request/response handlers
