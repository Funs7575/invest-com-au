/**
 * /api/account/ipo-watchlist
 *
 * GET    — list all watchlist entries for the authenticated user
 * POST   — add an alert subscription { ipo_id, alert_type }
 * DELETE — remove a subscription { ipo_id, alert_type }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";

const ALERT_TYPES = ["open", "close", "listing", "prospectus"] as const;

const WatchlistBody = z.object({
  ipo_id: z.number().int().positive(),
  alert_type: z.enum(ALERT_TYPES),
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("ipo_watchlist")
    .select("id, ipo_id, alert_type, created_at, ipo_offers(asx_code, company_name, status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });

  return NextResponse.json({ watchlist: data ?? [] });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export const POST = withValidatedBody(WatchlistBody, async (req: NextRequest, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (await isRateLimited(`ipo_watchlist_add:${user.id}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { ipo_id, alert_type } = body;

  const { data, error } = await supabase
    .from("ipo_watchlist")
    .insert({ user_id: user.id, ipo_id, alert_type })
    .select("id, ipo_id, alert_type, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already watching this IPO for this alert type" }, { status: 409 });
    }
    if (error.code === "23503") {
      return NextResponse.json({ error: "IPO not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

export const DELETE = withValidatedBody(WatchlistBody, async (_req: NextRequest, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ipo_id, alert_type } = body;

  const { error } = await supabase
    .from("ipo_watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("ipo_id", ipo_id)
    .eq("alert_type", alert_type);

  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  return NextResponse.json({ success: true });
});
