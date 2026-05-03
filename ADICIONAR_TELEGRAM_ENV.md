# 📱 Adicionar Configurações do Telegram no .env

## ✅ O que fazer agora:

Você já tem um bot do Telegram configurado. Só precisa adicionar as informações no `.env`.

### 1. Abrir o .env

```powershell
notepad .env
```

### 2. Encontrar esta seção:

```env
# 📱 TELEGRAM BOT (para envio de promoções)
TELEGRAM_BOT_TOKEN="SEU_TOKEN_AQUI"
TELEGRAM_CHAT_ID="SEU_CHAT_ID_AQUI"
TELEGRAM_PROMO_GROUP_ID="SEU_GROUP_ID_AQUI"
```

### 3. Substituir pelos seus valores:

```env
# 📱 TELEGRAM BOT (para envio de promoções)
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"  # Seu token
TELEGRAM_CHAT_ID="123456789"  # Seu chat ID
TELEGRAM_PROMO_GROUP_ID="-1001234567890"  # ID do grupo (se tiver)
```

### 4. Salvar e testar:

```powershell
cd bot
python main.py --once
```

---

## 🔍 Como encontrar suas configurações antigas:

### Opção 1: Procurar em arquivos antigos

Se você tinha um `.env` antigo ou arquivo de configuração:

```powershell
# Procurar por "TELEGRAM" em todos os arquivos
Get-ChildItem -Recurse -File | Select-String "TELEGRAM_BOT_TOKEN" -List
```

### Opção 2: Verificar o bot no Telegram

1. Abra o Telegram
2. Procure por `@BotFather`
3. Envie `/mybots`
4. Selecione seu bot
5. Clique em "API Token"
6. Copie o token

### Opção 3: Verificar histórico de mensagens

Se o bot já enviou mensagens antes, você pode ver o chat ID nas mensagens antigas.

---

## 📝 Exemplo Completo:

```env
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📱 TELEGRAM BOT (para envio de promoções)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Token do bot (obtenha com @BotFather no Telegram)
TELEGRAM_BOT_TOKEN="7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"

# ID do chat onde o bot enviará as promoções para aprovação
TELEGRAM_CHAT_ID="123456789"

# ID do grupo onde as promoções aprovadas serão publicadas
TELEGRAM_PROMO_GROUP_ID="-1001234567890"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ⚙️ CONFIGURAÇÕES DO BOT v2.0
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Intervalo entre buscas (em minutos)
SEARCH_INTERVAL_MINUTES=15

# Desconto mínimo para considerar (em %)
MIN_DISCOUNT_PERCENT=20

# Score mínimo de qualidade (0-100)
MIN_QUALITY_SCORE=30
```

---

## ✅ Depois de configurar:

```powershell
# Testar
cd bot
python main.py --once

# Se funcionar, você verá:
# ✅ Produto enviado para Telegram: [nome do produto]
```

---

## 🎉 Pronto!

Depois de adicionar as configurações do Telegram, o bot v2.0 estará 100% funcional com:

- ⚡ Busca 8x mais rápida
- 🎯 Sistema de score
- 💬 Mensagens melhoradas
- 🚨 Alertas urgentes
- 📊 Estatísticas detalhadas

**Só falta adicionar o token do Telegram!** 🚀
