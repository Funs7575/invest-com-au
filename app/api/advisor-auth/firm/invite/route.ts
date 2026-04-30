import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { randomBytes } from "crypto";
import { sendFirmInvitation } from "@/lib/advisor-emails";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth:firm:invite");

async function getFirmAdmin(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return null;

  const admin = createAdminClient();
  const { data: advisor } = await admin
    .from("professionals")
    .select("id, name, firm_id, is_firm_admin")
    .eq("id", advisorId)
    .single();

  if (!advisor?.is_firm_admin || !advisor.firm_id) return null;
  return advisor;
}

export async function POST(request: NextRequest) {
  try {
    const advisor = await getFirmAdmin(request);
    if (!advisor) return NextResponse.json({ error: "Only firm admins can invite members" }, { status: 403 });

    const admin = createAdminClient();

    const { data: firm } = await admin
      .from("advisor_firms")
      .select("id, name, max_seats, status")
      .eq("id", advisor.firm_id)
      .single();

    if (!firm || firm.status !== "active") {
      return NextResponse.json({ error: "Firm not active" }, { status: 400 });
    }

    const { count: memberCount } = await admin
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", firm.id);

    if ((memberCount || 0) >= firm.max_seats) {
      return NextResponse.json({ error: `Team is at max capacity (${firm.max_seats} members)` }, { status: 400 });
    }

    const body = await request.json();
    const { email, name: inviteeName } = body;

    if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const { data: existingInvite } = await admin
      .from("advisor_firm_invitations")
      .select("id")
      .eq("firm_id", firm.id)
      .eq("email", email.toLowerCase().trim())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: "This email has already been invited" }, { status: 409 });
    }

    const { data: existingMember } = await admin
      .from("professionals")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .eq("firm_id", firm.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "This person is already a team member" }, { status: 409 });
    }

    const token = randomBytes(32).toString("hex");
    const { error } = await admin.from("advisor_firm_invitations").insert({
      firm_id: firm.id,
      email: email.toLowerCase().trim(),
      name: inviteeName?.trim() || null,
      invited_by: advisor.id,
      token,
    });

    if (error) {
      log.error("[firm-invite] insert failed:", error);
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
    }

    const siteUrl = getSiteUrl(request.headers.get("host"));
    const acceptUrl = `${siteUrl}/advisor-apply?invite=${token}`;
    sendFirmInvitation(email, inviteeName, firm.name, advisor.name, acceptUrl).catch((err) =>
      log.error("[firm-invite] email failed:", err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("[firm-invite] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const advisor = await getFirmAdmin(request);
    if (!advisor) return NextResponse.json({ error: "Not a firm admin" }, { status: 403 });

    const admin = createAdminClient();

    const { data: invitations } = await admin
      .from("advisor_firm_invitations")
      .select("id, email, name, status, created_at, expires_at")
      .eq("firm_id", advisor.firm_id)
      .order("created_at", { ascending: false });

    const { data: members } = await admin
      .from("professionals")
      .select("id, name, slug, email, type, photo_url, verified, status, created_at")
      .eq("firm_id", advisor.firm_id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ invitations: invitations || [], members: members || [] });
  } catch (error) {
    log.error("[firm-invite] get error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const advisor = await getFirmAdmin(request);
    if (!advisor) return NextResponse.json({ error: "Only firm admins can manage invitations" }, { status: 403 });

    const admin = createAdminClient();

    const body = await request.json();
    const { inviteId, action } = body;

    if (!inviteId || !["revoke", "resend"].includes(action)) {
      return NextResponse.json({ error: "inviteId and action (revoke|resend) required" }, { status: 400 });
    }

    const { data: invite } = await admin
      .from("advisor_firm_invitations")
      .select("id, email, name, status, firm_id")
      .eq("id", inviteId)
      .eq("firm_id", advisor.firm_id)
      .single();

    if (!invite) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

    if (action === "revoke") {
      if (invite.status !== "pending") {
        return NextResponse.json({ error: "Only pending invitations can be revoked" }, { status: 400 });
      }
      await admin.from("advisor_firm_invitations").update({ status: "revoked" }).eq("id", inviteId);
      return NextResponse.json({ success: true });
    }

    if (invite.status !== "pending" && invite.status !== "expired") {
      return NextResponse.json({ error: "Only pending or expired invitations can be resent" }, { status: 400 });
    }

    const { data: firm } = await admin
      .from("advisor_firms")
      .select("name, max_seats, status")
      .eq("id", advisor.firm_id)
      .single();

    if (!firm || firm.status !== "active") {
      return NextResponse.json({ error: "Firm not active" }, { status: 400 });
    }

    const newToken = randomBytes(32).toString("hex");
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await admin
      .from("advisor_firm_invitations")
      .update({ token: newToken, status: "pending", expires_at: newExpiresAt })
      .eq("id", inviteId);

    const siteUrl = getSiteUrl(request.headers.get("host"));
    const acceptUrl = `${siteUrl}/advisor-apply?invite=${newToken}`;
    sendFirmInvitation(invite.email, invite.name || undefined, firm.name, advisor.name, acceptUrl).catch((err) =>
      log.error("[firm-invite] resend email failed:", err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("[firm-invite] patch error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
