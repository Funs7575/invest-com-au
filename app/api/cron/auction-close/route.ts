import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("cron-auction-close");

const FROM = "Invest.com.au <hello@invest.com.au>";

function emailWrap(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155"><div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:18px">${title}</h1></div><div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">${body}</div></div>`;
}

function btn(href: string, label: string): string {
  return `<div style="text-align:center;margin:24px 0"><a href="${href}" style="display:inline-block;padding:12px 32px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">${label}</a></div>`;
}

async function sendAuctionWonEmail(
  advisorEmail: string,
  advisorName: string,
  consumerName: string,
  consumerEmail: string,
  consumerPhone: string | null,
  leadType: string,
  location: string | null,
  bidAmountCents: number,
): Promise<void> {
  const portalUrl = `${SITE_URL}/advisor-portal/auctions`;
  const displayLead = leadType.replace(/_/g, " ");
  const displayLocation = location ?? "Remote / Australia-wide";
  const bidDisplay = `$${(bidAmountCents / 100).toFixed(2)}`;

  await sendEmail({
    from: FROM,
    to: advisorEmail,
    subject: `You won the auction — ${displayLead} lead in ${displayLocation}`,
    html: emailWrap(
      "You Won the Auction!",
      `<p style="font-size:15px">Hi ${advisorName.split(" ")[0]},</p>
      <p style="font-size:14px;color:#64748b">Congratulations! Your bid of <strong>${bidDisplay}</strong> won the <strong>${displayLead}</strong> lead in <strong>${displayLocation}</strong>.</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 10px 0">Client contact details:</p>
        <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
          <tr><td style="padding:4px 8px 4px 0;font-weight:600">Name:</td><td>${consumerName}</td></tr>
          <tr><td style="padding:4px 8px 4px 0;font-weight:600">Email:</td><td><a href="mailto:${consumerEmail}" style="color:#2563eb">${consumerEmail}</a></td></tr>
          ${consumerPhone ? `<tr><td style="padding:4px 8px 4px 0;font-weight:600">Phone:</td><td><a href="tel:${consumerPhone}" style="color:#2563eb">${consumerPhone}</a></td></tr>` : ""}
        </table>
      </div>
      <p style="font-size:14px;color:#64748b"><strong>Please reach out within 24 hours.</strong> Quick follow-up improves your rating on Invest.com.au.</p>
      ${btn(`mailto:${consumerEmail}?subject=Your%20enquiry%20on%20Invest.com.au`, `Email ${consumerName.split(" ")[0]} Now →`)}
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">Manage your leads in the <a href="${portalUrl}" style="color:#2563eb">advisor portal</a>.</p>`,
    ),
  });
}

async function sendConsumerAuctionMatchedEmail(
  consumerEmail: string,
  consumerName: string,
  advisorName: string,
  leadType: string,
  location: string | null,
): Promise<void> {
  const displayLead = leadType.replace(/_/g, " ");
  const displayLocation = location ?? "Australia-wide";
  const findUrl = `${SITE_URL}/find`;

  await sendEmail({
    from: FROM,
    to: consumerEmail,
    subject: `An advisor has been matched to your ${displayLead} enquiry`,
    html: emailWrap(
      "Your Advisor Match is Ready",
      `<p style="font-size:15px">Hi ${consumerName.split(" ")[0]},</p>
      <p style="font-size:14px;color:#64748b">A qualified advisor has been matched to your <strong>${displayLead}</strong> enquiry in <strong>${displayLocation}</strong>.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 4px 0">${advisorName}</p>
        <p style="font-size:13px;color:#64748b;margin:0">Matched advisor for your ${displayLead} needs</p>
      </div>
      <p style="font-size:14px;color:#64748b">They will reach out to you directly within 24 hours. Please keep an eye on your inbox (including spam folder).</p>
      ${btn(findUrl, "Browse More Advisors →")}
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">This is not financial advice. <a href="${SITE_URL}/privacy" style="color:#94a3b8">Privacy Policy</a></p>`,
    ),
  });
}

/**
 * GET /api/cron/auction-close
 *
 * Closes expired advisor auctions (status='open', ends_at < NOW(), flow_type='auction').
 * Awards to the highest active bid; sends winner + consumer match emails.
 * No-bid auctions are marked 'expired'.
 *
 * Registered in cron-groups.ts under 'every-30m' — runs every 30 minutes.
 * Max 60s runtime handles up to ~200 expiring auctions in a single fire.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: expired, error: fetchErr } = await admin
    .from("advisor_auctions")
    .select("id, lead_type, location, contact_name, contact_email, contact_phone, slug")
    .eq("status", "open")
    .eq("flow_type", "auction")
    .lt("ends_at", now)
    .limit(200);

  if (fetchErr) {
    log.error("Failed to fetch expired auctions", { error: fetchErr.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  let awarded = 0;
  let expired_count = 0;
  let errors = 0;

  for (const auction of expired ?? []) {
    try {
      const { data: bids } = await admin
        .from("advisor_auction_bids")
        .select("id, advisor_id, bid_amount")
        .eq("auction_id", auction.id)
        .eq("status", "active")
        .order("bid_amount", { ascending: false })
        .limit(50);

      if (!bids || bids.length === 0) {
        await admin
          .from("advisor_auctions")
          .update({ status: "expired" })
          .eq("id", auction.id);
        expired_count++;
        log.info("Auction expired (no bids)", { auctionId: auction.id });
        continue;
      }

      const winner = bids[0];
      const loserIds = bids.slice(1).map((b: { id: number }) => b.id);

      // Award auction to highest bidder
      await admin
        .from("advisor_auctions")
        .update({ status: "awarded" })
        .eq("id", auction.id);

      await admin
        .from("advisor_auction_bids")
        .update({ status: "accepted" })
        .eq("id", winner.id);

      if (loserIds.length > 0) {
        await admin
          .from("advisor_auction_bids")
          .update({ status: "expired" })
          .in("id", loserIds);
      }

      // Fetch advisor details for winner notification
      const { data: advisor } = await admin
        .from("professionals")
        .select("name, email")
        .eq("id", winner.advisor_id)
        .single();

      if (advisor?.email && auction.contact_email) {
        await Promise.allSettled([
          sendAuctionWonEmail(
            advisor.email,
            advisor.name,
            auction.contact_name ?? "the client",
            auction.contact_email,
            auction.contact_phone ?? null,
            auction.lead_type,
            auction.location,
            winner.bid_amount,
          ),
          sendConsumerAuctionMatchedEmail(
            auction.contact_email,
            auction.contact_name ?? "there",
            advisor.name,
            auction.lead_type,
            auction.location,
          ),
        ]);
      }

      awarded++;
      log.info("Auction awarded", {
        auctionId: auction.id,
        winnerAdvisorId: winner.advisor_id,
        bidAmountCents: winner.bid_amount,
        totalBids: bids.length,
      });
    } catch (err) {
      errors++;
      log.error("Failed to close auction", {
        auctionId: auction.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Auction close complete", {
    processed: (expired ?? []).length,
    awarded,
    expired: expired_count,
    errors,
  });

  return NextResponse.json({ awarded, expired: expired_count, errors });
}
