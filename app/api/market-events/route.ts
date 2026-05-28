/**
 * GET /api/market-events
 *
 * Lists published market events, optionally filtered by date range.
 *
 * Query params:
 *   from=YYYY-MM-DD  — start date (inclusive, defaults to today)
 *   to=YYYY-MM-DD    — end date (inclusive, defaults to 90 days from today)
 *   type=rba|asx|... — filter by event_type (optional)
 *
 * Response is CDN-cached (max-age=3600, swr=86400) — events change
 * infrequently; stale-while-revalidate absorbs admin edits.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID_TYPES = new Set(["rba", "asx", "earnings", "economic", "dividend", "ipo", "other"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const typeParam = searchParams.get("type");

  const from = fromParam && DATE_RE.test(fromParam) ? fromParam : todayStr();
  const to = toParam && DATE_RE.test(toParam) ? toParam : daysFromNow(90);
  const eventType = typeParam && VALID_TYPES.has(typeParam) ? typeParam : null;

  const supabase = await createClient();
  let query = supabase
    .from("market_events")
    .select("id, event_date, event_type, title, description, source_url, is_all_day, start_time, timezone")
    .eq("is_published", true)
    .gte("event_date", from)
    .lte("event_date", to)
    .order("event_date", { ascending: true })
    .limit(200);

  if (eventType) {
    query = query.eq("event_type", eventType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json(
    { events: data ?? [], from, to },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
