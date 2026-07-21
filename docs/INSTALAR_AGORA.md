# 🚀 INSTALAÇÃO RÁPIDA - Execute no Servidor

## ⚠️ IMPORTANTE: Execute estes comandos no seu servidor VPS

```bash
cd /root/affiliate-hub
```

## 📋 Passo 1: Atualizar Banco de Dados

```bash
npx prisma db push
```

**Resultado esperado:**
```
✔ Generated Prisma Client
✔ The SQLite database "dev.db" was updated
```

## 📋 Passo 2: Verificar se o campo foi adicionado

```bash
sqlite3 prisma/dev.db "PRAGMA table_info(Product);" | grep status
```

**Resultado esperado:**
```
6|status|TEXT|1|'pending'|0
```

## 📋 Passo 3: Marcar Produtos Existentes como Pending

Primeiro, vamos criar o script no servidor:

```bash
cat > bot/marcar_produtos_pending.py << 'EOF'
#!/usr/bin/env python3
"""
Script para marcar todos os produtos existentes como 'pending'
"""

import sys
sys.path.append('/root/affiliate-hub/bot')

from pathlib import Path
import sqlite3

def marcar_produtos_pending():
    print('🔄 Marcando todos os produtos como pending...')
    print('='*60)
    
    db_path = Path('/root/affiliate-hub/prisma/dev.db')
    
    if not db_path.exists():
        print(f'❌ Banco de dados não encontrado: {db_path}')
        return
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Contar produtos
        cursor.execute("SELECT COUNT(*) FROM Product")
        total = cursor.fetchone()[0]
        print(f'📦 Encontrados {total} produtos')
        
        if total == 0:
            print('✅ Nenhum produto para atualizar')
            conn.close()
            return
        
        # Atualizar todos para pending
        cursor.execute("UPDATE Product SET status = 'pending' WHERE status IS NULL OR status != 'pending'")
        updated = cursor.rowcount
        conn.commit()
        
        print(f'✅ {updated} produtos marcados como pending')
        
        # Verificar
        cursor.execute("SELECT status, COUNT(*) FROM Product GROUP BY status")
        results = cursor.fetchall()
        
        print('\n📊 Status dos produtos:')
        for status, count in results:
            print(f'   {status}: {count}')
        
        conn.close()
        
        print('='*60)
        print('✅ Processo concluído!')
        print('\n📋 Próximos passos:')
        print('1. Inicie o Telegram Listener')
        print('2. Revise os produtos no Telegram')
        print('3. Use /aprovar [ID] [SEU_LINK] para aprovar')
        
    except Exception as e:
        print(f'❌ Erro: {e}')

if __name__ == '__main__':
    marcar_produtos_pending()
EOF
```

Agora execute:

```bash
python3 bot/marcar_produtos_pending.py
```

## 📋 Passo 4: Iniciar o Telegram Listener

```bash
# Parar listener antigo se existir
screen -S telegram-listener -X quit 2>/dev/null

# Iniciar novo listener
cd /root/affiliate-hub/bot
screen -S telegram-listener -dm python3 telegram_listener.py

# Verificar se está rodando
screen -ls
```

**Resultado esperado:**
```
There is a screen on:
    12345.telegram-listener    (Detached)
```

## 📋 Passo 5: Ver Logs do Listener

```bash
screen -r telegram-listener
```

**Para sair sem parar:** Pressione `Ctrl+A` depois `D`

## 📋 Passo 6: Testar no Telegram

Envie para o bot:

```
/help
```

**Resultado esperado:**
```
🤖 Comandos Disponíveis

/aprovar [ID] [LINK]
Aprova um produto e adiciona seu link de afiliado

/rejeitar [ID]
Rejeita um produto

/help
Mostra esta mensagem de ajuda
```

## 📋 Passo 7: Iniciar o Robô (Opcional)

```bash
# Parar robô antigo se existir
screen -S bot -X quit 2>/dev/null

# Iniciar robô
cd /root/affiliate-hub/bot
screen -S bot -dm python3 main.py

# Verificar
screen -ls
```

## 🔍 Verificações

### Ver produtos por status

```bash
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT status, COUNT(*) FROM Product GROUP BY status;"
```

### Ver últimos 5 produtos

```bash
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT id, name, status FROM Product ORDER BY createdAt DESC LIMIT 5;"
```

### Ver processos rodando

```bash
screen -ls
```

## 🧪 Teste Rápido

### 1. Criar produto de teste

```bash
curl -X POST http://localhost:3000/api/webhook/products \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave-api" \
  -d '{
    "name": "Produto Teste Aprovação",
    "category": "test",
    "imageUrl": "https://via.placeholder.com/400",
    "price": 99.90
  }'
```

### 2. Pegar ID do produto

```bash
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT id FROM Product WHERE name='Produto Teste Aprovação';"
```

### 3. Aprovar no Telegram

```
/aprovar [ID_COPIADO] https://amzn.to/teste123
```

### 4. Verificar se aparece no site

```bash
curl http://localhost:3000/api/products | grep "Produto Teste"
```

## ✅ Checklist

- [ ] `npx prisma db push` executado com sucesso
- [ ] Campo `status` existe no banco
- [ ] Produtos marcados como `pending`
- [ ] Telegram Listener rodando
- [ ] Comando `/help` funciona no Telegram
- [ ] Teste de aprovação funcionou

## 🐛 Problemas?

### Erro "status field not found"

```bash
# Forçar atualização
npx prisma generate
npx prisma db push --force-reset
```

### Listener não responde

```bash
# Ver logs
screen -r telegram-listener

# Reiniciar
screen -S telegram-listener -X quit
cd /root/affiliate-hub/bot
screen -S telegram-listener -dm python3 telegram_listener.py
```

### Produtos não aparecem

```bash
# Verificar status
sqlite3 /root/affiliate-hub/prisma/dev.db "SELECT id, name, status FROM Product LIMIT 5;"

# Se estiverem NULL, atualizar
sqlite3 /root/affiliate-hub/prisma/dev.db "UPDATE Product SET status='pending' WHERE status IS NULL;"
```

## 📞 Comandos Úteis

```bash
# Ver todos os screens
screen -ls

# Entrar em um screen
screen -r telegram-listener
screen -r bot

# Sair sem parar (dentro do screen)
Ctrl+A, depois D

# Parar um screen
screen -S telegram-listener -X quit

# Ver logs do robô
tail -f /root/affiliate-hub/bot/bot_state.json
```

## 🎉 Pronto!

Agora você tem o fluxo de aprovação funcionando!

**Fluxo:**
1. Robô encontra produto → salva como "pending"
2. Você recebe no Telegram
3. Você aprova: `/aprovar [ID] [SEU_LINK]`
4. Produto aparece no site com SEU link
