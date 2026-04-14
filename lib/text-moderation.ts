/**
 * Shared text moderation classifier.
 *
 * Reused for every user-generated text surface on the platform:
 *
 *   - broker reviews (user_reviews)
 *   - advisor reviews (professional_reviews)
 *   - switch stories (switch_stories)
 *   - advisor articles (advisor_articles)
 *   - broker Q&A answers (broker_answers)
 *
 * Same pure-classifier pattern as the dispute resolver, listing
 * scam classifier, and advisor verification classifier. Takes text
 * + optional metadata, returns auto_publish / auto_reject / escalate.
 *
 * Rules target objective signals:
 *
 *   - Spam: link density, repeated phrases, gibberish patterns
 *   - Legal risk: explicit defamation phrases that need human review
 *   - Policy: banned content categories
 *   - Quality floor: minimum length, coherent sentence structure
 *
 * NOT targeted (deliberately):
 *
 *   - Sentiment analysis — negative reviews are legitimate
 *   - "Tone" — user voice is user voice
 *   - Any LLM-based signal — deterministic only
 */

export type ModerationVerdict = "auto_publish" | "auto_reject" | "escalate";
export type ModerationConfidence = "high" | "medium" | "low";

export interface ModerationContext {
  /** The free-text content to classify. Required. */
  text: string;
  /** Optional title / subject line (reviews, stories, articles have this) */
  title?: string | null;
  /** Content type — adjusts some thresholds */
  surface:
    | "broker_review"
    | "advisor_review"
    | "switch_story"
    | "advisor_article"
    | "qa_answer";
  /** Author identifier — used only for duplicate detection (cross-surface) */
  authorId?: string | null;
  /** Whether the author is a verified identity (auth'd user with history) */
  authorVerified?: boolean;
  /** Prior submission count from the same author (for rate/pattern signals) */
  authorPriorCount?: number;
  /** Prior rejection count (big red flag) */
  authorPriorRejections?: number;
}

export interface ModerationResult {
  verdict: ModerationVerdict;
  confidence: ModerationConfidence;
  riskScore: number; // 0-100
  reasons: string[];
}

// ─── Hard-reject checks ──────────────────────────────────────────────
// These are unambiguous violations. One match = auto_reject.
// Use predicate functions (not raw regex) so we can express
// "count global matches" without the ES2018+ `s` flag on regex.
interface HardRejectRule {
  check: (text: string) => boolean;
  reason: string;
}

const HARD_REJECT_RULES: HardRejectRule[] = [
  // Explicit scam terminology
  {
    check: (t) => /\b(ponzi|pyramid\s+scheme|mlm\s+scam)\b/i.test(t),
    reason: "scam_terminology",
  },
  // Raw credit card numbers (Visa prefix)
  {
    check: (t) => /\b4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(t),
    reason: "credit_card_number",
  },
  // Very explicit hate speech terms (list intentionally incomplete — this
  // catches only the unambiguous cases. Borderline content escalates.)
  {
    check: (t) => /\b(kill\s+all|gas\s+the|n[i1]gger|f[a4]ggot)\b/i.test(t),
    reason: "explicit_hate_speech",
  },
  // Obvious link spam — 5+ URLs anywhere in the text
  {
    check: (t) => (t.match(/https?:\/\/\S+/g) || []).length >= 5,
    reason: "link_spam_5plus",
  },
];

// ─── Legal-risk patterns — always escalate ─────────────────────────
// Matching these doesn't reject the content, but it DOES prevent
// auto-publish. These are claims that, if false, expose the platform
// to defamation suits.
const LEGAL_ESCALATE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(fraud|fraudster|defrauded|scammed?\s+me|stole?\s+my|theft|criminal)\b/i, reason: "defamation_risk_claim" },
  { pattern: /\b(illegal|unlawful|crime|criminal|arrested|convicted)\b/i, reason: "legal_allegation" },
  { pattern: /\b(rip[\s-]off|ripoff|swindle|con\s+artist)\b/i, reason: "accusation_language" },
];

// ─── Soft quality / spam signals (weighted) ─────────────────────────
interface SoftSignal {
  check: (ctx: ModerationContext) => boolean;
  reason: string;
  weight: number;
}

const SOFT_SIGNALS: SoftSignal[] = [
  // (Min-length check is a hard gate above; no soft signal needed.)
  // Excessive caps lock
  {
    check: (c) => {
      const letters = c.text.replace(/[^a-zA-Z]/g, "");
      if (letters.length < 40) return false;
      const upper = letters.replace(/[^A-Z]/g, "").length;
      return upper / letters.length > 0.5;
    },
    reason: "excessive_caps",
    weight: 15,
  },
  // Link density
  {
    check: (c) => {
      const links = (c.text.match(/https?:\/\//g) || []).length;
      const words = c.text.trim().split(/\s+/).length;
      return links >= 3 && links / Math.max(words, 1) > 0.05;
    },
    reason: "high_link_density",
    weight: 25,
  },
  // Repeated phrase detection — same 5+ word phrase twice
  {
    check: (c) => {
      const tokens = c.text.toLowerCase().split(/\s+/);
      if (tokens.length < 20) return false;
      for (let i = 0; i < tokens.length - 10; i++) {
        const chunk = tokens.slice(i, i + 5).join(" ");
        for (let j = i + 5; j < tokens.length - 4; j++) {
          const other = tokens.slice(j, j + 5).join(" ");
          if (chunk === other) return true;
        }
      }
      return false;
    },
    reason: "repeated_phrase",
    weight: 20,
  },
  // Gibberish run (20+ consonants in a row)
  {
    check: (c) => /[bcdfghjklmnpqrstvwxyz]{20,}/i.test(c.text),
    reason: "gibberish_consonant_run",
    weight: 30,
  },
  // All-one-word title
  {
    check: (c) => !!c.title && c.title.trim().split(/\s+/).length === 1,
    reason: "single_word_title",
    weight: 10,
  },
  // Prior rejections
  {
    check: (c) => (c.authorPriorRejections || 0) >= 2,
    reason: "author_prior_rejections",
    weight: 35,
  },
  // Generic language (marketing-template sounding)
  {
    check: (c) =>
      /\b(I highly recommend|the best [a-z]+ ever|amazing experience|5 stars across the board)\b/i.test(c.text) &&
      c.text.trim().length < 200,
    reason: "generic_marketing_language",
    weight: 15,
  },
];

// ─── Main classifier ─────────────────────────────────────────────────

export function classifyText(ctx: ModerationContext): ModerationResult {
  const signals: string[] = [];
  let riskScore = 0;

  const text = ctx.text || "";
  const trimmed = text.trim();

  // Empty / near-empty content → auto_reject (doesn't belong anywhere)
  if (trimmed.length === 0) {
    return { verdict: "auto_reject", confidence: "high", riskScore: 100, reasons: ["empty"] };
  }

  // ── Hard reject rules ──────────────────────────────────
  for (const { check, reason } of HARD_REJECT_RULES) {
    if (check(text)) {
      signals.push(reason);
      riskScore += 40;
    }
  }

  if (signals.length > 0) {
    return {
      verdict: "auto_reject",
      confidence: "high",
      riskScore: Math.min(100, riskScore),
      reasons: signals,
    };
  }

  // ── Legal-risk escalation ───────────────────────────────
  const legalSignals: string[] = [];
  for (const { pattern, reason } of LEGAL_ESCALATE_PATTERNS) {
    if (pattern.test(text)) {
      legalSignals.push(reason);
      riskScore += 30;
    }
  }

  if (legalSignals.length > 0) {
    return {
      verdict: "escalate",
      confidence: "high",
      riskScore: Math.min(100, riskScore),
      reasons: ["legal_risk_requires_human_review", ...legalSignals],
    };
  }

  // ── Hard "too short" gate ───────────────────────────────
  // Content below the surface-specific minimum length is never clearly
  // spam AND never clearly publishable. Always escalate so a human
  // decides — one-sentence reviews frequently carry important context
  // but rarely contain enough for automated judgement.
  const minLength =
    ctx.surface === "advisor_article" ? 300 :
    ctx.surface === "qa_answer" ? 30 :
    50;
  if (trimmed.length < minLength) {
    return {
      verdict: "escalate",
      confidence: "medium",
      riskScore: 20,
      reasons: [`content_too_short_for_${ctx.surface}:${trimmed.length}_<_${minLength}`],
    };
  }

  // ── Soft signals ────────────────────────────────────────
  for (const signal of SOFT_SIGNALS) {
    if (signal.check(ctx)) {
      signals.push(signal.reason);
      riskScore += signal.weight;
    }
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  // ── Verdict ─────────────────────────────────────────────
  if (riskScore >= 60) {
    return { verdict: "auto_reject", confidence: "medium", riskScore, reasons: signals };
  }
  if (riskScore >= 25) {
    return { verdict: "escalate", confidence: "medium", riskScore, reasons: signals };
  }

  // Low risk + sufficient length + no red flags = auto_publish.
  // We DELIBERATELY auto-publish rather than escalate on clean content.
  // The dispute/review backlog is the problem we're solving; escalating
  // every clean review defeats the purpose.
  return {
    verdict: "auto_publish",
    confidence: "high",
    riskScore,
    reasons: signals.length > 0 ? signals : ["clean"],
  };
}
