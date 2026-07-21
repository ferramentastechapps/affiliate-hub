#!/bin/bash
set -e

echo "🔧 Corrigindo problema de porta na VPS..."

# Parar todos os processos PM2
pm2 delete all 2>/dev/null || true

# Matar qualquer processo na porta 3005
echo "🔪 Matando processos na porta 3005..."
lsof -ti:3005 | xargs kill -9 2>/dev/null || true
fuser -k 3005/tcp 2>/dev/null || true

# Matar processos Python
echo "🐍 Matando processos Python..."
pkill -9 -f main.py || true
pkill -9 -f telegram_listener.py || true

# Aguardar um pouco
sleep 2

# Ir para o diretório
cd ~/affiliate-hub

# Iniciar bots Python
echo "🤖 Iniciando bots Python..."
cd bot
nohup python3 -u main.py > bot.log 2>&1 &
nohup python3 -u telegram_listener.py > listener.log 2>&1 &

# Iniciar Next.js
echo "🚀 Iniciando Next.js..."
cd ~/affiliate-hub
pm2 start npm --name "nextjs" -- start -- -p 3005
pm2 save

echo "✅ Tudo reiniciado!"
pm2 status
echo "🌐 Next.js rodando em http://127.0.0.1:3005"
