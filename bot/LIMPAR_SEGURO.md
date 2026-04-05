# 🛡️ Guia Seguro - Sem Afetar Outros Robôs

## ⚠️ IMPORTANTE: Você tem outros robôs rodando!

Este guia garante que você vai remover APENAS o robô de promoções, sem afetar seu robô de day trade ou outros.

---

## 🔍 PASSO 1: Identificar APENAS o Robô de Promoções

### 1.1 - Conectar na VPS:
```bash
ssh usuario@ip-da-vps
```

### 1.2 - Listar TODOS os processos Python:
```bash
ps aux | grep python
```

Você verá algo como:
```
root  1234  python3 bot_daytrade.py
root  5678  python3 bot_promocoes.py
root  9012  python3 telegram_promo.py
```

**📝 ANOTE os PIDs (números) APENAS dos processos de promoções!**

### 1.3 - Ver detalhes de cada processo:
```bash
# Substitua 5678 pelo PID que você quer verificar
ps -p 5678 -o pid,cmd
```

Isso mostra o comando completo. Identifique qual é o de promoções.

---

## 🎯 PASSO 2: Matar APENAS o Robô de Promoções

### 2.1 - Matar processo específico:
```bash
# Substitua 5678 pelo PID do robô de PROMOÇÕES
kill -9 5678
kill -9 9012  # Se tiver mais de um processo
```

**❌ NÃO USE:** `pkill -9 -f python` (isso mata TODOS os Python!)

### 2.2 - Verificar se matou apenas o correto:
```bash
ps aux | grep python
```

Seu robô de day trade deve continuar aparecendo!

---

## 📂 PASSO 3: Encontrar APENAS o Diretório de Promoções

### 3.1 - Listar diretórios no home:
```bash
ls -la ~/
```

Procure por nomes como:
- `bot-promocoes/`
- `telegram-promo/`
- `bot-telegram/`
- `promocoes/`

**NÃO delete:**
- `bot-daytrade/`
- `daytrade/`
- `trading/`
- Ou qualquer outro que não seja de promoções!

### 3.2 - Ver o conteúdo antes de deletar:
```bash
# Substitua pelo caminho que você encontrou
ls -la ~/bot-promocoes/
cat ~/bot-promocoes/main.py  # Ver o código
```

Confirme que é o robô de promoções lendo o código.

### 3.3 - Fazer backup (SEMPRE!):
```bash
# Fazer backup antes de deletar
cp -r ~/bot-promocoes ~/backup-bot-promocoes-$(date +%Y%m%d)
```

### 3.4 - Deletar APENAS o diretório de promoções:
```bash
rm -rf ~/bot-promocoes/
```

---

## 🖥️ PASSO 4: Verificar Sessões Screen (Com Cuidado)

### 4.1 - Listar todas as sessões:
```bash
screen -ls
```

Você verá algo como:
```
12345.daytrade     (Detached)
67890.promocoes    (Detached)
```

### 4.2 - Entrar em cada sessão para ver o que é:
```bash
# Entrar na sessão
screen -r 67890

# Ver o que está rodando
# Se for o robô de promoções, saia e mate
# Ctrl+C para parar
# exit para sair

# Se for o day trade, NÃO MATE!
# Apenas desanexe: Ctrl+A depois D
```

### 4.3 - Matar APENAS a sessão de promoções:
```bash
screen -X -S 67890.promocoes quit
```

**❌ NÃO mate a sessão do day trade!**

---

## ⚙️ PASSO 5: Verificar Serviços (Se Houver)

### 5.1 - Listar serviços:
```bash
systemctl list-units | grep -E "bot|promo|telegram"
```

### 5.2 - Ver detalhes do serviço:
```bash
systemctl status nome-do-servico
```

Leia a descrição para confirmar que é de promoções.

### 5.3 - Parar APENAS o serviço de promoções:
```bash
sudo systemctl stop bot-promocoes
sudo systemctl disable bot-promocoes
```

---

## ✅ PASSO 6: Verificação Final

### 6.1 - Confirmar que o day trade ainda está rodando:
```bash
ps aux | grep daytrade
```

Deve aparecer o processo!

### 6.2 - Confirmar que o robô de promoções foi removido:
```bash
ps aux | grep promo
```

Não deve aparecer nada.

---

## 🚀 PASSO 7: Instalar o Novo Robô

Agora sim, instale o novo robô:

```bash
cd ~
git clone https://github.com/ferramentastechapps/affiliate-hub.git
cd affiliate-hub/bot
pip3 install -r requirements.txt
cp .env.example .env
nano .env  # Configure
python3 main.py --once  # Testar
```

---

## 🛡️ Script Seguro (Versão Manual)

Use este script que pede confirmação em CADA passo:

```bash
#!/bin/bash

echo "🛡️ Limpeza SEGURA - Apenas Robô de Promoções"
echo "=============================================="
echo ""

# Mostrar TODOS os processos Python
echo "📋 Processos Python rodando:"
ps aux | grep python | grep -v grep | nl

echo ""
read -p "Digite o PID do processo de PROMOÇÕES que deseja matar (ou 0 para pular): " pid

if [ "$pid" != "0" ]; then
    ps -p $pid -o pid,cmd
    read -p "Confirma que este é o processo de PROMOÇÕES? (s/N): " confirma
    if [ "$confirma" = "s" ]; then
        kill -9 $pid
        echo "✅ Processo $pid finalizado"
    else
        echo "❌ Cancelado"
    fi
fi

echo ""
echo "📂 Diretórios no home:"
ls -la ~/ | grep -E "bot|promo|telegram"

echo ""
read -p "Digite o CAMINHO COMPLETO do diretório de promoções (ou deixe vazio para pular): " dir

if [ ! -z "$dir" ]; then
    echo "Conteúdo de $dir:"
    ls -la "$dir"
    
    read -p "Confirma que este é o diretório de PROMOÇÕES? (s/N): " confirma
    if [ "$confirma" = "s" ]; then
        # Fazer backup
        backup="$dir-backup-$(date +%Y%m%d-%H%M%S)"
        cp -r "$dir" "$backup"
        echo "✅ Backup criado em: $backup"
        
        # Deletar
        rm -rf "$dir"
        echo "✅ Diretório removido"
    else
        echo "❌ Cancelado"
    fi
fi

echo ""
echo "✅ Limpeza concluída!"
echo "Verifique se o day trade ainda está rodando:"
echo "  ps aux | grep daytrade"
```

---

## 📝 Checklist de Segurança

Antes de deletar qualquer coisa, confirme:

- [ ] Identifiquei o PID correto do robô de promoções
- [ ] Verifiquei o comando completo do processo
- [ ] Identifiquei o diretório correto
- [ ] Vi o conteúdo do diretório
- [ ] Fiz backup do diretório
- [ ] Confirmei que NÃO é o robô de day trade
- [ ] Verifiquei que o day trade continua rodando após a remoção

---

## 🆘 Se Deletar o Errado

Se acidentalmente parar o day trade:

### 1. Verificar se tem backup:
```bash
ls -la ~/ | grep backup
```

### 2. Restaurar do backup:
```bash
cp -r ~/backup-bot-daytrade-20240405 ~/bot-daytrade
```

### 3. Reiniciar:
```bash
cd ~/bot-daytrade
screen -S daytrade
python3 main.py
# Ctrl+A depois D
```

---

## 💡 Dicas Importantes

1. **SEMPRE faça backup antes de deletar**
2. **NUNCA use comandos que afetam "todos os Python"**
3. **Leia o código antes de deletar** para confirmar
4. **Teste um comando por vez**
5. **Mantenha o terminal do day trade aberto** para monitorar

---

## ✅ Comandos Seguros vs ❌ Comandos Perigosos

### ✅ SEGUROS (use estes):
```bash
kill -9 5678                    # Mata processo específico
rm -rf ~/bot-promocoes/         # Remove diretório específico
screen -X -S promocoes quit     # Mata sessão específica
```

### ❌ PERIGOSOS (NÃO use):
```bash
pkill -9 -f python             # Mata TODOS os Python!
rm -rf ~/bot*/                 # Remove TODOS os diretórios bot*!
killall python                 # Mata TODOS os Python!
```

---

Siga este guia e seu robô de day trade ficará intacto! 🛡️
