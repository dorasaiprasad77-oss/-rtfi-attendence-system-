// Service Worker for Push Notifications
// Handles incoming push events and notification click actions

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Handle incoming push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "RFID Access Control",
      body: event.data.text(),
      icon: "/icon-192.png",
      badge: "/badge-72.png",
    };
  }

  const { title, body, icon, badge, tag, data, actions } = payload;

  const notificationOptions = {
    body,
    icon: icon || "/icon-192.png",
    badge: badge || "/badge-72.png",
    tag: tag || `rfid-${Date.now()}`,
    data: data || {},
    vibrate: [100, 50, 100],
    requireInteraction: data?.priority === "high",
    actions: actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title || "RFID Access Control", notificationOptions)
  );
});

// Handle notification click - focus or open the dashboard
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes("/dashboard") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
