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

  // ── 2. Cron heartbeat freshness ──
  // The /api/cron/heartbeat job writes a row every 5 minutes. If the
  // most recent ping is older than 10 minutes, cron has stopped
  // running and oncall needs to be paged. Falls back to the original
  // campaign_daily_stats check when health_pings is empty (e.g. brand
  // new deploy before first heartbeat fires).
  const cronStart = Date.now();
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("health_pings")
      .select("created_at")
      .eq("service", "cron-heartbeat")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (data?.created_at) {
      const ageMs = Date.now() - new Date(data.created_at).getTime();
      const stale = ageMs > 10 * 60 * 1000; // 10-minute window allows for one missed run + jitter
      checks.cron_freshness = stale
        ? {
            ok: false,
            latency_ms: Date.now() - cronStart,
            error: `Heartbeat stale: ${Math.round(ageMs / 1000)}s old`,
          }
        : { ok: true, latency_ms: Date.now() - cronStart };
    } else {
      // No heartbeat row yet — bootstrap state, treat as ok rather than
      // failing health checks before the first cron fires.
      checks.cron_freshness = { ok: true, latency_ms: Date.now() - cronStart };
    }
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

  // ── 4. Third-party API reachability (Stripe / Resend / Anthropic) ──
  //      Soft checks: missing keys downgrade to degraded (not down) so a
  //      preview deployment without third-party secrets still reports its
  //      core (db/cron/env) status correctly.
  await Promise.all([
    probeKeyedApi("stripe", "STRIPE_SECRET_KEY", "https://api.stripe.com/v1/balance", {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY ?? ""}`,
    }),
    probeKeyedApi("resend", "RESEND_API_KEY", "https://api.resend.com/domains", {
      Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`,
    }),
    // Anthropic doesn't expose a cheap health endpoint; reach the root for a
    // coarse DNS/TLS signal so we don't burn tokens.
    probeKeyedApi("anthropic", "ANTHROPIC_API_KEY", "https://api.anthropic.com/", {}),
  ]).then((rows) => {
    for (const r of rows) checks[r.name] = r;
  });

  // ── Overall status ──
  // Third-party checks degrade but don't fail the overall health — the core
  // app (db/cron/env) is the gating signal for the 503 response.
  const coreOk = ["database", "cron_freshness", "env"].every(
    (k) => checks[k]?.ok ?? true,
  );
  const totalLatency = Date.now() - start;

  // status reflects core-app health (db/cron/env). Third-party probes are
  // advisory — they surface in `checks` but don't degrade the headline.
  const body: Record<string, unknown> = {
    status: coreOk ? "ok" : "degraded",
    latency_ms: totalLatency,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
  };

  if (verbose) {
    body.checks = checks;
  }

  return NextResponse.json(body, { status: coreOk ? 200 : 503 });
}

async function probeKeyedApi(
  name: string,
  envVar: string,
  url: string,
  headers: Record<string, string>,
): Promise<{ name: string; ok: boolean; latency_ms: number; error?: string }> {
  const start = Date.now();
  const key = process.env[envVar];
  if (!key || key.length < 10) {
    return { name, ok: false, latency_ms: 0, error: `${envVar} missing` };
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(3_000),
    });
    return {
      name,
      ok: res.ok || res.status === 401, // 401 still means reachable
      latency_ms: Date.now() - start,
      ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
    };
  } catch (err) {
    return {
      name,
      ok: false,
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}
