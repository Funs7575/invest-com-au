import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:account:holdings:handoff");

export const runtime = "nodejs";

/**
 * POST /api/account/holdings/handoff
 *
 * Creates a short-lived, read-once handoff token that embeds the caller's
 * current holdings snapshot. The token is passed to /find-advisor via
 * `?handoff=<token>` so an advisor can view a read-only summary without
 * having access to the investor's full account.
 *
 * Body (optional):
 *   { intent?: string }  — defaults to "tax-prep"
 *
 * Returns:
 *   { token: string }
 *
 * Security surface:
 * - Requires authenticated user (via cookie session).
 * - Holdings are fetched via the user-scoped supabase client so RLS fires —
 *   an investor cannot snapshot another user's holdings.
 * - Token is a random UUID v4 — unguessable, not sequential.
 * - Expiry: 14 days.
 */

const Body = z.object({
  intent: z.string().max(100).optional().default("tax-prep"),
});

export const POST = withValidatedBody(Body, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Fetch the user's holdings (RLS scopes to own rows).
  const { data: holdingsData, error: holdingsError } = await supabase
    .from("investor_holdings")
    .select(
      "ticker, exchange, shares, cost_basis_per_share_cents, acquired_at, broker_slug, notes",
    )
    .order("acquired_at", { ascending: false });

  if (holdingsError) {
    log.warn("handoff holdings fetch failed", { error: holdingsError.message, user_id: user.id });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase
    .from("investor_handoffs")
    .insert({
      user_id: user.id,
      token,
      holdings_snapshot_json: holdingsData ?? [],
      intent: body.intent,
      expires_at: expiresAt,
    });

  if (insertError) {
    log.warn("handoff insert failed", { error: insertError.message, user_id: user.id });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  log.info("handoff created", { user_id: user.id, intent: body.intent });
  return NextResponse.json({ token }, { status: 201 });
});
