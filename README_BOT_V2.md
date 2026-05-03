# 🤖 Bot de Promoções v2.0 - Affiliate Hub

> Bot automatizado que busca promoções em 7 fontes, filtra por qualidade e envia para aprovação no Telegram.

[![Versão](https://img.shields.io/badge/versão-2.0.0-blue.svg)](CHANGELOG.md)
[![Python](https://img.shields.io/badge/python-3.8+-green.svg)](https://www.python.org/)
[![Status](https://img.shields.io/badge/status-produção-success.svg)](README_BOT_V2.md)

---

## 🚀 Novidades v2.0

### ⚡ Performance
- **8x mais rápido**: Busca em 10-15s (antes: 90-120s)
- **4x mais produtos**: ~480 produtos/hora (antes: ~120)
- **Busca paralela**: Todas as fontes ao mesmo tempo

### 🎯 Qualidade
- **Sistema de Score**: Nota de 0-100 para cada promoção
- **Filtros automáticos**: Remove promoções ruins
- **Alertas urgentes**: Destaque para super ofertas (score ≥70)

### 🛒 Mais Fontes
- ✅ Amazon Brasil (NOVO)
- ✅ Mercado Livre (NOVO)
- ✅ Promobit
- ✅ Promobyte
- ✅ Gatry
- ✅ Zoom
- ✅ Buscapé

### 💬 Mensagens Melhores
- Desconto percentual calculado
- Score de qualidade visível
- Cupons destacados
- Emojis baseados na qualidade

---

## 📊 Comparação

| Métrica | v1.0 | v2.0 | Melhoria |
|---------|------|------|----------|
| Velocidade | 120s | 15s | **8x** ⚡ |
| Fontes | 5 | 7 | **+40%** |
| Produtos/hora | 120 | 480 | **4x** 📦 |
| Qualidade | Variável | Filtrado | **100%** 🎯 |

[Ver comparação detalhada →](ANTES_E_DEPOIS.md)

---

## 🚀 Início Rápido

### 1. Instalar
```bash
cd bot
pip install -r requirements.txt
```

### 2. Configurar
```bash
# Copiar .env.example para .env
cp ../.env.example ../.env

# Editar .env e adicionar:
nano ../.env
```

Adicione estas linhas:
```env
SEARCH_INTERVAL_MINUTES=15
MIN_QUALITY_SCORE=30
```

### 3. Testar
```bash
python testar_melhorias.py
```

### 4. Executar
```bash
# Modo teste (uma vez)
python main.py --once

# Modo produção (loop)
python main.py
```

---

## 📖 Documentação

### Guias Rápidos
- 📘 [Guia Rápido (5 min)](GUIA_RAPIDO_V2.md) - Começar agora
- 📊 [Antes e Depois](ANTES_E_DEPOIS.md) - Comparação visual
- 📝 [Resumo das Melhorias](RESUMO_MELHORIAS.md) - O que mudou

### Documentação Técnica
- 📚 [Melhorias Implementadas](bot/MELHORIAS_IMPLEMENTADAS.md) - Detalhes técnicos
- 🎯 [Estratégia](ESTRATEGIA_MELHORAR_BOT.md) - Próximos passos
- 📋 [Changelog](CHANGELOG.md) - Histórico de versões

### Scripts
- 🧪 [Testar Melhorias](bot/testar_melhorias.py) - Testes automatizados
- 🚀 [Deploy Windows](atualizar-bot-melhorado.ps1) - Script PowerShell
- 🚀 [Deploy Linux](atualizar-bot-melhorado.sh) - Script Bash

---

## ⚙️ Configuração

### Variáveis Importantes

#### Score Mínimo (MIN_QUALITY_SCORE)
```bash
20  # Muito permissivo (aceita quase tudo)
30  # Padrão (bom equilíbrio) ✅ RECOMENDADO
50  # Rigoroso (só promoções boas)
70  # Muito rigoroso (só super ofertas)
```

#### Intervalo de Busca (SEARCH_INTERVAL_MINUTES)
```bash
10  # Muito frequente (mais carga)
15  # Padrão (bom equilíbrio) ✅ RECOMENDADO
30  # Menos frequente (menos carga)
```

---

## 🎯 Sistema de Score

Cada promoção recebe uma nota de 0-100:

### Componentes do Score:
- **Desconto real** (0-35 pts): Quanto maior, melhor
- **Loja confiável** (0-20 pts): Amazon, ML, Magalu = mais pontos
- **Cupom adicional** (0-15 pts): Promoções com cupom
- **Categoria popular** (0-10 pts): Eletrônicos, games
- **Imagem real** (0-10 pts): Foto real do produto
- **Preço razoável** (0-10 pts): Filtra preços suspeitos

### Classificação:
- **70-100**: 🔥🔥🔥 SUPER OFERTA (alerta urgente)
- **50-69**: 🔥🔥 OFERTA BOA
- **30-49**: 🔥 OFERTA MEDIANA
- **0-29**: ❌ Rejeitado automaticamente

---

## 💬 Exemplos de Mensagens

### Produto Normal (score 45):
```
🔥🔥 OFERTA BOA
⚠️ AGUARDANDO APROVAÇÃO

📦 Teclado Mecânico Gamer Redragon

🏷️ Informática e Games
🏪 🟠 Amazon
💰 R$ 149,90
💸 De: R$ 249,90 | 40% OFF

📊 Qualidade: ⭐⭐⭐ (45/100)

🔗 🛒 COMPRAR AGORA
```

### Produto Urgente (score 85):
```
🚨🔥 ALERTA DE SUPER OFERTA! 🔥🚨
⭐⭐⭐⭐⭐ SCORE: 85/100

📦 Notebook Gamer Acer Nitro 5

💰 R$ 2.999,90
💸 De: R$ 4.999,90 | 40% OFF

⚡ CORRE! Esta é uma das melhores ofertas!
```

---

## 🧪 Testes

### Testar tudo:
```bash
cd bot
python testar_melhorias.py
```

### Testar uma fonte:
```bash
python -c "from scrapers import PromotionScraper; s = PromotionScraper(); print(len(s.buscar_promocoes_amazon()))"
```

### Testar busca completa:
```bash
python main.py --once
```

---

## 🚀 Deploy

### Opção 1: Git
```bash
git pull
bash atualizar-bot-melhorado.sh
```

### Opção 2: Manual
```bash
# 1. Atualizar arquivos
# 2. Atualizar .env
# 3. Executar:
bash atualizar-bot-melhorado.sh
```

### Opção 3: Windows
```powershell
.\atualizar-bot-melhorado.ps1
```

---

## 📊 Monitoramento

### Estatísticas em Tempo Real:
```
📊 Resultados:
   🔍 Total encontrado: 120 produtos
   ✨ Únicos: 95 produtos
   🔥 Qualidade alta (score ≥30): 45 produtos
   🎫 Cupons: 12

   🚨 URGENTES (score ≥70): 8 produtos
```

### Métricas de Sucesso:
- ✅ Tempo de busca: 10-20s
- ✅ Produtos/hora: 200-500
- ✅ Score médio: 40-60
- ✅ Taxa de aprovação: 30-50%

---

## 🐛 Troubleshooting

### Nenhuma promoção passa
**Solução:** Reduzir score mínimo
```bash
MIN_QUALITY_SCORE=20
```

### Busca lenta
**Verificar:** Deve aparecer "PARALELO" nos logs

**Solução:**
```bash
pip install -r requirements.txt --upgrade
```

### Fonte não funciona
**Normal:** Outras fontes compensam

**Verificar logs:** Procure por "❌ Erro em [Fonte]"

---

## 📈 Roadmap

### v2.1 (Próxima)
- [ ] Cuponomia (cupons)
- [ ] Méliuz (cashback)
- [ ] IA para validação (Gemini)
- [ ] Histórico de preços

### v2.2 (Futuro)
- [ ] Alertas personalizados
- [ ] Dashboard web
- [ ] Comparação de preços
- [ ] Grupos do Telegram

### v3.0 (Visão)
- [ ] Previsão de promoções (IA)
- [ ] Análise de reviews
- [ ] API pública
- [ ] App mobile

[Ver roadmap completo →](ESTRATEGIA_MELHORAR_BOT.md)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-fonte`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova fonte'`)
4. Push para a branch (`git push origin feature/nova-fonte`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é parte do Affiliate Hub.

---

## 🆘 Suporte

### Documentação
- 📘 [Guia Rápido](GUIA_RAPIDO_V2.md)
- 📚 [Documentação Completa](bot/MELHORIAS_IMPLEMENTADAS.md)
- 📊 [Antes e Depois](ANTES_E_DEPOIS.md)

### Comandos Úteis
```bash
# Ver logs
tail -f bot.log

# Ver estado
cat bot_state.json

# Ver configurações
cat .env | grep -E "SCORE|INTERVAL"
```

---

## 🎉 Agradecimentos

Obrigado por usar o Bot de Promoções v2.0!

**Seu bot agora:**
- 🔥 Encontra **4x mais promoções** por hora
- ⚡ É **8x mais rápido**
- 🎯 **Filtra automaticamente** promoções ruins
- 💰 **Prioriza descontos altos**
- 🚨 **Alerta sobre super ofertas**

**Compete de igual para igual com os melhores grupos!** 🏆

---

**Versão:** 2.0.0  
**Data:** 2025-05-02  
**Status:** ✅ Produção  
**Autor:** Affiliate Hub Team
