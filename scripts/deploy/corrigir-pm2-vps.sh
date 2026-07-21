#!/bin/bash
set -e

echo "===================================================="
echo "🧹 CORRIGINDO PM2 E DIRETORIO NA VPS"
echo "===================================================="
echo ""

echo "1. Deletando o processo nextjs antigo do PM2..."
pm2 delete nextjs || true
echo ""

echo "2. Garantindo que a porta 3005 esteja livre..."
fuser -k 3005/tcp 2>/dev/null || true
lsof -ti:3005 | xargs kill -9 2>/dev/null || true
echo "Porta 3005 limpa."
echo ""

echo "3. Entrando na pasta correta do projeto..."
cd /root/affiliate-hub
echo "Diretório atual: $(pwd)"
echo ""

echo "4. Fazendo build limpo do Next.js..."
rm -rf .next
npm run build
echo ""

echo "5. Iniciando Next.js no PM2 na pasta CORRETA..."
pm2 start npm --name "nextjs" --cwd "/root/affiliate-hub" -- start -- -p 3005
echo ""

echo "6. Salvando configurações do PM2..."
pm2 save
echo ""

echo "===================================================="
echo "📊 STATUS DOS SERVIÇOS NO PM2"
echo "===================================================="
pm2 status
echo ""

echo "===================================================="
echo "🧪 TESTANDO CONECTIVIDADE LOCAL NA PORTA 3005"
echo "===================================================="
curl -s -o /dev/null -w "Status da porta 3005: %{http_code}\n" http://127.0.0.1:3005
echo ""

echo "===================================================="
echo "✅ CONCLUÍDO! O SITE DEVE CARREGAR O NOVO LAYOUT"
echo "===================================================="
