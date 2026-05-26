/**
 * /api/clubs/[clubId]/invite
 *
 * POST — create a 7-day single-use invite token (club members only)
 * GET  — validate a token and join the club (authenticated, requires ?token=)
 *
 * Rate-limits: 20/min/IP
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ipKey, isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:clubs:invite");

type Params = { params: Promise<{ clubId: string }> };

// ── POST — generate invite ────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await isAllowed("clubs_invite_post", ipKey(req), { max: 20, refillPerSec: 0.33 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { clubId } = await params;

  // Must be a member
  const { data: membership } = await supabase
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "not_member" }, { status: 403 });

  // Check member limit
  const { data: club } = await supabase
    .from("investment_clubs")
    .select("member_limit")
    .eq("id", clubId)
    .single();
  const { count: memberCount } = await supabase
    .from("club_members")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId);
  if ((memberCount ?? 0) >= (club?.member_limit ?? 20)) {
    return NextResponse.json({ error: "Club is at member limit." }, { status: 422 });
  }

  const { data: invite, error } = await supabase
    .from("club_invitations")
    .insert({ club_id: clubId, invited_by_user_id: user.id })
    .select("invite_token, expires_at")
    .single();

  if (error || !invite) {
    log.warn("invite create failed", { error: error?.message });
    return NextResponse.json({ error: "Could not create invite." }, { status: 500 });
  }

  log.info("invite created", { userId: user.id, clubId });
  return NextResponse.json({ token: invite.invite_token, expiresAt: invite.expires_at });
}

// ── GET — join via token ──────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  if (!(await isAllowed("clubs_invite_get", ipKey(req), { max: 20, refillPerSec: 0.33 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { clubId } = await params;
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token is required." }, { status: 400 });

  const displayNameRaw = new URL(req.url).searchParams.get("displayName");
  const displayName = displayNameRaw?.trim().slice(0, 40) || "Member";

  // Validate token
  const { data: invite } = await supabase
    .from("club_invitations")
    .select("id, club_id, expires_at, used_at")
    .eq("invite_token", token)
    .eq("club_id", clubId)
    .single();

  if (!invite) return NextResponse.json({ error: "Invalid or expired invite." }, { status: 404 });
  if (invite.used_at) return NextResponse.json({ error: "Invite already used." }, { status: 409 });
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite has expired." }, { status: 410 });
  }

  // Already a member?
  const { data: existing } = await supabase
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();
  if (existing) {
    return NextResponse.json({ ok: true, alreadyMember: true, clubId });
  }

  // Check member limit
  const { data: club } = await supabase
    .from("investment_clubs")
    .select("member_limit")
    .eq("id", clubId)
    .single();
  const { count: memberCount } = await supabase
    .from("club_members")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId);
  if ((memberCount ?? 0) >= (club?.member_limit ?? 20)) {
    return NextResponse.json({ error: "Club is at member limit." }, { status: 422 });
  }

  // Join + mark token used
  const { error: joinErr } = await supabase
    .from("club_members")
    .insert({ club_id: clubId, user_id: user.id, role: "member", display_name: displayName });

  if (joinErr) {
    log.warn("join failed", { error: joinErr.message });
    return NextResponse.json({ error: "Could not join club." }, { status: 500 });
  }

  await supabase
    .from("club_invitations")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id);

  log.info("user joined club via invite", { userId: user.id, clubId });
  return NextResponse.json({ ok: true, alreadyMember: false, clubId });
}
