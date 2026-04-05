#!/bin/bash

# Script SEGURO para limpar apenas robô de promoções
# NÃO afeta outros robôs (day trade, etc)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🛡️  Limpeza SEGURA - Apenas Robô de Promoções          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}⚠️  Este script NÃO vai afetar outros robôs (day trade, etc)${NC}"
echo -e "${YELLOW}⚠️  Você vai confirmar CADA ação antes de executar${NC}"
echo ""
read -p "Pressione ENTER para continuar..."

# ============================================================
# PASSO 1: Identificar processos
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PASSO 1: Identificar processos Python"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Processos Python rodando:"
echo ""

ps aux | grep python | grep -v grep | nl

echo ""
echo -e "${BLUE}📝 Identifique o número da linha do processo de PROMOÇÕES${NC}"
echo -e "${RED}❌ NÃO escolha o processo de day trade ou outros!${NC}"
echo ""

read -p "Digite o PID do processo de PROMOÇÕES (ou 0 para pular): " pid

if [ "$pid" != "0" ] && [ ! -z "$pid" ]; then
    echo ""
    echo "Detalhes do processo $pid:"
    ps -p $pid -o pid,cmd 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo ""
        read -p "$(echo -e ${YELLOW}Confirma que este é o processo de PROMOÇÕES? '(s/N): '${NC})" confirma
        
        if [ "$confirma" = "s" ] || [ "$confirma" = "S" ]; then
            kill -9 $pid 2>/dev/null
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Processo $pid finalizado${NC}"
            else
                echo -e "${RED}❌ Erro ao finalizar processo${NC}"
            fi
        else
            echo -e "${YELLOW}⏭️  Processo não finalizado${NC}"
        fi
    else
        echo -e "${RED}❌ Processo não encontrado${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Pulando...${NC}"
fi

# ============================================================
# PASSO 2: Sessões Screen
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PASSO 2: Verificar sessões Screen"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

screen -ls 2>/dev/null

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${BLUE}📝 Identifique a sessão de PROMOÇÕES${NC}"
    echo -e "${RED}❌ NÃO escolha a sessão de day trade!${NC}"
    echo ""
    
    read -p "Digite o ID da sessão de PROMOÇÕES (ex: 12345.promocoes) ou deixe vazio para pular: " session
    
    if [ ! -z "$session" ]; then
        echo ""
        read -p "$(echo -e ${YELLOW}Confirma que '$session' é a sessão de PROMOÇÕES? '(s/N): '${NC})" confirma
        
        if [ "$confirma" = "s" ] || [ "$confirma" = "S" ]; then
            screen -X -S $session quit 2>/dev/null
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Sessão $session finalizada${NC}"
            else
                echo -e "${RED}❌ Erro ao finalizar sessão${NC}"
            fi
        else
            echo -e "${YELLOW}⏭️  Sessão não finalizada${NC}"
        fi
    else
        echo -e "${YELLOW}⏭️  Pulando...${NC}"
    fi
else
    echo "Nenhuma sessão screen encontrada"
fi

# ============================================================
# PASSO 3: Diretórios
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PASSO 3: Encontrar diretório de promoções"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Diretórios no home que podem ser relacionados:"
echo ""

ls -la ~/ | grep -E "bot|promo|telegram" | grep "^d"

echo ""
echo -e "${BLUE}📝 Identifique o diretório de PROMOÇÕES${NC}"
echo -e "${RED}❌ NÃO escolha o diretório de day trade!${NC}"
echo ""

read -p "Digite o NOME do diretório de promoções (ex: bot-promocoes) ou deixe vazio para pular: " dirname

if [ ! -z "$dirname" ]; then
    dirpath="$HOME/$dirname"
    
    if [ -d "$dirpath" ]; then
        echo ""
        echo "Conteúdo de $dirpath:"
        ls -la "$dirpath" | head -20
        
        echo ""
        echo "Primeiras linhas de arquivos Python:"
        find "$dirpath" -name "*.py" -type f | head -3 | while read file; do
            echo ""
            echo "--- $file ---"
            head -5 "$file"
        done
        
        echo ""
        read -p "$(echo -e ${YELLOW}Confirma que '$dirpath' é o diretório de PROMOÇÕES? '(s/N): '${NC})" confirma
        
        if [ "$confirma" = "s" ] || [ "$confirma" = "S" ]; then
            # Fazer backup
            backup="$dirpath-backup-$(date +%Y%m%d-%H%M%S)"
            echo ""
            echo "Criando backup em: $backup"
            cp -r "$dirpath" "$backup"
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Backup criado com sucesso${NC}"
                
                echo ""
                read -p "$(echo -e ${RED}ÚLTIMA CONFIRMAÇÃO: Deletar '$dirpath'? '(s/N): '${NC})" confirma2
                
                if [ "$confirma2" = "s" ] || [ "$confirma2" = "S" ]; then
                    rm -rf "$dirpath"
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}✅ Diretório removido${NC}"
                    else
                        echo -e "${RED}❌ Erro ao remover diretório${NC}"
                    fi
                else
                    echo -e "${YELLOW}⏭️  Diretório não removido${NC}"
                fi
            else
                echo -e "${RED}❌ Erro ao criar backup. Diretório NÃO foi removido.${NC}"
            fi
        else
            echo -e "${YELLOW}⏭️  Diretório não removido${NC}"
        fi
    else
        echo -e "${RED}❌ Diretório não encontrado: $dirpath${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Pulando...${NC}"
fi

# ============================================================
# VERIFICAÇÃO FINAL
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VERIFICAÇÃO FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Processos Python ainda rodando:"
ps aux | grep python | grep -v grep || echo "Nenhum"

echo ""
echo "Sessões screen ativas:"
screen -ls 2>/dev/null || echo "Nenhuma"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ Limpeza Segura Concluída!                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Seu robô de day trade deve estar intacto!${NC}"
echo ""
echo "Verifique:"
echo "  ps aux | grep daytrade"
echo ""
echo "Próximos passos:"
echo "  1. cd ~"
echo "  2. git clone https://github.com/ferramentastechapps/affiliate-hub.git"
echo "  3. cd affiliate-hub/bot"
echo "  4. pip3 install -r requirements.txt"
echo "  5. cp .env.example .env"
echo "  6. nano .env"
echo "  7. python3 main.py --once"
echo ""
