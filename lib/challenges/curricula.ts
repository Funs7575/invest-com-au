/**
 * Code-defined challenge curricula.
 *
 * Cohort Challenges (idea #20) are time-boxed, task/learning-based group
 * programs. The DB `challenges` table holds one row per cohort *run* and joins
 * to its curriculum here via `curriculum_key`. The curriculum — the ordered
 * daily tasks — lives in code so it ships, versions, and reviews like any other
 * content, and so every task's action link is a *verified* real route in this
 * repo (the curriculum-integrity test asserts both unique keys and that every
 * `href` resolves).
 *
 * COMPLIANCE: strictly task/learning-based. Tasks walk users through existing
 * general-information surfaces (set a goal, run the health check, read a
 * lesson). There is deliberately NO portfolio-performance task, NO returns
 * comparison, and NO leaderboard — these stay inside general-information
 * territory and clear of personal-advice / competition framing.
 */

/** A single daily task within a challenge curriculum. */
export interface ChallengeTask {
  /**
   * Stable, unique-within-curriculum identifier. Persisted in
   * `challenge_task_completions.task_key`, so NEVER rename a shipped key —
   * doing so would orphan completions. Add new keys, deprecate old ones.
   */
  key: string;
  /** 1-based day this task unlocks on. */
  day: number;
  /** Short imperative title shown in the day list. */
  title: string;
  /** One-line description of what completing this task involves. */
  description: string;
  /**
   * In-app destination that completing the task involves. MUST resolve to a
   * real route in this repo — asserted by the curriculum-integrity test.
   * Always a root-relative path.
   */
  href: string;
  /** Label for the action button/link (e.g. "Set a goal"). */
  actionLabel: string;
  /**
   * Human description of when the task counts as done. Tasks are
   * self-attested via the mark-complete control (we don't instrument every
   * downstream surface) — this sets the expectation honestly.
   */
  completionTrigger: string;
}

/** A full code-defined curriculum (the template behind one or more cohorts). */
export interface ChallengeCurriculum {
  /** Joins to `challenges.curriculum_key`. Stable; never rename. */
  key: string;
  /** Display title (mirrors the cohort row title for standalone use). */
  title: string;
  /** One-paragraph program summary. */
  summary: string;
  /** Total program length in days (max task day). Derived but stored for display. */
  durationDays: number;
  /** Ordered daily tasks. */
  tasks: readonly ChallengeTask[];
}

// ─── Program 1: Get Investment-Ready in 21 Days ───────────────────────────────
//
// A 21-day onboarding ramp that walks a new investor through the core
// general-information surfaces of the site: set a goal, capture holdings, run
// the health check, learn the fundamentals, set an alert, and book a review.
// Every href is verified against the app router.

const INVESTMENT_READY_21: ChallengeCurriculum = {
  key: "investment-ready-21",
  title: "Get Investment-Ready in 21 Days",
  summary:
    "A 21-day guided ramp that walks you through the essentials — set a goal, " +
    "map your holdings, run a portfolio health check, learn the fundamentals, " +
    "and set up the tools that keep you on track. General information only; not " +
    "personal advice.",
  durationDays: 21,
  tasks: [
    {
      key: "ir21-d01-set-goal",
      day: 1,
      title: "Set your first investing goal",
      description:
        "Name what you're investing for and a rough timeframe. A clear goal is " +
        "the anchor for everything that follows.",
      href: "/account/goals",
      actionLabel: "Set a goal",
      completionTrigger: "Mark complete once you've saved a goal.",
    },
    {
      key: "ir21-d02-investor-profile",
      day: 2,
      title: "Complete your investor profile",
      description:
        "Tell us your experience level and timeframe so the site can tailor the " +
        "general information it surfaces to you.",
      href: "/account/investor-profile",
      actionLabel: "Update profile",
      completionTrigger: "Mark complete once your profile is saved.",
    },
    {
      key: "ir21-d03-compound-interest",
      day: 3,
      title: "Learn how compound interest works",
      description:
        "Start the New Investor learning path — the first lesson covers why " +
        "starting early matters more than starting big.",
      href: "/learn/new-investor",
      actionLabel: "Start the path",
      completionTrigger: "Mark complete once you've read the opening lesson.",
    },
    {
      key: "ir21-d04-add-holdings",
      day: 4,
      title: "Add your current holdings",
      description:
        "Record what you already hold (even if it's just super or a savings " +
        "balance). The health check needs this to work.",
      href: "/account/holdings",
      actionLabel: "Add holdings",
      completionTrigger: "Mark complete once you've added at least one holding.",
    },
    {
      key: "ir21-d05-diversification",
      day: 5,
      title: "Understand diversification",
      description:
        "Continue the New Investor path — the diversification lesson explains " +
        "the core principle behind every long-term portfolio.",
      href: "/learn/new-investor",
      actionLabel: "Continue learning",
      completionTrigger: "Mark complete once you've read the diversification lesson.",
    },
    {
      key: "ir21-d06-net-worth",
      day: 6,
      title: "Map your net worth",
      description:
        "Pull your assets and liabilities into one view so you can see the whole " +
        "picture, not just one account.",
      href: "/account/net-worth",
      actionLabel: "Build net worth",
      completionTrigger: "Mark complete once your net worth snapshot is saved.",
    },
    {
      key: "ir21-d07-health-check",
      day: 7,
      title: "Run your portfolio health check",
      description:
        "Week one checkpoint: run the health check on your holdings to see where " +
        "you stand on diversification, fees, and concentration.",
      href: "/account/health",
      actionLabel: "Run health check",
      completionTrigger: "Mark complete once you've viewed your health score.",
    },
    {
      key: "ir21-d08-etf-vs-managed",
      day: 8,
      title: "ETFs vs managed funds",
      description:
        "Learn the difference between the two main vehicles for diversified " +
        "investing in the New Investor path.",
      href: "/learn/new-investor",
      actionLabel: "Read the lesson",
      completionTrigger: "Mark complete once you've read the ETF vs managed fund lesson.",
    },
    {
      key: "ir21-d09-choose-broker",
      day: 9,
      title: "Learn how to choose a broker",
      description:
        "Switch to the broker-selection path to understand brokerage, CHESS, and " +
        "what actually matters when picking a platform.",
      href: "/learn/choosing-a-broker",
      actionLabel: "Start broker path",
      completionTrigger: "Mark complete once you've read the broker-selection intro.",
    },
    {
      key: "ir21-d10-compare-platforms",
      day: 10,
      title: "Compare trading platforms",
      description:
        "Put the theory into practice — browse the live platform comparison and " +
        "shortlist a couple that fit how you want to invest.",
      href: "/compare",
      actionLabel: "Compare platforms",
      completionTrigger: "Mark complete once you've reviewed the comparison table.",
    },
    {
      key: "ir21-d11-fees",
      day: 11,
      title: "Check what fees really cost",
      description:
        "Use the portfolio calculator to see the true cost of fees on your trades " +
        "and how they compound over time.",
      href: "/portfolio-calculator",
      actionLabel: "Calculate fees",
      completionTrigger: "Mark complete once you've run a fee calculation.",
    },
    {
      key: "ir21-d12-dollar-cost-averaging",
      day: 12,
      title: "Learn dollar-cost averaging",
      description:
        "Read how regular, automatic investing smooths out market timing — a " +
        "lesson in the New Investor path.",
      href: "/learn/new-investor",
      actionLabel: "Read the lesson",
      completionTrigger: "Mark complete once you've read the dollar-cost-averaging lesson.",
    },
    {
      key: "ir21-d13-super-basics",
      day: 13,
      title: "Review your super basics",
      description:
        "Super is most people's biggest investment. Read the retirement & super " +
        "path intro to understand the fundamentals.",
      href: "/learn/retirement-and-super",
      actionLabel: "Read super basics",
      completionTrigger: "Mark complete once you've read the super intro.",
    },
    {
      key: "ir21-d14-watchlist",
      day: 14,
      title: "Build a watchlist",
      description:
        "Week two checkpoint: start a watchlist of investments you want to follow " +
        "so you're learning by observing, not guessing.",
      href: "/account/watchlist",
      actionLabel: "Build watchlist",
      completionTrigger: "Mark complete once you've added something to your watchlist.",
    },
    {
      key: "ir21-d15-cgt-discount",
      day: 15,
      title: "Understand the CGT discount",
      description:
        "Tax matters to returns. Read how the capital-gains-tax discount works in " +
        "the New Investor path.",
      href: "/learn/new-investor",
      actionLabel: "Read the lesson",
      completionTrigger: "Mark complete once you've read the CGT discount lesson.",
    },
    {
      key: "ir21-d16-rate-alert",
      day: 16,
      title: "Set a rate alert",
      description:
        "Set a savings or term-deposit rate alert so the cash side of your money " +
        "is working as hard as the invested side.",
      href: "/rate-alerts",
      actionLabel: "Set an alert",
      completionTrigger: "Mark complete once you've created a rate alert.",
    },
    {
      key: "ir21-d17-rebalancing",
      day: 17,
      title: "Learn portfolio rebalancing",
      description:
        "Read how periodic rebalancing keeps your portfolio aligned with your " +
        "plan — a lesson in the New Investor path.",
      href: "/learn/new-investor",
      actionLabel: "Read the lesson",
      completionTrigger: "Mark complete once you've read the rebalancing lesson.",
    },
    {
      key: "ir21-d18-rerun-health",
      day: 18,
      title: "Re-run your health check",
      description:
        "Now that holdings and goals are in place, run the health check again and " +
        "compare it with your week-one result.",
      href: "/account/health",
      actionLabel: "Re-run health check",
      completionTrigger: "Mark complete once you've reviewed your updated health score.",
    },
    {
      key: "ir21-d19-calendar",
      day: 19,
      title: "Add key dates to your calendar",
      description:
        "Add review reminders and important money dates to your calendar so " +
        "momentum survives past day 21.",
      href: "/account/calendar",
      actionLabel: "Open calendar",
      completionTrigger: "Mark complete once you've added a date.",
    },
    {
      key: "ir21-d20-find-advisor",
      day: 20,
      title: "See if an advisor could help",
      description:
        "Some decisions are worth a professional. Run the find-an-advisor matcher " +
        "to see who could help with your situation — no obligation.",
      href: "/find-advisor",
      actionLabel: "Find an advisor",
      completionTrigger: "Mark complete once you've reviewed your matches.",
    },
    {
      key: "ir21-d21-annual-check",
      day: 21,
      title: "Set up your annual check",
      description:
        "Finish strong: set up a recurring annual money check so you keep the " +
        "habit you've just built. You're investment-ready.",
      href: "/account/annual-check",
      actionLabel: "Set up annual check",
      completionTrigger: "Mark complete to finish the program.",
    },
  ],
};

// ─── Program 2: EOFY Sprint (14 days) ─────────────────────────────────────────
//
// A 14-day program timed for the run-up to 30 June: review super
// contributions, check fees, run the relevant calculators, and book an EOFY
// review. Tax/super content is advice-adjacent, so the challenge surfaces carry
// the compliance footer.

const EOFY_SPRINT_14: ChallengeCurriculum = {
  key: "eofy-sprint-14",
  title: "EOFY Sprint",
  summary:
    "A 14-day run-up to 30 June: review your super contributions, check fee " +
    "drag, run the EOFY calculators, and line up a review. General information " +
    "only — consider getting personal tax advice for your situation.",
  durationDays: 14,
  tasks: [
    {
      key: "eofy14-d01-super-contributions",
      day: 1,
      title: "Review your super contributions",
      description:
        "Read the super contributions guide to understand concessional and " +
        "non-concessional caps before the year ends.",
      href: "/super/contributions",
      actionLabel: "Read contributions guide",
      completionTrigger: "Mark complete once you've read the contributions overview.",
    },
    {
      key: "eofy14-d02-contributions-calculator",
      day: 2,
      title: "Run the contributions calculator",
      description:
        "Model how extra concessional contributions could affect your position " +
        "this financial year.",
      href: "/super-contributions-calculator",
      actionLabel: "Open calculator",
      completionTrigger: "Mark complete once you've run a contribution scenario.",
    },
    {
      key: "eofy14-d03-catch-up",
      day: 3,
      title: "Check catch-up contributions",
      description:
        "If you haven't used your full cap in recent years, read how carry-forward " +
        "catch-up contributions work.",
      href: "/super/catch-up-contributions",
      actionLabel: "Read catch-up guide",
      completionTrigger: "Mark complete once you've reviewed catch-up eligibility.",
    },
    {
      key: "eofy14-d04-fee-drag",
      day: 4,
      title: "Check your super fee drag",
      description:
        "Fees compound over decades. Read how fee drag erodes your balance and " +
        "what a competitive fee looks like.",
      href: "/super/fee-drag",
      actionLabel: "Check fee drag",
      completionTrigger: "Mark complete once you've reviewed the fee-drag explainer.",
    },
    {
      key: "eofy14-d05-co-contribution",
      day: 5,
      title: "See if you qualify for the co-contribution",
      description:
        "Lower-income earners may get a government co-contribution. Check the " +
        "thresholds before 30 June.",
      href: "/super/co-contribution",
      actionLabel: "Check co-contribution",
      completionTrigger: "Mark complete once you've reviewed your eligibility.",
    },
    {
      key: "eofy14-d06-spouse-contribution",
      day: 6,
      title: "Review spouse contributions",
      description:
        "Couples can sometimes claim a tax offset for contributing to a lower-" +
        "income spouse's super. Read how it works.",
      href: "/super/spouse-contributions",
      actionLabel: "Read spouse guide",
      completionTrigger: "Mark complete once you've reviewed spouse contributions.",
    },
    {
      key: "eofy14-d07-compare-super",
      day: 7,
      title: "Compare your super fund",
      description:
        "Week one checkpoint: use the super compare guide to sense-check your " +
        "fund's fees and options against alternatives.",
      href: "/super/compare-guide",
      actionLabel: "Compare super",
      completionTrigger: "Mark complete once you've reviewed the comparison.",
    },
    {
      key: "eofy14-d08-portfolio-fees",
      day: 8,
      title: "Check your brokerage fees",
      description:
        "Use the portfolio calculator to see what you're paying in brokerage and " +
        "whether a switch would pay off.",
      href: "/portfolio-calculator",
      actionLabel: "Calculate fees",
      completionTrigger: "Mark complete once you've run a fee calculation.",
    },
    {
      key: "eofy14-d09-cgt-discount",
      day: 9,
      title: "Understand the CGT discount",
      description:
        "Holding period affects your tax. Read how the 12-month capital-gains-tax " +
        "discount works before you make any EOFY moves.",
      href: "/learn/new-investor",
      actionLabel: "Read the lesson",
      completionTrigger: "Mark complete once you've read the CGT discount lesson.",
    },
    {
      key: "eofy14-d10-holdings",
      day: 10,
      title: "Update your holdings",
      description:
        "Make sure your recorded holdings are current so any EOFY review is based " +
        "on accurate data.",
      href: "/account/holdings",
      actionLabel: "Update holdings",
      completionTrigger: "Mark complete once your holdings are up to date.",
    },
    {
      key: "eofy14-d11-net-worth",
      day: 11,
      title: "Refresh your net worth",
      description:
        "Snapshot your net worth at financial-year end so you have a clean " +
        "baseline for next year.",
      href: "/account/net-worth",
      actionLabel: "Refresh net worth",
      completionTrigger: "Mark complete once your snapshot is saved.",
    },
    {
      key: "eofy14-d12-tax-record-keeping",
      day: 12,
      title: "Tidy your tax records",
      description:
        "Read the record-keeping guide and gather what you'll need for your " +
        "return — buy dates, dividend statements, and cost bases.",
      href: "/tax/record-keeping",
      actionLabel: "Read record-keeping guide",
      completionTrigger: "Mark complete once you've reviewed your record-keeping.",
    },
    {
      key: "eofy14-d13-find-advisor",
      day: 13,
      title: "Line up an EOFY review",
      description:
        "Run the advisor matcher to find a tax agent or planner who can review " +
        "your position before the deadline.",
      href: "/find-advisor",
      actionLabel: "Find an advisor",
      completionTrigger: "Mark complete once you've reviewed your matches.",
    },
    {
      key: "eofy14-d14-book-review",
      day: 14,
      title: "Schedule your annual check",
      description:
        "Close out the sprint: set up your annual money check so next EOFY is " +
        "calmer than this one.",
      href: "/account/annual-check",
      actionLabel: "Set up annual check",
      completionTrigger: "Mark complete to finish the sprint.",
    },
  ],
};

/**
 * Registry of all shipped curricula, keyed by `curriculum_key`.
 * Add a new program here and seed a `challenges` row that references its key.
 */
export const CHALLENGE_CURRICULA: Readonly<Record<string, ChallengeCurriculum>> = {
  [INVESTMENT_READY_21.key]: INVESTMENT_READY_21,
  [EOFY_SPRINT_14.key]: EOFY_SPRINT_14,
};

/** All curricula as an array (stable order: definition order). */
export const ALL_CURRICULA: readonly ChallengeCurriculum[] = [
  INVESTMENT_READY_21,
  EOFY_SPRINT_14,
];

/**
 * EOFY-adjacent curricula carry the tax/super compliance footer on their
 * challenge surfaces (their tasks touch super/tax content).
 */
export const ADVICE_ADJACENT_CURRICULUM_KEYS: ReadonlySet<string> = new Set([
  EOFY_SPRINT_14.key,
]);
