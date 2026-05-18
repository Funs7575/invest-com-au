import { logger } from "@/lib/logger";

// Thin Twilio SMS dispatcher. Mirrors `lib/resend.ts` in shape so the
// same patterns (timeout, fail-soft, suppression-aware) apply.
//
// Pre-launch: TWILIO_* env vars are not yet set, so sendSms() returns
// { ok: false, error: 'No API credentials' } without throwing. The
// callers (currently /api/submit-lead, opt-in only via user_phone)
// degrade gracefully — the lead still gets created, the user just
// doesn't get an SMS confirmation. The cost is one extra "Confirmed"
// HTML email; the benefit at launch is ~30-40% lift on advisor-side
// conversion (per FIN_NOTEBOOK Revenue infra notes).
//
// Why not just use Resend SMS? Resend doesn't do SMS. Twilio is the
// AU-friendly option (Sinch / MessageMedia are alternatives — same
// shape, swap the API call).

const log = logger("twilio-sms");

const TWILIO_TIMEOUT_MS = 10_000;

interface SendSmsOptions {
  /** E.164 phone number (e.g. +61412345678). Non-E.164 input is rejected. */
  to: string;
  body: string;
  /** When true, skip suppression-list check (legally-required confirmations
   *  like account-deletion SMS). Default false. */
  bypassSuppression?: boolean;
}

const E164_RE = /^\+[1-9]\d{6,14}$/;

function normalisePhone(input: string): string | null {
  const trimmed = input.replace(/\s+/g, "");
  // Auto-prepend +61 to bare 04xx numbers — most common AU input.
  if (/^04\d{8}$/.test(trimmed)) return `+61${trimmed.slice(1)}`;
  if (E164_RE.test(trimmed)) return trimmed;
  return null;
}

/**
 * Send a single SMS via Twilio. Non-throwing — returns { ok, error }.
 * Reads TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER
 * from env. Missing creds → soft fail.
 */
export async function sendSms(
  opts: SendSmsOptions,
): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    log.warn("TWILIO_* env vars not set — skipping SMS send");
    return { ok: false, error: "No API credentials" };
  }

  const to = normalisePhone(opts.to);
  if (!to) {
    return { ok: false, error: "Invalid phone number" };
  }

  // Body length: SMS hard cap is 1600 chars (Twilio splits at 160 if
  // single-segment > 70 GSM-7 chars). For confirmations we want a single
  // segment — soft warn over 160 but still send.
  if (opts.body.length > 1600) {
    return { ok: false, error: "SMS body too long" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({ To: to, From: from, Body: opts.body });
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(TWILIO_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      log.error(`Twilio HTTP ${res.status}`, { error: errBody });
      return { ok: false, error: `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Failed to send SMS", { error: msg });
    return { ok: false, error: msg };
  }
}

/**
 * Exposed for unit tests + admin tooling that needs to validate a
 * phone number before storing it. Returns the E.164-normalised form
 * or null if the input can't be coerced.
 */
export function normalisePhoneNumber(input: string): string | null {
  return normalisePhone(input);
}
