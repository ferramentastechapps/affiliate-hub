# 🔍 Teste Rápido - Verificar ID do Produto

## O que foi corrigido

1. **API agora retorna explicitamente o ID** - O endpoint `/api/webhook/products` agora retorna todos os campos do produto de forma explícita, incluindo o `id`

2. **Logs de debug adicionados** - Tanto no Next.js quanto no Python para rastrear onde o ID pode estar se perdendo

3. **Script de teste criado** - `test_webhook_simple.py` para testar diretamente o webhook

## Como testar

### Opção 1: Teste Direto do Webhook (Recomendado)

```bash
cd /root/affiliate-hub/bot
python3 test_webhook_simple.py
```

Este script vai:
- Criar um produto de teste
- Mostrar a resposta completa da API
- Verificar se o campo `id` está presente

### Opção 2: Teste Completo com o Bot

```bash
# Terminal 1: Iniciar o Next.js (se não estiver rodando)
cd /root/affiliate-hub
npm run dev

# Terminal 2: Rodar o bot uma vez
cd /root/affiliate-hub/bot
python3 main.py --once
```

Observe os logs:
- No Next.js: `✅ Produto criado: { id: '...', name: '...', hasId: true, ... }`
- No Python: `🔍 DEBUG - Resultado da API completo: ...`

## O que esperar

### ✅ Sucesso

Você deve ver no Telegram:
```
🔥 NOVO PRODUTO ENCONTRADO!
⚠️ AGUARDANDO APROVAÇÃO

📦 Nome do Produto
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PARA APROVAR, envie:

/aprovar clxyz123abc [SEU_LINK]

🚫 Para rejeitar:
/rejeitar clxyz123abc
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 ID do Produto:
clxyz123abc
```

### ❌ Se ainda mostrar N/A

Compartilhe os logs completos:
1. Log do Next.js (terminal onde rodou `npm run dev`)
2. Log do Python (saída do `python3 main.py --once`)

## Próximos passos após confirmar que funciona

1. Remover os logs de debug (procurar por `🔍 DEBUG` nos arquivos)
2. Reiniciar o bot em modo produção
3. Testar o fluxo completo de aprovação

## Estrutura esperada da resposta da API

```json
{
  "success": true,
  "product": {
    "id": "clxyz123abc",
    "name": "Nome do Produto",
    "category": "Categoria",
    "description": "Descrição",
    "imageUrl": "https://...",
    "price": 99.99,
    "originalPrice": 199.99,
    "status": "pending",
    "createdAt": "2026-04-19T...",
    "updatedAt": "2026-04-19T...",
    "links": {
      "id": "...",
      "productId": "clxyz123abc",
      "amazon": "https://...",
      ...
    }
  }
}
```

O campo `product.id` é o que o bot precisa para enviar no Telegram.
