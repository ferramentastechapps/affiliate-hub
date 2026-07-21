# 🔍 Produtos Não Estão Chegando - Diagnóstico e Solução

## ✅ O Sistema Está Funcionando Corretamente!

Analisando o Telegram, vejo que:
- ✅ **Produtos estão sendo encontrados** (8, 7, 6 produtos em diferentes buscas)
- ✅ **Cupons estão em 0** (normal, pois cupons são mais raros)
- ✅ **Produtos estão sendo enviados para o Telegram**

## 🎯 O Problema Real

Os produtos **ESTÃO CHEGANDO**, mas com status **"AGUARDANDO APROVAÇÃO"**.

Isso significa que:
1. ✅ Bot encontrou os produtos
2. ✅ Adicionou no banco de dados com status `pending`
3. ✅ Enviou para o Telegram
4. ⏳ **Aguardando você aprovar com `/aprovar [ID] [LINK]`**
5. ❌ **Produtos pendentes NÃO aparecem no site**

## 📋 Fluxo de Aprovação

```
┌─────────────────┐
│ Bot encontra    │
│ produto no      │
│ Promobit        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Adiciona no     │
│ banco com       │
│ status: pending │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Envia para      │
│ Telegram com    │
│ ID do produto   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ VOCÊ APROVA:    │
│ /aprovar ID LINK│ ◄── VOCÊ ESTÁ AQUI
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Produto fica    │
│ ativo e aparece │
│ no site         │
└─────────────────┘
```

## 🚀 Como Aprovar Produtos

### 1. Encontre o ID do Produto no Telegram

Procure mensagens como:
```
🔥 NOVO PRODUTO ENCONTRADO!
⚠️ AGUARDANDO APROVAÇÃO

📦 Nome do Produto
...
🆔 ID do Produto:
clxyz123abc
```

### 2. Copie o ID

Exemplo: `clxyz123abc`

### 3. Gere Seu Link de Afiliado

- **Amazon**: Use o Amazon Associates
- **Mercado Livre**: Use o Mercado Livre Afiliados
- **Shopee**: Use o Shopee Affiliate
- etc.

### 4. Envie o Comando de Aprovação

```
/aprovar clxyz123abc https://amzn.to/seu-link-aqui
```

### 5. Produto Será Publicado

O bot irá:
- ✅ Atualizar o link do produto
- ✅ Mudar status para `active`
- ✅ Publicar no grupo de promoções
- ✅ Produto aparecerá no site

## 🎵 Adicionar Produtos do TikTok

Para produtos do TikTok Shop (que não são encontrados automaticamente):

```
/tiktok https://www.tiktok.com/@loja/video/123 Bolsa_Feminina 39.90 moda
```

Ou envie uma foto com a legenda:
```
/tiktok https://www.tiktok.com/@loja/video/123 Bolsa_Feminina 39.90 moda
```

## 📊 Verificar Status dos Produtos

### No Telegram

Veja as mensagens do bot - produtos com "AGUARDANDO APROVAÇÃO" precisam ser aprovados.

### No VPS

```bash
ssh root@167.99.238.107
cd /root/promoflash
python3 bot/diagnostico_completo.py
```

Isso mostrará:
- Total de produtos
- Produtos ativos
- Produtos pendentes
- Produtos rejeitados

## ❌ Rejeitar Produtos

Se não quiser um produto:

```
/rejeitar clxyz123abc
```

## 🔧 Comandos Úteis

### Ver Ajuda
```
/help
```

### Aprovar com Foto Personalizada
Envie a foto com a legenda:
```
/aprovar clxyz123abc https://amzn.to/seu-link
```

## 🎯 Resumo da Solução

**O problema não é que os produtos não estão chegando.**

**O problema é que você precisa aprovar os produtos pendentes!**

1. ✅ Verifique o Telegram
2. ✅ Encontre mensagens com "AGUARDANDO APROVAÇÃO"
3. ✅ Copie o ID do produto
4. ✅ Use `/aprovar [ID] [SEU_LINK]`
5. ✅ Produto aparecerá no site

## 🚨 Se Realmente Não Estiver Chegando Nada

Se não estiver recebendo NENHUMA mensagem no Telegram:

### 1. Verificar se o Bot Está Rodando

```bash
ssh root@167.99.238.107
pm2 list
```

Deve mostrar:
- `promobot` - running
- `telegram-listener` - running

### 2. Ver Logs do Bot

```bash
pm2 logs promobot --lines 50
```

### 3. Reiniciar o Bot

```bash
pm2 restart promobot
pm2 restart telegram-listener
```

### 4. Testar Manualmente

```bash
cd /root/promoflash
python3 bot/main.py --once
```

## 📞 Suporte

Se ainda tiver problemas:

1. Verifique os logs: `pm2 logs`
2. Execute o diagnóstico: `python3 bot/diagnostico_completo.py`
3. Verifique se o Telegram está recebendo mensagens
4. Verifique se você está usando o comando `/aprovar` corretamente
