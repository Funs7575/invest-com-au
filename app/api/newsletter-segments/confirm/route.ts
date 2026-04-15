import { NextRequest, NextResponse } from "next/server";
import { confirmSubscription, unsubscribeByToken } from "@/lib/newsletter";

export const runtime = "nodejs";

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
  const body = await request.json().catch(() => ({}));
  const action = body.action as "unsubscribe" | undefined;
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
