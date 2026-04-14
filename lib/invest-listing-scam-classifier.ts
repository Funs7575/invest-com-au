/**
 * Investment listing scam/fraud classifier.
 *
 * User-submitted investment listings (buy-business, mining, farmland,
 * commercial-property, alternatives etc.) are the highest fraud-risk
 * surface on the platform. Scams include:
 *
 *   - "Guaranteed X% monthly returns" pyramid/Ponzi signals
 *   - Shell companies with missing ABN or fake company names
 *   - Stolen listings copied from other marketplaces
 *   - Email contact domain mismatching the claimed firm
 *   - Asking-price / revenue ratios that can't be real
 *
 * This classifier scans every incoming listing and produces:
 *
 *   auto_reject — hard fraud indicators; block before going live
 *   auto_approve — clean listing, flip status=pending→active
 *   escalate — needs human moderation (the default for anything ambiguous)
 *
 * Pure function. No network calls. The caller may pass in
 * side-channel data like ABN lookup results, duplicate detection
 * counts, and known-scam image hashes.
 */

export type ListingVerdict = "auto_approve" | "auto_reject" | "escalate";
export type ListingConfidence = "high" | "medium" | "low";

export interface ListingForClassifier {
  id: number;
  title: string;
  description: string;
  vertical: string;
  location_state: string | null;
  location_city: string | null;
  price_display: string | null;
  asking_price_cents: number | null;
  industry: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  images: string[] | null;
  key_metrics: Record<string, unknown> | null;
}

export interface ScamClassifierContext {
  listing: ListingForClassifier;
  /** How many listings this contact_email has submitted in total */
  priorListingsFromEmail: number;
  /** How many of those were rejected */
  priorRejectionsFromEmail: number;
  /** Whether this listing's ABN (if any) is on the ABR and active */
  abnLookup: {
    performed: boolean;
    abn: string | null;
    entityStatus: "active" | "cancelled" | "not_found" | null;
  };
}

export interface ListingScamResult {
  verdict: ListingVerdict;
  confidence: ListingConfidence;
  riskScore: number; // 0-100, useful for admin dashboard sort
  reasons: string[];
}

// ─── Banned phrase patterns ──────────────────────────────────────────
// Anything matching these is a hard reject — guaranteed returns,
// risk-free promises, and get-rich-quick language are not compatible
// with any legitimate investment listing on this platform.
const HARD_REJECT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bguaranteed\s+(\d+%|returns?|profits?|income)/i, reason: "guaranteed_returns_promise" },
  { pattern: /\brisk[\s-]free\s+(investment|returns?|profits?)/i, reason: "risk_free_promise" },
  { pattern: /\bdouble\s+your\s+(money|investment)/i, reason: "double_your_money" },
  { pattern: /\b(\d+)\s*%\s+(monthly|per month|a month)/i, reason: "monthly_returns_claim" },
  { pattern: /\bget\s+rich\s+quick/i, reason: "get_rich_quick" },
  { pattern: /\bpassive\s+income\s+guaranteed/i, reason: "passive_income_guaranteed" },
  { pattern: /\bponzi|pyramid\s+scheme|mlm/i, reason: "explicit_scam_terminology" },
  { pattern: /\b(bitcoin|btc|crypto)\s+doubler/i, reason: "crypto_doubler" },
  // High-pressure / urgency patterns frequently appear in scam listings
  { pattern: /\bonly\s+\d+\s+spots?\s+(left|available)/i, reason: "artificial_scarcity" },
  { pattern: /\b24\s*hours?\s+only/i, reason: "artificial_time_pressure" },
];

// Patterns that MIGHT be legitimate but warrant closer inspection
const SOFT_FLAG_PATTERNS: Array<{ pattern: RegExp; reason: string; weight: number }> = [
  { pattern: /\bhigh[\s-]yield/i, reason: "high_yield_language", weight: 15 },
  { pattern: /\bexclusive\s+(opportunity|offer|deal)/i, reason: "exclusive_language", weight: 10 },
  { pattern: /\binvestors?\s+needed\s+urgently/i, reason: "urgent_investors_needed", weight: 20 },
  { pattern: /\bwhatsapp\b/i, reason: "whatsapp_contact_channel", weight: 15 },
  { pattern: /\btelegram\b/i, reason: "telegram_contact_channel", weight: 20 },
  { pattern: /\bcash\s+only/i, reason: "cash_only_requested", weight: 15 },
  { pattern: /\bwire\s+transfer/i, reason: "wire_transfer_requested", weight: 10 },
];

// Suspicious email domains that are almost always fraud on a b2b listing
const SUSPICIOUS_EMAIL_DOMAINS: readonly string[] = [
  "mail.ru",
  "yandex.ru",
  "163.com",
  "qq.com",
  "protonmail.com", // legit for privacy but unusual for a business listing
];

// ─── Top-level classifier ────────────────────────────────────────────

export function classifyListingForScam(
  ctx: ScamClassifierContext,
): ListingScamResult {
  const signals: string[] = [];
  let riskScore = 0;
  let hardRejectCount = 0;
  const { listing } = ctx;

  const text = `${listing.title} ${listing.description}`.toLowerCase();

  // 1. Hard reject patterns → each adds 40 risk + 1 reject count
  for (const { pattern, reason } of HARD_REJECT_PATTERNS) {
    if (pattern.test(text)) {
      signals.push(reason);
      hardRejectCount++;
      riskScore += 40;
    }
  }

  // 2. Soft flag patterns → weighted risk
  for (const { pattern, reason, weight } of SOFT_FLAG_PATTERNS) {
    if (pattern.test(text)) {
      signals.push(reason);
      riskScore += weight;
    }
  }

  // 3. Email domain check
  const emailDomain = listing.contact_email.split("@")[1]?.toLowerCase() || "";
  if (SUSPICIOUS_EMAIL_DOMAINS.includes(emailDomain)) {
    signals.push(`suspicious_email_domain:${emailDomain}`);
    riskScore += 25;
  }

  // 4. Contact email doesn't match claimed business
  //    (very weak signal because most legit SMBs use gmail/outlook too,
  //     so we only flag when the listing is very high-value OR the
  //     business is branded)
  const titleLower = listing.title.toLowerCase();
  const genericEmailDomains = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com"];
  if (
    genericEmailDomains.includes(emailDomain) &&
    listing.asking_price_cents &&
    listing.asking_price_cents > 500_000_00 && // $500k+
    !titleLower.includes(listing.contact_name.split(" ")[0].toLowerCase())
  ) {
    signals.push("high_value_listing_with_generic_email_and_no_name_match");
    riskScore += 15;
  }

  // 5. Minimum description length
  if (listing.description.trim().length < 100) {
    signals.push("description_too_short");
    riskScore += 10;
  }

  // 6. Seller history — multiple recent rejections is a strong signal
  if (ctx.priorRejectionsFromEmail >= 2) {
    signals.push(`prior_rejections:${ctx.priorRejectionsFromEmail}`);
    riskScore += 35;
    hardRejectCount++;
  }

  // 7. ABN lookup check (if performed)
  if (ctx.abnLookup.performed) {
    if (ctx.abnLookup.entityStatus === "cancelled") {
      signals.push("abn_cancelled");
      riskScore += 35;
      hardRejectCount++;
    } else if (ctx.abnLookup.entityStatus === "not_found") {
      signals.push("abn_not_found");
      riskScore += 20;
    } else if (ctx.abnLookup.entityStatus === "active") {
      signals.push("abn_active");
      riskScore = Math.max(0, riskScore - 15); // reduce risk
    }
  }

  // 8. Asking price sanity: obviously-fake multi-billion asks on a
  //    platform that caters to SMB investments
  if (listing.asking_price_cents && listing.asking_price_cents > 10_000_000_000_00) {
    signals.push(`absurd_asking_price:${listing.asking_price_cents}`);
    riskScore += 30;
  }

  // Clamp to 0-100
  riskScore = Math.min(100, Math.max(0, riskScore));

  // ── Verdict ────────────────────────────────────────────────────
  // Hard reject patterns are strict — one match is enough
  if (hardRejectCount >= 1) {
    return {
      verdict: "auto_reject",
      confidence: "high",
      riskScore,
      reasons: signals,
    };
  }

  // Very high aggregate risk score = reject even without hard patterns
  if (riskScore >= 70) {
    return {
      verdict: "auto_reject",
      confidence: "medium",
      riskScore,
      reasons: signals,
    };
  }

  // Medium risk → escalate (the default conservative path)
  if (riskScore >= 25) {
    return {
      verdict: "escalate",
      confidence: "medium",
      riskScore,
      reasons: signals,
    };
  }

  // Very low risk AND has an active ABN → auto-approve
  if (
    riskScore <= 10 &&
    ctx.abnLookup.performed &&
    ctx.abnLookup.entityStatus === "active"
  ) {
    return {
      verdict: "auto_approve",
      confidence: "high",
      riskScore,
      reasons: signals.length > 0 ? signals : ["clean_profile_with_active_abn"],
    };
  }

  // Low risk but no ABN verification → still escalate (conservative default)
  return {
    verdict: "escalate",
    confidence: "low",
    riskScore,
    reasons: signals.length > 0 ? signals : ["no_strong_signals_either_way"],
  };
}
