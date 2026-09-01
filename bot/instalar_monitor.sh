#!/bin/bash
# ============================================================
# INSTALAR MONITOR — Execute na VPS com:
#   bash /root/affiliate-hub/bot/instalar_monitor.sh
# ============================================================
set -e

cd /root/affiliate-hub

echo ""
echo "🔄 Atualizando código..."
git pull origin master

echo ""
echo "🔑 Configurando credenciais Telethon no .env da VPS..."
# Remover entradas antigas se existirem
sed -i '/TELEGRAM_API_ID=/d' .env 2>/dev/null || true
sed -i '/TELEGRAM_API_HASH=/d' .env 2>/dev/null || true
sed -i '/TELEGRAM_API_ID=/d' bot/.env 2>/dev/null || true
sed -i '/TELEGRAM_API_HASH=/d' bot/.env 2>/dev/null || true

# Adicionar as novas credenciais
echo "" >> .env
echo "# Telethon - Monitor do Grupo Telegram" >> .env
echo "TELEGRAM_API_ID=39619505" >> .env
echo "TELEGRAM_API_HASH=2861d4450992ad311f4af46d14b28982" >> .env

echo "" >> bot/.env
echo "# Telethon - Monitor do Grupo Telegram" >> bot/.env
echo "TELEGRAM_API_ID=39619505" >> bot/.env
echo "TELEGRAM_API_HASH=2861d4450992ad311f4af46d14b28982" >> bot/.env

echo "✅ Credenciais configuradas!"

echo ""
echo "📦 Instalando Telethon..."
cd bot
pip install telethon -q
echo "✅ Telethon instalado!"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 PRÓXIMO PASSO — Autenticar sua conta Telegram"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Execute AGORA (vai pedir seu número e o código SMS):"
echo ""
echo "   python3 telegram_group_monitor.py --setup"
echo ""
echo "Depois de autenticar, ative no PM2:"
echo ""
echo "   cd /root/affiliate-hub"
echo "   pm2 start ecosystem.config.js --only telegram-group-monitor"
echo "   pm2 save"
echo "   pm2 logs telegram-group-monitor"
echo ""