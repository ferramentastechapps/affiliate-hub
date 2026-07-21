# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🔧 Script de Correção para Produção
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔧 CORREÇÃO DO ERRO 500 - AFFILIATE HUB" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. VERIFICAR PROBLEMA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "📋 DIAGNÓSTICO DO PROBLEMA:" -ForegroundColor Yellow
Write-Host ""
Write-Host "❌ Você está usando SQLite (file:./dev.db) em produção" -ForegroundColor Red
Write-Host "❌ SQLite não funciona em ambientes serverless (Vercel, Netlify)" -ForegroundColor Red
Write-Host "❌ O sistema de arquivos é read-only em produção" -ForegroundColor Red
Write-Host ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. ESCOLHER SOLUÇÃO
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "✅ SOLUÇÕES DISPONÍVEIS:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Vercel Postgres (Recomendado - Integrado)" -ForegroundColor Cyan
Write-Host "2. Supabase (Grátis - Fácil)" -ForegroundColor Cyan
Write-Host "3. Railway (Grátis - Simples)" -ForegroundColor Cyan
Write-Host "4. Neon (Grátis - Serverless)" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Escolha uma opção (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "📦 VERCEL POSTGRES" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Acesse: https://vercel.com/dashboard" -ForegroundColor Yellow
        Write-Host "2. Selecione seu projeto" -ForegroundColor Yellow
        Write-Host "3. Vá em: Storage > Create Database > Postgres" -ForegroundColor Yellow
        Write-Host "4. A Vercel criará automaticamente as variáveis de ambiente" -ForegroundColor Yellow
        Write-Host "5. Copie o valor de POSTGRES_PRISMA_URL" -ForegroundColor Yellow
        Write-Host ""
    }
    "2" {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "🐘 SUPABASE" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Acesse: https://supabase.com" -ForegroundColor Yellow
        Write-Host "2. Crie um novo projeto" -ForegroundColor Yellow
        Write-Host "3. Vá em: Settings > Database" -ForegroundColor Yellow
        Write-Host "4. Copie a 'Connection string' (modo Transaction)" -ForegroundColor Yellow
        Write-Host ""
        Start-Process "https://supabase.com"
    }
    "3" {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "🚂 RAILWAY" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Acesse: https://railway.app" -ForegroundColor Yellow
        Write-Host "2. Conecte com GitHub" -ForegroundColor Yellow
        Write-Host "3. New Project > Provision PostgreSQL" -ForegroundColor Yellow
        Write-Host "4. Copie a DATABASE_URL" -ForegroundColor Yellow
        Write-Host ""
        Start-Process "https://railway.app"
    }
    "4" {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "⚡ NEON" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Acesse: https://neon.tech" -ForegroundColor Yellow
        Write-Host "2. Crie um novo projeto" -ForegroundColor Yellow
        Write-Host "3. Copie a Connection String" -ForegroundColor Yellow
        Write-Host ""
        Start-Process "https://neon.tech"
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "⚙️  CONFIGURAR VARIÁVEIS DE AMBIENTE" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$databaseUrl = Read-Host "Cole a DATABASE_URL do PostgreSQL"

Write-Host ""
Write-Host "Agora vamos configurar as variáveis na Vercel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Acesse: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host "Vá em: Settings > Environment Variables" -ForegroundColor Cyan
Write-Host ""
Write-Host "Adicione as seguintes variáveis:" -ForegroundColor Yellow
Write-Host ""
Write-Host "DATABASE_URL = $databaseUrl" -ForegroundColor Green
Write-Host "API_SECRET_KEY = mude-esta-chave-por-uma-segura-123456789" -ForegroundColor Green
Write-Host "NEXT_PUBLIC_SITE_URL = https://123testando.useiotashop.com.br" -ForegroundColor Green
Write-Host "NEXT_PUBLIC_VAPID_PUBLIC_KEY = BIOpgm4eWwsHEcmJVFO0-TnlypaVUpqxn-rKo4rpZd70fhABDpa-kvo0up_1aCIkwXlRaHm1SYgaxwT89nVkyCY" -ForegroundColor Green
Write-Host "VAPID_PRIVATE_KEY = n5qO5WeoJxRoDJmXl9U3mXymuR9w5coio80mSS4ZASs" -ForegroundColor Green
Write-Host "VAPID_SUBJECT = mailto:jotanogueira@icloud.com" -ForegroundColor Green
Write-Host ""

$continue = Read-Host "Pressione ENTER depois de configurar as variáveis na Vercel"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. EXECUTAR MIGRATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔄 EXECUTANDO MIGRATIONS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$env:DATABASE_URL = $databaseUrl

Write-Host "Gerando Prisma Client..." -ForegroundColor Yellow
npm run prisma generate

Write-Host ""
Write-Host "Aplicando migrations..." -ForegroundColor Yellow
npx prisma db push

Write-Host ""
Write-Host "✅ Migrations aplicadas com sucesso!" -ForegroundColor Green

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. FAZER DEPLOY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 FAZER DEPLOY" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$deploy = Read-Host "Deseja fazer o deploy agora? (s/n)"

if ($deploy -eq "s") {
    Write-Host ""
    Write-Host "Fazendo commit..." -ForegroundColor Yellow
    git add .
    git commit -m "fix: migrar para PostgreSQL em produção"
    
    Write-Host ""
    Write-Host "Fazendo push..." -ForegroundColor Yellow
    git push
    
    Write-Host ""
    Write-Host "✅ Deploy iniciado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Acompanhe o deploy em: https://vercel.com/dashboard" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Aguarde o deploy terminar" -ForegroundColor White
Write-Host "2. Acesse: https://123testando.useiotashop.com.br" -ForegroundColor White
Write-Host "3. Verifique se o erro 500 foi corrigido" -ForegroundColor White
Write-Host ""
Write-Host "Se ainda houver problemas, verifique os logs em:" -ForegroundColor Yellow
Write-Host "https://vercel.com/dashboard > Deployments > Functions" -ForegroundColor Cyan
Write-Host ""
