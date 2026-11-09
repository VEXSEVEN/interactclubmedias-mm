// Interact Club Mediaș — Service Worker
// Gestioneaza PWA, offline cache si Web Push Notifications (inclusiv pe iOS/Android)

const CACHE_NAME = "imc-mm-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/", "/manifest.webmanifest"]).catch(() => {})
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Cache fallback pentru shell (datele live vin prin Firebase WebSocket)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/")))
  );
});

// Notificari Web Push (FCM sau server propriu)
self.addEventListener("push", (event) => {
  let data = {
    title: "Interact Club Mediaș",
    body: "Ai o notificare nouă.",
    url: "/jucator",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      const n = parsed.notification || {};
      const d = parsed.data || parsed;
      data = {
        title: d.title || n.title || data.title,
        body: d.body || n.body || data.body,
        url: d.url || n.click_action || data.url,
        tag: d.tag || n.tag || undefined,
      };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "imc-notification",
    data: { url: data.url || "/jucator" },
    vibrate: [100, 50, 100],
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Click pe notificare: deschide fereastra existenta sau una noua
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/jucator";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
