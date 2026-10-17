# Architecture

## System Overview

Affiliate Hub is a multi-service system combining a Next.js web application with 6 Python services orchestrated by PM2. The architecture separates concerns across web presentation, automated scraping, messaging integrations, and content generation.

## Service Architecture

### Next.js Application (Port 3005)
- **Purpose:** Public catalog, admin panel, API endpoints
- **Entry:** `npm start` after build
- **Stack:** Next.js 16.2 App Router, React 19, TypeScript 5
- **Routes:**
  - `/` — Public product catalog
  - `/admin` — Admin CRUD (products, coupons, AI contexts)
  - `/api/*` — REST endpoints for webhooks, scraping, admin operations

### Python Services

All Python services use separate virtualenvs and `.env` files:

1. **Telegram Listener** (`bot/telegram_listener.py`)
   - Responds to bot commands
   - Webhook receiver for product/coupon additions
   - Authentication via bot token

2. **Affiliate Scraper** (`bot/main.py`)
   - Periodic scraping loop
   - Updates existing products (respects `isFixed` flag)
   - Calls Next.js API for database writes

3. **Telegram Group Monitor** (`bot/telegram_group_monitor.py`)
   - Monitors deal groups for new offers
   - Auto-adds detected products
   - Rate-limited to avoid Telegram API bans

4. **WhatsApp Engine** (`whatsapp/engine.js`)
   - Node.js service for WhatsApp Business integration
   - Sends notifications about new deals
   - Session management for WhatsApp Web

5. **Scrapling Service** (`scraper-service/main.py`)
   - FastAPI microservice on port 8001
   - Browser automation via Scrapling library
   - Cloudflare/TLS fingerprint bypass
   - Called by Next.js scraper.ts as fallback

6. **Video Generator** (`bot/video_generator.py`)
   - Scheduled Instagram content creation
   - Uses product images + templates
   - Uploads via Instagram API

## Data Flow

### Product Addition Flow
```
Admin UI → /api/products POST → Prisma → PostgreSQL
                ↓
         Scraper (Cheerio)
                ↓
         [if blocked] → Scrapling Service :8001
                ↓
         Product data returned → DB write
```

### Automated Scraping Flow
```
bot/main.py (cron) → /api/webhook/products (auth: API key)
                   → Scraper pipeline
                   → DB update (skip if isFixed=true)
```

### Telegram Bot Flow
```
User command → Telegram API → bot/telegram_listener.py
                            → /api/webhook/* (auth: API key or HMAC)
                            → Action + response
```

## Database Schema

PostgreSQL via Prisma ORM. Key models:

- **Product:** Main product entity with `platformId` + `platformType` for deduplication
- **ProductLink:** New multi-platform link system (`sourceUrl`, `affiliateUrl`, `generatedAffiliateUrl`)
- **Link:** Legacy link model (preserved during migration)
- **Coupon:** Discount codes with expiration
- **AiContext:** Per-category instructions for AI caption generation
- **AiWordSubstitution:** Word replacement rules for captions
- **AiBannedWord:** Excluded words from captions
- **AiTokenLog:** Token usage tracking for Gemini API
- **CaptionHistory:** Audit trail of all generated captions

Connection: Singleton in `src/lib/prisma.ts`, requires `DATABASE_URL` and `DIRECT_URL`.

## Scraping Pipeline

Two-tier system with automatic fallback:

1. **Primary (Cheerio):** Direct HTTP fetch + HTML parsing
   - Fast, low resource
   - Handles most sites
   - Expands short URLs first (amzn.to, s.shopee, a.aliexpress)

2. **Fallback (Scrapling):** Browser automation
   - Python FastAPI service (:8001)
   - Full JavaScript execution
   - Cloudflare bypass
   - Called when Cheerio fails or gets blocked

Response: Typed `ScrapedProduct` with `name`, `imageUrl`, `price`, `description`, `category`.

## AI Pipeline

Google Gemini integration (`@google/generative-ai`) in `src/lib/ai.ts`:

- **Caption generation:** Product descriptions with substitution rules and banned words
- **Product scoring:** AI-based quality/relevance scoring for ranking
- **Token tracking:** All API calls logged in `AiTokenLog` for quota monitoring
- **Context awareness:** Per-category instructions stored in `AiContext`
- **History:** All generated captions preserved in `CaptionHistory`

## Authentication & Security

### API Authentication
Two methods in `src/lib/auth.ts`:
- `validateApiKey()` — Checks `x-api-key` header against `API_SECRET_KEY` or `AFFILIATE_HUB_API_KEY`
- `validateWebhookSignature()` — HMAC-SHA256 via `WEBHOOK_SECRET`, falls back to API key if not configured

Security: Default key from docs (`mude-esta-chave...`) is explicitly blocked.

### Route Protection
- Admin routes (`/admin/*`, `/api/admin/*`, `/api/auth/*`) have `Cache-Control: no-store`
- Security headers set in `next.config.ts`: X-Frame-Options (DENY), X-Content-Type-Options, HSTS, CSP Permissions-Policy

## Frontend Architecture

### Routing
App Router pattern:
- `src/app/page.tsx` — Public home
- `src/app/admin/` — Admin panel pages
- `src/app/api/` — API route handlers
- `src/app/categoria/[slug]/` — Dynamic category pages

### Components
- `src/components/` — Shared UI components (ProductCard, ProductGrid, HeroSection, PlatformModal)
- `src/components/admin/` — Admin-specific components

### Styling
- Tailwind CSS v4 (completely different API from v3 — consult official docs)
- Animations via Framer Motion
- Icons via Phosphor Icons (`@phosphor-icons/react`)
- PWA via `@ducanh2912/next-pwa`

### Analytics
Recharts for internal admin dashboards (not public-facing analytics).

## Image Handling

- Next.js Image optimization with remote patterns
- Fallback pattern allows all HTTPS (`hostname: '**'`)
- Specific CDN patterns for Amazon, ML, Shopee, AliExpress, TikTok, Promobit, Cloudinary
- Format: AVIF/WebP with 60s TTL minimum cache
- Some images proxied locally to avoid CORS/hotlink blocking (e.g., Promobit)

## Build & TypeScript

- `typescript.ignoreBuildErrors: true` — Doesn't block builds but errors should be fixed
- Build: `prisma generate && next build`
- ESLint 9 flat config (`eslint.config.mjs`)
- Path aliases: `@/*` → `./src/*`

## Environment Configuration

Three separate environments:
1. **Next.js:** `.env` at root (DATABASE_URL, API keys, Gemini API key)
2. **Python bots:** `bot/.env` (Telegram tokens, webhook URLs)
3. **Scrapling service:** Uses `scraper-service/venv/` with own deps

## PM2 Orchestration

`ecosystem.config.js` defines 7 processes:
- One Next.js (persistent after build)
- Six Python services (each with own interpreter/venv)

Commands:
```bash
pm2 start ecosystem.config.js  # Start all
pm2 logs                        # View logs
pm2 restart all                 # Restart all
pm2 stop all                    # Stop all
```

## Key Design Decisions

1. **PostgreSQL over SQLite:** Despite README mentioning SQLite, actual schema uses PostgreSQL for production scale
2. **Dual link system:** Migration in progress from `Link` to `ProductLink` — new code uses `ProductLink`
3. **`isFixed` flag:** Prevents bot overwrites of manually curated products
4. **Multi-service architecture:** Separation allows independent scaling and language-appropriate solutions (Python for scraping, Node for web)
5. **Fallback scraping:** Two-tier system balances speed (Cheerio) with reliability (Scrapling)
6. **No automated tests:** Manual validation via dev server and Python test scripts
7. **API key auth only:** Admin has no UI login — relies on API key validation

## Technology Constraints

- **Next.js 16:** Breaking changes from training data — always consult `node_modules/next/dist/docs/`
- **Tailwind v4:** Completely new config API from v3
- **Prisma migrations:** Schema changes via `db:push` (no migration files generated)
- **No logger:** Uses console (could add structured logger if needed)

## Scalability Considerations

Current architecture supports:
- Horizontal scaling of Next.js (stateless)
- Independent Python service scaling
- Database connection pooling via Prisma
- Rate limiting needed for scraping endpoints

Bottlenecks:
- Scrapling service single instance (can horizontally scale FastAPI)
- PostgreSQL write contention on high-frequency scraping
- Telegram API rate limits on group monitoring

## Future Architecture Notes

- Unify dual link system when migration completes
- Add Redis for caching scraped data
- Consider message queue for scraping jobs (avoid blocking API calls)
- Separate read replicas for public catalog vs admin writes
