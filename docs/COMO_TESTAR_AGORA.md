# 🚀 COMO TESTAR O PWA AGORA (5 minutos)

## ⚡ PASSO 1: Deploy (3 comandos)

Abra o terminal e execute:

```bash
npx prisma db push
npm run build
pm2 restart affiliate-hub
```

Aguarde o build terminar (pode demorar 1-2 minutos).

---

## 🌐 PASSO 2: Abra o site no Chrome

1. Abra o Chrome
2. Digite: `http://localhost:3000` (ou seu domínio)
3. Aguarde carregar

---

## 🔍 PASSO 3: Abra o DevTools (F12)

Pressione **F12** para abrir o DevTools.

---

## ✅ TESTE 1: Verificar Manifest (10 segundos)

```
1. Clique na aba "Application" (no DevTools)
2. No menu lateral, clique em "Manifest"
3. Você deve ver:
   ✅ Name: "123 Testando"
   ✅ Short name: "123 Testando"
   ✅ Start URL: "/"
   ✅ Display: "standalone"
   ✅ Theme color: "#FF6B35"
   ✅ Vários ícones listados
```

**Se viu tudo isso: ✅ PASSOU!**

---

## ✅ TESTE 2: Verificar Service Worker (10 segundos)

```
1. Ainda na aba "Application"
2. No menu lateral, clique em "Service Workers"
3. Você deve ver:
   ✅ Um service worker listado (sw.js)
   ✅ Status: "activated and is running"
   ✅ Cor verde
```

**Se viu isso: ✅ PASSOU!**

---

## ✅ TESTE 3: Verificar Cache (10 segundos)

```
1. Ainda na aba "Application"
2. No menu lateral, expanda "Cache Storage"
3. Você deve ver vários caches:
   ✅ workbox-precache-...
   ✅ product-images
   ✅ api-products
   ✅ api-coupons
```

**Se viu os caches: ✅ PASSOU!**

---

## ✅ TESTE 4: Testar Offline (20 segundos)

```
1. Clique na aba "Network" (no DevTools)
2. Marque a checkbox "Offline"
3. Recarregue a página (F5)
4. Você deve ver:
   ✅ Página offline customizada
   ✅ Ícone 📡 grande
   ✅ Texto: "Você está offline!"
   ✅ Botão "Tentar novamente"
   ✅ Fundo escuro bonito
```

**Se viu a página offline: ✅ PASSOU!**

5. Desmarque "Offline" e recarregue (F5)

---

## ✅ TESTE 5: Banner de Instalação (30 segundos)

```
1. Aguarde 3 segundos
2. Você deve ver na parte inferior:
   ✅ Banner laranja
   ✅ Ícone do app
   ✅ Texto: "Instale o 123 Testando"
   ✅ Botão "Instalar agora"
   ✅ Botão X no canto
```

**Se viu o banner: ✅ PASSOU!**

**Se NÃO viu o banner:**
```javascript
// Abra o Console (DevTools) e digite:
localStorage.removeItem('installBannerDismissed')
// Depois recarregue a página (F5)
```

---

## ✅ TESTE 6: Instalar o App (30 segundos)

```
1. Clique no banner "Instalar agora"
   OU
   Clique no ícone ➕ na barra de endereço

2. Clique em "Instalar"

3. O app deve:
   ✅ Abrir em uma janela separada
   ✅ Sem barra de endereço
   ✅ Sem botões do navegador
   ✅ Ícone na barra de tarefas
   ✅ Parece um app nativo
```

**Se abriu em janela separada: ✅ PASSOU!**

---

## ✅ TESTE 7: Notificações (1 minuto)

```
1. Na página inicial, role até ver:
   ✅ Botão laranja "Ativar notificações de promoções"

2. Clique no botão

3. O navegador vai pedir permissão:
   ✅ Clique em "Permitir"

4. Você deve ver:
   ✅ Alerta: "Notificações ativadas!"
   ✅ Botão muda para "Desativar notificações"
```

**Se viu o alerta: ✅ PASSOU!**

---

## ✅ TESTE 8: Receber Notificação (1 minuto)

### Opção A: Aprovar um produto no admin

```
1. Vá para: http://localhost:3000/admin
2. Aprove um produto pendente
3. Você deve receber:
   ✅ Notificação do Windows/Mac
   ✅ Título: "🔥 Nova promoção disponível!"
   ✅ Texto: Nome do produto + preço
```

### Opção B: Testar com curl

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

**Se recebeu notificação: ✅ PASSOU!**

---

## ✅ TESTE 9: Lighthouse PWA Score (1 minuto)

```
1. No DevTools, clique na aba "Lighthouse"
2. Marque apenas "Progressive Web App"
3. Clique em "Analyze page load"
4. Aguarde a análise (30 segundos)
5. Você deve ver:
   ✅ Score: 100/100 (ou muito próximo)
   ✅ Todos os checks verdes
```

**Se score >= 90: ✅ PASSOU!**

---

## 📱 TESTE 10: No Celular (Android)

```
1. Abra o site no Chrome do Android
2. Aguarde 3 segundos
3. Você deve ver:
   ✅ Banner na parte inferior
   ✅ Botão "Instalar agora"

4. Clique em "Instalar agora"
5. Você deve ver:
   ✅ Ícone adicionado à tela inicial
   ✅ App abre em tela cheia
   ✅ Sem barra do navegador

6. Ative notificações no app
7. Aprove um produto no admin
8. Você deve:
   ✅ Receber notificação no Android
```

---

## 📱 TESTE 11: No Celular (iOS)

```
1. Abra o site no Safari do iPhone
2. Aguarde 3 segundos
3. Você deve ver:
   ✅ Banner na parte inferior
   ✅ Botão "Ver instruções"

4. Clique em "Ver instruções"
5. Você deve ver:
   ✅ Modal com 3 passos
   ✅ Instruções claras
   ✅ Ícones visuais

6. Siga as instruções:
   - Toque em compartilhar (□↑)
   - "Adicionar à Tela Inicial"
   - "Adicionar"

7. Você deve ver:
   ✅ Ícone na tela inicial
   ✅ App abre em tela cheia
```

**⚠️ NOTA:** iOS não suporta notificações push em PWAs

---

## 🎉 RESULTADO FINAL

Se todos os testes passaram:

✅ Manifest: OK
✅ Service Worker: OK
✅ Cache: OK
✅ Offline: OK
✅ Banner: OK
✅ Instalação: OK
✅ Notificações: OK
✅ Lighthouse: 100/100
✅ Android: OK
✅ iOS: OK

**🎊 PARABÉNS! SEU PWA ESTÁ 100% FUNCIONAL!**

---

## ❌ Se algo não funcionou

### Service Worker não aparece
```bash
# Solução:
# 1. Verifique se fez o build: npm run build
# 2. Verifique se está em produção (não funciona em dev)
# 3. Limpe o cache: DevTools → Application → Clear storage
# 4. Recarregue: Ctrl+Shift+R
```

### Banner não aparece
```javascript
// No console do navegador:
localStorage.removeItem('installBannerDismissed')
// Depois: F5
```

### Notificações não funcionam
```bash
# Verifique:
# 1. Permissões do navegador (deve estar "Permitir")
# 2. Service worker está ativo?
# 3. VAPID_PRIVATE_KEY está no .env?
# 4. Teste com curl (opção B do teste 8)
```

### Lighthouse score baixo
```bash
# Possíveis causas:
# 1. Não está em HTTPS (em produção precisa)
# 2. Service worker não está ativo
# 3. Manifest tem erro
# 4. Ícones faltando
```

---

## 📞 Precisa de ajuda?

1. Verifique os logs: `pm2 logs affiliate-hub`
2. Verifique o console do navegador (F12 → Console)
3. Leia: `PWA_GUIA_COMPLETO.md`
4. Leia: `TESTAR_PWA.md`

---

## ⏱️ Tempo total de teste: ~5 minutos

- Deploy: 2 minutos
- Testes Desktop: 2 minutos
- Testes Mobile: 1 minuto

**Boa sorte! 🚀**
