/**
 * Pro Squad notification emails — for the team-inbox claim workflow
 * (MM04). Kept separate from `lib/marketplace-emails.ts` to avoid
 * bloating that file as the marketplace surface grows.
 *
 * Compliance: passive language only ("Sarah claimed the brief"), never
 * advice phrasing. Consumer-facing terminology uses "Match Request" /
 * "Pro Squad" per `lib/consumer-copy.ts`.
 *
 * All helpers return `Promise<boolean>` and never throw — emails are
 * fire-and-forget background work that must never block the API
 * response. Failures are logged but swallowed.
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
 * Sent fire-and-forget to every other active member of the Pro Squad when
 * one member claims an accepted Match Request. Recipient excludes the
 * claimer themselves.
 *
 * Copy is passive: "Sarah claimed the brief" — never "Sarah will advise".
 */
export async function sendSquadClaimNotification(input: {
  recipientEmail: string;
  recipientName: string;
  claimerName: string;
  teamSlug: string;
  teamName: string;
  briefTitle: string;
}): Promise<boolean> {
  const inboxUrl = `${SITE_URL}/teams/${input.teamSlug}/inbox`;
  const { ok } = await sendEmail({
    from: FROM,
    to: input.recipientEmail,
    subject: `${input.claimerName} claimed the ${input.briefTitle} Match Request`,
    html: wrap(
      "A squad-mate has claimed a Match Request",
      `<p style="font-size:15px">Hi ${input.recipientName || "there"},</p>
      <p style="font-size:14px;color:#475569"><strong>${input.claimerName}</strong> claimed the <strong>${input.briefTitle}</strong> Match Request for ${input.teamName}.</p>
      <p style="font-size:13px;color:#475569">View the squad inbox to see who is on what, hand off a brief, or pick up an unclaimed one.</p>
      ${btn(inboxUrl, "Open the squad inbox →")}
      ${disclosure()}`,
    ),
  });
  return ok;
}
