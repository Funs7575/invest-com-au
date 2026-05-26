/**
 * GET /api/ipo-offers
 *
 * Public, CDN-cached list of published IPO offers.
 *
 * Query params (all optional):
 *   status   — filter by status ('upcoming'|'open'|'closed'|'listed'|'withdrawn')
 *   limit    — max results (default 50, max 100)
 *
 * Cache-Control: public, 1 h fresh + 24 h stale-while-revalidate.
 * Falls through to anon Supabase RLS (is_published = true only).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID_STATUSES = new Set(["upcoming", "open", "closed", "listed", "withdrawn"]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const statusParam = searchParams.get("status");
  const limitParam = searchParams.get("limit");

  const limit = Math.min(Math.max(1, parseInt(limitParam ?? "50", 10) || 50), 100);

  const supabase = await createClient();

  let query = supabase
    .from("ipo_offers")
    .select(
      "id, asx_code, company_name, sector, offer_type, status, offer_open_date, offer_close_date, listing_date, issue_price_cents, amount_raised_cents, minimum_application_cents, first_day_return_pct, note, description, prospectus_url",
    )
    .eq("is_published", true)
    .order("listing_date", { ascending: false, nullsFirst: true })
    .limit(limit);

  if (statusParam && VALID_STATUSES.has(statusParam)) {
    query = query.eq("status", statusParam);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json(
    { offers: data ?? [] },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
