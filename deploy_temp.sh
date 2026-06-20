#!/bin/bash
set -e
cd ~/affiliate-hub
echo "🔄 Atualizando código..."
git reset --hard
git fetch origin
git reset --hard origin/master

# Sincronizar GEMINI_API_KEY do bot/.env para o root .env
GEMINI_KEY=$(grep 'GEMINI_API_KEY=' ~/affiliate-hub/bot/.env | cut -d'=' -f2-)
if [ -n "$GEMINI_KEY" ]; then
  if grep -q 'GEMINI_API_KEY=' ~/affiliate-hub/.env; then
    ESCAPED_KEY=$(echo "$GEMINI_KEY" | sed 's/[&/]/\\&/g')
    sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=$ESCAPED_KEY|g" ~/affiliate-hub/.env
  else
    echo "GEMINI_API_KEY=$GEMINI_KEY" >> ~/affiliate-hub/.env
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
grep -q 'LOMADEE_APP_TOKEN' ~/affiliate-hub/bot/.env || echo 'LOMADEE_APP_TOKEN=lmd_dev_9GWWVA5hbj_0LovGyptGY0L0QyYxZeR0QWwcnFI6k3u' >> ~/affiliate-hub/bot/.env
sed -i 's|LOMADEE_APP_TOKEN=.*|LOMADEE_APP_TOKEN=lmd_dev_9GWWVA5hbj_0LovGyptGY0L0QyYxZeR0QWwcnFI6k3u|g' ~/affiliate-hub/bot/.env
grep -q 'LOMADEE_SOURCE_ID' ~/affiliate-hub/bot/.env || echo 'LOMADEE_SOURCE_ID=2324685' >> ~/affiliate-hub/bot/.env
sed -i 's|LOMADEE_SOURCE_ID=.*|LOMADEE_SOURCE_ID=2324685|g' ~/affiliate-hub/bot/.env
pip3 install -r requirements.txt --break-system-packages

echo "🔄 Reiniciando serviços..."
cd ~/affiliate-hub

# Matar processos python órfãos rodando main.py e telegram_listener.py (nohup antigo e listeners soltos)
pkill -f "python3.*main.py" || true
pkill -f "python3.*telegram_listener.py" || true
pkill -f telegram_listener.py || true

# Remover processos antigos/duplicados do PM2 se existirem
pm2 delete affiliate-bot || true
pm2 delete promobot || true
pm2 delete affiliate-listener || true
pm2 delete affiliate-hub-listener || true
pm2 delete affiliate-hub-scraper || true
pm2 delete affiliate-scraper || true
pm2 delete affiliate-hub-web || true
pm2 delete nextjs || true

# Iniciar ou recarregar os bots usando o arquivo de ecossistema
cd ~/affiliate-hub
pm2 start ecosystem.config.js
pm2 save

echo "✅ Deploy completo!"
pm2 status
echo "🌐 Next.js rodando em http://127.0.0.1:3005"
