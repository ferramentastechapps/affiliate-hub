# 🔗 Affiliate Hub

Hub de produtos com links de afiliados para múltiplas plataformas. Sistema completo com painel admin para gerenciar produtos e cupons de desconto.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Features

- 🎨 Interface moderna e responsiva com animações suaves
- 🛍️ Grid de produtos com efeito masonry
- 🔗 Suporte para múltiplas plataformas (Amazon, Mercado Livre, Shopee, AliExpress, TikTok)
- 🎫 Sistema de cupons de desconto
- 👨‍💼 Painel admin completo
- 🤖 Scraper automático de dados de produtos
- 💾 Banco de dados SQLite com Prisma ORM
- 🎭 Modal interativo para seleção de plataforma

## 🚀 Começando

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/affiliate-hub.git
cd affiliate-hub
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Configure o banco de dados:
```bash
npm run db:push
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

6. Acesse no navegador:
- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

## 📁 Estrutura do Projeto

```
affiliate-hub/
├── prisma/
│   └── schema.prisma          # Schema do banco de dados
├── src/
│   ├── app/
│   │   ├── admin/             # Painel administrativo
│   │   ├── api/               # API Routes
│   │   │   ├── products/      # CRUD de produtos
│   │   │   ├── coupons/       # CRUD de cupons
│   │   │   └── scrape/        # Scraper de produtos
│   │   └── page.tsx           # Página principal
│   ├── components/
│   │   ├── admin/             # Componentes do admin
│   │   ├── HeroSection.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   └── PlatformModal.tsx
│   └── lib/
│       ├── prisma.ts          # Cliente Prisma
│       └── scraper.ts         # Lógica de scraping
└── package.json
```

## 🎯 Funcionalidades do Admin

### Gerenciar Produtos

- ✅ Adicionar produtos automaticamente via URL
- ✅ Buscar dados (nome, imagem, preço) automaticamente
- ✅ Adicionar links de múltiplas plataformas
- ✅ Editar e deletar produtos
- ✅ Categorização de produtos

### Gerenciar Cupons

- ✅ Criar cupons de desconto
- ✅ Vincular cupons a produtos específicos
- ✅ Definir data de expiração
- ✅ Ativar/desativar cupons
- ✅ Copiar código do cupom

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build para produção
npm run start        # Inicia servidor de produção
npm run lint         # Executa linter
npm run db:push      # Sincroniza schema com banco de dados
npm run db:studio    # Abre Prisma Studio
```

## 🎨 Tecnologias

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS 4
- **Animações:** Framer Motion
- **Banco de Dados:** SQLite + Prisma ORM
- **Ícones:** Phosphor Icons
- **Scraping:** Cheerio

## 🤖 Integração com Robô de Promoções

O Affiliate Hub possui uma API completa para integração com robôs que buscam promoções automaticamente.

### Configuração Rápida

1. Configure a API key no `.env`:
```env
API_SECRET_KEY="sua-chave-super-secreta-123"
```

2. Use os endpoints webhook para enviar dados:
```bash
# Adicionar produto
curl -X POST https://seu-dominio.com/api/webhook/products \
  -H "x-api-key: sua-chave" \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto","category":"Gaming","imageUrl":"url"}'
```

3. Veja exemplos completos em:
- `WEBHOOK.md` - Documentação completa da API
- `examples/robot-integration.py` - Exemplo em Python
- `examples/robot-integration.js` - Exemplo em Node.js

## 📝 Como Adicionar Produtos

1. Acesse o painel admin em `/admin`
2. Clique em "Adicionar Produto"
3. Cole o link do produto de qualquer plataforma suportada
4. Clique em "Buscar" para puxar os dados automaticamente
5. Adicione links de outras plataformas manualmente
6. Salve o produto

## 🌐 Plataformas Suportadas

- Amazon
- Mercado Livre
- Shopee
- AliExpress
- TikTok Shop

## 📦 Deploy

### Vercel (Recomendado)

1. Faça push do código para o GitHub
2. Importe o projeto na Vercel
3. Configure a variável de ambiente `DATABASE_URL`
4. Deploy automático!

### Outras Plataformas

O projeto pode ser deployado em qualquer plataforma que suporte Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📄 Licença

Este projeto está sob a licença MIT.

## 👨‍💻 Autor

Desenvolvido com ❤️ por [Seu Nome]

---

⭐ Se este projeto foi útil, considere dar uma estrela!
