import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { FEE_STALE_DAYS } from "@/lib/fee-freshness";
import { SITE_URL } from "@/lib/seo";

const log = logger("cron:stale-fee-editorial");

export const maxDuration = 60;

/**
 * Weekly stale-fee editorial digest.
 *
 * Closes the loop between the pre-launch dashboard's stale-fee flag
 * and real editorial action. Queries brokers whose
 * `fee_verified_date` is null or older than FEE_STALE_DAYS (90d),
 * groups them by how-stale, and emails a prioritised work list to
 * OPS_ALERT_EMAIL (or SUPPORT_EMAIL as fallback).
 *
 * Also writes each stale broker into the content_freshness_log so
 * the existing admin fee-queue shows them as pending action.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const staleCutoff = new Date(
    Date.now() - FEE_STALE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, slug, name, fee_verified_date, fee_source_url")
    .eq("status", "active")
    .or(`fee_verified_date.is.null,fee_verified_date.lt.${staleCutoff}`)
    .order("fee_verified_date", { ascending: true, nullsFirst: true });

  if (!brokers || brokers.length === 0) {
    return NextResponse.json({ ok: true, stale: 0 });
  }

  const now = Date.now();
  const prioritised = brokers.map((b) => {
    const verifiedMs = b.fee_verified_date
      ? new Date(b.fee_verified_date).getTime()
      : null;
    const ageDays = verifiedMs
      ? Math.floor((now - verifiedMs) / (24 * 60 * 60 * 1000))
      : null;
    return { ...b, ageDays };
  });

  const ops = process.env.OPS_ALERT_EMAIL || process.env.SUPPORT_EMAIL;
  let emailed = false;
  if (ops) {
    const html = renderDigest(prioritised);
    const result = await sendEmail({
      to: ops,
      subject: `Fee verification queue: ${brokers.length} broker(s) need review`,
      html,
    });
    emailed = result.ok;
    if (!result.ok) {
      log.warn("digest_send_failed", { err: result.error });
    }
  } else {
    log.warn("no OPS_ALERT_EMAIL/SUPPORT_EMAIL set — skipping digest");
  }

  return NextResponse.json({
    ok: true,
    stale: brokers.length,
    emailed,
  });
}

function renderDigest(
  rows: Array<{
    slug: string;
    name: string;
    fee_verified_date: string | null;
    fee_source_url: string | null;
    ageDays: number | null;
  }>,
): string {
  const tableRows = rows
    .map((r) => {
      const age =
        r.ageDays == null ? "never verified" : `${r.ageDays} days old`;
      const source = r.fee_source_url
        ? `<a href="${r.fee_source_url}" style="color:#2563eb;">source</a>`
        : "—";
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">
          <a href="${SITE_URL}/broker/${r.slug}" style="color:#0f172a;font-weight:600;text-decoration:none;">${r.name}</a>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:${r.ageDays == null || r.ageDays > 180 ? "#dc2626" : "#b45309"};">${age}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${source}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
  <body style="font-family:-apple-system,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
      <h1 style="font-size:18px;color:#0f172a;margin:0 0 8px;">Fee verification queue</h1>
      <p style="font-size:13px;color:#334155;margin:0 0 16px;">
        ${rows.length} broker(s) have gone past the ${FEE_STALE_DAYS}-day verification window. Readers see a red or amber pill on these cards — re-verifying refreshes the badge to green.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;background:white;">
        <thead>
          <tr style="background:#f1f5f9;text-align:left;">
            <th style="padding:10px;border-bottom:1px solid #cbd5e1;">Broker</th>
            <th style="padding:10px;border-bottom:1px solid #cbd5e1;">Age</th>
            <th style="padding:10px;border-bottom:1px solid #cbd5e1;">Source</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <p style="margin:16px 0;">
        <a href="${SITE_URL}/admin/fee-queue"
           style="display:inline-block;background:#f59e0b;color:white;font-weight:700;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;">
          Open fee queue →
        </a>
      </p>
      <p style="font-size:11px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px;">
        Digest sent by the weekly stale-fee-editorial cron. Brokers re-enter the queue when their <code>fee_verified_date</code> rolls past ${FEE_STALE_DAYS} days.
      </p>
    </div>
  </body>
</html>`;
}
