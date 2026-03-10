import { ADMIN_EMAIL } from "@/lib/admin";

const RESEND_API_KEY = () => process.env.RESEND_API_KEY;

function emailWrapper(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;color:#334155"><div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:18px">${title}</h1></div><div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">${body}</div></div>`;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const key = RESEND_API_KEY();
  if (!key || !to) return false;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: "Invest.com.au <hello@invest.com.au>", to, subject, html }),
    });
    return true;
  } catch (err) {
    console.error("[advisor-emails] send failed:", err);
    return false;
  }
}

export async function sendApplicationConfirmation(email: string, name: string, accountType: 'individual' | 'firm'): Promise<boolean> {
  const firstName = name.trim().split(" ")[0];
  const typeLabel = accountType === 'firm' ? 'firm' : 'advisor';
  return send(email, "Application received — Invest.com.au Advisor Directory", emailWrapper(
    "Application Received",
    `<p style="font-size:15px">Hi ${firstName},</p>
    <p style="font-size:14px;color:#64748b">Thanks for applying to join the Invest.com.au advisor directory as ${accountType === 'firm' ? 'a firm' : 'an individual advisor'}. We'll review your credentials and get back to you within <strong>48 hours</strong>.</p>
    <p style="font-size:14px;color:#64748b">Once approved, you'll receive a login link to set up your ${typeLabel} profile and start receiving enquiries.</p>
    <p style="font-size:12px;color:#94a3b8;margin-top:20px">Questions? Reply to this email.</p>`
  ));
}

export async function sendApplicationApproved(email: string, name: string, loginUrl: string): Promise<boolean> {
  const firstName = name.trim().split(" ")[0];
  return send(email, "You're approved! Set up your advisor profile", emailWrapper(
    "Application Approved!",
    `<p style="font-size:15px">Hi ${firstName},</p>
    <p style="font-size:14px;color:#64748b">Great news — your application to join the Invest.com.au advisor directory has been <strong>approved</strong>.</p>
    <p style="font-size:14px;color:#64748b">Click below to log in and set up your profile. Add your photo, bio, specialties, and booking link to start receiving enquiries.</p>
    <div style="text-align:center;margin:24px 0"><a href="${loginUrl}" style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Set Up Your Profile →</a></div>
    <p style="font-size:13px;color:#64748b"><strong>What's next:</strong></p>
    <ul style="font-size:13px;color:#64748b;padding-left:20px">
      <li>Complete your profile (photo, bio, specialties)</li>
      <li>Add a booking link (Calendly, Cal.com, etc.)</li>
      <li>Start receiving enquiries from investors</li>
    </ul>
    <p style="font-size:12px;color:#94a3b8;margin-top:20px">This login link expires in 15 minutes. You can request a new one anytime from the <a href="https://invest.com.au/advisor-portal" style="color:#2563eb">advisor portal</a>.</p>`
  ));
}

export async function sendApplicationRejected(email: string, name: string, reason?: string): Promise<boolean> {
  const firstName = name.trim().split(" ")[0];
  return send(email, "Update on your Invest.com.au application", emailWrapper(
    "Application Update",
    `<p style="font-size:15px">Hi ${firstName},</p>
    <p style="font-size:14px;color:#64748b">Thanks for your interest in joining the Invest.com.au advisor directory. Unfortunately, we're unable to approve your application at this time.</p>
    ${reason ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin:16px 0"><p style="font-size:13px;color:#92400e;margin:0"><strong>Reason:</strong> ${reason}</p></div>` : ''}
    <p style="font-size:14px;color:#64748b">You're welcome to reapply with updated information. Common reasons include incomplete credentials or unverifiable registration details.</p>
    <div style="text-align:center;margin:24px 0"><a href="https://invest.com.au/advisor-apply" style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Reapply →</a></div>
    <p style="font-size:12px;color:#94a3b8;margin-top:20px">Questions? Reply to this email.</p>`
  ));
}

export async function sendFirmInvitation(email: string, inviteeName: string | undefined, firmName: string, inviterName: string, acceptUrl: string): Promise<boolean> {
  const greeting = inviteeName ? `Hi ${inviteeName.split(" ")[0]}` : "Hi there";
  return send(email, `${inviterName} invited you to join ${firmName} on Invest.com.au`, emailWrapper(
    "You're Invited",
    `<p style="font-size:15px">${greeting},</p>
    <p style="font-size:14px;color:#64748b"><strong>${inviterName}</strong> has invited you to join <strong>${firmName}</strong> on the Invest.com.au advisor directory.</p>
    <p style="font-size:14px;color:#64748b">As a team member, you'll get your own verified profile, receive enquiries, and manage your leads.</p>
    <div style="text-align:center;margin:24px 0"><a href="${acceptUrl}" style="display:inline-block;padding:12px 32px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Accept Invitation →</a></div>
    <p style="font-size:12px;color:#94a3b8;margin-top:20px">This invitation expires in 7 days. If you didn't expect this, ignore this email.</p>`
  ));
}

export async function sendAdminNotification(subject: string, body: string): Promise<boolean> {
  return send(ADMIN_EMAIL, subject, emailWrapper("Admin Notification", `<p style="font-size:14px;color:#64748b">${body}</p>`));
}
