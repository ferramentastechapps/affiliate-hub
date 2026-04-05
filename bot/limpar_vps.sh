#!/bin/bash

# Script para limpar robô antigo da VPS
# Uso: bash limpar_vps.sh

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        🧹 Limpeza de Robô Antigo na VPS                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para perguntar confirmação
confirmar() {
    read -p "$(echo -e ${YELLOW}$1 '(s/N): '${NC})" resposta
    case "$resposta" in
        [sS]|[sS][iI][mM]) return 0 ;;
        *) return 1 ;;
    esac
}

echo "🔍 Passo 1: Procurando processos Python..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ps aux | grep -E "python.*bot|python.*telegram|python.*promo" | grep -v grep

if confirmar "Deseja matar estes processos?"; then
    pkill -9 -f "bot.py"
    pkill -9 -f "telegram"
    pkill -9 -f "promo"
    echo -e "${GREEN}✅ Processos finalizados${NC}"
else
    echo -e "${YELLOW}⏭️  Pulando...${NC}"
fi

echo ""
echo "🔍 Passo 2: Procurando sessões Screen..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
screen -ls

if confirmar "Deseja matar sessões screen relacionadas a bot?"; then
    screen -ls | grep -E "bot|telegram|promo" | cut -d. -f1 | awk '{print $1}' | while read session; do
        screen -X -S $session quit 2>/dev/null
        echo "  Matando sessão: $session"
    done
    echo -e "${GREEN}✅ Sessões finalizadas${NC}"
else
    echo -e "${YELLOW}⏭️  Pulando...${NC}"
fi

echo ""
echo "🔍 Passo 3: Procurando serviços systemd..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
systemctl list-units | grep -E "bot|telegram|promo" || echo "Nenhum serviço encontrado"

if confirmar "Deseja parar serviços relacionados?"; then
    for service in bot-promo telegram-bot promo-bot; do
        sudo systemctl stop $service 2>/dev/null && echo "  Parando: $service"
        sudo systemctl disable $service 2>/dev/null && echo "  Desabilitando: $service"
    done
    echo -e "${GREEN}✅ Serviços parados${NC}"
else
    echo -e "${YELLOW}⏭️  Pulando...${NC}"
fi

echo ""
echo "🔍 Passo 4: Procurando diretórios de bot..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Procurando em ~/ ..."
find ~ -maxdepth 2 -type d -name "*bot*" -o -name "*telegram*" -o -name "*promo*" 2>/dev/null

echo ""
echo "Arquivos Python relacionados:"
find ~ -maxdepth 3 -name "*bot*.py" -o -name "*telegram*.py" 2>/dev/null | head -10

echo ""
if confirmar "Deseja ver o conteúdo de algum diretório antes de deletar?"; then
    read -p "Digite o caminho completo: " caminho
    if [ -d "$caminho" ]; then
        echo "Conteúdo de $caminho:"
        ls -lah "$caminho"
        
        if confirmar "Deseja DELETAR este diretório?"; then
            rm -rf "$caminho"
            echo -e "${GREEN}✅ Diretório removido${NC}"
        fi
    else
        echo -e "${RED}❌ Diretório não encontrado${NC}"
    fi
fi

echo ""
echo "🔍 Passo 5: Verificando cron jobs..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Cron jobs do usuário atual:"
crontab -l 2>/dev/null | grep -E "bot|telegram|promo" || echo "Nenhum cron job encontrado"

if confirmar "Deseja editar o crontab?"; then
    crontab -e
fi

echo ""
echo "🔍 Passo 6: Verificação final..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Processos Python ainda rodando:"
ps aux | grep python | grep -v grep || echo "Nenhum"

echo ""
echo "Sessões screen ativas:"
screen -ls 2>/dev/null || echo "Nenhuma"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ✅ Limpeza Concluída!                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Próximos passos:"
echo "   1. cd ~"
echo "   2. git clone https://github.com/ferramentastechapps/affiliate-hub.git"
echo "   3. cd affiliate-hub/bot"
echo "   4. pip3 install -r requirements.txt"
echo "   5. cp .env.example .env"
echo "   6. nano .env  # Configure suas credenciais"
echo "   7. python3 main.py --once  # Testar"
echo "   8. screen -S promo-bot"
echo "   9. python3 main.py"
echo ""
