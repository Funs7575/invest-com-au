/* eslint-disable */
/**
 * Standard journey personas (CommonJS) — shared by ai-journey.cjs,
 * ai-form.cjs, lead-flows.cjs, and .github/workflows/ai-journey.yml.
 *
 * Each persona: { name, description, startPath, goal, keywords[],
 *   viewport, steps, formStart, formGoal }
 */

const PERSONAS = [
  {
    name: "new-investor",
    description: "Complete beginner comparing investment platforms for the first time.",
    startPath: "/",
    goal: "Find and compare investment platforms suitable for a beginner, and get to the point where I could open an account. Note anything confusing, broken, or any missing fees/risk disclosures.",
    keywords: ["compare", "broker", "shares", "etf", "fees", "open account"],
    viewport: "desktop",
    steps: 15,
    formStart: "/get-matched",
    formGoal: "Complete the get-matched quiz as a new investor and reach a personalised action plan.",
  },
  {
    name: "advice-seeker",
    description: "Pre-retiree looking for a financial adviser.",
    startPath: "/advisors",
    goal: "Find a financial adviser who suits someone near retirement, and reach a point where I could make contact or book a consultation. Flag dead ends, confusing steps, or missing disclosures.",
    keywords: ["adviser", "retirement", "super", "plan", "contact", "enquire"],
    viewport: "desktop",
    steps: 12,
  },
  {
    name: "quiz-taker",
    description: "Visitor using the guided get-matched quiz.",
    startPath: "/get-matched",
    goal: "Complete the get-matched quiz as a long-term growth investor and reach a personalised action plan. Judge whether the result is clear and trustworthy.",
    keywords: ["long-term", "growth", "shares", "etf", "balanced", "yes", "high"],
    viewport: "desktop",
    steps: 14,
    formStart: "/get-matched",
    formGoal: "Complete the get-matched quiz as a long-term growth investor and reach a result screen.",
  },
  {
    name: "mobile-shopper",
    description: "Mobile user comparing brokers on an iPhone.",
    startPath: "/",
    goal: "Find and compare investment platforms on mobile. Flag tap targets that are too small, overflow issues, or anything hard to use on a phone.",
    keywords: ["compare", "broker", "fees", "account", "open"],
    viewport: "mobile",
    steps: 10,
  },
  {
    name: "first-home-buyer",
    description: "First home buyer researching property investment options.",
    startPath: "/invest/property",
    goal: "Research property investment options and find a financial adviser who specialises in property. Note confusing flows or missing disclosures.",
    keywords: ["property", "investment", "adviser", "financial", "plan", "home"],
    viewport: "desktop",
    steps: 12,
  },
  {
    name: "startup-investor",
    description: "Angel investor exploring startup investment platforms.",
    startPath: "/invest/startups",
    goal: "Find startup investment platforms and opportunities. Note required accreditation disclosures, risk warnings, and any auth-gate that appears.",
    keywords: ["startup", "angel", "invest", "platform", "risk", "accredited"],
    viewport: "desktop",
    steps: 12,
  },
];

/** Lookup by name. Returns undefined if not found. */
function getPersona(name) {
  return PERSONAS.find((p) => p.name === name);
}

module.exports = { PERSONAS, getPersona };
