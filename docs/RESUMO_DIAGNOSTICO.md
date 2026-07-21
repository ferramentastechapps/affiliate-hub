# 📊 RESUMO DO DIAGNÓSTICO — CUSTO DE IA

## 🎯 PROBLEMA IDENTIFICADO

**Custo Real:** ~$30/mês (60x maior que estimado)

**Causa Raiz:** Combinação de 3 fatores

---

## 🔍 DIAGNÓSTICO COMPLETO

### 1️⃣ Intervalo de Scraping Agressivo

❌ **Configuração atual:** `SEARCH_INTERVAL_MINUTES=5`  
✅ **Recomendado:** `SEARCH_INTERVAL_MINUTES=15`

**Impacto:** 288 ciclos/dia → 96 ciclos/dia (-67%)

---

### 2️⃣ Deduplicação Fraca no Bot

❌ **Atual:** Chave baseada em 60 chars do nome  
✅ **Proposto:** Chave baseada em platformId + platformType

**Problema:**
```python
# Bot considera diferentes:
"Smartphone Samsung Galaxy S24 256GB"
"Samsung Galaxy S24 256GB - Preto"
```

**Solução:**
```python
# Usar ID real da plataforma:
"mercadolivre:MLB1234567890"  # ✅ Único e confiável
```

**Impacto:** Reduz duplicatas em ~70%

---

### 3️⃣ Schema do Webhook JÁ Está Correto

✅ **Webhook deduplica corretamente:**
- Por `platformId + platformType` (ID real)
- Por `externalId + source`
- Por `nome` (últimos 7 dias)

✅ **Produtos existentes NÃO são re-processados:**
```typescript
const skipProcessing = existingProduct.aiProcessed && existingProduct.affiliateProcessed;
```

**Problema:** Duplicatas chegam do bot ANTES do webhook

---

## 🛠️ SOLUÇÃO (3 MUDANÇAS SIMPLES)

### Mudança #1: Melhorar Chave de Deduplicação

**Arquivo:** `bot/scrapers.py`

Adicionar método:

```python
def _gerar_chave_dedup(self, produto: dict) -> str:
    """Usa platformId se disponível, senão externalId, senão nome"""
    platform_id = produto.get('platformId')
    platform_type = produto.get('platformType')
    if platform_id and platform_type:
        return f"{platform_type}:{platform_id}"
    
    ext_id = produto.get('externalId')
    source = produto.get('source')
    if ext_id and source:
        return f"{source}:{ext_id}"
    
    return self._normalizar(produto['name'])[:60]
```

**Arquivo:** `bot/main.py` linha 40

```python
# ANTES:
chave = self.scraper._normalizar(p['name'])[:60]

# DEPOIS:
chave = self.scraper._gerar_chave_dedup(p)
```

---

### Mudança #2: Ajustar Intervalo

**Arquivo:** `.env`

```bash
SEARCH_INTERVAL_MINUTES=15
```

---

### Mudança #3: Adicionar Log de Eficiência

**Arquivo:** `bot/main.py` linha 149

```python
total_duplicados = len(produtos) - len(produtos_novos)
print(f'📊 Encontrado: {len(produtos)} produtos ({total_duplicados} duplicados, {len(produtos_novos)} novos)')
```

---

## 📈 RESULTADO ESPERADO

| Métrica | Antes | Depois | Redução |
|---------|-------|--------|---------|
| Ciclos/dia | 288 | 96 | -67% |
| Produtos/dia | 4.320-8.640 | 960-1.920 | -78% |
| Tokens/dia | 8.4M-16.8M | 1.9M-3.7M | -78% |
| **Custo/mês** | **$27-55** | **$6-12** | **-78%** ✅ |

**Economia: $21-43/mês**

---

## ✅ VERIFICAÇÃO

Após implementar, rodar:

```bash
cd bot
python main.py --once  # Ciclo 1
# Aguardar 15 min
python main.py --once  # Ciclo 2
```

**Logs esperados:**

**Ciclo 1:**
```
📊 Encontrado: 45 produtos (15 duplicados, 30 novos)
✨ Processando 30 produtos novos...
```

**Ciclo 2:**
```
📊 Encontrado: 45 produtos (45 duplicados, 0 novos)
✨ Nenhum produto novo para processar
```

✅ **Zero chamadas de IA no ciclo 2**

---

## 🚀 PRÓXIMOS PASSOS

1. ✋ **Aprovar mudanças** antes de implementar
2. 🛠️ Aplicar as 3 mudanças (15-30 min de trabalho)
3. 🧪 Testar com 2 ciclos manuais
4. 📊 Monitorar por 24h
5. 🎉 Confirmar redução de 78% no custo

**Pronto para implementar?**

