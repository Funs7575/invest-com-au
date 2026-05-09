import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { sendEmail } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { escapeHtml } from "@/lib/html-escape";

export const runtime = "nodejs";

const log = logger("bug-report");

const ALERT_RECIPIENT = "finn@invest.com.au";

/**
 * POST /api/bug-report
 *
 * Backs the sitewide "Report a problem" button (PR 6 of launch-ops-plan.md).
 * Stores the row in `bug_reports` (PR 4 migration) via the service-role
 * client and emails an alert to the founder so triage can happen from the
 * inbox instead of the admin UI.
 *
 * Per `docs/ops/launch-ops-plan.md` decision #2, alerts go to a single
 * founder address — no Slack v1.
 *
 * Rate limit: 5/min per IP via `lib/rate-limit-db`. Generous enough that an
 * honest user submitting a couple of follow-up reports isn't blocked, tight
 * enough to blunt a synthetic flood.
 */

const Body = z.object({
  page_url: z.string().url().max(2048),
  route: z.string().max(512).optional(),
  user_message: z.string().min(1).max(4000),
  // Optional contact: accept empty string OR a valid email.
  email: z
    .union([z.literal(""), z.string().email().max(320)])
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  user_agent: z.string().max(1024).optional(),
  viewport: z
    .string()
    .regex(/^\d{1,5}x\d{1,5}$/)
    .optional(),
  severity_guess: z.enum(["P0", "P1", "P2", "P3"]).optional(),
});

export const POST = withValidatedBody(Body, async (req: NextRequest, body) => {
  const ip = ipKey(req);

  if (!(await isAllowed("bug_report", ip, { max: 5, refillPerSec: 5 / 60 }))) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bug_reports")
    .insert({
      page_url: body.page_url,
      route: body.route ?? null,
      user_message: body.user_message,
      email: body.email,
      user_agent: body.user_agent ?? req.headers.get("user-agent") ?? null,
      viewport: body.viewport ?? null,
      severity_guess: body.severity_guess ?? null,
      // user_id is intentionally omitted v1 — anonymous-only intake.
      // We can wire auth.uid() in once the founder confirms the dedup
      // behaviour they want for logged-in submitters.
    })
    .select("id, created_at")
    .single();

  if (error || !data) {
    log.error("bug_reports insert failed", {
      error: error?.message ?? "no row returned",
      page_url: body.page_url,
    });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // Fire-and-forget alert email. Resend helper is non-throwing; we surface
  // failures to the log only — the user-facing 200 should never be gated on
  // the alert succeeding.
  void sendAlertEmail({
    id: data.id,
    createdAt: data.created_at,
    pageUrl: body.page_url,
    route: body.route,
    userMessage: body.user_message,
    email: body.email,
    userAgent: body.user_agent ?? req.headers.get("user-agent") ?? null,
    viewport: body.viewport,
    severityGuess: body.severity_guess,
    ip,
  }).catch((err: unknown) => {
    log.warn("alert email send threw", {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
});

interface AlertPayload {
  id: string;
  createdAt: string;
  pageUrl: string;
  route?: string;
  userMessage: string;
  email: string | null;
  userAgent: string | null;
  viewport?: string;
  severityGuess?: string;
  ip: string;
}

async function sendAlertEmail(p: AlertPayload): Promise<void> {
  const subject = `[bug-report] ${p.severityGuess ?? "?"} — ${truncate(p.userMessage, 60)}`;
  const html = `
    <h2 style="margin:0 0 12px;font:600 16px/1.3 system-ui,sans-serif;">New bug report</h2>
    <table style="border-collapse:collapse;font:14px/1.4 system-ui,sans-serif;">
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">id</td><td><code>${escapeHtml(p.id)}</code></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">when</td><td>${escapeHtml(p.createdAt)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">page</td><td><a href="${escapeHtml(p.pageUrl)}">${escapeHtml(p.pageUrl)}</a></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">route</td><td>${escapeHtml(p.route ?? "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">severity hint</td><td>${escapeHtml(p.severityGuess ?? "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">reply-to</td><td>${escapeHtml(p.email ?? "(not provided)")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">viewport</td><td>${escapeHtml(p.viewport ?? "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">UA</td><td style="font-size:12px;color:#475569;">${escapeHtml(p.userAgent ?? "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b;">IP</td><td><code>${escapeHtml(p.ip)}</code></td></tr>
    </table>
    <h3 style="margin:18px 0 6px;font:600 14px/1.3 system-ui,sans-serif;">Message</h3>
    <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;padding:10px;border-radius:6px;font:13px/1.4 ui-monospace,monospace;">${escapeHtml(p.userMessage)}</pre>
    <p style="margin:14px 0 0;font:12px/1.4 system-ui,sans-serif;color:#64748b;">
      Triage at <a href="https://invest.com.au/admin/bug-reports">/admin/bug-reports</a>.
      Use a canned reply from <code>docs/ops/launch-canned-responses.md</code>.
    </p>
  `;

  const result = await sendEmail({
    to: ALERT_RECIPIENT,
    from: "Invest.com.au alerts <hello@invest.com.au>",
    subject,
    html,
  });

  if (!result.ok) {
    log.warn("alert email send failed", { error: result.error });
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

