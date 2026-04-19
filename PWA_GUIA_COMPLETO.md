# 📱 Guia Completo do PWA - 123 Testando

## ✅ O que foi implementado

### 1. Service Worker (next-pwa)
- ✅ Cache automático de imagens de produtos
- ✅ Cache de APIs (produtos e cupons)
- ✅ Página offline customizada
- ✅ Atualização automática em background
- ✅ Configurado para produção (desabilitado em dev)

### 2. Manifest.json
- ✅ Ícones em todos os tamanhos necessários
- ✅ Configuração standalone (abre como app nativo)
- ✅ Tema e cores personalizadas
- ✅ Ícone maskable para Android

### 3. Banner de Instalação
- ✅ Aparece automaticamente se não instalado
- ✅ Detecta iOS e mostra instruções específicas
- ✅ Botão "Instalar" que dispara prompt nativo
- ✅ Botão X para fechar (salva no localStorage)
- ✅ Animação suave de entrada
- ✅ Design responsivo e bonito

### 4. Notificações Push
- ✅ Botão para ativar/desativar notificações
- ✅ Salva subscriptions no banco de dados
- ✅ API para enviar notificações
- ✅ Integração automática com aprovação de produtos
- ✅ Remove subscriptions expiradas automaticamente

### 5. Meta Tags PWA
- ✅ Theme color
- ✅ Apple touch icon
- ✅ Viewport configurado
- ✅ Open Graph e Twitter Cards

---

## 🚀 Como fazer deploy

### 1. Atualizar o banco de dados
```bash
npx prisma db push
```

### 2. Adicionar variáveis de ambiente no .env
```bash
# Copie as chaves VAPID do .env.example
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BIOpgm4eWwsHEcmJVFO0-TnlypaVUpqxn-rKo4rpZd70fhABDpa-kvo0up_1aCIkwXlRaHm1SYgaxwT89nVkyCY"
VAPID_PRIVATE_KEY="n5qO5WeoJxRoDJmXl9U3mXymuR9w5coio80mSS4ZASs"
VAPID_SUBJECT="mailto:seu-email@exemplo.com"
```

### 3. Build e deploy
```bash
npm run build
pm2 restart affiliate-hub
```

---

## 🧪 Como testar

### No Chrome Desktop (Windows/Mac/Linux)

1. **Abra o DevTools** (F12)

2. **Verifique o Manifest**
   - Vá em: `Application` → `Manifest`
   - Deve mostrar:
     - Nome: "123 Testando"
     - Ícones: vários tamanhos
     - Display: standalone
     - Theme color: #FF6B35

3. **Verifique o Service Worker**
   - Vá em: `Application` → `Service Workers`
   - Deve mostrar: `sw.js` ativo e rodando
   - Status: "activated and is running"

4. **Teste o Cache**
   - Vá em: `Application` → `Cache Storage`
   - Deve ter caches:
     - `product-images`
     - `api-products`
     - `api-coupons`

5. **Teste Offline**
   - Vá em: `Network` → marque `Offline`
   - Recarregue a página
   - Deve mostrar a página offline customizada

6. **Teste Instalação**
   - Clique no ícone de instalação na barra de endereço (➕)
   - Ou clique no banner de instalação
   - O app deve abrir em janela separada

7. **Teste Notificações**
   - Clique em "Ativar notificações de promoções"
   - Permita notificações no navegador
   - Aprove um produto no admin
   - Deve receber notificação push

8. **Lighthouse PWA Score**
   - Vá em: `Lighthouse` → marque `Progressive Web App`
   - Clique em `Analyze page load`
   - Score deve ser **100/100** ✅

---

### No Android (Chrome)

1. **Abra o site no Chrome**
   - Digite a URL do site

2. **Banner de instalação**
   - Deve aparecer automaticamente após 3 segundos
   - Clique em "Instalar agora"

3. **Ou instale pelo menu**
   - Menu (⋮) → "Instalar app"
   - Ou "Adicionar à tela inicial"

4. **Teste o app instalado**
   - Abra o app da tela inicial
   - Deve abrir em tela cheia (sem barra do navegador)
   - Deve funcionar offline

5. **Teste notificações**
   - Ative notificações no app
   - Aprove um produto no admin
   - Deve receber notificação no Android

---

### No iOS (Safari)

1. **Abra o site no Safari**
   - Digite a URL do site

2. **Banner de instalação**
   - Deve aparecer automaticamente
   - Clique em "Ver instruções"
   - Siga as instruções mostradas

3. **Instalação manual**
   - Toque no botão de compartilhar (□↑)
   - Role para baixo
   - Toque em "Adicionar à Tela Inicial"
   - Toque em "Adicionar"

4. **Teste o app instalado**
   - Abra o app da tela inicial
   - Deve abrir em tela cheia
   - Deve funcionar offline

**⚠️ NOTA:** iOS não suporta notificações push em PWAs (limitação da Apple)

---

## 📊 Lighthouse PWA Checklist

Para obter 100/100 no Lighthouse, verifique:

- ✅ Manifest.json válido
- ✅ Service Worker registrado
- ✅ HTTPS (obrigatório em produção)
- ✅ Ícones em todos os tamanhos
- ✅ Theme color configurado
- ✅ Viewport configurado
- ✅ Página funciona offline
- ✅ Carregamento rápido (< 3s)
- ✅ Responsivo (mobile-friendly)

---

## 🔧 Troubleshooting

### Service Worker não está registrando
```bash
# Limpe o cache do navegador
# Chrome: DevTools → Application → Clear storage → Clear site data
```

### Banner de instalação não aparece
```bash
# Verifique no console:
localStorage.getItem('installBannerDismissed')

# Se retornar 'true', limpe:
localStorage.removeItem('installBannerDismissed')
```

### Notificações não funcionam
```bash
# Verifique se as chaves VAPID estão no .env
# Verifique se o service worker está ativo
# Verifique permissões do navegador
```

### Cache não está funcionando
```bash
# Verifique se está em produção (não funciona em dev)
# Verifique o service worker no DevTools
# Force update: DevTools → Application → Service Workers → Update
```

---

## 📱 Recursos do PWA

### Funciona Offline
- Páginas visitadas ficam em cache
- Imagens de produtos em cache
- Página offline customizada

### Instalável
- Banner de instalação automático
- Ícone na tela inicial
- Abre em tela cheia

### Notificações Push
- Alertas de novas promoções
- Funciona mesmo com app fechado
- Gerenciamento de subscriptions

### Performance
- Cache inteligente
- Carregamento rápido
- Atualização em background

---

## 🎯 Próximos Passos

### Melhorias Futuras
- [ ] Sincronização em background
- [ ] Compartilhamento nativo
- [ ] Atalhos de app (shortcuts)
- [ ] Badge na notificação
- [ ] Categorias de notificação
- [ ] Notificações agendadas

### Analytics
- [ ] Rastrear instalações
- [ ] Rastrear uso offline
- [ ] Rastrear notificações abertas

---

## 📚 Documentação

- [Next PWA](https://github.com/shadowwalker/next-pwa)
- [Web Push](https://github.com/web-push-libs/web-push)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

## 🆘 Suporte

Se tiver problemas:
1. Verifique o console do navegador
2. Verifique o DevTools → Application
3. Verifique os logs do servidor
4. Limpe cache e tente novamente
