/**
 * Shared Resend email helper with built-in timeout and error handling.
 * Use this instead of raw fetch() to api.resend.com.
 */

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
    console.warn("[resend] RESEND_API_KEY not set — skipping email send");
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
      console.error(`[resend] HTTP ${res.status}: ${body}`);
      return { ok: false, error: `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[resend] Failed to send email:", msg);
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
    const res = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audience_id: audienceId,
        email,
        first_name: firstName || undefined,
        unsubscribed: unsubscribed ?? false,
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[resend] contact HTTP ${res.status}: ${body}`);
      return { ok: false, error: `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[resend] Failed to upsert contact:", msg);
    return { ok: false, error: msg };
  }
}
