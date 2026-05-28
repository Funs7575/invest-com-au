import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmSubscription, unsubscribeByToken } from "@/lib/newsletter";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

export const runtime = "nodejs";

// Unsubscribe body. Both fields are re-checked below (action must be
// "unsubscribe", token must be a non-empty string) which produces the
// "Invalid request" 400; the schema stays permissive + `.passthrough()` so a
// malformed body falls through to that same guard rather than a new envelope.
const PostBody = z
  .object({
    action: z.string().optional(),
    token: z.string().optional(),
  })
  .passthrough();

/**
 * GET /api/newsletter-segments/confirm?token=...
 * POST (unsubscribe) /api/newsletter-segments/confirm body={action:'unsubscribe', token}
 *
 * Minimal pair of endpoints for the double-opt-in flow.
 * GET confirms, POST unsubscribes (destructive action should
 * never be GET so link-preview crawlers can't accidentally
 * unsubscribe the user).
 */
export async function GET(request: NextRequest) {
  if (!(await isAllowed("newsletter_segments_get", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const result = await confirmSubscription(token);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, email: result.email });
}

export async function POST(request: NextRequest) {
  if (!(await isAllowed("newsletter_segments_post", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = PostBody.safeParse(await request.json().catch(() => ({})));
  const body = parsed.success ? parsed.data : {};
  const action = body.action;
  const token = typeof body.token === "string" ? body.token : null;
  if (action !== "unsubscribe" || !token) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await unsubscribeByToken(token);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, email: result.email });
}
