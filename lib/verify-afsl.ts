/**
 * AFSL (Australian Financial Services Licence) verification.
 *
 * ASIC does not publish a free public API for Professional
 * Registers. The Connect website is the authoritative source but
 * it's a JS-rendered search form with anti-automation
 * protections — scraping is brittle and against ToS in volume.
 *
 * Three tiers of verification are supported below, in order of
 * preference:
 *
 *   1. If process.env.ASIC_API_ENDPOINT and ASIC_API_KEY are set,
 *      we call a user-provided JSON endpoint that mirrors the
 *      Connect search output. Useful if you subscribe to a paid
 *      data vendor (Illion, CreditorWatch, D&B) that exposes a
 *      normalised AFSL lookup.
 *
 *   2. If neither is set we return { valid: null, configured: false }
 *      with a link the admin can open to verify manually. The
 *      caller decides whether to treat this as "skipped" or "fail".
 *
 * The function validates the AFSL number shape client-side
 * (6 digits, optional preceding "AFSL ") before any network call.
 */

export type AfslStatus =
  | "Current"
  | "Cancelled"
  | "Suspended"
  | "Ceased"
  | "Unknown";

export interface AfslVerificationResult {
  /** true = licence current; false = not current or invalid shape; null = unverifiable here */
  valid: boolean | null;
  /** Canonical 6-digit AFSL number (prefix stripped) */
  afsl: string;
  holderName: string | null;
  licenceStatus: AfslStatus;
  /** URL the admin can click to verify manually */
  manualVerifyUrl: string;
  /** Whether a vendor API is configured */
  configured: boolean;
  error: string | null;
}

/** Strip "AFSL" prefix, spaces and non-digits. */
export function normaliseAfsl(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/^AFSL\s*/i, "").replace(/\s|-/g, "").replace(/[^0-9]/g, "");
}

/** Is the shape plausibly an AFSL number? 6 digits is the canonical length. */
export function isAfslShapeValid(afsl: string): boolean {
  const n = normaliseAfsl(afsl);
  return /^\d{6,7}$/.test(n);
}

function manualUrl(afsl: string): string {
  return `https://connectonline.asic.gov.au/RegistrySearch/faces/landing/ProfessionalRegisters.jspx?_afrLoop=&_afrWindowMode=0&_adf.ctrl-state=initial&searchType=OrganisationSearch&searchText=${encodeURIComponent(afsl)}`;
}

interface VendorResponse {
  valid?: boolean;
  holderName?: string | null;
  status?: string | null;
}

export async function verifyAfsl(
  input: string,
): Promise<AfslVerificationResult> {
  const afsl = normaliseAfsl(input);
  const base = {
    afsl,
    manualVerifyUrl: manualUrl(afsl || input || ""),
    configured: Boolean(
      process.env.ASIC_API_ENDPOINT && process.env.ASIC_API_KEY,
    ),
  };

  if (!isAfslShapeValid(afsl)) {
    return {
      ...base,
      valid: false,
      holderName: null,
      licenceStatus: "Unknown",
      error: "AFSL must be 6 or 7 digits after normalisation",
    };
  }

  const endpoint = process.env.ASIC_API_ENDPOINT;
  const apiKey = process.env.ASIC_API_KEY;
  if (!endpoint || !apiKey) {
    return {
      ...base,
      valid: null,
      holderName: null,
      licenceStatus: "Unknown",
      error:
        "ASIC_API_ENDPOINT / ASIC_API_KEY not configured — manual verification required",
    };
  }

  try {
    const url = new URL(endpoint);
    url.searchParams.set("afsl", afsl);
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return {
        ...base,
        valid: null,
        holderName: null,
        licenceStatus: "Unknown",
        error: `ASIC vendor HTTP ${res.status}`,
      };
    }
    const json = (await res.json()) as VendorResponse;
    const status: AfslStatus = normaliseStatus(json.status);
    const isValid = json.valid === true && status === "Current";
    return {
      ...base,
      valid: isValid,
      holderName: json.holderName ?? null,
      licenceStatus: status,
      error: null,
    };
  } catch (err) {
    return {
      ...base,
      valid: null,
      holderName: null,
      licenceStatus: "Unknown",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function normaliseStatus(raw: string | null | undefined): AfslStatus {
  if (!raw) return "Unknown";
  const lowered = raw.toLowerCase();
  if (lowered.includes("current")) return "Current";
  if (lowered.includes("cancel")) return "Cancelled";
  if (lowered.includes("suspend")) return "Suspended";
  if (lowered.includes("ceased")) return "Ceased";
  return "Unknown";
}
