#!/bin/bash

echo "=================================="
echo "VERIFICAÇÃO DE DEPLOY - OFERTOU"
echo "=================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se o serviço está rodando
echo -e "${YELLOW}1. Status do Serviço Next.js${NC}"
systemctl status ofertou-nextjs.service --no-pager -l | head -20
echo ""

# 2. Verificar logs recentes
echo -e "${YELLOW}2. Logs Recentes (últimas 30 linhas)${NC}"
journalctl -u ofertou-nextjs.service -n 30 --no-pager
echo ""

# 3. Verificar se o arquivo foi modificado
echo -e "${YELLOW}3. Data de Modificação do route.ts${NC}"
ls -lh /root/ofertou/src/app/api/webhook/products/route.ts
echo ""

# 4. Verificar se a função extractPlatformDetailsFromUrl foi atualizada
echo -e "${YELLOW}4. Verificando Código - Detecção de Agregadores${NC}"
if grep -q "promobit.com.br" /root/ofertou/src/app/api/webhook/products/route.ts; then
    echo -e "${GREEN}✅ Código atualizado encontrado!${NC}"
    echo "Linhas com 'promobit.com.br':"
    grep -n "promobit.com.br" /root/ofertou/src/app/api/webhook/products/route.ts
else
    echo -e "${RED}❌ Código não encontrado - Deploy pode não ter sido aplicado${NC}"
fi
echo ""

# 5. Verificar se o componente ProductsTab foi atualizado
echo -e "${YELLOW}5. Verificando ProductsTab - Badge de Agregador${NC}"
if grep -q "AGREGADOR" /root/ofertou/src/components/admin/ProductsTab.tsx; then
    echo -e "${GREEN}✅ Badge de agregador encontrado!${NC}"
    echo "Linhas com 'AGREGADOR':"
    grep -n "AGREGADOR" /root/ofertou/src/components/admin/ProductsTab.tsx | head -3
else
    echo -e "${RED}❌ Badge não encontrado - Deploy pode não ter sido aplicado${NC}"
fi
echo ""

# 6. Verificar processo Node.js
echo -e "${YELLOW}6. Processos Node.js Ativos${NC}"
ps aux | grep -E 'node|next' | grep -v grep
echo ""

# 7. Verificar porta 3000
echo -e "${YELLOW}7. Porta 3000 (Next.js)${NC}"
netstat -tlnp | grep :3000
echo ""

# 8. Tentar acessar a API localmente
echo -e "${YELLOW}8. Teste de API Local${NC}"
curl -s http://localhost:3000/api/products?status=all 2>&1 | head -c 200
echo ""
echo ""

# 9. Verificar se há erros recentes
echo -e "${YELLOW}9. Erros Recentes nos Logs${NC}"
journalctl -u ofertou-nextjs.service --since "10 minutes ago" --no-pager | grep -i "error" | tail -10
echo ""

echo "=================================="
echo "CONCLUSÃO"
echo "=================================="
echo ""
echo "Para reiniciar o serviço (se necessário):"
echo "  sudo systemctl restart ofertou-nextjs.service"
echo ""
echo "Para ver logs em tempo real:"
echo "  journalctl -u ofertou-nextjs.service -f"
echo ""
