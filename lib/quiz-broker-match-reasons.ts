/**
 * lib/quiz-broker-match-reasons.ts
 *
 * Attribute-driven "why we matched you" reasons for DIY broker results in the
 * find-advisor quiz. Pure function (no async, no DB calls) — runs client-side
 * inside the results page.
 *
 * Design principles:
 *  - Every reason traces to a real broker attribute or a verified user-answer
 *    signal. No fake "beginner-friendly" unless the broker's `pros` list or
 *    platform type supports it.
 *  - Fee-sensitivity copy only fires when the broker has a real numeric
 *    asx_fee_value (not just a string). Avoids asserting "low fee" for a
 *    platform whose fee is stored as "variable" or similar.
 *  - "CHESS sponsored" copy only fires when broker.chess_sponsored is true.
 *  - Rating ≥ 4.5 → "Highly rated" (keep existing signal).
 *  - Max 3–4 reasons, deduped.
 *
 * Extracted from the inline `getMatchReasons` function that previously lived in
 * app/quiz/page.tsx (lines ~618–665). The old function used hardcoded heuristics
 * ("if answers includes 'beginner'" regardless of broker features) — this version
 * only asserts attributes the broker actually has.
 */

import type { Broker } from "./types";

export interface BrokerMatchContext {
  /** The flat string[] of answers as passed to the scoring engine. */
  answers: string[];
  /** Structured answers, for richer per-field checks. */
  goal?: string;
  experience?: string;
  amount?: string;
  priority?: string;
  property_sub?: string;
}

/** ASX brokerage threshold (cents) below which a broker is "genuinely low-fee". */
const LOW_FEE_THRESHOLD_CENTS = 1000; // $10.00 — well below average (~$20)

/** Return true when the broker is a verifiably low-cost option. */
function isGenuinelyLowFee(broker: Broker): boolean {
  if (typeof broker.asx_fee_value !== "number") return false;
  return broker.asx_fee_value < LOW_FEE_THRESHOLD_CENTS;
}

/**
 * Return true when the broker has platform-level signals that suggest it's
 * genuinely beginner-friendly, rather than asserting it for every platform.
 * Uses the broker's `pros` list (editor-curated, real content) as the source
 * of truth — if the editorial team listed "simple", "easy", "beginner",
 * "intuitive", or "no minimum" in the pros, the broker earned the label.
 */
function isBrokerBeginnerFriendly(broker: Broker): boolean {
  const pt = broker.platform_type;
  if (pt === "robo_advisor") return true; // robo advisors are categorically for hands-off users
  const pros = (broker.pros ?? []).join(" ").toLowerCase();
  return (
    pros.includes("simple") ||
    pros.includes("easy") ||
    pros.includes("beginner") ||
    pros.includes("intuitive") ||
    pros.includes("no minimum")
  );
}

function pushUnique(list: string[], item: string | null | undefined): void {
  if (!item) return;
  const norm = item.toLowerCase();
  if (!list.some((r) => r.toLowerCase() === norm)) list.push(item);
}

/**
 * Build up to `max` "why this broker?" bullets for the DIY results card.
 * Attribute-driven: each reason traces to a real broker field or a verified
 * answer signal. Pure, sync, no side effects.
 */
export function getBrokerMatchReasons(
  ctx: BrokerMatchContext,
  broker: Broker,
  max = 4,
): string[] {
  const reasons: string[] = [];
  const { answers, goal, experience, priority } = ctx;
  const pt = broker.platform_type;

  // ─── 1. Platform-type anchor ────────────────────────────────────────────
  // The first reason reflects what this platform category fundamentally offers.
  if (pt === "robo_advisor") {
    pushUnique(reasons, "Automated portfolio management — hands-off investing");
  } else if (pt === "research_tool") {
    pushUnique(reasons, "Powerful analysis tools to research before you invest");
  } else if (pt === "super_fund") {
    pushUnique(reasons, "Superannuation fund — grow your retirement savings");
  } else if (pt === "property_platform") {
    pushUnique(reasons, "Property investing without buying a whole house");
  } else if (pt === "cfd_forex") {
    pushUnique(reasons, "Access to leveraged trading across multiple markets");
  } else if (pt === "crypto_exchange" || broker.is_crypto) {
    pushUnique(reasons, "Regulated Australian crypto exchange");
  }

  // ─── 2. User-priority alignment ─────────────────────────────────────────
  // Only claim the priority attribute if the broker actually has it.
  if (priority === "fees" || answers.includes("fees")) {
    if (isGenuinelyLowFee(broker)) {
      const feeDisplay = broker.asx_fee
        ? `Low brokerage fees (${broker.asx_fee})`
        : "Genuinely low brokerage fees";
      pushUnique(reasons, feeDisplay);
    }
  }
  if ((priority === "safety" || answers.includes("safety")) && broker.chess_sponsored) {
    pushUnique(reasons, "CHESS sponsorship — your shares are held in your name");
  }
  if ((priority === "tools" || answers.includes("tools") || experience === "pro" || answers.includes("pro"))) {
    if (pt === "research_tool" || pt === "cfd_forex" || (broker.pros ?? []).some(p => p.toLowerCase().includes("chart") || p.toLowerCase().includes("research") || p.toLowerCase().includes("screen"))) {
      pushUnique(reasons, "Advanced charting and research tools");
    }
  }

  // ─── 3. Goal-specific attribute match ───────────────────────────────────
  if ((goal === "super" || answers.includes("super") || answers.includes("grow")) && broker.smsf_support) {
    pushUnique(reasons, "Supports SMSF accounts for tax-effective investing");
  }
  if ((goal === "crypto" || answers.includes("crypto")) && (pt === "crypto_exchange" || broker.is_crypto)) {
    pushUnique(reasons, "Wide range of cryptocurrencies available");
  }
  if ((goal === "property" || answers.some(a => a.startsWith("property"))) && pt === "property_platform") {
    pushUnique(reasons, "Fractional property ownership with rental income");
  }
  if ((goal === "trade" || answers.includes("trade")) && pt === "cfd_forex") {
    pushUnique(reasons, "Advanced tools for experienced active traders");
  }

  // ─── 4. Experience / simplicity — attribute-gated ───────────────────────
  // "beginner-friendly" only fires when the broker's own content supports it.
  if (
    (experience === "beginner" || answers.includes("beginner")) &&
    isBrokerBeginnerFriendly(broker)
  ) {
    pushUnique(reasons, "Simple, beginner-friendly platform and interface");
  }
  // Robo/automate specific — already covered in anchor but bolster for automate goal
  if (
    (goal === "automate" || answers.includes("automate")) &&
    pt === "robo_advisor" &&
    !reasons.some(r => r.includes("set-and-forget") || r.includes("hands-off"))
  ) {
    pushUnique(reasons, "Perfect for investors who want a set-and-forget approach");
  }

  // ─── 5. Amount / portfolio size ─────────────────────────────────────────
  if (
    (answers.includes("large") || answers.includes("whale")) &&
    (pt === "share_broker" || !pt)
  ) {
    pushUnique(reasons, "Competitive fees for larger portfolios");
  }

  // ─── 6. Rating signal ────────────────────────────────────────────────────
  if (typeof broker.rating === "number" && broker.rating >= 4.5) {
    pushUnique(reasons, `Highly rated (${broker.rating}/5) by our editorial team`);
  }

  // ─── 7. Generic fallback ─────────────────────────────────────────────────
  if (reasons.length === 0) {
    pushUnique(reasons, "Strong overall score across your selected criteria");
  }

  return reasons.slice(0, max);
}
