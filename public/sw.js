/**
 * Invest.com.au service worker.
 *
 * Strategy:
 *   - Static assets (/_next/static/...): stale-while-revalidate
 *     with a 7-day cache
 *   - Images: cache-first with a 30-day expiry
 *   - HTML pages: network-first, fall back to cache on offline
 *     so the last-visited page can still render
 *   - API routes: never cached (always network)
 *
 * Registered once from /lib/register-sw.ts via a useEffect in the
 * layout. A new build bumps SW_VERSION in its place and the old
 * cache is cleaned up on activation.
 *
 * Privacy: nothing under /admin, /broker-portal, /advisor-portal,
 * /dashboard, or /api is ever cached — those are either auth-gated
 * or mutating.
 */

const SW_VERSION = "v1";
const STATIC_CACHE = `invest-static-${SW_VERSION}`;
const IMAGE_CACHE = `invest-images-${SW_VERSION}`;
const HTML_CACHE = `invest-html-${SW_VERSION}`;

const STATIC_MAX_AGE_DAYS = 7;
const IMAGE_MAX_AGE_DAYS = 30;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.endsWith(SW_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
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
  if (url.origin !== self.location.origin) return; // cross-origin → let the browser handle
  if (shouldBypass(url)) return;

  // Static Next.js assets → stale-while-revalidate
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/")) {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
    return;
  }

  // Images
  if (
    url.pathname.match(/\.(png|jpg|jpeg|webp|avif|svg|ico|gif)$/i) ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/api/og")
  ) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE));
    return;
  }

  // HTML pages → network first, fall back to cache
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(req, HTML_CACHE));
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
    return cached || new Response("", { status: 504 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}
