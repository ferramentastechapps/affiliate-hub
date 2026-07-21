# 🚨 DEPLOY URGENTE - Bot Parou às 10:25

## Problema Crítico Identificado

**Conflitos de merge** no `bot/scrapers.py` quebraram TODOS os bots desde às 10:25.

## Correções Aplicadas

### ✅ 1. bot/scrapers.py
- **Problema**: Marcadores `<<<<<<<` na sintaxe Python
- **Solução**: Restaurada versão estável (commit 86ed893)
- **Status**: ✅ Testado e funcionando

### ✅ 2. bot/telegram_listener.py  
- **Melhoria**: Logs detalhados + tratamento de erros
- **Benefício**: Debugar produtos de grupos facilmente
- **Status**: Pronto para deploy

### ✅ 3. src/components/DailyDeals.tsx
- **Correção**: Cupom aparece junto com frete grátis
- **Status**: Já no GitHub (commit bff7d92)

## 🚀 EXECUTAR AGORA

```powershell
.\ship.ps1
```

Quando solicitado, usar mensagem:
```
fix: resolver conflitos merge scrapers.py + melhorar telegram_listener
```

## O Que Vai Acontecer

1. ✅ Git add + commit + push
2. ✅ SSH na VPS
3. ✅ Git pull (pega scrapers.py correto)
4. ✅ npm install + build
5. ✅ PM2 restart (bots voltam a funcionar)
6. ✅ Cupons aparecem no site

## Tempo Estimado

- **Local → GitHub**: 10 segundos
- **Deploy VPS**: 3-5 minutos
- **Total**: ~5 minutos

## Verificação Pós-Deploy

```bash
ssh root@212.85.10.239 "pm2 logs affiliate-hub-scraper --lines 10 --nostream"
```

Deve mostrar:
```
📡 Buscando em múltiplas fontes...
🔥 Buscando promoções...
✅ Total: X produtos
```

---

**EXECUTAR AGORA!**
