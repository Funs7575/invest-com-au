/**
 * Team management depth — searchable advisor invites + roster admin (Idea #16).
 *
 * Lets a squad (expert_team) admin SEARCH the advisor directory and invite a
 * known professional by profile (not just raw email), manage member roles,
 * and curate the roster. Squads + firms are made of `professionals`, so this
 * operates on expert_team_members / expert_team_invitations.
 *
 * Permission model: a team "admin" is the team's owner_professional_id OR a
 * member with member_role='lead'. All mutating helpers take the caller's
 * professional id and verify admin rights before acting.
 *
 * Privacy: searchInvitableAdvisors returns ONLY public directory fields
 * (name, firm, type, specialties, location, verified) — never email or
 * private columns. Invite-by-profile resolves the advisor's email
 * server-side for the notification but never returns it to the client.
 *
 * See docs/audits/identity-platform-expansion-2026-05-20.md (Wave 2, #16).
 */

// eslint-disable-next-line no-restricted-imports -- cross-user / service-role-managed reads with no per-user JWT path (see CLAUDE.md § "Two Supabase clients").
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import crypto from "node:crypto";

const log = logger("team-management");

export type SquadRole = "lead" | "member";

export interface InvitableAdvisor {
  professionalId: number;
  name: string;
  firmName: string | null;
  type: string;
  specialties: string[];
  locationDisplay: string | null;
  verified: boolean;
}

export interface RosterMember {
  professionalId: number;
  name: string;
  firmName: string | null;
  role: SquadRole;
  status: string;
  publicTitle: string | null;
}

/** Public directory columns only — never email / private fields. */
const PUBLIC_ADVISOR_COLUMNS =
  "id, name, firm_name, type, specialties, location_display, verified";

/**
 * Resolve the caller's professional id from their auth user id.
 */
export async function professionalIdForUser(authUserId: string): Promise<number | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("professionals")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return (data?.id as number | undefined) ?? null;
}

/**
 * True if `professionalId` is an admin of `teamId` (owner or lead member).
 */
export async function isSquadAdmin(teamId: number, professionalId: number): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: team } = await supabase
    .from("expert_teams")
    .select("owner_professional_id, lead_professional_id")
    .eq("id", teamId)
    .maybeSingle();
  if (team && (team.owner_professional_id === professionalId || team.lead_professional_id === professionalId)) {
    return true;
  }
  const { data: membership } = await supabase
    .from("expert_team_members")
    .select("member_role, status")
    .eq("team_id", teamId)
    .eq("professional_id", professionalId)
    .maybeSingle();
  return membership?.status === "active" && membership?.member_role === "lead";
}

/**
 * Search the advisor directory for professionals invitable to a team.
 * Returns public fields only; excludes advisors already on the team
 * (active or pending invite). Caps at 25 results.
 */
export async function searchInvitableAdvisors(opts: {
  teamId: number;
  query?: string;
  type?: string;
  state?: string;
}): Promise<InvitableAdvisor[]> {
  const supabase = createAdminClient();

  // Existing members + pending invitees to exclude.
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("expert_team_members").select("professional_id").eq("team_id", opts.teamId),
    supabase
      .from("expert_team_invitations")
      .select("invited_professional_id")
      .eq("team_id", opts.teamId)
      .eq("status", "pending"),
  ]);
  const excluded = new Set<number>([
    ...((members ?? []).map((m) => m.professional_id as number)),
    ...((invites ?? [])
      .map((i) => i.invited_professional_id as number | null)
      .filter((x): x is number => x != null)),
  ]);

  let q = supabase
    .from("professionals")
    .select(PUBLIC_ADVISOR_COLUMNS)
    .eq("status", "active")
    .limit(50);
  if (opts.query) q = q.ilike("name", `%${opts.query}%`);
  if (opts.type) q = q.eq("type", opts.type);
  if (opts.state) q = q.eq("location_state", opts.state);

  const { data, error } = await q;
  if (error) {
    log.warn("searchInvitableAdvisors failed", { teamId: opts.teamId, error: error.message });
    return [];
  }

  return (data ?? [])
    .filter((r) => !excluded.has(r.id as number))
    .slice(0, 25)
    .map((r) => ({
      professionalId: r.id as number,
      name: r.name as string,
      firmName: (r.firm_name as string | null) ?? null,
      type: r.type as string,
      specialties: Array.isArray(r.specialties) ? (r.specialties as string[]) : [],
      locationDisplay: (r.location_display as string | null) ?? null,
      verified: r.verified === true,
    }));
}

/**
 * Invite an advisor to a team by their profile id. Verifies the caller is a
 * team admin, resolves the advisor's email server-side, and creates a
 * pending expert_team_invitations row with a 7-day token. Returns the token
 * (for the invite link) or null on failure / not authorised.
 */
export async function inviteAdvisorToSquad(opts: {
  teamId: number;
  professionalId: number;
  role: SquadRole;
  invitedByProfessionalId: number;
}): Promise<{ token: string; expiresAt: string } | null> {
  if (!(await isSquadAdmin(opts.teamId, opts.invitedByProfessionalId))) {
    log.warn("inviteAdvisorToSquad: caller not a team admin", {
      teamId: opts.teamId,
      caller: opts.invitedByProfessionalId,
    });
    return null;
  }

  const supabase = createAdminClient();
  const { data: advisor } = await supabase
    .from("professionals")
    .select("email, name")
    .eq("id", opts.professionalId)
    .maybeSingle();
  if (!advisor?.email) {
    log.warn("inviteAdvisorToSquad: advisor has no email", { professionalId: opts.professionalId });
    return null;
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("expert_team_invitations").insert({
    team_id: opts.teamId,
    email: advisor.email,
    name: advisor.name,
    invited_professional_id: opts.professionalId,
    invited_role: opts.role,
    invited_by: opts.invitedByProfessionalId,
    token,
    expires_at: expiresAt,
  });
  if (error) {
    log.warn("inviteAdvisorToSquad insert failed", { teamId: opts.teamId, error: error.message });
    return null;
  }

  void recordAudit({
    actorKind: "human",
    action: "squad.invite_advisor",
    resourceType: "expert_team",
    resourceId: opts.teamId,
    summary: `Invited professional #${opts.professionalId} as ${opts.role}`,
    metadata: { professional_id: opts.professionalId, role: opts.role },
  });

  return { token, expiresAt };
}

/**
 * List a team's roster (active + pending members) with public advisor detail.
 */
export async function listSquadRoster(teamId: number): Promise<RosterMember[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("expert_team_members")
    .select("professional_id, member_role, status, public_title, professionals(name, firm_name)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });
  if (error) {
    log.warn("listSquadRoster failed", { teamId, error: error.message });
    return [];
  }
  return (data ?? []).map((r) => {
    const prof = (r as unknown as { professionals: { name: string; firm_name: string | null } | null }).professionals;
    return {
      professionalId: r.professional_id as number,
      name: prof?.name ?? `Advisor #${r.professional_id}`,
      firmName: prof?.firm_name ?? null,
      role: (r.member_role as SquadRole) ?? "member",
      status: r.status as string,
      publicTitle: (r.public_title as string | null) ?? null,
    };
  });
}

/**
 * Change a member's role. Admin-gated. Cannot demote the team owner.
 */
export async function setSquadMemberRole(opts: {
  teamId: number;
  targetProfessionalId: number;
  role: SquadRole;
  callerProfessionalId: number;
}): Promise<boolean> {
  if (!(await isSquadAdmin(opts.teamId, opts.callerProfessionalId))) return false;
  const supabase = createAdminClient();
  const { data: team } = await supabase
    .from("expert_teams")
    .select("owner_professional_id")
    .eq("id", opts.teamId)
    .maybeSingle();
  if (team?.owner_professional_id === opts.targetProfessionalId) {
    log.warn("setSquadMemberRole: refusing to change owner's role", { teamId: opts.teamId });
    return false;
  }
  const { error } = await supabase
    .from("expert_team_members")
    .update({ member_role: opts.role })
    .eq("team_id", opts.teamId)
    .eq("professional_id", opts.targetProfessionalId);
  if (error) {
    log.warn("setSquadMemberRole failed", { teamId: opts.teamId, error: error.message });
    return false;
  }
  void recordAudit({
    actorKind: "human",
    action: "squad.set_member_role",
    resourceType: "expert_team",
    resourceId: opts.teamId,
    summary: `Set professional #${opts.targetProfessionalId} to ${opts.role}`,
  });
  return true;
}

/**
 * Remove a member (soft — status='removed'). Admin-gated. Cannot remove owner.
 */
export async function removeSquadMember(opts: {
  teamId: number;
  targetProfessionalId: number;
  callerProfessionalId: number;
}): Promise<boolean> {
  if (!(await isSquadAdmin(opts.teamId, opts.callerProfessionalId))) return false;
  const supabase = createAdminClient();
  const { data: team } = await supabase
    .from("expert_teams")
    .select("owner_professional_id")
    .eq("id", opts.teamId)
    .maybeSingle();
  if (team?.owner_professional_id === opts.targetProfessionalId) return false;
  const { error } = await supabase
    .from("expert_team_members")
    .update({ status: "removed" })
    .eq("team_id", opts.teamId)
    .eq("professional_id", opts.targetProfessionalId);
  if (error) {
    log.warn("removeSquadMember failed", { teamId: opts.teamId, error: error.message });
    return false;
  }
  void recordAudit({
    actorKind: "human",
    action: "squad.remove_member",
    resourceType: "expert_team",
    resourceId: opts.teamId,
    summary: `Removed professional #${opts.targetProfessionalId}`,
  });
  return true;
}
