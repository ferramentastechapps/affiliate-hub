#!/bin/bash
# Script para rodar diagnóstico na VPS

echo "🤖 Iniciando diagnóstico completo..."
echo ""

cd /root/affiliate-hub/bot || exit 1

# Ativar ambiente virtual se existir
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Rodar diagnóstico
python3 diagnostico_completo.py

echo ""
echo "✅ Diagnóstico concluído!"
echo ""
echo "📋 Para ver os logs do robô em tempo real:"
echo "   tail -f /root/affiliate-hub/bot/bot.log"
