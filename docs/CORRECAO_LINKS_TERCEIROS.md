# Correção de Links de Afiliados Terceiros

## Status: ✅ PARCIALMENTE IMPLEMENTADO

Após análise dos logs do teste com `https://amzn.divulgador.link/JsQPa8IE`, foram identificados 3 problemas:

---

## PROBLEMA 1: TAG ERRADA NO LINK ❌

**Situação detectada nos logs:**
```
URL resolvida: amazon.com.br/.../B0H3PVXCKD?tag=economiz.wpp1-20
```

**Causa raiz:**
O arquivo `.env` na VPS **NÃO tem** `AMAZON_TAG` definida, então o código usa uma tag default hardcoded ou de outra fonte.

**Fluxo atual do código (CORRETO):**
1. ✅ `resolveRedirect(url)` → Resolve `divulgador.link` para URL final da Amazon (com tag alheia)
2. ✅ `cleanTrackingParams(url)` → Remove parâmetro `tag` (e outros rastreadores)
3. ✅ Aplica `tag=jota012d-20` (SE definida no .env)

**Problema:** 
A variável `process.env.AMAZON_TAG` está **undefined** na VPS, então o código não consegue aplicar nossa tag.

**Solução:**
```bash
# Na VPS, executar:
ssh root@212.85.10.239
cd /root/affiliate-hub
./verificar-env-vps.sh
pm2 restart nextjs
```

Ou manualmente:
```bash
echo "" >> /root/affiliate-hub/.env
echo "# Tag de afiliado Amazon" >> /root/affiliate-hub/.env
echo "AMAZON_TAG=jota012d-20" >> /root/affiliate-hub/.env
pm2 restart nextjs
```

---

## PROBLEMA 2: SCRAPING RETORNANDO "Amazon.com.br" ✅ CORRIGIDO

**Situação detectada:**
O scraper retornou "Amazon.com.br" como nome do produto (raspou a página errada).

**Causa raiz:**
O bot Python estava fazendo scraping do link encurtado `amzn.divulgador.link`, não da URL resolvida.

**Solução implementada:**
Código adicionado em `bot/telegram_listener.py` (linhas 443-456):

```python
# Resolver redirects de URLs encurtadas antes do scraping
link_para_scraping = link
if any(domain in link.lower() for domain in ['amzn.to', 'divulgador.link', 'shope.ee', 'meli.la', 'bit.ly', 'tinyurl.com']):
    try:
        print(f"🔗 URL encurtada detectada, resolvendo redirect: {link}")
        resolve_resp = requests.get(link, allow_redirects=True, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        link_para_scraping = resolve_resp.url
        print(f"✅ URL resolvida para scraping: {link_para_scraping}")
    except Exception as e:
        print(f"⚠️ Erro ao resolver redirect, usando link original: {e}")
```

Agora usa `link_para_scraping` (URL resolvida) no POST para `/api/scrape`.

**Status:** ✅ IMPLEMENTADO e pronto para teste

---

## PROBLEMA 3: TIMEOUT NO LISTENER ⏱️ 

**Situação detectada:**
Bot relatou "Sem resposta da API" mas logs do Next.js mostram que processou com sucesso.

**Análise:**

### Timeout atual no listener:
```python
# bot/telegram_listener.py
scrape_resp = requests.post("http://127.0.0.1:3005/api/scrape", json={"url": link_para_scraping}, timeout=60)
```

✅ Timeout está em **60 segundos** (correto)

### Possíveis causas:

1. **Next.js demorando >60s:**
   - Resolve redirect (até 8s)
   - Scraping da página (até 10s)
   - Análise do Gemini (até 30s)
   - **Total potencial: ~48s** (dentro do limite)

2. **Webhook interno demorando:**
   - O `/api/scrape` chama `/api/webhook/products` internamente
   - Esse webhook faz várias operações (affiliate, validate, save)
   - Se alguma operação travar (ex: validação de MLB), pode ultrapassar 60s

**Verificações necessárias:**
```bash
# Na VPS, após o teste:
pm2 logs nextjs --lines 100 | grep -E "scrape|webhook|timeout"
```

**Próximos passos:**
1. Testar após corrigir o PROBLEMA 1
2. Se ainda houver timeout, aumentar para 90s:
   ```python
   timeout=90
   ```

---

## CHECKLIST DE DEPLOY E TESTE

### 1. Verificar código local
- [x] `src/lib/affiliate.ts` - `divulgador.link` na lista de short links
- [x] `src/lib/affiliate.ts` - `cleanTrackingParams()` remove `tag`
- [x] `bot/telegram_listener.py` - Resolve redirect antes de scraping

### 2. Deploy na VPS
```bash
# Local
git add -A
git commit -m "fix: resolver links de afiliados terceiros corretamente"
git push

# VPS
ssh root@212.85.10.239
cd /root/affiliate-hub
git pull
npm run build
pm2 restart ecosystem.config.js
pm2 logs --lines 20
```

### 3. Adicionar AMAZON_TAG no .env da VPS
```bash
ssh root@212.85.10.239
cd /root/affiliate-hub
./verificar-env-vps.sh
pm2 restart nextjs
```

### 4. Testar com o link da chaleira
No Telegram, enviar:
```
https://amzn.divulgador.link/JsQPa8IE
```

### 5. Verificar resultado esperado
```bash
# Logs do Next.js
pm2 logs nextjs --lines 50 | grep -A5 -B5 "divulgador"

# Logs do bot
pm2 logs affiliate-scraper --lines 50 | grep -A5 -B5 "chaleira\|divulgador"
```

**Resultado esperado:**
- ✅ Link gerado: `https://www.amazon.com.br/dp/B0H3PVXCKD?tag=jota012d-20`
- ✅ Nome: "Chaleira Elétrica..." (não "Amazon.com.br")
- ✅ Foto: Imagem da chaleira (não logo da Amazon)
- ✅ Sem timeout no bot

---

## RESUMO DE CORREÇÕES

| Problema | Status | Ação Necessária |
|----------|--------|-----------------|
| **Problema 1: Tag errada** | ⚠️ Pendente | Adicionar `AMAZON_TAG=jota012d-20` no `.env` da VPS |
| **Problema 2: Scraping errado** | ✅ Corrigido | Deploy do código atualizado |
| **Problema 3: Timeout** | 🔍 Verificar | Testar após correções 1 e 2 |

---

## CÓDIGO RELEVANTE

### affiliate.ts - Fluxo correto
```typescript
export async function generateAffiliateLink(originalUrl: string, preResolvedUrl?: string): Promise<string | null> {
  // 1. Resolver redirecionamentos (divulgador.link → amazon.com.br com tag alheia)
  const resolvedUrl = preResolvedUrl || await resolveRedirect(originalUrl);
  
  // 2. Limpar tags alheias
  const cleanedUrl = cleanTrackingParams(resolvedUrl);
  
  // 3. Aplicar nossa tag
  const amazonTag = process.env.AMAZON_TAG; // ← PRECISA ESTAR NO .ENV
  if (amazonTag && details.asin) {
    return `https://www.amazon.com.br/dp/${details.asin}?tag=${amazonTag}`;
  }
  // ...
}
```

### telegram_listener.py - Scraping com URL resolvida
```python
# Resolver redirect ANTES do scraping
link_para_scraping = link
if any(domain in link.lower() for domain in ['divulgador.link', 'amzn.to', ...]):
    resolve_resp = requests.get(link, allow_redirects=True, timeout=10)
    link_para_scraping = resolve_resp.url

# Fazer scraping da URL resolvida
scrape_resp = requests.post("http://127.0.0.1:3005/api/scrape", 
                            json={"url": link_para_scraping}, 
                            timeout=60)
```

---

## COMANDOS RÁPIDOS

```bash
# Deploy completo
git push && ssh root@212.85.10.239 "cd /root/affiliate-hub && git pull && npm run build && pm2 restart ecosystem.config.js"

# Adicionar AMAZON_TAG
ssh root@212.85.10.239 "echo 'AMAZON_TAG=jota012d-20' >> /root/affiliate-hub/.env && pm2 restart nextjs"

# Verificar logs após teste
ssh root@212.85.10.239 "pm2 logs nextjs --lines 50 | grep -i 'amazon\|divulgador\|tag=' && pm2 logs affiliate-scraper --lines 50 | grep -i 'chaleira\|amazon'"
```
