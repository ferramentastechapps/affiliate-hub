# 🔧 Como Corrigir o Erro 500 em Produção

## 🎯 Problema Identificado

O erro 500 está acontecendo porque:
- ❌ Você está usando SQLite (`file:./dev.db`) em produção
- ❌ SQLite não funciona em plataformas serverless (Vercel, Netlify, etc)
- ❌ O sistema de arquivos é read-only em produção

## ✅ Solução: Migrar para PostgreSQL

### Opção 1: Usar Vercel Postgres (Recomendado)

1. **Acesse o Dashboard da Vercel**
   - Vá para: https://vercel.com/dashboard
   - Selecione seu projeto

2. **Adicione o Banco de Dados**
   - Clique na aba "Storage"
   - Clique em "Create Database"
   - Selecione "Postgres"
   - Escolha um nome (ex: `affiliate-hub-db`)
   - Clique em "Create"

3. **Configure as Variáveis de Ambiente**
   - A Vercel vai criar automaticamente as variáveis:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`
   
4. **Atualize o .env.example**
   ```env
   # Para produção (Vercel Postgres)
   DATABASE_URL="${POSTGRES_PRISMA_URL}"
   ```

5. **Configure no Painel da Vercel**
   - Vá em: Settings > Environment Variables
   - Adicione:
     - `DATABASE_URL` = (copie o valor de `POSTGRES_PRISMA_URL`)
     - `API_SECRET_KEY` = `mude-esta-chave-por-uma-segura-123456789`
     - `NEXT_PUBLIC_SITE_URL` = `https://123testando.useiotashop.com.br`
     - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = (copie do seu .env)
     - `VAPID_PRIVATE_KEY` = (copie do seu .env)
     - `VAPID_SUBJECT` = `mailto:jotanogueira@icloud.com`

6. **Execute as Migrations**
   ```bash
   # Instale a CLI da Vercel (se ainda não tiver)
   npm i -g vercel
   
   # Faça login
   vercel login
   
   # Puxe as variáveis de ambiente
   vercel env pull .env.production
   
   # Execute as migrations
   DATABASE_URL="sua-url-do-postgres" npx prisma db push
   ```

7. **Faça o Deploy**
   ```bash
   git add .
   git commit -m "fix: migrar para PostgreSQL"
   git push
   ```

---

### Opção 2: Usar Supabase (Grátis)

1. **Crie uma conta no Supabase**
   - Acesse: https://supabase.com
   - Crie um novo projeto

2. **Pegue a Connection String**
   - Vá em: Settings > Database
   - Copie a "Connection string" (modo Transaction)
   - Exemplo: `postgresql://postgres:[SUA-SENHA]@db.xxx.supabase.co:5432/postgres`

3. **Configure no Painel da Vercel**
   - Settings > Environment Variables
   - Adicione `DATABASE_URL` com a connection string do Supabase

4. **Execute as Migrations**
   ```bash
   DATABASE_URL="sua-url-do-supabase" npx prisma db push
   ```

---

### Opção 3: Usar Railway (Grátis)

1. **Crie uma conta no Railway**
   - Acesse: https://railway.app
   - Conecte com GitHub

2. **Crie um Banco PostgreSQL**
   - New Project > Provision PostgreSQL
   - Copie a `DATABASE_URL`

3. **Configure no Painel da Vercel**
   - Settings > Environment Variables
   - Adicione `DATABASE_URL` com a URL do Railway

---

## 🚀 Checklist Final

Antes de fazer o deploy, certifique-se de:

- [ ] Banco de dados PostgreSQL criado
- [ ] `DATABASE_URL` configurada na Vercel
- [ ] `API_SECRET_KEY` configurada (troque a padrão!)
- [ ] `NEXT_PUBLIC_SITE_URL` configurada com seu domínio
- [ ] Variáveis VAPID configuradas
- [ ] Migrations executadas (`prisma db push`)
- [ ] Deploy realizado

---

## 🔍 Como Verificar se Funcionou

1. **Acesse seu site**: https://123testando.useiotashop.com.br
2. **Deve carregar sem erro 500**
3. **Verifique os logs da Vercel**:
   - Dashboard > Deployments > Clique no último deploy > Functions
   - Procure por erros relacionados ao banco

---

## 📝 Comandos Rápidos

```bash
# 1. Instalar dependências
npm install

# 2. Gerar o Prisma Client
npx prisma generate

# 3. Aplicar migrations (com a DATABASE_URL de produção)
DATABASE_URL="sua-url-postgres" npx prisma db push

# 4. (Opcional) Popular o banco com dados de exemplo
DATABASE_URL="sua-url-postgres" npx prisma db seed

# 5. Fazer deploy
git add .
git commit -m "fix: configurar banco de dados para produção"
git push
```

---

## ⚠️ IMPORTANTE

**NUNCA use SQLite em produção!**
- ❌ SQLite = arquivo local (não funciona em serverless)
- ✅ PostgreSQL/MySQL = banco remoto (funciona em qualquer lugar)

---

## 🆘 Ainda com Problemas?

Se o erro persistir, verifique:

1. **Logs da Vercel**:
   - Dashboard > Deployments > Functions > Ver logs

2. **Variáveis de Ambiente**:
   - Settings > Environment Variables
   - Certifique-se de que todas estão configuradas

3. **Build Logs**:
   - Veja se o build passou sem erros
   - Procure por erros do Prisma

4. **Teste Local com Produção**:
   ```bash
   # Puxe as variáveis de produção
   vercel env pull .env.production
   
   # Teste localmente
   npm run build
   npm start
   ```
