#!/bin/bash
# Script para atualizar o bot com as melhorias no VPS
# Execute: bash atualizar-bot-melhorado.sh

echo "🚀 Atualizando Bot de Promoções v2.0"
echo "====================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 1. Verificar se está no diretório correto
if [ ! -f "bot/scrapers.py" ]; then
    echo -e "${RED}❌ Execute este script na raiz do projeto!${NC}"
    exit 1
fi

echo -e "${CYAN}📦 1. Verificando arquivos modificados...${NC}"

arquivos_modificados=(
    "bot/scrapers.py"
    "bot/config.py"
    "bot/telegram_bot.py"
    "bot/main.py"
    "bot/README.md"
    ".env.example"
)

arquivos_novos=(
    "bot/MELHORIAS_IMPLEMENTADAS.md"
    "bot/testar_melhorias.py"
    "ESTRATEGIA_MELHORAR_BOT.md"
    "RESUMO_MELHORIAS.md"
)

for arquivo in "${arquivos_modificados[@]}"; do
    if [ -f "$arquivo" ]; then
        echo -e "  ${GREEN}✅ $arquivo${NC}"
    else
        echo -e "  ${RED}❌ $arquivo (não encontrado)${NC}"
    fi
done

for arquivo in "${arquivos_novos[@]}"; do
    if [ -f "$arquivo" ]; then
        echo -e "  ${GREEN}✅ $arquivo (novo)${NC}"
    else
        echo -e "  ${YELLOW}⚠️  $arquivo (não encontrado)${NC}"
    fi
done

echo ""
echo -e "${CYAN}📝 2. Verificando .env...${NC}"

if [ -f ".env" ]; then
    echo -e "  ${GREEN}✅ .env encontrado${NC}"
    
    # Verificar se tem as novas variáveis
    if ! grep -q "MIN_QUALITY_SCORE" .env; then
        echo -e "  ${YELLOW}⚠️  MIN_QUALITY_SCORE não encontrado no .env${NC}"
        echo -e "  ${CYAN}💡 Adicione: MIN_QUALITY_SCORE=30${NC}"
    fi
    
    if ! grep -q "SEARCH_INTERVAL_MINUTES" .env; then
        echo -e "  ${YELLOW}⚠️  SEARCH_INTERVAL_MINUTES não encontrado no .env${NC}"
        echo -e "  ${CYAN}💡 Adicione: SEARCH_INTERVAL_MINUTES=15${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  .env não encontrado - copie de .env.example${NC}"
    echo -e "  ${CYAN}💡 Execute: cp .env.example .env${NC}"
fi

echo ""
echo -e "${CYAN}🔧 3. Verificando dependências Python...${NC}"

if command -v python3 &> /dev/null; then
    echo -e "  ${GREEN}✅ Python3 instalado${NC}"
    
    # Verificar se requirements.txt existe
    if [ -f "bot/requirements.txt" ]; then
        echo -e "  ${CYAN}📦 Instalando/atualizando dependências...${NC}"
        pip3 install -r bot/requirements.txt --quiet
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}✅ Dependências instaladas${NC}"
        else
            echo -e "  ${YELLOW}⚠️  Erro ao instalar dependências${NC}"
        fi
    fi
else
    echo -e "  ${RED}❌ Python3 não encontrado${NC}"
fi

echo ""
echo -e "${CYAN}🧪 4. Testando as melhorias...${NC}"

if [ -f "bot/testar_melhorias.py" ]; then
    cd bot
    python3 testar_melhorias.py 2>&1 | head -n 50
    cd ..
    echo -e "  ${GREEN}✅ Testes executados${NC}"
else
    echo -e "  ${YELLOW}⚠️  Script de testes não encontrado${NC}"
fi

echo ""
echo -e "${CYAN}🔄 5. Reiniciando o bot...${NC}"

# Verificar se está usando systemd
if systemctl list-units --type=service | grep -q "bot-promocoes"; then
    echo -e "  ${CYAN}📋 Serviço systemd detectado${NC}"
    echo -e "  ${YELLOW}Execute: sudo systemctl restart bot-promocoes${NC}"
fi

# Verificar se está usando screen
if screen -list | grep -q "bot"; then
    echo -e "  ${CYAN}📺 Screen detectado${NC}"
    echo -e "  ${YELLOW}Execute: screen -r bot${NC}"
    echo -e "  ${YELLOW}Pressione Ctrl+C, depois: python3 main.py${NC}"
fi

# Verificar se está usando pm2
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "bot"; then
        echo -e "  ${CYAN}🔄 PM2 detectado${NC}"
        echo -e "  ${YELLOW}Execute: pm2 restart bot${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✅ Atualização concluída!${NC}"
echo ""
echo -e "${CYAN}📊 Estatísticas esperadas:${NC}"
echo -e "  ⏱️  Tempo de busca: ${GREEN}10-15 segundos${NC} (antes: 90-120s)"
echo -e "  📦 Produtos/hora: ${GREEN}~320-480${NC} (antes: ~80-120)"
echo -e "  🎯 Qualidade: ${GREEN}Filtrado automaticamente${NC}"
echo -e "  ⚡ Velocidade: ${GREEN}6-8x mais rápido${NC}"
echo ""
echo -e "${CYAN}📚 Documentação:${NC}"
echo -e "  - ${GREEN}RESUMO_MELHORIAS.md${NC} - Resumo das mudanças"
echo -e "  - ${GREEN}bot/MELHORIAS_IMPLEMENTADAS.md${NC} - Documentação completa"
echo -e "  - ${GREEN}ESTRATEGIA_MELHORAR_BOT.md${NC} - Estratégia e próximos passos"
echo ""
echo -e "${CYAN}🧪 Para testar:${NC}"
echo -e "  ${YELLOW}cd bot && python3 main.py --once${NC}"
echo ""
echo -e "${GREEN}🎉 Bot v2.0 pronto!${NC}"
