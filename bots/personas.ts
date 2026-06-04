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

/**
 * Advisor-area personas — anonymous coverage of the adviser directory, the
 * specialty hubs, the get-matched entry point, and a seeded profile. Designed to
 * be run against the protected Netlify mirror (writes are auto-mocked), so every
 * route here is read-only / public; no `storageStateFile` is attached. Each
 * carries a deterministic route list AND an AI goal, so the same array drives
 * both the page-sweep and (when AI is enabled) the explore/judge loop.
 *
 * `/advisor/james-wong-sydney` is a known slug from the mock-advisor seed
 * (`supabase/migrations/20260309_seed_mock_advisors.sql`); if the target isn't
 * seeded it falls back to a 404-handled profile, still useful as a smoke check.
 */
export const ADVISOR_PERSONAS: Persona[] = [
  {
    name: "advisor-directory-browser",
    description:
      "Browsing the adviser directory: the landing page, a type listing, and a type-by-state slice.",
    routes: [
      "/advisors",
      "/advisors/financial-planners",
      "/advisors/financial-planners/nsw",
    ],
    startPath: "/advisors",
    goal: "Browse the adviser directory, drill into a profession (financial planners) and then a state, and judge whether listings, filters, and disclosures are clear. Flag dead ends, empty states, or missing AFSL/fee disclosures.",
  },
  {
    name: "advisor-specialty-seeker",
    description:
      "Looking for niche adviser specialties (FIRB, migration, international tax).",
    routes: [
      "/advisors/firb-specialists",
      "/advisors/migration-agents",
      "/advisors/international-tax-specialists",
    ],
    startPath: "/advisors/firb-specialists",
    goal: "As a foreign investor, find a specialist (FIRB, migration, or international tax) who can help, and reach a point where you could make contact. Flag anything confusing, broken, or any missing disclosures.",
  },
  {
    name: "advisor-matchmaker",
    description: "Using the guided find-an-adviser entry point.",
    routes: ["/find-advisor", "/advisors"],
    startPath: "/find-advisor",
    goal: "Use the find-an-adviser flow to get matched with a suitable adviser, and judge whether the matching is clear and trustworthy. Flag dead ends or missing disclosures.",
  },
  {
    name: "advisor-profile-explorer",
    description:
      "Reading a single adviser profile in depth before making contact.",
    routes: ["/advisor/james-wong-sydney", "/advisors"],
    startPath: "/advisor/james-wong-sydney",
    goal: "Read an adviser's profile in detail and decide whether you'd contact them. Judge whether credentials, fees, and disclosures are present and trustworthy; flag anything broken or missing.",
  },
];
