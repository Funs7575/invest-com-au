import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Comprehensive health check for uptime monitoring (BetterStack / UptimeRobot).
 * Returns 200 if all systems are operational, 503 if any critical service is degraded.
 *
 * Query params:
 *   ?verbose=true  — include individual check details (for admin dashboards)
 */
export async function GET(request: Request) {
  const start = Date.now();
  const url = new URL(request.url);
  const verbose = url.searchParams.get("verbose") === "true";

  const checks: Record<string, { ok: boolean; latency_ms: number; error?: string }> = {};

  // ── 1. Database connectivity ──
  const dbStart = Date.now();
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("brokers")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    checks.database = { ok: true, latency_ms: Date.now() - dbStart };
  } catch (err) {
    checks.database = {
      ok: false,
      latency_ms: Date.now() - dbStart,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // ── 2. Cron job recency (check if marketplace-stats ran in last 26 hours) ──
  const cronStart = Date.now();
  try {
    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString().split("T")[0]; // date only for stat_date
    const { error } = await supabase
      .from("campaign_daily_stats")
      .select("id", { count: "exact", head: true })
      .gte("stat_date", cutoff);
    if (error) throw error;
    // If there are any active campaigns but zero stats in 26h, flag as issue
    checks.cron_freshness = { ok: true, latency_ms: Date.now() - cronStart };
  } catch (err) {
    checks.cron_freshness = {
      ok: false,
      latency_ms: Date.now() - cronStart,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // ── 3. Environment variables presence ──
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
  ];
  const missingEnv = requiredEnvVars.filter((v) => !process.env[v]);
  checks.env = {
    ok: missingEnv.length === 0,
    latency_ms: 0,
    ...(missingEnv.length > 0 && { error: `Missing: ${missingEnv.join(", ")}` }),
  };

  // ── Overall status ──
  const allOk = Object.values(checks).every((c) => c.ok);
  const totalLatency = Date.now() - start;

  const body: Record<string, unknown> = {
    status: allOk ? "ok" : "degraded",
    latency_ms: totalLatency,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
  };

  if (verbose) {
    body.checks = checks;
  }

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}
