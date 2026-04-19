import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

/**
 * Global middleware — request-ID correlation.
 *
 * Stamps a stable `x-request-id` header on every request + response.
 * If the client already sent one (e.g. Vercel edge, load balancer,
 * internal fetch), we keep theirs so the whole trace collapses to one
 * id. Otherwise we mint a fresh uuid.
 *
 * Combined with `lib/logger.ts` setLoggerRequestId, every log line +
 * Sentry event during a request carries the same id — `rg "abcd1234"`
 * across Vercel / Supabase / Sentry returns the whole story.
 *
 * Scope: all routes. Static assets are excluded via the matcher to
 * avoid inflating request-id cardinality on cached responses.
 */
export function middleware(req: NextRequest) {
  const incoming = req.headers.get("x-request-id");
  const requestId = isValidRequestId(incoming) ? incoming! : randomUUID();

  // Forward to the handler (so `req.headers.get('x-request-id')` works)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("x-request-id", requestId);
  return res;
}

/**
 * Be conservative about accepting a client-supplied header so a hostile
 * caller can't poison our logs with log-injection characters or
 * unreasonably long values.
 */
function isValidRequestId(x: string | null): boolean {
  if (!x) return false;
  return /^[a-zA-Z0-9_-]{8,64}$/.test(x);
}

export const config = {
  matcher: [
    // Match everything except static assets + Next internals.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|css|js)$).*)",
  ],
};
