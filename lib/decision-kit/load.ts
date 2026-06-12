/**
 * lib/decision-kit/load.ts
 *
 * Server-side assembly of the Decision Kit props for a consumer surface.
 * Pages (the brief tracker and the quote page) call `loadDecisionKit(...)`
 * with the respondents they already loaded; this layer composes the matrix
 * rows, resolves the call script, checks the `decision_kit` flag, and loads any
 * saved scorecards. Everything fails soft — a thrown/absent dependency yields
 * an empty-but-renderable kit rather than a 500.
 */

import { isFlagEnabled } from "@/lib/feature-flags";
import { getCallScript, type CallScript } from "./scripts";
import {
  composeRespondentRows,
  listScorecards,
  normaliseOwnerKey,
  type RespondentInput,
  type RespondentRow,
} from "./respondents";
import type { ScorecardCriteria } from "./scorecards";

export interface DecisionKitData {
  respondents: RespondentRow[];
  script: CallScript;
  scorecardsEnabled: boolean;
  initialScorecards: Array<{
    professionalId: number;
    criteria: ScorecardCriteria;
    notes: string | null;
    overall: number | null;
  }>;
}

export interface LoadDecisionKitArgs {
  /** advisor_auctions.id (a "brief" or quote auction). Owner-scoped reads. */
  briefId: number;
  /** Verified owner email, or null when the viewer isn't the verified owner. */
  ownerEmail: string | null;
  /** The respondents to compare (caller controls ordering). */
  inputs: RespondentInput[];
  /** Raw service identifier (brief template or quote advisor type) → script. */
  serviceType: string | null | undefined;
}

/**
 * Assemble everything the <DecisionKit /> client component needs. Safe to call
 * even when there are no respondents (returns an empty respondent list and the
 * generic script). Scorecards are only loaded when the flag is on AND the
 * viewer is the verified owner.
 */
export async function loadDecisionKit({
  briefId,
  ownerEmail,
  inputs,
  serviceType,
}: LoadDecisionKitArgs): Promise<DecisionKitData> {
  const script = getCallScript(serviceType);
  const ownerKey = normaliseOwnerKey(ownerEmail);

  // Compose the matrix rows (fail-soft inside).
  const respondents = inputs.length > 0 ? await composeRespondentRows(inputs) : [];

  // Flag — keyed by the owner so a percentage rollout is sticky per consumer.
  // Evaluated even for non-owners so the page can show a "verify to score" hint.
  const scorecardsEnabled = await isFlagEnabled("decision_kit", {
    userKey: ownerKey || undefined,
    segment: "user",
  });

  // Scorecards — only when enabled AND the viewer is the verified owner.
  const initialScorecards =
    scorecardsEnabled && ownerKey
      ? (await listScorecards(ownerKey, briefId)).map((s) => ({
          professionalId: s.professionalId,
          criteria: s.criteria,
          notes: s.notes,
          overall: s.overall,
        }))
      : [];

  return { respondents, script, scorecardsEnabled, initialScorecards };
}
