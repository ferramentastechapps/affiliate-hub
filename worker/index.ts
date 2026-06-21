/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || "Economizei - Nova Oferta!";
      const body = data.body || "Temos uma nova oferta para você!";
      const icon = data.icon || "/icons/icon-192x192.png";
      const badge = data.badge || "/icons/icon-72x72.png";
      const url = data.url || "/";

      const options = {
        body,
        icon,
        badge,
        data: { url },
        vibrate: [200, 100, 200],
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error("Error parsing push payload:", e);
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Se a página já estiver aberta, foca nela
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      // Se não, abre uma nova aba/janela
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
