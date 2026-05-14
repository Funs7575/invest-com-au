/**
 * Pro Squad creation emails — confirmation + invite notifications fired by
 * the `/api/teams/new` self-service wizard.
 *
 * Mirrors the visual wrapper pattern in `lib/marketplace-emails.ts`:
 * fire-and-forget, never throws, all copy uses passive routing language
 * consistent with the marketplace terminology guidance.
 *
 * Three helpers:
 *   - sendSquadCreatedConfirmation — to the creator after submit.
 *   - sendSquadMemberInvite        — to an existing professional being added
 *     to a freshly-created squad (immediate active membership pending their
 *     ack on next sign-in).
 *   - sendSquadInvitePending       — to a non-existing email — sign-up
 *     prompt with the invitation link.
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

/**
 * Sent to the advisor who just submitted a new Pro Squad. The squad is in
 * "submitted" verification status pending admin review.
 */
export async function sendSquadCreatedConfirmation(input: {
  creatorEmail: string;
  creatorName: string;
  squadName: string;
  squadSlug: string;
}): Promise<boolean> {
  const teamUrl = `${SITE_URL}/teams/${input.squadSlug}`;
  const { ok } = await sendEmail({
    from: FROM,
    to: input.creatorEmail,
    subject: `Your Pro Squad "${input.squadName}" is in review`,
    html: wrap(
      "Your Pro Squad is in review",
      `<p style="font-size:15px">Hi ${input.creatorName || "there"},</p>
      <p style="font-size:14px;color:#475569">Thanks for creating <strong>${input.squadName}</strong>. Our team reviews new squads within 1 business day. Once verified the squad will become publicly visible and eligible to receive Match Requests.</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-size:13px;color:#475569;margin:0"><strong>What happens next</strong></p>
        <ul style="font-size:13px;color:#475569;margin:8px 0 0 18px;padding:0">
          <li>We confirm member licences and disclosures.</li>
          <li>You'll be emailed once the squad is verified or if we need more details.</li>
          <li>Invited members receive their own onboarding emails.</li>
        </ul>
      </div>
      ${btn(teamUrl, "View your squad")}
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * Sent to an existing professional already in the `professionals` table
 * who has been added to a newly-created Pro Squad as a pending member.
 */
export async function sendSquadMemberInvite(input: {
  inviteeEmail: string;
  inviteeName: string | null;
  creatorName: string;
  squadName: string;
  squadSlug: string;
  role: string;
}): Promise<boolean> {
  const teamUrl = `${SITE_URL}/teams/${input.squadSlug}`;
  const { ok } = await sendEmail({
    from: FROM,
    to: input.inviteeEmail,
    subject: `${input.creatorName} added you to the ${input.squadName} Pro Squad`,
    html: wrap(
      "You've been added to a Pro Squad",
      `<p style="font-size:15px">Hi ${input.inviteeName || "there"},</p>
      <p style="font-size:14px;color:#475569"><strong>${input.creatorName}</strong> added you to the <strong>${input.squadName}</strong> Pro Squad as a <em>${input.role}</em>. Once you accept and the squad is verified by our team, Match Requests matching the squad's selected templates will route to the squad.</p>
      ${btn(teamUrl, "Review the squad")}
      <p style="font-size:12px;color:#64748b">If this wasn't expected you can decline from the squad page or reply to this email.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}

/**
 * Sent to an email address that does NOT match an existing professional.
 * Prompts sign-up before they can accept the invitation.
 */
export async function sendSquadInvitePending(input: {
  inviteeEmail: string;
  creatorName: string;
  squadName: string;
  invitationToken: string;
  role: string;
}): Promise<boolean> {
  const acceptUrl = `${SITE_URL}/pros/join?invitation=${encodeURIComponent(input.invitationToken)}`;
  const { ok } = await sendEmail({
    from: FROM,
    to: input.inviteeEmail,
    subject: `${input.creatorName} invited you to the ${input.squadName} Pro Squad`,
    html: wrap(
      "You're invited to a Pro Squad",
      `<p style="font-size:15px">Hi there,</p>
      <p style="font-size:14px;color:#475569"><strong>${input.creatorName}</strong> invited you to join the <strong>${input.squadName}</strong> Pro Squad on Invest.com.au as a <em>${input.role}</em>. To accept, finish your Invest.com.au professional profile — it takes about 5 minutes.</p>
      ${btn(acceptUrl, "Sign up and accept")}
      <p style="font-size:12px;color:#64748b">This invitation expires in 7 days. If you weren't expecting this, you can safely ignore it.</p>
      ${disclosure()}`,
    ),
  });
  return ok;
}
