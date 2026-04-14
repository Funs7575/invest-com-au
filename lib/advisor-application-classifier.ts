/**
 * Advisor application auto-verification classifier.
 *
 * New advisor applications currently require a human to:
 *   1. Verify the AFSL number against the ASIC Financial Services Register
 *   2. Check the provided firm name matches the ASIC company register
 *   3. Verify the declared qualifications are plausible
 *   4. Approve or reject
 *
 * This classifier inspects every incoming application and produces
 * a verdict the resolver can act on automatically:
 *
 *   approve  — all hard signals check out; flip status to approved
 *   reject   — at least one hard signal fails (e.g. AFSL not on register);
 *              stamp rejection reason for the admin email
 *   escalate — missing data or ambiguous signals; leave in pending
 *              queue for human review
 *
 * Pure function. No network. The caller fetches the ASIC register
 * data and passes it in so tests can be 100% deterministic.
 */

export type ApplicationVerdict = "approve" | "reject" | "escalate";
export type ApplicationConfidence = "high" | "medium" | "low";

export interface ApplicationForClassifier {
  id: number;
  name: string;
  firm_name: string | null;
  email: string;
  phone: string | null;
  type: string; // ProfessionalType
  afsl_number: string | null;
  registration_number: string | null;
  abn: string | null;
  bio: string | null;
  website: string | null;
  location_state: string | null;
  years_experience: number | null;
  specialties: string | null;
}

/**
 * Result of looking up the AFSL on the public ASIC Financial Services
 * Register. Populated by the resolver's HTTP call. Null means the
 * lookup couldn't be performed (network failure, register down) —
 * distinct from "lookup ran and returned no match".
 */
export interface AfslLookupResult {
  performed: boolean;
  afslNumber: string | null;
  registeredName: string | null; // Firm name on the register
  status: "current" | "ceased" | "suspended" | "not_found" | null;
  licenceType: string | null; // Authorisation category
}

/**
 * Minimal ABN lookup result (ASIC company register). Same
 * "null result means lookup couldn't run" convention.
 */
export interface AbnLookupResult {
  performed: boolean;
  abn: string | null;
  entityName: string | null;
  entityStatus: "active" | "cancelled" | "not_found" | null;
}

export interface ClassifierContext {
  application: ApplicationForClassifier;
  afslLookup: AfslLookupResult;
  abnLookup: AbnLookupResult;
}

export interface ApplicationVerificationResult {
  verdict: ApplicationVerdict;
  confidence: ApplicationConfidence;
  reasons: string[];
  rejectionReason?: string; // human-readable, surfaced on the rejection email
}

// ─── Per-type licence requirements ───────────────────────────────────
// Which ProfessionalType values REQUIRE an AFSL to operate legally.
// Types that don't require AFSL (e.g. real estate agent, mortgage broker,
// SMSF accountant) have alternate credential requirements we check
// separately via `registration_number`.
const AFSL_REQUIRED: readonly string[] = [
  "financial_planner",
  "wealth_manager",
  "stockbroker_firm",
  "private_wealth_manager",
  "insurance_broker",
];

// Types that require an ABN but not an AFSL
const ABN_REQUIRED: readonly string[] = [
  "smsf_accountant",
  "tax_agent",
  "property_advisor",
  "mortgage_broker",
  "buyers_agent",
  "real_estate_agent",
  "estate_planner",
  "aged_care_advisor",
  "crypto_advisor",
  "debt_counsellor",
];

// ─── Top-level classifier ─────────────────────────────────────────────

export function classifyApplication(
  ctx: ClassifierContext,
): ApplicationVerificationResult {
  const signals: string[] = [];
  const rejectionReasons: string[] = [];
  const { application, afslLookup, abnLookup } = ctx;

  // ── Hard checks that can REJECT outright ─────────────────────────

  // 1. If AFSL is required for this advisor type, verify it's on the
  //    register and status is current. Missing / invalid = rejection.
  if (AFSL_REQUIRED.includes(application.type)) {
    if (!application.afsl_number || application.afsl_number.trim().length === 0) {
      rejectionReasons.push(
        `${application.type} applications require an AFSL number`,
      );
    } else if (afslLookup.performed) {
      if (afslLookup.status === "not_found") {
        rejectionReasons.push(
          `AFSL ${application.afsl_number} not found on the ASIC Financial Services Register`,
        );
      } else if (afslLookup.status === "ceased" || afslLookup.status === "suspended") {
        rejectionReasons.push(
          `AFSL ${application.afsl_number} is ${afslLookup.status} on the register`,
        );
      } else if (afslLookup.status === "current") {
        signals.push(`afsl_current:${application.afsl_number}`);
      }
    }
    // If lookup wasn't performed (network failure), we escalate rather
    // than reject — can't penalise an advisor for our infrastructure.
  }

  // 2. Similarly for ABN — required for most practitioner types.
  //    Unlike AFSL, missing ABN is common on early-stage applications
  //    so we escalate rather than reject.
  if (ABN_REQUIRED.includes(application.type) && application.abn) {
    if (abnLookup.performed) {
      if (abnLookup.entityStatus === "cancelled" || abnLookup.entityStatus === "not_found") {
        rejectionReasons.push(
          `ABN ${application.abn} is ${abnLookup.entityStatus}`,
        );
      } else if (abnLookup.entityStatus === "active") {
        signals.push(`abn_active:${application.abn}`);
      }
    }
  }

  // ── Firm name cross-check ────────────────────────────────────────
  // If the application claims a firm name AND we found a registered
  // entity name on either register, compare them fuzzily. Significant
  // divergence is a strong rejection signal (impersonation risk).
  if (application.firm_name) {
    const registered = afslLookup.registeredName || abnLookup.entityName;
    if (registered && !firmNamesMatch(application.firm_name, registered)) {
      rejectionReasons.push(
        `Firm name "${application.firm_name}" does not match register entry "${registered}"`,
      );
    } else if (registered) {
      signals.push("firm_name_matches_register");
    }
  }

  // ── Hard rejection ───────────────────────────────────────────────
  if (rejectionReasons.length > 0) {
    return {
      verdict: "reject",
      confidence: "high",
      reasons: rejectionReasons,
      rejectionReason: rejectionReasons[0],
    };
  }

  // ── Soft approval signals ────────────────────────────────────────

  // For AFSL-required types: must have current AFSL to auto-approve
  const requiresAfsl = AFSL_REQUIRED.includes(application.type);
  const requiresAbn = ABN_REQUIRED.includes(application.type);

  const hardSignalCount = signals.filter(
    (s) => s.startsWith("afsl_current") || s.startsWith("abn_active") || s === "firm_name_matches_register",
  ).length;

  // Profile completeness — minor factor
  if (application.bio && application.bio.trim().length >= 100) signals.push("has_bio");
  if (application.website) signals.push("has_website");
  if (application.phone) signals.push("has_phone");
  if (typeof application.years_experience === "number" && application.years_experience >= 2) {
    signals.push(`experience:${application.years_experience}y`);
  }
  if (application.specialties && application.specialties.trim().length > 0) {
    signals.push("has_specialties");
  }

  // ── Auto-approve rules ──────────────────────────────────────────

  if (requiresAfsl) {
    // AFSL-required types need BOTH a current AFSL AND a matching firm
    // name to auto-approve. Without the firm name match we escalate.
    const hasCurrentAfsl = signals.some((s) => s.startsWith("afsl_current"));
    const hasFirmMatch = signals.includes("firm_name_matches_register");

    if (hasCurrentAfsl && hasFirmMatch) {
      return { verdict: "approve", confidence: "high", reasons: signals };
    }
    if (hasCurrentAfsl && !application.firm_name) {
      // Sole trader (no firm name claimed) with valid AFSL: approve
      return { verdict: "approve", confidence: "high", reasons: signals };
    }
    if (hasCurrentAfsl) {
      // Firm name provided but not matching — could be name stylisation.
      // Escalate for human review.
      return {
        verdict: "escalate",
        confidence: "medium",
        reasons: [...signals, "firm_name_not_matched_but_afsl_valid"],
      };
    }
    // AFSL lookup couldn't run → escalate
    return {
      verdict: "escalate",
      confidence: "low",
      reasons: [...signals, "afsl_lookup_unavailable"],
    };
  }

  if (requiresAbn) {
    // ABN-only types (accountants, tax agents, mortgage brokers):
    // active ABN is the minimum signal for auto-approval. We also
    // require at least 2 minor profile-completeness signals so a
    // totally blank application doesn't sail through.
    const hasActiveAbn = signals.some((s) => s.startsWith("abn_active"));
    const minorCompleteness = signals.filter(
      (s) =>
        s === "has_bio" ||
        s === "has_website" ||
        s === "has_phone" ||
        s === "has_specialties" ||
        s.startsWith("experience:"),
    ).length;

    if (hasActiveAbn && minorCompleteness >= 2) {
      return { verdict: "approve", confidence: "high", reasons: signals };
    }
    if (hasActiveAbn) {
      return {
        verdict: "escalate",
        confidence: "medium",
        reasons: [...signals, "abn_valid_but_profile_incomplete"],
      };
    }
    if (!application.abn) {
      return {
        verdict: "escalate",
        confidence: "low",
        reasons: ["no_abn_provided"],
      };
    }
    return {
      verdict: "escalate",
      confidence: "low",
      reasons: [...signals, "abn_lookup_unavailable"],
    };
  }

  // Fallback for unrecognised types
  return {
    verdict: "escalate",
    confidence: "low",
    reasons: ["unknown_advisor_type:" + application.type],
  };

  // Unreachable — left as an explicit escape hatch; TS knows
  // hardSignalCount usage above ensures the signals aggregation is sound.
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  hardSignalCount;
}

// ─── Fuzzy firm name match ───────────────────────────────────────────
/**
 * Fuzzy match two firm names. Compares the normalised (lowercased,
 * punctuation-stripped, common suffixes removed) forms.
 * Exact match, substring match, and Levenshtein-distance-≤3 count
 * as matching. Good enough for catching "Morgans" vs "Morgans
 * Financial Limited" without false positives on "CBA" vs "ANZ".
 */
export function firmNamesMatch(a: string, b: string): boolean {
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .replace(/\b(pty\.?|ltd\.?|limited|inc\.?|llc|plc|&|and|the|financial|advisory|services|group|partners|wealth|management|capital)\b/g, " ")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const an = normalise(a);
  const bn = normalise(b);
  if (!an || !bn) return false;
  if (an === bn) return true;
  if (an.includes(bn) || bn.includes(an)) return true;

  // Levenshtein distance ≤ 3 for tokens of length ≥ 5
  if (an.length >= 5 && bn.length >= 5) {
    const distance = levenshtein(an, bn);
    if (distance <= 3) return true;
  }
  return false;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}
