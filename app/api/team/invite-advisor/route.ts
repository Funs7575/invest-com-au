/**
 * POST /api/team/invite-advisor — invite an advisor to a squad by profile (Idea #16).
 *
 * Body: { teamId, professionalId, role }
 * Caller must be a team admin (owner or lead). Sends a best-effort invite
 * email with the token link.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { professionalIdForUser, inviteAdvisorToSquad } from "@/lib/team-management";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/html-escape";
import { logger } from "@/lib/logger";

const log = logger("api:team:invite-advisor");

export const runtime = "nodejs";

const Body = z.object({
  teamId: z.number().int().positive(),
  professionalId: z.number().int().positive(),
  role: z.enum(["lead", "member"]),
});

export const POST = withValidatedBody(Body, async (_req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const callerProfId = await professionalIdForUser(user.id);
  if (!callerProfId) return NextResponse.json({ error: "not_a_professional" }, { status: 403 });

  const invite = await inviteAdvisorToSquad({
    teamId: body.teamId,
    professionalId: body.professionalId,
    role: body.role,
    invitedByProfessionalId: callerProfId,
  });
  if (!invite) {
    // Either not authorised, or the advisor has no email / insert failed.
    return NextResponse.json({ error: "invite_failed" }, { status: 403 });
  }

  // Best-effort notification.
  const admin = createAdminClient();
  const [{ data: advisor }, { data: team }] = await Promise.all([
    admin.from("professionals").select("email, name").eq("id", body.professionalId).maybeSingle(),
    admin.from("expert_teams").select("name, slug").eq("id", body.teamId).maybeSingle(),
  ]);
  if (advisor?.email && team) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";
    const acceptUrl = `${siteUrl}/teams/${team.slug}/join?token=${invite.token}`;
    const result = await sendEmail({
      to: advisor.email,
      subject: `You've been invited to join ${team.name} on Invest.com.au`,
      html: `<p>Hi ${escapeHtml(advisor.name ?? "there")},</p>
<p>You've been invited to join the <strong>${escapeHtml(team.name)}</strong> expert team as ${body.role}.</p>
<p><a href="${acceptUrl}">Review &amp; accept the invitation</a> (expires in 7 days).</p>`,
    });
    if (!result.ok) {
      log.warn("invite-advisor email failed", { teamId: body.teamId, error: result.error });
    }
  }

  return NextResponse.json({ ok: true, expires_at: invite.expiresAt });
});
