/**
 * Persona registry.
 *
 * A persona is a simulated user with a goal and a route emphasis. Phase 0 ships
 * anonymous personas over public, placeholder-cred-safe routes (the same routes
 * the a11y suite trusts to render without a seeded DB). Authenticated personas
 * attach an auth state (reusing e2e/visual/state-registry.ts) so a persona can
 * walk logged-in pages and pursue logged-in goals — gated on the storageState
 * existing, so unseeded runs skip them safely.
 */

import { stateFile } from "../e2e/visual/state-registry";

export interface Persona {
  name: string;
  description: string;
  /** Routes this persona walks deterministically (the page sweep). */
  routes?: string[];
  /** Goal for an AI-driven persona to pursue. */
  goal?: string;
  /** Where an AI-driven persona starts. */
  startPath?: string;
  /** Optional auth storage-state file for logged-in personas (later phases). */
  storageStateFile?: string;
}

export const PHASE0_PERSONAS: Persona[] = [
  {
    name: "broker-shopper",
    description: "Comparing brokers/platforms before opening an account.",
    routes: ["/", "/compare", "/calculators", "/how-we-earn"],
  },
  {
    name: "advice-seeker",
    description: "Looking for a financial adviser to talk to.",
    routes: ["/", "/advisors", "/find-advisor", "/about"],
  },
  {
    name: "learner",
    description: "Researching concepts and tools before investing.",
    routes: ["/", "/glossary", "/tools", "/foreign-investment"],
  },
];

/**
 * AI-driven personas: each is given a goal and left to pursue it like a real
 * user, judging the experience along the way. Only run when AI is enabled
 * (BOTS_AI_TOKEN_BUDGET > 0 and an Anthropic key is present).
 */
export const AI_PERSONAS: Persona[] = [
  {
    name: "ai-first-home-buyer",
    description: "A beginner comparing investment platforms for the first time.",
    startPath: "/",
    goal: "As a complete beginner, find and compare investment platforms suitable for someone just starting out, and get to the point where you could open an account. Note anything confusing, broken, or any missing fees/risk disclosures.",
  },
  {
    name: "ai-advice-seeker",
    description: "A pre-retiree looking for a financial adviser.",
    startPath: "/advisors",
    goal: "Find a financial adviser who would suit someone near retirement, and try to make contact or book a consultation. Flag dead ends, confusing steps, or missing disclosures.",
  },
  {
    name: "ai-quiz-taker",
    description: "A visitor using the guided 'get matched' quiz.",
    startPath: "/get-matched",
    goal: "Complete the get-matched quiz as a long-term investor and reach a personalised action plan. Judge whether the result is clear and trustworthy, and flag anything broken or missing.",
  },
];

/**
 * Authenticated personas: each reuses a seeded storageState (captured by the
 * e2e/visual auto-login flow) so the bot drives logged-in surfaces — account
 * dashboard, holdings, bookmarks, save-a-plan, advisor enquiry. Money, affiliate
 * and external paths stay auto-mocked by safety/money-paths.ts, so these run
 * with zero financial side effects. The fleet SKIPS any persona whose
 * storageStateFile is not present on disk, so a normal/CI run (no seeded auth)
 * never fails on them — they activate only after `npm run bots:seed-users` +
 * the auto-login capture.
 */
export const AUTHED_PERSONAS: Persona[] = [
  {
    name: "authed-investor",
    description:
      "A signed-in individual investor exploring their account, holdings and saved plans.",
    storageStateFile: stateFile("bot-buyer"),
    routes: ["/account", "/account/holdings", "/account/bookmarks", "/dashboard"],
    startPath: "/account",
    goal: "As a logged-in investor, explore your account dashboard, review your holdings and saved bookmarks, and try to save a plan or send an advisor enquiry. Note anything broken, confusing, or any missing fees/risk disclosures. (Money and external actions are mocked — do not worry about real side effects.)",
  },
];
