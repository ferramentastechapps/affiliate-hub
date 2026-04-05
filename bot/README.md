# 🤖 Robô de Promoções Automático

Robô que busca promoções e cupons automaticamente, adiciona no site e envia notificações para o Telegram.

## 🎯 Funcionalidades

- ✅ Busca promoções em múltiplas plataformas (Amazon, Mercado Livre, Shopee)
- ✅ Adiciona produtos automaticamente no Affiliate Hub
- ✅ Adiciona cupons de desconto automaticamente
- ✅ Envia notificações para canal/grupo do Telegram
- ✅ Evita duplicatas
- ✅ Execução agendada (a cada X minutos)
- ✅ Filtro por desconto mínimo

## 📋 Pré-requisitos

- Python 3.8+
- Conta no Telegram e Bot criado
- Affiliate Hub rodando (local ou em produção)

## 🚀 Instalação

### 1. Instalar dependências

```bash
cd bot
pip install -r requirements.txt
```

### 2. Criar Bot no Telegram

1. Abra o Telegram e procure por `@BotFather`
2. Envie `/newbot` e siga as instruções
3. Copie o token do bot (ex: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Adicione o bot ao seu canal/grupo
5. Para pegar o Chat ID:
   - Envie uma mensagem no canal/grupo
   - Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
   - Procure por `"chat":{"id":-1001234567890}`

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Edite o arquivo `.env`:

```env
# URL do seu Affiliate Hub
AFFILIATE_HUB_URL=https://seu-dominio.com
AFFILIATE_HUB_API_KEY=sua-chave-super-secreta-123

# Token do bot do Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890

# Intervalo de busca (em minutos)
SEARCH_INTERVAL_MINUTES=30

# Desconto mínimo para considerar (%)
MIN_DISCOUNT_PERCENT=20
```

## 🎮 Como Usar

### Modo Agendado (Recomendado)

Executa automaticamente a cada X minutos:

```bash
python main.py
```

### Modo Teste (Uma Execução)

Para testar se está funcionando:

```bash
python main.py --once
```

### Modo Contínuo

Executa continuamente com intervalo:

```bash
python main.py --continuous
```

## 🔧 Personalização

### Adicionar Novos Sites

Edite `scrapers.py` e adicione novos métodos:

```python
def buscar_promocoes_novo_site(self, termo: str) -> List[Dict]:
    produtos = []
    
    try:
        # Sua lógica de scraping aqui
        url = f'https://site.com/search?q={termo}'
        response = requests.get(url, headers=self.headers)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extrair dados
        for item in soup.find_all('div', class_='produto'):
            produto = {
                'name': item.find('h2').text,
                'category': self._detectar_categoria(item.find('h2').text),
                'imageUrl': item.find('img')['src'],
                'price': self._extrair_preco(item.find('span', class_='preco').text),
                'links': {
                    'novo_site': item.find('a')['href']
                }
            }
            produtos.append(produto)
    
    except Exception as e:
        print(f'Erro: {e}')
    
    return produtos
```

### Adicionar Novas Categorias

Edite `config.py`:

```python
CATEGORIES = {
    'mouse': 'Gaming',
    'teclado': 'Gaming',
    'notebook': 'Setup',
    'smartphone': 'Eletrônicos',
    # Adicione mais aqui
}
```

### Personalizar Mensagens do Telegram

Edite `telegram_bot.py` nos métodos `_formatar_mensagem_produto` e `_formatar_mensagem_cupom`.

## 📁 Estrutura dos Arquivos

```
bot/
├── main.py                  # Script principal
├── config.py                # Configurações
├── affiliate_hub_api.py     # Cliente da API
├── telegram_bot.py          # Integração com Telegram
├── scrapers.py              # Lógica de scraping
├── requirements.txt         # Dependências
├── .env.example            # Exemplo de configuração
└── README.md               # Esta documentação
```

## 🐧 Rodar na VPS (Linux)

### 1. Instalar Python e dependências

```bash
sudo apt update
sudo apt install python3 python3-pip
```

### 2. Clonar e configurar

```bash
git clone https://github.com/ferramentastechapps/affiliate-hub.git
cd affiliate-hub/bot
pip3 install -r requirements.txt
cp .env.example .env
nano .env  # Configure suas variáveis
```

### 3. Testar

```bash
python3 main.py --once
```

### 4. Rodar em background com screen

```bash
# Instalar screen
sudo apt install screen

# Criar sessão
screen -S promo-bot

# Iniciar bot
python3 main.py

# Desanexar: Ctrl+A, depois D
# Reanexar: screen -r promo-bot
```

### 5. Rodar como serviço (systemd)

Criar arquivo `/etc/systemd/system/promo-bot.service`:

```ini
[Unit]
Description=Robô de Promoções
After=network.target

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/caminho/para/affiliate-hub/bot
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Ativar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable promo-bot
sudo systemctl start promo-bot
sudo systemctl status promo-bot
```

Ver logs:

```bash
sudo journalctl -u promo-bot -f
```

## 📊 Exemplo de Saída

```
============================================================
🤖 Iniciando busca de promoções - 14:30:00
============================================================

🔍 Buscando "mouse" na Amazon...
🔍 Buscando "teclado" no Mercado Livre...
🔍 Buscando cupons...

📊 Encontrados: 15 produtos e 3 cupons
✨ Novos: 5 produtos e 2 cupons

📦 Adicionando 5 produtos no site...
✅ 5 produtos adicionados no site

📱 Enviando produtos para Telegram...
✅ Produto enviado para Telegram: Mouse Gamer RGB
✅ Produto enviado para Telegram: Teclado Mecânico

🎫 Adicionando 2 cupons no site...
✅ 2 cupons adicionados no site

📱 Enviando cupons para Telegram...
✅ Cupom enviado para Telegram: TECH10

✅ Busca concluída!

⏳ Aguardando 30 minutos...
```

## 🔒 Segurança

- Nunca commite o arquivo `.env` com suas credenciais
- Use HTTPS em produção
- Mantenha suas API keys em segredo
- Configure rate limiting se necessário

## 🐛 Troubleshooting

### Bot não envia mensagens no Telegram

- Verifique se o token está correto
- Certifique-se que o bot foi adicionado ao canal/grupo
- Verifique se o Chat ID está correto (deve começar com `-` para grupos)

### Erro ao adicionar produtos

- Verifique se a API key está correta
- Certifique-se que o Affiliate Hub está rodando
- Verifique a URL no `.env`

### Scraping não funciona

- Alguns sites bloqueiam bots, use proxies se necessário
- Atualize os seletores CSS se o site mudou
- Adicione delays entre requisições

## 📝 TODO

- [ ] Adicionar suporte a proxies
- [ ] Implementar cache de produtos
- [ ] Adicionar mais sites de promoções
- [ ] Dashboard de estatísticas
- [ ] Notificações por email
- [ ] Integração com Discord

## 🤝 Contribuindo

Sinta-se à vontade para melhorar o robô e adicionar novos scrapers!

## 📄 Licença

MIT
