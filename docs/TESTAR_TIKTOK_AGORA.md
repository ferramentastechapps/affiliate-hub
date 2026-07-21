# 🎵 Testar Comando /tiktok AGORA

## 1️⃣ Ver logs do bot em tempo real

```bash
pm2 logs affiliate-bot --lines 50
```

(Deixe esse terminal aberto para ver os logs)

## 2️⃣ Abrir outro terminal e testar

No Telegram, envie uma **FOTO** com a legenda:

```
/tiktok https://www.tiktok.com/@loja/video/123 Controle_PS4 89.90 informatica
```

## 3️⃣ O que você deve ver nos logs:

✅ **Se funcionar:**
```
📸 Foto TikTok capturada: https://...
⏳ Adicionando produto do TikTok...
✅ Produto criado: { id: 'clxyz...', name: 'Controle PS4', ... }
📢 Promoção publicada no grupo: Controle PS4
```

❌ **Se der erro:**
```
❌ Erro ao adicionar produto direto: ...
```

## 4️⃣ Verificar se apareceu no site

Abra: https://seu-site.com

O produto deve aparecer imediatamente (status: approved)

## 5️⃣ Se não funcionar, verificar variáveis de ambiente

```bash
cd /root/affiliate-hub/bot
cat .env | grep -E "AFFILIATE_HUB_URL|AFFILIATE_HUB_API_KEY"
```

Deve mostrar:
```
AFFILIATE_HUB_URL=https://seu-site.com
AFFILIATE_HUB_API_KEY=sua-chave-secreta
```

## 6️⃣ Parar os logs

Aperte `Ctrl + C` no terminal dos logs

---

## 📋 Categorias disponíveis (atalhos):

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

---

## 🔧 Comandos úteis:

```bash
# Ver status do bot
pm2 list

# Reiniciar bot
pm2 restart affiliate-bot

# Ver logs (últimas 100 linhas)
pm2 logs affiliate-bot --lines 100

# Parar bot
pm2 stop affiliate-bot

# Iniciar bot novamente
pm2 start affiliate-bot
```
