# 🔧 Resolver Problemas Comuns

## ❌ Erro: "status field not found"

### Causa
O campo `status` não foi adicionado ao banco de dados.

### Solução

```bash
cd /root/affiliate-hub

# Opção 1: Push normal
npx prisma db push

# Opção 2: Se não funcionar, force
npx prisma generate
npx prisma db push --force-reset

# Verificar se foi criado
sqlite3 prisma/dev.db "PRAGMA table_info(Product);" | grep status
```

**Resultado esperado:**
```
6|status|TEXT|1|'pending'|0
```

---

## ❌ Listener não responde no Telegram

### Verificar se está rodando

```bash
screen -ls
```

**Deve aparecer:**
```
There is a screen on:
    12345.telegram-listener    (Detached)
```

### Se NÃO aparecer, iniciar:

```bash
cd /root/affiliate-hub/bot
screen -S telegram-listener -dm python3 telegram_listener.py
```

### Ver logs do listener:

```bash
screen -r telegram-listener
```

**Para sair:** `Ctrl+A`, depois `D`

### Verificar erros:

```bash
screen -r telegram-listener
```

Se aparecer erro de import:

```bash
cd /root/affiliate-hub/bot
pip3 install python-telegram-bot --upgrade
```

---

## ❌ Produtos não aparecem no site

### Verificar status dos produtos

```bash
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT id, name, status FROM Product LIMIT 10;"
```

### Se estiverem com status NULL:

```bash
sqlite3 /root/affiliate-hub/prisma/dev.db "UPDATE Product SET status='pending' WHERE status IS NULL;"
```

### Se estiverem "pending" mas deveriam estar "active":

```bash
# Pegar ID de um produto
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT id FROM Product WHERE status='pending' LIMIT 1;"

# Aprovar no Telegram
/aprovar [ID_COPIADO] https://amzn.to/seulink
```

### Verificar API:

```bash
curl http://localhost:3000/api/products | jq '.[0]'
```

**Deve retornar apenas produtos com `"status": "active"`**

---

## ❌ Erro ao aprovar produto

### Sintaxe correta:

```
/aprovar clxyz123 https://amzn.to/abc
```

### Erros comuns:

❌ **Faltando espaço:**
```
/aprovarclxyz123 https://amzn.to/abc
```

❌ **ID errado:**
```
/aprovar 123 https://amzn.to/abc
```

❌ **Link sem http:**
```
/aprovar clxyz123 amzn.to/abc
```

✅ **Correto:**
```
/aprovar clxyz123 https://amzn.to/abc
```

### Verificar ID do produto:

```bash
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT id, name FROM Product WHERE status='pending' LIMIT 5;"
```

---

## ❌ Robô não está enviando produtos

### Verificar se o robô está rodando:

```bash
screen -ls
```

**Deve aparecer:**
```
There is a screen on:
    12345.bot    (Detached)
```

### Se NÃO aparecer, iniciar:

```bash
cd /root/affiliate-hub/bot
screen -S bot -dm python3 main.py
```

### Ver logs do robô:

```bash
screen -r bot
```

### Testar manualmente:

```bash
cd /root/affiliate-hub/bot
python3 main.py --once
```

---

## ❌ Produtos duplicados

### Limpar duplicatas:

```bash
sqlite3 /root/affiliate-hub/prisma/dev.db << 'EOF'
DELETE FROM Product 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM Product 
  GROUP BY name
);
EOF
```

---

## ❌ Banco de dados corrompido

### Backup primeiro:

```bash
cp /root/affiliate-hub/prisma/dev.db /root/affiliate-hub/prisma/dev.db.backup
```

### Reset completo:

```bash
cd /root/affiliate-hub
rm prisma/dev.db
npx prisma db push
npx prisma db seed
```

---

## ❌ API não responde

### Verificar se Next.js está rodando:

```bash
curl http://localhost:3000/api/products
```

### Se não responder:

```bash
cd /root/affiliate-hub
npm run build
npm start
```

### Ou com PM2:

```bash
pm2 restart affiliate-hub
pm2 logs affiliate-hub
```

---

## ❌ Erro "x-api-key" inválida

### Verificar chave no .env:

```bash
cat /root/affiliate-hub/.env | grep API_KEY
```

### Verificar chave no bot:

```bash
cat /root/affiliate-hub/bot/config.py | grep API_KEY
```

**Devem ser iguais!**

---

## ❌ Telegram não recebe mensagens

### Verificar token e chat ID:

```bash
cat /root/affiliate-hub/bot/config.py | grep TELEGRAM
```

### Testar manualmente:

```python
python3 << 'EOF'
from telegram import Bot
import asyncio

TOKEN = "SEU_TOKEN_AQUI"
CHAT_ID = "SEU_CHAT_ID_AQUI"

async def test():
    bot = Bot(token=TOKEN)
    await bot.send_message(chat_id=CHAT_ID, text="🧪 Teste de conexão!")

asyncio.run(test())
EOF
```

---

## 🔍 Comandos de Diagnóstico

### Ver todos os produtos:

```bash
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT id, name, status FROM Product;"
```

### Contar por status:

```bash
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT status, COUNT(*) FROM Product GROUP BY status;"
```

### Ver últimos produtos:

```bash
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT id, name, status, datetime(createdAt, 'localtime') FROM Product ORDER BY createdAt DESC LIMIT 10;"
```

### Ver links de um produto:

```bash
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT p.name, l.amazon, l.shopee FROM Product p LEFT JOIN Link l ON p.id = l.productId WHERE p.id='clxyz123';"
```

### Ver processos:

```bash
screen -ls
ps aux | grep python
ps aux | grep node
```

---

## 🆘 Reset Completo (Último Recurso)

```bash
# 1. Parar tudo
screen -S telegram-listener -X quit
screen -S bot -X quit
pm2 stop all

# 2. Backup
cp /root/affiliate-hub/prisma/dev.db /root/affiliate-hub/prisma/dev.db.backup

# 3. Reset banco
cd /root/affiliate-hub
rm prisma/dev.db
npx prisma db push

# 4. Reiniciar serviços
cd /root/affiliate-hub/bot
screen -S telegram-listener -dm python3 telegram_listener.py
screen -S bot -dm python3 main.py

# 5. Verificar
screen -ls
```

---

## 📞 Logs Importantes

### Listener:

```bash
screen -r telegram-listener
```

### Robô:

```bash
screen -r bot
```

### Next.js:

```bash
pm2 logs affiliate-hub
```

### Sistema:

```bash
tail -f /var/log/syslog | grep python
```

---

## ✅ Verificação Final

Execute este checklist:

```bash
# 1. Campo status existe?
sqlite3 /root/affiliate-hub/prisma/dev.db "PRAGMA table_info(Product);" | grep status

# 2. Produtos têm status?
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT status, COUNT(*) FROM Product GROUP BY status;"

# 3. Listener rodando?
screen -ls | grep telegram-listener

# 4. API responde?
curl http://localhost:3000/api/products | jq '.[0].status'

# 5. Telegram responde?
# Envie: /help
```

Se todos passarem, está funcionando! ✅
