# Affiliate Hub

## Problema e objetivo

Criadores de conteúdo e afiliados precisam compartilhar múltiplos produtos com links de afiliados de diferentes plataformas (Amazon, Mercado Livre, Shopee, AliExpress, TikTok Shop). Resolver manualmente URLs, buscar dados de produtos e manter cupons atualizados é trabalhoso e repetitivo.

O Affiliate Hub centraliza produtos com links de múltiplas plataformas, scraping automático de dados, sistema de cupons e distribuição via Telegram/WhatsApp, permitindo que o afiliado gerencie tudo em um painel admin e automatize a captura e divulgação de ofertas.

## Público e papéis

**Afiliado/Admin:** Gerencia produtos, cupons, links de afiliados e configurações. Acessa painel admin em `/admin`.

**Visitante:** Navega produtos no catálogo público, vê preços/cupons e clica em links de afiliados para comprar. Acessa site público em `/`.

**Bots automatizados:** Telegram bots monitoram grupos de ofertas, scraper busca produtos periodicamente, WhatsApp engine envia notificações, video generator cria conteúdo para Instagram.

## Fluxos da versão inicial

1. **Adicionar produto via scraping:**
   - Admin cola URL de produto (Amazon, ML, Shopee, etc)
   - Sistema busca automaticamente nome, imagem, preço, descrição
   - Admin adiciona links de afiliados de outras plataformas
   - Produto aparece no catálogo público

2. **Criar cupom de desconto:**
   - Admin cria cupom com código, desconto e data de expiração
   - Vincula cupom a produto específico
   - Cupom aparece no card do produto no site público

3. **Navegar catálogo público:**
   - Visitante acessa home, vê grid masonry de produtos
   - Filtra por categoria
   - Clica em produto, vê modal com todas as plataformas disponíveis
   - Seleciona plataforma preferida e é redirecionado para link de afiliado

4. **Automação via bots:**
   - Bot Telegram recebe comandos e busca produtos
   - Scraper roda periodicamente, atualiza produtos existentes
   - WhatsApp engine notifica sobre ofertas novas
   - Monitor de grupos Telegram detecta promoções e adiciona automaticamente

## MVP

1. CRUD de produtos via painel admin
2. Scraping automático de dados (Cheerio + fallback Scrapling/browser)
3. Sistema de cupons com expiração
4. Catálogo público responsivo com grid masonry
5. Modal de seleção de plataforma
6. API webhook para integração com bots
7. Bots Telegram (listener + group monitor)
8. Scraper automático em loop
9. WhatsApp engine
10. Gerador de vídeos para Instagram

## Fora de escopo

- Sistema de login/autenticação de usuários finais (site público é aberto)
- Analytics detalhado de cliques (Recharts usado para dados internos)
- Multi-tenancy (single afiliado)
- Marketplace de afiliados
- API pública externa (apenas webhooks internos para bots)

## Requisitos

- Produtos devem ter pelo menos uma plataforma válida
- Cupons expirados não aparecem no site
- Imagens de produtos devem ser otimizadas (AVIF/WebP via Next.js Image)
- Site funciona offline como PWA
- Admin deve proteger contra chave padrão de segurança
- Scraper deve expandir URLs curtas (amzn.to, s.shopee, a.aliexpress) antes de scraping
- Sistema deve detectar e evitar duplicação de produtos por platformId + platformType
- Produtos marcados como `isFixed = true` não devem ser sobrescritos pelo bot
- Captcha/Cloudflare bypass via Scrapling service em Python quando Cheerio falha

## Restrições e decisões técnicas

- **Stack:** Next.js 16.2 (App Router), TypeScript 5, React 19
- **Banco:** PostgreSQL via Prisma 5 (não SQLite, apesar de README mencionar)
- **Estilo:** Tailwind CSS v4 (API completamente diferente da v3)
- **Ícones:** Phosphor Icons
- **Animações:** Framer Motion
- **PWA:** @ducanh2912/next-pwa
- **IA:** Google Gemini para scoring e geração de captions
- **Python services:** Separados com virtualenvs próprios (bot/.env, scraper-service/venv/)
- **Deploy:** PM2 com 7 processos simultâneos (1 Next.js + 6 Python)
- **Runtime:** Node 24.22.0, npm 11.19.1
- **Scraping:** Cheerio (primário) + Scrapling FastAPI microservice na porta 8001 (fallback)

## Hipóteses e pendências

- **Hipótese:** Scrapling service resolve 90%+ dos casos de Cloudflare/anti-bot sem necessidade de proxies rotativos pagos
- **Hipótese:** Sistema de dual link (ProductLink novo + Link legacy) pode ser unificado após migração completa dos bots
- **Pendente:** Autenticação do painel admin (atualmente via API key, sem UI de login)
- **Pendente:** Limite de rate para scraping (evitar bloqueio por uso excessivo)
- **Pendente:** Backup automático do banco PostgreSQL

## Critérios de aceitação

1. Admin consegue adicionar produto apenas com URL, sistema busca dados automaticamente
2. Produto com múltiplas plataformas mostra modal ao clicar, redirecionando para link escolhido
3. Cupom vinculado aparece no card do produto e expira automaticamente
4. Bot Telegram responde comandos e adiciona produtos via webhook
5. Scraper atualiza preços sem sobrescrever produtos marcados como `isFixed`
6. Site carrega <3s e funciona offline como PWA
7. Imagens de todas as plataformas carregam via proxy/CDN configurado

## Próxima entrega

Integração completa do Vibe Coding Toolkit: documentação estruturada, quality gates, grafo de conhecimento, skills Vercel e harness reproduzível para desenvolvimento com IA.

## Manutenção

Atualizado em 2026-10-17 durante setup do Vibe Coding Toolkit. Documentação técnica detalhada em `CLAUDE.md`, `AGENTS.md` e `docs/`.
