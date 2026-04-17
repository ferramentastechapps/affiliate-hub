# 🧪 Como Testar o Fluxo de Aprovação

## 📋 Pré-requisitos

1. Banco de dados atualizado com campo `status`
2. Telegram Listener rodando
3. Robô de scraping rodando (opcional para teste manual)

## 🔧 Teste Manual (Sem Robô)

### Passo 1: Criar um Produto de Teste

```bash
curl -X POST http://localhost:3000/api/webhook/products \
  -H "Content-Type: application/json" \
  -H "x-api-key: SEU_API_KEY" \
  -d '{
    "name": "Mouse Gamer Teste RGB",
    "category": "gaming",
    "description": "Mouse para teste do fluxo de aprovação",
    "imageUrl": "https://via.placeholder.com/400",
    "price": 89.90,
    "links": {
      "amazon": "https://promobit.com.br/exemplo"
    }
  }'
```

**Resultado esperado:**
- Produto criado com `status: "pending"`
- Produto NÃO aparece no site
- Você recebe mensagem no Telegram

### Passo 2: Verificar no Banco

```bash
sqlite3 prisma/dev.db "SELECT id, name, status FROM Product ORDER BY createdAt DESC LIMIT 1;"
```

**Resultado esperado:**
```
clxyz123|Mouse Gamer Teste RGB|pending
```

### Passo 3: Verificar no Site

Acesse: `http://localhost:3000`

**Resultado esperado:**
- Produto NÃO aparece na listagem

### Passo 4: Aprovar via Telegram

No Telegram, envie:
```
/aprovar clxyz123 https://amzn.to/meulink123
```

**Resultado esperado:**
```
✅ Produto Aprovado com Sucesso!
🆔 ID: clxyz123
🏪 Plataforma: amazon
O produto agora está visível no site!
```

### Passo 5: Verificar Aprovação

```bash
sqlite3 prisma/dev.db "SELECT id, name, status FROM Product WHERE id='clxyz123';"
```

**Resultado esperado:**
```
clxyz123|Mouse Gamer Teste RGB|active
```

### Passo 6: Verificar no Site

Acesse: `http://localhost:3000`

**Resultado esperado:**
- Produto APARECE na listagem
- Link aponta para `https://amzn.to/meulink123`

## 🤖 Teste com Robô

### Passo 1: Executar Busca Única

```bash
cd /root/affiliate-hub/bot
python3 main.py --once
```

**Resultado esperado:**
- Robô busca produtos no Promobit
- Produtos salvos com `status: "pending"`
- Mensagens enviadas para Telegram

### Passo 2: Verificar Telegram

Você deve receber mensagens como:

```
🔥 NOVO PRODUTO ENCONTRADO!
⚠️ AGUARDANDO APROVAÇÃO

📦 [Nome do Produto]
🏷️ [Categoria]
💰 R$ [Preço]

/aprovar [ID] [SEU_LINK]
/rejeitar [ID]

ID_DO_PRODUTO: [ID]
```

### Passo 3: Aprovar ou Rejeitar

**Aprovar:**
```
/aprovar [ID] https://amzn.to/seulink
```

**Rejeitar:**
```
/rejeitar [ID]
```

## 🔍 Comandos de Verificação

### Ver Todos os Produtos por Status

```bash
sqlite3 prisma/dev.db "SELECT status, COUNT(*) as total FROM Product GROUP BY status;"
```

**Resultado esperado:**
```
pending|5
active|10
rejected|2
```

### Ver Últimos 5 Produtos Pendentes

```bash
sqlite3 prisma/dev.db "SELECT id, name, status FROM Product WHERE status='pending' ORDER BY createdAt DESC LIMIT 5;"
```

### Ver Últimos 5 Produtos Ativos

```bash
sqlite3 prisma/dev.db "SELECT id, name, status FROM Product WHERE status='active' ORDER BY createdAt DESC LIMIT 5;"
```

### Ver Links de um Produto

```bash
sqlite3 prisma/dev.db "SELECT p.name, l.amazon, l.shopee FROM Product p LEFT JOIN Link l ON p.id = l.productId WHERE p.id='clxyz123';"
```

## 🧹 Limpar Produtos de Teste

### Deletar Produto Específico

```bash
sqlite3 prisma/dev.db "DELETE FROM Product WHERE name LIKE '%Teste%';"
```

### Marcar Todos como Pending (Reset)

```bash
cd /root/affiliate-hub/bot
python3 marcar_produtos_pending.py
```

## 📊 Testes de API

### Testar Rota de Aprovação

```bash
curl -X POST http://localhost:3000/api/webhook/products/approve \
  -H "Content-Type: application/json" \
  -H "x-api-key: SEU_API_KEY" \
  -d '{
    "productId": "clxyz123",
    "platform": "amazon",
    "affiliateLink": "https://amzn.to/teste123"
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Produto aprovado e link atualizado",
  "productId": "clxyz123",
  "platform": "amazon"
}
```

### Testar Rota de Rejeição

```bash
curl -X POST http://localhost:3000/api/webhook/products/reject \
  -H "Content-Type: application/json" \
  -H "x-api-key: SEU_API_KEY" \
  -d '{
    "productId": "clxyz123"
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Produto rejeitado",
  "productId": "clxyz123"
}
```

### Testar Filtro de Produtos Ativos

```bash
curl http://localhost:3000/api/products | jq '.[] | {id, name, status}'
```

**Resultado esperado:**
- Apenas produtos com `status: "active"`

## ✅ Checklist de Testes

- [ ] Produto criado fica com status "pending"
- [ ] Produto pending NÃO aparece no site
- [ ] Mensagem chega no Telegram com instruções
- [ ] Comando /aprovar funciona
- [ ] Status muda para "active" após aprovação
- [ ] Link de afiliado é atualizado
- [ ] Produto aprovado APARECE no site
- [ ] Comando /rejeitar funciona
- [ ] Produto rejeitado NÃO aparece no site
- [ ] Comando /help mostra instruções
- [ ] Detecção automática de plataforma funciona

## 🐛 Problemas Comuns

### "status field not found"
```bash
# Solução: Atualizar banco
npx prisma db push
```

### Listener não responde
```bash
# Solução: Verificar se está rodando
screen -r telegram-listener

# Se não estiver, iniciar
screen -S telegram-listener -dm python3 telegram_listener.py
```

### Produto não aparece após aprovação
```bash
# Verificar status no banco
sqlite3 prisma/dev.db "SELECT id, name, status FROM Product WHERE id='[ID]';"

# Se estiver "pending", aprovar novamente
/aprovar [ID] [LINK]
```

### Erro ao aprovar
```bash
# Verificar logs do listener
screen -r telegram-listener

# Verificar se API está rodando
curl http://localhost:3000/api/products
```

## 📝 Notas

- Use IDs reais dos produtos (começam com `cl` geralmente)
- Links devem começar com `http://` ou `https://`
- Plataforma é detectada automaticamente pelo link
- Produtos rejeitados ficam no banco mas não aparecem

## 🎯 Teste Completo End-to-End

```bash
# 1. Criar produto
curl -X POST http://localhost:3000/api/webhook/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste E2E","category":"test","imageUrl":"https://via.placeholder.com/400","price":99.90}'

# 2. Pegar ID do produto
ID=$(sqlite3 prisma/dev.db "SELECT id FROM Product WHERE name='Teste E2E' LIMIT 1;")
echo "ID: $ID"

# 3. Verificar status
sqlite3 prisma/dev.db "SELECT status FROM Product WHERE id='$ID';"

# 4. Aprovar via Telegram
# /aprovar $ID https://amzn.to/teste

# 5. Verificar se aparece no site
curl http://localhost:3000/api/products | jq ".[] | select(.name==\"Teste E2E\")"

# 6. Limpar
sqlite3 prisma/dev.db "DELETE FROM Product WHERE name='Teste E2E';"
```

## ✨ Sucesso!

Se todos os testes passarem, seu fluxo de aprovação está funcionando perfeitamente! 🎉
