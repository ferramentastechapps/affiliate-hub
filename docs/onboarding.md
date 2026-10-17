# Onboarding

## Prerequisites

Before working on Affiliate Hub, ensure you have:

- **Node.js 24.22.0** (or compatible version, check `.nvmrc` if present)
- **npm 11.19.1+**
- **PostgreSQL** (local or remote connection string)
- **Python 3.9+** (for bot services)
- **Git**

Optional but recommended:
- **PM2** globally installed (`npm install -g pm2`)
- **VS Code** or similar editor with TypeScript support

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd affiliate-hub
npm install
```

### 2. Environment Setup

Create `.env` in project root:

```env
# Database (PostgreSQL required)
DATABASE_URL="postgresql://user:password@localhost:5432/affiliate_hub"
DIRECT_URL="postgresql://user:password@localhost:5432/affiliate_hub"

# API Security
API_SECRET_KEY="your-secure-random-key-here"
WEBHOOK_SECRET="your-webhook-hmac-secret"

# Google Gemini (for AI features)
GEMINI_API_KEY="your-gemini-api-key"

# Scrapling Service
SCRAPLING_SERVICE_URL="http://127.0.0.1:8001"
```

**Important:** Never use the default key from examples (`mude-esta-chave-...`) — it's blocked for security.

### 3. Database Setup

```bash
npm run db:push
```

This syncs Prisma schema to PostgreSQL. No migration files are generated (uses `db:push` instead of `migrate`).

### 4. Start Development Server

```bash
npm run dev
```

Access:
- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

### 5. Python Services (Optional for Development)

Each Python service needs its own virtualenv and `.env`:

**Telegram Listener:**
```bash
cd bot
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit bot/.env with Telegram tokens
python telegram_listener.py
```

**Scrapling Service:**
```bash
cd scraper-service
python -m venv venv
source venv/bin/activate
pip install scrapling[all] fastapi uvicorn[standard]
python main.py  # Starts on port 8001
```

## Project Structure

```
affiliate-hub/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # Public home
│   │   ├── admin/        # Admin panel
│   │   └── api/          # API routes
│   ├── components/       # React components
│   └── lib/              # Utilities (prisma, scraper, ai, auth)
├── prisma/
│   └── schema.prisma     # Database schema
├── bot/                  # Python Telegram bots
├── whatsapp/             # WhatsApp integration
├── scraper-service/      # Python Scrapling microservice
├── docs/                 # Documentation (you are here)
├── eslint-rules/         # Custom quality gates
└── .claude/              # Claude Code config & skills
```

## Key Files to Know

- **`PRODUCT.md`** — Product definition, scope, MVP
- **`AGENTS.md`** — Shared instructions for AI agents
- **`CLAUDE.md`** — Claude-specific config (imports AGENTS.md)
- **`docs/architecture.md`** — System architecture, data flow
- **`docs/design.md`** — UI/UX patterns, accessibility
- **`docs/quality.md`** — Quality gates, checks
- **`docs/setup.md`** — Toolkit setup, validations
- **`src/lib/prisma.ts`** — Database client singleton
- **`src/lib/scraper.ts`** — Two-tier scraping pipeline
- **`src/lib/ai.ts`** — Gemini integration
- **`src/lib/auth.ts`** — API key & webhook validation

## Development Workflow

### Making Changes

1. **Read relevant code first** — Check existing patterns before writing new code
2. **Run checks** — Lint and types before committing
3. **Test manually** — No automated tests; verify via UI/API calls
4. **Small commits** — Atomic changes with clear messages

### Adding a New Feature

1. Check `PRODUCT.md` — Is it in scope?
2. Check `docs/architecture.md` — Where does it fit?
3. Write code following existing patterns
4. Update affected documentation
5. Run `npm run lint && npx tsc --noEmit`
6. Test in browser/API client
7. Commit with descriptive message

### Fixing a Bug

1. Reproduce the issue
2. Identify root cause (check recent changes, logs)
3. Write fix with minimal scope
4. Verify fix doesn't introduce regressions
5. Run checks
6. Commit with reference to issue if applicable

## Common Tasks

### Add a Product Manually

1. Go to `/admin`
2. Click "Add Product"
3. Paste product URL from Amazon, ML, Shopee, etc.
4. Click "Fetch" (auto-scrapes data)
5. Add affiliate links for other platforms
6. Save

### Create a Coupon

1. Go to `/admin` → Coupons
2. Click "Add Coupon"
3. Fill code, discount, expiration
4. Link to specific product(s)
5. Save

### Update Database Schema

1. Edit `prisma/schema.prisma`
2. Run `npm run db:push`
3. Update TypeScript types if needed
4. Update affected queries/mutations

### Run All Services (Production-like)

```bash
npm run build
pm2 start ecosystem.config.js
pm2 logs
```

Stop all: `pm2 stop all`

## Troubleshooting

### Build Fails

- Check `DATABASE_URL` is set
- Run `npm run db:push` to sync schema
- Check for TypeScript errors: `npx tsc --noEmit`

### Scraper Not Working

- Check `SCRAPLING_SERVICE_URL` env var
- Ensure Scrapling service is running on port 8001
- Check target site hasn't changed structure

### Images Not Loading

- Check remote image patterns in `next.config.ts`
- Some sites hotlink-protect images (proxy them locally if needed)
- Verify image URLs are HTTPS

### Python Services Won't Start

- Check virtualenv is activated
- Install dependencies: `pip install -r requirements.txt`
- Verify `.env` in service directory (not root)
- Check Python version (3.9+ required)

## AI Development Workflow

This project uses Claude Code + Vibe Coding Toolkit for AI-assisted development.

### Tools Available

- **Superpowers:** Process skills (brainstorming, planning, execution, review)
- **Ponytail:** Minimal sufficient solution (intensity `full`)
- **Caveman:** Concise communication in Portuguese
- **RTK:** Token-optimized command output
- **Graphify:** Knowledge graph of codebase (use `/graphify` command)
- **Context7:** Current library docs (configure separately)
- **Skills Vercel:** React/Next best practices, composition, design, writing

### Using the AI Agent

1. **Start with context:** Reference `PRODUCT.md` and relevant docs
2. **Brainstorm first:** For non-trivial features, use `/brainstorming` skill
3. **Plan before implementing:** Write design doc for project-sized work
4. **Verify after changes:** Run lint, types, manual tests
5. **Code review cycles:** After implementation, request 3-8 review cycles focused on different concerns

### Example AI Prompts

**Feature request:**
```
Adicione um filtro de preço máximo no catálogo público.
Quero que apareça como slider na sidebar.
```

**Bug fix:**
```
O scraper está falhando para produtos do Shopee.
Debug o erro em src/lib/scraper.ts:scrapeShopee
```

**Refactoring:**
```
Refatore o componente ProductCard para separar
a lógica de formatação de preço em um hook reutilizável.
```

**Architecture question:**
```
/graphify explique a relação entre Product, ProductLink e Link.
Como devo usar no código novo?
```

## Code Style

- **TypeScript strict mode** (though `ignoreBuildErrors: true` in config)
- **Path aliases:** Use `@/` for `src/` imports
- **Tailwind classes:** Order by type (layout, spacing, colors, etc.)
- **Components:** Functional components, hooks over class components
- **Async/await:** Prefer over `.then()` chains
- **Error handling:** Try/catch with meaningful messages
- **No console in production code:** Use proper logger (or add one)

## Quality Gates

- **Max 350 lines per file** (enforced by `quality/max-lines` rule)
- **No direct console in production code** (use in tests only)
- **No direct data access in presentation layers** (use repository pattern)

Run self-check: `node scripts/verify-quality-rules.mjs`

## Testing Strategy

**Current:** Manual testing only.

**How to test:**
1. Run dev server
2. Test feature in browser
3. Check API endpoints with curl/Postman
4. Python bots have test scripts in `bot/`

**Future consideration:** Add Vitest for unit tests, Playwright for E2E.

## Deployment

Production uses PM2 to orchestrate 7 processes.

Build and deploy:
```bash
npm run build
pm2 start ecosystem.config.js
pm2 save  # Persist process list
pm2 startup  # Generate startup script
```

Monitor:
```bash
pm2 status
pm2 logs
pm2 monit
```

## Getting Help

- **Code questions:** Use `/graphify` to explore codebase
- **Library docs:** Use Context7 (configure if not set up)
- **Architecture:** Check `docs/architecture.md`
- **Bugs:** Check Git history and recent changes
- **AI agent:** Ask directly, referencing relevant docs

## Next Steps After Onboarding

1. Read `PRODUCT.md` to understand product goals
2. Browse admin panel to see features
3. Make a small change (fix a typo, update a component)
4. Run through full dev workflow once
5. Review `docs/architecture.md` for deeper understanding
6. Configure Context7 if doing heavy library work
7. Generate/update Graphify graph: `/graphify .`

## Contributing Guidelines

1. **Preserve existing patterns** — Don't introduce new frameworks/libraries without discussion
2. **Document decisions** — Update docs/ when changing architecture or behavior
3. **Small PRs** — Easier to review and revert if needed
4. **Test thoroughly** — Manual testing is the gate; be thorough
5. **Commit messages** — Clear, present tense, reference issues when applicable
6. **Security first** — Never commit secrets, always validate inputs

## Resources

- [Next.js 16 Docs](https://nextjs.org/docs) — Note: v16 has breaking changes
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Phosphor Icons](https://phosphoricons.com)
- [Framer Motion](https://www.framer.com/motion/)
- [Vibe Coding Toolkit](https://github.com/soumatheusgomes/vibe-coding-toolkit)
