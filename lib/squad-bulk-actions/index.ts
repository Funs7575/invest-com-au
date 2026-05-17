/**
 * Bulk-action engine for the Pro Squad shared inbox. Operates on up to 50
 * brief_ids at a time, returns a per-brief result so the UI can show
 * granular success/failure.
 *
 * Each action delegates to the existing single-brief lib helpers
 * (claimBriefForMember, releaseBriefAssignment, createReferral) so the
 * state-machine guarantees stay consistent with one-by-one operations.
 */
// eslint-disable-next-line no-restricted-imports -- bulk write under requireAdvisorSession context; service-role used to insert team_brief_decisions rows where the caller's JWT may not satisfy the policy mid-batch.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  claimBriefForMember,
  releaseBriefAssignment,
} from "@/lib/team-brief-assignments";
import { createReferral } from "@/lib/team-brief-referrals";

const log = logger("squad-bulk-actions");

export const MAX_BULK = 50;

export type BulkAction = "claim" | "release" | "decline" | "refer";

export interface BulkInput {
  action: BulkAction;
  teamId: number;
  professionalId: number;
  briefIds: number[];
  toTeamId?: number; // for refer
  reason?: string; // for decline
}

export interface BulkPerResult {
  brief_id: number;
  ok: boolean;
  error?: string;
}

export interface BulkResult {
  results: BulkPerResult[];
  summary: { total: number; ok: number; failed: number };
}

export async function runBulkAction(input: BulkInput): Promise<BulkResult> {
  if (input.briefIds.length === 0) {
    return { results: [], summary: { total: 0, ok: 0, failed: 0 } };
  }
  if (input.briefIds.length > MAX_BULK) {
    throw new Error(`bulk cap is ${MAX_BULK} per request`);
  }

  const results: BulkPerResult[] = [];
  for (const briefId of input.briefIds) {
    try {
      switch (input.action) {
        case "claim":
          await claimBriefForMember({
            briefId,
            teamId: input.teamId,
            professionalId: input.professionalId,
          });
          break;
        case "release":
          await releaseBriefAssignment({
            briefId,
            professionalId: input.professionalId,
          });
          break;
        case "decline":
          await recordDecision({
            teamId: input.teamId,
            briefId,
            decidedByProfessionalId: input.professionalId,
            reason: input.reason ?? null,
          });
          break;
        case "refer":
          if (!input.toTeamId) throw new Error("toTeamId required for refer");
          await createReferral({
            briefId,
            fromTeamId: input.teamId,
            toTeamId: input.toTeamId,
            fromProfessionalId: input.professionalId,
          });
          break;
      }
      results.push({ brief_id: briefId, ok: true });
    } catch (err) {
      results.push({
        brief_id: briefId,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  log.info("bulk run complete", { action: input.action, total: results.length, ok, failed });
  return { results, summary: { total: results.length, ok, failed } };
}

async function recordDecision(input: {
  teamId: number;
  briefId: number;
  decidedByProfessionalId: number;
  reason: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("team_brief_decisions").insert({
    team_id: input.teamId,
    brief_id: input.briefId,
    decision: "not_for_us",
    reason: input.reason,
    decided_by_professional_id: input.decidedByProfessionalId,
  });
  // 23505 unique violation = idempotent re-decline, not an error
  if (error && error.code !== "23505") {
    throw new Error(`decline insert failed: ${error.message}`);
  }
}
