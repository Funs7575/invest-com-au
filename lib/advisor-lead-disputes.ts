/**
 * Advisor lead dispute auto-resolution classifier.
 *
 * When an advisor disputes a lead, the classifier inspects the lead,
 * the advisor's profile and the dispute reason, then returns one of:
 *
 *   refund   — credit the advisor back automatically (high confidence
 *              the dispute is valid)
 *   reject   — leave the charge in place (high confidence the dispute
 *              is invalid)
 *   escalate — defer to human review (low/medium confidence)
 *
 * Design invariants:
 *
 *  1. Pure functions. No side effects, no I/O. The caller handles
 *     credit refunds, dispute row updates and admin notifications.
 *     This makes every rule trivially unit-testable.
 *
 *  2. Fail-safe defaults. Any uncertainty escalates to a human. We'd
 *     rather auto-act on 40% of disputes with near-zero error than
 *     act on 90% with 5% false positives. An incorrect auto-refund
 *     costs us the lead price; an incorrect auto-reject erodes
 *     advisor trust AND is grounds for escalation anyway.
 *
 *  3. Auditable. Every verdict comes with an array of string reasons
 *     explaining which signals fired. These get persisted to
 *     lead_disputes.auto_resolved_reasons so admins can see exactly
 *     why a dispute was closed without review.
 *
 *  4. Deterministic. Same input → same verdict. No ML, no
 *     randomness, no temperature. A rule change is a code change
 *     with a test, not a model retrain.
 */

/** Standardised dispute reason enum. Matches the DB CHECK constraint. */
export type DisputeReason =
  | "spam_or_fake"
  | "wrong_specialty"
  | "out_of_area"
  | "unreachable"
  | "duplicate"
  | "under_minimum"
  | "other";

export type Verdict = "refund" | "reject" | "escalate";
export type Confidence = "high" | "medium" | "low";

export interface AutoResolveResult {
  verdict: Verdict;
  confidence: Confidence;
  reasons: string[];
}

/** Lead shape the classifier operates on. All fields optional except id. */
export interface LeadForClassifier {
  id: number;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  message: string | null;
  source_page: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  quality_score: number | null;
  quality_signals: Record<string, unknown> | null;
  bill_amount_cents: number | null;
  created_at: string;
  responded_at: string | null;
}

export interface AdvisorForClassifier {
  id: number;
  type: string;
  specialties: string[] | null;
  location_state: string | null;
  office_states: string[] | null;
  service_areas: string[] | null;
  min_client_balance_cents: number | null;
  accepts_international_clients: boolean | null;
}

export interface ClassifierContext {
  lead: LeadForClassifier;
  advisor: AdvisorForClassifier;
  reason: DisputeReason;
  details: string | null;
  /**
   * Count of other leads from the same email to the same advisor
   * within the last 90 days (excluding the disputed lead itself).
   * Caller pre-computes this from professional_leads.
   */
  priorLeadsByEmail: number;
}

// ─── Top-level dispatch ──────────────────────────────────────────────

export function classifyDispute(ctx: ClassifierContext): AutoResolveResult {
  // "Other" is free-text and inherently ambiguous. Always escalate.
  if (ctx.reason === "other") {
    return escalate("reason=other requires human interpretation");
  }

  switch (ctx.reason) {
    case "spam_or_fake":
      return classifySpam(ctx);
    case "wrong_specialty":
      return classifyWrongSpecialty(ctx);
    case "out_of_area":
      return classifyOutOfArea(ctx);
    case "unreachable":
      return classifyUnreachable(ctx);
    case "duplicate":
      return classifyDuplicate(ctx);
    case "under_minimum":
      return classifyUnderMinimum(ctx);
  }
}

// ─── Per-reason classifiers ──────────────────────────────────────────

/**
 * Spam or fake — bot submissions, test rows, obviously-invalid data.
 * We refund when multiple hard signals agree. Single-signal matches
 * escalate because false positives here are reputationally bad for
 * legitimate users with unusual names / emails.
 */
export function classifySpam(ctx: ClassifierContext): AutoResolveResult {
  const signals: string[] = [];
  const { lead } = ctx;

  const name = lead.user_name?.trim() || "";
  const email = lead.user_email?.trim().toLowerCase() || "";
  const phone = lead.user_phone?.trim() || "";

  // Name looks like garbage: ≤2 chars, all same char, obvious test words
  if (name.length <= 2) signals.push("name_too_short");
  if (/^(.)\1+$/.test(name)) signals.push("name_single_char_repeated");
  if (/^(test|asdf|qwer|zxcv|aaaa|admin|bot|foo|bar|spam)$/i.test(name)) {
    signals.push("name_is_test_word");
  }
  if (/^\d+$/.test(name)) signals.push("name_is_digits_only");

  // Email local-part that's obviously random/typed-in
  const localPart = email.split("@")[0] || "";
  if (localPart.length <= 2) signals.push("email_local_too_short");
  if (/^(.)\1{3,}/.test(localPart)) signals.push("email_local_repeated_char");
  if (/^(test|asdf|qwer|admin|bot)\d*$/i.test(localPart)) {
    signals.push("email_local_is_test_word");
  }
  // Long strings of consecutive consonants or just digits are almost
  // always bot-generated local parts
  if (/[bcdfghjklmnpqrstvwxyz]{7,}/i.test(localPart)) {
    signals.push("email_local_consonant_string");
  }

  // Phone obviously fake if provided
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (/^(\d)\1+$/.test(digits)) signals.push("phone_single_digit_repeated");
    if (/^(0123456789|1234567890|0000000000|9999999999)$/.test(digits)) {
      signals.push("phone_pattern_fake");
    }
  }

  // Quality score is our upstream signal aggregator — trust it
  if (lead.quality_score !== null && lead.quality_score <= 5) {
    signals.push(`quality_score_very_low:${lead.quality_score}`);
  }

  // Message is empty or obvious placeholder
  const message = lead.message?.trim().toLowerCase() || "";
  if (!message) {
    signals.push("no_message");
  } else if (/^(test|asdf|hello|hi|hey|\.)+$/.test(message)) {
    signals.push("message_is_placeholder");
  }

  // Auto-refund only on ≥2 independent signals — prevents false positives
  // on a legitimate user who happens to have an unusual name.
  if (signals.length >= 2) {
    return { verdict: "refund", confidence: "high", reasons: signals };
  }
  if (signals.length === 1) {
    return {
      verdict: "escalate",
      confidence: "medium",
      reasons: ["single_spam_signal_insufficient", ...signals],
    };
  }

  // No signals? That's suspicious — the advisor claims spam but nothing
  // in the data supports it. Reject with high confidence and let them
  // re-dispute as "other" if they have extra context.
  return {
    verdict: "reject",
    confidence: "high",
    reasons: ["no_spam_signals_detected"],
  };
}

/**
 * Wrong specialty — user's stated interest doesn't overlap with the
 * advisor's specialties. Hardest to auto-verify because we often lack
 * structured "what the user wants" data. Mostly escalates.
 */
export function classifyWrongSpecialty(
  ctx: ClassifierContext,
): AutoResolveResult {
  const signals: string[] = [];
  const { lead, advisor } = ctx;

  // If the advisor has no specialties listed, we can't verify anything
  if (!advisor.specialties || advisor.specialties.length === 0) {
    return escalate("advisor has no specialties listed — cannot classify");
  }

  const advisorSpecialtiesLower = advisor.specialties.map((s) => s.toLowerCase());

  // Check qualification_data.interest if present (captured from quiz/calculator)
  const qual = lead.quality_signals?.qualification as
    | { data?: Record<string, unknown> }
    | undefined;
  const interest = (qual?.data?.interest as string | undefined)?.toLowerCase();
  if (interest) {
    const hasMatch = advisorSpecialtiesLower.some(
      (s) => s.includes(interest) || interest.includes(s),
    );
    if (!hasMatch) {
      signals.push(`qualification_interest_mismatch:${interest}`);
    }
  }

  // Source page contradicts advisor type (e.g. /crypto page → smsf_accountant)
  const sourcePage = lead.source_page?.toLowerCase() || "";
  const advisorType = advisor.type.toLowerCase();
  const pageToType: Record<string, string[]> = {
    "/crypto": ["crypto_advisor", "tax_agent"],
    "/cfd": ["crypto_advisor"],
    "/foreign-investment": [
      "financial_planner",
      "tax_agent",
      "migration_agent",
    ],
    "/mortgage-calculator": ["mortgage_broker", "financial_planner"],
    "/smsf": ["smsf_accountant", "financial_planner"],
  };
  for (const [page, allowed] of Object.entries(pageToType)) {
    if (sourcePage.startsWith(page) && !allowed.includes(advisorType)) {
      signals.push(`source_page_type_mismatch:${page}_vs_${advisorType}`);
      break;
    }
  }

  // Need 2+ independent signals to auto-refund — wrong specialty claims
  // are too often arguable for a single-signal match
  if (signals.length >= 2) {
    return { verdict: "refund", confidence: "high", reasons: signals };
  }
  if (signals.length === 1) {
    return {
      verdict: "escalate",
      confidence: "medium",
      reasons: ["single_specialty_signal_insufficient", ...signals],
    };
  }

  return escalate("no specialty mismatch signals detected");
}

/**
 * Out of area — advisor services a subset of AU and the user is
 * outside it. Only fires when we have structured location data for
 * both sides.
 */
export function classifyOutOfArea(
  ctx: ClassifierContext,
): AutoResolveResult {
  const signals: string[] = [];
  const { lead, advisor } = ctx;

  // If advisor services all of AU (no office_states or service_areas), the
  // claim is invalid on its face.
  const serviceAreas = advisor.office_states || advisor.service_areas || [];
  if (serviceAreas.length === 0) {
    return {
      verdict: "reject",
      confidence: "high",
      reasons: ["advisor_has_no_service_area_restriction"],
    };
  }
  const serviceAreasLower = serviceAreas.map((s) => s.toLowerCase());

  // User-supplied state from qualification data
  const qual = lead.quality_signals?.qualification as
    | { data?: Record<string, unknown> }
    | undefined;
  const userState = (qual?.data?.state as string | undefined)?.toLowerCase();
  if (userState && !serviceAreasLower.includes(userState)) {
    signals.push(`user_state_outside_service_area:${userState}`);
  }

  // International email tld + advisor doesn't accept international
  const emailDomain = lead.user_email.split("@")[1]?.toLowerCase() || "";
  const internationalTlds = [".uk", ".nz", ".sg", ".hk", ".in", ".cn", ".us"];
  if (
    internationalTlds.some((tld) => emailDomain.endsWith(tld)) &&
    advisor.accepts_international_clients === false
  ) {
    signals.push(`international_email_and_advisor_is_au_only:${emailDomain}`);
  }

  if (signals.length >= 1) {
    return { verdict: "refund", confidence: "high", reasons: signals };
  }

  return escalate(
    "no location mismatch signals detected — user state unknown",
  );
}

/**
 * Unreachable — advisor couldn't contact the user. Hard to verify
 * without the advisor's contact log. Almost always escalates unless
 * the contact details are obviously broken on their face.
 */
export function classifyUnreachable(
  ctx: ClassifierContext,
): AutoResolveResult {
  const signals: string[] = [];
  const { lead } = ctx;

  // Phone is obviously invalid (too short, non-AU format)
  if (lead.user_phone) {
    const digits = lead.user_phone.replace(/\D/g, "");
    if (digits.length < 8) signals.push(`phone_too_short:${digits.length}`);
    // AU phones are 10 digits (including area code) or 11 with leading 0
    if (digits.length > 15) signals.push(`phone_too_long:${digits.length}`);
  }

  // Email domain is obvious typo / placeholder
  const emailDomain = lead.user_email.split("@")[1]?.toLowerCase() || "";
  if (/^(test|example|localhost|invalid)\./.test(emailDomain)) {
    signals.push(`email_domain_is_placeholder:${emailDomain}`);
  }
  if (!emailDomain.includes(".")) {
    signals.push("email_domain_has_no_tld");
  }

  if (signals.length >= 1) {
    return { verdict: "refund", confidence: "high", reasons: signals };
  }

  // Without access to the advisor's contact-attempt log, we can't
  // verify an "I called them and got no answer" claim. Escalate.
  return escalate("unreachable claims require contact-attempt log review");
}

/**
 * Duplicate — same user already enquired with this advisor recently.
 * We already dedupe within 24 hours at the enquiry endpoint, so this
 * fires on 25h–90d windows.
 */
export function classifyDuplicate(
  ctx: ClassifierContext,
): AutoResolveResult {
  if (ctx.priorLeadsByEmail >= 1) {
    return {
      verdict: "refund",
      confidence: "high",
      reasons: [`prior_leads_from_same_email:${ctx.priorLeadsByEmail}`],
    };
  }
  return {
    verdict: "reject",
    confidence: "high",
    reasons: ["no_prior_leads_from_this_email_within_90d"],
  };
}

/**
 * Under minimum — user's portfolio is below the advisor's minimum
 * client balance. Requires qualification data to be present.
 */
export function classifyUnderMinimum(
  ctx: ClassifierContext,
): AutoResolveResult {
  const { lead, advisor } = ctx;

  if (!advisor.min_client_balance_cents) {
    return {
      verdict: "reject",
      confidence: "high",
      reasons: ["advisor_has_no_minimum_set"],
    };
  }

  const qual = lead.quality_signals?.qualification as
    | { data?: Record<string, unknown> }
    | undefined;
  const portfolio = qual?.data?.portfolio_size_cents as number | undefined;
  if (typeof portfolio !== "number") {
    return escalate("portfolio_size not captured in qualification data");
  }

  if (portfolio < advisor.min_client_balance_cents) {
    return {
      verdict: "refund",
      confidence: "high",
      reasons: [
        `portfolio_below_minimum:${portfolio}_<_${advisor.min_client_balance_cents}`,
      ],
    };
  }

  return {
    verdict: "reject",
    confidence: "high",
    reasons: [
      `portfolio_meets_minimum:${portfolio}_>=_${advisor.min_client_balance_cents}`,
    ],
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function escalate(reason: string): AutoResolveResult {
  return { verdict: "escalate", confidence: "low", reasons: [reason] };
}
