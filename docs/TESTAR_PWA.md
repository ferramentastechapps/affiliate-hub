# 🧪 Teste Rápido do PWA

## 1️⃣ Preparar o ambiente

```bash
# 1. Atualizar banco de dados
npx prisma db push

# 2. Verificar se as variáveis estão no .env
cat .env | grep VAPID

# Se não estiver, adicione:
# NEXT_PUBLIC_VAPID_PUBLIC_KEY="BIOpgm4eWwsHEcmJVFO0-TnlypaVUpqxn-rKo4rpZd70fhABDpa-kvo0up_1aCIkwXlRaHm1SYgaxwT89nVkyCY"
# VAPID_PRIVATE_KEY="n5qO5WeoJxRoDJmXl9U3mXymuR9w5coio80mSS4ZASs"
# VAPID_SUBJECT="mailto:seu-email@exemplo.com"

# 3. Build
npm run build

# 4. Restart
pm2 restart affiliate-hub
```

---

## 2️⃣ Testar no Chrome Desktop

### Abra o DevTools (F12)

#### Teste 1: Manifest
```
1. Application → Manifest
2. Deve mostrar:
   ✅ Nome: "123 Testando"
   ✅ Ícones: vários tamanhos
   ✅ Display: standalone
   ✅ Theme color: #FF6B35
```

#### Teste 2: Service Worker
```
1. Application → Service Workers
2. Deve mostrar:
   ✅ sw.js ativo
   ✅ Status: "activated and is running"
```

#### Teste 3: Cache
```
1. Application → Cache Storage
2. Deve ter:
   ✅ product-images
   ✅ api-products
   ✅ api-coupons
```

#### Teste 4: Offline
```
1. Network → marque "Offline"
2. Recarregue a página (F5)
3. Deve mostrar:
   ✅ Página offline customizada
   ✅ Ícone 📡
   ✅ Botão "Tentar novamente"
```

#### Teste 5: Instalação
```
1. Clique no banner de instalação
   OU
2. Clique no ícone ➕ na barra de endereço
3. Clique em "Instalar"
4. Deve:
   ✅ Abrir em janela separada
   ✅ Sem barra do navegador
   ✅ Ícone na barra de tarefas
```

#### Teste 6: Notificações
```
1. Clique em "Ativar notificações de promoções"
2. Permita notificações
3. Deve mostrar:
   ✅ "Notificações ativadas!"
   ✅ Botão muda para "Desativar notificações"
```

#### Teste 7: Lighthouse
```
1. Lighthouse → marque "Progressive Web App"
2. Clique em "Analyze page load"
3. Deve mostrar:
   ✅ Score: 100/100
```

---

## 3️⃣ Testar Notificação Push

### Método 1: Via Admin
```
1. Vá para /admin
2. Aprove um produto pendente
3. Deve receber notificação:
   ✅ "🔥 Nova promoção disponível!"
   ✅ Nome do produto + preço
```

### Método 2: Via API (teste manual)
```bash
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_SECRET_KEY" \
  -d '{
    "title": "🔥 Teste de notificação",
    "body": "Mouse Gamer por R$ 89,90 (50% OFF)",
    "icon": "/icons/icon-192x192.png",
    "url": "/"
  }'
```

---

## 4️⃣ Testar no Android

```
1. Abra o site no Chrome Android
2. Aguarde 3 segundos
3. Deve aparecer:
   ✅ Banner de instalação na parte inferior
   ✅ Ícone do app + texto
   ✅ Botão "Instalar agora"

4. Clique em "Instalar agora"
5. Deve:
   ✅ Adicionar ícone na tela inicial
   ✅ Abrir em tela cheia
   ✅ Funcionar offline

6. Ative notificações
7. Aprove um produto
8. Deve:
   ✅ Receber notificação no Android
   ✅ Ao clicar, abrir o app
```

---

## 5️⃣ Testar no iOS

```
1. Abra o site no Safari iOS
2. Aguarde 3 segundos
3. Deve aparecer:
   ✅ Banner de instalação
   ✅ Botão "Ver instruções"

4. Clique em "Ver instruções"
5. Deve mostrar:
   ✅ Modal com 3 passos
   ✅ Instruções claras
   ✅ Ícones visuais

6. Siga as instruções:
   - Toque em compartilhar (□↑)
   - "Adicionar à Tela Inicial"
   - "Adicionar"

7. Deve:
   ✅ Adicionar ícone na tela inicial
   ✅ Abrir em tela cheia
   ✅ Funcionar offline

⚠️ NOTA: iOS não suporta notificações push em PWAs
```

---

## 6️⃣ Checklist Final

### Funcionalidades
- [ ] Manifest.json carrega corretamente
- [ ] Service Worker está ativo
- [ ] Cache funciona (offline)
- [ ] Banner de instalação aparece
- [ ] Instalação funciona (Desktop)
- [ ] Instalação funciona (Android)
- [ ] Instalação funciona (iOS)
- [ ] Notificações funcionam (Desktop)
- [ ] Notificações funcionam (Android)
- [ ] Lighthouse PWA: 100/100

### Performance
- [ ] Carregamento < 3s
- [ ] Imagens em cache
- [ ] APIs em cache
- [ ] Página offline funciona

### UX
- [ ] Banner bonito e responsivo
- [ ] Instruções iOS claras
- [ ] Botão de notificações visível
- [ ] Feedback visual ao instalar

---

## 🐛 Problemas Comuns

### Service Worker não registra
```bash
# Solução:
# 1. Limpe o cache: DevTools → Application → Clear storage
# 2. Force reload: Ctrl+Shift+R
# 3. Verifique se está em produção (não funciona em dev)
```

### Banner não aparece
```bash
# Solução:
# 1. Abra o console
# 2. Digite: localStorage.removeItem('installBannerDismissed')
# 3. Recarregue a página
```

### Notificações não funcionam
```bash
# Solução:
# 1. Verifique permissões do navegador
# 2. Verifique se VAPID_PRIVATE_KEY está no .env
# 3. Verifique se service worker está ativo
# 4. Teste com curl (método 2 acima)
```

---

## ✅ Tudo funcionando?

Se todos os testes passaram:
- ✅ PWA está 100% funcional
- ✅ Instalável em todos os dispositivos
- ✅ Notificações push funcionando
- ✅ Offline-first
- ✅ Performance otimizada

🎉 **Parabéns! Seu PWA está pronto para produção!**
