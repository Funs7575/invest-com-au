import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Minimal request shape the helper needs — just headers.get().
 * Accepts both NextRequest and the plain Request type that some older
 * cron routes use so callers don't have to normalise first.
 */
type RequestLike = NextRequest | Request | { headers: { get(name: string): string | null } };

/**
 * Shared cron auth helper. Every cron route under /api/cron/ uses this
 * instead of open-coding its own `authHeader !== Bearer ${CRON_SECRET}`
 * check so we get:
 *
 *   1. Timing-safe comparison (timingSafeEqual instead of string !==).
 *      Open-string compare is theoretically vulnerable to byte-level
 *      timing side-channels. Not practically exploitable over the
 *      public internet with a high-entropy secret, but trivial to fix.
 *
 *   2. Hard fail-closed if CRON_SECRET is missing / empty at request
 *      time. Without this guard, an empty env var reduced the check
 *      to `authHeader !== "Bearer "` which still rejects random
 *      callers but leaks the existence of the env var and could be
 *      bypassed by a caller who knew the exact format.
 *
 *   3. Consistent 401 response shape across every cron.
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

  // Constant-time compare. Bail fast if the lengths differ — comparing
  // buffers of different lengths throws on timingSafeEqual.
  const aBuf = Buffer.from(authHeader);
  const bBuf = Buffer.from(expected);
  if (aBuf.length !== bBuf.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!timingSafeEqual(aBuf, bBuf)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
