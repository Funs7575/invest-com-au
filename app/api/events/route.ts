import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("api-events-public");

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const limited = await isRateLimited(`public-events-${ip}`, 60, 1);
  if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get("event_type");
  const state = searchParams.get("state");

  const supabase = await createClient();

  let query = supabase
    .from("advisor_events")
    .select(
      "*, professional:professionals(id, name, firm_name, slug, photo_url, location_state)"
    )
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);

  if (eventType) {
    query = query.eq("event_type", eventType);
  }

  if (state) {
    query = query.eq("professional.location_state", state);
  }

  const { data: events, error } = await query;

  if (error) {
    log.error("Failed to fetch public events", { error: error.message });
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }

  return NextResponse.json({ events: events ?? [] });
}
