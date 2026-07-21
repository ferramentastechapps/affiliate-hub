# 🎯 Sistema de Aprovação de Produtos - Guia Rápido

## 📖 Documentação Disponível

| Arquivo | Descrição |
|---------|-----------|
| **COMANDOS_COPIAR_COLAR.txt** | ⚡ Comandos prontos para copiar e colar |
| **INSTALAR_AGORA.md** | 📋 Guia passo a passo detalhado |
| **FLUXO_APROVACAO.md** | 📚 Documentação completa do sistema |
| **RESOLVER_PROBLEMAS.md** | 🔧 Troubleshooting e soluções |
| **RESUMO_IMPLEMENTACAO.md** | 📊 Resumo executivo |
| **bot/TESTAR_FLUXO.md** | 🧪 Como testar o sistema |

## ⚡ Instalação Rápida (3 minutos)

### 1️⃣ Copie e cole no terminal do servidor:

```bash
cd /root/affiliate-hub
npx prisma db push
sqlite3 prisma/dev.db "UPDATE Product SET status='pending' WHERE status IS NULL;"
screen -S telegram-listener -X quit 2>/dev/null
cd bot && screen -S telegram-listener -dm python3 telegram_listener.py
screen -ls
```

### 2️⃣ Teste no Telegram:

```
/help
```

### 3️⃣ Pronto! ✅

---

## 🔄 Como Funciona

```
┌─────────────────────────────────────────┐
│  1. Robô encontra produto no Promobit   │
│     └─> Salva com status: "pending"     │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  2. Envia para seu Telegram             │
│     ├─> Nome e preço                    │
│     ├─> Link do Promobit (consulta)     │
│     └─> ID do produto                   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  3. Você revisa e decide                │
│     ├─> Gera SEU link de afiliado       │
│     └─> /aprovar [ID] [SEU_LINK]        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  4. Produto aparece no site             │
│     ├─> Status: "active"                │
│     └─> Com SEU link de afiliado        │
└─────────────────────────────────────────┘
```

---

## 📱 Comandos do Telegram

### Aprovar produto:
```
/aprovar clxyz123 https://amzn.to/seulink
```

### Rejeitar produto:
```
/rejeitar clxyz123
```

### Ver ajuda:
```
/help
```

---

## 🎯 Status dos Produtos

| Status | Descrição | Visível no Site? |
|--------|-----------|------------------|
| `pending` | Aguardando sua aprovação | ❌ Não |
| `active` | Aprovado com seu link | ✅ Sim |
| `rejected` | Rejeitado por você | ❌ Não |

---

## 🔍 Comandos Úteis

### Ver produtos pendentes:
```bash
sqlite3 prisma/dev.db "SELECT id, name FROM Product WHERE status='pending' LIMIT 5;"
```

### Ver produtos ativos:
```bash
sqlite3 prisma/dev.db "SELECT id, name FROM Product WHERE status='active' LIMIT 5;"
```

### Contar por status:
```bash
sqlite3 prisma/dev.db "SELECT status, COUNT(*) FROM Product GROUP BY status;"
```

### Ver logs do listener:
```bash
screen -r telegram-listener
```
*(Ctrl+A, D para sair)*

---

## ✅ Verificação Rápida

Execute para verificar se está tudo funcionando:

```bash
# 1. Campo status existe?
sqlite3 prisma/dev.db "PRAGMA table_info(Product);" | grep status

# 2. Listener rodando?
screen -ls | grep telegram-listener

# 3. API filtra corretamente?
curl http://localhost:3000/api/products | jq '.[0].status'
```

**Todos devem retornar resultados positivos!**

---

## 🐛 Problemas?

Leia: **RESOLVER_PROBLEMAS.md**

Ou execute:

```bash
# Reiniciar listener
screen -S telegram-listener -X quit
cd /root/affiliate-hub/bot
screen -S telegram-listener -dm python3 telegram_listener.py

# Verificar
screen -ls
```

---

## 📊 Exemplo Real

### Mensagem que você recebe:

```
🔥 NOVO PRODUTO ENCONTRADO!
⚠️ AGUARDANDO APROVAÇÃO

📦 Mouse Gamer RGB 16000 DPI
🏷️ gaming
💰 R$ 89.90

🔗 Ver no Promobit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PARA APROVAR:

/aprovar clxyz123 [SEU_LINK]

Exemplo:
/aprovar clxyz123 https://amzn.to/abc123

🚫 Para rejeitar:
/rejeitar clxyz123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID_DO_PRODUTO: clxyz123
```

### Você responde:

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

---

## 🎉 Benefícios

✅ **Controle Total** - Você decide o que aparece  
✅ **Seus Links** - Apenas seus links de afiliado  
✅ **Revisão Manual** - Vê antes de publicar  
✅ **Sem Links do Promobit** - Apenas referência  
✅ **Rastreável** - Histórico completo  

---

## 📞 Suporte

- **Instalação:** Leia `INSTALAR_AGORA.md`
- **Problemas:** Leia `RESOLVER_PROBLEMAS.md`
- **Testes:** Leia `bot/TESTAR_FLUXO.md`
- **Detalhes:** Leia `FLUXO_APROVACAO.md`

---

## 🚀 Começar Agora

1. Abra: **COMANDOS_COPIAR_COLAR.txt**
2. Copie os comandos
3. Cole no terminal do servidor
4. Teste com `/help` no Telegram
5. Pronto! 🎉

---

**Desenvolvido para garantir que apenas SEUS links de afiliado apareçam no site!**
