/**
 * Shared in-memory rate limiter for API routes.
 * Each route creates its own instance with custom window/max settings.
 *
 * Note: In serverless environments, each container has its own Map —
 * this provides per-container rate limiting, not global. For production
 * at scale, consider Upstash Redis or Vercel KV.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(windowMs: number, maxRequests: number) {
  const map = new Map<string, RateLimitEntry>();
  let lastCleanup = Date.now();

  // Lazy cleanup: purge stale entries at most once per minute on access
  // instead of using setInterval (which keeps serverless containers alive).
  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < 60_000) return;
    lastCleanup = now;
    for (const [key, entry] of map.entries()) {
      if (now > entry.resetAt) map.delete(key);
    }
  }

  return function isRateLimited(ip: string): boolean {
    cleanup();
    const now = Date.now();
    const entry = map.get(ip);

    if (!entry || now > entry.resetAt) {
      map.set(ip, { count: 1, resetAt: now + windowMs });
      return false;
    }

    entry.count++;
    return entry.count > maxRequests;
  };
}
