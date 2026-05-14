/**
 * Expert Teams — CRUD + invitation flow.
 *
 * Mirrors the pattern in `app/api/advisor-auth/firm/invite/route.ts` but
 * operates on `expert_teams` / `expert_team_members` / `expert_team_invitations`.
 *
 * The owner is the calling professional. Verification is required before
 * a team can appear publicly or receive briefs.
 */

// eslint-disable-next-line no-restricted-imports -- multi-row writes across professionals/teams; service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";

const log = logger("expert-teams");

export type TeamType = "same_firm" | "independent" | "private_referral" | "internal_firm";

export type TeamVerificationStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "rejected"
  | "suspended";

export interface ExpertTeam {
  id: number;
  slug: string;
  name: string;
  team_category: string;
  team_type: TeamType;
  description: string | null;
  niche: string | null;
  location_state: string | null;
  service_areas: string[];
  owner_professional_id: number;
  lead_professional_id: number | null;
  firm_id: number | null;
  disclosure: string | null;
  accepted_brief_templates: string[];
  accepts_briefs: boolean;
  verification_status: TeamVerificationStatus;
  verified_at: string | null;
  public: boolean;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpertTeamMember {
  id: number;
  team_id: number;
  professional_id: number;
  member_role: string;
  public_title: string | null;
  can_receive_briefs: boolean;
  can_appear_publicly: boolean;
  status: "pending" | "active" | "removed";
  accepted_at: string | null;
}

export interface ExpertTeamInvitation {
  id: number;
  team_id: number;
  email: string;
  name: string | null;
  invited_professional_id: number | null;
  invited_role: string;
  invited_by: number;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface CreateTeamInput {
  ownerProfessionalId: number;
  name: string;
  teamCategory: string;
  teamType: TeamType;
  description?: string;
  niche?: string;
  locationState?: string;
  serviceAreas?: string[];
  firmId?: number | null;
  disclosure?: string;
  acceptedBriefTemplates?: string[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function createTeam(input: CreateTeamInput): Promise<ExpertTeam> {
  const admin = createAdminClient();
  const slug = `${slugify(input.name)}-${Date.now().toString(36)}`;

  const { data, error } = await admin
    .from("expert_teams")
    .insert({
      slug,
      name: input.name.trim(),
      team_category: input.teamCategory,
      team_type: input.teamType,
      description: input.description ?? null,
      niche: input.niche ?? null,
      location_state: input.locationState ?? null,
      service_areas: input.serviceAreas ?? [],
      owner_professional_id: input.ownerProfessionalId,
      lead_professional_id: input.ownerProfessionalId,
      firm_id: input.firmId ?? null,
      disclosure: input.disclosure ?? null,
      accepted_brief_templates: input.acceptedBriefTemplates ?? [],
      verification_status: "draft",
      public: false,
      accepts_briefs: false,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`createTeam failed: ${error?.message ?? "no row"}`);
  }

  // Owner becomes the lead member automatically.
  await admin
    .from("expert_team_members")
    .insert({
      team_id: data.id,
      professional_id: input.ownerProfessionalId,
      member_role: "lead",
      can_receive_briefs: true,
      can_appear_publicly: true,
      status: "active",
      accepted_at: new Date().toISOString(),
    })
    .throwOnError();

  return data as ExpertTeam;
}

export async function getTeamById(id: number): Promise<ExpertTeam | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("expert_teams").select("*").eq("id", id).maybeSingle();
  return (data as ExpertTeam) ?? null;
}

export async function getTeamBySlug(slug: string): Promise<ExpertTeam | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("expert_teams").select("*").eq("slug", slug).maybeSingle();
  return (data as ExpertTeam) ?? null;
}

export async function listMembers(teamId: number): Promise<ExpertTeamMember[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("expert_team_members")
    .select("*")
    .eq("team_id", teamId)
    .order("status", { ascending: true });
  return (data as ExpertTeamMember[]) ?? [];
}

export async function listInvitations(teamId: number): Promise<ExpertTeamInvitation[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("expert_team_invitations")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  return (data as ExpertTeamInvitation[]) ?? [];
}

export interface InviteMemberInput {
  teamId: number;
  invitedByProfessionalId: number;
  email: string;
  name?: string;
  role?: string;
}

export async function inviteMember(input: InviteMemberInput): Promise<ExpertTeamInvitation> {
  const admin = createAdminClient();
  const email = input.email.toLowerCase().trim();

  const { data: existing } = await admin
    .from("expert_team_invitations")
    .select("id")
    .eq("team_id", input.teamId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    throw new Error("invitation_already_pending");
  }

  const { data: maybePro } = await admin
    .from("professionals")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (maybePro) {
    const { data: alreadyMember } = await admin
      .from("expert_team_members")
      .select("id, status")
      .eq("team_id", input.teamId)
      .eq("professional_id", maybePro.id)
      .maybeSingle();
    if (alreadyMember && alreadyMember.status !== "removed") {
      throw new Error("already_member");
    }
  }

  const token = randomBytes(32).toString("hex");

  const { data, error } = await admin
    .from("expert_team_invitations")
    .insert({
      team_id: input.teamId,
      email,
      name: input.name ?? null,
      invited_professional_id: maybePro?.id ?? null,
      invited_role: input.role ?? "member",
      invited_by: input.invitedByProfessionalId,
      token,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`inviteMember failed: ${error?.message ?? "no row"}`);
  return data as ExpertTeamInvitation;
}

export async function getInvitationByToken(
  token: string,
): Promise<ExpertTeamInvitation | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("expert_team_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return (data as ExpertTeamInvitation) ?? null;
}

export interface AcceptInvitationInput {
  token: string;
  professionalId: number;
}

export async function acceptInvitation({
  token,
  professionalId,
}: AcceptInvitationInput): Promise<{ teamId: number }> {
  const admin = createAdminClient();
  const invite = await getInvitationByToken(token);
  if (!invite) throw new Error("invalid_invitation");
  if (invite.status !== "pending") throw new Error("invitation_unavailable");
  if (new Date(invite.expires_at) < new Date()) {
    await admin
      .from("expert_team_invitations")
      .update({ status: "expired" })
      .eq("id", invite.id);
    throw new Error("invitation_expired");
  }

  // Promote/insert the membership.
  const { data: existing } = await admin
    .from("expert_team_members")
    .select("id")
    .eq("team_id", invite.team_id)
    .eq("professional_id", professionalId)
    .maybeSingle();

  if (existing) {
    await admin
      .from("expert_team_members")
      .update({ status: "active", accepted_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await admin
      .from("expert_team_members")
      .insert({
        team_id: invite.team_id,
        professional_id: professionalId,
        member_role: invite.invited_role,
        status: "active",
        accepted_at: new Date().toISOString(),
      })
      .throwOnError();
  }

  await admin
    .from("expert_team_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return { teamId: invite.team_id };
}

export async function submitForVerification(
  teamId: number,
  professionalId: number,
): Promise<ExpertTeam> {
  const admin = createAdminClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();
  if (!team) throw new Error("team_not_found");
  if (team.owner_professional_id !== professionalId) throw new Error("not_owner");

  // Sanity gate — team must have a lead, ≥1 active member, category, disclosure,
  // accepted brief templates, before submission.
  const { count: activeMemberCount } = await admin
    .from("expert_team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("status", "active");

  const missing: string[] = [];
  if (!team.lead_professional_id) missing.push("lead_professional");
  if (!activeMemberCount || activeMemberCount < 1) missing.push("active_member");
  if (!team.team_category) missing.push("team_category");
  if (!team.disclosure) missing.push("disclosure");
  if (!team.accepted_brief_templates || team.accepted_brief_templates.length === 0) {
    missing.push("accepted_brief_templates");
  }
  if (!team.description) missing.push("description");
  if (missing.length > 0) {
    log.info("submitForVerification rejected — missing fields", { teamId, missing });
    throw new Error(`incomplete:${missing.join(",")}`);
  }

  const { data, error } = await admin
    .from("expert_teams")
    .update({
      verification_status: "submitted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", teamId)
    .select("*")
    .single();
  if (error || !data) throw new Error(`submitForVerification failed: ${error?.message}`);
  return data as ExpertTeam;
}

export interface AdminVerifyInput {
  teamId: number;
  approved: boolean;
  rejectionReason?: string;
  acceptsBriefs?: boolean;
}

export async function adminVerify({
  teamId,
  approved,
  rejectionReason,
  acceptsBriefs,
}: AdminVerifyInput): Promise<ExpertTeam> {
  const admin = createAdminClient();
  const updates: Record<string, unknown> = approved
    ? {
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        public: true,
        accepts_briefs: acceptsBriefs ?? true,
        rejection_reason: null,
      }
    : {
        verification_status: "rejected",
        rejection_reason: rejectionReason ?? "Did not meet verification criteria.",
        public: false,
        accepts_briefs: false,
      };
  const { data, error } = await admin
    .from("expert_teams")
    .update(updates)
    .eq("id", teamId)
    .select("*")
    .single();
  if (error || !data) throw new Error(`adminVerify failed: ${error?.message}`);
  return data as ExpertTeam;
}

export async function listTeamsForProfessional(
  professionalId: number,
): Promise<ExpertTeam[]> {
  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("expert_team_members")
    .select("team_id, status")
    .eq("professional_id", professionalId)
    .in("status", ["active", "pending"]);
  const teamIds = (memberships ?? []).map((m) => m.team_id as number);
  if (teamIds.length === 0) return [];
  const { data } = await admin.from("expert_teams").select("*").in("id", teamIds);
  return (data as ExpertTeam[]) ?? [];
}

export async function listVerifiedTeams(opts?: {
  category?: string;
  acceptsBriefsOnly?: boolean;
}): Promise<ExpertTeam[]> {
  const admin = createAdminClient();
  let q = admin
    .from("expert_teams")
    .select("*")
    .eq("public", true)
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false })
    .limit(50);
  if (opts?.category) q = q.eq("team_category", opts.category);
  if (opts?.acceptsBriefsOnly) q = q.eq("accepts_briefs", true);
  const { data } = await q;
  return (data as ExpertTeam[]) ?? [];
}

export async function isProfessionalOnTeam(
  teamId: number,
  professionalId: number,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("expert_team_members")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("professional_id", professionalId)
    .maybeSingle();
  return Boolean(data && data.status === "active");
}
