# 🚀 COMANDOS DE DEPLOY — COPIAR E COLAR

## 📋 CHECKLIST PRÉ-DEPLOY

- [x] Código implementado localmente
- [ ] Git status limpo ou pronto para commit
- [ ] Acesso SSH à VPS funcionando
- [ ] PM2 rodando na VPS

---

## 🔧 PASSO 1: COMMIT E PUSH (Local)

### Windows PowerShell:
```powershell
# Verificar status
git status

# Adicionar todas as mudanças
git add -A

# Commit
git commit -m "feat: otimização de custo de IA (-78%) + correção de links terceiros"

# Push
git push
```

**Resultado esperado:**
```
[main abc1234] feat: otimização de custo de IA (-78%) + correção de links terceiros
 8 files changed, 450 insertions(+), 20 deletions(-)
 create mode 100644 bot/testar_deduplicacao.py
 create mode 100644 RESUMO_EXECUTIVO.md
 ...
```

---

## 🌐 PASSO 2: DEPLOY NA VPS

### Comando Único (Copiar e Colar):
```bash
ssh root@212.85.10.239 << 'EOF'
cd /root/affiliate-hub
echo "📥 Fazendo pull do repositório..."
git pull
echo ""
echo "📦 Instalando dependências (se houver novas)..."
npm install
echo ""
echo "🔨 Buildando Next.js..."
npm run build
echo ""
echo "✅ Adicionando AMAZON_TAG ao .env..."
if ! grep -q "AMAZON_TAG" .env; then
  echo "" >> .env
  echo "# Tag de afiliado Amazon" >> .env
  echo "AMAZON_TAG=jota012d-20" >> .env
  echo "✅ AMAZON_TAG adicionada"
else
  echo "ℹ️  AMAZON_TAG já existe no .env"
fi
echo ""
echo "🔄 Reiniciando serviços PM2..."
pm2 restart ecosystem.config.js
echo ""
echo "📊 Status dos serviços:"
pm2 list
echo ""
echo "✅ Deploy concluído!"
EOF
```

### Se preferir passo a passo:
```bash
# 1. Conectar à VPS
ssh root@212.85.10.239

# 2. Ir para o diretório
cd /root/affiliate-hub

# 3. Pull
git pull

# 4. Build
npm run build

# 5. Adicionar AMAZON_TAG
echo 'AMAZON_TAG=jota012d-20' >> .env

# 6. Reiniciar
pm2 restart ecosystem.config.js

# 7. Verificar
pm2 list
pm2 logs --lines 20
```

---

## 🧪 PASSO 3: TESTES

### Teste 1: Verificar Logs (Imediato)
```bash
ssh root@212.85.10.239 "pm2 logs nextjs --lines 30"
```

**Procurar por:**
- ✅ "Server listening on port 3005"
- ✅ Sem erros de compilação
- ✅ Sem erros de variável undefined

---

### Teste 2: Verificar .env (AMAZON_TAG)
```bash
ssh root@212.85.10.239 "grep AMAZON_TAG /root/affiliate-hub/.env"
```

**Resultado esperado:**
```
AMAZON_TAG=jota012d-20
```

---

### Teste 3: Teste de Link Terceiro (5 min)

**No Telegram, enviar para o bot:**
```
https://amzn.divulgador.link/JsQPa8IE
```

**Aguardar resposta e verificar logs:**
```bash
ssh root@212.85.10.239 "pm2 logs affiliate-scraper --lines 50 | grep -A5 -B5 'divulgador\|chaleira'"
```

**Resultado esperado:**
- ✅ Nome: "Chaleira Elétrica..." (não "Amazon.com.br")
- ✅ Link gerado: `tag=jota012d-20`
- ✅ Foto da chaleira
- ✅ Sem timeout

---

### Teste 4: Teste de Deduplicação (30 min)

**Na VPS, rodar o bot em modo teste:**
```bash
ssh root@212.85.10.239 << 'EOF'
cd /root/affiliate-hub/bot
echo "🧪 Ciclo 1: Processando produtos..."
python3 main.py --once | tee ciclo1.log
echo ""
echo "⏰ Aguardando 15 minutos..."
sleep 900
echo ""
echo "🧪 Ciclo 2: Validando deduplicação..."
python3 main.py --once | tee ciclo2.log
echo ""
echo "📊 Comparando resultados:"
echo "--- CICLO 1 ---"
grep "Dedup" ciclo1.log
echo ""
echo "--- CICLO 2 ---"
grep "Dedup" ciclo2.log
EOF
```

**Resultado esperado (Ciclo 2):**
```
📊 [Dedup] 45 encontrados | 45 duplicados (100.0%) | 0 novos para processar
```

---

## 📊 PASSO 4: MONITORAMENTO (24h)

### Dashboard Gemini
1. Acessar: https://console.cloud.google.com/apis
2. Verificar: Tokens consumidos/dia
3. Esperar: Queda de ~8-16M para ~2-4M tokens/dia

### Logs do Bot
```bash
ssh root@212.85.10.239 "tail -f /root/affiliate-hub/bot/logs/bot.log"
```

**Observar:**
- Taxa de deduplicação > 70%
- Log `📊 [Dedup]` em cada ciclo
- Intervalo de 15 minutos entre ciclos

---

## 🚨 TROUBLESHOOTING

### Problema: Git pull falha
```bash
ssh root@212.85.10.239
cd /root/affiliate-hub
git status  # Ver o que mudou
git stash   # Salvar mudanças locais
git pull    # Tentar novamente
```

### Problema: Build falha
```bash
ssh root@212.85.10.239
cd /root/affiliate-hub
rm -rf .next
npm run build
```

### Problema: PM2 não reinicia
```bash
ssh root@212.85.10.239
pm2 kill
pm2 start ecosystem.config.js
```

### Problema: AMAZON_TAG não funciona
```bash
ssh root@212.85.10.239
cat /root/affiliate-hub/.env | grep AMAZON
# Se não aparecer:
echo 'AMAZON_TAG=jota012d-20' >> /root/affiliate-hub/.env
pm2 restart nextjs
```

---

## ✅ CRITÉRIOS DE SUCESSO

### Imediato (0-5 min)
- [ ] Git push bem-sucedido
- [ ] Build sem erros
- [ ] PM2 rodando (all online)
- [ ] AMAZON_TAG no .env

### Curto Prazo (1h)
- [ ] Link terceiro retorna com tag correta
- [ ] Nome e foto corretos (não "Amazon.com.br")
- [ ] Sem timeout no Telegram

### Médio Prazo (24h)
- [ ] Taxa de deduplicação > 70%
- [ ] Bot roda a cada 15 min (não 5)
- [ ] Tokens/dia começam a cair

### Longo Prazo (7 dias)
- [ ] Custo mensal cai para $6-12
- [ ] Dashboard Gemini mostra 2-4M tokens/dia

---

## 🎯 COMANDO FINAL (TUDO DE UMA VEZ)

Se quiser fazer TUDO automaticamente:

```bash
# Local: Commit e Push
git add -A && git commit -m "feat: otimização de custo (-78%) + correção links terceiros" && git push && echo "✅ Push concluído!" && \

# VPS: Deploy completo
ssh root@212.85.10.239 "cd /root/affiliate-hub && git pull && npm run build && grep -q 'AMAZON_TAG' .env || echo 'AMAZON_TAG=jota012d-20' >> .env && pm2 restart ecosystem.config.js && pm2 list && echo '✅ Deploy concluído! Pronto para testes.'"
```

**⚠️ Atenção:** Esse comando faz tudo automaticamente. Use apenas se tiver certeza.

---

## 📝 APÓS O DEPLOY

1. **Testar link terceiro no Telegram**
2. **Verificar logs:** `pm2 logs --lines 50`
3. **Monitorar por 24h**
4. **Checar custo no dashboard Gemini após 7 dias**

---

**Pronto para deploy! 🚀**
