/// <reference lib="webworker" />
export type {};
declare let self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || "Economizei - Nova Oferta!";
      const body = data.body || "Temos uma nova oferta para você!";
      const icon = data.icon || "/icons/icon-192x192.png";
      const badge = data.badge || "/icons/icon-72x72.png";
      const url = data.url || "/";
      const image = data.image || null; // URL da imagem do produto para Rich Notifications
      const actions = data.actions || []; // Botões de ação adicionais
      const couponCode = data.couponCode || null; // Código do cupom para copiar

      const options: any = {
        body,
        icon,
        badge,
        image: image || undefined,
        data: { url, couponCode },
        vibrate: [200, 100, 200],
        actions: actions.length > 0 ? actions : undefined,
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error("Error parsing push payload:", e);
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let urlToOpen = event.notification.data?.url || "/";
  const couponCode = event.notification.data?.couponCode;

  // Se o usuário clicou na ação de copiar cupom
  if (event.action === "copy_coupon" && couponCode) {
    const separator = urlToOpen.includes("?") ? "&" : "?";
    urlToOpen = `${urlToOpen}${separator}copyCoupon=${encodeURIComponent(couponCode)}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Se já tiver uma aba aberta do site, podemos focar nela e navegar
      for (const client of clientList) {
        if ("focus" in client) {
          // Navega a aba aberta para a URL desejada e dá foco
          if ("navigate" in client) {
            client.focus();
            return (client as any).navigate(urlToOpen);
          }
        }
      }
      // Se não houver abas abertas, abre uma nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
