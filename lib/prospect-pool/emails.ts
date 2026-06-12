/**
 * Open to Offers — notification emails.
 *
 * Three sends:
 *   - sendConsumerPitchReceived  → consumer, when an adviser pitches them.
 *     PREFERENCE-GATED: skipped if the address is suppressed or the user has
 *     turned off opportunity/deal alerts (notification_preferences.deal_alerts).
 *   - sendAdviserPitchAccepted   → adviser, when the consumer accepts (contact
 *     unlocked, chat open).
 *   - sendAdviserPitchDeclined   → adviser, when the consumer declines silently
 *     (credits refunded).
 *
 * All return Promise<boolean> and never throw — fire-and-forget background work
 * that must never block an API response (mirrors lib/marketplace-emails.ts).
 *
 * Compliance: passive routing language, general-information disclosure footer,
 * and the consumer email NEVER reveals adviser->consumer money. The adviser
 * surfaces NO consumer identity in the consumer email (it's their own inbox).
 */

import { sendEmail } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";
import { isSuppressed } from "@/lib/email-suppression";
// eslint-disable-next-line no-restricted-imports -- notification_preferences gate: cross-user read keyed by user_id with no caller JWT in the fire-and-forget email path; service-role is the documented exception per CLAUDE.md §"Two Supabase clients" (lib helpers serving anonymous / cross-user paths).
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { ProspectSnapshot } from "./types";
import { describeSnapshot } from "./snapshot";

const log = logger("prospect-pool:emails");
const FROM = "Invest.com.au <hello@invest.com.au>";

function wrap(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155"><div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:18px">${title}</h1></div><div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">${body}</div></div>`;
}

function btn(href: string, label: string, color = "#f59e0b"): string {
  return `<div style="text-align:center;margin:24px 0"><a href="${href}" style="display:inline-block;padding:12px 32px;background:${color};color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">${label}</a></div>`;
}

function disclosure(): string {
  return `<p style="font-size:11px;color:#94a3b8;margin-top:20px">General information only — not personal advice. Advisers send general capability statements; they never tell you what to do with your money. <a href="${SITE_URL}/privacy" style="color:#94a3b8">Privacy</a> · <a href="${SITE_URL}/account/notifications" style="color:#94a3b8">Email preferences</a></p>`;
}

/**
 * Has the consumer opted OUT of opportunity/deal-style emails? We gate the
 * pitch-received email on notification_preferences.deal_alerts (default true)
 * plus the suppression list. The in-app dashboard inbox always shows the pitch.
 */
async function consumerWantsPitchEmail(userId: string, email: string): Promise<boolean> {
  if (await isSuppressed(email)) return false;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("notification_preferences")
      .select("deal_alerts")
      .eq("user_id", userId)
      .maybeSingle();
    // No row = defaults (deal_alerts true). Explicit false = opted out.
    return data?.deal_alerts !== false;
  } catch {
    // Fail-open on a preferences read error — the consumer asked to be pitched.
    return true;
  }
}

export async function sendConsumerPitchReceived(input: {
  userId: string;
  consumerEmail: string;
  consumerFirstName: string | null;
  adviserName: string;
  adviserFirmName: string | null;
  pitchBody: string;
  feeBand: string | null;
}): Promise<boolean> {
  if (!(await consumerWantsPitchEmail(input.userId, input.consumerEmail))) {
    return false;
  }
  const inboxUrl = `${SITE_URL}/account/offers`;
  const greeting = input.consumerFirstName ? `Hi ${input.consumerFirstName},` : "Hi,";
  const adviserLine = input.adviserFirmName
    ? `${input.adviserName} · ${input.adviserFirmName}`
    : input.adviserName;
  const feeLine = input.feeBand
    ? `<p style="font-size:13px;color:#475569;margin:8px 0 0 0"><strong>Their fee estimate:</strong> ${input.feeBand}</p>`
    : "";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.consumerEmail,
    subject: `A vetted adviser would like to help`,
    html: wrap(
      "A vetted adviser pitched you",
      `<p style="font-size:15px">${greeting}</p>
      <p style="font-size:14px;color:#475569">You said vetted advisers could pitch you anonymously. One just did — they only see your goal, state and budget band, never your name or contact details until you accept.</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px 0">${adviserLine}</p>
        <p style="font-size:13px;color:#475569;margin:0;white-space:pre-wrap">${input.pitchBody.replace(/</g, "&lt;")}</p>
        ${feeLine}
      </div>
      <p style="font-size:13px;color:#475569">Accept to share your contact details and start a chat, or decline — they'll never know.</p>
      ${btn(inboxUrl, "View pitch →")}
      ${disclosure()}`,
    ),
  });
  return ok;
}

export async function sendAdviserPitchAccepted(input: {
  adviserEmail: string;
  adviserName: string;
  snapshot: ProspectSnapshot;
  briefSlug: string;
}): Promise<boolean> {
  const briefUrl = `${SITE_URL}/advisor-portal/briefs/${input.briefSlug}`;
  const { ok } = await sendEmail({
    from: FROM,
    to: input.adviserEmail,
    subject: `Your pitch was accepted — contact unlocked`,
    html: wrap(
      "Your pitch was accepted",
      `<p style="font-size:15px">Hi ${input.adviserName},</p>
      <p style="font-size:14px;color:#475569">A prospect you pitched (${describeSnapshot(input.snapshot)}) accepted. Their contact details are unlocked and a chat is open — a fast first response matters.</p>
      ${btn(briefUrl, "Open the conversation →")}
      ${disclosure()}`,
    ),
  });
  return ok;
}

export async function sendAdviserPitchDeclined(input: {
  adviserEmail: string;
  adviserName: string;
  snapshot: ProspectSnapshot;
  creditsRefunded: number;
}): Promise<boolean> {
  const prospectsUrl = `${SITE_URL}/advisor-portal/prospects`;
  const refundLine =
    input.creditsRefunded > 0
      ? `<p style="font-size:13px;color:#475569">Your ${input.creditsRefunded} credit${input.creditsRefunded === 1 ? "" : "s"} ${input.creditsRefunded === 1 ? "has" : "have"} been refunded.</p>`
      : "";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.adviserEmail,
    subject: `A prospect declined your pitch`,
    html: wrap(
      "A pitch was declined",
      `<p style="font-size:15px">Hi ${input.adviserName},</p>
      <p style="font-size:14px;color:#475569">A prospect you pitched (${describeSnapshot(input.snapshot)}) chose not to proceed.</p>
      ${refundLine}
      <p style="font-size:13px;color:#475569">There are more prospects open to offers in your area.</p>
      ${btn(prospectsUrl, "Browse prospects →")}
      ${disclosure()}`,
    ),
  });
  if (!ok) {
    log.warn("sendAdviserPitchDeclined failed", { adviser: input.adviserEmail });
  }
  return ok;
}
