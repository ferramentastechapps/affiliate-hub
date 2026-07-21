# ⚙️ Como Configurar o .env

## 📋 Passo a Passo

### 1. Verificar se o .env existe

```powershell
cd C:\Users\jotas\affiliate-hub
dir .env
```

Se não existir, copie do exemplo:
```powershell
copy .env.example .env
```

### 2. Editar o .env

Abra o arquivo `.env` com um editor de texto (Notepad, VS Code, etc):

```powershell
notepad .env
```

### 3. Configurar as variáveis obrigatórias

#### A. Token do Telegram Bot

```env
TELEGRAM_BOT_TOKEN="seu_token_aqui"
```

**Como obter:**
1. Abra o Telegram
2. Procure por `@BotFather`
3. Envie `/newbot`
4. Siga as instruções
5. Copie o token (ex: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

#### B. Chat ID do Telegram

```env
TELEGRAM_CHAT_ID="seu_chat_id"
```

**Como obter:**
1. Envie uma mensagem para o seu bot
2. Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
3. Procure por `"chat":{"id":123456789}`
4. Copie o número do ID

#### C. URL do Site

```env
AFFILIATE_HUB_URL="http://localhost:3000"
# ou
AFFILIATE_HUB_URL="https://seu-dominio.com"
```

#### D. API Key

```env
AFFILIATE_HUB_API_KEY="sua-chave-super-secreta-aqui"
API_SECRET_KEY="sua-chave-super-secreta-aqui"
```

**Dica:** Use a mesma chave para ambas

#### E. Novas Configurações do Bot v2.0

```env
SEARCH_INTERVAL_MINUTES=15
MIN_QUALITY_SCORE=30
```

### 4. Exemplo de .env Completo

```env
# Site
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
AFFILIATE_HUB_URL="http://localhost:3000"

# API
API_SECRET_KEY="minha-chave-secreta-123"
AFFILIATE_HUB_API_KEY="minha-chave-secreta-123"

# Telegram
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
TELEGRAM_CHAT_ID="123456789"
TELEGRAM_PROMO_GROUP_ID="123456789"

# Bot v2.0
SEARCH_INTERVAL_MINUTES=15
MIN_QUALITY_SCORE=30
MIN_DISCOUNT_PERCENT=20

# Opcional
GEMINI_API_KEY="sua_chave_gemini"
```

### 5. Salvar e Testar

Salve o arquivo e teste:

```powershell
cd bot
python main.py --once
```

---

## 🧪 Testar Sem Telegram (Opcional)

Se quiser testar o bot sem configurar o Telegram ainda, você pode comentar as linhas do Telegram temporariamente.

Mas o ideal é configurar o Telegram para ver as mensagens melhoradas!

---

## 📝 Checklist

- [ ] .env existe
- [ ] TELEGRAM_BOT_TOKEN configurado
- [ ] TELEGRAM_CHAT_ID configurado
- [ ] AFFILIATE_HUB_URL configurado
- [ ] AFFILIATE_HUB_API_KEY configurado
- [ ] SEARCH_INTERVAL_MINUTES=15 adicionado
- [ ] MIN_QUALITY_SCORE=30 adicionado
- [ ] Testado com `python main.py --once`

---

## 🆘 Problemas Comuns

### Erro: "Token inválido"
**Solução:** Verifique se copiou o token completo do BotFather

### Erro: "Chat ID inválido"
**Solução:** Certifique-se de que o ID é um número (sem aspas no .env)

### Bot não envia mensagens
**Solução:** Verifique se você iniciou uma conversa com o bot no Telegram

---

**Próximo passo:** Configurar o .env e executar `python main.py --once`
