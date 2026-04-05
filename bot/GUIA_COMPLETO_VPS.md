# 🎯 Guia Completo: Limpar e Instalar Novo Robô na VPS

## 📋 O que você vai fazer:

1. ✅ Conectar na VPS
2. ✅ Encontrar e parar o robô antigo
3. ✅ Remover arquivos antigos
4. ✅ Instalar o novo robô
5. ✅ Configurar com seu bot/canal existente
6. ✅ Testar e deixar rodando

---

## 🔐 PASSO 1: Conectar na VPS

Abra o terminal (ou PuTTY no Windows) e conecte:

```bash
ssh usuario@ip-da-vps
# Exemplo: ssh root@192.168.1.100
```

Digite a senha quando pedir.

---

## 🛑 PASSO 2: Parar o Robô Antigo

### Opção A: Usar o Script Automático (Recomendado)

```bash
# Baixar o script
wget https://raw.githubusercontent.com/ferramentastechapps/affiliate-hub/master/bot/limpar_vps.sh

# Dar permissão
chmod +x limpar_vps.sh

# Executar
bash limpar_vps.sh
```

O script vai te guiar por tudo! Responda 's' para confirmar cada passo.

### Opção B: Manual

#### 2.1 - Ver processos Python rodando:
```bash
ps aux | grep python
```

Você verá algo assim:
```
root  1234  0.5  2.1  python bot.py
root  5678  0.3  1.8  python3 main.py
```

#### 2.2 - Matar os processos:
```bash
# Substitua 1234 e 5678 pelos números que apareceram
kill -9 1234
kill -9 5678

# Ou mate todos de uma vez:
pkill -9 -f python
```

#### 2.3 - Verificar sessões screen:
```bash
screen -ls
```

Se aparecer algo como:
```
12345.bot-promo    (Detached)
```

Mate a sessão:
```bash
screen -X -S 12345.bot-promo quit
```

#### 2.4 - Verificar serviços:
```bash
systemctl list-units | grep bot
```

Se aparecer algum serviço:
```bash
sudo systemctl stop nome-do-servico
sudo systemctl disable nome-do-servico
```

---

## 🗑️ PASSO 3: Encontrar e Remover Arquivos Antigos

### 3.1 - Procurar diretórios:
```bash
find ~ -type d -name "*bot*"
find ~ -type d -name "*telegram*"
```

### 3.2 - Ver o que tem dentro:
```bash
# Substitua pelo caminho que encontrou
ls -la ~/bot-antigo/
```

### 3.3 - Fazer backup (opcional mas recomendado):
```bash
cp -r ~/bot-antigo ~/backup-bot-antigo
```

### 3.4 - Remover:
```bash
rm -rf ~/bot-antigo/
```

---

## 📥 PASSO 4: Instalar o Novo Robô

### 4.1 - Ir para o diretório home:
```bash
cd ~
```

### 4.2 - Clonar o repositório:
```bash
git clone https://github.com/ferramentastechapps/affiliate-hub.git
```

Se não tiver git instalado:
```bash
sudo apt update
sudo apt install git
```

### 4.3 - Entrar no diretório do bot:
```bash
cd affiliate-hub/bot
```

### 4.4 - Instalar Python e pip (se necessário):
```bash
sudo apt install python3 python3-pip
```

### 4.5 - Instalar dependências:
```bash
pip3 install -r requirements.txt
```

---

## ⚙️ PASSO 5: Configurar

### 5.1 - Copiar arquivo de exemplo:
```bash
cp .env.example .env
```

### 5.2 - Editar configurações:
```bash
nano .env
```

### 5.3 - Cole suas configurações:

```env
# URL do seu Affiliate Hub (se estiver rodando localmente)
AFFILIATE_HUB_URL=http://localhost:3000
# OU se já fez deploy:
# AFFILIATE_HUB_URL=https://seu-dominio.vercel.app

# API Key (a mesma que você configurou no .env do Affiliate Hub)
AFFILIATE_HUB_API_KEY=minha-chave-super-secreta-123

# Token do seu bot EXISTENTE do Telegram
TELEGRAM_BOT_TOKEN=6789012345:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw

# Chat ID do seu canal EXISTENTE
TELEGRAM_CHAT_ID=-1001234567890

# Intervalo de busca (em minutos)
SEARCH_INTERVAL_MINUTES=30

# Desconto mínimo para considerar (%)
MIN_DISCOUNT_PERCENT=20
```

**Para salvar no nano:**
- Pressione `Ctrl + O` (salvar)
- Pressione `Enter` (confirmar)
- Pressione `Ctrl + X` (sair)

---

## 🧪 PASSO 6: Testar

### 6.1 - Executar uma vez para testar:
```bash
python3 main.py --once
```

Se tudo estiver certo, você verá:
```
🤖 Iniciando busca de promoções...
📊 Encontrados: X produtos e Y cupons
✅ Busca concluída!
```

E receberá mensagens no seu canal do Telegram!

### 6.2 - Se der erro:

**Erro: "Module not found"**
```bash
pip3 install -r requirements.txt
```

**Erro: "API key inválida"**
- Verifique se a chave no `.env` é a mesma do Affiliate Hub
- Certifique-se que o Affiliate Hub está rodando

**Erro: "Bot não envia mensagens"**
- Verifique se o token está correto
- Certifique-se que o bot está no canal/grupo
- Verifique se o Chat ID está correto (com o `-` na frente)

---

## 🚀 PASSO 7: Deixar Rodando em Background

### Opção A: Usando Screen (Recomendado)

```bash
# Criar sessão screen
screen -S promo-bot

# Iniciar o robô
python3 main.py

# Desanexar da sessão (deixar rodando)
# Pressione: Ctrl+A depois D
```

**Comandos úteis do screen:**
```bash
# Ver sessões ativas
screen -ls

# Reanexar à sessão
screen -r promo-bot

# Matar sessão
screen -X -S promo-bot quit
```

### Opção B: Usando nohup

```bash
nohup python3 main.py > bot.log 2>&1 &
```

Ver logs:
```bash
tail -f bot.log
```

Parar:
```bash
ps aux | grep main.py
kill -9 PID_DO_PROCESSO
```

---

## ✅ PASSO 8: Verificar se Está Funcionando

### 8.1 - Ver se o processo está rodando:
```bash
ps aux | grep python
```

Deve aparecer algo como:
```
root  9999  python3 main.py
```

### 8.2 - Reanexar ao screen para ver logs:
```bash
screen -r promo-bot
```

Você verá as mensagens do robô em tempo real!

Para sair sem parar: `Ctrl+A` depois `D`

---

## 🎉 Pronto!

Seu robô está rodando e vai:
- ✅ Buscar promoções a cada 30 minutos
- ✅ Adicionar automaticamente no site
- ✅ Enviar notificações no Telegram

---

## 📊 Monitoramento

### Ver logs em tempo real:
```bash
screen -r promo-bot
```

### Ver últimas execuções:
```bash
cd ~/affiliate-hub/bot
tail -f bot.log  # Se usou nohup
```

### Reiniciar o robô:
```bash
# Matar processo
pkill -9 -f main.py

# Iniciar novamente
screen -S promo-bot
python3 main.py
# Ctrl+A depois D
```

---

## 🆘 Problemas Comuns

### "Não consigo conectar na VPS"
- Verifique IP e porta
- Verifique se tem a senha/chave SSH correta
- Tente: `ssh -p 22 usuario@ip`

### "Não encontro o robô antigo"
Execute:
```bash
ps aux | grep python
find ~ -name "*.py" | grep -E "bot|telegram"
screen -ls
```

### "O robô para sozinho"
- Verifique se usou screen ou nohup
- Veja os logs para identificar erros
- Pode ser falta de memória na VPS

### "Não recebo mensagens no Telegram"
- Teste o token: `https://api.telegram.org/botSEU_TOKEN/getMe`
- Verifique se o bot está no canal
- Confirme o Chat ID

---

## 📞 Comandos Rápidos de Referência

```bash
# Conectar VPS
ssh usuario@ip

# Ver processos
ps aux | grep python

# Matar processo
kill -9 PID

# Ver sessões screen
screen -ls

# Entrar no screen
screen -r promo-bot

# Sair do screen (sem parar)
Ctrl+A depois D

# Ver logs
tail -f bot.log

# Reiniciar robô
pkill -9 -f main.py
screen -S promo-bot
python3 main.py
```

---

Agora é só seguir o guia passo a passo! 🚀
