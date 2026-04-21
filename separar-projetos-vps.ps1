# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🔧 Script para Separar Projetos Misturados na VPS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔧 SEPARAR PROJETOS MISTURADOS NA VPS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Este script vai:" -ForegroundColor Yellow
Write-Host "1. Parar todos os processos" -ForegroundColor White
Write-Host "2. Limpar configurações antigas" -ForegroundColor White
Write-Host "3. Configurar Affiliate Hub na porta 3005" -ForegroundColor White
Write-Host "4. Atualizar Nginx para apontar corretamente" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Deseja continuar? (s/n)"

if ($confirm -ne "s") {
    Write-Host "Operação cancelada." -ForegroundColor Red
    exit
}

$separateCommand = @"
set -e

echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo '🛑 PARANDO TODOS OS PROCESSOS'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

# Parar PM2
pm2 delete all 2>/dev/null || true

# Matar processos Python
pkill -9 -f python3 || true
pkill -9 -f main.py || true
pkill -9 -f telegram_listener.py || true

# Matar processos Node órfãos
pkill -9 -f 'node.*3005' || true
pkill -9 -f 'node.*3006' || true

echo '✅ Todos os processos parados'
echo ''

echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo '🔄 CONFIGURANDO AFFILIATE HUB'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

cd ~/affiliate-hub

# Atualizar código
echo '📥 Atualizando código...'
git reset --hard
git pull origin main

# Instalar dependências
echo '📦 Instalando dependências...'
npm install

# Sincronizar banco
echo '🗄️  Sincronizando banco de dados...'
npx prisma db push --accept-data-loss

# Build
echo '🏗️  Fazendo build...'
rm -rf .next
npm run build

# Configurar bot
echo '🤖 Configurando bot...'
cd bot
pip3 install -r requirements.txt --break-system-packages 2>/dev/null || pip3 install -r requirements.txt

# Iniciar bot em background
echo '🚀 Iniciando bot...'
nohup python3 -u main.py > bot.log 2>&1 &
nohup python3 -u telegram_listener.py > listener.log 2>&1 &

# Voltar para raiz do projeto
cd ~/affiliate-hub

# Iniciar Next.js com PM2
echo '🚀 Iniciando Next.js na porta 3005...'
pm2 start npm --name "affiliate-hub" -- start -- -p 3005
pm2 save

echo '✅ Affiliate Hub configurado!'
echo ''

echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo '⚙️  CONFIGURANDO NGINX'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

# Criar/atualizar configuração do Nginx
cat > /etc/nginx/sites-available/123testando.useiotashop.com.br << 'EOF'
server {
    listen 80;
    server_name 123testando.useiotashop.com.br;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Habilitar site
ln -sf /etc/nginx/sites-available/123testando.useiotashop.com.br /etc/nginx/sites-enabled/

# Testar configuração
echo '🧪 Testando configuração do Nginx...'
nginx -t

# Recarregar Nginx
echo '🔄 Recarregando Nginx...'
systemctl reload nginx

echo '✅ Nginx configurado!'
echo ''

echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo '✅ CONFIGURAÇÃO COMPLETA!'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo ''

echo '📊 Status dos serviços:'
pm2 status
echo ''

echo '🌐 URLs:'
echo '  - Local: http://127.0.0.1:3005'
echo '  - Público: http://123testando.useiotashop.com.br'
echo ''

echo '🔍 Testando conectividade local:'
curl -s -o /dev/null -w 'Status HTTP: %{http_code}\n' http://127.0.0.1:3005

echo ''
echo '✅ Tudo pronto! Acesse: http://123testando.useiotashop.com.br'
"@

Write-Host ""
Write-Host "Conectando na VPS e executando configuração..." -ForegroundColor Yellow
Write-Host "Forneca a senha quando solicitado:" -ForegroundColor Yellow
Write-Host ""

$cleanCommand = $separateCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ CONFIGURAÇÃO COMPLETA!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Teste o acesso:" -ForegroundColor Yellow
Write-Host "http://123testando.useiotashop.com.br" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se ainda houver erro 500, execute:" -ForegroundColor Yellow
Write-Host ".\diagnosticar-vps.ps1" -ForegroundColor Cyan
Write-Host ""
