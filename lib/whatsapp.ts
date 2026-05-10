/**
 * WhatsApp lead-capture helper (W5.25).
 *
 * Visitors from HK / India / China / Singapore strongly prefer WhatsApp
 * over web forms or phone calls for first-touch enquiries. This module
 * exposes:
 *
 *   - `WHATSAPP_INTAKE_COUNTRIES` — the country set we surface the WA
 *     button for. Other intent-country values get the standard contact
 *     flow.
 *   - `buildWhatsAppUrl(phone, message)` — wa.me deep-link constructor
 *     that handles E.164 normalisation + URL-encoded prefilled message.
 *   - `getWhatsAppLeadNumber()` — reads `WHATSAPP_LEAD_NUMBER` env var
 *     (E.164 with leading +). Returns null when unset so the UI can
 *     hide the button (e.g. dev / preview without the env var).
 *
 * Compliance: WhatsApp is a contact channel, not a comparison or
 * recommendation surface. The same general-information posture applies
 * (no advice on the channel itself). Conversations on WA are routed
 * through the existing advisor-matching pipeline.
 */

import type { IntentCountryCode } from "./intent-context";

export const WHATSAPP_INTAKE_COUNTRIES: ReadonlySet<IntentCountryCode> = new Set([
  "hk", "in", "cn", "sg",
]);

export function isWhatsAppIntakeCountry(code: IntentCountryCode | null): boolean {
  if (!code) return false;
  return WHATSAPP_INTAKE_COUNTRIES.has(code);
}

/**
 * Read the lead-intake WA number. Returns null when unset OR malformed
 * (anything other than E.164 with leading + and 8–15 digits) so the UI
 * hides the button rather than rendering a broken link.
 */
export function getWhatsAppLeadNumber(): string | null {
  const raw = process.env.WHATSAPP_LEAD_NUMBER;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Build a wa.me URL with a prefilled message. wa.me strips the leading
 * `+` from the phone number and URL-encodes the message via the `text`
 * query param. Returns the full https URL ready for an anchor href.
 */
export function buildWhatsAppUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/^\+/, "").replace(/[^\d]/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

/**
 * Compose the prefilled message body for an advisor enquiry. The format
 * gives the routing hub everything they need to triage:
 * advisor name (or "—" if generic), visitor's intent country, source path.
 */
export function buildAdvisorWaMessage(opts: {
  advisorName?: string;
  intentCountryLabel: string;
  sourcePath: string;
}): string {
  const { advisorName, intentCountryLabel, sourcePath } = opts;
  const advisorLine = advisorName ? `for ${advisorName}` : "";
  return [
    `Hi — I'm interested in an Australian advisor consultation ${advisorLine}.`.trim(),
    `Country: ${intentCountryLabel}`,
    `From: invest.com.au${sourcePath}`,
  ].join("\n");
}
