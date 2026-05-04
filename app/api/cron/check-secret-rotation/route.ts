import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { ADMIN_EMAIL } from "@/lib/admin";

const log = logger("cron:check-secret-rotation");

export const maxDuration = 30;

/**
 * Weekly cron — checks that production secrets are within their rotation window.
 *
 * Callers record the rotation date by setting an env var named
 * {SECRET_NAME}_ROTATED_AT (ISO 8601 date, e.g. "2026-01-15"). If the
 * env var is absent the secret is treated as untracked and flagged.
 *
 * Rotation windows (from docs/runbooks/secret-rotation.md):
 *   CRON_SECRET / INTERNAL_API_KEY / REVALIDATE_SECRET — 90 days
 *   SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY         — 180 days
 *   STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET          — 365 days
 *
 * Alerts are sent 14 days before expiry and when overdue. Only sends
 * an email when there is something to report — no email = all clear.
 *
 * Vercel cron schedule: '0 9 * * 1' (Monday 09:00 UTC)
 */

interface SecretSpec {
  name: string;
  envVar: string;
  windowDays: number;
}

const SECRETS: SecretSpec[] = [
  { name: "CRON_SECRET", envVar: "CRON_SECRET", windowDays: 90 },
  { name: "INTERNAL_API_KEY", envVar: "INTERNAL_API_KEY", windowDays: 90 },
  { name: "REVALIDATE_SECRET", envVar: "REVALIDATE_SECRET", windowDays: 90 },
  { name: "SUPABASE_SERVICE_ROLE_KEY", envVar: "SUPABASE_SERVICE_ROLE_KEY", windowDays: 180 },
  { name: "RESEND_API_KEY", envVar: "RESEND_API_KEY", windowDays: 180 },
  { name: "STRIPE_SECRET_KEY", envVar: "STRIPE_SECRET_KEY", windowDays: 365 },
  { name: "STRIPE_WEBHOOK_SECRET", envVar: "STRIPE_WEBHOOK_SECRET", windowDays: 365 },
];

const ALERT_LEAD_DAYS = 14;

interface SecretStatus {
  name: string;
  rotatedAt: string | null;
  daysSinceRotation: number | null;
  windowDays: number;
  daysUntilExpiry: number | null;
  status: "ok" | "due-soon" | "overdue" | "untracked";
}

function checkSecret(spec: SecretSpec, now: Date): SecretStatus {
  const rotatedAtStr = process.env[`${spec.envVar}_ROTATED_AT`] ?? null;
  if (!rotatedAtStr) {
    return {
      name: spec.name,
      rotatedAt: null,
      daysSinceRotation: null,
      windowDays: spec.windowDays,
      daysUntilExpiry: null,
      status: "untracked",
    };
  }

  const rotatedAt = new Date(rotatedAtStr);
  if (isNaN(rotatedAt.getTime())) {
    return {
      name: spec.name,
      rotatedAt: rotatedAtStr,
      daysSinceRotation: null,
      windowDays: spec.windowDays,
      daysUntilExpiry: null,
      status: "untracked",
    };
  }

  const daysSince = Math.floor((now.getTime() - rotatedAt.getTime()) / 86400000);
  const daysUntilExpiry = spec.windowDays - daysSince;

  let status: SecretStatus["status"] = "ok";
  if (daysUntilExpiry < 0) {
    status = "overdue";
  } else if (daysUntilExpiry <= ALERT_LEAD_DAYS) {
    status = "due-soon";
  }

  return {
    name: spec.name,
    rotatedAt: rotatedAtStr,
    daysSinceRotation: daysSince,
    windowDays: spec.windowDays,
    daysUntilExpiry,
    status,
  };
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const now = new Date();
  const statuses = SECRETS.map((s) => checkSecret(s, now));

  const needsAction = statuses.filter(
    (s) => s.status === "overdue" || s.status === "due-soon" || s.status === "untracked",
  );

  log.info("secret_rotation_check", {
    total: statuses.length,
    ok: statuses.filter((s) => s.status === "ok").length,
    needsAction: needsAction.length,
  });

  if (needsAction.length === 0) {
    return NextResponse.json({ ok: true, message: "All secrets within rotation window" });
  }

  const alertTo = process.env.OPS_ALERT_EMAIL || ADMIN_EMAIL;

  const rows = needsAction
    .map((s) => {
      const badge =
        s.status === "overdue"
          ? "🔴 OVERDUE"
          : s.status === "due-soon"
            ? "🟡 DUE SOON"
            : "⚪ UNTRACKED";
      const detail =
        s.status === "untracked"
          ? `Set <code>${s.envVar}_ROTATED_AT</code> in Vercel env vars after rotation`
          : s.status === "overdue"
            ? `Rotated ${s.daysSinceRotation}d ago — ${Math.abs(s.daysUntilExpiry ?? 0)}d overdue (window: ${s.windowDays}d)`
            : `Rotated ${s.daysSinceRotation}d ago — ${s.daysUntilExpiry}d remaining (window: ${s.windowDays}d)`;
      return `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:13px">${s.name}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:13px">${badge}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:12px">${detail}</td></tr>`;
    })
    .join("\n");

  const html = `
    <div style="font-family:'Inter',system-ui,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0f172a;padding:16px 24px;border-radius:12px 12px 0 0">
        <span style="color:#f59e0b;font-weight:800;font-size:14px">Invest.com.au</span>
        <span style="color:#94a3b8;font-size:12px"> · Secret Rotation Alert</span>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
        <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">${needsAction.length} secret${needsAction.length > 1 ? "s" : ""} need attention</h2>
        <p style="margin:0 0 16px;font-size:13px;color:#475569">Checked ${now.toISOString().split("T")[0]}. See <code>docs/runbooks/secret-rotation.md</code> for rotation procedure.</p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:8px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0">Secret</th>
              <th style="padding:8px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0">Status</th>
              <th style="padding:8px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0">Detail</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Record rotation date by setting <code>{SECRET}_ROTATED_AT=YYYY-MM-DD</code> in Vercel env vars.</p>
      </div>
    </div>`;

  await sendEmail({
    to: alertTo,
    subject: `[Action Required] ${needsAction.length} secret${needsAction.length > 1 ? "s" : ""} need rotation — Invest.com.au`,
    html,
  });

  return NextResponse.json({
    ok: true,
    alerted: needsAction.length,
    statuses: needsAction,
  });
}
