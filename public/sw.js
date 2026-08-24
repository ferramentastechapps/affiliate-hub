/**
 * Economizei Service Worker
 * - Atualizações automáticas e silenciosas em background (sem avisos chatos)
 * - skipWaiting() e clientsClaim() imediatos
 * - Estratégia Network-First para páginas HTML (sempre mostra o conteúdo mais recente)
 * - Cache dinâmico para assets estáticos e imagens
 * - Suporte a Push Notifications e ações de notificação
 */

const CACHE_NAME = 'economizei-cache-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.ico',
];

// ── 1. INSTALAÇÃO (Ativação imediata) ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Força o novo Service Worker a ativar imediatamente sem fila de espera
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Aviso durante precache inicial:', err);
      });
    })
  );
});

// ── 2. ATIVAÇÃO (Limpeza de caches antigos e reivindicação imediata) ───────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Removendo cache antigo:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ── 3. MENSAGENS (Suporte a SKIP_WAITING vindo do cliente) ───────────────────
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// ── 4. FETCH (Estratégias de Cache) ──────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignora requisições que não sejam GET ou esquemas não-http (ex: chrome-extension)
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // A. Rotas de API sensíveis / autenticação / admin -> Somente Rede (sem cache)
  if (
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/admin') ||
    url.pathname.startsWith('/api/upload') ||
    url.pathname.startsWith('/api/scrape') ||
    url.pathname.startsWith('/api/webhook')
  ) {
    return; // Deixa o navegador lidar normalmente via rede
  }

  // B. Páginas e Navegação (HTML) -> Network-First com fallback para cache/offline
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;

          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // C. Assets estáticos do Next.js (_next/static/...) -> Stale-While-Revalidate
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // D. Imagens e Mídia -> Cache-First com fallback de rede
  if (
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|webp|avif|svg|gif|ico)(\?.*)?$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response('', { status: 408, statusText: 'Image unavailable offline' });
          });
      })
    );
    return;
  }

  // E. APIs públicas (produtos, cupons, categorias) -> Network-First
  if (
    url.pathname.startsWith('/api/products') ||
    url.pathname.startsWith('/api/coupons') ||
    url.pathname.startsWith('/api/categories')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
});

// ── 5. PUSH NOTIFICATIONS ───────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Economizei - Nova Oferta!';
    const body = data.body || 'Temos uma nova oferta para você!';
    const icon = data.icon || '/icons/icon-192x192.png';
    const badge = data.badge || '/icons/icon-72x72.png';
    const url = data.url || '/';
    const image = data.image || undefined;
    const actions = data.actions || [];
    const couponCode = data.couponCode || null;

    const options = {
      body,
      icon,
      badge,
      image,
      data: { url, couponCode },
      vibrate: [200, 100, 200],
      actions: actions.length > 0 ? actions : undefined,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW Push] Erro ao processar payload push:', err);
  }
});

// ── 6. CLIQUE NA NOTIFICAÇÃO ─────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let url = event.notification.data?.url || '/';
  const couponCode = event.notification.data?.couponCode;

  if (event.action === 'copy_coupon' && couponCode) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}copyCoupon=${encodeURIComponent(couponCode)}`;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client && 'navigate' in client) {
            client.focus();
            return client.navigate(url);
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
