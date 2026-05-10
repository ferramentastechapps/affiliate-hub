# 🧪 Como Testar as Melhorias do Bot

## 🚀 Teste Rápido (Recomendado)

Execute o script de teste que valida todas as novas fontes:

```bash
cd bot
python testar_novas_fontes.py
```

Este script irá:
- ✅ Testar cada nova fonte individualmente
- ✅ Mostrar quantos itens cada fonte encontrou
- ✅ Testar a busca completa em paralelo
- ✅ Mostrar o top 5 produtos por score
- ✅ Exibir métricas detalhadas

---

## 🔍 Teste Individual de Fontes

### Testar Shopee Flash Sale
```bash
cd bot
python -c "from scrapers import PromotionScraper; s = PromotionScraper(); print(len(s.buscar_promocoes_shopee()), 'produtos')"
```

### Testar Cuponomia
```bash
cd bot
python -c "from scrapers import PromotionScraper; s = PromotionScraper(); print(len(s.buscar_cupons_cuponomia()), 'cupons')"
```

### Testar Méliuz
```bash
cd bot
python -c "from scrapers import PromotionScraper; s = PromotionScraper(); print(len(s.buscar_promocoes_meliuz()), 'produtos')"
```

### Testar Hardmob (Fix 403)
```bash
cd bot
python -c "from scrapers import PromotionScraper; s = PromotionScraper(); print(len(s.buscar_promocoes_hardmob_fixed()), 'produtos')"
```

---

## 🐛 Modo Debug (Ver Tudo Sem Filtros)

### 1. Ativar Modo Debug

Edite o arquivo `.env` e adicione:
```bash
DEBUG_FILTROS=true
```

### 2. Executar Bot Uma Vez
```bash
cd bot
python main.py --once
```

### 3. O que você verá:
- 🐛 Todos os produtos encontrados (sem filtro de score)
- 📊 Score detalhado de cada produto
- 🔍 Motivo de cada pontuação

### 4. Desativar Modo Debug
```bash
# No .env:
DEBUG_FILTROS=false
```

---

## 📊 Teste de Busca Completa

Execute uma busca completa com todas as fontes:

```bash
cd bot
python main.py --once
```

Você verá:
```
📡 Buscando em múltiplas fontes (PARALELO)...
   ✅ Promobit: 15 itens em 2.3s
   ✅ Promobyte: 12 itens em 3.1s
   ✅ Shopee Flash Sale: 8 itens em 4.2s
   ✅ Cuponomia: 5 cupons em 1.8s
   ✅ Méliuz: 10 itens em 3.5s
   ❌ Hardmob: ERRO - HTTP 403 Forbidden

📊 Resultados:
   🔍 Total encontrado: 85 produtos
   ✨ Únicos: 62 produtos
   🔥 Qualidade alta (score ≥30): 45 produtos
   ❌ Descartados: 17 produtos
   🎫 Cupons: 15

📈 Métricas por fonte:
   📦 Promobit: 15 itens em 2.3s
   📦 Promobyte: 12 itens em 3.1s
   ...
```

---

## 🔧 Ajustar Configurações

### Reduzir Score Mínimo (Aceitar Mais Produtos)

No `.env`:
```bash
# Padrão: 30
MIN_QUALITY_SCORE=20  # Mais permissivo
```

### Aumentar Score Mínimo (Só Melhores Ofertas)

No `.env`:
```bash
MIN_QUALITY_SCORE=50  # Mais rigoroso
```

### Ajustar Intervalo de Busca

No `.env`:
```bash
# Padrão: 2 minutos
SEARCH_INTERVAL_MINUTES=5  # Menos agressivo
```

---

## 📝 Ver Produtos Descartados

Execute com modo normal e veja os logs:

```bash
cd bot
python main.py --once
```

Procure por:
```
⚠️  Produtos descartados (mostrando primeiros 10 de 45):
   1. [28pts] Caneta Esferográfica Azul
      └─ sem desconto calculável, loja Amazon (+20pts), preço R$5.90 (+5pts)
```

---

## 🎯 Teste de Deduplicação

Execute duas vezes seguidas e veja que não há duplicatas:

```bash
cd bot
python main.py --once
# Aguarde 10 segundos
python main.py --once
```

O bot deve mostrar:
```
✨ Novos: 0 produtos e 0 cupons
```

---

## 🚨 Troubleshooting

### Nenhum produto encontrado?

1. **Ative modo debug:**
   ```bash
   DEBUG_FILTROS=true
   ```

2. **Reduza score mínimo:**
   ```bash
   MIN_QUALITY_SCORE=10
   ```

3. **Execute teste:**
   ```bash
   python main.py --once
   ```

### Fonte específica sempre falha?

1. **Teste individualmente:**
   ```bash
   python testar_novas_fontes.py
   ```

2. **Verifique se não é bloqueio temporário** (aguarde 1h)

3. **Verifique conexão com internet**

### Muitas duplicatas?

Ajuste threshold de similaridade em `scrapers.py`:
```python
# Linha ~1450 (método buscar_todas_promocoes)
if similaridade >= 0.90:  # Mais restritivo (antes era 0.85)
```

---

## ✅ Checklist de Testes

- [ ] Executar `python testar_novas_fontes.py`
- [ ] Verificar se 4 novas fontes funcionam
- [ ] Testar modo debug (`DEBUG_FILTROS=true`)
- [ ] Executar busca completa (`python main.py --once`)
- [ ] Verificar métricas por fonte
- [ ] Verificar produtos descartados
- [ ] Testar deduplicação (executar 2x)
- [ ] Ajustar `MIN_QUALITY_SCORE` se necessário

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique logs detalhados
2. Ative modo debug
3. Execute script de teste
4. Verifique arquivo `.env`

---

**Boa sorte com os testes! 🚀**
