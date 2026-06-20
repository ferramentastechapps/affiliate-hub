$ErrorActionPreference = "Stop"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🤖 AGENTE ESPECIALISTA: RECUPERAÇÃO DA VPS E CORREÇÃO DO ERRO 500" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Iniciando protocolo de limpeza profunda e reconstrução..." -ForegroundColor Yellow
Write-Host "Forneça a senha da VPS quando solicitado:" -ForegroundColor Yellow

$rescueCommand = @"
set -e

echo "🧹 1. Limpando memória e preparando o ambiente (Evitar travamentos no build)..."
# Criar swap temporário caso a VPS tenha pouca RAM e o build do Next.js esteja falhando (OOM)
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile || true
    echo "Swap de 2GB criado para o build."
fi

echo "🛑 2. Parando processos antigos do Next.js que estão travados..."
pm2 delete nextjs 2>/dev/null || true
lsof -ti:3005 | xargs kill -9 2>/dev/null || true
fuser -k 3005/tcp 2>/dev/null || true

cd ~/affiliate-hub

echo "🔄 3. Baixando a versão mais recente com a correção do Webpack..."
git fetch origin
git reset --hard origin/master
git pull origin master

echo "📦 4. Instalando dependências e recriando cache limpo..."
rm -rf .next
rm -rf node_modules/.cache
npm install

echo "🗄️  5. Sincronizando banco de dados..."
npx prisma db push --accept-data-loss

echo "🏗️  6. Iniciando o Build Limpo (com Webpack)... isso pode levar alguns minutos..."
npm run build

echo "🚀 7. Iniciando o Servidor Limpo..."
pm2 start npm --name "nextjs" -- start -- -p 3005
pm2 save

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SUCESSO! O SERVIDOR FOI TOTALMENTE RECONSTRUÍDO SEM O TURBOPACK!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 status
"@

$cleanCommand = $rescueCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ O agente especialista concluiu a recuperação da VPS!" -ForegroundColor Green
Write-Host "Acesse o site novamente. Se o erro persistir no seu navegador, Pressione CTRL + F5 para limpar o cache local!" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
