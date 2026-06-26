#!/bin/bash

# Script para verificar e corrigir o .env na VPS

echo "=== VERIFICAÇÃO DO .ENV NA VPS ==="
echo ""

# Verificar se AMAZON_TAG existe no .env
if grep -q "AMAZON_TAG" /root/affiliate-hub/.env; then
    echo "✅ AMAZON_TAG encontrada no .env:"
    grep "AMAZON_TAG" /root/affiliate-hub/.env
else
    echo "❌ AMAZON_TAG NÃO encontrada no .env"
    echo ""
    echo "Adicionando AMAZON_TAG=jota012d-20 ao .env..."
    echo "" >> /root/affiliate-hub/.env
    echo "# Tag de afiliado Amazon" >> /root/affiliate-hub/.env
    echo "AMAZON_TAG=jota012d-20" >> /root/affiliate-hub/.env
    echo "✅ AMAZON_TAG adicionada com sucesso!"
fi

echo ""
echo "=== CONTEÚDO RELEVANTE DO .ENV ==="
grep -E "(AMAZON|MERCADO|SHOPEE|MAGALU|KABUM|ALIEXPRESS)" /root/affiliate-hub/.env | head -20

echo ""
echo "=== PRÓXIMOS PASSOS ==="
echo "1. Reiniciar o Next.js: pm2 restart nextjs"
echo "2. Verificar logs: pm2 logs nextjs --lines 20"
echo "3. Testar com o link da chaleira: https://amzn.divulgador.link/JsQPa8IE"
