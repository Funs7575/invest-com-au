/**
 * Marketplace notification emails — for the Match Request /
 * Investor Brief flow (PR #821 marketplace, post-2.6 rename).
 *
 * Distinct from `lib/quote-emails.ts` which handles the older
 * /quotes/auction flow. New code uses these helpers; both libs
 * coexist until the legacy flow is fully retired.
 *
 * All helpers return `Promise<boolean>` and never throw — emails are
 * fire-and-forget background work that must never block the API
 * response. Failures are logged but swallowed.
 *
 * Compliance: every email uses "Match Request" / "Pro Squad" naming
 * consistent with the consumer-facing copy. Passive routing language —
 * never "we recommend".
 */

import { sendEmail } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";

const FROM = "Invest.com.au <hello@invest.com.au>";

function wrap(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155"><div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:18px">${title}</h1></div><div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">${body}</div></div>`;
}

function btn(href: string, label: string, color = "#f59e0b"): string {
  return `<div style="text-align:center;margin:24px 0"><a href="${href}" style="display:inline-block;padding:12px 32px;background:${color};color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">${label}</a></div>`;
}

function disclosure(): string {
  return `<p style="font-size:11px;color:#94a3b8;margin-top:20px">General information only — not personal advice. <a href="${SITE_URL}/privacy" style="color:#94a3b8">Privacy</a> · <a href="${SITE_URL}/account/notifications" style="color:#94a3b8">Email preferences</a></p>`;
}

// ─── Provider-side notifications ─────────────────────────────────────────

/**
 * A new Match Request matching the provider's accept criteria is now
 * available in their inbox. Sent immediately on brief creation, only
 * to providers eligible per the routing rules.
 */
export async function sendProviderNewMatchRequest(input: {
  providerEmail: string;
  providerName: string;
  briefTitle: string;
  briefSlug: string;
  acceptCreditsCost: number;
  briefBudgetBand: string | null;
  briefLocation: string | null;
}): Promise<boolean> {
  const briefUrl = `${SITE_URL}/advisor-portal/briefs/${input.briefSlug}`;
  const budgetLine = input.briefBudgetBand
    ? `<p style="font-size:13px;color:#475569;margin:4px 0"><strong>Budget:</strong> ${input.briefBudgetBand.replace(/_/g, " ")}</p>`
    : "";
  const locationLine = input.briefLocation
    ? `<p style="font-size:13px;color:#475569;margin:4px 0"><strong>Location:</strong> ${input.briefLocation}</p>`
    : "";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.providerEmail,
    subject: `New Match Request — ${input.briefTitle}`,
    html: wrap(
      "New Match Request in your inbox",
      `<p style="font-size:15px">Hi ${input.providerName},</p>
      <p style="font-size:14px;color:#475569">A new Match Request matching your accept criteria is available. Accept with credits to unlock the consumer's contact details.</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px 0">${input.briefTitle}</p>
        ${budgetLine}
        ${locationLine}
        <p style="font-size:13px;color:#475569;margin:8px 0 0 0"><strong>Accept cost:</strong> ${input.acceptCreditsCost} credits</p>
      </div>
      ${btn(briefUrl, "Review and accept →")}
      <p style="font-size:12px;color:#64748b">First verified provider to accept gets exclusive contact unlock. Others see only the masked preview.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * 24-hour digest: unaccepted Match Requests still in the provider's
 * inbox. Sent by daily cron. Only fired when count > 0.
 */
export async function sendProviderDailyDigest(input: {
  providerEmail: string;
  providerName: string;
  unacceptedCount: number;
  topBriefTitles: string[]; // up to 3 most recent
}): Promise<boolean> {
  const inboxUrl = `${SITE_URL}/advisor-portal/briefs`;
  const list = input.topBriefTitles
    .slice(0, 3)
    .map((t) => `<li style="font-size:13px;color:#475569;margin:4px 0">${t}</li>`)
    .join("");
  const { ok } = await sendEmail({
    from: FROM,
    to: input.providerEmail,
    subject: `${input.unacceptedCount} Match Request${input.unacceptedCount === 1 ? "" : "s"} waiting in your inbox`,
    html: wrap(
      "Match Requests waiting",
      `<p style="font-size:15px">Hi ${input.providerName},</p>
      <p style="font-size:14px;color:#475569">You have <strong>${input.unacceptedCount}</strong> unaccepted Match Request${input.unacceptedCount === 1 ? "" : "s"} in your inbox. First verified provider to accept gets exclusive contact unlock.</p>
      ${list ? `<ul style="margin:8px 0 16px 20px;padding:0">${list}</ul>` : ""}
      ${btn(inboxUrl, "Open your inbox →")}
      ${disclosure()}`,
    ),
  });
  return ok;
}

// ─── Consumer-side notifications ─────────────────────────────────────────

/**
 * Consumer notified when a verified provider accepts their Match Request.
 * Sent on `POST /api/briefs/[slug]/accept` success.
 */
export async function sendConsumerProviderAccepted(input: {
  consumerEmail: string;
  consumerName: string;
  briefTitle: string;
  briefSlug: string;
  providerName: string;
  providerKind: "individual" | "firm" | "expert_team";
}): Promise<boolean> {
  const trackerUrl = `${SITE_URL}/briefs/${input.briefSlug}`;
  const kindLabel =
    input.providerKind === "expert_team"
      ? "Pro Squad"
      : input.providerKind === "firm"
        ? "Firm"
        : "Verified Pro";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.consumerEmail,
    subject: `${input.providerName} accepted your Match Request`,
    html: wrap(
      "You have a match",
      `<p style="font-size:15px">Hi ${input.consumerName || "there"},</p>
      <p style="font-size:14px;color:#475569"><strong>${input.providerName}</strong> (${kindLabel}) accepted your Match Request and can now see your contact details. They'll be in touch shortly — usually within 1-2 business days.</p>
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:600;color:#065f46;margin:0">Next step</p>
        <p style="font-size:13px;color:#047857;margin:4px 0 0 0">Watch your inbox + phone. You can also message them via the Quote Status page below.</p>
      </div>
      ${btn(trackerUrl, "View Quote Status →")}
      <p style="font-size:12px;color:#64748b">${input.providerName} is verified by Invest.com.au but operates under their own licence. We provide marketplace introductions — the service itself is delivered by the professional.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * Consumer nudge: their brief has been live for N hours without a
 * provider acceptance. Sent by the stale-brief cron (N2).
 */
export async function sendConsumerStaleBriefNudge(input: {
  consumerEmail: string;
  consumerName: string;
  briefTitle: string;
  briefSlug: string;
  hoursLive: number;
  willAutoBroaden: boolean;
}): Promise<boolean> {
  const trackerUrl = `${SITE_URL}/briefs/${input.briefSlug}`;
  const broadenNote = input.willAutoBroaden
    ? `<p style="font-size:13px;color:#475569;margin:8px 0">We'll automatically broaden the routing to more providers in 24 hours unless you'd prefer to wait or update your request.</p>`
    : "";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.consumerEmail,
    subject: `Quick update on your Match Request — ${input.briefTitle}`,
    html: wrap(
      "Your Match Request is still open",
      `<p style="font-size:15px">Hi ${input.consumerName || "there"},</p>
      <p style="font-size:14px;color:#475569">Your Match Request has been live for ${input.hoursLive} hours and no provider has accepted yet. This usually means our routing needs broadening — your request may be too specific.</p>
      ${broadenNote}
      ${btn(trackerUrl, "View options →")}
      <p style="font-size:12px;color:#64748b">You can also withdraw and start a new Match Request from <a href="${SITE_URL}/get-matched" style="color:#0f172a">Get Matched</a>.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}
