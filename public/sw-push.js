/**
 * Service Worker for Web Push Notifications — invest.com.au
 *
 * Handles incoming push events and notification click navigation.
 */

/* eslint-disable no-restricted-globals */

self.addEventListener("push", function (event) {
  if (!event.data) return;

  var data;
  try {
    data = event.data.json();
  } catch (e) {
    // If JSON parsing fails, use text
    data = {
      title: "invest.com.au",
      body: event.data.text(),
      url: "/",
    };
  }

  var title = data.title || "invest.com.au";
  var options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.topic || "general",
    data: {
      url: data.url || "/",
    },
    // Vibrate pattern for mobile
    vibrate: [100, 50, 100],
    // Auto-close after 30 seconds
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/";

  // If relative URL, make it absolute
  if (url.startsWith("/")) {
    url = self.location.origin + url;
  }

  event.waitUntil(
    // Try to focus an existing tab, otherwise open a new one
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Handle subscription change (browser re-subscribes after expiry)
self.addEventListener("pushsubscriptionchange", function (event) {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then(function (subscription) {
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            topics: ["fee_changes", "deals"], // Re-subscribe with default topics
          }),
        });
      })
  );
});
