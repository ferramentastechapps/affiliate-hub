# Resumo das Correções - Links de Afiliados Terceiros

## ✅ O QUE FOI IMPLEMENTADO

### 1. Scraping com URL Resolvida (PROBLEMA 2) ✅
**Arquivo:** `bot/telegram_listener.py` (linhas 445-457)

**O que faz:**
Antes de fazer scraping, resolve URLs encurtadas (`divulgador.link`, `amzn.to`, etc.) para suas URLs reais.

**Resultado:**
- Antes: Scraping de `amzn.divulgador.link` → Nome: "Amazon.com.br"
- Depois: Scraping de `amazon.com.br/dp/B0H3PVXCKD` → Nome: "Chaleira Elétrica..."

### 2. Suporte para divulgador.link ✅
**Arquivo:** `src/lib/affiliate.ts` (linha 578)

**O que faz:**
`divulgador.link` está na lista de URLs curtas que precisam ser resolvidas.

**Fluxo:**
1. Detecta `divulgador.link`
2. Segue redirect até URL real da Amazon
3. Extrai ASIN
4. Limpa tags alheias
5. Aplica nossa tag

### 3. Limpeza de Tags Alheias ✅
**Arquivo:** `src/lib/affiliate.ts` (linha 766 - função cleanTrackingParams)

**O que faz:**
Remove parâmetros de rastreamento antes de aplicar nossa tag, incluindo:
- `tag` (Amazon)
- `ref` (Mercado Livre)
- UTMs e outros rastreadores

---

## ⚠️ O QUE PRECISA SER FEITO NA VPS

### PROBLEMA 1: Adicionar AMAZON_TAG no .env

**Por que:** 
Sem `AMAZON_TAG` no `.env`, o código não consegue aplicar nossa tag `jota012d-20`.

**Como corrigir:**

```bash
# Conectar na VPS
ssh root@212.85.10.239

# Navegar para o projeto
cd /root/affiliate-hub

# Atualizar código
git pull

# Verificar se AMAZON_TAG existe
grep "AMAZON_TAG" .env

# Se NÃO encontrou, adicionar:
echo "" >> .env
echo "# Tag de afiliado Amazon" >> .env
echo "AMAZON_TAG=jota012d-20" >> .env

# Confirmar
grep "AMAZON_TAG" .env

# Build e restart
npm run build
pm2 restart ecosystem.config.js
```

---

## 🧪 COMO TESTAR

### 1. Enviar no Telegram
```
https://amzn.divulgador.link/JsQPa8IE
```

### 2. Resultado Esperado

✅ **Link gerado:**
```
https://www.amazon.com.br/dp/B0H3PVXCKD?tag=jota012d-20
```

✅ **Nome do produto:**
```
Chaleira Elétrica Inox 1,8 Litros...
```
(NÃO "Amazon.com.br")

✅ **Foto:**
Imagem da chaleira (não logo da Amazon)

✅ **Sem timeout:**
Bot responde em menos de 60 segundos

### 3. Verificar Logs

```bash
# Logs do Next.js
pm2 logs nextjs --lines 50 | grep -i "divulgador\|B0H3PVXCKD\|tag="

# Logs do bot
pm2 logs affiliate-scraper --lines 50 | grep -i "chaleira\|divulgador"
```

---

## 📋 CHECKLIST RÁPIDO

- [x] Código atualizado localmente
- [x] Commit e push feitos
- [ ] **Conectar na VPS**
- [ ] **git pull**
- [ ] **Adicionar AMAZON_TAG no .env**
- [ ] **npm run build**
- [ ] **pm2 restart ecosystem.config.js**
- [ ] **Testar com o link da chaleira**
- [ ] **Verificar resultado esperado**

---

## 📝 ARQUIVOS MODIFICADOS

| Arquivo | Mudança | Status |
|---------|---------|--------|
| `bot/telegram_listener.py` | Resolve redirect antes do scraping | ✅ Commitado |
| `src/lib/affiliate.ts` | `divulgador.link` na lista | ✅ Já estava |
| `.env` na VPS | Precisa adicionar `AMAZON_TAG` | ⚠️ Pendente |

---

## 🔧 COMANDOS PRONTOS

**Comando único (copiar e colar):**
```bash
ssh root@212.85.10.239 "cd /root/affiliate-hub && git pull && echo '' >> .env && echo '# Tag de afiliado Amazon' >> .env && echo 'AMAZON_TAG=jota012d-20' >> .env && grep 'AMAZON_TAG' .env && npm run build && pm2 restart ecosystem.config.js && pm2 list"
```

**Se quiser fazer passo a passo, use o arquivo:**
```
comandos-vps.txt
```

---

## 🐛 DEBUGGING

Se após as correções ainda houver problemas:

### Link ainda com tag errada
```bash
# Verificar se a variável foi carregada
ssh root@212.85.10.239 "cd /root/affiliate-hub && grep AMAZON_TAG .env"

# Verificar se o PM2 reiniciou
ssh root@212.85.10.239 "pm2 list"
```

### Scraping ainda retorna "Amazon.com.br"
```bash
# Verificar se o código foi atualizado
ssh root@212.85.10.239 "cd /root/affiliate-hub && git log --oneline -5"

# Verificar se o bot reiniciou
ssh root@212.85.10.239 "pm2 restart affiliate-scraper && pm2 logs affiliate-scraper --lines 20"
```

### Timeout persiste
```bash
# Aumentar timeout no listener para 90s
# Editar bot/telegram_listener.py linha 463:
# timeout=90
```
