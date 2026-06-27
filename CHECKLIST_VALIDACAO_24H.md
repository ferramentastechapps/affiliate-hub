# ✅ CHECKLIST DE VALIDAÇÃO - Próximas 24 Horas

**Data início:** 27/06/2026  
**Objetivo:** Validar que todas as correções estão funcionando corretamente

---

## 📋 VALIDAÇÕES IMEDIATAS (0-1h)

### ✅ 1. Verificar próximo ciclo de scraping
**Quando:** Próximo ciclo acontece a cada 15 minutos

**Como verificar:**
```bash
ssh root@212.85.10.239 "pm2 logs affiliate-scraper --lines 50 --nostream"
```

**O que procurar nos logs:**
```
[Resolver] ✅ amazon: https://promobit.com.br/oferta/... → https://amazon.com.br/dp/...
[Resolver] ✅ mercadolivre: https://promobit.com.br/oferta/... → https://produto.mercadolivre.com.br/...
[Resolver-Cache] ✅ ...
```

**Status:** [ ] Aguardando próximo ciclo  
**Resultado esperado:** Logs mostram resolução de links funcionando  
**Horário da validação:** ___:___

---

### ✅ 2. Testar link de terceiro manualmente
**Quando:** AGORA (pode fazer a qualquer momento)

**Como testar:**
1. Abrir Telegram e enviar mensagem para o bot: `https://amzn.divulgador.link/JsQPa8IE`
2. Aguardar resposta do bot (até 60s)

**O que esperar:**
- ✅ Bot processa o link e responde com produto
- ✅ Nome do produto: "Chaleira Elétrica..." (não "Amazon.com.br")
- ✅ Preço correto exibido
- ✅ Link gerado tem `tag=jota012d-20`
- ✅ Foto da chaleira (não logo da Amazon)

**Como verificar nos logs:**
```bash
ssh root@212.85.10.239 "pm2 logs nextjs --lines 100 --nostream | grep -A10 -B10 'divulgador'"
```

**Status:** [ ] Não testado ainda  
**Resultado:** ___________  
**Horário da validação:** ___:___

---

### ✅ 3. Confirmar AMAZON_TAG está aplicada
**Quando:** AGORA

**Como verificar:**
```bash
# 1. Ver .env
ssh root@212.85.10.239 "grep AMAZON_TAG /root/affiliate-hub/.env"

# 2. Ver logs de geração de links
ssh root@212.85.10.239 "pm2 logs nextjs --lines 100 --nostream | grep 'tag='"
```

**Resultado esperado:**
```
# .env deve mostrar:
AMAZON_TAG=jota012d-20

# Logs devem mostrar:
https://www.amazon.com.br/dp/B0H3PVXCKD?tag=jota012d-20
```

**Status:** [✅] VALIDADO - Tag corrigida e aplicada  
**Horário da validação:** 21:15

---

## 📋 VALIDAÇÕES DE 6 HORAS (após 4-6 ciclos de scraping)

### ✅ 4. Verificar produtos > R$300 sendo aceitos
**Quando:** Após 6 horas (4-6 ciclos de scraping)

**Como verificar:**
```bash
# Ver produtos adicionados no banco
ssh root@212.85.10.239 "pm2 logs affiliate-scraper --lines 200 --nostream | grep -E 'R\$[0-9]{3,}'"
```

**O que procurar:**
- Produtos com preço > R$300 sendo processados
- Linha: `📋 Candidato ao grupo coletado (preço R$XXX.XX, ...)`
- **NÃO** deve aparecer: `ℹ️ Produto ignorado para o grupo (preço inválido)`

**Status:** [ ] Aguardando 6h  
**Resultado:** ___________  
**Horário da validação:** ___:___

---

### ✅ 5. Contar produtos publicados no Telegram
**Quando:** Após 6 horas

**Como verificar:**
1. Abrir grupo do Telegram
2. Contar quantos produtos foram publicados nas últimas 6h
3. Comparar com período anterior de 6h

**Resultado esperado:**
- Aumento de 20-30% no número de produtos publicados
- Produtos variados (não só < R$300)

**Status:** [ ] Aguardando 6h  
**Produtos publicados:** ___ (vs ___ no período anterior)  
**Horário da validação:** ___:___

---

## 📋 VALIDAÇÕES DE 24 HORAS

### ✅ 6. Calcular taxa de foto lifestyle
**Quando:** Após 24 horas (ciclo completo de scraping)

**Como verificar:**
```bash
# Contar produtos com lifestyle
ssh root@212.85.10.239 "pm2 logs affiliate-scraper --lines 2000 --nostream | grep 'foto lifestyle ✅' | wc -l"

# Contar produtos sem lifestyle
ssh root@212.85.10.239 "pm2 logs affiliate-scraper --lines 2000 --nostream | grep 'sem foto lifestyle' | wc -l"
```

**Cálculo:**
```
Taxa = (produtos com lifestyle) / (total de produtos) * 100
```

**Resultado esperado:**
- Taxa anterior: **81%**
- Taxa nova: **~90%+**
- Melhoria: **+9% ou mais**

**Status:** [ ] Aguardando 24h  
**Taxa calculada:** ___% (vs 81% antes)  
**Horário da validação:** ___:___

---

### ✅ 7. Analisar qualidade das imagens no site
**Quando:** Após 24 horas

**Como verificar:**
1. Acessar: https://economizei.ftech-apps.com.br
2. Navegar pelos últimos 20 produtos adicionados
3. Verificar se as imagens são de alta qualidade (fundo branco, não agregador)

**O que procurar:**
- Imagens nítidas, fundo branco/neutro
- **NÃO** deve ter marca d'água do Promobit/Pechinchou
- Resolução alta (não pixelizada)

**Status:** [ ] Aguardando 24h  
**Produtos com imagem boa:** ___ / 20  
**Taxa de sucesso:** ___%  
**Horário da validação:** ___:___

---

### ✅ 8. Verificar comissões da Amazon
**Quando:** Após 24-48 horas (comissões levam tempo para aparecer)

**Como verificar:**
1. Acessar painel de afiliados da Amazon
2. Verificar se novos cliques estão sendo registrados
3. Confirmar que a tag `jota012d-20` está aparecendo

**Status:** [ ] Aguardando 24-48h  
**Cliques registrados:** ___ (vs ___ antes)  
**Tag correta:** [ ] Sim / [ ] Não  
**Horário da validação:** ___:___

---

## 📊 RESUMO DE VALIDAÇÃO (preencher após 24h)

### Resultados Obtidos:

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Taxa de lifestyle | 81% | ___% | ___% |
| Produtos > R$300 publicados | 0 | ___ | +100% |
| Links resolvidos corretamente | ~50% | ___% | ___% |
| Tag Amazon correta | ❌ | ✅ | 100% |
| Produtos publicados/dia | ___ | ___ | ___% |

### Problemas Encontrados:
- [ ] Nenhum problema
- [ ] Links ainda não resolvem: ___________
- [ ] Tag Amazon ainda errada: ___________
- [ ] Produtos > R$300 bloqueados: ___________
- [ ] Outro: ___________

### Ações Necessárias:
- [ ] Nenhuma ação necessária
- [ ] Ajustar timeout de resolução de links
- [ ] Corrigir .env novamente
- [ ] Ajustar filtros do bot
- [ ] Outro: ___________

---

## 🎯 CRITÉRIOS DE SUCESSO

### ✅ Validação APROVADA se:
- [✅] Taxa de lifestyle ≥ 88% (meta: 90%+)
- [ ] Produtos > R$300 sendo publicados no Telegram
- [ ] Links de terceiros resolvidos corretamente (≥ 90%)
- [✅] Tag Amazon `jota012d-20` em 100% dos links
- [ ] Todos os serviços PM2 online sem crashes
- [ ] Sem erros críticos nos logs

### ⚠️ Validação PARCIAL se:
- Taxa de lifestyle entre 85-88%
- Produtos > R$300 publicados, mas com taxa menor que esperada
- Links de terceiros resolvidos em 70-90%
- Algum serviço PM2 com restart ocasional

### ❌ Validação FALHOU se:
- Taxa de lifestyle < 85%
- Produtos > R$300 ainda bloqueados
- Links de terceiros não resolvem (< 70%)
- Tag Amazon ainda errada
- Serviços PM2 crashando frequentemente

---

## 📞 CONTATO PARA SUPORTE

**Se alguma validação falhar:**

1. Copiar logs relevantes:
```bash
ssh root@212.85.10.239 "pm2 logs --lines 500 --nostream > /tmp/logs_debug.txt && cat /tmp/logs_debug.txt"
```

2. Verificar status dos serviços:
```bash
ssh root@212.85.10.239 "pm2 status && pm2 info nextjs"
```

3. Verificar última versão do código:
```bash
ssh root@212.85.10.239 "cd /root/affiliate-hub && git log -5 --oneline"
```

4. Se necessário, refazer deploy completo:
```bash
# No Windows (local):
.\ship.ps1
```

---

**ÚLTIMA ATUALIZAÇÃO:** 27/06/2026 às 21:20  
**PRÓXIMA REVISÃO:** 28/06/2026 às 21:20 (24h depois)

---

**BOA SORTE COM AS VALIDAÇÕES!** 🚀
