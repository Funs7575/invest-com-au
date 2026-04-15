import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";
import { FEATURE_CONFIG } from "@/lib/admin/automation-metrics";
import { getSiteUrl } from "@/lib/url";

const log = logger("admin:automation:trigger");

// Allowlist of cron names that can be triggered from the admin dashboard.
// Prevents abuse of the trigger endpoint to hit arbitrary cron routes.
const ALLOWED_CRONS = new Set(
  Object.values(FEATURE_CONFIG)
    .map((f) => f.cronName)
    .filter((c): c is string => c !== null),
);

/**
 * POST /api/admin/automation/trigger
 *
 * Manually fires a cron from the admin automation dashboard. Admin-auth
 * gated. Forwards to the actual cron route with the CRON_SECRET bearer
 * token so the browser never sees the secret.
 *
 * Body: { cron: string }
 * Returns: { ok, status, summary }
 */
export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const cronName = typeof body.cron === "string" ? body.cron : null;
  if (!cronName) {
    return NextResponse.json({ error: "Missing cron name" }, { status: 400 });
  }

  if (!ALLOWED_CRONS.has(cronName)) {
    return NextResponse.json(
      { error: `Cron '${cronName}' not on the allowlist. Known crons: ${Array.from(ALLOWED_CRONS).join(", ")}` },
      { status: 400 },
    );
  }

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 },
    );
  }

  // ── Forward the request ─────────────────────────────────────
  const url = `${getSiteUrl()}/api/cron/${cronName}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        // Mark the run as admin-manual so the dashboard can distinguish
        // it from scheduled Vercel cron executions.
        "X-Admin-Manual": "1",
        "X-Admin-Email": user.email,
      },
      signal: AbortSignal.timeout(120_000),
    });
    const data = await res.json().catch(() => ({}));

    log.info("Admin triggered cron", {
      cronName,
      adminEmail: user.email,
      status: res.status,
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          error: data?.error || `HTTP ${res.status}`,
        },
        { status: 502 },
      );
    }

    // Build a human-readable summary from the cron's response
    const stats: Record<string, unknown> = data && typeof data === "object" ? data : {};
    const summary = Object.entries(stats)
      .filter(([k, v]) => k !== "ok" && typeof v === "number" && (v as number) > 0)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ") || "completed";

    return NextResponse.json({ ok: true, status: res.status, summary, data: stats });
  } catch (err) {
    log.error("Admin trigger failed", {
      cronName,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "trigger_failed" },
      { status: 500 },
    );
  }
}
