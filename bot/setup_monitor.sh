#!/bin/bash
# ============================================================
# SETUP DO MONITOR DO GRUPO TELEGRAM
# Execute este script na VPS para instalar e configurar
# ============================================================

set -e

echo ""
echo "🚀 Setup — Telegram Group Monitor"
echo "=================================================="

cd /root/affiliate-hub/bot

# 1. Instalar Telethon
echo ""
echo "📦 [1/4] Instalando Telethon..."
pip install telethon>=1.36.0 -q
echo "✅ Telethon instalado!"

# 2. Verificar credenciais
echo ""
echo "🔑 [2/4] Verificando credenciais..."
source /root/affiliate-hub/.env
if [ -z "" ] || [ -z "" ]; then
    echo "❌ TELEGRAM_API_ID ou TELEGRAM_API_HASH não configurados!"
    echo ""
    echo "Passos:"
    echo "  1. Acesse: https://my.telegram.org/apps"
    echo "  2. Faça login com seu número de telefone"
    echo "  3. Crie um app (nome qualquer)"
    echo "  4. Copie api_id e api_hash"
    echo "  5. Adicione ao .env:"
    echo "     TELEGRAM_API_ID=seu_api_id"
    echo "     TELEGRAM_API_HASH=seu_api_hash"
    echo ""
    exit 1
fi
echo "✅ Credenciais encontradas! API_ID: "

# 3. Autenticar conta Telegram (interativo)
echo ""
echo "📱 [3/4] Autenticando conta Telegram..."
echo "   (Você precisará do código enviado pelo Telegram)"
echo ""
python3 telegram_group_monitor.py --setup

# 4. Iniciar no PM2
echo ""
echo "⚙️  [4/4] Iniciando no PM2..."
cd /root/affiliate-hub
pm2 start ecosystem.config.js --only telegram-group-monitor
pm2 save

echo ""
echo "🎉 Setup concluído!"
echo ""
echo "📊 Status:"
pm2 status telegram-group-monitor
echo ""
echo "📋 Logs:"
echo "   pm2 logs telegram-group-monitor"