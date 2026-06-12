/**
 * Next-action engine — unified personalisation primitive (big-next-action).
 *
 * Pure function: given the caller's resolved profile signals, return a ranked
 * list of `NextAction` items that guide the visitor toward their most
 * productive next step. No DB calls — callers resolve signals first and pass
 * them in (allows React `cache()` deduplication at the call site).
 *
 * AFSL compliance: every action is a factual "next step" description, not
 * personalised financial advice. No recommendation to buy, sell, or hold any
 * specific financial product. Copy that surfaces to the visitor is sourced
 * from named constants here — never inline-hardcoded in components.
 *
 * Vertical routing:
 *   "super" / "smsf"          → SMSF guide + super calculators
 *   "property" / "first_home" → FHOG / stamp-duty calculator + buyers-agent CTA
 *   "international"           → foreign-investment hub + non-resident compare
 *   broker verticals          → compare + fee calculator + take-quiz
 *   advisor verticals         → find-advisor + quiz-refinement
 *   no profile (signed-out)   → take-quiz → get-matched → compare → learn
 *
 * Priority constants (PRIO_*) are intentionally exported so tests can assert
 * relative ordering without relying on magic numbers.
 */

import type { InvestorProfile } from "./investor-profiles";
import type { QuizProfile } from "./quiz-profile";
import type { IntentCountryCode } from "./intent-context";

// ─── Priority tiers ──────────────────────────────────────────────────────────
// Higher number = shown first. Named so tests are self-documenting.

/** Immediate profile-completion or quiz action — highest value for the user */
export const PRIO_TAKE_QUIZ = 100;
/** "Get matched" — strong CTA when quiz is done */
export const PRIO_GET_MATCHED = 90;
/** Vertical-specific guide or hub page */
export const PRIO_VERTICAL_GUIDE = 80;
/** Vertical-specific calculator */
export const PRIO_VERTICAL_CALC = 75;
/** Compare page — always relevant for broker-oriented visitors */
export const PRIO_COMPARE = 70;
/** Set a fee alert — relevant after profile shows interest in a specific platform */
export const PRIO_SET_ALERT = 60;
/** Advisor referral — always a valid escalation path */
export const PRIO_ADVISOR_REFERRAL = 50;
/** General learn hub — useful fallback for any visitor */
export const PRIO_LEARN = 40;

// ─── Types ───────────────────────────────────────────────────────────────────

export type NextActionKind =
  | "take-quiz"
  | "get-matched"
  | "vertical-guide"
  | "vertical-calc"
  | "compare"
  | "set-alert"
  | "advisor-referral"
  | "learn";

export interface NextAction {
  /** Machine-stable identifier for analytics / deduplication */
  id: string;
  kind: NextActionKind;
  /** Priority score — higher renders first */
  priority: number;
  /** Short headline (≤ 60 chars) for the action card */
  title: string;
  /** One-line factual description of what this step does */
  description: string;
  /** URL to send the user to */
  href: string;
  /** Primary CTA label */
  cta: string;
  /**
   * When true, the rendering component MUST display `GENERAL_ADVICE_WARNING`
   * near this action. Reserved for actions adjacent to product or advisor
   * comparisons. Pure-navigation actions (quiz, learn) don't need it.
   */
  showAdviceWarning: boolean;
}

/**
 * Resolved signals passed to `buildNextActions`. Callers merge their three
 * sources (investor_profiles, quiz cookie, intent-country cookie) before
 * calling — the engine is source-agnostic.
 */
export interface NextActionSignals {
  /**
   * Merged investor profile (signed-in structured data + quiz cookie).
   * Null for anonymous visitors who have not taken the quiz.
   */
  profile: Pick<
    InvestorProfile,
    | "primaryVertical"
    | "budgetBand"
    | "experienceLevel"
    | "isFhb"
    | "isPreRetiree"
    | "isCrossBorder"
    | "isHnw"
    | "isBusinessOwner"
  > | null;
  /**
   * Inferred vertical from the quiz cookie (may differ from
   * `profile.primaryVertical` when the profile hasn't been re-synced yet).
   * Null when no quiz has been taken.
   */
  quizVertical: QuizProfile["vertical"] | null;
  /**
   * Whether the visitor has a completed quiz (completedAt !== null).
   * Used to suppress the "take quiz" CTA for users who already finished.
   */
  quizCompleted: boolean;
  /**
   * Top-match slug from the quiz — when present the "get matched" action
   * can deep-link to that specific broker/advisor profile.
   */
  topMatchSlug: string | null;
  /**
   * Intent country from any source. When set, cross-border actions surface
   * higher and are filtered to the user's country context.
   */
  intentCountry: IntentCountryCode | null;
  /**
   * The surface the visitor is on — used to suppress redundant actions
   * (e.g. don't show "Compare platforms" on /compare itself).
   */
  surface: "compare" | "advisors" | "learn" | "article" | "other";
}

// ─── Vertical sets (mirrors SmartRecommendationsStrip categorisation) ────────

const BROKER_VERTICALS = new Set([
  "trade",
  "automate",
  "fees",
  "tools",
  "safety",
  "crypto",
  "broker_diy",
]);

const ADVISOR_VERTICALS = new Set([
  "advisor_match",
  "complex",
  "wealth",
  "international",
  "first_home",
]);

const SUPER_VERTICALS = new Set(["super", "smsf"]);

const PROPERTY_VERTICALS = new Set(["property", "first_home"]);

// ─── Engine ──────────────────────────────────────────────────────────────────

/**
 * Build a ranked `NextAction[]` for the given signal set.
 *
 * Guarantees:
 * - Array is always non-empty (at minimum the quiz CTA or learn hub).
 * - Items are sorted descending by `priority`.
 * - No duplicates (each `id` appears at most once).
 */
export function buildNextActions(signals: NextActionSignals): NextAction[] {
  const actions: NextAction[] = [];

  const vertical =
    signals.profile?.primaryVertical ?? signals.quizVertical ?? null;

  // ── 1. Quiz CTA — suppress when quiz is already completed ────────────────
  if (!signals.quizCompleted) {
    actions.push({
      id: "take-quiz",
      kind: "take-quiz",
      priority: PRIO_TAKE_QUIZ,
      title: "Find the right platform in 60 seconds",
      description:
        "Answer a few questions about your goals and we'll show you the platforms that fit.",
      href: "/get-matched",
      cta: "Take the quiz",
      showAdviceWarning: false,
    });
  }

  // ── 2. Get matched — only when quiz is done and we have a top match ───────
  if (signals.quizCompleted && signals.topMatchSlug) {
    actions.push({
      id: "get-matched",
      kind: "get-matched",
      priority: PRIO_GET_MATCHED,
      title: "Review your top platform match",
      description:
        "Your quiz results are ready — see the platform ranked highest for your profile.",
      href: `/brokers/${signals.topMatchSlug}`,
      cta: "See your match",
      showAdviceWarning: true,
    });
  } else if (signals.quizCompleted && !signals.topMatchSlug) {
    // Quiz done but no specific match (advisor vertical) → find-advisor CTA
    actions.push({
      id: "find-advisor",
      kind: "get-matched",
      priority: PRIO_GET_MATCHED,
      title: "Browse matched financial advisors",
      description:
        "Your quiz identified that professional advice would suit your situation. Browse verified advisors.",
      href: "/advisors",
      cta: "Find an advisor",
      showAdviceWarning: true,
    });
  }

  // ── 3. Cross-vertical routing ────────────────────────────────────────────

  if (vertical && SUPER_VERTICALS.has(vertical)) {
    // Super / SMSF path
    actions.push({
      id: "smsf-guide",
      kind: "vertical-guide",
      priority: PRIO_VERTICAL_GUIDE,
      title: "SMSF starter guide",
      description:
        "Step-by-step overview of setting up and running a self-managed super fund.",
      href: "/smsf",
      cta: "Read the guide",
      showAdviceWarning: false,
    });
    actions.push({
      id: "super-calc",
      kind: "vertical-calc",
      priority: PRIO_VERTICAL_CALC,
      title: "Super balance projection calculator",
      description:
        "Project your super balance at retirement under different contribution scenarios.",
      href: "/tools/super-calculator",
      cta: "Open calculator",
      showAdviceWarning: true,
    });
    // Advisor referral for SMSF is high-value
    actions.push({
      id: "smsf-advisor",
      kind: "advisor-referral",
      priority: PRIO_ADVISOR_REFERRAL + 15,
      title: "Find an SMSF accountant",
      description:
        "Verified SMSF specialists who handle ATO compliance, audits, and investment strategy.",
      href: "/advisors/smsf-accountants",
      cta: "Browse SMSF advisors",
      showAdviceWarning: true,
    });
  } else if (vertical && PROPERTY_VERTICALS.has(vertical)) {
    // Property / first-home buyer path
    const isFhb = signals.profile?.isFhb ?? vertical === "first_home";
    if (isFhb) {
      actions.push({
        id: "fhb-guide",
        kind: "vertical-guide",
        priority: PRIO_VERTICAL_GUIDE,
        title: "First Home Buyer's guide",
        description:
          "FHOG eligibility, stamp-duty concessions, and the HomeGuarantee Scheme — what you can access.",
        href: "/first-home-buyer",
        cta: "Read the guide",
        showAdviceWarning: false,
      });
      actions.push({
        id: "stamp-duty-calc",
        kind: "vertical-calc",
        priority: PRIO_VERTICAL_CALC,
        title: "Stamp duty & LMI calculator",
        description:
          "Estimate your upfront costs by state, including stamp duty concessions and LMI.",
        href: "/tools/stamp-duty-calculator",
        cta: "Calculate costs",
        showAdviceWarning: true,
      });
    } else {
      actions.push({
        id: "property-guide",
        kind: "vertical-guide",
        priority: PRIO_VERTICAL_GUIDE,
        title: "Property investing hub",
        description:
          "Negative gearing, depreciation schedules, and suburb research — all in one place.",
        href: "/property",
        cta: "Explore property",
        showAdviceWarning: false,
      });
    }
    actions.push({
      id: "property-advisor",
      kind: "advisor-referral",
      priority: PRIO_ADVISOR_REFERRAL + 10,
      title: "Find a buyer's agent",
      description:
        "Buyer's agents negotiate on your behalf and source off-market deals. Free initial consultation.",
      href: "/advisors/buyers-agents",
      cta: "Browse buyer's agents",
      showAdviceWarning: true,
    });
  } else if (vertical && signals.profile?.isCrossBorder) {
    // Cross-border / international path (takes priority when flag is set)
    actions.push({
      id: "foreign-investment-hub",
      kind: "vertical-guide",
      priority: PRIO_VERTICAL_GUIDE,
      title: "Foreign investor hub",
      description:
        "FIRB rules, tax-treaty positions, and onboarding requirements for non-resident investors.",
      href: signals.intentCountry
        ? `/foreign-investment/${_countrySlug(signals.intentCountry)}`
        : "/foreign-investment",
      cta: "Explore the guide",
      showAdviceWarning: false,
    });
    actions.push({
      id: "non-resident-compare",
      kind: "compare",
      priority: PRIO_COMPARE + 10,
      title: "Platforms that accept non-residents",
      description:
        "Most retail Australian brokers do not onboard non-residents. This filtered list shows those that do.",
      href: "/compare/non-residents",
      cta: "Non-resident platforms",
      showAdviceWarning: true,
    });
    actions.push({
      id: "intl-tax-advisor",
      kind: "advisor-referral",
      priority: PRIO_ADVISOR_REFERRAL + 12,
      title: "Find an international tax specialist",
      description:
        "Cross-border tax specialists handle dual-reporting, FIRB advice, and treaty positions.",
      href: "/advisors/international-tax-specialists",
      cta: "Browse specialists",
      showAdviceWarning: true,
    });
  } else if (vertical && ADVISOR_VERTICALS.has(vertical)) {
    // Advisor-oriented path
    actions.push({
      id: "find-advisor-vertical",
      kind: "advisor-referral",
      priority: PRIO_ADVISOR_REFERRAL + 20,
      title: "Find a verified financial advisor",
      description:
        "Browse advisors filtered by specialty — SMSF, wealth management, tax, and more.",
      href: "/advisors",
      cta: "Browse advisors",
      showAdviceWarning: true,
    });
    actions.push({
      id: "wealth-guide",
      kind: "vertical-guide",
      priority: PRIO_VERTICAL_GUIDE,
      title: "How to choose a financial advisor",
      description:
        "Fee structures, qualifications to check, and questions to ask before your first meeting.",
      href: "/advisor-guides/financial-planner",
      cta: "Read the guide",
      showAdviceWarning: false,
    });
  } else if (vertical && BROKER_VERTICALS.has(vertical)) {
    // Broker / DIY investing path
    if (signals.surface !== "compare") {
      actions.push({
        id: "compare-platforms",
        kind: "compare",
        priority: PRIO_COMPARE,
        title: "Compare all investing platforms",
        description:
          "Side-by-side fees, features, and CHESS sponsorship for 100+ Australian platforms.",
        href: "/compare",
        cta: "Compare platforms",
        showAdviceWarning: true,
      });
    }

    actions.push({
      id: "fee-calculator",
      kind: "vertical-calc",
      priority: PRIO_VERTICAL_CALC,
      title: "Brokerage fee calculator",
      description:
        "Enter your trade size and frequency to see the real annual cost difference between platforms.",
      href: "/tools/brokerage-fee-calculator",
      cta: "Calculate fees",
      showAdviceWarning: true,
    });

    if (signals.quizCompleted && signals.topMatchSlug) {
      actions.push({
        id: "set-fee-alert",
        kind: "set-alert",
        priority: PRIO_SET_ALERT,
        title: "Set a fee-change alert",
        description:
          "Get notified by email when your top-match platform changes its brokerage fees.",
        href: `/fee-alerts?broker=${signals.topMatchSlug}`,
        cta: "Set alert",
        showAdviceWarning: false,
      });
    }
  }

  // ── 4. Cross-border upsell for signed-in profiles flagged as cross-border ──
  if (
    signals.profile?.isCrossBorder &&
    vertical &&
    !ADVISOR_VERTICALS.has(vertical) &&
    !actions.find((a) => a.id === "non-resident-compare")
  ) {
    actions.push({
      id: "non-resident-compare-secondary",
      kind: "compare",
      priority: PRIO_COMPARE + 5,
      title: "Platforms that accept non-residents",
      description:
        "Pre-filtered to platforms that explicitly accept overseas applicants.",
      href: "/compare/non-residents",
      cta: "Non-resident platforms",
      showAdviceWarning: true,
    });
  }

  // ── 5. HNW upsell — surface private-markets hub ───────────────────────────
  if (signals.profile?.isHnw) {
    actions.push({
      id: "private-markets",
      kind: "vertical-guide",
      priority: PRIO_VERTICAL_GUIDE - 5,
      title: "Private markets & wholesale investing",
      description:
        "Eligible investors can access unlisted equity, private credit, and property syndicates.",
      href: "/private-markets",
      cta: "Explore options",
      showAdviceWarning: true,
    });
  }

  // ── 6. Pre-retiree upsell ────────────────────────────────────────────────
  if (signals.profile?.isPreRetiree && !SUPER_VERTICALS.has(vertical ?? "")) {
    actions.push({
      id: "retirement-guide",
      kind: "vertical-guide",
      priority: PRIO_VERTICAL_GUIDE - 3,
      title: "Retirement planning overview",
      description:
        "Transition-to-retirement, account-based pension phase, and aged-care planning basics.",
      href: "/super",
      cta: "Read the guide",
      showAdviceWarning: false,
    });
  }

  // ── 7. General fallbacks (always included to keep the list non-empty) ─────
  if (!actions.some((a) => a.kind === "advisor-referral")) {
    actions.push({
      id: "advisor-referral-fallback",
      kind: "advisor-referral",
      priority: PRIO_ADVISOR_REFERRAL,
      title: "Speak with a financial advisor",
      description:
        "A licensed adviser can review your full situation — something a comparison tool can't do.",
      href: "/advisors",
      cta: "Find an advisor",
      showAdviceWarning: true,
    });
  }

  if (signals.surface !== "learn" && !actions.some((a) => a.kind === "learn")) {
    actions.push({
      id: "learn-hub",
      kind: "learn",
      priority: PRIO_LEARN,
      title: "Structured learning paths",
      description:
        "Guided paths from beginner to advanced — investing basics, super, tax, and more.",
      href: "/learn",
      cta: "Start learning",
      showAdviceWarning: false,
    });
  }

  if (
    signals.surface !== "compare" &&
    !actions.some((a) => a.kind === "compare")
  ) {
    actions.push({
      id: "compare-fallback",
      kind: "compare",
      priority: PRIO_COMPARE - 5,
      title: "Compare investing platforms",
      description:
        "Side-by-side fees, features, and CHESS sponsorship for Australian platforms.",
      href: "/compare",
      cta: "Compare platforms",
      showAdviceWarning: true,
    });
  }

  // ── Sort descending by priority, then stable by id ────────────────────────
  actions.sort((a, b) =>
    b.priority !== a.priority ? b.priority - a.priority : a.id.localeCompare(b.id),
  );

  return actions;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Map intent code → foreign-investment route slug. */
function _countrySlug(code: IntentCountryCode): string {
  const MAP: Record<IntentCountryCode, string> = {
    uk: "united-kingdom",
    us: "united-states",
    cn: "china",
    in: "india",
    jp: "japan",
    sg: "singapore",
    hk: "hong-kong",
    kr: "south-korea",
    my: "malaysia",
    nz: "new-zealand",
    ae: "united-arab-emirates",
    sa: "saudi-arabia",
  };
  return MAP[code];
}
