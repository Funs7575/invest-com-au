/**
 * Shared Resend email helper with built-in timeout and error handling.
 * Use this instead of raw fetch() to api.resend.com.
 */

import { logger } from "@/lib/logger";
import { getSuppressedSet } from "@/lib/email-suppression";

const log = logger("resend");

const RESEND_TIMEOUT_MS = 10_000; // 10 seconds

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  /** Optional plain-text fallback. Resend accepts `text` alongside `html`
   *  and lets the recipient's client pick — good practice for
   *  deliverability and accessibility. */
  text?: string;
  /**
   * Set to true for transactional sends that legally MUST reach the
   * recipient even if their address is on the suppression list — e.g.
   * GDPR data-export delivery, account-deletion confirmation, billing
   * receipts, password resets. These bypass the suppression check.
   * Default false; lifecycle / marketing / nudge sends should never
   * pass this.
   */
  bypassSuppression?: boolean;
}

/**
 * Send an email via Resend. Non-throwing — returns { ok, error }.
 * Automatically uses the RESEND_API_KEY env var and applies a 10s timeout.
 *
 * Honors `public.suppression_list` + the legacy `public.email_suppression_list`
 * (union) via `@/lib/email-suppression`. When every recipient is suppressed
 * the call short-circuits with `{ ok: false, error: "suppressed" }` — no
 * Resend call, no log noise, no metric spike. Mixed batches drop the
 * suppressed addresses and send to the rest; if NONE remain after filtering
 * the call is treated as fully suppressed.
 */
export async function sendEmail(
  opts: SendEmailOptions
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log.warn("RESEND_API_KEY not set — skipping email send");
    return { ok: false, error: "No API key" };
  }

  const recipientsRaw = Array.isArray(opts.to) ? opts.to : [opts.to];
  const recipients = recipientsRaw.filter((r) => typeof r === "string" && r.length > 0);
  if (recipients.length === 0) {
    return { ok: false, error: "No recipients" };
  }

  let toSend: string[] = recipients;
  if (!opts.bypassSuppression) {
    const suppressed = await getSuppressedSet(recipients);
    if (suppressed.size > 0) {
      toSend = recipients.filter((r) => !suppressed.has(r.toLowerCase()));
      if (toSend.length === 0) {
        // Every recipient suppressed — pretend success so callers don't
        // retry, but emit a single log line for SLO visibility.
        log.info("send fully suppressed", { count: recipients.length });
        return { ok: false, error: "suppressed" };
      }
      log.info("send partially suppressed", {
        total: recipients.length,
        sending: toSend.length,
        suppressed: suppressed.size,
      });
    }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: opts.from || "Invest.com.au <fees@invest.com.au>",
        to: toSend,
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log.error(`HTTP ${res.status}`, { error: body });
      return { ok: false, error: `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Failed to send email", { error: msg });
    return { ok: false, error: msg };
  }
}

/**
 * Add or update a contact in a Resend audience.
 */
export async function upsertContact(
  audienceId: string,
  email: string,
  firstName?: string,
  unsubscribed?: boolean
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "No API key" };

  try {
    const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        first_name: firstName || undefined,
        unsubscribed: unsubscribed ?? false,
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log.error(`Contact HTTP ${res.status}`, { error: body });
      return { ok: false, error: `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Failed to upsert contact", { error: msg });
    return { ok: false, error: msg };
  }
}
