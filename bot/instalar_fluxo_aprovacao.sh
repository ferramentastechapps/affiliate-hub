#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 INSTALAÇÃO DO FLUXO DE APROVAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script na raiz do projeto (/root/affiliate-hub)"
    exit 1
fi

echo "📋 Passo 1: Atualizando schema do banco de dados..."
npx prisma db push

if [ $? -ne 0 ]; then
    echo "❌ Erro ao atualizar o banco de dados"
    exit 1
fi

echo "✅ Schema atualizado com sucesso!"
echo ""

echo "📋 Passo 2: Marcando produtos existentes como 'pending'..."
cd bot
python3 marcar_produtos_pending.py

if [ $? -ne 0 ]; then
    echo "⚠️ Aviso: Erro ao marcar produtos, mas continuando..."
fi

cd ..
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ INSTALAÇÃO CONCLUÍDA!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1️⃣ Iniciar o Telegram Listener:"
echo "   cd bot"
echo "   screen -S telegram-listener -dm python3 telegram_listener.py"
echo ""
echo "2️⃣ Iniciar o Robô de Scraping:"
echo "   cd bot"
echo "   screen -S bot -dm python3 main.py"
echo ""
echo "3️⃣ Verificar se está rodando:"
echo "   screen -ls"
echo ""
echo "4️⃣ Ver logs do listener:"
echo "   screen -r telegram-listener"
echo "   (Ctrl+A, D para desanexar)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Comandos do Telegram:"
echo ""
echo "   /aprovar [ID] [LINK]  - Aprovar produto"
echo "   /rejeitar [ID]        - Rejeitar produto"
echo "   /help                 - Ver ajuda"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Leia FLUXO_APROVACAO.md para mais detalhes"
echo ""
