/**
 * Household Workspace emails — the partner invitation fired by
 * `POST /api/account/household` (idea #6).
 *
 * Mirrors the visual wrapper + fire-and-forget pattern in
 * `lib/squad-creation-emails.ts`. Suppression is honoured automatically by
 * `sendEmail` (this is a lifecycle invite, NOT a legally-required transactional
 * send, so we never pass `bypassSuppression`).
 *
 * Copy is explicit that accepting grants the partner READ access to shared
 * items — the sharing model the migration enforces.
 */

import { sendEmail } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";

const FROM = "Invest.com.au <hello@invest.com.au>";

function wrap(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155"><div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:18px">${title}</h1></div><div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">${body}</div></div>`;
}

function btn(href: string, label: string, color = "#7c3aed"): string {
  return `<div style="text-align:center;margin:24px 0"><a href="${href}" style="display:inline-block;padding:12px 32px;background:${color};color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">${label}</a></div>`;
}

function disclosure(): string {
  return `<p style="font-size:11px;color:#94a3b8;margin-top:20px">General information only — not personal advice. <a href="${SITE_URL}/privacy" style="color:#94a3b8">Privacy</a> · <a href="${SITE_URL}/account/notifications" style="color:#94a3b8">Email preferences</a></p>`;
}

/**
 * Sent to the invited partner. The accept link carries the invite token; the
 * signed-in acceptor whose email matches claims membership.
 */
export async function sendHouseholdInvite(input: {
  inviteeEmail: string;
  inviterName: string | null;
  householdName: string;
  inviteToken: string;
}): Promise<boolean> {
  const acceptUrl = `${SITE_URL}/account/household/accept?token=${encodeURIComponent(
    input.inviteToken,
  )}`;
  const inviter = input.inviterName?.trim() || "Your partner";
  const { ok } = await sendEmail({
    from: FROM,
    to: input.inviteeEmail,
    subject: `${inviter} invited you to share a household on Invest.com.au`,
    html: wrap(
      "You're invited to a shared household",
      `<p style="font-size:15px">Hi there,</p>
      <p style="font-size:14px;color:#475569"><strong>${inviter}</strong> invited you to join <strong>${input.householdName}</strong> on Invest.com.au — a shared space for planning your money together.</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:13px;color:#475569;margin:0"><strong>What sharing a household means</strong></p>
        <ul style="font-size:13px;color:#475569;margin:8px 0 0 18px;padding:0">
          <li>You'll each be able to <strong>view</strong> the goals, balances and watchlist items the other chooses to share.</li>
          <li>Sharing grants <strong>read access only</strong> — only the owner of an item can edit or remove it.</li>
          <li>You stay in control: nothing of yours is shared until you turn it on, item by item.</li>
        </ul>
      </div>
      <p style="font-size:14px;color:#475569">To accept, sign in with this email address (<strong>${input.inviteeEmail}</strong>) and confirm.</p>
      ${btn(acceptUrl, "Review &amp; accept invitation")}
      <p style="font-size:12px;color:#64748b">If you weren't expecting this, you can safely ignore this email — nothing is shared unless you accept.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * Sent to the inviter once the partner accepts — closes the loop and nudges
 * them to start sharing items.
 */
export async function sendHouseholdAcceptedNotice(input: {
  inviterEmail: string;
  partnerLabel: string;
  householdName: string;
}): Promise<boolean> {
  const url = `${SITE_URL}/account/household`;
  const { ok } = await sendEmail({
    from: FROM,
    to: input.inviterEmail,
    subject: `${input.partnerLabel} joined your household`,
    html: wrap(
      "Your partner joined",
      `<p style="font-size:15px">Good news —</p>
      <p style="font-size:14px;color:#475569"><strong>${input.partnerLabel}</strong> accepted your invitation to <strong>${input.householdName}</strong>. You can now share goals, balances and watchlist items with each other.</p>
      <p style="font-size:13px;color:#475569">Open a goal, balance or watchlist item and switch on <em>"Share with household"</em> to start. Sharing grants read access only — you keep control of every item.</p>
      ${btn(url, "Open your household")}
      ${disclosure()}`,
    ),
  });
  return ok;
}
