import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { CRON_GROUPS } from "@/lib/cron-groups";
import { SITE_URL } from "@/lib/seo";

const log = logger("cron:cron-health-alert");

export const maxDuration = 60;

/**
 * Cron health alert.
 *
 * Runs hourly. Scans the cron_run_log for any cron endpoint that has
 * NOT had a successful run within its expected cadence. Sends a
 * single digest email to OPS_ALERT_EMAIL (or falls back to
 * SUPPORT_EMAIL) summarising the stale/failing endpoints.
 *
 * Only emits one alert per endpoint per 6 hours (via
 * cron_health_alerts table) to avoid paging fatigue.
 */

const STALE_HOURS_BY_CADENCE: Record<string, number> = {
  hourly: 3,
  daily: 30,
  weekly: 24 * 9,
  monthly: 24 * 35,
};

const ALERT_DEDUP_HOURS = 6;

function cadenceFor(group: string): keyof typeof STALE_HOURS_BY_CADENCE {
  if (group.startsWith("every-") || group.startsWith("hourly")) return "hourly";
  if (group.startsWith("daily")) return "daily";
  if (group.startsWith("weekly")) return "weekly";
  if (group.startsWith("monthly")) return "monthly";
  return "daily";
}

function cadenceRank(c: string): number {
  return { hourly: 0, daily: 1, weekly: 2, monthly: 3 }[c] ?? 1;
}

interface EndpointExpectation {
  endpoint: string;
  cadence: string;
  staleHours: number;
}

function enumerate(): EndpointExpectation[] {
  const seen = new Map<string, string>();
  for (const [group, endpoints] of Object.entries(CRON_GROUPS)) {
    const cadence = cadenceFor(group);
    for (const endpoint of endpoints) {
      const existing = seen.get(endpoint);
      if (!existing || cadenceRank(cadence) < cadenceRank(existing)) {
        seen.set(endpoint, cadence);
      }
    }
  }
  return Array.from(seen.entries()).map(([endpoint, cadence]) => ({
    endpoint,
    cadence,
    staleHours: STALE_HOURS_BY_CADENCE[cadence] ?? STALE_HOURS_BY_CADENCE.daily!,
  }));
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const endpoints = enumerate();
  const now = Date.now();

  // One-shot batched query: last success per endpoint in the window.
  const oldestWindow = Math.max(
    ...endpoints.map((e) => e.staleHours * 3600_000),
  );
  const windowStart = new Date(now - oldestWindow * 1.5).toISOString();

  const { data: runs } = await supabase
    .from("cron_run_log")
    .select("name, started_at, status")
    .gte("started_at", windowStart)
    .order("started_at", { ascending: false })
    .limit(10000);

  const lastSuccessByName = new Map<string, number>();
  const lastErrorByName = new Map<string, number>();
  for (const r of (runs ?? []) as {
    name: string;
    started_at: string;
    status: string;
  }[]) {
    const ms = new Date(r.started_at).getTime();
    if (r.status === "success" && !lastSuccessByName.has(r.name)) {
      lastSuccessByName.set(r.name, ms);
    }
    if (r.status === "error" && !lastErrorByName.has(r.name)) {
      lastErrorByName.set(r.name, ms);
    }
  }

  const problems: Array<{
    endpoint: string;
    cadence: string;
    lastSuccess: number | null;
    lastError: number | null;
    kind: "stale" | "failing" | "never-run";
  }> = [];

  for (const e of endpoints) {
    const success = lastSuccessByName.get(e.endpoint) ?? null;
    const error = lastErrorByName.get(e.endpoint) ?? null;
    const staleMs = e.staleHours * 3600_000;
    if (!success && !error) {
      problems.push({
        endpoint: e.endpoint,
        cadence: e.cadence,
        lastSuccess: null,
        lastError: null,
        kind: "never-run",
      });
    } else if (!success && error) {
      problems.push({
        endpoint: e.endpoint,
        cadence: e.cadence,
        lastSuccess: null,
        lastError: error,
        kind: "failing",
      });
    } else if (success && now - success > staleMs) {
      problems.push({
        endpoint: e.endpoint,
        cadence: e.cadence,
        lastSuccess: success,
        lastError: error,
        kind: "stale",
      });
    }
  }

  if (problems.length === 0) {
    return NextResponse.json({ ok: true, alerts: 0, healthy: endpoints.length });
  }

  // Dedup: skip endpoints we've alerted on in the last N hours.
  const dedupCutoff = new Date(
    now - ALERT_DEDUP_HOURS * 3600_000,
  ).toISOString();
  const endpointList = problems.map((p) => p.endpoint);
  const { data: recentAlerts } = await supabase
    .from("cron_health_alerts")
    .select("endpoint")
    .in("endpoint", endpointList)
    .gte("alerted_at", dedupCutoff);
  const recentlyAlerted = new Set(
    (recentAlerts ?? []).map((r) => r.endpoint as string),
  );
  const toAlert = problems.filter((p) => !recentlyAlerted.has(p.endpoint));

  if (toAlert.length === 0) {
    return NextResponse.json({
      ok: true,
      alerts: 0,
      skipped_dedup: problems.length,
    });
  }

  const ops = process.env.OPS_ALERT_EMAIL || process.env.SUPPORT_EMAIL;
  if (ops) {
    const html = renderAlertEmail(toAlert);
    await sendEmail({
      to: ops,
      subject: `⚠️ Cron health: ${toAlert.length} job(s) need attention`,
      html,
    });
  } else {
    log.warn("no OPS_ALERT_EMAIL/SUPPORT_EMAIL set — alert skipped", {
      count: toAlert.length,
    });
  }

  await supabase.from("cron_health_alerts").insert(
    toAlert.map((p) => ({
      endpoint: p.endpoint,
      kind: p.kind,
      cadence: p.cadence,
    })),
  );

  return NextResponse.json({
    ok: true,
    alerts: toAlert.length,
    skipped_dedup: problems.length - toAlert.length,
  });
}

function renderAlertEmail(
  problems: Array<{
    endpoint: string;
    cadence: string;
    lastSuccess: number | null;
    lastError: number | null;
    kind: "stale" | "failing" | "never-run";
  }>,
): string {
  const rows = problems
    .map((p) => {
      const last = p.lastSuccess
        ? new Date(p.lastSuccess).toISOString()
        : "never";
      return `<tr>
        <td style="padding:6px 10px;font-family:monospace;font-size:12px;">${p.endpoint}</td>
        <td style="padding:6px 10px;">${p.kind}</td>
        <td style="padding:6px 10px;">${p.cadence}</td>
        <td style="padding:6px 10px;color:#64748b;">${last}</td>
      </tr>`;
    })
    .join("");
  return `<!DOCTYPE html>
<html>
  <body style="font-family:-apple-system,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
      <h1 style="font-size:18px;color:#0f172a;margin:0 0 12px;">⚠️ Cron health alert</h1>
      <p style="font-size:13px;color:#334155;margin:0 0 16px;">
        ${problems.length} cron endpoint(s) haven't had a successful run within their expected cadence. Review the full dashboard for context and triage.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin:0 0 20px;">
        <thead>
          <tr style="background:#f1f5f9;text-align:left;">
            <th style="padding:8px 10px;">Endpoint</th>
            <th style="padding:8px 10px;">Kind</th>
            <th style="padding:8px 10px;">Cadence</th>
            <th style="padding:8px 10px;">Last success</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p>
        <a href="${SITE_URL}/admin/automation/cron-health"
           style="display:inline-block;background:#f59e0b;color:white;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;">
          Open cron health dashboard
        </a>
      </p>
      <p style="font-size:11px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px;">
        You'll only get one alert per endpoint every ${ALERT_DEDUP_HOURS}h to avoid paging fatigue.
      </p>
    </div>
  </body>
</html>`;
}
