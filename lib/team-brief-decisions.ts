/**
 * Squad inbox decisions — "not for us" and "snooze 7 days" actions a team
 * member can apply to a brief that's been routed to their squad inbox.
 *
 * Backed by `team_brief_decisions` (one row per (team_id, brief_id,
 * decision) — UNIQUE index enforces idempotency). The squad inbox page
 * filters out briefs that have a `not_for_us` decision (forever) or a
 * `snoozed` decision newer than 7 days (until the snooze elapses).
 */

// eslint-disable-next-line no-restricted-imports -- service-role: API route resolves caller via advisor session then writes on their behalf with cross-row checks (team membership) that anon RLS can't see.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("team-brief-decisions");

export type DecisionKind = "not_for_us" | "snoozed";

export const SNOOZE_DAYS = 7;
const SNOOZE_MS = SNOOZE_DAYS * 24 * 60 * 60 * 1000;

export interface TeamBriefDecisionRow {
  id: number;
  team_id: number;
  brief_id: number;
  decision: DecisionKind;
  reason: string | null;
  decided_by_professional_id: number | null;
  created_at: string;
}

export class DecisionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface RecordDecisionInput {
  teamId: number;
  briefId: number;
  decision: DecisionKind;
  decidedByProfessionalId: number;
  reason?: string | null;
}

export async function recordDecision(
  input: RecordDecisionInput,
): Promise<TeamBriefDecisionRow> {
  const admin = createAdminClient();
  const reason = (input.reason ?? "").trim().slice(0, 1000) || null;
  // First clear any prior decision of the *other* kind on the same brief —
  // a snooze followed by "not for us" should leave only the latter, and a
  // re-snooze should refresh the timestamp.
  await admin
    .from("team_brief_decisions")
    .delete()
    .eq("team_id", input.teamId)
    .eq("brief_id", input.briefId);

  const { data, error } = await admin
    .from("team_brief_decisions")
    .insert({
      team_id: input.teamId,
      brief_id: input.briefId,
      decision: input.decision,
      reason,
      decided_by_professional_id: input.decidedByProfessionalId,
    })
    .select("*")
    .single();

  if (error) {
    log.error("recordDecision failed", {
      teamId: input.teamId,
      briefId: input.briefId,
      decision: input.decision,
      err: error.message,
    });
    throw new DecisionError("Failed to record decision.", 500);
  }
  return data as TeamBriefDecisionRow;
}

export async function clearDecision(input: {
  teamId: number;
  briefId: number;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("team_brief_decisions")
    .delete()
    .eq("team_id", input.teamId)
    .eq("brief_id", input.briefId);
  if (error) {
    log.warn("clearDecision failed", {
      teamId: input.teamId,
      briefId: input.briefId,
      err: error.message,
    });
  }
}

/**
 * Returns the set of brief_ids that should currently be HIDDEN from the
 * given team's inbox view. Filters: `not_for_us` (forever) or `snoozed`
 * within the last SNOOZE_DAYS days.
 */
export async function getHiddenBriefIdsForTeam(
  teamId: number,
): Promise<Set<number>> {
  const admin = createAdminClient();
  const snoozeCutoff = new Date(Date.now() - SNOOZE_MS).toISOString();
  const { data, error } = await admin
    .from("team_brief_decisions")
    .select("brief_id, decision, created_at")
    .eq("team_id", teamId);
  if (error) {
    log.warn("getHiddenBriefIdsForTeam failed", {
      teamId,
      err: error.message,
    });
    return new Set();
  }
  const hidden = new Set<number>();
  for (const row of data ?? []) {
    const decision = row.decision as DecisionKind;
    const briefId = row.brief_id as number;
    if (decision === "not_for_us") {
      hidden.add(briefId);
      continue;
    }
    if (decision === "snoozed") {
      const createdAt = row.created_at as string;
      if (createdAt > snoozeCutoff) hidden.add(briefId);
    }
  }
  return hidden;
}
