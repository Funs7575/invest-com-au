/**
 * Pro Squad brief-claim ledger — helpers for the
 * /teams/[slug]/inbox + /api/teams/[slug]/briefs/[briefId]/{claim,handoff,
 * complete,release} flow added in MM04.
 *
 * A claim is one row in public.team_brief_assignments keyed by
 * (brief_id, professional_id). Status transitions:
 *
 *   - claim:    inserts a row with status='claimed' (no-op if same member
 *               already has a 'claimed' row → idempotent)
 *   - handoff:  flips the caller's row to status='handed_off' and stamps
 *               released_at; optionally inserts a fresh 'claimed' row for
 *               another team member.
 *   - complete: flips the caller's row to status='completed'.
 *   - release:  flips the caller's row to status='released'; brief goes
 *               back to the unclaimed pool.
 *
 * All helpers use the service-role admin client because the inbox writes
 * cross member rows on handoff and the RLS policies are scoped per-member.
 * Cross-row writes from a JWT path aren't possible without weakening RLS.
 */

// eslint-disable-next-line no-restricted-imports -- Cross-member writes (handoff inserts a row for ANOTHER professional). Per CLAUDE.md § "Two Supabase clients", cross-user writes that can't be scoped to auth.uid() are a legitimate service-role use case.
import { createAdminClient } from "@/lib/supabase/admin";

export type ClaimStatus = "claimed" | "handed_off" | "completed" | "released";

export interface TeamBriefAssignmentRow {
  id: number;
  brief_id: number;
  team_id: number;
  professional_id: number;
  status: ClaimStatus;
  notes: string | null;
  claimed_at: string;
  released_at: string | null;
}

export type ClaimOutcome =
  | { ok: true; row: TeamBriefAssignmentRow; created: boolean }
  | { ok: false; reason: "already_claimed_by_other"; row: TeamBriefAssignmentRow };

/**
 * Claim a brief for the given member. Idempotent: re-claiming an existing
 * 'claimed' row by the same caller returns { created: false } without
 * mutation. Returns 'already_claimed_by_other' when a different member
 * already has an active claim on the brief.
 */
export async function claimBriefForMember(input: {
  briefId: number;
  teamId: number;
  professionalId: number;
}): Promise<ClaimOutcome> {
  const admin = createAdminClient();

  // Is there already an active claim on this brief by ANY member?
  const { data: active } = await admin
    .from("team_brief_assignments")
    .select("*")
    .eq("brief_id", input.briefId)
    .eq("team_id", input.teamId)
    .in("status", ["claimed", "handed_off"])
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) {
    const row = active as TeamBriefAssignmentRow;
    if (row.professional_id === input.professionalId && row.status === "claimed") {
      // Idempotent re-claim by the same member.
      return { ok: true, row, created: false };
    }
    if (row.status === "claimed") {
      return { ok: false, reason: "already_claimed_by_other", row };
    }
  }

  // Re-claim: did the caller previously claim this brief and release it?
  // Re-activate the existing row instead of inserting a duplicate (the
  // UNIQUE (brief_id, professional_id) constraint would block the insert).
  const { data: priorOwn } = await admin
    .from("team_brief_assignments")
    .select("*")
    .eq("brief_id", input.briefId)
    .eq("professional_id", input.professionalId)
    .maybeSingle();

  if (priorOwn) {
    const { data: updated } = await admin
      .from("team_brief_assignments")
      .update({
        status: "claimed",
        released_at: null,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", (priorOwn as TeamBriefAssignmentRow).id)
      .select("*")
      .single();
    return {
      ok: true,
      row: updated as TeamBriefAssignmentRow,
      created: false,
    };
  }

  const { data: inserted } = await admin
    .from("team_brief_assignments")
    .insert({
      brief_id: input.briefId,
      team_id: input.teamId,
      professional_id: input.professionalId,
      status: "claimed",
    })
    .select("*")
    .single();

  return {
    ok: true,
    row: inserted as TeamBriefAssignmentRow,
    created: true,
  };
}

/**
 * Hand off a brief to another member. Flips the caller's row to
 * 'handed_off' (stamps released_at + note) and, if `toProfessionalId`
 * is supplied, inserts (or re-activates) a fresh 'claimed' row for
 * that member.
 *
 * The caller must own a current 'claimed' row on the brief — otherwise
 * returns null.
 */
export async function handoffBriefAssignment(input: {
  briefId: number;
  teamId: number;
  fromProfessionalId: number;
  toProfessionalId?: number | null;
  note?: string | null;
}): Promise<{
  fromRow: TeamBriefAssignmentRow;
  toRow: TeamBriefAssignmentRow | null;
} | null> {
  const admin = createAdminClient();

  const { data: own } = await admin
    .from("team_brief_assignments")
    .select("*")
    .eq("brief_id", input.briefId)
    .eq("professional_id", input.fromProfessionalId)
    .maybeSingle();

  if (!own) return null;
  const ownRow = own as TeamBriefAssignmentRow;
  // Permit handoff on either 'claimed' or 'handed_off' — re-handoff is OK.
  if (ownRow.status !== "claimed" && ownRow.status !== "handed_off") {
    return null;
  }

  const { data: updated } = await admin
    .from("team_brief_assignments")
    .update({
      status: "handed_off",
      released_at: new Date().toISOString(),
      notes: input.note ?? ownRow.notes,
    })
    .eq("id", ownRow.id)
    .select("*")
    .single();

  let toRow: TeamBriefAssignmentRow | null = null;
  if (input.toProfessionalId && input.toProfessionalId !== input.fromProfessionalId) {
    const claim = await claimBriefForMember({
      briefId: input.briefId,
      teamId: input.teamId,
      professionalId: input.toProfessionalId,
    });
    if (claim.ok) toRow = claim.row;
  }

  return {
    fromRow: updated as TeamBriefAssignmentRow,
    toRow,
  };
}

/**
 * Mark the caller's claim as completed. Idempotent — re-completing an
 * already-completed row is a no-op.
 */
export async function completeBriefAssignment(input: {
  briefId: number;
  professionalId: number;
}): Promise<TeamBriefAssignmentRow | null> {
  const admin = createAdminClient();
  const { data: own } = await admin
    .from("team_brief_assignments")
    .select("*")
    .eq("brief_id", input.briefId)
    .eq("professional_id", input.professionalId)
    .maybeSingle();
  if (!own) return null;
  const row = own as TeamBriefAssignmentRow;
  if (row.status === "completed") return row;

  const { data: updated } = await admin
    .from("team_brief_assignments")
    .update({ status: "completed" })
    .eq("id", row.id)
    .select("*")
    .single();
  return updated as TeamBriefAssignmentRow;
}

/**
 * Mark the caller's claim as released (returned to the unclaimed pool).
 * Idempotent — re-releasing an already-released row is a no-op.
 */
export async function releaseBriefAssignment(input: {
  briefId: number;
  professionalId: number;
}): Promise<TeamBriefAssignmentRow | null> {
  const admin = createAdminClient();
  const { data: own } = await admin
    .from("team_brief_assignments")
    .select("*")
    .eq("brief_id", input.briefId)
    .eq("professional_id", input.professionalId)
    .maybeSingle();
  if (!own) return null;
  const row = own as TeamBriefAssignmentRow;
  if (row.status === "released") return row;

  const { data: updated } = await admin
    .from("team_brief_assignments")
    .update({
      status: "released",
      released_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("*")
    .single();
  return updated as TeamBriefAssignmentRow;
}

/**
 * Fetch the latest active (claimed | handed_off) assignment for a brief.
 * Returns null when nobody has the brief.
 */
export async function getActiveAssignment(input: {
  briefId: number;
}): Promise<TeamBriefAssignmentRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("team_brief_assignments")
    .select("*")
    .eq("brief_id", input.briefId)
    .in("status", ["claimed", "handed_off"])
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as TeamBriefAssignmentRow) ?? null;
}

/**
 * Fetch every assignment row for a list of brief ids (used by the inbox to
 * render claim status badges).
 */
export async function listAssignmentsForBriefs(
  briefIds: number[],
): Promise<TeamBriefAssignmentRow[]> {
  if (briefIds.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("team_brief_assignments")
    .select("*")
    .in("brief_id", briefIds)
    .order("claimed_at", { ascending: false });
  return (data as TeamBriefAssignmentRow[]) ?? [];
}
