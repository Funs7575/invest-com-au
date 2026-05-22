/**
 * Cron: Annual Financial MOT email (PX-07)
 *
 * Runs daily. Finds authenticated users whose `created_at` anniversary is
 * today (same month+day, one year later), queries their bookmarked products,
 * and sends a personalised "one year on" re-engagement email via Resend.
 *
 * Anti-spam: tracks send in mot_sent_at on the user's investor_profile row.
 * A user is only sent one MOT email per year.
 *
 * Schedule: daily-03 (03:30 UTC) via lib/cron-groups.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";

const log = logger("cron:annual-mot");

export const runtime = "nodejs";
export const maxDuration = 120;

const SITE_NAME = "Invest.com.au";
const UNSUBSCRIBE_HREF = "/account/notifications";

interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

interface BookmarkRow {
  entity_type: string;
  entity_slug: string;
  entity_name?: string;
}

function buildMOTEmail(
  userEmail: string,
  bookmarks: BookmarkRow[],
  yearsOnPlatform: number,
): { subject: string; html: string } {
  const subject = `Your ${yearsOnPlatform === 1 ? "1-year" : `${yearsOnPlatform}-year`} financial review from ${SITE_NAME}`;

  const bookmarkLines =
    bookmarks.length > 0
      ? bookmarks
          .slice(0, 6)
          .map(
            (b) =>
              `<li style="margin-bottom:6px;color:#334155;">${b.entity_name ?? b.entity_slug} <span style="color:#94a3b8;font-size:12px;">(${b.entity_type.replace(/_/g, " ")})</span></li>`,
          )
          .join("")
      : "<li style='color:#94a3b8;'>No saved products — <a href='https://invest.com.au/brokers' style='color:#7c3aed;'>browse brokers →</a></li>";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px;">
    <div style="color:#eab308;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">${SITE_NAME}</div>
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;line-height:1.3;">Your Annual Financial MOT</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">You've been with us for ${yearsOnPlatform} year${yearsOnPlatform !== 1 ? "s" : ""}. A lot changes in financial products — let's check in.</p>
  </div>

  <div style="padding:32px 40px;">

    <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 12px;">Products you saved</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 16px;">We've kept an eye on these since you bookmarked them:</p>
    <ul style="padding-left:20px;margin:0 0 24px;">
      ${bookmarkLines}
    </ul>

    <div style="background:#fef9ec;border:1px solid #fde68a;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">What's worth reviewing each year</p>
      <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#78350f;line-height:1.7;">
        <li>Brokerage fees — platforms have become more competitive</li>
        <li>Savings rate vs current RBA cash rate</li>
        <li>ETF management fees (MER) vs index alternatives</li>
        <li>Super fund performance vs benchmark</li>
      </ul>
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://invest.com.au/quiz" style="display:inline-block;background:#0f172a;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
        Run my comparison →
      </a>
    </div>

    <p style="font-size:12px;color:#94a3b8;margin:0;">
      This is a general information service. It does not constitute financial advice.
      Consider your personal circumstances or speak to a licensed adviser before making financial decisions.
      ${SITE_NAME} holds no AFSL — factual information only.
    </p>
  </div>

  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">
      Sent to ${userEmail} · <a href="https://invest.com.au${UNSUBSCRIBE_HREF}" style="color:#7c3aed;">Manage email preferences</a>
    </p>
  </div>

</div>
</body>
</html>`;

  return { subject, html };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!requireCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const today = new Date();
  const todayMM = today.getUTCMonth() + 1;
  const todayDD = today.getUTCDate();

  // Collect all users whose created_at anniversary is today (same month+day).
  // We page through auth.admin.listUsers — max 10 pages of 1000 (10k users cap).
  const anniversaryUsers: UserRow[] = [];
  const PER_PAGE = 1000;
  const MAX_PAGES = 10;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error || !data?.users) break;

    for (const u of data.users) {
      if (!u.email || !u.created_at) continue;
      const created = new Date(u.created_at);
      if (
        created.getUTCMonth() + 1 === todayMM &&
        created.getUTCDate() === todayDD &&
        created.getUTCFullYear() < today.getUTCFullYear()
      ) {
        anniversaryUsers.push({ id: u.id, email: u.email, created_at: u.created_at });
      }
    }

    if (data.users.length < PER_PAGE) break;
  }

  if (anniversaryUsers.length === 0) {
    log.info("No anniversary users today", { date: `${todayMM}-${todayDD}` });
    return NextResponse.json({ sent: 0, skipped: 0 });
  }

  let sent = 0;
  let skipped = 0;

  for (const user of anniversaryUsers) {
    try {
      // Check if MOT email was already sent this year
      const { data: profile } = await admin
        .from("investor_profiles")
        .select("mot_sent_at")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (profile?.mot_sent_at) {
        const lastSent = new Date(profile.mot_sent_at);
        const daysSince = (today.getTime() - lastSent.getTime()) / 86400_000;
        if (daysSince < 300) {
          skipped++;
          continue;
        }
      }

      const createdYear = new Date(user.created_at).getUTCFullYear();
      const yearsOnPlatform = today.getUTCFullYear() - createdYear;
      if (yearsOnPlatform < 1) {
        skipped++;
        continue;
      }

      // Fetch their bookmarks
      const { data: bookmarks } = await admin
        .from("user_bookmarks")
        .select("entity_type, entity_slug, entity_name")
        .eq("user_id", user.id)
        .limit(10);

      const { subject, html } = buildMOTEmail(
        user.email,
        (bookmarks ?? []) as BookmarkRow[],
        yearsOnPlatform,
      );

      await sendEmail({
        to: user.email,
        subject,
        html,
        from: `${SITE_NAME} <hello@invest.com.au>`,
      });

      // Record send date to prevent duplicate sends this year
      await admin
        .from("investor_profiles")
        .upsert({ auth_user_id: user.id, mot_sent_at: today.toISOString() }, { onConflict: "auth_user_id" });

      sent++;
      log.info("MOT email sent", { userId: user.id, yearsOnPlatform });
    } catch (err) {
      log.error("MOT send failed for user", {
        userId: user.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Annual MOT cron complete", { sent, skipped });
  return NextResponse.json({ sent, skipped });
}
