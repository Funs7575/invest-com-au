/**
 * Squad-to-squad (Expert Team) marketplace emails — cross-team workflows
 * (claim notifications, referrals, assignments). Distinct from
 * `lib/marketplace-emails.ts` which handles consumer ↔ provider mail.
 *
 * Compliance: passive language only ("Sarah claimed the brief"), never
 * advice phrasing. Consumer-facing terminology uses "Match Request" /
 * "Pro Squad" per `lib/consumer-copy.ts`.
 *
 * Every helper is fire-and-forget — failures are logged but never thrown,
 * so an email blip can't break an API response.
 */

// eslint-disable-next-line no-restricted-imports -- cross-team email needs to read members across teams; service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { SITE_URL } from "@/lib/seo";

const log = logger("marketplace-squad-emails");

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

export interface ReferralReceivedEmailInput {
  toTeamId: number;
  briefId: number;
  fromTeamName: string;
  note: string | null;
}

/**
 * Notify the receiving squad that a brief was referred to them.
 *
 * Strategy: look up the receiving team's slug and active members'
 * professional emails, send one email per receiving member that can
 * receive briefs. Never throws — returns the count of successful sends.
 */
export async function sendReferralReceivedEmail(
  input: ReferralReceivedEmailInput,
): Promise<{ sent: number }> {
  try {
    const admin = createAdminClient();

    const { data: team, error: teamErr } = await admin
      .from("expert_teams")
      .select("id, slug, name")
      .eq("id", input.toTeamId)
      .maybeSingle();
    if (teamErr || !team) {
      log.warn("to-team lookup failed", { error: teamErr?.message });
      return { sent: 0 };
    }

    const { data: members, error: memErr } = await admin
      .from("expert_team_members")
      .select("professional_id, can_receive_briefs, status")
      .eq("team_id", input.toTeamId)
      .eq("status", "active");
    if (memErr) {
      log.warn("members lookup failed", { error: memErr.message });
      return { sent: 0 };
    }
    const proIds = (members ?? [])
      .filter((m) => m.can_receive_briefs)
      .map((m) => m.professional_id as number);
    if (proIds.length === 0) return { sent: 0 };

    const { data: pros, error: prosErr } = await admin
      .from("professionals")
      .select("email, name")
      .in("id", proIds);
    if (prosErr) {
      log.warn("professionals lookup failed", { error: prosErr.message });
      return { sent: 0 };
    }

    const teamSlug = team.slug as string;
    const teamName = team.name as string;
    const referralsUrl = `${SITE_URL}/teams/${teamSlug}/referrals`;
    const fromName = escapeHtml(input.fromTeamName);
    const noteBlock = input.note
      ? `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin:12px 0"><p style="font-size:12px;color:#64748b;margin:0 0 4px 0">Note from ${fromName}</p><p style="font-size:13px;color:#0f172a;margin:0;white-space:pre-wrap">${escapeHtml(input.note)}</p></div>`
      : "";

    let sent = 0;
    for (const pro of (pros ?? []) as { email: string | null; name: string | null }[]) {
      if (!pro.email) continue;
      const { ok } = await sendEmail({
        from: FROM,
        to: pro.email,
        subject: `New brief referral from ${input.fromTeamName} — ${teamName}`,
        html: wrap(
          "Brief referred to your squad",
          `<p style="font-size:15px">Hi ${escapeHtml(pro.name ?? "there")},</p>
          <p style="font-size:14px;color:#475569"><strong>${fromName}</strong> referred a brief to <strong>${escapeHtml(teamName)}</strong> because it sits within your squad's scope. Review and accept to claim the brief for your team, or decline if it's not the right fit.</p>
          ${noteBlock}
          ${btn(referralsUrl, "Review incoming referrals →")}
          <p style="font-size:12px;color:#64748b">Accepting will claim the brief for your squad and notify the consumer.</p>
          ${disclosure()}`,
        ),
      });
      if (ok) sent += 1;
    }

    return { sent };
  } catch (err) {
    log.error("sendReferralReceivedEmail failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { sent: 0 };
  }
}
