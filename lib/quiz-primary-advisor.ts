/**
 * lib/quiz-primary-advisor.ts
 *
 * Multi-intent allocation for the find-advisor quiz. A user can need several
 * professionals at once (e.g. expat + SMSF + property + mortgage). The quiz
 * captures the full need-set, but a lead must go to exactly ONE advisor —
 * single-lead allocation (see lib/compliance + /api/submit-lead). This pure
 * function picks the single PRIMARY (the professional who gates or time-bounds
 * the rest, or is the correct first call) via a deterministic priority ladder,
 * and returns the remaining needs as clearly-secondary "team" suggestions
 * (rendered as directory links — never a second lead postback).
 *
 * Ladder (first match wins), grounded in the existing routing logic:
 *   0. user explicitly named a type → that type (user agency beats inference)
 *   1. under-contract            → conveyancer (settlement clock is ticking)
 *   2. complex + many needs      → financial planner (coordinates the team)
 *   3. overseas + property       → buyer's agent (FIRB) — the purchase is the act
 *   4. needs mortgage + property → mortgage broker (free, gates the purchase)
 *   5. needs SMSF                → SMSF accountant (structure gates the investments)
 *   6. needs tax                 → tax agent
 *   7. large/whale               → financial planner (wealth coordinator)
 *   8. else                      → first stated need
 *   9. empty / only "not sure"   → post-job (describe-and-quote; no forced pick)
 *
 * Pure — no I/O. Unit-tested like the other quiz routers.
 */

export type AdvisorNeed =
  | "mortgage-broker"
  | "buyers-agent"
  | "conveyancer"
  | "financial-planner"
  | "smsf-accountant"
  | "tax-agent"
  | "insurance-broker"
  | "estate-planner"
  | "commercial-property-agent"
  | "aged-care-advisor"
  | "debt-counsellor"
  | "not-sure";

export interface PrimaryContext {
  /** Readiness/stage answer, e.g. "under-contract" | "ready" | "exploring" | "learning". */
  stage?: string;
  complexity?: string; // simple | moderate | complex
  isInternational?: boolean;
  goal?: string;
  amount?: string; // small | medium | large | whale
  investorGoalIntl?: string;
  /**
   * The advisor type the user EXPLICITLY named (quiz single-select /
   * get-matched help_sub) — as opposed to types inferred from their goals.
   * Rule 0: user agency outranks the inference ladder. Without this, a user
   * who asked for a financial planner got the planner's tax-agent complement
   * as their lead (rule 6 claimed it first) — found by the P2 lane tests.
   */
  namedType?: AdvisorNeed;
}

export interface PrimaryAllocation {
  /** The single advisor type that gets the lead, or "post-job" when there's no
   *  clear pick (describe-and-quote). */
  primary: AdvisorNeed | "post-job";
  /** The rest of the team — surfaced as directory links, never a second lead. */
  secondaries: AdvisorNeed[];
}

const PROPERTY_GOALS = new Set(["property", "home"]);

const has = (needs: ReadonlyArray<AdvisorNeed>, n: AdvisorNeed): boolean => needs.includes(n);

function choosePrimary(
  real: ReadonlyArray<AdvisorNeed>,
  ctx: PrimaryContext,
  wantsProperty: boolean,
): AdvisorNeed | "post-job" {
  const first = real[0];
  if (!first) return "post-job"; // nothing concrete → describe-and-quote

  // 0. The user explicitly named who they want — respect it over every
  //    inference rule. The rest of the need-set still renders as the team.
  if (ctx.namedType && ctx.namedType !== "not-sure" && has(real, ctx.namedType)) {
    return ctx.namedType;
  }
  // 1. Settlement is time-critical.
  if (ctx.stage === "under-contract" && (has(real, "conveyancer") || wantsProperty)) {
    return has(real, "conveyancer") ? "conveyancer" : first;
  }
  // 2. Complex situation with several needs → a planner coordinates the team.
  if (ctx.complexity === "complex" && real.length >= 3 && has(real, "financial-planner")) {
    return "financial-planner";
  }
  // 3. Overseas buying property → the purchase (FIRB) is the act.
  if (ctx.isInternational && wantsProperty && has(real, "buyers-agent")) {
    return "buyers-agent";
  }
  // 4. Mortgage + a property goal → the broker is free and gates the purchase.
  if (has(real, "mortgage-broker") && wantsProperty) {
    return "mortgage-broker";
  }
  // 5. SMSF structure gates the investments.
  if (has(real, "smsf-accountant")) return "smsf-accountant";
  // 6. Tax, when nothing above claimed it.
  if (has(real, "tax-agent")) return "tax-agent";
  // 7. Large/whale → financial planner as the wealth coordinator.
  if ((ctx.amount === "whale" || ctx.amount === "large") && has(real, "financial-planner")) {
    return "financial-planner";
  }
  // 8. Otherwise the first stated need.
  return first;
}

/**
 * Allocate one primary advisor from a need-set + return the rest as a deduped,
 * order-preserving "team". `not-sure` is dropped from the real needs.
 */
export function pickPrimary(
  needs: ReadonlyArray<AdvisorNeed>,
  ctx: PrimaryContext = {},
): PrimaryAllocation {
  const real = needs.filter((n) => n !== "not-sure");
  const wantsProperty = PROPERTY_GOALS.has(ctx.goal ?? "") || ctx.investorGoalIntl === "property";

  const primary = choosePrimary(real, ctx, wantsProperty);
  if (primary === "post-job") return { primary, secondaries: [] };

  const seen = new Set<AdvisorNeed>([primary]);
  const secondaries = real.filter((n) => {
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
  return { primary, secondaries };
}
