# 🧹 Como Limpar o Robô Antigo da VPS

## 🔍 Passo 1: Conectar na VPS

```bash
ssh usuario@ip-da-vps
# ou
ssh root@ip-da-vps
```

## 🔎 Passo 2: Encontrar Processos Python Rodando

### Listar todos os processos Python:
```bash
ps aux | grep python
```

Você verá algo como:
```
root      1234  0.5  2.1  123456  12345 ?  S    10:30   0:05 python bot.py
root      5678  0.3  1.8  234567  23456 ?  S    10:31   0:03 python3 main.py
```

### Matar processos específicos:
```bash
# Substitua 1234 pelo PID que apareceu
kill 1234
kill 5678

# Se não funcionar, force:
kill -9 1234
kill -9 5678
```

### Matar TODOS os processos Python (cuidado!):
```bash
pkill -f python
# ou force:
pkill -9 -f python
```

## 🔍 Passo 3: Verificar Sessões Screen/Tmux

### Listar sessões screen:
```bash
screen -ls
```

Você verá algo como:
```
There are screens on:
    12345.bot-promo    (Detached)
    67890.meu-bot      (Detached)
```

### Matar sessão screen:
```bash
screen -X -S 12345.bot-promo quit
screen -X -S 67890.meu-bot quit
```

### Listar sessões tmux:
```bash
tmux ls
```

### Matar sessão tmux:
```bash
tmux kill-session -t nome-da-sessao
```

## 🔍 Passo 4: Verificar Serviços Systemd

### Listar serviços relacionados a bot:
```bash
systemctl list-units | grep bot
systemctl list-units | grep promo
systemctl list-units | grep telegram
```

### Parar e desabilitar serviço:
```bash
sudo systemctl stop nome-do-servico
sudo systemctl disable nome-do-servico
```

### Remover arquivo do serviço:
```bash
sudo rm /etc/systemd/system/nome-do-servico.service
sudo systemctl daemon-reload
```

## 🔍 Passo 5: Encontrar Arquivos do Robô Antigo

### Procurar por diretórios com "bot" ou "telegram":
```bash
find ~ -type d -name "*bot*" 2>/dev/null
find ~ -type d -name "*telegram*" 2>/dev/null
find ~ -type d -name "*promo*" 2>/dev/null
```

### Procurar por arquivos Python de bot:
```bash
find ~ -name "bot.py" 2>/dev/null
find ~ -name "main.py" 2>/dev/null
find ~ -name "*telegram*.py" 2>/dev/null
```

### Procurar em locais comuns:
```bash
ls -la ~/
ls -la ~/bot/
ls -la ~/bots/
ls -la ~/telegram/
ls -la ~/promocoes/
ls -la /opt/
ls -la /var/www/
```

## 🗑️ Passo 6: Remover Diretórios

Quando encontrar o diretório do robô antigo:

```bash
# Ver o conteúdo primeiro
ls -la /caminho/para/bot-antigo/

# Remover (cuidado!)
rm -rf /caminho/para/bot-antigo/
```

## 🔍 Passo 7: Verificar Cron Jobs

### Listar cron jobs do usuário:
```bash
crontab -l
```

### Editar e remover linhas relacionadas ao bot:
```bash
crontab -e
# Apague as linhas do bot antigo
```

### Verificar cron do root:
```bash
sudo crontab -l
```

## 🔍 Passo 8: Verificar Logs

### Procurar logs:
```bash
find /var/log -name "*bot*" 2>/dev/null
find /var/log -name "*telegram*" 2>/dev/null
```

### Ver últimas linhas de logs do sistema:
```bash
sudo journalctl -n 100 | grep -i bot
sudo journalctl -n 100 | grep -i telegram
```

## ✅ Passo 9: Verificar se Limpou Tudo

```bash
# Verificar processos
ps aux | grep python
ps aux | grep bot

# Verificar portas em uso
sudo netstat -tulpn | grep python

# Verificar sessões screen
screen -ls

# Verificar serviços
systemctl list-units | grep bot
```

## 🚀 Passo 10: Instalar o Novo Robô

Agora que limpou tudo:

```bash
# Ir para home
cd ~

# Clonar o novo projeto
git clone https://github.com/ferramentastechapps/affiliate-hub.git

# Entrar no diretório do bot
cd affiliate-hub/bot

# Instalar dependências
pip3 install -r requirements.txt

# Configurar
cp .env.example .env
nano .env
# Cole suas configurações

# Testar
python3 main.py --once

# Se funcionou, rodar em background
screen -S promo-bot
python3 main.py
# Ctrl+A depois D para desanexar
```

## 🆘 Comandos de Emergência

### Se não souber onde está nada:

```bash
# Procurar TUDO relacionado a bot/telegram
sudo find / -name "*bot*" -o -name "*telegram*" 2>/dev/null | grep -v proc | grep -v sys

# Matar TUDO que seja Python
sudo pkill -9 -f python

# Matar todas as sessões screen
screen -ls | grep Detached | cut -d. -f1 | awk '{print $1}' | xargs -I {} screen -X -S {} quit

# Ver TODOS os processos
ps aux | less
# Procure por "python", "bot", "telegram"
```

## 📝 Script Automático de Limpeza

Salve isso como `limpar_bot.sh`:

```bash
#!/bin/bash

echo "🧹 Limpando robô antigo..."

# Matar processos Python
echo "Matando processos Python..."
pkill -9 -f "bot.py"
pkill -9 -f "telegram"
pkill -9 -f "promo"

# Matar sessões screen
echo "Matando sessões screen..."
screen -ls | grep bot | cut -d. -f1 | awk '{print $1}' | xargs -I {} screen -X -S {} quit

# Parar serviços
echo "Parando serviços..."
sudo systemctl stop bot-promo 2>/dev/null
sudo systemctl stop telegram-bot 2>/dev/null
sudo systemctl disable bot-promo 2>/dev/null
sudo systemctl disable telegram-bot 2>/dev/null

echo "✅ Limpeza concluída!"
echo "Verifique com: ps aux | grep python"
```

Execute:
```bash
chmod +x limpar_bot.sh
./limpar_bot.sh
```

## 💡 Dicas

1. **Sempre faça backup antes de deletar**:
   ```bash
   cp -r /caminho/bot-antigo ~/backup-bot-antigo
   ```

2. **Use `screen -r` para ver sessões ativas**:
   ```bash
   screen -r
   # Se tiver múltiplas, escolha uma
   screen -r 12345
   ```

3. **Para sair do screen sem matar**:
   - Pressione `Ctrl+A` depois `D`

4. **Para matar o processo dentro do screen**:
   - Entre no screen: `screen -r`
   - Pressione `Ctrl+C`
   - Digite `exit`

## 🔐 Reutilizar Bot e Canal do Telegram

Você NÃO precisa criar novo bot! Use o mesmo:

1. O token do bot continua funcionando
2. O Chat ID do canal continua o mesmo
3. Apenas configure o `.env` com os mesmos dados

No `.env` do novo robô:
```env
TELEGRAM_BOT_TOKEN=seu-token-antigo
TELEGRAM_CHAT_ID=seu-chat-id-antigo
```

## ❓ Ainda com Dúvidas?

Se não conseguir encontrar, me envie a saída destes comandos:

```bash
ps aux | grep python
screen -ls
systemctl list-units | grep bot
find ~ -name "*.py" | head -20
```
