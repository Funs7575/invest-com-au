/**
 * Email templates for the /pros/join provider onboarding wizard.
 *
 * Three transactional emails:
 *   - welcome-pro:   sent on successful /api/pros/join submission. "We'll
 *                    review within 1 business day."
 *   - pro-approved:  sent when an admin approves a pending professional in
 *                    /admin/professionals/queue. Mentions the free starter
 *                    credits.
 *   - pro-rejected:  sent when an admin rejects with a reason.
 *
 * Matches the visual style of lib/advisor-emails.ts so the marketplace
 * onboarding emails look consistent with the legacy /advisor-apply flow.
 *
 * Each function returns `boolean` (ok / not ok); none throw — callers can
 * fire-and-forget without try/catch. Caller is expected to await so we get
 * the structured Resend error in the route log if it fails.
 */

import { sendEmail } from "@/lib/resend";

function emailWrapper(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155"><div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:18px">${title}</h1></div><div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">${body}</div></div>`;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!to) return false;
  const { ok } = await sendEmail({
    to,
    subject,
    html,
    from: "Invest.com.au <hello@invest.com.au>",
  });
  return ok;
}

function firstName(fullName: string): string {
  return (fullName.trim().split(" ")[0] || "there").trim();
}

/**
 * Sent immediately after a successful /api/pros/join submission.
 * Matches the brief copy: "Thanks for applying. We'll review within 1
 * business day."
 */
export async function sendWelcomePro(email: string, name: string): Promise<boolean> {
  const fn = firstName(name);
  return send(
    email,
    "Application received — Invest.com.au Marketplace",
    emailWrapper(
      "Application Received",
      `<p style="font-size:15px">Hi ${fn},</p>
      <p style="font-size:14px;color:#64748b">Thanks for applying to join the Invest.com.au provider marketplace. Our verification team will review your credentials within <strong>1 business day</strong>.</p>
      <p style="font-size:14px;color:#64748b">Once verified, you'll receive a follow-up email with login instructions and your starter credits so you can begin accepting Match Requests.</p>
      <p style="font-size:13px;color:#64748b"><strong>What we'll check:</strong></p>
      <ul style="font-size:13px;color:#64748b;padding-left:20px;margin:4px 0 16px">
        <li>ASIC AFSL / credit licence (where applicable)</li>
        <li>Professional registration (e.g. TPB, Law Society)</li>
        <li>ABN active status</li>
      </ul>
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">Questions? Reply to this email.</p>`,
    ),
  );
}

/**
 * Sent when an admin approves a pending professional from the queue.
 * Mentions the starter credit grant so the recipient knows their balance
 * is funded before they log in.
 */
export async function sendProApproved(
  email: string,
  name: string,
  options: { starterCredits: number; portalUrl: string },
): Promise<boolean> {
  const fn = firstName(name);
  const { starterCredits, portalUrl } = options;
  const creditLine =
    starterCredits > 0
      ? `Your first <strong>${starterCredits} credits are on us</strong> so you can test Match Requests before topping up.`
      : `Top up credits anytime from your portal to start accepting Match Requests.`;
  return send(
    email,
    "You're verified — start accepting Match Requests",
    emailWrapper(
      "Application Approved",
      `<p style="font-size:15px">Hi ${fn},</p>
      <p style="font-size:14px;color:#64748b">Good news — your application to the Invest.com.au provider marketplace has been <strong>verified</strong>.</p>
      <p style="font-size:14px;color:#64748b">${creditLine}</p>
      <div style="text-align:center;margin:24px 0"><a href="${portalUrl}" style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Open your portal &rarr;</a></div>
      <p style="font-size:13px;color:#64748b"><strong>What's next:</strong></p>
      <ul style="font-size:13px;color:#64748b;padding-left:20px;margin:4px 0 16px">
        <li>Review incoming Match Requests in your inbox</li>
        <li>Use a credit to unlock a brief and contact the consumer</li>
        <li>Update your profile (photo, bio, fee range) so consumers can self-select</li>
      </ul>
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">Questions? Reply to this email.</p>`,
    ),
  );
}

/**
 * Sent when an admin rejects an application from the queue. Reason is
 * required by the admin route — surfaced verbatim in the email body so
 * the applicant knows what to fix on reapplication.
 */
export async function sendProRejected(
  email: string,
  name: string,
  reason: string,
): Promise<boolean> {
  const fn = firstName(name);
  return send(
    email,
    "Update on your Invest.com.au application",
    emailWrapper(
      "Application Update",
      `<p style="font-size:15px">Hi ${fn},</p>
      <p style="font-size:14px;color:#64748b">Thanks for your interest in joining the Invest.com.au provider marketplace. Unfortunately we couldn't verify your application at this time.</p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin:16px 0"><p style="font-size:13px;color:#92400e;margin:0"><strong>Reason:</strong> ${reason}</p></div>
      <p style="font-size:14px;color:#64748b">You're welcome to reapply with updated information. Common reasons include incomplete credentials, expired registration, or unreadable verification documents.</p>
      <div style="text-align:center;margin:24px 0"><a href="https://invest.com.au/pros/join" style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Reapply &rarr;</a></div>
      <p style="font-size:12px;color:#94a3b8;margin-top:20px">Questions? Reply to this email.</p>`,
    ),
  );
}
