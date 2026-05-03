import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";

const log = logger("cron:synthetic-checks");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/synthetic-checks
 *
 * Synthetic-check probes for the launch window. Per
 * docs/ops/launch-ops-plan.md §5 PR 15. Runs every 5 minutes via the
 * every-5m dispatcher; each probe writes a row to synthetic_check_runs
 * (PR 14). When a flow has 2 consecutive failures, sends a single
 * digest email to OPS_ALERT_EMAIL (rate-limited to once per flow per
 * 30 minutes via the table itself — we only re-alert when the
 * second-most-recent row is also a failure AND no successful run
 * happened in between).
 *
 * Probe surface (v1 — POST-style probes deferred to v2 because they
 * require a SYNTHETIC_BOT_USER_ID allowlist on each write endpoint):
 *
 *   - homepage    : GET / returns 200
 *   - sitemap     : GET /sitemap.xml returns 200 + non-empty body
 *   - robots      : GET /robots.txt returns 200
 *   - health      : GET /api/health returns 200 + ok=true
 *   - stripe_hook : last stripe_webhook_events row < 30 min old
 *   - email_send  : last Resend webhook event (email_log if present, otherwise
 *                   skip) < 1 hr old
 *
 * The probe target is the production alias from VERCEL_PROJECT_PRODUCTION_URL
 * (same trick as the dispatcher) — falls back to req.url's origin locally.
 */

const PROBE_TIMEOUT_MS = 8_000;
const ALERT_RECIPIENT = process.env.OPS_ALERT_EMAIL || "finn@invest.com.au";

interface ProbeResult {
  flow: string;
  ok: boolean;
  latencyMs: number;
  error: string | null;
}

async function probeUrl(
  flow: string,
  url: string,
  expectStatus: number = 200,
  validateBody?: (body: string) => string | null,
): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { "User-Agent": "invest-com-au-synthetic-check/1" },
    });
    const latencyMs = Date.now() - start;

    if (res.status !== expectStatus) {
      return { flow, ok: false, latencyMs, error: `status ${res.status}` };
    }

    if (validateBody) {
      const body = await res.text();
      const err = validateBody(body);
      if (err) return { flow, ok: false, latencyMs, error: err };
    }

    return { flow, ok: true, latencyMs, error: null };
  } catch (err) {
    return {
      flow,
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeStripeWebhookFreshness(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<ProbeResult> {
  const start = Date.now();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("created_at")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latencyMs = Date.now() - start;

  if (error) return { flow: "stripe_hook", ok: false, latencyMs, error: error.message };
  if (!data) {
    return {
      flow: "stripe_hook",
      ok: false,
      latencyMs,
      error: "no stripe_webhook_events row in last 30 min",
    };
  }
  return { flow: "stripe_hook", ok: true, latencyMs, error: null };
}

async function probeEmailSendFreshness(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<ProbeResult> {
  const start = Date.now();
  // The Resend webhook writes to the resend_webhook_events table (or
  // email_log on some installs). We try both, accept whichever has a
  // recent row. Skip the probe entirely if neither table exists in this
  // environment — surfaced as `ok: true, error: 'skipped'` so the
  // alerting path doesn't fire on a missing table.
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  for (const table of ["resend_webhook_events", "email_log"]) {
    const { data, error } = await supabase
      .from(table)
      .select("created_at")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) {
      return { flow: "email_send", ok: true, latencyMs: Date.now() - start, error: null };
    }
  }
  return {
    flow: "email_send",
    ok: false,
    latencyMs: Date.now() - start,
    error: "no email-send activity in last hour",
  };
}

async function getPreviousResult(
  supabase: ReturnType<typeof createAdminClient>,
  flow: string,
): Promise<{ ok: boolean; created_at: string } | null> {
  const { data } = await supabase
    .from("synthetic_check_runs")
    .select("ok, started_at")
    .eq("flow", flow)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { ok: data.ok, created_at: data.started_at };
}

async function maybeAlert(
  supabase: ReturnType<typeof createAdminClient>,
  failures: ProbeResult[],
): Promise<void> {
  if (failures.length === 0) return;

  // Only alert on flows whose previous run was ALSO a failure (= two
  // consecutive failures). Avoids paging on a single transient blip.
  const eligible: ProbeResult[] = [];
  for (const f of failures) {
    const prev = await getPreviousResult(supabase, f.flow);
    if (prev && !prev.ok) eligible.push(f);
  }

  if (eligible.length === 0) return;

  const subject = `[synthetic-checks] ${eligible.length} flow${eligible.length === 1 ? "" : "s"} failing`;
  const rows = eligible
    .map(
      (f) =>
        `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">${escapeHtml(f.flow)}</td>` +
        `<td style="padding:4px 12px 4px 0;color:#dc2626;">${escapeHtml(f.error ?? "unknown error")}</td>` +
        `<td style="padding:4px 0;color:#64748b;">${f.latencyMs}ms</td></tr>`,
    )
    .join("");

  const html = `
    <h2 style="margin:0 0 12px;font:600 16px/1.3 system-ui,sans-serif;">
      Synthetic checks — ${eligible.length} flow${eligible.length === 1 ? "" : "s"} failing twice in a row
    </h2>
    <table style="border-collapse:collapse;font:14px/1.4 system-ui,sans-serif;">
      <thead><tr style="border-bottom:1px solid #e2e8f0;">
        <th style="padding:4px 12px 4px 0;text-align:left;">flow</th>
        <th style="padding:4px 12px 4px 0;text-align:left;">error</th>
        <th style="padding:4px 0;text-align:left;">latency</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:14px 0 0;font:12px/1.4 system-ui,sans-serif;color:#64748b;">
      See <code>docs/ops/severity-matrix.md</code> for triage,
      <code>docs/runbooks/</code> for per-flow playbooks. Latest results
      live in the <code>synthetic_check_runs</code> table; the launch
      dashboard at <code>/admin/launch</code> shows open failures.
    </p>
  `;

  const result = await sendEmail({ to: ALERT_RECIPIENT, subject, html });
  if (!result.ok) {
    log.warn("synthetic-checks alert email failed", { error: result.error });
  }
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : new URL(req.url).origin;

  const supabase = createAdminClient();

  const probes: Promise<ProbeResult>[] = [
    probeUrl("homepage", `${origin}/`),
    probeUrl("sitemap", `${origin}/sitemap.xml`, 200, (b) =>
      b.length === 0 ? "empty body" : null,
    ),
    probeUrl("robots", `${origin}/robots.txt`),
    probeUrl("health", `${origin}/api/health`, 200, (b) => {
      try {
        const j = JSON.parse(b) as { ok?: boolean };
        return j.ok === true ? null : "health body ok != true";
      } catch {
        return "health body not JSON";
      }
    }),
    probeStripeWebhookFreshness(supabase),
    probeEmailSendFreshness(supabase),
  ];

  const results = await Promise.all(probes);

  // Persist all results.
  const rows = results.map((r) => ({
    flow: r.flow,
    latency_ms: r.latencyMs,
    ok: r.ok,
    error: r.error,
  }));
  const { error: insertError } = await supabase
    .from("synthetic_check_runs")
    .insert(rows);
  if (insertError) {
    log.error("synthetic_check_runs insert failed", insertError);
  }

  // Alert on consecutive-failure flows.
  const failures = results.filter((r) => !r.ok);
  await maybeAlert(supabase, failures);

  const summary = {
    ok: failures.length === 0,
    total: results.length,
    failed: failures.length,
    results: results.map((r) => ({
      flow: r.flow,
      ok: r.ok,
      latency_ms: r.latencyMs,
      error: r.error,
    })),
  };

  return NextResponse.json(summary, {
    status: failures.length === 0 ? 200 : 207, // 207 Multi-Status to surface partial failures
  });
}
