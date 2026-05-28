/**
 * GET /api/office-hours
 *
 * Public list of published advisor office hours sessions.
 *
 * Query params (all optional):
 *   status  — filter by status ('upcoming'|'live'|'transcript'|'ended')
 *   limit   — max results (default 20, max 50)
 *
 * Cache-Control: public, 5 min (sessions are updated infrequently).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID_STATUSES = new Set(["upcoming", "live", "ended", "transcript"]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const statusParam = searchParams.get("status");
  const limitParam = searchParams.get("limit");

  const limit = Math.min(Math.max(1, parseInt(limitParam ?? "20", 10) || 20), 50);

  const supabase = await createClient();

  let query = supabase
    .from("advisor_office_hours")
    .select(
      "id, title, description, scheduled_at, ends_at, status, max_questions, rsvp_count, advisor_id, professionals(id, name, slug, type, firm_name, headshot_url)",
    )
    .eq("is_published", true)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (statusParam && VALID_STATUSES.has(statusParam)) {
    query = query.eq("status", statusParam);
  } else {
    query = query.in("status", ["upcoming", "live", "transcript"]);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json(
    { sessions: data ?? [] },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
}
