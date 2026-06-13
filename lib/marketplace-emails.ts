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
import { buildBriefReplyAddress } from "@/lib/briefs/reply-address";

const FROM = "Invest.com.au <hello@invest.com.au>";

/**
 * Reply-by-Email Bridge: emails that point a party at the brief chat set
 * Reply-To to the brief's HMAC reply address, so answering the email
 * lands the reply in `brief_messages` (see /api/inbound/brief-reply).
 * Returns undefined when briefId is absent or BRIEF_REPLY_SECRET is not
 * configured — the header is simply omitted.
 */
function briefReplyTo(briefId: number | undefined): string | undefined {
  if (!briefId) return undefined;
  return buildBriefReplyAddress(briefId) ?? undefined;
}

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
 * A standing order auto-accepted a Match Request on the provider's
 * behalf. Tells them what was claimed, what it cost, and links straight
 * to the unlocked contact details — the consumer has already been told
 * a provider accepted, so the email pushes an immediate first response.
 */
export async function sendProviderStandingOrderAccepted(input: {
  providerEmail: string;
  providerName: string;
  briefTitle: string;
  briefSlug: string;
  creditsSpent: number;
  briefBudgetBand: string | null;
  briefLocation: string | null;
  /** Enables reply-by-email into the brief chat when provided. */
  briefId?: number;
}): Promise<boolean> {
  const inboxUrl = `${SITE_URL}/advisor-portal/briefs`;
  const budgetLine = input.briefBudgetBand
    ? `<p style="font-size:13px;color:#475569;margin:4px 0"><strong>Budget:</strong> ${input.briefBudgetBand.replace(/_/g, " ")}</p>`
    : "";
  const locationLine = input.briefLocation
    ? `<p style="font-size:13px;color:#475569;margin:4px 0"><strong>Location:</strong> ${input.briefLocation}</p>`
    : "";
  const chargeLine =
    input.creditsSpent > 0
      ? `<p style="font-size:13px;color:#475569;margin:8px 0 0 0"><strong>Charged:</strong> ${input.creditsSpent} credits (standing order)</p>`
      : "";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.providerEmail,
    replyTo: briefReplyTo(input.briefId),
    subject: `Standing order matched — ${input.briefTitle}`,
    html: wrap(
      "Your standing order claimed a Match Request",
      `<p style="font-size:15px">Hi ${input.providerName},</p>
      <p style="font-size:14px;color:#475569">A new Match Request matched one of your standing orders and was accepted automatically. The consumer's contact details are unlocked in your inbox — they've been told you accepted, so a fast first response matters.</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px 0">${input.briefTitle}</p>
        ${budgetLine}
        ${locationLine}
        ${chargeLine}
      </div>
      ${btn(inboxUrl, "Open the brief →")}
      <p style="font-size:12px;color:#64748b">Pause or edit your standing orders any time from the brief inbox.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * Response-guarantee warning: the provider accepted a brief and hasn't
 * sent a first message; N hours remain before the accept is released and
 * the credits refunded. One warning per brief/provider pair.
 */
export async function sendProviderSlaWarning(input: {
  providerEmail: string;
  providerName: string;
  briefTitle: string;
  briefSlug: string;
  hoursLeft: number;
  /** Enables reply-by-email into the brief chat when provided. */
  briefId?: number;
}): Promise<boolean> {
  const inboxUrl = `${SITE_URL}/advisor-portal/briefs`;
  const { ok } = await sendEmail({
    from: FROM,
    to: input.providerEmail,
    replyTo: briefReplyTo(input.briefId),
    subject: `${input.hoursLeft}h left to respond — ${input.briefTitle}`,
    html: wrap(
      "A brief you accepted is waiting on you",
      `<p style="font-size:15px">Hi ${input.providerName},</p>
      <p style="font-size:14px;color:#475569">You accepted <strong>${input.briefTitle}</strong> but haven't sent the consumer a first message yet. Under the response guarantee, the brief is released to other providers (and your credits refunded) if there's no response within the window.</p>
      <p style="font-size:14px;color:#0f172a;font-weight:600">About ${input.hoursLeft} hour${input.hoursLeft === 1 ? "" : "s"} left.</p>
      ${btn(inboxUrl, "Send a first message →")}
      <p style="font-size:12px;color:#64748b">Already spoken with them by phone? Update the brief's tracker status and the guarantee clock stops.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * Response-guarantee clawback: the accept was released after the SLA
 * lapsed. Factual, not punitive — tells the provider exactly what
 * happened and what was refunded.
 */
export async function sendProviderSlaClawback(input: {
  providerEmail: string;
  providerName: string;
  briefTitle: string;
  creditsRefunded: number;
  slaHours: number;
}): Promise<boolean> {
  const refundLine =
    input.creditsRefunded > 0
      ? `<p style="font-size:14px;color:#475569">Your ${input.creditsRefunded} credit${input.creditsRefunded === 1 ? "" : "s"} have been refunded to your balance.</p>`
      : "";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.providerEmail,
    subject: `Brief released — ${input.briefTitle}`,
    html: wrap(
      "A brief you accepted was released",
      `<p style="font-size:15px">Hi ${input.providerName},</p>
      <p style="font-size:14px;color:#475569"><strong>${input.briefTitle}</strong> went ${input.slaHours} hours without a first response, so under the response guarantee it has been released back to other providers.</p>
      ${refundLine}
      <p style="font-size:13px;color:#64748b">Repeated releases affect your marketplace standing. If you're heading away, pause your standing orders and set your availability to "not taking new clients" so accepts don't land while you can't respond.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * Consumer side of a clawback: their request is live again and other
 * providers have been notified — no action needed from them.
 */
export async function sendConsumerSlaReopened(input: {
  consumerEmail: string;
  consumerName: string;
  briefTitle: string;
  briefSlug: string;
  slaHours: number;
}): Promise<boolean> {
  const trackerUrl = `${SITE_URL}/briefs/${input.briefSlug}`;
  const greeting = input.consumerName ? `Hi ${input.consumerName},` : "Hi,";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.consumerEmail,
    subject: `Your Match Request is open again — ${input.briefTitle}`,
    html: wrap(
      "We've re-opened your Match Request",
      `<p style="font-size:15px">${greeting}</p>
      <p style="font-size:14px;color:#475569">The provider who accepted <strong>${input.briefTitle}</strong> didn't respond within ${input.slaHours} hours. That's not the experience we want for you, so we've released your request and notified other eligible providers — there's nothing you need to do.</p>
      ${btn(trackerUrl, "View your request →")}
      <p style="font-size:12px;color:#64748b">You can edit or withdraw your request from the tracker at any time.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * Engagement check-in (30d / 90d) and annual adviser review (365d).
 * One-click status links keep the relationship registry honest; the
 * annual variant invites a 2-minute review. Factual framing only — we
 * never suggest switching, only offer the option to compare.
 */
export async function sendEngagementCheckin(input: {
  consumerEmail: string;
  providerName: string;
  briefTitle: string;
  stage: number;
  annual: boolean;
  /** Path beginning /engagement/<token> — SITE_URL is prepended here. */
  checkinUrl: string;
}): Promise<boolean> {
  const base = `${SITE_URL}${input.checkinUrl}`;
  const subject = input.annual
    ? `Your annual adviser review — ${input.providerName}`
    : `How's it going with ${input.providerName}?`;
  const intro = input.annual
    ? `<p style="font-size:14px;color:#475569">It's been about a year since <strong>${input.providerName}</strong> accepted your request "${input.briefTitle}". A 2-minute review keeps your account up to date and helps other Australians — your answers are confidential.</p>`
    : `<p style="font-size:14px;color:#475569">A while back <strong>${input.providerName}</strong> accepted your request "${input.briefTitle}". One tap tells us where things stand — no login needed.</p>`;
  const buttons = input.annual
    ? btn(`${base}?annual=1`, "Start your 2-minute review →")
    : `<div style="text-align:center;margin:24px 0">
        <a href="${base}?status=engaged" style="display:inline-block;margin:4px;padding:10px 20px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600">Going well</a>
        <a href="${base}?status=completed" style="display:inline-block;margin:4px;padding:10px 20px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600">It's wrapped up</a>
        <a href="${base}?status=ended" style="display:inline-block;margin:4px;padding:10px 20px;background:#64748b;color:white;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600">We didn't proceed</a>
      </div>`;
  const { ok } = await sendEmail({
    from: FROM,
    to: input.consumerEmail,
    subject,
    html: wrap(
      input.annual ? "Your annual adviser review" : "Quick check-in",
      `<p style="font-size:15px">Hi,</p>
      ${intro}
      ${buttons}
      <p style="font-size:12px;color:#64748b">This is the last automatic check-in for this stage — nothing happens if you ignore it.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * Invite a provider to join an expert team (AJ-2). Sent on invite creation so
 * the invitee actually learns they were invited — previously no email was sent,
 * so invitations were undiscoverable. Links to the accept landing page, which
 * works for existing pros (accept directly) and new pros (sign up, then accept).
 */
export async function sendTeamInvitation(input: {
  email: string;
  inviteeName: string | null;
  teamName: string;
  inviterName: string | null;
  token: string;
}): Promise<boolean> {
  const acceptUrl = `${SITE_URL}/teams/accept-invite?token=${encodeURIComponent(input.token)}`;
  const greeting = input.inviteeName ? `Hi ${input.inviteeName},` : "Hi,";
  const inviter = input.inviterName
    ? `${input.inviterName} has invited you`
    : "You've been invited";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.email,
    subject: `You're invited to join ${input.teamName} on Invest.com.au`,
    html: wrap(
      `Join ${input.teamName}`,
      `<p style="font-size:15px">${greeting}</p>
      <p style="font-size:14px;color:#475569">${inviter} to join the team <strong>${input.teamName}</strong> as a provider on Invest.com.au. Team members receive matched client Match Requests in the team's shared inbox.</p>
      ${btn(acceptUrl, "View &amp; accept invitation →")}
      <p style="font-size:12px;color:#64748b">This invitation expires in 7 days. If you weren't expecting it, you can safely ignore this email.</p>
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
  /** Enables reply-by-email into the brief chat when provided. */
  briefId?: number;
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
    replyTo: briefReplyTo(input.briefId),
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

// ─── Consultation booking (MM33) ─────────────────────────────────────────

/**
 * Pro is notified that a consumer booked one of their availability
 * slots. Fired by POST /api/briefs/[slug]/book-slot. Best-effort —
 * failures are swallowed and logged inside `sendEmail`.
 */
export async function sendProConsultationBooked(input: {
  providerEmail: string;
  providerName: string;
  consumerName: string;
  consumerEmail: string;
  briefTitle: string;
  briefSlug: string;
  startAt: string;
  endAt: string;
  notes: string | null;
}): Promise<boolean> {
  const trackerUrl = `${SITE_URL}/briefs/${input.briefSlug}`;
  const notesLine = input.notes
    ? `<p style="font-size:13px;color:#475569;margin:8px 0"><strong>Notes from consumer:</strong> ${input.notes}</p>`
    : "";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.providerEmail,
    subject: `Consultation booked — ${input.briefTitle}`,
    html: wrap(
      "A consumer booked a consultation",
      `<p style="font-size:15px">Hi ${input.providerName},</p>
      <p style="font-size:14px;color:#475569">A consumer just booked one of your open availability slots. Please confirm the call and (optionally) paste a Google Meet or Zoom link.</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0">${input.briefTitle}</p>
        <p style="font-size:13px;color:#475569;margin:4px 0"><strong>When:</strong> ${input.startAt} → ${input.endAt}</p>
        <p style="font-size:13px;color:#475569;margin:4px 0"><strong>Consumer:</strong> ${input.consumerName || input.consumerEmail}</p>
        ${notesLine}
      </div>
      ${btn(trackerUrl, "View brief →")}
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * Consumer is notified that their booking was registered. They'll get a
 * follow-up `sendConsumerConsultationConfirmed` when the pro confirms.
 */
export async function sendConsumerConsultationPending(input: {
  consumerEmail: string;
  consumerName: string;
  providerName: string;
  briefTitle: string;
  briefSlug: string;
  startAt: string;
  endAt: string;
}): Promise<boolean> {
  const trackerUrl = `${SITE_URL}/briefs/${input.briefSlug}`;
  const { ok } = await sendEmail({
    from: FROM,
    to: input.consumerEmail,
    subject: `Consultation requested — ${input.briefTitle}`,
    html: wrap(
      "Consultation booked",
      `<p style="font-size:15px">Hi ${input.consumerName || "there"},</p>
      <p style="font-size:14px;color:#475569">You've booked a consultation with <strong>${input.providerName}</strong>. They'll confirm shortly and share a meeting link.</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0">${input.briefTitle}</p>
        <p style="font-size:13px;color:#475569;margin:4px 0"><strong>When:</strong> ${input.startAt} → ${input.endAt}</p>
      </div>
      ${btn(trackerUrl, "View status →")}
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * Consumer is notified that the pro confirmed the consultation and
 * (optionally) attached a meeting URL.
 */
export async function sendConsumerConsultationConfirmed(input: {
  consumerEmail: string;
  consumerName: string;
  providerName: string;
  briefTitle: string;
  briefSlug: string;
  startAt: string;
  endAt: string;
  meetUrl: string | null;
}): Promise<boolean> {
  const trackerUrl = `${SITE_URL}/briefs/${input.briefSlug}`;
  const meetingLine = input.meetUrl
    ? `<p style="font-size:13px;color:#475569;margin:8px 0"><strong>Meeting link:</strong> <a href="${input.meetUrl}" style="color:#0f172a">${input.meetUrl}</a></p>`
    : `<p style="font-size:13px;color:#475569;margin:8px 0">${input.providerName} will share the meeting link separately.</p>`;
  const { ok } = await sendEmail({
    from: FROM,
    to: input.consumerEmail,
    subject: `Consultation confirmed — ${input.briefTitle}`,
    html: wrap(
      "Consultation confirmed",
      `<p style="font-size:15px">Hi ${input.consumerName || "there"},</p>
      <p style="font-size:14px;color:#475569"><strong>${input.providerName}</strong> confirmed your consultation.</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0">${input.briefTitle}</p>
        <p style="font-size:13px;color:#475569;margin:4px 0"><strong>When:</strong> ${input.startAt} → ${input.endAt}</p>
        ${meetingLine}
      </div>
      ${btn(trackerUrl, "View status →")}
      ${disclosure()}`,
    ),
  });
  return ok;
}

// ─── Group Briefs (demand pools, idea #17) ───────────────────────────────

/**
 * A member of a demand pool is told a verified pro posted a GROUP OFFER on
 * their pool. Each member individually accepts or declines on their tracker —
 * the email is purely a routing nudge to the brief's Quote Status page (which
 * already gates by email-as-key). Group "rates" are the pro's own quoted
 * package pricing; the platform never intermediates the money.
 */
export async function sendPoolOfferReceived(input: {
  consumerEmail: string;
  briefSlug: string;
  advisorName: string;
  templateKey: string;
  memberCount: number;
}): Promise<boolean> {
  const trackerUrl = `${SITE_URL}/briefs/${input.briefSlug}`;
  const need = input.templateKey.replace(/_/g, " ");
  const { ok } = await sendEmail({
    from: FROM,
    to: input.consumerEmail,
    subject: `A group offer arrived on your Match Request`,
    html: wrap(
      "A verified pro made a group offer",
      `<p style="font-size:15px">Hi there,</p>
      <p style="font-size:14px;color:#475569">You joined a group of <strong>${input.memberCount}</strong> ${input.memberCount === 1 ? "person" : "people"} with a similar ${need} need this month. <strong>${input.advisorName}</strong> has posted a group offer — a package and availability you can take up or pass on. Each person decides individually; nothing is shared until you accept.</p>
      ${btn(trackerUrl, "View the offer →")}
      <p style="font-size:12px;color:#64748b">The package rate shown is the pro's own quoted pricing. Invest.com.au provides marketplace introductions only — the service is delivered by the professional under their own licence.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * A pro is told a pool member accepted their group offer — their contact
 * details are unlocked and the brief chat is open. Reply-by-email lands in the
 * brief chat when BRIEF_REPLY_SECRET is configured.
 */
export async function sendProviderPoolOfferAccepted(input: {
  providerEmail: string;
  providerName: string;
  briefTitle: string;
  briefSlug: string;
  creditsSpent: number;
  /** Enables reply-by-email into the brief chat when provided. */
  briefId?: number;
}): Promise<boolean> {
  const inboxUrl = `${SITE_URL}/advisor-portal/briefs`;
  const chargeLine =
    input.creditsSpent > 0
      ? `<p style="font-size:13px;color:#475569;margin:8px 0 0 0"><strong>Charged:</strong> ${input.creditsSpent} credits (group rate — volume discount applied)</p>`
      : "";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.providerEmail,
    replyTo: briefReplyTo(input.briefId),
    subject: `Group offer accepted — ${input.briefTitle}`,
    html: wrap(
      "A member accepted your group offer",
      `<p style="font-size:15px">Hi ${input.providerName},</p>
      <p style="font-size:14px;color:#475569">A member of your demand pool accepted your group offer. Their contact details are unlocked in your inbox and the chat is open — they've been told you accepted, so a fast first response matters.</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0">${input.briefTitle}</p>
        ${chargeLine}
      </div>
      ${btn(inboxUrl, "Open the brief →")}
      <p style="font-size:12px;color:#64748b">Other members may still accept your offer separately — each acceptance is its own engagement.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}
