/**
 * /api/broker-team — list + invite for broker partner teams (Phase 2.3).
 *
 * GET  → the caller's org + active members (any active member can view)
 * POST → create an invitation (requires manage_team capability = owner)
 *
 * Capability checks use lib/broker-teams. The caller is resolved from
 * their auth.users → broker_accounts row → active membership.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import {
  getBrokerOrgForAccount,
  listBrokerTeamMembers,
  hasBrokerCapability,
  createBrokerTeamInvitation,
  type BrokerTeamRole,
} from "@/lib/broker-teams";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/html-escape";
import { logger } from "@/lib/logger";

const log = logger("api:broker-team");

export const runtime = "nodejs";

/** Resolve the caller's broker_account id from their auth session. */
async function resolveBrokerAccountId(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("broker_accounts")
    .select("id")
    .eq("auth_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brokerAccountId = await resolveBrokerAccountId(user.id);
  if (!brokerAccountId) {
    return NextResponse.json({ error: "no_broker_account" }, { status: 403 });
  }

  const org = await getBrokerOrgForAccount(brokerAccountId);
  if (!org) {
    return NextResponse.json({ org: null, members: [] });
  }

  const members = await listBrokerTeamMembers(org.id);
  const canManage = await hasBrokerCapability({
    brokerAccountId,
    orgId: org.id,
    capability: "manage_team",
  });

  return NextResponse.json({ org, members, canManage });
}

const InviteBody = z.object({
  email: z.string().email().max(320),
  role: z.enum(["owner", "finance", "ops", "technical", "member"]),
});

export const POST = withValidatedBody(InviteBody, async (_req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brokerAccountId = await resolveBrokerAccountId(user.id);
  if (!brokerAccountId) {
    return NextResponse.json({ error: "no_broker_account" }, { status: 403 });
  }

  const org = await getBrokerOrgForAccount(brokerAccountId);
  if (!org) return NextResponse.json({ error: "no_org" }, { status: 403 });

  const canManage = await hasBrokerCapability({
    brokerAccountId,
    orgId: org.id,
    capability: "manage_team",
  });
  if (!canManage) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const invite = await createBrokerTeamInvitation({
    orgId: org.id,
    email: body.email,
    role: body.role as BrokerTeamRole,
    invitedByBrokerAccountId: brokerAccountId,
  });
  if (!invite) {
    return NextResponse.json({ error: "invite_failed" }, { status: 500 });
  }

  // Best-effort invite email. Failure doesn't roll back the invite row —
  // the token is valid and an admin can resend.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";
  const acceptUrl = `${siteUrl}/broker-portal/team/accept?token=${invite.token}`;
  const result = await sendEmail({
    to: body.email,
    subject: `You've been invited to join ${org.name} on Invest.com.au`,
    html: `<p>You've been invited to join <strong>${escapeHtml(org.name)}</strong> as ${body.role}.</p>
<p><a href="${acceptUrl}">Accept the invitation</a> (expires in 7 days).</p>`,
  });
  if (!result.ok) {
    log.warn("broker invite email failed", { orgId: org.id, error: result.error });
  }

  return NextResponse.json({ ok: true, expires_at: invite.expiresAt });
});
