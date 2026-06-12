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
/**
 * Idea #11 — sealed reveal. Stamp `revealed_at` on every still-unrevealed bid
 * of a closing auction so sealed amounts become universally visible exactly at
 * close. Best-effort + fail-soft: if the column is absent (migration not yet
 * applied) the update simply errors and we swallow it — closing must never fail
 * because of the reveal stamp.
 */
async function stampRevealed(
  admin: ReturnType<typeof createAdminClient>,
  auctionId: number,
  nowIso: string,
): Promise<void> {
  try {
    await admin
      .from("advisor_auction_bids")
      .update({ revealed_at: nowIso })
      .eq("auction_id", auctionId)
      .is("revealed_at", null);
  } catch (err) {
    log.warn("Reveal stamp failed (non-fatal)", {
      auctionId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Idea #11 — best-and-final round settlement. Find public quote auctions whose
 * 24h final-round window has elapsed while the auction is still open, and record
 * the settlement. The window itself is enforced time-based in the bid route
 * (`finalRoundActive`), so this pass is intentionally non-destructive: it does
 * NOT auto-award (the consumer always picks the winner on public quotes) and it
 * does NOT reveal sealed amounts (the auction is still open). It exists so stale
 * final rounds are visibly settled in the heartbeat logs and is fully fail-soft
 * — the whole pass is skipped if the final_round_* columns are absent.
 */
async function settleExpiredFinalRounds(
  admin: ReturnType<typeof createAdminClient>,
  nowIso: string,
): Promise<number> {
  try {
    const { data: rows, error } = await admin
      .from("advisor_auctions")
      .select("id, slug")
      .eq("status", "open")
      .eq("source", "public_job")
      .not("final_round_started_at", "is", null)
      .lt("final_round_ends_at", nowIso)
      .limit(200);
    if (error) {
      // Column-absent / dormant: treat as nothing to settle.
      log.warn("Final-round settle query failed (non-fatal)", { error: error.message });
      return 0;
    }
    const settled = rows ?? [];
    for (const r of settled) {
      log.info("Final round settled (window elapsed; consumer still chooses)", {
        auctionId: r.id,
        slug: r.slug,
      });
    }
    return settled.length;
  } catch (err) {
    log.warn("Final-round settle pass threw (non-fatal)", {
      err: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/**
 * GET /api/cron/auction-close
 *
 * Closes expired advisor auctions (status='open', ends_at < NOW(), flow_type='auction').
 * Awards to the highest active bid; sends winner + consumer match emails.
 * No-bid auctions are marked 'expired'. On close, stamps `revealed_at` on bids
 * so sealed-bid auctions reveal their amounts at close (idea #11). Also settles
 * elapsed best-and-final-round windows (idea #11) without auto-awarding.
 *
 * Registered in cron-groups.ts under 'every-30m' — runs every 30 minutes.
 * Max 60s runtime handles up to ~200 expiring auctions in a single fire.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Idea #11 — settle elapsed best-and-final rounds first (non-destructive).
  const finalRoundsSettled = await settleExpiredFinalRounds(admin, now);

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
          .eq("id", auction.id)
          .eq("status", "open");
        await stampRevealed(admin, auction.id, now);
        expired_count++;
        log.info("Auction expired (no bids)", { auctionId: auction.id });
        continue;
      }

      const winner = bids[0];
      const loserIds = bids.slice(1).map((b: { id: number }) => b.id);

      // Award the auction to the highest bidder — atomically. The
      // `.eq("status","open")` guard means only the fire that actually
      // flips open→awarded proceeds; an overlapping/duplicate run gets
      // zero rows back and skips, so the winning advisor (and the client's
      // revealed contact details) is never emailed twice.
      const { data: claimed } = await admin
        .from("advisor_auctions")
        .update({ status: "awarded" })
        .eq("id", auction.id)
        .eq("status", "open")
        .select("id");

      if (!claimed || claimed.length === 0) {
        log.info("Auction already closed by a concurrent run — skipping", {
          auctionId: auction.id,
        });
        continue;
      }

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

      // Idea #11 — reveal sealed bid amounts now the auction has closed.
      await stampRevealed(admin, auction.id, now);

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
    finalRoundsSettled,
    errors,
  });

  return NextResponse.json({ awarded, expired: expired_count, finalRoundsSettled, errors });
}
