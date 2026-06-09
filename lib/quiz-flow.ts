/**
 * lib/quiz-flow.ts
 *
 * The find-advisor quiz's routing state machine, extracted verbatim from
 * app/quiz/page.tsx so it is unit-testable (it was previously inline and
 * untested — no regression net for question-flow changes). Pure functions,
 * no I/O. Behaviour is identical to the prior inline implementation; the
 * tests in __tests__/lib/quiz-flow.test.ts pin it down.
 */

import { pickPrimary, type AdvisorNeed, type PrimaryAllocation } from "./quiz-primary-advisor";

export type QuestionId =
  | "location"
  | "goal"
  | "stage"
  | "mode"
  | "experience"
  | "complexity"
  | "amount"
  | "priority"
  | "advisor_type"
  | "property_sub"
  | "investor_country"
  | "visa_status"
  | "investor_goal_intl"
  | "stack_risk"
  | "stack_super"
  | "stack_savings";

export type QuizTrack = "diy" | "advisor" | "international";

export interface UnifiedAnswers {
  location?: string;
  goal?: string;
  /** Readiness/stage: "under-contract" | "ready" | "exploring" | "learning". */
  stage?: string;
  mode?: string;
  experience?: string;
  complexity?: string;
  amount?: string;
  priority?: string;
  advisor_type?: string;
  /** Multi-select "who will you need?" — CSV of advisor-need keys. */
  needs?: string;
  property_sub?: string;
  investor_country?: string;
  visa_status?: string;
  investor_goal_intl?: string;
  // Wealth-stack questions (optional, appended to DIY track)
  stack_risk?: string;
  stack_super?: string;
  stack_savings?: string;
}

export function isInternational(a: UnifiedAnswers): boolean {
  return a.location === "international" || a.location === "expat";
}

export function resolveTrack(a: UnifiedAnswers): QuizTrack {
  if (isInternational(a)) return "international";
  // "Just learning" → education-first: never push a learner into the advisor
  // lead funnel, whatever their goal/mode. The readiness/stage question's
  // first-class education exit (QUIZ_REDESIGN §5.5).
  if (a.stage === "learning") return "diy";
  if (a.goal === "help" || a.goal === "home") return "advisor";
  if (a.mode === "help") return "advisor";
  if (a.property_sub === "physical") return "advisor";
  return "diy";
}

/**
 * Decide whether to show the supplementary wealth-stack questions.
 * Only shown on the DIY track for goals where a multi-product stack
 * adds genuine value (not crypto-only, not active trading).
 */
export function shouldShowStackQuestions(a: UnifiedAnswers): boolean {
  if (a.mode === "help") return false; // advisor path
  const stackGoals = ["grow", "income", "automate", "property", "super", "property-reit", "property-super"];
  return a.goal ? stackGoals.includes(a.goal) : false;
}

export function getNextId(id: QuestionId, a: UnifiedAnswers): QuestionId | null {
  const track = resolveTrack(a);

  // International track
  if (track === "international") {
    switch (id) {
      case "location":      return "investor_country";
      case "investor_country": return "visa_status";
      case "visa_status":   return "investor_goal_intl";
      case "investor_goal_intl": return "amount";
      case "amount":        return "advisor_type";
      case "advisor_type":  return null;
      // These shouldn't be hit but handle defensively
      case "goal": case "mode": case "experience": case "complexity":
      case "priority": case "property_sub": return null;
    }
  }

  // Domestic track
  switch (id) {
    case "location":
      return "goal";
    case "goal":
      // Advisor-bound goals get the readiness question before the specifics;
      // DIY-leaning goals go through `mode` first.
      return (a.goal === "help" || a.goal === "home") ? "stage" : "mode";
    case "mode":
      // mode === "help" enters the advisor track → ask readiness next.
      return track === "advisor" ? "stage" : "experience";
    case "stage":
      // "Just learning" exits early to the education/self-serve results
      // (resolveTrack routes it to DIY); everyone else continues.
      return a.stage === "learning" ? null : "complexity";
    case "experience":
    case "complexity":
      return "amount";
    case "amount":
      return track === "advisor" ? "advisor_type" : "priority";
    case "priority":
      if (a.goal === "property") return "property_sub";
      // DIY track: optional wealth-stack questions for relevant goals
      if (shouldShowStackQuestions(a)) return "stack_risk";
      return null;
    case "advisor_type":
      return a.goal === "property" ? "property_sub" : null;
    case "property_sub":
      // After property sub, offer stack questions for REITs/super paths
      if (a.property_sub !== "physical" && shouldShowStackQuestions(a)) return "stack_risk";
      return null;
    case "stack_risk":
      return "stack_super";
    case "stack_super":
      return "stack_savings";
    case "stack_savings":
      return null;
    // International-only questions that shouldn't appear on domestic track
    case "investor_country":
    case "visa_status":
    case "investor_goal_intl":
      return null;
  }
}

export function getTotalSteps(a: UnifiedAnswers): number {
  if (isInternational(a)) return 6; // location + country + visa + goal + amount + advisor_type
  const skipMode = a.goal === "help" || a.goal === "home";
  // The readiness/stage question is asked once we enter the advisor track
  // (help/home goal, or mode === "help").
  const advisorEntry = skipMode || a.mode === "help";
  // "Just learning" exits early to education: location + goal [+ mode] + stage.
  if (advisorEntry && a.stage === "learning") {
    return 1 + 1 + (skipMode ? 0 : 1) + 1;
  }
  const stageExtra = advisorEntry ? 1 : 0;
  const hasPropertySub = a.goal === "property";
  const hasStackQuestions = shouldShowStackQuestions(a) && a.mode !== "help";
  const stackExtra = hasStackQuestions ? 3 : 0; // stack_risk + stack_super + stack_savings
  return 1 + (skipMode ? 4 : 5) + stageExtra + (hasPropertySub ? 1 : 0) + stackExtra; // +1 for location
}

export function inferAdvisorType(a: UnifiedAnswers): string {
  if (a.advisor_type && a.advisor_type !== "not-sure") return a.advisor_type;
  // International track
  if (isInternational(a)) {
    if (a.investor_goal_intl === "property") return "buyers-agent";
    if (a.investor_goal_intl === "shares") return "tax-agent";
    if (a.investor_goal_intl === "savings" || a.investor_goal_intl === "business") return "financial-planner";
    return "tax-agent";
  }
  // Domestic track
  if (a.property_sub === "physical") return "buyers-agent";
  if (a.goal === "home") return "mortgage-broker";
  if (a.goal === "property") return "buyers-agent";
  if (a.goal === "super") return "smsf-accountant";
  if (a.goal === "crypto") return "tax-agent";
  if (a.amount === "large" || a.amount === "whale") return "financial-planner";
  return a.advisor_type || "financial-planner";
}

const ADVISOR_NEEDS: ReadonlySet<string> = new Set<AdvisorNeed>([
  "mortgage-broker",
  "buyers-agent",
  "conveyancer",
  "financial-planner",
  "smsf-accountant",
  "tax-agent",
  "insurance-broker",
  "estate-planner",
  "commercial-property-agent",
  "not-sure",
]);

function toNeed(type: string | undefined): AdvisorNeed | null {
  return type && ADVISOR_NEEDS.has(type) ? (type as AdvisorNeed) : null;
}

/** Parse the multi-select `needs` CSV into a deduped, validated need list. */
function parseNeeds(csv: string | undefined): AdvisorNeed[] {
  if (!csv) return [];
  const out: AdvisorNeed[] = [];
  for (const tok of csv.split(",")) {
    const n = toNeed(tok.trim());
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/**
 * Derive the full plausible advisor need-set from the (currently single-select)
 * quiz answers — the bridge that feeds `pickPrimary` until the multi-select
 * "who will you need?" question lands (QUIZ_REDESIGN §5.5). Anchored on the
 * explicit/inferred primary (same source as the displayed lead), then adds the
 * complements the answers genuinely imply: a property purchase needs finance +
 * protection; an investment property adds tax; a planner pairs with tax +
 * protection; SMSF/tax anchors pair with a coordinating planner; complex or
 * larger situations pull in a planner + tax. Every added need traces to a
 * specific answer signal — no static lookup. Pure, order-preserving, deduped,
 * and never emits "not-sure".
 */
export function deriveNeeds(a: UnifiedAnswers): AdvisorNeed[] {
  const needs: AdvisorNeed[] = [];
  const add = (n: AdvisorNeed | null) => {
    if (n && n !== "not-sure" && !needs.includes(n)) needs.push(n);
  };

  // Explicit multi-select need-set ("who will you need?"): the user told us the
  // full set directly, so use it verbatim — no inferred complements.
  const explicit = parseNeeds(a.needs);
  if (explicit.length > 0) {
    explicit.forEach(add);
    return needs;
  }

  // Otherwise infer from the single-select / international answers.
  // Anchor on the explicit/inferred primary advisor type (the displayed lead).
  const anchor = toNeed(inferAdvisorType(a));
  add(anchor);

  const investmentProperty =
    a.property_sub === "physical" ||
    a.investor_goal_intl === "property" ||
    (a.goal === "property" &&
      a.property_sub !== "property-reit" &&
      a.property_sub !== "property-super");

  // Buying/financing property → loan + settlement + protection (+ tax for an
  // investment). Conveyancing is legally required for any purchase, so it's a
  // genuine need — and it makes pickPrimary's under-contract → conveyancer rule
  // reachable from the inference path.
  if (investmentProperty || a.goal === "home") {
    add("mortgage-broker");
    add("conveyancer");
    add("insurance-broker");
    if (investmentProperty) add("tax-agent");
  }
  // Retirement/super or SMSF property → SMSF structure + protection.
  if (a.goal === "super" || a.property_sub === "property-super") {
    add("smsf-accountant");
    add("insurance-broker");
  }
  // Crypto → CGT.
  if (a.goal === "crypto") add("tax-agent");
  // A planner engagement almost always pairs with tax + protection.
  if (anchor === "financial-planner") {
    add("tax-agent");
    add("insurance-broker");
  }
  // Structure/tax anchors pair with a planner for investment strategy.
  if (anchor === "smsf-accountant" || anchor === "tax-agent") {
    add("financial-planner");
  }
  // Complex or larger situations → a coordinating planner + tax.
  if (a.complexity === "complex" || a.amount === "large" || a.amount === "whale") {
    add("financial-planner");
    add("tax-agent");
  }
  // Substantial wealth → estate / succession planning.
  if (a.amount === "whale") add("estate-planner");

  return needs;
}

/** Build the pickPrimary context from the answer model. */
function primaryContext(a: UnifiedAnswers) {
  return {
    stage: a.stage,
    complexity: a.complexity,
    isInternational: isInternational(a),
    goal: a.goal,
    amount: a.amount,
    investorGoalIntl: a.investor_goal_intl,
  };
}

/**
 * Allocate the single lead advisor + the secondary "team" from the answers:
 * `deriveNeeds` → `pickPrimary`. This is the one place that turns answers into
 * an allocation (used by both the page lead and the results "team").
 */
export function allocateAdvisors(a: UnifiedAnswers): PrimaryAllocation {
  return pickPrimary(deriveNeeds(a), primaryContext(a));
}

/**
 * The single advisor type the lead goes to: pickPrimary's allocated primary,
 * falling back to the inferred single type when there's no concrete allocation
 * (an all-"not-sure" need-set / international single-select / legacy answers).
 */
export function resolveLeadAdvisorType(a: UnifiedAnswers): string {
  const { primary } = allocateAdvisors(a);
  return primary !== "post-job" ? primary : inferAdvisorType(a);
}

// Convert unified answers to a flat string array for the platform scoring engine
// Format: [goal, experience, amount, priority, property_sub?]
// — index 0 = goal (interest), index 1 = experience, index 2 = amount (multiplier), index 3 = priority
export function toScoringAnswers(a: UnifiedAnswers): string[] {
  return [
    a.goal,
    a.experience,
    a.amount,
    a.priority,
    a.property_sub,
  ].filter(Boolean) as string[];
}
