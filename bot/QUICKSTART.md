# 🚀 Guia Rápido - Robô de Promoções

## ⚡ Setup em 5 Minutos

### 1️⃣ Criar Bot no Telegram

1. Abra o Telegram e procure: `@BotFather`
2. Envie: `/newbot`
3. Escolha um nome: `Promoções Tech Bot`
4. Escolha um username: `promocoes_tech_bot`
5. **Copie o token** que aparece (ex: `6789012345:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`)

### 2️⃣ Adicionar Bot ao Canal/Grupo

1. Crie um canal ou grupo no Telegram
2. Adicione o bot como administrador
3. Envie uma mensagem qualquer no canal

### 3️⃣ Pegar o Chat ID

Acesse no navegador (substitua SEU_TOKEN):
```
https://api.telegram.org/botSEU_TOKEN/getUpdates
```

Procure por algo como:
```json
"chat": {
  "id": -1001234567890,
  "title": "Meu Canal"
}
```

Copie o número do `id` (com o sinal de menos).

### 4️⃣ Configurar o Robô

```bash
cd affiliate-hub/bot

# Copiar exemplo
cp .env.example .env

# Editar configurações
nano .env
```

Cole suas configurações:
```env
AFFILIATE_HUB_URL=http://localhost:3000
AFFILIATE_HUB_API_KEY=minha-chave-super-secreta-123

TELEGRAM_BOT_TOKEN=6789012345:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
TELEGRAM_CHAT_ID=-1001234567890

SEARCH_INTERVAL_MINUTES=30
MIN_DISCOUNT_PERCENT=20
```

### 5️⃣ Instalar e Testar

```bash
# Instalar dependências
pip install -r requirements.txt

# Testar (executa uma vez)
python main.py --once
```

Se funcionou, você verá mensagens no Telegram! 🎉

### 6️⃣ Rodar Continuamente

```bash
# Modo agendado (recomendado)
python main.py
```

## 🎯 Próximos Passos

### Personalizar Scrapers

Edite `scrapers.py` para adicionar seus próprios scrapers:

```python
def buscar_promocoes_amazon(self, termo: str) -> List[Dict]:
    produtos = []
    
    # Sua lógica aqui
    # 1. Fazer requisição
    # 2. Parsear HTML
    # 3. Extrair dados
    # 4. Retornar lista de produtos
    
    return produtos
```

### Usar Scraper Real (Pelando)

```bash
# Testar scraper do Pelando
python exemplo_scraper_real.py
```

Para usar no robô principal, edite `scrapers.py`:

```python
from exemplo_scraper_real import PelandoScraper

class PromotionScraper:
    def __init__(self):
        self.pelando = PelandoScraper()
    
    def buscar_todas_promocoes(self):
        # Buscar do Pelando
        produtos = self.pelando.buscar_promocoes_quentes(limite=20)
        
        return {
            'produtos': produtos,
            'cupons': []
        }
```

### Rodar na VPS

```bash
# Instalar screen
sudo apt install screen

# Criar sessão
screen -S promo-bot

# Iniciar bot
python3 main.py

# Desanexar: Ctrl+A depois D
# Reanexar: screen -r promo-bot
```

## 📱 Exemplo de Mensagem no Telegram

Quando o robô encontrar uma promoção, enviará:

```
🔥 NOVA PROMOÇÃO!

📦 Mouse Gamer Logitech G502 HERO
🏷️ Gaming
💰 R$ 189.90

🛒 Amazon
🛒 Mercado Livre

🌐 Ver mais: https://seu-site.com
```

## 🔧 Troubleshooting

### "Module not found"
```bash
pip install -r requirements.txt
```

### "API key inválida"
- Verifique se a chave no `.env` é a mesma do Affiliate Hub
- Certifique-se que o Affiliate Hub está rodando

### "Bot não envia mensagens"
- Verifique se o bot foi adicionado ao canal/grupo
- Certifique-se que o Chat ID está correto (com o `-` na frente)
- Teste o token: `https://api.telegram.org/botSEU_TOKEN/getMe`

### "Nenhuma promoção encontrada"
- Os scrapers de exemplo são simulações
- Use o `exemplo_scraper_real.py` ou implemente seus próprios scrapers

## 💡 Dicas

1. **Comece simples**: Use o scraper do Pelando primeiro
2. **Teste localmente**: Use `--once` para testar
3. **Monitore logs**: Veja o que está acontecendo
4. **Ajuste intervalo**: 30 minutos é um bom começo
5. **Evite rate limit**: Adicione delays entre requisições

## 🎓 Recursos

- [Documentação Telegram Bot API](https://core.telegram.org/bots/api)
- [BeautifulSoup Docs](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- [Requests Docs](https://requests.readthedocs.io/)

## ✅ Checklist

- [ ] Bot criado no Telegram
- [ ] Bot adicionado ao canal/grupo
- [ ] Chat ID obtido
- [ ] Arquivo `.env` configurado
- [ ] Dependências instaladas
- [ ] Teste executado com sucesso
- [ ] Mensagem recebida no Telegram
- [ ] Robô rodando continuamente

Pronto! Seu robô está funcionando! 🚀
