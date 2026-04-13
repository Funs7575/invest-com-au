import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";

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
export async function GET(req: Request) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  const results: Record<string, number> = {};

  try {
    // 1. Clean rate limits older than 1 hour
    const { count: rateLimitCount } = await supabase
      .from("rate_limits")
      .delete({ count: "exact" })
      .lt("window_start", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    results.rate_limits_purged = rateLimitCount || 0;
  } catch (e) {
    log.error("Rate limit cleanup error", { error: e instanceof Error ? e.message : String(e) });
  }

  try {
    // 2. Clean analytics events older than 90 days
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: analyticsCount } = await supabase
      .from("analytics_events")
      .delete({ count: "exact" })
      .lt("created_at", cutoff90);
    results.analytics_events_purged = analyticsCount || 0;
  } catch (e) {
    log.error("Analytics cleanup error", { error: e instanceof Error ? e.message : String(e) });
  }

  try {
    // 3. Clean expired advisor auth tokens (older than 1 day)
    const { count: tokenCount } = await supabase
      .from("advisor_auth_tokens")
      .delete({ count: "exact" })
      .lt("expires_at", new Date().toISOString());
    results.expired_tokens_purged = tokenCount || 0;
  } catch (e) {
    log.error("Token cleanup error", { error: e instanceof Error ? e.message : String(e) });
  }

  try {
    // 4. Clean expired advisor sessions (older than 30 days)
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: sessionCount } = await supabase
      .from("advisor_sessions")
      .delete({ count: "exact" })
      .lt("created_at", cutoff30);
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
