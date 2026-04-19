/**
 * ABR (Australian Business Register) ABN verification.
 *
 * Uses the official ABR JSON web service:
 *   https://abr.business.gov.au/json/AbnDetails.aspx
 *
 * Requires a registered GUID (process.env.ABR_API_GUID) — the ABR
 * is free but access is gated behind a registered identifier.
 * Register at https://abr.business.gov.au/Tools/WebServices.
 *
 * When the GUID is absent we return { valid: null, ... } rather
 * than throwing — the caller can distinguish "unverifiable" from
 * "verified bad" via the `configured` flag.
 */

export type AbnStatus = "Active" | "Cancelled" | "Unknown";

export interface AbnVerificationResult {
  /** true = ABN exists and is Active; false = invalid or cancelled; null = couldn't verify */
  valid: boolean | null;
  /** Normalised 11-digit ABN (hyphens and spaces stripped) */
  abn: string;
  entityName: string | null;
  status: AbnStatus;
  entityType: string | null;
  /** Whether the API is configured in this environment */
  configured: boolean;
  /** Human-readable error for debugging / logging */
  error: string | null;
}

const ENDPOINT = "https://abr.business.gov.au/json/AbnDetails.aspx";

/** Strip spaces and hyphens and return only digits. */
export function normaliseAbn(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[\s-]/g, "").replace(/[^0-9]/g, "");
}

/**
 * Validate an ABN using the ATO mod-89 checksum. Pure function —
 * safe to run client-side for instant form validation.
 */
export function isAbnChecksumValid(abn: string): boolean {
  const digits = normaliseAbn(abn);
  if (digits.length !== 11) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  // Subtract 1 from the first digit before weighting.
  const first = parseInt(digits[0]!, 10) - 1;
  if (first < 0) return false;
  let sum = first * weights[0]!;
  for (let i = 1; i < 11; i++) {
    sum += parseInt(digits[i]!, 10) * weights[i]!;
  }
  return sum % 89 === 0;
}

interface AbrJsonResponse {
  Abn?: string;
  AbnStatus?: string;
  EntityName?: string;
  EntityTypeName?: string;
  Message?: string;
  Exception?: string;
}

/**
 * Server-only. Must not be called from the browser — the GUID is
 * secret and we don't want CORS headaches either.
 */
export async function verifyAbn(
  input: string,
): Promise<AbnVerificationResult> {
  const abn = normaliseAbn(input);
  const base: Pick<AbnVerificationResult, "abn" | "configured"> = {
    abn,
    configured: Boolean(process.env.ABR_API_GUID),
  };

  if (abn.length !== 11) {
    return {
      ...base,
      valid: false,
      entityName: null,
      status: "Unknown",
      entityType: null,
      error: "ABN must be 11 digits after normalisation",
    };
  }
  if (!isAbnChecksumValid(abn)) {
    return {
      ...base,
      valid: false,
      entityName: null,
      status: "Unknown",
      entityType: null,
      error: "ABN failed mod-89 checksum",
    };
  }

  const guid = process.env.ABR_API_GUID;
  if (!guid) {
    return {
      ...base,
      valid: null,
      entityName: null,
      status: "Unknown",
      entityType: null,
      error: "ABR_API_GUID not configured — skipped remote check",
    };
  }

  const url = `${ENDPOINT}?abn=${abn}&callback=callback&guid=${encodeURIComponent(guid)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/javascript" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return {
        ...base,
        valid: null,
        entityName: null,
        status: "Unknown",
        entityType: null,
        error: `ABR HTTP ${res.status}`,
      };
    }
    // ABR returns JSONP callback(<json>) — strip the wrapper.
    const raw = await res.text();
    const match = raw.match(/^callback\(([\s\S]*)\)\s*$/);
    if (!match) {
      return {
        ...base,
        valid: null,
        entityName: null,
        status: "Unknown",
        entityType: null,
        error: "ABR returned unexpected payload",
      };
    }
    const parsed = JSON.parse(match[1]!) as AbrJsonResponse;
    if (parsed.Exception) {
      return {
        ...base,
        valid: false,
        entityName: null,
        status: "Unknown",
        entityType: null,
        error: parsed.Exception,
      };
    }
    const status: AbnStatus =
      parsed.AbnStatus === "Active"
        ? "Active"
        : parsed.AbnStatus === "Cancelled"
          ? "Cancelled"
          : "Unknown";
    return {
      ...base,
      valid: status === "Active",
      entityName: parsed.EntityName ?? null,
      status,
      entityType: parsed.EntityTypeName ?? null,
      error: null,
    };
  } catch (err) {
    return {
      ...base,
      valid: null,
      entityName: null,
      status: "Unknown",
      entityType: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
