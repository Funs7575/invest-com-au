import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("cron-cleanup");

export const runtime = "edge";
export const maxDuration = 30;

/**
 * GET /api/cron/cleanup
 * Runs daily. Purges stale data to prevent table bloat:
 * 1. Rate limit entries older than 1 hour
 * 2. Analytics events older than 90 days
 * 3. Expired advisor auth tokens
 * 4. Expired session data
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: Record<string, number> = {};

  try {
    // 1. Clean rate limits older than 1 hour
    const { count: rateLimitCount } = await supabase
      .from("rate_limits")
      .delete()
      .lt("window_start", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .select("id", { count: "exact", head: true });
    results.rate_limits_purged = rateLimitCount || 0;
  } catch (e) {
    log.error("Rate limit cleanup error", { error: e instanceof Error ? e.message : String(e) });
  }

  try {
    // 2. Clean analytics events older than 90 days
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: analyticsCount } = await supabase
      .from("analytics_events")
      .delete()
      .lt("created_at", cutoff90)
      .select("id", { count: "exact", head: true });
    results.analytics_events_purged = analyticsCount || 0;
  } catch (e) {
    log.error("Analytics cleanup error", { error: e instanceof Error ? e.message : String(e) });
  }

  try {
    // 3. Clean expired advisor auth tokens (older than 1 day)
    const { count: tokenCount } = await supabase
      .from("advisor_auth_tokens")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id", { count: "exact", head: true });
    results.expired_tokens_purged = tokenCount || 0;
  } catch (e) {
    log.error("Token cleanup error", { error: e instanceof Error ? e.message : String(e) });
  }

  try {
    // 4. Clean expired advisor sessions (older than 30 days)
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: sessionCount } = await supabase
      .from("advisor_sessions")
      .delete()
      .lt("created_at", cutoff30)
      .select("id", { count: "exact", head: true });
    results.expired_sessions_purged = sessionCount || 0;
  } catch (e) {
    log.error("Session cleanup error", { error: e instanceof Error ? e.message : String(e) });
  }

  log.info("Cleanup complete", results);

  return NextResponse.json({
    ok: true,
    ...results,
  });
}
