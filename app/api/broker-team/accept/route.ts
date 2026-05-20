/**
 * POST /api/broker-team/accept — accept a broker team invitation (Phase 2.3).
 *
 * Body: { token }
 *
 * Validates the token is pending + unexpired, resolves the caller's
 * broker_account, creates an active membership at the invited role, and
 * marks the invitation accepted. Idempotent on the membership (UNIQUE
 * org+account upsert).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:broker-team:accept");

export const runtime = "nodejs";

const Body = z.object({ token: z.string().min(10).max(200) });

export const POST = withValidatedBody(Body, async (req, body) => {
  if (!(await isAllowed("broker_team_accept", ipKey(req), { max: 10, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Resolve caller's broker account.
  const { data: account } = await admin
    .from("broker_accounts")
    .select("id, email")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!account) {
    return NextResponse.json({ error: "no_broker_account" }, { status: 403 });
  }

  // Look up the invitation.
  const { data: invite, error: invErr } = await admin
    .from("broker_team_invitations")
    .select("id, org_id, role, status, expires_at, email")
    .eq("token", body.token)
    .maybeSingle();
  if (invErr || !invite) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "already_used" }, { status: 409 });
  }
  // Bind the token to the address it was sent to — a leaked/forwarded
  // token shouldn't let a different broker account claim the seat.
  if (
    (invite.email as string | null)?.trim().toLowerCase() !==
    (account.email as string | null)?.trim().toLowerCase()
  ) {
    return NextResponse.json({ error: "wrong_account" }, { status: 403 });
  }
  if (new Date(invite.expires_at as string).getTime() < Date.now()) {
    await admin
      .from("broker_team_invitations")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  // Create the membership (idempotent on UNIQUE org+account).
  const { error: memErr } = await admin
    .from("broker_team_memberships")
    .upsert(
      {
        org_id: invite.org_id,
        broker_account_id: account.id,
        role: invite.role,
        status: "active",
      },
      { onConflict: "org_id,broker_account_id" },
    );
  if (memErr) {
    log.warn("membership upsert failed", {
      orgId: invite.org_id,
      error: memErr.message,
    });
    return NextResponse.json({ error: "membership_failed" }, { status: 500 });
  }

  // Link broker_account → org for convenience.
  await admin
    .from("broker_accounts")
    .update({ broker_org_id: invite.org_id })
    .eq("id", account.id)
    .is("broker_org_id", null);

  // Mark the invitation accepted.
  await admin
    .from("broker_team_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true, org_id: invite.org_id, role: invite.role });
});
