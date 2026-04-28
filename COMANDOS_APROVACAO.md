# 🎯 Guia Rápido - Aprovação de Produtos

## 📋 Comandos Principais

### ✅ Aprovar Produto
```bash
/aprovar [ID] [LINK_AFILIADO]
```

**Exemplo:**
```bash
/aprovar clxyz123abc https://amzn.to/3abc123
```

### ❌ Rejeitar Produto
```bash
/rejeitar [ID]
```

**Exemplo:**
```bash
/rejeitar clxyz123abc
```

### 🎵 Adicionar Produto TikTok
```bash
/tiktok [LINK] [NOME] [PREÇO] [CATEGORIA]
```

**Exemplo:**
```bash
/tiktok https://www.tiktok.com/@loja/video/123 Bolsa_Feminina 39.90 moda
```

**Categorias disponíveis:**
- `smartphones` - Smartphones e TV
- `informatica` - Informática e Games
- `casa` - Casa e Eletrodomésticos
- `moda` - Moda e Acessórios
- `bebes` - Bebês e Crianças
- `saude` - Saúde e Beleza
- `esporte` - Esporte e Suplementos
- `supermercado` - Supermercado e Delivery
- `livros` - Livros, eBooks e eReaders
- `ferramentas` - Ferramentas e Jardim
- `automotivo` - Automotivo
- `pet` - Pet
- `viagem` - Viagem
- `diversos` - Diversos

### 📸 Aprovar com Foto Personalizada

1. Envie a foto
2. Na legenda, escreva:
```bash
/aprovar [ID] [LINK]
```

### 📸 TikTok com Foto

1. Envie a foto
2. Na legenda, escreva:
```bash
/tiktok [LINK] [NOME] [PREÇO] [CATEGORIA]
```

## 🔍 Verificar Produtos Pendentes

### No VPS
```bash
ssh root@167.99.238.107
cd /root/promoflash
python3 bot/listar_pendentes.py
```

### Ver Logs
```bash
pm2 logs promobot --lines 50
pm2 logs telegram-listener --lines 50
```

## 🚀 Fluxo Completo

### 1. Bot Encontra Produto
O bot envia mensagem no Telegram:
```
🔥 NOVO PRODUTO ENCONTRADO!
⚠️ AGUARDANDO APROVAÇÃO

📦 Teclado Mecânico Gamer
🏷️ Informática e Games
🏪 Plataforma: 🟠 Amazon
💰 R$ 149,90

🔗 Ver promoção original

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PARA APROVAR, envie:

/aprovar clxyz123 [SEU_LINK]

🚫 Para rejeitar:
/rejeitar clxyz123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 ID do Produto:
clxyz123
```

### 2. Você Gera Seu Link de Afiliado

- **Amazon**: https://associados.amazon.com.br
- **Mercado Livre**: https://afiliados.mercadolivre.com.br
- **Shopee**: https://affiliate.shopee.com.br
- **AliExpress**: https://portals.aliexpress.com

### 3. Você Aprova o Produto

```bash
/aprovar clxyz123 https://amzn.to/seu-link-aqui
```

### 4. Bot Publica no Grupo

O bot automaticamente:
- ✅ Atualiza o link do produto
- ✅ Muda status para `active`
- ✅ Publica no grupo de promoções
- ✅ Produto aparece no site

## 🎯 Dicas

### ✅ Boas Práticas

1. **Sempre use seus links de afiliado**
   - Não copie o link direto do Promobit
   - Gere seu próprio link de afiliado

2. **Verifique a plataforma**
   - Amazon → Link da Amazon
   - Shopee → Link da Shopee
   - etc.

3. **Use fotos de qualidade**
   - Envie foto personalizada se a original for ruim
   - Use `/aprovar` com foto

4. **Categorize corretamente**
   - Para TikTok, escolha a categoria certa
   - Isso ajuda os usuários a encontrar

### ❌ Evite

1. **Não use links diretos**
   - ❌ https://www.amazon.com.br/produto/123
   - ✅ https://amzn.to/seu-link

2. **Não aprove produtos ruins**
   - Verifique se o preço está bom
   - Verifique se o produto é relevante
   - Use `/rejeitar` se não for bom

3. **Não deixe produtos pendentes**
   - Aprove ou rejeite rapidamente
   - Produtos pendentes não aparecem no site

## 🔧 Troubleshooting

### Produto não apareceu no site após aprovação

1. Verifique se o comando foi executado com sucesso
2. Verifique os logs: `pm2 logs telegram-listener`
3. Tente aprovar novamente

### Bot não está enviando produtos

1. Verifique se o bot está rodando: `pm2 list`
2. Veja os logs: `pm2 logs promobot`
3. Reinicie: `pm2 restart promobot`

### Comando não funciona

1. Verifique se o listener está rodando: `pm2 list`
2. Veja os logs: `pm2 logs telegram-listener`
3. Reinicie: `pm2 restart telegram-listener`

## 📞 Comandos de Manutenção

### Ver Status
```bash
pm2 list
```

### Ver Logs
```bash
pm2 logs promobot --lines 50
pm2 logs telegram-listener --lines 50
```

### Reiniciar
```bash
pm2 restart promobot
pm2 restart telegram-listener
```

### Parar
```bash
pm2 stop promobot
pm2 stop telegram-listener
```

### Iniciar
```bash
pm2 start promobot
pm2 start telegram-listener
```

## 🎉 Pronto!

Agora você sabe como:
- ✅ Aprovar produtos
- ✅ Rejeitar produtos
- ✅ Adicionar produtos do TikTok
- ✅ Usar fotos personalizadas
- ✅ Verificar produtos pendentes
- ✅ Resolver problemas comuns
