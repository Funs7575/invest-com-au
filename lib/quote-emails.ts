import { sendEmail } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";

const FROM = "Invest.com.au <hello@invest.com.au>";

function wrap(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155"><div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:18px">${title}</h1></div><div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">${body}</div></div>`;
}

function btn(href: string, label: string, color = "#0f172a"): string {
  return `<div style="text-align:center;margin:24px 0"><a href="${href}" style="display:inline-block;padding:12px 32px;background:${color};color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">${label}</a></div>`;
}

/** Consumer: confirms their job was posted. */
export async function sendJobPostedConfirmation(
  email: string,
  firstName: string,
  jobTitle: string,
  jobSlug: string,
  advisorTypes: string[],
): Promise<boolean> {
  const jobUrl = `${SITE_URL}/quotes/${jobSlug}`;
  const typesHtml = advisorTypes
    .map((t) => `<span style="display:inline-block;background:#fffbeb;border:1px solid #fde68a;border-radius:4px;padding:2px 8px;font-size:12px;margin:2px">${t.replace(/_/g, " ")}</span>`)
    .join(" ");
  const { ok } = await sendEmail({
    from: FROM,
    to: email,
    subject: `Your quote request is live — ${jobTitle}`,
    html: wrap(
      "Your Quote Request is Live",
      `<p style="font-size:15px">Hi ${firstName},</p>
      <p style="font-size:14px;color:#64748b">Your request has been published on the Invest.com.au marketplace. Verified advisors matching your criteria will start submitting quotes within the next 72 hours.</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:13px;font-weight:600;color:#0f172a;margin:0 0 8px 0">${jobTitle}</p>
        <p style="font-size:12px;color:#64748b;margin:0 0 8px 0">Advisor types: ${typesHtml}</p>
      </div>
      <p style="font-size:14px;color:#64748b"><strong>Important:</strong> Bookmark this link — you'll use it to review quotes and accept your preferred advisor. Your contact details are only shared <em>after</em> you accept a quote.</p>
      ${btn(jobUrl, "View My Quote Request →", "#f59e0b")}
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">This is not financial advice. <a href="${SITE_URL}/privacy" style="color:#94a3b8">Privacy Policy</a></p>`,
    ),
  });
  return ok;
}

/** Consumer: notified when a new bid arrives on their job. */
export async function sendConsumerBidReceivedEmail(
  email: string,
  firstName: string,
  jobTitle: string,
  jobSlug: string,
  advisorName: string,
  advisorType: string,
  totalBids: number,
): Promise<boolean> {
  const jobUrl = `${SITE_URL}/quotes/${jobSlug}`;
  const typeLabel = advisorType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const isFirst = totalBids === 1;
  const subject = isFirst
    ? `You have your first quote! — ${jobTitle}`
    : `New quote from ${advisorName} — ${jobTitle}`;
  const { ok } = await sendEmail({
    from: FROM,
    to: email,
    subject,
    html: wrap(
      isFirst ? "Your First Quote Has Arrived!" : "New Quote Received",
      `<p style="font-size:15px">Hi ${firstName},</p>
      <p style="font-size:14px;color:#64748b">${isFirst ? "Great news — your first quote has arrived" : "A new quote has been submitted"} for <strong>${jobTitle}</strong>.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 4px 0">${advisorName}</p>
        <p style="font-size:13px;color:#d97706;font-weight:600;margin:0">Verified ${typeLabel}</p>
      </div>
      <p style="font-size:14px;color:#64748b">You now have <strong>${totalBids} quote${totalBids === 1 ? "" : "s"}</strong> to compare. Remember: your contact details are only shared after you accept a quote.</p>
      ${btn(jobUrl, `Review ${totalBids === 1 ? "Your Quote" : "All " + totalBids + " Quotes"} →`, "#f59e0b")}
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">You received this because you posted a quote request on Invest.com.au. <a href="${SITE_URL}/privacy" style="color:#94a3b8">Privacy Policy</a></p>`,
    ),
  });
  return ok;
}

/** Advisor: notified about a new public job that matches their specialty. */
export async function sendAdvisorNewPublicJobEmail(
  advisorEmail: string,
  advisorFirstName: string,
  jobTitle: string,
  jobDescription: string,
  jobSlug: string,
  budgetBand: string,
  locationState: string,
): Promise<boolean> {
  const jobUrl = `${SITE_URL}/quotes/${jobSlug}`;
  const budgetLabel: Record<string, string> = {
    under_500: "Under $500", "500_2k": "$500–$2k", "2k_5k": "$2k–$5k",
    "5k_10k": "$5k–$10k", "10k_plus": "$10k+", not_sure: "Budget TBD",
  };
  const budget = budgetLabel[budgetBand] || "Budget TBD";
  const preview = jobDescription.length > 200
    ? jobDescription.slice(0, 200).trimEnd() + "…"
    : jobDescription;
  const { ok } = await sendEmail({
    from: FROM,
    to: advisorEmail,
    subject: `New quote request matching your specialties — ${jobTitle}`,
    html: wrap(
      "New Quote Request on the Marketplace",
      `<p style="font-size:15px">Hi ${advisorFirstName},</p>
      <p style="font-size:14px;color:#64748b">A consumer just posted a public quote request that matches your specialties. Be among the first advisors to submit a quote.</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 8px 0">${jobTitle}</p>
        <p style="font-size:13px;color:#64748b;margin:0 0 8px 0">${preview}</p>
        <table style="font-size:12px;color:#64748b;border-collapse:collapse">
          <tr><td style="padding:2px 12px 2px 0;font-weight:600">Budget:</td><td>${budget}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;font-weight:600">Location:</td><td>${locationState}</td></tr>
        </table>
      </div>
      <p style="font-size:14px;color:#64748b">Quotes from earlier bidders appear first. Submit yours quickly for best visibility.</p>
      ${btn(jobUrl, "View Request & Submit Quote →", "#16a34a")}
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">Only advisors matching this request's types received this notification. <a href="${SITE_URL}/advisor-portal" style="color:#94a3b8">Manage notifications</a></p>`,
    ),
  });
  return ok;
}

/** Advisor: notified when the consumer accepted their bid. Includes consumer contact info. */
export async function sendAdvisorBidAcceptedEmail(
  advisorEmail: string,
  advisorFirstName: string,
  consumerName: string,
  consumerEmail: string,
  consumerPhone: string | null,
  jobTitle: string,
  jobSlug: string,
): Promise<boolean> {
  const jobUrl = `${SITE_URL}/quotes/${jobSlug}`;
  const { ok } = await sendEmail({
    from: FROM,
    to: advisorEmail,
    subject: `You won the quote — ${consumerName} chose you!`,
    html: wrap(
      "Your Quote Was Accepted!",
      `<p style="font-size:15px">Hi ${advisorFirstName},</p>
      <p style="font-size:14px;color:#64748b">Congratulations! <strong>${consumerName}</strong> has accepted your quote for <strong>${jobTitle}</strong>.</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 10px 0">Client contact details:</p>
        <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
          <tr><td style="padding:4px 8px 4px 0;font-weight:600">Name:</td><td>${consumerName}</td></tr>
          <tr><td style="padding:4px 8px 4px 0;font-weight:600">Email:</td><td><a href="mailto:${consumerEmail}" style="color:#2563eb">${consumerEmail}</a></td></tr>
          ${consumerPhone ? `<tr><td style="padding:4px 8px 4px 0;font-weight:600">Phone:</td><td><a href="tel:${consumerPhone}" style="color:#2563eb">${consumerPhone}</a></td></tr>` : ""}
        </table>
      </div>
      <p style="font-size:14px;color:#64748b"><strong>Please reach out within 24 hours.</strong> Quick follow-up improves your rating on Invest.com.au.</p>
      ${btn(`mailto:${consumerEmail}?subject=Your%20enquiry%20on%20Invest.com.au`, `Email ${consumerName} Now →`, "#f59e0b")}
      <p style="font-size:13px;color:#64748b">View the original request: <a href="${jobUrl}" style="color:#2563eb">${jobUrl}</a></p>
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">Manage your leads in the <a href="${SITE_URL}/advisor-portal" style="color:#2563eb">advisor portal</a>.</p>`,
    ),
  });
  return ok;
}

/** Consumer: 24h before their job expires, nudge to accept a quote. */
export async function sendQuoteExpiryReminderEmail(
  email: string,
  firstName: string,
  jobTitle: string,
  jobSlug: string,
  bidCount: number,
  topBidAmountCents: number | null,
  topAdvisorName: string | null,
): Promise<boolean> {
  const jobUrl = `${SITE_URL}/quotes/${jobSlug}`;
  const topBid =
    topBidAmountCents != null && topAdvisorName
      ? `<p style="font-size:13px;color:#64748b;margin:8px 0 0 0">Lowest current quote: <strong>$${(topBidAmountCents / 100).toLocaleString("en-AU")}</strong> from ${topAdvisorName}.</p>`
      : "";
  const { ok } = await sendEmail({
    from: FROM,
    to: email,
    subject: `Your quote request expires in 24h — ${jobTitle}`,
    html: wrap(
      "Your Quote Request Expires Soon",
      `<p style="font-size:15px">Hi ${firstName},</p>
      <p style="font-size:14px;color:#64748b">Your quote request <strong>${jobTitle}</strong> expires in <strong>24 hours</strong>.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;color:#0f172a;margin:0;font-weight:600">You have ${bidCount} ${bidCount === 1 ? "quote" : "quotes"} waiting for review.</p>
        ${topBid}
      </div>
      <p style="font-size:14px;color:#64748b">If you don't accept a quote before expiry, the request will close. You can re-open it for another 7 days afterwards if you need more time.</p>
      ${btn(jobUrl, `Review ${bidCount === 1 ? "the Quote" : "All Quotes"} →`, "#dc2626")}
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">You received this because you posted a quote request on Invest.com.au.</p>`,
    ),
  });
  return ok;
}

/**
 * Advisor: invited into a 24h best-and-final round (idea #11). The consumer
 * shortlisted this advisor's quote and opened one final round — the advisor may
 * submit a single revised quote. Factual price-discovery framing; no platform
 * money movement.
 */
export async function sendFinalRoundInviteEmail(
  advisorEmail: string,
  advisorFirstName: string,
  jobTitle: string,
  jobSlug: string,
  currentBidCents: number,
  finalRoundEndsAt: string,
): Promise<boolean> {
  const jobUrl = `${SITE_URL}/quotes/${jobSlug}`;
  const current = `$${(currentBidCents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
  const endsLabel = new Date(finalRoundEndsAt).toLocaleString("en-AU", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
  const { ok } = await sendEmail({
    from: FROM,
    to: advisorEmail,
    subject: `You're shortlisted — final round on "${jobTitle}"`,
    html: wrap(
      "You're in the Final Round",
      `<p style="font-size:15px">Hi ${advisorFirstName},</p>
      <p style="font-size:14px;color:#64748b">Good news — the consumer shortlisted your quote for <strong>${jobTitle}</strong> and opened a <strong>24-hour best-and-final round</strong>. You may submit one revised quote if you'd like to.</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:13px;color:#64748b;margin:0 0 4px 0">Your current quote</p>
        <p style="font-size:18px;font-weight:700;color:#0f172a;margin:0">${current}</p>
        <p style="font-size:12px;color:#94a3b8;margin:8px 0 0 0">Final round closes ${endsLabel}.</p>
      </div>
      <p style="font-size:14px;color:#64748b">Revising is optional — your existing quote stands if you do nothing. Any fee you quote is your own; Invest.com.au never takes a cut of what the consumer pays you.</p>
      ${btn(jobUrl, "Review & Update Your Quote →", "#16a34a")}
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">You received this because you quoted on this request. <a href="${SITE_URL}/advisor-portal/auctions" style="color:#94a3b8">Manage auctions</a></p>`,
    ),
  });
  return ok;
}

/**
 * Advisor: the consumer countered this advisor's quote (idea #11) — "would you
 * do it for $X?". The advisor accepts or declines from the portal. The counter
 * is a factual price question, not a platform-set price.
 */
export async function sendCounterOfferToAdvisorEmail(
  advisorEmail: string,
  advisorFirstName: string,
  jobTitle: string,
  jobSlug: string,
  currentBidCents: number,
  counterAmountCents: number,
): Promise<boolean> {
  const portalUrl = `${SITE_URL}/advisor-portal/auctions`;
  const current = `$${(currentBidCents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
  const counter = `$${(counterAmountCents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
  const { ok } = await sendEmail({
    from: FROM,
    to: advisorEmail,
    subject: `A consumer countered your quote — "${jobTitle}"`,
    html: wrap(
      "You Have a Counter-Offer",
      `<p style="font-size:15px">Hi ${advisorFirstName},</p>
      <p style="font-size:14px;color:#64748b">The consumer who posted <strong>${jobTitle}</strong> has responded to your quote with a counter — they've asked whether you'd do the work for a different figure.</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
        <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
          <tr><td style="padding:4px 8px 4px 0;color:#64748b">Your quote:</td><td style="font-weight:700;color:#0f172a">${current}</td></tr>
          <tr><td style="padding:4px 8px 4px 0;color:#64748b">They asked for:</td><td style="font-weight:700;color:#16a34a">${counter}</td></tr>
        </table>
      </div>
      <p style="font-size:14px;color:#64748b">Accept to update your quote to ${counter}, or decline to keep your current quote. It's entirely your call — the fee is yours and Invest.com.au never intermediates the payment between you and the client.</p>
      ${btn(portalUrl, "Accept or Decline →", "#16a34a")}
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">Respond in your <a href="${portalUrl}" style="color:#2563eb">advisor portal</a>.</p>`,
    ),
  });
  return ok;
}

/**
 * Consumer: the advisor responded to their counter-offer (idea #11). Accepted →
 * the quote was updated to the agreed figure; declined → the original stands.
 */
export async function sendCounterOfferResultEmail(
  email: string,
  firstName: string,
  jobTitle: string,
  jobSlug: string,
  advisorName: string,
  accepted: boolean,
  agreedAmountCents: number,
): Promise<boolean> {
  const jobUrl = `${SITE_URL}/quotes/${jobSlug}`;
  const agreed = `$${(agreedAmountCents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
  const { ok } = await sendEmail({
    from: FROM,
    to: email,
    subject: accepted
      ? `${advisorName} accepted your counter — ${jobTitle}`
      : `${advisorName} kept their original quote — ${jobTitle}`,
    html: wrap(
      accepted ? "Your Counter Was Accepted" : "Counter Declined",
      `<p style="font-size:15px">Hi ${firstName},</p>
      ${accepted
        ? `<p style="font-size:14px;color:#64748b"><strong>${advisorName}</strong> accepted your counter on <strong>${jobTitle}</strong>. Their quote is now <strong>${agreed}</strong>.</p>
           <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
             <p style="font-size:14px;color:#0f172a;margin:0;font-weight:600">Updated quote: ${agreed}</p>
           </div>
           <p style="font-size:14px;color:#64748b">You can now accept their quote to share your contact details and get started.</p>`
        : `<p style="font-size:14px;color:#64748b"><strong>${advisorName}</strong> has kept their original quote on <strong>${jobTitle}</strong>. Their earlier quote still stands, and you can accept it any time before the request closes.</p>`}
      ${btn(jobUrl, "View Your Quotes →", "#f59e0b")}
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">You received this because you posted a quote request on Invest.com.au.</p>`,
    ),
  });
  return ok;
}

/** Consumer: 14 days after accepting a quote, ask them to leave a review. */
export async function sendQuoteReviewRequestEmail(
  email: string,
  firstName: string,
  advisorName: string,
  jobTitle: string,
  jobSlug: string,
  reviewToken: string,
): Promise<boolean> {
  const reviewUrl = `${SITE_URL}/quotes/${jobSlug}/review?token=${encodeURIComponent(reviewToken)}`;
  const { ok } = await sendEmail({
    from: FROM,
    to: email,
    subject: `How was your experience with ${advisorName}?`,
    html: wrap(
      "Share Your Experience",
      `<p style="font-size:15px">Hi ${firstName},</p>
      <p style="font-size:14px;color:#64748b">It's been a couple of weeks since you accepted <strong>${advisorName}</strong>'s quote for <strong>${jobTitle}</strong>. We'd love to hear how it went.</p>
      <p style="font-size:14px;color:#64748b">A short, honest review helps other Australians find trustworthy advisors — and it takes less than a minute.</p>
      ${btn(reviewUrl, "Leave a Review (1 min) →", "#f59e0b")}
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">If you'd rather not, just ignore this email. We won't ask again.</p>`,
    ),
  });
  return ok;
}
