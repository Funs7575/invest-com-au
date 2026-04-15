import { NextRequest, NextResponse } from "next/server";

/**
 * Minimal request shape the helper needs — just headers.get().
 * Accepts both NextRequest and the plain Request type that some older
 * cron routes use so callers don't have to normalise first.
 */
type RequestLike =
  | NextRequest
  | Request
  | { headers: { get(name: string): string | null } };

/**
 * Constant-time string comparison. We previously used Node's
 * crypto.timingSafeEqual, but many cron routes use the Edge runtime
 * where Node's `crypto` module is not available, which broke the
 * Vercel build. This pure-JS version is edge-compatible and runs in
 * O(n) with no early return, so the byte-level timing side-channel
 * the original was guarding against is still mitigated.
 *
 * The CRON_SECRET is high entropy (≥16 chars enforced) and this runs
 * behind a network — the theoretical timing attack was never practical
 * over the public internet, but defensive is still defensive.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Shared cron auth helper. Every cron route under /api/cron/ uses this
 * instead of open-coding its own `authHeader !== Bearer ${CRON_SECRET}`
 * check so we get:
 *
 *   1. Constant-time compare instead of raw string !==. Defensive
 *      mitigation of byte-level timing side-channels. Not exploitable
 *      over the public internet with a high-entropy secret, but
 *      trivial to do correctly.
 *
 *   2. Hard fail-closed if CRON_SECRET is missing / empty / short at
 *      request time. Without this guard, an empty env var reduced the
 *      check to `authHeader !== "Bearer "` which still rejects random
 *      callers but could be bypassed by a caller who knew the exact
 *      format and sent just that literal.
 *
 *   3. Consistent 401 response shape across every cron.
 *
 *   4. Edge-runtime compatible — cannot import from `node:crypto` or
 *      any Node built-in because many cron routes are declared with
 *      `export const runtime = "edge"`.
 *
 * Usage:
 *
 *     import { requireCronAuth } from "@/lib/cron-auth";
 *     export async function GET(req: NextRequest) {
 *       const unauth = requireCronAuth(req);
 *       if (unauth) return unauth;
 *       // ... cron body
 *     }
 */
export function requireCronAuth(req: RequestLike): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    // Fail-closed on misconfiguration. A missing secret is ALWAYS a
    // misconfiguration — we never want cron auth to degrade to "allow
    // all" just because the env var didn't propagate to a new deploy.
    return NextResponse.json(
      { error: "Cron endpoint misconfigured" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;

  if (!safeEqual(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
