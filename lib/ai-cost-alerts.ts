/**
 * 80%-of-cap warning emails for V-NEW-06.
 *
 * Fire-and-forget — the AI route doesn't await the alert send so
 * a Resend hiccup never blocks the user response. The DB row's
 * `alerted_80_at` column is set at increment time so a second
 * crossing on the same row in the same day is suppressed.
 */

import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/resend";

const log = logger("ai-cost-alerts");

interface AlertArgs {
  routeLabel: string;
  subjectId: string;
  subjectType: "public_session" | "admin_user";
  newSubjectMicros: number;
  capMicros: number;
}

/**
 * Send a one-shot 80% warning to OPS_ALERT_EMAIL. Returns the
 * Resend verdict; caller may log but should not propagate failures.
 */
export async function sendCap80Alert(
  args: AlertArgs,
): Promise<{ ok: boolean; error?: string }> {
  const ops = process.env.OPS_ALERT_EMAIL || process.env.SUPPORT_EMAIL;
  if (!ops) {
    log.warn("no OPS_ALERT_EMAIL/SUPPORT_EMAIL set — 80% alert skipped", {
      route: args.routeLabel,
    });
    return { ok: false, error: "no_recipient" };
  }
  const usedUsd = (args.newSubjectMicros / 1_000_000).toFixed(2);
  const capUsd = (args.capMicros / 1_000_000).toFixed(2);
  const pct = Math.min(
    100,
    Math.round((args.newSubjectMicros / Math.max(1, args.capMicros)) * 100),
  );

  // Subject IDs are opaque — for public_session these are an IP
  // hash, for admin_user a lowercased email. We surface the email
  // directly since ops alerts are internal; the IP key is shown
  // truncated since it's a 40-byte hash.
  const subjectDisplay =
    args.subjectType === "admin_user"
      ? args.subjectId
      : `session ${args.subjectId.slice(0, 12)}…`;

  const html = `
    <h2>AI cost cap — 80% reached</h2>
    <p><strong>Surface:</strong> ${escapeHtml(args.routeLabel)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(subjectDisplay)}</p>
    <p><strong>Today:</strong> $${usedUsd} of $${capUsd} (${pct}%).</p>
    <p>Cap resets at 00:00 UTC. Hit 100% and the request returns 429.</p>
    <p style="color:#666;font-size:12px">Source: V-NEW-06 (lib/ai-cost-alerts.ts).</p>
  `;
  return sendEmail({
    to: ops,
    subject: `⚠️ AI cap 80% — ${args.routeLabel} — ${subjectDisplay}`,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
