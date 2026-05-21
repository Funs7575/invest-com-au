/**
 * Verification-as-a-Service core.
 *
 * Single source of truth for the public `/api/v1/verify` endpoint and the
 * hosted "Verified by Invest.com.au" trust-mark. Resolves a factual,
 * register-only verification result for an AFSL and/or ABN.
 *
 * STRICTLY PUBLIC DATA. This module reads only:
 *   - `public.afsl_register` (anon-readable cache of ASIC's public AFS
 *     register), via `getAfslLicensee` / the anon-key static client.
 *   - The official ABR JSON web service, via `verifyAbn`.
 *   - The optional ASIC vendor lookup, via `verifyAfsl` (vendor-gated).
 *
 * It NEVER touches `authorised_representatives` / `credit_representatives`
 * (our own ARs/CRs — service-role-only, contain private contact data).
 *
 * This is factual register verification — it states whether a licence
 * number is current on the public register. It is NOT financial advice
 * and makes no recommendation.
 */

import {
  getAfslLicensee,
  normaliseAfslNumber,
  AFSL_STATUS_LABELS,
  type AfslStatus as RegisterAfslStatus,
} from "@/lib/afsl-register";
import { verifyAfsl, normaliseAfsl, isAfslShapeValid } from "@/lib/verify-afsl";
import { verifyAbn, normaliseAbn, isAbnChecksumValid } from "@/lib/verify-abn";

/** The kind of registry record being verified. */
export type VerifySubject = "afsl" | "abn";

/**
 * Verification outcome.
 *   - "verified"    → the number is current/active on the public register.
 *   - "not_current" → the number exists but is cancelled/suspended/ceased.
 *   - "not_found"   → the number is not present on the register / cache.
 *   - "invalid"     → the number failed shape/checksum validation.
 *   - "unverifiable"→ no authoritative source available right now
 *                     (e.g. cache miss + vendor API not configured, or a
 *                     remote lookup error).
 */
export type VerifyOutcome =
  | "verified"
  | "not_current"
  | "not_found"
  | "invalid"
  | "unverifiable";

export interface VerifyResult {
  /** What was checked. */
  subject: VerifySubject;
  /** Convenience boolean: true only when outcome === "verified". null when unverifiable. */
  verified: boolean | null;
  /** Coarse outcome — branch on this, not on `verified`, for full nuance. */
  outcome: VerifyOutcome;
  /** Canonical (digits-only) number that was checked. */
  number: string;
  /** Human-readable status label, e.g. "Current", "Cancelled", "Active". */
  status: string;
  /** Registered licensee / entity name, when known. null otherwise. */
  licensee_name: string | null;
  /**
   * One-line, plain-English summary of any licence conditions on file.
   * AFSL only; always null for ABN. Never contains private data — this is
   * derived from the public register's condition flags.
   */
  conditions_summary: string | null;
  /** ISO timestamp of when the underlying data was last verified at source. */
  checked_at: string;
  /** Provenance of the answer (which authoritative source produced it). */
  source: string;
  /** A URL a human can open to confirm against the official register. */
  source_url: string;
}

/**
 * Collapse a register `licence_conditions` JSONB value into a short,
 * public, plain-English summary. The cache stores conditions as an
 * arbitrary JSON blob; we only surface a coarse, non-sensitive shape:
 *   - an array → "<n> licence condition(s) on file"
 *   - an object with a `summary`/`text` string → that string (trimmed)
 *   - an object with a numeric `count` → "<n> licence condition(s) on file"
 *   - empty / null → "No conditions recorded"
 */
export function summariseConditions(conditions: unknown): string {
  if (conditions == null) return "No conditions recorded";

  if (Array.isArray(conditions)) {
    const n = conditions.length;
    return n === 0
      ? "No conditions recorded"
      : `${n} licence condition${n === 1 ? "" : "s"} on file`;
  }

  if (typeof conditions === "string") {
    const t = conditions.trim();
    return t.length > 0 ? t.slice(0, 200) : "No conditions recorded";
  }

  if (typeof conditions === "object") {
    const obj = conditions as Record<string, unknown>;
    const text =
      (typeof obj.summary === "string" && obj.summary) ||
      (typeof obj.text === "string" && obj.text) ||
      null;
    if (text) return text.trim().slice(0, 200);

    if (Array.isArray(obj.conditions)) {
      const n = obj.conditions.length;
      return n === 0
        ? "No conditions recorded"
        : `${n} licence condition${n === 1 ? "" : "s"} on file`;
    }
    if (typeof obj.count === "number" && Number.isFinite(obj.count)) {
      const n = Math.max(0, Math.trunc(obj.count));
      return n === 0
        ? "No conditions recorded"
        : `${n} licence condition${n === 1 ? "" : "s"} on file`;
    }
    const keyCount = Object.keys(obj).length;
    return keyCount === 0
      ? "No conditions recorded"
      : `${keyCount} licence condition${keyCount === 1 ? "" : "s"} on file`;
  }

  return "No conditions recorded";
}

/** Map a register status enum value → "verified" | "not_current". */
function outcomeForRegisterStatus(
  status: RegisterAfslStatus,
): "verified" | "not_current" | "unverifiable" {
  if (status === "current") return "verified";
  if (status === "unknown") return "unverifiable";
  return "not_current"; // cancelled | suspended | ceased
}

const ASIC_REGISTER_URL =
  "https://connectonline.asic.gov.au/RegistrySearch/faces/landing/ProfessionalRegisters.jspx";
const ABR_LOOKUP_URL = "https://abr.business.gov.au/ABN/View";

/**
 * Verify an AFSL number.
 *
 * Resolution order (most authoritative public source first):
 *   1. Reject obviously malformed input (shape check) → "invalid".
 *   2. Our cached public AFS register (`afsl_register`). Authoritative for
 *      our contract, refreshed weekly, anon-readable.
 *   3. If not cached AND a vendor API is configured, fall back to the live
 *      ASIC vendor lookup (`verifyAfsl`).
 *   4. Otherwise → "not_found" (cached miss) / "unverifiable" (no source).
 */
export async function verifyAfslSubject(input: string): Promise<VerifyResult> {
  const number = normaliseAfsl(input);
  const base: Pick<VerifyResult, "subject" | "number" | "source_url"> = {
    subject: "afsl",
    number,
    source_url: `${ASIC_REGISTER_URL}?searchText=${encodeURIComponent(number || "")}`,
  };

  if (!isAfslShapeValid(number)) {
    return {
      ...base,
      verified: false,
      outcome: "invalid",
      status: "Invalid",
      licensee_name: null,
      conditions_summary: null,
      checked_at: new Date().toISOString(),
      source: "shape_check",
    };
  }

  // 1) Cached public register (preferred — anon-readable, no private data).
  const cached = await getAfslLicensee(number);
  if (cached) {
    const registerStatus = cached.status;
    const mapped = outcomeForRegisterStatus(registerStatus);
    return {
      ...base,
      number: normaliseAfslNumber(cached.afsl_number) || number,
      verified: mapped === "verified" ? true : mapped === "unverifiable" ? null : false,
      outcome: mapped,
      status: AFSL_STATUS_LABELS[registerStatus] ?? "Unknown",
      licensee_name: cached.licensee_name ?? null,
      conditions_summary: summariseConditions(cached.licence_conditions),
      checked_at: cached.last_verified_at,
      source: `afsl_register:${cached.source}`,
    };
  }

  // 2) Live vendor fallback (only fires if ASIC_API_* configured).
  const vendor = await verifyAfsl(number);
  if (vendor.configured && vendor.valid !== null) {
    const isCurrent = vendor.valid === true && vendor.licenceStatus === "Current";
    return {
      ...base,
      verified: isCurrent,
      outcome: isCurrent ? "verified" : "not_current",
      status: vendor.licenceStatus,
      licensee_name: vendor.holderName,
      conditions_summary: null,
      checked_at: new Date().toISOString(),
      source: "asic_vendor",
    };
  }

  // 3) Nothing authoritative. Distinguish "not on our register" from
  //    "we genuinely couldn't check".
  if (!vendor.configured) {
    return {
      ...base,
      verified: null,
      outcome: "not_found",
      status: "Not found",
      licensee_name: null,
      conditions_summary: null,
      checked_at: new Date().toISOString(),
      source: "afsl_register",
    };
  }
  return {
    ...base,
    verified: null,
    outcome: "unverifiable",
    status: "Unverifiable",
    licensee_name: null,
    conditions_summary: null,
    checked_at: new Date().toISOString(),
    source: "asic_vendor",
  };
}

/**
 * Verify an ABN against the official ABR web service.
 * Reuses `verifyAbn` (checksum + remote lookup). Public data only.
 */
export async function verifyAbnSubject(input: string): Promise<VerifyResult> {
  const number = normaliseAbn(input);
  const base: Pick<VerifyResult, "subject" | "number" | "source_url"> = {
    subject: "abn",
    number,
    source_url: `${ABR_LOOKUP_URL}?abn=${encodeURIComponent(number || "")}`,
  };

  if (number.length !== 11 || !isAbnChecksumValid(number)) {
    return {
      ...base,
      verified: false,
      outcome: "invalid",
      status: "Invalid",
      licensee_name: null,
      conditions_summary: null,
      checked_at: new Date().toISOString(),
      source: "checksum",
    };
  }

  const res = await verifyAbn(number);
  if (res.valid === null) {
    // Couldn't verify (GUID missing or remote error).
    return {
      ...base,
      verified: null,
      outcome: "unverifiable",
      status: "Unverifiable",
      licensee_name: null,
      conditions_summary: null,
      checked_at: new Date().toISOString(),
      source: "abr",
    };
  }

  const isActive = res.valid === true && res.status === "Active";
  return {
    ...base,
    verified: isActive,
    outcome: isActive ? "verified" : "not_current",
    status: res.status,
    licensee_name: res.entityName,
    conditions_summary: null,
    checked_at: new Date().toISOString(),
    source: "abr",
  };
}
