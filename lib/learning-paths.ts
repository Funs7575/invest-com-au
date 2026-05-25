/**
 * Learning Paths — single source of truth.
 *
 * Each path is an ordered list of steps referencing EXISTING site content:
 * articles, Q&A, glossary terms, calculators, and comparison pages.
 * No new content is authored here — this is purely a sequencing layer.
 *
 * Step kinds:
 *   "article"    → /article/[slug]
 *   "question"   → /questions/[slug]
 *   "glossary"   → /glossary/[term]
 *   "calculator" → /[calculator-path]  (e.g. /compound-interest-calculator)
 *   "page"       → any other internal href (e.g. /brokers, /glossary)
 *
 * Adding a new path: append an entry to LEARNING_PATHS below.
 * Adding a new step kind: extend LearningPathStep.kind union + resolvePath().
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type StepKind = "article" | "question" | "glossary" | "calculator" | "page";

export interface LearningPathStep {
  /** Human-readable title shown in the path UI */
  title: string;
  /** Step content kind — drives URL resolution */
  kind: StepKind;
  /**
   * Slug or path depending on kind:
   *   article    → article slug (no /article/ prefix)
   *   question   → question slug (no /questions/ prefix)
   *   glossary   → term slug (no /glossary/ prefix)
   *   calculator → full path from root (e.g. "/compound-interest-calculator")
   *   page       → full path from root (e.g. "/brokers")
   */
  slug: string;
  /** Estimated reading/completion time in minutes */
  estimatedMinutes: number;
  /** Optional short description shown below the step title */
  description?: string;
}

export interface LearningPath {
  /** URL-safe identifier — used in /learn/[path] */
  slug: string;
  /** Display title */
  title: string;
  /** One-line description shown on the hub */
  description: string;
  /** Target audience / use-case tag shown on cards */
  audience: string;
  /** Accent colour class (Tailwind) for card + header */
  colorClass: string;
  /** Total estimated time (sum of step estimatedMinutes, pre-computed for display) */
  estimatedMinutes: number;
  /** Ordered list of steps */
  steps: LearningPathStep[];
}

// ─── Path Definitions ─────────────────────────────────────────────────────────

export const LEARNING_PATHS: LearningPath[] = [
  // ── 1. New Investor ──────────────────────────────────────────────────────────
  {
    slug: "new-investor",
    title: "New Investor Starter Kit",
    description:
      "Go from zero to your first investment — covering the basics, how to choose a broker, and building a simple portfolio.",
    audience: "Complete beginners",
    colorClass: "teal",
    estimatedMinutes: 65,
    steps: [
      {
        title: "How compound interest works",
        kind: "question",
        slug: "how-does-compound-interest-work",
        estimatedMinutes: 5,
        description: "Why starting early matters more than investing more.",
      },
      {
        title: "What is diversification?",
        kind: "question",
        slug: "what-is-diversification-in-investing",
        estimatedMinutes: 5,
        description: "The core principle behind every long-term portfolio.",
      },
      {
        title: "ETF vs managed fund — what's the difference?",
        kind: "question",
        slug: "what-is-the-difference-between-etf-and-managed-fund",
        estimatedMinutes: 6,
        description: "The two main vehicles for diversified investing.",
      },
      {
        title: "Key terms: ASX, ETF, Brokerage, CHESS",
        kind: "page",
        slug: "/glossary",
        estimatedMinutes: 5,
        description: "Browse the investing glossary for unfamiliar terms.",
      },
      {
        title: "How to choose a broker in Australia",
        kind: "article",
        slug: "how-to-choose-a-broker",
        estimatedMinutes: 10,
        description: "Compare ASX brokers by fees, features, and platform quality.",
      },
      {
        title: "Compare Australian brokers",
        kind: "page",
        slug: "/brokers",
        estimatedMinutes: 10,
        description: "Side-by-side broker comparison with live fees.",
      },
      {
        title: "Dollar-cost averaging explained",
        kind: "question",
        slug: "how-does-dollar-cost-averaging-work",
        estimatedMinutes: 5,
        description: "A simple strategy to reduce timing risk.",
      },
      {
        title: "What are shares vs bonds?",
        kind: "question",
        slug: "what-is-the-difference-between-shares-and-bonds",
        estimatedMinutes: 5,
        description: "The two building blocks of most portfolios.",
      },
      {
        title: "Compound interest calculator",
        kind: "calculator",
        slug: "/compound-interest-calculator",
        estimatedMinutes: 5,
        description: "Model the long-term growth of your planned contributions.",
      },
      {
        title: "Portfolio rebalancing",
        kind: "question",
        slug: "how-does-portfolio-rebalancing-work",
        estimatedMinutes: 5,
        description: "How to keep your portfolio on target over time.",
      },
      {
        title: "Capital gains tax discount",
        kind: "question",
        slug: "what-is-capital-gains-tax-discount",
        estimatedMinutes: 4,
        description: "The 50% CGT discount — who gets it and when.",
      },
    ],
  },

  // ── 2. Choosing a Broker ─────────────────────────────────────────────────────
  {
    slug: "choosing-a-broker",
    title: "Choosing the Right Broker",
    description:
      "Understand brokerage fees, CHESS vs custodial accounts, and how to compare platforms before you open an account.",
    audience: "About to open a brokerage account",
    colorClass: "blue",
    estimatedMinutes: 46,
    steps: [
      {
        title: "What is brokerage?",
        kind: "glossary",
        slug: "brokerage",
        estimatedMinutes: 3,
        description: "The core fee every trader pays — explained simply.",
      },
      {
        title: "CHESS vs custodial — what's the difference?",
        kind: "glossary",
        slug: "chess",
        estimatedMinutes: 4,
        description: "Who actually holds your shares matters.",
      },
      {
        title: "What is a PDS?",
        kind: "glossary",
        slug: "pds",
        estimatedMinutes: 3,
        description: "The document you must read before buying any financial product.",
      },
      {
        title: "What is ASIC regulation?",
        kind: "glossary",
        slug: "asic-regulated",
        estimatedMinutes: 3,
        description: "How brokers are regulated and why it protects you.",
      },
      {
        title: "How to choose a broker in Australia",
        kind: "article",
        slug: "how-to-choose-a-broker",
        estimatedMinutes: 10,
        description: "Full guide — fees, features, and platform quality.",
      },
      {
        title: "Compare brokers",
        kind: "page",
        slug: "/brokers",
        estimatedMinutes: 10,
        description: "Side-by-side comparison of Australian brokers.",
      },
      {
        title: "Total cost of ownership calculator",
        kind: "calculator",
        slug: "/tco-calculator",
        estimatedMinutes: 5,
        description: "Model the real annual cost of each broker for your trading style.",
      },
      {
        title: "Trade cost calculator",
        kind: "calculator",
        slug: "/trade-cost-calculator",
        estimatedMinutes: 5,
        description: "Compare per-trade costs across brokers.",
      },
      {
        title: "What is the AFSL?",
        kind: "glossary",
        slug: "afsl",
        estimatedMinutes: 3,
        description: "The licence every Australian financial service provider needs.",
      },
    ],
  },

  // ── 3. Retirement & Super ─────────────────────────────────────────────────────
  {
    slug: "retirement-and-super",
    title: "Retirement & Super",
    description:
      "Master superannuation contributions, the SMSF decision, preservation age, and planning your retirement income.",
    audience: "Working Australians planning for retirement",
    colorClass: "amber",
    estimatedMinutes: 67,
    steps: [
      {
        title: "What is superannuation?",
        kind: "glossary",
        slug: "superannuation",
        estimatedMinutes: 4,
        description: "Australia's compulsory retirement savings system explained.",
      },
      {
        title: "What is the super guarantee rate for FY2026?",
        kind: "question",
        slug: "what-is-the-super-guarantee-rate-fy2026",
        estimatedMinutes: 4,
        description: "How much your employer is required to contribute.",
      },
      {
        title: "What is salary sacrifice for super?",
        kind: "question",
        slug: "what-is-salary-sacrifice-super",
        estimatedMinutes: 5,
        description: "Cut your tax bill while boosting your super balance.",
      },
      {
        title: "Concessional contributions explained",
        kind: "question",
        slug: "what-is-concessional-contribution",
        estimatedMinutes: 5,
        description: "The annual cap and how to maximise it.",
      },
      {
        title: "How do franking credits work in super?",
        kind: "question",
        slug: "how-do-franking-credits-work-in-super",
        estimatedMinutes: 5,
        description: "The tax refund that makes Australian shares particularly attractive inside super.",
      },
      {
        title: "What is SMSF and is it worth it?",
        kind: "question",
        slug: "what-is-smsf-and-is-it-worth-it",
        estimatedMinutes: 7,
        description: "When an SMSF makes sense — and when it doesn't.",
      },
      {
        title: "SMSF setup cost Australia 2026",
        kind: "article",
        slug: "smsf-setup-cost-australia-2026",
        estimatedMinutes: 8,
        description: "Real 2026 SMSF setup and annual running costs.",
      },
      {
        title: "What is the super preservation age?",
        kind: "question",
        slug: "what-is-the-super-preservation-age",
        estimatedMinutes: 4,
        description: "When you can access your super — and under what conditions.",
      },
      {
        title: "How does the First Home Super Saver Scheme work?",
        kind: "question",
        slug: "how-does-the-first-home-super-saver-scheme-work",
        estimatedMinutes: 5,
        description: "Using your super to help buy your first home.",
      },
      {
        title: "Super contributions calculator",
        kind: "calculator",
        slug: "/super-contributions-calculator",
        estimatedMinutes: 5,
        description: "Model the impact of extra contributions on your balance at retirement.",
      },
      {
        title: "Retirement calculator",
        kind: "calculator",
        slug: "/retirement-calculator",
        estimatedMinutes: 5,
        description: "Project your income in retirement based on your savings rate.",
      },
      {
        title: "SMSF calculator",
        kind: "calculator",
        slug: "/smsf-calculator",
        estimatedMinutes: 5,
        description: "Compare the cost of an SMSF vs a retail or industry fund.",
      },
      {
        title: "What is the age pension assets test?",
        kind: "question",
        slug: "what-is-the-age-pension-assets-test",
        estimatedMinutes: 5,
        description: "How your assets affect your Age Pension eligibility.",
      },
    ],
  },

  // ── 4. Tax-Smart Investing ────────────────────────────────────────────────────
  {
    slug: "tax-smart-investing",
    title: "Tax-Smart Investing",
    description:
      "Understand CGT, franking credits, negative gearing, and tax-loss harvesting — and how to minimise your investment tax bill legally.",
    audience: "Investors wanting to reduce tax",
    colorClass: "purple",
    estimatedMinutes: 61,
    steps: [
      {
        title: "How does negative gearing work?",
        kind: "question",
        slug: "how-does-negative-gearing-work",
        estimatedMinutes: 7,
        description: "When investment losses reduce your taxable income.",
      },
      {
        title: "How does franking credit work?",
        kind: "question",
        slug: "how-does-franking-credit-work",
        estimatedMinutes: 6,
        description: "The tax credit attached to dividends from Australian companies.",
      },
      {
        title: "What is capital gains tax discount?",
        kind: "question",
        slug: "what-is-capital-gains-tax-discount",
        estimatedMinutes: 5,
        description: "The 50% discount for assets held more than 12 months.",
      },
      {
        title: "How does tax-loss harvesting work?",
        kind: "question",
        slug: "how-does-tax-loss-harvesting-work",
        estimatedMinutes: 5,
        description: "Sell losing positions to offset gains — legally.",
      },
      {
        title: "Should I pay off my mortgage or invest?",
        kind: "question",
        slug: "should-i-pay-off-mortgage-or-invest",
        estimatedMinutes: 6,
        description: "The maths behind one of the most common financial trade-offs.",
      },
      {
        title: "How does depreciation work for investment property?",
        kind: "question",
        slug: "how-does-depreciation-work-for-investment-property",
        estimatedMinutes: 6,
        description: "Maximise your property tax deductions with depreciation schedules.",
      },
      {
        title: "What is the principal place of residence CGT exemption?",
        kind: "question",
        slug: "what-is-the-principal-place-of-residence-cgt-exemption",
        estimatedMinutes: 5,
        description: "When selling your home is tax-free.",
      },
      {
        title: "How do I report crypto tax in Australia?",
        kind: "question",
        slug: "how-do-i-report-crypto-tax-in-australia",
        estimatedMinutes: 6,
        description: "ATO treatment of Bitcoin, ETH, and DeFi.",
      },
      {
        title: "CGT calculator",
        kind: "calculator",
        slug: "/cgt-calculator",
        estimatedMinutes: 5,
        description: "Estimate your capital gains tax on a share or property sale.",
      },
      {
        title: "Investment income tax calculator",
        kind: "calculator",
        slug: "/investment-income-tax-calculator",
        estimatedMinutes: 5,
        description: "Model tax on dividends, interest, and capital gains.",
      },
      {
        title: "Franking credits calculator",
        kind: "calculator",
        slug: "/franking-credits-calculator",
        estimatedMinutes: 5,
        description: "See how much extra you get back from franked dividends.",
      },
    ],
  },

  // ── 5. Foreign Investor Guide ────────────────────────────────────────────────
  {
    slug: "foreign-investor",
    title: "Foreign Investor Guide",
    description:
      "Navigate FIRB rules, Australian tax residency, withholding tax on dividends, and how to invest in Australian assets as a non-resident.",
    audience: "Expats & foreign nationals",
    colorClass: "rose",
    estimatedMinutes: 45,
    steps: [
      {
        title: "What is FIRB?",
        kind: "glossary",
        slug: "firb",
        estimatedMinutes: 4,
        description: "The Foreign Investment Review Board — when approval is required.",
      },
      {
        title: "What is tax residency?",
        kind: "glossary",
        slug: "tax-residency",
        estimatedMinutes: 4,
        description: "How Australia determines whether you pay tax as a resident.",
      },
      {
        title: "What is non-resident withholding tax?",
        kind: "glossary",
        slug: "non-resident-withholding-tax",
        estimatedMinutes: 3,
        description: "The tax withheld from dividends and interest paid to non-residents.",
      },
      {
        title: "What is a double tax agreement?",
        kind: "glossary",
        slug: "double-tax-agreement",
        estimatedMinutes: 4,
        description: "How tax treaties prevent you being taxed twice.",
      },
      {
        title: "What is temporary resident?",
        kind: "glossary",
        slug: "temporary-resident",
        estimatedMinutes: 3,
        description: "Your tax obligations on a temporary visa.",
      },
      {
        title: "Non-resident CGT checker",
        kind: "page",
        slug: "/non-resident-cgt-checker",
        estimatedMinutes: 5,
        description: "Check which assets attract CGT when held by non-residents.",
      },
      {
        title: "Non-resident dividend calculator",
        kind: "calculator",
        slug: "/non-resident-dividend-calculator",
        estimatedMinutes: 5,
        description: "Model withholding tax on Australian dividends.",
      },
      {
        title: "FIRB fee estimator",
        kind: "page",
        slug: "/firb-fee-estimator",
        estimatedMinutes: 5,
        description: "Estimate FIRB application fees for your intended investment.",
      },
      {
        title: "Foreign investment hub",
        kind: "page",
        slug: "/foreign-investment",
        estimatedMinutes: 5,
        description: "Country-specific rules and guides for investing in Australia.",
      },
      {
        title: "What is the stamp duty surcharge for foreign buyers?",
        kind: "glossary",
        slug: "stamp-duty-surcharge-foreign",
        estimatedMinutes: 4,
        description: "Additional stamp duty that applies in most states for foreign purchasers.",
      },
      {
        title: "Vacancy fee explained",
        kind: "glossary",
        slug: "vacancy-fee",
        estimatedMinutes: 3,
        description: "The ATO fee on properties left vacant by foreign owners.",
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Look up a single learning path by its slug.
 * Returns undefined if the slug doesn't exist.
 */
export function getLearningPath(slug: string): LearningPath | undefined {
  return LEARNING_PATHS.find((p) => p.slug === slug);
}

/**
 * Resolve the canonical site URL for a given step.
 * All returned paths are absolute from the site root (start with "/").
 */
export function resolvePath(step: LearningPathStep): string {
  switch (step.kind) {
    case "article":
      return `/article/${step.slug}`;
    case "question":
      return `/questions/${step.slug}`;
    case "glossary":
      return `/glossary/${step.slug}`;
    case "calculator":
    case "page":
      // slug must already be a full path starting with "/"
      return step.slug;
    default: {
      // exhaustiveness guard
      const _exhaustive: never = step.kind;
      return _exhaustive;
    }
  }
}

/**
 * Return the total estimated minutes for a path, derived from its steps.
 * Useful in tests to verify the pre-computed estimatedMinutes is accurate.
 */
export function sumEstimatedMinutes(path: LearningPath): number {
  return path.steps.reduce((acc, s) => acc + s.estimatedMinutes, 0);
}

/**
 * Return all step URLs for a given path, resolving each step to its URL.
 * Useful for verifying that no steps reference non-existent slugs.
 */
export function getStepUrls(path: LearningPath): string[] {
  return path.steps.map(resolvePath);
}

/**
 * Assert that calculator and page steps have slugs that start with "/".
 * Article/question/glossary steps must NOT start with "/".
 * Used in tests to catch misconfigured slugs.
 */
export function validateStepSlug(step: LearningPathStep): boolean {
  if (step.kind === "calculator" || step.kind === "page") {
    return step.slug.startsWith("/");
  }
  // article, question, glossary slugs must not have a leading slash
  return !step.slug.startsWith("/");
}

/**
 * Validate all steps in all paths. Returns an array of error messages.
 * Empty array means all paths are valid.
 */
export function validateAllPaths(): string[] {
  const errors: string[] = [];
  for (const path of LEARNING_PATHS) {
    if (!path.slug || !/^[a-z0-9-]+$/.test(path.slug)) {
      errors.push(`Path "${path.slug}" has an invalid slug (must be lowercase alphanumeric + hyphens)`);
    }
    if (path.steps.length === 0) {
      errors.push(`Path "${path.slug}" has no steps`);
    }
    for (const [i, step] of path.steps.entries()) {
      if (!step.title) {
        errors.push(`Path "${path.slug}" step ${i} is missing a title`);
      }
      if (!step.slug) {
        errors.push(`Path "${path.slug}" step ${i} ("${step.title}") is missing a slug`);
      }
      if (!validateStepSlug(step)) {
        errors.push(
          `Path "${path.slug}" step ${i} ("${step.title}"): slug "${step.slug}" is invalid for kind "${step.kind}". ` +
            `calculator/page slugs must start with "/"; article/question/glossary must not.`
        );
      }
      if (step.estimatedMinutes <= 0) {
        errors.push(
          `Path "${path.slug}" step ${i} ("${step.title}") has invalid estimatedMinutes: ${step.estimatedMinutes}`
        );
      }
    }
  }
  return errors;
}
