/**
 * Brief visibility predicate — the single definition of "can this
 * provider see this open brief in their inbox?".
 *
 * Extracted from the inline filter in /api/briefs/inbox so the
 * standing-orders auto-accept engine (lib/briefs/standing-orders.ts)
 * can never accept a brief on behalf of a provider who would not have
 * seen it manually. Both call sites share this function — change it
 * here and both paths stay in lockstep.
 *
 * Pure: callers hydrate the provider context (type, firm, active team
 * memberships) and pass it in.
 */

import type { BriefRow } from "./types";

export interface ProviderVisibilityContext {
  professionalId: number;
  /** professionals.type — null when the pro has no type assigned. */
  advisorType: string | null;
  /** professionals.firm_id */
  firmId: number | null;
  /** Active expert-team memberships (expert_team_members.status='active'). */
  teamIds: number[];
}

/**
 * Mirrors the inbox "available" bucket filter. NB: callers are expected
 * to have already restricted rows to open, accept-flow, risk-cleared,
 * unaccepted briefs — this predicate only answers the routing question.
 */
export function isBriefVisibleToProvider(
  brief: BriefRow,
  ctx: ProviderVisibilityContext,
): boolean {
  // Direct-targeted briefs: only the matched provider sees them.
  if (brief.routing_mode === "direct") {
    if (brief.target_professional_id === ctx.professionalId) return true;
    if (brief.target_team_id && ctx.teamIds.includes(brief.target_team_id)) return true;
    if (brief.target_firm_id && ctx.firmId === brief.target_firm_id) return true;
    return false;
  }
  // Preference filter.
  if (brief.provider_preference === "expert_team" && ctx.teamIds.length === 0) return false;
  if (brief.provider_preference === "firm" && !ctx.firmId) return false;
  if (brief.provider_preference === "individual") {
    // Anyone with a professional row counts.
  }
  // Optional advisor_types filter — only if the brief specified types
  // and the professional has a type assigned.
  if (
    brief.advisor_types &&
    brief.advisor_types.length > 0 &&
    ctx.advisorType &&
    !brief.advisor_types.includes(ctx.advisorType)
  ) {
    return false;
  }
  return true;
}
