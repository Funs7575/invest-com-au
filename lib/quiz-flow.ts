/**
 * lib/quiz-flow.ts
 *
 * The find-advisor quiz's routing state machine, extracted verbatim from
 * app/quiz/page.tsx so it is unit-testable (it was previously inline and
 * untested — no regression net for question-flow changes). Pure functions,
 * no I/O. Behaviour is identical to the prior inline implementation; the
 * tests in __tests__/lib/quiz-flow.test.ts pin it down.
 */

export type QuestionId =
  | "location"
  | "goal"
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
  mode?: string;
  experience?: string;
  complexity?: string;
  amount?: string;
  priority?: string;
  advisor_type?: string;
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
      return (a.goal === "help" || a.goal === "home") ? "complexity" : "mode";
    case "mode":
      return track === "advisor" ? "complexity" : "experience";
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
  const hasPropertySub = a.goal === "property";
  const hasStackQuestions = shouldShowStackQuestions(a) && a.mode !== "help";
  const stackExtra = hasStackQuestions ? 3 : 0; // stack_risk + stack_super + stack_savings
  return 1 + (skipMode ? 4 : 5) + (hasPropertySub ? 1 : 0) + stackExtra; // +1 for location
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
