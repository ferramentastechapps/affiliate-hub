$ErrorActionPreference = "Stop"

Write-Host "Preparando para o envio (Shipping) das atualizacoes..." -ForegroundColor Cyan

# Adicionar todas as mudancas
git add .

# Pedir mensagem do commit
$Msg = Read-Host "Mensagem do commit (pressione Enter para usar o padrao 'Ship update')"

if ([string]::IsNullOrWhiteSpace($Msg)) {
    $Msg = "Ship update"
}

# Realizar o commit
git commit -m $Msg

# Descobrir o nome da branch atual para dar push corretamente
$Branch = git branch --show-current
if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = "main"
}

Write-Host "Realizando o push para a branch $Branch..." -ForegroundColor Yellow
git push origin $Branch

Write-Host "Atualizacao enviada ao Github com sucesso!" -ForegroundColor Green

Write-Host "Iniciando Deploy na VPS (root@212.85.10.239)..." -ForegroundColor Cyan
Write-Host "Forneca a senha da VPS quando solicitado:" -ForegroundColor Yellow

# O comando SSH reformulado e robusto para evitar quebra de linhas e skips.
$sshCommand = @"
set -e
cd ~/affiliate-hub
echo "🔄 Atualizando código..."
git reset --hard
git fetch origin
git reset --hard origin/$Branch

# Sincronizar GEMINI_API_KEY do bot/.env para o root .env
GEMINI_KEY=`$(grep 'GEMINI_API_KEY=' ~/affiliate-hub/bot/.env | cut -d'=' -f2-)
if [ -n "`$GEMINI_KEY" ]; then
  if grep -q 'GEMINI_API_KEY=' ~/affiliate-hub/.env; then
    # Escapa caracteres especiais para o sed
    ESCAPED_KEY=`$(echo "`$GEMINI_KEY" | sed 's/[&/]/\\&/g')
    sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=`$ESCAPED_KEY|g" ~/affiliate-hub/.env
  else
    echo "GEMINI_API_KEY=`$GEMINI_KEY" >> ~/affiliate-hub/.env
  fi
  echo "✅ GEMINI_API_KEY sincronizada para o root .env"
else
  echo "⚠️ GEMINI_API_KEY não encontrada no bot/.env"
fi

echo "📦 Instalando dependências..."
npm install

echo "🗄️  Sincronizando schema do banco de dados..."
npx prisma db push --accept-data-loss

echo "🏗️  Fazendo build do Next.js..."
rm -rf .next
npm run build

echo "🤖 Configurando bot..."
cd bot
sed -i 's|AFFILIATE_HUB_URL=.*|AFFILIATE_HUB_URL=http://127.0.0.1:3005|g' ~/affiliate-hub/bot/.env
sed -i 's|AFFILIATE_HUB_API_KEY=.*|AFFILIATE_HUB_API_KEY=f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598|g' ~/affiliate-hub/bot/.env
grep -q 'AFFILIATE_HUB_API_KEY' ~/affiliate-hub/bot/.env || echo 'AFFILIATE_HUB_API_KEY=f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598' >> ~/affiliate-hub/bot/.env
sed -i 's|AFFILIATE_HUB_API_KEY=.*|AFFILIATE_HUB_API_KEY=f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598|g' ~/affiliate-hub/.env
grep -q 'TELEGRAM_PROMO_GROUP_ID' ~/affiliate-hub/bot/.env || echo 'TELEGRAM_PROMO_GROUP_ID=-5152308507' >> ~/affiliate-hub/bot/.env
pip3 install -r requirements.txt --break-system-packages

echo "🔄 Reiniciando serviços..."
cd ~/affiliate-hub

# Reiniciar ou criar o Next.js no PM2
if pm2 list | grep -q "nextjs"; then
  pm2 restart nextjs
else
  pm2 start npm --name "nextjs" -- start -- -p 3005
fi

# Matar processos python órfãos rodando main.py e telegram_listener.py (nohup antigo)
pkill -f "python3.*main.py" || true
pkill -f "python3.*telegram_listener.py" || true

# Remover processos antigos/duplicados do PM2 se existirem
pm2 delete affiliate-bot || true
pm2 delete promobot || true
pm2 delete affiliate-listener || true
pm2 delete affiliate-hub-listener || true
pm2 delete affiliate-hub-scraper || true
pm2 delete affiliate-scraper || true

# Iniciar ou recarregar os bots usando o arquivo de ecossistema
cd ~/affiliate-hub
pm2 start ecosystem.config.js

pm2 save


echo "✅ Deploy completo!"
pm2 status
echo "🌐 Next.js rodando em http://127.0.0.1:3005"
"@

# Envia o script à VPS como um pacote sólido para não engolir chamadas
$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"

Write-Host "Deploy na VPS finalizado e sistemas rodando!" -ForegroundColor Green
