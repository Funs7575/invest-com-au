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
      "A signed-in individual investor exploring their account, holdings, wealth-stack, notifications and saved plans.",
    storageStateFile: stateFile("bot-buyer"),
    routes: [
      // Core account hub
      "/account",
      "/account/dashboard",
      // Holdings & wealth-stack (portfolio management surfaces)
      "/account/holdings",
      "/account/net-worth",
      // Save / bookmark / compare surfaces
      "/account/bookmarks",
      "/account/saved",
      // Notifications & profile
      "/account/notifications",
      "/account/profile",
    ],
    startPath: "/account",
    goal: "As a logged-in investor, explore your account dashboard, review your holdings and wealth-stack (net-worth tracker), check saved bookmarks and plans, and read any notifications. Note anything broken, confusing, redirecting you to /login unexpectedly, or missing fees/risk disclosures. (Money and external actions are mocked — do not worry about real side effects.)",
  },
];

/**
 * Lifecycle personas drive the full scripted user journey (quiz → account →
 * advisor enquiry → notifications) via USER_LIFECYCLE_FLOW rather than a
 * free-form page sweep. They skip unless the bot-buyer storageState exists.
 */
export const LIFECYCLE_PERSONAS: Persona[] = [
  {
    name: "lifecycle-investor",
    description:
      "Drives the full new-investor lifecycle: quiz → action plan → account surfaces → advisor enquiry → notifications.",
    storageStateFile: stateFile("bot-buyer"),
    startPath: "/get-matched",
  },
];

/**
 * Startup ecosystem personas — anonymous coverage of the startup investor
 * surfaces and the startup portal auth gate. No storageState required.
 * Drives STARTUP_ECOSYSTEM_FLOW (see flows/startup-portal.ts).
 */
export const STARTUP_ECOSYSTEM_PERSONAS: Persona[] = [
  {
    name: "startup-ecosystem",
    description:
      "Exercises the public startup investor surfaces (hub, for-you, listings, signup form) and verifies the portal auth gate redirects correctly.",
    startPath: "/invest/startups",
  },
];

/**
 * Advisor portal personas — anonymous smoke test of the advisor portal login
 * shell and public advisor surfaces. No storageState required.
 * Drives ADVISOR_PORTAL_FLOW (see flows/advisor-portal.ts).
 */
export const ADVISOR_PORTAL_PERSONAS: Persona[] = [
  {
    name: "advisor-portal",
    description:
      "Smoke-tests the advisor portal login form render + field check, health endpoint, advisor directory hub, and find-advisor entry point.",
    startPath: "/advisor-portal",
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

/**
 * Mobile viewport personas — mirrors PHASE0_PERSONAS routes on an iPhone 14
 * form factor. Catches mobile-specific failures: overlapping elements, tap
 * targets < 44px, horizontal overflow, nav collapse regressions. The fleet
 * creates these sessions with `devices["iPhone 14"]` viewport so they run
 * exactly like real mobile browsers.
 */
export const MOBILE_PERSONAS: Persona[] = [
  {
    name: "mobile-broker-shopper",
    description: "Mobile user comparing brokers on an iPhone 14.",
    routes: ["/", "/compare", "/calculators", "/how-we-earn"],
  },
  {
    name: "mobile-advice-seeker",
    description: "Mobile user looking for a financial adviser.",
    routes: ["/", "/advisors", "/find-advisor", "/about"],
  },
  {
    name: "mobile-learner",
    description: "Mobile user researching concepts before investing.",
    routes: ["/", "/glossary", "/foreign-investment", "/share-trading"],
  },
];

/**
 * AI copy-quality personas: each is given a focused revenue page and asked to
 * judge H1 clarity, fee/risk disclosure completeness, and CTA obviousness like
 * a first-time visitor. Run only when AI is enabled. Costs ~$0.05–0.15 per
 * page depending on length.
 *
 * These are the top revenue-generating pages — the ones where a poor first
 * impression or missing disclosure has the highest financial/regulatory impact.
 */
export const AI_COPY_PERSONAS: Persona[] = [
  {
    name: "ai-copy-homepage",
    description: "AI copy judge: homepage value proposition + CTA clarity.",
    startPath: "/",
    goal: "You are a first-time visitor who knows nothing about this site. Read this page carefully. Score (1–5) and explain: (1) Is the H1 a clear value proposition — does it tell you exactly what the site does? (2) Are fees and risks honestly disclosed? (3) Is there one obvious primary CTA and is it clear what clicking it does? (4) Is the compliance/disclaimer copy present and readable (not buried)? Report any confusion, missing information, or dark patterns. Be specific — quote the actual text that succeeds or fails.",
  },
  {
    name: "ai-copy-compare",
    description: "AI copy judge: compare page fee transparency + CTA.",
    startPath: "/compare",
    goal: "You are evaluating this comparison page as a potential investor. Score (1–5) and explain: (1) Is it immediately clear HOW platforms are being compared — what criteria, who collected the data, how recent is it? (2) Are sponsored/promoted listings clearly labelled as such? (3) Are brokerage fees the single most prominent piece of information for each platform? (4) Is there a clear path to learn more or open an account? Report any dark patterns, missing disclosures, or confusing UI.",
  },
  {
    name: "ai-copy-advisor-directory",
    description: "AI copy judge: advisor directory trust signals + AFSL disclosure.",
    startPath: "/advisors",
    goal: "You are evaluating this financial adviser directory as someone about to trust a stranger with their money. Score (1–5): (1) Is it clear how advisers were vetted — are AFSL numbers shown? (2) Are fees disclosed for listed advisers? (3) Is it obvious this is a directory/comparison site, not a personal-advice service? (4) Are there clear trust signals (ASIC licence verification, client reviews, recency of data)? Flag any areas where a user could be misled about the site's licensing status or the nature of the service.",
  },
  {
    name: "ai-copy-share-trading",
    description: "AI copy judge: share trading pillar page — clarity for beginners.",
    startPath: "/share-trading",
    goal: "You are a complete beginner considering their first share trading account. Score (1–5): (1) Does the page help you understand what share trading is before promoting platforms? (2) Are CHESS sponsorship and custodian model differences clearly explained? (3) Are fee comparisons prominent and easy to understand? (4) Is the general-information-only disclaimer visible and not buried? Quote specific text that works well or fails.",
  },
  {
    name: "ai-copy-broker-detail",
    description: "AI copy judge: individual broker profile page quality.",
    startPath: "/broker/stake",
    goal: "You are evaluating a broker profile page as a potential customer. Score (1–5): (1) Are all key fees (brokerage, FX, inactivity) prominently shown and up-to-date? (2) Is CHESS sponsorship status clearly stated? (3) Are pros and cons balanced — or does the copy read like an ad? (4) Is the affiliate/commercial relationship with the broker disclosed? Report anything that reads as promotional rather than factual.",
  },
];
