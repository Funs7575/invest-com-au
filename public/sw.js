/**
 * Invest.com.au service worker — caching + push notifications.
 *
 * This is the single service worker registered at scope "/".
 * It handles both offline caching and web push notifications.
 *
 * Caching strategy:
 *   - Static assets (/_next/static/...): stale-while-revalidate (7 days)
 *   - Images: cache-first (30 days)
 *   - HTML pages: network-first, fall back to cache, then /offline
 *   - API routes: never cached (always network)
 *
 * Push strategy:
 *   - push: show notification with title/body/icon/url from payload
 *   - notificationclick: focus existing tab or open new one
 *   - pushsubscriptionchange: re-subscribe and POST to /api/push/subscribe
 *
 * Privacy: nothing under /admin, /broker-portal, /advisor-portal,
 * /dashboard, or /api is ever cached — those are either auth-gated
 * or mutating.
 */

const SW_VERSION = "v3";
const STATIC_CACHE = `invest-static-${SW_VERSION}`;
const IMAGE_CACHE = `invest-images-${SW_VERSION}`;
const HTML_CACHE = `invest-html-${SW_VERSION}`;
const SHELL_CACHE = `invest-shell-${SW_VERSION}`;

const OFFLINE_URL = "/offline";

// URLs to precache as the offline app shell
const APP_SHELL = [
  OFFLINE_URL,
];

// Key static pages to warm into HTML_CACHE on install
const WARM_PAGES = [
  "/",
  "/compare",
  "/calculators",
  "/articles",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(SHELL_CACHE);
      // Precache app shell — offline fallback must always be available
      await shellCache.addAll(APP_SHELL);

      // Warm key navigation pages into HTML_CACHE (best-effort — don't fail install)
      const htmlCache = await caches.open(HTML_CACHE);
      await Promise.allSettled(
        WARM_PAGES.map((url) =>
          fetch(url, { redirect: "follow" }).then((res) => {
            if (res.ok) htmlCache.put(url, res);
          })
        )
      );

      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up caches from old versions
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.endsWith(SW_VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

const NO_CACHE_PREFIXES = [
  "/api/",
  "/admin",
  "/broker-portal",
  "/advisor-portal",
  "/dashboard",
  "/invest/my-listings",
];

function shouldBypass(url) {
  const path = url.pathname;
  return NO_CACHE_PREFIXES.some((p) => path.startsWith(p));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // cross-origin → let browser handle
  if (shouldBypass(url)) return;

  // Static Next.js assets → stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/")
  ) {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
    return;
  }

  // Images → cache-first
  if (
    url.pathname.match(/\.(png|jpg|jpeg|webp|avif|svg|ico|gif)$/i) ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/api/og")
  ) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE));
    return;
  }

  // HTML navigations → network-first with offline fallback
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithOfflineFallback(req, HTML_CACHE));
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("", { status: 504 });
  }
}

async function networkFirstWithOfflineFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) cache.put(request, response.clone());
    return response;
  } catch {
    // Try cache for this specific page first
    const cached = await cache.match(request);
    if (cached) return cached;

    // Fall back to the precached offline page
    const shellCache = await caches.open(SHELL_CACHE);
    const offlinePage = await shellCache.match(OFFLINE_URL);
    return (
      offlinePage ||
      new Response("You are offline", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

// ─── Push notification handlers ─────────────────────────────────────────────

self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    // If JSON parsing fails, use text
    data = {
      title: "invest.com.au",
      body: event.data.text(),
      url: "/",
    };
  }

  const title = data.title || "invest.com.au";
  const options = {
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

  let url =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : "/";

  // If relative URL, make it absolute
  if (url.startsWith("/")) {
    url = self.location.origin + url;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // 1. Exact URL match already open → just focus it.
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        // 2. Otherwise reuse an existing same-origin tab and navigate it to
        //    the deep link (covers adviser lock-screen taps landing in an
        //    already-open portal tab instead of spawning duplicates). Falls
        //    back to a fresh window when navigate() isn't available. This is
        //    backwards-compatible with consumer pushes — they share the path.
        let targetOrigin = self.location.origin;
        try {
          targetOrigin = new URL(url).origin;
        } catch {
          // url was already absolute-from-origin above; keep the default.
        }
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (
            client.url &&
            client.url.indexOf(targetOrigin) === 0 &&
            "focus" in client
          ) {
            if ("navigate" in client) {
              return client.navigate(url).then(function (navigated) {
                return navigated && "focus" in navigated
                  ? navigated.focus()
                  : client.focus();
              }).catch(function () {
                return client.focus();
              });
            }
            return client.focus();
          }
        }
        // 3. No tab to reuse → open a new window.
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
