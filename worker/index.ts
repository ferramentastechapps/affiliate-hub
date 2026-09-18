/// <reference lib="webworker" />
export type {};
declare let self: ServiceWorkerGlobalScope;

// ─────────────────────────────────────────────
// Constantes Padrão de Notificação
// ─────────────────────────────────────────────
const DEFAULT_TITLE = "Economizei - Nova Oferta!";
const DEFAULT_BODY = "Temos uma nova oferta para você!";
const DEFAULT_ICON = "/icons/icon-192x192.png";
const DEFAULT_BADGE = "/icons/icon-72x72.png";
const DEFAULT_VIBRATION_PATTERN = [200, 100, 200];
const ACTION_COPY_COUPON = "copy_coupon";

interface CustomNotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  image?: string | null;
  actions?: CustomNotificationAction[];
  couponCode?: string | null;
}

/**
 * Constrói a URL final de destino, injetando o parâmetro de cópia de cupom caso a ação tenha sido disparada.
 */
function resolveNotificationTargetUrl(baseUrl: string, action: string, couponCode?: string | null): string {
  if (action === ACTION_COPY_COUPON && couponCode) {
    const querySeparator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${querySeparator}copyCoupon=${encodeURIComponent(couponCode)}`;
  }
  return baseUrl;
}

/**
 * Foca em uma aba aberta existente do aplicativo ou abre uma nova janela.
 */
async function focusOrOpenClientWindow(targetUrl: string): Promise<WindowClient | null> {
  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  for (const client of clientList) {
    if ("focus" in client && "navigate" in client) {
      await client.focus();
      return (client as WindowClient).navigate(targetUrl);
    }
  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(targetUrl);
  }

  return null;
}

// ─────────────────────────────────────────────
// Listeners de Eventos do Service Worker
// ─────────────────────────────────────────────
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  try {
    const payload: PushPayload = event.data.json();
    const title = payload.title || DEFAULT_TITLE;
    const actions = payload.actions || [];

    interface ExtendedNotificationOptions extends NotificationOptions {
      image?: string;
      vibrate?: number | number[];
      actions?: CustomNotificationAction[];
    }

    const options: ExtendedNotificationOptions = {
      body: payload.body || DEFAULT_BODY,
      icon: payload.icon || DEFAULT_ICON,
      badge: payload.badge || DEFAULT_BADGE,
      image: payload.image || undefined,
      data: {
        url: payload.url || "/",
        couponCode: payload.couponCode || null,
      },
      vibrate: DEFAULT_VIBRATION_PATTERN,
      actions: actions.length > 0 ? actions : undefined,
    };

    event.waitUntil(self.registration.showNotification(title, options as NotificationOptions));
  } catch (error) {
    console.error("[ServiceWorker] Erro ao processar payload de push:", error);
  }
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/";
  const couponCode = event.notification.data?.couponCode;
  const targetUrl = resolveNotificationTargetUrl(rawUrl, event.action, couponCode);

  event.waitUntil(focusOrOpenClientWindow(targetUrl));
});


