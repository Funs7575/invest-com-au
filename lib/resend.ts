/**
 * Shared Resend email helper with built-in timeout and error handling.
 * Use this instead of raw fetch() to api.resend.com.
 */

import { logger } from "@/lib/logger";

const log = logger("resend");

const RESEND_TIMEOUT_MS = 10_000; // 10 seconds

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email via Resend. Non-throwing — returns { ok, error }.
 * Automatically uses the RESEND_API_KEY env var and applies a 10s timeout.
 */
export async function sendEmail(
  opts: SendEmailOptions
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log.warn("RESEND_API_KEY not set — skipping email send");
    return { ok: false, error: "No API key" };
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
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
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
