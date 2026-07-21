# 🔧 Corrigir Erro 502 Bad Gateway

## 🔍 O que significa?

Erro 502 = O Nginx está rodando, mas o Next.js (porta 3005) não está respondendo.

---

## 🚀 SOLUÇÃO RÁPIDA (Copie e cole no terminal da VPS)

```bash
# 1. Conectar na VPS
ssh root@212.85.10.239

# 2. Ir para a pasta do projeto
cd ~/affiliate-hub

# 3. Ver o que está rodando
pm2 status

# 4. Ver os logs de erro
pm2 logs nextjs --lines 50

# 5. Parar tudo
pm2 delete all

# 6. Limpar cache do Next.js
rm -rf .next

# 7. Instalar dependências (incluindo next-pwa)
npm install

# 8. Atualizar banco de dados
npx prisma db push

# 9. Build
npm run build

# 10. Iniciar Next.js
pm2 start npm --name "nextjs" -- start -- -p 3005

# 11. Salvar configuração
pm2 save

# 12. Ver status
pm2 status

# 13. Ver logs em tempo real
pm2 logs nextjs
```

---

## 🐛 POSSÍVEIS CAUSAS DO ERRO

### 1. Build falhou (mais provável)

O `next-pwa` pode ter causado erro no build. Vamos verificar:

```bash
# Ver logs do build
pm2 logs nextjs --lines 100 | grep -i error
```

**Se ver erro relacionado a `next-pwa`:**

```bash
# Solução temporária: desabilitar PWA em dev
cd ~/affiliate-hub
nano next.config.ts

# Mude esta linha:
# disable: process.env.NODE_ENV === "development",
# Para:
# disable: true,

# Salvar: Ctrl+O, Enter, Ctrl+X

# Rebuild
npm run build
pm2 restart nextjs
```

### 2. Porta 3005 já está em uso

```bash
# Ver o que está usando a porta 3005
lsof -i :3005

# Se houver algo, matar o processo
kill -9 <PID>

# Reiniciar
pm2 restart nextjs
```

### 3. Falta de memória

```bash
# Ver memória disponível
free -h

# Se estiver sem memória, aumentar swap:
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### 4. Variáveis de ambiente faltando

```bash
# Verificar .env
cat ~/affiliate-hub/.env

# Deve ter pelo menos:
# DATABASE_URL="file:./prisma/dev.db"
# API_SECRET_KEY="..."
# NEXT_PUBLIC_SITE_URL="http://212.85.10.239:3005"
```

---

## 🔍 DIAGNÓSTICO COMPLETO

Execute este script na VPS:

```bash
#!/bin/bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 DIAGNÓSTICO DO ERRO 502"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📊 Status do PM2:"
pm2 status

echo ""
echo "🔌 Porta 3005:"
lsof -i :3005 || echo "Nada rodando na porta 3005"

echo ""
echo "💾 Memória:"
free -h

echo ""
echo "📁 Arquivos do projeto:"
ls -lah ~/affiliate-hub/.next 2>/dev/null || echo ".next não existe (build não foi feito)"

echo ""
echo "📝 Últimos logs do Next.js:"
pm2 logs nextjs --lines 20 --nostream

echo ""
echo "🔑 Variáveis de ambiente:"
cat ~/affiliate-hub/.env | grep -v "SECRET\|KEY\|PASSWORD" || echo ".env não encontrado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

---

## 🆘 SOLUÇÃO DEFINITIVA (Se nada funcionar)

```bash
# 1. Conectar na VPS
ssh root@212.85.10.239

# 2. Backup do .env
cp ~/affiliate-hub/.env ~/affiliate-hub/.env.backup

# 3. Limpar tudo
cd ~/affiliate-hub
pm2 delete all
rm -rf .next
rm -rf node_modules
rm -rf package-lock.json

# 4. Reinstalar do zero
npm install

# 5. Verificar se next-pwa foi instalado
npm list next-pwa

# 6. Build
npm run build

# 7. Se o build falhar, desabilitar PWA temporariamente
# Edite next.config.ts e mude disable: false para disable: true

# 8. Iniciar
pm2 start npm --name "nextjs" -- start -- -p 3005
pm2 save

# 9. Ver logs
pm2 logs nextjs
```

---

## 📞 ME ENVIE ESTAS INFORMAÇÕES

Para eu te ajudar melhor, execute na VPS e me envie o resultado:

```bash
# 1. Status do PM2
pm2 status

# 2. Logs do Next.js
pm2 logs nextjs --lines 50 --nostream

# 3. Verificar se .next existe
ls -lah ~/affiliate-hub/.next

# 4. Verificar porta 3005
lsof -i :3005
```

---

## 🎯 CHECKLIST

- [ ] PM2 está rodando? (`pm2 status`)
- [ ] Next.js está na lista? (deve aparecer "nextjs")
- [ ] Status é "online"? (não "errored" ou "stopped")
- [ ] Porta 3005 está aberta? (`lsof -i :3005`)
- [ ] Build foi feito? (existe `.next` folder?)
- [ ] Logs mostram erro? (`pm2 logs nextjs`)

---

## 💡 DICA

Se o erro persistir, podemos desabilitar o PWA temporariamente para fazer o site voltar a funcionar, e depois ativar o PWA gradualmente.
