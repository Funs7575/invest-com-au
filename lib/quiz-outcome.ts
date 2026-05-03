/**
 * Quiz outcome resolver.
 *
 * The original quiz architecture had three tracks: DIY broker, advisor match,
 * international. That misses a chunk of users whose best move is something
 * else entirely:
 *
 *   • a complex situation that doesn't fit any single advisor type → the
 *     fastest path is to post a brief and get quotes (post-job)
 *   • a high-net-worth complex situation → no single product is the answer,
 *     it's a coordinated stack (bundle-stack)
 *   • a beginner who isn't sure what they want yet → a platform pick is
 *     premature, they need orientation (education-first)
 *   • a goal where a calculator answers the real question first (super,
 *     property) → run the numbers, then pick the platform (calculator-first)
 *   • a help-mode user who'd rather shop themselves than be matched →
 *     directory browse, not match (advisor-browse)
 *
 * `resolveBestOutcome()` reads the quiz's structured answers and returns
 * the inferred best primary action with reasoning + a CTA URL that carries
 * the user's quiz context as query params (so the destination can pre-fill
 * forms / pre-filter listings instead of asking again).
 *
 * The result page renders this as a hero card ABOVE the broker / advisor
 * results so the user sees the inferred-best move first, with the rest of
 * the funnel as fallback. They can ignore the hero — it's a recommendation,
 * not a redirect.
 */

export interface UnifiedAnswersInput {
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
}

export type OutcomeKind =
  | "post-job"
  | "advisor-match"
  | "advisor-browse"
  | "calculator-first"
  | "education-first"
  | "diy-broker"
  | "bundle-stack"
  | "listings-browse";

export interface SecondaryAction {
  label: string;
  href: string;
}

export interface BestOutcome {
  kind: OutcomeKind;
  /** Short headline rendered as the hero H2 */
  headline: string;
  /** 1–2 sentence rationale shown under the headline */
  reason: string;
  /** Primary CTA text */
  ctaLabel: string;
  /** Primary CTA href, with prefill query params already attached */
  ctaHref: string;
  /** Secondary actions (rendered as subtle pill links) */
  secondaryActions: SecondaryAction[];
  /** Tone for the hero card colouring */
  tone: "amber" | "violet" | "blue" | "emerald" | "slate";
  /** Icon name (must exist in components/Icon.tsx) */
  icon: string;
  /** When true, suppress the broker leaderboard below the hero entirely */
  suppressBrokerResults?: boolean;
  /** When true, suppress the runner-ups list (keep top-match for context) */
  suppressRunnerUps?: boolean;
}

function isInternational(a: UnifiedAnswersInput): boolean {
  return a.location === "international" || a.location === "expat";
}

/** Build a URL with quiz-context query params. Skips empty values. */
function withParams(base: string, params: Record<string, string | undefined>): string {
  const url = new URL(base, "https://invest.com.au");
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  // Return path + query only — the destination resolves origin
  return url.pathname + (url.search || "");
}

/**
 * The mapping from goal → calculator + pillar that's most useful for that goal.
 * Used by both the calculator-first and bundle-stack outcomes.
 */
const GOAL_CALCULATOR: Record<string, { href: string; label: string }> = {
  super: { href: "/retirement-calculator", label: "Run the retirement calculator" },
  "property-super": { href: "/smsf-calculator", label: "Run the SMSF calculator" },
  property: { href: "/property-yield-calculator", label: "Run the property-yield calculator" },
  home: { href: "/mortgage-calculator", label: "Run the mortgage repayment calculator" },
  crypto: { href: "/cgt-calculator", label: "Run the capital-gains calculator" },
  trade: { href: "/trade-cost-calculator", label: "Run the trade-cost calculator" },
  income: { href: "/franking-credits-calculator", label: "Run the franking-credits calculator" },
  grow: { href: "/compound-interest-calculator", label: "Run the compound-interest calculator" },
};

const QUIZ_AMOUNT_TO_BUDGET: Record<string, string> = {
  small: "under_100k",
  medium: "under_100k",
  large: "100k_500k",
  whale: "500k_2m",
};

/**
 * Decide the inferred best primary action for the user.
 *
 * Order matters — the first matching rule wins. Rules are sequenced so that
 * the "specialised" outcomes (post-job for niche complex; bundle-stack for
 * whale complex; calculator-first for goals where modeling answers the real
 * question) take priority over the generic fall-throughs (advisor-match,
 * diy-broker).
 */
export function resolveBestOutcome(a: UnifiedAnswersInput): BestOutcome {
  const intl = isInternational(a);
  const isComplex = a.complexity === "complex";
  const isWhale = a.amount === "whale";
  const isLarge = a.amount === "large" || isWhale;
  const isBeginner = a.experience === "beginner";
  const isUnsure = a.mode === "unsure";

  // ─── 1. POST-JOB: complex + advisor-not-sure (or international + business)
  // The user's situation is complex enough that they don't know which type
  // of professional they need. Don't force them to pick — let them describe
  // the situation and get quotes.
  const wantsAdvisor = a.mode === "help" || a.goal === "help" || a.goal === "home";
  if (wantsAdvisor && a.advisor_type === "not-sure" && isComplex) {
    return {
      kind: "post-job",
      headline: "Post your situation — get quotes from verified pros",
      reason: "Your situation involves multiple goals or moving parts. Rather than trying to pick the right specialist upfront, describe what you need and verified pros will reply with quotes — no obligation.",
      ctaLabel: "Post your brief →",
      ctaHref: withParams("/quotes/post", {
        context: "quiz",
        goal: a.goal,
        amount: a.amount,
        complexity: a.complexity,
        budget: a.amount ? QUIZ_AMOUNT_TO_BUDGET[a.amount] : undefined,
      }),
      secondaryActions: [
        { label: "Browse all advisor types", href: "/find-advisor" },
        { label: "Compare platforms anyway", href: "/compare" },
      ],
      tone: "violet",
      icon: "megaphone",
      suppressBrokerResults: false,
      suppressRunnerUps: true,
    };
  }

  // International business setup → post-job (niche, can't be matched cleanly)
  if (intl && a.investor_goal_intl === "business") {
    return {
      kind: "post-job",
      headline: "Set up an Australian business — post your brief",
      reason: "Cross-border business setup needs a specialist who knows your situation. Describe what you're doing and get quotes from accountants and advisors who handle international clients.",
      ctaLabel: "Post your brief →",
      ctaHref: withParams("/quotes/post", {
        context: "quiz",
        type: "accountant",
        goal: "business",
        country: a.investor_country,
        visa: a.visa_status,
      }),
      secondaryActions: [
        { label: "Browse accountants", href: "/advisors/accountants" },
        { label: "Browse all advisors", href: "/find-advisor" },
      ],
      tone: "violet",
      icon: "megaphone",
      suppressBrokerResults: true,
    };
  }

  // ─── 2. BUNDLE-STACK: whale + complex
  // No single product is the answer here — they need a coordinated stack.
  if (isWhale && isComplex) {
    return {
      kind: "bundle-stack",
      headline: "You don't need one product — you need a stack",
      reason: "At your level, the right setup is a coordinated team: a financial planner to pull it together, a tax agent for structure, an SMSF accountant if you're going that route, and a low-fee broker for execution. Start with the planner.",
      ctaLabel: "Find a financial planner →",
      ctaHref: withParams("/advisors/financial-planners", {
        context: "quiz",
        budget: a.amount ? QUIZ_AMOUNT_TO_BUDGET[a.amount] : undefined,
      }),
      secondaryActions: [
        { label: "Find a tax agent", href: "/advisors/tax-agents" },
        { label: "Find an SMSF accountant", href: "/advisors/smsf-accountants" },
        { label: "Compare platforms", href: withParams("/compare", { quiz_amount: a.amount }) },
      ],
      tone: "amber",
      icon: "layers",
    };
  }

  // ─── 3. INTERNATIONAL → ADVISOR-MATCH (existing flow handles this)
  // Fall through to the existing international advisor-match path. We don't
  // override here because the international branch has its own
  // location-aware advisor matching that's already built.
  if (intl) {
    return {
      kind: "advisor-match",
      headline: `Talk to an Australian ${a.investor_goal_intl === "property" ? "buyer's agent" : "specialist"}`,
      reason: "International investors usually need an advisor before a platform — cross-border tax, FIRB, and visa rules dominate the decision. We've matched you with a specialist who works with clients from your country.",
      ctaLabel: "See your match →",
      ctaHref: "#advisor-results",
      secondaryActions: [
        { label: "Browse all international advisors", href: "/find-advisor?intl=true" },
        { label: "Post your situation", href: withParams("/quotes/post", { context: "quiz", country: a.investor_country, visa: a.visa_status }) },
      ],
      tone: "blue",
      icon: "globe",
    };
  }

  // ─── 4. EDUCATION-FIRST: unsure + beginner with no clear goal
  // A platform pick is premature. Get oriented first.
  if (isUnsure && isBeginner) {
    return {
      kind: "education-first",
      headline: "Get the basics first — then come back",
      reason: "You're at the start of your investing journey. Picking a platform now risks regret later. Spend 10 minutes orienting yourself first — then retake the quiz with stronger signals.",
      ctaLabel: "Read 'Investing 101' →",
      ctaHref: "/learn",
      secondaryActions: [
        { label: "Compound interest calculator", href: "/compound-interest-calculator" },
        { label: "See platforms anyway", href: "/compare" },
      ],
      tone: "emerald",
      icon: "lightbulb",
      suppressBrokerResults: false,
      suppressRunnerUps: true,
    };
  }

  // ─── 5a. SUPER: advisor-match with conversion-first primary CTA
  // Earlier rev had the retirement calc as primary — that's a conversion leak.
  // SMSF accountant is paid lead-gen ($300-2k CPL) and is the actual right
  // first move for users with super complexity. Calculators move to secondary.
  if (a.goal === "super" || a.property_sub === "property-super") {
    return {
      kind: "advisor-match",
      headline: "An SMSF accountant is your highest-leverage first call",
      reason: "Super is structure-driven. The right move depends on your balance, fund type, and SMSF eligibility — questions an accountant answers in 15 minutes. Run the retirement number after you know which fund / structure is actually right.",
      ctaLabel: "Find an SMSF accountant →",
      ctaHref: withParams("/advisors/smsf-accountants", {
        context: "quiz",
        budget: a.amount ? QUIZ_AMOUNT_TO_BUDGET[a.amount] : undefined,
      }),
      secondaryActions: [
        { label: "Compare super funds", href: "/compare?filter=super" },
        { label: "Find a financial planner", href: "/advisors/financial-planners" },
        { label: "Retirement calculator", href: withParams("/retirement-calculator", { context: "quiz", amount: a.amount }) },
        { label: "SMSF eligibility checker", href: "/tools/smsf-checker" },
      ],
      tone: "amber",
      icon: "users",
    };
  }

  // ─── 5b. PROPERTY (physical): mortgage broker first — they're free
  // (paid by the lender), and the rate they get you dwarfs anything a yield
  // calculator can save. Calculator + buyer's agent move to secondary.
  if (a.goal === "property" && a.property_sub !== "property-reit") {
    return {
      kind: "advisor-match",
      headline: "Mortgage broker first — they're free and pay for themselves",
      reason: "Property is rate-driven. A mortgage broker compares 30+ lenders for free (paid by the lender, not you) and the rate they secure typically saves $5-30k over the life of a loan. Then run the yield numbers and find a buyer's agent.",
      ctaLabel: "Find a mortgage broker →",
      ctaHref: withParams("/advisors/mortgage-brokers", { context: "quiz" }),
      secondaryActions: [
        { label: "Find a buyer's agent", href: "/advisors/buyers-agents" },
        { label: "Property-yield calculator", href: withParams("/property-yield-calculator", { context: "quiz", amount: a.amount }) },
        { label: "Property vs shares calculator", href: "/property-vs-shares-calculator" },
      ],
      tone: "amber",
      icon: "home",
      suppressBrokerResults: true,
    };
  }

  // ─── 5c. HOME LOAN: mortgage broker first
  if (a.goal === "home") {
    return {
      kind: "advisor-match",
      headline: "Mortgage broker — your free shortcut to the best rate",
      reason: "A mortgage broker compares 30+ lenders, free to you (paid by the lender). They typically beat the rate you'd get walking into your own bank. Use the calculators to sanity-check repayments at different rate points.",
      ctaLabel: "Find a mortgage broker →",
      ctaHref: withParams("/advisors/mortgage-brokers", { context: "quiz" }),
      secondaryActions: [
        { label: "Mortgage repayment calculator", href: withParams("/mortgage-calculator", { context: "quiz", amount: a.amount }) },
        { label: "Switching / refinance calculator", href: "/switching-calculator" },
      ],
      tone: "amber",
      icon: "home",
      suppressBrokerResults: true,
    };
  }

  // ─── 5d. ALT-ASSETS: collectibles, whisky, wine, watches, art, coins
  // Routed to /invest/alternatives (the hub the other session shipped overnight)
  // with luxury-asset-broker / wine-advisor / art-advisor as secondary actions
  // and the alt-asset returns calculator as a tertiary tool.
  if (a.goal === "alt-assets") {
    return {
      kind: "listings-browse",
      headline: "Browse alternative assets — whisky, wine, watches, art, classic cars",
      reason: "Alt-assets are illiquid and information-asymmetric. Start by seeing what's actually for sale at what prices, then talk to a luxury-asset specialist before committing. We've got 60+ live listings across 6 sub-categories.",
      ctaLabel: "Browse alternative assets →",
      ctaHref: "/invest/alternatives",
      secondaryActions: [
        { label: "Find a luxury-asset broker", href: "/advisors/luxury-asset-brokers" },
        { label: "Find a wine / art / classic-car advisor", href: "/find-advisor" },
        { label: "Alternative-asset returns calculator", href: "/tools/alternative-returns" },
      ],
      tone: "amber",
      icon: "package",
      suppressBrokerResults: true,
    };
  }

  // ─── 5e. ROYALTIES / INCOME-PRODUCING ASSETS
  // Routed to /invest/royalties (and /invest/income-assets for vending/ATM/etc).
  // Royalty broker is the conversion path; SMSF eligibility checker is the
  // structural question (royalties in an SMSF have specific rules).
  if (a.goal === "royalties") {
    return {
      kind: "listings-browse",
      headline: "Royalties — passive income uncorrelated with broker markets",
      reason: "Music, mining, IP and pharma royalties pay quarterly distributions tied to underlying revenue. Lower volatility than equities. Many fit in an SMSF if structured right.",
      ctaLabel: "Browse royalty deals →",
      ctaHref: "/invest/royalties",
      secondaryActions: [
        { label: "Find a royalty broker", href: "/advisors/royalty-brokers" },
        { label: "Income-producing assets (vending / ATM)", href: "/invest/income-assets" },
        { label: "SMSF eligibility checker", href: "/tools/smsf-checker" },
      ],
      tone: "blue",
      icon: "coins",
      suppressBrokerResults: true,
    };
  }

  // ─── 5f. PRE-IPO / WHOLESALE-INVESTOR DEALS
  // Wholesale-investor only (s708). Surface the listings hub + the IPO
  // calendar + the qualified-pro path. Conversion is via "post your criteria"
  // when the user is a qualified investor with niche needs.
  if (a.goal === "pre-ipo") {
    return {
      kind: "listings-browse",
      headline: "Pre-IPO + late-stage PE — wholesale investors only",
      reason: "Pre-IPO and late-stage PE are restricted to s708 wholesale investors ($2.5M+ net worth or $250k+ income p.a.). Browse the deal flow + IPO calendar; if you qualify, post your criteria and brokers will reach out.",
      ctaLabel: "Browse pre-IPO deals →",
      ctaHref: "/invest/pre-ipo",
      secondaryActions: [
        { label: "Upcoming ASX IPOs (calendar)", href: "/invest/ipo-calendar" },
        { label: "Find a wholesale-investor accountant", href: "/advisors/financial-planners" },
        { label: "Post your investment criteria", href: withParams("/quotes/post", { context: "quiz", goal: "pre-ipo" }) },
      ],
      tone: "amber",
      icon: "trending-up",
      suppressBrokerResults: true,
    };
  }

  // ─── 5g. OTHER / I'll describe it — graceful capture
  // Catch-all for niches we don't yet serve (specific situations, unusual
  // assets, things our 12 explicit goals don't cover). Routes to /quotes/post
  // so the user gets a real path forward instead of a wrong-fit broker pick.
  if (a.goal === "other") {
    return {
      kind: "post-job",
      headline: "Tell us what you need — verified pros will reply with quotes",
      reason: "Your situation doesn't fit our standard categories. Describe what you're trying to do — verified Australian pros across multiple disciplines reply with quotes within 24h. No obligation, no upfront fee.",
      ctaLabel: "Post your situation →",
      ctaHref: withParams("/quotes/post", { context: "quiz", goal: "other" }),
      secondaryActions: [
        { label: "Browse all advisor types", href: "/find-advisor" },
        { label: "Compare platforms anyway", href: "/compare" },
      ],
      tone: "violet",
      icon: "megaphone",
      suppressBrokerResults: true,
    };
  }

  // ─── 6. ADVISOR-BROWSE: help-mode + large amount but advisor type unsure
  // They want a pro but they want to shop the directory rather than commit
  // to a single match. Surface the directory as the primary action.
  if (wantsAdvisor && a.advisor_type === "not-sure" && isLarge && !isComplex) {
    return {
      kind: "advisor-browse",
      headline: "Browse verified advisors — pick at your pace",
      reason: "You want a pro but the right type isn't obvious yet. Skip the matching form — the directory shows verified advisors by type, location, fees, and reviews so you can shortlist on your terms.",
      ctaLabel: "Browse the advisor directory →",
      ctaHref: withParams("/find-advisor", {
        context: "quiz",
        budget: a.amount ? QUIZ_AMOUNT_TO_BUDGET[a.amount] : undefined,
      }),
      secondaryActions: [
        { label: "Get matched instead", href: "#advisor-results" },
        { label: "Post your situation", href: withParams("/quotes/post", { context: "quiz", goal: a.goal, amount: a.amount }) },
      ],
      tone: "amber",
      icon: "users",
    };
  }

  // ─── 7. ADVISOR-MATCH (existing flow)
  if (wantsAdvisor) {
    return {
      kind: "advisor-match",
      headline: "We're matching you with a verified advisor",
      reason: "Based on your answers, an advisor is your right starting point. We've shortlisted verified pros in your state — see your match below.",
      ctaLabel: "See your match →",
      ctaHref: "#advisor-results",
      secondaryActions: [
        { label: "Browse all advisors", href: "/find-advisor" },
        { label: "Post your situation", href: withParams("/quotes/post", { context: "quiz", goal: a.goal, complexity: a.complexity }) },
      ],
      tone: "amber",
      icon: "users",
    };
  }

  // ─── 8. DIY-BROKER (default fall-through — existing flow)
  // Default for clear DIY goals (grow, income, crypto, trade, automate).
  // No hero override — let the existing top-match card carry the screen.
  // We still return an outcome so consumers can read the kind for analytics.
  const calc = a.goal ? GOAL_CALCULATOR[a.goal] : undefined;
  return {
    kind: "diy-broker",
    headline: "Your top platform match is below",
    reason: "Based on your answers, a self-service platform is the right move — your match is below.",
    ctaLabel: "See your top match ↓",
    ctaHref: "#top-match",
    secondaryActions: [
      ...(calc ? [{ label: calc.label, href: calc.href }] : []),
      { label: "Compare platforms", href: withParams("/compare", { quiz_amount: a.amount, quiz_priority: a.priority, quiz_experience: a.experience }) },
    ],
    tone: "slate",
    icon: "trophy",
  };
}
