# 🔍 Diagnóstico: Projetos Misturados na VPS

## 🎯 Problema Identificado

Você tem **dois projetos diferentes** na mesma VPS:

1. **Affiliate Hub** (este projeto) - Ofertas e cupons
2. **Sinais de Criptomoedas** - Outro projeto

E eles estão **conflitando** porque:
- Ambos tentam usar a mesma porta ou domínio
- O Nginx está apontando para o projeto errado
- Os processos estão misturados

## 📊 Informações Atuais

- **VPS IP**: `212.85.10.239`
- **Domínio**: `123testando.useiotashop.com.br`
- **Porta Next.js**: `3005`
- **Script de Deploy**: `ship.ps1`

## 🔧 Comandos para Diagnosticar

Execute estes comandos **na VPS** (via SSH):

```bash
# 1. Conectar na VPS
ssh root@212.85.10.239

# 2. Ver todos os processos Node.js e Python rodando
ps aux | grep -E 'node|python' | grep -v grep

# 3. Ver status do PM2
pm2 status

# 4. Ver quais portas estão em uso
netstat -tulpn | grep -E '3000|3005|8000|8080'

# 5. Ver configuração do Nginx
cat /etc/nginx/sites-enabled/123testando.useiotashop.com.br

# 6. Ver logs do Nginx
tail -n 50 /var/log/nginx/error.log

# 7. Listar projetos na home
ls -la ~/

# 8. Ver processos do PM2
pm2 list
```

## 🎯 Possíveis Causas do Erro 500

### Causa 1: Nginx apontando para o projeto errado
```bash
# Verificar configuração do Nginx
cat /etc/nginx/sites-enabled/123testando.useiotashop.com.br
```

**Deve estar assim:**
```nginx
server {
    server_name 123testando.useiotashop.com.br;
    
    location / {
        proxy_pass http://127.0.0.1:3005;  # ← Porta correta do Affiliate Hub
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Causa 2: Next.js não está rodando
```bash
# Verificar se o Next.js está rodando na porta 3005
pm2 status
curl http://127.0.0.1:3005
```

### Causa 3: Banco de dados não configurado
```bash
# Verificar se o banco existe
cd ~/affiliate-hub
ls -la prisma/dev.db
```

### Causa 4: Projeto de criptomoedas usando a mesma porta
```bash
# Ver todos os processos na porta 3005
lsof -i :3005
```

## 🚀 Solução Rápida

### Opção 1: Separar os Projetos em Portas Diferentes

```bash
# Conectar na VPS
ssh root@212.85.10.239

# Parar todos os serviços
pm2 delete all
pkill -9 -f python3

# Configurar Affiliate Hub na porta 3005
cd ~/affiliate-hub
pm2 start npm --name "affiliate-hub" -- start -- -p 3005

# Configurar Sinais de Cripto na porta 3006 (se existir)
cd ~/crypto-signals  # ou o nome do projeto
pm2 start npm --name "crypto-signals" -- start -- -p 3006

# Salvar configuração do PM2
pm2 save

# Ver status
pm2 status
```

### Opção 2: Criar Subdomínios Separados

```nginx
# /etc/nginx/sites-enabled/affiliate.conf
server {
    server_name 123testando.useiotashop.com.br;
    location / {
        proxy_pass http://127.0.0.1:3005;
    }
}

# /etc/nginx/sites-enabled/crypto.conf
server {
    server_name crypto.useiotashop.com.br;
    location / {
        proxy_pass http://127.0.0.1:3006;
    }
}
```

## 📝 Script de Limpeza

Criei um script para limpar e reorganizar:

```bash
#!/bin/bash
# limpar_vps_projetos.sh

echo "🧹 Limpando projetos misturados..."

# Parar tudo
pm2 delete all
pkill -9 -f python3
pkill -9 -f node

# Listar projetos
echo "📂 Projetos encontrados:"
ls -la ~/ | grep -E 'affiliate|crypto|signal'

# Perguntar qual projeto manter em cada porta
echo "Qual projeto deve rodar em 123testando.useiotashop.com.br?"
echo "1. affiliate-hub"
echo "2. crypto-signals"
read -p "Escolha (1 ou 2): " choice

if [ "$choice" == "1" ]; then
    cd ~/affiliate-hub
    npm run build
    pm2 start npm --name "affiliate-hub" -- start -- -p 3005
    pm2 save
    echo "✅ Affiliate Hub configurado em http://127.0.0.1:3005"
else
    echo "Configure o projeto de criptomoedas manualmente"
fi
```

## 🔍 Próximos Passos

1. **Execute os comandos de diagnóstico** acima
2. **Identifique qual projeto está rodando** na porta 3005
3. **Separe os projetos** em portas diferentes
4. **Atualize o Nginx** para apontar corretamente
5. **Teste o acesso** ao domínio

## 📞 Me Envie os Resultados

Execute este comando e me envie a saída:

```bash
ssh root@212.85.10.239 "
echo '=== PM2 STATUS ==='
pm2 status
echo ''
echo '=== PROCESSOS NODE/PYTHON ==='
ps aux | grep -E 'node|python' | grep -v grep
echo ''
echo '=== PORTAS EM USO ==='
netstat -tulpn | grep -E '3000|3005|3006|8000'
echo ''
echo '=== PROJETOS NA HOME ==='
ls -la ~/ | grep -E 'affiliate|crypto|signal|bot'
echo ''
echo '=== NGINX CONFIG ==='
cat /etc/nginx/sites-enabled/123testando.useiotashop.com.br 2>/dev/null || echo 'Arquivo não encontrado'
"
```

Isso vai me ajudar a identificar exatamente o que está acontecendo!
