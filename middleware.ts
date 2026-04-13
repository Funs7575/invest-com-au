import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware: stamps every request with an X-Request-ID header so every
 * Sentry event, log line and downstream service log can be correlated
 * back to a single user request.
 *
 * Why this matters: without a stable request id, debugging a production
 * incident means stitching together stack traces, log lines and webhook
 * receipts by timestamp + URL — fragile and slow. With a request id you
 * can search Sentry / Vercel logs / Supabase logs for a single token
 * and see every event for that one request.
 *
 * Runs on the Edge runtime so the cost is ~negligible per request.
 */
export function middleware(request: NextRequest) {
  // Honour upstream request id if a CDN or load balancer already
  // attached one (e.g. Vercel sets x-vercel-id which is conceptually
  // similar). Fall back to a fresh UUID otherwise.
  const incomingId =
    request.headers.get("x-request-id") ||
    request.headers.get("x-vercel-id") ||
    crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", incomingId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Echo the id on the response so client-side error reports and
  // browser DevTools can quote it when filing bug reports.
  response.headers.set("x-request-id", incomingId);

  return response;
}

export const config = {
  // Run on every route except Next internal assets and the favicon.
  // Sitemap and robots are explicitly included so even crawler hits
  // get a request id for SEO debugging.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
};
