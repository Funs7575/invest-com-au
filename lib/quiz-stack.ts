import type { Broker, PlatformType } from "./types";
import { isSponsored } from "./sponsorship";
import { SUPER_WARNING_SHORT, CRYPTO_WARNING } from "./compliance";

/**
 * Multi-product "wealth stack" builder.
 *
 * The quiz scorer (`lib/quiz-scoring.ts`) returns the user's top *broker*
 * matches only. But a great setup is rarely one product — most users who
 * land on the quiz also have a super fund worth comparing, a cash buffer
 * that could be earning more in a high-rate savings account, and (for
 * hands-off investors) a robo-advisor that automates the whole thing.
 *
 * `buildWealthStack()` turns the abstract "your investing stack" framing
 * (previously just category links in `ThreadCardsStrip`) into a CONCRETE
 * stack: one recommended product per applicable category, each with a short
 * rationale and the correct affiliate CTA. It's the highest-revenue lever —
 * the same quiz that converts one broker click now surfaces up to four
 * monetisable product picks.
 *
 * Pure function — no DB, no side effects. The caller already holds the full
 * `brokers` array (every platform_type lives in the `brokers` table) from
 * `/api/quiz/data`, so the stack is derived client-side with zero extra
 * round-trips. Affiliate-link + CTA construction is deferred to the render
 * layer (which imports `getAffiliateLink`/`getBenefitCta` from
 * `lib/tracking.ts`) so this module stays server-safe and free of the
 * `navigator`/`window` references those helpers carry.
 *
 * Category gating: a category only appears when (a) the user's answers make
 * it relevant and (b) at least one active product of that platform_type
 * exists in the data. We never invent products — picks come straight from
 * the supplied `brokers` array.
 */

export type StackCategory = "broker" | "super" | "savings" | "robo";

export interface StackPick {
  category: StackCategory;
  /** Section label, e.g. "Your broker". */
  label: string;
  /** The recommended product (a row from the `brokers` table). */
  broker: Broker;
  /** One-line, answer-aware reason this product leads its category. */
  rationale: string;
  /** Category-specific compliance disclaimer from `lib/compliance.ts`, when one applies. */
  disclaimer?: string;
}

/** Subset of unified quiz answers the stack reads. Mirrors `UnifiedAnswers`. */
export interface StackAnswers {
  goal?: string;
  mode?: string;
  experience?: string;
  amount?: string;
  priority?: string;
  property_sub?: string;
}

interface CategorySpec {
  category: StackCategory;
  label: string;
  /** platform_type values that feed this category. */
  platformTypes: PlatformType[];
  /** Whether the user's answers make this category relevant. */
  applies: (a: StackAnswers) => boolean;
  /** Build the answer-aware rationale for the chosen product. */
  rationale: (broker: Broker, a: StackAnswers) => string;
  /** Category disclaimer, if any. */
  disclaimer?: (broker: Broker) => string | undefined;
}

const HIGH_AMOUNTS = new Set(["large", "xlarge", "whale"]);
const MEANINGFUL_AMOUNTS = new Set(["medium", "large", "xlarge", "whale"]);

function ratingOf(b: Broker): number {
  return typeof b.rating === "number" ? b.rating : 0;
}

/**
 * Pick the single best product for a category from the supplied pool.
 *
 * Order: an active sponsored (featured/editors/deal) product wins if it's
 * within 0.5 rating of the top organic pick — mirrors the "subtle boost, not
 * domination" rule the quiz scorer uses (`applyQuizSponsorBoost`). Otherwise
 * the highest-rated product wins. Ties break on name for determinism.
 */
function pickBest(pool: Broker[]): Broker | undefined {
  if (pool.length === 0) return undefined;

  const sorted = [...pool].sort(
    (a, b) =>
      ratingOf(b) - ratingOf(a) ||
      (a.name ?? "").localeCompare(b.name ?? ""),
  );

  const top = sorted[0];
  if (!top) return undefined;

  const sponsored = sorted.find(
    (b) => isSponsored(b) && ratingOf(top) - ratingOf(b) <= 0.5,
  );
  return sponsored ?? top;
}

const CATEGORY_SPECS: CategorySpec[] = [
  // ── Broker ── always relevant: every quiz-taker can use a trading account,
  // and it's the spine of the stack. Crypto-goal users still benefit from a
  // share/ETF broker for the rest of their portfolio.
  {
    category: "broker",
    label: "Your broker",
    platformTypes: ["share_broker"],
    applies: () => true,
    rationale: (broker, a) => {
      if (a.priority === "fees" || a.priority === "lowest-fees") {
        return `Low-cost trading for your core ASX/US share portfolio${
          broker.asx_fee_value === 0 ? " — $0 ASX brokerage" : ""
        }.`;
      }
      if (a.experience === "beginner") {
        return "A beginner-friendly platform to start your share portfolio.";
      }
      return "Your hub for buying ASX and US shares directly.";
    },
  },

  // ── Super ── relevant for retirement-minded users, anyone with a sizeable
  // balance, or those who flagged safety as the priority. Carries the RG183
  // switching warning.
  {
    category: "super",
    label: "Your super",
    platformTypes: ["super_fund"],
    applies: (a) =>
      a.goal === "super" ||
      a.property_sub === "property-super" ||
      a.priority === "safety" ||
      (a.amount !== undefined && HIGH_AMOUNTS.has(a.amount)),
    rationale: () =>
      "A low-fee, well-performing fund — switching here compounds harder than almost anything else.",
    disclaimer: () => SUPER_WARNING_SHORT,
  },

  // ── Savings ── a cash buffer / emergency fund belongs in a high-rate
  // account. Relevant for DIY investors and anyone investing a meaningful
  // amount (they need a buffer alongside it). Covers both savings accounts
  // and term deposits.
  {
    category: "savings",
    label: "Your cash",
    platformTypes: ["savings_account", "term_deposit"],
    applies: (a) =>
      a.mode === "diy" ||
      (a.amount !== undefined && MEANINGFUL_AMOUNTS.has(a.amount)),
    rationale: (broker) =>
      broker.platform_type === "term_deposit"
        ? "Lock in a guaranteed rate on cash you won't need short-term."
        : "Keep your emergency fund earning a high, government-guaranteed rate.",
  },

  // ── Robo-advisor ── for hands-off / automate-minded or beginner investors
  // who'd rather not manage allocation themselves.
  {
    category: "robo",
    label: "Hands-off option",
    platformTypes: ["robo_advisor"],
    applies: (a) =>
      a.goal === "automate" ||
      a.priority === "simple" ||
      a.priority === "handsfree" ||
      a.experience === "beginner",
    rationale: () =>
      "Automated, diversified investing if you'd rather set it and forget it.",
    disclaimer: (broker) =>
      broker.is_crypto ? CRYPTO_WARNING : undefined,
  },
];

/**
 * Build the recommended wealth stack for a quiz-taker.
 *
 * @param brokers  Active products of every platform_type (from /api/quiz/data).
 * @param answers  The user's unified quiz answers.
 * @returns        One pick per applicable, populated category — broker first,
 *                 then super, savings, robo. Categories with no answer-match
 *                 OR no available product are omitted.
 */
export function buildWealthStack(
  brokers: Broker[],
  answers: StackAnswers,
): StackPick[] {
  const active = brokers.filter((b) => b.status === "active");
  const picks: StackPick[] = [];

  for (const spec of CATEGORY_SPECS) {
    if (!spec.applies(answers)) continue;

    const pool = active.filter((b) =>
      spec.platformTypes.includes(b.platform_type),
    );
    const best = pickBest(pool);
    if (!best) continue;

    // Don't recommend the same product twice across categories (e.g. a
    // platform tagged as both broker and robo) — keep the stack distinct.
    if (picks.some((p) => p.broker.slug === best.slug)) continue;

    picks.push({
      category: spec.category,
      label: spec.label,
      broker: best,
      rationale: spec.rationale(best, answers),
      disclaimer: spec.disclaimer?.(best),
    });
  }

  return picks;
}
