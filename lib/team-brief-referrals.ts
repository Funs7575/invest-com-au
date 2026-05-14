/**
 * Team brief referrals — one verified Expert Team forwards an out-of-scope
 * brief to another verified team. Receiving squad accepts (and claims the
 * brief for their team) or declines.
 *
 * Service-role legitimate per CLAUDE.md: cross-team writes that can't be
 * scoped to `auth.uid()` (we update the brief's `accepted_by_team_id` and
 * the referral row in two different teams' contexts). The API routes
 * `requireAdvisorSession()` and pass the caller's `professional_id` so we
 * can verify active membership in the relevant team before each mutation.
 *
 * Doesn't depend on `lib/team-brief-assignments.ts` (PR #836 worktree) —
 * acceptance does a direct UPDATE on `advisor_auctions` so the order of
 * landing isn't load-bearing.
 */

// eslint-disable-next-line no-restricted-imports -- cross-team writes; service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("team-brief-referrals");

export type ReferralStatus = "pending" | "accepted" | "declined" | "expired";

export interface TeamBriefReferral {
  id: number;
  brief_id: number;
  from_team_id: number;
  to_team_id: number;
  from_professional_id: number | null;
  note: string | null;
  status: ReferralStatus;
  responded_at: string | null;
  responded_by_professional_id: number | null;
  created_at: string;
}

export interface CreateReferralInput {
  briefId: number;
  fromTeamId: number;
  toTeamId: number;
  fromProfessionalId: number;
  note?: string | null;
}

export class ReferralError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = "ReferralError";
  }
}

/** Returns true if the professional is an active member of the team. */
async function assertActiveMember(
  teamId: number,
  professionalId: number,
): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("expert_team_members")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("professional_id", professionalId)
    .maybeSingle();
  if (error) {
    log.error("membership lookup failed", { error: error.message });
    throw new ReferralError("membership_lookup_failed", error.message);
  }
  if (!data || data.status !== "active") {
    throw new ReferralError("not_team_member");
  }
}

/**
 * Create a referral from one verified team to another.
 *
 * Guards:
 *  - caller must be an active member of from_team_id
 *  - can't refer to self
 *  - both teams must be verified
 *  - no existing pending referral for (brief, to_team) — DB-enforced via UNIQUE
 *  - brief must exist and not yet be accepted/closed
 */
export async function createReferral(
  input: CreateReferralInput,
): Promise<TeamBriefReferral> {
  const {
    briefId,
    fromTeamId,
    toTeamId,
    fromProfessionalId,
    note = null,
  } = input;

  if (fromTeamId === toTeamId) {
    throw new ReferralError("self_referral_not_allowed");
  }

  await assertActiveMember(fromTeamId, fromProfessionalId);

  const admin = createAdminClient();

  // Both teams must be verified Expert Teams.
  const { data: teams, error: teamsErr } = await admin
    .from("expert_teams")
    .select("id, verification_status")
    .in("id", [fromTeamId, toTeamId]);
  if (teamsErr) {
    log.error("teams lookup failed", { error: teamsErr.message });
    throw new ReferralError("teams_lookup_failed", teamsErr.message);
  }
  const teamRows = (teams ?? []) as { id: number; verification_status: string }[];
  if (teamRows.length !== 2) {
    throw new ReferralError("team_not_found");
  }
  for (const row of teamRows) {
    if (row.verification_status !== "verified") {
      throw new ReferralError("team_not_verified");
    }
  }

  // Brief must exist and not yet be accepted.
  const { data: brief, error: briefErr } = await admin
    .from("advisor_auctions")
    .select("id, accepted_by_team_id, accepted_by_professional_id")
    .eq("id", briefId)
    .maybeSingle();
  if (briefErr) {
    log.error("brief lookup failed", { error: briefErr.message });
    throw new ReferralError("brief_lookup_failed", briefErr.message);
  }
  if (!brief) {
    throw new ReferralError("brief_not_found");
  }
  if (brief.accepted_by_team_id || brief.accepted_by_professional_id) {
    throw new ReferralError("brief_already_accepted");
  }

  // Reject duplicate referrals up-front (UNIQUE will also stop this at the DB,
  // but a typed error code is nicer for the API to surface).
  const { data: existing } = await admin
    .from("team_brief_referrals")
    .select("id, status")
    .eq("brief_id", briefId)
    .eq("to_team_id", toTeamId)
    .maybeSingle();
  if (existing) {
    throw new ReferralError("duplicate_referral");
  }

  const { data, error } = await admin
    .from("team_brief_referrals")
    .insert({
      brief_id: briefId,
      from_team_id: fromTeamId,
      to_team_id: toTeamId,
      from_professional_id: fromProfessionalId,
      note,
      status: "pending",
    })
    .select("*")
    .single();
  if (error || !data) {
    log.error("insert failed", { error: error?.message });
    // UNIQUE violation surfaces as 23505 — treat as duplicate.
    if (error?.message?.includes("uq_team_brief_referrals")) {
      throw new ReferralError("duplicate_referral");
    }
    throw new ReferralError("insert_failed", error?.message);
  }
  return data as TeamBriefReferral;
}

/**
 * Internal: fetch a referral by id (admin client; callers verify membership).
 */
async function getReferralById(
  referralId: number,
): Promise<TeamBriefReferral | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_brief_referrals")
    .select("*")
    .eq("id", referralId)
    .maybeSingle();
  if (error) {
    log.error("getReferralById failed", { error: error.message });
    throw new ReferralError("referral_lookup_failed", error.message);
  }
  return (data as TeamBriefReferral | null) ?? null;
}

/**
 * Accept a referral.
 *
 * - caller must be an active member of to_team_id
 * - referral must still be pending
 * - claims the brief for to_team_id by setting `accepted_by_team_id` +
 *   `accepted_at` directly on `advisor_auctions` (does NOT call the
 *   PR #836 `claimBriefForMember` helper — keeps merge order independent).
 */
export async function acceptReferral(
  referralId: number,
  professionalId: number,
): Promise<TeamBriefReferral> {
  const referral = await getReferralById(referralId);
  if (!referral) throw new ReferralError("referral_not_found");
  if (referral.status !== "pending") {
    throw new ReferralError("referral_not_pending");
  }

  await assertActiveMember(referral.to_team_id, professionalId);

  const admin = createAdminClient();

  // Claim the brief for the receiving team. Guard against a concurrent
  // acceptance by another team / individual by filtering on the still-open
  // condition: accepted_by_team_id IS NULL AND accepted_by_professional_id
  // IS NULL.
  const { data: claimed, error: claimErr } = await admin
    .from("advisor_auctions")
    .update({
      accepted_by_team_id: referral.to_team_id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", referral.brief_id)
    .is("accepted_by_team_id", null)
    .is("accepted_by_professional_id", null)
    .select("id")
    .maybeSingle();
  if (claimErr) {
    log.error("brief claim failed", { error: claimErr.message });
    throw new ReferralError("brief_claim_failed", claimErr.message);
  }
  if (!claimed) {
    // Someone else accepted the brief while this referral was pending.
    throw new ReferralError("brief_already_accepted");
  }

  const { data: updated, error: updErr } = await admin
    .from("team_brief_referrals")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
      responded_by_professional_id: professionalId,
    })
    .eq("id", referralId)
    .eq("status", "pending")
    .select("*")
    .single();
  if (updErr || !updated) {
    log.error("referral update failed", { error: updErr?.message });
    throw new ReferralError("referral_update_failed", updErr?.message);
  }
  return updated as TeamBriefReferral;
}

/**
 * Decline a referral. Caller must be on the to_team_id; referral must be pending.
 * Does not touch the brief — it stays available for other teams.
 */
export async function declineReferral(
  referralId: number,
  professionalId: number,
): Promise<TeamBriefReferral> {
  const referral = await getReferralById(referralId);
  if (!referral) throw new ReferralError("referral_not_found");
  if (referral.status !== "pending") {
    throw new ReferralError("referral_not_pending");
  }

  await assertActiveMember(referral.to_team_id, professionalId);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_brief_referrals")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
      responded_by_professional_id: professionalId,
    })
    .eq("id", referralId)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error || !data) {
    log.error("decline failed", { error: error?.message });
    throw new ReferralError("referral_update_failed", error?.message);
  }
  return data as TeamBriefReferral;
}

/**
 * List incoming referrals for a team (most recent first). Used by the
 * receiving squad's inbox.
 */
export async function listIncomingForTeam(
  teamId: number,
): Promise<TeamBriefReferral[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_brief_referrals")
    .select("*")
    .eq("to_team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    log.error("listIncoming failed", { error: error.message });
    return [];
  }
  return (data as TeamBriefReferral[]) ?? [];
}

/**
 * List outgoing referrals sent by a team.
 */
export async function listOutgoingForTeam(
  teamId: number,
): Promise<TeamBriefReferral[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_brief_referrals")
    .select("*")
    .eq("from_team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    log.error("listOutgoing failed", { error: error.message });
    return [];
  }
  return (data as TeamBriefReferral[]) ?? [];
}
