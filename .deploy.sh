set -e
cd ~/affiliate-hub
echo "ðŸ”„ Atualizando cÃ³digo..."
git reset --hard
git fetch origin
git reset --hard origin/master

# Sincronizar chaves locais para o VPS
SHOPEE_ID="18306580346"
SHOPEE_SECRET="PG6FXSGTSFXPC3RA23CH5SF3GWT7ZOKC"
GEMINI_KEY_VAL="AQ.Ab8RN6J6r63CQXfFZhpk_jX5nHr3S2qaINSzIhMCk8PhyVHIgw"
NVIDIA_KEY_VAL="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"
OPENROUTER_KEY_VAL="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"

echo "âš™ï¸ Sincronizando chaves locais para o VPS..."

if [ -n "18306580346" ]; then
  if grep -q 'SHOPEE_APP_ID=' ~/affiliate-hub/.env; then
    sed -i "s|SHOPEE_APP_ID=.*|SHOPEE_APP_ID=\"18306580346\"|g" ~/affiliate-hub/.env
  else
    echo "SHOPEE_APP_ID=\"18306580346\"" >> ~/affiliate-hub/.env
  fi
  if grep -q 'SHOPEE_APP_ID=' ~/affiliate-hub/bot/.env; then
    sed -i "s|SHOPEE_APP_ID=.*|SHOPEE_APP_ID=\"18306580346\"|g" ~/affiliate-hub/bot/.env
  else
    echo "SHOPEE_APP_ID=\"18306580346\"" >> ~/affiliate-hub/bot/.env
  fi
fi

if [ -n "PG6FXSGTSFXPC3RA23CH5SF3GWT7ZOKC" ]; then
  if grep -q 'SHOPEE_APP_SECRET=' ~/affiliate-hub/.env; then
    sed -i "s|SHOPEE_APP_SECRET=.*|SHOPEE_APP_SECRET=\"PG6FXSGTSFXPC3RA23CH5SF3GWT7ZOKC\"|g" ~/affiliate-hub/.env
  else
    echo "SHOPEE_APP_SECRET=\"PG6FXSGTSFXPC3RA23CH5SF3GWT7ZOKC\"" >> ~/affiliate-hub/.env
  fi
  if grep -q 'SHOPEE_APP_SECRET=' ~/affiliate-hub/bot/.env; then
    sed -i "s|SHOPEE_APP_SECRET=.*|SHOPEE_APP_SECRET=\"PG6FXSGTSFXPC3RA23CH5SF3GWT7ZOKC\"|g" ~/affiliate-hub/bot/.env
  else
    echo "SHOPEE_APP_SECRET=\"PG6FXSGTSFXPC3RA23CH5SF3GWT7ZOKC\"" >> ~/affiliate-hub/bot/.env
  fi
fi

if [ -n "" ]; then
  if grep -q 'GEMINI_API_KEY=' ~/affiliate-hub/.env; then
    sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=\"\"|g" ~/affiliate-hub/.env
  else
    echo "GEMINI_API_KEY=\"\"" >> ~/affiliate-hub/.env
  fi
  if grep -q 'GEMINI_API_KEY=' ~/affiliate-hub/bot/.env; then
    sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=\"\"|g" ~/affiliate-hub/bot/.env
  else
    echo "GEMINI_API_KEY=\"\"" >> ~/affiliate-hub/bot/.env
  fi
fi

if [ -n "" ]; then
  if grep -q 'NVIDIA_API_KEY=' ~/affiliate-hub/.env; then
    sed -i "s|NVIDIA_API_KEY=.*|NVIDIA_API_KEY=\"\"|g" ~/affiliate-hub/.env
  else
    echo "NVIDIA_API_KEY=\"\"" >> ~/affiliate-hub/.env
  fi
  if grep -q 'NVIDIA_API_KEY=' ~/affiliate-hub/bot/.env; then
    sed -i "s|NVIDIA_API_KEY=.*|NVIDIA_API_KEY=\"\"|g" ~/affiliate-hub/bot/.env
  else
    echo "NVIDIA_API_KEY=\"\"" >> ~/affiliate-hub/bot/.env
  fi
fi

if [ -n "" ]; then
  if grep -q 'OPENROUTER_API_KEY=' ~/affiliate-hub/.env; then
    sed -i "s|OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=\"\"|g" ~/affiliate-hub/.env
  else
    echo "OPENROUTER_API_KEY=\"\"" >> ~/affiliate-hub/.env
  fi
  if grep -q 'OPENROUTER_API_KEY=' ~/affiliate-hub/bot/.env; then
    sed -i "s|OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=\"\"|g" ~/affiliate-hub/bot/.env
  else
    echo "OPENROUTER_API_KEY=\"\"" >> ~/affiliate-hub/bot/.env
  fi
fi

echo "ðŸ“¦ Instalando dependÃªncias..."
npm install

echo "ðŸ—„ï¸  Sincronizando schema do banco de dados..."
npx prisma migrate deploy

echo "ðŸ”„ Executando script de swap de imagens no banco..."
node swap_images.js

echo "ðŸ—ï¸  Fazendo build do Next.js..."
rm -rf .next
rm -f public/sw.js public/workbox-*.js public/fallback-*.js public/swe-worker-*.js public/worker-*.js
NEXT_TELEMETRY_DISABLED=1 npm run build

echo "ðŸŽ¬ Convertendo vÃ­deo de entrada para MP4 (compatibilidade Android/Chrome)..."
if command -v ffmpeg &>/dev/null; then
  MOV_SRC="public/Video de entrada.mov"
  MP4_DST="public/Video de entrada.mp4"
  if [ -f "" ]; then
    if [ ! -f "" ] || [ "" -nt "" ]; then
      ffmpeg -y -i "" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "" 2>/dev/null \
        && echo "  âœ… Video de entrada.mp4 convertido com sucesso!" \
        || echo "  âš ï¸  Falha ao converter vÃ­deo â€” o .mov serÃ¡ usado como fallback"
    else
      echo "  â„¹ï¸  MP4 jÃ¡ atualizado, pulando conversÃ£o"
    fi
  else
    echo "  âš ï¸  Arquivo .mov nÃ£o encontrado em public/ â€” ignorando conversÃ£o"
  fi
else
  echo "  âš ï¸  ffmpeg nÃ£o instalado. Instale com: apt-get install -y ffmpeg"
  echo "       Sem conversÃ£o, Android nÃ£o exibirÃ¡ o vÃ­deo de entrada"
fi


echo "ðŸ¤– Configurando bot..."
cd bot
sed -i 's|AFFILIATE_HUB_URL=.*|AFFILIATE_HUB_URL=https://economizei.ftech-apps.com.br|g' ~/affiliate-hub/bot/.env
sed -i 's|AFFILIATE_HUB_API_KEY=.*|AFFILIATE_HUB_API_KEY=f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598|g' ~/affiliate-hub/bot/.env
grep -q 'AFFILIATE_HUB_API_KEY' ~/affiliate-hub/bot/.env || echo 'AFFILIATE_HUB_API_KEY=f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598' >> ~/affiliate-hub/bot/.env
sed -i 's|AFFILIATE_HUB_API_KEY=.*|AFFILIATE_HUB_API_KEY=f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598|g' ~/affiliate-hub/.env
grep -q 'TELEGRAM_PROMO_GROUP_ID' ~/affiliate-hub/bot/.env || echo 'TELEGRAM_PROMO_GROUP_ID=-5152308507' >> ~/affiliate-hub/bot/.env
grep -q 'LOMADEE_APP_TOKEN' ~/affiliate-hub/bot/.env || echo 'LOMADEE_APP_TOKEN=lmd_dev_9GWWVA5hbj_0LovGyptGY0L0QyYxZeR0QWwcnFI6k3u' >> ~/affiliate-hub/bot/.env
sed -i 's|LOMADEE_APP_TOKEN=.*|LOMADEE_APP_TOKEN=lmd_dev_9GWWVA5hbj_0LovGyptGY0L0QyYxZeR0QWwcnFI6k3u|g' ~/affiliate-hub/bot/.env
grep -q 'LOMADEE_SOURCE_ID' ~/affiliate-hub/bot/.env || echo 'LOMADEE_SOURCE_ID=2324685' >> ~/affiliate-hub/bot/.env
sed -i 's|LOMADEE_SOURCE_ID=.*|LOMADEE_SOURCE_ID=2324685|g' ~/affiliate-hub/bot/.env

pip3 install -r requirements.txt --break-system-packages

echo "ðŸ”„ Reiniciando serviÃ§os..."
cd ~/affiliate-hub

# Matar processos python Ã³rfÃ£os rodando main.py e telegram_listener.py (nohup antigo e listeners soltos)
pkill -f "python3.*main.py" || true
pkill -f "python3.*telegram_listener.py" || true
pkill -f telegram_listener.py || true

# Remover processos antigos/duplicados do PM2 se existirem
pm2 delete affiliate-bot > /dev/null 2>&1 || true
pm2 delete promobot > /dev/null 2>&1 || true
pm2 delete affiliate-listener > /dev/null 2>&1 || true
pm2 delete affiliate-hub-listener > /dev/null 2>&1 || true
pm2 delete affiliate-hub-scraper > /dev/null 2>&1 || true
pm2 delete affiliate-scraper > /dev/null 2>&1 || true
pm2 delete affiliate-hub-web > /dev/null 2>&1 || true
pm2 delete nextjs > /dev/null 2>&1 || true
pm2 delete telegram-bot > /dev/null 2>&1 || true
pm2 delete whatsapp-engine > /dev/null 2>&1 || true

# Iniciar ou recarregar os bots usando o arquivo de ecossistema
cd ~/affiliate-hub
pm2 start ecosystem.config.js

pm2 save


echo "âœ… Deploy completo!"
pm2 status
echo "ðŸŒ Next.js rodando em http://127.0.0.1:3005"
