# 🔄 Sistema de Aprovação de Produtos

## 📋 Visão Geral

Sistema implementado para garantir que produtos só apareçam no site após sua aprovação manual via Telegram, com SEU link de afiliado.

## 🎯 Fluxo Correto

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ROBÔ ENCONTRA PRODUTO NO PROMOBIT                        │
│    └─> Salva no banco com status: "pending"                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ENVIA PARA TELEGRAM                                       │
│    ├─> Nome do produto                                       │
│    ├─> Preço e categoria                                     │
│    ├─> Link do Promobit (para consulta)                      │
│    ├─> ID do produto                                         │
│    └─> Instruções de aprovação                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. VOCÊ REVISA E DECIDE                                      │
│    ├─> Gera SEU link de afiliado                             │
│    ├─> /aprovar [ID] [SEU_LINK]  ✅                          │
│    └─> /rejeitar [ID]  ❌                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. PRODUTO APROVADO                                          │
│    ├─> Status muda para "active"                             │
│    ├─> Link de afiliado atualizado                           │
│    └─> Produto aparece no site com SEU link                  │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Mudanças Implementadas

### 1. Schema do Banco de Dados

**Arquivo:** `prisma/schema.prisma`

```prisma
model Product {
  // ... outros campos
  status String @default("pending") // pending, active, rejected
  
  @@index([status])
}
```

### 2. API de Produtos

**Arquivo:** `src/app/api/products/route.ts`

- ✅ GET agora filtra apenas produtos com `status: 'active'`
- ✅ POST cria produtos com `status: 'pending'` por padrão

### 3. Rotas de Aprovação/Rejeição

**Novos endpoints:**

#### `/api/webhook/products/approve` (POST)
```json
{
  "productId": "clxyz123",
  "platform": "amazon",
  "affiliateLink": "https://amzn.to/abc123"
}
```

#### `/api/webhook/products/reject` (POST)
```json
{
  "productId": "clxyz123"
}
```

### 4. Telegram Listener

**Arquivo:** `bot/telegram_listener.py`

**Comandos disponíveis:**

```bash
# Aprovar produto
/aprovar clxyz123 https://amzn.to/abc123

# Rejeitar produto
/rejeitar clxyz123

# Ajuda
/help
```

### 5. API Client (Python)

**Arquivo:** `bot/affiliate_hub_api.py`

Novos métodos:
- `aprovar_produto(produto_id, platform, affiliate_link)`
- `rejeitar_produto(produto_id)`

### 6. Mensagens do Telegram

**Arquivo:** `bot/telegram_bot.py`

Mensagens agora incluem:
- ⚠️ Status "AGUARDANDO APROVAÇÃO"
- 🔗 Link do Promobit para consulta
- 📋 Instruções claras de aprovação
- 💡 Exemplos de comandos

## 🚀 Como Usar

### Passo 1: Atualizar o Banco de Dados

```bash
cd /root/affiliate-hub
npx prisma db push
```

### Passo 2: Marcar Produtos Existentes como Pending

```bash
cd /root/affiliate-hub/bot
python3 marcar_produtos_pending.py
```

### Passo 3: Iniciar o Listener do Telegram

```bash
cd /root/affiliate-hub/bot
python3 telegram_listener.py
```

Deixe rodando em segundo plano ou use `screen`/`tmux`:

```bash
screen -S telegram-listener
python3 telegram_listener.py
# Ctrl+A, D para desanexar
```

### Passo 4: Iniciar o Robô de Scraping

```bash
cd /root/affiliate-hub/bot
python3 main.py
```

## 📱 Fluxo no Telegram

### Quando o Robô Encontra um Produto:

```
🔥 NOVO PRODUTO ENCONTRADO!
⚠️ AGUARDANDO APROVAÇÃO

📦 Mouse Gamer RGB 16000 DPI
🏷️ gaming
💰 R$ 89.90

🔗 Ver no Promobit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PARA APROVAR:

1️⃣ Gere seu link de afiliado
2️⃣ Use o comando:

/aprovar clxyz123 [SEU_LINK]

Exemplo:
/aprovar clxyz123 https://amzn.to/abc123

🚫 Para rejeitar:
/rejeitar clxyz123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID_DO_PRODUTO: clxyz123
```

### Você Responde:

```
/aprovar clxyz123 https://amzn.to/meulink123
```

### Confirmação:

```
✅ Produto Aprovado com Sucesso!

🆔 ID: clxyz123
🏪 Plataforma: amazon
🔗 Link atualizado

O produto agora está visível no site!
```

## 🔍 Verificação

### Ver Produtos Pendentes (Admin)

Acesse: `http://seu-dominio.com/admin`

Os produtos pendentes não aparecem no site público, apenas no painel admin.

### Ver Produtos Ativos (Site)

Acesse: `http://seu-dominio.com`

Apenas produtos com `status: 'active'` aparecem.

## 🛠️ Comandos Úteis

### Verificar Status do Listener

```bash
screen -r telegram-listener
```

### Ver Logs do Robô

```bash
tail -f bot_state.json
```

### Reiniciar Serviços

```bash
# Parar listener
screen -S telegram-listener -X quit

# Iniciar novamente
screen -S telegram-listener -dm python3 telegram_listener.py
```

## 🔐 Plataformas Detectadas Automaticamente

O sistema detecta a plataforma pelo link:

| Link | Plataforma |
|------|------------|
| `amzn.to`, `amazon.com.br` | amazon |
| `shopee.com.br`, `shope.ee` | shopee |
| `aliexpress.com` | aliexpress |
| `mercadolivre.com.br` | mercadoLivre |
| `tiktok.com` | tiktok |

## ⚠️ Importante

1. **Produtos pendentes NÃO aparecem no site**
   - Apenas no painel admin (se implementado)

2. **Produtos rejeitados ficam no banco**
   - Com `status: 'rejected'`
   - Não aparecem em lugar nenhum

3. **Links do Promobit são apenas referência**
   - Não são usados no site
   - Servem para você consultar o produto

4. **Seu link substitui tudo**
   - Quando você aprova, SEU link é o único usado
   - O link do Promobit é descartado

## 🐛 Troubleshooting

### Produtos não aparecem no site

```bash
# Verificar status no banco
sqlite3 prisma/dev.db "SELECT id, name, status FROM Product LIMIT 10;"
```

### Listener não responde

```bash
# Verificar se está rodando
ps aux | grep telegram_listener

# Ver logs
screen -r telegram-listener
```

### Erro ao aprovar

- Verifique se o ID está correto
- Verifique se o link começa com `http://` ou `https://`
- Verifique se a API está rodando

## 📊 Estatísticas

```bash
# Contar produtos por status
sqlite3 prisma/dev.db "SELECT status, COUNT(*) FROM Product GROUP BY status;"
```

## ✅ Checklist de Implementação

- [x] Schema atualizado com campo `status`
- [x] API filtra apenas produtos ativos
- [x] Rotas de aprovação/rejeição criadas
- [x] Telegram listener com comandos
- [x] Mensagens atualizadas com instruções
- [x] Script para marcar produtos existentes
- [x] Documentação completa

## 🎉 Resultado Final

Agora você tem controle total sobre quais produtos aparecem no site e com quais links de afiliado!
